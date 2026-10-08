// Checks for song tags, search, filters and sorting of the Songs tab (#34), without a browser.
//   npm run check:song-filter      exit 1 when any check fails
import fs from 'node:fs';
import { loadStyles } from './styles-dir.mjs';
import { GENRES } from '../src/song/format.js';
import { validateSong } from '../src/song/validate.js';
import { validateRecipe } from '../src/endless/recipe.js';
import { generateSession } from '../src/endless/director.js';
import { songEntry, filterSongs, genresOf, kindOf, cleanView, parseFree, fold } from '../src/library/song-filter.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const STYLES = loadStyles();
const byId = Object.fromEntries(STYLES.map(r => [r.id, r]));
const names = {
  style: id => (byId[id] ? Object.values(byId[id].name) : []),
  genre: g => [g, g.replace(/-/g, ' ')],
  genreOf: id => byId[id] && byId[id].genre,
};
// code tracks live in src/content.js, which imports raw files through Vite: read their ids and tags as text
const CODED = [...fs.readFileSync('src/content.js', 'utf8').matchAll(/\{ id: '([^']+)', title:[\s\S]*?tags: (\{[^\n]*\}) \},/g)]
  .map(m => ({ id: m[1], tags: Function(`return ${m[2]}`)() }));
// the songs of the library: songs/index.json (examples and generated sessions are not in the Songs tab)
const builtins = JSON.parse(fs.readFileSync('songs/index.json', 'utf8')).map(id => JSON.parse(fs.readFileSync(`songs/${id}.json`, 'utf8')));

const sample = [
  { id: 'a', title: 'Ali di cenere', style: { it: 'Metal melodico · Si minore', en: 'Melodic metal · B minor' }, tags: { styles: ['melodic-metal'] }, bpm: 150, seconds: 200 },
  { id: 'b', title: 'Drift', style: { it: 'Phonk · Fa# minore', en: 'Phonk · F# minor' }, tags: { styles: ['phonk'] }, bpm: 128, seconds: 150 },
  { id: 'c', title: 'Ghost', style: { it: 'Techno · Mi frigio', en: 'Techno · E phrygian' }, tags: { styles: ['berlin-techno'], free: ['hard techno'] }, build: true, bpm: 140, seconds: 300 },
  { id: 'd', title: 'Endless one', style: { en: 'Endless · Trance', it: 'Endless · Trance' }, tags: { styles: ['trance'] }, origin: 'endless', build: true, mine: true, bpm: 138, seconds: 240 },
  { id: 'e', title: 'Next', style: { en: 'Future pop', it: 'Future pop' }, tags: { genres: ['pop'], free: ['future pop'] }, bpm: 96, seconds: 180 },
  { id: 'f', title: 'Code', style: 'Techno trance', tags: { styles: ['trance', 'berlin-techno'] }, code: true, bpm: 128, seconds: 260 },
];
const entries = sample.map((s, i) => songEntry(s, i, names, ['b', 'e']));
const ids = list => list.map(e => e.id).join('');

const CHECKS = {
  'every built-in recipe declares a valid genre': () => {
    for (const r of STYLES) {
      assert(GENRES.includes(r.genre), `${r.id}: genre ${r.genre}`);
      assert(!validateRecipe(r).warnings.some(w => w.path === 'genre'), `${r.id}: genre warning`);
    }
  },
  'a recipe with an unknown genre is rejected, a missing one warns': () => {
    const r = structuredClone(byId.trance);
    r.genre = 'polka';
    assert(validateRecipe(r).errors.some(e => e.path === 'genre'), 'polka accepted');
    delete r.genre;
    const v = validateRecipe(r);
    assert(!v.errors.length && v.warnings.some(w => w.path === 'genre'), 'missing genre not a warning');
  },
  'song tags are validated': () => {
    const s = structuredClone(builtins[0]);
    s.tags = { genres: ['polka'], styles: ['nope'], free: ['OK TAG'] };
    const v = validateSong(s, { styles: STYLES.map(r => r.id) });
    assert(v.errors.some(e => e.path === 'tags.genres[0]'), 'unknown genre accepted');
    assert(v.errors.some(e => e.path === 'tags.free[0]'), 'uppercase free tag accepted');
    assert(v.warnings.some(w => w.path === 'tags.styles[0]'), 'unknown style not warned');
    s.origin = 'radio';
    assert(validateSong(s).errors.some(e => e.path === 'origin'), 'unknown origin accepted');
  },
  'every built-in song and code track has a genre and known styles': () => {
    assert(CODED.length === 2, `code tracks read: ${CODED.length}`);
    for (const s of [...builtins, ...CODED]) {
      assert(genresOf(s.tags, names.genreOf).length, `${s.id}: no genre`);
      for (const id of (s.tags && s.tags.styles) || []) assert(byId[id], `${s.id}: unknown style ${id}`);
    }
  },
  'genres follow styles, plus the song\'s own': () => {
    assert(genresOf({ styles: ['phonk'] }, names.genreOf).join() === 'hip-hop', 'phonk is not hip hop');
    assert(genresOf({ styles: ['lo-fi', 'phonk'], genres: ['pop'] }, names.genreOf).join() === 'hip-hop,pop', 'genres not merged without duplicates');
  },
  'kind labels': () => {
    assert(kindOf({ code: true }) === 'code' && kindOf({ origin: 'endless', build: true }) === 'generated' && kindOf({ build: true }) === 'live' && kindOf({}) === 'standard', 'kinds');
  },
  'search ignores case and accents and reads both languages': () => {
    assert(ids(filterSongs(entries, { q: 'FRÌGIO' })) === 'c', 'frigio');
    assert(ids(filterSongs(entries, { q: 'phrygian' })) === 'c', 'phrygian');
    assert(ids(filterSongs(entries, { q: 'hip hop' })) === 'b', 'genre name');
    assert(ids(filterSongs(entries, { q: 'techno berlinese' })) === 'cf', 'style name in Italian');
    assert(ids(filterSongs(entries, { q: 'future' })) === 'e', 'free tag');
    assert(fold('Città') === 'citta', 'fold');
  },
  'chips: OR inside a group, AND between groups': () => {
    assert(ids(filterSongs(entries, { genres: ['metal', 'pop'] })) === 'ae', 'OR genres');
    assert(ids(filterSongs(entries, { genres: ['techno', 'trance'], kinds: ['live'] })) === 'c', 'AND kind');
    assert(ids(filterSongs(entries, { styles: ['trance'] })) === 'df', 'style');
    assert(ids(filterSongs(entries, { kinds: ['generated'] })) === 'd' && ids(filterSongs(entries, { kinds: ['mine'] })) === 'd', 'saved radio song is generated and mine');
    assert(ids(filterSongs(entries, { favOnly: true })) === 'be', 'favourites');
    assert(filterSongs(entries, { q: 'zzz' }).length === 0, 'nothing matches');
  },
  'sorting': () => {
    assert(ids(filterSongs(entries, { sort: 'bpm' })) === 'ebfdca', 'bpm');
    assert(ids(filterSongs(entries, { sort: 'title' })) === 'afbdce', 'title');
    assert(ids(filterSongs(entries, { sort: 'length' })) === 'beadfc', 'length');
    assert(ids(filterSongs(entries, {})) === 'abcdef', 'default');
  },
  'a stored view is cleaned': () => {
    const v = cleanView({ q: 5, genres: ['metal', 'polka'], kinds: ['mine', 'x'], sort: 'random', favOnly: 1 });
    assert(v.q === '' && v.genres.join() === 'metal' && v.kinds.join() === 'mine' && v.sort === 'default' && v.favOnly === true, JSON.stringify(v));
  },
  'free tags typed by the user': () => {
    assert(parseFree(' Reel, night  Drive,reel, città!').join('|') === 'reel|night drive|citta', parseFree(' Reel, night  Drive,reel, città!').join('|'));
  },
  'generated songs carry style tags and origin': () => {
    const { songs } = generateSession(STYLES, { styles: ['berlin-techno', 'jazz'], minutes: 8, seed: 'tags', chaos: 0.6 });
    for (const s of songs) {
      assert(s.origin === 'endless', `${s.id}: origin`);
      assert(s.tags.styles.length && s.tags.styles.every(id => ['berlin-techno', 'jazz'].includes(id)), `${s.id}: styles ${s.tags.styles}`);
      assert(!validateSong(s, { styles: STYLES.map(r => r.id) }).errors.length, `${s.id}: invalid`);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
