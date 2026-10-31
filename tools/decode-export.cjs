// Exports the Decode test songs (tools/decode-songs.mjs) to WAV through the app's own fast export, into the git-ignored
// .cache/decode/wav/ (made once; --force makes them again). Used by tools/check-decode.cjs and the accuracy measures.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-export.cjs [--force]   (dev server on PORT)
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = path.join(__dirname, '..', '.cache', 'decode', 'wav');

// page: a Playwright page of the app; → { id: file } for every test song
async function exportTestSongs(page, { force = false, log = () => {} } = {}) {
  const { TEST_SONGS } = await import('./decode-songs.mjs');
  fs.mkdirSync(DIR, { recursive: true });
  const out = {};
  for (const s of TEST_SONGS) {
    const file = path.join(DIR, `${s.id}.wav`);
    out[s.id] = file;
    if (!force && fs.existsSync(file)) continue;
    await page.evaluate(sg => {
      localStorage.setItem('coding-misk-draft', JSON.stringify({ T: sg, sel: 0, tk: 0, dirty: false }));
      localStorage.setItem('coding-misk-export-format', JSON.stringify('wav'));
      localStorage.setItem('coding-misk-export-speed', JSON.stringify('fast'));
      localStorage.setItem('coding-misk-mode-tabs', JSON.stringify({ ascolta: 'componi' }));
      localStorage.setItem('coding-misk-tab', JSON.stringify('componi'));
    }, s);
    await page.reload(); await sleep(4000);
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(500);
    const t0 = Date.now();
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 300000, predicate: d => /\.wav$/.test(d.suggestedFilename()) }), page.click('#tr-export')]);
    await dl.saveAs(file);
    log(`exported ${s.id} (${Math.round((Date.now() - t0) / 1000)} s)`);
    await sleep(800);
  }
  return out;
}
module.exports = { exportTestSongs, DIR };

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
