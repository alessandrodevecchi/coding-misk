// Growth shapes (growth-shapes, #64): how a live build with the Live coder profile opens, how fast it grows and in
// which order. A shape is three choices: an opening, a pace and a development. Each part comes from the user's
// control in Compose, else the song's `growthShape`, else the weights of the song's style recipe (`growthShapes`),
// else a draw from the song's seed. Openings the song cannot play are left out before any draw. Pure and seeded: the
// app and the Node checks resolve the same shape.
import { stream } from '../endless/random.js';
import { normalizeSong } from './format.js';

// raised when an intended change to the shape rules changes the steps of a checked Live coder build
// (tools/check-crescendo.mjs, Live coder fixtures); saved growths carry it, so a new version grows them anew
export const SHAPES_VERSION = 7;
// salt of the shape draws (resolveShape, shape search, growth stream): fixed at the value SHAPES_VERSION 5 used, so a
// version raised for a rule fix (v6: blank lines in the typing alignment; v7: a melody rewrite turned by whole
// mini-notation steps) keeps every song's drawn shapes; change it only when new draws are wanted
export const SHAPES_SEED = 5;
export const OPENINGS = ['slow', 'full-kick', 'typed', 'broken', 'filtered', 'melodic', 'pad', 'voice', 'muted-base', 'mid-set'];
export const PACES = ['slow', 'medium', 'fast'];
export const DEVELOPMENTS = ['by-type', 'as-written', 'masks', 'parameters', 'second-section', 'metamorphosis'];
export const SHAPE_PARTS = { opening: OPENINGS, pace: PACES, development: DEVELOPMENTS };
// the less detailed variants of a candidate shape the growth search also tries (crescendo.js, shape-search D2): the
// highest level of detail its moves may use
export const DETAIL_VARIANTS = [2, 1, 0];
// every growth shape: a development with a pace (the opening is drawn apart and never searched)
export const GROWTH_SHAPES = DEVELOPMENTS.flatMap(development => PACES.map(pace => ({ development, pace })));
// the counts the Settings page shows (Advanced card), from the lists above so they follow a change of shapes: the
// shapes, and the most candidates a growth in Compose can measure (crescendo.js shapeCandidates: every development
// with the drawn pace, by type with each other pace; each also in its less detailed variants)
export function shapeCounts() {
  const tried = DEVELOPMENTS.length + PACES.length - 1;
  return { shapes: GROWTH_SHAPES.length, developments: DEVELOPMENTS.length, paces: PACES.length, openings: OPENINGS.length, tried, details: DETAIL_VARIANTS.length, most: tried * (1 + DETAIL_VARIANTS.length) };
}
// the recipe field of each part: growthShapes: { openings: { id: weight }, paces: {…}, developments: {…} }
export const RECIPE_KEYS = { opening: 'openings', pace: 'paces', development: 'developments' };
// weights when neither the song nor its style names a part (design D1)
export const DEFAULT_WEIGHTS = {
  opening: { slow: 2, 'full-kick': 1, typed: 1, broken: 1, filtered: 1, melodic: 1, pad: 1, voice: 0.5, 'muted-base': 1, 'mid-set': 1 },
  pace: { slow: 1, medium: 2, fast: 2 },
  development: { 'by-type': 2, 'as-written': 2, masks: 1, parameters: 1, 'second-section': 1, metamorphosis: 0.5 },
};
const MELODIC_OPEN = ['arp', 'hook', 'guitar'];

// a drum pattern with a kick: a written bd row, a bd list in a beat idea, or a preset groove
export const kickOf = pat => !!pat && (pat.rows ? /x/.test(String((pat.rows || {}).bd || '')) : pat.idea ? !!(pat.idea.beat && pat.idea.beat.bd) : true);
const over = (c, s) => c.start < s.start + s.bars && c.start + c.bars > s.start;

// the spoken track and the pattern of its first opening line (voice-instrument), or null: the voice opening plays it
export function openingLine(n) {
  for (const t of n.tracks) {
    if (t.mute || t.type !== 'spoken') continue;
    const c = t.clips.find(x => ((t.patterns || {})[x.pattern] || {}).way === 'opening');
    if (c) return { track: t, clip: c };
  }
  return null;
}
// the facts the rules need: the tracks of the reference section (the destination of the growth), the style recipe and
// its family. styles: { id: recipe } of the known style recipes
export function shapeFacts(song, styles = {}) {
  const n = normalizeSong(song), secs = n.sections;
  const plays = n.tracks.filter(t => !t.mute && t.type !== 'voice' && t.type !== 'spoken' && t.clips.length);
  const counts = secs.map(s => plays.filter(t => t.clips.some(c => over(c, s))).length);
  const R = secs[counts.indexOf(Math.max(0, ...counts))];
  const dest = R ? plays.filter(t => t.clips.some(c => over(c, R))) : [];
  const types = new Set(dest.map(t => t.type));
  const ids = ((song.tags && song.tags.styles) || []).map(String);
  const recipe = ids.map(id => styles[id]).find(Boolean) || null;
  const siblings = recipe && recipe.family ? Object.values(styles).filter(r => r && r.id !== recipe.id && r.family === recipe.family) : [];
  return {
    count: dest.length, types,
    drums: types.has('drums'),
    kick: dest.some(t => t.type === 'drums' && Object.values(t.patterns || {}).some(kickOf)),
    // the filtered opening moves the cutoff: drums whose clips leave it to the track
    filter: dest.some(t => t.type === 'drums' && Object.values(t.patterns || {}).some(kickOf) && !t.clips.some(c => c.set && c.set.cutoff !== undefined) && !(t.pinned || []).includes('cutoff')),
    melodic: MELODIC_OPEN.some(x => types.has(x)),
    pad: types.has('pad') || types.has('texture'),
    // a voice that is part of the music (voice-instrument): a spoken track with an opening line; narrator voice tracks
    // never count
    voice: !!openingLine(n),
    material: dest.some(t => ['drums', 'bass', 'arp', 'hook', 'pad', 'guitar'].includes(t.type)),
    recipe, siblings,
  };
}

// whether a song can play a value of a part (impossible openings and developments are left out before a draw)
export function canPlay(part, value, f) {
  if (part === 'opening') {
    if (['slow', 'broken'].includes(value)) return f.drums;
    if (value === 'full-kick') return f.kick;
    if (value === 'filtered') return f.filter;
    if (value === 'melodic') return f.melodic;
    if (value === 'pad') return f.pad;
    if (value === 'voice') return f.voice;
    if (['muted-base', 'mid-set'].includes(value)) return f.count >= 3;
    return value === 'typed';
  }
  if (part === 'development') {
    if (value === 'metamorphosis') return f.siblings.length > 0 && f.material;
    if (['masks', 'second-section'].includes(value)) return f.count >= 2;
    return DEVELOPMENTS.includes(value);
  }
  return PACES.includes(value);
}

// the shape of a song: { opening, pace, development, from: { part: 'user' | 'song' | 'artist' | 'style' | 'seed' } }
// user: the Compose controls ({ opening: 'auto' | value, … }); seed: defaults to the song id
// on air (radio-profiles D6): weights, the artist's `growth` weights ({ openings, paces, developments }), drawn between the
// song's own shape and the style's; deny: values left out before any draw ({ opening: ['typed'], development: […] })
// (neither is given in Compose: its shapes stay as they were)
export function resolveShape(song, { user = {}, styles = {}, seed, weights: artistWeights = null, deny = null } = {}) {
  const f = shapeFacts(song, styles), own = (song && song.growthShape) || {}, weights = (f.recipe && f.recipe.growthShapes) || {};
  const rng = stream(String(seed ?? (song && song.id) ?? 'song'), `shape-${SHAPES_SEED}`);
  const out = { from: {} };
  for (const [part, list] of Object.entries(SHAPE_PARTS)) {
    const ok = v => list.includes(v) && canPlay(part, v, f) && !(deny && (deny[part] || []).includes(v));
    const draw = (w, sub) => { const cands = list.filter(v => ok(v) && Number(w[v]) > 0); return cands.length ? rng.fork(`${part}-${sub}`).weighted(cands, cands.map(v => Number(w[v]))) : null; };
    let v = null, from = null;
    if (user[part] && user[part] !== 'auto' && ok(user[part])) { v = user[part]; from = 'user'; }
    else if (ok(own[part])) { v = own[part]; from = 'song'; }
    else if (artistWeights && (v = draw(artistWeights[RECIPE_KEYS[part]] || {}, 'artist'))) from = 'artist';
    else if ((v = draw(weights[RECIPE_KEYS[part]] || {}, 'style'))) from = 'style';
    else { v = draw(DEFAULT_WEIGHTS[part], 'seed') || (part === 'opening' ? 'typed' : list[0]); from = 'seed'; }
    out[part] = v; out.from[part] = from;
  }
  return out;
}

// checks for a song's `growthShape` and a recipe's `growthShapes`; err takes (path, message)
export function checkGrowthShape(v, err) {
  if (v === undefined) return;
  if (!v || typeof v !== 'object' || Array.isArray(v)) { err('growthShape', 'an object with some of opening, pace, development, for example { "opening": "full-kick", "pace": "fast" }'); return; }
  for (const [k, x] of Object.entries(v)) {
    if (!SHAPE_PARTS[k]) err(`growthShape.${k}`, 'unknown part; parts: opening, pace, development');
    else if (!SHAPE_PARTS[k].includes(x)) err(`growthShape.${k}`, `one of ${SHAPE_PARTS[k].join(', ')}`);
  }
}
export function checkGrowthShapes(v, err) {
  if (v === undefined) return;
  if (!v || typeof v !== 'object' || Array.isArray(v)) { err('growthShapes', 'an object with weights per part: { "openings": { "full-kick": 3 }, "paces": { "fast": 2 }, "developments": { "by-type": 1 } }'); return; }
  const parts = Object.fromEntries(Object.entries(RECIPE_KEYS).map(([part, key]) => [key, SHAPE_PARTS[part]]));
  for (const [k, w] of Object.entries(v)) {
    if (!parts[k]) { err(`growthShapes.${k}`, `unknown part; parts: ${Object.keys(parts).join(', ')}`); continue; }
    if (!w || typeof w !== 'object' || Array.isArray(w)) { err(`growthShapes.${k}`, 'weights by id, for example { "fast": 2, "medium": 1 }'); continue; }
    for (const [id, x] of Object.entries(w)) {
      if (!parts[k].includes(id)) err(`growthShapes.${k}.${id}`, `one of ${parts[k].join(', ')}`);
      else if (typeof x !== 'number' || !Number.isFinite(x) || x < 0) err(`growthShapes.${k}.${id}`, 'a weight: a number from 0');
    }
  }
}
