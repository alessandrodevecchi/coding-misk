// Where the code widgets go (owner decisions of 2026-10-31, code-over-visual cd1 and cd5), in the browser:
//  - the hit grid shows every row the song will use from the first bar, empty until its sound enters, so it keeps its size
//    (Settings → Code widgets → App widgets → Hit grid → Rows: All of the song / Only the sounds playing), in the editor,
//    over the stage and in the fast video's frames;
//  - at most one tone cloud on screen at a time, on three built-in songs: one with a pad, one without, one with a voice line.
// Usage: PORT=5255 PLAYWRIGHT_CORE=... node tools/check-widget-placement.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || '';
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const PAD = 'luci-rosse', NO_PAD = 'prova-breakbeat', VOICE = 'switch-test-breve';
const CW = { on: true, max: 8 };

async function open(browser, store = {}, theme = null) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2000);
  await page.evaluate(x => { localStorage.clear(); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, JSON.stringify(v)); }, store);
  await page.reload(); await sleep(3500);
  if (theme) { await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme); }
  return { page, ctx, errors };
}
// what is on screen now: the app widgets of the editor (kind, size, shown), and over the stage (kinds, rows of the hit grid)
const frame = page => page.evaluate(() => {
  const reg = [...(globalThis.miskAppWidgets || new Map()).values()].filter(w => w.canvas.isConnected && w.canvas.style.display !== 'none' && w.canvas.width > 20);
  const co = globalThis.codingMiskCodeOver || null, s = document.querySelector('strudel-editor').editor.repl.scheduler;
  return { editor: reg.map(w => ({ kind: w.kind, h: w.canvas.style.height })), over: co ? co.widgets : [], hitRows: co ? co.hitRows : [], cyc: s && s.now ? s.now() : 0 };
});
// samples for a while: the most tone clouds seen at once (editor and over the stage), the heights of the hit grid
async function watch(page, seconds, every = 250) {
  const out = { n: 0, clouds: 0, grids: new Set(), rows: [], first: null, scope: 0 };
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const f = await frame(page);
    out.n++;
    out.clouds = Math.max(out.clouds, f.editor.filter(w => w.kind === 'tonecloud').length, f.over.filter(k => k === 'tonecloud').length);
    for (const w of f.editor) if (w.kind === 'hitgrid') out.grids.add(w.h);
    if (f.hitRows && f.hitRows.length) { out.rows.push(f.hitRows[0]); if (!out.first) out.first = f; }
    await sleep(every);
  }
  return out;
}
async function playSong(page, id, shot = null) {
  await page.locator('#track-pick').selectOption(id); await sleep(800);
  await page.click('#play'); await sleep(600);
}
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name) }); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1. the hit grid keeps its rows (cd1) and one tone cloud at most (cd5), on three songs, in the editor and over the stage
  for (const [id, label] of [[PAD, 'with a pad'], [NO_PAD, 'without a pad'], [VOICE, 'with a voice line']]) {
    const song = await open(browser, { 'coding-misk-code-over': { stage: true }, 'coding-misk-code-widgets': CW });
    await playSong(song.page, id);
    const w = await watch(song.page, 22);
    check(w.n > 40 && w.clouds <= 1, `${id} (${label}): never two tone clouds at once`, `${w.n} frames, most ${w.clouds}`);
    check(w.rows.length > 20 && Math.min(...w.rows) === Math.max(...w.rows), `${id}: the hit grid has the same rows in every frame from the first`, `rows ${[...new Set(w.rows)]}`);
    check(w.grids.size <= 1, `${id}: the hit grid in the editor keeps its height`, [...w.grids].join(', '));
    check(!song.errors.length, `${id}: no page errors`, song.errors.join('; '));
    await song.ctx.close();
  }

  // 1b. every line asks for the tone cloud (each instrument's primary): one is drawn, never more
  {
    const cloudy = { ...CW, instruments: Object.fromEntries(['pad', 'bass', 'lead', 'arp', 'voice'].map(k => [k, { on: true, primary: 'tonecloud', secondary: ['scope'] }])), share: 0 };
    for (const id of [PAD, NO_PAD]) {
      const song = await open(browser, { 'coding-misk-code-over': { stage: true }, 'coding-misk-code-widgets': cloudy });
      await playSong(song.page, id);
      const w = await watch(song.page, 14);
      // (how many widgets a section gets is drawn by the seed: a song without a pad may get none, never two)
      check(id === PAD ? w.clouds === 1 : w.clouds <= 1, `${id}: with every line asking for the tone cloud, ${id === PAD ? 'exactly one is drawn' : 'never more than one'}`, `most ${w.clouds}`);
      await song.ctx.close();
    }
  }

  // 2. the old setting: only the sounds playing, so fewer rows at the start of a song with later drum sounds
  {
    const base = { 'coding-misk-code-over': { stage: true }, 'coding-misk-code-widgets': CW };
    const all = await open(browser, base);
    await playSong(all.page, PAD);
    const a = await watch(all.page, 6);
    await all.ctx.close();
    const old = await open(browser, { ...base, 'coding-misk-app-widgets': { hitgrid: { rowsFrom: 'playing' } } });
    await playSong(old.page, PAD);
    const o = await watch(old.page, 6);
    await old.ctx.close();
    check(a.rows.length > 5 && o.rows.length > 5 && a.rows[0] > o.rows[0], `${PAD} at bar 1: more rows with "All of the song" than with "Only the sounds playing"`, `${a.rows[0]} against ${o.rows[0]}`);
    check(Math.min(...a.rows) === Math.max(...a.rows) && a.rows[0] >= 4, 'All of the song: the rows do not change', `rows ${[...new Set(a.rows)]}`);
  }

  // 3. the fast video's frames (a 9:16 fragment from the start of two songs): the same rows from the first frame, one cloud
  for (const id of [PAD, NO_PAD]) {
    const { page, ctx, errors } = await open(browser, { 'coding-misk-code-widgets': CW });
    const seen = await page.evaluate(async song => {
      const v = globalThis.codingMiskVideo, orig = v.composeVertical, out = { frames: 0, rows: [], clouds: 0, firstRows: null };
      v.composeVertical = (...a) => {
        const r = orig(...a), c = globalThis.codingMiskCodeOver;
        out.frames++;
        if (c) { out.clouds = Math.max(out.clouds, c.widgets.filter(k => k === 'tonecloud').length); if (c.hitRows && c.hitRows.length) { out.rows.push(c.hitRows[0]); if (out.firstRows === null) out.firstRows = c.hitRows[0]; } }
        return r;
      };
      try { await globalThis.codingMiskClips.fragments({ source: song, from: 0, to: 8, quiet: true, show: 'code-over' }); } finally { v.composeVertical = orig; }
      return out;
    }, id);
    await sleep(1500);
    check(seen.frames > 100 && seen.rows.length > 50 && Math.min(...seen.rows) === Math.max(...seen.rows), `${id}: the fast video draws the hit grid with the same rows in every frame`, `${seen.frames} frames, rows ${[...new Set(seen.rows)]}`);
    check(seen.clouds <= 1, `${id}: the fast video never draws two tone clouds`, `most ${seen.clouds}`);
    check(!errors.length, `${id}: no page errors`, errors.join('; '));
    await ctx.close();
  }

  // 4. the settings card: Rows in the Hit grid, in both languages, stored
  {
    const { page, ctx, errors } = await open(browser, { 'coding-misk-code-widgets': CW });
    await page.click('#open-settings'); await sleep(1200);
    await page.locator('#set-widgets').scrollIntoViewIfNeeded();
    await page.evaluate(() => { const d = document.querySelector('[data-cw-sec="app"]'); if (d) d.open = true; });
    await sleep(500);
    const labels = await page.evaluate(() => { const w = document.querySelector('[data-aw="hitgrid"]'); return w ? w.innerText : ''; });
    check(/rows/i.test(labels) && /all of the song/i.test(labels) && /only the sounds playing/i.test(labels), 'Hit grid → Rows: "All of the song" and "Only the sounds playing"', labels.replace(/\s+/g, ' ').slice(0, 120));
    const def = await page.evaluate(() => { const b = document.querySelector('[data-aw-seg="hitgrid:rowsFrom"][data-v="song"]'); return b ? b.getAttribute('aria-pressed') : null; });
    check(def === 'true', '"All of the song" is the default', String(def));
    await page.locator('[data-aw-seg="hitgrid:rowsFrom"][data-v="playing"]').click(); await sleep(500);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-app-widgets') || '{}').hitgrid);
    check(stored && stored.rowsFrom === 'playing', 'the choice is stored', JSON.stringify(stored));
    await page.click('#tab-impostazioni [data-set-lang="it"]'); await sleep(1200);
    await page.evaluate(() => { const d = document.querySelector('[data-cw-sec="app"]'); if (d) d.open = true; });
    await sleep(500);
    const it = await page.evaluate(() => { const w = document.querySelector('[data-aw="hitgrid"]'); return w ? w.innerText : ''; });
    check(/righe/i.test(it) && /tutte quelle del brano/i.test(it) && /solo i suoni che suonano/i.test(it), 'in Italian: Righe, Tutte quelle del brano, Solo i suoni che suonano', it.replace(/\s+/g, ' ').slice(0, 120));
    check(!errors.length, 'no page errors', errors.join('; '));
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
