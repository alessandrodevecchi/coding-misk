// Chords and progressions (material-generator D4): a pad voices the section's chords with voicing(), or a new
// progression built on the degrees of the mode (1 to 4 different chords a phrase, the last one leading back); a guitar
// plays power chords with a rhythm cell and, with more energy, a riff of dark steps over them.
import { band, meterOf, modeSteps, cellText, altOf } from './common.js';
import { NOTE_NAMES } from '../music.js';
import { BASS_FAMILIES, cellIdea } from './bass.js';

export const CHORD_RULES = ['style', 'mode', 'sevenths', 'power'];
// pad register: voicings below c4 sit where the app's pads play (a2 to e3), above the bass
export const PAD_ANCHOR = 'c4';
const PAD_RHYTHMS = [[null], [{ rhythm: '[~ x]', half: '~', on: 4 }, { rhythm: 'x ~ ~ x ~ ~ x ~', on: 3 }], [{ rhythm: '[x x]', half: 'x', on: 8 }, { rhythm: '[~ x x]', half: '[~ x]', on: 8 }]];
// guitar riffs: semitones over the power chord (0 the chord, 1 the flat second, 3, 5, -2 below)
const RIFF_STEPS = [0, 0, 0, 1, 3, 5, -2, 7];

// the quality of the triad on a degree of a mode: 'm', '' or null (diminished, left out)
function triad(steps, d) {
  const at = k => steps[(d + k) % 7] + 12 * Math.floor((d + k) / 7);
  const third = at(2) - at(0), fifth = at(4) - at(0);
  if (fifth !== 7) return null;
  return third === 3 ? 'm' : third === 4 ? '' : null;
}
// a chord name written in A: root semitones from A, quality
const nameOf = (semi, q) => NOTE_NAMES[(9 + semi) % 12] + q;

// a new progression on the degrees of a mode: 4 bars, 1 to 4 different chords, the last one leading back to the first
export function modeProgression(r, mode = 'minor', { sevenths = false } = {}) {
  const steps = modeSteps(mode === 'chromatic' ? 'phrygian' : mode);
  const degs = [0, 1, 2, 3, 4, 5, 6].filter(d => triad(steps, d) !== null);
  const k = r.int(1, Math.min(4, degs.length));
  const pool = r.shuffle(degs.filter(d => d !== 0)).slice(0, k - 1);
  // leading back: the fifth, the seventh or (phrygian) the flat second, when the mode has it as a chord
  const lead = [4, 6, 1].find(d => pool.includes(d));
  const order = [0, ...pool.filter(d => d !== lead), ...(lead !== undefined ? [lead] : [])];
  const bars = order.length === 1 ? [0, 0, 0, 0] : order.length === 2 ? [order[0], order[0], order[1], order[1]] : order.length === 3 ? [order[0], order[1], order[2], order[2]] : order;
  const q = d => { const t = triad(steps, d); return sevenths && t === 'm' ? 'm7' : sevenths && d === 0 && t === '' ? '^7' : t; };
  const names = bars.map(d => nameOf(steps[d], q(d)));
  return { names, text: altOf(names), different: new Set(names).size };
}

// pad anchors by register (radio-variation D3): lower, the usual, higher
const PAD_ANCHORS = ['a3', PAD_ANCHOR, 'e4'];
// opts: { style, harmony { mode }, meter, energy, type: 'pad' | 'guitar', shape } → { idea, why, stats }
// shape (radio-variation D3): density gives the band of the rhythm, register the pad's anchor, complexity the chance of
// another voicing mode (the top note above the anchor, or the anchor left out)
export function chords(r, { style = {}, harmony = {}, meter, energy = 0.5, type = 'pad', shape = null } = {}) {
  const { N } = meterOf(meter), b = shape ? band(shape.density) : band(energy), rules = style.rules || [], why = [];
  if (type === 'guitar') {
    // power chords with a cell of the bass families, and a riff over them with more energy
    const fams = b === 0 ? ['half', 'pulse'] : b === 1 ? ['pulse', 'offbeat', 'rolling'] : ['gallop', 'sixteenths', 'rolling'];
    const cells = fams.flatMap(f => BASS_FAMILIES[f]).filter(c => (b === 0 ? c.on <= 4 : b === 1 ? c.on >= 3 && c.on <= 8 : c.on >= 8));
    const c = r.pick(cells);
    if (b > 0 && r.chance(0.5)) {
      // a riff: 16th slots, rests and steps of the power chord
      const hits = Array.from({ length: N }, (_, i) => (i === 0 || r.chance(b === 2 ? 0.6 : 0.4) ? 'x' : '~'));
      const add = hits.map((h, i) => (h === '~' || i === 0 ? '0' : String(r.pick(RIFF_STEPS))));
      if (add.every(x => x === '0')) add[N - 4 > 0 ? N - 4 : 0] = '1';
      hits[N - 4 > 0 ? N - 4 : 0] = 'x';
      why.push('power chord riff');
      return { idea: { rhythm: hits.join(' '), add: add.join(' '), per: 'slot' }, why, stats: { onsets: hits.filter(x => x === 'x').length } };
    }
    why.push(`power chords ${c.rhythm}`);
    return { idea: cellIdea(c), why, stats: { onsets: c.on } };
  }
  const idea = { voicing: { anchor: shape ? PAD_ANCHORS[band(shape.register)] : PAD_ANCHOR } };
  if (rules.includes('mode')) {
    const p = modeProgression(r, harmony.mode, { sevenths: rules.includes('sevenths') });
    idea.chords = p.text;
    why.push(`progression on ${harmony.mode || 'minor'}: ${p.names.join(' ')}`);
  } else why.push("the section's chords, voiced");
  if (shape && r.chance(shape.complexity)) idea.voicing.mode = r.pick(['above', 'duck']);
  const rh = r.pick(PAD_RHYTHMS[b]);
  if (rh) { Object.assign(idea, cellIdea(rh)); why.push(`stabs ${rh.rhythm}`); } else why.push('held');
  return { idea, why, stats: { onsets: rh ? rh.on : 1 } };
}
