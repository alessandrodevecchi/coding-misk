import '@strudel/repl';
import './style.css';
import { METERS, meterSteps, fitSteps, channelSteps, GUITAR_TYPES, GUITAR_PATTERNS, HARMONIES, KEYS, PROGS, WAVES, MOVES, BASS, ARPS, HOOKS, MODES, VOWELS, PADS, TEXTURES, TEX_RHYTHMS, KITS, ROWS, GROOVES, LOOKS, DEFAULT, withVisuals, chordName } from './music.js';
import { compileSong } from './song/compile.js';
import { SPEAKERS, hasBuild, buildSteps, stateAt, sayAt, annotate, deriveBuild, buildMap, sayText, voiceCode, voiceSamples, voiceOf, stepKeys } from './song/build.js';
import { typingFrames } from './song/typing.js';
import { validateSong } from './song/validate.js';
import { cropCode } from './song/crop.js';
import { FORMAT, VERSION, SETTING_FIELDS, SECTION_DEFAULTS, VISUALS, VOICE_DEFAULT, fromScenes, clipState } from './song/format.js';
import { DEVICES, deviceArgs, newDevice } from './song/rack.js';
import { createRadio, usableRecipes } from './radio/radio.js';
import { createStylesTab } from './library/styles-tab.js';
import { createArtistsTab } from './library/artists-tab.js';
import { createSongsView } from './library/songs-view.js';
import { kindOf, parseFree } from './library/song-filter.js';
import { createPlaylistStore, createQueue, REPEATS, isSession } from './library/playlists.js';
import { DIRECTOR_VERSION } from './endless/director.js';
import { createPlaylistsTab } from './library/playlists-tab.js';
import { createSettings } from './settings/settings.js';
import { createGenresTab } from './library/genres-tab.js';
import { genresOf } from './library/song-filter.js';
import { windowSong } from './endless/join.js';
import { absoluteClips, playlistTransition, overlapOf } from './endless/transitions.js';
import { createSession } from './endless/director.js';
import { createSoundBrowser } from './sounds/browser.js';
import { MACHINES } from './sounds/machines.js';
import { machineLabel, prettyName } from './sounds/catalog.js';
import SONG_ORDER from '../songs/index.json';
import { LESSONS, REFS, SONGS } from './content.js';
import { GUIDE, guideText } from './guide.js';
import { startVisuals } from './visuals.js';
import { t, tx, getLang, setLang } from './i18n.js';
import { parseSong, clock } from './songs.js';
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
function composedTracks() {
  const builtins = BUILTIN.map(b => { const o = user.tracks.find(u => u.id === b.id); return o ? prepare(o) : b; });
  return [...builtins, ...user.tracks.filter(u => !builtinOf(u.id)).map(prepare)].map(tr => ({ ...tr, kind: 'composed' }));
}
// code songs: the hand-written originals, then the versions saved from live coding by hand (#33)
if (!Array.isArray(user.codeSongs)) user.codeSongs = [];
const codedTracks = () => [...CODED, ...user.codeSongs.map(v => ({ ...v, kind: 'coded' }))].map(c => ({ ...c, code: user.code[c.id] || c.code }));
let liveOn = !!store.get('coding-misk-live', false);
// the radio tab (created further down, once the player exists)
let radio = null, stylesTab = null, artistsTab = null, playlistsTab = null, settingsPage = null, genresTab = null, prevTab = 'componi';
// custom samples manifest (bank → files), for spoken comments
let customFiles = {};
// oggetto riproducibile: codice + mappa di sezioni e tempo
function playable(tr) {
  // live build: the code depends on the bar (steps applied up to there), with the latest comment written in
  // a song without steps can build itself too ("Live build" switch): steps derived from its clips
  const build = tr.kind !== 'composed' ? null : hasBuild(tr) ? tr : liveOn ? { ...tr, build: deriveBuild(tr) } : null;
  const codeAt = build ? bar => {
    const st = stateAt(build, bar), total = build.sections.reduce((a, x) => a + x.bars, 0);
    const c = annotate(compileSong(st.song), build, st.upTo, getLang()) + voiceCode(build, st.song, st.upTo, total, getLang(), customFiles);
    return c.includes('$:') ? c : `${c}\n$: silence`;
  } : null;
  const code = codeAt ? codeAt(0) : tr.kind === 'composed' ? compileSong(tr) : tr.code;
  const meta = parseSong(code);
  if (tr.kind === 'composed') {
    // la mappa del tempo è in "BPM da 4/4": per l'etichetta usiamo i BPM veri delle sezioni
    const v = tr.sections.flatMap(s => [s.bpm ?? 138, s.bpmEnd ?? s.bpm ?? 138]), lo = Math.min(...v), hi = Math.max(...v);
    meta.bpmLabel = lo === hi ? `${lo}` : `${lo}→${hi}`;
  }
  return { id: tr.id, title: tr.title, kind: tr.kind, look: tr.look, code, meta, codeAt, build };
}

// ---------- brano in modifica ----------
const draft = store.get('coding-misk-draft', null);
let T = prepare(draft && draft.T && (draft.T.sections || draft.T.scenes) ? draft.T : BUILTIN[0]);
let sel = Math.min(draft ? draft.sel || 0 : 0, T.sections.length - 1);
let tk = Math.min(draft ? draft.tk || 0 : 0, Math.max(0, T.tracks.length - 1));
let dirty = !!(draft && draft.dirty);
let scope = 'track', editPat = null, panelView = store.get('coding-misk-panel', 'full');
// vista dell'arrangiatore: 'sections' (celle per sezione) o 'timeline' (clip liberi); selClip = indice del clip scelto nella timeline
let arrMode = store.get('coding-misk-arr-mode', 'timeline'), selClip = null;
let look = store.get('coding-misk-look', T.look || 'palco');
if (!LOOKS.some(([k]) => k === look)) look = 'palco';
let compiled = playable({ ...T, kind: 'composed' });
const saveDraft = () => store.set('coding-misk-draft', { T, sel, tk, dirty });
const sceneStart = i => T.sections.slice(0, i).reduce((a, s) => a + s.bars, 0);
const SEC = () => T.sections[sel];

// ---------- editor Strudel e trasporto ----------
let ed = null, mode = 'track', evalTimer = 0, song = null, loopIdx = -1, follow = true, seeking = false;
let paused = null; // { id, cyc } quando la musica è in pausa
let ended = null; // id del brano arrivato alla fine da solo
let source = { kind: 'track' };
const el = document.createElement('strudel-editor');
el.innerHTML = `<!--\n${compiled.code}\n-->`;
$('#edhost').appendChild(el);
const ready = new Promise(res => { const iv = setInterval(() => { if (el.editor) { clearInterval(iv); ed = el.editor; res(ed); } }, 100); });
// il REPL carica solo una parte di dirt-samples: carichiamo l'archivio completo (arpy, industrial, glitch, …)
// samples() can appear a little after the editor: wait for it, otherwise the call was skipped and only part of the archive loaded
const whenSamples = () => new Promise(res => { const iv = setInterval(() => { if (typeof globalThis.samples === 'function') { clearInterval(iv); res(globalThis.samples); } }, 100); });
ready.then(whenSamples).then(load => load('github:tidalcycles/dirt-samples')).catch(e => console.error(e));
// campioni personalizzati da public/samples/ (elenco generato dal plugin in vite.config.js)
let custom = [];
ready.then(async () => {
  try {
    const list = await (await fetch('/samples/strudel.json')).json();
    custom = Object.keys(list).filter(k => k !== '_base');
    customFiles = list;
    if (!custom.length) return;
    await globalThis.samples('/samples/strudel.json');
    renderTrackPanel(); renderSounds(); syncAll();
  } catch (e) { console.warn('campioni personalizzati non disponibili', e); }
});
const sched = () => ed && ed.repl && ed.repl.scheduler;
const isPlaying = () => !!(sched() && sched().started);
// code of a song at a bar, with the tempo of that bar (a live build changes code over time)
const codeFor = (sg, bar) => withVisuals(sg.codeAt ? sg.codeAt(bar) : sg.code).replace(/setcpm\([^)]*\)/, `setcpm(${+sg.meta.bpm[Math.max(0, Math.min(sg.meta.bars - 1, Math.floor(bar)))].toFixed(2)}/4)`);
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
    if (at.top < top + 8 || at.bottom > bottom - 8) host.scrollTop += at.top - top - (bottom - top) / 3;
  } catch (e) {}
}
// live build in progress: steps already in the editor, and the edit being typed towards the next step
let built = 0, typing = null;
// hand live coding (#20): the user typed in the code during a live build. Steps, comments and the stop at the end
// wait until "resume live build"; the user's code plays meanwhile. resumeTo: the bar where the build takes over again.
let hand = false, lastHand = null, resumeTo = null, handFrom = 0;
// resume from the bar where the user took over (default) or from where the song has got to meanwhile
let handFromHere = store.get('coding-misk-hand-from', true) !== false;
function liveBuild(sg, s, cyc) {
  const steps = buildSteps(sg.build), next = steps[built];
  if (!next) return;
  // the change is typed during the bar before its step. Strudel schedules ahead from lastEnd, so the new code is
  // evaluated when the next query is about to reach the step's bar: everything from the bar on comes from the new code
  const typeAt = next.at - Math.min(1, 2 * s.cps), due = s.lastEnd + .1 * s.cps >= next.at;
  if (cyc < typeAt && !due) return;
  if (!typing) typing = { frame: typingFrames(ed.code || '', codeFor(sg, next.at)), t0: cyc, t1: next.at - .2 * s.cps, shown: '' };
  if (!due) {
    const txt = typing.frame((cyc - typing.t0) / Math.max(.01, typing.t1 - typing.t0));
    if (txt !== typing.shown) { const prev = typing.shown || ed.code || ''; typing.shown = txt; ed.setCode(txt); followEdit(prev, txt); }
    return;
  }
  typing = null; built = steps.filter(x => x.at <= next.at).length;
  ed.setCode(codeFor(sg, next.at)); ed.evaluate();
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
    resumeTo = { bar, target, frame: typingFrames(ed.code || '', codeFor(song, target)), t0: cyc, t1: bar - .2 * s.cps, shown: '' };
    return;
  }
  // the radio: when the song on air ended by hand, the next song starts on the next bar
  if (mode === 'radio' && radio && radio.afterHand(bar)) return;
  // Compose past the end of the song: start again from the top
  if (bar >= song.meta.bars) { playSong(song, 0, mode); return; }
  resumeTo = { bar, frame: typingFrames(ed.code || '', codeFor(song, bar)), t0: cyc, t1: bar - .2 * s.cps, shown: '' };
}
function resumeBuild(sg, s, cyc) {
  const r = resumeTo, due = s.lastEnd + .1 * s.cps >= r.bar;
  if (!due) {
    const txt = r.frame((cyc - r.t0) / Math.max(.01, r.t1 - r.t0));
    if (txt !== r.shown) { const prev = r.shown || ed.code || ''; r.shown = txt; ed.setCode(txt); followEdit(prev, txt); }
    return;
  }
  resumeTo = null; typing = null;
  if (r.target !== undefined) { playSong(sg, r.target, mode); return; }
  built = sg.build ? buildSteps(sg.build).filter(x => x.at <= r.bar).length : 0;
  ed.setCode(codeFor(sg, r.bar)); ed.evaluate();
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
  if (!audioInit && typeof globalThis.initAudio === 'function') audioInit = globalThis.initAudio().catch(e => { audioInit = null; console.error(e); });
  return audioInit;
}

// Riproduce un brano dalla posizione "bar" (anche frazionaria): lo scheduler di Strudel riprende
// da lastEnd, quindi basta impostarlo prima di avviare. Il tempo lo gestisce transport() battuta per battuta.
async function playSong(sg, bar = 0, as = 'free', { keepHand = false } = {}) {
  if (seeking) return;
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
    ed.setCode(codeFor(sg, bar));
    sched().lastEnd = bar;
    if (loopIdx >= 0) loopIdx = m.sectionAt(bar);
    if (as === 'track') selectScene(m.sectionAt(bar));
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
    song: () => t('srcSong', { name: source.name }),
    radio: () => t('srcRadio', { name: source.name }),
  };
  $('#src').textContent = map[source.kind]();
  $('#back').hidden = source.kind === 'track';
  $('#save-code').hidden = source.kind !== 'song';
}
const currentCode = () => (ed && ed.code) || compiled.code;
const shareLink = code => {
  const bytes = new TextEncoder().encode(code);
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return 'https://strudel.cc/#' + encodeURIComponent(btoa(bin));
};
function updateShare() { $('#share').href = shareLink(currentCode()); }
$('#share').addEventListener('pointerdown', updateShare);
$('#share').addEventListener('focus', updateShare);

let toastT = 0;
function toast(msg) {
  let box = $('.toast');
  if (!box) { box = document.createElement('div'); box.className = 'toast'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  box.textContent = msg; box.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => box.hidden = true, 2600);
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
      try { res({ blob: wavBlob(await globalThis.getAudioContext().decodeAudioData(await raw.arrayBuffer())), ext: 'wav' }); }
      catch (e) { res({ blob: raw, ext: 'webm' }); }
    };
    recorder.stop();
  });
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
async function exportTrack(sg, as) {
  if (rec) { rec.cancel = true; rec.recorder.stop(); stop(); return; }
  initAudioOnce(); await ready; await initAudioOnce();
  const ctx = globalThis.getAudioContext();
  const dest = ctx.createMediaStreamDestination();
  // WAV (decoded after the recording) or Opus (the recording itself, much smaller), from the settings (#31)
  const opus = store.get('coding-misk-export-format', 'wav') === 'opus', mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus'].find(m => globalThis.MediaRecorder && MediaRecorder.isTypeSupported(m));
  const recorder = opus && mime ? new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 192000 }) : new MediaRecorder(dest.stream);
  rec = { opus: !!(opus && mime), recorder, dest, chunks: [], node: null, id: sg.id, title: sg.title, total: sg.meta.seconds, ending: 0, cancel: false };
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
  if (r.cancel) return toast(t('exportCancel'));
  toast(t('exportWorking'));
  const blob = new Blob(r.chunks, { type: r.recorder.mimeType });
  const out = r.opus ? blob : wavBlob(await globalThis.getAudioContext().decodeAudioData(await blob.arrayBuffer()));
  const ext = r.opus ? (/ogg/.test(r.recorder.mimeType) ? 'ogg' : 'webm') : 'wav';
  const url = URL.createObjectURL(out);
  const a = document.createElement('a');
  a.href = url; a.download = `${(r.title || 'coding-misk').replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim() || 'coding-misk'}.${ext}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(t('exportDone', { name: a.download }));
}
function wavBlob(buf) {
  const ch = Math.min(2, buf.numberOfChannels), n = buf.length, data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Blob([data], { type: 'audio/wav' });
}
$('#tr-export').addEventListener('click', () => exportTrack(compiled, 'track'));
// Continue in radio (#29): the song in Compose is song 0 of a new radio session, from the bar it is at
const continuable = sg => (sg.tracks || []).some(x => x.type !== 'code' && x.type !== 'voice');
function continueInRadio(sg, from = 0) {
  if (!radio || !continuable(sg)) { toast(t('steerWhy:lead')); return; }
  queue = null;
  const { kind, ...plain } = clone(sg);
  radio.continueSong(absoluteClips(plain), from);
  showTab('radio');
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
const baseSettings = type => type === 'code' ? { visual: 'fx' } : type === 'voice' ? { ...VOICE_DEFAULT } : Object.fromEntries(SETTING_FIELDS[type].map(k => [k, DEFAULT[type][k]]));
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
  hook: () => ({ preset: 'richiamo' }), pad: () => ({ preset: 'pad' }), texture: () => ({ rhythm: 'bar' }), riser: () => ({}), voice: () => ({}),
  code: () => ({ code: 'note("a2 ~ c3 [e3 a3]").s("triangle").lpf(1800).gain(.4)' }),
};
const ACT_IDS = { drums: 'kick,snare,hats', bass: 'bass', guitar: 'guitar', arp: 'arp', hook: 'hook', pad: 'pad', texture: 'fx', riser: 'riser', voice: 'fx' };
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
  const own = hasBuild(T), lt = $('#live-toggle');
  lt.setAttribute('aria-pressed', own || liveOn); lt.disabled = own; lt.title = own ? t('liveOwn') : t('liveHint');
  if (arrMode === 'timeline') renderTimeline(total); else renderCells(total);
  renderSectionPanel(total);
  renderRuler();
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
  const solo = T.tracks.some(tr => tr.solo), bmap = compiled.build ? buildMap(compiled.build, total) : null;
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
  $('#tr-del').textContent = builtin ? t('restoreOrig') : t('deleteTrack');
  $('#tr-del').disabled = builtin && !overridden && !dirty;
  $('#arr-total').textContent = t('arrTotal', { scenes: T.sections.length, bars: total, time: clock(compiled.meta.seconds) });
  $('#sc-loop').checked = loopIdx >= 0 && mode === 'track';
  renderTrackPick();
}
const TYPE_ICON = { drums: '◉', bass: '▁', guitar: '⚡', arp: '⋰', hook: '♪', pad: '▒', texture: '∿', riser: '↗', code: '{}', voice: '❝' };

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
$('#live-toggle').addEventListener('click', () => {
  liveOn = !liveOn; store.set('coding-misk-live', liveOn);
  compiled = playable({ ...T, kind: 'composed' });
  if (isPlaying() && mode === 'track') playSong(compiled, sched().now(), 'track');
  else if (ed && mode === 'track') ed.setCode(compiled.code);
  renderArranger(); if (!$('#tab-brani').hidden) renderSongs();
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
const cueBar = () => (ended === compiled.id ? songBars() : paused && song && paused.id === compiled.id ? paused.cyc : sceneStart(sel));
async function seekTo(bar) {
  ended = null;
  if (isPlaying() && mode === 'track') return playSong(compiled, bar, 'track');
  if (mode !== 'track') backToTrack();
  song = compiled; paused = { id: compiled.id, cyc: bar };
  const i = compiled.meta.sectionAt(bar); if (i >= 0 && i !== sel) selectScene(i);
}
let rulerDrag = null;
$('#ruler-track').addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const g = rulerGeo(); rulerDrag = { g, bar: xToBar(g, e.clientX - g.tr.left) };
  $('#ruler-track').setPointerCapture(e.pointerId); e.preventDefault();
});
$('#ruler-track').addEventListener('pointermove', e => { if (rulerDrag) rulerDrag.bar = xToBar(rulerDrag.g, e.clientX - rulerDrag.g.tr.left); });
$('#ruler-track').addEventListener('pointerup', () => { if (!rulerDrag) return; const b = rulerDrag.bar; rulerDrag = null; seekTo(b); });
$('#ruler-track').addEventListener('keydown', e => {
  const now = isPlaying() && mode === 'track' && sched() ? sched().now() : cueBar(), total = songBars();
  const to = { ArrowLeft: Math.floor(now) - 1, ArrowRight: Math.floor(now) + 1, Home: 0, End: total - 1 }[e.key];
  if (to === undefined) return;
  e.preventDefault(); seekTo(Math.max(0, Math.min(total - 1, to)));
});
// a ogni frame: cursore e tempo (durante il trascinamento segue il puntatore)
function updateRuler(playing) {
  const knob = $('#ruler-knob'); if (!knob || !compiled) return;
  const g = rulerGeo(), s = sched();
  const pos = rulerDrag ? rulerDrag.bar : playing && mode === 'track' && s ? Math.min(s.now(), songBars()) : cueBar();
  const x = barToX(g, pos), w = g.tr.width;
  // il cursore resta dentro la barra anche a fine brano (prima sporgeva e faceva comparire le barre di scorrimento)
  knob.style.left = `${Math.max(7, Math.min(w - 7, x))}px`; $('#ruler-fill').style.width = `${Math.max(0, Math.min(w, x))}px`;
  const tt = `${clock(compiled.meta.secondsAt(pos))} / ${clock(compiled.meta.seconds)}`;
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
  if (tr.look) setLook(tr.look);
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
  compiled = playable({ ...T, kind: 'composed' });
  saveDraft(); syncAll(); renderArranger(); renderTrackPanel(); renderSource();
  return true;
}
const asStored = () => { const o = clone(T); delete o.kind; return o; };
$('#tr-save').addEventListener('click', () => {
  const i = user.tracks.findIndex(u => u.id === T.id);
  if (i >= 0) user.tracks[i] = asStored(); else user.tracks.push(asStored());
  dirty = false; saveLibrary(); saveDraft(); renderArranger(); renderSongs(); toast(t('trackSaved'));
});
$('#tr-saveas').addEventListener('click', () => {
  T.id = 'u-' + Date.now(); T.title = t('copyOf', { name: T.title });
  user.tracks.push(asStored());
  dirty = false; compiled = playable({ ...T, kind: 'composed' });
  saveLibrary(); saveDraft(); renderArranger(); renderSongs(); renderSource(); toast(t('trackSaved'));
});
$('#tr-new').addEventListener('click', () => {
  if (dirty && !confirmTwice('new', t('loadConfirm'))) return;
  const name = t('newScene', { n: 1 });
  T = prepare({ id: 'u-' + Date.now(), title: t('newTrackTitle'), look, sections: [{ name, bars: 8, bpm: 128, key: 'A', chords: 'epica', meter: '4/4' }],
    tracks: [{ id: 'drums', name: t('drums'), type: 'drums', settings: baseSettings('drums'), patterns: { A: DEFAULT_PATTERN.drums() }, clips: [{ section: name, pattern: 'A' }] }] });
  sel = 0; tk = 0; editPat = null; syncAll(); changed(); renderTrackPanel();
});
// a new live build song by an artist (#35): written by the director, opened unsaved
function renderArtistPick() {
  const sel = $('#tr-artist'); if (!sel || !artistsTab) return;
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
  const { song: sg } = createSession(RECIPES).next({ artist: a });
  const tr = { ...sg, id: 'u-' + Date.now(), kind: 'composed', style: { en: `${a.name} · ${sg.style.en}`, it: `${a.name} · ${sg.style.it}` } };
  dirty = false;
  if (!loadTrack(tr)) return;
  dirty = true; saveDraft(); renderArranger();
  if (mode !== 'track') backToTrack();
  showTab('componi');
  toast(t('newFromArtistDone', { name: a.name }));
}
$('#tr-del').addEventListener('click', () => {
  if (!confirmTwice('delete')) return;
  const orig = builtinOf(T.id);
  user.tracks = user.tracks.filter(u => u.id !== T.id);
  saveLibrary();
  T = prepare(orig || composedTracks()[0]);
  dirty = false; sel = 0; tk = 0; editPat = null;
  compiled = playable({ ...T, kind: 'composed' });
  saveDraft(); syncAll(); renderArranger(); renderTrackPanel(); renderSongs(); renderSource();
  if (mode === 'track' && ed && !isPlaying()) ed.setCode(compiled.code);
  toast(orig ? t('restored') : t('trackDeleted'));
});

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
function panelHtml(ti) {
  const tr = T.tracks[ti];
  const key = patOf(tr), pat = tr.patterns[key] || {}, c = cellOf(tr, sel), n = meterSteps(secFull().meter);
  const cols = `style="grid-template-columns:repeat(${n}, minmax(0, 1fr))"`;
  const stepBtns = (attr, label) => Array.from({ length: n }, (_, i) => `<button type="button" class="step" data-g="${Math.floor(i / 4) % 4}" ${attr}="${i}" aria-label="${esc(t('stepAria', { name: label, n: i + 1 }))}"></button>`).join('');
  let editor = '';
  if (tr.type === 'drums') {
    editor = `<div class="ctrl"><label class="lbl" for="pt-groove">${t('groove')}</label><select id="pt-groove"></select></div>
      <div class="seq"><span></span><div class="stepnums" ${cols}>${Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
      ${ROWS.map(([id, label]) => `<span class="rowlbl">${label}</span><div class="steps" ${cols}>${Array.from({ length: n }, (_, i) => `<button type="button" class="step" data-g="${Math.floor(i / 4) % 4}" data-row="${id}" data-i="${i}" aria-label="${esc(t('stepAria', { name: label, n: i + 1 }))}"></button>`).join('')}</div>`).join('')}</div>`;
  } else if (PRESET_LIST[tr.type]) {
    editor = `<div class="pt-top"><div class="ctrl"><label class="lbl" for="pt-preset">${t('preset')}</label><select id="pt-preset"></select></div>
      ${tr.type === 'arp' ? `<div class="ctrl"><label class="lbl" for="pt-speed">${t('speed')}</label><select id="pt-speed"><option value="16">${t('sixteenths')}</option><option value="8">${t('eighths')}</option></select></div>` : ''}</div>
      <div class="chsteps" data-n="${n}"${tr.type === 'hook' || tr.type === 'arp' ? ` title="${esc(t('stepsMaskHint'))}"` : ''}><div class="row"><span class="lbl">${t('chSteps')}</span><span class="hint" id="pt-steps-state"></span><button type="button" class="btn small" id="pt-steps-reset">${t('stepsReset')}</button></div>
        <div class="steps" ${cols}>${stepBtns('data-ps', t(tr.type))}</div></div>`;
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
    ${tr.type === 'voice' ? '' : `<div class="tp-pats"><span class="lbl">${t('patterns')}</span>
      <div class="chips">${Object.keys(tr.patterns).map(k => `<button class="chip" data-edit-pat="${esc(k)}" aria-pressed="${k === key}">${esc(k)}</button>`).join('')}
        <button class="chip" id="pt-new">${t('newPattern')}</button><button class="chip" id="pt-del">${t('deletePattern')}</button></div>
      <p class="note">${esc(t('editingPattern', { p: key }))}</p></div>`}
    <div class="tp-editor">${editor}</div>
    <div class="tp-scope"${tr.type === 'voice' ? ' hidden' : ''}><span class="lbl">${t('settingsScope')}</span>
      <div class="chips"><button class="chip" data-scope="track" aria-pressed="${scope === 'track'}">${t('scopeTrack')}</button><button class="chip" data-scope="section" aria-pressed="${scope === 'section'}" ${focusClip(tr) ? '' : 'disabled'}>${esc(arrMode === 'timeline' && selClip !== null ? t('scopeClip') : t('scopeSection', { name: SEC().name }))}</button></div></div>
    <div class="ctrls">${(CONTROLS[tr.type] || []).map(settingHtml).join('')}</div>
    <div class="tp-rack"><div class="row"><span class="lbl">Rack</span><span class="hint">${t('rackHint')}</span></div>
      <div class="rack-list">${(tr.rack || []).map((d, i) => deviceHtml(d, i, tr)).join('') || `<p class="note">${t('noDevices')}</p>`}</div>
      <div class="rack-add"><select id="rk-type" aria-label="${esc(t('addDevice'))}">${['note', 'sound'].map(kind => `<optgroup label="${esc(t(kind === 'note' ? 'devNote' : 'devSound'))}">${Object.entries(DEVICES).filter(([, d]) => d.kind === kind).map(([k, d]) => `<option value="${k}">${esc(tx(d.label))}</option>`).join('')}</optgroup>`).join('')}</select><button class="btn" id="rk-add">${t('addDevice')}</button></div>
    </div>`);
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
  all('[data-set-ramp]').forEach(b => { const on = e[b.dataset.setRamp + 'End'] != null; b.setAttribute('aria-pressed', on); const end = host.querySelector(`[data-end-for="${b.dataset.setRamp}"]`); if (end) end.hidden = !on; });
  // values the live build steps change: a pin shows whether the track's own value is fixed against them
  const sk = compiled.build ? stepKeys(compiled.build, tr.id) : {};
  all('[data-pin]').forEach(b => {
    const k = b.dataset.pin, on = (tr.pinned || []).includes(k), bars = (sk[k] || []).map(x => x + 1).join(', ');
    b.hidden = !bars && !on; b.setAttribute('aria-pressed', on);
    b.title = on ? t('pinOn') : t('pinOff', { bars });
  });
  all('[data-ctl]').forEach(x => x.classList.toggle('over', Object.keys(over).some(k => k === x.dataset.ctl || k === x.dataset.ctl + 'End')));
  if (tr.type === 'drums') all('[data-row]').forEach(b => b.setAttribute('aria-pressed', ((pat.rows || {})[b.dataset.row] || '')[b.dataset.i] === 'x'));
  if (q('pt-preset')) q('pt-preset').value = pat.preset || (DEFAULT_PATTERN[tr.type] ? DEFAULT_PATTERN[tr.type]().preset : '') || '';
  if (q('pt-speed')) q('pt-speed').value = pat.speed || '16';
  if (q('pt-rhythm')) q('pt-rhythm').value = pat.rhythm || 'bar';
  if (q('pt-code') && !active(q('pt-code'))) q('pt-code').value = pat.code || '';
  if (host.querySelector('[data-ps]')) {
    const steps = channelSteps(patState(tr), tr.type);
    all('[data-ps]').forEach(b => b.setAttribute('aria-pressed', steps[b.dataset.ps] === 'x'));
    q('pt-steps-state').textContent = pat.steps ? t('stepsCustom') : t('stepsPreset');
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
  if (scope === 'section' && c) { c.set = { ...(c.set || {}), [k]: v }; return; }
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
  if (role(e.target) === 'pt-code') { const v = e.target.value; clearTimeout(codeTimer); codeTimer = setTimeout(() => editPattern(p => { p.code = v; }), 400); return; }
  if (role(e.target) === 'pt-notes') { const v = e.target.value.trim(); if (!v || /^[-\d~\s[\]<>]+$/.test(v)) editPattern(p => { if (v) p.notes = v; else delete p.notes; }); }
});
let codeTimer = 0;
$('#track-panel').addEventListener('change', e => {
  if (!hostTrack(e)) return;
  const tr = curTrack(), r = role(e.target);
  if (e.target.matches('select[data-set]')) { setSetting(e.target.dataset.set, e.target.value); changed(); syncTrackPanel(); return; }
  if ((r === 'clip-start' || r === 'clip-bars') && selClip !== null && tr.clips[selClip]) {
    const c = tr.clips[selClip], sp = spanOf(tr, c);
    const start = r === 'clip-start' ? Math.round(+e.target.value) - 1 : sp.s, bars = r === 'clip-bars' ? Math.round(+e.target.value) : sp.e - sp.s;
    setClipSpan(tr, c, start, bars); changed(); renderTrackPanel(); return;
  }
  if (e.target.matches('select[data-dev-arg]')) { const [i, name] = e.target.dataset.devArg.split(':'); const v = e.target.value; tr.rack[+i][name] = isNaN(+v) ? v : +v; changed(); syncRack(tr, e.target.closest('[data-ptrk]')); return; }
  if (r === 'pt-preset') editPattern(p => { p.preset = e.target.value; delete p.steps; });
  if (r === 'pt-speed') { editPattern(p => { p.speed = e.target.value; delete p.steps; }); renderTrackPanel(); }
  if (r === 'pt-rhythm') editPattern(p => { p.rhythm = e.target.value; });
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
  if (b.dataset.row) return editPattern(p => { p.rows = p.rows || {}; const a = fitSteps(p.rows[b.dataset.row] || '', n).split(''); a[+b.dataset.i] = a[+b.dataset.i] === 'x' ? '.' : 'x'; const s = a.join(''); if (s.includes('x')) p.rows[b.dataset.row] = s; else delete p.rows[b.dataset.row]; });
  if (b.dataset.ps !== undefined) return editPattern((p, t2) => { const a = channelSteps(patState(t2), t2.type).split(''); a[+b.dataset.ps] = a[+b.dataset.ps] === 'x' ? '.' : 'x'; p.steps = a.join(''); });
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
const setUi = v => { ui = v === 'hw' ? 'hw' : 'neon'; store.set('coding-misk-ui', ui); syncAll(); };
$$('[data-uitheme]').forEach(b => b.addEventListener('click', () => setUi(b.dataset.uitheme)));
const setLook = l => { look = l; store.set('coding-misk-look', l); syncAll(); };
// a look picked while the radio plays becomes the radio's look (the studio by default, #28)
$('#looks').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (!b) return; setLook(b.dataset.look); if (mode === 'radio' && radio && radio.on) store.set('coding-misk-radio-look', b.dataset.look); });
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
  document.documentElement.dataset.ui = ui;
  $$('[data-uitheme]').forEach(b => b.setAttribute('aria-pressed', ui === b.dataset.uitheme));
  syncSectionFields();
  syncTrackPanel();
  $$('#looks .chip').forEach(b => b.setAttribute('aria-pressed', look === b.dataset.look));
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
const TABS = ['componi', 'brani', 'playlist', 'impostazioni', 'generi', 'radio', 'artisti', 'stili', 'guida', 'lezioni', 'suoni', 'riferimenti'];
let cards = [];
// two modes (#42): Listen to make and hear music, Groove Lab for its material and for learning
const APP_MODES = { ascolta: ['componi', 'brani', 'playlist', 'radio'], lab: ['artisti', 'stili', 'generi', 'suoni', 'guida', 'lezioni', 'riferimenti'] };
const modeOf = tab => Object.keys(APP_MODES).find(m => APP_MODES[m].includes(tab)) || null;
let modeTabs = store.get('coding-misk-mode-tabs', {});
if (!modeTabs || typeof modeTabs !== 'object') modeTabs = {};
function setMode(m) {
  $$('.mode-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $$('.tab').forEach(b => { b.hidden = !!m && b.dataset.modeOf !== m; });
}
$$('.mode-btn').forEach(b => b.addEventListener('click', () => { const m = b.dataset.mode, last = modeTabs[m]; showTab(APP_MODES[m].includes(last) ? last : APP_MODES[m][0]); }));
function showTab(name) {
  const m = modeOf(name);
  if (m) { setMode(m); modeTabs[m] = name; store.set('coding-misk-mode-tabs', modeTabs); }
  else $$('.mode-btn').forEach(b => b.setAttribute('aria-pressed', false));
  $$('.tab').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === name));
  for (const id of TABS) $('#tab-' + id).hidden = id !== name;
  if (name === 'brani' && cards.length) renderSongs();
  if (name === 'suoni') renderSounds();
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
function songCard({ tr, p }, i) {
  const m = p.meta, composed = tr.kind === 'composed';
  const ticks = Array.from({ length: Math.max(0, Math.floor(m.bars / 4) - 1) }, (_, k) => `<i style="left:${(k + 1) * 4 / m.bars * 100}%"></i>`).join('');
  const sg = songOf({ tr, p }), kind = kindOf(sg), own = composed && !isBuiltin(tr.id);
  return `<article class="card lesson song" data-song-card="${i}" data-song-id="${esc(tr.id)}">
    <div class="song-head"><span class="badge kind-${kind}">${t(`k:${kind}`)}</span>${sg.mine ? `<span class="badge">${t('mine')}</span>` : ''}
      <span class="song-meta">${t('songMeta', { bpm: m.bpmLabel, bars: m.bars, time: clock(m.seconds) })}</span>${songsView.starButton(tr.id)}</div>
    <h3>${esc(tr.title)}</h3>
    ${tr.style ? `<p>${esc(tx(tr.style))}</p>` : ''}
    ${tr.version ? `<p class="note">${esc(t('versionOf', { title: tr.fromTitle || tr.from }))}</p>` : ''}
    ${(() => { const vs = user.codeSongs.filter(v => v.from === tr.id); return vs.length ? `<div class="song-versions"><span class="lbl">${esc(t('versions'))}</span> ${vs.map(v => `<button class="chip small" data-version="${esc(v.id)}">v${v.version}</button>`).join(' ')}</div>` : ''; })()}
    <div class="song-tags">${songsView.tagsHtml(sg)}${own ? ` <button class="chip small" data-act="tags" aria-expanded="false">${t('tagsEdit')}</button>` : ''}</div>
    ${own ? '<div class="song-tags-edit" hidden></div>' : ''}
    <div class="timeline" data-tl="${i}">
      ${m.sections.map(sec => `<button class="sec${/drop/i.test(sec.key) ? ' drop' : ''}" style="flex:${sec.len}" data-seek="${sec.start}" title="${esc(t('barsRange', { a: sec.start + 1, b: sec.start + sec.len }))}" aria-label="${esc(t('seekAria', { name: sec.label, bar: sec.start + 1 }))}">${esc(sec.label)}</button>`).join('')}
      <span class="ticks">${ticks}</span><span class="head"></span>
    </div>
    <div class="songbar">
      <button class="btn primary" data-act="play">${t('songPlay')}</button>
      <button class="btn" data-act="pause" hidden></button>
      <button class="btn" data-act="stop" hidden>${t('stop')}</button>
      <button class="btn" data-act="export" data-export="${esc(tr.id)}">${t('exportWav')}</button>
      <button class="btn" data-act="playlist" aria-expanded="false">${t('addToPlaylist')}</button>
      ${composed && continuable(tr) ? `<button class="btn" data-act="radio" title="${esc(t('continueRadioTip'))}">${t('continueRadio')}</button>` : ''}
      ${composed ? `<button class="btn" data-act="open">${t('openInCompose')}</button>` : `<button class="btn" data-act="code">${t('editCode')}</button>${user.code[tr.id] && !tr.version ? `<button class="btn danger" data-act="restore">${t('restoreOrig')}</button>` : ''}${tr.version ? `<button class="btn danger" data-act="del-version">${t('plDelete')}</button>` : ''}`}
      <span class="time">${t('songTime', { t: '0:00', total: clock(m.seconds), bar: 1, bars: m.bars })}</span>
      <label class="loop"><input type="checkbox" data-loop="${i}"> ${t('loopSection')}</label>
    </div>
    ${m.sections.length > 1 ? `<div class="trans"><span class="lbl">${t('transitions')}</span>
      ${m.sections.slice(1).map((sec, k) => `<button class="chip" data-seek="${Math.max(0, sec.start - 2)}">${esc(m.sections[k].label)} → ${esc(sec.label)}</button>`).join('')}
    </div>` : ''}
  </article>`;
}
// a card as a song for search and filters (#34): kind, tags, whether it is the user's
function isMine(tr) { return tr.kind === 'composed' ? !isBuiltin(tr.id) || user.tracks.some(u => u.id === tr.id) : !!user.code[tr.id] || !!tr.version; }
function songOf({ tr, p }) {
  // songs generated before #34 have no origin: their id still tells
  return { id: tr.id, title: tr.title, style: tr.style, tags: tr.tags, origin: tr.origin || (/^endless-/.test(tr.id) ? 'endless' : undefined), code: tr.kind !== 'composed', build: tr.kind === 'composed' && hasBuild(tr),
    mine: isMine(tr), bpm: parseFloat(p.meta.bpmLabel) || 0, seconds: p.meta.seconds };
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
function mixSong(id) { const c = libraryCards().find(x => x.tr.id === id); if (!c || c.tr.kind !== 'composed') return null; const { kind, ...sg } = c.tr; return absoluteClips(clone(sg)); }
// the songs an item brings to the mix: a saved song, or the songs of a radio session (frozen, or rebuilt as heard)
const sessionSongs = new Map();
function mixParts(id) {
  if (!isSession(id)) { const sg = mixSong(id); return sg ? [sg] : null; }
  const s = playlists.session(id); if (!s || !radio) return null;
  if (!sessionSongs.has(id)) sessionSongs.set(id, (s.frozen || radio.rebuild(s.recipe, s.count)).map(x => absoluteClips(clone(x.song))));
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
  const first = mixS.items[0];
  return playable({ ...w, id: `mix-${first.id}`, title: first.song.title, kind: 'composed' });
}
function startMix(id) {
  const parts = mixParts(id), sg = parts && parts[0];
  if (!sg) return false;
  mixS = { items: [{ id, parts, part: 0, song: sg, n: ++mixN, start: 0, bars: barsOfSong(sg) }] };
  extendMix();
  mixS.p = mixPlayable();
  if (sg.look) setLook(sg.look);
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
  const p = mixPlayable();
  mixS.p = p; song = p; typing = null; built = buildSteps(p.build).filter(x => x.at <= Math.floor(cyc)).length;
  warmVoices(p); source = { kind: 'song', name: p.title, id: p.id }; renderSource();
  if (mixS.items[0].song.look) setLook(mixS.items[0].song.look);
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
  onPlayList: (listId, ids) => playQueue(listId, ids) });
playlistsTab = createPlaylistsTab({ root: $('#tab-playlist'), t, esc, clock, playlists, confirmTwice, toast,
  songs: () => [...libraryCards().map(c => ({ id: c.tr.id, title: c.tr.title, kind: kindOf(songOf(c)), seconds: c.p.meta.seconds })),
    ...playlists.all.flatMap(l => l.songs).filter(isSession).map(id => { const s = playlists.session(id); return s && { id, title: s.title, kind: 'session', seconds: 0, count: s.count, frozen: !!s.frozen, old: !s.frozen && (s.version || 0) < DIRECTOR_VERSION }; }).filter(Boolean)],
  freeze: id => { const s = playlists.session(id); if (!s || !radio) return; playlists.freeze(id, radio.rebuild(s.recipe, s.count)); sessionSongs.delete(id); toast(t('plFrozen')); },
  sessionOf: id => playlists.session(id),
  play: (listId, ids, startId) => playQueue(listId, ids, startId),
  userSong: id => user.tracks.find(u => u.id === id) || null,
  newSongId: () => { let id; do id = 'u-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4); while (user.tracks.some(u => u.id === id)); return id; },
  addSongs: list => { if (!list.length) return; user.tracks.push(...list.map(clone)); saveLibrary(); cards = []; renderSongs(); },
  onChange: () => { if (!$('#tab-brani').hidden) { songsView.renderBar(); songsView.apply(); } } });
function renderSongs() {
  const composed = composedTracks().map(tr => (tr.id === T.id ? { ...tr, ...T, kind: 'composed' } : tr));
  cards = [...composed, ...codedTracks()].map(tr => ({ tr, p: playable(tr) }));
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
    if (tr.look) setLook(tr.look);
    return playSong(compiled, bar, 'track');
  }
  if (tr.look && !(song && song.id === tr.id)) setLook(tr.look);
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
    if (a === 'stop') return stop();
    if (a === 'radio') return continueInRadio({ ...tr, tags: tr.tags || songOf({ tr, p }).tags }, 0);
    if (a === 'export') {
      if (tr.kind === 'composed') { if (!rec && !loadTrack(tr)) return; return exportTrack(rec ? null : compiled, 'track'); }
      return exportTrack(p, 'free');
    }
    if (a === 'open') {
      if (!loadTrack(tr)) return;
      if (tr.look) setLook(tr.look);
      if (mode !== 'track') backToTrack(); else if (ed && !isPlaying()) ed.setCode(compiled.code);
      showTab('componi'); return;
    }
    if (a === 'code') { if (ed) ed.stop(); paused = null; song = p; mode = 'free'; source = { kind: 'song', name: tr.title, id: tr.id }; renderSource(); if (ed) ed.setCode(p.code); updateShare(); return; }
    if (a === 'del-version') { if (!confirmTwice('delv-' + tr.id, t('confirmAgain'))) return; user.codeSongs = user.codeSongs.filter(v => v.id !== tr.id); delete user.code[tr.id]; saveLibrary(); cards = []; renderSongs(); toast(t('trackDeleted')); return; }
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
(function transport() {
  requestAnimationFrame(transport);
  try { const out = globalThis.getSuperdoughAudioController && globalThis.getSuperdoughAudioController().output.destinationGain; if (out && out.gain.value !== MASTER) out.gain.value = MASTER; } catch (e) {}
  applyVolume();
  if (radio) renderPlayerBar();
  const s = sched();
  const playing = isPlaying();
  if (song && s && playing && !seeking) {
    const m = song.meta, cyc = s.now();
    const ahead = Math.min(m.bars - 1, Math.floor(s.lastEnd + s.cps * .1));
    const target = m.bpm[ahead] / 240;
    if (Math.abs(s.cps - target) > 1e-6) s.setCps(target);
    if (resumeTo !== null) resumeBuild(song, s, cyc);
    else if (song.build && !hand) liveBuild(song, s, cyc);
    if (mode === 'radio' && radio && !hand && resumeTo === null) radio.tick(cyc);
    mixTick(cyc);
    if (loopIdx >= 0) {
      const sec = m.sections[loopIdx];
      if (sec && cyc >= sec.start + sec.len) playSong(song, sec.start, mode);
    } else if (cyc >= m.bars && mode !== 'radio' && !hand && resumeTo === null && !(!rec && advance())) { stop(); if (mode === 'track') ended = compiled.id; if (rec && rec.id === song.id && !rec.ending) rec.ending = performance.now(); }
    // segue la sezione che suona, ma non mentre si sta scrivendo in un campo del brano
    const typing = document.activeElement && document.activeElement.matches('input, select, textarea') && document.activeElement.closest('#arranger, #track-panel');
    if (mode === 'track' && follow && !typing) { const i = m.sectionAt(cyc); if (i >= 0 && i !== sel) selectScene(i); }
  }
  // registrazione: aggancio all'uscita master, coda di riverbero, etichette dei pulsanti
  if (capture) capture.tap();
  if (rec) {
    tapMaster();
    if (rec.ending && performance.now() - rec.ending > 2500 && rec.recorder.state === 'recording') rec.recorder.stop();
    if (!rec.ending && !playing && !seeking && rec.recorder.state === 'recording' && performance.now() - (rec.started || (rec.started = performance.now())) > 3000) rec.ending = performance.now();
  }
  const recLabel = rec ? t('exporting', { t: clock(song && s ? song.meta.secondsAt(s.now()) : 0), total: clock(rec.total) }) : null;
  $$('[data-export]').forEach(b => { const l = rec && (b.dataset.export === rec.id || b.id === 'tr-export') ? recLabel : t('exportWav'); if (b.textContent !== l) b.textContent = l; b.classList.toggle('rec', !!(rec && l === recLabel)); });
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
  const say = playing && !hand && resumeTo === null && song && song.build && s ? sayAt(song.build, s.now(), getLang()) : '', sayEl = $('#say');
  if (say && sayEl.textContent !== say) sayEl.textContent = say;
  sayEl.classList.toggle('on', !!say);
  // avanzamento nell'arrangiatore
  updateRuler(playing);
  const head = $('#arr-strip .head');
  if (head) {
    const trackCyc = playing && mode === 'track' && s ? s.now() : -1;
    const idx = trackCyc >= 0 ? compiled.meta.sectionAt(trackCyc) : -1;
    const btns = $$('.arr-scene-btn'), b = btns[idx];
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
    const m = mine ? song.meta : c.p.meta, cyc = active ? s.now() : isPaused ? paused.cyc : 0;
    card.querySelector('.head').style.left = `${Math.min(100, cyc / m.bars * 100)}%`;
    const cur = active || isPaused ? m.sectionAt(cyc) : -1;
    card.querySelectorAll('.sec').forEach((x, j) => x.classList.toggle('on', j === cur));
    const label = t('songTime', { t: clock(m.secondsAt(cyc)), total: clock(m.seconds), bar: Math.min(m.bars, Math.floor(cyc) + 1), bars: m.bars });
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
const sounds = createSoundBrowser({ root: $('#sounds'), store, t, tx, esc, getCustom: () => custom, play: (code, name) => loadFree(code, { kind: 'sound', name }), stop, useSound, toast, scheduler: sched });
function renderSounds() { sounds.render(); }

// ---------- player bar (#32) ----------
// the library in the order of the Songs tab: composed songs, then hand-written code songs
function libraryCards() { if (!cards.length) { const composed = composedTracks().map(tr => (tr.id === T.id ? { ...tr, ...T, kind: 'composed' } : tr)); cards = [...composed, ...codedTracks()].map(tr => ({ tr, p: playable(tr) })); } return cards; }
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
  let title = T.title, pos = '';
  if (onRadio && rs) {
    const it = rs.stream[rs.onAir], cyc = playing && s ? s.now() : rs.paused ?? it.start;
    title = it.title; pos = t('radioBar', { n: Math.max(1, Math.floor(cyc - it.start) + 1), total: it.bars });
  } else if (song && (playing || (paused && paused.id === song.id))) {
    const m = song.meta, cyc = playing && s ? s.now() : paused.cyc;
    title = mode === 'track' ? T.title : song.title || source.name || title;
    pos = `${clock(m.secondsAt(Math.min(cyc, m.bars)))} / ${clock(m.seconds)}`;
    if (mixActive()) { const it = mixS.items[0], t0 = m.secondsAt(it.start); title = it.song.title; pos = `${clock(Math.max(0, m.secondsAt(Math.min(cyc, m.bars)) - t0))} / ${clock(m.secondsAt(Math.min(m.bars, it.start + it.bars)) - t0)}`; }
  } else if (mode === 'free' && source && source.name) title = source.name;
  // timeline position (not while the user drags it)
  const seek = $('#pb-seek'), sr = seekRange();
  seek.disabled = !sr || (mode === 'free' && !(source && source.kind === 'song') && !onRadio);
  if (!pbSeeking && sr) {
    const cyc = onRadio ? (playing && s ? s.now() : rs && rs.paused !== undefined ? rs.paused : sr.from) : playing && s ? s.now() : paused && song && paused.id === song.id ? paused.cyc : mode === 'track' ? cueBar() : 0;
    const v = Math.round(Math.max(0, Math.min(1, (cyc - sr.from) / sr.bars)) * 1000);
    if (+seek.value !== v) { seek.value = v; seek.style.setProperty('--pos', `${v / 10}%`); }
  }
  if (!onRadio && queue && queue.current === currentSongId()) { const q = queue.position; pos = `${queue.name} · ${q.n} / ${q.total}${pos ? ` · ${pos}` : ''}`; }
  const onair = onRadio && !radio.paused;
  const canNav = onRadio || (currentSongId() !== null && (mode === 'track' || (source && source.kind === 'song')));
  const key = [title, pos, onair, canNav, shuffleOn, repeatMode].join('|');
  if (key === pbLast) return;
  pbLast = key;
  $('#pb-title').textContent = title || ''; $('#pb-pos').textContent = pos;
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
  onRename: (from, to) => {
    for (const tr of [...user.tracks, T]) if (tr.tags && tr.tags.styles) tr.tags.styles = tr.tags.styles.map(id => (id === from ? to : id));
    saveLibrary();
  } });
RECIPES.splice(0, RECIPES.length, ...usableRecipes(stylesTab.usable()));
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
const warmVoices = sg => { try { voiceSamples(sg.build, getLang(), customFiles).forEach(v => globalThis.superdough({ ...v, gain: 0 }, globalThis.getAudioContext().currentTime + .3, .05)); } catch (e) {} };
radio = createRadio({
  root: $('#tab-radio'), t, tx, esc, store, recipes: RECIPES, toast, getLang, artists: () => artistsTab.usable(), face: a => artistsTab.face(a),
  player: {
    makePlayable: sg => playable({ ...sg, kind: 'composed' }),
    start: (p, bar) => { setLook(store.get('coding-misk-radio-look', 'studio')); return playSong(p, bar, 'radio'); },
    // resume after a pause: by hand, the user's code goes on
    resumeAt: (p, bar) => playSong(p, bar, 'radio', { keepHand: true }),
    // a new window while the radio plays: the code on air does not change, the steps to come do
    swap: p => {
      if (mode !== 'radio' || !song) return;
      const s = sched(), cyc = s ? s.now() : 0;
      song = p; typing = null; built = buildSteps(p.build).filter(x => x.at <= Math.floor(cyc)).length;
      warmVoices(p); source = { kind: 'radio', name: p.title }; renderSource();
    },
    // skip: the new window takes over now, its first song starts on "bar"
    jump: (p, bar) => {
      if (mode !== 'radio' || !song) return;
      setHand(false); resumeTo = null;
      song = p; typing = null; built = buildSteps(p.build).filter(x => x.at <= bar).length;
      warmVoices(p); source = { kind: 'radio', name: p.title }; renderSource();
      ed.setCode(codeFor(p, bar)); ed.evaluate();
    },
    stop: () => stop(),
    volume: () => ({ volume, muted }),
    setVolume: v => setVolume(v),
    toggleMute: () => toggleMute(),
    renderVolume: () => renderVolume(),
    // stops the sound and gives the bar it stopped at
    halt: () => { const s = sched(), cyc = s ? s.now() : 0; ed.stop(); return cyc; },
    capture: () => startCapture(),
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
  opts($('#tk-type'), ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture', 'riser', 'code', 'voice'].map(k => [k, `${TYPE_ICON[k]}  ${t(k)}`]));
  opts($('#sc-meter'), METERS.map(([k]) => [k, k]));
  opts($('#sc-fade'), [['0', t('cut')], ['1', t('fade1')], ['2', t('fadeN', { n: 2 })], ['4', t('fadeN', { n: 4 })], ['8', t('fadeN', { n: 8 })]]);
  if (radio) radio.render();
  if (stylesTab) stylesTab.render();
  if (artistsTab) artistsTab.render();
  renderArtistPick();
  $('#looks').innerHTML = LOOKS.map(([k, l]) => `<button class="chip" data-look="${k}">${esc(tx(l))}</button>`).join('');
  $('#play').dataset.state = '';
}
function renderAll() {
  renderStatic(); renderLessons(); renderGuide(); renderSongs(); renderSounds(); renderRefs(); renderSource(); renderArranger(); renderTrackPanel();
  syncAll();
}
function changeLang(l) {
  setLang(l);
  compiled = playable({ ...T, kind: 'composed' });
  renderAll();
  if (mode === 'track' && ed && !isPlaying()) ed.setCode(compiled.code);
}
$$('[data-lang]').forEach(b => b.addEventListener('click', () => changeLang(b.dataset.lang)));
// settings page (#31): the gear opens it, a second press goes back to the tab before
settingsPage = createSettings({ root: $('#tab-impostazioni'), t, tx, esc, store, looks: LOOKS, toast, confirmTwice,
  app: {
    ui: () => ui, setUi: v => setUi(v), lang: () => getLang(), setLang: l => changeLang(l),
    volume: () => volume, setVolume: v => setVolume(v),
    radioSettings: () => (radio ? radio.settings : { transition: 'artist', harmony: 'artist', scope: 'song' }), setRadio: (k, v) => radio && radio.setOption(k, v),
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
startVisuals({
  getS: () => ({ look }),
  // the studio scene (#28): the radio's song on air, or the song playing elsewhere
  getInfo(cyc) {
    if (mode === 'radio' && radio && radio.on) return radio.info(cyc);
    if (!song || !song.meta) return { title: T.title };
    const it = mixActive() ? mixS.items[0] : null, rel = it ? cyc - it.start : cyc;
    const said = song.build ? buildSteps(song.build).filter(x => x.say && x.at <= cyc).pop() : null;
    return { title: it ? it.song.title : mode === 'track' ? T.title : song.title, bar: rel, bars: it ? it.bars : song.meta.bars, bpm: Math.round((song.meta.bpm || [])[Math.max(0, Math.floor(cyc))] || 0) || undefined, say: said ? sayText(said.say, getLang()) : '', sayAt: said ? said.at - (it ? it.start : 0) : 0 };
  },
  getSteps: () => meterSteps(secFull().meter),
  // il sequencer mostra il playhead solo se la scena selezionata è quella che sta suonando
  getMode: () => (mode === 'track' && song && isPlaying() && song.meta.sectionAt(sched().now()) === sel ? 'comp' : 'free'),
  isPlaying, sched,
  readout(cyc, step, playing) {
    if (!playing) return `${secFull().bpm} BPM  ·  ${paused ? t('resume').replace('▶ ', '') : t('rdPaused')}\n${t('rdHint')}`;
    const bar = Math.floor(cyc);
    const cur = song && mode === 'track' ? T.sections[song.meta.sectionAt(cyc)] : null;
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
