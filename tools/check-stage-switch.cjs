// The stage's widget panels after a song change (#82, owner test gx1), in the browser: Monitor chooses the panels of
// each section again for the new song, so
//  - a song switched to while another plays shows the same panels and hit grid rows as the song played on its own
//    (no panel kept from the song before, no hit grid with the earlier song's rows);
//  - a song that opens without drums (Breve) after a song with drums has no hit grid panel while no drum plays, so no
//    empty space is kept for it;
//  - a song with drums switched to after Breve gets its hit grid within a few seconds.
// The live note store and its caches (panels per section, rows seen) belonged to the source of notes, not to the song:
// the panels of a section were kept once its notes were known, so the next song's section kept the earlier song's.
// Usage: PORT=5314 PLAYWRIGHT_CORE=... node tools/check-stage-switch.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || '';
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
// (luci-rosse and kellerlicht play drums from their first bar; Breve opens on a typed line without drums)
const DRUMS_A = 'luci-rosse', DRUMS_B = 'kellerlicht', NO_DRUMS = 'switch-test-breve';

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2000);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-look', JSON.stringify('monitor')); });
  await page.reload(); await sleep(3500);
  return { page, ctx, errors };
}
// pick a song (playing on when the player plays) and keep Monitor (a song may bring its own look)
async function pick(page, id) {
  await page.locator('#track-pick').selectOption(id); await sleep(300);
  await page.locator('#looks').selectOption('monitor'); await sleep(200);
}
// the panels of Monitor and the hit grid's rows, sampled for a while: [{ t, cyc, panels, grids: [rows] }]
async function watch(page, seconds, every = 250) {
  const out = [], t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    const f = await page.evaluate(() => {
      const s = document.querySelector('strudel-editor').editor.repl.scheduler;
      return { cyc: s && s.now ? s.now() : 0, panels: (globalThis.codingMiskStagePanels || []).map(p => p.replace(/:quiet$/, '')), grids: (globalThis.codingMiskStageApps || []).filter(a => a.kind === 'hitgrid').map(a => a.rows) };
    });
    out.push({ t: (Date.now() - t0) / 1000, ...f });
    await sleep(every);
  }
  return out;
}
const sig = f => `${[...f.panels].sort().join(' ')}|${f.grids.join(',')}`;
const hasGrid = f => f.panels.some(p => p.endsWith(':hitgrid'));
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.locator('#stagewrap').screenshot({ path: path.join(SHOTS, name) }); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

  // each song played on its own: what Monitor shows over its first seconds
  const alone = {};
  for (const id of [DRUMS_B, NO_DRUMS]) {
    const s = await open(browser);
    await pick(s.page, id); await s.page.click('#play');
    alone[id] = await watch(s.page, 6);
    check(!s.errors.length, `${id} on its own: no page errors`, s.errors.join('; '));
    await s.ctx.close();
  }
  const steady = alone[DRUMS_B].filter(f => f.t > 2.5 && f.panels.length);
  check(steady.length > 5 && steady.every(hasGrid), `${DRUMS_B} on its own: a hit grid panel from its first bars`, steady.length ? sig(steady[steady.length - 1]) : 'no panels');
  check(!alone[NO_DRUMS].some(hasGrid), `${NO_DRUMS} on its own: no hit grid panel while no drum plays`);

  // one page: a song with drums, then Breve, then another song with drums, switched while playing
  const s = await open(browser);
  await pick(s.page, DRUMS_A); await s.page.click('#play');
  const a = await watch(s.page, 6);
  check(a.some(hasGrid), `${DRUMS_A}: a hit grid panel`, a.length ? sig(a[a.length - 1]) : '');
  await pick(s.page, NO_DRUMS);
  const b = await watch(s.page, 8);
  await shot(s.page, 'breve-after-drums.png');
  const late = b.filter(f => f.t > 1.5);
  check(late.length > 10 && !late.some(hasGrid), `${NO_DRUMS} after ${DRUMS_A}: no hit grid panel kept from the song before`, `panels seen: ${[...new Set(late.map(sig))].join(' / ') || 'none'}`);
  check(!b.some(f => f.grids.includes(0)), `${NO_DRUMS} after ${DRUMS_A}: never an empty hit grid (no rows)`);
  await pick(s.page, DRUMS_B);
  const c = await watch(s.page, 8);
  await shot(s.page, 'drums-after-breve.png');
  const want = steady.length ? sig(steady[steady.length - 1]) : null, after = c.filter(f => f.t > 3);
  check(after.length > 10 && after.every(hasGrid), `${DRUMS_B} after ${NO_DRUMS}: the hit grid panel within 3 s`, `panels seen: ${[...new Set(after.map(sig))].join(' / ') || 'none'}`);
  check(want !== null && after.length && sig(after[after.length - 1]) === want, `${DRUMS_B} after two songs: the same panels and hit grid rows as on its own`, `${after.length ? sig(after[after.length - 1]) : 'none'} against ${want}`);
  check(!s.errors.length, 'no page errors', s.errors.join('; '));
  await s.ctx.close();

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
