// Checks the knowledge base in docs/knowledge/ (knowledge-base, #74, design D5). No browser.
//   npm run check:knowledge     exit 1 and name the note and what is wrong
// Ready for a task (requirements Ready for a task, Inventories, Catalog freshness): also fails when a task of the
// spec has no recipe, a task of the index links no recipe or a recipe is not in the index, a recipe misses Files,
// Steps, Checks or Mistakes, an inventory block is missing (or stale, like every generated block), or a function the
// app writes under a synonym is listed as not written.
// Warns, without failing (faster-checks): when the Strudel coverage is older than its inputs (docs/strudel/inputs.json
// against a fresh hash: rebuild it with npm run catalog:strudel when Strudel, the generator or the app functions
// change, and before a merge to main), and when the only stale generated block is the list of open changes in
// status.md (it mirrors openspec/changes/ and moves with every new change or ticked task: npm run knowledge).
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
import { generate, lists, applyBlocks, blockNames, handText, usedStrudel, DIR, ROOT } from './knowledge.mjs';
import { inputsStamp, FILES as CATALOG_FILES } from './strudel-catalog.mjs';
import { scanCalls, isAppName } from './strudel-code.mjs';
import { lookup } from './strudel-functions.mjs';

// the notes of the design (D1): the concepts every agent needs
export const NOTES = ['README', 'strudel', 'strudel-functions', 'profiles', 'live-build', 'growth-shapes', 'comments-and-functions', 'songs', 'ideas', 'patterns', 'material', 'styles', 'artists', 'radio', 'radio-commands', 'voice', 'narrator', 'export', 'library', 'settings', 'decisions',
  // ready for a task: inventories, safe-change areas, recipes, references, checks, pitfalls, glossary, status
  'sounds', 'sound-and-levels', 'music-engine', 'visuals', 'recipes-music', 'recipes-parts', 'recipes-build', 'recipes-app', 'from-a-reference', 'checks', 'pitfalls', 'glossary', 'status'];
// notes with the template sections (D2); the others have their own shape, checked below
const TEMPLATE = ['What it is', 'How it connects', 'Options', 'Example', 'Where to read more'];
const RECIPE_NOTES = ['recipes-music', 'recipes-parts', 'recipes-build', 'recipes-app'];
const SHAPES = {
  'from-a-reference': ['Inputs to ask for', 'What to measure', 'Tools', 'Worked examples', 'From measures to recipe fields', 'Ideas not built yet', 'Where references are kept'],
  checks: ['Which checks to run', 'Every check', 'Fixtures and versions'],
  pitfalls: ['Strudel', 'Sound and levels', 'Generated code and fixtures', 'Browser checks', 'Writing'],
  glossary: ['Words we use', 'Interface terms'],
  status: ['Open changes', 'Open issues'],
};
const NO_TEMPLATE = ['README', 'decisions', ...RECIPE_NOTES, ...Object.keys(SHAPES)];
// every recipe has these parts (Ready for a task)
const RECIPE_PARTS = ['Files', 'Steps', 'Checks', 'Mistakes'];
// the tasks of the spec (requirement Ready for a task): each one has a recipe under this heading
export const REQUIRED_TASKS = ['Define an artist', 'Generate an artist', 'Define a style', 'Add a sound or an instrument', 'Write a song', 'Add a preset', 'Add a pattern', 'Add a generator rule', 'Add a growth opening or move', 'Add a radio command', 'Add a profile control or option', 'Add a technical or library function', 'Add a check', 'Update Strudel', 'Add interface text in both languages', 'Export audio, video or fragments', 'Fix a level or clipping problem'];
// inventory blocks (requirement Inventories): they must exist; the generated-block check keeps them current
const INVENTORY = { sounds: ['synths', 'soundfonts', 'drum-machines', 'samples', 'fm-and-guitars', 'asked', 'missing'], 'music-engine': ['keys', 'progressions', 'presets', 'energy-shapes'], 'sound-and-levels': ['rack-devices', 'levels'], visuals: ['looks', 'video-options'], glossary: ['glossary'], status: ['changes'], checks: ['checks', 'fixtures'] };
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
  for (const s of SHAPES[id] || []) if (!new RegExp(`^## ${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm').test(text)) fail(id, `no section "## ${s}"`);
}

// ---------- recipes and tasks ----------
const slugOf = h => h.trim().toLowerCase().replace(/<[^>]+>/g, '').replace(/[`*_~]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
// every recipe: a ### heading in a recipe note, with its parts as bold labels before the next heading
const recipes = new Map();
for (const id of RECIPE_NOTES) {
  const text = notes[id] || '', parts = text.split(/^### /m).slice(1);
  if (!parts.length) fail(id, 'has no recipe (### heading)');
  for (const p of parts) {
    const title = p.split('\n')[0].trim(), body = p.split(/^## /m)[0];
    recipes.set(`${id}#${slugOf(title)}`, title);
    for (const part of RECIPE_PARTS) if (!new RegExp(`^\\*\\*${part}[.:]?\\*\\*`, 'm').test(body)) fail(id, `recipe "${title}" has no **${part}** part`);
  }
}
// the task table of the index: | Task | Recipe | with a link to note#heading
const tasksPart = (index.split(/^## Tasks$/m)[1] || '').split(/^## /m)[0];
if (!tasksPart) fail('README', 'has no "## Tasks" section listing the tasks and their recipes');
const listed = new Map();
for (const m of tasksPart.matchAll(/^\|\s*([^|]+?)\s*\|\s*\[[^\]]*\]\(([\w-]+)\.md#([\w-]+)\)/gm)) listed.set(`${m[2]}#${m[3]}`, m[1]);
for (const [key, task] of listed) if (!recipes.has(key)) fail('README', `task "${task}" links ${key.replace('#', '.md#')}, which is not a recipe: every task needs a recipe`);
for (const [key, title] of recipes) if (!listed.has(key)) fail('README', `recipe "${title}" (${key.replace('#', '.md#')}) is not listed in the Tasks table`);
const titles = new Set(recipes.values());
for (const t of REQUIRED_TASKS) if (!titles.has(t)) problems.push(`docs/knowledge: no recipe "### ${t}" (a task of the spec, requirement Ready for a task)`);

// ---------- inventories ----------
for (const [note, names] of Object.entries(INVENTORY)) for (const n of names) if (notes[note] && !blockNames(notes[note]).includes(n)) fail(note, `no inventory block "${n}" (<!-- generated:${n} -->)`);

// ---------- catalog freshness ----------
// the coverage of the Strudel catalog must be built from the code as it is: a hash of the catalog's inputs is stored
// by npm run catalog:strudel in docs/strudel/inputs.json and computed again here
{
  let stored = null;
  try { stored = JSON.parse(fs.readFileSync(CATALOG_FILES.inputs, 'utf8')); } catch (e) {}
  const now = inputsStamp();
  if (!stored) problems.push('docs/strudel/inputs.json is missing: run npm run catalog:strudel');
  // (a warning since faster-checks: the catalog is rebuilt when Strudel, the generator or app functions change, and
  // before a merge to main)
  else if (stored.hash !== now.hash) warnings.push(`the Strudel coverage is older than the code it was built from (${now.files} input files, hash changed): run npm run catalog:strudel, then npm run knowledge, when Strudel, the generator or app functions changed, and before a merge to main`);
}
// a function the app writes under a synonym (rib for ribbon) must not be listed as not written yet
{
  const used = usedStrudel(), unused = ((notes['strudel-functions'] || '').match(/<!-- generated:unused -->([\s\S]*?)<!-- \/generated -->/) || [])[1] || '';
  for (const m of unused.matchAll(/^\| `([^`]+)` \|/gm)) if (used.has(m[1])) fail('strudel-functions', `\`${m[1]}\` is listed as not written, but the app writes it (under this name or a synonym)`);
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
    // the open changes of status.md only mirror openspec/changes/: a warning, not a failure (faster-checks)
    if (note === 'status' && stale.join() === 'changes') warnings.push(`status.md: the list of open changes is out of date (openspec/changes/ moved): run npm run knowledge`);
    else fail(note, `generated blocks out of date (${stale.join(', ')}): run npm run knowledge`);
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
console.log(problems.length ? `${problems.length} problems` : `ok    knowledge: ${files.length} notes, ${generated.length} generated blocks checked, ${covered} listed values covered, ${links} links and ${examples} examples checked`);
process.exit(problems.length ? 1 : 0);
