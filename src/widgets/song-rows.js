// The hit grid's rows from the whole song (code-over-visual cd1): the sounds and variants of the drum lines and the
// melodic instruments that play somewhere in the song, read from the code of its segments (the code evaluated, one
// segment per live build step, or the whole song). A row exists from the first bar, empty until its sound enters, so the
// grid keeps its size. The same list serves the editor, "Code over" on the stage and both videos, whose notes come from
// different places (haps, the render page's stage notes). Pure: checked in Node (tools/check-code-over.mjs) against the
// haps of Strudel.
//
// → [{ inst, p, n }]: one note per distinct sound ({ inst: the line's `analyze` name, p: the sample's name or 60 for a
// melodic note, n: the sample's variant }), the shape hitgridData reads
import { DRUM_INSTS } from './hitgrid.js';
import { lanesOf, playsAt } from '../live/widgets.js';
import { instrumentOfLine } from '../video/widget-frames.js';

const PATTERN = /^\s*[_S]?\$:/, MUTED = /^\s*_\$:/;
// the pattern lines of a code (a line with the lines of its chain after it) and where each begins
function chains(code) {
  const out = []; let pos = 0;
  for (const l of String(code || '').split('\n')) {
    if (out.length && /^\s+(\.|\/\/ \.)/.test(l) && !/^\s*\/\//.test(out[out.length - 1].text.split('\n')[0])) out[out.length - 1].text += `\n${l}`;
    else out.push({ text: l, a: pos });
    pos += l.length + 1;
  }
  return out.filter(c => PATTERN.test(c.text));
}
// the sample names of a mini-notation string, with their variants: "bd*4 [~ sd:2]" → [['bd'], ['sd', 2]]
export function soundsIn(mini) {
  const s = String(mini || '').replace(/\([^()]*\)/g, ' ').replace(/[*\/!@%]\s*(?:<[^>]*>|\[[^\]]*\]|[\d.]+)/g, ' ').replace(/\?/g, ' ');
  return [...s.matchAll(/(?<![\w.])([A-Za-z_]\w*)(?::(\d+))?/g)].map(m => (m[2] === undefined ? [m[1]] : [m[1], +m[2]]));
}
// the first string argument of a call (`.s("bd*4")`) of a line
const first = (text, fn) => { const m = text.match(new RegExp(`\\.?\\b${fn}\\(\\s*(["'\`])((?:(?!\\1)[^\\\\]|\\\\.)*)\\1`)); return m ? m[2] : null; };
// the variants a line's `.n("…")` gives its sample
const variantsIn = text => { const v = first(text, 'n'); return v === null ? [] : [...v.matchAll(/(?<![\w.])(\d+)(?![\w.])/g)].map(m => +m[1]); };

// segments: [{ from, to (bars), code, run? }]
export function songNotesOfSegments(segments) {
  const seen = new Map();
  const add = x => { const k = `${x.inst}|${typeof x.p === 'string' ? x.p : ''}|${x.n ?? ''}`; if (!seen.has(k)) seen.set(k, x); };
  for (const seg of segments || []) {
    const text = seg.run || seg.code || '', lanes = lanesOf(text), run = seg.run || null;
    const b0 = Math.floor(seg.from || 0), b1 = Math.max(b0 + 1, Math.ceil(seg.to ?? 1));
    for (const c of chains(text)) {
      if (MUTED.test(c.text)) continue;
      const inst = instrumentOfLine(c.text, c.a, run);
      if (!inst) continue;
      let plays = false;
      for (let b = b0; b < b1 && !plays; b++) plays = playsAt(c.text, lanes, b);
      if (!plays) continue;
      if (!DRUM_INSTS.has(inst)) { add({ inst, p: 60 }); continue; }
      const mini = first(c.text, 's') ?? first(c.text, 'sound');
      if (mini === null) continue;
      const vars = variantsIn(c.text);
      for (const [name, n] of soundsIn(mini)) {
        if (n !== undefined) add({ inst, p: name, n });
        else if (vars.length) for (const v of vars) add({ inst, p: name, n: v });
        else add({ inst, p: name });
      }
    }
  }
  return [...seen.values()];
}
