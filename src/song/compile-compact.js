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
// a gated line (guitars, code-lanes): the lane masks it and scales its level after the amp, `n` a number or a sequence
const PGATE = /\.mask\((\w+)\)\.postgain\(\1\.mul\((-?[\d.]+|"<?[\d.! ]+>?")\)\)/;
// "<1!8 0!24>" → [1, 1, …, 0, …] as strings
export function unrle(s) {
  const out = [];
  for (const tok of s.replace(/^<|>$/g, '').trim().split(/\s+/)) { const m = tok.match(/^(.*?)(?:!(\d+))?$/); for (let k = 0; k < (m[2] ? +m[2] : 1); k++) out.push(m[1]); }
  return out;
}
const on = v => Number(v) > 0;
const RANGES = /^\/\/ (.*) · \D*?((?:\d+-\d+(?:, )?)+) · (.*)$/;

// standard code → { head: lines before the first track, lanes: { name: [values] }, blocks: [{ header, id, items }] }
// items: [{ kind: 'layer', text, gate, gateText, mul, clip, desc } | { kind: 'line', text }]; gated (code-lanes): a line
// gated with `.mask(x).postgain(x.mul(n))` has its lane too (mul: n), else it plays in every section
export function parseCode(code, { gated = false } = {}) {
  const lines = code.split('\n'), head = [], lanes = {}, blocks = [];
  let block = null, clip = null, desc = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], lane = l.match(LANE);
    if (lane) lanes[lane[1]] = unrle(lane[2]);
    if (l.startsWith('// ==========')) { block = { header: l, items: [] }; blocks.push(block); clip = null; desc = null; continue; }
    if (!block) { head.push(l); continue; }
    if (/^[_S]?\$:/.test(l)) {
      let text = l;
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]) && !/^[_S]?\$:/.test(lines[i + 1])) text += '\n' + lines[++i];
      const g = text.match(GATE) || (gated ? text.match(PGATE) : null);
      block.items.push({ kind: 'layer', text, gate: g ? g[1] : null, gateText: g ? g[0] : null, mul: g && g[2] !== undefined ? g[2] : null, clip, desc });
      continue;
    }
    const m = l.match(RANGES);
    if (m) { clip = { names: m[1], ranges: m[2], rest: m[3], raw: l }; desc = null; continue; }
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
      out.push(silent ? text.replace(/^[_S]?\$:/, '_$:') : text);
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

// ---------- the code of the moment (code-now) ----------
// Only what plays in the section that holds `bar`: the layers whose lane sounds somewhere in it (a fade from the section
// before included), without their lane when it is 1 on every bar of the section, and the lane constants still used.
// prepare: also the next section's new layers, muted with `_$:` under the current ones (typed before the boundary).
// shownMuted: ids of tracks that played before and are silent now (a break), written with `_$:`.
// inPlace (Live coder): every layer keeps its lane (liftLanes takes the lanes out of the lines afterwards, so a line
// is edited in place at a section change and its lanes play from the hidden mixer); a layer of the section before
// that only sounds in the fade of the first bars, with no line of the same code here, goes to `hidden` (its lane
// written out), so the code shows one line per part.
// gated (code-lanes, the Sections option): lines gated with `.mask(x).postgain(x.mul(n))` follow their lane too;
// bounds: bars inside a section where a clip starts or ends (code-lanes): the code shows only the part of the section
// that holds `bar`, so a track whose clips follow each other in a section keeps one line, edited at each clip
import { normalizeSong } from './format.js';
export function compileNow(song, bar, { prepare = false, shownMuted = [], keepHeaders = [], inPlace = false, hidden = null, gated = false, bounds = null } = {}) {
  const n = normalizeSong(song), secs = n.sections;
  const i = Math.max(0, secs.findIndex(s => bar >= s.start && bar < s.start + s.bars));
  const shown = new Set(shownMuted.filter(id => (song.tracks || []).some(tr => tr.id === id && tr.mute)));
  const full = { ...song, tracks: song.tracks.map(tr => (shown.has(tr.id) ? { ...tr, mute: false } : tr)) };
  const p = parseCode(compileSong(full), { gated }), used = new Set();
  // the bars of section k the code is for: the whole section, or (bounds) the part of it that holds `bar`
  const win = k => {
    const s = secs[k];
    let a = s.start, z = s.start + s.bars;
    if (bounds && k === i) for (const b of bounds) if (b > s.start && b < s.start + s.bars) { if (b <= bar) a = Math.max(a, b); else z = Math.min(z, b); }
    return [a, z];
  };
  // the layers of one section, per block: [{ comment, desc, text }]
  const layersFor = k => {
    if (!secs[k]) return null;
    const [a, z] = win(k);
    return p.blocks.map(b => b.items.filter(it => it.kind === 'layer').filter(it => !it.gate || !p.lanes[it.gate] || p.lanes[it.gate].slice(a, z).some(on)).map(it => {
      const lane = it.gate && p.lanes[it.gate], whole = !inPlace && lane && lane.slice(a, z).every(v => Number(v) === 1);
      const text = whole ? it.text.replace(GATE, '') : it.text;
      // (in place: a fade out of the section before, below 1 on the first bars only)
      const fade = inPlace && lane && lane.slice(0, a).some(on) && lane.slice(a, z).every((v, k) => !on(v) || (k < 2 && Number(v) < 1));
      return { comment: it.clip ? it.clip.raw : null, desc: it.desc, text, gate: whole ? null : it.gate, gateText: it.gateText, mul: it.mul, fade };
    }));
  };
  const now = layersFor(i), next = prepare ? layersFor(i + 1) : null;
  const sec = secs[i], out = [p.head[0], `// ${sec.name} · ${t('cBars', { from: sec.start + 1, to: sec.start + sec.bars })}`, ...p.head.filter(l => l.startsWith('setcpm('))];
  const body = [];
  p.blocks.forEach((b, k) => {
    const id = b.header.replace(/^\/\/ =+ /, '').replace(/ =+$/, '').split(' · ')[0];
    const track = full.tracks.find(tr => (tr.name || tr.id) === id), silent = track && shown.has(track.id);
    let mine = now[k];
    const extra = next ? next[k].filter(x => !mine.some(y => y.text === x.text)) : [];
    if (inPlace) {
      const bare = x => x.text.replace(x.gateText || GATE, '');
      const gone = mine.filter(x => x.fade && !mine.some(y => !y.fade && bare(y) === bare(x)));
      mine = mine.filter(x => !gone.includes(x));
      if (hidden && !silent) for (const x of gone) { const v = `"${rle(p.lanes[x.gate])}"`; hidden.push(x.text.replace(x.gateText || GATE, x.mul !== null && x.mul !== undefined ? `.mask(${v}).postgain(${v}.mul(${x.mul}))` : `.mask(${v}).velocity(${v})`)); }
      if (hidden) for (const x of gone) for (const m of x.text.matchAll(/\b\w+\b/g)) if (p.lanes[m[0]] && m[0] !== x.gate) used.add(m[0]);
    }
    // a track that came in before keeps its header, also when nothing of it plays now (performance-profiles)
    if (!mine.length && !extra.length) { if (track && keepHeaders.includes(track.id)) body.push('', b.header); return; }
    body.push('', b.header);
    let last = null;
    const put = (x, muted) => {
      if (x.comment && x.comment !== last) { body.push(x.comment); last = x.comment; }
      if (x.desc && !body.includes(x.desc)) body.push(x.desc);
      body.push(muted ? x.text.replace(/^[_S]?\$:/, '_$:') : x.text);
      if (x.gate) used.add(x.gate);
    };
    mine.forEach(x => put(x, silent));
    extra.forEach(x => put(x, true));
  });
  // lane constants still referenced (fades, clips that start inside a section)
  for (const m of body.join('\n').matchAll(/\b\w+\b/g)) if (p.lanes[m[0]]) used.add(m[0]);
  const lanes = p.head.filter(l => { const m = l.match(LANE); return m && used.has(m[1]); });
  for (const b of p.blocks) for (const it of b.items) if (it.kind === 'line' && it.text.startsWith('const ')) { const m = it.text.match(LANE); if (m && used.has(m[1])) lanes.push(it.text); }
  return [...out, ...lanes, ...body].join('\n');
}

// The lanes taken out of the code of the moment (live-coder in-place edits): every `.mask(x).velocity(x)` of a lane
// constant leaves its line, lines that are then the same are one line with all their lanes, and the lane constants go.
// gated (code-lanes): also `.mask(x).postgain(x.mul(n))`, its lane written "lane x n" (the level after the amp is the
// lane's value times n on that bar, as the code in full plays it).
// → { code, lanes: for each pattern line, in order, its lanes ("0!76 1!8 0.5 0!31", without the brackets) or null }.
// The hidden mixer plays each line with its lanes (writer.js tail), so the events are the same.
const LANES = /\.mask\((\w+)\)\.velocity\(\1\)/g;
const GATED = /\.mask\((\w+)\)\.(?:velocity\(\1\)|postgain\(\1\.mul\((-?[\d.]+|"<?[\d.! ]+>?")\)\))/g;
const bare = v => v.trim().replace(/^"|"$/g, '').replace(/^<|>$/g, '').trim();
export function liftLanes(code, { gated = false } = {}) {
  const lines = code.split('\n'), consts = {};
  for (const l of lines) { const m = l.match(LANE); if (m) consts[m[1]] = m[2]; }
  const gate = gated ? GATED : LANES, gates = new Set();
  // a pattern line and its continuation lines
  const groups = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^[_S]?\$:/.test(lines[i])) { groups.push({ text: lines[i] }); continue; }
    let text = lines[i];
    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]) && !/^\s*[_S]?\$:/.test(lines[i + 1])) text += '\n' + lines[++i];
    const lanes = [];
    const lifted = text.replace(gate, (all, n, mul) => (consts[n] ? (lanes.push(typeof mul !== 'string' ? bare(consts[n]) : `${bare(consts[n])} x ${bare(mul)}`), gates.add(n), '') : all)).replace(/\n[ \t]*(?=\n|$)/g, '');
    groups.push({ pattern: true, text: lifted, lanes: lanes.length ? lanes : null });
  }
  // the same line twice, each under its lanes: one line under both
  const out = [];
  for (const g of groups) {
    const same = g.pattern && g.lanes && out.find(x => x.pattern && x.lanes && x.text === g.text);
    if (same) { same.lanes.push(...g.lanes); continue; }
    out.push(g);
  }
  const body = out.map(g => g.text).join('\n');
  // lane constants no line uses any more
  const kept = out.filter(g => { const m = !g.pattern && g.text.match(LANE); return !m || !gates.has(m[1]) || new RegExp(`\\b${m[1]}\\b`).test(body.replace(g.text, '')); });
  return { code: kept.map(g => g.text).join('\n'), lanes: kept.filter(g => g.pattern).map(g => g.lanes) };
}

// bars inside a section where a clip of a song starts or ends (code-lanes: the code of the moment changes there)
export function clipBounds(song) {
  const n = normalizeSong(song), out = new Set();
  for (const tr of n.tracks || []) {
    if (tr.type === 'voice' || tr.type === 'spoken') continue;
    for (const c of tr.clips || []) {
      const a = c.start, z = c.start + c.bars;
      for (const s of n.sections) {
        const x = Math.max(a, s.start), y = Math.min(z, s.start + s.bars);
        if (x >= y) continue;
        if (x > s.start) out.add(x);
        if (y < s.start + s.bars) out.add(y);
      }
    }
  }
  return [...out].sort((x, y) => x - y);
}
