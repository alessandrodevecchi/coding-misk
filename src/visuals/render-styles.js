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
const lum8 = (d, i) => (77 * d[i] + 150 * d[i + 1] + 29 * d[i + 2]) >> 8;
// 1-bit: rgba pixels w×h → two colours with an ordered dither (in place when out is d)
export function bitPixels(d, w, h, { gain = 1.5, black = 0.1, ink, paper }, out = d) {
  const L = liftTable(black, gain);
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

// the work sizes of a frame of cw×ch device pixels (D3), light: the slow-device form
export function passSizes(render, cw, ch, light = false) {
  if (render === 'bit') { const s = light ? 6 : 3; return { w: Math.max(1, Math.floor(cw / s)), h: Math.max(1, Math.floor(ch / s)) }; }
  if (render === 'led') { const rows = light ? 40 : 80, p = ch / rows; return { w: Math.max(1, Math.floor(cw / p)), h: rows, pitch: p }; }
  if (render === 'ascii') { const rows = light ? 20 : 40, cellH = ch / rows, cellW = cellH / 1.9; return { w: Math.max(1, Math.floor(cw / cellW)), h: rows, cellW, cellH }; }
  if (render === 'terminal') return { rows: light ? 30 : 45 };
  return null;
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
// time it took in ms. o: { look, theme, W, H (logical size of g), dpr (g's scale), light ('auto' | 'on' | 'off'),
// info() → the Terminal chrome's information, fixed (no automatic light form: the fast video) }
export function createRenderer() {
  const mk = () => document.createElement('canvas');
  // (the canvas read back is on the CPU from the first frame: a canvas Chrome moves there after a few reads would
  // smooth the first frames differently, and the same frame must give the same output)
  const gs = mk(), gsx = gs.getContext('2d'), sm = mk(), smx = sm.getContext('2d', { willReadFrequently: true }), ou = mk(), oux = ou.getContext('2d'), bl = mk(), blx = bl.getContext('2d');
  let crt = null, crtKey = '', dots = null, dotsKey = '', atlas = null, atlasKey = '';
  let slow = 0, autoLight = false;
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
  function crtMask(w, h) {
    const key = `${w}x${h}`;
    if (crtKey === key) return crt;
    crt = crt || mk(); size(crt, w, h);
    const m = crt.getContext('2d');
    m.globalCompositeOperation = 'source-over';
    const cols = ['rgb(255,120,120)', 'rgb(120,255,120)', 'rgb(130,130,255)'];
    for (let x = 0; x < w; x++) { m.fillStyle = cols[x % 3]; m.fillRect(x, 0, 1, h); }
    m.fillStyle = 'rgba(0,0,0,.32)';
    for (let y = 0; y < h; y += 3) m.fillRect(0, y, w, 1);
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
  // ASCII: the ramp's glyphs in white, one cell each, made once per cell size
  function glyphAtlas(cellW, cellH) {
    const aw = Math.max(1, Math.round(cellW)), ah = Math.max(1, Math.round(cellH)), key = `${aw}x${ah}`;
    if (atlasKey === key) return atlas;
    atlas = atlas || mk(); size(atlas, aw * ASCII_RAMP.length, ah);
    const a = atlas.getContext('2d');
    a.clearRect(0, 0, atlas.width, ah);
    a.fillStyle = '#fff'; a.textBaseline = 'middle'; a.textAlign = 'center';
    a.font = `600 ${Math.max(4, Math.min(ah * 0.92, aw / 0.6)).toFixed(1)}px "JetBrains Mono", monospace`;
    for (let i = 1; i < ASCII_RAMP.length; i++) a.fillText(ASCII_RAMP[i], i * aw + aw / 2, ah / 2 + 0.5);
    atlasKey = key;
    return atlas;
  }

  function apply(g, c, render, o) {
    if (!render || render === 'normal') return 0;
    const t0 = performance.now(), theme = o.theme === 'hw' ? 'hw' : 'neon';
    const light = o.light === 'on' || (o.light !== 'off' && !o.fixed && autoLight);
    const cw = c.width, ch = c.height, gain = gainOf(o.look);
    if (render === 'bit') {
      const S = passSizes('bit', cw, ch, light), img = grab(c, S.w, S.h);
      bitPixels(img.data, S.w, S.h, { gain, ...BIT_COLOURS[theme] });
      back(g, c, img);
    } else if (render === 'led') {
      const S = passSizes('led', cw, ch, light), img = grab(c, S.w, S.h);
      ledPixels(img.data, S.w, S.h);
      const dw = S.w * S.pitch, dh = S.h * S.pitch;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch); g.restore();
      back(g, c, img, 0, 0, dw, dh);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.drawImage(dotMask(cw, ch, S.w, S.h, S.pitch), 0, 0); g.restore();
    } else if (render === 'crt') {
      const bw = Math.max(1, Math.round(cw / 8)), bh = Math.max(1, Math.round(ch / 8));
      size(bl, bw, bh); blx.imageSmoothingEnabled = true; blx.imageSmoothingQuality = 'medium'; blx.drawImage(c, 0, 0, bw, bh);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.4; g.drawImage(bl, 0, 0, cw, ch);
      g.globalAlpha = 1; g.globalCompositeOperation = 'multiply'; g.drawImage(crtMask(cw, ch), 0, 0);
      g.restore();
    } else if (render === 'ascii') {
      const S = passSizes('ascii', cw, ch, light), img = grab(c, S.w, S.h), { glyphs } = asciiCells(img.data, S.w, S.h, { gain }, undefined, img.data);
      const A = glyphAtlas(S.cellW, S.cellH), aw = A.width / ASCII_RAMP.length, ah = A.height, ox = Math.floor((cw - S.w * S.cellW) / 2);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
      for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const k = glyphs[y * S.w + x]; if (k) g.drawImage(A, k * aw, 0, aw, ah, Math.round(ox + x * S.cellW), Math.round(y * S.cellH), aw, ah); }
      g.restore();
      back(g, c, img, ox, 0, S.w * S.cellW, S.h * S.cellH, 'multiply');
    } else if (render === 'terminal') {
      const T = termPalette(theme), G = gridOf(o.W, o.H, passSizes('terminal', cw, ch, light).rows), k = o.dpr || 1;
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
  return { apply, get light() { return autoLight; }, reset() { slow = 0; autoLight = false; } };
}
