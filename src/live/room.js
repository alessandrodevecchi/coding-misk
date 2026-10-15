// The control room (#52): another tab of the app. It drives the app tab over a BroadcastChannel (presets, TAKE) and OBS
// over its control channel (go live and end, scenes, the picture on air, stats), and relays the broadcast window's beat
// to OBS, whose watchdog script shows Standby when the beat stops.
import { t } from '../i18n.js';
import { CHANNEL, PRESETS, presetOf, isStale, liveAreas } from './presets.js';
import { FUTURE } from './timeline.js';
import { connectObs, OBS_DEFAULTS, SCENES, BEAT_INPUT, onAirClock } from './obs.js';

const KEY = 'coding-misk-obs';
const root = document.getElementById('room');
const bc = new BroadcastChannel(CHANNEL);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const load = () => { try { return { ...OBS_DEFAULTS, password: '', ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch (e) { return { ...OBS_DEFAULTS, password: '' }; } };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

let app = null, appAt = 0, beatAt = 0, cue = presetOf(PRESETS[1]);
let obs = null, obsErr = '', obsBusy = false, out = null, scene = '', watchdog = null, autoStandby = false;
let armed = null, armedTimer = 0;
const urls = { program: '', preview: '' };

// ---------- the page ----------
const VIEW_NAMES = { visual: 'lrViewVisual', code: 'lrViewCode', 'code-soul': 'lrViewCodeSoul', soul: 'lrViewSoul', 'code-only': 'lrViewCodeOnly',
  'visual-tl': 'lrViewVisualTl', 'visual-code-tl': 'lrViewVisualCodeTl', 'code-tl': 'lrViewCodeTl', 'soul-tl': 'lrViewSoulTl', 'visual-float': 'lrViewVisualFloat', 'visual-column': 'lrViewVisualColumn' };
// a small drawing of a view, from the same areas the picture uses
function thumb(view) {
  const W = 160, H = 90, A = liveAreas(view, W, H), r = (a, fill, extra = '') => (a.a > .5 && a.x < W ? `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="2" fill="${fill}" ${extra}/>` : '');
  const lines = a => (a.a > .5 && a.x < W ? Array.from({ length: Math.floor((a.h - 6) / 5) }, (_, i) => `<rect x="${a.x + 4}" y="${a.y + 5 + i * 5}" width="${(a.w - 8) * (.45 + ((i * 37) % 50) / 100)}" height="2" fill="#00e5ff" opacity=".7"/>`).join('') : '');
  const soul = A.soul.a > .5 && A.soul.x < W ? `<circle cx="${A.soul.x + A.soul.w / 2}" cy="${A.soul.y + A.soul.h / 2 + 2}" r="${Math.min(A.soul.w, A.soul.h) * .3}" fill="url(#sg)"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="vg" x2="1" y2="1"><stop offset="0" stop-color="#ff2e88"/><stop offset="1" stop-color="#7b2cff"/></linearGradient><radialGradient id="sg"><stop offset="0" stop-color="#3dffb0"/><stop offset="1" stop-color="#3dffb0" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="#0a0614"/>${r(A.stage, 'url(#vg)')}${r(A.soul, '#06120e', 'stroke="#3b2758"')}${soul}${r(A.code, '#06101a', 'stroke="#3b2758"')}${lines(A.code)}</svg>`;
}
function build() {
  const c = load();
  root.innerHTML = `
    <div class="status" role="status">
      <span class="onair" id="lr-onair">ON AIR</span>
      <span id="lr-time" class="mono">0:00:00</span>
      <span id="lr-obs"></span>
      <span id="lr-rec"></span>
      <span id="lr-drop"></span>
      <span id="lr-pic"></span>
      <span class="end muted">1080p30</span>
    </div>
    <div class="grid">
      <section class="card" aria-labelledby="lr-h-mon">
        <h2 id="lr-h-mon">${esc(t('lrMonitors'))}</h2>
        <div class="monitors">
          <div class="mon prev"><img id="lr-prev" alt=""><span class="tag" id="lr-prev-tag"></span><div class="empty" id="lr-prev-empty"></div></div>
          <div class="take"><button class="btn big" id="lr-take">⇄ TAKE</button><span class="keys"><kbd>Enter</kbd></span></div>
          <div class="mon air"><img id="lr-air" alt=""><span class="tag" id="lr-air-tag"></span><div class="empty" id="lr-air-empty"></div></div>
        </div>
        <div class="presets" id="lr-presets">${PRESETS.map(p => `<button class="preset" data-preset="${p.id}">${thumb(p.view)}<span>${esc(t(VIEW_NAMES[p.view]))}</span><kbd>${p.id}</kbd></button>`).join('')}</div>
        <div class="row"><span class="lbl">${esc(t('lrCard'))}</span><button class="btn" id="lr-card" aria-pressed="false"></button><span class="note" style="margin:0">${esc(t('lrCardHint'))}</span></div>
        <div class="row"><span class="lbl">${esc(t('lrFuture'))}</span><button class="btn" id="lr-future"></button><span class="note" style="margin:0">${esc(t('lrFutureHint'))}</span></div>
      </section>
      <div style="display:grid;gap:14px">
        <section class="card now" aria-labelledby="lr-h-now">
          <h2 id="lr-h-now">${esc(t('lrSource'))}</h2>
          <span class="lbl" id="lr-src"></span>
          <b id="lr-title"></b>
          <span class="muted" id="lr-artist"></span>
          <p class="note" id="lr-app-note"></p>
        </section>
        <section class="card" aria-labelledby="lr-h-scenes">
          <h2 id="lr-h-scenes">${esc(t('lrScenes'))}</h2>
          <div class="row" style="margin-top:0"><button class="btn" data-scene="live">Live</button><button class="btn" data-scene="standby">Standby</button></div>
          <p class="note" id="lr-watch"></p>
        </section>
        <section class="card conn" aria-labelledby="lr-h-obs">
          <h2 id="lr-h-obs">OBS</h2>
          <div class="two"><label><span class="lbl">${esc(t('lrHost'))}</span><input id="lr-host" value="${esc(c.host)}" autocomplete="off"></label><label><span class="lbl">${esc(t('lrPort'))}</span><input id="lr-port" value="${esc(c.port)}" inputmode="numeric" autocomplete="off"></label></div>
          <label><span class="lbl">${esc(t('lrPassword'))}</span><input id="lr-pass" type="password" value="${esc(c.password)}" autocomplete="off"></label>
          <div class="foot"><button class="btn" id="lr-connect"></button></div>
          <p class="note" id="lr-obs-note"></p>
        </section>
      </div>
    </div>
    <div class="foot">
      <button class="btn big red" id="lr-go"></button>
      <button class="btn big" id="lr-end"></button>
      <span class="keys">${t('lrKeys')}</span>
    </div>`;
}

// ---------- updates ----------
const $ = id => document.getElementById(id);
const dot = (cls, text) => `<span class="dot ${cls}"></span>${esc(text)}`;
const appAlive = () => !!app && performance.now() - appAt < 4000;
const picAlive = () => !isStale(beatAt, Date.now());
function update() {
  const streaming = !!(out && out.outputActive);
  $('lr-onair').classList.toggle('on', streaming);
  $('lr-time').textContent = onAirClock(streaming ? out.outputDuration : 0);
  $('lr-obs').innerHTML = obs ? dot('ok', t('lrObsOn')) : dot(obsErr ? 'bad' : '', t(obsErr ? `lrObsErr:${obsErr}` : 'lrObsOff'));
  $('lr-rec').innerHTML = out && out.rec ? dot('bad', 'REC') : '';
  $('lr-drop').textContent = streaming ? t('lrDropped', { n: out.outputSkippedFrames || 0 }) : '';
  $('lr-pic').innerHTML = picAlive() ? dot('ok', t('lrPicOn')) : dot(appAlive() ? 'warn' : 'bad', t('lrPicOff'));
  // monitors: the cued preset, and the picture on air (OBS's output when connected, else the app's picture)
  $('lr-prev-tag').textContent = `${t('lrPreview')} · ${t(VIEW_NAMES[cue.view])}`;
  $('lr-prev-empty').textContent = urls.preview ? '' : t('lrNoPics');
  const onAir = app && app.preset ? presetOf(app.preset) : null;
  $('lr-air-tag').textContent = `${t(obs ? 'lrOnAir' : 'lrAppPic')}${onAir ? ` · ${t(VIEW_NAMES[onAir.view])}` : ''}`;
  $('lr-air-empty').textContent = $('lr-air').getAttribute('src') ? '' : t('lrNoPics');
  for (const b of root.querySelectorAll('[data-preset]')) {
    const p = PRESETS.find(x => x.id === +b.dataset.preset);
    b.dataset.cue = String(p.view === cue.view);
    b.dataset.air = String(!!onAir && p.view === onAir.view);
  }
  $('lr-card').setAttribute('aria-pressed', String(cue.card));
  $('lr-card').textContent = t(cue.card ? 'lrCardOn' : 'lrCardOff');
  $('lr-future').textContent = t(`lrFuture:${cue.future}`);
  // the source
  $('lr-src').textContent = !appAlive() ? '' : app.radio ? t('lrSrcRadio') : t('lrSrcApp');
  $('lr-title').textContent = appAlive() ? app.title || '' : '';
  $('lr-artist').textContent = appAlive() ? app.artist || '' : '';
  const appNote = $('lr-app-note');
  appNote.textContent = !appAlive() ? t('lrNoApp') : !picAlive() ? t('lrNoWindow') : !app.playing ? t('lrNotPlaying') : '';
  appNote.classList.toggle('bad', !appAlive() || !picAlive());
  // scenes and the watchdog
  for (const b of root.querySelectorAll('[data-scene]')) { b.setAttribute('aria-pressed', String(scene === SCENES[b.dataset.scene])); b.disabled = !obs; }
  $('lr-watch').textContent = !obs ? t('lrScenesHint') : watchdog === false ? t('lrNoWatchdog') : t('lrWatchdog');
  $('lr-watch').classList.toggle('bad', !!obs && watchdog === false);
  // OBS and the main buttons
  $('lr-connect').textContent = t(obs ? 'lrDisconnect' : obsBusy ? 'lrConnecting' : 'lrConnect');
  $('lr-connect').disabled = obsBusy;
  $('lr-obs-note').textContent = obs ? '' : t(obsErr ? `lrObsHelp:${obsErr}` : 'lrObsHelp');
  $('lr-obs-note').classList.toggle('bad', !!obsErr);
  const go = $('lr-go'), end = $('lr-end');
  go.textContent = armed === 'go' ? t('lrConfirm') : `● ${t('lrGoLive')}`;
  go.classList.toggle('armed', armed === 'go');
  go.disabled = !obs || streaming;
  end.textContent = armed === 'end' ? t('lrConfirm') : `■ ${t('lrEnd')}`;
  end.classList.toggle('armed', armed === 'end');
  end.disabled = !obs || !streaming;
}

// ---------- the app tab ----------
bc.onmessage = e => {
  const m = e.data || {};
  if (m.type === 'state') { app = m; appAt = performance.now(); if (m.beatAt > beatAt) beatAt = m.beatAt; update(); }
  if (m.type === 'beat' && m.from === 'broadcast') { beatAt = m.at; }
  if (m.type === 'closed' && m.from === 'broadcast') { beatAt = 0; update(); }
  if (m.type === 'pics') {
    for (const k of ['program', 'preview']) {
      if (!(m[k] instanceof Blob)) continue;
      if (k === 'program' && obs) continue;
      if (urls[k]) URL.revokeObjectURL(urls[k]);
      urls[k] = URL.createObjectURL(m[k]);
      $(k === 'program' ? 'lr-air' : 'lr-prev').src = urls[k];
    }
    update();
  }
};
const hello = () => bc.postMessage({ type: 'hello' });
function cueTo(p) { cue = presetOf(p); bc.postMessage({ type: 'cue', preset: cue }); update(); }
function take() { bc.postMessage({ type: 'take', preset: cue }); }

// ---------- OBS ----------
async function connect() {
  const c = { host: $('lr-host').value.trim() || OBS_DEFAULTS.host, port: +$('lr-port').value || OBS_DEFAULTS.port, password: $('lr-pass').value };
  save(c);
  obsBusy = true; obsErr = ''; update();
  try {
    obs = await connectObs(c, {
      onEvent: (type, d) => {
        if (type === 'CurrentProgramSceneChanged') { scene = d.sceneName; update(); }
        if (type === 'StreamStateChanged') poll();
      },
      onClose: () => { obs = null; obsErr = 'closed'; out = null; watchdog = null; update(); },
    });
    if (urls.program) { URL.revokeObjectURL(urls.program); urls.program = ''; }
    await poll();
  } catch (e) { obs = null; obsErr = e && e.code ? e.code : 'refused'; }
  obsBusy = false; update();
}
async function poll() {
  if (!obs) return;
  try {
    const [s, r, sc] = await Promise.all([obs.call('GetStreamStatus'), obs.call('GetRecordStatus'), obs.call('GetCurrentProgramScene')]);
    out = { ...s, rec: r.outputActive };
    scene = sc.sceneName || sc.currentProgramSceneName || '';
  } catch (e) {}
  update();
}
// the beat to OBS while the broadcast window draws; without the watchdog script, the control room switches scenes itself
// only a new beat from the window is relayed, so OBS sees the picture stop at once (not after the room's own wait)
let sentBeat = 0;
async function beat() {
  if (!obs) return;
  const alive = picAlive();
  if (alive && beatAt !== sentBeat) {
    sentBeat = beatAt;
    try { await obs.call('SetInputSettings', { inputName: BEAT_INPUT, inputSettings: { beat: Date.now() % 1e9 } }); watchdog = true; }
    catch (e) { watchdog = false; }
  }
  if (watchdog !== false || !(out && out.outputActive)) return;
  if (!alive && scene === SCENES.live) { autoStandby = true; setScene('standby'); }
  else if (alive && autoStandby && scene === SCENES.standby) { autoStandby = false; setScene('live'); }
}
async function shot() {
  if (!obs || !scene) return;
  try {
    const r = await obs.call('GetSourceScreenshot', { sourceName: scene, imageFormat: 'jpg', imageWidth: 384, imageCompressionQuality: 70 });
    if (r.imageData) $('lr-air').src = r.imageData;
  } catch (e) {}
}
async function setScene(k) { if (!obs) return; try { await obs.call('SetCurrentProgramScene', { sceneName: SCENES[k] }); scene = SCENES[k]; } catch (e) { obsErr = 'scene'; } update(); }
// go live and end ask a second press within three seconds
function arm(kind, action) {
  if (armed === kind) { armed = null; clearTimeout(armedTimer); action(); update(); return; }
  armed = kind; clearTimeout(armedTimer); armedTimer = setTimeout(() => { armed = null; update(); }, 3000); update();
}
const goLive = () => arm('go', async () => { try { await obs.call('StartStream'); } catch (e) { obsErr = 'start'; } setTimeout(poll, 800); });
const endLive = () => arm('end', async () => { try { await obs.call('StopStream'); } catch (e) { obsErr = 'stop'; } setTimeout(poll, 800); });

// ---------- input ----------
build();
root.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.preset) { const p = PRESETS.find(x => x.id === +b.dataset.preset); cueTo({ ...cue, view: p.view }); }
  if (b.id === 'lr-card') cueTo({ ...cue, card: !cue.card });
  if (b.id === 'lr-future') cueTo({ ...cue, future: FUTURE[(FUTURE.indexOf(cue.future) + 1) % FUTURE.length] });
  if (b.id === 'lr-take') take();
  if (b.dataset.scene) { autoStandby = false; setScene(b.dataset.scene); }
  if (b.id === 'lr-connect') { if (obs) { obs.close(); obs = null; obsErr = ''; out = null; update(); } else connect(); }
  if (b.id === 'lr-go') goLive();
  if (b.id === 'lr-end') endLive();
});
root.addEventListener('dblclick', e => { const b = e.target.closest('[data-preset]'); if (b) take(); });
addEventListener('keydown', e => {
  if (e.target.closest('input') || e.metaKey || e.ctrlKey || e.altKey) return;
  // 1 to 9, then 0 for the tenth; the eleventh by click
  if (/^[0-9]$/.test(e.key)) { const p = PRESETS[e.key === '0' ? 9 : +e.key - 1]; if (p) cueTo({ ...cue, view: p.view }); }
  else if (e.key === 'Enter') { e.preventDefault(); take(); }
  else if (e.key === 'c' || e.key === 'C') cueTo({ ...cue, card: !cue.card });
  else if (e.key === 'b' || e.key === 'B') { autoStandby = false; setScene(scene === SCENES.standby ? 'live' : 'standby'); }
});

update();
hello(); bc.postMessage({ type: 'cue', preset: cue });
setInterval(() => { hello(); poll(); beat(); update(); }, 1000);
setInterval(shot, 500);
connect();
