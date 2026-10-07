// Mutation operators of the endless director (docs/ENDLESS.md, "Material").
// They vary recipe material while keeping it in key: bass and arp notes stay chord tones (0 to 3),
// hook notes stay scale degrees (whole numbers), drums keep the downbeat kicks and the backbeat.
// `amount` is the complexity (0 to 1): 0 changes nothing.
import { BASS, ARPS, HOOKS } from '../music.js';

const ops = (amount, max) => amount <= 0 ? 0 : 1 + Math.round(amount * (max - 1));

// Drums: toggle hits on off-beats and ghost positions only.
const KEEP = { bd: [0, 4, 8, 12], sd: [4, 12], cp: [4, 12] };
const GHOST = { bd: [3, 6, 7, 10, 11, 14, 15], sd: [7, 10, 14, 15], cp: [7, 15], hh: [1, 3, 5, 7, 9, 11, 13, 15], oh: [2, 6, 10, 14], rd: [2, 6, 10, 14] };
export function mutateRows(rows, amount, rng) {
  const out = { ...rows };
  const ids = Object.keys(out).filter(id => GHOST[id]);
  for (let i = 0; i < ops(amount, 5) && ids.length; i++) {
    const id = rng.pick(ids), s = out[id].split(''), pos = rng.pick(GHOST[id]).toString();
    const p = +pos % s.length;
    if ((KEEP[id] || []).includes(p)) continue;
    s[p] = s[p] === 'x' ? '.' : 'x';
    if (s.includes('x')) out[id] = s.join('');
  }
  return out;
}

// Bass preset rhythm → 16 chord-tone tokens ("0" plays the root, "~" rests).
const BEAT_16 = { 'x': 'x ~ ~ ~', '[x x]': 'x ~ x ~', '[~ x]': '~ ~ x ~', '[x x x x]': 'x x x x', '[~ x x x]': '~ x x x', '[~ x x]': '~ x ~ x', '[x ~ x x]': 'x ~ x x', '[x ~]': 'x ~ ~ ~', '~': '~ ~ ~ ~' };
export function bassTokens(preset) {
  const p = BASS[preset];
  if (!p || !p[1]) return null; // riffs (semitones) are not chord tones: keep them as they are
  if (p[1] === 'x') return ['0', ...Array(15).fill('~')];
  const beat = BEAT_16[p[1][0]];
  if (!beat) return null;
  return Array(4).fill(beat).join(' ').split(' ').map(t => (t === 'x' ? '0' : '~'));
}
// Bass: move some notes from the root to another chord tone (fifth, top note, third).
export function mutateBass(preset, amount, rng) {
  const toks = bassTokens(preset);
  if (!toks || amount <= 0) return null;
  const hits = toks.map((t, i) => (t !== '~' && i % 4 ? i : -1)).filter(i => i >= 0);
  for (let i = 0; i < ops(amount, 4) && hits.length; i++) toks[rng.pick(hits)] = rng.pick(['2', '2', '3', '1']);
  return toks.join(' ');
}

// Arp: swap chord tones or replace one with another chord tone; brackets stay.
export function mutateArp(preset, amount, rng) {
  if (amount <= 0 || !ARPS[preset]) return null;
  const s = ARPS[preset][1].split('');
  const digits = s.map((c, i) => (/[0-3]/.test(c) ? i : -1)).filter(i => i >= 0);
  for (let i = 0; i < ops(amount, 4); i++) {
    const a = rng.pick(digits);
    if (rng.chance(0.5)) { const b = rng.pick(digits); [s[a], s[b]] = [s[b], s[a]]; } else s[a] = String(rng.int(0, 3));
  }
  return s.join('');
}

// Hook: move a few scale degrees to a neighbour, or repeat one bar of a "<…>" melody in place of another.
export function mutateHook(preset, amount, rng) {
  if (amount <= 0 || !HOOKS[preset]) return null;
  let notes = HOOKS[preset][1];
  for (let i = 0; i < ops(amount, 4); i++) {
    const bars = notes.startsWith('<') ? notes.slice(1, -1).match(/\[[^\]]*\]/g) : null;
    if (bars && bars.length > 1 && rng.chance(0.25)) {
      const from = rng.int(0, bars.length - 1), to = rng.int(0, bars.length - 1);
      bars[to] = bars[from];
      notes = `<${bars.join(' ')}>`;
      continue;
    }
    const nums = [...notes.matchAll(/-?\d+/g)];
    if (!nums.length) break;
    const m = rng.pick(nums), v = +m[0] + rng.pick([-1, 1]);
    notes = notes.slice(0, m.index) + v + notes.slice(m.index + m[0].length);
  }
  return notes;
}

// checks used by the director tests
export const chordTonesOnly = notes => !/[4-9]|-/.test(notes.replace(/[\s~[\]<>]/g, ''));
export const degreesOnly = notes => notes.replace(/[\s~[\]<>]/g, ' ').trim().split(/\s+/).filter(Boolean).every(x => /^-?\d+$/.test(x));
