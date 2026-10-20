// Checks the code the app generates against the catalog of the installed Strudel (strudel-catalog, #69, design D5).
// No browser.
//   npm run check:strudel     exit 1 when any check fails
// Fails when generated code calls a name that is neither a function or synonym in docs/strudel/functions.json nor an
// app name (HELPERS in src/song/writer.js, the library and the song function words in src/song/functions.js), when
// an app name is a Strudel function or synonym (song-functions), and when the catalog was made from other package
// versions than the installed ones. Warns, without failing, on undocumented functions the app writes, on hand notes
// for names not in the catalog, and when docs/strudel/coverage.json is out of date.
// The code set comes from the shared code cache (tools/strudel-code.mjs codeScan, faster-checks): only songs and
// recipes that changed, or all of it after a change to the app code that writes it, are generated again, in worker
// processes. --no-cache generates everything and must print the same result.
import fs from 'node:fs';
import { compileSong } from '../src/song/compile.js';
import { installedVersions, lookup } from './strudel-functions.mjs';
import { scanCalls, collectCalls, collectNames, codeScan, coverageOf, shadowed, HELPERS, APP_NAMES } from './strudel-code.mjs';
import { cacheLine, cachePrune } from './code-cache.mjs';
import { LIBRARY, NAMES } from '../src/song/functions.js';
import { RESERVED } from '../src/song/ideas.js';
import { FILES, json, readVariety, varietyByEntry } from './strudel-catalog.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const NOT_INSTALLED = 'not in the installed version';
const catalog = JSON.parse(fs.readFileSync(FILES.functions, 'utf8')), L = lookup(catalog);
// package versions: the catalog's against the installed ones → problems (empty when they match)
export function versionProblems(read, installed) {
  const names = [...new Set([...Object.keys(read), ...Object.keys(installed)])].sort();
  return names.filter(n => read[n] !== installed[n]).map(n => `${n}: catalog ${read[n] ?? 'none'}, installed ${installed[n] ?? 'none'}`);
}
const unknownText = unknown => Object.entries(unknown).map(([name, by]) => `${name} (written by ${Object.values(by).flat().slice(0, 3).join('; ')})`).join(', ');

const warnings = [];
let run = null;
const t = Date.now(), scanned = await codeScan();
const full = () => (run ||= collectNames(scanned));
const CHECKS = {
  'scanner: strings, template strings and comments are skipped'() {
    const c = scanCalls('$: s("bd.fooBar(2) hh").lpf(800) // .barFoo(1)\n/* .bazQux(3) */\n$: note(`c .quxBaz(2)`).gain(\'.zip(1)\')');
    assert([...c].sort().join() === 'gain,lpf,note,s', [...c].join());
  },
  'scanner: local names and JavaScript built-ins are skipped'() {
    const c = scanCalls('const f = x => x.fast(2)\nconst l = [1, 2]\nl.find(y => y)\nObject.entries({})\nfunction g(a) { return a }\n$: f(s("bd")).every(2, g)');
    assert([...c].sort().join() === 'every,fast,s', [...c].join());
  },
  'scanner: the app helpers are not unknown'() {
    const r = coverageOf(catalog, collectCalls([{ kind: 'songs', source: 'case', code: '$: s("bd").chan("drums").crunch(0.6).wob(200, 800).squelch(.12)\nall(x => miskMix(x, []))' }]), L);
    assert(!Object.keys(r.unknown).length, `unknown: ${Object.keys(r.unknown).join()}`);
    assert(HELPERS.every(h => !L.has(h) || !r.functions[L.get(h)]), 'a helper counted as a Strudel function');
  },
  'an unknown function in a copy of a song fails, with the song that writes it'() {
    const song = JSON.parse(fs.readFileSync('songs/ferro.json', 'utf8'));
    const code = compileSong(song).replace(/^(\$: [^\n]*)$/m, '$1.fooBar(2)');
    assert(code.includes('.fooBar(2)'), 'no pattern line to change');
    const r = coverageOf(catalog, collectCalls([{ kind: 'songs', source: 'songs/ferro.json (copy)', code }]), L);
    assert(Object.keys(r.unknown).join() === 'fooBar' && r.unknown.fooBar.songs[0] === 'songs/ferro.json (copy)', JSON.stringify(r.unknown));
  },
  'app helpers, library functions and name words are never a Strudel name or synonym'() {
    const sh = shadowed(L);
    assert(!Object.keys(sh).length, `named like Strudel: ${Object.entries(sh).map(([h, e]) => (h === e ? h : `${h} (synonym of ${e})`)).join(', ')}`);
    assert(['o', 'drive', 'voice'].every(n => !APP_NAMES.includes(n)), 'an old helper name is still an app name');
    const bad = APP_NAMES.filter(n => n !== 'miskMix' && (!/^[a-z]{2,12}$/.test(n) || RESERVED.has(n)));
    assert(!bad.length, `not a lowercase word of 2 to 12 letters, or reserved: ${bad.join(', ')}`);
    const abbr = Object.values(NAMES).flatMap(x => (Array.isArray(x) ? x : Object.values(x).flat())).filter(n => n.length <= 3);
    assert(!abbr.length, `two or three letters are for library functions only: ${abbr.join(', ')}`);
    assert(LIBRARY.every(f => f.name.length <= 3), 'library names are abbreviations of two or three letters');
  },
  'a catalog from other package versions fails'() {
    const installed = installedVersions();
    assert(!versionProblems(installed, installed).length, 'same versions reported');
    assert(versionProblems({ ...installed, '@strudel/core': '0.0.1' }, installed).length === 1, 'changed version not reported');
  },
  'the catalog is made from the installed Strudel'() {
    const p = versionProblems(catalog.source.packages, installedVersions());
    assert(!p.length, `${p.join('; ')}: run npm run catalog:strudel`);
  },
  'generated code calls only Strudel functions and app helpers'() {
    const r = coverageOf(catalog, full(), L);
    assert(!Object.keys(r.unknown).length, `not in the catalog: ${unknownText(r.unknown)}`);
    // warnings: undocumented functions written, helpers named like Strudel functions, stale coverage
    const undoc = Object.keys(r.functions).filter(n => !catalog.functions.find(f => f.name === n).documented);
    if (undoc.length) warnings.push(`undocumented functions the app writes: ${undoc.join(', ')}`);
    const { unknown, ...stored } = r;
    const old = fs.existsSync(FILES.coverage) ? fs.readFileSync(FILES.coverage, 'utf8') : '';
    if (old !== json(stored)) warnings.push('docs/strudel/coverage.json is out of date: run npm run catalog:strudel');
  },
  'hand notes name functions of the catalog'() {
    const variety = readVariety(), { missing } = varietyByEntry(variety, L, catalog.labels);
    const bad = missing.filter(n => !String(variety[n].note || '').includes(NOT_INSTALLED));
    if (bad.length) warnings.push(`docs/strudel/variety.json names not in the catalog (add "${NOT_INSTALLED}" to the note or remove them): ${bad.join(', ')}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
for (const w of warnings) console.log(`warn  ${w}`);
console.log(`\n${run ? `${run.codes} code texts read, ` : ''}${((Date.now() - t) / 1000).toFixed(1)} s; ${cacheLine()}`);
cachePrune();
console.log(failed ? `${failed} check(s) failed` : `all ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
