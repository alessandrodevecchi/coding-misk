// Browser checks for the two modes (#42): Listen and Groove Lab, their tabs, memory per mode, the old
// remembered tab, a link across modes, code and settings in both modes, phone width.
// Usage: PLAYWRIGHT_CORE=... node tools/check-modes.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  // a tab remembered from before the modes existed
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-tab', JSON.stringify('stili')); });
  await page.reload(); await sleep(3500);
  const visibleTabs = () => page.$$eval('.tabs .tab', xs => xs.filter(x => !x.hidden).map(x => x.dataset.tab).join());
  const pressed = () => page.$$eval('.mode-btn', xs => xs.filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.dataset.mode).join());
  check((await pressed()) === 'lab' && await page.isVisible('#tab-stili'), 'an old remembered tab opens in its mode', await pressed());
  check((await visibleTabs()) === 'artisti,stili,generi,suoni,guida,lezioni,riferimenti', 'Groove Lab tabs', await visibleTabs());
  if (shots) await page.screenshot({ path: path.join(shots, 'lab.png') });

  await page.click('[data-mode="ascolta"]'); await sleep(300);
  check((await visibleTabs()) === 'componi,brani,playlist,radio' && await page.isVisible('#tab-componi'), 'Listen shows its tabs and its first tab', await visibleTabs());
  await page.click('[data-tab="radio"]'); await sleep(300);
  await page.click('[data-mode="lab"]'); await sleep(300);
  check(await page.isVisible('#tab-stili'), 'Groove Lab reopens its last tab');
  await page.click('[data-tab="suoni"]'); await sleep(400);
  check(await page.isVisible('#edhost') && await page.isVisible('#tab-suoni'), 'live code stays on the right in the Groove Lab');
  await page.click('[data-mode="ascolta"]'); await sleep(300);
  check(await page.isVisible('#tab-radio'), 'Listen reopens the Radio');
  if (shots) await page.screenshot({ path: path.join(shots, 'listen.png') });

  // settings from either mode, and back
  await page.click('[data-mode="lab"]'); await sleep(200);
  await page.click('#open-settings'); await sleep(300);
  check(await page.isVisible('#tab-impostazioni') && (await pressed()) === '', 'settings open from the Groove Lab, no mode lit');
  await page.click('#open-settings'); await sleep(300);
  check(await page.isVisible('#tab-suoni') && (await pressed()) === 'lab', 'closing the settings goes back to the Groove Lab tab');

  // a link across modes: a new song from an artist's sheet opens Compose in Listen
  await page.click('[data-tab="artisti"]'); await sleep(300);
  await page.click('#tab-artisti [data-open]'); await sleep(300);
  await page.click('#ar-compose'); await sleep(800);
  check((await pressed()) === 'ascolta' && await page.isVisible('#tab-componi'), 'new song from an artist switches to Listen and Compose');

  // reload keeps mode and tab
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="guida"]'); await sleep(200);
  await page.reload(); await sleep(3500);
  check((await pressed()) === 'lab' && await page.isVisible('#tab-guida'), 'mode and tab kept after reload');

  // genres (#43): cards, songs of a genre, a style, the radio in a genre
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="generi"]'); await sleep(400);
  const genres = await page.$$eval('#tab-generi .genre-card', xs => xs.map(x => x.dataset.genre));
  check(genres.length >= 8 && genres.includes('techno') && genres.includes('hip-hop'), 'genre cards', genres.join(','));
  if (shots) await page.screenshot({ path: path.join(shots, 'genres.png') });
  await page.click('#tab-generi [data-genre-songs="metal"]'); await sleep(500);
  const vis = await page.$$eval('#songs [data-song-id]', xs => xs.filter(x => !x.hidden).map(x => x.dataset.songId));
  check(await page.isVisible('#tab-brani') && vis.includes('ferro') && !vis.includes('drift'), 'see the songs of a genre', vis.join(','));
  await page.click('#sv-clear'); await sleep(200);
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="generi"]'); await sleep(300);
  await page.click('#tab-generi [data-genre-style="phonk"]'); await sleep(400);
  check(await page.isVisible('#tab-stili') && /Phonk/.test(await page.innerText('#tab-stili')), 'a style chip opens the style');
  await page.click('[data-tab="generi"]'); await sleep(300);
  await page.click('#tab-generi [data-genre-radio="trance"]'); await sleep(2500);
  const r = await page.evaluate(() => ({ on: globalThis.codingMiskRadio.on, styles: globalThis.codingMiskRadio.options.styles }));
  check(await page.isVisible('#tab-radio') && r.on && r.styles.join() === 'trance', 'listen to a genre in the radio', JSON.stringify(r));
  await page.click('#radio-start'); await sleep(300);

  // the Guide (#48): its own tab next to the Strudel lessons; chips scroll; "Show me" opens the feature; "?" from a tab
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="guida"]'); await sleep(400);
  const cards = await page.$$eval('#guide .g-card', xs => xs.map(x => x.id));
  check(cards.length >= 12 && cards.includes('g-radio') && await page.isVisible('#g-radio .g-scope'), 'the Guide has a card per feature and the radio scope table', `${cards.length}`);
  await page.click('[data-tab="lezioni"]'); await sleep(300);
  check(await page.isVisible('#lessons .lesson'), 'the Strudel lessons have their own tab');
  if (shots) await page.screenshot({ path: path.join(shots, 'lessons.png') });
  await page.click('[data-tab="guida"]'); await sleep(300);
  await page.click('[data-g-chip="playlists"]'); await sleep(800);
  const top = await page.$eval('#g-playlists', el => el.getBoundingClientRect().top);
  check(top >= -2 && top < 200, 'a chip scrolls to its card', `${Math.round(top)}`);
  if (shots) await page.screenshot({ path: path.join(shots, 'guide.png') });
  await page.click('#g-radio [data-g-show]'); await sleep(500);
  check((await pressed()) === 'ascolta' && await page.isVisible('#tab-radio') && await page.$eval('#radio-start', el => el.classList.contains('g-flash')), '"Show me" opens the Radio and flashes On air');
  await sleep(2200);
  const help = await page.$('#tab-radio .g-help');
  check(!!help, 'the Radio tab has a "?"');
  if (help) { await help.click(); await sleep(500); check((await pressed()) === 'lab' && await page.isVisible('#tab-guida') && await page.$eval('#g-radio', el => el.classList.contains('g-flash')), '"?" opens the Guide on the Radio card'); }
  for (const tb of ['componi', 'brani', 'playlist', 'artisti', 'stili', 'generi', 'suoni', 'lezioni', 'riferimenti']) {
    await page.click(`[data-mode="${['componi', 'brani', 'playlist'].includes(tb) ? 'ascolta' : 'lab'}"]`); await page.click(`[data-tab="${tb}"]`); await sleep(250);
    if (!(await page.$(`#tab-${tb} .g-help`))) check(false, `the ${tb} tab has a "?"`);
  }
  // Italian names (the English strings had slipped into the Italian ones)
  await page.click('[data-lang="it"]'); await sleep(400);
  check((await page.innerText('[data-tab="artisti"]')).toLowerCase() === 'artisti' && (await page.innerText('[data-tab="stili"]')).toLowerCase() === 'stili', 'Artists and Styles in Italian');
  await page.click('[data-lang="en"]'); await sleep(300);

  // phone
  await page.setViewportSize({ width: 390, height: 900 }); await sleep(400);
  for (const m of ['ascolta', 'lab']) {
    await page.click(`[data-mode="${m}"]`); await sleep(300);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const allIn = await page.$$eval('.tabs .tab', xs => xs.filter(x => !x.hidden).every(x => { const r = x.getBoundingClientRect(); return r.right <= innerWidth && r.width > 0; }));
    check(sw <= 392 && allIn, `phone: ${m} fits without horizontal scroll`, `${sw}px`);
  }
  if (shots) await page.screenshot({ path: path.join(shots, 'phone.png') });

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
