// The fast export's render page (#8), loaded in a hidden iframe: its own copy of Strudel (the same sample banks as
// the editor, plus the app's own samples) renders a song into an OfflineAudioContext, apart from the live audio.
// Superdough keeps one audio context and reuses audio nodes, so a fresh page renders each export.
// Messages from the app: { render: job }. To the app: { ready }, { progress, phase }, { done, channels, sampleRate, onsets }, { error }.
// job: { segments: [{ from, to, code, run?, buses?, fns? }] in bars, bpm: per bar, from / to: the window in seconds (a block of a long
// export), tail: seconds after it, keepFrom: onsets before it belong to the block before, sampleRate, gain: the master level,
// push: the style's push into the master limiter (level-headroom, 1 for none) }
import { repl, register as strudelRegister, Pattern, noteToMidi } from '@strudel/core';
import { transpiler } from '@strudel/transpiler';
import { samples, superdough, setAudioContext, setSuperdoughAudioController, getSuperdoughAudioController, initAudio, registerSound, soundMap } from '@strudel/webaudio';
import { guardDecode, guardSounds, createRegister } from '../sounds/sound-guard.js';
import soundfonts from '@strudel/soundfonts/package.json';
import { prebake } from '@strudel/repl/prebake.mjs';
import { tempoClock } from './tempo.js';
import { installHelpers, useFns } from '../song/writer.js';
import { loadLimiter, setMasterLevel, limiterDelay } from '../sounds/limiter.js';
import { noteOf } from '../visuals/stage-feed.js';

const post = (m, transfer = []) => parent.postMessage({ codingMiskRender: true, ...m }, location.origin, transfer);
// superdough's deprecation notices come once per voice: thousands of console lines slow the render down
for (const k of ['log', 'warn']) { const f = console[k].bind(console); console[k] = (...a) => { if (typeof a[0] === 'string' && a[0].includes('Deprecation')) return; f(...a); }; }
// the sounds load after the offline context is set, so every global effect belongs to it
// a decode that fails ends in an error, not a wait (#54); the register of broken sounds and the stand-ins played
guardDecode();
const register = createRegister({ version: soundfonts.version, store: localStorage }), replaced = new Set();
async function loadSounds() {
  await prebake();
  // as the app: the whole Dirt-Samples archive and the custom samples in public/samples/
  await Promise.all([samples('github:tidalcycles/dirt-samples'), samples('/samples/strudel.json').catch(() => {})]);
  // broken sounds play from a stand-in (#54): the register is the app's, the same origin
  guardSounds({ soundMap, registerSound, register, onReplace: (name, from, to) => replaced.add(`${name}:${from}→${to}`) });
}

// our helpers, the library and the mixer of the code (code-writing, song-functions); the song's buses for `.chan(name)`
// and its functions come with the job
installHelpers({ register: strudelRegister, Pattern });

// repeatable renders: superdough draws random numbers (the phases of the supersaw voices, noise, the reverb's impulse),
// so the same song rendered twice would differ a little. Every render draws from the same seeded sequence, here and in
// the audio worklets (their own global scope)
const SEED = 0x6d69736b;
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const WORKLET_SEED = `{ let a = ${SEED} >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }`;

// seconds to wait for one sound to load before skipping it
const SOUND_WAIT = 8000;
// seconds from the start of a render before a sound with stretch can start (measured: 0.02 is silent, 0.1 is heard)
const STRETCH_LEAD = 0.1;
// only (code-widgets D11): render only the haps of that instrument (`analyze`), for a scope or spectrum in a fast video.
// A segment's wlines ([{ a, b, key }], places in its code) are the lines with a note widget: their notes come back by key,
// [begin, end, pitch, gain × velocity] in cycles, for the fast video to draw the widget
const pitchOf = v => { try { if (typeof v.note === 'number') return v.note; if (typeof v.note === 'string') return noteToMidi(v.note); if (typeof v.n === 'number' && !v.s) return v.n; if (v.freq) return 12 * Math.log2(v.freq / 440) + 69; } catch (e) {} return String(v.s ?? v.n ?? '?'); };
// stageNotes (widgets-on-stage D2): the notes of every instrument (`analyze`) that start in the block, [begin, end, pitch,
// gain × velocity] in cycles, for the widget looks of the fast video; read from the haps scheduled anyway (no extra query)
async function render({ segments, bpm, from = 0, to = null, tail = 3, keepFrom = from, sampleRate = 48000, gain = 1, push = 1, buses = {}, fns = {}, only = null, stageNotes = false }) {
  globalThis.miskBuses = buses; useFns(fns);
  const T = tempoClock(bpm), end = to ?? T.seconds(bpm.length), length = end - from + tail;
  // the master limiter delays the sound by its look-ahead: the render runs that much longer and the file starts after it
  const lag = Math.round(limiterDelay(sampleRate) * sampleRate);
  const ctx = new OfflineAudioContext(2, Math.ceil(length * sampleRate) + lag, sampleRate);
  setAudioContext(ctx);
  // a new controller made on first use, from the same superdough copy (a separate import is a separate copy)
  setSuperdoughAudioController(null);
  // voices are scheduled two seconds ahead (the live player: a fraction of a second): no voice limit, or early voices would be cut
  Math.random = seeded(SEED);
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET_SEED], { type: 'text/javascript' })));
  if (!(await loadLimiter(ctx))) throw new Error('the master limiter did not load');
  await initAudio({ maxPolyphony: 1e6 });
  await loadSounds();
  // the app's master level and the style's push, into the master limiter (the live player does the same on its output)
  setMasterLevel(getSuperdoughAudioController().output, gain, push);
  post({ progress: 0, phase: 'schedule' });
  const R = repl({ transpiler, defaultOutput: () => {}, getTime: () => 0 });
  const onsets = {}, skipped = new Set(), notes = {}, stage = stageNotes ? {} : null;
  // the haps that start in this block's window [from, end), from the segments it covers, in onset order (cut groups depend on it)
  const c0 = T.cycleAt(from), c1 = T.cycleAt(end), all = [];
  for (const seg of segments) {
    const a = Math.max(seg.from, c0), b = Math.min(seg.to, c1);
    if (b <= a) continue;
    // (a joined radio session: each segment has the buses and functions of its song on air, radio-profiles D12)
    if (seg.buses || seg.fns) { globalThis.miskBuses = seg.buses || buses; useFns(seg.fns || fns); }
    const pattern = await R.evaluate(seg.run || seg.code, false);
    if (!pattern) throw new Error('evaluation failed');
    // the notes of the lines with a note widget, two cycles past the block too (the widget looks ahead); the app drops
    // the notes it already has
    if (seg.wlines && seg.wlines.length) for (const hap of pattern.queryArc(Math.max(a, T.cycleAt(keepFrom)), Math.min(seg.to, b + 2))) {
      if (!hap.hasOnset()) continue;
      const at = ((hap.context && hap.context.locations) || [])[0], w = at && seg.wlines.find(x => at.start >= x.a && at.start < x.b);
      if (!w) continue;
      hap.ensureObjectValue();
      (notes[w.key] ||= []).push([+hap.whole.begin.valueOf().toFixed(4), +hap.whole.end.valueOf().toFixed(4), pitchOf(hap.value), +((hap.value.gain ?? 1) * (hap.value.velocity ?? 1)).toFixed(3)]);
    }
    for (const hap of pattern.queryArc(a, b, { _cps: T.cps(a) })) {
      if (!hap.hasOnset()) continue;
      const hb = hap.whole.begin.valueOf();
      if (hb < a || hb >= b) continue;
      hap.ensureObjectValue();
      if (stage && hap.value.analyze !== undefined && hb >= T.cycleAt(keepFrom)) (stage[hap.value.analyze] ||= []).push(noteOf(hb, hap.whole.end.valueOf(), hap.value));
      if (only !== null && hap.value.analyze !== only) continue;
      all.push({ b: hb, hap, t: T.seconds(hb) });
    }
  }
  all.sort((x, y) => x.b - y.b);
  // pre-flight (#54): every distinct sound of the block loads once before rendering, at a time past the end (never heard),
  // so broken sounds are replaced or left out up front and the render does not wait on them note by note
  const idOf = v => `${v.bank ? `${v.bank}_` : ''}${v.s}${v.n !== undefined ? `:${v.n}` : ''}`;
  const keyOf = v => `${idOf(v)}|${v.note ?? ''}|${v.freq ?? ''}`, dead = new Set(), firsts = new Map();
  for (const x of all) { const k = keyOf(x.hap.value); if (!firsts.has(k)) firsts.set(k, x); }
  const queue = [...firsts.entries()];
  let loaded = 0;
  const loadOne = async ([k, { b, hap }]) => {
    const v = hap.value;
    // the app counts a quiet page as stuck: the pre-flight says it is alive
    if (++loaded % 8 === 0) post({ progress: 0, phase: 'schedule' });
    // only the sound itself: effects (a reverb made here, in the order the loads finish) would change the render
    const only = Object.fromEntries(['s', 'bank', 'n', 'note', 'freq', 'clip', 'begin', 'end'].filter(x => v[x] !== undefined).map(x => [x, v[x]]));
    const ok = await Promise.race([superdough({ ...only, gain: 0 }, length + 1, 0.05, T.cps(b), 0).then(() => true, () => true), new Promise(r => setTimeout(() => r(false), SOUND_WAIT))]);
    if (!ok) { dead.add(k); if (!skipped.has(idOf(v))) { skipped.add(idOf(v)); console.warn(`[render] sound ${idOf(v)} did not load, skipped`); } }
  };
  await Promise.all(Array.from({ length: 12 }, async () => { while (queue.length) await loadOne(queue.shift()); }));
  // the loads above finish in any order: the random sequence starts again for the render itself
  Math.random = seeded(SEED);
  post({ progress: 0, phase: 'schedule' });
  // voices are scheduled a window ahead, as the live player does: with every voice scheduled at once the offline
  // context processes thousands of idle nodes in every block and renders slower than real time
  const W = 2;
  let k = 0;
  async function schedule(until) {
    for (; k < all.length && all[k].t - from < until; k++) {
      const { b, hap, t } = all[k], v = hap.value, d = T.seconds(hap.whole.end.valueOf()) - t;
      // a sound that never loads (a sample that cannot be decoded) must not hold the render forever (#61): skipped
      if (!dead.has(keyOf(v))) try {
        // the phase vocoder (stretch) stays silent for a sound that starts in the first tenth of a second of a render: a
        // voice line on bar 0 (the voice opening, voice-instrument) starts that much later, where it is heard
        const at = v.stretch !== undefined && t - from < STRETCH_LEAD ? from + STRETCH_LEAD : t;
        const ok = await Promise.race([superdough(v, at - from, d, T.cps(b), at - from).then(() => true), new Promise(r => setTimeout(() => r(false), SOUND_WAIT))]);
        if (!ok) { const id = `${v.bank ? `${v.bank}_` : ''}${v.s}${v.n !== undefined ? `:${v.n}` : ''}`; if (!skipped.has(id)) { skipped.add(id); console.warn(`[render] sound ${id} did not load, skipped`); } }
      } catch (e) { console.warn('[render]', e); }
      // onsets once: the lead in of a block belongs to the block before
      if (t >= keepFrom) { const key = v.analyze || v.s || 'other'; (onsets[key] = onsets[key] || []).push([+t.toFixed(4), +d.toFixed(4), +((v.gain ?? 1) * (v.velocity ?? 1)).toFixed(3)]); }
    }
  }
  await schedule(W);
  for (let s = W / 2; s < length; s += W / 2) {
    ctx.suspend(s).then(async () => { await schedule(s + W); post({ progress: s / length, phase: 'render' }); ctx.resume(); });
  }
  const buf = await ctx.startRendering();
  const channels = [buf.getChannelData(0).slice(lag), buf.getChannelData(1).slice(lag)];
  post({ done: true, channels, sampleRate, onsets, notes, stageNotes: stage, skipped: [...skipped], replaced: [...replaced] }, channels.map(c => c.buffer));
}

addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || !e.data.render) return;
  render(e.data.render).catch(err => post({ error: String(err && err.message || err) }));
});
post({ ready: true });
