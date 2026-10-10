// Requires playwright-core and Google Chrome. Set PLAYWRIGHT_CORE to the playwright-core path (see AGENTS.md).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [look, track, scene, out] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(5000);
  await page.locator('#track-pick').selectOption(track); await page.click('#play'); await sleep(2000);
  await page.click(`[data-scene-i="${scene}"]`); await sleep(4000);
  await page.selectOption('#looks', look); await sleep(2500);
  await page.locator('#stagewrap').screenshot({ path: out + '-a.png' }); await sleep(370);
  await page.locator('#stagewrap').screenshot({ path: out + '-b.png' });
  console.log('errors', JSON.stringify(errs));
  await browser.close();
})();
