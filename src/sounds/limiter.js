// The master limiter (level-headroom): every sound of the app, live and in every export, passes it last, so the output
// stays below full scale. Strudel's output is channelMerger → destinationGain → speakers; the chain goes in between:
//   channelMerger → level (the master level × the style's push) → limiter → guard → destinationGain (1) → …
// Everything that taps destinationGain (recordings, the real time export, the level tools) gets the limited sound.
//
// The limiter is a look-ahead peak limiter in an audio worklet: the sound is delayed by LIMIT.lookahead and the gain
// falls before a peak arrives, so no sample leaves above LIMIT.ceiling. Below the ceiling the gain is exactly 1 and the
// sound is unchanged (only delayed). The guard is a wave shaper, the identity up to the ceiling and a soft bend to
// LIMIT.guard above it: it only acts if the limiter is not loaded yet, and it caps the output whatever happens.
// A style's `headroom` (1.0 to 1.5) is the push: the level into the limiter is raised by it, for a louder, denser mix.

export const LIMIT = { ceiling: 0.95, lookahead: 0.005, release: 0.12, guard: 0.99 };
export const LIMITER_NAME = 'misk-limiter';

// the worklet, in its own global scope. Per sample: the gain each sample needs (ceiling / peak of the channels), the
// lowest of the last L + 1 of them (a running minimum), released slowly upwards, then averaged over L samples. The
// average of L values that are all at most the gain a peak needs, from the moment the peak enters until it leaves the
// delay line, keeps that peak at the ceiling at most: no overshoot, with a smooth attack of L samples.
const WORKLET = `
class MiskLimiter extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const p = (o && o.processorOptions) || {};
    this.c = p.ceiling; this.L = Math.max(1, Math.round(p.lookahead * sampleRate));
    this.rel = 1 - Math.exp(-1 / (p.release * sampleRate));
    this.ring = []; this.pos = 0; this.n = 0;
    this.qv = new Float64Array(this.L + 2); this.qi = new Float64Array(this.L + 2); this.qh = 0; this.qt = 0;
    this.box = new Float64Array(this.L).fill(1); this.sum = this.L; this.bp = 0; this.env = 1;
  }
  process(inputs, outputs) {
    const inp = inputs[0] || [], out = outputs[0], L = this.L, c = this.c, Q = L + 2;
    while (this.ring.length < out.length) this.ring.push(new Float32Array(L));
    const frames = out[0].length;
    for (let i = 0; i < frames; i++) {
      let x = 0;
      for (let k = 0; k < out.length; k++) { const v = inp[k] ? Math.abs(inp[k][i]) : 0; if (v > x) x = v; }
      const req = x > c ? c / x : 1, n = this.n++;
      // running minimum of the last L + 1 needed gains (a monotonic queue)
      while (this.qt !== this.qh && this.qv[(this.qt + Q - 1) % Q] >= req) this.qt = (this.qt + Q - 1) % Q;
      this.qv[this.qt] = req; this.qi[this.qt] = n; this.qt = (this.qt + 1) % Q;
      while (this.qi[this.qh] < n - L) this.qh = (this.qh + 1) % Q;
      const held = this.qv[this.qh];
      // down at once, up with the release; exactly 1 again once close
      let e = held < this.env ? held : this.env + (held - this.env) * this.rel;
      if (held === 1 && e > 0.999999) e = 1;
      this.env = e;
      this.sum += e - this.box[this.bp]; this.box[this.bp] = e;
      if (++this.bp === L) { this.bp = 0; let s = 0; for (let k = 0; k < L; k++) s += this.box[k]; this.sum = s; }
      const g = this.sum === L ? 1 : this.sum / L;
      for (let k = 0; k < out.length; k++) {
        const r = this.ring[k], d = r[this.pos];
        r[this.pos] = inp[k] ? inp[k][i] : 0;
        out[k][i] = d * g;
      }
      if (++this.pos === L) this.pos = 0;
    }
    return true;
  }
}
registerProcessor('${LIMITER_NAME}', MiskLimiter);
`;

const loaded = new WeakMap();
// loads the worklet into a context once; resolves true when the limiter can be made there
export function loadLimiter(ctx) {
  if (!loaded.has(ctx)) {
    const p = ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }))).then(() => { p.ok = true; return true; }, e => { console.warn('[limiter]', e); return false; });
    loaded.set(ctx, p);
  }
  return loaded.get(ctx);
}

// the guard's curve: input -1..1 is the signal -2..2; the identity up to the ceiling, then a soft bend to LIMIT.guard
function guardCurve(n = 4097) {
  const c = new Float32Array(n), a = LIMIT.ceiling, room = LIMIT.guard - a;
  for (let i = 0; i < n; i++) {
    const s = 2 * (-1 + (2 * i) / (n - 1)), m = Math.abs(s);
    c[i] = Math.sign(s) * (m <= a ? m : a + room * Math.tanh((m - a) / room));
  }
  return c;
}

// the chain on a superdough output (installed once per output; again when superdough makes a new one). Returns
// { level, limiter }. level: the gain into the limiter (the master level times the push).
export function installMaster(output) {
  const st = output.miskMaster;
  if (st && st.merger === output.channelMerger && st.dest === output.destinationGain) { upgrade(st); return st; }
  const merger = output.channelMerger, dest = output.destinationGain, ctx = dest.context;
  const channels = merger.numberOfInputs || 2;
  const level = new GainNode(ctx, { gain: 1 });
  // the guard scales the signal by half into the shaper's -1..1 and back: the curve covers -2..2
  const half = new GainNode(ctx, { gain: 0.5 }), guard = new WaveShaperNode(ctx, { curve: guardCurve(), oversample: 'none' });
  try { merger.disconnect(dest); } catch (e) {}
  merger.connect(level); half.connect(guard); guard.connect(dest);
  dest.gain.value = 1;
  const s = { merger, dest, ctx, channels, level, half, guard, limiter: null };
  output.miskMaster = s;
  upgrade(s);
  return s;
}
// the limiter goes in as soon as its worklet is loaded (until then the guard alone keeps the output under full scale)
function upgrade(s) {
  if (s.limiter) return;
  const p = loaded.get(s.ctx);
  if (!p || !p.ok) {
    if (!s.direct) { s.level.connect(s.half); s.direct = true; }
    if (!p) loadLimiter(s.ctx);
    return;
  }
  s.limiter = new AudioWorkletNode(s.ctx, LIMITER_NAME, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [s.channels], channelCount: s.channels, channelCountMode: 'explicit', processorOptions: LIMIT });
  s.level.connect(s.limiter); s.limiter.connect(s.half);
  if (s.direct) { try { s.level.disconnect(s.half); } catch (e) {} s.direct = false; }
}
// sets the level into the limiter: master × push (push 1 for a song without a loud style)
export function setMasterLevel(output, master, push = 1) {
  const s = installMaster(output), g = master * push;
  if (s.want !== g) { s.want = g; s.level.gain.value = g; }
  if (s.dest.gain.value !== 1) s.dest.gain.value = 1;
  return s;
}
// the delay the limiter adds, in seconds (the render page removes it from the file)
export const limiterDelay = sampleRate => Math.max(1, Math.round(LIMIT.lookahead * sampleRate)) / sampleRate;
