// Caravan (procedural-visuals): a cart with a sound system, pulled by a donkey, with a dancer in front, crosses the
// world to the right while it parties. Behind it the places change (Egypt, Paris, New York, Rome, Japan, countryside
// between them), in an endless random order; at every city someone joins and someone leaves; day turns to night.
// The speakers pump with the kick and the bass, the light strings flash with the hats, the dancer moves on the beat,
// the sun and the stars pulse in time. 90s arcade pixel art: dark outlines, three tones, warm colours.
import { createScroller, stream, rng, mix, shade, skyAt } from './scroller.js';
import { OUT, px, box, disc, ring, text } from './pixel.js';

const W = 320, H = 180, HORIZON = 120, MIDBASE = 146, ROAD = 155, FEET = 172;
// ---------- places ----------
// sky: the tint of the place over the sky of the time of day; ground, road and grass colours; the sign by the road
const ZONES = {
  egypt: { name: 'CAIRO', tint: '#ffb35c', ridge: ['#e2a05a', '#c9844a'], grass: '#e8c27a', road: '#d9a95f', roadDark: '#b9874a', city: true },
  paris: { name: 'PARIS', tint: '#b7c8ff', ridge: ['#8f9bb8', '#727e9e'], grass: '#6fa04a', road: '#8b8794', roadDark: '#6b6774', city: true },
  newyork: { name: 'NEW YORK', tint: '#9fd1ff', ridge: ['#6b7d96', '#56657c'], grass: '#5f8f45', road: '#5c5a62', roadDark: '#3f3d45', city: true },
  rome: { name: 'ROMA', tint: '#ffc98a', ridge: ['#b99a73', '#9b7d5b'], grass: '#7ea24c', road: '#a18d74', roadDark: '#7f6d58', city: true },
  japan: { name: 'KYOTO', tint: '#ffb7d0', ridge: ['#8aa0a8', '#6d838c'], grass: '#7db35a', road: '#9c9284', roadDark: '#7a7164', city: true },
  country: { name: '', tint: '#b9e3ff', ridge: ['#7aa860', '#5e8c4a'], grass: '#7fbf4f', road: '#b08a5c', roadDark: '#8c6a43' },
};
const CITIES = Object.keys(ZONES).filter(k => ZONES[k].city);
// the sky through the day: midnight, dawn, noon, dusk → [top, middle, horizon]
const SKY = {
  0: ['#090a24', '#141640', '#2a2457'],
  0.2: ['#1b1d4f', '#5b3a78', '#e0726b'],
  0.3: ['#3b7bd4', '#78b2ec', '#ffd8a0'],
  0.5: ['#2f8de6', '#6fbcf5', '#c9ecff'],
  0.7: ['#3b6fc4', '#7c9be0', '#ffcf8f'],
  0.8: ['#2a2363', '#7a3a7c', '#ff7a4e'],
  0.9: ['#0f0f33', '#22204f', '#4a2f63'],
};

// ---------- landmarks and props, drawn by rule ----------
function pyramid(g, cx, base, size, env) {
  const lit = mix('#f0c27a', '#3a3150', env.night * 0.7), dark = mix('#b5844c', '#221d33', env.night * 0.7);
  for (let r = 0; r < size; r++) {
    const y = base - size + r, half = r;
    px(g, dark, cx - half, y, half, 1); px(g, lit, cx, y, half + 1, 1);
    if (r % 4 === 3) { px(g, shade(dark, -0.15), cx - half, y, half, 1); px(g, shade(lit, -0.12), cx, y, half + 1, 1); }
    px(g, OUT, cx - half - 1, y, 1, 1); px(g, OUT, cx + half + 1, y, 1, 1);
  }
  px(g, mix('#ffe9a8', '#6a5a70', env.night * 0.6), cx - 1, base - size, 3, 2);
}
function sphinx(g, x, base, env) {
  const c = mix('#e3b46e', '#3b3352', env.night * 0.65), d = shade(c, -0.25);
  box(g, x, base - 9, 30, 9, c); box(g, x + 26, base - 4, 10, 4, c); // body and paws
  box(g, x + 22, base - 20, 9, 12, c); box(g, x + 21, base - 19, 2, 9, d, { line: null }); // head and headdress
  for (let i = 0; i < 4; i++) px(g, d, x + 22, base - 17 + i * 2, 9, 1);
  px(g, OUT, x + 28, base - 16, 1, 1); box(g, x - 3, base - 6, 4, 2, c); // eye, tail
}
function palm(g, x, base, h, env) {
  const t = mix('#8a5a34', '#2c2433', env.night * 0.6), l = mix('#4f9a3c', '#1d2f33', env.night * 0.6);
  for (let i = 0; i < h; i++) { const bend = Math.round(Math.sin(i / h * 1.4) * 3); px(g, OUT, x + bend - 1, base - i, 4, 1); px(g, i % 3 ? t : shade(t, -0.2), x + bend, base - i, 2, 1); }
  const top = x + Math.round(Math.sin(1.4) * 3), ty = base - h;
  for (const [dx, dy, len] of [[-1, 0, 9], [1, 0, 9], [-1, -1, 6], [1, -1, 6], [0, -1, 4]]) for (let k = 0; k < len; k++) { const yy = ty + dy * k + Math.round((k * k) / 10); px(g, OUT, top + dx * k, yy - 1, 2, 3); }
  for (const [dx, dy, len] of [[-1, 0, 9], [1, 0, 9], [-1, -1, 6], [1, -1, 6], [0, -1, 4]]) for (let k = 0; k < len; k++) { const yy = ty + dy * k + Math.round((k * k) / 10); px(g, k % 2 ? l : shade(l, 0.2), top + dx * k, yy, 2, 1); }
}
function eiffel(g, cx, base, H0, env) {
  const c = mix('#7a4e33', '#2b2236', env.night * 0.55), lc = shade(c, 0.25);
  for (let r = 0; r < H0; r++) {
    const y = base - r, t = r / H0, half = Math.round(2 + 30 * (1 - t) ** 2.4);
    // two legs that meet higher up, an arch at the bottom
    const inner = r < H0 * 0.18 ? Math.round(half * (1 - r / (H0 * 0.18)) * 0.75) : 0;
    px(g, OUT, cx - half - 1, y, half - inner + 2, 1); px(g, OUT, cx + inner, y, half - inner + 2, 1);
    for (let xx = cx - half; xx <= cx + half; xx++) {
      if (Math.abs(xx - cx) < inner) continue;
      const lat = ((xx + y) % 4 === 0) || ((xx - y) % 4 === 0);
      px(g, lat ? lc : c, xx, y);
    }
  }
  for (const f of [0.18, 0.42]) { const y = base - Math.round(H0 * f), half = Math.round(2 + 30 * (1 - f) ** 2.4) + 2; box(g, cx - half, y - 1, half * 2 + 1, 2, c); }
  px(g, OUT, cx, base - H0 - 6, 1, 6);
}
function colosseum(g, cx, base, env) {
  const stone = mix('#d9b98c', '#3a3350', env.night * 0.6), arch = mix('#5a4030', '#121022', env.night * 0.5), wid = 120;
  for (let tier = 0; tier < 3; tier++) {
    const y0 = base - 14 - tier * 13;
    // the right side is broken: lower tiers there
    const len = tier === 2 ? wid * 0.62 : wid;
    box(g, cx - wid / 2, y0, len, 12, stone);
    for (let a = 0; a < len - 6; a += 8) { const ax = cx - wid / 2 + 3 + a; px(g, arch, ax, y0 + 4, 4, 7); px(g, arch, ax + 1, y0 + 3, 2, 1); px(g, shade(stone, 0.2), ax - 1, y0 + 1, 6, 1); }
  }
  box(g, cx - wid / 2, base - 2, wid, 2, shade(stone, -0.2));
  for (let k = 0; k < 6; k++) px(g, stone, cx - wid / 2 + wid * 0.62 + k * 3, base - 40 + k * 2, 3, 1);
}
function liberty(g, cx, base, env) {
  const stone = mix('#c8b49a', '#3a3350', env.night * 0.6), cop = mix('#6fc6a8', '#24434a', env.night * 0.55), dcop = shade(cop, -0.3);
  box(g, cx - 10, base - 18, 20, 18, stone); box(g, cx - 7, base - 26, 14, 8, shade(stone, 0.1));
  // robe, body, head with the crown, the arm and the torch
  for (let r = 0; r < 26; r++) { const half = Math.round(2 + r * 0.22); px(g, OUT, cx - half - 1, base - 27 - 26 + r, half * 2 + 3, 1); px(g, r % 5 ? cop : dcop, cx - half, base - 27 - 26 + r, half * 2 + 1, 1); }
  box(g, cx - 2, base - 58, 5, 5, cop);
  for (let k = -2; k <= 2; k++) px(g, cop, cx + k * 2, base - 61 + Math.abs(k), 1, 2);
  box(g, cx + 3, base - 70, 2, 16, cop); box(g, cx + 2, base - 73, 4, 3, shade(cop, 0.2));
  box(g, cx - 5, base - 46, 4, 6, dcop); // the tablet
}
function fuji(g, cx, base, env) {
  const rock = mix('#5f7593', '#1c2140', env.night * 0.6), snow = mix('#f4f8ff', '#6f7aa8', env.night * 0.6);
  for (let r = 0; r < 70; r++) { const y = base - 70 + r, half = Math.round(10 + r * 1.9); px(g, r < 22 ? (r % 6 === 5 ? shade(snow, -0.1) : snow) : rock, cx - half, y, half * 2, 1); }
}
function pagoda(g, x, base, env) {
  const wood = mix('#b8402f', '#3a1f33', env.night * 0.55), roof = mix('#3a3f55', '#14152a', env.night * 0.5), wall = mix('#f0e2c4', '#4a4560', env.night * 0.6);
  for (let t = 0; t < 4; t++) {
    const y = base - 10 - t * 11, wd = 22 - t * 4;
    box(g, x - wd / 2 + 3, y, wd - 6, 8, wall); px(g, wood, x - wd / 2 + 4, y + 2, wd - 8, 1);
    box(g, x - wd / 2 - 2, y - 2, wd + 4, 2, roof); px(g, roof, x - wd / 2 - 3, y - 3, 2, 1); px(g, roof, x + wd / 2 + 1, y - 3, 2, 1);
  }
  px(g, OUT, x, base - 58, 1, 6);
}
function torii(g, x, base, env) {
  const red = mix('#e0452f', '#4a1f30', env.night * 0.5);
  box(g, x, base - 26, 3, 26, red); box(g, x + 18, base - 26, 3, 26, red);
  box(g, x - 4, base - 28, 29, 3, red); box(g, x - 1, base - 22, 23, 2, red);
}
function cherry(g, x, base, env, rnd) {
  const pink = mix('#ffb3cc', '#5a3a5a', env.night * 0.55), trunk = mix('#6b4436', '#231b2a', env.night * 0.5);
  box(g, x - 1, base - 14, 3, 14, trunk);
  for (let k = 0; k < 7; k++) disc(g, x + Math.round((rnd() - 0.5) * 14), base - 17 + Math.round((rnd() - 0.5) * 8), 4 + Math.round(rnd() * 2), k % 2 ? pink : shade(pink, 0.15));
}
function cypress(g, x, base, h, env) {
  const c = mix('#2f5d35', '#121f22', env.night * 0.5);
  for (let r = 0; r < h; r++) { const half = Math.round(Math.sin((r / h) * Math.PI) * 3.5) + 1; px(g, OUT, x - half - 1, base - h + r, half * 2 + 3, 1); px(g, r % 4 ? c : shade(c, 0.15), x - half, base - h + r, half * 2 + 1, 1); }
}
function pine(g, x, base, env) {
  const c = mix('#3f6e3a', '#152420', env.night * 0.5), t = mix('#6b4a33', '#221b25', env.night * 0.5);
  box(g, x - 1, base - 18, 2, 18, t);
  box(g, x - 12, base - 24, 24, 5, c); box(g, x - 8, base - 26, 16, 2, shade(c, 0.15), { line: null });
}
function column(g, x, base, h, env) {
  const s = mix('#e6d5b8', '#3d3852', env.night * 0.6);
  box(g, x - 3, base - h, 6, h, s); for (let k = 0; k < 2; k++) px(g, shade(s, -0.15), x - 1 + k * 2, base - h + 2, 1, h - 4); box(g, x - 4, base - h - 2, 8, 2, s);
}
function haussmann(g, x, base, wd, ht, env, rnd) {
  const wall = mix('#efe0c2', '#4b465e', env.night * 0.6), roof = mix('#6f7f99', '#22283c', env.night * 0.5), win = mix('#43506b', '#1a1d33', env.night * 0.4);
  box(g, x, base - ht, wd, ht, wall);
  box(g, x + 1, base - ht - 7, wd - 2, 7, roof); for (let k = 3; k < wd - 4; k += 7) box(g, x + k, base - ht - 6, 3, 3, wall);
  for (let fy = base - ht + 4; fy < base - 10; fy += 8) for (let fx = x + 3; fx < x + wd - 4; fx += 6) { px(g, win, fx, fy, 3, 5); px(g, OUT, fx - 1, fy + 5, 5, 1); }
  const aw = rnd.pick(['#c33c3c', '#2f6f4f', '#2f4f8f']); px(g, mix(aw, '#1a1a2a', env.night * 0.5), x + 2, base - 9, wd - 4, 3);
}
function tower(g, x, base, wd, ht, c, env) {
  const col = mix(c, '#1c1d33', env.night * 0.55);
  box(g, x, base - ht, wd, ht, col);
  for (let fy = base - ht + 3; fy < base - 2; fy += 4) for (let fx = x + 2; fx < x + wd - 2; fx += 3) px(g, shade(col, -0.25), fx, fy, 1, 2);
}
function brick(g, x, base, wd, ht, env) {
  const c = mix('#a5523b', '#2c1f2f', env.night * 0.55);
  box(g, x, base - ht, wd, ht, c);
  for (let fy = base - ht + 4; fy < base - 6; fy += 7) { for (let fx = x + 3; fx < x + wd - 3; fx += 6) px(g, shade(c, -0.45), fx, fy, 3, 4); px(g, OUT, x + wd - 9, fy + 4, 8, 1); px(g, OUT, x + wd - 9 + ((fy / 7) % 2) * 5, fy + 1, 1, 4); }
  box(g, x + 4, base - ht - 8, 7, 6, mix('#8a6b4a', '#2a2230', env.night * 0.5)); px(g, OUT, x + 5, base - ht - 2, 1, 2); px(g, OUT, x + 9, base - ht - 2, 1, 2);
}
function tree(g, x, base, env, rnd) {
  const leaf = mix(rnd.pick(['#4f9a3c', '#5aa847', '#3f8a3a']), '#14261f', env.night * 0.55), t = mix('#6b4a33', '#221b25', env.night * 0.5);
  box(g, x - 1, base - 10, 3, 10, t); disc(g, x, base - 16, 8, OUT); disc(g, x, base - 16, 7, leaf); disc(g, x - 2, base - 18, 4, shade(leaf, 0.18));
}
function windmill(g, x, base, env, cyc) {
  const wall = mix('#eadfc8', '#45405a', env.night * 0.6), roof = mix('#8a4a34', '#2b1d2a', env.night * 0.5);
  for (let r = 0; r < 30; r++) { const half = Math.round(5 + r * 0.12); px(g, OUT, x - half - 1, base - 30 + r, half * 2 + 3, 1); px(g, wall, x - half, base - 30 + r, half * 2 + 1, 1); }
  box(g, x - 6, base - 34, 13, 4, roof); px(g, OUT, x - 1, base - 8, 3, 8);
  const a = cyc * 0.8;
  for (let k = 0; k < 4; k++) { const t = a + (k * Math.PI) / 2; for (let s = 2; s < 16; s++) { const sx = x + Math.cos(t) * s, sy = base - 32 + Math.sin(t) * s; px(g, OUT, sx, sy); if (s > 5) px(g, wall, sx + Math.cos(t + 1.57) * 2, sy + Math.sin(t + 1.57) * 2); } }
}
function lamp(g, x, base, env) {
  const c = mix('#2f3340', '#141420', env.night * 0.3);
  box(g, x, base - 22, 2, 22, c); box(g, x - 2, base - 25, 6, 3, c);
}

// ---------- people, by rule ----------
const SKINS = ['#f2c7a5', '#e0a77e', '#b97a52', '#8a5434', '#5e3a26'];
const HAIRS = ['#2a1a14', '#5a3420', '#c98a3a', '#e8d27a', '#b33a2a', '#d9d9d9'];
const CLOTHES = ['#e2453a', '#2f6fd6', '#f2c23a', '#3fae5a', '#9b4fd6', '#ff7ab6', '#f28c28', '#25b5b5', '#f4f4f4'];
const PROPS = [null, 'tambourine', 'trumpet', 'flag', 'drum', 'maracas', 'guitar'];
// a person from a seed: skin, hair and its style, shirt, trousers, a hat sometimes, something to play
export function personFrom(seed) {
  const r = stream('person', seed);
  return { skin: r.pick(SKINS), hair: r.pick(HAIRS), style: r.int(0, 4), shirt: r.pick(CLOTHES), pants: r.pick(['#3a4a7a', '#2a2a33', '#7a5a3a', '#4a6a3a', '#6a3a5a']), hat: r.chance(0.35) ? r.pick(CLOTHES) : null, prop: r.pick(PROPS), tall: r.int(0, 2) };
}
// feet at (x, fy); pose: walk or dance, f: the frame (0..3); facing right
function person(g, P, x, fy, pose, f, env, wave = false) {
  const dim = c => mix(c, '#1b1a33', env.night * 0.35);
  const top = fy - 26 - P.tall, legL = pose === 'walk' ? [0, 1, 0, -1][f] : 0, hop = pose === 'dance' ? (f % 2 ? 1 : 0) + Math.round(env.kick * 2) : 0;
  const y0 = top - hop;
  // legs
  for (const [lx, sw] of [[x - 2, legL], [x + 1, -legL]]) { box(g, lx + sw, y0 + 18, 2, 7 + hop - Math.abs(sw), dim(P.pants)); px(g, OUT, lx + sw - 1, fy - 1, 4, 1); px(g, dim('#3a2a22'), lx + sw, fy - 2, 3, 1); }
  // body
  box(g, x - 3, y0 + 10, 7, 9, dim(P.shirt));
  px(g, shade(dim(P.shirt), -0.25), x - 3, y0 + 17, 7, 1);
  // arms: swinging, up on the beat, or waving
  const up = pose === 'dance' ? [[-1, -1], [1, 1], [-1, 1], [1, -1]][f] : null;
  for (const side of [-1, 1]) {
    const ax = side < 0 ? x - 5 : x + 4;
    const raised = wave ? side > 0 && f % 2 === 0 : up ? up[side < 0 ? 0 : 1] > 0 : false;
    if (raised) { box(g, ax, y0 + 4, 2, 7, dim(P.shirt)); px(g, dim(P.skin), ax, y0 + 3, 2, 2); }
    else { const sw = pose === 'walk' ? side * [1, 0, -1, 0][f] : 0; box(g, ax + sw, y0 + 11, 2, 6, dim(P.shirt)); px(g, dim(P.skin), ax + sw, y0 + 17, 2, 2); }
  }
  // head, eye, hair
  box(g, x - 2, y0 + 3, 6, 6, dim(P.skin));
  px(g, OUT, x + 2, y0 + 5, 1, 1);
  const hc = dim(P.hair);
  if (P.style === 0) px(g, hc, x - 2, y0 + 2, 6, 2);
  else if (P.style === 1) { px(g, hc, x - 3, y0 + 2, 7, 2); px(g, hc, x - 3, y0 + 3, 2, 7); }
  else if (P.style === 2) { px(g, OUT, x - 4, y0, 9, 4); px(g, hc, x - 3, y0 + 1, 7, 3); }
  else if (P.style === 3) { px(g, hc, x - 1, y0 + 1, 4, 2); px(g, hc, x - 3, y0 + 2, 2, 2); }
  else { px(g, hc, x - 2, y0 + 2, 6, 2); px(g, hc, x - 4, y0 + 2, 2, 3); }
  if (P.hat) { box(g, x - 3, y0, 8, 2, dim(P.hat)); px(g, dim(P.hat), x - 4, y0 + 2, 10, 1); }
  // what they play
  const hx = x + 6, hy = up && up[1] > 0 ? y0 + 2 : y0 + 15;
  if (P.prop === 'tambourine') { ring(g, hx + 1, hy, 3, dim('#e8c35a')); }
  else if (P.prop === 'trumpet') { box(g, x + 4, y0 + 7, 6, 2, dim('#f2c23a')); px(g, dim('#f2c23a'), x + 10, y0 + 6, 2, 4); }
  else if (P.prop === 'flag') { px(g, OUT, hx, y0 - 8, 1, 22); box(g, hx + 1, y0 - 8, 7, 5, dim(P.hat || '#e2453a')); }
  else if (P.prop === 'drum') { box(g, x - 3, y0 + 12, 8, 6, dim('#d9473a')); px(g, dim('#f4f4f4'), x - 3, y0 + 12, 8, 1); }
  else if (P.prop === 'maracas') { disc(g, hx, hy - 1, 2, dim('#3fae5a')); }
  else if (P.prop === 'guitar') { box(g, x - 2, y0 + 13, 9, 5, dim('#b5652f')); px(g, OUT, x + 6, y0 + 9, 6, 1); }
}

// ---------- the caravan ----------
function donkey(g, x, fy, f, env) {
  const c = mix('#8f8378', '#2d2b3a', env.night * 0.4), belly = shade(c, 0.3), mane = mix('#3a302a', '#141320', env.night * 0.3);
  const step = [0, 1, 2, 1][f], bob = f % 2;
  // legs, walking in pairs
  for (const [lx, ph] of [[x + 2, step], [x + 5, -step], [x + 15, -step], [x + 18, step]]) { box(g, lx + Math.round(ph / 2), fy - 9, 2, 8, shade(c, -0.15)); px(g, OUT, lx + Math.round(ph / 2) - 1, fy - 1, 4, 1); }
  box(g, x, fy - 17 - bob, 22, 9, c); px(g, belly, x + 3, fy - 10 - bob, 16, 2);
  box(g, x + 19, fy - 23 - bob, 5, 8, c); // neck
  box(g, x + 21, fy - 25 - bob, 10, 6, c); px(g, belly, x + 27, fy - 22 - bob, 4, 3); px(g, OUT, x + 24, fy - 24 - bob, 1, 1);
  box(g, x + 21, fy - 31 - bob, 2, 6, c); box(g, x + 24, fy - 32 - bob, 2, 7, c); // ears
  px(g, mane, x + 19, fy - 26 - bob, 3, 9);
  px(g, OUT, x - 3, fy - 16 - bob, 3, 1); px(g, mane, x - 4, fy - 15 - bob, 2, 4); // tail
}
function wheel(g, cx, cy, r, turn, env) {
  disc(g, cx, cy, r + 1, OUT); disc(g, cx, cy, r, mix('#8a5a34', '#2a2030', env.night * 0.4)); disc(g, cx, cy, r - 2, mix('#5a3a24', '#1a1522', env.night * 0.4));
  for (let k = 0; k < 4; k++) { const t = turn + (k * Math.PI) / 4; for (let s = -r + 2; s <= r - 2; s++) px(g, mix('#c08a50', '#3a2a35', env.night * 0.4), cx + Math.cos(t) * s, cy + Math.sin(t) * s); }
  box(g, cx - 1, cy - 1, 2, 2, '#d9b35a');
}
function speaker(g, x, y, wd, ht, pump, env) {
  box(g, x, y, wd, ht, mix('#2b2b33', '#16161f', env.night * 0.3));
  const cx = x + Math.floor(wd / 2), r = Math.floor(wd / 2) - 2;
  disc(g, cx, y + ht - r - 3, r, '#111116'); disc(g, cx, y + ht - r - 3, Math.max(1, r - 2 + Math.round(pump * 2)), '#4a4a58'); disc(g, cx, y + ht - r - 3, Math.max(1, Math.round(r / 3 + pump)), '#8a8a9a');
  disc(g, cx, y + 4, 2, '#111116'); px(g, '#9a9aaa', cx, y + 4, 1, 1);
}
function cart(g, x, base, env) {
  const wood = mix('#a8693a', '#3a2533', env.night * 0.4), dark = shade(wood, -0.3), lv = env.lv;
  const bass = Math.min(1, (lv.kick || 0) * 0.8 + (lv.bass || 0) * 0.6), turn = env.cam / 7;
  // shafts to the donkey
  px(g, OUT, x + 56, base - 15, 22, 3); px(g, dark, x + 56, base - 14, 22, 1);
  // bed with planks, the load on it
  box(g, x, base - 20, 58, 9, wood); for (let k = 6; k < 58; k += 8) px(g, dark, x + k, base - 19, 1, 7);
  speaker(g, x + 3, base - 42 - Math.round(bass), 16, 22, bass, env);
  speaker(g, x + 39, base - 42 - Math.round(bass), 16, 22, bass, env);
  // the decks and the amp, with lights that follow the levels
  box(g, x + 21, base - 32, 16, 12, mix('#3b3b4a', '#1b1b28', env.night * 0.3));
  ['kick', 'bass', 'hats', 'hook', 'pad'].forEach((k, i) => { const on = (lv[k] || 0) > 0.15; px(g, on ? ['#ff5a5a', '#ffb13a', '#ffe14a', '#5aff8a', '#5ad7ff'][i] : '#40404f', x + 23 + i * 3, base - 30, 2, 2); });
  disc(g, x + 26, base - 24, 3, '#111116'); disc(g, x + 33, base - 24, 3, '#111116');
  px(g, '#d0d0e0', x + 26 + Math.round(Math.cos(env.cyc * 6.28) * 2), base - 24 + Math.round(Math.sin(env.cyc * 6.28) * 2), 1, 1);
  px(g, '#d0d0e0', x + 33 + Math.round(Math.cos(env.cyc * 6.28 + 2) * 2), base - 24 + Math.round(Math.sin(env.cyc * 6.28 + 2) * 2), 1, 1);
  // poles and the string of lights
  px(g, OUT, x + 1, base - 56, 2, 36); px(g, OUT, x + 55, base - 56, 2, 36);
  const cols = ['#ff5a7a', '#ffd34a', '#5ae0ff', '#8aff6a', '#c58aff'], hat = lv.hats || 0;
  for (let k = 0; k <= 12; k++) {
    const bx = x + 2 + k * 4.5, by = base - 56 + Math.round(Math.sin((k / 12) * Math.PI) * 5);
    px(g, OUT, bx, by, 1, 1);
    const lit = (Math.floor(env.cyc * 8) + k) % 3 === 0 || hat > 0.35;
    px(g, lit ? cols[k % 5] : shade(cols[k % 5], -0.55), bx, by + 1, 2, 2);
  }
  wheel(g, x + 11, base - 7, 8, turn, env); wheel(g, x + 47, base - 7, 8, turn + 1, env);
}

// ---------- the stops: who travels at every moment ----------
// stop k is the city zone 2k (cities and countryside alternate); the caravan starts with the dancer alone
const crewCache = [];
function crewAt(stop) {
  for (let s = crewCache.length; s <= stop; s++) {
    const prev = s ? crewCache[s - 1].crew.slice() : [], r = stream('crew', s);
    let left = null;
    if (s > 0 && prev.length >= 3 && r.chance(0.6)) left = prev.splice(r.int(0, prev.length - 1), 1)[0];
    // the cart starts alone with its dancer; from the first city on, someone joins at every stop
    const joined = s > 0 ? `p${s}` : null;
    if (joined && prev.length < 6) prev.push(joined);
    crewCache.push({ crew: prev, joined, left });
  }
  return crewCache[stop];
}

// ---------- the concept ----------
const cityOf = [], skies = new Map();
export function caravanConcept() {
  return {
    seed: 'caravan', speed: 40, zoneLen: 1200, dayBars: 96, dayStart: 0.42, beforeZone: 'country',
    zones: ZONES,
    // countryside between the cities; a city never comes twice in a row
    pickZone(k) {
      if (k % 2) return 'country';
      for (let i = cityOf.length; i <= k / 2; i++) { const r = stream('city', i), last = cityOf[i - 1]; let c = r.pick(CITIES); if (c === last) c = CITIES[(CITIES.indexOf(c) + 1 + r.int(0, CITIES.length - 2)) % CITIES.length]; cityOf.push(c); }
      return cityOf[k / 2];
    },
    sky(g, env) {
      const dq = Math.round(env.day * 240) / 240, [top, mid, hor] = skyAt(SKY, dq), tint = env.zones[env.centerZone.id].tint;
      const cols = [top, mid, hor].map(c => mix(c, tint, 0.12 * env.light));
      // bands with a dither between them, as an arcade sky; drawn once per moment of the day and place
      const key = `${dq}|${env.centerZone.id}|${env.w}`;
      let sky = skies.get(key);
      if (!sky) {
        sky = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(env.w, HORIZON + 30) : Object.assign(document.createElement('canvas'), { width: env.w, height: HORIZON + 30 });
        const sg = sky.getContext('2d');
        for (let y = 0; y < HORIZON + 30; y++) {
          const t = y / (HORIZON + 30), a = t < 0.5 ? cols[0] : cols[1], b = t < 0.5 ? cols[1] : cols[2], u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
          const band = Math.floor(u * 6) / 6, next = Math.min(1, band + 1 / 6), dith = (u * 6) % 1;
          px(sg, mix(a, b, band), 0, y, env.w, 1);
          if (dith > 0.5) for (let x = (y % 2) * 2; x < env.w; x += 4) px(sg, mix(a, b, next), x, y, 2, 1);
        }
        if (skies.size > 12) skies.delete(skies.keys().next().value);
        skies.set(key, sky);
      }
      g.drawImage(sky, 0, 0);
      // stars at night, twinkling with the hats and the beat
      if (env.night > 0.25) for (let i = 0; i < 70; i++) {
        const sx = Math.floor(rng('star', i) * env.w), sy = Math.floor(rng('star-y', i) * (HORIZON - 30)), tw = rng('tw', i, Math.floor(env.cyc * 4)) < 0.2 + (env.lv.hats || 0) * 0.5;
        const c = mix('#ffffff', '#8ab4ff', rng('sc', i)); px(g, mix(cols[0], c, Math.min(1, (env.night - 0.25) * 1.6) * (tw ? 1 : 0.55)), sx, sy, 1, 1);
        if (tw && i % 7 === 0) { px(g, c, sx - 1, sy, 3, 1); px(g, c, sx, sy - 1, 1, 3); }
      }
      // the sun by day, the moon by night, on an arc; both pulse with the kick
      const arc = d => ({ x: env.w * 0.15 + (env.w * 0.7) * d, y: HORIZON - 8 - Math.sin(d * Math.PI) * 100 });
      const sd = (env.day - 0.22) / 0.56, md = ((env.day + 0.28) % 1) / 0.56;
      if (sd > 0 && sd < 1) {
        const p = arc(sd), r = 11 + Math.round(env.kick * 3);
        disc(g, p.x, p.y, r + 4, mix(cols[1], '#fff2b0', 0.25)); disc(g, p.x, p.y, r + 2, mix(cols[1], '#ffe07a', 0.5)); disc(g, p.x, p.y, r, '#fff1a8'); disc(g, p.x - 3, p.y - 3, Math.max(2, r - 6), '#fffbe0');
      }
      if (md > 0 && md < 1) { const p = arc(md); disc(g, p.x, p.y, 8 + Math.round(env.kick), '#e8ecff'); disc(g, p.x + 3, p.y - 2, 2, '#b8c0e0'); disc(g, p.x - 2, p.y + 3, 1, '#b8c0e0'); }
      // clouds drifting
      for (let i = 0; i < 6; i++) {
        const cx = ((rng('cloud', i) * 900 - env.cam * 0.05 - env.cyc * 2) % 900 + 900) % 900 - 100, cy = 20 + rng('cy', i) * 60, c = mix('#ffffff', cols[1], 0.35 + env.night * 0.4);
        disc(g, cx, cy, 6, c); disc(g, cx + 8, cy - 3, 8, c); disc(g, cx + 18, cy, 6, c); px(g, c, cx - 4, cy + 2, 28, 4); px(g, shade(c, -0.08), cx - 4, cy + 5, 28, 1);
      }
    },
    layers: [
      // far: the ridge, the landmarks of each place
      {
        parallax: 0.14, chunk: 160,
        before(g, env) {
          for (let x = 0; x < env.w; x++) {
            const u = env.cam * 0.14 + x, z = env.zoneAt(u, 0.14).id, cols = ZONES[z].ridge;
            const hgt = 14 + Math.sin(u * 0.021) * 6 + Math.sin(u * 0.057 + 1) * 3;
            px(g, mix(cols[0], '#1a1838', env.night * 0.7), x, HORIZON - hgt, 1, hgt + 30);
          }
        },
        gen(i, r, env) {
          const u = i * 160 + 80, z = env.zoneAt(u, 0.14), out = [];
          // the landmark sits in the middle of its city: in the one stretch that holds that middle
          const mid = (z.k * z.len + z.len / 2 - env.w / 2) * 0.14 + env.w / 2;
          if (ZONES[z.id].city && Math.floor(mid / 160) === i) out.push({ x: Math.round(mid), kind: z.id, span: 140, z: 1 });
          else if (z.id === 'country' && r.chance(0.5)) out.push({ x: u + r.int(-50, 50), kind: 'hill', size: r.int(30, 60), span: 120 });
          return out;
        },
        draw(g, o, sx, env) {
          if (o.kind === 'egypt') { pyramid(g, sx - 40, HORIZON + 6, 46, env); pyramid(g, sx + 20, HORIZON + 6, 62, env); pyramid(g, sx + 70, HORIZON + 6, 30, env); }
          else if (o.kind === 'paris') eiffel(g, sx, HORIZON + 4, 110, env);
          else if (o.kind === 'newyork') { [[-60, 14, 70, '#7e8aa6'], [-44, 18, 96, '#9aa4ba'], [-24, 12, 58, '#6f7c96'], [-10, 16, 84, '#8592ab'], [8, 12, 62, '#7a86a0']].forEach(([dx, wd, ht, c]) => tower(g, sx + dx, HORIZON + 6, wd, ht, c, env)); px(g, OUT, sx - 37, HORIZON - 104, 1, 10); liberty(g, sx + 50, HORIZON + 6, env); }
          else if (o.kind === 'rome') colosseum(g, sx, HORIZON + 6, env);
          else if (o.kind === 'japan') fuji(g, sx, HORIZON + 6, env);
          else if (o.kind === 'hill') { const c = mix('#6f9f55', '#16252a', env.night * 0.6); for (let r = 0; r < o.size; r++) { const hw = Math.round(Math.sqrt(o.size * o.size - (o.size - r) ** 2) * 1.6); px(g, r % 5 ? c : shade(c, 0.1), sx - hw, HORIZON + 6 - o.size / 2 + r / 2, hw * 2, 1); } }
        },
        // the night on the far layer
        after(g, env) { if (env.night > 0.05) { g.globalAlpha = env.night * 0.25; px(g, '#0b0a2a', 0, 0, env.w, H); g.globalAlpha = 1; } },
        glow(g, o, sx, env) {
          if (env.night < 0.4) return;
          // the tower sparkles on the hats, the torch burns, the skyline windows light up
          if (o.kind === 'paris') for (let k = 0; k < 24; k++) if (rng('sp', k, Math.floor(env.cyc * 8)) < 0.25 + (env.lv.hats || 0)) { const t = rng('spy', k), half = Math.round(2 + 30 * (1 - t) ** 2.4); px(g, '#fff6c0', sx - half + Math.floor(rng('spx', k) * half * 2), HORIZON + 4 - Math.round(t * 110), 1, 1); }
          if (o.kind === 'newyork') { disc(g, sx + 54, HORIZON - 68, 2 + Math.round(env.kick), '#ffd24a'); for (let k = 0; k < 40; k++) if (rng('win', o.x, k) < 0.6) px(g, '#ffe08a', sx - 60 + Math.floor(rng('wx', k) * 80), HORIZON + 6 - Math.floor(rng('wy', k) * 80), 1, 2); }
        },
      },
      // middle distance: the city itself, trees, buildings
      {
        parallax: 0.38, chunk: 72,
        gen(i, r, env) {
          const u = i * 72, z = env.zoneAt(u + 36, 0.38).id, out = [];
          const add = (kind, extra = {}) => out.push({ x: u + r.int(4, 60), kind, z: r(), span: 60, seed: r.int(0, 1e6), ...extra });
          if (z === 'egypt') { add('palm', { h: r.int(16, 26) }); if (r.chance(0.35)) add('obelisk'); }
          else if (z === 'paris') { add('haussmann', { wd: r.int(28, 40), ht: r.int(34, 48) }); if (r.chance(0.6)) add('haussmann', { wd: r.int(24, 34), ht: r.int(30, 42) }); }
          else if (z === 'newyork') { add('brick', { wd: r.int(22, 30), ht: r.int(36, 56) }); add('tower', { wd: r.int(14, 22), ht: r.int(50, 80), c: r.pick(['#9aa4ba', '#b9a58a', '#7e8aa6']) }); }
          else if (z === 'rome') { add(r.chance(0.5) ? 'cypress' : 'pine', { h: r.int(26, 38) }); if (r.chance(0.4)) add('column', { h: r.int(16, 28) }); }
          else if (z === 'japan') { add(r.chance(0.35) ? 'pagoda' : 'cherry'); }
          else { add(r.chance(0.15) ? 'windmill' : 'tree'); if (r.chance(0.4)) add('tree'); }
          return out;
        },
        draw(g, o, sx, env) {
          const base = MIDBASE, r = stream('mid', o.seed);
          if (o.kind === 'palm') palm(g, sx, base, o.h, env);
          else if (o.kind === 'obelisk') { const c = mix('#e3b46e', '#3b3352', env.night * 0.6); for (let k = 0; k < 34; k++) { const hw = Math.round(3 - k * 0.04); px(g, OUT, sx - hw - 1, base - k, hw * 2 + 3, 1); px(g, k % 6 ? c : shade(c, -0.2), sx - hw, base - k, hw * 2 + 1, 1); } px(g, '#f2d27a', sx - 1, base - 37, 3, 3); }
          else if (o.kind === 'haussmann') haussmann(g, sx, base, o.wd, o.ht, env, r);
          else if (o.kind === 'brick') brick(g, sx, base, o.wd, o.ht, env);
          else if (o.kind === 'tower') tower(g, sx, base, o.wd, o.ht, o.c, env);
          else if (o.kind === 'cypress') cypress(g, sx, base, o.h, env);
          else if (o.kind === 'pine') pine(g, sx, base, env);
          else if (o.kind === 'column') column(g, sx, base, o.h, env);
          else if (o.kind === 'pagoda') pagoda(g, sx, base, env);
          else if (o.kind === 'cherry') cherry(g, sx, base, env, r);
          else if (o.kind === 'windmill') windmill(g, sx, base, env, env.cyc);
          else tree(g, sx, base, env, r);
        },
        after(g, env) { if (env.night > 0.05) { g.globalAlpha = env.night * 0.2; px(g, '#0b0a2a', 0, 0, env.w, H); g.globalAlpha = 1; } },
        glow(g, o, sx, env) {
          if (env.night < 0.45) return;
          const lit = (k, x, y, ww = 3, hh = 4) => { if (rng('lw', o.seed, k) < 0.55) px(g, rng('lc', o.seed, k) < 0.7 ? '#ffd877' : '#ffefb5', x, y, ww, hh); };
          if (o.kind === 'haussmann') { let k = 0; for (let fy = MIDBASE - o.ht + 4; fy < MIDBASE - 10; fy += 8) for (let fx = sx + 3; fx < sx + o.wd - 4; fx += 6) lit(k++, fx, fy, 3, 5); }
          if (o.kind === 'brick' || o.kind === 'tower') { let k = 0; for (let fy = MIDBASE - o.ht + 4; fy < MIDBASE - 4; fy += o.kind === 'brick' ? 7 : 4) for (let fx = sx + 2; fx < sx + o.wd - 3; fx += o.kind === 'brick' ? 6 : 3) lit(k++, fx, fy, o.kind === 'brick' ? 3 : 1, o.kind === 'brick' ? 4 : 2); }
          if (o.kind === 'pagoda') for (let t = 0; t < 4; t++) px(g, '#ffb35c', sx - 2, MIDBASE - 7 - t * 11, 5, 3);
        },
      },
      // near: lamps, fences, lanterns, the signs of the cities
      {
        parallax: 0.75, chunk: 96,
        gen(i, r, env) {
          const u = i * 96, zz = env.zoneAt(u + 48, 0.75), z = zz.id, out = [];
          const add = (kind, extra = {}) => out.push({ x: u + r.int(6, 86), kind, span: 40, seed: r.int(0, 1e6), ...extra });
          if (z === 'paris' || z === 'newyork' || z === 'rome') add('lamp');
          else if (z === 'japan') { if (r.chance(0.5)) add('torii'); else add('lantern'); }
          else if (z === 'country') { add('fence'); if (r.chance(0.3)) add('hay'); }
          else if (z === 'egypt') { if (r.chance(0.4)) add('sphinx'); else add('cactus'); }
          return out;
        },
        draw(g, o, sx, env) {
          const base = ROAD + 2;
          if (o.kind === 'lamp') lamp(g, sx, base, env);
          else if (o.kind === 'torii') torii(g, sx, base, env);
          else if (o.kind === 'lantern') { box(g, sx, base - 14, 2, 14, mix('#3a3a40', '#16161f', env.night * 0.3)); box(g, sx - 3, base - 20, 8, 7, mix('#d9433a', '#4a1f2a', env.night * 0.3)); }
          else if (o.kind === 'fence') { const c = mix('#9a6a3a', '#2a2230', env.night * 0.5); for (let k = 0; k < 5; k++) box(g, sx + k * 8, base - 9, 2, 9, c); box(g, sx - 1, base - 7, 36, 2, c); }
          else if (o.kind === 'hay') { box(g, sx, base - 10, 16, 10, mix('#e8c25a', '#3a3530', env.night * 0.5)); }
          else if (o.kind === 'sphinx') sphinx(g, sx, base, env);
          else if (o.kind === 'cactus') { const c = mix('#4f9a3c', '#16262a', env.night * 0.5); box(g, sx, base - 16, 4, 16, c); box(g, sx - 4, base - 12, 3, 6, c); box(g, sx + 5, base - 14, 3, 6, c); }
        },
        glow(g, o, sx, env) {
          if (env.night < 0.4) return;
          if (o.kind === 'lamp') { disc(g, sx + 1, ROAD - 21, 2, '#fff2b0'); g.globalAlpha = 0.18; disc(g, sx + 1, ROAD - 20, 9, '#ffd877'); g.globalAlpha = 1; }
          if (o.kind === 'lantern') px(g, '#ffb35c', sx - 2, ROAD - 16, 6, 5);
        },
      },
    ],
    ground(g, env) {
      // grass and the road, by place, with a seeded texture that moves with the camera
      for (let x = 0; x < env.w; x += 4) {
        const wx = env.cam + x, z = ZONES[env.zone(wx + (rng('edge', Math.floor(wx / 4)) - 0.5) * 24).id];
        const grass = mix(z.grass, '#14202a', env.night * 0.55), road = mix(z.road, '#1a1a2c', env.night * 0.5), dark = mix(z.roadDark, '#121222', env.night * 0.5);
        px(g, grass, x, ROAD - 6, 4, 6);
        if (rng('tuft', Math.floor(wx / 4)) < 0.3) px(g, shade(grass, 0.2), x + 1, ROAD - 8, 1, 2);
        px(g, OUT, x, ROAD, 4, 1);
        px(g, road, x, ROAD + 1, 4, H - ROAD - 1);
        for (let k = 0; k < 3; k++) if (rng('stone', Math.floor(wx / 4), k) < 0.35) px(g, rng('st', Math.floor(wx / 4), k) < 0.5 ? dark : shade(road, 0.15), x + Math.floor(rng('sx', Math.floor(wx / 4), k) * 4), ROAD + 3 + Math.floor(rng('sy', Math.floor(wx / 4), k) * (H - ROAD - 5)), 2, 1);
      }
      // the sign before every city
      for (let k = Math.floor((env.cam - 100) / 1200); k <= Math.floor((env.cam + env.w + 100) / 1200); k++) {
        const id = env.zone(k * 1200).id;
        if (!ZONES[id].city) continue;
        const sx = Math.round(k * 1200 - 60 - env.cam), name = ZONES[id].name, wd = name.length * 4 + 5, wood = mix('#c48a4a', '#2c2433', env.night * 0.45);
        if (sx < -wd - 4 || sx > env.w + 4) continue;
        box(g, sx + wd / 2 - 1, ROAD - 22, 2, 22, shade(wood, -0.25)); box(g, sx, ROAD - 32, wd, 10, wood);
        text(g, name, sx + 3, ROAD - 30, mix('#2a1a12', '#e8e0c8', env.night * 0.2));
      }
    },
    actors(g, env) {
      const cx = Math.round(env.w / 2) - 40, f = Math.floor(env.cyc * 8) % 4, df = Math.floor(env.cyc * 4) % 4;
      // the stop of this stretch: the last city reached
      const stop = Math.max(0, Math.floor((env.cam + cx) / 2400)), st = crewAt(stop), prev = stop ? crewAt(stop - 1) : { crew: [] };
      const at = env.cam + cx - stop * 2400; // how far into the city stretch the cart is
      // dust behind the wheels
      for (let k = 0; k < 4; k++) { const a = ((env.cyc * 2 + k / 4) % 1); g.globalAlpha = 0.5 * (1 - a); disc(g, cx - 4 - a * 20, FEET - 4 - a * 6, 1 + Math.round(a * 3), mix('#e8d8b8', '#3a3550', env.night * 0.5)); g.globalAlpha = 1; }
      // the crew walks behind the cart, in a line; a newcomer waits by the road and steps in when the cart reaches them
      const slots = st.crew, joinX = 300; // the newcomer stands this far into the stretch
      slots.forEach((id, i) => {
        let x = cx - 14 - i * 15;
        const P = personFrom(id);
        if (id === st.joined && stop > 0) { const waitX = joinX + (cx - 14 - i * 15) - at; if (waitX > x) { person(g, P, Math.round(waitX), FEET, 'dance', df, env, true); return; } }
        // the line closes up after someone leaves
        const was = prev.crew.indexOf(id);
        if (was > i) x = Math.round(x - Math.max(0, 1 - at / 120) * (was - i) * 15);
        person(g, P, x, FEET, (i + Math.floor(env.cyc)) % 3 === 0 ? 'dance' : 'walk', (i % 2 ? df : f), env);
      });
      // who left stays behind, waving, until they are out of sight
      if (st.left) { const P = personFrom(st.left), x = Math.round(cx - 14 - (prev.crew.indexOf(st.left)) * 15 - at); if (x > -12) person(g, P, x, FEET, 'walk', 0, env, true); }
      cart(g, cx, FEET + 1, env);
      donkey(g, cx + 76, FEET, f, env);
      // the dancer in front, on the beat
      person(g, { skin: '#e0a77e', hair: '#2a1a14', style: 3, shirt: '#ff3f8e', pants: '#2a2a3a', hat: '#ffd34a', prop: null, tall: 1 }, cx + 124, FEET, 'dance', df, env);
      // rings of sound on the kick, notes when the melody plays
      if (env.kick > 0.05) for (const sx of [cx + 11, cx + 47]) { g.globalAlpha = env.kick * 0.7; ring(g, sx, FEET - 34, 10 + (1 - env.kick) * 22, '#ffe9a8'); g.globalAlpha = 1; }
      const mel = Math.max(env.lv.hook || 0, env.lv.arp || 0, env.lv.pad || 0);
      if (mel > 0.12) for (let k = 0; k < 3; k++) { const a = (env.cyc * 0.7 + k / 3) % 1, nx = cx + 20 + k * 9 + Math.sin(a * 9) * 4, ny = FEET - 50 - a * 40; g.globalAlpha = (1 - a) * Math.min(1, mel * 2); px(g, '#ffffff', nx, ny, 1, 5); px(g, '#ffffff', nx - 2, ny + 4, 3, 2); px(g, '#ffffff', nx + 1, ny, 3, 1); g.globalAlpha = 1; }
      // the night on the road and the caravan, then its lights
      // (the road is darkened in ground(); the bulbs of the cart keep their colour)
    },
  };
}

export function createCaravan() { return createScroller(caravanConcept(), { w: W, h: H }); }
