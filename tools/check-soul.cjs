// Browser checks for the song soul scene (#46): the visual dropdown, the soul of the song on air, every view
// draws and moves, HW amber, analyzing on a new song, recalibrating on steering, lock, full screen.
// Usage: PLAYWRIGHT_CORE=... node tools/check-soul.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(3500);
  // the stage's pixels: mean colour, spread, and a fingerprint to see it move
  const pixels = () => page.evaluate(() => {
    const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let r = 0, g = 0, b = 0, n = 0, lit = 0, sig = 0;
    for (let i = 0; i < d.length; i += 4 * 97) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; if (d[i] + d[i + 1] + d[i + 2] > 90) lit++; sig = (sig * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1000003; }
    return { r: r / n, g: g / n, b: b / n, lit: lit / n, sig };
  });
  const S = () => page.evaluate(() => { const s = globalThis.codingMiskSoul; return { view: s.view, locked: s.locked, overlay: s.overlay, title: s.data && s.data.title, seed: s.data && s.data.seed }; });

  check(await page.locator('select#looks option[value="soul"]').count() === 1 && await page.isVisible('#fs'), 'the visual picker is a dropdown with Soul, next to full screen');
  await page.selectOption('#looks', 'soul'); await sleep(600);
  check(await page.isVisible('#soul-ctl') && await page.isHidden('#readout'), 'Soul shows the view controls and hides the readout');
  check((await pixels()).lit > 0.002, 'no song: the soul screen draws "no signal"');

  await page.click('[data-tab="radio"]'); await sleep(300); await page.click('#radio-start'); await sleep(1200);
  let s = await S();
  const onAir = await page.evaluate(() => { const r = globalThis.codingMiskRadio.state; return r.stream[r.onAir].title; });
  check(s.title === onAir, 'the soul is the song on air', `${s.title} / ${onAir}`);
  check(s.overlay === 'analyzing', 'a new song is analyzed first');
  const def = await page.evaluate(async () => (await import('/src/soul/data.js')).defaultView(globalThis.codingMiskSoul.data));
  check(s.view === def, 'the song starts in its own view', `${s.view} / ${def}`);
  await sleep(2000);

  const seen = new Set(), still = [];
  for (let i = 0; i < 10; i++) {
    const v = (await S()).view; seen.add(v);
    await sleep(1900);
    const a = await pixels(); await sleep(250); const b = await pixels();
    if (!(a.lit > 0.01 && a.sig !== b.sig)) still.push(v);
    if (shots) await page.locator('#stagewrap').screenshot({ path: path.join(shots, `view-${v}.png`) });
    await page.click('#soul-ctl [data-soul="next"]');
  }
  check(seen.size === 10 && !still.length, 'every view draws and moves', still.length ? `still: ${still.join()}` : '');

  // HW: amber, for a CRT view and a colour view
  await page.click('[data-uitheme="hw"]');
  const amber = [];
  for (const v of ['b', 'g']) { await page.evaluate(v => globalThis.codingMiskSoul.pick(v), v); await sleep(2000); const p = await pixels(); if (!(p.r > p.b * 1.4 && p.r >= p.g)) amber.push(`${v} ${p.r.toFixed(0)},${p.g.toFixed(0)},${p.b.toFixed(0)}`); }
  check(!amber.length, 'HW theme: the screens are amber', amber.join(' '));
  if (shots) await page.locator('#stagewrap').screenshot({ path: path.join(shots, 'hw.png') });
  await page.click('[data-uitheme="neon"]'); await sleep(300);

  // steering: interference
  await page.evaluate(() => globalThis.codingMiskRadio.command({ kind: 'curve', curve: 'tension', d: 3, value: 0.9 })); await sleep(120);
  check((await S()).overlay === 'glitch', 'a console command makes the soul recalibrate');
  await sleep(1000);

  // lock: the view stays on the next song; unlocked, the next song brings its own view
  await page.click('#soul-ctl [data-soul="lock"]');
  const locked = (await S()).view;
  await page.evaluate(() => globalThis.codingMiskRadio.skip()); await sleep(2500);
  s = await S();
  check(s.locked && s.view === locked, 'locked: the view stays when the song changes', `${locked} -> ${s.view}`);
  await page.click('#soul-ctl [data-soul="lock"]');
  await page.evaluate(() => globalThis.codingMiskRadio.skip()); await sleep(1500);
  const def2 = await page.evaluate(async () => (await import('/src/soul/data.js')).defaultView(globalThis.codingMiskSoul.data));
  s = await S();
  check(!s.locked && s.view === def2, 'unlocked: the next song brings its own view');
  check(await page.evaluate(() => localStorage.getItem('coding-misk-soul-lock')) === 'false', 'the lock is remembered');

  // full screen
  await page.click('#fs'); await sleep(600);
  const fsOn = await page.evaluate(() => document.fullscreenElement && document.fullscreenElement.id);
  check(fsOn === 'stagewrap', 'full screen shows the stage with the soul', String(fsOn));
  if (fsOn) { await page.evaluate(() => document.exitFullscreen()); await sleep(300); }

  // another visual and back
  await page.selectOption('#looks', 'edgerunners'); await sleep(400);
  check(await page.isHidden('#soul-ctl') && await page.evaluate(() => document.documentElement.dataset.look) === 'edgerunners', 'another visual hides the soul controls');
  await page.selectOption('#looks', 'soul'); await sleep(200);
  check(await page.evaluate(() => document.documentElement.dataset.look) === 'edgerunners' && (await S()).overlay === 'analyzing', 'Soul keeps the last visual\'s colours and types its line again');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
