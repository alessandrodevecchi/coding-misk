// Render styles (widget-render-styles, #79): a pass over the finished frame of any look, after the look and its flash,
// on the canvas the look was drawn on (the stage, or a video's frame). 1-bit (ordered Bayer dither), CRT (bloom, grille,
// scanlines, vignette), LED (a dot matrix), ASCII (glyphs from the cells' light) and Terminal (the scene as half-block
// truecolour cells inside a text interface). Normal draws nothing. The pixel rules are pure functions of the frame (no
// state between frames, no random numbers), checked in Node by tools/check-render-styles.mjs; createRenderer() holds
// only cached canvases and the slow-device counter.
import { RENDER_GAIN } from '../music.js';
import { termPalette, gridOf, termGrid, brailleWave } from './term-grid.js';
import { spectrumOf } from './widget-painters.js';
import { layerFree } from './widget-layer.js';
import { ledCells, asciiCells as asciiGrid, bitCells, termRows, crtSpacing, densityOf } from './density.js';

// D3: 8×8 Bayer thresholds in (0, 1), row by row
export const BAYER8 = (() => {
  let b = [[0, 2], [3, 1]];
  for (let n = 2; n < 8; n *= 2) { const nb = []; for (let y = 0; y < n * 2; y++) { nb.push([]); for (let x = 0; x < n * 2; x++) nb[y].push(4 * b[y % n][x % n] + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]); } b = nb; }
  return Float32Array.from(b.flat(), v => (v + 0.5) / 64);
})();
const lumOf = (d, i) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
// a light after the black point and the gain of the look (0..1)
const lift = (l, black, gain, gamma = 0.9) => Math.min(1, Math.pow(Math.max(0, l - black) / (1 - black), gamma) * gain);
export const gainOf = look => RENDER_GAIN[look] ?? RENDER_GAIN.default;

// D6: the two colours of 1-bit per theme (neon paper white on near black, hardware the amber LCD)
export const BIT_COLOURS = Object.freeze({ neon: { ink: [240, 236, 222], paper: [12, 10, 16] }, hw: { ink: [255, 179, 71], paper: [27, 19, 6] } });

// the lifted light of each 8-bit luminance, per black point, gain and gamma (a table, so a pass costs one lookup a pixel)
const lifts = new Map();
export function liftTable(black, gain, gamma = 0.9) {
  const key = `${black}|${gain}|${gamma}`;
  let T = lifts.get(key);
  if (!T) { T = new Float32Array(256); for (let i = 0; i < 256; i++) T[i] = lift(i / 255, black, gain, gamma); lifts.set(key, T); if (lifts.size > 64) lifts.delete(lifts.keys().next().value); }
  return T;
}
const LITTLE = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
const lum8 = (d, i) => (77 * d[i] + 150 * d[i + 1] + 29 * d[i + 2]) >> 8;
// 1-bit: rgba pixels w×h → two colours with an ordered dither (in place when out is d)
export function bitPixels(d, w, h, { gain = 1.5, black = 0.1, ink, paper }, out = d) {
  const L = liftTable(black, gain);
  // (in place on a little-endian buffer: one 32-bit write a pixel and the threshold per light read once a row, about
  // twice as fast for the larger work pictures of denser-renders D4; the same colours as the byte path)
  if (out === d && d.byteOffset % 4 === 0 && LITTLE) {
    const u = new Uint32Array(d.buffer, d.byteOffset, w * h), pack = c => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0, I = pack(ink), P = pack(paper);
    for (let y = 0, i = 0, p = 0; y < h; y++) {
      const row = (y & 7) << 3;
      for (let x = 0; x < w; x++, i += 4, p++) u[p] = L[(77 * d[i] + 150 * d[i + 1] + 29 * d[i + 2]) >> 8] > BAYER8[row | (x & 7)] ? I : P;
    }
    return out;
  }
  for (let y = 0, i = 0; y < h; y++) {
    const row = (y & 7) << 3;
    for (let x = 0; x < w; x++, i += 4) {
      const c = L[lum8(d, i)] > BAYER8[row | (x & 7)] ? ink : paper;
      out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255;
    }
  }
  return out;
}
// LED: each pixel one dot, 5 levels of light, the colour boosted, unlit dots faint
export function ledPixels(d, w, h, { boost = 1.6, faint = [22, 20, 28], ground = [5, 3, 7] } = {}, out = d) {
  for (let i = 0; i < w * h * 4; i += 4) {
    const q = Math.round(Math.min(1, lumOf(d, i) * 1.8) * 4) / 4;
    if (q < 0.05) { out[i] = faint[0]; out[i + 1] = faint[1]; out[i + 2] = faint[2]; }
    else { const a = 0.35 + 0.65 * q; for (let k = 0; k < 3; k++) out[i + k] = Math.min(255, d[i + k] * boost) * a + ground[k] * (1 - a); }
    out[i + 3] = 255;
  }
  return out;
}
// ASCII: one glyph of the ramp per cell from its light, the cell's colour at full brightness
export const ASCII_RAMP = ' .:-=+*#%@';
export function asciiCells(d, cols, rows, { gain = 1.5, black = 0.1 } = {}, glyphs = new Uint8Array(cols * rows), rgb = new Uint8ClampedArray(cols * rows * 4)) {
  const n = ASCII_RAMP.length;
  for (let k = 0; k < cols * rows; k++) {
    const i = k * 4, g = Math.min(n - 1, Math.floor(lift(lumOf(d, i), black, gain, 0.8) * n));
    glyphs[k] = g;
    const m = Math.max(d[i], d[i + 1], d[i + 2], 1), s = g ? 255 / m : 0;
    rgb[i] = d[i] * s; rgb[i + 1] = d[i + 1] * s; rgb[i + 2] = d[i + 2] * s; rgb[i + 3] = 255;
  }
  return { glyphs, rgb };
}
// Terminal (over a scene): stepped truecolour, 8 levels per channel; with a ramp (hardware), the light on the ramp
export function termPixels(d, w, h, ramp = null, out = d) {
  for (let i = 0; i < w * h * 4; i += 4) {
    if (ramp) { const l = lumOf(d, i), c = ramp[Math.min(ramp.length - 1, Math.round(Math.min(1, Math.pow(l, 0.8) * 1.4) * (ramp.length - 1)))]; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; }
    else for (let k = 0; k < 3; k++) out[i + k] = Math.round((d[i + k] / 255) * 7) * (255 / 7);
    out[i + 3] = 255;
  }
  return out;
}

// the work sizes of a frame of cw×ch device pixels (denser-renders D1 to D8): o { dpr (device pixels per logical
// pixel, 1 by default), density ('coarse' | 'normal' | 'fine'), light (the slow-device form) }; a boolean o is the
// light form at ratio 1 (the call before denser-renders). The rules are in density.js and take the picture's size only
export function passSizes(render, cw, ch, o = {}) {
  const { dpr = 1, density = 'normal', light = false } = typeof o === 'boolean' ? { light: o } : o || {}, W = cw / dpr, H = ch / dpr;
  if (render === 'bit') return bitCells(W, H, dpr, density, light);
  if (render === 'led') { const L = ledCells(W, H, dpr, density, light); return { w: L.cols, h: L.rows, pitch: L.pitch }; }
  if (render === 'ascii') { const A = asciiGrid(W, H, dpr, density, light); return { w: A.cols, h: A.rows, cellW: A.cellW, cellH: A.cellH }; }
  if (render === 'terminal') return { rows: termRows(W, H, density, light) };
  if (render === 'crt') return crtSpacing(dpr);
  return null;
}

// ASCII a row at a time (D3): each row one fillText of its glyphs in white, the font sized so its advance (0.6 em) is
// the cell width; letterSpacing corrects a font whose advance is not exactly that (fit: the measured offset per glyph)
export function drawAsciiRows(g, glyphs, cols, rows, cellW, cellH, ox = 0, fit = 0) {
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.font = `600 ${Math.max(4, cellW / 0.6).toFixed(2)}px "JetBrains Mono", monospace`;
  if (fit) g.letterSpacing = `${fit.toFixed(3)}px`;
  const codes = new Uint16Array(cols), ramp = [...ASCII_RAMP].map(c => c.charCodeAt(0));
  for (let y = 0; y < rows; y++) {
    let any = false;
    for (let x = 0; x < cols; x++) { const k = glyphs[y * cols + x]; codes[x] = ramp[k]; if (k) any = true; }
    if (any) g.fillText(String.fromCharCode.apply(null, codes), ox, (y + 0.5) * cellH + 0.5);
  }
  if (fit) g.letterSpacing = '0px';
}

// The chrome of the Terminal pass (take C): a tab bar, a braille scope of the song's wave, an eighth-block spectrum and
// a status bar, on the grid G of a W×H frame. info: { lookName, title, section, bar, bars, bpm, playing, renderName, wave }
export function drawTermChrome(g, G, T, info) {
  const t = termGrid(g, G, T), { cols, rows } = G, last = rows - 1;
  // the tab bar, its tabs in the middle (the stage's readout and buttons sit in the corners)
  t.bg(0, 0, cols, 1, T.bg2);
  const tab = ` ${info.stageWord || 'stage'} · ${String(info.lookName || '').toLowerCase()} `, code = ` ${info.codeWord || 'code'} `, tx = Math.max(1, Math.floor((cols - [...tab].length - code.length - 1) / 2));
  t.put(tx, 0, tab, T.fg, { bg: T.sel, bold: true });
  t.put(tx + 1 + [...tab].length, 0, code, T.dim);
  // the two panes over the scene, when there is room for them
  if (cols >= 60 && rows >= 20) {
    const ph = Math.max(5, Math.round(rows * 0.2)), pw = Math.max(18, Math.round(cols * 0.3)), py = last - 1 - ph;
    const wave = info.wave;
    let peak = 0; if (wave) for (let i = 0; i < wave.length; i++) peak = Math.max(peak, Math.abs(wave[i]));
    // (code-over-visual D7: with the code drawn over the stage, only the pane on the side away from it)
    const free = layerFree(), left = !free || free === 'left', right = !free || free === 'right';
    if (left) {
      t.bg(2, py, pw, ph, T.bg); t.box(2, py, pw, ph, T.faint, `${info.scopeWord || 'scope'} ⠿`, { titleCol: T.blue });
      t.braille(4, py + 1, pw - 4, ph - 2, brailleWave(pw - 4, ph - 2, peak > 1e-4 ? wave : null, Math.min(8, 0.42 / Math.max(peak, 0.02))), T.blue);
    }
    const sw = Math.max(16, Math.round(cols * 0.26)), sx = cols - 2 - sw;
    if (right && sx > 2 + pw + 2) {
      t.bg(sx, py, sw, ph, T.bg); t.box(sx, py, sw, ph, T.faint, `${info.spectrumWord || 'spectrum'} ▇`, { titleCol: T.green });
      const bw = sw - 4, vals = new Array(bw).fill(0);
      if (wave && peak > 1e-4) {
        const m = spectrumOf(wave.length >= 128 ? wave.subarray(wave.length - 128) : wave), n = m.length;
        for (let i = 0; i < bw; i++) { const k = Math.max(0, Math.min(n - 1, Math.floor(Math.pow(n, i / bw)) - 1)); vals[i] = Math.max(0, Math.min(1, (m[k] + 70) / 60)); }
      }
      t.bars(sx + 2, py + 1, bw, ph - 2, vals, f => (f < 0.5 ? T.green : f < 0.8 ? T.yellow : T.red));
    }
  }
  // status bar
  t.bg(0, last, cols, 1, T.bg2);
  const mode = info.playing ? ' NORMAL ' : ' PAUSED ';
  t.put(1, last, mode, T.bg, { bg: info.playing ? T.green : T.dim, bold: true });
  let x = 2 + mode.length;
  if (info.title) { const s = String(info.title).slice(0, Math.max(4, Math.floor(cols * 0.3))); t.put(x, last, s, T.fg); x += s.length + 1; }
  if (info.section) { const s = ` ${String(info.section).slice(0, 18)} `; t.put(x, last, s, T.bg, { bg: T.magenta, bold: true }); x += s.length + 1; }
  if (Number.isFinite(info.bar)) t.put(x, last, `bar ${info.bar.toFixed(1)}${info.bars ? `/${info.bars}` : ''}`, T.dim);
  const rn = String(info.renderName || '').toLowerCase(), bpm = info.bpm ? `${info.bpm} bpm` : '';
  if (bpm) t.put(cols - 2 - bpm.length, last, bpm, T.yellow);
  if (rn && cols > 70) t.put(cols - 4 - bpm.length - rn.length, last, rn, T.dim);
}

// The passes on a canvas. apply(g, c, render, o) draws the pass over the frame on c (device pixels) and returns the
// time it took in ms. o: { look, theme, W, H (logical size of g), dpr (g's scale), density ('coarse' | 'normal' | 'fine'), light ('auto' | 'on' | 'off'),
// info() → the Terminal chrome's information, fixed (no automatic light form: the fast video) }
export function createRenderer() {
  const mk = () => document.createElement('canvas');
  // (the canvas read back is on the CPU from the first frame: a canvas Chrome moves there after a few reads would
  // smooth the first frames differently, and the same frame must give the same output)
  const gs = mk(), gsx = gs.getContext('2d'), sm = mk(), smx = sm.getContext('2d', { willReadFrequently: true }), ou = mk(), oux = ou.getContext('2d'), bl = mk(), blx = bl.getContext('2d');
  let crt = null, crtKey = '', dots = null, dotsKey = '';
  // the automatic light form, and what it was switched on for (a new render, look or density clears it, D6)
  let slow = 0, autoLight = false, lightFor = '', last = null;
  const size = (cv, w, h) => { if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } };
  // the frame read at the work size (the whole canvas, or a part of it)
  // (scaled down on the GPU first, so only the small picture is read back; the frame's own canvas is never read back,
  // which would move it to the CPU halfway through a video)
  function grab(c, w, h) {
    size(gs, w, h); size(sm, w, h);
    gsx.imageSmoothingEnabled = true; gsx.imageSmoothingQuality = 'low';
    gsx.drawImage(c, 0, 0, c.width, c.height, 0, 0, w, h);
    smx.drawImage(gs, 0, 0);
    return smx.getImageData(0, 0, w, h);
  }
  // pixels back over the canvas without smoothing, into the device rectangle given (the whole canvas by default)
  function back(g, c, img, dx = 0, dy = 0, dw = c.width, dh = c.height, op = 'source-over') {
    size(ou, img.width, img.height); oux.putImageData(img, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = op; g.imageSmoothingEnabled = false;
    g.drawImage(ou, 0, 0, img.width, img.height, dx, dy, dw, dh);
    g.restore();
  }
  // CRT: the grille, scanlines and vignette as one mask, made once per size
  // (D6: a grille column and a scanline period from the ratio, so ratio 1, 2 and a video show the same spacing; the
  // lines' strength keeps today's average darkening, so the look stays)
  function crtMask(w, h, dpr = 1) {
    const { col, scan } = crtSpacing(dpr), key = `${w}x${h}/${col}/${scan}`;
    if (crtKey === key) return crt;
    crt = crt || mk(); size(crt, w, h);
    const m = crt.getContext('2d');
    m.globalCompositeOperation = 'source-over';
    const cols = ['rgb(255,120,120)', 'rgb(120,255,120)', 'rgb(130,130,255)'];
    for (let x = 0, k = 0; x < w; x += col, k++) { m.fillStyle = cols[k % 3]; m.fillRect(x, 0, col, h); }
    const thick = Math.max(1, Math.round(scan / 3));
    m.fillStyle = `rgba(0,0,0,${Math.min(0.6, (0.32 * scan) / (3 * thick)).toFixed(3)})`;
    for (let y = 0; y < h; y += scan) m.fillRect(0, y, w, thick);
    const r = m.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.6)');
    m.fillStyle = r; m.fillRect(0, 0, w, h);
    crtKey = key;
    return crt;
  }
  // LED: round dots on black, one per cell, made once per size and pitch
  function dotMask(w, h, cols, rows, pitch) {
    const key = `${w}x${h}/${cols}x${rows}`;
    if (dotsKey === key) return dots;
    dots = dots || mk(); size(dots, w, h);
    const m = dots.getContext('2d');
    m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
    m.fillStyle = '#fff'; m.beginPath();
    const r = pitch * 0.38;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const px = (x + 0.5) * pitch, py = (y + 0.5) * pitch; m.moveTo(px + r, py); m.arc(px, py, r, 0, Math.PI * 2); }
    m.fill();
    dotsKey = key;
    return dots;
  }
  // ASCII: the letter spacing that makes a row of the font exactly cols × cellW wide, measured once per cell width
  let fitKey = '', fitPx = 0;
  function asciiFit(g, cellW) {
    const key = cellW.toFixed(3);
    if (fitKey === key) return fitPx;
    g.save(); g.font = `600 ${Math.max(4, cellW / 0.6).toFixed(2)}px "JetBrains Mono", monospace`;
    const n = 64, w = g.measureText('@'.repeat(n)).width; g.restore();
    fitPx = Math.abs(w - n * cellW) > 0.5 ? (n * cellW - w) / n : 0; fitKey = key;
    return fitPx;
  }

  function apply(g, c, render, o) {
    if (!render || render === 'normal') return 0;
    const t0 = performance.now(), theme = o.theme === 'hw' ? 'hw' : 'neon';
    const density = densityOf(o.density), dpr = o.dpr || 1;
    if (!o.fixed) { const k = `${render}|${o.look}|${density}`; if (k !== lightFor) { lightFor = k; slow = 0; autoLight = false; } }
    const light = o.light === 'on' || (o.light !== 'off' && !o.fixed && autoLight);
    const cw = c.width, ch = c.height, gain = gainOf(o.look), so = { dpr, density, light };
    if (render === 'bit') {
      const S = passSizes('bit', cw, ch, so), img = grab(c, S.w, S.h);
      last = { render, cellW: cw / S.w, cellH: ch / S.h, rows: S.h, cols: S.w, light };
      bitPixels(img.data, S.w, S.h, { gain, ...BIT_COLOURS[theme] });
      back(g, c, img);
    } else if (render === 'led') {
      const S = passSizes('led', cw, ch, so), img = grab(c, S.w, S.h);
      last = { render, cellW: S.pitch, cellH: S.pitch, rows: S.h, cols: S.w, light };
      ledPixels(img.data, S.w, S.h);
      const dw = S.w * S.pitch, dh = S.h * S.pitch;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch); g.restore();
      back(g, c, img, 0, 0, dw, dh);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.drawImage(dotMask(cw, ch, S.w, S.h, S.pitch), 0, 0); g.restore();
    } else if (render === 'crt') {
      const P = crtSpacing(dpr);
      last = { render, cellW: P.col * 3, cellH: P.scan, rows: Math.ceil(ch / P.scan), cols: Math.ceil(cw / (P.col * 3)), light: false, crt: true };
      const bw = Math.max(1, Math.round(cw / 8)), bh = Math.max(1, Math.round(ch / 8));
      size(bl, bw, bh); blx.imageSmoothingEnabled = true; blx.imageSmoothingQuality = 'medium'; blx.drawImage(c, 0, 0, bw, bh);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.4; g.drawImage(bl, 0, 0, cw, ch);
      g.globalAlpha = 1; g.globalCompositeOperation = 'multiply'; g.drawImage(crtMask(cw, ch, dpr), 0, 0);
      g.restore();
    } else if (render === 'ascii') {
      const S = passSizes('ascii', cw, ch, so), img = grab(c, S.w, S.h), { glyphs } = asciiCells(img.data, S.w, S.h, { gain }, undefined, img.data);
      const ox = Math.floor((cw - S.w * S.cellW) / 2);
      last = { render, cellW: S.cellW, cellH: S.cellH, rows: S.h, cols: S.w, light };
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
      drawAsciiRows(g, glyphs, S.w, S.h, S.cellW, S.cellH, ox, asciiFit(g, S.cellW));
      g.restore();
      back(g, c, img, ox, 0, S.w * S.cellW, S.h * S.cellH, 'multiply');
    } else if (render === 'terminal') {
      const T = termPalette(theme), G = gridOf(o.W, o.H, passSizes('terminal', cw, ch, so).rows), k = dpr;
      last = { render, cellW: G.cw * k, cellH: G.ch * k, rows: G.rows, cols: G.cols, light };
      // the scene between the tab bar and the status bar, two pixels per cell (half blocks)
      const pw = G.cols, ph = (G.rows - 2) * 2, img = grab(c, pw, ph);
      termPixels(img.data, pw, ph, T.ramp);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = T.bg; g.fillRect(0, 0, cw, ch); g.restore();
      back(g, c, img, G.x0 * k, G.ch * k, G.cols * G.cw * k, (G.rows - 2) * G.ch * k);
      drawTermChrome(g, G, T, o.info ? o.info() : {});
    }
    const ms = performance.now() - t0;
    // D8: automatic light form after 30 frames in a row over 8 ms (never in the fast video)
    if (!o.fixed && o.light !== 'on' && o.light !== 'off') { slow = ms > 8 ? slow + 1 : 0; if (slow >= 30) autoLight = true; }
    return ms;
  }
  // last: the sizes of the last pass in device pixels (for the light form's mark, the layer's grid and the measurements)
  return { apply, get light() { return autoLight; }, get last() { return last; }, reset() { slow = 0; autoLight = false; } };
}
