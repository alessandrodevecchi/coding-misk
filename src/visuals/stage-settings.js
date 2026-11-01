// The settings of the stage widgets (widgets-on-stage D4, D5, D7, D9): the layer over the other looks, the panel limits,
// the instruments and widgets (the code widgets card's, or the stage's own copy), colours and silent instruments.
// Stored whole in `coding-misk-stage-widgets` (in the backup); pure, checked in Node (tools/check-stage-widgets.mjs).
import { CW_DEFAULTS, CW_INSTRUMENTS, WIDGETS, APP_KINDS, APP_KINDS_VERSION, BY_VISUAL, widgetFor, widgetSettings } from '../live/widgets.js';

export const SW_KEY = 'coding-misk-stage-widgets';
// the sections of the card left open (working state, not in the backup)
export const SW_OPEN = 'coding-misk-sw-open';
// Widgets over the visual (stage-app-widgets D6): off (default), strip (Side panels), palco (Big screen: the Palco
// look's big screen; side panels on the other looks). The stored values keep their names
export const SW_LAYERS = ['off', 'strip', 'palco'];
// the modes the quick switch brings back (D5): the last one chosen, Side panels the first time
export const SW_ON_LAYERS = ['strip', 'palco'];
// stage-app-widgets D4: the version of the stored settings. Without it the hit grid and the tone cloud were forced off
// (code-over-visual cv13), never chosen: read once as on, then saved with the version
export const SW_VERSION = 2;
export const SW_MAPPINGS = ['same', 'own'];
export const SW_COLOURS = ['auto', 'theme', 'scene'];
export const SW_SILENT = ['dimmed', 'hidden'];
// D3, D4, D5: Monitor 2 to 6 panels (6), the strip 1 to 4 (4), the Palco screen up to 4
export const SW_LIMITS = { monitor: [2, 6], strip: [1, 4] };
export const PALCO_MAX = 4;

export const SW_DEFAULTS = Object.freeze({
  layer: 'off', last: 'strip', monitor: 6, strip: 4, mapping: 'same', colours: 'auto', silent: 'dimmed',
  widgets: Object.freeze({ ...CW_DEFAULTS.widgets }),
  instruments: CW_DEFAULTS.instruments,
});

const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const one = (v, list, d) => (list.includes(v) ? v : d);
// the stored settings (any shape, old or partial) completed with the defaults
export function stageSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, D = SW_DEFAULTS;
  // the instruments section as the code widgets card reads it (the same rules for primary and secondary widgets)
  // (#79: an own copy saved before the app widgets gets their defaults once, as the code widgets card does)
  const own = widgetSettings({ instruments: r.instruments, appKinds: r.appKinds }).instruments;
  // D4: stored before the version, the app widgets' false was forced, not chosen
  const stored = { ...(r.widgets || {}) };
  if (r.v !== SW_VERSION) for (const k of APP_KINDS) delete stored[k];
  const layer = one(r.layer, SW_LAYERS, D.layer);
  return {
    appKinds: APP_KINDS_VERSION,
    v: SW_VERSION,
    layer,
    // the mode the quick switch turns on (D5): the layer when on, else the last one stored
    last: layer !== 'off' ? layer : one(r.last, SW_ON_LAYERS, D.last),
    monitor: clampInt(r.monitor, ...SW_LIMITS.monitor, D.monitor),
    strip: clampInt(r.strip, ...SW_LIMITS.strip, D.strip),
    mapping: one(r.mapping, SW_MAPPINGS, D.mapping),
    colours: one(r.colours, SW_COLOURS, D.colours),
    silent: one(r.silent, SW_SILENT, D.silent),
    widgets: Object.fromEntries(WIDGETS.map(w => [w, typeof stored[w] === 'boolean' ? stored[w] : D.widgets[w]])),
    instruments: Object.fromEntries(CW_INSTRUMENTS.map(k => [k, own[k]])),
  };
}

// D5: the mapping the panels use. Same as code widgets: the code widgets card's slot order, instruments, primary and
// secondary widgets, share, "Widget notes" and window, whether or not the code widgets are on; own: the stage's own
// instruments section. Either way the widget kinds on or off are the stage's own. stage-app-widgets: the app widgets
// (hit grid, tone cloud) are stage panels like the others (code-over-visual cv13 removed them), the voice is back
export function stageMapping(sw, cw) {
  const own = sw.mapping === 'own' ? sw.instruments : cw.instruments;
  return { ...cw, widgets: { ...sw.widgets }, instruments: Object.fromEntries(Object.entries(own).map(([k, I]) => [k, { ...I, secondary: I.secondary.slice() }])) };
}
// D5: the quick switch above the visual: off when on, else the last mode chosen
export const toggleLayer = sw => ({ ...sw, layer: sw.layer === 'off' ? one(sw.last, SW_ON_LAYERS, 'strip') : 'off', last: sw.layer === 'off' ? sw.last : sw.layer });

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
