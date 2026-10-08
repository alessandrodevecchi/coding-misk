// Endless sessions from the command line (docs/ENDLESS.md).
//   node tools/endless.mjs --styles berlin-techno[,jazz…] [--chaos 0.3] [--energy 0.6] [--complexity 0.5] [--talk 0.5]
//                          [--minutes 15] [--seed text] [--out songs/endless] [--join] [--quiet]
// Writes one song file per song and session.json in --out, prints the seed and a report.
// --join also writes one song with the whole session in order, to play in Compose as a single live build.
// Run with `node --no-warnings` to hide Node's experimental localStorage warning.
import fs from 'node:fs';
import path from 'node:path';
import { loadStyles } from './styles-dir.mjs';
import { validateRecipe } from '../src/endless/recipe.js';
import { generateSession, OPTION_DEFAULTS } from '../src/endless/director.js';
import { joinSession } from '../src/endless/join.js';
import { validateSong } from '../src/song/validate.js';

const args = process.argv.slice(2);
const fail = msg => { console.error(`error: ${msg}`); process.exit(1); };
const opt = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const KNOWN = ['styles', 'chaos', 'energy', 'complexity', 'talk', 'minutes', 'seed', 'out', 'join', 'quiet', 'help'];
for (const a of args) if (a.startsWith('--') && !KNOWN.includes(a.slice(2))) fail(`unknown option ${a}; options: ${KNOWN.map(k => `--${k}`).join(' ')}`);
if (args.includes('--help') || !args.length) {
  console.log('usage: node tools/endless.mjs --styles id[,id…] [--chaos 0-1] [--energy 0-1] [--complexity 0-1] [--talk 0-1] [--minutes n] [--seed text] [--out dir] [--join] [--quiet]');
  process.exit(args.length ? 0 : 1);
}

// every check happens before anything is written
const recipes = loadStyles();
const bad = recipes.filter(r => validateRecipe(r).errors.length);
if (bad.length) fail(`invalid recipes: ${bad.map(r => r.id).join(', ')}; run node --no-warnings tools/style.mjs validate`);
const ids = recipes.map(r => r.id);
const stylesArg = opt('styles');
if (!stylesArg) fail(`--styles is required; available styles: ${ids.join(', ')}`);
const styles = stylesArg.split(',').map(s => s.trim()).filter(Boolean);
const unknown = styles.filter(s => !ids.includes(s));
if (unknown.length) fail(`unknown style ${unknown.join(', ')}; available styles: ${ids.join(', ')}`);
const amount = name => {
  const v = opt(name);
  if (v === undefined) return OPTION_DEFAULTS[name];
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1) fail(`--${name} must be a number from 0 to 1 (got ${v})`);
  return n;
};
const options = { styles, chaos: amount('chaos'), energy: amount('energy'), complexity: amount('complexity'), talk: amount('talk'), minutes: OPTION_DEFAULTS.minutes };
if (opt('minutes') !== undefined) {
  const m = Number(opt('minutes'));
  if (!Number.isFinite(m) || m < 2 || m > 600) fail(`--minutes must be a number from 2 to 600 (got ${opt('minutes')})`);
  options.minutes = m;
}
if (opt('seed') !== undefined) options.seed = opt('seed');
const out = opt('out') || path.join('songs', 'endless');

const { session, songs } = generateSession(recipes, options);
const files = songs.map(s => ({ name: `${s.id}.json`, song: s }));
if (args.includes('--join')) files.push({ name: `${session.songs[0].id.replace(/-1$/, '')}-joined.json`, song: joinSession(session, songs) });
for (const f of files) {
  const { errors } = validateSong(f.song);
  if (errors.length) fail(`${f.name} is not a valid song (${errors[0].path}: ${errors[0].msg}); nothing written`);
}

// write: replace the files of the previous session in the same folder
fs.mkdirSync(out, { recursive: true });
const old = path.join(out, 'session.json');
if (fs.existsSync(old)) {
  try { for (const n of JSON.parse(fs.readFileSync(old, 'utf8')).files || []) fs.rmSync(path.join(out, n), { force: true }); } catch { /* an unreadable old session is overwritten below */ }
}
for (const f of files) fs.writeFileSync(path.join(out, f.name), JSON.stringify(f.song, null, 2) + '\n');
fs.writeFileSync(old, JSON.stringify({ ...session, files: files.map(f => f.name) }, null, 2) + '\n');

// report
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
console.log(`seed: ${session.seed}`);
console.log(`styles: ${styles.join(', ')} · chaos ${options.chaos} · energy ${options.energy} · complexity ${options.complexity} · ${session.songs.length} songs · ${mmss(session.seconds)}`);
session.songs.forEach((e, i) => {
  const parts = Object.entries(e.parts).filter(([k]) => k !== 'dominant').map(([k, v]) => `${k}=${v}`).join(' ');
  const voice = `voice ${e.voice.speaker || 'default'}${e.voice.character ? ` (${e.voice.character})` : ''}`;
  console.log(`\n#${i + 1} "${e.title}" · ${mmss(e.seconds)} · ${e.bpm} BPM · ${e.key} ${e.meter} · ${e.shape} · ${e.tracks} tracks · ${voice} · ${parts}`);
  if (args.includes('--quiet')) return;
  for (const p of e.phrases) console.log(`  bar ${String(p.bar + 1).padStart(3)}  ${p.role.padEnd(7)} target ${p.target.toFixed(2)}  energy ${p.energy.toFixed(2)}  ${p.moves.join(', ') || '-'}${p.say ? `  "${p.say}"` : ''}`);
});
console.log(`\nwrote ${files.length} songs and session.json to ${out}`);
