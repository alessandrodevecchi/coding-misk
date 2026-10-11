// The fast export's render page (#8), loaded in a hidden iframe: its own copy of Strudel (the same sample banks as
// the editor, plus the app's own samples) renders a song into an OfflineAudioContext, apart from the live audio.
// Superdough keeps one audio context and reuses audio nodes, so a fresh page renders each export.
// Messages from the app: { render: job }. To the app: { ready }, { progress, phase }, { done, channels, sampleRate, onsets }, { error }.
// job: { segments: [{ from, to, code }] in bars, bpm: per bar, tail: seconds, sampleRate, gain: the master level }
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

async function render({ segments, bpm, tail = 3, sampleRate = 48000, gain = 1 }) {
  const T = tempoClock(bpm), total = T.seconds(bpm.length) + tail;
  const ctx = new OfflineAudioContext(2, Math.ceil(total * sampleRate), sampleRate);
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
  // first the haps of every segment, then superdough in onset order (cut groups depend on it)
  const all = [];
  for (const seg of segments) {
    const pattern = await R.evaluate(seg.code, false);
    if (!pattern) throw new Error('evaluation failed');
    for (const hap of pattern.queryArc(seg.from, seg.to, { _cps: bpm[Math.floor(seg.from)] / 240 })) {
      if (!hap.hasOnset()) continue;
      const b = hap.whole.begin.valueOf();
      if (b < seg.from || b >= seg.to) continue;
      all.push([b, hap]);
    }
  }
  all.sort((x, y) => x[0] - y[0]);
  // voices are scheduled a window ahead, as the live player does: with every voice scheduled at once the offline
  // context processes thousands of idle nodes in every block and renders slower than real time
  const W = 2, haps = all.map(([b, hap]) => { hap.ensureObjectValue(); return { b, hap, t: T.seconds(b) }; });
  let k = 0;
  async function schedule(until) {
    for (; k < haps.length && haps[k].t < until; k++) {
      const { b, hap, t } = haps[k], v = hap.value, d = T.seconds(hap.whole.end.valueOf()) - t;
      try { await superdough(v, t, d, T.cps(b), t); } catch (e) { console.warn('[render]', e); }
      const key = v.analyze || v.s || 'other';
      (onsets[key] = onsets[key] || []).push([+t.toFixed(4), +d.toFixed(4), +((v.gain ?? 1) * (v.velocity ?? 1)).toFixed(3)]);
    }
  }
  await schedule(W);
  for (let s = W / 2; s < total; s += W / 2) {
    ctx.suspend(s).then(async () => { await schedule(s + W); post({ progress: s / total, phase: 'render' }); ctx.resume(); });
  }
  const t0 = performance.now();
  const buf = await ctx.startRendering();
  console.log(`[render] ${haps.length} voices, ${total.toFixed(1)} s rendered in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  const channels = [buf.getChannelData(0).slice(), buf.getChannelData(1).slice()];
  post({ done: true, channels, sampleRate, onsets }, channels.map(c => c.buffer));
}

addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || !e.data.render) return;
  render(e.data.render).catch(err => post({ error: String(err && err.message || err) }));
});
post({ ready: true });
