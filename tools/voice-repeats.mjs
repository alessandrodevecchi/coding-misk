// How often the voice track repeats itself (voice-track-tuning, task 1). No browser.
// For a fixed list of radio sessions (seeds, styles, voice options) it generates the director's songs and prints, per
// song, the bars with voice, the starts of each line, the most starts of one line and the share of the song with voice;
// per session, the lines said again within 5 songs; per style with lines of its own, the share of songs that say each
// of its lines. The seed list is fixed, so a run before and a run after a change compare the same songs.
//   node --no-warnings tools/voice-repeats.mjs            summary table
//   node --no-warnings tools/voice-repeats.mjs --songs    a line per song too
//   node --no-warnings tools/voice-repeats.mjs --json     every number as JSON
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { loadStyles } from './styles-dir.mjs';
import { createSession } from '../src/endless/director.js';
import { placeSpoken, spokenBars, setSpokenContext } from '../src/song/spoken.js';

const RECIPES = loadStyles().filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
const STYLES = Object.fromEntries(RECIPES.map(r => [r.id, r]));
setSpokenContext({ files: null, lengths: {}, lang: 'en', styles: STYLES });

const ALL_WHERE = ['quiet', 'medium', 'busy'];
// the voice options measured: the default (as the style), many mixed phrases, one chop, one refrain
const CONFIGS = {
  default: null,
  'many-mixed': { phrases: 'many', kind: 'mixed', presence: 'always' },
  'chop-1': { phrases: '1', kind: 'different', ways: ['chop'], presence: 'always' },
  'refrain-1': { phrases: '1', kind: 'different', ways: ['refrain'], presence: 'always' },
};
// the sessions: f7zvee (the owner's "Static", song 1, with many mixed phrases everywhere) and 10 seeds of 12 songs,
// styles with lines of their own among them
const SONGS = 12;
const SESSIONS = [
  { seed: 'f7zvee', styles: ['berlin-techno', 'dark-cyberpunk'], where: ALL_WHERE },
  { seed: 'vr-aurora', styles: ['dark-cyberpunk'] },
  { seed: 'vr-brina', styles: ['synthwave'] },
  { seed: 'vr-corvo', styles: ['berlin-techno'] },
  { seed: 'vr-duna', styles: ['dark-cyberpunk', 'synthwave'] },
  { seed: 'vr-eco', styles: ['darksynth'] },
  { seed: 'vr-faro', styles: ['dreamy-cyberpunk'] },
  { seed: 'vr-gelo', styles: ['lo-fi'] },
  { seed: 'vr-iride', styles: ['industrial', 'berlin-techno'] },
  { seed: 'vr-lago', styles: ['drum-and-bass'] },
  { seed: 'vr-neve', styles: ['jazz'] },
];
// one long session per style with lines of its own (the share of songs per style line)
const LONG = { songs: 120, styles: ['dark-cyberpunk', 'synthwave', 'berlin-techno'] };
const RECENT = 5;

const enOf = x => (typeof x === 'string' ? x : x && x.en) || '';
const barsOf = song => song.sections.reduce((a, s) => a + s.bars, 0);
// the keys of what a placed line says: every entry (a vocabulary line) or its whole text
const keysOf = p => (p.line.parts ? p.line.parts.map(enOf) : [enOf(p.line.text)]).filter(Boolean);

function measureSong(song) {
  const placed = placeSpoken(song, 'en');
  if (!placed.length) return null;
  const total = barsOf(song), bars = spokenBars(song, 'en');
  const byLine = new Map();
  for (const p of placed) { const k = keysOf(p).join(' · '); byLine.set(k, (byLine.get(k) || 0) + p.starts.length); }
  const starts = [...byLine.values()];
  return { id: song.id, title: song.title, bars: total, voiceBars: bars.size, share: Math.round((bars.size / total) * 1000) / 1000, lines: Object.fromEntries(byLine), mostStarts: Math.max(...starts), starts: starts.reduce((a, b) => a + b, 0), said: [...new Set(placed.flatMap(keysOf))] };
}

function runSession({ seed, styles, where }, voice, count) {
  const ses = createSession(RECIPES, seed), out = [];
  const v = voice ? { ...voice, ...(where ? { where } : {}) } : null;
  for (let i = 0; i < count; i++) {
    const { song } = ses.next({ styles, ...(v ? { voice: v } : {}) });
    out.push({ index: i, ...(measureSong(song) || { id: song.id, title: song.title, bars: barsOf(song), voiceBars: 0, share: 0, lines: {}, mostStarts: 0, starts: 0, said: [] }) });
  }
  // lines said again within RECENT songs: per song, the keys it says that one of the RECENT songs before said
  let again = 0;
  out.forEach((s, i) => { const before = new Set(out.slice(Math.max(0, i - RECENT), i).flatMap(x => x.said)); s.again = s.said.filter(k => before.has(k)).length; again += s.again; });
  return { songs: out, again };
}

// the share of voiced songs that say each of a style's own lines
function styleShare(style, songs) {
  const R = STYLES[style], own = new Set(Object.values((R.spoken && R.spoken.lines) || {}).flat().map(enOf));
  const voiced = songs.filter(s => s.said.length);
  const counts = {};
  for (const s of voiced) for (const k of s.said) if (own.has(k)) counts[k] = (counts[k] || 0) + 1;
  const shares = Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, Math.round((n / Math.max(1, voiced.length)) * 1000) / 1000]));
  return { style, voiced: voiced.length, lines: own.size, max: Math.max(0, ...Object.values(shares)), shares };
}

const mean = xs => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0);
const result = { recent: RECENT, configs: {}, long: {} };
for (const [name, voice] of Object.entries(CONFIGS)) {
  const sessions = SESSIONS.map(s => ({ seed: s.seed, styles: s.styles, ...runSession(s, voice, SONGS) }));
  const voiced = sessions.flatMap(s => s.songs).filter(s => s.voiceBars > 0);
  result.configs[name] = {
    voice, sessions,
    summary: {
      songs: sessions.length * SONGS, voiced: voiced.length,
      voiceBars: mean(voiced.map(s => s.voiceBars)), maxVoiceBars: Math.max(0, ...voiced.map(s => s.voiceBars)),
      mostStarts: mean(voiced.map(s => s.mostStarts)), maxMostStarts: Math.max(0, ...voiced.map(s => s.mostStarts)),
      share: mean(voiced.map(s => s.share)), againWithin5: sessions.reduce((a, s) => a + s.again, 0),
      songsWithRepeat: voiced.filter(s => s.again > 0).length,
    },
  };
}
for (const style of LONG.styles) {
  const r = runSession({ seed: `vr-long-${style}`, styles: [style] }, CONFIGS['refrain-1'], LONG.songs);
  const d = runSession({ seed: `vr-long-${style}`, styles: [style] }, null, LONG.songs);
  result.long[style] = { 'refrain-1': { ...styleShare(style, r.songs), againWithin5: r.again }, default: { ...styleShare(style, d.songs), againWithin5: d.again } };
}

if (process.argv.includes('--json')) { console.log(JSON.stringify(result, null, 1)); process.exit(0); }
const pad = (x, n) => String(x).padEnd(n);
console.log(`Voice-track repeats: ${SESSIONS.length} sessions of ${SONGS} songs per option (seeds ${SESSIONS.map(s => s.seed).join(', ')})\n`);
console.log(`${pad('option', 12)}${pad('voiced', 8)}${pad('voice bars', 18)}${pad('most starts', 18)}${pad('share', 8)}${pad('again ≤5', 10)}songs with a repeat`);
for (const [name, c] of Object.entries(result.configs)) {
  const s = c.summary;
  console.log(`${pad(name, 12)}${pad(`${s.voiced}/${s.songs}`, 8)}${pad(`${s.voiceBars} (max ${s.maxVoiceBars})`, 18)}${pad(`${s.mostStarts} (max ${s.maxMostStarts})`, 18)}${pad(s.share, 8)}${pad(s.againWithin5, 10)}${s.songsWithRepeat}`);
}
console.log(`\nStyle lines over ${LONG.songs} songs of one style (share of voiced songs saying the most frequent style line; repeats within 5 songs)`);
for (const [style, x] of Object.entries(result.long)) console.log(`${pad(style, 18)}refrain-1: ${x['refrain-1'].max} of ${x['refrain-1'].voiced}, again ${x['refrain-1'].againWithin5}   default: ${x.default.max} of ${x.default.voiced}, again ${x.default.againWithin5}`);
if (process.argv.includes('--songs')) {
  for (const [name, c] of Object.entries(result.configs)) for (const s of c.sessions) for (const x of s.songs) if (x.voiceBars) console.log(`${name} ${s.seed} #${x.index + 1} ${x.title} · ${x.bars} bars · voice ${x.voiceBars} (${x.share}) · most ${x.mostStarts} · again ${x.again} · ${JSON.stringify(x.lines)}`);
}
