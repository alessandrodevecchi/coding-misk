// The oscilloscope look's settings (oscilloscope-visual D3, D5): pure, checked in Node (tools/check-oscilloscope.mjs).
// Stored whole in `coding-misk-oscilloscope` (in the backup with the other settings). Each parameter has a value and a
// link: Static keeps the value, a song link moves it (the bar, the section, an instrument's level).

export const OSC_KEY = 'coding-misk-oscilloscope';
export const OVERLAYS = ['empty', 'graticule', 'smudged', 'smudged-graticule', 'real', 'vector'];
export const MODES = ['sweep', 'xy'];
// [id, min, max, step, default]: the values of the reference panel, on our scale
export const PARAMS = [
  ['intensity', 0, 10, 0.1, 5],
  ['persistence', 0, 0.95, 0.01, 0.5],
  ['hue', 0, 360, 1, 125],
  ['lineSat', 0, 1, 0.01, 1],
  ['screenSat', 0, 1, 0.01, 1],
  ['focus', 0.3, 3, 0.05, 1],
  ['noise', 0, 1, 0.01, 0],
  ['glow', 0, 1, 0.01, 0.3],
  ['ambient', 0, 1, 0.01, 0.7],
  ['smoothing', 0, 1, 0.01, 0],
  ['sweepMs', 2, 40, 0.5, 10],
  ['trigger', -1, 1, 0.01, 0],
];
// the song links (D5): static, the bar (a ramp from the bar's start to its end), the section (a step per section), the
// level of an instrument (its analyser), the level of the whole mix
export const LINKS = ['static', 'bar', 'section', 'kick', 'bass', 'pad', 'lead', 'mix'];
// how far a link moves its parameter: from the value toward the top of its range (depth 1: the whole way)
export const DEPTH = 0.6;
// the defaults that look good on the stage (D6): green trace, sweep, a real screen, the glow pulsing on the kick
export const OSC_DEFAULTS = Object.freeze({
  overlay: 'real', mode: 'sweep', oversample: true,
  values: Object.freeze(Object.fromEntries(PARAMS.map(([k, , , , d]) => [k, d]))),
  links: Object.freeze({ ...Object.fromEntries(PARAMS.map(([k]) => [k, 'static'])), glow: 'kick', hue: 'section' }),
});
// the parameters the settings card shows in the prototype (D7); the others keep their defaults
export const SHOWN = ['intensity', 'persistence', 'hue', 'glow', 'focus', 'noise', 'ambient', 'sweepMs'];

const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const one = (v, list, d) => (list.includes(v) ? v : d);
// the stored settings (any shape, old or partial) completed with the defaults
export function oscSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, D = OSC_DEFAULTS, rv = r.values || {}, rl = r.links || {};
  return {
    overlay: one(r.overlay, OVERLAYS, D.overlay),
    mode: one(r.mode, MODES, D.mode),
    oversample: typeof r.oversample === 'boolean' ? r.oversample : D.oversample,
    values: Object.fromEntries(PARAMS.map(([k, lo, hi]) => [k, clamp(rv[k], lo, hi, D.values[k])])),
    links: Object.fromEntries(PARAMS.map(([k]) => [k, one(rl[k], LINKS, D.links[k])])),
  };
}
// the instruments a level link reads (the stage's analyser names)
export const LINK_INST = { kick: ['kick'], bass: ['bass'], pad: ['pad'], lead: ['hook', 'arp', 'guitar'], mix: null };
// the amount 0..1 a link gives now. ctx: { bar (0..1 through the bar), section ({ i, n } or null), lv (levels 0..1),
// level (the mix, 0..1) }
export function linkAmount(link, ctx) {
  if (link === 'bar') return ((ctx.bar % 1) + 1) % 1;
  if (link === 'section') { const s = ctx.section; return s && s.n > 1 ? (s.i % s.n) / (s.n - 1) : 0; }
  if (link === 'mix') return Math.max(0, Math.min(1, ctx.level || 0));
  const ids = LINK_INST[link];
  if (!ids) return 0;
  return Math.max(0, ...ids.map(k => (ctx.lv && ctx.lv[k]) || 0));
}
// the value of a parameter now: Static its value; linked, moved from it toward the top of its range (hue: around the
// circle, half of it at most, so a section's colour stays in the family)
export function paramNow(S, k, ctx) {
  const P = PARAMS.find(p => p[0] === k), v = S.values[k], link = S.links[k];
  if (!P || link === 'static') return v;
  const a = linkAmount(link, ctx), [, lo, hi] = P;
  if (k === 'hue') return (v + a * 180) % 360;
  return Math.max(lo, Math.min(hi, v + (hi - v) * a * DEPTH));
}

// ---------- the trace ----------
// the window of a sweep (D4): sweepMs of samples from the first rising crossing of the trigger value in the first half
// of the buffer (none: from the start), so a periodic sound stands still. data: Float32Array, rate: samples per second
export function sweepWindow(data, rate, sweepMs, trigger) {
  const n = Math.max(8, Math.min(data.length >> 1, Math.round((sweepMs / 1000) * rate)));
  let start = 0;
  for (let i = 1; i < data.length - n; i++) if (data[i - 1] < trigger && data[i] >= trigger) { start = i; break; }
  return { start, n };
}
// oversampled points (D4): Catmull-Rom between samples, `k` points per sample; smoothing (0..1) a one-pole low-pass
// before it. → Float32Array of values
export function resample(data, start, n, k, smoothing) {
  const src = new Float32Array(n);
  let y = data[start] || 0;
  const a = 1 - Math.min(0.95, smoothing);
  for (let i = 0; i < n; i++) { y += a * ((data[start + i] || 0) - y); src[i] = y; }
  if (k <= 1) return src;
  const out = new Float32Array((n - 1) * k + 1);
  for (let i = 0; i < n - 1; i++) {
    const p0 = src[Math.max(0, i - 1)], p1 = src[i], p2 = src[i + 1], p3 = src[Math.min(n - 1, i + 2)];
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out[i * k + j] = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }
  }
  out[out.length - 1] = src[n - 1];
  return out;
}
// the beam's brightness bins (D4): a real beam leaves less light where it moves fast, so each segment's brightness goes
// with 1 / its length; segments are grouped in `bins` levels so the trace is a few paths, not one per segment
export function binOf(len, ref, bins) {
  const b = Math.min(1, ref / Math.max(1e-3, len));
  return Math.min(bins - 1, Math.floor(b * bins));
}
