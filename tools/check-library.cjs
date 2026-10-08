// Browser checks for the Styles and Artists tabs (#35).
// Usage: PLAYWRIGHT_CORE=... node tools/check-library.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(4000);
  await page.evaluate(() => { localStorage.removeItem('coding-misk-styles'); localStorage.removeItem('coding-misk-artists'); });
  await page.reload(); await sleep(4000);

  // Styles tab: every style opens with tempo, progressions and instruments
  await page.click('[data-tab="stili"]'); await sleep(300);
  const ids = await page.$$eval('#tab-stili [data-open]', xs => xs.map(x => x.dataset.open));
  check(ids.length >= 16, `the Styles tab lists the styles (${ids.length})`);
  let bad = [];
  for (const id of ids) {
    await page.click(`#tab-stili [data-open="${id}"]`);
    const txt = await page.innerText('#tab-stili .lib-sheet');
    if (!/BPM/.test(txt) || !/drums|bass|pad|hook/i.test(txt) || !(await page.$('#tab-stili .progs div'))) bad.push(id);
  }
  check(!bad.length, 'every style sheet shows tempo, progressions and instruments', bad.join(', '));
  await page.click('#tab-stili [data-open="synthwave"]');
  if (shots) await (await page.$('#tab-stili')).screenshot({ path: path.join(shots, 'styles-sheet.png') });

  // duplicate and edit
  await page.click('#st-dup'); await sleep(200);
  const dupId = await page.$eval('#tab-stili [data-text="id"]', x => x.value);
  await page.fill('#tab-stili [data-text="name.en"]', 'Night Drive'); await page.press('#tab-stili [data-text="name.en"]', 'Tab');
  await page.fill('#tab-stili [data-num="tempo.1"]', '124'); await page.press('#tab-stili [data-num="tempo.1"]', 'Tab'); await sleep(200);
  if (shots) await (await page.$('#tab-stili')).screenshot({ path: path.join(shots, 'styles-form.png') });
  await page.click('#st-save'); await sleep(300);
  await page.click('[data-tab="radio"]'); await sleep(300);
  check(await page.$(`#tab-radio [data-style="${dupId}"]`) !== null && (await page.innerText(`#tab-radio [data-style="${dupId}"]`)) === 'Night Drive', 'a duplicated and edited style appears in the radio chips', dupId);
  const builtinTempo = await page.evaluate(() => fetch('/styles/synthwave.json').then(r => r.ok ? r.json() : null).catch(() => null));

  // invalid edit: reversed tempo
  await page.click('[data-tab="stili"]'); await page.click(`#tab-stili [data-open="${dupId}"]`); await page.click('#st-edit'); await sleep(200);
  await page.fill('#tab-stili [data-num="tempo.0"]', '150'); await page.press('#tab-stili [data-num="tempo.0"]', 'Tab'); await sleep(200);
  const err = await page.innerText('#tab-stili .lib-sheet');
  check(/reversed range/.test(err) && await page.isDisabled('#st-save'), 'a reversed tempo shows its error and blocks saving');
  await page.click('#st-cancel');

  // export, then import in a clean browser
  await page.click(`#tab-stili [data-open="${dupId}"]`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#st-export')]);
  const file = path.join(os.tmpdir(), `style-${Date.now()}.json`); await dl.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  const page2 = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await page2.goto('http://localhost:5173/'); await sleep(4000); await page2.click('[data-tab="stili"]');
  const [chooser] = await Promise.all([page2.waitForEvent('filechooser'), page2.click('#st-import')]);
  await chooser.setFiles(file); await sleep(500);
  const imported = await page2.evaluate(id => (JSON.parse(localStorage.getItem('coding-misk-styles') || '[]')).find(x => x.id === id), exported.id);
  check(imported && JSON.stringify(imported) === JSON.stringify(exported), 'export then import gives the same style');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
