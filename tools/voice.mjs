// Spoken comments for live builds, generated with macOS `say` (local and free).
// Collects every "say" phrase of the songs in songs/, the comments of derived live builds and the endless
// director's phrase pool (src/endless/phrases.js) with the interlude comments (transitions.js), and writes one
// WAV per phrase, language and speaker: public/samples/say_<lang>[_<speaker>]/<slug>.wav (speaker: the voice
// track's `speaker` setting, see SPEAKERS in src/song/build.js; none = the default voice).
// The app plays them on the bar of their step. Files are git-ignored (Apple voices): run this again to make them.
//   node tools/voice.mjs [--en Samantha] [--it Alice] [--force]
// Needs macOS (`say`) and ffmpeg.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { songFiles } from './songs-dir.mjs';
import { PHRASES, saySlug, sayBank, voiceOf } from '../src/song/build.js';
import { loadStyles } from './styles-dir.mjs';
import { allPhrases } from '../src/endless/phrases.js';
import { INTERLUDE_SAY } from '../src/endless/transitions.js';

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
// the director's pool, for the default voice and every speaker a style recipe names
const speakers = new Set(['', ...loadStyles().map(r => (r.voice && r.voice.speaker) || '')]);
for (const sp of speakers) [...allPhrases(), ...INTERLUDE_SAY.map(([en, it]) => ({ en, it }))].forEach(p => addSay(p, sp));

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
console.log(`spoken comments: ${made} made, ${kept} already there (${phrases.size} banks; default voices: en ${DEFAULT_VOICE.en}, it ${DEFAULT_VOICE.it})`);
if (missing.size) console.log(`speakers not installed, left out: ${[...missing].join(', ')}`);
