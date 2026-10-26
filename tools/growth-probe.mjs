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
// <song>: an id in songs/ or songs/examples/ (luci-rosse, 04-ideas) or a path to a song file.
import fs from 'node:fs';
import path from 'node:path';
import { setSpokenContext } from '../src/song/spoken.js';
import { crescendoSong, songSeconds } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps } from '../src/song/build.js';
import { typingPlan, settleOthers } from '../src/song/typing.js';
import { barSeconds } from '../src/live/typing-load.js';

const args = process.argv.slice(2), flags = {}, rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (['--narrated', '--json', '--all', '--fixed'].includes(a)) flags[a.slice(2)] = true;
  else if (a.startsWith('--')) flags[a.slice(2)] = args[++i];
  else rest.push(a);
}
const usage = 'usage: npm run growth:probe -- <song> [--profile switch|crescendo] [--opening x] [--pace x] [--development x] [--duration free|fitted] [--narrated] [--lang en|it] [--cap n] [--all] [--keep first|best] [--fixed] [--long minutes] [--json]';
if (!rest[0]) { console.error(usage); process.exit(2); }
const file = [rest[0], `songs/${rest[0]}.json`, `songs/examples/${rest[0]}.json`].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
if (!file) { console.error(`no song ${rest[0]} (songs/, songs/examples/ or a path)\n${usage}`); process.exit(2); }
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
      const need = was === code ? 0 : typingPlan(was, code, { style: 'human', lean: true, seed, notes: false }).natural;
      const plan = was === code ? { natural: 0, forced: 0 } : typingPlan(was, code, { style: 'human', lean: true, seed, notes: false, max: usable, force: L.paste ? L.paste(at) : Infinity });
      steps.push({ at, section: starts.get(at) || null, need, usable, pasted: plan.forced || 0, ratio: plan.natural / usable });
    } else codeAt(at);
    prev = at;
  }
  const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0), changes = steps.filter(x => x.section);
  const tot = xs => ({ steps: xs.length, need: sum(xs, x => x.need), usable: sum(xs, x => x.usable), pasted: sum(xs, x => x.pasted), rushed: xs.filter(x => x.ratio > 1.1).length });
  return { from: G, steps, total: { all: tot(steps), changes: tot(changes) } };
}

const song = { ...JSON.parse(fs.readFileSync(file, 'utf8')), kind: 'composed' };
const over = Object.fromEntries(['opening', 'pace', 'development', 'duration'].filter(k => flags[k]).map(k => [k, flags[k]]));
if (flags.narrated) over.narrated = true;
const C = resolveProfile(profile, over), stats = {};
// --cap: the Settings value "Growth shapes tried" (shape-search D3), 8 when left out
const out = crescendoSong(song, { narrated: C.narrated, rules: growthRules(C, { styles }), ...(flags.cap ? { shapeCap: +flags.cap } : {}), shapeAll: !!flags.all, shapeKeep: flags.keep, shapeRandom: !flags.fixed, ...(flags.long ? { longSong: 60 * +flags.long } : {}), stats });
const shape = out.crescendo && out.crescendo.shape;
const written = writtenPart(out, C);
if (flags.json) { console.log(JSON.stringify({ song: song.id, profile, options: over, shape: shape || null, ...stats, written }, null, 1)); process.exit(0); }

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
