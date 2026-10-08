// Artists (docs/ARTISTS.md): a profile and a taste that the director samples for every song.
// An artist never fixes a value: it gives weights and ranges, so songs by the same artist differ.
import { SHAPES } from './recipe.js';
import { QUIRKS } from './quirks.js';

export const ARTIST_FORMAT = 1;
// palettes of the pixel-art portraits (src/endless/portrait.js)
export const PALETTES = ['violet', 'neon', 'amber', 'ice', 'blood', 'forest', 'sunset', 'mono'];
// kinds of move an artist can like (the director's move kinds)
export const MOVE_KINDS = ['add-drums', 'add-bass', 'add-lead', 'add-pad', 'add-guitar', 'add-texture', 'strip', 'variation', 'brighter', 'darker', 'dirtier', 'cleaner', 'more-space'];
export const VOICE_CHARACTER_NAMES = ['radio', 'robot', 'deep', 'bright', 'cathedral', 'echo', 'dirty', 'slow'];
// transitions between songs (#23, src/endless/transitions.js) and harmony modes for the next song
export const TRANSITION_KINDS = ['mix', 'morph', 'break', 'echo', 'interlude', 'cut'];
export const HARMONY_MODES = ['compatible', 'free'];

// values used when an artist leaves a field out (also for fields added by later formats)
export const ARTIST_DEFAULTS = {
  explore: 0.1, chaos: [0.1, 0.5], energy: [0.4, 0.8], complexity: [0.3, 0.7], talk: [0.3, 0.6],
  shapes: {}, pace: [0.4, 0.6], moves: {}, voice: { characters: {}, chance: 0.35 }, quirks: {},
  transitions: { kinds: { mix: 3, cut: 2, morph: 1, break: 1, echo: 1, interlude: 0.5 }, bars: [8, 16], harmony: 'compatible' },
};
export const ARTIST_FIELDS = ['format', 'id', 'name', 'bio', 'inspiredBy', 'portrait', 'styles', ...Object.keys(ARTIST_DEFAULTS)];

export const withArtistDefaults = a => {
  const out = { ...structuredClone(ARTIST_DEFAULTS), ...a };
  out.voice = { ...ARTIST_DEFAULTS.voice, ...(a.voice || {}) };
  out.transitions = { ...structuredClone(ARTIST_DEFAULTS.transitions), ...(a.transitions || {}) };
  return out;
};

const isNum = v => typeof v === 'number' && Number.isFinite(v);

// styleIds: every style the artist may name (built-in and the user's)
export function validateArtist(a, styleIds = []) {
  const errors = [], warnings = [];
  const err = (path, msg) => errors.push({ path, msg }), warn = (path, msg) => warnings.push({ path, msg });
  if (!a || typeof a !== 'object' || Array.isArray(a)) { err('', 'an artist is a JSON object'); return { errors, warnings }; }
  for (const k of Object.keys(a)) if (!ARTIST_FIELDS.includes(k)) warn(k, `unknown field; artist fields: ${ARTIST_FIELDS.join(', ')}`);
  if (a.format !== undefined && (!Number.isInteger(a.format) || a.format < 1 || a.format > ARTIST_FORMAT)) err('format', `a format version from 1 to ${ARTIST_FORMAT}`);
  if (typeof a.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(a.id)) err('id', 'lowercase letters, digits and hyphens, for example "night-owl"');
  if (typeof a.name !== 'string' || !a.name.trim() || a.name.length > 40) err('name', 'the stage name, 1 to 40 characters');
  for (const lang of ['en', 'it']) if (!a.bio || typeof a.bio[lang] !== 'string' || !a.bio[lang].trim()) err(`bio.${lang}`, 'a short bio in English and Italian');
  if (a.inspiredBy !== undefined && typeof a.inspiredBy !== 'string') err('inspiredBy', 'a short text, for example "Avicii"');
  if (!a.portrait || typeof a.portrait.seed !== 'string' || !a.portrait.seed) err('portrait.seed', 'any text: the same seed always draws the same face');
  else if (!PALETTES.includes(a.portrait.palette)) err('portrait.palette', `one of ${PALETTES.join(', ')}`);
  const weights = (path, v, known, what) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) { err(path, `an object of ${what} with weights, for example {"${known[0]}": 2}`); return; }
    for (const [k, w] of Object.entries(v)) {
      if (!known.includes(k)) err(`${path}.${k}`, `unknown ${what.replace(/s$/, '')}; known: ${known.join(', ')}`);
      if (!isNum(w) || w < 0) err(`${path}.${k}`, 'a weight of 0 or more');
    }
  };
  const range = (path, v, lo = 0, hi = 1) => {
    if (!Array.isArray(v) || v.length !== 2 || !v.every(isNum)) { err(path, `a range [low, high] from ${lo} to ${hi}`); return; }
    if (v[0] > v[1]) err(path, `reversed range: low ${v[0]} is above high ${v[1]}`);
    if (v[0] < lo || v[1] > hi) err(path, `must stay within ${lo} to ${hi}`);
  };
  if (a.styles === undefined) err('styles', 'favourite styles with weights, for example {"berlin-techno": 3, "industrial": 1}');
  else {
    weights('styles', a.styles, styleIds, 'styles');
    if (a.styles && typeof a.styles === 'object' && !Object.values(a.styles).some(w => w > 0)) err('styles', 'at least one style with a weight above 0');
  }
  if (a.explore !== undefined && (!isNum(a.explore) || a.explore < 0 || a.explore > 1)) err('explore', 'the chance of a style outside the favourites, from 0 to 1');
  for (const k of ['chaos', 'energy', 'complexity', 'talk', 'pace']) if (a[k] !== undefined) range(k, a[k]);
  if (a.shapes !== undefined) weights('shapes', a.shapes, SHAPES, 'shapes');
  if (a.moves !== undefined) weights('moves', a.moves, MOVE_KINDS, 'moves');
  if (a.voice !== undefined) {
    if (!a.voice || typeof a.voice !== 'object') err('voice', 'an object {"characters": {...}, "chance": 0.4}');
    else {
      if (a.voice.characters !== undefined) weights('voice.characters', a.voice.characters, VOICE_CHARACTER_NAMES, 'characters');
      if (a.voice.chance !== undefined && (!isNum(a.voice.chance) || a.voice.chance < 0 || a.voice.chance > 1)) err('voice.chance', 'the chance of a voice character in a song, from 0 to 1');
    }
  }
  if (a.quirks !== undefined) {
    if (!a.quirks || typeof a.quirks !== 'object' || Array.isArray(a.quirks)) err('quirks', `an object of quirks with a chance, for example {"no-guitars": 1}; quirks: ${Object.keys(QUIRKS).join(', ')}`);
    else for (const [k, c] of Object.entries(a.quirks)) {
      if (!QUIRKS[k]) err(`quirks.${k}`, `unknown quirk; quirks: ${Object.keys(QUIRKS).join(', ')}`);
      if (!isNum(c) || c < 0 || c > 1) err(`quirks.${k}`, 'a chance from 0 to 1');
    }
  }
  if (a.transitions !== undefined) {
    const tr = a.transitions;
    if (!tr || typeof tr !== 'object' || Array.isArray(tr)) err('transitions', 'an object {"kinds": {"mix": 3}, "bars": [8, 16], "harmony": "compatible"}');
    else {
      if (tr.kinds !== undefined) {
        weights('transitions.kinds', tr.kinds, TRANSITION_KINDS, 'transitions');
        if (tr.kinds && typeof tr.kinds === 'object' && !Object.values(tr.kinds).some(w => w > 0)) err('transitions.kinds', 'at least one transition with a weight above 0');
      }
      if (tr.bars !== undefined) {
        range('transitions.bars', tr.bars, 2, 64);
        if (Array.isArray(tr.bars) && !tr.bars.every(Number.isInteger)) err('transitions.bars', 'whole numbers of bars');
      }
      if (tr.harmony !== undefined && !HARMONY_MODES.includes(tr.harmony)) err('transitions.harmony', `one of ${HARMONY_MODES.join(', ')}`);
    }
  }
  return { errors, warnings };
}

// weighted pick from {key: weight}, limited to "allowed" when given; null when nothing has weight
export function pickWeighted(rng, weights, allowed) {
  const items = Object.entries(weights || {}).filter(([k, w]) => w > 0 && (!allowed || allowed.includes(k)));
  if (!items.length) return null;
  return rng.weighted(items.map(([k]) => k), items.map(([, w]) => w));
}
const round = x => Math.round(x * 100) / 100;

// The options of one song by an artist: styles (dominant first), drawn values, taste for the director.
export function artistSongOptions(artist, styleIds, rng) {
  const A = withArtistDefaults(artist);
  const favs = Object.entries(A.styles).filter(([id, w]) => w > 0 && styleIds.includes(id));
  const others = styleIds.filter(id => !A.styles[id]);
  const dominant = others.length && rng.chance(A.explore) ? rng.pick(others) : rng.weighted(favs.map(([k]) => k), favs.map(([, w]) => w));
  const draw = r => round(rng.range(r[0], r[1]));
  const opts = {
    styles: [dominant, ...favs.map(([k]) => k).filter(k => k !== dominant)],
    chaos: draw(A.chaos), energy: draw(A.energy), complexity: draw(A.complexity), talk: draw(A.talk), pace: draw(A.pace),
    shapeWeights: A.shapes, moveWeights: A.moves, voiceCharacters: A.voice.characters, voiceChance: A.voice.chance,
    quirks: Object.entries(A.quirks).filter(([, c]) => rng.chance(c)).map(([k]) => k),
    transitionWeights: A.transitions.kinds, transitionBars: A.transitions.bars, artistHarmony: A.transitions.harmony,
  };
  if (opts.quirks.includes('talks-a-lot')) opts.talk = Math.max(opts.talk, 0.9);
  return opts;
}
