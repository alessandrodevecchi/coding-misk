// Growth of a radio song (radio-profiles, design D5 and D6): a Crescendo or Live coder song grows on air from the
// director's song, with the growth engine of Compose (crescendoSong). Pure and seeded by the song id: the same session
// grows the same songs, in the app, in exports and in Node (tools/check-radio-profiles.mjs).
import { stateAt, buildSteps } from '../song/build.js';
import { crescendoSong, shapeCapOf, shapeKeepOf, SHAPE_CAP } from '../song/crescendo.js';
import { resolveProfile, growthRules } from '../live/profiles.js';
import { placeGrownSpoken } from './voice-track.js';

const clone = o => JSON.parse(JSON.stringify(o));
const barsOf = song => song.sections.reduce((a, s) => a + s.bars, 0);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// the step fields a written form turns into clips; every other field stays a step (rack, unrack, a spoken comment, a
// mixer mute: they change the track, not its clips)
const CLIP_FIELDS = ['add', 'remove', 'set', 'pattern'];

// ---------- D5 step 1: the written form ----------
// The director's song with its own steps turned into a song whose clips follow stateAt at each step: a track plays a
// clip where it is on, with the pattern and the settings it has there (`set`: what the steps changed). Sections stay the
// director's (each is a run of the plan's double phrases), so the harmony and the bar numbers stay the same. Steps that
// do not change clips (rack, unrack, comments) stay as steps of the written form. In blocks it plays the same events as
// the director's song (checked bar by bar in tools/check-radio-profiles.mjs).
export function writtenForm(song) {
  const total = barsOf(song), steps = buildSteps(song);
  const cuts = [...new Set([0, ...steps.map(s => s.at).filter(b => b > 0 && b < total)])].sort((a, b) => a - b);
  const states = cuts.map(b => stateAt(song, b).song);
  const out = clone({ ...song, build: undefined });
  delete out.build;
  out.tracks = song.tracks.map(t0 => {
    const t = clone(t0), base = t0.settings || {}, keys = new Map(), patterns = {};
    // a pattern's content gets a key: its own when it is the original, else the rewritten key ("A~x"), made unique
    const keyOf = (key, pat) => {
      const k = JSON.stringify(pat);
      if (keys.has(k)) return keys.get(k);
      let name = key;
      for (let i = 2; patterns[name] !== undefined; i++) name = `${key}${i}`;
      keys.set(k, name); patterns[name] = pat;
      return name;
    };
    // the original patterns keep their keys first
    for (const [k, p] of Object.entries(t0.patterns || {})) keyOf(k, p);
    const clips = [];
    cuts.forEach((from, i) => {
      const to = i + 1 < cuts.length ? cuts[i + 1] : total, st = states[i].tracks.find(x => x.id === t0.id);
      if (!st || st.mute) return;
      const diff = Object.fromEntries(Object.entries(st.settings || {}).filter(([k, v]) => !same(base[k], v)));
      for (const c of st.clips || []) {
        const a = Math.max(from, c.start ?? 0), b = Math.min(to, (c.start ?? 0) + c.bars);
        if (b <= a) continue;
        const set = { ...diff, ...(c.set || {}) }, pattern = keyOf(c.pattern, (st.patterns || {})[c.pattern] || {});
        const last = clips[clips.length - 1];
        if (last && last.start + last.bars === a && last.pattern === pattern && same(last.set || {}, set)) { last.bars += b - a; continue; }
        clips.push({ start: a, bars: b - a, pattern, ...(Object.keys(set).length ? { set } : {}) });
      }
    });
    t.patterns = patterns;
    t.clips = clips;
    delete t.mute;
    return t;
  }).filter(t => t.clips.length || t.type === 'voice');
  // the steps that stay: everything but the clip fields
  const rest = [];
  for (const s of steps) {
    const r = Object.fromEntries(Object.entries(s).filter(([k]) => !CLIP_FIELDS.includes(k) && k !== 'by'));
    if (Object.keys(r).some(k => k !== 'at')) rest.push(r);
  }
  if (rest.length) out.build = rest;
  return out;
}

// what a song plays at a bar, as the blocks build hears it: per track on air, its settings with the clip's, the pattern
// it plays and its track-level state (rack, hush…); and the comment said there
export function soundAt(song, bar) {
  const st = stateAt(song, bar).song;
  const tracks = st.tracks.flatMap(t => {
    if (t.mute) return [];
    const c = (t.clips || []).find(x => (x.start ?? 0) <= bar && bar < (x.start ?? 0) + x.bars);
    if (!c) return [];
    const { clips, patterns, settings, ...rest } = t;
    return [{ ...rest, settings: { ...(settings || {}), ...(c.set || {}) }, pattern: (patterns || {})[c.pattern] || {} }];
  });
  const says = buildSteps(song).filter(s => s.at === bar && s.say).map(s => s.say);
  return { tracks, says };
}

// ---------- D5 step 2 and D6: the growth on air ----------
// the part of a written form from bar `from`: sections, clips and steps moved back; the track-level state the steps
// left at that bar (rack, hush) becomes the tracks' own; comments before it go (the growth says its own)
function tailOf(wf, from) {
  const out = clone(wf), st = stateAt(wf, from).song;
  let at = 0;
  out.sections = [];
  for (const s of wf.sections) { const a = Math.max(at, from), b = at + s.bars; if (b > a) out.sections.push({ ...clone(s), bars: b - a }); at = b; }
  out.tracks = wf.tracks.map(t => {
    const s = st.tracks.find(x => x.id === t.id) || t, nt = { ...clone(t) };
    for (const k of ['rack', 'hush', 'alone']) { if (s[k] !== undefined) nt[k] = clone(s[k]); else delete nt[k]; }
    nt.clips = t.clips.flatMap(c => { const a = Math.max(c.start, from), b = c.start + c.bars; return b > a ? [{ ...clone(c), start: a - from, bars: b - a }] : []; });
    // (the voice instrument is placed again over the whole grown song afterwards: placeGrownSpoken, after-tests-oct28 D3)
    return nt;
  }).filter(t => t.clips.length || t.type === 'voice');
  const steps = buildSteps(wf).filter(s => s.at >= from).map(s => ({ ...clone(s), at: s.at - from }));
  delete out.build;
  return { song: out, steps };
}
// the first section with the most tracks on air (the reference of the growth, as in shapeFacts)
function referenceStart(wf) {
  let best = -1, start = 0, at = 0;
  for (const s of wf.sections) {
    const n = wf.tracks.filter(t => t.type !== 'voice' && t.type !== 'spoken' && t.clips.some(c => c.start < at + s.bars && c.start + c.bars > at)).length;
    if (n > best) { best = n; start = at; }
    at += s.bars;
  }
  return start;
}

// the controls a radio song's growth uses: the profile's own, with the duration on air (fitted unless the artist asks
// for free); never the Compose overrides (owner decision 4)
export const airControls = (profile, free = false) => resolveProfile(profile, { duration: free ? 'free' : 'fitted' });

// ---------- reused-lines D5, D6: the growth shape settings on air ----------
// The settings of Settings, Advanced the radio follows (get(key, fallback): the app's store): "Growth shapes tried",
// "Try all growth shapes" with "Keep", "Random order". → the values that differ from the defaults ({ cap, all, keep,
// random: false }), or null. "Long song from" stays Compose only (the radio keeps 15 minutes).
export function shapeSearchSetting(get) {
  const cap = shapeCapOf(get('coding-misk-shape-cap', null)), all = get('coding-misk-shape-all', null) === true, keep = shapeKeepOf(get('coding-misk-shape-keep', null)), random = get('coding-misk-shape-random', null) !== false;
  const out = { ...(cap !== SHAPE_CAP ? { cap } : {}), ...(all ? { all: true, ...(keep !== 'first' ? { keep } : {}) } : {}), ...(random ? {} : { random: false }) };
  return Object.keys(out).length ? out : null;
}
// a recipe's shape settings (options.shapeSearch), without the record of what each song played
export const searchOf = recipe => { const s = recipe && recipe.options && recipe.options.shapeSearch; if (!s) return null; const { played: _, ...v } = s; return Object.keys(v).length ? v : null; };
// which growth song n played on air ('wide': with the settings, 'default': the default search), or null when unknown
export const playedOf = (recipe, n) => { const s = recipe && recipe.options && recipe.options.shapeSearch; return (s && s.played && s.played[n]) || null; };
// the options of crescendoSong for a search
const searchOptions = s => ({ ...(s.cap ? { shapeCap: s.cap } : {}), shapeAll: !!s.all, ...(s.keep ? { shapeKeep: s.keep } : {}), shapeRandom: s.random !== false });

// The song a radio song plays: Classic keeps the director's song; Crescendo and Live coder grow from its written form.
// ctx: profile ('classic' | 'crescendo' | 'switch'); artist (the artist on air: its `growth`); into (the kind of the
// transition into this song, null when nothing plays before it); styles ({ id: recipe }, for the growth shapes)
// Fitted duration (default): the growth takes the bars of the written form before a section boundary (from the
// reference section on) and fills them, so the song keeps its planned length within a phrase. Free (an artist's
// `growth.duration`): the growth takes the bars it needs before the written form, the song gets longer.
// → the song (a grown song carries `crescendo` facts and `onAir`: { profile, from, free })
// controls: the radio's Custom profile (its own growth, duration and shape choices), else the profile's own on air
// search, wide (reused-lines D5, D6): the session's shape settings (searchOf) and whether this growth uses them; the
// default search otherwise (the first growth of a song, steering, a growth that cannot wait)
export function growOnAir(song, { profile = 'classic', artist = null, into = null, styles = {}, phrase = 8, controls = null, search = null, wide = false } = {}) {
  if (profile !== 'crescendo' && profile !== 'switch') return song;
  const g = (artist && artist.growth) || {}, free = controls ? controls.duration === 'free' : g.duration === 'free';
  const C = controls || airControls(profile, free);
  const base = growthRules(C, { styles });
  // the typed opening only after a cut or an interlude, where nothing else plays; never the metamorphosis on air
  const deny = { opening: !into || into === 'cut' || into === 'interlude' ? [] : ['typed'], development: ['metamorphosis'] };
  const shapeWeights = Object.keys(g).some(k => k !== 'duration') ? { openings: g.openings, paces: g.paces, developments: g.developments } : null;
  const rules = { ...base, noEnding: true, ...(base.coder ? { deny, ...(shapeWeights ? { shapeWeights } : {}) } : {}) };
  const wf = writtenForm(song), total = barsOf(wf);
  const grow = (from, extra) => {
    const t = tailOf(wf, from);
    const c = crescendoSong(t.song, { seed: song.id, narrated: C.narrated, rules: { ...rules, ...extra }, ...(wide && search && base.coder ? searchOptions(search) : {}) });
    if (!c.build.length) return null;
    const G = c.crescendo.growth;
    // the written form's own steps (rack, comments) after the growth, where they were
    c.build = [...c.build, ...t.steps.map(s => ({ ...s, at: s.at + G }))].map((s, i) => ({ s, i })).sort((a, b) => a.s.at - b.s.at || a.i - b.i).map(x => x.s);
    c.onAir = { profile, from, free };
    // the voice instrument over the whole grown song, the growth included (after-tests-oct28 D3)
    return placeGrownSpoken(c, wf, G);
  };
  if (free) return grow(0, {}) || song;
  // fitted: the section boundaries from the reference on (at least a phrase in, at least two phrases left), nearest
  // first; the first growth that fits within a phrase of the plan without rushing the typing is kept, else the fitting
  // one that rushes least, then the closest (a growth needs time: a short span makes the typing rush, a long one
  // leaves less of the song as written)
  const starts = []; let at = 0;
  for (const s of wf.sections) { at += s.bars; starts.push(at); }
  // (a Live coder growth needs 24 bars of written song after it, else it grows with the Crescendo rules)
  const left = base.natural ? Math.max(2 * phrase, 24) : 2 * phrase;
  const ref = referenceStart(wf), cands = starts.filter(b => b >= Math.max(ref, phrase) && total - b >= left);
  const fallback = starts.filter(b => b >= phrase && total - b >= left).slice(-1);
  const tries = (cands.length ? cands : fallback.length ? fallback : starts.filter(b => total - b >= phrase).slice(-1)).slice(0, TRIES);
  let best = null;
  for (const from of tries) {
    // (the growth may take one phrase more than the bars it replaces: the song stays within a phrase of its plan, and
    // the typing rushes less; measured on 50 songs, docs/knowledge/decisions.md)
    const c = grow(from, { budget: from + phrase, span: from });
    if (!c) continue;
    const miss = Math.abs(barsOf(c) - total), fits = miss <= phrase, rushed = (c.crescendo.shape && c.crescendo.shape.rushed) || 0;
    const score = [fits ? 0 : 1, rushed, miss], better = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    if (!best || better(score, best.score) < 0) best = { c, score };
    if (fits && !rushed) break;
  }
  return best ? best.c : song;
}
// the section boundaries a fitted growth tries at most
const TRIES = 8;

// ---------- D2: song 0 (Continue in radio) ----------
// A saved song played first in the radio keeps the profile it had there (radio-profiles D2). lead: the recipe's lead
// { song, from, profile?, controls? }:
//   controls (with profile): the Compose controls it was playing with (its profile and the owner's overrides); it
//     grows as Compose grows it (crescendoSong with those controls), so the handover changes nothing on screen;
//   profile alone: an undeclared song played in blocks, taken by the session's forced profile (D2 rule 2); it grows as
//     a radio song (growOnAir, nothing before it);
//   neither (a Classic lead, a recipe saved before): the song as written, in blocks.
// styles: { id: recipe }, for the growth shapes. → the song as heard (a grown one carries `onAir` with `lead: true`)
export function leadOnAir(lead, styles = {}) {
  const song = lead && lead.song, p = lead && lead.profile;
  if (!song || (p !== 'crescendo' && p !== 'switch')) return song;
  const C = lead.controls;
  if (!C || typeof C !== 'object') {
    const g = growOnAir(song, { profile: p, styles });
    return g === song ? song : { ...g, onAir: { ...g.onAir, lead: true } };
  }
  if (C.build !== 'crescendo') return song;
  const c = crescendoSong(song, { narrated: C.narrated, rules: growthRules(C, { styles }) });
  if (!c.build.length) return song;
  c.onAir = { profile: p, from: 0, free: C.duration === 'free', lead: true };
  return c;
}
