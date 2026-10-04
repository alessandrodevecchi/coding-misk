import '@strudel/repl';
import './style.css';
import { METERS, meterSteps, fitSteps, GUITAR_TYPES, GUITAR_PATTERNS, HARMONIES, KEYS, PROGS, WAVES, MOVES, BASS, ARPS, HOOKS, MODES, VOWELS, PADS, TEXTURES, TEX_RHYTHMS, KITS, ROWS, GROOVES, LOOKS, DEFAULT, withVisuals, chordName, compileTrack, cloneState, normalizeState } from './music.js';
import { BUILTIN_TRACKS } from './tracks.js';
import { LESSONS, SOUND_GROUPS, REFS, SONGS } from './content.js';
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
};
setLang(getLang());

// ---------- libreria dei brani ----------
// "composed": fatti di scene, si aprono nell'arrangiatore.
// "coded": le versioni originali scritte a mano, si modificano nell'editor.
// Le modifiche dell'utente vivono in localStorage e hanno la precedenza sugli originali.
const user = store.get('coding-misk-library', { tracks: [], code: {} });
const saveLibrary = () => store.set('coding-misk-library', user);
const CODED = SONGS.map(sg => ({ ...sg, kind: 'coded' }));
const builtinOf = id => BUILTIN_TRACKS.find(b => b.id === id);
const isBuiltin = id => !!builtinOf(id) || CODED.some(c => c.id === id);
const withStates = tr => ({ ...tr, scenes: tr.scenes.map(s => ({ ...s, state: normalizeState(s.state) })) });
function composedTracks() {
  const builtins = BUILTIN_TRACKS.map(b => { const o = user.tracks.find(u => u.id === b.id); return o ? { ...b, ...o } : b; });
  return [...builtins, ...user.tracks.filter(u => !builtinOf(u.id))].map(tr => ({ ...withStates(tr), kind: 'composed' }));
}
const codedTracks = () => CODED.map(c => ({ ...c, code: user.code[c.id] || c.code }));
// oggetto riproducibile: codice + mappa di sezioni e tempo
function playable(tr) {
  const code = tr.kind === 'composed' ? compileTrack(tr) : tr.code;
  const meta = parseSong(code);
  if (tr.kind === 'composed') {
    // la mappa del tempo è in "BPM da 4/4": per l'etichetta usiamo i BPM veri delle scene
    const v = tr.scenes.flatMap(s => [s.state.bpm, s.state.bpmEnd ?? s.state.bpm]), lo = Math.min(...v), hi = Math.max(...v);
    meta.bpmLabel = lo === hi ? `${lo}` : `${lo}→${hi}`;
  }
  return { id: tr.id, title: tr.title, kind: tr.kind, look: tr.look, code, meta };
}

// ---------- brano in modifica ----------
const draft = store.get('coding-misk-draft', null);
let T = withStates(draft && draft.T && draft.T.scenes && draft.T.scenes.length ? draft.T : clone(BUILTIN_TRACKS[0]));
let sel = Math.min(draft ? draft.sel || 0 : 0, T.scenes.length - 1);
let dirty = !!(draft && draft.dirty);
let S = T.scenes[sel].state;
let look = store.get('coding-misk-look', T.look || 'palco');
if (!LOOKS.some(([k]) => k === look)) look = 'palco';
let compiled = playable({ ...T, kind: 'composed' });
const saveDraft = () => store.set('coding-misk-draft', { T, sel, dirty });
const sceneStart = i => T.scenes.slice(0, i).reduce((a, s) => a + s.bars, 0);

// ---------- editor Strudel e trasporto ----------
let ed = null, mode = 'track', evalTimer = 0, song = null, loopIdx = -1, follow = true, seeking = false;
let paused = null; // { id, cyc } quando la musica è in pausa
let source = { kind: 'track' };
const el = document.createElement('strudel-editor');
el.innerHTML = `<!--\n${compiled.code}\n-->`;
$('#edhost').appendChild(el);
const ready = new Promise(res => { const iv = setInterval(() => { if (el.editor) { clearInterval(iv); ed = el.editor; res(ed); } }, 100); });
// il REPL carica solo una parte di dirt-samples: carichiamo l'archivio completo (arpy, industrial, glitch, …)
ready.then(() => { try { globalThis.samples && globalThis.samples('github:tidalcycles/dirt-samples'); } catch (e) { console.error(e); } });
// campioni personalizzati da public/samples/ (elenco generato dal plugin in vite.config.js)
let custom = [];
ready.then(async () => {
  try {
    const list = await (await fetch('/samples/strudel.json')).json();
    custom = Object.keys(list).filter(k => k !== '_base');
    if (!custom.length) return;
    await globalThis.samples('/samples/strudel.json');
    renderChannels(); renderSounds(); syncAll();
  } catch (e) { console.warn('campioni personalizzati non disponibili', e); }
});
const sched = () => ed && ed.repl && ed.repl.scheduler;
const isPlaying = () => !!(sched() && sched().started);

// Strudel carica i worklet audio (supersaw, rumore, effetti) solo al primo mousedown.
// Li inizializziamo noi dentro il gesto dell'utente, così funziona anche da tastiera.
let audioInit = null;
function initAudioOnce() {
  if (!audioInit && typeof globalThis.initAudio === 'function') audioInit = globalThis.initAudio().catch(e => { audioInit = null; console.error(e); });
  return audioInit;
}

// Riproduce un brano dalla posizione "bar" (anche frazionaria): lo scheduler di Strudel riprende
// da lastEnd, quindi basta impostarlo prima di avviare. Il tempo lo gestisce transport() battuta per battuta.
async function playSong(sg, bar = 0, as = 'free') {
  if (seeking) return;
  seeking = true;
  try {
    initAudioOnce();
    await ready;
    await initAudioOnce();
    const m = sg.meta;
    bar = Math.max(0, Math.min(m.bars - .01, bar));
    paused = null; song = sg; mode = as;
    source = as === 'track' ? { kind: 'track' } : { kind: 'song', name: sg.title, id: sg.id };
    renderSource();
    ed.stop();
    ed.setCode(withVisuals(sg.code).replace(/setcpm\([^)]*\)/, `setcpm(${+m.bpm[Math.floor(bar)].toFixed(2)}/4)`));
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
  if (mode === 'track' && !isPlaying()) return playSong(compiled, sceneStart(sel), 'track');
  paused = null;
  await ed.evaluate();
  updateShare();
}
function pause() {
  if (!isPlaying()) return;
  paused = { id: song ? song.id : null, cyc: sched().now() };
  ed.stop();
}
function resume() {
  const p = paused;
  if (p && song && p.id === song.id) return playSong(song, p.cyc, mode);
  paused = null;
  return play();
}
const togglePlay = () => isPlaying() ? pause() : paused ? resume() : play();
async function stop() { await ready; paused = null; ed.stop(); }

// ogni modifica alla composizione: brano non salvato, codice ricompilato, rivalutato se sta suonando
function changed() {
  dirty = true; saveDraft();
  compiled = playable({ ...T, kind: 'composed' });
  renderArranger();
  if (!$('#tab-brani').hidden) renderSongs();
  if (mode !== 'track') return backToTrack();
  if (ed) ed.setCode(compiled.code);
  if (song && song.id === compiled.id) song = compiled;
  updateShare();
  clearTimeout(evalTimer);
  if (isPlaying()) evalTimer = setTimeout(() => ed.evaluate(), 150);
}
async function loadFree(code, src) {
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
  $$('.snd.on').forEach(b => b.classList.remove('on'));
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
  const recorder = new MediaRecorder(dest.stream);
  rec = { recorder, dest, chunks: [], node: null, id: sg.id, title: sg.title, total: sg.meta.seconds, ending: 0, cancel: false };
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
  const audio = await globalThis.getAudioContext().decodeAudioData(await blob.arrayBuffer());
  const url = URL.createObjectURL(wavBlob(audio));
  const a = document.createElement('a');
  a.href = url; a.download = `${(r.title || 'coding-misk').replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim() || 'coding-misk'}.wav`;
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

// ---------- arrangiatore ----------
function selectScene(i) {
  if (i < 0 || i >= T.scenes.length) return;
  if (i === sel && S === T.scenes[i].state) return;
  sel = i; S = T.scenes[i].state;
  saveDraft(); syncAll(); renderArranger();
}
function renderTrackPick() {
  const list = composedTracks();
  if (!list.some(tr => tr.id === T.id)) list.push({ ...T, kind: 'composed' });
  $('#track-pick').innerHTML = list.map(tr => `<option value="${esc(tr.id)}">${esc(tr.id === T.id ? T.title : tr.title)}${!isBuiltin(tr.id) ? ` · ${t('mine')}` : ''}</option>`).join('');
  $('#track-pick').value = T.id;
}
function renderArranger() {
  const total = T.scenes.reduce((a, s) => a + s.bars, 0);
  $('#arr-strip').innerHTML = T.scenes.map((s, i) => `<button class="arr-scene-btn${i > 0 && s.fade ? ' fade' : ''}" data-scene-i="${i}" style="flex-grow:${s.bars}" aria-current="${i === sel}">
      <b>${esc(s.name || t('newScene', { n: i + 1 }))}</b><span>${s.bars} · ${s.state.bpmEnd ? `${s.state.bpm}→${s.state.bpmEnd}` : s.state.bpm}</span></button>`).join('') + '<span class="head"></span>';
  const sc = T.scenes[sel];
  if (document.activeElement !== $('#track-title')) $('#track-title').value = T.title;
  if (document.activeElement !== $('#sc-name')) $('#sc-name').value = sc.name;
  if (document.activeElement !== $('#sc-bars')) $('#sc-bars').value = sc.bars;
  $('#sc-fade').value = String(sel === 0 ? 0 : sc.fade || 0);
  $('#sc-fade').disabled = sel === 0;
  $('#sc-crash').checked = !!sc.crash; $('#sc-breath').checked = !!sc.breath; $('#sc-fill').checked = !!sc.fill;
  $('#sc-left').disabled = sel === 0; $('#sc-right').disabled = sel === T.scenes.length - 1; $('#sc-del').disabled = T.scenes.length === 1;
  $('#dirty').textContent = dirty ? t('unsaved') : '';
  const builtin = isBuiltin(T.id), overridden = user.tracks.some(u => u.id === T.id);
  $('#tr-del').textContent = builtin ? t('restoreOrig') : t('deleteTrack');
  $('#tr-del').disabled = builtin && !overridden && !dirty;
  $('#arr-total').textContent = t('arrTotal', { scenes: T.scenes.length, bars: total, time: clock(compiled.meta.seconds) });
  $('#sc-loop').checked = loopIdx >= 0 && mode === 'track';
  renderTrackPick();
}
// clic su una scena: se il brano suona salta lì, altrimenti la seleziona
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
$('#sc-name').addEventListener('input', e => { T.scenes[sel].name = e.target.value; changed(); });
$('#sc-bars').addEventListener('change', e => { T.scenes[sel].bars = Math.max(1, Math.min(64, Math.round(+e.target.value) || 8)); changed(); });
$('#sc-fade').addEventListener('change', e => { T.scenes[sel].fade = +e.target.value; changed(); });
$('#sc-crash').addEventListener('change', e => { T.scenes[sel].crash = e.target.checked; changed(); });
$('#sc-breath').addEventListener('change', e => { T.scenes[sel].breath = e.target.checked; changed(); });
$('#sc-fill').addEventListener('change', e => { T.scenes[sel].fill = e.target.checked; changed(); });
$('#sc-add').addEventListener('click', () => {
  const copy = clone(T.scenes[sel]);
  copy.name = t('newScene', { n: T.scenes.length + 1 }); copy.fade = 0;
  T.scenes.splice(sel + 1, 0, copy);
  sel += 1; S = T.scenes[sel].state; syncAll(); changed();
});
$('#sc-del').addEventListener('click', () => {
  if (T.scenes.length === 1) return toast(t('minScene'));
  if (!confirmTwice('scene')) return;
  T.scenes.splice(sel, 1);
  sel = Math.min(sel, T.scenes.length - 1); S = T.scenes[sel].state; syncAll(); changed();
});
const moveScene = d => {
  const j = sel + d; if (j < 0 || j >= T.scenes.length) return;
  [T.scenes[sel], T.scenes[j]] = [T.scenes[j], T.scenes[sel]];
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

function loadTrack(tr) {
  if (tr.id !== T.id && dirty && !confirmTwice('load', t('loadConfirm'))) return false;
  if (tr.id !== T.id) { T = withStates(clone({ id: tr.id, title: tr.title, look: tr.look, scenes: tr.scenes })); dirty = false; }
  sel = 0; S = T.scenes[0].state; paused = null;
  compiled = playable({ ...T, kind: 'composed' });
  saveDraft(); syncAll(); renderArranger(); renderSource();
  return true;
}
const asStored = () => clone({ id: T.id, title: T.title, look: T.look, scenes: T.scenes });
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
  T = { id: 'u-' + Date.now(), title: t('newTrackTitle'), look, scenes: [{ name: t('newScene', { n: 1 }), bars: 8, fade: 0, crash: false, breath: false, state: cloneState(DEFAULT) }] };
  sel = 0; S = T.scenes[0].state; syncAll(); changed();
});
$('#tr-del').addEventListener('click', () => {
  if (!confirmTwice('delete')) return;
  const orig = builtinOf(T.id);
  user.tracks = user.tracks.filter(u => u.id !== T.id);
  saveLibrary();
  T = withStates(clone(orig || composedTracks()[0]));
  dirty = false; sel = 0; S = T.scenes[0].state;
  compiled = playable({ ...T, kind: 'composed' });
  saveDraft(); syncAll(); renderArranger(); renderSongs(); renderSource();
  if (mode === 'track' && ed && !isPlaying()) ed.setCode(compiled.code);
  toast(orig ? t('restored') : t('trackDeleted'));
});

// ---------- controlli della scena ----------
const opts = (box, list) => {
  const v = box.value;
  box.innerHTML = list.map(([val, l]) => `<option value="${esc(val)}">${esc(tx(l))}</option>`).join('');
  if (v) box.value = v;
};
const named = obj => Object.entries(obj).map(([k, v]) => [k, v[0]]);
const NUM4 = { max: 4, step: .1, fmt: 'num' };
// [tipo, chiave, etichetta, opzioni]: "range" e "cutoff" con ramp hanno anche il valore a fine scena
const CONTROLS = {
  drums: [['range', 'gain', 'volume', { ramp: 1 }], ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['range', 'drive', 'drive', NUM4], ['range', 'grit', 'grit']],
  bass: [['select', 'preset', 'rhythm', () => named(BASS)], ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'reso', 'reso', { max: 30, step: 1, fmt: 'num' }], ['range', 'drive', 'drive', NUM4]],
  arp: [['select', 'preset', 'figure', () => named(ARPS)], ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['select', 'speed', 'speed', () => [['16', t('sixteenths')], ['8', t('eighths')]]],
    ['range', 'reso', 'reso', { max: 30, step: 1, fmt: 'num' }], ['range', 'drive', 'drive', NUM4], ['range', 'delay', 'delay']],
  hook: [['select', 'preset', 'melody', () => named(HOOKS)], ['select', 'mode', 'mode', () => MODES], ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'fm', 'fm', { max: 8, step: .5, fmt: 'num' }],
    ['select', 'octave', 'octaveOpt', () => [['3', '3'], ['4', '4'], ['5', '5']]], ['select', 'harmony', 'harmony', () => HARMONIES], ['range', 'drive', 'drive', NUM4], ['select', 'vowel', 'vowel', () => VOWELS], ['range', 'grit', 'grit'], ['range', 'delay', 'delay']],
  guitar: [['select', 'type', 'type', () => named(GUITAR_TYPES)], ['select', 'pattern', 'rhythm', () => named(GUITAR_PATTERNS)], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['range', 'drive', 'drive', { max: 8, step: .1, fmt: 'num' }],
    ['select', 'octave', 'tuning', () => [['0', t('standard')], ['-2', t('dropTuning')], ['-12', t('lowOpt')]]], ['select', 'width', 'width', () => [['double', t('doubleOpt')], ['mono', t('mono')]]], ['range', 'room', 'reverb']],
  pad: [['select', 'preset', 'type', () => named(PADS)], ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'drive', 'drive', NUM4], ['range', 'room', 'reverb']],
  texture: [['select', 'sample', 'sample', () => [...TEXTURES, ...custom].map(x => [x, x])], ['select', 'rhythm', 'rhythm', () => named(TEX_RHYTHMS)],
    ['range', 'gain', 'volume', { ramp: 1 }], ['range', 'grit', 'grit'], ['range', 'room', 'reverb']],
  riser: [['range', 'gain', 'volume'], ['select', 'bars', 'length', () => ['2', '4', '8', '16'].map(n => [n, t('nBars', { n })])],
    ['select', 'dir', 'direction', () => [['up', t('up')], ['down', t('down')]]]],
};
const CHANNELS = ['bass', 'guitar', 'arp', 'hook', 'pad', 'texture', 'riser'];
// filtro su scala logaritmica 100 Hz … 20 kHz (20 kHz = aperto)
const cutToRange = c => Math.round(Math.log(c / 100) / Math.log(200) * 100);
const rangeToCut = v => Math.round(100 * Math.pow(200, v / 100));

function controlHtml(ch, [type, key, label, o]) {
  const id = `${ch}-${key}`, path = `${ch}.${key}`;
  if (type === 'select') return `<div class="ctrl"><label class="lbl" for="${id}">${t(label)}</label><select id="${id}" data-path="${path}"></select></div>`;
  const opt = typeof o === 'object' ? o : {};
  const attrs = type === 'cutoff' ? 'data-cut="1" min="0" max="100" step="1"' : `min="0" max="${opt.max || 1}" step="${opt.step || .01}"${opt.fmt ? ` data-fmt="${opt.fmt}"` : ''}`;
  const slider = (sid, spath) => `<input type="range" id="${sid}" data-path="${spath}" ${attrs}>`;
  const ramp = opt.ramp ? `<button type="button" class="ramp" data-ramp="${path}" aria-label="${esc(t('rampToggle'))}" title="${esc(t('rampToggle'))}">↗</button>` : '';
  const end = opt.ramp ? `<div class="end" data-end-for="${path}" hidden><div class="row"><label class="lbl" for="${id}End">${esc(t('endOf', { name: t(label) }))}</label><output id="${id}End-o"></output></div>${slider(id + 'End', path + 'End')}</div>` : '';
  return `<div class="ctrl"><div class="row"><label class="lbl" for="${id}">${t(label)}</label>${ramp}<output id="${id}-o"></output></div>${slider(id, path)}${end}</div>`;
}
function renderChannels() {
  $('#drums-ctrls').innerHTML = CONTROLS.drums.map(c => controlHtml('drums', c)).join('');
  $('#channels').innerHTML = CHANNELS.map(ch => `
    <div class="card" id="ch-${ch}">
      <div class="chhead"><button class="led" data-on="${ch}" aria-label="${esc(t('onoff', { name: t(ch) }))}"></button><h3>${t(ch)}</h3><span class="hint">${t(ch + 'Hint')}</span></div>
      <div class="ctrls">${CONTROLS[ch].map(c => controlHtml(ch, c)).join('')}</div>
    </div>`).join('');
  for (const ch of ['drums', ...CHANNELS]) for (const [type, key, , list] of CONTROLS[ch]) if (type === 'select') opts($(`#${ch}-${key}`), list());
}
function renderSeq() {
  const n = meterSteps(S.meter), cols = `style="grid-template-columns:repeat(${n}, minmax(0, 1fr))"`;
  $('#seq').dataset.n = n;
  $('#seq').innerHTML = `<span></span><div class="stepnums" ${cols}>` + Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join('') + '</div>' +
    ROWS.map(([id, label]) => `<button class="rowlbl" data-row="${id}" title="${esc(t('muteRow', { name: label }))}">${label}</button><div class="steps" ${cols}>${
      Array.from({ length: n }, (_, i) => `<button class="step" data-g="${Math.floor(i / 4) % 4}" data-row="${id}" data-i="${i}" aria-label="${esc(t('stepAria', { name: label, n: i + 1 }))}"></button>`).join('')}</div>`).join('');
}
// adegua le righe del sequencer al metro della scena
function fitRows() {
  const n = meterSteps(S.meter);
  for (const [id] of ROWS) S.drums.rows[id].steps = fitSteps(S.drums.rows[id].steps, n);
  if (+$('#seq').dataset.n !== n) renderSeq();
}
$('#seq').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const row = S.drums.rows[b.dataset.row];
  if (b.classList.contains('step')) {
    const i = +b.dataset.i, a = row.steps.split('');
    a[i] = a[i] === 'x' ? '.' : 'x'; row.steps = a.join('');
  } else row.mute = !row.mute;
  $('#drums-preset').value = '';
  syncAll(); changed();
});
$('#drums-preset').addEventListener('change', e => {
  const g = GROOVES[e.target.value]; if (!g) return;
  for (const [id] of ROWS) S.drums.rows[id].steps = fitSteps(g[1][id], meterSteps(S.meter));
  syncAll(); changed();
});

const getPath = p => p.split('.').reduce((o, k) => o[k], S);
const setPath = (p, v) => { const k = p.split('.'); const last = k.pop(); k.reduce((o, x) => o[x], S)[last] = v; };
document.addEventListener('input', e => {
  const p = e.target.dataset && e.target.dataset.path; if (!p) return;
  let v = e.target.value;
  if (e.target.type === 'range') v = e.target.dataset.cut ? rangeToCut(+v) : +v;
  setPath(p, v); syncOutputs(); changed();
});
document.addEventListener('change', e => {
  if (e.target.matches('select[data-path]')) { setPath(e.target.dataset.path, e.target.value); if (e.target.dataset.path === 'meter') { fitRows(); syncAll(); } changed(); }
});
document.addEventListener('click', e => {
  const led = e.target.closest('[data-on]');
  if (led) { S[led.dataset.on].on = !S[led.dataset.on].on; syncAll(); changed(); return; }
  // automazione: attiva il valore a fine scena partendo da quello attuale, o la toglie
  const rb = e.target.closest('[data-ramp]');
  if (rb) { const p = rb.dataset.ramp + 'End'; setPath(p, getPath(p) === null || getPath(p) === undefined ? getPath(rb.dataset.ramp) : null); syncAll(); changed(); }
});
$('#key').addEventListener('change', e => { S.key = e.target.value; changed(); });
$('#prog').addEventListener('change', e => { S.prog = e.target.value; changed(); });
const clampBpm = v => Math.max(60, Math.min(200, Math.round(+v) || 138));
$('#bpm').addEventListener('change', e => { S.bpm = clampBpm(e.target.value); syncAll(); changed(); });
$('#bpm-end').addEventListener('change', e => { S.bpmEnd = clampBpm(e.target.value); syncAll(); changed(); });
$('#bpm-ramp').addEventListener('click', () => { S.bpmEnd = S.bpmEnd == null ? S.bpm : null; syncAll(); changed(); });
$$('[data-bpm]').forEach(b => b.addEventListener('click', () => { S.bpm = clampBpm(S.bpm + +b.dataset.bpm); syncAll(); changed(); }));

// tema dell'interfaccia: neon (predefinito) o hardware con manopole, display e LED
let ui = store.get('coding-misk-ui', 'neon');
const setUi = v => { ui = v === 'hw' ? 'hw' : 'neon'; store.set('coding-misk-ui', ui); syncAll(); };
$$('[data-uitheme]').forEach(b => b.addEventListener('click', () => setUi(b.dataset.uitheme)));
const setLook = l => { look = l; store.set('coding-misk-look', l); syncAll(); };
$('#looks').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (b) setLook(b.dataset.look); });
$('#fs').addEventListener('click', () => {
  const w = $('#stagewrap');
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (w.requestFullscreen) w.requestFullscreen().catch(() => toast(t('fsNo')));
    else toast(t('fsNo'));
  } catch (e) { toast(t('fsNo')); }
});

function syncOutputs() {
  $$('input[type=range][data-path]').forEach(i => {
    const v = getPath(i.dataset.path), o = $('#' + i.id + '-o');
    if (!o || v === null || v === undefined) return;
    o.textContent = i.dataset.cut ? (v >= 18000 ? '∞' : `${v} Hz`) : i.dataset.fmt === 'num' ? String(v) : `${Math.round(v * 100)}%`;
  });
}
function syncAll() {
  document.documentElement.dataset.look = look;
  document.documentElement.dataset.ui = ui;
  $$('[data-uitheme]').forEach(b => b.setAttribute('aria-pressed', ui === b.dataset.uitheme));
  fitRows();
  $('#bpm').value = S.bpm; $('#key').value = S.key; $('#prog').value = S.prog;
  $('#bpm-ramp').setAttribute('aria-pressed', S.bpmEnd != null);
  $('#bpm-end-row').hidden = S.bpmEnd == null;
  if (S.bpmEnd != null) $('#bpm-end').value = S.bpmEnd;
  $$('[data-path]').forEach(i => { const v = getPath(i.dataset.path); if (v === null || v === undefined) return; i.value = i.dataset.cut ? cutToRange(v) : v; });
  $$('[data-ramp]').forEach(b => {
    const on = getPath(b.dataset.ramp + 'End') != null;
    b.setAttribute('aria-pressed', on);
    const end = $(`[data-end-for="${b.dataset.ramp}"]`); if (end) end.hidden = !on;
  });
  $$('[data-on]').forEach(b => {
    const on = S[b.dataset.on].on;
    b.setAttribute('aria-pressed', on);
    (b.dataset.on === 'drums' ? $('#drums') : $('#ch-' + b.dataset.on)).classList.toggle('off', !on);
  });
  $$('.step').forEach(b => b.setAttribute('aria-pressed', S.drums.rows[b.dataset.row].steps[b.dataset.i] === 'x'));
  $$('.rowlbl').forEach(b => b.setAttribute('aria-pressed', S.drums.rows[b.dataset.row].mute));
  $$('#looks .chip').forEach(b => b.setAttribute('aria-pressed', look === b.dataset.look));
  $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', getLang() === b.dataset.lang));
  syncOutputs();
}

// tab
const TABS = ['componi', 'brani', 'guida', 'suoni', 'riferimenti'];
let cards = [];
function showTab(name) {
  $$('.tab').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === name));
  for (const id of TABS) $('#tab-' + id).hidden = id !== name;
  if (name === 'brani' && cards.length) renderSongs();
  store.set('coding-misk-tab', name);
}
$$('.tab').forEach(tb => tb.addEventListener('click', () => showTab(tb.dataset.tab)));

// ---------- guida ----------
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
  return `<article class="card lesson song" data-song-card="${i}">
    <div class="song-head"><span class="badge${composed ? ' composed' : ''}">${composed ? t('composedBadge') : t('codedBadge')}</span>${composed && !isBuiltin(tr.id) ? `<span class="badge">${t('mine')}</span>` : ''}
      <span class="song-meta">${t('songMeta', { bpm: m.bpmLabel, bars: m.bars, time: clock(m.seconds) })}</span></div>
    <h3>${esc(tr.title)}</h3>
    ${tr.style ? `<p>${esc(tx(tr.style))}</p>` : ''}
    <div class="timeline" data-tl="${i}">
      ${m.sections.map(sec => `<button class="sec${/drop/i.test(sec.key) ? ' drop' : ''}" style="flex:${sec.len}" data-seek="${sec.start}" title="${esc(t('barsRange', { a: sec.start + 1, b: sec.start + sec.len }))}" aria-label="${esc(t('seekAria', { name: sec.label, bar: sec.start + 1 }))}">${esc(sec.label)}</button>`).join('')}
      <span class="ticks">${ticks}</span><span class="head"></span>
    </div>
    <div class="songbar">
      <button class="btn primary" data-act="play">${t('songPlay')}</button>
      <button class="btn" data-act="pause" hidden></button>
      <button class="btn" data-act="stop" hidden>${t('stop')}</button>
      <button class="btn" data-act="export" data-export="${esc(tr.id)}">${t('exportWav')}</button>
      ${composed ? `<button class="btn" data-act="open">${t('openInCompose')}</button>` : `<button class="btn" data-act="code">${t('editCode')}</button>${user.code[tr.id] ? `<button class="btn danger" data-act="restore">${t('restoreOrig')}</button>` : ''}`}
      <span class="time">${t('songTime', { t: '0:00', total: clock(m.seconds), bar: 1, bars: m.bars })}</span>
      <label class="loop"><input type="checkbox" data-loop="${i}"> ${t('loopSection')}</label>
    </div>
    ${m.sections.length > 1 ? `<div class="trans"><span class="lbl">${t('transitions')}</span>
      ${m.sections.slice(1).map((sec, k) => `<button class="chip" data-seek="${Math.max(0, sec.start - 2)}">${esc(m.sections[k].label)} → ${esc(sec.label)}</button>`).join('')}
    </div>` : ''}
  </article>`;
}
function renderSongs() {
  const composed = composedTracks().map(tr => (tr.id === T.id ? { ...tr, ...T, kind: 'composed' } : tr));
  const coded = codedTracks();
  cards = [...composed, ...coded].map(tr => ({ tr, p: playable(tr) }));
  $('#songs').innerHTML = cards.slice(0, composed.length).map(songCard).join('') +
    `<h3 class="songs-sub">${t('codedSection')}</h3><p class="note">${t('codedIntro')}</p>` +
    cards.slice(composed.length).map((c, k) => songCard(c, composed.length + k)).join('') +
    `<p class="note">${t('seekHint')}</p>`;
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
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'play') return startCard(i, 0);
    if (a === 'pause') return togglePlay();
    if (a === 'stop') return stop();
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
(function transport() {
  requestAnimationFrame(transport);
  try { const out = globalThis.getSuperdoughAudioController && globalThis.getSuperdoughAudioController().output.destinationGain; if (out && out.gain.value !== MASTER) out.gain.value = MASTER; } catch (e) {}
  const s = sched();
  const playing = isPlaying();
  if (song && s && playing && !seeking) {
    const m = song.meta, cyc = s.now();
    const ahead = Math.min(m.bars - 1, Math.floor(s.lastEnd + s.cps * .1));
    const target = m.bpm[ahead] / 240;
    if (Math.abs(s.cps - target) > 1e-6) s.setCps(target);
    if (loopIdx >= 0) {
      const sec = m.sections[loopIdx];
      if (sec && cyc >= sec.start + sec.len) playSong(song, sec.start, mode);
    } else if (cyc >= m.bars) { stop(); if (rec && rec.id === song.id && !rec.ending) rec.ending = performance.now(); }
    if (mode === 'track' && follow) { const i = m.sectionAt(cyc); if (i >= 0 && i !== sel) selectScene(i); }
  }
  // registrazione: aggancio all'uscita master, coda di riverbero, etichette dei pulsanti
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
  // avanzamento nell'arrangiatore
  const head = $('#arr-strip .head');
  if (head) {
    const trackCyc = playing && mode === 'track' && s ? s.now() : -1;
    const idx = trackCyc >= 0 ? compiled.meta.sectionAt(trackCyc) : -1;
    const btns = $$('.arr-scene-btn'), b = btns[idx];
    head.hidden = !b;
    if (b) head.style.left = `${b.offsetLeft + (trackCyc - compiled.meta.sections[idx].start) / compiled.meta.sections[idx].len * b.offsetWidth}px`;
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

// ---------- suoni ----------
const soundGroups = () => custom.length ? [[{ it: 'I tuoi campioni (public/samples)', en: 'Your samples (public/samples)' }, custom.map(x => [x, `$: s("${x}*2").n("<0 1 2 3>")`])], ...SOUND_GROUPS] : SOUND_GROUPS;
function renderSounds() {
  $('#sounds').innerHTML = soundGroups().map(([g, list], gi) => `
    <div class="snd-group"><h3>${esc(tx(g))}</h3><div class="snds">${list.map(([n], i) => `<button class="snd" data-g="${gi}" data-i="${i}">${esc(n)}</button>`).join('')}</div></div>`).join('');
}
$('#sounds').addEventListener('click', e => {
  const b = e.target.closest('.snd'); if (!b) return;
  const [n, code] = soundGroups()[+b.dataset.g][1][+b.dataset.i];
  $$('.snd.on').forEach(x => x.classList.remove('on')); b.classList.add('on');
  loadFree(code, { kind: 'sound', name: n });
});

// ---------- riferimenti ----------
function renderRefs() {
  $('#refs').innerHTML = REFS.map(([title, d, u]) => `<a class="card ref" href="${u}" target="_blank" rel="noopener"><strong>${esc(tx(title))} ↗</strong><span>${esc(tx(d))}</span></a>`).join('');
}

// ---------- lingua ----------
function renderStatic() {
  $$('[data-i18n]').forEach(x => { x.textContent = t(x.dataset.i18n); });
  $$('[data-i18n-html]').forEach(x => { x.innerHTML = t(x.dataset.i18nHtml); });
  $$('[data-i18n-aria]').forEach(x => { x.setAttribute('aria-label', t(x.dataset.i18nAria)); });
  $('[data-on="drums"]').setAttribute('aria-label', t('onoff', { name: t('drums') }));
  opts($('#key'), KEYS.map(k => [k[0], k[2]]));
  opts($('#prog'), Object.entries(PROGS).map(([k, v]) => [k, `${tx(v[0])} · ${v[1].join(' ')}`]));
  opts($('#drums-kit'), KITS.map(k => [k, k.replace('Roland', '')]));
  opts($('#drums-preset'), [['', t('pickGroove')], ...Object.entries(GROOVES).map(([k, v]) => [k, v[0]])]);
  opts($('#sc-meter'), METERS.map(([k]) => [k, k]));
  opts($('#sc-fade'), [['0', t('cut')], ['1', t('fade1')], ['2', t('fadeN', { n: 2 })], ['4', t('fadeN', { n: 4 })], ['8', t('fadeN', { n: 8 })]]);
  $('#looks').innerHTML = LOOKS.map(([k, l]) => `<button class="chip" data-look="${k}">${esc(tx(l))}</button>`).join('');
  $('#play').dataset.state = '';
}
function renderAll() {
  renderStatic(); renderChannels(); renderSeq(); renderLessons(); renderSongs(); renderSounds(); renderRefs(); renderSource(); renderArranger();
  syncAll();
}
$$('[data-lang]').forEach(b => b.addEventListener('click', () => {
  setLang(b.dataset.lang);
  compiled = playable({ ...T, kind: 'composed' });
  renderAll();
  if (mode === 'track' && ed && !isPlaying()) ed.setCode(compiled.code);
}));

renderAll();
startHardware();
{ const tb = store.get('coding-misk-tab', 'componi'); if (TABS.includes(tb)) showTab(tb); }
updateShare();
startVisuals({
  getS: () => ({ look }),
  getSteps: () => meterSteps(S.meter),
  // il sequencer mostra il playhead solo se la scena selezionata è quella che sta suonando
  getMode: () => (mode === 'track' && song && isPlaying() && song.meta.sectionAt(sched().now()) === sel ? 'comp' : 'free'),
  isPlaying, sched,
  readout(cyc, step, playing) {
    if (!playing) return `${S.bpm} BPM  ·  ${paused ? t('resume').replace('▶ ', '') : t('rdPaused')}\n${t('rdHint')}`;
    const bar = Math.floor(cyc);
    const cur = song && mode === 'track' ? T.scenes[song.meta.sectionAt(cyc)] : null;
    const bpm = Math.round(sched().cps * 240 * (cur ? meterSteps(cur.state.meter) / 16 : 1));
    let line2 = $('#src').textContent;
    if (song) {
      const i = song.meta.sectionAt(cyc), sec = song.meta.sections[i];
      line2 = `${song.title}  ·  ${sec ? sec.label : ''}`;
      if (mode === 'track' && sec && T.scenes[i]) {
        const st = T.scenes[i].state, tr = (KEYS.find(k => k[0] === st.key) || [0, 0])[1];
        const prog = PROGS[st.prog][1], pos = (bar - sec.start) % prog.length;
        line2 += '\n' + prog.map(c => chordName(c, tr)).map((n, j) => j === pos ? `[${n}]` : ` ${n} `).join('');
      }
    }
    return `${bpm} BPM  ·  ${t('rdBar')} ${String(bar + 1).padStart(3, '0')}.${(step >> 2) + 1}\n${line2}`;
  },
});
