// The Oscilloscope look in the browser (oscilloscope-visual, task 2.6): the menu, the module loaded only when picked, the
// overlays and modes from the Settings card, a reload, and a 9:16 fragment with no frame drawn black; --cost measures it.
// In detail:
//  - the look is in the visual menu and picked from it; its module is not loaded before (no request, not ready);
//  - every overlay and both modes switch from the Settings card without page errors, and the stage changes with them;
//  - a reload keeps the look and the settings;
//  - a 9:16 fragment with the look, exported from a page that never showed it, has a beam from its first frame (the
//    module loaded before the first fast-video frame: no frame drawn black) and frames that are not empty;
//  - the smudged glass (oscilloscope-smudge): the same song draws the same glass again, another song another glass,
//    Smudge 0 draws none; a fragment with a smudged overlay from a fresh page has its masks before the first frame;
//  - the stage panel (oscilloscope-smudge D8): the [Oscilloscope] button only with the look; the panel with every
//    setting; a slider changes the stage on the next frames and the stored value, the Settings card shows it, a card
//    change shows in the open panel; Escape and a click outside close it; the panel never draws into the stage canvas;
//    full screen; 400 px (icon only, the panel inside the stage, scrolling); Italian; light and hardware themes;
//  - with --cost: the look's frame time at 1080p and 4K (median and p95, with the load average), each overlay with the
//    defaults, with Glow 1 on Real oscilloscope and with Smudge and Beam scatter 2 on Smudged graticule.
// Usage: PORT=5420 PLAYWRIGHT_CORE=... node tools/check-oscilloscope.cjs [shots-dir] [--cost] [--no-video|--video-only|--panel-only]
//   (dev server on PORT, default 5173; ffmpeg for the fragment)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), SHOTS = args.find(a => !a.startsWith('--')) || '';
const PANEL_ONLY = args.includes('--panel-only');
const COST = args.includes('--cost'), VIDEO = !args.includes('--no-video') && !PANEL_ONLY, VIDEO_ONLY = args.includes('--video-only');
const PORT = process.env.PORT || 5173, URL0 = `http://localhost:${PORT}/`;
const KEY = 'coding-misk-oscilloscope', OVERLAYS = ['empty', 'graticule', 'smudged', 'smudged-graticule', 'real', 'vector'];
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const load = () => os.loadavg().map(x => x.toFixed(1)).join(' ');
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : NaN; };
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.locator('#stagewrap').screenshot({ path: path.join(SHOTS, name) }); };

async function open(browser, store = {}, viewport = { width: 1400, height: 950 }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage(), errors = [], requests = [], logs = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/visuals\/oscilloscope\.js/.test(r.url())) requests.push(r.url()); });
  page.on('console', m => { if (/oscilloscope/i.test(m.text())) logs.push(m.text()); });
  page.on('download', d => downloads.push(d));
  await page.goto(URL0); await sleep(1500);
  await page.evaluate(s => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, store);
  await page.reload(); await sleep(3000);
  return { ctx, page, errors, requests, logs, downloads };
}
const play = async page => { if (!(await page.evaluate(() => document.querySelector('strudel-editor').editor.repl.scheduler.started))) await page.click('#play'); await sleep(1500); };
// the stage's picture: mean brightness, the share of lit pixels and a signature for comparing two pictures
const picture = page => page.evaluate(() => {
  const c = globalThis.codingMiskVisuals.canvas, w = 96, h = Math.max(1, Math.round(96 * c.height / c.width));
  const o = document.createElement('canvas'); o.width = w; o.height = h;
  const x = o.getContext('2d'); x.drawImage(c, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  let sum = 0, lit = 0; const sig = [];
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += v; if (v > 40) lit++; sig.push(v); }
  return { mean: sum / (w * h), lit: lit / (w * h), sig };
});
const differ = (a, b) => { let n = 0; for (let i = 0; i < Math.min(a.sig.length, b.sig.length); i++) n += Math.abs(a.sig[i] - b.sig[i]); return n / Math.max(1, Math.min(a.sig.length, b.sig.length)); };
const ready = page => page.evaluate(() => !!(globalThis.codingMiskOscReady && globalThis.codingMiskOscReady()));
async function settings(page, open = true) {
  const on = (await page.getAttribute('#open-settings', 'aria-pressed')) === 'true';
  if (on !== open) { await page.click('#open-settings'); await sleep(500); }
}

// the smudged glass per song (oscilloscope-smudge D3, D5) and the stage panel (D8)
async function glassAndPanel(browser) {
  const glassStore = { 'coding-misk-look': 'oscilloscope', [KEY]: { overlay: 'smudged', values: { smudge: 2, scatter: 0, ambient: 1, persistence: 0 }, links: { glow: 'static', hue: 'static' } } };
  const s = await open(browser, glassStore), { page } = s;
  // (a song may bring its own look: the Oscilloscope picked again after each song)
  // (the glass follows the song that played last: each song started and stopped, so the beam lies flat)
  const started = () => page.evaluate(() => document.querySelector('strudel-editor').editor.repl.scheduler.started);
  const settle = async () => { await page.click('#play'); await sleep(1500); if (await started()) await page.click('#play'); await page.selectOption('#looks', 'oscilloscope'); let t = 0; while (!(await ready(page)) && t < 50) { await sleep(100); t++; } await page.locator('#stagewrap').scrollIntoViewIfNeeded(); await sleep(1200); };
  // (stopped: a flat beam, the glass is what changes)
  await page.locator('#track-pick').selectOption('luci-rosse'); await settle();
  const a1 = await picture(page); await sleep(600); const a2 = await picture(page);
  await page.locator('#track-pick').selectOption('kellerlicht'); await settle(); const b = await picture(page);
  await page.locator('#track-pick').selectOption('luci-rosse'); await settle(); const a3 = await picture(page);
  check(differ(a1, a2) < 1 && differ(a1, a3) < 1, 'the same song draws the same glass, on two frames and when it comes back', `${differ(a1, a2).toFixed(2)}, ${differ(a1, a3).toFixed(2)}`);
  check(differ(a1, b) > 0.8, 'another song draws another glass', differ(a1, b).toFixed(2));
  await shot(page, 'glass-luci-rosse.png');
  await page.evaluate(k => { const S = JSON.parse(localStorage.getItem(k)); S.values.smudge = 0; localStorage.setItem(k, JSON.stringify(S)); }, KEY); await sleep(800);
  const none = await picture(page);
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ overlay: 'empty', values: { ambient: 1, persistence: 0 }, links: { glow: 'static', hue: 'static' } })), KEY); await sleep(800);
  const empty = await picture(page);
  check(differ(none, empty) < 1 && differ(a1, none) > 1.5, 'Smudge 0 draws no smudge', `${differ(none, empty).toFixed(2)} from Empty, ${differ(a1, none).toFixed(2)} from Smudge 2`);
  check(!s.errors.length, 'no page errors with the glass', s.errors.join('; '));
  await s.ctx.close();

  // the panel
  const p = await open(browser, { 'coding-misk-look': 'palco', [KEY]: { overlay: 'smudged-graticule' } }), page2 = p.page;
  const visible = sel => page2.evaluate(q => { const e = document.querySelector(q); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }, sel);
  check(!(await visible('#osc-btn')), 'the [Oscilloscope] button is hidden with another look');
  await page2.locator('#track-pick').selectOption('kellerlicht'); await play(page2);
  await page2.selectOption('#looks', 'oscilloscope'); await sleep(1500);
  check(await visible('#osc-btn'), 'the [Oscilloscope] button shows with the look');
  await page2.click('#osc-btn'); await sleep(300);
  const st = await page2.evaluate(() => ({ exp: document.querySelector('#osc-btn').getAttribute('aria-expanded'), vals: [...document.querySelectorAll('#osc-panel [data-osc-val]')].map(i => i.dataset.oscVal), links: document.querySelectorAll('#osc-panel [data-osc-link]').length, ov: !!document.querySelector('#osc-panel [data-osc-opt="overlay"]'), mode: document.querySelectorAll('#osc-panel [data-osc-mode]').length, def: !!document.querySelector('#osc-panel [data-osc-defaults]') }));
  check(await visible('#osc-panel') && st.exp === 'true' && st.vals.length === 14 && st.links === 14 && st.ov && st.mode === 2 && st.def, 'the button opens the panel with every setting', `${st.vals.length} sliders, ${st.links} links, expanded ${st.exp}`);
  // inside the stage, scrolling
  const box = await page2.evaluate(() => { const w = document.querySelector('#stagewrap').getBoundingClientRect(), r = document.querySelector('#osc-panel').getBoundingClientRect(), b = document.querySelector('#osc-panel-body'); return { inside: r.top >= w.top - 1 && r.bottom <= w.bottom + 1 && r.left >= w.left - 1 && r.right <= w.right + 1, scrolls: b.scrollHeight > b.clientHeight && getComputedStyle(b).overflowY === 'auto' }; });
  check(box.inside && box.scrolls, 'the panel stays inside the stage and scrolls', JSON.stringify(box));
  await shot(page2, 'panel-open.png');
  // a slider: the stored value at once, the stage on the next frames, the card shows it
  await page2.evaluate(() => { const S = JSON.parse(localStorage.getItem('coding-misk-oscilloscope')); S.overlay = 'real'; S.values = { ...(S.values || {}), persistence: 0, glow: 0, ambient: 0 }; S.links = { ...(S.links || {}), glow: 'static', ambient: 'static' }; localStorage.setItem('coding-misk-oscilloscope', JSON.stringify(S)); });
  // (Ambient light lights the whole glass: a change the moving beam cannot hide)
  await sleep(400); const before = await picture(page2);
  const t0 = await page2.evaluate(() => new Promise(res => { const r = document.querySelector('#osc-panel [data-osc-val="ambient"]'); r.value = '1'; r.dispatchEvent(new Event('input', { bubbles: true })); const t = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t))); }));
  const after = await picture(page2);
  const stored = await page2.evaluate(k => JSON.parse(localStorage.getItem(k)).values.ambient, KEY);
  check(stored === 1 && after.mean > before.mean + 1, 'a panel slider is stored at once and the stage changes on the next frames', `stored ${stored}, mean ${before.mean.toFixed(1)} → ${after.mean.toFixed(1)} after ${t0.toFixed(0)} ms`);
  const out = await page2.evaluate(() => { const r = document.querySelector('#osc-panel [data-osc-val="intensity"]'); r.value = '10'; r.dispatchEvent(new Event('input', { bubbles: true })); return r.nextElementSibling.textContent; });
  check(out === '10', 'the panel shows the slider\'s value', out);
  // the panel draws nothing into the stage canvas (videos and fragments are drawn from it): paused, open and closed alike
  await page2.click('#play'); await sleep(1200);
  const pOpen = await picture(page2);
  await page2.keyboard.press('Escape'); await sleep(300);
  check(!(await visible('#osc-panel')), 'Escape closes the panel');
  const pShut = await picture(page2);
  check(differ(pOpen, pShut) < 0.5, 'the panel never draws into the stage canvas', differ(pOpen, pShut).toFixed(2));
  // a click outside closes it
  await page2.click('#osc-btn'); await sleep(200);
  await page2.mouse.click(30, 900); await sleep(300);
  check(!(await visible('#osc-panel')), 'a click outside closes the panel');
  // the card shows the panel's change; a card change shows in the open panel
  await settings(page2, true);
  const cardVal = await page2.evaluate(() => document.querySelector('#set-oscilloscope [data-osc-val="intensity"]').value);
  check(cardVal === '10', 'the Settings card shows the value set in the panel', cardVal);
  await page2.evaluate(() => { document.querySelector('#osc-btn').click(); });
  await sleep(200);
  await page2.evaluate(() => { const r = document.querySelector('#set-oscilloscope [data-osc-val="glow"]'); r.value = '0.8'; r.dispatchEvent(new Event('input', { bubbles: true })); const l = document.querySelector('#set-oscilloscope [data-osc-link="noise"]'); l.value = 'kick'; l.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(200);
  const pv = await page2.evaluate(() => ({ glow: document.querySelector('#osc-panel [data-osc-val="glow"]').value, noise: document.querySelector('#osc-panel [data-osc-link="noise"]').value }));
  check(pv.glow === '0.8' && pv.noise === 'kick', 'a change in the Settings card shows in the open panel', JSON.stringify(pv));
  await settings(page2, false);
  // Defaults from the panel
  await page2.evaluate(() => { document.querySelector('#osc-panel [data-osc-defaults]').click(); });
  await sleep(200);
  const dv = await page2.evaluate(k => ({ stored: localStorage.getItem(k), v: document.querySelector('#osc-panel [data-osc-val="intensity"]').value }), KEY);
  check(dv.stored === null && dv.v === '5', 'Defaults in the panel restores the starting values', JSON.stringify(dv));
  // another look hides the button and the panel
  await page2.selectOption('#looks', 'palco'); await sleep(400);
  check(!(await visible('#osc-btn')) && !(await visible('#osc-panel')), 'another look hides the button and closes the panel');
  await page2.selectOption('#looks', 'oscilloscope'); await sleep(800);
  // full screen
  await page2.click('#fs'); await sleep(800);
  const fsOn = await page2.evaluate(() => document.fullscreenElement && document.fullscreenElement.id);
  await page2.click('#osc-btn'); await sleep(300);
  const fsBox = await page2.evaluate(() => { const r = document.querySelector('#osc-panel').getBoundingClientRect(), b = document.querySelector('#osc-panel-body'); return { inside: r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.height > 0, scrolls: b.scrollHeight > b.clientHeight }; });
  check(fsOn === 'stagewrap' && fsBox.inside, 'in full screen the panel shows inside the stage', JSON.stringify({ fs: fsOn, ...fsBox }));
  await shot(page2, 'panel-fullscreen.png');
  await page2.keyboard.press('Escape'); await sleep(300);
  if (await page2.evaluate(() => !!document.fullscreenElement)) { await page2.evaluate(() => document.exitFullscreen()); await sleep(500); }
  // Italian
  await page2.click('[data-lang="it"]'); await sleep(600);
  await page2.click('#osc-btn'); await sleep(300);
  const it = await page2.evaluate(() => ({ btn: document.querySelector('#osc-btn span').textContent, head: document.querySelector('#osc-panel b').textContent, smudge: document.querySelector('#osc-panel [data-osc-val="smudge"]').closest('.set-row').querySelector('.lbl').textContent }));
  check(it.btn === 'Oscilloscopio' && /oscilloscopio/i.test(it.head) && it.smudge === 'Sporco', 'Italian: the button, the panel and its rows', JSON.stringify(it));
  await page2.keyboard.press('Escape');
  await page2.click('[data-lang="en"]'); await sleep(400);
  check(!p.errors.length, 'no page errors with the panel', p.errors.join('; '));
  await p.ctx.close();

  // 400 px: the button is an icon, the panel a sheet inside the stage; light and hardware themes
  for (const [ui, width] of [['neon', 400], ['light', 1400], ['hw', 1400], ['light', 400]]) {
    const q = await open(browser, { 'coding-misk-look': 'oscilloscope', 'coding-misk-ui': ui, [KEY]: { overlay: 'smudged-graticule' } }, { width, height: 860 }), pg = q.page;
    await pg.evaluate(u => { const b = document.querySelector(`[data-uitheme="${u}"]`); if (b) b.click(); }, ui); await sleep(400);
    await pg.locator('#stagewrap').scrollIntoViewIfNeeded(); await pg.click('#osc-btn'); await sleep(300);
    const r = await pg.evaluate(() => {
      const w = document.querySelector('#stagewrap').getBoundingClientRect(), p = document.querySelector('#osc-panel'), pr = p.getBoundingClientRect(), span = document.querySelector('#osc-btn span');
      const lbl = p.querySelector('.set-row .lbl'), cs = getComputedStyle(lbl), bg = getComputedStyle(p).backgroundColor;
      const tools = [...document.querySelectorAll('.hud-row > *')].filter(e => !e.hidden && e.getBoundingClientRect().width).every(e => { const b = e.getBoundingClientRect(); return b.left >= w.left - 1 && b.right <= w.right + 1; });
      return { ui: document.documentElement.dataset.ui, tools, label: getComputedStyle(span).display !== 'none', inside: pr.top >= w.top - 1 && pr.bottom <= w.bottom + 1 && pr.left >= w.left - 1 && pr.right <= w.right + 1, color: cs.color, bg, overflowX: document.documentElement.scrollWidth > innerWidth };
    });
    const ok = r.inside && r.tools && !r.overflowX && (width <= 640 ? !r.label : r.label);
    check(ok, `${ui} at ${width} px: the panel and every toolbar button inside the stage, ${width <= 640 ? 'the button an icon' : 'the button with its label'}, no sideways scroll`, JSON.stringify(r));
    await shot(pg, `panel-${ui}-${width}.png`);
    check(!q.errors.length, `no page errors (${ui}, ${width} px)`, q.errors.join('; '));
    await q.ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1. the menu, the module loaded only when picked
  if (!VIDEO_ONLY && !PANEL_ONLY) {
    const s = await open(browser, { 'coding-misk-look': 'palco' }), { page } = s;
    const listed = await page.evaluate(() => [...document.querySelectorAll('#looks option')].map(o => o.value));
    check(listed.includes('oscilloscope'), 'Oscilloscope is in the visual menu');
    await page.locator('#track-pick').selectOption('kellerlicht'); await sleep(300);
    await page.selectOption('#looks', 'palco');
    await play(page); await sleep(1500);
    check(!s.requests.length && !(await ready(page)), 'the module is not loaded while another look shows', s.requests.join(' '));
    await page.selectOption('#looks', 'oscilloscope');
    let t = 0; while (!(await ready(page)) && t < 50) { await sleep(100); t++; }
    check(await ready(page), 'picked from the menu, the module loads', `${t * 100} ms, ${s.requests.length} request`);
    await sleep(1500);
    const base = await picture(page);
    check(base.lit > 0.002, 'the beam is drawn on the stage', `mean ${base.mean.toFixed(1)}, lit ${(base.lit * 100).toFixed(2)} %`);
    await shot(page, 'osc-real-sweep.png');

    // 2. every overlay and both modes from the Settings card
    await settings(page, true);
    check(await page.isVisible('#set-oscilloscope'), 'the Settings card is shown');
    const pics = {};
    for (const ov of OVERLAYS) {
      await page.selectOption('#set-oscilloscope [data-osc-opt="overlay"]', ov); await sleep(700);
      const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').overlay, KEY);
      pics[ov] = await picture(page);
      check(stored === ov && pics[ov].mean > 0.5, `overlay ${ov}: stored and drawn`, `mean ${pics[ov].mean.toFixed(1)}`);
      await shot(page, `osc-${ov}.png`);
    }
    const pairs = [['empty', 'graticule'], ['graticule', 'real'], ['real', 'vector'], ['smudged', 'empty']].map(([a, b]) => [a, b, differ(pics[a], pics[b])]);
    check(pairs.every(p => p[2] > 0.3), 'the overlays draw different screens', pairs.map(p => `${p[0]}/${p[1]} ${p[2].toFixed(1)}`).join(', '));
    // (the modes on Real oscilloscope: the Vector display's tube is dark)
    await page.selectOption('#set-oscilloscope [data-osc-opt="overlay"]', 'real'); await sleep(500);
    const modes = {};
    for (const m of ['xy', 'sweep']) {
      // (the stage scrolled back into view: a stage out of sight is not drawn)
      // (and waited for until it draws again: two pictures apart in time differ while a song plays)
      await page.click(`#set-oscilloscope [data-osc-mode="${m}"]`); await page.locator('#stagewrap').scrollIntoViewIfNeeded(); await sleep(1200);
      for (let i = 0, prev = await picture(page); i < 20; i++) { await sleep(250); const cur = await picture(page); if (differ(prev, cur) > 0.05) break; prev = cur; }
      await sleep(600);
      const st = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').mode, KEY), p = modes[m] = await picture(page);
      check(st === m && p.lit > 0.002, `mode ${m}: stored and the beam drawn`, `lit ${(p.lit * 100).toFixed(2)} %`);
      if (m === 'xy') await shot(page, 'osc-xy.png');
    }
    check(differ(modes.xy, modes.sweep) > 0.3, 'XY and Sweep draw different beams', differ(modes.xy, modes.sweep).toFixed(1));
    // a slider and a link: the stored value follows
    await page.evaluate(() => { const r = document.querySelector('#set-oscilloscope [data-osc-val="hue"]'); r.value = '30'; r.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.selectOption('#set-oscilloscope [data-osc-link="glow"]', 'bar'); await sleep(600);
    const S = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
    check(S.values && S.values.hue === 30 && S.links && S.links.glow === 'bar', 'a slider and a link are stored', JSON.stringify({ hue: S.values && S.values.hue, glow: S.links && S.links.glow }));
    await page.selectOption('#set-oscilloscope [data-osc-opt="overlay"]', 'vector'); await sleep(300);
    await settings(page, false);
    check(!s.errors.length, 'no page errors while switching overlays and modes', s.errors.join('; '));

    // 3. a reload keeps the look and the settings
    await page.reload(); await sleep(3500);
    const kept = await page.evaluate(k => ({ look: document.querySelector('#looks').value, S: JSON.parse(localStorage.getItem(k) || '{}') }), KEY);
    check(kept.look === 'oscilloscope' && kept.S.overlay === 'vector' && kept.S.mode === 'sweep' && kept.S.values.hue === 30 && kept.S.links.glow === 'bar', 'a reload keeps the look and the settings', JSON.stringify({ look: kept.look, overlay: kept.S.overlay, mode: kept.S.mode }));
    await settings(page, true);
    const card = await page.evaluate(() => ({ ov: document.querySelector('#set-oscilloscope [data-osc-opt="overlay"]').value, hue: document.querySelector('#set-oscilloscope [data-osc-val="hue"]').value }));
    check(card.ov === 'vector' && card.hue === '30', 'the card shows the kept settings after the reload', JSON.stringify(card));
    await settings(page, false);

    // 4. cost (--cost): frame time at 1080p and 4K
    if (COST) {
      await page.locator('#track-pick').selectOption('kellerlicht'); await sleep(300); await page.selectOption('#looks', 'oscilloscope');
      await play(page);
      const rows = [];
      const measure = async (label, store, size) => {
        await page.evaluate(([k, v, size]) => { localStorage.setItem(k, JSON.stringify(v)); globalThis.codingMiskOscFlush = true; globalThis.codingMiskVisuals.setTarget(size); }, [KEY, store, size]);
        await sleep(1000); await page.evaluate(() => { globalThis.codingMiskOscTimes.length = 0; });
        await sleep(4000);
        const tt = await page.evaluate(() => globalThis.codingMiskOscTimes.slice());
        rows.push({ label, size: `${size.w}×${size.h}`, frames: tt.length, median: +median(tt).toFixed(2), p95: +p95(tt).toFixed(2), load: load() });
        console.log(`      ${label} at ${size.w}×${size.h}: median ${median(tt).toFixed(2)} ms, p95 ${p95(tt).toFixed(2)} ms over ${tt.length} frames, load ${load()}`);
      };
      for (const size of [{ w: 1920, h: 1080 }, { w: 3840, h: 2160 }]) {
        for (const ov of OVERLAYS) await measure(`${ov}, defaults`, { overlay: ov }, size);
        await measure('real, Glow 1', { overlay: 'real', values: { glow: 1 }, links: { glow: 'static' } }, size);
        await measure('real, XY, Glow 1', { overlay: 'real', mode: 'xy', values: { glow: 1 }, links: { glow: 'static' } }, size);
        await measure('smudged-graticule, Smudge 2, Beam scatter 2', { overlay: 'smudged-graticule', values: { smudge: 2, scatter: 2 } }, size);
      }
      const cdp = await s.ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await measure('real, Glow 1, CPU slowed 4×', { overlay: 'real', values: { glow: 1 }, links: { glow: 'static' } }, { w: 1920, h: 1080 });
      await measure('smudged-graticule, Smudge 2, Beam scatter 2, CPU slowed 4×', { overlay: 'smudged-graticule', values: { smudge: 2, scatter: 2 } }, { w: 1920, h: 1080 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.evaluate(() => globalThis.codingMiskVisuals.setTarget(null));
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'osc-cost.json'), JSON.stringify(rows, null, 2));
    }
    await s.ctx.close();
  }

  // 4b. the smudged glass per song, and the stage panel
  if (!VIDEO_ONLY) await glassAndPanel(browser);

  // 5. a 9:16 fragment with the look, from a page that never showed it: a beam from the first frame (with a smudged
  // overlay: the glass's masks loaded before it too)
  if (VIDEO) {
    const s = await open(browser, { 'coding-misk-look': 'palco', 'coding-misk-export-speed': 'fast', 'coding-misk-export-format': 'wav', [KEY]: { overlay: 'smudged-graticule' } }), { page } = s;
    check(!(await ready(page)), 'the fragment\'s page has not loaded the module before the export');
    await page.evaluate(o => globalThis.codingMiskClips.fragments(o), { source: 'kellerlicht', quiet: true, render: 'normal', from: 30, to: 34, look: 'oscilloscope' });
    let d = null;
    for (let i = 0; i < 600 && !d; i++) { d = s.downloads.find(x => /fragment \d+\.mp4$/.test(x.suggestedFilename())); if (!d) await sleep(500); }
    check(!!d, 'the fragment with the Oscilloscope look is saved');
    if (d) {
      const f = path.join(os.tmpdir(), `osc-frag-${Date.now()}.mp4`); await d.saveAs(f);
      // (the picture's band of the 9:16 frame, as check-stage-video.cjs: the label and the code are elsewhere)
      const band = t => execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', f, '-frames:v', '1', '-vf', 'crop=iw:ih*0.34:0:ih*0.32,scale=48:32', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
      const lit = b => { let n = 0; for (let i = 0; i < b.length; i += 3) if ((b[i] + b[i + 1] + b[i + 2]) / 3 > 40) n++; return n / (b.length / 3); };
      // (the first second carries the fragment's intro text over the stage: the frames after it)
      const later = [1.5, 2.5, 3.5].map(t => lit(band(t))), black = await page.evaluate(() => globalThis.codingMiskOscBlack || 0);
      check(black === 0, 'no frame of the fragment drawn black while the module loads (loaded before the first frame)', `${black} black frames`);
      const bare = await page.evaluate(() => globalThis.codingMiskOscGlassMissing || 0);
      check(bare === 0, 'no frame of the fragment drawn without its smudges (the masks loaded before the first frame)', `${bare} frames`);
      check(later.every(x => x > 0.004), 'the fragment\'s frames are not empty', later.map(x => `${(x * 100).toFixed(2)} %`).join(', '));
      check(s.logs.some(l => /loaded before the first frame/.test(l)), 'the export says the module was loaded first', s.logs.slice(-2).join(' | '));
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '2', '-i', f, '-frames:v', '1', path.join(SHOTS, 'osc-fragment.png')]); }
      fs.rmSync(f, { force: true });
    }
    // (--cost: the same fragment with Palco and with the look, the export time and the load average)
    if (COST) {
      const times = {};
      for (const look of ['palco', 'oscilloscope', 'palco', 'oscilloscope']) {
        const t0 = Date.now();
        await page.evaluate(o => globalThis.codingMiskClips.fragments(o), { source: 'kellerlicht', quiet: true, render: 'normal', from: 30, to: 38, look });
        let got = null;
        for (let i = 0; i < 600 && !got; i++) { got = s.downloads.find(x => /fragment \d+\.mp4$/.test(x.suggestedFilename())); if (!got) await sleep(250); }
        if (got) s.downloads.splice(s.downloads.indexOf(got), 1);
        (times[look] = times[look] || []).push((Date.now() - t0) / 1000);
      }
      const best = k => Math.min(...times[k]);
      console.log(`      fragment of 8 s at 1080×1920: Palco ${best('palco').toFixed(1)} s, Oscilloscope ${best('oscilloscope').toFixed(1)} s (${(best('oscilloscope') / best('palco')).toFixed(2)}×, best of two), load ${load()}`);
    }
    check(!s.errors.length, 'no page errors in the export', s.errors.join('; '));
    await s.ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
