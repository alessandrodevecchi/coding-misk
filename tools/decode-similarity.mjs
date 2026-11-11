// The similarity measures of tools/decode-similarity.cjs (decode-refine D1, task 6.3): how close the sound of a decoded
// track's level B code is to its original, on the original's bar grid (the level B model's tempo and downbeat; the
// code's file starts on its bar 0). No browser: the .cjs exports the songs through the app and calls these.
//   rhythm per band   correlation of the onset strength per 16th step, low (30-150 Hz), mid (150-2000), high (5-16 kHz)
//   chroma            cosine of the 12-note energy per beat, all notes (27-2000 Hz); bass chroma 27-250 Hz
//   brightness        median spectral centroid of the code over the original's
//   shares            each band's share of the energy (low 20-150, mid 150-2000, high 2000-16000), original and code
//   arc               correlation of the loudness per bar (dB), each curve's variance floored at ARC_DB² (decode-refine
//                     11.3): a song whose bars differ by a few tenths of a dB has no arc, and its plain correlation was
//                     noise that moved between two exports; such a song now scores near 0 every run
// score(): the numbers a later run must not lose by more than MARGIN (higher is better for each).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyseFull } from '../src/decode/full.js';
import { writeFull } from '../src/decode/writer.js';
import { nodeEssentia } from './essentia-node.mjs';
import { readAudio } from './decode-edits.mjs';
import { ANALYSIS_RATE } from '../src/decode/misk-analyzer.js';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SIM_DIR = path.join(ROOT, '.cache', 'decode', 'sim');
export const SNAPSHOT = path.join(ROOT, 'tests', 'snapshots', 'decode-similarity.json');
export const MARGIN = 0.05;
// the arc's floor (dB): about the smallest change of loudness a listener hears. A part that enters or stops moves a
// bar by 3 to 10 dB; two exports of one song differ by well under it
export const ARC_DB = 1;
export const RATE = ANALYSIS_RATE;
export { readAudio };

// ---------- level B of a file, as Open in Compose writes it ----------
// → { song, grid: { bpm, downbeat, barSeconds, bars }, info } for a file's PCM; essentia: false is misk-analyzer alone.
// The song plays in Classic (no growth): the same parts per section as "Follow the song", the whole song at once.
export async function levelB(pcm, { id, title, essentia = true }) {
  const t0 = Date.now(), m = await analyseFull(pcm, { engine: essentia ? nodeEssentia : null }), ms = Date.now() - t0;
  const song = writeFull(m, { id: `sim-${id}`, title });
  delete song.config;
  const kn = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return {
    song, grid: { bpm: m.bpm, downbeat: m.downbeat, barSeconds: m.barSeconds, bars: song.sections.reduce((a, s) => a + s.bars, 0) },
    info: { bpm: Math.round(m.bpm * 100) / 100, key: m.key ? `${kn[m.key.root]} ${m.key.mode}` : null, engines: m.engines, essentiaTempo: m.essentiaTempo || null, chords: m.bars.map(b => b.chord || null), sections: m.sections.length, ms, seconds: Math.round(pcm.length / RATE) },
  };
}

// ---------- spectra ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k], xr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, xi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + xr; im[i + k] = ui + xi; re[i + k + len / 2] = ur - xr; im[i + k + len / 2] = ui - xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
// power spectra of frames centred at hop × k: calls each(k, power, n) with power[bin] for bins up to n/2
function frames(pcm, n, hop, each) {
  const win = Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)), re = new Float64Array(n), im = new Float64Array(n), pw = new Float64Array(n / 2);
  for (let k = 0; k * hop < pcm.length; k++) {
    const c = k * hop - n / 2;
    for (let i = 0; i < n; i++) { const x = pcm[c + i]; re[i] = (x === undefined ? 0 : x) * win[i]; im[i] = 0; }
    fft(re, im);
    for (let b = 0; b < n / 2; b++) pw[b] = re[b] * re[b] + im[b] * im[b];
    each(k, pw, n);
  }
}
const bandSum = (pw, n, lo, hi) => { let s = 0; for (let b = Math.max(1, Math.ceil((lo * n) / RATE)); b <= Math.min(n / 2 - 1, Math.floor((hi * n) / RATE)); b++) s += pw[b]; return s; };

// the features of one file: per frame (hop 512) the rhythm bands, the share bands, the centroid and the level; per
// frame (hop 2048) the chroma and the bass chroma
export function features(pcm) {
  const H = 512, N = 2048, fr = [];
  frames(pcm, N, H, (k, pw, n) => {
    let tot = 0, cen = 0;
    for (let b = 1; b < n / 2; b++) { tot += pw[b]; cen += pw[b] * ((b * RATE) / n); }
    fr.push({ low: bandSum(pw, n, 30, 150), mid: bandSum(pw, n, 150, 2000), high: bandSum(pw, n, 5000, 16000), sl: bandSum(pw, n, 20, 150), sm: bandSum(pw, n, 150, 2000), sh: bandSum(pw, n, 2000, 16000), tot, cen: tot > 0 ? cen / tot : 0 });
  });
  const H2 = 2048, N2 = 8192, chroma = [], pcOf = [];
  for (let b = 0; b < N2 / 2; b++) { const f = (b * RATE) / N2; pcOf.push(f >= 27 && f <= 2000 ? ((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12 : -1); }
  frames(pcm, N2, H2, (k, pw, n) => {
    const all = new Float64Array(12), bass = new Float64Array(12);
    for (let b = 1; b < n / 2; b++) { const p = pcOf[b]; if (p < 0) continue; const m = Math.sqrt(pw[b]); all[p] += m; if ((b * RATE) / n <= 250) bass[p] += m; }
    chroma.push({ all, bass });
  });
  // onset strength per band: the rise of the log energy from the frame before
  const flux = key => fr.map((f, i) => (i ? Math.max(0, Math.log10(f[key] + 1e-10) - Math.log10(fr[i - 1][key] + 1e-10)) : 0));
  return { hop: H / RATE, hop2: H2 / RATE, fr, chroma, flux: { low: flux('low'), mid: flux('mid'), high: flux('high') } };
}

const pearson = (a, b) => { const n = Math.min(a.length, b.length); let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; let d = 0, x = 0, y = 0; for (let i = 0; i < n; i++) { d += (a[i] - ma) * (b[i] - mb); x += (a[i] - ma) ** 2; y += (b[i] - mb) ** 2; } return x && y ? d / Math.sqrt(x * y) : 0; };
const cosine = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
// the arc score of two loudness curves (dB per bar): their correlation with each variance floored at ARC_DB²
export function arcScore(a, b) {
  const n = Math.min(a.length, b.length);
  if (!n) return null;
  let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
  let d = 0, x = 0, y = 0; for (let i = 0; i < n; i++) { d += (a[i] - ma) * (b[i] - mb); x += (a[i] - ma) ** 2; y += (b[i] - mb) ** 2; }
  return d / n / Math.sqrt((x / n + ARC_DB ** 2) * (y / n + ARC_DB ** 2));
}
const r3 = x => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 1000) / 1000);

// the original's features against the code's, on the grid: the original's step k at downbeat + k × step, the code's at
// k × step; over the song's bars (and no further than either file)
export function compare(fo, fc, grid) {
  const step = grid.barSeconds / 16, beat = grid.barSeconds / 4, len = f => f.fr.length * f.hop;
  const bars = Math.max(1, Math.min(grid.bars, Math.floor((len(fo) - grid.downbeat) / grid.barSeconds), Math.floor(len(fc) / grid.barSeconds)));
  // a value per window of `w` seconds starting at t0: the sum (or the mean) of the frames whose centre falls in it
  const perWindow = (list, hop, t0, w, count, mean = false) => {
    const out = new Float64Array(count), n = new Float64Array(count);
    list.forEach((v, i) => { const k = Math.floor((i * hop - t0) / w); if (k >= 0 && k < count) { out[k] += v; n[k]++; } });
    if (mean) for (let k = 0; k < count; k++) out[k] = n[k] ? out[k] / n[k] : 0;
    return out;
  };
  const steps = bars * 16, half = step / 2, rhythm = {};
  for (const band of ['low', 'mid', 'high']) rhythm[band] = r3(pearson(perWindow(fo.flux[band], fo.hop, grid.downbeat - half, step, steps), perWindow(fc.flux[band], fc.hop, -half, step, steps)));
  // chroma per beat (cosine on the beats where both hold sound)
  const beats = bars * 4, chromaOf = (f, t0, key) => { const out = Array.from({ length: beats }, () => new Float64Array(12)); f.chroma.forEach((c, i) => { const k = Math.floor((i * f.hop2 - t0) / beat); if (k >= 0 && k < beats) for (let p = 0; p < 12; p++) out[k][p] += c[key][p]; }); return out; };
  const chromaScore = key => { const a = chromaOf(fo, grid.downbeat, key), b = chromaOf(fc, 0, key), s = []; for (let k = 0; k < beats; k++) { const c = cosine(a[k], b[k]); if (c !== null) s.push(c); } return s.length ? s.reduce((x, y) => x + y, 0) / s.length : null; };
  // the frames of the song's span, the quiet ones left out for the centroid (60 dB under the loudest)
  const span = (f, t0) => f.fr.filter((_, i) => i * f.hop >= t0 && i * f.hop < t0 + bars * grid.barSeconds);
  const so = span(fo, grid.downbeat), sc = span(fc, 0);
  const cen = list => { const top = Math.max(...list.map(x => x.tot)); return median(list.filter(x => x.tot > top * 1e-6).map(x => x.cen)); };
  const shares = list => { const t = { l: 0, m: 0, h: 0 }; for (const x of list) { t.l += x.sl; t.m += x.sm; t.h += x.sh; } const s = t.l + t.m + t.h || 1; return [r3(t.l / s), r3(t.m / s), r3(t.h / s)]; };
  const level = (f, t0) => Array.from(perWindow(f.fr.map(x => x.tot), f.hop, t0, grid.barSeconds, bars, true), v => 10 * Math.log10(v + 1e-10));
  const shO = shares(so), shC = shares(sc), co = cen(so), cc = cen(sc);
  return { bars, rhythm, chroma: r3(chromaScore('all')), bassChroma: r3(chromaScore('bass')), brightness: r3(co ? cc / co : null), shares: { orig: shO, code: shC }, arc: r3(arcScore(Array.from(level(fo, grid.downbeat)), Array.from(level(fc, 0)))) };
}

// the numbers held by the snapshot, each higher is better: the brightness ratio as its closeness to 1, the shares as one
// minus the largest band difference
export function score(c) {
  const b = c.brightness ? Math.min(c.brightness, 1 / c.brightness) : 0;
  return { rhythmLow: c.rhythm.low, rhythmMid: c.rhythm.mid, rhythmHigh: c.rhythm.high, chroma: c.chroma, bassChroma: c.bassChroma, brightness: r3(b), shares: r3(1 - Math.max(...c.shares.orig.map((x, i) => Math.abs(x - c.shares.code[i])))), arc: c.arc };
}
// a run's scores against the snapshot's: the drops beyond the margin, [{ id, key, was, now }]
export function drops(snapshot, now, margin = MARGIN) {
  const out = [];
  for (const [id, s] of Object.entries(snapshot || {})) {
    if (!now[id]) continue;
    for (const [k, was] of Object.entries(s)) { const v = now[id][k]; if (was !== null && v !== null && v !== undefined && v < was - margin - 1e-9) out.push({ id, key: k, was, now: v }); }
  }
  return out;
}
export const line = (id, c) => `${id.padEnd(22)} rhythm low ${c.rhythm.low} mid ${c.rhythm.mid} high ${c.rhythm.high} · chroma ${c.chroma} bass ${c.bassChroma} · brightness ${c.brightness} · shares low/mid/high ${c.shares.orig.join('/')} vs ${c.shares.code.join('/')} · arc ${c.arc} · ${c.bars} bars`;
export const readSnapshot = () => (fs.existsSync(SNAPSHOT) ? JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')) : null);
export const writeSnapshot = data => fs.writeFileSync(SNAPSHOT, JSON.stringify(data, null, 2) + '\n');
