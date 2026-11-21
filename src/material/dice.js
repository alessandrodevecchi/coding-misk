// The sound dice of a track in Compose (random-sound-params D5, app/sound-dice): a new sound for one track within its
// style's ranges, from the seed "<song id>:<track id>:sound:<n>". Each lock group draws from its own stream of the seed,
// so locking one group never changes what the others draw. The level, octave, mode, patterns, clips and the user's rack
// devices are never rolled; the dice owns only the FM device it composes. Pure and seeded: no unseeded random source.
import { stream } from '../endless/random.js';
import { compose } from './index.js';
import { WAVES, GUITAR_TYPES, KITS } from '../music.js';
import { TONE_GROUP_IDS, fitToneDrive } from './tone.js';

// the lock groups of each track type
export const DICE_GROUPS = {
  bass: ['sound', 'filter', 'effects', 'variation'], arp: ['sound', 'filter', 'effects', 'variation'], hook: ['sound', 'filter', 'effects', 'variation'], pad: ['sound', 'filter', 'effects', 'variation'],
  guitar: ['sound', 'effects', 'variation'],
  drums: ['kit', 'kick', 'snare', 'hats', 'variation'],
};
export const DICE_TYPES = Object.keys(DICE_GROUPS);
// the settings each group holds (the level, octave and mode are in none)
const FILTER_KEYS = ['cutoff', 'reso'];
const EFFECT_KEYS = { bass: ['drive'], arp: ['delay', 'drive'], hook: ['delay', 'drive'], pad: ['room', 'drive'], guitar: ['drive', 'room'] };
const r2 = x => Math.round(x * 100) / 100;
const roundFor = (k, x) => (k === 'cutoff' ? Math.round(x / 10) * 10 : k === 'reso' ? Math.round(x * 10) / 10 : r2(x));
const clone = o => JSON.parse(JSON.stringify(o));
const sameDevice = (a, b) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
// a choice from a list for roll n, other than roll n - 1's choice, so two presses in a row always change it; it depends
// only on the seed and n (the same number gives the same choice again), except roll 1, which avoids the current value
const base = (seedBase, n, g, list) => stream(`${seedBase}:${n}`, `sound/${g}`).pick(list);
function choose(seedBase, n, g, list, cur) {
  if (!list || !list.length) return cur;
  const avoid = n > 1 ? base(seedBase, n - 1, g, list) : cur, b = base(seedBase, n, g, list);
  if (b !== avoid || list.length < 2) return b;
  return list[(list.indexOf(b) + 1) % list.length];
}
// a setting from the style: a range drawn, a fixed value kept, nothing when the style does not give it
const fromStyle = (r, v, k) => (Array.isArray(v) ? roundFor(k, r.range(Math.min(v[0], v[1]), Math.max(v[0], v[1]))) : typeof v === 'number' ? v : undefined);
// the rows a drum track plays (its patterns' rows or beat rows)
const rowsOf = track => [...new Set(Object.values(track.patterns || {}).flatMap(p => Object.keys((p && p.rows) || (p && p.idea && p.idea.beat) || {}).filter(k => k !== 'grid')))];

// One roll. track: { id, type, settings, rack, patterns }; recipe: the style recipe; seedBase: "<song id>:<track id>:sound";
// n: the roll number (the seed is "<seedBase>:<n>");
// locks: the locked group ids; energy: the Compose energy slider (0 to 1); owned: the FM device the dice added before
// (or null). → { settings, rack, owned, groups } with the track's new settings and rack (copies), the FM device the dice
// owns now, and the groups drawn; null when the track type has no dice or there is no recipe
export function rollSound({ track, recipe, seedBase, n = 1, locks = [], energy = 0.5, owned = null }) {
  const type = track && track.type, seed = `${seedBase}:${n}`;
  if (!recipe || !DICE_GROUPS[type]) return null;
  const R = recipe[type] || {}, lock = new Set(locks), set = clone(track.settings || {});
  let rack = clone(track.rack || []), own = owned ? clone(owned) : null;
  const drawn = DICE_GROUPS[type].filter(g => !lock.has(g));
  const rs = g => stream(String(seed), `sound/${g}`);
  if (type === 'drums') {
    if (!lock.has('kit')) set.kit = choose(seedBase, n, 'kit', R.kits && R.kits.length ? R.kits : KITS, set.kit);
    const groups = TONE_GROUP_IDS.filter(g => !lock.has(g));
    if (groups.length) {
      const fresh = fitToneDrive(compose('tone', { seed: `${seed}:tone`, style: R.material || {}, energy, groups }).settings.tone, set.drive, R.material && R.material.tones);
      set.tone = { ...(set.tone || {}), ...fresh };
    }
  } else {
    if (!lock.has('sound')) {
      if (type === 'guitar') set.type = choose(seedBase, n, 'sound', R.types && R.types.length ? R.types : Object.keys(GUITAR_TYPES), set.type);
      else {
        // the FM device the dice put there goes (a user's own FM device stays, and the dice then draws the wave only)
        const at = own ? rack.findIndex(d => sameDevice(d, own)) : -1;
        if (at >= 0) rack.splice(at, 1);
        own = null;
        const userFm = rack.some(d => d && d.device === 'fm');
        const kinds = R.material && Array.isArray(R.material.sounds) && R.material.sounds.length;
        if (kinds) {
          const c = compose('sound', { seed: `${seed}:sound`, style: R.material, type, energy, octave: set.octave });
          set.wave = c.settings.wave;
          if (c.rack.length && !userFm) { own = clone(c.rack[0]); rack.push(clone(own)); }
        } else set.wave = choose(seedBase, n, 'sound', R.waves && R.waves.length ? R.waves : WAVES.map(x => x[0]), set.wave);
      }
    }
    if (DICE_GROUPS[type].includes('filter') && !lock.has('filter')) {
      const r = rs('filter'), S = R.settings || {};
      for (const k of FILTER_KEYS) { const v = fromStyle(r, S[k], k); if (v !== undefined) set[k] = v; }
    }
    if (!lock.has('effects')) {
      const r = rs('effects'), S = R.settings || {};
      for (const k of EFFECT_KEYS[type] || []) { const v = fromStyle(r, S[k], k); if (v !== undefined) set[k] = v; }
    }
  }
  if (!lock.has('variation')) {
    const v = compose('vary', { seed: `${seed}:vary`, style: R.material || {}, type, energy, settings: set, rack, rows: type === 'drums' ? rowsOf(track) : null }).settings.vary;
    if (v) set.vary = v; else delete set.vary;
  }
  // the level is never rolled
  if (track.settings && 'gain' in track.settings) set.gain = track.settings.gain;
  return { settings: set, rack, owned: own, groups: drawn };
}
