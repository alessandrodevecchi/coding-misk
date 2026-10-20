// The hidden mixer plays what the code in full plays (code-writing, song-functions). No browser.
// Every built-in song (songs/*.json, songs/examples/) × Classic (live build), Crescendo and Live coder × the
// Technical functions presets short, mixer and compact: at every step the code shown and its hidden tail are
// evaluated by Strudel in Node, and each hap of the step's bar must carry the gain, orbit, analyze, postgain and
// velocity it has with the code written in full (tools/mixer-checks.mjs). Levels (faster-checks):
//   - quick (default): a fixed sample of songs (QUICK_SONGS) with every profile and preset;
//   - full (--full): every song;
//   - targeted: --songs <a,b> (or SONGS=a,b) those songs, --only <text> (or ONLY=text) the profiles or presets whose
//     name holds the text (classic, crescendo, switch, short, mixer, compact).
// One task per song and profile, in worker processes (tools/check-pool.mjs); results cached (tools/code-cache.mjs)
// under a hash of the song, the recipes and the app code; --no-cache ignores the cache.
//   npm run check:mixer                 quick level, exit 1 when a hap differs
//   npm run check:mixer -- --full       every song
//   npm run check:mixer -- --songs luci-rosse --only compact
import { fileURLToPath } from 'node:url';
import { songs, fileOf, PROFILES, VIEWS, STYLE_FILES } from './mixer-checks.mjs';
import { runPool, lowerSelf } from './check-pool.mjs';
import { appHash, cacheKey, cacheGet, cachePut, cacheLine, cachePrune, fileText, cacheOff } from './code-cache.mjs';

// the quick sample, among the songs whose Live coder builds are not the slowest (ferro, ali-di-cenere and
// circuito-ruggine take 20 s to 2 minutes each at low priority: --full): sections without clips and a voice
// (prova-solo-synth, switch-acid-prova with its own build), clips and risers (luci-rosse), gated guitars and risers
// (neon-rush-reel, dci-carica), spoken comments (example-voices), two lines alike once the mix is out
// (prova-voce-notte), a Live coder song with clips and lanes (switch-prima-luce)
export const QUICK_SONGS = ['dci-carica', 'example-voices', 'luci-rosse', 'neon-rush-reel', 'prova-solo-synth', 'prova-voce-notte', 'switch-acid-prova', 'switch-prima-luce'];
const NAMES = { classic: 'Classic', crescendo: 'Crescendo', switch: 'Live coder' };

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const FULL = args.includes('--full');
const ONLY = opt('--only') ?? process.env.ONLY;
const SONGS = (opt('--songs') ?? process.env.SONGS ?? '').split(',').map(x => x.trim()).filter(Boolean);
const bad = [...SONGS, ...QUICK_SONGS].filter(id => !songs.some(s => s.id === id));
if (bad.length) { console.log(`no such song: ${bad.join(', ')}`); process.exit(2); }
const level = SONGS.length ? 'targeted' : FULL ? 'full' : 'quick';
const t0 = Date.now();

const list = SONGS.length ? songs.filter(s => SONGS.includes(s.id)) : FULL ? songs : songs.filter(s => QUICK_SONGS.includes(s.id));
const profiles = PROFILES.filter(p => !ONLY || p.includes(ONLY) || VIEWS.some(v => v.includes(ONLY)));
const views = VIEWS.filter(v => !ONLY || v.includes(ONLY) || !VIEWS.some(x => x.includes(ONLY)));
const tasks = list.flatMap(s => profiles.map(profile => ({ id: `${s.id} ${profile}`, song: s.id, profile })));
if (!tasks.length) { console.log(`nothing to run${ONLY ? ` with "${ONLY}"` : ''}`); process.exit(2); }

// cache keys: the app code the checks run (and this file), the recipes, the song
const ENTRY = 'tools/mixer-checks.mjs', CLI = appHash('tools/check-mixer.mjs');
const stylesText = STYLE_FILES.map(f => `${f}\0${fileText(f)}`).join('\0');
const keyOf = t => cacheKey(ENTRY, CLI, t.song, t.profile, stylesText, fileText(fileOf[t.song]));
const results = new Array(tasks.length), todo = [];
tasks.forEach((t, i) => { const v = cacheGet('mixer', keyOf(t)); if (v !== undefined) results[i] = v; else todo.push(i); });
if (todo.length) {
  lowerSelf();
  const out = await runPool(fileURLToPath(new URL('./mixer-checks.mjs', import.meta.url)), todo.map(i => tasks[i]), { name: 'check-mixer' });
  out.forEach((r, k) => { const i = todo[k]; results[i] = r; cachePut('mixer', keyOf(tasks[i]), r); });
}

// one line per song when every step matches, else the steps that differ
let failed = 0, steps = 0, haps = 0;
for (const s of list) {
  const rows = tasks.map((t, i) => ({ t, r: results[i] })).filter(x => x.t.song === s.id), bad = [];
  for (const { t, r } of rows) {
    steps += r.steps * views.length; haps += r.haps * views.length;
    for (const v of views) for (const d of r.views[v]) bad.push(`      ${NAMES[t.profile]} ${v}, bar ${d.bar}: ${d.diffs.slice(0, 4).join('; ')}${d.diffs.length > 4 ? `; and ${d.diffs.length - 4} more` : ''}`);
  }
  const counts = rows.map(({ t, r }) => `${NAMES[t.profile]} ${r.steps}`).join(', ');
  if (bad.length) { failed++; console.log(`FAIL  ${s.id} (${counts} steps): ${bad.length} step(s) differ\n${bad.slice(0, 12).join('\n')}${bad.length > 12 ? `\n      and ${bad.length - 12} more` : ''}`); }
  else console.log(`ok    ${s.id} (${counts} steps)`);
}
const levelLine = {
  quick: `quick level: ${list.length} songs (${QUICK_SONGS.join(', ')}); run --full after a change to the writer, the live code or the compiled code views`,
  full: `full level: all ${songs.length} songs`,
  targeted: `targeted run on ${SONGS.join(', ')}: then run the quick level before a commit`,
}[level];
console.log(`\n${levelLine}; ${profiles.map(p => NAMES[p]).join(', ')} × ${views.join(', ')} against the code in full`);
console.log(`${steps} steps and ${haps} haps compared; ${tasks.length} tasks, ${todo.length} run in workers; ${cacheLine()}; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (!cacheOff()) cachePrune();
console.log(failed ? `\n${failed} song(s) with a different mix` : `\nevery hap has the same mix in all ${list.length} songs`);
process.exit(failed ? 1 : 0);
