// The idiomatic generator (idiomatic-code): the same code with shorter patterns, as a live coder writes them.
// Drums: a row of 16 steps becomes the shortest form with the same hits (bd*4, [~ hh]*4, [~ cp]*2…).
// Notes: a 16-step group becomes a repeated cell ([a3 ~ a3 a3]*4) and repeated groups of an alternation get `!`
// (<[x] [x] [y]> → <[x]!2 [y]>); note lengths never change, so envelopes sound the same.
// Pure text in, text out: a pattern it does not recognise stays as it is.
import { chainLines } from './typing.js';

// "[bd ~ ~ ~] [bd ~ ~ ~] ~ [bd ~ ~ ~]" → 16 tokens, or null
function steps16(mini) {
  const groups = mini.trim().split(/\s+(?![^[]*\])/);
  if (groups.length !== 4) return null;
  const out = [];
  for (const g of groups) {
    if (g === '~') { out.push('~', '~', '~', '~'); continue; }
    const m = g.match(/^\[([^[\]]+)\]$/);
    if (!m) return null;
    const t = m[1].trim().split(/\s+/);
    if (t.length !== 4) return null;
    out.push(...t);
  }
  return out;
}
// the smallest period of a token list and its cell
function period(tokens) {
  for (let p = 1; p <= tokens.length; p++) {
    if (tokens.length % p) continue;
    if (tokens.every((x, i) => x === tokens[i % p])) return p;
  }
  return tokens.length;
}
const cellForm = (tokens, reps) => (tokens.length === 1 ? (reps > 1 ? `${tokens[0]}*${reps}` : tokens[0]) : reps > 1 ? `[${tokens.join(' ')}]*${reps}` : tokens.join(' '));
// drums: coarsest grid that holds every hit, then the smallest repeating cell (sample lengths do not follow the step)
export function drumForm(mini) {
  const t = steps16(mini);
  if (!t || t.every(x => x === '~')) return mini;
  let grid = 16;
  while (grid > 1 && t.some((x, i) => x !== '~' && i % grid)) grid /= 2;
  const coarse = t.filter((_, i) => i % grid === 0), p = period(coarse);
  return cellForm(coarse.slice(0, p), coarse.length / p);
}
// notes: one group of 16 tokens → its repeating cell, same step length
function noteGroup(inner) {
  const t = inner.trim().split(/\s+/);
  if (t.length < 4 || t.some(x => /[[\]<>]/.test(x))) return `[${inner}]`;
  const p = period(t);
  return p === t.length ? `[${inner}]` : `[${cellForm(t.slice(0, p), t.length / p)}]`;
}
export function noteForm(mini) {
  const m = mini.match(/^<(.*)>$/s);
  if (!m) return mini;
  const groups = m[1].trim().split(/\s+(?![^[]*\])/);
  if (!groups.every(g => /^\[[^[\]]*\]$/.test(g))) return mini;
  const short = groups.map(g => noteGroup(g.slice(1, -1)));
  // repeated neighbours: [x]!2
  const out = [];
  for (const g of short) { const last = out[out.length - 1]; if (last && last.g === g) last.n++; else out.push({ g, n: 1 }); }
  return `<${out.map(x => (x.n > 1 ? `${x.g}!${x.n}` : x.g)).join(' ')}>`;
}
// note name → MIDI number ("a3" → 57), or null
const midi = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); if (!m) return null; return { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; };
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
// a whole code text: drum sounds in s("…") followed by .bank (drum machines), notes in note("…"); the arpeggio (a line
// with .analyze("arp")) with .arp()
export function idiomatic(code) {
  const lines = chainLines(code).map(l => (/\.analyze\("arp"\)/.test(l) ? l.replace(/(\bnote\(")([^"]*)("\))/, (all, a, mini, b) => { const ar = arpForm(mini); return ar ? `${a}${ar.chords}${b}.arp("${ar.order}")` : all; }) : l));
  return lines.join('\n')
    .replace(/(\bs\(")([^"]*)("\)\.bank\()/g, (all, a, mini, b) => a + drumForm(mini) + b)
    .replace(/(\bnote\(")([^"]*)("\))(?!\.arp\()/g, (all, a, mini, b) => { const pr = progressionForm(mini); return pr ? `${a}${pr.steps}".add("${pr.roots}"))` : a + noteForm(mini) + b; });
}
