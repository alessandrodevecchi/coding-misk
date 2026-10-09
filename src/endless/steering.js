// Radio steering (#24, docs/ENDLESS.md "Steering"): the listener's commands turn into a rewrite of the song on
// air from a boundary. A song is always rebuilt from its original plan plus every command still standing,
// in order, so cancelling a command or replaying a session gives exactly the same song.
import { directSong, sectionsOf, candidateMoves, ENTRY, tracksOfKind, liftOf, OPTION_DEFAULTS } from './director.js';
import { stream } from './random.js';
import { stateAt } from '../song/build.js';
import { playing, curveParts, CURVES } from './energy.js';
import { WAVES, TEXTURES, GUITAR_TYPES, KITS, KEYS, meterSteps } from '../music.js';

// commands of the console: group, whether they change the song's structure (applied on a double phrase)
export const COMMANDS = {
  'energy-up': { group: 'energy' }, 'energy-down': { group: 'energy' },
  add: { group: 'arrangement' }, remove: { group: 'arrangement' }, 'more-complex': { group: 'arrangement' }, 'less-complex': { group: 'arrangement' },
  darker: { group: 'sound' }, brighter: { group: 'sound' }, dirtier: { group: 'sound' }, cleaner: { group: 'sound' }, 'more-space': { group: 'sound' }, instrument: { group: 'sound' },
  progression: { group: 'harmony', structural: true }, key: { group: 'harmony', structural: true },
  'talk-more': { group: 'voice' }, 'talk-less': { group: 'voice' },
  drop: { group: 'song', structural: true }, stay: { group: 'song', structural: true }, extend: { group: 'song', structural: true }, end: { group: 'song', structural: true },
  curve: { group: 'curve' }, 'curve-reset': { group: 'curve' },
  // mixer: on the next bar
  volume: { group: 'mixer', bar: true }, mute: { group: 'mixer', bar: true }, unmute: { group: 'mixer', bar: true }, lock: { group: 'mixer' }, unlock: { group: 'mixer' },
};
export const ARRANGE_TYPES = ['drums', 'bass', 'lead', 'pad', 'texture'];
const LEAD = ['arp', 'hook', 'guitar'];
const ofType = (t, type) => (type === 'lead' ? LEAD.includes(t.type) : t.type === type);
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
  const base = { tracks: [...plan.tracks.map(t => ({ ...t, mute: true, clips: [{ start: 0, bars: plan.bars, pattern: 'A' }] })), ...song.tracks.filter(t => t.type === 'voice')], build: song.build };
  return stateAt(base, bar).song;
}

// why a command cannot apply now, or null when it can (for the console: disabled buttons say why)
//   late, no-type, all-playing, locked, last-track, no-target, no-drop
// tail: bars at the end of the song where the transition to the next song already plays (extend cannot go there)
export function whyNot(cmd, song, plan, now, tail = 0) {
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

// One command applied to a song: the modified plan and options, and the rewrite from its bar.
function rewrite(song, plan, opts, cmd, rng) {
  const P = { ...plan, plan: plan.plan.map(d => ({ ...d, ...(d.curves ? { curves: { ...d.curves } } : {}) })), tracks: plan.tracks.map(t => ({ ...t, settings: { ...(t.settings || {}) } })), harmony: (plan.harmony || []).slice(), locked: (plan.locked || []).slice() };
  const O = { ...opts };
  const ph = P.phrase, dbl = 2 * ph, at = cmd.at;
  const extra = [], forced = [];
  let from = Math.ceil(at / ph);
  const d0 = Math.floor(from / 2);
  const st = stateOf(song, P, at), on = playing(st);
  const ctx = { usual: P.usualHigh, weights: P.R.energy, hardMax: P.hardMax };
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
      if (t) forced.push({ kind: 'add', track: t.id, step: { add: t.id } });
      break;
    }
    case 'remove': {
      const ids = on.filter(x => ofType(x, cmd.type) && !P.locked.includes(x.id)).map(x => x.id);
      if (ids.length) forced.push({ kind: 'strip', track: ids[0], tracks: ids, step: { remove: ids } });
      break;
    }
    case 'more-complex': case 'less-complex':
      P.usualHigh = clamp(P.usualHigh + (cmd.kind === 'more-complex' ? 1 : -1), P.R.tracks.usual[0], P.hardMax);
      break;
    case 'darker': case 'brighter': case 'dirtier': case 'cleaner': case 'more-space': {
      const seen = new Set();
      for (const m of candidateMoves(st, ctx, new Set(P.locked), rng.moves)) if (m.kind === cmd.kind && !seen.has(m.track)) { seen.add(m.track); forced.push(m); }
      break;
    }
    case 'instrument': {
      const t = cmd.track ? st.tracks.find(x => x.id === cmd.track) : on.filter(x => ['hook', 'arp', 'guitar', 'pad', 'bass'].includes(x.type)).sort((a, b) => ['hook', 'arp', 'guitar', 'pad', 'bass'].indexOf(a.type) - ['hook', 'arp', 'guitar', 'pad', 'bass'].indexOf(b.type))[0];
      const set = t && otherSound(t, P.R, rng.moves);
      if (set) forced.push({ kind: 'instrument', track: t.id, mixer: !!cmd.track, step: { set: { track: t.id, ...set } } });
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
  const keep = [...(song.build || []).filter(s => s.at < from * ph), ...extra].sort((a, b) => a.at - b.at);
  const dir = directSong(P, O, rng, rng.comments, { keep, from, forced: forced.length ? { [from]: forced } : {}, locked: P.locked });
  const out = {
    ...song,
    sections: P.sections.map(({ role, ...s }) => s),
    tracks: dir.tracks.map(t => { const own = P.tracks.find(x => x.id === t.id); return own && own.pinned ? { ...t, settings: { ...t.settings, ...own.settings }, pinned: own.pinned } : t; }),
    build: dir.steps,
  };
  return { song: out, plan: P, opts: O, phrases: dir.phrases };
}

// The song after every command, from the original. commands: [{ kind, at, type?, track?, d?, value? }] in order.
// seed and n name the random streams, so the same commands always give the same song.
export function steerSong({ song, plan, opts, commands, seed, n }) {
  let cur = { song: clone(song), plan, opts };
  commands.forEach((cmd, i) => {
    const rng = { moves: stream(seed, `steer:${n}:${i}:moves`), comments: stream(seed, `steer:${n}:${i}:comments`) };
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
