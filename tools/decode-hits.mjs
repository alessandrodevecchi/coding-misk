// Hit density (decode round 11, G): how fast each band and each part hits, original against code. The band error in dB
// sees how much energy a band holds, not how it is played: one chord held a whole bar and ten stabs with the same
// energy score alike. Two measures here, both used by tools/decode-bench.cjs:
//   density(fo, fc, grid)   from the audio (tools/decode-similarity.mjs features): per bar and band (low 30-150 Hz,
//                           mid 150-2000, high 5-16 kHz) the hits (a rise of the band's level of RISE dB or more within
//                           three frames, at least GAP seconds apart, above the file's floor) and how held the band is
//                           (its quiet frames against its loud ones, dB: about 0 for a held pad, -10 and lower for stabs);
//                           per band the mean absolute difference of hits per bar and of the held measure, and the bias
//                           (code minus original, hits per bar). Works on any file, the real tracks too.
//   partScore(truth, song, grid)  from the code of both songs (Strudel in Node): each part's onsets (kick, snare, hats,
//                           bass, chords, lead) in seconds, the code's matched to the truth's within MATCH seconds:
//                           precision, recall and hits per bar, for every bench song whose song is known.
import { compileSong } from '../src/song/compile.js';
import { strudelTonal } from './decode-measure.mjs';

export const HIT_RULE = { rise: 6, back: 3, gap: 0.046, floor: 35, match: 0.04, bands: ['low', 'mid', 'high'] };
const db = x => 10 * Math.log10(x + 1e-12);
const pct = (a, q) => { if (!a.length) return -120; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const r3 = x => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 1000) / 1000);

// the hit times (seconds) of one band of a file's features, and its per-frame levels (dB)
export function bandHits(f, band, rule = HIT_RULE) {
  const L = f.fr.map(x => db(x[band])), floor = pct(L, 0.95) - rule.floor, rise = L.map((v, i) => (i < rule.back ? 0 : v - Math.min(...L.slice(i - rule.back, i))));
  const out = [];
  for (let i = rule.back; i < L.length; i++) {
    if (rise[i] < rule.rise || L[i] < floor) continue;
    // the frame of the steepest rise nearby
    let peak = true;
    for (let k = Math.max(0, i - 2); k <= Math.min(L.length - 1, i + 2); k++) if (k !== i && (rise[k] > rise[i] || (rise[k] === rise[i] && k < i))) peak = false;
    if (!peak) continue;
    const t = i * f.hop;
    if (out.length && t - out[out.length - 1] < rule.gap) continue;
    out.push(t);
  }
  return { hits: out, L, floor };
}

// per bar of the grid: hits and the held measure of one band. t0: the time of bar 0 in the file
function perBar(f, band, t0, barSec, bars, rule) {
  const { hits, L, floor } = bandHits(f, band, rule), n = new Array(bars).fill(0), lv = Array.from({ length: bars }, () => []);
  for (const t of hits) { const k = Math.floor((t - t0) / barSec); if (k >= 0 && k < bars) n[k]++; }
  L.forEach((v, i) => { const k = Math.floor((i * f.hop - t0) / barSec); if (k >= 0 && k < bars) lv[k].push(v); });
  const held = lv.map(a => (a.length ? pct(a, 0.25) - pct(a, 0.9) : 0)), on = lv.map(a => a.length > 0 && pct(a, 0.9) >= floor);
  return { n, held, on };
}

// the original's features against the code's on the original's grid (the code's file starts on bar 0)
export function density(fo, fc, grid, rule = HIT_RULE) {
  const out = {};
  for (const band of rule.bands) {
    const o = perBar(fo, band, grid.downbeat, grid.barSeconds, grid.bars, rule), c = perBar(fc, band, 0, grid.barSeconds, grid.bars, rule);
    let k = 0, dn = 0, bias = 0, dh = 0, no = 0, nc = 0;
    for (let i = 0; i < grid.bars; i++) {
      if (!o.on[i] && !c.on[i]) continue;
      k++; dn += Math.abs(o.n[i] - c.n[i]); bias += c.n[i] - o.n[i]; dh += Math.min(24, Math.abs(o.held[i] - c.held[i])); no += o.n[i]; nc += c.n[i];
    }
    out[band] = { bars: k, hitErr: k ? r3(dn / k) : null, bias: k ? r3(bias / k) : null, heldErr: k ? r3(dh / k) : null, origPerBar: k ? r3(no / k) : null, codePerBar: k ? r3(nc / k) : null };
  }
  const v = rule.bands.map(b => out[b].hitErr).filter(x => x !== null), h = rule.bands.map(b => out[b].heldErr).filter(x => x !== null);
  out.hitErr = v.length ? r3(v.reduce((a, x) => a + x, 0) / v.length) : null;
  out.heldErr = h.length ? r3(h.reduce((a, x) => a + x, 0) / h.length) : null;
  return out;
}

// ---------- per part, from the code ----------
// the parts as the compiler labels them (`.analyze("…")`): the drum rows, the bass, the chords (pad) and the Lead (hook)
export const PARTS = { kick: ['kick'], snare: ['snare'], hats: ['hats'], bass: ['bass'], chords: ['pad'], lead: ['hook'] };
let strudel = null;
// a song's onsets per part in seconds from its start (one per part within 20 ms: a chord's notes are one hit; the
// voicing left out, which Strudel in Node cannot voice: the chord's hap keeps its onset)
export async function partOnsets(song, bars = null) {
  if (!strudel) strudel = await strudelTonal();
  const n = bars || song.sections.reduce((a, s) => a + s.bars, 0), barSec = 240 / song.sections[0].bpm;
  const p = await strudel.evaluate(compileSong(song).replace(/\.voicing\(\)/g, '')), out = Object.fromEntries(Object.keys(PARTS).map(k => [k, []]));
  for (const h of p.queryArc(0, n)) {
    if (!h.hasOnset()) continue;
    const v = h.value || {}, part = Object.keys(PARTS).find(k => PARTS[k].includes(v.analyze));
    if (!part || (v.gain !== undefined && +v.gain <= 0)) continue;
    out[part].push(h.whole.begin.valueOf() * barSec);
  }
  for (const k of Object.keys(out)) { const s = out[k].sort((a, b) => a - b), u = []; for (const t of s) if (!u.length || t - u[u.length - 1] > 0.02) u.push(t); out[k] = u; }
  return { onsets: out, barSec, bars: n };
}
// the code's onsets against the truth's: per part precision, recall, F1 and hits per bar (over the bars where the part
// plays in either). truth: the original song; song: the decoded song; downbeat: the code's bar 0 in the original (s)
export async function partScore(truth, song, downbeat, rule = HIT_RULE) {
  const T = await partOnsets(truth), C = await partOnsets(song), out = {};
  for (const k of Object.keys(PARTS)) {
    const t = T.onsets[k], c = C.onsets[k].map(x => x + downbeat);
    if (!t.length && !c.length) continue;
    let i = 0, tp = 0;
    const used = new Uint8Array(t.length);
    for (const x of c) { while (i < t.length && t[i] < x - rule.match) i++; for (let j = i; j < t.length && t[j] <= x + rule.match; j++) if (!used[j]) { used[j] = 1; tp++; break; } }
    const barsOf = (list, sec) => new Set(list.map(x => Math.floor(x / sec)));
    const bt = barsOf(t, T.barSec), bc = barsOf(c, T.barSec);
    out[k] = { truth: t.length, code: c.length, precision: c.length ? r3(tp / c.length) : null, recall: t.length ? r3(tp / t.length) : null, f1: t.length + c.length ? r3((2 * tp) / (t.length + c.length)) : null,
      truthPerBar: bt.size ? r3(t.length / bt.size) : 0, codePerBar: bc.size ? r3(c.length / bc.size) : 0, truthBars: bt.size, codeBars: bc.size };
  }
  return out;
}
