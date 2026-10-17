// Neon city v3 (procedural-visuals): a hover truck with a stage on its bed (speakers, a DJ, dancers) drives right down a
// street of an endless cyberpunk city, district after district. Version 3 moves the camera close, like the arcade
// games of the nineties: the street fills the picture, the people are a sixth of its height, every building, sign and
// vehicle is a detailed sprite baked once from its seed (see neon/). Behind the street: towers of the middle distance,
// a far skyline, and the landmark of each district, huge in the haze.
// The music: the speakers and the underglow pump with the kick and the bass, the crew and the people on the pavement
// dance on the beat, the signs flicker with the hats, the beacons blink, a flash of lightning on the snare.
import { createScroller, rng, mix, shade, skyAt } from './scroller.js';
import { px, disc, put, bayer, bake, noise, gradStrip } from './pixel-art.js';
import { facade, sign, tower, skyline, txt, FLOOR } from './neon/buildings.js';
import { person, dancer, DANCE } from './neon/people.js';
import { van, crewOf, VAN_W } from './neon/van.js';
import { landmark, LANDMARKS } from './neon/landmarks.js';

const W = 384, H = 216, WALK = 170, ROAD = 176;
export const DISTRICTS = {
  market: { name: 'NEON MARKET', a: '#ff2fa8', b: '#29e6ff', c: '#ffd23f', rain: 0.6, haze: '#40205e', wall: '#5a3a5a', styles: ['shophouse', 'brick', 'shophouse', 'metal'] },
  spires: { name: 'SPIRE ONE', a: '#4fc3ff', b: '#e8f4ff', c: '#9a7cff', rain: 0.2, haze: '#1a2f58', wall: '#3a4a6a', styles: ['concrete', 'concrete', 'metal'] },
  stacks: { name: 'STACKS 9', a: '#ff8a2f', b: '#ffd23f', c: '#ff3f3f', rain: 0.1, haze: '#4e2e1c', wall: '#6a4a38', styles: ['metal', 'brick', 'metal'] },
  oldtown: { name: 'OLD TOWN', a: '#ff3f5a', b: '#ffb43f', c: '#3fffb0', rain: 0.8, haze: '#40162e', wall: '#6a3a3a', styles: ['brick', 'shophouse', 'brick'] },
  harbor: { name: 'HARBOR', a: '#3fffd8', b: '#2f8fff', c: '#ff6f3f', rain: 0.4, haze: '#123444', wall: '#3a5058', styles: ['metal', 'concrete', 'brick'] },
  datacore: { name: 'DATA CORE', a: '#5aff6a', b: '#29e6ff', c: '#d0ff3f', rain: 0, haze: '#123024', wall: '#2a4a3a', styles: ['concrete', 'metal', 'concrete'] },
};
const IDS = Object.keys(DISTRICTS);
// the mood of the night: violet, teal, amber smog → [top, middle, horizon]
const MOOD = { 0: ['#0a0420', '#2a0e4a', '#8a2a6a'], 0.33: ['#020e1e', '#0a3048', '#2a7a8a'], 0.66: ['#140808', '#3c1c14', '#a0542a'] };
// the moon, baked by its colours (they change slowly with the mood)
const moonOf = (c, spot, dark) => bake(`moon|${c}`, 70, 70, g => {
  for (let y = -34; y <= 34; y++) for (let x = -34; x <= 34; x++) if (x * x + y * y <= 34 * 34) {
    const n = rng('moon', Math.floor((x + 40) / 3), Math.floor((y + 40) / 3));
    px(g, x + y > 20 && bayer(x + 40, y + 40) < (x + y - 20) / 40 ? dark : n < 0.18 ? spot : c, x + 35, y + 35);
  }
});
const dOf = id => ({ ...DISTRICTS[id], dk: id });

export function neonCityConcept() {
  const crew = crewOf('misk');
  return {
    seed: 'neon3', speed: 56, zoneLen: 3000, dayBars: 128, dayStart: 0, beforeZone: 'market',
    zones: DISTRICTS,
    post: { bloom: 0.5, glow: 0.75, vignette: 0.45, grain: 0.05, bloomRadius: 3 },
    pickZone(k, prev, r) { let id = r.pick(IDS); if (id === prev) id = IDS[(IDS.indexOf(id) + 1 + r.int(0, IDS.length - 2)) % IDS.length]; return id; },
    fog(env) { return mix(DISTRICTS[env.centerZone.id].haze, skyAt(MOOD, env.day)[2], 0.45); },
    sky(g, env) {
      const d = DISTRICTS[env.centerZone.id], gl = env.glow, day = Math.round(env.day * 96) / 96, [top, mid, hor] = skyAt(MOOD, day).map(c => mix(c, d.haze, 0.3));
      g.drawImage(gradStrip(env.w, 150, [top, mid, mix(mid, hor, 0.5), hor]).c, 0, 0);
      px(g, hor, 0, 150, env.w, H - 150);
      if ((env.lv.snare || 0) > 0.75 && rng('lt', Math.floor(env.cyc * 2)) < 0.35) { g.globalAlpha = 0.25; px(g, '#d8e8ff', 0, 0, env.w, 150); g.globalAlpha = 1; }
      // a huge moon low behind the city, its light on the haze
      const mx = Math.round(env.w * 0.7 - env.cam * 0.01 % 40), my = 78;
      gl.globalAlpha = 0.18; disc(gl, mx, my, 54, mix(hor, '#ffe6f0', 0.5)); gl.globalAlpha = 0.3; disc(gl, mx, my, 40, '#ffd8ec'); gl.globalAlpha = 1;
      put(g, null, moonOf(mix(hor, '#ffe6f0', 0.6), mix(hor, '#d8b0c8', 0.6), mix(hor, '#c890b0', 0.5)), mx - 35, my - 35);
      // bands of cloud lit from below, drifting
      for (let i = 0; i < 12; i++) {
        const span = env.w + 260, cx = ((rng('cl', i) * span - env.cam * 0.02 - env.cyc * 1.5) % span + span) % span - 130, cy = 14 + rng('cly', i) * 70, wd = 50 + rng('clw', i) * 110;
        for (let k = 0; k < 4; k++) { const c = mix(mid, k < 2 ? top : hor, k < 2 ? 0.3 - k * 0.1 : (k - 1) * 0.25); g.globalAlpha = 0.7; px(g, c, cx + k * 4, cy + k * 2, wd - k * 8, 2); }
        g.globalAlpha = 0.5; px(g, mix(hor, d.a, 0.35), cx + 12, cy + 8, wd - 24, 1); g.globalAlpha = 1;
      }
    },
    layers: [
      // the far skyline: strips of towers with specks of windows
      {
        parallax: 0.12, chunk: 200, haze: 0.42,
        gen(i, r, env) { const z = env.zoneAt(i * 200 + 100, 0.12).id; return [{ x: i * 200, seed: r.int(0, 1e6), z: 0, span: 200, d: z }]; },
        draw(g, o, sx, env) { const b = skyline({ seed: o.seed, d: dOf(o.d), dk: o.d, w: 204 }); put(g, env.glow, b, sx, WALK - 8 - b.h); },
      },
      // towers of the middle distance, the flying traffic in front of them
      {
        parallax: 0.3, chunk: 80, haze: 0.24,
        gen(i, r, env) { const z = env.zoneAt(i * 80 + 40, 0.3).id, out = [{ x: i * 80 + r.int(0, 30), seed: r.int(0, 1e6), wd: r.int(24, 44), ht: r.chance(0.2) ? r.int(110, 150) : r.int(60, 100), z: r(), span: 50, d: z }]; if (r.chance(0.3)) out.push({ x: i * 80 + r.int(40, 64), seed: r.int(0, 1e6), wd: r.int(18, 28), ht: r.int(60, 100), z: r() + 1, span: 40, d: z }); return out; },
        draw(g, o, sx, env) { const b = tower({ seed: o.seed, d: dOf(o.d), dk: o.d, wd: o.wd, ht: o.ht }); put(g, env.glow, b, sx, WALK + 4 - b.h); if (env.beat < 0.2 && o.seed % 3 === 0) px(env.glow, '#ff2f3f', sx + Math.floor(o.wd / 2), WALK + 4 - b.h + 1, 2, 2); },
        after(g, env) {
          const gl = env.glow;
          for (const [lane, y, speed, n, sz] of [[0, 46, 26, 6, 6], [1, 70, 40, 4, 9], [2, 96, 60, 3, 12]]) for (let i = 0; i < n; i++) {
            const dir = (lane + i) % 2 ? 1 : -1, span = env.w + 120, x = ((rng('car', lane, i) * span + env.cyc * speed * dir - env.cam * (0.3 + lane * 0.1)) % span + span) % span - 60;
            car(g, gl, x, y + Math.round(rng('cy', lane, i) * 10), sz, dir, ['#3a3f5a', '#5a2a4a', '#2a4a5a', '#6a5a3a'][i % 4]);
          }
        },
      },
      // the landmark of each district, colossal in the haze: it crosses the picture once while its zone goes by, so it
      // is seen whole for a long time (a far layer that moved with its parallax would bring the next one too soon)
      {
        parallax: 0, chunk: 10000, haze: 0.2,
        gen() { return []; },
        before(g, env) {
          const L = env.zone(0).len, c = env.cam + env.w / 2, k0 = Math.floor(c / L);
          for (let k = k0 - 1; k <= k0 + 1; k++) {
            const id = env.zone(k * L + 1).id, b = landmark(id, dOf(id), k), t = (c - (k + 0.5) * L) / L, x = Math.round(env.w / 2 - t * (env.w + b.w + 40) - b.w / 2), y = Math.max(WALK - b.h + 6, 6);
            if (x > env.w || x + b.w < 0) continue;
            put(g, env.glow, b, x, y, { light: 0.8 + (env.lv.pad || 0) * 0.3 }); b.beat(g, env.glow, x, y, env);
          }
        },
        draw() {},
      },
      // the street close by: facades with shops, neon signs, the pavement and the people on it
      {
        parallax: 0.8, chunk: 140, haze: 0.04,
        gen(i, r, env) {
          const u = i * 140, z = env.zoneAt(u + 70, 0.8).id, d = DISTRICTS[z], out = [];
          const wd = r.int(104, 136), top = r.chance(0.18) ? r.pick([-10, 10]) : r.pick([56, 70, 84, 96, 110]), ht = WALK - top - 22;
          const f = { x: u + r.int(0, 140 - wd), kind: 'facade', seed: r.int(0, 1e6), wd, ht: Math.floor((ht - 36) / FLOOR) * FLOOR + 36, style: r.pick(d.styles), span: wd + 4, d: z, z: 0 };
          out.push(f);
          const fh = f.ht;
          if (r.chance(0.8)) out.push({ x: f.x + (r.chance(0.5) ? -6 : wd - 9), kind: 'sign', top: WALK - fh + r.int(10, Math.max(12, fh - 120)), vertical: true, n: r.int(4, 7), col: r.pick(['a', 'b', 'c']), seed: r.int(0, 1e6), span: 16, d: z, z: 2 });
          if (r.chance(0.5)) out.push({ x: f.x + r.int(10, wd - 50), kind: 'sign', top: WALK - 36 - r.int(26, 50), vertical: false, n: r.int(3, 4), col: r.pick(['a', 'b', 'c']), seed: r.int(0, 1e6), span: 50, d: z, z: 2 });
          // people on the pavement, a vending machine, rubbish
          const np = r.pick([0, 1, 1, 2, 3]);
          for (let k = 0; k < np; k++) out.push({ x: u + r.int(10, 130), kind: 'person', p: person(`pv${i}-${k}`), move: r.int(0, DANCE.length - 1), flip: r.chance(0.5), umbrella: r.chance(d.rain * 0.8) ? r.pick(['a', 'b', 'c']) : null, span: 30, d: z, z: 4 + r() });
          if (top > 40 && r.chance(0.3)) out.push({ x: f.x + r.int(8, wd - 60), kind: 'board', top: WALK - fh - 22 - 34, wd: r.int(48, 60), ht: r.int(26, 32), show: r.int(0, 3), seed: r.int(0, 1e6), span: 64, d: z, z: -1 });
          if (r.chance(0.35)) out.push({ x: u + r.int(10, 120), kind: 'vend', seed: r.int(0, 1e6), span: 16, d: z, z: 3 });
          if (r.chance(0.4)) out.push({ x: u + r.int(0, 130), kind: 'bags', seed: r.int(0, 1e6), span: 16, d: z, z: 3 });
          return out;
        },
        draw(g, o, sx, env) {
          const d = dOf(o.d), gl = env.glow;
          if (o.kind === 'facade') { const b = facade({ seed: o.seed, d, dk: o.d, wd: o.wd, ht: o.ht, style: o.style }); put(g, gl, b, sx - 1, WALK - b.h); }
          else if (o.kind === 'sign') {
            const b = sign({ seed: o.seed, col: d[o.col], vertical: o.vertical, n: o.n }), on = !((env.lv.hats || 0) > 0.55 && rng('ns', o.seed, Math.floor(env.cyc * 8)) < 0.3) && rng('dead', o.seed, Math.floor(env.cyc)) > 0.03;
            // brackets to the wall
            if (o.vertical) { px(g, '#2a2440', sx - 3, o.top + 3, 3, 1); px(g, '#2a2440', sx - 3, o.top + b.h - 5, 3, 1); px(g, '#2a2440', sx + b.w, o.top + 3, 3, 1); }
            put(g, gl, b, sx, o.top, { light: on ? 1 : 0 });
            if (!on) { g.globalAlpha = 0.5; px(g, '#07040f', sx + 1, o.top + 1, b.w - 2, b.h - 2); g.globalAlpha = 1; }
            else { gl.globalAlpha = 0.18; px(gl, d[o.col], sx - 4, o.top - 4, b.w + 8, b.h + 8); gl.globalAlpha = 1; }
          } else if (o.kind === 'person') {
            dancer(g, null, o.p, sx, WALK + 4, Math.floor(env.cyc * 2) + (o.p.seed.length % 2), { move: o.umbrella ? 0 : o.move, flip: o.flip });
            if (o.umbrella) umbrella(g, gl, sx, WALK - 40, d[o.umbrella]);
          } else if (o.kind === 'board') billboard(g, gl, sx, o.top, o.wd, o.ht, o.show, d, env, o.seed);
          else if (o.kind === 'vend') vending(g, gl, sx, WALK + 2, d, o.seed);
          else if (o.kind === 'bags') bags(g, sx, WALK + 3, o.seed);
        },
        before(g, env) {
          // the pavement: slabs, a kerb, moving with the street
          const off = env.cam * 0.8;
          g.drawImage(gradStrip(env.w, 8, ['#3a3448', '#2c2838', '#221e2e']).c, 0, WALK - 2);
          for (let x = -(off % 24); x < env.w; x += 24) px(g, '#1a1626', x, WALK - 2, 1, 7);
          px(g, '#4a445a', 0, WALK - 2, env.w, 1);
          px(g, '#6a6478', 0, ROAD - 2, env.w, 1); px(g, '#141020', 0, ROAD - 1, env.w, 2);
        },
      },
      // in front of everything, out of focus: tall street lamps, hanging cables with little lights, a sign post
      {
        parallax: 1.5, chunk: 260, front: true, blur: 1.2,
        gen(i, r) { const out = []; if (r.chance(0.7)) out.push({ x: i * 260 + r.int(0, 120), kind: r.chance(0.7) ? 'lamp' : 'post', seed: r.int(0, 1e6), span: 70 }); if (r.chance(0.5)) out.push({ x: i * 260 + r.int(0, 200), kind: 'cable', seed: r.int(0, 1e6), span: 200 }); return out; },
        draw(g, o, sx, env) {
          const gl = env.glow, d = DISTRICTS[env.centerZone.id];
          if (o.kind === 'lamp') {
            px(g, '#05030a', sx, 0, 10, H); px(g, '#16121e', sx + 2, 0, 2, H); for (let y = 30; y < H; y += 40) px(g, '#0c0a14', sx - 1, y, 12, 4);
            px(g, '#05030a', sx + 10, 18, 44, 6); px(g, '#05030a', sx + 44, 14, 16, 12); px(g, mix(d.b, '#ffffff', 0.6), sx + 46, 26, 12, 2);
            gl.globalAlpha = 0.9; px(gl, d.b, sx + 45, 25, 14, 3); gl.globalAlpha = 0.06; for (let k = 0; k < 150; k++) px(gl, d.b, sx + 52 - k / 2.2, 28 + k, Math.floor(k / 1.1) + 4, 1); gl.globalAlpha = 1;
          } else if (o.kind === 'post') {
            px(g, '#05030a', sx + 4, 60, 5, H - 60); px(g, '#05030a', sx - 14, 40, 40, 26); px(g, '#0e0a16', sx - 12, 42, 36, 22);
            const c = d[['a', 'b', 'c'][o.seed % 3]]; px(g, mix(c, '#000000', 0.3), sx - 10, 46, 32, 2); gl.globalAlpha = 0.6; px(gl, c, sx - 10, 46, 32, 2); px(gl, c, sx - 10, 58, 32, 2); gl.globalAlpha = 1;
          } else {
            for (let k = 0; k < 2; k++) for (let x = -40; x < 220; x++) { const y = 4 + k * 9 + Math.round(((x - 90) * (x - 90)) / 520); px(g, '#05030a', sx + x, y, 1, 2); if (x % 18 === 0 && k === 1) { const on = (Math.floor(env.cyc * 4) + x / 18) % 3 === 0; px(gl, on ? d.c : shade(d.c, -0.6), sx + x - 1, y + 2, 3, 2); } }
          }
        },
      },
    ],
    ground(g, env) {
      const d = DISTRICTS[env.centerZone.id], gl = env.glow, bass = Math.min(1, (env.lv.kick || 0) * 0.7 + (env.lv.bass || 0) * 0.5);
      // the road: wet asphalt, lanes, reflections of the signs
      g.drawImage(gradStrip(env.w, H - ROAD - 1, ['#1c1828', '#141020', '#0c0a14', '#08060e']).c, 0, ROAD + 1);
      for (let x = -(env.cam % 40); x < env.w; x += 40) { px(g, '#8a8698', x, ROAD + 14, 20, 1); px(g, '#4a4658', x, ROAD + 15, 20, 1); }
      for (let y = ROAD + 2; y < H; y++) for (let x = -(env.cam % 6); x < env.w; x += 6) if (noise(Math.floor((x + env.cam) / 6), y, 5) < 0.08) px(g, '#26222e', x, y, 1, 1);
      if (d.rain > 0.1) for (let x = 0; x < env.w; x += 2) { const k = Math.floor((x + env.cam * 0.8) / 2); if (rng('rf', k) < 0.25) { const c = rng('rc', k) < 0.5 ? d.a : rng('rc2', k) < 0.5 ? d.b : '#ffcf7a', len = 4 + Math.floor(rng('rl', k) * 16); gl.globalAlpha = 0.1 * d.rain + 0.05; px(gl, c, x, ROAD + 2, 1, len); gl.globalAlpha = 1; } }
      gl.globalAlpha = 0.12 + bass * 0.2; px(gl, d.a, 0, ROAD, env.w, 1); gl.globalAlpha = 1;
    },
    actors(g, env) { van(g, env.glow, Math.round(env.w / 2) - Math.round(VAN_W / 2) - 10, 208, env, DISTRICTS[env.centerZone.id], crew); },
    after(g, env) {
      const d = DISTRICTS[env.centerZone.id];
      // rain, by district: long drops far, short bright ones near
      if (d.rain > 0) {
        g.globalAlpha = 0.28; for (let i = 0; i < 140 * d.rain; i++) { const x = ((rng('rx', i) * env.w + env.cyc * 30 - env.cam * 0.3) % env.w + env.w) % env.w, y = ((rng('ry', i) * H + env.cyc * 240) % H); px(g, '#8aa8d8', x, y, 1, 5); } g.globalAlpha = 1;
        env.glow.globalAlpha = 0.22; for (let i = 0; i < 30 * d.rain; i++) { const x = ((rng('rx2', i) * env.w + env.cyc * 40 - env.cam * 0.6) % env.w + env.w) % env.w, y = ((rng('ry2', i) * H + env.cyc * 380) % H); px(env.glow, '#c8e0ff', x, y, 1, 7); } env.glow.globalAlpha = 1;
      }
    },
  };
}

// a flying car: a body with a canopy, lights, a trail; sz is its height
function car(g, gl, x, y, sz, dir, c) {
  const L = sz * 3, f = dir > 0 ? 1 : 0;
  px(g, '#07040f', x - 1, y - 1, L + 2, sz + 1);
  px(g, c, x, y, L, sz - 1); px(g, shade(c, 0.3), x + 1, y, L - 2, 1); px(g, shade(c, -0.35), x, y + sz - 3, L, 2);
  const cx = f ? x + L - sz - 2 : x + 2; px(g, '#7fd8f0', cx, y + 1, sz, Math.max(1, Math.floor(sz / 3))); px(g, '#d8faff', cx + 1, y + 1, Math.max(1, sz / 3), 1);
  px(gl, f ? '#fff6d0' : '#ff2f5a', f ? x + L - 1 : x, y + Math.floor(sz / 2), 1, 2);
  gl.globalAlpha = 0.35; for (let k = 1; k < 10 + sz; k++) px(gl, f ? '#ff2f5a' : '#fff6d0', f ? x - k : x + L + k, y + Math.floor(sz / 2), 1, 1); gl.globalAlpha = 1;
  px(gl, '#29e6ff', x + 2, y + sz - 1, L - 4, 1);
}
// an umbrella with a neon rim over someone's head
function umbrella(g, gl, x, y, c) {
  for (let k = -10; k <= 10; k++) { const h = Math.round(Math.sqrt(100 - k * k) * 0.55); px(g, '#120c1c', x + k, y - h, 1, h + 1); px(g, shade(c, -0.55), x + k, y - h + 1, 1, Math.max(0, h - 1)); }
  for (let k = -10; k <= 10; k++) { const h = Math.round(Math.sqrt(100 - k * k) * 0.55); px(g, mix(c, '#ffffff', 0.35), x + k, y, 1, 1); gl.globalAlpha = 0.8; px(gl, c, x + k, y, 1, 1); gl.globalAlpha = 0.18; px(gl, c, x + k, y - h, 1, h); gl.globalAlpha = 1; }
  px(g, '#2a2438', x, y, 1, 14);
}
// a billboard screen on a rooftop frame: the levels of the music, a pulsing heart, a scrolling word, a face
function billboard(g, gl, x, y, wd, ht, kind, d, env, seed) {
  const lv = env.lv, glitch = (lv.snare || 0) > 0.5 && rng('gl', seed, Math.floor(env.cyc * 16)) < 0.5;
  // the frame and its legs
  px(g, '#07040f', x + 6, y + ht, 3, 34); px(g, '#07040f', x + wd - 9, y + ht, 3, 34); for (let k = 0; k < 30; k += 6) px(g, '#1a1626', x + 6, y + ht + k, wd - 12, 1);
  px(g, '#07040f', x - 3, y - 3, wd + 6, ht + 6); px(g, '#2a2438', x - 2, y - 2, wd + 4, ht + 4); px(g, '#05030c', x, y, wd, ht);
  const draw = (c, a, ...r) => { px(g, c, ...r); gl.globalAlpha = a; px(gl, c, ...r); gl.globalAlpha = 1; };
  if (kind === 0) ['kick', 'snare', 'hats', 'bass', 'hook', 'arp', 'pad', 'fx'].forEach((k, i) => { const v = Math.min(1, lv[k] || 0), bh = Math.round(v * (ht - 4)), bw = Math.max(1, Math.floor((wd - 4) / 8) - 1), bx = x + 2 + Math.floor(i * (wd - 4) / 8); for (let yy = 0; yy < bh; yy += 2) draw(yy > ht * 0.6 ? d.c : yy > ht * 0.3 ? d.b : d.a, 0.8, bx, y + ht - 2 - yy, bw, 1); });
  else if (kind === 1) { const r = Math.round(Math.min(wd, ht) / 4 + env.kick * 3), cx = x + wd / 2, cy = y + ht / 2; disc(g, cx - r / 2, cy - 1, Math.round(r / 2) + 1, d.a); disc(g, cx + r / 2, cy - 1, Math.round(r / 2) + 1, d.a); for (let k = 0; k < r + 2; k++) draw(d.a, 0.6, cx - r + k, cy + k / 1.2, (r - k) * 2, 1); }
  else if (kind === 2) { const word = d.name, off = Math.floor(env.cyc * 8) % (word.length * 4 + wd); g.save(); g.beginPath(); g.rect(x, y, wd, ht); g.clip(); gl.save(); gl.beginPath(); gl.rect(x, y, wd, ht); gl.clip(); txt(g, word, x + wd - off, y + Math.floor(ht / 2) - 2, d.b); txt(gl, word, x + wd - off, y + Math.floor(ht / 2) - 2, d.b); gl.restore(); g.restore(); }
  else {
    // a face that blinks and sings with the hook
    const cx = x + Math.floor(wd / 2), cy = y + Math.floor(ht / 2), skin = d.c;
    for (let k = -9; k <= 9; k++) { const h = Math.round(Math.sqrt(81 - k * k) * 1.2); draw(shade(skin, -0.3), 0.5, cx + k, cy - h + 2, 1, h * 2 - 2); }
    const blink = rng('bl', seed, Math.floor(env.cyc * 2)) < 0.15, mouth = Math.round((lv.hook || lv.voice || 0) * 4);
    draw('#05030c', 1, cx - 5, cy - 3, 3, blink ? 1 : 2); draw('#05030c', 1, cx + 3, cy - 3, 3, blink ? 1 : 2);
    draw(d.a, 0.9, cx - 3, cy + 4, 7, 1 + mouth);
    draw(d.b, 0.7, cx - 9, cy - 9, 18, 2);
  }
  for (let yy = y; yy < y + ht; yy += 2) { g.globalAlpha = 0.3; px(g, '#000000', x, yy, wd, 1); g.globalAlpha = 1; }
  if (glitch) draw(d.b, 0.8, x + Math.floor(rng('gx', seed) * wd / 2), y + Math.floor(rng('gy', seed, Math.floor(env.cyc * 16)) * ht), Math.floor(wd / 2), 2);
  gl.globalAlpha = 0.14; px(gl, d.a, x - 8, y - 6, wd + 16, ht + 14); gl.globalAlpha = 1;
}
// a vending machine on the pavement
function vending(g, gl, x, y, d, s) {
  const c = rng('vc', s) < 0.5 ? d.a : d.c;
  px(g, '#07040f', x - 1, y - 33, 18, 33); px(g, '#2a2e48', x, y - 32, 16, 32); px(g, '#3a3e5a', x, y - 32, 16, 1);
  px(g, mix(c, '#000000', 0.3), x + 2, y - 30, 12, 16); gl.globalAlpha = 0.7; px(gl, c, x + 2, y - 30, 12, 16); gl.globalAlpha = 1;
  for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) px(g, ['#e84a4a', '#4a8ae8', '#e8c84a', '#ffffff'][(j + k + s) % 4], x + 3 + k * 3, y - 29 + j * 4, 2, 3);
  px(g, '#1a1a2a', x + 2, y - 12, 12, 4); px(g, '#8a8aa0', x + 10, y - 10, 2, 1);
}
// rubbish bags and a bin
function bags(g, x, y, s) {
  for (let k = 0; k < 3; k++) { const bx = x + k * 5 - (s % 3), c = ['#1a1a24', '#24242e', '#1e2228'][k]; disc(g, bx + 3, y - 4, 4, '#07040f'); disc(g, bx + 3, y - 4, 3, c); px(g, shade(c, 0.4), bx + 1, y - 6, 2, 1); }
  px(g, '#07040f', x + 14, y - 11, 10, 11); px(g, '#3a4a3a', x + 15, y - 10, 8, 10); px(g, '#4a5a4a', x + 15, y - 10, 8, 1); px(g, '#2a3a2a', x + 14, y - 12, 10, 2);
}

export function createNeonCity() { return createScroller(neonCityConcept(), { w: W, h: H }); }
export { LANDMARKS };
