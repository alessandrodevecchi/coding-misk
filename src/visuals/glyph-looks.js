// Native glyph forms of the widget looks (widget-render-styles D4) and the "Claude" look (D10). Monitor and Rullo in
// the ASCII render (plain characters in the look's colours) and in the Terminal render (take A: a text interface with
// rounded panels, braille scopes, eighth-block spectra, half-block piano rolls); the "Claude" look (take B): the layout
// of an agent command line tool. They draw from the frame object F of the widget looks (src/visuals/widget-looks.js)
// and an info object with the song's information; no clock and no random numbers, so the same frame twice is the same
// picture (tools/check-render-styles.mjs draws them with a recording context).
//
// info: { title, section, sectionNo, sections, next, nextIn (bars), bar, bars, bpm, playing, renderName, say, sayBar
//   (bars since the line began), secBar (bars since the section began), word(key, vars) → a word of the interface }
import { monitorLayout } from './widget-looks.js';
import { layerLayout } from './widget-layer.js';
import { instColour } from './widget-palettes.js';
import { gridOf, termGrid, termColour, brailleDots, brailleWave } from './term-grid.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// the words of the interface when info has none (English)
export const TERM_WORDS = {
  enter: 'enter', next: 'next', inBars: 'in {n} bars', silent: 'silent', tracks: 'tracks', bringIn: 'bring in {list}', drop: 'drop {list}',
  keep: 'keep the groove', playing: 'playing', paused: 'paused', stage: 'stage', code: 'code', scope: 'scope', spectrum: 'spectrum', level: 'lvl',
  waiting: 'waiting for the music', shortcuts: '? for shortcuts', mode: 'auto-play on', modeHint: '(shift+tab to cycle)', rest: 'rest',
};
const wordOf = info => (k, vars = {}) => {
  const s = (info && info.word && info.word(k, vars)) || TERM_WORDS[k] || k;
  return s.replace(/\{(\w+)\}/g, (_, x) => (vars[x] ?? ''));
};
// the rows of the grid for a frame H logical pixels high: 36 rows at 720 (the video frames), fewer on a small stage
export const rowsFor = H => clamp(Math.round(H / 20), 18, 40);
// the room left at the top for the stage's readout and look buttons, as Monitor leaves it (widget-looks.js)
export const topRoom = (W, H) => (H > W * 1.05 ? H * 0.06 : Math.max(H * 0.09, Math.min(H * 0.18, 64)));
// a grid below the top room: rows of the given height at most, at least minRows
function gridBelow(W, H, perRow, minRows, maxRows) {
  const top = topRoom(W, H), G = gridOf(W, H - top, clamp(Math.round((H - top) / perRow), minRows, maxRows));
  G.y0 = top;
  return G;
}
const pad3 = v => String(Math.max(0, Math.floor(v))).padStart(3, '0');
const visible = F => (F.dim === 'hidden' ? F.roster.filter(p => !p.quiet) : F.roster);
// a panel box in pixels → cells of the grid (inside rows r0 … r1)
function cellsOf(b, G, r0, r1) {
  const c = Math.max(0, Math.round((b.x - G.x0) / G.cw)), r = Math.max(r0, Math.round(b.y / G.ch));
  const w = Math.min(G.cols - c, Math.max(6, Math.round(b.w / G.cw))), h = Math.min(r1 - r + 1, Math.max(4, Math.round(b.h / G.ch)));
  return { c, r, w, h };
}
// the spectrum of an instrument now: its last column folded into n log-spaced bands (0..1)
function spectrumNow(F, inst, n) {
  const cols = F.columns(inst) || [];
  let mags = null;
  for (let i = cols.length - 1; i >= 0 && !mags; i--) mags = cols[i];
  const out = new Array(Math.max(0, n)).fill(0);
  if (!mags) return out;
  const m = mags.length;
  for (let b = 0; b < n; b++) {
    const i0 = Math.max(0, Math.floor(Math.pow(m, b / n)) - 1), i1 = Math.max(i0 + 1, Math.floor(Math.pow(m, (b + 1) / n)) - 1);
    let v = -Infinity;
    for (let i = i0; i < i1 && i < m; i++) v = Math.max(v, mags[i]);
    out[b] = clamp((v + 75) / 65, 0, 1);
  }
  return out;
}
const waveOf = (F, inst) => {
  const d = F.wave(inst);
  let peak = 0; if (d) for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  return peak > 1e-4 ? { d, scale: clamp(0.42 / Math.max(peak, 0.02), 0.5, 12) } : { d: null, scale: 1 };
};
// the row (from the top, of n rows) of a pitch among the section's pitches
const rowOfPitch = (pitches, p, n) => { const i = pitches.indexOf(p); return i < 0 ? -1 : n - 1 - Math.min(n - 1, Math.floor(((i + 0.5) * n) / Math.max(1, pitches.length))); };

// ---------- Terminal (take A): the widget of a panel in the cells c, r, w × h ----------
export function termWidget(t, c, r, w, h, p, F, col) {
  const T = t.T, cyc = F.cyc, wd = p.widget;
  if (w < 2 || h < 1) return;
  if (wd === 'scope') { const { d, scale } = waveOf(F, p.inst); t.braille(c, r, w, h, brailleWave(w, h, d, scale), col); return; }
  if (wd === 'spectrum') { t.bars(c, r, w, h, spectrumNow(F, p.inst, w), f => (f < 0.5 ? T.green : f < 0.8 ? T.yellow : T.red)); return; }
  const list = F.notes(p.inst, cyc - 2, cyc + 2);
  if (wd === 'pianoroll' || wd === 'punchcard') {
    const pitches = F.pitches(p.inst), R2 = h * 2;
    for (const n of list) {
      const x0 = Math.round(((n[0] - (cyc - 2)) / 4) * w), x1 = Math.max(x0 + 1, Math.round(((n[1] - (cyc - 2)) / 4) * w));
      const rr = rowOfPitch(pitches, n[2], wd === 'punchcard' ? h : R2), on = n[0] <= cyc && cyc < n[1];
      if (rr < 0) continue;
      if (wd === 'punchcard') { if (x0 >= 0 && x0 < w) t.put(c + x0, r + rr, '●', on || (n[0] <= cyc && cyc - n[0] < 0.1) ? T.fg : col); continue; }
      for (let q = Math.max(0, x0); q < Math.min(w, x1); q++) t.half(c + q, r + (rr >> 1), rr & 1, on ? T.fg : col, on ? 1 : F.full ? 0.75 : clamp(0.35 + 0.45 * n[3], 0.3, 0.85));
    }
    for (let k = 0; k < h; k++) t.put(c + (w >> 1), r + k, '│', T.dim);
    return;
  }
  // spiral and pitchwheel as braille dots on a circle (square dots: 2 per cell across, 4 down, a cell twice as tall)
  const B = brailleDots(w, h), on = brailleDots(w, h), cx = B.DW / 2, cy = B.DH / 2, R = Math.min(B.DW, B.DH) * 0.45;
  if (wd === 'pitchwheel') {
    for (let k = 0; k < 96; k++) { const a = (k / 96) * Math.PI * 2; B.set(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
    for (const n of list) {
      if (!(n[0] <= cyc && cyc < n[1] && typeof n[2] === 'number')) continue;
      const a = ((n[2] % 12) / 12) * Math.PI * 2 - Math.PI / 2, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (dx * dx + dy * dy <= 5) on.set(px + dx, py + dy);
    }
    t.braille(c, r, w, h, B, T.faint); t.braille(c, r, w, h, on, col);
    return;
  }
  const rad = b => R * (0.25 + 0.75 * clamp((b - (cyc - 2)) / 4, 0, 1)), ang = b => b * Math.PI * 2 - Math.PI / 2;
  for (const n of list) {
    const hit = n[0] <= cyc && cyc < n[1], S = hit ? on : B;
    for (let k = 0; k <= 16; k++) { const b = n[0] + ((n[1] - n[0]) * k) / 16; S.set(cx + Math.cos(ang(b)) * rad(b), cy + Math.sin(ang(b)) * rad(b)); }
  }
  t.braille(c, r, w, h, B, col, 0.55); t.braille(c, r, w, h, on, T.fg);
}

// a Terminal panel: rounded box titled with the instrument in its colour and the widget kind dimmed, a level line, the widget
export function termPanel(t, b, p, F, o = {}) {
  const T = t.T, word = o.word || wordOf(null), quiet = p.quiet || F.silent(p.inst), col = quiet ? T.dim : termColour(T, p.inst);
  const lv = quiet ? 0 : clamp(F.level(p.inst), 0, 1), fl = quiet ? 0 : F.flash(p.inst);
  t.bg(b.c, b.r, b.w, b.h, T.bg);
  t.box(b.c, b.r, b.w, b.h, quiet ? T.faint : fl > 0.5 ? T.fg : o.border || col, o.title || F.label(p.inst).toLowerCase(), { titleCol: col, right: o.right ?? p.widget, rightCol: T.dim });
  let top = b.r + 1;
  if (!o.noLevel && b.h >= 6 && b.w >= 18) {
    const mw = Math.max(4, b.w - 17);
    t.put(b.c + 2, top, word('level'), T.dim); t.meter(b.c + 6, top, mw, lv, col);
    t.put(b.c + 7 + mw, top, quiet ? ` ${word('rest')}`.slice(0, 5).padStart(5) : `${String(Math.round(lv * 100)).padStart(4)}%`, quiet ? T.dim : T.fg);
    t.put(b.c + b.w - 3, top, quiet ? '○' : '●', quiet ? T.dim : col);
    top += 2;
  }
  const ih = b.r + b.h - 1 - top;
  if (quiet) { const s = word('silent'); if (ih > 0) t.put(b.c + Math.max(1, Math.floor((b.w - s.length) / 2)), top + Math.floor(ih / 2), s, T.dim); return; }
  if (ih > 0 && b.w > 4) termWidget(t, b.c + 2, top, b.w - 4, ih, p, F, col);
}

// the status bar at the bottom of take A: the program, the song, the tempo, the bar, the section, the tracks, the play state
function termStatus(t, F, info, word, n) {
  const T = t.T, { cols, rows } = t.G, last = rows - 1;
  t.bg(0, last, cols, 1, T.bg2);
  const st = info.playing ? `⏵ ${word('playing')}` : `⏸ ${word('paused')}`, rn = String(info.renderName || '').toLowerCase();
  const right = cols - 2 - [...st].length - (rn ? rn.length + 3 : 0);
  let x = 1;
  const seg = (s, col, o = {}) => { s = String(s); if (x + [...s].length >= right) return; t.put(x, last, s, col, o); x += [...s].length + 1; };
  seg(' misk-top ', T.bg, { bg: T.green, bold: true });
  if (info.title) seg(String(info.title).slice(0, 24), T.fg);
  if (info.bpm) seg(`${info.bpm} bpm`, T.yellow);
  if (Number.isFinite(info.bar)) seg(`bar ${pad3(info.bar)}.${Math.floor((info.bar % 1) * 10)}${info.bars ? `/${pad3(info.bars)}` : ''}`, T.cyan);
  if (info.section) seg(` ${String(info.section).slice(0, 16)}${info.sections ? ` ${info.sectionNo}/${info.sections}` : ''} `, T.bg, { bg: T.magenta, bold: true });
  seg(`${n} ${word('tracks')}`, T.dim);
  if (rn) t.put(cols - 2 - [...st].length - rn.length - 2, last, rn, T.dim);
  t.put(cols - 1 - [...st].length, last, st, info.playing ? T.green : T.dim);
}

// Monitor in the Terminal render (take A): one rounded panel per instrument in Monitor's grid, a header and a status bar
export function drawMonitorTerm(g, W, H, F, T, info = {}) {
  const G = gridOf(W, H, rowsFor(H)), t = termGrid(g, G, T), word = wordOf(info), list = visible(F);
  g.fillStyle = T.bg; g.fillRect(0, 0, W, H);
  if (!list.length) { const s = `MONITOR · ${word('waiting')}`; t.put(Math.max(1, Math.floor((G.cols - s.length) / 2)), Math.floor(G.rows / 2), s, T.dim); }
  else {
    const boxes = monitorLayout(list.length, W, H - G.ch);
    list.forEach((p, i) => termPanel(t, cellsOf(boxes[i], G, 0, G.rows - 2), p, F, { word }));
  }
  termStatus(t, F, info, word, list.filter(p => !p.quiet).length);
}

// Rullo in the Terminal render: one panel with the melodic instruments on a pitch axis (half blocks), the drums as lanes
export function drawRulloTerm(g, W, H, F, T, info = {}) {
  const G = gridOf(W, H, rowsFor(H)), t = termGrid(g, G, T), word = wordOf(info), cyc = F.cyc, x0 = cyc - 2;
  g.fillStyle = T.bg; g.fillRect(0, 0, W, H);
  const lanes = F.lanes, laneRows = lanes.length ? lanes.length + 2 : 0, top = Math.ceil(topRoom(W, H) / G.ch), bottom = G.rows - 2 - laneRows, c0 = 1, w = G.cols - 2;
  // the melodic panel, its legend in the title
  t.box(c0, top, w, bottom - top, T.faint, F.rollName ? String(F.rollName).toLowerCase() : 'rullo', { titleCol: T.fg });
  let lx = c0 + w - 3;
  for (const inst of [...F.melodic].reverse()) { const s = F.label(inst).toLowerCase(); lx -= s.length + 3; if (lx < c0 + 14) break; t.put(lx, top, ` ■ ${s}`, termColour(T, inst)); }
  const iw = w - 4, ih = bottom - top - 2, R2 = ih * 2, { lo, hi } = F.range(), span = Math.max(1, hi - lo + 1);
  const yOf = p => (typeof p === 'number' ? R2 - 1 - Math.floor(((clamp(Math.round(p), lo, hi) - lo + 0.5) * R2) / span) : R2 >> 1);
  for (const inst of F.melodic) {
    const col = termColour(T, inst);
    for (const n of F.notes(inst, x0, x0 + 4)) {
      const a = Math.round(((n[0] - x0) / 4) * iw), b = Math.max(a + 1, Math.round(((n[1] - x0) / 4) * iw)), rr = yOf(n[2]), on = n[0] <= cyc && cyc < n[1];
      for (let q = Math.max(0, a); q < Math.min(iw, b); q++) t.half(c0 + 2 + q, top + 1 + (rr >> 1), rr & 1, col, on ? 1 : F.full ? 0.8 : clamp(0.3 + 0.5 * n[3], 0.3, 0.85) * (n[0] > cyc ? 1 : 0.7));
    }
  }
  for (let k = 0; k < ih; k++) t.put(c0 + 2 + (iw >> 1), top + 1 + k, '│', T.dim);
  // drum lanes
  if (lanes.length) {
    const lr = bottom + 1;
    t.box(c0, bottom, w, laneRows, T.faint, '', {});
    lanes.forEach((inst, i) => {
      const col = termColour(T, inst), r = lr + i, name = F.label(inst).toLowerCase().slice(0, 8);
      t.put(c0 + 2, r, name.padEnd(9), col, { bold: true });
      const lw = iw - 10;
      for (const n of F.notes(inst, x0, x0 + 4)) {
        const q = Math.round(((n[0] - x0) / 4) * lw);
        if (q < 0 || q >= lw) continue;
        const hit = n[0] <= cyc && cyc - n[0] < 0.08;
        t.put(c0 + 12 + q, r, hit ? '●' : '•', hit ? T.fg : col, { alpha: n[0] > cyc ? 0.9 : 0.55 });
      }
      t.put(c0 + 12 + (lw >> 1), r, '│', T.dim, { alpha: 0.6 });
    });
  }
  termStatus(t, F, info, word, F.melodic.length + lanes.length);
}

// ---------- ASCII (D4): plain characters in the look's colours ----------
const RAMP = ' .:-=+*#';
function asciiWidget(t, c, r, w, h, p, F, col) {
  const cyc = F.cyc, wd = p.widget, pal = F.pal;
  if (w < 2 || h < 1) return;
  if (wd === 'scope') {
    const { d, scale } = waveOf(F, p.inst);
    let prev = null;
    for (let j = 0; j < w; j++) {
      const v = d ? d[Math.min(d.length - 1, Math.floor((j / w) * d.length))] * scale : 0, row = clamp(Math.round((0.5 - v) * (h - 1)), 0, h - 1);
      const gl = prev === null || prev === row ? '-' : prev > row ? '/' : '\\';
      if (prev !== null && Math.abs(prev - row) > 1) for (let k = Math.min(prev, row) + 1; k < Math.max(prev, row); k++) t.put(c + j, r + k, '|', col);
      t.put(c + j, r + row, gl, col); prev = row;
    }
    return;
  }
  if (wd === 'spectrum') {
    const cols = F.columns(p.inst) || [], n = cols.length;
    for (let x = 0; x < w; x++) {
      const mags = cols[Math.min(n - 1, Math.floor((x / w) * n))];
      if (!mags) continue;
      const m = mags.length;
      for (let b = 0; b < h; b++) {
        const i0 = Math.max(0, Math.floor(Math.pow(m, b / h)) - 1), i1 = Math.max(i0 + 1, Math.floor(Math.pow(m, (b + 1) / h)) - 1);
        let v = -Infinity; for (let i = i0; i < i1 && i < m; i++) v = Math.max(v, mags[i]);
        const k = Math.floor(clamp((v + 80) / 80, 0, 0.999) * RAMP.length);
        if (k > 0) t.put(c + x, r + h - 1 - b, RAMP[k], col);
      }
    }
    return;
  }
  const list = F.notes(p.inst, cyc - 2, cyc + 2);
  if (wd === 'pianoroll' || wd === 'punchcard') {
    const pitches = F.pitches(p.inst);
    for (const n of list) {
      const x0 = Math.round(((n[0] - (cyc - 2)) / 4) * w), x1 = Math.max(x0 + 1, Math.round(((n[1] - (cyc - 2)) / 4) * w)), rr = rowOfPitch(pitches, n[2], h), on = n[0] <= cyc && cyc < n[1];
      if (rr < 0) continue;
      const a = on ? 1 : F.full ? 0.8 : clamp(0.45 + 0.4 * n[3], 0.4, 0.9);
      if (wd === 'punchcard') { if (x0 >= 0 && x0 < w) t.put(c + x0, r + rr, 'o', on ? pal.ink : col, { alpha: a }); continue; }
      const q0 = Math.max(0, x0), q1 = Math.min(w, x1);
      if (q1 > q0) t.put(c + q0, r + rr, (on ? '█' : '▒').repeat(q1 - q0), col, { alpha: a });
    }
    for (let k = 0; k < h; k++) t.put(c + (w >> 1), r + k, '¦', pal.ink, { alpha: 0.5 });
    return;
  }
  // spiral and pitchwheel: notes on a circle of glyphs
  const cx = c + w / 2, cy = r + h / 2, Rx = w * 0.45, Ry = h * 0.45;
  if (wd === 'pitchwheel') {
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; t.put(Math.round(cx + Math.cos(a) * Rx), Math.round(cy + Math.sin(a) * Ry), '.', pal.muted); }
    for (const n of list) {
      if (!(n[0] <= cyc && cyc < n[1] && typeof n[2] === 'number')) continue;
      const a = ((n[2] % 12) / 12) * Math.PI * 2 - Math.PI / 2;
      t.put(Math.round(cx + Math.cos(a) * Rx), Math.round(cy + Math.sin(a) * Ry), 'O', col);
    }
    return;
  }
  const rad = b => 0.25 + 0.75 * clamp((b - (cyc - 2)) / 4, 0, 1), ang = b => b * Math.PI * 2 - Math.PI / 2;
  for (const n of list) {
    const on = n[0] <= cyc && cyc < n[1];
    for (let k = 0; k <= 6; k++) { const b = n[0] + ((n[1] - n[0]) * k) / 6; t.put(Math.round(cx + Math.cos(ang(b)) * Rx * rad(b)), Math.round(cy + Math.sin(ang(b)) * Ry * rad(b)), on ? '@' : 'o', col, { alpha: on ? 1 : 0.6 }); }
  }
}
function asciiPanel(t, b, p, F) {
  const pal = F.pal, quiet = p.quiet || F.silent(p.inst), col = quiet ? pal.dim : instColour(pal, p.inst), a = quiet ? 0.5 : 1;
  const lv = quiet ? 0 : clamp(F.level(p.inst), 0, 1);
  t.box(b.c, b.r, b.w, b.h, col, `${F.label(p.inst).toUpperCase()} ${p.widget}`, { ascii: true, dash: quiet, ground: pal.bg, titleCol: col });
  if (b.w >= 16) t.put(b.c + b.w - 12, b.r + 1, `[${'#'.repeat(Math.round(lv * 8)).padEnd(8, '.')}]`, col, { alpha: a });
  if (quiet) return;
  if (b.h > 4 && b.w > 4) asciiWidget(t, b.c + 2, b.r + 2, b.w - 4, b.h - 3, p, F, col);
}
// Monitor in the ASCII render
export function drawMonitorAscii(g, W, H, F, info = {}) {
  const pal = F.pal, G = gridOf(W, H, rowsFor(H)), t = termGrid(g, G, pal), word = wordOf(info), list = visible(F);
  g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
  if (!list.length) { const s = `MONITOR - ${word('waiting')}`; t.put(Math.max(1, Math.floor((G.cols - s.length) / 2)), Math.floor(G.rows / 2), s, pal.muted); return; }
  const boxes = monitorLayout(list.length, W, H);
  list.forEach((p, i) => asciiPanel(t, cellsOf(boxes[i], G, 0, G.rows - 1), p, F));
}
// Rullo in the ASCII render
export function drawRulloAscii(g, W, H, F, info = {}) {
  const pal = F.pal, G = gridOf(W, H, rowsFor(H)), t = termGrid(g, G, pal), cyc = F.cyc, x0 = cyc - 2;
  void info;
  g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
  const lanes = F.lanes, top = Math.max(2, Math.round(G.rows * 0.12)), bottom = G.rows - 1 - lanes.length - (lanes.length ? 1 : 0), iw = G.cols - 2;
  const { lo, hi } = F.range(), rows = Math.max(1, bottom - top), span = Math.max(1, hi - lo + 1);
  const yOf = p => (typeof p === 'number' ? top + rows - 1 - Math.floor(((clamp(Math.round(p), lo, hi) - lo + 0.5) * rows) / span) : top + (rows >> 1));
  for (let r = top; r < bottom; r += 2) t.put(1, r, '.'.repeat(iw), pal.grid);
  let lx = G.cols - 1;
  for (const inst of [...F.melodic].reverse()) { const s = `# ${F.label(inst).toUpperCase()}`; lx -= s.length + 2; if (lx < 1) break; t.put(lx, top - 1, s, instColour(pal, inst)); }
  for (const inst of F.melodic) {
    const col = instColour(pal, inst);
    for (const n of F.notes(inst, x0, x0 + 4)) {
      const a = Math.round(((n[0] - x0) / 4) * iw), b = Math.max(a + 1, Math.round(((n[1] - x0) / 4) * iw)), on = n[0] <= cyc && cyc < n[1], q0 = Math.max(0, a), q1 = Math.min(iw, b);
      if (q1 > q0) t.put(1 + q0, yOf(n[2]), (on ? '█' : '▒').repeat(q1 - q0), col, { alpha: on ? 1 : F.full ? 0.8 : clamp(0.4 + 0.5 * n[3], 0.4, 0.9) });
    }
  }
  lanes.forEach((inst, i) => {
    const col = instColour(pal, inst), r = bottom + 1 + i;
    t.put(1, r, F.label(inst).toUpperCase().slice(0, 7).padEnd(8), col);
    for (const n of F.notes(inst, x0, x0 + 4)) { const q = Math.round(((n[0] - x0) / 4) * (iw - 9)); if (q >= 0 && q < iw - 9) t.put(10 + q, r, n[0] <= cyc && cyc - n[0] < 0.08 ? 'O' : 'o', col, { alpha: n[0] > cyc ? 0.9 : 0.5 }); }
  });
  for (let r = top - 1; r < G.rows; r++) t.put(1 + (iw >> 1), r, '¦', pal.ink, { alpha: 0.6 });
}

// ---------- the "Claude" look (D10, take B) ----------
// what enters in this section and what left it: the instruments playing now against the section before
export function sectionChange(F) {
  const now = F.roster.filter(p => !p.quiet).map(p => p.inst), before = (F.prev || []).filter(p => !p.quiet).map(p => p.inst);
  return { enter: now.filter(i => !before.includes(i)), left: before.filter(i => !now.includes(i)) };
}
// the typed line of the prompt and how much of it shows: the narrator's line typed over its first bar, else a line made
// from the section change typed over the section's first bar
export function promptLine(F, info, word = wordOf(info)) {
  const names = list => list.map(i => F.label(i).toLowerCase()).join(', ');
  let text, since;
  if (info.say && Number.isFinite(info.sayBar) && info.sayBar >= 0) { text = String(info.say); since = info.sayBar; }
  else {
    const ch = sectionChange(F);
    text = ch.enter.length ? word('bringIn', { list: names(ch.enter) }) : ch.left.length ? word('drop', { list: names(ch.left) }) : word('keep');
    since = Number.isFinite(info.secBar) ? info.secBar : 1;
  }
  const shown = Math.floor(clamp(since, 0, 1) * [...text].length);
  return { text, shown };
}
export function drawClaude(g, W, H, F, T, info = {}) {
  const G = gridBelow(W, H, 18, 22, 36), t = termGrid(g, G, T), word = wordOf(info), { cols, rows } = G;
  g.fillStyle = T.bg; g.fillRect(0, 0, W, H);
  const wide = cols >= 90;
  // header card: the mark, the song, the section and the tempo
  const hw = wide ? Math.min(62, Math.round(cols * 0.48)) : cols - 2;
  t.box(1, 0, hw, 4, T.orange);
  t.put(3, 1, '✻', T.orange, { bold: true });
  t.put(5, 1, String(info.title || 'Claude').slice(0, hw - 7), T.fg, { bold: true });
  const sub = [info.section, info.bpm ? `${info.bpm} bpm` : '', Number.isFinite(info.bar) ? `bar ${info.bar.toFixed(1)}${info.bars ? `/${info.bars}` : ''}` : ''].filter(Boolean).join(' · ');
  t.put(5, 2, sub.slice(0, hw - 7), T.dim);
  // what enters and what comes next
  const ch = sectionChange(F), names = ch.enter.map(i => F.label(i).toLowerCase()).join(', ');
  const ex = wide ? hw + 3 : 2, ey = wide ? 1 : 4, room = cols - ex - 4;
  t.put(ex, ey, '⎿', T.dim); t.put(ex + 2, ey, `${word('enter')}: ${names || '—'}`.slice(0, room), names ? T.fg : T.dim);
  t.put(ex, ey + 1, '⎿', T.dim);
  t.put(ex + 2, ey + 1, (info.next ? `${word('next')}: ${String(info.next).toLowerCase()} ${word('inBars', { n: Math.max(0, Math.ceil(info.nextIn || 0)) })}` : `${word('next')}: —`).slice(0, room), T.dim);
  // panes
  const top = wide ? 5 : 7, bottom = rows - 8, list = visible(F);
  if (!list.length) t.put(Math.max(2, Math.floor((cols - word('waiting').length) / 2)), Math.floor((top + bottom) / 2), word('waiting'), T.dim);
  else {
    // the large pane: the first melodic instrument with a note widget, else any note widget, else the first panel
    const DRUM = ['kick', 'snare', 'hats', 'perc', 'beat', 'drums'], note = p => !p.quiet && (p.widget === 'pianoroll' || p.widget === 'spiral');
    const bigI = Math.max(0, list.findIndex(p => note(p) && !DRUM.includes(p.inst)), list.findIndex(note)), big = list[bigI], rest = list.filter((_, i) => i !== bigI);
    const pane = (b, p, right) => termPanel(t, b, p, F, { word, title: `${F.label(p.inst).toLowerCase()} · ${p.widget}`, right, noLevel: true, border: T.faint });
    const barNow = Number.isFinite(info.bar) ? `bar ${info.bar.toFixed(1)}` : '';
    if (wide) {
      const lw = Math.round(cols * 0.55), mainH = bottom - top, second = rest.length && mainH >= 9 ? rest[0] : null, others = rest.slice(second ? 1 : 0, 1 + Math.floor(mainH / 3));
      const bh = second ? Math.max(5, Math.round(mainH * 0.64)) : mainH;
      pane({ c: 1, r: top, w: lw, h: bh }, big, barNow);
      if (second) pane({ c: 1, r: top + bh, w: lw, h: mainH - bh }, second, '');
      if (others.length) {
        const n = others.length, sh = Math.floor(mainH / n);
        others.forEach((p, i) => pane({ c: lw + 2, r: top + i * sh, w: cols - lw - 3, h: i === n - 1 ? mainH - i * sh : sh }, p, ''));
      }
    } else {
      const mainH = bottom - top, others = rest.slice(0, 2 * Math.floor((mainH - 5) / 4)), n = others.length, bh = n ? Math.max(5, Math.round(mainH * 0.45)) : mainH;
      pane({ c: 1, r: top, w: cols - 2, h: bh }, big, barNow);
      const rowsN = Math.ceil(n / 2), rh = rowsN ? Math.floor((mainH - bh) / rowsN) : 0, half = Math.floor((cols - 3) / 2);
      others.forEach((p, i) => { const rr = Math.floor(i / 2), last = i === n - 1 && n % 2 === 1; pane({ c: 1 + (i % 2) * (half + 1), r: top + bh + rr * rh, w: last ? cols - 2 : half, h: rh }, p, ''); });
    }
  }
  // the prompt box with the typed line and a cursor
  const pr = rows - 7, { text, shown } = promptLine(F, info, word), chars = [...text].slice(0, Math.max(0, cols - 9));
  t.box(1, pr, cols - 2, 3, T.dim, '', { square: false });
  t.put(3, pr + 1, '>', T.fg, { bold: true });
  const typed = chars.slice(0, shown).join('');
  t.put(5, pr + 1, typed, T.fg);
  if ((F.cyc * 2) % 1 < 0.6) t.bg(5 + [...typed].length, pr + 1, 1, 1, T.fg);
  // status line and mode line
  const sr = rows - 4;
  t.put(3, sr, word('shortcuts'), T.dim);
  const status = [
    [`● ${list.filter(p => !p.quiet).length} ${word('tracks')}`, T.green],
    [info.section ? `◆ ${String(info.section).slice(0, 14)}${info.sections ? ` ${info.sectionNo}/${info.sections}` : ''}` : '', T.magenta],
    [Number.isFinite(info.bar) ? `⏵ ${pad3(info.bar)}.${Math.floor((info.bar % 1) * 10)}` : '', T.cyan],
    [`render: ${String(info.renderName || 'terminal').toLowerCase()}`, T.dim],
  ].filter(s => s[0]);
  let sx = cols - 2 - status.reduce((a, [s]) => a + [...s].length + 3, 0) + 3;
  if (sx > word('shortcuts').length + 5) for (const [s, col] of status) { t.put(sx, sr, s, col); sx += [...s].length + 3; }
  t.put(1, rows - 2, '⏵⏵', T.orange); t.put(4, rows - 2, info.playing ? word('mode') : word('paused'), T.orange);
  if (cols > 50) t.put(5 + (info.playing ? word('mode') : word('paused')).length, rows - 2, word('modeHint'), T.dim);
}

// ---------- the layer over a scene in ASCII and Terminal (D2, D4) ----------
// The panels of the strip or the Palco screen (layerLayout of widget-layer.js) in glyph forms, on the grid of the frame,
// drawn after the pass so their text and lines stay sharp. → the panels drawn (for the checks)
export function drawLayerGlyph(g, W, H, F, kind, render, T, info = {}) {
  const list = F.dim === 'hidden' ? F.roster.filter(p => !p.quiet) : F.roster;
  if (!list.length) return [];
  const boxes = layerLayout(kind, list.length, W, H), word = wordOf(info);
  const G = render === 'terminal' ? gridOf(W, H, passRows(H)) : gridOf(W, H, rowsFor(H));
  const t = termGrid(g, G, render === 'terminal' ? T : F.pal);
  const shown = list.slice(0, boxes.length);
  shown.forEach((p, i) => {
    const b = cellsOf(boxes[i], G, 0, G.rows - 1);
    if (render === 'terminal') termPanel(t, b, p, F, { word });
    else { t.bg(b.c, b.r, b.w, b.h, F.pal.bg); asciiPanel(t, b, p, F); }
  });
  return shown;
}
// the rows of the Terminal pass over a scene (45 at any height, render-styles.js), so the panels sit on its cells
const passRows = () => 45;
