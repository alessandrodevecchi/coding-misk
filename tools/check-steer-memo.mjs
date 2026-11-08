// Incremental steering checked against a full steering (incremental-steering D7, #82). No browser.
// Radio songs (Classic, Crescendo, Live coder; a third of each at exact 10 minutes) get seeded random console presses
// one at a time, as the radio sends them: pending commands with their press bar, batches of "+" and "−" (with locks and
// saved patterns), batches replaced before they enter, a second batch pending on top of the first, cancels of standing
// commands. After every press the steering with the kept results (one long-lived cache per worker process, as in the
// radio's workers, every kept value deeply frozen so a caller that writes into one fails) is compared byte for byte with
// a full steering with nothing kept: steerOnAir's song, grown song, commands, plan, options and plain song, and
// steerView; Classic: steerSong's song, plan and options. One grown song and one Classic song change the language (the
// app's and the spoken lines') halfway. compileNow is compared directly on a sample of bars, and on the song that changed
// language in both languages (the code differs, the cache must not mix them). Then every song's final commands are
// steered again with an empty cache (a replay in a fresh worker) and must give the live result.
// Runs in worker processes (tools/check-pool.mjs), about 3 to 4 minutes on a quiet machine with 4 workers: run it
// before a merge that touches the steering, the director, the waypoints or the compiler. It is not part of
// check:endless.
//   npm run check:steer-memo
//   npm run check:steer-memo -- --only classic|crescendo|switch --songs 4 --seed x --quick
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { sessionItems } from '../src/endless/items.js';
import { loadStyles } from './styles-dir.mjs';
import { createSession } from '../src/endless/director.js';
import { steerOnAir, airBoundaries, airOffset, steerView, AIR_CHOOSERS, AIR_CHOOSER } from '../src/endless/waypoints.js';
import { airControls } from '../src/endless/growth.js';
import { steerSong, applyBar, INSTRUMENTS, instrumentOf } from '../src/endless/steering.js';
import { stream } from '../src/endless/random.js';
import { stateAt } from '../src/song/build.js';
import { setSpokenContext } from '../src/song/spoken.js';
import { setLang, getLang } from '../src/i18n.js';
import { compileNow } from '../src/song/compile-compact.js';
import { memoConfig, clearMemo, memoStats, work } from '../src/endless/steer-memo.js';

const RECIPES = loadStyles().filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
const STYLES = Object.fromEntries(RECIPES.map(r => [r.id, r]));
const how = { transition: 'artist', harmony: 'artist' };
const barsOf = s => s.sections.reduce((a, x) => a + x.bars, 0);
const hashOf = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
const PATTERN = { id: 'mine-1', name: 'Basso mio', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' }, sound: 'sawtooth', settings: { wave: 'sawtooth', gain: 0.7 }, styles: ['jazz'], context: { key: 'A', chords: 'notturna', meter: '4/4', bpm: 128, mode: 'minor' } };
const recipeOf = (i, profile, len, seed) => ({ seed, options: { styles: [RECIPES[i % RECIPES.length].id, ...(i % 3 === 0 ? [RECIPES[(i * 7 + 3) % RECIPES.length].id] : [])], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, ...how, profile, ...(len ? { length: len } : {}) }, changes: [] });

// the same call with the kept results (frozen) and with nothing kept: → { a, b } JSON strings (or the error)
// (w: what the steering with the kept results did, read by fn through seen())
let seen = null;
const saw = () => { if (memoConfig.on) seen = { ...work }; };
function both(fn) {
  const run = on => { memoConfig.on = on; memoConfig.freeze = on; try { return JSON.stringify(fn()); } catch (e) { return `ERROR ${(e && e.message) || e}`; } finally { memoConfig.on = true; memoConfig.freeze = false; } };
  seen = null;
  const a = run(true), w = seen || { ...work }, b = run(false);
  return { a, b, w };
}

// the app's language and the spoken lines' (a page sets both; Node has no document, so a stand-in as check-spoken)
function language(l) { const d = globalThis.document; globalThis.document = { documentElement: {} }; try { setLang(l); } finally { globalThis.document = d; } setSpokenContext({ lang: l }); }

// ---------- one song ----------
function grownTask({ i, profile, len, seed, langAt }) {
  // a song grown as check-radio-profiles grows it: the first index from i on that grows on air
  let x = null, rec = null, k = i;
  for (; k < i + 40; k++) {
    rec = recipeOf(k, profile, len, `grow-${k}`);
    const [it] = sessionItems(RECIPES, rec, 1, null, { grow: true });
    if (it && it.song && it.song.onAir && it.song.crescendo && barsOf(it.song) - it.song.crescendo.growth >= 48) { x = it; break; }
  }
  if (!x) return { id: `${profile}-${i}`, skipped: true };
  const g0 = x.song, g = createSession(RECIPES, rec.seed).next(rec.options), G = g0.crescendo.growth, bars = barsOf(g0), ph = g.plan.phrase;
  const ctx = { profile, styles: STYLES, phrase: ph };
  const R = stream(seed, `memo:${profile}:${k}:${len || 'style'}`);
  const presses = R.int(6, 12), gap = Math.max(1, Math.floor((bars - G - ph - 2) / (presses + 1)));
  let standing = [], id = 0, batchN = 0, calls = 0, q = G + 1.4 + R.range(0, ph);
  const fails = [], acts = [];
  const args = commands => ({ grown: g0, song: g.song, plan: g.plan, opts: g.opts, commands, seed: rec.seed, n: 0, ctx, view: true });
  // one steering, compared; → the result with reuse (parsed)
  const steer = (commands, what) => {
    calls++;
    const A = args(commands.map(c => ({ ...c })));
    const { a, b, w } = both(() => { const r = steerOnAir(A); saw(); return [r, steerView(A, r)]; });
    if (a !== b) fails.push(`${what} (press ${acts.length}): reused ${hashOf(a)} vs full ${hashOf(b)} (${a.slice(0, 80)} | ${b.slice(0, 80)})`);
    acts.push(`${what}:${w.computed}/${commands.length}`);
    return a.startsWith('ERROR') ? null : JSON.parse(a)[0];
  };
  // the radio's airSettle: the commands as placed, a pending one without a place dropped; strip: `min` dropped (a batch
  // that entered)
  const settle = (list, r, strip = false) => { const by = new Map(r.commands.map(c => [c.id, c])); return list.flatMap(c => { const y = by.get(c.id); if (!y) return c.pend ? [] : [c]; const { pend, ...z } = { ...c, ...y }; if (strip) delete z.min; return [z]; }); };
  const playingAt = bar => stateAt(g0, Math.min(bars - 1, Math.floor(bar))).song.tracks.filter(t => !t.mute && t.type !== 'voice' && t.type !== 'spoken' && (t.clips || []).some(c => c.start <= bar && bar < c.start + c.bars));
  // a single console command, pending as the radio sends it
  const single = () => {
    const on = playingAt(q), track = (R.pick(on.length ? on : [{}]) || {}).id, part = R.pick(['bass', 'lead', 'pad', 'arp']);
    const d = Math.floor((q - airOffset(g0)) / (2 * ph)) + 1;
    const kinds = [{ kind: 'energy-up' }, { kind: 'energy-down' }, { kind: 'darker' }, { kind: 'more-space' }, { kind: 'vary', type: part, target: 'auto' }, { kind: 'swap', type: part }, { kind: 'curve', d, value: R.pick([0.2, 0.95]) }, { kind: 'riser', dir: R.pick(['up', 'down']) }, { kind: 'say-live', text: R.pick(['hello there', 'the night is long']), lang: 'en', speaker: '', mode: R.pick(['now', 'moment']) }, { kind: 'extend' }, ...(track ? [{ kind: 'mute', track }, { kind: 'volume', track, value: 0.3 }] : [])];
    const c = R.pick(kinds), at = airBoundaries(c.kind, q, g.plan, g0)[0];
    return at === undefined ? null : { ...c, q: Math.round(q * 100) / 100, at, pend: true, id: ++id };
  };
  // a batch of "+", "−", locks and a saved pattern on one boundary
  const batch = (after = -Infinity) => {
    const B = airBoundaries('more', q, g.plan, g0).find(b => b > after);
    if (B === undefined) return null;
    const b = ++batchN, out = [], n = R.int(1, 4);
    for (let j = 0; j < n; j++) {
      const r = R.next(), part = R.pick(INSTRUMENTS);
      const c = r < 0.55 ? { kind: 'more', part } : r < 0.75 ? { kind: 'less', part } : r < 0.85 ? { kind: R.pick(['lock-part', 'unlock-part']), part } : { kind: 'pattern', mode: 'new', item: PATTERN };
      out.push({ ...c, at: B, id: ++id, at0: B, q: Math.round(q * 100) / 100, pend: true, min: B, batch: b });
    }
    return out;
  };
  for (let p = 0; p < presses && q < bars - ph; p++, q += gap * R.range(0.6, 1.4)) {
    if (langAt && p === Math.floor(presses / 2)) language('it');
    const r = R.next();
    if (r < 0.3) {
      const c = single(); if (!c) continue;
      const res = steer([...standing, c], c.kind); if (res) standing = settle([...standing, c], res);
    } else if (r < 0.6) {
      const bt = batch(); if (!bt) continue;
      const res = steer([...standing, ...bt], 'batch'); if (res) standing = settle([...standing, ...bt], res, true);
    } else if (r < 0.72) {
      // a batch replaced before it enters (a press joined it: steered again with its new contents)
      const b1 = batch(); if (!b1) continue;
      steer([...standing, ...b1], 'batch');
      const extra = batch(); if (!extra) continue;
      const b2 = [...b1.slice(0, -1), ...extra.slice(0, 1).map(c => ({ ...c, at: b1[0].at, at0: b1[0].at, min: b1[0].at, batch: b1[0].batch }))];
      const res = steer([...standing, ...b2], 'replaced'); if (res) standing = settle([...standing, ...b2], res, true);
    } else if (r < 0.86) {
      // a second batch pending on top of the first (console-add-waves)
      const b1 = batch(); if (!b1) continue;
      const r1 = steer([...standing, ...b1], 'batch');
      const b2 = r1 ? batch(Math.max(...r1.commands.filter(c => b1.some(y => y.id === c.id)).map(c => c.at))) : null;
      if (!b2) { if (r1) standing = settle([...standing, ...b1], r1, true); continue; }
      const res = steer([...standing, ...b1, ...b2], 'stacked'); if (res) standing = settle([...standing, ...b1, ...b2], res, true);
    } else if (standing.length) {
      // a cancel of a standing command (anywhere: the steering does not know the bar now)
      const drop = R.int(0, standing.length - 1), next = standing.filter((_, j) => j !== drop);
      const res = steer(next, 'cancel'); if (res) standing = settle(next, res);
    }
  }
  // the same commands with another input the keys must hold: the song's index, the chooser, the controls
  const probe = (what, o) => { const A = { ...args(standing.map(c => ({ ...c }))), ...o }; const { a, b } = both(() => { const r = steerOnAir(A); return [r, steerView(A, r)]; }); if (a !== b) fails.push(`same commands, ${what}: reused ${hashOf(a)} vs full ${hashOf(b)}`); };
  if (standing.length) {
    probe('another song index', { n: 1 });
    probe('another chooser', { chooser: Object.keys(AIR_CHOOSERS).find(c => c !== AIR_CHOOSER) });
    probe('other controls', { controls: { ...airControls(g0.onAir.profile, g0.onAir.free), typing: 'slow', tracks: false } });
  }
  // compileNow with and without the cache, on a sample of bars of the final song (twice: kept, then reused); on the
  // song that changed language, the same bars in the other language too (they must differ, and match the full compile)
  const final = steerOnAir(args(standing.map(c => ({ ...c }))));
  let other = 0;
  for (let j = 0; j < 4; j++) {
    const bar = Math.floor(R.range(0, barsOf(final.song)));
    const codes = [];
    for (let t = 0; t < 2; t++) { const { a, b } = both(() => compileNow(final.song, bar, {})); codes.push(a); if (a !== b) fails.push(`compileNow bar ${bar}`); }
    if (langAt) {
      const now = getLang(); language(now === 'it' ? 'en' : 'it');
      const { a, b } = both(() => compileNow(final.song, bar, {}));
      if (a !== b) fails.push(`compileNow bar ${bar} after a language change`);
      if (a !== codes[0]) other++;
      language(now);
    }
  }
  if (langAt && !other) fails.push('the language change gave the same code on every bar sampled (the test does not bite)');
  const expect = hashOf(JSON.stringify([final, steerView(args(standing), final)]));
  if (langAt) language('en');
  return { id: `${profile}-${len || 'style'}-${k}`, kind: profile, k, len, seed: rec.seed, rec, standing, expect, calls, acts, fails, langAt: !!langAt, stats: memoStats() };
}

function classicTask({ i, len, seed, langAt }) {
  const rec = recipeOf(i, 'classic', len, `memo-${i}`);
  const g = createSession(RECIPES, rec.seed).next(rec.options), bars = barsOf(g.song), ph = g.plan.phrase;
  const R = stream(seed, `memo:classic:${i}:${len || 'style'}`), presses = R.int(6, 12), fails = [], acts = [];
  let commands = [], now = ph * 1.2, calls = 0, id = 0;
  const steer = (list, what) => {
    calls++;
    const { a, b, w } = both(() => steerSong({ ...g, commands: list.map(c => ({ ...c })), seed: rec.seed, n: 0 }));
    if (a !== b) fails.push(`${what} (press ${acts.length}): reused ${hashOf(a)} vs full ${hashOf(b)}`);
    acts.push(`${what}:${w.computed}/${list.length}`);
  };
  for (let p = 0; p < presses && now < bars - ph; p++, now += ph * R.range(0.5, 1.6)) {
    if (langAt && p === Math.floor(presses / 2)) language('it');
    const st = stateAt(g.song, Math.floor(now)).song, on = st.tracks.filter(t => !t.mute && t.type !== 'voice' && t.type !== 'spoken');
    const track = (R.pick(on.length ? on : [{}]) || {}).id, part = R.pick(INSTRUMENTS), type = R.pick(['bass', 'lead', 'pad', 'arp']);
    const d = Math.floor(now / (2 * ph)) + 1;
    const kinds = [{ kind: 'energy-up' }, { kind: 'energy-down' }, { kind: 'more', part }, { kind: 'less', part: (on.map(instrumentOf).filter(Boolean)[0]) || part }, { kind: 'lock-part', part }, { kind: 'unlock-part', part }, { kind: 'vary', type, target: 'auto' }, { kind: 'swap', type }, { kind: 'curve', d, value: R.pick([0.2, 0.95]) }, { kind: 'darker' }, { kind: 'more-space' }, { kind: 'riser', dir: 'up' }, { kind: 'say-live', text: 'hello there', lang: 'en', speaker: '', mode: 'now' }, { kind: 'extend' }, { kind: 'pattern', mode: 'new', item: PATTERN }, ...(track ? [{ kind: 'mute', track }, { kind: 'volume', track, value: 0.3 }] : [])];
    if (commands.length && R.chance(0.15)) { commands = commands.filter((_, j) => j !== R.int(0, commands.length - 1)); steer(commands, 'cancel'); continue; }
    const c = R.pick(kinds), at = applyBar(c.kind, now, g.plan);
    if (!(at > 0 && at < bars)) continue;
    commands = [...commands, { ...c, at, id: ++id }];
    steer(commands, c.kind);
  }
  const expect = hashOf(JSON.stringify(steerSong({ ...g, commands, seed: rec.seed, n: 0 })));
  if (langAt) language('en');
  return { id: `classic-${len || 'style'}-${i}`, kind: 'classic', k: i, len, rec, standing: commands, expect, calls, acts, fails, langAt: !!langAt, stats: memoStats() };
}

// a replay: the final commands of a song with nothing kept (a fresh worker), with the reuse on
function replayTask(t) {
  clearMemo();
  memoConfig.on = true;
  if (t.langAt) language('it');
  try { return replayed(t); } finally { if (t.langAt) language('en'); }
}
function replayed(t) {
  if (t.kind === 'classic') {
    const g = createSession(RECIPES, t.rec.seed).next(t.rec.options);
    return { id: t.id, ok: hashOf(JSON.stringify(steerSong({ ...g, commands: t.standing, seed: t.rec.seed, n: 0 }))) === t.expect };
  }
  const [x] = sessionItems(RECIPES, t.rec, 1, null, { grow: true });
  const g = createSession(RECIPES, t.rec.seed).next(t.rec.options);
  const A = { grown: x.song, song: g.song, plan: g.plan, opts: g.opts, commands: t.standing, seed: t.rec.seed, n: 0, ctx: { profile: t.kind, styles: STYLES, phrase: g.plan.phrase }, view: true };
  const r = steerOnAir(A);
  return { id: t.id, ok: hashOf(JSON.stringify([r, steerView(A, r)])) === t.expect };
}

export async function runTask(task) {
  const t0 = Date.now();
  const out = task.replay ? replayTask(task.replay) : task.kind === 'classic' ? classicTask(task) : grownTask(task);
  return { ...out, ms: Date.now() - t0 };
}

// ---------- main ----------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { runPool } = await import('./check-pool.mjs');
  const arg = (k, d) => { const j = process.argv.indexOf(`--${k}`); return j >= 0 ? process.argv[j + 1] : d; };
  const only = arg('only', null), seed = arg('seed', 'memo'), quick = process.argv.includes('--quick');
  const counts = { classic: 20, crescendo: 5, switch: 10 };
  if (arg('songs', null)) for (const k of Object.keys(counts)) counts[k] = +arg('songs');
  if (quick) Object.assign(counts, { classic: 4, crescendo: 2, switch: 2 });
  const tasks = [];
  for (const kind of ['classic', 'crescendo', 'switch']) {
    if (only && only !== kind) continue;
    for (let j = 0; j < counts[kind]; j++) {
      // a third at exact 10 minutes; the language changed halfway on the second song of each kind
      const len = j % 3 === 2 ? 10 : null, langAt = j === 1;
      tasks.push(kind === 'classic' ? { id: `classic-${j}`, kind, i: j, len, seed, langAt } : { id: `${kind}-${j}`, kind, profile: kind, i: j * 3, len, seed, langAt });
    }
  }
  const t0 = Date.now();
  console.log(`check:steer-memo: ${tasks.length} songs (seed ${seed})`);
  const res = (await runPool(fileURLToPath(import.meta.url), tasks, { name: 'check-steer-memo', onDone: (i, r, ms) => console.log(`  ${r.fails && r.fails.length ? 'FAIL' : r.skipped ? 'skip' : 'ok  '} ${r.id} ${r.calls || 0} steerings, ${(ms / 1000).toFixed(1)} s${r.fails && r.fails.length ? `\n      ${r.fails.join('\n      ')}` : ''}`) })).filter(r => !r.skipped);
  console.log('  replays with nothing kept…');
  const rep = await runPool(fileURLToPath(import.meta.url), res.map(r => ({ id: `replay-${r.id}`, replay: r })), { name: 'check-steer-memo-replay' });
  const bad = res.filter(r => r.fails.length), badRep = rep.filter(r => !r.ok);
  for (const r of badRep) console.log(`  FAIL ${r.id}: the replay differs from the live result`);
  const calls = res.reduce((a, r) => a + r.calls, 0), reused = res.flatMap(r => r.acts).filter(a => { const [x, y] = a.split(':')[1].split('/').map(Number); return x < y; }).length;
  console.log(`check:steer-memo: ${res.length} songs, ${calls} steerings compared (${reused} reused a kept prefix), ${rep.length} replays, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (bad.length || badRep.length || !reused) { console.log(`FAILED: ${bad.length} songs differ, ${badRep.length} replays differ${reused ? '' : ', nothing was reused'}`); process.exit(1); }
  console.log('PASS');
}
