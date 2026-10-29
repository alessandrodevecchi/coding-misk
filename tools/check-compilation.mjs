// Checks for the radio compilation (#49): repeatable, segment lengths, setup limits, journey between neighbours,
// random artists valid, songs play. No browser.
//   npm run check:compilation      exit 1 when any check fails
import fs from 'node:fs';
import { segmentsUpTo, compilationOptions, boundArtist, PRESETS, GENRE_RING } from '../src/endless/compilation.js';
import { validateArtist } from '../src/endless/artist.js';
import { createSession } from '../src/endless/director.js';
import { withDefaults } from '../src/endless/recipe.js';
import { loadStyles } from './styles-dir.mjs';
import { sessionItems } from '../src/endless/items.js';
import { validateRecipe } from '../src/endless/recipe.js';

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
  'profiles (radio-profiles): the Live coder preset gives Live coder songs, a setup without profiles plays as before'() {
    const songs = setup => { const ses = createSession(recipes, 'pf'); return Array.from({ length: 5 }, (_, n) => ses.next(compilationOptions('pf', n, { every: 'song', setup, pool }, recipes, { transition: 'artist', harmony: 'artist' })).entry); };
    const { profiles, ...old } = PRESETS.journey;
    assert(profiles === null && PRESETS['live-coder'].profiles.switch === 1 && PRESETS['live-coder'].movement === 'journey', 'presets');
    const lc = songs(PRESETS['live-coder']), j = songs(old);
    assert(lc.every(e => e.profile === 'switch'), `Live coder preset: ${lc.map(e => e.profile)}`);
    const strip = l => JSON.stringify(l.map(({ profile: _, ...e }) => e));
    assert(strip(lc) === strip(j) && JSON.stringify(j) === JSON.stringify(songs(PRESETS.journey)), 'the same songs as the journey, an old setup unchanged');
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
  'held knobs and the setup ranges bind every song (#59)'() {
    const a = { id: 'x', chaos: [0.1, 0.5], energy: [0.2, 0.9], complexity: [0.4, 0.6], talk: [0.6, 0.9] };
    const b = boundArtist(a, { chaos: [0.3, 1], energy: [0, 1], complexity: [0, 1], talk: [0, 0.3] }, { energy: 0.75 });
    assert(b.chaos[0] === 0.3 && b.chaos[1] === 0.5, `intersection ${b.chaos}`);
    assert(b.talk[0] === 0.3 && b.talk[1] === 0.3, `empty intersection to the nearest bound ${b.talk}`);
    assert(b.energy[0] === 0.75 && b.energy[1] === 0.75, 'held knob fixed');
    const comp = { every: 'song', setup: { ...PRESETS.everything, ranges: { chaos: [0, 1], energy: [0, 1], complexity: [0, 1], talk: [0, 0.3] } }, pool, locks: { energy: 0.9 } };
    for (let n = 0; n < 30; n++) {
      const o = compilationOptions('lk', n, comp, recipes);
      if (o.artist) { assert(o.artist.energy[0] === 0.9 && o.artist.talk[1] <= 0.3, `artist bound ${n}`); }
      else assert(o.energy === 0.9 && o.talk <= 0.3, `styles held ${n}`);
    }
    const ses = createSession(recipes, 'lk');
    for (let n = 0; n < 4; n++) { const g = ses.next(compilationOptions('lk', n, comp, recipes)); assert(Math.abs(g.opts.energy - 0.9) < 1e-9 && g.opts.talk <= 0.3 + 1e-9, `song ${n} plays energy ${g.opts.energy}, talk ${g.opts.talk}`); }
  },
  'invented styles (invented-styles D11): off by default, the same segments as before; on, some segments invent a style in their genre'() {
    const c = { every: 'song', setup: PRESETS.everything, pool };
    const before = segmentsUpTo('inv', 40, c, recipes, pool), off = segmentsUpTo('inv', 40, { ...c, setup: { ...PRESETS.everything, invented: false } }, recipes, pool);
    assert(JSON.stringify(before) === JSON.stringify(off) && before.every(s => s.kind !== 'invented') && PRESETS.journey.invented === undefined, 'off: unchanged');
    const on = { every: 'song', setup: { ...PRESETS.everything, invented: true }, pool };
    const segs = segmentsUpTo('inv', 40, on, recipes, pool), inv = segs.filter(s => s.kind === 'invented');
    assert(inv.length >= 4, `${inv.length} invented segments of ${segs.length}`);
    for (const s of inv) { assert(s.style.genre === s.genre && s.styles[0] === s.style.id && !validateRecipe(s.style).errors.length, `segment ${s.index}: ${s.style.id} ${s.style.genre} in ${s.genre}`); assert(!recipes.some(r => r.id === s.style.id), 'a new id'); }
    assert(JSON.stringify(segs) === JSON.stringify(segmentsUpTo('inv', 40, on, recipes, pool)), 'same seed, same invented segments');
    // the songs play, and a replay of the recipe gives the same ones
    const recipe = { seed: 'inv', options: { compilation: on, energy: 0.6 }, changes: [] };
    const a = sessionItems(recipes, recipe, 8), b = sessionItems(recipes, JSON.parse(JSON.stringify(recipe)), 8);
    assert(JSON.stringify(a.map(x => x.song)) === JSON.stringify(b.map(x => x.song)), 'replay');
    const used = a.filter((x, n) => inv.some(s => s.start === n));
    assert(used.length && used.every(x => inv.some(s => x.entry.styles.includes(s.style.id))), 'invented segments play their style');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
