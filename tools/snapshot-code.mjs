// Saves or checks the Strudel code generated for every song in songs/ (no browser needed).
// Usage: node --no-warnings tools/snapshot-code.mjs write | check
// Snapshots live in tests/snapshots/code/<song-id>.strudel. Comments are generated in English.
import fs from 'node:fs';
import path from 'node:path';
import { compileSong } from '../src/song/compile.js';
import { getLang } from '../src/i18n.js';
import { songFiles } from './songs-dir.mjs';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'tests', 'snapshots', 'code');
const mode = process.argv[2];
if (!['write', 'check'].includes(mode)) { console.error('usage: node tools/snapshot-code.mjs write | check'); process.exit(2); }
if (getLang() !== 'en') { console.error('expected English strings outside the browser'); process.exit(2); }
fs.mkdirSync(DIR, { recursive: true });

let failed = 0;
const ids = new Set();
// generated endless sessions (songs/endless/, git-ignored) change with every run: no snapshots
for (const file of songFiles(path.join(ROOT, 'songs')).filter(f => !f.includes(`${path.sep}endless${path.sep}`))) {
  const song = JSON.parse(fs.readFileSync(file, 'utf8'));
  ids.add(song.id);
  const snap = path.join(DIR, `${song.id}.strudel`);
  const code = compileSong(song) + '\n';
  if (mode === 'write') { fs.writeFileSync(snap, code); continue; }
  if (!fs.existsSync(snap)) { console.log(`NEW      ${song.id} (no snapshot)`); failed++; continue; }
  const old = fs.readFileSync(snap, 'utf8');
  if (old === code) { console.log(`ok       ${song.id}`); continue; }
  const a = old.split('\n'), b = code.split('\n');
  const i = a.findIndex((line, k) => line !== b[k]);
  console.log(`CHANGED  ${song.id} at line ${i + 1}\n  - ${a[i] ?? ''}\n  + ${b[i] ?? ''}`);
  failed++;
}
for (const f of fs.readdirSync(DIR)) if (f.endsWith('.strudel') && !ids.has(f.slice(0, -8))) {
  if (mode === 'write') fs.unlinkSync(path.join(DIR, f));
  else { console.log(`REMOVED  ${f.slice(0, -8)} (snapshot without song)`); failed++; }
}
if (mode === 'write') console.log(`wrote ${ids.size} snapshots to ${path.relative(process.cwd(), DIR)}`);
else console.log(failed ? `${failed} song(s) differ` : `all ${ids.size} songs match`);
process.exit(failed ? 1 : 0);
