import '@strudel/repl';
import './style.css';
import { ideaCode } from './music.js';
import { ideaRows } from './song/ideas.js';
import { METERS, meterSteps, fitSteps, channelSteps, GUITAR_TYPES, GUITAR_PATTERNS, HARMONIES, KEYS, PROGS, WAVES, MOVES, BASS, ARPS, HOOKS, MODES, VOWELS, PADS, TEXTURES, TEX_RHYTHMS, KITS, ROWS, GROOVES, LOOKS, PICK_LOOKS, HIDDEN_LOOKS, DEFAULT, withVisuals, chordName } from './music.js';
import { compileSong } from './song/compile.js';
import { SPEAKERS, hasBuild, buildSteps, stateAt, sayAt, deriveBuild, buildMap, sayText, voiceSamples, voiceOf, stepKeys, saySlug, sayBank } from './song/build.js';
import { typingFrames, settleOthers, typingPlan, TYPING_SPEEDS } from './song/typing.js';
import { crescendoSong, waypointSong, CRESCENDO_VERSION, shapeCapOf, shapeKeepOf, longSongOf } from './song/crescendo.js';
import { setSpokenContext, spokenContext, placeSpoken, WAYS, speakerOf, MAX_WORDS } from './song/spoken.js';
import { airCode } from './live/air-code.js';
import { growOnAir, airControls } from './endless/growth.js';
import { controlsProfile, customControls } from './endless/profile.js';
import { steerOnAir, AIR_CHOOSERS } from './endless/waypoints.js';
import { VOCAB_GROUPS } from './song/vocabulary.js';
import { PROFILES, PROFILE_IDS, resolveProfile, songProfile, cleanOverrides, growthRules, writtenOptions } from './live/profiles.js';
import { TRIALS_KEY, configOf, controlsOf, cleanTrials, setTrial, withConfig, compactConfig } from './live/song-config.js';
import { OPENINGS, PACES, DEVELOPMENTS, resolveShape, shapeFacts, canPlay, SHAPES_VERSION } from './song/shapes.js';
import { liveCode } from './live/live-code.js';
import { installHelpers, useFns, FUNCTION_PRESETS, FUNCTION_OPTIONS, functionOptions, writeCode, levelsOf, busesOf, functionContext, tail, preludeText } from './song/writer.js';
import { upgradeLibrary } from './library/code-upgrade.js';
import { COMMENT_PRESETS } from './song/comments.js';
import pkg from '../package.json';
// the app's version, written in the songs it makes (#67)
const APP_VERSION = pkg.version;
const today = () => new Date().toISOString().slice(0, 10);
// a song's birth: its creation date and the app version that made it, kept once set
const stamp = (o, fresh = false) => { if (fresh || !o.created) o.created = today(); if (fresh || !o.appVersion) o.appVersion = APP_VERSION; return o; };
import { validateSong } from './song/validate.js';
import { cropCode } from './song/crop.js';
import { FORMAT, VERSION, SETTING_FIELDS, SECTION_DEFAULTS, VISUALS, VOICE_DEFAULT, VOICE_STYLES, styleOf, fromScenes, clipState } from './song/format.js';
import { DEVICES, deviceArgs, newDevice } from './song/rack.js';
import { createRadio, usableRecipes } from './radio/radio.js';
import { createStylesTab } from './library/styles-tab.js';
import { createArtistsTab } from './library/artists-tab.js';
import { createSongsView, confirmInline } from './library/songs-view.js';
import { trashSong, restoreSong, deleteForGood, emptyTrash, purgeTrash, trashList, daysLeft, hideSong, showHidden, hiddenIds, entryTitle } from './library/trash.js';
import { kindOf, parseFree } from './library/song-filter.js';
import { createPlaylistStore, createQueue, REPEATS, isSession, sessionOutdated } from './library/playlists.js';
import { DIRECTOR_VERSION } from './endless/director.js';
// the versions a saved radio session is compared with (#38, radio-profiles D11)
const APP_VERSIONS = { director: DIRECTOR_VERSION, shapes: SHAPES_VERSION, growth: CRESCENDO_VERSION, choosers: Object.keys(AIR_CHOOSERS) };
import { createPlaylistsTab } from './library/playlists-tab.js';
import { pickJsonFiles } from './library/library.js';
import { createSettings } from './settings/settings.js';
import { createGenresTab } from './library/genres-tab.js';
import { genresOf } from './library/song-filter.js';
import { windowSong } from './endless/join.js';
import { absoluteClips, playlistTransition, overlapOf, layout } from './endless/transitions.js';
import { joinSession } from './endless/join.js';
import { createSession, stylesNear } from './endless/director.js';
import { cleanVoice, voiceOption, presetOf as voicePresetOf } from './endless/voice-options.js';
import { voicePanel, voiceEvent } from './endless/voice-panel.js';
import { voiceSoundHtml, syncVoiceSound, soundEvent } from './endless/voice-sound.js';
import { phraseRows, listVocab, editText, editBars, editWay, removeRow, addRow, fillRows, freeParts, FILL_GROUPS } from './endless/phrase-list.js';
import { rewriteSpoken, trackVoice } from './endless/voice-track.js';
import { styleId, stylePush } from './endless/recipe.js';
import { loadLimiter, setMasterLevel } from './sounds/limiter.js';
import { createSoundBrowser } from './sounds/browser.js';
import { MACHINES } from './sounds/machines.js';
import { machineLabel, prettyName } from './sounds/catalog.js';
import SONG_ORDER from '../songs/index.json';
import { LESSONS, REFS, SONGS } from './content.js';
import { GUIDE, guideText } from './guide.js';
import { startVisuals } from './visuals.js';
import { createVideo } from './video/video.js';
import { fileName, OUT_KEY, outKindOf, outText, VIDEO_DEFAULTS, QUALITIES, layoutAreas, codeColsOf, TIMELINE_LAYOUTS, lookFor, F_FORMATS, F_SHOWS, F_ASPECTS, F_CODE, F_FILES, fragmentOpts, fragmentSize, fragmentAreas, V_DEFAULTS } from './video/layout.js';
import { liveAreas } from './live/presets.js';
import { pickFragments, fragmentBetween, fragmentCode, fragmentLabel, glitchMessages, shapeOf, clockOf, parseTime, taglineFor, nextTagline } from './video/fragments.js';
import { textsFor, textFile } from './video/texts.js';
import { VIEWS as SOUL_VIEWS, VIEW_NAMES as SOUL_VIEW_NAMES } from './soul/data.js';
import { hashString } from './endless/random.js';
import { encode, createEncoder, canEncode, formatOf, EXT } from './export/encode.js';
import { segmentsOf, timelineOf, renderInBlocks } from './export/fast.js';
import { renderVideo } from './export/fast-video.js';
import { askDiskFile, LONG_SECONDS } from './export/disk.js';
import { guardDecode, guardSounds, createRegister, HEALTH_KEY, soundfontsIn, preloadFonts } from './sounds/sound-guard.js';
import soundfonts from '@strudel/soundfonts/package.json';
import { createLiveLink } from './live/link.js';
import { tempoClock } from './render/tempo.js';
import { createSoulScene } from './soul/scene.js';
import { createSoulDisplay } from './soul/display.js';
import { LOCK, DICE, REVERT, BIN, COMPOSE, RHYTHM, NOTES, LISTEN, KEEP, RESET_CONFIG, GROWING, FLASK, STOP, POWER } from './icons.js';
import { createPreview, previewOrbit } from './player/preview.js';
import { createPatternsTab } from './library/patterns-tab.js';
import { patternStore, savedFromTrack, fallbackStyles, addToSong as addPatternToSong, kindOfPreset, forRadio, soundKey, PATTERN_TYPES, KIND_DEFAULTS, KIND_TYPE, loopSong } from './library/patterns.js';
import { compose, KIND_OF_TYPE, presetOf } from './material/index.js';
import { t, tx, getLang, setLang } from './i18n.js';
import { parseSong, clock } from './songs.js';
import { durationKey, growingProfile, hashText } from './live/card-duration.js';
import { createGrowthStore } from './live/growth-store.js';
import GROWTH_HASH from 'virtual:growth-hash';
import SONG_DURATIONS from './library/song-durations.json';
import { startHardware } from './hardware.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const clone = o => JSON.parse(JSON.stringify(o));
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  remove(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
setLang(getLang());

// ---------- libreria dei brani ----------
// "composed": brani v2 (sezioni e tracce, file JSON in songs/), si aprono nell'arrangiatore.
// "coded": le versioni originali scritte a mano, si modificano nell'editor.
// Le modifiche dell'utente vivono in localStorage e hanno la precedenza sugli originali.
const user = store.get('coding-misk-library', { tracks: [], code: {} });
const saveLibrary = () => store.set('coding-misk-library', user);
// hand-coded code saved before song-functions: the new helper names, once (src/library/code-upgrade.js)
{ const up = upgradeLibrary(user); if (up !== user) { Object.assign(user, up); saveLibrary(); } }
const validSongs = Object.entries(import.meta.glob(['../songs/**/*.json', '!../songs/index.json', '!../songs/**/session.json'], { eager: true, import: 'default' })).flatMap(([file, sg]) => {
  const { errors } = validateSong(sg);
  if (errors.length) { console.warn(`${file}: ${errors.map(e => `${e.path} ${e.msg}`).join('; ')}`); return []; }
  return [sg];
});
// ordine della libreria: songs/index.json, poi gli altri (esempi) in ordine alfabetico
const BUILTIN = [...validSongs].sort((a, b) => {
  const ia = SONG_ORDER.indexOf(a.id), ib = SONG_ORDER.indexOf(b.id);
  return (ia < 0 ? 1e3 : ia) - (ib < 0 ? 1e3 : ib) || a.id.localeCompare(b.id);
});
const CODED = SONGS.map(sg => ({ ...sg, kind: 'coded' }));
const builtinOf = id => BUILTIN.find(b => b.id === id);
const isBuiltin = id => !!builtinOf(id) || CODED.some(c => c.id === id);
// brano pronto per l'arrangiatore: formato v2, nomi di sezione unici, clip riferiti per nome
function prepare(src) {
  const sg = clone(src.scenes ? fromScenes(src) : src);
  sg.format = FORMAT; sg.version = VERSION;
  sg.sections = sg.sections && sg.sections.length ? sg.sections : [{ name: t('newScene', { n: 1 }), bars: 8, bpm: 128, key: 'A', chords: 'epica', meter: '4/4' }];
  const old = sg.sections.map(s => s.name), names = [];
  sg.sections.forEach((s, i) => { let n = String(s.name || t('newScene', { n: i + 1 })).trim(), k = 2; const base = n; while (names.includes(n)) n = `${base} ${k++}`; names.push(n); s.name = n; });
  sg.tracks = (sg.tracks || []).map(tr => ({ settings: {}, patterns: {}, clips: [], ...tr }));
  for (const tr of sg.tracks) for (const c of tr.clips) {
    if (typeof c.section === 'number') c.section = names[c.section];
    else if (c.section !== undefined && !names.includes(c.section)) c.section = names[old.indexOf(c.section)];
  }
  return sg;
}
// built-in songs hidden in this browser (#68, D3b) are left out of the list and of every song menu
function composedTracks() {
  const hid = hiddenIds(user);
  const builtins = BUILTIN.filter(b => !hid.has(b.id)).map(b => { const o = user.tracks.find(u => u.id === b.id); return o ? prepare(o) : b; });
  return [...builtins, ...user.tracks.filter(u => !builtinOf(u.id)).map(prepare)].map(tr => ({ ...tr, kind: 'composed' }));
}
// code songs: the hand-written originals, then the versions saved from live coding by hand (#33)
if (!Array.isArray(user.codeSongs)) user.codeSongs = [];
const codedTracks = () => [...CODED.filter(c => !hiddenIds(user).has(c.id)), ...user.codeSongs.map(v => ({ ...v, kind: 'coded' }))].map(c => ({ ...c, code: user.code[c.id] || c.code }));
// the trash (#68, src/library/trash.js): deleted songs wait 30 days; the purge runs at start and when the Trash view opens
function purgeOld() {
  const n = trashList(user).length;
  Object.assign(user, purgeTrash(user, new Date()));
  if (trashList(user).length !== n) saveLibrary();
}
purgeOld();
// performance profiles (performance-profiles): Classic, Crescendo, Live coder (id switch), each a set of controls (build style,
// growth rules, typing, code view, generator, comments, highlights). Since song-own-settings the configuration is part of
// the song (`config`: profile, Live build switch, options; src/live/song-config.js): a song without one plays as its
// declared profile says, else as Classic with the Live build off. A change in Compose is a trial for the open song only,
// kept per song in this browser (coding-misk-song-trials, in the backup) until Save or ↺. The global choice used before
// (coding-misk-profile, coding-misk-profile-overrides, coding-misk-live) no longer applies to any song: it is left
// unread, so no song changes how it plays, and the per-song switches of that time lived only in the page's memory.
let trials = cleanTrials(store.get(TRIALS_KEY, {}));
const saveTrials = () => { if (Object.keys(trials).length) store.set(TRIALS_KEY, trials); else store.remove(TRIALS_KEY); };
const trialOf = tr => (tr && trials[tr.id]) || null;
const cfgOf = tr => configOf(tr, trialOf(tr));
const profileFor = tr => cfgOf(tr).profile;
const ctlOf = tr => controlsOf(cfgOf(tr));
const liveOf = tr => { const c = cfgOf(tr), C = controlsOf(c); return { on: c.live, style: C.build, ctl: C }; };
// a trial for the song in Compose: kept only while it differs from the song's own configuration
const tryConfig = cfg => { trials = setTrial(trials, T, cfg); saveTrials(); };
// the song as it plays with its trial (its config replaced), for the card lengths
const asTried = tr => (trialOf(tr) ? withConfig(tr, trialOf(tr)) : tr);
// the radio's window and its exports (radio-profiles 1.1, owner decision 4): explicit Classic controls with the profile's
// own display values, so neither the Compose profile, its overrides nor the Live build switch reach the radio (the
// window song names no profile: before, a Crescendo pick with the switch on grew the window). Off: a window without
// steps plays as written, as the radio did with the switch off
const RADIO_LIVE = () => { const C = resolveProfile('classic'); return { on: false, style: C.build, ctl: C }; };
// the radio's window song by song (radio-profiles D7, D8, src/live/air-code.js): the song on air with its own
// controls, the next one shown or hidden. A window of Classic songs, all shown, plays as before (one Classic code)
// songs: [{ n, prefix, start, song, title, profile, custom, ctl, show }] from the radio
function radioPlayable(W, songs = null) {
  if (!songs || songs.every(x => x.profile === 'classic' && !x.custom && x.show !== 'hidden')) return playable({ ...W, kind: 'composed' }, RADIO_LIVE());
  const L = airCode(W, songs, { lang: getLang, files: () => customFiles, cols: codeCols });
  const meta = parseSong(compileSong(stateAt(W, 0).song)), v = W.sections.flatMap(x => [x.bpm ?? 138, x.bpmEnd ?? x.bpm ?? 138]), lo = Math.min(...v), hi = Math.max(...v);
  meta.bpmLabel = lo === hi ? `${lo}` : `${lo}→${hi}`;
  // (soundCode: every sound of the window in one code, for the soundfonts loaded ahead; hidden: the songs not shown)
  return { id: W.id, title: W.title, kind: 'composed', look: W.look, code: L.codeAt(0), meta, codeAt: L.codeAt, codeKeep: null, run: L.run, standalone: L.standalone, paste: L.paste, earlier: L.earlier, buses: L.buses, fns: L.fns, build: L.build, ctl: L.ctl, doc: L.build, air: true, hidden: L.hidden(), soundCode: () => compileSong({ ...W, build: undefined }) };
}
// a radio session's songs joined into one playable song, as its exports play it (radio-profiles D12). A session of
// Classic songs is the joined song with Classic controls, as before. With a grown song (or the Custom profile) the file
// plays what the radio plays: window by window (the song on air and the next one, radioPlayable), each song on air in
// its own view, the next one shown or hidden as the radio shows it. A window is on air from the end of the song before
// (its transition included) to the end of its own song, as the radio moves it; its code appears whole when its song goes
// on air. The code shown at each bar is the song on air's (timeline, video); the code evaluated adds the hidden tail.
// items: rebuilt songs [{ song, transition }]; air: per song { profile, custom, ctl, show } (radio.airSongs)
function sessionPlayable(items, seed, options, id, air = null) {
  const songs = items.map(x => absoluteClips(clone(x.song)));
  const joined = joinSession({ songs: items.map(x => ({ transition: x.transition })), seed, options: options || {} }, songs);
  const base = playable({ ...joined, kind: 'composed', id }, RADIO_LIVE());
  if (!air || air.every(a => a.profile === 'classic' && !a.custom)) return base;
  const N = songs.length, bars = songs.map(barsOfSong), trans = items.map(x => x.transition || null);
  const starts = layout(songs.map((s, i) => ({ bars: bars[i], transition: trans[i] })), 0);
  const ends = starts.map((s, k) => (k + 1 < N ? starts[k + 1] + overlapOf(trans[k]) : s + bars[k])), los = ends.map((e, k) => (k ? ends[k - 1] : 0));
  const wins = songs.map((_, k) => {
    const ks = k + 1 < N ? [k, k + 1] : [k];
    const W = windowSong(ks.map(i => ({ song: songs[i], n: i + 1, start: starts[i], transition: trans[i] })));
    return radioPlayable({ ...W, id }, ks.map((i, j) => ({ n: i + 1, prefix: `s${i + 1}-`, start: starts[i], song: songs[i], title: songs[i].title, profile: air[i].profile, custom: air[i].custom, ctl: air[i].ctl, show: j ? air[i].show : 'air' })));
  });
  const at = bar => { let k = 0; while (k + 1 < N && ends[k] <= bar) k++; return k; };
  // the steps of each window while it is on air, and its first bar when its code appears whole (a window of Classic
  // songs after another goes on with the code it had, as in the radio)
  const steps = [], whole = new Set();
  wins.forEach((P, k) => {
    if (k && (P.air || wins[k - 1].air)) { steps.push({ at: los[k] }); whole.add(los[k]); }
    // (a song with the narrator off, profile-options: its phrases are not shown over the stage either)
    for (const { i, ...s } of buildSteps(P.build)) if (s.at >= los[k] && s.at < ends[k]) steps.push(P.ctl && P.ctl.narrator === false ? unsaid(s) : s);
  });
  steps.sort((a, b) => a.at - b.at);
  // the code shown at a bar: as codeFor writes it for the window on air (with the visuals of a window without a tail)
  const codeAt = (bar, keep = null) => { const P = wins[at(bar)], c = P.codeAt ? P.codeAt(bar, keep) : keep && P.codeKeep ? P.codeKeep(keep) : P.code; return P.run ? c : withVisuals(c); };
  const run = (code, bar) => { const P = wins[at(bar)]; return P.run ? P.run(code, bar) : code; };
  // per segment: the buses and functions of the song on air, its typing, and whether its code appears whole
  const segmentAt = from => {
    const k = at(from), P = wins[k], C = P.ctl;
    return { buses: P.buses || {}, fns: P.fns || {}, seed: songs[k].id || '', ...(C ? { typist: C.typist === 'human' ? 'human' : 'exact', mistakes: C.mistakes !== 'off' } : {}), ...(P.paste && from > 0 ? { paste: P.paste(from) } : {}), ...(P.earlier && from > 0 ? { earlier: P.earlier(from) } : {}), ...(whole.has(from) ? { whole: true } : {}) };
  };
  const firstGrown = air.findIndex(a => a.profile !== 'classic' || a.custom), grown = songs.map((s, k) => (air[k].profile !== 'classic' ? starts[k] : -1)).filter(b => b >= 0);
  return { ...base, code: codeAt(0), codeAt, codeKeep: null, run, standalone: null, paste: null, buses: {}, fns: {}, build: { ...(base.doc || joined), build: steps }, ctl: wins[firstGrown] ? air[firstGrown].ctl : base.ctl, segmentAt, session: { grown }, soundCode: () => compileSong({ ...joined, build: undefined }) };
}
// radio songs grow away from the page (radio-profiles stage 4, src/endless/grow-worker.js): the music stays on time;
// the worker gets the voice instrument's context and the language of the page, so a song grows there as it would here
let growWorker = null, growN = 0;
const growWaits = new Map();
// (steering a grown song, radio-profiles stage 5: the commands as waypoints are worked out there too)
function growAway(song, ctx, steer = null) {
  const here = () => Promise.resolve().then(() => (steer ? (({ song: s, grown, commands }) => ({ song: s, grown, commands }))(steerOnAir(steer)) : growOnAir(song, ctx)));
  try {
    if (!growWorker) {
      growWorker = new Worker(new URL('./endless/grow-worker.js', import.meta.url), { type: 'module' });
      growWorker.onmessage = e => { const w = growWaits.get(e.data && e.data.id); if (!w) return; growWaits.delete(e.data.id); if (e.data.error) w.reject(new Error(e.data.error)); else w.resolve(e.data.steered || e.data.song); };
      growWorker.onerror = e => { console.warn('[radio] growth worker failed, growing in the page', e.message || e); for (const w of growWaits.values()) w.reject(new Error('worker')); growWaits.clear(); growWorker = false; };
    }
    if (growWorker === false) return here();
    const id = ++growN, spoken = { files: spokenContext.files, lengths: spokenContext.lengths, lang: spokenContext.lang || getLang(), styles: spokenContext.styles };
    return new Promise((resolve, reject) => { growWaits.set(id, { resolve, reject }); growWorker.postMessage({ id, song, ctx, spoken, steer }); });
  } catch (e) { return here(); }
}
// the page's own growths away from the page (grow-worker.js, a second worker so the radio never waits for them): the
// song restored in Compose at start and the grown lengths of the song cards on screen. No worker: the promise fails and
// the caller keeps what it has (a song grows in the page only when it is played or edited)
let pageWorker = null, pageN = 0;
const pageWaits = new Map();
function pageAway(msg) {
  try {
    if (!pageWorker) {
      pageWorker = new Worker(new URL('./endless/grow-worker.js', import.meta.url), { type: 'module' });
      pageWorker.onmessage = e => { const w = pageWaits.get(e.data && e.data.id); if (!w) return; pageWaits.delete(e.data.id); if (e.data.error) w.reject(new Error(e.data.error)); else w.resolve(e.data.crescendo !== undefined ? e.data.crescendo : e.data.duration); };
      pageWorker.onerror = e => { console.warn('[songs] page worker failed', e.message || e); for (const w of pageWaits.values()) w.reject(new Error('worker')); pageWaits.clear(); pageWorker = false; };
    }
    if (pageWorker === false) return Promise.reject(new Error('worker'));
    const id = ++pageN, spoken = { files: spokenContext.files, lengths: spokenContext.lengths, lang: spokenContext.lang || getLang(), styles: spokenContext.styles };
    return new Promise((resolve, reject) => { pageWaits.set(id, { resolve, reject }); pageWorker.postMessage({ id, spoken, ...msg }); });
  } catch (e) { return Promise.reject(e); }
}
// Compose growths away from the page (growth-in-background D1): a third worker of the same code, so a growth in Compose
// never waits behind the song cards. A newer request ends the worker and starts another (a growth cannot be stopped
// from inside, and a stale one would hold the newer for seconds); the answer counts only for the request still
// running. No worker: the promise fails with 'worker' and Compose grows in the page, as before.
let composeWorker = null, composeJob = null, composeN = 0;
const composeAwayOK = () => composeWorker !== false && typeof Worker !== 'undefined';
function stopComposeGrowth() {
  const j = composeJob;
  if (!j) return;
  composeJob = null;
  if (composeWorker) { composeWorker.terminate(); composeWorker = null; }
  j.reject(new Error('replaced'));
}
function composeAway(key, msg) {
  if (composeJob && composeJob.key === key) return composeJob.promise;
  stopComposeGrowth();
  const job = { key, id: ++composeN };
  job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
  composeJob = job;
  try {
    if (!composeWorker) {
      composeWorker = new Worker(new URL('./endless/grow-worker.js', import.meta.url), { type: 'module' });
      composeWorker.onmessage = e => { const j = composeJob; if (!j || !e.data || e.data.id !== j.id) return; composeJob = null; if (e.data.error) j.reject(new Error(e.data.error)); else j.resolve(e.data.crescendo); };
      composeWorker.onerror = e => { console.warn('[compose] growth worker failed, growing in the page', e.message || e); const j = composeJob; composeJob = null; try { composeWorker.terminate(); } catch (x) {} composeWorker = false; if (j) j.reject(new Error('worker')); };
    }
    const spoken = { files: spokenContext.files, lengths: spokenContext.lengths, lang: spokenContext.lang || getLang(), styles: spokenContext.styles };
    composeWorker.postMessage({ id: job.id, spoken, ...msg });
  } catch (e) { composeJob = null; composeWorker = false; job.reject(new Error('worker')); }
  return job.promise;
}
// one control changed by hand: a trial on the song in Compose, kept until a profile is picked again
function setControl(k, v) { const c = cfgOf(T); tryConfig({ ...c, options: cleanOverrides({ ...c.options, [k]: v }, PROFILES[c.profile]) }); }
// Crescendo builds are computed once per song version and option, kept for the songs used last (LRU)
const crescendoCache = new Map(), CRESCENDO_CACHE = 48;
// the built-in style recipes, for the weights of the growth shapes and the metamorphosis (growth-shapes)
const SHAPE_STYLES = Object.fromEntries(Object.values(import.meta.glob('../styles/*.json', { eager: true, import: 'default' })).map(r => [r.id, r]));
// the voice instrument (voice-instrument) reads the style's lines and speakers; its samples come with the manifest below
setSpokenContext({ files: {}, styles: SHAPE_STYLES });
// the shapes a Compose growth tries (shape-search D3, Settings, advanced): only Compose reads it, the radio keeps 8
const shapeCap = () => shapeCapOf(store.get('coding-misk-shape-cap', null));
// shape-search D6, D7 (Settings, advanced): Try all and what it keeps, the order, the long-song threshold; only Compose
// reads them, the radio and the checks keep the defaults
const shapeSearch = () => ({ shapeCap: shapeCap(), shapeAll: store.get('coding-misk-shape-all', null) === true, shapeKeep: shapeKeepOf(store.get('coding-misk-shape-keep', null)), shapeRandom: store.get('coding-misk-shape-random', null) !== false, longSong: longSongOf(store.get('coding-misk-long-song', null)) });
const crescendoKey = tr => { const C = ctlOf(tr); return JSON.stringify([C.narrated, C.growth, C.duration, C.opening, C.pace, C.development, tr.sections, tr.tracks, tr.id, tr.tags, tr.growthShape, ...(C.growth === 'natural' ? Object.values(shapeSearch()) : [])]); };
function crescendoPut(key, c) {
  crescendoCache.delete(key); crescendoCache.set(key, c);
  while (crescendoCache.size > CRESCENDO_CACHE) crescendoCache.delete(crescendoCache.keys().next().value);
}
// the rules of a Compose growth (the Live coder profile, id switch, grows with the natural rules, natural-growth, and a
// growth shape, growth-shapes)
const crescendoOpts = tr => { const C = ctlOf(tr); return { narrated: C.narrated, rules: growthRules(C, { styles: SHAPE_STYLES }), ...shapeSearch() }; };
function crescendoOf(tr) {
  const key = crescendoKey(tr), c = crescendoCache.get(key) || crescendoSong(tr, crescendoOpts(tr));
  crescendoPut(key, c);
  return c.build.length ? c : null;
}
// ---------- grown lengths of the song cards (src/live/card-duration.js) ----------
// Song lists never grow songs in the page: a growth takes up to a few seconds per song. A card shows the song as its
// own profile plays it (Classic: as written); a song that declares Crescendo or Live coder shows its grown length, the
// built-in ones from src/library/song-durations.json (tools/song-durations.mjs), the user's grown in the page worker for
// the cards on screen and kept in this browser by key. Until then, and before the voice context is known (samples
// manifest), a card shows the written length.
const DUR_STORE = 'coding-misk-card-durations', DUR_MAX = 300;
let cardDurs = store.get(DUR_STORE, {}) || {}, durReady = false, durBusy = false;
const durWait = new Map();
const durCtx = () => ({ files: spokenContext.files, lengths: spokenContext.lengths || {}, lang: spokenContext.lang || getLang() });
// (a song with a trial configuration: its length with the trial, song-own-settings)
function durOf(tr) {
  tr = asTried(tr);
  const key = durReady && tr.kind === 'composed' && growingProfile(tr) ? durationKey(tr, durCtx()) : null;
  return { key, dur: key ? SONG_DURATIONS.entries[key] || cardDurs[key] || null : null };
}
// a card: the song, its written playable (no growth) and its grown length when known
const cardOf = tr => ({ tr, p: playable(tr, RADIO_LIVE()), ...durOf(tr) });
// the length a card shows: { seconds, bars }
const cardLen = c => (c.dur && c.dur.bars ? c.dur : c.p.meta);
// the voice context is known: the cards look their grown lengths up, the ones on screen grow away
function cardsReady() {
  if (durReady) return;
  durReady = true;
  for (const c of cards) Object.assign(c, durOf(c.tr));
  if (cards.length) { showCardLengths(); queueCardLengths(); }
}
function showCardLengths() {
  cards.forEach((c, i) => { const el = c.dur && document.querySelector(`#songs [data-song-card="${i}"] .song-len`); if (el) el.textContent = songLenText(c); });
  songsView.setSongs(cards.map(songOf));
}
// the cards on screen whose grown length is not known yet, grown one at a time in the page worker
function queueCardLengths() {
  if (!durReady || !cards.length) return;
  // only the cards on screen now wait (a search or a filter drops the others; the length being grown finishes)
  durWait.clear();
  for (const el of document.querySelectorAll('#songs [data-song-card]:not([hidden])')) { const c = cards[+el.dataset.songCard]; if (c && c.key && !c.dur && !durWait.has(c.key)) durWait.set(c.key, asTried(c.tr)); }
  nextCardLength();
}
function nextCardLength() {
  if (durBusy || !durWait.size) return;
  const [key, tr] = durWait.entries().next().value;
  durBusy = true;
  pageAway({ duration: tr }).then(d => {
    // (a song that does not grow after all keeps its written length: bars 0)
    delete cardDurs[key]; cardDurs[key] = d ? { seconds: d.seconds, bars: d.bars } : { seconds: 0, bars: 0 };
    const ks = Object.keys(cardDurs); for (const k of ks.slice(0, Math.max(0, ks.length - DUR_MAX))) delete cardDurs[k];
    store.set(DUR_STORE, cardDurs);
    for (const c of cards) if (c.key === key) c.dur = cardDurs[key];
    showCardLengths();
  }, () => durWait.clear()).finally(() => { durWait.delete(key); durBusy = false; nextCardLength(); });
}
// the radio tab (created further down, once the player exists)
let radio = null, stylesTab = null, artistsTab = null, playlistsTab = null, settingsPage = null, genresTab = null, patternsTab = null, prevTab = 'componi', curTab = null;
// the user's saved patterns (pattern-library): the Patterns tab, Save as pattern in Compose and the radio read them
const patternsStore = patternStore(store);
// custom samples manifest (bank → files), for spoken comments
let customFiles = {};
// the width of the code panel in characters, for the line breaks of a live build (typing-lines); 80 before the editor exists
let exportCols = null;
function codeCols() {
  // a video being exported: the width of its code panel
  if (exportCols) return exportCols;
  // the visible width (the content grows with long lines): the scroller minus the line numbers
  try { const v = ed && ed.editor, g = v && v.dom.querySelector('.cm-gutters'); if (v && v.defaultCharacterWidth > 0 && v.scrollDOM.clientWidth > 0) return Math.max(40, Math.min(110, Math.floor((v.scrollDOM.clientWidth - (g ? g.offsetWidth : 0) - 16) / v.defaultCharacterWidth))); } catch (e) {}
  return 80;
}
// the narrator off (profile-options): no step phrase over the stage, in the studio scene or in a video. A song of
// several (radio window, mix) leaves out the phrases of each song with the narrator off when it joins their steps
const unsaid = ({ say, ...s }) => s;
const quietSong = sg => !!(sg && !sg.segmentAt && sg.ctl && sg.ctl.narrator === false);
const saidSteps = sg => (sg && sg.build && !quietSong(sg) ? buildSteps(sg.build).filter(x => x.say) : []);
// oggetto riproducibile: codice + mappa di sezioni e tempo
// fixed: controls that do not come from Compose (RADIO_LIVE for the radio's window and its exports)
function playable(tr, fixed = null) {
  // live build: the code depends on the bar (steps applied up to there), with the latest comment written in
  // a song without steps can build itself too ("Live build" switch): steps derived from its clips
  // Crescendo ignores the song's own steps
  const lv = fixed || liveOf(tr);
  // (the Live build off with code options away from Classic's, profile-options: the song as written, every track from
  // the start, with its comments and technical functions; with Sections, code-lanes, its code of the moment edited in
  // place at each section and clip change)
  let build = tr.kind !== 'composed' ? null : lv.on && lv.style === 'crescendo' && crescendoOf(tr) ? crescendoOf(tr) : hasBuild(tr) ? tr : lv.on ? { ...tr, build: deriveBuild(tr) } : writtenOptions(lv.ctl) ? { ...tr, build: [] } : null;
  const C = lv.ctl, live = build ? liveCode(build, C, { lang: getLang, files: () => customFiles, cols: codeCols }) : null, now = !!(live && live.now);
  if (live) build = live.build;
  const codeAt = live ? live.codeAt : null, run = live ? live.run : null, standalone = live ? live.standalone : null;
  // a song grown like a live coder can start with its waypoints when it plays without a live build (live-coder-growth)
  const plain = tr.kind === 'composed' && !codeAt && tr.normal === 'waypoints' ? waypointSong(tr) : tr;
  const code = codeAt ? codeAt(0) : tr.kind === 'composed' ? compileSong(plain) : tr.code;
  // the code of the moment has no sections table: the map comes from the code per section
  const meta = parseSong(now ? compileSong(stateAt(build, 0).song) : code);
  if (tr.kind === 'composed') {
    // la mappa del tempo è in "BPM da 4/4": per l'etichetta usiamo i BPM veri delle sezioni
    const v = tr.sections.flatMap(s => [s.bpm ?? 138, s.bpmEnd ?? s.bpm ?? 138]), lo = Math.min(...v), hi = Math.max(...v);
    meta.bpmLabel = lo === hi ? `${lo}` : `${lo}→${hi}`;
  }
  // doc: the song itself (sections and tracks), for its soul (#46)
  // (whole: the song with every track, so the voice instrument's quiet sections stay the same)
  const only = (song, keep) => (keep ? { ...song, tracks: song.tracks.filter(keep), whole: song } : song);
  const codeKeep = tr.kind === 'composed' && !codeAt ? keep => compileSong(only(plain, keep)) : null;
  return { id: tr.id, title: tr.title, kind: tr.kind, look: tr.look, code, meta, codeAt, codeKeep, run, standalone, paste: live ? live.paste : null, earlier: live ? live.earlier : null, buses: live && live.buses, fns: live && live.fns, build, ctl: build ? C : null, doc: tr.kind === 'composed' ? build || plain : null };
}

// ---------- brano in modifica ----------
const draft = store.get('coding-misk-draft', null);
let T = prepare(draft && draft.T && (draft.T.sections || draft.T.scenes) ? draft.T : composedTracks()[0] || BUILTIN[0]);
let sel = Math.min(draft ? draft.sel || 0 : 0, T.sections.length - 1);
let tk = Math.min(draft ? draft.tk || 0 : 0, Math.max(0, T.tracks.length - 1));
let dirty = !!(draft && draft.dirty);
let scope = 'track', editPat = null, panelView = store.get('coding-misk-panel', 'full');
// vista dell'arrangiatore: 'sections' (celle per sezione) o 'timeline' (clip liberi); selClip = indice del clip scelto nella timeline
let arrMode = store.get('coding-misk-arr-mode', 'timeline'), selClip = null;
let look = store.get('coding-misk-look', T.look || 'palco');
if (!PICK_LOOKS.some(([k]) => k === look)) look = 'palco';
// the soul scene (#46) keeps the colours of the last other visual: the app's accents and the colour views' hue
// the fast video's frame being drawn (#53): { info, code, say, soulSrc }, read instead of the live player
let fv = null, exportCtl = null;
let soulOverride = false; // the Soul display's override (#46): the stage shows the soul
let soulBase = look;
// at start the song restored in Compose grows away from the page (pageAway), so the page answers at once: until then
// Compose holds it as written (`pending`); played or exported first, it grows in the page, as playing always did
const growsInCompose = () => { const lv = liveOf(T); return lv.on && lv.style === 'crescendo' && !crescendoCache.has(crescendoKey({ ...T, kind: 'composed' })); };
const heldCompiled = () => ({ ...playable({ ...T, kind: 'composed' }, { ...liveOf(T), on: false }), pending: true });
// growth-in-background (D2): every change in Compose that needs a growth goes the same way as the start. The growth
// known (this page's cache): the song grown at once. Else the song held as written while it grows away (a stored growth
// of this browser first, D6, then the Compose worker), with the growing mark. No worker: grown in the page, as before.
function composeCompiled() {
  if (growsInCompose() && composeAwayOK()) { compiled = heldCompiled(); growComposeAway(); }
  else { stopComposeGrowth(); compiled = playable({ ...T, kind: 'composed' }); }
  renderGrowing();
  return compiled;
}
// Play and export wait for the growth (D2), with the mark on Play: → the grown song, the song as written when the growth
// failed, or null when another song was opened meanwhile. No worker: grown in the page, as before.
let growWait = null, growWaitId = null;
const growWaiters = [];
function grownNow(sg) {
  if (!sg || sg !== compiled || !compiled.pending) return Promise.resolve(sg);
  if (!composeAwayOK()) return Promise.resolve(compiled = playable({ ...T, kind: 'composed' }));
  if (!growWait) {
    growWaitId = compiled.id;
    growWait = new Promise(res => growWaiters.push(() => res(compiled.id === growWaitId && !compiled.pending ? compiled : null)));
    // (a growth not asked yet, the voice context known: asked now)
    if (composeReady && !composeJob) growComposeAway();
  }
  renderGrowing();
  return growWait;
}
// the song in Compose is grown (or failed, or another song is open): Play and export go on
function wakeGrowWait() {
  if (!growWait || (compiled.pending && compiled.id === growWaitId)) return;
  growWait = null;
  for (const f of growWaiters.splice(0)) f();
  renderGrowing();
}
// the growing mark (D3): next to the profiles while the song in Compose grows away, on Play while Play waits for it
function renderGrowing() {
  const lm = document.getElementById('live-growing'), pm = document.getElementById('play-growing');
  if (lm) lm.hidden = !(compiled && compiled.pending && composeJob);
  if (pm) pm.hidden = !growWait;
}
let compiled = growsInCompose() ? heldCompiled() : playable({ ...T, kind: 'composed' });
// the voice instrument's context is known (samples manifest): growths away from the page can start
let composeReady = false;
// stored growths (D6): by the Compose growth key, the voice instrument's context and the growth hash of the code
const growthStore = createGrowthStore({ hash: GROWTH_HASH });
const storedKey = key => `${hashText(key)}${hashText(JSON.stringify(durCtx()))}${GROWTH_HASH}`;
function growComposeAway() {
  if (!compiled.pending) return;
  const tr = { ...T, kind: 'composed' }, key = crescendoKey(tr);
  const current = () => compiled.pending && crescendoKey({ ...T, kind: 'composed' }) === key;
  const done = () => {
    if (!current()) return;
    compiled = playable({ ...T, kind: 'composed' });
    afterGrowth();
  };
  if (crescendoCache.has(key)) return done();
  const skey = storedKey(key);
  growthStore.get(skey).then(c => {
    if (c) return c;
    // (a newer change asks for its own growth)
    if (!current()) return null;
    if (!composeAwayOK()) throw new Error('worker');
    const p = composeAway(skey, { crescendo: { song: tr, opts: crescendoOpts(tr) } }).then(g => { growthStore.put(skey, g); return g; });
    renderGrowing();
    return p;
  }).then(c => { if (!c) return; if (!crescendoCache.has(key)) crescendoPut(key, c); done(); }, e => {
    if (e.message === 'replaced' || !current()) return;
    // no worker: the song grows in the page, as before
    if (e.message === 'worker') { compiled = playable({ ...T, kind: 'composed' }); afterGrowth(); return; }
    // a growth that fails leaves the song as written, and says so
    console.warn('[compose] growth away failed', e.message);
    compiled = { ...compiled, pending: false };
    afterGrowth();
    toast(t('growFailed'));
  }).finally(renderGrowing);
}
// the grown song takes the place of the held one: shown in the editor, or played from the same bar when a change made
// while it played was waiting for it; Play and export waiting go on
function afterGrowth() {
  if (mode === 'track' && ed) {
    if (isPlaying() && !hand && song && song.id === compiled.id && !growWait) playSong(compiled, Math.min(sched().now(), compiled.meta.bars - 1), 'track');
    else if (!isPlaying()) ed.setCode(compiled.codeAt ? codeFor(compiled, 0) : compiled.code);
  }
  renderArranger();
  wakeGrowWait();
  renderGrowing();
}
const saveDraft = () => store.set('coding-misk-draft', { T, sel, tk, dirty });
// a Crescendo build plays a growth span before the written sections (#64): the arranger shows the written song,
// so its bars and sections are offset by the growth (bars of the played song = bars of the arranger + growBars())
const growth = () => (compiled && compiled.build && compiled.build.crescendo) || null;
const growBars = () => (growth() ? growth().growth : 0);
// section of the played song → section of the arranger (-1: in the growth span or the added ending)
const arrSec = i => { const g = growth(); if (!g || i < 0) return i; const k = i - g.sections; return k >= 0 && k < T.sections.length ? k : -1; };
// (the first section starts the song from the top, growth included)
const sceneStart = i => (i > 0 ? growBars() : 0) + T.sections.slice(0, i).reduce((a, s) => a + s.bars, 0);
const SEC = () => T.sections[sel];

// ---------- editor Strudel e trasporto ----------
let ed = null, mode = 'track', evalTimer = 0, song = null, loopIdx = -1, follow = true, seeking = false;
let paused = null; // { id, cyc } quando la musica è in pausa
let ended = null; // id del brano arrivato alla fine da solo
let source = { kind: 'track' };
const el = document.createElement('strudel-editor');
el.innerHTML = `<!--\n${compiled.code}\n-->`;
// the growing marks (growth-in-background D3): drawn once, shown by renderGrowing
for (const id of ['live-growing', 'play-growing']) { const m = document.getElementById(id); if (m) m.innerHTML = GROWING; }
$('#edhost').appendChild(el);
const ready = new Promise(res => { const iv = setInterval(() => { if (el.editor) { clearInterval(iv); ed = el.editor; res(ed); } }, 100); });
// code-writing: the code evaluated is the code shown and the hidden tail of the song on air (mixer, hidden voice), by
// hand too (Ctrl+Enter); our helpers (.chan, .crunch), the library and the song's functions are registered once Strudel
// is there (song-functions)
ready.then(() => {
  const plain = ed.evaluate.bind(ed);
  ed.evaluate = async (autostart = true) => {
    globalThis.miskBuses = (song && song.buses) || {}; useFns((song && song.fns) || {});
    renderPrelude();
    if (!(song && song.run)) return plain(autostart);
    ed.flash();
    // the bar the code is for (the radio's hidden songs change with their own steps): the bar just shown by the
    // player, else the bar playing (code evaluated by hand)
    const s = sched(), bar = codeFresh ? codeBar : Math.floor(s ? s.now() : 0);
    codeFresh = false;
    await ed.repl.evaluate(song.run(ed.code || '', bar), autostart);
  };
  const iv = setInterval(() => { if (typeof globalThis.register === 'function') { clearInterval(iv); installHelpers({ register: globalThis.register }); } }, 100);
});
// il REPL carica solo una parte di dirt-samples: carichiamo l'archivio completo (arpy, industrial, glitch, …)
// samples() can appear a little after the editor: wait for it, otherwise the call was skipped and only part of the archive loaded
const whenSamples = () => new Promise(res => { const iv = setInterval(() => { if (typeof globalThis.samples === 'function') { clearInterval(iv); res(globalThis.samples); } }, 100); });
ready.then(whenSamples).then(load => load('github:tidalcycles/dirt-samples')).catch(e => console.error(e));
// the sound guard (#54): a decode that fails ends in an error, not a silent wait; broken sounds play from a stand-in,
// remembered in the browser (the render page of the fast export reads the same register)
guardDecode();
const soundRegister = createRegister({ version: soundfonts.version, store: localStorage });
{ const seen = new Set(), iv = setInterval(() => {
  if (!globalThis.soundMap || !globalThis.soundMap.listen || !globalThis.registerSound) return;
  clearInterval(iv);
  guardSounds({ soundMap: globalThis.soundMap, registerSound: globalThis.registerSound, register: soundRegister, now: () => globalThis.getAudioContext().currentTime,
    onReplace: (name, from, to) => { const k = `${name}:${from}→${to}`; if (!seen.has(k)) { seen.add(k); console.info(`[sounds] ${name} ${from} is broken, playing ${to}`); } } });
}, 300); }
// what the render page learns (a preload, an export) reaches this page through localStorage
addEventListener('storage', e => { if (e.key === HEALTH_KEY) soundRegister.reload(); });
// campioni personalizzati da public/samples/ (elenco generato dal plugin in vite.config.js)
let custom = [];
ready.then(async () => {
  try {
    const list = await (await fetch('/samples/strudel.json')).json();
    custom = Object.keys(list).filter(k => k !== '_base');
    customFiles = list;
    // the voice instrument's lines play once their samples are known, placed by the measured lengths (npm run voices)
    let lengths = {};
    try { const r = await fetch('/samples/say_lengths.json'); if (r.ok) lengths = await r.json(); } catch (e) {}
    setSpokenContext({ files: list, lengths });
    crescendoCache.clear();
    // (the song of Compose grows again with the new context: away from the page unless it is playing)
    composeReady = true;
    if (compiled.pending || (growsInCompose() && !(mode === 'track' && isPlaying()))) { compiled = heldCompiled(); growComposeAway(); }
    else compiled = playable({ ...T, kind: 'composed' });
    if (mode === 'track' && ed && !isPlaying()) ed.setCode(compiled.codeAt ? codeFor(compiled, 0) : compiled.code);
    cardsReady();
    if (!custom.length) return;
    await globalThis.samples('/samples/strudel.json');
    renderTrackPanel(); renderSounds(); syncAll();
  } catch (e) { console.warn('campioni personalizzati non disponibili', e); composeReady = true; growComposeAway(); cardsReady(); }
});
const sched = () => ed && ed.repl && ed.repl.scheduler;
const isPlaying = () => !!(sched() && sched().started);
// the pattern preview of Compose (pattern-preview), made with the track panel below
let preview = null;
// the radio console's preview of a saved pattern (radio-arrangement D9): the same player, riding the radio with the radio
// 12 dB lower; { item, ctx } of the pattern asked, made in createRadio's player below
let radioPreview = null, radioPv = null;
// code of a song at a bar, with the tempo of that bar (a live build changes code over time)
// the code the player shows at a bar to evaluate it: the evaluation knows the bar (codeBar, used once)
let codeBar = 0, codeFresh = false;
const codeNow = (sg, bar) => { codeBar = bar; codeFresh = true; return codeFor(sg, bar); };
const codeFor = (sg, bar, keep = null) => (sg.run ? c => c : withVisuals)(sg.codeAt ? sg.codeAt(bar, keep) : keep && sg.codeKeep ? sg.codeKeep(keep) : sg.code).replace(/setcpm\([^)]*\)/, `setcpm(${+sg.meta.bpm[Math.max(0, Math.min(sg.meta.bars - 1, Math.floor(bar)))].toFixed(2)}/4)`);
// keeps the point being edited in view: #edhost scrolls, not CodeMirror's own scroller
function followEdit(a, b) {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const view = ed && ed.editor, host = $('#edhost');
  try {
    // lineBlockAt works for lines CodeMirror has not drawn yet (below the window), coordsAtPos does not
    if (!view) return;
    const blk = view.lineBlockAt(Math.min(i, view.state.doc.length)), at = { top: view.documentTop + blk.top, bottom: view.documentTop + blk.bottom };
    // the visible part of the panel: it can run below the window
    const box = host.getBoundingClientRect(), top = Math.max(box.top, 0), bottom = Math.min(box.bottom, innerHeight);
    // glide there (live-typing): about 0.3 s, eased; a new target replaces the old one
    if (at.top < top + 8 || at.bottom > bottom - 8) glideTo(host, host.scrollTop + at.top - top - (bottom - top) / 3);
  } catch (e) {}
}
let glide = null;
function glideTo(host, y) {
  const from = host.scrollTop, t0 = performance.now();
  if (glide) cancelAnimationFrame(glide);
  const step = now => { const k = Math.min(1, (now - t0) / 300), e = k * k * (3 - 2 * k); host.scrollTop = from + (y - from) * e; glide = k < 1 ? requestAnimationFrame(step) : null; };
  glide = requestAnimationFrame(step);
}
// live build in progress: steps already in the editor, and the edit being typed towards the next step
let built = 0, typing = null;
// hand live coding (#20): the user typed in the code during a live build. Steps, comments and the stop at the end
// wait until "resume live build"; the user's code plays meanwhile. resumeTo: the bar where the build takes over again.
let hand = false, lastHand = null, resumeTo = null, handFrom = 0;
// resume from the bar where the user took over (default) or from where the song has got to meanwhile
let handFromHere = store.get('coding-misk-hand-from', true) !== false;
// typing speed of the code that types itself (live-typing): slow, normal, fast
const typingSpeed = () => TYPING_SPEEDS[store.get('coding-misk-typing', null) || (song && song.ctl && song.ctl.typing) || 'normal'] || 1;
// a typing towards `to` that may start at `from0` (cycles) and must end at `end`: it starts as late as it can while
// typing at a person's speed, faster when it does not fit
// human (human-typing, a step of the live build in the Live coder profile): first a listening pause, then the typing at a
// person's pace ends at the step; when time is short the pause shrinks first
// force: how many new lines may be pasted whole when the typing does not fit (the live build's paste rule)
function makeTyping(text, to, from0, end, cps, human = false, stretch = null, force = Infinity, earlier = null) {
  const avail = Math.max(.2, (end - from0) / cps), listenMin = human ? Math.min(avail * .5, 2) : 0;
  const plan = typingPlan(text, to, { speed: typingSpeed(), max: Math.max(.2, avail - listenMin), style: human ? 'human' : 'exact', seed: (song && song.id) || '', mistakes: typingMistakes(), stretch, force, earlier });
  const listen = human ? Math.max(listenMin, Math.min(avail * .2, avail - plan.total)) : 0;
  return { plan, start: Math.max(from0 + listen * cps, end - plan.total * cps), cps, shown: '' };
}
const typingHuman = () => !!(song && song.ctl && song.ctl.typist === 'human');
// typing mistakes on (typing-mistakes); a stretch of typing is 16 bars, so app and video draw the same mistake rate
const typingMistakes = () => !(song && song.ctl && song.ctl.mistakes === 'off');
const stretchOf = bar => Math.floor(bar / 16);
function typeFrame(T, cyc) {
  if (cyc < T.start) return;
  const at = (cyc - T.start) / T.cps, txt = T.plan.frame(at);
  // for browser checks (typing-mistakes): whether a mistake is on screen now
  globalThis.codingMiskTyping = { mistake: !!(T.plan.stats && T.plan.stats.wrong.some(([a, b]) => at >= a && at < b)), stats: T.plan.stats ? { mode: T.plan.stats.mode, typos: T.plan.stats.typos, minds: T.plan.stats.minds, words: T.plan.stats.words } : null };
  if (txt !== T.shown) { const prev = T.shown || ed.code || ''; T.shown = txt; ed.setCode(txt); followEdit(prev, txt); }
}
function liveBuild(sg, s, cyc) {
  const steps = buildSteps(sg.build), next = steps[built];
  if (!next) return;
  // Strudel schedules ahead from lastEnd, so the new code is evaluated when the next query is about to reach the
  // step's bar: everything from the bar on comes from the new code. The edit may be typed from half a bar after the
  // previous step; only the line of the section that plays at the step is typed, the other sections' lines change at once
  const due = s.lastEnd + .1 * s.cps >= next.at;
  if (!typing && !due) {
    const prevAt = built > 0 && steps[built - 1] ? steps[built - 1].at : -Infinity, to = codeFor(sg, next.at);
    typing = makeTyping(settleOthers(ed.code || '', to, next.at), to, Math.max(cyc, prevAt + .5), next.at - .2 * s.cps, s.cps, typingHuman(), stretchOf(next.at), sg.paste ? sg.paste(next.at) : Infinity, sg.earlier ? sg.earlier(next.at) : null);
  }
  if (!due) { typeFrame(typing, cyc); return; }
  typing = null; built = steps.filter(x => x.at <= next.at).length;
  ed.setCode(codeNow(sg, next.at)); ed.evaluate();
}

// ---------- hand live coding (#20) ----------
function setHand(on) {
  hand = on;
  $('#hand-tag').hidden = !on; $('#hand-resume').hidden = !on; $('#hand-save').hidden = !on; $('#hand-from-wrap').hidden = !on; $('#hand-from').setAttribute('aria-pressed', handFromHere);
  document.body.classList.toggle('by-hand', on);
}
// a character typed or deleted, a paste, a cut or a drop in the code during a live build: the user takes over
function takeOver() {
  if (hand || !song || !song.build || !(isPlaying() || (radio && radio.paused))) return;
  typing = null; resumeTo = null;
  const s = sched(); handFrom = Math.floor(s ? s.now() : 0);
  setHand(true);
}
const editKey = e => !e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || ['Backspace', 'Delete', 'Enter', 'Tab'].includes(e.key));
$('#edhost').addEventListener('keydown', e => { if (editKey(e)) takeOver(); }, true);
for (const ev of ['paste', 'cut', 'drop']) $('#edhost').addEventListener(ev, takeOver, true);
// resume: keep the user's code, type back to the song's code at the next bar, then the steps go on
function resumeHand() {
  if (!hand) return;
  const s = sched();
  lastHand = ed.code || '';
  try { sessionStorage.setItem('coding-misk-hand', lastHand); } catch (e) {}
  renderHandLast();
  setHand(false);
  if (!song || !s || !isPlaying()) { resumeTo = null; return; }
  const cyc = s.now(), bar = Math.ceil(cyc + .05);
  // from where I was: the song goes back to the bar where the user took over, with the code it had there
  if (handFromHere) {
    const target = Math.min(handFrom, Math.max(0, song.meta.bars - 1));
    resumeTo = { bar, target, ...makeTyping(ed.code || '', codeFor(song, target), cyc, bar - .2 * s.cps, s.cps) };
    return;
  }
  // the radio: when the song on air ended by hand, the next song starts on the next bar
  if (mode === 'radio' && radio && radio.afterHand(bar)) return;
  // Compose past the end of the song: start again from the top
  if (bar >= song.meta.bars) { playSong(song, 0, mode); return; }
  resumeTo = { bar, ...makeTyping(ed.code || '', codeFor(song, bar), cyc, bar - .2 * s.cps, s.cps) };
}
function resumeBuild(sg, s, cyc) {
  const r = resumeTo, due = s.lastEnd + .1 * s.cps >= r.bar;
  if (!due) { typeFrame(r, cyc); return; }
  resumeTo = null; typing = null;
  if (r.target !== undefined) { playSong(sg, r.target, mode); return; }
  built = sg.build ? buildSteps(sg.build).filter(x => x.at <= r.bar).length : 0;
  ed.setCode(codeNow(sg, r.bar)); ed.evaluate();
}
// the hidden code under the panel (code-writing): the helpers and the tail that play with the code shown
function renderPrelude() {
  const sg = (isPlaying() && song) || compiled, code = (ed && ed.code) || (sg && sg.code) || '', all = sg && sg.standalone ? sg.standalone(code) : '';
  const at = all.indexOf(code), hidden = at < 0 ? '' : `${all.slice(0, at)}// … ${t('preludePanel')} …${all.slice(at + code.length)}`;
  $('#prelude').hidden = !hidden; $('#prelude-code').textContent = hidden;
}
function renderHandLast() {
  $('#hand-last').hidden = !lastHand;
  $('#hand-last-code').textContent = lastHand || '';
}
$('#hand-resume').addEventListener('click', resumeHand);
const toggleHandFrom = () => { handFromHere = !handFromHere; store.set('coding-misk-hand-from', handFromHere); $('#hand-from').setAttribute('aria-pressed', handFromHere); };
$('#hand-from').addEventListener('click', toggleHandFrom);
$('#hand-from-lbl').addEventListener('click', toggleHandFrom);
$('#hand-copy').addEventListener('click', () => { try { navigator.clipboard.writeText(lastHand || '').then(() => toast(t('copied')), () => toast(t('copyNo'))); } catch (e) { toast(t('copyNo')); } });
$('#hand-back').addEventListener('click', async () => {
  if (!lastHand || !song || !isPlaying()) return;
  typing = null; resumeTo = null; handFrom = Math.floor(sched().now()); setHand(true);
  ed.setCode(lastHand); await ed.evaluate();
});
try { lastHand = sessionStorage.getItem('coding-misk-hand'); } catch (e) {}
// save the code written by hand as a new version of the song (#33): a code song of the user's, linked to the
// original, which stays as it is. In the radio the code is cropped to the song on air.
function saveVersion(code) {
  if (!code || !code.trim()) return;
  let from = null, origin = null;
  if (mode === 'radio' && radio && radio.on) {
    const st = radio.state, it = st.stream[st.onAir], sg = radio.steering.song;
    code = cropCode(code, it.start, it.start + it.bars);
    origin = { id: sg.id, title: sg.title, look: look, style: sg.style, tags: sg.tags };
  } else if (mode === 'track') origin = { id: T.id, title: T.title, look: T.look, style: T.style, tags: T.tags };
  else if (song) { const c = libraryCards().find(x => x.tr.id === song.id); origin = { id: song.id, title: song.title, look: c && c.tr.look, style: c && c.tr.style, tags: c && c.tr.tags }; }
  if (!origin) return;
  from = origin.id;
  const n = user.codeSongs.filter(v => v.from === from).length + 2;
  const v = { id: `v-${Date.now().toString(36)}`, title: `${origin.title} · v${n}`, code, look: origin.look, from, fromTitle: origin.title, version: n, created: new Date().toISOString(),
    ...(origin.style ? { style: origin.style } : {}), ...(origin.tags ? { tags: origin.tags } : {}) };
  user.codeSongs.push(v); saveLibrary(); cards = []; renderSongs();
  toast(t('handSaved', { title: v.title }));
}
$('#hand-save').addEventListener('click', () => saveVersion(ed.code || ''));
$('#hand-save-last').addEventListener('click', () => saveVersion(lastHand || ''));
renderHandLast();

// Strudel carica i worklet audio (supersaw, rumore, effetti) solo al primo mousedown.
// Li inizializziamo noi dentro il gesto dell'utente, così funziona anche da tastiera.
let audioInit = null;
function initAudioOnce() {
  // the master limiter's worklet (level-headroom) loads with the others, before the first note
  if (!audioInit && typeof globalThis.initAudio === 'function') audioInit = globalThis.initAudio().then(() => loadLimiter(globalThis.getAudioContext())).catch(e => { audioInit = null; console.error(e); });
  return audioInit;
}

// Riproduce un brano dalla posizione "bar" (anche frazionaria): lo scheduler di Strudel riprende
// da lastEnd, quindi basta impostarlo prima di avviare. Il tempo lo gestisce transport() battuta per battuta.
async function playSong(sg, bar = 0, as = 'free', { keepHand = false } = {}) {
  if (seeking) return;
  // (the song in Compose still growing: Play waits for it; a bar of the song as written moves past the growth span)
  const held = !!(sg && sg === compiled && compiled.pending);
  sg = await grownNow(sg);
  if (!sg || seeking) return;
  if (held && bar > 0 && sg.build && sg.build.crescendo) bar += sg.build.crescendo.growth;
  seeking = true;
  try {
    if (as !== 'radio' && radio && radio.on) radio.stopped();
    initAudioOnce();
    await ready;
    await initAudioOnce();
    const m = sg.meta;
    bar = Math.max(0, Math.min(m.bars - .01, bar));
    paused = null; song = sg; mode = as;
    source = as === 'track' ? { kind: 'track' } : as === 'radio' ? { kind: 'radio', name: sg.title } : { kind: 'song', name: sg.title, id: sg.id };
    renderSource();
    ed.stop();
    typing = null; built = sg.build ? buildSteps(sg.build).filter(x => x.at <= bar).length : 0;
    // spoken comments load the first time they play, too late for that hit: load them all now, silently
    if (sg.build) voiceSamples(sg.build, getLang(), customFiles).forEach(v => { try { globalThis.superdough({ ...v, gain: 0 }, globalThis.getAudioContext().currentTime + .3, .05); } catch (e) {} });
    if (hand && keepHand) { song = sg; sched().lastEnd = bar; await ed.evaluate(); return; }
    setHand(false); resumeTo = null;
    ed.setCode(codeNow(sg, bar));
    sched().lastEnd = bar;
    if (loopIdx >= 0) loopIdx = m.sectionAt(bar);
    if (as === 'track') { const k = arrSec(m.sectionAt(bar)); if (k >= 0) selectScene(k); }
    await ed.evaluate();
    updateShare();
  } finally { seeking = false; }
}
async function play() {
  initAudioOnce();
  await ready;
  await initAudioOnce();
  // a brano finito si riparte dall'inizio, altrimenti dalla sezione selezionata
  if (mode === 'track' && !isPlaying()) { const from = ended === compiled.id ? 0 : sceneStart(sel); ended = null; return playSong(compiled, from, 'track'); }
  paused = null;
  await ed.evaluate();
  updateShare();
}
function pause() {
  if (!isPlaying()) return;
  // the radio keeps its own pause (session, window and bar)
  if (mode === 'radio' && radio && radio.on) { radio.pause(); return; }
  paused = { id: song ? song.id : null, cyc: sched().now() };
  ed.stop();
}
function resume() {
  const p = paused;
  if (p && song && p.id === song.id) return playSong(song, p.cyc, mode, { keepHand: true });
  paused = null;
  return play();
}
const togglePlay = () => isPlaying() ? pause() : radio && radio.paused ? radio.resume() : paused ? resume() : play();
async function stop() { await ready; paused = null; ed.stop(); setHand(false); resumeTo = null; if (radio && radio.on) radio.stopped(); }

// ogni modifica alla composizione: brano non salvato, codice ricompilato, rivalutato se sta suonando
function changed() {
  dirty = true; saveDraft();
  compiled = playable({ ...T, kind: 'composed' });
  renderArranger();
  if (!$('#tab-brani').hidden) renderSongs();
  // by hand the editor keeps the user's code; the song's changes are heard on resume
  if (hand) { if (song && song.id === compiled.id && mode === 'track') song = compiled; return; }
  if (mode !== 'track') return backToTrack();
  if (song && song.id === compiled.id) song = compiled;
  typing = null;
  const now = isPlaying() && song === compiled ? sched().now() : 0;
  if (compiled.build) built = buildSteps(compiled.build).filter(x => x.at <= now).length;
  if (ed) ed.setCode(compiled.codeAt ? codeFor(compiled, now) : compiled.code);
  updateShare();
  clearTimeout(evalTimer);
  if (isPlaying()) evalTimer = setTimeout(() => ed.evaluate(), 150);
}
// ---------- the loop of the Patterns tab (pattern-library, design D2) ----------
// a temporary song of 4 bars (src/library/patterns.js loopSong), written with the Technical functions preset of the
// configuration of the song in Compose (song-functions, song-own-settings) and played by the same player as the songs; it loops until stopped. A change while
// it plays (sound, key, tempo, another pattern) is evaluated at the next bar (songTick). The song is never saved.
let loopNext = null;
function loopPlayable(sg, uid = null) {
  const o = functionOptions(ctlOf(T)), ref = compileSong(sg);
  const base = { id: 'pattern-loop', title: sg.title, kind: 'pattern', loop: true, uid, meta: parseSong(ref) };
  if (!FUNCTION_OPTIONS.some(k => o[k])) return { ...base, code: ref };
  const buses = busesOf(ref), w = writeCode(ref, { mode: o, written: levelsOf(ref), buses, fns: functionContext(ref, { id: sg.id, title: sg.title }, o) });
  // the code as written takes its mixer entries line by line; edited by hand, by the text of its lines
  const entries = shown => (shown === w.code ? w.entries : null);
  const run = shown => shown + tail(shown, { table: w.table, entries: entries(shown) });
  const standalone = shown => { const pre = preludeText(buses, w.fns); return pre + shown + tail(shown, { table: w.table, entries: entries(shown), offset: pre.length }); };
  return { ...base, code: w.code, run, standalone, buses, fns: w.fns };
}
async function playLoop(sg, uid, title) {
  const p = loopPlayable({ ...sg, title }, uid);
  if (song && song.loop && isPlaying() && !seeking) { loopNext = { p, at: Math.floor(sched().now()) + 1 }; return; }
  loopNext = null;
  // a song or the radio stops first
  if (radio && radio.on) radio.stopped();
  setHand(false); resumeTo = null; paused = null;
  initAudioOnce();
  await ready;
  await initAudioOnce();
  ed.stop(); typing = null; built = 0;
  song = p; mode = 'free'; source = { kind: 'pattern', name: title };
  renderSource();
  ed.setCode(codeFor(p, 0));
  sched().lastEnd = 0;
  await ed.evaluate();
  updateShare();
}
const loopState = () => (song && song.loop && isPlaying() ? { uid: loopNext ? loopNext.p.uid : song.uid, cycle: loopNext ? -1 : sched().now() } : null);
async function loadFree(code, src) {
  if (radio && radio.on) radio.stopped();
  setHand(false); resumeTo = null;
  song = null; paused = null;
  initAudioOnce();
  await ready;
  await initAudioOnce();
  mode = 'free'; source = src;
  renderSource();
  ed.setCode(withVisuals(code));
  await ed.evaluate();
  updateShare();
}
function backToTrack() {
  const wasPlaying = isPlaying();
  mode = 'track'; source = { kind: 'track' }; paused = null;
  renderSource();
  if (wasPlaying) return playSong(compiled, sceneStart(sel), 'track');
  song = null;
  if (ed) ed.setCode(compiled.code);
  updateShare();
}
function renderSource() {
  const map = {
    track: () => `${t('arranger')}: ${T.title}`,
    lesson: () => t('srcGuide', { name: source.name }),
    sound: () => t('srcSound', { name: source.name }),
    pattern: () => t('srcPattern', { name: source.name }),
    song: () => t('srcSong', { name: source.name }),
    radio: () => t('srcRadio', { name: source.name }),
  };
  $('#src').textContent = map[source.kind]();
  $('#back').hidden = source.kind === 'track';
  $('#save-code').hidden = source.kind !== 'song';
}
// the code copied or opened in Strudel: with the hidden part written out when there is one (code-writing)
const currentCode = () => { const c = (ed && ed.code) || compiled.code, sg = song || compiled; return sg && sg.standalone ? sg.standalone(c) : c; };
const shareLink = code => {
  const bytes = new TextEncoder().encode(code);
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return 'https://strudel.cc/#' + encodeURIComponent(btoa(bin));
};
function updateShare() { $('#share').href = shareLink(currentCode()); }
$('#share').addEventListener('pointerdown', updateShare);
$('#share').addEventListener('focus', updateShare);

let toastT = 0;
// action: { label, run } adds a button (Restore after a delete, #68) and keeps the toast a little longer
function toast(msg, action = null) {
  let box = $('.toast');
  if (!box) { box = document.createElement('div'); box.className = 'toast'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  box.textContent = msg; box.hidden = false;
  if (action) {
    const b = document.createElement('button');
    b.className = 'btn toast-act'; b.textContent = action.label;
    b.addEventListener('click', () => { box.hidden = true; action.run(); });
    box.append(' ', b);
  }
  clearTimeout(toastT); toastT = setTimeout(() => box.hidden = true, action ? 5000 : 2600);
}
// conferma in due tocchi
const armed = {};
function confirmTwice(key, msg) {
  if (armed[key] && Date.now() - armed[key] < 4000) { delete armed[key]; return true; }
  armed[key] = Date.now(); toast(msg || t('confirmAgain')); return false;
}

$('#copy').addEventListener('click', () => {
  try { navigator.clipboard.writeText(currentCode()).then(() => toast(t('copied')), () => toast(t('copyNo'))); }
  catch (e) { toast(t('copyNo')); }
});
$('#back').addEventListener('click', backToTrack);
$('#save-code').addEventListener('click', () => {
  if (source.kind !== 'song') return;
  const orig = CODED.find(c => c.id === source.id); if (!orig) return;
  const first = parseSong(orig.code).bpm[0];
  user.code[source.id] = currentCode().replace(/setcpm\([^)]*\)/, `setcpm(${first}/4)`);
  saveLibrary(); renderSongs(); toast(t('codeSaved'));
});

$('#play').addEventListener('click', togglePlay);
$('#stop').addEventListener('click', stop);
document.addEventListener('keydown', e => {
  const inEditor = e.target.closest && e.target.closest('strudel-editor');
  // barra spaziatrice: play/pausa, tranne mentre si scrive o su un pulsante
  if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !inEditor && !e.target.closest('input, select, textarea, button, [contenteditable]')) { e.preventDefault(); togglePlay(); return; }
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key === 'Enter' && !inEditor) { e.preventDefault(); play(); }
  if (e.key === '.' && !inEditor) { e.preventDefault(); stop(); }
});

// ---------- esportazione audio ----------
// Registra l'uscita master di Strudel in tempo reale mentre il brano suona dall'inizio alla fine,
// poi converte la registrazione in WAV a 16 bit e la scarica.
let rec = null;
// a live capture of the master output (#30, the radio's recording): WAV or Opus from the settings,
// pause and resume without gaps; the volume does not change it (it taps the master before the volume)
let capture = null;
function startCapture() {
  initAudioOnce();
  const ctx = globalThis.getAudioContext(), dest = ctx.createMediaStreamDestination();
  const opus = store.get('coding-misk-export-format', 'wav') === 'opus', mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus'].find(m => globalThis.MediaRecorder && MediaRecorder.isTypeSupported(m));
  const recorder = opus && mime ? new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 192000 }) : new MediaRecorder(dest.stream);
  const chunks = [], c = { node: null, dest, recorder, opus: !!(opus && mime) };
  c.tap = () => { try { const node = globalThis.getSuperdoughAudioController().output.destinationGain; if (node && node !== c.node) { if (c.node) try { c.node.disconnect(dest); } catch (e) {} node.connect(dest); c.node = node; } } catch (e) {} };
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
  c.tap(); recorder.start(1000);
  c.pause = () => { if (recorder.state === 'recording') recorder.pause(); };
  c.resume = () => { if (recorder.state === 'paused') recorder.resume(); };
  c.stop = () => new Promise(res => {
    recorder.onstop = async () => {
      try { if (c.node) c.node.disconnect(dest); } catch (e) {}
      capture = null;
      const raw = new Blob(chunks, { type: recorder.mimeType });
      if (c.opus) return res({ blob: raw, ext: /ogg/.test(recorder.mimeType) ? 'ogg' : 'webm' });
      toast(t('exportWorking'));
      try { res(await encodeRecording(raw)); }
      catch (e) { res({ blob: raw, ext: 'webm' }); }
    };
    recorder.stop();
  });
  if (preview) preview.stop();
  capture = c;
  return c;
}
function tapMaster() {
  if (!rec) return;
  try {
    const node = globalThis.getSuperdoughAudioController().output.destinationGain;
    if (node && node !== rec.node) { node.connect(rec.dest); rec.node = node; }
  } catch (e) {}
}
// asVideo (#27): a video of the song (frame and audio) instead of the audio alone
async function exportTrack(sg, as, asVideo = false) {
  // (the song in Compose still growing: the export waits for it, growth-in-background D2)
  if (!rec && !fastJob) { sg = await grownNow(sg); if (!sg) return; }
  if (rec) { rec.cancel = true; rec.recorder.stop(); stop(); return; }
  if (fastJob) { fastJob.cancel(); return; }
  // audio: rendered offline in seconds (#8), unless the settings ask for real time or the render fails
  // audio, or a video in fast mode (#53), rendered offline unless the settings ask for real time or the render fails
  if (exportSpeed() === 'fast' && (!asVideo || video.opts().layout !== 'tab')) { if (await (asVideo ? exportVideoFast(sg) : exportFast(sg))) return; toast(t('exportFastFailed')); }
  if (asVideo && (capture || video.on)) return toast(t('vidBusy'));
  // the whole tab: the browser asks which tab to share, while the click still counts
  const display = asVideo ? await video.askTab() : null;
  if (display === false) return toast(t('vidTabRefused'));
  initAudioOnce(); await ready; await initAudioOnce();
  const ctx = globalThis.getAudioContext();
  const dest = ctx.createMediaStreamDestination();
  let recorder, opus = false, ext = '';
  if (asVideo) {
    const v = video.start({ audio: dest.stream, total: sg.meta.seconds, display, onStop: () => { if (rec && !rec.ending) rec.ending = performance.now(); stop(); }, onCancel: () => { if (rec) { rec.cancel = true; rec.recorder.stop(); } stop(); } });
    if (!v) { if (display) display.getTracks().forEach(tr => tr.stop()); return toast(t('vidNotSupported')); }
    recorder = v.recorder; ext = v.ext;
  } else {
    // Opus is the recording itself; WAV, FLAC and MP3 are encoded from the decoded recording (#31, #8)
    const want = exportFormat() === 'opus', mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus'].find(m => globalThis.MediaRecorder && MediaRecorder.isTypeSupported(m));
    recorder = want && mime ? new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 192000 }) : new MediaRecorder(dest.stream);
    opus = !!(want && mime);
  }
  if (preview) preview.stop();
  rec = { opus, video: asVideo, ext, recorder, dest, chunks: [], node: null, id: sg.id, title: sg.title, total: sg.meta.seconds, ending: 0, cancel: false };
  recorder.ondataavailable = e => e.data.size && rec.chunks.push(e.data);
  recorder.onstop = () => finishExport(rec);
  tapMaster();
  recorder.start(500);
  loopIdx = -1;
  await playSong(sg, 0, as);
}
async function finishExport(r) {
  rec = null;
  try { if (r.node) r.node.disconnect(r.dest); } catch (e) {}
  if (r.video) video.end();
  if (r.cancel) return toast(t(r.video ? 'vidCancelled' : 'exportCancel'));
  if (r.video) { saveBlob(fileName(r.title, r.ext), new Blob(r.chunks, { type: r.recorder.mimeType })); return toast(t('vidSaved', { name: fileName(r.title, r.ext) })); }
  toast(t('exportWorking'));
  const blob = new Blob(r.chunks, { type: r.recorder.mimeType });
  const out = r.opus ? { blob, ext: /ogg/.test(r.recorder.mimeType) ? 'ogg' : 'webm' } : await encodeRecording(blob);
  const name = fileName(r.title, out.ext);
  saveBlob(name, out.blob);
  toast(t('exportDone', { name }));
}
// a real time recording decoded and encoded in the chosen format (WAV when the format cannot be made here)
async function encodeRecording(blob) {
  const buf = await globalThis.getAudioContext().decodeAudioData(await blob.arrayBuffer());
  const channels = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, c) => buf.getChannelData(c));
  const fmt = exportFormat() === 'opus' ? 'wav' : exportFormat();
  try { return await encode(channels, buf.sampleRate, fmt, { mp3Rate: mp3Rate() }); } catch (e) { console.warn(e); return encode(channels, buf.sampleRate, 'wav'); }
}

// ---------- fast export (#8) ----------
// the export settings: format (wav, flac, mp3, opus), MP3 bitrate, speed (fast or real time)
const exportFormat = () => formatOf(store.get('coding-misk-export-format', 'wav'));
const mp3Rate = () => (store.get('coding-misk-export-mp3', 320) === 192 ? 192 : 320);
const exportSpeed = () => (store.get('coding-misk-export-speed', 'fast') === 'real' ? 'real' : 'fast');
// the fast export running: { id, progress 0..1, phase: load, schedule, render, encode; cancel() }
let fastJob = null;
// renders sg offline and saves the audio and its timeline; false when it failed (the caller records in real time)
// the code segments of one block of a fast export [from, to) seconds: only the tracks with a clip in it (and voices),
// so a long session does not compute every silent track of the songs already gone (#8)
function blockSegments(sg) {
  const doc = sg.doc && sg.doc.tracks ? absoluteClips(clone(sg.doc)) : null, T = tempoClock(sg.meta.bpm.map(Number));
  if (!doc) return null;
  return (from, to) => {
    const c0 = Math.floor(T.cycleAt(from)) - 1, c1 = Math.ceil(T.cycleAt(to)) + 1;
    const on = new Set(doc.tracks.filter(tr => tr.type === 'voice' || (tr.clips || []).some(c => c.start < c1 && c.start + (c.bars || 1) > c0)).map(tr => tr.id));
    const keep = tr => tr.type === 'voice' || on.has(tr.id);
    // (only the segments of the block are written: a long session has thousands of steps)
    return segmentsOf(sg, (s, bar) => codeFor(s, bar, keep), (a, b) => b > T.cycleAt(from) - 1 && a < T.cycleAt(to) + 1);
  };
}
// after(): called once the files are saved (the radio adds its track list and recipe)
// cut: { cut, fade } seconds, the file ends exactly at cut with a fade-out (#5)
// extra: { songs, seed } for the texts saved next to the file (#57); extra.frag: { start, end, file } a fragment's audio
// only (its file name, no timeline or texts here: the fragments save their own), returns the file name
async function exportFast(sg, title = sg.title, after = null, cut = null, extra = {}) {
  if (typeof OfflineAudioContext === 'undefined') return false;
  let fmt = exportFormat();
  // a long export goes straight to a file on disk (#61): the dialog comes first, while the click still counts
  const frag = extra.frag || null;
  const long = (frag ? frag.end - frag.start : (cut && cut.cut) || sg.meta.seconds) > LONG_SECONDS;
  const disk = long ? await askDiskFile(fileName(frag ? frag.file : title, EXT[fmt] || fmt), { wav: 'audio/wav', flac: 'audio/flac', mp3: 'audio/mpeg', opus: 'audio/ogg' }[fmt] || 'audio/wav', EXT[fmt] || fmt) : null;
  if (disk === false) { toast(t('exportCancel')); return true; }
  if (fmt !== 'wav' && !(await canEncode(fmt))) { toast(t('exportFormatMissing', { f: fmt.toUpperCase() })); fmt = 'wav'; }
  const segments = segmentsOf(sg, codeFor);
  const enc = await createEncoder(fmt, 48000, { mp3Rate: mp3Rate(), writable: disk ? disk.writable : null });
  const job = renderInBlocks({ segments, segmentsAt: blockSegments(sg), buses: sg.buses || {}, fns: sg.fns || {}, bpm: sg.meta.bpm.map(Number), tail: 3, sampleRate: 48000, gain: MASTER, push: songPush(sg), block: store.get('coding-misk-export-block', 0), ...(cut || {}), ...(frag ? { start: frag.start, cut: frag.end, fade: 0.5, fadeIn: 0.3 } : {}), onSkipped: list => toast(t('soundsSkipped', { list: list.join(', ') })) }, enc, (p, phase) => { if (fastJob) { fastJob.progress = p; fastJob.phase = phase; } });
  if (preview) preview.stop();
  fastJob = { id: sg.id, progress: 0, phase: 'load', cancel: job.cancel };
  try {
    const r = await job.promise;
    fastJob.phase = 'encode';
    const { blob, ext } = await enc.finish();
    const name = disk ? disk.name : fileName(frag ? frag.file : title, ext);
    if (blob) saveBlob(name, blob);
    if (frag) return name;
    const tl = timelineOf(sg, segments, r.onsets, r.seconds, getLang());
    setTimeout(() => saveBlob(fileName(title, 'timeline.json'), new Blob([JSON.stringify(tl)], { type: 'application/json' })), 400);
    { const src = { sg, title, songs: extra.songs || null, seed: extra.seed || sg.id || title, cut }; showTexts(saveTexts(textsInfo(src, 'audio'), title), () => textsInfo(src, 'audio')); }
    if (after) after(title);
    toast(t('exportDone', { name }));
    return true;
  } catch (e) {
    if (e && e.cancelled) { toast(t('exportCancel')); return frag ? 'cancelled' : true; }
    console.warn('[fast export]', e);
    return false;
  } finally { fastJob = null; }
}
// a fast export keeps going in a background tab, but the browser may slow it down: say so once per export
document.addEventListener('visibilitychange', () => { if (document.hidden && fastJob && !fastJob.warned) { fastJob.warned = true; toast(t('exportHidden')); } });
globalThis.codingMiskExport = { encode, get job() { return fastJob ? { id: fastJob.id, progress: fastJob.progress, phase: fastJob.phase } : null; } };
// one Export and one Record for audio and video (#27): the switch is the small display next to the button
const outKind = () => outKindOf(store.get(OUT_KEY, 'audio'));
const outLabel = () => outText(outKind(), exportFormat(), (store.get('coding-misk-video', {}) || {}).quality || VIDEO_DEFAULTS.quality, mp3Rate());
const outKindButton = () => `<button class="out-kind" data-out-kind title="${esc(t('outKindTip'))}" aria-label="${esc(t('outKindTip'))}"><span class="comp-lcd" data-out-lcd>${esc(outLabel())}</span></button>`;
const outCombo = btn => `<span class="out-combo">${btn}${outKindButton()}</span>`;
document.addEventListener('click', e => { const b = e.target.closest('[data-out-kind]'); if (!b || b.disabled) return; store.set(OUT_KEY, outKind() === 'video' ? 'audio' : 'video'); });
function saveBlob(name, blob) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
// a live video capture (#27) for the radio and the playlist sessions: the same interface as startCapture.
// onStop / onCancel: the video bar's buttons. Null when the browser cannot record or the tab was not shared.
async function startVideoCapture({ total = 0, onStop = () => {}, onCancel = () => {} } = {}) {
  if (capture || rec || video.on) { toast(t('vidBusy')); return null; }
  const display = await video.askTab();
  if (display === false) { toast(t('vidTabRefused')); return null; }
  initAudioOnce();
  const ctx = globalThis.getAudioContext(), dest = ctx.createMediaStreamDestination();
  const v = video.start({ audio: dest.stream, total, display, onStop, onCancel });
  if (!v) { if (display) display.getTracks().forEach(tr => tr.stop()); toast(t('vidNotSupported')); return null; }
  const recorder = v.recorder, chunks = [], c = { node: null, dest, recorder, video: true };
  c.tap = () => { try { const node = globalThis.getSuperdoughAudioController().output.destinationGain; if (node && node !== c.node) { if (c.node) try { c.node.disconnect(dest); } catch (e) {} node.connect(dest); c.node = node; } } catch (e) {} };
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
  c.tap(); recorder.start(1000);
  c.pause = () => { if (recorder.state === 'recording') { recorder.pause(); video.pause(); } };
  c.resume = () => { if (recorder.state === 'paused') { recorder.resume(); video.resume(); } };
  // cancel: nothing is kept (resolves null)
  c.stop = (cancel = false) => new Promise(res => {
    recorder.onstop = () => {
      try { if (c.node) c.node.disconnect(dest); } catch (e) {}
      capture = null; video.end();
      res(cancel ? null : { blob: new Blob(chunks, { type: recorder.mimeType }), ext: v.ext });
    };
    recorder.stop();
  });
  if (preview) preview.stop();
  capture = c;
  return c;
}
// a video of a radio session saved in a playlist (#27): the session replays and the video ends after its last song
let sessionVid = null;
// asVideo false: the audio in real time (the fallback of the fast export); a second tap on the row cancels
async function recordSession(id, asVideo = true) {
  const s = playlists.session(id); if (!s || !radio) return;
  if (sessionVid) { if (sessionVid.id === id) sessionVid.finish(true); return; }
  const finish = async cancel => {
    if (!sessionVid) return;
    const v = sessionVid; sessionVid = null;
    stop();
    const out = await v.cap.stop(cancel);
    if (!out) return toast(t(asVideo ? 'vidCancelled' : 'exportCancel'));
    const name = fileName(s.title, out.ext);
    saveBlob(name, out.blob); toast(t(asVideo ? 'vidSaved' : 'exportDone', { name }));
  };
  const cap = asVideo ? await startVideoCapture({ onStop: () => finish(false), onCancel: () => finish(true) }) : (capture || rec ? null : startCapture());
  if (!cap) { if (!asVideo) toast(t('vidBusy')); return; }
  sessionVid = { id, cap, finish };
  mixS = null; queue = null;
  // the reverb tail of the last song stays in the file
  radio.playSession(s, { onEnd: () => setTimeout(() => finish(false), 2500) });
}
// the radio's fast export (#8): the songs of a range joined like a saved session, with a track list and the recipe
async function exportRadio(range) {
  if (!range) { if (fastJob) fastJob.cancel(); return; }
  if (fastJob || rec || capture) return toast(t('vidBusy'));
  const r = radio && radio.exportItems(range);
  if (!r || !r.items.length) return;
  // (the length alone: the songs joined with Classic controls; the file: as the radio plays them, radio-profiles D12)
  const joinOf = (items, full = false) => sessionPlayable(items, r.recipe.seed, r.recipe.options, 'radio', full ? radio.airSongs(items) : null);
  let sg = joinOf(r.items);
  // a length: the real joined length decides. Exact (#5): the songs that reach the target, cut there with a fade;
  // else the last song goes when the rest still reaches 90% of the target. A clip: one song composed to the length.
  let cut = null;
  if (range.kind === 'minutes') {
    const target = range.minutes * 60;
    while (r.items.length > 1) { const less = joinOf(r.items.slice(0, -1)); if (less.meta.seconds < (range.exact ? target : target * 0.9)) break; r.items.pop(); sg = less; }
    if (range.exact) cut = { cut: target, fade: Math.min(6, target / 10) };
  }
  // the clip's song lasts a second less than the clip: its last hit rings out in that second, then the file ends
  if (range.kind === 'clip') cut = { cut: range.seconds, fade: 0.8 };
  sg = joinOf(r.items, true);
  const base = `coding-misk-radio-${String(r.recipe.seed).replace(/[^\w-]+/g, '-')}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
  // the track list: the first section of each song ("3 Intro" belongs to song 3), at its time in the file
  const T = tempoClock(sg.meta.bpm), starts = {};
  for (const sec of sg.meta.sections) { const n = parseInt(sec.label, 10); if (n && starts[n] === undefined) starts[n] = T.seconds(sec.start); }
  const clock2 = x => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  const lines = [`coding-misk radio · seed ${r.recipe.seed} · ${new Date().toLocaleString()}`, '', ...r.items.map((x, i) => `${clock2(starts[i + 1] || 0)} ${x.song.title}${x.artist ? ` · ${x.artist}` : ''}`)];
  const after = () => {
    setTimeout(() => saveBlob(`${base}-tracklist.txt`, new Blob([lines.join('\n') + '\n'], { type: 'text/plain' })), 800);
    // the recipe carries which songs of the session the file holds and where it was cut, so fragments (#57) find the same times
    setTimeout(() => saveBlob(`${base}-recipe.json`, new Blob([JSON.stringify({ ...r.recipe, export: { from: r.from || 0, count: r.items.length, ...(cut || {}) } }, null, 2) + '\n'], { type: 'application/json' })), 1200);
  };
  const songs = r.items.map(x => ({ song: x.song, title: x.song.title, artist: x.artist || '' }));
  const ok = outKind() === 'video' ? await exportVideoFast(sg, base, { songs, after, cut, seed: String(r.recipe.seed) }) : await exportFast(sg, base, after, cut, { songs, seed: String(r.recipe.seed) });
  if (!ok) toast(t('rxFailed'));
}
// ---------- fast video (#53) ----------
// a video of sg rendered faster than real time, following the direction in Settings → Video.
// songs: the songs of a joined session or radio range [{ song, title, artist }], to name and dress each part.
// Returns false when it failed (the caller records in real time), true when done or cancelled.
// frag (#57): a vertical fragment { start, end, layout, label, code, msgs, o, file }: the file is that stretch at 1080×1920
// the code of the video breaks its lines at the width of the video's code panel while it is exported
async function exportVideoFast(...args) {
  try { return await exportVideoFastIn(...args); } finally { exportCols = null; }
}
async function exportVideoFastIn(sg, title = sg.title, { songs = null, after = null, cut = null, frag = null, seed = null } = {}) {
  // the song being rendered decides the lit notes (performance-profiles), not the one in the player
  exportCtl = sg.ctl || null;
  // a long video goes straight to a file on disk (#61): the dialog comes first, while the click still counts
  const long = !frag && ((cut && cut.cut) || sg.meta.seconds) > LONG_SECONDS;
  const disk = long ? await askDiskFile(fileName(title, 'mp4'), 'video/mp4', 'mp4') : null;
  if (disk === false) { toast(t('vidCancelled')); return true; }
  const o = video.opts(), fsz = frag ? fragmentSize(frag.o) : null, q = frag ? fsz.file : QUALITIES[o.quality], layout = o.layout === 'tab' ? 'visual' : o.layout;
  const A = frag ? fragmentAreas(frag.o, fsz.comp.w, fsz.comp.h) : TIMELINE_LAYOUTS.includes(layout) ? liveAreas(layout, q.w, q.h) : layoutAreas(layout, q.w, q.h, null), stageA = A.stage || { w: 720, h: 720 };
  exportCols = codeColsOf(A.code, frag ? fsz.comp.h : q.h);
  const segments = segmentsOf(sg, codeFor), looks = PICK_LOOKS.map(l => l[0]);
  // the parts of the file: one per song of a session ("3 Intro" belongs to song 3), or the song itself
  const parts = [];
  sg.meta.sections.forEach((sec, i) => {
    const n = songs ? parseInt(sec.label, 10) || 1 : 1, last = parts[parts.length - 1];
    if (!last || last.n !== n) parts.push({ n, start: sec.start, end: sec.start + sec.len, first: i });
    else last.end = sec.start + sec.len;
  });
  const own = songs ? store.get('coding-misk-radio-look', 'palco') : sg.look || look;
  const sayList = saidSteps(sg).map(x => ({ bar: x.at, text: sayText(x.say, getLang()) }));
  const job = { typingSpeed: typingSpeed(), typingStyle: sg.ctl && sg.ctl.typist === 'human' ? 'human' : 'exact', typingMistakes: !(sg.ctl && sg.ctl.mistakes === 'off'), songId: sg.id, segments, segmentsAt: blockSegments(sg), buses: sg.buses || {}, fns: sg.fns || {}, bpm: sg.meta.bpm.map(Number), tail: 3, sampleRate: 48000, gain: MASTER, push: songPush(sg), block: store.get('coding-misk-export-block', 0), ...(cut || {}), onSkipped: list => toast(t('soundsSkipped', { list: list.join(', ') })),
    ...(frag ? { start: frag.start, cut: frag.end, fade: 0.5, fadeIn: 0.3 } : {}) };
  visuals.setTarget({ w: stageA.w, h: stageA.h });
  const fragJ = frag ? { q, comp: fsz.comp, o: frag.o, label: frag.label, code: frag.code, tagline: frag.tagline, msgs: frag.msgs, length: frag.end - frag.start } : null;
  // a fragment's visual and soul view: the song's own, one at random (from the fragment's code), or one chosen
  const pickOf = (choice, list) => (choice === 'random' ? list[hashString(`${frag.code}/${list.length}`) % list.length] : list.includes(choice) ? choice : null);
  const fragLook = frag ? pickOf(frag.o.look, looks) : null;
  if (frag) soul.force(pickOf(frag.o.soulView, SOUL_VIEWS));
  const EQ = ['kick', 'snare', 'hats', 'bass', 'arp', 'pad', 'hook'];
  visuals.hold(true);
  let clockT = 0;
  soul.setClock(() => clockT);
  const run = renderVideo({
    job, canvas: video.canvas, q, writable: disk ? disk.writable : null,
    drawFrame(t, cyc, feed, codeAt, fi) {
      clockT = t;
      const p = parts.find(x => cyc >= x.start && cyc < x.end) || parts[parts.length - 1], item = songs ? songs[p.n - 1] : null;
      const section = sg.meta.sectionAt(Math.min(cyc, sg.meta.bars - .001));
      const said = sayList.filter(x => x.bar <= cyc && cyc < x.bar + 4).pop();
      const doc = item ? item.song : sg.doc;
      fv = {
        code: codeAt(cyc), say: said ? said.text : '',
        info: { onAir: true, n: p.n, title: item ? item.title : sg.title, artist: item ? item.artist : '', bar: cyc - p.start, bars: p.end - p.start, bpm: Math.round(sg.meta.bpm[Math.min(sg.meta.bars - 1, Math.floor(cyc))]) || undefined, say: said ? said.text : '', sayAt: said ? said.bar - p.start : 0 },
        soulSrc: doc && doc.sections && doc.tracks ? { key: `fv:${p.n}`, song: doc, ctx: {}, bar: cyc - p.start } : null,
      };
      visuals.drawAt({ now: t * 1000, cyc, look: fragLook || lookFor(o, looks, { n: p.n, section, own }), feed, dt: 1 / q.fps, show: fi % 6 === 0 });
      if (fragJ) video.composeVertical(fragJ, cyc, t, t, EQ.map(k => Math.min(1, ((feed.raw || {})[k] || 0) * 3)), section);
      else video.composeAt({ layout, q }, cyc, t);
    },
    onProgress: (p, phase) => { if (fastJob) { fastJob.progress = p; fastJob.phase = phase; } },
  });
  if (preview) preview.stop();
  fastJob = { id: sg.id, progress: 0, phase: 'load', cancel: run.cancel };
  try {
    const r = await run.promise;
    if (frag) { const name = fileName(frag.file, r.ext); saveBlob(name, r.blob); return name; }
    const name = disk ? disk.name : fileName(title, r.ext);
    if (r.blob) saveBlob(name, r.blob);
    const tl = timelineOf(sg, segments, r.onsets, r.seconds, getLang());
    setTimeout(() => saveBlob(fileName(title, 'timeline.json'), new Blob([JSON.stringify(tl)], { type: 'application/json' })), 400);
    { const src = { sg, title, songs, seed: seed || sg.id || title, cut }; showTexts(saveTexts(textsInfo(src, 'video'), title), () => textsInfo(src, 'video')); }
    if (after) after(title);
    toast(t('vidSaved', { name }));
    return true;
  } catch (e) {
    if (e && e.cancelled) { if (frag) return 'cancelled'; toast(t('vidCancelled')); return true; }
    console.warn('[fast video]', e);
    return false;
  } finally {
    fastJob = null; fv = null;
    soul.setClock(null); soul.force(null); visuals.hold(false); visuals.setTarget(null);
  }
}
// ---------- fragments and texts for sharing (#57) ----------
const FRAG_KEY = 'coding-misk-fragments', FRAG_N = 'coding-misk-fragment-n';
// stageRatio: the app's stage, for "whole visual" (the scenes draw the same picture at the same proportions)
const stageRatio = () => { const c = $('#stage'), r = c && c.clientHeight ? c.clientWidth / c.clientHeight : 0; return r > 1 ? Math.min(4, r) : 2.4; };
const fragOpts = () => ({ ...fragmentOpts(store.get(FRAG_KEY, {}) || {}), stageRatio: stageRatio() });
const setFragOpt = (k, v) => store.set(FRAG_KEY, { ...fragOpts(), [k]: v });
const nextFragment = () => Math.max(1, +store.get(FRAG_N, 1) || 1);
// the picker's shape: the song JSON when there is one, else the sections alone
function shapeFor(sg) {
  if (sg.session && sg.doc && sg.doc.tracks) {
    // a session with grown songs (radio-profiles D12): tracks are silent until the steps bring them in, fragments start on
    // a step, and the first steps of a grown song (one sound alone, or its silent lead-in) only when nothing else fits
    const sh = shapeOf(sg.doc, absoluteClips), map = buildMap({ tracks: sg.doc.tracks, build: buildSteps(sg.build) }, sh.bars);
    sh.tracks = sh.tracks.map(t => ({ ...t, off: (map[t.id] || {}).off || [] }));
    sh.steps = [...new Set(buildSteps(sg.build).map(x => x.at))];
    sh.leads = sg.session.grown.flatMap(b => sh.steps.filter(x => x >= b).slice(0, 2));
    return sh;
  }
  if (sg.doc && sg.doc.sections && sg.doc.tracks && sg.doc.crescendo) {
    // a Crescendo song (#64): tracks are silent until the build brings them in, and fragments start on a step
    const sh = shapeOf(sg.doc, absoluteClips), map = buildMap(sg.doc, sh.bars);
    sh.tracks = sh.tracks.map(t => ({ ...t, off: (map[t.id] || {}).off || [] }));
    sh.steps = [...new Set(buildSteps(sg.doc).map(x => x.at))];
    return sh;
  }
  if (sg.doc && sg.doc.sections && sg.doc.tracks) return shapeOf(sg.doc, absoluteClips);
  return { bars: sg.meta.bars, sections: sg.meta.sections.map(x => ({ label: x.label, start: x.start, len: x.len })), tracks: [{ type: 'any', clips: [{ start: 0, bars: sg.meta.bars }] }] };
}
// a session's songs joined into one playable song, as its export does
// (grown songs as the radio plays them, radio-profiles D12)
const joinItems = (items, seed, options, id) => sessionPlayable(items, seed, options, id, radio ? radio.airSongs(items) : null);
// a source: a song id, a playlist session id, or a recipe object (the file saved with a radio export)
// → { sg, title, key, seed, songs, cut } or { error }
function fragmentSource(src) {
  if (src && typeof src === 'object') {
    if (!radio || !src.seed) return { error: 'source' };
    const ex = src.export || {}, from = ex.from || 0, items = radio.rebuild(src, from + (ex.count || 1)).slice(from);
    const sg = joinItems(items, src.seed, src.options, 'recipe');
    return { sg, title: `Radio ${src.seed}`, key: `recipe:${src.seed}:${from}`, seed: String(src.seed), songs: items.map(x => ({ song: x.song, title: x.song.title, artist: x.artist || '' })), cut: ex.cut ? { cut: ex.cut, fade: ex.fade || 0 } : null };
  }
  const s = playlists.session(src);
  if (s && radio) {
    const items = s.frozen || radio.rebuild(s.recipe, s.count), sg = joinItems(items, s.recipe.seed, s.recipe.options, src);
    return { sg, title: s.title, key: `session:${src}`, seed: String(s.recipe.seed), songs: items.map(x => ({ song: x.song, title: x.song.title, artist: x.artist || '' })) };
  }
  const c = cards.find(x => x.tr.id === src);
  if (!c) return { error: 'source' };
  const sg = c.tr.kind === 'composed' ? playable({ ...prepare(clone(c.tr)), kind: 'composed' }) : c.p;
  return { sg, title: c.tr.title || sg.title, key: `song:${src}`, seed: String(src), songs: null, inspiration: c.tr.inspiration || null };
}
// the facts the texts need: song titles with their start in seconds, genres, length
function textsInfo(src, kind, extra = {}) {
  const sg = src.sg, T = tempoClock(sg.meta.bpm.map(Number)), songs = [];
  if (src.songs) for (const sec of sg.meta.sections) { const n = parseInt(sec.label, 10); if (n && !songs[n - 1]) songs[n - 1] = { title: src.songs[n - 1] ? src.songs[n - 1].title : sec.label, start: T.seconds(sec.start) }; }
  const docs = src.songs ? src.songs.map(x => x.song) : [sg.doc || {}];
  const genres = docs.flatMap(d => (d && d.tags && (d.tags.genres || d.tags.styles)) || (d && typeof d.genre === 'string' ? [d.genre] : []));
  const seconds = src.cut ? src.cut.cut : sg.meta.seconds;
  return { kind, title: src.title, songs: songs.filter(Boolean), genres, seconds, seed: src.seed, ...(src.inspiration ? { inspiration: src.inspiration } : {}), ...extra };
}
function saveTexts(info, base) {
  const tx = textsFor(info);
  setTimeout(() => saveBlob(fileName(base, 'txt'), new Blob([textFile(tx)], { type: 'text/plain' })), 600);
  return tx;
}
// fragments of a source: n at random (length seconds), or one from..to (seconds). Saves one video each, their texts and
// a list. o: the vertical settings (Settings → Video) overridden by opts. Returns { files, items } or { error }.
async function makeFragments(opts = {}) {
  if (fastJob || rec || capture) return { error: 'busy' };
  const src = fragmentSource(opts.source); if (src.error) return src;
  // settings, then what the call says: format, show, aspect, bands (true/false or { tagline, taglineMode, fullLine, vTitle }), rotate, codeMode, label, glitch, or an old layout name
  const pick = ['format', 'show', 'aspect', 'rotate', 'bleed', 'files', 'codeMode', 'label', 'glitch', 'layout', 'look', 'soulView', 'tagline', 'taglineMode'].reduce((a, k) => (opts[k] !== undefined ? { ...a, [k]: opts[k] } : a), {});
  // bands: true/false for both, or { bands, bandTop, bandBottom, tagline, … }; a call's choice wins over the settings
  const bandObj = typeof opts.bands === 'object' && opts.bands ? opts.bands : opts.bands !== undefined ? { bands: !!opts.bands } : {};
  const bands = 'bands' in bandObj ? { bandTop: bandObj.bands, bandBottom: bandObj.bands, ...bandObj } : bandObj;
  for (const k of ['bandTop', 'bandBottom']) if (opts[k] !== undefined) bands[k] = !!opts[k];
  const o = { ...fragmentOpts({ ...(store.get(FRAG_KEY, {}) || {}), ...pick, ...bands }), stageRatio: stageRatio() };
  const shape = shapeFor(src.sg), bpm = src.sg.meta.bpm.map(Number);
  let picks;
  if (opts.from !== undefined && opts.to !== undefined) { const f = fragmentBetween(shape, bpm, +opts.from, +opts.to); if (f.error) return f; picks = [f]; }
  else picks = pickFragments(shape, bpm, { n: Math.max(1, opts.n | 0 || 1), length: +opts.length || o.vLength, seed: `${src.seed}/${opts.seed ?? ''}` });
  if (src.cut) picks = picks.filter(x => x.end <= src.cut.cut + 1e-6);
  if (!picks.length) return { error: 'none' };
  const files = [], items = [];
  let last = null;
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i], n = nextFragment(), code = fragmentCode(src.key, p.start), label = fragmentLabel(code, n);
    // the tagline: the fixed one, or in random mode the fragment's own (the same for the same fragment)
    const tagline = o.bands ? (o.taglineMode === 'random' ? taglineFor(code) : o.tagline) : '';
    if (opts.onProgress) opts.onProgress(i, picks.length);
    const file = `${src.title} · fragment #${String(n).padStart(3, '0')}`;
    // the files chosen (#57): the video, the audio alone (the export format), then texts and the list below
    const want = k => o.files.includes(k), saved = [];
    let stop = false;
    if (want('video')) { const name = await exportVideoFast(src.sg, src.title, { songs: src.songs, frag: { start: p.start, end: p.end, label: o.label ? label : '', code, tagline, msgs: glitchMessages(code), o, file } }); if (name === 'cancelled') stop = true; else if (!name) return { error: 'render', files, items }; else saved.push(name); }
    if (!stop && want('audio')) { const name = await exportFast(src.sg, src.title, null, null, { frag: { start: p.start, end: p.end, file } }); if (name === 'cancelled') stop = true; else if (!name) return { error: 'render', files, items }; else saved.push(name); }
    if (stop) break;
    const name = saved[0] || file;
    store.set(FRAG_N, n + 1);
    // a session's fragment is named after the song playing at its start
    const info = textsInfo(src, 'fragment', { fragment: { label, start: p.start, end: p.end }, tagline, fullLine: o.fullLine, seed: `${src.seed}/${code}` });
    const at = info.songs.filter(x => x.start <= p.start + 1e-6).pop();
    const fInfo = { ...info, title: at ? at.title : info.title }, tx = want('texts') ? saveTexts(fInfo, file) : textsFor(fInfo);
    last = { tx, info: fInfo };
    files.push(...saved); items.push({ file: name, files: saved, label, start: +p.start.toFixed(3), end: +p.end.toFixed(3), from: clockOf(p.start), to: clockOf(p.end), title: tx.title });
  }
  if (items.length) {
    if (o.files.includes('list')) {
      const list = { source: typeof opts.source === 'object' ? 'recipe' : opts.source, title: src.title, seed: src.seed, format: o.format, show: o.show, aspect: o.aspect, rotate: o.rotate, items };
      setTimeout(() => saveBlob(fileName(`${src.title} · fragments`, 'json'), new Blob([JSON.stringify(list, null, 2) + '\n'], { type: 'application/json' })), 900);
    }
    toast(t('fragSaved', { n: items.length }));
    if (last && !opts.quiet && !opts.onTexts) showTexts(last.tx, () => last.info);
    if (last && opts.onTexts) opts.onTexts(last);
  }
  return { files, items };
}
// the texts of a source, without saving anything (the panel and agents)
function sourceTexts(source, draw = 0) { const src = fragmentSource(source); return src.error ? src : textsFor({ ...textsInfo(src, 'video'), draw }); }
// a texts box (#57): title and description to copy, edit and draw again; info(): the facts textsFor needs
function textsBox(el, tx, info, caption = '') {
  let draw = 0;
  el.innerHTML = `${caption ? `<p class="hint muted small" data-tx-cap>${esc(caption)}</p>` : ''}
    <label class="lbl">${esc(t('textsTitleLbl'))}<input data-tx-title data-no-knob></label>
    <label class="lbl">${esc(t('textsDescLbl'))}<textarea data-tx-desc rows="9" data-no-knob></textarea></label>
    <div class="tp-actions"><button class="btn" data-tx="copy-title">${esc(t('textsCopyTitle'))}</button><button class="btn" data-tx="copy-desc">${esc(t('textsCopyDesc'))}</button><button class="btn" data-tx="draw">${esc(t('textsDraw'))}</button></div>
    <div class="tx-fields">${['tags', 'hashtags', 'category'].map(k => `<label class="lbl tx-field">${esc(t(`texts:${k}`))}<span><input data-tx-${k} readonly data-no-knob><button class="chip" data-tx="copy-${k}">${esc(t('textsCopy'))}</button></span></label>`).join('')}</div>`;
  // the upload fields (#57): tags as a comma list, hashtags spaced, the category
  const fill = x => { el.querySelector('[data-tx-title]').value = x.title; el.querySelector('[data-tx-desc]').value = x.description;
    el.querySelector('[data-tx-tags]').value = (x.tags || []).join(', '); el.querySelector('[data-tx-hashtags]').value = (x.hashtags || []).join(' '); el.querySelector('[data-tx-category]').value = x.category || ''; };
  fill(tx);
  el.onclick = async e => {
    const b = e.target.closest('[data-tx]'); if (!b || b.dataset.tx === 'close') return;
    if (b.dataset.tx === 'draw') { draw++; fill(textsFor({ ...info(), draw })); return; }
    const v = el.querySelector(`[data-tx-${{ 'copy-title': 'title', 'copy-desc': 'desc' }[b.dataset.tx] || b.dataset.tx.slice(5)}]`).value;
    try { await navigator.clipboard.writeText(v); toast(t('textsCopied')); } catch (err) { toast(t('textsCopyFail')); }
  };
}
// the texts panel (#57): shown after a save, with copy and draw again
let textsPanel = null;
function showTexts(tx, info) {
  if (!tx) return;
  if (textsPanel) textsPanel.remove();
  const el = document.createElement('div');
  el.className = 'texts-panel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t('textsTitle'));
  el.innerHTML = `<div class="tp-head"><b>${esc(t('textsTitle'))}</b><button class="chip" data-tx-close aria-label="${esc(t('close'))}">✕</button></div><div data-tx-box></div>`;
  document.body.appendChild(el); textsPanel = el;
  textsBox(el.querySelector('[data-tx-box]'), tx, info);
  el.querySelector('[data-tx-close]').addEventListener('click', () => { el.remove(); textsPanel = null; });
}
// the fragments menu (#57): opened by any [data-frag="<song or session id>"] (or a recipe object); random (count, length,
// seed) or from–to; format, what to show, the visual's proportions, turned by 90°; a live preview of the composition
let fragMenu = null;
// the files a fragment saves, in a word or a list
const filesLabel = list => (list.length === F_FILES.length ? t('fragFilesAll') : list.map(k => t(`fragFile:${k}`)).join(' · '));
function openFragMenu(source, anchor) {
  if (fragMenu) { const same = fragMenu.source === source; closeFragMenu(); if (same) return; }
  const o = fragOpts(), el = document.createElement('div');
  el.className = 'frag-menu card'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t('fragTitle'));
  const sel = (id, list, cur, label) => `<select id="${id}" data-no-knob>${list.map(k => `<option value="${esc(k)}"${k === cur ? ' selected' : ''}>${esc(label(k))}</option>`).join('')}</select>`;
  const looks = ['song', 'random', ...PICK_LOOKS.map(l => l[0])], lookName = k => (k === 'song' || k === 'random' ? t(`fragPick:${k}`) : tx((PICK_LOOKS.find(l => l[0] === k) || [k, k])[1]));
  const views = ['song', 'random', ...SOUL_VIEWS], viewName = k => (k === 'song' || k === 'random' ? t(`fragPick:${k}`) : `${k.toUpperCase()} · ${SOUL_VIEW_NAMES[k]}`);
  const chk = (id, on, label) => `<label class="rx-opt"><input type="checkbox" id="${id}"${on ? ' checked' : ''}> <span>${esc(label)}</span></label>`;
  el.innerHTML = `<div class="tp-head"><b>${esc(t('fragTitle'))}</b><button class="chip" data-fm="close" aria-label="${esc(t('close'))}">✕</button></div>
    <div class="fm-body"><div class="fm-form">
    <label class="rx-opt"><input type="radio" name="fm-kind" value="random" checked> <span>${esc(t('fragRandom'))}</span>
      <input type="number" id="fm-n" min="1" max="20" value="3" aria-label="${esc(t('fragCount'))}" data-no-knob> × <input type="number" id="fm-len" min="5" max="180" value="${o.vLength}" aria-label="${esc(t('fragLength'))}" data-no-knob> s
      ${[15, 30, 60].map(x => `<button class="chip" data-fm-len="${x}">${x}</button>`).join('')}</label>
    <label class="rx-opt"><input type="radio" name="fm-kind" value="between"> <span>${esc(t('fragBetween'))}</span>
      <input id="fm-from" placeholder="1:20" aria-label="${esc(t('fragFrom'))}" data-no-knob size="6"> – <input id="fm-to" placeholder="1:50" aria-label="${esc(t('fragTo'))}" data-no-knob size="6"></label>
    <label class="rx-opt"><span>${esc(t('fragFormat'))}</span>${sel('fm-format', Object.keys(F_FORMATS), o.format, k => t(`fragFormat:${k}`))}</label>
    <label class="rx-opt"><span>${esc(t('fragShow'))}</span>${sel('fm-show', F_SHOWS, o.show, k => t(`fragShow:${k}`))}</label>
    <label class="rx-opt"><span>${esc(t('fragAspect'))}</span>${sel('fm-aspect', F_ASPECTS, o.aspect, k => t(`fragAspect:${k}`))}</label>
    <label class="rx-opt"><span>${esc(t('fragLook'))}</span>${sel('fm-look', looks, o.look, lookName)}</label>
    <label class="rx-opt"><span>${esc(t('fragSoulView'))}</span>${sel('fm-soulview', views, o.soulView, viewName)}</label>
    <div class="rx-opt">${chk('fm-band-top', o.bandTop, t('fragBandTop'))}${chk('fm-band-bottom', o.bandBottom, t('fragBandBottom'))}</div>
    <div class="rx-opt">${chk('fm-bleed', o.bleed, t('fragBleed'))}${chk('fm-rotate', o.rotate, t('fragRotate'))}</div>
    <details class="fm-more"><summary>${esc(t('fragMore'))}</summary>
      <label class="rx-opt"><span>${esc(t('fragCode'))}</span>${sel('fm-code', F_CODE, o.codeMode, k => t(`fragCode:${k}`))}</label>
      <div class="rx-opt"><span>${esc(t('setFragTagline'))}</span><input id="fm-tagline" value="${esc(o.tagline)}" maxlength="60" data-no-knob size="22" aria-label="${esc(t('setFragTagline'))}"><button class="dice" data-fm-die title="${esc(t('fragDie'))}" aria-label="${esc(t('fragDie'))}">${DICE}</button><button class="dice" data-fm-revert title="${esc(t('fragRevert'))}" aria-label="${esc(t('fragRevert'))}"${o.tagline === V_DEFAULTS.tagline ? ' hidden' : ''}>${REVERT}</button></div>
      <label class="rx-opt"><span>${esc(t('setFragFull'))}</span><input id="fm-full" value="${esc(o.fullLine)}" maxlength="60" placeholder="${esc(t('setFragFullHint'))}" data-no-knob size="22"></label>
      <div class="rx-opt">${chk('fm-title', o.vTitle, t('setFragTitle'))}${chk('fm-label', o.label, t('setFragLabel'))}${chk('fm-glitch', o.glitch, t('setFragGlitch'))}</div>
      <label class="rx-opt"><span>${esc(t('fragSeed'))}</span><input id="fm-seed" placeholder="${esc(t('fragSeedHint'))}" data-no-knob size="18"></label>
    </details>
    <details class="fm-files"><summary>${esc(t('fragFiles'))}: <span data-fm-files-sum>${esc(filesLabel(o.files))}</span></summary>
      <div class="fm-files-list">${F_FILES.map(k => `<label class="rx-opt"><input type="checkbox" data-fm-file="${k}"${o.files.includes(k) ? ' checked' : ''}> <span>${esc(t(`fragFile:${k}`))}</span></label>`).join('')}</div></details>
    <p class="hint muted small" data-fm-hint>${esc(t('fragHint', { n: String(nextFragment()).padStart(3, '0') }))}</p>
    <div class="tp-actions"><button class="btn primary" data-fm="go">${esc(t('fragGo'))}</button><span class="muted small" data-fm-status></span></div>
    </div><figure class="fm-prev"><canvas id="fm-preview" width="180" height="320" aria-label="${esc(t('vidPreview'))}"></canvas><figcaption class="hint muted small">${esc(t('fragPreviewHint'))}</figcaption></figure>
    <section class="fm-texts" aria-label="${esc(t('textsTitle'))}"><b class="small">${esc(t('textsTitle'))}</b><div data-fm-texts></div></section></div>`;
  (anchor.closest('.songbar, .pl-row, .set-card') || anchor).insertAdjacentElement('afterend', el);
  // what the form says now, saved as the settings so the preview, Settings and the next fragments agree
  const v = id => el.querySelector(id), form = () => ({ format: v('#fm-format').value, show: v('#fm-show').value, aspect: v('#fm-aspect').value, look: v('#fm-look').value, soulView: v('#fm-soulview').value,
    files: [...el.querySelectorAll('[data-fm-file]:checked')].map(x => x.dataset.fmFile), bandTop: v('#fm-band-top').checked, bandBottom: v('#fm-band-bottom').checked, bands: v('#fm-band-top').checked || v('#fm-band-bottom').checked, bleed: v('#fm-bleed').checked, rotate: v('#fm-rotate').checked, codeMode: v('#fm-code').value, tagline: v('#fm-tagline').value, taglineMode: 'fixed', fullLine: v('#fm-full').value, vTitle: v('#fm-title').checked, label: v('#fm-label').checked, glitch: v('#fm-glitch').checked });
  const remember = () => { const f = form(); for (const [k, x] of Object.entries(f)) setFragOpt(k, x); soul.force(previewView()); };
  // the preview shows the chosen soul view; the visual follows the stage (pick it there, or the arrows)
  const previewView = () => { const c = v('#fm-soulview').value; return c === 'random' ? SOUL_VIEWS[0] : SOUL_VIEWS.includes(c) ? c : null; };
  el.addEventListener('change', e => { remember(); if (e.target.dataset.fmFile) v('[data-fm-files-sum]').textContent = filesLabel(fragOpts().files); });
  el.addEventListener('input', e => { if (e.target.matches('#fm-tagline, #fm-full')) remember(); if (e.target.matches('#fm-tagline')) v('[data-fm-revert]').hidden = e.target.value === V_DEFAULTS.tagline; });
  v('#fm-look').addEventListener('change', () => { const c = v('#fm-look').value; if (PICK_LOOKS.some(l => l[0] === c)) setLook(c); });
  video.previewVertical(v('#fm-preview'), () => { const x = fragOpts(); return { ...x, size: fragmentSize(x), next: nextFragment() }; }, c => (song && song.meta ? song.meta.sectionAt(c) : -1));
  soul.force(previewView());
  // the texts beside the form: the source's, then the last fragment's
  const src0 = fragmentSource(source);
  if (!src0.error) textsBox(v('[data-fm-texts]'), textsFor(textsInfo(src0, 'video')), () => textsInfo(src0, 'video'), t('fragTextsSource'));
  fragMenu = { el, source };
  const status = x => { v('[data-fm-status]').textContent = x; };
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b || b.closest('[data-fm-texts]')) return;
    if (b.dataset.fmLen) { v('#fm-len').value = b.dataset.fmLen; v('input[value="random"]').checked = true; return; }
    // the die puts another phrase in the tagline, the arrow brings the default back
    if (b.dataset.fmDie !== undefined || b.dataset.fmRevert !== undefined) { v('#fm-tagline').value = b.dataset.fmDie !== undefined ? nextTagline(v('#fm-tagline').value) : V_DEFAULTS.tagline; v('[data-fm-revert]').hidden = v('#fm-tagline').value === V_DEFAULTS.tagline; remember(); return; }
    if (b.dataset.fm === 'close') { closeFragMenu(); return; }
    if (b.dataset.fm !== 'go') return;
    if (fastJob) { fastJob.cancel(); return; }
    remember();
    const kind = el.querySelector('input[name="fm-kind"]:checked').value;
    const opts = { source, seed: v('#fm-seed').value.trim(), onProgress: (i, n) => status(t('fragProgress', { i: i + 1, n })),
      onTexts: last => { if (fragMenu && fragMenu.el === el) textsBox(v('[data-fm-texts]'), last.tx, () => last.info, t('fragTextsLast', { label: last.info.fragment.label })); } };
    if (kind === 'between') {
      const from = parseTime(v('#fm-from').value), to = parseTime(v('#fm-to').value);
      if (Number.isNaN(from) || Number.isNaN(to)) { toast(t('fragBadTime')); return; }
      Object.assign(opts, { from, to });
    } else Object.assign(opts, { n: +v('#fm-n').value || 1, length: +v('#fm-len').value || o.vLength });
    b.textContent = t('fragCancel');
    const r = await makeFragments(opts);
    b.textContent = t('fragGo');
    soul.force(previewView());
    if (r.error) { status(''); toast(t(`fragErr:${r.error}`)); return; }
    status(t('fragDone', { n: r.items.length }));
    v('[data-fm-hint]').textContent = t('fragHint', { n: String(nextFragment()).padStart(3, '0') });
    if (opts.n && r.items.length < opts.n) toast(t('fragFewer', { n: r.items.length }));
  });
}
function closeFragMenu() { if (!fragMenu) return; fragMenu.el.remove(); fragMenu = null; video.previewVertical(null); soul.force(null); }
document.addEventListener('click', e => { const b = e.target.closest('[data-frag]'); if (b) { e.stopPropagation(); openFragMenu(b.dataset.frag, b); } }, true);
globalThis.codingMiskClips = {
  fragments: opts => makeFragments(opts),
  texts: ({ source, draw = 0 } = {}) => sourceTexts(source, draw),
  sources: () => ({ songs: cards.filter(c => c.tr.kind === 'composed').map(c => ({ id: c.tr.id, title: c.tr.title })), sessions: playlists.sessions() }),
  get job() { return fastJob ? { progress: fastJob.progress, phase: fastJob.phase } : null; },
  next: () => nextFragment(),
};
// the playlist row's export of a session (#8): audio rendered fast as one joined song, or a video (the Export display)
async function exportSession(id) {
  const s = playlists.session(id); if (!s || !radio) return;
  if (fastJob) { if (fastJob.id === id) fastJob.cancel(); return; }
  if (sessionVid) return recordSession(id);
  const asVideo = outKind() === 'video';
  if (exportSpeed() === 'fast' && (!asVideo || video.opts().layout !== 'tab')) {
    try {
      const items = s.frozen || radio.rebuild(s.recipe, s.count);
      const sg = joinItems(items, s.recipe.seed, s.recipe.options, id);
      const songs = items.map(x => ({ song: x.song, title: x.song.title, artist: x.artist || '' }));
      if (await (asVideo ? exportVideoFast(sg, s.title, { songs, seed: String(s.recipe.seed) }) : exportFast(sg, s.title, null, null, { songs, seed: String(s.recipe.seed) }))) return;
    } catch (e) { console.warn('[session export]', e); }
    toast(t('exportFastFailed'));
  }
  return recordSession(id, asVideo);
}
$('#tr-export').addEventListener('click', () => exportTrack(compiled, 'track', outKind() === 'video'));
$('#tr-out').innerHTML = outKindButton();
// Continue in radio (#29): the song in Compose is song 0 of a new radio session, from the bar it is at
const continuable = sg => (sg.tracks || []).some(x => x.type !== 'code' && x.type !== 'voice');
function continueInRadio(sg, from = 0) {
  if (!radio || !continuable(sg)) { toast(t('steerWhy:lead')); return; }
  queue = null;
  const { kind, ...plain } = clone(sg);
  radio.continueSong(absoluteClips(plain), from, leadHow({ ...sg, kind: 'composed' }));
  showTab('radio');
}
// how a song plays here, for song 0 of the radio (radio-profiles D2): growing (Crescendo or Live coder) with its profile
// and the controls it has (its configuration, or its trial), so the radio grows it the same; else in blocks, with
// `declared` when its profile or the Live build switch put it there (an undeclared song may take the radio's forced one)
function leadHow(tr) {
  const lv = liveOf(tr);
  if (lv.on && lv.style === 'crescendo' && crescendoOf(tr)) return { profile: controlsProfile(lv.ctl), controls: clone(lv.ctl) };
  return { declared: !!(songProfile(tr) || tr.config || trialOf(tr) || lv.on) };
}
$('#tr-radio').addEventListener('click', () => { const s = sched(); continueInRadio(T, mode === 'track' && isPlaying() && s ? Math.max(0, Math.floor(s.now())) : 0); });

// ---------- arrangiatore: sezioni × tracce ----------
const starts = () => { const out = []; let p = 0; for (const s of T.sections) { out.push(p); p += s.bars; } return out; };
const secIndex = name => T.sections.findIndex(s => s.name === name);
const isWhole = c => c.section !== undefined && c.start === undefined && c.bars === undefined;
// clip che copre esattamente la sezione j (le celle della griglia)
const wholeClip = (tr, j) => tr.clips.find(c => isWhole(c) && c.section === T.sections[j].name);
// posizione assoluta di ogni clip, in battute
function spans(tr) {
  const st = starts();
  return tr.clips.map(c => {
    let s = c.start, b = c.bars;
    if (c.section !== undefined) { const j = secIndex(c.section); if (j < 0) return null; s = s ?? st[j]; b = b ?? (st[j] + T.sections[j].bars - s); }
    return { c, s, e: s + b };
  }).filter(Boolean);
}
// contenuto di una cella: un clip intero, oppure clip parziali ("personalizzati", si modificano nella timeline)
function cellOf(tr, j) {
  const w = wholeClip(tr, j); if (w) return { clip: w };
  const a = starts()[j], b = a + T.sections[j].bars, parts = spans(tr).filter(x => x.s < b && a < x.e);
  return parts.length ? { parts } : null;
}
const curTrack = () => T.tracks[tk];
const baseSettings = type => type === 'code' ? { visual: 'fx' } : type === 'voice' || type === 'spoken' ? { ...VOICE_DEFAULT } : Object.fromEntries(SETTING_FIELDS[type].map(k => [k, DEFAULT[type][k]]));
// impostazioni che suonano nella sezione selezionata: traccia + eventuale modifica solo per questa sezione
// clip su cui agiscono pattern e impostazioni "solo qui": nella timeline quello scelto, altrimenti quello della sezione
const focusClip = tr => (arrMode === 'timeline' && tr === curTrack() && selClip !== null && tr.clips[selClip]) || wholeClip(tr, sel);
const eff = tr => { const c = focusClip(tr); return { ...baseSettings(tr.type), ...tr.settings, ...((c && c.set) || {}) }; };
const patOf = tr => { const c = focusClip(tr); const k = editPat && tr === curTrack() && tr.patterns[editPat] ? editPat : c && tr.patterns[c.pattern] ? c.pattern : Object.keys(tr.patterns)[0]; return k; };
const secFull = () => ({ ...SECTION_DEFAULTS, ...SEC() });
// stato v1 equivalente al pattern in modifica (per i passi del preset e le note)
const patState = tr => clipState(secFull(), tr, { pattern: patOf(tr) });
const nextKey = tr => { for (let i = 0; i < 26; i++) { const k = String.fromCharCode(65 + i); if (!tr.patterns[k]) return k; } return 'P' + Date.now() % 1000; };
const DEFAULT_PATTERN = {
  drums: () => ({ rows: Object.fromEntries(Object.entries(GROOVES.trance[1]).filter(([, v]) => v.includes('x'))) }),
  bass: () => ({ preset: 'rolling' }), guitar: () => ({ preset: 'power8' }), arp: () => ({ preset: 'su', speed: '16' }),
  hook: () => ({ preset: 'richiamo' }), pad: () => ({ preset: 'pad' }), texture: () => ({ rhythm: 'bar' }), riser: () => ({}), voice: () => ({}), spoken: () => ({ way: 'refrain', text: 'vocab:night', every: 4 }),
  code: () => ({ code: 'note("a2 ~ c3 [e3 a3]").s("triangle").lpf(1800).gain(.4)' }),
};
const ACT_IDS = { drums: 'kick,snare,hats', bass: 'bass', guitar: 'guitar', arp: 'arp', hook: 'hook', pad: 'pad', texture: 'fx', riser: 'riser', voice: 'fx', spoken: 'fx' };
const trackLabel = tr => tr.name || t(tr.type) || tr.id;

function selectScene(i) {
  if (i < 0 || i >= T.sections.length || i === sel) return;
  sel = i; editPat = null;
  if (!isPlaying()) ended = null;
  saveDraft(); renderArranger(); renderTrackPanel();
}
function selectTrack(i) {
  if (i < 0 || i >= T.tracks.length) return;
  if (i !== tk) { tk = i; editPat = null; selClip = null; }
  saveDraft(); renderArranger(); renderTrackPanel(); highlightTrack();
}
function renderTrackPick() {
  const list = composedTracks();
  if (!list.some(tr => tr.id === T.id)) list.push({ ...T, kind: 'composed' });
  $('#track-pick').innerHTML = list.map(tr => `<option value="${esc(tr.id)}">${esc(tr.id === T.id ? T.title : tr.title)}${!isBuiltin(tr.id) ? ` · ${t('mine')}` : ''}</option>`).join('');
  $('#track-pick').value = T.id;
}
function renderArranger() {
  const total = T.sections.reduce((a, s) => a + s.bars, 0);
  $('#arranger').classList.toggle('tl-mode', arrMode === 'timeline');
  $$('[data-arr-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.arrMode === arrMode));
  $('#arr-mode-hint').textContent = arrMode === 'timeline' ? t('timelineHint') : '';
  const own = hasBuild(T), lt = $('#live-toggle'), lv = liveOf(T), crescendo = lv.on && lv.style === 'crescendo';
  lt.setAttribute('aria-pressed', own || lv.on); lt.disabled = own && !crescendo; lt.title = own && !crescendo ? t('liveOwn') : t('liveHint');
  const C = lv.ctl, on = own || lv.on;
  // the profiles as presets on top of the panel; "custom" when a control below was changed by hand
  $('#live-profile').innerHTML = PROFILE_IDS.map(id => `<button class="chip" role="radio" data-profile="${id}" aria-checked="${id === C.id}" aria-pressed="${id === C.id}" title="${esc(t(`profileHint:${id}`))}">${esc(t(`profile:${id}`))}</button>`).join('');
  $('#live-custom').hidden = !C.custom;
  $('#live-profile').title = (songProfile(T) || T.config) && !trialOf(T) ? t('profileDeclared') : t('profileHint');
  $('#live-growth').value = C.growth; $('#live-duration').value = C.duration; $('#live-duration').disabled = C.growth !== 'natural';
  renderShape(C, on && crescendo);
  $('#live-style').value = lv.style; $('#live-style').disabled = !on;
  // the Voices group (voice-placement): always shown; a narrator control that cannot apply is disabled and says why:
  // the song does not build live, Narrated growth outside Crescendo, the narrator off (profile-options)
  const narOff = C.narrator === false, why = !on ? 'narratorNeedsLive' : null;
  // (voice-full-controls D15: the narrator on is a switch in the title row of its block; off greys the block)
  $('#live-narrator').setAttribute('aria-pressed', C.narrator !== false);
  $('#live-narrator .vs-txt').textContent = t(C.narrator !== false ? 'switchOn' : 'switchOff');
  if (!$('#live-narrator .ico')) $('#live-narrator .vs-lamp').insertAdjacentHTML('afterend', POWER);
  $('#live-narrator').disabled = !on; $('#live-narrator').title = why ? t(why) : t('voiceSwitchTip', { voice: t('narratorLbl') });
  $('#live-narrator-row').classList.toggle('off', !on || narOff);
  const nt = voiceOf(T);
  $('#live-narrator-sub').textContent = nt ? `${t('narratorLbl')} · ${trackLabel(nt)}` : t('narratorLbl');
  $('#live-narrator-style').value = C.narratorStyle || 'auto'; $('#live-narrator-style').disabled = !on || narOff;
  $('#live-narrator-style').title = t(why || (narOff ? 'narratorStyleOff' : 'narratorStyleHint'));
  $('#live-narrated').hidden = false; $('#live-narrated').setAttribute('aria-pressed', C.narrated);
  $('#live-narrated').disabled = !crescendo || narOff; $('#live-narrated').title = t(why || (!crescendo ? 'narratedNeedsCrescendo' : narOff ? 'liveNarratedOff' : 'liveNarratedHint'));
  renderSongVoice();
  renderNarratorParts(why ? t(why) : narOff ? t('voiceOffTip', { voice: t('narratorLbl') }) : '');
  // the live build options: a panel under the "Live build" button; with the Live build off it keeps the code options
  // (comments, technical functions, title, lit notes, line breaks: profile-options) under the title "Code"
  lt.setAttribute('aria-expanded', on);
  $('#live-legend').textContent = t(on ? 'liveBuild' : 'codeOptsLbl');
  $$('[data-live-only="on"]').forEach(el => { el.hidden = !on; });
  $$('[data-live-only="crescendo"]').forEach(el => { el.hidden = !crescendo; });
  // the growth shape belongs to the natural growth (Live coder)
  $('#live-shape').hidden = !crescendo || C.growth !== 'natural';
  $('#live-code').value = C.view; $('#live-gen').value = C.gen; $('#live-comments').value = C.comments; $('#live-fns').value = C.functions;
  for (const k of ['tracks', 'notes', 'steps', 'voice']) $(`#live-c-${k}`).setAttribute('aria-pressed', C[k] !== false);
  for (const k of FUNCTION_OPTIONS) $(`#live-f-${k}`).setAttribute('aria-pressed', !!C[k]);
  $('#live-title').setAttribute('aria-pressed', C.title); $('#live-hl').setAttribute('aria-pressed', C.highlights); $('#live-wrap').setAttribute('aria-pressed', C.wrap); $('#live-human').setAttribute('aria-pressed', C.typist === 'human'); $('#live-mistakes').setAttribute('aria-pressed', C.mistakes !== 'off'); $('#live-mistakes').disabled = C.typist !== 'human';
  if (arrMode === 'timeline') renderTimeline(total); else renderCells(total);
  renderSectionPanel(total);
  renderRuler();
  renderPrelude();
}
// the growth shape of the song in Compose (growth-shapes): the three choices, "automatic" showing what the song draws,
// the values it cannot play disabled, and the shape that plays with where each part comes from
function renderShape(C, building) {
  const T2 = { ...T, kind: 'composed' }, f = shapeFacts(T2, SHAPE_STYLES);
  // (the song held as written while it grows away at start: the shape drawn, until the growth comes back)
  const c = building && C.growth === 'natural' && !compiled.pending ? crescendoOf(T2) : null;
  const shape = (c && c.crescendo && c.crescendo.shape) || resolveShape(T2, { user: { opening: C.opening, pace: C.pace, development: C.development }, styles: SHAPE_STYLES });
  // (automatic parts: what the build plays, a calmer development or pace when the drawn one would rush the typing)
  const drawn = resolveShape(T2, { styles: SHAPE_STYLES }), auto = Object.fromEntries(['opening', 'pace', 'development'].map(p => [p, c && c.crescendo && c.crescendo.shape && (C[p] || 'auto') === 'auto' ? c.crescendo.shape[p] : drawn[p]]));
  const fill = (part, list) => {
    const sel = $(`#live-${part}`);
    sel.innerHTML = [`<option value="auto">${esc(t('shapeAutoIs', { v: t(`${part}:${auto[part]}`) }))}</option>`,
      ...list.map(v => { const ok = canPlay(part, v, f); return `<option value="${v}"${ok ? '' : ' disabled'}${ok ? '' : ` title="${esc(t('shapeCannot'))}"`}>${esc(t(`${part}:${v}`))}</option>`; })].join('');
    sel.value = C[part] || 'auto';
  };
  fill('opening', OPENINGS); fill('pace', PACES); fill('development', DEVELOPMENTS);
  const from = p => t(`shapeFrom:${(shape.from || {})[p] || 'seed'}`);
  $('#live-shape-now').textContent = t('shapeNow', { v: ['opening', 'pace', 'development'].map(p => t(`${p}:${shape[p]}`)).join(' · ') });
  $('#live-shape-now').title = ['opening', 'pace', 'development'].map(p => `${t(`${p}Lbl`)}: ${t(`${p}:${shape[p]}`)} (${from(p)})`).join('\n');
}
// vista a sezioni: una cella per traccia e sezione
function renderCells(total) {
  $('#arr-strip').style.minWidth = $('#arr-grid').style.minWidth = '';
  // sezioni e tracce condividono le stesse colonne: larghezza proporzionale alle battute
  const cols = `var(--trk-col) ${T.sections.map(s => `minmax(54px, ${s.bars}fr)`).join(' ')}`;
  $('#arr-strip').style.gridTemplateColumns = cols;
  $('#arr-strip').innerHTML = `<span class="arr-corner">${t('sections')}</span>` + T.sections.map((s, i) => `<button class="arr-scene-btn${i > 0 && s.fade ? ' fade' : ''}" data-scene-i="${i}" aria-current="${i === sel}">
      <b>${esc(s.name)}</b><span>${s.bars} · ${s.bpmEnd ? `${s.bpm}→${s.bpmEnd}` : s.bpm ?? 138}</span></button>`).join('') + '<span class="head"></span>';
  const solo = T.tracks.some(tr => tr.solo);
  $('#arr-grid').innerHTML = T.tracks.map((tr, i) => `<div class="trk-row${tr.mute || (solo && !tr.solo) ? ' silent' : ''}" style="grid-template-columns:${cols}" aria-current="${i === tk}">
      <div class="trk-head" data-act-ids="${ACT_IDS[tr.type] || esc((tr.settings && tr.settings.visual) || 'fx')}">
        <button class="trk-name" data-trk="${i}" title="${esc(tr.type)}"><span class="trk-type">${esc(TYPE_ICON[tr.type] || '·')}</span>${esc(trackLabel(tr))}</button>
        <button class="mini" data-mute="${i}" aria-pressed="${!!tr.mute}" title="${esc(t('mute'))}">M</button><button class="mini" data-solo="${i}" aria-pressed="${!!tr.solo}" title="${esc(t('solo'))}">S</button>
      </div>${T.sections.map((s, j) => {
        // a voice track: how many comments it speaks in the section
        if (tr.type === 'voice') {
          const a = sceneStart(j), lines = compiled.build ? buildSteps(compiled.build).filter(x => x.say && x.at >= a && x.at < a + s.bars && voiceOf(T, x) === tr) : [];
          return `<button class="trk-cell voice${lines.length ? ' on' : ''}" data-cell="${i}:${j}" aria-current="${i === tk && j === sel}" title="${esc(lines.map(x => `${t('liveMark', { n: x.at + 1 })} · ${sayText(x.say, getLang())}`).join('\n') || `${trackLabel(tr)} · ${s.name}`)}">${lines.length ? `❝ ${lines.length}` : ''}</button>`;
        }
        const c = cellOf(tr, j);
        const cls = !c ? '' : c.clip ? ' on' : ' custom';
        const label = !c ? '' : c.clip ? esc(c.clip.pattern) + (c.clip.set ? '*' : '') : '≈';
        return `<button class="trk-cell${cls}" data-cell="${i}:${j}" aria-current="${i === tk && j === sel}" title="${esc(`${trackLabel(tr)} · ${s.name}`)}">${label}</button>`;
      }).join('')}</div>`).join('') + '<span class="head"></span>';
}
// vista timeline: clip liberi su una corsia continua, larghezza proporzionale alle battute
const clipLabel = c => esc(c.pattern) + (c.set ? '*' : '');
// live build on the timeline: where the steps keep a track silent (hatched), and the bars where a step changes it
function liveLayer(bmap, tr, total) {
  const m = bmap && bmap[tr.id]; if (!m) return '';
  return m.off.map(([a, b]) => `<i class="build-off" style="left:${a / total * 100}%;width:${(b - a) / total * 100}%" title="${esc(t('liveOff'))}"></i>`).join('')
    + m.marks.map(k => `<i class="build-mark" style="left:${k.at / total * 100}%" title="${esc(`${t('liveMark', { n: k.at + 1 })} · ${k.action}${k.say ? ` · ${sayText(k.say, getLang())}` : ''}`)}"></i>`).join('');
}
function renderTimeline(total) {
  const st = starts(), minW = `calc(var(--trk-col) + ${total * 10}px)`;
  $('#arr-strip').style.gridTemplateColumns = `var(--trk-col) ${T.sections.map(s => `minmax(0, ${s.bars}fr)`).join(' ')}`;
  $('#arr-strip').style.minWidth = $('#arr-grid').style.minWidth = minW;
  $('#arr-strip').innerHTML = `<span class="arr-corner">${t('sections')}</span>` + T.sections.map((s, i) => `<button class="arr-scene-btn${i > 0 && s.fade ? ' fade' : ''}" data-scene-i="${i}" aria-current="${i === sel}">
      <b>${esc(s.name)}</b><span>${s.bars} · ${s.bpmEnd ? `${s.bpm}→${s.bpmEnd}` : s.bpm ?? 138}</span></button>`).join('') + '<span class="head"></span>';
  const solo = T.tracks.some(tr => tr.solo), bmap = compiled.build ? shownBuildMap(total) : null;
  const lines = st.slice(1).map(b => `<i class="sec-line" style="left:${b / total * 100}%"></i>`).join('');
  $('#arr-grid').innerHTML = T.tracks.map((tr, i) => `<div class="trk-row${tr.mute || (solo && !tr.solo) ? ' silent' : ''}" style="grid-template-columns:var(--trk-col) minmax(0, 1fr)" aria-current="${i === tk}">
      <div class="trk-head" data-act-ids="${ACT_IDS[tr.type] || esc((tr.settings && tr.settings.visual) || 'fx')}">
        <button class="trk-name" data-trk="${i}" title="${esc(tr.type)}"><span class="trk-type">${esc(TYPE_ICON[tr.type] || '·')}</span>${esc(trackLabel(tr))}</button>
        <button class="mini" data-mute="${i}" aria-pressed="${!!tr.mute}" title="${esc(t('mute'))}">M</button><button class="mini" data-solo="${i}" aria-pressed="${!!tr.solo}" title="${esc(t('solo'))}">S</button>
      </div>
      <div class="trk-lane" data-lane="${i}" style="--bars:${total}" title="${esc(t('laneAdd'))}">${lines}${liveLayer(bmap, tr, total)}${spans(tr).map(({ c, s: a, e: b }) => {
        const k = tr.clips.indexOf(c);
        return `<button class="clip${isWhole(c) ? '' : ' free'}" data-clip="${i}:${k}" aria-current="${i === tk && k === selClip}" style="left:${a / total * 100}%;width:${(b - a) / total * 100}%" aria-label="${esc(`${trackLabel(tr)} · ${t('cBars', { from: a + 1, to: b })} · ${t('cPattern', { p: c.pattern })}`)}">${clipLabel(c)}<span class="clip-grip" data-grip aria-hidden="true"></span></button>`;
      }).join('')}</div></div>`).join('') + '<span class="head"></span>';
}
function renderSectionPanel(total) {
  const sc = SEC();
  syncSectionFields();
  if (document.activeElement !== $('#track-title')) $('#track-title').value = T.title;
  if (document.activeElement !== $('#sc-name')) $('#sc-name').value = sc.name;
  if (document.activeElement !== $('#sc-bars')) $('#sc-bars').value = sc.bars;
  $('#sc-fade').value = String(sel === 0 ? 0 : sc.fade || 0);
  $('#sc-fade').disabled = sel === 0;
  $('#sc-crash').checked = !!sc.crash; $('#sc-breath').checked = !!sc.breath; $('#sc-fill').checked = !!sc.fill;
  $('#sc-left').disabled = sel === 0; $('#sc-right').disabled = sel === T.sections.length - 1; $('#sc-del').disabled = T.sections.length === 1;
  $('#dirty').textContent = dirty ? t('unsaved') : '';
  const builtin = isBuiltin(T.id), overridden = user.tracks.some(u => u.id === T.id);
  // a built-in song: ↺ Original song (notes, tracks and configuration, its trial too); one of the user's: Delete song.
  // Disabled (aria-disabled, so the tooltip still shows) when the song itself is as written: a configuration trial
  // alone is undone by ↺ Original configuration
  if (builtin) $('#tr-del').innerHTML = `${RESET_CONFIG}<span>${esc(t('songOrig'))}</span>`; else $('#tr-del').textContent = t('deleteTrack');
  $('#tr-del').title = builtin ? t('restoreOrigTip') : '';
  $('#tr-del').classList.toggle('cfg-reset', builtin);
  $('#tr-del').disabled = false;
  $('#tr-del').setAttribute('aria-disabled', String(builtin && !overridden && !dirty));
  renderTrialMark();
  $('#arr-total').textContent = t('arrTotal', { scenes: T.sections.length, bars: total, time: clock(compiled.meta.seconds) });
  $('#sc-loop').checked = loopIdx >= 0 && mode === 'track';
  renderTrackPick();
}
const TYPE_ICON = { drums: '◉', bass: '▁', guitar: '⚡', arp: '⋰', hook: '♪', pad: '▒', texture: '∿', riser: '↗', code: '{}', voice: '❝', spoken: '❞' };

// clic sulla griglia: nome traccia, mute, solo, cella (seleziona sezione e traccia; se suona salta lì)
$('#arr-grid').addEventListener('click', e => {
  const m = e.target.closest('[data-mute]'), s = e.target.closest('[data-solo]');
  if (m) { const tr = T.tracks[+m.dataset.mute]; tr.mute = !tr.mute || undefined; changed(); return; }
  if (s) { const tr = T.tracks[+s.dataset.solo]; tr.solo = !tr.solo || undefined; changed(); return; }
  const n = e.target.closest('[data-trk]');
  if (n) return selectTrack(+n.dataset.trk);
  const c = e.target.closest('[data-cell]'); if (!c) return;
  const [i, j] = c.dataset.cell.split(':').map(Number);
  if (i !== tk) { tk = i; editPat = null; }
  if (isPlaying() && mode === 'track' && j !== sel) { playSong(compiled, sceneStart(j), 'track'); }
  sel = j; editPat = null; saveDraft(); renderArranger(); renderTrackPanel(); highlightTrack();
});
// ---------- timeline: crea, sposta e allunga i clip (si fermano sui clip vicini) ----------
const songBars = () => T.sections.reduce((a, s) => a + s.bars, 0);
// the live build's silent spans and step marks in the arranger's bars (a Crescendo growth is left out)
function shownBuildMap(total) {
  const g = growBars(), map = buildMap(compiled.build, compiled.meta.bars);
  if (!g) return buildMap(compiled.build, total);
  for (const m of Object.values(map)) {
    m.off = m.off.map(([a, b]) => [Math.max(0, a - g), Math.min(total, b - g)]).filter(([a, b]) => b > a);
    m.marks = m.marks.filter(x => x.at >= g && x.at - g < total).map(x => ({ ...x, at: x.at - g }));
  }
  return map;
}
const spanOf = (tr, c) => spans(tr).find(x => x.c === c);
// un clip spostato o allungato smette di seguire la sua sezione e diventa a battute fisse
const toAbs = (tr, c) => { const sp = spanOf(tr, c); delete c.section; c.start = sp.s; c.bars = sp.e - sp.s; return c; };
function bounds(tr, c) {
  const me = spanOf(tr, c), others = spans(tr).filter(x => x.c !== c);
  return { lo: Math.max(0, ...others.filter(x => x.e <= me.s).map(x => x.e)), hi: Math.min(songBars(), ...others.filter(x => x.s >= me.e).map(x => x.s)) };
}
function selectClip(i, k) {
  tk = i; selClip = k; editPat = null;
  const sp = spanOf(T.tracks[i], T.tracks[i].clips[k]);
  if (sp) { const st = starts(); let j = 0; while (j + 1 < st.length && st[j + 1] <= sp.s) j++; sel = j; }
  saveDraft(); renderArranger(); renderTrackPanel(); highlightTrack();
}
function setClipSpan(tr, c, start, bars) {
  toAbs(tr, c);
  const bd = bounds(tr, c);
  start = Math.max(bd.lo, Math.min(start, bd.hi - 1));
  bars = Math.max(1, Math.min(bars, bd.hi - start));
  c.start = start; c.bars = bars;
}
let drag = null;
$('#arr-grid').addEventListener('pointerdown', e => {
  if (arrMode !== 'timeline' || e.button !== 0) return;
  const lane = e.target.closest('.trk-lane'); if (!lane) return;
  const i = +lane.dataset.lane, tr = T.tracks[i], rect = lane.getBoundingClientRect(), total = songBars();
  // a voice track has no clips: it speaks on the steps of the live build
  if (tr.type === 'voice') return;
  const barAt = x => (x - rect.left) / rect.width * total;
  const clipEl = e.target.closest('[data-clip]');
  if (!clipEl) {
    // clic su una zona vuota: nuovo clip di 4 battute (o fino al clip successivo) col pattern in modifica
    const b = Math.max(0, Math.min(total - 1, Math.floor(barAt(e.clientX)))), all = spans(tr);
    if (all.some(x => x.s <= b && b < x.e)) return;
    const next = Math.min(total, ...all.filter(x => x.s > b).map(x => x.s));
    const key = tk === i && editPat && tr.patterns[editPat] ? editPat : Object.keys(tr.patterns)[0];
    if (!key) return;
    tr.clips.push({ start: b, bars: Math.min(4, next - b), pattern: key });
    changed(); selectClip(i, tr.clips.length - 1); return;
  }
  const k = +clipEl.dataset.clip.split(':')[1], c = tr.clips[k], sp = spanOf(tr, c);
  drag = { i, k, c, el: clipEl, total, barAt, bd: bounds(tr, c), s: sp.s, e: sp.e, ns: sp.s, ne: sp.e, x0: e.clientX, moved: false,
    mode: e.target.closest('[data-grip]') ? 'resize' : 'move', grab: barAt(e.clientX) - sp.s };
  clipEl.setPointerCapture(e.pointerId); e.preventDefault();
});
$('#arr-grid').addEventListener('pointermove', e => {
  if (!drag) return;
  if (Math.abs(e.clientX - drag.x0) > 3) drag.moved = true;
  if (!drag.moved) return;
  const b = drag.barAt(e.clientX), len = drag.e - drag.s;
  if (drag.mode === 'move') { drag.ns = Math.max(drag.bd.lo, Math.min(drag.bd.hi - len, Math.round(b - drag.grab))); drag.ne = drag.ns + len; }
  else { drag.ns = drag.s; drag.ne = Math.max(drag.s + 1, Math.min(drag.bd.hi, Math.round(b))); }
  drag.el.style.left = `${drag.ns / drag.total * 100}%`; drag.el.style.width = `${(drag.ne - drag.ns) / drag.total * 100}%`;
});
$('#arr-grid').addEventListener('pointerup', () => {
  if (!drag) return;
  const d = drag; drag = null;
  const tr = T.tracks[d.i];
  if (d.moved && (d.ns !== d.s || d.ne !== d.e)) { toAbs(tr, d.c); d.c.start = d.ns; d.c.bars = d.ne - d.ns; changed(); }
  selectClip(d.i, d.k);
});
// tastiera sul clip scelto: frecce spostano di una battuta, Maiusc + frecce allungano o accorciano, Canc lo toglie
$('#arr-grid').addEventListener('keydown', e => {
  const el = e.target.closest('[data-clip]'); if (!el || arrMode !== 'timeline') return;
  const [i, k] = el.dataset.clip.split(':').map(Number), tr = T.tracks[i], c = tr.clips[k], sp = spanOf(tr, c);
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); tr.clips.splice(k, 1); selClip = null; changed(); renderTrackPanel(); return; }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  const d = e.key === 'ArrowLeft' ? -1 : 1;
  if (e.shiftKey) setClipSpan(tr, c, sp.s, sp.e - sp.s + d); else setClipSpan(tr, c, sp.s + d, sp.e - sp.s);
  changed(); selectClip(i, k);
  const again = $(`[data-clip="${i}:${k}"]`); if (again) again.focus();
});
// pin: fix a value against the live build steps, or let the steps change it again
$('#track-panel').addEventListener('click', e => {
  const b = e.target.closest('[data-pin]'); if (!b) return;
  const host = b.closest('[data-ptrk]'), tr = host && T.tracks[+host.dataset.ptrk]; if (!tr) return;
  const k = b.dataset.pin, on = (tr.pinned || []).includes(k);
  tr.pinned = on ? tr.pinned.filter(x => x !== k) : [...(tr.pinned || []), k];
  if (!tr.pinned.length) delete tr.pinned;
  changed(); syncTrackPanel();
});
// the Compose controls change the open song only, as a trial (song-own-settings): never another song, never the saved one
// (a change that needs a growth: the choice shows at once and the song grows away, growth-in-background; while the song
// plays, it goes on until the grown song takes over at the same bar)
function liveChanged() {
  composeCompiled();
  if (isPlaying() && mode === 'track') { if (!compiled.pending) playSong(compiled, Math.min(sched().now(), compiled.meta.bars - 1), 'track'); }
  else if (ed && mode === 'track') ed.setCode(compiled.code);
  renderArranger(); if (!$('#tab-brani').hidden) renderSongs();
  wakeGrowWait();
}
// a profile picked: its controls as they are (the changes made by hand go), with the Live build on
$('#live-profile').addEventListener('click', e => {
  const b = e.target.closest('[data-profile]'); if (!b) return;
  const id = PROFILES[b.dataset.profile] ? b.dataset.profile : 'classic';
  tryConfig({ profile: id, live: true, options: {} });
  liveChanged();
});
// the build style: between Classic and Crescendo it picks the profile, as before profiles; in another profile it is
// a change by hand
$('#live-style').addEventListener('change', e => {
  const v = e.target.value === 'crescendo' ? 'crescendo' : 'blocks', c = cfgOf(T);
  if (c.profile === 'classic' || c.profile === 'crescendo') {
    const id = v === 'crescendo' ? 'crescendo' : 'classic', options = cleanOverrides(c.options, PROFILES[id]);
    delete options.build;
    tryConfig({ profile: id, live: true, options });
  } else tryConfig({ ...c, live: true, options: cleanOverrides({ ...c.options, build: v }, PROFILES[c.profile]) });
  liveChanged();
});
// back to the song's own configuration (↺): the trial goes
function resetTrial(id) {
  if (!trials[id]) return;
  const { [id]: gone, ...rest } = trials;
  trials = rest; saveTrials();
  if (T.id === id) liveChanged(); else renderSongs();
  toast(t('configBack'));
}
// ↺ Original configuration sits in the song actions next to ↺ Original song (outside the live build panel: the original
// configuration may be the Live build off, with the panel closed); disabled, with its tooltip, when there is no trial
$('#cfg-reset').addEventListener('click', () => { if ($('#cfg-reset').getAttribute('aria-disabled') !== 'true') resetTrial(T.id); });
// the "configuration changed" mark and the ↺ in the song actions of Compose
function renderTrialMark() {
  const on = !!trialOf(T);
  $('#cfg-changed').hidden = !on;
  $('#cfg-reset').innerHTML = `${RESET_CONFIG}<span>${esc(t('configBackLbl'))}</span>`;
  $('#cfg-reset').setAttribute('aria-disabled', String(!on));
}
$('#live-gen').addEventListener('change', e => { setControl('gen', e.target.value); liveChanged(); });
$('#live-growth').addEventListener('change', e => { setControl('growth', e.target.value); liveChanged(); });
$('#live-duration').addEventListener('change', e => { setControl('duration', e.target.value); liveChanged(); });
// the growth shape (growth-shapes): each part automatic or one value; a value makes the profile custom
for (const k of ['opening', 'pace', 'development']) $(`#live-${k}`).addEventListener('change', e => { setControl(k, e.target.value); liveChanged(); });
$('#live-code').addEventListener('change', e => { setControl('view', e.target.value); liveChanged(); });
// a comments preset sets its options (code-writing)
$('#live-comments').addEventListener('change', e => { if (COMMENT_PRESETS[e.target.value]) for (const [k, v] of Object.entries(COMMENT_PRESETS[e.target.value])) setControl(k, v); liveChanged(); });
for (const k of ['tracks', 'notes', 'steps', 'voice']) $(`#live-c-${k}`).addEventListener('click', () => { setControl(k, ctlOf(T)[k] === false); liveChanged(); });
$('#live-fns').addEventListener('change', e => { if (FUNCTION_PRESETS[e.target.value]) for (const [k, v] of Object.entries(FUNCTION_PRESETS[e.target.value])) setControl(k, v); liveChanged(); });
for (const k of FUNCTION_OPTIONS) $(`#live-f-${k}`).addEventListener('click', () => { setControl(k, !ctlOf(T)[k]); liveChanged(); });
$('#live-narrated').addEventListener('click', () => { setControl('narrated', !ctlOf(T).narrated); liveChanged(); });
$('#live-narrator').addEventListener('click', () => { setControl('narrator', ctlOf(T).narrator === false); liveChanged(); });
// the narrator style (voice-controls): automatic (the song's own), explaining or poetic
$('#live-narrator-style').addEventListener('change', e => { setControl('narratorStyle', e.target.value); liveChanged(); });
$('#live-title').addEventListener('click', () => { setControl('title', !ctlOf(T).title); liveChanged(); });
$('#live-hl').addEventListener('click', () => { setControl('highlights', !ctlOf(T).highlights); liveChanged(); });
$('#live-wrap').addEventListener('click', () => { setControl('wrap', !ctlOf(T).wrap); liveChanged(); });
$('#live-human').addEventListener('click', () => { setControl('typist', ctlOf(T).typist === 'human' ? 'exact' : 'human'); liveChanged(); });
$('#live-mistakes').addEventListener('click', () => { setControl('mistakes', ctlOf(T).mistakes === 'off' ? 'on' : 'off'); liveChanged(); });
$('#live-toggle').addEventListener('click', () => {
  const c = cfgOf(T);
  // a song with its own steps in crescendo: the switch goes back to its own steps
  if (hasBuild(T)) tryConfig({ profile: 'classic', live: true, options: cleanOverrides(c.options, PROFILES.classic) });
  else tryConfig({ ...c, live: !c.live });
  composeCompiled();
  if (isPlaying() && mode === 'track') { if (!compiled.pending) playSong(compiled, sched().now(), 'track'); }
  else if (ed && mode === 'track') ed.setCode(compiled.code);
  renderArranger(); if (!$('#tab-brani').hidden) renderSongs();
  wakeGrowWait();
});
$$('[data-arr-mode]').forEach(b => b.addEventListener('click', () => {
  arrMode = b.dataset.arrMode === 'timeline' ? 'timeline' : 'sections'; store.set('coding-misk-arr-mode', arrMode);
  selClip = null; renderArranger(); renderTrackPanel();
}));

// ---------- barra di riproduzione: tempo continuo, clic o trascinamento per spostarsi ----------
// la posizione si calcola sui blocchi delle sezioni, così funziona in entrambe le viste
function rulerGeo() {
  const track = $('#ruler-track'), btns = $$('.arr-scene-btn'), tr = track.getBoundingClientRect(), st = starts();
  return { tr, secs: btns.map((b, i) => { const r = b.getBoundingClientRect(); return { left: r.left - tr.left, width: r.width, start: st[i], bars: T.sections[i].bars }; }) };
}
function barToX(g, bar) {
  const s = g.secs.find(x => bar < x.start + x.bars) || g.secs[g.secs.length - 1];
  return s ? s.left + Math.min(1, Math.max(0, (bar - s.start) / s.bars)) * s.width : 0;
}
function xToBar(g, x) {
  let s = g.secs[0];
  for (const c of g.secs) if (x >= c.left - 2) s = c;
  if (!s) return 0;
  const bar = s.start + Math.min(1, Math.max(0, (x - s.left) / s.width)) * s.bars;
  return Math.max(0, Math.min(songBars() - .25, Math.round(bar * 4) / 4));
}
function renderRuler() {
  requestAnimationFrame(() => {
    const g = rulerGeo(), total = songBars(), every = total > 96 ? 8 : 4;
    $('#ruler-ticks').innerHTML = Array.from({ length: total }, (_, b) => `<i class="${b % every === 0 ? 'major' : ''}" style="left:${barToX(g, b)}px">${b % every === 0 ? b + 1 : ''}</i>`).join('');
    $('#ruler-track').setAttribute('aria-valuemax', total);
  });
}
// dove ripartirebbe la musica: la posizione in pausa, oppure l'inizio della sezione selezionata
// a brano finito il cursore resta in fondo finché non si sceglie un altro punto
const cueBar = () => (ended === compiled.id ? compiled.meta.bars : paused && song && paused.id === compiled.id ? paused.cyc : sceneStart(sel));
async function seekTo(bar) {
  ended = null;
  if (isPlaying() && mode === 'track') return playSong(compiled, bar, 'track');
  if (mode !== 'track') backToTrack();
  song = compiled; paused = { id: compiled.id, cyc: bar };
  const i = arrSec(compiled.meta.sectionAt(bar)); if (i >= 0 && i !== sel) selectScene(i);
}
let rulerDrag = null;
$('#ruler-track').addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const g = rulerGeo(); rulerDrag = { g, bar: xToBar(g, e.clientX - g.tr.left) };
  $('#ruler-track').setPointerCapture(e.pointerId); e.preventDefault();
});
$('#ruler-track').addEventListener('pointermove', e => { if (rulerDrag) rulerDrag.bar = xToBar(rulerDrag.g, e.clientX - rulerDrag.g.tr.left); });
$('#ruler-track').addEventListener('pointerup', () => { if (!rulerDrag) return; const b = rulerDrag.bar; rulerDrag = null; seekTo(b + growBars()); });
$('#ruler-track').addEventListener('keydown', e => {
  const g = growBars(), now = (isPlaying() && mode === 'track' && sched() ? sched().now() : cueBar()) - g, total = songBars();
  const to = { ArrowLeft: Math.floor(now) - 1, ArrowRight: Math.floor(now) + 1, Home: -g, End: total - 1 }[e.key];
  if (to === undefined) return;
  e.preventDefault(); seekTo(g + Math.max(-g, Math.min(total - 1, to)));
});
// a ogni frame: cursore e tempo (durante il trascinamento segue il puntatore)
function updateRuler(playing) {
  const knob = $('#ruler-knob'); if (!knob || !compiled) return;
  const g = rulerGeo(), s = sched();
  const gb = growBars(), played = rulerDrag ? rulerDrag.bar + gb : playing && mode === 'track' && s ? Math.min(s.now(), compiled.meta.bars) : cueBar();
  const pos = Math.max(0, Math.min(songBars(), played - gb));
  const x = barToX(g, pos), w = g.tr.width;
  // il cursore resta dentro la barra anche a fine brano (prima sporgeva e faceva comparire le barre di scorrimento)
  knob.style.left = `${Math.max(7, Math.min(w - 7, x))}px`; $('#ruler-fill').style.width = `${Math.max(0, Math.min(w, x))}px`;
  const tt = `${clock(compiled.meta.secondsAt(played))} / ${clock(compiled.meta.seconds)}`;
  if ($('#ruler-time').textContent !== tt) $('#ruler-time').textContent = tt;
  $('#ruler-track').setAttribute('aria-valuenow', Math.min(songBars(), Math.floor(pos) + 1));
}

$('#arr-strip').addEventListener('click', e => {
  const b = e.target.closest('[data-scene-i]'); if (!b) return;
  const i = +b.dataset.sceneI;
  if (isPlaying() && mode === 'track') return playSong(compiled, sceneStart(i), 'track');
  paused = null; selectScene(i);
});
$('#track-title').addEventListener('input', e => { T.title = e.target.value; changed(); renderSource(); });
$('#track-pick').addEventListener('change', e => {
  const tr = composedTracks().find(x => x.id === e.target.value);
  if (!tr || !loadTrack(tr)) { e.target.value = T.id; return; }
  songLook(tr.look);
  if (mode !== 'track') backToTrack(); else if (ed) { if (isPlaying()) playSong(compiled, 0, 'track'); else ed.setCode(compiled.code); }
});

// ---------- sezioni ----------
const uniqueName = (base, skip = -1) => { let n = base, k = 2; while (T.sections.some((s, i) => i !== skip && s.name === n)) n = `${base} ${k++}`; return n; };
$('#sc-name').addEventListener('change', e => {
  const old = SEC().name, n = uniqueName(e.target.value.trim() || old, sel);
  SEC().name = n;
  for (const tr of T.tracks) for (const c of tr.clips) if (c.section === old) c.section = n;
  changed();
});
$('#sc-bars').addEventListener('change', e => { SEC().bars = Math.max(1, Math.min(64, Math.round(+e.target.value) || 8)); changed(); });
$('#sc-fade').addEventListener('change', e => { const v = +e.target.value; if (v) SEC().fade = v; else delete SEC().fade; changed(); });
for (const k of ['crash', 'breath', 'fill']) $('#sc-' + k).addEventListener('change', e => { if (e.target.checked) SEC()[k] = true; else delete SEC()[k]; changed(); });
// nuova sezione: copia di quella selezionata, con gli stessi clip
$('#sc-add').addEventListener('click', () => {
  const copy = clone(SEC()); copy.name = uniqueName(t('newScene', { n: T.sections.length + 1 })); delete copy.fade;
  for (const tr of T.tracks) { const c = wholeClip(tr, sel); if (c) tr.clips.push({ ...clone(c), section: copy.name }); }
  T.sections.splice(sel + 1, 0, copy);
  sel += 1; editPat = null; changed(); renderTrackPanel();
});
$('#sc-del').addEventListener('click', () => {
  if (T.sections.length === 1) return toast(t('minScene'));
  if (!confirmTwice('scene')) return;
  const name = SEC().name;
  for (const tr of T.tracks) tr.clips = tr.clips.filter(c => c.section !== name);
  T.sections.splice(sel, 1);
  // clip a battute fisse oltre la nuova fine: tagliati
  const total = T.sections.reduce((a, s) => a + s.bars, 0);
  for (const tr of T.tracks) tr.clips = tr.clips.filter(c => c.section !== undefined || c.start < total).map(c => (c.section === undefined && c.start + c.bars > total ? { ...c, bars: total - c.start } : c));
  sel = Math.min(sel, T.sections.length - 1); editPat = null; changed(); renderTrackPanel();
});
const moveScene = d => {
  const j = sel + d; if (j < 0 || j >= T.sections.length) return;
  [T.sections[sel], T.sections[j]] = [T.sections[j], T.sections[sel]];
  sel = j; changed();
};
$('#sc-left').addEventListener('click', () => moveScene(-1));
$('#sc-right').addEventListener('click', () => moveScene(1));
$('#sc-play').addEventListener('click', () => playSong(compiled, sceneStart(sel), 'track'));
$('#sc-pause').addEventListener('click', togglePlay);
$('#sc-stop').addEventListener('click', stop);
$('#sc-loop').addEventListener('change', e => {
  loopIdx = e.target.checked ? sel : -1;
  $$('[data-loop]').forEach(x => x.checked = false);
  if (e.target.checked && !(isPlaying() && mode === 'track')) playSong(compiled, sceneStart(sel), 'track');
});
$('#sc-follow').addEventListener('change', e => { follow = e.target.checked; });
$('#key').addEventListener('change', e => { SEC().key = e.target.value; changed(); });
$('#prog').addEventListener('change', e => { SEC().chords = e.target.value; changed(); });
$('#sc-meter').addEventListener('change', e => { SEC().meter = e.target.value; changed(); renderTrackPanel(); });
$('#sc-swing').addEventListener('input', e => { const v = +e.target.value; if (v) SEC().swing = v; else delete SEC().swing; syncOutputs(); changed(); });
const clampBpm = v => Math.max(60, Math.min(200, Math.round(+v) || 138));
$('#bpm').addEventListener('change', e => { SEC().bpm = clampBpm(e.target.value); syncAll(); changed(); });
$('#bpm-end').addEventListener('change', e => { SEC().bpmEnd = clampBpm(e.target.value); syncAll(); changed(); });
$('#bpm-ramp').addEventListener('click', () => { if (SEC().bpmEnd == null) SEC().bpmEnd = SEC().bpm ?? 138; else delete SEC().bpmEnd; syncAll(); changed(); });
$$('[data-bpm]').forEach(b => b.addEventListener('click', () => { SEC().bpm = clampBpm((SEC().bpm ?? 138) + +b.dataset.bpm); syncAll(); changed(); }));

// ---------- tracce ----------
function addTrack(type) {
  const ids = new Set(T.tracks.map(x => x.id));
  let id = type, k = 2; while (ids.has(id)) id = `${type}-${k++}`;
  const count = T.tracks.filter(x => x.type === type).length;
  const tr = { id, name: `${t(type)}${count ? ' ' + (count + 1) : ''}`, type, settings: baseSettings(type), patterns: { A: DEFAULT_PATTERN[type]() }, clips: [{ section: SEC().name, pattern: 'A' }] };
  T.tracks.push(tr); tk = T.tracks.length - 1; editPat = 'A';
  changed(); renderTrackPanel();
}
$('#tk-add').addEventListener('click', () => addTrack($('#tk-type').value));

function loadTrack(tr) {
  if (tr.id !== T.id && dirty && !confirmTwice('load', t('loadConfirm'))) return false;
  if (tr.id !== T.id) { T = prepare(tr); dirty = false; }
  sel = 0; tk = 0; editPat = null; selClip = null; paused = null;
  composeCompiled(); wakeGrowWait();
  saveDraft(); syncAll(); renderArranger(); renderTrackPanel(); renderSource();
  return true;
}
const asStored = (fresh = false) => { const o = stamp(clone(T), fresh); delete o.kind; T.created = o.created; T.appVersion = o.appVersion; return o; };
// the trial configuration becomes the song's own (song-own-settings); without a trial the song keeps its own
function keepTrial() {
  const c = trialOf(T);
  if (!c) return;
  T.config = compactConfig(c);
  const { [T.id]: gone, ...rest } = trials; trials = rest; saveTrials();
}
$('#tr-save').addEventListener('click', () => {
  keepTrial();
  const i = user.tracks.findIndex(u => u.id === T.id);
  if (i >= 0) user.tracks[i] = asStored(); else user.tracks.push(asStored());
  dirty = false; saveLibrary(); saveDraft(); renderArranger(); renderSongs(); toast(t('trackSaved'));
});
$('#tr-saveas').addEventListener('click', () => {
  // the copy plays with the trial; the song it comes from stays as saved, its trial taken by the copy
  keepTrial();
  T.id = 'u-' + Date.now(); T.title = t('copyOf', { name: T.title });
  user.tracks.push(asStored(true));
  dirty = false; composeCompiled(); wakeGrowWait();
  saveLibrary(); saveDraft(); renderArranger(); renderSongs(); renderSource(); toast(t('trackSaved'));
});
$('#tr-new').addEventListener('click', () => {
  if (dirty && !confirmTwice('new', t('loadConfirm'))) return;
  const name = t('newScene', { n: 1 });
  T = prepare({ id: 'u-' + Date.now(), title: t('newTrackTitle'), look, sections: [{ name, bars: 8, bpm: 128, key: 'A', chords: 'epica', meter: '4/4' }],
    tracks: [{ id: 'drums', name: t('drums'), type: 'drums', settings: baseSettings('drums'), patterns: { A: DEFAULT_PATTERN.drums() }, clips: [{ section: name, pattern: 'A' }] }] });
  sel = 0; tk = 0; editPat = null; syncAll(); changed(); renderTrackPanel();
});
// the voice instrument of the next new song by an artist (voice-controls; voice-placement: a secondary row of the
// Voices group, "In the next song"): on, off or as the style says, and the phrase controls with their presets; kept in
// this browser under the same key as before
const ARTIST_VOICE = 'coding-misk-artist-voice';
let artistVoice = cleanVoice(store.get(ARTIST_VOICE, null));
function renderArtistVoice() {
  const body = $('#live-vinst-next-body'); if (!body) return;
  body.innerHTML = `<p class="hint muted small">${esc(t('vinstNewHint'))}</p>${voicePanel(artistVoice, { t, esc, mode: 'song' })}`;
  const p = voicePresetOf(artistVoice, { presence: false });
  $('#live-vinst-next-now').textContent = artistVoice.presence === 'never' ? t('vinstSong:never') : artistVoice.presence === 'always' ? `${t('vinstSong:always')} · ${t(`vinstPreset:${p}`)}` : t(`vinstPreset:${p}`);
}
function artistVoiceEvent(el) {
  const v = voiceEvent(artistVoice, el, { mode: 'song' });
  if (!v) return;
  artistVoice = v; store.set(ARTIST_VOICE, artistVoice); renderArtistVoice();
}
$('#live-vinst-next-body').addEventListener('click', e => { const b = e.target.closest('button'); if (b) artistVoiceEvent(b); });
$('#live-vinst-next-body').addEventListener('change', e => artistVoiceEvent(e.target));
// The voice instrument of the song being edited (voice-placement): the same controls in the Voices group and in the
// panel of the voice instrument track, both drawn from the track (its voiceOptions, else what it has). A change
// rewrites the track's lines and clips (rewriteSpoken), with Undo in the toast; a song without one can add one.
const songSpoken = () => T.tracks.find(x => x.type === 'spoken') || null;
// The two voice blocks of the Voices group (voice-full-controls). Each part is drawn once and then only brought up to
// date while its signature (the track, the language, the off reason) stays the same, so a control being dragged keeps
// its drag; folded parts remember whether they were open (in this browser).
const VOICE_FOLDS = 'coding-misk-voice-folds';
const foldOpen = id => !!(store.get(VOICE_FOLDS, {}) || {})[id];
document.addEventListener('toggle', e => {
  const d = e.target; if (!d || !d.dataset || !d.dataset.vfold) return;
  const f = store.get(VOICE_FOLDS, {}) || {};
  if (d.open) f[d.dataset.vfold] = true; else delete f[d.dataset.vfold];
  store.set(VOICE_FOLDS, f);
}, true);
function drawPart(box, sig, html, sync = null) {
  if (!box) return;
  if (box.dataset.sig === sig) { if (sync) sync(box); return; }
  box.dataset.sig = sig; box.innerHTML = html();
}
const narratorSettings = () => ({ ...VOICE_DEFAULT, ...((voiceOf(T) || {}).settings || {}) });
// the narrator block's folded parts: its Sound (the narrator track's settings, the default sound without one) and the
// list of its lines in the build that plays
function renderNarratorParts(off) {
  const box = $('#live-narrator-parts'); if (!box) return;
  const tr = voiceOf(T), v = narratorSettings();
  drawPart(box, `parts:${getLang()}`, () => '<div class="vb-sound"></div><div class="vb-nlines"></div>');
  drawPart(box.querySelector('.vb-sound'), JSON.stringify([getLang(), off, tr ? tr.id : '']), () => voiceSoundHtml({ voice: 'narrator', settings: v, t, esc, off, open: foldOpen('compose-narrator-sound') }),
    b => syncVoiceSound(b, { voice: 'narrator', settings: v, t, off }));
  const el = box.querySelector('.vb-nlines'), html = narratorLinesHtml(off);
  if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; }
}
// The narrator's lines (voice-full-controls, spec "Phrase list of the narrator"): the step lines of the build that
// plays, by bar. A song with its own written steps (Classic or Live build) edits them in place; lines a build makes
// (derived, Crescendo, Live coder) are read-only and say so.
function narratorLines() {
  const b = compiled && compiled.build, lv = liveOf(T), grows = lv.on && lv.style === 'crescendo';
  const own = hasBuild(T) && !grows;
  const steps = b && !compiled.pending ? buildSteps(b).filter(x => x.say) : [];
  return { steps, own, grows, on: !!b };
}
function narratorLinesHtml(off) {
  const { steps, own, grows, on } = narratorLines(), lang = getLang(), dis = off ? ' disabled' : '';
  const why = !on ? t('narratorNeedsLive') : own ? t('nlOwn') : t(grows ? 'nlGrown' : 'nlDerived');
  const rows = steps.map(x => `<div class="pl-row nl-row" data-nl-step="${x.i}"><div class="pl-bar"><span class="pl-said">${esc(t('liveMark', { n: x.at + 1 }))}</span></div>
      <div class="pl-text">${own ? `<input type="text" data-nl-text maxlength="80" autocomplete="off" spellcheck="false" value="${esc(sayText(x.say, lang))}" aria-label="${esc(t('plText'))}"${dis}>` : `<span>${esc(sayText(x.say, lang))}</span>`}</div></div>`).join('');
  const open = foldOpen('compose-narrator-lines');
  return `<details class="voice-part" data-vfold="compose-narrator-lines"${open ? ' open' : ''}><summary><span class="lbl">${esc(t('nlTitle'))}</span> <span class="vs-sum">${esc(`${steps.length} · ${own ? t('nlOwnShort') : t('nlReadOnly')}`)}</span></summary>
    <p class="hint muted small">${esc(why)}</p><div class="pl nl">${rows}</div></details>`;
}
$('#live-voices').addEventListener('change', e => {
  const i = e.target.closest('[data-nl-step]'); if (!i || !e.target.matches('[data-nl-text]')) return;
  const st = (T.build || [])[+i.dataset.nlStep], v = e.target.value.trim(), lang = getLang();
  if (!st || !v) return;
  const before = JSON.parse(JSON.stringify(T.build));
  st.say = typeof st.say === 'object' && st.say ? { ...st.say, [lang]: v } : lang === 'en' || !st.say ? (lang === 'en' ? v : { [lang]: v }) : { en: st.say, [lang]: v };
  narratorEdited.add(v);
  changed(); askSamples();
  toast(t('plTextChanged'), { label: t('vinstUndo'), run: () => { T.build = before; changed(); } });
});
function vinstSongHtml(sp, off) {
  const ti = T.tracks.indexOf(sp);
  return `<p class="hint muted small">${esc(t('vinstSongHint2'))} <button class="plain link" data-vinst-open="${ti}">${esc(t('vinstOpenTrack'))}</button></p>${voicePanel(trackVoice(sp), { t, esc, mode: 'track', track: sp.id, only: 'main', off })}`;
}
// the Voce: traccia block: title row with its switch (the track's mute), presets, the folded Phrases and Sound parts
function renderSongVoice() {
  const box = $('#live-vinst'); if (!box) return;
  const sp = songSpoken();
  if (!sp) {
    box.classList.remove('off');
    drawPart(box, `none:${getLang()}`, () => `<div class="vb-head"><span class="lbl voices-sub">${esc(t('vinstLbl'))}</span></div><p class="hint muted small">${esc(t('vinstNone'))}</p><button class="btn small" data-vinst-add title="${esc(t('vinstAddHint'))}">${esc(t('vinstAdd'))}</button>`);
    return;
  }
  const muted = !!sp.mute, off = muted ? t('voiceOffTip', { voice: t('vinstLbl') }) : '';
  box.classList.toggle('off', muted);
  drawPart(box, `track:${sp.id}:${getLang()}`, () => `<div class="vb-head"></div><div class="vb-main"></div><div class="vb-parts"><div class="vb-phrases"></div><div class="vb-sound"></div></div>`);
  const head = `<span class="lbl voices-sub">${esc(t('vinstLbl'))} · ${esc(trackLabel(sp))}</span><button class="vswitch" data-vinst-switch aria-pressed="${!muted}" title="${esc(t('voiceSwitchTip', { voice: t('vinstLbl') }))}"><span class="vs-lamp" aria-hidden="true"></span>${POWER}<span class="vs-txt">${esc(t(muted ? 'switchOff' : 'switchOn'))}</span></button>`;
  const set = (sel, html) => { const el = box.querySelector(sel); if (el && el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; } };
  set('.vb-head', head);
  set('.vb-main', vinstSongHtml(sp, off));
  set('.vb-phrases', phrasesPartHtml(sp, off));
  const v = { ...VOICE_DEFAULT, ...(sp.settings || {}) };
  drawPart(box.querySelector('.vb-sound'), JSON.stringify([sp.id, getLang(), off]), () => voiceSoundHtml({ voice: 'spoken', settings: v, t, esc, off, open: foldOpen('compose-spoken-sound') }),
    b => syncVoiceSound(b, { voice: 'spoken', settings: v, t, off }));
}
// the Phrases part of the Voce: traccia block: the phrase list and the phrase options (phrases per song, kind, ways, where)
function phrasesPartHtml(sp, off) {
  const open = foldOpen('compose-spoken-phrases');
  return `<details class="voice-part" data-vfold="compose-spoken-phrases"${open ? ' open' : ''}><summary><span class="lbl">${esc(t('vinstPhrasesPart'))}</span> <span class="vs-sum">${esc(phrasesSummary(sp))}</span></summary>
    ${phraseListHtml(sp, off)}${voicePanel(trackVoice(sp), { t, esc, mode: 'track', track: sp.id, only: 'options', off })}</details>`;
}
// The phrase list (voice-full-controls D5, D6, D16): one row per clip of the voice track, sorted by bar, in the Voices
// group and in the track's panel, from the same rows. Bars are shown as heard in the build that plays (Crescendo and
// Live coder grow G bars first); a Live coder growth still on its way shows the written bars with the growing mark.
function heardBuild() {
  const lv = liveOf(T), grows = lv.on && lv.style === 'crescendo';
  if (!grows) return { G: 0, song: null, growing: false };
  if (compiled.pending) return { G: 0, song: null, growing: true };
  const b = compiled.build, G = b && b.crescendo ? b.crescendo.growth || 0 : 0;
  return { G, song: G > 0 ? b : null, growing: false };
}
// whether a line has its sample on this machine: ok, on its way (asked to the voice helper), or none
function sampleState(sp, texts) {
  const files = spokenContext.files, lang = getLang();
  if (files === null) return 'ok';
  const bank = sayBank(lang, speakerOf(T, sp));
  const ok = x => [bank, bank.replace(/_[a-z]+$/, '')].some(b => (files[b] || []).some(f => decodeURI(f).endsWith(`/${saySlug(x)}.wav`)));
  if (texts.every(ok)) return 'ok';
  return texts.some(x => sampleAsked.has(`${bank}/${saySlug(x)}`)) ? 'wait' : 'none';
}
const sampleAsked = new Set();
// The samples of new and edited lines (voice-full-controls D8): the dev server's voice helper makes them, one at a time;
// the line is written and shown at once, silent until its sample exists, then it speaks from its next bar (the samples
// are loaded again, no page reload). Without the helper (a built app, another system) the row says how to make it.
let voiceHelper = null;
const helperReady = fetch('/voice/status').then(r => (r.ok ? r.json() : { ok: false })).then(j => { voiceHelper = !!(j && j.ok); }, () => { voiceHelper = false; });
const lineSamples = () => {
  const out = [], lang = getLang(), files = spokenContext.files || {};
  const has = (bank, x) => [bank, bank.replace(/_[a-z]+$/, '')].some(b => (files[b] || []).some(f => decodeURI(f).endsWith(`/${saySlug(x)}.wav`)));
  for (const sp of T.tracks.filter(x => x.type === 'spoken')) {
    const speaker = speakerOf(T, sp), bank = sayBank(lang, speaker);
    let rows = []; try { rows = phraseRows(T, sp.id, { lang }); } catch (e) { rows = []; }
    // (the lines written here: edited or typed; the vocabulary and the styles' lines come with npm run voices)
    for (const r of rows) if (r.source === 'own') for (const x of r.texts) if (!has(bank, x)) out.push({ text: x, lang, speaker, bank });
  }
  // (the narrator's own written steps)
  const nt = voiceOf(T), nsp = (nt && nt.settings && nt.settings.speaker) || '', nb = sayBank(lang, nsp);
  if (hasBuild(T)) for (const st of buildSteps(T)) { const x = st.say && sayText(st.say, lang); if (x && narratorEdited.has(x) && !has(nb, x)) out.push({ text: x, lang, speaker: nsp, bank: nb }); }
  return out.filter(x => x.text.split(/\s+/).length <= MAX_WORDS);
};
let samplesBusy = false;
// the narrator lines edited in this page (their samples are asked; the song's own lines come with npm run voices)
const narratorEdited = new Set();
async function askSamples() {
  await helperReady;
  if (!voiceHelper || samplesBusy) return;
  samplesBusy = true;
  try {
    let made = 0;
    for (;;) {
      const next = lineSamples().find(x => !sampleAsked.has(`${x.bank}/${saySlug(x.text)}`));
      if (!next) break;
      sampleAsked.add(`${next.bank}/${saySlug(next.text)}`);
      renderSongVoice(); renderTrackPanel();
      try {
        const r = await fetch('/voice/say', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: next.text, lang: next.lang, speaker: next.speaker }) });
        if (r.ok) { made++; await refreshSamples(); }
      } catch (e) { /* the row keeps saying the sample is missing */ }
    }
    // (no message of its own: the rows say sample ok, and a toast would take the place of an edit's Undo)
    void made;
  } finally { samplesBusy = false; }
}
// the custom samples and their lengths read again (a new sample of the voice helper): the song is written again with
// them; while it plays, the new code is evaluated on the next bar
// (the samples alone, for the radio's typed lines: the radio writes its songs again itself)
async function reloadSamples() {
  const list = await (await fetch('/samples/strudel.json')).json();
  let lengths = {};
  try { const r = await fetch('/samples/say_lengths.json'); if (r.ok) lengths = await r.json(); } catch (e) {}
  custom = Object.keys(list).filter(k => k !== '_base'); customFiles = list;
  setSpokenContext({ files: list, lengths });
  crescendoCache.clear();
  if (globalThis.samples) await globalThis.samples('/samples/strudel.json');
}
async function refreshSamples() {
  await reloadSamples();
  const was = dirty;
  changed();
  dirty = was; saveDraft();
}
const trashBtn = label => `<button class="mini pl-del" data-pl-del aria-label="${esc(label)}" title="${esc(label)}">${BIN}</button>`;
function phraseListHtml(sp, off) {
  const h = heardBuild(), lang = getLang(), dis = off ? ' disabled' : '';
  let rows = [];
  try { rows = phraseRows(T, sp.id, { heard: h.song ? { song: h.song, G: h.G } : null, lang }); } catch (e) { rows = []; }
  const fill = listVocab(rows), barsTxt = list => { const runs = []; for (const b of list.map(x => x + 1)) { const r = runs[runs.length - 1]; if (r && r[1] === b - 1) r[1] = b; else runs.push([b, b]); } return runs.map(([a, z]) => (z > a + 1 ? `${a}–${z}` : z > a ? `${a}, ${z}` : `${a}`)).join(', '); };
  const way = (r) => `<select data-pl-way data-no-knob aria-label="${esc(t('spokenWay'))}"${dis}>${WAYS.map(w => `<option value="${w}"${w === r.way ? ' selected' : ''}>${esc(t(`way:${w}`))}</option>`).join('')}</select>`;
  const src = r => [r.source === 'vocab' ? t('plFromVocab', { g: t(`vocab:${r.group}`) }) : r.source === 'own' ? t('plOwn') : t('plFromStyle'), r.shared > 1 ? t('plShared', { n: r.shared }) : '', r.toTranslate ? t('plToTranslate') : ''].filter(Boolean).join(' · ');
  const sample = r => { const st = sampleState(sp, r.texts); return `<span class="pl-sample ${st}" title="${esc(t(`plSampleTip:${st}`))}">${esc(t(`plSample:${st}`))}</span>`; };
  const heardTxt = r => (r.heard ? t('plHeard', { bars: barsTxt(r.heard.said.length ? r.heard.said : [r.heard.start]), w: r.start + 1 }) : r.said.length ? barsTxt(r.said) : t('plSilent'));
  const body = rows.map(r => `<div class="pl-row" data-pl-row="${r.raw}">
      <div class="pl-bar"><input type="number" min="1" step="1" data-pl-start value="${(r.heard ? r.heard.start : r.start) + 1}" aria-label="${esc(t('plBar'))}"${dis}><span class="pl-said">${esc(heardTxt(r))}${h.growing ? ` <span class="pl-growing" title="${esc(t('plGrowingTip'))}">${GROWING}</span>` : ''}</span></div>
      <div class="pl-len"><input type="number" min="1" step="1" data-pl-bars value="${r.bars}" aria-label="${esc(t('plBars'))}"${dis}></div>
      <div class="pl-way">${way(r)}</div>
      <div class="pl-text"><input type="text" data-pl-text maxlength="120" autocomplete="off" spellcheck="false" value="${esc(r.texts.join(' · '))}" placeholder="${esc(t('plTextPh', { n: MAX_WORDS }))}" aria-label="${esc(t('plText'))}"${dis}><span class="pl-src">${esc(src(r))}</span></div>
      <div class="pl-voice">${sample(r)}</div>
      <div class="pl-end">${off ? '' : trashBtn(t('vplRemove'))}</div></div>`).join('');
  const free = freeParts(T, sp.id).length > 0;
  const head = `<div class="pl-head"><label class="ctrl pl-fill" title="${esc(t('plFillHint'))}"><span class="lbl">${esc(t('vinstFillLbl'))}</span><select data-pl-fill data-no-knob${dis}><option value=""${fill === '' ? ' selected' : ''}>—</option>${fill === 'mixed' ? `<option value="mixed" selected disabled>${esc(t('plMixed'))}</option>` : ''}${FILL_GROUPS.map(g => `<option value="${g}"${fill === g ? ' selected' : ''}>${esc(t(`vocab:${g}`))}</option>`).join('')}</select></label><p class="hint muted small">${esc(t(h.G ? 'plHintGrown' : 'plHint', { g: h.G + 1 }))}</p></div>`;
  const cols = `<div class="pl-row pl-cols" aria-hidden="true"><span>${esc(t(h.G ? 'plBarHeard' : 'plBar'))}</span><span>${esc(t('plBars'))}</span><span>${esc(t('spokenWay'))}</span><span>${esc(t('plText'))}</span><span>${esc(t('plVoice'))}</span><span></span></div>`;
  const empty = rows.length ? '' : `<p class="hint muted small pl-empty">${esc(t('vplEmpty'))}</p>`;
  const add = `<div class="pl-add"><button class="btn small" data-pl-add title="${esc(free ? t('plAddHint') : t('plNoPart'))}"${off || !free ? ' disabled' : ''}>${esc(t('vplAdd'))}</button><span class="hint muted small">${esc(free ? t('plAddWhere') : t('plNoPart'))}</span></div>`;
  return `<div class="pl" data-pl-track="${esc(sp.id)}">${head}${rows.length ? cols : ''}${body}${empty}${add}</div>`;
}
// one edit of the phrase list: the new song's tracks in place of the old ones, with Undo in the toast
function phraseEdit(next, msg) {
  if (!next) return;
  const before = JSON.parse(JSON.stringify(T.tracks));
  T.tracks = next.tracks;
  editPat = null; selClip = null;
  changed(); renderTrackPanel();
  askSamples();
  toast(msg, { label: t('vinstUndo'), run: () => { T.tracks = before; tk = Math.min(tk, T.tracks.length - 1); editPat = null; selClip = null; changed(); renderTrackPanel(); } });
}
const styleWaysOf = () => { const r = RECIPES.filter(x => ((T.tags && T.tags.styles) || []).includes(x.id) && x.spoken && x.spoken.ways); const w = {}; for (const x of r) for (const [k, v] of Object.entries(x.spoken.ways)) if (v > 0) w[k] = (w[k] || 0) + v; return Object.keys(w).sort((a, b) => w[b] - w[a]); };
function phraseListEvent(e) {
  const box = e.target.closest('[data-pl-track]'); if (!box) return false;
  const id = box.dataset.plTrack, rowEl = e.target.closest('[data-pl-row]'), raw = rowEl ? +rowEl.dataset.plRow : -1, el = e.target, h = heardBuild();
  if (e.type === 'click') {
    if (el.closest('[data-pl-del]')) { phraseEdit(removeRow(T, id, raw), t('plRemoved')); return true; }
    if (el.closest('[data-pl-add]')) {
      const g = box.querySelector('[data-pl-fill]').value, r = addRow(T, id, { group: FILL_GROUPS.includes(g) ? g : null, styleWays: styleWaysOf() });
      if (r.error) { toast(t('plNoPart')); return true; }
      phraseEdit(r.song, t('vplAdded', { n: r.start + h.G + 1 }));
      // (the new row's text cell, focused)
      setTimeout(() => { const i = document.querySelector(`#live-vinst [data-pl-row="${r.raw}"] [data-pl-text]`); if (i) { if (!FILL_GROUPS.includes(g)) i.value = ''; i.focus(); } }, 50);
      return true;
    }
    return false;
  }
  if (e.type !== 'change') return false;
  if (el.matches('[data-pl-fill]')) {
    const r = fillRows(T, id, el.value, { styleWays: styleWaysOf() });
    if (r.error || !r.filled) { toast(t('plNoPart')); renderSongVoice(); return true; }
    phraseEdit(r.song, t('plFilled', { n: r.filled, g: t(`vocab:${el.value}`) })); return true;
  }
  if (el.matches('[data-pl-way]')) { phraseEdit(editWay(T, id, raw, el.value), t('plWayChanged')); return true; }
  if (el.matches('[data-pl-text]')) {
    const r = editText(T, id, raw, getLang(), el.value);
    if (r.error) { toast(r.error === 'words' ? t('plTooMany', { n: r.n, max: MAX_WORDS }) : t('plEmptyText')); forceVoices(); return true; }
    const tr = T.tracks.find(x => x.id === id), c = tr && tr.clips[raw], n = c ? tr.clips.filter(x => x.pattern === c.pattern).length : 1;
    phraseEdit(r.song, n > 1 ? t('plTextShared', { n }) : t('plTextChanged')); return true;
  }
  if (el.matches('[data-pl-start]') || el.matches('[data-pl-bars]')) {
    const v = Math.round(+el.value);
    const r = el.matches('[data-pl-start]') ? editBars(T, id, raw, { start: v - 1, G: h.G }) : editBars(T, id, raw, { bars: v, G: h.G });
    if (r.error) { toast(r.error === 'growth' ? t('plInGrowth', { n: r.first + 1 }) : r.error === 'overlap' ? t('plOverlap', { n: r.at + 1 }) : t('plBadBar')); forceVoices(); return true; }
    phraseEdit(r.song, t('plMoved')); return true;
  }
  return false;
}
// the lists drawn again from the song (an edit refused: the old values come back)
function forceVoices() { $$('[data-pl-track]').forEach(b => { const p = b.closest('.vb-phrases'); if (p) p.dataset.html = ''; }); renderSongVoice(); renderTrackPanel(); }
for (const host of ['#live-voices', '#track-panel']) for (const type of ['click', 'change']) $(host).addEventListener(type, e => { if (phraseListEvent(e)) e.stopPropagation(); }, true);
const phrasesSummary = sp => [String((sp.clips || []).length), ...trackVoice(sp).where.map(w => t(`vinstWhere:${w}`))].join(' · ');
// One value per control (voice-full-controls D1): every place that shows a voice's sound writes its track's settings
// here. A song without a narrator track gets one, named Narrator, on the first edit (D2), with Undo.
const NARRATOR_NAME = 'Narrator';
function newNarratorTrack() {
  const ids = new Set(T.tracks.map(x => x.id));
  let id = 'narrator', k = 2;
  while (ids.has(id)) id = `narrator-${k++}`;
  return { id, name: NARRATOR_NAME, type: 'voice', settings: { ...VOICE_DEFAULT }, patterns: {}, clips: [] };
}
function setVoiceSetting(voice, patch, { undo = false } = {}) {
  let tr = voice === 'narrator' ? voiceOf(T) : songSpoken();
  if (!tr && voice !== 'narrator') return;
  const before = JSON.parse(JSON.stringify(T.tracks)), added = !tr;
  if (!tr) { tr = newNarratorTrack(); T.tracks.push(tr); }
  tr.settings = { ...VOICE_DEFAULT, ...(tr.settings || {}) };
  for (const [k, v] of Object.entries(patch)) setSetting(k, v, tr);
  changed();
  if (added) renderTrackPanel(); else syncTrackPanel();
  const back = () => { T.tracks = before; tk = Math.min(tk, T.tracks.length - 1); editPat = null; selClip = null; changed(); renderTrackPanel(); };
  if (added) toast(t('narratorAdded'), { label: t('vinstUndo'), run: back });
  else if (undo) toast(t('voiceStyleSet', { style: t(`voiceStyle:${styleOf(tr.settings)}`) }), { label: t('vinstUndo'), run: back });
}
// the Voce: traccia switch: the track's mute (the timeline's and the track panel's), with Undo
function switchSongVoice() {
  const sp = songSpoken(); if (!sp) return;
  sp.mute = !sp.mute || undefined;
  changed(); renderTrackPanel();
  toast(t(sp.mute ? 'voiceTrackMuted' : 'voiceTrackOn'), { label: t('vinstUndo'), run: () => { const x = songSpoken(); if (x) { x.mute = !x.mute || undefined; changed(); renderTrackPanel(); } } });
}
for (const [type, fn] of [['input', e => e.target.type === 'range'], ['change', e => e.target.tagName === 'SELECT']]) {
  $('#live-voices').addEventListener(type, e => {
    if (!fn(e)) return;
    const ev = soundEvent(e.target);
    if (ev) setVoiceSetting(ev.voice, ev.patch, { undo: !!ev.style });
  });
}
function applySongVoice(id, raw) {
  const before = { tracks: JSON.parse(JSON.stringify(T.tracks)), build: T.build === undefined ? undefined : JSON.parse(JSON.stringify(T.build)) };
  const r = rewriteSpoken(T, id, raw, { recipes: RECIPES });
  if (!r) return;
  T.tracks = r.song.tracks; if (r.song.build !== undefined) T.build = r.song.build;
  if (!id) tk = T.tracks.indexOf(r.track);
  editPat = null; selClip = null;
  changed(); renderTrackPanel();
  const undo = () => { T.tracks = before.tracks; if (before.build === undefined) delete T.build; else T.build = before.build; tk = Math.min(tk, T.tracks.length - 1); editPat = null; selClip = null; changed(); renderTrackPanel(); };
  toast(r.placed ? t(r.placed < r.asked ? 'vinstRewroteFewer' : 'vinstRewrote', { n: r.placed, asked: r.asked }) : t('vinstNoPlace'), { label: t('vinstUndo'), run: undo });
}
function songVoiceEvent(el) {
  const box = el.closest('[data-vinst-track]'), add = el.closest('[data-vinst-add]'), open = el.closest('[data-vinst-open]');
  if (el.closest('[data-vinst-switch]')) return switchSongVoice();
  if (add) return applySongVoice(null, { phrases: '1', kind: 'different' });
  if (open) { panelView = 'one'; store.set('coding-misk-panel', panelView); selectTrack(+open.dataset.vinstOpen); $('#track-panel').scrollIntoView({ block: 'nearest' }); return; }
  if (!box) return;
  const tr = T.tracks.find(x => x.id === box.dataset.vinstTrack && x.type === 'spoken');
  if (!tr) return;
  const cur = trackVoice(tr);
  if (el.dataset.vinstRedraw !== undefined) return applySongVoice(tr.id, { ...cur, draw: cur.draw + 1 });
  const v = voiceEvent(cur, el, { mode: 'track' });
  if (v) applySongVoice(tr.id, { ...v, draw: cur.draw });
}
for (const host of ['#live-vinst', '#track-panel']) {
  $(host).addEventListener('click', e => { const b = e.target.closest('button'); if (b && (b.closest('[data-vinst-track]') || b.dataset.vinstAdd !== undefined || b.dataset.vinstOpen !== undefined || b.dataset.vinstSwitch !== undefined)) songVoiceEvent(b); });
  $(host).addEventListener('change', e => { if (e.target.dataset.vinst && e.target.closest('[data-vinst-track]')) songVoiceEvent(e.target); });
}
// a new live build song by an artist (#35): written by the director, opened unsaved
function renderArtistPick() {
  const sel = $('#tr-artist'); if (!sel || !artistsTab) return;
  renderArtistVoice();
  sel.innerHTML = `<option value="">${esc(t('newFromArtist'))}</option>` + artistsTab.usable().map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
}
$('#tr-artist').addEventListener('change', e => {
  const a = artistsTab && artistsTab.usable().find(x => x.id === e.target.value);
  e.target.value = '';
  if (a) newSongFromArtist(a);
});
// also from the artist's sheet in the Groove Lab, which switches to Listen and Compose (#42)
function newSongFromArtist(a) {
  if (dirty && !confirmTwice('new', t('loadConfirm'))) return;
  // (the voice instrument options, voice-controls: As the style writes the song as before)
  const voice = voiceOption(artistVoice);
  const { song: sg } = createSession(RECIPES).next({ artist: a, ...(voice ? { voice } : {}) });
  const tr = { ...sg, id: 'u-' + Date.now(), kind: 'composed', style: { en: `${a.name} · ${sg.style.en}`, it: `${a.name} · ${sg.style.it}` } };
  dirty = false;
  if (!loadTrack(tr)) return;
  dirty = true; saveDraft(); renderArranger();
  if (mode !== 'track') backToTrack();
  showTab('componi');
  toast(t('newFromArtistDone', { name: a.name }));
}
// Compose leaves the song open: the original of a built-in song, else the first song
function leaveSong(src) {
  T = prepare(src || composedTracks()[0] || BUILTIN[0]);
  dirty = false; sel = 0; tk = 0; editPat = null;
  composeCompiled(); wakeGrowWait();
  saveDraft(); syncAll(); renderArranger(); renderTrackPanel(); renderSource();
  if (mode === 'track' && ed && !isPlaying()) ed.setCode(compiled.code);
}
// "Delete song" asks in a strip under the buttons (#68): a saved song of the user's goes to the trash, an unsaved
// one is discarded, a built-in song gets its original back
$('#tr-del').addEventListener('click', e => {
  if (e.currentTarget.getAttribute('aria-disabled') === 'true') return;
  const id = T.id, orig = builtinOf(id), stored = user.tracks.some(u => u.id === id);
  confirmInline({ anchor: e.currentTarget.closest('.actions'), trigger: e.currentTarget, key: 'tr-del', t, esc,
    msg: t(orig ? 'restoreAsk' : stored ? 'trashAsk' : 'discardAsk'), ok: t(orig ? 'songOrig' : 'songDelete'),
    onConfirm: () => {
      if (T.id !== id) return;
      if (!orig && stored) { trashUserSong(id); return; }
      user.tracks = user.tracks.filter(u => u.id !== id);
      if (trials[id]) { const { [id]: gone, ...rest } = trials; trials = rest; saveTrials(); }
      saveLibrary(); leaveSong(orig); renderSongs();
      toast(orig ? t('restored') : t('trackDeleted'));
    } });
});
// a song of the user's (composed, or a hand-coded version) to the trash: it leaves every playlist, Compose moves off it;
// a song playing keeps playing, the queue skips it
function trashUserSong(id) {
  const sg = [...user.tracks, ...user.codeSongs].find(x => x.id === id);
  if (!sg || isBuiltin(id)) return false;
  Object.assign(user, trashSong(user, id, new Date()));
  saveLibrary();
  playlists.removeSong(id);
  if (T.id === id) leaveSong();
  cards = []; renderSongs();
  toast(t('trashMoved', { title: sg.title }), { label: t('trashRestore'), run: () => restoreFromTrash(id) });
  return true;
}
// a built-in song is hidden in this browser (D3b): to the trash with no copy, out of every playlist and song menu
function hideBuiltinSong(id) {
  const c = libraryCards().find(x => x.tr.id === id);
  if (!c || !isBuiltin(id)) return false;
  Object.assign(user, hideSong(user, id, c.tr.title, new Date()));
  saveLibrary();
  playlists.removeSong(id);
  if (T.id === id) leaveSong();
  cards = []; renderSongs(); renderTrackPick();
  toast(t('trashMoved', { title: c.tr.title }), { label: t('trashRestore'), run: () => restoreFromTrash(id) });
  return true;
}
function restoreFromTrash(id) {
  const e = trashList(user).find(x => x.id === id); if (!e) return;
  Object.assign(user, restoreSong(user, id));
  saveLibrary(); cards = []; renderSongs(); renderTrackPick();
  toast(t('trashRestored', { title: entryTitle(e) }));
}
function forgetFromTrash(id) {
  const e = trashList(user).find(x => x.id === id); if (!e) return;
  Object.assign(user, deleteForGood(user, id));
  saveLibrary(); renderSongs();
  toast(t('trashGone', { title: entryTitle(e) }));
}
// Settings → Library: every hidden built-in song back in the list (their trash entries go too)
function showHiddenSongs() { const n = (user.hidden || []).length; Object.assign(user, showHidden(user)); saveLibrary(); cards = []; renderSongs(); renderTrackPick(); return n; }
function emptyTheTrash() { Object.assign(user, emptyTrash(user)); saveLibrary(); renderSongs(); toast(t('trashEmptied')); }

// ---------- controlli ----------
const opts = (box, list) => {
  const v = box.value;
  box.innerHTML = list.map(([val, l]) => `<option value="${esc(val)}">${esc(tx(l))}</option>`).join('');
  if (v) box.value = v;
};
const named = obj => Object.entries(obj).map(([k, v]) => [k, v[0]]);
const NUM4 = { max: 4, step: .1, fmt: 'num' };
// [tipo, chiave, etichetta, opzioni] delle impostazioni di ogni tipo di traccia; "ramp" = valore anche a fine sezione
const CONTROLS = {
  drums: [['select', 'kit', 'drumMachine', () => MACHINES.map(k => [k, machineLabel(k)])], ['range', 'gain', 'volume', { ramp: 1 }], ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['range', 'drive', 'drive', NUM4], ['range', 'grit', 'grit']],
  bass: [['select', 'wave', 'sound', allWaves], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'reso', 'reso', { max: 30, step: 1, fmt: 'num' }], ['range', 'drive', 'drive', NUM4]],
  arp: [['select', 'wave', 'sound', allWaves], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES],
    ['range', 'reso', 'reso', { max: 30, step: 1, fmt: 'num' }], ['range', 'drive', 'drive', NUM4], ['range', 'delay', 'delay']],
  hook: [['select', 'mode', 'mode', () => MODES], ['select', 'wave', 'sound', allWaves], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'fm', 'fm', { max: 8, step: .5, fmt: 'num' }],
    ['select', 'octave', 'octaveOpt', () => [['3', '3'], ['4', '4'], ['5', '5']]], ['select', 'harmony', 'harmony', () => HARMONIES], ['range', 'drive', 'drive', NUM4], ['select', 'vowel', 'vowel', () => VOWELS], ['range', 'grit', 'grit'], ['range', 'delay', 'delay']],
  guitar: [['select', 'type', 'type', () => named(GUITAR_TYPES)], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['range', 'drive', 'drive', { max: 8, step: .1, fmt: 'num' }],
    ['select', 'octave', 'tuning', () => [['0', t('standard')], ['-2', t('dropTuning')], ['-12', t('lowOpt')]]], ['select', 'width', 'width', () => [['double', t('doubleOpt')], ['mono', t('mono')]]], ['range', 'room', 'reverb']],
  pad: [['select', 'wave', 'sound', allWaves], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'drive', 'drive', NUM4], ['range', 'room', 'reverb']],
  texture: [['select', 'sample', 'sample', allSamples], ['range', 'gain', 'volume', { ramp: 1 }], ['range', 'grit', 'grit'], ['range', 'room', 'reverb']],
  riser: [['range', 'gain', 'volume'], ['select', 'bars', 'length', () => ['2', '4', '8', '16'].map(n => [n, t('nBars', { n })])],
    ['select', 'dir', 'direction', () => [['up', t('up')], ['down', t('down')]]]],
  code: [['select', 'visual', 'visualOpt', () => VISUALS.map(v => [v, v])]],
  voice: [['select', 'speaker', 'speaker', () => [['', t('speakerDefault')], ...SPEAKERS.map(k => [k, k[0].toUpperCase() + k.slice(1)])]], ['range', 'gain', 'volume'], ['range', 'pitch', 'pitch', { min: .5, max: 2, step: .05, fmt: 'num' }], ['range', 'tempo', 'voiceTempo', { min: .25, max: 2, step: .05, fmt: 'num' }], ['cutoff', 'cutoff', 'filter'],
    ['range', 'hpf', 'lowCut', { max: 2000, step: 10, fmt: 'num' }], ['range', 'drive', 'drive', NUM4], ['range', 'room', 'reverb'], ['range', 'delay', 'delay']],
};
// the voice instrument (voice-instrument): the voice settings; no speaker named: one drawn, never the narrator's
CONTROLS.spoken = [['select', 'speaker', 'speaker', () => [['', t('speakerDrawn')], ...SPEAKERS.map(k => [k, k[0].toUpperCase() + k.slice(1)])]], ...CONTROLS.voice.slice(1)];
// suoni per strumento: quelli scelti a mano, poi tutti gli strumenti General MIDI e i synth caricati
function allWaves() {
  const map = (globalThis.soundMap && globalThis.soundMap.get && globalThis.soundMap.get()) || {}, have = new Set(WAVES.map(([k]) => k.split(',')[0]));
  const more = Object.entries(map).filter(([k, v]) => v && v.data && (v.data.type === 'soundfont' || (v.data.type === 'synth' && !/^(user|one|white|pink|brown|crackle)$/.test(k))) && !have.has(k)).map(([k]) => [k, prettyName(k)]).sort((a, b) => a[1].localeCompare(b[1]));
  return [...WAVES, ...more];
}
function allSamples() {
  const map = (globalThis.soundMap && globalThis.soundMap.get && globalThis.soundMap.get()) || {}, have = new Set([...TEXTURES, ...custom]);
  const more = Object.entries(map).filter(([k, v]) => !k.startsWith('_') && v && v.data && v.data.type === 'sample' && !(v.data.baseUrl || '').includes('tidal-drum-machines') && !have.has(k)).map(([k]) => k).sort();
  return [...TEXTURES, ...custom, ...more].map(x => [x, x]);
}
// preset di ogni tipo (nel pattern)
const PRESET_LIST = { bass: () => named(BASS), guitar: () => named(GUITAR_PATTERNS), arp: () => named(ARPS), hook: () => named(HOOKS), pad: () => named(PADS) };
const NOTE_TYPES = ['bass', 'arp', 'hook'];
// filtro su scala logaritmica 100 Hz … 20 kHz (20 kHz = aperto)
const cutToRange = c => Math.round(Math.log(c / 100) / Math.log(200) * 100);
const rangeToCut = v => Math.round(100 * Math.pow(200, v / 100));

function settingHtml([type, key, label, o]) {
  const id = `set-${key}`;
  if (type === 'select') return `<div class="ctrl" data-ctl="${key}"><label class="lbl" for="${id}">${t(label)}</label><select id="${id}" data-set="${key}"></select></div>`;
  const opt = typeof o === 'object' ? o : {};
  const attrs = type === 'cutoff' ? 'data-cut="1" min="0" max="100" step="1"' : `min="${opt.min || 0}" max="${opt.max || 1}" step="${opt.step || .01}"${opt.fmt ? ` data-fmt="${opt.fmt}"` : ''}`;
  const slider = (sid, k) => `<input type="range" id="${sid}" data-set="${k}" ${attrs}>`;
  const pin = `<button type="button" class="pin" data-pin="${key}" hidden>📌</button>`;
  const ramp = opt.ramp ? `<button type="button" class="ramp" data-set-ramp="${key}" aria-label="${esc(t('rampToggle'))}" title="${esc(t('rampToggle'))}">↗</button>` : '';
  const end = opt.ramp ? `<div class="end" data-end-for="${key}" hidden><div class="row"><label class="lbl" for="${id}End">${esc(t('endOf', { name: t(label) }))}</label><output id="${id}End-o"></output></div>${slider(id + 'End', key + 'End')}</div>` : '';
  return `<div class="ctrl" data-ctl="${key}"><div class="row"><label class="lbl" for="${id}">${t(label)}</label>${pin}${ramp}<output id="${id}-o"></output></div>${slider(id, key)}${end}</div>`;
}
// the voice style picker of a voice track's panel (voice-full-controls D3): the same list as the Voices group, the
// style the settings match, else Custom
const vstyleHtml = () => `<div class="ctrl" data-ctl="vstyle"><label class="lbl">${esc(t('voiceStyleLbl'))}</label><select data-vstyle data-no-knob>${[...Object.keys(VOICE_STYLES), 'custom'].map(s => `<option value="${s}"${s === 'custom' ? ' disabled' : ''}>${esc(t(`voiceStyle:${s}`))}</option>`).join('')}</select></div>`;
// note per gradi: una griglia passi × gradi (basso e arpeggio: note dell'accordo 0-3, hook: gradi della scala 0-7)
const noteCols = (tr, pat) => { const n = meterSteps(secFull().meter); return tr.type === 'hook' || (tr.type === 'arp' && pat.speed === '8') ? n / 2 : n; };
const noteRows = tr => tr.type === 'hook' ? [7, 6, 5, 4, 3, 2, 1, 0] : [3, 2, 1, 0];
const simpleNotes = s => !s || /^[-\d~\s]+$/.test(s);
const noteTokens = (s, n) => { const tk = (s || '').trim().split(/\s+/).filter(Boolean); return Array.from({ length: n }, (_, i) => tk.length ? tk[i % tk.length] : '~'); };

// un modulo del rack: nome, acceso/spento, codice Strudel che aggiunge, valori, ordine
const devValue = (name, v) => name === 'time' ? `${+(v * 16).toFixed(2)}/16` : String(v);
function deviceHtml(d, i, tr) {
  const spec = DEVICES[d.device]; if (!spec) return '';
  const a = deviceArgs(d), n = (tr.rack || []).length;
  return `<div class="device${d.on === false ? ' off' : ''}" data-dev="${i}">
    <div class="dev-head"><button class="led" data-dev-on="${i}" aria-pressed="${d.on !== false}" aria-label="${esc(t('onoff', { name: tx(spec.label) }))}"></button>
      <b>${esc(tx(spec.label))}</b><code data-dev-code="${i}"></code>
      <span class="dev-tools"><button class="mini" data-dev-move="${i}:-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('moveUp'))}">▲</button><button class="mini" data-dev-move="${i}:1" ${i === n - 1 ? 'disabled' : ''} aria-label="${esc(t('moveDown'))}">▼</button><button class="mini" data-dev-del="${i}" aria-label="${esc(t('remove'))}">✕</button></span></div>
    ${spec.args.length ? `<div class="dev-args">${spec.args.map(([name, kind, , lo, hi, step]) => kind === 'choice'
      ? `<div class="ctrl"><label class="lbl" for="dev-${i}-${name}">${esc(t('arg_' + name))}</label><select id="dev-${i}-${name}" data-dev-arg="${i}:${name}">${lo.map(v => `<option value="${v}"${v === a[name] ? ' selected' : ''}>${esc(devValue(name, v))}</option>`).join('')}</select></div>`
      : `<div class="ctrl"><div class="row"><label class="lbl" for="dev-${i}-${name}">${esc(t('arg_' + name))}</label><output data-dev-out="${i}:${name}"></output></div><input type="range" id="dev-${i}-${name}" data-dev-arg="${i}:${name}" min="${lo}" max="${hi}" step="${step}" value="${a[name]}"></div>`).join('')}</div>` : ''}
  </div>`;
}
function syncRack(tr, host = document) {
  (tr.rack || []).forEach((d, i) => {
    const spec = DEVICES[d.device]; if (!spec) return;
    const a = deviceArgs(d), code = host.querySelector(`[data-dev-code="${i}"]`);
    if (code) code.textContent = spec.code(a, tr.type);
    for (const [name] of spec.args) { const o = host.querySelector(`[data-dev-out="${i}:${name}"]`); if (o) o.textContent = devValue(name, a[name]); }
  });
}
// selezionando una traccia, il suo blocco nel codice viene evidenziato e portato in vista
function highlightTrack() {
  const tr = curTrack(), view = ed && ed.editor;
  if (!tr || !view || mode !== 'track') return;
  try {
    const doc = view.state.doc.toString(), head = `// ========== ${[...new Set([tr.name || tr.id, tr.type])].join(' · ')} ==========`;
    const from = doc.indexOf(head); if (from < 0) return;
    const next = doc.indexOf('\n// ========== ', from + head.length), to = next < 0 ? doc.length : next;
    view.dispatch({ selection: { anchor: from, head: to } });
    // il riquadro che scorre è #edhost, non lo scroller di CodeMirror
    const host = $('#edhost'), at = view.coordsAtPos(from);
    if (at) host.scrollTop += at.top - host.getBoundingClientRect().top - 8;
  } catch (e) {}
}

// pannello traccia nella timeline: il clip scelto (battute, pattern, elimina) o come aggiungerne uno
function clipBlock(tr) {
  const c = selClip !== null && tr.clips[selClip];
  if (!c) return `<div class="tp-plays"><span class="lbl">${t('clipLbl')}</span><p class="note">${t('timelineHint')}</p></div>`;
  const sp = spans(tr).find(x => x.c === c);
  return `<div class="tp-plays"><span class="lbl">${esc(t('clipInfo', { from: sp.s + 1, to: sp.e }))}</span>
    <div class="clip-ctl"><div class="ctrl"><label class="lbl" for="clip-start">${t('clipStart')}</label><input id="clip-start" type="number" min="1" step="1" value="${sp.s + 1}"></div>
      <div class="ctrl"><label class="lbl" for="clip-bars">${t('clipBars')}</label><input id="clip-bars" type="number" min="1" step="1" value="${sp.e - sp.s}"></div>
      <button class="btn danger" id="clip-del">${t('clipDelete')}</button></div>
    <div class="chips">${Object.keys(tr.patterns).map(k => `<button class="chip" data-clip-pat="${esc(k)}" aria-pressed="${c.pattern === k}">${esc(k)}</button>`).join('')}</div></div>`;
}
const viewSwitch = () => `<div class="tp-view chips" role="group" aria-label="${esc(t('panelView'))}"><button class="chip" data-view="full" aria-pressed="${panelView === 'full'}">${esc(t('viewFull', { name: SEC().name }))}</button><button class="chip" data-view="one" aria-pressed="${panelView === 'one'}">${t('viewOne')}</button><button class="chip" data-view="all" aria-pressed="${panelView === 'all'}">${t('viewAll')}</button></div>`;
// ogni pannello traccia ha identificativi propri (p<indice>_nome): nella vista estesa ce ne sono molti insieme
const pfx = (ti, html) => html.replace(/\b(id|for)="([^"]+)"/g, (m, a, v) => `${a}="p${ti}_${v}"`);
const role = el => ((el && el.id) || '').replace(/^p\d+_/, '');
// controlli principali di una scheda compatta (i primi disponibili per il tipo)
const QUICK = ['gain', 'cutoff', 'drive', 'room', 'delay'];
// passi che suonano in una sezione (solo lettura), per vedere chi suona su quali colpi
function hitsOf(tr, clip) {
  const n = meterSteps(secFull().meter), pat = tr.patterns[clip.pattern] || {};
  if (tr.type === 'drums') { const rows = Object.values(pat.rows || {}).map(r => fitSteps(r, n)); return Array.from({ length: n }, (_, i) => rows.some(r => r[i] === 'x') ? 'x' : '.').join(''); }
  if (['bass', 'guitar', 'arp', 'hook', 'pad'].includes(tr.type)) return channelSteps(clipState(secFull(), tr, clip), tr.type);
  return '';
}
function renderSectionRack() {
  const box = $('#track-panel'), active = T.tracks.map((tr, i) => ({ tr, i, c: cellOf(tr, sel) })).filter(x => x.c);
  box.innerHTML = `<div class="tp-top">${viewSwitch()}</div>
    <div class="tp-scope"><span class="lbl">${t('settingsScope')}</span>
      <div class="chips"><button class="chip" data-scope="track" aria-pressed="${scope === 'track'}">${t('scopeTrack')}</button><button class="chip" data-scope="section" aria-pressed="${scope === 'section'}">${esc(t('scopeSection', { name: SEC().name }))}</button></div></div>
    <div class="srack">${active.map(({ tr, i, c }) => {
      const ctls = (CONTROLS[tr.type] || []).filter(x => QUICK.includes(x[1])).slice(0, 3);
      const hits = c.clip ? hitsOf(tr, c.clip) : '';
      return `<div class="scard${tr.mute ? ' silent' : ''}" data-scard="${i}">
        <div class="sc-head" data-act-ids="${ACT_IDS[tr.type] || esc((tr.settings && tr.settings.visual) || 'fx')}">
          <span class="trk-type">${esc(TYPE_ICON[tr.type] || '·')}</span><b>${esc(trackLabel(tr))}</b>
          <button class="mini" data-cmute="${i}" aria-pressed="${!!tr.mute}" title="${esc(t('mute'))}">M</button><button class="mini" data-csolo="${i}" aria-pressed="${!!tr.solo}" title="${esc(t('solo'))}">S</button>
          <button class="btn small" data-edit-trk="${i}">${t('editTrack')}</button></div>
        <div class="chips">${c.parts ? `<span class="note">${t('customCell')}</span>` : Object.keys(tr.patterns).map(k => `<button class="chip small" data-cpat="${i}:${esc(k)}" aria-pressed="${c.clip.pattern === k}">${esc(k)}</button>`).join('') + `<button class="chip small" data-cpat="${i}:" aria-pressed="false">${t('silent')}</button>`}</div>
        ${hits ? `<div class="hits" style="grid-template-columns:repeat(${hits.length}, minmax(0, 1fr))">${[...hits].map((h, k) => `<i class="${h === 'x' ? 'on' : ''}" data-g="${Math.floor(k / 4) % 4}"></i>`).join('')}</div>` : ''}
        <div class="ctrls">${ctls.map(([type, key, label]) => {
          const attrs = type === 'cutoff' ? 'data-cut="1" min="0" max="100" step="1"' : 'min="0" max="1" step="0.01"';
          return `<div class="ctrl"><div class="row"><label class="lbl" for="cs-${i}-${key}">${t(label)}</label><output data-cs-out="${i}:${key}"></output></div><input type="range" id="cs-${i}-${key}" data-cset="${i}:${key}" ${attrs}${type !== 'cutoff' && key === 'drive' ? ' max="4" step="0.1"' : ''}></div>`;
        }).join('')}</div>
        ${(tr.rack || []).length ? `<p class="rack-sum">Rack: ${tr.rack.map(d => esc(tx((DEVICES[d.device] || { label: d.device }).label)) + (d.on === false ? ' (off)' : '')).join(' → ')}</p>` : ''}
      </div>`;
    }).join('') || `<p class="note">${t('nothingPlays')}</p>`}</div>`;
  syncSectionRack();
}
function syncSectionRack() {
  $$('#track-panel [data-cset]').forEach(inp => {
    const [i, key] = inp.dataset.cset.split(':'), tr = T.tracks[+i]; if (!tr) return;
    const v = eff(tr)[key]; if (v === null || v === undefined) return;
    if (document.activeElement !== inp) inp.value = inp.dataset.cut ? cutToRange(v) : v;
    const o = $(`[data-cs-out="${i}:${key}"]`);
    if (o) o.textContent = inp.dataset.cut ? (v >= 18000 ? '∞' : `${v} Hz`) : key === 'drive' ? String(v) : `${Math.round(v * 100)}%`;
  });
}

function renderTrackPanel() {
  if (panelView === 'all') return renderSectionRack();
  const box = $('#track-panel');
  if (!T.tracks.length) { box.innerHTML = `<div class="tp-top">${viewSwitch()}</div><p class="note">${t('noTracks')}</p>`; return; }
  // vista estesa: un pannello completo per ogni traccia che suona nella sezione selezionata
  // voice tracks have no clips: they show with the tracks of every section
  const list = panelView === 'full' ? T.tracks.map((_, i) => i).filter(i => cellOf(T.tracks[i], sel) || T.tracks[i].type === 'voice') : [tk];
  box.innerHTML = `<div class="tp-top">${viewSwitch()}</div>` + (list.length
    ? list.map(i => `<div class="tp-host${panelView === 'full' ? ' tp-full' : ''}" data-ptrk="${i}" aria-current="${i === tk}">${panelHtml(i)}</div>`).join('')
    : `<p class="note">${t('nothingPlays')}</p>`);
  $$('#track-panel [data-ptrk]').forEach(fillPanel);
}
// Compose a part (material-generator, D11): a new pattern from the song's key, chords, meter and style; the seed is
// <song id>:<track id>:<number>, so the same number gives the same part. With a preset: keep its rhythm or its notes.
const composeNums = {};
let composeEnergy = 0.5;
// a guitar track composes a riff or power chords (pattern-followups D3), remembered while the page is open
let composeGuitar = 'riff';
const composeNumOf = tr => composeNums[`${T.id}:${tr.id}`] || 1;
function composeRow(tr, pat) {
  if (!KIND_OF_TYPE[tr.type]) return '';
  const varies = pat.preset && presetOf(tr.type, pat.preset);
  return `<div class="tp-compose">
      <button class="btn small" id="pt-compose" title="${esc(t('composeTip'))}">${COMPOSE}<span>${esc(t('composePart'))}</span></button>
      <label class="tp-cnum" for="pt-cnum"><span class="lbl">#</span><input type="number" id="pt-cnum" min="1" max="9999" step="1" value="${composeNumOf(tr)}" aria-label="${esc(t('composeNum'))}" title="${esc(t('composeTip'))}"></label>
      ${tr.type === 'guitar' ? `<label class="tp-cguitar" for="pt-cguitar" title="${esc(t('composeGuitarTip'))}"><span class="lbl">${esc(t('composeGuitar'))}</span><select id="pt-cguitar">${['riff', 'chords'].map(k => `<option value="${k}"${composeGuitar === k ? ' selected' : ''}>${esc(t(`composeGuitar_${k}`))}</option>`).join('')}</select></label>` : ''}
      <div class="ctrl tp-cen" title="${esc(t('composeEnergyTip'))}"><div class="row"><label class="lbl" for="pt-cenergy">${esc(t('composeEnergy'))}</label><output id="pt-cenergy-o">${Math.round(composeEnergy * 100)}%</output></div><input type="range" id="pt-cenergy" min="0" max="1" step="0.05" value="${composeEnergy}"></div>
      ${varies ? `<button class="btn small" id="pt-keep-rhythm" title="${esc(t('keepRhythmTip'))}">${RHYTHM}<span>${esc(t('keepRhythm'))}</span></button><button class="btn small" id="pt-keep-notes" title="${esc(t('keepNotesTip'))}">${NOTES}<span>${esc(t('keepNotes'))}</span></button>` : ''}
    </div>`;
}
// the style of the song for the generator: its first style tag, else the style closest to its tempo and meter
function composeStyle() {
  const tag = ((T.tags || {}).styles || []).map(styleId).find(id => RECIPES.some(r => r.id === id));
  const id = tag || (RECIPES.length ? stylesNear(T, RECIPES)[0] : null);
  return RECIPES.find(r => r.id === id) || null;
}
// a new pattern on the next letter, selected; keep: null (compose), 'rhythm' or 'notes' (vary the preset)
const composedShapes = {};
const melodyShapeOf = (why = []) => why.some(w => /^polymeter/.test(w)) ? 'polymeter' : why.includes("tail A A A A'") ? 'tail' : why.includes('call and response') ? 'call-response' : null;
function composePattern(tr, keep = null) {
  const sec = secFull(), cur = tr.patterns[patOf(tr)] || {}, n = composeNumOf(tr), kind = KIND_OF_TYPE[tr.type];
  const R = composeStyle(), part = R && R[tr.type] ? R[tr.type] : {};
  const ch = eff(tr), harmony = { key: sec.key, mode: (tr.type === 'hook' && ch.mode) || 'minor', chords: sec.chords, shared: T.shared || {} };
  const riff = tr.type === 'guitar' && !keep ? { riff: composeGuitar === 'riff' } : {};
  const out = compose(kind, { seed: `${T.id}:${tr.id}:${n}`, style: part.material || {}, harmony, meter: sec.meter, energy: composeEnergy, type: tr.type, ...riff, ...(keep ? { from: cur.preset, keep } : {}) });
  if (!out || !out.idea) { toast(t('composeNone')); return; }
  let idea = out.idea;
  // a drum track with only the kick (or without it) keeps its rows: the kick and the beat are often two tracks
  if (tr.type === 'drums') {
    const rows = cur.rows ? Object.keys(cur.rows) : cur.idea && cur.idea.beat ? Object.keys(cur.idea.beat).filter(k => k !== 'grid') : [];
    const { grid, bd, ...rest } = idea.beat;
    if (rows.length && rows.every(r => r === 'bd')) idea = { beat: { grid, bd } };
    else if (rows.length && !rows.includes('bd')) idea = { beat: { grid, ...rest } };
  }
  const k = nextKey(tr);
  tr.patterns[k] = { ...(tr.type === 'arp' && cur.speed ? { speed: cur.speed } : {}), idea };
  composeNums[`${T.id}:${tr.id}`] = n + 1;
  // the shape of a composed melody (changed tail, call and response, polymeter), shown in the toast and on the
  // pattern's chip until the page reloads (#76: kept out of the song format)
  const shape = melodyShapeOf(out.why);
  if (shape) composedShapes[`${T.id}:${tr.id}:${k}`] = shape;
  editPat = k; changed(); renderTrackPanel();
  toast(t('composedPart', { p: k, n }) + (shape ? ` · ${t(`melodyShape:${shape}`)}` : ''));
}
// Patterns (pattern-library, D5 and D7): the listen button next to a track's preset menu opens its pattern in the
// Patterns tab with the track's sound, the section's key and progression and the song's tempo (the song stops); Save as
// pattern keeps the selected pattern among the user's own, with the context of the section it first plays in
// the "over" settings of a track's pattern: the track's sound and settings, the selected section's key, progression,
// meter and tempo (shared by the listen button and the pattern preview, pattern-preview D2)
function patternOver(tr) {
  const sec = secFull(), e = eff(tr);
  return { sound: e[soundKey(tr.type)], key: sec.key, chords: sec.chords, meter: sec.meter, bpm: sec.bpm, ...(tr.type === 'hook' ? { mode: e.mode } : {}), settings: { ...e } };
}
function listenPattern(tr) {
  const key = patOf(tr), pat = tr.patterns[key] || {}, over = patternOver(tr);
  stop();
  const plain = pat.preset && !pat.idea && !pat.steps && !pat.notes;
  let ok = false;
  if (plain) ok = patternsTab.open({ kind: kindOfPreset(tr.type, pat.preset), id: pat.preset, over });
  if (!ok) {
    const draft = savedFromTrack(T, tr, key, { name: `${trackLabel(tr)} · ${T.title}`, fallback: songStyleFallback() });
    ok = patternsTab.open({ item: { kind: draft.kind, type: tr.type, name: draft.name, pattern: draft.pattern, sound: draft.sound, settings: draft.settings, context: draft.context, defaults: { ...KIND_DEFAULTS[draft.kind] }, styles: draft.styles, draft }, over });
  }
  showTab('pattern');
}
// ---------- the pattern preview (pattern-preview) ----------
// a small second player for the selected pattern of a track: its 4-bar loop (loopSong, without the beat, with the
// track's rack), with the track's sound and level and the selected section's harmony and tempo. It rides the song's
// scheduler while the song plays and plays alone while it is stopped (src/player/preview.js); it never changes the
// player bar. Tracks with a preset or groove menu only (code and texture tracks come later, owner decision 5).
const PREVIEW_TYPES = tr => tr && (tr.type === 'drums' || !!PRESET_LIST[tr.type]);
function previewSource(id, key) {
  const tr = T.tracks.find(x => x.id === id);
  if (!PREVIEW_TYPES(tr)) return null;
  // (the pattern it played was deleted: it stops)
  if (key && !tr.patterns[key]) return null;
  // the selected pattern while its track is the one being edited, else the one it was playing
  const k = tr === curTrack() ? patOf(tr) : key && tr.patterns[key] ? key : null;
  if (!k || !tr.patterns[k]) return null;
  const over = patternOver(tr);
  const loop = loopSong({ kind: Object.keys(KIND_TYPE).find(k => KIND_TYPE[k] === tr.type), type: tr.type, pattern: tr.patterns[k], name: trackLabel(tr) }, { ...over, beat: false, rack: tr.rack });
  // riding, the loop starts with the selected section: the compiler starts a section's progression on its first bar
  const shift = sceneStart(sel);
  const orbit = previewOrbit(T.tracks);
  return { song: T.id, key: k, loop, bpm: over.bpm, shift, orbit, sig: JSON.stringify([loop, shift, orbit]) };
}
preview = createPreview({
  sched, busy: () => !!(rec || capture || fastJob),
  source: previewSource, compile: loop => compileSong(loop),
  onChange: () => syncPreviewButtons(),
});
function syncPreviewButtons() {
  if (!preview) return;
  const st = preview.state, busy = !!(rec || capture || fastJob);
  $$('#track-panel .pt-preview').forEach(b => {
    const host = b.closest('[data-ptrk]'), tr = host ? T.tracks[+host.dataset.ptrk] : null, on = !!(st && tr && st.id === tr.id);
    if (b.getAttribute('aria-pressed') !== String(on)) {
      b.setAttribute('aria-pressed', on); b.innerHTML = on ? STOP : LISTEN;
      const tip = t(on ? 'ptPreviewStop' : 'ptPreview'); b.title = tip; b.setAttribute('aria-label', tip);
    }
    if (b.disabled !== busy) b.disabled = busy;
  });
}
function previewBtn(tr) { const on = !!(preview && preview.state && preview.state.id === tr.id), tip = esc(t(on ? 'ptPreviewStop' : 'ptPreview')); return `<button type="button" class="btn small icon pt-preview" id="pt-preview" aria-pressed="${on}" title="${tip}" aria-label="${tip}"${rec || capture || fastJob ? ' disabled' : ''}>${on ? STOP : LISTEN}</button>`; };
// for the browser checks (tools/check-preview.cjs)
globalThis.codingMiskPreview = preview;
// (and what the bar counter counts: the song in Compose, written or grown, and the song playing)
globalThis.codingMiskBars = () => ({ compose: { bars: compiled.meta.bars, pending: !!compiled.pending, growth: growBars(), cue: cueBar() }, song: song && song.meta ? { id: song.id, bars: song.meta.bars, loop: !!song.loop } : null });
// the styles a pattern saved from a song with no style tags links (pattern-followups D1): its artist's, or the styles
// its style line names
const songStyleFallback = () => fallbackStyles(T, { recipes: RECIPES, artists: [...BUILTIN_ARTISTS, ...(store.get('coding-misk-artists', []) || [])] });
function savePattern(tr) {
  const saved = patternsStore.add(savedFromTrack(T, tr, patOf(tr), { name: `${trackLabel(tr)} · ${T.title}`, fallback: songStyleFallback() }));
  toast(t('ptSavedPattern', { name: saved.name }), { label: t('ptOpenTab'), run: () => { showTab('pattern'); patternsTab.open({ saved: saved.id }); } });
}
function panelHtml(ti) {
  const tr = T.tracks[ti];
  const key = patOf(tr), pat = tr.patterns[key] || {}, c = cellOf(tr, sel), n = meterSteps(secFull().meter);
  const cols = `style="grid-template-columns:repeat(${n}, minmax(0, 1fr))"`;
  const stepBtns = (attr, label) => Array.from({ length: n }, (_, i) => `<button type="button" class="step" data-g="${Math.floor(i / 4) % 4}" ${attr}="${i}" aria-label="${esc(t('stepAria', { name: label, n: i + 1 }))}"></button>`).join('');
  let editor = '';
  if (tr.type === 'drums') {
    editor = `<div class="ctrl"><label class="lbl" for="pt-groove">${t('groove')}</label><div class="pt-presetrow"><select id="pt-groove"></select><button type="button" class="btn small icon pt-listen" id="pt-listen" title="${esc(t('ptListen'))}" aria-label="${esc(t('ptListen'))}">${FLASK}</button>${previewBtn(tr)}</div></div>
      <div class="seq"><span></span><div class="stepnums" ${cols}>${Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
      ${ROWS.map(([id, label]) => `<span class="rowlbl">${label}</span><div class="steps" ${cols}>${Array.from({ length: n }, (_, i) => `<button type="button" class="step" data-g="${Math.floor(i / 4) % 4}" data-row="${id}" data-i="${i}" aria-label="${esc(t('stepAria', { name: label, n: i + 1 }))}"></button>`).join('')}</div>`).join('')}</div>
      <p class="idea-code" id="pt-idea" hidden></p>`;
  } else if (PRESET_LIST[tr.type]) {
    editor = `<div class="pt-top"><div class="ctrl"><label class="lbl" for="pt-preset">${t('preset')}</label><div class="pt-presetrow"><select id="pt-preset"></select><button type="button" class="btn small icon pt-listen" id="pt-listen" title="${esc(t('ptListen'))}" aria-label="${esc(t('ptListen'))}">${FLASK}</button>${previewBtn(tr)}</div></div>
      ${tr.type === 'arp' ? `<div class="ctrl"><label class="lbl" for="pt-speed">${t('speed')}</label><select id="pt-speed"><option value="16">${t('sixteenths')}</option><option value="8">${t('eighths')}</option></select></div>` : ''}</div>
      <div class="chsteps" data-n="${n}"${tr.type === 'hook' || tr.type === 'arp' ? ` title="${esc(t('stepsMaskHint'))}"` : ''}><div class="row"><span class="lbl">${t('chSteps')}</span><span class="hint" id="pt-steps-state"></span><button type="button" class="btn small" id="pt-steps-reset">${t('stepsReset')}</button></div>
        <div class="steps" ${cols}>${stepBtns('data-ps', t(tr.type))}</div>
        <p class="idea-code" id="pt-idea" hidden></p></div>`;
    if (NOTE_TYPES.includes(tr.type)) {
      const nc = noteCols(tr, pat), ncols = `style="grid-template-columns:repeat(${nc}, minmax(0, 1fr))"`;
      editor += `<div class="notes"><div class="row"><span class="lbl">${t('notesLbl')}</span><span class="hint">${t(tr.type === 'hook' ? 'notesHintHook' : 'notesHintChord')}</span><button type="button" class="btn small" id="pt-notes-reset">${t('notesReset')}</button></div>
        <div class="notegrid${simpleNotes(pat.notes) ? '' : ' locked'}">${noteRows(tr).map(d => `<span class="rowlbl">${tr.type === 'hook' ? d : t('deg' + d)}</span><div class="steps" ${ncols}>${Array.from({ length: nc }, (_, i) => `<button type="button" class="step note" data-g="${Math.floor(i / (nc / (n / 4))) % 4}" data-nd="${d}" data-ni="${i}" aria-label="${esc(`${d} · ${i + 1}`)}"></button>`).join('')}</div>`).join('')}</div>
        <input id="pt-notes" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(t('notesPlaceholder'))}"></div>`;
    }
  } else if (tr.type === 'texture') {
    editor = `<div class="ctrl"><label class="lbl" for="pt-rhythm">${t('rhythm')}</label><select id="pt-rhythm"></select></div>`;
  } else if (tr.type === 'code') {
    editor = `<label class="lbl" for="pt-code">${t('codeLbl')}</label><textarea id="pt-code" rows="5" spellcheck="false"></textarea><p class="note">${t('codeHint')}</p>`;
  } else if (tr.type === 'spoken') {
    editor = spokenEditor(tr, key, pat);
  } else if (tr.type === 'voice') {
    // the phrases this voice speaks: the comments of the live build steps
    const steps = compiled.build ? buildSteps(compiled.build).filter(x => x.say && voiceOf(T, x) === tr) : [];
    editor = `<p class="note">${t('voiceHint')}</p>${steps.length ? `<ul class="voice-lines">${steps.map(x => `<li><b>${t('liveMark', { n: x.at + 1 })}</b> ${esc(sayText(x.say, getLang()))}</li>`).join('')}</ul>` : `<p class="note">${t('voiceNone')}</p>`}`;
  } else editor = `<p class="note">${t('riserHint')}</p>`;
  const custom = c && c.parts;
  return pfx(ti, `
    <div class="tp-head">
      <span class="trk-type big">${esc(TYPE_ICON[tr.type] || '·')}</span>
      <div class="ctrl grow"><label class="lbl" for="tk-name">${t('trackName')} · ${esc(t(tr.type))}</label><input id="tk-name" type="text" maxlength="40" autocomplete="off"></div>
      <div class="actions">
        <button class="btn icon" id="tk-up" aria-label="${esc(t('moveUp'))}" ${ti === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn icon" id="tk-down" aria-label="${esc(t('moveDown'))}" ${ti === T.tracks.length - 1 ? 'disabled' : ''}>▼</button>
        <button class="btn" id="tk-dup">${t('duplicate')}</button>
        <button class="btn danger" id="tk-del">${t('removeTrack')}</button>
      </div>
    </div>
    ${tr.type === 'voice' ? '' : arrMode === 'timeline' ? clipBlock(tr) : `<div class="tp-plays"><span class="lbl">${esc(t('playsIn', { name: SEC().name }))}</span>
      <div class="chips">${custom ? `<span class="note">${t('customCell')}</span>` : `<button class="chip" data-play-pat="" aria-pressed="${!c}">${t('silent')}</button>${Object.keys(tr.patterns).map(k => `<button class="chip" data-play-pat="${esc(k)}" aria-pressed="${!!(c && c.clip && c.clip.pattern === k)}">${esc(k)}</button>`).join('')}`}</div></div>`}
    ${tr.type === 'voice' ? '' : `<div class="tp-pats tp-pats-song"><span class="lbl">${esc(t('patsSong'))}</span>
      <div class="chips">${Object.keys(tr.patterns).map(k => { const sh = composedShapes[`${T.id}:${tr.id}:${k}`]; return `<button class="chip" data-edit-pat="${esc(k)}" aria-pressed="${k === key}"${sh ? ` title="${esc(t('melodyShapeTip', { shape: t(`melodyShape:${sh}`) }))}"` : ''}>${esc(k)}</button>`; }).join('')}
        <button class="chip" id="pt-del">${t('deletePattern')}</button></div>
      <p class="note">${esc(t('editingPattern', { p: key }))}</p></div>
    <div class="tp-pats tp-pats-make"><span class="lbl">${esc(t('patsMake'))}</span>
      <div class="chips"><button class="chip" id="pt-new">${t('newPattern')}</button>${PATTERN_TYPES.includes(tr.type) ? `<button class="chip pt-savepat" id="pt-savepat" title="${esc(t('ptSaveTip'))}">${KEEP}<span>${esc(t('ptSaveAs'))}</span></button>` : ''}</div>
      ${composeRow(tr, pat)}</div>`}
    <div class="tp-editor">${editor}</div>
    <div class="tp-scope"${tr.type === 'voice' ? ' hidden' : ''}><span class="lbl">${t('settingsScope')}</span>
      <div class="chips"><button class="chip" data-scope="track" aria-pressed="${scope === 'track'}">${t('scopeTrack')}</button><button class="chip" data-scope="section" aria-pressed="${scope === 'section'}" ${focusClip(tr) ? '' : 'disabled'}>${esc(arrMode === 'timeline' && selClip !== null ? t('scopeClip') : t('scopeSection', { name: SEC().name }))}</button></div></div>
    <div class="ctrls">${tr.type === 'voice' || tr.type === 'spoken' ? vstyleHtml() : ''}${(CONTROLS[tr.type] || []).map(settingHtml).join('')}</div>
    <div class="tp-rack"><div class="row"><span class="lbl">Rack</span><span class="hint">${t('rackHint')}</span></div>
      <div class="rack-list">${(tr.rack || []).map((d, i) => deviceHtml(d, i, tr)).join('') || `<p class="note">${t('noDevices')}</p>`}</div>
      <div class="rack-add"><select id="rk-type" aria-label="${esc(t('addDevice'))}">${['note', 'sound'].map(kind => `<optgroup label="${esc(t(kind === 'note' ? 'devNote' : 'devSound'))}">${Object.entries(DEVICES).filter(([, d]) => d.kind === kind).map(([k, d]) => `<option value="${k}">${esc(tx(d.label))}</option>`).join('')}</optgroup>`).join('')}</select><button class="btn" id="rk-add">${t('addDevice')}</button></div>
    </div>`);
}
// the line of a voice instrument's pattern (voice-instrument): how it speaks, its text (own, or drawn from the
// vocabulary), the values of its way, and where it speaks in the song with the words it says now
function spokenEditor(tr, key, pat) {
  const lang = getLang(), src = typeof pat.text === 'string' && pat.text.startsWith('vocab:') ? pat.text : pat.text ? 'own' : 'auto';
  const txt = l => (!pat.text || src !== 'own' ? '' : typeof pat.text === 'string' ? (l === 'en' ? pat.text : '') : pat.text[l] || '');
  let placed = [];
  try { placed = placeSpoken(T, lang).filter(p => p.track === tr.id && p.key === key); } catch (e) { placed = []; }
  const bars = [...new Set(placed.flatMap(p => p.starts.map(s => s.bar + 1)))].sort((a, b) => a - b), said = placed[0] ? placed[0].texts.join(' · ') : '';
  const others = T.tracks.filter(x => x !== tr && x.type !== 'voice' && x.type !== 'spoken');
  const sel = (id, label, list, v) => `<div class="ctrl"><label class="lbl" for="${id}">${esc(label)}</label><select id="${id}">${list.map(([k, l]) => `<option value="${esc(k)}"${String(v) === String(k) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  const way = WAYS.includes(pat.way) ? pat.way : 'passage';
  // the voice instrument of this track (voice-placement): the same controls as the Voices group; a change rewrites the
  // track's lines and clips
  return `<div class="tp-vinst"><span class="lbl">${esc(t('vinstLbl'))}</span><p class="hint muted small">${esc(t('vinstSongHint2'))}</p>${voicePanel(trackVoice(tr), { t, esc, mode: 'track', track: tr.id })}${phraseListHtml(tr, '')}</div>
    <p class="note">${esc(t('spokenHint'))}</p>
    <div class="sp-grid">
      ${sel('sp-way', t('spokenWay'), WAYS.map(w => [w, t(`way:${w}`)]), way)}
      ${sel('sp-src', t('spokenSource'), [['own', t('spokenOwn')], ['auto', t('spokenAuto')], ...VOCAB_GROUPS.map(g => [`vocab:${g}`, t('spokenVocab', { g: t(`vocab:${g}`) })])], src)}
      ${way === 'refrain' ? `<div class="ctrl"><label class="lbl" for="sp-every">${esc(t('spokenEvery'))}</label><input id="sp-every" type="number" min="1" max="64" step="1" value="${pat.every || 4}"></div>` : ''}
      ${way === 'chop' ? `<div class="ctrl"><label class="lbl" for="sp-slices">${esc(t('spokenSlices'))}</label><input id="sp-slices" type="number" min="2" max="32" step="1" value="${pat.slices || 8}"></div>
        <div class="ctrl sp-wide"><label class="lbl" for="sp-rhythm">${esc(t('spokenRhythm'))}</label><input id="sp-rhythm" type="text" spellcheck="false" autocomplete="off" value="${esc(pat.rhythm || '0 1 2 3 4 5 6 7')}"></div>` : ''}
      ${way === 'passage' || way === 'opening' ? sel('sp-before', t('spokenBefore'), [['', t('spokenNoBefore')], ...others.map(x => [x.id, trackLabel(x)])], pat.before || '') : ''}
    </div>
    ${src === 'own' ? `<div class="sp-texts"><div class="ctrl"><label class="lbl" for="sp-en">${esc(t('spokenTextEn'))}</label><input id="sp-en" type="text" maxlength="120" autocomplete="off" value="${esc(txt('en'))}"></div>
      <div class="ctrl"><label class="lbl" for="sp-it">${esc(t('spokenTextIt'))}</label><input id="sp-it" type="text" maxlength="120" autocomplete="off" value="${esc(txt('it'))}"></div></div>` : ''}
    <p class="note sp-where">${bars.length ? esc(t('spokenWhere', { bars: bars.join(', '), text: said })) : esc(t('spokenNowhere'))}</p>`;
}
const panelQ = host => name => host.querySelector(`#p${host.dataset.ptrk}_${name}`);
// riempie i menu di un pannello e lo allinea ai dati
function fillPanel(host) {
  const tr = T.tracks[+host.dataset.ptrk], q = panelQ(host);
  if (q('pt-groove')) opts(q('pt-groove'), [['', t('pickGroove')], ...Object.entries(GROOVES).map(([k, v]) => [k, v[0]])]);
  if (q('pt-preset')) opts(q('pt-preset'), PRESET_LIST[tr.type]());
  if (q('pt-rhythm')) opts(q('pt-rhythm'), named(TEX_RHYTHMS));
  host.querySelectorAll('select[data-set]').forEach(s => { const ctl = (CONTROLS[tr.type] || []).find(x => x[1] === s.dataset.set); if (ctl) opts(s, ctl[3]()); });
  syncPanel(host);
}
function syncTrackPanel() {
  if (panelView === 'all') return syncSectionRack();
  $$('#track-panel [data-ptrk]').forEach(syncPanel);
}
function syncPanel(host) {
  const tr = T.tracks[+host.dataset.ptrk], q = panelQ(host); if (!tr || !q('tk-name')) return;
  const key = patOf(tr), pat = tr.patterns[key] || {}, e = eff(tr), c = focusClip(tr), over = (c && c.set) || {};
  const all = sel2 => host.querySelectorAll(sel2), active = el => document.activeElement === el;
  if (!active(q('tk-name'))) q('tk-name').value = trackLabel(tr);
  all('[data-set]').forEach(i => {
    const v = e[i.dataset.set]; if (v === null || v === undefined) return;
    if (!active(i)) i.value = i.dataset.cut ? cutToRange(v) : v;
    const o = host.querySelector('#' + i.id + '-o');
    if (o && i.type === 'range') o.textContent = i.dataset.cut ? (v >= 18000 ? '∞' : `${v} Hz`) : i.dataset.fmt === 'num' ? String(v) : `${Math.round(v * 100)}%`;
  });
  all('[data-vstyle]').forEach(x => { if (!active(x)) x.value = styleOf(e); });
  all('[data-set-ramp]').forEach(b => { const on = e[b.dataset.setRamp + 'End'] != null; b.setAttribute('aria-pressed', on); const end = host.querySelector(`[data-end-for="${b.dataset.setRamp}"]`); if (end) end.hidden = !on; });
  // values the live build steps change: a pin shows whether the track's own value is fixed against them
  const sk = compiled.build ? stepKeys(compiled.build, tr.id) : {};
  all('[data-pin]').forEach(b => {
    const k = b.dataset.pin, on = (tr.pinned || []).includes(k), bars = (sk[k] || []).map(x => x + 1).join(', ');
    b.hidden = !bars && !on; b.setAttribute('aria-pressed', on);
    b.title = on ? t('pinOn') : t('pinOff', { bars });
  });
  all('[data-ctl]').forEach(x => x.classList.toggle('over', Object.keys(over).some(k => k === x.dataset.ctl || k === x.dataset.ctl + 'End')));
  // an idea (idea-model): the step row shows what it plays, a read-only line shows it as code
  const drumRows = tr.type === 'drums' && pat.idea && !pat.rows ? ideaRows(pat.idea, meterSteps(secFull().meter)) : pat.rows || {};
  if (tr.type === 'drums') all('[data-row]').forEach(b => b.setAttribute('aria-pressed', (drumRows[b.dataset.row] || '')[b.dataset.i] === 'x'));
  if (q('pt-idea')) {
    q('pt-idea').hidden = !pat.idea;
    if (pat.idea) { q('pt-idea').textContent = ideaCode(patState(tr), tr.type, T.shared || {}); q('pt-idea').title = t('ideaCodeHint'); }
  }
  if (q('pt-preset')) q('pt-preset').value = pat.preset || (DEFAULT_PATTERN[tr.type] ? DEFAULT_PATTERN[tr.type]().preset : '') || '';
  if (q('pt-speed')) q('pt-speed').value = pat.speed || '16';
  if (q('pt-rhythm')) q('pt-rhythm').value = pat.rhythm || 'bar';
  if (q('pt-code') && !active(q('pt-code'))) q('pt-code').value = pat.code || '';
  if (host.querySelector('[data-ps]')) {
    const steps = channelSteps(patState(tr), tr.type);
    all('[data-ps]').forEach(b => b.setAttribute('aria-pressed', steps[b.dataset.ps] === 'x'));
    q('pt-steps-state').textContent = pat.steps ? t('stepsCustom') : pat.idea ? t('stepsIdea') : t('stepsPreset');
    q('pt-steps-reset').disabled = !pat.steps;
  }
  if (q('pt-notes')) {
    if (!active(q('pt-notes'))) q('pt-notes').value = pat.notes || '';
    const tokens = noteTokens(pat.notes, noteCols(tr, pat));
    all('[data-nd]').forEach(b => b.setAttribute('aria-pressed', simpleNotes(pat.notes) && !!pat.notes && tokens[b.dataset.ni] === b.dataset.nd));
    q('pt-notes-reset').disabled = !pat.notes;
  }
  syncRack(tr, host);
}
// scrive un'impostazione: per tutta la traccia, o solo per il clip della sezione selezionata
function setSetting(k, v, tr = curTrack()) {
  const c = focusClip(tr);
  // (a voice's sound is one value, its track's settings: never a clip's, voice-full-controls D1)
  if (scope === 'section' && c && tr.type !== 'voice' && tr.type !== 'spoken') { c.set = { ...(c.set || {}), [k]: v }; return; }
  tr.settings[k] = v;
  if (c && c.set) { delete c.set[k]; if (!Object.keys(c.set).length) delete c.set; }
  // a value the live build steps would change: changing it fixes it, so it wins over the steps until unpinned
  const base = k.replace(/End$/, '');
  if (compiled.build && stepKeys(compiled.build, tr.id)[base] && !(tr.pinned || []).includes(base)) tr.pinned = [...(tr.pinned || []), base];
}
const editPattern = fn => { const tr = curTrack(), key = patOf(tr); tr.patterns[key] = tr.patterns[key] || {}; fn(tr.patterns[key], tr); changed(); syncTrackPanel(); };

// il pannello dove avviene l'azione diventa la traccia selezionata (nella vista estesa ce ne sono tanti)
function hostTrack(e) {
  const host = e.target.closest('[data-ptrk]'); if (!host) return false;
  const ti = +host.dataset.ptrk;
  if (ti !== tk) { tk = ti; editPat = null; selClip = null; saveDraft(); renderArranger(); $$('#track-panel [data-ptrk]').forEach(h => h.setAttribute('aria-current', +h.dataset.ptrk === tk)); }
  return true;
}
$('#track-panel').addEventListener('input', e => {
  if (e.target.dataset.cset) { const [i, key] = e.target.dataset.cset.split(':'); const v = e.target.dataset.cut ? rangeToCut(+e.target.value) : +e.target.value; setSetting(key, v, T.tracks[+i]); changed(); syncSectionRack(); return; }
  if (!hostTrack(e)) return;
  if (e.target.dataset.devArg && e.target.type === 'range') { const [i, name] = e.target.dataset.devArg.split(':'); curTrack().rack[+i][name] = +e.target.value; changed(); syncRack(curTrack(), e.target.closest('[data-ptrk]')); return; }
  const k = e.target.dataset.set;
  if (k) { let v = e.target.value; if (e.target.type === 'range') v = e.target.dataset.cut ? rangeToCut(+v) : +v; setSetting(k, v); changed(); syncTrackPanel(); return; }
  if (role(e.target) === 'tk-name') { curTrack().name = e.target.value; changed(); return; }
  if (role(e.target) === 'pt-cnum') { const v = Math.round(+e.target.value); if (v >= 1) composeNums[`${T.id}:${curTrack().id}`] = v; return; }
  if (role(e.target) === 'pt-cguitar') { composeGuitar = e.target.value === 'chords' ? 'chords' : 'riff'; return; }
  if (role(e.target) === 'pt-cenergy') { composeEnergy = +e.target.value; const o = e.target.closest('.tp-cen').querySelector('output'); if (o) o.textContent = `${Math.round(composeEnergy * 100)}%`; return; }
  if (role(e.target) === 'pt-code') { const v = e.target.value; clearTimeout(codeTimer); codeTimer = setTimeout(() => editPattern(p => { p.code = v; }), 400); return; }
  if (role(e.target) === 'pt-notes') { const v = e.target.value.trim(); if (!v || /^[-\d~\s[\]<>]+$/.test(v)) editPattern(p => { if (v) p.notes = v; else delete p.notes; }); }
});
let codeTimer = 0;
$('#track-panel').addEventListener('change', e => {
  if (!hostTrack(e)) return;
  const tr = curTrack(), r = role(e.target);
  if (e.target.matches('select[data-set]')) { setSetting(e.target.dataset.set, e.target.value); changed(); syncTrackPanel(); return; }
  // a voice style (voice-full-controls D3): its seven values at once, speaker and volume kept
  if (e.target.matches('select[data-vstyle]')) { const st = VOICE_STYLES[e.target.value]; if (st) { for (const [k, v] of Object.entries(st)) setSetting(k, v, tr); changed(); syncTrackPanel(); } return; }
  if ((r === 'clip-start' || r === 'clip-bars') && selClip !== null && tr.clips[selClip]) {
    const c = tr.clips[selClip], sp = spanOf(tr, c);
    const start = r === 'clip-start' ? Math.round(+e.target.value) - 1 : sp.s, bars = r === 'clip-bars' ? Math.round(+e.target.value) : sp.e - sp.s;
    setClipSpan(tr, c, start, bars); changed(); renderTrackPanel(); return;
  }
  if (e.target.matches('select[data-dev-arg]')) { const [i, name] = e.target.dataset.devArg.split(':'); const v = e.target.value; tr.rack[+i][name] = isNaN(+v) ? v : +v; changed(); syncRack(tr, e.target.closest('[data-ptrk]')); return; }
  if (r === 'pt-preset') editPattern(p => { p.preset = e.target.value; delete p.steps; delete p.idea; });
  if (r === 'pt-speed') { editPattern(p => { p.speed = e.target.value; delete p.steps; }); renderTrackPanel(); }
  if (r === 'pt-rhythm') editPattern(p => { p.rhythm = e.target.value; });
  // the voice instrument's line (voice-instrument)
  if (r.startsWith('sp-')) {
    const v = e.target.value, num = Math.round(+v);
    editPattern(p => {
      if (r === 'sp-way') { p.way = v; if (v !== 'refrain') delete p.every; if (v !== 'chop') { delete p.slices; delete p.rhythm; } if (v !== 'passage' && v !== 'opening') delete p.before; }
      if (r === 'sp-src') { if (v === 'own') p.text = { en: getLang() === 'it' ? '' : '…', it: getLang() === 'it' ? '…' : '' }; else if (v === 'auto') delete p.text; else p.text = v; if (p.text && typeof p.text === 'object') p.text = Object.fromEntries(Object.entries(p.text).filter(([, x]) => x)); }
      if (r === 'sp-en' || r === 'sp-it') { const k = r.slice(3), cur = p.text && typeof p.text === 'object' ? { ...p.text } : typeof p.text === 'string' && !p.text.startsWith('vocab:') ? { en: p.text } : {}; if (v.trim()) cur[k] = v.trim(); else delete cur[k]; if (Object.keys(cur).length) p.text = cur; else delete p.text; }
      if (r === 'sp-every' && num >= 1) p.every = Math.min(64, num);
      if (r === 'sp-slices' && num >= 2) p.slices = Math.min(32, num);
      if (r === 'sp-rhythm') { const ok = v.trim().split(/\s+/).every(x => x === '~' || (/^\d+$/.test(x) && +x < (p.slices || 8))); if (ok) p.rhythm = v.trim().replace(/\s+/g, ' '); else toast(t('spokenRhythmBad')); }
      if (r === 'sp-before') { if (v) p.before = v; else delete p.before; }
    });
    renderTrackPanel();
    return;
  }
  if (r === 'pt-groove') { const g = GROOVES[e.target.value]; if (g) editPattern(p => { p.rows = Object.fromEntries(Object.entries(g[1]).filter(([, v]) => v.includes('x')).map(([k, v]) => [k, fitSteps(v, meterSteps(secFull().meter))])); }); e.target.value = ''; }
  if (r === 'tk-name' && !tr.name.trim()) { tr.name = t(tr.type); changed(); renderArranger(); }
});
$('#track-panel').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.view) { panelView = b.dataset.view; store.set('coding-misk-panel', panelView); renderTrackPanel(); return; }
  if (b.dataset.editTrk !== undefined) { panelView = 'one'; store.set('coding-misk-panel', panelView); tk = +b.dataset.editTrk; editPat = null; saveDraft(); renderArranger(); renderTrackPanel(); highlightTrack(); return; }
  if (b.dataset.cmute !== undefined) { const x = T.tracks[+b.dataset.cmute]; x.mute = !x.mute || undefined; changed(); renderTrackPanel(); return; }
  if (b.dataset.csolo !== undefined) { const x = T.tracks[+b.dataset.csolo]; x.solo = !x.solo || undefined; changed(); renderTrackPanel(); return; }
  if (b.dataset.cpat !== undefined) {
    const [i, k] = b.dataset.cpat.split(':'), x = T.tracks[+i], c = wholeClip(x, sel);
    if (!k) x.clips = x.clips.filter(y => y !== c); else if (c) c.pattern = k;
    changed(); renderTrackPanel(); return;
  }
  if (b.dataset.scope && panelView === 'all') { scope = b.dataset.scope; renderTrackPanel(); return; }
  if (!hostTrack(e)) return;
  const tr = curTrack(); if (!tr) return;
  const r = role(b);
  const n = meterSteps(secFull().meter);
  // editing the steps of an idea writes them out: the pattern keeps the steps, the idea goes (idea-model)
  const writeOut = p => { if (p.idea) { delete p.idea; toast(t('ideaWrittenOut')); } };
  if (b.dataset.row) return editPattern(p => { if (p.idea && !p.rows) p.rows = Object.fromEntries(Object.entries(ideaRows(p.idea, n)).filter(([, v]) => v.includes('x'))); writeOut(p); p.rows = p.rows || {}; const a = fitSteps(p.rows[b.dataset.row] || '', n).split(''); a[+b.dataset.i] = a[+b.dataset.i] === 'x' ? '.' : 'x'; const s = a.join(''); if (s.includes('x')) p.rows[b.dataset.row] = s; else delete p.rows[b.dataset.row]; });
  if (b.dataset.ps !== undefined) return editPattern((p, t2) => { const a = channelSteps(patState(t2), t2.type).split(''); a[+b.dataset.ps] = a[+b.dataset.ps] === 'x' ? '.' : 'x'; p.steps = a.join(''); writeOut(p); });
  if (r === 'pt-steps-reset') return editPattern(p => { delete p.steps; });
  if (b.dataset.nd !== undefined) {
    const pat = tr.patterns[patOf(tr)] || {};
    if (!simpleNotes(pat.notes)) return toast(t('notesLocked'));
    return editPattern((p, t2) => { const tk2 = noteTokens(p.notes, noteCols(t2, p)); tk2[+b.dataset.ni] = tk2[+b.dataset.ni] === b.dataset.nd ? '~' : b.dataset.nd; if (tk2.every(x => x === '~')) delete p.notes; else p.notes = tk2.join(' '); });
  }
  if (r === 'pt-notes-reset') return editPattern(p => { delete p.notes; });
  if (r === 'clip-del') { tr.clips.splice(selClip, 1); selClip = null; changed(); renderTrackPanel(); return; }
  if (b.dataset.clipPat !== undefined) { const c = tr.clips[selClip]; if (c) { c.pattern = b.dataset.clipPat; editPat = c.pattern; changed(); renderTrackPanel(); } return; }
  if (r === 'rk-add') { tr.rack = [...(tr.rack || []), newDevice(($('#p' + tk + '_rk-type') || {}).value)]; changed(); renderTrackPanel(); return; }
  if (b.dataset.devOn !== undefined) { const d = tr.rack[+b.dataset.devOn]; if (d.on === false) delete d.on; else d.on = false; changed(); renderTrackPanel(); return; }
  if (b.dataset.devDel !== undefined) { tr.rack.splice(+b.dataset.devDel, 1); if (!tr.rack.length) delete tr.rack; changed(); renderTrackPanel(); return; }
  if (b.dataset.devMove) { const [i, d] = b.dataset.devMove.split(':').map(Number), j = i + d; if (j < 0 || j >= tr.rack.length) return; [tr.rack[i], tr.rack[j]] = [tr.rack[j], tr.rack[i]]; changed(); renderTrackPanel(); return; }
  if (b.dataset.setRamp) { const k = b.dataset.setRamp + 'End', ev = eff(tr); setSetting(k, ev[k] == null ? ev[b.dataset.setRamp] : null); changed(); syncTrackPanel(); return; }
  if (b.dataset.scope) { scope = b.dataset.scope; renderTrackPanel(); return; }
  if (b.dataset.editPat !== undefined) { editPat = b.dataset.editPat; renderTrackPanel(); return; }
  if (b.dataset.playPat !== undefined) {
    const k = b.dataset.playPat, c = wholeClip(tr, sel);
    if (!k) tr.clips = tr.clips.filter(x => x !== c);
    else if (c) c.pattern = k;
    else tr.clips.push({ section: SEC().name, pattern: k });
    editPat = k || null; changed(); renderTrackPanel(); return;
  }
  if (r === 'pt-compose') return composePattern(tr);
  if (r === 'pt-listen') return listenPattern(tr);
  if (r === 'pt-preview') { preview.toggle(tr.id, patOf(tr)); syncPreviewButtons(); return; }
  if (r === 'pt-savepat') return savePattern(tr);
  if (r === 'pt-keep-rhythm') return composePattern(tr, 'rhythm');
  if (r === 'pt-keep-notes') return composePattern(tr, 'notes');
  if (r === 'pt-new') { const k = nextKey(tr); tr.patterns[k] = clone(tr.patterns[patOf(tr)] || DEFAULT_PATTERN[tr.type]()); editPat = k; changed(); renderTrackPanel(); return; }
  if (r === 'pt-del') {
    const k = patOf(tr);
    if (Object.keys(tr.patterns).length === 1) return toast(t('lastPattern'));
    if (tr.clips.some(c => c.pattern === k)) return toast(t('patternInUse', { p: k }));
    delete tr.patterns[k]; editPat = null; changed(); renderTrackPanel(); return;
  }
  if (r === 'tk-dup') { const copy = clone(tr); const ids = new Set(T.tracks.map(x => x.id)); let id = tr.id + '-2', k = 3; while (ids.has(id)) id = `${tr.id}-${k++}`; copy.id = id; copy.name = t('copyOf', { name: trackLabel(tr) }); delete copy.solo; T.tracks.splice(tk + 1, 0, copy); tk += 1; changed(); renderTrackPanel(); return; }
  if (r === 'tk-up' || r === 'tk-down') { const j = tk + (r === 'tk-up' ? -1 : 1); if (j < 0 || j >= T.tracks.length) return; [T.tracks[tk], T.tracks[j]] = [T.tracks[j], T.tracks[tk]]; tk = j; changed(); renderTrackPanel(); return; }
  if (r === 'tk-del') { if (!confirmTwice('track', t('confirmRemoveTrack', { name: trackLabel(tr) }))) return; T.tracks.splice(tk, 1); tk = Math.max(0, Math.min(tk, T.tracks.length - 1)); editPat = null; changed(); renderTrackPanel(); }
});

// tema dell'interfaccia: neon (predefinito) o hardware con manopole, display e LED
let ui = store.get('coding-misk-ui', 'neon');
const setUi = v => { ui = v === 'hw' ? 'hw' : 'neon'; store.set('coding-misk-ui', ui); syncAll(); if (globalThis.codingMiskSoulDisplay) globalThis.codingMiskSoulDisplay.themeChanged(); };
$$('[data-uitheme]').forEach(b => b.addEventListener('click', () => setUi(b.dataset.uitheme)));
const setLook = l => { if (HIDDEN_LOOKS.includes(l)) l = 'palco'; if (!LOOKS.some(([k]) => k === l)) return; look = l; soulBase = l; store.set('coding-misk-look', l); syncAll(); };
// a song's own visual, unless the listener is watching the soul
const songLook = l => { if (l) setLook(l); };

// a look picked while the radio plays becomes the radio's look (the stage by default; the studio, #28, is set aside)
$('#looks').addEventListener('change', e => {
  // picking another visual while the Soul display overrides the stage unplugs the cable
  const v = e.target.value;
  if (v === 'soul') return;
  if (soulOverride) soulDisplay.act('override');
  setLook(v); if (mode === 'radio' && radio && radio.on) store.set('coding-misk-radio-look', v); });
// the arrows beside the menu: the previous or next visual, round the list
$$('[data-look-step]').forEach(b => b.addEventListener('click', () => {
  const i = PICK_LOOKS.findIndex(([k]) => k === look), n = PICK_LOOKS.length;
  const v = PICK_LOOKS[((i < 0 ? 0 : i) + +b.dataset.lookStep + n) % n][0];
  if (soulOverride) soulDisplay.act('override');
  setLook(v); if (mode === 'radio' && radio && radio.on) store.set('coding-misk-radio-look', v);
}));
$('#fs').addEventListener('click', () => {
  const w = $('#stagewrap');
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (w.requestFullscreen) w.requestFullscreen().catch(() => toast(t('fsNo')));
    else toast(t('fsNo'));
  } catch (e) { toast(t('fsNo')); }
});

function syncOutputs() {
  $('#sc-swing-o').textContent = `${Math.round((SEC().swing || 0) * 100)}%`;
}
// accordi delle progressioni nella tonalità della sezione (sono scritti in La e trasposti)
function renderProgOptions() {
  const tr = (KEYS.find(k => k[0] === secFull().key) || KEYS[4])[1];
  opts($('#prog'), Object.entries(PROGS).map(([k, v]) => [k, `${tx(v[0])} · ${v[1].map(c => chordName(c, tr)).join(' ')}`]));
}
// campi della sezione selezionata: tempo, tonalità, accordi, metro, swing
function syncSectionFields() {
  renderProgOptions();
  const sc = secFull();
  if (document.activeElement !== $('#bpm')) $('#bpm').value = sc.bpm;
  $('#key').value = sc.key; $('#prog').value = sc.chords; $('#sc-meter').value = sc.meter; $('#sc-swing').value = sc.swing;
  $('#bpm-ramp').setAttribute('aria-pressed', sc.bpmEnd != null);
  $('#bpm-end-row').hidden = sc.bpmEnd == null;
  if (sc.bpmEnd != null && document.activeElement !== $('#bpm-end')) $('#bpm-end').value = sc.bpmEnd;
  $('#sc-swing-o').textContent = `${Math.round((sc.swing || 0) * 100)}%`;
}
function syncAll() {
  document.documentElement.dataset.look = look;
  $('#stagewrap').dataset.soul = soulOverride;
  $('#soul-ctl').hidden = !soulOverride;
  // the soul shows in the visual menu, locked until the Soul display is plugged into the stage
  { const o = $('#looks option[value="soul"]'); if (o) { o.disabled = !soulOverride; o.innerHTML = soulOverride ? esc(t('soulLook')) : `${esc(t('soulLook'))} ${LOCK}`; o.title = soulOverride ? '' : t('soulLockedHint'); } }
  document.documentElement.dataset.ui = ui;
  $$('[data-uitheme]').forEach(b => b.setAttribute('aria-pressed', ui === b.dataset.uitheme));
  syncSectionFields();
  syncTrackPanel();
  $('#looks').value = soulOverride ? 'soul' : look;
  $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', getLang() === b.dataset.lang));
  syncOutputs();
}

// pannello del codice: largo fino al 50% dello schermo, richiudibile, a schermo intero (Esc per uscire)
{
  const work = $('.work'), col = $('#codecol'), grip = $('#code-resize');
  const setW = px => { if (px) work.style.setProperty('--code-w', `${Math.round(px)}px`); else work.style.removeProperty('--code-w'); };
  const clampW = px => Math.max(320, Math.min(window.innerWidth * .5, px));
  setW(store.get('coding-misk-code-w', 0) && clampW(store.get('coding-misk-code-w', 0)));
  const setCollapsed = v => { work.classList.toggle('code-collapsed', v); $('#code-collapse').setAttribute('aria-pressed', v); store.set('coding-misk-code-collapsed', v); };
  setCollapsed(!!store.get('coding-misk-code-collapsed', false));
  $('#code-collapse').addEventListener('click', () => setCollapsed(!work.classList.contains('code-collapsed')));
  const setFull = v => { col.classList.toggle('full', v); $('#code-full').setAttribute('aria-pressed', v); };
  $('#code-full').addEventListener('click', () => setFull(!col.classList.contains('full')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && col.classList.contains('full')) setFull(false); });
  grip.addEventListener('pointerdown', e => {
    e.preventDefault(); grip.setPointerCapture(e.pointerId); grip.classList.add('drag');
    const move = ev => setW(clampW(window.innerWidth - ev.clientX - 20));
    const up = () => { grip.classList.remove('drag'); grip.removeEventListener('pointermove', move); store.set('coding-misk-code-w', col.getBoundingClientRect().width); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up, { once: true });
  });
  grip.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const w = clampW(col.getBoundingClientRect().width + (e.key === 'ArrowLeft' ? 40 : -40)); setW(w); store.set('coding-misk-code-w', w);
  });
  grip.addEventListener('dblclick', () => { setW(0); store.set('coding-misk-code-w', 0); });
}

// tab
const TABS = ['componi', 'brani', 'playlist', 'impostazioni', 'generi', 'radio', 'artisti', 'stili', 'guida', 'lezioni', 'suoni', 'pattern', 'riferimenti'];
let cards = [];
// two modes (#42): Listen to make and hear music, Groove Lab for its material and for learning
const APP_MODES = { ascolta: ['componi', 'brani', 'playlist', 'radio'], lab: ['artisti', 'stili', 'generi', 'suoni', 'pattern', 'guida', 'lezioni', 'riferimenti'] };
const modeOf = tab => Object.keys(APP_MODES).find(m => APP_MODES[m].includes(tab)) || null;
let modeTabs = store.get('coding-misk-mode-tabs', {});
if (!modeTabs || typeof modeTabs !== 'object') modeTabs = {};
function setMode(m) {
  $$('.mode-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $$('.tab').forEach(b => { b.hidden = !!m && b.dataset.modeOf !== m; });
}
$$('.mode-btn').forEach(b => b.addEventListener('click', () => { const m = b.dataset.mode, last = modeTabs[m]; showTab(APP_MODES[m].includes(last) ? last : APP_MODES[m][0]); }));
function showTab(name) {
  // the pattern preview belongs to Compose (pattern-preview D4)
  if (name !== 'componi' && preview) preview.stop();
  const m = modeOf(name);
  if (m) { setMode(m); modeTabs[m] = name; store.set('coding-misk-mode-tabs', modeTabs); }
  else $$('.mode-btn').forEach(b => b.setAttribute('aria-pressed', false));
  $$('.tab').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === name));
  for (const id of TABS) $('#tab-' + id).hidden = id !== name;
  if (name === 'brani' && cards.length) renderSongs();
  if (name === 'suoni') renderSounds();
  // the Patterns tab: shown, or closed (its new parts that were not saved go)
  if (name === 'pattern' && patternsTab) patternsTab.render();
  else if (curTab === 'pattern' && patternsTab) patternsTab.closed();
  curTab = name;
  if (name === 'radio' && radio) radio.render();
  if (name === 'playlist' && playlistsTab) playlistsTab.render();
  if (name === 'impostazioni' && settingsPage) settingsPage.render();
  if (name === 'generi' && genresTab) genresTab.render();
  $('#open-settings').setAttribute('aria-pressed', name === 'impostazioni');
  if (name !== 'impostazioni') prevTab = name;
  if (name === 'stili' && stylesTab) stylesTab.render();
  if (name === 'artisti' && artistsTab) artistsTab.render();
// for the browser checks (tools/check-radio.cjs)
globalThis.codingMiskRadio = radio;
  store.set('coding-misk-tab', name);
}
$$('.tab').forEach(tb => tb.addEventListener('click', () => showTab(tb.dataset.tab)));

// ---------- guide (#48) ----------
// one card per feature (src/guide.js); "Show me" opens the feature and flashes its control; a "?" next to each
// tab's intro opens the card of that tab
const MODE_NAME = { ascolta: 'modeListen', lab: 'modeLab' };
function renderGuide() {
  const row = (k, v) => (v ? `<dt>${esc(t(k))}</dt><dd>${guideText(tx(v))}</dd>` : '');
  const part = p => `<div class="g-sub" id="g-${p.id}"><h4>${esc(tx(p.title))}</h4><dl class="g-row">${row('guideWhat', p.what)}${row('guideHow', p.how)}${row('guideKnow', p.know)}</dl></div>`;
  const scope = c => (c.scope ? `<div class="g-sub"><h4>${esc(t('guideScope'))}</h4><div class="g-scope-wrap"><table class="g-scope"><tr><th>${esc(t('guideScopeWhat'))}</th><th>${esc(t('guideScopeNow'))}</th><th>${esc(t('guideScopeNext'))}</th></tr>${c.scope.map(r => `<tr><td>${esc(tx(r.what))}</td><td>${esc(tx(r.now))}</td><td>${esc(tx(r.next))}</td></tr>`).join('')}</table></div></div>` : '');
  $('#guide').innerHTML = `<div class="g-index">${GUIDE.map(c => `<button class="chip" data-g-chip="${c.id}">${esc(tx(c.title))}</button>`).join('')}</div>
    <div class="g-cards">${GUIDE.map(c => `<article class="card g-card" id="g-${c.id}">
      <h3>${esc(tx(c.title))}${c.mode ? `<span class="g-mode">${esc(t(MODE_NAME[c.mode]))}</span>` : ''}</h3>
      <dl class="g-row">${row('guideWhat', c.what)}${row('guideHow', c.how)}${row('guideKnow', c.know)}</dl>
      ${(c.parts || []).map(part).join('')}${scope(c)}
      <div class="g-actions"><button class="btn" data-g-show="${c.id}">${esc(t('guideShow'))}</button></div>
    </article>`).join('')}</div>`;
}
function flash(el) { if (!el) return; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('g-flash'); setTimeout(() => el.classList.remove('g-flash'), 2000); }
function openGuide(id) { showTab('guida'); requestAnimationFrame(() => flash($('#g-' + id))); }
function showFeature(id) {
  const c = GUIDE.find(x => x.id === id); if (!c) return;
  if (c.tab && c.tab !== 'impostazioni') showTab(c.tab);
  setTimeout(() => flash($(c.show)), 60);
}
$('#guide').addEventListener('click', e => {
  const chip = e.target.closest('[data-g-chip]'); if (chip) { const el = $('#g-' + chip.dataset.gChip); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  const sh = e.target.closest('[data-g-show]'); if (sh) showFeature(sh.dataset.gShow);
});
// the "?" of a tab: next to its intro (tabs that render themselves get it back after each render)
const helpCard = tab => (GUIDE.find(c => c.tab === tab) || {}).id;
function ensureHelp(tab) {
  const sec = $('#tab-' + tab), id = helpCard(tab);
  if (!sec || !id || tab === 'guida' || sec.querySelector(':scope > .g-help-row, :scope > .intro .g-help')) return;
  const btn = `<button class="g-help" data-g-help="${id}" title="${esc(t('guideHelp'))}" aria-label="${esc(t('guideHelp'))}">?</button>`;
  const intro = sec.querySelector(':scope > .intro');
  if (intro) intro.insertAdjacentHTML('beforeend', btn); else sec.insertAdjacentHTML('afterbegin', `<div class="g-help-row">${btn}</div>`);
}
for (const tab of TABS) { const sec = $('#tab-' + tab); if (sec) new MutationObserver(() => ensureHelp(tab)).observe(sec, { childList: true, subtree: true }); }
document.addEventListener('click', e => { const h = e.target.closest('[data-g-help]'); if (h) openGuide(h.dataset.gHelp); });

// ---------- Strudel lessons ----------
function renderLessons() {
  $('#lessons').innerHTML = LESSONS.map((l, i) => {
    const [title, text, tryit] = tx(l);
    return `<article class="card lesson">
      <div class="step-n">${String(i + 1).padStart(2, '0')} / ${LESSONS.length}</div>
      <h3>${esc(title)}</h3><p>${esc(text)}</p>
      <pre><code>${esc(l.code)}</code></pre>
      <p class="try">${t('tryIt')} ${esc(tryit)}</p>
      <div><button class="btn primary" data-lesson="${i}">${t('loadPlay')}</button></div>
    </article>`;
  }).join('');
}
$('#lessons').addEventListener('click', e => {
  const b = e.target.closest('[data-lesson]'); if (!b) return;
  const l = LESSONS[+b.dataset.lesson];
  loadFree(l.code, { kind: 'lesson', get name() { return tx(l)[0]; } });
});

// ---------- brani ----------
// the card's tempo, bars and length: the length as its own profile plays it (cardLen), the timeline as written
const songLenText = c => { const L = cardLen(c); return t('songMeta', { bpm: c.p.meta.bpmLabel, bars: L.bars, time: clock(L.seconds) }); };
function songCard(c, i) {
  const { tr, p } = c, m = p.meta, L = cardLen(c), composed = tr.kind === 'composed';
  const ticks = Array.from({ length: Math.max(0, Math.floor(m.bars / 4) - 1) }, (_, k) => `<i style="left:${(k + 1) * 4 / m.bars * 100}%"></i>`).join('');
  const sg = songOf(c), kind = kindOf(sg), own = composed && !isBuiltin(tr.id);
  return `<article class="card lesson song" data-song-card="${i}" data-song-id="${esc(tr.id)}">
    <div class="song-head"><span class="badge kind-${kind}">${t(`k:${kind}`)}</span>${sg.mine ? `<span class="badge">${t('mine')}</span>` : ''}${sg.buildStyle === 'crescendo' ? `<span class="badge build-badge" title="${esc(t('fBuilds'))}">${esc(t('b:crescendo'))}</span>` : ''}
      ${composed && trialOf(tr) ? `<span class="cfg-trial"><span class="badge cfg-changed">${esc(t('configChanged'))}</span><button class="chip small cfg-reset" data-act="cfg-reset" title="${esc(t('configBackTip'))}" aria-label="${esc(t('configBackLbl'))}">${RESET_CONFIG}</button></span>` : ''}
      <span class="song-meta"><span class="song-len">${esc(songLenText(c))}</span>${tr.created ? ` · ${esc(t('cardCreated', { d: new Date(tr.created).toLocaleDateString(getLang() === 'it' ? 'it-IT' : 'en-GB') }))}` : ''}</span>${songsView.starButton(tr.id)}</div>
    <h3>${esc(tr.title)}</h3>
    ${tr.style ? `<p>${esc(tx(tr.style))}</p>` : ''}
    ${tr.version && tr.from ? `<p class="note">${esc(t('versionOf', { title: tr.fromTitle || tr.from }))}</p>` : ''}
    ${(() => { const vs = user.codeSongs.filter(v => v.from === tr.id); return vs.length ? `<div class="song-versions"><span class="lbl">${esc(t('versions'))}</span> ${vs.map(v => `<button class="chip small" data-version="${esc(v.id)}">v${v.version}</button>`).join(' ')}</div>` : ''; })()}
    <div class="song-tags">${songsView.tagsHtml(sg)}${own ? ` <button class="chip small" data-act="tags" aria-expanded="false">${t('tagsEdit')}</button>` : ''}</div>
    ${own ? '<div class="song-tags-edit" hidden></div>' : ''}
    <div class="timeline" data-tl="${i}">
      ${m.sections.map(sec => `<button class="sec${/drop/i.test(sec.key) ? ' drop' : ''}" style="flex:${sec.len}" data-seek="${sec.start}" title="${esc(t('barsRange', { a: sec.start + 1, b: sec.start + sec.len }))}" aria-label="${esc(t('seekAria', { name: sec.label, bar: sec.start + 1 }))}">${esc(sec.label)}</button>`).join('')}
      <span class="ticks">${ticks}</span><span class="head"></span>
    </div>
    <div class="songbar">
      <span class="btn-cluster">
        <button class="btn primary" data-act="play">${t('songPlay')}</button>
        <button class="btn" data-act="pause" hidden></button>
        <button class="btn" data-act="stop" hidden>${t('stop')}</button>
      </span>
      ${outCombo(`<button class="btn" data-act="export" data-export="${esc(tr.id)}">${t('exportWav')}</button>`)}
      ${composed ? `<button class="btn" data-frag="${esc(tr.id)}" title="${esc(t('fragTip'))}">${esc(t('fragBtn'))}</button>` : ''}
      <span class="btn-cluster">
        <button class="btn" data-act="playlist" aria-expanded="false">${t('addToPlaylist')}</button>
        ${composed && continuable(tr) ? `<button class="btn" data-act="radio" title="${esc(t('continueRadioTip'))}">${t('continueRadio')}</button>` : ''}
        ${composed ? `<button class="btn" data-act="open">${t('openInCompose')}</button>` : `<button class="btn" data-act="code">${t('editCode')}</button>${user.code[tr.id] && !tr.version ? `<button class="btn danger" data-act="restore">${t('restoreOrig')}</button>` : ''}`}
      </span>
      <span class="time">${t('songTime', { t: '0:00', total: clock(L.seconds), bar: 1, bars: L.bars })}</span>
      <label class="loop"><input type="checkbox" data-loop="${i}"> ${t('loopSection')}</label>
    </div>
    ${m.sections.length > 1 ? `<div class="trans"><span class="lbl">${t('transitions')}</span>
      ${m.sections.slice(1).map((sec, k) => `<button class="chip" data-seek="${Math.max(0, sec.start - 2)}">${esc(m.sections[k].label)} → ${esc(sec.label)}</button>`).join('')}
    </div>` : ''}
    <button class="song-del" data-act="delete" title="${esc(t('songDeleteTip'))}" aria-label="${esc(t('songDeleteAria', { title: tr.title }))}">${BIN}</button>
  </article>`;
}
// a card as a song for search and filters (#34): kind, tags, whether it is the user's
function isMine(tr) { return tr.kind === 'composed' ? !isBuiltin(tr.id) || user.tracks.some(u => u.id === tr.id) : !!user.code[tr.id] || !!tr.version; }
function songOf(c) {
  const { tr, p } = c;
  // songs generated before #34 have no origin: their id still tells
  return { id: tr.id, title: tr.title, style: tr.style, tags: tr.tags, origin: tr.origin || (/^endless-/.test(tr.id) ? 'endless' : undefined), code: tr.kind !== 'composed', build: tr.kind === 'composed' && hasBuild(tr), buildStyle: tr.buildStyle, created: tr.created,
    mine: isMine(tr), bpm: parseFloat(p.meta.bpmLabel) || 0, seconds: cardLen(c).seconds };
}
// every style, built-in and the user's (also the invalid ones), for tag names and filters
function allStyles() { return [...BUILTIN_STYLES, ...((stylesTab && stylesTab.mine) || []).filter(r => r && r.id && !BUILTIN_STYLES.some(b => b.id === r.id))]; }
// playlists (#36): favourites are the first one; the queue plays a playlist song after song
const playlists = createPlaylistStore(store);
let queue = null, shuffleOn = !!store.get('coding-misk-shuffle', false), repeatMode = REPEATS.includes(store.get('coding-misk-repeat', 'off')) ? store.get('coding-misk-repeat', 'off') : 'off';
const cardIndex = id => libraryCards().findIndex(c => c.tr.id === id);
// starts a song of the library by id (as its card's play button); false when it cannot start.
// In a playlist with mix on, a saved song starts the mix stream instead
function playById(id) {
  // a radio session (#38): with Mix, its songs join the stream; else the radio replays it, then the queue moves on
  if (isSession(id)) {
    if (mixOn && queue && repeatMode !== 'one' && mixParts(id)) return startMix(id);
    const s = playlists.session(id); if (!s || !radio) return false;
    mixS = null;
    radio.playSession(s, { onEnd: () => { if (!advanceFrom(id)) stop(); } });
    return true;
  }
  const i = cardIndex(id);
  if (i < 0) return false;
  if (mixOn && queue && repeatMode !== 'one' && mixSong(id)) return startMix(id);
  mixS = null;
  startCard(i, 0);
  return true;
}

// ---------- playlist mix (#23) ----------
// Two saved songs on one timeline, the next one mixed in under the end of the one playing; when it comes on
// air the window moves on, as in the radio. Code songs and the end of the queue stop the stream with a cut.
let mixOn = !!store.get('coding-misk-playlist-mix', false), mixS = null, mixN = 0;
const barsOfSong = sg => sg.sections.reduce((a, x) => a + x.bars, 0);
// each saved song plays with the profile it has alone (radio-profiles D2 without the radio's forced profile): its own,
// configuration, or its trial (song-own-settings); a growing one is its grown build, with the controls it has alone
// (kept in mixCtl, by song object)
const mixCtl = new WeakMap();
function mixSong(id) {
  const c = libraryCards().find(x => x.tr.id === id); if (!c || c.tr.kind !== 'composed') return null;
  const lv = liveOf(c.tr), g = lv.on && lv.style === 'crescendo' ? crescendoOf(c.tr) : null;
  if (!g) { const { kind, ...sg } = c.tr; return absoluteClips(clone(sg)); }
  const { kind, ...gs } = clone(g), out = absoluteClips(gs);
  out.onAir = { profile: controlsProfile(lv.ctl), from: 0, free: lv.ctl.duration === 'free', mix: true };
  mixCtl.set(out, clone(lv.ctl));
  return out;
}
// the songs an item brings to the mix: a saved song, or the songs of a radio session (frozen, or rebuilt as heard)
const sessionSongs = new Map();
function mixParts(id) {
  if (!isSession(id)) { const sg = mixSong(id); return sg ? [sg] : null; }
  const s = playlists.session(id); if (!s || !radio) return null;
  // (a session's grown songs keep the controls they had on air: the Compose ones of a song 0, the Custom ones, else the
  // profile's own on air)
  if (!sessionSongs.has(id)) sessionSongs.set(id, (s.frozen || radio.rebuild(s.recipe, s.count)).map(x => {
    const sg = absoluteClips(clone(x.song)), g = x.grown;
    if (sg.onAir && g && (g.controls || g.custom)) mixCtl.set(sg, clone(g.controls || customControls(g.custom)));
    return sg;
  }));
  return sessionSongs.get(id);
}
const mixActive = () => !!(mixS && song && song === mixS.p);
// the song after the last one of the window, from the queue, mixed in when it is a saved song
function extendMix() {
  if (mixS.items.length > 1) return;
  const last = mixS.items[0];
  let next = null;
  if (last.part + 1 < last.parts.length) next = { id: last.id, parts: last.parts, part: last.part + 1 };
  else { const id = queue && queue.peek(), parts = id && mixParts(id); if (parts) next = { id, parts, part: 0 }; }
  if (!next) return;
  const sg = next.parts[next.part];
  last.transition = playlistTransition(last.song, sg);
  mixS.items.push({ ...next, song: sg, n: ++mixN, start: last.start + last.bars - overlapOf(last.transition), bars: barsOfSong(sg) });
}
function mixPlayable() {
  const w = windowSong(mixS.items.map(x => ({ song: x.song, n: x.n, start: x.start, transition: x.transition })));
  const first = mixS.items[0], W = { ...w, id: `mix-${first.id}`, title: first.song.title, kind: 'composed' };
  // a window of Classic songs plays as before; with a grown song, each song in its own view, as the radio does (the next
  // one hidden when it grows), radio-profiles D2
  const prof = x => (x.song.onAir ? x.song.onAir.profile : 'classic');
  if (mixS.items.every(x => prof(x) === 'classic')) return playable(W);
  return radioPlayable(W, mixS.items.map((x, i) => ({ n: x.n, prefix: `s${x.n}-`, start: x.start, song: x.song, title: x.song.title, profile: prof(x), custom: mixCtl.has(x.song),
    ctl: mixCtl.get(x.song) || (x.song.onAir ? airControls(prof(x), x.song.onAir.free) : resolveProfile('classic')), show: i === 0 ? 'air' : prof(x) === 'classic' ? 'visible' : 'hidden' })));
}
function startMix(id) {
  const parts = mixParts(id), sg = parts && parts[0];
  if (!sg) return false;
  mixS = { items: [{ id, parts, part: 0, song: sg, n: ++mixN, start: 0, bars: barsOfSong(sg) }] };
  extendMix();
  mixS.p = mixPlayable();
  songLook(sg.look);
  playSong(mixS.p, 0, 'free');
  return true;
}
// every frame while the mix plays: the next song comes on air at the end of the current one
function mixTick(cyc) {
  if (!mixActive() || hand || resumeTo !== null) return;
  const cur = mixS.items[0];
  if (mixS.items.length < 2 || cyc < cur.start + cur.bars) return;
  // the queue moves on when an item ends (a session moves on after its last song)
  if (queue && mixS.items[1].id !== cur.id) queue.next({ auto: true });
  mixS.items.shift(); extendMix();
  const p = mixPlayable(), fresh = !!(p.air || mixS.p.air);
  mixS.p = p; song = p; typing = null; built = buildSteps(p.build).filter(x => x.at <= Math.floor(cyc)).length;
  // (songs shown one by one, radio-profiles D2: the new song on air appears whole now, in its own view)
  if (fresh) { ed.setCode(codeNow(p, Math.floor(cyc))); ed.evaluate(); }
  warmVoices(p); source = { kind: 'song', name: p.title, id: p.id }; renderSource();
  songLook(mixS.items[0].song.look);
  pbLast = '';
}
// plays a playlist (or a list of ids) from a song: ids in order, name for the player bar
function playQueue(listId, ids, startId = null) {
  const pl = playlists.get(listId), name = pl ? songsView.listName(pl) : '';
  queue = createQueue({ ids, start: startId, shuffle: shuffleOn, repeat: repeatMode, exists: id => (isSession(id) ? !!playlists.session(id) : cardIndex(id) >= 0), name, listId });
  if (!queue.current || !playById(queue.current)) { queue = null; toast(t('plEmpty')); }
  pbLast = '';
}
// end of a song: the next one of the queue, the same one again (repeat one), or nothing
function advance() { return advanceFrom(currentSongId()); }
function advanceFrom(id) {
  if (queue && queue.current === id) { const next = queue.next({ auto: true }); return next !== null && playById(next); }
  if (repeatMode === 'one' && id !== null) return playById(id);
  return false;
}
const songsView = createSongsView({ bar: $('#songs-bar'), list: $('#songs'), t, tx, esc, store, styles: allStyles, playlists, toast,
  trash: { list: () => trashList(user), daysLeft: e => daysLeft(e, new Date()), date: iso => new Date(iso).toLocaleDateString(getLang() === 'it' ? 'it-IT' : 'en-GB'),
    restore: restoreFromTrash, forget: forgetFromTrash, empty: emptyTheTrash, purge: purgeOld },
  onPlayList: (listId, ids) => playQueue(listId, ids), onChange: () => queueCardLengths() });
playlistsTab = createPlaylistsTab({ root: $('#tab-playlist'), t, esc, clock, playlists, confirmTwice, toast,
  songs: () => [...libraryCards().map(c => ({ id: c.tr.id, title: c.tr.title, kind: kindOf(songOf(c)), seconds: cardLen(c).seconds })),
    ...playlists.all.flatMap(l => l.songs).filter(isSession).map(id => { const s = playlists.session(id); return s && { id, title: s.title, kind: 'session', seconds: 0, count: s.count, frozen: !!s.frozen, old: sessionOutdated(s, APP_VERSIONS) }; }).filter(Boolean)],
  video: id => exportSession(id),
  freeze: id => { const s = playlists.session(id); if (!s || !radio) return; playlists.freeze(id, radio.rebuild(s.recipe, s.count)); sessionSongs.delete(id); toast(t('plFrozen')); },
  sessionOf: id => playlists.session(id),
  play: (listId, ids, startId) => playQueue(listId, ids, startId),
  userSong: id => user.tracks.find(u => u.id === id) || null,
  newSongId: () => { let id; do id = 'u-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4); while (user.tracks.some(u => u.id === id)); return id; },
  addSongs: list => { if (!list.length) return; user.tracks.push(...list.map(x => stamp(clone(x)))); saveLibrary(); cards = []; renderSongs(); },
  onChange: () => { if (!$('#tab-brani').hidden) { songsView.renderBar(); songsView.apply(); } } });
function renderSongs() {
  const composed = composedTracks().map(tr => (tr.id === T.id ? { ...tr, ...T, kind: 'composed' } : tr));
  // the cards only need the written song's meta: never grow every song for the list (a growth can take seconds)
  cards = [...composed, ...codedTracks()].map(cardOf);
  songsView.setSongs(cards.map(songOf));
  songsView.renderBar();
  $('#songs').innerHTML = cards.map(songCard).join('');
  $('#songs-hint').innerHTML = `${t('seekHint')} ${t('codedIntro')}`;
  songsView.apply();
}
// tags of one of the user's songs, edited from its card
function saveTags(id, tags) {
  const clean = Object.fromEntries(Object.entries(tags).filter(([, v]) => v.length));
  const i = user.tracks.findIndex(u => u.id === id);
  if (i < 0) return;
  if (Object.keys(clean).length) user.tracks[i].tags = clean; else delete user.tracks[i].tags;
  if (T.id === id) { if (user.tracks[i].tags) T.tags = clone(clean); else delete T.tags; }
  saveLibrary();
}
// avvia un brano dalla card: i brani a scene si caricano anche nell'arrangiatore
function startCard(i, bar) {
  const { tr, p } = cards[i];
  if (tr.kind === 'composed') {
    if (!loadTrack(tr)) return;
    songLook(tr.look);
    // the card's timeline is the written song: a bar on it is a bar of the written part, after a growth span
    return playSong(compiled, bar > 0 ? bar + growBars() : 0, 'track');
  }
  if (!(song && song.id === tr.id)) songLook(tr.look);
  playSong(p, bar, 'free');
}
$('#songs').addEventListener('click', e => {
  const card = e.target.closest('[data-song-card]'); if (!card) return;
  const i = +card.dataset.songCard, { tr, p } = cards[i];
  const ver = e.target.closest('[data-version]');
  if (ver) { const j = cardIndex(ver.dataset.version); if (j >= 0) { const el = $(`#songs [data-song-id="${CSS.escape(ver.dataset.version)}"]`); if (el) { el.hidden = false; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } } return; }
  const star = e.target.closest('[data-star]');
  if (star) {
    const on = songsView.toggleFav(star.dataset.star), lbl = t(on ? 'favRemove' : 'favAdd');
    star.setAttribute('aria-pressed', on); star.setAttribute('aria-label', lbl); star.title = lbl;
    return;
  }
  const panel = e.target.closest('.sv-tags-panel');
  if (panel) {
    const c = e.target.closest('[data-tg]');
    if (c) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true');
    if (e.target.closest('[data-tags-done]')) {
      const pick = g => [...panel.querySelectorAll(`[data-tg="${g}"][aria-pressed="true"]`)].map(x => x.dataset.v);
      saveTags(tr.id, { genres: pick('genres'), styles: pick('styles'), free: parseFree(panel.querySelector('[data-tg-free]').value) });
      toast(t('tagsSaved')); renderSongs();
    }
    return;
  }
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'tags') {
      const box = card.querySelector('.song-tags-edit'), open = box.hidden;
      box.hidden = !open; act.setAttribute('aria-expanded', open);
      box.innerHTML = open ? songsView.tagsPanel(tr) : '';
      return;
    }
    if (a === 'playlist') {
      const open = card.querySelector('.sv-pl-menu');
      if (open) { open.remove(); act.setAttribute('aria-expanded', 'false'); return; }
      card.querySelector('.songbar').insertAdjacentHTML('afterend', songsView.playlistMenu(tr.id));
      act.setAttribute('aria-expanded', 'true'); return;
    }
    // a song outside the playing queue ends it; one inside moves the queue there
    if (a === 'play') { if (queue && !queue.jump(tr.id)) queue = null; return startCard(i, 0); }
    if (a === 'pause') return togglePlay();
    if (a === 'cfg-reset') return resetTrial(tr.id);
    if (a === 'stop') return stop();
    if (a === 'radio') return continueInRadio({ ...tr, tags: tr.tags || songOf({ tr, p }).tags }, 0);
    if (a === 'export') {
      const v = outKind() === 'video';
      if (tr.kind === 'composed') { if (!rec && !fastJob && !loadTrack(tr)) return; return exportTrack(rec || fastJob ? null : compiled, 'track', v); }
      return exportTrack(p, 'free', v);
    }
    if (a === 'open') {
      if (!loadTrack(tr)) return;
      songLook(tr.look);
      if (mode !== 'track') backToTrack(); else if (ed && !isPlaying()) ed.setCode(compiled.code);
      showTab('componi'); return;
    }
    if (a === 'code') { if (ed) ed.stop(); paused = null; song = p; mode = 'free'; source = { kind: 'song', name: tr.title, id: tr.id }; renderSource(); if (ed) ed.setCode(p.code); updateShare(); return; }
    // every song goes to the trash after a confirmation in the card (#68): the user's songs and versions with a copy,
    // a built-in song is hidden (D3b)
    if (a === 'delete') { songsView.confirm({ anchor: act, trigger: act, key: 'delete', msg: t('trashAsk'), ok: t('songDelete'), onConfirm: () => (isBuiltin(tr.id) ? hideBuiltinSong(tr.id) : trashUserSong(tr.id)) }); return; }
    if (a === 'restore') { if (!confirmTwice('restore-' + tr.id)) return; delete user.code[tr.id]; saveLibrary(); renderSongs(); toast(t('restored')); return; }
  }
  const chip = e.target.closest('.trans [data-seek]');
  if (chip) return startCard(i, +chip.dataset.seek);
  const tl = e.target.closest('.timeline');
  if (tl) {
    const r = tl.getBoundingClientRect();
    // da tastiera (detail 0) si va all'inizio della sezione, col puntatore al punto esatto
    const bar = e.detail === 0 ? +e.target.closest('[data-seek]').dataset.seek : (e.clientX - r.left) / r.width * p.meta.bars;
    return startCard(i, bar);
  }
});
$('#songs').addEventListener('change', e => {
  const cb = e.target.closest('[data-loop]'); if (!cb) return;
  const { tr } = cards[+cb.dataset.loop];
  const active = song && song.id === tr.id && isPlaying();
  loopIdx = cb.checked ? (active ? song.meta.sectionAt(sched().now()) : 0) : -1;
  $$('[data-loop]').forEach(x => { if (x !== cb) x.checked = false; });
  $('#sc-loop').checked = false;
});

// trasporto, a ogni frame: tempo per battuta, ripetizione, stop a fine brano, scena che segue la riproduzione
const pauseLabel = () => isPlaying() ? t('pause') : paused ? t('resume') : t('pause');
// volume master di Strudel a 0,6: la somma degli strumenti nei drop supera 1 e saturerebbe l'uscita
const MASTER = .6;
// the push of a song into the master limiter (level-headroom): the headroom of its styles, 1 when none sets it
const songPush = sg => { try { return stylePush(sg && sg.tags && sg.tags.styles, RECIPES); } catch (e) { return 1; } };
// the master level and the limiter on Strudel's output (src/sounds/limiter.js), installed again when Strudel makes a
// new output; the push follows the song that plays
function applyMaster() {
  try {
    const ctl = globalThis.getSuperdoughAudioController && globalThis.getSuperdoughAudioController();
    if (ctl && ctl.output && ctl.output.destinationGain) setMasterLevel(ctl.output, MASTER, songPush(song));
  } catch (e) {}
}
// global volume (#32): a gain node after the master output, so WAV exports (taken from the master) keep their level
let volume = Math.max(0, Math.min(100, +store.get('coding-misk-volume', 100))), muted = !!store.get('coding-misk-muted', false), volNode = null, volFor = null;
function applyVolume() {
  try {
    const out = globalThis.getSuperdoughAudioController && globalThis.getSuperdoughAudioController().output.destinationGain;
    if (!out) return;
    if (volFor !== out) {
      const ctx = out.context;
      volNode = ctx.createGain(); volNode.connect(ctx.destination);
      out.disconnect(ctx.destination); out.connect(volNode); volFor = out;
    }
    const g = muted ? 0 : volume / 100;
    if (Math.abs(volNode.gain.value - g) > 1e-4) volNode.gain.setTargetAtTime(g, volNode.context.currentTime, .02);
  } catch (e) {}
}
// minimal speaker icons, drawn with the text colour like the other keys
const SPK = (extra) => `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" stroke="none"/>${extra}</svg>`;
// shuffle and repeat icons in the same line style (#36)
const ICON = body => `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const SPK_SHUFFLE = ICON('<path d="M2 4.5h2.5c3 0 4 7 7 7H14M2 11.5h2.5c1.2 0 2-1.1 2.7-2.5M9 6.6c.7-1.2 1.4-2.1 2.5-2.1H14"/><path d="M12.5 3l1.5 1.5L12.5 6M12.5 10l1.5 1.5L12.5 13"/>');
const SPK_MIX = ICON('<path d="M2 12c4 0 5-8 12-8M2 4c4 0 5 8 12 8"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>');
const SPK_REPEAT = ICON('<path d="M3 7V6a2 2 0 0 1 2-2h8M11 2l2 2-2 2M13 9v1a2 2 0 0 1-2 2H3M5 14l-2-2 2-2"/>');
const SPK_HIGH = SPK('<path d="M10.5 5.5a3.5 3.5 0 0 1 0 5"/><path d="M12.5 3.5a6.3 6.3 0 0 1 0 9"/>'), SPK_LOW = SPK('<path d="M10.5 5.5a3.5 3.5 0 0 1 0 5"/>'), SPK_OFF = SPK('<path d="M11 6l4 4M15 6l-4 4"/>');
function renderVolume() {
  for (const id of ['pb-volume', 'radio-volume']) { const el = document.getElementById(id); if (el && +el.value !== volume) el.value = volume; }
  for (const id of ['pb-volume-out', 'radio-volume-out']) { const el = document.getElementById(id); if (el) el.textContent = `${volume}%`; }
  const icon = muted || !volume ? SPK_OFF : volume < 40 ? SPK_LOW : SPK_HIGH;
  for (const id of ['pb-mute', 'radio-mute']) { const el = document.getElementById(id); if (el) { el.setAttribute('aria-pressed', muted); if (el.dataset.icon !== icon) { el.innerHTML = icon; el.dataset.icon = icon; } } }
}
function setVolume(v) { volume = Math.max(0, Math.min(100, Math.round(v))); if (volume > 0) muted = false; store.set('coding-misk-volume', volume); store.set('coding-misk-muted', muted); renderVolume(); applyVolume(); }
function toggleMute() { muted = !muted; store.set('coding-misk-muted', muted); renderVolume(); applyVolume(); }
$('#pb-volume').addEventListener('input', e => setVolume(+e.target.value));
$('#pb-mute').addEventListener('click', toggleMute);
renderVolume();
// for the browser checks (tools/check-player.cjs): the node after the master output
globalThis.codingMiskVolume = { node: () => volNode, master: () => volFor };
// the song moves on (tempo, live build steps, radio, the end): every frame, and while the tab is in the background
// (no frames there) from a worker's timer, which the browser does not stop
function songTick() {
  const s = sched();
  if (!(song && s && isPlaying() && !seeking)) return;
  const m = song.meta, cyc = s.now();
  const ahead = Math.min(m.bars - 1, Math.floor(s.lastEnd + s.cps * .1));
  const target = m.bpm[ahead] / 240;
  if (Math.abs(s.cps - target) > 1e-6) s.setCps(target);
  // the loop of the Patterns tab: it never ends; a change plays from the next bar
  if (song.loop) { if (loopNext && s.lastEnd + .1 * s.cps >= loopNext.at) { song = loopNext.p; loopNext = null; source = { kind: 'pattern', name: song.title }; renderSource(); ed.setCode(codeFor(song, 0)); ed.evaluate(); } return; }
  if (resumeTo !== null) resumeBuild(song, s, cyc);
  else if (song.build && !hand) liveBuild(song, s, cyc);
  if (mode === 'radio' && radio && !hand && resumeTo === null) radio.tick(cyc);
  mixTick(cyc);
  if (loopIdx >= 0) {
    const sec = m.sections[loopIdx];
    if (sec && cyc >= sec.start + sec.len) playSong(song, sec.start, mode);
  } else if (cyc >= m.bars && mode !== 'radio' && !hand && resumeTo === null && !(!rec && advance())) { stop(); if (mode === 'track') ended = compiled.id; if (rec && rec.id === song.id && !rec.ending) rec.ending = performance.now(); }
}
try {
  const clock = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 100)'], { type: 'text/javascript' })));
  clock.onmessage = () => { if (document.hidden) { applyMaster(); songTick(); if (preview) preview.tick(); if (radioPreview) radioPreview.tick(); } };
} catch (e) {}
(function transport() {
  requestAnimationFrame(transport);
  applyMaster();
  applyVolume();
  if (radio) renderPlayerBar();
  const s = sched();
  const playing = isPlaying();
  if (song && s && playing && !seeking) {
    songTick();
  }
  if (preview) preview.tick();
  if (radioPreview) radioPreview.tick();
  syncPreviewButtons();
  if (song && s && isPlaying() && !seeking) {
    const m = song.meta, cyc = s.now();
    // segue la sezione che suona, ma non mentre si sta scrivendo in un campo del brano
    const typing = document.activeElement && document.activeElement.matches('input, select, textarea') && document.activeElement.closest('#arranger, #track-panel');
    if (mode === 'track' && follow && !typing) { const i = arrSec(m.sectionAt(cyc)); if (i >= 0 && i !== sel) selectScene(i); }
  }
  // registrazione: aggancio all'uscita master, coda di riverbero, etichette dei pulsanti
  if (capture) capture.tap();
  if (rec) {
    tapMaster();
    if (rec.ending && performance.now() - rec.ending > 2500 && rec.recorder.state === 'recording') rec.recorder.stop();
    if (!rec.ending && !playing && !seeking && rec.recorder.state === 'recording' && performance.now() - (rec.started || (rec.started = performance.now())) > 3000) rec.ending = performance.now();
  }
  const job = rec || fastJob;
  const recLabel = rec ? t('exporting', { t: clock(song && s ? song.meta.secondsAt(s.now()) : 0), total: clock(rec.total) })
    : fastJob ? t(`fast:${fastJob.phase}`, { p: Math.round(fastJob.progress * 100) }) : null;
  $$('[data-export-mini]').forEach(b => { const on = (fastJob && fastJob.id === b.dataset.exportMini) || (sessionVid && sessionVid.id === b.dataset.exportMini), l = !on ? '⬇' : fastJob ? `${Math.round(fastJob.progress * 100)}%` : '●'; if (b.textContent !== l) b.textContent = l; b.classList.toggle('rec', !!on); });
  $$('[data-export]').forEach(b => { const l = job && (b.dataset.export === job.id || (b.id === 'tr-export' && (rec || fastJob.id === compiled.id))) ? recLabel : t('exportWav'); if (b.textContent !== l) b.textContent = l; b.classList.toggle('rec', !!(job && l === recLabel)); });
  // the audio or video displays next to Export and Record; locked while anything records
  { const txt = outLabel(), busy = !!(rec || capture || fastJob);
    $$('[data-out-lcd]').forEach(el => { if (el.textContent !== txt) el.textContent = txt; const b = el.parentElement; if (b.disabled !== busy) b.disabled = busy; }); }
  // pulsanti di trasporto
  const playBtn = $('#play'), state = playing ? 'playing' : paused ? 'paused' : 'stopped';
  if (playBtn.dataset.state !== state) {
    playBtn.dataset.state = state;
    playBtn.setAttribute('aria-pressed', playing);
    playBtn.textContent = playing ? t('pause') : paused ? t('resume') : '▶ Play';
    $('#sc-pause').textContent = pauseLabel();
    $('#sc-pause').disabled = state === 'stopped';
  }
  // live build: the comment of the latest step over the stage
  const say = playing && !hand && resumeTo === null && song && song.build && !quietSong(song) && s ? sayAt(song.build, s.now(), getLang()) : '', sayEl = $('#say');
  if (say && sayEl.textContent !== say) sayEl.textContent = say;
  sayEl.classList.toggle('on', !!say);
  // avanzamento nell'arrangiatore
  updateRuler(playing);
  const head = $('#arr-strip .head');
  if (head) {
    const trackCyc = playing && mode === 'track' && s ? s.now() : -1;
    const idx = trackCyc >= 0 ? compiled.meta.sectionAt(trackCyc) : -1;
    const btns = $$('.arr-scene-btn'), b = btns[arrSec(idx)];
    head.hidden = !b;
    if (b) head.style.left = `${b.offsetLeft + Math.min(1, (trackCyc - compiled.meta.sections[idx].start) / compiled.meta.sections[idx].len) * (b.offsetWidth - 2)}px`;
    const lh = $('#arr-grid .head');
    if (lh) { lh.hidden = !b; if (b) lh.style.left = head.style.left; }
    btns.forEach((x, j) => x.classList.toggle('playing', j === idx));
  }
  // avanzamento e pulsanti nelle card
  $$('[data-song-card]').forEach(card => {
    const c = cards[+card.dataset.songCard]; if (!c) return;
    const mine = song && song.id === c.tr.id;
    const active = playing && mine, isPaused = !playing && paused && mine;
    const m = mine ? song.meta : c.p.meta, L = mine ? m : cardLen(c), cyc = active ? s.now() : isPaused ? paused.cyc : 0;
    // (the card's timeline is the written song: a grown song in Compose plays its growth span before it)
    const off = mine && mode === 'track' ? growBars() : 0, w = c.p.meta;
    card.querySelector('.head').style.left = `${Math.min(100, Math.max(0, cyc - off) / w.bars * 100)}%`;
    const cur = active || isPaused ? w.sectionAt(cyc - off) : -1;
    card.querySelectorAll('.sec').forEach((x, j) => x.classList.toggle('on', j === cur));
    const label = t('songTime', { t: clock(m.secondsAt(cyc)), total: clock(L.seconds), bar: Math.min(L.bars, Math.floor(cyc) + 1), bars: L.bars });
    const te = card.querySelector('.time');
    if (te.textContent !== label) te.textContent = label;
    const pb = card.querySelector('[data-act=pause]'), sb = card.querySelector('[data-act=stop]');
    pb.hidden = sb.hidden = !(active || isPaused);
    const pl = active ? t('pause') : t('resume');
    if (pb.textContent !== pl) pb.textContent = pl;
  });
})();

// ---------- suoni: browser completo (src/sounds/browser.js) ----------
// "Usa nella traccia": kit per la batteria, suono per basso, arpeggio, hook e pad, campione per la texture
function useSound(it) {
  const pick = types => { const c = curTrack(); return c && types.includes(c.type) ? c : T.tracks.find(x => types.includes(x.type)); };
  let tr, key, value;
  if (it.cat === 'drums') { tr = pick(['drums']); key = 'kit'; value = it.group; }
  else if (it.cat === 'instruments' || it.cat === 'synths') { tr = pick(['bass', 'arp', 'hook', 'pad']); key = 'wave'; value = it.name; }
  else { tr = pick(['texture']); key = 'sample'; value = it.name; }
  if (!tr) return t('sbNoTarget', { kind: t(it.cat === 'drums' ? 'drums' : key === 'wave' ? 'sbMelodic' : 'texture') });
  tr.settings[key] = value; changed(); renderTrackPanel();
  return t('sbUsed', { sound: it.cat === 'drums' ? machineLabel(it.group) : value, track: trackLabel(tr), song: T.title });
}
// "Try on a pattern" (pattern-library, D5): bass sounds on a bassline, keys and pads on chords, the rest on a melody
function tryPattern(it) {
  const n = `${it.name} ${prettyName(it.name)}`.toLowerCase();
  const kind = /bass/.test(n) ? 'basslines' : /piano|organ|pad|string|choir|vibra|marimba|celesta|bell|brass|guitar|harp/.test(n) ? 'chords' : 'melodies';
  const id = kind === 'basslines' ? 'rolling' : kind === 'chords' ? (/pad|string|choir|brass/.test(n) ? 'pad' : 'comp') : 'neon';
  showTab('pattern');
  patternsTab.open({ kind, id, over: { sound: it.name } });
}
const sounds = createSoundBrowser({ root: $('#sounds'), store, t, tx, esc, getCustom: () => custom, play: (code, name) => loadFree(code, { kind: 'sound', name }), stop, useSound, toast, scheduler: sched, tryPattern });
function renderSounds() { sounds.render(); }

// ---------- player bar (#32) ----------
// the library in the order of the Songs tab: composed songs, then hand-written code songs
function libraryCards() { if (!cards.length) { const composed = composedTracks().map(tr => (tr.id === T.id ? { ...tr, ...T, kind: 'composed' } : tr)); cards = [...composed, ...codedTracks()].map(cardOf); } return cards; }
function currentSongId() { return mixActive() ? mixS.items[0].id : mode === 'track' ? T.id : mode === 'free' && song ? song.id : null; }
function neighbour(dir) {
  if (mode === 'radio' && radio && radio.on) return dir > 0 ? radio.skip() : radio.restart();
  const id = currentSongId(), list = libraryCards();
  // a playlist playing: its order (shuffle and repeat included)
  if (queue && queue.current === id) { const next = dir > 0 ? queue.next() : queue.prev(); return next === null ? -1 : list.findIndex(c => c.tr.id === next); }
  // the order the user sees in the Songs tab (search, filters, sorting); the full list when the song is filtered out
  songsView.setSongs(list.map(songOf));
  const shown = songsView.order(), k = shown.indexOf(id);
  if (k >= 0) { const next = shown[k + dir]; return next === undefined ? -1 : list.findIndex(c => c.tr.id === next); }
  const i = list.findIndex(c => c.tr.id === id);
  return i < 0 ? -1 : i + dir >= 0 && i + dir < list.length ? i + dir : -1;
}
function goNeighbour(dir) {
  const j = neighbour(dir);
  if (typeof j !== 'number' || j < 0) return;
  const wasPlaying = isPlaying(), { tr, p } = cards[j];
  if (wasPlaying) { if (queue) return playById(tr.id); return startCard(j, 0); }
  if (tr.kind === 'composed') { if (loadTrack(tr) && mode !== 'track') backToTrack(); return; }
  if (ed) ed.stop(); paused = null; song = p; mode = 'free'; source = { kind: 'song', name: tr.title, id: tr.id }; renderSource(); if (ed) ed.setCode(p.code); updateShare();
}
// timeline in the bar: drag to move inside what is playing (a song, or the song on air in the radio)
let pbSeeking = false;
function seekRange() {
  if (mode === 'radio' && radio && radio.on) { const rs = radio.state, it = rs.stream[rs.onAir]; return { from: it.start, bars: it.bars }; }
  if (mixActive()) { const it = mixS.items[0]; return { from: it.start, bars: it.bars }; }
  if (song && song.meta) return { from: 0, bars: song.meta.bars };
  return null;
}
$('#pb-seek').addEventListener('input', e => { pbSeeking = true; e.target.style.setProperty('--pos', `${e.target.value / 10}%`); });
$('#pb-seek').addEventListener('change', e => {
  pbSeeking = false;
  const r = seekRange(); if (!r) return;
  const bar = Math.min(r.bars - .25, Math.round(+e.target.value / 1000 * r.bars * 4) / 4);
  if (mode === 'radio' && radio && radio.on) return radio.seek(bar);
  if (mode === 'track') return seekTo(bar);
  const at = r.from + bar;
  if (song) { if (isPlaying()) playSong(song, at, mode); else paused = { id: song.id, cyc: at }; }
});
$('#pb-prev').addEventListener('click', () => goNeighbour(-1));
$('#pb-next').addEventListener('click', () => goNeighbour(1));
var pbLast = '';
function renderPlayerBar() {
  const s = sched(), playing = isPlaying(), onRadio = mode === 'radio' && radio && radio.on, rs = onRadio ? radio.state : null;
  let title = T.title, pos = '', bars = null;
  // the bar counter (pattern-preview, player-bar D7): bar n / total of what plays, counted from 1
  const count = (cyc, from, total) => ({ n: Math.max(1, Math.min(total, Math.floor(cyc - from) + 1)), total });
  if (onRadio && rs) {
    const it = rs.stream[rs.onAir], cyc = playing && s ? s.now() : rs.paused ?? it.start;
    title = it.title; bars = count(cyc, it.start, it.bars);
    // the time of the song on air
    const m = song && song.meta;
    if (m && m.secondsAt) { const t0 = m.secondsAt(it.start); pos = `${clock(Math.max(0, m.secondsAt(Math.min(cyc, m.bars)) - t0))} / ${clock(m.secondsAt(Math.min(m.bars, it.start + it.bars)) - t0)}`; }
  } else if (song && (playing || (paused && paused.id === song.id))) {
    const m = song.meta, cyc = playing && s ? s.now() : paused.cyc;
    title = mode === 'track' ? T.title : song.title || source.name || title;
    pos = `${clock(m.secondsAt(Math.min(cyc, m.bars)))} / ${clock(m.seconds)}`;
    bars = song.loop ? { n: ((Math.floor(cyc) % m.bars) + m.bars) % m.bars + 1, total: m.bars } : count(cyc, 0, m.bars);
    if (mixActive()) { const it = mixS.items[0], t0 = m.secondsAt(it.start); title = it.song.title; pos = `${clock(Math.max(0, m.secondsAt(Math.min(cyc, m.bars)) - t0))} / ${clock(m.secondsAt(Math.min(m.bars, it.start + it.bars)) - t0)}`; bars = count(cyc, it.start, it.bars); }
  } else if (mode === 'free' && source && source.name) title = source.name;
  // stopped in Compose: the bar Play starts from, of the song in Compose (the written one while it still grows)
  else if (mode === 'track' && compiled && compiled.meta) bars = count(cueBar(), 0, compiled.meta.bars);
  // timeline position (not while the user drags it)
  const seek = $('#pb-seek'), sr = seekRange();
  seek.disabled = !sr || (mode === 'free' && !(source && source.kind === 'song') && !onRadio);
  // while the timeline is dragged: the bar under the thumb
  if (pbSeeking && sr) bars = count(sr.from + +seek.value / 1000 * sr.bars, sr.from, sr.bars);
  if (!pbSeeking && sr) {
    const cyc = onRadio ? (playing && s ? s.now() : rs && rs.paused !== undefined ? rs.paused : sr.from) : playing && s ? s.now() : paused && song && paused.id === song.id ? paused.cyc : mode === 'track' ? cueBar() : 0;
    const v = Math.round(Math.max(0, Math.min(1, (cyc - sr.from) / sr.bars)) * 1000);
    if (+seek.value !== v) { seek.value = v; seek.style.setProperty('--pos', `${v / 10}%`); }
  }
  if (!onRadio && queue && queue.current === currentSongId()) { const q = queue.position; pos = `${queue.name} · ${q.n} / ${q.total}${pos ? ` · ${pos}` : ''}`; }
  const onair = onRadio && !radio.paused;
  const canNav = onRadio || (currentSongId() !== null && (mode === 'track' || (source && source.kind === 'song')));
  const barTxt = bars ? t('pbBar', bars) : '';
  const key = [title, pos, barTxt, onair, canNav, shuffleOn, repeatMode].join('|');
  if (key === pbLast) return;
  pbLast = key;
  $('#pb-title').textContent = title || ''; $('#pb-pos').textContent = pos; { const k = barTxt.indexOf(' '); $('#pb-bar').innerHTML = k > 0 ? `<span class="pb-bar-w">${esc(barTxt.slice(0, k + 1))}</span>${esc(barTxt.slice(k + 1))}` : esc(barTxt); }
  $('#pb-onair').classList.toggle('on', onair);
  $('#pbar').classList.toggle('radio', onRadio);
  $('#pb-prev').disabled = !canNav; $('#pb-next').disabled = !canNav;
  renderModes(onRadio);
}
// shuffle and repeat (#36): remembered, off in the radio
const REPEAT_ICON = { off: SPK_REPEAT, all: SPK_REPEAT, one: SPK_REPEAT + '<b class="pb-one">1</b>' };
function renderModes(onRadio = mode === 'radio' && radio && radio.on) {
  const sh = $('#pb-shuffle'), rp = $('#pb-repeat');
  sh.setAttribute('aria-pressed', shuffleOn); sh.disabled = !!onRadio;
  rp.setAttribute('aria-pressed', repeatMode !== 'off'); rp.disabled = !!onRadio; rp.dataset.mode = repeatMode;
  rp.innerHTML = REPEAT_ICON[repeatMode];
  const mx = $('#pb-mix'); mx.setAttribute('aria-pressed', mixOn); mx.disabled = !!onRadio;
  const tip = t(`repeat:${repeatMode}`); rp.title = tip; rp.setAttribute('aria-label', tip);
}
$('#pb-shuffle').innerHTML = SPK_SHUFFLE;
$('#pb-mix').innerHTML = SPK_MIX;
// playlist mix on or off: applies from the next song started
$('#pb-mix').addEventListener('click', () => { mixOn = !mixOn; store.set('coding-misk-playlist-mix', mixOn); toast(t(mixOn ? 'mixOnToast' : 'mixOffToast')); pbLast = ''; renderPlayerBar(); });
$('#pb-shuffle').addEventListener('click', () => {
  shuffleOn = !shuffleOn; store.set('coding-misk-shuffle', shuffleOn);
  if (queue) queue.setShuffle(shuffleOn);
  pbLast = ''; renderPlayerBar();
});
$('#pb-repeat').addEventListener('click', () => {
  repeatMode = REPEATS[(REPEATS.indexOf(repeatMode) + 1) % REPEATS.length]; store.set('coding-misk-repeat', repeatMode);
  if (queue) queue.setRepeat(repeatMode);
  pbLast = ''; renderPlayerBar();
});

// ---------- radio ----------
// recipes from styles/ (the same files the command line reads); the radio plays the director's songs
const BUILTIN_STYLES = usableRecipes(Object.values(import.meta.glob('../styles/*.json', { eager: true, import: 'default' })));
// the styles the radio uses: built-ins plus the user's valid styles (Styles tab), kept in this one array
const RECIPES = BUILTIN_STYLES.slice();
stylesTab = createStylesTab({ root: $('#tab-stili'), t, tx, esc, store, builtins: BUILTIN_STYLES, toast,
  onChange: () => { RECIPES.splice(0, RECIPES.length, ...usableRecipes(stylesTab.usable())); if (radio) radio.render(); },
  // the user's songs tagged with a renamed style keep the link (#34)
  onRadio: ids => { showTab('radio'); if (radio && !radio.playStyles(ids)) toast(t('genreNoStyle')); },
  onRename: (from, to) => {
    for (const tr of [...user.tracks, T]) if (tr.tags && tr.tags.styles) tr.tags.styles = tr.tags.styles.map(id => (id === from ? to : id));
    saveLibrary();
  },
  // a preset named in a style's sheet opens in the Patterns tab (pattern-library, D4)
  onPattern: (kind, id) => { showTab('pattern'); patternsTab.open({ kind, id }); } });
RECIPES.splice(0, RECIPES.length, ...usableRecipes(stylesTab.usable()));
// the Patterns tab (pattern-library, #72): the loop plays through the player above; Add to song changes the song open
// in Compose (marked changed, not saved)
patternsTab = createPatternsTab({ root: $('#patterns'), t, tx, esc, store, toast, recipes: () => RECIPES,
  loop: { play: (sg, uid, title) => playLoop(sg, uid, title), stop: () => { loopNext = null; return stop(); }, state: loopState },
  codeOf: sg => loopPlayable(sg).code,
  onStyle: id => { showTab('stili'); stylesTab.openStyle(id); },
  addToSong: (it, cfg) => {
    const res = addPatternToSong(T, it, { sound: cfg && cfg.sound, base: baseSettings(it.type), name: t(it.type), section: SEC().name });
    tk = res.track; editPat = res.key; selClip = null;
    // the song changes without moving the player: the loop goes on
    if (mode === 'track') changed(); else { dirty = true; saveDraft(); compiled = playable({ ...T, kind: 'composed' }); renderArranger(); }
    renderTrackPanel();
    return t(res.created ? 'plAddedNew' : 'plAdded', { p: res.key, track: trackLabel(T.tracks[res.track]), song: T.title });
  } });
// for the browser checks (tools/check-patterns.cjs): the song open in Compose
globalThis.codingMiskPatterns = { tab: patternsTab, compose: () => ({ T: JSON.parse(JSON.stringify(T)), sel, dirty }) };
// artists from artists/ plus the user's (Artists tab)
const BUILTIN_ARTISTS = Object.values(import.meta.glob('../artists/*.json', { eager: true, import: 'default' })).sort((a, b) => a.name.localeCompare(b.name));
artistsTab = createArtistsTab({ root: $('#tab-artisti'), t, tx, esc, store, builtins: BUILTIN_ARTISTS, styles: () => RECIPES, toast, onCompose: a => newSongFromArtist(a), onChange: () => { if (radio) radio.render(); renderArtistPick(); } });
renderArtistPick();
// genres (#43): every genre with its styles, songs and artists; play it in the radio or see its songs
genresTab = createGenresTab({ root: $('#tab-generi'), t, tx, esc, face: a => artistsTab.face(a),
  styles: () => allStyles(), artists: () => artistsTab.usable(),
  songs: () => { const by = Object.fromEntries(allStyles().map(r => [r.id, r])); return libraryCards().map(c => ({ genres: genresOf(c.tr.tags, id => by[id] && (by[id].genre || 'experimental')) })); },
  onStyle: id => { showTab('stili'); stylesTab.openStyle(id); },
  onSongs: g => { songsView.onlyGenre(g); showTab('brani'); },
  onRadio: ids => { showTab('radio'); if (radio && !radio.playStyles(ids)) toast(t('genreNoStyle')); } });
// preloads the spoken comments of a song, silently, as playSong does
// the radio's next song (#54): every zone of its soundfonts loads, without sound, while the song on air plays, so a broken
// zone is in the register before its first note
let preloaded = '';
const preloadSounds = p => {
  const key = p && p.meta ? `${p.title}|${p.meta.bpm.length}` : '';
  if (!key || key === preloaded || !globalThis.soundMap) return;
  preloaded = key;
  const names = soundfontsIn(p.soundCode ? p.soundCode() : segmentsOf(p, codeFor).map(x => x.code).join('\n'));
  preloadFonts(names, { soundMap: globalThis.soundMap, play: v => globalThis.superdough(v, globalThis.getAudioContext().currentTime + .2, .05) })
    .then(n => { if (n) console.info(`[sounds] next song: ${n} soundfont zones loaded (${names.join(', ')})`); }, () => {});
};
const warmVoices = sg => { try { voiceSamples(sg.build, getLang(), customFiles).forEach(v => globalThis.superdough({ ...v, gain: 0 }, globalThis.getAudioContext().currentTime + .3, .05)); } catch (e) {} };
// the radio's saved pattern preview: the pattern's loop in the song's key, chords and tempo, on an orbit well above the
// window's, the radio ducked to a quarter (12 dB) and never paused; it stops when the song on air changes
radioPreview = createPreview({
  sched, busy: () => !!(capture || fastJob),
  source: (id, key) => {
    if (!radioPv || radioPv.item.id !== id || !radio || !radio.on) return null;
    const st = radio.state, it = st && st.stream[st.onAir];
    if (!it || String(it.n) !== String(key)) return null;
    const c = radioPv.ctx, item = radioPv.item;
    const loop = loopSong({ ...item, kind: item.kind || 'basslines' }, { sound: item.sound ?? undefined, key: c.key, chords: c.chords, mode: (item.context || {}).mode || 'minor', bpm: c.bpm, meter: c.meter, beat: false, settings: item.settings });
    return { song: `radio:${it.n}`, key: String(it.n), loop, bpm: c.bpm, shift: 0, orbit: 40, sig: JSON.stringify(loop) };
  },
  compile: loop => compileSong(loop), duck: () => 0.25,
  // (the console redraws its listen buttons from the preview's state on its own)
  onChange: () => {},
});
globalThis.codingMiskRadioPreview = radioPreview;
radio = createRadio({
  root: $('#tab-radio'), t, tx, esc, store, recipes: RECIPES, toast, getLang, artists: () => artistsTab.usable(), face: a => artistsTab.face(a), keepArtist: a => artistsTab.keep(a),
  // the user's saved patterns join the songs where they fit (pattern-library; material-generator D10)
  userPatterns: () => forRadio(patternsStore.list()),
  // the samples of the lines typed in the console (voice-full-controls D10): read again once the voice helper made them
  reloadSamples: () => reloadSamples(),
  player: {
    // a saved pattern heard before it goes in (radio-arrangement D9): toggle(item, { key, chords, bpm, meter, n })
    preview: {
      toggle: (item, ctx) => { const st = radioPreview.state; if (st && radioPv && radioPv.item.id === item.id) { radioPreview.stop(); radioPv = null; return false; } radioPv = { item, ctx }; return radioPreview.start(item.id, String(ctx.n)); },
      stop: () => { radioPv = null; radioPreview.stop(); },
      get on() { return radioPreview.state && radioPv ? radioPv.item.id : null; },
    },
    makePlayable: (sg, songs) => radioPlayable(sg, songs),
    // a radio song grows away from the page (radio-profiles stage 4)
    grow: (song, ctx) => growAway(song, ctx),
    // and a grown song is steered there (radio-profiles stage 5: commands as waypoints)
    steer: args => growAway(null, null, args),
    start: (p, bar) => { songLook(store.get('coding-misk-radio-look', 'palco')); return playSong(p, bar, 'radio'); },
    // resume after a pause: by hand, the user's code goes on
    resumeAt: (p, bar) => playSong(p, bar, 'radio', { keepHand: true }),
    // a new window while the radio plays: the code on air does not change, the steps to come do
    swap: p => {
      if (mode !== 'radio' || !song) return;
      const s = sched(), cyc = s ? s.now() : 0;
      // (a window whose song on air changed while songs are shown one by one, radio-profiles D7: the new song's code
      // appears whole now, in its own view)
      const fresh = (p.air || song.air) && p.id !== song.id && !hand;
      song = p; typing = null; built = buildSteps(p.build).filter(x => x.at <= Math.floor(cyc)).length;
      warmVoices(p); preloadSounds(p); source = { kind: 'radio', name: p.title }; renderSource();
      if (fresh) { ed.setCode(codeNow(p, Math.floor(cyc))); ed.evaluate(); }
    },
    // skip: the new window takes over now, its first song starts on "bar"
    jump: (p, bar) => {
      if (mode !== 'radio' || !song) return;
      setHand(false); resumeTo = null;
      song = p; typing = null; built = buildSteps(p.build).filter(x => x.at <= bar).length;
      warmVoices(p); source = { kind: 'radio', name: p.title }; renderSource();
      ed.setCode(codeNow(p, bar)); ed.evaluate();
    },
    stop: () => stop(),
    volume: () => ({ volume, muted }),
    setVolume: v => setVolume(v),
    toggleMute: () => toggleMute(),
    renderVolume: () => renderVolume(),
    // stops the sound and gives the bar it stopped at
    halt: () => { const s = sched(), cyc = s ? s.now() : 0; ed.stop(); return cyc; },
    capture: () => startCapture(),
    captureVideo: o => startVideoCapture(o),
    // Record makes audio or video, from the display next to it (#27)
    outKind: () => outKind(), outKindButton: () => outKindButton(),
    // the radio's fast export (#8): a range of songs or minutes; null cancels the export running
    exporting: () => !!fastJob, exportRadio: range => exportRadio(range),
    // the gear beside the radio's Export: Settings → Video (#53), the one place of the video settings
    openVideoSettings: () => { showTab('impostazioni'); requestAnimationFrame(() => { const c = $('#set-video'); if (c) { c.scrollIntoView({ block: 'start', behavior: 'smooth' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1200); } }); },
    now: () => (sched() ? sched().now() : 0),
    saveSong: sg => { user.tracks.push({ ...clone(sg), id: 'u-' + Date.now() }); saveLibrary(); renderSongs(); toast(t('trackSaved')); },
    // sessions into playlists (#38): the lists to pick from, and adding (null: a new playlist)
    playlists: () => playlists.all.map(l => ({ id: l.id, name: songsView.listName(l) })),
    addSession: (listId, item) => { const l = listId ? playlists.get(listId) : playlists.create(t('newPlaylist')); if (!l) return; playlists.addSession(l.id, item); toast(t('plSessionAdded', { name: songsView.listName(l) })); if (playlistsTab) playlistsTab.render(); },
    // the song opens ready to play, not playing
    openSong: async sg => { await stop(); if (loadTrack({ ...clone(sg), kind: 'composed' })) { if (mode !== 'track') backToTrack(); showTab('componi'); } },
  },
});
radio.render();

// ---------- riferimenti ----------
function renderRefs() {
  $('#refs').innerHTML = REFS.map(([title, d, u]) => `<a class="card ref" href="${u}" target="_blank" rel="noopener"><strong>${esc(tx(title))} ↗</strong><span>${esc(tx(d))}</span></a>`).join('');
}

// ---------- lingua ----------
function renderStatic() {
  $$('[data-i18n]').forEach(x => { x.textContent = t(x.dataset.i18n); });
  $$('[data-i18n-html]').forEach(x => { x.innerHTML = t(x.dataset.i18nHtml); });
  $$('[data-i18n-aria]').forEach(x => { x.setAttribute('aria-label', t(x.dataset.i18nAria)); });
  $$('[data-i18n-title]').forEach(x => { x.title = t(x.dataset.i18nTitle); });
  opts($('#key'), KEYS.map(k => [k[0], k[2]]));
  opts($('#tk-type'), ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture', 'riser', 'code', 'voice', 'spoken'].map(k => [k, `${TYPE_ICON[k]}  ${t(k)}`]));
  opts($('#sc-meter'), METERS.map(([k]) => [k, k]));
  opts($('#sc-fade'), [['0', t('cut')], ['1', t('fade1')], ['2', t('fadeN', { n: 2 })], ['4', t('fadeN', { n: 4 })], ['8', t('fadeN', { n: 8 })]]);
  if (radio) radio.render();
  if (stylesTab) stylesTab.render();
  if (artistsTab) artistsTab.render();
  if (patternsTab) patternsTab.render();
  renderArtistPick();
  $('#looks').innerHTML = PICK_LOOKS.map(([k, l]) => `<option value="${k}">${esc(tx(l))}</option>`).join('') + `<option value="soul" disabled>${esc(t('soulLook'))} ${LOCK}</option>`;
  $('#looks').value = soulOverride ? 'soul' : look;
  $('#play').dataset.state = '';
}
function renderAll() {
  renderStatic(); renderLessons(); renderGuide(); renderSongs(); renderSounds(); renderRefs(); renderSource(); renderArranger(); renderTrackPanel();
  syncAll();
}
function changeLang(l) {
  setLang(l);
  compiled = compiled.pending ? heldCompiled() : playable({ ...T, kind: 'composed' });
  renderAll();
  if (mode === 'track' && ed && !isPlaying()) ed.setCode(compiled.code);
}
$$('[data-lang]').forEach(b => b.addEventListener('click', () => changeLang(b.dataset.lang)));
// settings page (#31): the gear opens it, a second press goes back to the tab before
settingsPage = createSettings({ root: $('#tab-impostazioni'), t, tx, esc, store, looks: PICK_LOOKS, toast, confirmTwice,
  app: {
    ui: () => ui, setUi: v => setUi(v), lang: () => getLang(), setLang: l => changeLang(l),
    volume: () => volume, setVolume: v => setVolume(v),
    // the video recorder is made after the settings: a page opened on the settings gets its preview below
    videoPreview: el => { try { video.preview(el); } catch (e) {} },
    fragmentsFromRecipe: (recipe, anchor) => openFragMenu(recipe, anchor),
    stageRatio: () => stageRatio(),
    fragPreview: (el, opts) => { try { video.previewVertical(el, opts, c => (song && song.meta ? song.meta.sectionAt(c) : -1)); } catch (e) {} },
    liveOpenWindow: () => liveLink.openWindow(), liveOpenRoom: () => liveLink.openRoom(), liveOn: () => { try { return liveLink.on; } catch (e) { return false; } },
    // hidden built-in songs (#68, D3b): how many, and all of them shown again
    hiddenSongs: () => (user.hidden || []).length, showHiddenSongs: () => showHiddenSongs(),
    radioSettings: () => (radio ? radio.settings : { transition: 'artist', harmony: 'artist', profile: 'artist', scope: 'song', material: 'mix' }), setRadio: (k, v) => radio && radio.setOption(k, v),
  } });
$('#open-settings').addEventListener('click', () => showTab($('#tab-impostazioni').hidden ? 'impostazioni' : prevTab));

renderAll();
startHardware();
// the Guide tab held the Strudel lessons before #48: a tab remembered from then opens the lessons, once
if (!store.get('coding-misk-guide-v', 0)) {
  if (store.get('coding-misk-tab', '') === 'guida') store.set('coding-misk-tab', 'lezioni');
  if (modeTabs.lab === 'guida') { modeTabs.lab = 'lezioni'; store.set('coding-misk-mode-tabs', modeTabs); }
  store.set('coding-misk-guide-v', 1);
}
{ const tb = store.get('coding-misk-tab', 'componi'); if (TABS.includes(tb)) showTab(tb); }
updateShare();
// the soul scene (#46): the radio's song on air (with the director's plan), or the song playing elsewhere
const soul = createSoulScene({
  store, isHw: () => ui === 'hw', baseLook: () => soulBase,
  getSource(cyc) {
    if (fv) return fv.soulSrc;
    if (mode === 'radio' && radio && radio.on) return radio.soulSource(cyc);
    const it = mixActive() ? mixS.items[0] : null, sg = it ? it.song : song && song.doc;
    if (!sg || !sg.sections || !sg.tracks) return null;
    return { key: `song:${sg.id || sg.title}`, song: sg, ctx: {}, bar: it ? cyc - it.start : cyc };
  },
  onChange: () => syncSoul(),
});
globalThis.codingMiskSoul = soul;
// the Soul display (#46, phase 2): hidden in a bay beside the stage; with override on, the stage shows the soul
const soulDisplay = createSoulDisplay({
  stagewrap: $('#stagewrap'), row: $('#stagerow'), scene: soul, store, isHw: () => ui === 'hw',
  getCyc: () => (isPlaying() ? sched().now() : 0), isPlaying,
  onOverride: on => { soulOverride = on; syncAll(); },
});
globalThis.codingMiskSoulDisplay = soulDisplay;
function syncSoul() {
  $('#soul-name').textContent = soul.label;
  $('#soul-ctl [data-soul="lock"]').setAttribute('aria-pressed', soul.locked);
}
$('#soul-ctl').addEventListener('click', e => {
  const b = e.target.closest('[data-soul]'); if (!b) return;
  if (b.dataset.soul === 'lock') soul.locked = !soul.locked; else soul[b.dataset.soul]();
});
syncSoul();
// what plays, for the studio scene (#28) and the video's title card (#27): the radio's song on air, or the song playing elsewhere
function stageInfo(cyc) {
  if (fv) return fv.info;
  if (mode === 'radio' && radio && radio.on) return radio.info(cyc);
  if (!song || !song.meta) return { title: T.title };
  const it = mixActive() ? mixS.items[0] : null, rel = it ? cyc - it.start : cyc;
  const said = saidSteps(song).filter(x => x.at <= cyc).pop();
  return { title: it ? it.song.title : mode === 'track' ? T.title : song.title, bar: rel, bars: it ? it.bars : song.meta.bars, bpm: Math.round((song.meta.bpm || [])[Math.max(0, Math.floor(cyc))] || 0) || undefined, say: said ? sayText(said.say, getLang()) : '', sayAt: said ? said.at - (it ? it.start : 0) : 0 };
}
const visuals = startVisuals({
  getS: () => ({ look: soulOverride ? 'soul' : look }), soul,
  afterFrame: (cyc, playing) => { video.frame(cyc, playing); liveLink.tick(); },
  getInfo: stageInfo,
  getSteps: () => meterSteps(secFull().meter),
  // il sequencer mostra il playhead solo se la scena selezionata è quella che sta suonando
  getMode: () => (mode === 'track' && song && isPlaying() && song.meta.sectionAt(sched().now()) === sel ? 'comp' : 'free'),
  isPlaying, sched,
  readout(cyc, step, playing) {
    if (!playing) return `${secFull().bpm} BPM  ·  ${paused ? t('resume').replace('▶ ', '') : t('rdPaused')}\n${t('rdHint')}`;
    const bar = Math.floor(cyc);
    const cur = song && mode === 'track' ? T.sections[arrSec(song.meta.sectionAt(cyc))] : null;
    const bpm = Math.round(sched().cps * 240 * (cur ? meterSteps(cur.meter || '4/4') / 16 : 1));
    let line2 = $('#src').textContent;
    if (song) {
      const i = song.meta.sectionAt(cyc), sec = song.meta.sections[i];
      line2 = `${song.title}  ·  ${sec ? sec.label : ''}`;
      if (mode === 'track' && sec && T.sections[i]) {
        const st = { ...SECTION_DEFAULTS, ...T.sections[i] }, tr = (KEYS.find(k => k[0] === st.key) || [0, 0])[1];
        const prog = PROGS[st.chords][1], pos = (bar - sec.start) % prog.length;
        line2 += '\n' + prog.map(c => chordName(c, tr)).map((n, j) => j === pos ? `[${n}]` : ` ${n} `).join('');
      }
    }
    return `${bpm} BPM  ·  ${t('rdBar')} ${String(bar + 1).padStart(3, '0')}.${(step >> 2) + 1}\n${line2}`;
  },
});
// the video recorder (#27): its frame is drawn after each stage frame
// the timeline of the song on air (#65): the radio's song on air with its own bars, or the song playing
const tlShapes = new WeakMap();
function timelineShape(doc) {
  if (!tlShapes.has(doc)) {
    const sh = shapeOf(doc, d => absoluteClips(clone(d))), map = doc.build ? buildMap(doc, sh.bars) : {};
    sh.tracks = sh.tracks.map(tr => ({ ...tr, off: (map[tr.id] || {}).off || [], marks: (map[tr.id] || {}).marks || [] }));
    tlShapes.set(doc, sh);
  }
  return tlShapes.get(doc);
}
function timelineNow(cyc) {
  let doc = song && song.doc, bar = cyc;
  // a fast video: the song (or the session's song) being rendered
  if (fv) { if (!fv.soulSrc) return null; doc = fv.soulSrc.song; bar = fv.soulSrc.bar; }
  if (mode === 'radio' && radio && radio.on) { const rs = radio.state, it = rs && rs.stream[rs.onAir]; if (it && it.song) { doc = it.song; bar = cyc - it.start; } }
  if (!doc || !doc.sections || !doc.tracks) return null;
  try { return { shape: timelineShape(doc), bar, live: Array.isArray(doc.build) && doc.build.length > 0, sayOf: s => sayText(s, getLang()) }; } catch (e) { return null; }
}
const video = createVideo({
  visuals, store, t, esc,
  soulFrame: (cyc, playing, scale) => soul.frame(cyc, playing, scale),
  soulView: () => soul.shown,
  getCode: () => (fv ? fv.code : (ed && ed.code) || ''),
  getInfo: stageInfo,
  getTimeline: cyc => timelineNow(cyc),
  getHighlights: () => !!(fv ? exportCtl && exportCtl.highlights : song && song.ctl && song.ctl.highlights),
  getSay: () => { if (fv) return fv.say; const el = $('#say'); return el.classList.contains('on') ? el.textContent : ''; },
  // the soul panel: as the direction says ('auto': only while the Soul display is on and the stage does not show the soul)
  getSoul: () => {
    const d = video.opts().soul, panel = { canvas: (cyc, playing, scale) => soul.frame(cyc, playing, scale) };
    if (fv) return d === 'panel' || (d === 'auto' && soulDisplay.open && soulDisplay.mode === 'soul') ? panel : null;
    if (d === 'off' || soulOverride) return null;
    return d === 'panel' || (soulDisplay.open && soulDisplay.mode === 'soul') ? panel : null;
  },
});
globalThis.codingMiskVideo = video;
// live output (#52): the broadcast window draws through this link, the control room talks to it
const liveLink = createLiveLink({
  video, visuals,
  getState: () => { const i = stageInfo(isPlaying() ? sched().now() : 0) || {}; return { title: i.title || '', artist: i.artist || '', playing: isPlaying(), radio: !!(mode === 'radio' && radio && radio.on) }; },
});
if (settingsPage && !$('#tab-impostazioni').hidden) settingsPage.render();

// last played (#67): a song counts as played after 10 seconds of playback; the radio counts the song on air
{
  let cur = null, since = 0, counted = false;
  setInterval(() => {
    let id = null;
    try {
      if (isPlaying()) {
        if (mode === 'radio' && radio && radio.on) { const rs = radio.state, it = rs && rs.stream[rs.onAir]; id = it && it.song ? it.song.id : null; }
        else id = song && song.id;
      }
    } catch (e) { id = null; }
    if (id !== cur) { cur = id; since = Date.now(); counted = false; return; }
    if (id && !counted && Date.now() - since >= 10000) {
      counted = true;
      const played = store.get('coding-misk-played', {}) || {};
      played[id] = Date.now(); store.set('coding-misk-played', played);
    }
  }, 1000);
}
