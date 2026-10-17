// Neon city (procedural-visuals): a hover van with a sound system on its roof drives right along a skyway through an
// endless cyberpunk city, district after district (market, corporate spires, industrial stacks, old town, harbour,
// data core). Megastructures in the haze, holographic screens that show the music, flying traffic, neon signs, rain.
// The music: the roof speakers and the underglow pump with the kick and the bass, the screens show the levels, the
// signs flicker with the hats, the beacons blink on the beat, a flash of lightning on the snare.
import { createScroller, rng, mix, shade, skyAt } from './scroller.js';
import { px, box, disc, text } from './pixel.js';

const W = 320, H = 180, DECK = 148;
const DISTRICTS = {
  market: { name: 'NEON MARKET', a: '#ff2fa8', b: '#29e6ff', c: '#ffd23f', rain: 0.6, haze: '#3a1a5a' },
  spires: { name: 'SPIRE ONE', a: '#4fc3ff', b: '#e8f4ff', c: '#7a7cff', rain: 0.2, haze: '#16294f' },
  stacks: { name: 'STACKS 9', a: '#ff8a2f', b: '#ffd23f', c: '#ff3f3f', rain: 0.1, haze: '#4a2a1a' },
  oldtown: { name: 'OLD TOWN', a: '#ff3f5a', b: '#ffb43f', c: '#3fffb0', rain: 0.8, haze: '#3a1428' },
  harbor: { name: 'HARBOR', a: '#3fffd8', b: '#2f8fff', c: '#ff6f3f', rain: 0.4, haze: '#0f2f3a' },
  datacore: { name: 'DATA CORE', a: '#5aff6a', b: '#29e6ff', c: '#d0ff3f', rain: 0, haze: '#0f2a1f' },
};
const IDS = Object.keys(DISTRICTS);
// the mood of the night: violet, teal, amber smog → [top, middle, horizon]
const MOOD = { 0: ['#07041a', '#1c0b3a', '#5a1a5a'], 0.33: ['#03101c', '#082a3a', '#1f5a6a'], 0.66: ['#120a08', '#2e1a14', '#6a3a1f'] };
const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789';

// a tall building of the skyline, windows lit by a seed
function block(g, x, top, wd, base, col, seed, lit, env) {
  px(g, col, x, top, wd, base - top); px(g, shade(col, 0.12), x, top, 1, base - top);
  for (let y = top + 3; y < base - 2; y += 3) for (let k = x + 2; k < x + wd - 1; k += 3) {
    const on = rng('w', seed, k, y) < lit, flick = on && rng('f', seed, k, y, Math.floor(env.cyc * 4)) < 0.03;
    if (on && !flick) px(g, rng('wc', seed, k, y) < 0.8 ? '#ffd98a' : '#9ae8ff', k, y, 1, 1);
  }
}
// a holographic screen: the levels of the music, a pulsing heart, or a scrolling word
function screen(g, x, y, wd, ht, kind, d, env, seed) {
  const lv = env.lv, glitch = (lv.snare || 0) > 0.5 && rng('gl', seed, Math.floor(env.cyc * 16)) < 0.5;
  g.globalAlpha = 0.85;
  px(g, '#05030c', x, y, wd, ht);
  px(g, d.a, x - 1, y - 1, wd + 2, 1); px(g, d.a, x - 1, y + ht, wd + 2, 1);
  if (kind === 0) {
    // the equaliser: one bar per instrument
    ['kick', 'snare', 'hats', 'bass', 'hook', 'arp', 'pad', 'fx'].forEach((k, i) => { const v = Math.min(1, lv[k] || 0), bh = Math.round(v * (ht - 4)), bx = x + 2 + Math.floor(i * (wd - 4) / 8); for (let yy = 0; yy < bh; yy += 2) px(g, yy > ht * 0.6 ? d.c : yy > ht * 0.3 ? d.b : d.a, bx, y + ht - 2 - yy, Math.max(1, Math.floor((wd - 4) / 8) - 1), 1); });
  } else if (kind === 1) {
    // a heart that beats with the kick
    const r = Math.round(Math.min(wd, ht) / 4 + env.kick * 3), cx = x + wd / 2, cy = y + ht / 2;
    disc(g, cx - r / 2, cy - 1, Math.round(r / 2) + 1, d.a); disc(g, cx + r / 2, cy - 1, Math.round(r / 2) + 1, d.a);
    for (let k = 0; k < r + 2; k++) px(g, d.a, cx - r + k, cy + k / 1.2, (r - k) * 2, 1);
  } else {
    // a word that scrolls
    const word = d.name, off = Math.floor(env.cyc * 6) % (word.length * 4 + wd);
    g.save(); g.beginPath(); g.rect(x, y, wd, ht); g.clip();
    text(g, word, x + wd - off, y + Math.floor(ht / 2) - 2, d.b);
    g.restore();
  }
  // scanlines
  for (let yy = y; yy < y + ht; yy += 2) { g.globalAlpha = 0.25; px(g, '#000000', x, yy, wd, 1); }
  if (glitch) { g.globalAlpha = 0.9; px(g, d.b, x + Math.floor(rng('gx', seed) * wd / 2), y + Math.floor(rng('gy', seed, Math.floor(env.cyc * 16)) * ht), wd / 2, 2); }
  g.globalAlpha = 1;
}
// a vertical neon sign with glyphs
function vsign(g, x, y, n, col, seed, env) {
  const on = !((env.lv.hats || 0) > 0.6 && rng('vs', seed, Math.floor(env.cyc * 8)) < 0.4);
  px(g, '#0a0614', x - 1, y - 1, 6, n * 6 + 2);
  for (let k = 0; k < n; k++) { const ch = GLYPHS[Math.floor(rng('gl', seed, k) * GLYPHS.length)]; text(g, ch, x + 1, y + k * 6, on ? col : shade(col, -0.6)); }
  if (on) { g.globalAlpha = 0.18; px(g, col, x - 3, y - 3, 10, n * 6 + 6); g.globalAlpha = 1; }
}
function van(g, x, y, env) {
  const lv = env.lv, bass = Math.min(1, (lv.kick || 0) * 0.8 + (lv.bass || 0) * 0.6), d = DISTRICTS[env.centerZone.id];
  y += Math.round(Math.sin(env.cyc * Math.PI) * 1.5);
  const B = '#2b3150', BL = shade(B, 0.22), BD = shade(B, -0.35);
  // light trails behind
  for (let k = 0; k < 50; k++) { g.globalAlpha = (1 - k / 50) * 0.55; px(g, '#ff2f5a', x - k * 2, y + 14, 2, 1); px(g, d.b, x - k * 2, y + 18, 2, 1); }
  g.globalAlpha = 1;
  // underglow on the deck
  g.globalAlpha = 0.25 + bass * 0.5; px(g, d.a, x - 4, y + 25, 84, 3); px(g, d.a, x + 6, y + 28, 64, 2); g.globalAlpha = 1;
  // body: a boxy hover van, a cab in front
  box(g, x, y, 76, 20, B); box(g, x + 52, y - 9, 24, 11, B);
  px(g, BL, x, y + 7, 76, 1); px(g, BD, x, y + 15, 76, 3);
  px(g, '#7fd8f0', x + 55, y - 7, 18, 7); px(g, '#d8faff', x + 56, y - 7, 5, 2); px(g, '#5ab8d8', x + 55, y - 2, 18, 2); // windscreen
  for (let k = 0; k < 4; k++) { px(g, '#122036', x + 5 + k * 12, y + 2, 9, 5); px(g, '#4aa8c8', x + 6 + k * 12, y + 3, 7, 3); }
  px(g, d.a, x, y + 10, 76, 1); px(g, shade(d.a, 0.3), x, y + 11, 76, 1); // neon stripe
  px(g, '#ff2f5a', x - 1, y + 9, 2, 5); px(g, '#fff6c0', x + 75, y + 9, 2, 3); // tail and head lights
  text(g, 'MISK', x + 6, y + 13, mix(d.b, '#ffffff', 0.3));
  for (const tx of [x + 6, x + 52]) { box(g, tx, y + 19, 18, 4, '#161a2c'); px(g, d.b, tx + 2, y + 23, 14, 1); px(g, mix(d.b, '#ffffff', 0.5), tx + 4 + (Math.floor(env.cyc * 16) % 10), y + 23, 2, 1); }
  // the sound system on the roof: two cabinets and a stack of lights
  for (const sx of [x + 6, x + 26]) {
    const yy = y - 17 - Math.round(bass);
    box(g, sx, yy, 16, 17, '#15151f');
    disc(g, sx + 8, yy + 11, 5, '#08080c'); disc(g, sx + 8, yy + 11, 3 + Math.round(bass * 2), '#3a3a4c'); disc(g, sx + 8, yy + 11, 1, '#9a9ab0');
    disc(g, sx + 8, yy + 3, 2, '#08080c'); px(g, '#9a9ab0', sx + 8, yy + 3, 1, 1);
  }
  ['kick', 'bass', 'hats', 'hook'].forEach((k, i) => px(g, (lv[k] || 0) > 0.15 ? [d.a, d.b, d.c, '#ffffff'][i] : '#2a2a3a', x + 45, y - 4 - i * 3, 4, 2));
  // rings of sound on the kick
  if (env.kick > 0.05) { g.globalAlpha = env.kick * 0.6; for (const sx of [x + 14, x + 34]) for (let a = 0; a < 56; a++) { const t = (a / 56) * Math.PI * 2; px(g, d.b, sx + Math.cos(t) * (10 + (1 - env.kick) * 22), y - 6 + Math.sin(t) * (6 + (1 - env.kick) * 12)); } g.globalAlpha = 1; }
  // a drone above, with a beam that flashes on the beat
  const dx = x + 40 + Math.round(Math.sin(env.cyc * 1.3) * 12), dy = y - 44 + Math.round(Math.cos(env.cyc * 2.1) * 3);
  box(g, dx - 5, dy, 10, 4, '#3a3f5a'); px(g, '#8a8aa0', dx - 9, dy - 1, 5, 1); px(g, '#8a8aa0', dx + 4, dy - 1, 5, 1);
  px(g, env.beat < 0.2 ? '#ff2f5a' : '#5a1a2a', dx, dy + 1, 1, 1);
  if (env.beat < 0.25) { g.globalAlpha = 0.16; for (let k = 0; k < 24; k++) px(g, d.c, dx - k / 2, dy + 4 + k, k + 1, 1); g.globalAlpha = 1; }
}

export function neonCityConcept() {
  return {
    seed: 'neon', speed: 56, zoneLen: 1400, dayBars: 128, dayStart: 0, beforeZone: 'market',
    zones: DISTRICTS,
    pickZone(k, prev, r) { let id = r.pick(IDS); if (id === prev) id = IDS[(IDS.indexOf(id) + 1 + r.int(0, IDS.length - 2)) % IDS.length]; return id; },
    sky(g, env) {
      const d = DISTRICTS[env.centerZone.id], [top, mid, hor] = skyAt(MOOD, env.day).map(c => mix(c, d.haze, 0.35));
      for (let y = 0; y < DECK; y++) { const t = y / DECK; px(g, t < 0.55 ? mix(top, mid, t / 0.55) : mix(mid, hor, (t - 0.55) / 0.45), 0, y, env.w, 1); }
      // lightning on the snare, far away
      if ((env.lv.snare || 0) > 0.75 && rng('lt', Math.floor(env.cyc * 2)) < 0.35) { g.globalAlpha = 0.25; px(g, '#d8e8ff', 0, 0, env.w, DECK); g.globalAlpha = 1; }
      // a big moon behind the smog
      g.globalAlpha = 0.5; disc(g, Math.round(env.w * 0.78), 34, 16, mix(hor, '#ffe0f0', 0.5)); g.globalAlpha = 1;
      // the megastructures, in the haze (drawn after a band of smog)
      g.globalAlpha = 0.35; px(g, hor, 0, DECK - 60, env.w, 60); g.globalAlpha = 1;
      for (let i = -1; i < 5; i++) {
        const u = env.cam * 0.04, k = Math.floor(u / 110) + i, x = Math.round(k * 110 - u + rng('mx', k) * 40), ht = 110 + Math.floor(rng('mh', k) * 40), wd = 40 + Math.floor(rng('mw', k) * 30);
        const c = mix(hor, '#000000', 0.55);
        px(g, c, x, DECK - ht, wd, ht); px(g, mix(c, d.a, 0.35), x, DECK - ht, 1, ht);
        px(g, c, x + wd / 4, DECK - ht - 18, wd / 2, 18); px(g, c, x + wd / 2 - 1, DECK - ht - 34, 2, 16);
        for (let y = DECK - ht + 4; y < DECK - 10; y += 6) for (let xx = x + 3; xx < x + wd - 2; xx += 5) if (rng('mwin', k, xx, y) < 0.2) px(g, mix(c, '#ffd98a', 0.5), xx, y, 1, 1);
        // the beacon on top blinks on the beat
        px(g, env.beat < 0.25 ? '#ff2f3f' : '#4a1018', x + wd / 2 - 1, DECK - ht - 35, 2, 2);
      }
    },
    layers: [
      // the skyline, with holographic screens and searchlights
      {
        parallax: 0.22, chunk: 64,
        gen(i, r, env) {
          const u = i * 64, z = env.zoneAt(u + 32, 0.22).id, out = [];
          for (let k = 0; k < 2; k++) out.push({ x: u + k * 32 + r.int(0, 8), kind: 'b', wd: r.int(16, 28), top: r.int(50, 100), seed: r.int(0, 1e6), z: r(), span: 34, d: z });
          if (r.chance(0.3)) out.push({ x: u + r.int(4, 30), kind: 'screen', wd: r.int(28, 44), ht: r.int(18, 26), top: r.int(40, 70), show: r.int(0, 2), seed: r.int(0, 1e6), z: 2, span: 48, d: z });
          if (r.chance(0.25)) out.push({ x: u + r.int(0, 60), kind: 'search', seed: r.int(0, 1e6), z: -1, span: 80, d: z });
          return out;
        },
        draw(g, o, sx, env) {
          const d = DISTRICTS[o.d];
          if (o.kind === 'b') {
            const col = mix('#120d24', d.haze, 0.4);
            block(g, sx, o.top, o.wd, DECK, col, o.seed, o.d === 'spires' ? 0.45 : 0.25, env);
            if (o.d === 'stacks') { px(g, col, sx + 4, o.top - 14, 5, 14); const fl = (Math.floor(env.cyc * 8) + o.seed) % 3; px(g, ['#ff8a2f', '#ffd23f', '#ff3f3f'][fl], sx + 5, o.top - 17, 3, 3); }
            else if (o.d === 'harbor' && o.seed % 3 === 0) { px(g, '#ff6f3f', sx + 2, o.top - 20, 2, 20); px(g, '#ff6f3f', sx + 2, o.top - 20, 24, 2); px(g, '#c0c0d0', sx + 22, o.top - 18, 1, 12); }
            else px(g, '#0a0716', sx + o.wd / 2, o.top - 8, 1, 8);
            px(g, env.beat < 0.2 && o.seed % 2 ? '#ff2f3f' : '#3a1018', sx + o.wd / 2, o.top - 9, 1, 1);
          } else if (o.kind === 'screen') screen(g, sx, o.top, o.wd, o.ht, o.show, d, env, o.seed);
          else if (o.kind === 'search') {
            // a searchlight sweeping
            const a = -Math.PI / 2 + Math.sin(env.cyc * 0.9 + o.seed) * 0.6;
            g.globalAlpha = 0.07 + (env.lv.kick || 0) * 0.05;
            for (let s = 0; s < 140; s += 2) { const w2 = 1 + s / 10; px(g, d.b, sx + Math.cos(a) * s - w2 / 2, DECK - 40 + Math.sin(a) * s, w2, 2); }
            g.globalAlpha = 1;
          }
        },
        // the flying traffic, in three lanes at different depths
        after(g, env) {
          for (const [lane, y, speed, n] of [[0, 46, 30, 6], [1, 70, 46, 5], [2, 96, 70, 4]]) for (let i = 0; i < n; i++) {
            const dir = (lane + i) % 2 ? 1 : -1, span = env.w + 60, x = ((rng('car', lane, i) * span + env.cyc * speed * dir - env.cam * (0.2 + lane * 0.1)) % span + span) % span - 30;
            const sz = 4 + lane * 2, c = ['#3a3f5a', '#5a2a4a', '#2a4a5a'][i % 3], cy = y + Math.round(rng('cy', lane, i) * 8);
            box(g, x, cy, sz * 2, sz - 1, c, { line: '#05030c' });
            px(g, dir > 0 ? '#fff6c0' : '#ff2f5a', dir > 0 ? x + sz * 2 - 1 : x, cy + 1, 1, 1);
          }
        },
      },
      // the street close by: facades, neon signs
      {
        parallax: 0.55, chunk: 56,
        gen(i, r, env) {
          const u = i * 56, z = env.zoneAt(u + 28, 0.55).id, out = [];
          out.push({ x: u + r.int(0, 10), kind: 'facade', wd: r.int(30, 44), top: r.int(86, 116), seed: r.int(0, 1e6), span: 50, d: z });
          if (r.chance(0.7)) out.push({ x: u + r.int(6, 40), kind: 'vsign', n: r.int(3, 5), top: r.int(84, 104), col: r.pick(['a', 'b', 'c']), seed: r.int(0, 1e6), z: 1, span: 8, d: z });
          if (r.chance(0.4)) out.push({ x: u + r.int(0, 30), kind: 'hsign', wd: r.int(20, 34), top: r.int(120, 132), col: r.pick(['a', 'b', 'c']), seed: r.int(0, 1e6), z: 1, span: 36, d: z });
          return out;
        },
        draw(g, o, sx, env) {
          const d = DISTRICTS[o.d];
          if (o.kind === 'facade') {
            const col = mix('#1a1230', d.haze, 0.3);
            box(g, sx, o.top, o.wd, DECK - o.top, col, { line: '#05030c' });
            for (let y = o.top + 5; y < DECK - 6; y += 9) { px(g, '#0a0716', sx + 2, y + 5, o.wd - 4, 1); for (let k = sx + 3; k < sx + o.wd - 5; k += 8) { const on = rng('fw', o.seed, k, y) < 0.4; px(g, on ? (rng('fc', o.seed, k, y) < 0.5 ? d.a : '#ffd98a') : '#1f1838', k, y, 5, 4); } }
            // pipes and an air unit
            px(g, '#2a2440', sx + o.wd - 4, o.top + 2, 2, DECK - o.top - 4); box(g, sx + 3, o.top - 5, 8, 5, '#2a2440', { line: '#05030c' });
          } else if (o.kind === 'vsign') vsign(g, sx, o.top, o.n, d[o.col], o.seed, env);
          else if (o.kind === 'hsign') { const c = d[o.col], word = d.name.split(' ')[0].slice(0, Math.floor(o.wd / 4)); px(g, '#0a0614', sx - 1, o.top - 1, o.wd + 2, 8); text(g, word, sx + 1, o.top + 1, (env.lv.kick || 0) > 0.5 && o.seed % 2 ? shade(c, 0.3) : c); g.globalAlpha = 0.15; px(g, c, sx - 3, o.top - 3, o.wd + 6, 12); g.globalAlpha = 1; }
        },
      },
      // the skyway: lamps over the deck, now and then a gantry with the name of the district
      {
        parallax: 1, chunk: 120,
        gen(i, r, env) {
          const u = i * 120, z = env.zoneAt(u + 60, 1).id;
          const out = [{ x: u + 10, kind: 'lamp', span: 30, d: z }];
          if (r.chance(0.08)) out.push({ x: u + 60, kind: 'gantry', seed: r.int(0, 1e6), span: 74, d: z });
          return out;
        },
        draw(g, o, sx, env) {
          const d = DISTRICTS[o.d];
          if (o.kind === 'lamp') { px(g, '#0a0716', sx, DECK - 46, 2, 46); px(g, '#0a0716', sx, DECK - 46, 12, 2); px(g, d.b, sx + 8, DECK - 44, 5, 1); g.globalAlpha = 0.12; for (let k = 0; k < 30; k++) px(g, d.b, sx + 10 - k / 3, DECK - 43 + k, (k / 1.5) | 0, 1); g.globalAlpha = 1; }
          else {
            box(g, sx, DECK - 70, 3, 70, '#2a2a40', { line: '#05030c' }); box(g, sx + 66, DECK - 70, 3, 70, '#2a2a40', { line: '#05030c' });
            box(g, sx - 2, DECK - 74, 73, 4, '#2a2a40', { line: '#05030c' }); box(g, sx + 4, DECK - 69, 61, 11, '#0e2a4a', { line: '#05030c' });
            text(g, d.name.slice(0, 15), sx + 6, DECK - 66, '#e8f4ff');
            for (let k = 0; k < 6; k++) px(g, k % 2 === Math.floor(env.cyc * 4) % 2 ? d.c : '#3a3020', sx + 6 + k * 11, DECK - 72, 2, 1);
          }
        },
      },
    ],
    ground(g, env) {
      const d = DISTRICTS[env.centerZone.id], bass = Math.min(1, (env.lv.kick || 0) * 0.7 + (env.lv.bass || 0) * 0.5);
      // the deck: neon edge, lanes that rush by
      px(g, '#0d0b18', 0, DECK, env.w, H - DECK);
      px(g, d.a, 0, DECK, env.w, 1); g.globalAlpha = 0.3 + bass * 0.5; px(g, d.a, 0, DECK + 1, env.w, 1); g.globalAlpha = 1;
      for (let x = -(env.cam % 24); x < env.w; x += 24) px(g, '#4a4660', x, DECK + 14, 12, 1);
      for (let x = -(env.cam % 9); x < env.w; x += 9) px(g, '#1a1828', x, DECK + 26, 4, 1);
      // reflections of the neon on the wet deck
      if (d.rain > 0.3) for (let x = 0; x < env.w; x += 3) { const k = Math.floor((x + env.cam) / 3); if (rng('ref', k) < 0.15) { g.globalAlpha = 0.25; px(g, rng('rc', k) < 0.5 ? d.a : d.b, x, DECK + 3 + Math.floor(rng('ry', k) * 20), 1, 3); g.globalAlpha = 1; } }
    },
    actors(g, env) { van(g, Math.round(env.w / 2) - 40, DECK - 2, env); },
    after(g, env) {
      const d = DISTRICTS[env.centerZone.id];
      // the rail in front of everything, posts rushing by
      px(g, '#05030c', 0, H - 8, env.w, 8); px(g, d.b, 0, H - 9, env.w, 1);
      for (let x = -((env.cam * 1.3) % 30); x < env.w; x += 30) { px(g, '#05030c', x, H - 16, 3, 8); px(g, d.b, x + 1, H - 16, 1, 1); }
      // rain, by district
      if (d.rain > 0) { g.globalAlpha = 0.35; for (let i = 0; i < 90 * d.rain; i++) { const x = ((rng('rx', i) * env.w + env.cyc * 30 - env.cam * 0.3) % env.w + env.w) % env.w, y = ((rng('ry', i) * H + env.cyc * 220) % H); px(g, '#9ab8e8', x, y, 1, 4); } g.globalAlpha = 1; }
    },
  };
}

export function createNeonCity() { return createScroller(neonCityConcept(), { w: W, h: H }); }
