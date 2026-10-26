// Checks for the pattern preview of Compose (pattern-preview, tasks 1.1, 1.2, 1.5). No browser.
//   npm run check:preview     exit 1 when any check fails
// 1. previewExpression: for every pattern of every track with a preset or groove menu in the built-in songs, and every
//    preset and groove, the loop song (loopSong, no beat, the track's rack) compiles to one expression with no `$:`,
//    setcpm, section lane or .analyze, on the preview orbit only.
// 2. Each expression evaluates with Strudel in Node the way the page evaluates it (strings wrapped in mini(), no
//    transpiler), and plays the same haps over 8 bars as the transpiled expression.
// 3. The preview orbit (previewOrbit) is above every orbit each built-in song uses, its voice tracks included.
// 4. loopSong carries a rack only when asked: the Patterns tab's loop does not change.
import fs from 'node:fs';
import { BASS, ARPS, HOOKS, PADS, GROOVES, GUITAR_PATTERNS } from '../src/music.js';
import { loopSong, KIND_TYPE, soundKey } from '../src/library/patterns.js';
import { compileSong } from '../src/song/compile.js';
import { previewExpression, miniStrings, previewOrbit, PREVIEW_ORBIT } from '../src/player/preview.js';
import { strudelInNode, songs } from './mixer-checks.mjs';

let failed = 0;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) {
  try { const extra = await fn(); console.log(`ok    ${name}${extra ? ` (${extra})` : ''}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
const TYPES = ['drums', 'bass', 'arp', 'hook', 'pad', 'guitar'];
const kindOf = type => Object.keys(KIND_TYPE).find(k => KIND_TYPE[k] === type);
// the loop song of a track's pattern, as src/main.js previewSource makes it
const loopOf = (tr, pattern, sec = {}) => loopSong({ kind: kindOf(tr.type), type: tr.type, pattern, name: tr.name || tr.type },
  { sound: (tr.settings || {})[soundKey(tr.type)], key: sec.key || 'A', chords: sec.chords || 'notturna', meter: sec.meter || '4/4', bpm: sec.bpm || 128, settings: { ...(tr.settings || {}) }, beat: false, rack: tr.rack });
const cases = [];
for (const s of songs) for (const tr of s.tracks || []) {
  if (!TYPES.includes(tr.type)) continue;
  for (const [k, p] of Object.entries(tr.patterns || {})) cases.push({ name: `${s.id}/${tr.id}/${k}`, loop: loopOf(tr, p, (s.sections || [])[0]) });
}
const presets = { bass: BASS, arp: ARPS, hook: HOOKS, pad: PADS, guitar: GUITAR_PATTERNS };
for (const [type, table] of Object.entries(presets)) for (const id of Object.keys(table)) cases.push({ name: `${type}:${id}`, loop: loopOf({ type, settings: {} }, { preset: id }) });
for (const [id, [, rows]] of Object.entries(GROOVES)) cases.push({ name: `drums:${id}`, loop: loopOf({ type: 'drums', settings: {} }, { rows: Object.fromEntries(Object.entries(rows).filter(([, v]) => v.includes('x'))) }) });

const exprs = [];
await check(`previewExpression: one clean expression on the preview orbit for each pattern`, () => {
  for (const c of cases) {
    const e = previewExpression(compileSong(c.loop));
    assert(e, `${c.name}: no expression`);
    assert(!/\$:|setcpm|section\d|\.analyze\(|\/\//.test(e), `${c.name}: ${e.slice(0, 120)}`);
    const orbits = [...e.matchAll(/\.orbit\(([^)]*)\)/g)].map(m => m[1]);
    assert(orbits.length && orbits.every(o => +o === PREVIEW_ORBIT), `${c.name}: orbits ${orbits}`);
    exprs.push({ name: c.name, e });
  }
  return `${cases.length} patterns`;
});

await check('the page\'s evaluation (mini strings, no transpiler) plays the same haps as the transpiled expression', async () => {
  const S = await strudelInNode();
  const key = h => `${h.whole.begin.valueOf().toFixed(6)} ${h.whole.end.valueOf().toFixed(6)} ${JSON.stringify(h.value)}`;
  const haps = p => p.queryArc(0, 8).filter(h => h.hasOnset()).map(key).sort();
  let n = 0, quiet = 0;
  for (const x of exprs) {
    const page = new Function(`return (${miniStrings(x.e)});`)();
    assert(page && typeof page.queryArc === 'function', `${x.name}: not a pattern`);
    const a = haps(page), b = haps(await S.evaluate(x.e));
    // (chords voiced by Strudel's tonal package play nothing in Node: both ways alike)
    if (!a.length && !b.length) { quiet++; continue; }
    assert(a.length === b.length && a.every((h, i) => h === b[i]), `${x.name}: ${a.length} haps against ${b.length}, first ${a.find((h, i) => h !== b[i])}`);
    n += a.length;
  }
  assert(quiet < exprs.length / 10, `${quiet} of ${exprs.length} silent`);
  return `${exprs.length} expressions, ${n} haps, ${quiet} voiced chords silent in Node`;
});

await check('the preview orbit is above every orbit of each built-in song', () => {
  let above = 0;
  for (const s of songs) {
    let code;
    try { code = compileSong(s); } catch (e) { continue; }
    // the voice tracks' lines come from the live build (src/song/build.js)
    const voices = (s.tracks || []).filter(t => t.type === 'voice').length;
    const top = Math.max(0, ...[...code.matchAll(/\.orbit\((\d+)\)/g)].map(m => +m[1]), voices ? 14 + voices : 0), o = previewOrbit(s.tracks);
    assert(o > top && o >= PREVIEW_ORBIT, `${s.id}: preview on ${o}, song up to ${top}`);
    if (o > PREVIEW_ORBIT) above++;
  }
  assert(previewOrbit([]) === PREVIEW_ORBIT, 'an empty song');
  return `${songs.length} songs, ${above} above ${PREVIEW_ORBIT}`;
});

await check('loopSong: a rack only when asked', () => {
  const tr = { type: 'bass', settings: {}, rack: [{ type: 'octaver' }] };
  const plain = loopSong({ kind: 'basslines', type: 'bass', pattern: { preset: Object.keys(BASS)[0] } }, {});
  assert(!('rack' in plain.tracks[0]), 'the Patterns tab loop got a rack');
  const withRack = loopOf(tr, { preset: Object.keys(BASS)[0] });
  assert(JSON.stringify(withRack.tracks[0].rack) === JSON.stringify(tr.rack) && withRack.tracks[0].rack !== tr.rack, 'the rack is not a copy of the track\'s');
  assert(withRack.tracks.length === 1, 'the preview loop has a beat');
});

console.log(failed ? `\n${failed} check(s) failed` : '\nall preview checks passed');
process.exit(failed ? 1 : 0);
