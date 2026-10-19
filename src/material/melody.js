// Melodies (material-generator D2): a short cell of scale degrees plus a progression summed over the bars, the way
// a live coder writes them. The seed chooses among rules (cell length, shape, progression), never note by note in a
// free range: notes walk by steps and small leaps inside the energy's span, and stay degrees of the mode.
import { band, SPAN, ONSETS, chordsOf, rootDegrees, altOf, meterOf, DARK_MODES, modeSteps, cellText, clamp } from './common.js';

export const MELODY_RULES = ['polymeter', 'tail', 'call-response', 'dark'];
const DEFAULT_RULES = ['polymeter', 'tail', 'call-response'];
// progressions for a harmony that does not move (a drone): the root most of the time, one step away at the end
const STILL = [[0, 0, 0, -2], [0, 0, 4, 3], [0, 0, 0, 2], [0, 0, -1, 0]];
const STILL_CHROMATIC = [[0, 0, 0, 1], [0, 0, 0, -2], [0, 0, 5, 3]];

const nearest = (list, v) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
// degrees for the notes of a cell: steps and leaps up to a fifth, inside [lo, hi]; dark modes lean on 2nd and 6th
export function walk(r, count, { lo, hi, dark }) {
  const stable = [-3, 0, 2, 4, 7].filter(d => d >= lo && d <= hi);
  const out = [];
  let cur = stable.length && r.chance(0.7) ? r.pick(stable) : r.int(lo, hi);
  out.push(cur);
  const moves = [-4, -3, -2, -1, 0, 1, 2, 3, 4], weights = [0.4, 0.8, 2.5, 4, 1.2, 4, 2.5, 0.8, 0.4];
  for (let i = 1; i < count; i++) {
    const cands = [], ws = [];
    moves.forEach((m, j) => {
      const v = cur + m;
      if (v < lo || v > hi) return;
      const d = ((v % 7) + 7) % 7;
      cands.push(v); ws.push(weights[j] * (dark && (d === 1 || d === 5) ? 2.2 : 1));
    });
    cur = cands.length ? r.weighted(cands, ws) : clamp(cur, lo, hi);
    out.push(cur);
  }
  // start and end on a stable degree at least half of the time
  if (count > 1 && stable.length && r.chance(0.6)) out[count - 1] = nearest(stable, out[count - 1]);
  return out;
}
// make the span of a walk at least `min` degrees: the lowest note goes down to lo, the highest up to lo + min
function widen(notes, min, lo, hi) {
  const span = list => Math.max(...list) - Math.min(...list);
  if (notes.length < 2 || span(notes) >= min) return notes;
  const out = notes.slice(), iMin = out.indexOf(Math.min(...out));
  out[iMin] = lo;
  if (span(out) < min) { const iMax = out.indexOf(Math.max(...out)); out[iMax === iMin ? (iMin + 1) % out.length : iMax] = Math.min(hi, lo + min); }
  return out;
}
// onset positions among n slots: the first slot always, strong slots more often (less often with more syncopation,
// sync 0 to 1, radio-variation D3)
function positions(r, n, k, sync = 0) {
  const set = new Set([0]), w = [3 - 2 * sync, 2 - sync, 1 + sync];
  while (set.size < Math.min(k, n)) {
    const free = [...Array(n).keys()].filter(i => !set.has(i));
    set.add(r.weighted(free, free.map(i => (i % 4 === 0 ? w[0] : i % 2 === 0 ? w[1] : w[2]))));
  }
  return [...set].sort((a, b) => a - b);
}
const tokensOf = (n, at, notes) => { const t = Array(n).fill('~'); at.forEach((p, i) => { t[p] = notes[i]; }); return t; };
// degrees of a dark scale in semitones, for the chromatic mode (its degrees are semitones)
const toSemis = d => 12 * Math.floor(d / 7) + modeSteps('phrygian')[((d % 7) + 7) % 7];

// opts: { style (the recipe part's material), harmony { mode, chords }, meter, energy, shape } → { idea, why, stats }
// shape (radio-variation D3): density gives the onsets' band, complexity the span's band and the syncopation, register
// moves the line up or down by up to three degrees
export function melody(r, { style = {}, harmony = {}, meter, energy = 0.5, shape: sh = null } = {}) {
  const { N } = meterOf(meter), b = band(energy), mode = harmony.mode || 'minor', chromatic = mode === 'chromatic';
  const bOn = sh ? band(sh.density) : b, bSpan = sh ? band(sh.complexity) : b, sync = sh ? sh.complexity : 0;
  const off = sh ? Math.round((sh.register - 0.5) * 6) : 0;
  const rules = (style.rules || DEFAULT_RULES).filter(x => MELODY_RULES.includes(x));
  const dark = rules.includes('dark') || DARK_MODES.includes(mode);
  const why = [];
  // draws that do not depend on energy come first: the same seed keeps its progression and variant
  const roots = rootDegrees(chordsOf(harmony), chromatic ? 'chromatic' : mode);
  const still = r.pick(chromatic ? STILL_CHROMATIC : STILL), useStill = r.chance(0.6), variantRoll = r.next(), variantCell = [0, ...Array.from({ length: 4 }, () => r.pick([0, 0, 2, 4, 5, -1, 3]))];
  let prog = null;
  if (new Set(roots).size > 1) { prog = altOf(roots); why.push('progression from the chords'); } else if (useStill) { prog = altOf(still); why.push('progression on a still chord'); }
  // the shape: polymetric line, repeated motif with a changed tail, or call and response
  const half = N / 2;
  const polyGrid = bOn === 0 ? 0 : bOn === 1 ? half : N;
  const polyLens = polyGrid ? [5, 7].filter(p => p < polyGrid && polyGrid % p) : [];
  const w = {
    polymeter: rules.includes('polymeter') && polyLens.length ? 0.2 + 0.8 * energy : 0,
    tail: rules.includes('tail') ? 1 : 0,
    'call-response': rules.includes('call-response') ? 0.8 : 0,
  };
  const shapes = Object.keys(w).filter(k => w[k] > 0);
  const shape = shapes.length ? r.weighted(shapes, shapes.map(k => w[k])) : 'tail';
  const [s0, s1] = SPAN[bSpan], spanWant = r.int(s0, s1), lo = off - r.int(0, Math.floor(spanWant / 2)), hi = lo + spanWant;
  // the chromatic mode writes semitones of a dark scale
  const fix = notes => widen(notes, s0, lo, hi), semis = notes => (chromatic ? notes.map(toSemis) : notes);
  let degrees, onsets;
  if (shape === 'polymeter') {
    const P = r.pick(polyLens), [o0, o1] = ONSETS[bOn];
    const kLo = Math.max(2, Math.ceil((o0 * P) / polyGrid)), kHi = Math.min(P, Math.floor((o1 * P) / polyGrid));
    const k = r.int(Math.min(kLo, kHi), kHi), at = positions(r, P, k, sync);
    const notes = fix(walk(r, k, { lo, hi, dark }));
    degrees = `{${tokensOf(P, at, semis(notes)).join(' ')}}%${polyGrid}`;
    onsets = (polyGrid * k) / P;
    why.unshift(`polymeter ${P}/${polyGrid}`);
  } else {
    const L = bOn === 0 && N % 4 === 0 && r.chance(0.5) ? N / 4 : half;
    const [o0, o1] = ONSETS[bOn], k = r.int(Math.min(o0, L), Math.min(o1, L)), at = positions(r, L, k, sync);
    const A = fix(walk(r, k, { lo, hi, dark }));
    const cell = notes => `[${cellText(tokensOf(L, at, semis(notes)))}]`;
    if (shape === 'tail') {
      // A A A A': the fourth bar changes its last one or two notes
      const A2 = A.slice(), n = Math.min(A.length - 1, r.int(1, 2));
      for (let i = A.length - n; i < A.length; i++) { const d = r.pick([-2, -1, 1, 2]); A2[i] = A2[i] + d >= lo && A2[i] + d <= hi ? A2[i] + d : A2[i] - d; }
      if (A2.join() === A.join()) A2[A2.length - 1] += A2[A2.length - 1] > lo ? -1 : 1;
      degrees = altOf([cell(A), cell(A), cell(A), cell(A2)]);
      why.unshift(`cell ${L}`, "tail A A A A'");
    } else {
      // call and response: the answer keeps the rhythm and ends on the root
      let B = walk(r, k, { lo, hi, dark });
      B[B.length - 1] = 0;
      if (B.join() === A.join()) B = B.map((v, i) => (i < B.length - 1 ? clamp(v + 1, lo, hi) : 0));
      degrees = altOf([cell(A), cell(B)]);
      why.unshift(`cell ${L}`, 'call and response');
    }
    onsets = k;
  }
  if (dark) why.push('dark 2nd and 6th');
  const idea = { degrees };
  if (prog) idea.add = prog;
  if (variantRoll < 0.5) { idea.variants = [{ add: variantCell.join(' ') }]; why.push('variant ready'); }
  return { idea, why, stats: { onsets, span: spanOf(degrees) } };
}
// the span of the degrees written in a text (the cell, without the progression)
export function spanOf(text) {
  const nums = String(text).replace(/[!%*@]\d+/g, '').match(/-?\d+/g) || [];
  return nums.length ? Math.max(...nums.map(Number)) - Math.min(...nums.map(Number)) : 0;
}
