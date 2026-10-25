// Commands as waypoints (radio-profiles D9, D10): a listener's command on a grown radio song (Crescendo or Live coder)
// becomes the next waypoint of its growth. The steps before the command's boundary stay as they were; from the boundary
// small typed moves (a line in or out, notes a few at a time, a knob, a function) lead from the code on air to the
// song as the director rewrites it (steerSong, then its written form); from the arrival bar the steered written form
// plays as written. Classic songs keep the one-step rewrites of steering.js. Pure and seeded: the radio, its worker,
// replays, exports and tools/check-radio-profiles.mjs build the same songs.
//
// Bars: a grown song keeps the bars of its written form after its growth, moved by the growth (airOffset): grown bar
// b plays the written bar b - off. A command records its boundary in the grown song's bars (what the queue shows); the
// director's rewrite gets the same boundary in its own bars.
import { steerSong, COMMANDS } from './steering.js';
import { writtenForm, growOnAir, airControls } from './growth.js';
import { energyOf } from './energy.js';
import { stream } from './random.js';
import { stateAt, buildSteps } from '../song/build.js';
import { waypointPath, choose } from '../song/coder.js';
import { topTokens } from '../song/ideas.js';
import { presetIdea, meterSteps } from '../music.js';
import { SETTING_FIELDS } from '../song/format.js';
import { liveCode } from '../live/live-code.js';
import { withDisplay } from '../live/profiles.js';
import { typingPlan, settleOthers } from '../song/typing.js';

const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const barsOf = song => song.sections.reduce((a, s) => a + s.bars, 0);
const r3 = x => Math.round(x * 1000) / 1000;
// knobs that move in small turns; every other setting changes in one edit
const KNOBS = ['cutoff', 'reso', 'drive', 'grit', 'room', 'delay', 'gain'];
// the boundaries a command may wait for: the next phrase or the one after (the next double phrase or the one after for
// structural commands), the next bars for the mixer
const PHRASE_TRIES = 2, BAR_TRIES = 4;

// ---------- bars ----------
// how far a grown song's bars are from its written form's: the growth took `growth` bars in place of the written
// form's first `from` (fitted), or before it (free, from 0)
export const airOffset = g => (g && g.onAir && g.crescendo ? g.crescendo.growth - (g.onAir.from || 0) : 0);
// the bars where a command on a grown song may apply, in the grown song's bars, first first; rel: the bar now; plan:
// the director's plan as steered so far; [] when none is left (late)
export function airBoundaries(kind, rel, plan, g) {
  const off = airOffset(g), C = COMMANDS[kind] || {}, ph = plan.phrase, end = plan.bars + off, out = [];
  if (C.bar) { for (let b = Math.floor(rel) + 1; b < end - 1 && out.length < BAR_TRIES; b++) out.push(b); return out; }
  const step = C.structural ? 2 * ph : ph, last = plan.bars - ph;
  for (let d = Math.max(0, (Math.floor((rel - off) / step) + 1) * step); d <= last && out.length < PHRASE_TRIES; d += step) if (d + off > rel) out.push(d + off);
  return out;
}

// ---------- small notes edits (radio-variation 5.1) ----------
// a bracket group spanning a whole token: "<0 2 4>", "[~ x x]*4" → { open, inner, close, tail }
function groupOf(s) {
  if (!/^[[<]/.test(s)) return null;
  const close = s[0] === '[' ? ']' : '>';
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if ('[<'.includes(s[i])) depth++;
    else if (']>'.includes(s[i])) { depth--; if (!depth) return s[i] === close ? { open: s[0], inner: s.slice(1, i), close, tail: s.slice(i + 1) } : null; }
  }
  return null;
}
// the edit sites from one mini-notation text to another: tokens in the same places change one at a time (inside a group
// with the same brackets too); a text of another shape is one site. → { n, at(k): the text with the first k sites made }
function mix(a, b) {
  if (a === b) return { n: 0, at: () => a };
  const ta = topTokens(a), tb = topTokens(b);
  if (ta.length > 1 && ta.length === tb.length) {
    const subs = ta.map((x, i) => mix(x, tb[i])), n = subs.reduce((s, m) => s + m.n, 0);
    return { n, at: k => { let left = k; return subs.map(m => { const u = Math.min(m.n, Math.max(0, left)); left -= m.n; return m.at(u); }).join(' '); } };
  }
  if (ta.length === 1 && tb.length === 1) {
    const ga = groupOf(a), gb = groupOf(b);
    if (ga && gb && ga.open === gb.open && ga.tail === gb.tail) { const m = mix(ga.inner, gb.inner); if (m.n) return { n: m.n, at: k => `${ga.open}${m.at(k)}${ga.close}${ga.tail}` }; }
  }
  return { n: 1, at: k => (k >= 1 ? b : a) };
}
// The ideas between two ideas of a line, each a small edit of the one before, the last the new idea itself: the
// tokens of a field change a few at a time, a field of another shape changes in one edit (first). An idea that
// differs a lot (more than 16 sites, or two fields of another shape) is one edit: a new line, typed or pasted as the
// typing allows. → [idea…] ([] when they are the same)
export function ideaSteps(from, to, max = 4) {
  if (!from || !to || same(from, to)) return [];
  const sites = [];
  for (const k of [...new Set([...Object.keys(from), ...Object.keys(to)])]) {
    if (same(from[k], to[k])) continue;
    if (typeof from[k] === 'string' && typeof to[k] === 'string') { const m = mix(from[k], to[k]); for (let i = 1; i <= m.n; i++) sites.push({ k, m, i }); }
    else sites.push({ k, whole: true });
  }
  const wholes = sites.filter(s => s.whole).length;
  if (sites.length > 16 || wholes >= 2) return [clone(to)];
  sites.sort((x, y) => (y.whole ? 1 : 0) - (x.whole ? 1 : 0));
  const S = sites.length, steps = Math.max(1, Math.min(max, Math.ceil(S / 2))), out = [];
  for (let j = 1; j < steps; j++) {
    const done = sites.slice(0, Math.ceil((j * S) / steps)), idea = clone(from), counts = {};
    for (const s of done) {
      if (s.whole) { if (to[s.k] === undefined) delete idea[s.k]; else idea[s.k] = clone(to[s.k]); }
      else counts[s.k] = Math.max(counts[s.k] || 0, s.i);
    }
    for (const [k, c] of Object.entries(counts)) idea[k] = sites.find(s => s.k === k && !s.whole).m.at(c);
    if (!out.length || !same(out[out.length - 1], idea)) out.push(idea);
  }
  out.push(clone(to));
  return out;
}
// the idea a pattern plays (a preset read through its idea), null for patterns without one (drum rows, notes)
const ideaOf = (type, pat) => (!pat ? null : pat.idea || (['bass', 'guitar', 'arp', 'hook', 'pad'].includes(type) && pat.preset !== undefined && !pat.notes && !pat.steps ? presetIdea(type, { preset: pat.preset, pattern: pat.preset }) : null));
// the fields that rewrite a line's part in one edit (rewrite in build.js merges them into the pattern): the new part,
// its idea when it has one (an idea plays before notes, rows and presets), the old fields it has not set to nothing
const PART_FIELDS = ['idea', 'notes', 'steps', 'rows'];
function wholePart(from, to, idea) {
  const out = {};
  for (const k of PART_FIELDS) if (to[k] !== undefined) out[k] = clone(to[k]);
  if (idea && !out.idea) out.idea = clone(idea);
  for (const k of PART_FIELDS) if (from[k] !== undefined && out[k] === undefined) out[k] = null;
  return out;
}
// a knob turned from one value to another in m moves (the cutoff on a log scale), the last the value itself
function turns(key, from, to, m) {
  return Array.from({ length: m }, (_, j) => {
    if (j === m - 1) return to;
    const k = (j + 1) / m;
    return key === 'cutoff' && from > 0 && to > 0 ? Math.round(Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * k) / 10) * 10 : r3(from + (to - from) * k);
  });
}

// ---------- the chooser on air (D10) ----------
// The default chooser plus two biases: the listener's moves first (the tracks the command changed), and moves that go
// the way the energy of the coming double phrase asks (bias +1 up, -1 down). Same arguments as coderPath's chooser.
export const airChooser = (focus = [], bias = 0) => (lanes, ctx, rng) => {
  const live = lanes.map((l, i) => [l, i]).filter(([l]) => l.units.length);
  const mine = live.filter(([l]) => focus.includes(l.track)), pool = mine.length ? mine : live;
  const w = pool.map(([l]) => { const u = l.units[0]; return (l.track === ctx.last ? 2 : 1) * (u.kind === 'enter' ? 1.4 : 1) * (bias && u.dir ? (u.dir === bias ? 3 : 0.5) : 1); });
  return rng.weighted(pool, w)[1];
};
// the chooser versions on air, by id → (focus, bias) => chooser. normal-1: the default chooser of every growth
// (coder.js choose); radio-1: airChooser above, the chooser on air of growth marker 2. Measured over 75 curve points in
// 20 songs (check 5.5) radio-1 reached the energy later than normal-1 (605 bars against 540), so the radio plays
// normal-1 (AIR_CHOOSER) since growth marker 3; a recipe of marker 2 replays with radio-1, as it was heard
// (items.js airChooserOf). A version, once played, never changes: a new rule is a new id.
// Each version has a name in English and Italian next to its rule (radio-chooser-versions D1): the Settings page lists
// them, so a new version shows up there without other code. The default says "(current)", the one before it
// "(previous on air)".
export const AIR_CHOOSERS = { 'normal-1': () => choose, 'radio-1': airChooser };
export const AIR_CHOOSER_NAMES = {
  'normal-1': { en: 'Normal v1 (current)', it: 'Normale v1 (attuale)' },
  'radio-1': { en: 'Radio chooser v1 (previous on air)', it: 'Scelta radio v1 (la precedente in onda)' },
};
export const AIR_CHOOSER = 'normal-1';
// a version id as it is: an id no longer in AIR_CHOOSERS (a stored setting, a recipe) gives the default (D3)
export const chooserOf = id => (typeof id === 'string' && Object.hasOwn(AIR_CHOOSERS, id) ? id : AIR_CHOOSER);
export const chooserName = (id, lang = 'en') => { const n = AIR_CHOOSER_NAMES[chooserOf(id)] || {}; return n[lang] || n.en || chooserOf(id); };
const chooserFor = c => (typeof c === 'function' ? c : AIR_CHOOSERS[chooserOf(c)]);

// ---------- one command: the song from its boundary ----------
// bars a move needs before the next one, at least (the typing check adds what a long edit needs); a line that comes in
// gets a listening pause after it
const GAP = { enter: 4, leave: 1, mute: 1, unmute: 1, reveal: 1, unsolo: 1, mask: 1, comment: 1, variant: 1, unrack: 1, grow: 2, notes: 2, set: 2, device: 2 };
const gapOf = (u, before) => (GAP[u.kind] ?? 2) + (before && before.kind === 'enter' ? 2 : 0);
// the sections of a song between two bars (before bar 0 its first section goes on)
function sectionsIn(secs, a, b) {
  const out = [];
  if (a < 0 && secs.length) { out.push({ ...clone(secs[0]), bars: Math.min(b, 0) - a }); a = 0; }
  let at = 0;
  for (const s of secs) { const x = Math.max(at, a), y = Math.min(at + s.bars, b); if (y > x) out.push({ ...clone(s), bars: y - x }); at += s.bars; }
  return out;
}
const clipsIn = (clips, a, b, shift = 0) => (clips || []).flatMap(c => { const s = c.start ?? 0, x = Math.max(s, a), y = Math.min(s + c.bars, b); return y > x ? [{ ...clone(c), start: x + shift, bars: y - x }] : []; });
const clipAt = (t, bar) => ((t && t.clips) || []).find(c => (c.start ?? 0) <= bar && bar < (c.start ?? 0) + c.bars) || null;
const addsOf = song => new Set(buildSteps(song).flatMap(s => [...(s.add !== undefined ? [].concat(s.add) : []), ...(s.clone ? [s.clone.track] : [])]));
// what a track plays at a bar of a written form: on, its pattern, its settings as heard, its rack
function heardAt(st, t, bar) {
  const c = clipAt(t, bar), on = !!c && !t.mute && !t.hush && t.type !== 'voice';
  return { on, c, pat: c ? (t.patterns || {})[c.pattern] : null, set: { ...(t.settings || {}), ...((c && c.set) || {}) }, rack: t.rack || [] };
}

// The song after one command on a grown song. prev: the song as it is (grown, maybe steered already); W: the steered
// written form; Wprev: the written form before this command (the tracks whose part differs are the listener's); B: the
// boundary (grown bars); off: airOffset; o: { kind, track, rng, chooser, phrase, plan (the director's, steered),
// extra: { move key: bars the typing asked for }, minE: the arrival at the earliest, fixE: the arrival as given, lean:
// fewer moves }. → { song, B, E (the arrival), units: [{ at, key, kind, track, step }], focus }
function transitSong(prev, W, Wprev, B, off, o) {
  const ph = o.phrase, wBars = barsOf(W), end = wBars + off, G = prev.crescendo ? prev.crescendo.growth : 0;
  const isEnd = o.kind === 'end';
  const limitE = Math.min(end - 1, Math.max(B + 1, isEnd ? B + ph : end - ph));
  // the arrival bar: a phrase boundary of the written form, after the moves; the rest of a growth (the boundary in it)
  // is taken by the moves, the End by the phrase before the last
  const boundaryAfter = x => { const k = Math.floor((x - off) / ph) + 1; return k * ph + off; };
  let E = o.fixE ? Math.min(limitE, o.fixE) : isEnd ? limitE : Math.min(limitE, Math.max(boundaryAfter(B), B < G ? G : 0, o.minE || 0));
  const stPrev = stateAt(prev, B - 1).song, ptrack = id => prev.tracks.find(t => t.id === id), wtrack = id => W.tracks.find(t => t.id === id);
  const prevAdded = addsOf(prev);
  const ids = [...prev.tracks.map(t => t.id), ...W.tracks.filter(t => !ptrack(t.id)).map(t => t.id)];
  // what plays just before the boundary (the code on air)
  const before = {};
  for (const id of ids) {
    const s = stPrev.tracks.find(t => t.id === id), c = clipAt(ptrack(id), B - 1);
    before[id] = { s, c, on: !!s && !s.mute && !s.hush && !!c && s.type !== 'voice' };
  }
  const plan = E0 => {
    const dE = E0 - off, Wst = stateAt(W, dE).song, Wpst = stateAt(Wprev, Math.min(dE, barsOf(Wprev) - 1)).song;
    const dest = Object.fromEntries(Wst.tracks.map(t => [t.id, { t, ...heardAt(Wst, t, dE) }]));
    // ---- the skeleton: the past as it was, the transit clips, the written form from the arrival ----
    const maps = {};
    const tracks = ids.map(id => {
      const pt = ptrack(id), wt = wtrack(id);
      if (pt && pt.type === 'voice') return clone(pt);
      const t = pt ? clone(pt) : (() => { const x = clone(wt); delete x.pinned; delete x.mute; x.patterns = {}; return x; })();
      t.patterns = t.patterns || {};
      const map = {};
      for (const [k, p] of Object.entries((wt && wt.patterns) || {})) {
        const found = Object.entries(t.patterns).find(([kk, pp]) => !kk.includes('~') && same(pp, p));
        if (found) { map[k] = found[0]; continue; }
        let nk = k;
        for (let i = 2; t.patterns[nk] !== undefined; i++) nk = `${k}w${i}`;
        t.patterns[nk] = clone(p); map[k] = nk;
      }
      maps[id] = map;
      const d = dest[id], b = before[id];
      const past = pt ? clipsIn(pt.clips, 0, B) : [];
      // a line that plays goes on with its pattern (its clip goes on when it sets nothing of its own, so its code stays
      // as it is); a line that comes in (muted or hushed before) plays its new one
      const enters = d && d.on && !b.on && (!b.s || b.s.mute || b.s.hush || !pt || prevAdded.has(id));
      const goesOn = b.on && !(b.c.set && Object.keys(b.c.set).length) && past.length && past[past.length - 1].start === (b.c.start ?? 0) && past[past.length - 1].start + past[past.length - 1].bars === B;
      if (goesOn) past[past.length - 1].bars = E0 - past[past.length - 1].start;
      const mid = goesOn ? [] : b.on ? [{ start: B, bars: E0 - B, pattern: b.c.pattern }] : enters ? [{ start: B, bars: E0 - B, pattern: map[d.c.pattern] ?? d.c.pattern }] : [];
      const after = wt ? clipsIn(wt.clips, dE, wBars, off).map(c => ({ ...c, pattern: map[c.pattern] ?? c.pattern })) : [];
      t.clips = [...past, ...mid, ...after];
      return t;
    });
    const wsteps = buildSteps(W).filter(s => s.at >= dE).map(({ i, by, ...s }) => ({ ...clone(s), at: s.at + off })).filter(s => Object.keys(s).some(k => k !== 'at'));
    const past = (prev.build || []).filter(s => s && Number.isFinite(s.at) && s.at < B).map(clone);
    // (sections cut at the boundary and at the arrival: the code of the moment shows only the lines that play then)
    const sections = [...sectionsIn(prev.sections, 0, B), ...sectionsIn(W.sections, B - off, dE), ...sectionsIn(W.sections, dE, wBars)];
    const N0 = { ...clone({ ...prev, build: undefined, tracks: undefined, sections: undefined }), sections, tracks, build: [...past, ...wsteps] };
    const st = stateAt(N0, B).song;
    // ---- the moves, track by track ----
    const lanes = [], prelude = [], focus = [];
    for (const id of ids) {
      const b = before[id], d = dest[id], t = st.tracks.find(x => x.id === id);
      if (!t || t.type === 'voice') continue;
      const dOn = !!(d && d.on);
      if (!b.on && !dOn) continue;
      // the listener's tracks: what this command changes at the arrival
      const wp = Wpst.tracks.find(x => x.id === id), hp = wp ? heardAt(Wpst, wp, Math.min(dE, barsOf(Wprev) - 1)) : { on: false };
      if (o.track === id || !same(hp.on, dOn) || (dOn && (!same(hp.pat, d.pat) || !same(hp.set, d.set) || !same(hp.rack, d.rack)))) focus.push(id);
      const units = [];
      if (b.on && !dOn) {
        // a line that goes: muted with "_$:" for the mixer's mute, else taken out (shown muted, then gone)
        units.push(o.kind === 'mute' && o.track === id ? { kind: 'mute', dir: -1, step: { mute: id } } : { kind: 'leave', dir: -1, step: { remove: id } });
        lanes.push({ kind: 'track', track: id, units });
        continue;
      }
      const s = b.s || {};
      if (!b.on) {
        // (a line written but silent for want of a clip, that came in by a step: muted at the boundary, without a sound,
        // then it comes in like the others)
        if (b.s && !s.mute && !s.hush && ptrack(id) && prevAdded.has(id)) prelude.push({ at: B, remove: id });
        if (!b.s || s.mute || !ptrack(id) || prevAdded.has(id)) units.push({ kind: 'enter', dir: 1, step: { add: id } });
        if (s.hush) units.push({ kind: b.s && !s.mute ? 'enter' : 'unmute', dir: 1, step: { unmute: id } });
        // (a line written but silent for want of a clip comes in at the arrival, as written)
        if (!units.length) continue;
      } else if (b.c.set) {
        // the settings the clip on air set move into the track (the same sound and code at the boundary), so the
        // knobs can turn from there
        const diff = Object.fromEntries(Object.entries(b.c.set).filter(([k, v]) => !same((t.settings || {})[k], v)));
        if (Object.keys(diff).length) prelude.push({ at: B, set: { track: id, ...diff } });
      }
      if (t.type === 'spoken') { if (units.length) lanes.push({ kind: 'track', track: id, units }); continue; }
      const dt = d.t;
      if (s.alone && !dt.alone) units.push({ kind: 'unsolo', dir: 1, step: { unsolo: id } });
      if (s.maskIdea && !dt.maskIdea) units.push({ kind: 'mask', dir: 1, step: { mask: { track: id, mask: null } } });
      for (const k of (s.hidden || []).filter(k => !(dt.hidden || []).includes(k))) units.push({ kind: 'reveal', device: k, dir: 1, step: { reveal: { track: id, keys: k } } });
      const off2 = (s.commented || []).filter(k => !(dt.commented || []).includes(k));
      if (off2.length) units.push({ kind: 'comment', dir: 1, step: { comment: { track: id, keys: off2, on: false } } });
      for (const dev of (s.rack || []).filter(x => !(dt.rack || []).some(y => y.device === x.device))) units.push({ kind: 'unrack', device: dev.device, step: { unrack: { track: id, device: dev.device } } });
      for (const dev of (dt.rack || []).filter(x => !same((s.rack || []).find(y => y.device === x.device), x))) units.push({ kind: 'device', device: dev.device, step: { rack: { track: id, ...clone(dev) } } });
      if ((s.variant ?? null) !== (dt.variant ?? null)) units.push({ kind: 'variant', step: { variant: { track: id, use: Number.isInteger(dt.variant) ? dt.variant : null } } });
      // the pattern: a growth level on its way down, or the notes a few at a time
      const pat = [], knob = [];
      const cs = clipAt(t, B), sName = cs ? String(cs.pattern) : '', sPat = cs ? (t.patterns || {})[sName] : null;
      if (!same(sPat, d.pat)) {
        const base = sName.replace(/~\w+$/, ''), lvl = sName.match(/~(\d+)$/);
        const ia = ideaOf(t.type, sPat), iz = ideaOf(t.type, d.pat), edits = ia && iz ? ideaSteps(ia, iz, o.lean ? 2 : 4) : [];
        if (same((t.patterns || {})[base], d.pat)) for (let k = lvl ? +lvl[1] - 1 : 0; k >= 0; k--) pat.push({ kind: 'grow', dir: 1, step: { pattern: { track: id, level: k } } });
        else if (edits.length) edits.forEach(idea => pat.push({ kind: 'notes', step: { notes: { track: id, idea } } }));
        // parts of another kind (notes or drum rows against an idea): the line rewritten in one edit
        else if (d.pat) { const w = wholePart(sPat || {}, d.pat, iz); if (Object.keys(w).length) pat.push({ kind: 'notes', step: { notes: { track: id, ...w } } }); }
      }
      // the knobs: from the values heard at the boundary to those heard at the arrival
      const effS = { ...(t.settings || {}), ...(b.on && b.c.set ? b.c.set : {}) };
      for (const k of SETTING_FIELDS[t.type] || []) {
        const a = effS[k], z = d.set[k];
        if (z === undefined || same(a, z)) continue;
        if (KNOBS.includes(k) && typeof a === 'number' && typeof z === 'number' && !(o.kind === 'volume' && o.track === id && k === 'gain')) {
          const m = o.lean ? 1 : k === 'cutoff' ? (Math.max(a, z) / Math.max(1, Math.min(a, z)) > 2 ? 2 : 1) : k !== 'gain' && Math.abs(z - a) > 0.3 ? 2 : 1;
          turns(k, a, z, m).forEach(v => knob.push({ kind: k, dir: Math.sign(z - a) * (k === 'gain' || k === 'cutoff' || k === 'drive' || k === 'grit' ? 1 : 0), step: { set: { track: id, [k]: v } } }));
        } else knob.push({ kind: 'set', step: { set: { track: id, [k]: clone(z) } } });
      }
      while (pat.length || knob.length) { if (pat.length) units.push(pat.shift()); if (knob.length) units.push(knob.shift()); }
      if (units.length) lanes.push({ kind: 'track', track: id, units });
    }
    // ---- the order and the bars ----
    // (the coming double phrase: its density when the listener set one, else its energy target, against what plays)
    const parts = (o.plan && o.plan.plan) || [], at = x => parts[Math.min(parts.length - 1, Math.max(0, Math.floor(x / (2 * ph))))];
    const target = at(dE), set = parts.slice(Math.max(0, Math.floor((B - off) / (2 * ph))), Math.floor(dE / (2 * ph)) + 1).find(d => d.curves && Number.isFinite(d.curves.density));
    const dens = set ? set.curves.density : null;
    const count = ids.filter(id => before[id].on && st.tracks.some(t => t.id === id && t.type !== 'spoken' && t.type !== 'riser')).length;
    const now = energyOf(st, { usual: o.plan && o.plan.usualHigh, weights: o.plan && o.plan.R && o.plan.R.energy });
    const bias = dens !== null ? Math.sign(dens - count) : target && Number.isFinite(target.target) ? (target.target > now + 0.05 ? 1 : target.target < now - 0.05 ? -1 : 0) : 0;
    const path = waypointPath(lanes, o.rng.fork('path'), { chooser: chooserFor(o.chooser)(focus, bias) });
    // (the bars the typing asked for, by move: the n-th move of a track)
    const seen = {};
    path.forEach(u => { u.key = `${u.track}:${(seen[u.track] = (seen[u.track] ?? -1) + 1)}`; });
    const gaps = path.map((u, i) => (i ? gapOf(u, path[i - 1]) + ((o.extra || {})[u.key] || 0) : 0));
    const span = gaps.reduce((a, x) => a + x, 0);
    // (two bars at least between the last move and the arrival, when the song has them)
    return { N0, st, dest, maps, path, gaps, span, prelude, focus, fits: B + span <= E0 - 2 };
  };
  let p = plan(E);
  for (let guard = 0; guard < 12 && !p.fits && E < limitE && !o.fixE; guard++) { E = Math.min(limitE, E + ph); p = plan(E); }
  // no room for every move (near the end of the song): fewer, larger moves (one turn per knob, two notes edits)
  if (!p.fits && !o.lean) { o = { ...o, lean: true }; p = plan(E); }
  const room = E - 1 - B, gaps = p.gaps.slice();
  // too many moves for the bars left (the End, the end of the song): the largest gaps give way, then moves share bars
  for (let sum = p.span; sum > room;) {
    let i = -1;
    for (let k = 1; k < gaps.length; k++) if (gaps[k] > 1 && (i < 0 || gaps[k] > gaps[i])) i = k;
    if (i < 0) for (let k = gaps.length - 1; k > 0; k--) if (gaps[k] > 0) { i = k; break; }
    if (i < 0) break;
    gaps[i]--; sum--;
  }
  // the rest of a growth taken by the moves: they spread over it, at most 8 bars apart
  if (B < G && !isEnd && gaps.length > 1) for (let sum = gaps.reduce((a, x) => a + x, 0), k = 0; sum < room && k < 8 * gaps.length; k++) { const i = 1 + (k % (gaps.length - 1)); if (gaps[i] < 8) { gaps[i]++; sum++; } }
  let at = B;
  const units = p.path.map((u, i) => ({ ...u, at: (at += gaps[i]) }));
  // ---- the song: the past, the moves (the listener's), the written form; then what is left set right at the arrival ----
  const N = clone(p.N0);
  N.build = [...N.build, ...p.prelude, ...units.map(u => ({ at: u.at, ...clone(u.step), by: 'listener' }))];
  const has = addsOf(N), dE = E - off;
  for (const t of N.tracks) {
    if (t.type === 'voice') continue;
    const wasAdded = prevAdded.has(t.id) || !ptrack(t.id);
    if (!wasAdded || has.has(t.id)) continue;
    // a track that came in by a step must keep one (before it, it was silent): where it plays again, else never
    const first = (t.clips || []).filter(c => c.start >= B).sort((a, b) => a.start - b.start)[0];
    if (first) N.build.push({ at: Math.max(E, first.start), add: t.id }); else t.mute = true;
  }
  const sim = stateAt(N, E).song, Wst = stateAt(W, dE).song, fix = [];
  for (const t of N.tracks) {
    if (t.type === 'voice' || t.mute) continue;
    const s = sim.tracks.find(x => x.id === t.id), w = Wst.tracks.find(x => x.id === t.id), plays = (t.clips || []).some(c => c.start + c.bars > E);
    if (!s) continue;
    const step = {};
    if (w) {
      const diff = Object.fromEntries(Object.entries(w.settings || {}).filter(([k, v]) => !same((s.settings || {})[k], v)));
      if (Object.keys(diff).length) step.set = { track: t.id, ...diff };
      const hid = (s.hidden || []).filter(k => !(w.hidden || []).includes(k));
      if (hid.length) step.reveal = { track: t.id, keys: hid };
      const com = (s.commented || []).filter(k => !(w.commented || []).includes(k));
      if (com.length) step.comment = { track: t.id, keys: com, on: false };
      if (s.alone && !w.alone) step.unsolo = t.id;
      if (s.maskIdea && !w.maskIdea) step.mask = { track: t.id, mask: null };
      if ((s.variant ?? null) !== (w.variant ?? null)) step.variant = { track: t.id, use: Number.isInteger(w.variant) ? w.variant : null };
      for (const dev of (s.rack || []).filter(x => !(w.rack || []).some(y => y.device === x.device))) fix.push({ at: E, unrack: { track: t.id, device: dev.device } });
      for (const dev of (w.rack || []).filter(x => !same((s.rack || []).find(y => y.device === x.device), x))) fix.push({ at: E, rack: { track: t.id, ...clone(dev) } });
    }
    if ((s.clips || []).some((c, j) => c.start + c.bars > E && c.pattern !== (t.clips[j] || {}).pattern)) step.pattern = { track: t.id, level: 0 };
    if (s.hush && plays && !(w && w.hush)) step.unmute = t.id;
    if (s.mute && plays) { const c = (t.clips || []).filter(x => x.start + x.bars > E).sort((a, b) => a.start - b.start)[0]; if (c && c.start <= E) step.add = t.id; else if (c) fix.push({ at: c.start, add: t.id }); }
    if (Object.keys(step).length) fix.push({ at: E, ...step });
  }
  N.build = [...N.build, ...fix].map((s, i) => ({ s, i })).sort((a, b) => a.s.at - b.s.at || a.i - b.i).map(x => x.s);
  // the code keeps the functions and levels of the song before its commands (song functions, written levels): the code
  // already shown stays as it was
  N.codeRef = prev.codeRef || { ...clone({ ...prev, build: undefined, codeRef: undefined }) };
  N.onAir = { ...(prev.onAir || {}), waypoints: [...((prev.onAir && prev.onAir.waypoints) || []), { kind: o.kind, at: B, to: E }] };
  return { song: N, B, E, units, focus: p.focus };
}

// ---------- typing at a person's pace ----------
// seconds of one bar at a bar (its section's tempo and meter)
function barSecondsAt(song, bar) {
  let at = 0;
  for (const s of song.sections) { if (bar < at + s.bars) return (meterSteps(s.meter || '4/4') / 4) * 60 / (s.bpm || 120); at += s.bars; }
  const s = song.sections[song.sections.length - 1];
  return (meterSteps(s.meter || '4/4') / 4) * 60 / (s.bpm || 120);
}
// How the human typing meets a song's steps from a boundary to the arrival, as the app types them (makeTyping, the
// typing load): the edit of the boundary from the step before it (or from the bar the command came, when later) and
// each later edit from the step before it, at most as fast as a person. → { fits (the boundary's edit), late: [{ at,
// bars }] (moves that need more bars before them) }
function typingFrom(N, B, q, E, C) {
  const L = liveCode(N, C, { cols: () => 80 }), seed = N.id || '';
  const bars = [...new Set(buildSteps(L.build).map(s => s.at))].sort((a, b) => a - b);
  const codes = new Map(), code = b => { if (!codes.has(b)) codes.set(b, L.codeAt(b)); return codes.get(b); };
  const need = (from, to) => { const c = code(to), was = settleOthers(code(from), c, to); return was === c ? 0 : typingPlan(was, c, { style: 'human', lean: true, seed }).natural; };
  const usable = (from, to) => { const avail = Math.max(0.2, (to - from) * barSecondsAt(N, to) - 0.2); return Math.max(0.2, avail - Math.min(avail * 0.5, 2)); };
  const prev = bars.filter(b => b < B).pop() ?? 0, start = Math.max(prev + 0.5, Number.isFinite(q) ? q : 0);
  const fits = need(prev, B) <= usable(start, B), late = [];
  let from = B;
  for (const b of bars.filter(x => x > B && x <= E)) {
    const nd = need(from, b);
    let g = 0;
    while (usable(from + 0.5, b + g) < nd && g < 16) g++;
    if (g) late.push({ at: b, bars: g });
    from = b;
  }
  return { fits, late };
}

// ---------- every command of a grown song ----------
// The song a grown radio song plays after its commands, in order, from the grown song: each command's boundary (a
// pending one, `pend` with the bar it came `q`, takes the first boundary that leaves time to type its edit at a
// person's pace, else the last one), the director's rewrite with every command up to it (steerSong, in its own bars),
// and the moves from the song as it was to that rewrite. A replay gives the commands their recorded boundaries.
// grown: the grown song (grown here from `song` with ctx when missing); song, plan, opts: the director's; ctx: the
// growth's context (growOnAir); controls: the controls the song shows its code with (the Custom ones, else the profile's
// own on air); chooser: the chooser on air, a version id of AIR_CHOOSERS (AIR_CHOOSER by default) or (focus, bias) =>
// chooser.
// → { song, grown, commands (with their boundaries; a command no boundary is left for is dropped), plan, opts, plain }
export function steerOnAir({ grown = null, song, plan, opts, commands = [], seed, n, ctx = {}, controls = null, chooser = null }) {
  const g0 = grown || growOnAir(song, ctx);
  if (!commands.length) return { song: g0, grown: g0, commands: [], plan, opts, plain: song };
  // (a song that did not grow: the commands rewrite it as in Classic, then it grows as it can)
  if (!g0 || !g0.onAir) { const r = steerSong({ song, plan, opts, commands: commands.map(({ q, pend, at0, ...c }) => c), seed, n }); return { song: growOnAir(r.song, ctx), grown: g0, commands: commands.map(({ pend, ...c }) => c), plan: r.plan, opts: r.opts, plain: r.song }; }
  // (a profile's own controls with the track names, as the Live coder showed them before radio-profiles 9.2: its default
  // comments are display only and never move the boundaries of the commands)
  const off = airOffset(g0), C = controls || ctx.controls || withDisplay(airControls(g0.onAir.profile, g0.onAir.free), { tracks: true });
  const toDirector = c => { const { q, pend, at0, ...rest } = c; return { ...rest, at: c.at - off }; };
  let N = g0, Wprev = writtenForm(song), P = plan, R = { song, plan, opts };
  const done = [];
  commands.forEach((cmd, i) => {
    const cands = cmd.pend ? airBoundaries(cmd.kind, Number.isFinite(cmd.q) ? cmd.q : cmd.at - 1, P, g0) : [cmd.at];
    const rng = stream(seed, `waypoint:${n}:${i}`);
    let pick = null;
    for (let j = 0; j < cands.length; j++) {
      const B = cands[j];
      const r = steerSong({ song, plan, opts, commands: [...done, { ...cmd, at: B }].map(toDirector), seed, n });
      const W = writtenForm(r.song), o = { kind: cmd.kind, track: cmd.track, rng, chooser, phrase: plan.phrase, plan: r.plan };
      let t = transitSong(N, W, Wprev, B, off, o);
      const last = j === cands.length - 1;
      let ty = typingFrom(t.song, B, cmd.q, t.E, C);
      if (cmd.pend && !last && !ty.fits) continue;
      // the moves that need more bars get them, the arrival kept (three times at most); when some still has to hurry
      // (the arrival's edit, the written form's lines of its section, among them) the arrival moves a phrase later
      for (let outer = 0, minE = 0; outer < 4; outer++) {
        const extra = {}, fixE = t.E;
        for (let round = 0; round < 3 && ty.late.some(x => x.at < fixE); round++) {
          for (const x of ty.late) { const u = t.units.find(v => v.at === x.at); if (u && u.at > B) extra[u.key] = (extra[u.key] || 0) + x.bars; }
          t = transitSong(N, W, Wprev, B, off, { ...o, extra: { ...extra }, fixE });
          ty = typingFrom(t.song, B, cmd.q, t.E, C);
        }
        if (!ty.late.length) break;
        minE = fixE + plan.phrase;
        const t2 = transitSong(N, W, Wprev, B, off, { ...o, minE });
        if (t2.E <= fixE) break;
        t = t2; ty = typingFrom(t.song, B, cmd.q, t.E, C);
      }
      pick = { B, r, W, t };
      break;
    }
    if (!pick) return;
    N = pick.t.song; Wprev = pick.W; P = pick.r.plan; R = pick.r;
    const { pend, ...kept } = cmd;
    done.push({ ...kept, at: pick.B });
  });
  return { song: N, grown: g0, commands: done, plan: R.plan, opts: R.opts, plain: R.song };
}
// the director's view of a steered grown song (its plan, options and song as steered), from commands with their
// boundaries in the grown song's bars: what the console reads
export function directorView({ song, plan, opts, commands, seed, n, grown }) {
  const off = airOffset(grown);
  return steerSong({ song, plan, opts, commands: commands.map(c => { const { q, pend, at0, ...rest } = c; return { ...rest, at: c.at - off }; }), seed, n });
}
