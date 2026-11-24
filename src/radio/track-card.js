// The radio console's track card (console-track-card): what it rolls and makes, without the DOM, so the checks run in
// Node (tools/check-track-card.mjs). The page sends the results as commands (`sound`, `pattern` replace), so a replay
// never rolls again.
import { stream } from '../endless/random.js';
import { stateAt } from '../song/build.js';
import { GROOVES, TEXTURES, meterSteps, fitSteps } from '../music.js';
import { rollSound, rollMove, DICE_GROUPS } from '../material/dice.js';
import { airIdea, airGroove } from '../endless/material.js';
import { airInputs, instrumentOf, patternPart, fitsAir, SOUND_KEYS } from '../endless/steering.js';
import { kindOfPattern, soundKey } from '../library/patterns.js';

const clone = o => JSON.parse(JSON.stringify(o));
// the lock groups of the card for a track type: the Compose dice's, plus "move" for melodic tracks (D3, D4)
export const MOVE_LOCK = 'move';
export const CARD_TYPES = ['drums', 'bass', 'arp', 'hook', 'pad', 'guitar', 'texture'];
export const cardGroups = type => [...(DICE_GROUPS[type] || []), ...(['bass', 'arp', 'hook', 'pad', 'guitar'].includes(type) ? [MOVE_LOCK] : [])];
// the seed base of a track's rolls and patterns in a session: "<session seed>:<song number>:<track id>"
export const cardSeed = (seed, n, trackId) => `${seed}:${n}:${trackId}`;
// a track's sound now: the keys a roll may change and the whole rack (copies)
export function soundOf(track) {
  const s = (track && track.settings) || {}, set = {};
  for (const k of SOUND_KEYS) if (s[k] !== undefined && s[k] !== null) set[k] = clone(s[k]);
  return { set, rack: clone((track && track.rack) || []) };
}

// One roll of the card (D3, D4): the Compose dice on the track (its sound at the boundary, the style of the song on air,
// the locks but "move"), then one movement device or none unless "move" is locked; a texture draws another sample of
// its style. owned: { fm, move } the devices the earlier roll on air owned. → { set, rack, owned } or null
export function rollCard({ track, R, seedBase, n = 1, locks = [], energy = 0.5, owned = {} }) {
  if (!track || !R) return null;
  const own = owned || {}, base = `${seedBase}:sound`;
  if (track.type === 'texture') {
    const r = R.texture || {}, list = r.samples && r.samples.length > 1 ? r.samples : TEXTURES, cur = (track.settings || {}).sample;
    const rest = list.filter(x => x !== cur);
    if (!rest.length) return null;
    return { set: { sample: stream(`${base}:${n}`, 'sound/sound').pick(rest) }, rack: clone(track.rack || []), owned: {} };
  }
  if (!DICE_GROUPS[track.type]) return null;
  const out = rollSound({ track: { ...track, settings: { ...(track.settings || {}) } }, recipe: R, seedBase: base, n, locks: locks.filter(x => x !== MOVE_LOCK), energy, owned: own.fm || null });
  if (!out) return null;
  let rack = out.rack, move = own.move || null;
  if (!locks.includes(MOVE_LOCK)) { const m = rollMove({ track: { ...track, settings: out.settings, rack }, seedBase: base, n, owned: own.move || null }); rack = m.rack; move = m.owned; }
  const set = {};
  for (const k of SOUND_KEYS) if (out.settings[k] !== undefined && out.settings[k] !== null) set[k] = out.settings[k];
  return { set, rack, owned: { fm: out.owned || null, move } };
}

// ---------- the history of a track's sounds (D5) ----------
// h = { rolls: [{ n, set, rack, owned }], cur: n on air, wait: n waiting or null }; entry 0 is the original sound
export const HISTORY_MAX = 12;
export const newHistory = original => ({ rolls: [{ n: 0, ...clone(original), owned: {} }], cur: 0, wait: null });
export const nextNumber = h => h.rolls.reduce((m, r) => Math.max(m, r.n), 0) + 1;
export const entryOf = (h, n) => h.rolls.find(r => r.n === n) || null;
// the history with a new roll added (waiting), capped to HISTORY_MAX entries, the original and the lit one kept
export function addEntry(h, e) {
  const rolls = [...h.rolls.filter(r => r.n !== e.n), clone(e)];
  while (rolls.length > HISTORY_MAX) { const i = rolls.findIndex(r => r.n !== 0 && r.n !== h.cur && r.n !== e.n); if (i < 0) break; rolls.splice(i, 1); }
  return { ...h, rolls, wait: e.n };
}
// the entry Undo returns to when nothing waits: the one before the entry on air (by number), else the original
export function undoTarget(h) {
  const before = h.rolls.filter(r => r.n < h.cur).sort((a, b) => b.n - a.n)[0];
  return before ? before.n : null;
}

// ---------- the Pattern row (D7) ----------
// the section that plays at a bar of a song
const sectionAt = (song, bar) => { let a = 0, sc = song.sections[0]; for (const x of song.sections) { if (bar >= a) sc = x; a += x.bars; } return sc || {}; };
// A new pattern for a track at the boundary `at` (director's bars), number n: a melodic part from the radio's generator
// with the inputs of that boundary (avoiding the track's ideas), a kick or beat from the style's drum material, else a
// groove of the style the track does not play. avoid: earlier candidates' patterns (a new number never gives the
// one shown before). → a pattern item as the saved patterns are ({ id, name, kind, type,
// pattern, sound, settings, context, styles }) or null
export function newCardPattern({ track, plan, opts = {}, song, at, seedBase, n = 1, styles = [], avoid: before = [] }) {
  if (!track || !plan || !song) return null;
  const R = plan.R, st = stateAt(song, at).song, M = airInputs(plan, opts, st, at), seed = `${seedBase}:pattern:${n}`, sec = sectionAt(song, at);
  let pattern = null;
  if (track.type === 'drums') {
    const part = instrumentOf(track), steps = meterSteps(plan.meter);
    const seen = new Set(before.map(p => JSON.stringify(p && p.rows))), rows = airGroove(R, part, M, { seed }).filter(x => !seen.has(JSON.stringify(x)));
    if (rows.length) pattern = { rows: rows[0] };
    else {
      const gs = stream(seed, 'groove').shuffle((R.drums && R.drums.grooves) || []);
      for (const g of gs) {
        const r = Object.fromEntries(Object.entries((GROOVES[g] || [])[1] || {}).filter(([k, v]) => String(v).includes('x') && (part === 'kick' ? k === 'bd' : k !== 'bd')).map(([k, v]) => [k, fitSteps(v, steps)]));
        if (Object.keys(r).length) { pattern = { rows: r }; break; }
      }
    }
  } else if (['bass', 'arp', 'hook', 'pad', 'guitar'].includes(track.type)) {
    const own = (plan.tracks || []).find(x => x.id === track.id) || track;
    const avoid = [...Object.values(own.patterns || {}), ...before].map(p => p && p.idea).filter(Boolean);
    const idea = airIdea({ ...own, settings: { ...(own.settings || {}), ...(track.settings || {}) } }, R, { ...M, source: 'composed', keepChords: true, seed, avoid });
    if (idea) pattern = { idea };
  }
  if (!pattern) return null;
  const mode = track.type === 'hook' ? (track.settings || {}).mode || 'minor' : 'minor';
  return { id: `card:${track.id}:${n}`, n, name: `${track.name || track.id} #${n}`, kind: kindOfPattern(track.type, pattern), type: track.type, pattern, sound: (track.settings || {})[soundKey(track.type)] ?? null, settings: {}, context: { key: M.key, chords: M.chords, meter: plan.meter, bpm: Number(sec.bpm) || null, mode }, styles: styles.slice() };
}
// the saved patterns «From the library» lists for a track: its instrument (kick and beat apart), fitting the song,
// most used first
export function libraryFor(track, patterns, plan, song) {
  const part = instrumentOf(track);
  if (!part) return [];
  return (patterns || []).filter(x => patternPart(x) === part && fitsAir(x, plan, song)).map((x, i) => [x, i]).sort((a, b) => (Number(b[0].uses) || 0) - (Number(a[0].uses) || 0) || a[1] - b[1]).map(([x]) => x);
}
