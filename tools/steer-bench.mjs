// Timing of the radio's steering per press (incremental-steering D8, #82). No browser.
// Radio songs grown as tools/check-radio-profiles.mjs grows them (seeds grow-<i>), at the style's length and at exact
// 10 minutes. Grown songs (Live coder, Crescendo): twelve presses spaced evenly from the arrival to a phrase before the
// end, each sent pending with every standing command (as placed by the steering before), then the director's view, as
// the console worker does. Classic: twelve commands, one per phrase from the second phrase. Each press is timed with
// the kept results (one long-lived cache, as in a worker) and, unless --today 0, also with nothing kept ("today", a full
// steering), interleaved per press. Prints per song the time per press, the parts of the reuse runs (director, transit,
// typing, compile; typing includes its compiles), the caches' hits and sizes, the heap, and the load average at the
// start and the end; then the targets of D8. The targets hold on a quiet machine (load under 4); under load compare
// ratios only.
//   node tools/steer-bench.mjs [--modes live,cres,classic] [--len style,10] [--songs 3] [--presses 12]
//     [--kind energy-up|mix] [--today 0|1] [--start 0] [--json file]
import os from 'node:os';
import fs from 'node:fs';
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { sessionItems } from '../src/endless/items.js';
import { loadStyles } from './styles-dir.mjs';
import { createSession } from '../src/endless/director.js';
import { steerOnAir, airBoundaries, steerView } from '../src/endless/waypoints.js';
import { steerSong } from '../src/endless/steering.js';
import { memoConfig, memoStats, clearMemo, work } from '../src/endless/steer-memo.js';

const arg = (k, d) => { const j = process.argv.indexOf(`--${k}`); return j >= 0 ? process.argv[j + 1] : d; };
const MODES = arg('modes', 'live,cres,classic').split(','), LENS = arg('len', 'style,10').split(','), SONGS = +arg('songs', 3);
const PRESSES = +arg('presses', 12), KIND = arg('kind', 'energy-up'), TODAY = arg('today', '1') !== '0', START = +arg('start', 0);
const RECIPES = loadStyles().filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
const STYLES = Object.fromEntries(RECIPES.map(r => [r.id, r]));
const how = { transition: 'artist', harmony: 'artist' };
const barsOf = s => s.sections.reduce((a, x) => a + x.bars, 0);
const recipeOf = (i, profile, len) => ({ seed: `grow-${i}`, options: { styles: [RECIPES[i % RECIPES.length].id, ...(i % 3 === 0 ? [RECIPES[(i * 7 + 3) % RECIPES.length].id] : [])], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, ...how, profile, ...(len ? { length: len } : {}) }, changes: [] });
const MIX = [{ kind: 'energy-up' }, { kind: 'more', part: 'arp' }, { kind: 'darker' }, { kind: 'more', part: 'pad' }, { kind: 'energy-down' }, { kind: 'less', part: 'arp' }, { kind: 'more-space' }, { kind: 'energy-up' }, { kind: 'more', part: 'hook' }, { kind: 'brighter' }, { kind: 'less', part: 'pad' }, { kind: 'energy-up' }];
const cmdOf = k => (KIND === 'mix' ? MIX[k % MIX.length] : { kind: KIND });
const load = () => os.loadavg().map(x => +x.toFixed(1));
const ms = t => Math.round(performance.now() - t);
const probe = () => { const P = globalThis.codingMiskSteerProbe = {}; return P; };
let seenWork = null;
const parts = P => Object.fromEntries(['director', 'transit', 'typing', 'compile'].map(k => [k, Math.round(P[k] || 0)]));

// one timed press: today (nothing kept) and with the kept results; → { today, reuse, parts, computed, same }
function press(fn) {
  let today = null, a = null;
  if (TODAY) { memoConfig.on = false; globalThis.codingMiskSteerProbe = null; const t = performance.now(); a = JSON.stringify(fn()); today = ms(t); }
  memoConfig.on = true;
  seenWork = null;
  const P = probe(), t = performance.now(), r = fn(), reuse = ms(t), computed = (seenWork || work).computed;
  globalThis.codingMiskSteerProbe = null;
  return { today, reuse, parts: parts(P), computed, same: a === null ? null : a === JSON.stringify(r), r };
}

const rows = [], t0 = Date.now(), load0 = load();
console.log(`steer-bench: modes ${MODES.join(',')}, lengths ${LENS.join(',')}, ${SONGS} songs each, ${PRESSES} presses (${KIND}), today ${TODAY ? 'on' : 'off'}; load ${load0.join(' ')}; ${os.cpus().length} cores`);
for (const mode of MODES) for (const lenArg of LENS) {
  const len = lenArg === 'style' ? null : +lenArg, profile = { live: 'switch', cres: 'crescendo', classic: 'classic' }[mode];
  let done = 0;
  for (let i = START; done < SONGS && i < START + 80; i++) {
    const rec = recipeOf(i, profile, len);
    clearMemo();
    if (globalThis.gc) globalThis.gc();
    const heap0 = process.memoryUsage().heapUsed;
    const row = { mode, len: lenArg, i, presses: [] };
    if (mode === 'classic') {
      const g = createSession(RECIPES, rec.seed).next(rec.options), bars = barsOf(g.song), ph = g.plan.phrase, cmds = [];
      for (let k = 0; k < PRESSES; k++) {
        const at = (k + 2) * ph; if (at > bars - ph) break;
        cmds.push({ ...cmdOf(k), at, id: k + 1 });
        const p = press(() => steerSong({ ...g, commands: cmds, seed: rec.seed, n: 0 }));
        delete p.r; row.presses.push(p);
      }
      if (row.presses.length < Math.min(PRESSES, 9)) continue;
      row.bars = bars;
    } else {
      const [x] = sessionItems(RECIPES, rec, 1, null, { grow: true });
      const g0 = x && x.song;
      if (!g0 || !g0.onAir || !g0.crescendo) continue;
      const G = g0.crescendo.growth, bars = barsOf(g0), g = createSession(RECIPES, rec.seed).next(rec.options), ph = g.plan.phrase;
      const ctx = { profile, styles: STYLES, phrase: ph }, gap = Math.max(1, Math.floor((bars - G - ph - 2) / PRESSES));
      let commands = [], q = G + 1.4;
      for (let k = 0; k < PRESSES && q < bars - ph; k++, q += gap) {
        const c0 = cmdOf(k), b = airBoundaries(c0.kind, q, g.plan, g0)[0];
        if (b === undefined) break;
        const args = { grown: g0, song: g.song, plan: g.plan, opts: g.opts, commands: [...commands, { ...c0, q, at: b, pend: true, id: k + 1 }], seed: rec.seed, n: 0, ctx, view: true };
        const p = press(() => { const r = steerOnAir(args); if (memoConfig.on) seenWork = { ...work }; return [r, steerView(args, r)]; });
        const by = new Map(p.r[0].commands.map(c => [c.id, c]));
        commands = args.commands.flatMap(c => { const y = by.get(c.id); if (!y) return []; const { pend, ...z } = { ...c, ...y }; return [z]; });
        delete p.r; row.presses.push(p);
      }
      if (row.presses.length < Math.min(PRESSES, 6)) continue;
      Object.assign(row, { bars, growth: G });
    }
    if (globalThis.gc) globalThis.gc();
    row.heapMB = Math.round((process.memoryUsage().heapUsed - heap0) / 1e6);
    row.memo = memoStats();
    rows.push(row); done++;
    const f = k => row.presses.map(p => p[k]).join(' ');
    console.log(`${mode} ${lenArg} #${i} (${row.bars} bars${row.growth ? `, growth ${row.growth}` : ''}): reuse ${f('reuse')} ms${TODAY ? ` | today ${f('today')} ms${row.presses.some(p => p.same === false) ? ' | DIFFERENT' : ''}` : ''}`);
    const last = row.presses[row.presses.length - 1];
    console.log(`   last press parts ${JSON.stringify(last.parts)}, commands steered ${f('computed')}; compile cache ${row.memo.compile.entries} entries ${(row.memo.compile.bytes / 1e6).toFixed(1)} MB, hits ${row.memo.compile.hits}/${row.memo.compile.hits + row.memo.compile.miss}; heap +${row.heapMB} MB`);
  }
}
const load1 = load();
// the targets (D8)
const p90 = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(0.9 * s.length) - 1)] : null; };
const lastOf = r => r.presses[r.presses.length - 1].reuse;
const grown10 = rows.filter(r => r.mode !== 'classic' && r.len === '10'), classic10 = rows.filter(r => r.mode === 'classic' && r.len === '10');
const ratio = rows.filter(r => r.mode !== 'classic').map(r => +(lastOf(r) / Math.max(1, r.presses[0].reuse)).toFixed(2));
console.log(`\nload average at start ${load0.join(' ')}, at end ${load1.join(' ')}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (grown10.length) console.log(`target: grown 10 min, last press, 90th percentile ${p90(grown10.map(lastOf))} ms (< 1500; at 4x CPU about ${(p90(grown10.map(lastOf)) * 4 / 1000).toFixed(1)} s)`);
if (ratio.length) console.log(`target: grown, last press / first press ${ratio.join(' ')} (< 1.5)`);
if (classic10.length) console.log(`target: Classic 10 min, last press ${classic10.map(lastOf).join(' ')} ms (< 150)`);
if (rows.some(r => r.presses.some(p => p.same === false))) console.log('WARNING: a reuse result differs from today\'s (run npm run check:steer-memo)');
if (arg('json', null)) fs.writeFileSync(arg('json'), JSON.stringify({ load0, load1, rows }, null, 1));
