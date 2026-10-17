// Buildings of the neon city v3 (procedural-visuals), each baked once from its seed with its lights:
//   - facade: a building of the street close by, 100 to 140 pixels wide, floors of 26 pixels, a shop at street level,
//     a roof with tanks and antennas; four styles (brick tenement, concrete block, shop-house with balconies, metal);
//   - sign: a neon sign of pseudo glyphs, vertical or horizontal, with bulbs and brackets;
//   - tower: a skyscraper of the middle distance with a window grid, neon edges and a crown;
//   - skyline: a strip of far towers, thousands of tiny windows, as one picture.
import { bake, px, disc, ramp, panel, vgrad, hcyl, vcyl, speckle, glyph, noise, mix, shade, bayer } from '../pixel-art.js';
import { stream } from '../scroller.js';

const INK = '#07040f';
export const FLOOR = 26, SHOP = 36, ROOF = 22;
const WORDS = ['RAMEN', 'BAR', 'HOTEL', 'CLUB', 'TECH', 'NOODLE', 'KARAOKE', 'DATA', 'SUSHI', 'PAWN', 'REPAIR', 'MARKET', 'ARCADE', 'CHIPS', 'TEA', 'DINER', 'MODS', 'LIVE'];
const SHOPS = ['noodle', 'electro', 'shutter', 'bar', 'store', 'arcade'];

// ---------- details ----------
// a window with its frame, sill and, when lit, what is inside (sent to the light canvas)
function windowDetail(g, gl, x, y, w, h, lit, d, s) {
  const r = stream('win', s), frame = '#2c2838';
  px(g, INK, x - 1, y - 1, w + 2, h + 2); px(g, frame, x, y, w, h);
  const gx = x + 1, gy = y + 1, gw = w - 2, gh = h - 2;
  if (!lit) {
    vgrad(g, gx, gy, gw, gh, ['#1e2234', '#141626', '#0c0c18']);
    for (let k = 0; k < gh; k++) if ((k + gw) % 7 < 2) px(g, '#2a3048', gx + Math.max(0, gw - k - 2), gy + k, 2, 1); // reflection
  } else {
    const warm = r.chance(0.7) ? r.pick(['#ffcf7a', '#ffb860', '#ffe0a0']) : r.chance(0.5) ? d.b : r.pick(['#a8e0ff', '#c8a8ff']);
    vgrad(g, gx, gy, gw, gh, [mix(warm, '#ffffff', 0.25), warm, shade(warm, -0.25)]);
    gl.globalAlpha = 0.5; px(gl, warm, gx, gy, gw, gh); gl.globalAlpha = 1;
    const inside = r.int(0, 6), dk = shade(warm, -0.6);
    if (inside === 0) for (let k = 0; k < gh; k += 2) px(g, shade(warm, -0.35), gx, gy + k, gw, 1); // blinds
    else if (inside === 1) { px(g, shade(warm, -0.5), gx, gy, 3, gh); px(g, shade(warm, -0.5), gx + gw - 3, gy, 3, gh); px(g, shade(warm, -0.3), gx + 3, gy, 1, gh); } // curtains
    else if (inside === 2) { const cx = gx + r.int(2, gw - 4); px(g, dk, cx, gy + gh - 7, 4, 7); disc(g, cx + 2, gy + gh - 9, 2, dk); } // someone
    else if (inside === 3) { px(g, dk, gx, gy + gh - 4, gw, 1); for (let k = 1; k < gw - 1; k += 3) px(g, dk, gx + k, gy + gh - 7, 2, 3); } // a shelf
    else if (inside === 4) { px(g, '#1a1a2a', gx + 2, gy + 3, gw - 4, gh - 6); px(g, d.b, gx + 3, gy + 4, gw - 6, gh - 8); px(gl, d.b, gx + 3, gy + 4, gw - 6, gh - 8); } // a screen
    else if (inside === 5) { px(g, dk, gx + Math.floor(gw / 2), gy, 1, 3); disc(g, gx + Math.floor(gw / 2), gy + 4, 2, mix(warm, '#ffffff', 0.5)); } // a lamp
    px(g, frame, x + Math.floor(w / 2), y, 1, h); // the mullion
  }
  // sill
  px(g, '#4a4458', x - 1, y + h + 1, w + 2, 1); px(g, '#1a1624', x - 1, y + h + 2, w + 2, 1);
  // a plant pot or a box on some sills
  if (r.chance(0.2)) { px(g, '#6a3a2a', x + 1, y + h - 2, 4, 3); px(g, r.pick(['#3f8a4a', '#5aa04a', '#2a6a3a']), x, y + h - 5, 6, 3); px(g, '#7ac05a', x + 2, y + h - 5, 2, 1); }
}
// an air unit hanging under a window
function airUnit(g, x, y, s) {
  const M = ramp('#7a7a8a', 5);
  panel(g, x, y, 12, 8, M, { line: INK });
  for (let k = 0; k < 6; k += 2) px(g, M[1], x + 1, y + 2 + k, 7, 1);
  disc(g, x + 9, y + 4, 2, M[0]); px(g, M[3], x + 9, y + 3, 1, 1);
  px(g, '#3a3a48', x + 2, y + 8, 1, 3 + (s % 4)); // drip pipe
}
// laundry on a line between two points
function laundry(g, x, y, w, s) {
  const r = stream('laundry', s);
  for (let k = 0; k < w; k++) px(g, '#5a5466', x + k, y + Math.round(Math.sin((k / w) * Math.PI) * 3), 1, 1);
  for (let k = 3; k < w - 4; k += r.int(5, 8)) { const yy = y + Math.round(Math.sin((k / w) * Math.PI) * 3) + 1, c = r.pick(['#c8483a', '#3a6ac8', '#e8e0d0', '#d8b43a', '#4a9a6a', '#d870a8']); const sh = r.int(4, 8); px(g, c, x + k, yy, 4, sh); px(g, shade(c, -0.3), x + k + 3, yy, 1, sh); px(g, shade(c, 0.25), x + k, yy, 4, 1); }
}

// ---------- the walls ----------
function wall(g, x, y, w, h, style, base, s) {
  const r = ramp(base, 5);
  if (style === 'brick') {
    px(g, r[2], x, y, w, h);
    for (let row = 0; row * 4 < h; row++) {
      const yy = y + row * 4; px(g, r[1], x, yy + 3, w, 1);
      for (let k = (row % 2) * 4 - 4; k < w; k += 8) {
        const n = noise(k, row, s), t = n < 0.1 ? r[1] : n < 0.22 ? r[3] : n > 0.97 ? r[0] : null;
        if (t) px(g, t, Math.max(x, x + k + 1), yy, Math.min(7, x + w - (x + k + 1)), 3);
        if (k >= 0) px(g, r[1], x + k, yy, 1, 3);
        if (noise(k, row, s + 1) < 0.35) px(g, r[3], Math.max(x, x + k + 1), yy, Math.min(6, x + w - (x + k + 1)), 1);
      }
    }
  } else if (style === 'concrete') {
    px(g, r[2], x, y, w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const n = noise(xx, yy, s); if (n < 0.06) px(g, r[1], x + xx, y + yy); else if (n > 0.95) px(g, r[3], x + xx, y + yy); }
    for (let yy = 0; yy < h; yy += 13) { px(g, r[1], x, y + yy, w, 1); px(g, r[3], x, y + yy + 1, w, 1); }
    for (let xx = 0; xx < w; xx += 22) px(g, r[1], x + xx, y, 1, h);
  } else if (style === 'shophouse') {
    px(g, r[3], x, y, w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const n = noise(xx, yy, s); if (n < 0.05 + (yy / h) * 0.08) px(g, r[2], x + xx, y + yy); }
  } else {
    // metal: corrugated sheets with rivets and rust
    for (let xx = 0; xx < w; xx++) px(g, [r[2], r[3], r[2], r[1]][xx % 4], x + xx, y, 1, h);
    for (let yy = 0; yy < h; yy += 20) { px(g, r[0], x, y + yy, w, 1); for (let xx = 2; xx < w; xx += 6) px(g, r[4], x + xx, y + yy + 2, 1, 1); }
    for (let k = 0; k < w * h * 0.004; k++) { const rx = Math.floor(noise(k, 1, s) * w), ry = Math.floor(noise(k, 2, s) * h); px(g, '#7a3a1e', x + rx, y + ry, 1, 2 + Math.floor(noise(k, 3, s) * 6)); }
  }
  // grime: darker towards the bottom, streaks under ledges
  for (let yy = 0; yy < h; yy++) { const t = yy / h; if (t > 0.6) for (let xx = 0; xx < w; xx++) if (bayer(xx, yy) < (t - 0.6) * 0.8) px(g, r[1], x + xx, y + yy); }
  for (let k = 0; k < w / 6; k++) { const sx = x + Math.floor(noise(k, 7, s) * w), sl = 6 + Math.floor(noise(k, 8, s) * 30), sy = y + Math.floor(noise(k, 9, s) * h); g.globalAlpha = 0.25; px(g, r[0], sx, sy, 1, sl); g.globalAlpha = 1; }
}

// ---------- the shop at street level ----------
function shop(g, gl, x, y, w, kind, d, s) {
  const r = stream('shop', s), h = SHOP;
  px(g, INK, x, y, w, h); px(g, '#1a1624', x + 1, y + 1, w - 2, h - 1);
  // the lintel and the sign board
  px(g, '#2a2438', x, y, w, 9); px(g, '#3a3448', x, y, w, 1); px(g, INK, x, y + 9, w, 1);
  const word = r.pick(WORDS), col = d[r.pick(['a', 'b', 'c'])], tw = word.length * 4 - 1, tx = x + Math.floor((w - tw) / 2);
  txt(g, word, tx, y + 2, mix(col, '#ffffff', 0.45)); txt(gl, word, tx, y + 2, col);
  gl.globalAlpha = 0.25; px(gl, col, tx - 3, y, tw + 6, 9); gl.globalAlpha = 1;
  const iy = y + 10, ih = h - 10;
  if (kind === 'shutter') {
    for (let k = 0; k < ih; k += 2) { px(g, '#4a4658', x + 2, iy + k, w - 4, 1); px(g, '#34303e', x + 2, iy + k + 1, w - 4, 1); }
    // graffiti
    const gc = r.pick([d.a, d.c, '#ffffff', '#3fff8a']);
    for (let k = 0; k < 5; k++) { const gx = x + 6 + k * Math.floor((w - 16) / 5); g.globalAlpha = 0.7; px(g, gc, gx, iy + 8 + (k % 2) * 2, 5, 2); px(g, gc, gx + 1, iy + 6, 2, 8); g.globalAlpha = 1; }
    px(g, '#7a7a8a', x + w / 2 - 2, iy + ih - 3, 4, 2);
    return;
  }
  // a lit window full of things, a door
  const warm = kind === 'store' ? '#c8e4f0' : kind === 'electro' ? d.b : kind === 'bar' ? d.a : kind === 'arcade' ? d.c : '#ffcf7a';
  const dw = 10, wx = x + 3, ww = w - dw - 9;
  vgrad(g, wx, iy + 2, ww, ih - 4, [mix(warm, '#ffffff', 0.3), warm, shade(warm, -0.3)]);
  gl.globalAlpha = 0.3; px(gl, warm, wx, iy + 2, ww, ih - 4); gl.globalAlpha = 1;
  const dk = shade(warm, -0.65);
  if (kind === 'noodle') {
    // a counter, stools, steam, lanterns, cloth curtains at the top
    px(g, '#5a2a1e', wx, iy + ih - 10, ww, 3); px(g, '#7a3a24', wx, iy + ih - 10, ww, 1);
    for (let k = 4; k < ww - 4; k += 9) { px(g, dk, wx + k, iy + ih - 7, 3, 5); disc(g, wx + k + 1, iy + ih - 14, 2, dk); px(g, dk, wx + k - 1, iy + ih - 12, 5, 3); }
    for (let k = 0; k < ww; k += 7) { px(g, '#b8202a', wx + k, iy + 2, 6, 6); px(g, '#e8e0d0', wx + k + 2, iy + 4, 2, 2); }
  } else if (kind === 'electro') {
    for (let k = 2; k < ww - 6; k += 10) for (let j = 0; j < 2; j++) { px(g, '#0c0c18', wx + k, iy + 4 + j * 10, 8, 7); const c = [d.a, d.b, d.c, '#ffffff'][(k + j) % 4]; px(g, c, wx + k + 1, iy + 5 + j * 10, 6, 5); px(gl, c, wx + k + 1, iy + 5 + j * 10, 6, 5); }
  } else if (kind === 'bar') {
    px(g, dk, wx, iy + ih - 12, ww, 8); for (let k = 3; k < ww - 3; k += 4) px(g, r.pick(['#3fff8a', '#ffd23f', '#ff6a3f', '#29e6ff']), wx + k, iy + 5, 2, 5);
    for (let k = 6; k < ww - 6; k += 12) { disc(g, wx + k, iy + ih - 16, 2, dk); px(g, dk, wx + k - 2, iy + ih - 14, 5, 4); }
  } else if (kind === 'store') {
    for (let j = 0; j < 3; j++) { px(g, '#8a8aa0', wx, iy + 6 + j * 7, ww, 1); for (let k = 1; k < ww - 2; k += 3) px(g, r.pick(['#e84a4a', '#4a8ae8', '#e8c84a', '#4ae88a', '#e84ac8']), wx + k, iy + 3 + j * 7, 2, 3); }
  } else if (kind === 'arcade') {
    for (let k = 3; k < ww - 8; k += 11) { px(g, '#1a1030', wx + k, iy + 4, 9, ih - 8); px(g, d.a, wx + k + 1, iy + 6, 7, 6); px(gl, d.a, wx + k + 1, iy + 6, 7, 6); px(g, '#ff3f3f', wx + k + 2, iy + 14, 2, 1); px(g, '#3f8aff', wx + k + 5, iy + 14, 2, 1); }
  }
  // glass reflections and frame
  for (let k = 0; k < ih; k++) if (k % 9 < 2) px(g, mix(warm, '#ffffff', 0.6), wx + ww - 6 - k / 2, iy + 2 + k, 2, 1);
  px(g, '#2a2438', wx + Math.floor(ww / 2), iy + 2, 1, ih - 4);
  // the door with a light above it
  const dx = x + w - dw - 4;
  px(g, '#100c18', dx, iy + 2, dw, ih - 2); px(g, shade(warm, -0.4), dx + 2, iy + 4, dw - 4, 9); px(gl, warm, dx + 2, iy + 4, dw - 4, 9);
  px(g, '#c8a040', dx + dw - 3, iy + 16, 1, 2);
  // an awning
  if (r.chance(0.6)) { const ac = d[r.pick(['a', 'b', 'c'])], a2 = r.pick(['#e8e4f0', shade(ac, -0.5)]); for (let k = 0; k < w; k += 4) { const c = (k / 4) % 2 ? ac : a2; px(g, shade(c, -0.15), x + k, iy - 1, 4, 5); px(g, shade(c, 0.15), x + k, iy - 1, 4, 1); px(g, shade(c, -0.45), x + k, iy + 4, 4, 1); if ((k / 4) % 2) px(g, shade(c, -0.3), x + k + 1, iy + 5, 2, 1); } }
}

// a 3×5 font (the one of pixel.js) for words on boards
const FONT = { A: '010101111101101', C: '011100100100011', E: '111100110100111', G: '011100101101011', I: '111010010010111', K: '101110100110101', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010', W: '101101111111101', Y: '101101010010010', Z: '111001010100111', B: '110101110101110', D: '110101101101110', F: '111100110100100', H: '101101111101101', J: '001001001101010', L: '100100100100111', Q: '010101101110011', U: '101101101101111', V: '101101101101010', X: '101101010101101', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '010101010101010', 9: '010101011001110', ' ': '000000000000000' };
export function txt(g, s, x, y, c) { [...s].forEach((ch, i) => { const f = FONT[ch] || FONT[' ']; for (let k = 0; k < 15; k++) if (f[k] === '1') px(g, c, x + i * 4 + (k % 3), y + Math.floor(k / 3)); }); }

// ---------- a facade ----------
// o: { seed, d (district colours), wd, ht (to the roof line), style, shop }
export function facade(o) {
  const W = o.wd, H = o.ht + ROOF;
  return bake(`fac|${o.seed}|${W}|${H}|${o.style}|${o.dk}`, W + 2, H, (g, gl) => {
    const r = stream('fac', o.seed), d = o.d, x0 = 1, top = ROOF, bottom = H - SHOP;
    const base = mix(d.wall, r.pick(['#5a4a4a', '#4a4a5a', '#5a5a4a', '#6a5a50', '#4a3a3a', '#3a4a50']), 0.45);
    // body and its walls
    px(g, INK, x0 - 1, top - 1, W + 2, H - top + 1);
    wall(g, x0, top, W, bottom - top, o.style, base, o.seed);
    // ledges between floors (cornices) and the roof parapet
    const ledge = ramp(base, 5);
    for (let y = top + FLOOR; y < bottom - 4; y += FLOOR) { px(g, ledge[4], x0, y, W, 1); px(g, ledge[3], x0, y + 1, W, 1); px(g, ledge[0], x0, y + 2, W, 1); }
    px(g, INK, x0 - 2, top - 4, W + 4, 5); px(g, ledge[4], x0 - 1, top - 3, W + 2, 1); px(g, ledge[3], x0 - 1, top - 2, W + 2, 2);
    // windows by floor: two to five a floor, centred
    const n = Math.max(2, Math.floor((W - 8) / r.pick([18, 22, 26]))), ww = r.pick([10, 12, 14]), wh = r.pick([12, 14, 15]), gap = Math.floor((W - n * ww) / (n + 1));
    const litP = r.range(0.25, 0.6);
    let floor = 0;
    for (let y = top + 6; y + wh < bottom - 6; y += FLOOR, floor++) {
      for (let k = 0; k < n; k++) {
        const wx = x0 + gap + k * (ww + gap), lit = r.chance(litP);
        windowDetail(g, gl, wx, y, ww, wh, lit, d, o.seed * 31 + floor * 7 + k);
        if (r.chance(0.18)) airUnit(g, wx + (r.chance(0.5) ? 0 : ww - 12), y + wh + 4, o.seed + k);
      }
      // balconies with railings on shop-houses
      if (o.style === 'shophouse' && floor % 2 === 0) { const by = y + wh + 3, bw = W - 6; px(g, INK, x0 + 3, by, bw, 2); px(g, ledge[3], x0 + 3, by, bw, 1); for (let k = 0; k < bw; k += 3) px(g, INK, x0 + 3 + k, by - 5, 1, 5); px(g, INK, x0 + 3, by - 6, bw, 1); if (r.chance(0.6)) laundry(g, x0 + 5, by - 14, bw - 6, o.seed + floor); }
    }
    // a pipe down the side and a cable bundle
    vcyl(g, x0 + W - 5, top, 3, bottom - top, ramp('#4a4458', 4));
    for (let y = top + 10; y < bottom; y += 18) px(g, '#2a2438', x0 + W - 6, y, 5, 2);
    if (r.chance(0.6)) { const fx = x0 + 3; for (let y = top + FLOOR + 2; y < bottom - 10; y += FLOOR) { px(g, INK, fx, y, 22, 2); for (let k = 0; k < 22; k += 2) px(g, INK, fx + k, y - 5, 1, 5); px(g, INK, fx, y - 6, 22, 1); for (let s = 0; s < 14; s++) px(g, INK, fx + 4 + s, y + 2 + Math.floor(s * (FLOOR - 4) / 14), 2, 1); } }
    // the shop at street level
    shop(g, gl, x0, bottom, W, o.shop || r.pick(SHOPS), d, o.seed);
    // the roof: a water tank on legs, antennas, a dish, an air box
    const rr = r.int(0, 3);
    if (rr === 0 || rr === 3) { const tx = x0 + r.int(6, W - 30); vcyl(g, tx, 4, 18, 12, ramp('#6a4a32', 5)); for (let k = 0; k < 12; k += 3) px(g, '#3a2418', tx, 4 + k, 18, 1); px(g, INK, tx - 1, 3, 20, 1); px(g, '#3a2418', tx + 2, 16, 2, top - 18); px(g, '#3a2418', tx + 14, 16, 2, top - 18); disc(g, tx + 9, 3, 6, '#4a3424'); }
    if (rr >= 1) { const ax = x0 + r.int(4, W - 8); px(g, '#5a5a6a', ax, 0, 1, top - 2); for (let k = 2; k < 12; k += 3) px(g, '#5a5a6a', ax - 3, k, 7, 1); px(gl, '#ff2f3f', ax, 0, 1, 1); }
    if (rr === 2 || rr === 3) { const dx = x0 + r.int(10, W - 16); disc(g, dx, top - 8, 4, '#a8a8b8'); disc(g, dx + 1, top - 8, 3, '#d8d8e0'); px(g, '#5a5a6a', dx, top - 4, 1, 3); }
    { const bx = x0 + W - 18; panel(g, bx, top - 9, 12, 7, ramp('#7a7a8a', 5), { line: INK }); for (let k = 0; k < 4; k++) px(g, '#4a4a5a', bx + 2, top - 7 + k * 1.5, 8, 1); }
  });
}

// ---------- a neon sign ----------
// o: { seed, col, vertical, n (glyphs), word? }
export function sign(o) {
  const n = o.n || 4, vert = o.vertical, G = 7, W = vert ? 15 : (o.word ? o.word.length * 4 + 9 : n * 10 + 6), H = vert ? n * 10 + 8 : 15;
  return bake(`sign|${o.seed}|${o.col}|${vert}|${n}|${o.word || ''}`, W, H, (g, gl) => {
    const c = o.col, rim = mix(c, '#ffffff', 0.15);
    px(g, INK, 0, 0, W, H); px(g, '#100a1a', 1, 1, W - 2, H - 2);
    // a frame of light and bulbs around it
    px(g, shade(c, -0.35), 1, 1, W - 2, 1); px(g, shade(c, -0.35), 1, H - 2, W - 2, 1); px(g, shade(c, -0.35), 1, 1, 1, H - 2); px(g, shade(c, -0.35), W - 2, 1, 1, H - 2);
    gl.globalAlpha = 0.5; px(gl, c, 1, 1, W - 2, 1); px(gl, c, 1, H - 2, W - 2, 1); px(gl, c, 1, 1, 1, H - 2); px(gl, c, W - 2, 1, 1, H - 2); gl.globalAlpha = 1;
    if (o.word) { txt(g, o.word, 5, 5, mix(c, '#ffffff', 0.55)); txt(gl, o.word, 5, 5, c); return; }
    for (let k = 0; k < n; k++) { const gx = vert ? 4 : 4 + k * 10, gy = vert ? 4 + k * 10 : 4; glyph(g, gx, gy, o.seed * 13 + k, mix(c, '#ffffff', 0.55), G); glyph(gl, gx, gy, o.seed * 13 + k, rim, G); }
  });
}

// ---------- a tower of the middle distance ----------
// o: { seed, d, wd, ht, crown }
export function tower(o) {
  return bake(`tow|${o.seed}|${o.wd}|${o.ht}|${o.dk}`, o.wd + 2, o.ht + 30, (g, gl) => {
    const r = stream('tow', o.seed), d = o.d, W = o.wd, top = 30, H = o.ht;
    const base = mix(d.wall, '#141428', 0.45), R = ramp(base, 5);
    px(g, INK, 0, top - 1, W + 2, H + 1); px(g, R[1], 1, top, W, H);
    px(g, R[2], 1, top, Math.floor(W * 0.3), H); px(g, R[3], 1, top, 1, H);
    // window grid: rows of lit and dark cells, whole floors on or off
    const cw = r.pick([2, 3]), ch = 2, gx = cw + 1, gy = r.pick([3, 4]);
    const warm = r.pick(['#ffd98a', '#ffcf7a', '#a8e0ff', d.b]);
    for (let y = top + 4; y < top + H - 3; y += gy) {
      const floorOn = r.chance(0.65);
      for (let x = 3; x < W - 2; x += gx) { const on = floorOn ? r.chance(0.7) : r.chance(0.08); px(g, on ? mix(warm, R[1], 0.25) : R[0], x, y, cw, ch); if (on) { gl.globalAlpha = 0.55; px(gl, warm, x, y, cw, ch); gl.globalAlpha = 1; } }
    }
    // neon edges up the corners and a band at the top
    const nc = d[r.pick(['a', 'b', 'c'])];
    if (r.chance(0.6)) { px(g, mix(nc, '#ffffff', 0.3), 1, top, 1, H); px(gl, nc, 1, top, 1, H); px(g, mix(nc, '#ffffff', 0.3), W, top, 1, H); px(gl, nc, W, top, 1, H); }
    px(g, R[3], 1, top, W, 2); px(g, mix(nc, '#ffffff', 0.3), 1, top + 3, W, 1); px(gl, nc, 1, top + 3, W, 1);
    // the crown: a stepped top, a pyramid of light, or a spire with a beacon
    const cr = o.crown ?? r.int(0, 3), mid = Math.floor(W / 2) + 1;
    if (cr === 0) { px(g, INK, mid - Math.floor(W / 3) - 1, top - 9, Math.floor(W / 3) * 2 + 2, 9); px(g, R[2], mid - Math.floor(W / 3), top - 8, Math.floor(W / 3) * 2, 8); px(g, INK, mid - Math.floor(W / 6) - 1, top - 16, Math.floor(W / 6) * 2 + 2, 8); px(g, R[2], mid - Math.floor(W / 6), top - 15, Math.floor(W / 6) * 2, 8); }
    else if (cr === 1) { for (let k = 0; k < 22; k++) { const hw = Math.round((W / 2) * (k / 22)); px(g, k % 3 ? R[2] : mix(nc, R[2], 0.4), mid - hw, top - 22 + k, hw * 2, 1); gl.globalAlpha = 0.5; px(gl, nc, mid - hw, top - 22 + k, 1, 1); px(gl, nc, mid + hw - 1, top - 22 + k, 1, 1); gl.globalAlpha = 1; } }
    else if (cr === 2) { px(g, R[2], mid - 1, 0, 2, top); px(g, R[3], mid - 1, 0, 1, top); for (let k = 6; k < top; k += 6) px(g, R[2], mid - 3, k, 6, 1); px(gl, '#ff2f3f', mid - 1, 0, 2, 2); }
    // a vertical banner of glyphs on some towers
    if (r.chance(0.45)) { const bx = r.chance(0.5) ? 3 : W - 9, by = top + r.int(10, 30), n = r.int(4, 8), bc = d[r.pick(['a', 'b', 'c'])]; px(g, INK, bx - 1, by - 1, 9, n * 8 + 3); px(g, '#100a1a', bx, by, 7, n * 8 + 1); for (let k = 0; k < n; k++) { glyph(g, bx + 1, by + 1 + k * 8, o.seed + k, mix(bc, '#ffffff', 0.5), 5); glyph(gl, bx + 1, by + 1 + k * 8, o.seed + k, bc, 5); } }
  });
}

// ---------- a strip of far towers ----------
// o: { seed, d, w } → a picture w wide and 150 high: silhouettes with specks of windows (the haze is laid by the layer)
export function skyline(o) {
  const H = 150;
  return bake(`sky|${o.seed}|${o.w}|${o.dk}`, o.w, H, (g, gl) => {
    const r = stream('skyl', o.seed), d = o.d, c = mix(d.haze, '#000000', 0.35), lit = shade(c, 0.1);
    let x = 0;
    while (x < o.w) {
      const w = r.int(8, 22), top = r.chance(0.15) ? r.int(40, 80) : r.int(80, 132);
      px(g, c, x, top, w, H - top); px(g, lit, x, top, 1, H - top);
      if (r.chance(0.3)) px(g, c, x + Math.floor(w / 2) - 1, top - r.int(6, 18), 2, 18);
      if (r.chance(0.25)) for (let k = 0; k < 6; k++) { const hw = Math.round((w / 2) * (k / 6)); px(g, c, x + Math.floor(w / 2) - hw, top - 6 + k, hw * 2, 1); }
      for (let y = top + 3; y < H; y += 3) for (let k = 1; k < w - 1; k += 2) if (noise(x + k, y, o.seed) < 0.12) { const wc = noise(x + k, y, o.seed + 1) < 0.85 ? '#ffd98a' : d.b; px(g, mix(wc, c, 0.5), x + k, y, 1, 1); gl.globalAlpha = 0.45; px(gl, wc, x + k, y, 1, 1); gl.globalAlpha = 1; }
      if (r.chance(0.15)) { const nc = d[r.pick(['a', 'b'])]; px(gl, nc, x, top, 1, H - top); }
      x += w + r.int(-3, 2);
    }
  });
}

// contact sheet for checking
export function buildingSheet() {
  const D = { a: '#ff2fa8', b: '#29e6ff', c: '#ffd23f', haze: '#40205e', wall: '#3a2a4a' };
  const c = new OffscreenCanvas(900, 260), g = c.getContext('2d');
  g.fillStyle = '#1a1030'; g.fillRect(0, 0, 900, 260);
  ['brick', 'concrete', 'shophouse', 'metal'].forEach((st, k) => { const f = facade({ seed: 11 + k, d: D, dk: 'm', wd: 104 + k * 8, ht: 190 - k * 20, style: st }); g.drawImage(f.c, 6 + k * 128, 260 - f.h); });
  const t = tower({ seed: 3, d: D, dk: 'm', wd: 40, ht: 150 }); g.drawImage(t.c, 540, 260 - t.h);
  const t2 = tower({ seed: 8, d: D, dk: 'm', wd: 30, ht: 120, crown: 1 }); g.drawImage(t2.c, 590, 260 - t2.h);
  const s = skyline({ seed: 1, d: D, dk: 'm', w: 220 }); g.drawImage(s.c, 640, 260 - 150);
  [sign({ seed: 2, col: D.a, vertical: true, n: 5 }), sign({ seed: 5, col: D.b, vertical: false, n: 3 }), sign({ seed: 6, col: D.c, word: 'HOTEL' })].forEach((b, k) => g.drawImage(b.c, 640 + k * 50, 10));
  return c;
}
