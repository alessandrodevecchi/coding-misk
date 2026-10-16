// Natural growth like a live coder (live-coder-growth). At the start the growth draws 4 to 6 waypoints: small states
// of the song, the first with one or two tracks playing one note or a few hits, the last the song itself. Between two
// waypoints the build moves in small moves (a track in, a function in, a number, the notes a little fuller), in an
// order picked by a chooser separate from the moves. A passage between two waypoints may hold detours: something an
// earlier waypoint added is commented out, rewritten or muted, and comes back later. A track may come in as a clone of
// a playing one (its block copied, then changed). Pure and seeded: the same song grows the same way.
import { applyStep } from './build.js';

// chances of 0, 1, 2, 3 detours in a passage between two waypoints (none in the first passage)
export const DETOURS = [0.44, 0.35, 0.15, 0.06];
const MELODIC = ['bass', 'arp', 'hook', 'pad', 'guitar'];
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
export function coderPath(dest, plans, rng, { detours = DETOURS, chooser = choose } = {}) {
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
  // how far each lane of a track has got at waypoint k (fullness first, colour a little later; all of it at the last)
  const reach = (i, k, len, lag) => { const e = enterAt[i]; if (k < e) return 0; if (k >= K) return len; const f = (k - e + (lag ? 0 : 1)) / (K - e + 1); return Math.min(len, Math.floor(f * len)); };
  const done = plans.map(() => ({ full: 0, col: 0 }));
  const path = [], pending = []; // pending: detours waiting to be undone, by passage
  let last = null;
  const emit = u => { applyStep(state, u.step); path.push(u); last = u.track; };
  for (let k = 1; k <= K; k++) {
    const lanes = [];
    // tracks that come in at this waypoint, maybe as a clone of a playing melodic track
    dest.forEach((t, i) => {
      if (enterAt[i] !== k) return;
      const units = [];
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
      if (!units.length) return;
      const own = lanes.find(l => l.track === t.id && l.kind === 'track');
      if (own) own.units.push(...units); else lanes.push({ kind: 'track', track: t.id, units });
    });
    // detours drawn for this passage (none in the first two: the first waypoint and the passage after it)
    const count = k >= 3 ? rng.weighted([0, 1, 2, 3], detours) : 0;
    for (let d = 0; d < count; d++) {
      const back = k < K ? rng.int(k + 1, K) : k;
      lanes.push({ kind: 'detour', track: null, units: [{ kind: 'detour', lazy: true, back, seed: `${k}-${d}` }] });
    }
    // detours to undo on the way to this waypoint
    for (const x of pending.filter(x => x.back === k)) lanes.push({ kind: 'detour', track: x.track, units: [x.undo] });
    // the moves of this passage, in the chooser's order
    let guard = 0;
    while (lanes.some(l => l.units.length) && guard++ < 10000) {
      const li = chooser(lanes, { last, state, waypoint: k }, rng), lane = lanes[li];
      let u = lane.units.shift();
      if (u.lazy) {
        // a detour picks what to take back from the state as it is now; its undo comes on the way to waypoint `back`
        const backAt = u.back, fresh = new Set(dest.filter((_, i) => enterAt[i] >= k - 1).map(t => t.id)), dt = drawDetour(state, dest[0].id, fresh, rng.fork(u.seed));
        if (!dt) continue;
        u = dt.unit;
        if (backAt === k) lane.units.push(dt.undo); else pending.push({ back: backAt, track: u.track, undo: dt.undo });
      } else if (u.undo) {
        if (!u.check(state)) continue;
      }
      emit(u);
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
    if (s.clips.some((c, j) => c.pattern !== String((t.clips[j] || {}).pattern))) step.pattern = { track: t.id, level: 0 };
    if (s.mute) step.add = t.id;
    if (Object.keys(step).length) emit({ kind: 'settle', track: t.id, type: t.type, step });
  });
  return { path, waypoints: K };
}

// one detour on the state as it is: a function commented out, notes rewritten, or a track muted; with its undo. Tracks
// that came in on the way to the last waypoint or this one are left alone (fresh)
function drawDetour(state, anchor, fresh, rng) {
  const playing = state.tracks.filter(t => !t.mute && t.type !== 'voice' && !fresh.has(t.id));
  const kinds = [];
  for (const t of playing) {
    const shown = ['cutoff', 'drive', 'room', 'delay', 'reso'].filter(k => !(t.hidden || []).includes(k) && !(t.commented || []).includes(k) && Number((t.settings || {})[k] ?? (k === 'cutoff' ? 20000 : 0)) > 0 && !(k === 'cutoff' && Number(t.settings.cutoff) >= 18000));
    for (const k of shown) kinds.push({ w: 1.2, make: () => ({ unit: { kind: 'comment', track: t.id, type: t.type, device: k, step: { comment: { track: t.id, keys: k } } }, undo: { kind: 'uncomment', undo: true, track: t.id, type: t.type, device: k, step: { comment: { track: t.id, keys: k, on: false } }, check: s => ((s.tracks.find(x => x.id === t.id) || {}).commented || []).includes(k) } }) });
    const pat = t.patterns[(t.clips[0] || {}).pattern] || {};
    if (MELODIC.includes(t.type) && typeof pat.notes === 'string' && /\d/.test(pat.notes)) {
      const toks = pat.notes.trim().split(/\s+/), alt = Object.entries(t.patterns).find(([name, p]) => !/~/.test(name) && p.notes && p.notes !== pat.notes);
      const notes = alt ? alt[1].notes : [...toks.slice(Math.floor(toks.length / 2)), ...toks.slice(0, Math.floor(toks.length / 2))].join(' ');
      if (notes !== pat.notes) kinds.push({ w: 1, make: () => ({ unit: { kind: 'rewrite', track: t.id, type: t.type, step: { notes: { track: t.id, notes } } }, undo: { kind: 'grow', undo: true, track: t.id, type: t.type, step: { pattern: { track: t.id, level: levelOf(t) } }, check: s => /~x$/.test(((s.tracks.find(x => x.id === t.id) || {}).clips[0] || {}).pattern || '') } }) });
    }
    if (t.id !== anchor && playing.length > 2) kinds.push({ w: 0.6, make: () => ({ unit: { kind: 'break', track: t.id, type: t.type, step: { remove: t.id } }, undo: { kind: 'back', undo: true, track: t.id, type: t.type, step: { add: t.id }, check: s => !!(s.tracks.find(x => x.id === t.id) || {}).mute } }) });
  }
  if (!kinds.length) return null;
  const pick = rng.weighted(kinds, kinds.map(k => k.w)).make();
  pick.unit.detour = true;
  return pick;
}
// the variant level a track plays now (0: as written)
const levelOf = t => { const m = String((t.clips[0] || {}).pattern || '').match(/~(\d+)$/); return m ? +m[1] : 0; };
