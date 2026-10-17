// Version 2 (2026-10-17), kept as it was. Later versions live one folder up.
// Neon city v2 (procedural-visuals): a hover van with a sound system on its roof drives right along a skyway through an
// endless cyberpunk city, district after district. Version 2 goes for depth and light: nine layers from colossal
// arcologies in the haze to dark pillars out of focus in front, an elevated train, detailed facades (brick, fire
// escapes, air units, shop fronts), neon that blooms, volumetric street lights, a wet deck that mirrors the signs.
// The music: the roof speakers and the underglow pump with the kick and the bass, the screens show the levels, the
// signs flicker with the hats, the beacons blink on the beat, a flash of lightning on the snare.
import { createScroller, rng, mix, shade, skyAt } from './scroller.js';
import { px, box, disc, text } from './pixel.js';

const W = 384, H = 216, DECK = 176;
const DISTRICTS = {
  market: { name: 'NEON MARKET', a: '#ff2fa8', b: '#29e6ff', c: '#ffd23f', rain: 0.6, haze: '#40205e', wall: '#3a2a4a' },
  spires: { name: 'SPIRE ONE', a: '#4fc3ff', b: '#e8f4ff', c: '#9a7cff', rain: 0.2, haze: '#1a2f58', wall: '#2a3450' },
  stacks: { name: 'STACKS 9', a: '#ff8a2f', b: '#ffd23f', c: '#ff3f3f', rain: 0.1, haze: '#4e2e1c', wall: '#4a3428' },
  oldtown: { name: 'OLD TOWN', a: '#ff3f5a', b: '#ffb43f', c: '#3fffb0', rain: 0.8, haze: '#40162e', wall: '#4a2a30' },
  harbor: { name: 'HARBOR', a: '#3fffd8', b: '#2f8fff', c: '#ff6f3f', rain: 0.4, haze: '#123444', wall: '#283a44' },
  datacore: { name: 'DATA CORE', a: '#5aff6a', b: '#29e6ff', c: '#d0ff3f', rain: 0, haze: '#123024', wall: '#243a30' },
};
const IDS = Object.keys(DISTRICTS);
// the mood of the night: violet, teal, amber smog → [top, middle, horizon]
const MOOD = { 0: ['#06031a', '#1a0a3a', '#5e1e60'], 0.33: ['#020e1a', '#07283a', '#1e5a6e'], 0.66: ['#100808', '#2c1812', '#6e3c1e'] };
const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789';
const INK = '#07040f';

// ---------- textures ----------
// a brick wall: rows of bricks with mortar, a few broken and darker ones
function bricks(g, x, y, w, h, c, seed) {
  px(g, c, x, y, w, h);
  const mortar = shade(c, -0.35), hi = shade(c, 0.12);
  for (let r = 0; r * 3 < h; r++) {
    px(g, mortar, x, y + r * 3 + 2, w, 1);
    for (let k = (r % 2) * 3; k < w; k += 6) { px(g, mortar, x + k, y + r * 3, 1, 2); if (rng('br', seed, r, k) < 0.12) px(g, shade(c, -0.18), x + k + 1, y + r * 3, 4, 2); else if (rng('bh', seed, r, k) < 0.15) px(g, hi, x + k + 1, y + r * 3, 4, 1); }
  }
}
// a window: frame, glass, and the light inside (curtains, blinds, a figure) sent to the light buffer
function windowAt(g, gl, x, y, w, h, lit, d, seed, env) {
  px(g, INK, x - 1, y - 1, w + 2, h + 2);
  px(g, '#141224', x, y, w, h);
  if (!lit) { px(g, '#22203a', x, y, w, 1); return; }
  const warm = rng('ww', seed) < 0.7 ? '#ffcf7a' : rng('ww2', seed) < 0.5 ? d.b : d.a, kind = Math.floor(rng('wk', seed) * 4);
  const flick = rng('wf', seed, Math.floor(env.cyc * 6)) < 0.02;
  if (flick) return;
  gl.globalAlpha = 0.28; px(gl, warm, x, y, w, h); gl.globalAlpha = 1;
  px(g, shade(warm, -0.35), x, y, w, h);
  if (kind === 0) for (let k = 0; k < h; k += 2) px(g, shade(warm, -0.6), x, y + k, w, 1); // blinds
  else if (kind === 1) { px(g, shade(warm, -0.65), x, y, 2, h); px(g, shade(warm, -0.65), x + w - 2, y, 2, h); } // curtains
  else if (kind === 2) { px(g, INK, x + Math.floor(w / 2) - 1, y + h - 4, 3, 4); px(g, INK, x + Math.floor(w / 2) - 1, y + h - 6, 2, 2); } // someone
  px(g, INK, x, y + h, w, 1); px(g, shade('#3a3550', 0.2), x - 1, y + h + 1, w + 2, 1); // sill
}
// a holographic screen: the levels of the music, a pulsing heart, or a scrolling word
function screen(g, gl, x, y, wd, ht, kind, d, env, seed) {
  const lv = env.lv, glitch = (lv.snare || 0) > 0.5 && rng('gl', seed, Math.floor(env.cyc * 16)) < 0.5;
  px(g, INK, x - 2, y - 2, wd + 4, ht + 4); px(g, '#05030c', x, y, wd, ht);
  const draw = (c, ...a) => { px(g, c, ...a); gl.globalAlpha = 0.7; px(gl, c, ...a); gl.globalAlpha = 1; };
  if (kind === 0) ['kick', 'snare', 'hats', 'bass', 'hook', 'arp', 'pad', 'fx'].forEach((k, i) => { const v = Math.min(1, lv[k] || 0), bh = Math.round(v * (ht - 4)), bw = Math.max(1, Math.floor((wd - 4) / 8) - 1), bx = x + 2 + Math.floor(i * (wd - 4) / 8); for (let yy = 0; yy < bh; yy += 2) draw(yy > ht * 0.6 ? d.c : yy > ht * 0.3 ? d.b : d.a, bx, y + ht - 2 - yy, bw, 1); });
  else if (kind === 1) { const r = Math.round(Math.min(wd, ht) / 4 + env.kick * 3), cx = x + wd / 2, cy = y + ht / 2; disc(g, cx - r / 2, cy - 1, Math.round(r / 2) + 1, d.a); disc(g, cx + r / 2, cy - 1, Math.round(r / 2) + 1, d.a); for (let k = 0; k < r + 2; k++) draw(d.a, cx - r + k, cy + k / 1.2, (r - k) * 2, 1); gl.globalAlpha = 0.5; disc(gl, cx, cy, r + 2, d.a); gl.globalAlpha = 1; }
  else { const word = d.name, off = Math.floor(env.cyc * 6) % (word.length * 4 + wd); g.save(); g.beginPath(); g.rect(x, y, wd, ht); g.clip(); gl.save(); gl.beginPath(); gl.rect(x, y, wd, ht); gl.clip(); text(g, word, x + wd - off, y + Math.floor(ht / 2) - 2, d.b); text(gl, word, x + wd - off, y + Math.floor(ht / 2) - 2, d.b); gl.restore(); g.restore(); }
  for (let yy = y; yy < y + ht; yy += 2) { g.globalAlpha = 0.3; px(g, '#000000', x, yy, wd, 1); g.globalAlpha = 1; }
  if (glitch) draw(d.b, x + Math.floor(rng('gx', seed) * wd / 2), y + Math.floor(rng('gy', seed, Math.floor(env.cyc * 16)) * ht), Math.floor(wd / 2), 2);
  // the light it throws around
  gl.globalAlpha = 0.12; px(gl, d.a, x - 6, y - 4, wd + 12, ht + 10); gl.globalAlpha = 1;
}
// a neon sign: glyphs in a frame, vertical or horizontal, flickering with the hats
function neon(g, gl, x, y, word, col, vertical, seed, env) {
  const on = !((env.lv.hats || 0) > 0.55 && rng('ns', seed, Math.floor(env.cyc * 8)) < 0.35) && rng('dead', seed, Math.floor(env.cyc)) > 0.02;
  const n = word.length, w = vertical ? 7 : n * 4 + 3, h = vertical ? n * 6 + 3 : 9;
  px(g, INK, x - 1, y - 1, w + 2, h + 2); px(g, '#120c1e', x, y, w, h); px(g, shade(col, -0.5), x, y, w, 1); px(g, shade(col, -0.5), x, y + h - 1, w, 1);
  [...word].forEach((ch, k) => { const tx = vertical ? x + 2 : x + 2 + k * 4, ty = vertical ? y + 2 + k * 6 : y + 2; text(g, ch, tx, ty, on ? mix(col, '#ffffff', 0.45) : shade(col, -0.55)); if (on) text(gl, ch, tx, ty, col); });
  if (on) { gl.globalAlpha = 0.22; px(gl, col, x - 3, y - 3, w + 6, h + 6); gl.globalAlpha = 1; }
  // brackets to the wall
  px(g, '#2a2440', vertical ? x - 3 : x + 2, vertical ? y + 2 : y - 3, vertical ? 3 : 1, vertical ? 1 : 3);
}

// ---------- the van ----------
function van(g, gl, x, y, env) {
  const lv = env.lv, bass = Math.min(1, (lv.kick || 0) * 0.8 + (lv.bass || 0) * 0.6), d = DISTRICTS[env.centerZone.id];
  y += Math.round(Math.sin(env.cyc * Math.PI) * 1.5);
  const B = '#3c4878', BL = shade(B, 0.25), BLL = mix(B, d.b, 0.55), BD = shade(B, -0.35), BDD = '#05030c';
  // light trails behind
  for (let k = 0; k < 60; k++) { const a = (1 - k / 60); gl.globalAlpha = a * 0.6; px(gl, '#ff2f5a', x - 2 - k * 2, y + 15, 2, 1); px(gl, d.b, x - 2 - k * 2, y + 20, 2, 1); }
  gl.globalAlpha = 1;
  // underglow on the deck and its reflection
  gl.globalAlpha = 0.35 + bass * 0.55; px(gl, d.a, x - 6, y + 28, 96, 2); px(gl, d.a, x + 4, y + 30, 76, 2); gl.globalAlpha = 0.15 + bass * 0.2; px(gl, d.a, x - 10, y + 32, 104, 6); gl.globalAlpha = 1;
  // body: rounded box with panel lines, rivets and a lit edge on top
  px(g, BDD, x - 1, y - 1, 90, 25);
  px(g, B, x, y, 88, 23); px(g, BL, x, y, 88, 2); px(g, BLL, x + 2, y, 84, 1); px(gl, d.b, x + 2, y, 84, 1);
  // a dark shadow under it, so it stands out from the street
  g.globalAlpha = 0.5; px(g, '#000000', x - 4, y + 24, 96, 6); g.globalAlpha = 1; px(g, BD, x, y + 17, 88, 6); px(g, BDD, x, y + 22, 88, 1);
  for (const k of [22, 44, 66]) { px(g, BDD, x + k, y + 2, 1, 15); px(g, BL, x + k + 1, y + 2, 1, 15); }
  for (let k = 3; k < 86; k += 7) px(g, BLL, x + k, y + 18, 1, 1);
  // the cab: slanted windscreen with the driver
  px(g, BDD, x + 63, y - 13, 26, 14); px(g, B, x + 64, y - 12, 24, 13); px(g, BL, x + 64, y - 12, 24, 1);
  for (let r = 0; r < 9; r++) px(g, r < 2 ? '#d8faff' : mix('#7fd8f0', '#2a5a7a', r / 9), x + 66 + Math.floor(r / 3), y - 10 + r, 20 - Math.floor(r / 3), 1);
  px(g, INK, x + 73, y - 7, 5, 6); px(g, INK, x + 74, y - 9, 3, 2); px(g, d.a, x + 74, y - 8, 3, 1); // driver with a visor
  gl.globalAlpha = 0.25; px(gl, '#9ae8ff', x + 66, y - 10, 20, 3); gl.globalAlpha = 1;
  // side windows with the crew dancing inside
  for (let k = 0; k < 3; k++) {
    const wx = x + 4 + k * 22; px(g, INK, wx - 1, y + 3, 18, 9); px(g, mix('#1a3048', d.a, 0.15), wx, y + 4, 16, 7);
    const bob = Math.floor(env.cyc * 4 + k) % 2; px(g, INK, wx + 6, y + 6 - bob, 4, 5 + bob); px(g, INK, wx + 7, y + 4 - bob, 2, 2);
    gl.globalAlpha = 0.12; px(gl, d.a, wx, y + 4, 16, 7); gl.globalAlpha = 1;
  }
  // neon stripe and the name
  px(g, mix(d.a, '#ffffff', 0.4), x, y + 13, 88, 1); gl.globalAlpha = 0.6; px(gl, d.a, x, y + 13, 88, 1); gl.globalAlpha = 1; px(g, shade(d.a, -0.3), x, y + 14, 88, 1);
  text(g, 'MISK', x + 6, y + 16, mix(d.b, '#ffffff', 0.4)); text(gl, 'MISK', x + 6, y + 16, d.b);
  // lights
  px(g, '#ff4a6a', x - 1, y + 4, 2, 8); gl.globalAlpha = 0.9; px(gl, '#ff2f5a', x - 2, y + 4, 3, 8); gl.globalAlpha = 1;
  px(g, '#fff6d0', x + 87, y + 6, 2, 4); gl.globalAlpha = 0.18; for (let k = 0; k < 40; k++) px(gl, '#fff6d0', x + 89 + k, y + 8 - k / 5, 1, 1 + k / 2.5); gl.globalAlpha = 1;
  // thrusters with flames that pulse
  for (const tx of [x + 8, x + 60]) { px(g, INK, tx - 1, y + 22, 22, 6); px(g, '#1a1e34', tx, y + 22, 20, 5); px(g, BL, tx, y + 22, 20, 1); px(gl, d.b, tx + 2, y + 27, 16, 1); gl.globalAlpha = 0.5; px(gl, mix(d.b, '#ffffff', 0.5), tx + 4 + (Math.floor(env.cyc * 16) % 12), y + 27, 3, 1); gl.globalAlpha = 1; }
  // the sound system on the roof: two cabinets on a rack, a light bar
  px(g, BDD, x + 2, y - 3, 58, 3);
  for (const sx of [x + 4, x + 31]) {
    const yy = y - 24 - Math.round(bass);
    px(g, INK, sx - 1, yy - 1, 26, 23); px(g, '#16161f', sx, yy, 24, 21); px(g, '#2a2a38', sx, yy, 24, 1);
    disc(g, sx + 12, yy + 13, 7, '#05050a'); disc(g, sx + 12, yy + 13, 6, '#26263a'); disc(g, sx + 12, yy + 13, 4 + Math.round(bass * 2), '#3c3c54'); disc(g, sx + 11, yy + 12, 1, '#a0a0b8');
    disc(g, sx + 6, yy + 4, 2, '#05050a'); px(g, '#a0a0b8', sx + 6, yy + 4, 1, 1); disc(g, sx + 18, yy + 4, 2, '#05050a'); px(g, '#a0a0b8', sx + 18, yy + 4, 1, 1);
  }
  ['kick', 'snare', 'hats', 'bass', 'hook', 'pad'].forEach((k, i) => { const on = (lv[k] || 0) > 0.15, c = [d.a, '#ffffff', d.c, d.b, '#ff6fd8', d.a][i]; px(g, on ? c : '#2a2a3a', x + 57 + (i % 2) * 3, y - 6 - Math.floor(i / 2) * 3, 2, 2); if (on) px(gl, c, x + 57 + (i % 2) * 3, y - 6 - Math.floor(i / 2) * 3, 2, 2); });
  // rings of sound on the kick
  if (env.kick > 0.05) { gl.globalAlpha = env.kick * 0.5; for (const sx of [x + 16, x + 43]) for (let a = 0; a < 64; a++) { const t = (a / 64) * Math.PI * 2; px(gl, d.b, sx + Math.cos(t) * (12 + (1 - env.kick) * 26), y - 11 + Math.sin(t) * (7 + (1 - env.kick) * 14)); } gl.globalAlpha = 1; }
  // a drone above, with a beam that flashes on the beat
  const dx = x + 44 + Math.round(Math.sin(env.cyc * 1.3) * 14), dy = y - 56 + Math.round(Math.cos(env.cyc * 2.1) * 3);
  px(g, INK, dx - 7, dy - 1, 14, 6); px(g, '#3a3f5a', dx - 6, dy, 12, 4); px(g, '#5a6080', dx - 6, dy, 12, 1); px(g, '#8a8aa0', dx - 11, dy - 2, 6, 1); px(g, '#8a8aa0', dx + 5, dy - 2, 6, 1);
  const flash = env.beat < 0.25;
  px(g, flash ? '#ff2f5a' : '#5a1a2a', dx, dy + 2, 1, 1); if (flash) px(gl, '#ff2f5a', dx - 1, dy + 1, 3, 3);
  if (flash) { gl.globalAlpha = 0.14; for (let k = 0; k < 34; k++) px(gl, d.c, dx - k / 2, dy + 5 + k, k + 1, 1); gl.globalAlpha = 1; }
}

export function neonCityConcept() {
  return {
    seed: 'neon', speed: 60, zoneLen: 1600, dayBars: 128, dayStart: 0, beforeZone: 'market',
    zones: DISTRICTS,
    post: { bloom: 0.45, glow: 0.7, vignette: 0.5, grain: 0.06, bloomRadius: 3 },
    pickZone(k, prev, r) { let id = r.pick(IDS); if (id === prev) id = IDS[(IDS.indexOf(id) + 1 + r.int(0, IDS.length - 2)) % IDS.length]; return id; },
    fog(env) { return mix(DISTRICTS[env.centerZone.id].haze, skyAt(MOOD, env.day)[2], 0.4); },
    sky(g, env) {
      const d = DISTRICTS[env.centerZone.id], gl = env.glow, [top, mid, hor] = skyAt(MOOD, env.day).map(c => mix(c, d.haze, 0.35));
      for (let y = 0; y < DECK; y++) { const t = y / DECK; px(g, t < 0.5 ? mix(top, mid, t / 0.5) : mix(mid, hor, (t - 0.5) / 0.5), 0, y, env.w, 1); }
      // lightning on the snare, far away
      if ((env.lv.snare || 0) > 0.75 && rng('lt', Math.floor(env.cyc * 2)) < 0.35) { g.globalAlpha = 0.3; px(g, '#d8e8ff', 0, 0, env.w, DECK); g.globalAlpha = 1; }
      // a big moon behind the smog, clouds lit from below by the city
      const mx = Math.round(env.w * 0.78); disc(g, mx, 40, 20, mix(hor, '#ffe6f0', 0.55)); disc(g, mx - 5, 36, 6, mix(hor, '#ffffff', 0.6)); gl.globalAlpha = 0.25; disc(gl, mx, 40, 24, '#ffd0e8'); gl.globalAlpha = 1;
      for (let i = 0; i < 9; i++) {
        const cx = ((rng('cl', i) * (env.w + 200) - env.cam * 0.02 - env.cyc * 1.5) % (env.w + 200) + env.w + 200) % (env.w + 200) - 100, cy = 18 + rng('cly', i) * 60, wd = 30 + rng('clw', i) * 60;
        g.globalAlpha = 0.55; px(g, mix(mid, top, 0.3), cx, cy, wd, 4); px(g, mix(mid, top, 0.1), cx + 6, cy - 3, wd - 14, 3); px(g, mix(hor, d.a, 0.3), cx + 2, cy + 4, wd - 4, 1); g.globalAlpha = 1;
      }
      // a blimp with a screen, drifting
      const bx = Math.round(((env.cyc * 3 - env.cam * 0.03) % (env.w + 160) + env.w + 160) % (env.w + 160) - 80), by = 30;
      px(g, '#1c1a30', bx, by, 54, 14); px(g, '#1c1a30', bx + 3, by - 2, 48, 18); px(g, '#2c2a46', bx + 3, by - 2, 48, 2); px(g, '#141224', bx + 20, by + 15, 12, 4);
      screen(g, gl, bx + 10, by + 1, 32, 10, Math.floor(env.cyc / 16) % 3, d, env, 77);
      px(g, env.beat < 0.25 ? '#ff2f3f' : '#4a1018', bx + 52, by + 6, 2, 2); if (env.beat < 0.25) px(gl, '#ff2f3f', bx + 51, by + 5, 4, 4);
    },
    layers: [
      // colossal arcologies in the haze, with lit bands and beacons
      {
        parallax: 0.03, chunk: 120, haze: 0.45,
        gen(i, r) { return [{ x: i * 120 + r.int(0, 50), wd: r.int(46, 80), ht: r.int(130, 170), kind: r.int(0, 2), seed: r.int(0, 1e6), span: 90 }]; },
        draw(g, o, sx, env) {
          const c = mix(skyAt(MOOD, env.day)[2], '#000000', 0.62), lit = shade(c, 0.15), top = DECK - o.ht;
          if (o.kind === 0) { px(g, c, sx, top, o.wd, o.ht); px(g, c, sx + o.wd * 0.2, top - 20, o.wd * 0.6, 20); px(g, c, sx + o.wd / 2 - 1, top - 44, 3, 24); }
          else if (o.kind === 1) for (let r = 0; r < o.ht; r++) { const half = Math.round(o.wd / 2 * Math.min(1, 0.25 + r / o.ht)); px(g, c, sx + o.wd / 2 - half, top + r, half * 2, 1); }
          else { px(g, c, sx, top + 30, o.wd, o.ht - 30); px(g, c, sx + 8, top, 10, 40); px(g, c, sx + o.wd - 18, top + 10, 10, 30); px(g, c, sx, top + 20, o.wd, 6); }
          px(g, lit, sx, top, 1, o.ht);
        },
        glow(gl, o, sx, env) {
          const top = DECK - o.ht, d = DISTRICTS[env.centerZone.id];
          for (let b = 0; b < 5; b++) { const y = top + 20 + b * 24; gl.globalAlpha = 0.25; px(gl, b % 2 ? d.a : '#ffd98a', sx + 3, y, o.wd - 6, 1); }
          for (let k = 0; k < 30; k++) { const wx = sx + 3 + Math.floor(rng('aw', o.seed, k) * (o.wd - 6)), wy = top + 6 + Math.floor(rng('ah', o.seed, k) * (o.ht - 12)); gl.globalAlpha = 0.4; px(gl, '#ffd98a', wx, wy, 1, 1); }
          gl.globalAlpha = 1;
          if (env.beat < 0.25) px(gl, '#ff2f3f', sx + o.wd / 2 - 1, top - (o.kind === 0 ? 45 : 2), 3, 3);
        },
      },
      // far towers: dense silhouettes, windows as specks
      {
        parallax: 0.1, chunk: 48, haze: 0.32,
        gen(i, r, env) { const z = env.zoneAt(i * 48 + 24, 0.1).id; return [0, 1].map(k => ({ x: i * 48 + k * 24 + r.int(0, 6), wd: r.int(14, 26), top: r.int(60, 120), seed: r.int(0, 1e6), d: z, span: 30, z: r() })); },
        draw(g, o, sx, env) { const c = mix(DISTRICTS[o.d].haze, '#000000', 0.55); px(g, c, sx, o.top, o.wd, DECK - o.top); px(g, shade(c, 0.12), sx, o.top, 1, DECK - o.top); px(g, c, sx + o.wd / 2 - 1, o.top - 10, 2, 10); },
        glow(gl, o, sx) { gl.globalAlpha = 0.3; for (let y = o.top + 4; y < DECK - 4; y += 4) for (let k = sx + 2; k < sx + o.wd - 2; k += 3) if (rng('fw', o.seed, k, y) < 0.05) px(gl, rng('fc', o.seed, k, y) < 0.8 ? '#ffd98a' : '#8ae8ff', k, y, 1, 1); gl.globalAlpha = 1; },
      },
      // skyline: rooftops with tanks and antennas, holographic screens, searchlights; the flying traffic after it
      {
        parallax: 0.2, chunk: 64, haze: 0.22,
        gen(i, r, env) {
          const u = i * 64, z = env.zoneAt(u + 32, 0.2).id, out = [];
          for (let k = 0; k < 2; k++) out.push({ x: u + k * 32 + r.int(0, 6), kind: 'b', wd: r.int(20, 32), top: r.int(56, 104), seed: r.int(0, 1e6), z: r(), span: 36, d: z, roof: r.int(0, 3) });
          if (r.chance(0.32)) out.push({ x: u + r.int(4, 30), kind: 'screen', wd: r.int(32, 48), ht: r.int(20, 28), top: r.int(50, 84), show: r.int(0, 2), seed: r.int(0, 1e6), z: 2, span: 52, d: z });
          if (r.chance(0.22)) out.push({ x: u + r.int(0, 60), kind: 'search', seed: r.int(0, 1e6), z: -1, span: 120, d: z });
          if (r.chance(0.08)) out.push({ x: u + r.int(10, 50), kind: 'holo', seed: r.int(0, 1e6), z: 3, span: 50, d: z });
          return out;
        },
        draw(g, o, sx, env) {
          const d = DISTRICTS[o.d];
          if (o.kind === 'b') {
            const c = mix(d.wall, '#000000', 0.45);
            px(g, INK, sx - 1, o.top - 1, o.wd + 2, DECK - o.top + 1); px(g, c, sx, o.top, o.wd, DECK - o.top); px(g, shade(c, 0.15), sx, o.top, o.wd, 1);
            for (let y = o.top + 8; y < DECK; y += 12) px(g, shade(c, -0.25), sx, y, o.wd, 1);
            if (o.roof === 0) { box(g, sx + 3, o.top - 9, 8, 8, '#3a3048', { line: INK }); px(g, INK, sx + 4, o.top - 1, 1, 1); px(g, INK, sx + 9, o.top - 1, 1, 1); }
            else if (o.roof === 1) { px(g, INK, sx + o.wd / 2, o.top - 16, 1, 16); px(g, INK, sx + o.wd / 2 - 3, o.top - 12, 7, 1); }
            else if (o.roof === 2) { px(g, '#2a2440', sx + 2, o.top - 4, o.wd - 4, 4); px(g, shade('#2a2440', 0.2), sx + 2, o.top - 4, o.wd - 4, 1); }
            if (o.d === 'stacks') { px(g, c, sx + 4, o.top - 18, 6, 18); px(g, shade(c, 0.2), sx + 4, o.top - 18, 6, 1); }
            if (o.d === 'harbor' && o.seed % 3 === 0) { px(g, '#c84a2a', sx + 2, o.top - 26, 2, 26); px(g, '#c84a2a', sx + 2, o.top - 26, 30, 2); px(g, '#8a8aa0', sx + 28, o.top - 24, 1, 14); }
          } else if (o.kind === 'screen') screen(g, env.glow, sx, o.top, o.wd, o.ht, o.show, d, env, o.seed);
          else if (o.kind === 'holo') {
            // a hologram dancer above a projector, made of scan lines, dancing on the beat
            const gl = env.glow, c = d[['a', 'b', 'c'][o.seed % 3]], f = Math.floor(env.cyc * 4) % 4, top = 38, sway = [0, 2, 0, -2][f], arm = f % 2;
            px(g, '#2a2440', sx - 6, top + 62, 14, 4); px(g, INK, sx - 7, top + 61, 16, 1);
            gl.globalAlpha = 0.12; for (let k = 0; k < 60; k++) px(gl, c, sx + 1 - k / 6, top + 61 - k, Math.max(1, k / 3), 1); gl.globalAlpha = 1;
            const fig = [[0, 0, 4, 4], [-1, 4, 6, 10], [-1 + sway, 14, 2, 12], [3 + sway, 14, 2, 12], [arm ? -5 : -4, arm ? -2 : 5, 2, arm ? 8 : 8], [arm ? 6 : 5, arm ? 5 : -3, 2, 8]];
            for (const [fx, fy, fw, fh] of fig) for (let yy = 0; yy < fh * 2; yy++) if (yy % 2 === 0 || rng('hs', o.seed, yy, Math.floor(env.cyc * 8)) < 0.3) { gl.globalAlpha = 0.55 + (env.lv.kick || 0) * 0.35; px(gl, c, sx + fx * 2 + sway, top + 20 + fy * 2 + yy, fw * 2, 1); }
            gl.globalAlpha = 1;
          }
          else if (o.kind === 'search') {
            const a = -Math.PI / 2 + Math.sin(env.cyc * 0.9 + o.seed) * 0.6, gl = env.glow;
            gl.globalAlpha = 0.05 + (env.lv.kick || 0) * 0.04;
            for (let s = 0; s < 170; s += 2) { const w2 = 1 + s / 9; px(gl, d.b, sx + Math.cos(a) * s - w2 / 2, DECK - 50 + Math.sin(a) * s, w2, 2); }
            gl.globalAlpha = 1;
          }
        },
        glow(gl, o, sx, env) {
          if (o.kind !== 'b') return;
          const d = DISTRICTS[o.d];
          gl.globalAlpha = 0.6;
          for (let y = o.top + 3; y < DECK - 3; y += 4) { if (rng('row', o.seed, y) > 0.3) continue; const c = rng('sc', o.seed, y) < 0.75 ? '#ffd98a' : d.b; for (let k = sx + 2; k < sx + o.wd - 2; k += 3) if (rng('sw', o.seed, k, y) < 0.7) px(gl, c, k, y, 2, 2); }
          gl.globalAlpha = 1;
          if (o.d === 'stacks') { const fl = (Math.floor(env.cyc * 8) + o.seed) % 3; px(gl, ['#ff8a2f', '#ffd23f', '#ff3f3f'][fl], sx + 5, o.top - 21, 4, 3); }
          if (env.beat < 0.2 && o.seed % 2) px(gl, '#ff2f3f', sx + o.wd / 2 - 1, o.top - 17, 2, 2);
        },
        after(g, env) {
          // the flying traffic, three lanes at different depths
          const gl = env.glow;
          for (const [lane, y, speed, n] of [[0, 52, 30, 7], [1, 78, 48, 5], [2, 104, 74, 4]]) for (let i = 0; i < n; i++) {
            const dir = (lane + i) % 2 ? 1 : -1, span = env.w + 80, x = ((rng('car', lane, i) * span + env.cyc * speed * dir - env.cam * (0.2 + lane * 0.1)) % span + span) % span - 40;
            const sz = 4 + lane * 2, cy = y + Math.round(rng('cy', lane, i) * 10), c = ['#3a3f5a', '#5a2a4a', '#2a4a5a'][i % 3];
            px(g, INK, x - 1, cy - 1, sz * 3 + 2, sz + 1); px(g, c, x, cy, sz * 3, sz - 1); px(g, shade(c, 0.3), x + 2, cy, sz * 3 - 4, 1); px(g, '#8ae8ff', x + (dir > 0 ? sz * 2 : 2), cy + 1, sz - 1, 1);
            px(gl, dir > 0 ? '#fff6d0' : '#ff2f5a', dir > 0 ? x + sz * 3 - 1 : x, cy + 1, 1, 1);
            gl.globalAlpha = 0.35; for (let k = 1; k < 10 + lane * 4; k++) px(gl, dir > 0 ? '#ff2f5a' : '#fff6d0', dir > 0 ? x - k : x + sz * 3 + k, cy + 1, 1, 1); gl.globalAlpha = 1;
          }
        },
      },
      // the elevated train line, a train now and then
      {
        parallax: 0.34, chunk: 80, haze: 0.14,
        gen(i) { return [{ x: i * 80, kind: 'pillar', span: 10 }]; },
        before(g, env) {
          const y = 96; px(g, INK, 0, y - 1, env.w, 8); px(g, '#2a2640', 0, y, env.w, 6); px(g, '#3e3a58', 0, y, env.w, 1);
          for (let x = -((env.cam * 0.34) % 12); x < env.w; x += 12) px(g, '#1a1828', x, y + 2, 1, 3);
          // the train: comes every 24 bars, crosses in about 6
          const t = (env.cyc % 24) / 6;
          if (t < 1) {
            const len = 220, x = Math.round(-len + t * (env.w + len + 200) - 100), d = DISTRICTS[env.centerZone.id], gl = env.glow;
            for (let c = 0; c < 4; c++) {
              const cx = x + c * 56; px(g, INK, cx - 1, y - 15, 54, 15); px(g, '#c8ccd8', cx, y - 14, 52, 13); px(g, '#e8ecf4', cx, y - 14, 52, 1); px(g, d.a, cx, y - 4, 52, 1); px(gl, d.a, cx, y - 4, 52, 1);
              for (let k = 0; k < 6; k++) { px(g, '#2a3044', cx + 3 + k * 8, y - 11, 6, 5); gl.globalAlpha = 0.6; px(gl, '#fff0c0', cx + 3 + k * 8, y - 11, 6, 5); gl.globalAlpha = 1; }
            }
            px(gl, '#fff6d0', x + 223, y - 9, 2, 3);
          }
        },
        draw(g, o, sx) { px(g, INK, sx - 1, 102, 8, DECK - 102); px(g, '#221e36', sx, 102, 6, DECK - 102); px(g, '#34304c', sx, 102, 1, DECK - 102); px(g, '#221e36', sx - 4, 102, 14, 3); },
      },
      // the street close by: brick facades, windows, fire escapes, air units, shop fronts, neon
      {
        parallax: 0.62, chunk: 76, haze: 0.07,
        gen(i, r, env) {
          const u = i * 76, z = env.zoneAt(u + 38, 0.62).id, out = [];
          out.push({ x: u + r.int(0, 6), kind: 'facade', wd: r.int(56, 72), top: r.int(92, 120), seed: r.int(0, 1e6), span: 62, d: z, escape: r.chance(0.5), shop: r.int(0, 3) });
          if (r.chance(0.75)) out.push({ x: u + r.int(4, 50), kind: 'vsign', word: Array.from({ length: r.int(3, 4) }, () => r.pick([...GLYPHS])).join(''), top: r.int(106, 124), col: r.pick(['a', 'b', 'c']), seed: r.int(0, 1e6), z: 2, span: 8, d: z });
          if (r.chance(0.45)) out.push({ x: u + r.int(0, 30), kind: 'hsign', word: r.pick(['RAMEN', 'BAR', 'HOTEL', 'CLUB', 'TECH', 'NOODLE', 'KARAOKE', 'DATA', 'SUSHI', 'PAWN']), top: r.int(132, 146), col: r.pick(['a', 'b', 'c']), seed: r.int(0, 1e6), z: 2, span: 44, d: z });
          return out;
        },
        draw(g, o, sx, env) {
          const d = DISTRICTS[o.d], gl = env.glow;
          if (o.kind === 'facade') {
            const c = mix(d.wall, '#000000', 0.25), base = DECK;
            px(g, INK, sx - 1, o.top - 1, o.wd + 2, base - o.top + 1);
            bricks(g, sx, o.top, o.wd, base - o.top, c, o.seed);
            // cornice and roof edge
            px(g, shade(c, 0.2), sx - 1, o.top, o.wd + 2, 2); px(g, shade(c, -0.4), sx - 1, o.top + 2, o.wd + 2, 1);
            // windows in rows
            for (let y = o.top + 7; y < base - 26; y += 14) for (let k = sx + 5; k < sx + o.wd - 12; k += 14) windowAt(g, gl, k, y, 9, 9, rng('lit', o.seed, k, y) < 0.45, d, hashKey(o.seed, k, y), env);
            // a fire escape: platforms and zigzag stairs
            if (o.escape) for (let y = o.top + 15; y < base - 24; y += 11) { px(g, INK, sx + o.wd - 16, y, 15, 1); for (let k = 0; k < 15; k += 2) px(g, INK, sx + o.wd - 16 + k, y - 3, 1, 3); px(g, INK, sx + o.wd - 16, y - 3, 15, 1); for (let s = 0; s < 8; s++) px(g, INK, sx + o.wd - 14 + s, y + 1 + s, 2, 1); }
            // balconies with plants
            for (let y = o.top + 15; y < base - 26; y += 22) { const bx = sx + 4 + (o.seed % 2) * 14; px(g, INK, bx - 1, y, 14, 1); for (let k = 0; k < 14; k += 2) px(g, INK, bx - 1 + k, y - 3, 1, 3); px(g, INK, bx - 1, y - 3, 14, 1); px(g, '#5a3a2a', bx + 2, y - 3, 3, 2); px(g, '#3f8a4a', bx + 2, y - 5, 3, 2); px(g, '#5a3a2a', bx + 9, y - 3, 3, 2); px(g, '#4f9a4a', bx + 9, y - 6, 3, 3); }
            // a cable to the next building, with laundry or little lights
            { const cy = o.top + 10 + (o.seed % 3) * 6; for (let k = 0; k < 64; k++) px(g, '#4a4466', sx + o.wd + k - 8, cy + Math.round(Math.sin((k / 64) * Math.PI) * 5), 1, 1);
              for (let k = 4; k < 56; k += 8) { const yy = cy + Math.round(Math.sin(((k + 2) / 64) * Math.PI) * 5); if (o.seed % 2) { px(g, ['#c8483a', '#3a6ac8', '#e8e0d0', '#d8b43a'][k % 4], sx + o.wd + k - 8, yy + 1, 4, 5); } else { const on = (Math.floor(env.cyc * 4) + k) % 3 === 0; px(g, on ? d.c : shade(d.c, -0.5), sx + o.wd + k - 8, yy + 1, 1, 1); if (on) px(gl, d.c, sx + o.wd + k - 9, yy, 3, 3); } } }
            // air units and a pipe
            box(g, sx + 2, o.top + 18, 7, 5, '#5a5a6e', { line: INK }); px(g, '#3a3a4a', sx + 3, o.top + 20, 5, 1);
            px(g, '#3a3448', sx + o.wd - 3, o.top + 4, 2, base - o.top - 6); px(g, shade('#3a3448', 0.3), sx + o.wd - 3, o.top + 4, 1, base - o.top - 6);
            // the shop at street level: shutter, door, a lit window, an awning
            const sy = base - 22;
            px(g, INK, sx, sy - 1, o.wd, 1);
            if (o.shop === 0) { for (let k = 0; k < 14; k += 2) px(g, '#4a4658', sx + 3, sy + 4 + k, o.wd - 6, 1); }
            else { px(g, '#120e1e', sx + 3, sy + 3, o.wd - 6, 19); px(g, mix(d.a, '#000000', 0.6), sx + 5, sy + 5, o.wd - 18, 10); gl.globalAlpha = 0.3; px(gl, o.shop === 1 ? d.a : '#ffcf7a', sx + 5, sy + 5, o.wd - 18, 10); gl.globalAlpha = 1; px(g, '#2a2236', sx + o.wd - 11, sy + 6, 6, 16); }
            const aw = d[['a', 'b', 'c'][o.seed % 3]];
            for (let k = 0; k < o.wd; k += 4) { px(g, k % 8 ? shade(aw, -0.3) : shade(aw, -0.55), sx + k, sy, 4, 3); px(g, INK, sx + k, sy + 3, 1, 1); }
          } else if (o.kind === 'vsign') neon(g, gl, sx, o.top, o.word, d[o.col], true, o.seed, env);
          else if (o.kind === 'hsign') neon(g, gl, sx, o.top, o.word, d[o.col], false, o.seed, env);
        },
      },
      // street level of the skyway: lamps with volumetric light, vending machines, cables
      {
        parallax: 1, chunk: 128,
        gen(i, r, env) {
          const u = i * 128, z = env.zoneAt(u + 64, 1).id, out = [{ x: u + 12, kind: 'lamp', span: 40, d: z }];
          if (r.chance(0.5)) out.push({ x: u + r.int(40, 100), kind: 'vend', seed: r.int(0, 1e6), span: 14, d: z });
          if (r.chance(0.1)) out.push({ x: u + 60, kind: 'gantry', span: 80, d: z });
          return out;
        },
        draw(g, o, sx, env) {
          const d = DISTRICTS[o.d], gl = env.glow;
          if (o.kind === 'lamp') {
            px(g, INK, sx - 1, DECK - 60, 4, 60); px(g, '#2a2a40', sx, DECK - 60, 2, 60); px(g, INK, sx, DECK - 61, 16, 3); px(g, '#2a2a40', sx + 1, DECK - 60, 14, 1);
            px(g, mix(d.b, '#ffffff', 0.5), sx + 10, DECK - 58, 6, 1); px(gl, d.b, sx + 10, DECK - 58, 6, 2);
            gl.globalAlpha = 0.07; for (let k = 0; k < 56; k++) px(gl, d.b, sx + 13 - k / 2.6, DECK - 57 + k, Math.floor(k / 1.3) + 2, 1); gl.globalAlpha = 1;
            g.globalAlpha = 0.25; px(g, d.b, sx - 8, DECK, 40, 1); g.globalAlpha = 1;
          } else if (o.kind === 'vend') {
            px(g, INK, sx - 1, DECK - 25, 14, 25); px(g, '#2a2e48', sx, DECK - 24, 12, 24); px(g, mix(d.c, '#000000', 0.4), sx + 2, DECK - 22, 8, 10);
            gl.globalAlpha = 0.7; px(gl, d.c, sx + 2, DECK - 22, 8, 10); gl.globalAlpha = 1;
            for (let k = 0; k < 3; k++) px(g, shade(d.c, 0.3), sx + 3, DECK - 21 + k * 3, 6, 1);
          } else {
            px(g, INK, sx - 1, DECK - 82, 5, 82); px(g, INK, sx + 75, DECK - 82, 5, 82); px(g, '#2a2a40', sx, DECK - 82, 3, 82); px(g, '#2a2a40', sx + 76, DECK - 82, 3, 82);
            px(g, INK, sx - 3, DECK - 87, 86, 6); px(g, '#2a2a40', sx - 2, DECK - 86, 84, 4);
            px(g, INK, sx + 6, DECK - 80, 68, 14); px(g, '#0e2a4a', sx + 7, DECK - 79, 66, 12); text(g, d.name.slice(0, 16), sx + 9, DECK - 75, '#e8f4ff'); text(gl, d.name.slice(0, 16), sx + 9, DECK - 75, '#a8d8ff');
            for (let k = 0; k < 7; k++) { const on = k % 2 === Math.floor(env.cyc * 4) % 2; px(g, on ? d.c : '#3a3020', sx + 8 + k * 10, DECK - 85, 3, 1); if (on) px(gl, d.c, sx + 8 + k * 10, DECK - 85, 3, 1); }
          }
        },
      },
      // in front of everything, out of focus: pillars, hanging cables, a sign
      {
        parallax: 1.6, chunk: 220, front: true, blur: 1.4,
        gen(i, r) { const out = []; if (r.chance(0.55)) out.push({ x: i * 220 + r.int(0, 150), kind: r.chance(0.6) ? 'pillar' : 'cable', seed: r.int(0, 1e6), span: 60 }); return out; },
        draw(g, o, sx, env) {
          if (o.kind === 'pillar') { px(g, '#040209', sx, 0, 26, env.h); px(g, '#12101c', sx + 2, 0, 2, env.h); for (let y = 10; y < env.h; y += 22) px(g, '#0a0812', sx, y, 26, 3); }
          else for (let k = 0; k < 3; k++) for (let x = -40; x < 120; x++) px(g, '#040209', sx + x, 6 + k * 7 + Math.round(((x - 40) * (x - 40)) / 220), 1, 2);
        },
      },
    ],
    ground(g, env) {
      const d = DISTRICTS[env.centerZone.id], gl = env.glow, bass = Math.min(1, (env.lv.kick || 0) * 0.7 + (env.lv.bass || 0) * 0.5);
      // the far parapet of the skyway: concrete panels, stains, a neon strip on top, the city below it
      const P = 22, top = DECK - P;
      px(g, INK, 0, top - 1, env.w, P + 1);
      for (let x = -(env.cam % 40); x < env.w; x += 40) {
        px(g, '#1c1a2a', x, top, 39, P); px(g, '#26233a', x, top, 39, 1); px(g, '#0e0c18', x + 39, top, 1, P);
        const k = Math.floor((x + env.cam) / 40);
        if (rng('stain', k) < 0.5) { g.globalAlpha = 0.35; px(g, '#0a0812', x + 4 + Math.floor(rng('sx', k) * 20), top + 3, 6, P - 4); g.globalAlpha = 1; }
        if (rng('tag', k) < 0.25) text(g, ['NO', 'X7', 'RUN', 'MISK'][Math.floor(rng('tw', k) * 4)], x + 8, top + 9, mix(d.a, '#1c1a2a', 0.55));
        px(g, '#2e2a44', x + 2, top + P - 5, 35, 1);
      }
      px(g, mix(d.b, '#ffffff', 0.25), 0, top + 2, env.w, 1); gl.globalAlpha = 0.55; px(gl, d.b, 0, top + 2, env.w, 1); gl.globalAlpha = 1;
      // the deck: wet asphalt, a neon edge, lanes that rush by
      for (let y = DECK; y < env.h; y++) px(g, mix('#120f20', '#06050c', (y - DECK) / (env.h - DECK)), 0, y, env.w, 1);
      px(g, mix(d.a, '#ffffff', 0.3), 0, DECK, env.w, 1); px(gl, d.a, 0, DECK, env.w, 1); gl.globalAlpha = 0.3 + bass * 0.5; px(gl, d.a, 0, DECK + 1, env.w, 2); gl.globalAlpha = 1;
      for (let x = -(env.cam % 32); x < env.w; x += 32) { px(g, '#5a5670', x, DECK + 16, 16, 1); px(g, '#3a3650', x, DECK + 17, 16, 1); }
      for (let x = -(env.cam % 9); x < env.w; x += 9) px(g, '#1c1a2c', x, DECK + 30, 4, 1);
      // steam rising from vents in the parapet
      for (let k = Math.floor(env.cam / 150) - 1; k <= Math.floor((env.cam + env.w) / 150); k++) {
        if (rng('vent', k) > 0.4) continue;
        const vx = Math.round(k * 150 + rng('vx', k) * 100 - env.cam);
        px(g, '#0a0812', vx, top + P - 4, 8, 3);
        for (let p = 0; p < 6; p++) { const a = (env.cyc * 0.5 + p / 6 + rng('vp', k)) % 1; g.globalAlpha = 0.25 * (1 - a); disc(g, vx + 4 + Math.sin(a * 6 + p) * 3, top + P - 6 - a * 40, 2 + Math.round(a * 6), '#b8b0d0'); }
        g.globalAlpha = 1;
      }
      // the city mirrored on the wet deck: streaks of the neon colours, broken by the lanes
      if (d.rain > 0.15) for (let x = 0; x < env.w; x += 2) { const k = Math.floor((x + env.cam * 0.55) / 2); if (rng('rf', k) < 0.22) { const c = rng('rc', k) < 0.5 ? d.a : rng('rc2', k) < 0.5 ? d.b : '#ffcf7a', len = 3 + Math.floor(rng('rl', k) * 14); gl.globalAlpha = 0.12 * d.rain + 0.05; px(gl, c, x, DECK + 3, 1, len); gl.globalAlpha = 1; } }
    },
    actors(g, env) { van(g, env.glow, Math.round(env.w / 2) - 48, DECK - 6, env); },
    after(g, env) {
      const d = DISTRICTS[env.centerZone.id], gl = env.glow;
      // the rail in front, posts rushing by
      px(g, '#040209', 0, env.h - 9, env.w, 9); px(g, mix(d.b, '#000000', 0.3), 0, env.h - 10, env.w, 1); gl.globalAlpha = 0.5; px(gl, d.b, 0, env.h - 10, env.w, 1); gl.globalAlpha = 1;
      for (let x = -((env.cam * 1.3) % 34); x < env.w; x += 34) { px(g, '#040209', x, env.h - 19, 4, 10); px(gl, d.b, x + 1, env.h - 19, 2, 1); }
      // rain, by district: long drops far, short bright ones near
      if (d.rain > 0) {
        g.globalAlpha = 0.3; for (let i = 0; i < 120 * d.rain; i++) { const x = ((rng('rx', i) * env.w + env.cyc * 30 - env.cam * 0.3) % env.w + env.w) % env.w, y = ((rng('ry', i) * env.h + env.cyc * 240) % env.h); px(g, '#8aa8d8', x, y, 1, 5); } g.globalAlpha = 1;
        gl.globalAlpha = 0.25; for (let i = 0; i < 30 * d.rain; i++) { const x = ((rng('rx2', i) * env.w + env.cyc * 40 - env.cam * 0.6) % env.w + env.w) % env.w, y = ((rng('ry2', i) * env.h + env.cyc * 380) % env.h); px(gl, '#c8e0ff', x, y, 1, 7); } gl.globalAlpha = 1;
      }
    },
  };
}
const hashKey = (...k) => Math.floor(rng('hk', ...k) * 1e9);

export function createNeonCity() { return createScroller(neonCityConcept(), { w: W, h: H }); }
