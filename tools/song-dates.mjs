// Fills `created` and `appVersion` of the songs in songs/ that have none (#67), once: the date of the commit that
// added the file, and the release tag in force at that date (0.1.0 before the first one). Writes the files in place.
//   node tools/song-dates.mjs [--dry]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { songFiles } from './songs-dir.mjs';

const dry = process.argv.includes('--dry');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const tags = git('for-each-ref', '--sort=creatordate', '--format=%(creatordate:short) %(refname:short)', 'refs/tags').split('\n').filter(Boolean)
  .map(l => { const [d, n] = l.split(' '); return { d, v: n.replace(/^v/, '') }; }).filter(x => /^\d+\.\d+\.\d+$/.test(x.v));
let done = 0;
for (const f of songFiles('songs').filter(f => !f.includes('/endless/'))) {
  const song = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (song.created && song.appVersion) continue;
  const date = git('log', '--diff-filter=A', '--follow', '--format=%ad', '--date=short', '--', f).split('\n').filter(Boolean).pop() || new Date().toISOString().slice(0, 10);
  const version = (tags.filter(x => x.d <= date).pop() || { v: '0.1.0' }).v;
  // after id and title, so the file reads in order
  const out = {};
  for (const [k, v] of Object.entries(song)) { out[k] = v; if (k === 'title') { out.created = song.created || date; out.appVersion = song.appVersion || version; } }
  if (!dry) fs.writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
  console.log(`${f}: ${out.created} · ${out.appVersion}`);
  done++;
}
console.log(`${done} song(s)${dry ? ' (dry run)' : ''}`);
