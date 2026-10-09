// Browser checks for "Continue in radio" (#29): from Compose and from a song card, the song is song 0 of a new
// session, steering waits for song 1, song 1 follows in the styles near the song, Replay plays song 0 again.
// Usage: PLAYWRIGHT_CORE=... node tools/check-continue.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1200 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(3500);
  const R = () => page.evaluate(() => { const r = globalThis.codingMiskRadio, s = r.state; return s && { onAir: s.onAir, n: s.stream.length, first: s.stream[0], lead: !!(s.recipe && s.recipe.lead), styles: r.options.styles, steering: r.steering && { lead: !!r.steering.lead, plan: !!r.steering.plan } }; });

  // from Compose
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(300);
  const title = (await page.inputValue('#track-title').catch(() => '')) || '';
  check(await page.isVisible('#tr-radio'), 'Compose has "Continue in radio"');
  await page.click('#tr-radio'); await sleep(1500);
  let r = await R();
  check(await page.isVisible('#tab-radio') && r && r.lead && r.onAir === 0 && r.steering.lead, 'the Compose song is song 0 of a new session', JSON.stringify(r && { lead: r.lead, onAir: r.onAir }));
  check(/next song|prossimo brano/i.test(await page.innerText('#radio-steer')), 'the console waits for song 1');
  check(r && r.styles.length > 0, 'styles near the song', r && r.styles.join());
  if (shots) await page.screenshot({ path: path.join(shots, 'song0.png') });
  // near the end of song 0: song 1 comes, steerable
  const bars = await page.evaluate(() => globalThis.codingMiskRadio.state.stream[0].bars);
  await page.evaluate(b => globalThis.codingMiskRadio.seek(b - 1.5), bars); await sleep(1000);
  for (let k = 0; k < 40; k++) { r = await R(); if (r.onAir === 1) break; await sleep(250); }
  check(r.onAir === 1 && r.steering.plan && !r.steering.lead, 'song 1 follows and can be steered', JSON.stringify({ onAir: r.onAir, n: r.n }));
  check(await page.isVisible('#radio-steer .steer-console'), 'the console works on song 1');
  // replay plays song 0 again
  await page.click('#radio-replay'); await sleep(1500);
  r = await R();
  check(r && r.lead && r.onAir === 0 && r.steering.lead, 'Replay plays song 0 again');
  await page.click('#radio-start'); await sleep(400);

  // from a song card
  await page.click('[data-tab="brani"]'); await sleep(500);
  const card = await page.$('#songs [data-song-id] [data-act="radio"]');
  check(!!card, 'song cards have "Continue in radio"');
  if (card) {
    const id = await card.evaluate(b => b.closest('[data-song-id]').dataset.songId);
    await card.click(); await sleep(1500);
    r = await R();
    check(r && r.lead && r.first && r.onAir === 0 && await page.isVisible('#tab-radio'), 'a song card starts the radio with it as song 0', id);
    await page.click('#radio-start'); await sleep(300);
  }
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
