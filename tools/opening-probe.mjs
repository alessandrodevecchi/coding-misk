// Opening probe (varied-openings, #82): grows radio songs of every built-in style with the Crescendo and Live coder
// profiles and reports the first sounding line of each build: the kick-led share per profile and per style, the most
// common exact first lines, the kick patterns and drum machines among kick-led openings, and the opening drawn with
// its source. No browser.
//   npm run probe:openings                     24 songs per style and profile, report
//   npm run probe:openings -- --n 12           quick run
//   npm run probe:openings -- --check          compare with the targets (48 songs per style and profile), exit 1 naming each miss
//   npm run probe:openings -- --styles jazz,acid --profile crescendo
//   npm run probe:openings -- --json out.json  also write the rows
//   npm run probe:openings -- --from out.json  report on rows written before (same --n, --styles, --profile)
//   npm run probe:openings -- --salt b          other seeds, to tell a rule from chance
//   npm run probe:openings -- --jobs 4         worker processes (default: cores - 1, at most 6)
// Targets (spec live-build/openings, Opening distribution targets): no exact first line (without its level, filter
// and bus functions) above 12% of a profile's songs;
// each style's kick-led share within 15 points of the share its opening weights give; kick-led share over all styles
// at most 60% in Crescendo and 55% in Live coder (the share the weights give is worked out per song, over the openings
// it can play: the Live-coder-only openings typed, muted-base and mid-set take their first track from the lead draw, the
// voice opening never leads with the kick); among the kick-led openings of a style with more than one weighted
// kick start, no kick pattern above 70%.
import fs from 'node:fs';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sessionItems } from '../src/endless/items.js';
import { liveCode } from '../src/live/live-code.js';
import { resolveProfile } from '../src/live/profiles.js';
import { validateRecipe } from '../src/endless/recipe.js';
import * as shapes from '../src/song/shapes.js';
import { loadStyles } from './styles-dir.mjs';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const CHECK = args.includes('--check');
// (48 for the check: the ±15 points of a style's share hold on 48 songs without misses by chance)
const N = Math.max(1, +(opt('--n') ?? (CHECK ? 48 : 24)) || 24);
const ONLY = (opt('--styles') || '').split(',').map(x => x.trim()).filter(Boolean);
const PROFILES = opt('--profile') ? [opt('--profile') === 'live-coder' ? 'switch' : opt('--profile')] : ['crescendo', 'switch'];
// --salt x: other seeds (to tell a rule from a chance result)
const SALT = opt('--salt') ? `-${opt('--salt')}` : '';
const NAME = { crescendo: 'Crescendo', switch: 'Live coder' };

const RECIPES = loadStyles().filter(r => !validateRecipe(r).errors.length);
const STYLES = ONLY.length ? RECIPES.filter(r => ONLY.includes(r.id)) : RECIPES;
const KICK_LED = ['slow', 'full-kick', 'filtered', 'broken'];
const LEAD = shapes.LEAD_OPENINGS || ['slow', 'full-kick', 'filtered', 'broken', 'melodic', 'pad', 'bass', 'chord', 'top'];
const how = { transition: 'artist', harmony: 'artist' };

// the first sounding line of a build: the first "$:" line that is not silence, in the first 40 bars
function firstLine(song, C) {
  const L = liveCode(song, C, { cols: () => 80 });
  for (let b = 0; b < 40; b++) {
    const line = (L.codeAt(b) || '').split('\n').map(l => l.trim().replace(/^S\$:/, '$:')).find(l => /^\$:/.test(l) && !/^\$:\s*silence/.test(l));
    if (line) return line;
  }
  return null;
}
const isKick = l => /\bs\("[^"]*\bbd\b/.test(l);
const kickPattern = l => (l.match(/\bs\("([^"]*)"/) || [])[1];
const bankOf = l => (l.match(/\.bank\("([^"]*)"/) || [])[1] || '-';
// the line without its technical functions (level, filter, bus, meter), as a live coder types it first
const head = l => { const m = l.match(/^(\$:\s*s\("[^"]*"\)\.bank\("[^"]*"\))/); return m ? m[1] : l.replace(/\.(gain|lpf|orbit|analyze|postgain|velocity|distort)\(.*$/, ''); };
const cls = l => (isKick(l) ? 'kick' : /\bs\("[^"]*\b(rd|hh|oh|cp|sd|rim)\b/.test(l) ? 'drums, no kick' : /^\$:\s*chord\(/.test(l) ? 'chord' : /^\$:\s*n(ote)?\(/.test(l) ? 'notes' : 'other');

// the kick-led share the weights give to one song: its style's opening weights (else the defaults) over the openings it
// can play; Crescendo draws the lead openings only, Live coder all of them (typed, muted-base and mid-set lead as the
// lead draw does, the voice never with the kick)
const STYLE_MAP = Object.fromEntries(RECIPES.map(r => [r.id, r]));
function expected(song, r, prof) {
  const f = shapes.shapeFacts(song, STYLE_MAP), own = (r.growthShapes || {}).openings || {};
  const share = (w, list) => { const c = list.filter(o => Number(w[o]) > 0 && shapes.canPlay('opening', o, f)); const all = c.reduce((a, o) => a + Number(w[o]), 0); return all ? { all, kick: c.filter(o => KICK_LED.includes(o)).reduce((a, o) => a + Number(w[o]), 0), c } : null; };
  const L = share(own, LEAD) || share(shapes.DEFAULT_WEIGHTS.opening, LEAD), leadKick = L ? L.kick / L.all : 0;
  if (prof !== 'switch') return leadKick;
  const w = share(own, shapes.OPENINGS) ? own : shapes.DEFAULT_WEIGHTS.opening, A = share(w, shapes.OPENINGS);
  if (!A) return leadKick;
  const viaLead = A.c.filter(o => ['typed', 'muted-base', 'mid-set'].includes(o)).reduce((a, o) => a + Number(w[o]), 0);
  return (A.kick + viaLead * leadKick) / A.all;
}
// the songs to grow, split among worker processes (each grows every jobs-th song and prints its rows)
const units = PROFILES.flatMap(prof => STYLES.flatMap(r => Array.from({ length: N }, (_, k) => ({ prof, r, k }))));
const PART = opt('--part');
const t0 = Date.now();
let rows = [];
function grow({ prof, r, k }) {
  const ri = RECIPES.indexOf(r);
  const recipe = { seed: `op-${prof}-${ri}-${k}${SALT}`, options: { styles: [r.id], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, ...how, profile: prof }, changes: [] };
  try {
    const [x] = sessionItems(RECIPES, recipe, 1, null, { grow: true });
    const s = x.song, p = x.entry.profile || prof, C = resolveProfile(p, { tracks: true });
    const sh = s.crescendo && s.crescendo.shape, lead = s.crescendo && s.crescendo.lead;
    return { profile: p, style: r.id, expect: expected(s, r, p), line: firstLine(s, C), opening: (sh && sh.opening) || (lead && lead.opening) || null, from: (sh && sh.from && sh.from.opening) || (lead && lead.from) || null };
  } catch (e) { return { profile: prof, style: r.id, err: String(e.message).slice(0, 120) }; }
}
if (PART) {
  const [i, J] = PART.split('/').map(Number);
  process.stdout.write(JSON.stringify(units.filter((u, n) => n % J === i).map(grow)));
  process.exit(0);
}
const JOBS = Math.max(1, Math.min(units.length, +(opt('--jobs') ?? Math.min(6, os.cpus().length - 1)) || 1));
const me = fileURLToPath(import.meta.url), pass = args.filter((a, n) => !['--jobs', '--json', '--from', '--n'].includes(a) && !['--jobs', '--json', '--from', '--n'].includes(args[n - 1]) && a !== '--check').concat(['--n', String(N)]);
const parts = opt('--from') ? null : await Promise.all(Array.from({ length: JOBS }, (_, i) => new Promise((ok, fail) => execFile(process.execPath, ['--no-warnings', me, ...pass, '--part', `${i}/${JOBS}`], { maxBuffer: 1 << 28 }, (e, out) => (e ? fail(e) : ok(JSON.parse(out)))))));
// (back in the order of the units)
rows = parts ? units.map((u, n) => parts[n % JOBS][Math.floor(n / JOBS)]) : JSON.parse(fs.readFileSync(opt('--from'), 'utf8'));
if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rows));

const pct = (a, b) => (b ? (100 * a) / b : 0);
const f0 = x => `${x.toFixed(0).padStart(3)}%`;
const tally = (list, key) => { const m = new Map(); for (const x of list) { const v = key(x); m.set(v, (m.get(v) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); };
const weightsOf = r => ((r.growthShapes || {}).openings) || shapes.DEFAULT_WEIGHTS.opening;
const kickWeights = r => ((r.growthShapes || {}).kicks) || (shapes.DEFAULT_WEIGHTS.kick || null);
// (rows written before the per-song share: the kick-led weight over the weight of the openings listed, lead openings
// only in Crescendo)
function target(r, prof) {
  const w = Object.entries(weightsOf(r)).filter(([id, v]) => Number(v) > 0 && (prof === 'switch' || LEAD.includes(id)));
  const all = w.reduce((a, [, v]) => a + Number(v), 0), kick = w.filter(([id]) => KICK_LED.includes(id)).reduce((a, [, v]) => a + Number(v), 0);
  return all ? pct(kick, all) : 0;
}

const misses = [];
const errs = rows.filter(x => x.err);
if (errs.length) { console.log(`errors: ${errs.length}`); tally(errs, x => x.err).slice(0, 5).forEach(([e, n]) => console.log(`  ${n}  ${e}`)); }
for (const prof of PROFILES) {
  const R = rows.filter(x => x.profile === prof && !x.err && x.line);
  if (!R.length) continue;
  const kicks = R.filter(x => isKick(x.line));
  const share = pct(kicks.length, R.length);
  console.log(`\n== ${NAME[prof]}: ${R.length} songs, kick first ${f0(share)}, ${new Set(R.map(x => head(x.line))).size} distinct first lines`);
  console.log(' first sound'); tally(R, x => cls(x.line)).forEach(([k, n]) => console.log(`  ${f0(pct(n, R.length))} ${String(n).padStart(4)}  ${k}`));
  console.log(' most common first lines (without level, filter and bus)'); const lines = tally(R, x => head(x.line)); lines.slice(0, 6).forEach(([k, n]) => console.log(`  ${f0(pct(n, R.length))} ${String(n).padStart(4)}  ${k.slice(0, 90)}`));
  console.log(' kick patterns (kick-led)'); tally(kicks, x => kickPattern(x.line)).slice(0, 8).forEach(([k, n]) => console.log(`  ${f0(pct(n, kicks.length))} ${String(n).padStart(4)}  ${k}`));
  console.log(' drum machines (kick-led)'); tally(kicks, x => bankOf(x.line)).slice(0, 10).forEach(([k, n]) => console.log(`  ${f0(pct(n, kicks.length))} ${String(n).padStart(4)}  ${k}`));
  const op = R.filter(x => x.opening);
  if (op.length) { console.log(' opening drawn [source]'); tally(op, x => `${x.opening} [${x.from}]`).slice(0, 16).forEach(([k, n]) => console.log(`  ${f0(pct(n, op.length))} ${String(n).padStart(4)}  ${k}`)); }
  console.log(' per style: kick-led (share the weights give), kick patterns');
  for (const r of STYLES) {
    const S = R.filter(x => x.style === r.id); if (!S.length) continue;
    const K = S.filter(x => isKick(x.line)), got = pct(K.length, S.length), want = S.every(x => typeof x.expect === 'number') ? 100 * S.reduce((a, x) => a + x.expect, 0) / S.length : target(r, prof);
    const pats = tally(K, x => kickPattern(x.line));
    const ok = Math.abs(got - want) <= 15;
    const kw = kickWeights(r), multi = !kw || Object.values(kw).filter(v => Number(v) > 0).length > 1;
    const top = pats[0] ? pct(pats[0][1], K.length) : 0;
    console.log(`  ${r.id.padEnd(18)} ${f0(got)} (${f0(want)})${ok ? '  ' : ' !'} ${pats.slice(0, 4).map(([k, n]) => `${k} ${n}`).join(', ')}`);
    if (!ok) misses.push(`${NAME[prof]} ${r.id}: kick-led ${got.toFixed(0)}%, target ${want.toFixed(0)}% ±15`);
    if (multi && K.length >= 4 && top > 70) misses.push(`${NAME[prof]} ${r.id}: kick pattern "${pats[0][0]}" ${top.toFixed(0)}% of kick-led openings (max 70%)`);
  }
  if (!ONLY.length) {
    const most = prof === 'crescendo' ? 60 : 55;
    if (share > most) misses.push(`${NAME[prof]}: kick-led share ${share.toFixed(0)}% over all styles (max ${most}%)`);
    if (lines[0] && pct(lines[0][1], R.length) > 12) misses.push(`${NAME[prof]}: first line ${lines[0][0].slice(0, 70)} opens ${pct(lines[0][1], R.length).toFixed(0)}% of songs (max 12%)`);
  }
}
console.log(`\n${rows.length} songs, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (CHECK) {
  if (misses.length) { console.log(`\n${misses.length} target(s) missed:`); misses.forEach(m => console.log(`  ${m}`)); process.exit(1); }
  console.log('\nall targets met');
}
