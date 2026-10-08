// Command line for artists (docs/ARTISTS.md).
//   node tools/artist.mjs validate [file.json|dir …]   default artists/; errors and warnings with JSON paths; exit 1 on errors
//   node tools/artist.mjs list                         artists in artists/ (id, name, favourite styles, quirks)
// Run with `node --no-warnings` to hide Node's experimental localStorage warning.
import fs from 'node:fs';
import path from 'node:path';
import { artistFiles, loadArtists, ARTISTS_DIR } from './artists-dir.mjs';
import { loadStyles } from './styles-dir.mjs';
import { validateArtist } from '../src/endless/artist.js';

const [cmd, ...args] = process.argv.slice(2);
const styleIds = loadStyles().map(r => r.id);
if (cmd === 'validate') {
  const files = (args.length ? args : [ARTISTS_DIR]).flatMap(a => fs.statSync(a).isDirectory() ? artistFiles(a) : [a]);
  let bad = 0;
  for (const file of files) {
    const f = path.relative(process.cwd(), file);
    let a;
    try { a = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`${f}: error   (file): ${e.message}`); bad++; continue; }
    const { errors, warnings } = validateArtist(a, styleIds);
    for (const e of errors) console.log(`${f}: error   ${e.path || '(artist)'}: ${e.msg}`);
    for (const w of warnings) console.log(`${f}: warning ${w.path || '(artist)'}: ${w.msg}`);
    if (!errors.length && !warnings.length) console.log(`${f}: ok`);
    if (errors.length) bad++;
  }
  console.log(`${files.length - bad} of ${files.length} artists valid`);
  process.exit(bad ? 1 : 0);
} else if (cmd === 'list') {
  for (const a of loadArtists()) console.log(`${a.id.padEnd(16)} ${a.name.padEnd(18)} ${Object.keys(a.styles).join(', ')}${a.quirks ? ` · ${Object.keys(a.quirks).join(', ')}` : ''}`);
} else {
  console.log('usage: node tools/artist.mjs validate [file|dir …] | list');
  process.exit(cmd ? 1 : 0);
}
