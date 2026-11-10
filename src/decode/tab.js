// The Decode tab (track-to-code D1, D11, D12, D13): open a file, play it on the app's shared stage and write its code in
// the code column while it plays (level A). The panel holds the controls only: file, title and artist, Attribution,
// tempo and key, level, look ahead, sounds, Options, the tracks with mute and solo, the Original ↔ Code slider.
// main.js wires it: the player (Strudel's scheduler, the code column's typing) and the master stage.
import { probe, decode, fingerprint, sameFile, analysisCopy, MAX_SECONDS, ANALYSIS_RATE } from './input.js';
import { createDecodeStore, freshModel } from './store.js';
import { horizonOf, LOOK_AHEAD, LOOK_AHEAD_DEFAULT, LOCK_SECONDS, tapTempo } from './misk-analyzer.js';
import { momentSong, writeFull, withVox, withoutVox, voxGroup, voxOf, VOX_PRELUDE, keyName, SOUND_PRESETS } from './writer.js';
import { defaultMix, mixApply, gainsOf, loudnessTrim, codeBus, setGain, ORIG } from './mix.js';
import { cycleOfFile, fileOfCycle, decodeMeta, createOriginal } from './sync.js';
import { currentModel } from './model.js';
import { exportMix, mixForParts, wholeJob, fragmentJob } from './export.js';
import { liveCode } from '../live/live-code.js';
import { resolveProfile, cleanOverrides, PROFILES } from '../live/profiles.js';
import { followSong } from '../song/crescendo.js';
import { compileSong } from '../song/compile.js';
import { FUNCTION_PRESETS } from '../song/writer.js';
import { COMMENT_PRESETS } from '../song/comments.js';

const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const VIEWS = ['now', 'compact', 'track', 'sections'];
// the Options of a decoded track (D13): the Live coder's defaults (comments: title only; every technical function)
export const DEFAULT_OPTIONS = { comments: 'none', functions: 'compact', view: 'now' };
export const DEFAULT_SETTINGS = () => ({ level: 'A', look: LOOK_AHEAD_DEFAULT, sounds: 'ours', options: { ...DEFAULT_OPTIONS }, mix: defaultMix(['code']) });
// the overrides of the Live coder profile a decoded song plays with: narrator off (it would talk over the original), the
// growth "Follow the song" (D18, level B and Open in Compose), the Options of the tab
export function decodeOverrides(options = DEFAULT_OPTIONS) {
  const o = { ...DEFAULT_OPTIONS, ...(options || {}) };
  return { narrator: false, growth: 'follow', ...(COMMENT_PRESETS[o.comments] || {}), ...(FUNCTION_PRESETS[o.functions] || {}), view: VIEWS.includes(o.view) ? o.view : 'now' };
}
export const decodeControls = (options = DEFAULT_OPTIONS) => resolveProfile('switch', decodeOverrides(options));
// the configuration of a decoded song opened in Compose (D15): the Live coder profile with the tab's overrides, so the
// song grows the same and shows the same code
export const composeConfig = options => ({ profile: 'switch', live: true, options: cleanOverrides(decodeOverrides(options), PROFILES.switch) });
// the bus (orbit) of each track of a song, from its compiled code: { trackId: orbit }
export function orbitsOf(song) {
  const out = {}, byName = new Map((song.tracks || []).map(t => [t.name || t.id, t.id]));
  let cur = null;
  for (const line of compileSong(song).split('\n')) {
    const h = /^\/\/ =+ (.+?) =+$/.exec(line);
    if (h) { cur = byName.get(h[1].split(' · ')[0]) || null; continue; }
    const o = /\.orbit\((\d+)\)/.exec(line);
    if (cur && o && out[cur] === undefined) out[cur] = +o[1];
  }
  return out;
}

const ICON = {
  drop: '<svg class="dc-big" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 40v12a4 4 0 0 0 4 4h44a4 4 0 0 0 4-4V40"/><path d="M32 8v30M22 28l10 10 10-10"/></g><g stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M14 47v2M19 44v8M24 46v4M40 46v4M45 43v10M50 47v2"/></g></svg>',
  wave: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 7v2M5 4v8M8 6v4M11 3v10M14 7v2"/></g></svg>',
  code: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4"/></g></svg>',
  file: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 1.8h5.5L12.5 5v9.2H4z"/><path d="M9.5 1.8V5h3"/></g></svg>',
  tap: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="9" width="12" height="4" rx="1"/><path d="M8 2v4M5.5 4.5L8 2l2.5 2.5"/></g></svg>',
  open: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.5h4.5V7M13.5 2.5L7 9"/><path d="M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"/></g></svg>',
  x: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  drums: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4"><ellipse cx="8" cy="6" rx="5.5" ry="2"/><path d="M2.5 6v4.5c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V6"/></g></svg>',
  bass: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 9c1.5 0 1.5-4 3-4s1.5 6 3 6 1.5-6 3-6 1.5 4 3 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  chords: '<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor"><ellipse cx="5" cy="12" rx="2" ry="1.5"/><ellipse cx="11" cy="10" rx="2" ry="1.5"/></g><g stroke="currentColor" stroke-width="1.4" fill="none"><path d="M6.8 12V4l6-2v8M6.8 6.5l6-2"/></g></svg>',
  chev: '<svg class="dc-ico dc-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// app: { t, esc, toast, ctx(), output(), play({ cycle, sg, code }) → { time }, stopCode(), mode(), lang(), cols(),
//   files(), widgets(), source(name, level), stopOthers(), pickerOpen, outCombo(buttonHtml), exportJob(), exportDecode(kind),
//   openFragments(source, anchor) }
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
  // level B (D5, D13): the stored or new whole-file model, the analysis running in a worker of its own, the code the
  // player plays now ('A' or 'B')
  let modelB = null, modelBSeq = 0, full = null, fullSeq = 0, playLevel = 'A', bMemo = null;
  const orbitAn = new Map(), orbitGains = new Set();

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
    if (full) { full.w.terminate(); full = null; }
    model = null; modelB = null; bMemo = null; codeMemo.clear();
    cur = {
      file, name: file.name, fp, info, buffer, duration: buffer.duration, handle: handle || (match && rec.handle) || null,
      title: match ? rec.title : info.title, artist: match ? rec.artist : info.artist, attribution: match ? rec.attribution !== false : true,
      settings: match && rec.settings ? { ...DEFAULT_SETTINGS(), ...rec.settings, options: { ...DEFAULT_OPTIONS, ...(rec.settings.options || {}) } } : DEFAULT_SETTINGS(),
      tempo: match && rec.tempo ? rec.tempo : null, video: !!info.video,
      trim: loudnessTrim(buffer.getChannelData(0), buffer.sampleRate),
    };
    if (match && freshModel(rec.modelA)) model = rec.modelA;
    // a stored analysis of an older analyser is made again, and the tab says so (decode-refine: Stored analysis)
    const old = match && ((rec.modelA && !freshModel(rec.modelA)) || (rec.modelB && !freshModel(rec.modelB)));
    // a track with a stored level B analysis opens in Full (owner answer 1)
    if (match && freshModel(rec.modelB) && rec.modelB.level === 'B') { modelB = rec.modelB; modelBSeq++; }
    setLevel(modelB ? 'B' : 'A', { quiet: true });
    ensureWorker();
    const pcm = await analysisCopy(buffer);
    worker.postMessage({ type: 'load', pcm, rate: ANALYSIS_RATE }, [pcm.buffer]);
    workerFor = cur;
    // the stored or tapped tempo goes to the analyser first, so the bars fall where they fell before
    if (cur.tempo) worker.postMessage({ type: 'tempo', bpm: cur.tempo.bpm, downbeat: cur.tempo.downbeat, tapped: !!cur.tempo.tapped });
    else if (model && model.bpm) worker.postMessage({ type: 'tempo', bpm: model.bpm, downbeat: model.downbeat, tapped: false });
    status = old ? { kind: 'note', text: t('dcAnalysedAgain') } : match && model ? { kind: 'note', text: t('dcStored') } : cur.video ? { kind: 'note', text: t('dcVideoNote') } : null;
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
      settings: cur.settings, tempo: cur.tempo || null, modelA: model && model.bpm ? model : null, modelB: modelB || null, version: model ? model.version : null, video: cur.video,
      ...(cur.handle ? { handle: cur.handle } : {}),
    };
    const old = await store.get(cur.fp.key);
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
    // level A (D8): the first window up to the horizon is analysed before the sound starts; level B knows every bar
    if (level() !== 'B') {
      const m = await analyse(Math.max(horizon(f), (model && model.bpm ? 0 : LOCK_SECONDS + 0.5)) + 0.1, true);
      if (m) takeModel(m);
    }
    if (!playing) return;
    if (level() === 'B' || (model && model.barSeconds > 0)) await startCode(f);
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
    if (!cur || pendingStart) return;
    if (level() === 'B' ? !(modelB && modelB.barSeconds > 0) : !(model && model.barSeconds > 0)) return;
    startedCode = true;
    pendingStart = (async () => {
      ensureAudio();
      const at = f ?? (orig && orig.playing ? orig.now() + 0.15 : 0), B = level() === 'B';
      // level B plays on its own whole-file grid (D7); level A on the grid of the bars heard
      const M = B ? modelB : model, c = cycleOfFile(M, at), bar = Math.floor(c);
      let sg, code;
      if (B) { sg = playableB(); code = bar < 0 ? sg.silent : sg.codeAt(bar); }
      else { const P = playableAt(Math.min(bar, knownBar(at))); sg = P.sg; code = P.code; }
      playLevel = B ? 'B' : 'A';
      const r = await app.play({ cycle: c, sg, code, title: cur.title, level: t(B ? 'dcFullLvl' : 'dcLive') });
      if (!playing || !r || !Number.isFinite(r.time)) return;
      orig.start(r.time, fileOfCycle(M, c));
    })().finally(() => { pendingStart = null; });
    return pendingStart;
  }
  function stop({ keep = false } = {}) {
    if (saveT) { clearTimeout(saveT); saveT = 0; save(); }
    resetOrbits();
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
    const g = cur ? gainsOf(cur.settings.mix) : { [ORIG]: 0, code: 1 }, ids = codeIds();
    // the code's bus: the slider's gain while any code track is heard
    setGain(st.codeGain.gain, ours && cur ? Math.max(0, ...ids.map(id => g[id] || 0)) : 1, ctx);
    if (origGain) setGain(origGain.gain, cur ? g[ORIG] * cur.trim : 0, ctx);
    // level B (D11): one bus per decoded part, its orbit's output at 1 when the track is heard and 0 when not (the
    // analysers sit before it, so the stage and the lit notes still follow a muted part)
    const sg = ours && cur && playLevel === 'B' && bMemo ? bMemo.sg : null, C = sg && app.controller();
    if (C && C.nodes) for (const id of ids) { const o = sg.orbits[id], node = o !== undefined ? C.nodes[o] : null; if (node && node.output) { setGain(node.output.gain, g[id] > 0 ? 1 : 0, ctx); orbitGains.add(o); } }
    else resetOrbits();
  }
  const codeIds = () => (cur ? cur.settings.mix.tracks.filter(x => x.kind === 'code').map(x => x.id) : []);
  // the orbits set by level B back at 1 (another player, level A, stop)
  function resetOrbits() {
    if (!orbitGains.size) return;
    const C = app.controller();
    for (const o of orbitGains) { const node = C && C.nodes ? C.nodes[o] : null; if (node && node.output) { try { node.output.gain.cancelScheduledValues(0); } catch (e) {} node.output.gain.value = 1; } }
    orbitGains.clear();
  }
  // a level B track's meter: an analyser after its orbit's gain
  function orbitPeak(id) {
    const sg = bMemo && bMemo.sg, C = app.controller(), o = sg ? sg.orbits[id] : undefined, node = o !== undefined && C && C.nodes ? C.nodes[o] : null;
    if (!node || !node.output) return 0;
    let an = orbitAn.get(o);
    if (!an || an.from !== node.output) { an = node.output.context.createAnalyser(); an.fftSize = 1024; node.output.connect(an); an.from = node.output; orbitAn.set(o, an); }
    return peakOf(an);
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
    const shown = withVox(lc.codeAt(0), model && at >= 0 ? voxGroup(model, at, { seed: seedOf(), level: 'A' }) : ''), meta = decodeMeta(model || { duration: cur.duration, downbeat: 0, barSeconds: 2, bpm: 120 });
    const sg = {
      id: `decode:${cur.fp ? cur.fp.key : 'x'}`, title: cur.title, kind: 'decode', code: shown, meta, codeAt: null, codeKeep: null,
      run: c => { const s = withoutVox(c); return lc.run ? lc.run(s) : s; },
      standalone: c => copyOut(c, lc),
      buses: lc.buses, fns: lc.fns, build: null, ctl: C, doc: null, decode: true,
    };
    const out = { at, code: shown, sg, lines: shown.split('\n').filter(l => /^\s*[_S]?\$:/.test(l)).length };
    if (codeMemo.size > 400) codeMemo.clear();
    codeMemo.set(key, out);
    return out;
  }
  // the top line's group (decode-refine D6): drawn from the file's fingerprint; the code copied out of the app keeps it,
  // with its two helpers defined as silence, after the code the player plays
  const seedOf = () => (cur && cur.fp ? cur.fp.key : cur ? cur.name : '');
  function copyOut(c, lc) {
    const g = voxOf(c), x = withoutVox(c), out = lc.standalone ? lc.standalone(x) : x;
    return g ? `${VOX_PRELUDE}${out.replace(/\s+$/, '')}\n\n${g}\n` : out;
  }
  // ---------- level B (D5, D9, D13, D18) ----------
  const level = () => (cur && cur.settings.level === 'B' && modelB ? 'B' : 'A');
  // the song of level B (the writer's), as Open in Compose saves it
  const songB = (id = 'decoded') => writeFull(modelB, { id, title: cur.title, artist: cur.artist, attribution: cur.attribution, sounds: cur.settings.sounds });
  // the player's song of level B: the written song with the growth "Follow the song" in the Live coder profile, each
  // change typed before its bar by the player's live build (D13); the code shown ends with the vocals placeholder
  function playableB() {
    const key = JSON.stringify([modelBSeq, cur.title, cur.artist, cur.attribution, cur.settings.sounds, cur.settings.options]);
    if (bMemo && bMemo.key === key) return bMemo.sg;
    const song = songB(), C = ctl(), lc = liveCode(followSong(song), C, { lang: app.lang, files: app.files, cols: app.cols, widgets: app.widgets });
    const codeAt = (bar, keep) => withVox(lc.codeAt(Math.max(0, bar), keep), voxGroup(modelB, Math.max(0, bar), { seed: seedOf(), level: 'B' }));
    const first = lc.codeAt(0), head = first.split('\n').filter(l => /^\/\/ coding-misk|^setcpm\(/.test(l)).join('\n');
    const sg = {
      id: `decode:${cur.fp ? cur.fp.key : 'x'}:B`, title: cur.title, kind: 'decode', code: codeAt(0), meta: decodeMeta(modelB), codeAt, codeKeep: null,
      run: c => { const x = withoutVox(c); return lc.run ? lc.run(x) : x; },
      standalone: c => copyOut(c, lc),
      buses: lc.buses, fns: lc.fns, build: lc.build, ctl: C, doc: lc.build, paste: lc.paste, earlier: lc.earlier, decode: true, level: 'B',
      // before the first downbeat: the title and the tempo, no part yet
      silent: `${head}\n\n$: silence`,
      orbits: orbitsOf(song), tracks: song.tracks.map(x => ({ id: x.id, name: x.name })), sections: song.sections,
    };
    bMemo = { key, sg };
    return sg;
  }
  // the code tracks of a level: one in level A, one per decoded part in level B (D11)
  const levelTracks = lv => (lv === 'B' && modelB ? playableB().tracks.map(x => x.id) : ['code']);
  function setLevel(lv, { quiet = false } = {}) {
    if (!cur) return;
    cur.settings.level = lv === 'B' && modelB ? 'B' : 'A';
    cur.settings.mix = mixApply(cur.settings.mix, { type: 'tracks', codeIds: levelTracks(cur.settings.level) });
    if (quiet) return;
    saveSoon();
    // playing: the other level takes over at the next bar with that bar's code whole (playback spec: Level switch)
    if (playing && startedCode) {
      const M = cur.settings.level === 'B' ? modelB : model;
      if (M && M.barSeconds > 0) {
        const at = Math.floor(cycleOfFile(M, fileNow())) + 1;
        // (the buses of level B follow the code that plays: they change with it, on the bar)
        const lv = cur.settings.level, done = () => { playLevel = lv; };
        if (lv === 'B') { const sg = playableB(); app.swap({ at, sg, code: sg.codeAt(at), level: t('dcFullLvl'), done }); }
        else { const P = playableAt(Math.min(at, knownBar(fileNow()))); app.swap({ at, sg: P.sg, code: P.code, level: t('dcLive'), done }); }
      }
    }
    render();
  }
  // level B runs in a worker of its own (cancel ends it; level A goes on); then: 'switch' (to Full), 'compose' (Open in
  // Compose) or null (stored only)
  async function runFull(then = 'switch') {
    if (!cur || full) { if (full && then) full.then = then; return; }
    const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }), id = ++fullSeq, track = cur;
    full = { w, id, f: 0, stage: 'frames', then, t0: performance.now() };
    status = null;
    w.onmessage = e => {
      const m = e.data || {};
      if (!full || full.id !== id || cur !== track) { w.terminate(); return; }
      if (m.type === 'progress') { full.f = m.f; full.stage = m.stage; renderLight(); return; }
      if (m.type === 'error') { w.terminate(); full = null; status = { kind: 'error', text: t('dcFullFailed') }; render(); return; }
      if (m.type !== 'full') return;
      w.terminate();
      const job = full; full = null;
      modelB = m.model; modelBSeq++; bMemo = null;
      status = { kind: 'note', text: t(m.model.engines && m.model.engines.chords === 'essentia.js' ? 'dcFullReady2' : 'dcFullOwn') };
      save();
      if (job.then === 'compose') { openCompose(); return; }
      // an export waited for the analysis (D16): the track stays in the level it was in
      if (job.then === 'export') { render(); const k = pendingExport; pendingExport = null; if (k) requestExport(k.kind, k.anchor); return; }
      if (job.then === 'switch') setLevel('B'); else render();
      app.toast(t('dcFullDone', { s: ((performance.now() - job.t0) / 1000).toFixed(1) }));
    };
    w.onerror = () => { if (full && full.id === id) { full = null; status = { kind: 'error', text: t('dcFullFailed') }; render(); } };
    render();
    const pcm = await analysisCopy(track.buffer);
    if (!full || full.id !== id) return;
    w.postMessage({ type: 'load', pcm, rate: ANALYSIS_RATE }, [pcm.buffer]);
    w.postMessage({ type: 'all', id, tempo: track.tempo || null, essentia: !globalThis.codingMiskNoEssentia });
  }
  // Export and Fragments (D16): both write the Full song, the whole file; the analysis runs first when it is missing, then the
  // export starts by itself. kind: 'out' (audio or video as the display says) or 'frag'
  let pendingExport = null;
  function requestExport(kind, anchor = null) {
    if (!cur) { app.toast(t('dcExportNone')); return; }
    if (app.exportJob()) { if (kind === 'out') app.exportDecode('cancel'); return; }
    if (!modelB) { pendingExport = { kind, anchor }; if (full) full.then = 'export'; else runFull('export'); status = { kind: 'note', text: t('dcExportFull') }; render(); return; }
    if (kind === 'frag') app.openFragments('decode', root.querySelector('#dc-frag') || anchor); else app.exportDecode('out');
  }
  // the Export button shows the progress of the export running, and a tap on it then cancels
  function exportLabel() {
    const eb = root.querySelector('#dc-export');
    if (!eb) return;
    const j = app.exportJob(), l = j ? (j.label || t(`fast:${j.phase}`, { p: Math.round(j.progress * 100) })) : t('exportWav');
    if (eb.textContent !== l) eb.textContent = l;
    eb.classList.toggle('rec', !!j);
  }
  // a real time export plays the Full code: the track switches to Full with the mix of its one code track given to every part
  function fullForExport() {
    if (!cur || !modelB || level() === 'B') return;
    const mix = mixForParts(cur.settings.mix, levelTracks('B'));
    setLevel('B', { quiet: true });
    cur.settings.mix = mix;
    render();
  }
  // what an export of this track needs (D16): the Full song as the player plays it, its mix as heard now (the original's
  // gain, the code bus, the muted parts), and the original's samples for any window, mixed in the render page
  function exportSource() {
    if (!cur || !modelB) return null;
    const sg = playableB(), ids = sg.tracks.map(x => x.id), mix = exportMix(mixForParts(cur.settings.mix, ids), cur.trim, sg.orbits);
    const parts = { channels: [0, 1].slice(0, cur.buffer.numberOfChannels).map(i => cur.buffer.getChannelData(i)), rate: cur.buffer.sampleRate, downbeat: modelB.downbeat, duration: cur.duration, mix };
    return {
      sg, song: songB(), title: cur.title, artist: cur.artist, key: cur.fp ? cur.fp.key : 'decode', mix,
      cover: { title: cur.title, artist: cur.artist, attribution: cur.attribution, original: mix.hasOriginal },
      seconds: cur.duration, whole: () => wholeJob(parts), fragment: () => fragmentJob(parts),
    };
  }
  // cancel (analysis spec: Cancel): the worker ends, nothing is stored for level B, level A stays
  function cancelFull() {
    if (!full) return;
    full.w.terminate(); full = null;
    status = { kind: 'note', text: t('dcFullCancelled') };
    render();
  }
  // Open in Compose (D15): the level B song saved as a song of the user's, with the Live coder profile, "Follow the
  // song", narrator off and the cover; level B runs first when missing
  function openCompose() {
    if (!cur) return;
    if (!modelB) { runFull('compose'); return; }
    const song = { ...songB(`u-${Date.now()}`), config: composeConfig(cur.settings.options) };
    stop();
    app.openInCompose(song);
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
    if (playLevel !== 'B' && (!model || (model.analysedTo || 0) < Math.min(cur.duration, want) - 0.01) && (!inflight || performance.now() - inflight > 3000)) { inflight = performance.now(); analyse(want + 0.5); }
    // Live stays the default; after 8 bars the tab proposes Full once per track (decode-refine)
    if (playLevel === 'A' && !modelB && !full && !cur.fullHinted && model && model.barSeconds && cycleOfFile(model, f ?? 0) >= 8) { cur.fullHinted = true; if (!status || status.kind !== 'error') status = { kind: 'note', text: t('dcFullHint') }; render(); }
    const now = performance.now();
    if (now - lastUi > 250) { lastUi = now; renderLight(); }
  }

  // ---------- tempo controls (D7) ----------
  // bpm null: back to the tempo misk-analyzer finds (the Auto button)
  function setTempo(bpm, downbeat, tapped) {
    if (!cur || !worker || (bpm !== null && !(bpm > 0))) return;
    if (bpm === null) { cur.tempo = null; worker.postMessage({ type: 'auto' }); }
    else { cur.tempo = { bpm: Math.round(bpm * 100) / 100, downbeat: Math.max(0, downbeat), tapped }; worker.postMessage({ type: 'tempo', ...cur.tempo }); }
    model = null; codeMemo.clear();
    // a new tempo makes level B's grid old: level A plays, level B runs again with the new tempo
    const wasB = level() === 'B';
    if (modelB) { modelB = null; modelBSeq++; bMemo = null; setLevel('A', { quiet: true }); }
    const wasPlaying = playing, f = fileNow();
    if (wasPlaying) { if (orig) orig.stop(); app.stopCode(); play(f); }
    else analyse(Math.max(horizon(f) + 4, LOCK_SECONDS + 0.5));
    save(); render();
    if (wasB) runFull('switch');
  }
  function tap() {
    if (!cur || !playing || !orig || !orig.playing) return false;
    const f = orig.now();
    if (taps.length && f - taps[taps.length - 1] > 2) taps = [];
    taps.push(f);
    const r = tapTempo(taps);
    if (r && taps.length >= 4) { const hold = taps.slice(); setTempo(r.bpm, r.downbeat, true); taps = hold.length >= 8 ? [] : hold; app.toast(t('dcTapped', { bpm: r.bpm })); }
    renderLight();
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
    // level B: one row per decoded part (drums, bass, chords)
    const part = tr => { const x = level() === 'B' && bMemo ? bMemo.sg.tracks.find(y => y.id === tr.id) : null; return x ? row(tr, t(`dcPart:${tr.id}`), t('dcPartSub'), ICON[tr.id] || ICON.code) : row(tr, t('dcCode'), t('dcCodeSub', { n: P ? P.lines : 0 }), ICON.code); };
    return mix.tracks.map(tr => (tr.kind === 'orig' ? row(tr, t('dcOrig'), t('dcOrigSub'), ICON.wave) : part(tr))).join('');
  };
  // the model whose grid the tab shows: level B's in Full, else level A's
  const shownModel = () => (level() === 'B' ? modelB : model);
  const engineName = id => (id === 'essentia.js' ? 'Essentia.js' : id === 'tapped' ? t('dcTappedBadge') : id === 'picked' ? t('dcPicked') : 'misk-analyzer');
  // level B: where each measure came from (D5)
  const enginesHtml = () => { const e = modelB && modelB.engines; return level() === 'B' && e ? `<p class="note dc-engines" id="dc-engines">${esc(t('dcEngines', { tempo: engineName(e.tempo), key: engineName(e.key), chords: engineName(e.chords) }))}</p>` : ''; };
  // the level switch: Live and Full; Full shows the growing mark and the progress while level B runs, with Cancel
  const levelHtml = () => {
    const lv = level(), run = full ? `<span class="dc-full-run" id="dc-full-run"><span id="dc-full-pct">${esc(fullText())}</span><button class="btn" id="dc-full-cancel">${esc(t('dcCancel'))}</button></span>` : '';
    return `<span class="chips dc-seg" role="radiogroup" aria-label="${esc(t('dcLevel'))}"><button class="chip" role="radio" aria-checked="${lv === 'A'}" aria-pressed="${lv === 'A'}" data-dc-level="A" title="${esc(t('dcLiveTip'))}">${esc(t('dcLive'))}</button><button class="chip${full ? ' growing' : ''}" role="radio" aria-checked="${lv === 'B'}" aria-pressed="${lv === 'B'}" data-dc-level="B" title="${esc(t(modelB ? 'dcFullTip' : 'dcFullRunTip'))}">${full ? '<span class="growing-mark dc-grow" aria-hidden="true"></span>' : ''}${esc(t('dcFullLvl'))}</button></span>${run}`;
  };
  const STAGES = { frames: 'dcStage:frames', tempo: 'dcStage:tempo', bars: 'dcStage:bars', harmony: 'dcStage:harmony', sections: 'dcStage:sections', done: 'dcStage:sections' };
  const fullText = () => (full ? t('dcFullProgress', { pct: Math.round((full.f || 0) * 100), stage: t(STAGES[full.stage] || 'dcStage:frames') }) : '');
  // level B: the sections of the original, the one playing lit; a click seeks to its start
  const sectionsHtml = () => {
    if (level() !== 'B' || !bMemo) return '';
    let a = 0;
    const list = bMemo.sg.sections.map(x => { const from = a; a += x.bars; return `<button class="dc-sec" data-dc-sec="${from}" data-dc-sec-to="${a}" style="flex-grow:${x.bars}" title="${esc(t('dcSecTip', { name: x.name, from: from + 1, to: a }))}"><b>${esc(x.name)}</b><small>${from + 1}-${a}</small></button>`; }).join('');
    return `<div class="dc-secs-wrap"><div class="lbl">${esc(t('dcSections'))}</div><div class="dc-secs" id="dc-secs">${list}</div></div>`;
  };
  const sliderNote = mix => t(mix.slider === 0 ? 'dcSliderAt0' : mix.slider === 1 ? 'dcSliderAt1' : 'dcSliderMid');
  // the Tap button (decode-refine D8) with the taps of the series so far, and Auto after a tapped or picked tempo
  const tapHtml = () => `<button class="chip dc-tap" id="dc-tap" title="${esc(t('dcTapBtnTip'))}"${playing ? '' : ' disabled'}>${esc(t('dcTapBtn'))}${taps.length ? ` <b class="dc-taps">${taps.length < 4 ? `${taps.length}/4` : taps.length}</b>` : ''}</button>${cur.tempo ? `<button class="chip dc-auto" id="dc-auto" title="${esc(t('dcAutoTip'))}">${esc(t('dcAuto'))}</button>` : ''}`;
  const tempoHtml = () => {
    const M = shownModel();
    if (!M || !M.bpm) return `<span class="dc-tempo muted">${esc(t(playing ? 'dcListening' : 'dcNoTempo'))}${playing ? ` ${tapHtml()}` : ''}</span>`;
    return `<span class="dc-tempo" title="${esc(t('dcTapTip'))}">${ICON.tap}<b id="dc-bpm">${esc(String(Math.round(M.bpm * 100) / 100))}</b> BPM${M.uncertain && !M.tapped ? ` <span class="badge dc-unc">${esc(t('dcUncertain'))}</span>` : ''}${M.tapped ? ` <span class="badge">${esc(t('dcTappedBadge'))}</span>` : ''}
      <button class="chip" data-dc-tempo="0.5" title="${esc(t('dcHalfTip'))}">½×</button><button class="chip" data-dc-tempo="2" title="${esc(t('dcDoubleTip'))}">2×</button>${tapHtml()}
      <span class="muted" id="dc-key">${esc(keyName(M.key))}</span></span>`;
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
          <div class="ctrl"><span class="lbl">${esc(t('dcLevel'))}</span><span class="dc-level" id="dc-level">${levelHtml()}</span></div>
          <div class="ctrl"><label class="lbl" for="dc-look" title="${esc(t(level() === 'B' ? 'dcAheadOff' : 'dcAheadTip'))}">${esc(t('dcAhead'))}</label><select id="dc-look" data-no-knob${level() === 'B' ? ' disabled' : ''} title="${esc(t(level() === 'B' ? 'dcAheadOff' : 'dcAheadTip'))}">${LOOK_AHEAD.map(k => `<option value="${k}"${s.look === k ? ' selected' : ''}>${esc(t(`dcAhead:${k}`))}</option>`).join('')}</select></div>
          <div class="ctrl"><span class="lbl">${esc(t('dcSounds'))}</span><span class="chips" role="radiogroup" aria-label="${esc(t('dcSounds'))}">${SOUND_PRESETS.map(k => `<button class="chip" role="radio" data-dc-sounds="${k}" aria-pressed="${s.sounds === k}" aria-checked="${s.sounds === k}">${esc(t(k === 'ours' ? 'dcOurs' : 'dcSimple'))}</button>`).join('')}</span></div>
        </div>
        ${enginesHtml()}
        ${optionsHtml(s.options)}
        <div class="dc-acts"><button class="btn primary" id="dc-play">${esc(playing ? t('pause') : t('dcPlay'))}</button><button class="btn" id="dc-stop">${esc(t('dcStop'))}</button><span class="dc-time" id="dc-time"></span>
          <button class="btn" id="dc-compose" title="${esc(t(modelB ? 'dcComposeTip' : 'dcComposeRunTip'))}">${full && full.then === 'compose' ? '<span class="growing-mark dc-grow" aria-hidden="true"></span>' : ICON.open} ${esc(t('dcOpenCompose'))}</button></div>
        ${sectionsHtml()}
      </div>
      <div class="card dc-panel"><div class="lbl">${esc(t('dcTracks'))}</div><div class="dc-tracks" id="dc-tracks">${tracksRows()}</div>
        <div class="dc-xf"><div class="dc-ends"><span class="${mix.slider < 0.5 ? 'on' : ''}">${esc(t('dcOrig'))}</span><span class="${mix.slider > 0.5 ? 'on' : ''}">${esc(t('dcCode'))}</span></div>
          <input type="range" id="dc-slider" min="0" max="100" step="1" value="${Math.round(mix.slider * 100)}" aria-label="${esc(t('dcSliderLbl'))}" data-no-knob>
          <p class="note" id="dc-xf-note">${esc(sliderNote(mix))}</p></div>
        <div class="dc-legend"><span class="mini by-slider" aria-pressed="true">M</span> ${esc(t('dcLegendSlider'))} <span class="mini" aria-pressed="true">M</span> ${esc(t('dcLegendUser'))}</div></div>
      <div class="card dc-panel dc-export" id="dc-export-card"><div class="lbl">${esc(t('dcExport'))}</div>
        <div class="dc-acts">${app.outCombo(`<button class="btn" id="dc-export" title="${esc(t('dcExportTip'))}">${esc(t('exportWav'))}</button>`)}<button class="btn" id="dc-frag" title="${esc(t('dcFragTip'))}">${esc(t('fragBtn'))}</button></div>
        <p class="note">${esc(t('dcExportNote'))}</p></div>`;
    renderLight(true);
  }
  // the parts that move while playing, without rebuilding the panel
  function renderLight(force = false) {
    if (!cur) return;
    const tb = root.querySelector('#dc-tempo-box');
    if (tb) { const h = tempoHtml(); if (force || tb.dataset.h !== h) { tb.innerHTML = h; tb.dataset.h = h; } }
    exportLabel();
    const pb = root.querySelector('#dc-play'); if (pb) { const l = playing ? t('pause') : t('dcPlay'); if (pb.textContent !== l) pb.textContent = l; }
    const tm = root.querySelector('#dc-time');
    const M = shownModel();
    if (tm) { const f = fileNow(), bar = M && M.barSeconds ? Math.floor(cycleOfFile(M, f)) + 1 : 0; const txt = `${clock(f)} / ${clock(cur.duration)}${bar > 0 ? ` · ${t('pbBar', { n: bar, total: decodeMeta(M).bars })}` : ''}`; if (tm.textContent !== txt) tm.textContent = txt; }
    const tr = root.querySelector('#dc-tracks'), tk = JSON.stringify([cur.settings.mix, modelSeq, modelBSeq, level()]);
    if (tr && (force || tr.dataset.k !== tk)) { tr.innerHTML = tracksRows(); tr.dataset.k = tk; }
    const mo = root.querySelector('[data-dc-meter="orig"]');
    if (mo) mo.style.width = `${Math.min(100, Math.round(peakOf(origAn) * 100))}%`;
    for (const id of codeIds()) { const el = root.querySelector(`[data-dc-meter="${id}"]`); if (el) el.style.width = `${Math.min(100, Math.round((playLevel === 'B' && id !== 'code' ? orbitPeak(id) : peakOf(codeAn)) * 100))}%`; }
    // level B running: the progress; the section playing lit
    const pct = root.querySelector('#dc-full-pct'); if (pct) { const x = fullText(); if (pct.textContent !== x) pct.textContent = x; }
    const secs = root.querySelector('#dc-secs');
    if (secs && M && M.barSeconds) { const bar = Math.floor(cycleOfFile(M, fileNow())); secs.querySelectorAll('[data-dc-sec]').forEach(el => { const on = bar >= +el.dataset.dcSec && bar < +el.dataset.dcSecTo; if (el.classList.contains('on') !== on) el.classList.toggle('on', on); }); }
    const sl = root.querySelector('#dc-slider'); if (sl && document.activeElement !== sl && +sl.value !== Math.round(cur.settings.mix.slider * 100)) sl.value = Math.round(cur.settings.mix.slider * 100);
    const nt = root.querySelector('#dc-xf-note'); if (nt) { const s = sliderNote(cur.settings.mix); if (nt.textContent !== s) nt.textContent = s; }
  }
  const setMix = action => { cur.settings.mix = mixApply(cur.settings.mix, action); audio(); renderLight(true); saveSoon(); };
  // an option, the sounds, the title: level A takes it from the next edit; level B's code plays it from the next bar
  const optionChanged = () => {
    codeMemo.clear(); saveSoon();
    if (playing && startedCode && playLevel === 'B' && modelB) { const at = Math.floor(cycleOfFile(modelB, fileNow())) + 1, sg = playableB(); app.swap({ at, sg, code: sg.codeAt(at), level: t('dcFullLvl') }); }
  };

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
    // the Tap button taps on pointerdown (below); a click from the keyboard (Enter, Space) taps here
    if (b.id === 'dc-tap') { if (e.detail === 0) tap(); return; }
    if (b.id === 'dc-auto') { setTempo(null); app.toast(t('dcAutoDone')); return; }
    if (b.dataset.dcTempo && shownModel() && shownModel().bpm) { const M = shownModel(); setTempo(M.bpm * +b.dataset.dcTempo, M.downbeat, !!M.tapped); return; }
    if (b.dataset.dcLevel) { if (b.dataset.dcLevel === 'B' && !modelB) runFull('switch'); else setLevel(b.dataset.dcLevel); return; }
    if (b.id === 'dc-full-cancel') { cancelFull(); return; }
    if (b.id === 'dc-compose') { openCompose(); return; }
    if (b.id === 'dc-export') { requestExport('out'); return; }
    if (b.id === 'dc-frag') { requestExport('frag', b); return; }
    if (b.dataset.dcSec !== undefined && modelB) { const f = Math.min(cur.duration - 0.1, fileOfCycle(modelB, +b.dataset.dcSec)); seek(f); return; }
    if (b.dataset.dcSounds) { cur.settings.sounds = b.dataset.dcSounds; root.querySelectorAll('[data-dc-sounds]').forEach(x => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); }); optionChanged(); return; }
    if (b.dataset.dcMute) { setMix({ type: 'mute', id: b.dataset.dcMute }); return; }
    if (b.dataset.dcSolo) { setMix({ type: 'solo', id: b.dataset.dcSolo }); return; }
  });
  root.addEventListener('pointerdown', e => { const tb = e.button === 0 && e.target.closest('#dc-tap'); if (tb && !tb.disabled) { e.preventDefault(); tap(); } });
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
    // the file and the handle's promise before any await: after it the browser empties the drop's data
    const file = dt.files[0];
    let handle = null, asked = null;
    try { const it = [...dt.items].find(x => x.kind === 'file'); if (it && it.getAsFileSystemHandle) asked = it.getAsFileSystemHandle(); } catch (err) {}
    try { if (asked) handle = await asked; } catch (err) {}
    openFile(file, handle && handle.kind === 'file' ? handle : null);
  });

  store.list().then(list => { recent = list; if (!cur) render(); });
  render();
  const api = {
    render, frame, next, tap, toggle, play, pause, seek, stop, openFile, runFull, cancelFull, setLevel, openCompose, exportSource, requestExport, exportLabel, fullForExport,
    get level() { return level(); },
    get modelB() { return modelB; },
    // the code of level B at a bar, as the player shows it (Open in Compose must show the same, D15)
    codeB: bar => (modelB ? playableB().codeAt(bar) : null),
    get open() { return !!cur; },
    get playing() { return playing; },
    get title() { return cur ? (cur.artist ? `${cur.title} · ${cur.artist}` : cur.title) : ''; },
    get duration() { return cur ? cur.duration : 0; },
    fileNow,
    get model() { return model; },
    // for the browser checks (tools/check-decode.cjs)
    state: () => (cur ? { bar: shownModel() && shownModel().barSeconds ? cycleOfFile(shownModel(), fileNow()) : null, title: cur.title, artist: cur.artist, attribution: cur.attribution, settings: JSON.parse(JSON.stringify(cur.settings)), playing, startedCode, file: fileNow(), duration: cur.duration, trim: cur.trim, bars: model ? model.bars.length : 0, bpm: model ? model.bpm : 0, downbeat: model ? model.downbeat : 0, tempo: cur.tempo, levels: { orig: peakOf(origAn), code: peakOf(codeAn), ...Object.fromEntries(playLevel === 'B' ? codeIds().map(id => [id, orbitPeak(id)]) : []) }, gains: gainsOf(cur.settings.mix), level: level(), playLevel, full: full ? { f: full.f, stage: full.stage, then: full.then } : null, modelB: modelB ? { bpm: modelB.bpm, downbeat: modelB.downbeat, bars: modelB.bars.length, sections: modelB.sections, ending: modelB.ending, engines: modelB.engines, key: modelB.key, ms: modelB.ms } : null, orbits: bMemo ? bMemo.sg.orbits : null, sync: orig && orig.info ? { ...orig.info } : null, status } : { status, recent: recent.length }),
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
