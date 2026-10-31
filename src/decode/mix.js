// The mix of a decoded track (track-to-code D11): the Original and the Code tracks, mute and solo as listening controls
// (they never change the code text), and the Original ↔ Code slider. The rules that keep the slider and the mutes
// consistent are a pure state function, checked in Node (npm run check:decode); the audio part puts the original into
// the master stage before the limiter and a gain on the code's bus.
//
// state: { slider: 0 (Original) … 1 (Code), tracks: [{ id, kind: 'orig' | 'code', mute, solo, by: 'user' | 'slider' | null }] }

export const ORIG = 'orig';
export function defaultMix(codeIds = ['code']) {
  // the default (D11): slider on Original, the code muted by the slider, so dragging the slider is enough to hear it
  return { slider: 0, tracks: [{ id: ORIG, kind: 'orig', mute: false, solo: false, by: null }, ...codeIds.map(id => ({ id, kind: 'code', mute: true, solo: false, by: 'slider' }))] };
}
const clone = s => ({ slider: s.slider, tracks: s.tracks.map(t => ({ ...t })) });
const codes = s => s.tracks.filter(t => t.kind === 'code');
const orig = s => s.tracks.find(t => t.kind === 'orig');

// the slider moved to x: rule 1 (an end mutes the other side, keeping the user's mutes) and rule 2 (leaving an end clears
// only the slider's own mutes)
function slide(s, x) {
  s.slider = Math.max(0, Math.min(1, x));
  for (const t of s.tracks) if (t.by === 'slider') { t.mute = false; t.by = null; }
  if (s.slider === 0) for (const t of codes(s)) if (!t.mute) { t.mute = true; t.by = 'slider'; }
  if (s.slider === 1) { const o = orig(s); if (o && !o.mute) { o.mute = true; o.by = 'slider'; } }
  return s;
}
// action: { type: 'slider', value } | { type: 'mute', id } | { type: 'solo', id } | { type: 'tracks', codeIds }
export function mixApply(state, action) {
  const s = clone(state);
  if (action.type === 'slider') return slide(s, +action.value);
  if (action.type === 'tracks') {
    // the code tracks change (level A one, level B one per part): new ones follow the slider at an end
    const keep = new Map(s.tracks.map(t => [t.id, t]));
    s.tracks = [orig(s) || { id: ORIG, kind: 'orig', mute: false, solo: false, by: null }, ...action.codeIds.map(id => keep.get(id) || { id, kind: 'code', mute: false, solo: false, by: null })];
    return slide(s, s.slider);
  }
  const t = s.tracks.find(x => x.id === action.id);
  if (!t) return s;
  if (action.type === 'mute') {
    if (t.mute) {
      t.mute = false; t.by = null;
      // rule 4: unmuting a side while the slider sits at the other end moves it to the middle
      if ((t.kind === 'code' && s.slider === 0) || (t.kind === 'orig' && s.slider === 1)) return slide(s, 0.5);
      return s;
    }
    t.mute = true; t.by = 'user';
    // rule 3: every code track muted → Original; the original muted → Code
    if (t.kind === 'orig') return slide(s, 1);
    if (codes(s).every(c => c.mute)) return slide(s, 0);
    return s;
  }
  if (action.type === 'solo') {
    t.solo = !t.solo;
    if (!t.solo) return s;
    // a soloed track is heard: its own mute goes; rule 3 moves the slider to its side
    if (t.mute) { t.mute = false; t.by = null; }
    return slide(s, t.kind === 'orig' ? 0 : 1);
  }
  return s;
}
// whether a track is heard: not muted, and soloed when any track is
export function heard(s, id) {
  const t = s.tracks.find(x => x.id === id), solo = s.tracks.some(x => x.solo);
  return !!t && !t.mute && (!solo || t.solo);
}
// equal-power gains (D11): the original cos(x·π/2), the code sin(x·π/2); in the middle both at about -3 dB
export function gainsOf(s) {
  const x = s.slider, go = Math.cos((x * Math.PI) / 2), gc = Math.sin((x * Math.PI) / 2);
  // (at an end the other side is muted by the slider anyway; a user unmute there moves the slider, rule 4)
  const out = { [ORIG]: heard(s, ORIG) ? go : 0 };
  for (const t of codes(s)) out[t.id] = heard(s, t.id) ? gc : 0;
  return out;
}
// the loudness trim of the original (D11): its RMS over the loudest 30 seconds against the app's song level, so the
// slider's ends sound about as loud. REF_RMS: the RMS of the app's songs at the limiter's input (measured on exports)
export const REF_RMS = 0.16;
export function loudnessTrim(pcm, rate, { master = 0.6 } = {}) {
  const win = Math.max(1, Math.round(rate * 0.5)), blocks = [];
  for (let i = 0; i + win <= pcm.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += pcm[k] * pcm[k]; blocks.push(s / win); }
  if (!blocks.length) return 1;
  const n = Math.min(blocks.length, 60), top = blocks.slice().sort((a, b) => b - a).slice(0, n);
  const rms = Math.sqrt(top.reduce((a, b) => a + b, 0) / n);
  if (!(rms > 1e-5)) return 1;
  // the original goes into the stage after the master level: the trim brings it to REF_RMS there
  return Math.round(Math.max(0.1, Math.min(4, REF_RMS / (rms * master))) * 1000) / 1000;
}

// ---------- audio (browser) ----------
// the code's bus: a gain between Strudel's merger and the master stage's level node (installMaster in
// src/sounds/limiter.js); installed again when Strudel makes a new output. The original joins the same level node.
export function codeBus(output) {
  const st = output && output.miskMaster;
  if (!st) return null;
  if (st.codeGain && st.codeFor === st.merger) return st;
  const ctx = st.ctx, g = new GainNode(ctx, { gain: 1 });
  try { st.merger.disconnect(st.level); } catch (e) {}
  st.merger.connect(g); g.connect(st.level);
  st.codeGain = g; st.codeFor = st.merger;
  return st;
}
export function setGain(param, v, ctx) {
  if (!param || Math.abs(param.value - v) < 1e-4) return;
  try { param.setTargetAtTime(v, ctx.currentTime, 0.015); } catch (e) { param.value = v; }
}
