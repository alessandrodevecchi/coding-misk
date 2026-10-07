// Spoken comments for live builds, generated with macOS `say` (local and free).
// Collects every "say" phrase of the songs in songs/ and the comments of derived live builds, and writes one
// WAV per phrase and language: public/samples/say_en/<slug>.wav, public/samples/say_it/<slug>.wav.
// The app plays them on the bar of their step. Files are git-ignored (Apple voices): run this again to make them.
//   node tools/voice.mjs [--en Samantha] [--it Alice] [--force]
// Needs macOS (`say`) and ffmpeg.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { songFiles } from './songs-dir.mjs';
import { PHRASES, saySlug } from '../src/song/build.js';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const VOICES = { en: opt('en', 'Samantha'), it: opt('it', 'Alice') }, force = args.includes('--force');
const phrases = { en: new Set(), it: new Set() };
const addSay = say => {
  if (!say) return;
  if (typeof say === 'string') { phrases.en.add(say); phrases.it.add(say); return; }
  for (const lang of Object.keys(phrases)) if (say[lang]) phrases[lang].add(say[lang]);
};
for (const f of songFiles('songs')) { const song = JSON.parse(fs.readFileSync(f, 'utf8')); (song.build || []).forEach(s => addSay(s.say)); }
Object.values(PHRASES).forEach(addSay);

let made = 0, kept = 0;
for (const [lang, set] of Object.entries(phrases)) {
  const dir = path.join('public', 'samples', `say_${lang}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const text of set) {
    const out = path.join(dir, `${saySlug(text)}.wav`);
    if (fs.existsSync(out) && !force) { kept++; continue; }
    const tmp = path.join(dir, '.tmp.aiff');
    execFileSync('say', ['-v', VOICES[lang], '-o', tmp, text]);
    // cut the silence at the start, so the word lands on the beat; even loudness for every phrase
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-16:TP=-1.5', '-ar', '44100', '-ac', '1', out]);
    fs.rmSync(tmp);
    made++;
  }
}
console.log(`spoken comments: ${made} made, ${kept} already there (voices: en ${VOICES.en}, it ${VOICES.it})`);
