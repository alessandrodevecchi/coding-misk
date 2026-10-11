// Browser checks for the live output (#52): the broadcast window draws the picture of the radio playing in the app,
// the control room sees the app and the window (state, beat, pictures), presets with TAKE move the picture with a
// transition, the window comes back after the app reloads, and closing it gives the stage back. OBS is not needed:
// without it the control room says so and shows the app's picture.
// Usage: PLAYWRIGHT_CORE=... node tools/check-live.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || '';
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shot = async (p, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name) }); } };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  const watch = (p, tag) => p.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
  watch(page, 'app');
  await page.goto('http://localhost:5173/'); await sleep(2000);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['synthwave'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.click('#radio-start'); await sleep(5000);

  // 1. the broadcast window, opened from Settings
  await page.click('#open-settings'); await sleep(400);
  check(await page.locator('#set-live').isVisible(), 'Settings has the Live output card');
  const [win] = await Promise.all([page.waitForEvent('popup'), page.click('#set-live-window')]);
  watch(win, 'window');
  await win.waitForLoadState(); await sleep(2500);
  const L = () => page.evaluate(() => ({ on: globalThis.codingMiskLive.on, frames: globalThis.codingMiskVideo.live.frames, view: globalThis.codingMiskVideo.live.preset.view }));
  let l = await L();
  check(l.on && l.frames > 30, 'the window draws the live picture', JSON.stringify(l));
  check(await win.title() === 'coding-misk broadcast', 'the window has the title OBS captures by');
  const pic = (x, y, w, h) => win.evaluate(([x, y, w, h]) => { const d = document.getElementById('picture').getContext('2d').getImageData(x, y, w, h).data; let n = 0, s = 0; for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; s += v; if (v > 380) n++; } return { lit: n, mean: s / (d.length / 4) }; }, [x, y, w, h]);
  const full = await pic(0, 0, 1920, 1080);
  check(full.mean > 20, 'the picture is not black', JSON.stringify(full));
  check(await win.evaluate(() => { const c = document.getElementById('picture'); return c.width === 1920 && c.height === 1080; }), 'the picture is 1920×1080');
  await shot(win, 'live-window-visual.png');

  // 2. the control room in another tab
  const room = await ctx.newPage(); watch(room, 'room');
  // a port where no OBS answers, even when OBS runs on this computer
  await page.evaluate(() => localStorage.setItem('coding-misk-obs', JSON.stringify({ host: '127.0.0.1', port: 4499, password: '' })));
  await room.goto('http://localhost:5173/live.html'); await sleep(3500);
  const txt = id => room.textContent(`#${id}`);
  check(/alive|vivo/i.test(await txt('lr-pic')), 'the control room sees the picture alive', await txt('lr-pic'));
  check((await txt('lr-title')).length > 0 && /radio/i.test(await txt('lr-src')), 'it shows the song on air from the radio', `${await txt('lr-src')} · ${await txt('lr-title')}`);
  check(/not reachable|non raggiungibile|not connected|non collegato/i.test(await txt('lr-obs')) && /WebSocket/.test(await txt('lr-obs-note')), 'without OBS it says so and how to turn the control channel on', await txt('lr-obs'));
  check(await room.evaluate(() => document.getElementById('lr-go').disabled), 'Go live is off without OBS');
  const src = id => room.getAttribute(`#${id}`, 'src');
  check(/^blob:/.test(await src('lr-prev') || '') && /^blob:/.test(await src('lr-air') || ''), 'Preview and the app picture arrive');
  await shot(room, 'live-room.png');

  // 3. presets: a key cues, Enter takes; the picture moves with a transition
  await room.keyboard.press('3'); await sleep(200);
  check((await L()).view === 'visual', 'a cued preset does not go on air');
  check(/code \+ soul|codice \+ anima/i.test(await txt('lr-prev-tag')), 'Preview shows the cued preset', await txt('lr-prev-tag'));
  const before = await pic(1300, 400, 600, 600);
  await room.keyboard.press('Enter'); await sleep(350);
  const mid = await page.evaluate(() => globalThis.codingMiskVideo.live.preset.view);
  await shot(win, 'live-window-transition.png');
  await sleep(1000);
  const after = await pic(1300, 400, 600, 600);
  check(mid === 'code-soul', 'TAKE puts the preset on air', mid);
  check(Math.abs(after.mean - before.mean) > 5, 'the right side of the picture changes to the code', `${before.mean.toFixed(1)} → ${after.mean.toFixed(1)}`);
  await shot(win, 'live-window-code-soul.png');
  const card = await page.evaluate(() => globalThis.codingMiskVideo.live.preset.card);
  await room.click('[data-preset="5"]'); await room.keyboard.press('c'); await room.click('#lr-take'); await sleep(1200);
  l = await L();
  check(l.view === 'code-only' && (await page.evaluate(() => globalThis.codingMiskVideo.live.preset.card)) === !card, 'code only by click, C turns the song card over', JSON.stringify(l));
  await shot(win, 'live-window-code-only.png');
  await room.keyboard.press('1'); await room.keyboard.press('Enter'); await sleep(1200);
  check((await L()).view === 'visual', 'back to visual only');
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-live-preset')).view) === 'visual', 'the preset on air is remembered');

  // 3b. the app's own loop stops (as in a hidden tab): the window keeps the stage moving
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await sleep(300);
  const r1 = await page.textContent('#readout'), f1 = (await L()).frames;
  await sleep(1500);
  const r2 = await page.textContent('#readout'), f2 = (await L()).frames;
  check(r1 !== r2 && f2 - f1 > 30, 'with the app\'s loop stopped the window still moves the stage', `${r1.split('\n')[0]} → ${r2.split('\n')[0]}, ${f2 - f1} frames`);

  // 4. the app reloads: the window comes back by itself
  await page.reload(); await sleep(5000);
  l = await L();
  check(l.on && l.frames > 10, 'after the app reloads the window draws again', JSON.stringify(l));

  // 5. closing the window gives the stage back; the control room sees the picture stop
  await win.close(); await sleep(3000);
  check(!(await page.evaluate(() => globalThis.codingMiskLive.on)), 'closing the window ends the live picture');
  await sleep(3500);
  check(/still|fermo/i.test(await txt('lr-pic')), 'the control room sees the picture still', await txt('lr-pic'));
  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
