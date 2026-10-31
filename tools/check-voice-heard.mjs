// What the radio says is what it plays (fx1, fx3): for radio songs grown on air (Live coder, Crescendo) with the voice
// track always on and many phrases, every voice-track entry the captions and Coming next show (spokenSchedule of the song
// alone) has a voice sample hap on its bar and offset in the code the radio evaluates (the window of airCode, as
// radioPlayable builds it, Strudel in Node), the song first in its window and later in a session; and a line typed in
// the console of a grown song goes at least half a bar ahead (airBoundaries), as on a Classic song (applyBar). No browser.
//   npm run check:voice-heard      exit 1 when any check fails
import { loadStyles } from './styles-dir.mjs';
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { sessionItems } from '../src/endless/items.js';
import { airControls } from '../src/endless/growth.js';
import { windowSong } from '../src/endless/join.js';
import { airCode } from '../src/live/air-code.js';
import { liveBuildOf } from '../src/live/live-code.js';
import { spokenSchedule } from '../src/song/build.js';
import { setSpokenContext, SPOKEN_ORBIT } from '../src/song/spoken.js';
import { airBoundaries } from '../src/endless/waypoints.js';
import { applyBar } from '../src/endless/steering.js';
import { hapsAt } from './mixer-checks.mjs';

const RECIPES = loadStyles().filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
// (the page's voice context: every sample exists, numbered by the song's texts, the styles' lines and speakers)
setSpokenContext({ files: null, lengths: {}, lang: 'en', styles: Object.fromEntries(RECIPES.map(r => [r.id, r])) });
const barsOf = song => song.sections.reduce((a, x) => a + x.bars, 0);
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

// the radio's sessions: synthwave and pure trance, Live coder or Crescendo, the voice track always with many phrases
// (the owner's settings for fx1); fx1-a is the seed of the browser reproduction (a refrain on bars 1 and 5 of the growth)
const how = { chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, transition: 'cut', harmony: 'compatible', voice: { presence: 'always', phrases: 'many', kind: 'mixed' } };
const SESSIONS = [
  { seed: 'fx1-a', styles: ['synthwave'], profile: 'switch' },
  { seed: 'fx1-b', styles: ['synthwave'], profile: 'crescendo' },
  { seed: 'fx1-c', styles: ['pure-trance'], profile: 'switch' },
  { seed: 'fx1-d', styles: ['dark-cyberpunk'], profile: 'switch' },
];
const T0 = Date.now();
const songs = SESSIONS.flatMap(s => sessionItems(RECIPES, { seed: s.seed, options: { styles: s.styles, ...how, profile: s.profile }, changes: [] }, 2, null, { grow: true }).map((x, k) => ({ ...x, k, seed: s.seed })));
console.log(`      ${songs.length} radio songs grown in ${((Date.now() - T0) / 1000).toFixed(0)} s`);

// the code the radio evaluates for song x on air from bar `start` of the window (the song alone after a silent lead, as
// windowSong lays out a later song of a session), with its profile's controls
function windowOf(x, start) {
  const n = x.k + 1, W = windowSong([{ song: x.song, n, start }]), profile = x.song.onAir ? x.song.onAir.profile : 'classic';
  const ctl = x.song.onAir ? airControls(profile, x.song.onAir.free) : airControls('classic');
  return { L: airCode(W, [{ n, prefix: `s${n}-`, start, song: x.song, title: x.song.title, profile, ctl, show: 'air' }], { lang: () => 'en', files: () => null }), ctl };
}
// the voice-track haps of the window code on bar b (window bars): their offsets in the bar
async function voiceAt(L, b) {
  const haps = await hapsAt(L, L.codeAt(b), b);
  return haps.filter(h => /^say_/.test(h.s || '') && [SPOKEN_ORBIT, SPOKEN_ORBIT + 1].includes(h.orbit)).map(h => Math.round((h.at - b) * 1e4) / 1e4);
}

let lines = 0, entries = 0, growthLines = 0;
for (const x of songs) {
  if (!x.song.onAir || !x.song.tracks.some(t => t.type === 'spoken')) continue;
  const G = x.song.crescendo.growth;
  for (const start of [0, 37]) {
    const { L, ctl } = windowOf(x, start);
    const sched = spokenSchedule(liveBuildOf(x.song, ctl), ctl, 'en', null).filter(y => y.voice === 'T' && y.entries && y.entries.length);
    const byBar = new Map();
    for (const y of sched) for (const e of y.entries) { if (!byBar.has(y.at)) byBar.set(y.at, []); byBar.get(y.at).push({ late: Math.round((e.late % 1) * 1e4) / 1e4, text: e.text, way: y.way }); }
    const missing = [];
    for (const [bar, list] of byBar) {
      const heard = await voiceAt(L, start + bar);
      // (a chop plays its slices on its rhythm: its first slice may come after a rest, anywhere in the bar)
      for (const e of list) { entries++; if (!heard.some(o => (e.way === 'chop' ? o >= e.late : Math.abs(o - e.late) < 1e-3))) missing.push(`bar ${bar + 1}${e.late ? `+${e.late}` : ''} “${e.text}”`); }
    }
    lines += sched.length; growthLines += sched.filter(y => y.at < G).length;
    check(!missing.length, `${x.seed} song ${x.k + 1} (${x.song.onAir.profile}, growth ${G} bars, window from bar ${start + 1}): every voice-track entry shown is played`, missing.slice(0, 4).join(', ') + (missing.length > 4 ? ` … ${missing.length} in all` : ''));
  }
}
console.log(`      ${lines} voice-track lines (${growthLines} in a growth), ${entries} entries compared`);
check(growthLines > 0, 'some voice-track lines fall in a growth (the case of fx1)');

// fx3: a line typed at any moment of a bar goes to a bar at least half a bar ahead, on a grown song as on a Classic one
{
  const x = songs.find(y => y.song.onAir), plan = { bars: barsOf(x.song) - x.song.crescendo.growth, phrase: 8 };
  const close = [];
  for (let q = 10; q < 12; q += 0.05) {
    const air = airBoundaries('say-live', q, plan, x.song)[0], classic = applyBar('say-live', q, { bars: 400, phrase: 8 });
    if (!(air - q >= 0.5) || air !== classic) close.push(`${q.toFixed(2)} → ${air} (Classic ${classic})`);
  }
  check(!close.length, 'a typed line on a grown song goes at least half a bar ahead, on the same bar as on a Classic song', close.slice(0, 4).join(', '));
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
