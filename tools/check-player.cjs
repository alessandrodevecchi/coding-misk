// Browser checks for the player bar and the global volume (#32).
// Usage: PLAYWRIGHT_CORE=... node tools/check-player.cjs   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // peak level before (master, what exports record) and after the volume node (what is heard)
  const levels = () => page.evaluate(async () => {
    const v = globalThis.codingMiskVolume, pre = v.master(), post = v.node(); if (!pre || !post) return null;
    const ctx = post.context, a = ctx.createAnalyser(), b = ctx.createAnalyser(); a.fftSize = b.fftSize = 2048;
    pre.connect(a); post.connect(b);
    const da = new Float32Array(2048), db = new Float32Array(2048); let ma = 0, mb = 0;
    for (let k = 0; k < 40; k++) { a.getFloatTimeDomainData(da); b.getFloatTimeDomainData(db); for (let i = 0; i < 2048; i++) { ma = Math.max(ma, Math.abs(da[i])); mb = Math.max(mb, Math.abs(db[i])); } await new Promise(r => setTimeout(r, 50)); }
    pre.disconnect(a); post.disconnect(b);
    return { pre: ma, post: mb };
  });
  const bar = () => page.evaluate(() => ({ title: document.getElementById('pb-title').textContent, pos: document.getElementById('pb-pos').textContent, onair: document.getElementById('pb-onair').classList.contains('on'),
    vol: +document.getElementById('pb-volume').value, muted: document.getElementById('pb-mute').getAttribute('aria-pressed') === 'true', started: document.querySelector('strudel-editor').editor.repl.scheduler.started,
    pick: document.getElementById('track-pick').value }));
  const setVol = (id, v) => page.evaluate(([id, v]) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);

  await page.goto('http://localhost:5173/'); await sleep(5000);
  await page.evaluate(() => { localStorage.removeItem('coding-misk-volume'); localStorage.removeItem('coding-misk-muted'); });
  await page.reload(); await sleep(5000);
  await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(500);
  await page.click('#play'); await sleep(6000);
  let b = await bar();
  check(b.started && b.title && /\d+:\d\d \/ \d+:\d\d/.test(b.pos), 'play in the bar plays the song, with title and time', `${b.title} ${b.pos}`);

  // volume: 20 % lowers what is heard to a fifth, the master (exports) stays the same
  const full = await levels();
  await setVol('pb-volume', 20); await sleep(400);
  const low = await levels();
  check(full && low && low.post < full.post * 0.35 && low.post > full.post * 0.08, 'volume 20 % plays at about a fifth', `post ${full && full.post.toFixed(2)} -> ${low && low.post.toFixed(2)}`);
  check(full && low && Math.abs(low.pre - full.pre) < full.pre * 0.35, 'the master output (exports) keeps its level', `pre ${full && full.pre.toFixed(2)} -> ${low && low.pre.toFixed(2)}`);
  await page.click('#pb-mute'); await sleep(300);
  const mute = await levels();
  check(mute && mute.post < 0.005 && (await bar()).muted, 'mute silences');
  await page.click('#pb-mute'); await sleep(300);
  check(!(await bar()).muted && (await bar()).vol === 20, 'unmute comes back to the previous volume');

  // in every tab, content not hidden
  for (const tab of ['componi', 'brani', 'radio', 'guida', 'suoni', 'riferimenti']) {
    await page.click(`[data-tab="${tab}"]`); await sleep(300);
    const geo = await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); const bar = document.getElementById('pbar').getBoundingClientRect(); const sec = document.querySelector(`section[id^="tab-"]:not([hidden])`); const last = sec.lastElementChild || sec; return { visible: bar.height > 30 && bar.bottom <= innerHeight + 1, lastBottom: last.getBoundingClientRect().bottom, barTop: bar.top }; });
    check(geo.visible && geo.lastBottom <= geo.barTop + 1, `bar visible in ${tab} without hiding content`, `content ends ${geo.lastBottom.toFixed(0)}, bar at ${geo.barTop.toFixed(0)}`);
  }

  // next and previous in the library
  const first = (await bar()).pick;
  await page.click('#pb-next'); await sleep(3000);
  b = await bar();
  check(b.pick !== first && b.started, 'next plays the next song of the library', `${first} -> ${b.pick}`);
  await page.click('#pb-prev'); await sleep(3000);
  check((await bar()).pick === first, 'previous goes back');

  // volume remembered
  await page.reload(); await sleep(5000);
  check((await bar()).vol === 20, 'volume remembered after reload');

  // radio: on air in the bar, next skips, previous restarts, volume in sync
  await page.click('[data-tab="radio"]'); await page.fill('#radio-seed', 'bar'); await page.click('#radio-start'); await sleep(6000);
  b = await bar();
  const r0 = await page.evaluate(() => codingMiskRadio.state);
  check(b.onair && b.title === r0.stream[r0.onAir].title, 'radio: ON AIR and the song on air in the bar');
  await page.click('#pb-next'); await sleep(4000);
  const r1 = await page.evaluate(() => codingMiskRadio.state);
  check(r1.onAir === r0.onAir + 1, 'radio: next skips to the next song');
  await sleep(4000);
  const before = await page.evaluate(() => document.querySelector('strudel-editor').editor.repl.scheduler.now());
  await page.click('#pb-prev'); await sleep(2500);
  const after = await page.evaluate(() => document.querySelector('strudel-editor').editor.repl.scheduler.now());
  const r2 = await page.evaluate(() => codingMiskRadio.state);
  check(r2.onAir === r1.onAir && after < before && after - r2.stream[r2.onAir].start < 2, 'radio: previous starts the song on air again', `${before.toFixed(1)} -> ${after.toFixed(1)}`);
  await setVol('radio-volume', 55); await sleep(200);
  check((await bar()).vol === 55, 'radio volume and bar volume in sync');
  await page.click('#radio-start'); await sleep(300);

  // phone width: the bar fits
  await page.setViewportSize({ width: 400, height: 800 }); await sleep(500);
  const w = await page.evaluate(() => { const r = document.getElementById('pbar').getBoundingClientRect(); return { right: r.right, width: innerWidth, h: r.height }; });
  check(w.right <= w.width + 1 && w.h <= 60, 'the bar fits a 400 px screen', JSON.stringify(w));

  await setVol('pb-volume', 100);
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
