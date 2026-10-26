// Spoken comments for live builds, generated with macOS `say` (local and free).
// Collects every "say" phrase of the songs in songs/, the comments of derived live builds and Crescendo builds, the endless
// director's phrase pool (src/endless/phrases.js) with the interlude comments (transitions.js), and writes one
// WAV per phrase, language and speaker: public/samples/say_<lang>[_<speaker>]/<slug>.wav (speaker: the voice
// track's `speaker` setting, see SPEAKERS in src/song/build.js; none = the default voice).
// The app plays them on the bar of their step. Files are git-ignored (Apple voices): run this again to make them.
// Voice instrument (voice-instrument): the lines of the songs' spoken tracks, the styles' spoken lines and the
// vocabulary (one sample per entry) for the speakers that speak them, and the poetic narrator's images (the
// vocabulary's poetic group, the songs' and styles' own) for the narrator speakers. The length of every sample goes to
// public/samples/say_lengths.json, so lines are placed from the length of the sample in use.
//   node tools/voice.mjs [--en Samantha] [--it Alice] [--force] [--song file.json …] [--list]
// --song: also a song exported from the browser (its spoken lines and steps); --list: print the samples it would
// make, make none. Needs macOS (`say`) and ffmpeg; the per-line part is tools/voice-sample.mjs (voice-full-controls).
import fs from 'node:fs';
import path from 'node:path';
import { songFiles } from './songs-dir.mjs';
import { PHRASES, saySlug, sayBank, voiceOf } from '../src/song/build.js';
import { CRESCENDO_PHRASES } from '../src/song/crescendo.js';
import { loadStyles } from './styles-dir.mjs';
import { allPhrases } from '../src/endless/phrases.js';
import { INTERLUDE_SAY } from '../src/endless/transitions.js';
import { SPEAKERS } from '../src/song/build.js';
import { lineOf, lineTexts, speakerOf, setSpokenContext } from '../src/song/spoken.js';
import { vocabularyTexts, poeticTexts } from '../src/song/vocabulary.js';

import { systemVoice, makeSample, writeLengths } from './voice-sample.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const DEFAULT_VOICE = { en: opt('en', 'Samantha'), it: opt('it', 'Alice') }, force = args.includes('--force'), listOnly = args.includes('--list');
// songs exported from the browser (--song file.json, as many times as needed)
const extraSongs = args.flatMap((a, i) => (a === '--song' && args[i + 1] ? [args[i + 1]] : []));
// phrases per language and speaker: "en|rocko" → Set
const phrases = new Map();
const addSay = (say, speaker = '') => {
  if (!say) return;
  for (const lang of ['en', 'it']) {
    const text = typeof say === 'string' ? say : say[lang];
    if (!text) continue;
    const key = `${lang}|${speaker}`;
    if (!phrases.has(key)) phrases.set(key, new Set());
    phrases.get(key).add(text);
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
// the director's pool, for the default voice and every speaker a style recipe names
const speakers = new Set(['', ...loadStyles().map(r => (r.voice && r.voice.speaker) || '')]);
for (const sp of speakers) [...allPhrases(), ...INTERLUDE_SAY.map(([en, it]) => ({ en, it }))].forEach(p => addSay(p, sp));

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
// the poetic narrator: its images for every narrator speaker (the songs' voice tracks, the styles', the default)
const narrators = new Set([...songSpeakers, ...speakers]);
const poetic = [...poeticTexts(), ...songsAll.flatMap(s => (s.narrator && typeof s.narrator === 'object' && s.narrator.lines ? Object.values(s.narrator.lines).flat() : [])),
  ...recipes.flatMap(r => (r.narrator && typeof r.narrator === 'object' && r.narrator.lines ? Object.values(r.narrator.lines).flat() : []))];
for (const sp of narrators) poetic.forEach(p => addSay(p, sp));

let made = 0, kept = 0;
const missing = new Set();
for (const [key, set] of phrases) {
  const [lang, speaker] = key.split('|');
  if (!systemVoice(lang, speaker, DEFAULT_VOICE)) { missing.add(`${speaker} (${lang})`); continue; }
  for (const text of set) {
    if (listOnly) { console.log(path.join(sayBank(lang, speaker), `${saySlug(text)}.wav`)); continue; }
    const r = makeSample(text, lang, speaker, { force, defaults: DEFAULT_VOICE });
    if (r && r.made) made++; else kept++;
  }
}
if (listOnly) process.exit(0);
// the length of every sample (seconds), read from the WAV header: { "say_en_eddy/the_city.wav": 1.42 }
writeLengths(path.join('public', 'samples'));
console.log(`spoken comments: ${made} made, ${kept} already there (${phrases.size} banks; default voices: en ${DEFAULT_VOICE.en}, it ${DEFAULT_VOICE.it})`);
if (missing.size) console.log(`speakers not installed, left out: ${[...missing].join(', ')}`);
