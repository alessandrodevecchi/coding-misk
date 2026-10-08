// Pixel-art portraits of artists: a 16x16 face drawn from a seed and a palette, symmetric, no image files.
// portraitPixels is pure (same seed, same picture) and runs in Node for the checks; portraitUrl draws it in the browser.
import { stream } from './random.js';

export const PALETTE_COLORS = {
  violet: { bg: ['#1b1030', '#2a1446'], accent: ['#b46cff', '#ff4fa3'], hair: ['#2b1a3d', '#5b2a86', '#e9e3ff'] },
  neon: { bg: ['#06121c', '#0d0a24'], accent: ['#00f0ff', '#ff2e88', '#fcee0a'], hair: ['#ff2e88', '#00f0ff', '#14141c'] },
  amber: { bg: ['#1c1206', '#2a1a08'], accent: ['#ffb347', '#ff7a1f'], hair: ['#3a240c', '#d9a050', '#f4e2b8'] },
  ice: { bg: ['#07131c', '#0c1d2b'], accent: ['#8fe3ff', '#c6b8ff'], hair: ['#d7f2ff', '#5d7d99', '#1b2a3a'] },
  blood: { bg: ['#16070a', '#240a10'], accent: ['#ff3355', '#ff8a99'], hair: ['#120507', '#5a0f1c', '#e6e0e0'] },
  forest: { bg: ['#07140c', '#0c2014'], accent: ['#5fe08b', '#d9f27a'], hair: ['#1d2a12', '#6b4a22', '#c9b98a'] },
  sunset: { bg: ['#1c0b16', '#2a1018'], accent: ['#ff7a59', '#ffcc66', '#ff4fa3'], hair: ['#2a1410', '#8a3b2a', '#ffcc66'] },
  mono: { bg: ['#101012', '#1a1a1e'], accent: ['#e9e6de', '#9b968a'], hair: ['#2a2a2e', '#d9d6ce', '#6b6b70'] },
};
const SKIN = ['#f1c9a5', '#d9a47a', '#b07a52', '#7a4e33', '#e8d4c4', '#c9b8ff'];

// 16x16 array of colours (null = background)
export function portraitPixels(seed, palette) {
  const P = PALETTE_COLORS[palette] || PALETTE_COLORS.violet, r = stream(String(seed), 'portrait');
  const g = Array.from({ length: 16 }, () => Array(16).fill(null));
  const set = (x, y, c) => { if (x >= 0 && x < 8 && y >= 0 && y < 16) { g[y][x] = c; g[y][15 - x] = c; } };
  const bg = r.pick(P.bg), accent = r.pick(P.accent), hair = r.pick(P.hair), skin = r.pick(SKIN), shirt = r.pick(P.accent);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g[y][x] = bg;
  // head: width 4 to 6 half-columns from the centre, rows 3 to 11
  const w = r.int(4, 5), top = r.int(3, 4), chin = r.int(10, 11);
  for (let y = top; y <= chin; y++) { const ww = y === top || y === chin ? w - 1 : w; for (let x = 8 - ww; x < 8; x++) set(x, y, skin); }
  // neck and shoulders
  for (let y = chin + 1; y < 13; y++) for (let x = 6; x < 8; x++) set(x, y, skin);
  for (let y = 13; y < 16; y++) for (let x = y === 13 ? 3 : 1; x < 8; x++) set(x, y, shirt);
  // hair
  const style = r.pick(['short', 'long', 'mohawk', 'bald', 'hood', 'cap']);
  if (style === 'short' || style === 'long') { for (let x = 8 - w - 1; x < 8; x++) { set(x, top - 1, hair); set(x, top, hair); } for (let y = top; y < (style === 'long' ? 13 : top + 3); y++) set(8 - w - 1, y, hair); }
  if (style === 'mohawk') for (let y = 0; y <= top; y++) set(7, y, accent);
  if (style === 'hood') { for (let y = top - 1; y <= chin + 1; y++) set(8 - w - 1, y, shirt); for (let x = 8 - w - 1; x < 8; x++) set(x, top - 1, shirt); }
  if (style === 'cap') { for (let x = 8 - w - 1; x < 8; x++) { set(x, top - 1, accent); set(x, top, accent); } set(8 - w - 2, top, accent); }
  // eyes, or a visor or glasses
  const eyes = r.pick(['dots', 'visor', 'glasses', 'dots']), ey = top + 3;
  if (eyes === 'dots') set(5, ey, '#101014');
  if (eyes === 'visor') for (let x = 8 - w; x < 8; x++) set(x, ey, accent);
  if (eyes === 'glasses') { set(4, ey, '#101014'); set(5, ey, '#101014'); set(6, ey, '#101014'); set(4, ey - 1, '#101014'); }
  // mouth
  const my = Math.min(chin - 1, ey + 3);
  if (r.chance(0.6)) { set(6, my, '#5a2a2a'); set(7, my, '#5a2a2a'); } else set(7, my, '#5a2a2a');
  // headphones now and then
  if (r.chance(0.45)) { for (let y = top; y <= ey + 1; y++) set(8 - w - 1, y, '#202028'); set(8 - w - 1, ey, accent); for (let x = 8 - w; x < 8; x++) set(x, top - 2, '#202028'); }
  return g;
}

// data URL of the portrait at "size" pixels (browser only)
export function portraitUrl(seed, palette, size = 128) {
  const g = portraitPixels(seed, palette), c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  g.forEach((row, y) => row.forEach((col, x) => { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }));
  const big = document.createElement('canvas'); big.width = big.height = size;
  const b = big.getContext('2d'); b.imageSmoothingEnabled = false; b.drawImage(c, 0, 0, size, size);
  return big.toDataURL('image/png');
}
