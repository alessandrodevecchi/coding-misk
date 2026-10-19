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
//   node tools/voice.mjs [--en Samantha] [--it Alice] [--force]
// Needs macOS (`say`) and ffmpeg.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { songFiles } from './songs-dir.mjs';
import { PHRASES, saySlug, sayBank, voiceOf } from '../src/song/build.js';
import { CRESCENDO_PHRASES } from '../src/song/crescendo.js';
import { loadStyles } from './styles-dir.mjs';
import { allPhrases } from '../src/endless/phrases.js';
import { INTERLUDE_SAY } from '../src/endless/transitions.js';
import { SPEAKERS } from '../src/song/build.js';
import { lineOf, lineTexts, speakerOf, setSpokenContext } from '../src/song/spoken.js';
import { vocabularyTexts, poeticTexts } from '../src/song/vocabulary.js';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const DEFAULT_VOICE = { en: opt('en', 'Samantha'), it: opt('it', 'Alice') }, force = args.includes('--force');
// system voice of a speaker for a language: "Eddy (English (US))" or "Eddy (Inglese (USA))" depending on the system language
const installed = execFileSync('say', ['-v', '?'], { encoding: 'utf8' }).split('\n').map(l => l.match(/^(.+?)\s+([a-z]{2}_[A-Z]{2})\s+#/)).filter(Boolean).map(m => ({ name: m[1].trim(), locale: m[2] }));
function systemVoice(lang, speaker) {
  if (!speaker) return DEFAULT_VOICE[lang];
  const want = lang === 'it' ? ['it_IT'] : ['en_US', 'en_GB'];
  for (const loc of want) { const v = installed.find(x => x.locale === loc && x.name.toLowerCase().startsWith(speaker)); if (v) return v.name; }
  return null;
}
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
for (const f of songFiles('songs')) {
  const song = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const s of song.build || []) { const v = voiceOf(song, s); addSay(s.say, (v && v.settings && v.settings.speaker) || ''); }
}
Object.values(PHRASES).forEach(s => addSay(s));
// Crescendo builds (#64) pick their comments from their own list, spoken by the voice track of any song
const songSpeakers = new Set(['', ...songFiles('songs').flatMap(f => (JSON.parse(fs.readFileSync(f, 'utf8')).tracks || []).filter(t => t.type === 'voice').map(t => (t.settings && t.settings.speaker) || ''))]);
for (const sp of songSpeakers) CRESCENDO_PHRASES.forEach(s => addSay(s, sp));
// the director's pool, for the default voice and every speaker a style recipe names
const speakers = new Set(['', ...loadStyles().map(r => (r.voice && r.voice.speaker) || '')]);
for (const sp of speakers) [...allPhrases(), ...INTERLUDE_SAY.map(([en, it]) => ({ en, it }))].forEach(p => addSay(p, sp));

// voice instrument: each line of a song's spoken tracks with the track's speaker (its own, or the one drawn for it)
const recipes = loadStyles();
setSpokenContext({ styles: Object.fromEntries(recipes.map(r => [r.id, r])) });
const songsAll = songFiles('songs').map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
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
  const [lang, speaker] = key.split('|'), voice = systemVoice(lang, speaker);
  if (!voice) { missing.add(`${speaker} (${lang})`); continue; }
  const dir = path.join('public', 'samples', sayBank(lang, speaker));
  fs.mkdirSync(dir, { recursive: true });
  for (const text of set) {
    const out = path.join(dir, `${saySlug(text)}.wav`);
    if (fs.existsSync(out) && !force) { kept++; continue; }
    const tmp = path.join(dir, '.tmp.aiff');
    execFileSync('say', ['-v', voice, '-o', tmp, text]);
    // cut the silence at the start, so the word lands on the beat; even loudness for every phrase
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-16:TP=-1.5', '-ar', '44100', '-ac', '1', out]);
    fs.rmSync(tmp);
    made++;
  }
}
// the length of every sample (seconds), read from the WAV header: { "say_en_eddy/the_city.wav": 1.42 }
const lengths = {};
const wavSeconds = file => {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF') return null;
  let rate = 44100, block = 2;
  for (let at = 12; at + 8 <= b.length;) {
    const id = b.toString('ascii', at, at + 4), size = b.readUInt32LE(at + 4);
    if (id === 'fmt ') { rate = b.readUInt32LE(at + 12); block = b.readUInt16LE(at + 20); }
    if (id === 'data') return Math.round((Math.min(size, b.length - at - 8) / (rate * block)) * 1000) / 1000;
    at += 8 + size + (size % 2);
  }
  return null;
};
const root = path.join('public', 'samples');
for (const bank of fs.readdirSync(root).filter(d => /^say_/.test(d) && fs.statSync(path.join(root, d)).isDirectory()).sort()) {
  for (const f of fs.readdirSync(path.join(root, bank)).filter(x => x.endsWith('.wav')).sort()) { const s = wavSeconds(path.join(root, bank, f)); if (s) lengths[`${bank}/${f}`] = s; }
}
fs.writeFileSync(path.join(root, 'say_lengths.json'), JSON.stringify(lengths) + '\n');
console.log(`spoken comments: ${made} made, ${kept} already there (${phrases.size} banks; default voices: en ${DEFAULT_VOICE.en}, it ${DEFAULT_VOICE.it})`);
if (missing.size) console.log(`speakers not installed, left out: ${[...missing].join(', ')}`);
