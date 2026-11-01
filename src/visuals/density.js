// How fine each render draws (denser-renders, #79): the cells of a pass from the picture's size alone, never from the
// look that drew it (D9), so the stage, the session video, the fast video, the fragments, the live output and any later
// picture source get the same cells for the same size. Pure functions of (W, H logical, dpr, density, light), checked
// in Node by tools/check-render-styles.mjs.
//
// D1: a cell size from the short side S = min(W, H) in logical pixels, clamp(S / n, min, max).
// D8: the Density setting multiplies the Normal cell after that clamp (Coarse 1.4, Normal 1, Fine 0.7); the hard
// floors (device pixels, readable text, the 1-bit work picture) still hold after it.
// D6: the light form makes cells 1.5 times larger, never past the render's max at the chosen density.

export const DENSITIES = Object.freeze(['coarse', 'normal', 'fine']);
export const DENSITY_KEY = 'coding-misk-render-density';
export const DENSITY_FACTOR = Object.freeze({ coarse: 1.4, normal: 1, fine: 0.7 });
export const densityOf = v => (DENSITIES.includes(v) ? v : 'normal');
const factorOf = d => DENSITY_FACTOR[densityOf(d)];
export const LIGHT_FACTOR = 1.5;
// the largest 1-bit work picture, in pixels (D4)
export const BIT_CAP = 1.2e6;
// the rules: LED pitch and ASCII cell height in logical pixels (D2, D3); Terminal and the glyph forms in rows of the
// short side (D5), their text at least TEXT_MIN logical pixels high and at least ROWS_MIN rows
export const RULES = Object.freeze({
  led: Object.freeze({ n: 150, min: 2.5, max: 6, minDevice: 4 }),
  ascii: Object.freeze({ n: 80, min: 7, max: 14, floor: 5, minDevice: 6, aspect: 1.9 }),
  bit: Object.freeze({ dot: 2, minDevice: 1 }),
  terminal: Object.freeze({ n: 16, min: 30, max: 70 }),
  glyph: Object.freeze({ n: 16, min: 18, max: 64 }),
});
// (the text of a cell is 1/1.2 of its height: termGrid's font, whose 0.6 em advance fills a cell half as wide as tall)
export const TEXT_MIN = 12, TEXT_CELL = 1.2, ROWS_MIN = 18;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// a cell of the rule at a density, and in the light form
function cellOf(R, S, density, light) {
  const f = factorOf(density), c = clamp(S / R.n, R.min, R.max) * f;
  return light ? Math.min(c * LIGHT_FACTOR, Math.max(c, R.max * f)) : c;
}

// LED: the dot pitch. → { pitch (device px), rows, cols }, the rows filling the height
export function ledCells(W, H, dpr = 1, density = 'normal', light = false) {
  const R = RULES.led, p = Math.max(R.minDevice, cellOf(R, Math.min(W, H), density, light) * dpr), ch = H * dpr, cw = W * dpr;
  const rows = Math.max(1, Math.round(ch / p)), pitch = ch / rows;
  return { pitch, rows, cols: Math.max(1, Math.floor(cw / pitch)) };
}
// ASCII: the character cell (1 : 1.9). → { cellW, cellH (device px), rows, cols }
export function asciiCells(W, H, dpr = 1, density = 'normal', light = false) {
  const R = RULES.ascii, c = Math.max(R.floor, cellOf(R, Math.min(W, H), density, light)), ch = H * dpr, cw = W * dpr;
  const rows = Math.max(1, Math.round(ch / Math.max(R.minDevice, c * dpr))), cellH = ch / rows, cellW = cellH / R.aspect;
  return { cellW, cellH, rows, cols: Math.max(1, Math.floor(cw / cellW)) };
}
// 1-bit: the dither dot in device pixels, the work picture kept within BIT_CAP. → { dot, w, h }
export function bitCells(W, H, dpr = 1, density = 'normal', light = false) {
  const R = RULES.bit, cw = W * dpr, ch = H * dpr;
  let dot = Math.max(R.minDevice, R.dot * factorOf(density) * (light ? LIGHT_FACTOR : 1));
  if ((cw / dot) * (ch / dot) > BIT_CAP) dot = Math.sqrt((cw * ch) / BIT_CAP);
  return { dot, w: Math.max(1, Math.floor(cw / dot)), h: Math.max(1, Math.floor(ch / dot)) };
}
// rows of a text grid over the height H: the cell of the short side's rule, the text floor, at least ROWS_MIN
function textRows(R, W, H, density, light) {
  const S = Math.min(W, H), f = factorOf(density), base = S / clamp(Math.round(S / R.n), R.min, R.max);
  let c = base * f;
  // (the light form: cells 1.5 times larger, never fewer rows than the rule's smallest count at this density)
  if (light) c = Math.min(c * LIGHT_FACTOR, Math.max(c, (S / R.min) * f));
  return Math.max(ROWS_MIN, Math.min(Math.round(H / c), Math.floor(H / (TEXT_MIN * TEXT_CELL))));
}
// Terminal over a scene: the rows of its grid (gridOf(W, H, rows))
export const termRows = (W, H, density = 'normal', light = false) => textRows(RULES.terminal, W, H, density, light);
// the glyph forms of Monitor and Roll (ASCII, Terminal) and the layer over a scene in ASCII
export const glyphRows = (W, H, density = 'normal') => textRows(RULES.glyph, W, H, density, false);
// CRT: the grille's colour column and the scanline period in device pixels (D6), about the same in logical pixels at
// any ratio (no cells, so no density)
export const crtSpacing = (dpr = 1) => ({ col: Math.max(1, Math.round(dpr / 1.5)), scan: Math.max(2, Math.round(2 * dpr)) });
