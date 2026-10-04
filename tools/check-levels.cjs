// Plays every scene of the given tracks and prints errors and per-instrument peak levels.
// Usage: PLAYWRIGHT_CORE=... node tools/check-levels.cjs <track-id> [track-id …]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://localhost:5173/'); await sleep(5000);
  for (const id of process.argv.slice(2)) {
    await page.locator('#track-pick').selectOption(id); await page.click('#play'); await sleep(2000);
    const n = await page.locator('.arr-scene-btn').count();
    for (let i = 0; i < n; i++) {
      await page.click(`[data-scene-i="${i}"]`); await sleep(2400);
      const r = await page.evaluate(async () => {
        const ed = document.querySelector('strudel-editor').editor, mx = {};
        for (let k = 0; k < 16; k++) { for (const a of Object.keys(window.analysers)) { const d = getAnalyzerData('time', a); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); mx[a] = Math.max(mx[a] || 0, m); } await new Promise(r => setTimeout(r, 50)); }
        return { err: String(ed.repl.state.evalError || ''), name: document.getElementById('sc-name').value, lv: Object.entries(mx).filter(([, v]) => v > .02).map(([a, b]) => `${a}=${b.toFixed(2)}`).join(' ') };
      });
      console.log(`${id} #${i} ${r.name}${r.err ? ' ERROR ' + r.err : ''}  ${r.lv}`);
    }
    await page.click('#stop'); await sleep(300);
  }
  await browser.close();
})();
