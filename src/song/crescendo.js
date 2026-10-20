// Crescendo (#64): a build style of the live build where a song grows from one sound to the song as written in
// small steps, one or a few lines at a time, like a live coder. Pure: runs in the app and in Node (check:crescendo).
// crescendoSong(song) returns an ordinary song: the written song with a growth span in front (the reference section
// repeated, first over one held chord), generated pattern variants ("A~1", "A~2"…) and a "build" list made only of
// the live build actions. Everything downstream (player, seek, typing, voice, export, hand takeover) works unchanged.
import { normalizeSong, SETTING_FIELDS } from './format.js';
import { stream } from '../endless/random.js';
import { PROGS, DEFAULT, presetIdea, meterSteps } from '../music.js';
import { ideaLadder, expandIdea, ideaRows } from './ideas.js';
import { coderPath } from './coder.js';
import { stateAt, applyStep } from './build.js';
import { resolveShape, shapeFacts, canPlay, openingLine, SHAPES_VERSION, DEFAULT_WEIGHTS, RECIPE_KEYS, DEVELOPMENTS, PACES } from './shapes.js';
import { placeSpoken } from './spoken.js';
import { liveCode } from '../live/live-code.js';
import { resolveProfile } from '../live/profiles.js';
import { rushedSteps, rushLoad, typingLoad, barSeconds } from '../live/typing-load.js';
import { compileSong } from './compile.js';
import { typingPlan } from './typing.js';
import { writeCode, levelsOf, busesOf, functionContext, functionOptions } from './writer.js';
import { applyComments } from './comments.js';
import { idiomatic } from './idiom.js';
import { compose, KIND_OF_TYPE } from '../material/index.js';
import { KEYS } from '../music.js';

// raised when an intended change to the rules changes the steps of a checked song (tools/check-crescendo.mjs)
// 2 (idea-model): the Live coder's natural growth grows ideas (presets included) through simpler forms of themselves
export const CRESCENDO_VERSION = 2;
// the random stream keeps the name of version 1: a version raised for the Live coder rules does not move the steps of
// Classic and Crescendo
const STREAM = 'crescendo-1';
export const BUILD_STYLES = ['blocks', 'crescendo'];
export const ENDINGS = ['strip', 'blocks', 'short'];

const clone = o => JSON.parse(JSON.stringify(o));
// (voice-instrument: a spoken track comes after the texture; it is never thinned, it enters at its first line)
const ORDER = ['drums', 'bass', 'pad', 'guitar', 'arp', 'hook', 'texture', 'spoken', 'riser', 'code'];
// tracks without rows or notes to thin grow with the "degrade" device instead
const DEGRADE_TYPES = ['bass', 'guitar', 'arp', 'hook', 'pad', 'texture'];
const COLOUR_KEYS = ['cutoff', 'drive', 'grit', 'room', 'delay', 'gain'];
// natural growth: which functions a track writes, by setting (they are hidden until a step reveals them)
const HIDE_TYPES = ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture'];
const HIDES = {
  cutoff: (s, type) => type !== 'texture' && Number.isFinite(s.cutoff) && s.cutoff < 18000,
  reso: s => Number(s.reso) > 0, drive: s => Number(s.drive) > 0, grit: s => Number(s.grit) > 0,
  room: s => Number(s.room) > 0, delay: s => Number(s.delay) > 0, env: (s, type) => ['bass', 'arp', 'hook', 'pad', 'guitar'].includes(type),
};
const r3 = x => Math.round(x * 1000) / 1000;

// ---------- growing patterns ----------
// strength of a 16th position: 4 first beat, 3 other beats, 2 off-beat 8ths, 1 off 16ths
const strength = i => (i % 16 === 0 ? 4 : i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1);
const ROW_CLASS = { bd: 2, cp: 1, sd: 1, hh: 0, oh: 0, rd: 0 };
// among hits of the same strength, the order of removal is spread over the bar (bit-reversed position), so a thinned
// row keeps an even pulse instead of losing its first half
const spread = i => { const q = i % 16; return ((q & 1) << 3 | (q & 2) << 1 | (q & 4) >> 1 | (q & 8) >> 3) * 64 + Math.floor(i / 16); };
// thinned versions of a list of hits: level k of n removes the weakest k/n of the hits that are not the core
function thinHits(hits, core, n) {
  const rest = hits.filter(h => !core.includes(h)).sort((a, b) => a.w - b.w || a.order - b.order);
  return Array.from({ length: n }, (_, k) => new Set([...core, ...rest.slice(Math.round(rest.length * (k + 1) / n))]));
}
// growth-shapes: o.core is the core the opening asks for ('kick': every kick hit, 'broken': the kick hits off the
// beat), o.kickFirst keeps the kick hits until last, so the kick row is whole a few levels before the rest
function thinRows(rows, n, o = {}) {
  const hits = [];
  Object.entries(rows || {}).forEach(([row, steps], r) => [...steps].forEach((c, i) => { if (c === 'x') hits.push({ row, i, w: strength(i) * 3 + (ROW_CLASS[row] ?? 1) + (o.kickFirst && row === 'bd' ? 100 : 0), order: spread(i) * 8 + r }); }));
  if (!hits.length) return Array(n).fill(rows);
  // the simplest variant keeps the kick on the first beat (or the strongest hit when there is no kick)
  let core = o.core === 'kick' ? hits.filter(h => h.row === 'bd') : o.core === 'broken' ? hits.filter(h => h.row === 'bd' && h.i % 4 !== 0) : [];
  if (!core.length) core = hits.filter(h => h.row === 'bd' && h.i % 16 === 0);
  if (!core.length) { const top = Math.max(...hits.map(h => h.w)); core = [hits.find(h => h.w === top)]; }
  return thinHits(hits, core, n).map(keep => Object.fromEntries(Object.entries(rows).map(([row, steps]) =>
    [row, [...steps].map((c, i) => (c === 'x' && [...keep].some(h => h.row === row && h.i === i) ? 'x' : '.')).join('')])
    .filter(([, steps]) => steps.includes('x'))));
}
// written notes ("0 ~ 3 2", "<[0 ~ 1] [3 ~]>") and step masks ("x..x"): the weaker tokens become rests
const TOKEN = /[^\s[\]<>]+/g;
function thinNotes(text, n) {
  const toks = [...String(text).matchAll(TOKEN)].map((m, p) => ({ p, rest: /^[~.\-_]$/.test(m[0]) }));
  const hits = toks.filter(t => !t.rest).map(t => ({ ...t, w: t.p % 8 === 0 ? 4 : t.p % 4 === 0 ? 3 : t.p % 2 === 0 ? 2 : 1, order: spread(t.p) }));
  if (!hits.length) return Array(n).fill(text);
  let core = hits.filter(h => h.w === 4); if (!core.length) core = [hits[0]];
  return thinHits(hits, core, n).map(keep => { let p = -1; return String(text).replace(TOKEN, tok => (++p, /^[~.\-_]$/.test(tok) || [...keep].some(h => h.p === p) ? tok : '~')); });
}
const thinSteps = (steps, n) => {
  const hits = [...steps].map((c, i) => ({ i, c })).filter(h => h.c === 'x').map(h => ({ ...h, w: strength(h.i), order: spread(h.i) }));
  if (!hits.length) return Array(n).fill(steps);
  const core = [hits.find(h => h.w === Math.max(...hits.map(x => x.w)))];
  return thinHits(hits, core, n).map(keep => [...steps].map((c, i) => (c === 'x' && [...keep].some(h => h.i === i) ? 'x' : '.')).join(''));
};
// how much a pattern can be thinned: hits or notes it plays (0: nothing to thin)
function density(type, pat, ctx = {}) {
  if (type === 'drums' && pat.idea && !pat.rows) return Object.values(ideaRows(pat.idea, ctx.N || 16)).join('').split('x').length - 1;
  if (type === 'drums') return Object.values(pat.rows || {}).join('').split('x').length - 1;
  if (pat.notes) return [...String(pat.notes).matchAll(TOKEN)].filter(m => !/^[~.\-_]$/.test(m[0])).length;
  if (pat.steps) return String(pat.steps).split('x').length - 1;
  if (pat.idea) return expandIdea(pat.idea, { type, N: ctx.N || 16, ch: pat, shared: ctx.shared || {} }).steps.split('x').length - 1;
  return 0;
}
// n variants of a pattern, level 1 (closest to the written one) to level n (the simplest)
// rules.natural (arp-patterns): an arpeggio's order grows from one note, then two notes of the chord (the root and the
// fifth), thinned and then whole, then the written order with the whole chord
function arpVariants(notes, n) {
  const two = String(notes).replace(TOKEN, tok => (/^\d$/.test(tok) ? (+tok < 2 ? '0' : '2') : tok));
  const out = [two, ...thinNotes(two, Math.max(0, n - 1))].slice(0, n);
  if (n > 1) out[n - 1] = out[n - 1].replace(TOKEN, tok => (/^\d$/.test(tok) ? '0' : tok));
  return out;
}
// ideas (idea-model): with rules.natural (Live coder) an idea grows through simpler forms of itself (ideaLadder): a
// preset counts as its idea. Otherwise an idea is thinned from the steps it plays, as the same written steps would be.
// ctx: { N (16ths per bar of the reference section), shared (the song's progressions) }
const LADDER_TYPES = ['bass', 'guitar', 'arp', 'hook', 'pad', 'drums'];
const ideaOf = (type, pat) => pat.idea || (['bass', 'guitar', 'arp', 'hook', 'pad'].includes(type) && !pat.notes && !pat.steps ? presetIdea(type, { preset: pat.preset, pattern: pat.preset }) : null);
export function ideaForms(type, pat, n, ctx = {}) {
  if (!LADDER_TYPES.includes(type) || pat.notes || pat.steps || (type === 'drums' && !pat.idea)) return [];
  const idea = ideaOf(type, pat);
  return idea ? ideaLadder(idea, { type, N: ctx.N || 16, ch: pat, shared: ctx.shared || {} }, n) : [];
}
// drums under a growth shape (growth-shapes): the simplest variant is the core of the opening (D2); a beat idea grows
// one step number at a time (an idea grows instead of being thinned); a straight kick that opens broken starts from a
// tresillo or a two-step kick. o: { core: 'one' | 'kick' | 'broken', kickFirst, broken: rows of the broken kick }
const BROKEN = { tresillo: 'x..x..x.x..x..x.', 'two-step': 'x.....x...x.....' };
const offBeatKick = rows => [...String((rows || {}).bd || '')].some((c, i) => c === 'x' && i % 4 !== 0);
export function beatForms(beat, o = {}) {
  // (a beat is four sixteenths on a grid of sixteenths, two eighths on a grid of eighths, whatever the meter)
  const grid = beat.grid ?? 16, onBeat = grid >= 12 ? 4 : grid >= 6 ? 2 : 1, str = k => (k % grid === 0 ? 4 : k % onBeat === 0 ? 3 : k % (onBeat / 2) === 0 ? 2 : 1);
  const all = Object.entries(beat).filter(([r]) => r !== 'grid').flatMap(([row, list], r) => String(list).split(',').map(x => x.trim()).filter(Boolean).map(x => ({ row, k: +x, r })));
  if (!all.length) return [];
  let core = o.core === 'kick' ? all.filter(h => h.row === 'bd') : o.core === 'broken' ? all.filter(h => h.row === 'bd' && h.k % onBeat !== 0) : [];
  if (!core.length) core = [all.find(h => h.row === 'bd') || all[0]];
  const rest = all.filter(h => !core.includes(h)).sort((a, b) => (o.kickFirst ? (b.row === 'bd') - (a.row === 'bd') : 0) || str(b.k) - str(a.k) || a.r - b.r || a.k - b.k);
  const form = hits => { const out = { grid }; for (const [row] of Object.entries(beat).filter(([r]) => r !== 'grid')) { const ks = hits.filter(h => h.row === row).map(h => h.k).sort((a, b) => a - b); if (ks.length) out[row] = ks.join(','); } return out; };
  // from the simplest to the one before the written beat: each adds one number
  const forms = [];
  for (let m = 0; m < rest.length; m++) forms.push(form([...core, ...rest.slice(0, m)]));
  return forms.reverse();
}
// with a medium or fast pace the drums grow one row (one line of code) at a time: the kick first (its core, then
// whole), then the snare or clap, then the hats and the rest; the written rows last
const ROW_ORDER = ['bd', 'sd', 'cp', 'rim', 'hh', 'oh', 'rd', 'cr', 'lt', 'mt', 'ht', 'cb', 'sh', 'perc', 'misc'];
const rowRank = r => { const i = ROW_ORDER.indexOf(r); return i < 0 ? ROW_ORDER.length : i; };
export function rowForms(rows, o = {}) {
  const live = Object.entries(rows || {}).filter(([, v]) => /x/.test(v)).sort(([a], [b]) => rowRank(a) - rowRank(b));
  if (live.length < 2 || live[0][0] !== 'bd') return [];
  const bd = live[0][1], hits = [...bd].map((c, i) => (c === 'x' ? i : -1)).filter(i => i >= 0);
  const coreHits = o.core === 'kick' ? hits : o.core === 'broken' ? hits.filter(i => i % 4 !== 0) : hits.filter(i => i % 16 === 0).slice(0, 1);
  const row = keep => [...bd].map((c, i) => (keep.includes(i) ? 'x' : '.')).join('');
  const forms = [];
  if (coreHits.length && coreHits.length < hits.length) forms.push({ bd: row(coreHits) });
  // a straight kick that opens broken: a tresillo or a two-step kick first
  else if (o.core === 'broken' && !coreHits.length) forms.push({ bd: (BROKEN[o.broken] || BROKEN.tresillo).slice(0, bd.length).padEnd(bd.length, '.') });
  for (let k = 1; k < live.length; k++) forms.push(Object.fromEntries(live.slice(0, k)));
  return forms.reverse();
}
function drumVariants(pat, n, o, ctx) {
  if (o.kickFirst && pat.rows && rowForms(pat.rows, o).length) { const forms = rowForms(pat.rows, o); return Array.from({ length: n }, (_, k) => ({ ...pat, rows: forms[Math.min(k, forms.length - 1)] })); }
  if (pat.idea && pat.idea.beat && !pat.rows) {
    const beat = pat.idea.beat, forms = beatForms(beat, o), grid = beat.grid ?? 16, onBeat = grid >= 12 ? 4 : grid >= 6 ? 2 : 1;
    if (!forms.length) return Array(n).fill(pat);
    const out = Array.from({ length: n }, (_, k) => ({ ...pat, idea: { ...pat.idea, beat: forms[Math.min(k, forms.length - 1)] } }));
    if (o.core === 'broken' && beat.bd !== undefined && !String(beat.bd).split(',').some(x => +x % onBeat !== 0)) {
      const steps = [...(BROKEN[o.broken] || BROKEN.tresillo)].map((c, i) => (c === 'x' ? i * (grid >= 12 ? 1 : grid / 16) : -1)).filter(i => i >= 0 && Number.isInteger(i) && i < grid);
      out[n - 1] = { ...pat, idea: { ...pat.idea, beat: { grid, bd: steps.join(',') } } };
    }
    return out;
  }
  const rows = pat.idea && !pat.rows ? ideaRows(pat.idea, ctx.N || 16) : pat.rows, base = { ...pat };
  if (pat.idea && !pat.rows) delete base.idea;
  const out = thinRows(rows, n, o).map(r => ({ ...base, rows: r }));
  if (o.core === 'broken' && n && !offBeatKick(rows) && rows && rows.bd) out[n - 1] = { ...base, rows: { bd: (BROKEN[o.broken] || BROKEN.tresillo).slice(0, String(rows.bd).length).padEnd(String(rows.bd).length, '.') } };
  return out;
}
export function patternVariants(type, pat, n, rules = {}, ctx = {}) {
  if (type === 'drums' && rules.drum) return drumVariants(pat, n, rules.drum, ctx);
  if (rules.natural) {
    const forms = ideaForms(type, pat, n, ctx);
    if (forms.length) {
      // a preset keeps its name (its sound and its label); fewer forms than levels: the simplest repeats
      const preset = pat.idea ? {} : { preset: pat.preset ?? (type === 'guitar' ? DEFAULT.guitar.pattern : DEFAULT[type].preset) };
      return Array.from({ length: n }, (_, k) => ({ ...pat, ...preset, idea: forms[Math.min(k, forms.length - 1)] }));
    }
  }
  if (type === 'arp' && rules.natural && pat.notes && /\d/.test(pat.notes)) return arpVariants(pat.notes, n).map(notes => ({ ...pat, notes }));
  if (type === 'drums' && pat.idea && !pat.rows) { const { idea, ...rest } = pat; return thinRows(ideaRows(idea, ctx.N || 16), n).map(rows => ({ ...rest, rows })); }
  if (type === 'drums') return thinRows(pat.rows, n).map(rows => ({ ...pat, rows }));
  if (pat.notes) return thinNotes(pat.notes, n).map(notes => ({ ...pat, notes }));
  if (pat.steps) return thinSteps(pat.steps, n).map(steps => ({ ...pat, steps }));
  if (pat.idea) return thinSteps(expandIdea(pat.idea, { type, N: ctx.N || 16, ch: pat, shared: ctx.shared || {} }).steps, n).map(steps => ({ ...pat, steps }));
  return Array(n).fill(pat);
}

// ---------- settings ----------
// neutral value of a setting, where its knob starts: a closed filter (halfway to 200 Hz on a log scale), no drive,
// no room, no delay, 80% of the gain. null: the setting is not grown
function neutral(key, v) {
  if (typeof v !== 'number') return null;
  if (key === 'cutoff') return v > 300 ? Math.round(Math.exp((Math.log(v) + Math.log(200)) / 2) / 10) * 10 : null;
  if (key === 'gain') return v > 0 ? r3(v * 0.8) : null;
  return v > 0 ? 0 : null;
}
// values of a knob turned from the neutral value to the written one in m moves (the last is the written value)
function moves(key, from, to, m) {
  return Array.from({ length: m }, (_, j) => {
    const k = (j + 1) / m;
    if (j === m - 1) return to;
    return key === 'cutoff' ? Math.round(Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * k) / 10) * 10 : r3(from + (to - from) * k);
  });
}

// ---------- the path ----------
// One track's plan at a level of detail (3 full, 0 bare): the minimal state it enters with (setup) and its growth
// units, each one small change. Units of a queue keep their order.
// rules.natural (natural-growth): the track's functions are hidden at the start and arrive one per step, some knob
// moves are tried by ear (a value past the next one, then corrected)
function trackPlan(t, d, rng, clipKeys, rules = {}, ctx = {}) {
  const plan = { id: t.id, type: t.type, setup: [], fullness: [], colour: [], patterns: {} };
  if (t.type === 'code' || t.type === 'riser' || t.type === 'voice' || t.type === 'spoken' || t.type === 'module') return plan;
  // pattern variants
  const dens = Math.max(0, ...Object.values(t.patterns || {}).map(p => density(t.type, p, ctx)));
  let n = dens >= 24 ? 4 : dens >= 10 ? 3 : dens >= 2 ? 2 : 0;
  // Live coder: an idea has as many levels as simpler forms (ideaForms), whatever its density
  const ladder = rules.natural ? Math.max(0, ...Object.values(t.patterns || {}).map(p => ideaForms(t.type, p, 4, ctx).length)) : 0;
  if (ladder) n = ladder;
  // growth-shapes: a beat idea grows one number per level, whatever the detail
  // (as many levels as the forms of the pattern the growth plays, the reference section's)
  const refPat = (t.patterns || {})[rules.ref] || null;
  const beats = rules.drum && t.type === 'drums' ? (refPat ? [refPat] : Object.values(t.patterns || {})).reduce((m, p) => Math.max(m, p.idea && p.idea.beat && !p.rows ? beatForms(p.idea.beat, rules.drum).length : 0), 0) : 0;
  const byRow = rules.drum && rules.drum.kickFirst && t.type === 'drums' ? Math.max(0, ...Object.values(t.patterns || {}).map(p => (p.rows ? rowForms(p.rows, rules.drum).length : 0))) : 0;
  n = beats ? Math.min(12, beats) : byRow ? Math.min(6, byRow) : d >= 2 ? n : d === 1 ? Math.min(n, 2) : Math.min(n, 1);
  const rack = t.rack || [];
  if (n) {
    for (const [name, pat] of Object.entries(t.patterns || {})) patternVariants(t.type, pat, n, rules, ctx).forEach((v, k) => { plan.patterns[`${name}~${k + 1}`] = v; });
    plan.setup.push({ pattern: { track: t.id, level: n } });
    for (let k = n - 1; k >= 0; k--) plan.fullness.push({ kind: 'grow', step: { pattern: { track: t.id, level: k } } });
  } else if (DEGRADE_TYPES.includes(t.type) && !rack.some(x => x.device === 'degrade')) {
    const amounts = d >= 2 ? [0.6, 0.35, 0.15] : [0.5];
    plan.setup.push({ rack: { track: t.id, device: 'degrade', amount: amounts[0] } });
    amounts.slice(1).forEach(a => plan.fullness.push({ kind: 'fill', step: { rack: { track: t.id, device: 'degrade', amount: a } } }));
    plan.fullness.push({ kind: 'fill', step: { unrack: { track: t.id, device: 'degrade' } } });
  }
  // settings that move toward their written value (not those a clip sets itself, nor the pinned ones)
  const pinned = t.pinned || [], neutralSet = {}, knobs = [];
  for (const key of COLOUR_KEYS) {
    if (!(SETTING_FIELDS[t.type] || []).includes(key) || clipKeys.has(key) || pinned.includes(key)) continue;
    if (d < 3 && key === 'gain') continue;
    if (d === 1 && key !== 'cutoff') continue;
    if (d === 0 && !(rules.natural && key === 'cutoff')) continue;
    // growth-shapes: the filtered opening moves the cutoff itself, from a closed filter
    if (rules.filtered && key === 'cutoff') continue;
    const v = (t.settings || {})[key], nv = neutral(key, v);
    if (nv === null) continue;
    neutralSet[key] = nv;
    // growth-shapes: a value that moves slowly over minutes (slide): the cutoff in five small moves
    const slide = rules.slide && key === 'cutoff';
    const m = slide ? 5 : rules.small && key !== 'gain' ? (key === 'cutoff' ? 3 : 2) : d < 3 ? 1 : key === 'cutoff' ? rng.int(1, 3) : key === 'gain' ? 1 : rng.int(1, 2);
    const vals = moves(key, nv, v, m);
    // a try: past the written value, then back to it
    if (!slide && rules.natural && key !== 'gain' && !(key === 'cutoff' && v >= 12000) && rng.chance(rules.trials ?? 0.3)) vals.splice(vals.length - 1, 0, key === 'cutoff' ? Math.round(v * 1.4 / 10) * 10 : r3(v * 1.3));
    const lane = vals.map(x => ({ kind: key, ...(slide ? { slide: true } : {}), step: { set: { track: t.id, [key]: x } } }));
    // natural growth: a knob that moves arrives first (its function was hidden)
    if (rules.natural && HIDES[key] && HIDE_TYPES.includes(t.type)) lane.unshift({ kind: 'reveal', device: key, step: { reveal: { track: t.id, keys: key } } });
    knobs.push(lane);
  }
  // natural growth: the functions the track writes are hidden at bar 0; those without a knob arrive on their own
  if (rules.natural && HIDE_TYPES.includes(t.type)) {
    const set = { ...(t.settings || {}) }, moving = knobs.map(l => l[0] && l[0].step.reveal && l[0].step.reveal.keys).filter(Boolean);
    // with less detail fewer functions arrive on their own (a long list of reveals would leave no room for pauses)
    const may = d >= 2 ? Object.keys(HIDES) : d === 1 ? ['cutoff', 'drive', 'room', 'delay'] : ['cutoff'];
    const hidden = Object.keys(HIDES).filter(k => (HIDES[k](set, t.type) || moving.includes(k)) && (may.includes(k) || moving.includes(k)) && !(rules.filtered && k === 'cutoff'));
    if (hidden.length) {
      plan.setup.push({ hide: { track: t.id, keys: hidden } });
      for (const k of hidden) if (!knobs.some(l => l[0] && l[0].step.reveal && l[0].step.reveal.keys === k)) knobs.push([{ kind: 'reveal', device: k, step: { reveal: { track: t.id, keys: k } } }]);
    }
  }
  // growth-shapes, filtered opening: the kick enters behind a low-pass at 300 Hz that opens while it fills
  if (rules.filtered) {
    const v = Number((t.settings || {}).cutoff ?? 20000), units = moves('cutoff', 300, v, 3).map(x => ({ kind: 'cutoff', step: { set: { track: t.id, cutoff: x } } }));
    neutralSet.cutoff = 300;
    const f = plan.fullness; plan.fullness = [];
    while (f.length || units.length) { if (units.length) plan.fullness.push(units.shift()); if (f.length) plan.fullness.push(f.shift()); }
  }
  if (Object.keys(neutralSet).length) plan.setup.push({ set: { track: t.id, ...neutralSet } });
  // rack devices come in one at a time, in their written order (only a tail of the chain, so the order stays)
  const grow = d >= 2 ? rack.length : d === 1 ? Math.min(1, rack.length) : 0;
  const devs = rack.slice(rack.length - grow);
  devs.forEach(dev => plan.setup.unshift({ unrack: { track: t.id, device: dev.device } }));
  const devUnits = devs.map(dev => ({ kind: 'device', device: dev.device, step: { rack: { track: t.id, ...clone(dev) } } }));
  // colour queue: knobs and devices interleaved, each keeping its own order
  const lanes = [...knobs, ...(devUnits.length ? [devUnits] : [])];
  while (lanes.some(l => l.length)) { const live = lanes.filter(l => l.length); plan.colour.push(rng.pick(live).shift()); }
  return plan;
}

// The growth from silence to the destination for a set of tracks: the anchor enters first, the others enter one by
// one while the ones in play fill up their patterns, then the colour comes in. Same as tearing the destination down
// (colour first, then pattern fullness, then the later tracks, the anchor last) and playing it backwards.
// → [{ kind, track, step }], the entries are { kind: 'enter', step: { add } }
export function crescendoPath(plans, rng) {
  const queue = plans.map(p => ({ ...p, fullness: p.fullness.slice(), colour: p.colour.slice() }));
  const total = queue.reduce((a, p) => a + 1 + p.fullness.length + p.colour.length, 0);
  const out = [], inPlay = [];
  let sinceEnter = 0;
  const enter = () => { const p = queue[inPlay.length]; inPlay.push(p); sinceEnter = 0; out.push({ kind: 'enter', track: p.id, type: p.type, step: { add: p.id } }); };
  enter();
  while (out.length < total) {
    const progress = out.length / total, cands = [], weights = [];
    if (inPlay.length < queue.length && (sinceEnter >= 1 || inPlay[inPlay.length - 1].fullness.length === 0)) { cands.push('enter'); weights.push(1.3); }
    for (const p of inPlay) {
      if (p.fullness.length) { cands.push([p, 'fullness']); weights.push(1.6 * (1 - progress) + 0.3); }
      if (p.colour.length) { cands.push([p, 'colour']); weights.push((0.25 + 1.4 * progress) * (p.fullness.length ? 0.35 : 1)); }
    }
    if (!cands.length) { enter(); continue; }
    const c = rng.weighted(cands, weights);
    if (c === 'enter') { enter(); continue; }
    const u = c[0][c[1]].shift();
    out.push({ ...u, track: c[0].id, type: c[0].type });
    sinceEnter++;
  }
  return out;
}

// ---------- narration ----------
// short comments per kind of step, our own wording: [en, it]
const P = {
  enter: {
    drums: [['start with the kick', 'partiamo dalla cassa'], ['drums in', 'entra la batteria']],
    bass: [['need bass', 'serve il basso'], ['here comes the bass', 'arriva il basso'], ['bass in', 'dentro il basso']],
    pad: [['some warmth', "un po' di calore"], ['pad underneath', 'un pad sotto']],
    guitar: [['guitars!', 'chitarre!'], ['add the guitar', 'aggiungo la chitarra']],
    arp: [['now the arp', "ora l'arpeggio"], ['arp in', "dentro l'arpeggio"]],
    hook: [['melody!', 'melodia!'], ['a little tune', 'una melodia']],
    texture: [['some dirt', "un po' di sporco"], ['texture in', 'entra la texture']],
    riser: [['here it comes', 'sta arrivando']], code: [['something odd', 'qualcosa di strano']], spoken: [['a voice', 'una voce'], ['someone speaks', 'qualcuno parla']],
    any: [['new sound', 'suono nuovo']],
  },
  grow: {
    drums: [['more hats', 'più charleston'], ['fill the drums', 'riempio la batteria'], ['busier beat', 'ritmo più fitto']],
    bass: [['more notes', 'più note'], ['bass line grows', 'il basso cresce']],
    any: [['more notes', 'più note'], ['let it grow', 'facciamolo crescere'], ['a bit busier', 'un po\' più pieno']],
  },
  fill: { any: [['fill the gaps', 'riempio i buchi'], ['fewer gaps', 'meno buchi'], ['play it all', 'suona tutto']] },
  cutoff: { any: [['open the filter', 'apro il filtro'], ['brighter', 'più chiaro'], ['open it up', 'apriamo']] },
  drive: { any: [['more drive', 'più spinta'], ['dirty it up', 'sporchiamolo']] },
  grit: { any: [['more grit', 'più grana']] },
  room: { any: [['more room', 'più spazio'], ['some reverb', "un po' di riverbero"]] },
  delay: { any: [['add some delay', "un po' di delay"], ['echo it', 'facciamo eco']] },
  gain: { any: [['louder', 'più forte'], ['turn it up', 'alziamo']] },
  device: {
    echo: [['add an echo', "aggiungo un'eco"]], delay: [['add some delay', "un po' di delay"]], reverb: [['some reverb', "un po' di riverbero"]],
    distort: [['distort it', 'distorciamo']], shape: [['saturate it', 'saturiamo']], crush: [['crush it', 'sbricioliamolo']], coarse: [['lo-fi it', 'più lo-fi']],
    phaser: [['add a phaser', 'aggiungo un phaser']], tremolo: [['make it pulse', 'facciamolo pulsare']], pan: [['move it around', 'muoviamolo']],
    off: [['double it', 'raddoppiamo']], ply: [['repeat the notes', 'ripeto le note']], jux: [['wider', 'più largo']],
    any: [['add some colour', "un po' di colore"], ['one more effect', 'un effetto in più']],
  },
  // natural growth: a function arrives in the code
  reveal: {
    cutoff: [['add a filter', 'mettiamo un filtro'], ['filter it', 'filtriamolo']], reso: [['more resonance', 'più risonanza'], ['make it squelch', 'facciamolo fischiare']],
    drive: [['some drive', "un po' di spinta"], ['distort it', 'distorciamo']], grit: [['some grit', "un po' di grana"]],
    room: [['some room', "un po' di spazio"], ['add reverb', 'aggiungo riverbero']], delay: [['add a delay', 'aggiungo un delay'], ['echo it', 'facciamo eco']],
    env: [['shape the notes', 'diamo forma alle note'], ['shorter notes', 'note più corte']], any: [['one more function', 'una funzione in più']],
  },
  break: { any: [['drop the drums', 'togliamo la batteria'], ['break', 'pausa']] },
  back: { any: [['bring the kick back in', 'torna la cassa'], ['and back', 'e si riparte']] },
  harmony: { any: [['now the chords', 'ora gli accordi'], ['chords move', 'gli accordi si muovono']] },
  strip: { any: [['strip it back', 'togliamo qualcosa'], ['less', 'meno'], ['winding down', 'chiudiamo']] },
  last: { any: [["that's it", 'fine'], ['and out', 'e via']] },
  // like a live coder (live-coder-growth): a block copied, a function commented out and back, notes rewritten
  clone: { any: [['copy that line', 'copio quella riga'], ['same line, new sound', 'stessa riga, suono nuovo']] },
  comment: { any: [['take it out', 'lo tolgo'], ['without it', 'senza']] },
  uncomment: { any: [['and back in', 'e lo rimetto'], ['bring it back', 'rimettiamolo']] },
  rewrite: { any: [['new notes', 'note nuove'], ['rewrite the line', 'riscrivo la linea']] },
  settle: { any: [['there it is', 'eccolo']] },
};
export const CRESCENDO_PHRASES = Object.values(P).flatMap(g => Object.values(g).flat()).map(([en, it]) => ({ en, it }));
function phrase(kind, type, device, recent, rng) {
  const g = P[kind] || P.device, list = (kind === 'device' || kind === 'reveal' ? g[device] : g[type]) || g.any || P.enter.any;
  const fresh = list.filter(([en]) => !recent.includes(en)), [en, it] = rng.pick(fresh.length ? fresh : list);
  recent.push(en); if (recent.length > 8) recent.shift();
  return { en, it };
}

// ---------- growth shapes (growth-shapes) ----------
// the core of the drums' simplest variant per opening (D2); the pattern name of the second skin (D7)
const CORE = { 'full-kick': 'kick', filtered: 'kick', broken: 'broken' };
// steps that bring a track in or take a mark away keep a bar of their own (one "_" or one "S" per step)
const MARKS = ['enter', 'unsolo', 'unmute'];
const SKIN = 'skin';
const kickTrack = t => t.type === 'drums' && Object.values(t.patterns || {}).some(p => (p.rows ? /x/.test(String(p.rows.bd || '')) : p.idea ? !!(p.idea.beat && p.idea.beat.bd) : true));
// the order of entries (D4): by type as today, or as written (where each track's first clip starts); the opening names
// the track that comes first (the kick, a melodic track, the pad)
function orderByShape(dest, shape, srng, rank, plays) {
  const first = t => Math.min(...t.clips.map(c => c.start));
  if (shape.development === 'as-written') dest.sort((a, b) => first(a) - first(b) || rank(a) - rank(b) || plays.indexOf(a) - plays.indexOf(b));
  else for (let i = 1; i < dest.length - 1; i++) if (srng.chance(0.3)) [dest[i], dest[i + 1]] = [dest[i + 1], dest[i]];
  const o = shape.opening;
  // a track that holds only the kick comes before a beat track
  const kickOnly = t => kickTrack(t) && Object.values(t.patterns || {}).every(p => !p.rows || Object.keys(p.rows).every(r => r === 'bd' || !/x/.test(p.rows[r])));
  const front = ['slow', 'full-kick', 'filtered', 'broken'].includes(o) ? dest.find(kickOnly) || dest.find(kickTrack) || dest.find(t => t.type === 'drums')
    : o === 'melodic' ? dest.find(t => ['arp', 'hook', 'guitar'].includes(t.type))
      : o === 'pad' ? dest.find(t => t.type === 'pad') || dest.find(t => t.type === 'texture') : null;
  if (front) { dest.splice(dest.indexOf(front), 1); dest.unshift(front); }
}
// draws of the shape that the plans need: the broken kick (tresillo or two-step), the track whose cutoff slides
function shapeExtras(dest, shape, srng) {
  const broken = srng.pick(['tresillo', 'two-step']);
  const cands = dest.filter((t, i) => i > 0 && t.type !== 'drums' && Number.isFinite((t.settings || {}).cutoff) && t.settings.cutoff < 18000 && !(t.pinned || []).includes('cutoff'));
  const slide = cands.length && srng.chance(0.6) ? srng.pick(cands).id : null;
  return { broken, slide };
}
// openings with the tracks written from bar 0: muted with "_$:" but one (muted base), two in solo (mid-set)
function openingSetup(dest, plans, shape) {
  if (shape.opening === 'muted-base') plans.forEach((p, i) => { if (i) p.setup.push({ add: dest[i].id }, { mute: dest[i].id }); });
  if (shape.opening === 'mid-set') plans.forEach((p, i) => { if (i) p.setup.push({ add: dest[i].id }); if (i < 2) p.setup.push({ solo: dest[i].id }); });
}
// what the coder's path takes from the shape: the drums whole early with a medium or fast pace, masks, a passing
// melody, the moves
function coderShape(dest, shape) {
  return {
    opening: shape.opening, development: shape.development, moves: true,
    kickEarly: shape.pace !== 'slow',
    early: shape.pace === 'fast' ? 'all' : null,
    masks: shape.development === 'masks',
    passing: !['parameters'].includes(shape.development) && !['muted-base', 'mid-set'].includes(shape.opening),
  };
}
// second section (D4): the first half of the tracks grows, then the others are written with "S$:" and grow alone
// while the first part is silent, then the marks go and everything plays
function sectionPath(dest, plans, prng, rules, shape) {
  const cut = Math.max(1, Math.ceil(dest.length / 2)), A = dest.slice(0, cut), B = dest.slice(cut);
  const o = { detours: rules.detours, chooser: rules.chooser };
  const a = coderPath(A, plans.slice(0, cut), prng.fork('coder'), { ...o, shape: coderShape(A, shape) });
  if (!B.length) return a;
  // (the second section grows by its patterns; its colour comes with the step that settles each track, so the solo
  // part stays short)
  const b = coderPath(B, plans.slice(cut).map(p => ({ ...p, colour: [] })), prng.fork('coder-b'), { ...o, detours: [1, 0, 0, 0], shape: { ...coderShape(B, shape), passing: false, kickEarly: false, opening: null, moves: false } });
  const seen = new Set();
  const pb = b.path.map(u => {
    const id = u.kind === 'enter' ? (u.step.add ?? (u.step.clone && u.step.clone.track) ?? u.step.unmute) : undefined;
    if (id === undefined || Array.isArray(id) || seen.has(id)) return u;
    seen.add(id);
    return { ...u, second: true, step: { ...u.step, solo: id } };
  });
  const ids = B.map(t => t.id);
  return { path: [...a.path, ...pb, { kind: 'unsolo', track: B[0].id, type: B[0].type, step: { unsolo: ids.length === 1 ? ids[0] : ids }, waypoint: a.waypoints + b.waypoints + 1 }], waypoints: a.waypoints + b.waypoints + 1 };
}
// metamorphosis (D7): the song as written in one to three steps (the anchor, then the others), the waypoint of skin 1
function revealPath(dest, plans) {
  const path = [];
  const tr = (t, i) => (plans[i].setup.some(s => s.mute === t.id) ? 'unmute' : plans[i].setup.some(s => s.add === t.id) ? null : 'add');
  const alone = dest.filter((t, i) => plans[i].setup.some(s => s.solo === t.id));
  path.push({ kind: 'enter', track: dest[0].id, type: dest[0].type, step: { add: dest[0].id } });
  const rest = dest.slice(1).map((t, i) => [t, tr(t, i + 1)]).filter(([, k]) => k), half = Math.ceil(rest.length / 2);
  for (const g of rest.length > 2 ? [rest.slice(0, half), rest.slice(half)] : [rest]) {
    if (!g.length) continue;
    const ids = g.map(([t]) => t.id), k = g[0][1];
    path.push({ kind: 'enter', track: ids[0], type: g[0][0].type, step: { [k]: ids.length === 1 ? ids[0] : ids } });
  }
  alone.slice().reverse().forEach(t => path.push({ kind: 'unsolo', track: t.id, type: t.type, step: { unsolo: t.id } }));
  path[path.length - 1] = { ...path[path.length - 1], waypoint: 1 };
  return { path, waypoints: 2 };
}
// the second skin: a new tempo (within 12 BPM, or half or double time), a key a fifth away, the parts of another
// style of the same family composed by the material generator in the new key
const keySemi = k => { const x = KEYS.find(y => y[0] === k); return x ? x[1] : 0; };
const keyAt = semi => { const x = KEYS.find(y => ((y[1] - semi) % 12 + 12) % 12 === 0); return x ? x[0] : null; };
function makeSkin(song, R, dest, shape, srng, styles) {
  const ids = ((song.tags && song.tags.styles) || []).map(String), recipe = ids.map(id => styles[id]).find(Boolean);
  const sibs = recipe ? Object.values(styles).filter(r => r && r.id !== recipe.id && r.family === recipe.family).sort((a, b) => a.id.localeCompare(b.id)) : [];
  if (!sibs.length) return null;
  const style = srng.pick(sibs), r = srng.fork('skin');
  const bpm = R.bpm / 2 >= 70 && r.chance(0.2) ? Math.round(R.bpm / 2) : R.bpm * 2 <= 180 && r.chance(0.1) ? R.bpm * 2 : Math.max(60, Math.min(200, R.bpm + (r.chance(0.5) ? 1 : -1) * r.int(4, 12)));
  const up = keyAt(keySemi(R.key) + 7), down = keyAt(keySemi(R.key) - 7), key = up && down ? (r.chance(0.5) ? up : down) : up || down || R.key;
  const shift = keySemi(key) - keySemi(R.key);
  const kickId = (dest.find(t => t.type === 'drums' && Object.values(t.patterns || {}).every(p => !p.rows || Object.keys(p.rows).every(x => x === 'bd'))) || {}).id;
  const patterns = {};
  for (const t of dest) {
    const kind = KIND_OF_TYPE[t.type];
    if (!kind) continue;
    const part = style[t.type] || {}, harmony = { key, mode: (t.settings && t.settings.mode) || 'minor', chords: R.chords };
    const out = compose(kind, { seed: `${song.id}:skin:${t.id}`, style: part.material || {}, harmony, meter: R.meter, energy: 0.6, type: t.type });
    if (!out || !out.idea) continue;
    let idea = out.idea;
    if (t.type === 'drums' && idea.beat) { const { grid, bd, ...rest } = idea.beat; idea = { ...idea, beat: kickId === t.id ? { grid, bd: bd || '0,4,8,12' } : kickId ? { grid, ...rest } : idea.beat }; }
    const own = (t.patterns || {})[(t.clips[0] || {}).pattern] || {};
    patterns[t.id] = { ...(own.speed ? { speed: own.speed } : {}), idea };
  }
  return Object.keys(patterns).length ? { bpm, key, shift, ratio: bpm / R.bpm, style: style.id, patterns } : null;
}
// a written section in the second skin: its tempo scaled like the reference section's, its key moved the same way
function skinSection(x, skin, R) {
  const o = { ...x }, b = x.bpm ?? R.bpm;
  o.bpm = Math.round(b * skin.ratio);
  if (x.bpmEnd) o.bpmEnd = Math.round(x.bpmEnd * skin.ratio);
  o.key = keyAt(keySemi(x.key ?? R.key) + skin.shift) || skin.key;
  return o;
}
// Bursts of edits (owner, 2026-10-18): the human typing of the Live coder types each step between the step before
// (half a bar after it) and the step, after a listening pause of up to 2 s; when time is short it drops its pauses and
// mistakes, then it speeds up. Each gap is made long enough for the leanest typing of its edit (measured on the
// growing code, the bus and visual functions left out), within the growth budget (with the free duration there is no
// budget: the growth gets longer); a section boundary in the growth (the progression, the second skin) is edited in
// place like any step (live-coder in-place edits). The typed opening's lead-in is the time the first line takes (1 to
// 4 bars).
const shownLike = code => code.split('\n').filter(l => !/^(const |setcpm)/.test(l) && !(/^\s*\/\//.test(l) && !l.startsWith('// =')))
  .map(l => l.replace(/\.mask\((section\d+|clip\d+)\)\.velocity\(\1\)/g, '').replace(/\.orbit\(\d+\)/g, '').replace(/\.analyze\("[^"]*"\)/g, '')).join('\n');
// what is heard in a code: its pattern lines, without the muted ones, only the solo ones while there are some
function heard(code) {
  const layers = [];
  let cur = null;
  for (const l of code.split('\n')) {
    if (/^[_S]?\$:/.test(l)) { cur = { solo: l[0] === 'S', muted: l[0] === '_', text: l.replace(/\s*\/\/.*$/, '') }; layers.push(cur); continue; }
    if (cur && /^\s+\S/.test(l) && !/^\s*\/\//.test(l)) { cur.text += l.trim().replace(/\s*\/\/.*$/, ''); continue; }
    cur = null;
  }
  const solo = layers.some(x => x.solo && !x.muted);
  return layers.filter(x => !x.muted && (!solo || x.solo)).map(x => x.text.replace(/^[_S]?\$:\s*/, '')).join('\n');
}
function relaxGaps({ song, dest, plans, seq, gaps, R, hold, secBar, cap, shape, clipR, paceBars, paced, free = false }) {
  const first = { tracks: dest.map((t, i) => { const c = clipR(t); return { ...clone(t), clips: [{ start: 0, bars: 1, pattern: c.pattern, ...(c.set ? { set: clone(c.set) } : {}) }], patterns: { ...clone(t.patterns || {}), ...clone(plans[i].patterns) }, mute: true }; }) };
  for (const p of plans) for (const st of p.setup) applyStep(first, st);
  const sec = { name: 'Crescendo', bars: 1, bpm: R.bpm, key: R.key, chords: R.chords, meter: R.meter };
  // the code as the Live coder profile shows it: essential comments, idiomatic forms, technical functions folded
  const o = functionOptions({ fnBus: true, fnLevel: true, fnCrunch: true, fnVoice: true, fnSong: true, fnLib: true });
  let ref = '';
  try { ref = compileSong(song); } catch (e) { ref = ''; }
  const wctx = { written: levelsOf(ref), buses: busesOf(ref), fns: ref ? functionContext(ref, { id: song.id, title: song.title, tags: song.tags, profile: song.profile }, o) : null };
  const show = code => { try { return writeCode(applyComments(idiomatic(code), { title: false, tracks: true, notes: false, steps: false }), { mode: o, ...wctx }).code; } catch (e) { return code; } };
  const codeOf = (st, harm) => { try { return shownLike(show(compileSong({ title: song.title || '', sections: [{ ...sec, chords: hold && !harm ? 'drone' : R.chords }], tracks: st.tracks, shared: song.shared }))); } catch (e) { return ''; } };
  // the state before unit k (and whether the progression has come in)
  const before = k => { const st = clone(first); let harm = false; for (let i = 0; i < k; i++) { if (seq[i].harmony) harm = true; if (!seq[i].skin) applyStep(st, seq[i].step); } return { st, harm }; };
  // codes[k]: the code before unit k; codes[k + 1]: after it
  const codes = [];
  const fill = (from, to) => { const b = before(from), st = b.st; let harm = b.harm; codes[from] = codeOf(st, harm); for (let i = from; i < to && i < seq.length; i++) { if (seq[i].harmony) harm = true; if (!seq[i].skin) applyStep(st, seq[i].step); codes[i + 1] = seq[i].skin ? codes[i] : codeOf(st, harm); } };
  fill(0, seq.length);
  const lean = (a, b) => typingPlan(a, b, { style: 'human', lean: true, seed: song.id || '' }).total;
  // seconds a gap of g bars leaves for typing, as the app plans it (makeTyping in main.js)
  const usable = g => { const avail = Math.max(0.2, (g - 0.5) * secBar - 0.2); return avail - Math.min(avail * 0.5, 2); };
  // a fast pace prefers small moves in the first minute (design, Risks): a unit too long to type in its slot trades
  // places with a later unit of the same passage, of another track, that fits (each track keeps the order of its moves)
  if (shape.pace === 'fast') {
    let bars = gaps[0];
    for (let i = 1; i < seq.length && bars * secBar < 60; i++) {
      bars += gaps[i];
      const u = seq[i];
      if (u.kind === 'enter' && i <= 1) continue;
      if (lean(codes[i], codes[i + 1]) <= usable(gaps[i])) continue;
      for (let j = i + 1; j < seq.length && !seq[j - 1].waypoint; j++) {
        const v = seq[j];
        if (v.waypoint || v.skin || v.harmony || v.kind === 'enter' || v.passing || seq.slice(i, j).some(x => x.track === v.track || x.harmony)) continue;
        const b = before(i);
        if (!v.skin) applyStep(b.st, v.step);
        if (lean(codes[i], codeOf(b.st, b.harm)) > usable(gaps[i])) continue;
        seq.splice(j, 1); seq.splice(i, 0, v);
        fill(i, j + 1);
        break;
      }
    }
  }
  // a unit that changes nothing heard (a level equal to the next, a function shown at a neutral value) shares the bar
  // of the step before: no listening slot is spent on it, its edit is typed with that step
  for (let i = 1; i < seq.length; i++) if (!seq[i].skin && !seq[i].waypoint && !MARKS.includes(seq[i].kind) && heard(codes[i]) === heard(codes[i + 1])) gaps[i] = 0;
  // the first minute keeps its pace once silent units have joined the bars before them
  if (shape.pace !== 'slow') { let t = 0; for (let i = 1; i < seq.length && t * secBar < 60; i++) { if (!gaps[i]) continue; gaps[i] = paceBars(); paced[i] = true; t += gaps[i]; } }
  // the edit of a bar: from the code before its first unit to the code after its last
  const endOf = i => { let j = i; while (j + 1 < seq.length && gaps[j + 1] === 0) j++; return j; };
  const need = i => lean(codes[i], codes[endOf(i) + 1]);
  // the typed opening: silent while the first line is typed
  if (shape.opening === 'typed') { const t1 = lean('', codes[1]); let L = 1; while (usable(L + 0.5) < t1 && L < 4) L++; gaps[0] = L; }
  // (a section boundary is edited in place too: no prepared copies, no extra bars)
  const extraOf = () => 0;
  // (with a margin: the code shown wraps its lines and folds some functions differently from this estimate)
  const want = i => need(i) * (paced[i] ? 1 : 1.2) + (paced[i] ? 0.2 : 0.5);
  // the shortest gap that leaves time to type the edit (and the two bars of a boundary)
  const minGap = (i, w) => { let g = 1; while (usable(g) < w && g < 64) g++; return g + extraOf(i); };
  const mins = [], refresh = i => { mins[i] = i && gaps[i] ? minGap(i, want(i)) : 0; };
  seq.forEach((_, i) => refresh(i));
  // the budget of the growth: the squeeze leaves at most cap - 4 bars of gaps (room for the tail and the ending); past
  // it, bars come from gaps with time to spare (a long listening pause keeps at least two bars), never from the first
  // minute of a medium or fast pace; when none is left, a small edit joins the step before it on the same track (two
  // edits of the same line typed together) and its bars go to the steps that need them
  let room = cap - 4 - gaps.reduce((a, b) => a + b, 0), relaxed = 0;
  const after = j => seq[j - 1] && (['enter', 'back'].includes(seq[j - 1].kind) || seq[j - 1].harmony || seq[j - 1].waypoint);
  const slack = j => (j > 0 && gaps[j] && !paced[j] ? gaps[j] - Math.max(mins[j], after(j) ? 2 : 1) : 0);
  const startOf = j => { let k = j - 1; while (k > 0 && !gaps[k]) k--; return k; };
  const joinable = j => j > 1 && gaps[j] && !paced[j] && !seq[j].waypoint && !seq[j].harmony && !seq[j].skin && !seq[j].skinStart && !MARKS.includes(seq[j].kind) && !seq[j].passing && seq[j - 1].track === seq[j].track && startOf(j) > 0;
  for (let round = 0; round < seq.length; round++) {
    let short = false;
    // a section boundary first (its new lines are typed two bars before it), then the steps in the order of the growth
    const order = seq.map((_, i) => i).filter(i => i > 0).sort((a, b) => (extraOf(b) ? 1 : 0) - (extraOf(a) ? 1 : 0) || a - b);
    for (const i of order) {
      while (gaps[i] && gaps[i] < mins[i]) {
        if (room > 0) { room--; gaps[i]++; relaxed++; continue; }
        let j = -1;
        for (let k = 1; k < seq.length; k++) if (k !== i && slack(k) > 0 && (j < 0 || slack(k) > slack(j))) j = k;
        if (j < 0) { short = true; break; }
        gaps[j]--; gaps[i]++; relaxed++;
      }
    }
    if (!short) break;
    // join the smallest edit that can go with the step before it
    let m = -1;
    for (let j = 2; j < seq.length; j++) if (joinable(j) && (m < 0 || mins[j] < mins[m])) m = j;
    if (m < 0) break;
    const k = startOf(m);
    room += gaps[m]; gaps[m] = 0; mins[m] = 0;
    refresh(k);
  }
  // the free duration: past the budget and the joins, a step still short gets the bars it needs (the growth gets longer)
  if (free) seq.forEach((_, i) => { while (i && gaps[i] && gaps[i] < mins[i]) { gaps[i]++; relaxed++; } });
  // the bars past the budget (the free duration waits for the typing)
  const waited = free ? Math.max(0, gaps.reduce((a, b) => a + b, 0) - (cap - 4)) : 0;
  return { waited, relaxed, short: seq.some((_, i) => i && gaps[i] && gaps[i] < mins[i]) };
}

// ---------- the song ----------
const gapOf = (rng, narrated) => (narrated ? rng.weighted([1, 2], [2, 1]) : rng.weighted([1, 2, 3, 4], [1, 3, 2, 2]));
const KEY_STEPS = ['enter', 'break', 'back', 'harmony', 'strip-first', 'last'];

// song + options → the song with a growth span, generated patterns and "build". The seed defaults to the song id.
// Songs with nothing to grow come back without steps.
// rules: {} (Crescendo) or { natural: true, trials } (natural-growth: hidden functions, sparse steps, listening pauses)
export function crescendoSong(song, opts = {}) {
  const rules = opts.rules || {};
  if (!(rules.coder && rules.shape)) return growSong(song, opts);
  // growth-shapes: a shape the song or the user did not name is tried as drawn; when the Live coder typing would rush
  // a step, the next candidate by weight is tried (by type last), and the first without rushed steps is kept (else
  // the one rushed least in all)
  const styles = rules.styles || {}, shape = resolveShape(song, { user: rules.shape, styles, seed: opts.seed, weights: rules.shapeWeights, deny: rules.deny });
  // a development and a pace named by the song or the user stay as they are
  if (['development', 'pace'].every(p => ['song', 'user'].includes(shape.from[p]))) return growSong(song, opts);
  let best = null;
  // (then the same candidates with less detail: fewer, smaller moves fit the length of the growth)
  const cands = shapeCandidates(song, shape, styles, rules), tries = [...cands, ...[2, 1, 0].flatMap(maxDetail => cands.map(c => ({ ...c, drawn: false, maxDetail })))];
  // (the typing is measured on the code with the track names, as the Live coder showed it before radio-profiles 9.2: its
  // default comments are display only, so they never change the growth; the code with them is the longer one to type)
  const C = resolveProfile('switch', { duration: rules.free ? 'free' : 'fitted', tracks: true });
  for (const c of tries) {
    const r = { ...rules, ...(c.maxDetail !== undefined ? { maxDetail: c.maxDetail } : {}), shape: { opening: shape.opening, pace: c.pace, development: c.development } };
    let out = growSong(song, { ...opts, rules: r });
    if (c.maxDetail !== undefined && out.crescendo && out.crescendo.detail > c.maxDetail) continue;
    if (!out.crescendo || !out.crescendo.shape) return out;
    let L = liveCode(out, C, { cols: () => 80 });
    // free duration (owner, 2026-10-19): a step the human typing cannot reach at a person's pace waits for it: the bars
    // it needs are added before it and the growth is made again (never a forced paste)
    if (rules.free) {
      const extra = {};
      for (let round = 0; round < 6; round++) {
        const sb = barSeconds(out), units = out.crescendo.units || [];
        const late = typingLoad(L, { seed: song.id || '', to: out.crescendo.grown }).filter(x => x.ratio > 1);
        let added = false;
        for (const x of late) {
          const i = units.indexOf(x.at);
          if (i < 0) continue;
          const usable = g => { const a = Math.max(0.2, g - 0.5 * sb - 0.2); return a - Math.min(a * 0.5, 2); };
          let n = 1; while (usable(x.gap + n * sb) < x.need && n < 32) n++;
          extra[i] = (extra[i] || 0) + n; added = true;
        }
        if (!added) break;
        out = growSong(song, { ...opts, rules: { ...r, extraGaps: { ...extra } } });
        L = liveCode(out, C, { cols: () => 80 });
      }
    }
    const n = rushedSteps(L, song.id || '');
    out.crescendo.shape = { ...out.crescendo.shape, from: shape.from, rushed: n, ...(c.drawn ? {} : { fallback: true }) };
    if (!n) return out;
    const load = rushLoad(L, song.id || '');
    if (!best || load < best.load) best = { out, load };
  }
  return best.out;
}
// the shapes to try, in order: the drawn one, then the developments by weight (by type last), then by type with the
// other paces; parts the song or the user named stay
// (on air, radio-profiles: the artist's weights order the candidates of a part they chose; denied values are never tried)
function shapeCandidates(song, shape, styles, rules = {}) {
  const f = shapeFacts(song, styles), fixed = p => ['song', 'user'].includes(shape.from[p]);
  const denied = (part, v) => !!(rules.deny && (rules.deny[part] || []).includes(v));
  const order = (part, list) => {
    const aw = shape.from[part] === 'artist' && rules.shapeWeights && rules.shapeWeights[RECIPE_KEYS[part]];
    const w = aw ? { ...DEFAULT_WEIGHTS[part], ...aw } : shape.from[part] === 'style' && f.recipe && f.recipe.growthShapes && f.recipe.growthShapes[RECIPE_KEYS[part]] ? { ...DEFAULT_WEIGHTS[part], ...f.recipe.growthShapes[RECIPE_KEYS[part]] } : DEFAULT_WEIGHTS[part];
    const rest = list.filter(v => v !== shape[part] && canPlay(part, v, f) && !denied(part, v)).sort((a, b) => (part === 'development' ? (a === 'by-type') - (b === 'by-type') : 0) || (w[b] || 0) - (w[a] || 0) || list.indexOf(a) - list.indexOf(b));
    return [shape[part], ...rest];
  };
  const devs = fixed('development') ? [shape.development] : order('development', DEVELOPMENTS);
  const paces = fixed('pace') ? [shape.pace] : order('pace', PACES);
  const out = devs.map((development, i) => ({ development, pace: shape.pace, drawn: i === 0 }));
  for (const pace of paces.slice(1)) out.push({ development: fixed('development') ? shape.development : 'by-type', pace });
  return out;
}
function growSong(song, { seed, narrated = false, rules = {} } = {}) {
  const rng = stream(String(seed ?? song.id ?? 'song'), STREAM);
  const n = normalizeSong(song), W = n.total, secs = n.sections;
  // a song shorter than 24 bars has no room for slow growth: it grows with the Crescendo rules
  // (the on-air limits stay, radio-profiles: the bars the growth takes, no ending)
  if (rules.natural && W < 24) rules = Object.fromEntries(['budget', 'span', 'noEnding'].filter(k => k in rules).map(k => [k, rules[k]]));
  // growth shape (growth-shapes): only the natural growth like a live coder follows one; Classic and Crescendo never
  const shape = rules.coder && rules.shape ? resolveShape(song, { user: rules.shape, styles: rules.styles || {}, seed, weights: rules.shapeWeights, deny: rules.deny }) : null;
  const srng = shape ? stream(String(seed ?? song.id ?? 'song'), `shape-${SHAPES_VERSION}/growth`) : null;
  const over = (c, s) => c.start < s.start + s.bars && c.start + c.bars > s.start;
  const plays = n.tracks.filter(t => !t.mute && t.type !== 'voice' && t.type !== 'spoken' && t.clips.length);
  if (!plays.length || !W) return { ...clone(song), build: [] };
  // voice-instrument: spoken tracks are not part of the growth's destination; each one enters where it first speaks,
  // except the one the voice opening puts first (its opening line is the first sound of the build)
  const voiceOpen = shape && shape.opening === 'voice' ? openingLine(n) : null;
  const spokenLate = n.tracks.filter(t => !t.mute && t.type === 'spoken' && t.clips.length && !(voiceOpen && voiceOpen.track === t));
  const placed = spokenLate.length || voiceOpen ? placeSpoken(song) : [];
  const firstLine = t => { const b = placed.filter(p => p.track === t.id).flatMap(p => p.starts.map(x => x.bar)); return b.length ? Math.min(...b) : t.clips[0].start; };
  // reference section: the first one where the most tracks play; its tracks are the destination of the growth
  const counts = secs.map(s => plays.filter(t => t.clips.some(c => over(c, s))).length);
  const R = secs[counts.indexOf(Math.max(...counts))];
  // ideas grow and thin on the bars of the reference section, with the song's shared progressions
  const ictx = { N: meterSteps(R.meter), shared: song.shared || {} };
  const dest = plays.filter(t => t.clips.some(c => over(c, R))), late = [...plays.filter(t => !dest.includes(t)), ...spokenLate];
  const rank = t => { const i = ORDER.indexOf(t.type); return i < 0 ? ORDER.length : i; };
  dest.sort((a, b) => rank(a) - rank(b) || plays.indexOf(a) - plays.indexOf(b));
  // a little variety in who comes in after the anchor
  if (!shape) { for (let i = 1; i < dest.length - 1; i++) if (rng.chance(0.3)) [dest[i], dest[i + 1]] = [dest[i + 1], dest[i]]; }
  else orderByShape(dest, shape, srng, rank, plays);
  if (voiceOpen) dest.unshift(voiceOpen.track);
  const meta = !!shape && shape.development === 'metamorphosis';
  const clipR = t => (voiceOpen && t === voiceOpen.track ? voiceOpen.clip : t.clips.find(c => over(c, R)));
  const clipKeys = t => new Set(t.clips.flatMap(c => Object.keys(c.set || {})));
  // growth budget: up to twice the written length for short songs, one and a half otherwise (room for the ending)
  // (natural growth is slower: at most the written length, so a song does not double)
  // (like a live coder, free duration: as long as the moves need, within twice the written length)
  // (on air, radio-profiles D6: rules.budget, the bars the growth may take in the planned length)
  const cap = rules.budget ?? (rules.coder && rules.free ? 2 * W - 4 : rules.natural ? (W < 48 ? Math.round(1.5 * W) : W) : W <= 20 ? 2 * W : Math.round(1.5 * W));
  // detail: the most that fits within three times the written length, with room between the steps
  let d = 3, plans, path, coder = null, skin = null, hold = false, harmonyAt = -1, seq = [], gaps = [], paced = [], typing = null;
  // growth-shapes: the rules of each track (the drums' core from the opening, the kick first with a medium or fast
  // pace, the filtered opening, one value that slides) and the shape the coder's path follows
  const sx = shape ? shapeExtras(dest, shape, srng) : null;
  // (a fast pace: the anchor turns its knobs in more, smaller moves, so the first minute is made of small edits)
  const trackRules = (t, i) => (!shape ? rules : { ...rules, drum: t.type === 'drums' ? { core: i === 0 ? CORE[shape.opening] || 'one' : 'one', kickFirst: shape.pace !== 'slow', broken: sx.broken } : undefined, filtered: i === 0 && shape.opening === 'filtered' && t.type === 'drums' && !clipKeys(t).has('cutoff'), slide: t.id === sx.slide, small: i === 0 && shape.pace === 'fast', ref: (clipR(t) || {}).pattern });
  const secBar = (meterSteps(R.meter) / 4) * 60 / R.bpm;
  // one try at a level of detail (from `top` down): plans, path, steps and their gaps; a shaped growth whose typing does
  // not fit its budget tries again with less detail (growth-shapes, bursts of edits)
  const attempt = top => {
  for (d = top; d >= 0; d--) {
    const prng = rng.fork(`plan-${d}`);
    plans = dest.map((t, i) => (meta ? { id: t.id, type: t.type, setup: [], fullness: [], colour: [], patterns: {} } : trackPlan(t, d, prng, clipKeys(t), trackRules(t, i), ictx)));
    if (shape) openingSetup(dest, plans, shape);
    // like a live coder (live-coder-growth): waypoints and small moves between them
    if (meta) { coder = revealPath(dest, plans); path = coder.path; }
    else if (shape && shape.development === 'second-section') { coder = sectionPath(dest, plans, prng, rules, shape); path = coder.path; }
    else if (rules.coder) { coder = coderPath(dest, plans, prng.fork('coder'), { detours: rules.detours, chooser: rules.chooser, shape: shape ? coderShape(dest, shape) : null }); path = coder.path; }
    else path = crescendoPath(plans, prng.fork('path'));
    if (meta || path.length * (rules.natural ? 3 : 1.5) + 4 <= cap || d === 0) break;
  }
  // metamorphosis (D7): after the reveal, a second skin: tempo and key from a phrase boundary, then each line rewritten
  // with the parts of another style of the same family, one per step
  skin = meta ? makeSkin(song, R, dest, shape, srng, rules.styles || {}) : null;
  if (skin) dest.filter(t => skin.patterns[t.id]).forEach((t, i) => path.push({ kind: 'rewrite', skin: true, ...(i === 0 ? { skinStart: true } : {}), track: t.id, type: t.type, step: { pattern: { track: t.id, to: SKIN } } }));
  if (skin && path.length) path[path.length - 1] = { ...path[path.length - 1], waypoint: 2 };

  // harmony: the first tracks play over one held chord, one step brings in the progression
  // (only when the progression starts on its tonic: the "drone" progression is that chord)
  hold = !meta && R.chords !== 'drone' && PROGS[R.chords] && PROGS[R.chords][1][0] === 'Am' && path.length >= 6;
  harmonyAt = hold ? Math.max(2, Math.round(path.length * rng.range(0.35, 0.55))) : -1;
  if (hold) path[harmonyAt] = { ...path[harmonyAt], harmony: true };
  // breaks: the drums (or the anchor) stop for a few bars and come back, once or twice
  const brk = dest.find(t => t.type === 'drums');
  const breaks = [];
  if (brk && dest.length >= 2 && path.length >= 12 && !rules.coder) {
    const k = path.length >= 24 && rng.chance(0.5) ? 2 : 1;
    for (let b = 0; b < k; b++) breaks.push(Math.round(path.length * (k === 1 ? rng.range(0.55, 0.8) : b ? rng.range(0.75, 0.88) : rng.range(0.45, 0.6))));
  }
  seq = [];
  path.forEach((u, i) => {
    seq.push(u);
    if (breaks.includes(i) && i > path.findIndex(x => x.kind === 'enter' && x.track === brk.id) + 1) {
      seq.push({ kind: 'break', track: brk.id, type: brk.type, step: { remove: brk.id }, gap: rng.int(2, 4) });
      seq.push({ kind: 'back', track: brk.id, type: brk.type, step: { add: brk.id } });
    }
  });
  // bars: one step every 1 to 4 bars (1 to 2 fully narrated), squeezed when the song would get too long
  // natural growth: 4 to 8 bars apart in the first part, 2 to 6 later, and a listening pause of 4 to 8 bars after a
  // track comes in, the progression arrives or the drums come back
  // (like a live coder: a pause at each waypoint too)
  const natGap = i => (i < seq.length * 0.4 ? rng.int(4, 8) : rng.int(2, 6)) + (['enter', 'back'].includes(seq[i - 1].kind) || seq[i - 1].harmony || seq[i - 1].waypoint ? rng.int(4, 8) : 0);
  // growth-shapes (D3): a medium or fast pace counts seconds over the first minute, then bars
  let sumBars = 0;
  // (never under 7.6 s fast or 10 s medium, so the first minute holds at most 8 or 6 steps)
  const paceBars = () => { const lo = shape.pace === 'fast' ? 7.6 : 10, g = Math.max(1, Math.round((shape.pace === 'fast' ? srng.range(lo, 9) : srng.range(lo, 15)) / secBar)); return g * secBar < lo ? g + 1 : g; };
  const paceGap = i => {
    const pause = ['enter', 'back'].includes(seq[i - 1].kind) || seq[i - 1].harmony || seq[i - 1].waypoint;
    if (sumBars * secBar < 60) return paceBars();
    return shape.pace === 'fast' ? srng.int(2, 4) + (pause ? srng.int(0, 2) : 0) : srng.int(2, 6) + (pause ? srng.int(2, 4) : 0);
  };
  // (the steps of the first minute keep their paced gaps when the growth is squeezed)
  paced = [];
  gaps = seq.map((u, i) => { paced.push(!!shape && shape.pace !== 'slow' && sumBars * secBar < 60); const g = i === 0 ? 0 : seq[i - 1].gap || (shape && shape.pace !== 'slow' ? paceGap(i) : rules.natural && !narrated ? natGap(i) : gapOf(rng, narrated)); sumBars += g; return g; });
  // (a shaped growth may put several units on one bar to stay within its budget)
  const room = shape ? cap - 4 : Math.max(seq.length, cap - 4);
  // squeezed from the largest gaps; natural growth keeps its listening pauses (at least 4 bars) as long as it can
  const pause = seq.map((u, i) => rules.natural && i > 0 && (['enter', 'back'].includes(seq[i - 1].kind) || seq[i - 1].harmony || seq[i - 1].waypoint));
  const squeeze = () => {
    for (let sum = gaps.reduce((a, b) => a + b, 0); sum > room;) {
      let i = -1;
      for (let k = 1; k < gaps.length; k++) if (!paced[k] && gaps[k] > (pause[k] ? 4 : 1) && (i < 0 || gaps[k] - (pause[k] ? 4 : 0) > gaps[i] - (pause[i] ? 4 : 0))) i = k;
      // a paced growth: units after the first minute share bars before a paced gap shrinks
      if (i < 0 && shape) for (let k = 1; k < gaps.length; k++) if (!paced[k] && gaps[k] > 0 && !MARKS.includes(seq[k].kind) && (i < 0 || gaps[k] > gaps[i])) i = k;
      if (i < 0) { i = gaps.indexOf(Math.max(...gaps)); if (gaps[i] <= 1) break; }
      gaps[i]--; sum--;
    }
  };
  squeeze();
  // growth-shapes: no rushed typing (bursts of edits): a step comes as late as a person needs to type it, and the
  // typed opening adds the bars that the first line takes; the metamorphosis changes skin on a phrase boundary
  // (the free duration of a Live coder growth keeps the bars the typing needs: the growth gets longer)
  const free = !!(rules.coder && rules.free);
  typing = shape ? relaxGaps({ song, dest, plans, seq, gaps, R, hold, secBar, cap, shape, clipR, paceBars, paced, free }) : null;
  if (typing && !free) squeeze();
  };
  attempt(Math.min(3, rules.maxDetail ?? 3));
  // bars added before some units, where the typing in the app still needed more time (crescendoSong, free duration)
  for (const [i, n] of Object.entries(rules.extraGaps || {})) if (+i >= 0 && +i < gaps.length) gaps[+i] += n;
  if (skin) { let at = 0; seq.forEach((u, i) => { at += gaps[i]; if (u.skinStart) { const to = Math.max(8, Math.ceil(at / 8) * 8); gaps[i] += to - at; at = to; } }); }
  // the voice opening: the next step comes once the opening line has been said (its length, a beat to spare)
  if (voiceOpen && gaps.length > 1) {
    const p = placed.find(x => x.track === voiceOpen.track.id && x.key === voiceOpen.clip.pattern), bpb = meterSteps(R.meter) / 4;
    gaps[1] = Math.max(gaps[1], Math.ceil(((p ? p.beats : bpb) + 1) / bpb));
  }
  let bar = 0;
  let growth = seq.map((u, i) => ({ ...u, at: (bar += gaps[i]) }));
  // the voice opening: the line is said just before the next track comes in (it ends a beat or more before it); the
  // bars before it are the time the next line takes to type
  let voiceAt = 0;
  const voiceBar = () => {
    if (!voiceOpen) return;
    const next = growth.find((u, i) => i > 0 && u.kind === 'enter'), p = placed.find(x => x.track === voiceOpen.track.id && x.key === voiceOpen.clip.pattern), bpb = meterSteps(R.meter) / 4;
    if (next && p) voiceAt = Math.max(0, next.at - Math.ceil((p.beats + 1) / bpb));
  };
  voiceBar();
  let lastAt = growth[growth.length - 1].at;
  const tail = gapOf(rng, narrated);
  let G = lastAt + tail;
  if (Math.ceil(G / 4) * 4 <= cap) G = Math.ceil(G / 4) * 4;
  // on air (radio-profiles D6): rules.span, the bars the growth fills when it needs fewer: the bars left go to the gaps
  // after the first minute, one at a time from the last, so the song keeps its planned length
  if (rules.span && G < rules.span) {
    const idx = gaps.map((g, i) => i).filter(i => i > 0 && !paced[i]).reverse(), all = idx.length ? idx : gaps.map((g, i) => i).filter(i => i > 0).reverse();
    if (all.length) { for (let k = 0; k < rules.span - G; k++) gaps[all[k % all.length]]++; bar = 0; growth = seq.map((u, i) => ({ ...u, at: (bar += gaps[i]) })); voiceBar(); lastAt = growth[growth.length - 1].at; }
    G = Math.max(rules.span, lastAt + 1);
  }
  const harmonyBar = hold ? growth.find(u => u.harmony).at : 0;
  const skinBar = skin ? growth.find(u => u.skinStart).at : 0;
  // tracks that enter later in the song: minimal where their first clip starts, then they grow over the next steps,
  // with less detail (or none) when the song ends too soon. A bar holds the steps of one track only.
  const owner = new Map(growth.map(u => [u.at, u.track])), latePlans = [], lateSteps = [];
  for (const t of late) {
    for (let ld = Math.min(d, 1); ld >= -1; ld--) {
      const p = ld < 0 ? { id: t.id, type: t.type, setup: [], fullness: [], colour: [], patterns: {} } : trackPlan(t, ld, rng.fork(`late-${t.id}-${ld}`), clipKeys(t), rules, ictx);
      const taken = new Map(), free = at => { while (owner.has(at) || taken.has(at)) at++; taken.set(at, t.id); return at; };
      // a spoken track enters on the bar of its first line, or a free bar before it within its clip (never after it)
      const spokenAt = () => { const want = firstLine(t) + G, lo = t.clips[0].start + G; for (let b = want; b >= lo; b--) if (!owner.has(b) && !taken.has(b)) { taken.set(b, t.id); return b; } return free(want); };
      let at = t.type === 'spoken' ? spokenAt() : free(t.clips[0].start + G);
      const mine = [{ at, kind: 'enter', type: t.type, step: { add: t.id } }];
      for (const u of [...p.fullness, ...p.colour]) { at = free(at + rng.int(1, 3)); mine.push({ ...u, at, type: t.type }); }
      if (at < G + W - 1 || ld < 0) { latePlans.push(p); lateSteps.push(...mine); taken.forEach((v, k) => owner.set(k, v)); break; }
    }
  }

  // ---------- the new song ----------
  const out = clone(song);
  delete out.build;
  const base = { bpm: R.bpm, key: R.key, chords: R.chords, meter: R.meter };
  if (R.swing) base.swing = R.swing;
  const grow = hold
    ? [{ name: 'Crescendo', bars: harmonyBar, ...base, chords: 'drone' }, { name: 'Crescendo 2', bars: G - harmonyBar, ...base }]
    : skin ? [{ name: 'Crescendo', bars: skinBar, ...base }, { name: 'Crescendo 2', bars: G - skinBar, ...base, bpm: skin.bpm, key: skin.key }]
      : [{ name: 'Crescendo', bars: G, ...base }];
  out.sections = [...grow, ...(skin ? clone(song.sections).map(x => skinSection(x, skin, R)) : clone(song.sections))];
  // clips by bar: the written ones shifted after the growth span, the growth clip of every destination track
  out.tracks = out.tracks.map(tr => {
    const nt = n.tracks.find(x => x.id === tr.id);
    const clips = nt.clips.map(c => { const o = { start: c.start + G, bars: c.bars, pattern: c.pattern }; if (c.set) o.set = clone(c.set); return o; });
    const t = { ...tr, clips };
    if (dest.includes(nt)) { const c = clipR(nt), g = { start: 0, bars: G, pattern: c.pattern }; if (c.set) g.set = clone(c.set); t.clips = [g, ...clips]; }
    const plan = plans.find(p => p.id === tr.id) || latePlans.find(p => p.id === tr.id);
    if (plan) t.patterns = { ...(tr.patterns || {}), ...plan.patterns };
    // the voice opening: the opening line in the growth, just before the next entry, not bound to a later one (a copy of
    // its pattern)
    if (voiceOpen && voiceOpen.track === nt) { const k = `${voiceOpen.clip.pattern}~open`, { before, ...line } = (tr.patterns || {})[voiceOpen.clip.pattern] || {}; t.patterns = { ...(t.patterns || {}), [k]: line }; t.clips[0] = { ...t.clips[0], start: voiceAt, bars: G - voiceAt, pattern: k }; }
    // the second skin: the track plays its new part from the step that rewrites it to the end of the song
    if (skin && skin.patterns[tr.id]) { t.patterns = { ...(t.patterns || {}), [SKIN]: skin.patterns[tr.id] }; t.clips = t.clips.map(c => (c.start >= G ? { ...c, pattern: SKIN } : c)); }
    return t;
  });

  // ---------- steps ----------
  const build = [];
  // bar 0: every growing track gets its minimal state while silent, then the anchor comes in
  for (const p of [...plans, ...latePlans]) for (const s of p.setup) build.push({ at: 0, ...s });
  const recent = [], say = (u, first) => {
    const keyStep = KEY_STEPS.includes(u.kind) || u.harmony || first;
    if (!narrated && !keyStep && !rng.chance(0.3)) return undefined;
    return u.harmony ? phrase('harmony', u.type, null, recent, rng) : phrase(u.clone ? 'clone' : u.kind, u.type, u.device, recent, rng);
  };
  growth.forEach((u, i) => { const s = { at: u.at, ...u.step }, t = say(u, i === 0); if (t) s.say = t; build.push(s); });
  lateSteps.forEach(u => { const st = { at: u.at, ...u.step }, x = u.kind === 'enter' ? phrase('enter', u.type, null, recent, rng) : say(u, false); if (x) st.say = x; build.push(st); });
  const lastGrowth = Math.max(lastAt, ...lateSteps.map(u => u.at));
  // ---------- ending ----------
  const end = G + W, LS = out.sections[out.sections.length - 1], lsStart = end - LS.bars;
  const active = out.tracks.filter(t => !t.mute && t.type !== 'voice' && t.type !== 'spoken' && t.clips.some(c => c.start < end && c.start + c.bars > lsStart));
  const quiet = active.length <= 2 || /outro|coda|fine|end/i.test(LS.name || '');
  let ending = rng.weighted(ENDINGS, [2, 1.5, quiet ? 2 : 0.8]);
  const anchor = active.slice().sort((a, b) => rank(a) - rank(b))[0];
  const others = active.filter(t => t !== anchor).sort((a, b) => rank(b) - rank(a));
  const steps = [];
  if (ending === 'strip' && active.length) {
    others.forEach(t => steps.push({ remove: t.id }));
  } else if (ending === 'blocks' && active.length >= 2) {
    const half = Math.ceil(others.length / 2);
    [others.slice(0, half), others.slice(half)].filter(g => g.length).forEach(g => steps.push({ remove: g.length === 1 ? g[0].id : g.map(x => x.id) }));
  }
  // the anchor plays alone for the last bars, then the song ends
  const gapsE = steps.map(() => (ending === 'strip' ? rng.int(1, 2) : rng.int(2, 4)));
  const E = gapsE.reduce((a, b) => a + b, 0) + rng.int(1, 2);
  // (on air, radio-profiles: rules.noEnding, the director's song already ends as planned)
  if (!steps.length || G + W + E > 3 * W || lastGrowth >= end || rules.noEnding) ending = 'short';
  if (ending !== 'short') {
    out.sections.push({ name: ending === 'strip' ? 'Strip' : 'Stop', bars: E, bpm: LS.bpm ?? R.bpm, key: LS.key ?? R.key, chords: LS.chords ?? R.chords, meter: LS.meter ?? R.meter });
    for (const t of active) {
      const last = t.clips.filter(c => c.start < end).pop(), c = { start: end, bars: E, pattern: String(last.pattern).replace(/~\d+$/, '') };
      if (last.set) c.set = clone(last.set);
      t.clips.push(c);
    }
    let at = end - 1;
    steps.forEach((s, i) => {
      at += gapsE[i];
      const kind = i === steps.length - 1 ? 'last' : i === 0 ? 'strip-first' : 'strip';
      const x = narrated || kind !== 'strip' || rng.chance(0.4) ? phrase(kind === 'last' ? 'last' : 'strip', null, null, recent, rng) : null;
      build.push({ at, ...s, ...(x ? { say: x } : {}) });
    });
  }
  out.build = build.map((s, i) => ({ s, i })).sort((a, b) => a.s.at - b.s.at || a.i - b.i).map(x => x.s);
  out.buildStyle = 'crescendo';
  // facts for checks and the UI: where the growth ends and which ending was drawn
  out.crescendo = { version: CRESCENDO_VERSION, growth: G, sections: grow.length, grown: Math.max(lastGrowth, lastAt), ending, detail: d, written: W, narrated, natural: !!rules.natural, ...(coder ? { coder: true, waypoints: growth.filter(u => u.waypoint).map(u => u.at), detours: growth.filter(u => u.detour).length } : {}) };
  // the growth shape it followed (growth-shapes), the silent bars of a typed opening, the second skin
  // (the bar of each unit of the growth, for crescendoSong: not saved with the song)
  Object.defineProperty(out.crescendo, 'units', { value: growth.map(u => u.at), enumerable: false });
  if (shape) out.crescendo.shape = { version: SHAPES_VERSION, opening: shape.opening, pace: shape.pace, development: shape.development, from: shape.from, leadIn: gaps[0], ...(skin ? { skin: { bpm: skin.bpm, key: skin.key, style: skin.style, at: skinBar } } : {}), ...(typing ? { relaxed: typing.relaxed } : {}), ...(typing && (typing.waited || rules.extraGaps) ? { waited: typing.waited + Object.values(rules.extraGaps || {}).reduce((a, b) => a + b, 0) } : {}) };
  return out;
}

// The normal version of a song grown like a live coder (live-coder-growth): the waypoints of its natural growth come
// first, one section of `bars` each (the patterns and settings of that moment; functions not shown yet play at their
// neutral value), then the song as written. song.normal === 'waypoints' asks for it.
const NEUTRAL = { cutoff: 20000, reso: 0, drive: 0, grit: 0, room: 0, delay: 0 };
export function waypointSong(song, { seed, bars = 8 } = {}) {
  const c = crescendoSong(song, { seed, rules: { natural: true, coder: true, free: true } });
  if (!c.crescendo || !c.crescendo.coder) return song;
  const n = normalizeSong(song), base = n.sections[0], wps = c.crescendo.waypoints.slice(0, -1);
  const out = clone(song);
  delete out.normal;
  const secs = wps.map((_, i) => ({ name: `${i + 1}`, bars, bpm: base.bpm, key: base.key, chords: i < wps.length / 2 && base.chords !== 'drone' ? 'drone' : base.chords, meter: base.meter }));
  out.sections = [...secs, ...clone(song.sections)];
  const shift = wps.length * bars;
  out.tracks = out.tracks.map(tr => {
    const nt = n.tracks.find(x => x.id === tr.id), ct = c.tracks.find(x => x.id === tr.id);
    const clips = nt.clips.map(cl => { const o = { start: cl.start + shift, bars: cl.bars, pattern: cl.pattern }; if (cl.set) o.set = clone(cl.set); return o; });
    const own = [];
    wps.forEach((at, i) => {
      const st = stateAt(c, at).song.tracks.find(x => x.id === tr.id);
      if (!st || st.mute || st.type === 'voice' || st.type === 'spoken' || !st.clips.length) return;
      const set = { ...(st.settings || {}) };
      for (const k of [...(st.hidden || []), ...(st.commented || [])]) if (k in NEUTRAL) set[k] = NEUTRAL[k];
      const fields = SETTING_FIELDS[st.type] || [];
      own.push({ start: i * bars, bars, pattern: st.clips[0].pattern, set: Object.fromEntries(Object.entries(set).filter(([k]) => fields.includes(k))) });
    });
    return { ...tr, clips: [...own, ...clips], patterns: { ...(tr.patterns || {}), ...((ct && ct.patterns) || {}) } };
  });
  return out;
}
