// How the technical functions of the code are written (code-writing, song-functions): a preset over options, as the
// comments. fnBus: our own `.chan("bass")` for the bus and the visual; fnLevel: bus, visual and level in a hidden
// mixer (`.gain()` only when the level is not the track's written one); fnCrunch: `.crunch(0.6)` for distortion with its
// volume; fnVoice: the effects of a voice line as a song function; fnLib: the library functions (src/song/functions.js)
// for frequent chains; fnSong: the song's own functions for chains repeated in the song; fnLanes (code-lanes): section
// and clip lanes in the hidden mixer, one line per part edited in place (src/live/live-code.js). Every option plays the same
// events: the functions are registered (installHelpers, useFns), the mixer is a hidden tail evaluated after the code
// shown (its mini-notation offsets are past the end of the panel, so the highlights of the code shown stay where they
// are). Pure text in, text out, apart from installHelpers and useFns.
import { chainLines, breakPoints } from './typing.js';
import { EFFECTS, LIBRARY, LIBRARY_NAMES, nameOrder, NAMES } from './functions.js';
import { hashString } from '../endless/random.js';

export const FUNCTION_LEVELS = ['full', 'short', 'mixer', 'compact'];
export const FUNCTION_OPTIONS = ['fnBus', 'fnLevel', 'fnCrunch', 'fnVoice', 'fnSong', 'fnLib', 'fnLanes'];
const preset = on => Object.fromEntries(FUNCTION_OPTIONS.map(k => [k, on.includes(k)]));
export const FUNCTION_PRESETS = {
  full: preset([]),
  short: preset(['fnBus', 'fnCrunch', 'fnVoice']),
  mixer: preset(['fnBus', 'fnLevel', 'fnCrunch', 'fnVoice']),
  compact: preset(FUNCTION_OPTIONS),
};
// the preset the options make, or 'custom'
export const functionPreset = o => FUNCTION_LEVELS.find(k => FUNCTION_OPTIONS.every(x => FUNCTION_PRESETS[k][x] === !!o[x])) || 'custom';
// the options of a preset name, or of controls ({ fnBus, … })
export const functionOptions = x => (typeof x === 'string' ? { ...(FUNCTION_PRESETS[x] || FUNCTION_PRESETS.full) } : Object.fromEntries(FUNCTION_OPTIONS.map(k => [k, !!(x && x[k])])));
// the presets the tools go through (strudel-catalog)
export const FUNCTIONS = FUNCTION_LEVELS;
// the app's own functions in the code it writes (installHelpers, preludeText): bus, distortion, the mixer and the
// library; song functions take their names from NAMES (strudel-catalog: tools/check-strudel.mjs accepts these names
// besides Strudel's, and fails when one of them is a Strudel name)
export const HELPERS = ['chan', 'crunch', 'miskMix', ...LIBRARY_NAMES];
const PATTERN = /^\s*[_S]?\$:\s*/;
const NUM = /^-?\d*\.?\d+$/;
// the calls of a chain: [{ name, args, text, ws }], ws the spaces after the call (a line break and its indent too)
function calls(line) {
  const pts = breakPoints(line), out = [{ head: true, text: line.slice(0, pts[0] ?? line.length) }];
  pts.forEach((p, i) => {
    const raw = line.slice(p, pts[i + 1] ?? line.length);
    // a comment after the call (functions commented out) goes with the spaces after it
    const cm = raw.match(/^(\.[^\n]*?)(\s*\/\/[^\n]*)?(\s*)$/s) || [raw, raw.replace(/\s+$/, ''), '', ''], text = cm[1], m = text.match(/^\.([\w$]+)\(([\s\S]*)\)$/);
    out.push({ name: m ? m[1] : null, args: m ? m[2] : null, text, ws: raw.slice(text.length) });
  });
  // the head keeps its own trailing spaces apart, too
  const h = out[0], ht = h.text.replace(/\s+$/, ''); h.ws = h.text.slice(ht.length); h.text = ht;
  return out;
}
// a call taken out leaves its line break and its comment to the call before it
const keep = cs => {
  const out = [];
  for (const c of cs) {
    const prev = out[out.length - 1];
    if (!c.drop) out.push({ ...c });
    else if (prev && !prev.ws.includes('//') && (c.ws.includes('//') || (c.ws.includes('\n') && !prev.ws.includes('\n')))) prev.ws = c.ws;
  }
  return out;
};
// the key of a line in the mixer: its text without the pattern sign, spaces before a call or line breaks
export const lineKey = l => l.replace(PATTERN, '').replace(/\s*\n\s*\./g, '.').trim();
// entries of the mixer table whose text two different lines share (two lines alike once bus, visual and level are
// out): they keep only the values every such line agrees on, never the last line's
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// table: Map(lineKey → entry); adds an entry under a key (another entry there: only the values both agree on)
export function addEntry(table, key, e) {
  const old = table.get(key);
  if (!old) table.set(key, e);
  else if (!same(old, e)) table.set(key, Object.fromEntries(Object.entries(e).filter(([k, v]) => k in old && same(old[k], v))));
}

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

// templates (song-functions): a chain with parameters a, b, c, as parts: literal text and parameter numbers
const PARAMS = ['a', 'b', 'c'];
export function partsOf(chain, params = PARAMS) {
  const out = [];
  let lit = '', q = null;
  for (let i = 0; i < chain.length; i++) {
    const c = chain[i];
    if (q) { lit += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; lit += c; continue; }
    const k = params.indexOf(c);
    if (k >= 0 && !/[\w$.]/.test(chain[i - 1] || '') && !/[\w$]/.test(chain[i + 1] || '')) { if (lit) out.push(lit); out.push(k); lit = ''; continue; }
    lit += c;
  }
  if (lit) out.push(lit);
  return out;
}
const chainOf = parts => parts.map(x => (typeof x === 'number' ? PARAMS[x] : x)).join('');
// the values of a text that matches the parts, or null: a parameter is an expression with no comma of its own level
export function matchParts(parts, text) {
  const vals = [];
  const go = (i, at) => {
    if (i === parts.length) return at === text.length;
    const p = parts[i];
    if (typeof p === 'string') return text.startsWith(p, at) && go(i + 1, at + p.length);
    let depth = 0, q = null;
    for (let j = at; j < text.length; j++) {
      const c = text[j];
      if (q) { if (c === '\\') j++; else if (c === q) q = null; }
      else if (c === '"' || c === "'" || c === '`') q = c;
      else if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) { if (--depth < 0) return false; }
      else if (c === ',' && depth === 0) return false;
      if (!q && depth === 0 && j + 1 > at && text[at] !== ' ' && text[j] !== ' ') { vals[p] = text.slice(at, j + 1); if (go(i + 1, j + 1)) return true; }
    }
    return false;
  };
  return go(0, 0) ? vals : null;
}
export const expandParts = (parts, vals) => parts.map(x => (typeof x === 'number' ? vals[x] : x)).join('');
const LIB = LIBRARY.map(f => ({ ...f, parts: partsOf(f.chain, f.params), size: breakPoints(`p${f.chain}`).length, lib: true }));
const LIB_BY = Object.fromEntries(LIB.map(f => [f.name, f]));
// calls a function may hold: effects and library functions
const isFx = c => !c.head && !!c.name && (EFFECTS.has(c.name) || !!LIB_BY[c.name]);
// how many written calls a call stands for
const rawOf = c => (LIB_BY[c.name] ? LIB_BY[c.name].size : 1);
// the call of a function with its values
const callText = (name, vals) => `.${name}(${vals.join(', ')})`;
// the text of a run of calls: their calls, without the spaces and line breaks between them
const runText = run => run.map(c => c.text).join('');
// a run can fold when no comment sits between its calls
const plain = run => run.slice(0, -1).every(c => !c.ws.includes('//'));
// cs (calls kept): replaces cs[i..i+n) by one call, which keeps the spaces after the last one
function fold(cs, i, n, name, vals) {
  const last = cs[i + n - 1];
  cs.splice(i, n, { name, args: vals.join(', '), text: callText(name, vals), ws: last.ws, fn: true });
}
// library functions first: at each call, the one that saves the most characters
function foldLibrary(cs, used) {
  for (let i = 1; i < cs.length; i++) {
    let best = null;
    for (const f of LIB) {
      const run = cs.slice(i, i + f.size);
      if (run.length < f.size || !run.every(c => isFx(c) && EFFECTS.has(c.name)) || !plain(run)) continue;
      const text = runText(run), vals = matchParts(f.parts, text);
      if (!vals) continue;
      const save = text.length - callText(f.name, vals).length;
      if (save > 0 && (!best || save > best.save)) best = { f, vals, save };
    }
    if (best) { fold(cs, i, best.f.size, best.f.name, best.vals); used.add(best.f.name); }
  }
}
// song functions: the longest template that matches with its constants, values as arguments
function foldSong(cs, table, used) {
  for (const f of table) {
    for (let i = 1; i + f.size <= cs.length; i++) {
      const run = cs.slice(i, i + f.size);
      if (!run.every(isFx) || run.map(c => c.name).join('.') !== f.key || !plain(run)) continue;
      const vals = matchParts(f.parts, runText(run));
      if (!vals) continue;
      fold(cs, i, f.size, f.name, vals); used.add(f.name);
    }
  }
}

// a voice line (voice-function, song-functions): the effects between its mask and its bus become a song function with
// no parameters, named from the voice words of the song; voices: chain → name, so the same chain keeps its name
function voiceCall(cs, ctx, used) {
  const head = cs[0].text.match(/s\("say_[a-z]+(?:_(\w+))?"\)/);
  if (!head) return;
  const at = cs.findIndex(c => c.name === 'mask'), end = cs.findIndex(c => c.name === 'orbit');
  if (at < 0 || end < 0 || end - at < 2) return;
  const chain = cs.slice(at + 1, end).map(c => c.text).join('');
  let name = ctx.voices.get(chain);
  if (!name) {
    const taken = new Set([...ctx.table.map(f => f.name), ...ctx.voices.values(), ...ctx.avoid]), list = nameOrder(ctx.song, 'voice').filter(x => NAMES.tracks.voice.includes(x));
    const k = hashString(chain) % list.length;
    name = [...list.slice(k), ...list.slice(0, k)].find(x => !taken.has(x));
    for (let n = 2; !name; n++) name = list.map(x => `${x}${n}`).find(x => !taken.has(x));
    ctx.voices.set(chain, name);
    ctx.defs[name] = { params: [], chain };
  }
  used.add(name);
  cs.slice(at + 2, end).forEach(c => { c.drop = true; });
  cs[at + 1].text = `.${name}()`; cs[at + 1].name = name;
}
// the calls of a line with the short forms of the options, before song functions: bus, distortion, level, voice and
// library → { cs (calls kept), entry: what the mixer adds back ({ orbit, analyze, gain }) }
function shortCalls(line, o, written, buses, ctx, used) {
  const cs = calls(line), entry = {};
  cs[0].head = true;
  if (o.fnVoice) voiceCall(cs, ctx, used);
  if (o.fnCrunch) for (let i = 1; i < cs.length; i++) {
    const c = cs[i];
    // distortion with its volume: .crunch(x)
    if (c.name === 'distort' && cs[i + 1] && cs[i + 1].name === 'distortvol' && cs[i + 1].args.trim() === '.5') { c.text = `.crunch(${c.args})`; c.name = 'crunch'; cs[i + 1].drop = true; }
  }
  const orbit = cs.find(c => c.name === 'orbit' && NUM.test(c.args.trim())), an = cs.find(c => c.name === 'analyze' && /^"[\w-]+"$/.test(c.args.trim()));
  if (orbit && an && (o.fnBus || o.fnLevel)) {
    const name = an.args.trim().slice(1, -1);
    if (!o.fnLevel) { if (buses[name] === +orbit.args) { orbit.text = `.chan("${name}")`; orbit.name = 'chan'; an.drop = true; } }
    else { orbit.drop = true; an.drop = true; Object.assign(entry, { orbit: +orbit.args, analyze: name }); }
    // the level: only when it is not the written one
    const g = cs.filter(c => c.name === 'gain');
    if (o.fnLevel && g.length === 1 && NUM.test(g[0].args.trim()) && written.get(an.args.trim()) === +g[0].args) { g[0].drop = true; entry.gain = +g[0].args; }
  }
  const out = keep(cs);
  if (o.fnLib) foldLibrary(out, used);
  return { cs: out, entry };
}
const text = cs => cs.map(c => c.text + c.ws).join('').replace(/\n[ \t]*(?=\n|$)/g, '').replace(/[ \t]+(?=\n|$)/g, '');
// one line: { text, entry }
function writeLine(line, o, written, buses, ctx, used) {
  const r = shortCalls(line, o, written, buses, ctx, used);
  if (o.fnSong && ctx.table.length) foldSong(r.cs, ctx.table, used);
  return { text: text(r.cs), entry: r.entry };
}

// the arguments of a call split at commas of their own level: [value, separator, value, …]
function argParts(args) {
  const out = [];
  let depth = 0, q = null, from = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { out.push(args.slice(from, i)); from = i; let j = i + 1; while (args[j] === ' ') j++; out.push(args.slice(i, j)); from = j; i = j - 1; }
  }
  out.push(args.slice(from));
  return out;
}
// a run's slots: the values of its calls, in order → [{ call, k, value }]
const slotsOf = run => run.flatMap((c, n) => argParts(c.args).map((v, k) => (k % 2 ? null : { n, k, value: v })).filter(Boolean));
// the template of a group of runs with the same calls: values that differ become parameters (at most three), or null
function templateOf(uses) {
  const slots = uses.map(slotsOf), first = slots[0];
  if (slots.some(s => s.length !== first.length) || first.some(x => !x.value.trim() || x.value !== x.value.trim())) return null;
  const params = new Map();
  first.forEach((x, i) => { if (slots.some(s => s[i].value !== x.value)) params.set(`${x.n}:${x.k}`, params.size); });
  if (params.size > 3) return null;
  const parts = [], push = x => { if (typeof x === 'string' && typeof parts[parts.length - 1] === 'string') parts[parts.length - 1] += x; else if (x !== '') parts.push(x); };
  uses[0].forEach((c, n) => {
    push(`.${c.name}(`);
    argParts(c.args).forEach((v, k) => push(k % 2 ? v : params.has(`${n}:${k}`) ? params.get(`${n}:${k}`) : v));
    push(')');
  });
  // every use must match it back
  return uses.every(u => matchParts(parts, runText(u))) ? { parts, params: PARAMS.slice(0, params.size) } : null;
}
// the type of the track of a header line ("// ========== lead · hook ==========" → hook)
const typeOf = h => { const m = h.match(/^\/\/ =+ (.*?) =+$/); return m ? m[1].split(' · ').pop().trim() : null; };
// identifiers a name must not take: those of the code (shared ideas, sections)
const identsOf = code => new Set(code.match(/[A-Za-z_$][\w$]*/g) || []);

// the functions of a song (song-functions): from the code of the song written in full (ref), the runs of effect calls
// that repeat (three or more calls with the same names on two or more lines; the copies of one line in the sections of
// its track count once, so a function never only wraps one line), values that differ as parameters; the longest
// first, each call in one function at most; a run on one line keeps only the library; names from the song's word lists (by its id). song: { id,
// tags, profile }; o: the options (fnLib folds the library first, as the code shown will). → [template], longest first
export function songFunctions(ref, song = {}, o = {}) {
  const ctx = { table: [], voices: new Map(), defs: {}, song, avoid: identsOf(ref) }, lines = [], written = levelsOf(ref), buses = busesOf(ref);
  let type = null, track = '';
  for (const l of chainLines(ref)) {
    if (/^\/\/ =+ .* =+$/.test(l.trim())) { type = typeOf(l.trim()); track = l.trim(); }
    if (!PATTERN.test(l)) continue;
    lines.push({ cs: shortCalls(l, { ...o, fnVoice: false }, written, buses, ctx, new Set()).cs, type, track, taken: new Set() });
  }
  const table = [];
  for (;;) {
    const groups = new Map();
    lines.forEach((L, li) => {
      for (let s = 1; s < L.cs.length; s++) {
        for (let n = 2; n <= 6 && s + n <= L.cs.length; n++) {
          const run = L.cs.slice(s, s + n);
          if (!run.every(isFx) || !plain(run) || run.some((_, j) => L.taken.has(s + j))) break;
          if (run.reduce((a, c) => a + rawOf(c), 0) < 3) continue;
          const key = run.map(c => c.name).join('.');
          if (!groups.has(key)) groups.set(key, []);
          const g = groups.get(key), prev = g[g.length - 1];
          // uses on one line do not overlap
          if (prev && prev.li === li && prev.s + n > s) continue;
          g.push({ li, s, run });
        }
      }
    });
    let best = null;
    for (const [key, uses] of groups) {
      // lines: a track's line repeated in its sections with the same run is one line
      const raw = uses[0].run.reduce((a, c) => a + rawOf(c), 0), nlines = new Set(uses.map(u => `${lines[u.li].track}|${runText(u.run)}`)).size;
      if (nlines < 2) continue;
      const t = templateOf(uses.map(u => u.run));
      if (!t) continue;
      // the characters it saves (a name of eight letters): only runs that get shorter
      const saves = uses.map(u => runText(u.run).length - callText('x'.repeat(8), matchParts(t.parts, runText(u.run))).length);
      if (saves.some(x => x <= 0)) continue;
      const save = saves.reduce((a, x) => a + x, 0), at = uses[0].li * 100 + uses[0].s;
      if (!best || raw > best.raw || (raw === best.raw && (save > best.save || (save === best.save && at < best.at)))) best = { key, uses, t, raw, save, at };
    }
    if (!best) break;
    best.uses.forEach(u => { for (let j = 0; j < u.run.length; j++) lines[u.li].taken.add(u.s + j); });
    table.push({ key: best.key, size: best.uses[0].run.length, parts: best.t.parts, params: best.t.params, chain: chainOf(best.t.parts), type: lines[best.uses[0].li].type, first: best.at });
  }
  // names: in the order the functions first appear in the song
  const taken = new Set([...ctx.avoid, ...LIBRARY_NAMES]);
  [...table].sort((x, y) => x.first - y.first).forEach(f => {
    const list = nameOrder(song, f.type);
    f.name = list.find(x => !taken.has(x));
    for (let n = 2; !f.name; n++) f.name = list.map(x => `${x}${n}`).find(x => !taken.has(x));
    taken.add(f.name);
  });
  return table.sort((x, y) => y.size - x.size || x.first - y.first);
}

// the voice of the spoken comments: its header, the quoted phrase and its line
const VOICE_HEAD = /^\/\/ =+ (?:.* · )?voice =+$/;
export function splitVoice(code) {
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

// the song's functions and names for writeCode, made once per song: ref, the song written in full; song: { id, tags,
// profile }; o: the options
export function functionContext(ref, song = {}, o = {}) {
  return { table: o.fnSong ? songFunctions(ref, song, o) : [], voices: new Map(), defs: {}, song, avoid: identsOf(ref) };
}
// the definition of a function the code calls: { params, chain, lib }
const defOf = (name, ctx) => (LIB_BY[name] ? { params: LIB_BY[name].params, chain: LIB_BY[name].chain, lib: true }
  : ctx.table.some(f => f.name === name) ? (({ params, chain }) => ({ params, chain }))(ctx.table.find(f => f.name === name)) : ctx.defs[name]);

// code → { code (shown), table: Map(lineKey → entry), entries (the entry of each pattern line of the code shown, in
// order, or null), voice (the hidden voice code), fns: name → { params, chain, lib } of the functions it calls }
// mode: a preset (full, short, mixer, compact) or the options ({ fnBus, … }); written: levelsOf the song as written;
// buses: busesOf it (fnBus); fns: functionContext of the song (song and voice functions); voice: false hides the
// voice code (it still plays)
export function writeCode(code, { mode = 'full', written = new Map(), buses = {}, voice = true, fns = null } = {}) {
  const o = functionOptions(mode), v = voice ? { shown: code, voice: '' } : splitVoice(code), table = new Map(), defs = {}, entries = [];
  // (fnLanes is not the writer's: the lanes leave the code before it, src/live/live-code.js)
  if (!FUNCTION_OPTIONS.some(k => k !== 'fnLanes' && o[k])) return { code: v.shown, table, entries, voice: v.voice, fns: defs };
  const ctx = fns || { table: [], voices: new Map(), defs: {}, song: {}, avoid: new Set() }, used = new Set();
  const out = chainLines(v.shown).map(l => {
    if (!PATTERN.test(l)) return l;
    const r = writeLine(l, o, written, buses, ctx, used), has = Object.keys(r.entry).length > 0;
    if (has) addEntry(table, lineKey(r.text), r.entry);
    entries.push(has ? r.entry : null);
    return r.text;
  });
  for (const name of used) defs[name] = defOf(name, ctx);
  return { code: out.join('\n'), table, entries, voice: v.voice, fns: defs };
}
// a line with its functions written out again (fns: name → { params, chain }), for the checks
export function expandLine(line, fns = {}) {
  let out = line;
  for (let guard = 0; guard < 4; guard++) {
    const cs = calls(out);
    let changed = false;
    for (const c of cs.slice(1)) {
      const f = c.name && fns[c.name];
      if (!f) continue;
      const vals = c.args.trim() ? argParts(c.args).filter((_, k) => k % 2 === 0).map(x => x.trim()) : [];
      c.text = expandParts(partsOf(f.chain, f.params), vals); changed = true;
    }
    if (!changed) break;
    out = cs.map(c => c.text + c.ws).join('');
  }
  return out;
}

// the hidden tail evaluated after the code shown: the mixer (for each pattern line of the code, by the offsets of its
// text, what it gets back) and the hidden voice. entries: the entries of a code written by writeCode (its
// `entries`), taken by the place of each line, for the code as written; without them a line finds its entry by its
// text in the table (an ambiguous text gives only what its lines agree on), and lines edited by hand find the most
// alike line of the table.
// lanes (live-coder in-place edits, code-lanes): for each pattern line of the code, in order, the section and clip
// lanes it plays under (["0!76 1!8 0.5 0!31", …], one value per bar, as `.mask(lane).velocity(lane)` would; a gated
// line "lane x n": as `.mask(lane).postgain(lane.mul(n))`, n one value or one per bar) or null; hidden: lines that
// play without being shown (the last bar of a fade from the section before)
export function tail(shown, { table = new Map(), entries = null, voice = '', like = null, offset = 0, lanes = null, hidden = '' } = {}) {
  const ranges = [];
  let at = offset, k = 0;
  for (const l of chainLines(shown)) {
    if (PATTERN.test(l) && (table.size || entries || lanes)) {
      let e;
      if (entries) e = entries[k] || null;
      else {
        const key = lineKey(l);
        e = table.get(key);
        if (!e && like && table.size) { let best = 0.5; for (const [x, v] of table) { const s = like(x, key); if (s >= best) { best = s; e = v; } } }
      }
      const ln = lanes && lanes[k];
      if (ln && ln.length) e = { ...(e || {}), lanes: ln };
      if (e && Object.keys(e).length) ranges.push([at, at + l.length, e]);
      k++;
    }
    at += l.length + 1;
  }
  // plain JS values: double quotes would be read as mini-notation
  const lit = v => (Array.isArray(v) ? `[${v.map(x => `'${String(x).replace(/[^\w.! ]/g, '')}'`).join(',')}]` : typeof v === 'string' ? `'${v.replace(/[^\w-]/g, '')}'` : String(v));
  const list = ranges.map(([a, b, e]) => `[${a},${b},{${Object.entries(e).map(([k, v]) => `${k}:${lit(v)}`).join(',')}}]`).join(',');
  return (ranges.length ? `\n\nall(x => miskMix(x, [${list}]))` : '') + (hidden ? `\n\n${hidden}` : '') + (voice ? `\n\n${voice}` : '');
}

// the mixer as source text, the same in the app, the render page and the code copied to Strudel (single quotes only:
// double quotes are mini-notation there). A hap of a line gets its bus, visual and level unless the line sets them
// (the line found by the first place of its haps that falls inside a line: a constant such as a section lane can
// come first); a line with section lanes (live-coder in-place edits) plays as with
// `.mask(lane).velocity(lane)` for each lane: its haps cut at the bars, kept where the lane is not 0, the velocity
// the lane's value (the line found by any place of its haps inside it: a shared idea's constant comes first); a gated
// lane ("lane x n", code-lanes) sets the postgain to the lane's value times n instead, as `.postgain(lane.mul(n))`
export const MIX_SOURCE = `(pat, ranges) => {
  const cache = new Map(), lane = s => { let v = cache.get(s); if (!v) { v = []; for (const t of s.trim().split(/ +/)) { const m = t.match(/^([^!]*)(?:!(\\d+))?$/); for (let k = 0; k < (m[2] ? +m[2] : 1); k++) v.push(Number(m[1])); } cache.set(s, v); } return v; };
  const locs = h => (h.context && h.context.locations) || [];
  const mixOf = h => { for (const l of locs(h)) { const r = ranges.find(([a, b]) => l.start >= a && l.start < b); if (r) return r; } return null; };
  const laned = ranges.filter(r => r[2].lanes), laneOf = h => { for (const l of locs(h)) { const r = laned.find(([a, b]) => l.start >= a && l.start < b); if (r) return r; } return null; };
  const at = (v, c) => v[((c % v.length) + v.length) % v.length];
  const cut = (h, list) => { const out = []; for (const s of list) { const [a, b] = s.split(' x '), v = lane(a), m = b === undefined ? null : lane(b); for (const sp of h.part.spanCycles) { const c = Math.floor(sp.begin.valueOf()), x = at(v, c); if (x) out.push(new h.constructor(h.whole, sp, m ? { ...h.value, postgain: x * at(m, c) } : { ...h.value, velocity: x }, h.context)); } } return out; };
  const fill = h => { const r = mixOf(h); if (!r) return h; return h.withValue(v => { const o = { ...v }; for (const [k, x] of Object.entries(r[2])) if (k !== 'lanes' && o[k] === undefined) o[k] = x; return o; }); };
  return pat.withHaps(haps => (laned.length ? haps.flatMap(h => { const r = laneOf(h); return r ? cut(h, r[2].lanes) : [h]; }) : haps).map(fill));
}`;

// the same helpers and functions as Strudel code, for the code copied or opened in Strudel: it plays there as here
// (single quotes only: double quotes are mini-notation); fns: name → { params, chain, lib } of the functions the code
// calls (library first)
export function preludeText(buses = {}, fns = {}) {
  const defs = Object.entries(fns).sort(([a, x], [b, y]) => (y.lib ? 1 : 0) - (x.lib ? 1 : 0) || a.localeCompare(b))
    .map(([k, f]) => `register('${k}', (${[...f.params, 'p'].join(', ')}) => p${f.chain.replace(/"/g, "'")}, false)`);
  return ['// coding-misk: helpers, functions and mixer', `const miskBuses = {${Object.entries(buses).map(([k, v]) => `'${k}': ${v}`).join(', ')}}`,
    "register('chan', (name, pat) => (miskBuses[name] === undefined ? pat : pat.orbit(miskBuses[name])).analyze(name))",
    "register('crunch', (x, pat) => pat.distort(x).distortvol(0.5))",
    ...defs,
    `const miskMix = ${MIX_SOURCE}`,
    '', ''].join('\n');
}

// bus and distortion, the library and the mixer, registered once in a page with Strudel (the app, the render page);
// the buses of the song evaluated are in globalThis.miskBuses (name → orbit), its functions in globalThis.miskFns
// (useFns), both set before it is evaluated
let reg = null;
const made = new Map();
// a function from its template, registered again only when its text changes; its values are passed as they are (not
// sampled per event), so a signal as a value moves as when it is written out
// (Strudel's own register when this copy of the module was not the one installed: a page reloaded by the dev server)
function defineFn(name, f) {
  const key = `${f.params.join()}|${f.chain}`, r = reg || (typeof globalThis.register === 'function' ? globalThis.register : null);
  if (!r || made.get(name) === key) return;
  made.set(name, key);
  // eslint-disable-next-line no-new-func
  r(name, new Function(...f.params, 'p', `return p${f.chain}`), false);
}
export function installHelpers({ register }) {
  reg = register;
  register('chan', (name, pat) => { const n = (globalThis.miskBuses || {})[name]; return (n === undefined ? pat : pat.orbit(n)).analyze(name); });
  register('crunch', (x, pat) => pat.distort(x).distortvol(0.5));
  for (const f of LIBRARY) defineFn(f.name, f);
  useFns(globalThis.miskFns);
  // a hap from a line of the mixer gets its bus, visual and level unless the line sets them, and its section lanes
  // eslint-disable-next-line no-new-func
  globalThis.miskMix = new Function(`return ${MIX_SOURCE}`)();
}
// the song and voice functions of the code evaluated (name → { params, chain }), set before it is evaluated
export function useFns(fns) {
  globalThis.miskFns = fns || {};
  for (const [name, f] of Object.entries(globalThis.miskFns)) if (f && typeof f.chain === 'string') defineFn(name, { params: f.params || [], chain: f.chain });
}

// hand-coded versions saved before song-functions (codeVersion 1): `.o(` → `.chan(`, `.drive(` → `.crunch(`, `.voice("x")`
// → its chain written out (from the version's own prelude, or nothing: the old helper left a line without a chain as it
// was), and the old prelude's helpers renamed. Pure; the rest of the code stays as it is.
export const CODE_VERSION = 2;
export function upgradeCode(code) {
  if (typeof code !== 'string') return code;
  const voices = {}, m = code.match(/^const miskVoices = \{(.*)\}$/m);
  if (m) for (const x of m[1].matchAll(/'([\w-]+)': p => p(.*?)(?=, '[\w-]+': p => |$)/g)) voices[x[1]] = x[2].replace(/'/g, '"');
  return code.split('\n').filter(l => !/^const miskVoices = /.test(l) && !/^register\('voice', /.test(l))
    .map(l => (/^register\('o', /.test(l) ? "register('chan', (name, pat) => (miskBuses[name] === undefined ? pat : pat.orbit(miskBuses[name])).analyze(name))"
      : /^register\('drive', /.test(l) ? "register('crunch', (x, pat) => pat.distort(x).distortvol(0.5))"
        : l === '// coding-misk: short functions and mixer' ? '// coding-misk: helpers, functions and mixer' : l))
    .join('\n')
    .replace(/\.voice\(\s*"([\w-]+)"\s*\)/g, (_, k) => voices[k] || '')
    .replace(/\.o\(/g, '.chan(').replace(/\.drive\(/g, '.crunch(');
}
