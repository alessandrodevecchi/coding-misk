// Colours of the stage widgets (widgets-on-stage D7): one palette object per theme, one colour per instrument. The
// looks read every colour from the palette they are given, so a later render style can pass its own.
// A palette: { name, bg, bg2, panel, edge, ink, label, muted, dim, grid, glow (0..1), inst: { instrument: colour } }

const NEON_INST = {
  kick: '#ff2e88', snare: '#00e5ff', hats: '#ffe14d', fx: '#ff9f43', riser: '#ff9f43', bass: '#00e5ff',
  guitar: '#ffe14d', arp: '#3dffb0', pad: '#a98bff', hook: '#ff7ad9', lead: '#ff7ad9', voice: '#f3ecff',
};
// hardware: the amber LCD, the green LED and warm tones (docs/DESIGN-SYSTEM.md, hardware theme)
const HW_INST = {
  kick: '#ff5a3d', snare: '#ffd27a', hats: '#ffe2a8', fx: '#ff8c42', riser: '#ff8c42', bass: '#ffb347',
  guitar: '#ffcf4d', arp: '#39ff6a', pad: '#d9b77a', hook: '#ff9a5c', lead: '#ff9a5c', voice: '#e9e6de',
};
export const THEME_PALETTES = Object.freeze({
  neon: Object.freeze({ name: 'neon', bg: '#07040f', bg2: '#120a24', panel: 'rgba(10,6,22,.88)', edge: '#2a2340', ink: '#f3ecff', label: '#c9bde8', muted: '#6f5f8f', dim: '#5a5370', grid: 'rgba(164,149,255,.10)', glow: 1, inst: Object.freeze(NEON_INST) }),
  hw: Object.freeze({ name: 'hw', bg: '#0e0e10', bg2: '#141416', panel: 'rgba(27,19,6,.92)', edge: '#3d3d43', ink: '#e9e6de', label: '#ffb347', muted: '#7a5a2a', dim: '#55524c', grid: 'rgba(255,179,71,.09)', glow: 0.45, inst: Object.freeze(HW_INST) }),
});
export const themePalette = theme => THEME_PALETTES[theme === 'hw' ? 'hw' : 'neon'];
// a colour per instrument, also for a name the map does not know (a stable pick from the map's colours)
export function instColour(pal, inst) {
  if (pal.inst[inst]) return pal.inst[inst];
  const list = Object.values(pal.inst);
  let h = 0; for (const ch of String(inst)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
// the palette of a look's scene colours (PAL[look] of src/visuals.js: wave, echo, grid, a, b, c, …), for the layer over
// the other looks (next delivery): the instruments take the scene's accents in turn
export function scenePalette(scene, base = THEME_PALETTES.neon) {
  const acc = [scene.a, scene.b, scene.c, scene.echo, scene.grid, scene.wave, scene.y, scene.m].filter(Boolean);
  if (!acc.length) return base;
  const inst = {};
  Object.keys(base.inst).forEach((k, i) => { inst[k] = acc[i % acc.length]; });
  return { ...base, name: 'scene', panel: 'rgba(5,3,12,.62)', inst };
}
