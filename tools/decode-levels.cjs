// The sounds level B writes, measured once through the app (decode-refine D3, task 10.2): each sound alone for four
// bars at 120 BPM in one fast export, its energy per bar in the similarity check's three bands (low 20-150 Hz, mid
// 150-2000, high 2000-16000) at gain 1. Writes src/decode/part-levels.js, which the writer reads to set each part's
// gain so the code's band shares come near the original's. Run again when the writer's sounds change.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-levels.cjs [--print]   (dev server on PORT; needs ffmpeg)
const fs = require('node:fs'), path = require('node:path');
const { exportSong } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '.cache', 'decode', 'levels');
// the measured gain: each sound plays at this gain, its energy divided by its square (the master limiter stays idle)
const G = 0.4, BARS = 4, BPM = 120;
const BASS = 'note("a1 ~ a1 ~ c2 ~ a1 ~ e1 ~ a1 ~ g1 ~ a1 ~")', CHORDS = 'chord("<Am F>").voicing()', LEAD = 'n("0 ~ 2 ~ 4 ~ 2 ~ 0 ~ ~ ~ 4 3 2 ~").scale("A4:minor")';
const CUTS = { bass: [300, 600, 900, 1200], chords: [800, 1600, 2400, 4000] };
const items = [];
for (const kit of ['RolandTR909', 'RolandTR808']) items.push({ key: `drums:${kit}`, track: { type: 'drums', settings: { kit, gain: 0.9 }, rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' } } });
for (const w of ['sine', 'square', 'sawtooth']) for (const c of CUTS.bass) items.push({ key: `bass:${w}:${c}`, code: `${BASS}.s("${w}").lpf(${c}).gain(${G})` });
items.push({ key: 'bass:acid', code: `${BASS}.s("sawtooth").lpf(sine.range(250, 1000).slow(4)).lpq(8).gain(${G})` });
for (const w of ['supersaw', 'sawtooth', 'triangle']) for (const c of CUTS.chords) items.push({ key: `chords:${w}:${c}`, code: `${CHORDS}.s("${w}").lpf(${c}).gain(${G})` });
for (const w of ['sawtooth', 'square', 'triangle']) items.push({ key: `lead:${w}`, code: `${LEAD}.s("${w}").lpf(2400).gain(${G})` });

(async () => {
  const S = await import('./decode-similarity.mjs');
  const sections = items.map((x, i) => ({ name: `S${i}`, bars: BARS, bpm: BPM, key: 'A' }));
  const tracks = items.map((x, i) => x.track
    ? { id: `t${i}`, name: x.key, type: 'drums', settings: x.track.settings, patterns: { A: { rows: x.track.rows } }, clips: [{ section: `S${i}`, pattern: 'A' }] }
    : { id: `t${i}`, name: x.key, type: 'code', settings: {}, patterns: { A: { code: x.code } }, clips: [{ section: `S${i}`, pattern: 'A' }] });
  const song = { format: 'coding-misk/song', version: 2, id: 'decode-levels', title: 'Decode levels', sections, tracks };
  const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  fs.mkdirSync(OUT, { recursive: true });
  const wav = path.join(OUT, 'levels.wav');
  console.log(`exported the calibration song (${await exportSong(page, song, wav)} s)`);
  await browser.close();
  const f = S.features(S.readAudio(wav)), bar = 240 / BPM, out = {};
  items.forEach((x, i) => {
    // the bars after the first (no tail of the sound before), the mean energy per frame in each band at gain 1
    const t0 = (i * BARS + 1) * bar, t1 = (i + 1) * BARS * bar, sum = [0, 0, 0]; let n = 0;
    f.fr.forEach((fr, k) => { const t = k * f.hop; if (t >= t0 && t < t1) { sum[0] += fr.sl; sum[1] += fr.sm; sum[2] += fr.sh; n++; } });
    const g2 = x.track ? 1 : G * G;
    out[x.key] = sum.map(v => +(v / n / g2).toPrecision(3));
  });
  const src = `// The sounds level B writes, measured once through the app by tools/decode-levels.cjs (decode-refine D3): the mean
// energy per analysis frame of each sound alone at gain 1 (drums at their own gain), in the similarity check's bands
// [low 20-150 Hz, mid 150-2000, high 2000-16000]. Made by the tool; do not edit.
export const PART_LEVELS = {
${Object.entries(out).map(([k, v]) => `  '${k}': [${v.join(', ')}],`).join('\n')}
};
`;
  if (process.argv.includes('--print')) console.log(src);
  else { fs.writeFileSync(path.join(ROOT, 'src', 'decode', 'part-levels.js'), src); console.log(`wrote src/decode/part-levels.js (${items.length} sounds)`); }
})().catch(e => { console.error(e); process.exit(1); });
