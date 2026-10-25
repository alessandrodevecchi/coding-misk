// Browser check of the growth in the background (growth-in-background, #75): on luci-rosse, settimo-cielo and
// kellerlicht, picking Live coder in Compose and then changing the opening and the pace never blocks the page for more
// than 200 ms (long tasks), each choice shows within a frame, the growing mark shows next to the profiles and goes when
// the song is grown, Play pressed during a growth shows the mark on Play and starts the grown song from its first bar, and
// a reload opens the grown song from the stored growths without the mark; playing, Classic to Live coder keeps the old
// version until the growth is ready, then plays the grown one (the Play part forces a real growth with the advanced
// shape settings, shape-search D10). The store of growths keeps at most its cap,
// least recently used out, and a changed growth hash empties it.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-growth-background.cjs [shots-dir] [song,song…]
//   (dev server on PORT, default 5173; screenshots of the mark in shots-dir)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const PORT = process.env.PORT || 5173, URL = `http://localhost:${PORT}/`;
const LONG = 200, WAIT = 120000;
const shots = process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : null;
const SONGS = (process.argv[3] || 'luci-rosse,settimo-cielo,kellerlicht').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
if (shots) fs.mkdirSync(shots, { recursive: true });

// long tasks from the first script on (PerformanceObserver longtask), kept on window for the check
const observe = () => {
  window.__long = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
};
const timeOf = txt => (txt.match(/(\d+:\d\d)\s*$/) || txt.match(/(\d+:\d\d)/) || [])[1] || '';
const secs = t => { const [m, s] = (t || '0:00').split(':').map(Number); return m * 60 + s; };

async function launch() {
  try { return await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { return chromium.launch({ headless: true }); }
}

// a change in the live build panel, made inside the page: → { ms, ok } where ms is the time until the next frame after
// the change and ok whether the choice shows
// (real input, so the page's own work counts as long tasks; ms from the input event to the next frame)
async function change(page, kind, sel, value) {
  await page.evaluate(type => {
    window.__frame = null;
    document.addEventListener(type, () => { const t0 = performance.now(); requestAnimationFrame(() => { window.__frame = Math.round(performance.now() - t0); }); }, { capture: true, once: true });
  }, kind === 'click' ? 'click' : 'change');
  if (kind === 'click') await page.click(sel); else await page.selectOption(sel, value);
  await page.waitForFunction(() => window.__frame !== null, null, { timeout: WAIT });
  return page.evaluate(({ kind, sel, value }) => ({ ms: window.__frame, ok: kind === 'click' ? document.querySelector(sel).getAttribute('aria-checked') === 'true' : document.querySelector(sel).value === value }), { kind, sel, value });
}
const markOn = (page, id = '#live-growing') => page.evaluate(id => { const m = document.querySelector(id); return !!(m && !m.hidden && m.offsetParent !== null); }, id);
// a value of a shape menu other than the current one and auto, that the song can play
const otherValue = (page, sel, not = []) => page.evaluate(({ sel, not }) => { const s = document.querySelector(sel); const o = [...s.options].find(x => !x.disabled && x.value !== 'auto' && x.value !== s.value && !not.includes(x.value)); return o ? o.value : null; }, { sel, not });

async function songCase(browser, id, first) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addInitScript(observe);
  // whether the growing mark showed since the page loaded (checked every frame)
  await ctx.addInitScript(() => { window.__seen = false; window.__playSeen = false; const tick = () => { const m = document.getElementById('live-growing'), p = document.getElementById('play-growing'); if (m && !m.hidden) window.__seen = true; if (p && !p.hidden) window.__playSeen = true; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
  await sleep(2500);
  await page.click('[data-mode="ascolta"]');
  await page.click('[data-tab="componi"]'); await sleep(300);
  await page.selectOption('#track-pick', id); await sleep(1500);
  const written = timeOf(await page.$eval('#arr-total', el => el.textContent));
  if (await page.$eval('#live-toggle', el => el.getAttribute('aria-pressed')) !== 'true') { await page.click('#live-toggle'); await sleep(800); }
  // the song as it is now: Classic, nothing growing
  await page.evaluate(() => { window.__long = []; window.__t0 = performance.now(); window.__seen = false; });
  // Live coder: selected within a frame, the mark shows (since shape-search a growth may end within 150 ms: the mark
  // seen in any frame since the click counts, and so does a song already grown)
  const a = await change(page, 'click', '#live-profile [data-profile="switch"]');
  await sleep(150);
  const markA = await markOn(page), seenA = await page.evaluate(() => window.__seen);
  const doneA = !markA && secs(timeOf(await page.$eval('#arr-total', el => el.textContent))) > secs(written);
  check(a.ok && a.ms < LONG, `${id}: Live coder selected at once (${a.ms} ms to the next frame)`);
  check(markA || seenA || doneA, `${id}: the growing mark shows next to the profiles`, markA ? '' : seenA ? 'shown and gone within 150 ms' : doneA ? 'grown before the next frame' : '');
  if (shots && first && markA) {
    const box = await page.evaluate(() => { const r = document.querySelector('.live-profiles').getBoundingClientRect(); return { x: Math.max(0, r.left - 12), y: Math.max(0, r.top - 12), width: Math.min(innerWidth, r.width + 24), height: r.height + 24 }; });
    await page.screenshot({ path: path.join(shots, 'mark-profiles.png'), clip: box });
    await page.hover('#live-growing'); await sleep(400);
    await page.screenshot({ path: path.join(shots, 'mark-profiles-page.png') });
  }
  // the opening and then the pace while it grows: each answers at once, only the last choice grows
  await sleep(300);
  const op = await otherValue(page, '#live-opening');
  const b = op ? await change(page, 'select', '#live-opening', op) : { ok: false, ms: -1 };
  check(!!op && b.ok && b.ms < LONG, `${id}: opening ${op} chosen at once (${b.ms} ms)`);
  await sleep(300);
  const pc = await otherValue(page, '#live-pace');
  const c = pc ? await change(page, 'select', '#live-pace', pc) : { ok: false, ms: -1 };
  check(!!pc && c.ok && c.ms < LONG, `${id}: pace ${pc} chosen at once (${c.ms} ms)`);
  // the growth ends: the mark goes, the song is grown (longer than written)
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelector('#live-growing').hidden, null, { timeout: WAIT }).catch(() => {});
  const grownIn = Date.now() - t0;
  await sleep(500);
  const grown = timeOf(await page.$eval('#arr-total', el => el.textContent));
  check(!(await markOn(page)) && secs(grown) > secs(written), `${id}: the mark goes when the song is grown (${(grownIn / 1000).toFixed(1)} s after the pace, ${written} written, ${grown} grown)`);
  const long = await page.evaluate(() => window.__long.filter(x => x.start >= window.__t0));
  const max = long.reduce((m, x) => Math.max(m, x.ms), 0);
  check(max <= LONG, `${id}: longest task ${max} ms while it grows (<= ${LONG})`, long.filter(x => x.ms > 50).map(x => `${x.ms}`).join(' '));
  // Play during a growth: the mark on Play, then the grown song from its first bar
  // (the pace back to automatic with Try all growth shapes keeping the best one, shape-search D6: a new search over
  // every shape, grown neither in this page nor in its store, so the growth really runs when Play is pressed; since
  // shape-search one search often ends within 300 ms, and the check then had nothing to wait for)
  await page.evaluate(() => { localStorage.setItem('coding-misk-shape-all', 'true'); localStorage.setItem('coding-misk-shape-keep', '"best"'); });
  await change(page, 'select', '#live-pace', 'auto');
  await sleep(150);
  const stillGrowing = await markOn(page);
  await page.evaluate(() => { window.__playSeen = false; });
  await page.click('#play');
  await sleep(150);
  // (the mark seen in any frame since the click: a growth that ends within the 150 ms took the mark with it)
  const playMark = (await markOn(page, '#play-growing')) || (await page.evaluate(() => window.__playSeen));
  if (shots && first && playMark) { const box = await page.evaluate(() => { const r = document.querySelector('.pb-btns').getBoundingClientRect(); return { x: Math.max(0, r.left - 12), y: Math.max(0, r.top - 12), width: r.width + 24, height: r.height + 24 }; }); await page.screenshot({ path: path.join(shots, 'mark-play.png'), clip: box }); }
  check(!stillGrowing || playMark, `${id}: Play during the growth shows the mark on Play`, stillGrowing ? '' : 'growth already done, nothing to wait for');
  await page.waitForFunction(() => document.querySelector('#play').getAttribute('aria-pressed') === 'true', null, { timeout: WAIT }).catch(() => {});
  await sleep(700);
  const ruler = await page.$eval('#ruler-time', el => el.textContent);
  const total2 = timeOf(await page.$eval('#arr-total', el => el.textContent));
  const [at, of] = ruler.split('/').map(x => x.trim());
  check(secs(at) <= 3 && of === total2 && secs(of) > secs(written) && !(await markOn(page, '#play-growing')), `${id}: the grown song plays from its first bar (${ruler})`);
  await page.click('#stop'); await sleep(500);
  // a reload: the stored growth, without the mark
  await sleep(800);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]');
  let total3 = '';
  for (let i = 0; i < 40 && total3 !== total2; i++) { await sleep(250); total3 = timeOf(await page.$eval('#arr-total', el => el.textContent)); }
  await sleep(500);
  const seen = await page.evaluate(() => window.__seen);
  check(total3 === total2 && !seen, `${id}: a reload opens the grown song (${total3}) without the mark`, seen ? 'the mark showed' : '');
  // playing, Classic to Live coder (the owner's use): the song as it was goes on playing, without the mark on Play,
  // until the growth is ready, then the grown song takes its place and plays on (a growth with Random order off, not
  // grown before in this page)
  await page.click('#live-profile [data-profile="classic"]'); await sleep(800);
  await page.click('#play');
  await page.waitForFunction(() => document.querySelector('#play').getAttribute('aria-pressed') === 'true', null, { timeout: WAIT }).catch(() => {});
  await sleep(1500);
  const before = timeOf(await page.$eval('#arr-total', el => el.textContent));
  await page.evaluate(() => { localStorage.setItem('coding-misk-shape-random', 'false'); window.__playSeen = false; window.__seen = false; });
  await page.click('#live-profile [data-profile="switch"]'); await sleep(150);
  const playingOn = await page.evaluate(() => document.querySelector('#play').getAttribute('aria-pressed') === 'true');
  const heldTotal = timeOf(await page.$eval('#arr-total', el => el.textContent)), growingNow = (await markOn(page)) || (await page.evaluate(() => window.__seen));
  await page.waitForFunction(() => document.querySelector('#live-growing').hidden, null, { timeout: WAIT }).catch(() => {});
  await sleep(1200);
  const after = timeOf(await page.$eval('#arr-total', el => el.textContent));
  const stillPlaying = await page.evaluate(() => document.querySelector('#play').getAttribute('aria-pressed') === 'true'), playSeen2 = await page.evaluate(() => window.__playSeen);
  check(playingOn && stillPlaying && !playSeen2 && (!growingNow || heldTotal === before) && secs(after) > secs(written), `${id}: playing, Classic to Live coder keeps the old version until the growth is ready, then plays the grown one (${before} → ${after})`, `${growingNow ? 'grew away' : 'grown at once'}${playSeen2 ? ', mark on Play' : ''}`);
  await page.click('#stop'); await sleep(300);
  check(!errors.length, `${id}: no page errors`, errors.join(' | '));
  await ctx.close();
}

// the store of growths alone: cap, least recently used out, a changed hash empties it
async function storeCase(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(URL);
  const r = await page.evaluate(async () => {
    const { createGrowthStore } = await import('/src/live/growth-store.js');
    const name = 'coding-misk-growths-check';
    await new Promise(res => { const d = indexedDB.deleteDatabase(name); d.onsuccess = d.onerror = d.onblocked = () => res(); });
    const a = createGrowthStore({ hash: 'one', cap: 3, name });
    for (const k of ['k1', 'k2', 'k3']) await a.put(k, { k });
    await a.get('k1');
    await a.put('k4', { k: 'k4' });
    await a.put('k5', { k: 'k5' });
    const kept = await a.keys(), v1 = await a.get('k1'), v2 = await a.get('k2');
    const same = createGrowthStore({ hash: 'one', cap: 3, name });
    const again = await same.keys();
    const b = createGrowthStore({ hash: 'two', cap: 3, name });
    const after = await b.keys();
    const off = createGrowthStore({ hash: 'x', idb: null });
    const quiet = [await off.get('k'), await off.put('k', 1)];
    return { kept, v1, v2, again, after, quiet };
  });
  check(r.kept.length === 3 && r.kept.includes('k1') && !r.kept.includes('k2') && !r.kept.includes('k3'), 'store: the cap holds, the least recently used go first', JSON.stringify(r.kept));
  check(r.v1 && r.v1.k === 'k1' && r.v2 === null, 'store: a kept growth reads back, a dropped one is gone');
  check(r.again.length === 3, 'store: the same hash keeps the growths');
  check(r.after.length === 0, 'store: a changed growth hash empties the store');
  check(r.quiet[0] === null && r.quiet[1] === false, 'store: without IndexedDB it fails quietly');
  await ctx.close();
}

(async () => {
  const browser = await launch();
  await storeCase(browser);
  for (const [i, id] of SONGS.entries()) await songCase(browser, id, i === 0);
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
