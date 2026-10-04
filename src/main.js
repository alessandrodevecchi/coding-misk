import '@strudel/repl';
import './style.css';
import { KEYS, PROGS, WAVES, MOVES, BASS, ARPS, HOOKS, KITS, ROWS, GROOVES, LOOKS, DEFAULT, withVisuals, chordName, compileTrack, DEMO_TRACK, cloneState } from './music.js';
import { LESSONS, SOUND_GROUPS, REFS, SONGS } from './content.js';
import { startVisuals } from './visuals.js';
import { t, tx, getLang, setLang } from './i18n.js';
import { parseSong, clock } from './songs.js';

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
// "composed": fatti di scene, si modificano con l'arrangiatore.
// "coded": scritti a mano nel codice, si modificano nell'editor.
// Le modifiche dell'utente vivono in localStorage e hanno la precedenza sugli originali.
const user = store.get('coding-misk-library', { tracks: [], code: {} });
const saveLibrary = () => store.set('coding-misk-library', user);
const CODED = SONGS.map(sg => ({ ...sg, kind: 'coded' }));
const isBuiltin = id => id === DEMO_TRACK.id || CODED.some(c => c.id === id);
function library() {
  const demo = user.tracks.find(u => u.id === DEMO_TRACK.id) || DEMO_TRACK;
  return [
    ...[demo, ...user.tracks.filter(u => u.id !== DEMO_TRACK.id)].map(tr => ({ ...tr, kind: 'composed' })),
    ...CODED.map(c => ({ ...c, code: user.code[c.id] || c.code })),
  ];
}
// oggetto riproducibile: codice + mappa di sezioni e tempo
function playable(tr) {
  const code = tr.kind === 'composed' ? compileTrack(tr) : tr.code;
  return { id: tr.id, title: tr.title, kind: tr.kind, look: tr.look, code, meta: parseSong(code) };
}

// ---------- brano in modifica ----------
const draft = store.get('coding-misk-draft', null);
let T = draft && draft.T && draft.T.scenes && draft.T.scenes.length ? draft.T : clone(DEMO_TRACK);
let sel = Math.min(draft ? draft.sel || 0 : 0, T.scenes.length - 1);
let dirty = !!(draft && draft.dirty);
let S = T.scenes[sel].state;
let look = store.get('coding-misk-look', 'palco');
if (!LOOKS.some(([k]) => k === look)) look = 'palco';
let compiled = playable({ ...T, kind: 'composed' });
const saveDraft = () => store.set('coding-misk-draft', { T, sel, dirty });
const sceneStart = i => T.scenes.slice(0, i).reduce((a, s) => a + s.bars, 0);

// ---------- editor Strudel ----------
let ed = null, mode = 'track', evalTimer = 0, song = null, loopIdx = -1, follow = true, seeking = false;
let source = { kind: 'track' };
const el = document.createElement('strudel-editor');
el.innerHTML = `<!--\n${compiled.code}\n-->`;
$('#edhost').appendChild(el);
const ready = new Promise(res => { const iv = setInterval(() => { if (el.editor) { clearInterval(iv); ed = el.editor; res(ed); } }, 100); });
// il REPL carica solo una parte di dirt-samples: carichiamo l'archivio completo (arpy, industrial, glitch, …)
ready.then(() => { try { globalThis.samples && globalThis.samples('github:tidalcycles/dirt-samples'); } catch (e) { console.error(e); } });
const sched = () => ed && ed.repl && ed.repl.scheduler;
const isPlaying = () => !!(sched() && sched().started);

// Strudel carica i worklet audio (supersaw, rumore, effetti) solo al primo mousedown.
// Li inizializziamo noi dentro il gesto dell'utente, così funziona anche da tastiera.
let audioInit = null;
function initAudioOnce() {
  if (!audioInit && typeof globalThis.initAudio === 'function') audioInit = globalThis.initAudio().catch(e => { audioInit = null; console.error(e); });
  return audioInit;
}

// Riproduce un brano dalla battuta "bar": lo scheduler di Strudel riprende da lastEnd,
// quindi basta impostarlo prima di avviare. Il tempo lo gestisce transport() battuta per battuta.
async function playSong(sg, bar = 0, as = 'free') {
  if (seeking) return;
  seeking = true;
  try {
    initAudioOnce();
    await ready;
    await initAudioOnce();
    const m = sg.meta;
    bar = Math.max(0, Math.min(m.bars - 1, Math.floor(bar)));
    song = sg; mode = as;
    source = as === 'track' ? { kind: 'track' } : { kind: 'song', name: sg.title, id: sg.id };
    renderSource();
    ed.stop();
    ed.setCode(withVisuals(sg.code).replace(/setcpm\([^)]*\)/, `setcpm(${+m.bpm[bar].toFixed(2)}/4)`));
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
  await ed.evaluate();
  updateShare();
}
async function stop() { await ready; ed.stop(); }

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
  song = null;
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
  mode = 'track'; source = { kind: 'track' };
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

$('#play').addEventListener('click', () => isPlaying() ? stop() : play());
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const inEditor = e.target.closest && e.target.closest('strudel-editor');
  if (e.key === 'Enter' && !inEditor) { e.preventDefault(); play(); }
  if (e.key === '.' && !inEditor) { e.preventDefault(); stop(); }
});

// ---------- arrangiatore ----------
function selectScene(i) {
  if (i < 0 || i >= T.scenes.length) return;
  if (i === sel && S === T.scenes[i].state) return;
  sel = i; S = T.scenes[i].state;
  saveDraft(); syncAll(); renderArranger();
}
function renderArranger() {
  const total = T.scenes.reduce((a, s) => a + s.bars, 0);
  $('#arr-strip').innerHTML = T.scenes.map((s, i) => `<button class="arr-scene-btn${i > 0 && s.fade ? ' fade' : ''}" data-scene-i="${i}" style="flex-grow:${s.bars}" aria-current="${i === sel}">
      <b>${esc(s.name || t('newScene', { n: i + 1 }))}</b><span>${s.bars} · ${s.state.bpm}</span></button>`).join('') + '<span class="head"></span>';
  const sc = T.scenes[sel];
  if (document.activeElement !== $('#track-title')) $('#track-title').value = T.title;
  if (document.activeElement !== $('#sc-name')) $('#sc-name').value = sc.name;
  if (document.activeElement !== $('#sc-bars')) $('#sc-bars').value = sc.bars;
  $('#sc-fade').value = String(sel === 0 ? 0 : sc.fade || 0);
  $('#sc-fade').disabled = sel === 0;
  $('#sc-left').disabled = sel === 0; $('#sc-right').disabled = sel === T.scenes.length - 1; $('#sc-del').disabled = T.scenes.length === 1;
  $('#dirty').textContent = dirty ? t('unsaved') : '';
  const builtin = isBuiltin(T.id), overridden = user.tracks.some(u => u.id === T.id);
  $('#tr-del').textContent = builtin ? t('restoreOrig') : t('deleteTrack');
  $('#tr-del').disabled = builtin && !overridden && !dirty;
  $('#arr-total').textContent = t('arrTotal', { scenes: T.scenes.length, bars: total, time: clock(compiled.meta.seconds) });
  $('#sc-loop').checked = loopIdx >= 0 && mode === 'track';
}
$('#arr-strip').addEventListener('click', e => {
  const b = e.target.closest('[data-scene-i]'); if (b) selectScene(+b.dataset.sceneI);
});
$('#arr-strip').addEventListener('dblclick', e => {
  const b = e.target.closest('[data-scene-i]'); if (b) playSong(compiled, sceneStart(+b.dataset.sceneI), 'track');
});
$('#track-title').addEventListener('input', e => { T.title = e.target.value; changed(); renderSource(); });
$('#sc-name').addEventListener('input', e => { T.scenes[sel].name = e.target.value; changed(); });
$('#sc-bars').addEventListener('change', e => { T.scenes[sel].bars = Math.max(1, Math.min(64, Math.round(+e.target.value) || 8)); changed(); });
$('#sc-fade').addEventListener('change', e => { T.scenes[sel].fade = +e.target.value; changed(); });
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
$('#sc-loop').addEventListener('change', e => {
  loopIdx = e.target.checked ? sel : -1;
  $$('[data-loop]').forEach(x => x.checked = false);
  if (e.target.checked && !(isPlaying() && mode === 'track')) playSong(compiled, sceneStart(sel), 'track');
});
$('#sc-follow').addEventListener('change', e => { follow = e.target.checked; });

function loadTrack(tr) {
  if (tr.id !== T.id && dirty && !confirmTwice('load', t('loadConfirm'))) return false;
  if (tr.id !== T.id) { T = clone({ id: tr.id, title: tr.title, look: tr.look, scenes: tr.scenes }); dirty = false; }
  sel = 0; S = T.scenes[0].state;
  compiled = playable({ ...T, kind: 'composed' });
  saveDraft(); syncAll(); renderArranger(); renderSource();
  return true;
}
$('#tr-save').addEventListener('click', () => {
  const i = user.tracks.findIndex(u => u.id === T.id);
  const copy = clone({ id: T.id, title: T.title, look: T.look, scenes: T.scenes });
  if (i >= 0) user.tracks[i] = copy; else user.tracks.push(copy);
  dirty = false; saveLibrary(); saveDraft(); renderArranger(); renderSongs(); toast(t('trackSaved'));
});
$('#tr-saveas').addEventListener('click', () => {
  T.id = 'u-' + Date.now(); T.title = t('copyOf', { name: T.title });
  user.tracks.push(clone({ id: T.id, title: T.title, look: T.look, scenes: T.scenes }));
  dirty = false; compiled = playable({ ...T, kind: 'composed' });
  saveLibrary(); saveDraft(); renderArranger(); renderSongs(); renderSource(); toast(t('trackSaved'));
});
$('#tr-new').addEventListener('click', () => {
  if (dirty && !confirmTwice('new', t('loadConfirm'))) return;
  T = { id: 'u-' + Date.now(), title: t('newTrackTitle'), look, scenes: [{ name: t('newScene', { n: 1 }), bars: 8, fade: 0, state: cloneState(DEFAULT) }] };
  sel = 0; S = T.scenes[0].state; syncAll(); changed();
});
$('#tr-del').addEventListener('click', () => {
  if (!confirmTwice('delete')) return;
  const builtin = isBuiltin(T.id);
  user.tracks = user.tracks.filter(u => u.id !== T.id);
  saveLibrary();
  T = clone(builtin ? DEMO_TRACK : (user.tracks[0] || DEMO_TRACK));
  dirty = false; sel = 0; S = T.scenes[0].state;
  compiled = playable({ ...T, kind: 'composed' });
  saveDraft(); syncAll(); renderArranger(); renderSongs(); renderSource();
  if (mode === 'track' && ed) ed.setCode(compiled.code);
  toast(builtin ? t('restored') : t('trackDeleted'));
});

// ---------- controlli della scena ----------
const opts = (box, list) => {
  const v = box.value;
  box.innerHTML = list.map(([val, l]) => `<option value="${esc(val)}">${esc(tx(l))}</option>`).join('');
  if (v) box.value = v;
};
const CHANNELS = [
  { id: 'bass', ctrls: [
    ['select', 'preset', 'rhythm', () => Object.entries(BASS).map(([k, v]) => [k, v[0]])],
    ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume'], ['cutoff', 'cutoff', 'filter'], ['select', 'move', 'filterMove', () => MOVES]] },
  { id: 'arp', ctrls: [
    ['select', 'preset', 'figure', () => Object.entries(ARPS).map(([k, v]) => [k, v[0]])],
    ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume'], ['cutoff', 'cutoff', 'filter'],
    ['select', 'speed', 'speed', () => [['16', t('sixteenths')], ['8', t('eighths')]]], ['range', 'delay', 'delay']] },
  { id: 'hook', ctrls: [
    ['select', 'preset', 'melody', () => Object.entries(HOOKS).map(([k, v]) => [k, v[0]])],
    ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume'], ['cutoff', 'cutoff', 'filter'],
    ['select', 'move', 'filterMove', () => MOVES], ['range', 'delay', 'delay']] },
  { id: 'pad', ctrls: [
    ['select', 'wave', 'sound', () => WAVES], ['range', 'gain', 'volume'], ['cutoff', 'cutoff', 'filter'],
    ['select', 'move', 'filterMove', () => MOVES], ['range', 'room', 'reverb']] },
  { id: 'riser', ctrls: [
    ['range', 'gain', 'volume'], ['select', 'bars', 'length', () => ['4', '8', '16'].map(n => [n, t('nBars', { n })])]] },
];
const cutToRange = c => Math.round(Math.log(c / 100) / Math.log(80) * 100);
const rangeToCut = v => Math.round(100 * Math.pow(80, v / 100));

function renderChannels() {
  $('#channels').innerHTML = CHANNELS.map(ch => `
    <div class="card" id="ch-${ch.id}">
      <div class="chhead"><button class="led" data-on="${ch.id}" aria-label="${esc(t('onoff', { name: t(ch.id) }))}"></button><h3>${t(ch.id)}</h3><span class="hint">${t(ch.id + 'Hint')}</span></div>
      <div class="ctrls">${ch.ctrls.map(([type, key, label]) => {
        const id = `${ch.id}-${key}`;
        if (type === 'select') return `<div class="ctrl"><label class="lbl" for="${id}">${t(label)}</label><select id="${id}" data-path="${ch.id}.${key}"></select></div>`;
        const cut = type === 'cutoff';
        return `<div class="ctrl"><div class="row"><label class="lbl" for="${id}">${t(label)}</label><output id="${id}-o"></output></div><input type="range" id="${id}" data-path="${ch.id}.${key}" ${cut ? 'data-cut="1" min="0" max="100" step="1"' : 'min="0" max="1" step="0.01"'}></div>`;
      }).join('')}</div>
    </div>`).join('');
  for (const ch of CHANNELS) for (const [type, key, , list] of ch.ctrls) if (type === 'select') opts($(`#${ch.id}-${key}`), list());
}
function renderSeq() {
  $('#seq').innerHTML = '<span></span><div class="stepnums">' + Array.from({ length: 16 }, (_, i) => `<span>${i + 1}</span>`).join('') + '</div>' +
    ROWS.map(([id, label]) => `<button class="rowlbl" data-row="${id}" title="${esc(t('muteRow', { name: label }))}">${label}</button><div class="steps">${
      Array.from({ length: 16 }, (_, i) => `<button class="step" data-row="${id}" data-i="${i}" aria-label="${esc(t('stepAria', { name: label, n: i + 1 }))}"></button>`).join('')}</div>`).join('');
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
  for (const [id] of ROWS) S.drums.rows[id].steps = g[1][id];
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
  if (e.target.matches('select[data-path]')) { setPath(e.target.dataset.path, e.target.value); changed(); }
});
document.addEventListener('click', e => {
  const led = e.target.closest('[data-on]');
  if (led) { S[led.dataset.on].on = !S[led.dataset.on].on; syncAll(); changed(); }
});
$('#key').addEventListener('change', e => { S.key = e.target.value; changed(); });
$('#prog').addEventListener('change', e => { S.prog = e.target.value; changed(); });
$('#bpm').addEventListener('change', e => { S.bpm = Math.max(60, Math.min(200, Math.round(+e.target.value) || 138)); syncAll(); changed(); });
$$('[data-bpm]').forEach(b => b.addEventListener('click', () => { S.bpm = Math.max(60, Math.min(200, S.bpm + +b.dataset.bpm)); syncAll(); changed(); }));

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
    if (o) o.textContent = i.dataset.cut ? `${v} Hz` : `${Math.round(v * 100)}%`;
  });
}
function syncAll() {
  document.documentElement.dataset.look = look;
  $('#bpm').value = S.bpm; $('#key').value = S.key; $('#prog').value = S.prog;
  $$('[data-path]').forEach(i => { const v = getPath(i.dataset.path); i.value = i.dataset.cut ? cutToRange(v) : v; });
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
function showTab(name) {
  $$('.tab').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === name));
  for (const id of TABS) $('#tab-' + id).hidden = id !== name;
  if (name === 'brani' && cards.length) renderSongs();
  store.set('coding-misk-tab', name);
}
$$('.tab').forEach(tb => tb.addEventListener('click', () => showTab(tb.dataset.tab)));
{ const tb = store.get('coding-misk-tab', 'componi'); if (TABS.includes(tb)) showTab(tb); }

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
let cards = [];
function renderSongs() {
  cards = library().map(tr => (tr.kind === 'composed' && tr.id === T.id ? { ...tr, ...T, kind: 'composed' } : tr)).map(tr => ({ tr, p: playable(tr) }));
  $('#songs').innerHTML = cards.map(({ tr, p }, i) => {
    const m = p.meta, composed = tr.kind === 'composed';
    const ticks = Array.from({ length: Math.max(0, Math.floor(m.bars / 4) - 1) }, (_, k) => `<i style="left:${(k + 1) * 4 / m.bars * 100}%"></i>`).join('');
    const mine = composed && !isBuiltin(tr.id);
    return `<article class="card lesson song" data-song-card="${i}">
      <div class="song-head"><span class="badge${composed ? ' composed' : ''}">${composed ? t('composedBadge') : t('codedBadge')}</span>${mine ? `<span class="badge">${t('mine')}</span>` : ''}
        <span class="song-meta">${t('songMeta', { bpm: m.bpmLabel, bars: m.bars, time: clock(m.seconds) })}</span></div>
      <h3>${esc(tr.title)}</h3>
      ${tr.style ? `<p>${esc(tx(tr.style))}</p>` : ''}
      ${composed ? '' : `<p class="note">${t('codedNote')}</p>`}
      <div class="timeline" data-tl="${i}">
        ${m.sections.map(sec => `<button class="sec${/drop/i.test(sec.key) ? ' drop' : ''}" style="flex:${sec.len}" data-seek="${sec.start}" title="${esc(t('barsRange', { a: sec.start + 1, b: sec.start + sec.len }))}" aria-label="${esc(t('seekAria', { name: sec.label, bar: sec.start + 1 }))}">${esc(sec.label)}</button>`).join('')}
        <span class="ticks">${ticks}</span><span class="head"></span>
      </div>
      <div class="songbar">
        <button class="btn primary" data-act="play">${t('songPlay')}</button>
        ${composed ? `<button class="btn" data-act="open">${t('openInCompose')}</button>` : `<button class="btn" data-act="code">${t('editCode')}</button>${user.code[tr.id] ? `<button class="btn danger" data-act="restore">${t('restoreOrig')}</button>` : ''}`}
        <span class="time">${t('songTime', { t: '0:00', total: clock(m.seconds), bar: 1, bars: m.bars })}</span>
        <label class="loop"><input type="checkbox" data-loop="${i}"> ${t('loopSection')}</label>
      </div>
      ${m.sections.length > 1 ? `<div class="trans"><span class="lbl">${t('transitions')}</span>
        ${m.sections.slice(1).map((sec, k) => `<button class="chip" data-seek="${Math.max(0, sec.start - 2)}">${esc(m.sections[k].label)} → ${esc(sec.label)}</button>`).join('')}
      </div>` : ''}
    </article>`;
  }).join('') + `<p class="note">${t('seekHint')}</p>`;
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
    if (a === 'open') {
      if (!loadTrack(tr)) return;
      if (mode !== 'track') backToTrack(); else if (ed && !isPlaying()) ed.setCode(compiled.code);
      showTab('componi'); return;
    }
    if (a === 'code') { if (ed) ed.stop(); song = p; mode = 'free'; source = { kind: 'song', name: tr.title, id: tr.id }; renderSource(); if (ed) ed.setCode(p.code); updateShare(); return; }
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
(function transport() {
  requestAnimationFrame(transport);
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
    } else if (cyc >= m.bars) stop();
    if (mode === 'track' && follow) { const i = m.sectionAt(cyc); if (i >= 0 && i !== sel) selectScene(i); }
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
  // avanzamento nelle card
  $$('[data-song-card]').forEach(card => {
    const c = cards[+card.dataset.songCard]; if (!c) return;
    const active = playing && song && song.id === c.tr.id;
    const m = active ? song.meta : c.p.meta, cyc = active ? s.now() : 0;
    card.querySelector('.head').style.left = `${Math.min(100, cyc / m.bars * 100)}%`;
    const cur = active ? m.sectionAt(cyc) : -1;
    card.querySelectorAll('.sec').forEach((x, j) => x.classList.toggle('on', j === cur));
    const label = t('songTime', { t: clock(m.secondsAt(cyc)), total: clock(m.seconds), bar: Math.min(m.bars, Math.floor(cyc) + 1), bars: m.bars });
    const te = card.querySelector('.time');
    if (te.textContent !== label) te.textContent = label;
  });
})();

// ---------- suoni ----------
function renderSounds() {
  $('#sounds').innerHTML = SOUND_GROUPS.map(([g, list], gi) => `
    <div class="snd-group"><h3>${esc(tx(g))}</h3><div class="snds">${list.map(([n], i) => `<button class="snd" data-g="${gi}" data-i="${i}">${esc(n)}</button>`).join('')}</div></div>`).join('');
}
$('#sounds').addEventListener('click', e => {
  const b = e.target.closest('.snd'); if (!b) return;
  const [n, code] = SOUND_GROUPS[+b.dataset.g][1][+b.dataset.i];
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
  opts($('#sc-fade'), [['0', t('cut')], ['1', t('fade1')], ['2', t('fadeN', { n: 2 })], ['4', t('fadeN', { n: 4 })], ['8', t('fadeN', { n: 8 })]]);
  $('#looks').innerHTML = LOOKS.map(([k, l]) => `<button class="chip" data-look="${k}">${esc(tx(l))}</button>`).join('');
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
updateShare();
startVisuals({
  getS: () => ({ look }),
  // il sequencer mostra il playhead solo se la scena selezionata è quella che sta suonando
  getMode: () => (mode === 'track' && song && isPlaying() && song.meta.sectionAt(sched().now()) === sel ? 'comp' : 'free'),
  isPlaying, sched,
  readout(cyc, step, playing) {
    if (!playing) return `${S.bpm} BPM  ·  ${t('rdPaused')}\n${t('rdHint')}`;
    const bpm = Math.round(sched().cps * 240);
    const bar = Math.floor(cyc);
    let line2 = $('#src').textContent;
    if (song) {
      const i = song.meta.sectionAt(cyc), sec = song.meta.sections[i];
      line2 = `${song.title}  ·  ${sec ? sec.label : ''}`;
      if (mode === 'track' && sec && T.scenes[i]) {
        const st = T.scenes[i].state, tr = (KEYS.find(k => k[0] === st.key) || [0, 0])[1];
        const pos = (bar - sec.start) % 4;
        line2 += '\n' + PROGS[st.prog][1].map(c => chordName(c, tr)).map((n, j) => j === pos ? `[${n}]` : ` ${n} `).join('');
      }
    }
    return `${bpm} BPM  ·  ${t('rdBar')} ${String(bar + 1).padStart(3, '0')}.${(step >> 2) + 1}\n${line2}`;
  },
});
