// Version 1 (2026-10-17), kept as it was: the first engine and concepts. Later versions live one folder up.
// Pixel drawing helpers for the scrolling visuals (procedural-visuals): rectangles with a dark outline and three
// tones, discs, rings and a 3×5 font. g is a 2D context of the small canvas the engine draws into.
import { shade } from './scroller.js';

export const OUT = '#1d1216';
// ---------- pixel helpers ----------
export const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
// a box with a dark outline, a lit top row and a shaded bottom row
export function box(g, x, y, w, h, fill, { line = OUT, lit = shade(fill, 0.25), dark = shade(fill, -0.3) } = {}) {
  x = Math.round(x); y = Math.round(y);
  if (line) px(g, line, x - 1, y - 1, w + 2, h + 2);
  px(g, fill, x, y, w, h);
  if (h > 2) { px(g, lit, x, y, w, 1); px(g, dark, x, y + h - 1, w, 1); }
}
export function disc(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); px(g, c, cx - hw, cy + y, hw * 2 + 1, 1); } }
export function ring(g, cx, cy, r, c) { for (let a = 0; a < 64; a++) { const t = (a / 64) * Math.PI * 2; px(g, c, cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.6); } }
// a 3×5 pixel font for the signs
export const FONT = { A: '010101111101101', C: '011100100100011', E: '111100110100111', G: '011100101101011', I: '111010010010111', K: '101110100110101', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010', W: '101101111111101', Y: '101101010010010', Z: '111001010100111', B: '110101110101110', D: '110101101101110', F: '111100110100100', H: '101101111101101', J: '001001001101010', L: '100100100100111', Q: '010101101110011', U: '101101101101111', V: '101101101101010', X: '101101010101101', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '010101010101010', 9: '010101011001110', '-': '000000111000000', '.': '000000000000010', ' ': '000000000000000' };
export function text(g, s, x, y, c) { [...s].forEach((ch, i) => { const f = FONT[ch] || FONT[' ']; for (let k = 0; k < 15; k++) if (f[k] === '1') px(g, c, x + i * 4 + (k % 3), y + Math.floor(k / 3)); }); }

