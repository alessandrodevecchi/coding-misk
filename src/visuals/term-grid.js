// The text interface of the Terminal render and the "Claude" look (widget-render-styles D3, D4, D6, D10): a grid of
// character cells on a 2D context, a truecolour palette of named colours per theme, rounded panels with titles, braille
// dots, eighth blocks, half blocks and meters. Pure: no clock, no random numbers, so the same data gives the same
// picture (checked in Node with a recording context, tools/check-render-styles.mjs).

const FONT = '"JetBrains Mono", monospace';

// D6: one palette per theme. ramp: the amber steps the scene of a non-widget look is mapped to (hardware only)
export const TERM_PALETTES = Object.freeze({
  neon: Object.freeze({ name: 'neon', bg: '#0d0b14', bg2: '#15121f', fg: '#e4e0f0', dim: '#6f6888', faint: '#2c2740', sel: '#2a2440', red: '#ff5c7a', green: '#5af78e', yellow: '#f3f99d', blue: '#57c7ff', magenta: '#ff6ac1', cyan: '#9aedfe', orange: '#ffb86c', ramp: null }),
  hw: Object.freeze({ name: 'hw', bg: '#120e08', bg2: '#1b150c', fg: '#f2e2c4', dim: '#857256', faint: '#33291a', sel: '#2e2414', red: '#ff6b57', green: '#a6d46a', yellow: '#ffe08a', blue: '#7fc4d6', magenta: '#e89aa8', cyan: '#9fdcc8', orange: '#ff9a3d',
    ramp: Object.freeze([[18, 14, 8], [60, 38, 12], [130, 80, 20], [210, 130, 40], [255, 179, 71], [255, 226, 168]]) }),
});
export const termPalette = theme => TERM_PALETTES[theme === 'hw' ? 'hw' : 'neon'];

// the named colour of each stage instrument; a name the map does not know gets a stable pick
const INST = { kick: 'red', snare: 'cyan', perc: 'yellow', hats: 'yellow', beat: 'red', drums: 'red', bass: 'blue', guitar: 'orange', arp: 'green', pad: 'cyan', texture: 'cyan', hook: 'magenta', lead: 'magenta', fx: 'orange', riser: 'orange', voice: 'fg' };
const NAMED = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'orange'];
export function termColour(T, inst) {
  if (INST[inst]) return T[INST[inst]];
  let h = 0; for (const ch of String(inst)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return T[NAMED[h % NAMED.length]];
}

// The grid of a W×H box: rows of cells twice as tall as wide (a terminal's cell), the columns that fit, centred.
export function gridOf(W, H, rows) {
  const ch = H / rows, cw = ch / 2, cols = Math.max(8, Math.floor(W / cw));
  return { cols, rows, cw, ch, x0: (W - cols * cw) / 2, y0: 0 };
}

// braille dots of a cell: [row][column] → bit (Unicode's dot order)
const DOT = [[0x1, 0x8], [0x2, 0x10], [0x4, 0x20], [0x40, 0x80]];
// The dots of a plot in a box of w×h cells (2×4 dots per cell): set(px, py) marks a dot; the bits of each cell.
export function brailleDots(w, h) {
  const bits = new Uint8Array(Math.max(0, w * h)), DW = w * 2, DH = h * 4;
  return {
    bits, DW, DH,
    set(px, py) { px = Math.round(px); py = Math.round(py); if (px < 0 || py < 0 || px >= DW || py >= DH) return; bits[(py >> 2) * w + (px >> 1)] |= DOT[py & 3][px & 1]; },
  };
}
// a wave as a braille line: one dot column per two samples' worth, joined vertically. scale: the wave's gain
export function brailleWave(w, h, d, scale = 1) {
  const B = brailleDots(w, h);
  if (!d || !d.length) { for (let px = 0; px < B.DW; px++) B.set(px, (B.DH - 1) / 2); return B; }
  let prev = null;
  for (let px = 0; px < B.DW; px++) {
    const v = d[Math.min(d.length - 1, Math.floor((px / B.DW) * d.length))] * scale, py = Math.max(0, Math.min(B.DH - 1, Math.round((0.5 - v) * (B.DH - 1))));
    if (prev !== null) for (let k = Math.min(prev, py); k <= Math.max(prev, py); k++) B.set(px, k); else B.set(px, py);
    prev = py;
  }
  return B;
}
const EIGHTHS = ' ▁▂▃▄▅▆▇█';

// A grid on context g at the cells of G ({ cols, rows, cw, ch, x0, y0 }), with the palette T.
export function termGrid(g, G, T) {
  const { cw, ch, x0, y0 } = G;
  // the font whose advance is one cell (a monospace advance of 0.6 em), so a whole string lines up with the cells
  const size = Math.max(4, Math.min(ch * 0.86, cw / 0.6));
  const fonts = [`500 ${size.toFixed(2)}px ${FONT}`, `700 ${size.toFixed(2)}px ${FONT}`];
  let cur = '';
  const font = b => { const f = fonts[b ? 1 : 0]; if (f !== cur) { g.font = f; cur = f; } };
  g.textBaseline = 'middle'; g.textAlign = 'left';
  const X = c => x0 + c * cw, Y = r => y0 + r * ch;
  const t = {
    G, T, X, Y,
    // a filled block of cells
    bg(c, r, w, h, col) { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(X(c), Y(r), w * cw, h * ch); },
    // a string from cell (c, r); o: { bold, bg (cell background), alpha }
    put(c, r, s, col, o = {}) {
      s = String(s);
      if (!s) return;
      const n = [...s].length;
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(X(c), Y(r), n * cw, ch); }
      if (o.alpha !== undefined) g.globalAlpha = o.alpha;
      font(o.bold); g.fillStyle = col; g.fillText(s, X(c), Y(r) + ch / 2);
      if (o.alpha !== undefined) g.globalAlpha = 1;
    },
    // a panel: rounded corners (square with o.square), a title on the top edge, a dimmed note on the right of it
    box(c, r, w, h, col, title = '', o = {}) {
      if (w < 2 || h < 2) return;
      const [tl, tr, bl, br] = o.square ? ['┌', '┐', '└', '┘'] : o.ascii ? ['+', '+', '+', '+'] : ['╭', '╮', '╰', '╯'];
      const hz = o.ascii ? '-' : '─', vt = o.ascii ? (o.dash ? ':' : '|') : '│';
      t.put(c, r, tl + hz.repeat(w - 2) + tr, col); t.put(c, r + h - 1, bl + hz.repeat(w - 2) + br, col);
      for (let k = 1; k < h - 1; k++) { t.put(c, r + k, vt, col); t.put(c + w - 1, r + k, vt, col); }
      const room = w - 4;
      let tt = title ? ` ${title} ` : '';
      if ([...tt].length > room) tt = [...tt].slice(0, Math.max(0, room)).join('');
      if (tt) { t.bg(c + 2, r, [...tt].length, 1, o.ground || T.bg); t.put(c + 2, r, tt, o.titleCol || col, { bold: true }); }
      if (o.right) {
        const rt = ` ${o.right} `, n = [...rt].length;
        if (n + [...tt].length + 4 <= w) { t.bg(c + w - 2 - n, r, n, 1, o.ground || T.bg); t.put(c + w - 2 - n, r, rt, o.rightCol || T.dim); }
      }
    },
    // braille dots (from brailleDots) drawn as dots, not taken from the font (no font fallback)
    braille(c, r, w, h, B, col, alpha = 1) {
      const dw = cw / 2, dh = ch / 4, rad = Math.max(0.5, Math.min(dw, dh) * 0.36);
      g.fillStyle = col; g.globalAlpha = alpha; g.beginPath();
      for (let q = 0; q < h; q++) for (let p = 0; p < w; p++) {
        const b = B.bits[q * w + p];
        if (!b) continue;
        for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 2; xx++) if (b & DOT[yy][xx]) { const px = X(c + p) + dw * (xx + 0.5), py = Y(r + q) + dh * (yy + 0.5); g.moveTo(px + rad, py); g.arc(px, py, rad, 0, Math.PI * 2); }
      }
      g.fill(); g.globalAlpha = 1;
    },
    // vertical bars in eighth blocks, one per column; colOf(fraction of the height) → colour
    bars(c, r, w, h, vals, colOf) {
      for (let i = 0; i < Math.min(w, vals.length); i++) {
        const tot = Math.max(0, Math.min(1, vals[i])) * h * 8;
        for (let k = 0; k < h; k++) { const fill = Math.max(0, Math.min(8, Math.round(tot - k * 8))); if (fill > 0) t.put(c + i, r + h - 1 - k, EIGHTHS[fill], colOf(k / h)); }
      }
    },
    // a level line: heavy for the level, light for the rest
    meter(c, r, w, v, col) { const n = Math.max(0, Math.min(w, Math.round(v * w))); if (n) t.put(c, r, '━'.repeat(n), col); if (w - n) t.put(c + n, r, '─'.repeat(w - n), T.faint); },
    // a half cell (upper or lower half of cell c, r), as a terminal draws '▀' and '▄'
    half(c, r, lower, col, alpha = 1) { g.globalAlpha = alpha; g.fillStyle = col; g.fillRect(X(c), Y(r) + (lower ? ch / 2 : 0) + 0.5, cw, ch / 2 - 1); g.globalAlpha = 1; },
  };
  return t;
}
