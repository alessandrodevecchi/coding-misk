// The SCART cable of the Soul display (#46): a rope (verlet points with gravity and a fixed length) between the
// socket under the bay (OUT) and the socket under the stage (SOUL IN), drawn on a canvas over the page. The listener
// can grab it anywhere and drag it; released, it swings back. Plugging in, the free end travels from OUT down under
// the stage and climbs into SOUL IN; unplugging plays the reverse.
// getEnds(): { out: { x, y }, in: { x, y } } socket mouths in viewport pixels (the plug hangs below them), or null.
const N = 30, PLUG = 38, GRAB = 18;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const eio = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function createCable({ getEnds, isHw }) {
  const cv = document.createElement('canvas');
  cv.className = 'soul-cable';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  let pts = null, seg = 0, mode = 'off', modeAt = 0, raf = 0, drag = null, last = 0, onPlugged = () => {};
  const now = () => performance.now() / 1000;

  function reset(E) {
    // a cable hanging from OUT, long enough to reach SOUL IN with a deep loop under the stage
    const span = Math.hypot(E.in.x - E.out.x, E.in.y - E.out.y);
    seg = (span + 170) / (N - 1);
    pts = Array.from({ length: N }, (_, i) => { const x = E.out.x - i * 2, y = E.out.y + PLUG + i * seg * .6; return { x, y, px: x, py: y }; });
  }
  // where the free end is held while plugging or unplugging (k 0..1 from OUT to SOUL IN)
  function heldAt(E, k) {
    const a = { x: E.out.x, y: E.out.y + PLUG }, b = { x: E.in.x, y: E.in.y + PLUG }, low = Math.max(a.y, b.y) + 90;
    if (k < .4) { const q = eio(k / .4); return { x: a.x - 40 * q, y: a.y + (low - a.y) * q }; }
    if (k < .85) { const q = eio((k - .4) / .45); return { x: a.x - 40 + (b.x - a.x + 40) * q, y: low + (b.y + 50 - low) * q }; }
    const q = eio((k - .85) / .15); return { x: b.x, y: b.y + 50 - 50 * q };
  }
  function step(dt, E) {
    const gy = 2200 * dt * dt;
    for (let i = 1; i < N; i++) { const p = pts[i], vx = (p.x - p.px) * .985, vy = (p.y - p.py) * .985; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + gy; }
    const k = clamp((now() - modeAt) / 1.15), endK = mode === 'plugging' ? k : mode === 'unplugging' ? 1 - k : mode === 'in' ? 1 : null;
    for (let it = 0; it < 16; it++) {
      pts[0].x = E.out.x; pts[0].y = E.out.y + PLUG;
      if (endK !== null) { const h = heldAt(E, endK); pts[N - 1].x = h.x; pts[N - 1].y = h.y; }
      if (drag) { const p = pts[drag.i]; p.x = drag.x; p.y = drag.y; }
      for (let i = 0; i < N - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - seg) / d;
        const fa = i === 0 ? 0 : (drag && drag.i === i ? 0 : .5), fb = (i + 1 === N - 1 && endK !== null) || (drag && drag.i === i + 1) ? 0 : .5;
        const s = fa + fb || 1;
        a.x += dx * diff * fa / s; a.y += dy * diff * fa / s; b.x -= dx * diff * fb / s; b.y -= dy * diff * fb / s;
      }
    }
    if (mode === 'plugging' && k >= 1) { mode = 'in'; onPlugged(); }
    if (mode === 'unplugging' && k >= 1) { mode = 'off'; pts = null; }
  }

  // a SCART plug hanging from (x, y): metal shield inside the socket, body with the label, strain relief
  function plug(x, y, ang, lit) {
    const hw = isHw();
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = '#a9abb2'; g.fillRect(-18, -6, 36, 8); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-18, -6, 36, 2);
    const body = g.createLinearGradient(-22, 0, 22, 0); body.addColorStop(0, hw ? '#1f1f22' : '#0f0b14'); body.addColorStop(.5, hw ? '#3a3a40' : '#241a30'); body.addColorStop(1, hw ? '#1a1a1d' : '#0c0910');
    g.fillStyle = body; g.beginPath(); g.roundRect(-22, 2, 44, 26, 4); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(-20, 4, 40, 5);
    g.font = '700 7.5px "Space Grotesk", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#9a9aa2'; g.fillText('SCART', 0, 20);
    g.fillStyle = hw ? '#26262a' : '#120d18'; g.beginPath(); g.moveTo(-11, 28); g.lineTo(11, 28); g.lineTo(7, PLUG); g.lineTo(-7, PLUG); g.closePath(); g.fill();
    if (hw) { g.fillStyle = lit ? '#39ff6a' : '#1f3a22'; g.beginPath(); g.arc(16, 9, 2.2, 0, 6.283); g.fill(); }
    else if (lit) { g.fillStyle = '#00f0ff'; g.shadowColor = '#00f0ff'; g.shadowBlur = 10; g.fillRect(-18, 1, 36, 2); g.shadowBlur = 0; }
    g.restore();
  }
  function draw(t) {
    const d = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    if (!pts) return;
    const hw = isHw(), path = () => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < N - 1; i++) { const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2; g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my); } g.lineTo(pts[N - 1].x, pts[N - 1].y); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    path(); g.strokeStyle = hw ? '#0c0c0e' : 'rgba(170,140,220,.28)'; g.lineWidth = 17; g.stroke();
    path(); g.strokeStyle = hw ? '#1d1d20' : '#231a2e'; g.lineWidth = 14; g.stroke();
    if (hw) {
      // braided sleeve: two crossing weaves, a soft highlight
      path(); g.setLineDash([2.2, 2.6]); g.strokeStyle = '#77777e'; g.lineWidth = 12; g.stroke();
      g.lineDashOffset = 2.4; g.strokeStyle = '#48484e'; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
      g.save(); g.translate(-2, -1.5); path(); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 3; g.stroke(); g.restore();
    } else {
      g.save(); g.translate(-2, -1.5); path(); g.strokeStyle = 'rgba(150,120,200,.35)'; g.lineWidth = 3; g.stroke(); g.restore();
      if (mode === 'in') { path(); g.setLineDash([8, 22]); g.lineDashOffset = -t * 70; g.strokeStyle = '#00f0ff'; g.lineWidth = 2.4; g.shadowColor = '#00f0ff'; g.shadowBlur = 8; g.stroke(); g.setLineDash([]); g.shadowBlur = 0; }
    }
    const a = pts[0], b = pts[N - 1], b2 = pts[N - 2];
    plug(a.x, a.y - PLUG, 0, mode === 'in');
    const free = mode === 'plugging' || mode === 'unplugging' ? Math.atan2(b2.x - b.x, b.y - b2.y) * -1 : 0;
    plug(b.x, b.y - PLUG, mode === 'in' ? 0 : free * .8, mode === 'in');
  }
  function loop() {
    raf = 0;
    const E = getEnds();
    if (!E || !pts) { draw(0); if (!pts) return; }
    else { const t = now(), dt = Math.min(1 / 30, t - last || 1 / 60); last = t; step(dt, E); draw(t); }
    raf = requestAnimationFrame(loop);
  }
  const run = () => { if (!raf) { last = now(); raf = requestAnimationFrame(loop); } };

  // dragging: grab the nearest point of the cable under the pointer
  const near = (x, y) => { if (!pts) return -1; let best = -1, bd = GRAB; pts.forEach((p, i) => { if (i === 0 || i === N - 1) return; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } }); return best; };
  document.addEventListener('pointerdown', e => { const i = near(e.clientX, e.clientY); if (i < 0) return; e.preventDefault(); drag = { i, x: e.clientX, y: e.clientY }; document.body.classList.add('soul-dragging'); run(); }, true);
  document.addEventListener('pointermove', e => {
    if (drag) { drag.x = e.clientX; drag.y = e.clientY; return; }
    document.body.classList.toggle('soul-cable-hover', near(e.clientX, e.clientY) >= 0);
  });
  addEventListener('pointerup', () => { if (drag) { drag = null; document.body.classList.remove('soul-dragging'); } });

  return {
    plugIn(cb = () => {}) { const E = getEnds(); if (!E) return; if (!pts) reset(E); onPlugged = cb; mode = 'plugging'; modeAt = now(); run(); },
    unplug() { if (!pts) return; mode = 'unplugging'; modeAt = now(); run(); },
    get plugged() { return mode === 'in'; },
    get state() { return mode; },
    // the rope's points (viewport pixels), for checks
    get points() { return pts ? pts.map(p => ({ x: p.x, y: p.y })) : []; },
  };
}
