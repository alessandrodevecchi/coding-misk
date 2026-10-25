// Long literal lists written as ramps (shape-search D8): a written sweep (a clip's cutoffEnd) compiles to one value per
// bar, rotated to the clip's start (`.lpf("<773.91 795.65 … 752.17>")`). In a Live coder growth such a list can span
// hundreds of bars, and its typing makes the growth wait. A list of RAMP_MIN or more plain numbers (repeats `!n`
// expanded) that moves linearly per bar is written as a stepped ramp with signals instead:
//   saw.range(a, b).slow(n).segment(1)            (and .early(k) when the ramp starts inside the list)
// `segment(1)` samples the signal once per bar at its start, so every bar keeps one value, the list's up to its rounding
// to 0.01. Lists of the levels the hidden mixer owns and lists that are not linear stay as written. Pure: the app and
// the Node checks write the same code.

export const RAMP_MIN = 16;
// the levels the hidden mixer owns (writer, check:mixer): their lists stay as written
const LEVELS = new Set(['gain', 'postgain', 'velocity', 'mask']);
// the compiler rounds every value to 0.01: a value within this of the line is on it
const TOL = 0.011;
const NUM = /^-?\d+(?:\.\d+)?(?:!\d+)?$/;
const round = x => String(Math.round(x * 100) / 100);

// the values of a mini-notation list body ("1 2!3 4"), repeats expanded, or null when a token is not a plain number
export function listValues(body) {
  const toks = body.trim().split(/\s+/).filter(Boolean), out = [];
  for (const t of toks) {
    if (!NUM.test(t)) return null;
    const [v, k] = t.split('!');
    for (let i = 0; i < (k ? +k : 1); i++) out.push(+v);
  }
  return out;
}

// a list that moves linearly per bar after a rotation → { a, step, n, start } (bar `start` of the list holds `a`), else null
export function linearRamp(v) {
  const n = v.length;
  if (n < 3) return null;
  const diffs = v.map((x, i) => x - v[(i - 1 + n) % n]);
  const inner = diffs.slice(1).slice().sort((p, q) => p - q), med = inner[Math.floor(inner.length / 2)];
  const starts = new Set([0]);
  diffs.forEach((d, i) => { if (Math.abs(d - med) > 2 * TOL) starts.add(i); });
  if (starts.size > 3) return null;
  for (const s of starts) {
    const a = v[s], last = v[(s + n - 1) % n], step = (last - a) / (n - 1);
    if (!step) continue;
    let ok = true;
    for (let i = 0; i < n && ok; i++) ok = Math.abs(v[(s + i) % n] - (a + step * i)) <= TOL;
    if (ok) return { a, step, n, start: s };
  }
  return null;
}

// the ramp of a list: value at bar c = list[c mod n] = a + step · ((c − start) mod n)
export function rampText({ a, step, n, start }) {
  const k = (n - start) % n;
  return `saw.range(${round(a)}, ${round(a + step * n)}).slow(${n}).segment(1)${k ? `.early(${k})` : ''}`;
}

// code → the code with every long linear list argument written as a ramp
export function rampLists(code, { min = RAMP_MIN } = {}) {
  if (!code || code.indexOf('"<') < 0) return code;
  return code.replace(/([A-Za-z_]\w*)\(\s*"<([^"<>]*)>"/g, (all, fn, body) => {
    if (LEVELS.has(fn)) return all;
    const v = listValues(body);
    if (!v || v.length < min) return all;
    const r = linearRamp(v);
    return r ? `${fn}(${rampText(r)}` : all;
  });
}
