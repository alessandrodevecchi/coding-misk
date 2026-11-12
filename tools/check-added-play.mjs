// A track the listener adds with the console's "+" plays at least in the phrase it enters (added-tracks-play, #82).
// No browser. Classic radio songs from the director, steered as the radio steers them:
// - "+" on a half-phrase start just before a break (console-add-waves D6, slow songs): two kicks and one other
//   instrument; each added track plays every bar of its entry phrase, the break still takes out the director's drums,
//   and the added kicks still play at the drop;
// - the same with a later command on the break's boundary (the rewrite starts there): the same result;
// - seeded batches of "+" on phrase starts and half-phrase starts, with energy, sound and density commands between them,
//   kept under the console's cap: every added track plays every bar of its entry phrase.
//   npm run check:added-play [-- --songs 40]
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { loadStyles } from './styles-dir.mjs';
import { createSession } from '../src/endless/director.js';
import { steerSong, whyNot, instrumentOf } from '../src/endless/steering.js';
import { stream } from '../src/endless/random.js';
import { stateAt } from '../src/song/build.js';

const RECIPES = loadStyles().filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SONGS = +arg('--songs', 40);
let failed = 0, passed = 0;
const check = (ok, name) => { if (ok) passed++; else { failed++; console.log(`FAIL  ${name}`); } };
const plays = (song, id, bar) => { const t = stateAt(song, bar).song.tracks.find(x => x.id === id); return !!(t && !t.mute && !t.hush); };
const drumsOn = (song, bar) => stateAt(song, bar).song.tracks.filter(t => t.type === 'drums' && !t.mute).map(t => t.id);
const session = (i, style) => createSession(RECIPES, `added-play-${i}`).next({ styles: [style], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5 });
// every listener track (plan.added) plays every bar of the phrase it enters → the ones that do not, with their bars heard
const short = r => (r.plan.added || []).map(a => ({ ...a, heard: Array.from({ length: r.plan.phrase }, (_, j) => a.at + j).filter(b => plays(r.song, a.id, b)).length })).filter(a => a.heard < r.plan.phrase);

// ---------- "+" on the half-phrase start before a break ----------
let breaks = 0;
for (let i = 0; i < SONGS * 3 && breaks < SONGS; i++) {
  const style = RECIPES[i % RECIPES.length].id, g = session(i, style), ph = g.plan.phrase;
  if (ph % 2) continue;
  // the first break that starts a double phrase after the second one, with drums playing just before it
  const d = g.plan.plan.findIndex((x, j) => j >= 2 && x.role === 'break' && g.plan.plan[j - 1].role !== 'break');
  if (d < 0) continue;
  const B = d * 2 * ph, at = B - ph / 2;
  if (!drumsOn(g.song, B - 1).length) continue;
  breaks++;
  const presses = [{ kind: 'more', part: 'kick', at }, { kind: 'more', part: 'kick', at }, { kind: 'more', part: 'bass', at }];
  for (const later of [null, { kind: 'energy-down', at: B }]) {
    const what = `${style} seed added-play-${i}, "+" on bar ${at} before the break on bar ${B}${later ? ', energy down on the break' : ''}`;
    const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: later ? [...presses, later] : presses, seed: `added-play-${i}`, n: 0 });
    const mine = (r.plan.added || []).filter(a => a.at === at);
    check(mine.length === 3, `${what}: three listener tracks (${mine.length})`);
    for (const a of short(r).filter(x => x.at === at)) check(false, `${what}: ${a.id} plays ${a.heard} of ${ph} bars of its entry phrase`);
    // the break stays a break: the director's drums that played before it leave on its bar
    const own = drumsOn(g.song, B - 1).filter(id => !mine.some(a => a.id === id) && drumsOn(r.song, B - 1).includes(id));
    const roleAt = r.plan.plan[d] && r.plan.plan[d].role;
    if (roleAt === 'break' && own.length) check(own.every(id => !plays(r.song, id, B)), `${what}: the director's drums ${own.join(', ')} leave on the break`);
    // the added kicks still play at the drop after the break
    const drop = r.plan.plan.findIndex((x, j) => j > d && x.role === 'drop');
    if (drop > 0) for (const a of mine.filter(x => instrumentOf(r.plan.tracks.find(t => t.id === x.id)) === 'kick')) check(plays(r.song, a.id, drop * 2 * ph), `${what}: ${a.id} plays at the drop on bar ${drop * 2 * ph}`);
  }
}
check(breaks >= Math.min(10, SONGS), `songs with a break to test (${breaks})`);

// ---------- seeded batches with other commands ----------
let added = 0, half = 0;
for (let i = 0; i < SONGS; i++) {
  const seed = `added-play-mix-${i}`, style = RECIPES[i % RECIPES.length].id;
  const g = createSession(RECIPES, seed).next({ styles: [style], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5 });
  const ph = g.plan.phrase, R = stream(seed, 'presses'), cmds = [];
  let cur = { song: g.song, plan: g.plan };
  for (let q = ph * 2; q < g.plan.bars - 4 * ph; q += ph * R.int(1, 3)) {
    const at = q + (ph % 2 === 0 && R.chance(0.5) ? ph / 2 : 0);
    for (let j = R.int(2, 5); j > 0; j--) {
      const c = { kind: 'more', part: R.chance(0.6) ? 'kick' : R.pick(['beat', 'bass', 'arp', 'pad', 'hook']), at };
      // (the console's cap: the "+" is disabled past it)
      if (whyNot(c, cur.song, cur.plan, at - 0.5)) continue;
      cmds.push(c);
      cur = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed, n: 0 });
    }
    const next = q + ph;
    if (R.chance(0.6)) cmds.push({ kind: R.pick(['energy-down', 'energy-up', 'darker']), at: next });
    if (R.chance(0.3)) cmds.push({ kind: 'curve', d: Math.floor(next / (2 * ph)), curve: 'density', value: R.pick([2, 3]), at: next });
  }
  const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed, n: 0 });
  added += (r.plan.added || []).length;
  half += (r.plan.added || []).filter(a => a.at % ph).length;
  for (const a of short(r)) check(false, `${style} ${seed}: ${a.id} added on bar ${a.at} plays ${a.heard} of ${ph} bars of its entry phrase`);
  check(true, `${seed}`);
}
console.log(`listener tracks in the seeded songs: ${added} (${half} on half-phrase starts)`);
console.log(`${failed ? 'FAIL' : 'ok  '}  added tracks play in their entry phrase: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
