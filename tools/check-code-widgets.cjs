// Browser checks for the code widgets (code-widgets, #79): off by default; on, the calls in the code and their widgets
// below the lines, scope with its line's instrument, Classic moving at a section boundary without a step, widgets kept
// while the Live coder types, muted lines dimmed, any parameter accepted, the Settings card, frame time.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-code-widgets.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || null;
const URL = `http://localhost:${process.env.PORT || 5173}/`;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const CALL = /\._(scope|pianoroll|punchcard|spectrum|spiral|pitchwheel)\(/g;

async function open(browser, { widgets = null, lang = 'it', ui = 'neon', width = 1440, height = 1000 } = {}) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(([w, l, u]) => {
    if (sessionStorage.getItem('cw-init')) return;
    sessionStorage.setItem('cw-init', '1');
    localStorage.setItem('coding-misk-lang', l); localStorage.setItem('coding-misk-ui', JSON.stringify(u));
    if (w) localStorage.setItem('coding-misk-code-widgets', JSON.stringify(w)); else localStorage.removeItem('coding-misk-code-widgets');
  }, [widgets, lang, ui]);
  await page.goto(URL); await page.waitForFunction(() => document.querySelector('strudel-editor') && document.querySelector('strudel-editor').editor, null, { timeout: 30000 }); await sleep(3500);
  return { page, errors };
}
const st = page => page.evaluate(() => {
  const e = document.querySelector('strudel-editor').editor;
  return { code: e.code, active: e.repl.state.activeCode || '', err: String(e.repl.state.evalError || ''), started: e.repl.scheduler.started, cyc: e.repl.scheduler.now(),
    canvases: [...document.querySelectorAll('#edhost [id*="_widget_"]')].map(c => ({ id: c.id, muted: c.classList.contains('cw-muted') })) };
});
const untilBar = async (page, b) => { for (let k = 0; k < 400 && (await st(page)).cyc < b; k++) await sleep(100); };
const calls = code => (code.match(CALL) || []).length;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1. off by default: the code of before, no widget
  {
    const { page, errors } = await open(browser);
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
    await page.click('#play'); await sleep(3000);
    const s = await st(page);
    check(s.started && !calls(s.code) && !s.canvases.length && !errors.length, 'off by default: no widget call, no widget', errors.join('; '));
    await page.close();
  }

  // 2. on, Classic (luci-rosse): calls and widgets, scope with its instrument, the move at bar 8 (no step there)
  {
    const { page, errors } = await open(browser, { widgets: { on: true } });
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
    await page.click('#play'); await sleep(3500);
    let s = await st(page);
    const n0 = calls(s.code);
    check(s.started && n0 >= 1 && n0 <= 3 && !s.err, 'on: the code carries 1 to 3 widget calls', `${n0} calls, ${s.err}`);
    check(s.canvases.length >= 1 && s.active.includes('._'), 'on: the widgets are drawn below their lines', `${s.canvases.length} widgets`);
    const link = await page.evaluate(() => {
      const e = document.querySelector('strudel-editor').editor, P = e.repl.scheduler.pattern, t = e.repl.scheduler.now(), out = [];
      const haps = P.queryArc(t, t + 1);
      for (const id of Object.getOwnPropertyNames(window.analysers).filter(k => k.includes('_widget__scope'))) {
        const h = haps.find(x => (x.context.tags || []).includes(id)), inst = h && h.value.analyze;
        out.push({ id, inst, same: !!inst && window.analysers[id] === window.analysers[inst], listed: Object.keys(window.analysers).includes(id) });
      }
      return out;
    });
    check(link.length && link.every(x => x.same && x.inst && !x.inst.includes('_widget_') && !x.listed), 'scope keeps the line\'s analyze and draws that instrument, unseen by the stage', JSON.stringify(link));
    const ink = await page.evaluate(() => [...document.querySelectorAll('#edhost canvas[id*="_widget__scope"]')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; }));
    check(ink.some(n => n > 200), 'a scope draws', ink.join(','));
    // bar 8: Pista starts; Classic has no step there, the widgets move with one evaluation
    const before = s.code;
    await untilBar(page, 8.6);
    s = await st(page);
    const lines = s.code.split('\n').filter(l => CALL.test(l) && !(CALL.lastIndex = 0)), bad = lines.filter(l => /mask\(section(\d)\)/.test(l) && !/mask\(section2\)/.test(l));
    check(s.code !== before && lines.length && !bad.length && s.active.includes(lines[0].trim().slice(0, 30)) && !s.err, 'Classic: at a section boundary without a step the widgets move to the new section\'s lines', `${lines.length} lines, ${bad.length} on other sections`);
    check(!errors.length, 'no page errors (Classic)', errors.join('; '));
    if (SHOTS) {
      await page.evaluate(() => { const c = document.querySelector('#edhost [id*="_widget_"]'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(400);
      await page.locator('#edhost').screenshot({ path: `${SHOTS}/code-widgets-neon.png` });
    }
    // frame time with widgets drawing
    const ft = await page.evaluate(() => new Promise(res => { const t = []; let last = performance.now(); const f = now => { t.push(now - last); last = now; if (t.length < 120) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ median: t[60], p95: t[114] }); } }; requestAnimationFrame(f); }));
    check(ft.median < 34, 'frame time with widgets', `median ${ft.median.toFixed(1)} ms, p95 ${ft.p95.toFixed(1)} ms`);
    await page.close();
  }

  // 3. hand code: muted lines dimmed, any parameter accepted, the dimmed look off
  {
    const { page, errors } = await open(browser, { widgets: { on: true } });
    const code = 'setcpm(30)\n_$: s("bd*4")._scope()\n$: note("c3 e3 g3")._pianoroll({ labels: 1, overscan: 1 })\n_$: note("c4 g4")._pianoroll()\n_$: n("0 2")._punchcard()\n_$: s("hh*8")._spectrum()';
    await page.evaluate(c => { const e = document.querySelector('strudel-editor').editor; e.setCode(c); return e.evaluate(); }, code); await sleep(1500);
    let s = await st(page);
    const muted = s.canvases.filter(c => c.muted).map(c => c.id), plain = s.canvases.filter(c => !c.muted).map(c => c.id);
    check(!s.err && s.canvases.length === 5, 'a line with labels and overscan evaluates; every widget drawn', `${s.err} ${s.canvases.length}`);
    check(muted.length === 4 && plain.length === 1 && plain[0].includes('pianoroll'), 'the widgets of muted lines are dimmed, the playing one is not', `muted ${muted.join(',')}`);
    if (SHOTS) await page.locator('#edhost').screenshot({ path: `${SHOTS}/code-widgets-muted.png` });
    await page.evaluate(() => { localStorage.setItem('coding-misk-code-widgets', JSON.stringify({ on: true, dim: false })); return document.querySelector('strudel-editor').editor.evaluate(); }); await sleep(800);
    s = await st(page);
    check(s.canvases.length === 5 && s.canvases.every(c => !c.muted), 'dimmed look off: the muted widgets look as Strudel draws them');
    // a text change without evaluation keeps the widgets of the other lines (range update, D6)
    const kept = await page.evaluate(() => new Promise(res => {
      const e = document.querySelector('strudel-editor').editor, v = e.editor, ln = v.state.doc.line(1);
      v.dispatch({ changes: { from: ln.from, to: ln.to, insert: 'setcpm(31)' } });
      requestAnimationFrame(() => res(document.querySelectorAll('#edhost [id*="_widget_"]').length));
    }));
    check(kept === 5, 'a range change of one line keeps every widget', `${kept}`);
    await page.evaluate(() => document.querySelector('strudel-editor').editor.stop());
    check(!errors.length, 'no page errors (hand code)', errors.join('; '));
    await page.close();
  }

  // 4. Live coder: the widgets stay while a line is typed
  {
    const { page, errors } = await open(browser, { widgets: { on: true, max: 8 } });
    await page.locator('#track-pick').selectOption('switch-prima-luce'); await sleep(800);
    await page.click('#live-profile [data-profile="switch"]', { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('#play-growing:not([hidden])'), null, { timeout: 120000 }).catch(() => {});
    await sleep(1500);
    await page.click('#play'); await sleep(2000);
    // sample the panel: a frame whose code differs from the evaluated code (typing) and carries calls kept from before
    const r = await page.evaluate(() => new Promise(res => {
      const e = document.querySelector('strudel-editor').editor, out = { typed: 0, lost: 0, calls: 0 };
      const t0 = performance.now();
      const f = () => {
        // (the block widgets in the editor's state: CodeMirror draws only the lines in view)
        const v = e.editor, code = e.code, act = e.repl.state.activeCode || '';
        let canv = 0;
        for (const set of v.state.facet(v.constructor.decorations)) if (set && typeof set !== 'function') set.between(0, v.state.doc.length, (a, b, d) => { if (d.spec && d.spec.block && d.spec.widget) canv++; });
        // (a line with a widget call, evaluated and still in the typed text as it was: its widget must be there)
        const evaluated = new Set(act.split('\n').filter(l => /\._\w+\(\)/.test(l))), shared = code.split('\n').filter(l => evaluated.has(l)).length;
        if (code !== act.slice(0, code.length) && shared) { out.typed++; if (canv < shared) out.lost++; }
        out.calls = Math.max(out.calls, (code.match(/\._(scope|pianoroll|punchcard|spectrum)\(\)/g) || []).length);
        if (performance.now() - t0 < 40000) requestAnimationFrame(f); else res(out);
      };
      requestAnimationFrame(f);
    }));
    const s = await st(page);
    check(r.calls >= 1 && r.typed > 20 && r.lost === 0 && !s.err, 'Live coder: widgets stay at every typed frame', JSON.stringify(r));
    if (SHOTS) {
      await page.evaluate(() => { const c = document.querySelector('#edhost [id*="_widget_"]'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(400);
      await page.locator('#edhost').screenshot({ path: `${SHOTS}/code-widgets-live-coder.png` });
    }
    check(!errors.length, 'no page errors (Live coder)', errors.join('; '));
    await page.close();
  }

  // 5. the Settings card, hardware theme and phone width (screenshots)
  {
    const { page, errors } = await open(browser, { widgets: null });
    await page.click('#open-settings'); await sleep(600);
    const card = page.locator('#set-widgets');
    check(await card.count() === 1 && (await card.locator('h3').textContent()) === 'Widget nel codice', 'Settings: the card "Widget nel codice"');
    await card.locator('[data-cw-on="1"]').click(); await sleep(200);
    let S = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-widgets')));
    check(S && S.on === true && S.max === 3 && S.window === 16 && S.share === 25 && S.dim === true && S.widgets.spiral === false && S.instruments.fx.on === false, 'Settings: on, with the defaults stored');
    await page.locator('#set-widgets [data-cw-num="max"]').fill('1'); await page.locator('#set-widgets [data-cw-num="max"]').dispatchEvent('change');
    await page.locator('#set-widgets [data-cw-move="drums"][data-dir="-1"]').click(); await sleep(150);
    S = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-widgets')));
    check(S.max === 1 && S.order.indexOf('drums') === 1, 'Settings: maximum and slot order stored', `${S.max} ${S.order.join(',')}`);
    for (const id of ['muted', 'widgets', 'instruments', 'params', 'sizes']) await page.locator(`#set-widgets [data-cw-sec="${id}"] > summary`).click();
    await sleep(200);
    const opened = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-cw-open')));
    check(opened && opened.length === 6, 'Settings: the open sections are remembered', JSON.stringify(opened));
    await page.locator('#set-widgets [data-cw-widget="spiral"]').check(); await sleep(100);
    S = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-widgets')));
    check(S.widgets.spiral === true, 'Settings: a widget switch stored');
    if (SHOTS) await card.screenshot({ path: `${SHOTS}/settings-card.png` });
    await page.locator('#set-cw-defaults').click(); await sleep(150);
    S = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-widgets')));
    check(S.on === true && S.max === 3 && S.widgets.spiral === false, 'Settings: Defaults keeps the switch and restores the rest');
    check(!errors.length, 'no page errors (Settings)', errors.join('; '));
    await page.close();
  }
  if (SHOTS) {
    // hardware theme and phone width, Classic with widgets
    for (const [name, o] of [['hw', { ui: 'hw' }], ['phone', { width: 390, height: 844 }]]) {
      const { page } = await open(browser, { widgets: { on: true }, ...o });
      await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
      await page.click('#play'); await sleep(4000);
      await page.evaluate(() => { const c = document.querySelector('#edhost [id*="_widget_"]'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(500);
      await page.locator('#edhost').screenshot({ path: `${SHOTS}/code-widgets-${name}.png` });
      if (name === 'phone') await page.screenshot({ path: `${SHOTS}/code-widgets-phone-page.png`, fullPage: false });
      await page.close();
    }
    const p2 = await open(browser, { widgets: { on: true }, width: 390, height: 844 });
    await p2.page.click('#open-settings'); await sleep(600);
    await p2.page.locator('#set-widgets').screenshot({ path: `${SHOTS}/settings-card-phone.png` });
    await p2.page.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
