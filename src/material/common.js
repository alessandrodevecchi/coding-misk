// Shared helpers of the material generator (material-generator, #71): energy bands, harmony in degrees, cells.
// Pure and seeded: every draw comes from a stream of src/endless/random.js, none from an unseeded source.
import { PROGS, CHORDS, NOTE_NAMES, meterSteps } from '../music.js';
import { seqForm } from '../song/ideas.js';

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// energy 0 to 1 → band 0 (low), 1 (mid), 2 (high) (design D6)
export const band = e => (e < 0.33 ? 0 : e < 0.66 ? 1 : 2);
// melodic onsets per bar and degree span per band
export const ONSETS = [[2, 4], [4, 8], [6, 16]];
export const SPAN = [[2, 4], [4, 7], [7, 11]];

// semitones of each mode, from its root
export const MODE_STEPS = {
  minor: [0, 2, 3, 5, 7, 8, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], locrian: [0, 1, 3, 5, 6, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], ionian: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11],
};
export const modeSteps = mode => MODE_STEPS[mode] || MODE_STEPS.minor;
// dark modes favour the second and sixth degrees
export const DARK_MODES = ['phrygian', 'locrian', 'chromatic'];

// the harmony of a part: { key, mode, chords (a PROGS name or chord names written in A), shared } → chord names per bar
export function chordsOf(harmony = {}) {
  const c = harmony.chords;
  if (Array.isArray(c) && c.length) return c;
  return (PROGS[c] || PROGS.epica)[1];
}
// root of a chord name, in semitones from A (0 to 11)
export const rootOf = name => (NOTE_NAMES.indexOf(String(name).match(/^[A-G]#?/)[0]) - 9 + 12) % 12;
// the chord's notes in semitones from A (0 to 11), from our table, or root and fifth for other names
export const tonesOf = name => {
  const c = CHORDS[name];
  if (!c) return [rootOf(name), (rootOf(name) + 7) % 12];
  const midi = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); return { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  return [...new Set(c.arp.map(n => (midi(n) - 9 + 12) % 12))];
};
// a root in degrees of a mode, folded near 0 (F in A minor → -2), or null when the mode has no such degree
export function degreeOf(semi, mode) {
  if (mode === 'chromatic') return semi > 6 ? semi - 12 : semi;
  const d = modeSteps(mode).indexOf(((semi % 12) + 12) % 12);
  if (d < 0) return null;
  return d > 3 ? d - 7 : d;
}
// the chord roots of a progression as degrees, one per bar
export const rootDegrees = (chords, mode) => chords.map(c => degreeOf(rootOf(c), mode) ?? 0);

// an alternation of one item per bar with runs: [0, 0, 0, -2] → "<0!3 -2>"; one item alone when every bar is the same
export function altOf(items) {
  let p = items.length;
  for (let q = 1; q < items.length; q++) if (items.length % q === 0 && items.every((x, i) => x === items[i % q])) { p = q; break; }
  const list = items.slice(0, p);
  if (list.length === 1) return String(list[0]);
  const out = [];
  for (let i = 0; i < list.length;) { let j = i; while (j < list.length && list[j] === list[i]) j++; out.push(j - i > 1 ? `${list[i]}!${j - i}` : `${list[i]}`); i = j; }
  return `<${out.join(' ')}>`;
}
// a cell of tokens as mini-notation, its shortest exact form ("~" for rests)
export const cellText = tokens => seqForm(tokens.map(String));
// steps per bar and the bar's beats ([0, 4, 8, 12] in 4/4; [0, 4, 8, 12] and a half beat in 7/8)
export function meterOf(meter) {
  const N = meterSteps(meter || '4/4'), beats = [];
  for (let k = 0; k < N; k += 4) beats.push(k);
  return { N, beats };
}
// positions of k hits among n slots, spread like a euclidean rhythm and rotated by r
export function euclid(k, n, r = 0) {
  const out = [];
  for (let i = 0; i < n; i++) if ((i * k) % n < k) out.push((i + r) % n);
  return out.sort((a, b) => a - b);
}
// the number of notes of a mini-notation cell (numbers, not rests)
export const notesIn = text => (String(text).match(/-?\d+/g) || []).length;
