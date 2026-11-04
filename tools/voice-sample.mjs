// One spoken sample (voice-full-controls D8): the per-line part of `npm run voices` (tools/voice.mjs), shared with the
// dev server's voice helper (vite.config.js). Today macOS `say` + ffmpeg; another local generator can replace
// makeSample behind the same signature. Text goes to the programs as an argument, never through a shell.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, execFile } from 'node:child_process';
// (the file name and bank of src/song/build.js, written again here: vite.config.js loads this file, and a config that
// imports src/ would restart the dev server at every edit; check:spoken asserts they stay the same)
export const saySlug = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
// (the speaker table of src/song/build.js, the same way: the speakers and the languages each speaks, real-voices D1, D2)
export const SPEAKER_LANGS = { albert: ['en'], fred: ['en'], junior: ['en'], kathy: ['en'] };
export const SPEAKERS = Object.keys(SPEAKER_LANGS);
export const speaks = (lang, s) => (SPEAKER_LANGS[s] || []).includes(lang);
export const sayBank = (lang, speaker) => (speaker && speaks(lang, speaker) ? `say_${lang}_${speaker}` : `say_${lang}`);

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
// system voice of a speaker for a language: "Kathy", or "Kathy (English (US))" / "Kathy (Inglese (USA))" depending on the
// system language; the listed name exactly, so an id never matches a longer name by its start. null when the speaker
// does not speak the language (real-voices D1) or is not listed.
export function systemVoice(lang, speaker, defaults = DEFAULT_VOICE) {
  if (!speaker) return defaults[lang];
  if (!speaks(lang, speaker)) return null;
  const want = lang === 'it' ? ['it_IT'] : ['en_US', 'en_GB'], is = n => { const x = n.toLowerCase(); return x === speaker || x.startsWith(`${speaker} (`); };
  for (const loc of want) { const v = installedVoices().find(x => x.locale === loc && is(x.name)); if (v) return v.name; }
  return null;
}
// cut the silence at the start, so the word lands on the beat; even loudness for every phrase
const FFMPEG = (src, out) => ['-y', '-loglevel', 'error', '-i', src, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-16:TP=-1.5', '-ar', '44100', '-ac', '1', out];
const run = (cmd, args) => new Promise((res, rej) => execFile(cmd, args, err => (err ? rej(err) : res())));
// the audio data of a WAV (its `data` chunk, not the header), or null
export function audioData(file) {
  let b;
  try { b = fs.readFileSync(file); } catch (e) { return null; }
  if (b.toString('ascii', 0, 4) !== 'RIFF') return null;
  for (let at = 12; at + 8 <= b.length;) {
    const id = b.toString('ascii', at, at + 4), size = b.readUInt32LE(at + 4);
    if (id === 'data') return b.subarray(at + 8, Math.min(b.length, at + 8 + size));
    at += 8 + size + (size % 2);
  }
  return null;
}
// two WAVs with the same audio data (a speaker that spoke with the default voice: #63)
export function sameAudio(a, b) { const x = audioData(a), y = audioData(b); return !!(x && y && x.equals(y)); }

// The "not installed" guard (real-voices D5): `say` speaks a voice it lists but does not have with the system voice,
// without an error. A probe line is made with the voice and with the default voice; the same audio data means the
// voice is not really there. Cached for the process (one probe per voice and language).
export const PROBE = { en: 'the city is still awake', it: 'la città è ancora sveglia' };
const probes = new Map();
// two renders of the probe line, compared (a sync and an async form: the voice helper must not block)
const render = (dir, lang, voice, defaults) => [['a', voice], ['b', defaults[lang]]].map(([n, v]) => ({ v, aiff: path.join(dir, `${n}.aiff`), wav: path.join(dir, `${n}.wav`) }));
async function probe(lang, voice, defaults) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-misk-probe-')), r = render(dir, lang, voice, defaults);
  try {
    for (const x of r) { await run('say', ['-v', x.v, '-o', x.aiff, PROBE[lang]]); await run('ffmpeg', FFMPEG(x.aiff, x.wav)); }
    return !sameAudio(r[0].wav, r[1].wav);
  } catch (e) { return false; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function probeSync(lang, voice, defaults) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-misk-probe-')), r = render(dir, lang, voice, defaults);
  try {
    for (const x of r) { execFileSync('say', ['-v', x.v, '-o', x.aiff, PROBE[lang]]); execFileSync('ffmpeg', FFMPEG(x.aiff, x.wav)); }
    return !sameAudio(r[0].wav, r[1].wav);
  } catch (e) { return false; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
// whether a system voice sounds different from the default voice of the language (false: listed, not installed).
// The sync form blocks (npm run voices, checks); the async one does not (the dev server's voice helper).
const probeKey = (lang, voice, defaults) => `${lang}|${voice}|${defaults[lang]}`;
export function voiceDiffers(lang, voice, defaults = DEFAULT_VOICE) {
  if (voice === defaults[lang]) return true;
  const k = probeKey(lang, voice, defaults), got = probes.get(k);
  if (typeof got === 'boolean') return got;
  const r = probeSync(lang, voice, defaults);
  probes.set(k, r);
  return r;
}
export async function voiceDiffersAsync(lang, voice, defaults = DEFAULT_VOICE) {
  if (voice === defaults[lang]) return true;
  const k = probeKey(lang, voice, defaults);
  if (!probes.has(k)) probes.set(k, probe(lang, voice, defaults).then(r => { probes.set(k, r); return r; }));
  return probes.get(k);
}
// the system voice of a speaker when it is really there: its name, or null (not listed, not in that language, or it
// speaks like the default voice)
export function realVoice(lang, speaker, defaults = DEFAULT_VOICE) {
  const v = systemVoice(lang, speaker, defaults);
  return v && (!speaker || voiceDiffers(lang, v, defaults)) ? v : null;
}
export async function realVoiceAsync(lang, speaker, defaults = DEFAULT_VOICE) {
  const v = systemVoice(lang, speaker, defaults);
  return v && (!speaker || (await voiceDiffersAsync(lang, v, defaults))) ? v : null;
}
// The per-sample copy guard (D5): a speaker sample with the same audio data as the default voice's sample of the same
// text is deleted. → true when it was a copy
export function dropCopy(root, lang, speaker, text) {
  const bank = sayBank(lang, speaker), def = sayBank(lang);
  if (bank === def) return false;
  const f = path.join(root, bank, `${saySlug(text)}.wav`), d = path.join(root, def, `${saySlug(text)}.wav`);
  if (!fs.existsSync(f) || !fs.existsSync(d) || !sameAudio(f, d)) return false;
  fs.rmSync(f, { force: true });
  return true;
}
// The sample of a text: public/samples/say_<lang>[_<speaker>]/<slug>.wav. → { bank, file, made } or null when the
// speaker is not installed (not listed, or it speaks like the default voice); { bank, file: null, made: false, copy:
// true } when the new sample was a copy of the default voice's (deleted). force: make it again when it exists.
export function makeSample(text, lang, speaker = '', { root = path.join('public', 'samples'), force = false, defaults = DEFAULT_VOICE } = {}) {
  const voice = realVoice(lang, speaker, defaults);
  if (!voice) return null;
  const bank = sayBank(lang, speaker), dir = path.join(root, bank), out = path.join(dir, `${saySlug(text)}.wav`);
  if (fs.existsSync(out) && !force) return { bank, file: out, made: false };
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.aiff`);
  try {
    execFileSync('say', ['-v', voice, '-o', tmp, text]);
    execFileSync('ffmpeg', FFMPEG(tmp, out));
  } finally { fs.rmSync(tmp, { force: true }); }
  if (speaker && dropCopy(root, lang, speaker, text)) return { bank, file: null, made: false, copy: true };
  return { bank, file: out, made: true };
}
// the same, without blocking (the dev server's voice helper, npm run voices --jobs): → a promise of the same
export async function makeSampleAsync(text, lang, speaker = '', { root = path.join('public', 'samples'), force = false, defaults = DEFAULT_VOICE } = {}) {
  const voice = await realVoiceAsync(lang, speaker, defaults);
  if (!voice) return null;
  const bank = sayBank(lang, speaker), dir = path.join(root, bank), out = path.join(dir, `${saySlug(text)}.wav`);
  if (fs.existsSync(out) && !force) return { bank, file: out, made: false };
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.aiff`);
  try {
    await run('say', ['-v', voice, '-o', tmp, text]);
    await run('ffmpeg', FFMPEG(tmp, out));
  } finally { fs.rmSync(tmp, { force: true }); }
  if (speaker && dropCopy(root, lang, speaker, text)) return { bank, file: null, made: false, copy: true };
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
// public/samples/say_lengths.json: the length of every sample ({ "say_en_fred/the_city.wav": 1.42 }); only: the
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

// ---------- my-phrases: sample housekeeping (D5, D6, D8), shared with the dev server's voice helper ----------
// A sample's path relative to public/samples: say_<lang>[_<speaker>]/<slug>.wav, nothing else
export const SAMPLE_PATH = /^say_([a-z]{2})(_[a-z]+)?\/([a-z0-9_]{1,48})\.wav$/;
// "say_en_fred/x.wav" → "en|x": the key a page protects (by language and slug, every bank of that language)
export const protectKey = rel => { const m = SAMPLE_PATH.exec(rel); return m ? `${m[1]}|${m[3]}` : null; };
// Every say_* bank with its files and sizes (GET /voice/usage): { say_it: [{ f: 'x.wav', b: 81234 }] }
export function sampleUsage(root = path.join('public', 'samples')) {
  const out = {};
  if (!fs.existsSync(root)) return out;
  for (const bank of fs.readdirSync(root).filter(d => /^say_[a-z]{2}(_[a-z]+)?$/.test(d)).sort()) {
    const dir = path.join(root, bank);
    if (!fs.statSync(dir).isDirectory()) continue;
    out[bank] = fs.readdirSync(dir).filter(f => f.endsWith('.wav')).sort().map(f => ({ f, b: fs.statSync(path.join(dir, f)).size }));
  }
  return out;
}
// the ledger of temporary samples: public/samples/say_temp.json { "say_it/x.wav": { expires, song } }
export const TEMP_FILE = 'say_temp.json';
export function readTemp(root = path.join('public', 'samples')) {
  try { const v = JSON.parse(fs.readFileSync(path.join(root, TEMP_FILE), 'utf8')); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
}
export function writeTemp(root, ledger) { fs.writeFileSync(path.join(root, TEMP_FILE), JSON.stringify(ledger, null, 1) + '\n'); }
const dropLengths = (root, rels) => {
  const lf = path.join(root, 'say_lengths.json');
  try { const l = JSON.parse(fs.readFileSync(lf, 'utf8')); for (const rel of rels) delete l[rel]; fs.writeFileSync(lf, JSON.stringify(l) + '\n'); } catch (e) { /* no lengths file */ }
};
// Deletes the named samples (POST /voice/delete): only paths of SAMPLE_PATH under root, never one whose language and
// slug the page protects; their lengths and ledger entries go too. → { deleted: [rel], skipped: [rel] }
export function deleteSamples(root, files, protect = []) {
  const keep = new Set(protect), deleted = [], skipped = [];
  for (const rel of [...new Set(files || [])]) {
    const k = typeof rel === 'string' ? protectKey(rel) : null;
    if (!k || keep.has(k)) { skipped.push(rel); continue; }
    const file = path.join(root, ...rel.split('/'));
    if (!fs.existsSync(file)) { skipped.push(rel); continue; }
    fs.rmSync(file, { force: true });
    deleted.push(rel);
  }
  if (deleted.length) {
    dropLengths(root, deleted);
    const t = readTemp(root);
    if (deleted.some(rel => t[rel])) { for (const rel of deleted) delete t[rel]; writeTemp(root, t); }
  }
  return { deleted, skipped };
}
// The ledger updated (POST /voice/keep): add [{ file, ms, song }] lists new temporary samples (expiry now + ms, at
// least an hour); files (saved later) and protected keys leave it. → the ledger
export function keepTemp(root, { add = [], files = [], protect = [] } = {}, now = Date.now()) {
  const t = readTemp(root), keep = new Set(protect);
  let changed = false;
  for (const x of add || []) {
    if (!x || !SAMPLE_PATH.test(x.file) || keep.has(protectKey(x.file)) || !fs.existsSync(path.join(root, ...x.file.split('/')))) continue;
    t[x.file] = { expires: new Date(now + Math.max(60 * 60 * 1000, +x.ms || 0)).toISOString(), ...(x.song ? { song: String(x.song).slice(0, 80) } : {}), ...(typeof x.text === 'string' && x.text ? { text: x.text.slice(0, 160), lang: x.file.slice(4, 6) } : {}) };
    changed = true;
  }
  for (const rel of [...(files || []), ...Object.keys(t).filter(rel => keep.has(protectKey(rel)))]) if (t[rel]) { delete t[rel]; changed = true; }
  if (changed) writeTemp(root, t);
  return t;
}
// The sweep (D6): deletes the expired temporary samples, except those of a song playing now. → [rel deleted]
export function sweepTemp(root, playing = [], now = Date.now()) {
  const t = readTemp(root), on = new Set(playing), gone = [];
  for (const [rel, e] of Object.entries(t)) {
    if (!(Date.parse(e && e.expires) <= now) || (e && e.song && on.has(e.song))) continue;
    if (SAMPLE_PATH.test(rel)) fs.rmSync(path.join(root, ...rel.split('/')), { force: true });
    delete t[rel]; gone.push(rel);
  }
  if (gone.length) { writeTemp(root, t); dropLengths(root, gone); }
  return gone;
}
