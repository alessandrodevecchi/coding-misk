// Saves or checks the Strudel code generated for every built-in track (no browser needed).
// Usage: node tools/snapshot-code.mjs write | check
// Snapshots live in tests/snapshots/code/<track-id>.strudel. Comments are generated in English.
import fs from 'node:fs';
import path from 'node:path';
import { BUILTIN_TRACKS } from '../src/tracks.js';
import { compileTrack } from '../src/music.js';
import { getLang } from '../src/i18n.js';

const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'tests', 'snapshots', 'code');
const mode = process.argv[2];
if (!['write', 'check'].includes(mode)) { console.error('usage: node tools/snapshot-code.mjs write | check'); process.exit(2); }
if (getLang() !== 'en') { console.error('expected English strings outside the browser'); process.exit(2); }
fs.mkdirSync(DIR, { recursive: true });

let failed = 0;
const ids = new Set();
for (const track of BUILTIN_TRACKS) {
  ids.add(track.id);
  const file = path.join(DIR, `${track.id}.strudel`);
  const code = compileTrack(track) + '\n';
  if (mode === 'write') { fs.writeFileSync(file, code); continue; }
  if (!fs.existsSync(file)) { console.log(`NEW      ${track.id} (no snapshot)`); failed++; continue; }
  const old = fs.readFileSync(file, 'utf8');
  if (old === code) { console.log(`ok       ${track.id}`); continue; }
  const a = old.split('\n'), b = code.split('\n');
  const i = a.findIndex((line, k) => line !== b[k]);
  console.log(`CHANGED  ${track.id} at line ${i + 1}\n  - ${a[i] ?? ''}\n  + ${b[i] ?? ''}`);
  failed++;
}
for (const f of fs.readdirSync(DIR)) if (f.endsWith('.strudel') && !ids.has(f.slice(0, -8))) {
  if (mode === 'write') fs.unlinkSync(path.join(DIR, f));
  else { console.log(`REMOVED  ${f.slice(0, -8)} (snapshot without track)`); failed++; }
}
if (mode === 'write') console.log(`wrote ${ids.size} snapshots to ${path.relative(process.cwd(), DIR)}`);
else console.log(failed ? `${failed} track(s) differ` : `all ${ids.size} tracks match`);
process.exit(failed ? 1 : 0);
