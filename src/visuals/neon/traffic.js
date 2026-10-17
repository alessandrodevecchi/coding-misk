// Street traffic of the neon city v3 (procedural-visuals): cars, cabs, delivery vans and bikes that come the other
// way in the far lane, behind the truck. Each model and colour is baked once; the lights are drawn on the light canvas.
import { bake, px, disc, ramp, panel, vgrad, mix, shade } from '../pixel-art.js';
import { person, figure, FIG_W, FIG_H } from './people.js';

const INK = '#07040f';
export const MODELS = ['sedan', 'cab', 'van', 'bike', 'sedan', 'cab'];
const COLOURS = ['#c84a3a', '#2a5ac8', '#e8e4f0', '#2a2a34', '#d8a020', '#3a8a5a', '#7a3ac8', '#c83a8a'];

// a vehicle facing left (it comes towards the truck's front), wheels on the ground at the bottom of the picture
export function vehicle(model, col) {
  const size = { sedan: [74, 26], cab: [74, 30], van: [84, 34], bike: [36, 30] }[model];
  return bake(`veh|${model}|${col}`, size[0], size[1], (g, gl, W, H) => {
    const B = ramp(model === 'cab' ? '#e8c020' : col, 6), GL = ramp('#7fd8f0', 5, { warm: '#ffffff' }), T = ramp('#1a1a22', 4), M = ramp('#8a8aa0', 4);
    const wheel = (cx) => { disc(g, cx, H - 5, 5, INK); disc(g, cx, H - 5, 4, T[1]); disc(g, cx, H - 5, 2, M[2]); px(g, M[3], cx - 1, H - 6, 1, 1); };
    if (model === 'bike') {
      wheel(7); wheel(W - 8);
      g.fillStyle = INK; g.beginPath(); g.moveTo(4, H - 9); g.lineTo(10, H - 16); g.lineTo(26, H - 17); g.lineTo(W - 4, H - 10); g.lineTo(W - 10, H - 7); g.lineTo(8, H - 7); g.fill();
      px(g, B[3], 9, H - 15, 18, 5); px(g, B[5], 9, H - 15, 18, 1); px(g, B[1], 9, H - 11, 20, 2);
      px(g, '#fff6d0', 3, H - 14, 3, 2); px(gl, '#fff6d0', 2, H - 15, 4, 3); px(gl, '#ff2f5a', W - 4, H - 12, 2, 2);
      const rider = figure(person('rider' + col, { hairdo: 'cap' }), 'dj', { flip: true });
      g.drawImage(rider.c, Math.round(W / 2 - FIG_W / 2) - 1, H - FIG_H - 2 + 12);
      return;
    }
    const roofY = model === 'van' ? 2 : model === 'cab' ? 8 : 6, beltY = H - 15;
    // body: a hood, a cabin, a trunk; shaded from a light above
    g.fillStyle = INK; g.beginPath();
    if (model === 'van') { g.moveTo(1, beltY + 2); g.lineTo(6, roofY + 10); g.lineTo(16, roofY); g.lineTo(W - 2, roofY); g.lineTo(W - 1, H - 6); g.lineTo(1, H - 6); }
    else { g.moveTo(1, beltY + 1); g.lineTo(4, beltY - 4); g.lineTo(18, beltY - 5); g.lineTo(26, roofY); g.lineTo(50, roofY); g.lineTo(60, beltY - 5); g.lineTo(W - 2, beltY - 3); g.lineTo(W - 1, H - 6); g.lineTo(1, H - 6); }
    g.fill();
    // fill inside the outline row by row, from light to dark
    for (let y = roofY + 1; y < H - 6; y++) {
      const t = (y - roofY) / (H - roofY - 6), c = y < beltY - 4 ? B[4] : y < beltY ? B[5] : t < 0.85 ? B[3] : B[1];
      // the outline was drawn with a path: its span on this row comes from the same shape
      const span = model === 'van' ? [y < roofY + 10 ? Math.max(2, 16 - (y - roofY) * 1.1) : 2, W - 2] : [y < beltY - 4 ? (y < beltY - 5 ? 26 - (y - roofY) * 8 / (beltY - 5 - roofY) : 4) : 2, y < beltY - 4 ? (y < beltY - 5 ? 50 + (y - roofY) * 10 / (beltY - 5 - roofY) : W - 3) : W - 2];
      const l = Math.round(span[0]), r = Math.round(span[1]);
      if (r > l) px(g, c, l, y, r - l, 1);
    }
    // windows
    if (model === 'van') { for (let y = roofY + 3; y < roofY + 11; y++) px(g, y < roofY + 5 ? GL[3] : GL[1], Math.round(Math.max(5, 16 - (y - roofY) * 1.1)) + 1, y, 14, 1); px(g, B[2], 22, roofY + 2, 1, H - roofY - 9); px(g, B[2], 50, roofY + 2, 1, H - roofY - 9); }
    else { for (let y = roofY + 2; y < beltY - 5; y++) { const l = Math.round(26 - (y - roofY) * 8 / (beltY - 5 - roofY)) + 2, r = Math.round(50 + (y - roofY) * 10 / (beltY - 5 - roofY)) - 2; px(g, y < roofY + 4 ? GL[3] : mix(GL[2], GL[0], (y - roofY) / (beltY - roofY)), l, y, r - l, 1); } px(g, B[2], 38, roofY + 1, 2, beltY - roofY - 5); px(g, GL[4], 30, roofY + 3, 2, 3); }
    // trim, door lines, handles, a bumper, lights
    px(g, B[5], 2, beltY, W - 4, 1); px(g, B[0], 36, beltY, 1, 10); px(g, M[2], 30, beltY + 2, 3, 1); px(g, M[2], 44, beltY + 2, 3, 1);
    px(g, M[1], 1, H - 8, W - 2, 2); px(g, M[3], 1, H - 8, W - 2, 1);
    px(g, '#fff6d0', 1, beltY + 1, 3, 2); px(gl, '#fff6d0', 0, beltY, 5, 4);
    px(g, '#ff2f3f', W - 3, beltY, 2, 3); px(gl, '#ff2f3f', W - 4, beltY - 1, 4, 5);
    if (model === 'cab') { panel(g, 32, roofY - 5, 12, 4, ramp('#1a1a22', 4), { line: INK }); px(g, '#ffd23f', 34, roofY - 4, 8, 2); px(gl, '#ffd23f', 34, roofY - 4, 8, 2); for (let k = 4; k < W - 4; k += 6) px(g, (k / 6) % 2 ? '#14101c' : '#e8e4f0', k, beltY + 5, 3, 2); }
    if (model === 'van') { panel(g, 28, roofY + 6, 30, 10, ramp('#e8e4f0', 4), { line: INK }); px(g, '#c83a3a', 31, roofY + 9, 24, 4); }
    wheel(14); wheel(W - 15);
    // an underglow strip
    px(gl, '#29e6ff', 10, H - 4, W - 20, 1);
  });
}

// the vehicle passing now, if any: one every few bars, seeded by its slot
export function passing(cyc, rnd) {
  const slot = Math.floor(cyc / 5), t = (cyc - slot * 5) / 2.2;
  if (t > 1 || rnd('veh', slot) > 0.55) return null;
  return { t, model: MODELS[Math.floor(rnd('vm', slot) * MODELS.length)], col: COLOURS[Math.floor(rnd('vc', slot) * COLOURS.length)] };
}
