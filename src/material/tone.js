// Composed drum tones (random-sound-params D2, D3; docs/ENDLESS.md "Material"): a drum track's `tone` setting holds a
// decay, a tune, a drive and a low-pass cutoff per kit piece group, inside a fixed table of safe ranges. The writer
// (src/music.js) appends a group's tone to each of its rows' lines; the generator draws it from a seed, a style
// (`drums.material.tones`) and an energy. Pure and seeded: no unseeded random source.
import { stream } from '../endless/random.js';

// kit piece groups and the drum rows they hold
export const TONE_GROUPS = { kick: ['bd'], snare: ['sd', 'cp'], hats: ['hh', 'oh', 'rd'] };
export const TONE_GROUP_IDS = Object.keys(TONE_GROUPS);
export const TONE_VALUES = ['decay', 'tune', 'drive', 'cutoff'];
// the group of a drum row, or null (a row no group holds plays untoned)
export const toneGroupOf = row => TONE_GROUP_IDS.find(g => TONE_GROUPS[g].includes(row)) || null;
// the safe table (D2): decay in seconds, tune in semitones, drive (distort, halved by distortvol), cutoff in Hz
export const TONE_RANGES = {
  kick: { decay: [0.15, 0.8], tune: [-3, 2], drive: [0, 0.6], cutoff: [1500, 20000] },
  snare: { decay: [0.08, 0.5], tune: [-2, 3], drive: [0, 0.8], cutoff: [2500, 20000] },
  hats: { decay: [0.03, 0.3], tune: [-2, 4], drive: [0, 0.3], cutoff: [5000, 20000] },
};
const r3 = x => Math.round(x * 1000) / 1000;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// true when a tone holds only known groups and values inside the safe table
export function toneInRange(tone) {
  if (!tone || typeof tone !== 'object' || Array.isArray(tone)) return false;
  return Object.entries(tone).every(([g, v]) => TONE_RANGES[g] && v && typeof v === 'object' && !Array.isArray(v)
    && Object.entries(v).every(([k, x]) => TONE_RANGES[g][k] && typeof x === 'number' && x >= TONE_RANGES[g][k][0] && x <= TONE_RANGES[g][k][1]));
}
// The errors of a tone (the song validator and the recipe validator share them): [[path suffix, message]]
export function toneErrors(tone) {
  const out = [];
  if (!tone || typeof tone !== 'object' || Array.isArray(tone)) return [['', `an object of kit piece groups: ${TONE_GROUP_IDS.join(', ')}`]];
  for (const [g, v] of Object.entries(tone)) {
    if (!TONE_RANGES[g]) { out.push([`.${g}`, `unknown group; groups: ${TONE_GROUP_IDS.join(', ')}`]); continue; }
    if (!v || typeof v !== 'object' || Array.isArray(v)) { out.push([`.${g}`, `an object of values: ${TONE_VALUES.join(', ')}`]); continue; }
    for (const [k, x] of Object.entries(v)) {
      const R = TONE_RANGES[g][k];
      if (!R) out.push([`.${g}.${k}`, `unknown value; values: ${TONE_VALUES.join(', ')}`]);
      else if (typeof x !== 'number' || !Number.isFinite(x) || x < R[0] || x > R[1]) out.push([`.${g}.${k}`, `a number from ${R[0]} to ${R[1]}`]);
    }
  }
  return out;
}

// The tone code of one drum row (D2), the part written right after .bank(kit): { head: decay, sustain and speed;
// drive: the row's drive or null (the track's); cutoff: the row's cutoff or null (the track's) }. The open hat keeps at
// least twice the hats decay, so the closed and open hats stay apart.
export function toneOfRow(tone, row) {
  const g = toneGroupOf(row), v = g && tone && tone[g];
  if (!v) return null;
  const decay = typeof v.decay === 'number' ? (row === 'oh' ? Math.min(TONE_RANGES.hats.decay[1] * 2, v.decay * 2) : v.decay) : null;
  return {
    decay,
    speed: typeof v.tune === 'number' && v.tune !== 0 ? r3(2 ** (v.tune / 12)) : null,
    drive: typeof v.drive === 'number' ? v.drive : null,
    cutoff: typeof v.cutoff === 'number' ? v.cutoff : null,
  };
}

// The middle half of a safe range
const middle = ([lo, hi]) => [lo + (hi - lo) / 4, hi - (hi - lo) / 4];
// A style's range for a value intersected with the safe table, else the middle half of the safe table
function rangeOf(group, key, style) {
  const safe = TONE_RANGES[group][key], own = style && style[group] && style[group][key];
  if (Array.isArray(own) && own.length === 2) {
    const lo = clamp(Math.min(own[0], own[1]), safe[0], safe[1]), hi = clamp(Math.max(own[0], own[1]), safe[0], safe[1]);
    return [lo, hi];
  }
  return middle(safe);
}
// where in a range the energy puts a value: a draw u (0 to 1) moved by the energy. up: higher energy → higher value
// (drive, cutoff); the result never goes down when the energy goes up for the same draw
const place = ([lo, hi], u, e, up) => {
  const t = up ? 0.5 * u + 0.5 * e : 0.5 * u + 0.5 * (1 - e);
  return lo + (hi - lo) * clamp(t, 0, 1);
};
const roundFor = (key, x) => (key === 'cutoff' ? Math.round(x / 10) * 10 : key === 'tune' ? Math.round(x * 2) / 2 : r3(x));

// A tone for a drum track (D3): seed (a string), style (drums.material.tones), energy (0 to 1), groups (the groups to
// draw; each from its own sub-stream "material:tone/<group>", so leaving one out never changes another's draw).
// Higher energy: more drive and a brighter cutoff; lower energy: a longer kick and darker hats.
export function drawTone({ seed = '', style = null, energy = 0.5, groups = TONE_GROUP_IDS } = {}) {
  const e = clamp(Number(energy) || 0, 0, 1), out = {};
  for (const g of groups) {
    if (!TONE_RANGES[g]) continue;
    const r = stream(String(seed), `material:tone/${g}`);
    const u = { decay: r.next(), tune: r.next(), drive: r.next(), cutoff: r.next() };
    const v = {};
    // the kick's decay grows as the energy falls; the snare and hats decay follow the draw only
    v.decay = roundFor('decay', g === 'kick' ? place(rangeOf(g, 'decay', style), u.decay, e, false) : place(rangeOf(g, 'decay', style), u.decay, 0.5, true));
    v.tune = roundFor('tune', place(rangeOf(g, 'tune', style), u.tune, 0.5, true));
    v.drive = roundFor('drive', place(rangeOf(g, 'drive', style), u.drive, e, true));
    v.cutoff = roundFor('cutoff', place(rangeOf(g, 'cutoff', style), u.cutoff, e, true));
    for (const k of TONE_VALUES) v[k] = clamp(v[k], TONE_RANGES[g][k][0], TONE_RANGES[g][k][1]);
    if (v.tune === 0) delete v.tune;
    // (measured, task 2.4: a low-pass on a full kick overshoots its peak, 0.85 to 0.97 on LinnDrum, MPC60 and HR16,
    // so the generator gives the kick no cutoff; a hand-written one stays valid)
    if (g === 'kick') delete v.cutoff;
    out[g] = v;
  }
  return out;
}

// The drive of a drawn tone against the track's own drive (measured, task 2.4): `distortvol(.5)` halves a row's level,
// so a tone adds no drive to a track that plays clean (its rows would drop to half), and a group whose drive the style
// does not give keeps the track's own drive. Changes the tone in place and returns it.
export function fitToneDrive(tone, trackDrive, styleTones = null) {
  for (const g of Object.keys(tone || {})) {
    const own = styleTones && styleTones[g] && styleTones[g].drive;
    if (!(trackDrive > 0) || !own) delete tone[g].drive;
  }
  return tone;
}
