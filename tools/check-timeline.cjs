// Browser check of the Compose timeline of grown songs (timeline-growth, #88): the growth column aligned in the ruler,
// the section strip and the track grid (sections view and timeline view), its three views (compact by default, open at
// the written song's scale with horizontal scrolling, hidden as a tab, remembered after a reload), one scale for the
// ruler (clicks in the growth and in the written part, the knob during the growth), the strip (growth to bar 0, first
// written section to the written part), a growth cell (the track's step, the track selected), the keys (arrows,
// Page Up and Page Down, Home, End with the added ending), the Crescendo ending column, a waypoint song in Classic
// with the live build off (the section clicked is the section heard) and a Classic song unchanged.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-timeline.cjs [shots-dir]
//   (dev server on PORT, default 5173; with shots-dir: the three views in neon and hardware, and at phone width)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const PORT = process.env.PORT || 5173, URL = `http://localhost:${PORT}/`, WAIT = 120000;
const shots = process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
if (shots) fs.mkdirSync(shots, { recursive: true });
const near = (a, b, d) => Math.abs(a - b) <= d;

async function launch() {
  try { return await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { return chromium.launch({ headless: true }); }
}
const bars = page => page.evaluate(() => globalThis.codingMiskBars().compose);
const compose = page => page.evaluate(() => globalThis.codingMiskPatterns.compose());
async function openSong(page, id, profile) {
  await page.click('[data-tab="componi"]'); await sleep(300);
  await page.selectOption('#track-pick', id); await sleep(1200);
  if (profile) {
    if (await page.$eval('#live-toggle', el => el.getAttribute('aria-pressed')) !== 'true') { await page.click('#live-toggle'); await sleep(600); }
    await page.$eval(`#live-profile [data-profile="${profile}"]`, el => el.click());
    await page.waitForFunction(() => { const b = globalThis.codingMiskBars().compose; return !b.pending && b.map.G > 0; }, null, { timeout: WAIT });
  } else if (await page.$eval('#live-toggle', el => el.getAttribute('aria-pressed')) === 'true' && !(await page.$eval('#live-toggle', el => el.disabled))) {
    await page.$eval('#live-profile [data-profile="classic"]', el => el.click()).catch(() => {});
    await page.click('#live-toggle'); await sleep(600);
  }
  await sleep(800);
}
// boxes of the strip columns, the growth cells and the first written cells, the ruler
const boxes = page => page.evaluate(() => {
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: Math.round(b.left), w: Math.round(b.width), r: Math.round(b.right) }; };
  return {
    grow: r(document.querySelector('#arr-strip .arr-xcol.x-grow')), end: r(document.querySelector('#arr-strip .arr-xcol.x-end')),
    first: r(document.querySelector('#arr-strip .arr-scene-btn')), secs: [...document.querySelectorAll('#arr-strip .arr-scene-btn')].map(r),
    gcells: [...document.querySelectorAll('#arr-grid .xcell.x-grow')].map(r), ecells: [...document.querySelectorAll('#arr-grid .xcell.x-ending')].map(r),
    firstCells: [...document.querySelectorAll('#arr-grid .trk-row')].map(row => r(row.querySelector('[data-cell$=":0"], .trk-lane'))),
    ruler: r(document.querySelector('#ruler-track')), knob: r(document.querySelector('#ruler-knob')),
    scroll: (s => ({ sw: s.scrollWidth, cw: s.clientWidth }))(document.querySelector('.arr-scroll')),
    eye: !!document.querySelector('.grow-eye'), sections: document.querySelectorAll('.arr-scene-btn').length,
  };
});
// a click on the ruler at a bar of the played song inside a column (fraction of its width)
async function clickRuler(page, colSel, frac) {
  await page.evaluate(() => document.querySelector('#ruler-track').scrollIntoView({ block: 'center' })); await sleep(150);
  const p = await page.evaluate(({ colSel, frac }) => { const b = document.querySelector(colSel).getBoundingClientRect(), r = document.querySelector('#ruler-track').getBoundingClientRect(); return { x: b.left + b.width * frac, y: r.top + r.height / 2 }; }, { colSel, frac });
  await page.mouse.click(p.x, p.y); await sleep(500);
}
const key = async (page, k) => { await page.focus('#ruler-track'); await page.keyboard.press(k); await sleep(400); return (await bars(page)).cue; };
const aligned = (b, d = 1) => b.grow && b.gcells.length && b.gcells.every(c => near(c.l, b.grow.l, d) && near(c.w, b.grow.w, d)) && b.firstCells.every(c => c && near(c.l, b.first.l, d));

async function shot(page, name) {
  if (!shots) return;
  await page.evaluate(() => document.querySelector('.arr-scroll').scrollIntoView({ block: 'center' }));
  await sleep(300);
  await page.screenshot({ path: path.join(shots, name) });
}

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'it'); localStorage.setItem('coding-misk-arr-mode', '"sections"'); });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
  await sleep(1500);
  await page.click('[data-mode="ascolta"]').catch(() => {});

  // ---------- a Classic song: unchanged ----------
  await openSong(page, 'luci-rosse', null);
  let b = await boxes(page), m = (await bars(page)).map;
  check(!b.grow && !b.end && !b.eye && m.G === 0, 'Classic song: no growth column, no toggle', `G ${m.G}`);
  await clickRuler(page, '#arr-strip .arr-scene-btn[data-scene-i="2"]', 0.02);
  { const c = (await bars(page)).cue, at = (await compose(page)).T.sections.slice(0, 2).reduce((a, s) => a + s.bars, 0); check(near(c, at, 0.5), 'Classic song: the ruler seeks in written bars', `bar ${c}, third section at ${at}`); }

  // ---------- Live coder: luci-rosse ----------
  await openSong(page, 'luci-rosse', 'switch');
  m = (await bars(page)).map; b = await boxes(page);
  const T = (await compose(page)).T;
  check(m.G > 0 && m.pre >= 1 && m.view === 'compact', `Live coder: growth of ${m.G} bars, compact by default`, `pre ${m.pre}, ${m.steps.length} steps, total ${m.bars}`);
  check(b.grow && near(b.grow.w, 160, 2) && b.sections === T.sections.length, 'compact growth column 160 px, sections counted apart', b.grow && `${b.grow.w} px, ${b.sections} sections`);
  check(aligned(b), 'growth column aligned in the strip and every track row (sections view)', JSON.stringify(b.gcells.slice(0, 2)));
  check(b.ruler && b.grow.l > b.ruler.l - 2 && b.grow.l < b.ruler.l + 6, 'the ruler starts with the growth column');
  const ticks = await page.$$eval('#arr-grid .xcell.x-grow', els => els.map(e => e.querySelectorAll('.x-step').length));
  const ons = await page.$$eval('#arr-grid .xcell.x-grow', els => els.map(e => e.querySelectorAll('.x-on').length));
  check(ticks[0] > 0 && ons[0] > 0, 'drums row: where it plays in the growth and its steps', `ticks per row ${ticks.join(',')}, spans ${ons.join(',')}`);
  await shot(page, 'fatto-1-compatta-neon.png');

  // seek mapping, stopped
  await clickRuler(page, '#arr-strip .arr-xcol.x-grow', 0.5);
  let cue = (await bars(page)).cue;
  check(near(cue, m.G / 2, Math.max(3, m.G * 0.05)) || m.steps.includes(cue), 'ruler click in the middle of the growth seeks into the growth', `bar ${cue} of ${m.G}`);
  await sleep(100);
  b = await boxes(page);
  check(b.knob.l + b.knob.w / 2 > b.grow.l && b.knob.l + b.knob.w / 2 < b.grow.r, 'the knob stands inside the growth column');
  const t2 = await page.$eval('#ruler-time', el => el.textContent);
  check(/^\d+:\d\d \/ \d+:\d\d$/.test(t2) && t2.split(' / ')[0] !== '0:00', 'the time label follows the growth', t2);
  const s3 = m.G + T.sections.slice(0, 2).reduce((a, s) => a + s.bars, 0);
  await clickRuler(page, '#arr-strip .arr-scene-btn[data-scene-i="2"]', 0.02);
  cue = (await bars(page)).cue;
  check(near(cue, s3, 0.5), 'ruler click on the third section seeks to its played bar', `bar ${cue}, section at ${s3}`);
  await page.click('#arr-strip .arr-xcol.x-grow'); await sleep(300);
  check((await bars(page)).cue === 0, 'strip: the growth goes to bar 0');
  await page.click('#arr-strip .arr-scene-btn'); await sleep(300);
  check((await bars(page)).cue === m.G, 'strip: the first written section goes to the written part', `bar ${(await bars(page)).cue}`);
  // a growth cell: the track's step, the track selected
  const row = 1, cell = await page.$$eval('#arr-grid .xcell.x-grow', (els, i) => { const e = els[i], r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.6, y: r.top + r.height / 2, ticks: e.dataset.ticks }; }, row);
  await page.mouse.click(cell.x, cell.y); await sleep(500);
  cue = (await bars(page)).cue;
  const tk = (await bars(page)).map.tk, tks = cell.ticks ? cell.ticks.split(',').map(Number) : [];
  check(tk === row && (tks.length ? tks.includes(cue) : cue < m.G), 'growth cell: goes to the track\'s step and selects the track', `track ${tk}, bar ${cue}, steps ${cell.ticks}`);
  // keys
  check(await key(page, 'Home') === 0, 'Home: bar 0');
  check(await key(page, 'ArrowRight') === 1, 'ArrowRight: one bar');
  const pd = await key(page, 'PageDown');
  check(pd === m.steps.find(x => x > 1), 'PageDown: the next growth step', `bar ${pd}, steps ${m.steps.slice(0, 4).join(',')}`);
  const pu = await key(page, 'PageUp');
  check(pu < pd, 'PageUp: back to the previous step', `bar ${pu}`);
  check(await key(page, 'End') === m.bars - 1, 'End: the last bar of the played song', `${m.bars - 1}`);

  // playing in the growth: the knob, the growth column lit, the player bar on the same bar
  await clickRuler(page, '#arr-strip .arr-xcol.x-grow', 0.3);
  await page.click('#play'); await sleep(2500);
  b = await boxes(page);
  const lit = await page.$eval('#arr-strip .arr-xcol.x-grow', el => el.classList.contains('playing'));
  const now = await page.evaluate(() => { const s = globalThis.codingMiskBars(); return s.song ? s.song.bars : 0; });
  check(lit && b.knob.l + b.knob.w / 2 > b.grow.l && b.knob.l + b.knob.w / 2 < b.grow.r, 'playing in the growth: the knob in the growth column, the column lit', `song of ${now} bars`);
  // drag from the growth into the written part: no jump of scale (the bar under the pointer)
  const g0 = await page.evaluate(() => { const r = document.querySelectorAll('#arr-strip .arr-scene-btn')[1].getBoundingClientRect(), t = document.querySelector('#ruler-track').getBoundingClientRect(); return { x: r.left + 2, y: t.top + t.height / 2 }; });
  await page.mouse.move(b.grow.l + 20, g0.y); await page.mouse.down(); await page.mouse.move(g0.x, g0.y, { steps: 8 }); await page.mouse.up(); await sleep(1500);
  const sec1 = m.G + T.sections[0].bars, played = await page.evaluate(() => globalThis.codingMiskBars().song && document.querySelector('#ruler-track').getAttribute('aria-valuenow'));
  check(near(+played - 1, sec1, 2), 'drag from the growth to the second section plays the second section', `bar ${played}, section at ${sec1 + 1}`);
  await page.click('#stop'); await sleep(500);

  // ---------- the three views ----------
  await page.click('.grow-eye'); await sleep(600);
  b = await boxes(page); m = (await bars(page)).map;
  const ppbG = b.grow.w / m.G, ppbW = (b.secs[0].w + 3) / T.sections[0].bars;
  check(m.view === 'open' && near(ppbG / ppbW, 1, 0.2) && b.scroll.sw > b.scroll.cw + 50, 'open: the growth at the written song\'s scale, the arranger scrolls', `${ppbG.toFixed(1)} vs ${ppbW.toFixed(1)} px per bar, ${b.scroll.sw} > ${b.scroll.cw}`);
  check(aligned(b), 'open: growth aligned in strip and grid');
  await shot(page, 'fatto-2-intera-neon.png');
  await page.click('.grow-eye'); await sleep(600);
  b = await boxes(page);
  check((await bars(page)).map.view === 'hidden' && near(b.grow.w, 22, 2) && aligned(b), 'hidden: a narrow tab, aligned', `${b.grow.w} px`);
  await shot(page, 'fatto-3-nascosta-neon.png');
  await page.reload(); await page.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
  await page.click('[data-tab="componi"]');
  await page.waitForFunction(() => { const b = globalThis.codingMiskBars().compose; return !b.pending && b.map.G > 0; }, null, { timeout: WAIT }); await sleep(800);
  b = await boxes(page);
  check((await bars(page)).map.view === 'hidden' && near(b.grow.w, 22, 2), 'the view is remembered after a reload');
  await page.click('.grow-eye'); await sleep(600);
  check((await bars(page)).map.view === 'compact', 'the toggle comes back to compact');

  // timeline view: same columns
  await page.click('[data-arr-mode="timeline"]'); await sleep(800);
  b = await boxes(page);
  check(aligned(b, 1), 'timeline view: growth column and lanes aligned with the strip', JSON.stringify([b.grow, b.firstCells[0]]));
  await clickRuler(page, '#arr-strip .arr-xcol.x-grow', 0.5);
  check((await bars(page)).cue < m.G, 'timeline view: the ruler seeks into the growth');
  await shot(page, 'fatto-4-timeline-compatta-neon.png');
  // hardware theme: the three views
  await page.evaluate(() => { localStorage.setItem('coding-misk-ui', '"hw"'); localStorage.setItem('coding-misk-arr-mode', '"sections"'); });
  await page.reload(); await page.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
  await page.click('[data-tab="componi"]');
  await page.waitForFunction(() => { const b = globalThis.codingMiskBars().compose; return !b.pending && b.map.G > 0; }, null, { timeout: WAIT }); await sleep(800);
  check(aligned(await boxes(page)), 'hardware theme: growth column aligned');
  await shot(page, 'fatto-5-compatta-hw.png');
  await page.click('.grow-eye'); await sleep(600); await shot(page, 'fatto-6-intera-hw.png');
  await page.click('.grow-eye'); await sleep(600); await shot(page, 'fatto-7-nascosta-hw.png');
  await page.click('.grow-eye'); await sleep(400);
  await page.evaluate(() => localStorage.setItem('coding-misk-ui', '"neon"'));

  // ---------- Crescendo with an added ending ----------
  await page.reload(); await page.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
  await page.click('[data-mode="ascolta"]').catch(() => {});
  await openSong(page, 'crescendo-notte-lunga', 'crescendo');
  m = (await bars(page)).map; b = await boxes(page);
  check(m.ending && b.end && b.ecells.length && b.ecells.every(c => near(c.l, b.end.l, 1)), 'Crescendo: the added ending is a column of its own', m.ending ? `${m.ending.label}, ${m.ending.bars} bars at ${m.ending.start}` : 'none');
  check(await key(page, 'End') === m.bars - 1 && m.ending && m.bars - 1 >= m.ending.start, 'Crescendo: End reaches the last bar of the ending', `${m.bars - 1}`);
  if (b.end) { await page.click('#arr-strip .arr-xcol.x-end'); await sleep(300); check((await bars(page)).cue === m.ending.start, 'Crescendo: the ending column goes to its start'); }
  await shot(page, 'fatto-8-crescendo-finale.png');

  // ---------- a waypoint song in Classic with the live build off ----------
  await openSong(page, 'switch-tappe', null);
  m = (await bars(page)).map;
  const W = (await compose(page)).T, lastI = W.sections.length - 1, lastAt = m.G + W.sections.slice(0, lastI).reduce((a, s) => a + s.bars, 0);
  check(m.pre === 4 && m.G === 32, 'waypoint song: 4 waypoint sections before the written ones', `pre ${m.pre}, G ${m.G}`);
  await page.click('#play'); await sleep(1500);
  await page.click(`#arr-strip .arr-scene-btn[data-scene-i="${lastI}"]`); await sleep(2500);
  const heard = await page.evaluate(() => { const b = globalThis.codingMiskBars(); return +document.querySelector('#ruler-track').getAttribute('aria-valuenow') - 1; });
  const playing = await page.$$eval('#arr-strip .arr-scene-btn', els => els.findIndex(e => e.classList.contains('playing')));
  const selNow = (await compose(page)).sel;
  check(heard >= lastAt && heard < lastAt + W.sections[lastI].bars && playing === lastI && selNow === lastI, 'waypoint song: the last section clicked is the section heard and lit', `bar ${heard + 1}, section from ${lastAt + 1}, lit ${playing}, sel ${selNow}`);
  await page.click('#stop'); await sleep(400);

  // ---------- phone width ----------
  const phone = await browser.newContext({ viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true });
  const pp = await phone.newPage();
  pp.on('pageerror', e => errors.push(e.message));
  await pp.goto(URL);
  await pp.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'it'); localStorage.setItem('coding-misk-arr-mode', '"sections"'); });
  await pp.reload(); await pp.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
  await sleep(1000);
  await pp.click('[data-mode="ascolta"]').catch(() => {});
  await openSong(pp, 'luci-rosse', 'switch');
  b = await boxes(pp);
  check(near(b.grow.w, 96, 2) && aligned(b), 'phone: compact growth 96 px, aligned', `${b.grow && b.grow.w} px`);
  await shot(pp, 'fatto-9-telefono-compatta.png');
  await pp.click('.grow-eye'); await sleep(600);
  b = await boxes(pp);
  check(aligned(b) && b.scroll.sw > b.scroll.cw, 'phone: open growth aligned, the arranger scrolls');
  await shot(pp, 'fatto-10-telefono-intera.png');
  await pp.click('.grow-eye'); await sleep(600);
  check(near((await boxes(pp)).grow.w, 22, 2), 'phone: hidden growth a narrow tab');
  await shot(pp, 'fatto-11-telefono-nascosta.png');
  await phone.close();

  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
