// Checks for the style maker (invented-styles, #51): invented styles are valid, coherent, not copies, well named, in
// the asked genre, repeatable (seed fixtures), and play in the director without moving any other draw. No browser.
//   npm run check:invent                         exit 1 when any check fails
//   npm run check:invent -- --write-fixtures     rewrite tests/snapshots/invented-styles.json (raise STYLE_MAKER_VERSION)
import fs from 'node:fs';
import { inventStyle, styleCoherence, similarity, closestOf, forbiddenName, pairTables, STYLE_MAKER_VERSION, COPY_LIMIT, MAX_TRIES, LENT_PARTS, describeInvented } from '../src/endless/style-maker.js';
import { validateRecipe, withDefaults } from '../src/endless/recipe.js';
import { createSession } from '../src/endless/director.js';
import { sessionItems } from '../src/endless/items.js';
import { makeArtist } from '../src/endless/artist-maker.js';
import { hashString } from '../src/endless/random.js';
import { GENRES } from '../src/song/format.js';
import { loadStyles } from './styles-dir.mjs';
import { loadArtists } from './artists-dir.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const pool = loadStyles(), P = pool.map(withDefaults), artists = loadArtists();
const avoid = artists.map(a => a.name);
const SEEDS = Array.from({ length: 300 }, (_, i) => `inv-${i}`);
const made = SEEDS.map(s => inventStyle(s, pool, { avoid }));
const FIXTURES_FILE = new URL('../tests/snapshots/invented-styles.json', import.meta.url);
const fixtureOf = s => { const { recipe } = inventStyle(s, pool, { avoid }); return { seed: s, id: recipe.id, name: recipe.name, genre: recipe.genre, from: recipe.invented.from, hash: hashString(JSON.stringify(recipe)).toString(16) }; };

const CHECKS = {
  '300 seeds give valid styles, no warnings'() {
    for (const { recipe } of made) { const v = validateRecipe(recipe); assert(!v.errors.length && !v.warnings.length, `${recipe.id}: ${JSON.stringify([...v.errors, ...v.warnings][0])}`); }
  },
  'every coherence rule holds'() {
    for (const { recipe } of made) { const r = styleCoherence(recipe, pool); assert(!r.length, `${recipe.id}: ${r.join('; ')}`); }
    // the rules themselves: a drum-and-bass groove at 120 BPM, swing on techno, a 3/4 meter, 7 instruments break them
    const T = pairTables(pool), dnb = T.grooveHome.dnb;
    assert(dnb && dnb[0] > 140, `dnb home ${dnb}`);
    const bad = { ...pool.find(r => r.id === 'berlin-techno'), tempo: [118, 122], drums: { kits: ['RolandTR909'], grooves: ['dnb'] }, swing: [0.3, 0.4], meters: ['3/4'], guitar: { patterns: ['thrash'], types: ['metal'] } };
    const why = styleCoherence(bad, pool).join(' | ');
    for (const w of ['groove dnb', 'swing without', 'meter', 'instruments']) assert(why.includes(w), `rule "${w}" not found in ${why}`);
  },
  'parts from several styles: two from donors, two from the base'() {
    for (const { recipe, report } of made) {
      const f = recipe.invented.from, lent = LENT_PARTS.filter(p => f[p] !== f.tempo).length;
      assert(report.fallback ? lent >= 1 : lent >= 2 && LENT_PARTS.length - lent >= 2, `${recipe.id}: ${lent} lent parts`);
    }
  },
  'groove and tempo: drum-and-bass grooves keep their tempo'() {
    const T = pairTables(pool);
    let n = 0;
    for (const { recipe } of made) for (const g of recipe.drums.grooves) { const h = T.grooveHome[g]; assert(recipe.tempo[0] >= h[0] && recipe.tempo[1] <= h[1], `${recipe.id}: ${g} at ${recipe.tempo}`); if (g === 'dnb') { n++; assert(recipe.tempo[0] >= 150, `${recipe.id}: dnb at ${recipe.tempo}`); } }
    assert(n > 0, 'no seed took the drum-and-bass grooves');
  },
  'not a copy: below the copy limit against every style'() {
    for (const { recipe, report } of made) if (!report.fallback) for (const r of P) assert(similarity(recipe, r) < COPY_LIMIT, `${recipe.id} ~ ${r.id}: ${similarity(recipe, r).toFixed(2)}`);
    // and against the user's kept styles
    const kept = made.slice(0, 20).map(x => x.recipe);
    for (let i = 0; i < 40; i++) { const { recipe, report } = inventStyle(`kept-${i}`, pool, { avoid, kept }); if (!report.fallback) for (const k of kept) assert(similarity(recipe, k) < COPY_LIMIT, `${recipe.id} copies kept ${k.id}`); }
  },
  'names: from the word lists, never a real genre, a style or an artist'() {
    const styleNames = pool.flatMap(r => [r.name.en, r.name.it]).map(s => s.toLowerCase());
    for (const { recipe } of made) {
      const n = recipe.name;
      assert(/^[A-Z][a-z]+( [A-Z][a-z]+)?$/.test(n.en) && n.it, `name ${JSON.stringify(n)}`);
      assert(!forbiddenName(n, avoid), `forbidden ${n.en}`);
      assert(!styleNames.includes(n.en.toLowerCase()) && !styleNames.includes(n.it.toLowerCase()) && !avoid.includes(n.en), `existing name ${n.en}`);
      assert(recipe.id.startsWith(n.en.toLowerCase().replace(/[^a-z0-9]+/g, '-')), `id ${recipe.id}`);
    }
    for (const g of ['Vaporwave', 'Dubstep', 'Trap', 'Night Owl', 'Techno berlinese']) assert(forbiddenName({ en: g, it: g }, [...avoid, 'Techno berlinese']), `${g} allowed`);
    assert(new Set(made.map(x => x.recipe.name.en)).size > 100, 'names vary');
  },
  'genre: the closest genre, the asked genre honoured'() {
    for (const { recipe } of made.slice(0, 100)) { assert(GENRES.includes(recipe.genre), recipe.genre); assert(closestOf(recipe, P).genre === recipe.genre, `${recipe.id} genre`); assert(recipe.invented.closest === closestOf(recipe, P).style, `${recipe.id} closest`); }
    for (const g of [...new Set(pool.map(r => r.genre))]) for (let i = 0; i < 15; i++) { const { recipe } = inventStyle(`${g}-${i}`, pool, { genre: g, avoid }); assert(recipe.genre === g, `asked ${g}, got ${recipe.genre} (${recipe.id})`); }
  },
  'a base forces the starting style'() {
    for (let i = 0; i < 20; i++) { const { recipe } = inventStyle(`b-${i}`, pool, { base: 'lo-fi', avoid }); assert(recipe.invented.from.tempo === 'lo-fi', `${recipe.id} base ${recipe.invented.from.tempo}`); }
  },
  'description names the source of each part, in both languages'() {
    const { recipe } = made[3], names = id => pool.find(r => r.id === id).name;
    const en = describeInvented(recipe.invented.from, id => names(id).en, 'en'), it = describeInvented(recipe.invented.from, id => names(id).it, 'it');
    assert(en.startsWith(`Based on ${names(recipe.invented.from.tempo).en}`) && it.startsWith(`Base ${names(recipe.invented.from.tempo).it}`), `${en} / ${it}`);
    assert(/ from /.test(en) && / da /.test(it), `${en} / ${it}`);
  },
  'same seed, same style'() {
    for (const s of ['aurora', 'k3x9q2', 'zz']) assert(JSON.stringify(inventStyle(s, pool, { avoid })) === JSON.stringify(inventStyle(s, pool, { avoid })), s);
    // the pool order does not matter (the maker sorts it)
    assert(JSON.stringify(inventStyle('aurora', pool.slice().reverse(), { avoid }).recipe) === JSON.stringify(inventStyle('aurora', pool, { avoid }).recipe), 'pool order');
    assert(inventStyle('aurora', pool).recipe.id !== inventStyle('borealis', pool).recipe.id, 'other seed, other style');
  },
  'tries: fewer than 2 on average, fallback rare'() {
    const tries = made.reduce((a, x) => a + x.report.tries, 0) / made.length, fb = made.filter(x => x.report.fallback).length;
    console.log(`      tries ${tries.toFixed(2)} on average, ${fb} fallbacks of ${made.length}, at most ${MAX_TRIES} draws`);
    assert(tries < 2 && fb <= 3, `tries ${tries}, fallbacks ${fb}`);
  },
  'seed fixtures (STYLE_MAKER_VERSION)'() {
    const now = { maker: STYLE_MAKER_VERSION, styles: Array.from({ length: 30 }, (_, i) => fixtureOf(`fixture-${i}`)) };
    if (process.argv.includes('--write-fixtures')) { fs.writeFileSync(FIXTURES_FILE, JSON.stringify(now, null, 1) + '\n'); console.log('      fixtures written'); return; }
    const saved = JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf8'));
    assert(saved.maker === STYLE_MAKER_VERSION, `fixtures of maker ${saved.maker}, maker is ${STYLE_MAKER_VERSION}`);
    now.styles.forEach((f, i) => assert(saved.styles[i] && saved.styles[i].hash === f.hash, `seed ${f.seed} gives ${f.id} ${f.hash}, fixture ${saved.styles[i] && saved.styles[i].id}; if intended, raise STYLE_MAKER_VERSION and run npm run check:invent -- --write-fixtures`));
  },
  'invented styles play in the director, as an extra style'() {
    for (const { recipe } of made.slice(0, 12)) {
      const ses = createSession(pool, `play-${recipe.id}`, { extra: [recipe] });
      for (let i = 0; i < 2; i++) { const g = ses.next({ styles: [recipe.id], energy: 0.7, complexity: 0.6 }); assert(g.entry.styles.includes(recipe.id) && g.song.sections.length, `${recipe.id} song ${i}`); const n = g.song.tracks.filter(t => t.type !== 'voice' && t.type !== 'spoken').length; assert(n >= 2 && n <= 10, `${recipe.id}: ${n} tracks`); }
    }
    // a session on air learns a trial style later (addStyle)
    const ses = createSession(pool, 'later'), r = made[5].recipe;
    ses.next({ styles: ['synthwave'] }); ses.addStyle(r);
    assert(ses.next({ styles: [r.id] }).entry.styles.includes(r.id), 'addStyle');
  },
  'other draws are unchanged by an extra style'() {
    const extra = [made[7].recipe], a = makeArtist('explorer', pool);
    const run = ex => { const ses = createSession(pool, 'same', { extra: ex }); return [ses.next({ artist: { ...a, explore: 0.9 } }), ses.next({ styles: ['berlin-techno', 'lo-fi'], chaos: 0.6 }), ses.next({ artist: { ...a, explore: 0.9 } })].map(g => JSON.stringify(g.song)); };
    assert(JSON.stringify(run([])) === JSON.stringify(run(extra)), 'songs moved with an extra style');
  },
  'a session recipe embedding the style replays the same songs'() {
    const r = made[9].recipe, recipe = { seed: 'emb', options: { styles: [r.id], energy: 0.6 }, changes: [], extraStyles: [r] };
    const a = sessionItems(pool, recipe, 3), b = sessionItems(pool, JSON.parse(JSON.stringify(recipe)), 3);
    assert(a.length === 3 && JSON.stringify(a.map(x => x.song)) === JSON.stringify(b.map(x => x.song)), 'replay');
    let threw = false; try { sessionItems(pool, { ...recipe, extraStyles: undefined }, 1); } catch (e) { threw = true; }
    assert(threw, 'without the embedded style the session cannot play');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
