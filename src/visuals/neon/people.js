// People of the neon city v3 (procedural-visuals): figures about 34 pixels tall built from a skeleton, so one drawing
// gives many poses (dance moves, a DJ at the decks, walking). A figure is made from a seed: build, skin, hair style,
// jacket, trousers, boots, a visor or headphones. Each figure and pose is baked once with its outline.
import { bake, px, disc, ramp, mix, shade } from '../pixel-art.js';
import { stream } from '../scroller.js';

const SKIN = ['#f2c7a5', '#d9a07a', '#b0744c', '#7c4a2c', '#5a341e', '#e8b48a'];
const HAIR = ['#14101c', '#3a2418', '#c8c0d8', '#ff3fa8', '#29e6ff', '#ffd23f', '#7a2fff', '#e8e8f0', '#b8401c'];
const CLOTH = ['#2a2e4a', '#4a1e3a', '#1e3a4a', '#3a3a3a', '#5a2a1e', '#e8e4f0', '#1a1a22', '#6a4a8a', '#2a4a2a'];
const NEON = ['#ff2fa8', '#29e6ff', '#ffd23f', '#5aff6a', '#ff6a2f', '#b07cff'];
const HAIRDO = ['short', 'mohawk', 'bob', 'long', 'buns', 'cap', 'shaved', 'spikes', 'hood'];

// a figure from a seed
export function person(seed, opts = {}) {
  const r = stream('person', seed);
  return {
    seed, skin: r.pick(SKIN), hair: r.pick(HAIR), hairdo: opts.hairdo || r.pick(HAIRDO), jacket: r.pick(CLOTH), pants: r.pick(CLOTH.slice(0, 5).concat(['#14141c', '#2a2a3a'])),
    trim: r.pick(NEON), boots: r.pick(['#14101c', '#3a2a1e', '#e8e8f0', '#5a1a2a']), visor: r.chance(0.35), phones: r.chance(0.25), coat: r.chance(0.3), tall: r.int(0, 2), slim: r.chance(0.5),
  };
}

// poses: angles in degrees (0 is straight down) for upper arm, forearm, thigh, shin on each side, a torso lean, a body
// drop (pixels), head tilt. Back side first (b), front side (f).
export const POSES = {
  stand: { lean: 0, drop: 0, ab: [8, 4], af: [-8, -4], lb: [3, 0], lf: [-3, 0] },
  bounce: { lean: 0, drop: 1, ab: [20, 70], af: [-20, -70], lb: [8, -6], lf: [-8, 6] },
  armsUp: { lean: 0, drop: 0, ab: [-145, -165], af: [145, 165], lb: [6, 0], lf: [-6, 0] },
  pumpL: { lean: -4, drop: 1, ab: [-150, -170], af: [30, 100], lb: [10, -4], lf: [-6, 8] },
  pumpR: { lean: 4, drop: 0, ab: [-30, -95], af: [150, 172], lb: [4, 0], lf: [-12, 10] },
  sway: { lean: 6, drop: 1, ab: [35, 80], af: [10, 60], lb: [14, -8], lf: [-2, 4] },
  swayB: { lean: -6, drop: 1, ab: [-15, -60], af: [-40, -85], lb: [2, -4], lf: [-14, 8] },
  clap: { lean: 0, drop: 0, ab: [40, 130], af: [50, 140], lb: [5, 0], lf: [-5, 0] },
  kick: { lean: -6, drop: 0, ab: [60, 100], af: [-50, -110], lb: [2, 0], lf: [-70, -20] },
  point: { lean: 2, drop: 0, ab: [10, 30], af: [115, 105], lb: [6, 0], lf: [-6, 0] },
  dj: { lean: 8, drop: 0, ab: [-30, -95], af: [-45, -100], lb: [3, 0], lf: [-3, 0] },
  djUp: { lean: 2, drop: 0, ab: [-30, -95], af: [150, 172], lb: [3, 0], lf: [-3, 0] },
  walkA: { lean: 2, drop: 0, ab: [25, 15], af: [-25, -35], lb: [-22, 10], lf: [22, 4] },
  walkB: { lean: 2, drop: 1, ab: [0, 5], af: [0, -5], lb: [-4, 18], lf: [6, 0] },
  walkC: { lean: 2, drop: 0, ab: [-25, -35], af: [25, 15], lb: [22, 4], lf: [-22, 10] },
};
export const DANCE = [['bounce', 'stand'], ['armsUp', 'bounce'], ['pumpL', 'pumpR'], ['sway', 'swayB'], ['clap', 'bounce'], ['kick', 'stand'], ['point', 'bounce']];
export const WALK = ['walkA', 'walkB', 'walkC', 'walkB'];

const rad = d => (d * Math.PI) / 180;
// a limb segment: a square brush of width w from a to b
function seg(g, ax, ay, bx, by, w, c) { const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)), o = Math.floor(w / 2); for (let i = 0; i <= n; i++) { const t = i / n; px(g, c, Math.round(ax + (bx - ax) * t) - o, Math.round(ay + (by - ay) * t) - o, w, w); } }
// a limb in two parts (upper, lower), each with a lit edge; returns the end point
function limb(g, x, y, a1, a2, l1, l2, w1, w2, r1, r2, end) {
  const ex = x + Math.sin(rad(a1)) * l1, ey = y + Math.cos(rad(a1)) * l1, hx = ex + Math.sin(rad(a2)) * l2, hy = ey + Math.cos(rad(a2)) * l2;
  seg(g, x, y, ex, ey, w1, r1[1]); seg(g, x - 0.6, y - 0.6, ex - 0.6, ey - 0.6, w1 - 1, r1[2]);
  seg(g, ex, ey, hx, hy, w2, r2[1]); seg(g, ex - 0.6, ey - 0.6, hx - 0.6, hy - 0.6, w2 - 1, r2[2]);
  if (end) end(Math.round(hx), Math.round(hy));
  return [hx, hy];
}

// bake a figure in a pose → { c, l, w, h }: 32×48 canvas, feet at the bottom middle (x 16, y 46)
export const FIG_W = 32, FIG_H = 48;
export function figure(p, poseName, { flip = false } = {}) {
  const P = POSES[poseName] || POSES.stand;
  return bake(`fig|${p.seed}|${p.hairdo}|${poseName}|${flip}`, FIG_W, FIG_H, (g, gl) => {
    if (flip) { g.translate(FIG_W, 0); g.scale(-1, 1); gl.translate(FIG_W, 0); gl.scale(-1, 1); }
    const sk = ramp(p.skin, 4), ja = ramp(p.jacket, 4), pa = ramp(p.pants, 4), hr = ramp(p.hair, 4), bo = ramp(p.boots, 4);
    const back = c => c.map(v => shade(v, -0.22));
    const thigh = 8 + Math.floor(p.tall / 2), shin = 8 + Math.ceil(p.tall / 2), hipY = 45 - thigh - shin + P.drop, hipX = 16, torso = 12 + (p.tall > 1 ? 1 : 0);
    const lean = rad(P.lean), shY = hipY - torso, shX = hipX + Math.sin(lean) * torso, half = p.slim ? 3 : 4;
    const boot = c => (x, y) => { px(g, c[0], x - 2, y - 1, 6, 3); px(g, c[2], x - 2, y - 1, 5, 1); px(g, c[3], x + 1, y - 1, 1, 1); };
    const hand = c => (x, y) => { px(g, c[1], x - 1, y - 1, 3, 3); px(g, c[2], x - 1, y - 1, 2, 2); };
    // back limbs, in shadow
    limb(g, hipX - 2, hipY, P.lb[0], P.lb[1], thigh, shin, 4, 4, back(pa), back(pa), boot(back(bo)));
    limb(g, shX - half + 1, shY + 2, P.ab[0], P.ab[1], 6, 6, 3, 3, back(ja), back(sk), hand(back(sk)));
    // a long coat: tails behind the legs
    if (p.coat) { px(g, ja[1], hipX - half, hipY - 1, half * 2 + 1, 7); px(g, ja[0], hipX - half, hipY + 5, half * 2 + 1, 1); px(g, ja[2], hipX - half, hipY - 1, 1, 6); }
    // torso: shoulders wider than the waist, shaded on the right, collar and zip
    for (let k = 0; k <= torso; k++) {
      const t = k / torso, cx = Math.round(shX + (hipX - shX) * t), cy = shY + k, hw = Math.round(half + 1 - t * 1.5 + (k < 2 ? 0 : 0));
      px(g, ja[2], cx - hw, cy, hw * 2 + 1, 1); px(g, ja[1], cx + hw - 2, cy, 3, 1); px(g, ja[3], cx - hw, cy, 1, 1);
      if (k > 1) px(g, ja[1], cx, cy, 1, 1);
    }
    px(g, ja[3], Math.round(shX) - half, shY, half * 2 + 1, 1);
    // belt
    px(g, pa[0], hipX - half + 1, hipY - 1, half * 2 - 1, 2); px(g, '#d8b050', hipX, hipY - 1, 2, 1);
    // neon trim: the edge of the jacket and a patch on the chest (light buffer too)
    const tc = mix(p.trim, '#ffffff', 0.35);
    px(g, tc, Math.round(shX) - half - 0, shY + 1, 1, torso - 2); px(gl, p.trim, Math.round(shX) - half, shY + 1, 1, torso - 2);
    px(g, tc, Math.round(shX) + 1, shY + 3, 2, 1); px(gl, p.trim, Math.round(shX) + 1, shY + 3, 2, 1);
    // head: neck, a face turned to the right, an eye, an ear, hair by style
    const hx = Math.round(shX + Math.sin(lean) * 4), hy = shY - 8;
    px(g, sk[1], hx - 1, shY - 1, 3, 2);
    px(g, sk[2], hx - 3, hy, 7, 7); px(g, sk[3], hx - 1, hy + 1, 3, 3); px(g, sk[1], hx - 3, hy + 5, 2, 2); px(g, sk[2], hx + 4, hy + 3, 1, 2);
    px(g, '#14101c', hx + 2, hy + 3, 1, 2); px(g, sk[1], hx + 1, hy + 6, 3, 1); px(g, sk[1], hx - 2, hy + 3, 1, 2);
    const H = hr[2], HD = hr[1], HL = hr[3], HK = hr[0];
    switch (p.hairdo) {
      case 'short': px(g, H, hx - 3, hy - 1, 7, 3); px(g, HD, hx - 4, hy, 2, 4); px(g, HL, hx - 1, hy - 1, 3, 1); px(g, HK, hx - 4, hy + 3, 1, 1); break;
      case 'mohawk': px(g, H, hx - 2, hy - 5, 3, 6); px(g, HL, hx - 1, hy - 5, 1, 4); px(g, HD, hx - 3, hy - 3, 1, 3); px(g, HD, hx - 4, hy + 1, 1, 3); break;
      case 'bob': px(g, H, hx - 4, hy - 1, 8, 3); px(g, H, hx - 4, hy, 3, 8); px(g, HD, hx - 4, hy + 5, 3, 3); px(g, HL, hx - 1, hy - 1, 3, 1); px(g, H, hx + 3, hy, 1, 2); break;
      case 'long': px(g, H, hx - 4, hy - 1, 8, 3); px(g, H, hx - 5, hy, 4, 12); px(g, HD, hx - 5, hy + 7, 3, 5); px(g, HL, hx - 1, hy - 1, 3, 1); px(g, HL, hx - 4, hy + 1, 1, 5); break;
      case 'buns': px(g, H, hx - 3, hy - 1, 7, 3); disc(g, hx - 3, hy - 2, 2, H); disc(g, hx + 3, hy - 2, 2, H); px(g, HL, hx - 4, hy - 3, 1, 1); px(g, HL, hx + 2, hy - 3, 1, 1); px(g, HD, hx - 4, hy, 1, 4); break;
      case 'cap': px(g, ja[3], hx - 3, hy - 2, 7, 3); px(g, ja[2], hx + 3, hy, 4, 1); px(g, ja[1], hx - 3, hy, 7, 1); px(g, tc, hx - 1, hy - 1, 2, 1); px(gl, p.trim, hx - 1, hy - 1, 2, 1); px(g, HD, hx - 4, hy + 1, 1, 3); break;
      case 'shaved': px(g, HD, hx - 3, hy - 1, 7, 1); px(g, HD, hx - 4, hy, 1, 3); px(g, hr[0], hx - 2, hy - 1, 1, 1); break;
      case 'spikes': for (let k = -3; k <= 3; k += 2) { px(g, H, hx + k, hy - 4 + Math.abs(k) / 2, 2, 4); px(g, HL, hx + k, hy - 4 + Math.abs(k) / 2, 1, 1); } px(g, H, hx - 3, hy - 1, 7, 2); px(g, HD, hx - 4, hy, 2, 4); break;
      case 'hood': px(g, ja[2], hx - 4, hy - 2, 9, 3); px(g, ja[2], hx - 5, hy, 3, 9); px(g, ja[1], hx - 5, hy + 4, 3, 5); px(g, ja[3], hx - 2, hy - 2, 4, 1); px(g, ja[0], hx + 4, hy, 1, 2); break;
    }
    if (p.visor) { px(g, '#14101c', hx - 1, hy + 2, 6, 3); px(g, mix(p.trim, '#ffffff', 0.5), hx, hy + 3, 5, 1); px(gl, p.trim, hx - 1, hy + 2, 6, 3); }
    if (p.phones) { px(g, '#14101c', hx - 3, hy - 2, 6, 1); px(g, '#2a2a3a', hx - 3, hy + 1, 3, 4); px(g, tc, hx - 3, hy + 2, 1, 2); px(gl, p.trim, hx - 3, hy + 2, 1, 2); }
    // front limbs
    limb(g, hipX + 2, hipY, P.lf[0], P.lf[1], thigh, shin, 4, 4, pa, pa, boot(bo));
    limb(g, shX + half - 1, shY + 2, P.af[0], P.af[1], 6, 6, 3, 3, ja, sk, hand(sk));
  }, { line: '#07040f' });
}

// a person at (x, feet y), with dance moves picked by the seed; f: the beat count (changes the pose)
export function dancer(g, gl, p, x, y, f, { move, flip } = {}) {
  const m = DANCE[move ?? (p.seed % DANCE.length)], b = figure(p, m[f % 2], { flip: flip ?? !!(p.seed % 2) });
  g.drawImage(b.c, Math.round(x - FIG_W / 2), Math.round(y - FIG_H + 2));
  if (gl) gl.drawImage(b.l, Math.round(x - FIG_W / 2), Math.round(y - FIG_H + 2));
}

// a contact sheet of figures, for checking the drawing
export function peopleSheet() {
  const c = new OffscreenCanvas(FIG_W * 12, FIG_H * 6), g = c.getContext('2d');
  g.fillStyle = '#2a2440'; g.fillRect(0, 0, c.width, c.height);
  const names = Object.keys(POSES);
  for (let row = 0; row < 6; row++) for (let k = 0; k < 12; k++) { const p = person(row * 31 + 7, { hairdo: HAIRDO[(row * 2 + k) % HAIRDO.length] }), b = figure(p, names[(k + row) % names.length]); g.drawImage(b.c, k * FIG_W, row * FIG_H); }
  return c;
}
export { shade };
export function poseSheet() {
  const names = Object.keys(POSES), c = new OffscreenCanvas(FIG_W * names.length, FIG_H * 2), g = c.getContext('2d');
  g.fillStyle = '#2a2440'; g.fillRect(0, 0, c.width, c.height);
  names.forEach((n, k) => { g.drawImage(figure(person(5, { hairdo: 'short' }), n).c, k * FIG_W, 0); g.drawImage(figure(person(12, { hairdo: 'mohawk' }), n).c, k * FIG_W, FIG_H); });
  return c;
}
