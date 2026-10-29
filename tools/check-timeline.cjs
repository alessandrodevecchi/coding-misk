// Browser check of the Compose timeline of grown songs (timeline-growth, #88): the growth column aligned in the ruler,
// the section strip and the track grid (sections view and timeline view), its three views (compact by default, open at
// the written song's scale with horizontal scrolling, hidden as a tab, remembered after a reload), one scale for the
// ruler (clicks in the growth and in the written part, the knob during the growth), the strip (growth to bar 0, first
// written section to the written part), a growth cell (the track's step, the track selected), the keys (arrows,
// Page Up and Page Down, Home, End with the added ending), the Crescendo ending column, a waypoint song in Classic
// with the live build off (the section clicked is the section heard), a Classic song unchanged, the ghost narrator row
// (narrator-ghost-row: last row in both views, aligned, its marks the narrator lines of the schedule, tooltips, clicks
// to the nearest line without selecting a track, the name opening the narrator's Sound, dimmed when the narrator is
// off, the Narrator track in its place on the first sound edit and the ghost back on Undo, none with the Live build
// off, hardware theme, 400 px), and the arranger
// following the playing knob (D7: page follow in the open view and the timeline view, held by the user's scroll, resumed
// after 3 s or on a seek, off with Follow playback off, a jump with reduced motion, never in a compact view that fits).
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
  // (a song with changes asks to press twice before another one opens)
  for (let k = 0; k < 3; k++) { await page.selectOption('#track-pick', id); await sleep(1200); if ((await compose(page)).T.id === id) break; }
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
    firstCells: [...document.querySelectorAll('#arr-grid .trk-row')].map(row => r(row.querySelector('[data-cell$=":0"], [data-ncell="sec"], .trk-lane'))),
    ruler: r(document.querySelector('#ruler-track')), knob: r(document.querySelector('#ruler-knob')),
    scroll: (s => ({ sw: s.scrollWidth, cw: s.clientWidth }))(document.querySelector('.arr-scroll')),
    eye: !!document.querySelector('.grow-eye'), sections: document.querySelectorAll('.arr-scene-btn').length,
  };
});
// the ghost narrator row (narrator-ghost-row): where it is, its cells, ticks, marks and tooltips
const ghost = page => page.evaluate(() => {
  const r = document.querySelector('#arr-grid [data-ghost]'); if (!r) return null;
  const rows = [...document.querySelectorAll('#arr-grid .trk-row')], gc = r.querySelector('.ncell.x-grow'), nm = r.querySelector('.ghost-name');
  return { last: rows[rows.length - 1] === r, muteSolo: !!r.querySelector('[data-mute], [data-solo]'), name: nm.querySelector('i').textContent.trim(), nameTip: nm.title, nameFits: nm.querySelector('i').scrollWidth <= nm.querySelector('i').clientWidth + 1, silent: r.classList.contains('silent'),
    grow: gc ? gc.dataset.ticks : '', growSteps: gc ? gc.querySelectorAll('.n-step').length : 0, secs: [...r.querySelectorAll('[data-ncell="sec"]')].map(c => c.textContent.trim()), secTicks: [...r.querySelectorAll('[data-ncell="sec"]')].map(c => c.dataset.ticks),
    dots: [...r.querySelectorAll('[data-nmark]')].map(d => +d.dataset.nmark), tips: [...r.querySelectorAll('[data-ncell]')].map(c => c.title) };
});
// a click on the ruler at a bar of the played song inside a column (fraction of its width)
async function clickRuler(page, colSel, frac) {
  await page.evaluate(() => document.querySelector('#ruler-track').scrollIntoView({ block: 'center' })); await sleep(150);
  const p = await page.evaluate(({ colSel, frac }) => { const b = document.querySelector(colSel).getBoundingClientRect(), r = document.querySelector('#ruler-track').getBoundingClientRect(); return { x: b.left + b.width * frac, y: r.top + r.height / 2 }; }, { colSel, frac });
  await page.mouse.click(p.x, p.y); await sleep(500);
}
const key = async (page, k) => { await page.focus('#ruler-track'); await page.keyboard.press(k); await sleep(400); return (await bars(page)).cue; };
// following the knob (D7): the scroller, whether the knob is in its visible part, the follow state
const fol = page => page.evaluate(() => {
  const s = document.querySelector('.arr-scroll'), r = s.getBoundingClientRect(), k = document.querySelector('#ruler-knob').getBoundingClientRect(), c = k.left + k.width / 2;
  return { left: Math.round(s.scrollLeft), max: s.scrollWidth - s.clientWidth, seen: c >= r.left && c <= r.right, ...globalThis.codingMiskBars().compose.follow };
});
// the user scrolls the arranger sideways with the wheel (to the start)
async function wheelAway(page) {
  const p = await page.evaluate(() => { const s = document.querySelector('.arr-scroll'); s.scrollIntoView({ block: 'center' }); const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height - 20 }; });
  await page.mouse.move(p.x, p.y); await page.mouse.wheel(-20000, 0);
  // the wheel scrolls smoothly: wait until it settles
  let last = -1;
  for (let k = 0; k < 20; k++) { await sleep(150); const l = await page.$eval('.arr-scroll', el => el.scrollLeft); if (l === last) break; last = l; }
}
// wait (up to ms) until the knob is in sight and the scroll settled
async function untilSeen(page, ms = 3000) {
  let f = await fol(page), last = -1;
  for (let k = 0; k < ms / 250; k++) { await sleep(250); f = await fol(page); if (f.seen && f.left === last) break; last = f.left; }
  return f;
}
// near the end of the played song while it plays: End, then back to the start of a section with some bars left
async function nearEnd(page, m) {
  await key(page, 'End'); let at = await key(page, 'PageUp');
  if (m.bars - at < 10) at = await key(page, 'PageUp');
  return at;
}
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
  check(!(await ghost(page)) && !(await bars(page)).narrator.ghost, 'Live build off: no ghost narrator row');
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

  // ---------- the ghost narrator row (narrator-ghost-row) ----------
  {
    const nar = async () => (await bars(page)).narrator;
    const N = await nar(), G = m.G;
    let g = await ghost(page);
    const inG = N.marks.filter(x => x.at < G).map(x => x.at), written = N.marks.filter(x => x.at >= G).map(x => x.at);
    check(N.ghost && g && g.last && !g.muteSolo && g.name === 'Narrator' && !g.silent, 'ghost row: the last row, named Narrator, no Mute or Solo, not dimmed', JSON.stringify(g && { last: g.last, name: g.name }));
    check(N.marks.length === 19 && inG.length === 17 && N.marks.every(x => x.track === null), 'ghost row: 19 narrator lines heard on luci-rosse in Live coder, 17 of them in the growth (spokenSchedule)', `${N.marks.length} lines, ${inG.length} in the growth`);
    check(g.grow === inG.join(',') && g.growSteps === inG.length, 'ghost growth cell: a tick per narrator line of the growth, at its bar', `${g.growSteps} ticks`);
    check(JSON.stringify(g.secTicks.filter(Boolean).join(',').split(',').filter(Boolean).map(Number)) === JSON.stringify(written) && g.secs.filter(Boolean).every(x => /^❝ \d+$/.test(x)), 'ghost sections: the count of the lines in each written section, at the bars of the schedule', `${g.secs.join('|')}`);
    const t149 = g.tips.find(x => /battuta 149/.test(x));
    check(t149 && /«sta arrivando»/.test(t149) && /Sola lettura/.test(t149), 'ghost section tooltip: the section, "battuta 149" with its line, read-only', t149 && t149.replace(/\n/g, ' / '));
    check(/19 frasi/.test(g.nameTip) && /traccia Narrator/.test(g.nameTip), 'ghost name tooltip: how many lines, the track it becomes', g.nameTip.replace(/\n/g, ' / '));
    check(aligned(await boxes(page)), 'ghost row: its growth cell and first section aligned with the rows above (sections view)');
    // clicks: the nearest line, no track selected (each cell scrolled into view first: the row sits low on the page)
    const tk0 = (await bars(page)).map.tk;
    const gc = await page.$eval('#arr-grid [data-ghost] .ncell.x-grow', e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height / 2, w: r.width }; });
    await page.mouse.click(gc.x, gc.y); await sleep(500);
    let cue = (await bars(page)).cue;
    const want = inG.reduce((p, q) => (Math.abs(q - G * 0.5) < Math.abs(p - G * 0.5) ? q : p));
    check(near(cue, want, 6) && inG.includes(cue) && (await bars(page)).map.tk === tk0, 'ghost growth cell: goes to the nearest narrator line, the selected track stays', `bar ${cue}, nearest ${want}, track ${(await bars(page)).map.tk}`);
    const si = g.secTicks.findIndex(x => x === '148');
    { const p = await page.$$eval('#arr-grid [data-ghost] [data-ncell="sec"]', (els, i) => { els[i].scrollIntoView({ block: 'center' }); const r = els[i].getBoundingClientRect(); return { x: r.left + r.width * 0.8, y: r.top + r.height / 2 }; }, si); await page.mouse.click(p.x, p.y); }
    await sleep(500);
    cue = (await bars(page)).cue;
    check(cue === 148 && (await bars(page)).map.tk === tk0, 'ghost section cell: goes to its line at bar 149', `bar ${cue + 1}`);
    // keys: Enter on a cell acts as a click
    await page.focus('#arr-grid [data-ghost] .ncell.x-grow'); await page.keyboard.press('Enter'); await sleep(400);
    check(inG.includes((await bars(page)).cue), 'ghost cell from the keyboard: Enter goes to a narrator line', `bar ${(await bars(page)).cue}`);
    // the name: Voice: narrator in view, Sound open and focused
    await page.click('#arr-grid [data-ghost] [data-nghost]'); await sleep(900);
    const vs = await page.evaluate(() => { const row = document.querySelector('#live-narrator-row'), r = row.getBoundingClientRect(), d = row.querySelector('details.vs-part'); return { seen: r.top < innerHeight && r.bottom > 0, open: !!d && d.open, focus: !!document.activeElement && !!document.activeElement.closest('#live-narrator-row details.vs-part') }; });
    check(vs.seen && vs.open && vs.focus, 'ghost name: Voice: narrator in view, its Sound unfolded and focused', JSON.stringify(vs));
    if (shots) { await page.evaluate(() => document.querySelector('#live-narrator-row').scrollIntoView({ block: 'center' })); await sleep(300); await page.screenshot({ path: path.join(shots, 'fatto-narratore-voce-aperta.png') }); }
    await shot(page, 'fatto-narratore-sezioni-neon.png');
    // switched off: dimmed, says why; the marks stay
    await page.$eval('#live-narrator', el => el.click()); await sleep(1200);
    g = await ghost(page);
    check(g && g.silent && /spenta/.test(g.nameTip) && g.growSteps === inG.length, 'narrator off: the ghost row stays, dimmed, the tooltip says the narrator is off, the marks stay', g && g.nameTip.split('\n').pop());
    await shot(page, 'fatto-narratore-spento.png');
    await page.$eval('#live-narrator', el => el.click()); await sleep(1200);
    check(!(await ghost(page)).silent, 'narrator on again: the ghost row is not dimmed');
    // the first sound edit: the Narrator track in its place, the same marks; Undo brings the ghost back
    const n0 = (await compose(page)).T.tracks.length;
    await page.evaluate(() => { const d = document.querySelector('#live-narrator-parts details.vs-part'); d.open = true; }); await sleep(200);
    await page.selectOption('#live-narrator-parts [data-vsound-style="narrator"]', 'deep'); await sleep(400);
    const real = await page.evaluate(() => { const rows = [...document.querySelectorAll('#arr-grid .trk-row')], last = rows[rows.length - 1], x = last.querySelector('.xcell.x-grow'); return { ghost: !!document.querySelector('#arr-grid [data-ghost]'), name: last.querySelector('.trk-name').textContent.trim(), flash: last.classList.contains('flash'), grow: x ? [...x.querySelectorAll('.x-step')].length : -1, ticks: x ? x.dataset.ticks : '', secs: [...last.querySelectorAll('.trk-cell.voice')].map(c => c.textContent.trim()) }; });
    const N2 = await nar(), tid = (await compose(page)).T.tracks.find(x => x.type === 'voice');
    check(!real.ghost && /Narrator/.test(real.name) && real.flash && real.ticks === inG.join(',') && JSON.stringify(real.secs) === JSON.stringify(g.secs) && N2.marks.length === N.marks.length && N2.marks.every(x => x.track === (tid && tid.id)), 'first sound edit: the Narrator track takes the ghost row\'s place with the same marks, highlighted', JSON.stringify({ name: real.name, flash: real.flash, ticks: real.grow }));
    await sleep(1400);
    check(!(await page.$('#arr-grid .trk-row.flash')), 'the highlight goes after 1.2 s');
    await page.click('.toast .toast-act'); await sleep(1500);
    check((await compose(page)).T.tracks.length === n0 && !!(await ghost(page)), 'Undo: no narrator track, the ghost row is back');
    await page.evaluate(() => { const d = document.querySelector('#live-narrator-parts details.vs-part'); d.open = false; }); await sleep(200);
    // the timeline view: marks on the lane, aligned, a mark seeks, the lane adds nothing
    await page.click('[data-arr-mode="timeline"]'); await sleep(900);
    g = await ghost(page);
    b = await boxes(page);
    check(g && g.last && JSON.stringify(g.dots) === JSON.stringify(written) && g.growSteps === inG.length && aligned(b), 'timeline view: the ghost row last, a mark per line of the written part, the growth ticks, aligned', `${g && g.dots.join(',')}`);
    const dot = await page.$eval('#arr-grid [data-ghost] [data-nmark]', e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, at: +e.dataset.nmark }; });
    await page.mouse.click(dot.x, dot.y); await sleep(500);
    check((await bars(page)).cue === dot.at, 'timeline view: a mark goes to its line', `bar ${(await bars(page)).cue}, mark ${dot.at}`);
    const lane = await page.$eval('#arr-grid [data-ghost] .n-lane', e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.03, y: r.top + r.height / 2 }; });
    const before = JSON.stringify((await compose(page)).T.tracks);
    await page.mouse.click(lane.x, lane.y); await sleep(500);
    check(JSON.stringify((await compose(page)).T.tracks) === before && written.includes((await bars(page)).cue), 'timeline view: a click on the ghost lane adds no clip and goes to the nearest line', `bar ${(await bars(page)).cue}`);
    await shot(page, 'fatto-narratore-timeline-neon.png');
    await page.click('[data-arr-mode="sections"]'); await sleep(800);
  }

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

  // ---------- following the knob (D7) ----------
  {
    const f0 = await fol(page);
    await key(page, 'Home'); await page.click('#play'); await sleep(2500);
    let f = await fol(page);
    check(f.max <= 1 && f.left === 0 && f.scrolls === f0.scrolls && f.seen, 'follow: the compact arranger fits and never scrolls while playing', `max ${f.max}, left ${f.left}`);
    await page.click('#stop'); await sleep(400);
    await page.click('.grow-eye'); await sleep(600);
    await page.evaluate(() => { document.querySelector('.arr-scroll').scrollLeft = 0; });
    await key(page, 'Home'); await page.click('#play'); await sleep(1500);
    f = await fol(page);
    check(f.max > 50 && f.left === 0 && f.seen && f.on, 'follow: open view, the knob at the start in sight, no scroll', `max ${f.max}, left ${f.left}`);
    // the knob crosses the right edge while it plays: one page turn
    { const p = await page.evaluate(() => { const s = document.querySelector('.arr-scroll').getBoundingClientRect(), r = document.querySelector('#ruler-track').getBoundingClientRect(); return { x: s.left + s.width * .88, y: r.top + r.height / 2 }; });
      const before = (await fol(page)).scrolls;
      await page.mouse.click(p.x, p.y);
      for (let k = 0; k < 40; k++) { await sleep(250); f = await fol(page); if (f.scrolls > before && f.left > 0) break; }
      f = await untilSeen(page);
      check(f.scrolls === before + 1 && f.left > 0 && f.seen, 'follow: crossing the right edge while playing turns one page', `left ${f.left}, ${f.scrolls - before} scroll`); }
    const at = await nearEnd(page, m);
    f = await untilSeen(page);
    check(f.left > 0 && f.seen && !f.held, 'follow: a knob out of sight brings the arranger to it', `bar ${at}, left ${f.left} of ${f.max}`);
    await wheelAway(page);
    const away = await fol(page);
    await sleep(1500);
    f = await fol(page);
    check(away.held && away.left < 50 && !away.seen && near(f.left, away.left, 2) && !f.seen, 'follow: the user\'s scroll holds it, the arranger stays where the user left it', `left ${away.left} then ${f.left}`);
    await sleep(1500);
    f = await untilSeen(page);
    check(f.seen && !f.held && f.left > away.left, 'follow: back on the knob after 3 s without scrolling', `left ${f.left}`);
    await wheelAway(page);
    await key(page, 'ArrowLeft');
    f = await untilSeen(page, 2000);
    check(f.seen && !f.held, 'follow: a seek resumes it at once', JSON.stringify(f));
    // Follow playback off: the arranger stays put
    await page.$eval('#sc-follow', el => { el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await key(page, 'Home'); await sleep(1500);
    f = await fol(page);
    check(!f.on && !f.seen && f.left > 0, 'follow: Follow playback off, the arranger does not scroll to the knob', `left ${f.left}`);
    await page.$eval('#sc-follow', el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    f = await untilSeen(page, 4000);
    check(f.on && f.seen && f.left < 300, 'follow: Follow playback on again, back to the knob', JSON.stringify(f));
    // reduced motion: one jump, no smooth scroll
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => { globalThis.__scrolls = 0; document.querySelector('.arr-scroll').addEventListener('scroll', () => globalThis.__scrolls++); });
    await nearEnd(page, m); await sleep(1200);
    f = await fol(page);
    const n = await page.evaluate(() => globalThis.__scrolls);
    check(f.seen && f.left > 0 && n >= 1 && n <= 3, 'follow: reduced motion jumps to the knob', `${n} scroll events, left ${f.left}`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.click('#stop'); await sleep(400);
    await page.click('.grow-eye'); await sleep(400); await page.click('.grow-eye'); await sleep(600);
    check((await bars(page)).map.view === 'compact', 'follow: back to the compact view');
  }

  // timeline view: same columns
  await page.click('[data-arr-mode="timeline"]'); await sleep(800);
  b = await boxes(page);
  check(aligned(b, 1), 'timeline view: growth column and lanes aligned with the strip', JSON.stringify([b.grow, b.firstCells[0]]));
  await clickRuler(page, '#arr-strip .arr-xcol.x-grow', 0.5);
  check((await bars(page)).cue < m.G, 'timeline view: the ruler seeks into the growth');
  await shot(page, 'fatto-4-timeline-compatta-neon.png');
  // timeline view, open growth: the arranger follows the knob too
  await page.click('.grow-eye'); await sleep(600);
  await page.evaluate(() => { document.querySelector('.arr-scroll').scrollLeft = 0; });
  await key(page, 'Home'); await page.click('#play'); await sleep(1000);
  await nearEnd(page, m);
  { const f = await untilSeen(page); check(f.max > 50 && f.left > 0 && f.seen, 'follow: timeline view, open growth, the arranger follows the knob', `left ${f.left} of ${f.max}`); }
  await page.click('#stop'); await sleep(400);
  await page.click('.grow-eye'); await sleep(400); await page.click('.grow-eye'); await sleep(600);
  // hardware theme: the three views
  await page.evaluate(() => { localStorage.setItem('coding-misk-ui', '"hw"'); localStorage.setItem('coding-misk-arr-mode', '"sections"'); });
  await page.reload(); await page.waitForFunction(() => document.querySelectorAll('#songs [data-song-id]').length > 0, null, { timeout: WAIT });
  await page.click('[data-tab="componi"]');
  await page.waitForFunction(() => { const b = globalThis.codingMiskBars().compose; return !b.pending && b.map.G > 0; }, null, { timeout: WAIT }); await sleep(800);
  check(aligned(await boxes(page)), 'hardware theme: growth column aligned');
  { const g = await ghost(page); check(g && g.last && g.growSteps > 0 && aligned(await boxes(page)), 'hardware theme: the ghost row with its ticks, aligned'); }
  await shot(page, 'fatto-narratore-hw.png');
  await page.click('[data-arr-mode="timeline"]'); await sleep(800); await shot(page, 'fatto-narratore-timeline-hw.png'); await page.click('[data-arr-mode="sections"]'); await sleep(800);
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
  { const g = await ghost(pp); check(g && g.name === 'Narrator' && g.nameFits && g.last, 'phone: the ghost row\'s name Narrator fits its head, aligned', JSON.stringify(g && { fits: g.nameFits }));
    const c = await pp.$eval('#arr-grid [data-ghost] .ncell.x-grow', e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height / 2, ticks: e.dataset.ticks.split(',').map(Number) }; });
    await pp.touchscreen.tap(c.x, c.y); await sleep(600);
    check(c.ticks.includes((await bars(pp)).cue), 'phone: a tap on the ghost growth cell goes to a narrator line', `bar ${(await bars(pp)).cue}`); }
  await shot(pp, 'fatto-narratore-telefono.png');
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
