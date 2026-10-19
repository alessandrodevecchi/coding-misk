// Style recipes for the endless director: format, defaults and validation (docs/STYLES.md).
// A recipe names building blocks the app already has (src/music.js, drum machines, sounds);
// the validator checks every name, like the song validator, with a JSON path per problem.
import { KEYS, PROGS, METERS, BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, GUITAR_TYPES, TEXTURES, TEX_RHYTHMS, GROOVES, MODES, WAVES } from '../music.js';
import { SETTING_FIELDS, VOICE_DEFAULT, GENRES } from '../song/format.js';
import { SYNTHS } from '../song/validate.js';
import { SPEAKERS } from '../song/build.js';
import { checkGrowthShapes } from '../song/shapes.js';
import { WAYS, checkNarrator, MAX_WORDS } from '../song/spoken.js';
import { VOCAB_GROUPS } from '../song/vocabulary.js';
import { MACHINES } from '../sounds/machines.js';
import { SOURCES, RULES, FAMILIES, SOUND_KINDS, KIND_OF_TYPE } from '../material/index.js';

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
  // the voice instrument and the narrator style travel with the voice (voice-instrument)
  voice: ['voice', 'spoken', 'narrator'],
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
  genre: 'experimental',
};

// Renamed styles (clear-names): old ids still read everywhere through styleId; recipeOrder keeps the list order the
// styles had before the rename, so draws over the list (artist exploration) give the same songs for the same seed
export const STYLE_ALIASES = { 'switch-acid': 'acid', 'switch-house': 'house', 'switch-trance': 'gated-trance', 'switch-trance-pure': 'pure-trance' };
export const FAMILY_ALIASES = { switch: 'live-coder' };
const OLD_ID = Object.fromEntries(Object.entries(STYLE_ALIASES).map(([o, n]) => [n, o]));
export const styleId = id => STYLE_ALIASES[id] || id;
export const familyId = id => FAMILY_ALIASES[id] || id;
export const recipeOrder = id => OLD_ID[id] || id;
// an object keyed by style ids (an artist's taste) with old ids renamed
export const styleKeys = o => (o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [styleId(k), v])) : o);
export const RECIPE_FORMAT = 1;
export const TOP_FIELDS = ['format', 'id', 'name', 'genre', 'family', 'buildStyle', 'profile', 'description', 'tempo', 'keys', 'progressions', 'meters', 'swing', 'shapes', 'minutes', 'phrase', 'tracks', 'energy', 'voice', 'spoken', 'narrator', 'words', 'growthShapes', 'headroom', ...Object.keys(INSTRUMENTS)];
// level-headroom: the peak a track line of the style's songs may reach before the level checks warn. The output peak
// stays the hard limit (1.0); a loud genre may let single lines go higher, since every line passes the master level first
export const HEADROOM = { default: 1, min: 1, max: 1.5 };
// the push into the master limiter (src/sounds/limiter.js) of a song with these style ids: the highest `headroom` among
// the recipes, within HEADROOM; 1 (no push) for a song without styles or whose styles set none
export function stylePush(styles, recipes) {
  let push = HEADROOM.default;
  for (const id of styles || []) {
    const r = (recipes || []).find(x => x && x.id === styleId(id));
    if (r && isNum(r.headroom)) push = Math.max(push, Math.min(HEADROOM.max, r.headroom));
  }
  return push;
}
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

  // a family of styles across genres (switch-styles), and the build style its songs open with in Compose
  if (r.family !== undefined && (typeof r.family !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(r.family))) err('family', 'a family id: lowercase letters, digits and hyphens, for example "switch"');
  if (r.buildStyle !== undefined && !['blocks', 'crescendo'].includes(r.buildStyle)) err('buildStyle', 'one of blocks, crescendo');
  if (r.profile !== undefined && !['classic', 'crescendo', 'switch'].includes(r.profile)) err('profile', 'one of classic, crescendo, switch');
  // weights of the growth shapes its songs draw in a Live coder build (growth-shapes)
  checkGrowthShapes(r.growthShapes, err);
  // one genre of the song library (#34); a style without one is treated as experimental
  if (r.genre === undefined) warn('genre', `no genre: treated as "experimental"; genres: ${GENRES.join(', ')}`);
  else if (!GENRES.includes(r.genre)) err('genre', `a genre: ${GENRES.join(', ')}`);

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
  if (r.headroom !== undefined && !(typeof r.headroom === 'number' && r.headroom >= HEADROOM.min && r.headroom <= HEADROOM.max)) err('headroom', `the peak a track line may reach before a level warning, a number from ${HEADROOM.min} to ${HEADROOM.max} (default ${HEADROOM.default})`);
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
  // the voice instrument (voice-instrument, D7): { weight, ways: { passage, refrain, chop, opening }, lines?, speakers?, vocab? }
  if (r.spoken !== undefined) {
    const v = r.spoken, keys = ['weight', 'ways', 'lines', 'speakers', 'vocab'];
    if (!v || typeof v !== 'object' || Array.isArray(v)) err('spoken', 'an object: { "weight": 0.3, "ways": { "refrain": 2, "passage": 1 } }');
    else {
      for (const k of Object.keys(v)) if (!keys.includes(k)) warn(`spoken.${k}`, `unknown field; fields: ${keys.join(', ')}`);
      if (!isNum(v.weight) || v.weight < 0 || v.weight > 1) err('spoken.weight', 'how likely a song gets a voice instrument, from 0 to 1');
      if (v.ways !== undefined) {
        if (!v.ways || typeof v.ways !== 'object' || Array.isArray(v.ways)) err('spoken.ways', `weights by way: ${WAYS.join(', ')}`);
        else for (const [k, x] of Object.entries(v.ways)) { if (!WAYS.includes(k)) err(`spoken.ways.${k}`, `one of ${WAYS.join(', ')}`); else if (!isNum(x) || x < 0) err(`spoken.ways.${k}`, 'a weight: a number from 0'); }
      }
      if (v.lines !== undefined) {
        if (!v.lines || typeof v.lines !== 'object' || Array.isArray(v.lines)) err('spoken.lines', 'lines by way: { "refrain": [{ "en": "…", "it": "…" }] }');
        else for (const [k, list] of Object.entries(v.lines)) {
          if (!WAYS.includes(k)) { err(`spoken.lines.${k}`, `one of ${WAYS.join(', ')}`); continue; }
          if (!Array.isArray(list) || !list.length) { err(`spoken.lines.${k}`, 'a non-empty list of lines'); continue; }
          list.forEach((x, i) => { const w = s => String(s || '').trim().split(/\s+/).filter(Boolean).length; if (!x || typeof x !== 'object' || typeof x.en !== 'string' || !x.en.trim() || w(x.en) > MAX_WORDS || (x.it !== undefined && (typeof x.it !== 'string' || w(x.it) > MAX_WORDS))) err(`spoken.lines.${k}[${i}]`, `{ "en": "…", "it": "…" }, at most ${MAX_WORDS} words`); });
        }
      }
      if (v.speakers !== undefined && (!Array.isArray(v.speakers) || !v.speakers.length || v.speakers.some(y => !SPEAKERS.includes(y)))) err('spoken.speakers', `a list of speakers: ${SPEAKERS.join(', ')}`);
      if (v.vocab !== undefined && !VOCAB_GROUPS.includes(v.vocab)) err('spoken.vocab', `a vocabulary group: ${VOCAB_GROUPS.join(', ')}`);
    }
  }
  checkNarrator(r.narrator, 'narrator', err);
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
    const allowed = [...Object.keys(fields), 'settings', 'weight', ...(KIND_OF_TYPE[type] ? ['material'] : [])];
    for (const k of Object.keys(part)) if (!allowed.includes(k)) warn(`${p}.${k}`, `unknown field for ${type}; fields: ${allowed.join(', ')}`);
    for (const k of REQUIRED_LISTS[type]) if (part[k] === undefined) err(`${p}.${k}`, `a list of ${k}`);
    for (const [k, names] of Object.entries(fields)) {
      if (part[k] === undefined) continue;
      if (names === null) list(`${p}.${k}`, part[k], knownSound, 'sounds', true);
      else list(`${p}.${k}`, part[k], among(`${p}.${k}`, names), k);
    }
    if (part.weight !== undefined && (!isNum(part.weight) || part.weight < 0 || part.weight > 1)) err(`${p}.weight`, 'how likely the director is to use this instrument, from 0 to 1');
    if (part.material !== undefined && KIND_OF_TYPE[type]) checkMaterial(type, part.material, `${p}.material`, err, warn);
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

// The material choice of an instrument (material-generator, docs/STYLES.md "Material"): source, share of generated parts,
// and the groove families, melody rules and sound kinds the generator may use for it.
export const MATERIAL_FIELDS = ['source', 'share', 'families', 'rules', 'sounds'];
function checkMaterial(type, m, p, err, warn) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) { err(p, 'an object, for example { "source": "mix", "share": 0.5 }'); return; }
  for (const k of Object.keys(m)) if (!MATERIAL_FIELDS.includes(k)) warn(`${p}.${k}`, `unknown field; fields: ${MATERIAL_FIELDS.join(', ')}`);
  if (m.source !== undefined && !SOURCES.includes(m.source)) err(`${p}.source`, `one of ${SOURCES.join(', ')}`);
  if (m.share !== undefined && (!isNum(m.share) || m.share < 0 || m.share > 1)) err(`${p}.share`, 'the share of generated parts, from 0 to 1');
  const names = (k, known, what) => {
    if (m[k] === undefined) return;
    if (!Array.isArray(m[k]) || !m[k].length) { err(`${p}.${k}`, `a non-empty list of ${what}: ${known.join(', ')}`); return; }
    m[k].forEach((x, i) => { if (!known.includes(x)) err(`${p}.${k}[${i}]`, `unknown ${what.replace(/s$/, '')} "${x}"; known: ${known.join(', ')}`); });
  };
  const kind = KIND_OF_TYPE[type];
  if (type === 'drums') names('families', FAMILIES, 'groove families');
  else if (m.families !== undefined) err(`${p}.families`, 'groove families are for drums only');
  if (RULES[kind]) names('rules', RULES[kind], 'rules');
  else if (m.rules !== undefined) err(`${p}.rules`, `no rules for ${type}`);
  if (type !== 'drums') names('sounds', SOUND_KINDS, 'sound kinds');
  else if (m.sounds !== undefined) err(`${p}.sounds`, 'sound kinds are for melodic instruments');
}

// Every sound a recipe names (instrument waves), for the browser check.
export const recipeSounds = r => [...new Set(['bass', 'arp', 'hook', 'pad'].flatMap(t => (r[t] && r[t].waves) || []).flatMap(w => w.split(',')))];
