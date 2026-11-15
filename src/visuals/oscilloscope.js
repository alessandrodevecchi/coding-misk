// The Oscilloscope look (oscilloscope-visual): the sound drawn as a beam on a phosphor screen. Loaded only when the look
// is picked (D2). One 2D canvas pass: the phosphor buffer fades by Persistence, the new trace is added to it with a
// brightness that follows the beam's speed, the buffer goes on the stage over the screen, once sharp and once blurred
// for Glow, the smudged glass (oscilloscope-smudge: the beam scattered by the grease, the room's light on it) and the
// overlay's glass (graticule, reflection) go on top.
import { oscSettings, paramNow, sweepWindow, resample, binOf, SMUDGED, glassPlan } from './oscilloscope-rules.js';
import { loadGlass, glassMask, glassReady } from './oscilloscope-glass.js';

const BINS = 6;

export function createOscilloscope() {
  let pb = null, px = null, ov = null, ovKey = '';
  // the smudged glass of the song (oscilloscope-smudge D3, D4): its mask by plan and size, tinted copies by hue, a
  // quarter-size mask and work canvas for the beam's scatter
  let gl = null, glKey = '';

  // the screen area (D3): a 10 × 8 graticule fitted in the stage with a margin; the real oscilloscope keeps a bezel
  function screenOf(W, H, overlay) {
    const m = overlay === 'real' ? 0.09 : 0.05, aw = W * (1 - 2 * m), ah = H * (1 - 2 * m);
    const w = Math.min(aw, ah * 1.25), h = w / 1.25;
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }

  // the overlay in two layers (under and over the trace), cached by size and the values that change it
  // (with the smudged glass's room light baked in: the song's seed and Smudge are in the key, and whether the masks
  // have arrived)
  function overlayOf(W, H, dpr, S, hue, ambient, sat, seed, smudge) {
    const dirty = SMUDGED.includes(S.overlay) && smudge > 0.001;
    const key = `${W}x${H}@${dpr}|${S.overlay}|${Math.round(hue)}|${ambient.toFixed(2)}|${sat.toFixed(2)}|${dirty ? `${seed}|${smudge.toFixed(2)}|${glassReady()}` : ''}`;
    if (ov && ovKey === key) return ov;
    ovKey = key;
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, g]; };
    const [under, u] = mk(), [over, o] = mk(), R = screenOf(W, H, S.overlay), kind = S.overlay;
    const tint = (l, a = 1) => `hsla(${hue}, ${Math.round(sat * 35)}%, ${l}%, ${a})`;
    // the screen: black glass lit by the room (Ambient light), a little of the trace's colour in it (Screen saturation)
    const base = kind === 'vector' ? `hsl(220, ${Math.round(sat * 40)}%, ${2 + ambient * 3}%)` : tint(2 + ambient * 6);
    u.fillStyle = kind === 'real' ? '#0b0c0d' : '#000'; u.fillRect(0, 0, W, H);
    if (kind === 'real') {
      // the bezel: a dark frame with a soft edge and the screen cut into it
      const bz = u.createLinearGradient(0, 0, 0, H); bz.addColorStop(0, '#1d1f22'); bz.addColorStop(1, '#0a0b0c');
      u.fillStyle = bz; u.fillRect(0, 0, W, H);
      u.fillStyle = '#050606'; roundRect(u, R.x - 10, R.y - 10, R.w + 20, R.h + 20, 18); u.fill();
    }
    u.save(); if (kind === 'real' || kind === 'vector') { roundRect(u, R.x, R.y, R.w, R.h, kind === 'real' ? 14 : 28); u.clip(); }
    u.fillStyle = base; u.fillRect(0, 0, W, H);
    // the glass is brighter in the middle (a curved tube); the vector display darker at the corners
    const cxm = R.x + R.w / 2, cym = R.y + R.h / 2, rr = Math.hypot(R.w, R.h) / 2;
    const v = u.createRadialGradient(cxm, cym, rr * 0.1, cxm, cym, rr * (kind === 'vector' ? 0.9 : 1.1));
    v.addColorStop(0, tint(4 + ambient * 8, 0.6)); v.addColorStop(1, 'rgba(0,0,0,0.7)');
    u.fillStyle = v; u.fillRect(0, 0, W, H); u.restore();
    // over the trace: the dirt on the glass in the room's light (oscilloscope-smudge D4), under the graticule's lines
    if (dirty) {
      const G = glassOf(S.overlay, seed, R, dpr);
      if (G) { o.save(); o.globalCompositeOperation = 'screen'; o.globalAlpha = Math.min(1, 0.22 * ambient * smudge); o.drawImage(tintOf(G, hue, sat), R.x, R.y, R.w, R.h); o.restore(); }
    }
    // over the trace: the graticule, scratched by the light of the room
    if (kind === 'graticule' || kind === 'smudged-graticule' || kind === 'real') {
      o.save(); o.strokeStyle = tint(55 + ambient * 25, 0.12 + ambient * 0.22); o.lineWidth = 1;
      o.beginPath();
      for (let i = 0; i <= 10; i++) { const x = R.x + (R.w * i) / 10; o.moveTo(x, R.y); o.lineTo(x, R.y + R.h); }
      for (let j = 0; j <= 8; j++) { const y = R.y + (R.h * j) / 8; o.moveTo(R.x, y); o.lineTo(R.x + R.w, y); }
      o.stroke();
      // the small ticks on the centre lines, five per division
      o.beginPath();
      for (let i = 0; i <= 50; i++) { const x = R.x + (R.w * i) / 50; o.moveTo(x, cym - 3); o.lineTo(x, cym + 3); }
      for (let j = 0; j <= 40; j++) { const y = R.y + (R.h * j) / 40; o.moveTo(cxm - 3, y); o.lineTo(cxm + 3, y); }
      o.stroke(); o.restore();
    }
    if (kind === 'real' || kind === 'vector') {
      // a reflection of the room across the top of the glass
      o.save(); roundRect(o, R.x, R.y, R.w, R.h, kind === 'real' ? 14 : 28); o.clip();
      const rf = o.createLinearGradient(R.x, R.y, R.x + R.w * 0.4, R.y + R.h * 0.6);
      rf.addColorStop(0, `rgba(255,255,255,${0.05 + ambient * 0.05})`); rf.addColorStop(0.5, 'rgba(255,255,255,0)');
      o.fillStyle = rf; o.fillRect(R.x, R.y, R.w, R.h); o.restore();
    }
    ov = { under, over, R };
    return ov;
  }

  // the glass of a song at this size: null until the masks are loaded (the first call starts loading them)
  function glassOf(overlay, seed, R, dpr) {
    if (!glassReady()) { loadGlass(); return null; }
    const w = Math.round(R.w * dpr), h = Math.round(R.h * dpr), key = `${overlay}|${seed}|${w}x${h}`;
    if (gl && glKey === key) return gl;
    const mask = glassMask(glassPlan(seed, overlay), w, h);
    if (!mask) return null;
    const qw = Math.max(1, Math.round(w / 4)), qh = Math.max(1, Math.round(h / 4)), mq = document.createElement('canvas');
    mq.width = qw; mq.height = qh; mq.getContext('2d').drawImage(mask, 0, 0, qw, qh);
    const work = document.createElement('canvas'); work.width = qw; work.height = qh;
    glKey = key; gl = { mask, mq, work, tints: new Map() };
    return gl;
  }
  // the mask in the glass's tint (hue in steps of 10 degrees, a few kept: a hue linked to the bar does not redraw it
  // every frame)
  function tintOf(G, hue, sat) {
    const key = `${Math.round(hue / 10) % 36}|${Math.round(sat * 10)}`;
    let c = G.tints.get(key);
    if (c) return c;
    c = document.createElement('canvas'); c.width = G.mask.width; c.height = G.mask.height;
    const g = c.getContext('2d'); g.drawImage(G.mask, 0, 0); g.globalCompositeOperation = 'source-in';
    g.fillStyle = `hsl(${Math.round(hue / 10) * 10}, ${Math.round(sat * 12)}%, 80%)`; g.fillRect(0, 0, c.width, c.height);
    if (G.tints.size >= 4) G.tints.delete(G.tints.keys().next().value);
    G.tints.set(key, c);
    return c;
  }
  // the beam scattered by the grease (oscilloscope-smudge D4): the phosphor blurred wide, kept where the glass is dirty.
  // The blur is made every other frame and the last one drawn between (it costs about 3 ms on a software canvas at
  // 1080p; a scattered glow moves slowly)
  let scatterTick = 0;
  function smudgesOn(cx, S, P, I, R, dpr) {
    const smudge = P('smudge'), scatter = P('scatter');
    if (!SMUDGED.includes(S.overlay) || smudge <= 0.001) return;
    const G = glassOf(S.overlay, I.seed == null ? '' : String(I.seed), R, dpr);
    // (codingMiskOscGlassMissing: the frames drawn before the masks arrived; a video's must be none)
    if (!G) { globalThis.codingMiskOscGlassMissing = (globalThis.codingMiskOscGlassMissing || 0) + 1; return; }
    if (scatter <= 0.001) return;
    const q = G.work;
    if (!G.scattered || (scatterTick++ & 1) === 0) {
      const g = q.getContext('2d');
      g.globalCompositeOperation = 'copy'; g.filter = `blur(${Math.max(1, (R.w / 4) * 0.035).toFixed(1)}px)`;
      g.drawImage(pb, R.x * dpr, R.y * dpr, R.w * dpr, R.h * dpr, 0, 0, q.width, q.height); g.filter = 'none';
      g.globalCompositeOperation = 'lighter'; g.drawImage(q, 0, 0); g.drawImage(q, 0, 0);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(G.mq, 0, 0);
      G.scattered = true;
    }
    cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = Math.min(1, 0.9 * scatter * smudge); cx.drawImage(q, R.x, R.y, R.w, R.h); cx.restore();
  }

  // the masks before a video's first frame (D6): resolves at once when the overlay has no smudges
  function prepare(raw) { return SMUDGED.includes(oscSettings(raw).overlay) ? loadGlass() : Promise.resolve(); }

  // draw one frame. cx: the stage context (logical units, dpr transform), W, H: logical size; inputs: { mix, low, high
  // (Float32Array time data), rate, lv, level, bar, section, dt, playing, raw (the stored settings) }
  function draw(cx, W, H, dpr, I) {
    const S = oscSettings(I.raw), ctx = { bar: I.bar, section: I.section, lv: I.lv, level: I.level };
    const P = k => paramNow(S, k, ctx);
    const seed = I.seed == null ? '' : String(I.seed);
    const hue = P('hue'), ambient = P('ambient'), O = overlayOf(W, H, dpr, S, hue, ambient, P('screenSat'), seed, P('smudge')), R = O.R;
    const dw = Math.round(W * dpr), dh = Math.round(H * dpr);
    if (!pb || pb.width !== dw || pb.height !== dh) { pb = document.createElement('canvas'); pb.width = dw; pb.height = dh; px = pb.getContext('2d'); }
    // the phosphor fades: Persistence is what is left after 1/60 s
    const keep = Math.pow(P('persistence'), Math.max(0.2, (I.dt || 1 / 60) * 60));
    px.setTransform(1, 0, 0, 1, 0, 0);
    px.globalCompositeOperation = 'destination-out'; px.fillStyle = `rgba(0,0,0,${1 - keep})`; px.fillRect(0, 0, dw, dh);
    px.globalCompositeOperation = 'lighter';
    px.setTransform(dpr, 0, 0, dpr, 0, 0);
    traceInto(px, S, P, I, R);
    // the stage: the screen, the phosphor sharp, the phosphor blurred (Glow), the glass
    cx.drawImage(O.under, 0, 0, W, H);
    cx.save(); cx.globalCompositeOperation = 'lighter';
    cx.drawImage(pb, 0, 0, W, H);
    const glow = P('glow');
    if (glow > 0.01) { cx.filter = `blur(${(2 + glow * 10).toFixed(1)}px)`; cx.globalAlpha = Math.min(1, glow * 1.6); cx.drawImage(pb, 0, 0, W, H); cx.filter = 'none'; cx.globalAlpha = 1; }
    cx.restore();
    smudgesOn(cx, S, P, I, R, dpr);
    cx.drawImage(O.over, 0, 0, W, H);
  }

  // the beam: the points of the trace in the screen, segments grouped by brightness
  function traceInto(g, S, P, I, R) {
    const k = S.oversample ? 4 : 1, smooth = P('smoothing'), noise = P('noise'), gain = 0.42;
    let xs, ys;
    if (S.mode === 'xy' && I.low && I.high) {
      // XY (D4): the low instruments (kick, bass) on X, the others on Y, as two channels into the deflection plates
      // (the last 25 ms of the buffers: the analysers keep 8192 samples, too many points for one frame)
      const len = Math.min(I.low.length, I.high.length), n = Math.max(8, Math.min(len, Math.round(I.rate * 0.025))), s0 = len - n;
      // Y also gets the low group a little later (about 1.5 ms): drums and bass alone draw loops, not a flat line
      const lag = Math.min(s0, Math.round(I.rate * 0.0015)), yy = new Float32Array(n);
      for (let i = 0; i < n; i++) yy[i] = I.high[s0 + i] + 0.8 * I.low[s0 + i - lag];
      const a = resample(I.low, s0, n, Math.min(k, 2), smooth), b = resample(yy, 0, n, Math.min(k, 2), smooth);
      xs = a.map(v => R.x + R.w / 2 + v * R.w * gain * 1.6); ys = b.map(v => R.y + R.h / 2 - v * R.h * gain * 1.6);
    } else {
      const data = I.mix, w = sweepWindow(data, I.rate, P('sweepMs'), P('trigger'));
      // (at most about 4000 points: a long sweep is not oversampled as much)
      const pts = resample(data, w.start, w.n, Math.max(1, Math.min(k, Math.floor(4000 / w.n))), smooth), m = pts.length - 1 || 1;
      xs = Array.from(pts, (_, i) => R.x + (R.w * i) / m); ys = pts.map(v => R.y + R.h / 2 - v * R.h * gain);
    }
    // the beam's noise: a tremble on every point, seeded by the song's time (a frame depends on the song, not the clock)
    const rnd = seededAt(I.cyc || 0);
    if (noise > 0) for (let i = 0; i < ys.length; i++) { ys[i] += (rnd() - 0.5) * noise * 6; xs[i] += (rnd() - 0.5) * noise * 2; }
    const paths = Array.from({ length: BINS }, () => new Path2D()), ref = Math.max(R.w, R.h) / (xs.length * 0.6);
    for (let i = 1; i < xs.length; i++) {
      const len = Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]), p = paths[binOf(len, ref, BINS)];
      p.moveTo(xs[i - 1], ys[i - 1]); p.lineTo(xs[i], ys[i]);
    }
    const hue = P('hue'), sat = Math.round(P('lineSat') * 100), intensity = P('intensity') / 5, focus = P('focus');
    g.lineCap = 'round'; g.lineJoin = 'round';
    // a wide faint halo of the beam and its bright core (Focus: a sharp beam is thin)
    for (let b = 0; b < BINS; b++) {
      const a = Math.min(1, ((b + 1) / BINS) * 0.55 * intensity);
      if (a < 0.01) continue;
      g.strokeStyle = `hsla(${hue}, ${sat}%, 55%, ${a * 0.35})`; g.lineWidth = 3.2 / focus; g.stroke(paths[b]);
      g.strokeStyle = `hsla(${hue}, ${Math.round(sat * 0.6)}%, 80%, ${a})`; g.lineWidth = 1.1 / focus; g.stroke(paths[b]);
    }
    // noise also lights a few grains of phosphor
    if (noise > 0) { g.fillStyle = `hsla(${hue}, ${sat}%, 70%, ${0.25 * noise})`; for (let i = 0; i < noise * 60; i++) g.fillRect(R.x + rnd() * R.w, R.y + rnd() * R.h, 1, 1); }
  }

  return { draw, prepare, reset() { pb = null; ov = null; ovKey = ''; gl = null; glKey = ''; } };
}

// a random sequence seeded by a song time (cycles)
function seededAt(cyc) {
  let s = (Math.floor(Math.abs(cyc) * 960) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
