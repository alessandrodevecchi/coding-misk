// Checks for profiles in the radio (radio-profiles). No browser.
// Radio fixtures (tests/snapshots/radio-growth.json): hashes of the radio items of three sessions in Classic (styles, an
// artist, a compilation), as the radio rebuilds them (src/endless/items.js); they move only on purpose.
//   npm run check:radio-profiles                       exit 1 when any check fails
//   npm run check:radio-profiles -- --write-fixtures   rewrite the radio fixtures (an intended change only)
import fs from 'node:fs';
import { hashString } from '../src/endless/random.js';
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { sessionItems, GROWTH_ON_AIR, growsOnAir } from '../src/endless/items.js';
import { airCode, windowPart, stepRefs, HIDDEN_ORBIT } from '../src/live/air-code.js';
import { loadStyles } from './styles-dir.mjs';
import { loadArtists } from './artists-dir.mjs';
import { songProfileOnAir, savedSongProfile, recipeProfile, RADIO_PROFILES, PROFILE_CHOICES, profileOptions, customControls, controlsProfile } from '../src/endless/profile.js';
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
import { steerOnAir, airBoundaries, airOffset, ideaSteps, directorView } from '../src/endless/waypoints.js';
import { steerSong } from '../src/endless/steering.js';
import { waypointsOnAir } from '../src/endless/items.js';
import { choose } from '../src/song/coder.js';
import { typingPlan, settleOthers } from '../src/song/typing.js';
import { meterSteps } from '../src/music.js';
import { energyOf } from '../src/endless/energy.js';

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
const SEEDS = (process.env.ONLY && +process.env.SEEDS) || 50;
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

// ---------- stage 5: commands as waypoints ----------
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const AIR = airControls('switch');
const pastSteps = (song, B) => buildSteps(song).filter(s => s.at < B).map(({ i, ...s }) => s);
// what a song plays at a bar, by track: its pattern, the settings it writes, its rack and line marks (the written form
// has no line marks; a grown song's are set right at the arrival)
const heardOf = (song, bar) => soundAt(song, bar).tracks.filter(t => t.type !== 'voice').sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(t => ({ id: t.id, pattern: t.pattern, settings: t.settings, rack: t.rack || [], marks: [!!t.hush, !!t.alone, t.maskIdea || null, (t.hidden || []).length, (t.commented || []).length, t.variant ?? null] }));
const sectionStart = (song, bar) => { let at = 0; for (const s of song.sections) { if (bar < at + s.bars) return at; at += s.bars; } return at; };
// the lines of a track's block in a code (from its header to the next)
const blockOf = (code, song, id) => { const t = song.tracks.find(x => x.id === id), name = (t && (t.name || t.id)) || id, lines = code.split('\n'), i = lines.findIndex(l => l.startsWith(`// ========== ${name}`)); if (i < 0) return []; const j = lines.findIndex((l, k) => k > i && l.startsWith('// ==========')); return lines.slice(i + 1, j < 0 ? undefined : j); };
const barSec = (song, bar) => { let at = 0; for (const s of song.sections) { if (bar < at + s.bars) return (meterSteps(s.meter || '4/4') / 4) * 60 / (s.bpm || 120); at += s.bars; } return 2; };
const needOf = (L, song, from, to) => { const c = L.codeAt(to), was = settleOthers(L.codeAt(from), c, to); return was === c ? 0 : typingPlan(was, c, { style: 'human', lean: true, seed: song.id }).natural; };
const usableOf = (song, from, to) => { const avail = Math.max(0.2, (to - from) * barSec(song, to) - 0.2); return Math.max(0.2, avail - Math.min(avail * 0.5, 2)); };
const typingFits = (song, B, q) => { const L = liveCode(song, AIR, { cols: () => 80 }), bars = [...new Set(buildSteps(L.build).map(s => s.at))], prev = bars.filter(b => b < B).pop() ?? 0; return needOf(L, song, prev, B) <= usableOf(song, Math.max(prev + 0.5, q), B); };
// grown Live coder songs with room after their growth (from the songs grown for the checks above): the director's
// song, its plan and options, and its growth
let airCache = null;
const airCases = () => {
  if (airCache) return airCache;
  const { live } = grown();
  airCache = [];
  live.forEach((x, i) => {
    const g0 = x.song;
    if (!g0.crescendo.coder || barsOf(g0) - g0.crescendo.growth < 5 * x.plan.phrase || airCache.length >= 10) return;
    const rec = recipeOf(i, 'switch'), g = createSession(RECIPES, rec.seed).next(rec.options);
    airCache.push({ i, id: g0.id, seed: rec.seed, song: g.song, plan: g.plan, opts: g.opts, g0 });
  });
  return airCache;
};
// one command of each kind, asked a little after the growth (half way through what is left)
const commandsFor = x => {
  const G = x.g0.crescendo.growth, q = Math.floor(G + (barsOf(x.g0) - G) * 0.35) + 0.4, st = stateAt(x.g0, Math.floor(q)).song;
  const on = st.tracks.filter(t => !t.mute && t.type !== 'voice' && t.type !== 'spoken' && (t.clips || []).some(c => c.start <= q && q < c.start + c.bars));
  const part = ['bass', 'lead', 'pad', 'arp'].find(p => on.some(t => (p === 'lead' ? ['hook', 'guitar'].includes(t.type) : t.type === p))) || 'lead';
  const track = (on.find(t => t.type !== 'drums') || on[0] || {}).id;
  const d = Math.floor((q - airOffset(x.g0)) / (2 * x.plan.phrase)) + 1;
  const list = [{ kind: 'energy-up' }, { kind: 'darker' }, { kind: 'vary', type: part }, { kind: 'swap', type: part }, { kind: 'mute', track }, { kind: 'volume', track, value: 0.3 }, { kind: 'curve', d, value: 0.95 }, { kind: 'extend' }, { kind: 'end' }, { kind: 'more-space' }];
  return list.map((c, k) => ({ ...c, q, at: (airBoundaries(c.kind, q, x.plan, x.g0)[0] ?? 0), pend: true, id: k + 1 })).filter(c => c.at > 0);
};
const steer = (x, commands, o = {}) => steerOnAir({ grown: x.g0, song: x.song, plan: x.plan, opts: x.opts, commands, seed: x.seed, n: 0, ctx: { profile: 'switch', styles: STYLES, phrase: x.plan.phrase }, ...o });

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
  'stage 4: windows of grown songs name only their own tracks; the code on air and the hidden song stay apart'() {
    const items = sessionItems(RECIPES, { ...recipeOf(3, 'switch'), options: { ...recipeOf(3, 'switch').options, transition: 'mix' } }, 2, null, { grow: true });
    let start = 24;
    const laid = items.map((x, i) => { const it = { song: x.song, n: i + 1, start, transition: x.entry.transition }; start += barsOf(x.song) + extraOf(x.entry.transition) - overlapOf(x.entry.transition); return it; });
    const W = windowSong(laid), total = barsOf(W), errs = [];
    // every step names a track of the window (a grown song's line marks, hidden functions and masks too)
    checkBuild(W, total, (p, m) => errs.push(`${p} ${m}`), () => {});
    assert(!errs.length, `window steps: ${errs.slice(0, 3).join('; ')}`);
    const songs = laid.map((x, i) => ({ n: x.n, prefix: `s${x.n}-`, start: x.start, song: x.song, title: x.song.title, ctl: airControls('switch'), show: i ? 'hidden' : 'air' }));
    // the parts split the window: every track and every step in exactly one song
    const parts = songs.map((_, k) => windowPart(W, songs, k));
    assert(parts.reduce((a, p) => a + p.tracks.length, 0) === W.tracks.length, 'tracks split');
    assert(parts.reduce((a, p) => a + p.build.length, 0) === W.build.length, 'steps split');
    assert(parts.every((p, k) => p.build.every(s => stepRefs(s).every(id => id.startsWith(songs[k].prefix)))), 'steps stay with their song');
    const L = airCode(W, songs, { cols: () => 80 }), bars = [...new Set(buildSteps(L.build).map(s => s.at))];
    for (const b of bars.filter(x => x >= laid[1].start - 4 && x < laid[1].start + 16)) {
      const shown = L.codeAt(b), code = L.run(shown, b), decl = [...code.matchAll(/^const (\w+) =/gm)].map(m => m[1]);
      assert(new Set(decl).size === decl.length, `bar ${b}: a constant declared twice`);
      assert(!shown.includes(`// ========== ${laid[1].n} `), `bar ${b}: the hidden song is in the panel`);
      // (the hidden song starts with its own constants, renamed n2_…)
      const hs = code.indexOf('const n2_'), hidden = hs < 0 ? '' : code.slice(hs);
      if (b >= laid[1].start) assert(/\$:/.test(hidden), `bar ${b}: the incoming song plays no hidden code`);
      assert([...hidden.matchAll(/\.orbit\((\d+)\)/g)].every(m => +m[1] >= HIDDEN_ORBIT), `bar ${b}: a hidden song on the orbits of the song on air`);
      assert(!/^\s*S\$:/m.test(hidden), `bar ${b}: a hidden line played alone against the song on air`);
    }
  },
  'stage 4: a recipe saved before the growth marker replays in blocks; with it, the same songs grow'() {
    const r = GROWN[0].recipe, old = sessionItems(RECIPES, r, 2), blocks = sessionItems(RECIPES, r, 2, null, { grow: false });
    assert(!growsOnAir(r) && growsOnAir({ ...r, growth: GROWTH_ON_AIR }), 'the marker');
    assert(itemsHash(old) === itemsHash(blocks) && old.every(x => !x.song.crescendo), 'a recipe without the marker plays in blocks, as heard');
    const marked = sessionItems(RECIPES, { ...r, growth: GROWTH_ON_AIR }, 2), forced = sessionItems(RECIPES, r, 2, null, { grow: true });
    assert(marked.every(x => x.song.crescendo && x.song.onAir), 'a recipe with the marker grows its songs');
    assert(itemsHash(marked) === itemsHash(forced), 'the marker grows the same songs as the growth of stage 3');
    // a Classic recipe with the marker: the same items as without it (Classic songs never grow)
    for (const { name, recipe } of CLASSIC) assert(itemsHash(sessionItems(RECIPES, { ...recipe, growth: GROWTH_ON_AIR }, SONGS)) === itemsHash(sessionItems(RECIPES, recipe, SONGS)), `${name}: the marker moves a Classic session`);
  },
  'stage 4: the Custom profile is saved with the session and replays the same'() {
    const custom = { base: 'switch', controls: { tracks: false, notes: false, steps: false, fnBus: true, fnLevel: true, fnCrunch: true, fnVoice: true, fnSong: false, fnLib: false } };
    const po = profileOptions('custom', custom), C = customControls(po.custom);
    assert(po.profile === 'switch' && C.comments === 'none' && C.functions === 'mixer' && C.duration === 'fitted' && controlsProfile(C) === 'switch', `custom: ${JSON.stringify(po)} → ${C.comments}, ${C.functions}, ${C.duration}`);
    assert(profileOptions('custom', { base: 'classic', controls: {} }).profile === 'classic' && profileOptions('custom', { base: 'switch', controls: { growth: 'crescendo' } }).profile === 'crescendo', 'what a combination amounts to');
    const rec = { seed: 'su-misura', options: { ...recipeOf(5, 'artist').options, ...po }, changes: [], growth: GROWTH_ON_AIR };
    const a = sessionItems(RECIPES, rec, 2), b = sessionItems(RECIPES, JSON.parse(JSON.stringify(rec)), 2);
    assert(a.every(x => x.entry.profile === 'switch' && x.song.onAir && !x.song.onAir.free), 'Custom songs grow as Live coder, fitted');
    assert(itemsHash(a) === itemsHash(b), 'a replay gives the same songs');
    // a free duration in the Custom controls: the song waits for its typing
    const free = sessionItems(RECIPES, { ...rec, options: { ...rec.options, ...profileOptions('custom', { base: 'switch', controls: { duration: 'free' } }) } }, 1);
    assert(free[0].song.onAir.free && barsOf(free[0].song) >= barsOf(a[0].song), 'Custom free duration');
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
  'stage 5 (5.1, 5.3): a command on a grown song is the next waypoint; steps and sound before its boundary stay, every step compiles, the steered song plays from the arrival'() {
    const cs = airCases();
    let n = 0, steps = 0;
    for (const x of cs) for (const c of commandsFor(x)) {
      const r = steer(x, [c]);
      if (!r.commands.length) continue;
      const N = r.song, B = r.commands[0].at, wp = N.onAir.waypoints[0], E = wp.to;
      assert(wp.at === B && E > B, `${x.id} ${c.kind}: waypoint ${JSON.stringify(wp)}`);
      assert(airBoundaries(c.kind, c.q, x.plan, x.g0).includes(B), `${x.id} ${c.kind}: boundary ${B} is not a boundary after bar ${c.q}`);
      assert(same(pastSteps(N, B), pastSteps(x.g0, B)), `${x.id} ${c.kind}: steps before bar ${B} changed`);
      for (let b = 0; b < B; b++) assert(same(soundAt(N, b), soundAt(x.g0, b)), `${x.id} ${c.kind}: the sound of bar ${b} changed (boundary ${B})`);
      assert(buildSteps(N).filter(s => s.by === 'listener').every(s => s.at >= B && s.at < E), `${x.id} ${c.kind}: a move outside its waypoint`);
      const errs = []; checkBuild(N, barsOf(N), (p, m) => errs.push(`${p}: ${m}`), () => {});
      assert(!errs.length, `${x.id} ${c.kind}: ${errs[0]}`);
      for (const at of [...new Set(buildSteps(N).map(s => s.at))].filter(b => b >= B - 1)) { compileSong(stateAt(N, at).song); steps++; }
      // from the arrival the song plays the director's rewrite (its written form), bar by bar
      const W = writtenForm(r.plain), off = airOffset(x.g0);
      assert(barsOf(N) === barsOf(W) + off, `${x.id} ${c.kind}: ${barsOf(N)} bars, the rewrite ${barsOf(W)} + ${off}`);
      for (let b = E; b < barsOf(N); b++) assert(same(heardOf(N, b), heardOf(W, b - off)), `${x.id} ${c.kind}: bar ${b} plays ${JSON.stringify(heardOf(N, b)).slice(0, 200)}, the rewrite ${JSON.stringify(heardOf(W, b - off)).slice(0, 200)}`);
      // the code already on screen stays: the code of the moment of every step before the section that holds the boundary
      const L0 = liveCode(x.g0, AIR, { cols: () => 80 }), L1 = liveCode(N, AIR, { cols: () => 80 }), sec = sectionStart(x.g0, B - 1);
      // (a line whose lane the code of the moment does not read, a guitar's mask with postgain, shows every clip of its
      // track at every bar: its later clips are not the past)
      for (const b of [...new Set(buildSteps(L0.build).map(s => s.at))].filter(b => b < sec)) { const was = L0.codeAt(b); if (!/postgain\((section|clip)\d+/.test(was)) assert(was === L1.codeAt(b), `${x.id} ${c.kind}: the code of bar ${b} changed (boundary ${B})`); }
      n++;
    }
    assert(n >= 30, `only ${n} commands applied`);
    console.log(`      ${n} commands on ${cs.length} grown songs, ${steps} steps compiled`);
  },
  'stage 5 (5.1): cancel and replay give the same steps; the director sees the same song'() {
    for (const x of airCases().slice(0, 4)) {
      const [c1, c2] = [commandsFor(x).find(c => c.kind === 'energy-up'), commandsFor(x).find(c => c.kind === 'darker')];
      const one = steer(x, [c1]), two = steer(x, [c1, { ...c2, id: 2 }]);
      // replay: the recorded boundaries give the same song
      assert(same(steer(x, two.commands).song, two.song), `${x.id}: a replay of two commands differs`);
      // cancel the second: the song of the first alone
      assert(same(steer(x, two.commands.slice(0, 1)).song, one.song), `${x.id}: cancelling a command does not give the song back`);
      assert(same(pastSteps(two.song, two.commands[1].at), pastSteps(steer(x, two.commands.slice(0, 1)).song, two.commands[1].at)), `${x.id}: the second command changed the steps before it`);
      const view = directorView({ song: x.song, plan: x.plan, opts: x.opts, commands: two.commands, seed: x.seed, n: 0, grown: x.g0 });
      assert(same(view.song, two.plain) && same(view.plan, two.plan), `${x.id}: the director's view differs from the steered song`);
    }
  },
  'stage 5 (5.2): the boundary waits for the typing; late when no boundary is left'() {
    let waited = 0, rushed = 0, moves = 0, pasted = 0;
    for (const x of airCases()) {
      // a Vary asked a moment before a phrase: its notes cannot be typed in time, the phrase after takes it
      const v = commandsFor(x).find(c => c.kind === 'vary');
      if (v) {
        const cands = airBoundaries('vary', v.q, x.plan, x.g0), late = { ...v, q: cands[0] - 0.15, at: cands[0] };
        const r = steer(x, [late]);
        if (r.commands.length && airBoundaries('vary', late.q, x.plan, x.g0).length > 1) {
          const B = r.commands[0].at, fits = typingFits(r.song, B, late.q);
          assert(B === airBoundaries('vary', late.q, x.plan, x.g0)[1] || fits, `${x.id}: a Vary 0.15 bars before its phrase applies there (${B}) without time to type it`);
          if (B !== cands[0]) waited++;
        }
      }
      // every move of a waypoint is typed at a person's pace (the boundary's edit, then each move from the one before)
      for (const c of commandsFor(x).slice(0, 4)) {
        const r = steer(x, [c]);
        if (!r.commands.length) continue;
        // (the moves and the arrival; a section boundary on the way is the written form's own edit in place, as after
        // a growth)
        const wp = r.song.onAir.waypoints[0], L = liveCode(r.song, AIR, { cols: () => 80 }), mine = new Set([...buildSteps(r.song).filter(s => s.by === 'listener').map(s => s.at), wp.to]);
        const all = [...new Set(buildSteps(L.build).map(s => s.at))].filter(b => b > wp.at && b <= wp.to), bars = all.filter(b => mine.has(b));
        // (a waypoint that reached the last phrase had no room left: its edits are pasted as the paste rule allows)
        if (wp.to >= barsOf(r.song) - x.plan.phrase) { pasted++; continue; }
        let from = wp.at;
        for (const b of bars) { from = Math.max(from, ...all.filter(k => k < b)); moves++; const nd = needOf(L, r.song, from, b), us = usableOf(r.song, from + 0.5, b); if (nd > us * 1.1) { rushed++; if (rushed <= 6) console.log(`      rushed: ${x.id} ${c.kind} ${from} -> ${b} (${nd.toFixed(1)} s for ${us.toFixed(1)}), waypoint ${wp.at}-${wp.to}, song ${barsOf(r.song)}`); } from = b; }
      }
      // the last phrase: no boundary is left for a phrase command; the mixer still has its next bars
      const end = barsOf(x.g0) - x.plan.phrase + 1;
      assert(!airBoundaries('energy-up', end, x.plan, x.g0).length, `${x.id}: a boundary in the last phrase`);
      assert(airBoundaries('mute', end, x.plan, x.g0)[0] === end + 1, `${x.id}: the mixer's next bar`);
    }
    console.log(`      ${waited} Vary waited for the phrase after; ${rushed} of ${moves} moves rushed; ${pasted} waypoints reached the last phrase`);
    assert(waited >= 1, 'no command waited for its typing');
    assert(rushed <= Math.max(2, moves * 0.1), `${rushed} of ${moves} moves rushed`);
  },
  'stage 5 (5.3): End leads to the ending one line at a time; mute is typed as _$:, a volume as .gain() on the line'() {
    let ends = 0, mutes = 0, vols = 0;
    for (const x of airCases()) {
      const cmds = commandsFor(x);
      const e = cmds.find(c => c.kind === 'end'), r = e && steer(x, [e]);
      if (r && r.commands.length) {
        const wp = r.song.onAir.waypoints[0], gone = buildSteps(r.song).filter(s => s.by === 'listener' && (s.remove !== undefined || s.mute !== undefined));
        const W = writtenForm(r.plain);
        assert(barsOf(r.song) === barsOf(W) + airOffset(x.g0) && barsOf(r.song) > wp.to, `${x.id}: End cut the song (${barsOf(r.song)} bars, arrival ${wp.to})`);
        assert(new Set(gone.map(s => s.at)).size === gone.length, `${x.id}: End took out two lines on one bar`);
        // the last waypoint is the song's ending: its last phrase as the director wrote it
        assert(barsOf(r.song) - wp.to <= x.plan.phrase, `${x.id}: End arrives ${barsOf(r.song) - wp.to} bars before the end`);
        ends++;
      }
      const m = cmds.find(c => c.kind === 'mute'), rm = m && steer(x, [m]);
      if (rm && rm.commands.length) {
        const st = buildSteps(rm.song).find(s => s.by === 'listener' && s.mute === m.track);
        if (st) { const code = liveCode(rm.song, AIR, { cols: () => 80 }).codeAt(st.at); assert(blockOf(code, rm.song, m.track).some(l => /^_\$:/.test(l)), `${x.id}: the muted line has no _$: at bar ${st.at}`); mutes++; }
      }
      const vcmd = cmds.find(c => c.kind === 'volume'), rv = vcmd && steer(x, [vcmd]);
      if (rv && rv.commands.length) {
        const st = buildSteps(rv.song).find(s => s.by === 'listener' && s.set && s.set.track === vcmd.track && s.set.gain === vcmd.value);
        if (st) { const code = liveCode(rv.song, AIR, { cols: () => 80 }).codeAt(st.at); assert(blockOf(code, rv.song, vcmd.track).some(l => l.includes(`.gain(${vcmd.value})`)), `${x.id}: the volume is not on the line at bar ${st.at}`); vols++; }
      }
    }
    console.log(`      ${ends} End, ${mutes} mute, ${vols} volume`);
    assert(ends >= 4 && mutes >= 3 && vols >= 3, 'too few cases');
  },
  'stage 5 (5.4): Vary and Swap are typed as small notes edits of the line, ending on the new part'() {
    let varies = 0, multi = 0, swaps = 0;
    // the edits of an idea: each a small step, the last the new idea
    const a = { degrees: '<0 2 4 ~ 5 3 2 0>', scale: 'minor', per: 'slot' }, z = { degrees: '<0 3 4 5 7 3 2 ~>', scale: 'minor', per: 'slot' }, st = ideaSteps(a, z);
    assert(st.length >= 2 && same(st[st.length - 1], z) && st.every((x, i) => !same(x, i ? st[i - 1] : a)), `ideaSteps ${JSON.stringify(st)}`);
    for (const x of airCases()) for (const c of commandsFor(x).filter(c => c.kind === 'vary' || c.kind === 'swap')) {
      const r = steer(x, [c]);
      if (!r.commands.length) continue;
      const wp = r.song.onAir.waypoints[0], W = writtenForm(r.plain), off = airOffset(x.g0);
      // the tracks the command changed: their line plays the new part at the arrival
      const changed = W.tracks.filter(t => { const p = (t.clips.find(k => k.start <= wp.to - off && wp.to - off < k.start + k.bars) || {}).pattern; return p && /^[VS]\d+$/.test(p); });
      if (!changed.length) continue;
      for (const t of changed) {
        const edits = buildSteps(r.song).filter(s => s.by === 'listener' && s.notes && s.notes.track === t.id);
        const heard = heardOf(r.song, wp.to).find(h => h.id === t.id), want = heardOf(W, wp.to - off).find(h => h.id === t.id);
        assert(heard && want && same(heard.pattern, want.pattern), `${x.id} ${c.kind}: ${t.id} does not play its new part at the arrival`);
        if (c.kind === 'vary') { assert(edits.length >= 1, `${x.id}: Vary ${t.id} typed without notes edits`); varies++; if (edits.length >= 2) multi++; }
        else swaps++;
      }
    }
    console.log(`      ${varies} Vary (${multi} in two or more edits), ${swaps} Swap`);
    assert(varies >= 4 && multi >= 1, 'too few Vary cases');
  },
  'stage 5 (5.5): the chooser on air reaches a curve point sooner than the default chooser'() {
    let air = 0, plain = 0, sooner = 0, later = 0, cases = 0;
    for (const x of airCases()) {
      const q = commandsFor(x)[0].q, B0 = airBoundaries('curve', q, x.plan, x.g0)[0], d = Math.floor((B0 - airOffset(x.g0)) / (2 * x.plan.phrase));
      if (!(d < x.plan.plan.length - 1)) continue;
      // the energy of the coming part set to the top: the moves that raise it first
      const c = { kind: 'curve', d, value: 1, q, at: B0, pend: true, id: 1 };
      const a = steer(x, [c]), b = steer(x, [c], { chooser: () => choose });
      if (!a.commands.length || !b.commands.length || a.commands[0].at !== b.commands[0].at) continue;
      const opts = { usual: a.plan.usualHigh, weights: a.plan.R.energy }, e = (song, k) => energyOf(stateAt(song, k).song, opts);
      const reach = r => { const wp = r.song.onAir.waypoints[0], want = e(r.song, wp.to) - 0.02; for (let k = wp.at; k <= wp.to; k++) if (e(r.song, k) >= want) return k - wp.at; return wp.to - wp.at; };
      const ra = reach(a), rb = reach(b);
      if (ra === rb && ra === 0) continue;
      cases++; air += ra; plain += rb; if (ra < rb) sooner++; if (ra > rb) later++;
    }
    console.log(`      energy point: ${cases} cases, on air ${air} bars in all, default ${plain}; sooner ${sooner}, later ${later}`);
    assert(cases >= 3 && sooner >= 1 && air <= plain, 'the chooser on air does not reach the curve point sooner');
  },
  'stage 5: replays give the same songs; a recipe of growth version 1 and Classic recipes steer as before'() {
    const x = airCases()[0], c = commandsFor(x).find(k => k.kind === 'energy-up'), r = steer(x, [c]);
    const rec = { ...recipeOf(x.i, 'switch'), growth: GROWTH_ON_AIR, steering: r.commands.map(k => ({ song: 0, ...k })) };
    assert(waypointsOnAir(rec) && GROWTH_ON_AIR === 2, 'growth marker 2');
    const a = sessionItems(RECIPES, rec, 1)[0].song, b = sessionItems(RECIPES, JSON.parse(JSON.stringify(rec)), 1)[0].song;
    assert(same(a, b) && same(a, r.song), 'a replay with the same commands gives the same song');
    // growth version 1 (stage 4): the steered song grown again, as it was heard
    const old = sessionItems(RECIPES, { ...rec, growth: 1 }, 1)[0].song;
    assert(old.onAir && !old.onAir.waypoints && !same(old, a), 'growth version 1 replays its steered song grown again, without waypoints');
    // Classic: steering as before
    const cl = { ...CLASSIC[0].recipe, growth: GROWTH_ON_AIR, steering: [{ song: 1, kind: 'energy-up', at: 16 }, { song: 1, kind: 'mute', track: 'bass', at: 20 }] };
    const items = sessionItems(RECIPES, cl, 2), ses = createSession(RECIPES, cl.seed); ses.next(cl.options); const g = ses.next(cl.options);
    assert(same(items[1].song, steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cl.steering.map(({ song: _, ...k }) => k), seed: cl.seed, n: 1 }).song), 'a Classic song steers as before');
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
// (ONLY=text runs the checks whose name holds it, while working on one part; the fixtures are not written then)
const ONLY = process.env.ONLY;
for (const [name, fn] of Object.entries(CHECKS)) {
  if (ONLY && !name.includes(ONLY)) continue;
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
if (WRITE && !failed && !ONLY) { fs.writeFileSync(FIXTURES_FILE, JSON.stringify({ ...(saved || {}), ...fixtures }, null, 2) + '\n'); console.log('      radio fixtures written'); }
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
