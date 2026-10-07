// Checks for the endless director and style recipes (docs/ENDLESS.md, docs/STYLES.md).
//   npm run check:endless      run every check; exit 1 when any fails
// Each check is a named function that throws on failure. New checks go in CHECKS.
import { stream, makeRng, STREAMS, hashString } from '../src/endless/random.js';
import fs from 'node:fs';
import { validateRecipe, withDefaults, PART_NAMES, TOP_FIELDS, INSTRUMENTS, SHAPES, RECIPE_DEFAULTS } from '../src/endless/recipe.js';
import { mixParts, stylesOf } from '../src/endless/mix.js';
import { loadStyles } from './styles-dir.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const take = (s, n) => Array.from({ length: n }, () => s.next());

const STYLES = loadStyles().map(withDefaults);
const byId = Object.fromEntries(STYLES.map(r => [r.id, r]));
const STARTING = ['berlin-techno', 'trance', 'synthwave', 'lo-fi', 'drum-and-bass', 'ambient', 'phonk', 'industrial', 'jazz', 'country', 'classic-rock', 'melodic-metal'];
// a session of song parts from the selected styles
const mixSession = (ids, chaos, songs, seed = 'mix') => {
  const rng = stream(seed, 'plan');
  return Array.from({ length: songs }, (_, i) => mixParts(ids.map(id => byId[id]), chaos, i, rng));
};

const CHECKS = {
  'random: same seed and stream repeat'() {
    const a = take(stream('test', 'plan'), 50), b = take(stream('test', 'plan'), 50);
    assert(a.every((x, i) => x === b[i]), 'sequences differ');
    assert(a.every(x => x >= 0 && x < 1), 'value out of [0, 1)');
  },
  'random: different streams and seeds differ'() {
    const seqs = STREAMS.map(n => take(makeRng('test')[n], 20).join());
    assert(new Set(seqs).size === STREAMS.length, 'two streams gave the same sequence');
    assert(take(stream('test', 'plan'), 20).join() !== take(stream('test2', 'plan'), 20).join(), 'two seeds gave the same sequence');
  },
  'random: streams are independent'() {
    // Drawing from one stream must not move another.
    const r1 = makeRng('x'), r2 = makeRng('x');
    take(r1.titles, 100);
    assert(take(r1.plan, 10).join() === take(r2.plan, 10).join(), 'titles draws changed plan');
  },
  'random: helpers stay in range'() {
    const s = stream('helpers');
    for (let i = 0; i < 2000; i++) {
      const n = s.int(3, 7); assert(Number.isInteger(n) && n >= 3 && n <= 7, `int out of range: ${n}`);
      const f = s.range(-1, 1); assert(f >= -1 && f < 1, `range out of range: ${f}`);
    }
    const sh = s.shuffle([1, 2, 3, 4, 5]);
    assert(sh.slice().sort().join() === '1,2,3,4,5', 'shuffle lost items');
    assert(s.weighted(['a', 'b'], [0, 1]) === 'b', 'weighted picked a zero weight');
    assert(hashString('abc') === hashString('abc') && hashString('abc') !== hashString('abd'), 'hash not stable');
  },
  'recipes: the twelve starting styles are valid'() {
    for (const id of STARTING) assert(byId[id], `missing recipe ${id}`);
    for (const r of loadStyles()) {
      const { errors } = validateRecipe(r);
      assert(!errors.length, `${r.id}: ${errors.map(e => `${e.path}: ${e.msg}`).join('; ')}`);
    }
  },
  'recipes: unknown preset is an error at its path naming the presets'() {
    const r = structuredClone(loadStyles().find(x => x.id === 'berlin-techno'));
    r.bass.presets = ['rolling', 'wobbly'];
    const e = validateRecipe(r).errors.find(x => x.path === 'bass.presets[1]');
    assert(e, 'no error at bass.presets[1]');
    assert(/rolling/.test(e.msg) && /rumble/.test(e.msg), `message does not list the bass presets: ${e.msg}`);
  },
  'recipes: reversed range and bad length are errors'() {
    const r = structuredClone(loadStyles().find(x => x.id === 'trance'));
    r.tempo = [140, 120]; r.minutes = [1, 7];
    const errs = validateRecipe(r).errors.map(e => e.path);
    assert(errs.includes('tempo'), 'no error at tempo');
    assert(errs.includes('minutes'), 'no error at minutes');
  },
  'recipes: missing optional part stays valid'() {
    const r = structuredClone(loadStyles().find(x => x.id === 'classic-rock'));
    delete r.guitar;
    assert(!validateRecipe(r).errors.length, 'recipe without guitar is invalid');
  },
  'docs: STYLES.md names every recipe field'() {
    const doc = fs.readFileSync(new URL('../docs/STYLES.md', import.meta.url), 'utf8');
    const names = [...TOP_FIELDS, ...Object.values(INSTRUMENTS).flatMap(Object.keys), 'settings', 'weight', ...SHAPES, ...PART_NAMES,
      ...Object.keys(RECIPE_DEFAULTS.energy), ...Object.keys(RECIPE_DEFAULTS.voice)];
    const missing = [...new Set(names)].filter(n => !doc.includes(`\`${n}\``));
    assert(!missing.length, `not in docs/STYLES.md: ${missing.join(', ')}`);
  },
  'mix: one style gives every part'() {
    for (const chaos of [0, 0.5, 1]) for (const p of mixSession(['jazz'], chaos, 20))
      assert(PART_NAMES.every(k => p[k] === 'jazz'), `part not from jazz at chaos ${chaos}`);
  },
  'mix: chaos 0 rotates whole styles'() {
    const s = mixSession(['synthwave', 'country'], 0, 20);
    s.forEach((p, i) => {
      assert(stylesOf(p).length === 1, `song ${i} mixes styles at chaos 0`);
      if (i) assert(p.dominant !== s[i - 1].dominant, `songs ${i - 1} and ${i} share a style`);
    });
  },
  'mix: chaos 1 mixes parts'() {
    const s = mixSession(['synthwave', 'jazz', 'country'], 1, 40);
    const mixed = s.filter(p => stylesOf(p).length >= 2).length;
    assert(mixed >= 20, `only ${mixed} of 40 songs mix styles`);
    for (const id of ['synthwave', 'jazz', 'country']) assert(s.some(p => p.tempo === id), `${id} never gives the tempo`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
