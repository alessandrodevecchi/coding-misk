// Measured energy of a song state (docs/ENDLESS.md, "Energy"): what is actually playing, not what was planned.
// state: a song as stateAt(song, bar).song gives it (tracks with mute, settings, rack, clips and patterns).
// opts: { usual: tracks that count as full (the high end of the usual range), weights: { tracks, drums, filter, drive } }
import { RECIPE_DEFAULTS } from './recipe.js';

const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const MELODIC = ['bass', 'arp', 'hook', 'pad', 'guitar'];

export const playing = state => (state.tracks || []).filter(t => !t.mute && t.type !== 'voice');
const patternOf = t => ((t.patterns || {})[((t.clips || [])[0] || {}).pattern] || {});

// hits per bar of the drum tracks playing
export function drumHits(state) {
  let hits = 0;
  for (const t of playing(state)) if (t.type === 'drums') for (const row of Object.values(patternOf(t).rows || {})) hits += (row.match(/x/g) || []).length * 16 / Math.max(1, row.length);
  return hits;
}

// the parts of the measure, each 0 to 1
export function energyParts(state, opts = {}) {
  const on = playing(state), usual = opts.usual || RECIPE_DEFAULTS.tracks.usual[1];
  const mel = on.filter(t => MELODIC.includes(t.type) && Number.isFinite((t.settings || {}).cutoff));
  // cutoff on a log scale: 150 Hz closed, 6000 Hz open
  const filter = mel.length ? mel.reduce((a, t) => a + clamp(Math.log(t.settings.cutoff / 150) / Math.log(6000 / 150)), 0) / mel.length : 0;
  const driveOf = t => ((t.settings || {}).drive || 0) + (t.rack || []).filter(d => d.on !== false).reduce((a, d) => a + (d.device === 'distort' ? (d.amount ?? 2) / 2 : d.device === 'crush' || d.device === 'shape' ? 0.5 : 0), 0);
  const drive = on.length ? clamp(on.reduce((a, t) => a + driveOf(t), 0) / on.length / 2) : 0;
  return { tracks: clamp(on.length / usual), drums: clamp(drumHits(state) / 22), filter, drive };
}

export function energyOf(state, opts = {}) {
  const w = opts.weights || RECIPE_DEFAULTS.energy, parts = energyParts(state, opts);
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  return Object.keys(w).reduce((a, k) => a + w[k] * (parts[k] || 0), 0) / total;
}

// The curves next to energy (#40, docs/ENDLESS.md "Curves"), measured on what plays:
//   density: tracks playing (voice and riser left out), a count; brightness: the filter part, 0 to 1;
//   tension: drive and distortion, the riser playing, the strong progression (opts.lift), 0 to 1.
export const CURVES = ['density', 'brightness', 'tension', 'voice'];
export function curveParts(state, opts = {}) {
  const on = playing(state), parts = energyParts(state, opts);
  const riser = on.some(t => t.type === 'riser') ? 1 : 0;
  return {
    density: on.filter(t => t.type !== 'riser').length,
    brightness: parts.filter,
    tension: clamp(0.65 * clamp(parts.drive * 1.6) + 0.2 * riser + 0.15 * (opts.lift ? 1 : 0)),
  };
}
