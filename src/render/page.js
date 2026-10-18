// The fast export's render page (#8), loaded in a hidden iframe: its own copy of Strudel (the same sample banks as
// the editor, plus the app's own samples) renders a song into an OfflineAudioContext, apart from the live audio.
// Superdough keeps one audio context and reuses audio nodes, so a fresh page renders each export.
// Messages from the app: { render: job }. To the app: { ready }, { progress, phase }, { done, channels, sampleRate, onsets }, { error }.
// job: { segments: [{ from, to, code }] in bars, bpm: per bar, from / to: the window in seconds (a block of a long
// export), tail: seconds after it, keepFrom: onsets before it belong to the block before, sampleRate, gain: the master level }
import { repl, register as strudelRegister } from '@strudel/core';
import { transpiler } from '@strudel/transpiler';
import { samples, superdough, setAudioContext, setSuperdoughAudioController, getSuperdoughAudioController, initAudio, registerSound, soundMap } from '@strudel/webaudio';
import { guardDecode, guardSounds, createRegister } from '../sounds/sound-guard.js';
import soundfonts from '@strudel/soundfonts/package.json';
import { prebake } from '@strudel/repl/prebake.mjs';
import { tempoClock } from './tempo.js';
import { installHelpers, useFns } from '../song/writer.js';

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
installHelpers({ register: strudelRegister });

// repeatable renders: superdough draws random numbers (the phases of the supersaw voices, noise, the reverb's impulse),
// so the same song rendered twice would differ a little. Every render draws from the same seeded sequence, here and in
// the audio worklets (their own global scope)
const SEED = 0x6d69736b;
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const WORKLET_SEED = `{ let a = ${SEED} >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }`;

// seconds to wait for one sound to load before skipping it
const SOUND_WAIT = 8000;
async function render({ segments, bpm, from = 0, to = null, tail = 3, keepFrom = from, sampleRate = 48000, gain = 1, buses = {}, fns = {} }) {
  globalThis.miskBuses = buses; useFns(fns);
  const T = tempoClock(bpm), end = to ?? T.seconds(bpm.length), length = end - from + tail;
  const ctx = new OfflineAudioContext(2, Math.ceil(length * sampleRate), sampleRate);
  setAudioContext(ctx);
  // a new controller made on first use, from the same superdough copy (a separate import is a separate copy)
  setSuperdoughAudioController(null);
  // voices are scheduled two seconds ahead (the live player: a fraction of a second): no voice limit, or early voices would be cut
  Math.random = seeded(SEED);
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET_SEED], { type: 'text/javascript' })));
  await initAudio({ maxPolyphony: 1e6 });
  await loadSounds();
  // the app's master level (the live player sets the same on its output)
  getSuperdoughAudioController().output.destinationGain.gain.value = gain;
  post({ progress: 0, phase: 'schedule' });
  const R = repl({ transpiler, defaultOutput: () => {}, getTime: () => 0 });
  const onsets = {}, skipped = new Set();
  // the haps that start in this block's window [from, end), from the segments it covers, in onset order (cut groups depend on it)
  const c0 = T.cycleAt(from), c1 = T.cycleAt(end), all = [];
  for (const seg of segments) {
    const a = Math.max(seg.from, c0), b = Math.min(seg.to, c1);
    if (b <= a) continue;
    const pattern = await R.evaluate(seg.run || seg.code, false);
    if (!pattern) throw new Error('evaluation failed');
    for (const hap of pattern.queryArc(a, b, { _cps: T.cps(a) })) {
      if (!hap.hasOnset()) continue;
      const hb = hap.whole.begin.valueOf();
      if (hb < a || hb >= b) continue;
      hap.ensureObjectValue();
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
        const ok = await Promise.race([superdough(v, t - from, d, T.cps(b), t - from).then(() => true), new Promise(r => setTimeout(() => r(false), SOUND_WAIT))]);
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
  const channels = [buf.getChannelData(0).slice(), buf.getChannelData(1).slice()];
  post({ done: true, channels, sampleRate, onsets, skipped: [...skipped], replaced: [...replaced] }, channels.map(c => c.buffer));
}

addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || !e.data.render) return;
  render(e.data.render).catch(err => post({ error: String(err && err.message || err) }));
});
post({ ready: true });
