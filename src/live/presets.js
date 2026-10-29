// Live output (#52): the presets of the broadcast picture, their areas and the transition between them,
// and the messages between the app tab, the broadcast window and the control room.
// Pure: checked in Node (tools/check-live.mjs).

// the views a preset shows; each preset is a view with or without the song card
// the views with a timeline (#65): visual + timeline, visual + code + timeline, code + timeline, soul + timeline,
// visual with a floating scrolling timeline, visual + track column
// code-widgets D11: visual + code and code only with the code widgets drawn below their lines
export const VIEWS = ['visual', 'code', 'code-soul', 'soul', 'code-only', 'visual-tl', 'visual-code-tl', 'code-tl', 'soul-tl', 'visual-float', 'visual-column', 'code-widgets', 'code-only-widgets'];
export const PRESETS = [
  { id: 1, view: 'visual', card: true },
  { id: 2, view: 'code', card: true },
  { id: 3, view: 'code-soul', card: true },
  { id: 4, view: 'soul', card: true },
  { id: 5, view: 'code-only', card: false },
  { id: 6, view: 'visual-tl', card: true },
  { id: 7, view: 'visual-code-tl', card: true },
  { id: 8, view: 'code-tl', card: false },
  { id: 9, view: 'soul-tl', card: true },
  { id: 10, view: 'visual-float', card: true },
  { id: 11, view: 'visual-column', card: true },
  { id: 12, view: 'code-widgets', card: true },
  { id: 13, view: 'code-only-widgets', card: false },
];
// future: what is still to come on the timeline ('auto' hides it for songs with a live build, src/live/timeline.js)
export const LIVE_DEFAULTS = { view: 'visual', card: true, future: 'auto' };
export const presetOf = p => ({
  view: VIEWS.includes(p && p.view) ? p.view : LIVE_DEFAULTS.view, card: p && typeof p.card === 'boolean' ? p.card : LIVE_DEFAULTS.card,
  future: ['auto', 'show', 'hide'].includes(p && p.future) ? p.future : LIVE_DEFAULTS.future,
});
// the timeline shows a scrolling window of this many bars in the floating view, the whole song in the others
export const timelineWindow = view => (view === 'visual-float' ? 16 : 0);
// seconds of a change of preset
export const TRANSITION = 0.8;

// the areas of a w×h picture for a view: stage, code and soul, each { x, y, w, h, a } (a: opacity, 0 hidden).
// A hidden area keeps a place (off the right edge, or under the others) so a change of view can move it in.
export function liveAreas(view, w, h) {
  // (a view with widgets has the areas of the same view without them)
  if (typeof view === 'string' && view.endsWith('-widgets')) return liveAreas(view.slice(0, -'-widgets'.length), w, h);
  const pad = Math.round(h / 54), tlH = Math.round(h * 0.24), colW = Math.round(w * 0.2);
  // hidden places of the timeline (under the picture) and of the track column (off the right edge)
  const tlOff = { x: pad, y: h + pad, w: w - 2 * pad, h: tlH, a: 0 }, colOff = { x: w + pad, y: pad, w: colW, h: h - 2 * pad, a: 0 };
  const top = h - tlH - 2 * pad, tl = { x: pad, y: h - tlH - pad, w: w - 2 * pad, h: tlH, a: 1 };
  if (view === 'visual-tl' || view === 'soul-tl') {
    const base = baseAreas(view === 'soul-tl' ? 'soul' : 'visual', w, h);
    const main = view === 'soul-tl' ? 'soul' : 'stage';
    return { ...base, [main]: { ...base[main], x: 0, y: 0, w, h: top + pad, a: 1 }, timeline: tl, column: colOff };
  }
  if (view === 'visual-code-tl') {
    const base = baseAreas('code', w, h);
    return { ...base, stage: { ...base.stage, h: top + pad }, code: base.code, timeline: { ...tl, w: base.stage.w - 2 * pad }, column: colOff };
  }
  if (view === 'code-tl') {
    const base = baseAreas('code-only', w, h);
    return { ...base, code: { x: Math.round(w * .1), y: pad, w: Math.round(w * .8), h: top - pad, a: 1 }, timeline: tl, column: colOff };
  }
  if (view === 'visual-float') {
    // floating over the stage, a scrolling window
    return { ...baseAreas('visual', w, h), timeline: { x: Math.round(w * .2), y: h - Math.round(h * .2) - pad * 4, w: Math.round(w * .6), h: Math.round(h * .18), a: 1, float: true }, column: colOff };
  }
  if (view === 'visual-column') {
    const base = baseAreas('visual', w, h);
    return { ...base, stage: { ...base.stage, w: w - colW - 2 * pad }, timeline: tlOff, column: { x: w - colW - pad, y: pad, w: colW, h: h - 2 * pad, a: 1 } };
  }
  return { ...baseAreas(view, w, h), timeline: tlOff, column: colOff };
}
function baseAreas(view, w, h) {
  const side = Math.round(w / 3), sx = w - side, pad = Math.round(h / 54), head = Math.round(h / 27);
  const full = { x: 0, y: 0, w, h, a: 1 };
  const off = (y, hh) => ({ x: w + pad, y, w: side - 2 * pad, h: hh, a: 0 });
  const soulH = head + Math.round((side - 2 * pad) * 760 / 1200);
  if (view === 'code' || view === 'code-soul') {
    const soul = view === 'code-soul';
    const codeY = soul ? pad + soulH + pad : pad;
    return {
      stage: { x: 0, y: 0, w: sx, h, a: 1 },
      soul: soul ? { x: sx + pad, y: pad, w: side - 2 * pad, h: soulH, a: 1, head } : { ...off(pad, soulH), head },
      code: { x: sx + pad, y: codeY, w: side - 2 * pad, h: h - codeY - pad, a: 1 },
    };
  }
  if (view === 'soul') return { stage: { ...full, a: 0 }, soul: { ...full, head }, code: off(pad, h - 2 * pad) };
  if (view === 'code-only') {
    // the code in the middle, room at the bottom for the song card
    return { stage: { ...full, a: 0 }, soul: { ...off(pad, soulH), head }, code: { x: Math.round(w * .1), y: Math.round(h * .06), w: Math.round(w * .8), h: Math.round(h * .74), a: 1 } };
  }
  return { stage: full, soul: { ...off(pad, soulH), head }, code: off(pad, h - 2 * pad) };
}

// smooth start and end
export const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const mix = (a, b, k) => a + (b - a) * k;
// the areas between two views at k (0: from, 1: to). An area coming in keeps its final size and slides from its hidden
// place (or fades in place); an area going out keeps its size and slides to its hidden place (or fades)
export function lerpAreas(from, to, k) {
  const out = {};
  for (const n of Object.keys(to)) {
    let a = from[n] || to[n], b = to[n];
    if (a.a === 0 && b.a > 0) a = { ...b, x: a.x, a: 0 };
    else if (b.a === 0 && a.a > 0) b = { ...a, x: b.x, a: 0 };
    const r = {};
    for (const f of Object.keys(b)) r[f] = mix(a[f] ?? b[f], b[f], k);
    out[n] = r;
  }
  return out;
}

// the messages (BroadcastChannel, same browser and origin)
export const CHANNEL = 'coding-misk-live';
// the broadcast window sends a beat every second while it draws; after STALE seconds without one the picture counts as stopped
export const BEAT_MS = 1000;
export const STALE = 5;
export const isStale = (lastBeat, now) => !lastBeat || now - lastBeat > STALE * 1000;
// the broadcast window's size: half of 1920×1080, so a Retina screen gives 1080p pixels
export const WINDOW = { w: 960, h: 540 };
