// An engine for endless procedural side-scrolling visuals (procedural-visuals). It draws a concept into a small canvas
// (384×216 by default) and scales it up with sharp pixels. Everything comes from the bar (cycle): the camera, the
// zone, the time of day and whatever the concept derives from them, so the live picture and the fast video agree.
// A concept gives: { speed (pixels per bar), zoneLen (pixels), zones: { id: {...} }, pickZone(k, prevId, rnd),
// layers: [{ parallax, chunk, gen(i, rnd, env) → [{ x, span, z, ...draw data }], before?, draw(g, obj, sx, env), after?, glow? }],
// sky(g, env), ground(g, env), actors(g, env), after?(g, env), dayBars, seed }.
// The engine gives env: { cyc, cam, w, h, zone(worldX), zoneAt(layerX, parallax), day (0..1), light (0 night, 1 noon),
// beat (0..1 inside the beat), lv (levels), kick, rnd(…keys) }.

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

// sprites: rows of characters, one colour per character ('.' or ' ' is empty); cached as small canvases
const made = new Map();
const canvasOf = (w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function sprite(rows, pal, flip = false) {
  const key = `${rows.join('/')}|${JSON.stringify(pal)}|${flip}`;
  if (made.has(key)) return made.get(key);
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), c = canvasOf(w, h), g = c.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = pal[r[x]]; if (!col) continue; g.fillStyle = col; g.fillRect(flip ? w - 1 - x : x, y, 1, 1); } });
  made.set(key, c);
  return c;
}

// colours: mix two hex colours, darken or lighten
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const toHex = a => `#${a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
// (mixes are memoised on a 1/64 step: a frame asks for the same few hundred colours again and again)
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
  const base = w, buf = canvasOf(w, h), g = buf.getContext('2d');
  g.imageSmoothingEnabled = false;
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
      if (cache.size > 64) cache.delete(cache.keys().next().value);
      cache.set(i, concept.layers[li].gen(i, stream(concept.seed || 'road', 'layer', li, i), env));
    }
    return cache.get(i);
  }
  // one frame: f = { cyc, lv, kick, playing }
  function render(f) {
    const cyc = f.cyc || 0, cam = cyc * concept.speed, day = ((cyc / (concept.dayBars || 64)) + (concept.dayStart ?? 0.3)) % 1;
    const light = Math.max(0, Math.cos((day - 0.5) * Math.PI * 2)) ** 0.6;
    const zoneOf = x => { const k = Math.floor(x / concept.zoneLen); return { k, id: zoneId(k), at: x - k * concept.zoneLen, len: concept.zoneLen }; };
    const env = {
      cyc, cam, w, h, day, light, night: 1 - light, beat: ((cyc * 4) % 1 + 1) % 1, lv: f.lv || {}, kick: f.kick || 0, playing: !!f.playing,
      zone: zoneOf, centerZone: zoneOf(cam + w / 2), rnd: rng, zones: concept.zones,
      // the zone a thing of a layer belongs to: the zone at the middle of the screen when it is in the middle
      zoneAt: (u, p) => zoneOf((u - w / 2) / (p || 1) + w / 2),
    };
    g.setTransform(1, 0, 0, 1, 0, 0);
    concept.sky(g, env);
    concept.layers.forEach((L, li) => {
      if (L.before) L.before(g, env);
      const lc = cam * L.parallax, i0 = Math.floor((lc - 96) / L.chunk), i1 = Math.floor((lc + w + 96) / L.chunk), list = [];
      for (let i = i0; i <= i1; i++) list.push(...objects(li, i, env));
      list.sort((a, b) => (a.z || 0) - (b.z || 0));
      const shown = list.filter(o => { const sx = Math.round(o.x - lc); return sx > -(o.span || 64) - 4 && sx < w + 4; });
      for (const o of shown) L.draw(g, o, Math.round(o.x - lc), env);
      // the night falls on the layer, then what shines at night (windows, lamps) is drawn over it
      if (L.after) L.after(g, env);
      if (L.glow) for (const o of shown) L.glow(g, o, Math.round(o.x - lc), env);
    });
    concept.ground(g, env);
    concept.actors(g, env);
    if (concept.after) concept.after(g, env);
    return env;
  }
  // the width follows the shape of the place it is shown in (a wide stage shows more of the road), the height stays
  function fit(W, H) {
    const nw = Math.max(Math.round(base * 0.75), Math.min(base * 2.5, Math.round((h * W) / H)));
    if (nw === w) return;
    w = nw; buf.width = w; g.imageSmoothingEnabled = false;
    caches.forEach(c => c.clear());
  }
  // draw into a canvas context of css size W×H: the picture covers it, with sharp pixels
  function draw(ctx, W, H, f) {
    fit(W, H);
    const env = render(f);
    const s = Math.max(W / w, H / h), dw = w * s, dh = h * s;
    const old = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, Math.round((W - dw) / 2), Math.round((H - dh) / 2), Math.round(dw), Math.round(dh));
    ctx.imageSmoothingEnabled = old;
    return env;
  }
  return { draw, render, canvas: buf, zoneId };
}
