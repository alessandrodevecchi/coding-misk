// FM lab drawings (fm-groove-lab D5, D6): the wave of a card at an FM amount and the live scope of the lab preview,
// on canvases, in the theme's colours (--a1 lit, --muted plain, --line for the axis).
const css = (name, fb) => (getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb);
export const themeColors = () => ({ lit: css('--a1', '#ff4fa3'), plain: css('--muted', '#a597c7'), line: css('--line', '#3a2a5c') });

// size the canvas to its box (device pixels) and return its 2D context and size in CSS pixels
function fit(cv) {
  const dpr = window.devicePixelRatio || 1, w = Math.max(1, cv.clientWidth || +cv.getAttribute('width') || 120), h = Math.max(1, cv.clientHeight || +cv.getAttribute('height') || 40);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  return { g, w, h };
}
// values from -1 to 1 across the canvas, an axis in the middle
export function drawWave(cv, values, { lit = false, colors = themeColors(), width = 1.6 } = {}) {
  if (!cv) return;
  const { g, w, h } = fit(cv), pad = 3, mid = h / 2, amp = mid - pad;
  g.strokeStyle = colors.line; g.lineWidth = 1; g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke();
  if (!values || !values.length) return;
  g.strokeStyle = lit ? colors.lit : colors.plain; g.lineWidth = width; g.lineJoin = 'round';
  if (lit) { g.shadowColor = colors.lit; g.shadowBlur = 6; }
  g.beginPath();
  values.forEach((v, i) => { const x = (i / (values.length - 1)) * w, y = mid - Math.max(-1, Math.min(1, v)) * amp; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.stroke(); g.shadowBlur = 0;
}
// one window of the analyser's samples, started on the first rising zero crossing so a held note stands still; the
// window is scaled to the loudest sample (a quiet card still shows its shape) → the number of samples drawn, or 0
export function drawScope(cv, data, { colors = themeColors(), span = 2048 } = {}) {
  if (!cv) return 0;
  if (!data || !data.length) { drawWave(cv, null, { colors }); return 0; }
  const n = Math.min(span, Math.floor(data.length / 2));
  let start = 0;
  for (let i = 1; i < data.length - n; i++) if (data[i - 1] < 0 && data[i] >= 0) { start = i; break; }
  let peak = 0;
  for (let i = start; i < start + n; i++) peak = Math.max(peak, Math.abs(data[i]));
  const k = peak > 1e-4 ? 0.9 / peak : 0, out = new Array(Math.min(400, n));
  for (let j = 0; j < out.length; j++) out[j] = data[start + Math.floor(j * n / out.length)] * k;
  drawWave(cv, peak > 1e-4 ? out : null, { lit: true, colors });
  return peak > 1e-4 ? n : 0;
}
