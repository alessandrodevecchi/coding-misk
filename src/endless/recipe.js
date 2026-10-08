// Style recipes for the endless director: format, defaults and validation (docs/STYLES.md).
// A recipe names building blocks the app already has (src/music.js, drum machines, sounds);
// the validator checks every name, like the song validator, with a JSON path per problem.
import { KEYS, PROGS, METERS, BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, GUITAR_TYPES, TEXTURES, TEX_RHYTHMS, GROOVES, MODES, WAVES } from '../music.js';
import { SETTING_FIELDS, VOICE_DEFAULT } from '../song/format.js';
import { SYNTHS } from '../song/validate.js';
import { SPEAKERS } from '../song/build.js';
import { MACHINES } from '../sounds/machines.js';

// The seven energy shapes (docs/ENDLESS.md); their curves live in shapes.js.
export const SHAPES = ['build-drop', 'slow-burn', 'waves', 'flat-groove', 'verse-chorus', 'late-peak', 'descent'];

// Instrument parts of a recipe and what each one lists. Every one is optional:
// a missing part means songs made only from that recipe never get that kind of track.
// [list field, what it names, the known names]
export const INSTRUMENTS = {
  drums: { kits: MACHINES, grooves: Object.keys(GROOVES) },
  bass: { presets: Object.keys(BASS), waves: null },
  arp: { presets: Object.keys(ARPS), waves: null, speeds: ['8', '16'] },
  hook: { presets: Object.keys(HOOKS), waves: null, modes: MODES.map(([m]) => m) },
  pad: { presets: Object.keys(PADS), waves: null },
  guitar: { patterns: Object.keys(GUITAR_PATTERNS), types: Object.keys(GUITAR_TYPES) },
  texture: { samples: TEXTURES, rhythms: Object.keys(TEX_RHYTHMS) },
  riser: {},
};
// List fields that must not be empty when the instrument is present.
const REQUIRED_LISTS = { drums: ['kits', 'grooves'], bass: ['presets', 'waves'], arp: ['presets', 'waves'], hook: ['presets', 'waves'], pad: ['presets', 'waves'], guitar: ['patterns', 'types'], texture: ['samples', 'rhythms'], riser: [] };

// Parts that styles can mix (docs/STYLES.md, "Mixing"): which recipe fields travel together.
export const PARTS = {
  tempo: ['tempo', 'shapes', 'minutes', 'phrase', 'tracks', 'energy'],
  drums: ['drums'],
  bass: ['bass'],
  harmony: ['keys', 'progressions', 'meters', 'swing'],
  lead: ['arp', 'hook'],
  pads: ['pad', 'guitar', 'texture', 'riser'],
  voice: ['voice'],
};
export const PART_NAMES = Object.keys(PARTS);

// Values used when a recipe leaves a field out.
export const RECIPE_DEFAULTS = {
  meters: ['4/4'],
  swing: [0, 0],
  minutes: [3, 5],
  phrase: 8,
  tracks: { usual: [4, 5], max: 8 },
  energy: { tracks: 0.4, drums: 0.3, filter: 0.2, drive: 0.1 },
  voice: VOICE_DEFAULT,
};

export const RECIPE_FORMAT = 1;
export const TOP_FIELDS = ['format', 'id', 'name', 'description', 'tempo', 'keys', 'progressions', 'meters', 'swing', 'shapes', 'minutes', 'phrase', 'tracks', 'energy', 'voice', 'words', ...Object.keys(INSTRUMENTS)];
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isInt = v => Number.isInteger(v);
const knownSound = w => WAVES.some(([id]) => id === w) || /^gm_/.test(w) || SYNTHS.includes(w);

// A recipe with every default filled in (assumes a valid recipe).
export function withDefaults(recipe) {
  const out = { ...recipe };
  for (const [k, v] of Object.entries(RECIPE_DEFAULTS)) {
    if (out[k] === undefined) out[k] = structuredClone(v);
    else if (k === 'tracks' || k === 'energy' || k === 'voice') out[k] = { ...v, ...out[k] };
  }
  return out;
}

// Which parts a recipe provides: tempo, harmony and voice always; an instrument part when it has at least one instrument.
export const partsOf = recipe => PART_NAMES.filter(p => !['drums', 'bass', 'lead', 'pads'].includes(p) || PARTS[p].some(k => recipe[k]));

export function validateRecipe(r) {
  const errors = [], warnings = [];
  const err = (path, msg) => errors.push({ path, msg });
  const warn = (path, msg) => warnings.push({ path, msg });
  if (!r || typeof r !== 'object' || Array.isArray(r)) { err('', 'a recipe is a JSON object'); return { errors, warnings }; }
  for (const k of Object.keys(r)) if (!TOP_FIELDS.includes(k)) warn(k, `unknown field; recipe fields: ${TOP_FIELDS.join(', ')}`);

  if (r.format !== undefined && (!Number.isInteger(r.format) || r.format < 1 || r.format > RECIPE_FORMAT)) err('format', `a format version from 1 to ${RECIPE_FORMAT}`);
  if (typeof r.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(r.id)) err('id', 'lowercase letters, digits and hyphens, for example "berlin-techno"');
  for (const lang of ['en', 'it']) if (!r.name || typeof r.name[lang] !== 'string' || !r.name[lang].trim()) err(`name.${lang}`, 'the style name in English and Italian, for example {"en": "Berlin techno", "it": "Techno berlinese"}');

  // [lo, hi] ranges
  const range = (path, v, lo, hi, int = false) => {
    if (!Array.isArray(v) || v.length !== 2 || !v.every(isNum)) { err(path, `a range [low, high] of numbers from ${lo} to ${hi}`); return; }
    if (int && !v.every(isInt)) err(path, 'whole numbers');
    if (v[0] > v[1]) err(path, `reversed range: low ${v[0]} is above high ${v[1]}`);
    if (v[0] < lo || v[1] > hi) err(path, `must stay within ${lo} to ${hi}`);
  };
  // a non-empty list whose items must be among `known`; `soft` reports unknown items as warnings
  const list = (path, v, known, what, soft = false) => {
    if (!Array.isArray(v) || !v.length || v.some(x => typeof x !== 'string')) { err(path, `a non-empty list of ${what}`); return; }
    v.forEach((x, i) => {
      if (known(x)) return;
      (soft ? warn : err)(`${path}[${i}]`, soft ? `unknown sound "${x}"; sounds load at run time, check the Sounds tab` : `unknown ${what.replace(/s$/, '')} "${x}"; known: ${knownList(path)}`);
    });
  };
  const known = {};
  const knownList = path => known[path] || '';
  const among = (path, names) => { known[path] = names.join(', '); return x => names.includes(x); };

  if (r.tempo === undefined) err('tempo', 'the tempo range in BPM, for example [126, 134]');
  else range('tempo', r.tempo, 40, 240);
  if (r.keys === undefined) err('keys', 'a list of keys');
  else list('keys', r.keys, among('keys', KEYS.map(k => k[0])), 'keys');
  if (r.progressions === undefined) err('progressions', 'a list of chord progressions');
  else list('progressions', r.progressions, among('progressions', Object.keys(PROGS)), 'progressions');
  if (r.meters !== undefined) list('meters', r.meters, among('meters', METERS.map(m => m[0])), 'meters');
  if (r.swing !== undefined) range('swing', r.swing, 0, 1);
  if (r.shapes === undefined) err('shapes', `a list of energy shapes: ${SHAPES.join(', ')}`);
  else list('shapes', r.shapes, among('shapes', SHAPES), 'shapes');
  if (r.minutes !== undefined) range('minutes', r.minutes, 2, 6);
  if (r.phrase !== undefined && ![4, 8, 16].includes(r.phrase)) err('phrase', 'the phrase length in bars: 4, 8 or 16');
  if (r.tracks !== undefined) {
    const t = r.tracks;
    if (!t || typeof t !== 'object' || Array.isArray(t)) err('tracks', 'an object {"usual": [low, high], "max": n}');
    else {
      if (t.usual !== undefined) range('tracks.usual', t.usual, 1, 8, true);
      if (t.max !== undefined && (!isInt(t.max) || t.max < 2 || t.max > 12)) err('tracks.max', 'a whole number from 2 to 12');
      const usual = t.usual || RECIPE_DEFAULTS.tracks.usual, max = t.max ?? RECIPE_DEFAULTS.tracks.max;
      if (Array.isArray(usual) && isNum(usual[1]) && isInt(max) && usual[1] > max) err('tracks', `usual high ${usual[1]} is above max ${max}`);
      for (const k of Object.keys(t)) if (!['usual', 'max'].includes(k)) warn(`tracks.${k}`, 'unknown field; fields: usual, max');
    }
  }
  if (r.energy !== undefined) {
    const e = r.energy, keys = Object.keys(RECIPE_DEFAULTS.energy);
    if (!e || typeof e !== 'object' || Array.isArray(e)) err('energy', `an object of weights: ${keys.join(', ')}`);
    else for (const [k, v] of Object.entries(e)) {
      if (!keys.includes(k)) warn(`energy.${k}`, `unknown weight; weights: ${keys.join(', ')}`);
      else if (!isNum(v) || v < 0 || v > 1) err(`energy.${k}`, 'a weight from 0 to 1');
    }
  }
  if (r.voice !== undefined) {
    const v = r.voice, keys = [...Object.keys(VOICE_DEFAULT), 'speakers'];
    if (!v || typeof v !== 'object' || Array.isArray(v)) err('voice', `voice track settings: ${keys.join(', ')}`);
    else for (const [k, x] of Object.entries(v)) {
      if (!keys.includes(k)) { warn(`voice.${k}`, `unknown voice setting; settings: ${keys.join(', ')}`); continue; }
      if (k === 'speakers') { if (!Array.isArray(x) || !x.length || x.some(y => y !== '' && !SPEAKERS.includes(y))) err('voice.speakers', `a list of speakers: ${SPEAKERS.join(', ')}, or "" for the default voice`); continue; }
      if (k === 'speaker') { if (x !== '' && !SPEAKERS.includes(x)) err('voice.speaker', `a speaker: ${SPEAKERS.join(', ')}, or "" for the default voice`); continue; }
      if (Array.isArray(x)) { range(`voice.${k}`, x, k === 'pitch' || k === 'tempo' ? 0.25 : 0, k === 'pitch' || k === 'tempo' ? 4 : 20000); continue; }
      if (!isNum(x)) err(`voice.${k}`, 'a number or a range [low, high]');
      else if ((k === 'pitch' || k === 'tempo') && (x < 0.25 || x > 4)) err(`voice.${k}`, 'a number from 0.25 to 4');
    }
  }
  if (!r.words || typeof r.words !== 'object') err('words', 'title words in English, Italian and Spanish: {"en": [...], "it": [...], "es": [...]}');
  else for (const lang of ['en', 'it', 'es']) {
    const w = r.words[lang];
    if (!Array.isArray(w) || w.length < 3 || w.some(x => typeof x !== 'string' || !x.trim())) err(`words.${lang}`, 'at least 3 title words');
  }

  // instrument parts
  let instruments = 0;
  for (const [type, fields] of Object.entries(INSTRUMENTS)) {
    const part = r[type];
    if (part === undefined) continue;
    instruments++;
    const p = type;
    if (!part || typeof part !== 'object' || Array.isArray(part)) { err(p, 'an object'); continue; }
    const allowed = [...Object.keys(fields), 'settings', 'weight'];
    for (const k of Object.keys(part)) if (!allowed.includes(k)) warn(`${p}.${k}`, `unknown field for ${type}; fields: ${allowed.join(', ')}`);
    for (const k of REQUIRED_LISTS[type]) if (part[k] === undefined) err(`${p}.${k}`, `a list of ${k}`);
    for (const [k, names] of Object.entries(fields)) {
      if (part[k] === undefined) continue;
      if (names === null) list(`${p}.${k}`, part[k], knownSound, 'sounds', true);
      else list(`${p}.${k}`, part[k], among(`${p}.${k}`, names), k);
    }
    if (part.weight !== undefined && (!isNum(part.weight) || part.weight < 0 || part.weight > 1)) err(`${p}.weight`, 'how likely the director is to use this instrument, from 0 to 1');
    if (part.settings !== undefined) {
      const s = part.settings, known = SETTING_FIELDS[type];
      if (!s || typeof s !== 'object' || Array.isArray(s)) err(`${p}.settings`, 'an object of settings, each a number or a range [low, high]');
      else for (const [k, v] of Object.entries(s)) {
        if (!known.includes(k)) { warn(`${p}.settings.${k}`, `unknown setting for ${type}; settings: ${known.join(', ')}`); continue; }
        if (Array.isArray(v)) range(`${p}.settings.${k}`, v, -Infinity, Infinity);
        else if (!isNum(v) && typeof v !== 'string') err(`${p}.settings.${k}`, 'a number, a range [low, high] or a string value');
      }
    }
  }
  if (!instruments) err('', `at least one instrument part: ${Object.keys(INSTRUMENTS).join(', ')}`);
  return { errors, warnings };
}

// Every sound a recipe names (instrument waves), for the browser check.
export const recipeSounds = r => [...new Set(['bass', 'arp', 'hook', 'pad'].flatMap(t => (r[t] && r[t].waves) || []).flatMap(w => w.split(',')))];
