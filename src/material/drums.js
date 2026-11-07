// Drum grooves (material-generator D5): sequencer steps per row from a family of style rules. Each family keeps its
// defining hits; the seed and the energy add hats, claps and ghost hits around them. Kits stay from the recipe.
import { band, meterOf, euclid } from './common.js';

export const FAMILIES = ['four-floor', 'breakbeat', 'two-step', 'half-time', 'euclid'];
const uniq = list => [...new Set(list)].sort((a, b) => a - b);

// Four-on-the-floor kick variants (kick-variety D1), defined on the meter's beats: `back` is the beats at odd positions,
// the last beat is the bar's last. A variant equal to an earlier one in the meter is left out (7/8 has no `push`).
export const KICK_VARIANTS = ['straight', 'pickup', 'push', 'rolling', 'broken'];
// weights per energy band (D2), in the order of KICK_VARIANTS; the weight of a variant left out goes to `straight`
const KICK_WEIGHTS = [[0.45, 0.2, 0, 0.1, 0.25], [0.3, 0.25, 0.15, 0.15, 0.15], [0.2, 0.2, 0.25, 0.25, 0.1]];
function kickSteps(variant, N, beats) {
  const back = beats.filter((_, i) => i % 2 === 1), L = beats[beats.length - 1];
  if (variant === 'pickup') return uniq([...beats, N - 1]);
  if (variant === 'push') return uniq([...beats, N - 2]);
  if (variant === 'rolling') return uniq([...beats, ...back.map(x => x - 1)]);
  if (variant === 'broken') return uniq([...beats.filter(x => x !== L), ...(L + 2 < N ? [L + 2] : [])]);
  return beats.slice();
}
const stepString = (list, N) => Array.from({ length: N }, (_, i) => (list.includes(i) ? 'x' : '.')).join('');
// the kick variants of a meter: [{ variant, steps, row }], a variant equal to an earlier one left out
export function kickVariants(meter) {
  const { N, beats } = meterOf(meter), out = [];
  for (const variant of KICK_VARIANTS) {
    const steps = kickSteps(variant, N, beats), row = stepString(steps, N);
    if (!out.some(x => x.row === row)) out.push({ variant, steps, row });
  }
  return out;
}
// the kick row of one variant in a meter (`x` and `.` steps), null when the meter leaves the variant out
export function kickRow(variant, meter) {
  const v = kickVariants(meter).find(x => x.variant === variant);
  return v ? v.row : null;
}
// one variant for a band from one draw u, leaving out the rows in avoid (unless every variant is in it)
function pickKick(u, b, meter, avoid) {
  const all = kickVariants(meter), w = Object.fromEntries(KICK_VARIANTS.map((v, i) => [v, KICK_WEIGHTS[b][i]]));
  for (const v of KICK_VARIANTS) if (!all.some(x => x.variant === v)) w.straight += w[v];
  const skip = new Set((avoid || []).map(String));
  const left = all.filter(x => !skip.has(x.row));
  let list = (left.length ? left : all).filter(x => w[x.variant] > 0);
  if (!list.length) list = left.length ? left : all;
  const total = list.reduce((a, x) => a + (w[x.variant] || 0), 0);
  let acc = 0;
  for (const x of list) { acc += total > 0 ? (w[x.variant] || 0) / total : 1 / list.length; if (u < acc) return x; }
  return list[list.length - 1];
}

// hats for an energy band: offbeat 8ths, 8ths, 16ths with skips
function hats(r, N, b, beats) {
  const off = beats.map(x => x + 2).filter(x => x < N);
  if (b === 0) return r.chance(0.5) ? off : [];
  if (b === 1) return r.chance(0.5) ? off : Array.from({ length: N / 2 }, (_, i) => 2 * i).filter(x => x < N);
  const all = Array.from({ length: N }, (_, i) => i), skip = new Set(Array.from({ length: r.int(1, 4) }, () => r.pick(all.filter(x => x % 4 === 1 || x % 4 === 3))));
  return all.filter(x => !skip.has(x));
}

// opts: { style, meter, energy, avoidKicks (kick rows as step strings the four-floor draw leaves out) } → { idea: { beat: { bd, cp, sd, hh, oh, rd, grid } }, why, stats }
export function groove(r, { style = {}, meter, energy = 0.5, avoidKicks = null } = {}) {
  const { N, beats } = meterOf(meter), b = band(energy), why = [];
  const fams = (style.families || FAMILIES).filter(f => FAMILIES.includes(f));
  const family = r.pick(fams.length ? fams : FAMILIES);
  // draws of the family's shape first (the same seed keeps them across energies), then the energy's extras
  const back = beats.filter((_, i) => i % 2 === 1), mid = beats[Math.floor(beats.length / 2)], last = N - 1;
  const shape = { a: r.next(), b: r.next(), c: r.next(), rot: r.int(0, 3) };
  const rows = {};
  let kick = null;
  if (family === 'four-floor') {
    // the kick variant first (kick-variety D2): one draw, weights by band, the rows in avoidKicks left out
    kick = pickKick(r.next(), b, meter, avoidKicks);
    rows.bd = kick.steps.slice();
    if (b > 0 || shape.a < 0.5) rows.cp = back.slice();
    rows.hh = hats(r, N, b, beats);
    if (b === 2 && r.chance(0.5)) rows.oh = beats.map(x => x + 2).filter(x => x < N && !rows.hh.includes(x));
    why.push(`four on the floor, ${kick.variant}`);
  } else if (family === 'breakbeat') {
    rows.sd = back.slice();
    const opts = [beats[1] + 2, beats[2] + 2, beats[2] + 3].filter(x => x < N);
    rows.bd = uniq([0, opts[Math.floor(shape.a * opts.length)], ...(b > 0 && shape.b < 0.6 ? [opts[Math.floor(shape.c * opts.length)]] : [])]);
    rows.hh = hats(r, N, Math.max(1, b), beats);
    if (b === 2 && r.chance(0.6)) rows.sd = uniq([...rows.sd, last]);
    if (b > 0 && r.chance(0.4)) rows.oh = [last - 1];
    why.push('breakbeat');
  } else if (family === 'two-step') {
    rows.cp = back.slice();
    const opts = [beats[1] + 3, beats[2] + 2, beats[2] + 3].filter(x => x < N);
    const k = b === 2 ? 2 : 1, pick = r.shuffle(opts).slice(0, k);
    rows.bd = uniq([0, ...pick]);
    rows.hh = hats(r, N, b, beats).filter((x, i) => i % 5 !== 3 || b < 2);
    why.push('two-step');
  } else if (family === 'half-time') {
    rows.sd = [mid];
    rows.bd = uniq([0, ...[mid + 2, mid + 3].filter(x => x < N).slice(shape.a < 0.5 ? 0 : 1, shape.a < 0.5 ? 1 : 2)]);
    rows.hh = b === 0 ? beats.slice() : b === 1 ? beats.map(x => [x, x + 2]).flat().filter(x => x < N) : hats(r, N, 2, beats);
    if (b === 2 && r.chance(0.5)) rows.bd = uniq([...rows.bd, last - 1]);
    why.push('half-time');
  } else {
    // euclidean kick and rim, rotated
    const kick = N % 8 === 0 && shape.a < 0.5 ? euclid(3, 8, shape.rot % 3).map(x => (x * N) / 8) : euclid(N === 16 ? 5 : Math.max(3, Math.round(N / 3)), N, shape.rot);
    rows.bd = uniq(kick.includes(0) ? kick : [0, ...kick.slice(1)]);
    rows.sd = euclid(b === 0 ? 2 : 3, N, (shape.rot + 4) % N).filter(x => !rows.bd.includes(x));
    if (!rows.sd.length) rows.sd = [mid];
    rows.hh = b === 0 ? [] : euclid(b === 1 ? 7 : 11, N, shape.rot);
    why.push(`euclid ${rows.bd.length}/${N}`);
  }
  if (b === 2 && family !== 'four-floor' && r.chance(0.4)) { rows.rd = beats.slice(); why.push('ride'); }
  // a groove always has a row besides the kick: the kick and the beat are two tracks in a song
  if (!Object.entries(rows).some(([k, v]) => k !== 'bd' && v && v.length)) rows.hh = beats.map(x => x + 2).filter(x => x < N);
  const beat = { grid: N };
  for (const [row, list] of Object.entries(rows)) if (list && list.length) beat[row] = uniq(list).filter(x => x >= 0 && x < N).join(',');
  if (b > 0 && rows.hh && rows.hh.length) why.push(`hats ${rows.hh.length}`);
  const hits = Object.entries(beat).filter(([k]) => k !== 'grid').reduce((a, [, v]) => a + v.split(',').length, 0);
  return { idea: { beat }, why, stats: { family, hits, ...(kick ? { kick: kick.variant } : {}) } };
}
