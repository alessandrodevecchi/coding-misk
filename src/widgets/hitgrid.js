// The hit grid (code-over-visual, custom-code-widgets D9): an app code widget, `._hitgrid()`, one row per drum sound and
// variant with the bar's steps, the current step, played and coming hits. Drawn from notes (the haps of the code), never
// from audio. Pure: data and painter checked in Node (tools/check-code-over.mjs).
//
// A note: { inst (the `analyze` name), b, e (cycles), p (pitch: a MIDI number, or the sound's name for a sample), lv
// (gain × velocity), n (the sample's variant, or undefined) }. One cycle is one bar.

export const HG_DEFAULTS = Object.freeze({ steps: 16, bars: 1, rows: 'auto', names: 'short', variants: true, extra: ['bass'], style: 'auto', trail: 2, size: 1 });
// limits of the numbers a call or the settings can give
export const HG_LIMITS = { steps: [4, 32], bars: [1, 4], trail: [0, 8], size: [0.6, 2.5] };
// the drum instruments (`analyze` names) whose notes are hits
export const DRUM_INSTS = new Set(['kick', 'snare', 'hats', 'clap', 'perc', 'toms', 'ride', 'crash', 'beat', 'drums', 'break', 'rim']);
// short names of the sounds, and their order (kick, snare, clap, rim, hats, open hats, toms, cymbals, other)
const SHORT = { bd: 'bd', kick: 'bd', sd: 'sd', snare: 'sd', cp: 'cp', clap: 'cp', rim: 'rm', rm: 'rm', hh: 'hh', ch: 'hh', oh: 'oh', lt: 'lt', mt: 'mt', ht: 'ht', cr: 'cr', rd: 'rd', cb: 'cb', sh: 'sh', perc: 'pc', tb: 'tb' };
const ORDER = ['bd', 'sd', 'cp', 'rm', 'hh', 'oh', 'lt', 'mt', 'ht', 'cr', 'rd', 'cb', 'sh', 'tb', 'pc'];
const INST_ORDER = ['kick', 'snare', 'clap', 'rim', 'hats', 'perc', 'toms', 'ride', 'crash', 'beat', 'drums', 'break'];
// steps and beats of a meter ('4/4', '3/4', '5/4', '7/8')
const METER = { '4/4': [16, 4], '3/4': [12, 3], '5/4': [20, 5], '7/8': [14, 7] };

const num = (v, [lo, hi], d) => { const x = Number(v); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
// the options of a call merged over the defaults (from Settings): unknown keys ignored, numbers kept in their limits
export function hitgridOptions(call = {}, base = HG_DEFAULTS) {
  const o = { ...HG_DEFAULTS, ...(base || {}) }, c = call && typeof call === 'object' ? call : {};
  for (const k of Object.keys(HG_DEFAULTS)) if (c[k] !== undefined) o[k] = c[k];
  for (const k of Object.keys(HG_LIMITS)) o[k] = num(o[k], HG_LIMITS[k], HG_DEFAULTS[k]);
  o.steps = Math.round(o.steps); o.bars = Math.round(o.bars); o.trail = Math.round(o.trail);
  o.names = o.names === 'long' ? 'long' : 'short';
  o.variants = o.variants !== false;
  o.style = ['blocks', 'text'].includes(o.style) ? o.style : 'auto';
  o.extra = Array.isArray(o.extra) ? o.extra.filter(x => typeof x === 'string') : [];
  o.rows = Array.isArray(o.rows) ? o.rows.filter(x => typeof x === 'string') : 'auto';
  return o;
}

// the window of notes the grid needs at cycle cyc: the bars shown
export function hitgridWindow(cyc, o) { const b0 = Math.floor(cyc / o.bars) * o.bars; return [b0, b0 + o.bars]; }

// the row of a hit: its sound (and variant), or its instrument with names 'long'; null for a note that is no hit
function rowOf(x, o) {
  const extra = o.extra.includes(x.inst);
  if (!extra && !DRUM_INSTS.has(x.inst)) return null;
  if (extra) return { key: `~${x.inst}`, label: x.inst, rank: 1000 + o.extra.indexOf(x.inst) };
  if (o.names === 'long') { const i = INST_ORDER.indexOf(x.inst); return { key: x.inst, label: x.inst, rank: (i < 0 ? 99 : i) * 10 }; }
  const base = String(typeof x.p === 'string' ? x.p : x.inst).replace(/^.*_/, '').replace(/\d+$/, '').toLowerCase();
  const short = SHORT[base] || base.slice(0, 2), i = ORDER.indexOf(short), v = o.variants && Number.isFinite(x.n) && x.n !== 0 ? x.n : null;
  return { key: v === null ? short : `${short}:${v}`, label: v === null ? short : `${short}:${v}`, rank: (i < 0 ? 99 : i) * 10 + (v === null ? 0 : Math.min(9, 1 + v)) };
}

// → { rows: [{ key, label }], hits: Map(key → Map(step → level)), step (current, 0-based), steps (shown), beats (shown),
//   bar (1-based, the bar playing), stepInBar } . memo: a Map kept by the caller for the song (rows seen stay)
export function hitgridData(notes, cyc, o, { meter = '4/4', memo = null } = {}) {
  const [perBar, beatsPerBar] = METER[meter] || METER['4/4'];
  // the meter's steps unless the call asked for others (16 stays the default of 4/4: 12 in 3/4)
  const sb = o.steps === HG_DEFAULTS.steps ? perBar : o.steps;
  const [c0, c1] = hitgridWindow(cyc, o), steps = sb * o.bars, hits = new Map(), seen = memo || new Map();
  for (const x of notes) {
    if (!(x.b >= c0 - 1e-9 && x.b < c1 - 1e-9)) continue;
    const r = rowOf(x, o);
    if (!r) continue;
    if (!seen.has(r.key)) seen.set(r.key, r);
    const k = Math.floor((x.b - c0) * sb + 1e-6);
    if (!hits.has(r.key)) hits.set(r.key, new Map());
    const m = hits.get(r.key);
    m.set(k, Math.max(m.get(k) || 0, Math.max(0.05, Math.min(1, x.lv ?? 1))));
  }
  let rows = [...seen.values()].sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key));
  if (Array.isArray(o.rows)) { const want = o.rows; rows = want.map(k => rows.find(r => r.key === k || r.label === k) || { key: k, label: k }); }
  const step = Math.max(0, Math.min(steps - 1, Math.floor((cyc - c0) * sb + 1e-9)));
  return { rows: rows.map(r => ({ key: r.key, label: r.label })), hits, step, steps, beats: beatsPerBar * o.bars, perBeat: sb / beatsPerBar, bar: Math.floor(cyc) + 1, stepInBar: (step % sb) + 1, stepsInBar: sb };
}

// ---------- painter ----------
const T = { it: { bar: 'battuta', step: 'passo' }, en: { bar: 'bar', step: 'step' } };
// the form of the cells: 'blocks' (Normal, CRT), 'round' (LED), 'two' (1-bit), 'text' (ASCII, Terminal)
export function cellForm(style, render) {
  if (style === 'text') return 'text';
  if (style === 'blocks') return render === 'led' ? 'round' : (render === 'bit' || render === '1bit') ? 'two' : 'blocks';
  if (render === 'ascii' || render === 'terminal') return 'text';
  return render === 'led' ? 'round' : (render === 'bit' || render === '1bit') ? 'two' : 'blocks';
}
// sizes at a font size fs (the code's): cell width, row height, label width
function metrics(D, o, fs) {
  const cw = fs * 0.62 * o.size, form = o.form;
  // two cells per step in characters when the grid is large
  const per = form === 'text' && o.size >= 1.5 ? 2 : 1;
  const sw = cw * per, rh = fs * 1.02 * o.size, lab = Math.max(3, ...D.rows.map(r => r.label.length)) * fs * 0.62 + fs * 0.5;
  return { cw, sw, rh, lab, w: lab + D.steps * sw + fs * 0.4, h: rh * (Math.max(1, D.rows.length) + 2.3) };
}
export function hitgridSize(D, o, fs) { const m = metrics(D, o, fs); return { w: m.w + fs * 0.6, h: m.h }; }
// P: { band, ink, comment, hit (a1), now (a2), cell (muted), inv, invInk }; o: options with form, lang, font
export function paintHitgrid(g, x, y, D, P, o, fs) {
  const m = metrics(D, o, fs), font = o.font || '"JetBrains Mono", monospace', two = o.form === 'two';
  g.save();
  g.fillStyle = P.band; g.fillRect(x - fs * 0.3, y, m.w + fs * 0.6, m.h);
  g.textBaseline = 'middle';
  g.font = `${Math.round(fs * 0.62 * o.size)}px ${font}`;
  const x0 = x + m.lab, top = y + m.rh * 1.15;
  // the beats numbered on top
  g.fillStyle = P.comment;
  for (let b = 0; b < D.beats; b++) g.fillText(String((b % (D.beats / Math.max(1, D.steps / D.stepsInBar))) + 1), x0 + b * D.perBeat * m.sw, y + m.rh * 0.6);
  D.rows.forEach((r, i) => {
    const yy = top + i * m.rh, hs = D.hits.get(r.key) || new Map();
    g.fillStyle = P.ink; g.fillText(r.label, x, yy + m.rh / 2);
    for (let k = 0; k < D.steps; k++) {
      const xx = x0 + k * m.sw, hit = hs.get(k), cur = k === D.step, past = k < D.step && D.step - k <= o.trail, beat = k % D.perBeat === 0;
      if (o.form === 'text') {
        if (cur) { g.fillStyle = P.inv; g.fillRect(xx, yy + 1, m.sw * 0.96, m.rh - 2); }
        g.fillStyle = cur ? P.invInk : hit ? (k <= D.step ? P.now : P.hit) : P.comment;
        const ch = hit ? (k <= D.step ? '█' : '▒') : '·';
        g.fillText(m.sw > m.cw * 1.5 ? ch + ch : ch, xx + m.cw * 0.1, yy + m.rh / 2);
        continue;
      }
      if (cur) { g.fillStyle = two ? P.ink : P.cur; g.globalAlpha = two ? 0.35 : 1; g.fillRect(xx, yy, m.sw * 0.92, m.rh); g.globalAlpha = 1; }
      if (hit) {
        g.globalAlpha = two ? 1 : cur || past ? 1 : k < D.step ? 0.75 : 0.3;
        g.fillStyle = two ? (k <= D.step ? P.ink : P.comment) : cur || past ? P.now : P.hit;
        if (o.form === 'round') { g.beginPath(); g.arc(xx + m.sw * 0.46, yy + m.rh / 2, Math.min(m.sw, m.rh) * 0.36, 0, Math.PI * 2); g.fill(); }
        else g.fillRect(xx + m.sw * 0.08, yy + m.rh * 0.14, m.sw * 0.76, m.rh * 0.72);
        g.globalAlpha = 1;
      } else { g.fillStyle = P.cell; g.fillRect(xx + m.sw * 0.36, yy + m.rh * 0.44, m.sw * 0.18, m.rh * 0.12); }
      if (beat) { g.fillStyle = P.cell; g.fillRect(xx - 1, yy, 1, m.rh); }
    }
  });
  g.fillStyle = P.comment; g.font = `${Math.round(fs * 0.55 * o.size)}px ${font}`;
  const L = T[o.lang] || T.it;
  g.fillText(`${L.bar} ${D.bar} · ${L.step} ${D.stepInBar}/${D.stepsInBar}`, x, top + Math.max(1, D.rows.length) * m.rh + m.rh * 0.5);
  g.restore();
  return { w: m.w + fs * 0.6, h: m.h };
}
