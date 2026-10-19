// Material of the director's tracks (material-generator D10, docs/ENDLESS.md "Material"): where each track's patterns
// come from in one song (presets, varied presets, composed parts, the user's saved patterns), and the composed parts
// themselves. Every draw comes from the "material" streams of the session seed, so titles, comments, voice and the
// plan keep their draws; at complexity 0 nothing here runs and the songs stay as the presets give them.
import { stream } from './random.js';
import { compose, KIND_OF_TYPE, SESSION_SOURCES } from '../material/index.js';

// the part of a song that gives each track type (mix.js parts)
const PART_OF = { drums: 'drums', bass: 'bass', arp: 'lead', hook: 'lead', pad: 'pads', guitar: 'pads' };
export const sessionSource = opts => (SESSION_SOURCES.includes(opts && opts.material) ? opts.material : 'mix');
// what one track plays in one song: 'preset', 'varied' or 'generated'
export function trackSource(part, complexity, source, r) {
  if (source === 'composed') return 'generated';
  if (source === 'patterns' || !(complexity > 0)) return 'preset';
  if (source === 'varied') return 'varied';
  const m = part && part.material;
  if (!m || !m.source || m.source === 'preset') return 'preset';
  if (m.source === 'generated') return 'generated';
  return r.chance(m.share ?? 0.5) ? 'generated' : 'preset';
}
// a saved pattern fits a track: same type, a style tag of the song's part (or "any"), a key the song can move it to
export function fitsTrack(p, { type, styles = [] }) {
  if (!p || !p.pattern || p.type !== type) return false;
  const tags = p.styles || (p.tags && p.tags.styles) || [];
  if (!tags.includes('any') && !tags.some(s => styles.includes(s))) return false;
  // parts are written in A and moved to the song key; a hook in the chromatic mode keeps its own mode
  return !(type === 'hook' && p.context && p.context.mode === 'chromatic' && p.idea && !p.idea.degrees);
}
export const userPool = (list, want) => (Array.isArray(list) ? list : []).filter(p => fitsTrack(p, want));
// energies of the patterns of a track: A at the phrase where the part usually first plays (its place in the entry order),
// B at the song's next big moment (or its quietest phrase when A is already the peak), C at the quietest phrase
export function patternEnergies(targets, rank) {
  const t = targets.length ? targets : [0.5], A = t[Math.min(t.length - 1, Math.floor(rank / 2))];
  const hi = Math.max(...t), lo = Math.min(...t);
  return { A, B: hi - A > 0.05 ? hi : lo, C: lo };
}

// Gives the tracks of a song their material. M: { seed, index, key, chords, meter, targets, parts, entry (the entry
// order of track types) }. Returns the tracks (changed in place).
export function applyMaterial(tracks, R, complexity, opts, M) {
  const source = sessionSource(opts), order = tracks.slice().sort((a, b) => M.entry.indexOf(a.type) - M.entry.indexOf(b.type));
  const drums = tracks.filter(t => t.type === 'drums');
  let groove = null;
  const used = {};
  for (const t of tracks) {
    const kind = KIND_OF_TYPE[t.type];
    if (!kind) continue;
    const part = R[t.type], key = t.type === 'drums' ? 'drums' : t.id, r = stream(M.seed, `material/${M.index}/${key}`);
    const styles = [M.parts && M.parts[PART_OF[t.type]]].filter(Boolean);
    // the user's saved patterns join the pool where they fit (not for composed sessions)
    const pool = complexity > 0 && source !== 'composed' ? userPool(opts.userPatterns, { type: t.type, styles }) : [];
    if (pool.length && r.chance(0.3)) { t.patterns = { ...t.patterns, A: JSON.parse(JSON.stringify(r.pick(pool).pattern)) }; used[t.id] = 'user'; continue; }
    const how = trackSource(part, complexity, source, r);
    if (how === 'preset') continue;
    const E = patternEnergies(M.targets, order.indexOf(t)), seed = `${M.seed}:${M.index}:${key}`;
    const harmony = { key: M.key, mode: (t.settings && t.settings.mode) || 'minor', chords: M.chords };
    const style = (part && part.material) || {};
    if (how === 'varied') {
      // presets with variations: one pattern keeps the rhythm or the notes of the preset and changes the rest
      const base = t.patterns.A || {};
      if (!base.preset) continue;
      const keep = r.pick(['rhythm', 'notes']), v = compose(kind, { seed, type: t.type, from: base.preset, keep, harmony, meter: M.meter, energy: E.B });
      if (v) t.patterns = { ...t.patterns, [t.patterns.B && r.chance(0.5) ? 'C' : 'B']: { ...(base.speed ? { speed: base.speed } : {}), idea: v.idea } };
      if (v && r.chance(complexity * 0.5)) { const w = compose(kind, { seed: `${seed}:A`, type: t.type, from: base.preset, keep: keep === 'rhythm' ? 'notes' : 'rhythm', harmony, meter: M.meter, energy: E.A }); if (w) t.patterns.A = { ...(base.speed ? { speed: base.speed } : {}), idea: w.idea }; }
      used[t.id] = 'varied';
      continue;
    }
    const make = e => compose(kind, { seed, style, harmony, meter: M.meter, energy: e, type: t.type });
    if (t.type === 'drums') {
      // one groove for the kick and the beat tracks: the kick takes bd, the beat the other rows
      groove = groove || { A: make(E.A), B: make(E.B), C: make(E.C) };
      const hasKick = drums.some(d => d.id === 'kick');
      const split = g => { const { grid, bd, ...rest } = g.idea.beat; return { idea: { beat: t.id === 'kick' ? { grid, bd } : hasKick ? { grid, ...rest } : g.idea.beat } }; };
      t.patterns = { A: split(groove.A), ...(same(groove.B, groove.A) ? {} : { B: split(groove.B) }), ...(complexity > 0.6 && !same(groove.C, groove.A) && !same(groove.C, groove.B) ? { C: split(groove.C) } : {}) };
      used[t.id] = 'generated';
      continue;
    }
    const A = make(E.A), B = make(E.B), C = complexity > 0.6 ? make(E.C) : null;
    t.patterns = { A: { idea: A.idea }, ...(same(B.idea, A.idea) ? {} : { B: { idea: B.idea } }), ...(C && !same(C.idea, A.idea) && !same(C.idea, B.idea) ? { C: { idea: C.idea } } : {}) };
    used[t.id] = 'generated';
    // a generated sound when the recipe names sound kinds
    if (style.sounds && style.sounds.length) {
      const s = compose('sound', { seed, style, type: t.type, energy: E.A, octave: t.settings && t.settings.octave });
      t.settings = { ...t.settings, ...s.settings };
      if (s.rack.length) t.rack = [...(t.rack || []), ...s.rack];
    }
  }
  return used;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- material composed on air (radio-variation, docs/ENDLESS.md "Steering") ----------

// whether steering composes new tracks (Add, More complex): not for the session source "patterns", nor at complexity 0
// (those sessions keep today's presets)
export const composesOnAir = opts => sessionSource(opts) !== 'patterns' && (opts.complexity ?? 0.5) > 0;
// One new idea for a track, composed while the song plays. M: { seed, key, chords, meter, energy, density, complexity,
// source, avoid (ideas it must differ from) }. density, energy and complexity (0 to 1) shape the part (D3): notes per
// bar, register, range and rhythmic variety. With the source "varied" a preset track gets a variation of its preset.
// Tries a few seeds until the idea differs from every idea in avoid; null when the type has no generator (drums keep
// their grooves, textures their rhythms).
export function airIdea(t, R, M) {
  const kind = KIND_OF_TYPE[t.type];
  if (!kind || kind === 'drums') return null;
  const harmony = { key: M.key, mode: (t.settings && t.settings.mode) || 'minor', chords: M.chords };
  const style = (R[t.type] && R[t.type].material) || {}, shape = { density: M.density, register: M.energy, complexity: M.complexity };
  const avoid = new Set((M.avoid || []).filter(Boolean).map(x => JSON.stringify(x)));
  const preset = ((t.patterns || {}).A || {}).preset;
  for (let k = 0; k < 8; k++) {
    const seed = k ? `${M.seed}:${k + 1}` : M.seed;
    const v = M.source === 'varied' && preset
      ? compose(kind, { seed, type: t.type, from: preset, keep: k % 2 ? 'notes' : 'rhythm', harmony, meter: M.meter, energy: M.energy })
      : compose(kind, { seed, style, harmony, meter: M.meter, energy: M.energy, type: t.type, shape });
    if (v && v.idea && !avoid.has(JSON.stringify(v.idea))) return v.idea;
  }
  return null;
}
