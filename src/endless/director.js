// The endless director (docs/ENDLESS.md): writes a seeded session of songs in the song format v2,
// each with live build steps that make it evolve phrase by phrase toward an energy shape.
// Pure and deterministic: no Node or browser APIs, no Math.random (randomness comes from random.js).
import { BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, TEX_RHYTHMS, GROOVES, ROWS, DEFAULT, KEYS, fitSteps, meterSteps } from '../music.js';
import { FORMAT, VERSION, SETTING_FIELDS, VOICE_DEFAULT } from '../song/format.js';
import { stateAt, SPEAKERS } from '../song/build.js';
import { makeRng, freshSeed } from './random.js';
import { withDefaults, PART_NAMES } from './recipe.js';
import { mixParts, partRecipe, partsKey, stylesOf } from './mix.js';
import { shapePlan, LANDMARKS } from './shapes.js';
import { energyOf, playing, curveParts } from './energy.js';
import { mutateRows, mutateBass, mutateArp, mutateHook } from './mutate.js';
import { phrase as pickPhrase } from './phrases.js';
import { artistSongOptions, pickWeighted } from './artist.js';
import { has, applyPlanQuirks } from './quirks.js';
import { planTransition, MAX_RAMP } from './transitions.js';

export const SESSION_FORMAT = 'coding-misk/endless-session';
// talk: how often the voice speaks (0 never, 0.5 about half of the boundaries with moves, 1 almost all)
// The director's version (#38): sessions saved in playlists record it, and warn when it changes. Bump it whenever
// `npm run check:endless -- --write-fixtures` changes the fixtures (the same seed gives different songs).
export const DIRECTOR_VERSION = 1;
export const OPTION_DEFAULTS = { chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, minutes: 15, transition: 'artist', harmony: 'artist' };
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

// Plan of one song: parts, tempo, key, length, sections with chords, shape, candidate tracks.
export function planSong({ parts, byId, prev, opts, rng, index }) {
  const R = withDefaults(partRecipe(parts, byId));
  // compatible harmony (#23): a tempo a transition can ramp to, and a key a fifth away, when the style allows
  const compatible = prev && harmonyOf(opts) === 'compatible';
  const near = compatible ? [Math.max(R.tempo[0], prev.bpm - MAX_RAMP), Math.min(R.tempo[1], prev.bpm + MAX_RAMP)] : null;
  const span = near && near[0] <= near[1] ? near : R.tempo;
  const P = rng.plan, bpm = Math.round(Math.min(span[1], P.range(span[0], span[1] + 0.999)));
  const meter = P.pick(R.meters), swing = round(P.range(R.swing[0], R.swing[1]));
  const fifths = compatible ? R.keys.filter(k => fifthApart(k, prev.key)) : [];
  const key = fifths.length ? P.pick(fifths) : pickOther(P, R.keys, prev && prev.key);
  // an artist's favourite shapes, among those the style allows (not the previous song's when another is possible)
  const liked = opts.shapeWeights && pickWeighted(rng.artist, opts.shapeWeights, R.shapes.filter(x => x !== (prev && prev.shape)).length ? R.shapes.filter(x => x !== (prev && prev.shape)) : R.shapes);
  const shape = liked || pickOther(P, R.shapes, prev && prev.shape);
  const phrase = R.phrase, dbl = 2 * phrase, beats = meterSteps(meter) / 4;
  const secondsOf = bars => bars * beats * 60 / bpm;
  const lo = Math.max(2, R.minutes[0]), hi = Math.min(6, R.minutes[1]);
  let bars = Math.max(2, Math.round(P.range(lo, hi) * 60 / (beats * 60 / bpm) / dbl)) * dbl;
  while (secondsOf(bars) < 120) bars += dbl;
  while (secondsOf(bars) > 360 && bars > 2 * dbl) bars -= dbl;
  const doubles = bars / dbl, plan = applyPlanQuirks(shapePlan(shape, doubles, opts.energy), shape, opts);
  // sections: consecutive double phrases with the same role; big moments take the second progression
  const mainChords = P.pick(R.progressions), liftChords = P.chance(0.5) ? pickOther(P, R.progressions, mainChords) : mainChords;
  const sections = sectionsOf(plan, { dbl, bpm, key, meter, swing, mainChords, liftChords });
  const tracks = candidateTracks(R, meter, opts.complexity, P, rng.mutation, opts);
  const usual = R.tracks.usual, hardMax = opts.complexity > 0.8 ? Math.max(R.tracks.max, 8) + 2 : Math.min(R.tracks.max, 8);
  const usualHigh = clamp(usual[1] + Math.round((opts.complexity - 0.5) * 2), usual[0], hardMax);
  const voice = voiceFor(R, opts, rng.voice);
  return { index, parts, R, voice, bpm, meter, swing, key, shape, phrase, bars, seconds: secondsOf(bars), plan, sections, tracks, usualHigh, hardMax, mainChords, liftChords };
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

// Characters that take a song's voice away from its style's base, now and then (docs/ENDLESS.md "Voice").
// Each one overrides a few settings; the rest stays as drawn from the recipe.
export const VOICE_CHARACTERS = {
  radio: { cutoff: 3200, hpf: 900, drive: 1.2, room: 0.15 },
  robot: { pitch: 0.7, drive: 3.5, hpf: 400, delay: 0.1 },
  deep: { pitch: 0.55, tempo: 0.75, cutoff: 6000, room: 0.4 },
  bright: { pitch: 1.35, tempo: 1, hpf: 500, room: 0.35 },
  cathedral: { room: 0.95, delay: 0.25, tempo: 0.7, cutoff: 9000 },
  echo: { delay: 0.6, room: 0.5 },
  dirty: { drive: 4.5, hpf: 700, pitch: 0.8 },
  slow: { tempo: 0.55, pitch: 0.85, room: 0.6 },
};
// The voice of one song: the style's base (ranges drawn, a speaker among the style's), sometimes another
// speaker, sometimes a character on top. More chaos, more variety.
export function voiceFor(R, opts, rng) {
  const base = { ...VOICE_DEFAULT }, v = R.voice || {};
  for (const [k, x] of Object.entries(v)) {
    if (k === 'speaker' || k === 'speakers') continue;
    base[k] = Array.isArray(x) ? round(rng.range(x[0], x[1])) : x;
  }
  const own = Array.isArray(v.speakers) && v.speakers.length ? v.speakers : [v.speaker ?? ''];
  base.speaker = rng.chance(0.15 + 0.3 * opts.chaos) ? rng.pick(['', ...SPEAKERS]) : rng.pick(own);
  let character = null;
  const chance = opts.voiceChance ?? 0.3 + 0.3 * opts.chaos;
  if (rng.chance(chance)) { character = (opts.voiceCharacters && pickWeighted(rng, opts.voiceCharacters)) || rng.pick(Object.keys(VOICE_CHARACTERS)); Object.assign(base, VOICE_CHARACTERS[character]); }
  return { settings: base, character };
}

// ---------- moves ----------

const KIND_OF_ADD = { drums: 'add-drums', bass: 'add-bass', arp: 'add-lead', hook: 'add-lead', pad: 'add-pad', guitar: 'add-guitar', texture: 'add-texture', riser: 'add-riser' };
const SPACE = ['delay', 'reverb'], DIRT = ['distort', 'crush', 'phaser'];

// every move allowed on a boundary, given the current state
export function candidateMoves(state, ctx, blocked, rng) {
  const out = [], on = playing(state), byId = id => state.tracks.find(t => t.id === id);
  for (const t of state.tracks) {
    if (t.type === 'voice' || t.type === 'riser' || blocked.has(t.id)) continue;
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
  const base = { tracks: [...plan.tracks.map(t => ({ ...t, mute: true, clips: [{ start: 0, bars, pattern: 'A' }] })), voice] };
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
      const order = state.tracks.filter(t => t.type !== 'voice' && t.type !== 'riser').sort((a, b) => ENTRY.indexOf(a.type) - ENTRY.indexOf(b.type));
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
      const kind = isEnd ? 'song-end' : main.kind;
      if (k === 0 || isEnd || ['break', 'drop'].includes(kind) || comments.chance(Math.min(1, 1.1 * talk))) said = say(kind, at);
    }
    if (said) { const first = steps.find(s => s.at === at); first.say = said; }
    phrases.push({ bar: at, role, target: round(target), moves: chosen.map(c => `${c.kind} ${(c.tracks || [c.track]).join('+')}`), say: said ? said.en : null });
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
  // measured energy of the final song at each phrase
  for (const p of phrases) p.energy = round(measure(song, p.bar, ctx));
  const entry = { id: song.id, title, parts, styles, bars: plan.bars, seconds: Math.round(plan.seconds), bpm: plan.bpm, key: plan.key, meter: plan.meter, shape: plan.shape, phrase: plan.phrase, tracks: tracks.filter(t => t.type !== 'voice').length, voice: { speaker: plan.voice.settings.speaker, character: plan.voice.character }, usualHigh: plan.usualHigh, hardMax: plan.hardMax, phrases };
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
      entries.push(entry);
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
  const tagged = (tags.styles || []).filter(id => byId[id]);
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
  const session = { format: SESSION_FORMAT, version: 1, seed: ses.seed, options: { styles: opts.styles, chaos: opts.chaos, energy: opts.energy, complexity: opts.complexity, talk: opts.talk, minutes: opts.minutes, transition: opts.transition, harmony: opts.harmony, ...(opts.artist ? { artist: opts.artist } : {}) }, seconds: Math.round(seconds), songs: ses.entries };
  return { session, songs };
}

export { PART_NAMES };
