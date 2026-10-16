// How the technical functions of the code are written (code-writing): full (as compiled), short (our own `.o("bass")`
// for the bus and the visual, `.drive(0.6)` for distortion with its volume) or mixer (bus and visual in a hidden mixer,
// `.gain()` only when the level is not the track's written one). Every value plays the same events: the short
// functions are registered once (installHelpers), the mixer is a hidden tail evaluated after the code shown (its
// mini-notation offsets are past the end of the panel, so the highlights of the code shown stay where they are).
// Pure text in, text out, apart from installHelpers.
import { chainLines, breakPoints } from './typing.js';

export const FUNCTIONS = ['full', 'short', 'mixer'];
const PATTERN = /^\s*_?\$:\s*/;
const NUM = /^-?\d*\.?\d+$/;
// the calls of a chain: [{ name, args, text, ws }], ws the spaces after the call (a line break and its indent too)
function calls(line) {
  const pts = breakPoints(line), out = [{ head: true, text: line.slice(0, pts[0] ?? line.length) }];
  pts.forEach((p, i) => {
    const raw = line.slice(p, pts[i + 1] ?? line.length), text = raw.replace(/\s+$/, ''), m = text.match(/^\.([\w$]+)\(([\s\S]*)\)$/);
    out.push({ name: m ? m[1] : null, args: m ? m[2] : null, text, ws: raw.slice(text.length) });
  });
  // the head keeps its own trailing spaces apart, too
  const h = out[0], ht = h.text.replace(/\s+$/, ''); h.ws = h.text.slice(ht.length); h.text = ht;
  return out;
}
// a call taken out leaves its line break to the call before it
const keep = cs => { const out = []; for (const c of cs) { if (!c.drop) out.push({ ...c }); else if (c.ws.includes('\n') && out.length && !out[out.length - 1].ws.includes('\n')) out[out.length - 1].ws = c.ws; } return out; };
const join = cs => keep(cs).map(c => c.text + c.ws).join('').replace(/\n[ \t]*(?=\n|$)/g, '').replace(/[ \t]+(?=\n|$)/g, '');
// the key of a line in the mixer: its text without the pattern sign, spaces before a call or line breaks
export const lineKey = l => l.replace(PATTERN, '').replace(/\s*\n\s*\./g, '.').trim();

// written levels of a code: analyze id → gain, for lines with one constant level (several levels: none); buses: name →
// orbit, for names on one bus only (the short `.o(name)`)
export function busesOf(code) {
  const seen = {};
  for (const l of chainLines(code)) {
    const cs = calls(l), o = cs.find(c => c.name === 'orbit'), a = cs.find(c => c.name === 'analyze');
    if (!PATTERN.test(l) || !o || !a || !/^"[\w-]+"$/.test(a.args.trim())) continue;
    const k = a.args.trim().slice(1, -1), n = +o.args;
    seen[k] = k in seen && seen[k] !== n ? null : n;
  }
  return Object.fromEntries(Object.entries(seen).filter(([, v]) => v !== null));
}
export function levelsOf(code) {
  const seen = new Map();
  for (const l of chainLines(code)) {
    if (!PATTERN.test(l)) continue;
    const cs = calls(l), id = cs.find(c => c.name === 'analyze'), g = cs.filter(c => c.name === 'gain');
    if (!id || g.length !== 1 || !NUM.test(g[0].args.trim())) continue;
    const k = id.args, v = +g[0].args;
    seen.set(k, seen.has(k) && seen.get(k) !== v ? null : v);
  }
  return new Map([...seen].filter(([, v]) => v !== null));
}

// one line: { text, entry } — entry: what the mixer adds back ({ orbit, analyze, gain })
function writeLine(line, mode, written, buses) {
  const cs = calls(line), entry = {};
  for (let i = 1; i < cs.length; i++) {
    const c = cs[i];
    // distortion with its volume: .drive(x)
    if (c.name === 'distort' && cs[i + 1] && cs[i + 1].name === 'distortvol' && cs[i + 1].args.trim() === '.5') { c.text = `.drive(${c.args})`; cs[i + 1].drop = true; }
  }
  const orbit = cs.find(c => c.name === 'orbit' && NUM.test(c.args.trim())), an = cs.find(c => c.name === 'analyze' && /^"[\w-]+"$/.test(c.args.trim()));
  if (orbit && an) {
    const name = an.args.trim().slice(1, -1);
    if (mode === 'short') { if (buses[name] === +orbit.args) { orbit.text = `.o("${name}")`; an.drop = true; } }
    else { orbit.drop = true; an.drop = true; Object.assign(entry, { orbit: +orbit.args, analyze: name }); }
    // the level: only when it is not the written one
    const g = cs.filter(c => c.name === 'gain');
    if (mode === 'mixer' && g.length === 1 && NUM.test(g[0].args.trim()) && written.get(an.args.trim()) === +g[0].args) { g[0].drop = true; entry.gain = +g[0].args; }
  }
  return { text: join(cs), entry };
}

// the voice of the spoken comments: its header, the quoted phrase and its line
const VOICE_HEAD = /^\/\/ =+ (?:.* · )?voice =+$/;
function splitVoice(code) {
  const lines = code.split('\n'), shown = [], voice = [];
  for (let i = 0; i < lines.length; i++) {
    if (VOICE_HEAD.test(lines[i].trim())) {
      let j = i + 1;
      while (j < lines.length && !/^\/\/ =+ /.test(lines[j].trim()) && lines[j].trim()) j++;
      voice.push(...lines.slice(i, j)); i = j - 1; continue;
    }
    shown.push(lines[i]);
  }
  return { shown: shown.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, ''), voice: voice.join('\n') };
}

// code → { code (shown), table: Map(lineKey → entry), voice (the hidden voice code) }
// mode: full, short or mixer; written: levelsOf the song as written; buses: busesOf it (short); voice: false hides the
// voice code (it still plays)
export function writeCode(code, { mode = 'full', written = new Map(), buses = {}, voice = true } = {}) {
  const v = voice ? { shown: code, voice: '' } : splitVoice(code), table = new Map();
  if (mode === 'full') return { code: v.shown, table, voice: v.voice };
  const out = chainLines(v.shown).map(l => {
    if (!PATTERN.test(l)) return l;
    const r = writeLine(l, mode, written, buses);
    if (Object.keys(r.entry).length) table.set(lineKey(r.text), r.entry);
    return r.text;
  });
  return { code: out.join('\n'), table, voice: v.voice };
}

// the hidden tail evaluated after the code shown: the mixer (for each pattern line of the code, by the offsets of its
// text, what it gets back) and the hidden voice. Lines edited by hand find the most alike line of the table.
export function tail(shown, { table = new Map(), voice = '', like = null, offset = 0 } = {}) {
  const ranges = [];
  let at = offset;
  for (const l of chainLines(shown)) {
    if (PATTERN.test(l) && table.size) {
      const k = lineKey(l);
      let e = table.get(k);
      if (!e && like) { let best = 0.5; for (const [key, x] of table) { const s = like(key, k); if (s >= best) { best = s; e = x; } } }
      if (e) ranges.push([at, at + l.length, e]);
    }
    at += l.length + 1;
  }
  // plain JS values: double quotes would be read as mini-notation
  const lit = v => (typeof v === 'string' ? `'${v.replace(/[^\w-]/g, '')}'` : String(v));
  const list = ranges.map(([a, b, e]) => `[${a},${b},{${Object.entries(e).map(([k, v]) => `${k}:${lit(v)}`).join(',')}}]`).join(',');
  return (ranges.length ? `\n\nall(x => miskMix(x, [${list}]))` : '') + (voice ? `\n\n${voice}` : '');
}

// the same helpers as Strudel code, for the code copied or opened in Strudel: it plays there as here (single quotes
// only: double quotes are mini-notation)
export function preludeText(buses = {}) {
  return ['// coding-misk: short functions and mixer', `const miskBuses = {${Object.entries(buses).map(([k, v]) => `'${k}': ${v}`).join(', ')}}`,
    "register('o', (name, pat) => (miskBuses[name] === undefined ? pat : pat.orbit(miskBuses[name])).analyze(name))",
    "register('drive', (x, pat) => pat.distort(x).distortvol(0.5))",
    'const miskMix = (pat, ranges) => pat.withHap(h => { const l = h.context && h.context.locations && h.context.locations[0], s = l && l.start; const r = s === undefined ? null : ranges.find(([a, b]) => s >= a && s < b); return r ? h.withValue(v => { const o = { ...v }; for (const [k, x] of Object.entries(r[2])) if (o[k] === undefined) o[k] = x; return o; }) : h; })',
    '', ''].join('\n');
}

// short functions and the mixer, registered once in a page with Strudel (the app, the render page); the buses of the
// song evaluated are in globalThis.miskBuses (name → orbit), set before it is evaluated
export function installHelpers({ register }) {
  register('o', (name, pat) => { const n = (globalThis.miskBuses || {})[name]; return (n === undefined ? pat : pat.orbit(n)).analyze(name); });
  register('drive', (x, pat) => pat.distort(x).distortvol(0.5));
  // a hap from a line of the mixer gets its bus, visual and level unless the line sets them
  globalThis.miskMix = (pat, ranges) => pat.withHap(h => {
    const loc = h.context && h.context.locations && h.context.locations[0], s = loc && loc.start;
    const r = s === undefined ? null : ranges.find(([a, b]) => s >= a && s < b);
    if (!r) return h;
    return h.withValue(v => { const o = { ...v }; for (const [k, x] of Object.entries(r[2])) if (o[k] === undefined) o[k] = x; return o; });
  });
}
