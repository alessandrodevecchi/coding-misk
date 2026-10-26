// One spoken sample (voice-full-controls D8): the per-line part of `npm run voices` (tools/voice.mjs), shared with the
// dev server's voice helper (vite.config.js). Today macOS `say` + ffmpeg; another local generator can replace
// makeSample behind the same signature. Text goes to the programs as an argument, never through a shell.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execFile } from 'node:child_process';
// (the file name and bank of src/song/build.js, written again here: vite.config.js loads this file, and a config that
// imports src/ would restart the dev server at every edit; check:spoken asserts they stay the same)
export const saySlug = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
export const sayBank = (lang, speaker) => (speaker ? `say_${lang}_${speaker}` : `say_${lang}`);

export const DEFAULT_VOICE = { en: 'Samantha', it: 'Alice' };
export const MAX_WORDS = 12;
let installedCache = null;
// the system voices (name and locale), or [] where `say` does not exist
export function installedVoices() {
  if (installedCache) return installedCache;
  try { installedCache = execFileSync('say', ['-v', '?'], { encoding: 'utf8' }).split('\n').map(l => l.match(/^(.+?)\s+([a-z]{2}_[A-Z]{2})\s+#/)).filter(Boolean).map(m => ({ name: m[1].trim(), locale: m[2] })); }
  catch (e) { installedCache = []; }
  return installedCache;
}
// the generator exists on this machine: `say` with its voices, and ffmpeg
export function canSpeak() {
  if (!installedVoices().length) return false;
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch (e) { return false; }
}
// system voice of a speaker for a language: "Eddy (English (US))" or "Eddy (Inglese (USA))" depending on the system language
export function systemVoice(lang, speaker, defaults = DEFAULT_VOICE) {
  if (!speaker) return defaults[lang];
  const want = lang === 'it' ? ['it_IT'] : ['en_US', 'en_GB'];
  for (const loc of want) { const v = installedVoices().find(x => x.locale === loc && x.name.toLowerCase().startsWith(speaker)); if (v) return v.name; }
  return null;
}
// The sample of a text: public/samples/say_<lang>[_<speaker>]/<slug>.wav. → { bank, file, made } or null when the
// speaker is not installed. force: make it again when it exists.
export function makeSample(text, lang, speaker = '', { root = path.join('public', 'samples'), force = false, defaults = DEFAULT_VOICE } = {}) {
  const voice = systemVoice(lang, speaker, defaults);
  if (!voice) return null;
  const bank = sayBank(lang, speaker), dir = path.join(root, bank), out = path.join(dir, `${saySlug(text)}.wav`);
  if (fs.existsSync(out) && !force) return { bank, file: out, made: false };
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${process.pid}-${Date.now()}.aiff`);
  try {
    execFileSync('say', ['-v', voice, '-o', tmp, text]);
    // cut the silence at the start, so the word lands on the beat; even loudness for every phrase
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-16:TP=-1.5', '-ar', '44100', '-ac', '1', out]);
  } finally { fs.rmSync(tmp, { force: true }); }
  return { bank, file: out, made: true };
}
// the same, without blocking (the dev server's voice helper): → a promise of { bank, file, made } or null
const run = (cmd, args) => new Promise((res, rej) => execFile(cmd, args, err => (err ? rej(err) : res())));
export async function makeSampleAsync(text, lang, speaker = '', { root = path.join('public', 'samples'), force = false, defaults = DEFAULT_VOICE } = {}) {
  const voice = systemVoice(lang, speaker, defaults);
  if (!voice) return null;
  const bank = sayBank(lang, speaker), dir = path.join(root, bank), out = path.join(dir, `${saySlug(text)}.wav`);
  if (fs.existsSync(out) && !force) return { bank, file: out, made: false };
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${process.pid}-${Date.now()}.aiff`);
  try {
    await run('say', ['-v', voice, '-o', tmp, text]);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-16:TP=-1.5', '-ar', '44100', '-ac', '1', out]);
  } finally { fs.rmSync(tmp, { force: true }); }
  return { bank, file: out, made: true };
}
// the length of a WAV in seconds, read from its header
export function wavSeconds(file) {
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
}
// public/samples/say_lengths.json: the length of every sample ({ "say_en_eddy/the_city.wav": 1.42 }); only: the
// samples to add to the file as it is (the voice helper), else every bank is read again
export function writeLengths(root = path.join('public', 'samples'), only = null) {
  const file = path.join(root, 'say_lengths.json');
  let lengths = {};
  if (only) { try { lengths = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { lengths = {}; } for (const f of only) { const s = wavSeconds(f); if (s) lengths[path.relative(root, f).split(path.sep).join('/')] = s; } }
  else for (const bank of fs.readdirSync(root).filter(d => /^say_/.test(d) && fs.statSync(path.join(root, d)).isDirectory()).sort()) {
    for (const f of fs.readdirSync(path.join(root, bank)).filter(x => x.endsWith('.wav')).sort()) { const s = wavSeconds(path.join(root, bank, f)); if (s) lengths[`${bank}/${f}`] = s; }
  }
  fs.writeFileSync(file, JSON.stringify(lengths) + '\n');
  return lengths;
}
