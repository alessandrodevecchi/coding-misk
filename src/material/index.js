// The material generator (material-generator, #71; docs/ENDLESS.md "Material"): composes melodies, basslines,
// arpeggios, chords and progressions, drum grooves and sounds from a seed, a style and an energy value, as ideas of the
// song format (idea-model). Pure and seeded: the same inputs give the same part in Node and in the browser.
//
//   compose(kind, { seed, style, harmony, meter, energy, from, keep, type }) → { idea, settings, rack, why, stats }
//
// kind: melody, bass, arp, chords, drums, sound. style: the recipe instrument's `material` ({ rules, families, sounds }).
// harmony: { key, mode, chords (a PROGS name or chord names in A), shared }. energy: 0 to 1. from + keep: vary a preset
// ('rhythm' keeps its onsets, 'notes' its pitches). Each kind draws from its own stream, "material:<kind>" of the seed.
import { stream } from '../endless/random.js';
import { meterSteps } from '../music.js';
import { melody, MELODY_RULES } from './melody.js';
import { bassline, BASS_RULES, sharedRoots } from './bass.js';
import { arpeggio, ARP_RULES } from './arp.js';
import { chords, CHORD_RULES, modeProgression } from './chords.js';
import { groove, FAMILIES } from './drums.js';
import { sound, SOUND_KINDS, FM_RANGES, fmInRange } from './sound.js';
import { varyPreset, VARY_TYPES, presetOf } from './vary.js';

export const KINDS = ['melody', 'bass', 'arp', 'chords', 'drums', 'sound'];
// the kind of part a track type gets
export const KIND_OF_TYPE = { hook: 'melody', bass: 'bass', arp: 'arp', pad: 'chords', guitar: 'chords', drums: 'drums' };
export const MATERIAL_TYPES = Object.keys(KIND_OF_TYPE);
// a recipe instrument's source, and a session's source (design, "Material source")
export const SOURCES = ['preset', 'generated', 'mix'];
export const SESSION_SOURCES = ['patterns', 'varied', 'composed', 'mix'];
export const RULES = { melody: MELODY_RULES, bass: BASS_RULES, arp: ARP_RULES, chords: CHORD_RULES };
export { FAMILIES, SOUND_KINDS, FM_RANGES, fmInRange, sharedRoots, modeProgression, VARY_TYPES, presetOf };

// the random stream of a kind for a seed: a melody never changes the drums of the same seed
export const materialStream = (seed, kind) => stream(String(seed), `material:${kind}`);

export function compose(kind, opts = {}) {
  const { seed = '', style = {}, harmony = {}, meter = '4/4', energy = 0.5, from = null, keep = null } = opts;
  const e = Math.max(0, Math.min(1, Number(energy) || 0)), N = meterSteps(meter);
  const r = materialStream(seed, from ? `${kind}/${from}/${keep || 'rhythm'}` : kind);
  const type = opts.type || Object.keys(KIND_OF_TYPE).find(t => KIND_OF_TYPE[t] === kind) || 'hook';
  if (!KINDS.includes(kind)) throw new Error(`unknown kind of part "${kind}"; kinds: ${KINDS.join(', ')}`);
  if (from) {
    const v = varyPreset(r, { type, from, keep: keep || 'rhythm', energy: e, harmony, N });
    if (!v) return null;
    return { idea: v.idea, why: v.why, stats: {} };
  }
  const o = { style: style || {}, harmony: harmony || {}, meter, energy: e, N, type };
  if (kind === 'melody') return melody(r, o);
  if (kind === 'bass') return bassline(r, o);
  if (kind === 'arp') return arpeggio(r, o);
  if (kind === 'chords') return chords(r, o);
  if (kind === 'drums') return groove(r, o);
  const s = sound(r, { ...o, octave: opts.octave });
  return { idea: null, settings: s.settings, rack: s.rack, why: s.why, stats: {} };
}
