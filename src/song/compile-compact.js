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

// ---------- one line per track ----------
// Literals of a layer: strings and numbers. Those that name the bus, the visual or the sound bank stay as they are.
// (FIXED looks only at a literal that is the first argument; a later one, as in range(160, 640), counts as free)
const LIT = /"[^"]*"|(?<![\w.])-?(?:\d+\.?\d*|\.\d+)(?![\w.])/g;
// time functions too: a patterned slow or late shifts a signal differently from a constant one (the riser's ramp)
const FIXED = /\.(analyze|orbit|bank|mask|velocity|slow|fast|late|early|segment|ply|chop|range)\($/;
function literals(text) {
  const out = [];
  for (const m of text.matchAll(LIT)) out.push({ at: m.index, v: m[0], fixed: FIXED.test(text.slice(Math.max(0, m.index - 12), m.index)) });
  return out;
}
// the layer with every free literal replaced: layers with the same skeleton differ only in values
const skeleton = text => { let o = '', last = 0; for (const l of literals(text)) { o += text.slice(last, l.at) + (l.fixed ? l.v : l.v.startsWith('"') ? '⟨s⟩' : '⟨n⟩'); last = l.at + l.v.length; } return o + text.slice(last); };
// a number per bar → a sequence over the song ("<0.4!14 0.6!34>")
const seqOf = vals => `"${rle(vals)}"`;
// a string per bar → which one plays, by bar, picked from the list: "<0!14 1!34>".pick(["…", "…"]). pick keeps each
// string's own time, so an alternation inside it ("<[a3 …] [g3 …]>", the chords) goes on as in its own line
const pickOf = vals => { const u = [...new Set(vals)]; return `"${rle(vals.map(v => u.indexOf(v)))}".pick([${u.join(', ')}])`; };

// song (a state of a Crescendo build) → compact code. muted: ids of tracks the build keeps silent, written with `_$:`.
// lines: 'joined' (identical lines joined) or 'track' (also lines that differ only in values: numbers become sequences
// over the bars, strings are picked by bar; one line per part of a track)
export function compileCompact(song, { muted = [], lines = 'joined' } = {}) {
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
    if (lines === 'track') mergeValues(groups);
    let n = 0, lastDesc = null;
    for (const g of groups) {
      const it = g.items[0];
      if (it.kind !== 'layer') { out.push(it.text); continue; }
      let text = g.text || it.text, gate = it.gate;
      if (g.items.length > 1) {
        gate = `${ident(track ? track.id : id)}${++n}`;
        out.push(`const ${gate} = "${rle(g.lane)}"`);
        text = text.replace(GATE, `.mask(${gate}).velocity(${gate})`);
      }
      if (it.clip) {
        const names = [...new Set(g.items.map(x => x.clip && x.clip.names).filter(Boolean))].join(' · ');
        const pats = [...new Set(g.items.map(x => x.clip && x.clip.rest).filter(Boolean))];
        if (pats.length > 1) it.clip = { ...it.clip, rest: pats.join(', ') };
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

// groups (in place): those with the same skeleton and lanes that never overlap become one, each differing value a sequence
function mergeValues(groups) {
  for (let i = 0; i < groups.length; i++) {
    const a = groups[i];
    if (!a.lane) continue;
    for (let j = i + 1; j < groups.length; j++) {
      const b = groups[j];
      if (!b.lane || a.lane.some((v, k) => on(v) && on(b.lane[k]))) continue;
      const ta = a.items[0].text, tb = b.items[0].text;
      if (skeleton(ta.replace(GATE, '§')) !== skeleton(tb.replace(GATE, '§'))) continue;
      const la = a.vals || literals(ta).map(l => ({ ...l, per: null })), lb = literals(tb);
      // per-bar values: a's on its bars, b's on its bars
      a.vals = la.map((l, k) => {
        const per = l.per || a.lane.map(() => l.v);
        return { ...l, per: per.map((x, bar) => (on(b.lane[bar]) ? lb[k].v : x)) };
      });
      a.lane = a.lane.map((v, k) => (on(v) ? v : b.lane[k]));
      a.items.push(...b.items);
      groups.splice(j--, 1);
    }
    if (a.vals) {
      const t0 = a.items[0].text;
      let o = '', last = 0;
      for (const l of a.vals) {
        // bars where the layer is silent take the value of the bar before, so the sequence stays short
        const per = l.per.slice(); for (let k = 1; k < per.length; k++) if (!on(a.lane[k])) per[k] = per[k - 1];
        const first = per.findIndex((_, k) => on(a.lane[k])); for (let k = 0; k < first; k++) per[k] = per[first];
        o += t0.slice(last, l.at) + (new Set(per).size === 1 ? per[0] : l.v.startsWith('"') ? pickOf(per) : seqOf(per, false));
        last = l.at + l.v.length;
      }
      a.text = o + t0.slice(last);
    }
  }
}
