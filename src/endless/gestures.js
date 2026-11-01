// Effect gestures of the endless director (director-fold-ring, #90, docs/ENDLESS.md "Effect gestures"): a few musical
// shapes built from the Fold, Ring and FM rack devices, placed on the tracks of a generated song after its moves are
// written, from a random stream of their own (gestures/<song index>), so a song that draws none stays as it was.
// Pure and deterministic, like the director: no Node or browser APIs, no Math.random.
import { BASS, HOOKS, PADS, TEX_RHYTHMS, KEYS, meterSteps } from '../music.js';
import { stateAt } from '../song/build.js';
import { stream } from './random.js';

// the five gestures (D1)
export const GESTURES = ['foldPhrase', 'foldRise', 'ringHeld', 'metalHits', 'fmRise'];
export const GESTURE_NAMES = { foldPhrase: 'Folded phrase', foldRise: 'Fold rise into the drop', ringHeld: 'Ringing held note', metalHits: 'Metal hits', fmRise: 'FM rise with fold' };
// The default rate by genre family (D4): how many songs get gestures and which ones, the first listed preferred. A style
// recipe may say its own (`gestures`); a genre not listed (pop, experimental) takes the family named in `genres`.
export const GESTURE_FAMILIES = {
  hard: { genres: ['techno', 'industrial', 'drum-and-bass'], songs: 0.6, weights: { metalHits: 3, foldRise: 2, foldPhrase: 1.5 } },
  synth: { genres: ['synthwave', 'experimental'], songs: 0.5, weights: { fmRise: 3, foldRise: 2, ringHeld: 1.5 } },
  club: { genres: ['house', 'trance', 'pop'], songs: 0.35, weights: { foldRise: 3, fmRise: 2 } },
  beats: { genres: ['hip-hop'], songs: 0.35, weights: { foldPhrase: 3, metalHits: 2 } },
  soft: { genres: ['ambient'], songs: 0.3, weights: { ringHeld: 1 } },
  // (a folded phrase on the bass or the drums only)
  acoustic: { genres: ['rock', 'metal', 'country', 'jazz'], songs: 0.05, weights: { foldPhrase: 1 }, foldTypes: ['drums', 'bass'] },
};
export const familyOf = genre => Object.keys(GESTURE_FAMILIES).find(k => GESTURE_FAMILIES[k].genres.includes(genre)) || 'synth';
// the rate of a song: its style's `gestures` field over its genre family's default → { family, songs, weights, foldTypes }
export function gestureRate(recipe) {
  const family = familyOf(recipe && recipe.genre), F = GESTURE_FAMILIES[family], own = (recipe && recipe.gestures) || {};
  return { family, songs: own.songs ?? F.songs, weights: { ...(own.weights || F.weights) }, foldTypes: F.foldTypes || null };
}
// The recipe field (D4): { songs: 0..1, weights: { gesture: weight ≥ 0 } }; err(path, message)
export function checkGestures(g, err) {
  if (g === undefined) return;
  if (!g || typeof g !== 'object' || Array.isArray(g)) { err('gestures', `an object: { "songs": 0.5, "weights": { ${GESTURES.map(k => `"${k}": 1`).join(', ')} } }`); return; }
  for (const k of Object.keys(g)) if (!['songs', 'weights'].includes(k)) err(`gestures.${k}`, 'unknown field; fields: songs, weights');
  if (g.songs !== undefined && !(typeof g.songs === 'number' && g.songs >= 0 && g.songs <= 1)) err('gestures.songs', 'the share of songs with gestures, from 0 to 1');
  if (g.weights !== undefined) {
    if (!g.weights || typeof g.weights !== 'object' || Array.isArray(g.weights)) err('gestures.weights', `weights by gesture: ${GESTURES.join(', ')}`);
    else for (const [k, v] of Object.entries(g.weights)) { if (!GESTURES.includes(k)) err(`gestures.weights.${k}`, `one of ${GESTURES.join(', ')}`); else if (!(typeof v === 'number' && v >= 0)) err(`gestures.weights.${k}`, 'a weight: a number from 0'); }
  }
}

// Ranges per track kind (D2): Fold amount and curves, Ring frequency (Hz, or ratios of the key's root) and amount, the
// FM rise's top index. Metal hits use the drums' Ring whatever the track.
export const RANGES = {
  drums: { fold: [1.5, 2.5], curves: ['sharp'], ring: [300, 1200], ringAmount: [0.5, 1] },
  bass: { fold: [1.2, 2.2], curves: ['soft'], fm: [1, 2] },
  lead: { fold: [1.0, 2.0], curves: ['sharp', 'soft'], ratios: [2, 3, 1.5], bell: 2.76, ringAmount: [0.3, 0.7], fm: [1.5, 3] },
  pad: { fold: [2.5, 3], curves: ['soft'], ratios: [1, 2, 1.5], ringAmount: [0.3, 0.6] },
};
const KIND = { drums: 'drums', bass: 'bass', hook: 'lead', arp: 'lead', pad: 'pad', texture: 'pad' };
// the root of a key in the octave 110 to 220 Hz (A 110)
export const rootHz = key => { const s = (KEYS.find(k => k[0] === key) || ['A', 0])[1]; let f = 110 * 2 ** (s / 12); while (f < 110) f *= 2; while (f >= 220) f /= 2; return f; };
// waves the FM device works on (FM works only on synth oscillators)
export const FM_RISE_GAIN = 0.8;
const FM_WAVES = ['sawtooth', 'square', 'triangle', 'sine', 'saw', 'sqr', 'tri', 'sin'];
const HATS = ['hh', 'oh', 'rd'];
// the roles of the energy shapes a gesture uses (D1, as the shapes name them): busy parts (groove, build, peak and their
// kin in other shapes), quiet ones (intro, break, a trough or a fall, or a busy part where few tracks play), and the big moments a rise leads into (a drop, or a peak or
// a chorus after another part: the shapes without a break have no drop)
export const BUSY = ['groove', 'build', 'peak', 'wave', 'verse', 'chorus'], QUIET = ['intro', 'break', 'trough', 'fall'], BIG = ['drop', 'peak', 'chorus'];
const r2 = x => Math.round(x * 100) / 100;
const countX = s => (String(s).match(/x/gi) || []).length;

// notes per bar of a track as it plays (its pattern's steps; chords count each note): an estimate for the Ring rules (D5)
export function notesPerBar(t) {
  const p = (t.patterns || {})[((t.clips || [])[0] || {}).pattern || 'A'] || {};
  if (t.type === 'drums') return p.rows ? Object.values(p.rows).reduce((a, v) => a + countX(v), 0) : 8;
  if (t.type === 'arp') return Number(p.speed) || 16;
  if (t.type === 'bass') { const b = BASS[p.preset], r = b && b[1]; return p.notes || p.idea || !r ? 8 : Array.isArray(r) ? countX(r[0]) * 4 : countX(r) || 8; }
  if (t.type === 'hook') {
    const h = HOOKS[p.preset];
    if (!h || typeof h[1] !== 'string' || p.notes || p.idea) return 6;
    const first = (String(h[1]).match(/\[([^\]]*)\]/) || [null, h[1]])[1];
    return first.split(/\s+/).filter(x => x && x !== '~' && !/^[<>]$/.test(x)).length;
  }
  if (t.type === 'pad') { const pp = PADS[p.preset] || PADS.pad, r = pp[1]; return 4 * (!r ? 1 : Array.isArray(r) ? countX(r[0]) * 4 : countX(r) || 1); }
  if (t.type === 'texture') { const x = String((TEX_RHYTHMS[p.rhythm] || [null, 'X'])[1]), m = /\*(\d+)/.exec(x) || /\((\d+),/.exec(x); return m ? Number(m[1]) : 1; }
  return 8;
}
const hasHats = t => t.type === 'drums' && Object.entries(((t.patterns || {})[((t.clips || [])[0] || {}).pattern || 'A'] || {}).rows || {}).some(([k, v]) => HATS.includes(k) && countX(v) > 0);

// Places the gestures of one song (D1 to D5). plan: the song's plan (plan.plan, phrase, bars, key, bpm, meter, index,
// gestureRate); steps: the director's steps; base: its tracks (muted until added); opts: the song's options (seed, chaos,
// complexity, gestures); locked: track ids no gesture may use; guard: the listener's tracks.
// → [{ kind, tracks, start, end, steps }] in placing order; the steps go in the song's build.
export function placeGestures(plan, steps, base, opts, { locked = [], guard = null } = {}) {
  // (off for the checks, and at complexity 0: the plain songs of director version 2)
  if (opts.gestures === false || !((opts.complexity ?? 0.5) > 0)) return [];
  const rate = plan.gestureRate || gestureRate(plan.R);
  const r = stream(String(opts.seed), `gestures/${plan.index}`), chaos = opts.chaos ?? 0.3;
  if (!(rate.songs > 0) || !r.chance(rate.songs)) return [];
  const kinds = Object.keys(rate.weights).filter(k => GESTURES.includes(k) && rate.weights[k] > 0);
  if (!kinds.length) return [];
  const drawn = [r.weighted(kinds, kinds.map(k => rate.weights[k]))];
  const rest = kinds.filter(k => k !== drawn[0]);
  if (rest.length && r.chance(0.3 + 0.3 * chaos)) drawn.push(r.weighted(rest, rest.map(k => rate.weights[k])));

  const { phrase, bars } = plan, dbl = 2 * phrase, parts = plan.plan;
  const song = { ...base, build: steps }, cache = new Map();
  const at = b => { if (!cache.has(b)) cache.set(b, stateAt(song, b).song); return cache.get(b); };
  const trackAt = (id, b) => at(b).tracks.find(t => t.id === id);
  const on = b => at(b).tracks.filter(t => !t.mute && !['voice', 'spoken', 'riser'].includes(t.type));
  const roleAt = b => (parts[Math.floor(b / dbl)] || {}).role;
  const barsPerSecond = plan.bpm / 60 / (meterSteps(plan.meter) / 4);
  // the bars a span is checked on: its first bar and every phrase boundary inside it (the director's steps sit there)
  const checks = (a, b) => [a, ...Array.from({ length: Math.ceil((b - a) / phrase) }, (_, i) => Math.ceil(a / phrase) * phrase + i * phrase).filter(x => x > a && x < b)];
  const busiest = (b, drumsOnly = false) => { const l = on(b).filter(t => !drumsOnly || t.type === 'drums'); return l.length ? l.reduce((m, t) => (notesPerBar(t) > notesPerBar(m) ? t : m)).id : null; };
  const usable = t => t && !['voice', 'spoken', 'riser', 'guitar'].includes(t.type) && !locked.includes(t.id) && !(guard && guard.has(t.id));
  const placed = [];
  const free = (id, a, b) => !placed.some(g => g.tracks.includes(id) && g.start < b && a < g.end);
  // Fold and Distortion share a stage (D5): no Fold where the track has the drive setting or a Distortion device
  const clean = (id, a, b) => checks(a, b).every(x => { const t = trackAt(id, x); return t && !((t.settings || {}).drive > 0) && !(t.rack || []).some(d => d.on !== false && d.device === 'distort'); });
  // at most two Ring tracks at once (one on a song above 100 notes per second), the listener's included, and never the
  // busiest drum line (D5)
  const ringRoom = (id, a, b) => checks(a, b).every(x => {
    const rings = new Set([...at(x).tracks.filter(t => (t.rack || []).some(d => d.on !== false && d.device === 'ring')).map(t => t.id), ...placed.filter(g => g.ring && g.start <= x && x < g.end).flatMap(g => g.ring)]);
    rings.delete(id);
    const dense = on(x).reduce((s, t) => s + notesPerBar(t), 0) * barsPerSecond > 100;
    return rings.size < (dense ? 1 : 2) && busiest(x, true) !== id;
  });
  const pickIn = ([lo, hi]) => r2(lo + (hi - lo) * r.range(0, 0.6 + 0.4 * chaos));
  const curveOf = kind => (kind === 'bass' && chaos > 0.6 ? r.pick(['soft', 'sharp']) : r.pick(RANGES[kind].curves));
  const drops = parts.map((p, d) => d).filter(d => d > 0 && BIG.includes(parts[d].role) && parts[d - 1].role !== parts[d].role && d * dbl < bars);
  // runs of parts with the same role: [start, end) in bars
  const runs = []; parts.forEach((p, d) => { const last = runs[runs.length - 1]; if (last && last.role === p.role) last.end = Math.min(bars, last.end + dbl); else runs.push({ role: p.role, start: d * dbl, end: Math.min(bars, (d + 1) * dbl) }); });
  const firstOn = (id, run) => { for (let x = run.start; x < run.end; x += phrase) { const t = trackAt(id, x); if (t && !t.mute) return x; } return -1; };
  const off = (end, s) => (end < bars ? [{ at: end, ...s }] : []);

  for (const kind of drawn) {
    let g = null;
    if (kind === 'foldPhrase') {
      const n = r.pick([1, 2]), types = rate.foldTypes || ['drums', 'bass', 'hook', 'arp'], pairs = [];
      for (let k = 1; k * phrase < bars; k++) {
        const a = k * phrase, b = Math.min(bars, a + n * phrase);
        if (!checks(a, b).every(x => BUSY.includes(roleAt(x)))) continue;
        const bd = busiest(a, true);
        for (const t of on(a)) if (types.includes(t.type) && usable(t) && !(t.type === 'drums' && t.id === bd) && free(t.id, a, b) && clean(t.id, a, b)) pairs.push([a, b, t]);
      }
      if (pairs.length) {
        const [a, b, t] = r.pick(pairs), K = KIND[t.type], dev = { track: t.id, device: 'fold', amount: pickIn(RANGES[K].fold), curve: curveOf(K) };
        g = { kind, tracks: [t.id], start: a, end: b, steps: [{ at: a, rack: dev }, ...off(b, { unrack: { track: t.id, device: 'fold' } })] };
      }
    } else if (kind === 'foldRise' || kind === 'fmRise') {
      const opts2 = [];
      for (const d of drops) {
        const a = d * dbl - phrase, b = d * dbl, bd = busiest(a, true);
        const lead = on(a).filter(t => usable(t) && free(t.id, a, b) && (kind === 'foldRise'
          ? ['bass', 'hook', 'arp'].includes(t.type) && clean(t.id, a, b)
          : ['bass', 'hook', 'arp'].includes(t.type) && FM_WAVES.includes((t.settings || {}).wave)));
        const drums = on(a).filter(t => t.type === 'drums' && t.id !== bd && usable(t) && free(t.id, a, b) && clean(t.id, a, b));
        if (lead.length) opts2.push([a, b, lead, drums]);
        else if (kind === 'foldRise' && drums.length) opts2.push([a, b, drums, []]);
      }
      if (opts2.length) {
        const [a, b, list, drums] = r.pick(opts2), t = r.pick(list), K = KIND[t.type];
        if (kind === 'foldRise') {
          const top = pickIn(RANGES[K].fold), low = Math.max(0.1, r2(top * 0.35)), n = Math.max(1, b - a);
          const values = Array.from({ length: n }, (_, i) => r2(n === 1 ? top : low + (top - low) * i / (n - 1)));
          g = { kind, tracks: [t.id], start: a, end: b, steps: [{ at: a, rack: { track: t.id, device: 'fold', steps: values, curve: curveOf(K) } }, ...off(b, { unrack: { track: t.id, device: 'fold' } })] };
        } else {
          // the FM device the track has (a composed sound) stays: the rise takes its index over the phrase, and the
          // drop gives it back; a track without one gets the device's defaults and loses it at the drop
          const own = (trackAt(t.id, a).rack || []).find(x => x.device === 'fm' && x.on !== false) || null;
          const oct = Number((t.settings || {}).octave) || 4, top = Math.min(r2(pickIn(RANGES[K === 'bass' ? 'bass' : 'lead'].fm)), 4 - Math.max(0, oct - 4));
          const fm = own ? { ...own } : { device: 'fm', index: 1, harmonicity: 1, wave: 'sine', decay: 0.3, sustain: 0.5 };
          delete fm.on;
          const out = [{ at: a, rack: { track: t.id, ...fm, device: 'fm', rise: { to: top, bars: b - a } } }, ...off(b, own ? { rack: { track: t.id, ...fm } } : { unrack: { track: t.id, device: 'fm' } })];
          // the rising index brightens the line into its filter, and its peak grows (measured up to +18% on a bass): the
          // track's gain goes down by FM_RISE_GAIN over the rise and back at the end, so it is never louder
          const gain = (trackAt(t.id, a).settings || {}).gain;
          if (Number.isFinite(gain) && gain > 0) out.push({ at: a, set: { track: t.id, gain: r2(gain * FM_RISE_GAIN) } }, ...off(b, { set: { track: t.id, gain } }));
          const tracks = [t.id];
          // the folded drum: the kick or the snare (never the busiest drum line), when one plays and is free
          const dr = drums.filter(x => x.id !== t.id);
          if (dr.length) {
            const k = r.pick(dr);
            out.push({ at: a, rack: { track: k.id, device: 'fold', amount: pickIn(RANGES.drums.fold), curve: 'sharp' } }, ...off(b, { unrack: { track: k.id, device: 'fold' } }));
            tracks.push(k.id);
          }
          g = { kind, tracks, start: a, end: b, steps: out.sort((x, y) => x.at - y.at) };
        }
      }
    } else if (kind === 'ringHeld') {
      const pairs = [], few = Math.max(2, Math.floor((plan.usualHigh || 5) / 2));
      for (const run of runs) {
        const quiet = BUSY.includes(run.role) && on(run.start).length <= few;
        if (!QUIET.includes(run.role) && !quiet) continue;
        for (const t of base.tracks) {
          if (!usable(t) || !(['pad', 'texture'].includes(t.type) || (t.type === 'hook' && notesPerBar(t) <= 4))) continue;
          const a = firstOn(t.id, run);
          if (a >= 0 && free(t.id, a, run.end) && ringRoom(t.id, a, run.end)) pairs.push([a, run.end, t]);
        }
      }
      if (pairs.length) {
        const [a, b, t] = r.pick(pairs), R = RANGES[KIND[t.type]], root = rootHz(plan.key);
        const ratio = t.type === 'hook' && r.chance(0.25) ? R.bell : r.pick(R.ratios);
        g = { kind, tracks: [t.id], ring: [t.id], start: a, end: b, steps: [{ at: a, rack: { track: t.id, device: 'ring', freq: Math.round(root * ratio), amount: pickIn(R.ringAmount) } }, ...off(b, { unrack: { track: t.id, device: 'ring' } })] };
      }
    } else if (kind === 'metalHits') {
      // a percussion line (a texture, or a drum line without hats) through a break or a trough; else, since the
      // director takes the drums out of a break, for one phrase of a busy part (never the busiest line)
      const perc = t => usable(t) && (t.type === 'texture' || (t.type === 'drums' && !hasHats(t)));
      let pairs = [];
      for (const run of runs.filter(x => ['break', 'trough'].includes(x.role))) for (const t of base.tracks) {
        if (!perc(t)) continue;
        const a = firstOn(t.id, run);
        if (a >= 0 && free(t.id, a, run.end) && ringRoom(t.id, a, run.end)) pairs.push([a, run.end, t]);
      }
      if (!pairs.length) for (let k = 1; k * phrase < bars; k++) {
        const a = k * phrase, b = Math.min(bars, a + phrase);
        if (!BUSY.includes(roleAt(a))) continue;
        for (const t of on(a)) if (perc(t) && free(t.id, a, b) && ringRoom(t.id, a, b)) pairs.push([a, b, t]);
      }
      if (pairs.length) {
        const [a, b, t] = r.pick(pairs);
        g = { kind, tracks: [t.id], ring: [t.id], start: a, end: b, steps: [{ at: a, rack: { track: t.id, device: 'ring', freq: Math.round(pickIn(RANGES.drums.ring) / 10) * 10, amount: pickIn(RANGES.drums.ringAmount) } }, ...off(b, { unrack: { track: t.id, device: 'ring' } })] };
      }
    }
    if (g) placed.push(g);
  }
  return placed;
}

// The steps of placed gestures in a song (copies). In a rewrite of the song from bar `from` (steering): a gesture that
// starts there or later leaves a track the listener locked (D5; one that started before stays as written), and a Fold
// whose track now has Distortion ends on the first bar where it has it. Steps past the song's end go, and so do the steps
// of a track the song no longer plays (ids: the tracks it adds). song: the song as the director wrote it, without the
// gestures.
export function gestureSteps(gestures, song, from, bars, ids, locked = []) {
  const out = [];
  for (const g of gestures || []) {
    let list = g.steps.filter(s => s.at < bars && ids.has((s.rack || s.unrack || s.set).track) && !(from > 0 && g.start >= from && locked.includes((s.rack || s.unrack || s.set).track)));
    if (from > 0) {
      const folds = list.filter(s => s.rack && s.rack.device === 'fold').map(s => s.rack.track);
      for (const id of folds) {
        const hit = [from, ...list.map(s => s.at)].filter(x => x >= from && x < g.end).find(x => { const t = stateAt(song, x).song.tracks.find(y => y.id === id); return t && (((t.settings || {}).drive > 0) || (t.rack || []).some(d => d.on !== false && d.device === 'distort')); });
        if (hit === undefined) continue;
        list = list.filter(s => !((s.rack || s.unrack || s.set).track === id && s.at >= hit && (s.rack ? s.rack.device === 'fold' : s.unrack ? s.unrack.device === 'fold' : false)));
        if (g.start < hit) list.push({ at: hit, unrack: { track: id, device: 'fold' } });
      }
    }
    out.push(...list);
  }
  return JSON.parse(JSON.stringify(out));
}
