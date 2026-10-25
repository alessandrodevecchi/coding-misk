// Typing load of a live build (growth-shapes, bursts of edits): how fast the human typing has to go for each step,
// as the app types it (makeTyping in src/main.js). Pure: the growth uses it to pick a shape without rushed steps, and
// tools/check-crescendo.mjs reports it.
import { buildSteps } from '../song/build.js';
import { meterSteps } from '../music.js';
import { typingPlan, settleOthers } from '../song/typing.js';

// seconds of one bar of the growth (the first section)
export const barSeconds = song => { const s = song.sections[0]; return (meterSteps(s.meter || '4/4') / 4) * 60 / (s.bpm || 138); };
// seconds from the start of a song to a bar, section by section (a ramp counts at its start tempo)
export function secondsAt(song, bar) {
  let t = 0, at = 0;
  for (const s of song.sections) { const n = Math.max(0, Math.min(s.bars, bar - at)); t += n * (meterSteps(s.meter || '4/4') / 4) * 60 / (s.bpm || 138); at += s.bars; if (at >= bar) break; }
  return t;
}

// Forced pastes (owner, 2026-10-19): when a new line cannot be typed at a person's pace before its step, the human
// typing may paste it whole. With the free duration never: the growth leaves the time the typing needs (the build
// gets longer). With the fitted duration it is a last resort: never in the first two minutes, at most one a minute
// (one line). The long lines pasted from notes now and then (typing-mistakes) are not forced pastes.
// → paste(bar): how many lines the typing towards the step on that bar may paste (0 or 1), the same in the app, the
// video and the checks. Decided step by step in order (a step needs the decisions before it), and kept.
export function pasteRule(L, C, { seed = '' } = {}) {
  if (C.typist !== 'human' || C.duration === 'free' || !L.build.crescendo) return () => 0;
  const bars = [...new Set(buildSteps(L.build).map(x => x.at))].filter(b => b >= 1).sort((a, b) => a - b), done = new Map();
  let k = 0, prev = 0, last = -Infinity;
  return bar => {
    while (k < bars.length && bars[k] <= bar) {
      const at = bars[k++], t = secondsAt(L.build, at);
      let ok = 0;
      if (t >= 120 && t - last >= 60) {
        const code = L.codeAt(at), was = settleOthers(L.codeAt(prev), code, at);
        const avail = Math.max(0.2, secondsAt(L.build, at) - secondsAt(L.build, prev + 0.5) - 0.2), usable = Math.max(0.2, avail - Math.min(avail * 0.5, 2));
        if (was !== code && typingPlan(was, code, { style: 'human', lean: true, seed, force: 0 }).natural > usable) { ok = 1; last = t; }
      }
      done.set(at, ok);
      prev = at;
    }
    return done.get(bar) || 0;
  };
}

// the typing of each step as the app plans it (makeTyping in src/main.js): from half a bar after the step before to a
// fifth of a second before the step, a listening pause of up to 2 s first; need: the leanest human typing (no pauses,
// no mistakes). → [{ at, seconds, usable, need, ratio }] (ratio > 1: the typing has to speed up)
export function typingLoad(L, { seed = '', from = 1, to = Infinity } = {}) {
  const sb = barSeconds(L.build), bars = [...new Set(buildSteps(L.build).map(x => x.at))].filter(b => b >= from && b <= to);
  const out = [];
  // the code of each bar is computed once per call (growth-in-background D4): a bar is the step and then the bar before
  // the next step; the calls keep their order, so the code is the same as when each one was computed again
  const memo = new Map(), codeAt = b => { if (!memo.has(b)) memo.set(b, L.codeAt(b)); return memo.get(b); };
  let prev = 0;
  for (const at of bars) {
    const code = codeAt(at), was = settleOthers(codeAt(prev), code, at);
    const avail = Math.max(0.2, (at - prev - 0.5) * sb - 0.2), usable = Math.max(0.2, avail - Math.min(avail * 0.5, 2));
    // (with the time left as the limit: a new line that would not fit is pasted when the paste rule allows it, as the
    // app types it)
    const need = was === code ? 0 : typingPlan(was, code, { style: 'human', lean: true, seed, max: usable, force: L.paste ? L.paste(at) : Infinity }).natural;
    out.push({ at, seconds: at * sb, gap: (at - prev) * sb, usable, need, ratio: need / usable });
    prev = at;
  }
  return out;
}

// the typing of the growth, up to its last step (the measure the rushed count and the rushed load read)
export const growthLoad = (L, seed = '') => typingLoad(L, { seed, to: L.build.crescendo ? L.build.crescendo.grown : Infinity });
// steps typed faster than a person can (ratio above 1.1), from a measure (typingLoad)
export const rushedOf = load => load.filter(x => x.ratio > 1.1).length;
// how much they are rushed in all: the sum of the ratios above 1.1 (a big burst weighs more than a small hurry)
export const loadOf = load => load.filter(x => x.ratio > 1.1).reduce((a, x) => a + x.ratio - 1, 0);
// steps of the growth typed faster than a person can; L: liveCode of the build
export const rushedSteps = (L, seed = '') => rushedOf(growthLoad(L, seed));
// how much the growth is rushed in all
export const rushLoad = (L, seed = '') => loadOf(growthLoad(L, seed));
