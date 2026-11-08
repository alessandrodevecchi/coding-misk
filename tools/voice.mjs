// Spoken comments for live builds, generated with macOS `say` (local and free).
// Collects every "say" phrase of the songs in songs/, the comments of derived live builds and Crescendo builds, the endless
// director's phrase pool (src/endless/phrases.js) with the interlude comments (transitions.js), and writes one
// WAV per phrase, language and speaker: public/samples/say_<lang>[_<speaker>]/<slug>.wav (speaker: the voice
// track's `speaker` setting, see SPEAKERS in src/song/build.js; none = the default voice; a speaker that does not speak
// the language: the default voice's bank, real-voices D2).
// The app plays them on the bar of their step. Files are git-ignored (Apple voices): run this again to make them.
// Voice instrument (voice-instrument): the lines of the songs' spoken tracks, the styles' spoken lines and the
// vocabulary (one sample per entry) for the speakers that speak them. The narrator's built-in lines (the director's
// pool, the interlude comments and the poetic images: the vocabulary's poetic group, the songs' and styles' own) for the
// default voice and every speaker in SPEAKERS, because the director can draw any speaker for the narrator of any style
// (radio-narrator-speakers D1; combos.json does not narrow it, D2). The length of every sample goes to
// public/samples/say_lengths.json, so lines are placed from the length of the sample in use.
//   node tools/voice.mjs [--en Samantha] [--it Alice] [--force] [--default-only] [--song file.json …] [--list]
//                        [--list-narrator] [--jobs 4]
//                        [--root public/samples]
//   node tools/voice.mjs --prune [--yes] [--root public/samples]
// --song: also a song exported from the browser (its spoken lines and steps); --list: print the samples it would
// make, make none; --list-narrator: print only the speakers' samples of narrator lines that no other line needs (what
// check:samples --strict does not count, radio-narrator-speakers); --jobs N: make up to N samples at a time (default 4, at most the number of cores; real-voices D6).
// A speaker that speaks like the default voice is not installed (real-voices D5): its lines are left out with a warning,
// and a speaker sample that came out as a copy of the default voice's is deleted.
// --prune: list the banks of removed speakers and of languages a speaker does not speak, with their size; --prune
// --yes: delete exactly those banks (real-voices D7). Nothing else deletes banks.
// A speaker in SYSTEM_SPEAKERS (tools/voice-sample.mjs, siri4: #82) speaks with the macOS system voice (`say` without
// -v), for the voices `say -v` cannot name: set that voice as the system voice before running this, and keep it.
// Needs macOS (`say`) and ffmpeg; the per-line part is tools/voice-sample.mjs (voice-full-controls).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { songFiles } from './songs-dir.mjs';
import { PHRASES, saySlug, sayBank, voiceOf, speaks } from '../src/song/build.js';
import { CRESCENDO_PHRASES } from '../src/song/crescendo.js';
import { loadStyles } from './styles-dir.mjs';
import { allPhrases } from '../src/endless/phrases.js';
import { INTERLUDE_SAY } from '../src/endless/transitions.js';
import { SPEAKERS, SPEAKER_LANGS } from '../src/song/build.js';
import { lineOf, lineTexts, speakerOf, setSpokenContext } from '../src/song/spoken.js';
import { vocabularyTexts, poeticTexts } from '../src/song/vocabulary.js';

import { systemVoice, realVoice, makeSampleAsync, writeLengths, readTemp, writeTemp, SYSTEM_SPEAKERS } from './voice-sample.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const DEFAULT_VOICE = { en: opt('en', 'Samantha'), it: opt('it', 'Alice') }, force = args.includes('--force'), listOnly = args.includes('--list') || args.includes('--list-narrator'), narratorOnly = args.includes('--list-narrator');
const ROOT = opt('root', path.join('public', 'samples'));
const JOBS = Math.max(1, Math.min(os.cpus().length || 1, parseInt(opt('jobs', '4'), 10) || 4));

// --prune (real-voices D7): the say_<lang>_<id> banks whose id is not a speaker or does not speak <lang>
if (args.includes('--prune')) {
  const yes = args.includes('--yes'), banks = [];
  const dirSize = d => fs.readdirSync(d).reduce((a, f) => { const st = fs.statSync(path.join(d, f)); return { n: a.n + (st.isFile() ? 1 : 0), b: a.b + (st.isFile() ? st.size : 0) }; }, { n: 0, b: 0 });
  for (const d of fs.existsSync(ROOT) ? fs.readdirSync(ROOT).sort() : []) {
    const m = /^say_([a-z]{2})_([a-z0-9]+)$/.exec(d);
    if (!m || speaks(m[1], m[2]) || !fs.statSync(path.join(ROOT, d)).isDirectory()) continue;
    banks.push({ bank: d, ...dirSize(path.join(ROOT, d)) });
  }
  const mb = b => `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (!banks.length) { console.log(`prune: no old bank in ${ROOT}`); process.exit(0); }
  for (const x of banks) console.log(`  ${x.bank.padEnd(18)} ${String(x.n).padStart(5)} files  ${mb(x.b).padStart(9)}`);
  console.log(`prune: ${banks.length} old bank(s), ${mb(banks.reduce((a, x) => a + x.b, 0))} in ${ROOT}`);
  if (!yes) { console.log('nothing deleted; add --yes to delete exactly these banks'); process.exit(0); }
  for (const x of banks) fs.rmSync(path.join(ROOT, x.bank), { recursive: true, force: true });
  writeLengths(ROOT);
  const t = readTemp(ROOT), gone = Object.keys(t).filter(rel => banks.some(x => rel.startsWith(`${x.bank}/`)));
  if (gone.length) { for (const rel of gone) delete t[rel]; writeTemp(ROOT, t); }
  console.log(`deleted ${banks.length} bank(s); say_lengths.json written again${gone.length ? `, ${gone.length} temporary sample(s) left the ledger` : ''}`);
  process.exit(0);
}
// songs exported from the browser (--song file.json, as many times as needed)
const extraSongs = args.flatMap((a, i) => (a === '--song' && args[i + 1] ? [args[i + 1]] : []));
// phrases per language and speaker: "en|rocko" → Set
const phrases = new Map();
// "lang|speaker|text" of the lines added by anything but the narrator (--list-narrator leaves them out)
const notNarrator = new Set();
const addSay = (say, speaker = '', narrator = false) => {
  if (!say) return;
  for (const lang of ['en', 'it']) {
    const text = typeof say === 'string' ? say : say[lang];
    if (!text) continue;
    // (a speaker that does not speak the language, or a removed one: the default voice's bank, real-voices D2)
    const key = `${lang}|${speaks(lang, speaker) ? speaker : ''}`;
    if (!phrases.has(key)) phrases.set(key, new Set());
    phrases.get(key).add(text);
    if (!narrator) notNarrator.add(`${key}|${text}`);
  }
};
const allSongFiles = [...songFiles('songs'), ...extraSongs];
for (const f of allSongFiles) {
  const song = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const s of song.build || []) { const v = voiceOf(song, s); addSay(s.say, (v && v.settings && v.settings.speaker) || ''); }
}
Object.values(PHRASES).forEach(s => addSay(s));
// Crescendo builds (#64) pick their comments from their own list, spoken by the voice track of any song
const songSpeakers = new Set(['', ...allSongFiles.flatMap(f => (JSON.parse(fs.readFileSync(f, 'utf8')).tracks || []).filter(t => t.type === 'voice').map(t => (t.settings && t.settings.speaker) || ''))]);
for (const sp of songSpeakers) CRESCENDO_PHRASES.forEach(s => addSay(s, sp));
// the director's pool and the interlude comments, for the default voice and every speaker (radio-narrator-speakers D1:
// the director draws the narrator's speaker from a style's voice.speakers, and from all speakers by chance or by the
// combos redraw)
const narratorSpeakers = ['', ...SPEAKERS];
for (const sp of narratorSpeakers) [...allPhrases(), ...INTERLUDE_SAY.map(([en, it]) => ({ en, it }))].forEach(p => addSay(p, sp, true));

// voice instrument: each line of a song's spoken tracks with the track's speaker (its own, or the one drawn for it)
const recipes = loadStyles();
setSpokenContext({ styles: Object.fromEntries(recipes.map(r => [r.id, r])) });
const songsAll = allSongFiles.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const spokenSpeakers = new Set();
for (const song of songsAll) for (const t of (song.tracks || []).filter(x => x.type === 'spoken')) {
  const sp = speakerOf(song, t);
  spokenSpeakers.add(sp);
  for (const [key, pat] of Object.entries(t.patterns || {})) {
    const line = lineOf(song, t, key, pat);
    if (line.parts) line.parts.forEach(p => addSay(p, sp)); else addSay(line.text, sp);
  }
}
// the styles' lines and the vocabulary, for the speakers of the styles' voice instrument (all speakers when a style
// with a weight names none)
for (const r of recipes.filter(x => x.spoken)) {
  const list = r.spoken.speakers && r.spoken.speakers.length ? r.spoken.speakers : SPEAKERS;
  list.forEach(sp => spokenSpeakers.add(sp));
  for (const sp of list) Object.values(r.spoken.lines || {}).flat().forEach(p => addSay(p, sp));
}
for (const sp of spokenSpeakers) vocabularyTexts().forEach(p => addSay(p, sp));
// the poetic narrator: its images for every narrator speaker (D1)
const poetic = [...poeticTexts(), ...songsAll.flatMap(s => (s.narrator && typeof s.narrator === 'object' && s.narrator.lines ? Object.values(s.narrator.lines).flat() : [])),
  ...recipes.flatMap(r => (r.narrator && typeof r.narrator === 'object' && r.narrator.lines ? Object.values(r.narrator.lines).flat() : []))];
for (const sp of narratorSpeakers) poetic.forEach(p => addSay(p, sp, true));

// a speaker of the system voice (SYSTEM_SPEAKERS, #82): every text of the default voice of its languages too, so a voice
// track or a live build that names it never falls back; its samples are made in one run, while the system voice is set
for (const sp of SYSTEM_SPEAKERS) for (const lang of SPEAKER_LANGS[sp] || []) for (const text of phrases.get(`${lang}|`) || []) addSay({ [lang]: text }, sp, !notNarrator.has(`${lang}||${text}`));
// --default-only: every text with the default voice only; the app falls back to it for any speaker
if (args.includes('--default-only')) for (const [key, set] of [...phrases]) {
  const [lang, speaker] = key.split('|');
  if (!speaker) continue;
  const def = phrases.get(`${lang}|`) || new Set();
  set.forEach(x => def.add(x)); phrases.set(`${lang}|`, def); phrases.delete(key);
}
let made = 0, kept = 0;
const missing = new Set(), copies = [], todo = [];
// the default voice first, so the copy guard of a speaker's sample finds the default voice's sample of the same text
for (const [key, set] of [...phrases].sort((a, b) => a[0].localeCompare(b[0]))) {
  const [lang, speaker] = key.split('|');
  if (!systemVoice(lang, speaker, DEFAULT_VOICE)) { missing.add(`${speaker} (${lang})`); continue; }
  if (listOnly) {
    for (const text of set) if (!narratorOnly || (speaker && !notNarrator.has(`${key}|${text}`))) console.log(path.join(sayBank(lang, speaker), `${saySlug(text)}.wav`));
    continue;
  }
  // (the probe of D5, once per speaker and language, before the pool starts)
  if (speaker && !realVoice(lang, speaker, DEFAULT_VOICE)) { missing.add(`${speaker} (${lang}: it speaks like the default voice)`); continue; }
  for (const text of set) todo.push({ text, lang, speaker });
}
if (listOnly) process.exit(0);
// a pool of JOBS samples at a time; the default voice's samples before any speaker's (the copy guard reads them)
const pool = async list => {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, list.length) }, async () => {
    while (i < list.length) {
      const x = list[i++], r = await makeSampleAsync(x.text, x.lang, x.speaker, { root: ROOT, force, defaults: DEFAULT_VOICE });
      if (r && r.copy) copies.push(`${r.bank}/${saySlug(x.text)}.wav`); else if (r && r.made) made++; else kept++;
    }
  }));
};
await pool(todo.filter(x => !x.speaker));
await pool(todo.filter(x => x.speaker));
// the length of every sample (seconds), read from the WAV header: { "say_en_fred/the_city.wav": 1.42 }
writeLengths(ROOT);
console.log(`spoken comments: ${made} made, ${kept} already there (${phrases.size} banks, ${JOBS} jobs; default voices: en ${DEFAULT_VOICE.en}, it ${DEFAULT_VOICE.it})`);
if (copies.length) console.log(`warning: ${copies.length} speaker sample(s) came out as the default voice and were deleted (the voice falls back for some text): ${copies.slice(0, 5).join(', ')}${copies.length > 5 ? ' …' : ''}`);
if (missing.size) console.log(`speakers not installed, left out: ${[...missing].join(', ')} (install them in System Settings, Accessibility, Spoken Content; npm run check:speakers)`);
