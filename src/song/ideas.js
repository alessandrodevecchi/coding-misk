// Ideas (idea-model, #70): a part stored as a small musical idea, the way a live coder writes it, and the writer that
// turns it into the shortest exact Strudel code. Pure: the app, the compiler, Crescendo and the Node checks use it.
//
// An idea is an object with some of these fields (docs/SONG-FORMAT.md):
//   rhythm  a cell with its repetition ("[~ x x x]*4"); per "beat": one cell per beat, repeated for the beats of each bar
//   beat    sequencer steps on a grid ({ steps: "0,4,11", grid: 16 }; drums: one list per row, { bd: "0,4,11", grid: 16 })
//   degrees scale degrees ("<0 2 4 ~>") with scale (a mode; the key comes from the section)
//   chords  chord names ("<Am7 F^7>") with voicing ({ anchor, mode }); index: positions inside the voiced chord
//   random  a seeded random source ({ fn: "irand", max: 8, seg: 16, seed: 3, cycles: 2 }) for indices, slices, values
//   from    a shared progression of the song, with add / sub (degrees for degrees, semitones for notes)
//   variants prepared variants, one chain function each ([{ add: "0 0 4 0 5" }]), commented out until a step uses one
// Presets are ideas too (src/music.js): `per: "slot"` fills the note slots of each bar with the tokens in turn (16ths;
// 8ths for hooks and slow arpeggios), `per: "beat"` repeats a cell per beat, `hold` holds the chord for the bar.
//
// The writer keeps every event: a shorter form is used only when Strudel makes the same events from it (same onsets,
// lengths and values; drum samples may get longer steps, since a sample plays to its end).
import { CHORDS } from '../music.js';

// ---------- mini-notation: the part we read and write ----------
// top-level tokens: "a [b c] <d e> f(3,8)" → ["a", "[b c]", "<d e>", "f(3,8)"]
export function topTokens(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of String(s).trim()) {
    if ('[<('.includes(ch)) depth++;
    if (']>)'.includes(ch)) depth--;
    if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
// true when a character appears at the top level of a form (outside brackets)
const topHas = (s, chars) => { let depth = 0; for (const ch of s) { if ('[<('.includes(ch)) depth++; else if (']>)'.includes(ch)) depth--; else if (!depth && chars.includes(ch)) return true; } return false; };
// one bracket group or alternation spanning the whole text: "[a b]", "<a b>"
const wholeGroup = s => { if (!/^[[<]/.test(s)) return false; let depth = 0; for (let i = 0; i < s.length; i++) { if ('[<'.includes(s[i])) depth++; else if (']>'.includes(s[i])) { depth--; if (!depth && i < s.length - 1) return false; } } return true; };
const atom = s => /^[^\s[\]<>*!@,()]+$/.test(s);
// a form that can take "!n" or "*n" without brackets
const plainTerm = s => atom(s) || wholeGroup(s);
// a form that is one step of a sequence (no top-level space or "!")
const oneStep = s => topTokens(s).length === 1 && !topHas(s, '!');
const isRest = t => t === '~' || t === '-';

// smallest period of a list
export function period(list) {
  for (let p = 1; p <= list.length; p++) {
    if (list.length % p) continue;
    if (list.every((x, i) => x === list[i % p])) return p;
  }
  return list.length;
}
// runs of the same token as "a!4", when that saves at least 3 characters ("x x x" stays: it reads better than "x!3")
function plainForm(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length;) {
    let j = i; while (j < tokens.length && tokens[j] === tokens[i]) j++;
    const t = tokens[i], k = j - i, run = `${plainTerm(t) ? t : `[${t}]`}!${k}`;
    if (k > 1 && run.length + 3 <= k * t.length + k - 1) out.push(run);
    else for (let q = 0; q < k; q++) out.push(t);
    i = j;
  }
  return out.join(' ');
}
const shortest = list => list.reduce((a, b) => (b.length < a.length ? b : a));
const seqMemo = new Map();
// The shortest exact form of a sequence of equal steps (each token one step): a repeated cell ("[~ x x x]*4"), runs
// ("~!2 x"), or groups of steps with repeated groups ("[0 12]!6 [-2 10]!2"). Every form makes the same events.
export function seqForm(tokens) {
  const key = tokens.join('\u0001');
  if (seqMemo.has(key)) return seqMemo.get(key);
  const n = tokens.length;
  let out;
  if (!n || tokens.every(isRest)) out = '~';
  else {
    const cands = [];
    // (not with an alternation inside: under *n it would count its own cycles faster)
    const p = tokens.some(x => /[<?|]/.test(x)) ? n : period(tokens);
    if (p < n) {
      const cell = p === 1 ? tokens[0] : seqForm(tokens.slice(0, p));
      cands.push(`${plainTerm(cell) ? cell : `[${cell}]`}*${n / p}`);
    }
    cands.push(plainForm(tokens));
    for (let g = 2; g < n; g++) {
      if (n % g) continue;
      const groups = [];
      for (let i = 0; i < n; i += g) {
        const ch = tokens.slice(i, i + g), f = ch.every(isRest) ? '~' : seqForm(ch);
        groups.push(oneStep(f) ? f : `[${f}]`);
      }
      cands.push(plainForm(groups));
    }
    out = shortest(cands);
  }
  if (seqMemo.size > 5000) seqMemo.clear();
  seqMemo.set(key, out);
  return out;
}
// an alternation of one item per bar: "<a1 f1 c2 g1>", "<a1!2 g1!2>", or the item alone when every bar is the same
export function altForm(items, { unwrap = true } = {}) {
  const p = period(items), list = items.slice(0, p);
  if (p === 1) {
    const it = list[0];
    return unwrap && /^\[/.test(it) && wholeGroup(it) && !topHas(it.slice(1, -1), ',') ? it.slice(1, -1) : it;
  }
  return `<${plainForm(list.map(x => (oneStep(x) ? x : `[${x}]`)))}>`;
}
// one item of an alternation from a sequence of equal steps: "[a3 c4 e4 a4]*4" or "a1"
export const stepItem = tokens => { const f = seqForm(tokens); return oneStep(f) ? f : `[${f}]`; };

// A small reader of the mini-notation we write: sequences, [ ], < >, "," stacks, *n, !n, @w, ~ and (k,n,r).
// events(text, cycle) → [{ b, e, v }] in that cycle (b, e from 0 to 1). Throws on what it does not know (?, /, |).
export function parseMini(str) {
  const s = String(str); let i = 0;
  const num = () => { const m = s.slice(i).match(/^-?\d+(\.\d+)?/); if (!m) throw new Error(`a number at ${i} in "${s}"`); i += m[0].length; return +m[0]; };
  const word = () => { const m = s.slice(i).match(/^[^\s[\]<>{}%*!@,()/?|:]+(?::[^\s[\]<>{}%*!@,()/?|]+)?/); if (!m) throw new Error(`unexpected "${s[i]}" in "${s}"`); i += m[0].length; return m[0]; };
  function seq(close) {
    const layers = [[]];
    for (;;) {
      while (s[i] === ' ' || s[i] === '\n' || s[i] === '\t') i++;
      if (i >= s.length) { if (close) throw new Error(`missing ${close} in "${s}"`); break; }
      const c = s[i];
      if (c === close) { i++; break; }
      if (c === ',') { i++; layers.push([]); continue; }
      let node;
      if (c === '[') { i++; node = seq(']'); }
      else if (c === '<') { i++; node = { ...seq('>'), alt: true }; }
      // polymeter (material-generator): "{0 2 4 2 1}%16" plays one item per step, 16 steps per cycle
      else if (c === '{') { i++; node = { ...seq('}'), poly: true }; if (s[i] === '%') { i++; node.steps = num(); } }
      else { const w = word(); node = isRest(w) ? { rest: true } : { v: w }; }
      let weight = 1, reps = 1;
      for (;;) {
        if (s[i] === '*') { i++; node = { fast: num(), node }; }
        else if (s[i] === '@') { i++; weight = num(); }
        else if (s[i] === '!') { i++; reps += /\d/.test(s[i] || '') ? num() - 1 : 1; }
        else if (s[i] === '(') { i++; const k = num(); i++; const n = num(); let r = 0; if (s[i] === ',') { i++; r = num(); } if (s[i] !== ')') throw new Error(`euclid in "${s}"`); i++; node = { euclid: [k, n, r], node }; }
        else if (s[i] === '?' || s[i] === '/' || s[i] === '|' || s[i] === ':') throw new Error(`"${s[i]}" is not read here`);
        else break;
      }
      for (let k = 0; k < reps; k++) layers[layers.length - 1].push({ node, weight });
    }
    return { layers };
  }
  return seq(null);
}
// the euclidean rhythm (Bjorklund, as Strudel computes it)
function bjorklund(k, n) {
  const split = (a, i) => [a.slice(0, i), a.slice(i)];
  const zip = (a, b) => a.map((x, i) => x.concat(b[i]));
  const go = ([ons, offs], [xs, ys]) => {
    if (Math.min(ons, offs) <= 1) return [xs, ys];
    if (ons > offs) { const [a, b] = split(xs, offs); return go([offs, ons - offs], [zip(a, ys), b]); }
    const [a, b] = split(ys, ons); return go([ons, offs - ons], [zip(xs, a), b]);
  };
  const [xs, ys] = go([k, n - k], [Array.from({ length: k }, () => [true]), Array.from({ length: n - k }, () => [false])]);
  return [...xs.flat(), ...ys.flat()];
}
function evNode(node, cycle, b, e, out) {
  if (node.rest) return;
  if (node.v !== undefined) { out.push({ b, e, v: node.v }); return; }
  if (node.fast) { const k = node.fast; if (!Number.isInteger(k)) throw new Error('a whole *n only'); for (let j = 0; j < k; j++) evNode(node.node, cycle * k + j, b + (j * (e - b)) / k, b + ((j + 1) * (e - b)) / k, out); return; }
  if (node.poly) {
    const items = node.layers[0] || [], steps = node.steps || items.length;
    if (!items.length) return;
    for (let k = 0; k < steps; k++) { const at = cycle * steps + k, it = items[((at % items.length) + items.length) % items.length]; evNode(it.node, Math.floor(at / items.length), b + (k * (e - b)) / steps, b + ((k + 1) * (e - b)) / steps, out); }
    return;
  }
  if (node.euclid) { const [k, n, r] = node.euclid, hits = bjorklund(k, n), rot = hits.map((_, j) => hits[(j + r) % n]); rot.forEach((h, j) => { if (h) evNode(node.node, cycle, b + (j * (e - b)) / n, b + ((j + 1) * (e - b)) / n, out); }); return; }
  for (const layer of node.layers) {
    if (!layer.length) continue;
    if (node.alt) {
      // one step per cycle; a step inside counts its own cycles (Strudel's slowcat)
      const n = layer.reduce((a, x) => a + x.weight, 0), idx = ((cycle % n) + n) % n;
      let acc = 0;
      for (const st of layer) { if (idx < acc + st.weight) { evNode(st.node, Math.floor(cycle / n), b, e, out); break; } acc += st.weight; }
      continue;
    }
    const total = layer.reduce((a, x) => a + x.weight, 0);
    let pos = 0;
    for (const st of layer) { const sb = b + ((e - b) * pos) / total; pos += st.weight; evNode(st.node, cycle, sb, b + ((e - b) * pos) / total, out); }
  }
}
export function miniEvents(str, cycle = 0) { const out = []; evNode(parseMini(str), cycle, 0, 1, out); return out; }
const EPS = 1e-9;
// the steps of one cycle on a grid of n: "x..x" (an onset rounded to the nearest step), or null when unreadable
export function miniSteps(str, n, cycle = 0) {
  try {
    const out = Array(n).fill('.');
    for (const ev of miniEvents(str, cycle)) { const k = Math.round(ev.b * n + 1e-6); if (k < n) out[k] = 'x'; }
    return out.join('');
  } catch (e) { return null; }
}
// a cycle as n equal steps (each event exactly one step long, no two on a step), or null
export function flatTokens(str, n, cycle = 0) {
  let evs;
  try { evs = miniEvents(str, cycle); } catch (e) { return null; }
  const out = Array(n).fill('~');
  for (const ev of evs) {
    const k = ev.b * n, len = (ev.e - ev.b) * n;
    if (Math.abs(k - Math.round(k)) > EPS || Math.abs(len - 1) > EPS || out[Math.round(k)] !== '~') return null;
    out[Math.round(k)] = ev.v;
  }
  return out;
}

// ---------- the forms of the written material ----------
// cell per beat → one bar of n 16ths: "[~ x x x]*4", or the template with weights for a half beat (7/8)
export function beatForm(cell, half, n) {
  const full = Math.floor(n / 4), rest = n % 4;
  if (rest) return [...Array(full).fill(`${cell}@4`), `${half}@${rest}`].join(' ');
  const rep = full > 1 ? `${plainTerm(cell) ? cell : `[${cell}]`}*${full}` : cell;
  const flat = flatTokens(rep, n);
  const alt = flat ? seqForm(flat) : null;
  return alt && alt.length < rep.length ? alt : rep;
}
// 16th tokens written for 4/4 → n tokens, from the start again
export const slotTokens = (str, n) => { const t = topTokens(str); return Array.from({ length: n }, (_, i) => t[i % t.length]); };
// a drum row: the shortest of the cell with the same hits on the same steps, the coarsest grid that holds every hit
// (a sample plays to its end, so a longer step sounds the same; not with functions that move or cut steps) and the
// sequencer steps beat("0,4,11", 16); the cell wins a tie
export function drumRow(id, steps, { coarse = true } = {}) {
  const n = steps.length, hits = [...steps].map((c, i) => (c === 'x' ? i : -1)).filter(i => i >= 0);
  const tokens = [...steps].map(c => (c === 'x' ? id : '~'));
  const cands = [`s("${seqForm(tokens)}")`];
  if (coarse) for (let g = 1; g < n; g++) {
    if (n % g || hits.some(i => i % (n / g))) continue;
    cands.push(`s("${seqForm(Array.from({ length: g }, (_, k) => tokens[(k * n) / g]))}")`);
    break;
  }
  const best = shortest(cands), beat = `s("${id}").beat("${hits.join(',')}",${n})`;
  return hits.length && beat.length < best.length ? beat : best;
}
// functions that move, cut or repeat steps: a drum row keeps its own step length under them
export const STEP_FUNCTIONS = /\.(ply|rev|jux|degradeBy|chop|striate|segment|iter|palindrome|chunk|hurry|fast|slow)\(/;

// ---------- note material moved from idiom.js (idiomatic-code) ----------
// note name → MIDI number ("a3" → 57), or null
export const midi = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); if (!m) return null; return { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; };
const cellForm = (tokens, reps) => (tokens.length === 1 ? (reps > 1 ? `${tokens[0]}*${reps}` : tokens[0]) : reps > 1 ? `[${tokens.join(' ')}]*${reps}` : tokens.join(' '));
// the progression on top: when every group of an alternation is the same line moved to another root, the line is
// written once as steps from its root and the roots as an alternation added on top: "[0 ~ 0 12]".add("<55!2 57 53>")
export function progressionForm(mini) {
  const m = mini.match(/^<(.*)>$/s);
  if (!m) return null;
  const groups = m[1].trim().split(/\s+(?![^[]*\])/);
  if (groups.length < 2 || !groups.every(g => /^\[[^[\],<>]*\]$/.test(g))) return null;
  let shape = null;
  const roots = [];
  for (const g of groups) {
    const t = g.slice(1, -1).trim().split(/\s+/), notes = t.map(x => (x === '~' ? null : midi(x)));
    if (t.some((x, i) => x !== '~' && notes[i] === null)) return null;
    const root = notes.find(x => x !== null);
    if (root === undefined) return null;
    const offs = notes.map(x => (x === null ? '~' : String(x - root))).join(' ');
    if (shape !== null && shape !== offs) return null;
    shape = offs; roots.push(String(root));
  }
  const t = shape.split(' '), p = period(t), rs = [];
  for (const r of roots) { const last = rs[rs.length - 1]; if (last && last.r === r) last.n++; else rs.push({ r, n: 1 }); }
  return { steps: cellForm(t.slice(0, p), t.length / p), roots: `<${rs.map(x => (x.n > 1 ? `${x.r}!${x.n}` : x.r)).join(' ')}>` };
}
// the arpeggio with .arp() (arp-patterns): when every chord of an alternation plays its notes in the same order, the
// chords are written once (their notes from low to high) and the order once: "<[a3,c4,e4] [f3,a3,c4]>", "[0 1 2 1]*4".
// null when the groups play different orders, or a group plays one note only
export function arpForm(mini) {
  const m = mini.match(/^<(.*)>$/s);
  if (!m) return null;
  const groups = m[1].trim().split(/\s+(?![^[]*\])/);
  if (groups.length < 1 || !groups.every(g => /^\[[^[\],<>]*\]$/.test(g))) return null;
  let order = null;
  const chords = [];
  for (const g of groups) {
    const t = g.slice(1, -1).trim().split(/\s+/);
    if (t.some(x => x !== '~' && midi(x) === null)) return null;
    const names = new Map();
    for (const x of t) if (x !== '~' && !names.has(midi(x))) names.set(midi(x), x);
    const up = [...names.keys()].sort((a, b) => a - b);
    if (up.length < 2) return null;
    const o = t.map(x => (x === '~' ? '~' : String(up.indexOf(midi(x))))).join(' ');
    if (order !== null && order !== o) return null;
    order = o; chords.push(`[${up.map(n => names.get(n)).join(',')}]`);
  }
  const t = order.split(' '), p = period(t), cs = [];
  for (const c of chords) { const last = cs[cs.length - 1]; if (last && last.c === c) last.n++; else cs.push({ c, n: 1 }); }
  return { chords: `<${cs.map(x => (x.n > 1 ? `${x.c}!${x.n}` : x.c)).join(' ')}>`, order: cellForm(t.slice(0, p), t.length / p) };
}
// note groups per bar ("<[a1 ~ a1 a1 …] […]>", one group of equal steps per bar) → the shortest exact note head:
// the groups as cells, or the progression on top
export function noteHead(fn, groups) {
  const own = `${fn}("${altForm(groups.map(stepItem))}")`;
  const pr = groups.length > 1 ? progressionForm(`<${groups.map(g => `[${g.join(' ')}]`).join(' ')}>`) : null;
  const prog = pr ? `${fn}("${pr.steps}".add("${pr.roots}"))` : null;
  return prog && prog.length < own.length ? prog : own;
}

// ---------- the ideas ----------
// kinds of idea per track type (the validator, the writer and Compose read it)
export const IDEA_KINDS = {
  drums: ['beat'],
  bass: ['rhythm', 'per', 'half', 'beat', 'degrees', 'scale', 'from', 'add', 'sub', 'variants'],
  guitar: ['rhythm', 'per', 'half', 'beat', 'chords', 'voicing', 'add', 'hold', 'variants'],
  arp: ['rhythm', 'per', 'half', 'index', 'chords', 'voicing', 'random', 'from', 'add', 'sub', 'hold', 'variants'],
  hook: ['rhythm', 'per', 'half', 'degrees', 'scale', 'from', 'add', 'sub', 'random', 'variants'],
  pad: ['rhythm', 'per', 'half', 'beat', 'chords', 'voicing', 'from', 'add', 'hold', 'variants'],
  texture: ['rhythm', 'random', 'variants'],
};
export const IDEA_TYPES = Object.keys(IDEA_KINDS);
// functions a prepared variant can use: degrees (numbers) take add and sub; notes take transpose
export const VARIANT_FNS = ['add', 'sub', 'transpose', 'ply', 'rev', 'fast', 'slow', 'degradeBy', 'mask', 'struct', 'lpf', 'hpf', 'vowel', 'crush', 'pan', 'room', 'delay'];
// random sources: indices (arp), sample slices (texture), values (these functions)
export const RANDOM_FNS = ['irand', 'rand', 'perlin'];
export const RANDOM_VALUES = ['lpf', 'hpf', 'pan', 'delay', 'room', 'gain'];
// names the compiler uses: a shared progression cannot take them
export const RESERVED = new Set(['SECTIONS', 'TEMPO', 'setcpm', 'setcps', 'samples', 'note', 'n', 's', 'sound', 'chord', 'stack', 'silence', 'sine', 'saw', 'rand', 'irand', 'perlin', 'all', 'register', 'mini', 'miskMix', 'miskBuses', 'miskVoices', 'miskFns',
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'await', 'async', 'of', 'undefined', 'NaN', 'Infinity', 'arguments', 'eval']);
export const isSharedName = name => typeof name === 'string' && /^[a-zA-Z][a-zA-Z0-9]*$/.test(name) && !RESERVED.has(name) && !/^(section|clip)\d+$/.test(name);
// a shared progression is chord names when it starts with a letter (after "<" or "["), degrees otherwise
export const sharedIsChords = text => /^[<[\s]*[A-G]/.test(String(text));

// chord names of our table → Strudel's chord symbols (voicing): Fmaj7 → F^7
export const chordSymbol = c => String(c).replace(/maj7$/, '^7');
const keyRoot = key => String(key || 'A');
const plainNum = v => (typeof v === 'number' ? String(v) : `"${v}"`);
// the random source as code: irand(8).seg(16).rib(3, 2)
export function randomCode(r) {
  const base = r.fn === 'irand' ? `irand(${r.max ?? 8})` : r.fn || 'rand';
  const range = Array.isArray(r.range) ? `.range(${r.range[0]}, ${r.range[1]})` : '';
  return `${base}${range}${r.seg ? `.seg(${r.seg})` : ''}${r.seed !== undefined ? `.rib(${r.seed}, ${r.cycles ?? 1})` : ''}`;
}
// a progression of one item per bar, rotated so that the clip starts on its first item: shared names with .late(start)
const lateBy = (expr, start, text) => {
  if (!start) return expr;
  const m = String(text || '').match(/^<(.*)>$/s);
  if (!m) return /[<{]/.test(String(text || '')) ? `${expr}.late(${start})` : expr;
  let len = 0;
  for (const tk of topTokens(m[1])) { const r = tk.match(/!(\d+)$/); len += r ? +r[1] : tk.endsWith('!') ? 2 : 1; }
  return start % len ? `${expr}.late(${start})` : expr;
};
// the rhythm of an idea for one bar of n 16ths, as a struct argument
function rhythmCode(idea, n) {
  const r = idea.rhythm;
  if (idea.per === 'beat') return beatForm(r, idea.half ?? halfOf(r), n);
  if (idea.per === 'slot') return seqForm(slotTokens(r, n));
  return r;
}
// the first half of a cell per beat ("[~ x x x]" → "[~ x]"), for a half beat in 7/8
function halfOf(cell) {
  const f = flatTokens(cell, 4);
  if (!f) return cell;
  return seqForm(f.slice(0, 2).map(x => (isRest(x) ? '~' : 'x')));
}
// the steps a struct argument plays in one bar: "x..x"
const structSteps = (code, n) => miniSteps(code, n) || 'x' + '.'.repeat(n - 1);

// The code of an idea for one clip. ctx: { type, N (16ths per bar), chords (names of the bars from the clip start,
// in A), tr (key transposition), key, start (bar of the clip), sw (swing), ch (the channel state: settings), shared
// ({ name: text }), variant (index switched on, or null), steps (a mask, from thinning), coarse (drum steps may grow) }
// → { lines: [first line without its label, …], tail: code before the rack (random values) }
export function writeIdea(idea, ctx) {
  const t = ctx.type, N = ctx.N, tr = ctx.tr || 0, ch = ctx.ch || {}, shared = ctx.shared || {};
  if (t === 'drums') return { rows: drumRows(idea, ctx), lines: [], tail: '' };
  const trs = n => (n ? `.transpose(${n})` : '');
  const from = idea.from !== undefined ? shared[idea.from] : undefined;
  const chordsText = idea.chords ?? (from !== undefined && sharedIsChords(from) ? from : undefined);
  const degText = idea.degrees ?? (from !== undefined && !sharedIsChords(from) ? from : undefined);
  const vars = (idea.variants || []).map(v => { const [fn, arg] = Object.entries(v)[0]; return `.${fn}(${plainNum(arg)})`; });
  const on = Number.isInteger(ctx.variant) && vars[ctx.variant] ? ctx.variant : -1;
  const active = on >= 0 ? vars[on] : '', inactive = vars.filter((_, i) => i !== on), note = inactive.length ? ` // ${inactive.join(' ')}` : '';
  const mask = ctx.steps ? `.mask("${seqForm([...ctx.steps].map(c => (c === 'x' ? '1' : '~')))}")` : '';
  const rhythm = idea.rhythm !== undefined ? `.struct("${rhythmCode(idea, N)}")` : idea.beat ? `.beat("${idea.beat.steps}",${idea.beat.grid ?? N})` : '';
  const addSub = (expr, numeric) => {
    let out = expr;
    // a summed progression (material-generator) starts on its first item at the clip start, like the chords
    if (idea.add !== undefined && !(idea.per === 'slot' && typeof idea.add === 'string')) out += numeric ? `.add(${typeof idea.add === 'string' ? lateBy(`"${idea.add}"`, ctx.start, idea.add) : plainNum(idea.add)})` : '';
    if (idea.sub !== undefined) out += numeric ? `.sub(${plainNum(idea.sub)})` : '';
    return out;
  };
  // semitones on notes: a number joins the key transposition; a riff line per slot follows the rhythm
  const noteShift = typeof idea.add === 'number' ? idea.add : 0, noteSub = typeof idea.sub === 'number' ? idea.sub : 0;
  const riff = idea.per === 'slot' && typeof idea.add === 'string' ? `.transpose("${seqForm(slotTokens(idea.add, N).map(x => (isRest(x) ? '0' : x)))}")` : idea.per !== 'slot' && typeof idea.add === 'string' && degText === undefined ? `.transpose("${idea.add}")` : '';
  const tail = idea.random && RANDOM_VALUES.includes(idea.random.on) ? `.${idea.random.on}(${randomCode(idea.random)})` : '';
  const out = (pre, post = '') => {
    if (!vars.length) return { lines: [`${pre}${post}${ctx.sw || ''}`], tail };
    if (post) return { lines: [`${pre}${active}${note}`, `  ${post}${ctx.sw || ''}`], tail };
    return { lines: [`${pre}${ctx.sw || ''}${active}${note}`], tail };
  };

  // scale degrees (hook, bass, a lead): n("…").scale("A4:minor"); with variants the degrees come first, then .n()
  if (degText !== undefined && t !== 'arp') {
    const src = idea.from !== undefined ? lateBy(idea.from, ctx.start, from) : idea.degrees !== undefined && idea.per === 'slot' ? `"${slotDegrees(idea.degrees, N, ctx.start)}"` : `"${idea.degrees}"`;
    const expr = addSub(idea.from === undefined && idea.per !== 'slot' ? lateBy(src, ctx.start, idea.degrees) : src, true);
    const oct = t === 'hook' ? ch.octave || 4 : 4, mode = idea.scale || (t === 'hook' ? ch.mode : null) || 'minor';
    const harm = t === 'hook' && ch.harmony ? `.superimpose(x => x.add(${ch.harmony}))` : '';
    const scale = `${harm}.scale("${keyRoot(ctx.key)}${oct}:${mode}")${rhythm}${mask}`;
    if (vars.length) return out(expr, `.n()${scale}`);
    return out(`n(${expr})`, scale);
  }
  // chord names with a voicing: chord("<Am7 F^7>").voicing(), n(index) for positions inside the voiced chord
  if (chordsText !== undefined || idea.voicing) {
    const names = chordsText !== undefined ? (idea.from !== undefined ? lateBy(idea.from, ctx.start, from) : `"${lateText(chordsText, ctx.start)}"`) : `"${altForm(ctx.chords.map(chordSymbol))}"`;
    const v = idea.voicing || {};
    const voice = `${v.anchor ? `.anchor("${v.anchor}")` : ''}${v.mode ? `.mode("${v.mode}")` : ''}.voicing()`;
    const index = idea.random && !RANDOM_VALUES.includes(idea.random.on) ? randomCode(idea.random) : idea.index !== undefined ? `"${idea.per === 'slot' ? seqForm(slotTokens(idea.index, arpCount(ctx))) : idea.index}"` : null;
    const head = index && !idea.hold ? `n(${index}).chord(${names})` : `chord(${names})`;
    const shift = tr + noteShift - noteSub;
    return out(`${head}${voice}${trs(shift)}${riff}${rhythm}${mask}`);
  }
  // material on the chords of the section
  const shift = tr + noteShift - noteSub;
  if (t === 'arp') {
    const stacks = altForm(ctx.chords.map(c => `[${CHORDS[c].arp.join(',')}]`), { unwrap: false });
    const index = idea.random && !RANDOM_VALUES.includes(idea.random.on) ? randomCode(idea.random) : idea.index !== undefined ? `"${idea.per === 'slot' ? seqForm(slotTokens(idea.index, arpCount(ctx))) : idea.index}"` : null;
    return out(`note("${stacks}")${trs(shift)}${index && !idea.hold ? `.arp(${index})` : ''}${rhythm}${mask}`);
  }
  if (t === 'texture') {
    const pat = idea.rhythm ? String(idea.rhythm).replace(/\b[xX]\b/g, ch.sample || 'numbers') : ch.sample || 'numbers';
    const nArg = idea.random && !RANDOM_VALUES.includes(idea.random.on) ? randomCode(idea.random) : idea.n !== undefined ? (/^irand/.test(idea.n) ? idea.n : `"${idea.n}"`) : null;
    return out(`s("${pat}")${nArg ? `.n(${nArg})` : ''}${mask}`);
  }
  // bass on the roots; pad and guitar on their chord stacks (ctx.voice: the stack of a chord)
  const items = t === 'bass' ? ctx.chords.map(c => CHORDS[c].bass) : ctx.chords.map(c => `[${ctx.voice ? ctx.voice(c) : CHORDS[c].pad}]`);
  const head = `note("${altForm(items, { unwrap: false })}")`;
  return out(`${head}${trs(shift)}${idea.hold ? '' : rhythm}${riff}${mask}`);
}
// note slots of an arpeggio in one bar
const arpCount = ctx => (ctx.ch && ctx.ch.speed === '8' ? ctx.N / 2 : ctx.N);
// degrees per slot (hook presets): each item of the alternation fills the 8ths of a bar, rotated to the clip start
function slotDegrees(text, N, start) {
  const items = altItems(text) || [text];
  const per = Math.max(1, Math.round(N / 2));
  const rot = items.map((_, j) => items[((j - (start || 0)) % items.length + items.length) % items.length]);
  return altForm(rot.map(it => stepItem(slotTokens(it.replace(/^\[(.*)\]$/, '$1'), per))));
}
// "<a [b c] d>" → ["a", "[b c]", "d"]
export const altItems = s => { const m = String(s).trim().match(/^<(.*)>$/s); return m ? topTokens(m[1]) : null; };
// an alternation written in place, rotated so the clip starts on its first item
function lateText(text, start) {
  const items = altItems(text);
  if (!items || !start || items.some(x => /!|@/.test(x))) return text;
  return `<${items.map((_, j) => items[((j - start) % items.length + items.length) % items.length]).join(' ')}>`;
}
// drum rows of an idea: { row: steps } on the bar's grid (a step k of a grid g is the 16th k·N/g)
export function ideaRows(idea, N) {
  const beat = idea.beat || {}, grid = beat.grid ?? N, rows = {};
  for (const [row, list] of Object.entries(beat)) {
    if (row === 'grid' || row === 'steps') continue;
    const out = Array(N).fill('.');
    for (const k of String(list).split(',').map(x => +x.trim()).filter(Number.isFinite)) { const at = (k * N) / grid; if (Number.isInteger(at) && at < N) out[at] = 'x'; }
    rows[row] = out.join('');
  }
  return rows;
}
function drumRows(idea, ctx) { return ideaRows(idea, ctx.N); }

// The written form an idea plays in one bar: { steps } (onsets, "x..x"), { rows } for drums. Crescendo thins it, the
// step row of Compose shows it, channelSteps reads it.
export function expandIdea(idea, ctx) {
  const N = ctx.N;
  if (ctx.type === 'drums') return { rows: ideaRows(idea, N) };
  if (idea.hold) return { steps: 'x' + '.'.repeat(N - 1) };
  if (idea.rhythm !== undefined && ctx.type !== 'texture') return { steps: structSteps(rhythmCode(idea, N), N) };
  if (idea.beat) return { steps: ideaRows({ beat: { r: idea.beat.steps, grid: idea.beat.grid } }, N).r };
  if (ctx.type === 'arp' && idea.index !== undefined) {
    const count = arpCount(ctx), text = idea.per === 'slot' ? seqForm(slotTokens(idea.index, count)) : idea.index;
    return { steps: structSteps(text, N) };
  }
  if (ctx.type === 'arp' && idea.random) return { steps: structSteps(`x*${idea.random.seg || 1}`, N) };
  const deg = idea.degrees ?? (idea.from !== undefined ? (ctx.shared || {})[idea.from] : undefined);
  if (deg !== undefined) {
    const text = idea.per === 'slot' ? slotDegrees(deg, N, 0) : deg;
    return { steps: structSteps(text, N) };
  }
  if (ctx.type === 'texture' && idea.rhythm) return { steps: structSteps(String(idea.rhythm).replace(/\b[xX]\b/g, 'x'), N) };
  return { steps: 'x' + '.'.repeat(N - 1) };
}

// ---------- growing an idea (Live coder) ----------
// strength of a 16th inside a beat: the beat, the 8th after it, the other 16ths
const inBeat = i => (i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1);
// a cell per beat with only its strongest onsets: "[~ x x x]" → "[~ x]"
function strongest(cell) {
  const f = flatTokens(cell, 4);
  if (!f) return 'x';
  const hits = f.map((x, i) => (isRest(x) ? 0 : inBeat(i)));
  const top = Math.max(...hits);
  if (!top) return '~';
  const keep = f.map((x, i) => (hits[i] === top ? 'x' : '~'));
  return keep[2] === 'x' && keep[0] !== 'x' && keep[1] !== 'x' && keep[3] !== 'x' ? '[~ x]' : keep[0] === 'x' && keep.slice(1).every(isRest) ? 'x' : seqForm(keep);
}
// forms of an idea from the written one to the simplest: [closest to the written, …, simplest] (n of them, or fewer
// when the idea has fewer forms). Only forms that differ from the written one and from each other.
export function ideaLadder(idea, ctx, n) {
  const forms = [];
  const push = f => { const k = JSON.stringify(f); if (k !== JSON.stringify(idea) && !forms.some(x => JSON.stringify(x) === k)) forms.push(f); };
  const { variants, ...rest } = idea;
  const base = variants ? { ...rest, variants } : rest;
  if (ctx.type === 'drums' && idea.beat) {
    // the first step, then the steps on beats, then all of them
    const beat = idea.beat, grid = beat.grid ?? ctx.N, onBeat = grid / (ctx.N / 4 || 4);
    const pick = f => { const out = { grid }; for (const [row, list] of Object.entries(beat)) { if (row === 'grid') continue; const ks = String(list).split(',').map(x => +x.trim()).filter(f); if (ks.length) out[row] = ks.join(','); } return out; };
    push({ ...base, beat: pick(k => Number.isInteger(k / onBeat)) });
    const first = Object.entries(beat).find(([r]) => r !== 'grid');
    if (first) push({ ...base, beat: { grid, [first[0]]: String(first[1]).split(',')[0].trim() } });
  } else if ((ctx.type === 'arp') && (idea.index !== undefined || idea.random)) {
    // the chord held, then root and fifth, then as written
    if (idea.index !== undefined) {
      const slots = idea.per === 'slot' ? arpCount(ctx) : (topTokens(String(idea.index).replace(/\*(\d+)/g, '')).length || 2);
      push({ ...base, index: idea.per === 'slot' ? '0 2' : `[0 2]*${Math.max(1, Math.round(slots / 2))}`, per: idea.per });
    }
    push({ ...base, index: undefined, random: undefined, hold: true });
  } else if (idea.random && idea.random.seg > 1) {
    push({ ...base, random: { ...idea.random, seg: Math.max(1, idea.random.seg / 2) } });
  } else if (idea.from !== undefined && (idea.add !== undefined || idea.sub !== undefined) && idea.rhythm === undefined) {
    push({ ...base, add: undefined, sub: undefined });
  } else if (idea.degrees !== undefined && idea.rhythm === undefined) {
    // the first degree held, then the first bar of the alternation, then as written
    const items = altItems(idea.degrees);
    if (items && items.length > 1) push({ ...base, degrees: items[0].replace(/^\[(.*)\]$/, '$1') });
    const first = topTokens(String(idea.degrees).replace(/[<>[\]]/g, ' ')).find(x => !isRest(x) && /^-?\d+$/.test(x));
    if (first !== undefined) push({ ...base, degrees: first, per: undefined });
  } else if (idea.rhythm !== undefined && !idea.hold) {
    // one hit per beat, then the strongest onsets of the cell, then the cell (a riff: its rhythm on the root first);
    // only forms with fewer notes than the written one (a long note per bar stays as it is)
    const hits = f => (expandIdea(f, { ...ctx, type: ctx.type === 'drums' ? 'bass' : ctx.type }).steps.match(/x/g) || []).length, own = hits(idea);
    const fewer = f => { if (hits(f) < own) push(f); };
    if (typeof idea.add === 'string' && idea.per === 'slot') push({ ...base, add: undefined });
    if (idea.per === 'beat') fewer({ ...base, rhythm: strongest(idea.rhythm), half: idea.half !== undefined ? strongest(idea.half) : undefined });
    else {
      const m = String(idea.rhythm).match(/^(.*)\*(\d+)$/);
      if (m && idea.per !== 'slot') fewer({ ...base, rhythm: `${strongest(m[1])}*${m[2]}` });
    }
    fewer({ ...base, rhythm: 'x', per: 'beat', half: 'x', add: typeof idea.add === 'string' ? undefined : idea.add });
  }
  const clean = forms.map(f => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)));
  return clean.slice(0, n);
}

// ---------- validation ----------
// "0 ~ [2 4]*2 <0 -1>" → numbers that are not whole ("0.5"), or null
const nonWhole = text => {
  const plain = String(text).replace(/@[\d.]+/g, '').replace(/[*!/]\d+/g, '').replace(/\(\d+,\d+(,\d+)?\)/g, '');
  return (plain.match(/-?\d+\.\d+/g) || [])[0] || null;
};
const ROOT = /^[A-G][#b]?/;
let symbols = null;
// chord qualities Strudel's default voicings know (ireal), with their aliases (m for -, M for ^, aug for +)
export function setChordSymbols(list) { symbols = new Set(list); }
const QUALITIES = ['', '2', '5', '6', '7', '9', '11', '13', '69', 'add9', '+', 'o', 'h', 'sus', '^', '-', '^7', '-7', '7sus', 'h7', 'o7', '^9', '^13', '^7#11', '^9#11', '^7#5', '-6', '-69', '-^7', '-^9', '-9', '-add9', '-11', '-7b5', 'h9', '-b6', '-#5', '7b9', '7#9', '7#11', '7b5', '7#5', '9#11', '9b5', '9#5', '7b13', '7#9#5', '7#9b5', '7#9#11', '7b9#11', '7b9b5', '7b9#5', '7b9#9', '7b9b13', '7alt', '13#11', '13b9', '13#9', '7b9sus', '7susadd3', '9sus', '13sus', '7b13sus'];
const knownQuality = q => (symbols || new Set(QUALITIES.flatMap(x => [x, x.replace('-', 'm'), x.replace('^', 'M'), x.replace('+', 'aug')]))).has(q);
export const SCALES = ['minor', 'major', 'phrygian', 'dorian', 'mixolydian', 'locrian', 'lydian', 'ionian', 'aeolian', 'chromatic', 'harmonic minor', 'melodic minor', 'minor pentatonic', 'major pentatonic', 'blues', 'whole tone'];
// chord names of a mini-notation text that Strudel cannot voice: ["Fmaj7"]
export function unknownChords(text) {
  const bad = [];
  for (const w of String(text).replace(/[<>[\],]/g, ' ').replace(/[*!@]\d+(\.\d+)?/g, ' ').split(/\s+/).filter(Boolean)) {
    if (isRest(w)) continue;
    const m = w.match(ROOT);
    if (!m || !knownQuality(w.slice(m[0].length))) bad.push(w);
  }
  return bad;
}
// Checks one idea: err/warn take (path, message). opts: { shared (the song's map), meters: steps per bar of the
// sections the pattern plays in }
export function checkIdea(type, idea, p, err, warn, opts = {}) {
  if (!idea || typeof idea !== 'object' || Array.isArray(idea)) { err(p, 'an idea is an object, for example { "rhythm": "[~ x x x]*4" }'); return; }
  const kinds = IDEA_KINDS[type];
  if (!kinds) { err(p, `ideas are for ${IDEA_TYPES.join(', ')} tracks`); return; }
  const keys = Object.keys(idea);
  if (!keys.length) err(p, `an empty idea; kinds for ${type}: ${kinds.join(', ')}`);
  for (const k of keys) if (!kinds.includes(k)) err(`${p}.${k}`, `unknown idea kind for ${type}; kinds: ${kinds.join(', ')}`);
  const str = (k, path = `${p}.${k}`) => { if (idea[k] !== undefined && (typeof idea[k] !== 'string' || !idea[k].trim())) { err(path, 'a mini-notation string'); return false; } return idea[k] !== undefined; };
  const reads = (k, text) => { try { parseMini(text); return true; } catch (e) { err(`${p}.${k}`, `cannot read "${text}": ${e.message}`); return false; } };
  if (str('rhythm') && reads('rhythm', idea.rhythm) && !/[xX]/.test(idea.rhythm)) err(`${p}.rhythm`, 'a rhythm plays "x" where a note starts and "~" where it rests, for example "[~ x x x]*4"');
  if (idea.per !== undefined && !['bar', 'beat', 'slot'].includes(idea.per)) err(`${p}.per`, '"bar" (the rhythm is one bar, the default), "beat" (a cell repeated for each beat) or "slot"');
  if (idea.half !== undefined) str('half');
  if (idea.hold !== undefined && typeof idea.hold !== 'boolean') err(`${p}.hold`, 'true holds the chord for the bar');
  for (const k of ['degrees', 'index']) if (str(k) && reads(k, idea[k])) {
    const bad = nonWhole(idea[k]) || (String(idea[k]).match(/[^\s\d~\-[\]<>{}%*!@,.()]/) || [])[0];
    if (bad) err(`${p}.${k}`, `${k === 'index' ? 'indices' : 'degrees'} are whole numbers and rests, for example "0 ~ 2 <4 5>" (found "${bad}")`);
  }
  if (idea.scale !== undefined && !SCALES.includes(idea.scale)) err(`${p}.scale`, `a scale or mode: ${SCALES.join(', ')}`);
  if (str('chords') && reads('chords', idea.chords)) { const bad = unknownChords(idea.chords); if (bad.length) err(`${p}.chords`, `chord names Strudel cannot voice: ${bad.join(', ')} (for example Am7, F^7, G7, Dm, C; "maj7" is written ^7)`); }
  if (idea.voicing !== undefined) {
    const v = idea.voicing;
    if (!v || typeof v !== 'object' || Array.isArray(v)) err(`${p}.voicing`, 'an object: { "anchor": "c5", "mode": "below" } (both optional)');
    else {
      if (v.anchor !== undefined && !/^[a-gA-G][#b]?\d$/.test(v.anchor)) err(`${p}.voicing.anchor`, 'a note, for example "c5"');
      if (v.mode !== undefined && !['below', 'above', 'duck', 'root'].includes(v.mode)) err(`${p}.voicing.mode`, 'one of below, above, duck, root');
      for (const k of Object.keys(v)) if (!['anchor', 'mode'].includes(k)) err(`${p}.voicing.${k}`, 'anchor or mode');
    }
  }
  if (idea.beat !== undefined) {
    const b = idea.beat;
    if (!b || typeof b !== 'object' || Array.isArray(b)) err(`${p}.beat`, type === 'drums' ? 'one list of steps per row and the grid: { "bd": "0,4,11", "grid": 16 }' : 'steps and the grid: { "steps": "0,4,11", "grid": 16 }');
    else {
      const grid = b.grid ?? 16;
      if (!Number.isInteger(grid) || grid < 1 || grid > 64) err(`${p}.beat.grid`, 'a whole number of steps per bar, for example 16');
      for (const [k, list] of Object.entries(b)) {
        if (k === 'grid') continue;
        if (type === 'drums' ? !['bd', 'cp', 'sd', 'hh', 'oh', 'rd'].includes(k) : k !== 'steps') { err(`${p}.beat.${k}`, type === 'drums' ? 'a drum row: bd, cp, sd, hh, oh, rd' : '"steps" and "grid"'); continue; }
        const ks = String(list).split(',').map(x => x.trim());
        if (typeof list !== 'string' || ks.some(x => !/^\d+$/.test(x))) { err(`${p}.beat.${k}`, 'step positions from 0, separated by commas, for example "0,4,11"'); continue; }
        const out = ks.filter(x => +x >= grid);
        if (out.length) err(`${p}.beat.${k}`, `step ${out.join(', ')} is outside the ${grid}-step grid (steps go from 0 to ${grid - 1})`);
      }
      for (const n of opts.meters || []) if (Number.isInteger(grid) && n % grid !== 0) err(`${p}.beat.grid`, `a ${grid}-step grid does not fit a bar of ${n} 16ths; use ${n} or a grid that divides it`);
    }
  }
  if (idea.random !== undefined) {
    const r = idea.random;
    if (!r || typeof r !== 'object' || Array.isArray(r)) err(`${p}.random`, 'a seeded source: { "fn": "irand", "max": 8, "seg": 16, "seed": 3, "cycles": 2 }');
    else {
      if (!RANDOM_FNS.includes(r.fn)) err(`${p}.random.fn`, `one of ${RANDOM_FNS.join(', ')}`);
      if (!Number.isInteger(r.seed) || r.seed < 0) err(`${p}.random.seed`, 'a seed is required (a whole number from 0): the same song plays the same notes every time');
      if (!Number.isInteger(r.cycles) || r.cycles < 1) err(`${p}.random.cycles`, 'the loop length in bars is required (a whole number from 1)');
      if (r.seg !== undefined && (!Number.isInteger(r.seg) || r.seg < 1)) err(`${p}.random.seg`, 'steps per bar, a whole number');
      if (r.fn === 'irand' && (!Number.isInteger(r.max) || r.max < 1)) err(`${p}.random.max`, 'the number of values, a whole number (irand(8) gives 0 to 7)');
      if (r.range !== undefined && (!Array.isArray(r.range) || r.range.length !== 2 || !r.range.every(x => typeof x === 'number'))) err(`${p}.random.range`, 'two numbers, for example [400, 2000]');
      // randomness only chooses among values that fit: indices inside a chord, sample slices, values of a function
      const target = r.on ?? (type === 'arp' ? 'index' : type === 'texture' ? 'slice' : null);
      const okOn = target === 'index' ? type === 'arp' : target === 'slice' ? type === 'texture' : RANDOM_VALUES.includes(target);
      if (!okOn) err(`${p}.random`, `random only chooses indices inside a chord (arp), sample slices (texture) or values (on: ${RANDOM_VALUES.join(', ')}); free melody notes are written by hand`);
      if (r.on === 'index' && type === 'arp' && r.fn === 'irand' && Number.isInteger(r.max) && r.max > 8) warn(`${p}.random.max`, 'indices above the notes of a chord go up an octave');
    }
  }
  if (idea.from !== undefined) {
    const sh = opts.shared || {};
    if (typeof idea.from !== 'string' || sh[idea.from] === undefined) err(`${p}.from`, `unknown shared progression ${JSON.stringify(idea.from)}; shared: ${Object.keys(sh).join(', ') || 'none (declare them in "shared")'}`);
  }
  for (const k of ['add', 'sub']) {
    const v = idea[k];
    if (v === undefined) continue;
    if (typeof v === 'number') { if (!Number.isInteger(v)) err(`${p}.${k}`, 'a whole number of degrees or semitones'); }
    else if (typeof v !== 'string' || !v.trim()) err(`${p}.${k}`, 'a whole number or a mini-notation string, for example 12 or "<0 12>"');
    else if (reads(k, v) && nonWhole(v)) err(`${p}.${k}`, 'whole numbers of degrees or semitones');
  }
  if (idea.sub !== undefined && typeof idea.sub === 'string' && idea.degrees === undefined && idea.from === undefined) err(`${p}.sub`, 'a pattern for sub works on degrees only; for notes write add with negative numbers');
  if (type === 'hook' && idea.degrees === undefined && idea.from === undefined) err(p, 'a hook idea needs degrees (or a shared progression with "from")');
  if (idea.variants !== undefined) {
    if (!Array.isArray(idea.variants)) err(`${p}.variants`, 'a list of prepared variants, for example [{ "add": "0 0 4 0 5" }]');
    else idea.variants.forEach((v, i) => {
      const q = `${p}.variants[${i}]`, e = v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v) : [];
      if (e.length !== 1) { err(q, 'one chain function and its argument, for example { "add": "0 0 4 0 5" }'); return; }
      const [fn, arg] = e[0];
      if (!VARIANT_FNS.includes(fn)) err(q, `a variant uses one of ${VARIANT_FNS.join(', ')}`);
      else if (['add', 'sub'].includes(fn) && idea.degrees === undefined && !(idea.from !== undefined && !sharedIsChords((opts.shared || {})[idea.from])) && type !== 'arp') err(q, `${fn} works on degrees; on notes use transpose`);
      if (typeof arg !== 'number' && (typeof arg !== 'string' || !arg.trim())) err(q, 'the argument is a number or a mini-notation string');
    });
  }
}
// the shared map of a song: { name: progression }
export function checkShared(shared, err) {
  if (shared === undefined) return;
  if (!shared || typeof shared !== 'object' || Array.isArray(shared)) { err('shared', 'an object of named progressions, for example { "bline": "<[3 5@15] 7>" }'); return; }
  for (const [name, text] of Object.entries(shared)) {
    const p = `shared.${name}`;
    if (!isSharedName(name)) err(p, 'a name of letters and digits that starts with a letter and is not a JavaScript word or a name of the compiler (SECTIONS, TEMPO, section1, clip1…)');
    if (typeof text !== 'string' || !text.trim()) { err(p, 'a progression: scale degrees ("<0 2 4>") or chord names ("<Am7 F^7>")'); continue; }
    try { parseMini(text); } catch (e) { err(p, `cannot read "${text}": ${e.message}`); continue; }
    if (sharedIsChords(text)) { const bad = unknownChords(text); if (bad.length) err(p, `chord names Strudel cannot voice: ${bad.join(', ')}`); }
    else if (nonWhole(text) || /[^\s\d~\-[\]<>*!@,.()]/.test(text)) err(p, 'degrees are whole numbers and rests');
  }
}
