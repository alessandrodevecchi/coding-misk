// Performance profiles (performance-profiles, #64): named sets of the controls that decide how a song builds and
// looks while it plays. A profile is chosen in Compose, or named by a song or its style; changing one control makes
// it "custom", based on it. Pure: checked in Node.

export const CONTROLS = {
  build: ['blocks', 'crescendo'],
  growth: ['crescendo', 'natural'],
  narrated: [false, true],
  typing: ['slow', 'normal', 'fast'],
  view: ['now', 'compact', 'track', 'sections'],
  gen: ['standard', 'idiomatic'],
  title: [true, false],
  comments: ['all', 'essential', 'none'],
  highlights: [false, true],
  wrap: [false, true],
};
export const PROFILES = {
  classic: { build: 'blocks', growth: 'crescendo', narrated: false, typing: 'normal', view: 'sections', gen: 'standard', title: true, comments: 'all', highlights: false, wrap: false },
  crescendo: { build: 'crescendo', growth: 'crescendo', narrated: false, typing: 'normal', view: 'now', gen: 'standard', title: true, comments: 'all', highlights: false, wrap: false },
  switch: { build: 'crescendo', growth: 'natural', narrated: false, typing: 'normal', view: 'now', gen: 'idiomatic', title: true, comments: 'essential', highlights: true, wrap: true },
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
export function cleanOverrides(raw, base) {
  const out = {};
  for (const [k, v] of Object.entries(raw && typeof raw === 'object' ? raw : {})) if (CONTROLS[k] && CONTROLS[k].includes(v) && (!base || base[k] !== v)) out[k] = v;
  return out;
}
// the controls in force: { id, custom, ...controls }
export function resolveProfile(id, overrides = {}) {
  const pid = PROFILES[id] ? id : 'classic', base = PROFILES[pid], over = cleanOverrides(overrides, base);
  return { id: pid, custom: Object.keys(over).length > 0, ...base, ...over };
}
// the first overrides, from the separate settings used before profiles (read once)
export function migrateOld(get) {
  const style = get('coding-misk-live-style'), id = style === 'crescendo' ? 'crescendo' : 'classic';
  const raw = { view: get('coding-misk-live-code'), gen: get('coding-misk-live-gen'), narrated: get('coding-misk-live-narrated') === true ? true : undefined, typing: get('coding-misk-typing') };
  return { id, overrides: cleanOverrides(raw, PROFILES[id]) };
}
