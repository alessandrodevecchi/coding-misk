// Sound measures of drum hits (decode-refine D3), the same for a drum machine's sample (tools/decode-kits.mjs) and for
// the hits of a decoded track (level B, full.js): the kick's decay (the kick band's level from its peak to 20 dB below,
// or to the level just before the kick in a mix) and the closed hat's brightness (the centroid of its power above
// 2 kHz, below which a mix holds the bass and the chords). The nearest of the app's drum machines (src/decode/kits.js)
// to a track's measures is the one "Our sounds" writes (full.js). Pure.

// the power spectrum of x[from, from + n) with a Hann window, zero-padded to 2048 points
function spectrum(x, from, n, size = 2048) {
  const re = new Float64Array(size), im = new Float64Array(size);
  for (let i = 0; i < n && i < size; i++) if (from + i >= 0 && from + i < x.length) re[i] = x[from + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
  for (let i = 1, j = 0; i < size; i++) { let bit = size >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= size; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < size; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, vr = re[q] * cr - im[q] * ci, vi = re[q] * ci + im[q] * cr; re[q] = re[p] - vr; im[q] = im[p] - vi; re[p] += vr; im[p] += vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
  const p = new Float64Array(size / 2); for (let k = 0; k < size / 2; k++) p[k] = re[k] * re[k] + im[k] * im[k];
  return p;
}
// the centroid (Hz) of the power above `lo` Hz in x[from, from + n)
export function brightAbove(x, from, n, sr, lo = 2000) {
  const p = spectrum(x, from, n), hz = sr / 2048;
  let tot = 0, cw = 0;
  for (let k = Math.ceil(lo / hz); k < p.length; k++) { tot += p[k]; cw += p[k] * k * hz; }
  return tot ? cw / tot : 0;
}
// the kick band's level (a two-pole low-pass at 130 Hz, RMS over 5 ms windows) from `from` on, for `len` seconds
function lowEnvelope(x, from, len, sr) {
  const w = Math.round(0.005 * sr), c = Math.exp((-2 * Math.PI * 130) / sr), out = [];
  let y1 = 0, y2 = 0;
  for (let i = Math.max(0, from); i < Math.min(x.length, from + Math.round(len * sr)); i += w) {
    let s = 0; for (let k = i; k < Math.min(x.length, i + w); k++) { y1 = (1 - c) * x[k] + c * y1; y2 = (1 - c) * y1 + c * y2; s += y2 * y2; }
    out.push(Math.sqrt(s / w));
  }
  return out;
}
// the seconds from the kick band's peak (in the first 40 ms) until it falls 20 dB below it or to `floor`
export function decayOf(x, from, sr, { len = 0.8, floor = 0 } = {}) {
  const env = lowEnvelope(x, from, len, sr);
  let pk = 0, at = 0; for (let i = 0; i < Math.min(env.length, 8); i++) if (env[i] > pk) { pk = env[i]; at = i; }
  if (!pk) return 0;
  const stop = Math.max(0.1 * pk, floor);
  for (let i = at; i < env.length; i++) if (env[i] < stop) return (i - at) * 0.005;
  return (env.length - at) * 0.005;
}
// a lone sample: { decay (a kick's), bright (a hat's) }
export function soundMeasures(x, sr) {
  return { decay: decayOf(x, 0, sr), bright: brightAbove(x, 0, Math.round(0.05 * sr), sr) };
}
// a hat in a mix reads darker above 2 kHz than its sample alone (the app plays hats at half gain under the other parts'
// tails): measured on the bench's app exports, the 909's hats at 0.90 of the sample's brightness and the 808's at 0.92
export const MIX_HAT = 1.1;
// the weight of the kick's decay against the hats' brightness in the distance to a drum machine, and the shortest decay
// that counts (a loud bass under the kick stops the measure at once: luci-rosse and the acid song read 5 ms)
export const KIT_RULE = { decay: 0.5, minDecay: 0.02 };
const median = list => { const s = list.filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
// a track's drums: the median kick decay (to 20 dB below its peak or to 1.5 times the level before it: a bass that holds
// does not count) and the median hat brightness, from up to 48 hits each → { kickDecay, hatBright } (null without hits)
export function mixMeasures(x, sr, kicks, hats) {
  const n30 = Math.round(0.03 * sr), n25 = Math.round(0.025 * sr), pick = (list, n = 48) => list.filter((_, k) => k % Math.max(1, Math.ceil(list.length / n)) === 0);
  const dec = pick(kicks).map(t => { const at = Math.round(t * sr), env = lowEnvelope(x, at - n30, 0.03, sr), pre = env.length ? env.reduce((a, v) => a + v, 0) / env.length : 0; return decayOf(x, at, sr, { floor: 1.5 * pre }); });
  const hat = pick(hats).map(t => brightAbove(x, Math.round(t * sr), n25, sr));
  const hb = median(hat);
  return { kickDecay: median(dec), hatBright: hb === null ? null : hb * MIX_HAT };
}
// the drum machine nearest to a track's measures in `table` (src/decode/kits.js): the hats' brightness weighs most (a
// mix hides the kick's tail under the bass), the kick's decay by KIT_RULE.decay when it was measured → a kit's name, or null
export function nearestKit(meas, table) {
  if (!meas || !meas.hatBright) return null;
  let best = null, bd = Infinity;
  for (const [kit, v] of Object.entries(table)) {
    const d = Math.abs(Math.log(meas.hatBright / v.hatBright)) + (meas.kickDecay >= KIT_RULE.minDecay ? KIT_RULE.decay * Math.abs(Math.log((meas.kickDecay + 0.02) / (v.kickDecay + 0.02))) : 0);
    if (d < bd) { bd = d; best = kit; }
  }
  return best;
}
