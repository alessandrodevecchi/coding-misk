// Browser checks for the fixes after the owner's tests of v0.6.0-beta.2 (#76): the New row of the Patterns tab and
// the tempo that follows the slider, the shape of a composed melody, "Song harmony" with its hint and "This song" in
// the radio export. Dev server on PORT (default 5173). Usage: PORT=5191 node tools/check-test-fixes.cjs [shots-dir]
const { chromium } = require(process.env.PLAYWRIGHT_CORE);
const path = require('path'); const shots = process.argv[2];
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://localhost:${process.env.PORT || 5173}`); await page.waitForTimeout(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-panel', JSON.stringify('one')); }); await page.reload(); await page.waitForTimeout(3000);
  const out = {};
  // patterns: New heading, tempo while dragging
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="pattern"]'); await page.waitForTimeout(800);
  await page.fill('.pn-search', 'rumble'); await page.waitForTimeout(400); await (await page.$('[data-pn-sel]')).click(); await page.waitForTimeout(400);
  out.newHead = await page.evaluate(() => (document.querySelector('.pn-gen-head') || {}).textContent);
  out.addBtn = await page.evaluate(() => (document.querySelector('[data-pn-add]') || {}).textContent);
  await page.click('[data-pn-toggle]'); await page.waitForTimeout(2000);
  const cps = () => page.evaluate(() => document.querySelector('strudel-editor').editor.repl.scheduler.cps);
  out.cps0 = await cps();
  await page.evaluate(() => { const el = document.querySelector('[data-pn-cfg="bpm"]'); el.value = 100; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(2500); out.cpsWhileDragging = await cps();
  if (shots) { const el = await page.$('.pn-detail'); await el.screenshot({ path: path.join(shots, 'pattern-new-row.png') }); }
  await page.click('[data-pn-toggle]');
  // compose: composed melody shape
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await page.waitForTimeout(800);
  await page.selectOption('#track-pick', 'luci-rosse'); await page.waitForTimeout(1200);
  const idx = await page.evaluate(() => [...document.querySelectorAll("#arr-grid [data-trk]")].map(x => ({ i: x.dataset.trk, t: x.textContent })));
  const pick = idx.find(x => /hook|lead|melod|arp/i.test(x.t)) || idx[0]; out.track = pick && pick.t;
  await page.click(`#arr-grid [data-trk="${pick.i}"]`); await page.waitForTimeout(600);
  const ep = await page.$(`[data-ptrk="${pick.i}"] [data-edit-pat]`); if (ep) { await ep.click(); await page.waitForTimeout(500); }
  out.composeBtn = !!(await page.$(`[data-ptrk="${pick.i}"] [id$="pt-compose"]`));
  const shapes = [];
  for (let i = 0; i < 6 && await page.$(`[data-ptrk="${pick.i}"] [id$="pt-compose"]`); i++) { await page.click(`[data-ptrk="${pick.i}"] [id$="pt-compose"]`); await page.waitForTimeout(500); shapes.push(await page.evaluate(() => { const h = document.querySelector(".tp-host[aria-current=\"true\"]") || document; const c = h.querySelector("[data-edit-pat][aria-pressed=\"true\"]"); return [c ? c.title : null, (document.querySelector(".toast") || {}).textContent]; })); }
  out.shapes = shapes;
  if (shots) { const el = await page.$(`[data-ptrk="${pick.i}"] [id$="pt-compose"]`); if (el) { await el.scrollIntoViewIfNeeded(); const box = await el.evaluate(n => { const r = n.closest('.card, section, fieldset').getBoundingClientRect(); return { x: Math.max(0, r.left), y: r.top + scrollY, width: Math.min(1440, r.width), height: Math.min(500, r.height) }; }); await page.screenshot({ path: shots + '/compose-shape.png', fullPage: true, clip: box }); } }
  // radio: This song and Song harmony
  await page.click('[data-tab="radio"]').catch(() => {}); await page.waitForTimeout(800);
  await page.click('#radio-start').catch(() => {}); await page.waitForTimeout(6000);
  out.harmony = await page.evaluate(() => { const l = [...document.querySelectorAll('.steer-group .lbl')].find(x => x.title); return l ? [l.textContent, l.title] : null; });
  const ex = await page.$('#radio-export'); if (ex) { await ex.click(); await page.waitForTimeout(400); out.exportOpts = await page.evaluate(() => [...document.querySelectorAll('.rx-opt')].map(x => x.textContent.trim().slice(0, 50))); if (shots) { const m = await page.$('.radio-export-menu'); if (m) await m.screenshot({ path: shots + '/export-this-song.png' }); } }
  out.errors = errs.slice(0, 3);
  const checks = [
    [/New pattern/.test(out.newHead || '') && /only shape New/.test(out.newHead || ''), 'Patterns: New pattern heading and hint'],
    [out.cpsWhileDragging !== out.cps0, `Patterns: the tempo follows the slider (${out.cps0} → ${out.cpsWhileDragging})`],
    [out.composeBtn && out.shapes.length && out.shapes.every(([tip, msg]) => /Composed melody: /.test(tip || '') && / · /.test(msg || '')), 'Compose: the composed melody says its shape'],
    [out.harmony && out.harmony[0] === 'Song harmony' && /every part with notes/.test(out.harmony[1]), 'Radio: Song harmony with its hint'],
    [(out.exportOpts || []).some(x => /^This song \(/.test(x)), 'Radio export: This song'],
    [!out.errors.length, `no page errors ${out.errors.join(' | ')}`],
  ];
  let failed = 0;
  for (const [ok, name] of checks) { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`); }
  console.log(failed ? `\n${failed} failed` : '\nall ok');
  await b.close(); process.exit(failed ? 1 : 0);
})();
