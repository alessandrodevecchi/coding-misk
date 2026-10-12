// Fragments (#57): short vertical videos cut from a song or a saved session. Which stretches to cut (at random, preferring
// the lively parts, or between two times), the label typed on the picture, and the glitch messages.
// Pure: checked in Node (tools/check-clips.mjs).
import { stream, hashString } from '../endless/random.js';
import { tempoClock } from '../render/tempo.js';

export const LENGTHS = [15, 30, 60];
// a session longer than this many bars skips its first and last bars (the radio's start and end)
const EDGE = 8, LONG = 64;

// the weight of a section from its label ("3 Drop", "Chorus", "1 Intro")
export function sectionWeight(label = '') {
  const l = String(label).toLowerCase();
  if (/intro|outro|end|fine|coda/.test(l)) return 0.25;
  if (/drop|peak|climax|chorus|ritornello|hook/.test(l)) return 1;
  if (/build|rise|verse|strofa|groove|main/.test(l)) return 0.7;
  if (/break|bridge|interlude|pausa/.test(l)) return 0.45;
  return 0.6;
}

// a score per bar: how many tracks play in it, times its section's weight. shape: { bars, sections: [{ label, start, len }],
// tracks: [{ type, clips: [{ start, bars }] }] } with absolute clips
export function barScores(shape) {
  const n = shape.bars, out = new Float32Array(n);
  const playing = new Uint16Array(n);
  for (const tr of shape.tracks || []) {
    if (tr.type === 'voice' || tr.mute) continue;
    for (const c of tr.clips || []) for (let b = Math.max(0, c.start); b < Math.min(n, c.start + (c.bars || 1)); b++) playing[b]++;
  }
  for (const s of shape.sections || []) for (let b = s.start; b < Math.min(n, s.start + s.len); b++) out[b] = playing[b] * sectionWeight(s.label);
  if (n > LONG) for (let b = 0; b < n; b++) if (b < EDGE || b >= n - EDGE) out[b] = 0;
  return out;
}

// N fragments of `length` seconds, on bar lines, not overlapping, the livelier the likelier, the same for the same seed.
// bpm: per bar. Returns [{ start, end, bar }] sorted by start (as many as fit).
export function pickFragments(shape, bpm, { n = 3, length = 30, seed = 'fragments' } = {}) {
  const T = tempoClock(bpm), total = T.seconds(shape.bars), scores = barScores(shape);
  const cands = [];
  for (let b = 0; b < shape.bars; b++) {
    const start = T.seconds(b), end = start + length;
    if (end > total + 1e-6) break;
    const b1 = Math.min(shape.bars, Math.ceil(T.cycleAt(end)));
    let sum = 0; for (let k = b; k < b1; k++) sum += scores[k];
    const score = sum / Math.max(1, b1 - b);
    if (score > 0) cands.push({ start, end, bar: b, score });
  }
  const r = stream(seed, `fragments/${n}/${length}`), out = [];
  // the best part of the candidates, drawn by weight
  let pool = cands.slice().sort((a, b) => b.score - a.score);
  pool = pool.slice(0, Math.max(n * 3, Math.ceil(pool.length * 0.4)));
  while (out.length < n && pool.length) {
    const c = r.weighted(pool, pool.map(x => x.score * x.score));
    out.push({ start: c.start, end: c.end, bar: c.bar });
    pool = pool.filter(x => x.end <= c.start + 1e-6 || x.start >= c.end - 1e-6);
  }
  return out.sort((a, b) => a.start - b.start);
}

// a fragment between two times (seconds); error: 'order' | 'range' | 'short'
export function fragmentBetween(shape, bpm, from, to) {
  const total = tempoClock(bpm).seconds(shape.bars);
  if (!(to > from)) return { error: 'order' };
  if (from < 0 || to > total + 1e-6) return { error: 'range', total };
  if (to - from < 1) return { error: 'short' };
  return { start: from, end: to };
}

// "12:40" or "1:02:03" or "760" (seconds) → seconds; NaN when not a time
export function parseTime(s) {
  const parts = String(s).trim().split(':');
  if (!parts.length || parts.some(p => !/^\d+(\.\d+)?$/.test(p))) return NaN;
  return parts.reduce((a, p) => a * 60 + Number(p), 0);
}
export const clockOf = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(x).padStart(2, '0')}`; };

// the label: FRAGMENT S0UL·7QX2K #014. The code comes from the source and the start, the number from a counter
const ALPHA = '0123456789ACDEFHJKLMNPQRTUVWXY';
export function fragmentCode(sourceKey, start) {
  let h = hashString(`${sourceKey}@${Math.round(start * 1000)}`), out = '';
  for (let i = 0; i < 5; i++) { out += ALPHA[h % ALPHA.length]; h = (Math.floor(h / ALPHA.length) ^ hashString(out)) >>> 0; }
  return out;
}
export const fragmentLabel = (code, n) => `FRAGMENT S0UL·${code} #${String(n).padStart(3, '0')}`;

// the glitch frames' messages, the same for the same fragment
export const GLITCH_OPEN = ['reading soul…', 'signal found', 'decoding rhythm…', 'tape 07 · side B', 'locking onto the groove…', 'soul trace detected', 'restoring memory banks…', 'carrier wave acquired', 'scanning frequencies…', 'boot sequence · synth core'];
export const GLITCH_CLOSE = ['fragment recovered', 'signal lost', 'end of tape', 'soul archived', 'transmission ends', 'memory sealed', 'rewind to continue', 'link severed'];
export function glitchMessages(code) {
  const r = stream(code, 'glitch');
  return { open: r.pick(GLITCH_OPEN), close: r.pick(GLITCH_CLOSE) };
}
// the glitch frames' strength at t seconds of a fragment `length` long: 1 at the edges, 0 in the middle
export const GLITCH_SECONDS = 1.2;
export function glitchAt(t, length) {
  if (t < GLITCH_SECONDS) return { phase: 'open', k: 1 - t / GLITCH_SECONDS };
  if (t > length - GLITCH_SECONDS) return { phase: 'close', k: (t - (length - GLITCH_SECONDS)) / GLITCH_SECONDS };
  return null;
}

// the shape a song JSON gives the picker: bars, sections with starts, tracks with absolute clips (absoluteClips)
export function shapeOf(doc, absolute) {
  const abs = absolute(doc), sections = [];
  let at = 0;
  for (const s of doc.sections) { sections.push({ label: s.name || '', start: at, len: s.bars }); at += s.bars; }
  return { bars: at, sections, tracks: abs.tracks };
}
