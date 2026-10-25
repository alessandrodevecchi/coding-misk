// Sounds (material-generator D9): the wave of a melodic track and an optional FM patch, inside a range table.
// FM uses at most two operators and no feedback in this first version; the patch is a rack device ("fm", src/song/rack.js)
// so it reaches the code through the same writer as every other effect.
import { band } from './common.js';

// tine, clang, sub and organ (#71) are not in any style recipe yet: a style picks them by naming them in `sounds`
export const SOUND_KINDS = ['bell', 'reese', 'growl', 'dirty', 'saw', 'square', 'tine', 'clang', 'sub', 'organ'];
// the range table: ratios just off 1 and 0.5 make the reese beat, 1.41 and 2.76 are the inharmonic ratios of clang (#71)
export const FM_RANGES = {
  index: [0, 4], harmonicity: [0.5, 0.505, 1, 1.005, 1.01, 1.015, 1.02, 1.41, 2, 2.01, 2.76, 3, 3.5, 4], wave: ['sine', 'triangle', 'square', 'sawtooth', 'pink', 'brown'],
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
  else if (kind === 'reese') { wave = 'sawtooth'; fm = { index: idx(0.3, 1.2), harmonicity: r.pick([1.005, 1.01, 1.015, 1.02, 0.505]), wave: 'sine', decay: round(r.range(0.3, 1)), sustain: round(r.range(0.4, 1)) }; }
  else if (kind === 'growl') { wave = r.pick(['sawtooth', 'square']); fm = { index: idx(1, 3), harmonicity: r.pick([0.5, 1, 2]), wave: r.pick(['square', 'sawtooth', 'triangle']), decay: round(r.range(0.1, 0.6)), sustain: round(r.range(0.2, 0.7)), index2: round(r.range(0.5, b === 2 ? 3 : 1.5)), harmonicity2: round(r.range(1, 10)) }; }
  else if (kind === 'dirty') { wave = r.pick(['sawtooth', 'square']); fm = { index: round(r.range(0.1, 0.45)), harmonicity: 1, wave: r.pick(['pink', 'brown']), decay: round(r.range(0.1, 0.5)), sustain: round(r.range(0, 0.5)) }; }
  // tine: an electric piano, a bright attack that falls to a mellow tone; the second operator adds the metal of the tine
  else if (kind === 'tine') { wave = r.pick(['sine', 'triangle']); fm = { index: idx(1, 2.5), harmonicity: 1, wave: 'sine', decay: round(r.range(0.1, 0.35)), sustain: round(r.range(0, 0.2)), index2: round(r.range(0.5, 1.2)), harmonicity2: r.pick([7, 9]) }; }
  // clang: struck metal, inharmonic ratios on both operators, a long ring that fades
  else if (kind === 'clang') { wave = r.pick(['sine', 'triangle']); fm = { index: idx(2, 3.5), harmonicity: r.pick([1.41, 2.76, 3.5]), wave: 'sine', decay: round(r.range(0.2, 0.6)), sustain: round(r.range(0.05, 0.3)), index2: round(r.range(0.5, b === 2 ? 1.5 : 1)), harmonicity2: round(r.range(2.5, 6.5)) }; }
  // sub: a hollow growl an octave down, the modulator at half the note with a steady index
  else if (kind === 'sub') { wave = r.pick(['triangle', 'square']); fm = { index: idx(1, 2.5), harmonicity: 0.5, wave: 'sine', decay: round(r.range(0.2, 0.6)), sustain: round(r.range(0.6, 1)) }; }
  // organ: steady integer ratios with no decay, like drawbars
  else if (kind === 'organ') { wave = 'sine'; fm = { index: idx(0.6, 1.4), harmonicity: r.pick([1, 2, 3]), wave: 'sine', decay: round(r.range(0.5, 1)), sustain: round(r.range(0.9, 1)) }; }
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
