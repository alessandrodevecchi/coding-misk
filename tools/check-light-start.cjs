// Browser check of a light start (light-start): on a fresh load the app asks for no photo of the Sounds tab, and the
// layout does not jump after the first paint (CLS under 0.1) at desktop (1440 × 900) and phone (390 × 844) width,
// both as a narrow window and as a touch phone.
// Opening the Sounds tab then loads only the photos of the rows on screen. Prints the startup bytes (same origin,
// transferred), the image bytes, CLS with its largest shifts, and the first contentful paint.
// Usage: PLAYWRIGHT_CORE=... [PORT=5430] node tools/check-light-start.cjs [--json out.json] [--settle 6000]
// Measure on the production build: npm run build && npx vite preview --port 5430 --strictPort
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const PORT = process.env.PORT || 5430, URL = `http://localhost:${PORT}/`;
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const JSON_OUT = arg('--json', null), SETTLE = +arg('--settle', 6000);
const CLS_MAX = 0.1;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const kb = n => `${Math.round(n / 1024)} kB`;
const PHOTO = /\/sounds\/photos\//;

// layout shifts and paints from the first script on, kept on window for the check
const observe = () => {
  window.__shifts = [];
  try {
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        const src = (e.sources || []).map(s => { const n = s.node; if (!n || !n.nodeType) return '?'; const el = n.nodeType === 1 ? n : n.parentElement; return el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) : '?'; });
        window.__shifts.push({ at: Math.round(e.startTime), value: e.value, src });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
};

async function launch() {
  try { return await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { return chromium.launch({ headless: true }); }
}

async function run(browser, name, viewport, extra) {
  const mobile = name === 'phone-touch';
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => localStorage.clear());
  await ctx.addInitScript(observe);
  const page = await ctx.newPage();
  const photos = [], errors = [];
  page.on('request', r => { if (PHOTO.test(r.url())) photos.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await sleep(SETTLE);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const same = res.filter(x => x.name.startsWith(location.origin));
    const size = x => x.transferSize || x.encodedBodySize || 0;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const shifts = window.__shifts || [];
    return {
      bytes: (nav ? size(nav) : 0) + same.reduce((a, x) => a + size(x), 0),
      js: same.filter(x => /\.m?js(\?|$)/.test(x.name)).reduce((a, x) => a + size(x), 0),
      img: same.filter(x => x.initiatorType === 'img' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(x.name)).reduce((a, x) => a + size(x), 0),
      requests: same.length,
      fcp: fcp ? Math.round(fcp.startTime) : null,
      cls: shifts.reduce((a, x) => a + x.value, 0),
      shifts: shifts.slice().sort((a, b) => b.value - a.value).slice(0, 4).map(x => `${x.value.toFixed(3)}@${x.at}ms ${x.src.slice(0, 3).join(',')}`),
    };
  });
  const startPhotos = photos.length;
  console.log(`${name} ${viewport.width}×${viewport.height}: ${kb(m.bytes)} same origin in ${m.requests} requests (JS ${kb(m.js)}, images ${kb(m.img)}), first paint ${m.fcp} ms, CLS ${m.cls.toFixed(3)}`);
  if (m.shifts.length) console.log(`      largest shifts: ${m.shifts.join(' | ')}`);
  check(startPhotos === 0, `${name}: no Sounds photo requested at startup`, startPhotos ? `${startPhotos} photos` : '');
  check(m.cls < CLS_MAX, `${name}: CLS ${m.cls.toFixed(3)} (< ${CLS_MAX})`);
  const out = { name, viewport, ...m, startPhotos };
  if (extra) Object.assign(out, await extra(page, photos));
  check(!errors.length, `${name}: no page errors`, errors.join(' | '));
  await ctx.close();
  return out;
}

// the Sounds tab opened: the photos of the rows on screen load, the ones further down wait for a scroll
async function openSounds(page, photos) {
  const before = photos.length;
  await page.click('[data-mode="lab"]');
  await page.click('[data-tab="suoni"]');
  await page.waitForFunction(() => document.querySelectorAll('#sounds .sb-cards, #sounds .sb-list').length > 0, null, { timeout: 15000 });
  await sleep(2500);
  const total = await page.evaluate(() => document.querySelectorAll('#sounds img.photo').length);
  const opened = photos.length - before;
  check(opened > 0, `Sounds tab: photos on screen load when the tab opens (${opened} of ${total})`);
  check(total > 0 && opened < total, `Sounds tab: photos below the fold wait (${total - opened} not requested)`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(2000);
  const scrolled = photos.length - before;
  check(scrolled > opened, `Sounds tab: scrolling down loads more photos (${scrolled})`);
  return { soundsPhotos: { total, opened, scrolled } };
}

(async () => {
  const browser = await launch();
  const results = [];
  try {
    results.push(await run(browser, 'desktop', { width: 1440, height: 900 }, openSounds));
    // a narrow desktop window, and a touch phone (mobile viewport, touch)
    results.push(await run(browser, 'phone', { width: 390, height: 844 }));
    results.push(await run(browser, 'phone-touch', { width: 390, height: 844 }));
  } finally { await browser.close(); }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
  console.log(failed ? `${failed} failed` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
