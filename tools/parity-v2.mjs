// Checks that every built-in track, converted to the v2 song format, compiles to the same layers as the v1 compiler.
// Usage: node --no-warnings tools/parity-v2.mjs
import { BUILTIN_TRACKS } from '../src/tracks.js';
import { compileTrackV1 } from '../src/music.js';
import { compileSong } from '../src/song/compile.js';
import { fromScenes } from '../src/song/format.js';

// layers = "$:" lines with their indented continuation lines; lane names unified
const layers = (code, lane) => {
  const out = [];
  for (const line of code.split('\n')) {
    if (/^_?\$:/.test(line)) out.push(line);
    else if (/^\s+\./.test(line) && out.length) out[out.length - 1] += '\n' + line;
  }
  return out.map(l => l.replace(lane, 'LANE$1')).sort();
};
let bad = 0;
for (const tr of BUILTIN_TRACKS) {
  const a = layers(compileTrackV1(tr), /scene(\d+)/g), b = layers(compileSong(fromScenes(tr)), /section(\d+)/g);
  const missing = a.filter(x => !b.includes(x)), extra = b.filter(x => !a.includes(x));
  if (!missing.length && !extra.length && a.length === b.length) { console.log(`ok    ${tr.id} (${a.length} layers)`); continue; }
  bad++;
  console.log(`DIFF  ${tr.id}: v1 ${a.length} layers, v2 ${b.length}`);
  for (const x of missing.slice(0, 2)) console.log('  only v1:', x.split('\n')[0].slice(0, 160));
  for (const x of extra.slice(0, 2)) console.log('  only v2:', x.split('\n')[0].slice(0, 160));
}
console.log(bad ? `${bad} track(s) differ` : 'all tracks compile to the same layers');
process.exit(bad ? 1 : 0);
