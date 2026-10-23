// Browser check of the startup time: the app must be interactive within 3 s, with no long task over 1.5 s, also when
// every song would grow (the Live build switch on with the Live coder or the Crescendo profile) and with many songs of
// the user's. Song lists never grow songs: growth happens only when a song is opened in Compose or played.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-startup.cjs   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const PORT = process.env.PORT || 5173, URL = `http://localhost:${PORT}/`;
const LONG = 1500, READY = 3000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

// long tasks from the first script on (PerformanceObserver longtask), kept on window for the check
const observe = () => {
  window.__long = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
};

async function launch() {
  try { return await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { return chromium.launch({ headless: true }); }
}

// one case: localStorage as given before the app reads it, then a fresh load; ready = the Songs tab answers a click and
// shows its cards. A frozen page fails the case (after WAIT) instead of stopping the check
const WAIT = 30000;
// extra: (page) => more checks on the loaded page, inside the measured window (background growths included)
async function run(browser, name, storage, extra = null) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(s => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, storage);
  await ctx.addInitScript(observe);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const t0 = Date.now();
  let ready = null;
  try {
    await page.goto(URL, { waitUntil: 'commit', timeout: WAIT });
    // (the tab buttons are in the HTML before the app listens to them: the app has rendered its song cards first)
    await page.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
    await page.click('[data-mode="ascolta"]', { timeout: WAIT });
    await page.click('[data-tab="brani"]', { timeout: WAIT });
    await page.waitForFunction(() => !document.querySelector('#tab-brani').hidden && document.querySelectorAll('#songs [data-song-id]:not([hidden])').length > 0, null, { timeout: WAIT });
    ready = Date.now() - t0;
    // the playlists tab reads the song list too
    await page.click('[data-tab="playlist"]', { timeout: WAIT });
    await page.click('[data-tab="brani"]', { timeout: WAIT });
    await sleep(1000);
    if (extra) await extra(page);
  } catch (e) { check(false, `${name}: page answers within ${WAIT / 1000} s`, e.message.split('\n')[0]); }
  const long = await Promise.race([page.evaluate(() => window.__long), sleep(WAIT * 2).then(() => [{ start: 0, ms: WAIT * 2 }])]).catch(() => []);
  const max = long.reduce((a, x) => Math.max(a, x.ms), 0);
  const cards = (await page.$$('#songs [data-song-id]').catch(() => [])).length;
  check(ready !== null && ready < READY, `${name}: Songs tab ready in ${ready ?? '> ' + WAIT} ms (< ${READY})`);
  check(max < LONG, `${name}: longest task ${max} ms (< ${LONG})`, long.filter(x => x.ms > 200).map(x => `${x.ms}@${x.start}`).join(' '));
  check(cards > 0 && !errors.length, `${name}: ${cards} cards, no page errors`, errors.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await launch();
  // many songs of the user's: copies of built-in songs, two of them growing (Live coder and Crescendo declared)
  const page = await browser.newPage();
  await page.goto(URL);
  const base = await page.evaluate(async () => Promise.all(['switch-test-breve', 'luci-rosse', 'crescendo-filo-di-luce', 'kellerlicht', 'drift'].map(id => fetch(`/songs/${id}.json`).then(r => r.json()))));
  await page.close();
  const many = Array.from({ length: 60 }, (_, i) => ({ ...base[i % base.length], id: `u-startup-${i}`, title: `Startup ${i + 1}` }));
  const written = Object.fromEntries(many.map(x => [x.id, x.sections.reduce((a, y) => a + y.bars, 0)]));
  const lenOf = (page, id) => page.$eval(`#songs [data-song-id="${id}"] .song-len`, el => el.textContent).catch(() => '');
  const barsIn = txt => +((txt.match(/(\d+) (bars|battute)/) || [])[1] || 0), timeIn = txt => (txt.match(/(\d+:\d\d)\s*$/) || [])[1] || '';
  // a built-in song that grows shows its grown length (src/library/song-durations.json, the page's own context), and the
  // song restored in Compose (the first one, a Live coder song) grows away from the page to the same length
  const grownBuiltin = async page => {
    const card = await lenOf(page, 'switch-prima-luce');
    check(barsIn(card) > 96, 'a built-in Live coder song shows its grown length', card);
    let total = '';
    for (let i = 0; i < 40 && timeIn(total) !== timeIn(card); i++) { await sleep(500); total = await page.$eval('#arr-total', el => el.textContent).catch(() => ''); }
    check(timeIn(total) === timeIn(card), 'the song in Compose grows in the background to the length its card shows', `${total} | ${card}`);
  };
  // the user's growing songs on screen grow in the page worker, the page keeps answering
  const grownUser = async page => {
    await page.fill('#sv-q', 'Startup'); await sleep(400);
    const ids = ['u-startup-0', 'u-startup-2'];
    let got = [];
    for (let i = 0; i < 120 && got.length < ids.length; i++) { await sleep(500); got = []; for (const id of ids) { const txt = await lenOf(page, id); if (barsIn(txt) > written[id]) got.push(`${id}: ${txt}`); } }
    check(got.length === ids.length, "the user's growing songs on screen get their grown length from the worker", got.join(' | '));
    const t0 = Date.now(); await page.click('[data-tab="playlist"]'); await page.click('[data-tab="brani"]');
    check(Date.now() - t0 < 1000, `the tabs answer while the lengths grow (${Date.now() - t0} ms)`);
  };
  const cases = [
    ['defaults', {}, grownBuiltin],
    ['Live build + Live coder', { 'coding-misk-live': true, 'coding-misk-profile': 'switch' }],
    ['Live build + Crescendo', { 'coding-misk-live': true, 'coding-misk-profile': 'crescendo' }],
    ['Live coder + 60 user songs', { 'coding-misk-live': true, 'coding-misk-profile': 'switch', 'coding-misk-library': { tracks: many, code: {} } }, grownUser],
    ['Crescendo + 60 user songs', { 'coding-misk-live': true, 'coding-misk-profile': 'crescendo', 'coding-misk-library': { tracks: many, code: {} } }],
  ];
  for (const [name, s, extra] of cases) await run(browser, name, s, extra);
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
