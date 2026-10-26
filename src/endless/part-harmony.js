// Part harmony (radio-arrangement D8): how one part sits on the song's chords, as a new idea from the part's own. Pure.
//   thirds     a diatonic third up: scale degrees + 2 (a melody or a bass written in degrees), the next chord tone for
//              an arpeggio's indices
//   octave     an octave up, or down when the part already sits an octave up (semitones on notes, 7 degrees on degrees)
//   colour     the section's chords with a seventh (pads and guitars): Am7, Fmaj7, G7…
//   inversion  another inversion: a voiced chord anchored a third or a fifth higher, an arpeggio's indices rotated
// Every treatment stays in the song's key and chords: the part keeps its rhythm.
import { PROGS } from '../music.js';
import { chordSymbol } from '../song/ideas.js';

export const TREATMENTS = ['thirds', 'octave', 'colour', 'inversion'];
// the treatments a part may take, by type
const BY_TYPE = { hook: ['thirds', 'octave'], bass: ['thirds', 'octave'], arp: ['thirds', 'octave', 'inversion'], pad: ['octave', 'colour', 'inversion'], guitar: ['octave', 'colour', 'inversion'] };
const COLOUR = { Am: 'Am7', Dm: 'Dm7', Em: 'Em7', Bm: 'Bm7', F: 'Fmaj7', C: 'Cmaj7', G: 'G7', E: 'E7', D: 'D7', 'A#': 'A#maj7' };
const degreeIdea = idea => idea.degrees !== undefined || (idea.from !== undefined && !!idea.scale);
// numbers in a mini-notation text changed one by one (rests, brackets and the numbers after ! * @ % ( , stay)
const renumber = (text, f) => String(text).replace(/-?\d+(?![^(]*\))/g, (m, off, s) => (/[!*@%(,.]/.test(s[off - 1] || '') ? m : String(f(+m))));
const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const anchorUp = (a, semis) => { const m = /^([a-g])(#?)(\d)$/.exec(String(a || 'c4')); if (!m) return a; const v = (+m[3] + 1) * 12 + NOTE[m[1]] + (m[2] ? 1 : 0) + semis; return `${NAMES[v % 12]}${Math.floor(v / 12) - 1}`; };
// a numeric shift through add, else sub (as steering's register offsets)
function shiftBy(idea, n) {
  if (idea.add === undefined || typeof idea.add === 'number') return { ...idea, add: (idea.add || 0) + n };
  if (idea.sub === undefined || typeof idea.sub === 'number') return { ...idea, sub: (idea.sub || 0) - n };
  return null;
}
const upAlready = idea => (typeof idea.add === 'number' && idea.add >= (degreeIdea(idea) ? 7 : 12)) || (typeof idea.sub === 'number' && idea.sub <= -(degreeIdea(idea) ? 7 : 12));

// The new idea of a treatment, or null when the part cannot take it. chords: the section's progression (a PROGS name
// or chord names), for colour.
export function treat(type, idea, treatment, { chords = null } = {}) {
  if (!idea || !(BY_TYPE[type] || []).includes(treatment)) return null;
  const deg = degreeIdea(idea), index = type === 'arp' && idea.index !== undefined && !idea.random;
  if (treatment === 'thirds') {
    if (deg) return shiftBy(idea, 2);
    if (index) return { ...idea, index: renumber(idea.index, i => (i + 1) % 4) };
    return null;
  }
  if (treatment === 'octave') {
    const n = deg ? 7 : 12;
    return shiftBy(idea, upAlready(idea) || type === 'hook' && (typeof idea.add === 'number' && idea.add > 0) ? -n : n);
  }
  if (treatment === 'colour') {
    const names = idea.chords !== undefined ? null : (PROGS[chords] ? PROGS[chords][1] : Array.isArray(chords) ? chords : null);
    if (!names || !names.length) return null;
    const coloured = names.map(c => chordSymbol(COLOUR[c] || c));
    if (coloured.every((c, i) => c === names[i])) return null;
    return { ...idea, chords: `<${coloured.join(' ')}>`, voicing: { anchor: 'c4', ...(idea.voicing || {}) } };
  }
  if (treatment === 'inversion') {
    if (index) return { ...idea, index: renumber(idea.index, i => (i + 2) % 4) };
    if (type === 'arp') return null;
    const v = idea.voicing || {};
    return { ...idea, voicing: { ...v, anchor: anchorUp(v.anchor || 'c4', v.anchor && /^[e]/.test(v.anchor) ? 3 : 4) } };
  }
  return null;
}
// the treatments a part can take now (those that give a new idea)
export const treatmentsFor = (type, idea, o = {}) => TREATMENTS.filter(x => treat(type, idea, x, o));
