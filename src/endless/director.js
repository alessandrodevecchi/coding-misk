// The endless director (docs/ENDLESS.md): writes a seeded session of songs in the song format v2,
// each with live build steps that make it evolve phrase by phrase toward an energy shape.
// Pure and deterministic: no Node or browser APIs, no Math.random (randomness comes from random.js).
import { BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, TEX_RHYTHMS, GROOVES, ROWS, DEFAULT, fitSteps, meterSteps } from '../music.js';
import { FORMAT, VERSION, SETTING_FIELDS, VOICE_DEFAULT } from '../song/format.js';
import { stateAt } from '../song/build.js';
import { makeRng, freshSeed } from './random.js';
import { withDefaults, PART_NAMES } from './recipe.js';
import { mixParts, partRecipe, partsKey, stylesOf } from './mix.js';
import { shapePlan, LANDMARKS } from './shapes.js';
import { energyOf, playing } from './energy.js';
import { mutateRows, mutateBass, mutateArp, mutateHook } from './mutate.js';
import { phrase as pickPhrase } from './phrases.js';

export const SESSION_FORMAT = 'coding-misk/endless-session';
export const OPTION_DEFAULTS = { chaos: 0.3, energy: 0.6, complexity: 0.5, minutes: 15 };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round = x => (Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 100) / 100);
const cap = s => s[0].toUpperCase() + s.slice(1);
const ROW_IDS = ROWS.map(([id]) => id);
const MELODIC = ['bass', 'arp', 'hook', 'pad', 'guitar'];
// order in which instruments usually come in at the start of a song
const ENTRY = ['drums', 'bass', 'pad', 'arp', 'guitar', 'hook', 'texture'];
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
function candidateTracks(R, meter, complexity, rng, mut) {
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
  if (use(R.guitar)) {
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

// Plan of one song: parts, tempo, key, length, sections with chords, shape, candidate tracks.
export function planSong({ parts, byId, prev, opts, rng, index }) {
  const R = withDefaults(partRecipe(parts, byId));
  const P = rng.plan, bpm = Math.round(P.range(R.tempo[0], R.tempo[1] + 0.999));
  const meter = P.pick(R.meters), swing = round(P.range(R.swing[0], R.swing[1]));
  const key = pickOther(P, R.keys, prev && prev.key);
  const shape = pickOther(P, R.shapes, prev && prev.shape);
  const phrase = R.phrase, dbl = 2 * phrase, beats = meterSteps(meter) / 4;
  const secondsOf = bars => bars * beats * 60 / bpm;
  const lo = Math.max(2, R.minutes[0]), hi = Math.min(6, R.minutes[1]);
  let bars = Math.max(2, Math.round(P.range(lo, hi) * 60 / (beats * 60 / bpm) / dbl)) * dbl;
  while (secondsOf(bars) < 120) bars += dbl;
  while (secondsOf(bars) > 360 && bars > 2 * dbl) bars -= dbl;
  const doubles = bars / dbl, plan = shapePlan(shape, doubles, opts.energy);
  // sections: consecutive double phrases with the same role; big moments take the second progression
  const mainChords = P.pick(R.progressions), liftChords = P.chance(0.5) ? pickOther(P, R.progressions, mainChords) : mainChords;
  const sections = [], seen = {};
  plan.forEach((d, i) => {
    const last = sections[sections.length - 1];
    if (last && last.role === d.role) { last.bars += dbl; return; }
    seen[d.role] = (seen[d.role] || 0) + 1;
    const name = cap(d.role) + (seen[d.role] > 1 ? ` ${seen[d.role]}` : '');
    const sec = { role: d.role, name, bars: dbl, bpm, key, chords: LANDMARKS.includes(d.role) ? liftChords : mainChords, meter };
    if (swing > 0) sec.swing = swing;
    sections.push(sec);
  });
  const tracks = candidateTracks(R, meter, opts.complexity, P, rng.mutation);
  const usual = R.tracks.usual, hardMax = opts.complexity > 0.8 ? Math.max(R.tracks.max, 8) + 2 : Math.min(R.tracks.max, 8);
  const usualHigh = clamp(usual[1] + Math.round((opts.complexity - 0.5) * 2), usual[0], hardMax);
  return { index, parts, R, bpm, meter, swing, key, shape, phrase, bars, seconds: secondsOf(bars), plan, sections, tracks, usualHigh, hardMax };
}

// ---------- moves ----------

const KIND_OF_ADD = { drums: 'add-drums', bass: 'add-bass', arp: 'add-lead', hook: 'add-lead', pad: 'add-pad', guitar: 'add-guitar', texture: 'add-texture', riser: 'add-riser' };
const SPACE = ['delay', 'reverb'], DIRT = ['distort', 'crush', 'phaser'];

// every move allowed on a boundary, given the current state
function candidateMoves(state, ctx, blocked, rng) {
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

// Writes the steps of a planned song: phrase by phrase, moves toward the target energy.
export function directSong(plan, opts, rng, comments) {
  const { phrase, bars, R } = plan;
  const ctx = { usual: plan.usualHigh, weights: R.energy, hardMax: plan.hardMax };
  const voice = { id: 'voice', name: 'Voice', type: 'voice', settings: { ...VOICE_DEFAULT, ...R.voice }, patterns: {}, clips: [] };
  const base = { tracks: [...plan.tracks.map(t => ({ ...t, mute: true, clips: [{ start: 0, bars, pattern: 'A' }] })), voice] };
  const steps = [], phrases = [], moved = new Map(); // track id → boundary index of its last move
  const M = rng.moves;
  let lastKind = '', lastSay = -Infinity, brokeDrums = [];
  const boundaries = bars / phrase;
  const say = (kind, at) => { lastSay = at; return pickPhrase(kind, comments); };
  for (let k = 0; k < boundaries; k++) {
    const at = k * phrase, d = Math.floor(k / 2), { role, target } = plan.plan[d];
    const isDouble = k % 2 === 0, prevRole = d > 0 ? plan.plan[d - 1].role : null;
    const landmark = isDouble && role !== prevRole && LANDMARKS.includes(role);
    const nextRole = k % 2 === 1 && d + 1 < plan.plan.length ? plan.plan[d + 1].role : null;
    // tracks that cannot move now: moved on the previous boundary, or needed by a big event on the next one
    const blocked = new Set([...moved].filter(([, b]) => b === k - 1).map(([id]) => id));
    if (nextRole === 'break' || nextRole === 'drop') base.tracks.filter(t => t.type === 'drums').forEach(t => blocked.add(t.id));
    const chosen = [];
    const take = move => { chosen.push(move); steps.push({ at, ...move.step }); (move.tracks || [move.track]).forEach(id => { moved.set(id, k); blocked.add(id); }); };
    let state = stateAt(working(base, steps), at).song;

    if (k === 0) {
      // start: the first one or two instruments in the usual entry order
      const order = state.tracks.filter(t => t.type !== 'voice' && t.type !== 'riser').sort((a, b) => ENTRY.indexOf(a.type) - ENTRY.indexOf(b.type));
      const first = order.slice(0, target > 0.35 || order.length < 3 ? 2 : 1).map(t => t.id);
      if (first.length) take({ kind: 'song-start', track: first[0], tracks: first, step: { add: first } });
    } else if (landmark && role === 'break') {
      const drums = playing(state).filter(t => t.type === 'drums').map(t => t.id);
      if (drums.length && playing(state).length > drums.length) { brokeDrums = drums; take({ kind: 'break', track: drums[0], tracks: drums, step: { remove: drums } }); }
    } else if (landmark && role === 'drop' && brokeDrums.length) {
      const back = brokeDrums.filter(id => state.tracks.find(t => t.id === id).mute);
      if (back.length) take({ kind: 'drop', track: back[0], tracks: back, step: { add: back } });
      brokeDrums = [];
    }
    // riser: in the phrase before a big moment, out in the phrase after it
    const riser = base.tracks.find(t => t.type === 'riser');
    if (riser && !blocked.has(riser.id)) {
      const r = state.tracks.find(t => t.id === riser.id);
      if (r.mute && nextRole && nextRole !== role && LANDMARKS.includes(nextRole) && nextRole !== 'break') take({ kind: 'add-riser', track: riser.id, step: { add: riser.id } });
      else if (!r.mute && moved.get(riser.id) === k - 2) take({ kind: 'strip', track: riser.id, step: { remove: riser.id }, quiet: true });
    }
    // ordinary moves toward the target
    state = stateAt(working(base, steps), at).song;
    const gap = Math.abs(measure(working(base, steps), at, ctx) - target);
    const want = (k === 0 ? 0 : 1) + (gap > 0.2 ? 1 : 0) + (landmark && gap > 0.35 ? 1 : 0) - chosen.filter(c => !c.quiet).length + (k === 0 ? 0 : 0);
    for (let i = 0; i < want; i++) {
      state = stateAt(working(base, steps), at).song;
      const e0 = energyOf(state, ctx);
      let cands = candidateMoves(state, ctx, blocked, M);
      // after the intro, below the usual count of tracks, the first move adds one (taste rule: 4 to 5 layers)
      if (k >= 2 && i === 0 && playing(state).length < R.tracks.usual[0] && !['break', 'outro'].includes(role)) {
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
        if (count > plan.usualHigh) score -= 0.08 * (count - plan.usualHigh);
        // below the usual count, prefer adding, and in the usual entry order (drums, bass, pads, …)
        const low = R.tracks.usual[0], before = playing(state).length;
        if (k > 0 && before < low && c.step.add !== undefined) score += 0.06 + 0.03 * (1 - ENTRY.indexOf(state.tracks.find(t => t.id === c.track).type) / ENTRY.length);
        if (k > 0 && count < low && c.step.remove !== undefined) score -= 0.06;
        if (c.lastDrum && role !== 'break') score -= 0.3;
        if (Math.abs(e0 - target) < 0.08 && ['variation', 'more-space', 'brighter', 'darker', 'dirtier', 'cleaner'].includes(c.kind)) score += 0.04;
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
    if (main && at - lastSay >= 8) {
      const kind = isEnd ? 'song-end' : main.kind;
      if (k === 0 || isEnd || ['break', 'drop'].includes(kind) || comments.chance(0.55)) said = say(kind, at);
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
    sections: plan.sections.map(({ role, ...s }) => s), tracks, build: steps,
  };
  // measured energy of the final song at each phrase
  for (const p of phrases) p.energy = round(measure(song, p.bar, ctx));
  const entry = { id: song.id, title, parts, styles, bars: plan.bars, seconds: Math.round(plan.seconds), bpm: plan.bpm, key: plan.key, meter: plan.meter, shape: plan.shape, phrase: plan.phrase, tracks: tracks.filter(t => t.type !== 'voice').length, usualHigh: plan.usualHigh, hardMax: plan.hardMax, phrases };
  return { song, entry };
}

// Generates a session. recipes: valid recipes (all known styles); opts: styles (ids), chaos, energy, complexity, minutes, seed.
export function generateSession(recipes, options) {
  const opts = { ...OPTION_DEFAULTS, ...options };
  if (opts.seed === undefined || opts.seed === null || opts.seed === '') opts.seed = freshSeed();
  const byId = Object.fromEntries(recipes.map(r => [r.id, withDefaults(r)]));
  const selected = opts.styles.map(id => byId[id]);
  const rng = makeRng(opts.seed);
  const songs = [], entries = [];
  let seconds = 0;
  for (let i = 0; seconds < opts.minutes * 60 && i < 200; i++) {
    // parts: avoid the style-per-part combination of the last three songs when another one is possible
    const recent = entries.slice(-3).map(e => partsKey(e.parts));
    let parts = mixParts(selected, opts.chaos, i, rng.plan);
    for (let t = 0; t < 12 && recent.includes(partsKey(parts)) && selected.length > 1 && opts.chaos > 0; t++) parts = mixParts(selected, opts.chaos, i, rng.plan);
    const { song, entry } = makeSong({ parts, byId, prev: entries[entries.length - 1], opts, rng, index: i, seed: opts.seed });
    songs.push(song); entries.push(entry); seconds += entry.seconds;
  }
  const session = { format: SESSION_FORMAT, version: 1, seed: String(opts.seed), options: { styles: opts.styles, chaos: opts.chaos, energy: opts.energy, complexity: opts.complexity, minutes: opts.minutes }, seconds: Math.round(seconds), songs: entries };
  return { session, songs };
}

export { PART_NAMES };
