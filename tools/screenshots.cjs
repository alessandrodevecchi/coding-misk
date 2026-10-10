// Requires playwright-core and Google Chrome. Set PLAYWRIGHT_CORE to the playwright-core path (see AGENTS.md).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.goto('http://localhost:5173/'); await sleep(5000);
  await page.locator('#track-pick').selectOption('luci-rosse'); await page.click('#play'); await sleep(2500);
  await page.click('[data-scene-i="3"]'); await sleep(5000);
  const stage = page.locator('#stagewrap');
  for (const look of ['palco', 'spazio', 'pixel', 'montagne']) { await page.selectOption('#looks', look); await sleep(2500); await page.screenshot({ path: `${OUT}/visual-${look}.png` }); }
  await page.selectOption('#looks', 'palco'); await sleep(1500);
  await page.evaluate(() => document.getElementById('arranger').scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -20)); await sleep(1500);
  await page.screenshot({ path: `${OUT}/compose-arranger.png` });
  await page.evaluate(() => document.getElementById('drums').scrollIntoView({ block: 'start' })); await sleep(1200);
  await page.screenshot({ path: `${OUT}/compose-channels.png` });
  await page.evaluate(() => window.scrollTo(0, 0)); await page.click('.tab[data-tab="brani"]'); await sleep(800);
  await page.evaluate(() => document.getElementById('tab-brani').scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -20)); await sleep(1200);
  await page.screenshot({ path: `${OUT}/tracks.png` });
  await browser.close();
})();
