import '@strudel/repl';
import './style.css';
import * as M from './music.js';
import { LESSONS, SOUND_GROUPS, REFS, SONGS } from './content.js';
import { startVisuals } from './visuals.js';

const { KEYS, PROGS, WAVES, MOVES, BASS, ARPS, HOOKS, KITS, ROWS, GROOVES, LOOKS, SCENES, DEFAULT, gen, VIS } = M;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const clone = o => JSON.parse(JSON.stringify(o));
let S = clone(DEFAULT);
try { const saved = JSON.parse(localStorage.getItem('coding-misk-state')); if (saved && saved.drums) S = Object.assign(clone(DEFAULT), saved); } catch (e) {}
const save = () => { try { localStorage.setItem('coding-misk-state', JSON.stringify(S)); } catch (e) {} };

// ---------- editor Strudel ----------
let ed = null, mode = 'comp', evalTimer = 0;
const host = $('#edhost');
const el = document.createElement('strudel-editor');
el.innerHTML = `<!--\n${gen(S)}\n-->`;
host.appendChild(el);
const ready = new Promise(res => { const t = setInterval(() => { if (el.editor) { clearInterval(t); ed = el.editor; res(ed); } }, 100); });
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
let song = null;
async function loadFree(code, label, { restart = false, song: sg = null } = {}) {
  song = sg;
  initAudioOnce();
  await ready;
  await initAudioOnce();
  if (restart) ed.stop(); // fermare riporta lo scheduler alla battuta 1
  mode = 'free';
  $('#src').textContent = label;
  $('#back').hidden = false;
  ed.setCode(code + VIS);
  await ed.evaluate();
  updateShare();
}
function backToComp() {
  mode = 'comp';
  song = null;
  $('#src').textContent = 'generato dalla composizione';
  $('#back').hidden = true;
  $$('.snd.on').forEach(b => b.classList.remove('on'));
  if (ed) ed.setCode(gen(S));
  if (isPlaying()) ed.evaluate();
  updateShare();
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
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200);
}
$('#copy').addEventListener('click', () => {
  const code = currentCode();
  try {
    navigator.clipboard.writeText(code).then(() => toast('Codice copiato'), () => toast('Copia non disponibile qui: usa "Apri su strudel.cc"'));
  } catch (e) { toast('Copia non disponibile qui: usa "Apri su strudel.cc"'); }
});
$('#reset').addEventListener('click', () => { const look = S.look; S = clone(DEFAULT); S.look = look; syncAll(); backToComp(); changed(); toast('Composizione ripristinata'); });
$('#back').addEventListener('click', backToComp);

$('#play').addEventListener('click', () => isPlaying() ? stop() : play());
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const inEditor = e.target.closest && e.target.closest('strudel-editor');
  if (e.key === 'Enter' && !inEditor) { e.preventDefault(); play(); }
  if (e.key === '.' && !inEditor) { e.preventDefault(); stop(); }
});

// ---------- controlli ----------
const opts = (sel, list) => { sel.innerHTML = list.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); };
opts($('#key'), KEYS.map(k => [k[0], k[2]]));
opts($('#prog'), Object.entries(PROGS).map(([k, v]) => [k, `${v[0]} · ${v[1].join(' ')}`]));
opts($('#drums-kit'), KITS.map(k => [k, k.replace('Roland', '')]));
opts($('#drums-preset'), [['', 'Scegli un groove…'], ...Object.entries(GROOVES).map(([k, v]) => [k, v[0]])]);

const CHANNELS = [
  { id: 'bass', name: 'Basso', hint: 'la spinta sotto la cassa', ctrls: [
    ['select', 'preset', 'Ritmo', Object.entries(BASS).map(([k, v]) => [k, v[0]])],
    ['select', 'wave', 'Suono', WAVES], ['range', 'gain', 'Volume'], ['cutoff', 'cutoff', 'Filtro'], ['select', 'move', 'Movimento filtro', MOVES]] },
  { id: 'arp', name: 'Arpeggio', hint: 'gli accordi suonati una nota alla volta', ctrls: [
    ['select', 'preset', 'Figura', Object.entries(ARPS).map(([k, v]) => [k, v[0]])],
    ['select', 'wave', 'Suono', WAVES], ['range', 'gain', 'Volume'], ['cutoff', 'cutoff', 'Filtro'],
    ['select', 'speed', 'Velocità', [['16', 'Sedicesimi'], ['8', 'Ottavi']]], ['range', 'delay', 'Delay']] },
  { id: 'hook', name: 'Hook', hint: 'la melodia che resta in testa', ctrls: [
    ['select', 'preset', 'Melodia', Object.entries(HOOKS).map(([k, v]) => [k, v[0]])],
    ['select', 'wave', 'Suono', WAVES], ['range', 'gain', 'Volume'], ['cutoff', 'cutoff', 'Filtro'],
    ['select', 'move', 'Movimento filtro', MOVES], ['range', 'delay', 'Delay']] },
  { id: 'pad', name: 'Pad', hint: 'il tappeto armonico', ctrls: [
    ['select', 'wave', 'Suono', WAVES], ['range', 'gain', 'Volume'], ['cutoff', 'cutoff', 'Filtro'],
    ['select', 'move', 'Movimento filtro', MOVES], ['range', 'room', 'Riverbero']] },
  { id: 'riser', name: 'Riser', hint: 'tensione prima del drop', ctrls: [
    ['range', 'gain', 'Volume'], ['select', 'bars', 'Durata', [['4', '4 battute'], ['8', '8 battute'], ['16', '16 battute']]]] },
];
const cutToRange = c => Math.round(Math.log(c / 100) / Math.log(80) * 100);
const rangeToCut = v => Math.round(100 * Math.pow(80, v / 100));

const chHost = $('#channels');
for (const ch of CHANNELS) {
  const card = document.createElement('div');
  card.className = 'card'; card.id = 'ch-' + ch.id;
  card.innerHTML = `<div class="chhead"><button class="led" data-on="${ch.id}" aria-label="${ch.name} on/off"></button><h3>${ch.name}</h3><span class="hint">${ch.hint}</span></div><div class="ctrls"></div>`;
  const box = $('.ctrls', card);
  for (const [type, key, label, list] of ch.ctrls) {
    const id = `${ch.id}-${key}`;
    const c = document.createElement('div'); c.className = 'ctrl';
    if (type === 'select') {
      c.innerHTML = `<label class="lbl" for="${id}">${label}</label><select id="${id}" data-path="${ch.id}.${key}"></select>`;
      opts($('select', c), list);
    } else {
      const cut = type === 'cutoff';
      c.innerHTML = `<div class="row"><label class="lbl" for="${id}">${label}</label><output id="${id}-o"></output></div><input type="range" id="${id}" data-path="${ch.id}.${key}" ${cut ? 'data-cut="1" min="0" max="100" step="1"' : 'min="0" max="1" step="0.01"'}>`;
    }
    box.appendChild(c);
  }
  chHost.appendChild(card);
}

// sequencer
const seq = $('#seq');
seq.innerHTML = '<span></span><div class="stepnums">' + Array.from({ length: 16 }, (_, i) => `<span>${i + 1}</span>`).join('') + '</div>';
for (const [id, label] of ROWS) {
  const lb = document.createElement('button');
  lb.className = 'rowlbl'; lb.dataset.row = id; lb.textContent = label; lb.title = 'Silenzia o riattiva ' + label;
  const st = document.createElement('div'); st.className = 'steps';
  for (let i = 0; i < 16; i++) {
    const b = document.createElement('button');
    b.className = 'step'; b.dataset.row = id; b.dataset.i = i;
    b.setAttribute('aria-label', `${label} passo ${i + 1}`);
    st.appendChild(b);
  }
  seq.append(lb, st);
}
seq.addEventListener('click', e => {
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

// temi visual
const looks = $('#looks');
looks.innerHTML = LOOKS.map(([k, l]) => `<button class="chip" data-look="${k}">${l}</button>`).join('');
looks.addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (!b) return; S.look = b.dataset.look; syncAll(); save(); });

$('#fs').addEventListener('click', () => {
  const w = $('#stagewrap');
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (w.requestFullscreen) w.requestFullscreen().catch(() => toast('Schermo intero non disponibile qui'));
    else toast('Schermo intero non disponibile qui');
  } catch (e) { toast('Schermo intero non disponibile qui'); }
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
  $$('[data-path]').forEach(i => {
    const v = getPath(i.dataset.path);
    i.value = i.dataset.cut ? cutToRange(v) : v;
  });
  $$('[data-on]').forEach(b => {
    const on = S[b.dataset.on].on;
    b.setAttribute('aria-pressed', on);
    const card = b.dataset.on === 'drums' ? $('#drums') : $('#ch-' + b.dataset.on);
    card.classList.toggle('off', !on);
  });
  $$('.step').forEach(b => b.setAttribute('aria-pressed', S.drums.rows[b.dataset.row].steps[b.dataset.i] === 'x'));
  $$('.rowlbl').forEach(b => b.setAttribute('aria-pressed', S.drums.rows[b.dataset.row].mute));
  $$('.scene').forEach(b => b.setAttribute('aria-pressed', S.scene === b.dataset.scene));
  $$('#looks .chip').forEach(b => b.setAttribute('aria-pressed', S.look === b.dataset.look));
  syncOutputs();
}

// tab
$$('.tab').forEach(t => t.addEventListener('click', () => {
  $$('.tab').forEach(x => x.setAttribute('aria-selected', x === t));
  for (const id of ['componi', 'brani', 'guida', 'suoni', 'riferimenti']) $('#tab-' + id).hidden = id !== t.dataset.tab;
  try { localStorage.setItem('coding-misk-tab', t.dataset.tab); } catch (e) {}
}));
try { const tb = localStorage.getItem('coding-misk-tab'); if (tb) { const t = $(`.tab[data-tab="${tb}"]`); if (t) t.click(); } } catch (e) {}

// ---------- guida ----------
$('#lessons').innerHTML = LESSONS.map(([t, p, code, tryit], i) => `
  <article class="card lesson">
    <div class="step-n">${String(i + 1).padStart(2, '0')} / ${LESSONS.length}</div>
    <h3>${t}</h3>
    <p>${p}</p>
    <pre><code>${code.replace(/</g, '&lt;')}</code></pre>
    <p class="try">Prova: ${tryit}</p>
    <div><button class="btn primary" data-lesson="${i}">▶ Carica e ascolta</button></div>
  </article>`).join('');
$('#lessons').addEventListener('click', e => {
  const b = e.target.closest('[data-lesson]'); if (!b) return;
  const [t, , code] = LESSONS[+b.dataset.lesson];
  loadFree(code, `Guida: ${t}`);
});

// ---------- brani ----------
$('#songs').innerHTML = SONGS.map((sg, i) => `
  <article class="card lesson" data-song-card="${i}">
    <div class="song-meta">${sg.bpm} BPM · ${sg.bars} battute · ${Math.round(sg.bars * 4 * 60 / sg.bpm)} secondi</div>
    <h3>${sg.title}</h3>
    <p>${sg.style}</p>
    <div class="timeline">${sg.sections.map(([n, a, b]) => `<div class="sec${/drop/i.test(n) ? ' drop' : ''}" style="flex:${b - a + 1}" title="Battute ${a}-${b}">${n}</div>`).join('')}<span class="head"></span></div>
    <div><button class="btn primary" data-song="${i}">▶ Ascolta dall'inizio</button></div>
  </article>`).join('');
$('#songs').addEventListener('click', e => {
  const b = e.target.closest('[data-song]'); if (!b) return;
  const sg = SONGS[+b.dataset.song];
  loadFree(sg.code, `Brano: ${sg.title}`, { restart: true, song: sg });
});
// avanzamento del brano e stop automatico a fine pezzo
(function songLoop() {
  requestAnimationFrame(songLoop);
  $$('[data-song-card]').forEach(card => {
    const sg = SONGS[+card.dataset.songCard], active = song === sg && mode === 'free' && isPlaying();
    const cyc = active ? sched().now() : 0;
    card.querySelector('.head').style.left = `${Math.min(100, cyc / sg.bars * 100)}%`;
    const bar = Math.floor(cyc) + 1;
    card.querySelectorAll('.sec').forEach((el, j) => { const [, a, z] = sg.sections[j]; el.classList.toggle('on', active && bar >= a && bar <= z); });
    if (active && cyc >= sg.bars) { stop(); }
  });
})();

// ---------- suoni ----------
$('#sounds').innerHTML = SOUND_GROUPS.map(([g, list], gi) => `
  <div class="snd-group"><h3>${g}</h3><div class="snds">${list.map(([n], i) => `<button class="snd" data-g="${gi}" data-i="${i}">${n}</button>`).join('')}</div></div>`).join('');
$('#sounds').addEventListener('click', e => {
  const b = e.target.closest('.snd'); if (!b) return;
  const [n, code] = SOUND_GROUPS[+b.dataset.g][1][+b.dataset.i];
  $$('.snd.on').forEach(x => x.classList.remove('on')); b.classList.add('on');
  loadFree(code, `Suono: ${n}`);
});

// ---------- riferimenti ----------
$('#refs').innerHTML = REFS.map(([t, d, u]) => `<a class="card ref" href="${u}" target="_blank" rel="noopener"><strong>${t} ↗</strong><span>${d}</span></a>`).join('');

syncAll();
updateShare();
startVisuals({ getS: () => S, getMode: () => mode, isPlaying, sched });
