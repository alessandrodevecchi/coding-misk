// Varying a preset (material-generator D8): keep its rhythm and compose new pitches, or keep its pitches and compose
// a new rhythm. The preset is read through its idea (idea-model), so the result is an idea too.
import { BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS } from '../music.js';
import { topTokens, altItems } from '../song/ideas.js';
import { band, SPAN, cellText } from './common.js';
import { walk } from './melody.js';
import { bassCells, cellIdea, toneLine } from './bass.js';

export const VARY_TYPES = ['bass', 'arp', 'hook', 'pad', 'guitar'];
const TABLE = { bass: BASS, arp: ARPS, hook: HOOKS, pad: PADS, guitar: GUITAR_PATTERNS };
export const presetOf = (type, name) => (TABLE[type] && TABLE[type][name] ? TABLE[type][name].idea : null);
const isNum = x => /^-?\d+$/.test(x);
const words = text => String(text).split(/\s+/).filter(Boolean);

// a text with each number replaced in turn (brackets, rests and repeats stay)
const renumber = (text, next) => String(text).replace(/-?\d+(?![^(]*\))/g, (m, off, s) => (/[!*@%(,]/.test(s[off - 1] || '') ? m : String(next(+m))));
// a new rhythm for the tokens of a slot line: the same notes in their order, on other slots
function moveNotes(r, tokens, b) {
  // every note once, in its order; a line that fills every slot gets two or three rests and plays its first notes
  // (b, the energy band, is kept for a later density rule)
  const notes = tokens.filter(x => x !== '~' && x !== '-'), n = tokens.length, k = notes.length >= n ? n - r.int(2, 3) : notes.length;
  for (let t = 0; t < 8; t++) {
    const at = new Set([0]);
    while (at.size < Math.min(k, n)) at.add(r.int(1, n - 1));
    let i = 0;
    const out = Array.from({ length: n }, (_, j) => (at.has(j) ? notes[i++ % notes.length] : '~'));
    if (out.join(' ') !== tokens.join(' ')) return out;
  }
  return [...tokens.slice(1), tokens[0]];
}

// opts: { type, from (preset name), keep: 'rhythm' | 'notes', energy, meter, harmony } → { idea, why } or null
export function varyPreset(r, { type, from, keep = 'rhythm', energy = 0.5, harmony = {}, N = 16 } = {}) {
  const base = presetOf(type, from);
  if (!base) return null;
  const b = band(energy), why = [`from ${from}`, keep === 'rhythm' ? 'keeps its rhythm' : 'keeps its notes'];
  if (type === 'hook') {
    const dark = ['phrygian', 'locrian'].includes(harmony.mode);
    if (keep === 'rhythm') {
      // the same rests and onsets, new degrees walking in the energy's span
      const count = (String(base.degrees).match(/-?\d+/g) || []).length, [s0, s1] = SPAN[b], span = r.int(s0, s1), lo = -r.int(0, Math.floor(span / 2));
      for (let t = 0; t < 6; t++) {
        const notes = walk(r, count, { lo, hi: lo + span, dark });
        let i = 0;
        const degrees = renumber(base.degrees, () => notes[i++]);
        if (degrees !== base.degrees) return { idea: { degrees, per: 'slot' }, why };
      }
      return null;
    }
    // the same degrees in their order, other slots
    const items = altItems(base.degrees) || [base.degrees];
    const out = items.map(it => `[${moveNotes(r, topTokens(it.replace(/^\[(.*)\]$/, '$1')), b).join(' ')}]`);
    return { idea: { degrees: out.length > 1 ? `<${out.join(' ')}>` : out[0].slice(1, -1), per: 'slot' }, why };
  }
  if (type === 'arp') {
    if (keep === 'rhythm') {
      // the onsets of the preset with new chord indices
      for (let t = 0; t < 6; t++) {
        const index = renumber(base.index, () => r.int(0, 3));
        if (index !== base.index) return { idea: { index, per: 'slot' }, why };
      }
      return null;
    }
    const toks = topTokens(base.index);
    if (toks.some(x => !isNum(x))) return { idea: { index: cellText(moveNotes(r, toks.map(x => (isNum(x) ? x : x.replace(/[[\]]/g, '').split(' ')[0])), b)), per: 'slot' }, why };
    return { idea: { index: moveNotes(r, toks, b).join(' '), per: 'slot' }, why };
  }
  if (type === 'bass' || type === 'guitar') {
    if (keep === 'rhythm') {
      // the onsets of the preset, new chord tones (root, fifth, octave) as a line over them
      const { add, ...rhythm } = base;
      if (base.per === 'slot' && base.rhythm) {
        const hits = words(base.rhythm), tones = type === 'bass' ? [0, 12, 7, -5] : [0, 1, 3, 5, -2];
        for (let t = 0; t < 6; t++) {
          const line = hits.map((h, i) => (h === 'x' && i > 0 ? String(r.pick(tones)) : '0'));
          const text = line.join(' ');
          if (text !== add && line.some(x => x !== '0')) return { idea: { ...rhythm, add: text }, why };
        }
        return null;
      }
      if (!base.rhythm && !base.hold) return null;
      if (base.hold) return { idea: { ...base, add: toneLine(r, [0, 12, 7], 2) }, why };
      return { idea: { ...rhythm, add: toneLine(r, [0, 12, 7, -5], Math.max(2, Math.floor(N / 2))) }, why };
    }
    // the same notes on a new rhythm: a riff keeps its line of semitones in order, a root line takes another cell
    if (base.per === 'slot' && typeof base.add === 'string') {
      const hits = words(base.rhythm), vals = words(base.add).filter((_, i) => hits[i] === 'x');
      const moved = moveNotes(r, hits.map((h, i) => (h === 'x' ? vals[hits.slice(0, i).filter(x => x === 'x').length] : '~')), b);
      return { idea: { rhythm: moved.map(x => (x === '~' ? '~' : 'x')).join(' '), add: moved.map(x => (x === '~' ? '0' : x)).join(' '), per: 'slot' }, why };
    }
    const cells = bassCells([], b).filter(c => JSON.stringify(cellIdea(c)) !== JSON.stringify({ rhythm: base.rhythm, per: base.per, half: base.half }));
    return cells.length ? { idea: cellIdea(r.pick(cells)), why } : null;
  }
  if (type === 'pad') {
    // keep the rhythm with voiced chords, or keep the chords with a new rhythm
    if (keep === 'rhythm') return { idea: { ...base, voicing: { anchor: 'c4' } }, why };
    const cells = bassCells(['pulse', 'offbeat', 'half'], b).filter(c => c.rhythm !== base.rhythm);
    return cells.length ? { idea: cellIdea(r.pick(cells)), why } : null;
  }
  return null;
}
