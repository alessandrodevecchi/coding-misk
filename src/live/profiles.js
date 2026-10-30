// Performance profiles (performance-profiles, #64): named sets of the controls that decide how a song builds and
// looks while it plays. A profile is chosen in Compose, or named by a song or its style; changing one control makes
// it "custom", based on it. Pure: checked in Node.
import { COMMENT_PRESETS, commentPreset } from '../song/comments.js';
import { FUNCTION_PRESETS, functionPreset } from '../song/writer.js';
import { OPENINGS, PACES, DEVELOPMENTS } from '../song/shapes.js';

export const CONTROLS = {
  build: ['blocks', 'crescendo'],
  // growth (live-coder-growth): small steps, gradual (the natural growth before live-coder-growth), natural (like a live
  // coder: waypoints and small moves); duration of the natural growth: fitted in the written length or free
  growth: ['crescendo', 'gradual', 'natural'],
  // planned (new-song-panel D12): inside the song's length target, as the radio grows a song on air; only a song with a
  // length target carries it (song-config.js)
  duration: ['fitted', 'free', 'planned'],
  // the narrator (profile-options): on, the step phrases are spoken; off, they are not (the voice instrument and the
  // comments are not affected); a configuration saved without it plays with the narrator on
  narrator: [true, false],
  narrated: [false, true],
  // the narrator's style (voice-controls): automatic (the song's own, or its style's), explaining or poetic
  narratorStyle: ['auto', 'explain', 'poetic'],
  typing: ['slow', 'normal', 'fast'],
  view: ['now', 'compact', 'track', 'sections'],
  gen: ['standard', 'idiomatic'],
  title: [true, false],
  // comments (code-writing): separate options; the preset (all, essential, none or custom) comes from them
  tracks: [true, false],
  notes: [true, false],
  steps: [true, false],
  // the voices' code (voice-track-tuning D11, Options): "V:N code" (voice, the narrator's lines) and "V:T code"
  // (spoken, the voice track's lines); off, they play from the hidden code. Their defaults follow the build (codeDefaults)
  voice: [true, false],
  spoken: [true, false],
  highlights: [false, true],
  wrap: [false, true],
  // technical functions (code-writing, song-functions): separate options; the preset (full, short, mixer, compact or
  // custom) comes from them
  fnBus: [false, true],
  fnLevel: [false, true],
  fnCrunch: [false, true],
  fnVoice: [false, true],
  fnSong: [false, true],
  fnLib: [false, true],
  // section and clip lanes in the hidden mixer, one line per part edited in place (code-lanes)
  fnLanes: [false, true],
  // how the code is typed (human-typing): exact, or like a person with pauses, typos and changes of mind
  typist: ['exact', 'human'],
  // with human typing (typing-mistakes): typos, wrong words and changes of mind on or off
  mistakes: ['on', 'off'],
  // growth shape of the natural growth (growth-shapes): automatic (song, style, seed) or one value
  opening: ['auto', ...OPENINGS],
  pace: ['auto', ...PACES],
  development: ['auto', ...DEVELOPMENTS],
};
export const PROFILES = {
  classic: { build: 'blocks', growth: 'crescendo', duration: 'fitted', narrator: true, narrated: false, narratorStyle: 'auto', typing: 'normal', view: 'sections', gen: 'standard', title: true, tracks: true, notes: true, steps: true, voice: true, spoken: true, highlights: false, wrap: false, fnBus: false, fnLevel: false, fnCrunch: false, fnVoice: false, fnSong: false, fnLib: false, fnLanes: false, typist: 'exact', mistakes: 'on', opening: 'auto', pace: 'auto', development: 'auto' },
  crescendo: { build: 'crescendo', growth: 'crescendo', duration: 'fitted', narrator: true, narrated: false, narratorStyle: 'auto', typing: 'normal', view: 'now', gen: 'standard', title: true, tracks: true, notes: true, steps: true, voice: false, spoken: false, highlights: false, wrap: false, fnBus: false, fnLevel: false, fnCrunch: false, fnVoice: false, fnSong: false, fnLib: false, fnLanes: false, typist: 'exact', mistakes: 'on', opening: 'auto', pace: 'auto', development: 'auto' },
  // Live coder (shown so since clear-names; the id stays switch in songs, recipes and storage); its comments are the
  // title only (radio-profiles 9.2): no track names, notes or phrases
  switch: { build: 'crescendo', growth: 'natural', duration: 'free', narrator: true, narrated: false, narratorStyle: 'auto', typing: 'normal', view: 'now', gen: 'idiomatic', title: true, tracks: false, notes: false, steps: false, voice: false, spoken: false, highlights: true, wrap: true, fnBus: true, fnLevel: true, fnCrunch: true, fnVoice: true, fnSong: true, fnLib: true, fnLanes: true, typist: 'human', mistakes: 'on', opening: 'auto', pace: 'auto', development: 'auto' },
};
export const PROFILE_IDS = Object.keys(PROFILES);
// the controls that change only how the code looks, never the sound or the growth (radio-profiles 9.1): comments, technical
// functions, the title, lit notes, line breaks, human typing and its mistakes. In the radio they apply to the song on air
// from its next code edit; the others (build, growth, duration, shape, view, generator, narrator, narrated, narrator style, typing speed) from the
// next song
export const DISPLAY_CONTROLS = ['title', 'tracks', 'notes', 'steps', 'voice', 'spoken', 'highlights', 'wrap', 'fnBus', 'fnLevel', 'fnCrunch', 'fnVoice', 'fnSong', 'fnLib', 'fnLanes', 'typist', 'mistakes'];
// the code options that also apply with the Live build off (profile-options): the song as written goes through the
// live code when one of them is away from Classic's
export const CODE_CONTROLS = DISPLAY_CONTROLS.filter(k => k !== 'typist' && k !== 'mistakes');
export const writtenOptions = C => !!C && CODE_CONTROLS.some(k => (C[k] ?? PROFILES.classic[k]) !== PROFILES.classic[k]);
// only the display controls of a set of controls (or of overrides)
export const displayOf = c => Object.fromEntries(DISPLAY_CONTROLS.filter(k => c && c[k] !== undefined).map(k => [k, c[k]]));
// controls in force (resolveProfile's result) with other display controls: the growth controls stay as they are
export function withDisplay(C, display) {
  const d = displayOf(display);
  if (!Object.keys(d).length) return C;
  const { id, custom, comments, functions, ...rest } = C;
  return resolveProfile(id, { ...rest, ...d });
}

// the profile a song names: its own `profile`, else its old `buildStyle` (crescendo or blocks), else null
export function songProfile(song) {
  if (!song) return null;
  if (PROFILES[song.profile]) return song.profile;
  if (song.buildStyle === 'crescendo') return 'crescendo';
  if (song.buildStyle === 'blocks') return 'classic';
  return null;
}
// overrides cleaned: only known controls with allowed values, and only those that differ from the profile
// a comments preset (saved before code-writing, or picked in Compose) stands for its options; so does a technical
// functions preset (full, short and mixer saved before song-functions keep their meaning)
// The voices' code defaults (voice-track-tuning D11, owner answer 2): hidden when the song grows (the crescendo build of
// Crescendo, Live coder or a custom profile), shown when the code is static (Classic, or the Live build off: live false)
export const codeDefaults = (build, live = true) => (live && build === 'crescendo' ? { voice: false, spoken: false } : { voice: true, spoken: true });
// a profile's base with the voices' code defaults of the build the overrides ask for (a value set by the user is kept: it
// differs from this base)
const baseFor = (base, raw, live) => { const b = raw && CONTROLS.build.includes(raw.build) ? raw.build : base && base.build; return base ? { ...base, ...codeDefaults(b, live) } : base; };
export function cleanOverrides(raw, base, { live = true } = {}) {
  base = baseFor(base, raw, live);
  const out = {}, src = raw && typeof raw === 'object' ? { ...raw } : {};
  if (COMMENT_PRESETS[src.comments]) { for (const [k, v] of Object.entries(COMMENT_PRESETS[src.comments])) if (!(k in src)) src[k] = v; }
  if (FUNCTION_PRESETS[src.functions]) { for (const [k, v] of Object.entries(FUNCTION_PRESETS[src.functions])) if (!(k in src)) src[k] = v; }
  delete src.comments; delete src.functions;
  for (const [k, v] of Object.entries(src)) if (CONTROLS[k] && CONTROLS[k].includes(v) && (!base || base[k] !== v)) out[k] = v;
  return out;
}
// the controls in force: { id, custom, ...controls }
// live: false (Compose with the Live build off) shows both voices' code unless the user hid it
export function resolveProfile(id, overrides = {}, { live = true } = {}) {
  const pid = PROFILES[id] ? id : 'classic', base = baseFor(PROFILES[pid], overrides, live), over = cleanOverrides(overrides, PROFILES[pid], { live });
  const c = { ...base, ...over };
  return { id: pid, custom: Object.keys(over).length > 0, ...c, comments: commentPreset(c), functions: functionPreset(c) };
}
// the first overrides, from the separate settings used before profiles (read once)
export function migrateOld(get) {
  const style = get('coding-misk-live-style'), id = style === 'crescendo' ? 'crescendo' : 'classic';
  const raw = { view: get('coding-misk-live-code'), gen: get('coding-misk-live-gen'), narrated: get('coding-misk-live-narrated') === true ? true : undefined, typing: get('coding-misk-typing') };
  return { id, overrides: cleanOverrides(raw, PROFILES[id]) };
}

// the rules of crescendoSong for a growth: gradual is the natural growth before live-coder-growth
// the natural growth follows a growth shape (growth-shapes): the controls' choices ('auto' or a value) and the known
// style recipes ({ id: recipe }, for the weights and the metamorphosis), resolved per song by crescendoSong
export function growthRules(C, { styles } = {}) {
  if (C.growth === 'gradual') return { natural: true };
  if (C.growth === 'natural') return { natural: true, coder: true, free: C.duration === 'free', shape: { opening: C.opening || 'auto', pace: C.pace || 'auto', development: C.development || 'auto' }, ...(styles ? { styles } : {}) };
  return {};
}
// overrides saved before live-coder-growth: "natural" was the growth now called gradual
export const PROFILE_STORE_VERSION = 2;
export function migrateGrowth(overrides, version) {
  if ((version || 1) >= 2 || !overrides || overrides.growth !== 'natural') return overrides;
  return { ...overrides, growth: 'gradual' };
}
