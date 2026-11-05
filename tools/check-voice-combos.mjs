// Allowed speaker and voice style pairs (voice-style-combos, #82): validates src/voices/combos.json (or the file given)
// and tests src/voices/combos.js: a missing entry allows all, "clear" is always allowed, an English-only speaker is
// also bound by it.default, the voice draw over 300 seeds never gives a character outside the list, an empty list gives
// no character, an all-allowed file draws the same voices as no file. No browser.
//   npm run check:voice-combos [-- <file>]     exit 1 on an error in the file or a failed test; warnings are printed
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { combosErrors, allowedStyles, allowedForDraw, allowedCharacters, isAllowed, setCombos, COMBOS_FILE } from '../src/voices/combos.js';
import { VOICE_STYLE_IDS, VOICE_CHARACTERS } from '../src/song/format.js';
import { SPEAKERS } from '../src/song/build.js';
import { voiceFor } from '../src/endless/director.js';
import { stream } from '../src/endless/random.js';
import { loadStyles } from './styles-dir.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || path.join(ROOT, 'src/voices/combos.json');
let failed = 0;

// 1. the file
let json = null;
try { json = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.log(`FAIL  ${path.relative(ROOT, file)}: not valid JSON (${e.message})`); process.exit(1); }
const { errors, warnings } = combosErrors(json);
for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`FAIL  ${e}`);
if (errors.length) failed++;
else console.log(`ok    ${path.relative(ROOT, file)} (${Object.keys(json).filter(k => k !== 'format').length} languages)`);
if (process.argv[2]) process.exit(failed ? 1 : 0);

// 2. the module
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ALL = VOICE_STYLE_IDS;
const recipes = loadStyles();
// voices of 300 seeds over every style recipe, with the chaos high and the character chance 1, so each draws one
const voices = (opts = {}) => Array.from({ length: 300 }, (_, i) => voiceFor(recipes[i % recipes.length], { chaos: 0.8, voiceChance: 1, ...opts }, stream(`combos-${i}`, 'voice'), i));
const withTable = (t, fn) => { const old = setCombos(t); try { return fn(); } finally { setCombos(old); } };

const CHECKS = {
  'a missing entry allows every style': () => {
    assert(same(allowedStyles('kathy', 'en', {}), ALL), 'empty file');
    assert(same(allowedStyles('kathy', 'en', { format: 1, en: { default: ['clear'] } }), ALL), 'no kathy entry');
    assert(same(allowedStyles('', 'it', { format: 1, en: { default: ['clear'] } }), ALL), 'no it entry');
  },
  '"clear" is always allowed': () => {
    const t = { format: 1, en: { albert: ['radio', 'deep'], default: [] }, it: { default: [] } };
    assert(same(allowedStyles('albert', 'en', t), ['clear', 'radio', 'deep']), `albert: ${allowedStyles('albert', 'en', t)}`);
    assert(same(allowedStyles('', 'en', t), ['clear']), 'empty default list');
    assert(isAllowed('albert', 'clear', 'en', t) && !isAllowed('albert', 'robot', 'en', t), 'isAllowed');
  },
  'an English-only speaker is also bound by it.default': () => {
    const t = { format: 1, en: { albert: ['clear', 'radio', 'deep', 'robot'] }, it: { default: ['clear', 'radio', 'distant'] } };
    assert(same(allowedStyles('albert', 'it', t), ['clear', 'radio', 'distant']), 'albert in Italian is heard as Alice');
    assert(same(allowedForDraw('albert', t), ['clear', 'radio']), `draw list: ${allowedForDraw('albert', t)}`);
    assert(same(allowedForDraw('', t), ['clear', 'radio', 'distant']), `default draw list: ${allowedForDraw('', t)}`);
    assert(same(allowedCharacters('albert', t), ['radio']), `characters: ${allowedCharacters('albert', t)}`);
  },
  'combosErrors: unknown speaker, unknown style, wrong language, duplicate, non-list, format; warnings': () => {
    const bad = (j, re) => { const r = combosErrors(j); assert(r.errors.some(e => re.test(e)), `expected ${re}: ${JSON.stringify(r)}`); };
    bad({ format: 1, en: { bob: ['clear'] } }, /en\.bob: unknown speaker/);
    bad({ format: 1, en: { fred: ['clear', 'robott'] } }, /en\.fred: unknown style "robott"/);
    bad({ format: 1, it: { albert: ['clear'] } }, /it\.albert: albert does not speak/);
    bad({ format: 1, fr: { default: ['clear'] } }, /fr: unknown language/);
    bad({ format: 1, en: { kathy: ['radio', 'radio'] } }, /en\.kathy: duplicate style "radio"/);
    bad({ format: 1, en: { kathy: 'radio' } }, /en\.kathy: a list/);
    bad({ format: 2 }, /format/);
    bad([], /not a JSON object/);
    const w = combosErrors({ format: 1, en: { kathy: [], fred: ['clear'] } });
    assert(!w.errors.length && w.warnings.length === 2, `warnings: ${JSON.stringify(w)}`);
    assert(!combosErrors(COMBOS_FILE).errors.length, 'the shipped file');
  },
  'voice draw over 300 seeds: a limited speaker never gets another character': () => {
    const t = { format: 1, en: { albert: ['clear', 'deep'] } };
    const got = withTable(t, () => voices());
    const albert = got.filter(v => v.settings.speaker === 'albert');
    assert(albert.length > 10, `few albert voices: ${albert.length}`);
    assert(albert.every(v => v.character === null || v.character === 'deep'), `albert characters: ${[...new Set(albert.map(v => v.character))]}`);
    assert(got.some(v => v.settings.speaker !== 'albert' && v.character && v.character !== 'deep'), 'the others are not limited');
  },
  'voice draw: nothing allowed gives no character, an artist taste included': () => {
    const t = { format: 1, en: Object.fromEntries(['default', ...SPEAKERS].map(s => [s, ['clear', 'distant']])) };
    assert(withTable(t, () => voices()).every(v => v.character === null), 'a character with nothing allowed');
    assert(withTable(t, () => voices({ voiceCharacters: { robot: 3, deep: 1 } })).every(v => v.character === null), 'an artist character with nothing allowed');
    const taste = withTable({ format: 1, it: { default: ['deep', 'radio'] } }, () => voices({ voiceCharacters: { robot: 3, deep: 1 } }));
    assert(taste.every(v => v.character === 'deep'), `artist taste filtered: ${[...new Set(taste.map(v => v.character))]}`);
  },
  'an all-allowed file draws the same voices as no file, and the same random values': () => {
    const full = { format: 1, en: Object.fromEntries(['default', ...SPEAKERS].map(s => [s, ALL])), it: { default: ALL } };
    for (const opts of [{}, { voiceCharacters: { robot: 3, deep: 1, slow: 1 } }, { voiceChance: undefined }]) {
      const a = JSON.stringify(withTable({}, () => voices(opts))), b = JSON.stringify(withTable(full, () => voices(opts))), c = JSON.stringify(voices(opts));
      assert(a === b && b === c, `voices differ with ${JSON.stringify(opts)}`);
    }
    // a narrowed file changes only the character picked, never the rest of the voice (same count of random values)
    const narrow = withTable({ format: 1, it: { default: ['clear'] } }, () => voices()), wide = voices();
    assert(narrow.every((v, i) => same(v.rack, wide[i].rack) && v.settings.speaker === wide[i].settings.speaker && v.settings.gain === wide[i].settings.gain), 'a narrowed file moved the speaker, the volume or the rack');
  },
  'every character has a style of the same name': () => {
    for (const c of Object.keys(VOICE_CHARACTERS)) assert(ALL.includes(c), `${c} has no style`);
  },
};

for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length + 1} checks passed`);
process.exit(failed ? 1 : 0);
