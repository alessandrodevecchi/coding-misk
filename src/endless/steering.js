// Radio steering (#24, docs/ENDLESS.md "Steering"): the listener's commands turn into a rewrite of the song on
// air from a boundary. A song is always rebuilt from its original plan plus every command still standing,
// in order, so cancelling a command or replaying a session gives exactly the same song.
import { directSong, sectionsOf, candidateMoves, ENTRY, tracksOfKind, trackForPart, liftOf, OPTION_DEFAULTS } from './director.js';
import { stream } from './random.js';
import { stateAt, buildSteps } from '../song/build.js';
import { playing, curveParts, CURVES } from './energy.js';
import { WAVES, TEXTURES, GUITAR_TYPES, KITS, KEYS, GROOVES, meterSteps, fitSteps } from '../music.js';
import { airIdea, composesOnAir, sessionSource, readyParts } from './material.js';
import { presetOf, compose } from '../material/index.js';
import { rewriteSpoken, nextQuiet } from './voice-track.js';

// commands of the console: group, whether they change the song's structure (applied on a double phrase)
export const COMMANDS = {
  'energy-up': { group: 'energy' }, 'energy-down': { group: 'energy' },
  // (add and remove of a coarse type: kept for the sessions recorded before radio-arrangement, no longer in the console)
  add: { group: 'arrangement' }, remove: { group: 'arrangement' }, 'more-complex': { group: 'arrangement' }, 'less-complex': { group: 'arrangement' },
  // one more or one fewer track of an instrument (radio-arrangement D1, D2), a lock per instrument (D12), a riser on the
  // next part change (D11)
  more: { group: 'arrangement' }, less: { group: 'arrangement' }, 'lock-part': { group: 'arrangement' }, 'unlock-part': { group: 'arrangement' }, riser: { group: 'arrangement' },
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
  drop: { group: 'song', structural: true }, stay: { group: 'song', structural: true }, extend: { group: 'song', structural: true }, end: { group: 'song', structural: true },
  curve: { group: 'curve' }, 'curve-reset': { group: 'curve' },
  // mixer: on the next bar
  volume: { group: 'mixer', bar: true }, mute: { group: 'mixer', bar: true }, unmute: { group: 'mixer', bar: true }, lock: { group: 'mixer' }, unlock: { group: 'mixer' },
};
export const ARRANGE_TYPES = ['drums', 'bass', 'lead', 'pad', 'texture'];
// The instruments of the console (radio-arrangement D1): a + and a − each. kick is a drums track holding the bd row, beat
// a drums track holding the other rows; hook is the melody.
export const INSTRUMENTS = ['kick', 'beat', 'bass', 'arp', 'hook', 'guitar', 'pad', 'texture'];
// the parts a lock can hold: the instruments and the riser (D11, D12)
export const LOCK_PARTS = [...INSTRUMENTS, 'riser'];
// recommended tracks per instrument (D4): past it the console warns, it never blocks
export const RECOMMENDED = { kick: 1, beat: 2, bass: 2, arp: 3, hook: 3, guitar: 3, pad: 3, texture: 3 };
// the most tracks a song plays at once from the console (riser and voices not counted, D4)
export const TRACK_CAP = 12;
// the riser row (D11): lengths and sounds
export const RISER_BARS = ['auto', 2, 4, 8];
export const RISER_SOUNDS = ['noise'];
// the instrument of a track: kick and beat for drums (by id: kick, kick-2…), else its type; null for voices
export function instrumentOf(t) {
  if (!t) return null;
  if (t.type === 'drums') return /^kick(-\d+)?$/.test(t.id) ? 'kick' : 'beat';
  return ['bass', 'arp', 'hook', 'guitar', 'pad', 'texture', 'riser'].includes(t.type) ? t.type : null;
}
// the tracks a lock holds: the mixer's per-track locks and every track of a locked instrument (D12)
export const lockedIds = plan => [...new Set([...(plan.locked || []), ...(plan.tracks || []).filter(t => (plan.lockedParts || []).includes(instrumentOf(t))).map(t => t.id)])];
// the tracks the console counts (the riser marks a moment and is left out, D4)
const counted = t => t.type !== 'riser';
// whether the song's style can play an instrument: kick and beat need a groove with those rows; the riser always can
export function partHas(R, part) {
  if (part === 'riser') return true;
  if (part === 'kick' || part === 'beat') return !!(R.drums && (R.drums.grooves || []).some(g => Object.entries((GROOVES[g] || [])[1] || {}).some(([k, v]) => (part === 'kick' ? k === 'bd' : k !== 'bd') && String(v).includes('x'))));
  return !!R[part];
}
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
  const st = stateOf(song, plan, at), on = playing(st), locked = lockedIds(plan);
  // one more track of an instrument: the style has it or the song holds one, below the cap (a lock never blocks the
  // listener, D12; past the recommended count it warns, moreWarning)
  if (cmd.kind === 'more') {
    if (!st.tracks.some(t => instrumentOf(t) === cmd.part) && !partHas(plan.R, cmd.part)) return 'no-type';
    return on.filter(counted).length >= TRACK_CAP ? 'cap' : null;
  }
  if (cmd.kind === 'less') {
    if (!on.some(t => instrumentOf(t) === cmd.part)) return 'not-playing';
    return on.filter(counted).length <= 1 ? 'last-track' : null;
  }
  if (cmd.kind === 'riser') return riserTarget(plan, at, cmd) ? null : 'late';
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
    // (a lock keeps the director out, never the listener: radio-arrangement D12)
    if (cmd.kind === 'swap' && !mine.some(t => readyParts(t, plan.R, opts || {}, plan.parts).length)) return 'no-ready';
    return null;
  }
  if (cmd.kind === 'remove') {
    const mine = on.filter(t => ofType(t, cmd.type));
    if (!mine.length) return 'no-type';
    if (on.length <= 1) return 'last-track';
    return mine.some(t => !locked.includes(t.id)) ? null : 'locked';
  }
  if (['darker', 'brighter', 'dirtier', 'cleaner', 'more-space'].includes(cmd.kind)) {
    const ok = candidateMoves(st, { usual: plan.usualHigh, weights: plan.R.energy, hardMax: plan.hardMax }, new Set(), stream('probe')).some(m => m.kind === cmd.kind);
    return ok ? null : 'no-target';
  }
  // the voice instrument: a quiet part must come after the bar (and a track to stop, for "never")
  if (cmd.kind === 'voice') {
    if (nextQuiet(song, at) === null) return 'no-quiet';
    if (cmd.voice && cmd.voice.presence === 'never' && !song.tracks.some(t => t.type === 'spoken')) return 'no-voice';
    return null;
  }
  if (cmd.kind === 'drop') return plan.plan.slice(Math.ceil(at / (2 * plan.phrase))).some(d => d.role === 'drop') ? null : 'no-drop';
  return null;
}
export const canApply = (cmd, song, plan, now) => !whyNot(cmd, song, plan, now);

// The tracks of an instrument playing at the bar where a command given now applies, and whether one more goes past the
// recommended count (D4): { part, count (after the press), rec } or null
export function partCount(song, plan, now, part) {
  const at = Math.min(plan.bars - 1, applyBar('more', now, plan));
  return playing(stateOf(song, plan, at)).filter(t => instrumentOf(t) === part).length;
}
export function moreWarning(part, song, plan, now) {
  const n = partCount(song, plan, now, part) + 1;
  return n > RECOMMENDED[part] ? { part, count: n, rec: RECOMMENDED[part] } : null;
}

// The riser of a command given at bar `at` (D11): it ends on the next part change (a double phrase where the role
// changes; when none is left, the next double phrase), at least 2 bars ahead; up: the bars before the change, down: the
// bars after it. bars: auto (the style's riser length, else 8), 2, 4 or 8, never more than the bars there are, and a
// length the change bar divides, so the sweep starts on its first bar. → { change, start, end, bars, dir, sound } or null
export function riserTarget(plan, at, cmd = {}) {
  const dbl = 2 * plan.phrase, dir = cmd.dir === 'down' ? 'down' : 'up', roles = plan.plan.map(d => d.role);
  const ok = d => d > 0 && d < roles.length && d * dbl - at >= 2;
  let d = roles.findIndex((r, i) => ok(i) && r !== roles[i - 1]);
  if (d < 0) d = roles.findIndex((r, i) => ok(i));
  if (d < 0) return null;
  const change = d * dbl, room = dir === 'up' ? change - at : plan.bars - change;
  const own = Number(((plan.R && plan.R.riser && plan.R.riser.settings) || {}).bars) || 8;
  const want = Number.isFinite(Number(cmd.bars)) && Number(cmd.bars) > 0 ? Number(cmd.bars) : own;
  const bars = [want, 8, 4, 2].find(b => b <= want && b <= room && change % b === 0);
  if (!bars) return null;
  return { change, start: dir === 'up' ? change - bars : change, end: dir === 'up' ? change : change + bars, bars, dir, sound: RISER_SOUNDS.includes(cmd.sound) ? cmd.sound : 'noise' };
}

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
  const on = varyTracks(playing(st), cmd.type || 'lead');
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

// ---------- per-instrument arrangement (radio-arrangement) ----------

const listOf = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
// the steps of a drums pattern as rows of x and dots on n steps (rows or a beat idea), for comparing grooves
function rowsOf(p, n) {
  if (!p) return {};
  if (p.rows) return Object.fromEntries(Object.entries(p.rows).map(([k, v]) => [k, fitSteps(v, n)]));
  const beat = p.idea && p.idea.beat;
  if (!beat) return {};
  const grid = beat.grid || n;
  return Object.fromEntries(Object.entries(beat).filter(([k]) => k !== 'grid').map(([k, v]) => { const on = new Set(String(v).split(',').map(Number)); return [k, fitSteps(Array.from({ length: grid }, (_, i) => (on.has(i) ? 'x' : '.')).join(''), n)]; }));
}
// an idea an octave up (semitones on notes; 7 degrees on scale degrees), through a numeric add, else a numeric sub
function shiftIdea(idea, semis) {
  if (!idea || !semis) return idea;
  const n = idea.degrees !== undefined || (idea.from !== undefined && idea.scale) ? Math.round(semis / 12) * 7 : semis;
  if (idea.add === undefined || typeof idea.add === 'number') return { ...idea, add: (idea.add || 0) + n };
  if (idea.sub === undefined || typeof idea.sub === 'number') return { ...idea, sub: (idea.sub || 0) - n };
  return idea;
}
// A new track of an instrument (D2, D3): the style's track for it, with an instance id and name when the song holds the
// instrument already, and then a sound, a pattern, a register and a level that differ from the tracks of the
// instrument in the song. Seeded by the command (seed), so a replay gives the same track.
function newTrack(P, O, part, st, at, seed) {
  const r = stream(seed, 'track'), R = P.R;
  const same = P.tracks.filter(t => instrumentOf(t) === part), ids = new Set(P.tracks.map(t => t.id));
  // (a song holding an instrument its style does not give, a mix of styles: a copy of its own track)
  const tpl = trackForPart(R, part, P.meter, complexityOf(P, O), r) || (same.length ? JSON.parse(JSON.stringify({ ...same[0], id: same[0].id.replace(/-\d+$/, ''), name: String(same[0].name || same[0].id).replace(/ \d+$/, '') })) : null);
  if (!tpl) return null;
  let id = tpl.id, k = 1;
  while (ids.has(id)) id = `${tpl.id}-${++k}`;
  const t = { ...tpl, id, name: k > 1 ? `${tpl.name} ${k}` : tpl.name, settings: { ...tpl.settings }, ...(tpl.rack ? { rack: tpl.rack.slice() } : {}) };
  const n = meterSteps(P.meter), compose_ = composesOnAir(O) && part !== 'texture';
  // the pattern: drums from a groove of the style the instrument does not play yet, composed parts that differ from the
  // instrument's ideas, else a preset it does not hold
  if (t.type === 'drums') {
    const held = new Set(same.flatMap(x => Object.values(x.patterns || {})).map(p => JSON.stringify(rowsOf(p, n))));
    const others = new Set(same.flatMap(x => Object.values(x.patterns || {})).flatMap(p => Object.keys(rowsOf(p, n))));
    const pick = [];
    for (const g of r.shuffle((R.drums.grooves || []).slice())) {
      let rows = Object.fromEntries(Object.entries((GROOVES[g] || [])[1] || {}).filter(([k, v]) => String(v).includes('x') && (part === 'kick' ? k === 'bd' : k !== 'bd')).map(([k, v]) => [k, fitSteps(v, n)]));
      // a second beat keeps the rows the other beats do not play, when it can (hats against percussion)
      if (part === 'beat' && same.length) { const own = Object.fromEntries(Object.entries(rows).filter(([k]) => !others.has(k))); if (Object.keys(own).length) rows = own; }
      if (Object.keys(rows).length && !pick.some(x => JSON.stringify(x) === JSON.stringify(rows))) pick.push(rows);
    }
    // (another groove than every pattern of the instrument; else than the ones playing on the boundary)
    const now = new Set(same.map(x => { const y = st.tracks.find(z => z.id === x.id); return y ? JSON.stringify(rowsOf((x.patterns || {})[(y.clips[0] || {}).pattern || 'A'], n)) : ''; }));
    const fresh = pick.filter(x => !held.has(JSON.stringify(x))), notNow = pick.filter(x => !now.has(JSON.stringify(x)));
    const list = fresh.length ? fresh : notNow.length ? notNow : pick;
    if (list.length) t.patterns = { A: { rows: list[0] }, ...(list[1] ? { B: { rows: list[1] } } : {}) };
  } else if (compose_ && KIND_OF_TYPE_MELODIC.includes(t.type)) {
    const M = airInputs(P, O, st, at), avoid = same.flatMap(ideasOf);
    const A = airIdea(t, R, { ...M, seed: `${seed}:A`, avoid });
    const B = A && airIdea(t, R, { ...M, seed: `${seed}:B`, avoid: [...avoid, A] });
    if (A) t.patterns = { A: { idea: A }, ...(B ? { B: { idea: B } } : {}) };
  } else if (same.length) {
    const rr = R[t.type] || {}, list = t.type === 'guitar' ? rr.patterns : t.type === 'texture' ? rr.rhythms : rr.presets;
    const key = t.type === 'texture' ? 'rhythm' : 'preset', held = new Set(same.flatMap(x => Object.values(x.patterns || {})).map(p => p[key]));
    const rest = (list || []).filter(x => !held.has(x));
    if (rest.length) { const a = (t.patterns.A || {}).speed; t.patterns = { A: { [key]: r.pick(rest), ...(a ? { speed: a } : {}) } }; }
  }
  if (!same.length) return t;
  // the sound: one of the style's the instrument does not use, a composed one when the style names sound kinds
  const rr = R[t.type] || {}, s = t.settings;
  const other = (list, key) => { const used = new Set(same.map(x => (x.settings || {})[key])), rest = (list || []).filter(x => !used.has(x)); return rest.length ? r.pick(rest) : (list && list.length ? r.pick(list) : s[key]); };
  if (t.type === 'drums') s.kit = other(rr.kits && rr.kits.length ? rr.kits : KITS, 'kit');
  else if (t.type === 'guitar') s.type = other(rr.types && rr.types.length ? rr.types : Object.keys(GUITAR_TYPES), 'type');
  else if (t.type === 'texture') s.sample = other(rr.samples && rr.samples.length ? rr.samples : TEXTURES, 'sample');
  else if (s.wave !== undefined) {
    const kinds = rr.material && rr.material.sounds && rr.material.sounds.length;
    const used = new Set(same.map(x => (x.settings || {}).wave));
    let done = false;
    for (let j = 0; kinds && j < 4 && !done; j++) {
      const c = compose('sound', { seed: `${seed}:sound:${j}`, style: rr.material, type: t.type, energy: 0.5, octave: s.octave });
      if (c && c.settings && !used.has(c.settings.wave)) { Object.assign(s, c.settings); if (c.rack && c.rack.length) t.rack = c.rack.slice(); done = true; }
    }
    if (!done) s.wave = other(rr.waves && rr.waves.length ? rr.waves : WAVES.map(x => x[0]), 'wave');
  }
  // the register: an octave above the highest of the instrument (melodic parts; a second bass plays as a mid bass)
  if (t.type === 'hook') s.octave = String(Math.min(6, Math.max(...same.map(x => Number((x.settings || {}).octave) || 4)) + 1));
  else if (t.type === 'guitar') { const top = Math.max(...same.map(x => Number((x.settings || {}).octave) || 0)); s.octave = String(top + 12 <= 12 ? top + 12 : top - 12); }
  else if (['arp', 'bass', 'pad'].includes(t.type)) t.patterns = Object.fromEntries(Object.entries(t.patterns).map(([key, p]) => [key, p.idea ? { ...p, idea: shiftIdea(p.idea, 12) } : p]));
  // the level: under the instrument's loudest track (x 0.75 for a second one, x 0.6 for a third or a second bass) (the headroom rule scales the whole song)
  const gains = same.map(x => (x.settings || {}).gain).filter(Number.isFinite);
  if (Number.isFinite(s.gain)) s.gain = round2((gains.length ? Math.max(...gains) : s.gain) * (same.length === 1 && part !== 'bass' ? 0.75 : 0.6));
  return t;
}
const KIND_OF_TYPE_MELODIC = ['bass', 'arp', 'hook', 'pad', 'guitar'];
// The track "−" takes away (D2): among the playing tracks of the instrument, the listener's last one, else the one
// whose add step is latest, else the last in the song's order
function lastAdded(P, song, on, part, at) {
  const mine = on.filter(t => instrumentOf(t) === part);
  if (!mine.length) return null;
  const lis = (P.added || []).map((a, j) => ({ ...a, j })).filter(a => mine.some(t => t.id === a.id)).sort((a, b) => b.i - a.i || b.j - a.j)[0];
  if (lis) return lis.id;
  const addAt = id => Math.max(-1, ...(song.build || []).filter(s => s.at <= at && listOf(s.add).includes(id)).map(s => s.at));
  const order = id => P.tracks.findIndex(x => x.id === id);
  return mine.slice().sort((a, b) => addAt(b.id) - addAt(a.id) || order(b.id) - order(a.id))[0].id;
}
// The listener's risers (D11) on a directed song, from bar `from` on: on its first bar the riser track takes the length
// and direction and comes in, on its last it goes and takes back its own values. The riser track joins the song when
// the director did not use it.
function placeRisers(song, P, from) {
  let tracks = song.tracks;
  const steps = (song.build || []).slice(), bars = P.bars;
  for (const r of P.risers) {
    const own = P.tracks.find(x => x.id === r.track);
    if (!own) continue;
    if (!tracks.some(x => x.id === r.track)) {
      const t = { ...JSON.parse(JSON.stringify(own)), clips: [{ start: 0, bars, pattern: 'A' }] }, v = tracks.findIndex(x => x.type === 'voice' || x.type === 'spoken');
      tracks = v < 0 ? [...tracks, t] : [...tracks.slice(0, v), t, ...tracks.slice(v)];
    }
    const base = own.settings || {}, back = { bars: base.bars ?? '8', dir: base.dir ?? 'up' };
    if (r.start >= from) steps.push({ at: r.start, set: { track: r.track, bars: String(r.bars), dir: r.dir }, by: 'listener' }, { at: r.start, add: r.track, by: 'listener' });
    if (r.end >= from && r.end < bars) steps.push({ at: r.end, remove: r.track, by: 'listener' }, { at: r.end, set: { track: r.track, ...back }, by: 'listener' });
  }
  return { ...song, tracks, build: steps.map((x, i) => [x, i]).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]).map(([x]) => x) };
}
// Headroom (D5): from bar `from`, on each phrase where more tracks play than the song's usual count, every track whose
// gain the listener did not set plays at sqrt(usual / n) of its own gain (equal power), as set steps on the phrase; back
// to its gain when the count comes down. Only in songs where the listener added tracks.
function headroom(song, P, from) {
  const ph = P.phrase, usual = Math.max(1, P.usualHigh), all = buildSteps(song);
  const own = Object.fromEntries(song.tracks.filter(t => counted(t) && t.type !== 'voice' && t.type !== 'spoken' && t.settings && Number.isFinite(t.settings.gain) && !(t.pinned || []).includes('gain')).map(t => [t.id, t.settings.gain]));
  const types = Object.fromEntries(song.tracks.map(t => [t.id, t.type]));
  // (the song walked bar by bar without copies: which tracks play and the gain each one has)
  const brought = new Set(all.flatMap(s => [...listOf(s.add), ...(s.clone ? [s.clone.track] : [])]));
  const on = new Map(song.tracks.map(t => [t.id, !brought.has(t.id)])), gain = new Map(song.tracks.map(t => [t.id, (t.settings || {}).gain]));
  const apply = s => {
    listOf(s.add).forEach(id => on.set(id, true)); listOf(s.remove).forEach(id => on.set(id, false));
    if (s.clone) on.set(s.clone.track, true);
    if (s.set && s.set.gain !== undefined) gain.set(s.set.track, s.set.gain);
  };
  const out = (song.build || []).slice();
  let j = 0;
  for (let at = Math.ceil(from / ph) * ph; at < P.bars; at += ph) {
    while (j < all.length && all[j].at <= at) apply(all[j++]);
    const n = [...on].filter(([id, v]) => v && types[id] !== 'riser' && types[id] !== 'voice' && types[id] !== 'spoken').length;
    const f = n > usual ? Math.sqrt(usual / n) : 1;
    for (const [id, g] of Object.entries(own)) {
      const want = round2(g * f);
      // (a silent track takes its gain on the phrase it comes in)
      if (on.get(id) && Math.abs(gain.get(id) - want) > 0.004) { out.push({ at, set: { track: id, gain: want }, by: 'listener' }); gain.set(id, want); }
    }
  }
  return { ...song, build: out.map((x, i) => [x, i]).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]).map(([x]) => x) };
}

// One command applied to a song: the modified plan and options, and the rewrite from its bar.
function rewrite(song, plan, opts, cmd, rng) {
  const P = { ...plan, plan: plan.plan.map(d => ({ ...d, ...(d.curves ? { curves: { ...d.curves } } : {}) })), tracks: plan.tracks.map(t => ({ ...t, settings: { ...(t.settings || {}) } })), harmony: (plan.harmony || []).slice(), locked: (plan.locked || []).slice() };
  if (plan.varied) P.varied = plan.varied.slice();
  // radio-arrangement: the listener's tracks (added), their + and − on the boundaries (arrange), the locked instruments
  // and the listener's risers; written back only when used, so the plans of other songs keep their fields
  for (const k of ['added', 'arrange', 'lockedParts', 'risers']) if (plan[k]) P[k] = plan[k].slice();
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
  if (cmd.kind === 'voice') {
    P.voiceAir = [...(plan.voiceAir || []), { at, voice: cmd.voice || {}, seed: `${rng.seed}:voice:${rng.n}:${rng.i}` }];
    return { song: voiceAir(song, P, [P.voiceAir[P.voiceAir.length - 1]]), plan: P, opts: O };
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
      // (the listener's sound commands reach locked tracks too, radio-arrangement D12)
      for (const m of candidateMoves(st, ctx, new Set(), rng.moves)) if (m.kind === cmd.kind && !seen.has(m.track)) { seen.add(m.track); forced.push({ ...m, mixer: true }); }
      break;
    }
    case 'instrument': {
      const t = cmd.track ? st.tracks.find(x => x.id === cmd.track) : on.filter(x => ['hook', 'arp', 'guitar', 'pad', 'bass'].includes(x.type)).sort((a, b) => ['hook', 'arp', 'guitar', 'pad', 'bass'].indexOf(a.type) - ['hook', 'arp', 'guitar', 'pad', 'bass'].indexOf(b.type))[0];
      const set = t && otherSound(t, P.R, rng.moves);
      if (set) forced.push({ kind: 'instrument', phrase: 'variation', track: t.id, mixer: true, step: { set: { track: t.id, ...set } } });
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
    case 'unlock': {
      // a track of a locked instrument unlocked in the mixer: that track only; the instrument keeps its other tracks
      // locked one by one (the console shows the half state, D12)
      const part = instrumentOf(P.tracks.find(x => x.id === cmd.track));
      if (part && (P.lockedParts || []).includes(part)) {
        P.lockedParts = P.lockedParts.filter(x => x !== part);
        P.locked = [...new Set([...P.locked, ...P.tracks.filter(x => instrumentOf(x) === part && x.id !== cmd.track).map(x => x.id)])];
      }
      P.locked = P.locked.filter(x => x !== cmd.track);
      break;
    }
    case 'lock-part': if (LOCK_PARTS.includes(cmd.part)) P.lockedParts = [...new Set([...(P.lockedParts || []), cmd.part])]; break;
    case 'unlock-part':
      P.lockedParts = (P.lockedParts || []).filter(x => x !== cmd.part);
      P.locked = P.locked.filter(id => instrumentOf(P.tracks.find(x => x.id === id)) !== cmd.part);
      break;
    case 'more': {
      if (!INSTRUMENTS.includes(cmd.part)) break;
      // a silent track of the instrument the song holds (not one the listener added, nor one muted in the mixer), else a
      // new one from the style that differs from the instrument's tracks (D2, D3)
      const added = P.added || [];
      let t = st.tracks.filter(x => x.mute && instrumentOf(x) === cmd.part && !added.some(a => a.id === x.id) && !P.locked.includes(x.id)).sort((a, b) => ENTRY.indexOf(a.type) - ENTRY.indexOf(b.type))[0];
      if (!t) { t = newTrack(P, O, cmd.part, st, at, `${rng.seed}:more:${rng.n}:${rng.i}`); if (t) P.tracks.push(t); }
      if (!t) break;
      P.added = [...added, { id: t.id, part: cmd.part, at, i: rng.i }];
      P.arrange = [...(P.arrange || []), { kind: 'more', track: t.id, type: t.type, at }];
      // past the style's maximum the song's maximum follows, so the director does not undo it (D4)
      const n = on.filter(counted).length + 1;
      if (n > P.hardMax) P.hardMax = n;
      break;
    }
    case 'less': {
      const id = lastAdded(P, song, on, cmd.part, at);
      if (!id) break;
      P.added = (P.added || []).filter(a => a.id !== id);
      P.arrange = [...(P.arrange || []), { kind: 'less', track: id, at }];
      break;
    }
    case 'riser': {
      const r = riserTarget(P, at, cmd);
      if (!r) break;
      let tr = P.tracks.find(x => x.type === 'riser');
      // a style without a riser: the listener's own, which the director never uses (D11)
      if (!tr) { tr = trackForPart(P.R, 'riser', P.meter, 0.5, rng.moves); P.tracks.push(tr); P.ownRiser = tr.id; }
      // one riser per change: a later command on the same change replaces the earlier one
      P.risers = [...(P.risers || []).filter(x => x.change !== r.change), { ...r, track: tr.id }];
      break;
    }
    default: break;
  }
  // the listener's + and − on the boundaries from here (radio-arrangement): forced again on every rewrite, so a later
  // command never drops them (each boundary in their order)
  const arranged = (P.arrange || []).filter(e => e.at >= Math.round(at / ph) * ph && e.at < P.plan.length * dbl);
  if (forced.length || arranged.length) from = Math.round(at / ph);
  P.bars = P.plan.length * dbl;
  P.sections = sectionsWith(P);
  if (P.risers) P.risers = P.risers.filter(r => r.end <= P.bars && r.change < P.bars);
  const forcedAt = forced.length ? { [from]: forced } : {};
  for (const e of arranged) {
    const k = e.at / ph;
    (forcedAt[k] = forcedAt[k] || []).push(e.kind === 'more' ? { kind: 'add', phrase: ADD_PHRASE[e.type] || 'add-lead', track: e.track, mixer: true, step: { add: e.track } } : { kind: 'strip', track: e.track, mixer: true, step: { remove: e.track } });
  }
  // varied parts stay: their steps from the boundary on are kept as the listener's
  const varied = (P.varied || []).filter(s => s.at >= from * ph).map(s => ({ ...s }));
  const keep = [...(song.build || []).filter(s => s.at < from * ph), ...extra, ...varied].sort((a, b) => a.at - b.at);
  const locked = [...lockedIds(P), ...(P.ownRiser ? [P.ownRiser] : [])];
  const dir = directSong(P, O, rng, rng.comments, { keep, from, forced: forcedAt, locked, protect: (P.added || []).map(a => ({ id: a.id, at: a.at })), hold: (P.risers || []).map(r => [r.start, r.end]) });
  let out = {
    ...song,
    sections: P.sections.map(({ role, ...s }) => s),
    tracks: dir.tracks.map(t => { const own = P.tracks.find(x => x.id === t.id); return own && own.pinned ? { ...t, settings: { ...t.settings, ...own.settings }, pinned: own.pinned } : t; }),
    build: dir.steps,
  };
  if (P.risers && P.risers.length) out = placeRisers(out, P, from * ph);
  if ((P.arrange || []).some(e => e.kind === 'more')) out = headroom(out, P, from * ph);
  return { song: voiceAir(out, P, P.voiceAir || []), plan: P, opts: O, phrases: dir.phrases };
}

// The voice instrument changes of the listener (voice-placement), in order, on a song: each one rewrites the spoken
// track from the first quiet part after its bar (rewriteSpoken), with the plan's style; one that finds no quiet part
// changes nothing
function voiceAir(song, P, list) {
  let cur = song;
  for (const e of list) {
    const sp = cur.tracks.find(t => t.type === 'spoken');
    const r = rewriteSpoken(cur, sp ? sp.id : null, e.voice, { spoken: (P.R && P.R.spoken) || null, from: e.at, seed: e.seed });
    if (r) cur = r.song;
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
