// Checks for the random tools (#50): random artists are valid and repeatable, random styles and knobs stay in their
// limits, the sounds die changes the instruments and nothing else. No browser.
//   npm run check:random      exit 1 when any check fails
import { makeArtist, randomStyles, randomGenre, randomKnobs, SENSIBLE, KNOBS, genresOf } from '../src/endless/artist-maker.js';
import { validateArtist } from '../src/endless/artist.js';
import { createSession } from '../src/endless/director.js';
import { withDefaults } from '../src/endless/recipe.js';
import { loadStyles } from './styles-dir.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const recipes = loadStyles().map(withDefaults), ids = recipes.map(r => r.id);
const CHECKS = {
  'random artists are valid'() {
    for (let i = 0; i < 200; i++) { const a = makeArtist(`seed-${i}`, recipes), v = validateArtist(a, ids); assert(!v.errors.length, `${a.id}: ${JSON.stringify(v.errors[0])}`); }
  },
  'same seed, same artist'() {
    assert(JSON.stringify(makeArtist('abc', recipes)) === JSON.stringify(makeArtist('abc', recipes)), 'same artist');
    assert(makeArtist('abc', recipes).name !== makeArtist('abd', recipes).name || makeArtist('abc', recipes).id !== makeArtist('abd', recipes).id, 'other seed, other artist');
  },
  'artists and styles keep to the allowed genres'() {
    for (let i = 0; i < 50; i++) {
      const a = makeArtist(`g-${i}`, recipes, { allowedGenres: ['techno', 'industrial'] });
      for (const s of Object.keys(a.styles)) assert(['techno', 'industrial'].includes(recipes.find(r => r.id === s).genre), `${s} outside`);
      const st = randomStyles(`s-${i}`, recipes, { allowedGenres: ['jazz'] });
      assert(st.length >= 1 && st.every(s => recipes.find(r => r.id === s).genre === 'jazz'), `jazz styles ${st}`);
    }
    assert(genresOf(recipes).includes(randomGenre('x', recipes)), 'a known genre');
  },
  'knobs stay in range'() {
    for (let i = 0; i < 100; i++) {
      const a = randomKnobs(`k-${i}`, true), b = randomKnobs(`k-${i}`, false);
      for (const k of KNOBS) { assert(a[k] >= SENSIBLE[k][0] - 0.03 && a[k] <= SENSIBLE[k][1] + 0.03, `${k} ${a[k]} in range`); assert(b[k] >= 0 && b[k] <= 1, `${k} full`); }
    }
  },
  'a random artist plays in the radio'() {
    const a = makeArtist('radio-artist', recipes), g = createSession(recipes, 'ra').next({ artist: a });
    assert(g.song && g.entry.artist && g.entry.artist.name === a.name, 'song by the random artist');
  },
  'the sounds die changes instruments, not the rest'() {
    const o = { styles: ['berlin-techno', 'darksynth'], energy: 0.7, complexity: 0.7, chaos: 0.4 };
    const base = createSession(recipes, 'snd').next(o), other = createSession(recipes, 'snd').next({ ...o, sounds: 'xyz123' }), again = createSession(recipes, 'snd').next({ ...o, sounds: 'xyz123' });
    const kit = p => JSON.stringify(p.plan.tracks.map(t => [t.type, t.settings && (t.settings.kit || t.settings.wave || t.settings.sound), Object.values(t.patterns || {}).map(x => x.preset || x.rows && Object.keys(x.rows).join())]));
    assert(base.entry.bpm === other.entry.bpm && base.entry.key === other.entry.key && base.plan.bars === other.plan.bars, 'tempo, key and length stay');
    assert(kit(base) !== kit(other), 'other instruments');
    assert(kit(other) === kit(again), 'same sounds seed, same instruments');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
