// Sounds (material-generator D9): the wave of a melodic track and an optional FM patch, inside a range table.
// FM uses at most two operators and no feedback in this first version; the patch is a rack device ("fm", src/song/rack.js)
// so it reaches the code through the same writer as every other effect.
import { band } from './common.js';

export const SOUND_KINDS = ['bell', 'reese', 'growl', 'dirty', 'saw', 'square'];
// the range table of the first version
export const FM_RANGES = {
  index: [0, 4], harmonicity: [0.5, 1, 1.01, 2, 2.01, 3, 3.5, 4], wave: ['sine', 'triangle', 'square', 'sawtooth', 'pink', 'brown'],
  index2: [0.5, 3], harmonicity2: [1, 10], decay: [0.05, 1], sustain: [0, 1],
};
// the octave a track type plays around (the FM index goes down one per octave above 4)
const OCTAVE = { bass: 1, arp: 4, hook: 4, pad: 3, guitar: 3 };
const round = x => Math.round(x * 100) / 100;

// opts: { style (its sounds list), type, energy, octave } → { settings: { wave }, rack: [fm device] | [], why }
export function sound(r, { style = {}, type = 'hook', energy = 0.5, octave } = {}) {
  const kinds = (style.sounds || SOUND_KINDS).filter(k => SOUND_KINDS.includes(k));
  const kind = r.pick(kinds.length ? kinds : SOUND_KINDS), b = band(energy);
  const oct = Number(octave ?? OCTAVE[type] ?? 4), top = Math.max(0.5, FM_RANGES.index[1] - Math.max(0, oct - 4));
  const idx = (lo, hi) => round(Math.min(top, r.range(lo, hi)));
  let wave = 'sawtooth', fm = null;
  if (kind === 'bell') { wave = r.pick(['sine', 'triangle']); fm = { index: idx(1, 3), harmonicity: r.pick([1.01, 2.01, 3.5]), wave: 'sine', decay: round(r.range(0.05, 0.4)), sustain: 0 }; }
  else if (kind === 'reese') { wave = 'sawtooth'; fm = { index: idx(0.3, 1.2), harmonicity: r.pick([1, 1.01, 0.5]), wave: 'sine', decay: round(r.range(0.3, 1)), sustain: round(r.range(0.4, 1)) }; }
  else if (kind === 'growl') { wave = r.pick(['sawtooth', 'square']); fm = { index: idx(1, 3), harmonicity: r.pick([0.5, 1, 2]), wave: r.pick(['square', 'sawtooth', 'triangle']), decay: round(r.range(0.1, 0.6)), sustain: round(r.range(0.2, 0.7)), index2: round(r.range(0.5, b === 2 ? 3 : 1.5)), harmonicity2: round(r.range(1, 10)) }; }
  else if (kind === 'dirty') { wave = r.pick(['sawtooth', 'square']); fm = { index: round(r.range(0.1, 0.45)), harmonicity: 1, wave: r.pick(['pink', 'brown']), decay: round(r.range(0.1, 0.5)), sustain: round(r.range(0, 0.5)) }; }
  else if (kind === 'square') wave = 'square';
  const rack = fm ? [{ device: 'fm', ...fm }] : [];
  return { settings: { wave }, rack, why: [`sound ${kind}${fm ? ` fm ${fm.index}×${fm.harmonicity}${fm.index2 ? ` + ${fm.index2}×${fm.harmonicity2}` : ''}` : ''}`] };
}
// true when an FM device is inside the range table (two operators at most, pink and brown only below index 0.5)
export function fmInRange(d) {
  const R = FM_RANGES, inR = (v, [lo, hi]) => typeof v === 'number' && v >= lo && v <= hi;
  if (!inR(d.index, R.index) || !R.harmonicity.includes(d.harmonicity) || !R.wave.includes(d.wave)) return false;
  if (['pink', 'brown'].includes(d.wave) && d.index >= 0.5) return false;
  if (!inR(d.decay, R.decay) || !inR(d.sustain, R.sustain)) return false;
  if (d.index2 !== undefined && d.index2 !== 0 && (!inR(d.index2, R.index2) || !inR(d.harmonicity2, R.harmonicity2))) return false;
  return Object.keys(d).every(k => ['device', 'index', 'harmonicity', 'wave', 'decay', 'sustain', 'index2', 'harmonicity2', 'on'].includes(k));
}
