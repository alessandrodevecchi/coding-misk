// The radio console's track card (console-track-card, #82), no browser: the roll (same number same sound, locks keep
// their groups, movement within the limits and the rack validator over 300 seeds, no Path, the Movement lock), the
// `sound` command on Classic radio songs (steps on the boundary, nothing before it, kept by a later command, a replay
// equal, cancel gives the song back, why not), the card's new pattern per type (same number same pattern) used through a
// `pattern` replace, the library list of a track (instrument, kick against beat).
//   npm run check:track-card [-- --songs 24]
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { loadStyles } from './styles-dir.mjs';
import { createSession } from '../src/endless/director.js';
import { steerSong, whyNot, instrumentOf, SOUND_KEYS } from '../src/endless/steering.js';
import { stateAt } from '../src/song/build.js';
import { rollMove, ROLL_MOVES } from '../src/material/dice.js';
import { isMove, MOVE_MAX } from '../src/song/movement.js';
import { checkRack } from '../src/song/rack.js';
import { rollCard, soundOf, cardSeed, newCardPattern, libraryFor, newHistory, addEntry, undoTarget, nextNumber, HISTORY_MAX } from '../src/radio/track-card.js';

const RECIPES = loadStyles().filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SONGS = +arg('--songs', 24);
let failed = 0, passed = 0;
const check = (ok, name) => { if (ok) passed++; else { failed++; console.log(`FAIL  ${name}`); } };
const J = x => JSON.stringify(x);
const trackAt = (song, id, bar) => stateAt(song, bar).song.tracks.find(t => t.id === id);
const plays = (song, id, bar) => { const t = trackAt(song, id, bar); return !!(t && !t.mute && !t.hush); };
const session = (i, style) => createSession(RECIPES, `card-${i}`).next({ styles: [style], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5 });

// ---------- the movement roll ----------
{
  const kinds = {}, base = { type: 'pad', settings: { cutoff: 2000, room: 0 }, rack: [] };
  let owned = null, rack = [];
  for (let n = 1; n <= 300; n++) {
    const o = rollMove({ track: { ...base, rack }, seedBase: 'mv', n, owned });
    const moves = o.rack.filter(isMove);
    let bad = 0;
    checkRack(o.rack, 'rack', () => bad++, () => bad++, 'pad', base.settings);
    check(!bad, `movement roll ${n}: the rack validator accepts it (${J(o.rack)})`);
    check(moves.length <= MOVE_MAX, `movement roll ${n}: at most ${MOVE_MAX} movement devices`);
    check(!o.rack.some(d => d.device === 'path'), `movement roll ${n}: no path`);
    check(moves.length <= 1, `movement roll ${n}: the roll owns one device at most (${moves.length})`);
    if (o.owned) kinds[o.owned.device] = (kinds[o.owned.device] || 0) + 1; else kinds.none = (kinds.none || 0) + 1;
    owned = o.owned; rack = o.rack;
  }
  check(ROLL_MOVES.every(k => kinds[k] > 20) && kinds.none > 80, `movement roll: every device and none drawn (${J(kinds)})`);
  // a device the track had stays; two of its own leave no room
  const held = [{ device: 'lfo', target: 'pan', rate: 1, depth: 0.3, shape: 'sine' }, { device: 'pump', depth: 0.6, recover: 0.15, rate: 0.25 }];
  for (let n = 1; n <= 40; n++) { const o = rollMove({ track: { ...base, rack: held }, seedBase: 'full', n }); check(J(o.rack) === J(held) && !o.owned, `movement roll on a full track ${n}: nothing added, nothing taken`); }
  check(J(rollMove({ track: { type: 'drums', rack: [] }, seedBase: 'd', n: 3 }).rack) === '[]', 'movement roll: none on drums');
  check(J(rollMove({ track: base, seedBase: 'x', n: 7 })) === J(rollMove({ track: base, seedBase: 'x', n: 7 })), 'movement roll: same number, same device');
}

// ---------- the history ----------
{
  let h = newHistory({ set: { wave: 'saw' }, rack: [] });
  for (let n = 1; n <= 20; n++) { h = addEntry(h, { n, set: { wave: `w${n}` }, rack: [], owned: {} }); h = { ...h, cur: n, wait: null }; }
  check(h.rolls.length === HISTORY_MAX && h.rolls[0].n === 0 && h.rolls.some(r => r.n === 20), `history: capped to ${HISTORY_MAX}, the original and the last kept (${h.rolls.map(r => r.n)})`);
  check(nextNumber(h) === 21 && undoTarget(h) === 19, 'history: next number and Undo target');
  check(undoTarget(newHistory({ set: {}, rack: [] })) === null, 'history: Undo on the original goes nowhere');
}

// ---------- the sound command and the card's pattern on radio songs ----------
let songs = 0, sounds = 0, pats = 0, drums = 0;
for (let i = 0; i < SONGS * 3 && songs < SONGS; i++) {
  const style = RECIPES[i % RECIPES.length].id, g = session(i, style), P = g.plan, ph = P.phrase, seed = `card-${i}`;
  const at = 2 * ph * 2;
  if (at + 4 * ph >= P.bars) continue;
  const on = stateAt(g.song, at).song.tracks.filter(t => !t.mute && instrumentOf(t) && t.type !== 'riser');
  if (!on.length) continue;
  songs++;
  for (const tr0 of on.slice(0, 3)) {
    const tr = trackAt(g.song, tr0.id, at), what = `${style} ${seed} ${tr.id} (${tr.type})`, sb = cardSeed(seed, 0, tr.id);
    // the roll: same number same sound; the locks keep their groups
    const a = rollCard({ track: tr, R: P.R, seedBase: sb, n: 1, energy: 0.6 }), b = rollCard({ track: tr, R: P.R, seedBase: sb, n: 1, energy: 0.6 });
    if (!a) { check(!['drums', 'bass', 'arp', 'hook', 'pad', 'guitar'].includes(tr.type), `${what}: a roll`); continue; }
    check(J(a) === J(b), `${what}: same number, same sound`);
    if (['bass', 'arp', 'hook', 'pad'].includes(tr.type)) {
      const L = rollCard({ track: tr, R: P.R, seedBase: sb, n: 2, locks: ['filter', 'move'], energy: 0.6 });
      check(['cutoff', 'reso'].every(k => J(L.set[k]) === J((tr.settings || {})[k] ?? undefined) || (tr.settings || {})[k] === undefined), `${what}: Filter locked keeps cutoff and reso`);
      check(J((L.rack || []).filter(isMove)) === J((tr.rack || []).filter(isMove)), `${what}: Movement locked keeps the movement devices`);
    }
    // the command: on the boundary, nothing before it
    const cmd = { kind: 'sound', track: tr.id, n: 1, set: a.set, rack: a.rack, at };
    check(whyNot(cmd, g.song, P, at - 3) === null, `${what}: the sound command can apply`);
    const r = steerSong({ song: g.song, plan: P, opts: g.opts, commands: [cmd], seed, n: 0 });
    const now = trackAt(r.song, tr.id, at), before = trackAt(r.song, tr.id, at - 1), was = trackAt(g.song, tr.id, at - 1);
    check(SOUND_KEYS.every(k => !(k in a.set) || J(now.settings[k]) === J(a.set[k])), `${what}: the new sound on bar ${at}`);
    check(J((now.rack || []).slice().sort((x, y) => x.device.localeCompare(y.device))) === J(a.rack.slice().sort((x, y) => x.device.localeCompare(y.device))), `${what}: the new rack on bar ${at}`);
    check(J(before.settings) === J(was.settings) && J(before.rack || []) === J(was.rack || []), `${what}: the sound before bar ${at} unchanged`);
    check(plays(r.song, tr.id, at) === plays(g.song, tr.id, at), `${what}: the track plays as before`);
    // replay, cancel, a later command keeps it
    check(J(steerSong({ song: g.song, plan: P, opts: g.opts, commands: [cmd], seed, n: 0 }).song) === J(r.song), `${what}: a replay gives the same song`);
    check(J(steerSong({ song: g.song, plan: P, opts: g.opts, commands: [], seed, n: 0 }).song) === J(g.song), `${what}: without the command the song is the director's`);
    const later = steerSong({ song: g.song, plan: P, opts: g.opts, commands: [cmd, { kind: 'energy-up', at: at + 2 * ph }], seed, n: 0 });
    const k = ['wave', 'kit', 'type', 'sample'].find(x => x in a.set);
    if (k) check(J(trackAt(later.song, tr.id, at + ph).settings[k]) === J(a.set[k]), `${what}: the new ${k} kept after a later energy command`);
    // back to the original with a second command
    const orig = soundOf(trackAt(g.song, tr.id, at));
    const back = steerSong({ song: g.song, plan: P, opts: g.opts, commands: [cmd, { kind: 'sound', track: tr.id, n: 0, set: orig.set, rack: orig.rack, at: at + ph }], seed, n: 0 });
    const bt = trackAt(back.song, tr.id, at + ph);
    check(SOUND_KEYS.every(x => J(bt.settings[x] ?? null) === J(orig.set[x] ?? null)), `${what}: the original sound back on bar ${at + ph}`);
    sounds++;
    // the card's pattern, used through a replace
    if (tr.type === 'texture') continue;
    const p1 = newCardPattern({ track: tr, plan: P, opts: g.opts, song: g.song, at, seedBase: sb, n: 1, styles: [style] }), p1b = newCardPattern({ track: tr, plan: P, opts: g.opts, song: g.song, at, seedBase: sb, n: 1, styles: [style] });
    if (!p1) { check(tr.type === 'drums', `${what}: a new pattern`); continue; }
    check(J(p1) === J(p1b), `${what}: same number, same pattern`);
    const p2 = newCardPattern({ track: tr, plan: P, opts: g.opts, song: g.song, at, seedBase: sb, n: 2, styles: [style], avoid: [p1.pattern] });
    if (tr.type !== 'drums') check(p2 && J(p2.pattern) !== J(p1.pattern), `${what}: pattern #2 differs from #1`);
    const use = { kind: 'pattern', mode: 'replace', target: tr.id, item: p1, at };
    check(whyNot(use, g.song, P, at - 3) === null, `${what}: Use can apply (${whyNot(use, g.song, P, at - 3)})`);
    const u = steerSong({ song: g.song, plan: P, opts: g.opts, commands: [use], seed, n: 0 });
    const ut = trackAt(u.song, tr.id, at), clip = ut.clips.find(c => c.start <= at && c.start + c.bars > at) || ut.clips[0];
    check(J(ut.patterns[clip.pattern]) === J(p1.pattern), `${what}: the new pattern plays from bar ${at}`);
    pats++; if (tr.type === 'drums') drums++;
  }
}
check(songs >= Math.min(12, SONGS) && sounds >= songs && pats >= songs && drums > 0, `radio songs tested (${songs} songs, ${sounds} sounds, ${pats} patterns, ${drums} drum patterns)`);
// why not: a track the song does not hold
{ const g = session(0, RECIPES[0].id); check(whyNot({ kind: 'sound', track: 'nope', set: {}, rack: [] }, g.song, g.plan, 1) === 'not-playing', 'why not: a track the song does not hold'); }

// ---------- the library list ----------
{
  const g = session(3, 'berlin-techno'), song = g.song, P = g.plan;
  const ctx = { meter: P.meter, key: 'A', bpm: 128 };
  const lib = [
    { id: 'm', type: 'hook', pattern: { idea: { degrees: '0 2 4' } }, context: ctx },
    { id: 'b1', type: 'bass', pattern: { idea: { degrees: '0' } }, context: ctx, uses: 1 },
    { id: 'b2', type: 'bass', pattern: { idea: { degrees: '0 7' } }, context: ctx, uses: 5 },
    { id: 'b3', type: 'bass', pattern: { idea: { degrees: '0' } }, context: { ...ctx, meter: '7/8' } },
    { id: 'k', type: 'drums', pattern: { rows: { bd: 'x...x...x...x...' } }, context: ctx },
    { id: 'h', type: 'drums', pattern: { rows: { hh: '..x...x...x...x.' } }, context: ctx },
  ];
  const bass = (P.tracks || []).find(t => t.type === 'bass'), kick = (P.tracks || []).find(t => instrumentOf(t) === 'kick');
  if (bass) check(J(libraryFor(bass, lib, P, song).map(x => x.id)) === J(['b2', 'b1']), `library: the bass lists the fitting basslines, most used first (${libraryFor(bass, lib, P, song).map(x => x.id)})`);
  if (kick) check(J(libraryFor(kick, lib, P, song).map(x => x.id)) === J(['k']), `library: the kick lists kick grooves only (${libraryFor(kick, lib, P, song).map(x => x.id)})`);
  check(!!bass && !!kick, 'library: the test song has a bass and a kick');
}

console.log(failed ? `${failed} failed, ${passed} passed` : `ok    track card: ${passed} checks (${songs} radio songs, ${sounds} sounds, ${pats} patterns)`);
process.exit(failed ? 1 : 0);
