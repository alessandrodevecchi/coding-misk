// Requires playwright-core and Google Chrome. Set PLAYWRIGHT_CORE to the playwright-core path (see AGENTS.md).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(5000);
  await page.click('[data-uitheme="hw"]'); await sleep(500);
  await page.locator('#track-pick').selectOption('luci-rosse'); await page.click('#play'); await sleep(2000);
  await page.click('[data-scene-i="3"]'); await sleep(3000);
  await page.screenshot({ path: OUT + '-top.png' });
  // gira la manopola del volume del basso trascinandola verso l'alto
  const knob = page.locator('#bass-gain + .knob'); await knob.scrollIntoViewIfNeeded();
  const before = await page.inputValue('#bass-gain');
  const b = await knob.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 40, { steps: 8 }); await page.mouse.up();
  const after = await page.inputValue('#bass-gain');
  const code = await page.evaluate(() => document.querySelector('strudel-editor').editor.code.includes('analyze("bass")'));
  const leds = await page.evaluate(() => [...document.querySelectorAll('.act')].map(l => l.style.getPropertyValue('--lv')).join(','));
  await page.evaluate(() => document.getElementById('drums').scrollIntoView({ block: 'start' })); await sleep(800);
  await page.screenshot({ path: OUT + '-panel.png' });
  console.log(JSON.stringify({ before, after, code, leds, errs, ui: await page.evaluate(() => document.documentElement.dataset.ui) }));
  await browser.close();
})();
