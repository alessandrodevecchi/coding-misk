// The Oscilloscope look's smudged glass (oscilloscope-smudge D1, D3, D4): the masks of public/visuals/glass/ and the
// elements the app draws itself (a ridged fingerprint, dust with hairs and fine scratches, a cloth wipe arc), put
// together by the song's plan (glassPlan) into one mask: white, the dirt as alpha. Loaded with the look's module.
import { GLASS_MASKS, glassRandom } from './oscilloscope-rules.js';

const imgs = new Map();
let loading = null, done = false;
// every mask, once (about 540 KB); resolves when they can be drawn (a mask that fails is left out)
export function loadGlass() {
  if (loading) return loading;
  loading = Promise.all(GLASS_MASKS.map(name => new Promise(res => {
    const i = new Image();
    i.onload = () => { imgs.set(name, i); res(); };
    i.onerror = () => { console.warn('[oscilloscope] glass mask not loaded', name); res(); };
    i.src = new URL(`visuals/glass/${name}.webp`, document.baseURI).href;
  }))).then(() => { done = true; });
  return loading;
}
// every mask has arrived (or failed): the glass can be put together once, not again when a late mask comes
export const glassReady = () => done;

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

// the mask of a plan at w × h pixels (the screen area); null when the masks are not loaded yet
export function glassMask(plan, w, h) {
  if (!plan.length || !glassReady()) return null;
  const m = canvas(w, h), g = m.getContext('2d'), u = w / 640;
  for (const e of plan) {
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, e.alpha));
    const x = e.x * w, y = e.y * h, s = (e.size || 0) * w, img = e.mask && imgs.get(e.mask);
    if (e.kind === 'cover' && img) g.drawImage(img, 0, 0, w, h);
    else if (e.kind === 'whole' && img) { g.translate(x, y); g.rotate(e.angle); if (e.blur) g.filter = `blur(${(e.blur * u).toFixed(2)}px)`; g.drawImage(img, -s / 2, -s / 2, s, s); }
    else if (e.kind === 'patch' && img) g.drawImage(patch(img, e, s), x - s / 2, y - s / 2);
    else if (e.kind === 'ridge') ridge(g, x, y, s, e.angle, glassRandom(e.seed));
    else if (e.kind === 'wipe') wipe(g, x, y, s, e.angle, e.span, glassRandom(e.seed), u);
    else if (e.kind === 'dust') dust(g, w, h, e.amount, glassRandom(e.seed), u);
    g.restore();
  }
  return m;
}

// a soft-edged crop of a mask, turned
function patch(img, e, s) {
  const c = canvas(s, s), p = c.getContext('2d'), cs = e.crop.s * img.width;
  p.translate(s / 2, s / 2); p.rotate(e.angle); p.translate(-s / 2, -s / 2);
  p.drawImage(img, e.crop.x * img.width, e.crop.y * img.height, cs, cs, 0, 0, s, s);
  p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'destination-in';
  const gr = p.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  p.fillStyle = gr; p.fillRect(0, 0, s, s);
  return c;
}

// a loop fingerprint: deformed concentric ridges, broken here and there, fading at its oval edge
function ridge(g, x, y, s, angle, r) {
  const size = s / 2, c = canvas(size * 2, size * 2), p = c.getContext('2d'), m = size;
  p.translate(m, m); p.rotate(angle); p.strokeStyle = '#fff'; p.lineCap = 'round';
  const ph1 = r() * 6, ph2 = r() * 6;
  for (let k = 1; k < 22; k++) {
    const rx = k * size * 0.034, ry = k * size * 0.045;
    p.lineWidth = Math.max(0.6, size * (0.010 + r() * 0.006)); p.globalAlpha = 0.55 + r() * 0.45;
    p.beginPath(); let gap = false;
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
      if (r() < 0.012) gap = !gap;
      const w = 1 + 0.06 * Math.sin(a * 3 + ph1 + k * 0.2) + 0.04 * Math.sin(a * 5 + ph2);
      const px = Math.cos(a) * rx * w, py = Math.sin(a) * ry * w - (k < 7 ? (7 - k) * size * 0.01 : 0);
      if (gap) p.moveTo(px, py); else p.lineTo(px, py);
    }
    p.stroke();
  }
  p.setTransform(1, 0, 0, 1, 0, 0); p.globalAlpha = 1; p.globalCompositeOperation = 'destination-in';
  const gr = p.createRadialGradient(m, m * 1.05, 0, m, m * 1.05, size * 0.85);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  p.fillStyle = gr; p.fillRect(0, 0, c.width, c.height);
  g.drawImage(c, x - m, y - m);
}

// dust specks, a few curled hairs and fine scratches mostly in one direction
function dust(g, w, h, amount, r, u) {
  const a0 = g.globalAlpha;
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  for (let i = 0; i < 260 * amount; i++) {
    g.globalAlpha = a0 * (0.25 + r() * 0.7);
    const s = (r() < 0.9 ? 0.5 + r() * 1.1 : 1.5 + r() * 2) * Math.max(0.6, u);
    g.beginPath(); g.arc(r() * w, r() * h, s, 0, 7); g.fill();
  }
  for (let i = 0; i < 5 * amount; i++) {
    g.globalAlpha = a0 * (0.5 + r() * 0.4); g.lineWidth = 0.7 * Math.max(0.6, u);
    const x = r() * w, y = r() * h, l = (20 + r() * 60) * u;
    g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + (r() - 0.5) * l, y + (r() - 0.5) * l, x + (r() - 0.5) * l, y + (r() - 0.5) * l, x + (r() - 0.5) * l * 1.5, y + (r() - 0.5) * l * 1.5); g.stroke();
  }
  const dir = r() * Math.PI;
  for (let i = 0; i < 14 * amount; i++) {
    g.globalAlpha = a0 * (0.15 + r() * 0.35); g.lineWidth = (0.5 + r() * 0.6) * Math.max(0.6, u);
    const a = dir + (r() - 0.5) * 0.35, l = (60 + r() * 260) * u, x = r() * w, y = r() * h;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
}

// a cloth wipe: an arc band of fine lines around (x, y) of radius R
function wipe(g, x, y, R, a0, span, r, u) {
  const base = g.globalAlpha;
  g.strokeStyle = '#fff'; g.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const rr = R + (r() - 0.5) * R * 0.28, s = a0 + r() * 0.15, e = s + span * (0.5 + r() * 0.5);
    const a = (0.05 + r() * 0.22) * (1 - Math.abs(rr - R) / (R * 0.16));
    const lw = (0.6 + r() * 1.8) * Math.max(0.6, u);
    if (a <= 0) continue;
    g.globalAlpha = base * a; g.lineWidth = lw; g.beginPath(); g.arc(x, y, rr, s, e); g.stroke();
  }
}
