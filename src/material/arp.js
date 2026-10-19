// Arpeggios (material-generator D4): indices into the voiced chords of the section, as a written cell (up, up and
// down, pedal, skips) or a seeded random source. Every index is a chord tone, so random indices stay in the harmony.
import { band, meterOf, cellText } from './common.js';

export const ARP_RULES = ['up', 'updown', 'pedal', 'skips', 'random'];
// the four notes of a chord stack (CHORDS[c].arp), from low to high
const NOTES = 4;
const SHAPES = {
  up: [[0, 1, 2, 3], [0, 1, 2], [0, 1, 2, 3, 0, 1, 2]],
  updown: [[0, 1, 2, 3, 2, 1], [0, 2, 3, 2], [0, 1, 2, 1]],
  pedal: [[0, 3, 0, 2], [0, 2, 0, 1, 0, 3], [0, 3, 0, 2, 0, 1]],
  skips: [[0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2, 0]],
};
// the index text of a cell over `slots` steps per bar: "[0 1 2 3]*4", or a polymeter "{0 1 2}%16"
export function indexText(cell, slots) {
  const c = cellText(cell);
  if (cell.length === slots) return c;
  if (slots % cell.length === 0) return `[${c}]*${slots / cell.length}`;
  return `{${cell.join(' ')}}%${slots}`;
}

// how varied each shape of cell is (radio-variation D3): more complexity, more skips and turns
const VARIETY = { up: 0, pedal: 0.3, updown: 0.6, skips: 1 };
// opts: { style, meter, energy, shape } → { idea, why, stats }
// shape (radio-variation D3): density gives the band (sparse, 8ths, 16ths), complexity favours varied cells and random
// indices, a high register plays an octave up
export function arpeggio(r, { style = {}, meter, energy = 0.5, shape: sh = null } = {}) {
  const { N } = meterOf(meter), b = sh ? band(sh.density) : band(energy), why = [];
  const rules = (style.rules || ARP_RULES).filter(x => ARP_RULES.includes(x));
  const shapes = rules.filter(x => SHAPES[x]), list = shapes.length ? shapes : Object.keys(SHAPES);
  const shape = sh ? r.weighted(list, list.map(x => 0.2 + 1.6 * (1 - Math.abs(VARIETY[x] - sh.complexity)))) : r.pick(list);
  let cell = r.pick(SHAPES[shape]).slice();
  // the seed moves the cell: another start, or two notes swapped
  if (r.chance(0.5)) { const k = r.int(1, cell.length - 1); cell = [...cell.slice(k), ...cell.slice(0, k)]; }
  if (r.chance(0.3)) { const i = r.int(0, cell.length - 1), j = r.int(0, cell.length - 1); [cell[i], cell[j]] = [cell[j], cell[i]]; }
  const randomOk = rules.includes('random') && b > 0, seed = r.int(0, 999), cycles = r.pick([1, 2, 4]);
  const slots = b === 2 ? N : N / 2;
  const up = sh && sh.register >= 0.75 ? { add: 12 } : {};
  if (sh && up.add) why.push('an octave up');
  if (randomOk && r.chance(sh ? 0.1 + 0.4 * sh.complexity : 0.25 + 0.2 * energy)) {
    why.push(`random indices seed ${seed}, ${cycles} bar${cycles > 1 ? 's' : ''}`);
    return { idea: { random: { fn: 'irand', max: NOTES, seg: slots, seed, cycles }, ...up }, why, stats: { onsets: slots } };
  }
  let tokens = cell, onsets = slots;
  if (b === 0) {
    // sparse: two to four notes in the 8ths of the bar, in the cell's order
    const k = r.int(2, 4), at = new Set([0]);
    while (at.size < k) at.add(r.int(1, slots - 1));
    let n = 0;
    tokens = Array.from({ length: slots }, (_, i) => (at.has(i) ? cell[n++ % cell.length] : '~'));
    onsets = k;
    why.push(`${shape} sparse`);
  } else {
    if (b === 2 && r.chance(0.3)) { const i = r.int(1, cell.length - 1); tokens = cell.map((x, j) => (j === i ? '~' : x)); onsets = Math.round((slots * (cell.length - 1)) / cell.length); }
    why.push(`${shape} ${cell.length}${slots % cell.length ? ` over ${slots}` : ''}`);
  }
  return { idea: { index: b === 0 ? cellText(tokens) : indexText(tokens, slots), ...up }, why, stats: { onsets } };
}
