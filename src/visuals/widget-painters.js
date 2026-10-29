// Widget painters (widgets-on-stage D1): the pictures of the code widgets drawn by the app, shared by the code widgets
// of the fast video (src/video/widget-frames.js) and the stage (Monitor, Rullo, later the layer over the other looks).
// Each painter draws plain data (notes, a wave, spectrum columns) into a box { x, y, w, h } of the 2D context it is
// given, with the colours it is given: no state, no clock, no random numbers, so a frame depends only on its data.
// A later render style (ASCII, dither, terminal) can post-process the box or pass another context.
// Notes: [begin, end, pitch, level] in cycles; pitch a MIDI number or a sound name.

// the notes of a list inside the window of `span` cycles centred on cyc
export const notesAround = (list, cyc, span) => list.filter(n => n[1] > cyc - span / 2 && n[0] < cyc + span / 2);
const alphaOf = (n, full) => (full ? 1 : Math.max(0, Math.min(1, n[3])));
// the pitches of a list, low first (numbers before names)
export const pitchesOf = list => [...new Set(list.map(n => n[2]))].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));

// pianoroll and punchcard: one row per pitch used (fold), the playhead in the middle.
// o: { span (cycles, 4), punch, full (notes at full opacity), on, off, head (colours), px (line scale), minW, pitches }
// → the number of notes drawn
export function roll(g, box, list, cyc, o) {
  const span = o.span || 4, px = o.px || 1;
  const pitches = o.pitches || pitchesOf(list);
  const rows = Math.max(1, pitches.length), rh = box.h / rows;
  const shown = notesAround(list, cyc, span);
  for (const n of shown) {
    const r = pitches.indexOf(n[2]);
    if (r < 0) continue;
    const x = box.x + ((n[0] - (cyc - span / 2)) / span) * box.w, w = Math.max(o.minW ?? 2, ((n[1] - n[0]) / span) * box.w), y = box.y + box.h - (r + 1) * rh;
    const on = n[0] <= cyc && cyc < n[1];
    g.globalAlpha = alphaOf(n, o.full);
    g.fillStyle = on ? o.on : o.off;
    if (o.punch) { g.beginPath(); g.arc(x + w / 2, y + rh / 2, Math.min(w, rh) * 0.4, 0, Math.PI * 2); g.fill(); } else g.fillRect(x, y + 1, w - 1, Math.max(1, rh - 2));
  }
  g.globalAlpha = 1;
  if (o.head) { g.fillStyle = o.head; g.fillRect(box.x + box.w / 2, box.y, 1.5 * px, box.h); }
  return shown.length;
}

// pitchwheel: the pitch classes sounding now on a circle. o: { full, ring, dot, px }
export function wheel(g, box, list, cyc, o) {
  const px = o.px || 1, r = Math.min(box.w, box.h) * 0.42, cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  g.strokeStyle = o.ring; g.lineWidth = px; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  for (const n of list) {
    if (!(n[0] <= cyc && cyc < n[1] && typeof n[2] === 'number')) continue;
    const a = ((n[2] % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    g.globalAlpha = alphaOf(n, o.full); g.fillStyle = o.dot;
    g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.12, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}

// spiral: the notes of 4 cycles wound around the centre, now on the outer turn. o: { full, on, off, px }
export function spiral(g, box, list, cyc, o) {
  const px = o.px || 1, R = Math.min(box.w, box.h) * 0.45, cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  g.lineCap = 'round';
  const rad = b => R * (0.25 + 0.75 * Math.max(0, Math.min(1, (b - (cyc - 2)) / 4))), ang = b => b * Math.PI * 2 - Math.PI / 2;
  for (const n of notesAround(list, cyc, 4)) {
    const on = n[0] <= cyc && cyc < n[1];
    g.globalAlpha = alphaOf(n, o.full); g.strokeStyle = on ? o.on : o.off; g.lineWidth = 4 * px;
    g.beginPath();
    for (let k = 0; k <= 8; k++) { const b = n[0] + ((n[1] - n[0]) * k) / 8, x = cx + Math.cos(ang(b)) * rad(b), y = cy + Math.sin(ang(b)) * rad(b); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  g.globalAlpha = 1;
}

// scope: the wave from its first falling zero crossing (in the first half), across the box; a flat line without data.
// o: { color, px, scale (1) }
export function scope(g, box, d, o) {
  const px = o.px || 1, scale = o.scale ?? 1;
  g.strokeStyle = o.color; g.lineWidth = 2 * px; g.beginPath();
  if (!d) { g.moveTo(box.x, box.y + box.h / 2); g.lineTo(box.x + box.w, box.y + box.h / 2); g.stroke(); return; }
  let t0 = -1;
  for (let i = 1; i < d.length; i++) if (d[i - 1] > 0 && d[i] <= 0) { t0 = i; break; }
  t0 = Math.max(0, Math.min(d.length / 2, t0));
  const n = d.length - t0;
  for (let i = 0; i < n; i++) { const x = box.x + (i / n) * box.w, y = box.y + (0.5 - d[t0 + i] * scale) * box.h; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
}

// a small DFT of n samples (Hann window) → magnitudes in dB for the bins 1 … n/2
export function spectrumOf(x) {
  const n = x.length, out = new Float32Array(n / 2);
  for (let k = 1; k <= n / 2; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)), a = (2 * Math.PI * k * i) / n; re += x[i] * w * Math.cos(a); im -= x[i] * w * Math.sin(a); }
    out[k - 1] = 20 * Math.log10(Math.sqrt(re * re + im * im) / n + 1e-9);
  }
  return out;
}
// one spectrum column at x, w wide: each bin at a log height, its opacity from -80 to 0 dB. o: { color, px }
export function spectrumColumn(g, box, x, w, mags, o) {
  const px = o.px || 1, m = mags.length;
  g.fillStyle = o.color;
  for (let i = 0; i < m; i++) { g.globalAlpha = Math.max(0, Math.min(1, (mags[i] + 80) / 80)); g.fillRect(x, box.y + box.h - (Math.log(i + 1) / Math.log(m)) * box.h, w, 2 * px); }
  g.globalAlpha = 1;
}
// a scrolling spectrum drawn whole from its columns (oldest first, null for none), so a frame drawn alone is the same
// as one drawn in a sequence. The bins fold into `bands` log-spaced bands (the loudest bin of each).
// o: { color, bands (24), floor (-80 dB) }
export function spectrogram(g, box, columns, o) {
  const n = columns.length, cw = box.w / Math.max(1, n), bands = o.bands || 24, lo = o.floor ?? -80, bh = box.h / bands;
  g.fillStyle = o.color;
  for (let c = 0; c < n; c++) {
    const mags = columns[c];
    if (!mags) continue;
    const m = mags.length;
    for (let b = 0; b < bands; b++) {
      const i0 = Math.floor(Math.pow(m, b / bands)) - 1, i1 = Math.max(i0 + 1, Math.floor(Math.pow(m, (b + 1) / bands)) - 1);
      let v = -Infinity;
      for (let i = i0; i < i1 && i < m; i++) if (mags[i] > v) v = mags[i];
      const a = Math.max(0, Math.min(1, (v - lo) / -lo));
      if (a < 0.04) continue;
      g.globalAlpha = a;
      g.fillRect(box.x + c * cw, box.y + box.h - (b + 1) * bh, Math.ceil(cw), Math.ceil(bh) - 0.5);
    }
  }
  g.globalAlpha = 1;
}
