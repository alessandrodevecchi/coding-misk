// Growth counters of one song (growth-in-background D5): the shapes a growth tried, its free-duration rounds, the
// rushed steps and rushed load of each shape, the time spent on each and in all, and the shape kept. No browser.
// A shape is judged on the steps of its growth (shape-search D1): the rushed steps are split into the growth and the
// written part after it, and each rushed growth step that stays says why (fitted, not-unit, limit, rounds).
// The growth is the one Compose makes (crescendoSong with the profile's rules and the built-in styles), with the voice
// instrument's context of the page without measured voice lengths (the committed samples, as tools/song-durations.mjs).
//   npm run growth:probe -- <song> [--profile switch|crescendo] [--opening x] [--pace x] [--development x]
//                           [--duration free|fitted] [--narrated] [--lang en|it] [--cap n] [--json]
// <song>: an id in songs/ or songs/examples/ (luci-rosse, 04-ideas) or a path to a song file.
import fs from 'node:fs';
import path from 'node:path';
import { setSpokenContext } from '../src/song/spoken.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';

const args = process.argv.slice(2), flags = {}, rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--narrated' || a === '--json') flags[a.slice(2)] = true;
  else if (a.startsWith('--')) flags[a.slice(2)] = args[++i];
  else rest.push(a);
}
const usage = 'usage: npm run growth:probe -- <song> [--profile switch|crescendo] [--opening x] [--pace x] [--development x] [--duration free|fitted] [--narrated] [--lang en|it] [--cap n] [--json]';
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

const song = { ...JSON.parse(fs.readFileSync(file, 'utf8')), kind: 'composed' };
const over = Object.fromEntries(['opening', 'pace', 'development', 'duration'].filter(k => flags[k]).map(k => [k, flags[k]]));
if (flags.narrated) over.narrated = true;
const C = resolveProfile(profile, over), stats = {};
// --cap: the Settings value "Growth shapes tried" (shape-search D3), 8 when left out
const out = crescendoSong(song, { narrated: C.narrated, rules: growthRules(C, { styles }), ...(flags.cap ? { shapeCap: +flags.cap } : {}), stats });
const shape = out.crescendo && out.crescendo.shape;
if (flags.json) { console.log(JSON.stringify({ song: song.id, profile, options: over, shape: shape || null, ...stats }, null, 1)); process.exit(0); }

const sec = ms => (ms / 1000).toFixed(2);
const rows = stats.tried.map((t, i) => [String(i + 1), t.development ?? '-', t.pace ?? '-', t.maxDetail ?? '-', String(t.rounds), t.skipped ? `skip (${t.skipped})` : t.rushed ?? '-', t.rushedGrowth ?? '-', t.rushedWritten ?? '-', t.load == null ? '-' : t.load.toFixed(2), String(t.bars), sec(t.ms), i === stats.kept ? 'kept' : '']);
const head = ['#', 'development', 'pace', 'detail', 'rounds', 'rushed', 'growth', 'written', 'load', 'bars', 's', ''];
const w = head.map((h, k) => Math.max(h.length, ...rows.map(r => String(r[k]).length)));
const line = r => r.map((c, k) => String(c).padEnd(w[k])).join('  ').trimEnd();
console.log(`${song.id} · ${profile}${Object.keys(over).length ? ' ' + JSON.stringify(over) : ''}${stats.searched ? '' : ' · no search (one growth)'}`);
console.log(line(head));
for (const r of rows) console.log(line(r));
const grown = stats.tried.filter(t => !t.skipped).length;
console.log(`total ${sec(stats.ms)} s · ${stats.tried.length} shapes tried (${grown} measured, cap ${stats.cap}, at most ${2 * stats.cap}) · ${stats.tried.reduce((a, t) => a + t.rounds, 0)} free-duration rounds`);
const kept = stats.tried[stats.kept];
if (kept && kept.late && kept.late.length) console.log(`rushed growth steps kept: ${kept.late.map(x => `bar ${x.at} x${x.ratio} (${x.why})`).join(', ')}`);
if (shape) console.log(`kept: opening ${shape.opening}, pace ${shape.pace}, development ${shape.development}, rushed ${shape.rushed ?? '-'}${shape.fallback ? ', fallback' : ''} · ${(out.sections || []).reduce((a, x) => a + x.bars, 0)} bars`);
