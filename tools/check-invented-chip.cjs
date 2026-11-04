// Browser check for the invented style's chip (radio-invented-style-chip, #82): with the compilation on and "invented
// styles", the same chip and hint in Now playing and in On air, STYLES (live, outside the set-aside dimming, no Again, no
// ×, the name does nothing), one slow click on Keep saves the style (Keep acts on pointer down while Now playing is
// redrawn), both chips follow the song, and with the compilation off the Invent trial chip is as before.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-invented-chip.cjs [shots-dir]   (dev server on PORT)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const NOW = '#radio-now [data-comp-keep-style]', LEFT = '.comp-style-live [data-comp-keep-style]';

(async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { browser = await chromium.launch({ headless: true }); }
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1200 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); }); await page.reload(); await sleep(3500);
  const opts = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio') || '{}'));
  const mine = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-styles') || '[]'));
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name) }); };
  // the centre of a button, after scrolling it into view (Now playing is rebuilt often, so one evaluate does both)
  const centerOf = sel => page.evaluate(s => { const b = document.querySelector(s); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
  const count = sel => page.locator(sel).count();
  // the invented style names shown in the two places
  const names = () => page.evaluate(() => [...document.querySelectorAll('[data-comp-keep-style]')].map(b => b.closest('.trial-style').querySelector('strong').textContent));
  await page.click('[data-tab="radio"]'); await sleep(300);

  // ---------- compilation on, invented styles ----------
  await page.click('#radio-comp-setup'); await sleep(300);
  await page.click('[data-comp-invented]'); await sleep(200);
  await page.click('#radio-comp-setup'); await sleep(200);
  while ((await opts()).compilation !== 'song') { await page.click('#radio-comp'); await sleep(150); }
  await page.click('#radio-start'); await sleep(2500);
  let found = false;
  for (let i = 0; i < 12 && !found; i++) { found = await count(NOW) > 0; if (!found) { await page.click('#radio-skip'); await sleep(2000); } }
  check(found, 'an invented style plays: the chip shows in Now playing');
  if (!found) { await browser.close(); process.exit(1); }
  check(await count(LEFT) === 1, 'the same chip shows in On air, STYLES');
  const n0 = await names();
  check(n0.length === 2 && n0[0] === n0[1], 'same style name in both places', n0.join(' / '));
  const nowChip = await page.innerText('#radio-now .trial-style'), leftChip = await page.innerText('.comp-style-live .trial-style');
  check(nowChip === leftChip && /invented/.test(nowChip) && /genre /.test(nowChip) && /Keep/.test(nowChip) && !/on trial/.test(nowChip), 'chip text: name, "invented", genre, Keep', nowChip.replace(/\s+/g, ' '));
  check(await count('#radio-now .trial-hint') === 1 && await count('.comp-style-live .trial-hint') === 1 && /compilation/.test(await page.innerText('.comp-style-live .trial-hint')), 'the hint shows in both places');
  check(await count('#radio-now .comp-tag [data-comp-keep-style]') === 0 && await count('#radio-now .trial-tag') === 0, 'the old small Keep chip in the tag and the "style on trial" tag are gone');
  check(await count('.comp-style-live [data-trial-again], .comp-style-live [data-trial-drop], #radio-now [data-trial-again], #radio-now [data-trial-drop]') === 0, 'no Again and no × on either chip');
  check((await page.locator(LEFT).getAttribute('title')).includes('Save the style'), 'Keep has its tooltip');
  const live = await page.evaluate(() => { const c = document.querySelector('.comp-style-live .trial-style'); let o = 1, n = c; while (n) { o *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; } return { o, inAside: !!c.closest('.set-aside'), pressed: c.getAttribute('aria-pressed'), above: !!(c.closest('.ctrl').querySelector('.set-aside .chip[data-style]') && (c.compareDocumentPosition(c.closest('.ctrl').querySelector('.set-aside .chip[data-style]')) & Node.DOCUMENT_POSITION_FOLLOWING)) }; });
  check(live.o === 1 && !live.inAside && live.pressed === 'true' && live.above, 'left chip: full colour, outside set-aside, above the greyed style chips', JSON.stringify(live));
  check(await page.evaluate(() => { const c = document.querySelector('.comp-style-live ~ .set-aside .chip[data-style]'); return !!c && parseFloat(getComputedStyle(c.closest('.set-aside')).opacity) < 1; }), 'the style chips below stay greyed');
  const before = JSON.stringify(await opts()), m0 = (await mine()).length;
  await page.locator('.comp-style-live .trial-name').click(); await sleep(300);
  check(JSON.stringify(await opts()) === before && (await mine()).length === m0 && await count(LEFT) === 1, 'clicking the name does nothing');
  await shot('si5-compilation-neon.png');
  await page.evaluate(() => { document.querySelector('#radio-now .trial-style').scrollIntoView({ block: 'center' }); });
  await page.evaluate(() => document.documentElement.setAttribute('data-ui', 'hw')); await sleep(200);
  await shot('si5-compilation-hw.png');
  await page.evaluate(() => document.documentElement.removeAttribute('data-ui')); await sleep(200);

  // ---------- the chips follow the song ----------
  let changed = false;
  for (let i = 0; i < 12 && !changed; i++) {
    await page.click('#radio-skip'); await sleep(2000);
    const n = await names();
    changed = n.length === 2 && n[0] === n[1] && n[0] !== n0[0];
  }
  check(changed, 'next song with another invented style: both chips show it', (await names()).join(' / '));
  for (let i = 0; i < 12 && await count(LEFT); i++) { await page.click('#radio-skip'); await sleep(2000); }
  check(await count(LEFT) === 0 && await count(NOW) === 0, 'a song with no invented style: both chips are gone');

  // ---------- one slow click on Keep in Now playing ----------
  found = false;
  for (let i = 0; i < 15 && !found; i++) { found = await count(NOW) > 0; if (!found) { await page.click('#radio-skip'); await sleep(2000); } }
  check(found, 'another invented style plays');
  const keptName = (await names())[0], m1 = (await mine()).length;
  const box = await centerOf(NOW);
  await page.mouse.move(box.x, box.y);
  await page.mouse.down(); await sleep(600); await page.mouse.up(); await sleep(400);
  const after = await mine();
  check(after.length === m1 + 1 && after.slice(-1)[0].invented && after.slice(-1)[0].name.en === keptName, 'one slow click on Keep (down, 600 ms, up) saves the style', keptName);
  check(await count('[data-comp-keep-style]') === 0, 'after Keep both chips are gone');
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="stili"]'); await sleep(500);
  check((await page.innerText('#tab-stili')).includes(keptName), 'the style is in the Styles tab');
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);

  // ---------- Keep in the left column ----------
  found = false;
  for (let i = 0; i < 15 && !found; i++) { found = await count(LEFT) > 0; if (!found) { await page.click('#radio-skip'); await sleep(2000); } }
  check(found, 'a further invented style plays');
  const m2 = (await mine()).length, nm = (await names())[0];
  const b2 = await centerOf(LEFT);
  await page.mouse.move(b2.x, b2.y);
  await page.mouse.down(); await sleep(500); await page.mouse.up(); await sleep(400);
  check((await mine()).length === m2 + 1 && await count('[data-comp-keep-style]') === 0 && (await mine()).slice(-1)[0].name.en === nm, 'Keep in the left column saves the style and clears both chips', nm);
  await page.click('#radio-start'); await sleep(500);

  // ---------- compilation off: unchanged ----------
  while ((await opts()).compilation !== 'off') { await page.click('#radio-comp'); await sleep(150); }
  await page.click('#tab-radio [data-dice="invent"]'); await sleep(400);
  check(await count('.trial-row [data-trial-keep]') === 1 && await count('.trial-row [data-trial-again]') === 1 && await count('.trial-row [data-trial-drop]') === 1 && /on trial/.test(await page.innerText('.trial-style')) && await count('[data-comp-keep-style]') === 0, 'compilation off: the Invent trial chip has Keep, Again, × and "on trial"');
  check(await page.evaluate(() => !document.querySelector('.trial-style').closest('.set-aside')) && await count('#radio-now .trial-style') === 0, 'compilation off: no set-aside, no chip in Now playing');
  await page.click('#tab-radio [data-trial-keep]'); await sleep(400);
  check(await count('.trial-row') === 0 && (await mine()).length === m2 + 2, 'compilation off: the trial Keep still saves');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
