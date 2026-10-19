// Checks for profiles in the radio (radio-profiles). No browser.
// Radio fixtures (tests/snapshots/radio-growth.json): hashes of the radio items of three sessions in Classic (styles, an
// artist, a compilation), as the radio rebuilds them (src/endless/items.js); they move only on purpose.
//   npm run check:radio-profiles                       exit 1 when any check fails
//   npm run check:radio-profiles -- --write-fixtures   rewrite the radio fixtures (an intended change only)
import fs from 'node:fs';
import { hashString } from '../src/endless/random.js';
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { sessionItems } from '../src/endless/items.js';
import { loadStyles } from './styles-dir.mjs';
import { loadArtists } from './artists-dir.mjs';
import { songProfileOnAir, savedSongProfile, recipeProfile, RADIO_PROFILES, PROFILE_CHOICES } from '../src/endless/profile.js';
import { PROFILE_IDS } from '../src/live/profiles.js';
import { validateArtist, ARTIST_PROFILES } from '../src/endless/artist.js';
import { PRESETS } from '../src/endless/compilation.js';
import { createSession, OPTION_DEFAULTS } from '../src/endless/director.js';
import { writtenForm, soundAt, growOnAir, airControls } from '../src/endless/growth.js';
import { windowSong } from '../src/endless/join.js';
import { overlapOf, extraOf } from '../src/endless/transitions.js';
import { stateAt, buildSteps, checkBuild } from '../src/song/build.js';
import { compileSong } from '../src/song/compile.js';
import { liveCode } from '../src/live/live-code.js';
import { rushedSteps } from '../src/live/typing-load.js';
import { resolveShape, shapeFacts, canPlay, OPENINGS } from '../src/song/shapes.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const WRITE = process.argv.includes('--write-fixtures');
const FIXTURES_FILE = new URL('../tests/snapshots/radio-growth.json', import.meta.url);
// the recipes as the radio uses them (usableRecipes in src/radio/radio.js): valid ones, in their order
const RECIPES = loadStyles().filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
const ARTISTS = loadArtists();
const artist = id => ARTISTS.find(a => a.id === id);
// the compilation's pool: the built-in artists of 2026-10-19 (an artist added later does not move the fixture)
const POOL = ['dreamer', 'horizon', 'hype', 'jukebox', 'night-owl', 'purist'].map(artist).filter(Boolean);
const how = { transition: 'artist', harmony: 'artist' };

// three sessions as the radio records them (a recipe without the Profile option: saved before radio-profiles)
const CLASSIC = [
  { name: 'styles', recipe: { seed: 'onda', options: { styles: ['berlin-techno', 'synthwave'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, ...how }, changes: [] } },
  { name: 'artist', recipe: { seed: 'gufo', options: { artist: artist('night-owl'), ...how }, changes: [] } },
  { name: 'compilation', recipe: { seed: 'giro', options: { compilation: { every: 'some', setup: { movement: 'journey', genres: null, styles: null, artists: null, randomArtists: true, ranges: { chaos: [0.15, 0.7], energy: [0.3, 0.9], complexity: [0.3, 0.8], talk: [0.2, 0.8] } }, pool: POOL }, ...how }, changes: [] } },
];
const SONGS = 4;
const hashOf = v => hashString(JSON.stringify(v)).toString(16).padStart(8, '0');
const itemsHash = items => hashOf(items.map(x => ({ song: x.song, entry: x.entry })));

const saved = fs.existsSync(FIXTURES_FILE) ? JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf8')) : null;
const fixtures = { classic: {}, grown: {} };
// grown sessions (radio-profiles 3.6): Live coder forced, an artist's Crescendo weights, the Live coder compilation
const GROWN = [
  { name: 'styles-live-coder', recipe: { ...CLASSIC[0].recipe, options: { ...CLASSIC[0].recipe.options, profile: 'switch' } } },
  { name: 'artist-crescendo', recipe: { ...CLASSIC[1].recipe, options: { ...CLASSIC[1].recipe.options, artist: { ...artist('night-owl'), profiles: { crescendo: 1 } }, profile: 'artist' } } },
  { name: 'compilation-live-coder', recipe: { ...CLASSIC[2].recipe, options: { ...CLASSIC[2].recipe.options, compilation: { ...CLASSIC[2].recipe.options.compilation, setup: { ...CLASSIC[2].recipe.options.compilation.setup, profiles: { switch: 1 } } }, profile: 'artist' } } },
];

const byStyle = id => RECIPES.find(r => r.id === id);
const STYLES = Object.fromEntries(RECIPES.map(r => [r.id, r]));
const barsOf = song => song.sections.reduce((a, x) => a + x.bars, 0);
// 50 radio songs over all styles: one session per style (a second style now and then), Live coder forced, grown; and
// a few sessions of Crescendo songs. Built once, several checks read them
const SEEDS = 50;
const recipeOf = (i, profile, extra = {}) => ({ seed: `grow-${i}`, options: { styles: [RECIPES[i % RECIPES.length].id, ...(i % 3 === 0 ? [RECIPES[(i * 7 + 3) % RECIPES.length].id] : [])], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, ...how, profile, ...extra }, changes: [] });
let grownCache = null;
const grown = () => {
  if (grownCache) return grownCache;
  const t0 = Date.now(), live = [], cres = [];
  for (let i = 0; i < SEEDS; i++) { const [x] = sessionItems(RECIPES, recipeOf(i, 'switch'), 1, null, { grow: true }); live.push(x); }
  for (let i = 0; i < 10; i++) { const [x] = sessionItems(RECIPES, recipeOf(i * 5 + 1, 'crescendo'), 1, null, { grow: true }); cres.push(x); }
  grownCache = { live, cres, seconds: (Date.now() - t0) / 1000 };
  console.log(`      ${SEEDS} Live coder and 10 Crescendo radio songs grown in ${grownCache.seconds.toFixed(0)} s`);
  return grownCache;
};
// rushed steps of the Live coder songs grown in Compose by npm run check:crescendo (free duration, every song in songs/,
// measured on 2026-10-19 with tools/check-crescendo.mjs's coder()): the radio's songs may rush no more, per song
const COMPOSE_RUSHED = { songs: 40, rushed: 129 };
const noProfile = items => items.map(x => { const { profile, ...entry } = x.entry; return { song: x.song, entry }; });
const profilesOf = items => items.map(x => x.entry.profile || 'classic');

const CHECKS = {
  'D1: the profile of a generated song, each row of the table'() {
    assert(JSON.stringify(RADIO_PROFILES) === JSON.stringify(PROFILE_IDS) && JSON.stringify(ARTIST_PROFILES) === JSON.stringify(PROFILE_IDS), 'profile ids');
    const acid = byStyle('acid'), techno = byStyle('berlin-techno');
    assert(acid && acid.profile === 'switch' && !techno.profile, 'acid declares the Live coder, berlin-techno nothing');
    const rows = [
      [{ choice: 'crescendo', compilation: { switch: 1 }, artist: { profiles: { switch: 1 } }, style: acid }, 'crescendo', 'session'],
      [{ choice: 'classic', style: acid }, 'classic', 'session'],
      [{ compilation: { switch: 1 }, artist: { profiles: { crescendo: 1 } }, style: techno }, 'switch', 'compilation'],
      [{ compilation: { switch: 0 }, artist: { profiles: { crescendo: 1 } }, style: acid }, 'crescendo', 'artist'],
      [{ artist: { profiles: { crescendo: 1 } }, style: acid }, 'crescendo', 'artist'],
      [{ artist: { id: 'x' }, style: acid }, 'switch', 'style'],
      [{ artist: { profiles: {} }, style: acid }, 'switch', 'style'],
      [{ style: techno }, 'classic', 'default'],
      [{}, 'classic', 'default'],
    ];
    rows.forEach(([ctx, want, from], i) => { const r = songProfileOnAir(3, { seed: 's', ...ctx }); assert(r.profile === want && r.from === from, `row ${i}: ${JSON.stringify(r)}, expected ${want} from ${from}`); });
    // weighted draws: repeatable, both profiles drawn, a stream per song
    const mix = n => songProfileOnAir(n, { seed: 'w', artist: { profiles: { classic: 1, switch: 1 } } }).profile;
    const a = Array.from({ length: 60 }, (_, n) => mix(n)), b = Array.from({ length: 60 }, (_, n) => mix(n));
    assert(JSON.stringify(a) === JSON.stringify(b), 'same seed, same draws');
    assert(a.filter(x => x === 'switch').length > 15 && a.filter(x => x === 'classic').length > 15, `draws ${a.join(' ')}`);
  },
  'D1 in the director: entry.profile only when not Classic; profile draws move nothing else'() {
    const opts = choice => ({ styles: ['acid', 'berlin-techno'], chaos: 0.5, profile: choice });
    const run = (choice, artist) => { const ses = createSession(RECIPES, 'pf'); return Array.from({ length: 6 }, () => { const g = ses.next(artist ? { artist, ...how, profile: choice } : opts(choice)); return { song: g.song, entry: g.entry }; }); };
    assert(OPTION_DEFAULTS.profile === 'artist' && PROFILE_CHOICES.includes('artist'), 'default as the artist');
    const asArtist = run('artist'), classic = run('classic'), live = run('switch');
    assert(classic.every(x => x.entry.profile === undefined), 'Classic writes no entry.profile');
    assert(live.every(x => x.entry.profile === 'switch'), 'the session control forces every song');
    const drums = asArtist.map(x => x.entry.parts.drums);
    assert(asArtist.every((x, i) => (x.entry.profile === 'switch') === (drums[i] === 'acid')), `as the artist: the acid drums give the Live coder (${drums.join(', ')} → ${profilesOf(asArtist).join(', ')})`);
    assert(drums.includes('acid') && drums.some(d => d !== 'acid'), 'both styles give drums');
    const same = JSON.stringify(noProfile(classic));
    assert(JSON.stringify(noProfile(asArtist)) === same && JSON.stringify(noProfile(live)) === same, 'songs and entries are the same whatever the profile');
    // an artist's weights; the control overrides them and keeps the artist's styles
    const owl = { ...artist('night-owl'), profiles: { crescendo: 1 } };
    const byOwl = run('artist', owl), forced = run('switch', owl), plain = run('artist', artist('night-owl'));
    assert(byOwl.every(x => x.entry.profile === 'crescendo'), 'artist weights give Crescendo');
    assert(forced.every(x => x.entry.profile === 'switch'), 'Profile Live coder with an artist without Live coder weights');
    assert(JSON.stringify(noProfile(forced)) === JSON.stringify(noProfile(plain)) && JSON.stringify(noProfile(byOwl)) === JSON.stringify(noProfile(plain)), 'the artist keeps its styles and knobs');
  },
  'D2: saved songs in a stream'() {
    const cases = [
      [{ profile: 'switch' }, { forced: 'classic', player: 'crescendo' }, 'switch', 'song'],
      [{ buildStyle: 'crescendo' }, { forced: 'switch' }, 'crescendo', 'song'],
      [{ buildStyle: 'blocks' }, { forced: 'switch' }, 'classic', 'song'],
      [{}, { forced: 'switch', player: 'crescendo' }, 'switch', 'session'],
      [{}, { forced: 'artist', player: 'crescendo' }, 'crescendo', 'player'],
      // the playlist Mix: no forced profile, the player default
      [{}, { player: 'switch' }, 'switch', 'player'],
      [{}, {}, 'classic', 'player'],
    ];
    cases.forEach(([song, ctx, want, from], i) => { const r = savedSongProfile({ id: 'x', ...song }, ctx); assert(r.profile === want && r.from === from, `case ${i}: ${JSON.stringify(r)}`); });
  },
  'artist fields profiles and growth: a broken artist fails at its paths'() {
    const ok = { ...artist('night-owl'), profiles: { switch: 2, classic: 1 }, growth: { duration: 'free', openings: { 'full-kick': 2 }, paces: { fast: 1 }, developments: { masks: 1 } } };
    const ids = RECIPES.map(r => r.id);
    assert(!validateArtist(ok, ids).errors.length, JSON.stringify(validateArtist(ok, ids).errors));
    const bad = validateArtist({ ...ok, profiles: { switch: -1, jazz: 1 }, growth: { duration: 'long', paces: { warp: 1 }, size: 2 } }, ids).errors.map(e => e.path);
    for (const p of ['profiles.switch', 'profiles.jazz', 'growth.duration', 'growth.paces.warp', 'growth.size']) assert(bad.includes(p), `${p} not reported (${bad.join(', ')})`);
  },
  'compilation profiles: the Live coder preset, old setups as before'() {
    const comp = setup => ({ seed: 'lc', options: { compilation: { every: 'song', setup, pool: POOL }, ...how, profile: 'artist' }, changes: [] });
    const lc = sessionItems(RECIPES, comp(PRESETS['live-coder']), 6);
    assert(lc.every(x => x.entry.profile === 'switch'), `Live coder preset: ${profilesOf(lc).join(', ')}`);
    const { profiles, ...old } = PRESETS.journey, j = sessionItems(RECIPES, comp(old), 6), j2 = sessionItems(RECIPES, comp(PRESETS.journey), 6);
    assert(JSON.stringify(j) === JSON.stringify(j2), 'a setup saved without profiles plays as the same setup with profiles null');
    assert(JSON.stringify(noProfile(lc)) === JSON.stringify(noProfile(j)), 'the preset draws the same artists, styles and songs as the journey');
  },
  'session option profile: an old recipe replays as Classic, a new one records it'() {
    assert(recipeProfile({}) === 'classic' && recipeProfile({ profile: 'artist' }) === 'artist', 'recipeProfile');
    const rec = profile => ({ seed: 'old', options: { styles: ['acid'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, ...how, ...(profile ? { profile } : {}) }, changes: [] });
    const old = sessionItems(RECIPES, rec(null), 3), now = sessionItems(RECIPES, rec('artist'), 3);
    assert(old.every(x => !x.entry.profile), 'a recipe without the option: every song Classic');
    assert(now.every(x => x.entry.profile === 'switch'), 'as the artist: the acid songs play as Live coder');
    // a change of the option applies from its song, as styles and knobs do
    const changed = sessionItems(RECIPES, { ...rec('classic'), changes: [{ song: 2, options: rec('crescendo').options }] }, 4);
    assert(profilesOf(changed).join() === 'classic,classic,crescendo,crescendo', profilesOf(changed).join());
  },
  'D5 written form: the same sound as the song of the director, bar by bar, for 50 seeds over all styles'() {
    let bars = 0, songs = 0;
    for (let i = 0; i < SEEDS; i++) {
      const [x] = sessionItems(RECIPES, recipeOf(i, 'classic'), 1), wf = writtenForm(x.song);
      assert(!buildSteps(wf).some(s => s.add !== undefined || s.remove !== undefined || s.set || s.pattern), `${x.song.id}: clip steps left in the written form`);
      assert(JSON.stringify(wf.sections) === JSON.stringify(x.song.sections), `${x.song.id}: sections`);
      for (let b = 0; b < barsOf(x.song); b++, bars++) {
        const a = JSON.stringify(soundAt(x.song, b)), w = JSON.stringify(soundAt(wf, b));
        assert(a === w, `${x.song.id} bar ${b}: written form ${w.slice(0, 160)} differs from ${a.slice(0, 160)}`);
      }
      songs++;
    }
    console.log(`      ${songs} songs, ${bars} bars the same`);
  },
  'D5 growth: every step of the grown songs compiles; seeded by the song id'() {
    const { live, cres } = grown();
    let steps = 0;
    for (const x of [...live, ...cres]) {
      const g = x.song;
      assert(g.crescendo && g.onAir && g.onAir.profile === x.entry.profile, `${g.id}: not grown (${x.entry.profile})`);
      const errs = []; checkBuild(g, barsOf(g), (p, m) => errs.push(`${p}: ${m}`), () => {});
      assert(!errs.length, `${g.id}: ${errs[0]}`);
      for (const at of [...new Set(buildSteps(g).map(s => s.at))]) { compileSong(stateAt(g, at).song); steps++; }
    }
    const again = sessionItems(RECIPES, recipeOf(0, 'switch'), 1, null, { grow: true })[0].song;
    assert(JSON.stringify(again) === JSON.stringify(live[0].song), 'same session, same growth');
    assert(live.filter(x => x.song.crescendo.coder).length >= SEEDS * 0.9, 'Live coder songs grow like a live coder');
    console.log(`      ${steps} steps compiled`);
  },
  'D6 shapes on air: artist weights, no metamorphosis, typed only after a cut or an interlude, voice only with an opening line'() {
    const { live } = grown();
    const shapes = live.map(x => x.song.crescendo.shape);
    assert(shapes.every(sh => !sh || sh.development !== 'metamorphosis'), 'no metamorphosis on air');
    // the first song of a session: nothing plays before it, the typed opening may come
    for (const x of live) { const sp = x.song.tracks.find(t => t.type === 'spoken'); if (x.song.crescendo.shape.opening === 'voice') assert(sp && Object.values(sp.patterns).some(p => p.way === 'opening'), `${x.song.id}: voice opening without an opening line`); }
    // after a mix the typed opening is never drawn, after a cut it may be
    const typedFirst = live.find(x => x.song.crescendo.shape.opening === 'typed') || live[0];
    const [src] = sessionItems(RECIPES, recipeOf(live.indexOf(typedFirst), 'classic'), 1);
    const forMix = growOnAir(src.song, { profile: 'switch', into: 'mix', styles: STYLES }), forCut = growOnAir(src.song, { profile: 'switch', into: 'cut', styles: STYLES });
    assert(forMix.crescendo.shape.opening !== 'typed', 'typed after a mix');
    if (typedFirst.song.crescendo.shape.opening === 'typed') assert(forCut.crescendo.shape.opening === 'typed', 'typed after a cut');
    // across sessions: every typed opening follows a cut, an interlude or nothing
    const sess = sessionItems(RECIPES, { ...recipeOf(7, 'switch'), options: { ...recipeOf(7, 'switch').options, transition: 'mix' } }, 3, null, { grow: true });
    assert(sess.slice(1).every(x => x.song.crescendo.shape.opening !== 'typed'), 'typed opening after a mix in a session');
    // the artist's growth weights sit between the song's own shape and the style's
    const wf = writtenForm(src.song), w = { openings: { 'full-kick': 1, slow: 1 }, paces: { fast: 1 }, developments: { masks: 1, 'by-type': 1 } };
    const sh = resolveShape(wf, { styles: STYLES, seed: src.song.id, weights: w }), own = resolveShape({ ...wf, growthShape: { pace: 'slow' } }, { styles: STYLES, seed: src.song.id, weights: w });
    assert(sh.from.pace === 'artist' && sh.pace === 'fast' && own.from.pace === 'song' && own.pace === 'slow', `artist weights: ${JSON.stringify(sh)} ${JSON.stringify(own.from)}`);
    assert(resolveShape(wf, { styles: STYLES, seed: src.song.id }).from.pace !== 'artist', 'no artist weights in Compose');
    const owl = { ...artist('night-owl'), growth: w }, g = growOnAir(src.song, { profile: 'switch', artist: owl, into: 'mix', styles: STYLES });
    assert(['fast'].includes(g.crescendo.shape.pace) || g.crescendo.shape.fallback, `artist pace on air: ${JSON.stringify(g.crescendo.shape)}`);
    const denied = Array.from({ length: 20 }, (_, k) => resolveShape(wf, { styles: STYLES, seed: `d${k}`, deny: { opening: ['typed'], development: ['metamorphosis'] } }));
    const others = OPENINGS.filter(o => o !== 'typed' && canPlay('opening', o, shapeFacts(wf, STYLES)));
    assert(!others.length || denied.every(x => x.opening !== 'typed'), 'denied typed opening');
    assert(denied.every(x => x.development !== 'metamorphosis'), 'denied metamorphosis');
  },
  'D6 duration: fitted songs keep their plan within a phrase; free songs are longer and the stream stays contiguous'() {
    const { live, cres } = grown();
    for (const x of [...live, ...cres]) {
      const miss = Math.abs(barsOf(x.song) - x.entry.bars);
      assert(miss <= x.plan.phrase, `${x.song.id}: ${barsOf(x.song)} bars, plan ${x.entry.bars} (phrase ${x.plan.phrase})`);
    }
    // an artist with free duration: the song waits for its typing, the next song starts later
    const free = { ...artist('night-owl'), profiles: { switch: 1 }, growth: { duration: 'free' } };
    const rec = { seed: 'libero', options: { artist: free, ...how, profile: 'artist' }, changes: [] };
    const items = sessionItems(RECIPES, rec, 4, null, { grow: true }), plain = sessionItems(RECIPES, rec, 4);
    assert(items.every(x => x.song.onAir && x.song.onAir.free), 'free growth');
    assert(items.every((x, i) => barsOf(x.song) > barsOf(plain[i].song)), `free songs longer: ${items.map(x => barsOf(x.song))} vs ${plain.map(x => barsOf(x.song))}`);
    // the stream as the radio lays it out: each song starts where the one before ends, minus its overlap
    let start = 0;
    const laid = items.map((x, i) => { const it = { song: x.song, n: i + 1, start, transition: x.entry.transition }; start += barsOf(x.song) + extraOf(x.entry.transition) - overlapOf(x.entry.transition); return it; });
    for (let i = 0; i + 1 < laid.length; i++) windowSong(laid.slice(i, i + 2));
  },
  'typing on air: rushed steps no more than in Compose; the sound does not depend on the panel width'() {
    const { live } = grown(), C = airControls('switch');
    let rushed = 0;
    for (const x of live) rushed += rushedSteps(liveCode(x.song, C, { cols: () => 80 }), x.song.id);
    const per = rushed / live.length, compose = COMPOSE_RUSHED.songs ? COMPOSE_RUSHED.rushed / COMPOSE_RUSHED.songs : Infinity;
    console.log(`      radio Live coder: ${rushed} rushed steps in ${live.length} songs (${per.toFixed(2)} a song); Compose: ${COMPOSE_RUSHED.rushed} in ${COMPOSE_RUSHED.songs} (${compose.toFixed(2)} a song)`);
    assert(per <= compose, `radio ${per.toFixed(2)} rushed steps a song, Compose ${compose.toFixed(2)}`);
    // 40 and 110 columns: the same song, the same code but for its line breaks
    for (const x of live.slice(0, 5)) {
      const a = liveCode(x.song, C, { cols: () => 40 }), b = liveCode(x.song, C, { cols: () => 110 });
      for (const at of [...new Set(buildSteps(x.song).map(s => s.at))].slice(0, 40)) {
        // (the hidden mixer names each line by its place in the code: [from, to, …] moves with the line breaks)
        const ca = a.codeAt(at), cb = b.codeAt(at), flat = c => c.replace(/\[\d+,\s*\d+,\s*\{/g, '[{').replace(/\s+/g, '');
        assert(flat(ca) === flat(cb), `${x.song.id} bar ${at}: the code differs beyond its line breaks`);
        if (a.run) assert(flat(a.run(ca)) === flat(b.run(cb)), `${x.song.id} bar ${at}: the evaluated code differs`);
      }
    }
  },
  'radio fixtures: Classic sessions rebuild the same items'() {
    for (const { name, recipe } of CLASSIC) {
      const a = sessionItems(RECIPES, recipe, SONGS), b = sessionItems(RECIPES, recipe, SONGS);
      assert(a.length === SONGS, `${name}: ${a.length} songs`);
      assert(itemsHash(a) === itemsHash(b), `${name}: two rebuilds differ`);
      fixtures.classic[name] = itemsHash(a);
    }
    if (WRITE) return;
    assert(saved && saved.classic, 'no radio fixtures: run npm run check:radio-profiles -- --write-fixtures');
    for (const [name, h] of Object.entries(fixtures.classic)) assert(saved.classic[name] === h, `${name} gives ${h}, fixture ${saved.classic[name]}; if the change is intended, run with --write-fixtures`);
  },
  'radio fixtures: grown sessions (Live coder, Crescendo, Live coder compilation) rebuild the same items'() {
    for (const { name, recipe } of GROWN) {
      const a = sessionItems(RECIPES, recipe, 2, null, { grow: true });
      assert(a.every(x => x.song.crescendo && x.song.onAir), `${name}: not grown`);
      fixtures.grown[name] = itemsHash(a);
    }
    if (WRITE) return;
    assert(saved && saved.grown, 'no grown radio fixtures: run npm run check:radio-profiles -- --write-fixtures');
    for (const [name, h] of Object.entries(fixtures.grown)) assert(saved.grown[name] === h, `${name} gives ${h}, fixture ${saved.grown[name]}; if the change is intended, run with --write-fixtures`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
if (WRITE && !failed) { fs.writeFileSync(FIXTURES_FILE, JSON.stringify({ ...(saved || {}), ...fixtures }, null, 2) + '\n'); console.log('      radio fixtures written'); }
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
