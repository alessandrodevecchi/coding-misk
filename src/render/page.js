// The fast export's render page (#8), loaded in a hidden iframe: its own copy of Strudel (the same sample banks as
// the editor, plus the app's own samples) renders a song into an OfflineAudioContext, apart from the live audio.
// Superdough keeps one audio context and reuses audio nodes, so a fresh page renders each export.
// Messages from the app: { render: job }. To the app: { ready }, { progress, phase }, { done, channels, sampleRate, onsets }, { error }.
// job: { segments: [{ from, to, code }] in bars, bpm: per bar, from / to: the window in seconds (a block of a long
// export), tail: seconds after it, keepFrom: onsets before it belong to the block before, sampleRate, gain: the master level }
import { repl } from '@strudel/core';
import { transpiler } from '@strudel/transpiler';
import { samples, superdough, setAudioContext, setSuperdoughAudioController, getSuperdoughAudioController, initAudio } from '@strudel/webaudio';
import { prebake } from '@strudel/repl/prebake.mjs';
import { tempoClock } from './tempo.js';

const post = (m, transfer = []) => parent.postMessage({ codingMiskRender: true, ...m }, location.origin, transfer);
// superdough's deprecation notices come once per voice: thousands of console lines slow the render down
for (const k of ['log', 'warn']) { const f = console[k].bind(console); console[k] = (...a) => { if (typeof a[0] === 'string' && a[0].includes('Deprecation')) return; f(...a); }; }
// the sounds load after the offline context is set, so every global effect belongs to it
async function loadSounds() {
  await prebake();
  // as the app: the whole Dirt-Samples archive and the custom samples in public/samples/
  await Promise.all([samples('github:tidalcycles/dirt-samples'), samples('/samples/strudel.json').catch(() => {})]);
}

async function render({ segments, bpm, from = 0, to = null, tail = 3, keepFrom = from, sampleRate = 48000, gain = 1 }) {
  const T = tempoClock(bpm), end = to ?? T.seconds(bpm.length), length = end - from + tail;
  const ctx = new OfflineAudioContext(2, Math.ceil(length * sampleRate), sampleRate);
  setAudioContext(ctx);
  // a new controller made on first use, from the same superdough copy (a separate import is a separate copy)
  setSuperdoughAudioController(null);
  // voices are scheduled two seconds ahead (the live player: a fraction of a second): no voice limit, or early voices would be cut
  await initAudio({ maxPolyphony: 1e6 });
  await loadSounds();
  // the app's master level (the live player sets the same on its output)
  getSuperdoughAudioController().output.destinationGain.gain.value = gain;
  post({ progress: 0, phase: 'schedule' });
  const R = repl({ transpiler, defaultOutput: () => {}, getTime: () => 0 });
  const onsets = {};
  // the haps that start in this block's window [from, end), from the segments it covers, in onset order (cut groups depend on it)
  const c0 = T.cycleAt(from), c1 = T.cycleAt(end), all = [];
  for (const seg of segments) {
    const a = Math.max(seg.from, c0), b = Math.min(seg.to, c1);
    if (b <= a) continue;
    const pattern = await R.evaluate(seg.code, false);
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
  // voices are scheduled a window ahead, as the live player does: with every voice scheduled at once the offline
  // context processes thousands of idle nodes in every block and renders slower than real time
  const W = 2;
  let k = 0;
  async function schedule(until) {
    for (; k < all.length && all[k].t - from < until; k++) {
      const { b, hap, t } = all[k], v = hap.value, d = T.seconds(hap.whole.end.valueOf()) - t;
      try { await superdough(v, t - from, d, T.cps(b), t - from); } catch (e) { console.warn('[render]', e); }
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
  post({ done: true, channels, sampleRate, onsets }, channels.map(c => c.buffer));
}

addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || !e.data.render) return;
  render(e.data.render).catch(err => post({ error: String(err && err.message || err) }));
});
post({ ready: true });
