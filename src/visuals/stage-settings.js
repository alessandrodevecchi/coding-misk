// The settings of the stage widgets (widgets-on-stage D4, D5, D7, D9): the layer over the other looks, the panel limits,
// the instruments and widgets (the code widgets card's, or the stage's own copy), colours and silent instruments.
// Stored whole in `coding-misk-stage-widgets` (in the backup); pure, checked in Node (tools/check-stage-widgets.mjs).
import { CW_DEFAULTS, CW_INSTRUMENTS, WIDGETS, APP_KINDS, BY_VISUAL, widgetFor, widgetSettings } from '../live/widgets.js';

export const SW_KEY = 'coding-misk-stage-widgets';
// the sections of the card left open (working state, not in the backup)
export const SW_OPEN = 'coding-misk-sw-open';
// Over the scene: off (default), strip, Palco (the Palco look's big screen; the strip on the other looks)
export const SW_LAYERS = ['off', 'strip', 'palco'];
export const SW_MAPPINGS = ['same', 'own'];
export const SW_COLOURS = ['auto', 'theme', 'scene'];
export const SW_SILENT = ['dimmed', 'hidden'];
// D3, D4, D5: Monitor 2 to 6 panels (6), the strip 1 to 4 (4), the Palco screen up to 4
export const SW_LIMITS = { monitor: [2, 6], strip: [1, 4] };
export const PALCO_MAX = 4;

export const SW_DEFAULTS = Object.freeze({
  layer: 'off', monitor: 6, strip: 4, mapping: 'same', colours: 'auto', silent: 'dimmed',
  widgets: Object.freeze({ ...CW_DEFAULTS.widgets, ...Object.fromEntries(APP_KINDS.map(k => [k, false])) }),
  instruments: CW_DEFAULTS.instruments,
});

const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const one = (v, list, d) => (list.includes(v) ? v : d);
// the stored settings (any shape, old or partial) completed with the defaults
export function stageSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, D = SW_DEFAULTS;
  // the instruments section as the code widgets card reads it (the same rules for primary and secondary widgets)
  const own = widgetSettings({ instruments: r.instruments }).instruments;
  return {
    layer: one(r.layer, SW_LAYERS, D.layer),
    monitor: clampInt(r.monitor, ...SW_LIMITS.monitor, D.monitor),
    strip: clampInt(r.strip, ...SW_LIMITS.strip, D.strip),
    mapping: one(r.mapping, SW_MAPPINGS, D.mapping),
    colours: one(r.colours, SW_COLOURS, D.colours),
    silent: one(r.silent, SW_SILENT, D.silent),
    widgets: Object.fromEntries(WIDGETS.map(w => [w, typeof (r.widgets || {})[w] === 'boolean' ? r.widgets[w] : D.widgets[w]])),
    instruments: Object.fromEntries(CW_INSTRUMENTS.map(k => [k, own[k]])),
  };
}

// D5: the mapping the panels use. Same as code widgets: the code widgets card's slot order, instruments, primary and
// secondary widgets, share, "Widget notes" and window, whether or not the code widgets are on; own: the stage's own
// instruments section. Either way the widget kinds on or off are the stage's own.
// code-over-visual cv13: the app widgets (hit grid, tone cloud) are not stage panels yet: an instrument whose primary is
// one falls back to its first Strudel widget, and the voice (off on the stage before its tone cloud) stays off
export function stageMapping(sw, cw) {
  const own = sw.mapping === 'own' ? sw.instruments : cw.instruments, instruments = {};
  for (const [k, I] of Object.entries(own)) {
    if (!APP_KINDS.includes(I.primary)) { instruments[k] = { ...I, secondary: I.secondary.filter(w => !APP_KINDS.includes(w)) }; continue; }
    const sec = I.secondary.filter(w => !APP_KINDS.includes(w));
    instruments[k] = { on: I.on && k !== 'voice' && sec.length > 0, primary: sec[0] || 'scope', secondary: sec.slice(1) };
  }
  return { ...cw, widgets: { ...sw.widgets, ...Object.fromEntries(APP_KINDS.map(k => [k, false])) }, instruments };
}

// the layer over a look: 'strip', 'screen' (Palco's big screen) or null (off, a widget look, the soul)
export const FULL_LOOKS = ['monitor', 'rullo', 'claude', 'soul'];
export function layerOn(sw, look) {
  if (!sw || sw.layer === 'off' || FULL_LOOKS.includes(look)) return null;
  return sw.layer === 'palco' && look === 'palco' ? 'screen' : 'strip';
}
// the panel limit of a look: Monitor, the strip, the Palco screen
export const limitOf = (sw, kind) => (kind === 'monitor' || kind === 'rullo' ? sw.monitor : kind === 'screen' ? PALCO_MAX : sw.strip);

// D8, the fast video with "Real scope and spectrum: Always": the stage instruments (the `analyze` names of the
// segments' code and of their hidden mixer) whose panel would be a scope or a spectrum, to render alone like the code
// widgets' ones. S: stageMapping; seed: the song's seed (the widget of an instrument depends on it, as on the stage)
export function stageScopeInstruments(segments, S, seed = '') {
  const names = new Set();
  for (const s of segments || []) {
    for (const m of String(s.code || '').matchAll(/\.analyze\(\s*["']([\w-]+)["']\s*\)/g)) names.add(m[1]);
    for (const m of String(s.run || '').matchAll(/analyze:\s*'([\w-]+)'/g)) names.add(m[1]);
  }
  return [...names].filter(i => { const w = widgetFor(BY_VISUAL[i] || 'lead', S, i, seed); return w === 'scope' || w === 'spectrum'; }).sort();
}
