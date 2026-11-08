// Missing voice samples (spoken-text-on-stage D9): every line the app may speak (the built-in and example songs, their
// live builds and Crescendo comments, the director's phrases, the styles' lines, the vocabularies and the poetic images,
// in both languages and for every speaker the songs and styles name), as tools/voice.mjs lists them, against the
// samples in public/samples/say_*. Prints the lines without a sample per bank, and how many of them the default voice
// speaks instead (the visible side of #63). No browser.
//   npm run check:samples                 report only
//   npm run check:samples -- --strict     exit 1 when a line has no sample (for CI-like runs); a speaker's sample of a
//                                         narrator line is reported, not counted (radio-narrator-speakers)
//   npm run check:samples -- --speaker junior   only the say_<lang>_junior banks
//   npm run check:samples -- --make       make the missing samples with tools/voice.mjs (macOS `say` and ffmpeg)
//   npm run check:samples -- --list       print every missing file
//   npm run check:samples -- --root dir   the samples of another folder (default public/samples)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2), strict = args.includes('--strict'), make = args.includes('--make'), list = args.includes('--list');
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const ROOT = opt('root') || path.join('public', 'samples'), speaker = opt('speaker');
const listed = flag => execFileSync(process.execPath, ['--no-warnings', 'tools/voice.mjs', flag], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').map(x => x.trim()).filter(x => x.endsWith('.wav'));
// (--speaker: only the banks say_<lang>_<id>)
const mine = f => !speaker || new RegExp(`^say_[a-z]{2}_${speaker}/`).test(f);
const wanted = () => listed('--list').filter(mine);
// the speakers' samples of narrator lines that no other line needs (tools/voice.mjs --list-narrator): not counted by --strict
const narratorOnly = new Set(listed('--list-narrator'));
const has = f => fs.existsSync(path.join(ROOT, f));
const size = f => { try { return fs.statSync(path.join(ROOT, f)).size; } catch (e) { return 0; } };
const mb = b => `${(b / 1024 / 1024).toFixed(1)} MB`;
// the default voice's file of a speaker's line: say_it_reed/x.wav → say_it/x.wav
const fallbackOf = f => f.replace(/^(say_[a-z]{2})_[a-z0-9]+\//, '$1/');

function report() {
  const all = [...new Set(wanted())], missing = all.filter(f => !has(f));
  const banks = new Map();
  for (const f of missing) { const b = f.split('/')[0]; if (!banks.has(b)) banks.set(b, []); banks.get(b).push(f); }
  const fellBack = missing.filter(f => fallbackOf(f) !== f && has(fallbackOf(f)));
  if (speaker) {
    const here = all.filter(has), bytes = here.reduce((a, f) => a + size(f), 0);
    console.log(`speaker ${speaker}: ${here.length} samples present, ${mb(bytes)} in ${ROOT}`);
  }
  console.log(`voice samples: ${all.length} lines over ${new Set(all.map(f => f.split('/')[0])).size} banks, ${missing.length} without a sample${fellBack.length ? ` (${fellBack.length} spoken by the default voice instead, #63)` : ''}`);
  for (const [b, l] of [...banks].sort((x, y) => x[0].localeCompare(y[0]))) {
    // (a speaker's bank: how many are narrator lines, and the size of the default voice's files of the missing lines)
    const nar = l.filter(f => narratorOnly.has(f)).length, def = l.filter(f => fallbackOf(f) !== f).reduce((a, f) => a + size(fallbackOf(f)), 0);
    const extra = fallbackOf(`${b}/x.wav`) !== `${b}/x.wav` ? `  (${nar} narrator; default voice's files ${mb(def)})` : '';
    console.log(`  ${b.padEnd(18)} ${String(l.length).padStart(4)} missing${extra}${list ? '' : `  e.g. ${l.slice(0, 3).map(f => path.basename(f, '.wav')).join(', ')}`}`);
    if (list) for (const f of l) console.log(`    ${f}`);
  }
  return missing;
}

let missing = report();
if (make && missing.length) {
  if (process.platform !== 'darwin') { console.log('--make needs macOS (`say`); run npm run voices on a Mac'); process.exit(1); }
  console.log('making the missing samples with tools/voice.mjs …');
  execFileSync(process.execPath, ['--no-warnings', 'tools/voice.mjs', '--root', ROOT], { stdio: 'inherit' });
  missing = report();
}
if (!fs.existsSync(path.join(ROOT, 'say_lengths.json'))) console.log('no say_lengths.json: captions hold 2 bars (npm run voices writes it)');
const counted = missing.filter(f => !narratorOnly.has(f));
if (strict && missing.length > counted.length) console.log(`\n${missing.length - counted.length} speaker sample(s) of narrator lines missing: reported, not counted by --strict`);
if (strict && counted.length) { console.log(`\n${counted.length} line(s) without a sample (--strict)`); process.exit(1); }
