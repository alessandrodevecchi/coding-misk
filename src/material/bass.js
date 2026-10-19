// Basslines (material-generator D3): the roots of the section's chords with a rhythm cell of the style's family, an
// octave or fifth pattern as rhythm, or a shared progression of the song read two octaves down. Every note is the root
// or the fifth of its bar's chord (all chords of the app's table have a perfect fifth).
import { band, chordsOf, rootDegrees, cellText } from './common.js';

// rhythm families: a cell per beat (half: the cell of a half beat in 7/8), or a rhythm per bar; on: onsets in 4/4
export const BASS_FAMILIES = {
  half: [{ rhythm: 'x ~', on: 2 }, { rhythm: 'x ~ ~ x', on: 2 }],
  offbeat: [{ rhythm: '[~ x]', half: '~', on: 4 }],
  pulse: [{ rhythm: 'x', half: 'x', on: 4 }, { rhythm: '[x x]', half: 'x', on: 8 }],
  rolling: [{ rhythm: '[~ x x]', half: '[~ x]', on: 8 }, { rhythm: '[~ x x x]', half: '[~ x]', on: 12 }],
  gallop: [{ rhythm: '[x ~ x x]', half: '[x ~]', on: 12 }],
  sixteenths: [{ rhythm: '[x x x x]', half: '[x x]', on: 16 }],
};
export const BASS_RULES = [...Object.keys(BASS_FAMILIES), 'roots', 'octaves', 'fifths', 'shared'];
const ONSETS = [[1, 4], [4, 8], [8, 16]];
// semitones that keep a bass note on its chord: root, octave, fifth, fifth below
const OCTAVES = [0, 12], FIFTHS = [0, 7, 12, -5];

// the cells of the families a style allows that fit an energy band
export function bassCells(rules, b) {
  const fams = Object.keys(BASS_FAMILIES).filter(f => !rules.some(x => BASS_FAMILIES[x]) || rules.includes(f));
  const [lo, hi] = ONSETS[b];
  const all = fams.flatMap(f => BASS_FAMILIES[f].map(c => ({ ...c, family: f })));
  const fit = all.filter(c => c.on >= lo && c.on <= hi);
  return fit.length ? fit : all;
}
// the idea of a cell: per beat, or one bar
export const cellIdea = c => (c.half !== undefined ? { rhythm: c.rhythm, per: 'beat', half: c.half } : { rhythm: c.rhythm });

// a pattern of chord tones in semitones over the 8ths of a bar: "0 12", "[0 12]*4", "0 ~ 7 12" → text or null
export function toneLine(r, list, slots) {
  const len = r.pick([2, 4, slots].filter(n => slots % n === 0 && n <= slots));
  const tones = Array.from({ length: len }, (_, i) => (i === 0 ? 0 : r.pick([0, ...list.slice(1)])));
  if (tones.every(x => x === 0)) tones[len - 1] = list[1];
  return cellText(Array.from({ length: slots }, (_, i) => tones[i % len]));
}

// opts: { style, harmony { chords, mode, shared }, meter, energy } → { idea, why, stats }
export function bassline(r, { style = {}, harmony = {}, meter, energy = 0.5, N = 16 } = {}) {
  const b = band(energy), rules = style.rules || [], why = [];
  const cells = bassCells(rules, b), c = r.pick(cells);
  const pitch = r.weighted(['roots', 'octaves', 'fifths'], [b === 0 ? 3 : 1, rules.includes('octaves') ? 3 : b === 2 ? 2 : 1, rules.includes('fifths') ? 2 : b > 0 ? 1 : 0.2]);
  const idea = cellIdea(c);
  why.push(`${c.family} ${c.rhythm}`);
  // a shared progression of the song: the bass reads it with its own sub, so bass and lead change together
  const shared = harmony.shared || {}, name = Object.keys(shared).find(k => !/^[<[\s]*[A-G]/.test(shared[k]));
  if (name && (rules.includes('shared') || harmony.useShared)) {
    why.push(`reads ${name}, 3 octaves down`);
    return { idea: { from: name, sub: 21, ...idea, scale: harmony.mode && harmony.mode !== 'chromatic' ? harmony.mode : 'minor' }, why, stats: { onsets: c.on } };
  }
  if (pitch !== 'roots') {
    const add = toneLine(r, pitch === 'octaves' ? OCTAVES : FIFTHS, Math.max(2, Math.floor(N / 2)));
    idea.add = add;
    why.push(pitch === 'octaves' ? 'octaves as rhythm' : 'root, fifth and octave');
  } else why.push('chord roots');
  return { idea, why, stats: { onsets: c.on } };
}
// a shared progression of chord roots in degrees, for a song that declares one (null when a root is outside the mode)
export function sharedRoots(harmony) {
  const chords = chordsOf(harmony), degs = rootDegrees(chords, harmony.mode || 'minor');
  const exact = chords.every((ch, i) => degs[i] !== 0 || /^A(?!#)/.test(ch));
  if (!exact) return null;
  const out = [];
  for (let i = 0; i < degs.length;) { let j = i; while (j < degs.length && degs[j] === degs[i]) j++; out.push(j - i > 1 ? `${degs[i]}!${j - i}` : `${degs[i]}`); i = j; }
  return out.length > 1 ? `<${out.join(' ')}>` : out[0];
}
