// Command line for v2 songs (docs/SONG-FORMAT.md).
//   node tools/song.mjs validate <file.json|dir …>   errors and warnings with JSON paths; exit 1 on errors
//   node tools/song.mjs compile <file.json>          print the Strudel code
//   node tools/song.mjs list                         songs in songs/ (id, title, file)
// Run with `node --no-warnings` to hide Node's experimental localStorage warning.
import fs from 'node:fs';
import path from 'node:path';
import { songFiles } from './songs-dir.mjs';
import { validateSong } from '../src/song/validate.js';
import { compileSong } from '../src/song/compile.js';

const [cmd, ...args] = process.argv.slice(2);
const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`${f}: ${e.message}`); process.exit(1); } };

if (cmd === 'validate' && args.length) {
  let bad = 0;
  const files = args.flatMap(a => fs.statSync(a).isDirectory() ? songFiles(a) : [a]);
  for (const f of files) {
    const { errors, warnings } = validateSong(read(f));
    let compiled = '';
    if (!errors.length) try { compileSong(read(f)); } catch (e) { errors.push({ path: '', msg: `does not compile: ${e.message}` }); }
    for (const e of errors) console.log(`${f}: error   ${e.path || '(song)'}: ${e.msg}`);
    for (const w of warnings) console.log(`${f}: warning ${w.path || '(song)'}: ${w.msg}`);
    if (!errors.length && !warnings.length) console.log(`${f}: ok${compiled}`);
    if (errors.length) bad++;
  }
  process.exit(bad ? 1 : 0);
} else if (cmd === 'compile' && args[0]) {
  const song = read(args[0]), { errors } = validateSong(song);
  if (errors.length) { for (const e of errors) console.error(`error ${e.path}: ${e.msg}`); process.exit(1); }
  process.stdout.write(compileSong(song) + '\n');
} else if (cmd === 'list') {
  for (const f of songFiles('songs')) { const s = read(f); console.log(`${s.id}\t${s.title}\t${f}`); }
} else {
  console.error('usage: node tools/song.mjs validate <file|dir …> | compile <file> | list');
  process.exit(2);
}
