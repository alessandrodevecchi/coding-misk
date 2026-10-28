// FM lab (fm-groove-lab, #80): one card per FM sound kind of the material generator, the code each card plays in its
// three listening modes, the FM rise and the wave drawing. Pure: the Sounds tab draws and plays from it, and
// `npm run check:fm-lab` tests it in Node.
import { SOUND_KINDS, FM_RANGES } from '../material/sound.js';
import { loopSong, KIND_TYPE } from '../library/patterns.js';
import { compileSong } from '../song/compile.js';
import { previewExpression } from '../player/preview.js';
import { DEFAULT } from '../music.js';

// the lab preview's orbit (above every song's, below the radio preview's 40) and its analyser (design D3, D6)
export const LAB_ORBIT = 30;
export const LAB_ANALYZER = 'fmlab';
// the listening modes (design D4): Phrase is the default
export const LAB_MODES = ['phrase', 'held', 'rise'];
// the octave a track type plays around, as sound() reads it (src/material/sound.js), and the note a held note plays
const OCTAVE = { bass: 1, arp: 4, hook: 4, pad: 3 };
const ROOT = { bass: 'a1', arp: 'a3', hook: 'a4', pad: 'a3' };

// one fixed patch per kind, inside the kind's rule in sound() and near the middle of its ranges (design D2)
// part: [pattern kind, preset]; bpm: the card's tempo when it plays alone
export const FM_CARDS = [
  { kind: 'bell', name: { it: 'Campana', en: 'Bell' }, carrier: 'sine', fm: { index: 2, harmonicity: 3.5, wave: 'sine', decay: 0.2, sustain: 0 }, part: ['arpeggios', 'sugiu'], bpm: 128 },
  { kind: 'reese', name: { it: 'Reese', en: 'Reese' }, carrier: 'sawtooth', fm: { index: 0.8, harmonicity: 1.01, wave: 'sine', decay: 0.6, sustain: 0.7 }, part: ['basslines', 'rolling'], bpm: 128 },
  { kind: 'growl', name: { it: 'Ringhio', en: 'Growl' }, carrier: 'sawtooth', fm: { index: 2, harmonicity: 1, wave: 'square', decay: 0.3, sustain: 0.5, index2: 1, harmonicity2: 5 }, part: ['basslines', 'galoppo'], bpm: 128 },
  { kind: 'dirty', name: { it: 'Sporco', en: 'Dirty' }, carrier: 'sawtooth', fm: { index: 0.3, harmonicity: 1, wave: 'pink', decay: 0.3, sustain: 0.25 }, part: ['basslines', 'offbeat'], bpm: 128 },
  { kind: 'tine', name: { it: 'Piano elettrico', en: 'Electric piano' }, carrier: 'sine', fm: { index: 1.8, harmonicity: 1, wave: 'sine', decay: 0.2, sustain: 0.1, index2: 0.8, harmonicity2: 7 }, part: ['chords', 'comp'], bpm: 100 },
  { kind: 'clang', name: { it: 'Metallo', en: 'Metal' }, carrier: 'sine', fm: { index: 2.8, harmonicity: 2.76, wave: 'sine', decay: 0.4, sustain: 0.15, index2: 0.8, harmonicity2: 4.5 }, part: ['melodies', 'eco'], bpm: 124 },
  { kind: 'sub', name: { it: 'Sub', en: 'Sub' }, carrier: 'triangle', fm: { index: 1.8, harmonicity: 0.5, wave: 'sine', decay: 0.4, sustain: 0.8 }, part: ['basslines', 'sub'], bpm: 128 },
  { kind: 'organ', name: { it: 'Organo', en: 'Organ' }, carrier: 'sine', fm: { index: 1, harmonicity: 2, wave: 'sine', decay: 0.8, sustain: 1 }, part: ['chords', 'pad'], bpm: 120 },
].map(c => ({ ...c, type: KIND_TYPE[c.part[0]], octave: OCTAVE[KIND_TYPE[c.part[0]]] }));
export const cardOf = kind => FM_CARDS.find(c => c.kind === kind) || null;
// the FM kinds of the generator (every kind but the plain waves): each needs a card (the check fails otherwise)
export const FM_KINDS = SOUND_KINDS.filter(k => k !== 'square');
// the highest FM amount of a card: the index range capped one step per octave above 4, as sound() does
export const cardMax = card => Math.max(0.5, FM_RANGES.index[1] - Math.max(0, card.octave - 4));
// the amounts the four drawings show: 0, 1, 2 and 3, no higher than the card's maximum
export const drawAmounts = card => [0, 1, 2, 3].filter(a => a <= cardMax(card));
// the drawing nearest an amount
// (halfway rounds up: 0.5 lights FM 1)
export const litAmount = (card, amount) => drawAmounts(card).reduce((best, a) => (Math.abs(a - amount) <= Math.abs(best - amount) ? a : best), 0);
// the words a search matches: both names, the kind and "fm"
export const cardHaystack = card => `fm ${card.kind} ${card.name.it} ${card.name.en}`.toLowerCase();
// favourites key (design D1)
export const favKey = card => `fm:${card.kind}`;

const r2 = n => Math.round(n * 1000) / 1000;
const fmDevice = (card, amount) => ({ device: 'fm', ...card.fm, index: r2(amount) });
// the FM device a card puts on a track ("Use in track")
export const cardDevice = (card, amount = card.fm.index) => fmDevice(card, amount);
// the FM chain written as the rack device writes it (src/song/rack.js)
const fmChain = (card, amount) => {
  const d = fmDevice(card, amount), f = n => String(r2(n));
  return `.fm(${f(d.index)}).fmh(${f(d.harmonicity)})${d.wave !== 'sine' ? `.fmwave("${d.wave}")` : ''}.fmdecay(${f(d.decay)}).fmsustain(${f(d.sustain)})${d.index2 > 0 ? `.fm2(${f(d.index2)}).fmh2(${f(d.harmonicity2)})` : ''}`;
};
const gainOf = card => (DEFAULT[card.type] || {}).gain ?? 0.5;

// the FM rise (design D4): the index of the .fm(…) call climbs from 0 at the first sixteenth of 4 bars to `top` at the
// last one (a saw sampled at each sixteenth's start reaches 63/64 of its range there, so the range goes a little over)
export function fmRise(expr, top) {
  return String(expr).replace(/\.fm\(([^()]*)\)/, `.fm(saw.slow(4).range(0, ${r2(top * 64 / 63)}))`);
}

// the expression a card plays in a mode at an FM amount, without orbit: Phrase is the card's part compiled as the
// pattern preview compiles it (loopSong with the FM device in the rack); Held note is one note per bar, the part's
// root; FM rise is that note on sixteenths with the rising index
export function cardLine(card, mode = 'phrase', amount = card.fm.index) {
  const a = Math.max(0, Math.min(cardMax(card), Number(amount) || 0));
  if (mode === 'phrase') {
    const [kind, preset] = card.part;
    const loop = loopSong({ kind, type: card.type, pattern: { preset, ...(card.type === 'arp' ? { speed: '16' } : {}) }, name: card.name.en }, { sound: card.carrier, rack: [fmDevice(card, a)], key: 'A', bpm: card.bpm, beat: false });
    return previewExpression(compileSong(loop), { orbit: LAB_ORBIT }).replace(/\.orbit\(\d+\)$/, '');
  }
  const g = r2(gainOf(card) * (card.type === 'bass' ? 0.6 : 1));
  if (mode === 'held') return `note("${ROOT[card.type]}").s("${card.carrier}").attack(.005).decay(.3).sustain(.8).release(.1)${fmChain(card, a)}.gain(${g})`;
  return fmRise(`note("${ROOT[card.type]}*16").s("${card.carrier}").decay(.12).sustain(.3).release(.05)${fmChain(card, cardMax(card))}.gain(${g})`, cardMax(card));
}
// the whole code of a card for the preview player: the tempo and one `$:` line
export const cardCode = (card, mode, amount) => `setcpm(${card.bpm}/4)\n$: ${cardLine(card, mode, amount)}`;

// ---------- the wave drawing (design D5) ----------
// carrier shapes over a phase in cycles, as Web Audio's oscillators start (sine at 0, the saw rising)
const frac = x => x - Math.floor(x);
export const SHAPES = {
  sine: p => Math.sin(2 * Math.PI * p),
  triangle: p => { const x = frac(p + 0.25); return x < 0.5 ? 4 * x - 1 : 3 - 4 * x; },
  square: p => (frac(p) < 0.5 ? 1 : -1),
  sawtooth: p => 2 * frac(p + 0.5) - 1,
};
// a seeded noise for the noise modulators, so the drawing is the same each time: values every 1/16 of a cycle, joined
// by straight lines (pink smoother than white, brown smoother still)
function noiseShape(wave) {
  const vals = [];
  let s = 12345, b = 0;
  for (let i = 0; i < 4096; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const w = (s / 4294967296) * 2 - 1;
    b = wave === 'brown' ? Math.max(-1, Math.min(1, b * 0.9 + w * 0.3)) : b * 0.5 + w * 0.5;
    vals.push(b);
  }
  return p => { const x = Math.max(0, p) * 16, i = Math.floor(x) % 4095, f = x - Math.floor(x); return vals[i] * (1 - f) + vals[i + 1] * f; };
}
const modShape = wave => (SHAPES[wave] || noiseShape(wave));
// the FM envelope at a time in the note: attack 0.001 s up to 1, then exponentially down to the sustain over the decay
export function fmEnv(fm, at = 0) {
  if (at <= 0.001) return 1;
  const sus = Math.max(fm.sustain ?? 1, 1e-3), d = fm.decay ?? 0.3, t = Math.min(1, (at - 0.001) / Math.max(d, 1e-3));
  return Math.max(fm.sustain ?? 1, Math.pow(sus, t));
}
// the carrier wave of a card at an FM index, as superdough plays it (applyFM): the carrier's frequency swings by
// index × modulator frequency, the modulator runs at the note × fmh and the second operator (note × fmh2) swings the
// modulator's frequency by fm2 × its own. Time is in cycles of the note, so the note's pitch drops out.
// opts: { cycles (2), points (240), at (time in the note in seconds, for the envelope), sub (integration steps per point),
// phase (the modulators' phase when the carrier starts, in cycles: 0 for the drawings) }
// → an array of `points` values from -1 to 1
export function fmWave(card, index, { cycles = 2, points = 240, at = 0, sub = null, phase = 0 } = {}) {
  // (a modulator with jumps, square or saw, needs finer steps)
  if (!sub) sub = ['square', 'sawtooth'].includes(card.fm.wave) ? 64 : 8;
  const fm = card.fm, env = fmEnv(fm, at), I = index * env, h = fm.harmonicity, I2 = (fm.index2 || 0) * env, h2 = fm.harmonicity2 || 1;
  const carrier = SHAPES[card.carrier] || SHAPES.sine, m1 = modShape(fm.wave || 'sine'), m2 = SHAPES.sine;
  const out = new Array(points), du = cycles / (points - 1) / sub;
  let pc = 0, p1 = phase, p2 = phase;
  out[0] = carrier(0);
  for (let i = 1; i < points; i++) {
    for (let k = 0; k < sub; k++) {
      // (midpoint steps: the phases move by their frequency at the middle of the step)
      const p2m = p2 + h2 * du / 2, f1 = h + I2 * h2 * m2(p2m);
      const p1m = p1 + f1 * du / 2, fc = 1 + I * h * m1(p1m);
      pc += fc * du; p1 += f1 * du; p2 += h2 * du;
    }
    out[i] = carrier(pc);
  }
  return out;
}
// rising zero crossings of a wave
export const zeroCrossings = w => { let n = 0; for (let i = 1; i < w.length; i++) if (w[i - 1] < 0 && w[i] >= 0) n++; return n; };
// the RMS frequency of a wave in cycles per unit (unit: one cycle of the note for a drawing, one second for samples, with
// `step` the time between two values): how bright it is, read from its slope. An FM wave's shape depends on the
// modulator's phase at the note's start, which superdough does not fix (the modulator starts when the note is
// scheduled, the carrier at the note's time), and on the time in the note (the FM envelope): the browser check
// asserts that the scope's value lies in the range the formula gives over those phases and times (briRange).
export function rmsFreq(w, step) {
  let a = 0, b = 0;
  for (let i = 1; i < w.length; i++) { const d = (w[i] - w[i - 1]) / step; a += d * d; b += w[i] * w[i]; }
  return b ? Math.sqrt(a / b) / (2 * Math.PI) : 0;
}
// the range of the RMS frequency a card's wave can have at an index, over the modulators' start phases and the times
// in the note (`ats`, seconds) → [lo, hi] in cycles of the note
export function briRange(card, index, ats = [0, 0.05, 0.1, 0.2, 0.4, 0.8, 2]) {
  let lo = Infinity, hi = 0;
  const cyc = 24, pts = 6000;
  for (const at of ats) for (let k = 0; k < 16; k++) {
    const v = rmsFreq(fmWave(card, index, { cycles: cyc, points: pts, at, phase: k / 16, sub: 4 }), cyc / (pts - 1));
    lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  return [lo, hi];
}
