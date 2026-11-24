// Movement devices of the rack (sound-modulation, #95): Sweep ("Apertura"), LFO ("Oscillazione"), Pump ("Pompa") and
// Gate ("Gate ritmico", D13).
// They move a melodic track's sound over time, inside held notes and across bars. Strudel reads effect values at each
// note's onset, so only modulators built at the onset move inside a note: the writer uses the filter LFO (lpsync,
// lpdepth, lpshape), the generic LFO and envelope (.lfo(), .env(), always with an absolute depth `da`) and the
// sidechain (duck on the kick lines). No random value: every device is a pure function of its arguments and the song
// time. The compiler (compile.js) asks moveFor() for each clip piece, passes the code after the other rack devices,
// then applyMove() adds the base values a modulator needs and drops the earlier calls a Sweep replaces.
import { PADS } from '../music.js';

const r0 = x => String(Math.round(x));
const r3 = x => String(Math.round(x * 1000) / 1000);
const r5 = x => String(Math.round(x * 100000) / 100000);
export const MOVE_TYPES = ['bass', 'guitar', 'arp', 'hook', 'pad', 'code'];
export const MOVE_MAX = 2;
// the devices a track counts in its two movement devices
const MOVE_NAMES = 'sweep, lfo, pump, gate, path';
// the control each target writes
export const MOVE_CONTROL = { filter: 'lpf', hpf: 'hpf', room: 'room', delay: 'delay', pan: 'pan' };
// the calls an LFO on volume writes (the Tremolo device's): it takes them out of the line before it (D12)
export const TREMOLO_CALLS = ['tremolosync', 'tremolodepth', 'tremoloshape', 'tremolophase'];
const FREQ = t => t === 'filter' || t === 'hpf';
// Sweep's from and to per target, and their defaults when the target changes
export const SWEEP_RANGE = { filter: [60, 18000, 10], hpf: [60, 18000, 10], room: [0, 1, 0.05], delay: [0, 1, 0.05] };
export const SWEEP_DEFAULTS = { filter: { from: 400, to: 4000, curve: 'exp' }, hpf: { from: 60, to: 1200, curve: 'exp' }, room: { from: 0, to: 0.6, curve: 'linear' }, delay: { from: 0, to: 0.5, curve: 'linear' } };
// rates in bars (LFO) and in bars per dip (Pump without a kick)
const BAR_LABELS = { 0.0625: ['1/16 bar', '1/16 battuta'], 0.125: ['1/8 bar', '1/8 battuta'], 0.25: ['1/4 bar', '1/4 battuta'], 0.5: ['1/2 bar', '1/2 battuta'], 1: ['1 bar', '1 battuta'], 2: ['2 bars', '2 battute'], 4: ['4 bars', '4 battute'] };
const barLabels = list => Object.fromEntries(list.map(v => [v, { en: BAR_LABELS[v][0], it: BAR_LABELS[v][1] }]));
const TARGET_LABELS = { filter: { en: 'Filter', it: 'Filtro' }, hpf: { en: 'High-pass', it: 'Passa-alto' }, room: { en: 'Reverb send', it: 'Mandata riverbero' }, delay: { en: 'Delay send', it: 'Mandata delay' }, pan: { en: 'Pan', it: 'Panorama' }, volume: { en: 'Volume (tremolo)', it: 'Volume (tremolo)' }, pitch: { en: 'Pitch (vibrato)', it: 'Intonazione (vibrato)' } };
// Path (D14): targets, their ranges, the limits
export const PATH_TARGETS = ['filter', 'hpf', 'volume', 'room', 'delay', 'pan'];
export const PATH_RANGE = { filter: [60, 18000], hpf: [60, 18000], volume: [0, 1], room: [0, 1], delay: [0, 1], pan: [0, 1] };
const PATH_LABELS = { filter: TARGET_LABELS.filter, hpf: TARGET_LABELS.hpf, volume: { en: 'Volume', it: 'Volume' }, room: TARGET_LABELS.room, delay: TARGET_LABELS.delay, pan: TARGET_LABELS.pan };
export const PATH_PER_BAR = 16, PATH_MAX_POINTS = 256, PATH_MAX_SONG = 8;
const pickLabels = keys => Object.fromEntries(keys.map(k => [k, TARGET_LABELS[k]]));
// the filter LFO's depth: lpdepth is a share of the cutoff, peak to peak (superdough createFilter: depth × frequency,
// centred), clamped to 30-20000 Hz; depth 1 sways from 0.1 to 1.9 times the cutoff
export const LPDEPTH_SCALE = 1.8;
// the base a generic modulator needs when the line holds no value for its control (D3)
export const MOVE_CENTRE = { pan: 0.5, room: 0.001, delay: 0.001 };
// vibrato (D12): depth 1 is half a semitone up and down (Strudel's vibmod is in semitones)
export const VIB_SCALE = 0.5;
// phase (D11): how late the wave starts, a share of its period (of a step for the Gate). Strudel's phaseoffset moves the
// wave earlier, so the code holds 1 - phase; phase 0 writes nothing
const PHASE_ARG = ['phase', 'num', 0, 0, 0.95, 0.05];
export const phaseOffset = p => { const x = ((1 - (Number(p) || 0)) % 1 + 1) % 1; return Math.round(x * 100000) / 100000; };
const poKey = p => (phaseOffset(p) ? `, phaseoffset: ${r5(phaseOffset(p))}` : '');
// the Gate's presets (D13): 16 steps a bar, x open and . closed
export const GATE_PRESETS = {
  'x.x.x.x.x.x.x.x.': { en: 'Eighths', it: 'Ottavi' }, '..x...x...x...x.': { en: 'Offbeats', it: 'Controtempo' },
  'xx.xx.x.xx.xx.x.': { en: 'Trance A', it: 'Trance A' }, 'x.xx.xx.x.xx.xx.': { en: 'Trance B', it: 'Trance B' }, 'x..x..x..x..x.x.': { en: 'Dotted', it: 'Puntato' },
};
export const GATE_MAX_RUNS = 6;

// args as in rack.js: [name, kind, default, min, max, step] or [name, 'choice', default, [values], labels]
export const MOVE_DEVICES = {
  sweep: { kind: 'move', label: { en: 'Sweep', it: 'Apertura' }, knob: 'to',
    args: [['target', 'choice', 'filter', ['filter', 'hpf', 'room', 'delay'], pickLabels(['filter', 'hpf', 'room', 'delay'])],
      ['from', 'num', 400, 0, 18000, 10], ['to', 'num', 4000, 0, 18000, 10],
      ['bars', 'choice', 8, [1, 2, 4, 8, 16]],
      ['curve', 'choice', 'exp', ['exp', 'linear'], { exp: { en: 'Exponential', it: 'Esponenziale' }, linear: { en: 'Linear', it: 'Lineare' } }],
      ['repeat', 'choice', 'once', ['once', 'loop'], { once: { en: 'Once', it: 'Una volta' }, loop: { en: 'Loop', it: 'In ciclo' } }]],
    // the slider range of from and to follows the target (Hz for the filters, 0-1 for the sends)
    argRange: (name, a) => (name === 'from' || name === 'to' ? SWEEP_RANGE[a.target] || SWEEP_RANGE.filter : null) },
  lfo: { kind: 'move', label: { en: 'LFO', it: 'Oscillazione' }, knob: 'depth',
    args: [['target', 'choice', 'filter', ['filter', 'pan', 'room', 'delay', 'volume', 'pitch'], pickLabels(['filter', 'pan', 'room', 'delay', 'volume', 'pitch'])],
      ['rate', 'choice', 0.5, [0.0625, 0.125, 0.25, 0.5, 1, 2, 4], barLabels([0.0625, 0.125, 0.25, 0.5, 1, 2, 4])],
      ['depth', 'num', 0.4, 0, 1, 0.05],
      ['shape', 'choice', 'sine', ['sine', 'tri', 'saw', 'ramp', 'square'], { sine: { en: 'Sine', it: 'Sinusoide' }, tri: { en: 'Triangle', it: 'Triangolo' }, saw: { en: 'Saw down', it: 'Dente giù' }, ramp: { en: 'Ramp up', it: 'Rampa su' }, square: { en: 'Square', it: 'Quadra' } }], PHASE_ARG],
  },
  pump: { kind: 'move', label: { en: 'Pump', it: 'Pompa' }, knob: 'depth',
    args: [['depth', 'num', 0.6, 0, 1, 0.05], ['recover', 'num', 0.15, 0.05, 0.5, 0.01],
      ['rate', 'choice', 0.25, [0.25, 0.125, 0.0625], barLabels([0.25, 0.125, 0.0625])], PHASE_ARG] },
  // Gate (D13): the gain dips on the closed steps of 16 per bar, inside held notes; `steps` args are a 16-step string
  gate: { kind: 'move', label: { en: 'Rhythmic gate', it: 'Gate ritmico' }, knob: 'depth',
    args: [['pattern', 'steps', 'x.x.x.x.x.x.x.x.', GATE_PRESETS], ['depth', 'num', 0.8, 0, 1, 0.05],
      ['smooth', 'choice', 0.1, [0, 0.1, 0.25, 0.5], { 0: { en: 'Hard', it: 'Netta' }, 0.1: { en: 'Short', it: 'Breve' }, 0.25: { en: 'Medium', it: 'Media' }, 0.5: { en: 'Soft', it: 'Morbida' } }],
      PHASE_ARG] },
  // Path (D14): a value that follows [bar, value] points from the song's start, inside held notes, through a bus
  path: { kind: 'move', label: { en: 'Path', it: 'Percorso' }, knob: null,
    args: [['target', 'choice', 'filter', PATH_TARGETS, PATH_LABELS], ['points', 'points', []],
      ['smooth', 'choice', 'linear', ['linear', 'step'], { linear: { en: 'Lines', it: 'Linee' }, step: { en: 'Steps', it: 'Gradini' } }]] },
};
export const isMove = d => !!(d && MOVE_DEVICES[d.device]);
const argsOf = d => Object.fromEntries(MOVE_DEVICES[d.device].args.map(([k, , def]) => [k, d[k] ?? def]));
// the movement devices of a rack that play, in rack order, with their values
export const movesOf = rack => (Array.isArray(rack) ? rack : []).filter(d => isMove(d) && d.on !== false).map(d => ({ device: d.device, ...argsOf(d) }));

// value of a Sweep at x bars from its start (0…bars)
const sweepAt = (a, x) => {
  const p = Math.max(0, Math.min(1, x / a.bars));
  return a.curve === 'exp' && FREQ(a.target) && a.from > 0 && a.to > 0 ? a.from * (a.to / a.from) ** p : a.from + (a.to - a.from) * p;
};
const fmtOf = target => (FREQ(target) ? r0 : r3);
// "<a!3 b c>" for a list of values per bar, rotated so its first value falls on bar `start` (music.js rle and rotate)
const rleList = (vals, start) => {
  const n = vals.length, rot = vals.map((_, j) => vals[((j - start) % n + n) % n]);
  const out = [];
  for (let i = 0; i < n;) { let j = i; while (j < n && rot[j] === rot[i]) j++; out.push(j - i > 1 ? `${rot[i]}!${j - i}` : rot[i]); i = j; }
  return out.length === 1 ? null : `"<${out.join(' ')}>"`;
};

// A pad that holds one chord per bar: a legato preset (or an idea that holds), no steps, no note device that cuts it
const CUTTERS = ['seg', 'ply', 'echo', 'off', 'degrade'];
export function heldPad(type, st, rack) {
  if (type !== 'pad' || !st || !st.pad) return false;
  if ((Array.isArray(rack) ? rack : []).some(d => d && d.on !== false && CUTTERS.includes(d.device))) return false;
  const p = st.pad;
  if (p.steps) return false;
  if (p.idea) return !!p.idea.hold;
  const pp = PADS[p.preset] || PADS.pad;
  return !pp[1];
}

// The code of a Sweep for a clip piece. ctx: { a, b } the piece's bars, clipStart, clipBars, barSec, held, steps
export function sweepCode(a, ctx) {
  const c = MOVE_CONTROL[a.target] || 'lpf', fmt = fmtOf(a.target), exp = a.curve === 'exp' && FREQ(a.target) && a.from > 0 && a.to > 0;
  if (ctx.held) {
    // one value per bar at the onset, and an envelope that climbs inside the bar to where the next bar starts (D4)
    const bars = ctx.clipBars, base = [], step = [];
    for (let j = 0; j < bars; j++) {
      const x = a.repeat === 'loop' ? j % a.bars : Math.min(j, a.bars);
      const v = sweepAt(a, x), next = a.repeat === 'once' && j >= a.bars ? v : sweepAt(a, x + 1);
      base.push(fmt(v)); step.push(fmt(next - v));
    }
    const bl = rleList(base, ctx.clipStart), sl = rleList(step, ctx.clipStart);
    const da = sl || step[0];
    return `.${c}(${bl || base[0]})${da === '0' ? '' : `.env({ c: '${c}', a: ${r3(ctx.barSec)}, s: 1, da: ${da} })`}`;
  }
  // notes shorter than a bar: a ramp sampled at each onset, aligned to the clip's start, whose last sixteenth reaches
  // `to` (the FM rise's riseTop)
  const n = Math.max(2, (ctx.steps || 16) * a.bars), k = n / (n - 1);
  const top = exp ? a.from * (a.to / a.from) ** k : a.from + (a.to - a.from) * k;
  const off = ((ctx.clipStart % a.bars) + a.bars) % a.bars;
  const ramp = `saw.slow(${a.bars}).${exp ? 'rangex' : 'range'}(${fmt(a.from)}, ${fmt(top)})${off ? `.late(${off})` : ''}`;
  if (a.repeat === 'loop' || ctx.clipBars <= a.bars) return `.${c}(${ramp})`;
  // once, on a clip longer than the sweep: the ramp for `bars` bars, then `to`
  const sel = rleList(Array.from({ length: ctx.clipBars }, (_, j) => (j < a.bars ? '0' : '1')), ctx.clipStart);
  return `.${c}(${sel}.pick([${ramp}, ${fmt(a.to)}]))`;
}

// Strudel's tremolo (D12): the rack's Tremolo device and an LFO on volume write it the same way. sync: waves per bar
export const tremoloCode = (sync, depth, shape = null, phase = 0) =>
  `.tremolosync(${r3(sync)}).tremolodepth(${r3(depth)})${shape ? `.tremoloshape("${shape}")` : ''}${phaseOffset(phase) ? `.tremolophase(${r5(phaseOffset(phase))})` : ''}`;

// The code of an LFO (D5, D11, D12): the filter LFO for the filter (its generic form with a phase, since the filter LFO
// has no phase input), the generic LFO for pan and the sends, the tremolo for volume, the vibrato for pitch.
// ctx: { barSec (vibrato's rate in Hz), cutoff (the filter's base, for the generic form) }
export function lfoCode(a, ctx = {}) {
  const s = r3(1 / a.rate), po = poKey(a.phase);
  if (a.target === 'volume') return tremoloCode(1 / a.rate, a.depth, a.shape, a.phase);
  if (a.target === 'pitch') return `.vib(${r3(1 / (a.rate * (ctx.barSec || 2)))}).vibmod(${r3(a.depth * VIB_SCALE)})`;
  if (a.target === 'filter') {
    if (!po) return `.lpsync(${s}).lpdepth(${r3(a.depth * LPDEPTH_SCALE)}).lpshape("${a.shape}")`;
    // the same centred swing as lpdepth (a share of the cutoff, peak to peak) around the line's base cutoff
    return `.lfo({ c: 'lpf', s: ${s}, da: ${r0(a.depth * LPDEPTH_SCALE * (ctx.cutoff || 2000))}, sh: '${a.shape}'${po} })`;
  }
  const c = MOVE_CONTROL[a.target];
  // pan: the panner's value runs from -1 to 1, centred: depth 1 goes from one side to the other. Sends: from the base
  // up (dc 0), half the send's range at depth 1, so a send never goes below its own value
  return c === 'pan'
    ? `.lfo({ c: 'pan', s: ${s}, da: ${r3(2 * a.depth)}, sh: '${a.shape}'${po} })`
    : `.lfo({ c: '${c}', s: ${s}, da: ${r3(0.5 * a.depth)}, dc: 0, sh: '${a.shape}'${po} })`;
}

// Pump without a kick (D6): the gain dips at each beat (rate) and climbs back by the next one, never above the track's
// own gain: a rising ramp from -depth × gain to 0 (dc -1)
export const pumpDipCode = (a, gain) => `.lfo({ c: 'gain', s: ${r3(1 / a.rate)}, da: ${r3(a.depth * gain)}, dc: -1, sh: 'ramp'${poKey(a.phase)} })`;

// Gate (D13). The closed runs of a pattern over its shortest period (2, 4, 8 or 16 steps): { period, runs: [[start,
// length]] } in steps, a run that wraps the period's end kept whole
export function gateRuns(pattern) {
  const p = String(pattern || '');
  const period = [2, 4, 8, 16].find(n => p.slice(0, n).repeat(16 / n) === p) || 16;
  const q = p.slice(0, period), o = q.indexOf('x');
  if (o < 0 || !q.includes('.')) return { period, runs: [] };
  const runs = [];
  for (let k = 0; k < period;) {
    const i = (o + k) % period;
    if (q[i] === 'x') { k++; continue; }
    let n = 0; while (k + n < period && q[(o + k + n) % period] !== 'x') n++;
    runs.push([i, n]); k += n;
  }
  return { period, runs };
}
// The code of a Gate: per closed run, a square gain LFO (smooth 0) or two triangle LFOs whose sum is a trapezoid with
// ramps of `smooth` steps centred on the run's edges. In period units, run [u0, u1) of length C, k = 1 - C, ramp r:
// tri_k(u - a) - tri_k(u - a - r) with a = u1 - r/2 rises over r at u1 and falls over r at u0; -tri_k(v) is written as
// tri_(1-k)(v - k) - 1, and depth × gain × k (1 - k) / r on both with the offsets below keeps the sum in [-depth × gain, 0]
export function gateCode(a, gain) {
  const { period, runs } = gateRuns(a.pattern);
  const dg = a.depth * gain, s = r3(16 / period), r = (Number(a.smooth) || 0) / period, ph = (Number(a.phase) || 0) / period;
  const fr = x => ((x % 1) + 1) % 1;
  return runs.map(([start, len]) => {
    const C = len / period, k = 1 - C, u1 = start / period + C + ph;
    if (!r) return `.lfo({ c: 'gain', s: ${s}, da: ${r5(dg)}, dc: -1, sh: 'square', sk: ${r5(k)}, phaseoffset: ${r5(fr(-u1))} })`;
    const al = u1 - r / 2, dep = r5(dg * k * (1 - k) / r);
    return `.lfo({ c: 'gain', s: ${s}, da: ${dep}, dc: -1, sh: 'tri', sk: ${r5(k)}, phaseoffset: ${r5(fr(-al))} })` +
      `.lfo({ c: 'gain', s: ${s}, da: ${dep}, dc: ${r5(-r / k)}, sh: 'tri', sk: ${r5(C)}, phaseoffset: ${r5(fr(-(al + r + k)))} })`;
  }).join('');
}
// Pump with a kick: the write on every kick line, one entry per pumped track ({ orbit, depth, recover })
export function duckCode(pumps) {
  if (!pumps || !pumps.length) return '';
  const one = pumps.length === 1, j = k => (one ? r3(pumps[0][k]) : `"${pumps.map(p => r3(p[k])).join(':')}"`);
  return `.duck(${one ? pumps[0].orbit : `"${pumps.map(p => p.orbit).join(':')}"`}).duckdepth(${j('depth')}).duckattack(${j('recover')})`;
}

// ---------- Path ("Percorso", D14) ----------
// A path line plays Strudel's constant sound `one` into a bus with no dry output; the moved line reads the bus with
// .bmod over a base value. The bus carries 0 to 1 (the path between its lowest and highest value), cut at every point
// and every bar line into pieces, each piece one or two notes of `one` (their gain envelopes are linear):
//   hold x:      gain x, attack E, sustain 1                       (x until the piece's end, then a release of E)
//   ramp x → y:  fall: gain x (1 - E/d), attack E, decay d - E, sustain 0   rise: gain y, attack d, sustain 1
// E is superdough's shortest release (10 ms): every note that ends at a piece's end falls to 0 over E while the next
// piece's first note rises over E, so the two sum to a straight crossfade and a held value never dips or bumps. The
// fall note's gain is scaled so the fall and the rise sum to the straight line from x to y once its attack is over.
// Pieces never cross a bar line, so a start in the middle of the song, or a bus made again after a reset, follows the
// path from the next bar (or the next point).
export const PATH_EDGE = 0.01;
const PATH_GRID = 16;
const q16 = b => Math.round(b * PATH_GRID) / PATH_GRID;
const r4 = x => { const v = Math.round(x * 10000) / 10000; return String(v === 0 ? 0 : v).replace(/^0\./, '.').replace(/^-0\./, '-.'); };
// the points of a path as numbers, bars on the sixteenth grid, sorted (the validator reports what is off)
export const pathPoints = a => (Array.isArray(a && a.points) ? a.points : [])
  .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
  .map(([b, v]) => [q16(Math.max(0, b)), v]).sort((x, y) => x[0] - y[0]);
// the lowest and highest value of a path
export const pathSpan = pts => { const v = pts.map(p => p[1]); return v.length ? [Math.min(...v), Math.max(...v)] : [0, 0]; };
// the value of a path at bar t: the first point's before it, the last one's after it, straight lines (linear) or held
// values (step) between points
export function pathAt(pts, t, smooth = 'linear') {
  if (!pts.length) return 0;
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = pts.length - 1; i >= 0; i--) {
    if (pts[i][0] <= t) {
      const n = pts[i + 1];
      if (!n || smooth === 'step' || n[0] === pts[i][0]) return pts[i][1];
      return pts[i][1] + (n[1] - pts[i][1]) * (t - pts[i][0]) / (n[0] - pts[i][0]);
    }
  }
  return pts[0][1];
}
// drops each point that lies on the straight line through its neighbours within `tol` (the first and last stay)
export function thinPath(pts, tol) {
  if (pts.length <= 2) return pts.slice();
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], c = pts[i + 1], b = pts[i];
    const line = a[1] + (c[1] - a[1]) * (b[0] - a[0]) / ((c[0] - a[0]) || 1);
    if (Math.abs(b[1] - line) > tol) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// A Path device from measured points (D14), for Decode and other writers: values clamped to the target's range, bars
// rounded to 1/perBar (at most 16 a bar), a repeated bar kept once (its first value), points on a straight line within
// 1 % of the span dropped, at most 256 points; null when the path is flat within 1 % (of the lowest value for the
// filters, of the range for the others)
export function pathDevice(target, points, { perBar = 4, smooth = 'linear' } = {}) {
  const range = PATH_RANGE[target];
  if (!range || !Array.isArray(points)) return null;
  const per = Math.max(1, Math.min(PATH_PER_BAR, Math.round(perBar) || 4)), fmt = FREQ(target) ? r0 : r3;
  const seen = new Set(), pts = [];
  for (const p of points.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((x, y) => x[0] - y[0])) {
    const b = Math.round(Math.max(0, p[0]) * per) / per;
    if (seen.has(b)) continue;
    seen.add(b); pts.push([b, +fmt(Math.max(range[0], Math.min(range[1], p[1])))]);
  }
  if (!pts.length) return null;
  const [lo, hi] = pathSpan(pts), span = hi - lo;
  // flat: a frequency within 1 % of its lowest value, any other value within 1 % of its range
  if (FREQ(target) ? hi <= lo * 1.01 : span <= 0.01 * (range[1] - range[0])) return null;
  let tol = 0.01 * span, out = thinPath(pts, tol);
  while (out.length > PATH_MAX_POINTS) { tol *= 2; out = thinPath(pts, tol); }
  return { device: 'path', target, points: out, ...(smooth === 'step' ? { smooth: 'step' } : {}) };
}

// The presets of a Path's Compose card (D14: the card shows a path read-only; points come from the song file, a writer
// or one of these): over the first or last 8 bars (fewer on a shorter span) of the bars [s, e) the track plays
export const PATH_PRESETS = {
  fadein: { en: 'Fade in', it: 'Entrata in dissolvenza' }, fadeout: { en: 'Fade out', it: 'Uscita in dissolvenza' },
  open: { en: 'Filter opens', it: 'Filtro che si apre' }, close: { en: 'Filter closes', it: 'Filtro che si chiude' },
};
export function pathPreset(name, s, e) {
  const n = Math.max(1, Math.min(8, e - s));
  const pts = { fadein: ['volume', [[s, 0], [s + n, 1]]], fadeout: ['volume', [[e - n, 1], [e, 0]]], open: ['filter', [[s, 400], [s + n, 4000]]], close: ['filter', [[e - n, 4000], [e, 400]]] }[name];
  return pts ? { device: 'path', target: pts[0], points: pts[1] } : null;
}

// The path line of one Path (D14): the bus's notes for the whole song. opts: { bus, total (bars), barSec (seconds of
// each bar), label (the line's comment) } → a `$:` line, or null for a flat path (its base alone holds the value)
export function pathLine(a, { bus, total, barSec, label = '' }) {
  const pts = pathPoints(a), [lo, hi] = pathSpan(pts), span = hi - lo;
  if (!pts.length || !(span > 0) || !(total > 0)) return null;
  const smooth = a.smooth === 'step' ? 'step' : 'linear', E = PATH_EDGE;
  const v = t => (pathAt(pts, t, smooth) - lo) / span;
  const A = [], B = [];
  for (let k = 0; k < total; k++) {
    const sec = Array.isArray(barSec) ? barSec[k] || barSec[barSec.length - 1] : barSec;
    const cuts = [...new Set([k, ...pts.map(p => p[0]).filter(b => b > k && b < k + 1), k + 1])].sort((x, y) => x - y);
    const pieces = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const x = v(cuts[i]), y = smooth === 'step' ? x : v(cuts[i + 1]), w = Math.round((cuts[i + 1] - cuts[i]) * PATH_GRID);
      const last = pieces[pieces.length - 1];
      // two held pieces of the same value are one
      if (last && last.x === last.y && x === y && last.y === x) { last.w += w; continue; }
      pieces.push({ x, y, w });
    }
    const fa = [], fb = [];
    for (const { x, y, w } of pieces) {
      const d = w / PATH_GRID * sec;
      if (Math.abs(x - y) < 1e-6 || d <= 2 * E) {
        const h = (x + y) / 2;
        fa.push([h > 0 ? `${r4(h)}:${r4(E)}:0:1` : '~', w]); fb.push(['~', w]);
      } else {
        fa.push([x > 0 ? `${r4(x * (1 - E / d))}:${r4(E)}:${r4(d - E)}:0` : '~', w]);
        fb.push([y > 0 ? `${r4(y)}:${r4(d)}:0:1` : '~', w]);
      }
    }
    A.push(barTokens(fa)); B.push(barTokens(fb));
  }
  const la = cycleList(A), lb = B.every(x => x === '~') ? null : cycleList(B);
  return `$: ${lb ? `stack(${la}, ${lb})` : la}.as("gain:attack:decay:sustain").s("one").bus(${bus}).dry(0)${label ? `  // ${label}` : ''}`;
}
// one bar's notes: "[a@4 ~@12]", rests merged, a single note alone
function barTokens(list) {
  const m = [];
  for (const [t, w] of list) { const l = m[m.length - 1]; if (l && l[0] === '~' && t === '~') l[1] += w; else m.push([t, w]); }
  if (m.length === 1) return m[0][0];
  return `[${m.map(([t, w]) => (w === 1 ? t : `${t}@${w}`)).join(' ')}]`;
}
// a value per bar as "<a!3 b>" (one value alone as "a")
function cycleList(vals) {
  const out = [];
  for (let i = 0; i < vals.length;) { let j = i; while (j < vals.length && vals[j] === vals[i]) j++; out.push(j - i > 1 ? `${vals[i]}!${j - i}` : vals[i]); i = j; }
  return out.length === 1 && !out[0].includes('!') ? `"${out[0]}"` : `"<${out.join(' ')}>"`;
}
// The moved line's code for one Path (D14): the base and the bus modulator. Filters, sends and pan: the base at the
// path's lowest value (a send at least .001 so its node exists) and an absolute depth `da` of the span (pan's panner
// runs from -1 to 1: twice the span). Volume: the line's postgain times the lowest share (at least .001), and a depth
// relative to it (`dep`, span / share), so the path scales whatever postgain the line plays (shapes, a guitar's gate)
// and stays apart from the gain a Gate or a Pump dips. superdough's bmod divides its depth by .3, the gain `one`'s
// notes pass at: the bus's 0 to 1 arrives as 0 to 1 times the depth. A base value must come before its bmod on the
// line: superdough reads a postgain set after the bmod with the wrong depth (measured 4 to 8 times too deep), so the
// volume's calls go together at the line's end, before its orbit.
export function pathMove(a, bus) {
  const pts = pathPoints(a);
  if (!pts.length) return null;
  const [lo, hi] = pathSpan(pts), span = hi - lo, flat = !(span > 0);
  if (a.target === 'volume') {
    const m = Math.max(lo, 0.001);
    return { code: '', post: `.mul(postgain(${r4(m)}))${flat ? '' : `.bmod({ b: ${bus}, c: 'postgain', dep: ${r4(span / m)} })`}`, base: {}, replace: [] };
  }
  const c = MOVE_CONTROL[a.target] || 'lpf';
  const send = c === 'room' || c === 'delay';
  const b = send ? Math.max(lo, 0.001) : lo, fmt = FREQ(a.target) ? r0 : r3;
  const da = c === 'pan' ? 2 * span : hi - b;
  return { code: `.${c}(${fmt(b)})${flat ? '' : `.bmod({ b: ${bus}, c: '${c}', da: ${fmt(da)} })`}`, base: {}, replace: [c] };
}
// the paths of a song on buses 1 to 8 in track order and rack order, whether or not the track plays (so a track that
// comes in later never moves another's bus): [{ track (index), device (index in the rack), bus }]
export function pathBuses(tracks) {
  const out = [];
  (tracks || []).forEach((tr, ti) => (Array.isArray(tr && tr.rack) ? tr.rack : []).forEach((d, di) => {
    if (d && d.device === 'path' && d.on !== false && MOVE_TYPES.includes(tr.type) && out.length < PATH_MAX_SONG) out.push({ track: ti, device: di, bus: out.length + 1 });
  }));
  return out;
}

// The movement of one clip piece of a track. ctx: { st (the clip's state), a, b, clipStart, clipBars, barSec, steps,
// kick (the section plays a kick), rack, paths ({ target: bus } of the track's Paths) } → { code, base: { control:
// value }, replace: [control], post, keep: [control] } or null; keep: the controls a Path's base writes, which a growth
// never hides or comments out (its bmod needs them); post: calls that go at the end of the line, before its orbit (a volume
// path's postgain, after any postgain the line sets)
export function moveFor(type, rack, ctx) {
  const moves = movesOf(rack);
  if (!moves.length || !MOVE_TYPES.includes(type)) return null;
  const ch = (ctx.st && ctx.st[type]) || {};
  const held = heldPad(type, ctx.st, rack);
  let code = '', post = '';
  const base = {}, replace = [], keep = [];
  for (const m of moves) {
    if (m.device === 'path') {
      const bus = ctx.paths && ctx.paths[m.target];
      const pm = bus ? pathMove(m, bus) : null;
      if (pm) { code += pm.code; replace.push(...pm.replace); keep.push(...pm.replace); post += pm.post || ''; }
      continue;
    }
    if (m.device === 'sweep') { code += sweepCode(m, { ...ctx, held }); replace.push(MOVE_CONTROL[m.target] || 'lpf'); }
    if (m.device === 'lfo') {
      const c = MOVE_CONTROL[m.target];
      const cutoff = Math.min(Number.isFinite(ch.cutoff) ? ch.cutoff : 18000, 18000);
      code += lfoCode(m, { barSec: ctx.barSec, cutoff });
      // volume and pitch need no base (the tremolo and the vibrato make their own nodes); an LFO on volume takes the
      // Tremolo device's calls out of the line before it
      if (m.target === 'volume') replace.push(...TREMOLO_CALLS);
      else if (!c) { /* pitch */ }
      // the track's own value when it has one, else the device's centre
      else if (c === 'lpf') base.lpf = r0(cutoff);
      else if ((c === 'room' || c === 'delay') && Number(ch[c]) > 0) base[c] = r3(ch[c]);
      else base[c] = r3(MOVE_CENTRE[c]);
    }
    if (m.device === 'pump' && !ctx.kick) code += pumpDipCode(m, lineGain(type, ch, ctx));
    if (m.device === 'gate') code += gateCode(m, lineGain(type, ch, ctx));
  }
  // a Sweep wins over an LFO on the same control's base
  for (const c of replace) delete base[c];
  return code || post ? { code, base, replace, post, keep } : null;
}
// the gain the line plays at (a Pump's dip and a Gate go down from it): the track's (the lower end of a ramp), the
// guitar's fixed .gain(.8) before its post gain, a code track's own .gain(n) or 1
function lineGain(type, ch, ctx) {
  const own = [ch.gain, ch.gainEnd].filter(Number.isFinite);
  const g = type === 'guitar' ? 0.8 : type === 'code' ? codeGain(ctx.code) : own.length ? Math.min(...own) : 1;
  return Number.isFinite(g) && g > 0 ? g : 1;
}
const codeGain = code => { const m = /\.gain\(\s*([\d.]+)\s*\)/.exec(String(code || '')); return m ? +m[1] : 1; };

// the earlier calls of `names` taken out of a text (balanced brackets), as compile.js stripFns
const strip = (text, names) => {
  let out = text;
  for (const n of names) for (let at = out.indexOf(`.${n}(`); at >= 0; at = out.indexOf(`.${n}(`, at)) {
    let depth = 0, k = at + n.length + 1;
    for (; k < out.length; k++) { if (out[k] === '(') depth++; else if (out[k] === ')' && --depth === 0) break; }
    out = out.slice(0, at) + out.slice(k + 1);
  }
  return out;
};
// Base values and replaced calls on the lines of one clip piece (D3, D4): on each layer that carries the movement code,
// the calls of the controls a Sweep writes are taken out before it (a code track keeps its own code: the later call
// wins there), and a base value goes before it for each control the layer does not write yet
export function applyMove(lines, mv, { code = false } = {}) {
  if (!mv || (!mv.code && !mv.post)) return lines;
  const out = lines.slice();
  // a volume path alone: its calls before the orbit of every layer
  if (!mv.code) return out.map(l => { const o = l.indexOf('.orbit('); return o >= 0 ? l.slice(0, o) + mv.post + l.slice(o) : l; });
  for (let i = 0; i < out.length; i++) {
    const at = out[i].indexOf(mv.code);
    if (at < 0) continue;
    let s = i;
    while (s > 0 && !/^[_S]?\$:/.test(out[s])) s--;
    if (!code && mv.replace.length) {
      for (let k = s; k < i; k++) out[k] = strip(out[k], mv.replace);
      const pos = out[i].indexOf(mv.code);
      out[i] = strip(out[i].slice(0, pos), mv.replace) + out[i].slice(pos);
    }
    const pos = out[i].indexOf(mv.code), before = out.slice(s, i).join('\n') + out[i].slice(0, pos);
    const add = Object.entries(mv.base).filter(([c]) => !before.includes(`.${c}(`)).map(([c, v]) => `.${c}(${v})`).join('');
    if (add) out[i] = out[i].slice(0, pos) + add + out[i].slice(pos);
    // a volume path's postgain goes before the line's orbit, after any postgain the line sets (a guitar's gate)
    if (mv.post) {
      const end = out[i].indexOf(mv.code) + mv.code.length, o = out[i].indexOf('.orbit(', end - 1);
      const at = o >= 0 ? o : end;
      out[i] = out[i].slice(0, at) + mv.post + out[i].slice(at);
    }
  }
  return out;
}

// The validator's rules for movement devices (rack.js checkRack): where they go, how many, the Sweep's ranges and what
// it replaces
export function checkMoves(rack, p, err, warn, type = null, settings = {}) {
  const moves = rack.map((d, i) => [d, i]).filter(([d]) => isMove(d));
  if (!moves.length) return;
  if (type && !MOVE_TYPES.includes(type)) for (const [d, i] of moves) err(`${p}[${i}]`, `${d.device} moves melodic tracks only (${MOVE_TYPES.join(', ')})`);
  moves.forEach(([, i], k) => { if (k >= MOVE_MAX) err(`${p}[${i}]`, `at most ${MOVE_MAX} movement devices (${MOVE_NAMES}) on a track`); });
  const seen = new Set();
  for (const [d, i] of moves) {
    const a = argsOf(d), key = d.device === 'pump' || d.device === 'gate' ? d.device : `${d.device}|${a.target}`;
    if (seen.has(key)) err(`${p}[${i}]`, d.device === 'pump' || d.device === 'gate' ? `at most one ${d.device} on a track` : `at most one ${d.device} on ${a.target}`);
    if ((d.device === 'gate' && seen.has('pump')) || (d.device === 'pump' && seen.has('gate'))) err(`${p}[${i}]`, 'a gate and a pump both dip the gain: use one of them on a track');
    seen.add(key);
    if (d.device === 'gate') {
      const n = gateRuns(a.pattern).runs.length;
      if (n > GATE_MAX_RUNS) warn(`${p}[${i}].pattern`, `${n} closed runs that do not repeat: each is one or two LFOs on every note, heavy on the CPU (at most ${GATE_MAX_RUNS} advised)`);
      continue;
    }
    if (d.device === 'path') { checkPath(d, `${p}[${i}]`, err, warn); if (rack.some((x, j) => j < i && isMove(x) && x.device === 'sweep' && argsOf(x).target === a.target)) err(`${p}[${i}]`, `a path and a sweep both write the ${a.target}: use one of them`); continue; }
    if (d.device === 'sweep' && rack.some((x, j) => j < i && isMove(x) && x.device === 'path' && argsOf(x).target === a.target)) err(`${p}[${i}]`, `a path and a sweep both write the ${a.target}: use one of them`);
    if (d.device === 'lfo' && a.target === 'pitch') {
      if (a.shape !== 'sine') warn(`${p}[${i}].shape`, 'the vibrato is always a sine: shape does nothing on pitch');
      if (a.phase) warn(`${p}[${i}].phase`, 'the vibrato starts with each note: phase does nothing on pitch');
    }
    if (d.device === 'lfo' && a.target === 'volume' && d.on !== false && rack.some(x => x && x.device === 'tremolo' && x.on !== false)) warn(`${p}[${i}]`, 'the lfo on volume replaces the tremolo device on its lines');
    if (d.device !== 'sweep') continue;
    const [lo, hi] = SWEEP_RANGE[a.target] || SWEEP_RANGE.filter;
    for (const k of ['from', 'to']) if (typeof a[k] === 'number' && (a[k] < lo || a[k] > hi)) err(`${p}[${i}].${k}`, `a number from ${lo} to ${hi} for target ${a.target}`);
    if (d.curve === 'exp' && !FREQ(a.target)) warn(`${p}[${i}].curve`, `a sweep on ${a.target} is linear`);
    const s = settings || {};
    if (d.on !== false && a.target === 'filter' && ((s.cutoffEnd !== null && s.cutoffEnd !== undefined && s.cutoffEnd !== s.cutoff) || (s.move && s.move !== 'fisso'))) warn(`${p}[${i}]`, 'the sweep replaces the track\'s cutoff ramp (cutoffEnd or a moving filter) on its lines');
    if (d.on !== false && (a.target === 'room' || a.target === 'delay') && Number(s[a.target]) > 0) warn(`${p}[${i}]`, `the sweep replaces the track's own ${a.target} on its lines`);
  }
}

// A Path's points (D14): [bar, value] pairs, bars from the song's start increasing on the sixteenth grid, at most 16 a
// bar and 256 in all, values in the target's range
export function checkPath(d, p, err, warn) {
  const pts = d.points, range = PATH_RANGE[d.target || 'filter'] || PATH_RANGE.filter;
  if (!Array.isArray(pts) || !pts.length) { err(`${p}.points`, 'a list of [bar, value] points, for example [[0, 400], [8, 4000]]'); return; }
  if (pts.length > PATH_MAX_POINTS) err(`${p}.points`, `${pts.length} points: at most ${PATH_MAX_POINTS} on a path`);
  const perBar = new Map();
  let prev = -Infinity, offGrid = false;
  pts.forEach((pt, k) => {
    if (!Array.isArray(pt) || pt.length !== 2 || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) { err(`${p}.points[${k}]`, 'a [bar, value] pair of numbers'); return; }
    const [b, v] = pt;
    if (b < 0) err(`${p}.points[${k}]`, 'a bar from 0 (the song\'s start)');
    else if (b <= prev) err(`${p}.points[${k}]`, 'bars must increase from one point to the next');
    if (v < range[0] || v > range[1]) err(`${p}.points[${k}]`, `a value from ${range[0]} to ${range[1]} for target ${d.target || 'filter'}${d.target === 'volume' ? ' (a share of the track\'s gain)' : ''}`);
    if (Math.abs(b * PATH_GRID - Math.round(b * PATH_GRID)) > 1e-6) offGrid = true;
    const bar = Math.floor(b); perBar.set(bar, (perBar.get(bar) || 0) + 1);
    prev = Math.max(prev, b);
  });
  for (const [bar, n] of perBar) if (n > PATH_PER_BAR) { err(`${p}.points`, `${n} points in bar ${bar + 1}: at most ${PATH_PER_BAR} a bar`); break; }
  if (offGrid) warn(`${p}.points`, 'bars are rounded to the sixteenth (1/16 of a bar)');
}

// The preview of a device's code on its Compose card: the code of a clip of 8 bars at 120 BPM from bar 1
export function movePreview(d, type) {
  const a = { device: d.device, ...argsOf(d) };
  if (a.device === 'sweep') return sweepCode(a, { clipStart: 0, clipBars: Math.max(8, a.bars), barSec: 2, held: type === 'pad', steps: 16 });
  if (a.device === 'lfo') return lfoCode(a, { barSec: 2, cutoff: 2000 });
  if (a.device === 'gate') return gateCode(a, 1);
  if (a.device === 'path') { const pm = pathMove(a, 1); return pm ? pm.code + (pm.post || '') : ''; }
  return `${duckCode([{ orbit: 'n', depth: a.depth, recover: a.recover }]).replace('.duck(n)', '.duck(…)')} · ${pumpDipCode(a, 1)}`;
}
