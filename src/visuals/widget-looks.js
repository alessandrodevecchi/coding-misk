// The two full-screen widget looks (widgets-on-stage D3): Monitor (a wall of panels, one per playing instrument, each
// with its code widget) and Rullo (one piano roll of the melodic instruments, drums as lanes). They draw into the
// context they are given, at W×H logical pixels, from a frame object built by src/visuals.js (the stage feed of this
// change); colours come from the frame's palette. No clock and no random numbers: the same frame twice is the same
// picture. Pure: the layout and the drawing are checked in Node with a recording context (tools/check-stage-widgets.mjs).
//
// frame F: { cyc, pal, roster: [{ inst, widget, quiet }], fade (0..1, the grid of a new section coming in),
//   notes(inst, c0, c1), level(inst), flash(inst), silent(inst), wave(inst) → samples or null, columns(inst) → spectrum
//   columns, pitches(inst) → the pitches of the section (low first), range() → { lo, hi } of the melodic notes,
//   label(inst), dim ('dimmed' | 'hidden'), full (notes at full opacity), lanes: the drum instruments of Rullo,
//   melodic: the melodic instruments of Rullo }
import * as paint from './widget-painters.js';
import { instColour } from './widget-palettes.js';

const FONT = '"JetBrains Mono", monospace';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const tallOf = (W, H) => H > W * 1.05;

// D3 and the owner's note on ws4: the boxes of n panels (1 to 6) in a W×H stage. The grid that gives the panels the
// most area wins, among every column count, with each panel kept between a lowest and a highest width / height ratio
// (wide row widgets read best at 1.2 to 3; a tall stage allows 0.75). Three panels or fewer get bigger panels, not
// empty cells; the last row is centred; the whole grid is centred in the stage.
export function monitorLayout(n, W, H, { top = null } = {}) {
  if (n <= 0) return [];
  const tall = tallOf(W, H), gap = Math.max(6, Math.min(W, H) * 0.022), mx = Math.max(8, W * 0.03);
  // on a wide stage the top leaves room for the readout and the look buttons (about 60 px in the app)
  const t = top ?? (tall ? H * 0.06 : Math.max(H * 0.09, Math.min(H * 0.18, 64))), b = Math.max(8, H * 0.04);
  const aw = W - 2 * mx, ah = H - t - b, minA = tall ? 0.75 : 1.15, maxA = n === 1 ? 2.4 : 3;
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    // a column count that leaves a whole row empty is never better
    if (cols > 1 && Math.ceil(n / (cols - 1)) === rows) continue;
    let w = (aw - gap * (cols - 1)) / cols, h = (ah - gap * (rows - 1)) / rows;
    if (w <= 0 || h <= 0) continue;
    if (w / h > maxA) w = h * maxA;
    if (w / h < minA) h = w / minA;
    // one panel alone: not the whole stage
    if (n === 1) { w = Math.min(w, aw * 0.82); h = Math.min(h, ah * 0.8); }
    const score = w * h * (cols * rows === n ? 1.04 : 1);
    if (!best || score > best.score + 1e-6) best = { cols, rows, w, h, score };
  }
  const { cols, rows, w, h } = best, gh = rows * h + (rows - 1) * gap, y0 = t + (ah - gh) / 2, out = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols), rw = inRow * w + (inRow - 1) * gap, x0 = mx + (aw - rw) / 2;
    for (let c = 0; c < inRow; c++) out.push({ x: x0 + c * (w + gap), y: y0 + r * (h + gap), w, h });
  }
  return out;
}

function background(g, W, H, pal) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, pal.bg); bg.addColorStop(1, pal.bg2);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
}

// one panel: name and widget kind, level bar, the widget; glow with the level, a flash on onsets, dimmed when silent
export function drawPanel(g, box, p, F) {
  const pal = F.pal, quiet = p.quiet || F.silent(p.inst), col = quiet ? pal.dim : instColour(pal, p.inst);
  const lv = quiet ? 0 : clamp(F.level(p.inst), 0, 1), fl = quiet ? 0 : F.flash(p.inst);
  const fs = clamp(Math.round(Math.min(box.h * 0.085, box.w * 0.05)), 9, 17), pad = Math.max(6, fs * 0.8);
  g.save();
  g.globalAlpha = (quiet ? 0.55 : 1) * F.fade;
  g.fillStyle = pal.panel; g.fillRect(box.x, box.y, box.w, box.h);
  if (fl > 0.02) { g.globalAlpha = fl * 0.08 * F.fade; g.fillStyle = col; g.fillRect(box.x, box.y, box.w, box.h); g.globalAlpha = (quiet ? 0.55 : 1) * F.fade; }
  g.strokeStyle = col; g.lineWidth = 1.5 + fl * 1.5;
  if (quiet) g.setLineDash([6, 5]);
  else if (pal.glow) { g.shadowColor = col; g.shadowBlur = (4 + lv * 18) * pal.glow; }
  g.strokeRect(box.x + 0.75, box.y + 0.75, box.w - 1.5, box.h - 1.5);
  g.setLineDash([]); g.shadowBlur = 0;
  // header
  g.font = `600 ${fs}px ${FONT}`; g.textBaseline = 'top'; g.textAlign = 'left';
  g.fillStyle = col; g.fillText(F.label(p.inst).toUpperCase(), box.x + pad, box.y + pad * 0.8);
  const nameW = g.measureText(`${F.label(p.inst).toUpperCase()} `).width;
  g.fillStyle = quiet ? pal.dim : pal.label; g.fillText(`· ${p.widget}`, box.x + pad + nameW, box.y + pad * 0.8);
  // level bar, top right
  // (never over the header's text: a narrow panel of the layer gets a shorter bar)
  const textW = nameW + g.measureText(`· ${p.widget}`).width;
  const bw = Math.max(0, Math.min(box.w * 0.16, 64, box.w - 2 * pad - textW - fs * 0.6)), bh = Math.max(3, fs * 0.32), bx = box.x + box.w - pad - bw, by = box.y + pad * 0.8 + fs * 0.35;
  g.fillStyle = pal.edge; g.fillRect(bx, by, bw, bh);
  g.fillStyle = col; g.fillRect(bx, by, bw * lv, bh);
  // the widget
  const inner = { x: box.x + pad, y: box.y + pad * 1.6 + fs, w: box.w - 2 * pad, h: box.h - pad * 2.4 - fs };
  if (inner.w > 4 && inner.h > 4) {
    g.save(); g.beginPath(); g.rect(inner.x, inner.y, inner.w, inner.h); g.clip();
    drawWidget(g, inner, p, F, col);
    g.restore();
  }
  g.restore();
}

// the widget of a panel inside its box
export function drawWidget(g, box, p, F, col) {
  const pal = F.pal, cyc = F.cyc, w = p.widget;
  if (w === 'scope') {
    const d = F.wave(p.inst);
    let peak = 0; if (d) for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (pal.glow) { g.shadowColor = col; g.shadowBlur = 8 * pal.glow; }
    paint.scope(g, box, d && peak > 1e-4 ? d : null, { color: col, px: 1, scale: clamp(0.42 / Math.max(peak, 0.02), 0.5, 12) });
    g.shadowBlur = 0;
    return;
  }
  if (w === 'spectrum') { paint.spectrogram(g, box, F.columns(p.inst), { color: col, bands: 24 }); return; }
  const list = F.notes(p.inst, cyc - 2.5, cyc + 2.5);
  if (w === 'pianoroll' || w === 'punchcard') {
    // a faint pitch grid behind the notes
    const pitches = F.pitches(p.inst), rows = Math.max(1, pitches.length);
    if (rows > 1 && rows <= 24) { g.fillStyle = pal.grid; for (let r = 1; r < rows; r++) g.fillRect(box.x, box.y + (box.h * r) / rows, box.w, 1); }
    paint.roll(g, box, list, cyc, { span: 4, punch: w === 'punchcard', full: F.full, on: col, off: fadeOf(col), head: pal.ink, px: 1, pitches, minW: 2 });
    return;
  }
  if (w === 'spiral') { paint.spiral(g, box, list, cyc, { full: F.full, on: col, off: fadeOf(col), px: 0.7 }); return; }
  if (w === 'pitchwheel') { paint.wheel(g, box, list, cyc, { full: F.full, ring: pal.muted, dot: col, px: 1 }); }
}
// a colour at half strength for the notes not sounding now (#rrggbb → rgba)
const fades = new Map();
function fadeOf(col) {
  if (fades.has(col)) return fades.get(col);
  const m = /^#([0-9a-f]{6})$/i.exec(col), v = m ? `rgba(${parseInt(m[1].slice(0, 2), 16)},${parseInt(m[1].slice(2, 4), 16)},${parseInt(m[1].slice(4), 16)},.5)` : col;
  fades.set(col, v);
  return v;
}

// Monitor: the panels of the section in the grid of monitorLayout
export function drawMonitor(g, W, H, F) {
  background(g, W, H, F.pal);
  const list = F.dim === 'hidden' ? F.roster.filter(p => !p.quiet) : F.roster;
  if (!list.length) {
    g.fillStyle = F.pal.muted; g.font = `600 ${Math.round(Math.min(W, H) * 0.035)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MONITOR · —', W / 2, H / 2);
    return;
  }
  const boxes = monitorLayout(list.length, W, H);
  list.forEach((p, i) => drawPanel(g, boxes[i], p, F));
}

// Rullo: the melodic instruments on one pitch axis around a playhead, a legend, the drums as lanes below
export function drawRullo(g, W, H, F) {
  const pal = F.pal, cyc = F.cyc, span = 4, x0 = cyc - span / 2;
  background(g, W, H, pal);
  const lanes = F.lanes, laneH = Math.min(H * 0.075, 46), top = tallOf(W, H) ? H * 0.06 : Math.max(H * 0.1, Math.min(H * 0.2, 72)), laneTop = H - lanes.length * laneH - H * 0.03;
  const mBottom = lanes.length ? laneTop - H * 0.03 : H - H * 0.04, mh = mBottom - top;
  const X = c => ((c - x0) / span) * W;
  const fs = clamp(Math.round(Math.min(W * 0.03, H * 0.022)), 8, 15);
  // pitch rows
  const { lo, hi } = F.range(), rows = Math.max(1, hi - lo + 1), rh = mh / rows;
  g.fillStyle = pal.grid;
  for (let r = 0; r <= rows; r++) g.fillRect(0, top + r * rh, W, 1);
  // bar lines
  for (let b = Math.ceil(x0); b <= x0 + span; b++) { g.fillStyle = pal.grid; g.fillRect(X(b), top, 1, mBottom - top); }
  // melodic notes, each instrument in its colour
  const yOf = p => (typeof p === 'number' ? top + (hi - clamp(Math.round(p), lo, hi)) * rh : top + mh / 2);
  for (const inst of F.melodic) {
    const col = instColour(pal, inst);
    for (const n of F.notes(inst, x0, x0 + span)) {
      const on = n[0] <= cyc && cyc < n[1], x = X(n[0]), w = Math.max(3, X(n[1]) - x - 1), y = yOf(n[2]);
      g.globalAlpha = (F.full ? 1 : clamp(n[3] * 1.2, 0.25, 1)) * (on ? 1 : n[0] > cyc ? 0.78 : 0.5);
      if (on && pal.glow) { g.shadowColor = col; g.shadowBlur = 12 * pal.glow; }
      g.fillStyle = col; g.fillRect(x, y + 1, w, Math.max(2, rh - 2));
      g.shadowBlur = 0;
    }
  }
  g.globalAlpha = 1;
  // drum lanes: a dot per onset, the one just hit bigger
  lanes.forEach((inst, i) => {
    // (a dot never wider than a sixteenth's room)
    const y = laneTop + i * laneH + laneH / 2, col = instColour(pal, inst), r = clamp(Math.min(laneH * 0.16, (W / span / 16) * 0.38), 1.5, 8);
    g.fillStyle = col;
    for (const n of F.notes(inst, x0, x0 + span)) {
      const hit = n[0] <= cyc && cyc - n[0] < 0.08;
      g.globalAlpha = (F.full ? 1 : clamp(n[3] * 1.2, 0.3, 1)) * (hit ? 1 : n[0] > cyc ? 0.85 : 0.45);
      if (hit && pal.glow) { g.shadowColor = col; g.shadowBlur = 14 * pal.glow; }
      g.beginPath(); g.arc(X(n[0]), y, hit ? r * 1.5 : r, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
    }
    g.globalAlpha = 1;
    // the lane's name on a dark plate, over the dots
    g.font = `600 ${fs}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    const txt = F.label(inst).toUpperCase(), tw = g.measureText(txt).width;
    g.fillStyle = pal.bg; g.globalAlpha = 0.85; g.fillRect(W * 0.008, y - fs * 0.75, tw + fs, fs * 1.5); g.globalAlpha = 1;
    g.fillStyle = col; g.fillText(txt, W * 0.008 + fs / 2, y);
  });
  // playhead
  g.fillStyle = pal.ink; g.globalAlpha = 0.75; g.fillRect(W / 2 - 0.75, top - H * 0.02, 1.5, H - top); g.globalAlpha = 1;
  // legend, top right (smaller type when the names do not fit)
  let lf = fs;
  g.font = `600 ${lf}px ${FONT}`;
  const need = F.melodic.reduce((a, inst) => a + g.measureText(F.label(inst).toUpperCase()).width + lf * 2.6, 0);
  if (need > W * 0.9) { lf = Math.max(6, Math.floor((lf * W * 0.9) / need)); }
  g.font = `600 ${lf}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  let lx = W - W * 0.015;
  for (const inst of [...F.melodic].reverse()) {
    const txt = F.label(inst).toUpperCase(), tw = g.measureText(txt).width;
    lx -= tw; g.fillStyle = pal.label; g.fillText(txt, lx, top - fs * 0.9);
    lx -= lf * 1.2; g.fillStyle = instColour(pal, inst); g.fillRect(lx, top - fs * 0.9 - lf * 0.4, lf * 0.8, lf * 0.8);
    lx -= lf * 1.4;
  }
  if (!F.melodic.length && !lanes.length) {
    g.fillStyle = pal.muted; g.font = `600 ${Math.round(Math.min(W, H) * 0.035)}px ${FONT}`; g.textAlign = 'center';
    g.fillText(`${F.rollName || 'RULLO'} · —`, W / 2, H / 2);
  }
}
