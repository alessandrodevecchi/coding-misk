// Browser check of the Songs tab pages and filters (#67): pages of 24 after filtering, search across pages,
// build style filter, never played, the counter. Usage: PLAYWRIGHT_CORE=... node tools/check-song-pages.cjs [shot.png]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1600 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2000);
  await page.evaluate(() => { localStorage.removeItem('coding-misk-songs-view'); localStorage.setItem('coding-misk-played', JSON.stringify({ 'crescendo-primo-passo': Date.now() })); });
  await page.reload(); await sleep(4000);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(800);
  const visible = () => page.$$eval('#songs [data-song-id]', els => els.filter(e => !e.hidden).map(e => e.dataset.songId));
  const total = await page.$$eval('#songs [data-song-id]', els => els.length);
  const first = await visible();
  check(total <= 24 || first.length === 24, 'first page has 24 songs', `${first.length} of ${total}`);
  if (total > 24) {
    check(!(await page.isHidden('#sv-pager')), 'pager shown');
    await page.click('#sv-pager [data-sv-page="2"]'); await sleep(400);
    const second = await visible();
    check(second.length > 0 && !second.some(id => first.includes(id)), 'page 2 shows other songs');
    check(/^25-/.test(await page.textContent('#sv-n')), 'counter', await page.textContent('#sv-n'));
    // a song of page 2, searched, is on page 1 of the result
    const title = await page.$eval(`#songs [data-song-id="${second[0]}"] h3`, h => h.textContent);
    await page.fill('#sv-q', title); await sleep(500);
    check((await visible()).includes(second[0]), 'search finds a song of a later page');
    await page.fill('#sv-q', ''); await sleep(500);
  }
  await page.click('[data-f="builds"][data-v="crescendo"]'); await sleep(400);
  const cresc = await visible();
  check(cresc.length >= 6 && cresc.every(id => /crescendo-|switch-/.test(id)), 'build style crescendo', cresc.join(','));
  await page.click('#sv-never'); await sleep(400);
  check(!(await visible()).includes('crescendo-primo-passo') && (await visible()).length === cresc.length - 1, 'never played hides a played song');
  if (process.argv[2]) await page.screenshot({ path: process.argv[2], clip: { x: 0, y: 500, width: 1440, height: 1000 } });
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
