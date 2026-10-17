// An engine for endless procedural side-scrolling visuals (procedural-visuals), version 2. A concept is drawn into a
// small canvas (216 pixels high by default, as wide as the place it is shown in) and scaled up with sharp pixels.
// Everything comes from the bar (cycle): camera, zone, time of day, so the live picture and the fast video agree.
// Version 2 adds depth and light, in the spirit of cinematic 2.5D pixel art:
//   - a light buffer (env.glow): what a concept draws there shines, with a soft bloom around it;
//   - haze per layer: each layer can be veiled by the colour of the air (concept.fog), farther layers more;
//   - front layers, drawn after the actors, optionally blurred like a lens out of focus;
//   - a vignette and a fine grain over the picture.
// A concept gives: { speed (pixels per bar), zoneLen (pixels), zones, pickZone(k, prevId, rnd), beforeZone,
// layers: [{ parallax, chunk, gen(i, rnd, env) → [{ x, span, z, …}], before?, draw(g, o, sx, env), after?, glow?, haze?, front?, blur? }],
// sky(g, env), ground(g, env), actors(g, env), after?(g, env), fog?(env) → colour, dayBars, dayStart, seed, post? }.
// env: { cyc, cam, w, h, day (0..1), light (0 night, 1 noon), night, beat, lv, kick, glow (the light buffer's context),
// zone(worldX), centerZone, zoneAt(layerX, parallax), rnd }.

// a 32-bit hash of numbers and strings; rng(…keys): a random number in [0, 1) for those keys
export function hash(...keys) {
  let h = 2166136261;
  for (const k of keys) {
    const s = typeof k === 'number' ? String(Math.floor(k * 1000) / 1000) : String(k);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    h = Math.imul(h ^ 0x9e3779b9, 16777619);
  }
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return h >>> 0;
}
export const rng = (...keys) => hash(...keys) / 4294967296;
// a seeded stream for the objects of a stretch
export function stream(...keys) {
  let a = hash(...keys);
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return Object.assign(next, { int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), pick: arr => arr[Math.floor(next() * arr.length)], range: (lo, hi) => lo + (hi - lo) * next(), chance: p => next() < p });
}

export const canvasOf = (w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// sprites: rows of characters, one colour per character ('.' or ' ' is empty); cached as small canvases
const made = new Map();
export function sprite(rows, pal, flip = false) {
  const key = `${rows.join('/')}|${JSON.stringify(pal)}|${flip}`;
  if (made.has(key)) return made.get(key);
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), c = canvasOf(w, h), g = c.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = pal[r[x]]; if (!col) continue; g.fillStyle = col; g.fillRect(flip ? w - 1 - x : x, y, 1, 1); } });
  if (made.size > 400) made.delete(made.keys().next().value);
  made.set(key, c);
  return c;
}

// colours: mix two hex colours, darken or lighten (memoised on a 1/64 step)
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const toHex = a => `#${a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mixed = new Map();
export const mix = (a, b, t) => {
  const q = Math.round(Math.max(0, Math.min(1, t)) * 64), key = `${a}${b}${q}`;
  let c = mixed.get(key);
  if (!c) { const x = hex(a), y = hex(b); c = toHex(x.map((v, i) => v + (y[i] - v) * (q / 64))); if (mixed.size > 20000) mixed.clear(); mixed.set(key, c); }
  return c;
};
export const shade = (c, k) => (k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k));

// the sky of the time of day: stops of a day (0 midnight, 0.25 dawn, 0.5 noon, 0.75 dusk) → [top, middle, horizon]
export function skyAt(stops, day) {
  const keys = Object.keys(stops).map(Number).sort((a, b) => a - b);
  let i = keys.length - 1;
  for (let k = 0; k < keys.length; k++) if (keys[k] <= day) i = k;
  const a = keys[i], b = keys[(i + 1) % keys.length], span = ((b - a + 1) % 1) || 1, t = (((day - a) + 1) % 1) / span;
  return stops[a].map((c, j) => mix(c, stops[b][j], t));
}

export function createScroller(concept, { w = 384, h = 216 } = {}) {
  const base = w, buf = canvasOf(w, h), g = buf.getContext('2d'), glowBuf = canvasOf(w, h), gl = glowBuf.getContext('2d');
  const tmp = canvasOf(w, h), tg = tmp.getContext('2d'), soft = canvasOf(Math.ceil(w / 2), Math.ceil(h / 2)), sg = soft.getContext('2d');
  const tglow = canvasOf(w, h), tgl = tglow.getContext('2d');
  for (const c of [g, gl, tg, sg, tgl]) c.imageSmoothingEnabled = false;
  const zones = [];
  // zone k of the endless road: drawn from the concept's list, never the same twice in a row
  const zoneId = k => {
    // before the start of the road: the concept's own zone for it (or the first one)
    if (k < 0) return concept.beforeZone || zoneId(0);
    for (let i = zones.length; i <= k; i++) zones.push(concept.pickZone(i, i ? zones[i - 1] : null, stream(concept.seed || 'road', 'zone', i)));
    return zones[k];
  };
  const caches = concept.layers.map(() => new Map());
  function objects(li, i, env) {
    const cache = caches[li];
    if (!cache.has(i)) {
      if (cache.size > 96) cache.delete(cache.keys().next().value);
      cache.set(i, concept.layers[li].gen(i, stream(concept.seed || 'road', 'layer', li, i), env));
    }
    return cache.get(i);
  }
  // a part of the picture (a layer, the ground, the actors): drawn apart with its own lights, then laid on the picture;
  // what it covers hides the lights behind it, then its own lights are added
  function stage(env, draw, { blur = 0, haze = 0 } = {}) {
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, w, h); tgl.setTransform(1, 0, 0, 1, 0, 0); tgl.clearRect(0, 0, w, h);
    const main = env.glow;
    env.glow = tgl;
    draw(tg);
    env.glow = main;
    if (blur) g.filter = `blur(${blur}px)`;
    g.drawImage(tmp, 0, 0);
    g.filter = 'none';
    gl.globalCompositeOperation = 'destination-out'; gl.drawImage(tmp, 0, 0); gl.globalCompositeOperation = 'source-over';
    // the air in front of the part
    if (haze && concept.fog) { g.globalAlpha = haze; g.fillStyle = concept.fog(env); g.fillRect(0, 0, w, h); g.globalAlpha = 1; gl.globalAlpha = 1 - haze; }
    gl.drawImage(tglow, 0, 0); gl.globalAlpha = 1;
  }
  function layer(L, li, env, into) {
    if (L.before) L.before(into, env);
    const lc = env.cam * L.parallax, i0 = Math.floor((lc - 128) / L.chunk), i1 = Math.floor((lc + w + 128) / L.chunk), list = [];
    for (let i = i0; i <= i1; i++) list.push(...objects(li, i, env));
    list.sort((a, b) => (a.z || 0) - (b.z || 0));
    const shown = list.filter(o => { const sx = Math.round(o.x - lc); return sx > -(o.span || 64) - 4 && sx < w + 4; });
    for (const o of shown) L.draw(into, o, Math.round(o.x - lc), env);
    if (L.after) L.after(into, env);
    if (L.glow) for (const o of shown) L.glow(env.glow, o, Math.round(o.x - lc), env);
  }
  // one frame: f = { cyc, lv, kick, playing }
  function render(f) {
    const cyc = f.cyc || 0, cam = cyc * concept.speed, day = ((cyc / (concept.dayBars || 64)) + (concept.dayStart ?? 0.3)) % 1;
    const light = Math.max(0, Math.cos((day - 0.5) * Math.PI * 2)) ** 0.6;
    const zoneOf = x => { const k = Math.floor(x / concept.zoneLen); return { k, id: zoneId(k), at: x - k * concept.zoneLen, len: concept.zoneLen }; };
    gl.setTransform(1, 0, 0, 1, 0, 0); gl.clearRect(0, 0, w, h);
    const env = {
      cyc, cam, w, h, day, light, night: 1 - light, beat: ((cyc * 4) % 1 + 1) % 1, lv: f.lv || {}, kick: f.kick || 0, playing: !!f.playing,
      zone: zoneOf, centerZone: zoneOf(cam + w / 2), rnd: rng, zones: concept.zones, glow: gl,
      // the zone a thing of a layer belongs to: the zone at the middle of the screen when it is in the middle
      zoneAt: (u, p) => zoneOf((u - w / 2) / (p || 1) + w / 2),
    };
    g.setTransform(1, 0, 0, 1, 0, 0);
    concept.sky(g, env);
    concept.layers.forEach((L, li) => { if (!L.front) stage(env, into => layer(L, li, env, into), { haze: L.haze }); });
    stage(env, into => concept.ground(into, env));
    stage(env, into => concept.actors(into, env));
    // in front of the actors, out of focus when the layer asks
    concept.layers.forEach((L, li) => { if (L.front) stage(env, into => layer(L, li, env, into), { blur: L.blur || 0 }); });
    if (concept.after) concept.after(g, env);
    return env;
  }
  // the width follows the shape of the place it is shown in (a wide stage shows more of the road), the height stays
  function fit(W, H) {
    const nw = Math.max(Math.round(base * 0.75), Math.min(Math.round(base * 2.5), Math.round((h * W) / H)));
    if (nw === w) return;
    w = nw;
    for (const c of [buf, glowBuf, tmp, tglow]) c.width = w;
    soft.width = Math.ceil(w / 2);
    for (const c of [g, gl, tg, sg, tgl]) c.imageSmoothingEnabled = false;
    caches.forEach(c => c.clear());
  }
  let grain = null;
  // draw into a canvas context of css size W×H: the picture covers it with sharp pixels, the lights bloom, a vignette
  // and a fine grain finish it
  function draw(ctx, W, H, f) {
    fit(W, H);
    const env = render(f), post = concept.post || {};
    const s = Math.max(W / w, H / h), dw = Math.round(w * s), dh = Math.round(h * s), ox = Math.round((W - dw) / 2), oy = Math.round((H - dh) / 2);
    const old = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, ox, oy, dw, dh);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // the lights themselves, sharp, then their bloom: blurred at half size and spread smoothly
    ctx.globalAlpha = post.glow ?? 0.9; ctx.drawImage(glowBuf, ox, oy, dw, dh);
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, soft.width, soft.height);
    sg.filter = `blur(${post.bloomRadius ?? 2}px)`; sg.drawImage(glowBuf, 0, 0, soft.width, soft.height); sg.filter = 'none';
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = post.bloom ?? 0.85;
    ctx.drawImage(soft, ox, oy, dw, dh); ctx.drawImage(soft, ox, oy, dw, dh);
    ctx.restore();
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${post.vignette ?? 0.45})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // grain, moving with the bar
    if ((post.grain ?? 0.05) > 0) {
      if (!grain) { grain = canvasOf(96, 96); const gg = grain.getContext('2d'); for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) { const v = Math.floor(rng('grain', x, y) * 255); gg.fillStyle = `rgb(${v},${v},${v})`; gg.fillRect(x, y, 1, 1); } }
      ctx.globalAlpha = post.grain ?? 0.05; ctx.globalCompositeOperation = 'overlay';
      const gx = Math.floor(rng('gx', Math.floor(env.cyc * 24)) * 96), gy = Math.floor(rng('gy', Math.floor(env.cyc * 24)) * 96), gs = Math.max(2, Math.round(s));
      for (let y = -gy * gs; y < H; y += 96 * gs) for (let x = -gx * gs; x < W; x += 96 * gs) ctx.drawImage(grain, x, y, 96 * gs, 96 * gs);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.imageSmoothingEnabled = old;
    return env;
  }
  return { draw, render, get canvas() { return buf; }, get glowCanvas() { return glowBuf; }, zoneId };
}
