// Natural growth like a live coder (live-coder-growth). At the start the growth draws 4 to 6 waypoints: small states
// of the song, the first with one or two tracks playing one note or a few hits, the last the song itself. Between two
// waypoints the build moves in small moves (a track in, a function in, a number, the notes a little fuller), in an
// order picked by a chooser separate from the moves. A passage between two waypoints may hold detours: something an
// earlier waypoint added is commented out, rewritten or muted, and comes back later. A track may come in as a clone of
// a playing one (its block copied, then changed). Pure and seeded: the same song grows the same way.
// growth-shapes: a shape ({ opening, development, kickEarly, masks, passing, moves }) changes when tracks come in
// (all in the first two waypoints for "parameters", drums late for the melodic opening, two tracks in solo for
// "mid-set"), how a written track comes in (a muted line loses its "_"), masks per phrase, a passing melody, and moves
// (a beat step moved, a prepared variant, seg(16) on a held chord).
import { applyStep } from './build.js';

// chances of 0, 1, 2, 3 detours in a passage between two waypoints (none in the first passage)
export const DETOURS = [0.44, 0.35, 0.15, 0.06];
const MELODIC = ['bass', 'arp', 'hook', 'pad', 'guitar'];
const PASSING = ['hook', 'arp', 'guitar'];
const MASKS = ['<1 1 0 1>', '<1 0 1 1>', '<1 1 1 0>', '<0 1 1 1>'];
const clone = o => JSON.parse(JSON.stringify(o));
const sameJSON = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// The default chooser: which lane gives the next move. Seeded weights: the track just touched goes on (a live coder
// stays on a line), a track that just came in grows before the colour of others, detours are a little rarer.
// lanes: [{ units, kind: 'track' | 'detour', track }], ctx: { last, state }. Replaceable by the radio's director or a
// decision model with the same arguments.
export function choose(lanes, ctx, rng) {
  const live = lanes.map((l, i) => [l, i]).filter(([l]) => l.units.length);
  const w = live.map(([l]) => (l.track === ctx.last ? 2 : 1) * (l.kind === 'detour' ? 0.7 : 1) * (l.units[0].kind === 'enter' ? 1.4 : 1));
  return rng.weighted(live, w)[1];
}

// dest: the tracks of the destination (anchor first); plans: their trackPlan (setup, fullness, colour, patterns);
// opts: { detours (chances), chooser } → { path: [{ kind, track, type, step, device?, waypoint?, detour? }], waypoints: K }
export function coderPath(dest, plans, rng, { detours = DETOURS, chooser = choose, shape = null } = {}) {
  const n = dest.length, K = rng.int(4, 6);
  // the state while the moves are emitted (the song of the destination tracks with their minimal setup)
  const state = { tracks: dest.map((t, i) => ({ ...clone(t), patterns: { ...clone(t.patterns || {}), ...clone(plans[i].patterns) }, mute: true })) };
  for (const p of plans) for (const s of p.setup) applyStep(state, s);
  const tr = id => state.tracks.find(t => t.id === id);
  // waypoint where each track comes in: the anchor in the first, a second track sometimes too, the others spread
  const enterAt = dest.map(() => K);
  enterAt[0] = 1;
  const second = n > 1 && rng.chance(0.4) ? 1 : 0;
  if (second) enterAt[1] = 1;
  for (let i = 1 + second; i < n; i++) enterAt[i] = Math.min(K, 2 + Math.floor(((i - 1 - second) * (K - 1)) / Math.max(1, n - 1 - second)));
  const sh = shape || {}, srng = shape ? rng.fork('shape') : null;
  if (sh.development === 'parameters') for (let i = 1; i < n; i++) enterAt[i] = Math.min(enterAt[i], 2);
  if (sh.opening === 'melodic') dest.forEach((t, i) => { if (i > 0 && t.type === 'drums') enterAt[i] = Math.max(enterAt[i], Math.min(K, 3)); });
  if (sh.opening === 'mid-set') dest.forEach((t, i) => { enterAt[i] = i < 2 ? 1 : Math.min(K, 3); });
  // a fast pace: the first minute is the anchor's small moves, the second track waits for the second waypoint
  else if (sh.early === 'all' && second) enterAt[1] = Math.min(K, 2);
  // how far each lane of a track has got at waypoint k (fullness first, colour a little later; all of it at the last)
  // (a medium or fast pace: a drum track fills up in the passage it comes in; a fast pace: the anchor's colour too)
  const reach = (i, k, len, lag) => { const e = enterAt[i]; if (k < e) return 0; if (k >= K) return len; if ((i === 0 && sh.early === 'all') || (!lag && sh.kickEarly && dest[i].type === 'drums')) return len; const f = (k - e + (lag ? 0 : 1)) / (K - e + 1); return Math.min(len, Math.floor(f * len)); };
  // masks per phrase on the tracks after the anchor: one value switched, then another, taken away at the end
  const masks = sh.masks ? dest.map((_, i) => (i ? srng.pick(MASKS) : null)) : [];
  // a passing melody: a melodic track that comes in later visits on the way to the second waypoint and leaves
  const pass = sh.passing && K >= 5 ? dest.findIndex((t, i) => i > 0 && PASSING.includes(t.type) && enterAt[i] >= 4) : -1;
  const doPass = pass > 0 && srng.chance(0.6);
  const done = plans.map(() => ({ full: 0, col: 0 }));
  const path = [], pending = []; // pending: detours waiting to be undone, by passage
  let last = null;
  const emit = u => { applyStep(state, u.step); path.push(u); last = u.track; };
  for (let k = 1; k <= K; k++) {
    const lanes = [];
    // tracks that come in at this waypoint, maybe as a clone of a playing melodic track
    // mid-set: the two tracks in solo give way, one "S" at a time (the second leaves the anchor alone, then all play)
    if (sh.opening === 'mid-set' && k === Math.min(K, 3)) state.tracks.filter(x => x.alone).reverse().forEach(x => emit({ kind: 'unsolo', track: x.id, type: x.type, step: { unsolo: x.id } }));
    dest.forEach((t, i) => {
      if (enterAt[i] !== k) return;
      const units = [];
      // a track written since bar 0 (muted base, mid-set): a muted line comes in by losing its "_"
      const cur = tr(t.id);
      if (shape && !cur.mute) { if (cur.hush) lanes.push({ kind: 'track', track: t.id, units: [{ kind: 'enter', track: t.id, type: t.type, step: { unmute: t.id } }] }); return; }
      const from = MELODIC.includes(t.type) && k > 1 ? state.tracks.find(x => !x.mute && x.id !== t.id && MELODIC.includes(x.type) && (x.patterns[(x.clips[0] || {}).pattern] || {}).notes !== undefined) : null;
      if (from && rng.chance(0.5)) {
        units.push({ kind: 'enter', clone: true, track: t.id, type: t.type, step: { clone: { track: t.id, from: from.id } } });
        // then its own notes, at its simplest
        const lvl = plans[i].setup.find(s => s.pattern);
        if (lvl) units.push({ kind: 'grow', track: t.id, type: t.type, step: { pattern: { track: t.id, level: lvl.pattern.level } } });
      } else units.push({ kind: 'enter', track: t.id, type: t.type, step: { add: t.id } });
      lanes.push({ kind: 'track', track: t.id, units });
    });
    // what each playing track does on the way to this waypoint
    dest.forEach((t, i) => {
      if (k < enterAt[i]) return;
      const p = plans[i], f = reach(i, k, p.fullness.length, false), c = reach(i, k, p.colour.length, true);
      const units = [...p.fullness.slice(done[i].full, f), ...p.colour.slice(done[i].col, c)].map(u => ({ ...u, track: t.id, type: t.type }));
      done[i] = { full: f, col: c };
      if (masks[i] && k === enterAt[i] + 1 && k < K) units.push({ kind: 'mask', track: t.id, type: t.type, step: { mask: { track: t.id, mask: masks[i] } } });
      if (masks[i] && k === enterAt[i] + 2 && k <= K) { const v = masks[i].slice(1, -1).split(' '); units.push({ kind: 'mask', track: t.id, type: t.type, step: { mask: { track: t.id, mask: `<${[...v.slice(1), v[0]].join(' ')}>` } } }); }
      if (!units.length) return;
      const own = lanes.find(l => l.track === t.id && l.kind === 'track');
      if (own) own.units.push(...units); else lanes.push({ kind: 'track', track: t.id, units });
    });
    if (doPass && k === 2) {
      const t = dest[pass];
      lanes.push({ kind: 'detour', track: t.id, units: [{ kind: 'enter', passing: true, detour: true, track: t.id, type: t.type, step: { add: t.id } }] });
      pending.push({ back: 3, track: t.id, undo: { kind: 'leave', passing: true, undo: true, track: t.id, type: t.type, step: { remove: t.id }, check: s => !(s.tracks.find(x => x.id === t.id) || {}).mute } });
    }
    // detours drawn for this passage (none in the first two: the first waypoint and the passage after it)
    const count = k >= 3 ? rng.weighted([0, 1, 2, 3], detours) : 0;
    for (let d = 0; d < count; d++) {
      const back = k < K ? rng.int(k + 1, K) : k;
      lanes.push({ kind: 'detour', track: null, units: [{ kind: 'detour', lazy: true, back, seed: `${k}-${d}` }] });
    }
    // detours to undo on the way to this waypoint
    for (const x of pending.filter(x => x.back === k)) lanes.push({ kind: 'detour', track: x.track, units: [x.undo] });
    // with a shape the opening is the anchor's: it comes in first
    if (shape && k === 1) {
      const own = lanes.find(l => l.track === dest[0].id && l.units.length && l.units[0].kind === 'enter');
      if (own) emit(own.units.shift());
      // with a medium or fast pace the anchor's drums fill up right after it comes in
      if (own && sh.kickEarly && dest[0].type === 'drums') while (own.units.length && own.units[0].kind === 'grow') emit(own.units.shift());
    }
    // the moves of this passage, in the chooser's order
    let guard = 0;
    while (lanes.some(l => l.units.length) && guard++ < 10000) {
      const li = chooser(lanes, { last, state, waypoint: k }, rng), lane = lanes[li];
      let u = lane.units.shift();
      if (u.lazy) {
        // a detour picks what to take back from the state as it is now; its undo comes on the way to waypoint `back`
        const backAt = u.back, fresh = new Set(dest.filter((_, i) => enterAt[i] >= k - 1).map(t => t.id)), dt = drawDetour(state, dest[0].id, fresh, rng.fork(u.seed), { moves: !!sh.moves, noBreaks: sh.development === 'parameters' });
        if (!dt) continue;
        u = dt.unit;
        if (backAt === k) lane.units.push(dt.undo); else pending.push({ back: backAt, track: u.track, undo: dt.undo });
      } else if (u.undo) {
        if (!u.check(state)) continue;
      }
      emit(u);
      // with a medium or fast pace a drum track fills up right after it comes in
      if (sh.kickEarly && u.kind === 'enter' && u.type === 'drums') while (lane.units.length && lane.units[0].kind === 'grow') emit(lane.units.shift());
    }
    if (path.length) path[path.length - 1] = { ...path[path.length - 1], waypoint: k };
  }
  // the last waypoint is the song: a clone or a detour may leave a difference, set back in one step per track
  dest.forEach(t => {
    const s = tr(t.id), step = {};
    const want = { ...(t.settings || {}) }, diff = Object.fromEntries(Object.keys({ ...want, ...(s.settings || {}) }).filter(key => !sameJSON(want[key], (s.settings || {})[key]) && key in want).map(key => [key, want[key]]));
    if (Object.keys(diff).length) step.set = { track: t.id, ...diff };
    const hid = (s.hidden || []).filter(key => !(t.hidden || []).includes(key));
    if (hid.length) step.reveal = { track: t.id, keys: hid };
    if (s.commented && s.commented.length) step.comment = { track: t.id, keys: s.commented, on: false };
    // growth-shapes: a mask, a solo, a muted line, a prepared variant or a seg left by the moves
    if (s.maskIdea) step.mask = { track: t.id, mask: null };
    if (s.hush) step.unmute = t.id;
    if (s.alone) step.unsolo = t.id;
    if ((s.variant ?? null) !== (t.variant ?? null)) step.variant = { track: t.id, use: Number.isInteger(t.variant) ? t.variant : null };
    if ((s.rack || []).some(x => x.device === 'seg') && !(t.rack || []).some(x => x.device === 'seg')) step.unrack = { track: t.id, device: 'seg' };
    if (s.clips.some((c, j) => c.pattern !== String((t.clips[j] || {}).pattern))) step.pattern = { track: t.id, level: 0 };
    if (s.mute) step.add = t.id;
    if (Object.keys(step).length) emit({ kind: 'settle', track: t.id, type: t.type, step });
    // devices still out of the rack (a growth without its colour: the second section), one per step, in written order
    if (shape) for (const dev of (t.rack || []).filter(x => !(s.rack || []).some(y => y.device === x.device))) emit({ kind: 'device', device: dev.device, track: t.id, type: t.type, step: { rack: { track: t.id, ...clone(dev) } } });
  });
  return { path, waypoints: K };
}

// The coder's path with a given start and destination (radio-profiles D9: a command on a grown radio song): the caller
// builds one lane per track from the code on air to the next waypoint (a line in or out, notes, knobs, functions), and
// the moves come in the chooser's order, as between two waypoints of coderPath. lanes: [{ kind, track, units }]
// → [{ ...unit, track }]
export function waypointPath(lanes, rng, { chooser = choose } = {}) {
  const ls = lanes.map(l => ({ ...l, units: l.units.slice() })), path = [];
  let last = null, guard = 0;
  while (ls.some(l => l.units.length) && guard++ < 10000) {
    const li = chooser(ls, { last, waypoint: 1 }, rng), u = ls[li].units.shift();
    path.push({ ...u, track: ls[li].track });
    last = ls[li].track;
  }
  return path;
}

// a melody's notes with their halves swapped, step by step in the mini-notation: a bracketed group, an alternation and
// its `!n` or `@n` stay one step; one outer `<…>` or `[…]` turns inside. null when nothing turns (one step, a stack
// `,` or a choice `|` at the top, unbalanced brackets). Splitting on spaces alone cut `<[0 ~ 2] [0 ~ 4]>` into
// `[0 ~ 4]> <[0 ~ 2]`, a mini-notation parse error at that step (crescendo-notte-lunga, Live coder, bar 101)
export function rotateNotes(notes) {
  const s = String(notes).trim(), toks = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if ('[<{('.includes(ch)) depth++;
    else if (']>})'.includes(ch) && --depth < 0) return null;
    if (!depth && (ch === ',' || ch === '|')) return null;
    if (!depth && /\s/.test(ch)) { if (cur) toks.push(cur); cur = ''; } else cur += ch;
  }
  if (depth) return null;
  if (cur) toks.push(cur);
  if (toks.length === 1) {
    const m = s.match(/^(\[|<)([\s\S]*)(\]|>)$/);
    if (!m || (m[1] === '[') !== (m[3] === ']')) return null;
    const inner = rotateNotes(m[2]);
    return inner === null ? null : m[1] + inner + m[3];
  }
  if (toks.includes('.')) return null;
  const h = Math.floor(toks.length / 2);
  return [...toks.slice(h), ...toks.slice(0, h)].join(' ');
}

// one detour on the state as it is: a function commented out, notes rewritten, or a track muted; with its undo. Tracks
// that came in on the way to the last waypoint or this one are left alone (fresh)
function drawDetour(state, anchor, fresh, rng, { moves = false, noBreaks = false } = {}) {
  const playing = state.tracks.filter(t => !t.mute && t.type !== 'voice' && t.type !== 'spoken' && !fresh.has(t.id));
  const kinds = [];
  for (const t of playing) {
    const shown = ['cutoff', 'drive', 'room', 'delay', 'reso'].filter(k => !(t.hidden || []).includes(k) && !(t.commented || []).includes(k) && Number((t.settings || {})[k] ?? (k === 'cutoff' ? 20000 : 0)) > 0 && !(k === 'cutoff' && Number(t.settings.cutoff) >= 18000));
    for (const k of shown) kinds.push({ w: 1.2, make: () => ({ unit: { kind: 'comment', track: t.id, type: t.type, device: k, step: { comment: { track: t.id, keys: k } } }, undo: { kind: 'uncomment', undo: true, track: t.id, type: t.type, device: k, step: { comment: { track: t.id, keys: k, on: false } }, check: s => ((s.tracks.find(x => x.id === t.id) || {}).commented || []).includes(k) } }) });
    const pat = t.patterns[(t.clips[0] || {}).pattern] || {};
    if (MELODIC.includes(t.type) && typeof pat.notes === 'string' && /\d/.test(pat.notes)) {
      const alt =Object.entries(t.patterns).find(([name, p]) => !/~/.test(name) && p.notes && p.notes !== pat.notes);
      const notes = alt ? alt[1].notes : rotateNotes(pat.notes);
      if (notes && notes !== pat.notes) kinds.push({ w: 1, make: () => ({ unit: { kind: 'rewrite', track: t.id, type: t.type, step: { notes: { track: t.id, notes } } }, undo: { kind: 'grow', undo: true, track: t.id, type: t.type, step: { pattern: { track: t.id, level: levelOf(t) } }, check: s => /~x$/.test(((s.tracks.find(x => x.id === t.id) || {}).clips[0] || {}).pattern || '') } }) });
    }
    if (moves) moveKinds(t, kinds);
    if (!noBreaks && t.id !== anchor && playing.length > 2) kinds.push({ w: 0.6, make: () => ({ unit: { kind: 'break', track: t.id, type: t.type, step: { remove: t.id } }, undo: { kind: 'back', undo: true, track: t.id, type: t.type, step: { add: t.id }, check: s => !!(s.tracks.find(x => x.id === t.id) || {}).mute } }) });
  }
  if (!kinds.length) return null;
  const pick = rng.weighted(kinds, kinds.map(k => k.w)).make();
  pick.unit.detour = true;
  return pick;
}
// growth-shapes moves on a playing track: one step of a beat moved, a prepared variant uncommented, a held chord cut
// into sixteenths with seg(16); each with its undo
function moveKinds(t, kinds) {
  const pat = t.patterns[(t.clips[0] || {}).pattern] || {}, at = s => s.tracks.find(x => x.id === t.id) || {};
  const back = { kind: 'grow', undo: true, track: t.id, type: t.type, step: { pattern: { track: t.id, level: levelOf(t) } }, check: s => /~x$/.test((at(s).clips[0] || {}).pattern || '') };
  if (t.type === 'drums' && pat.rows) {
    const rows = Object.entries(pat.rows).filter(([r, v]) => /x/.test(v)).sort(([a], [b]) => (a === 'bd') - (b === 'bd'));
    const [row, v] = rows[0] || [], i = v ? [...v].findIndex((c, j) => c === 'x' && j + 1 < v.length && v[j + 1] === '.' && j % 4 !== 0) : -1;
    if (i >= 0) { const nv = v.slice(0, i) + '.x' + v.slice(i + 2); kinds.push({ w: 0.9, make: () => ({ unit: { kind: 'beat', track: t.id, type: t.type, step: { notes: { track: t.id, rows: { ...pat.rows, [row]: nv } } } }, undo: back }) }); }
  }
  if (t.type === 'drums' && pat.idea && pat.idea.beat && !pat.rows) {
    const beat = pat.idea.beat, grid = beat.grid ?? 16, row = Object.keys(beat).find(r => r !== 'grid' && r !== 'bd') || 'bd', list = String(beat[row] || '').split(',').map(x => +x.trim()).filter(x => Number.isFinite(x));
    const j = list.findIndex(x => x + 1 < grid && !list.includes(x + 1) && x % 4 !== 0);
    if (j >= 0) { const nl = list.map((x, q) => (q === j ? x + 1 : x)); kinds.push({ w: 0.9, make: () => ({ unit: { kind: 'beat', track: t.id, type: t.type, step: { notes: { track: t.id, idea: { ...pat.idea, beat: { ...beat, [row]: nl.join(',') } } } } }, undo: back }) }); }
  }
  if (pat.idea && Array.isArray(pat.idea.variants) && pat.idea.variants.length && !Number.isInteger(t.variant)) kinds.push({ w: 1.2, make: () => ({ unit: { kind: 'variant', track: t.id, type: t.type, step: { variant: { track: t.id, use: 0 } } }, undo: { kind: 'comment', undo: true, track: t.id, type: t.type, step: { variant: { track: t.id, use: null } }, check: s => Number.isInteger(at(s).variant) } }) });
  if (['pad', 'guitar'].includes(t.type) && !(t.rack || []).some(x => x.device === 'seg')) kinds.push({ w: 0.8, make: () => ({ unit: { kind: 'seg', track: t.id, type: t.type, step: { rack: { track: t.id, device: 'seg', steps: 16 } } }, undo: { kind: 'comment', undo: true, track: t.id, type: t.type, step: { unrack: { track: t.id, device: 'seg' } }, check: s => (at(s).rack || []).some(x => x.device === 'seg') } }) });
}
// the variant level a track plays now (0: as written)
const levelOf = t => { const m = String((t.clips[0] || {}).pattern || '').match(/~(\d+)$/); return m ? +m[1] : 0; };
