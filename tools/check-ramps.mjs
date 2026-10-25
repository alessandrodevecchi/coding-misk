// Checks for long literal lists written as ramps (shape-search D8). No browser.
//   npm run check:ramps [-- --songs a,b]     exit 1 when any check fails
// 1. The ramp writer: rotated ramps found, other lists and the levels left as written, Classic code unchanged.
// 2. Same sound: for every built-in song grown as Live coder, at the steps where a ramp is typed, the code with ramps
//    and the code with the lists as written are evaluated by Strudel in Node (tools/mixer-checks.mjs) and their haps
//    compared over several bars, every field: numbers within 0.011 (the lists are rounded to 0.01), the rest equal.
//    The typing saved is printed.
// 3. Rewrite detours: a melody turned by whole mini-notation steps, and every notes step of every Live coder growth
//    parses (Strudel in Node).
import fs from 'node:fs';
import { setSpokenContext } from '../src/song/spoken.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { compileSong } from '../src/song/compile.js';
import { rampLists, listValues, linearRamp, rampText, RAMP_MIN } from '../src/song/ramps.js';
import { rotateNotes } from '../src/song/coder.js';
import { songFiles } from './songs-dir.mjs';
import { strudelInNode } from './mixer-checks.mjs';
import { useFns } from '../src/song/writer.js';

const args = process.argv.slice(2), only = args.includes('--songs') ? args[args.indexOf('--songs') + 1].split(',') : null;
let failed = 0;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) {
  try { await fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
const num = n => String(Math.round(n * 100) / 100);
// a sweep as src/music.js writes it: one value per bar from a to b over n bars, rotated to the clip's start
const sweep = (a, b, n, start) => { const v = Array.from({ length: n }, (_, i) => num(a + (b - a) * i / (n - 1))), k = start % n; return [...v.slice(k), ...v.slice(0, k)].join(' '); };
const styles = Object.fromEntries(fs.readdirSync('styles').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`styles/${f}`, 'utf8'))).map(r => [r.id, r]));
setSpokenContext({ files: { _base: '/samples/' }, lengths: {}, lang: 'en', styles });

await check('ramp writer: rotated sweeps become ramps, short, other and level lists stay as written', () => {
  for (const [a, b, n, s] of [[600, 1100, 24, 40], [800, 1300, 32, 0], [1300, 800, 117, 5], [0.2, 0.8, 16, 3], [300, 4000, 458, 269]]) {
    const body = sweep(a, b, n, s), r = linearRamp(listValues(body));
    assert(r && r.n === n, `sweep ${a}→${b} over ${n} from ${s}: no ramp found`);
    const out = rampLists(`.lpf("<${body}>")`);
    assert(out.startsWith('.lpf(saw.range(') && out.length < 72,`sweep ${a}→${b}: ${out.slice(0, 80)}`);
  }
  assert(rampLists(`.lpf("<${sweep(600, 1100, 15, 0)}>")`).includes('"<'), `a list of ${RAMP_MIN - 1} values stays`);
  assert(rampLists(`.gain("<${sweep(0.2, 0.8, 40, 0)}>")`).includes('"<'), 'a gain list stays (the mixer owns it)');
  assert(rampLists('n("<0 2 4 7 9 7 4 2 0 2 4 7 9 7 4 2 0 3>")').includes('"<'), 'a melody stays');
  assert(rampLists('.lpf("<1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 30>")').includes('"<'), 'a list with a jump stays');
  assert(rampLists('const section1 = "<1!16 0!144>"') === 'const section1 = "<1!16 0!144>"', 'a lane stays');
  assert(rampText({ a: 600, step: 10, n: 24, start: 0 }) === 'saw.range(600, 840).slow(24).segment(1)', rampText({ a: 600, step: 10, n: 24, start: 0 }));
});

await check('ramp writer: the same value as the list at every bar (Strudel in Node)', async () => {
  const S = await strudelInNode();
  for (const [a, b, n, s] of [[600, 1100, 24, 40], [1300, 800, 117, 5], [300, 4000, 458, 269]]) {
    const body = sweep(a, b, n, s), list = await S.evaluate(`note("c").lpf("<${body}>")`), ramp = await S.evaluate(rampLists(`note("c").lpf("<${body}>")`));
    for (let c = 0; c < 2 * n; c++) {
      const x = list.queryArc(c, c + 1).filter(h => h.hasOnset()).map(h => h.value.cutoff), y = ramp.queryArc(c, c + 1).filter(h => h.hasOnset()).map(h => h.value.cutoff);
      assert(x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) <= 0.011), `${a}→${b} over ${n} from ${s}, bar ${c}: ${x} against ${y}`);
    }
  }
});

await check('Classic code keeps its lists', () => {
  const song = JSON.parse(fs.readFileSync('songs/kellerlicht.json', 'utf8'));
  assert(/lpf\("<773\.91/.test(compileSong(song)), 'kellerlicht as written lost its sweep list');
  const C = resolveProfile('crescendo'), L = liveCode(crescendoSong({ ...song, kind: 'composed' }, { rules: growthRules(C, { styles }) }), C, {});
  const bars = [...new Set(L.build.build.map(x => x.at))];
  assert(bars.every(b => !/saw\.range\([^)]*\)\.slow\(\d+\)\.segment\(1\)/.test(L.codeAt(b))), 'a Crescendo growth typed a ramp');
});

// the haps of a code at a bar, every field
async function haps(S, L, code, bar) {
  globalThis.miskBuses = L.buses; useFns(L.fns);
  const p = await S.evaluate(L.run ? L.run(code) : code);
  const key = h => `${h.whole.begin.valueOf().toFixed(6)} ${JSON.stringify(h.value)}`;
  return p.queryArc(bar, bar + 1).filter(h => h.hasOnset()).sort((x, y) => (key(x) < key(y) ? -1 : 1)).map(h => ({ at: h.whole.begin.valueOf(), v: h.value }));
}
const same = (x, y) => {
  if (x.length !== y.length) return `${x.length} haps against ${y.length}`;
  let worst = 0;
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(x[i].at - y[i].at) > 1e-9) return `hap ${i} at ${x[i].at} against ${y[i].at}`;
    const a = x[i].v || {}, b = y[i].v || {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (typeof a[k] === 'number' && typeof b[k] === 'number') { const d = Math.abs(a[k] - b[k]); worst = Math.max(worst, d); if (d > 0.011) return `hap ${i} ${k} ${a[k]} against ${b[k]}`; }
      else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return `hap ${i} ${k} ${JSON.stringify(a[k])} against ${JSON.stringify(b[k])}`;
    }
  }
  return worst;
};

// the built-in songs grown in Live coder (each grown once for every check)
const grownSongs = () => songFiles('songs').filter(x => !x.includes('/endless/')).map(f => ({ ...JSON.parse(fs.readFileSync(f, 'utf8')), kind: 'composed' }))
  .filter(song => (!only || only.includes(song.id)) && Array.isArray(song.sections));
const growths = new Map();
const grow = (song, C) => { if (!growths.has(song.id)) growths.set(song.id, crescendoSong(song, { narrated: C.narrated, rules: growthRules(C, { styles }) })); return growths.get(song.id); };

await check('Live coder growths: the code with ramps plays the same haps as the lists, every field', async () => {
  const S = await strudelInNode(), C = resolveProfile('switch');
  let lists = 0, saved = 0, steps = 0, worst = 0;
  const notes = [];
  for (const song of grownSongs()) {
    const g = grow(song, C);
    if (!g.build || !g.build.length) continue;
    const R = liveCode(g, C, { cols: () => 80 }), W = liveCode(g, C, { cols: () => 80, ramps: false });
    const bars = [...new Set([0, ...R.build.build.map(x => x.at)])].sort((a, b) => a - b);
    let n = 0;
    for (const b of bars) {
      const r = R.codeAt(b), w = W.codeAt(b);
      if (r === w) continue;
      lists += (r.match(/\.segment\(1\)/g) || []).length; saved += w.length - r.length; steps++;
      // three bars of each of the first steps that changed (the ramp repeats over its own length)
      if (n++ >= 4) continue;
      for (const at of [b, b + 1, b + 7]) {
        const d = same(await haps(S, R, r, at), await haps(S, W, w, at));
        assert(typeof d === 'number', `${song.id} step at ${b}, bar ${at}: ${d}`);
        worst = Math.max(worst, d);
      }
    }
    if (n) notes.push(`${song.id} ${n}`);
  }
  console.log(`      ${steps} steps typed ramps (${lists} ramps in the code shown, ${saved} characters less to type); largest difference ${worst.toFixed(4)}; songs: ${notes.join(', ')}`);
});

// a rewrite detour turns a melody's halves (src/song/coder.js rotateNotes): split on spaces alone it cut
// `<[0 ~ 2 ~ 3 ~ 2 ~] [0 ~ 2 ~ 4 ~ 3 2]>` into `[0 ~ 2 ~ 4 ~ 3 2]> <[0 ~ 2 ~ 3 ~ 2 ~]`, a mini-notation parse error at
// every later step of crescendo-notte-lunga in Live coder (check:mixer, bar 101)
await check('rewrite detour: melodies turned by whole steps, every Live coder notes step parses (Strudel in Node)', async () => {
  const S = await strudelInNode(), C = resolveProfile('switch');
  const cases = [
    ['0 2 4 7', '4 7 0 2'],
    ['<[0 ~ 2 ~ 3 ~ 2 ~] [0 ~ 2 ~ 4 ~ 3 2]>', '<[0 ~ 2 ~ 4 ~ 3 2] [0 ~ 2 ~ 3 ~ 2 ~]>'],
    ['[a3 ~] ~ [a3 ~]!3 ~ [a3 ~] [e4 a4]', '~ [a3 ~] [e4 a4] [a3 ~] ~ [a3 ~]!3'],
    ['[0 2 4 7]', '[4 7 0 2]'],
    ['<0 2>@3 <4 7> 9', '<4 7> 9 <0 2>@3'],
    ['[a2,c3,e3]', null], ['0 2, 4 7', null], ['0 | 2', null], ['0 . 2 4', null], ['7', null], ['[0 2', null],
  ];
  for (const [x, want] of cases) {
    const got = rotateNotes(x);
    assert(got === want, `rotateNotes("${x}") = ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
    if (got) await S.evaluate(`n("${got}")`).catch(e => { throw new Error(`n("${got}") from "${x}": ${e.message}`); });
  }
  let n = 0;
  for (const song of grownSongs()) {
    const g = grow(song, C);
    for (const st of g.build || []) {
      if (!st.notes || typeof st.notes.notes !== 'string') continue;
      n++;
      await S.evaluate(`n("${st.notes.notes}")`).catch(e => { throw new Error(`${song.id} bar ${st.at}: n("${st.notes.notes}"): ${e.message}`); });
    }
  }
  assert(n > 0, 'no notes step in any Live coder growth');
  console.log(`      ${n} notes steps parsed`);
});

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nall ramp checks passed');
