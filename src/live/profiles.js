// Performance profiles (performance-profiles, #64): named sets of the controls that decide how a song builds and
// looks while it plays. A profile is chosen in Compose, or named by a song or its style; changing one control makes
// it "custom", based on it. Pure: checked in Node.
import { COMMENT_PRESETS, commentPreset } from '../song/comments.js';

export const CONTROLS = {
  build: ['blocks', 'crescendo'],
  growth: ['crescendo', 'natural'],
  narrated: [false, true],
  typing: ['slow', 'normal', 'fast'],
  view: ['now', 'compact', 'track', 'sections'],
  gen: ['standard', 'idiomatic'],
  title: [true, false],
  // comments (code-writing): separate options; the preset (all, essential, none or custom) comes from them
  tracks: [true, false],
  notes: [true, false],
  steps: [true, false],
  voice: [true, false],
  highlights: [false, true],
  wrap: [false, true],
  functions: ['full', 'short', 'mixer'],
};
export const PROFILES = {
  classic: { build: 'blocks', growth: 'crescendo', narrated: false, typing: 'normal', view: 'sections', gen: 'standard', title: true, tracks: true, notes: true, steps: true, voice: true, highlights: false, wrap: false, functions: 'full' },
  crescendo: { build: 'crescendo', growth: 'crescendo', narrated: false, typing: 'normal', view: 'now', gen: 'standard', title: true, tracks: true, notes: true, steps: true, voice: true, highlights: false, wrap: false, functions: 'full' },
  switch: { build: 'crescendo', growth: 'natural', narrated: false, typing: 'normal', view: 'now', gen: 'idiomatic', title: true, tracks: true, notes: false, steps: false, voice: false, highlights: true, wrap: true, functions: 'mixer' },
};
export const PROFILE_IDS = Object.keys(PROFILES);

// the profile a song names: its own `profile`, else its old `buildStyle` (crescendo or blocks), else null
export function songProfile(song) {
  if (!song) return null;
  if (PROFILES[song.profile]) return song.profile;
  if (song.buildStyle === 'crescendo') return 'crescendo';
  if (song.buildStyle === 'blocks') return 'classic';
  return null;
}
// overrides cleaned: only known controls with allowed values, and only those that differ from the profile
// a comments preset (saved before code-writing, or picked in Compose) stands for its options
export function cleanOverrides(raw, base) {
  const out = {}, src = raw && typeof raw === 'object' ? { ...raw } : {};
  if (COMMENT_PRESETS[src.comments]) { for (const [k, v] of Object.entries(COMMENT_PRESETS[src.comments])) if (!(k in src)) src[k] = v; }
  delete src.comments;
  for (const [k, v] of Object.entries(src)) if (CONTROLS[k] && CONTROLS[k].includes(v) && (!base || base[k] !== v)) out[k] = v;
  return out;
}
// the controls in force: { id, custom, ...controls }
export function resolveProfile(id, overrides = {}) {
  const pid = PROFILES[id] ? id : 'classic', base = PROFILES[pid], over = cleanOverrides(overrides, base);
  const c = { ...base, ...over };
  return { id: pid, custom: Object.keys(over).length > 0, ...c, comments: commentPreset(c) };
}
// the first overrides, from the separate settings used before profiles (read once)
export function migrateOld(get) {
  const style = get('coding-misk-live-style'), id = style === 'crescendo' ? 'crescendo' : 'classic';
  const raw = { view: get('coding-misk-live-code'), gen: get('coding-misk-live-gen'), narrated: get('coding-misk-live-narrated') === true ? true : undefined, typing: get('coding-misk-typing') };
  return { id, overrides: cleanOverrides(raw, PROFILES[id]) };
}
