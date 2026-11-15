// The sounds level B writes, measured once through the app (decode-refine D3, task 10.2): each sound alone for two
// bars at 120 BPM in one fast export (the acid bass for five), its mean energy per analysis frame after the first bar, in the writer's level bands
// (src/decode/kit-measure.js LEVEL_BANDS: low 20-150 Hz, three mid bands 150-400, 400-1000 and 1000-2000, high
// 2000-16000), read as level B reads the original (`bandEnergy`), at gain 1. The drums per machine and row (four hits
// in the bar, stored per hit in a bar, at the drum track's default gain); the bass and the Lead stored as if a note
// sounded on every step (the bass line sounds on 8 of 16 steps, the Lead's on 7), so the writer scales them by the
// steps its loops sound. Writes src/decode/part-levels.js, which the writer reads to set each part's gain so the
// code's band shares come near the original's. Run again when the writer's sounds change.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-levels.cjs [--print] [--drums-drive [1,3]]   (dev server on PORT; needs ffmpeg)
const fs = require('node:fs'), path = require('node:path');
const { exportSong } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '.cache', 'decode', 'levels');
// the measured gain: each sound plays at this gain, its energy divided by its square (the master limiter stays idle)
const G = 0.4, BARS = 2, BPM = 120;
// frames every 256 samples: every hit's attack counted as a long track's frames count it on average
const HOP = 256;
const BASS = 'note("a1 ~ a1 ~ c2 ~ a1 ~ e1 ~ a1 ~ g1 ~ a1 ~")', CHORDS = 'chord("<Am F>").voicing()', LEAD = 'n("0 ~ 2 ~ 4 ~ 2 ~ 0 ~ ~ ~ 4 3 2 ~").scale("A4:minor")';
const CUTS = { bass: [300, 600, 900, 1200], chords: [800, 1600, 2400, 4000], acid: [500, 1000, 2000] };
const DRUM_DRIVES = [1, 2, 3];
const ROW_HITS = 4, DRUM_ROWS = ['bd', 'cp', 'hh', 'oh'], HIT = { bd: 'x...x...x...x...', cp: 'x...x...x...x...', hh: '..x...x...x...x.', oh: '..x...x...x...x.' };
const items = [];
(async () => {
  const { KITS } = await import('../src/music.js');
  for (const kit of KITS) for (const row of DRUM_ROWS) items.push({ key: `drums:${kit}:${row}`, per: ROW_HITS, track: { type: 'drums', settings: { kit, gain: 0.9 }, rows: { [row]: HIT[row] } } });
  for (const w of ['sine', 'square', 'sawtooth']) for (const c of CUTS.bass) items.push({ key: `bass:${w}:${c}`, per: 8 / 16, code: `${BASS}.s("${w}").lpf(${c}).gain(${G})` });
  for (const c of CUTS.acid) items.push({ key: `bass:acid:${c}`, per: 8 / 16, bars: 5, code: `${BASS}.s("sawtooth").lpf(sine.range(200, ${c}).slow(4)).lpq(8).gain(${G})` });
  for (const w of ['supersaw', 'sawtooth', 'triangle']) for (const c of CUTS.chords) items.push({ key: `chords:${w}:${c}`, per: 1, code: `${CHORDS}.s("${w}").lpf(${c}).gain(${G})` });
  for (const w of ['sawtooth', 'square', 'triangle']) items.push({ key: `lead:${w}`, per: 7 / 16, code: `${LEAD}.s("${w}").lpf(2400).gain(${G})` });
  // (a driven bass, decode-refine 10.2 fifth round: the writer's clip at the gain it writes, stored per unit of the clip's
  // volume, which the balance scales: the clip makes the level almost independent of the gain before it; last, so its tail
  // falls on no other sound)
  const { SOUND_RULE } = await import('../src/decode/writer.js'), D = SOUND_RULE.drive, clip = `.distort(${D.table}).distortvol(${D.vol})`;
  for (const w of ['sine', 'square', 'sawtooth']) for (const c of CUTS.bass) items.push({ key: `bass:${w}:${c}:drive`, per: 8 / 16, g: D.vol, code: `${BASS}.s("${w}").lpf(${c})${clip}.gain(.75)` });
  for (const c of CUTS.acid) items.push({ key: `bass:acid:${c}:drive`, per: 8 / 16, bars: 5, g: D.vol, code: `${BASS}.s("sawtooth").lpf(sine.range(200, ${c}).slow(4)).lpq(${D.lpq})${clip}.gain(.6)` });
  // (task 10.6: the drums driven by the drum track's own drive, DRUM_DRIVES, per machine and row: the level B writer
  // reads the original's high band against the clean kit's prediction and picks the drive; last, after the basses)
  for (const d of DRUM_DRIVES) for (const kit of KITS) for (const row of DRUM_ROWS) items.push({ key: `drums:${kit}:${row}:d${d}`, per: ROW_HITS, track: { type: 'drums', settings: { kit, gain: 0.9, drive: d }, rows: { [row]: HIT[row] } } });
  // (--drums-drive [1,3]: only the driven drums (of those drives), merged into the table already written)
  const only = process.argv.includes('--drums-drive'), dd = only && /^[\d,.]+$/.test(process.argv[process.argv.indexOf('--drums-drive') + 1] || '') ? process.argv[process.argv.indexOf('--drums-drive') + 1].split(',').map(Number) : null;
  if (only) items.splice(0, items.length, ...items.filter(x => /:d[\d.]+$/.test(x.key) && (!dd || dd.includes(+/:d([\d.]+)$/.exec(x.key)[1]))));
  const S = await import('./decode-similarity.mjs');
  const { bandEnergy, LEVEL_BANDS } = await import('../src/decode/kit-measure.js');
  const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  fs.mkdirSync(OUT, { recursive: true });
  const out = {}, sr = S.RATE, bar = 240 / BPM;
  // (decode round 8: in parts of at most CHUNK sounds, one export each: the whole calibration in one song timed out
  // under load)
  const CHUNK = +process.env.LEVELS_CHUNK || 96;
  for (let c = 0; c < items.length; c += CHUNK) {
    const part = items.slice(c, c + CHUNK);
    const sections = part.map((x, i) => ({ name: `S${i}`, bars: x.bars || BARS, bpm: BPM, key: 'A' }));
    const tracks = part.map((x, i) => x.track
      ? { id: `t${i}`, name: x.key, type: 'drums', settings: x.track.settings, patterns: { A: { rows: x.track.rows } }, clips: [{ section: `S${i}`, pattern: 'A' }] }
      : { id: `t${i}`, name: x.key, type: 'code', settings: {}, patterns: { A: { code: x.code } }, clips: [{ section: `S${i}`, pattern: 'A' }] });
    const song = { format: 'coding-misk/song', version: 2, id: 'decode-levels', title: 'Decode levels', sections, tracks };
    const wav = path.join(OUT, `levels-${c / CHUNK}.wav`);
    console.log(`exported part ${c / CHUNK + 1} of ${Math.ceil(items.length / CHUNK)} (${part.length} sounds, ${await exportSong(page, song, wav)} s)`);
    const x = S.readAudio(wav);
    let at = 0;
    part.forEach(it => {
      // the item's bars after its first (no tail of the sound before; the acid bass's four bars hold its filter's whole
      // sweep), the mean energy per frame in each band at gain 1, per unit
      const n = it.bars || BARS, a = (at + 1) * bar * sr, z = (at + n) * bar * sr, frames = Math.floor((z - a - 2048) / HOP) + 1;
      at += n;
      const g2 = it.track ? 1 : (it.g ?? G) ** 2;
      out[it.key] = bandEnergy(x, sr, a, z, LEVEL_BANDS, HOP).map(v => +(v / frames / g2 / it.per).toPrecision(3));
    });
  }
  await browser.close();
  if (only) { const { PART_LEVELS } = await import('../src/decode/part-levels.js'); for (const [k, v] of Object.entries(PART_LEVELS)) if (!(k in out)) out[k] = v; }
  const src = `// The sounds level B writes, measured once through the app by tools/decode-levels.cjs (decode-refine D3): the mean
// energy per analysis frame of each sound alone at gain 1 (drums at their track's default gain), in the writer's level
// bands (kit-measure.js LEVEL_BANDS: 20-150, 150-400, 400-1000, 1000-2000, 2000-16000 Hz); drums per machine and row for
// one hit in a bar, the bass and the Lead for a note on every step. Made by the tool; do not edit.
export const PART_LEVELS = {
${Object.entries(out).map(([k, v]) => `  '${k}': [${v.join(', ')}],`).join('\n')}
};
`;
  if (process.argv.includes('--print')) console.log(src);
  else { fs.writeFileSync(path.join(ROOT, 'src', 'decode', 'part-levels.js'), src); console.log(`wrote src/decode/part-levels.js (${items.length} sounds)`); }
})().catch(e => { console.error(e); process.exit(1); });
