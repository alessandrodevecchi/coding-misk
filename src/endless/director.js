// The endless director (docs/ENDLESS.md): writes a seeded session of songs in the song format v2,
// each with live build steps that make it evolve phrase by phrase toward an energy shape.
// Pure and deterministic: no Node or browser APIs, no Math.random (randomness comes from random.js).
import { BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, TEX_RHYTHMS, GROOVES, ROWS, DEFAULT, KEYS, fitSteps, meterSteps } from '../music.js';
import { FORMAT, VERSION, SETTING_FIELDS, VOICE_DEFAULT, VOICE_CHARACTERS, VOICE_LIMITS } from '../song/format.js';
import { stateAt, SPEAKERS } from '../song/build.js';
import { VOCAB_GROUPS, VOCABULARY } from '../song/vocabulary.js';
import { makeRng, freshSeed, stream } from './random.js';
import { withDefaults, PART_NAMES, styleId } from './recipe.js';
import { mixParts, partRecipe, partsKey, stylesOf } from './mix.js';
import { shapePlan, LANDMARKS } from './shapes.js';
import { energyOf, playing, curveParts } from './energy.js';
import { mutateRows, mutateBass, mutateArp, mutateHook } from './mutate.js';
import { phrase as pickPhrase } from './phrases.js';
import { artistSongOptions, pickWeighted } from './artist.js';
import { has, applyPlanQuirks } from './quirks.js';
import { planTransition, MAX_RAMP } from './transitions.js';
import { applyMaterial, sessionSource } from './material.js';
import { songProfileOnAir } from './profile.js';
import { voiceOption, PHRASE_RANGES, VOICE_WAYS } from './voice-options.js';

export const SESSION_FORMAT = 'coding-misk/endless-session';
// talk: how often the voice speaks (0 never, 0.5 about half of the boundaries with moves, 1 almost all)
// The director's version (#38): sessions saved in playlists record it, and warn when it changes. Bump it whenever
// `npm run check:endless -- --write-fixtures` changes the fixtures (the same seed gives different songs).
// 4 (voice-instrument): styles with a voice instrument weight give some songs a spoken track and a narrator style
// 6 (generator-followups, #71): the styles' pads compose their chords in some songs (share 0.3), at a lower gain
export const DIRECTOR_VERSION = 6;
// material (material-generator): where parts come from, patterns, varied, composed or mix (each recipe decides)
// profile (radio-profiles D3): as the artist and the style say ('artist'), or one profile for every generated song
export const OPTION_DEFAULTS = { chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, minutes: 15, transition: 'artist', harmony: 'artist', material: 'mix', profile: 'artist' };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round = x => (Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 100) / 100);
const cap = s => s[0].toUpperCase() + s.slice(1);
const ROW_IDS = ROWS.map(([id]) => id);
const MELODIC = ['bass', 'arp', 'hook', 'pad', 'guitar'];
// order in which instruments usually come in at the start of a song
export const ENTRY = ['drums', 'bass', 'pad', 'arp', 'guitar', 'hook', 'texture'];
// keys a fifth apart (up or down), on the app's semitone offsets of KEYS
const semis = k => (KEYS.find(x => x[0] === k) || [k, 0])[1];
const fifthApart = (a, b) => { const d = ((semis(a) - semis(b)) % 12 + 12) % 12; return d === 5 || d === 7; };
// the harmony mode of a song: the options' override, else the artist's, else compatible
const harmonyOf = opts => (opts.harmony && opts.harmony !== 'artist' ? opts.harmony : opts.artistHarmony || 'compatible');
const pickOther = (rng, list, avoid) => { const rest = list.filter(x => x !== avoid); return rng.pick(rest.length ? rest : list); };
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

// ---------- song plan ----------

// settings of a track: the app defaults, the recipe values (ranges drawn), and fixed choices
function settingsFor(type, recipePart, extra, rng) {
  const out = {};
  for (const k of SETTING_FIELDS[type]) if (DEFAULT[type] && DEFAULT[type][k] !== undefined && DEFAULT[type][k] !== null) out[k] = DEFAULT[type][k];
  for (const [k, v] of Object.entries((recipePart && recipePart.settings) || {})) out[k] = Array.isArray(v) ? round(rng.range(v[0], v[1])) : v;
  return { ...out, ...extra };
}

// candidate tracks of a song, each with a base pattern A and variations B (and C at high complexity)
function candidateTracks(R, meter, complexity, rng, mut, opts = {}) {
  const n = meterSteps(meter), tracks = [];
  // the session source "patterns" plays the library as written: no mutation
  if (sessionSource(opts) === 'patterns') complexity = 0;
  const fit = rows => Object.fromEntries(Object.entries(rows).filter(([, v]) => v.includes('x')).map(([k, v]) => [k, fitSteps(v, n)]));
  const use = part => part && rng.chance(part.weight ?? 1);
  const variants = (base, mutate, others) => {
    const out = { A: base };
    const other = others.filter(x => JSON.stringify(x) !== JSON.stringify(base));
    const m1 = complexity > 0 && rng.chance(Math.max(complexity, 0.3)) ? mutate(complexity) : null;
    if (m1) out.B = m1; else if (other.length) out.B = rng.pick(other);
    if (complexity > 0.6) { const m2 = mutate(complexity); if (m2) out.C = m2; }
    return out;
  };
  if (use(R.drums)) {
    const kit = rng.pick(R.drums.kits), gA = rng.pick(R.drums.grooves), gB = pickOther(rng, R.drums.grooves, gA);
    const rowsA = fit(GROOVES[gA][1]), rowsB = fit(GROOVES[gB][1]);
    const split = rows => [rows.bd ? { bd: rows.bd } : null, Object.keys(rows).some(k => k !== 'bd') ? Object.fromEntries(Object.entries(rows).filter(([k]) => k !== 'bd')) : null];
    const [kickA, beatA] = split(rowsA), [kickB, beatB] = split(rowsB);
    if (kickA) tracks.push({ id: 'kick', name: 'Kick', type: 'drums', settings: settingsFor('drums', R.drums, { kit, gain: 0.85 }, rng),
      patterns: variants({ rows: kickA }, c => ({ rows: mutateRows(kickA, c, mut) }), kickB ? [{ rows: kickB }] : []) });
    if (beatA) tracks.push({ id: 'beat', name: 'Beat', type: 'drums', settings: settingsFor('drums', R.drums, { kit, gain: 0.6 }, rng),
      patterns: variants({ rows: beatA }, c => ({ rows: mutateRows(beatA, c, mut) }), beatB ? [{ rows: beatB }] : []) });
  }
  if (use(R.bass)) {
    const p = rng.pick(R.bass.presets);
    tracks.push({ id: 'bass', name: 'Bass', type: 'bass', settings: settingsFor('bass', R.bass, { wave: rng.pick(R.bass.waves) }, rng),
      patterns: variants({ preset: p }, c => { const notes = mutateBass(p, c, mut); return notes && { preset: p, notes }; }, R.bass.presets.map(x => ({ preset: x }))) });
  }
  if (use(R.arp)) {
    const p = rng.pick(R.arp.presets), speed = rng.pick(R.arp.speeds || ['16']);
    tracks.push({ id: 'arp', name: 'Arp', type: 'arp', settings: settingsFor('arp', R.arp, { wave: rng.pick(R.arp.waves) }, rng),
      patterns: variants({ preset: p, speed }, c => { const notes = mutateArp(p, c, mut); return notes && { preset: p, speed, notes }; }, R.arp.presets.map(x => ({ preset: x, speed }))) });
  }
  if (use(R.hook)) {
    const p = rng.pick(R.hook.presets);
    tracks.push({ id: 'hook', name: 'Lead', type: 'hook', settings: settingsFor('hook', R.hook, { wave: rng.pick(R.hook.waves), mode: rng.pick(R.hook.modes || ['minor']) }, rng),
      patterns: variants({ preset: p }, c => { const notes = mutateHook(p, c, mut); return notes && { preset: p, notes }; }, R.hook.presets.map(x => ({ preset: x }))) });
  }
  if (use(R.pad)) {
    const p = rng.pick(R.pad.presets);
    tracks.push({ id: 'pad', name: 'Pad', type: 'pad', settings: settingsFor('pad', R.pad, { wave: rng.pick(R.pad.waves) }, rng),
      patterns: variants({ preset: p }, () => null, R.pad.presets.map(x => ({ preset: x }))) });
  }
  if (!has(opts, 'no-guitars') && use(R.guitar)) {
    const p = rng.pick(R.guitar.patterns);
    tracks.push({ id: 'guitar', name: 'Guitar', type: 'guitar', settings: settingsFor('guitar', R.guitar, { type: rng.pick(R.guitar.types) }, rng),
      patterns: variants({ preset: p }, () => null, R.guitar.patterns.map(x => ({ preset: x }))) });
  }
  if (use(R.texture)) {
    const r = rng.pick(R.texture.rhythms);
    tracks.push({ id: 'texture', name: 'Texture', type: 'texture', settings: settingsFor('texture', R.texture, { sample: rng.pick(R.texture.samples) }, rng),
      patterns: variants({ rhythm: r }, () => null, R.texture.rhythms.map(x => ({ rhythm: x }))) });
  }
  if (use(R.riser)) tracks.push({ id: 'riser', name: 'Riser', type: 'riser', settings: settingsFor('riser', R.riser, {}, rng), patterns: { A: {} } });
  return tracks;
}

// The tracks a style can give for one kind of instrument, always (no weight draw): used by steering (#41)
// when the listener adds an instrument the song does not have. kind: drums, bass, lead, pad, texture.
const KIND_PARTS = { drums: ['drums'], bass: ['bass'], lead: ['hook', 'arp', 'guitar'], pad: ['pad'], texture: ['texture'] };
export function tracksOfKind(R, kind, meter, complexity, rng) {
  const parts = KIND_PARTS[kind] || [];
  const only = Object.fromEntries(['drums', 'bass', 'arp', 'hook', 'pad', 'guitar', 'texture', 'riser'].map(k => [k, parts.includes(k) && R[k] ? { ...R[k], weight: 1 } : undefined]));
  return candidateTracks({ ...R, ...only }, meter, complexity, rng, rng, {});
}

// A clip of an exact length (#5): the bars and the tempo (beats per minute, `beats` to a bar) that make a song last
// `seconds`, the tempo as close to the style's span as it can be; dbl: the section length that fits those bars.
export function fitLength(seconds, beats, phrase, span) {
  // even bar counts: a section is two phrases, so the clip's phrase is half its section
  const step = Math.max(2, phrase / 2), mid = (span[0] + span[1]) / 2;
  let best = null;
  for (let bars = Math.max(2, step); bars <= 512; bars += step) {
    const bpm = bars * beats * 60 / seconds, miss = bpm < span[0] ? span[0] - bpm : bpm > span[1] ? bpm - span[1] : 0;
    const score = miss * 10 + Math.abs(bpm - mid) / 100;
    if (!best || score < best.score) best = { bars, bpm, score };
  }
  const { bars } = best, dbl = bars >= 2 * phrase && bars % (2 * phrase) === 0 ? 2 * phrase : bars >= phrase && bars % phrase === 0 ? phrase : bars;
  return { bars, bpm: Math.round(best.bpm * 1000) / 1000, dbl };
}

// Plan of one song: parts, tempo, key, length, sections with chords, shape, candidate tracks.
// opts.fit: seconds, a clip of that exact length that starts at full energy (#5)
export function planSong({ parts, byId, prev, opts, rng, index }) {
  const R = withDefaults(partRecipe(parts, byId));
  // compatible harmony (#23): a tempo a transition can ramp to, and a key a fifth away, when the style allows
  const compatible = prev && harmonyOf(opts) === 'compatible';
  const near = compatible ? [Math.max(R.tempo[0], prev.bpm - MAX_RAMP), Math.min(R.tempo[1], prev.bpm + MAX_RAMP)] : null;
  const span = near && near[0] <= near[1] ? near : R.tempo;
  const P = rng.plan;
  let bpm = Math.round(Math.min(span[1], P.range(span[0], span[1] + 0.999)));
  const meter = P.pick(R.meters), swing = round(P.range(R.swing[0], R.swing[1]));
  const fifths = compatible ? R.keys.filter(k => fifthApart(k, prev.key)) : [];
  const key = fifths.length ? P.pick(fifths) : pickOther(P, R.keys, prev && prev.key);
  // an artist's favourite shapes, among those the style allows (not the previous song's when another is possible)
  const liked = opts.shapeWeights && pickWeighted(rng.artist, opts.shapeWeights, R.shapes.filter(x => x !== (prev && prev.shape)).length ? R.shapes.filter(x => x !== (prev && prev.shape)) : R.shapes);
  let shape = liked || pickOther(P, R.shapes, prev && prev.shape);
  let phrase = R.phrase;
  const beats = meterSteps(meter) / 4;
  let dbl = 2 * phrase, bars;
  const secondsOf = b => b * beats * 60 / bpm;
  if (opts.fit) {
    // a clip: exact length, a steady groove at full energy from the first bar
    const f = fitLength(opts.fit, beats, phrase, R.tempo);
    bars = f.bars; bpm = f.bpm; dbl = f.dbl; phrase = dbl / 2; shape = 'flat-groove';
  } else {
    const lo = Math.max(2, R.minutes[0]), hi = Math.min(6, R.minutes[1]);
    bars = Math.max(2, Math.round(P.range(lo, hi) * 60 / (beats * 60 / bpm) / dbl)) * dbl;
    while (secondsOf(bars) < 120) bars += dbl;
    while (secondsOf(bars) > 360 && bars > 2 * dbl) bars -= dbl;
  }
  const doubles = bars / dbl;
  let plan = applyPlanQuirks(shapePlan(shape, doubles, opts.fit ? Math.max(opts.energy, 0.75) : opts.energy), shape, opts);
  // a clip has no intro or outro: the groove at full energy from start to end
  if (opts.fit) plan = plan.map(p => ({ ...p, role: 'groove', target: Math.max(p.target, 0.75) }));
  // sections: consecutive double phrases with the same role; big moments take the second progression
  const mainChords = P.pick(R.progressions), liftChords = P.chance(0.5) ? pickOther(P, R.progressions, mainChords) : mainChords;
  const sections = sectionsOf(plan, { dbl, bpm, key, meter, swing, mainChords, liftChords });
  // the listener's sounds die (#50): other instruments and kits within the same styles, from its own stream
  const S = opts.sounds ? stream(`${opts.seed}:${opts.sounds}`, `sounds/${index}`) : null;
  const tracks = candidateTracks(R, meter, opts.complexity, S || P, S ? S.fork('mutation') : rng.mutation, opts);
  // composed, varied or saved material (material-generator): from the material streams, never at complexity 0
  const material = applyMaterial(tracks, R, opts.complexity, opts, { seed: opts.seed, index, key, chords: mainChords, meter, targets: plan.map(d => d.target), parts, entry: ENTRY });
  const usual = R.tracks.usual, hardMax = opts.complexity > 0.8 ? Math.max(R.tracks.max, 8) + 2 : Math.min(R.tracks.max, 8);
  const usualHigh = clamp(usual[1] + Math.round((opts.complexity - 0.5) * 2), usual[0], hardMax);
  const voice = voiceFor(R, opts, rng.voice);
  // (voice-controls: the options' extra draws come from a stream of their own, so the default draws as before)
  // (a single song with the voice instrument on, from a style without one, speaks with the speakers of the styles that
  // have one: their vocabulary samples exist)
  const spokenSpeakers = [...new Set(Object.values(byId).flatMap(r => (r.spoken && r.spoken.speakers) || []))];
  const spoken = spokenFor(R, opts, voice, rng.spoken || stream(String(opts.seed), 'spoken'), stream(String(opts.seed), `spoken-more/${index}`), spokenSpeakers);
  return { index, parts, R, voice, spoken, bpm, meter, swing, key, shape, phrase, bars, seconds: secondsOf(bars), plan, sections, tracks, usualHigh, hardMax, mainChords, liftChords, material };
}

// A part takes the strong progression on a big moment, or when the listener set a high tension (#40).
export const CHARGE = 0.7;
const curveOf = (d, c) => (d && d.curves && Number.isFinite(d.curves[c]) ? d.curves[c] : null);
export const liftOf = d => LANDMARKS.includes(d.role) || curveOf(d, 'tension') >= CHARGE;
// the part before a drop with a high tension builds a charge that the drop releases
const chargeOf = (plan, d) => plan[d].role !== 'drop' && (plan[d + 1] || {}).role === 'drop' && curveOf(plan[d], 'tension') >= CHARGE;

// Sections of an energy plan: consecutive double phrases with the same role; big moments take the second
// progression. h: { dbl, bpm, key, meter, swing, mainChords, liftChords }.
export function sectionsOf(plan, h) {
  const sections = [], seen = {};
  plan.forEach(d => {
    const last = sections[sections.length - 1], chords = liftOf(d) ? h.liftChords : h.mainChords;
    if (last && last.role === d.role && last.chords === chords) { last.bars += h.dbl; return; }
    seen[d.role] = (seen[d.role] || 0) + 1;
    const name = cap(d.role) + (seen[d.role] > 1 ? ` ${seen[d.role]}` : '');
    const sec = { role: d.role, name, bars: h.dbl, bpm: h.bpm, key: h.key, chords, meter: h.meter };
    if (h.swing > 0) sec.swing = h.swing;
    sections.push(sec);
  });
  return sections;
}

// ---------- voice ----------

// Characters and limits of a voice live in src/song/format.js (the voice instrument uses them too)
export { VOICE_CHARACTERS, VOICE_LIMITS };
// rack devices a voice can get, with the ranges of their values
const VOICE_DEVICES = {
  crush: { bits: [4, 9] }, coarse: { amount: [3, 14] }, phaser: { rate: [0.3, 4], depth: [0.4, 0.9] },
  tremolo: { rate: [4, 16], depth: [0.4, 0.85] }, vowel: { vowel: ['a', 'e', 'i', 'o', 'u'] }, echo: { count: [2, 4], feedback: [0.3, 0.6] },
};
// The voice of one song: the style's base (its ranges widened, wider with more chaos; a speaker among the style's),
// sometimes a wild value for a knob the style leaves alone, sometimes another speaker, a character on top and one or
// two effects in its rack (#66). More chaos, more variety.
export function voiceFor(R, opts, rng) {
  const base = { ...VOICE_DEFAULT }, v = R.voice || {}, chaos = opts.chaos ?? 0.3;
  const clampTo = (k, x) => (VOICE_LIMITS[k] ? Math.max(VOICE_LIMITS[k][0], Math.min(VOICE_LIMITS[k][1], x)) : x);
  for (const [k, x] of Object.entries(v)) {
    if (k === 'speaker' || k === 'speakers') continue;
    if (!Array.isArray(x)) { base[k] = x; continue; }
    const c = (x[0] + x[1]) / 2, h = ((x[1] - x[0]) / 2) * (1.6 + chaos);
    base[k] = round(clampTo(k, rng.range(c - h, c + h)));
  }
  const free = Object.keys(VOICE_LIMITS).filter(k => !Array.isArray(v[k]));
  for (const k of rng.shuffle(free).slice(0, rng.chance(0.3 + 0.4 * chaos) ? rng.int(1, 2) : 0)) base[k] = round(rng.range(...VOICE_LIMITS[k]));
  const own = Array.isArray(v.speakers) && v.speakers.length ? v.speakers : [v.speaker ?? ''];
  base.speaker = rng.chance(0.15 + 0.3 * opts.chaos) ? rng.pick(['', ...SPEAKERS]) : rng.pick(own);
  let character = null;
  const chance = opts.voiceChance ?? 0.4 + 0.4 * opts.chaos;
  if (rng.chance(chance)) { character = (opts.voiceCharacters && pickWeighted(rng, opts.voiceCharacters)) || rng.pick(Object.keys(VOICE_CHARACTERS)); Object.assign(base, VOICE_CHARACTERS[character]); }
  const rack = [];
  if (rng.chance(0.25 + 0.4 * chaos)) for (const name of rng.shuffle(Object.keys(VOICE_DEVICES)).slice(0, rng.int(1, 2))) {
    const dev = { device: name };
    for (const [k, r] of Object.entries(VOICE_DEVICES[name])) dev[k] = typeof r[0] === 'string' ? rng.pick(r) : Number.isInteger(r[0]) && Number.isInteger(r[1]) ? rng.int(r[0], r[1]) : round(rng.range(r[0], r[1]));
    rack.push(dev);
  }
  return { settings: base, character, rack };
}

// ---------- voice instrument (voice-instrument, D7) ----------

// rhythms of a chopped word: slices of a phrase on the steps of a bar (eighths)
export const CHOP_RHYTHMS = ['0 1 0 1 2 2 3 ~', '0 ~ 1 ~ 2 3 ~ 3', '0 0 ~ 1 ~ 2 ~ 3', '~ 0 ~ 1 ~ 2 3 3'];
// The voice instrument of one song, or null: drawn with the style's weight as its chance, on its own stream. One line:
// its way by the style's weights, its text from the style's lines for that way, else the vocabulary (a group the style
// names, else one drawn); a speaker among the style's that is not the narrator's.
// voice-controls (#77): the options (opts.voice, voice-options.js) change how often a song gets one (never, the style's
// weight, often: twice the weight up to 0.9, always), the ways it may use and how many phrases it speaks. The default
// draws exactly as before; the other phrases and their lines come from `more`, a stream of their own.
export function spokenFor(R, opts, voice, rng, more = null, speakers = []) {
  const V = voiceOption(opts.voice);
  let sp = R.spoken;
  if (V) {
    if (V.presence === 'never' || !((opts.complexity ?? OPTION_DEFAULTS.complexity) > 0)) return null;
    // (a single song with the voice instrument on, from a style without one: every way, a vocabulary line, a speaker of
    // the styles that have one)
    if (V.presence === 'always' && !(sp && sp.weight > 0)) sp = { ...(sp || {}), ...SPOKEN_FALLBACK, speakers: speakers.length ? speakers : (sp && sp.speakers) || [] };
    const chance = !sp || !(sp.weight > 0) ? 0 : V.presence === 'always' ? 1 : V.presence === 'often' ? Math.min(0.9, sp.weight * 2) : sp.weight;
    if (!(chance > 0) || !rng.chance(chance)) return null;
  // (complexity 0 keeps the plain songs of the director's version 2: no voice instrument)
  } else if (!sp || !(sp.weight > 0) || !((opts.complexity ?? OPTION_DEFAULTS.complexity) > 0) || !rng.chance(sp.weight)) return null;
  // (ways chosen by the options: each as likely)
  const w = V && V.ways ? Object.fromEntries(V.ways.map(k => [k, 1])) : sp.ways && Object.keys(sp.ways).length ? sp.ways : { refrain: 1 }, ways = Object.keys(w).filter(k => w[k] > 0);
  if (!ways.length) return null;
  const way = rng.weighted(ways, ways.map(k => w[k]));
  const lines = (sp.lines && sp.lines[way]) || [];
  const text = lines.length ? rng.pick(lines) : `vocab:${VOCAB_GROUPS.includes(sp.vocab) ? sp.vocab : rng.pick(VOCAB_GROUPS)}`;
  const nar = (voice && voice.settings && voice.settings.speaker) || '';
  const own = (sp.speakers || []).filter(x => x && x !== nar), speaker = rng.pick(own.length ? own : SPEAKERS.filter(x => x !== nar));
  const settings = { ...VOICE_DEFAULT, gain: 0.5, room: 0.3, speaker };
  // a character now and then (more often on a chop, which may go further)
  if (rng.chance(way === 'chop' ? 0.6 : 0.25 + 0.3 * (opts.chaos ?? 0.3))) Object.assign(settings, VOICE_CHARACTERS[rng.pick(way === 'chop' ? ['robot', 'radio', 'dirty', 'echo'] : ['radio', 'deep', 'cathedral', 'echo', 'slow'])]);
  const pat = { way, text, ...(way === 'refrain' ? { every: rng.pick([2, 4]) } : {}), ...(way === 'chop' ? { slices: 8, rhythm: rng.pick(CHOP_RHYTHMS) } : {}) };
  const out = { track: { id: 'words', name: 'Words', type: 'spoken', settings, patterns: { A: pat } }, way };
  if (!V || !more) return out;
  const [lo, hi] = PHRASE_RANGES[V.phrases] || [1, 1], n = more.int(lo, hi);
  if (n <= 1) return out;
  const phrases = morePhrases(sp, V, out.track.patterns, ways, w, n, more);
  if (phrases.length > 1) out.phrases = phrases;
  return out;
}
// a style with no voice instrument of its own, for a single song with the voice instrument on (voice-controls)
const SPOKEN_FALLBACK = { weight: 1, ways: Object.fromEntries(VOICE_WAYS.map(k => [k, 1])) };
// Several phrases (voice-controls D4): n phrases in order, [{ key, way }], each a pattern of the spoken track (A is the
// line drawn above). different: a new line each time; repeated: A every time; mixed: A, a new line, A, another one…
// A new line: one of the style's lines for its way not used yet, else a vocabulary entry not used yet (written out, so
// two lines are never the same; a chop of A from the vocabulary is written out too, for the same reason). The lines run
// out: fewer phrases (the count is a ceiling).
export function morePhrases(sp, V, patterns, ways, w, n, more) {
  const A = patterns.A, keyOf = x => (typeof x === 'string' ? x : x && x.en) || '';
  const group = VOCAB_GROUPS.includes(sp.vocab) ? sp.vocab : typeof A.text === 'string' && A.text.startsWith('vocab:') ? A.text.slice(6) : more.pick(VOCAB_GROUPS);
  const used = new Set([keyOf(A.text)]), pool = more.shuffle(VOCABULARY[group]);
  const newLine = way => {
    const own = ((sp.lines && sp.lines[way]) || []).filter(x => !used.has(keyOf(x)));
    const x = own.length ? more.pick(own) : pool.find(e => !used.has(keyOf(e)));
    if (!x) return null;
    used.add(keyOf(x));
    return typeof x === 'string' ? x : { ...x };
  };
  if (V.kind !== 'repeated' && A.way === 'chop' && typeof A.text === 'string' && A.text.startsWith('vocab:')) { const x = newLine('chop'); if (x) A.text = x; }
  const out = [], keys = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
  let k = 0;
  for (let j = 0; j < n; j++) {
    if (j === 0 || V.kind === 'repeated' || (V.kind === 'mixed' && j % 2 === 0)) { out.push({ key: 'A', way: A.way }); continue; }
    const way = more.weighted(ways, ways.map(x => w[x])), text = newLine(way);
    if (!text) break;
    const key = keys[k++];
    patterns[key] = { way, text, ...(way === 'refrain' ? { every: more.pick([2, 4]) } : {}), ...(way === 'chop' ? { slices: 8, rhythm: more.pick(CHOP_RHYTHMS) } : {}) };
    out.push({ key, way });
  }
  return out;
}
// where the voice instrument plays in a directed song: a clip and the bar it comes in. A refrain is in the whole song
// (its lines only sound in the quiet sections); a passage in the first break (else the intro, else the outro); a chop
// in the first groove or drop where fewer tracks than the usual most play (it counts as a layer); an opening in the
// first section, its line ending before the next track comes in.
function spokenPlace(plan, steps, base) {
  const secs = []; let at = 0;
  for (const s of plan.sections) { secs.push({ ...s, start: at }); at += s.bars; }
  const way = plan.spoken.way, find = roles => roles.map(r => secs.find(s => s.role === r)).find(Boolean);
  if (way === 'refrain') return { start: 0, bars: plan.bars };
  if (way === 'opening') {
    // the bars before the next track comes in that the line needs (its length estimated from its words, a beat to
    // spare): the clip ends where that track enters, so the line ends before it
    const next = steps.filter(s => s.at > 0 && s.add !== undefined).sort((a, b) => a.at - b.at)[0];
    if (!next) return { start: 0, bars: secs[0].bars };
    const t = plan.spoken.track.patterns.A.text, wordsOf = typeof t === 'string' ? (t.startsWith('vocab:') ? 3 : t.split(/\s+/).length) : String(t.en || '').split(/\s+/).length;
    const bpb = meterSteps(plan.meter) / 4, beats = (wordsOf * 0.38 + 0.3) * plan.bpm / 60 / ((plan.spoken.track.settings || {}).tempo || 1);
    const k = Math.min(next.at, Math.ceil((beats + 1) / bpb));
    return { start: next.at - k, bars: k };
  }
  if (way === 'passage') { const s = find(['break', 'intro', 'outro']) || secs[0]; return { start: s.start, bars: s.bars }; }
  const count = bar => playing(stateAt(working(base, steps), bar).song).length;
  const s = secs.find(x => ['groove', 'drop', 'build', 'peak'].includes(x.role) && count(x.start) < plan.usualHigh) || secs.find(x => x.role !== 'intro' && x.role !== 'outro') || secs[0];
  return { start: s.start, bars: s.bars };
}

// Where several phrases play (voice-controls D4): one clip per phrase, each in a quiet part (a phrase of the plan, 8
// bars or so, in an intro, a break or an outro, or one where few tracks play), at most one phrase per part, spread over
// the song. A refrain only speaks in an intro, a break or an outro (placeSpoken), so it goes to one of those. A phrase
// that finds no part is dropped (the count is a ceiling).
function spokenParts(plan, steps, base) {
  const len = plan.phrase, song = working(base, steps), few = Math.max(2, Math.floor(plan.usualHigh / 2));
  const parts = Array.from({ length: Math.ceil(plan.bars / len) }, (_, k) => ({ start: k * len, named: ['intro', 'break', 'outro'].includes((plan.plan[Math.floor(k / 2)] || {}).role) }))
    .filter(p => p.named || playing(stateAt(song, p.start).song).length <= few);
  const list = plan.spoken.phrases, N = list.length;
  const chosen = parts.length <= N ? parts.map((_, i) => i) : Array.from({ length: N }, (_, j) => Math.round(j * (parts.length - 1) / Math.max(1, N - 1)));
  const fits = (ph, p) => ph.way !== 'refrain' || p.named, taken = new Set(), clips = [];
  list.forEach((ph, j) => {
    if (j >= chosen.length) return;
    let i = chosen[j];
    if (taken.has(i) || !fits(ph, parts[i])) {
      // the nearest free part it fits in, not one kept for a later phrase
      const later = chosen.slice(j + 1);
      i = parts.map((_, x) => x).filter(x => !taken.has(x) && !later.includes(x) && fits(ph, parts[x])).sort((a, b) => Math.abs(a - i) - Math.abs(b - i) || a - b)[0];
      if (i === undefined) return;
    }
    taken.add(i);
    const p = parts[i];
    clips.push({ start: p.start, bars: Math.min(len, plan.bars - p.start), pattern: ph.key });
  });
  return clips.sort((a, b) => a.start - b.start);
}

// ---------- moves ----------

const KIND_OF_ADD = { drums: 'add-drums', bass: 'add-bass', arp: 'add-lead', hook: 'add-lead', pad: 'add-pad', guitar: 'add-guitar', texture: 'add-texture', riser: 'add-riser' };
const SPACE = ['delay', 'reverb'], DIRT = ['distort', 'crush', 'phaser'];

// every move allowed on a boundary, given the current state
export function candidateMoves(state, ctx, blocked, rng) {
  const out = [], on = playing(state), byId = id => state.tracks.find(t => t.id === id);
  for (const t of state.tracks) {
    if (t.type === 'voice' || t.type === 'riser' || t.type === 'spoken' || blocked.has(t.id)) continue;
    const isOn = !t.mute;
    if (!isOn) { if (on.length < ctx.hardMax) out.push({ kind: KIND_OF_ADD[t.type], track: t.id, step: { add: t.id } }); continue; }
    const drumsOn = on.filter(x => x.type === 'drums').length;
    if (on.length > 1) out.push({ kind: 'strip', track: t.id, step: { remove: t.id }, lastDrum: t.type === 'drums' && drumsOn === 1 });
    const cur = (t.clips[0] || {}).pattern, pats = Object.keys(t.patterns);
    if (pats.length > 1) out.push({ kind: 'variation', track: t.id, step: { pattern: { track: t.id, to: pats[(pats.indexOf(cur) + 1) % pats.length] } } });
    const s = t.settings || {};
    if (MELODIC.includes(t.type) && Number.isFinite(s.cutoff)) {
      if (s.cutoff < 6000) out.push({ kind: 'brighter', track: t.id, step: { set: { track: t.id, cutoff: Math.round(Math.min(8000, s.cutoff * 1.6)) } } });
      if (s.cutoff > 300) out.push({ kind: 'darker', track: t.id, step: { set: { track: t.id, cutoff: Math.round(Math.max(200, s.cutoff / 1.6)) } } });
    }
    if (['bass', 'guitar', 'drums'].includes(t.type)) {
      const d = s.drive || 0;
      if (d < 2.5) out.push({ kind: 'dirtier', track: t.id, step: { set: { track: t.id, drive: round(Math.min(3, d + 0.7)) } } });
      if (d > 0) out.push({ kind: 'cleaner', track: t.id, step: { set: { track: t.id, drive: round(Math.max(0, d - 0.7)) } } });
    }
    if (MELODIC.includes(t.type)) {
      const have = (byId(t.id).rack || []).map(d => d.device);
      // held pads clip with distortion: they only get space or colour; distortion stays gentle (the default 2 clips held chords)
      const free = [...SPACE, ...DIRT].filter(d => !have.includes(d) && !(t.type === 'pad' && d === 'distort'));
      if (free.length && have.length < 2) {
        const dev = rng.pick(free), extra = dev === 'distort' ? { amount: 0.8 } : dev === 'crush' ? { bits: 8 } : {};
        out.push({ kind: SPACE.includes(dev) ? 'more-space' : 'dirtier', track: t.id, step: { rack: { track: t.id, device: dev, ...extra } } });
      }
      if (have.length) out.push({ kind: 'cleaner', track: t.id, step: { unrack: { track: t.id, device: have[0] } } });
    }
  }
  return out;
}

// the song as the director sees it while writing: every track muted until a step adds it
const working = (base, steps) => ({ ...base, build: steps });
const measure = (song, bar, ctx) => energyOf(stateAt(song, bar).song, ctx);

const stepIds = s => [...['add', 'remove'].flatMap(k => (s[k] === undefined ? [] : Array.isArray(s[k]) ? s[k] : [s[k]])), ...['set', 'pattern', 'rack', 'unrack'].filter(k => s[k]).map(k => s[k].track)];

// Writes the steps of a planned song: phrase by phrase, moves toward the target energy.
// steer (radio steering, #24, steering.js): keep = steps before the boundary "from", kept as they are;
// forced = { boundary: [moves] } taken before the ordinary ones; locked = track ids no move may touch.
export function directSong(plan, opts, rng, comments, steer = {}) {
  const { phrase, bars, R } = plan;
  const { keep = [], from = 0, forced = {}, locked = [] } = steer;
  const ctx = { usual: plan.usualHigh, weights: R.energy, hardMax: plan.hardMax };
  const voice = { id: 'voice', name: 'Voice', type: 'voice', settings: plan.voice.settings, patterns: {}, clips: [] };
  if (plan.voice.rack && plan.voice.rack.length) voice.rack = plan.voice.rack;
  const base = { tracks: [...plan.tracks.map(t => ({ ...t, mute: true, clips: [{ start: 0, bars, pattern: 'A' }] })), voice] };
  if (plan.spoken) base.tracks.splice(base.tracks.length - 1, 0, { ...JSON.parse(JSON.stringify(plan.spoken.track)), mute: true, clips: [{ start: 0, bars, pattern: 'A' }] });
  const steps = keep.map(s => ({ ...s })), phrases = [], moved = new Map(); // track id → boundary index of its last move
  const M = rng.moves;
  let lastKind = '', lastSay = -Infinity, brokeDrums = [];
  // the memory of the loop, from the kept steps
  for (const s of steps) { for (const id of stepIds(s)) moved.set(id, Math.floor(s.at / phrase)); if (s.say) lastSay = Math.max(lastSay, s.at); }
  if (from > 0) {
    const st = stateAt(working(base, steps), from * phrase).song, added = new Set(steps.flatMap(s => stepIds(s)));
    brokeDrums = st.tracks.filter(t => t.type === 'drums' && t.mute && added.has(t.id)).map(t => t.id);
  }
  const boundaries = bars / phrase;
  const say = (kind, at) => { lastSay = at; return pickPhrase(kind, comments); };
  for (let k = from; k < boundaries; k++) {
    const at = k * phrase, d = Math.floor(k / 2), { role, target } = plan.plan[d];
    const isDouble = k % 2 === 0, prevRole = d > 0 ? plan.plan[d - 1].role : null;
    // the listener's curves for this part (#40): set ones are soft targets next to energy
    const part = plan.plan[d], lift = liftOf(part), charge = chargeOf(plan.plan, d), released = d > 0 && role === 'drop' && chargeOf(plan.plan, d - 1);
    const setCurves = ['density', 'brightness', 'tension'].filter(c => curveOf(part, c) !== null);
    const curveGap = song => {
      if (!setCurves.length) return 0;
      const m = curveParts(stateAt(song, at).song, { lift });
      return setCurves.reduce((a, c) => a + (c === 'density' ? Math.abs(m.density - curveOf(part, c)) / Math.max(3, plan.usualHigh) : Math.abs(m[c] - curveOf(part, c))), 0);
    };
    const landmark = isDouble && role !== prevRole && LANDMARKS.includes(role);
    const nextRole = k % 2 === 1 && d + 1 < plan.plan.length ? plan.plan[d + 1].role : null;
    // tracks that cannot move now: moved on the previous boundary, or needed by a big event on the next one
    const blocked = new Set([...[...moved].filter(([, b]) => b === k - 1).map(([id]) => id), ...locked]);
    // a listener's kept step on this boundary (a vary, radio-variation) holds its track there
    for (const s of keep) if (s.by === 'listener' && s.pattern && s.at === k * phrase) stepIds(s).forEach(id => blocked.add(id));
    if (nextRole === 'break' || nextRole === 'drop') base.tracks.filter(t => t.type === 'drums').forEach(t => blocked.add(t.id));
    const hardEnd = has(opts, 'hard-endings') && boundaries > 2;
    if (hardEnd && k === boundaries - 2) base.tracks.forEach(t => blocked.add(t.id));
    const chosen = [];
    const take = move => { chosen.push(move); steps.push({ at, ...move.step }); (move.tracks || [move.track]).forEach(id => { moved.set(id, k); blocked.add(id); }); };
    let state = stateAt(working(base, steps), at).song;
    // the listener's moves come first on their boundary (they ignore the one-move-per-track rule, not the locks)
    for (const f of forced[k] || []) {
      const ids = f.tracks || [f.track];
      if (ids.some(id => locked.includes(id) && !f.mixer)) continue;
      take({ ...f, by: 'listener' }); steps[steps.length - 1].by = 'listener';
    }
    state = stateAt(working(base, steps), at).song;

    if (k === 0 && !(forced[0] || []).length) {
      // start: the first one or two instruments in the usual entry order
      const order = state.tracks.filter(t => t.type !== 'voice' && t.type !== 'riser' && t.type !== 'spoken').sort((a, b) => ENTRY.indexOf(a.type) - ENTRY.indexOf(b.type));
      let first = order.slice(0, has(opts, 'slow-builds') ? 1 : target > 0.35 || order.length < 3 ? 2 : 1).map(t => t.id);
      const tex = has(opts, 'texture-first') && order.find(t => t.type === 'texture');
      if (tex && !first.includes(tex.id)) first = [...first.slice(0, 1), tex.id];
      if (first.length) take({ kind: 'song-start', track: first[0], tracks: first, step: { add: first } });
    } else if (hardEnd && k === boundaries - 1) {
      const all = playing(state).filter(t => t.type !== 'voice').map(t => t.id);
      if (all.length) take({ kind: 'song-end', track: all[0], tracks: all, step: { remove: all } });
    } else if (landmark && role === 'break') {
      const drums = playing(state).filter(t => t.type === 'drums').map(t => t.id);
      if (drums.length && playing(state).length > drums.length) { brokeDrums = drums; take({ kind: 'break', track: drums[0], tracks: drums, step: { remove: drums } }); }
    } else if (landmark && role === 'drop' && brokeDrums.length) {
      const back = brokeDrums.filter(id => state.tracks.find(t => t.id === id).mute);
      if (back.length) take({ kind: 'drop', track: back[0], tracks: back, step: { add: back } });
      brokeDrums = [];
    }
    const riser = base.tracks.find(t => t.type === 'riser');
    // the charge before a drop: the riser from the first phrase, fewer drums on the last one (the drop brings them back)
    if (charge && k > 0) {
      state = stateAt(working(base, steps), at).song;
      const r = riser && state.tracks.find(t => t.id === riser.id);
      if (isDouble && r && r.mute && !locked.includes(riser.id)) take({ kind: 'add-riser', track: riser.id, step: { add: riser.id } });
      if (!isDouble) {
        const drums = playing(state).filter(t => t.type === 'drums' && !locked.includes(t.id));
        if (drums.length) { const out = drums[drums.length - 1].id; brokeDrums = [...new Set([...brokeDrums, out])]; take({ kind: 'charge', track: out, step: { remove: out } }); }
      }
      state = stateAt(working(base, steps), at).song;
    }
    // riser: in the phrase before a big moment, out in the phrase after it
    if (riser && !blocked.has(riser.id)) {
      const r = state.tracks.find(t => t.id === riser.id);
      if (r.mute && nextRole && nextRole !== role && LANDMARKS.includes(nextRole) && nextRole !== 'break') take({ kind: 'add-riser', track: riser.id, step: { add: riser.id } });
      else if (!r.mute && moved.get(riser.id) === k - 2) take({ kind: 'strip', track: riser.id, step: { remove: riser.id }, quiet: true });
    }
    // ordinary moves toward the target
    state = stateAt(working(base, steps), at).song;
    const gap = Math.abs(measure(working(base, steps), at, ctx) - target);
    let want = (k === 0 ? 0 : 1) + (gap > 0.2 ? 1 : 0) + (landmark && gap > 0.35 ? 1 : 0) - chosen.filter(c => !c.quiet && c.kind !== 'charge').length + (k === 0 ? 0 : 0);
    if (k > 0 && setCurves.length && curveGap(working(base, steps)) > 0.25) want++;
    if (charge && k > 0) want = Math.max(want, 1);
    // an artist's pace: busy artists add a move, calm ones sometimes let a phrase go by
    if (opts.pace !== undefined && k > 0) { if (opts.pace > 0.7) want++; else if (opts.pace < 0.3 && gap < 0.15 && M.chance(0.6)) want = 0; }
    const slow = has(opts, 'slow-builds') && k > 0 && k < boundaries / 2;
    if (slow) want = Math.min(want, 1);
    if (hardEnd && k >= boundaries - 2) want = 0;
    for (let i = 0; i < want; i++) {
      state = stateAt(working(base, steps), at).song;
      const e0 = energyOf(state, ctx);
      let cands = candidateMoves(state, ctx, blocked, M);
      // after the intro, below the usual count of tracks, the first move adds one (taste rule: 4 to 5 layers)
      // (not when the listener asked for fewer tracks, #40)
      const fewer = curveOf(part, 'density') !== null && curveOf(part, 'density') < R.tracks.usual[0];
      if (k >= 2 && i === 0 && !fewer && playing(state).length < R.tracks.usual[0] && !['break', 'outro'].includes(role)) {
        const adds = cands.filter(c => c.step.add !== undefined);
        if (adds.length) cands = adds;
      }
      if (!cands.length) break;
      let best = null;
      for (const c of cands) {
        const e = measure(working(base, [...steps, { at, ...c.step }]), at, ctx);
        let score = -Math.abs(e - target);
        if (c.kind === lastKind) score -= 0.03;
        const count = playing(stateAt(working(base, [...steps, { at, ...c.step }]), at).song).length;
        const high = Math.max(plan.usualHigh, curveOf(part, 'density') ?? 0);
        if (count > high) score -= 0.08 * (count - high);
        // below the usual count, prefer adding, and in the usual entry order (drums, bass, pads, …)
        const low = fewer ? curveOf(part, 'density') : R.tracks.usual[0], before = playing(state).length;
        if (k > 0 && before < low && c.step.add !== undefined) score += 0.06 + 0.03 * (1 - ENTRY.indexOf(state.tracks.find(t => t.id === c.track).type) / ENTRY.length);
        if (k > 0 && count < low && c.step.remove !== undefined) score -= 0.06;
        if (c.lastDrum && role !== 'break') score -= 0.3;
        if (Math.abs(e0 - target) < 0.08 && ['variation', 'more-space', 'brighter', 'darker', 'dirtier', 'cleaner'].includes(c.kind)) score += 0.04;
        if (opts.moveWeights && opts.moveWeights[c.kind]) score += 0.015 * opts.moveWeights[c.kind];
        if (slow && c.step.add !== undefined) score += 0.5;
        if (setCurves.length) score -= curveGap(working(base, [...steps, { at, ...c.step }]));
        if (charge) score += { darker: 0.05, dirtier: 0.05, brighter: -0.05, cleaner: -0.05 }[c.kind] || 0;
        if (released && isDouble) score += { brighter: 0.06, darker: -0.06 }[c.kind] || 0;
        score += M.range(0, 0.02);
        if (!best || score > best.score) best = { ...c, score };
      }
      take(best);
      lastKind = best.kind;
    }
    // comment: always on the start, big events and the song end; about half of the other boundaries; never closer than 8 bars
    const main = chosen.find(c => !c.quiet) || chosen[0];
    const isEnd = k === boundaries - 2;
    let said = null;
    const talk = curveOf(part, 'voice') ?? opts.talk ?? OPTION_DEFAULTS.talk;
    if (main && talk > 0 && at - lastSay >= 8) {
      // (a listener's move may name the phrase it says: an added instrument, another sound)
      const kind = isEnd ? 'song-end' : main.phrase || main.kind;
      if (k === 0 || isEnd || ['break', 'drop'].includes(kind) || comments.chance(Math.min(1, 1.1 * talk))) said = say(kind, at);
    }
    if (said) { const first = steps.find(s => s.at === at); first.say = said; }
    phrases.push({ bar: at, role, target: round(target), moves: chosen.map(c => `${c.kind} ${(c.tracks || [c.track]).join('+')}`), say: said ? said.en : null });
  }
  // the voice instrument (voice-instrument): it comes in on the bar its clip starts (kept steps stay as they are)
  if (plan.spoken) {
    const sp = base.tracks.find(t => t.type === 'spoken');
    // several phrases (voice-controls): a clip each in the quiet parts; the patterns no clip uses are left out
    if (plan.spoken.phrases) {
      sp.clips = spokenParts(plan, steps, base);
      const keys = new Set(sp.clips.map(c => c.pattern));
      sp.patterns = Object.fromEntries(Object.entries(sp.patterns).filter(([k]) => keys.has(k)));
      if (sp.clips.length && sp.clips[0].start >= from * phrase && !steps.some(s => s.add === sp.id)) steps.push({ at: sp.clips[0].start, add: sp.id });
    } else {
      const c = spokenPlace(plan, steps, base);
      sp.clips = [{ start: c.start, bars: c.bars, pattern: 'A' }];
      // an opening line ends before the next track that comes in
      if (plan.spoken.way === 'opening') { const next = steps.filter(s => s.at > 0 && s.add !== undefined).sort((a, b) => a.at - b.at)[0]; if (next) sp.patterns = { A: { ...sp.patterns.A, before: [].concat(next.add)[0] } }; }
      if (c.start >= from * phrase && !steps.some(s => s.add === sp.id)) steps.push({ at: c.start, add: sp.id });
    }
  }
  // tracks never added would play from the start: leave them out; the others need no base mute
  const used = new Set(steps.flatMap(s => (s.add === undefined ? [] : Array.isArray(s.add) ? s.add : [s.add])));
  const tracks = base.tracks.filter(t => t.type === 'voice' || used.has(t.id)).map(({ mute, ...t }) => t);
  return { tracks, steps, phrases, ctx };
}

// ---------- titles and session ----------

function titleOf(styles, byId, rng) {
  const words = n => { const out = []; for (let i = 0; i < 20 && out.length < n; i++) { const r = byId[rng.pick(styles)], lang = rng.pick(['en', 'it', 'es']), w = rng.pick(r.words[lang]); if (!out.includes(w)) out.push(w); } return out; };
  return words(rng.chance(0.3) ? 1 : 2).join(' ');
}

// One song of the session: plan, steps, the v2 song and its session entry.
function makeSong({ parts, byId, prev, opts, rng, index, seed }) {
  const plan = planSong({ parts, byId, prev, opts, rng, index });
  const { tracks, steps, phrases, ctx } = directSong(plan, opts, rng, rng.comments);
  const styles = stylesOf(parts), title = titleOf(styles, byId, rng.titles);
  const names = lang => styles.map(id => byId[id].name[lang]).join(' + ');
  const song = {
    format: FORMAT, version: VERSION, id: `endless-${slug(seed)}-${index + 1}`, title,
    style: { en: `Endless · ${names('en')} · ${plan.key} · ${plan.bpm} BPM · ${plan.shape}`, it: `Endless · ${names('it')} · ${plan.key} · ${plan.bpm} BPM · ${plan.shape}` },
    tags: { styles }, origin: 'endless',
    sections: plan.sections.map(({ role, ...s }) => s), tracks, build: steps,
  };
  // the build style of the style that gives the drums (switch-styles): the song opens with it in Compose
  const bs = byId[parts.drums] && byId[parts.drums].buildStyle, pf = byId[parts.drums] && byId[parts.drums].profile;
  if (bs) song.buildStyle = bs;
  // and its performance profile (performance-profiles)
  if (pf) song.profile = pf;
  // the narrator style of the voice part's style (voice-instrument): poetic images instead of explanations
  if (plan.R.narrator !== undefined && opts.complexity > 0) song.narrator = JSON.parse(JSON.stringify(plan.R.narrator));
  // measured energy of the final song at each phrase
  for (const p of phrases) p.energy = round(measure(song, p.bar, ctx));
  const entry = { id: song.id, title, parts, styles, bars: plan.bars, seconds: Math.round(plan.seconds), bpm: plan.bpm, key: plan.key, meter: plan.meter, shape: plan.shape, phrase: plan.phrase, tracks: tracks.filter(t => t.type !== 'voice' && t.type !== 'spoken').length, voice: { speaker: plan.voice.settings.speaker, character: plan.voice.character }, usualHigh: plan.usualHigh, hardMax: plan.hardMax, phrases };
  if (plan.spoken && tracks.some(t => t.type === 'spoken')) entry.spoken = plan.spoken.way;
  // (several phrases, voice-controls: how many clips speak)
  if (plan.spoken && plan.spoken.phrases && tracks.some(t => t.type === 'spoken')) entry.phrasesSpoken = tracks.find(t => t.type === 'spoken').clips.length;
  // which tracks play composed, varied or saved material (material-generator)
  if (Object.keys(plan.material || {}).length) entry.material = { ...plan.material };
  return { song, entry, plan };
}

// A session that makes one song at a time (the radio, docs/ENDLESS.md "Incremental sessions").
// next(options) generates the next song with the options given (styles, chaos, energy, complexity);
// the random streams and the variety history carry over between calls, so the same seed and the same
// sequence of options always give the same songs. Without a seed, a new one is drawn and kept in .seed.
// lead (#29): an entry the session starts after (leadEntry, a song from Compose): the first song is planned
// after it (harmony, transition), the generated songs keep the same indexes and random streams.
export function createSession(recipes, seed, { lead = null } = {}) {
  if (seed === undefined || seed === null || seed === '') seed = freshSeed();
  const byId = Object.fromEntries(recipes.map(r => [r.id, withDefaults(r)]));
  const rng = makeRng(seed), entries = [];
  return {
    seed: String(seed),
    entries,
    lead,
    get count() { return entries.length; },
    next(options) {
      // with an artist, this song's styles and values come from the artist's taste
      const drawn = options && options.artist ? artistSongOptions(options.artist, Object.keys(byId), rng.artist) : null;
      const opts = { ...OPTION_DEFAULTS, ...options, ...(drawn || {}), seed };
      // renamed styles (clear-names): saved sessions and settings may hold old ids
      if (opts.styles) opts.styles = opts.styles.map(styleId);
      const unknown = (opts.styles || []).filter(id => !byId[id]);
      if (!opts.styles || !opts.styles.length || unknown.length) throw new Error(`unknown or missing styles: ${unknown.join(', ') || 'none'}`);
      const selected = opts.styles.map(id => byId[id]), i = entries.length;
      // parts: avoid the style-per-part combination of the last three songs when another one is possible
      const recent = entries.slice(-3).map(e => partsKey(e.parts));
      // an artist's dominant style comes first; without an artist the selection rotates song by song
      const at = drawn ? 0 : i;
      let parts = mixParts(selected, opts.chaos, at, rng.plan);
      for (let t = 0; t < 12 && recent.includes(partsKey(parts)) && selected.length > 1 && opts.chaos > 0; t++) parts = mixParts(selected, opts.chaos, at, rng.plan);
      const before = i > 0 ? entries[i - 1] : lead;
      const { song, entry, plan } = makeSong({ parts, byId, prev: before, opts, rng, index: i, seed });
      // the transition from the song before to this one (it needs both tempos)
      if (before) before.transition = planTransition(before, entry, opts, rng.transition);
      if (drawn) entry.artist = { id: options.artist.id, name: options.artist.name, chaos: opts.chaos, energy: opts.energy, complexity: opts.complexity, talk: opts.talk, pace: opts.pace, quirks: opts.quirks };
      // the profile the song plays with (radio-profiles D1): written only when it is not Classic, so Classic sessions
      // keep their entries as they were (compProfiles: the compilation setup's weights, when a compilation plays)
      const pr = songProfileOnAir(i, { seed, choice: opts.profile, compilation: opts.compProfiles || null, artist: options && options.artist, style: byId[parts.drums] });
      if (pr.profile !== 'classic') entry.profile = pr.profile;
      entries.push(entry);
      // a clip (#5) starts full: every track comes in on the first bar
      // (a voice line stays where it was)
      if (opts.fit && song.build) song.build = song.build.flatMap(st => {
        if (st.add === undefined || st.remove || st.set || st.pattern || st.at === 0) return [st];
        const { say, voice, ...rest } = st;
        return say ? [{ ...rest, at: 0 }, { at: st.at, say, ...(voice ? { voice } : {}) }] : [{ ...rest, at: 0 }];
      }).sort((x, y) => x.at - y.at);
      // plan and options stay with the song for steering (#24): the radio rewrites the song from them
      return { song, entry, plan, opts };
    },
  };
}

// The entry of a song the radio continues from (#29): what the next song needs to follow it (tempo and key of
// its last section, meter, length).
export function leadEntry(song) {
  const secs = song.sections || [], last = secs[secs.length - 1] || {}, bars = secs.reduce((a, s) => a + s.bars, 0);
  const bpm = Math.round(last.bpmEnd || last.bpm || song.bpm || 120), meter = last.meter || song.meter || '4/4';
  const seconds = secs.reduce((a, s) => a + s.bars * (meterSteps(s.meter || meter) / 4) * 60 / (s.bpm || bpm), 0);
  return { id: song.id, title: song.title, lead: true, parts: {}, styles: [], bars, seconds: Math.round(seconds), bpm, key: last.key || song.key || 'A', meter, shape: null, phrase: 8, phrases: [], sections: secs };
}

// Styles close to a song (#29): the known styles of its tags; else the styles of its genres closest in tempo;
// else the one to three styles closest in tempo and meter. Deterministic.
export function stylesNear(song, recipes) {
  const tags = song.tags || {}, byId = Object.fromEntries(recipes.map(r => [r.id, withDefaults(r)]));
  const tagged = (tags.styles || []).map(styleId).filter(id => byId[id]);
  if (tagged.length) return tagged;
  const e = leadEntry(song), dist = R => (e.bpm < R.tempo[0] ? R.tempo[0] - e.bpm : e.bpm > R.tempo[1] ? e.bpm - R.tempo[1] : 0) + (R.meters.includes(e.meter) ? 0 : 30);
  const rank = list => list.map(r => byId[r.id]).sort((a, b) => dist(a) - dist(b) || (a.id < b.id ? -1 : 1));
  const genres = tags.genres || [];
  const ofGenre = rank(recipes.filter(r => genres.includes(r.genre)));
  if (ofGenre.length) return ofGenre.slice(0, 2).map(r => r.id);
  const all = rank(recipes), best = dist(all[0]);
  return all.filter(r => dist(r) <= best + 4).slice(0, 3).map(r => r.id);
}

// Generates a whole session: songs until the length is reached, all with the same options.
// recipes: valid recipes (all known styles); options: styles (ids), chaos, energy, complexity, minutes, seed.
export function generateSession(recipes, options) {
  const opts = { ...OPTION_DEFAULTS, ...options };
  const ses = createSession(recipes, opts.seed), songs = [];
  let seconds = 0;
  while (seconds < opts.minutes * 60 && songs.length < 200) {
    const { song, entry } = ses.next(opts);
    songs.push(song); seconds += entry.seconds;
  }
  const session = { format: SESSION_FORMAT, version: 1, seed: ses.seed, options: { styles: opts.styles, chaos: opts.chaos, energy: opts.energy, complexity: opts.complexity, talk: opts.talk, minutes: opts.minutes, transition: opts.transition, harmony: opts.harmony, ...(sessionSource(opts) !== 'mix' ? { material: sessionSource(opts) } : {}), ...(opts.userPatterns ? { userPatterns: opts.userPatterns } : {}), ...(opts.artist ? { artist: opts.artist } : {}), ...(opts.profile !== OPTION_DEFAULTS.profile ? { profile: opts.profile } : {}), ...(voiceOption(opts.voice) ? { voice: voiceOption(opts.voice) } : {}) }, seconds: Math.round(seconds), songs: ses.entries };
  return { session, songs };
}

export { PART_NAMES };
