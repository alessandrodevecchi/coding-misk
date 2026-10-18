// The fast video's feed (#53): what the visuals read live from the analysers, made from the timeline and the
// rendered audio instead, so a frame can be drawn at any time. Pure: checked in Node (tools/check-video.mjs).
import { typingFrames, settleOthers, typingPlan } from '../song/typing.js';

// how an instrument's level falls after a note starts: percussion decays (seconds), the others hold for the note
const DECAY = { kick: 0.1, snare: 0.12, hats: 0.04, fx: 0.3 };
const RELEASE = 0.15, LOOKBACK = 4;

// onsets: { instrument: [[t, length, level], …] } sorted by time. Returns levelsAt(t) → { instrument: raw level }.
// The onsets can grow while frames are drawn (block by block).
export function levelsFrom(onsets) {
  const idx = {};
  let lastT = -Infinity;
  return function levelsAt(t) {
    const keys = Object.keys(onsets);
    // frames come in order: the start index only moves forward (a jump back starts again)
    if (t < lastT) for (const k of keys) idx[k] = 0;
    lastT = t;
    const out = {};
    for (const k of keys) {
      idx[k] = idx[k] || 0;
      const list = onsets[k];
      while (idx[k] < list.length && list[idx[k]][0] < t - LOOKBACK) idx[k]++;
      let v = 0;
      for (let i = idx[k]; i < list.length && list[i][0] <= t; i++) {
        const [t0, len, g] = list[i], dt = t - t0, d = DECAY[k];
        const env = d ? Math.exp(-dt / d) : dt < len ? 0.8 : 0.8 * Math.exp(-(dt - len) / RELEASE);
        v = Math.max(v, g * env * Math.min(1, dt / 0.005 + 0.2));
      }
      out[k] = 0.2 * v;
    }
    return out;
  };
}

// the code shown at cycle c: the segment's code, typed towards the next step during the bar before it (as live)
// seconds(c): seconds at cycle c; with it the typing is a person's (live-typing), as in the app
// style 'human' (human-typing): a listening pause after the step, then the typing at a person's pace, as in the app
export function codeFrom(segments, { seconds = null, speed = 1, style = 'exact', seed = '', mistakes = true } = {}) {
  const cache = new Map();
  return function codeAt(c) {
    let i = 0; while (i + 1 < segments.length && segments[i + 1].from <= c) i++;
    const seg = segments[i], next = segments[i + 1];
    if (seconds && next) {
      if (!cache.has(i)) {
        const end = seconds(next.from) - 0.2, from0 = seconds(seg.from + 0.5), to = next.code, human = style === 'human';
        const avail = Math.max(0.2, end - from0), listenMin = human ? Math.min(avail * 0.5, 2) : 0;
        const plan = typingPlan(settleOthers(seg.code, to, next.from), to, { speed, max: Math.max(0.2, avail - listenMin), style, seed, mistakes, stretch: Math.floor(next.from / 16) });
        const listen = human ? Math.max(listenMin, Math.min(avail * 0.2, avail - plan.total)) : 0;
        cache.set(i, { plan, start: Math.max(from0 + listen, end - plan.total) });
      }
      const T = cache.get(i), t = seconds(c) - T.start;
      return t < 0 ? seg.code : T.plan.frame(t);
    }
    if (!next || c < next.from - 1) return seg.code;
    // as live: only the line of the section that plays at the step is typed
    if (!cache.has(i)) cache.set(i, typingFrames(settleOthers(seg.code, next.code, next.from), next.code));
    return cache.get(i)(Math.max(0, Math.min(1, (c - (next.from - 1)) / 0.9)));
  };
}

// the voice line at cycle c (held 4 bars), from the timeline's say list [{ bar, text }]
export const sayFrom = say => c => { let s = ''; for (const x of say) if (x.bar <= c && c < x.bar + 4) s = x.text; return s; };
