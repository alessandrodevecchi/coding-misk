import '@strudel/repl';
import './style.css';
import { METERS, meterSteps, fitSteps, channelSteps, GUITAR_TYPES, GUITAR_PATTERNS, HARMONIES, KEYS, PROGS, WAVES, MOVES, BASS, ARPS, HOOKS, MODES, VOWELS, PADS, TEXTURES, TEX_RHYTHMS, KITS, ROWS, GROOVES, LOOKS, DEFAULT, withVisuals, chordName } from './music.js';
import { compileSong } from './song/compile.js';
import { validateSong } from './song/validate.js';
import { FORMAT, VERSION, SETTING_FIELDS, SECTION_DEFAULTS, VISUALS, fromScenes, clipState } from './song/format.js';
import { DEVICES, deviceArgs, newDevice } from './song/rack.js';
import SONG_ORDER from '../songs/index.json';
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
// "composed": brani v2 (sezioni e tracce, file JSON in songs/), si aprono nell'arrangiatore.
// "coded": le versioni originali scritte a mano, si modificano nell'editor.
// Le modifiche dell'utente vivono in localStorage e hanno la precedenza sugli originali.
const user = store.get('coding-misk-library', { tracks: [], code: {} });
const saveLibrary = () => store.set('coding-misk-library', user);
const validSongs = Object.entries(import.meta.glob(['../songs/**/*.json', '!../songs/index.json'], { eager: true, import: 'default' })).flatMap(([file, sg]) => {
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
const codedTracks = () => CODED.map(c => ({ ...c, code: user.code[c.id] || c.code }));
// oggetto riproducibile: codice + mappa di sezioni e tempo
function playable(tr) {
  const code = tr.kind === 'composed' ? compileSong(tr) : tr.code;
  const meta = parseSong(code);
  if (tr.kind === 'composed') {
    // la mappa del tempo è in "BPM da 4/4": per l'etichetta usiamo i BPM veri delle sezioni
    const v = tr.sections.flatMap(s => [s.bpm ?? 138, s.bpmEnd ?? s.bpm ?? 138]), lo = Math.min(...v), hi = Math.max(...v);
    meta.bpmLabel = lo === hi ? `${lo}` : `${lo}→${hi}`;
  }
  return { id: tr.id, title: tr.title, kind: tr.kind, look: tr.look, code, meta };
}

// ---------- brano in modifica ----------
const draft = store.get('coding-misk-draft', null);
let T = prepare(draft && draft.T && (draft.T.sections || draft.T.scenes) ? draft.T : BUILTIN[0]);
let sel = Math.min(draft ? draft.sel || 0 : 0, T.sections.length - 1);
let tk = Math.min(draft ? draft.tk || 0 : 0, Math.max(0, T.tracks.length - 1));
let dirty = !!(draft && draft.dirty);
let scope = 'track', editPat = null, panelView = store.get('coding-misk-panel', 'one');
// vista dell'arrangiatore: 'sections' (celle per sezione) o 'timeline' (clip liberi); selClip = indice del clip scelto nella timeline
let arrMode = store.get('coding-misk-arr-mode', 'sections'), selClip = null;
let look = store.get('coding-misk-look', T.look || 'palco');
if (!LOOKS.some(([k]) => k === look)) look = 'palco';
let compiled = playable({ ...T, kind: 'composed' });
const saveDraft = () => store.set('coding-misk-draft', { T, sel, tk, dirty });
const sceneStart = i => T.sections.slice(0, i).reduce((a, s) => a + s.bars, 0);
const SEC = () => T.sections[sel];

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
    renderTrackPanel(); renderSounds(); syncAll();
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
const baseSettings = type => type === 'code' ? { visual: 'fx' } : Object.fromEntries(SETTING_FIELDS[type].map(k => [k, DEFAULT[type][k]]));
// impostazioni che suonano nella sezione selezionata: traccia + eventuale modifica solo per questa sezione
// clip su cui agiscono pattern e impostazioni "solo qui": nella timeline quello scelto, altrimenti quello della sezione
const focusClip = tr => (arrMode === 'timeline' && tr === curTrack() && selClip !== null && tr.clips[selClip]) || wholeClip(tr, sel);
const eff = tr => { const c = focusClip(tr); return { ...baseSettings(tr.type), ...tr.settings, ...((c && c.set) || {}) }; };
const patOf = tr => { const c = focusClip(tr); const k = editPat && tr.patterns[editPat] ? editPat : c && tr.patterns[c.pattern] ? c.pattern : Object.keys(tr.patterns)[0]; return k; };
const secFull = () => ({ ...SECTION_DEFAULTS, ...SEC() });
// stato v1 equivalente al pattern in modifica (per i passi del preset e le note)
const patState = tr => clipState(secFull(), tr, { pattern: patOf(tr) });
const nextKey = tr => { for (let i = 0; i < 26; i++) { const k = String.fromCharCode(65 + i); if (!tr.patterns[k]) return k; } return 'P' + Date.now() % 1000; };
const DEFAULT_PATTERN = {
  drums: () => ({ rows: Object.fromEntries(Object.entries(GROOVES.trance[1]).filter(([, v]) => v.includes('x'))) }),
  bass: () => ({ preset: 'rolling' }), guitar: () => ({ preset: 'power8' }), arp: () => ({ preset: 'su', speed: '16' }),
  hook: () => ({ preset: 'richiamo' }), pad: () => ({ preset: 'pad' }), texture: () => ({ rhythm: 'bar' }), riser: () => ({}),
  code: () => ({ code: 'note("a2 ~ c3 [e3 a3]").s("triangle").lpf(1800).gain(.4)' }),
};
const ACT_IDS = { drums: 'kick,snare,hats', bass: 'bass', guitar: 'guitar', arp: 'arp', hook: 'hook', pad: 'pad', texture: 'fx', riser: 'riser' };
const trackLabel = tr => tr.name || t(tr.type) || tr.id;

function selectScene(i) {
  if (i < 0 || i >= T.sections.length || i === sel) return;
  sel = i; editPat = null;
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
  if (arrMode === 'timeline') renderTimeline(total); else renderCells(total);
  renderSectionPanel(total);
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
        const c = cellOf(tr, j);
        const cls = !c ? '' : c.clip ? ' on' : ' custom';
        const label = !c ? '' : c.clip ? esc(c.clip.pattern) + (c.clip.set ? '*' : '') : '≈';
        return `<button class="trk-cell${cls}" data-cell="${i}:${j}" aria-current="${i === tk && j === sel}" title="${esc(`${trackLabel(tr)} · ${s.name}`)}">${label}</button>`;
      }).join('')}</div>`).join('') + '<span class="head"></span>';
}
// vista timeline: clip liberi su una corsia continua, larghezza proporzionale alle battute
const clipLabel = c => esc(c.pattern) + (c.set ? '*' : '');
function renderTimeline(total) {
  const st = starts(), minW = `calc(var(--trk-col) + ${total * 10}px)`;
  $('#arr-strip').style.gridTemplateColumns = `var(--trk-col) ${T.sections.map(s => `minmax(0, ${s.bars}fr)`).join(' ')}`;
  $('#arr-strip').style.minWidth = $('#arr-grid').style.minWidth = minW;
  $('#arr-strip').innerHTML = `<span class="arr-corner">${t('sections')}</span>` + T.sections.map((s, i) => `<button class="arr-scene-btn${i > 0 && s.fade ? ' fade' : ''}" data-scene-i="${i}" aria-current="${i === sel}">
      <b>${esc(s.name)}</b><span>${s.bars} · ${s.bpmEnd ? `${s.bpm}→${s.bpmEnd}` : s.bpm ?? 138}</span></button>`).join('') + '<span class="head"></span>';
  const solo = T.tracks.some(tr => tr.solo);
  const lines = st.slice(1).map(b => `<i class="sec-line" style="left:${b / total * 100}%"></i>`).join('');
  $('#arr-grid').innerHTML = T.tracks.map((tr, i) => `<div class="trk-row${tr.mute || (solo && !tr.solo) ? ' silent' : ''}" style="grid-template-columns:var(--trk-col) minmax(0, 1fr)" aria-current="${i === tk}">
      <div class="trk-head" data-act-ids="${ACT_IDS[tr.type] || esc((tr.settings && tr.settings.visual) || 'fx')}">
        <button class="trk-name" data-trk="${i}" title="${esc(tr.type)}"><span class="trk-type">${esc(TYPE_ICON[tr.type] || '·')}</span>${esc(trackLabel(tr))}</button>
        <button class="mini" data-mute="${i}" aria-pressed="${!!tr.mute}" title="${esc(t('mute'))}">M</button><button class="mini" data-solo="${i}" aria-pressed="${!!tr.solo}" title="${esc(t('solo'))}">S</button>
      </div>
      <div class="trk-lane" data-lane="${i}" style="--bars:${total}" title="${esc(t('laneAdd'))}">${lines}${spans(tr).map(({ c, s: a, e: b }) => {
        const k = tr.clips.indexOf(c);
        return `<button class="clip${isWhole(c) ? '' : ' free'}" data-clip="${i}:${k}" aria-current="${i === tk && k === selClip}" style="left:${a / total * 100}%;width:${(b - a) / total * 100}%" aria-label="${esc(`${trackLabel(tr)} · ${t('cBars', { from: a + 1, to: b })} · ${t('cPattern', { p: c.pattern })}`)}">${clipLabel(c)}<span class="clip-grip" data-grip aria-hidden="true"></span></button>`;
      }).join('')}</div></div>`).join('') + '<span class="head"></span>';
}
function renderSectionPanel(total) {
  const sc = SEC();
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
const TYPE_ICON = { drums: '◉', bass: '▁', guitar: '⚡', arp: '⋰', hook: '♪', pad: '▒', texture: '∿', riser: '↗', code: '{}' };

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
$$('[data-arr-mode]').forEach(b => b.addEventListener('click', () => {
  arrMode = b.dataset.arrMode === 'timeline' ? 'timeline' : 'sections'; store.set('coding-misk-arr-mode', arrMode);
  selClip = null; renderArranger(); renderTrackPanel();
}));

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
  drums: [['select', 'kit', 'drumMachine', () => KITS.map(k => [k, k.replace('Roland', '')])], ['range', 'gain', 'volume', { ramp: 1 }], ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['range', 'drive', 'drive', NUM4], ['range', 'grit', 'grit']],
  bass: [['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'reso', 'reso', { max: 30, step: 1, fmt: 'num' }], ['range', 'drive', 'drive', NUM4]],
  arp: [['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES],
    ['range', 'reso', 'reso', { max: 30, step: 1, fmt: 'num' }], ['range', 'drive', 'drive', NUM4], ['range', 'delay', 'delay']],
  hook: [['select', 'mode', 'mode', () => MODES], ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'fm', 'fm', { max: 8, step: .5, fmt: 'num' }],
    ['select', 'octave', 'octaveOpt', () => [['3', '3'], ['4', '4'], ['5', '5']]], ['select', 'harmony', 'harmony', () => HARMONIES], ['range', 'drive', 'drive', NUM4], ['select', 'vowel', 'vowel', () => VOWELS], ['range', 'grit', 'grit'], ['range', 'delay', 'delay']],
  guitar: [['select', 'type', 'type', () => named(GUITAR_TYPES)], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['range', 'drive', 'drive', { max: 8, step: .1, fmt: 'num' }],
    ['select', 'octave', 'tuning', () => [['0', t('standard')], ['-2', t('dropTuning')], ['-12', t('lowOpt')]]], ['select', 'width', 'width', () => [['double', t('doubleOpt')], ['mono', t('mono')]]], ['range', 'room', 'reverb']],
  pad: [['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume', { ramp: 1 }],
    ['cutoff', 'cutoff', 'filter', { ramp: 1 }], ['select', 'move', 'filterMove', () => MOVES], ['range', 'drive', 'drive', NUM4], ['range', 'room', 'reverb']],
  texture: [['select', 'sample', 'sample', () => [...TEXTURES, ...custom].map(x => [x, x])], ['range', 'gain', 'volume', { ramp: 1 }], ['range', 'grit', 'grit'], ['range', 'room', 'reverb']],
  riser: [['range', 'gain', 'volume'], ['select', 'bars', 'length', () => ['2', '4', '8', '16'].map(n => [n, t('nBars', { n })])],
    ['select', 'dir', 'direction', () => [['up', t('up')], ['down', t('down')]]]],
  code: [['select', 'visual', 'visualOpt', () => VISUALS.map(v => [v, v])]],
};
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
  const attrs = type === 'cutoff' ? 'data-cut="1" min="0" max="100" step="1"' : `min="0" max="${opt.max || 1}" step="${opt.step || .01}"${opt.fmt ? ` data-fmt="${opt.fmt}"` : ''}`;
  const slider = (sid, k) => `<input type="range" id="${sid}" data-set="${k}" ${attrs}>`;
  const ramp = opt.ramp ? `<button type="button" class="ramp" data-set-ramp="${key}" aria-label="${esc(t('rampToggle'))}" title="${esc(t('rampToggle'))}">↗</button>` : '';
  const end = opt.ramp ? `<div class="end" data-end-for="${key}" hidden><div class="row"><label class="lbl" for="${id}End">${esc(t('endOf', { name: t(label) }))}</label><output id="${id}End-o"></output></div>${slider(id + 'End', key + 'End')}</div>` : '';
  return `<div class="ctrl" data-ctl="${key}"><div class="row"><label class="lbl" for="${id}">${t(label)}</label>${ramp}<output id="${id}-o"></output></div>${slider(id, key)}${end}</div>`;
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
function syncRack(tr) {
  (tr.rack || []).forEach((d, i) => {
    const spec = DEVICES[d.device]; if (!spec) return;
    const a = deviceArgs(d), code = $(`[data-dev-code="${i}"]`);
    if (code) code.textContent = spec.code(a, tr.type);
    for (const [name] of spec.args) { const o = $(`[data-dev-out="${i}:${name}"]`); if (o) o.textContent = devValue(name, a[name]); }
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
const viewSwitch = () => `<div class="tp-view chips" role="group" aria-label="${esc(t('panelView'))}"><button class="chip" data-view="one" aria-pressed="${panelView === 'one'}">${t('viewOne')}</button><button class="chip" data-view="all" aria-pressed="${panelView === 'all'}">${esc(t('viewAll', { name: SEC().name }))}</button></div>`;
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
  const box = $('#track-panel'), tr = curTrack();
  if (!tr) { box.innerHTML = `<p class="note">${t('noTracks')}</p>`; return; }
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
  } else editor = `<p class="note">${t('riserHint')}</p>`;
  const custom = c && c.parts;
  box.innerHTML = `<div class="tp-top">${viewSwitch()}</div>
    <div class="tp-head">
      <span class="trk-type big">${esc(TYPE_ICON[tr.type] || '·')}</span>
      <div class="ctrl grow"><label class="lbl" for="tk-name">${t('trackName')} · ${esc(t(tr.type))}</label><input id="tk-name" type="text" maxlength="40" autocomplete="off"></div>
      <div class="actions">
        <button class="btn icon" id="tk-up" aria-label="${esc(t('moveUp'))}" ${tk === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn icon" id="tk-down" aria-label="${esc(t('moveDown'))}" ${tk === T.tracks.length - 1 ? 'disabled' : ''}>▼</button>
        <button class="btn" id="tk-dup">${t('duplicate')}</button>
        <button class="btn danger" id="tk-del">${t('removeTrack')}</button>
      </div>
    </div>
    ${arrMode === 'timeline' ? clipBlock(tr) : `<div class="tp-plays"><span class="lbl">${esc(t('playsIn', { name: SEC().name }))}</span>
      <div class="chips">${custom ? `<span class="note">${t('customCell')}</span>` : `<button class="chip" data-play-pat="" aria-pressed="${!c}">${t('silent')}</button>${Object.keys(tr.patterns).map(k => `<button class="chip" data-play-pat="${esc(k)}" aria-pressed="${!!(c && c.clip && c.clip.pattern === k)}">${esc(k)}</button>`).join('')}`}</div></div>`}
    <div class="tp-pats"><span class="lbl">${t('patterns')}</span>
      <div class="chips">${Object.keys(tr.patterns).map(k => `<button class="chip" data-edit-pat="${esc(k)}" aria-pressed="${k === key}">${esc(k)}</button>`).join('')}
        <button class="chip" id="pt-new">${t('newPattern')}</button><button class="chip" id="pt-del">${t('deletePattern')}</button></div>
      <p class="note">${esc(t('editingPattern', { p: key }))}</p></div>
    <div class="tp-editor">${editor}</div>
    <div class="tp-scope"><span class="lbl">${t('settingsScope')}</span>
      <div class="chips"><button class="chip" data-scope="track" aria-pressed="${scope === 'track'}">${t('scopeTrack')}</button><button class="chip" data-scope="section" aria-pressed="${scope === 'section'}" ${focusClip(tr) ? '' : 'disabled'}>${esc(arrMode === 'timeline' && selClip !== null ? t('scopeClip') : t('scopeSection', { name: SEC().name }))}</button></div></div>
    <div class="ctrls">${(CONTROLS[tr.type] || []).map(settingHtml).join('')}</div>
    <div class="tp-rack"><div class="row"><span class="lbl">Rack</span><span class="hint">${t('rackHint')}</span></div>
      <div class="rack-list">${(tr.rack || []).map((d, i) => deviceHtml(d, i, tr)).join('') || `<p class="note">${t('noDevices')}</p>`}</div>
      <div class="rack-add"><select id="rk-type" aria-label="${esc(t('addDevice'))}">${['note', 'sound'].map(kind => `<optgroup label="${esc(t(kind === 'note' ? 'devNote' : 'devSound'))}">${Object.entries(DEVICES).filter(([, d]) => d.kind === kind).map(([k, d]) => `<option value="${k}">${esc(tx(d.label))}</option>`).join('')}</optgroup>`).join('')}</select><button class="btn" id="rk-add">${t('addDevice')}</button></div>
    </div>`;
  if ($('#pt-groove')) opts($('#pt-groove'), [['', t('pickGroove')], ...Object.entries(GROOVES).map(([k, v]) => [k, v[0]])]);
  if ($('#pt-preset')) opts($('#pt-preset'), PRESET_LIST[tr.type]());
  if ($('#pt-rhythm')) opts($('#pt-rhythm'), named(TEX_RHYTHMS));
  $$('#track-panel select[data-set]').forEach(s => { const ctl = (CONTROLS[tr.type] || []).find(x => x[1] === s.dataset.set); if (ctl) opts(s, ctl[3]()); });
  syncTrackPanel();
}
function syncTrackPanel() {
  if (panelView === 'all') return syncSectionRack();
  const tr = curTrack(); if (!tr || !$('#tk-name')) return;
  const key = patOf(tr), pat = tr.patterns[key] || {}, e = eff(tr), c = focusClip(tr), over = (c && c.set) || {};
  if (document.activeElement !== $('#tk-name')) $('#tk-name').value = trackLabel(tr);
  $$('#track-panel [data-set]').forEach(i => {
    const v = e[i.dataset.set]; if (v === null || v === undefined) return;
    i.value = i.dataset.cut ? cutToRange(v) : v;
  });
  $$('#track-panel [data-set-ramp]').forEach(b => { const on = e[b.dataset.setRamp + 'End'] != null; b.setAttribute('aria-pressed', on); const end = $(`#track-panel [data-end-for="${b.dataset.setRamp}"]`); if (end) end.hidden = !on; });
  $$('#track-panel [data-ctl]').forEach(x => x.classList.toggle('over', Object.keys(over).some(k => k === x.dataset.ctl || k === x.dataset.ctl + 'End')));
  if (tr.type === 'drums') $$('#track-panel [data-row]').forEach(b => b.setAttribute('aria-pressed', ((pat.rows || {})[b.dataset.row] || '')[b.dataset.i] === 'x'));
  if ($('#pt-preset')) $('#pt-preset').value = pat.preset || DEFAULT_PATTERN[tr.type]().preset;
  if ($('#pt-speed')) $('#pt-speed').value = pat.speed || '16';
  if ($('#pt-rhythm')) $('#pt-rhythm').value = pat.rhythm || 'bar';
  if ($('#pt-code') && document.activeElement !== $('#pt-code')) $('#pt-code').value = pat.code || '';
  if ($('[data-ps]')) {
    const steps = channelSteps(patState(tr), tr.type);
    $$('[data-ps]').forEach(b => b.setAttribute('aria-pressed', steps[b.dataset.ps] === 'x'));
    $('#pt-steps-state').textContent = pat.steps ? t('stepsCustom') : t('stepsPreset');
    $('#pt-steps-reset').disabled = !pat.steps;
  }
  if ($('#pt-notes')) {
    if (document.activeElement !== $('#pt-notes')) $('#pt-notes').value = pat.notes || '';
    const tokens = noteTokens(pat.notes, noteCols(tr, pat));
    $$('[data-nd]').forEach(b => b.setAttribute('aria-pressed', simpleNotes(pat.notes) && !!pat.notes && tokens[b.dataset.ni] === b.dataset.nd));
    $('#pt-notes-reset').disabled = !pat.notes;
  }
  syncRack(tr);
  syncOutputs();
}
// scrive un'impostazione: per tutta la traccia, o solo per il clip della sezione selezionata
function setSetting(k, v, tr = curTrack()) {
  const c = focusClip(tr);
  if (scope === 'section' && c) { c.set = { ...(c.set || {}), [k]: v }; return; }
  tr.settings[k] = v;
  if (c && c.set) { delete c.set[k]; if (!Object.keys(c.set).length) delete c.set; }
}
const editPattern = fn => { const tr = curTrack(), key = patOf(tr); tr.patterns[key] = tr.patterns[key] || {}; fn(tr.patterns[key], tr); changed(); syncTrackPanel(); };

$('#track-panel').addEventListener('input', e => {
  if (e.target.dataset.cset) { const [i, key] = e.target.dataset.cset.split(':'); const v = e.target.dataset.cut ? rangeToCut(+e.target.value) : +e.target.value; setSetting(key, v, T.tracks[+i]); changed(); syncSectionRack(); return; }
  if (e.target.dataset.devArg && e.target.type === 'range') { const [i, name] = e.target.dataset.devArg.split(':'); curTrack().rack[+i][name] = +e.target.value; changed(); syncRack(curTrack()); return; }
  const k = e.target.dataset.set;
  if (k) { let v = e.target.value; if (e.target.type === 'range') v = e.target.dataset.cut ? rangeToCut(+v) : +v; setSetting(k, v); changed(); syncTrackPanel(); return; }
  if (e.target.id === 'tk-name') { curTrack().name = e.target.value; changed(); return; }
  if (e.target.id === 'pt-code') { const v = e.target.value; clearTimeout(codeTimer); codeTimer = setTimeout(() => editPattern(p => { p.code = v; }), 400); return; }
  if (e.target.id === 'pt-notes') { const v = e.target.value.trim(); if (!v || /^[-\d~\s[\]<>]+$/.test(v)) editPattern(p => { if (v) p.notes = v; else delete p.notes; }); }
});
let codeTimer = 0;
$('#track-panel').addEventListener('change', e => {
  const tr = curTrack();
  if (e.target.matches('select[data-set]')) { setSetting(e.target.dataset.set, e.target.value); changed(); syncTrackPanel(); return; }
  if ((e.target.id === 'clip-start' || e.target.id === 'clip-bars') && selClip !== null && tr.clips[selClip]) {
    const c = tr.clips[selClip], sp = spanOf(tr, c);
    const start = e.target.id === 'clip-start' ? Math.round(+e.target.value) - 1 : sp.s, bars = e.target.id === 'clip-bars' ? Math.round(+e.target.value) : sp.e - sp.s;
    setClipSpan(tr, c, start, bars); changed(); renderTrackPanel(); return;
  }
  if (e.target.matches('select[data-dev-arg]')) { const [i, name] = e.target.dataset.devArg.split(':'); const v = e.target.value; tr.rack[+i][name] = isNaN(+v) ? v : +v; changed(); syncRack(tr); return; }
  if (e.target.id === 'pt-preset') editPattern(p => { p.preset = e.target.value; delete p.steps; });
  if (e.target.id === 'pt-speed') { editPattern(p => { p.speed = e.target.value; delete p.steps; }); renderTrackPanel(); }
  if (e.target.id === 'pt-rhythm') editPattern(p => { p.rhythm = e.target.value; });
  if (e.target.id === 'pt-groove') { const g = GROOVES[e.target.value]; if (g) editPattern(p => { p.rows = Object.fromEntries(Object.entries(g[1]).filter(([, v]) => v.includes('x')).map(([k, v]) => [k, fitSteps(v, meterSteps(secFull().meter))])); }); e.target.value = ''; }
  if (e.target.id === 'tk-name' && !tr.name.trim()) { tr.name = t(tr.type); changed(); renderArranger(); }
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
  const tr = curTrack(); if (!tr) return;
  const n = meterSteps(secFull().meter);
  if (b.dataset.row) return editPattern(p => { p.rows = p.rows || {}; const a = fitSteps(p.rows[b.dataset.row] || '', n).split(''); a[+b.dataset.i] = a[+b.dataset.i] === 'x' ? '.' : 'x'; const s = a.join(''); if (s.includes('x')) p.rows[b.dataset.row] = s; else delete p.rows[b.dataset.row]; });
  if (b.dataset.ps !== undefined) return editPattern((p, t2) => { const a = channelSteps(patState(t2), t2.type).split(''); a[+b.dataset.ps] = a[+b.dataset.ps] === 'x' ? '.' : 'x'; p.steps = a.join(''); });
  if (b.id === 'pt-steps-reset') return editPattern(p => { delete p.steps; });
  if (b.dataset.nd !== undefined) {
    const pat = tr.patterns[patOf(tr)] || {};
    if (!simpleNotes(pat.notes)) return toast(t('notesLocked'));
    return editPattern((p, t2) => { const tk2 = noteTokens(p.notes, noteCols(t2, p)); tk2[+b.dataset.ni] = tk2[+b.dataset.ni] === b.dataset.nd ? '~' : b.dataset.nd; if (tk2.every(x => x === '~')) delete p.notes; else p.notes = tk2.join(' '); });
  }
  if (b.id === 'pt-notes-reset') return editPattern(p => { delete p.notes; });
  if (b.id === 'clip-del') { tr.clips.splice(selClip, 1); selClip = null; changed(); renderTrackPanel(); return; }
  if (b.dataset.clipPat !== undefined) { const c = tr.clips[selClip]; if (c) { c.pattern = b.dataset.clipPat; editPat = c.pattern; changed(); renderTrackPanel(); } return; }
  if (b.id === 'rk-add') { tr.rack = [...(tr.rack || []), newDevice($('#rk-type').value)]; changed(); renderTrackPanel(); return; }
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
  if (b.id === 'pt-new') { const k = nextKey(tr); tr.patterns[k] = clone(tr.patterns[patOf(tr)] || DEFAULT_PATTERN[tr.type]()); editPat = k; changed(); renderTrackPanel(); return; }
  if (b.id === 'pt-del') {
    const k = patOf(tr);
    if (Object.keys(tr.patterns).length === 1) return toast(t('lastPattern'));
    if (tr.clips.some(c => c.pattern === k)) return toast(t('patternInUse', { p: k }));
    delete tr.patterns[k]; editPat = null; changed(); renderTrackPanel(); return;
  }
  if (b.id === 'tk-dup') { const copy = clone(tr); const ids = new Set(T.tracks.map(x => x.id)); let id = tr.id + '-2', k = 3; while (ids.has(id)) id = `${tr.id}-${k++}`; copy.id = id; copy.name = t('copyOf', { name: trackLabel(tr) }); delete copy.solo; T.tracks.splice(tk + 1, 0, copy); tk += 1; changed(); renderTrackPanel(); return; }
  if (b.id === 'tk-up' || b.id === 'tk-down') { const j = tk + (b.id === 'tk-up' ? -1 : 1); if (j < 0 || j >= T.tracks.length) return; [T.tracks[tk], T.tracks[j]] = [T.tracks[j], T.tracks[tk]]; tk = j; changed(); renderTrackPanel(); return; }
  if (b.id === 'tk-del') { if (!confirmTwice('track', t('confirmRemoveTrack', { name: trackLabel(tr) }))) return; T.tracks.splice(tk, 1); tk = Math.max(0, Math.min(tk, T.tracks.length - 1)); editPat = null; changed(); renderTrackPanel(); }
});

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
  const tr = curTrack(), e = tr ? eff(tr) : {};
  $$('#track-panel input[type=range][data-set]').forEach(i => {
    const v = e[i.dataset.set], o = $('#' + i.id + '-o');
    if (!o || v === null || v === undefined) return;
    o.textContent = i.dataset.cut ? (v >= 18000 ? '∞' : `${v} Hz`) : i.dataset.fmt === 'num' ? String(v) : `${Math.round(v * 100)}%`;
  });
  $('#sc-swing-o').textContent = `${Math.round((SEC().swing || 0) * 100)}%`;
}
function syncAll() {
  document.documentElement.dataset.look = look;
  document.documentElement.dataset.ui = ui;
  $$('[data-uitheme]').forEach(b => b.setAttribute('aria-pressed', ui === b.dataset.uitheme));
  const sc = secFull();
  $('#bpm').value = sc.bpm; $('#key').value = sc.key; $('#prog').value = sc.chords; $('#sc-meter').value = sc.meter; $('#sc-swing').value = sc.swing;
  $('#bpm-ramp').setAttribute('aria-pressed', sc.bpmEnd != null);
  $('#bpm-end-row').hidden = sc.bpmEnd == null;
  if (sc.bpmEnd != null) $('#bpm-end').value = sc.bpmEnd;
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
    // segue la sezione che suona, ma non mentre si sta scrivendo in un campo del brano
    const typing = document.activeElement && document.activeElement.matches('input, select, textarea') && document.activeElement.closest('#arranger, #track-panel');
    if (mode === 'track' && follow && !typing) { const i = m.sectionAt(cyc); if (i >= 0 && i !== sel) selectScene(i); }
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
  opts($('#key'), KEYS.map(k => [k[0], k[2]]));
  opts($('#prog'), Object.entries(PROGS).map(([k, v]) => [k, `${tx(v[0])} · ${v[1].join(' ')}`]));
  opts($('#tk-type'), ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture', 'riser', 'code'].map(k => [k, `${TYPE_ICON[k]}  ${t(k)}`]));
  opts($('#sc-meter'), METERS.map(([k]) => [k, k]));
  opts($('#sc-fade'), [['0', t('cut')], ['1', t('fade1')], ['2', t('fadeN', { n: 2 })], ['4', t('fadeN', { n: 4 })], ['8', t('fadeN', { n: 8 })]]);
  $('#looks').innerHTML = LOOKS.map(([k, l]) => `<button class="chip" data-look="${k}">${esc(tx(l))}</button>`).join('');
  $('#play').dataset.state = '';
}
function renderAll() {
  renderStatic(); renderLessons(); renderSongs(); renderSounds(); renderRefs(); renderSource(); renderArranger(); renderTrackPanel();
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
