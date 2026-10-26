// Voice instrument options (voice-controls, #77): how many phrases a generated song speaks, whether they are different
// or one line repeated, the ways they may use, and in the radio how often a song gets a voice instrument. Presets set
// them together; the default (As the style) is the director's behaviour before voice-controls, so its songs do not
// change. Pure: the radio, Compose and the Node checks read the same options.
import { cleanSound, isAutoSound } from './voice-sound.js';

export const VOICE_PHRASES = ['1', '2-3', '4-5', '6-8', 'many'];
// the range each choice draws from ("many": up to 12)
export const PHRASE_RANGES = { 1: [1, 1], '2-3': [2, 3], '4-5': [4, 5], '6-8': [6, 8], many: [9, 12] };
export const VOICE_KINDS = ['different', 'repeated', 'mixed'];
export const VOICE_WAYS = ['opening', 'refrain', 'chop', 'passage'];
// never; as the style says (its weight as the chance); often (the style's weight × 2, at most 0.9); always (a single
// generated song with the voice instrument on: every song gets one, also when the style has none)
export const VOICE_PRESENCE = ['never', 'style', 'often', 'always'];
// the radio (voice-full-controls D14): Mai left the menu (the Voce: traccia switch silences the voice track), Sempre
// came in; a saved "never" reads as the switch off (radio.js)
export const RADIO_PRESENCE = ['style', 'often', 'always'];
// where the voice instrument speaks (D7): quiet, medium and busy parts, any combination with one at least; quiet only
// is the default (the placement before voice-full-controls)
export const VOICE_WHERE = ['quiet', 'medium', 'busy'];
// the vocabulary the radio's next songs draw their lines from (D16): as the style says, or one group
export const VOICE_VOCABS = ['style', 'dark', 'calm', 'machine', 'night'];
export const SONG_PRESENCE = ['style', 'always', 'never'];
// ways null: the style's own ways and weights; a list: those ways, each as likely
export const VOICE_DEFAULT = { preset: 'style', phrases: '1', kind: 'different', ways: null, presence: 'style', where: ['quiet'], vocab: 'style' };
export const VOICE_PRESETS = {
  style: { phrases: '1', kind: 'different', ways: null, presence: 'style' },
  discreet: { phrases: '1', kind: 'different', ways: [...VOICE_WAYS], presence: 'style' },
  present: { phrases: '2-3', kind: 'mixed', ways: null, presence: 'often' },
  obsessive: { phrases: '6-8', kind: 'repeated', ways: ['refrain', 'chop'], presence: 'often' },
};
export const VOICE_PRESET_IDS = Object.keys(VOICE_PRESETS);
const sameWays = (a, b) => (a === null || b === null ? a === b : a.length === b.length && a.every(x => b.includes(x)));
// options cleaned: known values only, the preset a name or 'custom'. presence: true keeps the presence (the radio and a
// single song keep it; a single song's presence is its on/off)
export function cleanVoice(raw) {
  const v = raw && typeof raw === 'object' ? raw : {};
  const ways = Array.isArray(v.ways) ? VOICE_WAYS.filter(w => v.ways.includes(w)) : null;
  const out = {
    phrases: VOICE_PHRASES.includes(String(v.phrases)) ? String(v.phrases) : VOICE_DEFAULT.phrases,
    kind: VOICE_KINDS.includes(v.kind) ? v.kind : VOICE_DEFAULT.kind,
    ways: ways && ways.length ? ways : null,
    presence: VOICE_PRESENCE.includes(v.presence) ? v.presence : VOICE_DEFAULT.presence,
    where: whereOf(v.where),
    vocab: VOICE_VOCABS.includes(v.vocab) ? v.vocab : 'style',
    // the voice track's sound for the radio's next songs (voice-full-controls D4): "auto" each song draws its own
    sound: cleanSound(v.sound),
  };
  return { preset: presetOf(out), ...out };
}
// the Where flags in their order, quiet only when none is given
export const whereOf = w => { const l = Array.isArray(w) ? VOICE_WHERE.filter(x => w.includes(x)) : []; return l.length ? l : ['quiet']; };
export const isQuietOnly = w => { const l = whereOf(w); return l.length === 1 && l[0] === 'quiet'; };
// the preset the options amount to: a preset's name when they match it (presence aside for a single song), else custom
export function presetOf(v, { presence = true } = {}) {
  const hit = VOICE_PRESET_IDS.find(id => { const p = VOICE_PRESETS[id]; return p.phrases === v.phrases && p.kind === v.kind && sameWays(p.ways, v.ways) && (!presence || p.presence === v.presence || v.presence === 'always'); });
  return hit || 'custom';
}
// a preset applied: its controls (a single song keeps its own presence)
export function applyPreset(id, cur = VOICE_DEFAULT, { presence = true } = {}) {
  const p = VOICE_PRESETS[id];
  if (!p) return cleanVoice(cur);
  // (a preset never replaces Sempre in the radio, D14; Where and the vocabulary are not part of a preset)
  const keep = presence && cur.presence === 'always';
  const out = { ...p, ways: p.ways ? [...p.ways] : null, presence: presence && !keep ? p.presence : cur.presence, where: whereOf(cur.where), vocab: VOICE_VOCABS.includes(cur.vocab) ? cur.vocab : 'style', sound: cleanSound(cur.sound) };
  return { ...out, preset: id };
}
// true when the options change nothing: the director draws as before voice-controls
export const isDefaultVoice = raw => { if (!raw) return true; const v = cleanVoice(raw); return v.phrases === '1' && v.kind === 'different' && v.ways === null && v.presence === 'style' && isQuietOnly(v.where) && v.vocab === 'style' && isAutoSound(v.sound); };
// the options as the director and the session recipe carry them: null when default (recipes stay as they were); Where
// and the vocabulary only when they are not the default, so recipes of before voice-full-controls stay the same
export function voiceOption(raw) {
  if (isDefaultVoice(raw)) return null;
  const { preset, where, vocab, sound, ...v } = cleanVoice(raw);
  return { ...v, ...(isQuietOnly(where) ? {} : { where }), ...(vocab !== 'style' ? { vocab } : {}), ...(isAutoSound(sound) ? {} : { sound }) };
}
