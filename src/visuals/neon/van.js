// The van of the neon city v3 (procedural-visuals): a hover truck about 180 pixels long, a stage on its bed with a
// speaker stack, a DJ booth and the crew dancing, a cab with a slanted windscreen and a light bar. The body is baked
// once (panels, rivets, vents, decals, outline); the music moves what is drawn on top: speaker cones, the booth's
// lights, the dancers, the underglow and the thrusters.
import { bake, put, px, disc, ball, ramp, panel, vgrad, mix, shade, outline } from '../pixel-art.js';
import { person, figure, dancer, DANCE, FIG_W, FIG_H } from './people.js';
import { rng } from '../scroller.js';

export const VAN_W = 184, VAN_H = 70, BED_Y = 38; // the stage floor, from the top of the van picture
const INK = '#07040f';

// the static body: everything that does not move
function body(col) {
  return bake(`van|${col}`, VAN_W, VAN_H, (g, gl) => {
    const B = ramp(col, 6), M = ramp('#5a5e72', 5), DK = ramp('#1a1a26', 4), GL = ramp('#7fd8f0', 5, { warm: '#ffffff' });
    // underbody and the three thruster pods
    px(g, DK[1], 6, 52, 172, 8); px(g, DK[2], 6, 52, 172, 1);
    for (const tx of [14, 74, 136]) { panel(g, tx, 56, 30, 7, M, { line: INK }); px(g, DK[0], tx + 3, 62, 24, 2); for (let k = 0; k < 24; k += 3) px(g, M[1], tx + 3 + k, 58, 1, 3); }
    // the bed: side wall of the stage with panels, vents and a hazard stripe at the back
    px(g, INK, 0, BED_Y - 1, 124, 16); vgrad(g, 1, BED_Y, 122, 14, [B[4], B[3], B[2], B[1]]);
    px(g, B[5], 1, BED_Y, 122, 1);
    for (const k of [30, 62, 94]) { px(g, B[0], k, BED_Y + 1, 1, 13); px(g, B[4], k + 1, BED_Y + 1, 1, 13); }
    for (let k = 4; k < 122; k += 6) { px(g, B[5], k, BED_Y + 2, 1, 1); px(g, B[5], k, BED_Y + 12, 1, 1); }
    for (let k = 0; k < 8; k++) px(g, k % 2 ? '#14101c' : '#f0c020', 1 + k * 2, BED_Y + 1, 2, 12);
    // vents
    for (let k = 0; k < 4; k++) px(g, B[0], 100 + 0, BED_Y + 4 + k * 2, 18, 1);
    // the name panel (lit later) and its frame
    px(g, INK, 34, BED_Y + 3, 56, 9); px(g, '#0c0a16', 35, BED_Y + 4, 54, 7);
    // the stage floor, with a rail and posts
    px(g, M[3], 0, BED_Y - 2, 124, 2); px(g, M[4], 0, BED_Y - 2, 124, 1);
    px(g, M[2], 34, BED_Y - 14, 90, 1); for (const k of [34, 64, 94, 122]) px(g, M[2], k, BED_Y - 14, 1, 12);
    // the cab: body, slanted windscreen, side window, door line, mirror, lights, grille, bumper
    const cx = 124;
    g.fillStyle = INK; g.beginPath(); g.moveTo(cx - 1, 51); g.lineTo(cx - 1, 9); g.lineTo(cx + 34, 9); g.lineTo(cx + 54, 27); g.lineTo(cx + 60, 30); g.lineTo(cx + 60, 51); g.fill();
    for (let y = 10; y < 51; y++) {
      const right = y < 27 ? cx + 34 + Math.round((y - 9) * 20 / 18) : cx + 59, t = (y - 10) / 41;
      const tone = t < 0.08 ? B[5] : t < 0.4 ? B[4] : t < 0.75 ? B[3] : B[2];
      px(g, tone, cx, y, right - cx, 1);
    }
    // windscreen and side window: glass with a reflection streak
    for (let y = 12; y < 27; y++) { const r = cx + 33 + Math.round((y - 11) * 19 / 18), l = cx + 30 + Math.round((y - 12) * 0.4); for (let x = l; x < r - 1; x++) px(g, (x - l + (27 - y) * 0.7) % 14 < 2 ? GL[4] : y < 15 ? GL[3] : mix(GL[2], GL[0], (y - 12) / 15), x, y); }
    px(g, INK, cx + 4, 12, 22, 14); for (let y = 13; y < 25; y++) px(g, y < 15 ? GL[3] : mix(GL[2], GL[0], (y - 13) / 12), cx + 5, y, 20, 1);
    px(g, GL[4], cx + 8, 14, 2, 8); px(g, GL[4], cx + 11, 14, 1, 5);
    px(g, B[0], cx + 28, 11, 2, 38); px(g, B[0], cx + 2, 29, 52, 1); px(g, B[5], cx + 2, 30, 52, 1);
    px(g, M[1], cx + 22, 33, 5, 1); // door handle
    panel(g, cx + 50, 18, 3, 6, M, { line: INK }); // mirror
    // grille and headlights
    for (let y = 36; y < 46; y += 2) px(g, DK[1], cx + 49, y, 10, 1);
    px(g, '#fff6d0', cx + 56, 31, 4, 3); px(gl, '#fff6d0', cx + 55, 30, 6, 5);
    px(g, '#ffb43f', cx + 57, 46, 3, 2); px(gl, '#ffb43f', cx + 57, 46, 3, 2);
    panel(g, cx + 2, 46, 58, 4, M, { line: INK });
    // roof light bar
    panel(g, cx + 4, 5, 26, 3, DK, { line: INK });
    // antenna and a little dish
    px(g, M[2], cx + 6, -0 + 0, 1, 5); disc(g, cx + 6, 1, 1, M[3]);
    // decals: stripes along the cab, a number
    px(g, '#e8e4f0', cx + 2, 39, 46, 1); px(g, shade(col, -0.5), cx + 2, 40, 46, 1);
    // the driver in the side window: a head with a cap and a visor, shoulders
    px(g, '#14101c', cx + 12, 18, 9, 7); px(g, '#14101c', cx + 10, 24, 13, 2); px(g, '#2a2440', cx + 12, 17, 8, 2); px(g, '#ff2fa8', cx + 16, 20, 4, 1); px(gl, '#ff2fa8', cx + 16, 20, 4, 1);
    // stickers and a tag on the bed wall, scratches, rust under the vents
    for (const [sx, sy, sw, sh, sc] of [[92, BED_Y + 2, 6, 4, '#ffd23f'], [20, BED_Y + 3, 7, 5, '#ff2fa8'], [96, BED_Y + 8, 5, 4, '#29e6ff'], [24, BED_Y + 9, 4, 3, '#e8e4f0']]) { px(g, INK, sx - 1, sy - 1, sw + 2, sh + 2); px(g, sc, sx, sy, sw, sh); px(g, shade(sc, -0.35), sx, sy + sh - 1, sw, 1); px(g, shade(sc, 0.4), sx, sy, sw, 1); }
    for (let k = 0; k < 18; k++) px(g, B[1], 8 + ((k * 37) % 110), BED_Y + 2 + ((k * 13) % 10), 2 + (k % 3), 1);
    for (let k = 0; k < 10; k++) px(g, '#7a3a1e', 100 + (k * 7) % 18, BED_Y + 12, 1, 1 + (k % 2));
    // exhaust pipes behind the cab, a spoiler on the cab roof
    for (const ex of [cx - 6, cx - 2]) { px(g, INK, ex - 1, 0, 4, 37); px(g, M[3], ex, 1, 2, 36); px(g, M[4], ex, 1, 1, 36); px(g, DK[0], ex - 1, 0, 4, 2); }
    panel(g, cx + 2, 9, 28, 1, DK, { line: INK });
    // the booth on the stage: a table with two decks and a mixer
    panel(g, 58, BED_Y - 12, 36, 10, DK, { line: INK });
    px(g, DK[3], 58, BED_Y - 12, 36, 1);
    disc(g, 65, BED_Y - 13, 4, DK[0]); disc(g, 87, BED_Y - 13, 4, DK[0]);
    disc(g, 65, BED_Y - 13, 3, '#2a2a3a'); disc(g, 87, BED_Y - 13, 3, '#2a2a3a');
    px(g, M[2], 73, BED_Y - 15, 7, 3);
    // the speaker stack: two cabinets on the left of the stage, a tweeter box on top
    for (const [sx, sy, sw, sh] of [[3, BED_Y - 30, 28, 28], [6, BED_Y - 44, 22, 14]]) {
      panel(g, sx, sy, sw, sh, DK, { line: INK });
      px(g, DK[3], sx, sy, sw, 1); for (const [kx, ky] of [[1, 1], [sw - 2, 1], [1, sh - 2], [sw - 2, sh - 2]]) px(g, M[3], sx + kx, sy + ky, 1, 1);
    }
  }, { line: INK });
}

// the crew: a DJ and dancers, from the seed of the session
export function crewOf(seed) { return { dj: person(`dj${seed}`, { hairdo: 'cap' }), dancers: [0, 1, 2].map(k => person(`dn${seed}${k}`)) }; }

// draw the van with its feet (bottom of thrusters) at y, left at x
export function van(g, gl, x, y, env, d, crew) {
  const lv = env.lv, bass = Math.min(1, (lv.kick || 0) * 0.8 + (lv.bass || 0) * 0.6), beatN = Math.floor(env.cyc * 4);
  const hover = Math.round(Math.sin(env.cyc * Math.PI) * 1.5), top = y - VAN_H + hover, b = body('#3c4878');
  // light trails and the underglow on the deck
  for (let k = 0; k < 90; k++) { gl.globalAlpha = (1 - k / 90) * 0.55; px(gl, '#ff2f5a', x - 2 - k * 2, top + 44, 2, 1); px(gl, d.b, x - 2 - k * 2, top + 50, 2, 1); }
  gl.globalAlpha = 0.35 + bass * 0.55; px(gl, d.a, x + 4, y + 2, VAN_W - 8, 2); gl.globalAlpha = 0.15 + bass * 0.25; px(gl, d.a, x - 8, y + 4, VAN_W + 16, 6); gl.globalAlpha = 1;
  g.globalAlpha = 0.5; px(g, '#000000', x + 4, y, VAN_W - 8, 4); g.globalAlpha = 1;
  // the dancers behind the rail and the DJ behind the booth, drawn before the body so the rail and the booth cover them
  const feet = top + BED_Y - 2;
  crew.dancers.forEach((p, k) => { if (k < 2) dancer(g, gl, p, x + [44, 106][k], feet, beatN + k, { move: (k * 3 + Math.floor(env.cyc / 8)) % DANCE.length, flip: k === 1 }); });
  { const pose = (lv.hook || 0) > 0.5 && beatN % 8 < 2 ? 'djUp' : 'dj', fb = figure(crew.dj, pose); g.drawImage(fb.c, x + 76 - FIG_W / 2, feet - FIG_H + 2 - (beatN % 2)); gl.drawImage(fb.l, x + 76 - FIG_W / 2, feet - FIG_H + 2 - (beatN % 2)); }
  put(g, gl, b, x, top);
  // the third dancer on the cab roof
  dancer(g, gl, crew.dancers[2], x + 142, top + 6, beatN + 2, { move: (5 + Math.floor(env.cyc / 8)) % DANCE.length, flip: true });
  // the name on the side, lit
  const name = 'MISK';
  for (let i = 0; i < 4; i++) { const c = i === beatN % 4 && bass > 0.3 ? '#ffffff' : mix(d.a, '#ffffff', 0.35); bigLetter(g, name[i], x + 40 + i * 12, top + BED_Y + 5, c); bigLetter(gl, name[i], x + 40 + i * 12, top + BED_Y + 5, d.a); }
  // the speakers: cones that pump
  for (const [cx, cy, r] of [[17, BED_Y - 16, 10], [17, BED_Y - 37, 5]]) {
    const pump = Math.round(bass * 2);
    disc(g, x + cx, top + cy, r, '#05050a'); ball(g, x + cx, top + cy, r - 1 - (pump ? 0 : 1), ['#14141e', '#22222e', '#34344a', '#4a4a64']); disc(g, x + cx, top + cy, Math.max(1, Math.round(r / 3) + pump - 1), '#0c0c14'); px(g, '#8a8aa8', x + cx - 1, top + cy - 1, 1, 1);
  }
  if (env.kick > 0.05) { gl.globalAlpha = env.kick * 0.45; for (let a = 0; a < 80; a++) { const t = (a / 80) * Math.PI * 2, rr = 12 + (1 - env.kick) * 30; px(gl, d.b, x + 17 + Math.cos(t) * rr, top + BED_Y - 16 + Math.sin(t) * rr * 0.7); } gl.globalAlpha = 1; }
  // the booth lights: the decks spin, the mixer shows the levels
  for (const dx of [65, 87]) { const a = env.cyc * 6 + dx; px(g, '#c8c8d8', x + dx + Math.round(Math.cos(a) * 2), top + BED_Y - 13 + Math.round(Math.sin(a) * 1), 1, 1); px(gl, d.b, x + dx - 3, top + BED_Y - 13, 7, 1); }
  ['kick', 'snare', 'hats', 'bass', 'hook', 'pad'].forEach((k, i) => { const v = Math.min(1, lv[k] || 0), c = [d.a, '#ffffff', d.c, d.b, '#ff6fd8', d.a][i]; for (let s = 0; s < 3; s++) { const on = v > s / 3 + 0.05; px(g, on ? c : '#2a2a3a', x + 61 + i * 5, top + BED_Y - 8 + 0 - 0, 3, 1); if (on) px(gl, c, x + 61 + i * 5, top + BED_Y - 8, 3, 1); } });
  // the cab's light bar flashes on the beat, the windscreen catches the neon
  for (let k = 0; k < 6; k++) { const on = (beatN + k) % 3 === 0, c = k % 2 ? d.a : d.b; px(g, on ? mix(c, '#ffffff', 0.5) : shade(c, -0.5), x + 129 + k * 4, top + 6, 3, 1); if (on) px(gl, c, x + 128 + k * 4, top + 5, 5, 3); }
  gl.globalAlpha = 0.25; px(gl, d.b, x + 156, top + 14, 6, 10); gl.globalAlpha = 1;
  // headlight beam ahead
  gl.globalAlpha = 0.12; for (let k = 0; k < 70; k++) px(gl, '#fff6d0', x + VAN_W + k, top + 32 - k / 6, 1, 2 + k / 2.2); gl.globalAlpha = 1;
  // a neon strip under the bed and the cab, pulsing with the bass
  px(g, mix(d.a, '#ffffff', 0.4), x + 6, top + 52, VAN_W - 12, 1); gl.globalAlpha = 0.6 + bass * 0.4; px(gl, d.a, x + 6, top + 52, VAN_W - 12, 1); gl.globalAlpha = 1;
  // smoke from the exhausts, puffing on the beat
  for (let p = 0; p < 5; p++) { const a = ((env.cyc * 2 + p / 5) % 1); g.globalAlpha = 0.35 * (1 - a); disc(g, x + 120 - a * 24, top - 2 - a * 18, 1 + Math.round(a * 4), '#8a8098'); }
  g.globalAlpha = 1;
  // thruster flames
  for (const tx of [14, 74, 136]) { const f = (Math.floor(env.cyc * 16) + tx) % 3; px(g, mix(d.b, '#ffffff', 0.6), x + tx + 4, top + 64, 22, 1); gl.globalAlpha = 0.8; px(gl, d.b, x + tx + 3, top + 64, 24, 2 + f); gl.globalAlpha = 0.3; px(gl, d.b, x + tx, top + 66, 30, 4 + f); gl.globalAlpha = 1; }
}

// a 9×7 letter for the van's name
const BIG = { M: ['1.....1', '11...11', '1.1.1.1', '1..1..1', '1.....1', '1.....1', '1.....1'], I: ['1111111', '...1...', '...1...', '...1...', '...1...', '...1...', '1111111'], S: ['.111111', '1......', '1......', '.11111.', '......1', '......1', '111111.'], K: ['1....1.', '1...1..', '1..1...', '111....', '1..1...', '1...1..', '1....1.'] };
function bigLetter(g, ch, x, y, c) { (BIG[ch] || []).forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) if (row[xx] === '1') px(g, c, x + xx, y + yy * 1); }); }

export function vanSheet() {
  const c = new OffscreenCanvas(260, 110), g = c.getContext('2d'), gl = new OffscreenCanvas(260, 110).getContext('2d');
  g.fillStyle = '#2a2440'; g.fillRect(0, 0, 260, 110);
  van(g, gl, 30, 96, { lv: { kick: 0.8, bass: 0.6, hats: 0.5, hook: 0.4, pad: 0.3 }, kick: 0.5, cyc: 3.1 }, { a: '#ff2fa8', b: '#29e6ff', c: '#ffd23f' }, crewOf('x'));
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(gl.canvas, 0, 0);
  return c;
}
export { outline, rng };
