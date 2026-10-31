// The Decode tab (track-to-code D1, D11, D12, D13): open a file, play it on the app's shared stage and write its code in
// the code column while it plays (level A). The panel holds the controls only: file, title and artist, Attribution,
// tempo and key, level, look ahead, sounds, Options, the tracks with mute and solo, the Original ↔ Code slider.
// main.js wires it: the player (Strudel's scheduler, the code column's typing) and the master stage.
import { probe, decode, fingerprint, sameFile, analysisCopy, MAX_SECONDS, ANALYSIS_RATE } from './input.js';
import { createDecodeStore, freshModel } from './store.js';
import { horizonOf, LOOK_AHEAD, LOOK_AHEAD_DEFAULT, LOCK_SECONDS, tapTempo } from './misk-analyzer.js';
import { momentSong, withVox, withoutVox, keyName, SOUND_PRESETS } from './writer.js';
import { defaultMix, mixApply, gainsOf, loudnessTrim, codeBus, setGain, ORIG } from './mix.js';
import { cycleOfFile, fileOfCycle, decodeMeta, createOriginal } from './sync.js';
import { currentModel } from './model.js';
import { liveCode } from '../live/live-code.js';
import { resolveProfile } from '../live/profiles.js';
import { FUNCTION_PRESETS } from '../song/writer.js';
import { COMMENT_PRESETS } from '../song/comments.js';

const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const VIEWS = ['now', 'compact', 'track', 'sections'];
// the Options of a decoded track (D13): the Live coder's defaults (comments: title only; every technical function)
export const DEFAULT_OPTIONS = { comments: 'none', functions: 'compact', view: 'now' };
export const DEFAULT_SETTINGS = () => ({ look: LOOK_AHEAD_DEFAULT, sounds: 'ours', options: { ...DEFAULT_OPTIONS }, mix: defaultMix(['code']) });
// the controls a decoded song plays with: the Live coder profile, narrator off (it would talk over the original)
export function decodeControls(options = DEFAULT_OPTIONS) {
  const o = { ...DEFAULT_OPTIONS, ...(options || {}) };
  return resolveProfile('switch', { narrator: false, ...(COMMENT_PRESETS[o.comments] || {}), ...(FUNCTION_PRESETS[o.functions] || {}), view: VIEWS.includes(o.view) ? o.view : 'now' });
}

const ICON = {
  drop: '<svg class="dc-big" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 40v12a4 4 0 0 0 4 4h44a4 4 0 0 0 4-4V40"/><path d="M32 8v30M22 28l10 10 10-10"/></g><g stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M14 47v2M19 44v8M24 46v4M40 46v4M45 43v10M50 47v2"/></g></svg>',
  wave: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 7v2M5 4v8M8 6v4M11 3v10M14 7v2"/></g></svg>',
  code: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4"/></g></svg>',
  file: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 1.8h5.5L12.5 5v9.2H4z"/><path d="M9.5 1.8V5h3"/></g></svg>',
  tap: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="9" width="12" height="4" rx="1"/><path d="M8 2v4M5.5 4.5L8 2l2.5 2.5"/></g></svg>',
  open: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.5h4.5V7M13.5 2.5L7 9"/><path d="M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"/></g></svg>',
  x: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  chev: '<svg class="dc-ico dc-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// app: { t, esc, toast, ctx(), output(), play({ cycle, sg, code }) → { time }, stopCode(), mode(), lang(), cols(),
//   files(), widgets(), source(name, level), stopOthers(), pickerOpen }
export function createDecodeTab({ root, app }) {
  const { t, esc } = app;
  const store = createDecodeStore();
  let cur = null;          // the open track: { file, name, fp, info, buffer, duration, trim, title, artist, attribution, settings, video, handle }
  let model = null;        // the song model (level A, bars analysed so far)
  let status = null;       // { kind: 'busy' | 'error' | 'note', text }
  let recent = [];
  let worker = null, workerFor = null, ask = 0, waiting = null, modelSeq = 0;
  let orig = null, origGain = null, origAn = null, codeAn = null, origFor = null;
  let playing = false, startedCode = false, pendingStart = null, lastUi = 0, taps = [], optionsOpen = false, inflight = 0;
  const codeMemo = new Map();

  // ---------- the worker ----------
  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = e => {
      const m = e.data || {};
      if (m.type === 'model') {
        inflight = 0;
        if (waiting && m.id === waiting.id) { const w = waiting; waiting = null; w.resolve(m.model); }
        if (m.id !== ask) return;
        takeModel(m.model);
      }
      if (m.type === 'error') console.warn('[decode]', m.message);
    };
    return worker;
  }
  function takeModel(m) {
    if (!cur || !m) return;
    // a stored model of the bars heard stays until the new analysis reaches past it
    if (model && currentModel(model) && model.bars.length > (m.bars || []).length && model.bpm === m.bpm && model.downbeat === m.downbeat) return;
    model = m; modelSeq++; codeMemo.clear();
    if (cur.tempo && !m.tapped && m.bpm && cur.tempo.bpm !== m.bpm) cur.tempo = null;
    saveSoon();
    if (playing && !startedCode && orig && orig.playing && model.barSeconds > 0) startCode();
    renderLight();
  }
  // asks the worker for the model up to t (seconds); resolves with it when `wait`
  function analyse(t, wait = false) {
    if (!cur || !worker) return Promise.resolve(null);
    ask++;
    worker.postMessage({ type: 'upTo', t: Math.min(cur.duration, t), id: ask });
    if (!wait) return Promise.resolve(null);
    return new Promise(resolve => { waiting = { id: ask, resolve }; setTimeout(() => { if (waiting && waiting.id === ask) { waiting = null; resolve(null); } }, 4000); });
  }

  // ---------- opening ----------
  async function openFile(file, handle = null) {
    if (!file) return;
    stop();
    status = { kind: 'busy', text: t('dcReading') }; render();
    let info;
    try { info = await probe(file); } catch (e) { info = { duration: null, audio: true, video: false }; }
    if (info.duration && info.duration > MAX_SECONDS + 1) { status = { kind: 'error', text: t('dcErrLong', { len: clock(info.duration) }) }; render(); return; }
    status = { kind: 'busy', text: t('dcDecoding') }; render();
    let buffer;
    try { buffer = await decode(file, app.ctx(), info); }
    catch (e) {
      const code = e && e.code;
      status = { kind: 'error', text: t(code === 'nosound' ? 'dcErrNoSound' : code === 'long' ? 'dcErrLong' : code === 'memory' ? 'dcErrMemory' : 'dcErrFormat', { len: info.duration ? clock(info.duration) : '' }) };
      render(); return;
    }
    const fp = await fingerprint(file, buffer.duration * 1000).catch(() => null);
    const rec = fp ? await store.get(fp.key) : null, match = rec && sameFile(fp, rec);
    // the previous track's worker and buffers go (D2: free the buffers when the track closes)
    if (worker) { worker.terminate(); worker = null; }
    model = null; codeMemo.clear();
    cur = {
      file, name: file.name, fp, info, buffer, duration: buffer.duration, handle: handle || (match && rec.handle) || null,
      title: match ? rec.title : info.title, artist: match ? rec.artist : info.artist, attribution: match ? rec.attribution !== false : true,
      settings: match && rec.settings ? { ...DEFAULT_SETTINGS(), ...rec.settings, options: { ...DEFAULT_OPTIONS, ...(rec.settings.options || {}) } } : DEFAULT_SETTINGS(),
      tempo: match && rec.tempo ? rec.tempo : null, video: !!info.video,
      trim: loudnessTrim(buffer.getChannelData(0), buffer.sampleRate),
    };
    if (match && freshModel(rec.modelA)) model = rec.modelA;
    ensureWorker();
    const pcm = await analysisCopy(buffer);
    worker.postMessage({ type: 'load', pcm, rate: ANALYSIS_RATE }, [pcm.buffer]);
    workerFor = cur;
    // the stored or tapped tempo goes to the analyser first, so the bars fall where they fell before
    if (cur.tempo) worker.postMessage({ type: 'tempo', bpm: cur.tempo.bpm, downbeat: cur.tempo.downbeat, tapped: !!cur.tempo.tapped });
    else if (model && model.bpm) worker.postMessage({ type: 'tempo', bpm: model.bpm, downbeat: model.downbeat, tapped: false });
    status = match && model ? { kind: 'note', text: t('dcStored') } : cur.video ? { kind: 'note', text: t('dcVideoNote') } : null;
    if (match && cur.video) status = { kind: 'note', text: `${t('dcStored')} ${t('dcVideoNote')}` };
    await save();
    render();
    // the first window: the tempo and the first bars, so Play is ready at once
    // the tempo locks on the first seconds of music (D7, the tempo is the whole track's), whatever the look ahead
    analyse(Math.max(horizonOf(0, cur.settings.look, model && model.barSeconds ? model.barSeconds : 2), LOCK_SECONDS + 0.5));
  }
  let saveT = 0;
  // a save at most every 1.5 s (a timer that later changes do not push back, so a playing track is saved too)
  const saveSoon = () => { if (!saveT) saveT = setTimeout(() => { saveT = 0; save(); }, 1500); };
  async function save() {
    if (!cur || !cur.fp) return;
    const rec = {
      fp: cur.fp.key, size: cur.fp.size, durationMs: cur.fp.durationMs, fileName: cur.name, title: cur.title, artist: cur.artist, attribution: cur.attribution,
      settings: cur.settings, tempo: cur.tempo || null, modelA: model && model.bpm ? model : null, version: model ? model.version : null, video: cur.video,
      ...(cur.handle ? { handle: cur.handle } : {}),
    };
    const old = await store.get(cur.fp.key);
    if (old && old.modelB) rec.modelB = old.modelB;
    if (old && old.created) rec.created = old.created;
    await store.put(rec);
    recent = await store.list();
  }
  async function pick() {
    if (globalThis.showOpenFilePicker) {
      try {
        const [h] = await globalThis.showOpenFilePicker({ multiple: false, types: [{ description: 'Audio or video', accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus', '.oga', '.weba'], 'video/*': ['.mp4', '.m4v', '.mov', '.webm', '.mkv'] } }], excludeAcceptAllOption: false });
        if (h) return openFile(await h.getFile(), h);
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    root.querySelector('#dc-file').click();
  }
  async function reopen(fp) {
    const rec = await store.get(fp);
    if (!rec) return;
    if (rec.handle && rec.handle.queryPermission) {
      try {
        let p = await rec.handle.queryPermission({ mode: 'read' });
        if (p !== 'granted') p = await rec.handle.requestPermission({ mode: 'read' });
        if (p === 'granted') return openFile(await rec.handle.getFile(), rec.handle);
        app.toast(t('dcPermission'));
      } catch (e) { /* a handle that no longer works: pick the file again */ }
    }
    status = { kind: 'note', text: t('dcPickExpect', { name: rec.fileName || rec.title }) };
    render();
    pick();
  }

  // ---------- playing ----------
  const look = () => (cur ? cur.settings.look : LOOK_AHEAD_DEFAULT);
  const fileNow = () => (orig && orig.playing ? orig.now() : cur && cur.paused ? cur.paused : 0);
  const horizon = f => horizonOf(f, look(), model && model.barSeconds ? model.barSeconds : 2);
  // the last bar the look ahead lets the code know at file time f: the bars complete before the horizon
  const knownBar = f => (model && model.barSeconds ? Math.floor(cycleOfFile(model, horizon(f)) + 1e-6) - 1 : -1);
  async function play(from = null) {
    if (!cur) return;
    app.stopOthers();
    const f = Math.max(0, Math.min(cur.duration - 0.05, from ?? (cur.paused || 0)));
    cur.paused = null;
    playing = true; startedCode = false;
    // level A (D8): the first window up to the horizon is analysed before the sound starts
    const m = await analyse(Math.max(horizon(f), (model && model.bpm ? 0 : LOCK_SECONDS + 0.5)) + 0.1, true);
    if (m) takeModel(m);
    if (!playing) return;
    if (model && model.barSeconds > 0) await startCode(f);
    else {
      // no tempo yet (look ahead off, or a quiet start): the original plays alone until the tempo locks
      ensureAudio();
      orig.start(app.ctx().currentTime + 0.05, f);
    }
    renderLight();
  }
  // starts the code on Strudel's clock at file time f (D12), the original at the audio time of that cycle; a source
  // already playing hands over to the new one at that time
  async function startCode(f = null) {
    if (!cur || !model || !(model.barSeconds > 0) || pendingStart) return;
    startedCode = true;
    pendingStart = (async () => {
      ensureAudio();
      const ctx = app.ctx(), at = f ?? (orig && orig.playing ? orig.now() + 0.15 : 0);
      const c = cycleOfFile(model, at), bar = Math.floor(c), P = playableAt(Math.min(bar, knownBar(at)));
      const r = await app.play({ cycle: c, sg: P.sg, code: P.code, title: cur.title });
      if (!playing || !r || !Number.isFinite(r.time)) return;
      orig.start(r.time, fileOfCycle(model, c));
      app.source(cur.title, t('dcLive'));
      void ctx;
    })().finally(() => { pendingStart = null; });
    return pendingStart;
  }
  function stop({ keep = false } = {}) {
    if (saveT) { clearTimeout(saveT); saveT = 0; save(); }
    if (cur && keep && orig && orig.playing) cur.paused = orig.now();
    playing = false; startedCode = false;
    if (orig) orig.stop();
    if (app.mode() === 'decode') app.stopCode();
    taps = [];
    renderLight();
  }
  const pause = () => stop({ keep: true });
  const toggle = () => (playing ? pause() : play());
  // seek: both stop and start again from the new time with the code of that bar
  function seek(f) {
    if (!cur) return;
    if (!playing) { cur.paused = Math.max(0, Math.min(cur.duration - 0.05, f)); renderLight(); return; }
    if (orig) orig.stop();
    app.stopCode();
    play(f);
  }

  // ---------- the audio graph (D11) ----------
  function ensureAudio() {
    const ctx = app.ctx();
    if (!origGain || origGain.context !== ctx) {
      origGain = ctx.createGain(); origGain.gain.value = 0;
      origAn = ctx.createAnalyser(); origAn.fftSize = 1024; origGain.connect(origAn);
      orig = null; origFor = null;
    }
    if (!orig || orig.buffer !== cur.buffer) { if (orig) orig.stop(); orig = createOriginal(ctx, cur.buffer, origGain); orig.buffer = cur.buffer; }
    audio();
  }
  // every frame: the original into the master stage's level node, the code's bus gain from the mix (1 outside Decode)
  function audio() {
    const out = app.output(), st = out ? codeBus(out) : null;
    if (!st) return;
    const ctx = st.ctx, ours = app.mode() === 'decode' || playing;
    if (origGain && origFor !== st.level) { try { origGain.disconnect(); } catch (e) {} origGain.connect(st.level); origGain.connect(origAn); origFor = st.level; }
    if (!codeAn || codeAn.context !== ctx || codeAn.from !== st.codeGain) { codeAn = ctx.createAnalyser(); codeAn.fftSize = 1024; st.codeGain.connect(codeAn); codeAn.from = st.codeGain; }
    const g = cur ? gainsOf(cur.settings.mix) : { [ORIG]: 0, code: 1 };
    setGain(st.codeGain.gain, ours && cur ? g.code ?? 0 : 1, ctx);
    if (origGain) setGain(origGain.gain, cur ? g[ORIG] * cur.trim : 0, ctx);
  }
  const peakOf = an => { if (!an) return 0; const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let p = 0; for (const v of d) p = Math.max(p, Math.abs(v)); return p; };

  // ---------- the code of a bar (D9, D13) ----------
  const ctl = () => decodeControls(cur && cur.settings.options);
  function playableAt(bar) {
    const last = model ? model.bars.length - 1 : -1, at = Math.min(bar, last);
    const key = `${modelSeq}|${at}|${JSON.stringify([cur.title, cur.artist, cur.attribution, cur.settings.sounds, cur.settings.options])}`;
    if (codeMemo.has(key)) return codeMemo.get(key);
    const song = momentSong(model || { bars: [], bpm: 120 }, at, { id: 'decoded', title: cur.title, artist: cur.artist, attribution: cur.attribution, sounds: cur.settings.sounds });
    const C = ctl(), lc = liveCode({ ...song, build: [], crescendo: { growth: 0 } }, C, { lang: app.lang, files: app.files, cols: app.cols, widgets: app.widgets });
    const shown = withVox(lc.codeAt(0)), meta = decodeMeta(model || { duration: cur.duration, downbeat: 0, barSeconds: 2, bpm: 120 });
    const sg = {
      id: `decode:${cur.fp ? cur.fp.key : 'x'}`, title: cur.title, kind: 'decode', code: shown, meta, codeAt: null, codeKeep: null,
      run: c => { const s = withoutVox(c); return lc.run ? lc.run(s) : s; },
      standalone: c => { const s = withoutVox(c); return lc.standalone ? lc.standalone(s) : s; },
      buses: lc.buses, fns: lc.fns, build: null, ctl: C, doc: null, decode: true,
    };
    const out = { at, code: shown, sg, lines: shown.split('\n').filter(l => /^\s*[_S]?\$:/.test(l)).length };
    if (codeMemo.size > 400) codeMemo.clear();
    codeMemo.set(key, out);
    return out;
  }
  // the next change to type (D8, D13): the earliest bar after the playing one, up to the last bar the model knows, whose
  // code differs from the code that will be playing; its code is that bar's (or the last known bar's)
  function next(cyc, curCode) {
    if (!cur || !model || !playing) return null;
    // the bars the look ahead lets the code know: complete before the horizon (a stored model may know more)
    const now = Math.floor(cyc), last = Math.min(model.bars.length - 1, knownBar(fileNow()));
    for (let b = now + 1; b <= Math.max(now + 1, last); b++) {
      const P = playableAt(Math.min(b, last));
      if (P.code !== curCode) return { at: b, code: P.code, sg: P.sg };
    }
    return null;
  }

  // ---------- every frame ----------
  function frame() {
    if (!cur) return;
    if (playing && !pendingStart && (startedCode ? app.mode() !== 'decode' : app.othersPlaying())) { stop(); return; }
    if (!playing && orig && orig.playing) orig.stop();
    if (cur || codeAn) audio();
    if (!playing) return;
    const f = orig ? orig.now() : 0;
    if (f !== null && f >= cur.duration - 0.03) { stop(); cur.paused = 0; app.ended(); return; }
    // level A: keep the model ahead of the horizon (one request at a time, a little past it)
    const want = horizon(f ?? 0);
    // one request in flight at a time, a little past the horizon (a lost answer frees the slot after 3 s)
    if ((!model || (model.analysedTo || 0) < Math.min(cur.duration, want) - 0.01) && (!inflight || performance.now() - inflight > 3000)) { inflight = performance.now(); analyse(want + 0.5); }
    const now = performance.now();
    if (now - lastUi > 250) { lastUi = now; renderLight(); }
  }

  // ---------- tempo controls (D7) ----------
  function setTempo(bpm, downbeat, tapped) {
    if (!cur || !worker || !(bpm > 0)) return;
    cur.tempo = { bpm: Math.round(bpm * 100) / 100, downbeat: Math.max(0, downbeat), tapped };
    worker.postMessage({ type: 'tempo', ...cur.tempo });
    model = null; codeMemo.clear();
    const wasPlaying = playing, f = fileNow();
    if (wasPlaying) { if (orig) orig.stop(); app.stopCode(); play(f); }
    else analyse(horizon(f) + 4);
    save(); render();
  }
  function tap() {
    if (!cur || !playing || !orig || !orig.playing) return false;
    const f = orig.now();
    if (taps.length && f - taps[taps.length - 1] > 2) taps = [];
    taps.push(f);
    const r = tapTempo(taps);
    if (r && taps.length >= 4) { const hold = taps.slice(); setTempo(r.bpm, r.downbeat, true); taps = hold.length >= 8 ? [] : hold; app.toast(t('dcTapped', { bpm: r.bpm })); }
    else renderLight();
    return true;
  }

  // ---------- rendering ----------
  const tracksRows = () => {
    const mix = cur.settings.mix, P = model && model.bars.length ? playableAt(Math.max(0, Math.min(model.bars.length - 1, Math.floor(cycleOfFile(model, fileNow()))))) : null;
    const row = (tr, name, sub, icon) => {
      const by = tr.mute ? tr.by || 'user' : '';
      const heardNow = !tr.mute && (!mix.tracks.some(x => x.solo) || tr.solo);
      return `<div class="dc-trk${heardNow ? '' : ' silent'}" data-dc-trk="${esc(tr.id)}"><span class="dc-ti">${icon}</span><span class="dc-nm">${esc(name)}<small>${esc(sub)}</small></span><span class="dc-meter"><i data-dc-meter="${esc(tr.id)}"></i></span>
        <span class="dc-ms"><button class="mini${by === 'slider' ? ' by-slider' : ''}" data-dc-mute="${esc(tr.id)}" aria-pressed="${!!tr.mute}" title="${esc(tr.mute ? t(by === 'slider' ? 'dcLegendSlider' : 'dcLegendUser') : t('mute'))}" aria-label="${esc(`${t('mute')} · ${name}`)}">M</button><button class="mini" data-dc-solo="${esc(tr.id)}" aria-pressed="${!!tr.solo}" title="${esc(t('solo'))}" aria-label="${esc(`${t('solo')} · ${name}`)}">S</button></span></div>`;
    };
    return mix.tracks.map(tr => (tr.kind === 'orig' ? row(tr, t('dcOrig'), t('dcOrigSub'), ICON.wave) : row(tr, t('dcCode'), t('dcCodeSub', { n: P ? P.lines : 0 }), ICON.code))).join('');
  };
  const sliderNote = mix => t(mix.slider === 0 ? 'dcSliderAt0' : mix.slider === 1 ? 'dcSliderAt1' : 'dcSliderMid');
  const tempoHtml = () => {
    if (!model || !model.bpm) return `<span class="dc-tempo muted">${esc(t(playing ? 'dcListening' : 'dcNoTempo'))}</span>`;
    return `<span class="dc-tempo" title="${esc(t('dcTapTip'))}">${ICON.tap}<b id="dc-bpm">${esc(String(model.bpm))}</b> BPM${model.uncertain && !model.tapped ? ` <span class="badge dc-unc">${esc(t('dcUncertain'))}</span>` : ''}${model.tapped ? ` <span class="badge">${esc(t('dcTappedBadge'))}</span>` : ''}
      <button class="chip" data-dc-tempo="0.5" title="${esc(t('dcHalfTip'))}">½×</button><button class="chip" data-dc-tempo="2" title="${esc(t('dcDoubleTip'))}">2×</button>
      <span class="muted" id="dc-key">${esc(keyName(model.key))}</span></span>`;
  };
  const optionsHtml = o => `<details class="dc-fold" id="dc-options"${optionsOpen ? ' open' : ''}><summary>${ICON.chev}<span class="lbl">${esc(t('dcOptions'))}</span> <span class="muted small">· ${esc(t('dcOptionsSub'))}</span></summary>
      <div class="dc-opts">
        <div class="ctrl"><label class="lbl" for="dc-comments">${esc(t('commentsLbl'))}</label><select id="dc-comments" data-no-knob>${['all', 'essential', 'none'].map(k => `<option value="${k}"${o.comments === k ? ' selected' : ''}>${esc(t(`comments:${k}`))}</option>`).join('')}</select></div>
        <div class="ctrl"><label class="lbl" for="dc-fns">${esc(t('fnsLbl'))}</label><select id="dc-fns" data-no-knob>${['full', 'short', 'mixer', 'compact'].map(k => `<option value="${k}"${o.functions === k ? ' selected' : ''}>${esc(t(`fns:${k}`))}</option>`).join('')}</select></div>
        <div class="ctrl"><label class="lbl" for="dc-view">${esc(t('liveCodeView'))}</label><select id="dc-view" data-no-knob>${[['now', 'liveCodeNow'], ['compact', 'liveCodeCompact'], ['track', 'liveCodeTrack'], ['sections', 'liveCodeSections']].map(([k, l]) => `<option value="${k}"${o.view === k ? ' selected' : ''}>${esc(t(l))}</option>`).join('')}</select></div>
      </div></details>`;
  function render() {
    const head = `<div class="intro dc-intro"><div><h2 class="dc-h">${esc(t('dcHeading'))}</h2><p>${esc(t('introDecode'))}</p></div></div>`;
    const stat = status ? `<p class="dc-status ${status.kind}" role="${status.kind === 'error' ? 'alert' : 'status'}">${status.kind === 'busy' ? '<span class="growing-mark dc-grow" aria-hidden="true"></span>' : ''}${esc(status.text)}</p>` : '';
    const input = `<input type="file" id="dc-file" accept="audio/*,video/*,.flac,.opus,.m4a" hidden>`;
    if (!cur) {
      const rows = recent.map(r => `<li class="dc-rrow"><span class="dc-thumb">${ICON.wave}</span><span class="dc-rname"><b>${esc(r.title || r.fileName || '?')}</b><small>${esc(r.artist || t('dcNoArtist'))}</small></span><span class="dc-len">${esc(clock((r.durationMs || 0) / 1000))}</span><span class="badge${r.modelB ? ' ok' : ''}">${esc(t(r.modelB ? 'dcFullReady' : 'dcLiveOnly'))}</span>
        <span class="dc-racts"><button class="btn" data-dc-reopen="${esc(r.fp)}">${r.hasHandle ? `▶ ${esc(t('dcOpen'))}` : `${ICON.file} ${esc(t('dcPickAgain'))}`}</button><button class="btn icon" data-dc-remove="${esc(r.fp)}" title="${esc(t('dcRemove'))}" aria-label="${esc(t('dcRemove'))}">${ICON.x}</button></span></li>`).join('');
      root.innerHTML = `${head}${input}<div class="dc-drop" id="dc-drop" tabindex="0" role="button" aria-label="${esc(t('dcChoose'))}">${ICON.drop}<h3>${esc(t('dcDrop'))}</h3><div><button class="btn primary" id="dc-choose">${ICON.file} ${esc(t('dcChoose'))}</button></div>
        <div class="dc-fmts">${esc(t('dcFormats'))}</div><p class="note">${esc(t('dcNote'))}</p></div>${stat}
        <div class="lbl dc-rlbl">${esc(t('dcRecent'))}</div>${rows ? `<ul class="dc-recent">${rows}</ul>` : `<p class="note">${esc(t('dcNoRecent'))}</p>`}`;
      return;
    }
    const s = cur.settings, mix = s.mix;
    root.innerHTML = `${head}${input}
      <div class="card dc-panel" id="dc-drop">
        <div class="dc-filerow"><span class="dc-fname">${ICON.file} <span>${esc(cur.name)} · ${esc(clock(cur.duration))}</span></span><button class="btn" id="dc-another">${esc(t('dcAnother'))}</button></div>
        ${stat}
        <div class="dc-grid2"><label class="ctrl"><span class="lbl">${esc(t('dcTitle'))}</span><input id="dc-title" type="text" maxlength="120" value="${esc(cur.title)}" autocomplete="off" data-no-knob></label>
          <label class="ctrl"><span class="lbl">${esc(t('dcArtist'))}</span><input id="dc-artist" type="text" maxlength="120" value="${esc(cur.artist)}" autocomplete="off" data-no-knob></label>
          <button class="vswitch" id="dc-attr" aria-pressed="${!!cur.attribution}" title="${esc(t('dcAttributionTip'))}"><span class="vs-lamp" aria-hidden="true"></span><span class="vs-txt">${esc(t('dcAttribution'))}</span></button></div>
        <div class="dc-ctls">
          <div class="ctrl"><span class="lbl">${esc(t('dcTempo'))}</span><span id="dc-tempo-box">${tempoHtml()}</span></div>
          <div class="ctrl"><span class="lbl">${esc(t('dcLevel'))}</span><span class="chips dc-seg" role="radiogroup" aria-label="${esc(t('dcLevel'))}"><button class="chip" role="radio" aria-checked="true" aria-pressed="true" data-dc-level="A">${esc(t('dcLive'))}</button><button class="chip" role="radio" aria-checked="false" aria-pressed="false" disabled title="${esc(t('dcFullSoon'))}" data-dc-level="B">${esc(t('dcFullLvl'))}</button></span></div>
          <div class="ctrl"><label class="lbl" for="dc-look" title="${esc(t('dcAheadTip'))}">${esc(t('dcAhead'))}</label><select id="dc-look" data-no-knob title="${esc(t('dcAheadTip'))}">${LOOK_AHEAD.map(k => `<option value="${k}"${s.look === k ? ' selected' : ''}>${esc(t(`dcAhead:${k}`))}</option>`).join('')}</select></div>
          <div class="ctrl"><span class="lbl">${esc(t('dcSounds'))}</span><span class="chips" role="radiogroup" aria-label="${esc(t('dcSounds'))}">${SOUND_PRESETS.map(k => `<button class="chip" role="radio" data-dc-sounds="${k}" aria-pressed="${s.sounds === k}" aria-checked="${s.sounds === k}">${esc(t(k === 'ours' ? 'dcOurs' : 'dcSimple'))}</button>`).join('')}</span></div>
        </div>
        ${optionsHtml(s.options)}
        <div class="dc-acts"><button class="btn primary" id="dc-play">${esc(playing ? t('pause') : t('dcPlay'))}</button><button class="btn" id="dc-stop">${esc(t('dcStop'))}</button><span class="dc-time" id="dc-time"></span>
          <button class="btn" id="dc-compose" disabled title="${esc(t('dcSoon'))}">${ICON.open} ${esc(t('dcOpenCompose'))}</button></div>
      </div>
      <div class="card dc-panel"><div class="lbl">${esc(t('dcTracks'))}</div><div class="dc-tracks" id="dc-tracks">${tracksRows()}</div>
        <div class="dc-xf"><div class="dc-ends"><span class="${mix.slider < 0.5 ? 'on' : ''}">${esc(t('dcOrig'))}</span><span class="${mix.slider > 0.5 ? 'on' : ''}">${esc(t('dcCode'))}</span></div>
          <input type="range" id="dc-slider" min="0" max="100" step="1" value="${Math.round(mix.slider * 100)}" aria-label="${esc(t('dcSliderLbl'))}" data-no-knob>
          <p class="note" id="dc-xf-note">${esc(sliderNote(mix))}</p></div>
        <div class="dc-legend"><span class="mini by-slider" aria-pressed="true">M</span> ${esc(t('dcLegendSlider'))} <span class="mini" aria-pressed="true">M</span> ${esc(t('dcLegendUser'))}</div></div>`;
    renderLight(true);
  }
  // the parts that move while playing, without rebuilding the panel
  function renderLight(force = false) {
    if (!cur) return;
    const tb = root.querySelector('#dc-tempo-box');
    if (tb) { const h = tempoHtml(); if (force || tb.dataset.h !== h) { tb.innerHTML = h; tb.dataset.h = h; } }
    const pb = root.querySelector('#dc-play'); if (pb) { const l = playing ? t('pause') : t('dcPlay'); if (pb.textContent !== l) pb.textContent = l; }
    const tm = root.querySelector('#dc-time');
    if (tm) { const f = fileNow(), bar = model && model.barSeconds ? Math.floor(cycleOfFile(model, f)) + 1 : 0; const txt = `${clock(f)} / ${clock(cur.duration)}${bar > 0 ? ` · ${t('pbBar', { n: bar, total: decodeMeta(model).bars })}` : ''}`; if (tm.textContent !== txt) tm.textContent = txt; }
    const tr = root.querySelector('#dc-tracks');
    if (tr && (force || tr.dataset.k !== JSON.stringify([cur.settings.mix, modelSeq]))) { tr.innerHTML = tracksRows(); tr.dataset.k = JSON.stringify([cur.settings.mix, modelSeq]); }
    const mo = root.querySelector('[data-dc-meter="orig"]'), mc = root.querySelector('[data-dc-meter="code"]');
    if (mo) mo.style.width = `${Math.min(100, Math.round(peakOf(origAn) * 100))}%`;
    if (mc) mc.style.width = `${Math.min(100, Math.round(peakOf(codeAn) * 100))}%`;
    const sl = root.querySelector('#dc-slider'); if (sl && document.activeElement !== sl && +sl.value !== Math.round(cur.settings.mix.slider * 100)) sl.value = Math.round(cur.settings.mix.slider * 100);
    const nt = root.querySelector('#dc-xf-note'); if (nt) { const s = sliderNote(cur.settings.mix); if (nt.textContent !== s) nt.textContent = s; }
  }
  const setMix = action => { cur.settings.mix = mixApply(cur.settings.mix, action); audio(); renderLight(true); saveSoon(); };
  const optionChanged = () => { codeMemo.clear(); saveSoon(); };

  root.addEventListener('click', e => {
    const b = e.target.closest('button, [data-dc-reopen]');
    if (!b) { if (e.target.closest('#dc-drop.dc-drop')) pick(); return; }
    if (b.id === 'dc-choose' || b.id === 'dc-another') { pick(); return; }
    if (b.dataset.dcReopen) { reopen(b.dataset.dcReopen); return; }
    if (b.dataset.dcRemove) { store.remove(b.dataset.dcRemove).then(async () => { recent = await store.list(); app.toast(t('dcRemoved')); render(); }); return; }
    if (!cur) return;
    if (b.id === 'dc-play') { toggle(); return; }
    if (b.id === 'dc-stop') { stop(); cur.paused = 0; renderLight(); return; }
    if (b.id === 'dc-attr') { cur.attribution = !cur.attribution; b.setAttribute('aria-pressed', cur.attribution); optionChanged(); return; }
    if (b.dataset.dcTempo && model && model.bpm) { setTempo(model.bpm * +b.dataset.dcTempo, model.downbeat, model.tapped); return; }
    if (b.dataset.dcSounds) { cur.settings.sounds = b.dataset.dcSounds; root.querySelectorAll('[data-dc-sounds]').forEach(x => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); }); optionChanged(); return; }
    if (b.dataset.dcMute) { setMix({ type: 'mute', id: b.dataset.dcMute }); return; }
    if (b.dataset.dcSolo) { setMix({ type: 'solo', id: b.dataset.dcSolo }); return; }
  });
  root.addEventListener('keydown', e => { if (e.target.id === 'dc-drop' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(); } });
  root.addEventListener('toggle', e => { if (e.target.id === 'dc-options') optionsOpen = e.target.open; }, true);
  root.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'dc-file') { const f = el.files && el.files[0]; el.value = ''; if (f) openFile(f); return; }
    if (!cur) return;
    if (el.id === 'dc-look') { cur.settings.look = LOOK_AHEAD.includes(el.value) ? el.value : LOOK_AHEAD_DEFAULT; saveSoon(); return; }
    if (el.id === 'dc-comments') { cur.settings.options.comments = el.value; optionChanged(); return; }
    if (el.id === 'dc-fns') { cur.settings.options.functions = el.value; optionChanged(); return; }
    if (el.id === 'dc-view') { cur.settings.options.view = el.value; optionChanged(); return; }
  });
  root.addEventListener('input', e => {
    const el = e.target;
    if (!cur) return;
    if (el.id === 'dc-title') { cur.title = el.value.trim() || cur.title; optionChanged(); return; }
    if (el.id === 'dc-artist') { cur.artist = el.value.trim(); optionChanged(); return; }
    if (el.id === 'dc-slider') setMix({ type: 'slider', value: +el.value / 100 });
  });
  // drop a file on the tab: the drop area, or the panel of an open track
  root.addEventListener('dragover', e => { if ([...(e.dataTransfer && e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); root.classList.add('dc-over'); } });
  root.addEventListener('dragleave', e => { if (!root.contains(e.relatedTarget)) root.classList.remove('dc-over'); });
  root.addEventListener('drop', async e => {
    root.classList.remove('dc-over');
    const dt = e.dataTransfer; if (!dt || !dt.files || !dt.files.length) return;
    e.preventDefault();
    let handle = null;
    try { const it = [...dt.items].find(x => x.kind === 'file'); if (it && it.getAsFileSystemHandle) handle = await it.getAsFileSystemHandle(); } catch (err) {}
    openFile(dt.files[0], handle && handle.kind === 'file' ? handle : null);
  });

  store.list().then(list => { recent = list; if (!cur) render(); });
  render();
  const api = {
    render, frame, next, tap, toggle, play, pause, seek, stop, openFile,
    get open() { return !!cur; },
    get playing() { return playing; },
    get title() { return cur ? (cur.artist ? `${cur.title} · ${cur.artist}` : cur.title) : ''; },
    get duration() { return cur ? cur.duration : 0; },
    fileNow,
    get model() { return model; },
    // for the browser checks (tools/check-decode.cjs)
    state: () => (cur ? { bar: model && model.barSeconds ? cycleOfFile(model, fileNow()) : null, title: cur.title, artist: cur.artist, attribution: cur.attribution, settings: JSON.parse(JSON.stringify(cur.settings)), playing, startedCode, file: fileNow(), duration: cur.duration, trim: cur.trim, bars: model ? model.bars.length : 0, bpm: model ? model.bpm : 0, downbeat: model ? model.downbeat : 0, tempo: cur.tempo, levels: { orig: peakOf(origAn), code: peakOf(codeAn) }, gains: gainsOf(cur.settings.mix), sync: orig && orig.info ? { ...orig.info } : null, status } : { status, recent: recent.length }),
    store,
    // the original and the code at the same moment (two long analysers before the master stage), to measure their sync
    probe() {
      const out = app.output(), st = out && out.miskMaster;
      if (!st || !origGain) return null;
      const mk = node => { const a = st.ctx.createAnalyser(); a.fftSize = 32768; node.connect(a); return a; };
      syncTaps.o = syncTaps.o && syncTaps.o.context === st.ctx ? syncTaps.o : mk(origGain);
      if (!syncTaps.c || syncTaps.c.from !== st.codeGain) { syncTaps.c = mk(st.codeGain); syncTaps.c.from = st.codeGain; }
      const o = new Float32Array(syncTaps.o.fftSize), c = new Float32Array(syncTaps.c.fftSize);
      syncTaps.o.getFloatTimeDomainData(o); syncTaps.c.getFloatTimeDomainData(c);
      return { orig: Array.from(o), code: Array.from(c), rate: st.ctx.sampleRate, file: fileNow(), downbeat: model ? model.downbeat : 0, barSeconds: model ? model.barSeconds : 0 };
    },
  };
  const syncTaps = {};
  return api;
}
