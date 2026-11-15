// The learned beat tracker for level B (decode-beat-tracker, round 10): Beat This! (Foscarin, Schlüter, Widmer, ISMIR
// 2024; code and weights MIT, Institute of Computational Perception, JKU Linz), run with ONNX Runtime. Bench only for
// now: tools/beat-this-node.mjs runs it in Node for decode-bench.cjs --beat-this; the app does not offer it (the round 10
// verdict: on the real tracks it moved three files' band error by more than 0.5 dB; the in-app download was specified
// and built, then left out). This file is pure (no runtime, no network): the files and their pins, the resampling to the
// model's rate, the chunks the model reads, the "minimal" post-processing of the reference code
// (beat_this/model/postprocessor.py) and the beat grid level B takes from the beats. engine-beat-this.js runs the model.

// the files, pinned: a format conversion of the official final0 checkpoint (and its log-mel front end) published on a
// model hub at a fixed revision. Each file's SHA-256 is checked before every load; a file that does not match is refused. Verified (decode round 10): the model's ONNX Runtime output equals the official
// checkpoint run in PyTorch within 1e-4 on a bench song, and the front end equals the reference LogMelSpect within 2e-4.
export const BEAT_THIS_REVISION = '0d66b58ee1b3b42ec5e82334949626295f3ed82b';
const HUB = `https://huggingface.co/nilsbc/beat-this-onnx/resolve/${BEAT_THIS_REVISION}`;
export const BEAT_THIS_FILES = {
  mel: { name: 'logmel.onnx', url: `${HUB}/logmel.onnx`, bytes: 4468830, sha256: 'f5afa499f5a42b05ea89a214561170cd4b76f92d67d3227f7c9833e8d79bbb43' },
  model: { name: 'beat_this_final0.onnx', url: `${HUB}/beat_this_final0.onnx`, bytes: 83162700, sha256: 'a7e2c68b27f9db6a73416017f784ea8551a01373f4955a98db018827760c4a14' },
};
export const BEAT_THIS_ID = 'beat-this';
export const BEAT_THIS_VERSION = 'final0';
export const BEAT_THIS_BYTES = BEAT_THIS_FILES.mel.bytes + BEAT_THIS_FILES.model.bytes;
export const BT = { sr: 22050, fps: 50, chunk: 1500, border: 6 };

// a mono signal at `sr` to the model's 22,050 Hz: a windowed-sinc low-pass (cut at 10.5 kHz, under the new Nyquist)
// evaluated at the new times. 44.1 kHz, the analysis copy's rate, is the exact case of every second sample.
export function toModelRate(pcm, sr) {
  if (sr === BT.sr) return pcm instanceof Float32Array ? pcm : Float32Array.from(pcm);
  const ratio = sr / BT.sr, n = Math.floor(pcm.length / ratio), out = new Float32Array(n);
  const fc = Math.min(1, 1 / ratio) * (10500 / 11025), half = 32;
  // the kernel, sampled on a fine table (the fractional offsets of a non-integer ratio read the nearest entry)
  const fine = 64, table = new Float32Array(2 * half * fine + 1);
  for (let k = 0; k < table.length; k++) {
    const x = k / fine - half, w = 0.42 + 0.5 * Math.cos((Math.PI * x) / half) + 0.08 * Math.cos((2 * Math.PI * x) / half);
    table[k] = fc * (x === 0 ? 1 : Math.sin(Math.PI * fc * x) / (Math.PI * fc * x)) * w;
  }
  for (let i = 0; i < n; i++) {
    const c = i * ratio, c0 = Math.floor(c), f = c - c0;
    let s = 0;
    for (let j = -half + 1; j <= half; j++) {
      const k = c0 + j; if (k < 0 || k >= pcm.length) continue;
      s += pcm[k] * table[Math.round((j - f + half) * fine)];
    }
    out[i] = s;
  }
  return out;
}

// the chunks of the spectrogram the model reads (beat_this split_piece, avoid_short_end): `chunk` frames each, the first
// and the last padded with `border` frames, consecutive chunks overlapping by `border` → the start frames (the first is
// −border)
export function chunkStarts(frames, chunk = BT.chunk, border = BT.border) {
  const starts = [];
  for (let s = -border; s < frames - border; s += chunk - 2 * border) starts.push(s);
  if (frames > chunk - 2 * border) starts[starts.length - 1] = frames - (chunk - border);
  return starts;
}
// one chunk of a (frames × 128) spectrogram, zero padded as split_piece pads it → { data, frames }
export function chunkOf(spec, frames, start, bins = 128, chunk = BT.chunk, border = BT.border) {
  const a = Math.max(start, 0), z = Math.min(start + chunk, frames), left = Math.max(0, -start), right = Math.max(0, Math.min(border, start + chunk - frames));
  const len = left + (z - a) + right, data = new Float32Array(len * bins);
  data.set(spec.subarray(a * bins, z * bins), left * bins);
  return { data, frames: len };
}
// the chunks' predictions joined (aggregate_prediction, keep_first): the borders dropped, an earlier chunk wins where two
// overlap. preds: [{ beat, downbeat }] in the order of `starts` → { beat, downbeat } of `frames` logits (−1000 elsewhere)
export function joinChunks(preds, starts, frames, chunk = BT.chunk, border = BT.border) {
  const beat = new Float32Array(frames).fill(-1000), downbeat = new Float32Array(frames).fill(-1000);
  for (let c = preds.length - 1; c >= 0; c--) {
    const s = starts[c], p = preds[c];
    for (let i = border; i < p.beat.length - border; i++) { const t = s + i; if (t < 0 || t >= frames || i >= chunk - border) continue; beat[t] = p.beat[i]; downbeat[t] = p.downbeat[i]; }
  }
  return { beat, downbeat };
}

// groups of adjacent peak frames (at most `width` apart) → their mean (deduplicate_peaks)
export function dedupePeaks(peaks, width = 1) {
  const out = [];
  if (!peaks.length) return out;
  let p = peaks[0], c = 1;
  for (let i = 1; i < peaks.length; i++) {
    const q = peaks[i];
    if (q - p <= width) { c++; p += (q - p) / c; } else { out.push(p); p = q; c = 1; }
  }
  out.push(p);
  return out;
}
// the "minimal" post-processing: a frame is a peak where it is the maximum of the 7 frames around it and its logit is
// above 0; adjacent peaks merged; frames to seconds; each downbeat moved to the nearest beat → { beats, downbeats }
export function peaksOf(logits, fps = BT.fps) {
  const n = logits.length, peaks = [];
  for (let i = 0; i < n; i++) {
    const v = logits[i]; if (!(v > 0)) continue;
    let max = -Infinity; for (let k = Math.max(0, i - 3); k <= Math.min(n - 1, i + 3); k++) if (logits[k] > max) max = logits[k];
    if (v === max) peaks.push(i);
  }
  return dedupePeaks(peaks).map(f => f / fps);
}
export function postprocess({ beat, downbeat }, fps = BT.fps) {
  const beats = peaksOf(beat, fps);
  let downbeats = peaksOf(downbeat, fps);
  if (beats.length) downbeats = downbeats.map(d => { let best = beats[0]; for (const b of beats) if (Math.abs(b - d) < Math.abs(best - d)) best = b; return best; });
  downbeats = [...new Set(downbeats)].sort((a, b) => a - b);
  return { beats, downbeats };
}

// the beat grid level B takes from the tracker's beats (decode round 10). A beat closer than `minIbi` to the last kept one
// is dropped (bursts of fake beats on driven drums, a spike read as 250 BPM on the bench); the tempo is 60 over the
// median interval; the grid is a straight line through the beats (each beat numbered by its distance from the first
// in median intervals, a missed beat skipping its number), so a 6-minute file keeps one exact tempo and no drift; the
// downbeat is the beat of the four that holds most of the tracker's downbeats. steady: at least `rate` beats a second
// and the intervals' spread (coefficient of variation) under `cv` (a pad-only song: 0.3 beats a second, CV 2.7; every
// song with a beat at least 1.97 and at most 0.55 on the bench)
export const BEAT_GRID = { minIbi: 0.25, rate: 1, cv: 0.6, fit: 0.15, search: 0.04 };
export function beatGrid({ beats, downbeats }, duration = null, rule = BEAT_GRID) {
  const kept = [];
  for (const b of beats) if (!kept.length || b - kept[kept.length - 1] >= rule.minIbi) kept.push(b);
  if (kept.length < 8) return null;
  const ibis = []; for (let i = 1; i < kept.length; i++) ibis.push(kept[i] - kept[i - 1]);
  const sorted = [...ibis].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
  const mean = ibis.reduce((a, b) => a + b, 0) / ibis.length, sd = Math.sqrt(ibis.reduce((a, b) => a + (b - mean) ** 2, 0) / ibis.length);
  const span = duration || (kept[kept.length - 1] - kept[0]) || 1;
  const rate = kept.length / span, cv = sd / mean;
  // the period: the one whose grid the beats lock to best (the length of the mean of e^(2πi·t/p) over the beats), searched
  // within `search` of the median interval, coarse then fine. Fake beats between the real ones (driven drums: intervals of
  // ¾ and ¼ of a beat) only add noise to the sum, where counting beats would add beats; the frame rounding of the
  // beats (20 ms) averages out over the file
  const lock = p => { let c = 0, s = 0; for (const t of kept) { const a = (2 * Math.PI * t) / p; c += Math.cos(a); s += Math.sin(a); } return { r: Math.hypot(c, s) / kept.length, phase: (((Math.atan2(s, c) / (2 * Math.PI)) * p) % p + p) % p }; };
  let best = { p: med, ...lock(med) };
  for (const [lo, hi, step] of [[med * (1 - rule.search), med * (1 + rule.search), med * 0.0005], [null, null, med * 0.00002]]) {
    const a = lo ?? best.p - med * 0.0006, z = hi ?? best.p + med * 0.0006;
    for (let p = a; p <= z; p += step) { const l = lock(p); if (l.r > best.r) best = { p, ...l }; }
  }
  // then a straight line through the beats on that grid (each numbered from the grid, beats further than `fit` of a
  // period from their place left out): the exact tempo and phase
  const on = kept.map(b => [Math.round((b - best.phase) / best.p), b]).filter(([k, b]) => Math.abs(b - (best.phase + k * best.p)) < rule.fit * best.p);
  if (on.length < 8) return finish(best.p, best.phase, best.r);
  const n = on.length, sx = on.reduce((a, [x]) => a + x, 0), sy = on.reduce((a, [, y]) => a + y, 0), sxx = on.reduce((a, [x]) => a + x * x, 0), sxy = on.reduce((a, [x, y]) => a + x * y, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), icpt = (sy - slope * sx) / n;
  return finish(slope, ((icpt % slope) + slope) % slope, best.r, n / kept.length);
  function finish(period, phase, lockR = 0, onGrid = 0) {
    // the downbeat: the beat (of four) where the tracker's downbeats fall most often
    const votes = [0, 0, 0, 0];
    for (const d of downbeats || []) { const k = Math.round((d - phase) / period); if (Math.abs(d - (phase + k * period)) < rule.fit * period) votes[((k % 4) + 4) % 4]++; }
    const best = votes.indexOf(Math.max(...votes)), total = votes.reduce((a, b) => a + b, 0);
    const downbeat = phase + best * period;
    return {
      bpm: 60 / period, beatPhase: phase, downbeat: downbeat % (4 * period), rate: Math.round(rate * 100) / 100, cv: Math.round(cv * 100) / 100,
      lock: Math.round(lockR * 100) / 100, onGrid: Math.round(onGrid * 100) / 100,
      steady: rate >= rule.rate && cv <= rule.cv, downbeatShare: total ? Math.round((votes[best] / total) * 100) / 100 : 0, beats: kept.length,
      times: kept, downbeatTimes: downbeats || [],
    };
  }
}

// the beat phase of beats on a grid of `period` seconds (the circular mean of their place within a beat) → seconds
export function phaseOn(times, period) {
  let c = 0, s = 0;
  for (const t of times) { const a = (2 * Math.PI * t) / period; c += Math.cos(a); s += Math.sin(a); }
  return ((((Math.atan2(s, c) / (2 * Math.PI)) * period) % period) + period) % period;
}
