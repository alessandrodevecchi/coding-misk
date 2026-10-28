// Compact code for Crescendo songs (#64, change crescendo-code). The standard compiler writes one group of lines per
// clip and section; this one starts from its output and joins, inside each track, the layers whose code is the same
// apart from their lane, under one lane that is the union of theirs. Layers only join when their lanes never sound on
// the same bar, so the compact code plays exactly what the standard code plays. Tracks the live build keeps silent
// are written with Strudel's `_$:` (muted, code kept), so the listener sees what is coming.
import { compileSong } from './compile.js';
import { rle } from '../music.js';
import { t } from '../i18n.js';
import { typingPlan, mulberry, lineLike } from './typing.js';

const LANE = /^const (\w+) = "(<[^"]*>)"/;
const GATE = /\.mask\((\w+)\)\.velocity\(\1\)/;
// (lines-ahead-balanced D2) either gate, for a line found by its text without its lane
const GATE_ANY = /\.mask\((\w+)\)\.(?:velocity\(\1\)|postgain\(\1\.mul\((?:-?[\d.]+|"<?[\d.! ]+>?")\)\))/;
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
// returning (written-like-coder, in place only): from this bar on, a line silent in the part of the code that sounded
// before and sounds again later stays written, muted with `_$:`, as it last played, in its place among the lines of
// its track; when it plays again it is unmuted and edited where its values changed. A line cheaper to type again than to
// keep muted and edit (the typing model, `muteOrDelete`) leaves instead and is typed again on its return. A line is known by its track, its
// visual and its order among the lines of that visual in its clip (`returnKeys`); one that never sounds again leaves.
import { normalizeSong } from './format.js';
// shownText (reused-lines D1, D2): a line (its lanes left out) as the code shows it (idiomatic forms, long linear lists
// written as ramps in a Live coder growth, technical functions folded), so the choice between muting and deleting a
// line is costed on the line as it is typed, and two lines are told apart as the typing tells them.
// plan (reused-lines D4, D8, Live coder): { edits: Map(id → bar), ahead: [{ header, text, from, to }] }: a muted returning
// line (id: its track's header, its key and the bar it returns at) shown in its return form from that bar on; a layer
// of a block typed ahead, muted, from `from` until it sounds at `to`. info: an array filled with the pattern lines of
// the code ({ kind: 'play' | 'return' | 'ahead', header, key, text, id?, was?, ret? }), for the plan (live-code.js).
export function compileNow(song, bar, { prepare = false, shownMuted = [], keepHeaders = [], inPlace = false, hidden = null, gated = false, bounds = null, returning = Infinity, shownText = x => x, plan = null, info = null } = {}) {
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
      return { comment: it.clip ? it.clip.raw : null, desc: it.desc, text, gate: whole ? null : it.gate, gateText: it.gateText, mul: it.mul, fade, key: keys.get(it) };
    }));
  };
  // (returning) the bars of the section that holds a bar
  const sectionSpan = x => { const s = secs.find(q => x >= q.start && x < q.start + q.bars) || secs[secs.length - 1]; return [s.start, s.start + s.bars]; };
  // (returning) the bars of the code shown: a line sounded before them and sounds again after them
  const [wa, wz] = win(i), keep = inPlace && bar >= returning;
  // (reused-lines D8, lines-ahead-balanced D2, D3) lines typed ahead also at growth steps: the keys and the line info
  // for the growth's code too
  const aheadNow = inPlace && plan && plan.ahead ? plan.ahead.filter(a => a.from <= bar && bar < a.to) : [];
  const keys = keep || (inPlace && (info || aheadNow.length)) ? returnKeys(p, shownText) : new Map();
  const now = layersFor(i), next = prepare ? layersFor(i + 1) : null;
  const sec = secs[i], out = [p.head[0], `// ${sec.name} · ${t('cBars', { from: sec.start + 1, to: sec.start + sec.bars })}`, ...p.head.filter(l => l.startsWith('setcpm('))];
  const body = [];
  p.blocks.forEach((b, k) => {
    const id = b.header.replace(/^\/\/ =+ /, '').replace(/ =+$/, '').split(' · ')[0];
    const track = full.tracks.find(tr => (tr.name || tr.id) === id), silent = track && shown.has(track.id);
    // (lines-ahead-balanced D2) a track that has not come in yet, compiled only for a line typed ahead: none of its
    // lines plays or shows, only the line ahead, muted
    const only = !!(track && track.aheadOnly);
    let mine = only ? [] : now[k];
    const extra = next && !only ? next[k].filter(x => !mine.some(y => y.text === x.text)) : [];
    if (inPlace) {
      const bare = x => x.text.replace(x.gateText || GATE, '');
      const gone = mine.filter(x => x.fade && !mine.some(y => !y.fade && bare(y) === bare(x)));
      mine = mine.filter(x => !gone.includes(x));
      if (hidden && !silent && !only) for (const x of gone) { const v = `"${rle(p.lanes[x.gate])}"`; hidden.push(x.text.replace(x.gateText || GATE, x.mul !== null && x.mul !== undefined ? `.mask(${v}).postgain(${v}.mul(${x.mul}))` : `.mask(${v}).velocity(${v})`)); }
      if (hidden) for (const x of gone) for (const m of x.text.matchAll(/\b\w+\b/g)) if (p.lanes[m[0]] && m[0] !== x.gate) used.add(m[0]);
      if (keep) mine = withReturning(b, mine, keys, p.lanes, wa, wz, `${song.id ?? song.title ?? ''}\u0000${id}`, sectionSpan, shownText, { bar, plan, info });
      // (reused-lines D8) lines typed ahead, muted, in the place they take at their step
      // (lines-ahead-balanced D2: at growth steps too; the line is found by its text without its lane, since the
      // lanes of a growth's code are named in the order the tracks came in)
      for (const a of aheadNow) {
        if (a.header !== b.header) continue;
        const bareA = a.text.replace(GATE_ANY, '');
        const it = b.items.find(x => x.kind === 'layer' && x.text === a.text) || b.items.find(x => x.kind === 'layer' && x.text.replace(GATE_ANY, '') === bareA);
        if (!it || mine.some(x => x.key === keys.get(it) || x.text === it.text)) continue;
        const layers = b.items.filter(x => x.kind === 'layer' && x.gate && p.lanes[x.gate]);
        placeMuted(mine = mine.slice(), layers, keys, it, { comment: null, desc: it.desc, text: it.text, gate: it.gate, gateText: it.gateText, mul: it.mul, fade: false, key: keys.get(it), returning: true, ahead: true });
      }
      if (info) for (const x of mine) info.push({ kind: x.ahead ? 'ahead' : x.returning ? 'return' : 'play', header: b.header, key: x.key, text: x.text, id: x.id, was: x.was, ret: x.ret, retBar: x.retBar });
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
    mine.forEach(x => put(x, silent || x.returning));
    extra.forEach(x => put(x, true));
  });
  // lane constants still referenced (fades, clips that start inside a section)
  for (const m of body.join('\n').matchAll(/\b\w+\b/g)) if (p.lanes[m[0]]) used.add(m[0]);
  const lanes = p.head.filter(l => { const m = l.match(LANE); return m && used.has(m[1]); });
  for (const b of p.blocks) for (const it of b.items) if (it.kind === 'line' && it.text.startsWith('const ')) { const m = it.text.match(LANE); if (m && used.has(m[1])) lanes.push(it.text); }
  return [...out, ...lanes, ...body].join('\n');
}

// (returning) each layer of the code → its key within its track: its visual and its order among the layers of that
// visual in its clip ("hats#1": the second hats line of its clip), so the same line in two sections has the same key.
// (reused-lines D2) Layers of one key that the typing would not edit into each other (lineLike below 0.5 on the code
// shown, lanes left out) are different lines: the first keeps the key, a later unlike one gets "hats#1~1", so a line
// replaced by another pattern of its track keeps its own place and can stay muted beside it. A layer joins the line of
// its key it is most like (compared with the last layer of that line, in the order the layers first sound).
function returnKeys(p, shownText = x => x) {
  const keys = new Map(), base = new Map();
  for (const b of p.blocks) {
    let clip, seen = new Map();
    for (const it of b.items) {
      if (it.kind !== 'layer') continue;
      if (it.clip !== clip) { clip = it.clip; seen = new Map(); }
      const v = (it.text.match(/\.analyze\("([^"]*)"\)/) || [])[1] || '', n = seen.get(v) || 0;
      seen.set(v, n + 1);
      base.set(it, `${v}#${n}`);
    }
    const first = it => { const lane = it.gate && p.lanes[it.gate]; const j = lane ? lane.findIndex(on) : -1; return j < 0 ? Infinity : j; };
    const items = b.items.filter(it => it.kind === 'layer').map((it, i) => ({ it, i, at: first(it) })).sort((x, y) => x.at - y.at || x.i - y.i);
    const lines = new Map();
    for (const { it } of items) {
      const k = base.get(it), text = shownText(it.text.replace(it.gateText || GATE, '')), own = lines.get(k) || [];
      let best = -1, score = 0.5;
      own.forEach((l, j) => { const v = l.text === text ? 1 : lineLike(l.text, text); if (v >= score) { best = j; score = v; } });
      if (best < 0) { best = own.length; own.push({ text }); } else own[best].text = text;
      lines.set(k, own);
      keys.set(it, best ? `${k}~${best}` : k);
    }
  }
  return keys;
}
// (returning) the layers of one track that sounded before bar a and sound again from bar z on, with no line of their
// key in `cur`: key → { was: the layer as it last played, ret: { it, bar }: the layer that sounds again first, its bar }
function returningAt(layers, keys, lanes, a, z, cur) {
  const last = new Map(), next = new Map();
  for (const it of layers) {
    const k = keys.get(it), lane = lanes[it.gate];
    let lb = -1;
    for (let j = Math.min(a, lane.length) - 1; j >= 0; j--) if (on(lane[j])) { lb = j; break; }
    if (lb >= 0 && (!last.has(k) || lb > last.get(k).bar)) last.set(k, { it, bar: lb });
    let nb = -1;
    for (let j = z; j < lane.length; j++) if (on(lane[j])) { nb = j; break; }
    if (nb >= 0 && (!next.has(k) || nb < next.get(k).bar)) next.set(k, { it, bar: nb });
  }
  return new Map([...last].filter(([k]) => !cur.has(k) && next.has(k)).sort((x, y) => layers.indexOf(x[1].it) - layers.indexOf(y[1].it)).map(([k, v]) => [k, { was: v.it, ret: next.get(k) }]));
}
// (returning) a muted line `x` of layer `it` put among the lines `out` of its track: before the next line of its clip
// there, else after the one before it, else at the end
function placeMuted(out, layers, keys, it, x) {
  // (reused-lines D2) a line replaced by another pattern of its track: above the line that replaced it
  const root = k => String(k).replace(/~\d+$/, ''), twin = out.findIndex(y => y.key !== undefined && root(y.key) === root(x.key) && y.key !== x.key);
  if (twin >= 0) { out.splice(twin, 0, x); return; }
  const order = layers.filter(y => y.clip === it.clip).map(y => keys.get(y)), pos = order.indexOf(x.key);
  let at = -1;
  for (const nk of order.slice(pos + 1)) { at = out.findIndex(y => y.key === nk); if (at >= 0) break; }
  if (at < 0) for (const pk of order.slice(0, pos).reverse()) { const j = out.findIndex(y => y.key === pk); if (j >= 0) { at = j + 1; break; } }
  out.splice(at < 0 ? out.length : at, 0, x);
}
// (returning) the lines of one track shown in bars a to z, with the lines that sounded before a and sound again from z
// on, which have no line of the same key here and are cheaper to keep muted than to type again (`muteOrDelete`): each
// as it last played, muted, in its place (`placeMuted`). seed: the song and the track, for the choice when the two ways
// cost about the same; span: the bars of the section that holds a bar
// (reused-lines D4) plan.edits: a line whose id (its track's header, its key, the bar it returns at) is planned from a
// bar shows its return form, still muted, from that bar on
function withReturning(b, mine, keys, lanes, a, z, seed = '', span = x => [x, x + 1], shownText = x => x, { bar = 0, plan = null } = {}) {
  const layers = b.items.filter(it => it.kind === 'layer' && it.gate && lanes[it.gate]);
  const back = [...returningAt(layers, keys, lanes, a, z, new Set(mine.map(x => x.key)))].filter(([k, v]) => muteOrDelete(layers, keys, lanes, k, v, seed, span, shownText) === 'mute');
  if (!back.length) return mine;
  const out = mine.slice();
  for (const [k, { was: it, ret }] of back) {
    const id = `${b.header}\u0000${k}\u0000${ret.bar}`, from = plan && plan.edits ? plan.edits.get(id) : undefined, now = from !== undefined && bar >= from ? ret.it : it;
    placeMuted(out, layers, keys, it, { comment: null, desc: it.desc, text: now.text, gate: now.gate, gateText: now.gateText, mul: now.mul, fade: false, key: k, returning: true, id, was: it.text.replace(it.gateText || GATE, ''), ret: ret.it.text.replace(ret.it.gateText || GATE, ''), retBar: ret.bar });
  }
  return out;
}

// (returning, written-like-coder D5) a line silent from after `v.was` played until `v.ret` plays again at v.ret.bar:
// kept muted and edited on its return ('mute'), or deleted and typed again on its return ('delete'), whichever the
// typing model says a person types faster (human, lean, no line pasted as from notes; lanes left out, as the code
// shows them). Both are costed on the code of its track: mute is `$:` → `_$:` when it goes silent, then the track as
// the section before the return shows it, with the line muted in its place, into the track as the return shows it;
// delete is nothing when it goes silent (a removed line goes at the start), then the same without the line. The other
// lines of the track that come back at that return are muted in both. Within a factor of CLOSE the choice is drawn
// from the seed, the line and the bar it returns at, the cheaper way the likelier; the same for every bar of the gap,
// so the code of the moment does not flip.
const CLOSE = 1.35, costs = new Map();
function typeCost(from, to, seed) {
  const k = `${seed}\u0000${from}\u0000${to}`;
  if (!costs.has(k)) { if (costs.size > 20000) costs.clear(); costs.set(k, typingPlan(from, to, { style: 'human', lean: true, notes: false, seed }).natural); }
  return costs.get(k);
}
function muteOrDelete(layers, keys, lanes, k, v, seed, span, shownText = x => x) {
  const bare = it => shownText(it.text.replace(it.gateText || GATE, '')), mute = x => x.replace(/^[_S]?\$:/, '_$:');
  const [ra, rz] = span(v.ret.bar), [pa, pz] = span(Math.max(0, ra - 1));
  // the lines of the track that sound in bars a to z, in their order (one line per text), without a fade out of the
  // section before (below 1 on the first two bars only: compileNow leaves it out of the code)
  const fade = (l, a, z) => l.slice(0, a).some(on) && l.slice(a, z).every((x, j) => !on(x) || (j < 2 && Number(x) < 1));
  const shown = (a, z) => { const out = []; for (const it of layers) if (lanes[it.gate].slice(a, z).some(on) && !fade(lanes[it.gate], a, z)) { const text = bare(it); if (!out.some(x => x.text === text)) out.push({ key: keys.get(it), text }); } return out; };
  const after = shown(ra, rz).map(x => x.text).join('\n'), before = shown(pa, pz);
  if (pz > ra || before.some(x => x.key === k)) return 'mute';
  const others = before.slice();
  for (const [j, w] of returningAt(layers, keys, lanes, pa, pz, new Set(before.map(x => x.key)))) if (j !== k && w.ret.bar < rz) placeMuted(others, layers, keys, w.was, { key: j, text: mute(bare(w.was)) });
  const withLine = others.slice(), L = bare(v.was);
  placeMuted(withLine, layers, keys, v.was, { key: k, text: mute(L) });
  const kept0 = typeCost(L, mute(L), seed) + typeCost(withLine.map(x => x.text).join('\n'), after, seed);
  const typed0 = typeCost(others.map(x => x.text).join('\n'), after, seed);
  // (reused-lines D1) the line's own share: the typing of the track without the line on both sides is common to both
  // ways, so it leaves the comparison
  const base = Math.min(kept0, typed0, typeCost(others.map(x => x.text).join('\n'), shown(ra, rz).filter(x => x.key !== k).map(x => x.text).join('\n'), seed));
  const kept = kept0 - base, typed = typed0 - base;
  if (kept <= 0.05 || typed <= 0.05) return kept <= typed ? 'mute' : 'delete';
  const q = Math.log(kept / typed), band = Math.log(CLOSE);
  if (q <= -band) return 'mute';
  if (q >= band) return 'delete';
  return mulberry(`${seed}\u0000${k}\u0000${v.ret.bar}/mute-or-delete`)() < 0.5 - q / (2 * band) ? 'mute' : 'delete';
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
