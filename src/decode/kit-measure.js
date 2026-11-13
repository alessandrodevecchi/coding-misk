// Sound measures of drum hits (decode-refine D3), the same for a drum machine's sample (tools/decode-kits.mjs) and for
// the hits of a decoded track (level B, full.js). The nearest of the app's drum machines (src/decode/kits.js) to a
// track's measures is the one "Our sounds" writes. Pure.
//
// The machine is told by its closed hat's spectral shape: the hat's energy in twelfth-octave bands from 2 to 16 kHz, in
// dB, with its overall tilt taken out. The 909, the 707 and the 505 have hats whose brightness (the centroid) lies within
// 3 %, and a mix reads every hat 1 to 5 % darker than its sample (the other parts, the limiter, distortion tilt the
// spectrum), so the centroid cannot tell them apart; their partials sit at different places, which a twelfth of an
// octave (about 6 %) resolves and a tilt does not move. A kick's sound under a bass is not used: in a mix the bass and
// the kick share the band (the first round's kick decay read 5 ms under a loud bass).

const SIZE = 4096;
// the power spectrum of x[from, from + n) with a Hann window, zero-padded to SIZE points
function spectrum(x, from, n, size = SIZE) {
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
// the hat's window (seconds) and bands
export const HAT_SHAPE = { window: 0.025, lo: 2000, hi: 16000, perOctave: 12 };
// a power spectrum's shape: log energy per band, the mean and the straight tilt over the bands taken out
export function shapeOf(p, sr, { lo, hi, perOctave } = HAT_SHAPE) {
  const hz = sr / SIZE, top = Math.min(hi, 0.95 * (sr / 2)), v = [];
  for (let f = lo; f * 2 ** (1 / perOctave) <= top + 1e-6; f *= 2 ** (1 / perOctave)) {
    let s = 0; for (let k = Math.ceil(f / hz); k < (f * 2 ** (1 / perOctave)) / hz; k++) s += p[k] || 0;
    v.push(Math.log10(s + 1e-12));
  }
  const n = v.length, mx = (n - 1) / 2, my = v.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0; v.forEach((y, i) => { sxy += (i - mx) * (y - my); sxx += (i - mx) ** 2; });
  const b = sxx ? sxy / sxx : 0;
  return v.map((y, i) => Math.round((y - my - b * (i - mx)) * 100) / 100);
}
// a lone hat sample's shape
export const sampleShape = (x, sr) => shapeOf(spectrum(x, 0, Math.round(HAT_SHAPE.window * sr)), sr);
// a track's hats: the shape of their summed spectra (up to 96 hits, spread over the track) → shape or null
export function mixHatShape(x, sr, hats) {
  if (!hats.length) return null;
  const step = Math.max(1, Math.ceil(hats.length / 96)), acc = new Float64Array(SIZE / 2), n = Math.round(HAT_SHAPE.window * sr);
  for (let k = 0; k < hats.length; k += step) { const p = spectrum(x, Math.round(hats[k] * sr), n); for (let b = 0; b < acc.length; b++) acc[b] += p[b]; }
  return shapeOf(acc, sr);
}
const corr = (a, b) => { const n = Math.min(a.length, b.length); let d = 0, x = 0, y = 0; for (let i = 0; i < n; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : -1; };
// the drum machines nearest to a track's hats in `table` (src/decode/kits.js), best first → [{ kit, r }]: by the shape's
// correlation; machines within KIT_RULE.tie of the best are ordered by how near their hat's brightness is (the centroid
// above 2 kHz, `bright`), the measure the shape leaves out
export const KIT_RULE = { tie: 0.02 };
export function rankKits(shape, table, bright = null) {
  if (!shape) return [];
  const list = Object.entries(table).filter(([, v]) => v.hatShape).map(([kit, v]) => ({ kit, r: Math.round(corr(shape, v.hatShape) * 1000) / 1000, b: v.hatBright })).sort((a, b) => b.r - a.r);
  if (!bright || !list.length) return list.map(({ kit, r }) => ({ kit, r }));
  const top = list[0].r, near = list.filter(x => x.r >= top - KIT_RULE.tie && x.b), rest = list.filter(x => !near.includes(x));
  near.sort((a, b) => Math.abs(Math.log(bright / a.b)) - Math.abs(Math.log(bright / b.b)));
  return [...near, ...rest].map(({ kit, r }) => ({ kit, r }));
}
// a lone hat sample's brightness and the hats of a track: the centroid (Hz) of the power above 2 kHz
const brightOf = (p, sr) => { const hz = sr / SIZE; let t = 0, w = 0; for (let k = Math.ceil(HAT_SHAPE.lo / hz); k < p.length; k++) { t += p[k]; w += p[k] * k * hz; } return t ? Math.round(w / t) : null; };
export const sampleBright = (x, sr) => brightOf(spectrum(x, 0, Math.round(HAT_SHAPE.window * sr)), sr);
export function mixHatBright(x, sr, hats) {
  if (!hats.length) return null;
  const step = Math.max(1, Math.ceil(hats.length / 96)), acc = new Float64Array(SIZE / 2), n = Math.round(HAT_SHAPE.window * sr);
  for (let k = 0; k < hats.length; k += step) { const p = spectrum(x, Math.round(hats[k] * sr), n); for (let b = 0; b < acc.length; b++) acc[b] += p[b]; }
  return brightOf(acc, sr);
}
export const nearestKit = (shape, table) => { const r = rankKits(shape, table); return r.length ? r[0].kit : null; };

// the similarity check's bands (tools/decode-similarity.mjs): low 20-150 Hz, mid 150-2000, high 2000-16000
export const SHARE_BANDS = [[20, 150], [150, 2000], [2000, 16000]];
// the writer's level bands (decode-refine D3): the share bands with the mid band split in three, so a part's level is
// not matched with another part's sound in a far corner of the mid band (a kick's click for a pad's body)
export const LEVEL_BANDS = [[20, 150], [150, 400], [400, 1000], [1000, 2000], [2000, 16000]];
// the energy of x[a, z) in the share bands (or `bands`), from 2048-point frames every `hop` samples → sums per band
// (a short sound measured alone needs a dense hop: frames 4096 samples apart catch a drum hit's attack or miss it)
export function bandEnergy(x, sr, a, z, bands = SHARE_BANDS, hop = 4096) {
  const out = bands.map(() => 0), hz = sr / SIZE;
  for (let i = Math.max(0, Math.round(a)); i + 2048 <= Math.min(x.length, Math.round(z)); i += hop) {
    const p = spectrum(x, i, 2048);
    bands.forEach(([lo, hi], j) => { for (let k = Math.ceil(lo / hz); k < Math.min(p.length, hi / hz); k++) out[j] += p[k]; });
  }
  return out;
}
// The bass's drive (decode-refine 10.1, fifth round). A driven bass is clipped: a symmetric clip turns a sawtooth's
// wave toward a square, and a square holds odd harmonics only. So the measure is the bass's even harmonics against its
// odd ones (2nd, 4th, 6th over 3rd, 5th, 7th, in dB) at the pitch level B decoded, on the steps with a bass note and no
// kick or clap, the median over the steps. Measured on the bench: the two driven acid basses -5.2 and -5.7 dB, the six
// clean basses -1.3 (a resonant supersaw) to +4.6 (a sawtooth's even harmonics hold more energy than its odd ones,
// +3 dB); round 5 put a threshold between them (round 6 dropped it: square, triangle and sine basses read under it). The kicks' and the clean basses' harmonics did not tell drive apart
// (decode-refine 10.1, rounds 1 to 3). level: the low band (20-150 Hz) on those steps against the kick steps, in dB
// (the driven basses -0.3 to -2.7, the clean ones -0.4 to -18.6: a loud bass is not always a driven one)
export const DRIVE_RULE = { window: 4096, size: 8192, steps: 256 };
const powerAt = (p, hz, f, tol = 0.03) => { let m = 0; for (let k = Math.floor((f * (1 - tol)) / hz); k <= Math.ceil((f * (1 + tol)) / hz); k++) m = Math.max(m, p[k] || 0); return m; };
// x: mono PCM at sr; notes: [{ t (seconds), midi }] for the steps with a bass note and no kick or clap; kicks: the kick
// steps' times → { evenOdd, level, n, h1, slope } or null (round 6: the writer decides the drive from the profile against
// the app's own basses, writer.js bassDriveOf; the even/odd threshold of round 5 is gone)
export function bassDrive(x, sr, notes, kicks = [], rule = DRIVE_RULE) {
  if (notes.length < 8) return null;
  const hz = sr / rule.size, pick = (list, n) => { const step = Math.max(1, Math.ceil(list.length / n)); return list.filter((_, i) => i % step === 0); };
  const low = p => { let s = 0; for (let k = Math.ceil(20 / hz); k < 150 / hz; k++) s += p[k]; return s; };
  const eo = [], lowB = [], lowK = [], h1 = [], sl = [];
  for (const { t, midi } of pick(notes, rule.steps)) {
    const p = spectrum(x, Math.round(t * sr), rule.window, rule.size), f0 = 440 * 2 ** ((midi - 69) / 12), H = k => powerAt(p, hz, k * f0);
    const even = H(2) + H(4) + H(6), odd = H(3) + H(5) + H(7);
    if (even > 0 && odd > 0) eo.push(10 * Math.log10(even / odd));
    lowB.push(low(p));
    // (round 6, review P2: the harmonic profile, the fundamental's share of the first 12 harmonics and the slope of
    // harmonics 1 to 8 in dB per octave; a clip moves energy toward the fundamental's odd partials and flattens nothing
    // the filter took away, so the share rises with the drive on every bass the bench holds)
    const Hs = Array.from({ length: 12 }, (_, k) => H(k + 1)), tot = Hs.reduce((a, b) => a + b, 0);
    if (tot > 0 && Hs[0] > 0) {
      h1.push(Hs[0] / tot);
      let sx = 0, sy = 0, sxx = 0, sxy = 0; for (let k = 1; k <= 8; k++) { const xx = Math.log2(k), y = 10 * Math.log10(Hs[k - 1] / Hs[0] + 1e-9); sx += xx; sy += y; sxx += xx * xx; sxy += xx * y; }
      sl.push((8 * sxy - sx * sy) / (8 * sxx - sx * sx));
    }
  }
  for (const t of pick(kicks, rule.steps)) lowK.push(low(spectrum(x, Math.round(t * sr), rule.window, rule.size)));
  const med = v => { const s = v.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const e = med(eo), b = med(lowB), k = med(lowK);
  if (e === null) return null;
  const r = (v, d) => (v === null ? null : Math.round(v * d) / d);
  return { evenOdd: Math.round(e * 10) / 10, level: b && k ? Math.round(10 * Math.log10(b / k) * 10) / 10 : null, n: eo.length, h1: r(med(h1), 1000), slope: r(med(sl), 10) };
}
// a chord's sustain: the energy of the 250-2000 Hz band in the bar's last eighth over its mean in the whole bar, in
// 1024-sample frames (a held or reverberant chord near 1, a short one near 0)
export function sustainOf(x, sr, a, z) {
  const hz = sr / SIZE, lo = Math.ceil(250 / hz), hi = Math.floor(2000 / hz), e = [];
  for (let i = Math.round(a); i + 1024 <= Math.min(x.length, Math.round(z)); i += 1024) { const p = spectrum(x, i, 1024); let s = 0; for (let k = lo; k <= hi; k++) s += p[k]; e.push(s); }
  if (e.length < 8) return 0;
  const mean = e.reduce((p, q) => p + q, 0) / e.length, tail = e.slice(-Math.max(1, Math.round(e.length / 8)));
  return mean ? Math.round(Math.min(1, Math.sqrt(tail.reduce((p, q) => p + q, 0) / tail.length / mean)) * 100) / 100 : 0;
}
