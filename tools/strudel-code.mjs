// The code the app generates, and the functions it calls (strudel-catalog, #69, design D3 and D4). No browser.
// codeSet(): every song in songs/ and songs/examples/ (compileSong); every live build of those songs in each profile
// and each technical functions preset, every step (crescendoSong or the song's build, through liveCode); one radio session per
// style with a fixed seed, each song compiled and built the same way; the prelude of the helpers (preludeText).
// scanCalls(code): the names called in a code, skipping strings, template strings, comments, local names and
// JavaScript built-ins.
// codeScan() (faster-checks): the names called by every code of codeSet(), in the same order, from the shared code
// cache (tools/code-cache.mjs). The set is cut in groups (a song with its live builds, a style's radio session, the
// prelude); a group whose inputs (its song file or the recipes, and the code of this tool with its imports) did not
// change is read from the cache, the others are generated in worker processes (tools/check-pool.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheKey, cacheGet, cachePut, fileText } from './code-cache.mjs';
import { runPool } from './check-pool.mjs';
import { compileSong } from '../src/song/compile.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules, PROFILE_IDS } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps, deriveBuild } from '../src/song/build.js';
import { preludeText, FUNCTIONS, HELPERS } from '../src/song/writer.js';
import { ALL_NAMES, LIBRARY } from '../src/song/functions.js';
import { generateSession } from '../src/endless/director.js';
import { loadStyles } from './styles-dir.mjs';
import { songFiles } from './songs-dir.mjs';
import { ROOT } from './strudel-functions.mjs';

export { HELPERS };
// names the app gives: helpers, library functions, the words of song functions (a word with a number when a song
// used up its list)
export const APP_NAMES = [...new Set([...HELPERS, ...ALL_NAMES])];
export const isAppName = name => APP_NAMES.includes(name) || ALL_NAMES.includes(name.replace(/\d+$/, ''));
export const KINDS = ['songs', 'live', 'radio', 'prelude'];
export const RADIO_MINUTES = 10;
export const radioSeed = style => `catalog-${style}`;

const JS_GLOBALS = new Set(['Math', 'Object', 'Array', 'JSON', 'String', 'Number', 'Boolean', 'console', 'Date', 'Promise', 'Symbol', 'Map', 'Set', 'WeakMap', 'RegExp', 'Error', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'globalThis', 'window', 'Function', 'Reflect', 'Infinity', 'NaN', 'undefined']);
const JS_METHODS = new Set(['find', 'findIndex', 'map', 'filter', 'forEach', 'reduce', 'some', 'includes', 'indexOf', 'slice', 'splice', 'join', 'split', 'push', 'pop', 'shift', 'unshift', 'concat', 'entries', 'keys', 'values', 'toString', 'toFixed', 'replace', 'trim', 'startsWith', 'endsWith', 'has', 'call', 'bind', 'flat', 'flatMap', 'sort', 'reverse', 'at']);
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'typeof', 'new', 'await', 'async', 'do', 'else', 'in', 'of', 'with', 'yield', 'void', 'delete', 'instanceof', 'super', 'this', 'class', 'const', 'let', 'var']);

// the code with strings, template strings and comments blanked (same length)
export function blank(code) {
  let out = '', i = 0;
  while (i < code.length) {
    const c = code[i], d = code[i + 1];
    if (c === '/' && d === '/') { const j = code.indexOf('\n', i); const e = j < 0 ? code.length : j; out += ' '.repeat(e - i); i = e; continue; }
    if (c === '/' && d === '*') { const j = code.indexOf('*/', i + 2); const e = j < 0 ? code.length : j + 2; out += code.slice(i, e).replace(/[^\n]/g, ' '); i = e; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < code.length && code[j] !== c) j += code[j] === '\\' ? 2 : 1;
      out += c + code.slice(i + 1, j).replace(/[^\n]/g, ' ') + (j < code.length ? c : ''); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}
const idents = s => s.match(/[A-Za-z_$][\w$]*/g) || [];
// names declared in the code: const, let, var (with destructuring), function names and parameters, arrow parameters
export function localNames(b) {
  const out = new Set();
  for (const m of b.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  for (const m of b.matchAll(/\b(?:const|let|var)\s*([[{][^\]}]*[\]}])/g)) idents(m[1]).forEach(n => out.add(n));
  for (const m of b.matchAll(/\bfunction\s*([A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g)) { if (m[1]) out.add(m[1]); idents(m[2]).forEach(n => out.add(n)); }
  for (const m of b.matchAll(/\(([^()]*)\)\s*=>/g)) idents(m[1]).forEach(n => out.add(n));
  for (const m of b.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) out.add(m[1]);
  return out;
}
// every name called in a code: an identifier followed by `(`, with or without a leading `.`
export function scanCalls(code) {
  const b = blank(code), locals = localNames(b), out = new Set();
  for (const m of b.matchAll(/(\.\s*)?([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = m[2], before = b.slice(Math.max(0, m.index - 60), m.index);
    if (m[1]) {
      // a method: skip those of JavaScript values (Object.entries, a local list's .find)
      const recv = before.match(/([A-Za-z_$][\w$]*)\s*$/);
      if (recv && JS_GLOBALS.has(recv[1])) continue;
      if (recv && locals.has(recv[1]) && JS_METHODS.has(name)) continue;
    } else {
      if (KEYWORDS.has(name) || locals.has(name) || JS_GLOBALS.has(name)) continue;
      if (/\b(?:new|function)\s+$/.test(before)) continue;
    }
    out.add(name);
  }
  return out;
}

// the samples manifest of the spoken comments: names only, the code does not depend on the files
const VOICE_FILES = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };
// the live builds of a song: every profile and functions option, every step → [{ source, code }]
function* liveBuilds(song, source) {
  for (const profile of PROFILE_IDS) {
    // the build depends on the profile only: the technical functions preset changes how it is written
    const P = resolveProfile(profile);
    const b = P.build === 'crescendo' ? crescendoSong(song, { narrated: P.narrated, rules: growthRules(P) }) : { ...song, build: song.build || deriveBuild(song) };
    for (const functions of FUNCTIONS) {
      const C = resolveProfile(profile, { functions });
      const L = liveCode(b, C, { lang: () => 'en', files: () => VOICE_FILES, cols: () => 60 });
      const seen = new Set();
      for (const bar of [0, ...new Set(buildSteps(L.build).map(x => x.at))]) {
        const shown = L.codeAt(bar), code = L.run ? L.run(shown) : shown;
        if (seen.has(code)) continue;
        seen.add(code);
        yield { source: `${source} (${profile}, ${functions})`, code };
      }
    }
  }
}
// the groups of the code set, in its order: every song file, one radio session per style, the prelude
export function codeGroups() {
  const files = songFiles(path.join(ROOT, 'songs')).filter(f => !f.includes(`${path.sep}endless${path.sep}`)).map(f => path.relative(ROOT, f));
  return [...files.map(file => ({ id: file, kind: 'song', file })), ...loadStyles().map(r => ({ id: `radio ${r.id}`, kind: 'radio', style: r.id })), { id: 'prelude', kind: 'prelude' }];
}
// the codes of a group: [{ kind, source, code }] (a song gives its compiled code, kind songs, then its live builds)
export function* groupCodes(g) {
  if (g.kind === 'song') {
    const song = JSON.parse(fs.readFileSync(path.join(ROOT, g.file), 'utf8'));
    yield { kind: 'songs', source: g.file, code: compileSong(song) };
    for (const x of liveBuilds(song, g.file)) yield { kind: 'live', ...x };
  } else if (g.kind === 'radio') {
    const recipes = loadStyles(), r = recipes.find(x => x.id === g.style);
    const { songs: radio } = generateSession(recipes, { styles: [r.id], minutes: RADIO_MINUTES, seed: radioSeed(r.id) });
    for (const [i, song] of radio.entries()) {
      const source = `radio ${r.id} #${i + 1}`;
      yield { kind: 'radio', source, code: compileSong(song) };
      for (const x of liveBuilds(song, source)) yield { kind: 'radio', ...x };
    }
  } else {
    const lib = Object.fromEntries(LIBRARY.map(f => [f.name, { params: f.params, chain: f.chain, lib: true }]));
    // the mixer (miskMix, MIX_SOURCE) is plain JavaScript over haps, not Strudel calls: left out of the scan
    const pre = preludeText({ bass: 2 }, { ...lib, mouth: { params: [], chain: '.lpf(2000).room(0.3)' } });
    yield { kind: 'prelude', source: 'preludeText', code: pre.slice(0, pre.indexOf('const miskMix = ')) };
  }
}
// the code set: [{ kind, source, code }], in a fixed order (every song's compiled code, then every song's live builds,
// then the radio sessions, then the prelude)
export function* codeSet() {
  const groups = codeGroups(), songs = groups.filter(g => g.kind === 'song'), later = [];
  for (const g of songs) { const it = groupCodes(g); yield it.next().value; later.push(it); }
  for (const it of later) yield* it;
  for (const g of groups.filter(x => x.kind !== 'song')) yield* groupCodes(g);
}

// the scan of a group: [[kind, source, names]] (the task a worker runs)
export function runTask(g) {
  const seen = new Map();
  return [...groupCodes(g)].map(({ kind, source, code }) => { if (!seen.has(code)) seen.set(code, [...scanCalls(code)]); return [kind, source, seen.get(code)]; });
}
const ENTRY = 'tools/strudel-code.mjs';
const stylesText = () => fs.readdirSync(path.join(ROOT, 'styles')).filter(f => f.endsWith('.json')).sort().map(f => `${f}\0${fileText(`styles/${f}`)}`).join('\0');
const groupKey = (g, styles) => cacheKey(ENTRY, g.kind, g.id, g.kind === 'song' ? fileText(g.file) : g.kind === 'radio' ? styles : '');
// the scan of the whole code set, in the order of codeSet(): [{ kind, source, names }]; groups from the cache or
// generated in workers
export async function codeScan() {
  const groups = codeGroups(), styles = stylesText(), keys = groups.map(g => groupKey(g, styles)), scans = keys.map(k => cacheGet('code', k));
  const todo = groups.map((g, i) => i).filter(i => scans[i] === undefined);
  if (todo.length) {
    const out = await runPool(fileURLToPath(import.meta.url), todo.map(i => groups[i]), { name: 'strudel-code' });
    out.forEach((r, k) => { scans[todo[k]] = r; cachePut('code', keys[todo[k]], r); });
  }
  const items = [], song = groups.map((g, i) => (g.kind === 'song' ? i : -1)).filter(i => i >= 0);
  const push = rows => rows.forEach(([kind, source, names]) => items.push({ kind, source, names }));
  for (const i of song) push(scans[i].slice(0, 1));
  for (const i of song) push(scans[i].slice(1));
  groups.forEach((g, i) => { if (g.kind !== 'song') push(scans[i]); });
  return items;
}

// every call of the code set: name → { kind → Set(source) }, plus how many codes were read
export function collectCalls(set = codeSet()) {
  const cache = new Map();
  // a song's live builds repeat codes: scan each text once
  return collectNames((function* () { for (const { kind, source, code } of set) { if (!cache.has(code)) cache.set(code, scanCalls(code)); yield { kind, source, names: cache.get(code) }; } })());
}
// the same from scanned codes ([{ kind, source, names }], codeScan())
export function collectNames(items) {
  const calls = new Map();
  let codes = 0;
  for (const { kind, source, names } of items) {
    codes++;
    const src = source.replace(/ \(.*\)$/, '');
    for (const name of names) {
      if (!calls.has(name)) calls.set(name, {});
      const k = calls.get(name);
      (k[kind] ||= { sources: new Set(), first: [] }).sources.add(src);
      if (k[kind].first.length < 3 && !k[kind].first.includes(source)) k[kind].first.push(source);
    }
  }
  return { calls, codes };
}

// the coverage of a catalog: entry name → { songs, live, radio, prelude (how many sources write it), as (the names
// written: the entry name or its synonyms) }, for the functions the code writes; unknown: names neither in the
// catalog nor app names → { kind → first sources }. App names come first (helpers, library, song function words):
// they never count as Strudel's, and check:strudel fails when one of them is a Strudel name.
export function coverageOf(catalog, { calls, codes }, lookupMap) {
  const functions = {}, unknown = {};
  for (const name of [...calls.keys()].sort()) {
    const k = calls.get(name), entry = lookupMap.get(name);
    if (isAppName(name)) continue;
    if (!entry) { unknown[name] = Object.fromEntries(KINDS.filter(x => k[x]).map(x => [x, k[x].first])); continue; }
    const f = (functions[entry] ||= { ...Object.fromEntries(KINDS.map(x => [x, new Set()])), as: new Set() });
    f.as.add(name);
    for (const x of KINDS) if (k[x]) k[x].sources.forEach(s => f[x].add(s));
  }
  const out = {};
  for (const name of Object.keys(functions).sort()) {
    const f = functions[name];
    out[name] = { ...Object.fromEntries(KINDS.map(x => [x, f[x].size])), as: [...f.as].sort() };
  }
  return { source: { packages: catalog.source.packages, codes }, functions: out, unknown };
}
// app names (helpers, library functions, song function words) with the name of a Strudel function or synonym: name →
// entry name
export const shadowed = lookupMap => Object.fromEntries(APP_NAMES.filter(h => lookupMap.has(h)).map(h => [h, lookupMap.get(h)]));
