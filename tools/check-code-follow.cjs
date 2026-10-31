// Browser check for the "Follow edits" toggle of the code panel (code-follow).
// Usage: PLAYWRIGHT_CORE=... PORT=5257 node tools/check-code-follow.cjs [shots-dir]   (dev server on PORT, default 5173)
// Plays a live build (Primo Segnale), checks that with the toggle off the panel never scrolls over 16 bars of typing,
// that a manual wheel scroll pauses following for 10 s, that pressing while paused follows at once, and that the state
// survives a reload. With a shots dir: the header with the toggle on, off and paused in neon, hardware, light and at 400 px.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const path = require('path'), fs = require('fs');
const shots = process.argv[2] || null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 560 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const url = `http://localhost:${process.env.PORT || 5173}/`;
  const btn = '#code-follow';
  const state = () => page.evaluate(() => {
    const h = document.getElementById('edhost'), b = document.getElementById('code-follow'), e = document.querySelector('strudel-editor').editor;
    return { top: Math.round(h.scrollTop), max: h.scrollHeight - h.clientHeight, pressed: b.getAttribute('aria-pressed'), paused: b.classList.contains('paused'), title: b.title,
      aria: b.getAttribute('aria-label'), len: e.code.length, cyc: e.repl.scheduler.now(), icon: !!b.querySelector('svg.ico-follow') };
  });
  const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(150); } return false; };
  const wheelTop = async () => { const b = await page.locator('#edhost').boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + 50); await page.mouse.wheel(0, -5000); await sleep(700); };

  await page.goto(url); await sleep(4000);
  await page.evaluate(() => localStorage.removeItem('coding-misk-code-follow'));
  await page.reload(); await sleep(4000);
  let s = await state();
  check(s.pressed === 'true' && !s.paused && s.icon, 'on by default, with an icon');
  check(s.aria === 'Follow edits' && /^Follow edits: /.test(s.title), 'English aria label and tooltip', `${s.aria} | ${s.title}`);
  check(await page.evaluate(() => !document.getElementById('code-follow').textContent.trim()), 'icon only, no text');

  await page.locator('#track-pick').selectOption('primo-segnale'); await sleep(800);
  await page.click('#play');
  check(await until(async () => (await state()).max > 40 && (await state()).cyc > 2, 60000), 'the panel gets longer than its view', JSON.stringify(await state()));

  // on: the panel follows the typing (it scrolls down by itself, and the app's own glide starts no pause)
  const start = await state();
  check(await until(async () => (await state()).top > 20, 60000), 'on: the panel follows the typing', `top ${(await state()).top}`);
  check(!(await state()).paused, 'the app\'s own glide starts no pause');

  // off: no scroll over 16 bars while the code keeps being typed
  await page.click(btn);
  s = await state();
  check(s.pressed === 'false' && /\(off\)/.test(s.title), 'press: off, tooltip says so', s.title);
  await wheelTop(); await sleep(300);
  const off0 = await state();
  check(off0.top < 5 && !off0.paused, 'off: a manual scroll starts no pause', `top ${off0.top}`);
  if (shots) { await shot('off'); }
  const c0 = off0.cyc, len0 = off0.len;
  let maxMove = 0, c = c0;
  while (c < c0 + 16) { await sleep(500); const q = await state(); maxMove = Math.max(maxMove, Math.abs(q.top - off0.top)); c = q.cyc; if (Date.now() % 1000 > 2000) break; }
  const end = await state();
  check(maxMove === 0 && end.len !== len0, 'off: scroll position unchanged over 16 bars of typing', `moved ${maxMove}px, code ${len0} -> ${end.len} chars`);

  // remembered across a reload
  await page.reload(); await sleep(4000);
  s = await state();
  check(s.pressed === 'false' && await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-follow')) === false), 'off survives a reload');
  await page.click(btn); s = await state();
  check(s.pressed === 'true' && !s.paused, 'press: on again');

  // on: a manual scroll pauses 10 s, then it follows again
  await page.locator('#track-pick').selectOption('primo-segnale'); await sleep(800);
  await page.click('#play');
  await until(async () => (await state()).max > 40 && (await state()).top > 20, 60000);
  const t0 = Date.now() + 100; // the wheel event goes out about 100 ms into the call
  await wheelTop(); s = await state();
  check(s.paused && s.pressed === 'true' && /^Paused while you read/.test(s.title), 'wheel scroll: paused look, still on, tooltip says paused', s.title);
  if (shots) await shot('paused');
  let moved = false;
  while (Date.now() - t0 < 8500) { if ((await state()).top > 5) { moved = true; break; } await sleep(250); }
  check(!moved, 'paused: the panel stays on the first lines for 8 s', `top ${(await state()).top}`);
  check(await until(async () => (await state()).top > 20, 40000), 'after the pause the panel follows from the next edit', `${((Date.now() - t0) / 1000).toFixed(1)} s after the scroll`);
  check(Date.now() - t0 >= 9900, 'the pause lasted 10 s', `${((Date.now() - t0) / 1000).toFixed(1)} s`);
  check(!(await state()).paused, 'paused look gone after the pause');

  // pressing while paused follows at once and stays on
  await wheelTop(); s = await state();
  check(s.paused && s.top < 5, 'second wheel scroll: paused again');
  await page.click(btn); await sleep(700);
  s = await state();
  check(s.top > 20 && s.pressed === 'true' && !s.paused, 'press while paused: follows at once, stays on', `top ${s.top}`);

  // keyboard scrolling pauses too
  await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('PageUp'); await sleep(200);
  check((await state()).paused, 'keyboard scroll pauses too');

  // full-screen code ends above the player bar, which stays usable (task 1.6)
  const fullState = () => page.evaluate(() => {
    const c = document.getElementById('codecol').getBoundingClientRect(), b = document.querySelector('.pbar').getBoundingClientRect(), p = document.getElementById('play');
    const hit = document.elementFromPoint(p.getBoundingClientRect().x + 5, p.getBoundingClientRect().y + 5);
    return { full: document.getElementById('codecol').classList.contains('full'), colBottom: Math.round(c.bottom), barTop: Math.round(b.top), barH: Math.round(b.height), vh: innerHeight,
      playHit: !!(hit && (hit === p || p.contains(hit))), playing: document.querySelector('strudel-editor').editor.repl.scheduler.started, vis: !!document.querySelector('.pbar .pb-now') };
  });
  for (const w of [1440, 400]) {
    await page.setViewportSize({ width: w, height: 560 }); await sleep(300);
    await page.click('#code-full'); await sleep(300);
    let f = await fullState();
    check(f.full && f.colBottom <= f.barTop && f.barTop + f.barH <= f.vh + 1 && f.playHit, `${w}px: full-screen code ends above the player bar, Play/Pause reachable`, JSON.stringify(f));
    if (shots) await page.screenshot({ path: path.join(shots, `fullscreen-bar-${w}px.png`) });
    await page.click('#play'); await sleep(500);
    check(!(await fullState()).playing, `${w}px: Pause in the bar pauses the song with the code full screen`);
    await page.click('#play'); await sleep(500);
    await page.keyboard.press('Escape'); await sleep(200);
    check(!(await fullState()).full, `${w}px: Esc leaves the full-screen code`);
    await page.click('#code-full'); await sleep(200); await page.click('#code-full'); await sleep(200);
    check(!(await fullState()).full, `${w}px: the full-screen button leaves too`);
  }
  await page.setViewportSize({ width: 1440, height: 560 }); await sleep(300);

  // Italian
  await page.click('[data-lang="it"]'); await sleep(400);
  s = await state();
  check(s.aria === 'Segui le modifiche' && /^In pausa mentre leggi/.test(s.title), 'Italian aria label and paused tooltip', `${s.aria} | ${s.title}`);
  await page.click('[data-lang="en"]'); await sleep(300);

  async function shot(name, theme) { await page.locator('.codehead').screenshot({ path: path.join(shots, `${theme || 'neon'}-${name}.png`) }); }
  if (shots) {
    const pose = async (theme, w) => {
      await page.setViewportSize({ width: w, height: 560 }); await sleep(200);
      await page.click(`[data-uitheme="${theme}"]`).catch(() => {}); await sleep(400);
      const set = async (on, paused) => {
        let q = await state();
        if (on && q.pressed !== 'true') await page.click(btn);
        if (!on && q.pressed === 'true') await page.click(btn);
        q = await state();
        if (paused) { await wheelTop(); }
        else if (q.paused) { await page.click(btn); }
        await sleep(150);
      };
      const tag = w < 500 ? `${theme}-400px` : theme;
      await set(true, false); await page.locator('.codehead').screenshot({ path: path.join(shots, `${tag}-on.png`) });
      await set(false, false); await page.locator('.codehead').screenshot({ path: path.join(shots, `${tag}-off.png`) });
      await set(true, true); await page.locator('.codehead').screenshot({ path: path.join(shots, `${tag}-paused.png`) });
    };
    for (const th of ['neon', 'hw', 'light']) await pose(th, 1440);
    await pose('neon', 400); await pose('light', 400);
    await page.setViewportSize({ width: 1440, height: 700 }); await page.click('[data-uitheme="neon"]'); await sleep(300);
    await page.screenshot({ path: path.join(shots, 'full-page.png') });
  }

  check(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
