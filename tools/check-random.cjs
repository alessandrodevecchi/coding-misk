// Browser checks for the random tools (#50): radio dice (artist with Keep, styles, genre, knobs in range, sounds),
// the random artist in the Artists tab (Keep, Again, Discard), random style and genre in the radio.
// Usage: PLAYWRIGHT_CORE=... node tools/check-random.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1100 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(3500);
  const opts = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio') || '{}'));
  await page.click('[data-tab="radio"]'); await sleep(400);
  check(await page.locator('#tab-radio .dice svg').count() >= 7 && !(await page.locator('#tab-radio .dice').first().innerText()).includes('🎲'), 'dice in the radio, drawn icons');

  await page.click('#tab-radio [data-dice="artist"]'); await sleep(300);
  let o = await opts();
  check(o.temp && o.artist === o.temp.id && await page.isVisible('.temp-artist'), 'random artist: picked, shown with Keep', o.temp && o.temp.name);
  await page.click('.temp-artist [data-keep]'); await sleep(300);
  o = await opts();
  const mine = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-artists') || '[]'));
  check(!o.temp && mine.some(a => a.id === o.artist), 'Keep saves it among your artists and keeps it picked');

  const before = (await opts()).styles.join();
  await page.click('#tab-radio [data-dice="styles"]'); await sleep(200);
  o = await opts();
  check(!o.artist && o.styles.length >= 2 && o.styles.length <= 3, 'random mix: 2 or 3 styles', o.styles.join());
  await page.click('#tab-radio [data-dice="genre"]'); await sleep(200);
  check((await opts()).styles.length >= 1, 'random genre gives its styles', (await opts()).styles.join());
  if ((await opts()).diceRange === false) await page.click('#tab-radio [data-dice-mode]');
  for (let i = 0; i < 5; i++) { await page.click('#tab-radio [data-dice="knobs"]'); await sleep(80); }
  o = await opts();
  check(o.chaos >= .15 && o.chaos <= .7 && o.energy >= .3 && o.energy <= .9, 'all knobs in range', `${o.chaos} ${o.energy}`);
  await page.click('#tab-radio [data-dice="knob"][data-k="talk"]'); await sleep(100);
  check(await page.getAttribute('#tab-radio [data-dice="knob"][data-k="talk"]', 'title').then(s => /seed|seme/.test(s)), 'a die shows the seed of its last throw');
  await page.click('#tab-radio [data-dice="sounds"]'); await sleep(200);
  o = await opts();
  check(typeof o.sounds === 'string' && o.sounds.length > 3, 'sounds die sets a sounds seed', o.sounds);
  await page.click('#tab-radio #radio-start'); await sleep(2500);
  check(await page.evaluate(() => { const r = globalThis.codingMiskRadio.state; return !!r && r.recipe.options.sounds; }), 'the radio plays with the sounds seed in its recipe');
  await page.click('#tab-radio #radio-start'); await sleep(500);
  if (shots) await page.screenshot({ path: path.join(shots, 'radio.png') });

  // Artists tab
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="artisti"]'); await sleep(300);
  await page.click('#ar-random'); await sleep(200);
  const n1 = await page.innerText('.random-preview h3');
  await page.click('#ar-again'); await sleep(200);
  const n2 = await page.innerText('.random-preview h3');
  check(n1 && n2 && n1 !== n2, 'Random artist and Again make different artists', `${n1} / ${n2}`);
  if (shots) await page.screenshot({ path: path.join(shots, 'artists.png') });
  await page.click('#ar-keep'); await sleep(300);
  check(await page.evaluate(n => JSON.parse(localStorage.getItem('coding-misk-artists') || '[]').some(a => a.name === n), n2), 'Keep in the Artists tab saves it');
  await page.click('#ar-random'); await sleep(200); await page.click('#ar-discard'); await sleep(200);
  check(!(await page.isVisible('.random-preview')), 'Discard drops the preview');

  // Styles and Genres: random in the radio
  await page.click('[data-tab="stili"]'); await sleep(300); await page.click('#st-random'); await sleep(2500);
  check(await page.evaluate(() => globalThis.codingMiskRadio.on), 'a random style plays in the radio');
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="generi"]'); await sleep(300); await page.click('#genre-random'); await sleep(2500);
  check(await page.evaluate(() => globalThis.codingMiskRadio.on), 'a random genre plays in the radio');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
