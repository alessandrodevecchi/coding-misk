// The layer of widget panels over the other looks (widgets-on-stage D4): the strip (two panels per side on a wide stage,
// a centred row at the bottom on a tall one) and the Palco look's big screen. The panels are those of Monitor
// (drawPanel of widget-looks.js), with a see-through background so the look stays visible. Pure: the layouts and the
// drawing are checked in Node with a recording context (tools/check-stage-widgets.mjs).
import { drawPanel } from './widget-looks.js';

const tallOf = (W, H) => H > W * 1.05;

// D4, wide stage: up to 4 panels, two per side, stacked around the middle, so the centre (the sun, the radar, Palco's
// LED wall, the typed comment) stays free. Order: left top, right top, left bottom, right bottom: 3 panels are two on
// the left and one on the right at the same top, 1 panel is on the left. One row (1 or 2 panels) is centred in height.
// Tall stage (9:16 fragments): a centred row at the bottom, up to 3 in a row, 4 as 2×2.
// code-over-visual D7: while the code is drawn over the stage the strip keeps to the side away from the code: free is
// 'left' or 'right' (the free side: two panels at most, stacked there), 'none' (no strip: tall pictures, code across the
// whole width) or null (as before). Set by the stage before it draws the layer (setLayerFree)
let FREE = null;
export const setLayerFree = side => { FREE = side === 'left' || side === 'right' || side === 'none' ? side : null; };
export const layerFree = () => FREE;
export function stripLayout(n, W, H, free = FREE) {
  n = Math.max(0, Math.min(4, n));
  if (!n || free === 'none') return [];
  if (free && !tallOf(W, H)) {
    const mx = Math.max(8, W * 0.02), gap = Math.max(6, H * 0.025), k = Math.min(2, n);
    let h = H * 0.2, w = W * 0.2;
    if (w / h > 3) w = h * 3;
    if (w / h < 1.15) h = w / 1.15;
    const top = H / 2 - (k * h + (k - 1) * gap) / 2;
    return Array.from({ length: k }, (_, i) => ({ x: free === 'right' ? W - mx - w : mx, y: top + i * (h + gap), w, h }));
  }
  if (tallOf(W, H)) {
    const mx = Math.max(8, W * 0.04), gap = Math.max(6, W * 0.025), bottom = H * 0.035;
    const cols = n === 4 ? 2 : n, rows = n === 4 ? 2 : 1;
    // one panel alone takes 60% of the row, not the whole width
    const avail = W - 2 * mx, w = n === 1 ? avail * 0.6 : (avail - gap * (cols - 1)) / cols;
    const h = Math.min(w / (rows === 2 ? 1.5 : 1.2), H * (rows === 2 ? 0.11 : 0.15));
    const out = [], y0 = H - bottom - rows * h - (rows - 1) * gap;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols), x0 = (W - inRow * w - (inRow - 1) * gap) / 2;
      out.push({ x: x0 + c * (w + gap), y: y0 + r * (h + gap), w, h });
    }
    return out;
  }
  // about a fifth of the width and of the height each (a wide panel on a very wide stage is kept at 3:1 at most)
  const mx = Math.max(8, W * 0.02), gap = Math.max(6, H * 0.025);
  let h = H * 0.2, w = W * 0.2;
  if (w / h > 3) w = h * 3;
  if (w / h < 1.15) h = w / 1.15;
  const rows = n > 2 ? 2 : 1, top = H / 2 - (rows * h + (rows - 1) * gap) / 2, out = [];
  for (let i = 0; i < n; i++) {
    const right = i % 2 === 1, r = Math.floor(i / 2);
    out.push({ x: right ? W - mx - w : mx, y: top + r * (h + gap), w, h });
  }
  return out;
}

// the Palco look's LED wall, in the same proportions as its drawing in src/visuals.js (palco: lx0 = W * .14,
// lx1 = W * .86, ly0 = H * .07, ly1 = H * .3)
export const palcoScreen = (W, H) => ({ x: W * 0.14, y: H * 0.07, w: W * 0.72, h: H * 0.23 });
// D4, Palco: up to 4 panels inside the big screen, in the grid that gives each the most area (each panel between 1.1 and
// 3.2 times as wide as high), the last row centred; fewer panels are bigger
export function screenLayout(n, W, H) {
  n = Math.max(0, Math.min(4, n));
  if (!n) return [];
  const S = palcoScreen(W, H), pad = Math.max(4, Math.min(S.w, S.h) * 0.06), gap = pad * 0.8;
  const aw = S.w - 2 * pad, ah = S.h - 2 * pad;
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    if (cols > 1 && Math.ceil(n / (cols - 1)) === rows) continue;
    let w = (aw - gap * (cols - 1)) / cols, h = (ah - gap * (rows - 1)) / rows;
    if (w <= 0 || h <= 0) continue;
    if (w / h > 3.2) w = h * 3.2;
    if (w / h < 1.1) h = w / 1.1;
    const score = w * h;
    if (!best || score > best.score + 1e-6) best = { cols, rows, w, h, score };
  }
  const { cols, rows, w, h } = best, y0 = S.y + pad + (ah - rows * h - (rows - 1) * gap) / 2, out = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols), x0 = S.x + pad + (aw - inRow * w - (inRow - 1) * gap) / 2;
    for (let c = 0; c < inRow; c++) out.push({ x: x0 + c * (w + gap), y: y0 + r * (h + gap), w, h });
  }
  return out;
}

// a palette whose panels are see-through (the look stays visible behind them): the panel colour at 60% opacity
const seen = new WeakMap();
export function seeThrough(pal) {
  let p = seen.get(pal);
  if (!p) { p = { ...pal, panel: String(pal.panel).replace(/rgba\(([^)]*),\s*[\d.]+\)/, 'rgba($1,.6)') }; seen.set(pal, p); }
  return p;
}

export const layerLayout = (kind, n, W, H) => (kind === 'screen' ? screenLayout(n, W, H) : stripLayout(n, W, H));

// the layer: the panels of the section (the frame F of widget-looks.js) in the strip or the screen. kind: 'strip' or
// 'screen'. → the panels drawn (for the checks)
export function drawLayer(g, W, H, F, kind) {
  const list = F.dim === 'hidden' ? F.roster.filter(p => !p.quiet) : F.roster;
  if (!list.length) return [];
  const boxes = layerLayout(kind, list.length, W, H);
  list.forEach((p, i) => { if (boxes[i]) drawPanel(g, boxes[i], p, F); });
  return list.slice(0, boxes.length);
}
