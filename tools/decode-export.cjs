// Exports the Decode test songs (tools/decode-songs.mjs) to WAV through the app's own fast export, into the git-ignored
// .cache/decode/wav/ (made once; --force makes them again). Used by tools/check-decode.cjs and the accuracy measures.
// decode-refine 6.2: also the app's own songs of the bench (APP_SONGS: the built-in luci-rosse and one radio song frozen
// in tests/snapshots/decode-radio-song.json), each with the timeline JSON the export saves next to it (<id>.timeline.json,
// the truth of tools/decode-measure.mjs). exportSong is the one fast export the similarity check uses too.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-export.cjs [--force]   (dev server on PORT)
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, '.cache', 'decode', 'wav');
// the app's songs of the bench: the built-in song and the radio song (seed bench-c of the artist hype, director version
// 20, its voice track left out: the spoken lines are not what Decode measures), frozen so the truth does not move with
// the director
const APP_SONGS = [
  { id: 'luci-rosse', file: path.join(ROOT, 'songs', 'luci-rosse.json') },
  { id: 'radio-bench-c', file: path.join(ROOT, 'tests', 'snapshots', 'decode-radio-song.json') },
];
const appSong = x => ({ ...JSON.parse(fs.readFileSync(x.file, 'utf8')), id: x.id });

// one song through Compose's fast export (Classic, WAV): the audio to `file`; with timeline, its timeline JSON next to
// it (<file without .wav>.timeline.json). page: a Playwright page of the app. → seconds the export took
async function exportSong(page, song, file, { timeline = false } = {}) {
  await page.evaluate(sg => {
    localStorage.setItem('coding-misk-draft', JSON.stringify({ T: sg, sel: 0, tk: 0, dirty: false }));
    localStorage.setItem('coding-misk-export-format', JSON.stringify('wav'));
    localStorage.setItem('coding-misk-export-speed', JSON.stringify('fast'));
    localStorage.setItem('coding-misk-mode-tabs', JSON.stringify({ ascolta: 'componi' }));
    localStorage.setItem('coding-misk-tab', JSON.stringify('componi'));
  }, song);
  await page.reload(); await sleep(4000);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(500);
  const t0 = Date.now();
  const tl = timeline ? page.waitForEvent('download', { timeout: 600000, predicate: d => /timeline\.json$/.test(d.suggestedFilename()) }) : null;
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 600000, predicate: d => /\.wav$/.test(d.suggestedFilename()) }), page.click('#tr-export')]);
  await dl.saveAs(file);
  if (tl) await (await tl).saveAs(file.replace(/\.wav$/, '.timeline.json'));
  await sleep(800);
  return Math.round((Date.now() - t0) / 1000);
}

// page: a Playwright page of the app; → { id: file } for every test song and app song
async function exportTestSongs(page, { force = false, log = () => {} } = {}) {
  const { TEST_SONGS } = await import('./decode-songs.mjs');
  fs.mkdirSync(DIR, { recursive: true });
  const out = {};
  for (const [s, timeline] of [...TEST_SONGS.map(s => [s, false]), ...APP_SONGS.map(x => [appSong(x), true])]) {
    const file = path.join(DIR, `${s.id}.wav`);
    out[s.id] = file;
    if (!force && fs.existsSync(file) && (!timeline || fs.existsSync(file.replace(/\.wav$/, '.timeline.json')))) continue;
    log(`exported ${s.id} (${await exportSong(page, s, file, { timeline })} s)`);
  }
  return out;
}
module.exports = { exportTestSongs, exportSong, appSong, APP_SONGS, DIR };

if (require.main === module) {
  (async () => {
    const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
    const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
    page.on('pageerror', e => console.error('pageerror', e.message));
    await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
    const files = await exportTestSongs(page, { force: process.argv.includes('--force'), log: console.log });
    for (const [id, f] of Object.entries(files)) console.log(`${id}: ${f} (${Math.round(fs.statSync(f).size / 1024)} KB)`);
    await browser.close();
  })().catch(e => { console.error(e); process.exit(1); });
}
