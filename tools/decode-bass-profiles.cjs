// The bass sounds the writer can write, measured once through the app (decode-refine group 10, round 6, review C1/C2):
// each candidate alone for four bars at 120 BPM in one fast export, its harmonic profile read as level B reads the
// original's bass (src/decode/kit-measure.js bassDrive: the fundamental's share of the first 12 harmonics, their slope,
// the even against the odd harmonics) on bars 2 to 4. The candidates are the app's own bass sounds: a wave through the
// bass track's default filter (cutoff 700, resonance 8) and the app's drive `.distort(d).distortvol(.5)` at
// d = 0, 1, 2, 3, 4.5 on the sawtooth and the square. Writes src/decode/bass-profiles.js, which the writer reads to
// write the nearest candidate's drive (and wave). Run again when the writer's bass sounds or the measure change.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-bass-profiles.cjs [--print]   (dev server on PORT; ffmpeg)
const fs = require('node:fs'), path = require('node:path');
const { exportSong } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '.cache', 'decode', 'levels');
const BARS = 4, BPM = 120;
// a bass line of 8 notes on 16 steps (as tools/decode-levels.cjs), its MIDI notes per step
const LINE = ['a1', '~', 'a1', '~', 'c2', '~', 'a1', '~', 'e1', '~', 'a1', '~', 'g1', '~', 'a1', '~'];
const MIDI = { a1: 33, c2: 36, e1: 28, g1: 31 };
const BASS = `note("${LINE.join(' ')}")`;
const items = [];
for (const wave of ['sawtooth', 'square']) for (const d of [0, 1, 2, 3, 4.5]) items.push({ key: `${wave}:${d}`, wave, drive: d });
for (const wave of ['triangle', 'sine', 'supersaw']) items.push({ key: `${wave}:0`, wave, drive: 0 });
(async () => {
  const sections = items.map((x, i) => ({ name: `S${i}`, bars: BARS, bpm: BPM, key: 'A' }));
  const tracks = items.map((x, i) => ({ id: `t${i}`, name: x.key, type: 'code', settings: {}, patterns: { A: { code: `${BASS}.s("${x.wave}").lpf(700).lpq(8)${x.drive ? `.distort(${x.drive}).distortvol(.5)` : ''}.gain(.6)` } }, clips: [{ section: `S${i}`, pattern: 'A' }] }));
  // (inside a mix, as level B hears a bass: a 909 with the kick on the beat and the hats between, the app's pad; the
  // profile reads only the steps without a kick, as on an original)
  const all = sections.map(x => ({ section: x.name, pattern: 'A' }));
  tracks.push({ id: 'drums', name: 'Drums', type: 'drums', settings: { kit: 'RolandTR909' }, patterns: { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } } }, clips: all });
  tracks.push({ id: 'pad', name: 'Pad', type: 'pad', settings: {}, patterns: { A: { preset: 'pad' } }, clips: all });
  const song = { format: 'coding-misk/song', version: 2, id: 'decode-bass-profiles', title: 'Decode bass profiles', sections, tracks };
  const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  fs.mkdirSync(OUT, { recursive: true });
  const wav = path.join(OUT, 'bass-profiles.wav');
  console.log(`exported the calibration song (${await exportSong(page, song, wav)} s)`);
  await browser.close();
  const S = await import('./decode-similarity.mjs');
  const { bassDrive } = await import('../src/decode/kit-measure.js');
  const x = S.readAudio(wav), sr = S.RATE, bar = 240 / BPM, st = bar / 16, out = {};
  items.forEach((it, i) => {
    const notes = [];
    for (let b = i * BARS + 1; b < (i + 1) * BARS; b++) LINE.forEach((n, j) => { if (MIDI[n] && j % 4) notes.push({ t: b * bar + j * st, midi: MIDI[n] }); });
    const p = bassDrive(x, sr, notes, []);
    out[it.key] = { wave: it.wave, drive: it.drive, h1: p.h1, slope: p.slope, evenOdd: p.evenOdd };
  });
  const src = `// The bass sounds the writer can write, measured once through the app by tools/decode-bass-profiles.cjs (decode-refine
// group 10, round 6): per candidate (wave and the app's drive amount, through the bass's default filter, cutoff 700 and
// resonance 8, inside a mix of a 909 and the app's pad, on the steps without a kick) the harmonic profile kit-measure.js bassDrive reads on an original: h1, the fundamental's share of the
// first 12 harmonics; slope, dB per octave over harmonics 1 to 8; evenOdd, dB. Made by the tool; do not edit.
export const BASS_PROFILES = {
${Object.entries(out).map(([k, v]) => `  '${k}': { wave: '${v.wave}', drive: ${v.drive}, h1: ${v.h1}, slope: ${v.slope}, evenOdd: ${v.evenOdd} },`).join('\n')}
};
`;
  if (process.argv.includes('--print')) console.log(src);
  else { fs.writeFileSync(path.join(ROOT, 'src', 'decode', 'bass-profiles.js'), src); console.log(`wrote src/decode/bass-profiles.js (${items.length} sounds)`); }
})().catch(e => { console.error(e); process.exit(1); });
