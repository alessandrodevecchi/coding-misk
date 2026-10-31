// Sections, variations and the ending of a decoded track (track-to-code D6, D9, level B). Pure: the level B worker and
// the Node checks share it.
//
// Sections: a novelty curve over the bars (the parts heard, their levels, the drum density, the chroma), the peaks at
// least 4 bars apart as bounds, each moved to the bar where the parts change most. Kinds from the energy and the drums:
// intro, verse, build, drop, break, outro. The ending: the bar after the last one with music.
import { STEPS, DRUM_ROWS } from './model.js';
import { drumsHeard, bassHeard, chordsHeard } from './writer.js';

const hits = s => [...(s || '')].filter(c => c === 'x').length;
const mean = (list, f) => (list.length ? list.reduce((a, x) => a + f(x), 0) / list.length : 0);

// one vector per bar: the parts heard (weight 1), their levels, the drum density per row, the chroma (unit length)
function features(bars) {
  return bars.map(b => {
    const lv = b.level || {}, d = b.drums || {}, c = b.chroma || null;
    const heardV = [drumsHeard(b) ? 1 : 0, bassHeard(b) ? 1 : 0, chordsHeard(b) ? 1 : 0];
    const levels = ['drums', 'bass', 'chords', 'other'].map(k => lv[k] || 0);
    const dens = DRUM_ROWS.map(r => hits(d[r]) / STEPS);
    let chroma = null;
    if (c && c.some(x => x > 0)) { const n = Math.sqrt(c.reduce((a, x) => a + x * x, 0)); chroma = c.map(x => x / n); }
    return { heardV, levels, dens, chroma, chords: chordsHeard(b) ? { [b.chord]: 1 } : {} };
  });
}
const dist = (A, B) => {
  let d = 0;
  for (let i = 0; i < 3; i++) d += 1.0 * Math.abs(A.heardV[i] - B.heardV[i]);
  // (the bass level and the high band move most from bar to bar: they weigh half)
  for (let i = 0; i < 4; i++) d += (i === 1 || i === 3 ? 0.5 : 1.0) * Math.abs(A.levels[i] - B.levels[i]);
  for (let i = 0; i < 4; i++) d += 1.5 * Math.abs(A.dens[i] - B.dens[i]);
  if (A.chroma && B.chroma) { let c = 0; for (let i = 0; i < 12; i++) c += A.chroma[i] * B.chroma[i]; d += 1.2 * (1 - c); }
  // the chords played (a share of the bars each): another progression is a new section
  if (A.chords && B.chords && Object.keys(A.chords).length && Object.keys(B.chords).length) { let o = 0; for (const k of new Set([...Object.keys(A.chords), ...Object.keys(B.chords)])) o += Math.abs((A.chords[k] || 0) - (B.chords[k] || 0)); d += 0.5 * o; }
  return d;
};
const avg = list => {
  const out = { heardV: [0, 0, 0], levels: [0, 0, 0, 0], dens: [0, 0, 0, 0], chroma: null, chords: {} }, n = list.length || 1;
  const withChords = list.filter(x => Object.keys(x.chords).length);
  for (const x of withChords) for (const k of Object.keys(x.chords)) out.chords[k] = (out.chords[k] || 0) + 1 / withChords.length;
  const ch = list.filter(x => x.chroma);
  for (const x of list) { x.heardV.forEach((v, i) => (out.heardV[i] += v / n)); x.levels.forEach((v, i) => (out.levels[i] += v / n)); x.dens.forEach((v, i) => (out.dens[i] += v / n)); }
  if (ch.length) { const c = new Array(12).fill(0); for (const x of ch) x.chroma.forEach((v, i) => (c[i] += v)); const m = Math.sqrt(c.reduce((a, v) => a + v * v, 0)) || 1; out.chroma = c.map(v => v / m); }
  return out;
};

// the novelty at each bar bound b (between bar b-1 and bar b): the distance between the mean of the bars before and
// the bars after, w bars each side (8: the bar-to-bar noise of the measures halves, and a chord loop of up to 8 bars
// gives no bound)
export function novelty(bars, w = 8) {
  const F = features(bars), n = F.length, out = new Array(n + 1).fill(0);
  for (let b = 2; b <= n - 2; b++) {
    const L = F.slice(Math.max(0, b - w), b), R = F.slice(b, Math.min(n, b + w));
    const l8 = F.slice(Math.max(0, b - 8), b), r8 = F.slice(b, Math.min(n, b + 8));
    const A = avg(L), B = avg(R), A8 = avg(l8), B8 = avg(r8);
    out[b] = dist({ ...A, chroma: A8.chroma, chords: A8.chords }, { ...B, chroma: B8.chroma, chords: B8.chords });
  }
  return out;
}

// the section bounds: novelty peaks above a threshold, at least `min` bars apart, each moved within one bar to the bound
// where the bar before and the bar after differ most
export function sectionBounds(bars, { min = 4 } = {}) {
  const n = bars.length;
  if (n < 2 * min) return [0];
  const N = novelty(bars), F = features(bars);
  // a peak stands out: at least 0.6, and 0.5 above the lowest novelty within 8 bars (the calm inside a section)
  const peaks = [];
  for (let b = 2; b <= n - 2; b++) {
    if (N[b] < 0.6 || N[b] - Math.min(...N.slice(Math.max(2, b - 8), Math.min(n - 1, b + 9))) < 0.5) continue;
    let top = true;
    for (let k = Math.max(1, b - 2); k <= Math.min(n - 1, b + 2); k++) if (k !== b && (N[k] > N[b] || (N[k] === N[b] && k < b))) top = false;
    if (top) peaks.push(b);
  }
  // two-bar contrast: the bound where the two bars before and the two after differ most (the window blurs it by a bar)
  const step = b => (b > 1 && b < n - 1 ? dist(avg(F.slice(b - 2, b)), avg(F.slice(b, b + 2))) : 0);
  const moved = peaks.map(p => { let best = p; for (const q of [p - 1, p + 1]) if (q >= 1 && q < n && step(q) > step(best) + 1e-9) best = q; return best; });
  // strongest first, at least `min` bars apart and from the ends
  let out = [];
  for (const b of moved.slice().sort((x, y) => N[y] - N[x])) if (b >= min && n - b >= min && out.every(x => Math.abs(x - b) >= min)) out.push(b);
  out.sort((a, b) => a - b);
  // two neighbouring sections that sound alike are one: the bound whose sections differ least goes, while below 0.6
  for (;;) {
    const all = [0, ...out, n], gap = out.map((b, i) => dist(avg(F.slice(all[i], b)), avg(F.slice(b, all[i + 2]))));
    let k = -1; gap.forEach((g, i) => { if (g < 0.6 && (k < 0 || g < gap[k])) k = i; });
    if (k < 0) break;
    out = out.filter((_, i) => i !== k);
  }
  return [0, ...out];
}

// the kinds of the sections (D6): from each section's energy and drums
export function sectionKinds(bars, starts) {
  const secs = starts.map((s, i) => ({ start: s, bars: (starts[i + 1] ?? bars.length) - s }));
  const info = secs.map(x => {
    const list = bars.slice(x.start, x.start + x.bars);
    const e = mean(list, b => { const l = b.level || {}; return 1.2 * (l.drums || 0) + (l.bass || 0) + (l.chords || 0) + 0.5 * (l.other || 0); });
    const parts = [drumsHeard, bassHeard, chordsHeard].filter(f => mean(list, b => (f(b) ? 1 : 0)) >= 0.5).length;
    // (drums: the share of bars with drums heard, and their level: a pad's attack can read as a soft hat)
    return { e, parts, drums: Math.min(mean(list, b => (drumsHeard(b) ? 1 : 0)), 2 * mean(list, b => (b.level || {}).drums || 0)), rise: list.length >= 4 ? mean(list.slice(-2), b => (b.level || {}).drums || 0) - mean(list.slice(0, 2), b => (b.level || {}).drums || 0) : 0 };
  });
  const top = Math.max(...info.map(x => x.e), 1e-9), most = Math.max(...info.map(x => x.parts));
  // the first and the last sections, quieter or with fewer parts than the fullest: intro and outro
  const kinds = info.map((x, i) => {
    const rel = x.e / top, first = i === 0, last = i === info.length - 1 && info.length > 1, less = rel < 0.75 || x.drums < 0.5 || x.parts < most;
    if (first && info.length > 1 && less) return 'intro';
    if (last && less) return 'outro';
    if (x.drums < 0.4) return 'break';
    return rel >= 0.92 ? 'loud' : 'verse';
  });
  // a loud section after a break or a build is a drop; the others are verses
  kinds.forEach((k, i) => { if (k === 'loud') kinds[i] = kinds.slice(0, i).some(x => x === 'break') && ['break', 'build', 'drop'].includes(kinds[i - 1]) ? 'drop' : 'verse'; });
  // a section that rises into a drop, or that comes after a break and is louder than it, before a drop: a build
  kinds.forEach((k, i) => { if (k === 'verse' && kinds[i + 1] === 'drop' && (info[i].rise > 0.15 || kinds[i - 1] === 'break')) kinds[i] = 'build'; });
  return secs.map((x, i) => ({ ...x, kind: kinds[i] }));
}

// the ending (D6): the bar after the last bar with music (a part heard, or any level above 5 %)
export function endingOf(bars) {
  for (let b = bars.length - 1; b >= 0; b--) {
    const x = bars[b], l = x.level || {};
    if (drumsHeard(x) || bassHeard(x) || chordsHeard(x) || Math.max(l.drums || 0, l.bass || 0, l.chords || 0, l.other || 0) > 0.05) return b + 1;
  }
  return 0;
}

// sections of a model's bars, cut at the ending: [{ start, bars, kind }]
export function sectionsOf(bars) {
  const end = endingOf(bars), list = bars.slice(0, end);
  if (!list.length) return { sections: [], ending: 0 };
  return { sections: sectionKinds(list, sectionBounds(list)), ending: end };
}
