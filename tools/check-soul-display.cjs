// Browser checks for the Soul display (#46, phase 2): hidden screw and "soul" open it, the display's controls,
// shell selector, override with the SCART cable (the stage shows the soul), cable dragging, power off.
// Usage: PLAYWRIGHT_CORE=... node tools/check-soul-display.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(3500);
  const D = () => page.evaluate(() => { const d = globalThis.codingMiskSoulDisplay; return { open: d.open, override: d.override, shell: d.shell }; });
  const stageW = () => page.evaluate(() => document.querySelector('#stagewrap').getBoundingClientRect().width);

  check(!(await page.locator('.hud >> text=/soul display/i').count()), 'no button on the stage names the display');
  check(await page.isVisible('.soul-screw') && (await page.locator('.soul-screw').boundingBox()).width < 16, 'a small screw sits in the stage\'s corner');
  await page.click('[data-tab="radio"]'); await page.click('#radio-start'); await sleep(2000);
  const w0 = await stageW();
  await page.click('.soul-screw'); await sleep(350); await page.click('.soul-screw'); await sleep(350);
  check(!(await D()).open, 'two turns are not enough');
  await page.click('.soul-screw'); await sleep(4200);
  let d = await D();
  check(d.open && await page.isVisible('.soulbay .sb-panel') && (await stageW()) < w0 - 300, 'three turns open the bay: the stage shrinks, the display comes out', `${Math.round(w0)} -> ${Math.round(await stageW())}`);
  check(d.shell === 'E', 'neon default shell', d.shell);
  if (shots) await page.screenshot({ path: path.join(shots, 'open.png') });

  const v0 = await page.evaluate(() => globalThis.codingMiskSoul.view);
  await page.click('.sb-panel [data-act="next"]'); await sleep(300);
  check(await page.evaluate(() => globalThis.codingMiskSoul.view) !== v0, 'the display\'s next key changes the view');
  await page.click('.sb-panel [data-act="lock"]'); await sleep(200);
  check(await page.evaluate(() => globalThis.codingMiskSoul.locked), 'the display\'s lock locks the view');
  await page.click('.sb-panel [data-act="lock"]');

  await page.click('.sb-panel [data-act="override"]'); await sleep(1800);
  d = await D();
  const stageSoul = await page.evaluate(() => document.querySelector('#stagewrap').dataset.soul);
  check(d.override && stageSoul === 'true', 'override: the cable plugs in and the stage shows the soul');
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.soul-sock.in')).opacity) === '1', 'the SOUL IN socket is out under the stage');
  if (shots) await page.screenshot({ path: path.join(shots, 'override.png') });
  // drag the cable: pick a point under the stage edge and move it
  const p = await page.evaluate(() => { const P = globalThis.codingMiskSoulDisplay.cable.points; return P[Math.floor(P.length / 2)]; });
  await page.mouse.move(p.x + 3, p.y + 2); await sleep(100);
  const grabbed = await page.evaluate(() => document.body.classList.contains('soul-cable-hover'));
  check(grabbed, 'the pointer can grab the cable');
  if (grabbed) { await page.mouse.down(); await page.mouse.move(p.x - 150, p.y + 40, { steps: 6 }); await sleep(250); const q = await page.evaluate(() => { const P = globalThis.codingMiskSoulDisplay.cable.points; return P[Math.floor(P.length / 2)]; }); check(q.x < p.x - 60, 'the cable follows the pointer', `${Math.round(p.x)} -> ${Math.round(q.x)}`); check(await page.evaluate(() => document.body.classList.contains('soul-dragging')), 'dragging the cable'); if (shots) await page.screenshot({ path: path.join(shots, 'drag.png') }); await page.mouse.up(); }

  await page.click('.sb-sel [data-sel="next"]'); await sleep(4800);
  d = await D();
  check(d.shell === 'F' && d.override, 'the selector changes the shell, override comes back', d.shell);
  check(await page.evaluate(() => localStorage.getItem('coding-misk-soul-shell')) === '"F"', 'the shell is remembered');

  await page.click('.sb-panel [data-act="power"]'); await sleep(4300);
  d = await D();
  check(!d.open && !d.override && await page.evaluate(() => document.querySelector('#stagewrap').dataset.soul) === 'false' && Math.abs((await stageW()) - w0) < 2, 'power off: the visual comes back, the bay closes, the stage gets its width back');
  check(await page.isVisible('.soul-screw'), 'the screw is back');

  await page.keyboard.type('soul'); await sleep(4000);
  check((await D()).open, 'typing "soul" opens it too');
  await page.click('.sb-panel [data-act="power"]'); await sleep(3500);
  await page.click('[data-uitheme="hw"]'); await page.evaluate(() => localStorage.removeItem('coding-misk-soul-shell')); await page.evaluate(() => globalThis.codingMiskSoulDisplay.themeChanged());
  await page.keyboard.type('soul'); await sleep(4000);
  check((await D()).shell === 'A', 'HW default shell', (await D()).shell);
  if (shots) await page.screenshot({ path: path.join(shots, 'hw.png') });

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
