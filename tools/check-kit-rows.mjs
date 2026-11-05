// Drum rows of every kit (varied-openings D6): every drum machine a style recipe lists has a sample for each row its
// grooves play, and every kit of the hand-pick list (KITS) for the six song rows, unless KIT_MISSING (src/music.js)
// names the row so it falls back to the nearest one. The rows each bank has come from a committed snapshot of the drum
// machine index (tests/snapshots/kit-rows.json), so the check needs no network. No browser.
//   npm run check:kit-rows
//   npm run check:kit-rows -- --write [index.json | URL]   rewrite the snapshot from the drum machine index
import fs from 'node:fs';
import { GROOVES, KITS, ROWS, KIT_MISSING, NO_CRASH } from '../src/music.js';
import { MACHINES } from '../src/sounds/machines.js';
import { loadStyles } from './styles-dir.mjs';

const SNAP = 'tests/snapshots/kit-rows.json';
const INDEX = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json';
const args = process.argv.slice(2);

if (args.includes('--write')) {
  const src = args[args.indexOf('--write') + 1] || INDEX;
  const index = /^https?:/.test(src) ? await (await fetch(src)).json() : JSON.parse(fs.readFileSync(src, 'utf8'));
  const rows = {};
  for (const key of Object.keys(index).filter(k => !k.startsWith('_')).sort()) {
    const i = key.lastIndexOf('_'), bank = key.slice(0, i), row = key.slice(i + 1);
    if (MACHINES.includes(bank) && (index[key] || []).length) (rows[bank] ||= []).push(row);
  }
  fs.writeFileSync(SNAP, JSON.stringify({ source: 'tidal-drum-machines.json', banks: rows }, null, 1) + '\n');
  console.log(`wrote ${SNAP}: ${Object.keys(rows).length} banks`);
  process.exit(0);
}

const { banks } = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
const errors = [];
// the rows a kit lacks that do not fall back
const lacks = (kit, rows) => rows.filter(r => !(banks[kit] || []).includes(r) && !(KIT_MISSING[kit] || []).includes(r));
for (const r of loadStyles()) {
  const d = r.drums || {};
  const rows = [...new Set((d.grooves || []).flatMap(g => Object.entries((GROOVES[g] || [])[1] || {}).filter(([, v]) => /x/.test(v)).map(([row]) => row)))];
  for (const kit of d.kits || []) {
    if (!banks[kit]) { errors.push(`styles/${r.id}.json: drums.kits ${kit} is not in the drum machine index`); continue; }
    const miss = lacks(kit, rows);
    if (miss.length) errors.push(`styles/${r.id}.json: drums.kits ${kit} has no ${miss.join(', ')} (played by ${d.grooves.join(', ')}); add them to KIT_MISSING or drop the kit`);
  }
}
const SIX = ROWS.map(r => r[0]);
for (const kit of KITS) {
  const miss = lacks(kit, SIX);
  if (!banks[kit]) errors.push(`KITS ${kit} is not in the drum machine index`);
  else if (miss.length) errors.push(`KITS ${kit} has no ${miss.join(', ')}; add them to KIT_MISSING`);
}
// a kit without a crash takes the fills' crash from another kit (NO_CRASH); (LinnLM1's fill crash was silent before
// varied-openings and is left as it is, so the code of its songs does not move)
for (const kit of new Set([...KITS, ...loadStyles().flatMap(r => (r.drums || {}).kits || [])])) if (banks[kit] && !banks[kit].includes('cr') && !NO_CRASH.includes(kit) && kit !== 'LinnLM1') errors.push(`${kit} has no crash for the fills; add it to NO_CRASH (src/music.js)`);
// a style kit must be in the hand-pick list (varied-openings D10)
for (const r of loadStyles()) for (const kit of (r.drums || {}).kits || []) if (!KITS.includes(kit)) errors.push(`styles/${r.id}.json: drums.kits ${kit} is not in KITS (src/music.js)`);
errors.forEach(e => console.log(`FAIL  ${e}`));
console.log(errors.length ? `\n${errors.length} problem(s)` : 'every recipe kit and every KITS entry has its rows or falls back');
process.exit(errors.length ? 1 : 0);
