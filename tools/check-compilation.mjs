// Checks for the radio compilation (#49): repeatable, segment lengths, setup limits, journey between neighbours,
// random artists valid, songs play. No browser.
//   npm run check:compilation      exit 1 when any check fails
import fs from 'node:fs';
import { segmentsUpTo, compilationOptions, PRESETS, GENRE_RING } from '../src/endless/compilation.js';
import { validateArtist } from '../src/endless/artist.js';
import { createSession } from '../src/endless/director.js';
import { withDefaults } from '../src/endless/recipe.js';
import { loadStyles } from './styles-dir.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const recipes = loadStyles().map(withDefaults), ids = recipes.map(r => r.id);
const pool = fs.readdirSync('artists').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`artists/${f}`, 'utf8')));
const genreOf = id => recipes.find(r => r.id === id).genre;
const CHECKS = {
  'same seed and setup, same compilation'() {
    const c = { every: 'song', setup: PRESETS.everything, pool };
    assert(JSON.stringify(segmentsUpTo('s1', 30, c, recipes, pool)) === JSON.stringify(segmentsUpTo('s1', 30, c, recipes, pool)), 'same segments');
    assert(JSON.stringify(segmentsUpTo('s1', 30, c, recipes, pool)) !== JSON.stringify(segmentsUpTo('s2', 30, c, recipes, pool)), 'other seed, other segments');
  },
  'every song, or every 2 to 4 songs'() {
    assert(segmentsUpTo('a', 20, { every: 'song', setup: PRESETS.journey }, recipes, pool).every(s => s.length === 1), 'one song each');
    const some = segmentsUpTo('a', 40, { every: 'some', setup: PRESETS.journey }, recipes, pool);
    assert(some.every(s => s.length >= 2 && s.length <= 4) && new Set(some.map(s => s.length)).size > 1, 'two to four songs');
  },
  'the setup limits genres, artists and knobs'() {
    const setup = { ...PRESETS.club, randomArtists: false };
    for (const s of segmentsUpTo('club', 40, { every: 'song', setup }, recipes, pool)) {
      assert(setup.genres.includes(s.genre), `genre ${s.genre}`);
      if (s.styles) { assert(s.styles.every(id => setup.genres.includes(genreOf(id))), `styles ${s.styles}`); assert(s.knobs.energy >= 0.6 && s.knobs.energy <= 0.95, `energy ${s.knobs.energy}`); }
      assert(s.kind !== 'random', 'no random artists when off');
    }
    const only = segmentsUpTo('o', 30, { every: 'song', setup: { ...PRESETS.everything, artists: ['night-owl'], randomArtists: false } }, recipes, pool);
    assert(only.filter(s => s.artist).every(s => s.artist.id === 'night-owl'), 'only the allowed artist');
  },
  'the journey moves between neighbouring genres'() {
    const segs = segmentsUpTo('j', 120, { every: 'song', setup: { ...PRESETS.journey, randomArtists: false, ranges: { chaos: [0, 0.1] } } }, recipes, pool);
    let near = 0;
    for (let i = 1; i < segs.length; i++) { const a = GENRE_RING.indexOf(segs[i - 1].genre), b = GENRE_RING.indexOf(segs[i].genre), d = Math.min(Math.abs(a - b), GENRE_RING.length - Math.abs(a - b)); if (d <= 3) near++; }
    assert(near / (segs.length - 1) > 0.8, `mostly near (${near}/${segs.length - 1})`);
    const free = segmentsUpTo('j', 60, { every: 'song', setup: PRESETS.everything }, recipes, pool);
    assert(new Set(free.map(s => s.genre)).size >= 6, 'free movement visits many genres');
  },
  'random artists are valid and songs play'() {
    const comp = { every: 'song', setup: PRESETS.everything, pool };
    const segs = segmentsUpTo('r', 60, comp, recipes, pool);
    for (const s of segs.filter(x => x.kind === 'random')) assert(!validateArtist(s.artist, ids).errors.length, `${s.artist.id} valid`);
    assert(segs.some(s => s.kind === 'random') && segs.some(s => s.kind === 'artist') && segs.some(s => s.kind === 'styles'), 'all three kinds');
    const ses = createSession(recipes, 'r');
    for (let n = 0; n < 6; n++) { const g = ses.next(compilationOptions('r', n, comp, recipes)); assert(g.song && g.song.sections.length, `song ${n}`); }
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
