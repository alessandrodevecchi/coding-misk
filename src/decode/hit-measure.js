// How the chords and the bass are played (decode round 11, change decode-hit-rhythm): measures on the original's PCM
// per bar, for level B (full.js). Pure.
//
// chordHits: the chord's own tones in the 300-2500 Hz band, step by step. Per frame (a quarter of a 16th step apart),
// each bin of the chord's pitch classes counted by how far its power stands over twice the larger of its neighbours
// `side` bins away: a partial is a narrow peak, a kick, a clap, a hat or noise is smooth across a few bins (without the
// neighbours the kick's steps read as hits). A hit is a step whose first frames reach `rise` of the bar's top from at
// most `dip` of that (and at most 1/`ratio`) just before; `held`, the bar's mean over its top (a held pad 0.6-0.7, stabs
// 0.15-0.2 on the bench's songs); `tonal`, those peaks' energy over the band's whole energy (no chord, a distorted bass
// or drums alone, 0.01-0.04; stabs under a distorted bass 0.06 and over; a pad 0.3-0.6).
// bassAttack: per 16th step, the energy at the harmonics of the bar's main bass note between 150 and 1200 Hz (peaks
// over their neighbours as above), its top at the step's start over its least just before: a repeated note whose low
// band never dips, or a note under the kick, still attacks there.
import { spectrum } from './kit-measure.js';

export const CHORD_HITS = { size: 4096, window: 2048, lo: 300, hi: 2500, side: 6, frames: 4, rise: 0.35, dip: 0.6, ratio: 2 };
const pcOf = f => ((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12;
const hzOf = midi => 440 * 2 ** ((midi - 69) / 12);
const r2 = x => Math.round(x * 100) / 100;

// the peaky energy of the bins `use` (a boolean per bin from lo) of a spectrum, and the band's whole energy
function peaky(p, lo, hi, use, side) {
  let e = 0, all = 0;
  for (let k = lo; k <= hi; k++) { all += p[k]; if (use[k - lo]) e += Math.max(0, p[k] - 2 * Math.max(p[k - side] || 0, p[k + side] || 0)); }
  return [e, all];
}

// pcm, sr; a: the bar's first sample; barLen: samples per bar; pcs: the chord's pitch classes → { hits: 16 characters
// 'x' or '.', n, held, tonal }
// avoid: pitch classes left out when the chord keeps one tone without them (the bar's bass notes and their 3rd and 5th
// harmonics: a bass on the chord's root rings at its root, fifth and major third, and its hits read as the chord's)
export function chordHits(pcm, sr, a, barLen, pcs, avoid = [], rule = CHORD_HITS) {
  const kept = pcs.filter(p => !avoid.includes(p)), hz = sr / rule.size, lo = Math.ceil(rule.lo / hz), hi = Math.floor(rule.hi / hz), P = new Set(kept.length ? kept : pcs), use = [];
  for (let k = lo; k <= hi; k++) use.push(P.has(pcOf(k * hz)));
  const hop = barLen / 16 / rule.frames, e = [];
  let te = 0, ta = 0;
  for (let f = -2; f < 16 * rule.frames; f++) {
    const [x, all] = peaky(spectrum(pcm, Math.round(a + f * hop) - rule.window / 2, rule.window, rule.size), lo, hi, use, rule.side);
    e.push(x);
    if (f >= 0) { te += x; ta += all; }
  }
  const top = Math.max(...e) || 1, at = f => e[f + 2] / top, hits = [];
  for (let s = 0; s < 16; s++) {
    const f0 = s * rule.frames, peak = Math.max(at(f0), at(f0 + 1), at(f0 + 2)), before = Math.min(at(f0 - 1), at(f0 - 2));
    hits.push(peak >= rule.rise && before <= rule.dip * peak && peak >= rule.ratio * before ? 'x' : '.');
  }
  const held = e.slice(2).reduce((p, q) => p + q, 0) / (e.length - 2) / top;
  return { hits: hits.join(''), n: hits.filter(x => x === 'x').length, held: r2(held), tonal: Math.round((ta ? te / ta : 0) * 1000) / 1000 };
}

export const BASS_HITS = { size: 2048, window: 1024, lo: 300, hi: 1500, frames: 4 };
// per 16th step of a bar: the 300-1500 Hz band's top at the step's start over its least just before (`rise`), and that
// top over the bar's (`level`), and the step's second half's top over the bar's (`late`: on a kick's step, after its
// click) → { rise: [16], level: [16], late: [16] }
export function bassAttack(pcm, sr, a, barLen, rule = BASS_HITS) {
  const hz = sr / rule.size, lo = Math.ceil(rule.lo / hz), hi = Math.floor(rule.hi / hz), hop = barLen / 16 / rule.frames, e = [];
  for (let f = -2; f < 16 * rule.frames; f++) { const p = spectrum(pcm, Math.round(a + f * hop) - rule.window / 2, rule.window, rule.size); let x = 0; for (let k = lo; k <= hi; k++) x += p[k]; e.push(x); }
  const top = Math.max(...e.slice(2)) || 1, at = f => e[f + 2], rise = [], level = [], late = [];
  for (let s = 0; s < 16; s++) { const f0 = s * rule.frames, peak = Math.max(at(f0), at(f0 + 1)), before = Math.min(at(f0 - 1), at(f0 - 2)); rise.push(r2(Math.min(99, before > 0 ? peak / before : 99))); level.push(r2(peak / top)); late.push(r2(Math.max(at(f0 + 2), at(f0 + 3)) / top)); }
  return { rise, level, late };
}
// the pitch classes a bass note rings at in the chords' band: its own, its fifth and its major third (harmonics 1 to 5)
export const bassPcs = notes => [...new Set(notes.filter(x => x !== null && x !== undefined).flatMap(x => [0, 7, 4].map(d => (((x + d) % 12) + 12) % 12)))];
