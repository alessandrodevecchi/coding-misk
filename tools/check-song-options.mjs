// Checks for the options of how a song is made and the New song panel (openspec new-song-panel): the shared options
// store (D1), the director's length (D8), the growth inside the planned length and the length target (D12), Genera
// (D7) and Sorprendimi (D13). No browser.
//   npm run check:song-options          run every check; exit 1 when any fails
//   npm run check:song-options -- --only <text>
import fs from 'node:fs';
import { loadStyles } from './styles-dir.mjs';
import { loadArtists } from './artists-dir.mjs';
import { withDefaults } from '../src/endless/recipe.js';
import { createSongOptions, RADIO_KEY, NEW_SONG_KEY, SONG_KEYS, readOptions } from '../src/endless/song-options.js';
import { OPTION_DEFAULTS } from '../src/endless/director.js';
import { TRANSITION_KINDS, HARMONY_MODES } from '../src/endless/artist.js';
import { RADIO_CHOICES, CUSTOM_DEFAULT, profileOptions } from '../src/endless/profile.js';
import { styleId } from '../src/endless/recipe.js';
import { PRESETS } from '../src/endless/compilation.js';
import { SESSION_SOURCES } from '../src/material/index.js';
import { cleanVoice, voiceOption } from '../src/endless/voice-options.js';
import { cleanSound, isAutoSound } from '../src/endless/voice-sound.js';
import { generateSong, surpriseValues, songConfig } from '../src/endless/new-song.js';
import { grownDuration } from '../src/live/card-duration.js';
import { composeGrowth } from '../src/endless/growth.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { baseConfig, controlsOf, plannedOf, setDuration, normalConfig } from '../src/live/song-config.js';
import { growthRules, resolveProfile } from '../src/live/profiles.js';
import { setSpokenContext } from '../src/song/spoken.js';
import { compileSong } from '../src/song/compile.js';
import { parseSong } from '../src/songs.js';
import { liveCode } from '../src/live/live-code.js';
import { stateAt } from '../src/song/build.js';
import { BUILTIN_PRESETS, presetValues } from '../src/endless/song-presets.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const clone = o => JSON.parse(JSON.stringify(o));
const RECIPES = loadStyles().map(withDefaults), ARTISTS = loadArtists();
const STYLES = Object.fromEntries(loadStyles().map(r => [r.id, r]));
setSpokenContext({ files: {}, lengths: {}, lang: 'it', styles: STYLES });
const memStore = (init = {}) => { const m = clone(init); return { get: (k, f) => (k in m ? clone(m[k]) : f), set: (k, v) => { m[k] = clone(v); }, remove: k => { delete m[k]; }, raw: m }; };
const usable = () => ARTISTS;
const PATTERNS = [{ id: 'p1', kind: 'basslines', name: 'mine' }];

// the radio's read and current() before new-song-panel (src/radio/radio.js on develop 8baeeff), as a reference
function oldRadio(saved0, ids, artists, userPatterns) {
  const saved = saved0 || {};
  const opts = {
    styles: (saved.styles || []).map(styleId).filter(id => ids.includes(id)),
    chaos: saved.chaos ?? OPTION_DEFAULTS.chaos, energy: saved.energy ?? OPTION_DEFAULTS.energy, complexity: saved.complexity ?? OPTION_DEFAULTS.complexity,
    talk: saved.talk ?? OPTION_DEFAULTS.talk, artist: saved.artist ?? null,
    transition: ['artist', ...TRANSITION_KINDS].includes(saved.transition) ? saved.transition : 'artist',
    harmony: ['artist', ...HARMONY_MODES].includes(saved.harmony) ? saved.harmony : 'artist',
    profile: RADIO_CHOICES.includes(saved.profile) ? saved.profile : OPTION_DEFAULTS.profile,
    custom: saved.custom && typeof saved.custom === 'object' && saved.custom.controls ? saved.custom : clone(CUSTOM_DEFAULT),
    incoming: ['profile', 'hidden', 'visible'].includes(saved.incoming) ? saved.incoming : 'profile',
    materialDefault: SESSION_SOURCES.includes(saved.materialDefault) ? saved.materialDefault : SESSION_SOURCES.includes(saved.material) ? saved.material : 'mix',
    scope: saved.scope === 'session' ? 'session' : 'song', temp: saved.temp && saved.temp.id ? saved.temp : null, diceRange: saved.diceRange !== false,
    sounds: typeof saved.sounds === 'string' ? saved.sounds : null,
    compilation: ['song', 'some'].includes(saved.compilation) ? saved.compilation : 'off',
    compSetup: saved.compSetup && typeof saved.compSetup === 'object' ? saved.compSetup : clone(PRESETS.journey), compPreset: saved.compPreset || 'journey',
    compLocks: saved.compLocks && typeof saved.compLocks === 'object' ? saved.compLocks : {},
    voice: cleanVoice(saved.voice && saved.voice.presence === 'never' ? { ...saved.voice, presence: 'style' } : saved.voice),
    narratorSound: cleanSound(saved.narratorSound),
    voices: { narrator: !(saved.voices && saved.voices.narrator === false) && !(saved.custom && saved.custom.controls && saved.custom.controls.narrator === false), track: !(saved.voices && saved.voices.track === false) && !(saved.voice && saved.voice.presence === 'never') },
  };
  if (opts.custom && opts.custom.controls && opts.custom.controls.narrator !== undefined) { const { narrator: _, ...rest } = opts.custom.controls; opts.custom = { ...opts.custom, controls: rest }; }
  opts.material = opts.materialDefault;
  if (!opts.styles.length) opts.styles = [ids.includes('synthwave') ? 'synthwave' : ids[0]];
  const artistOf = id => (id ? artists().find(a => a.id === id) || (opts.temp && opts.temp.id === id ? opts.temp : null) : null);
  const a = artistOf(opts.artist), up = userPatterns();
  const how = { transition: opts.transition, harmony: opts.harmony, ...profileOptions(opts.profile, opts.custom), ...(opts.sounds ? { sounds: opts.sounds } : {}), ...(opts.material !== 'mix' ? { material: opts.material } : {}), ...(up.length ? { userPatterns: up } : {}), ...(voiceOption(opts.voice) ? { voice: voiceOption(opts.voice) } : {}), ...(isAutoSound(opts.narratorSound) ? {} : { narratorSound: cleanSound(opts.narratorSound) }), ...(opts.voices.narrator && opts.voices.track ? {} : { voices: { ...(opts.voices.narrator ? {} : { narrator: false }), ...(opts.voices.track ? {} : { track: false }) } }) };
  if (opts.compilation !== 'off') return { opts, current: { compilation: { every: opts.compilation, setup: clone(opts.compSetup), pool: clone(artists()), ...(Object.keys(opts.compLocks).length ? { locks: { ...opts.compLocks } } : {}) }, ...how } };
  return { opts, current: a ? { artist: clone(a), ...how } : { styles: opts.styles.slice(), chaos: opts.chaos, energy: opts.energy, complexity: opts.complexity, talk: opts.talk, ...how } };
}
// saved radio states of several ages
const SAVED = [
  null,
  { styles: ['synthwave', 'berlin-techno'], chaos: 0.7, energy: 0.4, complexity: 0.9, talk: 0.2 },
  { styles: ['trance'], artist: ARTISTS[0] && ARTISTS[0].id, profile: 'switch', material: 'composed' },
  { styles: ['lo-fi'], profile: 'custom', custom: { base: 'crescendo', controls: { narrator: false, view: 'compact' } }, voice: { presence: 'never', phrases: '2-3' } },
  { styles: ['jazz'], transition: 'echo', harmony: 'free', compilation: 'some', compLocks: { chaos: 0.3 }, sounds: 'abc', narratorSound: { style: 'robot' }, voices: { track: false } },
  { styles: ['synthwave'], profile: 'crescendo', voice: { phrases: '6-8', kind: 'repeated', ways: ['refrain'], presence: 'always' }, materialDefault: 'varied', diceRange: false, scope: 'session' },
];
const radioOf = (store, up = () => PATTERNS) => createSongOptions({ store, key: RADIO_KEY, recipes: RECIPES, artists: usable, userPatterns: up });
const panelOf = (store, radio) => createSongOptions({ store, key: NEW_SONG_KEY, recipes: RECIPES, artists: usable, userPatterns: () => PATTERNS, from: radio });
// the length heard of a song with its configuration: grown (the card's length) or as written
const heard = song => { const g = grownDuration(song, STYLES); return g ? g.seconds : parseSong(compileSong(song)).seconds; };
const writtenSecs = song => parseSong(compileSong({ ...song, config: undefined })).seconds;
const RANGE = { short: [120, 150], medium: [180, 240], long: [300, 360] };
// seconds of one phrase and of a double phrase of a song
const phraseSecs = (song, phrase) => { const s = song.sections[0], beats = Number(s.meter.split('/')[0]) * 4 / Number(s.meter.split('/')[1]); return phrase * beats * 60 / s.bpm; };
const genWith = (patch, seed, recipes = RECIPES) => { const st = memStore(); const p = panelOf(st, radioOf(memStore())); p.set(patch); return generateSong({ recipes, options: p, seed }); };
const withProfile = (song, profile, extra = {}) => ({ ...song, config: { ...normalConfig({ profile, live: profile !== 'classic', options: extra }), ...(song.config.durationTarget ? { durationTarget: song.config.durationTarget } : {}) } });

const CHECKS = {
'old saved radio options read the same, and the radio director options are the same as before (D1)': () => {
  const ids = RECIPES.map(r => r.id);
  for (const saved of SAVED) {
    const st = memStore(saved ? { [RADIO_KEY]: saved } : {}), o = radioOf(st), ref = oldRadio(saved, ids, usable, () => PATTERNS);
    for (const k of Object.keys(ref.opts)) assert(JSON.stringify(o.state[k]) === JSON.stringify(ref.opts[k]), `${JSON.stringify(saved)}: ${k} reads ${JSON.stringify(o.state[k])}, before ${JSON.stringify(ref.opts[k])}`);
    assert(JSON.stringify(o.directorOptions({ use: 'radio' })) === JSON.stringify(ref.current), `${JSON.stringify(saved)}: director options differ`);
    assert(!('length' in o.directorOptions({ use: 'radio' })), 'the radio sends a length');
  }
},
'a panel change leaves the radio alone, and the radio leaves the panel alone (D1)': () => {
  const st = memStore({ [RADIO_KEY]: SAVED[1] }), radio = radioOf(st), panel = panelOf(st, radio), before = JSON.stringify(st.raw[RADIO_KEY]);
  panel.set({ energy: 0.9, voices: { narrator: true, track: false }, profile: 'switch', length: 'medium' });
  assert(JSON.stringify(st.raw[RADIO_KEY]) === before && radio.state.energy === 0.4 && radio.state.voices.track, 'the radio store moved with the panel');
  radio.state.chaos = 0.1; radio.save();
  assert(panel.state.chaos === 0.7 && st.raw[NEW_SONG_KEY].chaos === 0.7, 'the panel moved with the radio');
  // reloaded: each reads its own
  const radio2 = radioOf(st), panel2 = panelOf(st, radio2);
  assert(panel2.state.energy === 0.9 && panel2.state.length === 'medium' && radio2.state.energy === 0.4, 'not kept apart after a reload');
},
'the panel starts from a copy of the radio, Prendi dalla radio copies again, session fields stay with the radio (D1)': () => {
  const st = memStore({ [RADIO_KEY]: SAVED[4] }), radio = radioOf(st), panel = panelOf(st, radio);
  for (const k of ['styles', 'chaos', 'energy', 'sounds', 'narratorSound', 'voices']) assert(JSON.stringify(panel.state[k]) === JSON.stringify(radio.state[k]), `first open: ${k} not copied`);
  assert(panel.state.transition === 'artist' && panel.state.harmony === 'artist' && panel.state.compilation === 'off' && !Object.keys(panel.state.compLocks).length, 'first open copied session fields');
  assert(!('compilation' in st.raw[NEW_SONG_KEY]) && !('transition' in st.raw[NEW_SONG_KEY]), 'the panel stores session fields');
  radio.state.profile = 'switch'; radio.state.styles = ['synthwave']; radio.save();
  panel.set({ preset: 'fresh' });
  panel.takeFrom(radio);
  assert(panel.state.profile === 'switch' && panel.state.styles.join() === 'synthwave' && panel.state.preset === '', 'Prendi dalla radio did not copy, or the preset stayed');
  assert(panel.state.compilation === 'off', 'Prendi dalla radio copied the compilation');
  assert(SONG_KEYS.every(k => !['transition', 'harmony', 'incoming', 'compilation', 'compSetup', 'compPreset', 'compLocks', 'scope', 'diceRange'].includes(k)), 'a session field in SONG_KEYS');
},
'length only with use new-song, and equal director options otherwise (D1, D8)': () => {
  const st = memStore({ [RADIO_KEY]: SAVED[1] }), radio = radioOf(st), panel = panelOf(st, radio);
  const a = JSON.stringify(radio.directorOptions({ use: 'radio' })), b = JSON.stringify(panel.directorOptions({ use: 'new-song' }));
  assert(a === b, 'same values, different director options');
  panel.set({ length: 'short' });
  const p = panel.directorOptions({ use: 'new-song' });
  assert(p.length === 'short' && p.lengthHeard === true && !('length' in panel.directorOptions({ use: 'radio' })), 'length in the wrong place');
  const { length: _, lengthHeard: __, ...rest } = p;
  assert(JSON.stringify(rest) === a, 'the panel options differ by more than the length');
},
'Genera: profile and Custom controls as the song configuration, voices, narrator, seed (D7)': () => {
  const g1 = genWith({ styles: ['synthwave'], profile: 'switch' }, 'ns-a'), g2 = genWith({ styles: ['synthwave'], profile: 'switch' }, 'ns-a');
  assert(JSON.stringify(g1.song) === JSON.stringify(g2.song), 'same seed, different songs');
  assert(g1.config.profile === 'switch' && g1.config.live === true && !g1.config.durationTarget, `Live coder config ${JSON.stringify(g1.config)}`);
  const c = genWith({ styles: ['synthwave'], profile: 'custom', custom: { base: 'switch', controls: { duration: 'free', opening: 'full-kick' } } }, 'ns-b');
  assert(c.config.profile === 'switch' && c.config.live && c.config.options && c.config.options.opening === 'full-kick', `Custom config ${JSON.stringify(c.config)}`);
  assert(controlsOf(baseConfig(c.song)).opening === 'full-kick', 'the song does not play with the opening');
  const cl = genWith({ styles: ['synthwave'], profile: 'classic', voices: { narrator: false, track: false } }, 'ns-c');
  assert(cl.config.profile === 'classic' && !cl.config.live && cl.config.options && cl.config.options.narrator === false, `Classic narrator off ${JSON.stringify(cl.config)}`);
  assert(!cl.song.tracks.some(t => t.type === 'spoken'), 'Voce: traccia off, the song has a voice track');
  const comp = genWith({ styles: ['synthwave'], material: 'composed', complexity: 0.6 }, 'ns-d');
  assert(comp.entry.material && Object.values(comp.entry.material).some(v => v === 'generated'), `composed material: ${JSON.stringify(comp.entry.material)}`);
  const a = ARTISTS[0], ar = genWith({ artist: a.id }, 'ns-e');
  assert(ar.artist && ar.artist.id === a.id && ar.song.style.en.startsWith(`${a.name} · `), 'artist song without the artist name');
},
'Breve in Classic lasts 2 to 2.5 minutes give or take half a double phrase (D8, D12)': () => {
  for (const seed of ['br-1', 'br-2', 'br-3', 'br-4']) {
    const g = genWith({ styles: ['synthwave', 'berlin-techno'], profile: 'classic', length: 'short' }, seed), s = heard(g.song), d = 2 * phraseSecs(g.song, g.plan.phrase);
    assert(s >= 120 - d / 2 - phraseSecs(g.song, g.plan.phrase) && s <= 150 + d / 2, `${seed}: Breve in Classic lasts ${s.toFixed(1)} s`);
  }
},
'a generated Media Live coder song grows the same in every place and lands in 3 to 4 minutes (D12)': () => {
  let n = 0;
  for (const seed of ['md-1', 'md-2', 'md-3', 'md-4', 'md-5']) {
    const g = genWith({ styles: ['synthwave', 'berlin-techno', 'dark-cyberpunk'].slice(0, 1 + (n % 3)), profile: 'switch', length: 'medium' }, seed);
    const song = g.song, cfg = baseConfig(song), C = controlsOf(cfg);
    assert(C.duration === 'planned', `${seed}: duration ${C.duration}`);
    // the page and the Compose worker (composeGrowth with the page's options), the card length (grownDuration)
    const page = composeGrowth(song, { narrated: C.narrated, rules: growthRules(C, { styles: STYLES }), planned: plannedOf(cfg, C, STYLES) });
    const card = grownDuration(song, STYLES);
    const live = liveCode(page, C, {}), meta = parseSong(live.now ? compileSong(stateAt(live.build, 0).song) : live.codeAt(0));
    assert(meta.bars === card.bars, `${seed}: page ${meta.bars} bars, card ${card.bars}`);
    const ph = phraseSecs(song, g.plan.phrase), d = 2 * ph;
    assert(card.seconds >= 180 - d / 2 - 0.5 && card.seconds <= 240 + d / 2 + 0.5, `${seed}: heard ${card.seconds.toFixed(1)} s, not 3 to 4 minutes`);
    // fitted in Compose (no target) about doubles it
    const free = composeGrowth(song, { narrated: C.narrated, rules: growthRules({ ...C, duration: 'free' }, { styles: STYLES }) });
    assert(free.crescendo.growth > page.crescendo.growth || barsOf(free) > barsOf(page), `${seed}: the planned growth is not shorter than the free one`);
    console.log(`      ${seed}: written ${writtenSecs(song).toFixed(0)} s, heard ${card.seconds.toFixed(0)} s (${card.bars} bars), free growth ${barsOf(free)} bars`);
    n++;
  }
},
'the length target holds across profile switches, the written music unchanged (D12)': () => {
  for (const [seed, length] of [['tg-1', 'medium'], ['tg-2', 'short'], ['tg-3', 'long'], ['tg-4', 4]]) {
    const g = genWith({ styles: ['synthwave', 'berlin-techno'], profile: 'classic', length }, seed), ph = phraseSecs(g.song, g.plan.phrase), d = 2 * ph;
    const [lo, hi] = typeof length === 'number' ? [length * 60, length * 60] : RANGE[length];
    const written = JSON.stringify({ sections: g.song.sections, tracks: g.song.tracks });
    const out = [];
    for (const [p, extra] of [['classic', {}], ['crescendo', {}], ['switch', {}], ['switch', { opening: 'full-kick', pace: 'fast' }], ['crescendo', {}], ['classic', {}]]) {
      const s = withProfile(g.song, p, extra), h = heard(s);
      assert(JSON.stringify({ sections: s.sections, tracks: s.tracks }) === written, `${seed}: the written music changed with ${p}`);
      assert(h >= lo - ph - d / 2 - 0.5 && h <= hi + ph + d / 2 + 0.5, `${seed} ${length}: ${p}${Object.keys(extra).length ? ' custom' : ''} heard ${h.toFixed(1)} s, outside ${lo}-${hi} s within a phrase`);
      out.push(`${p}${Object.keys(extra).length ? '+' : ''} ${Math.round(h)} s`);
    }
    console.log(`      ${seed} ${length}: ${out.join(', ')}`);
  }
},
'Libera clears the target; songs without a target grow as before (D12)': () => {
  const g = genWith({ styles: ['synthwave'], profile: 'switch', length: 'medium' }, 'lb-1');
  const free = setDuration(baseConfig(g.song), 'free');
  assert(!free.durationTarget && controlsOf(free).duration === 'free', `Libera kept the target: ${JSON.stringify(free)}`);
  const planned = heard(g.song), freed = heard({ ...g.song, config: free });
  assert(freed > planned, `free growth ${freed.toFixed(0)} s not longer than planned ${planned.toFixed(0)} s`);
  // songs without a target (generated, saved with a profile, and an old song): the same growth as crescendoSong
  for (const seed of ['nt-1', 'nt-2']) {
    const n = genWith({ styles: ['synthwave', 'berlin-techno'], profile: 'switch' }, seed).song;
    for (const p of ['crescendo', 'switch']) {
      const s = { ...n, config: { profile: p, live: true } }, C = controlsOf(baseConfig(s));
      assert(C.duration !== 'planned', 'a song without a target got planned');
      const before = crescendoSong(s, { narrated: C.narrated, rules: growthRules(C, { styles: STYLES }) }), now = composeGrowth(s, { narrated: C.narrated, rules: growthRules(C, { styles: STYLES }), planned: plannedOf(baseConfig(s), C, STYLES) });
      assert(JSON.stringify(before.build) === JSON.stringify(now.build), `${seed} ${p}: a song without a target grows differently`);
    }
  }
  const old = JSON.parse(fs.readFileSync('songs/kellerlicht.json', 'utf8')), s = { ...old, config: { profile: 'switch', live: true } }, C = controlsOf(baseConfig(s));
  assert(C.duration === 'free' && !plannedOf(baseConfig(s), C), 'an old song switched to Live coder is planned');
},
'Sorprendimi: the same seed gives the same values and the same song, the radio unchanged (D13)': () => {
  const st = memStore({ [RADIO_KEY]: SAVED[1] }), radio = radioOf(st), before = JSON.stringify(st.raw[RADIO_KEY]);
  const seen = new Set();
  for (const seed of ['sp-1', 'sp-2', 'sp-3', 'sp-4', 'sp-5', 'sp-6']) {
    const v1 = surpriseValues(seed, RECIPES, ARTISTS), v2 = surpriseValues(seed, RECIPES, ARTISTS);
    assert(JSON.stringify(v1) === JSON.stringify(v2), `${seed}: different values`);
    const p1 = panelOf(memStore(), radio), p2 = panelOf(memStore(), radio);
    p1.set(v1); p2.set(v2);
    const a = generateSong({ recipes: RECIPES, options: p1, seed }), b = generateSong({ recipes: RECIPES, options: p2, seed });
    assert(JSON.stringify(a.song) === JSON.stringify(b.song), `${seed}: different songs`);
    assert(!(v1.length !== 'style' && a.config.options && a.config.options.duration === 'free'), `${seed}: Durata with the free growth`);
    seen.add(`${v1.profile}/${v1.length}/${v1.material}`);
  }
  assert(JSON.stringify(st.raw[RADIO_KEY]) === before, 'Sorprendimi changed the radio');
  assert(seen.size >= 4, `the draws hardly vary: ${[...seen].join(' ')}`);
},
'presets: built-in ones valid, picking sets only their values (D6)': () => {
  assert(BUILTIN_PRESETS.length === 5, 'five built-in presets');
  for (const p of BUILTIN_PRESETS) {
    const panel = panelOf(memStore(), radioOf(memStore()));
    const before = clone(panel.state), vals = presetValues(p);
    panel.set({ ...vals, preset: p.id });
    for (const k of Object.keys(before)) if (!(k in vals) && k !== 'preset') assert(JSON.stringify(before[k]) === JSON.stringify(panel.state[k]), `${p.id}: changed ${k}`);
    assert(p.name.en && p.name.it, `${p.id}: a name in both languages`);
  }
},
};
const barsOf = song => song.sections.reduce((a, s) => a + s.bars, 0);

const onlyArg = process.argv.indexOf('--only'), only = onlyArg >= 0 ? process.argv[onlyArg + 1] : null;
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS).filter(([n]) => !only || n.includes(only))) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); if (process.env.CHECK_STACK) console.log(e.stack); }
}
console.log(`${Object.keys(CHECKS).filter(n => !only || n.includes(only)).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
