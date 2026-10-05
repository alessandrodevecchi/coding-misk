// Command line for v2 songs (docs/SONG-FORMAT.md).
//   node tools/song.mjs validate <file.json …>   errors and warnings with JSON paths; exit 1 on errors
//   node tools/song.mjs compile <file.json>      print the Strudel code
//   node tools/song.mjs export <track-id|all> [dir]   convert built-in tracks to v2 JSON (stdout, or files in dir)
//   node tools/song.mjs list                     built-in track ids
// Run with `node --no-warnings` to hide Node's experimental localStorage warning.
import fs from 'node:fs';
import path from 'node:path';
import { BUILTIN_TRACKS } from '../src/tracks.js';
import { fromScenes } from '../src/song/format.js';
import { validateSong } from '../src/song/validate.js';
import { compileSong } from '../src/song/compile.js';

const [cmd, ...args] = process.argv.slice(2);
const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`${f}: ${e.message}`); process.exit(1); } };
const json = o => JSON.stringify(o, null, 2) + '\n';

if (cmd === 'validate' && args.length) {
  let bad = 0;
  for (const f of args) {
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
} else if (cmd === 'export' && args[0]) {
  const list = args[0] === 'all' ? BUILTIN_TRACKS : BUILTIN_TRACKS.filter(t => t.id === args[0]);
  if (!list.length) { console.error(`unknown track "${args[0]}"; see: node tools/song.mjs list`); process.exit(1); }
  for (const tr of list) {
    const song = fromScenes(tr);
    if (!args[1]) { process.stdout.write(json(song)); continue; }
    fs.mkdirSync(args[1], { recursive: true });
    const f = path.join(args[1], `${tr.id}.json`);
    fs.writeFileSync(f, json(song));
    console.log(`wrote ${f}`);
  }
} else if (cmd === 'list') {
  for (const tr of BUILTIN_TRACKS) console.log(`${tr.id}\t${tr.title}`);
} else {
  console.error('usage: node tools/song.mjs validate <file …> | compile <file> | export <track-id|all> [dir] | list');
  process.exit(2);
}
