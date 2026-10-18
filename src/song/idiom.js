// The idiomatic generator (idiomatic-code): the same code with shorter patterns, as a live coder writes them.
// Drums: a row of 16 steps becomes the shortest form with the same hits (bd*4, [~ hh]*4, [~ cp]*2…).
// Notes: a 16-step group becomes a repeated cell ([a3 ~ a3 a3]*4) and repeated groups of an alternation get `!`
// (<[x] [x] [y]> → <[x]!2 [y]>); note lengths never change, so envelopes sound the same.
// Pure text in, text out: a pattern it does not recognise stays as it is.
// (idea-model: the compiler now writes these forms itself, src/song/ideas.js; idiomatic() stays for code it did not
// write, hand code and code of older versions, and leaves the writer's code as it is)
import { chainLines } from './typing.js';
import { progressionForm, arpForm } from './ideas.js';
export { progressionForm, arpForm };

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
// a whole code text: drum sounds in s("…") followed by .bank (drum machines), notes in note("…"); the arpeggio (a line
// with .analyze("arp")) with .arp()
export function idiomatic(code) {
  const lines = chainLines(code).map(l => (/\.analyze\("arp"\)/.test(l) ? l.replace(/(\bnote\(")([^"]*)("\))/, (all, a, mini, b) => { const ar = arpForm(mini); return ar ? `${a}${ar.chords}${b}.arp("${ar.order}")` : all; }) : l));
  return lines.join('\n')
    .replace(/(\bs\(")([^"]*)("\)\.bank\()/g, (all, a, mini, b) => a + drumForm(mini) + b)
    .replace(/(\bnote\(")([^"]*)("\))(?!\.arp\()/g, (all, a, mini, b) => { const pr = progressionForm(mini); return pr ? `${a}${pr.steps}".add("${pr.roots}"))` : a + noteForm(mini) + b; });
}
