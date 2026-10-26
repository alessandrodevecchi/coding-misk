// Radio steering (#24, docs/ENDLESS.md "Steering"): the listener's commands turn into a rewrite of the song on
// air from a boundary. A song is always rebuilt from its original plan plus every command still standing,
// in order, so cancelling a command or replaying a session gives exactly the same song.
import { directSong, sectionsOf, candidateMoves, ENTRY, tracksOfKind, liftOf, OPTION_DEFAULTS } from './director.js';
import { stream } from './random.js';
import { stateAt } from '../song/build.js';
import { playing, curveParts, CURVES } from './energy.js';
import { WAVES, TEXTURES, GUITAR_TYPES, KITS, KEYS, meterSteps } from '../music.js';
import { airIdea, composesOnAir, sessionSource, readyParts } from './material.js';
import { presetOf } from '../material/index.js';
import { rewriteSpoken, nextQuiet, newSpokenTrack, wherePartsOf } from './voice-track.js';
import { whereOfTrack } from '../song/spoken.js';
import { normalizeSong, VOICE_STYLES } from '../song/format.js';
import { SPEAKERS } from '../song/build.js';

// commands of the console: group, whether they change the song's structure (applied on a double phrase)
export const COMMANDS = {
  'energy-up': { group: 'energy' }, 'energy-down': { group: 'energy' },
  add: { group: 'arrangement' }, remove: { group: 'arrangement' }, 'more-complex': { group: 'arrangement' }, 'less-complex': { group: 'arrangement' },
  // new notes for a part (radio-variation): a pattern step from the next phrase
  vary: { group: 'arrangement' },
  // another ready part (a preset or a saved pattern) for a part, never composed: a pattern step from the next phrase
  swap: { group: 'arrangement' },
  darker: { group: 'sound' }, brighter: { group: 'sound' }, dirtier: { group: 'sound' }, cleaner: { group: 'sound' }, 'more-space': { group: 'sound' }, instrument: { group: 'sound' },
  progression: { group: 'harmony', structural: true }, key: { group: 'harmony', structural: true },
  'talk-more': { group: 'voice' }, 'talk-less': { group: 'voice' },
  // the voice instrument of the song on air (voice-placement): its options from the next quiet part (applied on a
  // phrase, placed on the first quiet section from there; the clips before stay)
  voice: { group: 'voice' },
  // a line typed in the console (voice-full-controls D10): said on a bar (now) or on the next free part where the voice
  // track may speak (moment); the voice track's sound from the next phrase
  'say-live': { group: 'voice', bar: true }, 'voice-sound': { group: 'voice' },
  drop: { group: 'song', structural: true }, stay: { group: 'song', structural: true }, extend: { group: 'song', structural: true }, end: { group: 'song', structural: true },
  curve: { group: 'curve' }, 'curve-reset': { group: 'curve' },
  // mixer: on the next bar
  volume: { group: 'mixer', bar: true }, mute: { group: 'mixer', bar: true }, unmute: { group: 'mixer', bar: true }, lock: { group: 'mixer' }, unlock: { group: 'mixer' },
};
export const ARRANGE_TYPES = ['drums', 'bass', 'lead', 'pad', 'texture'];
// the parts Vary and Swap can rewrite, lead first (the default); for vary the lead is the hook, else the guitar, and the arp is
// a part of its own (radio-variation D1)
export const VARY_TYPES = ['lead', 'bass', 'arp', 'pad'];
const LEAD = ['arp', 'hook', 'guitar'];
const ofType = (t, type) => (type === 'lead' ? LEAD.includes(t.type) : t.type === type);
// the tracks a vary of a part rewrites, among the tracks given (the playing ones)
export function varyTracks(tracks, type = 'lead') {
  if (type !== 'lead') return tracks.filter(t => t.type === type);
  const hooks = tracks.filter(t => t.type === 'hook');
  return hooks.length ? hooks : tracks.filter(t => t.type === 'guitar');
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const clone = o => JSON.parse(JSON.stringify(o));
const round2 = x => Math.round(x * 100) / 100;
const semis = k => (KEYS.find(x => x[0] === k) || [k, 0])[1];

// The bar where a command applies, given the bar now: the next phrase, the next double phrase for structural
// commands, the next bar for the mixer. Never past the song's last phrase.
export function applyBar(kind, now, plan) {
  const ph = plan.phrase, dbl = 2 * ph, last = plan.bars - ph;
  if (COMMANDS[kind] && COMMANDS[kind].bar) return Math.min(plan.bars - 1, Math.floor(now) + 1);
  const step = COMMANDS[kind] && COMMANDS[kind].structural ? dbl : ph;
  return Math.min(last, (Math.floor(now / step) + 1) * step);
}

// the song with its tracks as they are at a bar (all candidate tracks, muted when not playing)
function stateOf(song, plan, bar) {
  const base = { tracks: [...plan.tracks.map(t => ({ ...t, mute: true, clips: [{ start: 0, bars: plan.bars, pattern: 'A' }] })), ...song.tracks.filter(t => t.type === 'voice' || t.type === 'spoken')], build: song.build };
  return stateAt(base, bar).song;
}

// why a command cannot apply now, or null when it can (for the console: disabled buttons say why)
//   late, no-type, all-playing, locked, last-track, no-target, no-drop, not-playing (vary, swap: no track of the part
//   plays), no-ready (swap: no other ready part fits)
// tail: bars at the end of the song where the transition to the next song already plays (extend cannot go there)
// opts: the song's options (swap reads the user's saved patterns from them)
export function whyNot(cmd, song, plan, now, tail = 0, opts = {}) {
  const at = applyBar(cmd.kind, now, plan);
  if (at <= now || at >= plan.bars) return 'late';
  if (cmd.kind === 'extend' && at >= plan.bars - tail) return 'transition';
  const st = stateOf(song, plan, at), on = playing(st), locked = plan.locked || [];
  if (cmd.kind === 'add') {
    const all = st.tracks.filter(t => ofType(t, cmd.type));
    // a type the song has no track for: a new one from the song's style (#41), unless the style has none
    if (!all.length) return styleHas(plan, cmd.type) ? null : 'no-type';
    const free = all.filter(t => t.mute);
    if (!free.length) return 'all-playing';
    return free.some(t => !locked.includes(t.id)) ? null : 'locked';
  }
  if (cmd.kind === 'vary' || cmd.kind === 'swap') {
    const mine = varyTracks(on, cmd.type || 'lead');
    if (!mine.length) return 'not-playing';
    const free = mine.filter(t => !locked.includes(t.id));
    if (!free.length) return 'locked';
    if (cmd.kind === 'swap' && !free.some(t => readyParts(t, plan.R, opts || {}, plan.parts).length)) return 'no-ready';
    return null;
  }
  if (cmd.kind === 'remove') {
    const mine = on.filter(t => ofType(t, cmd.type));
    if (!mine.length) return 'no-type';
    if (on.length <= 1) return 'last-track';
    return mine.some(t => !locked.includes(t.id)) ? null : 'locked';
  }
  if (['darker', 'brighter', 'dirtier', 'cleaner', 'more-space'].includes(cmd.kind)) {
    const ok = candidateMoves(st, { usual: plan.usualHigh, weights: plan.R.energy, hardMax: plan.hardMax }, new Set(locked), stream('probe')).some(m => m.kind === cmd.kind);
    return ok ? null : 'no-target';
  }
  // the voice instrument: a quiet part must come after the bar (and a track to stop, for "never")
  if (cmd.kind === 'say-live') return cmd.mode === 'moment' && sayBar(song, at) === null ? 'no-part' : null;
  if (cmd.kind === 'voice-sound' || (cmd.kind === 'voice' && !cmd.voice)) return song.tracks.some(t => t.type === 'spoken') ? null : 'no-voice';
  if (cmd.kind === 'voice') {
    if (nextQuiet(song, at) === null) return 'no-quiet';
    if (cmd.voice && cmd.voice.presence === 'never' && !song.tracks.some(t => t.type === 'spoken')) return 'no-voice';
    return null;
  }
  if (cmd.kind === 'drop') return plan.plan.slice(Math.ceil(at / (2 * plan.phrase))).some(d => d.role === 'drop') ? null : 'no-drop';
  return null;
}
export const canApply = (cmd, song, plan, now) => !whyNot(cmd, song, plan, now);

const KIND_OF = { drums: ['drums'], bass: ['bass'], lead: ['hook', 'arp', 'guitar'], pad: ['pad'], texture: ['texture'] };
const styleHas = (plan, type) => (KIND_OF[type] || []).some(k => plan.R[k]);

// the sections of a plan, with the harmony changes made from a bar on
function sectionsWith(plan) {
  const h = { dbl: 2 * plan.phrase, bpm: plan.bpm, key: plan.key, meter: plan.meter, swing: plan.swing, mainChords: plan.mainChords, liftChords: plan.liftChords };
  let sections = sectionsOf(plan.plan, h);
  for (const o of plan.harmony || []) {
    const out = [];
    let at = 0;
    for (const s of sections) {
      const end = at + s.bars;
      if (end <= o.from) out.push(s);
      else if (at >= o.from) out.push({ ...s, ...(o.key ? { key: o.key } : {}), ...(o.chords ? { chords: o.chords } : {}) });
      else { out.push({ ...s, bars: o.from - at }); out.push({ ...s, name: `${s.name} ·`, bars: end - o.from, ...(o.key ? { key: o.key } : {}), ...(o.chords ? { chords: o.chords } : {}) }); }
      at = end;
    }
    sections = out;
  }
  return sections;
}

// another sound for a track, from its style when it can
function otherSound(t, R, rng) {
  const s = t.settings || {}, r = R[t.type] || {};
  const pickOther = (list, cur) => { const rest = list.filter(x => x !== cur); return rest.length ? rng.pick(rest) : null; };
  if (t.type === 'drums') { const k = pickOther(r.kits && r.kits.length > 1 ? r.kits : KITS, s.kit); return k && { kit: k }; }
  if (t.type === 'guitar') { const g = pickOther(Object.keys(GUITAR_TYPES), s.type); return g && { type: g }; }
  if (t.type === 'texture') { const x = pickOther(r.samples && r.samples.length > 1 ? r.samples : TEXTURES, s.sample); return x && { sample: x }; }
  if (s.wave !== undefined) { const w = pickOther(r.waves && r.waves.length > 1 ? r.waves : WAVES.map(x => x[0]), s.wave); return w && { wave: w }; }
  return null;
}

// ---------- composed material (radio-variation) ----------

const ADD_PHRASE = { drums: 'add-drums', bass: 'add-bass', arp: 'add-lead', hook: 'add-lead', pad: 'add-pad', guitar: 'add-guitar', texture: 'add-texture' };
// the section that plays at a bar
const sectionAt = (P, bar) => sectionsWith(P).reduce((acc, s) => (acc.at <= bar ? { at: acc.at + s.bars, s } : acc), { at: 0, s: null }).s || {};
// the session complexity as the listener moved it (More or Less complex), 0 to 1
const complexityOf = (P, O) => (Number.isFinite(P.complexity) ? P.complexity : O.complexity ?? OPTION_DEFAULTS.complexity);
// The generator's inputs at the part (double phrase) where the material starts (D3): key and chords of the section,
// the energy target (register), the density target or, when automatic, the tracks playing (notes per bar, as a share
// of the most the song can play), the session complexity (range and rhythmic variety).
export function airInputs(P, O, st, at) {
  const d = P.plan[Math.min(P.plan.length - 1, Math.floor(at / (2 * P.phrase)))] || {}, sec = sectionAt(P, at), max = Math.max(1, densityMax(P));
  const set = d.curves && Number.isFinite(d.curves.density) ? d.curves.density : null;
  const count = set ?? playing(st).filter(t => t.type !== 'riser').length;
  return { key: sec.key || P.key, chords: sec.chords || P.mainChords, meter: P.meter, energy: d.target ?? 0.5, density: round2(clamp(count / max, 0, 1)), complexity: complexityOf(P, O), source: sessionSource(O) };
}
// every idea of a track's patterns (presets read through their idea)
const ideasOf = t => Object.values(t.patterns || {}).map(p => p.idea || (p.preset ? presetOf(t.type, p.preset) : null));
// New tracks compose (D4): the tracks given that have not played before the bar and still hold presets get composed
// patterns A and B, seeded by the command. Changes P.tracks in place.
function composeNew(P, O, song, st, at, ids, seed) {
  if (!composesOnAir(O)) return;
  const heard = new Set((song.build || []).filter(s => s.at < at).flatMap(s => (s.add === undefined ? [] : [].concat(s.add))));
  const M = airInputs(P, O, st, at);
  for (const t of P.tracks) {
    if (!ids.includes(t.id) || heard.has(t.id) || Object.values(t.patterns || {}).some(p => p.idea)) continue;
    const A = airIdea(t, P.R, { ...M, seed: `${seed}:${t.id}` });
    if (!A) continue;
    const B = airIdea(t, P.R, { ...M, seed: `${seed}:${t.id}:B`, avoid: [A] });
    t.patterns = { A: { idea: A }, ...(B ? { B: { idea: B } } : {}) };
  }
}
// Vary (D1, D2): a new idea for each playing, unlocked track of the part, added to its patterns as V<k>, and a pattern
// step at the boundary marked as the listener's. The rest of the song stays as it was; later pattern steps of the
// varied tracks go, so the new part stays until another command changes it. Vary always composes, whatever the
// session's material source; a pad keeps the song's chords.
// Swap: the same, with another ready part (readyParts: a preset or a saved pattern that fits) as S<k>, never composed,
// drawn from the stream "<track>" of the seed swap:<song>:<index>.
function vary(song, P, O, cmd, st, seed) {
  const swap = cmd.kind === 'swap', prefix = swap ? 'S' : 'V';
  const on = varyTracks(playing(st), cmd.type || 'lead').filter(t => !P.locked.includes(t.id));
  const M = swap ? null : { ...airInputs(P, O, st, cmd.at), source: 'composed', keepChords: true };
  let build = (song.build || []).slice();
  const tracks = song.tracks.map(t => ({ ...t }));
  on.forEach(t => {
    const own = P.tracks.find(x => x.id === t.id), mine = tracks.find(x => x.id === t.id);
    if (!own || !mine) return;
    let pattern;
    if (swap) {
      const pool = readyParts(own, P.R, O, P.parts);
      if (!pool.length) return;
      pattern = JSON.parse(JSON.stringify(stream(seed, t.id).pick(pool)));
    } else {
      const idea = airIdea(own, P.R, { ...M, seed: `${seed}:${t.id}`, avoid: ideasOf(own) });
      if (!idea) return;
      pattern = { idea };
    }
    const name = `${prefix}${Object.keys(own.patterns).filter(k => new RegExp(`^${prefix}\\d+$`).test(k)).length + 1}`;
    own.patterns = { ...own.patterns, [name]: pattern };
    mine.patterns = { ...mine.patterns, [name]: JSON.parse(JSON.stringify(pattern)) };
    const step = { at: cmd.at, pattern: { track: t.id, to: name }, by: 'listener' };
    // a comment on a dropped step moves to the new one
    const gone = build.filter(s => s.at >= cmd.at && s.pattern && s.pattern.track === t.id), said = gone.find(s => s.at === cmd.at && s.say);
    if (said) { step.say = said.say; if (said.voice) step.voice = said.voice; }
    build = [...build.filter(s => !gone.includes(s)), step];
    P.varied = [...(P.varied || []), step];
  });
  build = build.map((s, i) => [s, i]).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]).map(([s]) => s);
  return { song: { ...song, tracks, build }, plan: P, opts: O };
}

// One command applied to a song: the modified plan and options, and the rewrite from its bar.
function rewrite(song, plan, opts, cmd, rng) {
  const P = { ...plan, plan: plan.plan.map(d => ({ ...d, ...(d.curves ? { curves: { ...d.curves } } : {}) })), tracks: plan.tracks.map(t => ({ ...t, settings: { ...(t.settings || {}) } })), harmony: (plan.harmony || []).slice(), locked: (plan.locked || []).slice() };
  if (plan.varied) P.varied = plan.varied.slice();
  const O = { ...opts };
  const ph = P.phrase, dbl = 2 * ph, at = cmd.at;
  const extra = [], forced = [];
  let from = Math.ceil(at / ph);
  const d0 = Math.floor(from / 2);
  const st = stateOf(song, P, at), on = playing(st);
  const ctx = { usual: P.usualHigh, weights: P.R.energy, hardMax: P.hardMax };
  if (cmd.kind === 'vary' || cmd.kind === 'swap') return vary(song, P, O, cmd, st, `${rng.seed}:${cmd.kind}:${rng.n}:${rng.i}`);
  // the voice instrument (voice-placement): kept in the plan, so later rewrites (which write the spoken track again
  // from the plan) apply it again in order; the song is not directed again
  // (voice-full-controls: the console's Apply carries the phrases and the sound in one command; a sound alone is
  // voice-sound; a typed line is say-live; all kept in the plan, so later rewrites apply them again in order)
  if (cmd.kind === 'voice' || cmd.kind === 'voice-sound') {
    const e = { at, voice: cmd.kind === 'voice' && cmd.voice ? cmd.voice : null, ...(cmd.sound ? { sound: cmd.sound } : {}), seed: `${rng.seed}:voice:${rng.n}:${rng.i}` };
    P.voiceAir = [...(plan.voiceAir || []), e];
    return { song: voiceAir(song, P, [e]), plan: P, opts: O };
  }
  if (cmd.kind === 'say-live') {
    const e = { at, text: cmd.text, lang: cmd.lang, speaker: cmd.speaker || '', mode: cmd.mode === 'moment' ? 'moment' : 'now' };
    P.sayAir = [...(plan.sayAir || []), e];
    return { song: sayAir(song, [e]), plan: P, opts: O };
  }
  switch (cmd.kind) {
    case 'energy-up': case 'energy-down':
      for (let d = d0; d < P.plan.length; d++) P.plan[d].target = round2(clamp(P.plan[d].target + (cmd.kind === 'energy-up' ? 0.15 : -0.15), 0.05, 1));
      break;
    case 'curve': {
      // no curve (or energy): the energy target; the other curves (#40) set a soft target of that part
      const d = P.plan[cmd.d];
      if (!d || cmd.d < d0) break;
      if (!cmd.curve || cmd.curve === 'energy') d.target = round2(clamp(cmd.value, 0, 1));
      else if (CURVES.includes(cmd.curve)) d.curves = { ...(d.curves || {}), [cmd.curve]: cmd.curve === 'density' ? Math.round(clamp(cmd.value, 1, densityMax(P))) : round2(clamp(cmd.value, 0, 1)) };
      break;
    }
    case 'curve-reset':
      for (let d = d0; d < P.plan.length; d++) if (P.plan[d].curves) { const { [cmd.curve]: _, ...rest } = P.plan[d].curves; P.plan[d].curves = rest; }
      break;
    case 'add': {
      let t = st.tracks.filter(x => x.mute && ofType(x, cmd.type) && !P.locked.includes(x.id)).sort((a, b) => ENTRY.indexOf(a.type) - ENTRY.indexOf(b.type))[0];
      // the song has no track of this type: the style makes one now, with its own sounds and presets (#41)
      if (!t && !st.tracks.some(x => ofType(x, cmd.type))) {
        const made = tracksOfKind(P.R, cmd.type, P.meter, opts.complexity ?? 0.5, rng.moves)[0];
        if (made) {
          const ids = new Set(P.tracks.map(x => x.id));
          let id = made.id, n = 2;
          while (ids.has(id)) id = `${made.id}-${n++}`;
          const fresh = { ...made, id, name: id === made.id ? made.name : `${made.name} ${n - 1}` };
          P.tracks.push(fresh);
          t = fresh;
        }
      }
      // a track the song has not played yet gets composed material (D4), unless the session plays patterns
      if (t) composeNew(P, O, song, st, at, [t.id], `${rng.seed}:add:${rng.n}:${rng.i}`);
      if (t) forced.push({ kind: 'add', phrase: ADD_PHRASE[t.type], track: t.id, step: { add: t.id } });
      break;
    }
    case 'remove': {
      const ids = on.filter(x => ofType(x, cmd.type) && !P.locked.includes(x.id)).map(x => x.id);
      if (ids.length) forced.push({ kind: 'strip', track: ids[0], tracks: ids, step: { remove: ids } });
      break;
    }
    case 'more-complex': case 'less-complex':
      P.usualHigh = clamp(P.usualHigh + (cmd.kind === 'more-complex' ? 1 : -1), P.R.tracks.usual[0], P.hardMax);
      // the session complexity moves too: it shapes the material composed from here on (D3)
      P.complexity = round2(clamp(complexityOf(P, O) + (cmd.kind === 'more-complex' ? 0.2 : -0.2), 0, 1));
      // the tracks More complex may bring in that have not played yet get composed material (D4)
      if (cmd.kind === 'more-complex') composeNew(P, O, song, st, at, P.tracks.map(x => x.id), `${rng.seed}:more:${rng.n}:${rng.i}`);
      break;
    case 'darker': case 'brighter': case 'dirtier': case 'cleaner': case 'more-space': {
      const seen = new Set();
      for (const m of candidateMoves(st, ctx, new Set(P.locked), rng.moves)) if (m.kind === cmd.kind && !seen.has(m.track)) { seen.add(m.track); forced.push(m); }
      break;
    }
    case 'instrument': {
      const t = cmd.track ? st.tracks.find(x => x.id === cmd.track) : on.filter(x => ['hook', 'arp', 'guitar', 'pad', 'bass'].includes(x.type)).sort((a, b) => ['hook', 'arp', 'guitar', 'pad', 'bass'].indexOf(a.type) - ['hook', 'arp', 'guitar', 'pad', 'bass'].indexOf(b.type))[0];
      const set = t && otherSound(t, P.R, rng.moves);
      if (set) forced.push({ kind: 'instrument', phrase: 'variation', track: t.id, mixer: !!cmd.track, step: { set: { track: t.id, ...set } } });
      break;
    }
    case 'progression': {
      const cur = (sectionsWith(P).reduce((acc, s) => (acc.at <= at ? { at: acc.at + s.bars, s } : acc), { at: 0, s: null }).s || {}).chords;
      const rest = P.R.progressions.filter(x => x !== cur);
      if (rest.length) P.harmony.push({ from: at, chords: rng.moves.pick(rest) });
      break;
    }
    case 'key': {
      const cur = (sectionsWith(P).reduce((acc, s) => (acc.at <= at ? { at: acc.at + s.bars, s } : acc), { at: 0, s: null }).s || {}).key || P.key;
      const fifths = KEYS.map(k => k[0]).filter(k => [5, 7].includes(((semis(k) - semis(cur)) % 12 + 12) % 12));
      if (fifths.length) P.harmony.push({ from: at, key: rng.moves.pick(fifths) });
      break;
    }
    case 'talk-more': case 'talk-less':
      O.talk = round2(clamp((O.talk ?? 0.5) + (cmd.kind === 'talk-more' ? 0.2 : -0.2), 0, 1));
      break;
    case 'drop': {
      let j = P.plan.findIndex((d, i) => i >= d0 && d.role === 'drop');
      if (j < 0) { const rest = P.plan.slice(d0); j = d0 + rest.indexOf(rest.reduce((a, b) => (b.target > a.target ? b : a), rest[0])); }
      if (j > d0) P.plan = [...P.plan.slice(0, d0), ...P.plan.slice(j)];
      break;
    }
    case 'stay':
      if (d0 > 0) P.plan = [...P.plan.slice(0, d0), { ...P.plan[d0 - 1] }, ...P.plan.slice(d0)];
      break;
    case 'extend': {
      // one more double phrase before the ending (#45): the role and curves of the part before it, energy a little
      // lower then a little higher on repeated presses; the director writes its own moves
      const at2 = extendIndex(P, d0), src = P.plan[Math.max(0, at2 - 1)], k = P.extended || 0;
      const part = { ...src, ...(src.curves ? { curves: { ...src.curves } } : {}), target: round2(clamp(src.target + (k % 2 ? 0.06 : -0.08), 0.05, 1)) };
      P.plan = [...P.plan.slice(0, at2), part, ...P.plan.slice(at2)];
      P.extended = k + 1;
      break;
    }
    case 'end':
      if (d0 < P.plan.length - 1) P.plan = [...P.plan.slice(0, d0), { role: 'outro', target: Math.min(0.3, P.plan[P.plan.length - 1].target) }];
      break;
    case 'volume': {
      const t = P.tracks.find(x => x.id === cmd.track);
      if (t) { t.settings.gain = round2(clamp(cmd.value, 0, 1.2)); t.pinned = [...new Set([...(t.pinned || []), 'gain'])]; }
      break;
    }
    case 'mute': case 'unmute':
      extra.push({ at, [cmd.kind === 'mute' ? 'remove' : 'add']: cmd.track, by: 'listener' });
      if (cmd.kind === 'mute') P.locked = [...new Set([...P.locked, cmd.track])]; else P.locked = P.locked.filter(x => x !== cmd.track);
      break;
    case 'lock': P.locked = [...new Set([...P.locked, cmd.track])]; break;
    case 'unlock': P.locked = P.locked.filter(x => x !== cmd.track); break;
    default: break;
  }
  if (forced.length) from = Math.round(at / ph);
  P.bars = P.plan.length * dbl;
  P.sections = sectionsWith(P);
  // varied parts stay: their steps from the boundary on are kept as the listener's
  const varied = (P.varied || []).filter(s => s.at >= from * ph).map(s => ({ ...s }));
  const keep = [...(song.build || []).filter(s => s.at < from * ph), ...extra, ...varied].sort((a, b) => a.at - b.at);
  const dir = directSong(P, O, rng, rng.comments, { keep, from, forced: forced.length ? { [from]: forced } : {}, locked: P.locked });
  const out = {
    ...song,
    sections: P.sections.map(({ role, ...s }) => s),
    tracks: dir.tracks.map(t => { const own = P.tracks.find(x => x.id === t.id); return own && own.pinned ? { ...t, settings: { ...t.settings, ...own.settings }, pinned: own.pinned } : t; }),
    build: dir.steps,
  };
  return { song: sayAir(voiceAir(out, P, P.voiceAir || []), P.sayAir || []), plan: P, opts: O, phrases: dir.phrases };
}

// The voice instrument changes of the listener (voice-placement), in order, on a song: each one rewrites the spoken
// track from the first quiet part after its bar (rewriteSpoken), with the plan's style; one that finds no quiet part
// changes nothing
function voiceAir(song, P, list) {
  let cur = song;
  for (const e of list) {
    const sp = cur.tracks.find(t => t.type === 'spoken');
    if (e.voice) {
      const r = rewriteSpoken(cur, sp ? sp.id : null, e.voice, { spoken: (P.R && P.R.spoken) || null, from: e.at, seed: e.seed });
      if (r) cur = r.song;
    }
    // the sound: a set step on the voice track from the command's bar (the voice style's values, speaker and volume kept)
    const now = cur.tracks.find(t => t.type === 'spoken');
    if (e.sound && now) {
      const vals = VOICE_STYLES[e.sound.style] ? { ...VOICE_STYLES[e.sound.style] } : e.sound.settings && typeof e.sound.settings === 'object' ? { ...e.sound.settings } : null;
      if (vals) cur = { ...cur, build: [...(cur.build || []), { at: e.at, set: { track: now.id, ...vals }, by: 'listener' }].map((x, i) => [x, i]).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]).map(([x]) => x) };
    }
  }
  return cur;
}
// The bar a typed line goes to with "at the right moment": the first part from the next phrase after `from` of the
// kinds the voice track may speak in (quiet first by bar), where no line of the track plays; null when none is left
export function sayBar(song, from) {
  const sp = song.tracks.find(t => t.type === 'spoken'), N = normalizeSong(song), clips = sp ? N.tracks.find(t => t.id === sp.id).clips : [];
  const parts = wherePartsOf(song, from, whereOfTrack(sp)).filter(p => !clips.some(c => c.start < p.start + p.bars && c.start + c.bars > p.start)).sort((a, b) => a.start - b.start);
  return parts.length ? parts[0].start : null;
}
// Lines typed in the console (voice-full-controls D10), in order: each one a clip of its own (an own text, spoken as a
// passage) on the voice track of the song, from its bar; a song without one gets a Words track, silent until the line,
// with a speaker that is not the narrator's and the Clear sound
function sayAir(song, list) {
  let cur = song;
  for (const e of list) {
    if (!e.text || !e.lang) continue;
    const at = e.mode === 'moment' ? sayBar(cur, e.at) : e.at;
    if (at === null || at === undefined) continue;
    const total = normalizeSong(cur).total;
    if (at >= total) continue;
    const tracks = cur.tracks.map(t => t);
    let ti = tracks.findIndex(t => t.type === 'spoken'), build = (cur.build || []).slice();
    if (ti < 0) {
      const nar = (tracks.find(t => t.type === 'voice') || { settings: {} }).settings.speaker || '';
      const t = newSpokenTrack(cur);
      t.settings = { ...t.settings, ...VOICE_STYLES.clear, speaker: e.speaker && e.speaker !== nar ? e.speaker : SPEAKERS.find(x => x !== nar) };
      const v = tracks.findIndex(x => x.type === 'voice');
      tracks.splice(v >= 0 ? v : tracks.length, 0, t); ti = tracks.indexOf(t);
      build.push({ at, add: t.id, by: 'listener' });
    } else {
      // (a voice track that comes in later, or left: in from the line's bar)
      const id = tracks[ti].id, st = stateAt({ ...cur, build }, at).song.tracks.find(x => x.id === id);
      if (st && st.mute) build.push({ at, add: id, by: 'listener' });
    }
    const t = JSON.parse(JSON.stringify(tracks[ti])), keys = new Set(Object.keys(t.patterns || {}));
    let key = 'L1'; for (let k = 2; keys.has(key); k++) key = `L${k}`;
    t.patterns = { ...(t.patterns || {}), [key]: { way: 'passage', text: { [e.lang]: e.text } } };
    t.clips = [...(t.clips || []), { start: at, bars: Math.min(2, total - at), pattern: key }];
    tracks[ti] = t;
    build = build.map((x, i) => [x, i]).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]).map(([x]) => x);
    cur = { ...cur, tracks, build };
  }
  return cur;
}

// The song after every command, from the original. commands: [{ kind, at, type?, track?, d?, value? }] in order.
// seed and n name the random streams, so the same commands always give the same song.
export function steerSong({ song, plan, opts, commands, seed, n }) {
  let cur = { song: clone(song), plan, opts };
  commands.forEach((cmd, i) => {
    // (seed, n, i: composed and swapped material is seeded by the song and the command's index, vary:<song>:<index>,
    // swap:<song>:<index>)
    const rng = { moves: stream(seed, `steer:${n}:${i}:moves`), comments: stream(seed, `steer:${n}:${i}:comments`), seed: String(seed), n, i };
    cur = rewrite(cur.song, cur.plan, cur.opts, cmd, rng);
  });
  return cur;
}

// the most tracks a song can play at once: its candidate tracks (riser left out), at most its track maximum
export const densityMax = plan => Math.min(plan.hardMax, plan.tracks.filter(t => t.type !== 'riser').length);

// The curves of a song as it plays (#40): per double phrase, what the song does (measured on its second phrase,
// after the moves of both boundaries) and what the listener set (null when automatic).
export function songCurves(song, plan, opts = {}) {
  const ph = plan.phrase, dbl = 2 * ph;
  return plan.plan.map((d, i) => {
    const m = curveParts(stateOf(song, plan, Math.min(plan.bars - 1, i * dbl + ph)), { lift: liftOf(d) });
    const set = Object.fromEntries(CURVES.map(c => [c, d.curves && Number.isFinite(d.curves[c]) ? d.curves[c] : null]));
    return { measured: { ...m, voice: set.voice ?? opts.talk ?? OPTION_DEFAULTS.talk }, set };
  });
}

// Extend (#45): where the added double phrase goes, before the closing run of outros (or the last part without
// one), never before the double phrase d0 where the command applies; and how long one press adds, in seconds.
export function extendIndex(plan, d0) {
  const n = plan.plan.length;
  let end = n;
  while (end > 0 && plan.plan[end - 1].role === 'outro') end--;
  if (end === n) end = n - 1;
  return Math.max(d0, end);
}
export const extendSeconds = plan => 2 * plan.phrase * (meterSteps(plan.meter) / 4) * 60 / plan.bpm;
