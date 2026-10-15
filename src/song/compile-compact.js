// Compact code for Crescendo songs (#64, change crescendo-code). The standard compiler writes one group of lines per
// clip and section; this one starts from its output and joins, inside each track, the layers whose code is the same
// apart from their lane, under one lane that is the union of theirs. Layers only join when their lanes never sound on
// the same bar, so the compact code plays exactly what the standard code plays. Tracks the live build keeps silent
// are written with Strudel's `_$:` (muted, code kept), so the listener sees what is coming.
import { compileSong } from './compile.js';
import { rle } from '../music.js';
import { t } from '../i18n.js';

const LANE = /^const (\w+) = "(<[^"]*>)"/;
const GATE = /\.mask\((\w+)\)\.velocity\(\1\)/;
// "<1!8 0!24>" → [1, 1, …, 0, …] as strings
export function unrle(s) {
  const out = [];
  for (const tok of s.replace(/^<|>$/g, '').trim().split(/\s+/)) { const m = tok.match(/^(.*?)(?:!(\d+))?$/); for (let k = 0; k < (m[2] ? +m[2] : 1); k++) out.push(m[1]); }
  return out;
}
const on = v => Number(v) > 0;
const RANGES = /^\/\/ (.*) · \D*?((?:\d+-\d+(?:, )?)+) · (.*)$/;

// standard code → { head: lines before the first track, lanes: { name: [values] }, blocks: [{ header, id, items }] }
// items: [{ kind: 'layer', text, gate, names, ranges, rest, desc } | { kind: 'line', text }]
export function parseCode(code) {
  const lines = code.split('\n'), head = [], lanes = {}, blocks = [];
  let block = null, clip = null, desc = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], lane = l.match(LANE);
    if (lane) lanes[lane[1]] = unrle(lane[2]);
    if (l.startsWith('// ==========')) { block = { header: l, items: [] }; blocks.push(block); clip = null; desc = null; continue; }
    if (!block) { head.push(l); continue; }
    if (/^_?\$:/.test(l)) {
      let text = l;
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]) && !/^_?\$:/.test(lines[i + 1])) text += '\n' + lines[++i];
      const g = text.match(GATE);
      block.items.push({ kind: 'layer', text, gate: g ? g[1] : null, clip, desc });
      continue;
    }
    const m = l.match(RANGES);
    if (m) { clip = { names: m[1], ranges: m[2], rest: m[3] }; desc = null; continue; }
    if (l.startsWith('//') && clip) { desc = l; continue; }
    if (l.startsWith('const ')) { block.items.push({ kind: 'line', text: l }); continue; }
    if (l.trim()) block.items.push({ kind: 'line', text: l });
  }
  return { head, lanes, blocks };
}
// every layer with its lane: [{ key (code without its lane), lane: [values] }], for the equivalence check
export function layersOf(code) {
  const p = parseCode(code), out = [];
  for (const b of p.blocks) for (const it of b.items) if (it.kind === 'layer' && it.gate && p.lanes[it.gate]) out.push({ key: `${b.header}\n${it.text.replace(GATE, '§')}`, lane: p.lanes[it.gate].map(Number), muted: it.text.startsWith('_$:') });
  return out;
}

const ident = id => String(id).replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^\d/, '_$&') || 'track';
// bars where a lane sounds, as "a-b" runs (1-based, inclusive)
const runs = lane => { const out = []; lane.forEach((v, b) => { if (!on(v)) return; const r = out[out.length - 1]; if (r && r[1] === b) r[1] = b + 1; else out.push([b, b + 1]); }); return out; };

// song (a state of a Crescendo build) → compact code. muted: ids of tracks the build keeps silent, written with `_$:`
export function compileCompact(song, { muted = [] } = {}) {
  const shown = new Set(muted.filter(id => (song.tracks || []).some(tr => tr.id === id && tr.mute)));
  const full = { ...song, tracks: song.tracks.map(tr => (shown.has(tr.id) ? { ...tr, mute: false } : tr)) };
  const p = parseCode(compileSong(full)), out = [...p.head];
  for (const b of p.blocks) {
    const id = b.header.replace(/^\/\/ =+ /, '').replace(/ =+$/, '').split(' · ')[0];
    const track = full.tracks.find(tr => (tr.name || tr.id) === id), silent = track && shown.has(track.id);
    out.push('', b.header);
    // groups of layers with the same code and lanes that never overlap
    const groups = [];
    for (const it of b.items) {
      if (it.kind !== 'layer' || !it.gate || !p.lanes[it.gate]) { groups.push({ items: [it] }); continue; }
      const key = it.text.replace(GATE, '§'), lane = p.lanes[it.gate];
      const g = groups.find(x => x.key === key && !x.lane.some((v, k) => on(v) && on(lane[k])));
      if (g) { g.items.push(it); g.lane = g.lane.map((v, k) => (on(v) ? v : lane[k])); }
      else groups.push({ key, lane: lane.slice(), items: [it] });
    }
    let n = 0, lastDesc = null;
    for (const g of groups) {
      const it = g.items[0];
      if (it.kind !== 'layer') { out.push(it.text); continue; }
      let text = it.text, gate = it.gate;
      if (g.items.length > 1) {
        gate = `${ident(track ? track.id : id)}${++n}`;
        out.push(`const ${gate} = "${rle(g.lane)}"`);
        text = text.replace(GATE, `.mask(${gate}).velocity(${gate})`);
      }
      if (it.clip) {
        const names = [...new Set(g.items.map(x => x.clip && x.clip.names).filter(Boolean))].join(' · ');
        const r = g.lane ? runs(g.lane) : [], bars = r.length ? t('cBars', { from: r[0][0] + 1, to: r[0][1] }) + r.slice(1).map(([a, z]) => `, ${a + 1}-${z}`).join('') : it.clip.ranges;
        const comment = `// ${names} · ${bars} · ${it.clip.rest}`;
        if (out[out.length - 1] !== comment) out.push(comment);
      }
      if (it.desc && it.desc !== lastDesc) { out.push(it.desc); lastDesc = it.desc; }
      out.push(silent ? text.replace(/^\$:/, '_$:') : text);
    }
  }
  return out.join('\n');
}
