// Exports tracks to WAV through the app's own Export button (audio) (real-time render).
// Usage: PLAYWRIGHT_CORE=... node tools/export-audio.cjs <out-dir> <track-id> [track-id …]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [out, ...ids] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto('http://localhost:5173/'); await sleep(5000);
  for (const id of ids) {
    await page.locator('#track-pick').selectOption(id); await sleep(800);
    const t0 = Date.now();
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15 * 60e3 }), page.click('#tr-export')]);
    const file = path.join(out, `${id}.wav`);
    await dl.saveAs(file);
    console.log(`${id}: ${file} (${Math.round((Date.now() - t0) / 1000)} s)`);
    await sleep(1000);
  }
  await browser.close();
})();
