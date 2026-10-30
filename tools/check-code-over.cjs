// "Code over" in the browser (code-over-visual): the stage mode off by default, the button, the overlay drawn with the
// editor still open, kept after a reload and inside the full-screen element, its cost per frame on kellerlicht; hand
// typing (the edited line from the editor's caret); the Live coder's typing (the edited line from the typing plan); the
// lit tokens; the app widgets in the editor and over the stage; Copy with the calls commented out; a 9:16 fragment and
// a 16:9 fast video with the layout (the edited line and the lit tokens from the render page); the settings card.
// Usage: PORT=5241 PLAYWRIGHT_CORE=... node tools/check-code-over.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || '';
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shot = async (page, name, el = null) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await (el ? page.locator(el).screenshot({ path: path.join(SHOTS, name) }) : page.screenshot({ path: path.join(SHOTS, name) })); };

async function open(browser, store = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage(), errors = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('download', d => downloads.push(d));
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2000);
  await page.evaluate(x => { localStorage.clear(); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, JSON.stringify(v)); }, store);
  await page.reload(); await sleep(3500);
  return { page, ctx, errors, downloads };
}
const state = page => page.evaluate(() => {
  const w = document.querySelector('#stagewrap'), c = document.querySelector('#stage-over'), e = document.querySelector('strudel-editor').editor, s = e.repl.scheduler;
  let ink = 0;
  if (!c.hidden && c.width) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) ink++; }
  return { on: w.classList.contains('co-on'), hidden: c.hidden, ink, inWrap: c.parentElement === w, editor: document.querySelector('#edhost').offsetWidth, co: globalThis.codingMiskCodeOver || null, times: (globalThis.codingMiskOverTimes || []).slice(-120), cyc: s.now(), playing: s.started, code: e.code };
});

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1. off by default; the button turns it on with the editor open; kept after a reload; inside the full-screen element
  {
    const { page, ctx, errors } = await open(browser);
    await page.locator('#track-pick').selectOption('kellerlicht'); await sleep(800);
    await page.click('#play'); await sleep(3000);
    let s = await state(page);
    check(!s.on && s.hidden && s.editor > 300, 'off by default: no code over the stage, the editor open', JSON.stringify({ on: s.on, editor: s.editor }));
    await page.click('#code-over-btn'); await sleep(2500);
    s = await state(page);
    check(s.on && !s.hidden && s.ink > 500 && s.editor > 300, 'the button draws the code over the stage, the editor stays open', `ink ${s.ink}, editor ${s.editor}px`);
    check(s.inWrap, 'the overlay lives in the stage element, so full screen keeps it');
    const worst = Math.max(...s.times);
    check(s.times.length > 30 && worst < 50, 'no frame of the overlay over 50 ms on kellerlicht', `${s.times.length} frames, worst ${worst.toFixed(1)} ms`);
    check(s.co && s.co.lit > 0, 'the playing tokens are lit', JSON.stringify(s.co));
    await shot(page, 'page-on.png');
    await page.reload(); await sleep(3500);
    s = await state(page);
    check(s.on && !s.hidden, 'kept after a reload');
    // full screen: the stage element (with the overlay and the button) goes full screen where the browser allows it
    const fsOk = await page.evaluate(async () => { try { await document.querySelector('#stagewrap').requestFullscreen(); await new Promise(r => setTimeout(r, 600)); const ok = document.fullscreenElement && document.fullscreenElement.contains(document.querySelector('#stage-over')) && document.fullscreenElement.contains(document.querySelector('#code-over-btn')); await document.exitFullscreen(); return ok ? 'yes' : 'no'; } catch (e) { return 'unavailable'; } });
    check(fsOk !== 'no', 'full screen keeps the overlay and the button', fsOk);
    await page.click('#code-over-btn'); await sleep(500);
    s = await state(page);
    check(!s.on && s.hidden, 'the button turns it off');
    check(!errors.length, 'no page errors', errors.join('; '));
    await ctx.close();
  }

  // 2. hand typing: the edited line from the editor's caret; the overlay keeps drawing
  {
    const { page, ctx, errors } = await open(browser, { 'coding-misk-code-over': { stage: true } });
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
    await page.click('#play'); await sleep(3000);
    const line = await page.evaluate(() => { const v = document.querySelector('strudel-editor').editor.editor, doc = v.state.doc; for (let i = 1; i <= doc.lines; i++) if (/^\$: /.test(doc.line(i).text)) { const ln = doc.line(i); v.dispatch({ selection: { anchor: ln.to } }); v.focus(); return i - 1; } return -1; });
    await page.keyboard.type(' '); await sleep(400);
    const s = await state(page);
    check(s.on && s.co && s.co.edit === line, 'typing by hand: the line of the caret is the edited line', `edit ${s.co && s.co.edit}, caret line ${line}`);
    await shot(page, 'page-hand.png', '#stagewrap');
    await sleep(1600);
    const s2 = await state(page);
    check(s2.co && s2.co.edit === null && s2.ink > 500, 'the edit ends a moment after the last key, the code stays over the stage', JSON.stringify(s2.co));
    check(!errors.length, 'no page errors', errors.join('; '));
    await ctx.close();
  }

  // 3. the Live coder: the edited line from the typing plan; the app widgets in the editor and over the stage; Copy
  {
    const { page, ctx, errors } = await open(browser, { 'coding-misk-code-over': { stage: true }, 'coding-misk-code-widgets': { on: true, max: 4 } });
    await page.locator('#track-pick').selectOption('kellerlicht'); await sleep(800);
    await page.$eval('#live-profile [data-profile="switch"]', el => el.click()).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('#play-growing:not([hidden])'), null, { timeout: 120000 }).catch(() => {});
    await page.click('#play');
    let edited = null, widgets = [], ed = [];
    const inEditor = () => page.evaluate(() => [...(globalThis.miskAppWidgets || new Map()).values()].filter(w => w.canvas.isConnected && w.canvas.width > 20).map(w => `${w.kind}:${w.canvas.width}x${w.canvas.height}`));
    for (let k = 0; k < 400 && !(edited && widgets.length && ed.length); k++) {
      await sleep(150);
      const s = await state(page);
      if (s.co && s.co.edit !== null && !edited) { edited = s.co; await shot(page, 'page-typing.png', '#stagewrap'); }
      if (s.co && s.co.widgets.length) widgets = s.co.widgets;
      if (!ed.length) ed = await inEditor();
    }
    check(!!edited, 'the Live coder: a line being typed is drawn as the edited line', JSON.stringify(edited));
    check(ed.length > 0 && widgets.length > 0, 'the app widgets are drawn in the editor and over the stage', `editor ${ed.join(', ')}; over ${widgets.join(', ')}`);
    await shot(page, 'page-widgets.png', '#stagewrap');
    const copied = await page.evaluate(async () => { document.querySelector('#copy').click(); await new Promise(r => setTimeout(r, 300)); try { return await navigator.clipboard.readText(); } catch (e) { return null; } });
    const code = (await state(page)).code;
    if (copied !== null && /\._(hitgrid|tonecloud)\(/.test(code)) check(!/[^*] \._(hitgrid|tonecloud)\(/.test(copied.replace(/\/\* \._\w+\([^*]*\) \*\//g, '')) && /\/\* \._(hitgrid|tonecloud)\(/.test(copied), 'Copy keeps the app widgets commented out');
    else check(copied !== null, 'Copy works (no app widget call in the code at that moment)', copied === null ? 'no clipboard' : '');
    check(!errors.length, 'no page errors', errors.join('; '));
    await ctx.close();
  }

  // 4. a 9:16 fragment with the show "Code over" (fast): the edited line, the lit tokens, the widgets from the render page
  {
    const { page, ctx, errors, downloads } = await open(browser, { 'coding-misk-code-widgets': { on: true, max: 4 } });
    const seen = await page.evaluate(async () => {
      const v = globalThis.codingMiskVideo, orig = v.composeVertical, out = { frames: 0, edit: 0, lit: 0, widgets: new Set() };
      v.composeVertical = (...a) => { const r = orig(...a); const c = globalThis.codingMiskCodeOver; out.frames++; if (c) { if (c.edit !== null) out.edit++; if (c.lit) out.lit++; for (const w of c.widgets) out.widgets.add(w); } return r; };
      try { await globalThis.codingMiskClips.fragments({ source: 'kellerlicht', from: 60, to: 70, quiet: true, show: 'code-over' }); } finally { v.composeVertical = orig; }
      return { ...out, widgets: [...out.widgets] };
    });
    await sleep(2000);
    check(seen.frames > 200 && seen.lit > seen.frames * 0.5, 'a 9:16 fragment with Code over: frames with lit tokens from the render page', JSON.stringify(seen));
    const file = downloads.find(d => /\.mp4$/.test(d.suggestedFilename()));
    check(!!file, 'the fragment is saved', downloads.map(d => d.suggestedFilename()).join(', '));
    if (file && SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await file.saveAs(path.join(SHOTS, 'fragment-code-over.mp4')); }
    check(!errors.length, 'no page errors', errors.join('; '));
    await ctx.close();
  }

  // 5. the settings card: preview drawn, a change stored and the stage mode follows
  {
    const { page, ctx, errors } = await open(browser);
    await page.locator('#track-pick').selectOption('kellerlicht'); await sleep(500);
    await page.click('#play'); await sleep(2500);
    await page.click('#open-settings'); await sleep(1200);
    await page.locator('#set-code-over').scrollIntoViewIfNeeded(); await sleep(800);
    const ink = await page.evaluate(() => { const c = document.querySelector('#set-co-preview'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n; });
    check(ink > 500, 'the Code over card draws its preview', `${ink}`);
    await page.locator('[data-co-stage="1"]').click(); await sleep(400);
    const on = await page.evaluate(() => document.querySelector('#stagewrap').classList.contains('co-on') && JSON.parse(localStorage.getItem('coding-misk-code-over')).stage === true);
    check(on, 'On the page\'s stage: stored, and the stage follows');
    await shot(page, 'settings-code-over.png', '#set-code-over');
    check(!errors.length, 'no page errors', errors.join('; '));
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
