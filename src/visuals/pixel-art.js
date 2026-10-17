// Pixel art tools for the scrolling visuals, version 3 (procedural-visuals). Version 3 draws big, detailed objects:
// a facade, a landmark, the van are painted once into their own small canvas (baked) with as much detail as they need
// (texture, dithering, an outline found from their shape, light from one side) and then only copied every frame, so
// the detail costs nothing while the picture moves. What changes with the music is drawn on top.
import { canvasOf, mix, shade, rng } from './scroller.js';

const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const toHex = a => `#${a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

// a ramp of n tones around a colour, darkest first: shadows lean to cool violet, lights to warm, like hand-picked palettes
export function ramp(c, n = 5, { cool = '#1a1040', warm = '#fff2c8', spread = 0.75 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
    out.push(t < 0 ? mix(c, cool, -t * spread) : mix(c, warm, t * spread * 0.7));
  }
  return out;
}
// ordered dithering: a 4×4 Bayer threshold, so two tones blend into a gradient made of pixels
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
export function px(g, c, x, y, w = 1, h = 1) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
// a vertical gradient between tones, dithered at each step
export function vgrad(g, x, y, w, h, tones) {
  const n = tones.length - 1;
  for (let yy = 0; yy < h; yy++) {
    const t = (yy / Math.max(1, h - 1)) * n, i = Math.min(n - 1, Math.floor(t)), f = t - i;
    for (let xx = 0; xx < w; xx++) px(g, f > bayer(x + xx, y + yy) ? tones[i + 1] : tones[i], x + xx, y + yy);
  }
}
// fill a rectangle with tone a, sprinkled with tone b at a density (seeded, stable)
export function speckle(g, x, y, w, h, a, b, density, seed = 0) {
  if (a) px(g, a, x, y, w, h);
  g.fillStyle = b;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (rng('sp', seed, xx, yy) < density) g.fillRect(x + xx, y + yy, 1, 1);
}
// a panel lit from the top left: light edge up and left, dark edge down and right, a dark line around
export function panel(g, x, y, w, h, r, { line = r[0], inset = true } = {}) {
  const n = r.length, mid = r[Math.floor(n / 2)];
  if (line) px(g, line, x - 1, y - 1, w + 2, h + 2);
  px(g, mid, x, y, w, h);
  if (!inset) return;
  px(g, r[n - 1], x, y, w, 1); px(g, r[Math.min(n - 1, Math.floor(n / 2) + 1)], x, y, 1, h);
  px(g, r[1], x, y + h - 1, w, 1); px(g, r[1], x + w - 1, y + 1, 1, h - 1);
}
// a horizontal cylinder (pipe, tank) shaded across its height
export function hcyl(g, x, y, w, h, r) { for (let k = 0; k < h; k++) { const t = k / Math.max(1, h - 1), i = Math.round((1 - Math.abs(t - 0.3) / 0.7) * (r.length - 1)); px(g, r[Math.max(0, i)], x, y + k, w, 1); } }
export function vcyl(g, x, y, w, h, r) { for (let k = 0; k < w; k++) { const t = k / Math.max(1, w - 1), i = Math.round((1 - Math.abs(t - 0.3) / 0.7) * (r.length - 1)); px(g, r[Math.max(0, i)], x + k, y, 1, h); } }
export function disc(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); px(g, c, cx - hw, cy + y, hw * 2 + 1, 1); } }
// a shaded sphere-ish disc: light from the top left
export function ball(g, cx, cy, r, tones) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y > r * r + r * 0.6) continue;
    const l = 1 - Math.hypot(x + r * 0.35, y + r * 0.35) / (r * 1.7), i = Math.max(0, Math.min(tones.length - 1, Math.floor((l + bayer(cx + x, cy + y) * 0.25) * tones.length)));
    px(g, tones[i], cx + x, cy + y);
  }
}

// a sprite from rows of characters: one colour per character, '.' or ' ' is empty
export function art(g, rows, pal, x, y, { flip = false } = {}) {
  const w = Math.max(...rows.map(r => r.length));
  rows.forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) { const c = pal[row[xx]]; if (c) px(g, c, x + (flip ? w - 1 - xx : xx), y + yy); } });
}

// the dark line around whatever is drawn in a canvas (where an empty pixel touches a filled one)
export function outline(c, col = '#07040f', { inner = false } = {}) {
  const g = c.getContext('2d'), w = c.width, h = c.height, src = g.getImageData(0, 0, w, h), a = src.data, out = g.createImageData(w, h), o = out.data, [r, gg, b] = hex(col);
  const filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 40;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const me = filled(x, y), edge = (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1));
    if ((!me && edge) || (inner && me && !(filled(x - 1, y) && filled(x + 1, y) && filled(x, y - 1) && filled(x, y + 1)))) { const k = (y * w + x) * 4; o[k] = r; o[k + 1] = gg; o[k + 2] = b; o[k + 3] = 255; }
  }
  const t = canvasOf(w, h); t.getContext('2d').putImageData(out, 0, 0);
  g.drawImage(t, 0, 0);
  return c;
}

// baked pictures: paint(g, gl, w, h) runs once per key into a canvas and its light canvas; copies are cached
const baked = new Map();
export function bake(key, w, h, paint, { line } = {}) {
  let b = baked.get(key);
  if (b) return b;
  const c = canvasOf(w, h), l = canvasOf(w, h), g = c.getContext('2d'), gl = l.getContext('2d');
  g.imageSmoothingEnabled = false; gl.imageSmoothingEnabled = false;
  const extra = paint(g, gl, w, h) || {};
  if (line) outline(c, line);
  b = { c, l, w, h, ...extra };
  if (baked.size > 160) baked.delete(baked.keys().next().value);
  baked.set(key, b);
  return b;
}
// copy a baked picture and its lights into the frame (the lights at an alpha, to flicker or pulse)
export function put(g, gl, b, x, y, { light = 1 } = {}) {
  g.drawImage(b.c, Math.round(x), Math.round(y));
  if (gl && light > 0) { gl.globalAlpha = light; gl.drawImage(b.l, Math.round(x), Math.round(y)); gl.globalAlpha = 1; }
}

// pseudo glyphs for the signs: blocky signs of no real script, drawn from a seed in a 5×5 or 7×7 cell
export function glyph(g, x, y, seed, c, size = 5) {
  const s = size, half = Math.ceil(s / 2);
  // strokes: a frame part, a cross part, dots, mirrored on the left and right half most of the time
  const mirror = rng('gm', seed) < 0.6;
  for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < (mirror ? half : s); xx++) {
    const edge = yy === 0 || yy === s - 1 || xx === 0, mid = yy === Math.floor(s / 2) || xx === Math.floor(s / 2);
    const p = edge ? 0.45 : mid ? 0.6 : 0.18;
    if (rng('gp', seed, xx, yy) < p) { px(g, c, x + xx, y + yy); if (mirror) px(g, c, x + s - 1 - xx, y + yy); }
  }
}

// a dithered gradient strip, cached by its size and tones (for skies and roads drawn every frame)
export function gradStrip(w, h, tones) { return bake(`grad|${w}|${h}|${tones.join(',')}`, w, h, g => vgrad(g, 0, 0, w, h, tones)); }
// a fast integer hash for textures (x, y, seed → 0..1), much cheaper than rng() inside pixel loops
export function noise(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

export { mix, shade, toHex, hex };
