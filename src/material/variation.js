// Seeded per-hit variation (random-sound-params D4, D8; docs/ENDLESS.md "Material"): a track's `vary` setting lists up
// to three targets, each with an amount, a seed and a loop length. The writer (src/music.js) turns an entry into a
// seeded random value per hit around the track's own value, `rand.range(lo, hi).rib(seed, cycles)`: Strudel's rand and
// perlin depend only on time, so the same song gives the same value on the same hit everywhere. The generator draws
// the entries from a seed, a style (`<instrument>.material.variation`) and an energy. Pure and seeded.
import { stream } from '../endless/random.js';
import { randomCode } from '../song/ideas.js';
import { deviceWrites } from '../song/writes.js';

// targets: the cap of the amount, and the default function (pan moves smoothly)
export const VARY_TARGETS = {
  lpf: { cap: 0.6 }, hpf: { cap: 0.5 }, pan: { cap: 0.8, fn: 'perlin' }, gain: { cap: 0.3 }, delay: { cap: 0.6 }, room: { cap: 0.6 },
  decay: { cap: 0.5 }, distort: { cap: 0.4 }, crush: { cap: 0.8 }, vowel: { cap: 1 },
};
export const VARY_TARGET_IDS = Object.keys(VARY_TARGETS);
export const VARY_FNS = ['rand', 'perlin'];
export const VARY_MAX = 3;
export const VOWELS = ['a', 'e', 'i', 'o', 'u'];
// the track types that may hold a variation
export const VARY_TYPES = ['drums', 'bass', 'arp', 'hook', 'pad', 'guitar'];
// the style's default when it declares none (D8): melodic tracks lpf and pan, drums decay and pan on the hats
export const VARY_DEFAULT = { amount: 0.2, melodic: ['lpf', 'pan'], drums: ['decay', 'pan'] };
const r2 = x => Math.round(x * 100) / 100;
const r0 = x => Math.round(x);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const fmt = (k, x) => (k === 'lpf' || k === 'hpf' ? String(r0(x)) : k === 'crush' ? String(r0(x)) : String(r2(x)));

// The range an entry writes around the track's own value v (D4) → [lo, hi]; null for vowel (it picks)
export function varyRange(entry, v) {
  const a = clamp(Number(entry.amount) || 0, 0, (VARY_TARGETS[entry.on] || { cap: 0 }).cap);
  switch (entry.on) {
    case 'lpf': { const top = Math.min(Number.isFinite(v) ? v : 18000, 18000); return [top * (1 - a), top]; }
    case 'hpf': { const b = Number.isFinite(v) ? v : 0; return [b, b + a * 2000]; }
    case 'pan': return [0.5 - a / 2, 0.5 + a / 2];
    case 'gain': return [v * (1 - a), v];
    case 'delay': case 'room': { const b = Number.isFinite(v) ? v : 0; return [b, b + a * 0.5]; }
    case 'decay': return [v * (1 - a), v * (1 + a / 2)];
    case 'distort': { const b = Number.isFinite(v) ? v : 0; return [b, b + a * 1.5]; }
    // the track's own crush (grit) is the top, else 16 bits (no crush)
    case 'crush': { const top = Number.isFinite(v) ? v : 16; return [Math.max(1, top - a * 10), top]; }
    default: return null;
  }
}
// the vowels an entry chooses among: the first round(amount × 4) + 1 of a e i o u
export const varyVowels = entry => VOWELS.slice(0, Math.round(clamp(Number(entry.amount) || 0, 0, 1) * 4) + 1);
// The argument of the control for one entry: rand.range(2400, 4000).rib(41, 4), or irand(2).rib(3, 4).pick(["a","e"])
export function varyArg(entry, v) {
  const fn = entry.fn || (VARY_TARGETS[entry.on] && VARY_TARGETS[entry.on].fn) || 'rand';
  if (entry.on === 'vowel') {
    const list = varyVowels(entry);
    return `${randomCode({ fn: 'irand', max: list.length, seed: entry.seed, cycles: entry.cycles })}.pick([${list.map(x => `"${x}"`).join(', ')}])`;
  }
  const [lo, hi] = varyRange(entry, v);
  return randomCode({ fn, range: [fmt(entry.on, lo), fmt(entry.on, hi)], seed: entry.seed, cycles: entry.cycles });
}
// The entries of a track for one line: { target: entry }; on a drum track, an entry with a row only on that row, and a
// row's own entry over one for every row. null when none.
export function varyFor(vary, row = null) {
  if (!Array.isArray(vary) || !vary.length) return null;
  const out = {};
  for (const e of vary) if (e && VARY_TARGETS[e.on] && !e.row && !(e.on in out)) out[e.on] = e;
  if (row) for (const e of vary) if (e && VARY_TARGETS[e.on] && e.row === row) out[e.on] = e;
  return Object.keys(out).length ? out : null;
}

// The errors of a vary setting: [[path suffix, message, 'err' | 'warn']]; type: the track type
export function varyErrors(vary, type) {
  const out = [], err = (p, m) => out.push([p, m, 'err']);
  if (!Array.isArray(vary)) return [['', `a list of at most ${VARY_MAX} entries { on, amount, seed, cycles }`, 'err']];
  if (!VARY_TYPES.includes(type)) err('', `only ${VARY_TYPES.join(', ')} tracks vary their sound`);
  if (vary.length > VARY_MAX) err('', `at most ${VARY_MAX} entries`);
  const seen = new Set();
  vary.forEach((e, i) => {
    const p = `[${i}]`;
    if (!e || typeof e !== 'object' || Array.isArray(e)) { err(p, 'an object { on, amount, seed, cycles }'); return; }
    for (const k of Object.keys(e)) if (!['on', 'amount', 'seed', 'cycles', 'fn', 'row'].includes(k)) err(`${p}.${k}`, 'unknown field; fields: on, amount, seed, cycles, fn, row');
    const T = VARY_TARGETS[e.on];
    if (!T) err(`${p}.on`, `one of ${VARY_TARGET_IDS.join(', ')}`);
    else if (typeof e.amount !== 'number' || !(e.amount >= 0) || e.amount > T.cap) err(`${p}.amount`, `a number from 0 to ${T.cap} (the cap of ${e.on})`);
    if (!Number.isInteger(e.seed) || e.seed < 0) err(`${p}.seed`, 'a whole number from 0');
    if (!Number.isInteger(e.cycles) || e.cycles < 1 || e.cycles > 8) err(`${p}.cycles`, 'the loop length in bars, a whole number from 1 to 8');
    if (e.fn !== undefined && !VARY_FNS.includes(e.fn)) err(`${p}.fn`, `one of ${VARY_FNS.join(', ')}`);
    if (e.row !== undefined && type !== 'drums') err(`${p}.row`, 'a row is for drum tracks only');
    else if (e.row !== undefined && !['bd', 'cp', 'sd', 'hh', 'oh', 'rd'].includes(e.row)) err(`${p}.row`, 'one of bd, cp, sd, hh, oh, rd');
    if (e.on === 'distort' && type === 'bass') err(`${p}.on`, 'a bass never varies its distortion');
    if (e.on === 'gain' && type === 'drums' && (e.row === 'bd' || e.row === undefined)) err(`${p}.on`, 'the kick never varies its gain: give a row other than bd');
    const key = `${e.on}|${e.row || ''}`;
    if (seen.has(key)) err(p, `two entries for ${e.on}${e.row ? ` on ${e.row}` : ''}`);
    seen.add(key);
  });
  return out;
}

// the targets a track writes with a variation that the writer would leave out (D4): automated (cutoffEnd, gainEnd, a
// moving filter), written later by a rack device, or decay on drums without a tone decay → { target: reason }
export function varySkips(type, settings = {}, rack = []) {
  const s = settings || {}, out = {};
  const moving = s.move && s.move !== 'fisso' && type !== 'drums' && type !== 'guitar';
  if ((s.cutoffEnd !== null && s.cutoffEnd !== undefined && s.cutoffEnd !== s.cutoff) || moving) out.lpf = 'the filter moves (cutoffEnd or a moving filter)';
  if (s.gainEnd !== null && s.gainEnd !== undefined && s.gainEnd !== s.gain) out.gain = 'the gain is automated (gainEnd)';
  // a rack device that writes the same control later on the line wins over the variation
  // (each device declares the controls it writes, sound-modulation D2: a Sweep writes its target)
  for (const d of Array.isArray(rack) ? rack : []) if (d && d.on !== false) for (const c of deviceWrites(d)) if (!out[c]) out[c] = `a ${d.device} device writes ${c} later on the line`;
  if (type === 'drums' && !(s.tone && Object.values(s.tone).some(g => g && typeof g.decay === 'number'))) out.decay = 'a drum row varies its decay only where its tone sets one';
  // (distortvol(.5) halves a line's level: a clean track, drive 0, never varies its distortion)
  if (type !== 'guitar' && !(Number(s.drive) > 0)) out.distort = out.distort || 'the track plays clean (drive 0): its distortion does not vary';
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

// the targets the generator may write for a track type (D8): never distort on bass; the bass stays in the middle too
// (no pan), as a low part should
const allowed = (type, on) => !(type === 'bass' && (on === 'distort' || on === 'pan'));

// A variation for a track (D8): seed (a string), style (the instrument's material.variation), type, energy (0 to 1),
// settings and rack (to leave out the targets the writer would skip). The written amount is
// style amount × (0.5 + energy), clamped to each target's cap, then drawn between 60 and 100 % of it; one to three
// targets from the style's list. Drums: decay and pan on the hats, gain only on rows other than the kick.
// Draws from "material:vary" of the seed. → a vary list, or null when the amount is 0 or no target fits
// rows (drums): the rows the track plays; the row targets go on its hats, else on its first row other than the kick,
// and a track that plays only the kick gets no variation (the kick stays solid)
export function drawVary({ seed = '', style = null, type = 'hook', energy = 0.5, settings = {}, rack = [], rows = null } = {}) {
  const r = stream(String(seed), 'material:vary'), e = clamp(Number(energy) || 0, 0, 1);
  const own = style && typeof style === 'object' ? style : {};
  const base = typeof own.amount === 'number' ? clamp(own.amount, 0, 1) : VARY_DEFAULT.amount;
  const list = (Array.isArray(own.targets) && own.targets.length ? own.targets : type === 'drums' ? VARY_DEFAULT.drums : VARY_DEFAULT.melodic).filter(k => VARY_TARGETS[k]);
  const skips = varySkips(type, settings, rack);
  const fits = [...new Set(list)].filter(k => allowed(type, k) && !skips[k]);
  const want = base * (0.5 + e);
  // the draws happen before the checks, so the same seed draws the same numbers whatever the targets
  const nDraw = r.next(), order = r.shuffle(fits.slice()), parts = [0, 1, 2].map(() => ({ u: r.next(), seed: r.int(0, 999), cycles: r.pick([2, 4, 4, 8]) }));
  const row = type !== 'drums' ? null : !rows || rows.includes('hh') ? 'hh' : rows.find(x => x !== 'bd') || null;
  if (!(want > 0) || !fits.length || (type === 'drums' && !row)) return null;
  const n = clamp(1 + Math.floor(nDraw * Math.min(VARY_MAX, fits.length)), 1, Math.min(VARY_MAX, fits.length));
  const out = order.slice(0, n).map((on, i) => {
    const top = Math.min(VARY_TARGETS[on].cap, want), amount = r2(top * (0.6 + 0.4 * parts[i].u));
    const x = { on, amount, seed: parts[i].seed, cycles: parts[i].cycles };
    // drums: the hats' decay, pan and gain; distortion and crush on the hats too, so the kick and the snare stay solid
    if (type === 'drums' && !['lpf', 'hpf', 'room', 'delay'].includes(on)) x.row = row;
    return x;
  }).filter(x => x.amount > 0);
  return out.length ? out : null;
}
