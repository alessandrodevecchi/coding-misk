// The tone cloud (code-over-visual, custom-code-widgets D10): an app code widget, `._tonecloud()`, 12 rows (one per
// pitch class) over a time window with the present at the right edge, a dense cloud of characters from a ramp by each
// class's energy, the current chord's notes inverted and its name below. Drawn from notes (the haps of the code), never
// from audio. Pure: data and painter checked in Node (tools/check-code-over.mjs).
//
// A note: { inst, b, e (cycles), p (a MIDI number, or a sound's name), lv (gain × velocity) }. One cycle is one bar.

export const TC_DEFAULTS = Object.freeze({ from: 'melodic', cols: 48, bars: 3, ramp: ' .:-=+*#%@', order: 'high', norm: 'column', decay: 0.6, spread: 0.5, labels: true, chord: true, names: 'auto', size: 1.25 });
export const TC_LIMITS = { cols: [12, 96], bars: [1, 8], decay: [0, 4], spread: [0, 1], size: [0.6, 2.5] };
// instruments whose notes never feed the cloud (drums, effects, the spoken voice)
const NOT_MELODIC = new Set(['kick', 'snare', 'hats', 'clap', 'perc', 'toms', 'ride', 'crash', 'beat', 'drums', 'break', 'rim', 'fx', 'riser', 'noise', 'voice', 'narrator']);
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// the chord shapes, largest first
const CHORDS = [['maj7', [0, 4, 7, 11]], ['m7', [0, 3, 7, 10]], ['7', [0, 4, 7, 10]], ['m7b5', [0, 3, 6, 10]], ['', [0, 4, 7]], ['m', [0, 3, 7]], ['dim', [0, 3, 6]], ['sus4', [0, 5, 7]], ['sus2', [0, 2, 7]], ['5', [0, 7]]];
// how much of a note's energy reaches other pitch classes (cv9: a cloud, not lines): the neighbours, and the overtones of
// a real tone (the fifth, the 3rd harmonic; the major third, the 5th harmonic), times the spread setting
const SPREAD = [[7, 0.6], [4, 0.45], [1, 0.4], [11, 0.4], [5, 0.25], [2, 0.2], [10, 0.2], [3, 0.12], [9, 0.12]];

const num = (v, [lo, hi], d) => { const x = Number(v); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
export function tonecloudOptions(call = {}, base = TC_DEFAULTS) {
  const o = { ...TC_DEFAULTS, ...(base || {}) }, c = call && typeof call === 'object' ? call : {};
  for (const k of Object.keys(TC_DEFAULTS)) if (c[k] !== undefined) o[k] = c[k];
  for (const k of Object.keys(TC_LIMITS)) o[k] = num(o[k], TC_LIMITS[k], TC_DEFAULTS[k]);
  o.cols = Math.round(o.cols); o.bars = Math.round(o.bars);
  o.ramp = typeof o.ramp === 'string' && [...o.ramp].length >= 2 ? o.ramp : TC_DEFAULTS.ramp;
  o.order = o.order === 'low' ? 'low' : 'high';
  o.norm = o.norm === 'window' ? 'window' : 'column';
  o.names = ['sharp', 'flat'].includes(o.names) ? o.names : 'auto';
  o.labels = o.labels !== false; o.chord = o.chord !== false;
  o.from = Array.isArray(o.from) ? o.from.filter(x => typeof x === 'string') : typeof o.from === 'string' && o.from !== 'melodic' ? [o.from] : 'melodic';
  return o;
}
// the window of notes the cloud needs at cycle cyc (the tails of earlier notes included)
export const tonecloudWindow = (cyc, o) => [cyc - o.bars - o.decay * 4 - 1, cyc + 0.001];

const pcOf = p => (typeof p === 'number' && Number.isFinite(p) ? ((Math.round(p) % 12) + 12) % 12 : null);
// a small deterministic grain (the same for the same slice of the song, real time and fast video alike)
const grain = (pc, slice) => { let h = Math.imul((slice * 12 + pc) | 0, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; return 0.55 + 0.45 * ((h >>> 0) / 4294967296); };
// names by the song's key: flats for flat keys (F, Bb, Eb, … and their minors), sharps otherwise
export function useFlats(names, key = '') {
  if (names === 'flat') return true;
  if (names === 'sharp') return false;
  const k = String(key || '').trim(), m = /^([A-G])(b|#|s)?\s*(m|min|minor)?\b/i.exec(k);
  if (!m) return false;
  const root = m[1].toUpperCase() + (m[2] === 'b' ? 'b' : m[2] ? '#' : ''), minor = !!m[3] && !/^maj/i.test(k.slice(m[1].length + (m[2] ? 1 : 0)).trim());
  return minor ? ['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'].includes(root) : ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(root);
}

// → { E: 12 × cols energies (0..1, after normalisation), chord: { name, set } | null, names: 12 labels }
export function tonecloudData(notes, cyc, o, { key = '' } = {}) {
  const span = o.bars, dt = span / o.cols, t0 = cyc - span, E = Array.from({ length: 12 }, () => new Float64Array(o.cols)), sounding = new Map();
  const melodic = x => (o.from === 'melodic' ? !NOT_MELODIC.has(x.inst) : o.from.includes(x.inst));
  const slice0 = Math.round(t0 / dt);
  const add = (pc, c, v) => { if (v > E[pc][c]) E[pc][c] = v; };
  for (const x of notes) {
    if (!melodic(x)) continue;
    const pc = pcOf(x.p);
    if (pc === null || !(x.e > x.b)) continue;
    const L = Math.max(0.05, Math.min(1, x.lv ?? 1));
    for (let c = 0; c < o.cols; c++) {
      const a = t0 + c * dt, z = a + dt;
      const on = Math.max(0, Math.min(z, x.e) - Math.max(a, x.b)) / dt;
      const tail = a >= x.e && o.decay > 0 ? Math.exp(-(a - x.e) / o.decay) : 0;
      const v = L * Math.max(on, tail * 0.85);
      if (v <= 0.002) continue;
      add(pc, c, v);
      if (o.spread > 0) for (const [iv, k] of SPREAD) add((pc + iv) % 12, c, v * k * o.spread * grain((pc + iv) % 12, slice0 + c));
    }
    // the notes sounding in the last quarter of a cycle make the chord (the lowest note preferred as its root)
    if (x.b <= cyc && x.e > cyc - 0.25) { const p = Math.round(x.p); if (!sounding.has(pc) || sounding.get(pc) > p) sounding.set(pc, p); }
  }
  // normalisation: each column between its weakest and strongest class (chord tones stand out, trails stay alive), or
  // one scale for the window; a gamma under 1 uses more of the ramp (cv9)
  let max = 0; for (const r of E) for (const v of r) if (v > max) max = v;
  for (let c = 0; c < o.cols; c++) {
    let lo = Infinity, hi = 0;
    for (let p = 0; p < 12; p++) { lo = Math.min(lo, E[p][c]); hi = Math.max(hi, E[p][c]); }
    for (let p = 0; p < 12; p++) {
      const v = E[p][c];
      if (o.norm === 'column') E[p][c] = hi < 0.02 ? 0 : Math.pow(Math.max(0, (v - lo) / Math.max(1e-6, hi - lo)), 0.7) * Math.min(1, hi / Math.max(1e-6, max) * 1.6);
      else E[p][c] = max < 0.02 ? 0 : Math.pow(v / max, 0.7);
    }
  }
  const flats = useFlats(o.names, key), names = flats ? FLAT : SHARP;
  let chord = null;
  const pcs = [...sounding.keys()], low = pcs.length ? pcs.reduce((a, b) => (sounding.get(b) < sounding.get(a) ? b : a)) : -1;
  for (const [name, iv] of CHORDS) for (const r of pcs) {
    if (!iv.every(i => pcs.includes((r + i) % 12))) continue;
    const score = iv.length * 10 + (r === low ? 1 : 0);
    if (!chord || score > chord.score) chord = { name: names[r] + name, score, set: iv.map(i => (r + i) % 12) };
  }
  return { E, chord: chord ? { name: chord.name, set: chord.set } : null, names, cols: o.cols };
}
// the character of an energy on the ramp: a space below 0.04, else at least the second character
export function rampChar(ramp, e) {
  const r = [...ramp];
  if (!(e >= 0.04)) return ' ';
  return r[Math.min(r.length - 1, Math.max(1, Math.round(e * (r.length - 1))))];
}
// the text of one row
export const rowText = (D, pc, ramp) => Array.from(D.E[pc], e => rampChar(ramp, e)).join('');

// ---------- painter ----------
const T = { it: { chord: 'accordo' }, en: { chord: 'chord' } };
// (the characters at 0.7 of the code's size, so a cell is as wide as its glyph; rows a little taller than the code's)
function metrics(D, o, fs) {
  const px = fs * 0.7 * o.size, cw = px * 0.6, rh = px * 1.12, lab = o.labels ? cw * 3.6 : 0;
  return { px, cw, rh, lab, w: lab + D.cols * cw, h: rh * (12.4 + (o.chord ? 1.3 : 0)) };
}
export function tonecloudSize(D, o, fs) { const m = metrics(D, o, fs); return { w: m.w + fs * 0.6, h: m.h }; }
// P: { band, ink, comment, hit, now, cell, inv, invInk }; o: options with form ('blocks' | 'round' | 'two' | 'text'),
// lang, font
export function paintTonecloud(g, x, y, D, P, o, fs) {
  const m = metrics(D, o, fs), font = o.font || '"JetBrains Mono", monospace', ramp = o.ramp;
  const order = o.order === 'high' ? [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  g.save();
  g.fillStyle = P.band; g.fillRect(x - fs * 0.3, y, m.w + fs * 0.6, m.h);
  g.font = `${Math.round(m.px * 10) / 10}px ${font}`; g.textBaseline = 'middle';
  // the cells of a row on the grid of the glyphs (another font's width scaled to it)
  const gw = g.measureText('M').width || m.cw, sx = m.cw / gw;
  order.forEach((pc, i) => {
    const yy = y + m.rh * 0.2 + i * m.rh, inChord = o.chord && D.chord && D.chord.set.includes(pc);
    if (o.labels) {
      if (inChord) { g.fillStyle = P.inv; g.fillRect(x - 2, yy + 1, m.cw * 2.4, m.rh - 2); g.fillStyle = P.invInk; } else g.fillStyle = P.comment;
      g.fillText(D.names[pc], x, yy + m.rh / 2);
    }
    const x0 = x + m.lab;
    if (o.form === 'round' || o.form === 'two') {
      // LED: round cells sized by the energy; 1-bit: the cells above half lit in the ink, nothing else
      for (let c = 0; c < D.cols; c++) {
        const e = D.E[pc][c]; if (e < 0.04) continue;
        if (o.form === 'two') { if (e < 0.35) continue; g.fillStyle = P.ink; g.fillRect(x0 + c * m.cw + m.cw * 0.12, yy + m.rh * 0.2, m.cw * 0.76, m.rh * 0.6); continue; }
        g.fillStyle = inChord ? P.now : P.ink; g.globalAlpha = 0.35 + 0.65 * e;
        g.beginPath(); g.arc(x0 + c * m.cw + m.cw / 2, yy + m.rh / 2, Math.max(0.6, Math.min(m.cw, m.rh) * 0.46 * Math.sqrt(e)), 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
      return;
    }
    g.fillStyle = inChord ? P.now : P.ink;
    if (Math.abs(sx - 1) < 0.02) g.fillText(rowText(D, pc, ramp), x0, yy + m.rh / 2);
    else { g.save(); g.translate(x0, yy + m.rh / 2); g.scale(sx, 1); g.fillText(rowText(D, pc, ramp), 0, 0); g.restore(); }
  });
  if (o.chord) {
    g.fillStyle = P.comment; g.font = `${Math.round(m.px * 0.85)}px ${font}`;
    g.fillText(`${(T[o.lang] || T.it).chord} ${D.chord ? D.chord.name : '—'}`, x, y + m.rh * 12.95);
  }
  g.restore();
  return { w: m.w + fs * 0.6, h: m.h };
}
