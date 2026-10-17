// Landmarks of the neon city v3 (procedural-visuals): one colossal structure per district, 240 to 320 pixels tall and
// as wide as most of the picture, baked once with its lights, so the district is known at a glance even when only its
// top shows above the street. What moves with the music is drawn by beat():
//   market: a pagoda tower of eleven tiers with curved eaves, lanterns and a glyph banner, a holographic koi around it;
//   spires: a space elevator, its tether lost in the sky, a ring station, an arcology at its foot, capsules climbing;
//   stacks: a refinery, two cooling towers, banded chimneys with flames, pipe racks and tanks;
//   oldtown: a giant gate before a temple on a hill, stone lanterns, lanterns on strings, falling petals;
//   harbor: two container cranes over a cargo ship, a lighthouse sweeping;
//   datacore: a stepped black pyramid with circuits and an eye that opens with the bass.
import { bake, px, disc, ramp, panel, vgrad, hcyl, vcyl, glyph, noise, mix, shade, bayer } from '../pixel-art.js';

const INK = '#07040f';
export const LANDMARKS = ['market', 'spires', 'stacks', 'oldtown', 'harbor', 'datacore'];
const tri = (g, x, y, w, h, c) => { for (let k = 0; k < h; k++) { const hw = Math.round((w / 2) * (k / h)); px(g, c, x - hw, y + k, hw * 2 + 1, 1); } };
const glow = (gl, c, a, ...r) => { gl.globalAlpha = a; px(gl, c, ...r); gl.globalAlpha = 1; };
// a lit window cell with a frame
const cell = (g, gl, x, y, w, h, on, warm, dark) => { px(g, on ? warm : dark, x, y, w, h); if (on) { px(g, mix(warm, '#ffffff', 0.4), x, y, w, 1); glow(gl, warm, 0.55, x, y, w, h); } };

// ---------- market: the pagoda tower ----------
function pagoda(g, gl, W, H, d, s) {
  const R = ramp('#5a2a38', 6), RF = ramp('#2a1a2e', 6), WD = ramp('#7a4a2a', 5), mid = Math.floor(W / 2);
  // the podium: a stepped base with gates and a stair
  for (let k = 0; k < 3; k++) panel(g, mid - 130 + k * 8, H - 28 + k * 0 - k * 0, 260 - k * 16, 10, R, { line: INK });
  panel(g, mid - 120, H - 40, 240, 22, R, { line: INK });
  for (let k = 0; k < 9; k++) { const gx = mid - 108 + k * 26; px(g, INK, gx, H - 37, 14, 19); px(g, R[0], gx + 1, H - 36, 12, 18); cell(g, gl, gx + 3, H - 33, 8, 14, true, '#ffcf7a', R[0]); tri(g, gx + 7, H - 41, 16, 4, RF[3]); }
  let y = H - 40, w = 210;
  const tiers = 11;
  for (let t = 0; t < tiers; t++) {
    const th = t === 0 ? 26 : Math.max(14, 22 - t), bw = w - 22, by = y - th, bx = mid - Math.floor(bw / 2);
    // the tier: wooden posts, lattice windows, a balcony rail
    px(g, INK, bx - 1, by, bw + 2, th); vgrad(g, bx, by, bw, th, [R[4], R[3], R[2], R[1]]);
    for (let x = bx + 2; x < bx + bw - 6; x += 9) {
      px(g, WD[3], x, by + 1, 2, th - 1); px(g, WD[1], x + 2, by + 1, 1, th - 1);
      const on = noise(x, t, s) < 0.72; cell(g, gl, x + 4, by + 4, 4, th - 9, on, noise(x, t + 9, s) < 0.85 ? '#ffcf7a' : d.a, RF[1]);
      if (on) for (let k = by + 5; k < by + th - 5; k += 3) px(g, WD[2], x + 4, k, 4, 1);
    }
    px(g, WD[4], bx, by + th - 4, bw, 1); for (let x = bx; x < bx + bw; x += 3) px(g, WD[2], x, by + th - 3, 1, 3);
    // the eave: a thick tiled roof curving up at both ends, gold tips, a neon edge
    const ew = w + 20, ey = by - 8, half = Math.floor(ew / 2);
    for (let k = 0; k < 8; k++) { const hw = half - (7 - k) * 3; for (let x = -hw; x < hw; x++) px(g, k === 7 ? RF[0] : (x & 1) ? RF[2 + (k < 3 ? 2 : 1)] : RF[2 + (k < 3 ? 1 : 0)], mid + x, ey + k, 1, 1); }
    for (let k = 0; k < 9; k++) { const yy = ey - 6 + Math.floor(k * k / 12); px(g, RF[3], mid - half - 6 + k, yy, 2, 3); px(g, RF[3], mid + half + 4 - k, yy, 2, 3); }
    px(g, '#d8b040', mid - half - 7, ey - 7, 2, 2); px(g, '#d8b040', mid + half + 5, ey - 7, 2, 2);
    const nc = t % 2 ? d.a : d.c;
    px(g, mix(nc, '#ffffff', 0.4), mid - half + 6, ey + 7, ew - 12, 1); glow(gl, nc, 1, mid - half + 6, ey + 7, ew - 12, 1);
    // lanterns with tassels under the eave
    for (let x = mid - half + 10; x < mid + half - 8; x += 18) { px(g, RF[1], x + 1, ey + 8, 1, 2); px(g, '#c8202a', x - 1, ey + 10, 5, 6); px(g, '#ff5a3a', x, ey + 10, 3, 1); px(g, '#ffd23f', x + 1, ey + 12, 1, 3); px(g, '#d8b040', x + 1, ey + 16, 1, 2); glow(gl, '#ff6a2a', 0.8, x - 2, ey + 9, 7, 8); }
    y = ey; w = Math.max(40, w - 15);
  }
  // the spire: rings and an orb of light
  px(g, RF[3], mid - 2, y - 56, 4, 56); px(g, RF[4], mid - 2, y - 56, 1, 56);
  for (let k = 0; k < 9; k++) { const r = 5 - Math.floor(k / 3); px(g, '#b89030', mid - r, y - 10 - k * 5, r * 2 + 1, 2); px(g, '#e8c860', mid - r, y - 10 - k * 5, r, 1); }
  disc(g, mid, y - 60, 4, '#ffe0a0'); glow(gl, '#ffd080', 0.9, mid - 5, y - 65, 11, 11);
  // the glyph banner down the front
  const bx = mid - 6, n = 12, bt = H - 230;
  px(g, INK, bx - 1, bt - 1, 14, n * 11 + 4); px(g, '#120a1a', bx, bt, 12, n * 11 + 2); px(g, shade(d.b, -0.4), bx, bt, 12, 1);
  for (let k = 0; k < n; k++) { glyph(g, bx + 2, bt + 2 + k * 11, s * 7 + k, mix(d.b, '#ffffff', 0.5), 8); glyph(gl, bx + 2, bt + 2 + k * 11, s * 7 + k, d.b, 8); }
}
function koi(g, gl, x, y, W, H, d, env) {
  // a holographic koi swimming in a loop around the tower, a chain of scan-lined discs with fins
  const t = env.cyc * 0.4, mid = x + W / 2;
  for (let k = 0; k < 26; k++) {
    const a = t - k * 0.055, cx = mid + Math.cos(a * 2) * 120, cy = y + H - 170 + Math.sin(a * 2) * 34 + Math.sin(a * 7) * 4, r = k < 5 ? 7 : Math.max(1, 8 - Math.floor(k / 3));
    if (Math.sin(a * 2) < -0.25 && k > 0) continue; // behind the tower
    gl.globalAlpha = 0.3 + (env.lv.pad || 0) * 0.3 + (k < 3 ? 0.25 : 0);
    for (let yy = -r; yy <= r; yy += 2) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - yy * yy))); px(gl, k % 5 < 2 ? d.a : k % 5 < 4 ? '#ffffff' : d.c, cx - hw, cy + yy, hw * 2 + 1, 1); }
    if (k === 8 || k === 9) { px(gl, d.a, cx - 2, cy - r - 4, 5, 3); px(gl, d.a, cx - 2, cy + r + 1, 5, 3); }
    if (k === 25) { px(gl, d.a, cx - 6, cy - 6, 4, 12); }
  }
  gl.globalAlpha = 1;
}

// ---------- spires: the space elevator ----------
function elevator(g, gl, W, H, d, s) {
  const R = ramp('#3a4a6a', 6), M = ramp('#8a98b8', 5), mid = Math.floor(W / 2);
  // the tether: a braided pair of cables up out of the picture, beads of light, maintenance pods
  px(g, R[1], mid - 3, 0, 6, H - 110); px(g, R[3], mid - 2, 0, 1, H - 110); px(g, R[4], mid + 1, 0, 1, H - 110);
  for (let y = 0; y < H - 110; y += 6) px(g, R[0], mid - 3, y, 6, 1);
  for (let y = 3; y < H - 110; y += 12) glow(gl, d.b, 0.9, mid - 3, y, 6, 1);
  // the ring station: a wide ellipse with modules, windows, docking lights
  const ry = 50, rx = 130;
  for (let a = 0; a < 420; a++) { const t = (a / 420) * Math.PI * 2, x = mid + Math.cos(t) * rx, yy = ry + Math.sin(t) * 16, front = Math.sin(t) > 0; px(g, INK, x - 1, yy - 1, 5, 6); px(g, front ? R[4] : R[2], x, yy, 3, 4); px(g, front ? R[5] : R[3], x, yy, 3, 1); if (a % 14 === 0) { panel(g, x - 4, yy - 3, 9, 8, R, { line: INK }); if (front) cell(g, gl, x - 2, yy - 1, 5, 2, true, '#a8e0ff', R[0]); } if (a % 10 === 0) glow(gl, front ? d.a : d.b, 0.8, x, yy + 2, 2, 1); }
  panel(g, mid - 18, ry - 14, 36, 28, R, { line: INK });
  for (let k = 0; k < 4; k++) cell(g, gl, mid - 14 + k * 8, ry - 8, 5, 10, true, d.c, R[0]);
  for (const k of [-1, 1]) for (let i = 0; i < 40; i++) px(g, R[2], mid + k * (18 + i * 2.8), ry + Math.round(i * 0.05), 2, 1); // spokes
  // the arcology at its foot: a stepped pyramid of terraces, lit windows, gardens
  const base = H - 110;
  for (let k = 0; k < 8; k++) {
    const tw = 40 + k * 26, ty = base + k * 14;
    panel(g, mid - Math.floor(tw / 2), ty, tw, 14, R, { line: INK });
    for (let x = mid - Math.floor(tw / 2) + 3; x < mid + Math.floor(tw / 2) - 4; x += 4) cell(g, gl, x, ty + 4, 2, 5, noise(x, k, s) < 0.6, '#ffd98a', R[1]);
    for (let x = mid - Math.floor(tw / 2); x < mid + Math.floor(tw / 2); x += 3) if (noise(x, k + 40, s) < 0.4) px(g, '#3a8a5a', x, ty - 1, 2, 2);
    px(g, mix(d.a, '#ffffff', 0.3), mid - Math.floor(tw / 2), ty + 12, tw, 1); glow(gl, d.a, 0.6, mid - Math.floor(tw / 2), ty + 12, tw, 1);
  }
  // two flanking needles with lit crowns
  for (const sx of [mid - 150, mid + 122]) {
    px(g, INK, sx - 1, H - 211, 30, 211); vgrad(g, sx, H - 210, 28, 210, [R[4], R[3], R[2], R[1]]); px(g, R[5], sx, H - 210, 1, 210);
    for (let yy = H - 204; yy < H; yy += 4) for (let x = sx + 3; x < sx + 25; x += 3) cell(g, gl, x, yy, 2, 2, noise(x, yy, s) < 0.55, '#a8d8ff', R[0]);
    for (let k = 0; k < 40; k++) { const hw = Math.round(14 * (1 - k / 40)); px(g, k % 6 ? R[3] : M[3], sx + 14 - hw, H - 211 - 40 + 40 - k, hw * 2, 1); }
    px(g, M[4], sx + 13, H - 270, 2, 20); glow(gl, d.a, 1, sx + 12, H - 272, 4, 4);
    px(g, mix(d.b, '#ffffff', 0.3), sx, H - 210, 1, 210); glow(gl, d.b, 0.7, sx, H - 210, 1, 210);
  }
}
function capsules(g, gl, x, y, W, H, d, env) {
  const mid = x + Math.floor(W / 2);
  for (let k = 0; k < 4; k++) { const t = ((env.cyc * 0.06 + k / 4) % 1), cy = y + H - 116 - t * (H - 116); px(g, INK, mid - 6, cy - 1, 12, 12); px(g, '#c8d8f0', mid - 5, cy, 10, 10); px(g, '#e8f4ff', mid - 5, cy, 10, 1); px(g, '#1a2a3a', mid - 3, cy + 3, 6, 3); glow(gl, d.b, 1, mid - 5, cy + 10, 10, 1); glow(gl, '#ffffff', 0.8, mid - 3, cy + 3, 6, 3); }
  if (env.beat < 0.25) glow(gl, '#ff2f3f', 1, mid - 2, y, 4, 3);
}

// ---------- stacks: the refinery ----------
function refinery(g, gl, W, H, d, s) {
  const R = ramp('#6a5a4c', 7), P = ramp('#7a6a58', 5), mid = Math.floor(W / 2);
  // cooling towers: a hyperbolic profile, shaded across, bands and stains, a lit rim
  for (const [cx, tw, th] of [[mid - 92, 110, 200], [mid + 64, 130, 236]]) {
    for (let k = 0; k < th; k++) {
      const t = k / th, hw = Math.round((tw / 2) * (0.6 + 0.4 * Math.pow((t - 0.68) / 0.68, 2)));
      for (let x = -hw; x <= hw; x++) { const u = (x + hw) / (hw * 2), i = Math.max(0, Math.min(6, Math.round((1 - Math.abs(u - 0.32) / 0.68) * 6 + (bayer(x, k) - 0.5) + (noise(x, k, s) < 0.05 ? -1 : 0)))); px(g, R[i], cx + x, H - th + k, 1, 1); }
      if (k % 16 === 0) { px(g, R[1], cx - hw, H - th + k, hw * 2, 1); px(g, R[4], cx - hw, H - th + k + 1, hw, 1); }
      if (k < 6) px(g, R[0], cx - hw, H - th + k, hw * 2, 1);
    }
    for (let k = 0; k < 9; k++) px(g, R[1], cx - Math.round(tw * 0.3) + Math.floor(noise(k, 3, s) * tw * 0.6), H - th + 6, 1, 20 + Math.floor(noise(k, 4, s) * 50)); // streaks
    for (let k = -3; k <= 3; k++) glow(gl, '#ff3f3f', 1, cx + k * Math.round(tw / 8), H - th + 3, 2, 1);
  }
  // banded chimneys
  for (const [cx, ch, cw] of [[mid - 14, 260, 12], [mid + 6, 240, 10], [mid + 146, 190, 12], [mid - 160, 170, 10]]) { vcyl(g, cx, H - ch, cw, ch, R); for (let y = H - ch + 8; y < H; y += 18) { px(g, '#e8e0d0', cx, y, cw, 4); px(g, '#c8302a', cx, y + 4, cw, 4); } for (let k = 0; k < ch; k += 24) px(g, P[1], cx - 2, H - ch + k, cw + 4, 1); px(g, INK, cx - 1, H - ch - 1, cw + 2, 2); }
  // pipe racks, valves, a gantry walkway with lights
  for (const [y, h] of [[H - 52, 6], [H - 66, 5], [H - 76, 4]]) hcyl(g, mid - 176, y, 352, h, P);
  for (let x = mid - 172; x < mid + 176; x += 22) { px(g, INK, x - 1, H - 78, 4, 78); px(g, P[2], x, H - 78, 2, 78); for (let k = 0; k < 20; k++) px(g, P[1], x + k, H - 78 + k, 1, 1); }
  for (let x = mid - 170; x < mid + 170; x += 30) { disc(g, x, H - 50, 3, '#c8302a'); px(g, '#e8e0d0', x - 1, H - 51, 1, 1); }
  for (let x = mid - 170; x < mid + 170; x += 8) glow(gl, '#ffb860', 0.7, x, H - 80, 2, 1);
  // spherical tanks
  for (const [cx, r] of [[mid - 182, 26], [mid + 196, 30]]) { disc(g, cx, H - r - 6, r + 1, INK); for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) { const l = 1 - Math.hypot(xx + r * 0.35, yy + r * 0.35) / (r * 1.8); px(g, R[Math.max(0, Math.min(6, Math.floor((l + bayer(xx, yy) * 0.2) * 7)))], cx + xx, H - r - 6 + yy); } for (const lx of [-r + 4, r - 6]) px(g, P[1], cx + lx, H - 10, 3, 10); px(g, '#e8e0d0', cx - 10, H - r - 8, 20, 3); }
  // the plant: a low block with lit windows
  panel(g, mid - 140, H - 34, 280, 34, R, { line: INK });
  for (let x = mid - 134; x < mid + 134; x += 6) cell(g, gl, x, H - 26, 4, 3, noise(x, 1, s) < 0.6, '#ffb860', R[1]), cell(g, gl, x, H - 16, 4, 3, noise(x, 2, s) < 0.5, '#ffb860', R[1]);
}
function flames(g, gl, x, y, W, H, d, env) {
  const mid = x + Math.floor(W / 2);
  for (const [cx, ch, cw] of [[mid - 14, 260, 12], [mid + 6, 240, 10], [mid + 146, 190, 12]]) { const f = Math.floor(env.cyc * 8 + cx) % 3, top = y + H - ch; for (let k = 0; k < 12 + f * 3; k++) { const c = k < 3 ? '#ffffff' : k < 7 ? '#ffd23f' : '#ff6a2f'; gl.globalAlpha = 1 - k / 20; px(gl, c, cx + cw / 2 - Math.floor((cw - k / 2) / 2) + Math.round(Math.sin(env.cyc * 9 + k) * 1.5), top - k, Math.max(1, cw - k / 2), 1); } gl.globalAlpha = 1; }
  for (const [cx, th] of [[mid - 92, 200], [mid + 64, 236]]) for (let p = 0; p < 9; p++) { const a = (env.cyc * 0.1 + p / 9) % 1; g.globalAlpha = 0.28 * (1 - a); disc(g, cx + Math.sin(a * 5 + p) * 10, y + H - th - a * 80, 12 + Math.round(a * 24), '#c8b8b0'); }
  g.globalAlpha = 1;
}

// ---------- oldtown: the gate and the temple ----------
function gate(g, gl, W, H, d, s) {
  const RED = ramp('#c8302a', 6, { warm: '#ffd0a0' }), RF = ramp('#2a1a24', 6), ST = ramp('#6a6470', 5), mid = Math.floor(W / 2);
  // the hill with a long stair, the temple on it: two roofs with upturned ends, lit screens, a gold finial
  for (let k = 0; k < 70; k++) { const hw = 70 + k * 2.4; px(g, mix('#2a2030', '#140e1a', k / 70), mid - hw, H - 70 + k, hw * 2, 1); if (noise(k, 0, s) < 0.5) px(g, '#2a4a30', mid - hw + Math.floor(noise(k, 1, s) * hw), H - 70 + k, 4, 1); }
  for (let k = 0; k < 18; k++) { px(g, ST[3], mid - 14 + k / 3, H - 70 + k * 4, 28 - (k / 3) * 2, 1); px(g, ST[1], mid - 14 + k / 3, H - 69 + k * 4, 28 - (k / 3) * 2, 1); }
  const ty = H - 130;
  panel(g, mid - 64, ty, 128, 60, ramp('#5a3a3a', 5), { line: INK });
  for (let x = mid - 58; x < mid + 58; x += 14) { vcyl(g, x, ty + 4, 4, 56, RED); cell(g, gl, x + 5, ty + 14, 8, 36, true, '#ffcf7a', RF[1]); for (let k = ty + 16; k < ty + 50; k += 5) px(g, '#c89a5a', x + 5, k, 8, 1); }
  const roof = (yy, hw0, rows) => { for (let k = 0; k < rows; k++) { const hw = hw0 + k * 3; for (let x = -hw; x < hw; x++) px(g, k === rows - 1 ? RF[0] : (x & 1) ? RF[3] : RF[2], mid + x, yy + k, 1, 1); } for (let k = 0; k < 10; k++) { px(g, RF[3], mid - hw0 - rows * 3 - 6 + k, yy + rows - 8 + Math.floor(k * k / 14), 2, 3); px(g, RF[3], mid + hw0 + rows * 3 + 4 - k, yy + rows - 8 + Math.floor(k * k / 14), 2, 3); } };
  roof(ty - 20, 54, 20); panel(g, mid - 40, ty - 40, 80, 18, ramp('#5a3a3a', 5), { line: INK }); for (let x = mid - 34; x < mid + 34; x += 10) cell(g, gl, x, ty - 36, 6, 10, true, '#ffcf7a', RF[1]); roof(ty - 56, 30, 16);
  px(g, '#d8b040', mid - 2, ty - 74, 4, 18); disc(g, mid, ty - 76, 3, '#e8c860'); glow(gl, '#ffd080', 0.6, mid - 3, ty - 79, 7, 7);
  // stone lanterns on the hill
  for (const lx of [mid - 100, mid + 92]) { panel(g, lx, H - 40, 8, 4, ST, { line: INK }); px(g, ST[2], lx + 2, H - 36, 4, 20); panel(g, lx - 2, H - 54, 12, 10, ST, { line: INK }); cell(g, gl, lx + 1, H - 51, 6, 4, true, '#ffcf7a', ST[0]); tri(g, lx + 4, H - 62, 16, 8, ST[3]); }
  // the gate in front: two pillars with black feet, a tie beam, the top beam curving up at the ends
  const gy = H - 260, gw = 280;
  for (const p0 of [mid - 104, mid + 88]) { px(g, INK, p0 - 1, gy + 44, 18, H - gy - 44); vcyl(g, p0, gy + 44, 16, H - gy - 44, RED); panel(g, p0 - 3, H - 18, 22, 18, ramp('#1a1a1e', 4), { line: INK }); for (let k = gy + 60; k < H - 20; k += 30) px(g, RED[1], p0, k, 16, 1); }
  panel(g, mid - 120, gy + 52, 240, 10, RED, { line: INK });
  for (let k = 0; k < 14; k++) { const yy = gy + 14 + k; px(g, k < 4 ? RF[4] : k < 10 ? RF[2] : RF[1], mid - Math.floor(gw / 2), yy, gw, 1); }
  for (let k = 0; k < 16; k++) { const yy = gy + 4 + Math.floor(k * k / 22); px(g, RF[2], mid - Math.floor(gw / 2) - 14 + k, yy, 5, 6); px(g, RF[2], mid + Math.floor(gw / 2) + 9 - k, yy, 5, 6); }
  panel(g, mid - Math.floor(gw / 2) + 10, gy + 30, gw - 20, 10, RED, { line: INK });
  // the plaque between the beams, a neon glyph on it
  panel(g, mid - 14, gy + 36, 28, 24, ramp('#1a1020', 4), { line: '#d8b040' });
  glyph(g, mid - 7, gy + 41, s * 3, mix(d.c, '#ffffff', 0.4), 14); glyph(gl, mid - 7, gy + 41, s * 3, d.c, 14);
  // lanterns on strings from pillar to pillar
  for (let row = 0; row < 2; row++) for (let k = 0; k < 16; k++) { const x = mid - 92 + k * 12, yy = gy + 80 + row * 34 + Math.round(Math.sin((k / 15) * Math.PI) * 14); px(g, '#5a4a40', x - 6, yy - 1, 12, 1); px(g, '#c8202a', x, yy, 5, 7); px(g, '#ff5a3a', x + 1, yy, 3, 1); px(g, '#ffd23f', x + 2, yy + 2, 1, 3); glow(gl, '#ff5a2a', 0.8, x - 1, yy - 1, 7, 9); }
}
function petals(g, gl, x, y, W, H, d, env) {
  for (let k = 0; k < 40; k++) { const t = (env.cyc * 0.08 + k / 40) % 1, px0 = x + ((k * 53) % W), py = y + 30 + t * (H - 30); gl.globalAlpha = 0.6 * (1 - t); px(gl, '#ffb0d0', px0 + Math.sin(t * 12 + k) * 8, py, 2, 1); }
  gl.globalAlpha = 1;
}

// ---------- harbor: cranes and a ship ----------
function harbor(g, gl, W, H, d, s) {
  const R = ramp('#2a3a48', 6), CR = ramp('#c84a2a', 6), mid = Math.floor(W / 2), cols = ['#c84a2a', '#2a6ac8', '#e8c040', '#3aa06a', '#8a8aa0', '#c8c8d0', '#6a3a8a'];
  // the ship: a long hull, five rows of containers, a white bridge tower with windows
  const hy = H - 40;
  g.fillStyle = INK; g.beginPath(); g.moveTo(mid - 180, hy); g.lineTo(mid + 190, hy); g.lineTo(mid + 170, H); g.lineTo(mid - 166, H); g.fill();
  for (let y = hy + 1; y < H; y++) { const t = (y - hy) / 40; px(g, t < 0.1 ? R[5] : t < 0.45 ? R[2] : t < 0.55 ? '#e8e4f0' : '#8a2a2a', mid - 178 + t * 12, y, 366 - t * 32, 1); }
  for (let k = 0; k < 8; k++) px(g, R[1], mid - 170 + k * 46, hy + 4, 1, 12);
  for (let x = mid - 166; x < mid + 110; x += 13) { const n = 2 + Math.floor(noise(x, 0, s) * 4); for (let k = 0; k < n; k++) { const c = cols[Math.floor(noise(x, k, s) * cols.length)]; panel(g, x, hy - 9 - k * 9, 12, 8, ramp(c, 4), { line: INK }); for (let j = 2; j < 11; j += 3) px(g, shade(c, -0.3), x + j, hy - 8 - k * 9, 1, 6); } }
  panel(g, mid + 126, hy - 64, 40, 64, ramp('#e8e4f0', 5), { line: INK });
  for (let yy = hy - 58; yy < hy - 6; yy += 8) { px(g, '#1a2a3a', mid + 129, yy, 34, 4); for (let x = mid + 130; x < mid + 162; x += 5) cell(g, gl, x, yy, 3, 3, noise(x, yy, s) < 0.6, '#ffd98a', '#1a2a3a'); }
  panel(g, mid + 120, hy - 70, 52, 6, ramp('#e8e4f0', 5), { line: INK }); px(g, '#5a5a6a', mid + 146, hy - 92, 2, 22); glow(gl, '#ff2f3f', 1, mid + 145, hy - 93, 4, 3);
  // two cranes: braced legs, a long boom over the ship, a machinery house, the spreader on cables
  for (const [cx, by] of [[mid - 120, 40], [mid + 10, 16]]) {
    for (const lx of [cx, cx + 56]) { px(g, INK, lx - 1, by + 34, 9, H - by - 34); vcyl(g, lx, by + 34, 7, H - by - 34, CR); for (let y = by + 46; y < H - 40; y += 22) for (let k = 0; k < 22; k++) px(g, CR[2], lx + 7 + k * 49 / 22, y + k, 2, 1); }
    panel(g, cx - 70, by + 24, 210, 10, CR, { line: INK });
    for (let k = 0; k < 210; k += 8) { px(g, CR[1], cx - 70 + k, by + 14, 1, 10); for (let j = 0; j < 8; j++) px(g, CR[1], cx - 70 + k + j, by + 14 + j * 10 / 8, 1, 1); }
    px(g, CR[3], cx - 70, by + 14, 210, 1);
    tri(g, cx + 28, by - 20, 50, 34, CR[2]); for (let k = 0; k < 100; k++) px(g, '#3a3a48', cx + 28 - k * 0.98, by - 20 + k * 0.34, 1, 1);
    panel(g, cx + 14, by + 34, 28, 18, ramp('#e8e4f0', 4), { line: INK }); px(g, '#7fd8f0', cx + 17, by + 37, 22, 6); glow(gl, '#a8e0ff', 0.5, cx + 17, by + 37, 22, 6);
    const sp = cx - 40; px(g, '#2a2a3a', sp, by + 34, 1, 80); px(g, '#2a2a3a', sp + 10, by + 34, 1, 80); panel(g, sp - 4, by + 114, 18, 4, ramp('#e8c040', 4), { line: INK }); panel(g, sp - 3, by + 118, 16, 9, ramp(cols[(cx + by) % 7], 4), { line: INK });
    glow(gl, '#ff2f3f', 1, cx + 27, by - 22, 4, 3); glow(gl, '#ff2f3f', 1, cx - 70, by + 24, 3, 2); glow(gl, '#ff2f3f', 1, cx + 138, by + 24, 3, 2);
    for (let x = cx - 66; x < cx + 136; x += 12) glow(gl, '#ffd98a', 0.7, x, by + 33, 2, 1);
  }
}
function sweep(g, gl, x, y, W, H, d, env) {
  // a lighthouse beam from the right, sweeping across the haze
  const a = Math.sin(env.cyc * 0.4) * 0.9, ox = x + W - 8, oy = y + 40;
  gl.globalAlpha = 0.06; for (let k = 0; k < 320; k += 2) { const w2 = 1 + k / 6; px(gl, '#e8f4ff', ox - Math.cos(a) * k, oy + Math.sin(a) * k * 0.3 - w2 / 2, 2, w2); } gl.globalAlpha = 1;
  // the ship's deck lights blink in a chase
  for (let k = 0; k < 24; k++) if ((k + Math.floor(env.cyc * 4)) % 6 === 0) px(gl, d.a, x + W / 2 - 170 + k * 15, y + H - 40, 3, 1);
}

// ---------- datacore: the pyramid ----------
function pyramid(g, gl, W, H, d, s) {
  const R = ramp('#1a2e28', 7), mid = Math.floor(W / 2), ph = 230;
  for (let k = 0; k < ph; k++) {
    const hw = Math.round(k * 0.9), y = H - ph + k, step = k % 12;
    for (let x = -hw; x < hw; x++) { const left = x < 0, n = noise(x, k, s); px(g, step === 0 ? R[left ? 3 : 4] : step === 11 ? R[0] : left ? (n < 0.08 ? R[2] : R[1]) : (n < 0.08 ? R[3] : R[2]), mid + x, y, 1, 1); }
    if (step === 1) for (let x = -hw + 3; x < hw - 3; x += 5) if (noise(x, k, s + 1) < 0.5) glow(gl, d.a, 0.4, mid + x, y + 4, 3, 1);
  }
  // circuits: paths of light down the faces with nodes
  for (let c = 0; c < 28; c++) {
    let x = mid + Math.floor((noise(c, 0, s) - 0.5) * 120), y = H - ph + 40 + Math.floor(noise(c, 1, s) * 60);
    for (let k = 0; k < 70; k++) { const hw = Math.round((y - (H - ph)) * 0.9); if (Math.abs(x - mid) > hw - 3 || y >= H - 30) break; px(g, mix(d.a, R[2], 0.45), x, y, 1, 1); glow(gl, d.a, 0.5, x, y, 1, 1); if (noise(c, k, s) < 0.3) x += x < mid ? -1 : 1; y += 1; if (k % 13 === 12) { px(g, d.c, x - 1, y, 3, 2); glow(gl, d.c, 1, x - 1, y, 3, 2); } }
  }
  // the capstone of light and the eye socket
  tri(g, mid, H - ph - 1, 30, 26, '#d8ffe0');
  // a ring of server towers at the base
  for (let x = mid - 200; x < mid + 200; x += 18) { panel(g, x, H - 30, 16, 30, R, { line: INK }); for (let y = H - 26; y < H - 2; y += 3) { const on = noise(x, y, s) < 0.6; px(g, on ? d.a : R[1], x + 2, y, 12, 1); if (on) glow(gl, d.a, 0.5, x + 2, y, 12, 1); } }
}
function eye(g, gl, x, y, W, H, d, env) {
  const mid = x + Math.floor(W / 2), cy = y + H - 140, open = Math.min(1, (env.lv.bass || 0) * 0.8 + (env.lv.kick || 0) * 0.5), r = 22;
  for (let k = -r; k <= r; k++) { const hh = Math.round(Math.sqrt(r * r - k * k) * 0.42 * (0.15 + open * 0.85)); px(g, '#020604', mid + k, cy - hh, 1, hh * 2 + 1); glow(gl, d.a, 0.4, mid + k, cy - hh - 1, 1, 1); glow(gl, d.a, 0.4, mid + k, cy + hh + 1, 1, 1); }
  if (open > 0.15) { disc(g, mid, cy, 6, d.c); px(g, '#020604', mid - 1, cy - 4, 3, 8); disc(gl, mid, cy, 7, d.c); }
  gl.globalAlpha = 0.4 + (env.lv.kick || 0) * 0.5; tri(gl, mid, y + H - 231, 30, 26, '#a8ffc0'); gl.globalAlpha = 1;
  if (env.kick > 0.2) { gl.globalAlpha = env.kick * 0.3; px(gl, d.a, mid - 2, 0, 5, y + H - 230); gl.globalAlpha = 1; }
}

const BUILD = { market: [pagoda, koi, 300, 330], spires: [elevator, capsules, 320, 300], stacks: [refinery, flames, 440, 280], oldtown: [gate, petals, 340, 290], harbor: [harbor, sweep, 400, 220], datacore: [pyramid, eye, 440, 270] };
// the landmark of a district: { c, l, w, h, beat(g, gl, x, y, env) }
export function landmark(kind, d, seed = 0) {
  const [paint, beat, W, H] = BUILD[kind] || BUILD.market;
  const b = bake(`lm|${kind}|${seed % 3}`, W, H, (g, gl) => paint(g, gl, W, H, d, seed % 3), { line: INK });
  if (!b.beat) b.beat = (g, gl, x, y, env) => beat(g, gl, x, y, W, H, d, env);
  return b;
}

export function landmarkSheet() {
  const D = { market: { a: '#ff2fa8', b: '#29e6ff', c: '#ffd23f' }, spires: { a: '#4fc3ff', b: '#e8f4ff', c: '#9a7cff' }, stacks: { a: '#ff8a2f', b: '#ffd23f', c: '#ff3f3f' }, oldtown: { a: '#ff3f5a', b: '#ffb43f', c: '#3fffb0' }, harbor: { a: '#3fffd8', b: '#2f8fff', c: '#ff6f3f' }, datacore: { a: '#5aff6a', b: '#29e6ff', c: '#d0ff3f' } };
  const c = new OffscreenCanvas(1340, 680), g = c.getContext('2d'), gl = new OffscreenCanvas(1340, 680).getContext('2d');
  g.fillStyle = '#2a1840'; g.fillRect(0, 0, 1340, 680);
  const env = { cyc: 2.3, beat: 0.1, kick: 0.6, lv: { kick: 0.7, bass: 0.6, pad: 0.4 } };
  LANDMARKS.forEach((k, i) => { const b = landmark(k, D[k], 1), x = (i % 3) * 450, y = Math.floor(i / 3) * 340 + 335 - b.h; g.drawImage(b.c, x, y); gl.drawImage(b.l, x, y); b.beat(g, gl, x, y, env); });
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7; g.drawImage(gl.canvas, 0, 0);
  return c;
}
