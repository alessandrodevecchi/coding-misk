// Checks the knowledge base in docs/knowledge/ (knowledge-base, #74, design D5). No browser.
//   npm run check:knowledge     exit 1 and name the note and what is wrong
// Fails when: a note of the design is missing or not in the index; a note has no front block, a wrong id, a related
// note, a code path or a check that does not exist, or misses a template section; a generated block is out of date
// (tools/knowledge.mjs regenerates in memory and compares); a style, console command, profile, profile control,
// comment or technical function option, growth opening, pace or development, helper, radio option or other listed
// value of the code is not in its note (named in backticks), or has no help text in the app and is not described by
// hand outside the generated blocks; a link to a file or a heading does not resolve; a code example does not compile
// (JavaScript syntax, mini-notation of every double-quoted string, every call a Strudel function of the catalog or an
// app name); a JSON example does not parse; a note uses a long dash. Warns when a note is longer than 150 lines.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseJs } from 'acorn';
import { parse as parseMini } from '../node_modules/@strudel/mini/krill-parser.js';
import { generate, lists, applyBlocks, blockNames, handText, DIR, ROOT } from './knowledge.mjs';
import { scanCalls, isAppName } from './strudel-code.mjs';
import { lookup } from './strudel-functions.mjs';

// the notes of the design (D1): the concepts every agent needs
export const NOTES = ['README', 'strudel', 'profiles', 'live-build', 'growth-shapes', 'comments-and-functions', 'songs', 'ideas', 'patterns', 'material', 'styles', 'artists', 'radio', 'radio-commands', 'voice', 'narrator', 'export', 'library', 'settings', 'decisions'];
// notes with the template sections (D2); the index and the decisions have their own shape
const TEMPLATE = ['What it is', 'How it connects', 'Options', 'Example', 'Where to read more'];
const NO_TEMPLATE = ['README', 'decisions'];
const MAX_LINES = 150;

const problems = [], warnings = [];
const fail = (note, msg) => problems.push(`${note}.md: ${msg}`);
const rel = p => path.relative(ROOT, p);
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort();
const ids = files.map(f => f.slice(0, -3));
const notes = Object.fromEntries(files.map(f => [f.slice(0, -3), fs.readFileSync(path.join(DIR, f), 'utf8')]));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// ---------- structure ----------
for (const id of NOTES) if (!notes[id]) problems.push(`docs/knowledge/${id}.md is missing (a note of the design)`);
const index = notes.README || '';
for (const id of ids) if (id !== 'README' && !new RegExp(`\\]\\(\\.?/?${id}\\.md[)#]`).test(index)) fail('README', `does not list ${id}.md`);

// front block: id, related, code, checks
function front(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const v = kv[2].trim();
    out[kv[1]] = v.startsWith('[') ? v.replace(/^\[|\]$/g, '').split(',').map(x => x.trim()).filter(Boolean) : v;
  }
  return out;
}
function checkCommand(note, cmd) {
  const npm = cmd.match(/^npm run ([\w:-]+)/), node = cmd.match(/^node (?:--no-warnings )?(tools\/[\w./-]+)/);
  if (npm) { if (!pkg.scripts[npm[1]]) fail(note, `check "${cmd}": no script "${npm[1]}" in package.json`); }
  else if (node) { if (!fs.existsSync(path.join(ROOT, node[1]))) fail(note, `check "${cmd}": ${node[1]} does not exist`); }
  else fail(note, `check "${cmd}": not an npm script or a node tools/ command`);
}
for (const [id, text] of Object.entries(notes)) {
  if (id === 'README') continue;
  const f = front(text);
  if (!f) { fail(id, 'no front block (--- id, related, code, checks ---)'); continue; }
  if (f.id !== id) fail(id, `front block id is "${f.id}", not "${id}"`);
  for (const r of f.related || []) if (!notes[r]) fail(id, `related note "${r}" does not exist`);
  for (const c of f.code || []) if (!fs.existsSync(path.join(ROOT, c))) fail(id, `code path ${c} does not exist`);
  for (const c of f.checks || []) checkCommand(id, c);
  if (!NO_TEMPLATE.includes(id)) for (const s of TEMPLATE) if (!new RegExp(`^## ${s}$`, 'm').test(text)) fail(id, `no section "## ${s}" (note template, design D2)`);
}

// ---------- generated blocks ----------
const fresh = {};
let generated = [];
try { generated = generate(); } catch (e) { problems.push(`the generator failed (an example no longer builds): ${e.message}`); }
for (const b of generated) (fresh[b.note] ||= {})[b.name] = b.text;
for (const [note, blocks] of Object.entries(fresh)) {
  const cur = notes[note];
  if (cur === undefined) { fail(note, `missing, but blocks ${Object.keys(blocks).join(', ')} are generated for it`); continue; }
  const names = blockNames(cur);
  for (const n of Object.keys(blocks)) if (!names.includes(n)) fail(note, `no marker for the generated block "${n}"`);
  for (const n of names) if (!(n in blocks)) fail(note, `block "${n}" is generated by nothing`);
  const next = applyBlocks(cur, blocks);
  if (next !== cur) {
    const stale = names.filter(n => n in blocks && applyBlocks(cur, { [n]: blocks[n] }) !== cur);
    fail(note, `generated blocks out of date (${stale.join(', ')}): run npm run knowledge`);
  }
}
for (const [note, text] of Object.entries(notes)) if (!fresh[note]) for (const n of blockNames(text)) fail(note, `block "${n}" is generated by nothing`);

// ---------- coverage ----------
let covered = 0;
for (const { list, note, items } of lists()) {
  const all = notes[note] || '', hand = handText(all);
  for (const { id, described } of items) {
    const tick = `\`${id}\``;
    if (!all.includes(tick)) fail(note, `${list} ${tick} is not in the note: run npm run knowledge, or describe it`);
    else if (!described && !hand.includes(tick)) fail(note, `${list} ${tick} has no help text in the app: describe it by hand outside the generated blocks`);
    else covered++;
  }
}

// ---------- links ----------
const slug = h => h.trim().toLowerCase().replace(/<[^>]+>/g, '').replace(/[`*_~]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
const anchorsCache = new Map();
function anchorsOf(file) {
  if (!anchorsCache.has(file)) {
    const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, ''), seen = new Map(), out = new Set();
    for (const m of text.matchAll(/^#{1,6}\s+(.*)$/gm)) { const s = slug(m[1]), n = seen.get(s) || 0; out.add(n ? `${s}-${n}` : s); seen.set(s, n + 1); }
    for (const m of text.matchAll(/\b(?:id|name)="([^"]+)"/g)) out.add(m[1]);
    anchorsCache.set(file, out);
  }
  return anchorsCache.get(file);
}
let links = 0;
for (const [id, text] of Object.entries(notes)) {
  const body = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/i.test(target)) { if (/^http:/i.test(target)) fail(id, `link ${target}: use https`); continue; }
    links++;
    const [p, anchor] = target.split('#'), file = p ? path.resolve(DIR, p) : path.join(DIR, `${id}.md`);
    if (!fs.existsSync(file)) { fail(id, `broken link ${target}: ${rel(file)} does not exist`); continue; }
    if (anchor && file.endsWith('.md') && !anchorsOf(file).has(anchor)) fail(id, `broken link ${target}: no heading "#${anchor}" in ${rel(file)}`);
  }
}

// ---------- code examples ----------
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'strudel', 'functions.json'), 'utf8')), L = lookup(catalog);
function miniStrings(node, out) {
  if (!node || typeof node.type !== 'string') return out;
  if (node.type === 'Literal' && typeof node.value === 'string' && node.raw.startsWith('"')) out.push(node.value);
  if (node.type === 'TemplateLiteral') out.push(node.quasis.map(q => q.value.cooked).join(''));
  for (const [k, v] of Object.entries(node)) if (k !== 'loc' && v && typeof v === 'object') (Array.isArray(v) ? v : [v]).forEach(x => miniStrings(x, out));
  return out;
}
let examples = 0;
for (const [id, text] of Object.entries(notes)) {
  for (const m of text.matchAll(/```(js|json)\n([\s\S]*?)```/g)) {
    const [, lang, src] = m, where = `${lang} example "${src.trim().split('\n')[0].slice(0, 60)}"`;
    examples++;
    if (lang === 'json') { try { JSON.parse(src); } catch (e) { fail(id, `${where} is not JSON: ${e.message}`); } continue; }
    let ast;
    try { ast = parseJs(src, { ecmaVersion: 'latest', sourceType: 'script' }); } catch (e) { fail(id, `${where} does not parse: ${e.message}`); continue; }
    for (const s of miniStrings(ast, [])) { try { parseMini(`"${s}"`); } catch (e) { fail(id, `${where}: mini-notation "${s}" does not parse: ${e.message.split('\n')[0]}`); } }
    for (const name of scanCalls(src)) if (!L.has(name) && !isAppName(name)) fail(id, `${where} calls ${name}(), neither a Strudel function of the catalog nor an app name`);
  }
}

// ---------- writing ----------
for (const [id, text] of Object.entries(notes)) {
  text.split('\n').forEach((l, i) => { if (/[—–]/.test(l)) fail(id, `line ${i + 1} has a long dash: write two sentences or use a colon`); });
  const n = text.split('\n').length;
  if (n > MAX_LINES) warnings.push(`${id}.md has ${n} lines (target under ${MAX_LINES})`);
}

for (const w of warnings) console.log(`warn  ${w}`);
for (const p of problems) console.log(`FAIL  ${p}`);
console.log(problems.length ? `${problems.length} problems` : `ok    knowledge: ${files.length} notes, ${generated.length} generated blocks up to date, ${covered} listed values covered, ${links} links and ${examples} examples checked`);
process.exit(problems.length ? 1 : 0);
