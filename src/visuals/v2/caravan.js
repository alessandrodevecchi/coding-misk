// Version 2 (2026-10-17), kept as it was. Later versions live one folder up.
// Caravan v2 (procedural-visuals): a cart with a sound system, pulled by a donkey, with a dancer in front, crosses the
// world to the right while it parties. Behind it the places change (Cairo, Paris, New York, Rome, Kyoto, countryside
// between them) in an endless random order; at every city someone joins and someone leaves; day turns to night.
// Version 2 goes for detailed 90s arcade pixel art: bigger characters with faces, folds and outlines, a detailed cart
// (awning, wooden cabinets, decks, record crates, bunting), more layers of depth (mountains, landmarks, a town with a
// waving crowd, market stalls, the road with puddles, flowers out of focus in front), sun rays at golden hour and
// glowing lights at night. The music: the speakers pump with the kick and the bass, the bulbs flash with the hats,
// everyone dances on the beat, notes float up when the melody plays, the sun and the stars pulse in time.
import { createScroller, stream, rng, mix, shade, skyAt, canvasOf } from './scroller.js';
import { px, disc, text } from './pixel.js';

const W = 384, H = 216, HORIZON = 132, MIDBASE = 166, ROAD = 178, FEET = 204;
const LINE = '#2a1712';
// ---------- helpers ----------
// a box with a soft dark outline (not pure black, as the arcade backgrounds), lit top-left and shaded bottom-right
function block(g, x, y, w, h, c, { line = LINE, lit = 0.22, dark = 0.28 } = {}) {
  x = Math.round(x); y = Math.round(y);
  if (line) px(g, line, x - 1, y - 1, w + 2, h + 2);
  px(g, c, x, y, w, h);
  if (w > 2 && h > 2) { px(g, shade(c, lit), x, y, w, 1); px(g, shade(c, lit * 0.5), x, y, 1, h); px(g, shade(c, -dark), x, y + h - 1, w, 1); px(g, shade(c, -dark * 0.6), x + w - 1, y, 1, h); }
}
// a sprite drawn by a function into its own canvas, then outlined: every pixel next to the figure becomes the line colour
const sprites = new Map();
function outlined(key, w, h, draw, line = LINE) {
  if (sprites.has(key)) return sprites.get(key);
  const fig = canvasOf(w, h), fg = fig.getContext('2d'); draw(fg);
  const out = canvasOf(w + 2, h + 2), og = out.getContext('2d');
  const sil = canvasOf(w, h), sg = sil.getContext('2d'); sg.drawImage(fig, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = line; sg.fillRect(0, 0, w, h);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) og.drawImage(sil, dx, dy);
  og.drawImage(fig, 1, 1);
  if (sprites.size > 600) sprites.delete(sprites.keys().next().value);
  sprites.set(key, out);
  return out;
}
// a sprite darkened for the night (cached per level)
function tinted(key, src, night) {
  const q = Math.round(night * 6) / 6;
  if (q <= 0) return src;
  const k = `${key}|n${q}`;
  if (sprites.has(k)) return sprites.get(k);
  const c = canvasOf(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = q * 0.55; g.fillStyle = '#12133a'; g.fillRect(0, 0, c.width, c.height);
  sprites.set(k, c);
  return c;
}

// ---------- places ----------
const ZONES = {
  egypt: { name: 'CAIRO', tint: '#ffb35c', hills: ['#e8b070', '#cf9358'], far: '#d9a873', grass: '#e2bd7a', road: '#d6a65c', stone: '#b98a4a', city: true },
  paris: { name: 'PARIS', tint: '#b7c8ff', hills: ['#9aa6c0', '#7f8ba8'], far: '#8d98b4', grass: '#6aa048', road: '#9a94a2', stone: '#76707e', city: true },
  newyork: { name: 'NEW YORK', tint: '#9fd1ff', hills: ['#7f8ea6', '#66748c'], far: '#7a88a2', grass: '#5c8f44', road: '#6a6870', stone: '#4c4a52', city: true },
  rome: { name: 'ROMA', tint: '#ffc98a', hills: ['#b8a07a', '#9d855f'], far: '#c2a47e', grass: '#7aa24a', road: '#b09a7e', stone: '#8c7860', city: true },
  japan: { name: 'KYOTO', tint: '#ffb7d0', hills: ['#8aa0a8', '#6f858e'], far: '#7e95a0', grass: '#76b058', road: '#a89c8c', stone: '#847868', city: true },
  country: { name: '', tint: '#b9e3ff', hills: ['#7aa860', '#5e8c4a'], far: '#8fb0c8', grass: '#7cbf4c', road: '#b98e5c', stone: '#946c42' },
};
const CITIES = Object.keys(ZONES).filter(k => ZONES[k].city);
const SKY = {
  0: ['#0a0b26', '#161843', '#2b2659'],
  0.2: ['#1d1f52', '#5d3b7a', '#e2746c'],
  0.28: ['#3c7bd6', '#7ab4ee', '#ffd6a0'],
  0.5: ['#2a86e2', '#69b8f4', '#c8ecff'],
  0.7: ['#3b6fc6', '#7f9de2', '#ffd090'],
  0.78: ['#2c2466', '#8a3c7a', '#ff7a4a'],
  0.88: ['#100f34', '#24214f', '#4c2f64'],
};

// ---------- people, drawn in detail ----------
const SKINS = [['#f6cfae', '#d9a582'], ['#e8ae86', '#c48462'], ['#c4875c', '#9c6440'], ['#8e5634', '#6a3c22'], ['#5e3824', '#432616']];
const HAIRS = ['#2a1a14', '#5a3420', '#b5782e', '#e8cf72', '#b33a2a', '#dcdcdc', '#3a2a6a'];
const CLOTHES = ['#e2453a', '#2f6fd6', '#f2c23a', '#3fae5a', '#9b4fd6', '#ff7ab6', '#f28c28', '#25b5b5', '#f2efe6', '#7a4a2a'];
const PROPS = [null, 'tambourine', 'trumpet', 'flag', 'drum', 'maracas', 'guitar', 'accordion'];
export function personFrom(seed) {
  const r = stream('person', seed);
  return { skin: r.int(0, SKINS.length - 1), hair: r.pick(HAIRS), style: r.int(0, 5), shirt: r.pick(CLOTHES), vest: r.chance(0.3) ? r.pick(CLOTHES) : null, pants: r.pick(['#3a4a7a', '#2a2a33', '#7a5a3a', '#4a6a3a', '#6a3a5a', '#c8b48a']), hat: r.chance(0.35) ? r.pick(CLOTHES) : null, prop: r.pick(PROPS), tall: r.int(0, 3), beard: r.chance(0.2) };
}
// a person, 26×42 pixels with the feet at the bottom middle; pose walk or dance, frame 0..3, wave
function personSprite(P, pose, f, wave) {
  const key = `p|${JSON.stringify(P)}|${pose}|${f}|${wave}`;
  return outlined(key, 26, 42, g => {
    const [skin, skinD] = SKINS[P.skin], cx = 12, base = 41, top = 4 - P.tall;
    const lift = pose === 'dance' ? [0, 2, 0, 1][f] : pose === 'walk' ? [0, 1, 0, 1][f] : 0, y0 = top - lift;
    const shirt = P.shirt, shirtL = shade(shirt, 0.2), shirtD = shade(shirt, -0.28), pants = P.pants, pantsD = shade(pants, -0.3);
    // legs: thigh and shin, a step or a bounce; shoes
    const step = pose === 'walk' ? [[-2, 2], [0, 0], [2, -2], [0, 0]][f] : pose === 'dance' ? [[-1, 1], [-2, 2], [1, -1], [2, -2]][f] : [0, 0];
    [[cx - 4, step[0]], [cx + 1, step[1]]].forEach(([lx, s], i) => {
      const knee = y0 + 27, foot = base - 3;
      px(g, i ? pants : pantsD, lx + Math.round(s / 2), y0 + 21, 4, knee - (y0 + 21));
      px(g, i ? pants : pantsD, lx + s, knee, 4, foot - knee);
      px(g, shade(pants, 0.18), lx + s + (i ? 2 : 0), knee + 2, 1, foot - knee - 3);
      px(g, '#3a2418', lx + s - 1, foot, 6, 3); px(g, '#6a4a32', lx + s, foot, 4, 1);
    });
    // belt
    px(g, '#3a2418', cx - 6, y0 + 20, 12, 2); px(g, '#d8b45a', cx - 1, y0 + 20, 2, 2);
    // torso with folds, a vest sometimes
    px(g, shirt, cx - 6, y0 + 10, 12, 10); px(g, shirtL, cx + 2, y0 + 10, 4, 9); px(g, shirtD, cx - 6, y0 + 10, 3, 10); px(g, shirtD, cx - 1, y0 + 14, 1, 4);
    if (P.vest) { px(g, P.vest, cx - 6, y0 + 10, 4, 10); px(g, P.vest, cx + 2, y0 + 10, 4, 10); px(g, shade(P.vest, -0.3), cx - 2, y0 + 10, 1, 10); }
    px(g, skin, cx - 2, y0 + 10, 4, 2); px(g, skinD, cx - 2, y0 + 11, 4, 1); // collar opening
    // arms: swinging, raised on the beat, or waving; hands
    const up = pose === 'dance' ? [[1, 0], [0, 1], [1, 1], [0, 0]][f] : null;
    for (const side of [-1, 1]) {
      const ax = side < 0 ? cx - 9 : cx + 6, raised = wave ? side > 0 && f % 2 === 0 : up ? up[side < 0 ? 0 : 1] : 0;
      if (raised) { px(g, side < 0 ? shirtD : shirt, ax, y0 + 2, 3, 10); px(g, shirtL, ax + 1, y0 + 2, 1, 9); px(g, skin, ax, y0 - 1, 3, 3); }
      else { const sw = pose === 'walk' ? side * [1, 0, -1, 0][f] : 0; px(g, side < 0 ? shirtD : shirt, ax + sw, y0 + 11, 3, 8); px(g, shirtL, ax + sw + 1, y0 + 11, 1, 7); px(g, skin, ax + sw, y0 + 19, 3, 3); px(g, skinD, ax + sw, y0 + 21, 3, 1); }
    }
    // neck and head: jaw shade, ear, eye with a highlight, brow, nose, mouth
    px(g, skinD, cx - 1, y0 + 8, 3, 3);
    px(g, skin, cx - 4, y0 - 1, 9, 10); px(g, skinD, cx - 4, y0 + 7, 9, 2); px(g, skinD, cx - 4, y0 - 1, 1, 9);
    px(g, skinD, cx - 3, y0 + 3, 2, 3); px(g, skin, cx - 3, y0 + 4, 1, 1); // ear
    px(g, '#ffffff', cx + 1, y0 + 3, 2, 2); px(g, '#1a1018', cx + 2, y0 + 3, 1, 2); px(g, shade(P.hair, -0.2), cx + 1, y0 + 2, 3, 1);
    px(g, shade(skin, 0.18), cx + 4, y0 + 4, 1, 2); // nose
    px(g, pose === 'dance' ? '#7a2a2a' : skinD, cx + 2, y0 + 7, 2, 1); // mouth, open when dancing
    if (P.beard) { px(g, P.hair, cx - 1, y0 + 6, 6, 3); px(g, shade(P.hair, 0.2), cx, y0 + 6, 4, 1); }
    // hair
    const hc = P.hair, hl = shade(hc, 0.25), hd = shade(hc, -0.25);
    if (P.style === 0) { px(g, hc, cx - 4, y0 - 2, 9, 3); px(g, hl, cx - 2, y0 - 2, 5, 1); px(g, hc, cx - 5, y0, 2, 3); }
    else if (P.style === 1) { px(g, hc, cx - 5, y0 - 2, 10, 3); px(g, hc, cx - 6, y0, 3, 12); px(g, hd, cx - 6, y0 + 6, 3, 6); px(g, hl, cx - 2, y0 - 2, 5, 1); }
    else if (P.style === 2) { for (let k = 0; k < 5; k++) px(g, k % 2 ? hc : hl, cx - 5 + k * 2, y0 - 4 + (k % 2), 2, 4); px(g, hc, cx - 5, y0 - 1, 10, 2); }
    else if (P.style === 3) { disc(g, cx, y0 + 1, 7, hc); px(g, skin, cx - 3, y0 + 1, 8, 8); px(g, hl, cx - 3, y0 - 5, 5, 1); px(g, '#ffffff', cx + 1, y0 + 3, 2, 2); px(g, '#1a1018', cx + 2, y0 + 3, 1, 2); px(g, shade(skin, 0.18), cx + 4, y0 + 4, 1, 2); }
    else if (P.style === 4) { px(g, hc, cx - 4, y0 - 2, 9, 3); px(g, hc, cx - 7, y0 + 1, 3, 2); px(g, hc, cx - 9, y0 + 2, 3, 5); px(g, hl, cx - 2, y0 - 2, 5, 1); }
    else { px(g, '#d9433a', cx - 5, y0 - 2, 10, 3); px(g, '#f2efe6', cx - 3, y0 - 1, 1, 1); px(g, '#f2efe6', cx + 1, y0 - 1, 1, 1); px(g, '#d9433a', cx - 7, y0 + 1, 3, 2); }
    if (P.hat) { px(g, P.hat, cx - 4, y0 - 5, 9, 4); px(g, shade(P.hat, 0.25), cx - 3, y0 - 5, 6, 1); px(g, shade(P.hat, -0.25), cx - 6, y0 - 1, 13, 2); }
    // what they play
    const hx = cx + 9, hy = up && up[1] ? y0 - 1 : y0 + 18;
    if (P.prop === 'tambourine') { disc(g, hx + 1, hy, 4, '#d8b45a'); disc(g, hx + 1, hy, 2, '#f2e6c8'); px(g, '#f2f2f2', hx - 2, hy, 1, 1); px(g, '#f2f2f2', hx + 4, hy, 1, 1); }
    else if (P.prop === 'trumpet') { px(g, '#f2c23a', cx + 4, y0 + 6, 8, 2); px(g, '#ffe48a', cx + 4, y0 + 6, 8, 1); px(g, '#f2c23a', cx + 11, y0 + 4, 3, 6); px(g, '#c8962a', cx + 13, y0 + 4, 1, 6); }
    else if (P.prop === 'flag') { px(g, '#5a3a22', hx, y0 - 14, 1, 36); px(g, P.hat || '#e2453a', hx + 1, y0 - 14, 9, 6); px(g, '#f2efe6', hx + 1, y0 - 12, 9, 2); }
    else if (P.prop === 'drum') { px(g, '#c8382e', cx - 5, y0 + 15, 11, 8); px(g, '#f2efe6', cx - 5, y0 + 15, 11, 2); for (let k = 0; k < 11; k += 3) px(g, '#f2c23a', cx - 5 + k, y0 + 18, 1, 4); }
    else if (P.prop === 'maracas') { disc(g, hx, hy - 1, 2, '#3fae5a'); px(g, '#f2c23a', hx - 1, hy - 2, 1, 1); }
    else if (P.prop === 'guitar') { disc(g, cx - 2, y0 + 18, 4, '#b5652f'); disc(g, cx - 2, y0 + 18, 1, '#2a1712'); px(g, '#7a4a22', cx + 1, y0 + 12, 9, 2); px(g, '#e8d8b8', cx + 1, y0 + 12, 9, 1); }
    else if (P.prop === 'accordion') { for (let k = 0; k < 8; k++) px(g, k % 2 ? '#d9433a' : '#f2efe6', cx - 5 + k, y0 + 13, 1, 7); px(g, '#2a2a33', cx - 6, y0 + 13, 1, 7); px(g, '#2a2a33', cx + 3, y0 + 13, 1, 7); }
  });
}
function drawPerson(g, P, x, fy, pose, f, env, wave = false) { const s = personSprite(P, pose, f, wave); g.drawImage(tinted(`${JSON.stringify(P)}${pose}${f}${wave}`, s, env.night), Math.round(x - 13), Math.round(fy - 42)); }

// ---------- the donkey and the cart ----------
function donkeySprite(f) {
  return outlined(`donkey|${f}`, 52, 42, g => {
    const c = '#9a8b7e', cl = shade(c, 0.22), cd = shade(c, -0.28), belly = '#d8ccbc', mane = '#3a2e28', hoof = '#2a1c16', o = 9;
    const legs = [[8, [0, 2, 0, -2][f]], [13, [0, -2, 0, 2][f]], [28, [0, -2, 0, 2][f]], [33, [0, 2, 0, -2][f]]], bob = f % 2;
    legs.forEach(([lx, s], i) => { const back = i % 2 === 0; px(g, back ? cd : c, lx + s, o + 16 - bob, 4, 11); px(g, back ? shade(cd, -0.15) : cd, lx + s + 3, o + 16 - bob, 1, 11); px(g, belly, lx + s, o + 24, 4, 1); px(g, hoof, lx + s - 1, o + 27, 5, 3); });
    // body with belly and shading
    px(g, c, 5, o + 5 - bob, 34, 13); px(g, cl, 8, o + 5 - bob, 26, 2); px(g, belly, 9, o + 15 - bob, 24, 3); px(g, cd, 5, o + 5 - bob, 3, 13); px(g, cd, 36, o + 9 - bob, 3, 9);
    // harness: collar with bells and a strap
    px(g, '#8a2a22', 33, o + 3 - bob, 4, 14); px(g, '#c8483a', 34, o + 3 - bob, 1, 14); px(g, '#7a4a22', 6, o + 8 - bob, 30, 2); px(g, '#c8963a', 20, o + 8 - bob, 2, 2);
    for (let k = 0; k < 3; k++) { disc(g, 35, o + 6 + k * 4 - bob, 1, '#f2c23a'); px(g, '#fff2a8', 35, o + 5 + k * 4 - bob, 1, 1); }
    // neck and head with a white muzzle, an eye
    px(g, c, 35, o - 5 - bob, 7, 14); px(g, cl, 36, o - 5 - bob, 2, 12);
    px(g, c, 38, o - 10 - bob, 11, 10); px(g, cl, 39, o - 10 - bob, 8, 1);
    px(g, belly, 45, o - 6 - bob, 6, 6); px(g, shade(belly, -0.15), 45, o - 1 - bob, 6, 1); px(g, '#4a3a34', 49, o - 5 - bob, 2, 2); px(g, '#2a1a18', 50, o - 4 - bob, 1, 1);
    px(g, cd, 38, o - 1 - bob, 8, 2); px(g, '#2a1a18', 47, o - 1 - bob, 3, 1);
    px(g, '#ffffff', 41, o - 8 - bob, 3, 2); px(g, '#1a1018', 43, o - 8 - bob, 1, 2); px(g, cd, 40, o - 9 - bob, 4, 1);
    px(g, mane, 38, o - 11 - bob, 3, 2);
    // long ears, mane, tail
    for (const [ex, tilt] of [[37, 0], [40, 1]]) for (let k = 0; k < 8; k++) { px(g, k < 6 ? c : cd, ex + Math.round(k * 0.2 * tilt), o - 9 - bob - k, 3, 1); px(g, '#e8b4a0', ex + 1 + Math.round(k * 0.2 * tilt), o - 9 - bob - k, 1, 1); }
    for (let k = 0; k < 12; k++) px(g, k % 2 ? mane : shade(mane, 0.3), 34 + Math.floor(k / 3), o - 7 + k - bob, 2, 1);
    px(g, cd, 2, o + 6 - bob, 4, 2); for (let k = 0; k < 6; k++) px(g, mane, 1, o + 7 + k - bob, 2, 1);
  });
}
function wheel(g, cx, cy, r, turn) {
  disc(g, cx, cy, r + 1, LINE); disc(g, cx, cy, r, '#5a3a22'); disc(g, cx, cy, r - 1, '#8a5a32'); disc(g, cx, cy, r - 3, '#3a2416');
  for (let a = 0; a < 48; a++) { const t = (a / 48) * Math.PI * 2; px(g, '#6e7480', cx + Math.cos(t) * r, cy + Math.sin(t) * r); } // iron rim
  for (let k = 0; k < 6; k++) { const t = turn + (k * Math.PI) / 6; for (let s = -r + 3; s <= r - 3; s++) px(g, s < 0 ? '#a8763e' : '#c8925a', cx + Math.cos(t) * s, cy + Math.sin(t) * s); }
  disc(g, cx, cy, 2, '#5a5e68'); px(g, '#c8ccd8', cx - 1, cy - 1, 1, 1);
}
// the wooden body of the cart, with crates of records and a striped awning (cached; what moves is drawn each frame)
function cartBody() {
  return outlined('cart', 84, 64, g => {
    const wood = '#a8693a', wl = shade(wood, 0.2), wd = shade(wood, -0.3), bed = 46;
    // awning on poles, striped, with a scalloped edge
    px(g, '#5a3a22', 2, 4, 2, bed - 4); px(g, '#5a3a22', 80, 4, 2, bed - 4);
    for (let x = 0; x < 84; x++) { const c = Math.floor(x / 6) % 2 ? '#f2efe6' : '#d9433a'; px(g, c, x, 0, 1, 5); px(g, shade(c, -0.2), x, 4, 1, 1); if (x % 6 < 3) px(g, c, x, 5, 1, 2); }
    // bed: planks with grain and iron bands
    px(g, wood, 0, bed, 84, 12); px(g, wl, 0, bed, 84, 1); px(g, wd, 0, bed + 11, 84, 1);
    for (let y = bed + 3; y < bed + 11; y += 4) px(g, wd, 0, y, 84, 1);
    for (let x = 4; x < 84; x += 9) for (let y = bed + 1; y < bed + 11; y += 4) if ((x * 7 + y) % 5 < 2) px(g, shade(wood, -0.12), x, y, 3, 1);
    for (const x of [10, 42, 74]) { px(g, '#5a5e68', x, bed, 2, 12); px(g, '#c8ccd8', x, bed + 2, 1, 1); px(g, '#c8ccd8', x, bed + 8, 1, 1); }
    // crates of records at the back
    for (const [x, c] of [[4, '#c8963a'], [16, '#8a5a32']]) { px(g, c, x, bed - 12, 11, 12); px(g, shade(c, 0.2), x, bed - 12, 11, 1); px(g, shade(c, -0.3), x, bed - 6, 11, 1); for (let k = 0; k < 4; k++) px(g, ['#2a2a33', '#d9433a', '#2f6fd6', '#f2c23a'][k], x + 2 + k * 2, bed - 15, 1, 4); }
    // bunting across the awning
    for (let k = 0; k < 12; k++) { const bx = 4 + k * 6.5, by = 8 + Math.round(Math.sin((k / 11) * Math.PI) * 4), c = CLOTHES[k % CLOTHES.length]; px(g, c, bx, by, 4, 2); px(g, c, bx + 1, by + 2, 2, 2); }
  });
}
function speakerCab(g, x, y, w, h, pump) {
  px(g, LINE, x - 1, y - 1, w + 2, h + 2); px(g, '#5a3a24', x, y, w, h); px(g, '#7a5232', x, y, w, 1); px(g, '#3a2416', x, y + h - 1, w, 1);
  const cx = x + Math.floor(w / 2), r = Math.floor(w / 2) - 2, cy = y + h - r - 3;
  disc(g, cx, cy, r + 1, '#2a1a12'); disc(g, cx, cy, r, '#1a1414'); disc(g, cx, cy, Math.max(2, r - 2 + Math.round(pump * 2)), '#3c3634'); disc(g, cx, cy, Math.max(1, Math.round(r / 3 + pump)), '#8a8480'); px(g, '#d8d4d0', cx - 1, cy - 1, 1, 1);
  disc(g, cx, y + 5, 3, '#1a1414'); disc(g, cx, y + 5, 1, '#8a8480');
  for (let k = 2; k < w - 2; k += 2) px(g, '#4a2e1c', x + k, y + 9, 1, 1); // grille dots
}
function cart(g, gl, x, base, env) {
  const lv = env.lv, bass = Math.min(1, (lv.kick || 0) * 0.8 + (lv.bass || 0) * 0.6), turn = env.cam / 9;
  // shafts to the donkey
  px(g, LINE, x + 82, base - 23, 28, 3); px(g, '#8a5a32', x + 82, base - 22, 28, 1);
  g.drawImage(tinted('cart', cartBody(), env.night), x - 1, base - 66);
  // speakers, decks with spinning records, an amp with lights
  const bedY = base - 66 + 46 + 1;
  speakerCab(g, x + 27, bedY - 26 - Math.round(bass), 18, 26, bass);
  speakerCab(g, x + 63, bedY - 26 - Math.round(bass), 18, 26, bass);
  // the DJ behind the decks: headphones, one hand up on the beat
  const dj = tinted(`dj${Math.floor(env.cyc * 4) % 4}`, personSprite({ skin: 2, hair: '#2a1a14', style: 2, shirt: '#2a2a33', vest: '#f2c23a', pants: '#2a2a33', hat: null, prop: null, tall: 0, beard: true }, 'dance', Math.floor(env.cyc * 4) % 4, false), env.night);
  g.drawImage(dj, x + 41, bedY - 43);
  px(g, '#e2453a', x + 49, bedY - 40, 8, 2); px(g, '#e2453a', x + 48, bedY - 38, 2, 4); px(g, '#e2453a', x + 56, bedY - 38, 2, 4);
  px(g, LINE, x + 49, bedY - 15, 13, 15); px(g, '#2a2a33', x + 50, bedY - 14, 11, 14); px(g, '#4a4a58', x + 50, bedY - 14, 11, 1);
  for (const [dx, ph] of [[53, 0], [58, 2]]) { disc(g, x + dx, bedY - 10, 2, '#111116'); px(g, '#c8ccd8', x + dx + Math.round(Math.cos(env.cyc * 6.28 + ph) * 2), bedY - 10 + Math.round(Math.sin(env.cyc * 6.28 + ph) * 2), 1, 1); }
  ['kick', 'bass', 'hats', 'hook'].forEach((k, i) => { const on = (lv[k] || 0) > 0.15, c = ['#ff5a5a', '#ffb13a', '#ffe14a', '#5aff8a'][i]; px(g, on ? c : '#40404f', x + 51 + i * 2, bedY - 4, 1, 2); if (on) px(gl, c, x + 51 + i * 2, bedY - 4, 1, 2); });
  // the string of bulbs under the awning: flashing on the hats, glowing at night
  const cols = ['#ff5a7a', '#ffd34a', '#5ae0ff', '#8aff6a', '#c58aff'], hat = lv.hats || 0;
  for (let k = 0; k <= 14; k++) {
    const bx = x + 3 + k * 5.6, by = base - 66 + 10 + Math.round(Math.sin((k / 14) * Math.PI) * 6), lit = (Math.floor(env.cyc * 8) + k) % 3 === 0 || hat > 0.35, c = cols[k % 5];
    px(g, LINE, bx, by - 1, 1, 1); px(g, lit ? mix(c, '#ffffff', 0.4) : shade(c, -0.45), bx, by, 2, 2);
    if (lit) { gl.globalAlpha = 0.6 + env.night * 0.4; px(gl, c, bx - 1, by - 1, 4, 4); gl.globalAlpha = 1; }
  }
  wheel(g, x + 16, base - 9, 10, turn); wheel(g, x + 66, base - 9, 10, turn + 1);
}

// ---------- landmarks and scenery by rule, with more detail ----------
function pyramid(g, cx, base, size) {
  const lit = '#f0c27a', dark = '#b5844c';
  for (let r = 0; r < size; r++) {
    const y = base - size + r, half = r;
    px(g, dark, cx - half, y, half, 1); px(g, lit, cx, y, half + 1, 1);
    if (r % 4 === 3) { px(g, shade(dark, -0.12), cx - half, y, half, 1); px(g, shade(lit, -0.1), cx, y, half + 1, 1); }
    if (r % 4 === 1 && r > 3) for (let k = -half; k < half; k += 7) px(g, shade(k < 0 ? dark : lit, -0.08), cx + k + (r % 8), y, 1, 2);
  }
  px(g, '#ffe9a8', cx - 1, base - size, 3, 2);
}
function sphinx(g, x, base) {
  const c = '#e3b46e', d = shade(c, -0.25), l = shade(c, 0.18);
  block(g, x, base - 11, 38, 11, c); block(g, x + 32, base - 5, 14, 5, c);
  block(g, x + 26, base - 25, 12, 15, c); px(g, d, x + 25, base - 24, 3, 13);
  for (let i = 0; i < 6; i++) px(g, i % 2 ? '#3a6aa8' : '#f2c23a', x + 26, base - 23 + i * 2, 12, 1); // striped headdress
  px(g, c, x + 30, base - 21, 7, 8); px(g, l, x + 31, base - 21, 5, 1); px(g, LINE, x + 34, base - 18, 2, 1); px(g, d, x + 35, base - 15, 2, 1);
  for (let k = 0; k < 5; k++) px(g, d, x + 3 + k * 6, base - 8, 3, 1);
}
function palm(g, x, base, h) {
  const t = '#8a5a34', l = '#4f9a3c';
  for (let i = 0; i < h; i++) { const bend = Math.round(Math.sin((i / h) * 1.4) * 4); px(g, LINE, x + bend - 1, base - i, 5, 1); px(g, i % 3 ? t : shade(t, -0.25), x + bend, base - i, 3, 1); px(g, shade(t, 0.2), x + bend, base - i, 1, 1); }
  const top = x + 4, ty = base - h;
  for (const [dx, dy, len] of [[-1, 0, 12], [1, 0, 12], [-1, -1, 8], [1, -1, 8], [0, -1, 5], [-1, 0.5, 9], [1, 0.5, 9]]) for (let k = 0; k < len; k++) { const yy = ty + dy * k + Math.round((k * k) / 12); px(g, LINE, top + dx * k, yy - 1, 3, 3); px(g, k % 2 ? l : shade(l, 0.25), top + dx * k, yy, 2, 1); }
  disc(g, top, ty + 2, 2, '#6a4a22');
}
function eiffel(g, cx, base, H0) {
  const c = '#7a4e33', lc = shade(c, 0.28);
  for (let r = 0; r < H0; r++) {
    const y = base - r, t = r / H0, half = Math.round(2 + 34 * (1 - t) ** 2.4), inner = r < H0 * 0.18 ? Math.round(half * (1 - r / (H0 * 0.18)) * 0.75) : 0;
    for (let xx = cx - half; xx <= cx + half; xx++) { if (Math.abs(xx - cx) < inner) continue; px(g, ((xx + y) % 4 === 0) || ((xx - y) % 4 === 0) ? lc : c, xx, y); }
    px(g, LINE, cx - half - 1, y, 1, 1); px(g, LINE, cx + half + 1, y, 1, 1);
  }
  for (const f of [0.18, 0.42, 0.7]) { const y = base - Math.round(H0 * f), half = Math.round(2 + 34 * (1 - f) ** 2.4) + 2; block(g, cx - half, y - 1, half * 2 + 1, 2, c); }
  px(g, LINE, cx, base - H0 - 8, 1, 8);
}
function colosseum(g, cx, base) {
  const stone = '#dcbc8e', arch = '#5a4030', wid = 140;
  for (let tier = 0; tier < 4; tier++) {
    const y0 = base - 14 - tier * 13, len = tier >= 2 ? wid * (tier === 3 ? 0.45 : 0.68) : wid;
    block(g, cx - wid / 2, y0, len, 12, stone);
    if (tier < 3) for (let a = 0; a < len - 6; a += 9) { const ax = cx - wid / 2 + 3 + a; px(g, arch, ax, y0 + 4, 5, 7); px(g, arch, ax + 1, y0 + 3, 3, 1); px(g, shade(arch, 0.25), ax + 4, y0 + 5, 1, 6); px(g, shade(stone, 0.18), ax - 1, y0 + 1, 7, 1); px(g, shade(stone, -0.2), ax - 2, y0 + 2, 1, 9); }
    else for (let a = 0; a < len - 4; a += 6) px(g, shade(stone, -0.2), cx - wid / 2 + 2 + a, y0 + 3, 2, 6);
  }
  block(g, cx - wid / 2, base - 2, wid, 2, shade(stone, -0.2));
  for (let k = 0; k < 9; k++) px(g, stone, cx - wid / 2 + wid * 0.68 + k * 3, base - 41 + k * 2, 3, 1);
}
function liberty(g, gl, cx, base, env) {
  const stone = '#c8b49a', cop = '#6fc6a8', dcop = shade(cop, -0.3), lcop = shade(cop, 0.25);
  block(g, cx - 12, base - 22, 24, 22, stone); for (let k = 0; k < 3; k++) px(g, shade(stone, -0.18), cx - 9 + k * 7, base - 18, 4, 10);
  block(g, cx - 8, base - 30, 16, 8, shade(stone, 0.08));
  for (let r = 0; r < 30; r++) { const half = Math.round(2 + r * 0.24); px(g, LINE, cx - half - 1, base - 61 + r, half * 2 + 3, 1); px(g, r % 5 ? cop : dcop, cx - half, base - 61 + r, half * 2 + 1, 1); px(g, lcop, cx + half - 1, base - 61 + r, 1, 1); }
  block(g, cx - 3, base - 67, 6, 6, cop); for (let k = -3; k <= 3; k++) px(g, cop, cx + k * 2, base - 71 + Math.abs(k), 1, 3);
  block(g, cx + 3, base - 82, 3, 18, cop); block(g, cx + 2, base - 86, 5, 4, lcop);
  disc(g, cx + 4, base - 89, 2, '#ffd24a'); gl.globalAlpha = 0.5 + env.night * 0.5; disc(gl, cx + 4, base - 89, 3 + Math.round(env.kick), '#ffb43a'); gl.globalAlpha = 1;
  block(g, cx - 7, base - 52, 5, 8, dcop);
}
function fuji(g, cx, base) {
  const rock = '#5f7593', snow = '#f4f8ff';
  for (let r = 0; r < 84; r++) { const y = base - 84 + r, half = Math.round(12 + r * 1.9), sn = r < 26 + Math.round(Math.sin(r) * 2); px(g, sn ? snow : rock, cx - half, y, half * 2, 1); px(g, sn ? '#c8d4ec' : shade(rock, -0.2), cx - half, y, Math.round(half * 0.7), 1); if (!sn && r % 7 === 0) px(g, shade(rock, -0.15), cx - half + 8, y, half, 1); }
}
function pagoda(g, gl, x, base, env) {
  const wood = '#b8402f', roof = '#3a3f55', wall = '#f0e2c4';
  for (let t = 0; t < 5; t++) {
    const y = base - 11 - t * 12, wd = 28 - t * 4;
    block(g, x - wd / 2 + 4, y, wd - 8, 9, wall); px(g, wood, x - wd / 2 + 5, y + 2, wd - 10, 2);
    px(g, LINE, x - wd / 2 - 3, y - 4, wd + 6, 4); px(g, roof, x - wd / 2 - 2, y - 3, wd + 4, 2); px(g, shade(roof, 0.3), x - wd / 2 - 2, y - 3, wd + 4, 1); px(g, roof, x - wd / 2 - 4, y - 5, 3, 2); px(g, roof, x + wd / 2 + 1, y - 5, 3, 2);
    if (env.night > 0.3) { gl.globalAlpha = env.night; px(gl, '#ffb35c', x - 2, y + 3, 5, 4); gl.globalAlpha = 1; }
  }
  px(g, LINE, x, base - 76, 1, 10);
}
function torii(g, x, base) { const red = '#e0452f'; block(g, x, base - 30, 4, 30, red); block(g, x + 22, base - 30, 4, 30, red); block(g, x - 5, base - 33, 36, 3, red); px(g, '#2a2a33', x - 6, base - 35, 38, 2); block(g, x - 1, base - 26, 28, 2, red); }
function cherry(g, x, base, r) {
  const pink = '#ffb3cc', trunk = '#6b4436';
  block(g, x - 1, base - 16, 3, 16, trunk); px(g, trunk, x - 5, base - 15, 4, 1);
  for (let k = 0; k < 9; k++) disc(g, x + Math.round((r() - 0.5) * 18), base - 20 + Math.round((r() - 0.5) * 10), 4 + Math.round(r() * 2), k % 3 ? pink : shade(pink, 0.2));
  for (let k = 0; k < 6; k++) px(g, '#ffe0ea', x + Math.round((r() - 0.5) * 20), base - 24 + Math.round(r() * 10), 1, 1);
}
function cypress(g, x, base, h) { const c = '#2f5d35'; for (let r = 0; r < h; r++) { const half = Math.round(Math.sin((r / h) * Math.PI) * 4) + 1; px(g, LINE, x - half - 1, base - h + r, half * 2 + 3, 1); px(g, r % 4 ? c : shade(c, 0.18), x - half, base - h + r, half * 2 + 1, 1); px(g, shade(c, -0.25), x - half, base - h + r, 1, 1); } }
function pine(g, x, base) {
  // an umbrella pine: a bent trunk, a flat crown of round clumps lit on top
  const c = '#3f6e3a', t = '#6b4a33';
  for (let k = 0; k < 26; k++) { const bend = Math.round(Math.sin(k / 9) * 3); px(g, LINE, x + bend - 1, base - k, 4, 1); px(g, k % 4 ? t : shade(t, -0.2), x + bend, base - k, 2, 1); }
  for (const [dx, dy, r] of [[-12, -30, 6], [-4, -33, 7], [6, -32, 7], [13, -29, 5], [0, -29, 7]]) disc(g, x + 2 + dx, base + dy, r + 1, LINE);
  for (const [dx, dy, r] of [[-12, -30, 6], [-4, -33, 7], [6, -32, 7], [13, -29, 5], [0, -29, 7]]) { disc(g, x + 2 + dx, base + dy, r, c); disc(g, x + 1 + dx, base + dy - 2, Math.max(1, r - 3), shade(c, 0.2)); }
  px(g, shade(c, -0.25), x - 14, base - 27, 32, 2);
}
function tree(g, x, base, r) {
  const leaf = r.pick(['#4f9a3c', '#5aa847', '#3f8a3a']), t = '#6b4a33';
  block(g, x - 1, base - 12, 4, 12, t);
  disc(g, x + 1, base - 20, 11, LINE); disc(g, x + 1, base - 20, 10, shade(leaf, -0.2)); disc(g, x - 1, base - 22, 8, leaf); disc(g, x - 3, base - 25, 4, shade(leaf, 0.2));
  for (let k = 0; k < 8; k++) px(g, shade(leaf, 0.3), x - 6 + Math.round(r() * 12), base - 28 + Math.round(r() * 12), 1, 1);
}
// a town house of a place: wall, roof, windows with shutters, a balcony, laundry or a flag; windows lit at night
function house(g, gl, x, base, wd, ht, z, r, env) {
  const walls = { paris: ['#efe0c2', '#e6d4b0'], newyork: ['#a5523b', '#8a4632'], rome: ['#e8b880', '#d9a06a'], japan: ['#f0e2c4', '#e2d2b0'], egypt: ['#e8c890', '#d6b47a'], country: ['#f2ecd8', '#e8dcc0'] }[z];
  const wall = walls[r.int(0, 1)], roofC = { paris: '#6f7f99', newyork: '#5a3a2a', rome: '#c4603a', japan: '#3a3f55', egypt: '#c8a06a', country: '#b5503a' }[z];
  block(g, x, base - ht, wd, ht, wall);
  if (z === 'paris') { px(g, LINE, x, base - ht - 9, wd, 9); px(g, roofC, x + 1, base - ht - 8, wd - 2, 8); px(g, shade(roofC, 0.25), x + 1, base - ht - 8, wd - 2, 1); for (let k = 3; k < wd - 4; k += 8) block(g, x + k, base - ht - 7, 4, 4, wall); }
  else if (z === 'japan') { px(g, LINE, x - 4, base - ht - 5, wd + 8, 5); px(g, roofC, x - 3, base - ht - 4, wd + 6, 3); px(g, roofC, x - 5, base - ht - 6, 3, 2); px(g, roofC, x + wd + 2, base - ht - 6, 3, 2); }
  else if (z === 'egypt' || z === 'newyork') { px(g, shade(wall, -0.2), x - 1, base - ht - 2, wd + 2, 3); if (z === 'newyork') { block(g, x + 4, base - ht - 12, 8, 9, '#8a6b4a'); px(g, LINE, x + 5, base - ht - 3, 1, 3); px(g, LINE, x + 10, base - ht - 3, 1, 3); } }
  else { for (let k = 0; k < wd + 6; k++) { const yy = base - ht - 1 - Math.round(Math.min(k, wd + 6 - k) * 0.4); px(g, LINE, x - 3 + k, yy - 1, 1, 2); px(g, roofC, x - 3 + k, yy, 1, base - ht - yy + 1); } }
  // windows with shutters
  let k = 0;
  for (let y = base - ht + 6; y < base - 12; y += 12) for (let xx = x + 4; xx < x + wd - 7; xx += 10) {
    const lit = rng('lit', x, y, xx) < 0.5;
    px(g, LINE, xx - 1, y - 1, 7, 9); px(g, '#3a4a6a', xx, y, 5, 7); px(g, '#7a9ac8', xx, y, 2, 2);
    if (z !== 'newyork' && z !== 'egypt') { px(g, z === 'japan' ? '#5a3a2a' : '#3f7a5a', xx - 3, y, 2, 7); px(g, z === 'japan' ? '#5a3a2a' : '#3f7a5a', xx + 6, y, 2, 7); }
    if (lit && env.night > 0.35) { px(g, '#ffd877', xx, y, 5, 7); gl.globalAlpha = 0.7 * env.night; px(gl, '#ffcf6a', xx - 1, y - 1, 7, 9); gl.globalAlpha = 1; }
    if (z === 'paris' && k++ % 2 === 0) { px(g, LINE, xx - 2, y + 7, 9, 1); for (let b = 0; b < 9; b += 2) px(g, LINE, xx - 2 + b, y + 5, 1, 2); }
    if (z === 'newyork') { px(g, LINE, xx - 2, y + 8, 10, 1); for (let s = 0; s < 4; s++) px(g, LINE, xx + s, y + 8 + s, 1, 1); }
  }
  // a door
  block(g, x + Math.floor(wd / 2) - 3, base - 11, 6, 11, shade(wall, -0.5));
  // laundry between houses
  if (r.chance(0.3) && z !== 'newyork') { for (let s = 0; s < wd; s++) px(g, LINE, x + s, base - ht + 14 + Math.round(Math.sin((s / wd) * Math.PI) * 3), 1, 1); for (let s = 4; s < wd - 4; s += 7) px(g, r.pick(CLOTHES), x + s, base - ht + 15 + Math.round(Math.sin((s / wd) * Math.PI) * 3), 4, 5); }
}
// someone of the crowd, small with the distance, waving or jumping on the beat
function waver(g, x, base, seed, env) {
  const P = personFrom(`crowd${seed}`), f = (Math.floor(env.cyc * 4) + seed) % 4, hop = f % 2, [skin] = SKINS[P.skin], y = base - 16 - hop;
  const key = `tiny|${seed}|${f}`;
  const s = outlined(key, 9, 18, t => {
    px(t, P.pants, 2, 11, 2, 6); px(t, P.pants, 5, 11, 2, 6); px(t, '#3a2418', 1, 16, 3, 2); px(t, '#3a2418', 5, 16, 3, 2);
    px(t, P.shirt, 2, 5, 5, 6); px(t, shade(P.shirt, 0.2), 5, 5, 2, 5);
    px(t, skin, 2, 0, 5, 5); px(t, P.hair, 2, 0, 5, 2); px(t, '#1a1018', 5, 2, 1, 1);
    if (f % 2 === 0) { px(t, P.shirt, 7, 1, 2, 5); px(t, skin, 7, 0, 2, 1); } else px(t, P.shirt, 7, 5, 2, 4);
    px(t, P.shirt, 0, 5, 2, 4);
    if (P.hat) px(t, P.hat, 1, 0, 7, 1);
  });
  g.drawImage(tinted(key, s, env.night), Math.round(x - 5), y);
}

// ---------- the stops: who travels at every moment ----------
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
    seed: 'caravan', speed: 44, zoneLen: 1400, dayBars: 96, dayStart: 0.42, beforeZone: 'country',
    zones: ZONES,
    post: { bloom: 0.5, glow: 0.8, vignette: 0.35, grain: 0.04, bloomRadius: 2 },
    pickZone(k) {
      if (k % 2) return 'country';
      for (let i = cityOf.length; i <= k / 2; i++) { const r = stream('city', i), last = cityOf[i - 1]; let c = r.pick(CITIES); if (c === last) c = CITIES[(CITIES.indexOf(c) + 1 + r.int(0, CITIES.length - 2)) % CITIES.length]; cityOf.push(c); }
      return cityOf[k / 2];
    },
    // the air: a light blue haze by day, warm at golden hour, deep blue at night
    fog(env) { const [, mid, hor] = skyAt(SKY, env.day); return mix(mix(hor, mid, 0.5), '#0e1030', env.night * 0.6); },
    sky(g, env) {
      const dq = Math.round(env.day * 240) / 240, [top, mid, hor] = skyAt(SKY, dq), tint = ZONES[env.centerZone.id].tint;
      const cols = [top, mid, hor].map(c => mix(c, tint, 0.1 * env.light)), key = `${dq}|${env.centerZone.id}|${env.w}`;
      let sky = skies.get(key);
      if (!sky) {
        sky = canvasOf(env.w, HORIZON + 40); const sg = sky.getContext('2d');
        for (let y = 0; y < HORIZON + 40; y++) {
          const t = y / (HORIZON + 40), a = t < 0.5 ? cols[0] : cols[1], b = t < 0.5 ? cols[1] : cols[2], u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
          const band = Math.floor(u * 8) / 8, next = Math.min(1, band + 1 / 8), dith = (u * 8) % 1;
          px(sg, mix(a, b, band), 0, y, env.w, 1);
          if (dith > 0.5) for (let x = (y % 2) * 2; x < env.w; x += 4) px(sg, mix(a, b, next), x, y, 2, 1);
        }
        if (skies.size > 16) skies.delete(skies.keys().next().value);
        skies.set(key, sky);
      }
      g.drawImage(sky, 0, 0);
      const gl = env.glow;
      // stars at night, twinkling with the hats
      if (env.night > 0.25) for (let i = 0; i < 110; i++) {
        const sx = Math.floor(rng('star', i) * env.w), sy = Math.floor(rng('star-y', i) * (HORIZON - 30)), tw = rng('tw', i, Math.floor(env.cyc * 4)) < 0.2 + (env.lv.hats || 0) * 0.5;
        const c = mix('#ffffff', '#8ab4ff', rng('sc', i)), a = Math.min(1, (env.night - 0.25) * 1.6) * (tw ? 1 : 0.5);
        g.globalAlpha = a; px(g, c, sx, sy, 1, 1); g.globalAlpha = 1;
        if (tw && i % 6 === 0) { gl.globalAlpha = a; px(gl, c, sx - 1, sy, 3, 1); px(gl, c, sx, sy - 1, 1, 3); gl.globalAlpha = 1; }
      }
      // the sun by day, the moon by night, on an arc; both pulse with the kick
      const arc = d => ({ x: env.w * 0.12 + env.w * 0.76 * d, y: HORIZON - 4 - Math.sin(d * Math.PI) * 110 });
      const sd = (env.day - 0.22) / 0.56, md = ((env.day + 0.28) % 1) / 0.56;
      if (sd > 0 && sd < 1) {
        const p = arc(sd), r = 13 + Math.round(env.kick * 3), low = 1 - Math.sin(sd * Math.PI);
        disc(g, p.x, p.y, r + 5, mix(cols[1], '#fff2b0', 0.25)); disc(g, p.x, p.y, r + 2, mix(cols[1], '#ffe07a', 0.5)); disc(g, p.x, p.y, r, mix('#fff1a8', '#ff9a4a', low * 0.6)); disc(g, p.x - 3, p.y - 3, Math.max(2, r - 7), '#fffbe0');
        gl.globalAlpha = 0.5; disc(gl, p.x, p.y, r + 6, '#ffd88a'); gl.globalAlpha = 1;
        // sun rays when the sun is low: long soft beams across the sky
        if (low > 0.45) { gl.globalAlpha = 0.05 * low; for (let k = 0; k < 7; k++) { const a = Math.PI * (0.15 + k * 0.1) + Math.sin(env.cyc * 0.2 + k) * 0.02; for (let s = r; s < 260; s += 2) px(gl, '#ffcf8a', p.x + Math.cos(a) * s * (p.x < env.w / 2 ? 1 : -1), p.y + Math.sin(a) * s, 2 + s / 30, 2); } gl.globalAlpha = 1; }
      }
      if (md > 0 && md < 1) { const p = arc(md); disc(g, p.x, p.y, 10 + Math.round(env.kick), '#e8ecff'); disc(g, p.x + 3, p.y - 2, 2, '#b8c0e0'); disc(g, p.x - 3, p.y + 3, 2, '#b8c0e0'); gl.globalAlpha = 0.35; disc(gl, p.x, p.y, 13, '#c8d4ff'); gl.globalAlpha = 1; }
      // clouds with a lit top and a shaded belly, drifting
      for (let i = 0; i < 7; i++) {
        const span = env.w + 240, cx = ((rng('cloud', i) * span - env.cam * 0.04 - env.cyc * 2) % span + span) % span - 120, cy = 16 + rng('cy', i) * 64, s = 0.7 + rng('cs', i) * 0.7;
        const c = mix('#ffffff', cols[1], 0.25 + env.night * 0.45), cd = mix(c, cols[2], 0.4), cl = mix(c, '#ffffff', 0.5);
        for (const [dx, dy, r] of [[0, 0, 7], [9, -4, 9], [20, -2, 8], [30, 1, 6], [14, 2, 7]]) disc(g, cx + dx * s, cy + dy * s, Math.round(r * s), c);
        px(g, cd, cx - 4 * s, cy + 3 * s, 40 * s, 4 * s); px(g, cl, cx + 6 * s, cy - 10 * s, 12 * s, 2);
      }
    },
    layers: [
      // far mountains, with snow sometimes
      {
        parallax: 0.06, chunk: 200, haze: 0.4,
        before(g, env) {
          // ridges: peaks from folded sines, the slope facing the light lit, the other in shade, snow on the high ones
          const hAt = u => 18 + 30 * Math.abs(Math.sin(u * 0.009)) * (0.6 + 0.4 * Math.sin(u * 0.0023)) + 9 * Math.abs(Math.sin(u * 0.031 + 1)) + 3 * Math.sin(u * 0.13);
          for (let x = 0; x < env.w; x++) {
            const u = env.cam * 0.06 + x, z = ZONES[env.zoneAt(u, 0.06).id], hgt = Math.round(hAt(u)), slope = hAt(u + 1) - hAt(u - 1);
            const c = slope < 0 ? shade(z.far, 0.1) : shade(z.far, -0.12);
            px(g, c, x, HORIZON - hgt, 1, hgt + 40);
            if (hgt > 48) px(g, slope < 0 ? '#f4f8ff' : '#c8d4ec', x, HORIZON - hgt, 1, Math.min(9, hgt - 46));
            if (rng('rk', Math.floor(u / 3)) < 0.08) px(g, shade(z.far, -0.2), x, HORIZON - hgt + 6 + Math.floor(rng('rky', Math.floor(u / 3)) * 10), 1, 3);
          }
        },
        gen() { return []; }, draw() {},
      },
      // the landmarks of each place
      {
        parallax: 0.12, chunk: 180, haze: 0.28,
        gen(i, r, env) {
          const u = i * 180 + 90, z = env.zoneAt(u, 0.12), out = [];
          const mid = (z.k * z.len + z.len / 2 - env.w / 2) * 0.12 + env.w / 2;
          if (ZONES[z.id].city && Math.floor(mid / 180) === i) out.push({ x: Math.round(mid), kind: z.id, span: 170, z: 1 });
          return out;
        },
        draw(g, o, sx, env) {
          const b = HORIZON + 8;
          if (o.kind === 'egypt') { pyramid(g, sx - 50, b, 54); pyramid(g, sx + 24, b, 74); pyramid(g, sx + 86, b, 34); }
          else if (o.kind === 'paris') eiffel(g, sx, b, 124);
          else if (o.kind === 'newyork') { [[-80, 16, 80, '#7e8aa6'], [-62, 20, 110, '#9aa4ba'], [-40, 14, 66, '#6f7c96'], [-24, 18, 96, '#8592ab'], [-4, 14, 70, '#7a86a0'], [12, 12, 54, '#8a96b0']].forEach(([dx, wd, ht, c]) => { block(g, sx + dx, b - ht, wd, ht, c); for (let y = b - ht + 3; y < b - 2; y += 4) for (let x = sx + dx + 2; x < sx + dx + wd - 2; x += 3) px(g, shade(c, -0.22), x, y, 1, 2); }); px(g, LINE, sx - 53, b - 122, 1, 12); liberty(g, env.glow, sx + 58, b, env); }
          else if (o.kind === 'rome') colosseum(g, sx, b);
          else if (o.kind === 'japan') fuji(g, sx, b);
        },
        glow(gl, o, sx, env) {
          if (env.night < 0.4) return;
          if (o.kind === 'paris') for (let k = 0; k < 30; k++) if (rng('sp', k, Math.floor(env.cyc * 8)) < 0.25 + (env.lv.hats || 0)) { const t = rng('spy', k), half = Math.round(2 + 34 * (1 - t) ** 2.4); px(gl, '#fff6c0', sx - half + Math.floor(rng('spx', k) * half * 2), HORIZON + 8 - Math.round(t * 124), 1, 1); }
          if (o.kind === 'newyork') for (let k = 0; k < 60; k++) if (rng('win', k) < 0.6) px(gl, '#ffe08a', sx - 80 + Math.floor(rng('wx', k) * 104), HORIZON + 8 - Math.floor(rng('wy', k) * 100), 1, 2);
        },
      },
      // rolling hills before the town
      {
        parallax: 0.22, chunk: 200, haze: 0.18,
        before(g, env) {
          for (let x = 0; x < env.w; x++) {
            const u = env.cam * 0.22 + x, z = ZONES[env.zoneAt(u, 0.22).id], hgt = 12 + Math.sin(u * 0.02) * 7 + Math.sin(u * 0.053 + 2) * 3;
            px(g, z.hills[0], x, MIDBASE - 8 - hgt, 1, hgt + 30); px(g, shade(z.hills[0], 0.12), x, MIDBASE - 8 - hgt, 1, 1);
            if (Math.floor(u / 3) % 7 === 0) px(g, z.hills[1], x, MIDBASE - 8 - hgt + 3, 1, 6);
          }
        },
        gen() { return []; }, draw() {},
      },
      // the town: houses, trees, monuments of each place, the crowd that waves
      {
        parallax: 0.42, chunk: 80, haze: 0.08,
        gen(i, r, env) {
          const u = i * 80, z = env.zoneAt(u + 40, 0.42).id, out = [];
          const add = (kind, extra = {}) => out.push({ x: u + r.int(4, 70), kind, z: r(), span: 70, seed: r.int(0, 1e6), d: z, ...extra });
          if (z === 'egypt') { add('house', { wd: r.int(28, 40), ht: r.int(22, 34) }); add('palm', { h: r.int(22, 34) }); if (r.chance(0.3)) add('obelisk'); }
          else if (z === 'paris') { add('house', { wd: r.int(34, 46), ht: r.int(40, 54) }); if (r.chance(0.5)) add('house', { wd: r.int(30, 40), ht: r.int(36, 48) }); }
          else if (z === 'newyork') { add('house', { wd: r.int(28, 38), ht: r.int(44, 64) }); add('tower', { wd: r.int(16, 24), ht: r.int(60, 90), c: r.pick(['#9aa4ba', '#b9a58a', '#7e8aa6']) }); }
          else if (z === 'rome') { add('house', { wd: r.int(30, 40), ht: r.int(28, 40) }); add(r.chance(0.5) ? 'cypress' : 'pine', { h: r.int(30, 44) }); if (r.chance(0.3)) add('column', { h: r.int(20, 32) }); }
          else if (z === 'japan') { if (r.chance(0.35)) add('pagoda'); else add('house', { wd: r.int(30, 40), ht: r.int(20, 28) }); add('cherry'); }
          else { add(r.chance(0.12) ? 'windmill' : 'tree'); if (r.chance(0.4)) add('tree'); if (r.chance(0.25)) add('house', { wd: r.int(26, 34), ht: r.int(18, 24) }); }
          if (ZONES[z].city && r.chance(0.8)) add('crowd', { n: r.int(2, 5), z: 2 });
          return out;
        },
        draw(g, o, sx, env) {
          const base = MIDBASE, r = stream('mid', o.seed);
          if (o.kind === 'house') house(g, env.glow, sx, base, o.wd, o.ht, o.d, r, env);
          else if (o.kind === 'palm') palm(g, sx, base, o.h);
          else if (o.kind === 'obelisk') { const c = '#e3b46e'; for (let k = 0; k < 40; k++) { const hw = Math.round(3 - k * 0.04); px(g, LINE, sx - hw - 1, base - k, hw * 2 + 3, 1); px(g, k % 6 ? c : shade(c, -0.2), sx - hw, base - k, hw * 2 + 1, 1); px(g, shade(c, 0.2), sx + hw, base - k, 1, 1); } px(g, '#f2d27a', sx - 1, base - 43, 3, 3); }
          else if (o.kind === 'tower') { block(g, sx, base - o.ht, o.wd, o.ht, o.c); for (let y = base - o.ht + 3; y < base - 3; y += 4) for (let x = sx + 2; x < sx + o.wd - 2; x += 3) px(g, shade(o.c, -0.25), x, y, 1, 2); }
          else if (o.kind === 'cypress') cypress(g, sx, base, o.h);
          else if (o.kind === 'pine') pine(g, sx, base);
          else if (o.kind === 'column') { const s = '#e6d5b8'; block(g, sx - 3, base - o.h, 6, o.h, s); for (let k = 0; k < 2; k++) px(g, shade(s, -0.15), sx - 1 + k * 2, base - o.h + 2, 1, o.h - 4); block(g, sx - 5, base - o.h - 2, 10, 2, s); }
          else if (o.kind === 'pagoda') pagoda(g, env.glow, sx, base, env);
          else if (o.kind === 'cherry') cherry(g, sx, base, r);
          else if (o.kind === 'windmill') {
            const wall = '#eadfc8';
            for (let k = 0; k < 36; k++) { const half = Math.round(6 + k * 0.12); px(g, LINE, sx - half - 1, base - 36 + k, half * 2 + 3, 1); px(g, wall, sx - half, base - 36 + k, half * 2 + 1, 1); px(g, shade(wall, -0.15), sx - half, base - 36 + k, 2, 1); }
            block(g, sx - 7, base - 41, 15, 5, '#8a4a34');
            const a = env.cyc * 0.8; for (let k = 0; k < 4; k++) { const t = a + (k * Math.PI) / 2; for (let s = 2; s < 20; s++) { const x = sx + Math.cos(t) * s, y = base - 38 + Math.sin(t) * s; px(g, LINE, x, y); if (s > 6) px(g, wall, x + Math.cos(t + 1.57) * 2, y + Math.sin(t + 1.57) * 2); } }
          }
          else if (o.kind === 'crowd') for (let k = 0; k < o.n; k++) waver(g, sx + k * 8, base + 2, o.seed + k, env);
          else tree(g, sx, base, r);
        },
      },
      // bushes and low walls between the town and the road
      {
        parallax: 0.58, chunk: 70, haze: 0.05,
        gen(i, r, env) { const z = env.zoneAt(i * 70 + 35, 0.58).id, out = []; for (let k = 0; k < 2; k++) if (r.chance(0.7)) out.push({ x: i * 70 + k * 35 + r.int(0, 20), kind: z === 'egypt' ? 'dune' : ZONES[z].city && r.chance(0.4) ? 'wall' : 'bush', seed: r.int(0, 1e6), span: 40, d: z }); return out; },
        draw(g, o, sx) {
          const r = stream('bush', o.seed), base = ROAD - 4;
          if (o.kind === 'bush') { const c = mix(ZONES[o.d].grass, '#1a3a1a', 0.35); for (let k = 0; k < 4; k++) disc(g, sx + k * 6, base - 5 - r.int(0, 4), 6, LINE); for (let k = 0; k < 4; k++) { const yy = base - 5 - r.int(0, 3); disc(g, sx + k * 6, yy, 5, c); disc(g, sx + k * 6 - 1, yy - 2, 2, shade(c, 0.25)); } }
          else if (o.kind === 'wall') { const st = ZONES[o.d].stone; block(g, sx, base - 9, 34, 9, shade(st, 0.3)); for (let k = 0; k < 34; k += 6) px(g, shade(st, 0.1), sx + k, base - 9 + (k % 12 ? 0 : 4), 1, 4); px(g, shade(st, 0.1), sx, base - 5, 34, 1); }
          else { const c = '#e8b878'; for (let k = 0; k < 40; k++) { const hh = Math.round(Math.sin((k / 40) * Math.PI) * 8); px(g, c, sx + k, base - hh, 1, hh); px(g, shade(c, 0.15), sx + k, base - hh, 1, 1); } }
        },
      },
      // by the road: market stalls, lamps, fences, lanterns, cacti, the sphinx
      {
        parallax: 0.75, chunk: 110, haze: 0.03,
        gen(i, r, env) {
          const u = i * 110, z = env.zoneAt(u + 55, 0.75).id, out = [];
          const add = (kind, extra = {}) => out.push({ x: u + r.int(6, 96), kind, span: 60, seed: r.int(0, 1e6), d: z, ...extra });
          if (ZONES[z].city && r.chance(0.45)) add('stall');
          if (z === 'paris' || z === 'newyork' || z === 'rome') add('lamp');
          else if (z === 'japan') add(r.chance(0.5) ? 'torii' : 'lantern');
          else if (z === 'country') { add('fence'); if (r.chance(0.3)) add('hay'); }
          else if (z === 'egypt') add(r.chance(0.35) ? 'sphinx' : 'cactus');
          return out;
        },
        draw(g, o, sx, env) {
          const base = ROAD, gl = env.glow;
          if (o.kind === 'lamp') { block(g, sx, base - 30, 3, 30, '#2f3340'); block(g, sx - 3, base - 35, 9, 5, '#2f3340'); px(g, '#fff2b0', sx - 1, base - 31, 5, 1); if (env.night > 0.4) { px(g, '#fff2b0', sx - 2, base - 32, 7, 2); gl.globalAlpha = 0.9; disc(gl, sx + 1, base - 31, 3, '#ffd877'); gl.globalAlpha = 0.12; for (let k = 0; k < 30; k++) px(gl, '#ffd877', sx + 1 - k / 2.4, base - 29 + k, Math.floor(k / 1.2) + 2, 1); gl.globalAlpha = 1; } }
          else if (o.kind === 'torii') torii(g, sx, base);
          else if (o.kind === 'lantern') { block(g, sx, base - 18, 2, 18, '#3a3a40'); block(g, sx - 4, base - 26, 10, 9, '#d9433a'); px(g, '#2a2a33', sx - 5, base - 27, 12, 1); if (env.night > 0.3) { gl.globalAlpha = 0.8; px(gl, '#ffb35c', sx - 3, base - 25, 8, 7); gl.globalAlpha = 1; } }
          else if (o.kind === 'fence') { const c = '#9a6a3a'; for (let k = 0; k < 6; k++) block(g, sx + k * 9, base - 12, 2, 12, c); block(g, sx - 1, base - 9, 50, 2, c); block(g, sx - 1, base - 4, 50, 2, c); }
          else if (o.kind === 'hay') { block(g, sx, base - 13, 20, 13, '#e8c25a'); for (let k = 2; k < 20; k += 3) px(g, '#c89a3a', sx + k, base - 12, 1, 11); }
          else if (o.kind === 'sphinx') sphinx(g, sx, base);
          else if (o.kind === 'cactus') { const c = '#4f9a3c'; block(g, sx, base - 20, 5, 20, c); block(g, sx - 5, base - 15, 4, 7, c); block(g, sx + 6, base - 17, 4, 7, c); for (let k = 0; k < 18; k += 3) px(g, '#f2efe6', sx + 2, base - 19 + k, 1, 1); }
          else if (o.kind === 'stall') {
            // a market stall with a striped canopy, fruit, and a seller who dances
            const c = ['#d9433a', '#2f6fd6', '#3fae5a', '#f2c23a'][o.seed % 4];
            px(g, '#5a3a22', sx, base - 52, 2, 40); px(g, '#5a3a22', sx + 34, base - 52, 2, 40);
            drawPerson(g, personFrom(`seller${o.seed}`), sx + 18, base - 6, 'dance', (Math.floor(env.cyc * 4) + o.seed) % 4, env);
            block(g, sx, base - 14, 36, 12, '#8a5a32'); px(g, shade('#8a5a32', -0.25), sx + 2, base - 9, 32, 1); for (let k = 0; k < 10; k++) disc(g, sx + 3 + k * 3.3, base - 15, 2, ['#ff6a3a', '#f2c23a', '#8acd4a', '#d9433a'][k % 4]);
            for (let x = -2; x < 38; x++) { const cc = Math.floor((x + 2) / 5) % 2 ? '#f2efe6' : c; px(g, cc, sx + x, base - 56, 1, 5); if ((x + 2) % 5 < 3) px(g, cc, sx + x, base - 51, 1, 2); px(g, shade(cc, -0.2), sx + x, base - 52, 1, 1); }
            px(g, LINE, sx - 2, base - 57, 40, 1);
          }
        },
      },
      // in front of everything, out of focus: grass, flowers, stones
      {
        parallax: 1.45, chunk: 60, front: true, blur: 1.2,
        gen(i, r, env) { const z = env.zoneAt(i * 60 + 30, 1.45).id, out = []; if (r.chance(0.55)) out.push({ x: i * 60 + r.int(0, 50), kind: z === 'egypt' ? 'rock' : r.chance(0.6) ? 'grass' : 'flowers', seed: r.int(0, 1e6), span: 30, d: z }); return out; },
        draw(g, o, sx, env) {
          const r = stream('front', o.seed), y = env.h;
          if (o.kind === 'rock') { block(g, sx, y - 12, 22, 12, '#b98a4a'); block(g, sx + 14, y - 8, 12, 8, '#a87a3a'); }
          else { const green = mix(ZONES[o.d].grass, '#0a1a14', 0.25); for (let k = 0; k < 14; k++) { const bx = sx + r.int(0, 26), hh = r.int(8, 20); for (let s = 0; s < hh; s++) px(g, s < 3 ? shade(green, -0.2) : green, bx + Math.round(Math.sin(s / 4 + env.cyc * 0.8 + k) * (s / 8)), y - s, 1, 1); } if (o.kind === 'flowers') for (let k = 0; k < 6; k++) disc(g, sx + r.int(0, 26), y - r.int(10, 18), 1, r.pick(['#ff6a8a', '#ffe14a', '#ffffff', '#c58aff'])); }
        },
      },
    ],
    ground(g, env) {
      // grass verge, a kerb, the road with cobbles or dust, puddles that mirror the sky; the sign before every city
      for (let x = 0; x < env.w; x += 4) {
        const wx = env.cam + x, k = Math.floor(wx / 4), z = ZONES[env.zone(wx + (rng('edge', k) - 0.5) * 30).id];
        px(g, z.grass, x, ROAD - 8, 4, 8); if (rng('tuft', k) < 0.35) px(g, shade(z.grass, 0.2), x + 1, ROAD - 10, 1, 3); if (rng('tuft2', k) < 0.15) px(g, shade(z.grass, -0.2), x + 2, ROAD - 9, 1, 2);
        px(g, LINE, x, ROAD, 4, 1); px(g, shade(z.road, 0.15), x, ROAD + 1, 4, 1);
        px(g, z.road, x, ROAD + 2, 4, env.h - ROAD - 2);
        if (z === ZONES.paris || z === ZONES.rome) for (let row = ROAD + 3; row < env.h; row += 4) { const off = ((row / 4) % 2) * 2; if ((x + off + Math.floor(env.cam)) % 4 < 2) px(g, shade(z.road, -0.18), x, row, 1, 3); px(g, shade(z.road, -0.12), x, row + 3, 4, 1); }
        if (z === ZONES.egypt) for (let row = ROAD + 6; row < env.h; row += 7) px(g, shade(z.road, 0.12), x, row + Math.round(Math.sin((wx + row * 3) * 0.08) * 1.5), 4, 1);
        for (let s = 0; s < 4; s++) if (rng('stone', k, s) < 0.45) { const sy = ROAD + 4 + Math.floor(rng('sy', k, s) * (env.h - ROAD - 8)), sxx = x + Math.floor(rng('sx', k, s) * 3); px(g, z.stone, sxx, sy, 2, 1); px(g, shade(z.road, 0.18), sxx, sy - 1, 2, 1); }
      }
      // puddles: ovals that mirror the sky, with a lighter rim
      const [, skyMid, skyTop] = skyAt(SKY, env.day);
      for (let k = Math.floor((env.cam - 40) / 90); k <= Math.floor((env.cam + env.w) / 90); k++) {
        if (rng('puddle', k) > 0.22) continue;
        const pw = 14 + Math.floor(rng('pw', k) * 18), px0 = Math.round(k * 90 + rng('px', k) * 60 - env.cam), py = ROAD + 8 + Math.floor(rng('py', k) * (env.h - ROAD - 16)), road = ZONES[env.zone(k * 90).id].road;
        for (let r = 0; r < 4; r++) { const half = Math.round(Math.sqrt(1 - ((r - 1.5) / 2) ** 2) * pw / 2); px(g, mix(r < 2 ? skyTop : skyMid, road, 0.3), px0 + pw / 2 - half, py + r, half * 2, 1); }
        px(g, shade(road, -0.25), px0 + 2, py + 4, pw - 4, 1); px(g, mix('#ffffff', skyMid, 0.4), px0 + pw / 2 - 2, py + 1, 3, 1);
      }
      for (let k = Math.floor((env.cam - 100) / 1400); k <= Math.floor((env.cam + env.w + 100) / 1400); k++) {
        const id = env.zone(k * 1400).id;
        if (!ZONES[id].city) continue;
        const sx = Math.round(k * 1400 - 60 - env.cam), name = ZONES[id].name, wd = name.length * 4 + 7, wood = '#c48a4a';
        if (sx < -wd - 4 || sx > env.w + 4) continue;
        block(g, sx + wd / 2 - 1, ROAD - 26, 3, 26, shade(wood, -0.25)); block(g, sx, ROAD - 38, wd, 12, wood); px(g, shade(wood, -0.3), sx + 1, ROAD - 37, wd - 2, 1);
        text(g, name, sx + 4, ROAD - 34, '#2a1a12');
      }
    },
    after(g, env) {
      const gl = env.glow;
      // a flock of birds by day, flapping
      if (env.night < 0.5) for (let i = 0; i < 7; i++) {
        const span = env.w + 200, bx = ((rng('bird', Math.floor(env.cyc / 32)) * span + env.cyc * 9 + i * 9 - env.cam * 0.1) % span + span) % span - 100, by = 40 + Math.sin(env.cyc * 0.4 + i) * 6 + (i % 3) * 5, up = Math.floor(env.cyc * 8 + i) % 2;
        px(g, '#2a2a3a', bx, by, 1, 1); px(g, '#2a2a3a', bx - 2, by - up, 2, 1); px(g, '#2a2a3a', bx + 1, by - up, 2, 1);
      }
      // fireflies at night in the countryside, blinking on the hats
      if (env.night > 0.5 && env.centerZone.id === 'country') for (let i = 0; i < 18; i++) {
        const fx = ((rng('ff', i) * env.w + Math.sin(env.cyc * 0.7 + i) * 12 - env.cam * 0.6) % env.w + env.w) % env.w, fy = ROAD - 30 + rng('ffy', i) * 40 + Math.cos(env.cyc + i) * 4;
        if (rng('fb', i, Math.floor(env.cyc * 4)) < 0.5 + (env.lv.hats || 0) * 0.4) { px(g, '#e8ff9a', fx, fy, 1, 1); gl.globalAlpha = 0.8; px(gl, '#c8ff5a', fx - 1, fy - 1, 3, 3); gl.globalAlpha = 1; }
      }
    },
    actors(g, env) {
      const gl = env.glow, cx = Math.round(env.w / 2) - 70, f = Math.floor(env.cyc * 8) % 4, df = Math.floor(env.cyc * 4) % 4;
      const stop = Math.max(0, Math.floor((env.cam + cx) / 2800)), st = crewAt(stop), prev = stop ? crewAt(stop - 1) : { crew: [] };
      const at = env.cam + cx - stop * 2800;
      // shadows on the road
      g.globalAlpha = 0.25; px(g, '#2a1a12', cx - 4, FEET - 1, 196, 3); g.globalAlpha = 1;
      // dust behind the wheels
      for (let k = 0; k < 6; k++) { const a = ((env.cyc * 2 + k / 6) % 1); g.globalAlpha = 0.45 * (1 - a); disc(g, cx + 4 - a * 26, FEET - 4 - a * 8, 1 + Math.round(a * 4), '#e8d8b8'); g.globalAlpha = 1; }
      // the crew walks behind the cart; a newcomer waits by the road and steps in when the cart reaches them
      const joinX = 340;
      st.crew.forEach((id, i) => {
        let x = cx - 16 - i * 22;
        const P = personFrom(id);
        if (id === st.joined && stop > 0) { const waitX = joinX + x - at; if (waitX > x) { drawPerson(g, P, Math.round(waitX), FEET, 'dance', df, env, true); return; } }
        const was = prev.crew.indexOf(id);
        if (was > i) x = Math.round(x - Math.max(0, 1 - at / 140) * (was - i) * 22);
        drawPerson(g, P, x, FEET, (i + Math.floor(env.cyc)) % 3 === 0 ? 'dance' : 'walk', i % 2 ? df : f, env);
      });
      if (st.left) { const P = personFrom(st.left), x = Math.round(cx - 16 - prev.crew.indexOf(st.left) * 22 - at); if (x > -16) drawPerson(g, P, x, FEET, 'walk', 0, env, true); }
      cart(g, gl, cx, FEET + 1, env);
      g.drawImage(tinted(`donkey${f}`, donkeySprite(f), env.night), cx + 104, FEET - 41);
      // the dancer in front, on the beat
      drawPerson(g, { skin: 1, hair: '#2a1a14', style: 3, shirt: '#ff3f8e', vest: null, pants: '#2a2a3a', hat: '#ffd34a', prop: null, tall: 1, beard: false }, cx + 176, FEET, 'dance', df, env);
      // rings of sound on the kick, notes when the melody plays
      if (env.kick > 0.05) for (const sx of [cx + 39, cx + 71]) { gl.globalAlpha = env.kick * 0.5; for (let a = 0; a < 64; a++) { const t = (a / 64) * Math.PI * 2; px(gl, '#ffe9a8', sx + Math.cos(t) * (12 + (1 - env.kick) * 26), FEET - 44 + Math.sin(t) * (8 + (1 - env.kick) * 14)); } gl.globalAlpha = 1; }
      const mel = Math.max(env.lv.hook || 0, env.lv.arp || 0, env.lv.pad || 0);
      if (mel > 0.12) for (let k = 0; k < 4; k++) { const a = (env.cyc * 0.7 + k / 4) % 1, nx = cx + 40 + k * 10 + Math.sin(a * 9) * 5, ny = FEET - 70 - a * 50; g.globalAlpha = (1 - a) * Math.min(1, mel * 2); px(g, LINE, nx - 3, ny - 1, 7, 8); px(g, '#ffffff', nx, ny, 1, 6); px(g, '#ffffff', nx - 2, ny + 5, 3, 2); px(g, '#ffffff', nx + 1, ny, 3, 1); g.globalAlpha = 1; }
    },
  };
}

export function createCaravan() { return createScroller(caravanConcept(), { w: W, h: H }); }
