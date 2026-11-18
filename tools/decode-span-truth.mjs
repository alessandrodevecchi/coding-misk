// A decoded file against a truth written by hand from the original's code, span by span (decode round 11): which
// parts play in each span of the file and on which grid (`beat`, the kick's events; `16th`, every sixteenth; a held
// part as notes per bar only, its alignment unknown). The truth is a JSON file (spans in seconds of the audio file; the
// grid's phase, measured from the file's own attacks). Per decoded part (Strudel in Node, tools/decode-hits.mjs) against
// each true part: precision and recall of the attacks within 40 ms, and per span the parts written and their hits per
// bar. The owner's files and their truths stay under the git-ignored notes/.
// Usage: node --no-warnings tools/decode-span-truth.mjs <truth.json> <model json> [--src dir] [--rules '{json}']
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { partOnsets, HIT_RULE } from './decode-hits.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const truth = JSON.parse(fs.readFileSync(args[0], 'utf8')), cached = JSON.parse(fs.readFileSync(args[1], 'utf8')), m = cached.m || cached;
const W = await import(path.join(path.resolve(opt('--src') || ROOT), 'src', 'decode', 'writer.js'));
if (opt('--rules')) for (const [k, v] of Object.entries(JSON.parse(opt('--rules')))) Object.assign(W[k], v);
const song = W.writeFull(m, { id: 'x', title: 'x' }); delete song.config;
const { onsets } = await partOnsets(song), barSec = 240 / truth.bpm, P = barSec / 4, end = Math.max(...truth.spans.map(s => s.to));
const code = Object.fromEntries(Object.entries(onsets).map(([k, v]) => [k, v.map(t => t + m.downbeat).filter(t => t < end)]));
// the true attacks of a part
const grid = (phase, step, a, z) => { const out = []; for (let t = phase + Math.ceil((a - phase) / step) * step; t < z - 1e-9; t += step) out.push(t); return out; };
const T = {};
for (const s of truth.spans) for (const [part, kind] of Object.entries(s.parts)) {
  if (kind === 'beat') (T[part] ||= []).push(...grid(truth.beat, P, s.from, s.to));
  else if (kind === '16th') (T[part] ||= []).push(...grid(truth.grid16, P / 4, s.from, s.to));
}
const match = (c, t) => { let tp = 0; const used = new Uint8Array(t.length); for (const x of c) { const j = t.findIndex((y, k) => !used[k] && Math.abs(y - x) <= HIT_RULE.match); if (j >= 0) { used[j] = 1; tp++; } } return tp; };
const r3 = x => (x === null ? null : Math.round(x * 1000) / 1000);
const rows = [];
for (const [cp, c] of Object.entries(code)) {
  if (!c.length) continue;
  for (const [tp, t] of Object.entries(T)) { const n = match(c, t); rows.push({ code: cp, truth: tp, codeHits: c.length, truthHits: t.length, precision: r3(n / c.length), recall: r3(n / t.length) }); }
}
// per span: the parts written, their hits per bar, and the truth's
const spans = truth.spans.map(s => {
  const bars = (s.to - s.from) / barSec, written = {};
  for (const [cp, c] of Object.entries(code)) { const n = c.filter(t => t >= s.from && t < s.to).length; if (n) written[cp] = r3(n / bars); }
  const tr = Object.fromEntries(Object.entries(s.parts).map(([p, k]) => [p, k === 'beat' ? 4 : k === '16th' ? 16 : k]));
  return { from: s.from, to: s.to, truthPerBar: tr, codePerBar: written };
});
const chords = song.tracks.find(t => t.id === 'chords');
console.log(JSON.stringify({ downbeat: m.downbeat, bpm: m.bpm, rows, spans, chords: chords ? chords.clips.map(c => `${chords.patterns[c.pattern].code.split('.voicing')[0]}@${c.start}+${c.bars}`) : [] }, null, 1));
