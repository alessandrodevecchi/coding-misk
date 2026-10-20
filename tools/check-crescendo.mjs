// Checks for Crescendo (#64), the live build that grows a song in small steps. No browser.
// Every song in songs/ is built in crescendo and checked: same seed same build, every growth step on one track,
// one track per bar, every state compiles, the state after the growth compiles to the song as written (with its
// growth span), length within three times the written one, endings not all alike, no function the compiler does not
// already emit. Fixtures: a fingerprint of the steps per song; a change means CRESCENDO_VERSION must go up.
// Growth shapes (growth-shapes): who chooses the shape, every opening's first waypoint, pace, developments, moves,
// second thoughts, ideas that grow, typing without bursts, and the Live coder fixtures (SHAPES_VERSION).
// The checks are in tools/crescendo-checks.mjs. Levels (faster-checks):
//   - quick (default): the Classic, Crescendo and Live coder fixtures and the checks of the Classic and Crescendo
//     builds on every song, every other check on a fixed sample of songs (QUICK_SONGS); counts and medians over the
//     whole corpus are then printed, not checked;
//   - full (--full): every check on every song, in parallel worker processes (tools/check-pool.mjs: low priority,
//     4 workers on weekdays 08:00-20:00, 6 at the weekend by day, all cores but one at night, CHECK_WORKERS, the
//     .check-workers file). Run it after a change to growth rules, shapes or typing, and before a merge to main;
//   - targeted: --only <text> runs the checks whose name holds the text (or ONLY=text), --songs <a,b> runs the
//     song checks on those songs only (or SONGS=a,b; the fixed-song checks then run only when --only names them).
// Results per song and per check are cached (tools/code-cache.mjs) under a hash of the song, the recipes and the app
// code the checks run; --no-cache ignores the cache.
//   npm run check:crescendo            quick level, exit 1 when any check fails
//   npm run check:crescendo -- --full  full level
//   npm run check:crescendo -- --only "openings" --songs switch-tappe,drift
//   npm run check:crescendo -- --write rewrite the fixtures (after raising CRESCENDO_VERSION)
//   npm run check:crescendo -- --write-fixtures   rewrite the Live coder fixtures (after raising SHAPES_VERSION)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHECKS, songs, fileOf, STYLE_FILES } from './crescendo-checks.mjs';
import { runPool, lowerSelf } from './check-pool.mjs';
import { appHash, cacheKey, cacheGet, cachePut, cacheLine, cachePrune, fileText, cacheOff } from './code-cache.mjs';

// the fixed sample of the quick level, chosen among the songs whose Live coder builds are not the slowest: two Live
// coder songs (gated trance, and acid with a metamorphosis and a voice), a song without drums, a song with two spoken
// tracks, a short Classic song, a phonk song, a song with guitars and a code track, and the ideas example
export const QUICK_SONGS = ['dci-ignition', 'drift', 'example-ideas', 'example-night-shift', 'prova-solo-synth', 'prova-voce-taglio', 'switch-acid-prova', 'switch-prima-luce'];

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const FULL = args.includes('--full');
const ONLY = opt('--only') ?? process.env.ONLY;
const SONGS = (opt('--songs') ?? process.env.SONGS ?? '').split(',').map(x => x.trim()).filter(Boolean);
const bad = SONGS.filter(id => !songs.some(s => s.id === id));
if (bad.length) { console.log(`no such song: ${bad.join(', ')}`); process.exit(2); }
const level = SONGS.length ? 'targeted' : FULL ? 'full' : 'quick';
const t0 = Date.now();

const picked = c => !ONLY || c.name.includes(ONLY);
const songRuns = (c, s) => c.songs(s) && (SONGS.length ? SONGS.includes(s.id) : FULL || c.protect || QUICK_SONGS.includes(s.id));
const units = CHECKS.filter(c => c.unit && picked(c) && (!SONGS.length || ONLY));
const perSong = CHECKS.filter(c => c.each && picked(c));
const tasks = [
  ...units.map(c => ({ id: `unit: ${c.name}`, kind: 'unit', name: c.name })),
  ...songs.flatMap(s => perSong.filter(c => songRuns(c, s)).flatMap(c => (c.parts || [undefined]).map(part => ({ id: `${s.id}: ${c.name}${part ? ` (${part})` : ''}`, kind: 'song', song: s.id, check: c.name, part })))),
];

// cache keys: the app code of the checks, the recipes, the song (for a song task) or every song (for a fixed-song check)
// (the checks and this file, which cuts the tasks)
const ENTRY = 'tools/crescendo-checks.mjs', CLI = appHash('tools/check-crescendo.mjs');
const stylesText = STYLE_FILES.map(f => `${f}\0${fileText(f)}`).join('\0'), order = songs.map(s => s.id).join(',');
const allText = songs.map(s => fileText(fileOf[s.id])).join('\0');
const keyOf = t => (t.kind === 'unit' ? cacheKey(ENTRY, CLI, 'unit', t.name, stylesText, allText) : cacheKey(ENTRY, CLI, 'song', t.song, t.check, t.part ?? '', order, stylesText, fileText(fileOf[t.song])));
const results = new Array(tasks.length), todo = [];
tasks.forEach((t, i) => { const v = cacheGet('crescendo', keyOf(t)); if (v !== undefined) results[i] = v; else todo.push(i); });
if (todo.length) {
  lowerSelf();
  const out = await runPool(fileURLToPath(new URL('./crescendo-checks.mjs', import.meta.url)), todo.map(i => tasks[i]), { name: 'check-crescendo' });
  out.forEach((r, k) => { const i = todo[k]; results[i] = r; cachePut('crescendo', keyOf(tasks[i]), r); });
}

const unitResult = name => results[tasks.findIndex(t => t.kind === 'unit' && t.name === name)];
let failed = 0, run = 0;
for (const c of CHECKS) {
  if (!picked(c) || (c.unit && !units.includes(c))) continue;
  const logs = [], log = s => logs.push(s);
  let error = null;
  if (c.unit) { const r = unitResult(c.name); logs.push(...r.logs); error = r.error || null; }
  else {
    const rows = [];
    tasks.forEach((t, i) => { if (t.kind === 'song' && t.check === c.name) rows.push({ s: songs.find(s => s.id === t.song), r: results[i] }); });
    if (!rows.length) continue;
    // the whole corpus of the check ran: every song it covers, every part
    const corpus = !SONGS.length && rows.length === songs.filter(s => c.songs(s)).length * (c.parts || [0]).length;
    const first = rows.find(x => x.r.error);
    if (first) error = first.r.error;
    else if (c.after) { try { c.after(rows.map(x => ({ s: x.s, data: x.r.data })), { corpus, log }); } catch (e) { error = e.message; } }
  }
  run++;
  for (const l of logs) console.log(l);
  if (error === null) console.log(`ok    ${c.name}`); else { failed++; console.log(`FAIL  ${c.name}: ${error}`); }
}
const sample = `${QUICK_SONGS.length} songs (${QUICK_SONGS.join(', ')})`;
const levelLine = {
  quick: `quick level: fixtures and Classic and Crescendo checks on all ${songs.length} songs, Live coder checks on ${sample}; run --full after a change to growth rules, shapes or typing, and before a merge to main`,
  full: `full level: every check on all ${songs.length} songs`,
  targeted: `targeted run on ${SONGS.join(', ')}${ONLY ? ` (checks with "${ONLY}")` : ''}: then run the quick level before a commit`,
}[level];
console.log(`\n${levelLine}${ONLY && level !== 'targeted' ? `; only checks with "${ONLY}"` : ''}`);
console.log(`${tasks.length} tasks, ${todo.length} run in workers; ${cacheLine()}; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (!cacheOff()) cachePrune();
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${run} checks passed`);
process.exit(failed ? 1 : 0);
