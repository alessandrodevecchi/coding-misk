// Presets of the New song panel (new-song-panel D6): named snapshots of how a song is made. Five built-in ones serve as a
// guide (changed once the owner has tried them); the owner's own are saved in this browser under
// coding-misk-song-presets ({ name: values }) and go into the backup. Picking a preset sets the values it holds and
// leaves the others as they are. Pure apart from the store passed in.
import { cleanVoice, applyPreset } from './voice-options.js';

export const SONG_PRESETS_KEY = 'coding-misk-song-presets';
// the values a preset may hold
export const PRESET_KEYS = ['styles', 'chaos', 'energy', 'complexity', 'talk', 'artist', 'profile', 'custom', 'material', 'voice', 'voices', 'narratorSound', 'length'];

export const BUILTIN_PRESETS = [
  { id: 'short-groove', name: { en: 'Short groove', it: 'Groove breve' }, values: { profile: 'classic', material: 'patterns', length: 'short' } },
  { id: 'live-coder', name: { en: 'Live coder', it: 'Live coder' }, values: { profile: 'switch', length: 'medium' } },
  { id: 'narrated', name: { en: 'Narrated Crescendo', it: 'Crescendo narrato' }, values: { profile: 'custom', custom: { base: 'crescendo', controls: { narrated: true, narratorStyle: 'explain' } }, voices: { narrator: true } } },
  { id: 'fresh', name: { en: 'New material', it: 'Materiale nuovo' }, values: { material: 'composed', chaos: 0.6 } },
  { id: 'obsessive-voice', name: { en: 'Obsessive voice', it: 'Voce ossessiva' }, values: { voices: { track: true }, voice: { preset: 'obsessive', presence: 'always' } } },
];
export const builtinPreset = id => BUILTIN_PRESETS.find(p => p.id === id) || null;

// the values a preset sets on the panel (state: the panel's values now, for the parts a preset holds only some of: a
// voice switch, the voice preset)
export function presetValues(p, state = null) {
  const v = JSON.parse(JSON.stringify(p.values || p));
  if (v.voices) v.voices = { narrator: true, track: true, ...(state ? state.voices : {}), ...v.voices };
  if (v.voice && v.voice.preset && !v.voice.phrases) v.voice = cleanVoice({ ...applyPreset(v.voice.preset, cleanVoice(state ? state.voice : {}), { presence: true }), ...(v.voice.presence ? { presence: v.voice.presence } : {}) });
  return v;
}
// the panel's values a preset keeps
export const presetOfState = state => JSON.parse(JSON.stringify(Object.fromEntries(PRESET_KEYS.filter(k => state[k] !== undefined).map(k => [k, state[k]]))));

// the owner's presets: { name: values }
export function userPresets(store) {
  const raw = store.get(SONG_PRESETS_KEY, {});
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}
// a preset's name as the select shows it: a built-in one's in the language, the owner's as written
export const presetLabel = (id, lang, store) => { const b = builtinPreset(id); return b ? b.name[lang] || b.name.en : userPresets(store)[id] ? id : ''; };
// save the current values under a name (built-in names make a preset of the owner's: they are never overwritten)
// → { name, overwrote }
export function savePreset(store, name, state) {
  const n = String(name || '').trim().slice(0, 30);
  if (!n) return null;
  const all = userPresets(store), overwrote = Object.prototype.hasOwnProperty.call(all, n);
  all[n] = presetOfState(state);
  store.set(SONG_PRESETS_KEY, all);
  return { name: n, overwrote };
}
export function deletePreset(store, name) {
  const all = userPresets(store);
  if (!Object.prototype.hasOwnProperty.call(all, name)) return false;
  delete all[name];
  store.set(SONG_PRESETS_KEY, all);
  return true;
}
// the preset to pick by its id: a built-in one first unless the owner saved one with the same name (his wins in the
// select: built-in ids are not names)
export function presetById(store, id) {
  const own = userPresets(store)[id];
  if (own) return { id, own: true, values: own };
  const b = builtinPreset(id);
  return b ? { ...b, own: false } : null;
}
