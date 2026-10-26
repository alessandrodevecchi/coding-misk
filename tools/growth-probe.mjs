// Growth counters of one song (growth-in-background D5): the shapes a growth tried, its free-duration rounds, the
// rushed steps and rushed load of each shape, the time spent on each and in all, and the shape kept. No browser.
// A shape is judged on the steps of its growth (shape-search D1): the rushed steps are split into the growth and the
// written part after it, and each rushed growth step that stays says why (fitted, not-unit, limit, rounds).
// The growth is the one Compose makes (crescendoSong with the profile's rules and the built-in styles), with the voice
// instrument's context of the page without measured voice lengths (the committed samples, as tools/song-durations.mjs).
//   npm run growth:probe -- <song> [--profile switch|crescendo] [--opening x] [--pace x] [--development x]
//                           [--duration free|fitted] [--narrated] [--lang en|it] [--cap n] [--all] [--keep first|best]
//                           [--fixed] [--long minutes] [--json]
// --all, --keep, --fixed, --long: the advanced settings Try all growth shapes, Keep, Random order off and Long song from
// (shape-search D6, D7)
// <song>: an id in songs/ or songs/examples/ (luci-rosse, 04-ideas) or a path to a song file; `all`: every built-in song
// (songs/index.json), one line each and the totals (reused lines, lines ahead, rushed steps, most muted lines shown).
import fs from 'node:fs';
import path from 'node:path';
import { setSpokenContext } from '../src/song/spoken.js';
import { crescendoSong, songSeconds } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps } from '../src/song/build.js';
import { typingPlan, settleOthers, chainLines, lineLike } from '../src/song/typing.js';
import { barSeconds, secondsAt } from '../src/live/typing-load.js';

const args = process.argv.slice(2), flags = {}, rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (['--narrated', '--json', '--all', '--fixed'].includes(a)) flags[a.slice(2)] = true;
  else if (a.startsWith('--')) flags[a.slice(2)] = args[++i];
  else rest.push(a);
}
const usage = 'usage: npm run growth:probe -- <song> [--profile switch|crescendo] [--opening x] [--pace x] [--development x] [--duration free|fitted] [--narrated] [--lang en|it] [--cap n] [--all] [--keep first|best] [--fixed] [--long minutes] [--json]   (<song>: an id, a path or all)';
if (!rest[0]) { console.error(usage); process.exit(2); }
const fileOf = id => [id, `songs/${id}.json`, `songs/examples/${id}.json`].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
const every = rest[0] === 'all', file = every ? null : fileOf(rest[0]);
if (!every && !file) { console.error(`no song ${rest[0]} (songs/, songs/examples/ or a path)\n${usage}`); process.exit(2); }
const profile = flags.profile || 'switch';
if (!['switch', 'crescendo'].includes(profile)) { console.error(`--profile must be switch or crescendo\n${usage}`); process.exit(2); }

// the samples manifest the dev server serves (vite.config.js), without the git-ignored spoken samples (say_*)
function committedManifest() {
  const dir = path.join('public', 'samples'), out = { _base: '/samples/' }, AUDIO = /\.(wav|mp3|ogg|flac|m4a|aac)$/i, clean = n => n.replace(/[^\w-]/g, '_');
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) {
    if (/^say_/.test(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { const files = fs.readdirSync(p).filter(f => AUDIO.test(f)).sort(); if (files.length) out[clean(name)] = files.map(f => encodeURI(`${name}/${f}`)); }
    else if (AUDIO.test(name)) out[clean(name.replace(AUDIO, ''))] = [encodeURI(name)];
  }
  return out;
}
const styles = Object.fromEntries(fs.readdirSync('styles').filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(`styles/${f}`, 'utf8'))).map(r => [r.id, r]));
setSpokenContext({ files: committedManifest(), lengths: {}, lang: flags.lang || 'en', styles });

// The written part (written-like-coder D4): the code the profile shows (80 columns), typed as the app types it
// (typingLoad): for each step from the bar the growth ends (crescendo.growth), the typing needed at a person's pace
// (lean, no line pasted as from notes: that one in eight moves with the text, so the measure would too), the time the
// step leaves (usable), the new lines pasted when it does not fit (the paste rule: the fitted duration pastes at most
// one line a minute, the free duration none; the rest is typed faster, ratio above 1).
// → { from, steps: [{ at, section (name, at a section change), need, usable, pasted, ratio }], total: { … } }
function writtenPart(build, C) {
  if (!build.crescendo || build.crescendo.growth === undefined) return null;
  const G = build.crescendo.growth, L = liveCode(build, C, { cols: () => 80 }), sb = barSeconds(build), seed = build.id || '';
  const starts = new Map();
  let a = 0;
  for (const s of build.sections) { starts.set(a, s.name); a += s.bars; }
  const bars = [...new Set(buildSteps(L.build).map(x => x.at))].filter(b => b >= 1).sort((x, y) => x - y), memo = new Map();
  const codeAt = b => { if (!memo.has(b)) memo.set(b, L.codeAt(b)); return memo.get(b); };
  const steps = [];
  let prev = 0;
  for (const at of bars) {
    if (at >= G) {
      const code = codeAt(at), was = settleOthers(codeAt(prev), code, at);
      const avail = Math.max(0.2, (at - prev - 0.5) * sb - 0.2), usable = Math.max(0.2, avail - Math.min(avail * 0.5, 2));
      const earlier = L.earlier ? L.earlier(at) : null;
      const need = was === code ? 0 : typingPlan(was, code, { style: 'human', lean: true, seed, notes: false, earlier }).natural;
      const plan = was === code ? { natural: 0, forced: 0 } : typingPlan(was, code, { style: 'human', lean: true, seed, notes: false, max: usable, force: L.paste ? L.paste(at) : Infinity, earlier });
      steps.push({ at, section: starts.get(at) || null, need, usable, pasted: plan.forced || 0, ratio: plan.natural / usable });
    } else codeAt(at);
    prev = at;
  }
  const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0), changes = steps.filter(x => x.section);
  const tot = xs => ({ steps: xs.length, need: sum(xs, x => x.need), usable: sum(xs, x => x.usable), pasted: sum(xs, x => x.pasted), rushed: xs.filter(x => x.ratio > 1.1).length });
  return { from: G, steps, total: { all: tot(steps), changes: tot(changes) } };
}

// Reused lines (reused-lines, design Context): a pattern line typed new (no like line among the lines it replaces,
// lineLike below 0.5) although a line at least 0.8 alike was shown at an earlier step and has left the code. Pasted
// from earlier code (reused-lines D3) it is counted as copied, not as reused. Also, per song: the lines typed ahead,
// muted (D8), the rushed steps (ratio above 1.1) and the most muted lines the code shows at once.
// scratch: those typed key by key (not copied from a like line above: too short, under 40 characters).
// → { lines, reused, scratch, identical, growth, written, rushed, copied, chars, maxRatio, ahead, rushedSteps, mostMuted, list }
function reusedLines(build, C) {
  const L = liveCode(build, C, { cols: () => 80 }), seed = build.id || '', G = build.crescendo && build.crescendo.growth !== undefined ? build.crescendo.growth : Infinity;
  const bars = [...new Set(buildSteps(L.build).map(x => x.at))].filter(b => b >= 1).sort((x, y) => x - y), memo = new Map();
  const codeAt = b => { if (!memo.has(b)) memo.set(b, L.codeAt(b)); return memo.get(b); };
  const body = l => l.replace(/^\s*[_S]?\$:\s*/, '').replace(/\s+/g, ' ').trim(), isPat = l => /^\s*[_S]?\$:/.test(l);
  const sb = b => secondsAt(L.build, b), shown = new Set(), list = [], earlier = [];
  let prev = 0, lines = 0, rushedSteps = 0, mostMuted = 0;
  for (const b of [0, ...bars]) mostMuted = Math.max(mostMuted, chainLines(codeAt(b)).filter(l => /^\s*_\$:/.test(l)).length);
  for (const l of chainLines(codeAt(0)).filter(isPat)) { shown.add(body(l)); earlier.push(l); }
  for (const at of bars) {
    const code = codeAt(at), was = settleOthers(codeAt(prev), code, at);
    const W = chainLines(was).filter(isPat), N = chainLines(code).filter(isPat), wasB = new Set(W.map(body)), nB = new Set(N.map(body));
    const avail = Math.max(0.2, sb(at) - sb(prev + 0.5) - 0.2), usable = Math.max(0.2, avail - Math.min(avail * 0.5, 2));
    const plan = was === code ? { natural: 0, lines: [] } : typingPlan(was, code, { style: 'human', lean: true, seed, notes: false, earlier });
    const ratio = plan.natural / usable;
    if (ratio > 1.1) rushedSteps++;
    const how = new Map((plan.lines || []).map(x => [body(x.text), x.how]));
    for (const l of N.filter(x => !wasB.has(body(x)))) {
      lines++;
      const b = body(l);
      let inWas = 0; for (const w of W) { if (nB.has(body(w))) continue; inWas = Math.max(inWas, lineLike(w, l)); }
      let past = 0, pastB = null; for (const h of shown) { if (wasB.has(h)) continue; const v = lineLike(`$: ${h}`, `$: ${b}`); if (v > past) { past = v; pastB = h; } }
      if (past >= 0.8 && inWas < 0.5) list.push({ at, written: at >= G, len: b.length, like: +past.toFixed(2), identical: pastB === b, ratio: +ratio.toFixed(2), copied: how.get(b) === 'earlier', how: how.get(b) || null, line: b });
    }
    for (const l of N) { if (!shown.has(body(l))) earlier.push(l); shown.add(body(l)); }
    prev = at;
  }
  const typed = list.filter(x => !x.copied);
  return { lines, reused: typed.length, scratch: typed.filter(x => !x.how || x.how === 'typed').length, identical: typed.filter(x => x.identical).length, growth: typed.filter(x => !x.written).length, written: typed.filter(x => x.written).length, rushed: typed.filter(x => x.ratio > 1.1).length, copied: list.length - typed.length, chars: typed.reduce((a, x) => a + x.len, 0), maxRatio: Math.max(0, ...typed.map(x => x.ratio)), ahead: L.ahead ? L.ahead().length : 0, rushedSteps, mostMuted, list };
}

const over = Object.fromEntries(['opening', 'pace', 'development', 'duration'].filter(k => flags[k]).map(k => [k, flags[k]]));
if (flags.narrated) over.narrated = true;
const C = resolveProfile(profile, over);
// one song grown as Compose grows it, with its counters
function probe(f) {
  const song = { ...JSON.parse(fs.readFileSync(f, 'utf8')), kind: 'composed' }, stats = {};
  // --cap: the Settings value "Growth shapes tried" (shape-search D3), 8 when left out
  const out = crescendoSong(song, { narrated: C.narrated, rules: growthRules(C, { styles }), ...(flags.cap ? { shapeCap: +flags.cap } : {}), shapeAll: !!flags.all, shapeKeep: flags.keep, shapeRandom: !flags.fixed, ...(flags.long ? { longSong: 60 * +flags.long } : {}), stats });
  return { song, out, stats, shape: out.crescendo && out.crescendo.shape, written: writtenPart(out, C), reused: out.crescendo ? reusedLines(out, C) : null };
}
if (every) {
  const ids = JSON.parse(fs.readFileSync('songs/index.json', 'utf8')).map(x => (typeof x === 'string' ? x : x.id)), rows = [];
  const T = { songs: 0, lines: 0, reused: 0, scratch: 0, identical: 0, growth: 0, written: 0, rushed: 0, copied: 0, chars: 0, ahead: 0, rushedSteps: 0, mostMuted: 0, writtenRushed: 0 };
  for (const id of ids) {
    const p = probe(fileOf(id)), r = p.reused;
    if (!r) continue;
    const row = { id, ...Object.fromEntries(Object.keys(T).filter(k => k in r).map(k => [k, r[k]])), writtenRushed: p.written ? p.written.total.all.rushed : 0, shape: p.shape ? `${p.shape.opening}/${p.shape.pace}/${p.shape.development}` : null, bars: (p.out.sections || []).reduce((a, x) => a + x.bars, 0) };
    rows.push(flags.json ? { ...row, list: r.list } : row);
    T.songs++;
    for (const k of Object.keys(T)) if (k !== 'songs') T[k] = k === 'mostMuted' ? Math.max(T[k], row[k]) : T[k] + row[k];
    if (!flags.json) console.log(`${id}: reused ${row.reused} (key by key ${row.scratch}, identical ${row.identical}, growth ${row.growth}, written ${row.written}, rushed ${row.rushed}), copied ${row.copied}, ahead ${row.ahead}, rushed steps ${row.rushedSteps} (written ${row.writtenRushed}), most muted ${row.mostMuted} · ${row.shape} ${row.bars} bars`);
  }
  if (flags.json) console.log(JSON.stringify({ profile, options: over, songs: rows, total: T }, null, 1));
  else console.log(`total over ${T.songs} songs: ${T.lines} new pattern lines; reused ${T.reused} (key by key ${T.scratch}, identical ${T.identical}, growth ${T.growth}, written ${T.written}, rushed ${T.rushed}, ${T.chars} characters); copied from earlier code ${T.copied}; lines ahead ${T.ahead}; rushed steps ${T.rushedSteps} (written part ${T.writtenRushed}); most muted lines shown ${T.mostMuted}`);
  process.exit(0);
}
const { song, out, stats, shape, written, reused } = probe(file);
if (flags.json) { console.log(JSON.stringify({ song: song.id, profile, options: over, shape: shape || null, ...stats, written, reused }, null, 1)); process.exit(0); }

const sec = ms => (ms / 1000).toFixed(2);
const mmss = x => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`;
const rows = stats.tried.map((t, i) => [String(i + 1), t.development ?? '-', t.pace ?? '-', t.maxDetail ?? '-', String(t.rounds), t.skipped ? `skip (${t.skipped})` : t.rushed ?? '-', t.rushedGrowth ?? '-', t.rushedWritten ?? '-', t.load == null ? '-' : t.load.toFixed(2), String(t.bars), t.seconds == null ? '-' : mmss(t.seconds), sec(t.ms), i === stats.kept ? 'kept' : '']);
const head = ['#', 'development', 'pace', 'detail', 'rounds', 'rushed', 'growth', 'written', 'load', 'bars', 'length', 's', ''];
const w = head.map((h, k) => Math.max(h.length, ...rows.map(r => String(r[k]).length)));
const line = r => r.map((c, k) => String(c).padEnd(w[k])).join('  ').trimEnd();
console.log(`${song.id} · ${profile}${Object.keys(over).length ? ' ' + JSON.stringify(over) : ''}${stats.searched ? '' : ' · no search (one growth)'}`);
console.log(line(head));
for (const r of rows) console.log(line(r));
const grown = stats.tried.filter(t => !t.skipped).length;
console.log(`total ${sec(stats.ms)} s · ${stats.tried.length} shapes tried (${grown} measured, ${stats.all ? `all, keep ${stats.keep}` : `cap ${stats.cap}, at most ${2 * stats.cap}`}, ${stats.random ? 'random' : 'fixed'} order) · ${stats.tried.reduce((a, t) => a + t.rounds, 0)} free-duration rounds`);
if (stats.long) console.log(`long song (over ${mmss(stats.longSong)}): every shape measured, ${mmss(stats.long.from)} → ${mmss(stats.long.to)}`);
const kept = stats.tried[stats.kept];
if (kept && kept.late && kept.late.length) console.log(`rushed growth steps kept: ${kept.late.map(x => `bar ${x.at} x${x.ratio} (${x.why})`).join(', ')}`);
if (shape) console.log(`kept: opening ${shape.opening}, pace ${shape.pace}, development ${shape.development}, rushed ${shape.rushed ?? '-'}${shape.fallback ? ', fallback' : ''} · ${(out.sections || []).reduce((a, x) => a + x.bars, 0)} bars, ${mmss(songSeconds(out))}`);
if (written) {
  const f = x => x.toFixed(1);
  console.log(`written part from bar ${written.from} (the code as ${profile} shows it): section changes`);
  const wr = written.steps.filter(x => x.section).map(x => [String(x.at), x.section, f(x.need), f(x.usable), String(x.pasted), x.ratio.toFixed(2)]);
  const wh = ['bar', 'section', 'need s', 'usable s', 'pasted', 'ratio'];
  const ww = wh.map((h, k) => Math.max(h.length, ...wr.map(r => r[k].length)));
  const wl = r => r.map((c, k) => c.padEnd(ww[k])).join('  ').trimEnd();
  console.log(wl(wh));
  for (const r of wr) console.log(wl(r));
  const c = written.total.changes, a = written.total.all;
  console.log(`section changes: need ${f(c.need)} s in ${f(c.usable)} s, ${c.pasted} pasted, ${c.rushed} rushed · every written step (${a.steps}): need ${f(a.need)} s in ${f(a.usable)} s, ${a.pasted} pasted, ${a.rushed} rushed`);
}
if (reused) {
  console.log(`reused lines (typed new though a line at least 0.8 alike was shown earlier): ${reused.reused} of ${reused.lines} new pattern lines (key by key ${reused.scratch}, identical ${reused.identical}, growth ${reused.growth}, written ${reused.written}, rushed ${reused.rushed}); copied from earlier code ${reused.copied}; lines ahead ${reused.ahead}; rushed steps ${reused.rushedSteps}; most muted lines shown ${reused.mostMuted}`);
  for (const x of reused.list) console.log(`  bar ${x.at}${x.written ? ' (written)' : ''} like ${x.like}${x.identical ? ' identical' : ''} ratio ${x.ratio} ${x.how || 'typed'}: ${x.line.slice(0, 90)}`);
}
