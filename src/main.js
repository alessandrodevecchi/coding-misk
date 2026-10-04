import '@strudel/repl';
import './style.css';
import { KEYS, PROGS, WAVES, MOVES, BASS, ARPS, HOOKS, KITS, ROWS, GROOVES, LOOKS, SCENES, DEFAULT, gen, withVisuals, chordName } from './music.js';
import { LESSONS, SOUND_GROUPS, REFS, SONGS } from './content.js';
import { startVisuals } from './visuals.js';
import { t, tx, getLang, setLang } from './i18n.js';
import { parseSong, clock } from './songs.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const clone = o => JSON.parse(JSON.stringify(o));
let S = clone(DEFAULT);
try { const saved = JSON.parse(localStorage.getItem('coding-misk-state')); if (saved && saved.drums) S = Object.assign(clone(DEFAULT), saved); } catch (e) {}
if (!LOOKS.some(([k]) => k === S.look)) S.look = DEFAULT.look;
const save = () => { try { localStorage.setItem('coding-misk-state', JSON.stringify(S)); } catch (e) {} };
setLang(getLang());

// ---------- editor Strudel ----------
let ed = null, mode = 'comp', evalTimer = 0;
// cosa c'è nell'editor, per ritradurre l'etichetta quando cambia la lingua
let source = { kind: 'comp', name: '' };
let song = null;
const el = document.createElement('strudel-editor');
el.innerHTML = `<!--\n${gen(S)}\n-->`;
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

async function play() {
  initAudioOnce();
  await ready;
  await initAudioOnce();
  if (mode === 'comp') ed.setCode(gen(S));
  await ed.evaluate();
  updateShare();
}
async function stop() { await ready; ed.stop(); }
function changed() {
  save();
  if (mode !== 'comp') return;
  if (ed) ed.setCode(gen(S));
  updateShare();
  clearTimeout(evalTimer);
  if (isPlaying()) evalTimer = setTimeout(() => ed.evaluate(), 120);
}
async function loadFree(code, src, { restart = false, song: sg = null } = {}) {
  song = sg;
  initAudioOnce();
  await ready;
  await initAudioOnce();
  if (restart) ed.stop(); // fermare riporta lo scheduler alla battuta 1
  mode = 'free';
  source = src;
  renderSource();
  ed.setCode(withVisuals(code));
  await ed.evaluate();
  updateShare();
}
function backToComp() {
  mode = 'comp';
  song = null;
  source = { kind: 'comp', name: '' };
  renderSource();
  $$('.snd.on').forEach(b => b.classList.remove('on'));
  if (ed) ed.setCode(gen(S));
  if (isPlaying()) ed.evaluate();
  updateShare();
}
function renderSource() {
  const map = { comp: () => t('fromComp'), lesson: () => t('srcGuide', { name: source.name }), sound: () => t('srcSound', { name: source.name }), song: () => t('srcSong', { name: source.name }) };
  $('#src').textContent = map[source.kind]();
  $('#back').hidden = source.kind === 'comp';
}
const currentCode = () => (ed && ed.code) || gen(S);
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
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2200);
}
$('#copy').addEventListener('click', () => {
  try { navigator.clipboard.writeText(currentCode()).then(() => toast(t('copied')), () => toast(t('copyNo'))); }
  catch (e) { toast(t('copyNo')); }
});
$('#reset').addEventListener('click', () => { const look = S.look; S = clone(DEFAULT); S.look = look; syncAll(); backToComp(); changed(); toast(t('resetDone')); });
$('#back').addEventListener('click', backToComp);

$('#play').addEventListener('click', () => isPlaying() ? stop() : play());
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const inEditor = e.target.closest && e.target.closest('strudel-editor');
  if (e.key === 'Enter' && !inEditor) { e.preventDefault(); play(); }
  if (e.key === '.' && !inEditor) { e.preventDefault(); stop(); }
});

// ---------- controlli ----------
const opts = (sel, list) => {
  const v = sel.value;
  sel.innerHTML = list.map(([val, l]) => `<option value="${esc(val)}">${esc(tx(l))}</option>`).join('');
  if (v) sel.value = v;
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
  if (led) { S[led.dataset.on].on = !S[led.dataset.on].on; S.scene = ''; syncAll(); changed(); }
});
$('#key').addEventListener('change', e => { S.key = e.target.value; changed(); });
$('#prog').addEventListener('change', e => { S.prog = e.target.value; changed(); });
$('#bpm').addEventListener('change', e => { S.bpm = Math.max(60, Math.min(200, Math.round(+e.target.value) || 138)); syncAll(); changed(); });
$$('[data-bpm]').forEach(b => b.addEventListener('click', () => { S.bpm = Math.max(60, Math.min(200, S.bpm + +b.dataset.bpm)); syncAll(); changed(); }));

$$('.scene').forEach(b => b.addEventListener('click', () => {
  const sc = SCENES[b.dataset.scene];
  S.scene = b.dataset.scene;
  S.drums.on = sc.drums; S.drums.rows.bd.mute = !sc.kick;
  for (const k of ['bass', 'arp', 'hook', 'pad', 'riser']) S[k].on = sc[k];
  if (mode !== 'comp') backToComp();
  syncAll(); changed();
  if (!isPlaying()) play();
}));

$('#looks').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (!b) return; S.look = b.dataset.look; syncAll(); save(); });
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
  document.documentElement.dataset.look = S.look;
  $('#bpm').value = S.bpm; $('#key').value = S.key; $('#prog').value = S.prog;
  $$('[data-path]').forEach(i => { const v = getPath(i.dataset.path); i.value = i.dataset.cut ? cutToRange(v) : v; });
  $$('[data-on]').forEach(b => {
    const on = S[b.dataset.on].on;
    b.setAttribute('aria-pressed', on);
    (b.dataset.on === 'drums' ? $('#drums') : $('#ch-' + b.dataset.on)).classList.toggle('off', !on);
  });
  $$('.step').forEach(b => b.setAttribute('aria-pressed', S.drums.rows[b.dataset.row].steps[b.dataset.i] === 'x'));
  $$('.rowlbl').forEach(b => b.setAttribute('aria-pressed', S.drums.rows[b.dataset.row].mute));
  $$('.scene').forEach(b => b.setAttribute('aria-pressed', S.scene === b.dataset.scene));
  $$('#looks .chip').forEach(b => b.setAttribute('aria-pressed', S.look === b.dataset.look));
  $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', getLang() === b.dataset.lang));
  syncOutputs();
}

// tab
const TABS = ['componi', 'brani', 'guida', 'suoni', 'riferimenti'];
$$('.tab').forEach(tb => tb.addEventListener('click', () => {
  $$('.tab').forEach(x => x.setAttribute('aria-selected', x === tb));
  for (const id of TABS) $('#tab-' + id).hidden = id !== tb.dataset.tab;
  try { localStorage.setItem('coding-misk-tab', tb.dataset.tab); } catch (e) {}
}));
try { const tb = localStorage.getItem('coding-misk-tab'); if (tb) { const el = $(`.tab[data-tab="${tb}"]`); if (el) el.click(); } } catch (e) {}

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
for (const sg of SONGS) sg.meta = parseSong(sg.code);
let loopIdx = -1;

// Parte dalla battuta "bar": lo scheduler di Strudel riprende da lastEnd, quindi basta impostarlo prima di avviare.
async function playSong(sg, bar = 0) {
  initAudioOnce();
  await ready;
  await initAudioOnce();
  const m = sg.meta;
  bar = Math.max(0, Math.min(m.bars - 1, Math.floor(bar)));
  song = sg; mode = 'free';
  source = { kind: 'song', name: sg.title }; renderSource();
  ed.stop();
  ed.setCode(withVisuals(sg.code).replace(/setcpm\([^)]*\)/, `setcpm(${+m.bpm[bar].toFixed(2)}/4)`));
  sched().lastEnd = bar;
  if (loopIdx >= 0) loopIdx = m.sectionAt(bar);
  await ed.evaluate();
  updateShare();
}

function renderSongs() {
  $('#songs').innerHTML = SONGS.map((sg, i) => {
    const m = sg.meta;
    const ticks = Array.from({ length: Math.floor(m.bars / 4) - 1 }, (_, k) => `<i style="left:${(k + 1) * 4 / m.bars * 100}%"></i>`).join('');
    return `<article class="card lesson song" data-song-card="${i}">
      <div class="song-meta">${t('songMeta', { bpm: m.bpmLabel, bars: m.bars, time: clock(m.seconds) })}</div>
      <h3>${esc(sg.title)}</h3>
      <p>${esc(tx(sg.style))}</p>
      <div class="timeline" data-tl="${i}">
        ${m.sections.map(sec => `<button class="sec${/drop/i.test(sec.key) ? ' drop' : ''}" style="flex:${sec.len}" data-seek="${sec.start}" title="${esc(t('barsRange', { a: sec.start + 1, b: sec.start + sec.len }))}" aria-label="${esc(t('seekAria', { name: sec.label, bar: sec.start + 1 }))}">${sec.label}</button>`).join('')}
        <span class="ticks">${ticks}</span><span class="head"></span>
      </div>
      <div class="songbar">
        <button class="btn primary" data-song="${i}">${t('songPlay')}</button>
        <span class="time" data-time="${i}">${t('songTime', { t: '0:00', total: clock(m.seconds), bar: 1, bars: m.bars })}</span>
        <label class="loop"><input type="checkbox" data-loop="${i}"> ${t('loopSection')}</label>
      </div>
      <div class="trans"><span class="lbl">${t('transitions')}</span>
        ${m.sections.slice(1).map((sec, k) => `<button class="chip" data-song-i="${i}" data-seek="${Math.max(0, sec.start - 2)}">${m.sections[k].label} → ${sec.label}</button>`).join('')}
      </div>
      <p class="note">${t('seekHint')}</p>
    </article>`;
  }).join('');
}
$('#songs').addEventListener('click', e => {
  const card = e.target.closest('[data-song-card]'); if (!card) return;
  const sg = SONGS[+card.dataset.songCard];
  const startSong = bar => { if (sg.look && song !== sg) { S.look = sg.look; syncAll(); save(); } playSong(sg, bar); };
  if (e.target.closest('[data-song]')) return startSong(0);
  const chip = e.target.closest('.trans [data-seek]');
  if (chip) return startSong(+chip.dataset.seek);
  const tl = e.target.closest('.timeline');
  if (tl) {
    const r = tl.getBoundingClientRect();
    // da tastiera (detail 0) si va all'inizio della sezione, col puntatore al punto esatto
    const bar = e.detail === 0 ? +e.target.closest('[data-seek]').dataset.seek : (e.clientX - r.left) / r.width * sg.meta.bars;
    return startSong(bar);
  }
});
$('#songs').addEventListener('change', e => {
  const cb = e.target.closest('[data-loop]'); if (!cb) return;
  const sg = SONGS[+cb.dataset.loop];
  loopIdx = cb.checked ? (song === sg && isPlaying() ? sg.meta.sectionAt(sched().now()) : 0) : -1;
  $$('[data-loop]').forEach(x => { if (x !== cb) x.checked = false; });
});

// a ogni frame: tempo per battuta, avanzamento, ripetizione della sezione, stop a fine brano
(function songLoop() {
  requestAnimationFrame(songLoop);
  $$('[data-song-card]').forEach(card => {
    const i = +card.dataset.songCard, sg = SONGS[i], m = sg.meta;
    const active = song === sg && mode === 'free' && isPlaying();
    const s = sched();
    const cyc = active ? s.now() : 0;
    if (active) {
      const ahead = Math.min(m.bars - 1, Math.floor(s.lastEnd + s.cps * .1));
      const target = m.bpm[ahead] / 240;
      if (Math.abs(s.cps - target) > 1e-6) s.setCps(target);
      if (loopIdx >= 0) {
        const sec = m.sections[loopIdx];
        if (cyc >= sec.start + sec.len) playSong(sg, sec.start);
      } else if (cyc >= m.bars) stop();
    }
    card.querySelector('.head').style.left = `${Math.min(100, cyc / m.bars * 100)}%`;
    const cur = active ? m.sectionAt(cyc) : -1;
    card.querySelectorAll('.sec').forEach((el, j) => el.classList.toggle('on', j === cur));
    const bar = Math.min(m.bars, Math.floor(cyc) + 1);
    const label = t('songTime', { t: clock(m.secondsAt(cyc)), total: clock(m.seconds), bar, bars: m.bars });
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
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $('[data-on="drums"]').setAttribute('aria-label', t('onoff', { name: t('drums') }));
  opts($('#key'), KEYS.map(k => [k[0], k[2]]));
  opts($('#prog'), Object.entries(PROGS).map(([k, v]) => [k, `${tx(v[0])} · ${v[1].join(' ')}`]));
  opts($('#drums-kit'), KITS.map(k => [k, k.replace('Roland', '')]));
  opts($('#drums-preset'), [['', t('pickGroove')], ...Object.entries(GROOVES).map(([k, v]) => [k, v[0]])]);
  $('#looks').innerHTML = LOOKS.map(([k, l]) => `<button class="chip" data-look="${k}">${esc(tx(l))}</button>`).join('');
}
function renderAll() {
  renderStatic(); renderChannels(); renderSeq(); renderLessons(); renderSongs(); renderSounds(); renderRefs(); renderSource();
  syncAll();
}
$$('[data-lang]').forEach(b => b.addEventListener('click', () => {
  setLang(b.dataset.lang);
  renderAll();
  if (mode === 'comp') changed();
}));

renderAll();
updateShare();
startVisuals({
  getS: () => S, getMode: () => mode, isPlaying, sched,
  readout(cyc, step, playing) {
    if (!playing) return `${S.bpm} BPM  ·  ${t('rdPaused')}\n${t('rdHint')}`;
    const bpm = mode === 'comp' ? S.bpm : Math.round(sched().cps * 240);
    const bar = Math.floor(cyc);
    let line2;
    if (mode === 'comp') {
      const tr = (KEYS.find(k => k[0] === S.key) || [0, 0])[1];
      line2 = PROGS[S.prog][1].map(c => chordName(c, tr)).map((n, i) => i === bar % 4 ? `[${n}]` : ` ${n} `).join('');
    } else if (song) {
      const sec = song.meta.sections[song.meta.sectionAt(cyc)];
      line2 = `${song.title}  ·  ${sec ? sec.label : ''}`;
    } else line2 = $('#src').textContent;
    return `${bpm} BPM  ·  ${t('rdBar')} ${String(bar + 1).padStart(3, '0')}.${(step >> 2) + 1}\n${line2}`;
  },
});
