// Voice instrument options (voice-controls, #77): how many phrases a generated song speaks, whether they are different
// or one line repeated, the ways they may use, and in the radio how often a song gets a voice instrument. Presets set
// them together; the default (As the style) is the director's behaviour before voice-controls, so its songs do not
// change. Pure: the radio, Compose and the Node checks read the same options.
export const VOICE_PHRASES = ['1', '2-3', '4-5', '6-8', 'many'];
// the range each choice draws from ("many": up to 12)
export const PHRASE_RANGES = { 1: [1, 1], '2-3': [2, 3], '4-5': [4, 5], '6-8': [6, 8], many: [9, 12] };
export const VOICE_KINDS = ['different', 'repeated', 'mixed'];
export const VOICE_WAYS = ['opening', 'refrain', 'chop', 'passage'];
// never; as the style says (its weight as the chance); often (the style's weight × 2, at most 0.9); always (a single
// generated song with the voice instrument on: every song gets one, also when the style has none)
export const VOICE_PRESENCE = ['never', 'style', 'often', 'always'];
export const RADIO_PRESENCE = ['never', 'style', 'often'];
export const SONG_PRESENCE = ['style', 'always', 'never'];
// ways null: the style's own ways and weights; a list: those ways, each as likely
export const VOICE_DEFAULT = { preset: 'style', phrases: '1', kind: 'different', ways: null, presence: 'style' };
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
  };
  return { preset: presetOf(out), ...out };
}
// the preset the options amount to: a preset's name when they match it (presence aside for a single song), else custom
export function presetOf(v, { presence = true } = {}) {
  const hit = VOICE_PRESET_IDS.find(id => { const p = VOICE_PRESETS[id]; return p.phrases === v.phrases && p.kind === v.kind && sameWays(p.ways, v.ways) && (!presence || p.presence === v.presence); });
  return hit || 'custom';
}
// a preset applied: its controls (a single song keeps its own presence)
export function applyPreset(id, cur = VOICE_DEFAULT, { presence = true } = {}) {
  const p = VOICE_PRESETS[id];
  if (!p) return cleanVoice(cur);
  const out = { ...p, ways: p.ways ? [...p.ways] : null, presence: presence ? p.presence : cur.presence };
  return { ...out, preset: id };
}
// true when the options change nothing: the director draws as before voice-controls
export const isDefaultVoice = raw => { if (!raw) return true; const v = cleanVoice(raw); return v.phrases === '1' && v.kind === 'different' && v.ways === null && v.presence === 'style'; };
// the options as the director and the session recipe carry them: null when default (recipes stay as they were)
export function voiceOption(raw) {
  if (isDefaultVoice(raw)) return null;
  const { preset, ...v } = cleanVoice(raw);
  return v;
}
