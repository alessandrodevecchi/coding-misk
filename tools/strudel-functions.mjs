// The functions of the installed Strudel, read from the package sources (strudel-catalog, #69, design D1).
// Each `/** ... */` block with `@name` is a documented function: its synonyms (`@synonyms`, `@alias`), description,
// parameters and examples. Names the packages register or declare without a `@name` block are added as undocumented
// (`documented: false`); an unnamed comment right before the declaration, when there is one, gives their description
// and examples. No network, no browser: the result depends only on the files in node_modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// the packages read: the musical ones the app loads (not @strudel/hydra, not @strudel/codemirror)
export const PACKAGES = ['@strudel/core', '@strudel/mini', '@strudel/tonal', '@strudel/draw', '@strudel/webaudio', '@strudel/midi', '@strudel/soundfonts', '@strudel/repl', 'superdough'];
export const LICENCE = 'AGPL-3.0-or-later';
export const URL = 'https://strudel.cc';
export const REPO = 'https://codeberg.org/uzu/strudel';
export const AUTHORS = 'the Strudel contributors';
// line labels the REPL handles (@strudel/core repl.mjs): not functions
export const LABELS = [
  { label: '$:', note: 'A pattern line: each `$:` line plays at the same time as the others.' },
  { label: 'S$:', note: 'Solo: when one or more lines start with `S$:`, only those lines play.' },
  { label: '_$:', note: 'Mute: a line whose label starts (or ends) with `_` does not play.' },
];

const pkgDir = name => path.join(ROOT, 'node_modules', name);
export const installedVersions = () => Object.fromEntries(PACKAGES.map(p => [p, JSON.parse(fs.readFileSync(path.join(pkgDir(p), 'package.json'), 'utf8')).version]));
export const attribution = packages => `Function documentation extracted from Strudel (strudel.cc, source codeberg.org/uzu/strudel), packages and versions read: ${Object.entries(packages).map(([k, v]) => `${k} ${v}`).join(', ')}; licence ${LICENCE}, by ${AUTHORS}.`;

// the source files of a package: *.mjs outside dist/, test/, bench/ and node_modules/, sorted
function sources(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { if (!['dist', 'test', 'tests', 'bench', 'node_modules'].includes(e.name)) out.push(...sources(dir, r)); }
    else if (e.name.endsWith('.mjs')) out.push(r);
  }
  return out;
}

// a JSDoc block → { name, synonyms, description, params, examples }
const clean = s => s.replace(/[ \t]+$/gm, '').replace(/^\n+|\n+$/g, '');
export function parseBlock(body) {
  const lines = body.split('\n').map(l => l.replace(/^\s*\*? ?/, ''));
  const out = { name: null, synonyms: [], description: '', params: [], examples: [] };
  let tag = 'description', buf = [];
  const flush = () => {
    const text = buf.join('\n');
    if (tag === 'description') out.description = clean(text);
    else if (tag === 'example') { const t = clean(text); if (t) out.examples.push(t); }
    else if (tag === 'param') {
      const m = text.trim().match(/^(?:\{((?:[^{}]|\{[^{}]*\})*)\}\s*)?(\[[^\]]*\]|[\w$.]+)?\s*([\s\S]*)$/);
      if (m && m[2]) out.params.push({ name: m[2].replace(/^\[|\]$/g, '').split('=')[0], type: (m[1] || '').trim(), description: clean(m[3].replace(/\s*\n\s*/g, ' ')) });
    }
    buf = [];
  };
  for (const l of lines) {
    const t = l.match(/^\s*@(\w+)\s?(.*)$/);
    if (!t) { buf.push(l); continue; }
    flush();
    tag = t[1];
    const rest = t[2].trim();
    if (tag === 'name') out.name = rest.split(/\s+/)[0] || null;
    else if (tag === 'synonyms' || tag === 'alias') out.synonyms.push(...rest.split(/[\s,]+/).filter(Boolean));
    else if (tag === 'param' || tag === 'example') buf.push(t[2]);
    else tag = 'other';
  }
  flush();
  return out;
}

// the string literals of an argument list (stops at the first non-literal argument)
const literals = args => {
  const out = [];
  for (const m of args.matchAll(/\s*(?:'([^']*)'|"([^"]*)")\s*,?/gy)) out.push(m[1] ?? m[2]);
  return out;
};
// a source with its comments blanked (same length, so offsets stay): code in comments and examples is not registered
export function blankComments(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const j = src.indexOf('\n', i); const e = j < 0 ? src.length : j; out += ' '.repeat(e - i); i = e; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); const e = j < 0 ? src.length : j + 2; out += src.slice(i, e).replace(/[^\n]/g, ' '); i = e; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c && !(c !== '`' && src[j] === '\n')) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}
// the names a file puts in the evaluation scope with an object literal: evalScope({ all, each, setcps: setCps })
const scopeKeys = src => [...src.matchAll(/\bevalScope\(\s*\{([^}]*)\}\s*\)/g)].flatMap(m => m[1].split(',').map(s => s.trim().split(/\s*:\s*/)[0]).filter(s => /^[\w$]+$/.test(s)));
// registrations in a source (comments blanked): [{ names: [name, ...synonyms], at }]
function registrations(src) {
  const out = scopeKeys(src).map(k => ({ names: [k], at: 0 }));
  // register('name' | ['a', 'b'], ...) and registerControl('name' | ['name', 'param'], ...aliases)
  for (const m of src.matchAll(/\b(register|registerControl)\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")((?:\s*,\s*(?:'[^']*'|"[^"]*"))*)/g)) {
    const first = m[2].startsWith('[') ? literals(m[2].slice(1, -1)) : literals(m[2]);
    if (!first.length) continue;
    // a control's array lists the name and the values it takes (s, n, gain): only the first is a name
    const names = m[1] === 'register' ? first : [first[0], ...literals(m[3].replace(/^\s*,/, ''))];
    out.push({ names, at: m.index });
  }
  // registerMultiControl(names, max, ...aliases): name, name2..nameN, with aliases alias, alias1, alias2..aliasN
  for (const m of src.matchAll(/\bregisterMultiControl\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")\s*,\s*(\d+)((?:\s*,\s*(?:'[^']*'|"[^"]*"))*)\s*\)/g)) {
    const names = m[1].startsWith('[') ? literals(m[1].slice(1, -1)) : literals(m[1]), max = +m[2], aliases = literals(m[3].replace(/^\s*,/, ''));
    for (let i = 1; i <= max; i++) {
      if (i === 1) out.push({ names: [names[0], ...aliases, ...aliases.map(a => `${a}1`), `${names[0]}1`], at: m.index });
      else out.push({ names: [`${names[0]}${i}`, ...aliases.map(a => `${a}${i}`)], at: m.index });
    }
  }
  // addToPrototype('name', ...)
  for (const m of src.matchAll(/\baddToPrototype\(\s*'([^']+)'/g)) out.push({ names: [m[1]], at: m.index });
  return out;
}
// the names a declaration right after a comment declares
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'constructor', 'new', 'typeof']);
// only names code can call: exported, on the Pattern prototype, a method of the Pattern class, or in the evaluation
// scope (scope: the evalScope names of the file)
function declared(after, { file, scope }) {
  let m;
  if ((m = after.match(/^export\s+(?:async\s+)?function\*?\s+([\w$]+)/)) || (m = after.match(/^export\s+(?:const|let|var)\s+([\w$]+)\s*=/))) return [m[1]];
  if ((m = after.match(/^(?:const|let|var)\s+([\w$]+)\s*=/)) && scope.includes(m[1])) return [m[1]];
  if ((m = after.match(/^export\s+const\s+\{([^}]*)\}\s*=/))) return m[1].split(',').map(s => s.trim().split(/\s*:\s*/).pop()).filter(s => /^[\w$]+$/.test(s));
  if ((m = after.match(/^Pattern\.prototype\.([\w$]+)\s*=/))) return [m[1]];
  if (file === 'pattern.mjs' && (m = after.match(/^(?:async\s+|get\s+)?([\w$]+)\s*\([^)]*\)\s*\{/)) && !KEYWORDS.has(m[1])) return [m[1]];
  return [];
}

// every entry of the catalog, sorted by name
export function readFunctions() {
  const packages = installedVersions(), named = [], unnamed = [], registered = [];
  for (const pkg of PACKAGES) {
    const dir = pkgDir(pkg);
    for (const file of sources(dir)) {
      const src = fs.readFileSync(path.join(dir, file), 'utf8'), code = blankComments(src), scope = scopeKeys(code);
      const where = { package: pkg, file };
      for (const m of src.matchAll(/\/\*\*(?!\*)([\s\S]*?)\*\//g)) {
        const b = parseBlock(m[1]);
        const after = src.slice(m.index + m[0].length).replace(/^\s+/, '');
        if (b.name) { named.push({ ...b, ...where }); continue; }
        // an unnamed comment documents the declaration right after it (as JSDoc reads it)
        let names = declared(after, { file, scope });
        if (!names.length) { const r = registrations(blankComments(after.slice(0, 400))).find(x => x.at === 0 || /^(?:export\s+)?(?:const\s+[\w${}\s,]+=\s*)?$/.test(after.slice(0, x.at).replace(/\s+/g, ' '))); if (r) names = r.names; }
        if (names.length) unnamed.push({ ...b, name: names[0], synonyms: [...new Set([...names.slice(1), ...b.synonyms])], ...where });
      }
      for (const r of registrations(code)) registered.push({ name: r.names[0], synonyms: r.names.slice(1), ...where });
    }
  }
  // documented first, then unnamed comments, then plain registrations; a name already known (as a name or a
  // synonym) adds only its new synonyms
  const byName = new Map(), owner = new Map();
  const add = (e, documented) => {
    const known = owner.get(e.name);
    const target = known ? byName.get(known) : null;
    if (target) {
      // the same function registered under more names
      for (const s of e.synonyms) if (!owner.has(s)) { target.synonyms.push(s); owner.set(s, target.name); }
      if (documented && !target.documented) Object.assign(target, { ...e, synonyms: target.synonyms, documented: true });
      return;
    }
    const entry = { name: e.name, synonyms: [], description: e.description || '', params: e.params || [], examples: e.examples || [], package: e.package, file: e.file, documented };
    byName.set(e.name, entry); owner.set(e.name, e.name);
    for (const s of e.synonyms) if (!owner.has(s)) { entry.synonyms.push(s); owner.set(s, e.name); }
  };
  named.forEach(e => add(e, true));
  // a registered name an unnamed comment also covers gets that comment
  unnamed.forEach(e => add(e, false));
  registered.forEach(e => add(e, false));
  const order = (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : a < b ? -1 : a > b ? 1 : 0);
  const functions = [...byName.values()].map(e => ({ name: e.name, synonyms: [...e.synonyms].sort(order), description: e.description, params: e.params.map(p => ({ name: p.name, type: p.type, description: p.description })), examples: e.examples, package: e.package, file: e.file, documented: e.documented })).sort((a, b) => order(a.name, b.name));
  return { source: { text: attribution(packages), packages, licence: LICENCE, url: URL, repository: REPO, authors: AUTHORS }, labels: LABELS, functions };
}

// name or synonym → entry name
export function lookup(catalog) {
  const m = new Map();
  for (const f of catalog.functions) { m.set(f.name, f.name); for (const s of f.synonyms) if (!m.has(s)) m.set(s, f.name); }
  return m;
}
