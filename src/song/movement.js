// Movement devices of the rack (sound-modulation, #95): Sweep ("Apertura"), LFO ("Oscillazione") and Pump ("Pompa").
// They move a melodic track's sound over time, inside held notes and across bars. Strudel reads effect values at each
// note's onset, so only modulators built at the onset move inside a note: the writer uses the filter LFO (lpsync,
// lpdepth, lpshape), the generic LFO and envelope (.lfo(), .env(), always with an absolute depth `da`) and the
// sidechain (duck on the kick lines). No random value: every device is a pure function of its arguments and the song
// time. The compiler (compile.js) asks moveFor() for each clip piece, passes the code after the other rack devices,
// then applyMove() adds the base values a modulator needs and drops the earlier calls a Sweep replaces.
import { PADS } from '../music.js';

const r0 = x => String(Math.round(x));
const r3 = x => String(Math.round(x * 1000) / 1000);
export const MOVE_TYPES = ['bass', 'guitar', 'arp', 'hook', 'pad', 'code'];
export const MOVE_MAX = 2;
// the control each target writes
export const MOVE_CONTROL = { filter: 'lpf', hpf: 'hpf', room: 'room', delay: 'delay', pan: 'pan' };
const FREQ = t => t === 'filter' || t === 'hpf';
// Sweep's from and to per target, and their defaults when the target changes
export const SWEEP_RANGE = { filter: [60, 18000, 10], hpf: [60, 18000, 10], room: [0, 1, 0.05], delay: [0, 1, 0.05] };
export const SWEEP_DEFAULTS = { filter: { from: 400, to: 4000, curve: 'exp' }, hpf: { from: 60, to: 1200, curve: 'exp' }, room: { from: 0, to: 0.6, curve: 'linear' }, delay: { from: 0, to: 0.5, curve: 'linear' } };
// rates in bars (LFO) and in bars per dip (Pump without a kick)
const BAR_LABELS = { 0.0625: ['1/16 bar', '1/16 battuta'], 0.125: ['1/8 bar', '1/8 battuta'], 0.25: ['1/4 bar', '1/4 battuta'], 0.5: ['1/2 bar', '1/2 battuta'], 1: ['1 bar', '1 battuta'], 2: ['2 bars', '2 battute'], 4: ['4 bars', '4 battute'] };
const barLabels = list => Object.fromEntries(list.map(v => [v, { en: BAR_LABELS[v][0], it: BAR_LABELS[v][1] }]));
const TARGET_LABELS = { filter: { en: 'Filter', it: 'Filtro' }, hpf: { en: 'High-pass', it: 'Passa-alto' }, room: { en: 'Reverb send', it: 'Mandata riverbero' }, delay: { en: 'Delay send', it: 'Mandata delay' }, pan: { en: 'Pan', it: 'Panorama' } };
const pickLabels = keys => Object.fromEntries(keys.map(k => [k, TARGET_LABELS[k]]));
// the filter LFO's depth: lpdepth is a share of the cutoff, peak to peak (superdough createFilter: depth × frequency,
// centred), clamped to 30-20000 Hz; depth 1 sways from 0.1 to 1.9 times the cutoff
export const LPDEPTH_SCALE = 1.8;
// the base a generic modulator needs when the line holds no value for its control (D3)
export const MOVE_CENTRE = { pan: 0.5, room: 0.001, delay: 0.001 };

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
    args: [['target', 'choice', 'filter', ['filter', 'pan', 'room', 'delay'], pickLabels(['filter', 'pan', 'room', 'delay'])],
      ['rate', 'choice', 0.5, [0.0625, 0.125, 0.25, 0.5, 1, 2, 4], barLabels([0.0625, 0.125, 0.25, 0.5, 1, 2, 4])],
      ['depth', 'num', 0.4, 0, 1, 0.05],
      ['shape', 'choice', 'sine', ['sine', 'tri', 'saw', 'ramp', 'square'], { sine: { en: 'Sine', it: 'Sinusoide' }, tri: { en: 'Triangle', it: 'Triangolo' }, saw: { en: 'Saw down', it: 'Dente giù' }, ramp: { en: 'Ramp up', it: 'Rampa su' }, square: { en: 'Square', it: 'Quadra' } }]],
  },
  pump: { kind: 'move', label: { en: 'Pump', it: 'Pompa' }, knob: 'depth',
    args: [['depth', 'num', 0.6, 0, 1, 0.05], ['recover', 'num', 0.15, 0.05, 0.5, 0.01],
      ['rate', 'choice', 0.25, [0.25, 0.125, 0.0625], barLabels([0.25, 0.125, 0.0625])]] },
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

// The code of an LFO (D5): the filter LFO for the filter, the generic LFO for pan and the sends
export function lfoCode(a) {
  const s = r3(1 / a.rate);
  if (a.target === 'filter') return `.lpsync(${s}).lpdepth(${r3(a.depth * LPDEPTH_SCALE)}).lpshape("${a.shape}")`;
  const c = MOVE_CONTROL[a.target];
  // pan: the panner's value runs from -1 to 1, centred: depth 1 goes from one side to the other. Sends: from the base
  // up (dc 0), half the send's range at depth 1, so a send never goes below its own value
  return c === 'pan'
    ? `.lfo({ c: 'pan', s: ${s}, da: ${r3(2 * a.depth)}, sh: '${a.shape}' })`
    : `.lfo({ c: '${c}', s: ${s}, da: ${r3(0.5 * a.depth)}, dc: 0, sh: '${a.shape}' })`;
}

// Pump without a kick (D6): the gain dips at each beat (rate) and climbs back by the next one, never above the track's
// own gain: a rising ramp from -depth × gain to 0 (dc -1)
export const pumpDipCode = (a, gain) => `.lfo({ c: 'gain', s: ${r3(1 / a.rate)}, da: ${r3(a.depth * gain)}, dc: -1, sh: 'ramp' })`;
// Pump with a kick: the write on every kick line, one entry per pumped track ({ orbit, depth, recover })
export function duckCode(pumps) {
  if (!pumps || !pumps.length) return '';
  const one = pumps.length === 1, j = k => (one ? r3(pumps[0][k]) : `"${pumps.map(p => r3(p[k])).join(':')}"`);
  return `.duck(${one ? pumps[0].orbit : `"${pumps.map(p => p.orbit).join(':')}"`}).duckdepth(${j('depth')}).duckattack(${j('recover')})`;
}

// The movement of one clip piece of a track. ctx: { st (the clip's state), a, b, clipStart, clipBars, barSec, steps,
// kick (the section plays a kick), rack } → { code, base: { control: value }, replace: [control] } or null
export function moveFor(type, rack, ctx) {
  const moves = movesOf(rack);
  if (!moves.length || !MOVE_TYPES.includes(type)) return null;
  const ch = (ctx.st && ctx.st[type]) || {};
  const held = heldPad(type, ctx.st, rack);
  let code = '';
  const base = {}, replace = [];
  for (const m of moves) {
    if (m.device === 'sweep') { code += sweepCode(m, { ...ctx, held }); replace.push(MOVE_CONTROL[m.target] || 'lpf'); }
    if (m.device === 'lfo') {
      code += lfoCode(m);
      const c = MOVE_CONTROL[m.target];
      // the track's own value when it has one, else the device's centre
      if (c === 'lpf') base.lpf = r0(Math.min(Number.isFinite(ch.cutoff) ? ch.cutoff : 18000, 18000));
      else if ((c === 'room' || c === 'delay') && Number(ch[c]) > 0) base[c] = r3(ch[c]);
      else base[c] = r3(MOVE_CENTRE[c]);
    }
    if (m.device === 'pump' && !ctx.kick) {
      // the gain the line plays at: the track's (the lower end of a ramp), the guitar's fixed .gain(.8) before its
      // post gain, a code track's own .gain(n) or 1
      const own = [ch.gain, ch.gainEnd].filter(Number.isFinite);
      const g = type === 'guitar' ? 0.8 : type === 'code' ? codeGain(ctx.code) : own.length ? Math.min(...own) : 1;
      code += pumpDipCode(m, Number.isFinite(g) && g > 0 ? g : 1);
    }
  }
  // a Sweep wins over an LFO on the same control's base
  for (const c of replace) delete base[c];
  return code ? { code, base, replace } : null;
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
  if (!mv || !mv.code) return lines;
  const out = lines.slice();
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
  }
  return out;
}

// The validator's rules for movement devices (rack.js checkRack): where they go, how many, the Sweep's ranges and what
// it replaces
export function checkMoves(rack, p, err, warn, type = null, settings = {}) {
  const moves = rack.map((d, i) => [d, i]).filter(([d]) => isMove(d));
  if (!moves.length) return;
  if (type && !MOVE_TYPES.includes(type)) for (const [d, i] of moves) err(`${p}[${i}]`, `${d.device} moves melodic tracks only (${MOVE_TYPES.join(', ')})`);
  moves.forEach(([, i], k) => { if (k >= MOVE_MAX) err(`${p}[${i}]`, `at most ${MOVE_MAX} movement devices (sweep, lfo, pump) on a track`); });
  const seen = new Set();
  for (const [d, i] of moves) {
    const a = argsOf(d), key = d.device === 'pump' ? 'pump' : `${d.device}|${a.target}`;
    if (seen.has(key)) err(`${p}[${i}]`, d.device === 'pump' ? 'at most one pump on a track' : `at most one ${d.device} on ${a.target}`);
    seen.add(key);
    if (d.device !== 'sweep') continue;
    const [lo, hi] = SWEEP_RANGE[a.target] || SWEEP_RANGE.filter;
    for (const k of ['from', 'to']) if (typeof a[k] === 'number' && (a[k] < lo || a[k] > hi)) err(`${p}[${i}].${k}`, `a number from ${lo} to ${hi} for target ${a.target}`);
    if (d.curve === 'exp' && !FREQ(a.target)) warn(`${p}[${i}].curve`, `a sweep on ${a.target} is linear`);
    const s = settings || {};
    if (d.on !== false && a.target === 'filter' && ((s.cutoffEnd !== null && s.cutoffEnd !== undefined && s.cutoffEnd !== s.cutoff) || (s.move && s.move !== 'fisso'))) warn(`${p}[${i}]`, 'the sweep replaces the track\'s cutoff ramp (cutoffEnd or a moving filter) on its lines');
    if (d.on !== false && (a.target === 'room' || a.target === 'delay') && Number(s[a.target]) > 0) warn(`${p}[${i}]`, `the sweep replaces the track's own ${a.target} on its lines`);
  }
}

// The preview of a device's code on its Compose card: the code of a clip of 8 bars at 120 BPM from bar 1
export function movePreview(d, type) {
  const a = { device: d.device, ...argsOf(d) };
  if (a.device === 'sweep') return sweepCode(a, { clipStart: 0, clipBars: Math.max(8, a.bars), barSec: 2, held: type === 'pad', steps: 16 });
  if (a.device === 'lfo') return lfoCode(a);
  return `${duckCode([{ orbit: 'n', depth: a.depth, recover: a.recover }]).replace('.duck(n)', '.duck(…)')} · ${pumpDipCode(a, 1)}`;
}
