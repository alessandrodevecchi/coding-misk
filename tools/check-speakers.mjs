// The speakers' voices (real-voices D8): every speaker (SPEAKERS in src/song/build.js) is listed by `say -v '?'` for each
// language it speaks and sounds different from the default voice (a probe line with the same audio data means the voice
// is listed but not installed, #63); no file of a speaker's bank is a copy of the default voice's file of the same name;
// the banks `node tools/voice.mjs --prune` would list are reported (a warning, they never fail the check). Also the
// generator's guard on a temporary samples folder: a speaker sample copied from the default voice is found and dropped.
// Deletes nothing in public/samples; writes only to a temporary folder. No browser; macOS `say` and ffmpeg (else skips).
//   npm run check:speakers [-- --root public/samples]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SPEAKERS, SPEAKER_LANGS, speaks } from '../src/song/build.js';
import { canSpeak, systemVoice, voiceDiffers, sameAudio, dropCopy, DEFAULT_VOICE } from './voice-sample.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = opt('root', path.join('public', 'samples'));
let failed = 0;
const ok = msg => console.log(`ok    ${msg}`), fail = msg => { failed++; console.log(`FAIL  ${msg}`); }, warn = msg => console.log(`warn  ${msg}`);
const INSTALL = 'install it in System Settings, Accessibility, Spoken Content, System voice, Manage voices';

if (!canSpeak()) { console.log('skip  no macOS `say` or no ffmpeg here: the speakers cannot be checked'); process.exit(0); }

// 1. every speaker listed and real in each language it speaks
for (const sp of SPEAKERS) for (const lang of SPEAKER_LANGS[sp]) {
  const v = systemVoice(lang, sp);
  if (!v) { fail(`${sp} (${lang}): not listed by say -v '?'; ${INSTALL}`); continue; }
  if (!voiceDiffers(lang, v)) { fail(`${sp} (${lang}): "${v}" speaks like the default voice ${DEFAULT_VOICE[lang]} (listed, not installed); ${INSTALL}`); continue; }
  ok(`${sp} (${lang}): system voice "${v}", different from ${DEFAULT_VOICE[lang]}`);
}

// 2. no file of a speaker's bank is a copy of the default voice's file of the same name
const wavs = d => (fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.wav')) : []);
for (const sp of SPEAKERS) for (const lang of SPEAKER_LANGS[sp]) {
  const bank = `say_${lang}_${sp}`, dir = path.join(ROOT, bank), def = path.join(ROOT, `say_${lang}`), files = wavs(dir);
  if (!files.length) { warn(`${bank}: no samples yet (npm run voices -- --jobs 4)`); continue; }
  const copies = files.filter(f => fs.existsSync(path.join(def, f)) && sameAudio(path.join(dir, f), path.join(def, f)));
  if (copies.length) fail(`${bank}: ${copies.length} of ${files.length} samples are copies of the default voice's (e.g. ${copies.slice(0, 3).join(', ')}); delete them and run npm run voices`);
  else ok(`${bank}: ${files.length} samples, none a copy of the default voice's`);
}

// 3. the banks the prune would list (removed speakers, languages a speaker does not speak): a warning only
const old = (fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : []).filter(d => { const m = /^say_([a-z]{2})_([a-z0-9]+)$/.exec(d); return m && !speaks(m[1], m[2]) && fs.statSync(path.join(ROOT, d)).isDirectory(); }).sort();
if (old.length) {
  const some = old.slice(0, 4).map(b => { const f = wavs(path.join(ROOT, b)), lang = b.slice(4, 6), c = f.filter(x => sameAudio(path.join(ROOT, b, x), path.join(ROOT, `say_${lang}`, x))).length; return `${b} (${c} of ${f.length} copies of the default voice)`; });
  warn(`${old.length} old bank(s) of removed speakers or other languages: ${some.join(', ')}${old.length > 4 ? ', …' : ''}; list them with node tools/voice.mjs --prune, delete them with node tools/voice.mjs --prune --yes`);
} else ok('no old bank of a removed speaker or another language');

// 4. the generator's per-sample copy guard, on a temporary folder: a default sample copied into a speaker's bank goes,
// a different file stays
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-misk-speakers-')), sp = SPEAKERS[0], lang = SPEAKER_LANGS[sp][0];
  try {
    const src = wavs(path.join(ROOT, `say_${lang}`))[0];
    if (!src) warn(`copy guard: no say_${lang} sample to test with (npm run voices)`);
    else {
      const text = src.replace(/\.wav$/, '').replace(/_/g, ' '), def = path.join(tmp, `say_${lang}`), own = path.join(tmp, `say_${lang}_${sp}`);
      fs.mkdirSync(def, { recursive: true }); fs.mkdirSync(own, { recursive: true });
      fs.copyFileSync(path.join(ROOT, `say_${lang}`, src), path.join(def, src));
      fs.copyFileSync(path.join(ROOT, `say_${lang}`, src), path.join(own, src));
      const dropped = dropCopy(tmp, lang, sp, text) && !fs.existsSync(path.join(own, src));
      const other = wavs(path.join(ROOT, `say_${lang}`)).find(f => f !== src);
      let kept = true;
      if (other) { fs.copyFileSync(path.join(ROOT, `say_${lang}`, other), path.join(own, src)); kept = !dropCopy(tmp, lang, sp, text) && fs.existsSync(path.join(own, src)); }
      if (dropped && kept) ok('copy guard: a speaker sample with the default voice\'s audio is deleted, a different one stays');
      else fail(`copy guard: dropped ${dropped}, different kept ${kept}`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall speaker checks passed');
process.exit(failed ? 1 : 0);
