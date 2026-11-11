// misk-analyzer (track-to-code D5): the app's own analyser of a decoded track. Classical signal processing only, no
// machine learning: short-time spectra, spectral flux per band with an adaptive threshold, autocorrelation for the
// tempo, YIN for the bass, a chromagram from tonal peaks, chord templates with overtones, key profiles, 16-step grids
// with hysteresis. It reads mono PCM (44.1 kHz) and fills the song model of model.js bar by bar, so level A can ask
// "up to t" while the file plays and level B "everything". Pure: it runs in the analysis worker and in Node.
import { emptyModel, STEPS, DRUM_ROWS, chordName, parseChord as parseChordName, ANALYSIS_VERSION } from './model.js';

export const ANALYSIS_RATE = 44100;
export const ENGINE = { id: 'misk-analyzer', version: ANALYSIS_VERSION, incremental: true };
const HOP = 512, N1 = 1024, N2 = 4096, HOP2 = 2048, DEC = 8;
// drum bands (Hz): kick, snare or clap, hat; and the bands of the levels
const BAND = { kick: [40, 130], snare: [1100, 5200], hat: [7000, 15000], low: [40, 250], mid: [250, 2000], high: [2000, 8000], air: [5200, 11000] };
// the least music the tempo lock needs (seconds)
export const LOCK_SECONDS = 8;
// drums on dense mixes (decode-refine D4): the every-beat rule, a peak of the kick band's flux of at least `flux` times
// its threshold on each of the bar's four beats, each a rise of the low band of at least `beat` times the track's
// kick scale
export const KICK_RULE = { flux: 0.45, beat: 0.25 };
// a clap (D4): its snare-band rise at least `snare` times the track's strong ones, its darkness (snare band over hat
// band) at least `local` times the hats' of the last `seconds` seconds, and noise in the snare band (spectral flatness
// at least `flat`; measured: claps 0.36 to 0.67, a lead's note on a kick 0.11 to 0.22)
export const CLAP_RULE = { snare: 0.5, local: 1.3, seconds: 6, flat: 0.3 };
// hats (D4): a step is on when its hat is at least `median` times the median hat of the bar and the `bars` bars before
export const HAT_RULE = { median: 0.5, bars: 4 };
// level A's relock (D4): the tempo and the beat phase checked again on the first bars with kicks, this many
export const RELOCK_BARS = 8;
// the top line by YIN (D2): a step's band level must reach `floor` of the band's peak
export const TOP_LINE = { floor: 0.02 };
// the bass (D5): YIN's looser threshold for a bass that the usual one does not hear (a detuned unison)
export const BASS_RULE = { loose: 0.35 };

// ---------- FFT (radix 2, in place) ----------
const ffts = new Map();
function fftOf(n) {
  if (ffts.has(n)) return ffts.get(n);
  const bits = Math.log2(n), rev = new Uint32Array(n), cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((2 * Math.PI * i) / n); sin[i] = -Math.sin((2 * Math.PI * i) / n); }
  const f = (re, im) => {
    for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) for (let j = 0, k = 0; j < half; j++, k += step) {
        const a = i + j, b = a + half, tr = re[b] * cos[k] - im[b] * sin[k], ti = re[b] * sin[k] + im[b] * cos[k];
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  };
  ffts.set(n, f);
  return f;
}
const hann = n => Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));

// ---------- small statistics ----------
const quantile = (arr, q) => { if (!arr.length) return 0; const s = Float64Array.from(arr).sort(); const i = Math.min(s.length - 1, Math.max(0, (s.length - 1) * q)), lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const mean = (a, from = 0, to = a.length) => { let s = 0, n = 0; for (let i = Math.max(0, from); i < Math.min(a.length, to); i++) { s += a[i]; n++; } return n ? s / n : 0; };
const cosSim = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };

// ---------- chord templates (24 major and minor triads, with overtones) ----------
const TEMPLATES = (() => {
  const out = [];
  for (const quality of ['maj', 'min']) for (let root = 0; root < 12; root++) {
    const v = new Float64Array(12), tones = [0, quality === 'maj' ? 4 : 3, 7];
    for (const tn of tones) for (let h = 1; h <= 4; h++) v[(root + tn + Math.round(12 * Math.log2(h))) % 12] += 0.6 ** (h - 1);
    out.push({ root, quality, v });
  }
  return out;
})();
// Krumhansl-Kessler key profiles
const KP = { major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], minor: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] };
const rotate = (p, r) => Array.from({ length: 12 }, (_, i) => p[(i - r + 12) % 12]);
const pearson = (a, b) => { const ma = mean(a), mb = mean(b); let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += (a[i] - ma) * (b[i] - mb); x += (a[i] - ma) ** 2; y += (b[i] - mb) ** 2; } return x && y ? d / Math.sqrt(x * y) : 0; };

// ---------- a biquad low-pass (RBJ), for the bass signal ----------
function lowpass(x, sr, fc, q = 0.707) {
  const w = (2 * Math.PI * fc) / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + al;
  const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, b2 = b0, a1 = (-2 * c) / a0, a2 = (1 - al) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}

// a biquad high-pass (RBJ), for the top line's band
function highpass(x, sr, fc, q = 0.707) {
  const w = (2 * Math.PI * fc) / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + al;
  const b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, b2 = b0, a1 = (-2 * c) / a0, a2 = (1 - al) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}

// YIN (de Cheveigné and Kawahara) on x[from, from + w): → { f0, ap } or null
export function yin(x, from, sr, { w = 256, fmin = 28, fmax = 300, threshold = 0.2 } = {}) {
  const tmax = Math.min(w, Math.floor(sr / fmin)), tmin = Math.max(2, Math.floor(sr / fmax));
  if (from < 0 || from + w + tmax > x.length) return null;
  const d = new Float64Array(tmax + 1);
  for (let tau = 1; tau <= tmax; tau++) { let s = 0; for (let i = 0; i < w; i++) { const v = x[from + i] - x[from + i + tau]; s += v * v; } d[tau] = s; }
  let run = 0;
  const cm = new Float64Array(tmax + 1); cm[0] = 1;
  for (let tau = 1; tau <= tmax; tau++) { run += d[tau]; cm[tau] = run ? (d[tau] * tau) / run : 1; }
  let best = -1;
  for (let tau = tmin; tau < tmax; tau++) if (cm[tau] < threshold) { while (tau + 1 < tmax && cm[tau + 1] < cm[tau]) tau++; best = tau; break; }
  if (best < 0) return null;
  const a = cm[best - 1], b = cm[best], c = cm[best + 1], den = a - 2 * b + c, shift = den ? (0.5 * (a - c)) / den : 0;
  return { f0: sr / (best + Math.max(-1, Math.min(1, shift))), ap: b };
}
const midiOf = f => 69 + 12 * Math.log2(f / 440);

// ---------- the analyser ----------
// pcm: mono Float32Array at `sr`. Returns an object that analyses on demand:
//   advance(t): frames up to t seconds; lock(t): tempo and downbeat from the audio up to t (false while too short);
//   model(t): the song model with every bar complete before t; setTempo({ bpm, downbeat }): a tapped or picked tempo.
export function createAnalyzer(pcm, { sr = ANALYSIS_RATE } = {}) {
  const duration = pcm.length / sr, fr = sr / HOP;
  const nf1 = Math.max(0, Math.floor((pcm.length - N1) / HOP) + 1), nf2 = Math.max(0, Math.floor((pcm.length - N2) / HOP2) + 1);
  const hz1 = sr / N1, hz2 = sr / N2;
  const binsOf = ([a, b], hz, n) => [Math.max(1, Math.round(a / hz)), Math.min(n / 2, Math.round(b / hz))];
  const B1 = Object.fromEntries(Object.entries(BAND).map(([k, v]) => [k, binsOf(v, hz1, N1)]));
  const flux = { kick: new Float32Array(nf1), snare: new Float32Array(nf1), hat: new Float32Array(nf1), air: new Float32Array(nf1) };
  const energy = { kick: new Float32Array(nf1), hat: new Float32Array(nf1), snare: new Float32Array(nf1), low: new Float32Array(nf1), mid: new Float32Array(nf1), high: new Float32Array(nf1), total: new Float32Array(nf1) };
  const cent = new Float32Array(nf1);
  // the spectral flatness of the snare band per frame (a clap is noise; a lead's note in the same band is tonal)
  const flatS = new Float32Array(nf1);
  const chroma = new Float32Array(nf2 * 12), chromaE = new Float32Array(nf2);
  // the tonal peaks of each frame (frequency, magnitude), for a bar's chroma without the bass's upper harmonics
  const peaks = new Array(nf2);
  const w1 = hann(N1), w2 = hann(N2), re1 = new Float64Array(N1), im1 = new Float64Array(N1), re2 = new Float64Array(N2), im2 = new Float64Array(N2);
  let prevLog = new Float64Array(N1 / 2 + 1), done1 = 0, done2 = 0;
  // the low-passed bass signal, decimated by 8 (5.5 kHz), made once
  let dec = null;
  const decRate = sr / DEC;
  const bassSignal = () => {
    if (dec) return dec;
    const lp = lowpass(lowpass(pcm, sr, 320), sr, 320);
    dec = new Float32Array(Math.floor(lp.length / DEC));
    for (let i = 0; i < dec.length; i++) dec[i] = lp[i * DEC];
    return dec;
  };
  // the time a frame stands for: the centre of its window
  const t1 = f => (f * HOP + N1 / 2) / sr, f1 = t => Math.round((t * sr - N1 / 2) / HOP);
  const t2 = f => (f * HOP2 + N2 / 2) / sr;

  function frames1(to) {
    const fft = fftOf(N1), half = N1 / 2;
    for (; done1 < Math.min(nf1, to); done1++) {
      const o = done1 * HOP;
      for (let i = 0; i < N1; i++) { re1[i] = pcm[o + i] * w1[i]; im1[i] = 0; }
      fft(re1, im1);
      const lg = new Float64Array(half + 1);
      let tot = 0, cw = 0, fl = 0, fa = 0, fn = 0;
      const bandE = { kick: 0, hat: 0, snare: 0, low: 0, mid: 0, high: 0 }, bandF = { kick: 0, snare: 0, hat: 0, air: 0 };
      for (let k = 1; k <= half; k++) {
        const m = Math.hypot(re1[k], im1[k]), p = m * m;
        lg[k] = Math.log1p(10 * m);
        tot += p; cw += p * k * hz1;
        const d = lg[k] - prevLog[k], up = d > 0 ? d : 0;
        for (const b of ['kick', 'hat', 'snare', 'low', 'mid', 'high']) { const [a, z] = B1[b]; if (k >= a && k <= z) bandE[b] += p; }
        if (k >= B1.snare[0] && k <= B1.snare[1]) { fl += Math.log(p + 1e-12); fa += p; fn++; }
        for (const b of ['kick', 'snare', 'hat', 'air']) { const [a, z] = B1[b]; if (k >= a && k <= z) bandF[b] += up; }
      }
      for (const b of ['kick', 'snare', 'hat', 'air']) { const [a, z] = B1[b]; flux[b][done1] = bandF[b] / (z - a + 1); }
      for (const b of ['kick', 'hat', 'snare', 'low', 'mid', 'high']) energy[b][done1] = bandE[b];
      energy.total[done1] = tot; cent[done1] = tot ? cw / tot : 0;
      flatS[done1] = fn && fa > 0 ? Math.exp(fl / fn) / (fa / fn) : 0;
      prevLog = lg;
    }
  }
  function frames2(to) {
    const fft = fftOf(N2), lo = Math.round(60 / hz2), hi = Math.round(2100 / hz2);
    for (; done2 < Math.min(nf2, to); done2++) {
      const o = done2 * HOP2;
      for (let i = 0; i < N2; i++) { re2[i] = pcm[o + i] * w2[i]; im2[i] = 0; }
      fft(re2, im2);
      const mag = new Float64Array(hi + 2);
      let mx = 0;
      for (let k = lo - 1; k <= hi + 1; k++) { mag[k] = Math.hypot(re2[k], im2[k]); if (mag[k] > mx) mx = mag[k]; }
      const c = done2 * 12;
      let e = 0, pk = null;
      for (let k = lo; k <= hi; k++) {
        if (!(mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > 0.04 * mx)) continue;
        const a = Math.log(mag[k - 1] + 1e-12), b = Math.log(mag[k] + 1e-12), g = Math.log(mag[k + 1] + 1e-12), den = a - 2 * b + g;
        const kk = k + (den ? (0.5 * (a - g)) / den : 0), f = kk * hz2;
        const pc = ((Math.round(midiOf(f)) % 12) + 12) % 12;
        chroma[c + pc] += mag[k]; e += mag[k];
        (pk || (pk = [])).push(f, mag[k]);
      }
      chromaE[done2] = e; peaks[done2] = pk ? Float32Array.from(pk) : null;
    }
  }
  const advance = t => { const s = Math.min(pcm.length, Math.max(0, Math.round(t * sr))); frames1(Math.floor((s - N1) / HOP) + 1); frames2(Math.floor((s - N2) / HOP2) + 1); };

  // ---------- onsets per band: peaks of the flux above median + k·IQR of a 3-second window ----------
  const onsets = { kick: [], snare: [], hat: [] };
  let onsetDone = 0;
  const thrMemo = { kick: new Map(), snare: new Map(), hat: new Map(), air: new Map() };
  const BLOCK = 43, WIN = 130;
  // the threshold of a band near frame f: the window is cut at the frames already analysed (level A never reads ahead)
  const threshold = (band, f) => {
    const blk = Math.floor(f / BLOCK), key = `${blk}:${Math.min(done1, (blk + 1) * BLOCK + WIN)}`, memo = thrMemo[band];
    if (memo.has(key)) return memo.get(key);
    const a = Math.max(0, blk * BLOCK - WIN), z = Math.min(done1, (blk + 1) * BLOCK + WIN), arr = flux[band].subarray(a, z);
    const md = quantile(arr, 0.5), iqr = quantile(arr, 0.75) - quantile(arr, 0.25), v = md + 1.5 * iqr + 0.01;
    if (memo.size > 4000) memo.clear();
    memo.set(key, v);
    return v;
  };
  const REFRACT = Math.round(0.05 * fr);
  function findOnsets() {
    // a peak needs its next frame
    for (let f = Math.max(1, onsetDone); f < done1 - 1; f++) {
      for (const band of ['kick', 'snare', 'hat']) {
        const x = flux[band], v = x[f];
        if (!(v > x[f - 1] && v >= x[f + 1])) continue;
        const thr = threshold(band, f);
        if (v <= thr) continue;
        const list = onsets[band], last = list[list.length - 1];
        const a = x[f - 1], c = x[f + 1], den = a - 2 * v + c, shift = den ? (0.5 * (a - c)) / den : 0;
        const o = { f, t: t1(f + shift), s: v - thr, raw: v };
        if (last && f - last.f <= REFRACT) { if (o.s > last.s) list[list.length - 1] = o; continue; }
        list.push(o);
      }
      onsetDone = f + 1;
    }
    // the colour of this track's hats and the strength of its snare-band hits, for isClap and isHat
    if (onsets.hat.length + onsets.snare.length !== kitN) {
      kitN = onsets.hat.length + onsets.snare.length;
      const hs = onsets.hat.map(o => rise('hat', o)), hp = quantile(hs, 0.9), ss = onsets.snare.map(o => rise('snare', o));
      const dom = onsets.hat.filter((o, i) => hs[i] >= 0.5 * hp).map(o => rise('snare', o) / (rise('hat', o) + 1e-6));
      kit = { hatRatio: dom.length >= 4 ? quantile(dom, 0.5) : 0.3, snareTop: quantile(ss, 0.9) || 1, hatTop: hp || 1 };
      clapMemo.clear();
    }
  }
  // kick or bass: a kick's pitch drops in its first 50 ms (a bass note holds its pitch); a hit with no pitch at all is a
  // kick when its low end dies fast. Memoized per onset
  const kickMemo = new Map();
  const kickLike = o => {
    if (kickMemo.has(o.f)) return kickMemo.get(o.f);
    const x = bassSignal(), p0 = yin(x, Math.round((o.t + 0.012) * decRate), decRate, { w: 96, threshold: 0.3, fmax: 400 }), p1 = yin(x, Math.round((o.t + 0.045) * decRate), decRate, { w: 96, threshold: 0.3, fmax: 400 });
    let v;
    if (p0 && p1) v = p1.f0 < p0.f0 * 0.88;
    else {
      const after = o.f + Math.round(0.09 * fr);
      let peak = 0; for (let k = o.f - 1; k <= o.f + 2; k++) if (k >= 0 && k < done1) peak = Math.max(peak, energy.kick[k]);
      v = after < done1 && peak > 0 && energy.kick[after] / peak < 0.45;
    }
    if (o.f < done1 - Math.round(0.1 * fr)) kickMemo.set(o.f, v);
    return v;
  };
  // the rise of a band's amplitude at an onset: its peak just after over its quietest frame just before
  const rise = (band, o) => { const e = energy[band]; let p = 0, q = Infinity; for (let k = o.f - 1; k <= o.f + 2; k++) if (k >= 0 && k < done1) p = Math.max(p, e[k]); for (let k = o.f - 4; k <= o.f - 1; k++) if (k >= 0) q = Math.min(q, e[k]); return Math.max(0, Math.sqrt(p) - Math.sqrt(q === Infinity ? 0 : q)); };
  // the rise of the low band at a hit (its peak over the quietest frame just before), so a kick's own tail is no hit
  const kickPeak = o => { let p = 0, q = Infinity; for (let k = o.f - 1; k <= o.f + 3; k++) if (k >= 0 && k < done1) p = Math.max(p, energy.kick[k]); for (let k = o.f - 4; k <= o.f - 1; k++) if (k >= 0) q = Math.min(q, energy.kick[k]); return Math.max(0, Math.sqrt(p) - Math.sqrt(q === Infinity ? 0 : q)); };
  // the low band's rise at a beat (the every-beat rule, D4): the strongest local peak of the kick band's flux within
  // `tol` of t that reaches KICK_RULE.flux of the band's threshold, measured as kickPeak does; 0 without one
  const beatKick = (t, tol) => {
    let best = 0;
    for (let f = Math.max(1, f1(t - tol)); f <= Math.min(done1 - 2, f1(t + tol)); f++) {
      const x = flux.kick;
      if (!(x[f] > x[f - 1] && x[f] >= x[f + 1]) || x[f] < KICK_RULE.flux * threshold('kick', f)) continue;
      best = Math.max(best, kickPeak({ f }));
    }
    return best;
  };
  let kit = { hatRatio: 0.3, snareTop: 1, hatTop: 1 }, kitN = -1;
  const ratioOf = o => rise('snare', o) / (rise('hat', o) + 1e-6);
  // a clap: darker than the track's hats and strong in the snare band, with some noise in the hat band too (a kick's click
  // or a chord's attack has none)
  // (decode-refine D4) and against the hats heard just before it: the snare band's rise over the hat band's must stand
  // out from the ratio of the hats of the last seconds (a hat over a bright bass note reads darker than the track's hats),
  // and reach half the track's strong snare-band hits (a kick's click alone does not)
  const clapMemo = new Map();
  const isClap = o => {
    if (clapMemo.has(o.f)) return clapMemo.get(o.f);
    const s = rise('snare', o), h = rise('hat', o), r = s / (h + 1e-6), local = localHatRatio(o.t), ref = Math.max(kit.hatRatio, local);
    const v = h >= 0.15 * kit.hatTop && s >= CLAP_RULE.snare * kit.snareTop && r >= CLAP_RULE.local * local && (r / ref) * (s / kit.snareTop) >= 1 && flatAt(o) >= CLAP_RULE.flat;
    if (o.f < done1 - Math.round(0.1 * fr)) clapMemo.set(o.f, v);
    return v;
  };
  // the snare band's spectral flatness at a hit (its frame and the next): a clap is noise, a lead's or a bass's bright
  // note in the band is tonal
  const flatAt = o => Math.max(flatS[o.f] || 0, flatS[o.f + 1] || 0);
  // the lower third of the ratios of the snare band's rise to the hat band's of the strong hat-band hits of the seconds
  // before t (the hats there; a clap or a bright note over a hat reads darker, so the lower third), or the track's ratio
  // with fewer than four
  const localHatRatio = t => {
    const list = [];
    for (const o of onsets.hat) { if (o.t < t - CLAP_RULE.seconds) continue; if (o.t > t + 0.03) break; const h = rise('hat', o); if (h >= 0.5 * kit.hatTop) list.push(rise('snare', o) / (h + 1e-6)); }
    return list.length >= 4 ? quantile(list, 0.3) : kit.hatRatio;
  };
  const isHat = o => rise('hat', o) >= 0.3 * kit.hatTop && !isClap(o);
  const airy = o => { let v = 0; for (let k = o.f - 1; k <= o.f + 1; k++) if (k >= 0 && k < done1) v = Math.max(v, flux.air[k]); return v > threshold('air', o.f); };
  // a hat onset at the same time as a stronger snare or clap is the clap's noise
  const clapNoise = o => { for (const s of onsets.snare) { if (s.t > o.t + 0.025) break; if (Math.abs(s.t - o.t) <= 0.025 && s.s / hitNorm.snare > 0.8 * (o.s / hitNorm.hat)) return true; } return false; };
  const openHat = o => { const f = o.f, after = f + Math.round(0.08 * fr); if (after >= done1) return false; let peak = 0; for (let k = f - 1; k <= f + 2; k++) if (k >= 0 && k < done1) peak = Math.max(peak, energy.hat[k]); return peak > 0 && energy.hat[after] / peak > 0.3; };

  // ---------- tempo (D7): autocorrelation of the onset envelope with a prior around 120 BPM ----------
  const envelope = (a, z) => {
    const out = new Float64Array(Math.max(0, z - a));
    const sc = {}; for (const b of ['kick', 'snare', 'hat']) sc[b] = quantile(flux[b].subarray(a, z), 0.95) || 1;
    for (let f = a; f < z; f++) out[f - a] = flux.kick[f] / sc.kick + flux.snare[f] / sc.snare + 0.5 * flux.hat[f] / sc.hat;
    return out;
  };
  const prior = bpm => Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
  function tempoOf(a, z) {
    const env = envelope(a, z), n = env.length;
    if (n < fr * 3) return null;
    const m = mean(env), x = env.map(v => v - m);
    const acf = lag => { const l0 = Math.floor(lag), k = lag - l0; let s0 = 0, s1 = 0; for (let i = 0; i + l0 + 1 < n; i++) { s0 += x[i] * x[i + l0]; s1 += x[i] * x[i + l0 + 1]; } return ((1 - k) * s0 + k * s1) / (n - lag); };
    const r0 = acf(0) || 1;
    const S = bpm => { const lag = (60 * fr) / bpm; return (acf(lag) + 0.5 * acf(2 * lag) + 0.25 * acf(4 * lag)) / r0; };
    const list = [];
    for (let bpm = 60; bpm <= 200; bpm += 0.5) list.push({ bpm, s: S(bpm) });
    let best = list[0];
    for (const c of list) if (c.s * prior(c.bpm) > best.s * prior(best.bpm)) best = c;
    const vals = list.map(c => c.s), med = quantile(vals, 0.5), top = Math.max(...vals);
    const conf = top > med ? Math.max(0, Math.min(1, (best.s - med) / (top - med + 1e-9) * Math.min(1, best.s * 2))) : 0;
    // refine: a comb over the envelope, tempo within 1.5 % and its phase
    const refine = (b0, span = 0.015, step = 0.02) => {
      let out = { bpm: b0, phase: 0, score: -Infinity };
      for (let bpm = b0 * (1 - span); bpm <= b0 * (1 + span); bpm += step) {
        const P = (60 * fr) / bpm, ph = comb(env, P);
        if (ph.score > out.score) out = { bpm, phase: ph.phase, score: ph.score };
      }
      return out;
    };
    // half, single or double: the prior, the autocorrelation and how well kick and snare fall on the beats (D7)
    findOnsets();
    const hits = [...onsets.kick, ...onsets.snare].filter(o => o.f >= a && o.f < z);
    const onBeat = (bpm, phase) => {
      const P = (60 * fr) / bpm; let on = 0, all = 0;
      for (const o of hits) { const d = (((o.f - a - phase) % P) + P) % P, dist = Math.min(d, P - d) / fr; all += o.s; if (dist < 0.045) on += o.s; }
      return all ? on / all : 0.5;
    };
    // the backbeat: a snare or clap every two beats is the most common groove, so the tempo whose beats put the strong
    // snares two beats apart wins over its half, double, two thirds or three halves
    const snares = onsets.snare.filter(o => o.f >= a && o.f < z && isClap(o)), sTop = quantile(snares.map(o => o.s), 0.9);
    const strong = snares.filter(o => o.s >= 0.25 * sTop), gaps = [];
    for (let i = 1; i < strong.length; i++) { const g = strong[i].t - strong[i - 1].t; if (g > 0.2 && g < 2.6) gaps.push(g); }
    const gap = gaps.length >= 3 ? quantile(gaps, 0.5) : 0;
    const backbeat = bpm => (gap ? (Math.abs(gap / (60 / bpm) - 2) < 0.2 ? 1.8 : 1) : 1);
    let r = null;
    for (const [c, odd] of [[best.bpm / 2, 1], [best.bpm * 2 / 3, 0.6], [best.bpm, 1], [best.bpm * 3 / 2, 0.6], [best.bpm * 2, 1]]) {
      if (c < 60 || c > 200) continue;
      const q = refine(c), bb = backbeat(q.bpm), score = Math.max(0.02, S(q.bpm)) * prior(q.bpm) * (0.6 + onBeat(q.bpm, q.phase)) * bb * (bb > 1 ? 1 : odd);
      if (!r || score > r.pick) r = { ...q, pick: score };
    }
    // a whole tempo when it scores almost as well (most tracks hold one)
    const whole = Math.round(r.bpm);
    if (Math.abs(whole - r.bpm) < 0.65) { const w = comb(env, (60 * fr) / whole); if (w.score >= r.score * 0.97) r = { bpm: whole, phase: w.phase, score: w.score }; }
    const bpm = Math.round(r.bpm * 100) / 100;
    const cands = [bpm / 2, bpm, bpm * 2].filter(b => b >= 40 && b <= 240).map(b => Math.round(b * 100) / 100);
    return { bpm, candidates: cands, confidence: Math.round(conf * 100) / 100, uncertain: conf < 0.35, phaseFrame: a + r.phase, env, a, backbeat: !!(gap && Math.abs(gap / (60 / bpm) - 2) < 0.2) };
  }
  // the phase (in frames) of a pulse of period P that collects the most onset strength
  function comb(env, P) {
    let best = { phase: 0, score: -Infinity };
    for (let ph = 0; ph < P; ph += 0.25) {
      let s = 0, n = 0;
      for (let t = ph; t < env.length - 1; t += P) { const i = Math.floor(t), k = t - i; s += env[i] * (1 - k) + env[i + 1] * k; n++; }
      s = n ? s / n : 0;
      if (s > best.score) best = { phase: ph, score: s };
    }
    return best;
  }

  // ---------- the lock: tempo, beat phase, downbeat ----------
  let lockS = null;
  // music starts at the first frame clearly above the noise floor
  const firstSound = () => { const tot = energy.total.subarray(0, done1), floor = quantile(tot, 0.98) * 1e-4; for (let f = 0; f < done1; f++) if (tot[f] > floor && tot[f] > 1e-6) return f; return 0; };
  function lock(t, { window = 12 } = {}) {
    if (lockS) return lockS;
    advance(t);
    // the window: from the start of the music, at most `window` seconds (a whole-file run locks on the same audio as level A)
    const start = firstSound(), a = start, z = Math.min(done1, start + Math.round(window * fr));
    if ((z - start) / fr < Math.min(LOCK_SECONDS, duration - t1(start) - 0.5)) return null;
    const T = tempoOf(a, z);
    if (!T) return null;
    findOnsets();
    const beat = 60 / T.bpm, beatPhase = phaseOf(beat, t1(a), t1(z), T.backbeat);
    lockS = { bpm: T.bpm, candidates: T.candidates, confidence: T.confidence, uncertain: T.uncertain, downbeat: downbeatOf(beatPhase, beat, t1(start)) };
    return lockS;
  }
  // the relock (decode-refine D4): level A locks on the first seconds, often an intro without kicks or with offbeat hats
  // and a bass on the off steps. Once RELOCK_BARS bars with kicks are complete, the tempo and the beat phase are checked
  // again on them alone: a tempo that is a ratio of the old one (one half, two thirds, three halves, double) replaces it,
  // and the downbeat moves to the new phase. Once per track, never after a tapped, picked or stored tempo. The bars are
  // made again on the new grid. → true when the grid changed
  function relock(t) {
    if (!lockS || lockS.fixed || lockS.checked) return false;
    // (the first bar with kicks; with none by then, the first bar with drums: a grid a 16th off hears no kick at all)
    const barSec = 240 / lockS.bpm, kicks = barCache.findIndex(b => [...(b.drums.bd || '')].filter(c => c === 'x').length >= 2), drums = barCache.findIndex(b => DRUM_ROWS.some(r => [...(b.drums[r] || '')].filter(c => c === 'x').length >= 2));
    const byDrums = kicks < 0 && !lockS.checkedDrums && drums >= 0 && barCache.length >= drums + RELOCK_BARS, k = byDrums ? drums : kicks;
    if (k < 0 || barCache.length < k + RELOCK_BARS) return false;
    // (the check on drums without kicks may come again with the kicks)
    if (byDrums) lockS.checkedDrums = true; else lockS.checked = true;
    const ta = lockS.downbeat + k * barSec, tz = Math.min(t, lockS.downbeat + (k + RELOCK_BARS) * barSec);
    const T = tempoOf(f1(ta), f1(tz));
    let bpm = lockS.bpm;
    // (a new tempo needs the backbeat, a clap every two of its beats: a groove of kicks alone fits two thirds of its tempo
    // as well, measured on decode-test-90)
    if (T && T.backbeat && [0.5, 2 / 3, 1.5, 2].some(r => Math.abs(T.bpm / (lockS.bpm * r) - 1) < 0.03)) bpm = T.bpm;
    // (the same tempo measured on more audio: a whole tempo the old one missed by a few hundredths keeps the grid on the
    // beat for minutes)
    const same = bpm === lockS.bpm;
    // (the same tempo measured again on those bars: a line through their onsets on the 16th grid; a whole tempo within 0.1
    // BPM of it replaces the old one, which may be off by 0.05 BPM and drift a 16th from its kicks in a minute)
    if (same) {
      const x = windowTempo(bpm, lockS.downbeat, ta, tz), whole = Math.round(bpm);
      if (x && Math.abs(x - bpm) < 0.3 && Math.abs(x - Math.round(x)) < 0.1) bpm = Math.round(x);
      // (or the whole tempo next to the old one, when the onsets of those bars sit on its grid as well)
      else if (whole !== bpm && Math.abs(whole - bpm) < 0.1 && gridError(whole, lockS.downbeat, ta, tz) <= 1.05 * gridError(bpm, lockS.downbeat, ta, tz)) bpm = whole;
    }
    // (the kicks of those bars on the old grid: on the beats, or on the off 8ths; the off 8ths alone move the grid by
    // half a beat, a groove with some off kicks does not)
    const beat = 60 / bpm;
    let db;
    if (same) {
      let on = 0, off = 0;
      for (const b of barCache.slice(k, k + RELOCK_BARS)) [...(b.drums.bd || '')].forEach((c, j) => { if (c !== 'x') return; if (j % 4 === 0) on++; else if (j % 4 === 2) off++; });
      // (hats only on the odd 16ths of the old grid: it sits a 16th off; the 16th before or after it, the one whose beat
      // phase scores better)
      let even = 0, odd = 0;
      for (const b of barCache.slice(k, k + RELOCK_BARS)) for (const r of ['hh', 'oh']) [...(b.drums[r] || '')].forEach((c, j) => { if (c === 'x') { if (j % 2) odd++; else even++; } });
      const half = off >= 8 && off >= 3 * on, bb = !!(T && T.backbeat), q = beat / 4;
      const moved = !half && odd >= 8 && odd >= 3 * even;
      const start = moved ? [lockS.downbeat - q, lockS.downbeat + q].sort((x, y) => phaseOf(beat, ta, tz, bb, y) - phaseOf(beat, ta, tz, bb, x))[0] : lockS.downbeat + (half ? beat / 2 : 0);
      const ph = windowPhase(bpm, start, ta, tz);
      if (half) db = downbeatOf(ph, beat, t1(firstSound()));
      else {
        // the same bar: the phase nearest the old downbeat (or the 16th moved)
        db = ph + Math.round((start - ph) / beat) * beat;
        while (db - 4 * beat >= -0.02) db -= 4 * beat;
        db = Math.max(0, db);
      }
    } else db = downbeatOf(windowPhase(bpm, phaseOf(beat, ta, tz, !!(T && T.backbeat)), ta, tz), beat, t1(firstSound()));
    if (bpm === lockS.bpm && Math.abs(db - lockS.downbeat) < 0.004) return false;
    if (byDrums && !(bpm !== lockS.bpm || Math.abs(db - lockS.downbeat) >= beat / 8)) return false;
    lockS = { ...lockS, bpm, candidates: [bpm / 2, bpm, bpm * 2].filter(x => x >= 40 && x <= 240).map(x => Math.round(x * 100) / 100), downbeat: db, relocked: { from: { bpm: lockS.bpm, downbeat: lockS.downbeat }, at: Math.round(t * 1000) / 1000 } };
    barCache.length = 0; held = null;
    return true;
  }
  // the beat phase (seconds): kicks weigh most, then snares, then hats; a Gaussian of 20 ms around each beat (hats
  // around each 8th, decode-refine D4: offbeat hats are on the grid too, and decide between a weak kick on the beat and a
  // loud bass note a 16th after it)
  // (scoreAt: the score of that phase instead, the relock compares two)
  function phaseOf(beat, ta, tz, backbeat = false, scoreAt = null) {
    const list = [...onsets.kick.filter(o => o.t >= ta && o.t < tz && kickLike(o)).map(o => ({ t: o.t, w: 1 })), ...onsets.snare.filter(o => o.t >= ta && o.t < tz && isClap(o)).map(o => ({ t: o.t, w: backbeat ? 1.5 : 0.6 })), ...onsets.hat.filter(o => o.t >= ta && o.t < tz).map(o => ({ t: o.t, w: 0.15, p: beat / 2 }))];
    if (scoreAt !== null) { let sc = 0; for (const o of list) { const P = o.p || beat, d = (((o.t - scoreAt) % P) + P) % P, dist = Math.min(d, P - d); sc += o.w * Math.exp(-0.5 * (dist / 0.02) ** 2); } return sc; }
    let best = { ph: 0, s: -1 };
    for (let ph = 0; ph < beat; ph += 0.004) {
      let sc = 0;
      for (const o of list) { const P = o.p || beat, d = (((o.t - ph) % P) + P) % P, dist = Math.min(d, P - d); sc += o.w * Math.exp(-0.5 * (dist / 0.02) ** 2); }
      if (sc > best.s) best = { ph, s: sc };
    }
    // fine step around the best
    for (let ph = best.ph - 0.004; ph <= best.ph + 0.004; ph += 0.0005) {
      let sc = 0;
      for (const o of list) { const P = o.p || beat, d = (((o.t - ph) % P) + P) % P, dist = Math.min(d, P - d); sc += o.w * Math.exp(-0.5 * (dist / 0.02) ** 2); }
      if (sc > best.s) best = { ph, s: sc };
    }
    return best.ph;
  }
  // the downbeat (D7): the beat of four where kicks and chord changes fall, with snares on two and four
  function downbeatOf(beatPhase, beat, start) {
    const first = beatPhase - Math.ceil((beatPhase - start + 0.05) / beat) * beat;
    const beats = []; for (let t = first; t < t1(done1 - 1); t += beat) if (t >= start - 0.05) beats.push(t);
    const near = (list, t) => { let s = 0; for (const o of list) { if (o.t > t + 0.05) break; if (Math.abs(o.t - t) <= 0.05) s = Math.max(s, o.s); } return s; };
    const kn = quantile(onsets.kick.map(o => o.s), 0.9) || 1, sn = quantile(onsets.snare.map(o => o.s), 0.9) || 1;
    const chromaAt = (a, z) => { const v = new Float64Array(12); for (let f = 0; f < done2; f++) { const tt = t2(f); if (tt >= a && tt < z) for (let c = 0; c < 12; c++) v[c] += chroma[f * 12 + c]; } return v; };
    const change = beats.map(t => 1 - cosSim(chromaAt(t - beat, t), chromaAt(t, t + beat)));
    const score = [0, 0, 0, 0];
    beats.forEach((t, i) => {
      const k = near(onsets.kick, t) / kn, s = near(onsets.snare, t) / sn;
      for (let o = 0; o < 4; o++) {
        const pos = (((i - o) % 4) + 4) % 4;
        if (pos === 0) score[o] += k + 1.5 * change[i] - 0.5 * s;
        else if (pos === 2) score[o] += 0.3 * k - 0.2 * s;
        else score[o] += 0.5 * s - 0.2 * change[i];
      }
    });
    // ties: the first beat with sound is a downbeat
    score[0] += 0.25;
    let o = 0; for (let k = 1; k < 4; k++) if (score[k] > score[o] + 1e-9) o = k;
    const bar = 4 * beat;
    let db = beats.length ? beats[o % beats.length] : start;
    while (db - bar >= -0.02) db -= bar;
    return Math.max(0, db);
  }
  // a tapped or picked tempo (level A), or level B's whole-file grid (confidence and uncertainty given)
  const setTempo = ({ bpm, downbeat, tapped = true, confidence, uncertain = false, round = 2 }) => {
    const L = lockS || { candidates: [], confidence: 0, uncertain: false };
    const k = 10 ** round, b = Math.round(bpm * k) / k;
    lockS = { ...L, bpm: b, candidates: [b / 2, b, b * 2].filter(x => x >= 40 && x <= 240).map(x => Math.round(x * k) / k), downbeat: downbeat ?? L.downbeat ?? 0, uncertain, tapped, fixed: true, ...(confidence !== undefined ? { confidence } : {}) };
    barCache.length = 0; held = null;
    return lockS;
  };
  // back to the tempo misk-analyzer finds itself (the Auto button after a tapped or picked tempo): the next model locks again
  const resetTempo = () => { lockS = null; barCache.length = 0; held = null; };

  // ---------- level B: one beat grid for the whole file ----------
  // the onsets that mark the grid: kicks, claps and snares, hats (lighter); each falls on a 16th of the beat
  const gridPoints = () => {
    advance(duration); findOnsets();
    return [...onsets.kick.filter(kickLike).map(o => ({ t: o.t, w: 1 })), ...onsets.snare.filter(isClap).map(o => ({ t: o.t, w: 0.7 })), ...onsets.hat.filter(isHat).map(o => ({ t: o.t, w: 0.2 }))];
  };
  // the beat phase (seconds) of a known tempo that puts the onsets heard between ta and tz on its 16th grid best: the
  // weighted mean offset of the onsets near the grid, from `ph`, with a narrower window each pass (the relock, D4; the
  // same points as fitGrid, never past the frames analysed)
  function windowPhase(bpm, ph, ta, tz) {
    const P = 60 / bpm, q = P / 4, pts = [...onsets.kick.filter(o => kickLike(o)).map(o => ({ t: o.t, w: 1 })), ...onsets.snare.filter(isClap).map(o => ({ t: o.t, w: 0.7 })), ...onsets.hat.filter(isHat).map(o => ({ t: o.t, w: 0.2 }))].filter(p => p.t >= ta && p.t < tz);
    let a = ph;
    for (const tol of [0.05, 0.035, 0.025]) {
      let sw = 0, sr = 0;
      for (const p of pts) { const m = Math.round((p.t - a) / q), r = p.t - (a + m * q); if (Math.abs(r) <= tol) { sw += p.w; sr += p.w * r; } }
      if (sw < 4) break;
      a += sr / sw;
    }
    return ((a % P) + P) % P;
  }
  // how far the onsets heard between ta and tz sit from the 16th grid of bpm (its phase fitted from ph): the weighted
  // mean distance (seconds) of those within 40 ms; Infinity with too few
  function gridError(bpm, ph, ta, tz) {
    const q = 15 / bpm, a = windowPhase(bpm, ph, ta, tz), pts = [...onsets.kick.filter(o => kickLike(o)).map(o => ({ t: o.t, w: 1 })), ...onsets.snare.filter(isClap).map(o => ({ t: o.t, w: 0.7 })), ...onsets.hat.filter(isHat).map(o => ({ t: o.t, w: 0.2 }))].filter(p => p.t >= ta && p.t < tz);
    let sw = 0, se = 0;
    for (const p of pts) { const r = Math.abs(p.t - (a + Math.round((p.t - a) / q) * q)); if (r <= 0.04) { sw += p.w; se += p.w * r; } else { sw += p.w; se += p.w * 0.04; } }
    return sw >= 4 ? se / sw : Infinity;
  }
  // the tempo (BPM) of a line through the onsets heard between ta and tz near the 16th grid of bpm and phase ph (the
  // relock, D4); null with too few onsets
  function windowTempo(bpm, ph, ta, tz) {
    const pts = [...onsets.kick.filter(o => kickLike(o)).map(o => ({ t: o.t, w: 1 })), ...onsets.snare.filter(isClap).map(o => ({ t: o.t, w: 0.7 })), ...onsets.hat.filter(isHat).map(o => ({ t: o.t, w: 0.2 }))].filter(p => p.t >= ta && p.t < tz);
    let q = 15 / bpm, a = ph;
    for (const tol of [0.04, 0.03, 0.025]) {
      let sw = 0, sm = 0, st = 0, smm = 0, smt = 0, n = 0;
      for (const p of pts) { const m = Math.round((p.t - a) / q), r = p.t - (a + m * q); if (Math.abs(r) <= tol) { sw += p.w; sm += p.w * m; st += p.w * p.t; smm += p.w * m * m; smt += p.w * m * p.t; n++; } }
      const den = sw * smm - sm * sm;
      if (n < 16 || !(den > 0)) return null;
      const q2 = (sw * smt - sm * st) / den;
      if (!(q2 > 0.9 * q && q2 < 1.1 * q)) return null;
      q = q2; a = (st - q * sm) / sw;
    }
    return 15 / q;
  }
  // the tempo and beat phase that put the onsets of the whole file on a 16th grid best: a weighted least-squares line
  // through the onsets near the grid (t = a + m·P/4), three passes with a narrower window; a whole tempo when it fits
  // almost as well. A tempo off by 0.05 BPM drifts by 0.1 s over four minutes: the line keeps the code on the beat.
  function fitGrid(bpm, beatPhase) {
    const all = gridPoints(), t0 = all.length ? Math.min(...all.map(p => p.t)) : 0;
    let P = 60 / bpm, a = beatPhase, rms = Infinity, used = 0;
    // the line grows from the first 20 seconds of music to the whole file, so a small tempo error never puts a late onset
    // on the wrong 16th
    const fit = (fixP = null) => {
      let best = null;
      for (const [span, tol] of [[20, 0.05], [40, 0.04], [80, 0.035], [160, 0.03], [Infinity, 0.03], [Infinity, 0.025]]) {
        let sw = 0, sm = 0, st = 0, smm = 0, smt = 0;
        const q = P / 4, list = [], pts = all.filter(p => p.t < t0 + span);
        for (const p of pts) { const m = Math.round((p.t - a) / q), r = p.t - (a + m * q); if (Math.abs(r) <= tol) list.push({ m, t: p.t, w: p.w }); }
        if (list.length < 8) continue;
        for (const x of list) { sw += x.w; sm += x.w * x.m; st += x.w * x.t; smm += x.w * x.m * x.m; smt += x.w * x.m * x.t; }
        const den = sw * smm - sm * sm;
        let q2 = fixP ? fixP / 4 : den > 0 ? (sw * smt - sm * st) / den : q;
        if (!(q2 > 0.5 * q && q2 < 2 * q)) q2 = q;
        const a2 = (st - q2 * sm) / sw;
        P = q2 * 4; a = a2;
        let e = 0; for (const x of list) e += x.w * (x.t - (a + x.m * q2)) ** 2;
        best = { P, a, rms: Math.sqrt(e / sw), n: list.length };
      }
      return best;
    };
    const free = fit();
    if (!free) return { bpm, beatPhase, rms: null, n: 0 };
    ({ P, a, rms, n: used } = free);
    const whole = Math.round(60 / P);
    if (Math.abs(whole - 60 / P) < 0.08) {
      const keep = { P, a };
      const w = fit(60 / whole);
      if (w && w.rms <= rms * 1.15 + 0.0005) ({ P, a, rms, n: used } = w); else ({ P, a } = keep);
    }
    return { bpm: 60 / P, beatPhase: ((a % P) + P) % P, rms, n: used };
  }
  // the tempo within 1.5 % of bpm whose pulse collects the most onset strength over the whole file (a comb on the onset
  // envelope, steps of 0.01 BPM): a tempo estimated on a few seconds, or by another engine, made exact enough for the
  // line fit
  function wholeTempo(bpm) {
    advance(duration); findOnsets();
    const env = envelope(0, done1);
    let best = { bpm, score: -Infinity };
    for (let b = bpm * 0.985; b <= bpm * 1.015; b += 0.01) { const c = comb(env, (60 * fr) / b); if (c.score > best.score) best = { bpm: b, score: c.score }; }
    return best.bpm;
  }
  // the beat phase (seconds) from every onset of the file: kicks weigh most, then snares and claps, then hats (an
  // intro of offbeat hats alone cannot shift the beat by half)
  const wholePhase = bpm => { advance(duration); findOnsets(); return phaseOf(60 / bpm, 0, duration, true); };
  // the downbeat of a beat grid over the whole file (the beat of four where kicks and chord changes fall)
  const gridDownbeat = (bpm, beatPhase) => { advance(duration); findOnsets(); return downbeatOf(beatPhase, 60 / bpm, t1(firstSound())); };

  // ---------- bars ----------
  const barCache = [];
  let held = null;
  let hitNorm = { kickPeak: 1, kick: 1, snare: 1, hat: 1 };
  function barOf(i, barSec, downbeat) {
    const start = downbeat + i * barSec, end = start + barSec, step = barSec / STEPS, tol = Math.min(0.045, step * 0.35);
    const strengths = { bd: new Float64Array(STEPS), cp: new Float64Array(STEPS), hh: new Float64Array(STEPS), oh: new Float64Array(STEPS) };
    const take = (list, row, test = null, norm = 1) => {
      for (const o of list) {
        if (o.t < start - tol) continue;
        if (o.t >= end - tol) break;
        const j = Math.round((o.t - start) / step);
        if (j < 0 || j >= STEPS || Math.abs(o.t - (start + j * step)) > tol) continue;
        const r = test ? test(o) : row;
        if (!r) continue;
        strengths[r][j] = Math.max(strengths[r][j], o.s / norm);
      }
    };
    // kick strength: the peak of the low band at the hit, so a bass note held before it does not hide it
    for (const o of onsets.kick) {
      if (o.t < start - tol) continue;
      if (o.t >= end - tol) break;
      const j = Math.round((o.t - start) / step);
      if (j < 0 || j >= STEPS || Math.abs(o.t - (start + j * step)) > tol || !kickLike(o)) continue;
      strengths.bd[j] = Math.max(strengths.bd[j], kickPeak(o) / hitNorm.kickPeak);
    }
    // the every-beat rule (decode-refine D4): a kick under a loud bass (an acid line on the kick's own notes) loses its
    // pitch fall and often its onset; a rise of the low band on each of the bar's four beats is a four-on-the-floor kick
    // even when the pitch test reads a bass note. (A bass on every beat alone would read as kicks too: rare in the songs
    // measured, and the low band's rise then sounds like a kick anyway.)
    const beats = [0, 4, 8, 12].map(j => beatKick(start + j * step, tol));
    if (beats.every(v => v >= KICK_RULE.beat * hitNorm.kickPeak)) beats.forEach((v, k) => { strengths.bd[4 * k] = Math.max(strengths.bd[4 * k], v / hitNorm.kickPeak); });
    // a snare or clap is noise: it reaches the air band (5 to 11 kHz) too; a chord's attack does not
    // clap or snare against hat (and a kick's click, a chord's attack): the ratio of the snare band's rise to the hat
    // band's, against the ratio of this track's own hats (a clap is about three to five times "darker" than the hats)
    take(onsets.snare, 'cp', o => (isClap(o) ? 'cp' : null), hitNorm.snare);
    // hats (decode-refine D4): their strength is the hat band's rise against the track's strong hats, and a step is on
    // above a share of the median of the hats of the last bars, not of the bar's loudest: quieter closed hats between
    // loud open ones are kept
    const hatRise = o => rise('hat', o) / kit.hatTop;
    for (const o of onsets.hat) {
      if (o.t < start - tol) continue;
      if (o.t >= end - tol) break;
      const j = Math.round((o.t - start) / step);
      if (j < 0 || j >= STEPS || Math.abs(o.t - (start + j * step)) > tol || !isHat(o)) continue;
      const r = openHat(o) ? 'oh' : 'hh';
      strengths[r][j] = Math.max(strengths[r][j], hatRise(o));
    }
    const near = []; for (const o of onsets.hat) { if (o.t < start - HAT_RULE.bars * barSec) continue; if (o.t >= end) break; if (isHat(o)) near.push(hatRise(o)); }
    const hatFloor = HAT_RULE.median * quantile(near, 0.5);
    // steps on above 50 % of the strongest step of the band, off below 30 % (hysteresis on the bar before, D9); a band
    // whose strongest step is weak plays nothing; hats above their floor
    const prev = barCache[i - 1];
    const drums = {};
    for (const r of DRUM_ROWS) {
      const s = strengths[r], top = Math.max(...s), was = prev && prev.drums ? prev.drums[r] : '';
      if (top < 0.22) { drums[r] = '.'.repeat(STEPS); continue; }
      if (r === 'hh' || r === 'oh') { drums[r] = Array.from(s, v => (v > 0 && v >= hatFloor ? 'x' : '.')).join(''); continue; }
      drums[r] = Array.from(s, (v, j) => (v >= 0.5 * top || (was[j] === 'x' && v >= 0.3 * top) ? 'x' : '.')).join('');
    }
    // the snare band also catches the chords' attacks: a "clap" on every step a chord changes is no clap
    // bass: one note per step, YIN on the low-passed signal in the second half of the step (after the kick's click)
    // bass: a note where a new note starts (the low band rises after the step before, or the pitch moves), its pitch by
    // YIN twice in the step (a kick's falling pitch never holds); the kick's own tail is no note
    const bass = bassSteps(start, step);
    // levels and colour
    const fa = Math.max(0, f1(start)), fz = Math.min(done1, f1(end));
    const kickNear = new Set(); for (const o of onsets.kick) { if (o.t < start - 0.1) continue; if (o.t > end) break; for (let k = 0; k < Math.round(0.07 * fr); k++) kickNear.add(o.f + k); }
    let lowS = 0, lowN = 0; for (let f = fa; f < fz; f++) if (!kickNear.has(f)) { lowS += energy.low[f]; lowN++; }
    const raw = { drums: DRUM_ROWS.reduce((a, r) => a + Math.max(...strengths[r]) * (r === 'oh' ? 0.5 : 1), 0), bass: lowN ? lowS / lowN : 0, chords: mean(energy.mid, fa, fz), other: mean(energy.high, fa, fz) };
    const tot = mean(energy.total, fa, fz);
    const bright = Math.min(1, mean(cent, fa, fz) / 6000), low = tot ? Math.min(1, mean(energy.low, fa, fz) / tot) : 0;
    // chord: the bar's chroma against 24 templates, the bass note's pitch class as a small prior
    // the bar's chroma; a bass note's 5th, 7th, 9th, 10th, 11th and 13th harmonics are left out (a low bass's 5th
    // harmonic is a major third above it and would turn every minor chord major)
    const v = new Float64Array(12), harm = [];
    for (const m of new Set([...bass.filter(x => x !== null), ...heardPitches])) { const f0 = 440 * 2 ** ((m - 69) / 12); for (const k of [5, 7, 9, 10, 11, 13]) harm.push(f0 * k); }
    for (let f = 0; f < done2; f++) {
      const tt = t2(f); if (tt < start + barSec * 0.04 || tt >= end - barSec * 0.04) continue;
      const pk = peaks[f]; if (!pk) continue;
      for (let i = 0; i < pk.length; i += 2) { const hz = pk[i]; if (harm.some(h => Math.abs(hz / h - 1) < 0.025)) continue; v[((Math.round(midiOf(hz)) % 12) + 12) % 12] += pk[i + 1]; }
    }
    const bassPc = (() => { const cnt = new Array(12).fill(0); for (const m of bass) if (m !== null) cnt[((m % 12) + 12) % 12]++; const mx = Math.max(...cnt); return mx >= 3 ? cnt.indexOf(mx) : -1; })();
    // the chord from the whole chroma; the chroma without the bass's upper harmonics only settles the third (same root)
    const full = new Float64Array(12);
    for (let f = 0; f < done2; f++) { const tt = t2(f); if (tt < start + barSec * 0.04 || tt >= end - barSec * 0.04) continue; for (let c = 0; c < 12; c++) full[c] += chroma[f * 12 + c]; }
    const bestOf = x => { let best = null; for (const T of TEMPLATES) { const sc = cosSim(x, T.v) + (T.root === bassPc ? 0.06 : 0); if (!best || sc > best.s) best = { s: sc, T }; } return best; };
    let chord = null, chordConf = 0, third = false;
    if (full.some(x => x > 0)) {
      let best = bestOf(full);
      const ex = harm.length && v.some(x => x > 0) ? bestOf(v) : null;
      // (only major to minor: leaving the harmonics out removes major-third energy, so it never argues for major; the
      // minor third must hold a fair share of the root and beat the major third)
      const r0 = best.T.root, m3 = (r0 + 3) % 12, M3 = (r0 + 4) % 12;
      // (decode-refine D5: a quiet minor third, an eighth of the root, that beats the major third three times, as a stab
      // under a distorted acid bass, only marks the bar `third`: a major chord whose third sits on a bass harmonic looks
      // the same here, and level B decides with the key)
      const fair = v[m3] > 1.2 * v[M3] && v[m3] >= 0.3 * v[r0], quiet = v[m3] > 3 * v[M3] && v[m3] >= 0.12 * v[r0];
      if (ex && best.T.quality === 'maj' && fair) best = { s: best.s, T: TEMPLATES.find(T => T.root === r0 && T.quality === 'min') };
      else if (ex && best.T.quality === 'maj' && quiet) third = true;
      chord = chordName(best.T.root, best.T.quality); chordConf = Math.round(Math.min(1, best.s) * 100) / 100;
    }
    return { start: Math.round(start * 1000) / 1000, chord, chordConf, ...(third ? { third: true } : {}), bass, drums, raw, chroma: Array.from(full, x => Math.round(x * 10) / 10), chromaEx: Array.from(v, x => Math.round(x * 10) / 10), bright: Math.round(bright * 100) / 100, low: Math.round(low * 100) / 100, top: topOf(start, end, bass) };
  }
  // the top line of a bar (decode-refine D6): `up`, the median over its frames of the share of the tonal peaks'
  // energy between 400 and 2000 Hz (no harmonic of a bass note) in all of the frame's tonal energy (60 to 2100 Hz). A
  // hook, an arp or a voice lifts it (0.25 to 0.7 on the owner's test files); bass, drums and a low pad keep it near
  // 0.1 to 0.2. It cannot tell a voice from a synth (part 2 of decode-refine brings a real top line)
  function topOf(start, end, bass) {
    const harm = [];
    for (const m of new Set(bass.filter(x => x !== null))) { const f0 = 440 * 2 ** ((m - 69) / 12); for (let k = 1; k <= 8; k++) harm.push(f0 * k); }
    const share = [];
    for (let f = 0; f < done2; f++) {
      const tt = t2(f); if (tt < start || tt >= end) continue;
      const pk = peaks[f]; let s = 0;
      if (pk) for (let i = 0; i < pk.length; i += 2) { const x = pk[i]; if (x >= 400 && x <= 2000 && !harm.some(h => Math.abs(x / h - 1) < 0.025)) s += pk[i + 1]; }
      share.push(chromaE[f] > 0 ? s / chromaE[f] : 0);
    }
    share.sort((a, b) => a - b);
    return { up: share.length ? Math.round(share[Math.floor(share.length / 2)] * 100) / 100 : 0 };
  }
  const rmsOf = (x, a, z) => { a = Math.max(0, Math.round(a)); z = Math.min(x.length, Math.round(z)); let s = 0; for (let i = a; i < z; i++) s += x[i] * x[i]; return z > a ? Math.sqrt(s / (z - a)) : 0; };
  let bassTop = 0;
  let heardPitches = new Set();
  function bassSteps(start, step) {
    heardPitches = new Set();
    const x = bassSignal(), out = [], L = step * decRate, tmax = Math.floor(decRate / 30);
    // one pitch window inside the first 85 % of the step, and a second one later when the step is long enough
    const w = Math.max(64, Math.min(200, Math.round(0.75 * L - tmax)));
    let prev = null;
    const kickAt = j => onsets.kick.some(o => Math.abs(o.t - (start + j * step)) <= 0.03 && kickLike(o));
    for (let j = 0; j < STEPS; j++) {
      const s0 = (start + j * step) * decRate;
      const head = rmsOf(x, s0 + 0.1 * L, s0 + 0.5 * L), tail = rmsOf(x, s0 + 0.6 * L, s0 + 0.95 * L), before = rmsOf(x, s0 - 0.35 * L, s0 - 0.05 * L);
      bassTop = Math.max(bassTop, head);
      // (YIN at 0.2, then, on the step after a kick, at BASS_RULE.loose: a detuned unison bass, a supersaw, under a kick's
      // tail is periodic enough only for a looser threshold, decode-refine D5; elsewhere it found notes in a pad)
      const late = s0 + 0.1 * L + w / 2, twice = th => { const a = yin(x, Math.round(s0 + 0.1 * L), decRate, { w, threshold: th, fmin: 30, fmax: 260 }), b = late + w + tmax < s0 + 0.95 * L ? yin(x, Math.round(late), decRate, { w, threshold: th, fmin: 30, fmax: 260 }) : a; return [a ? midiOf(a.f0) : null, b ? midiOf(b.f0) : null]; };
      let [m1, m2] = twice(0.2);
      const agree = (a, b) => a !== null && b !== null && Math.abs(a - b) < 0.6;
      // (at the looser threshold one window alone may hold the pitch: the other sits in the kick's tail)
      let loose = false;
      if (!agree(m1, m2) && head > 0.12 * bassTop && kickAt(j - 1)) { const [l1, l2] = twice(BASS_RULE.loose); if (agree(l1, l2)) [m1, m2] = [l1, l2]; else if ((l1 === null) !== (l2 === null)) m1 = m2 = l1 ?? l2; loose = agree(m1, m2); }
      const voiced = agree(m1, m2) && head > 0.12 * bassTop;
      // a kick alone: its low end dies within the step
      const kickOnly = kickAt(j) && tail < 0.45 * head;
      const midi = voiced ? Math.round((m1 + m2) / 2) : null;
      // a new note needs an attack, or a new pitch at about the same level (a kick's tail fades at its own pitch)
      // (or, D5, a pitch heard only at the looser threshold right after a kick: the kick's tail is louder than a short
      // bass note and hides its attack; a kick's own tail is a clean sine the usual threshold hears, and never a note)
      const underKick = loose && (out[j - 1] ?? null) === null && (out[j - 2] ?? null) === null;
      const fresh = voiced && !kickOnly && (head > 1.4 * before || (prev !== null && Math.abs(midi - prev) >= 1 && head > 0.7 * before) || underKick);
      out.push(fresh ? midi : null);
      prev = m1 !== null ? Math.round(m1) : null;
      if (voiced && !kickOnly) heardPitches.add(midi);
    }
    return out;
  }
  // the top line by YIN (decode-refine D2, level B without Essentia.js): the 200-2000 Hz band, decimated by 4, one pitch
  // per 16th step (a window in the step's middle) → per bar 16 fractional MIDI notes or null
  let topSig = null;
  function topLineYin(downbeat, barSec, n) {
    if (!topSig) { const bp = lowpass(lowpass(highpass(highpass(pcm, sr, 200), sr, 200), sr, 2000), sr, 2000); topSig = new Float32Array(Math.floor(bp.length / 4)); for (let i = 0; i < topSig.length; i++) topSig[i] = bp[i * 4]; }
    const r = sr / 4, step = barSec / STEPS, w = Math.max(48, Math.min(256, Math.round(0.45 * step * r))), out = [];
    for (let i = 0; i < n; i++) {
      const notes = [];
      for (let j = 0; j < STEPS; j++) {
        const s0 = (downbeat + i * barSec + j * step) * r, p = yin(topSig, Math.round(s0 + 0.2 * step * r), r, { w, threshold: 0.25, fmin: 190, fmax: 2100 });
        notes.push(p && rmsOf(topSig, s0, s0 + step * r) > TOP_LINE.floor * topTop() ? midiOf(p.f0) : null);
      }
      out.push(notes);
    }
    return out;
  }
  let topMax = 0;
  const topTop = () => { if (!topMax) { for (let i = 0; i < topSig.length; i += 64) topMax = Math.max(topMax, Math.abs(topSig[i])); topMax = topMax || 1; } return topMax; };

  // the bars complete before t (with a frame of margin for the onsets)
  function bars(t) {
    if (!lockS) return [];
    const barSec = 240 / lockS.bpm, db = lockS.downbeat;
    advance(Math.min(duration, t + 0.06));
    findOnsets();
    const n = Math.max(0, Math.floor((Math.min(t, duration) - db) / barSec + 1e-6));
    const norm = { kickPeak: quantile(onsets.kick.filter(kickLike).map(kickPeak), 0.9) || 1, kick: quantile(onsets.kick.map(o => o.s), 0.9) || 1, snare: quantile(onsets.snare.map(o => o.s), 0.9) || 1, hat: quantile(onsets.hat.map(o => o.s), 0.9) || 1 };
    // the hit scale settles in the first bars: bars cached before it settled are made again
    if (barCache.length < 8) barCache.length = 0;
    hitNorm = norm;
    for (let i = barCache.length; i < n; i++) barCache.push(barOf(i, barSec, db));
    return barCache.slice(0, n);
  }
  // levels per part: each bar's raw value against the loudest bar so far (0 to 1)
  function levels(list) {
    const top = { drums: 0, bass: 0, chords: 0, other: 0 };
    for (const b of list) for (const k of Object.keys(top)) top[k] = Math.max(top[k], b.raw[k]);
    return list.map(b => ({ ...b, level: Object.fromEntries(Object.keys(top).map(k => [k, top[k] ? Math.round((b.raw[k] / top[k]) * 100) / 100 : 0])) }));
  }
  // key from the bars' chroma (Krumhansl), the mode settled by chord evidence (the tonic triad heard more often)
  function keyOf(list) {
    const sum = new Array(12).fill(0);
    for (const b of list) { const c = b.chord && parseChordName(b.chord); if (!c) continue; const w = Math.max(0.3, b.chordConf || 0.5); sum[c.root] += 1.2 * w; sum[(c.root + (c.quality === 'min' ? 3 : 4)) % 12] += w; sum[(c.root + 7) % 12] += w; }
    if (!sum.some(x => x > 0)) return null;
    let best = null;
    for (const mode of ['major', 'minor']) for (let r = 0; r < 12; r++) { const s = pearson(sum, rotate(KP[mode], r)); if (!best || s > best.s) best = { root: r, mode, s }; }
    // relative major and minor: count the tonic chords of each
    const rel = best.mode === 'major' ? { root: (best.root + 9) % 12, mode: 'minor' } : { root: (best.root + 3) % 12, mode: 'major' };
    const count = k => list.filter(b => b.chord === chordName(k.root, k.mode === 'minor' ? 'min' : 'maj') && (!b.level || b.level.chords >= 0.2)).length;
    const heardChords = list.filter(b => b.chord && (!b.level || b.level.chords >= 0.2)), name = k => chordName(k.root, k.mode === 'minor' ? 'min' : 'maj');
    const firstLast = k => (heardChords[0] && heardChords[0].chord === name(k) ? 3 : 0) + (heardChords.length && heardChords[heardChords.length - 1].chord === name(k) ? 1.5 : 0);
    const a = count(best) + firstLast(best), b = count(rel) + firstLast(rel);
    const k = b > a ? rel : { root: best.root, mode: best.mode };
    return { root: k.root, mode: k.mode, conf: Math.round(Math.max(0, best.s) * 100) / 100 };
  }
  // the model with every bar complete before t
  function model(t = duration) {
    const m = emptyModel({ duration: Math.round(duration * 1000) / 1000 });
    if (!lockS && !lock(t)) return m;
    bars(t);
    if (relock(t)) bars(t);
    const list = levels(bars(t));
    Object.assign(m, { ...(lockS.relocked ? { relocked: lockS.relocked } : {}), bpm: lockS.bpm, bpmCandidates: lockS.candidates, confidence: lockS.confidence, uncertain: !!lockS.uncertain, downbeat: Math.round(lockS.downbeat * 10000) / 10000, barSeconds: 240 / lockS.bpm, tapped: !!lockS.tapped, analysedTo: Math.min(duration, t) });
    m.bars = list.map(({ raw, chroma: c, chromaEx, ...b }) => b);
    m.key = keyOf(list);
    m.sections = [{ start: 0, bars: list.length, kind: 'verse' }];
    return m;
  }
  return { duration, advance, lock, model, setTempo, resetTempo, fitGrid, gridDownbeat, wholeTempo, wholePhase, get locked() { return lockS; }, onsets: () => { advance(duration); findOnsets(); return onsets; }, tempoOf: (a, z) => tempoOf(Math.round(a * fr), Math.round(z * fr)), rise: (band, o) => rise(band, o), barsRaw: t => bars(t), topLineYin };
}

// level A's horizon (D8): the playhead plus the look ahead; values 'off', '2s', '4s', '2bars', '4bars'
export const LOOK_AHEAD = ['off', '2s', '4s', '2bars', '4bars'];
export const LOOK_AHEAD_DEFAULT = '2bars';
export function horizonOf(playhead, look, barSeconds = 2) {
  const v = { off: 0, '2s': 2, '4s': 4, '2bars': 2 * barSeconds, '4bars': 4 * barSeconds }[LOOK_AHEAD.includes(look) ? look : LOOK_AHEAD_DEFAULT];
  return playhead + v;
}

// tap tempo (D7): four taps or more give the tempo (median interval) and the phase (the first tap is a downbeat)
export function tapTempo(times) {
  if (!Array.isArray(times) || times.length < 4) return null;
  const iv = []; for (let i = 1; i < times.length; i++) iv.push(times[i] - times[i - 1]);
  const beat = quantile(iv, 0.5);
  if (!(beat > 0.25 && beat < 1.5)) return null;
  const bpm = Math.round((60 / beat) * 100) / 100, bar = 4 * beat;
  // the first tap is a downbeat: the bar grid through it, its earliest bar at or after zero
  let db = times[0];
  while (db - bar >= 0) db -= bar;
  return { bpm, downbeat: Math.round(db * 10000) / 10000 };
}
