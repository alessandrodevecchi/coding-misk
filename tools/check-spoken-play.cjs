// Voice instrument in the browser (voice-instrument, #39): the example song plays every section without an evaluation
// error, its spoken lines are heard on the fx analyser below clipping, and with no spoken samples on the machine (the
// samples manifest without the say_ banks, as when public/samples/say_* is missing) the song plays without errors and
// without spoken lines. Screenshots of the voice instrument's panel go to the shots directory.
// Usage: PLAYWRIGHT_CORE=... node tools/check-spoken-play.cjs [shots-dir] [song-id]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || null, ID = process.argv[3] || 'example-voices';
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const song = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'songs', 'examples', '06-voices.json'), 'utf8'));

async function open(browser, { noSamples = false } = {}) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (noSamples) await page.route('**/samples/strudel.json', async r => { const res = await r.fetch(), list = await res.json(); r.fulfill({ json: Object.fromEntries(Object.entries(list).filter(([k]) => !/^say_/.test(k))) }); });
  await page.goto('http://localhost:5173/', { timeout: 120000 }); await sleep(6000);
  await page.evaluate(() => localStorage.clear()); await page.reload({ timeout: 120000 }); await sleep(6000);
  for (let k = 0; k < 20; k++) { await page.locator('#track-pick').selectOption(ID); await sleep(500); if (await page.locator('#sc-name').inputValue() === song.sections[0].name) break; }
  return { page, errors };
}
// plays section i in a loop and returns the fx peak over `seconds`, and the evaluation error
async function measure(page, i, seconds) {
  for (let k = 0; k < 6; k++) { try { await page.click(`[data-scene-i="${i}"]`, { timeout: 2000 }); break; } catch { await sleep(500); } }
  await sleep(300);
  return page.evaluate(async ms => {
    const ed = document.querySelector('strudel-editor').editor, mx = {};
    for (let t = 0; t < ms; t += 50) { for (const a of Object.keys(window.analysers || {})) { const d = getAnalyzerData('time', a); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); mx[a] = Math.max(mx[a] || 0, m); } await new Promise(r => setTimeout(r, 50)); }
    return { err: String(ed.repl.state.evalError || ''), fx: mx.fx || 0, code: ed.code || '' };
  }, seconds * 1000);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const bar = 4 * 60 / song.sections[0].bpm;
  // with samples: the passage in the break and the refrain in the outro are heard, below clipping
  {
    const { page, errors } = await open(browser);
    const code = await page.evaluate(() => document.querySelector('strudel-editor').editor.code || '');
    check(/s\("say_(en|it)_reed"\)/.test(code) && /orbit\(14\)/.test(code), 'the code holds the spoken lines (orbits 13 and 14)');
    await page.click('#play'); await sleep(2000);
    if (!(await page.isChecked('#sc-loop'))) await page.click('#sc-loop');
    for (const [i, name] of [[2, 'Break'], [4, 'Outro'], [1, 'Groove']]) {
      const r = await measure(page, i, Math.min(16, song.sections[i].bars * bar));
      check(!r.err, `${name}: no evaluation error`, r.err);
      check(r.fx > 0.02 && r.fx < 0.98, `${name}: the spoken line is heard below clipping`, `fx peak ${r.fx.toFixed(2)}`);
    }
    await page.click('#stop'); await sleep(300);
    // the panel of the voice instrument
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.click('[data-scene-i="4"]').catch(() => {}); await sleep(300);
      const n = await page.locator('.trk-name').count();
      for (let k = 0; k < n; k++) if ((await page.locator('.trk-name').nth(k).innerText()).includes('Words')) { await page.locator('.trk-name').nth(k).click(); break; }
      await sleep(500);
      const host = page.locator('#track-panel [aria-current="true"]').first();
      await host.scrollIntoViewIfNeeded().catch(() => {});
      await host.screenshot({ path: path.join(SHOTS, 'spoken-panel.png') }).catch(e => console.log('shot', e.message));
      await page.locator('#arranger, .arranger, #arr-grid').first().screenshot({ path: path.join(SHOTS, 'spoken-arranger.png') }).catch(() => {});
    }
    check(!errors.length, 'no page errors', errors[0]);
    await page.context().close();
  }
  // without samples: no spoken line in the code, no errors, the song plays
  {
    const { page, errors } = await open(browser, { noSamples: true });
    const code = await page.evaluate(() => document.querySelector('strudel-editor').editor.code || '');
    check(!/s\("say_/.test(code) && /(no sample|nessun campione): npm run voices/.test(code), 'without samples the lines leave the code, with a comment');
    await page.click('#play'); await sleep(2000);
    if (!(await page.isChecked('#sc-loop'))) await page.click('#sc-loop');
    for (const [i, name] of [[2, 'Break'], [1, 'Groove']]) {
      const r = await measure(page, i, 4);
      check(!r.err, `without samples, ${name}: no evaluation error`, r.err);
    }
    await page.click('#stop');
    check(!errors.length, 'without samples: no page errors', errors[0]);
    await page.context().close();
  }
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
