// Browser checks for the settings page (#31): gear, theme and language, radio defaults, export format
// (Opus export of a short song), the growth shapes tried (shape-search), backup export and import, reset.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-settings.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2], URL = `http://localhost:${process.env.PORT || 5173}/`;
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await sleep(2500);
  await page.evaluate(async () => {
    localStorage.clear();
    const base = await (await fetch('/songs/examples/01-first-beat.json')).json();
    localStorage.setItem('coding-misk-library', JSON.stringify({ tracks: [{ ...base, id: 'u-short', title: 'Short', sections: [{ ...base.sections[0], bars: 2, bpm: 200 }] }], code: {} }));
  });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(300);

  // the gear opens the page; a second press goes back
  await page.click('#open-settings'); await sleep(300);
  check(await page.isVisible('#tab-impostazioni .set-grid') && (await page.getAttribute('#open-settings', 'aria-pressed')) === 'true', 'the gear opens the settings');
  if (shots) await page.screenshot({ path: path.join(shots, 'settings.png') });
  await page.click('#open-settings'); await sleep(300);
  check(await page.isVisible('#tab-brani') && !(await page.isVisible('#tab-impostazioni')), 'a second press goes back to the tab before');
  await page.click('#open-settings'); await sleep(300);

  // theme and language
  await page.click('#tab-impostazioni [data-set-ui="hw"]'); await sleep(200);
  check((await page.evaluate(() => document.documentElement.dataset.ui)) === 'hw', 'theme from the settings');
  await page.click('#tab-impostazioni [data-set-ui="neon"]'); await sleep(200);
  const lang0 = await page.evaluate(() => document.documentElement.lang || '');
  await page.click('#tab-impostazioni [data-set-lang="it"]'); await sleep(300);
  check(/Impostazioni|Aspetto/.test(await page.innerText('#tab-impostazioni')), 'language from the settings', lang0);
  await page.click('#tab-impostazioni [data-set-lang="en"]'); await sleep(300);
  check(await page.isVisible('[data-uitheme="hw"]') && await page.isVisible('[data-lang="it"]'), 'theme and language stay in the top bar');

  // radio defaults and export format
  await page.selectOption('#tab-impostazioni [data-radio-opt="transition"]', 'morph'); await sleep(100);
  await page.selectOption('#set-radio-look', 'sonar'); await sleep(100);
  await page.selectOption('#set-format', 'opus'); await sleep(100);
  // the material source (material-generator, radio-variation 6.1): Settings keeps the default the radio starts from (6.2)
  await page.selectOption('#tab-impostazioni [data-radio-opt="material"]', 'varied'); await sleep(100);
  check((await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio') || '{}').materialDefault)) === 'varied', 'the default material source is saved from the settings');
  const saved = await page.evaluate(() => ({ radio: JSON.parse(localStorage.getItem('coding-misk-radio') || '{}').transition, look: JSON.parse(localStorage.getItem('coding-misk-radio-look')), fmt: JSON.parse(localStorage.getItem('coding-misk-export-format')) }));
  check(saved.radio === 'morph' && saved.look === 'sonar' && saved.fmt === 'opus', 'radio defaults and export format saved', JSON.stringify(saved));
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  check((await page.inputValue('#radio-transition')) === 'morph', 'the radio shows the default from the settings');
  check((await page.evaluate(() => globalThis.codingMiskRadio && globalThis.codingMiskRadio.settings.material)) === 'varied', 'the radio takes the material source from the settings');
  check((await page.getAttribute('.radio-ctrls .mat-source [data-material="varied"]', 'aria-pressed')) === 'true', 'the console starts from the default of the settings');

  // the growth shapes tried (shape-search D3): Advanced card, kept within 4 and 32, the default 8 not stored
  await page.click('#open-settings'); await sleep(300);
  check(await page.isVisible('#set-advanced #set-shape-cap') && (await page.inputValue('#set-shape-cap')) === '8', 'Growth shapes tried in Advanced, 8 by default');
  check(/fewer rushed steps/.test(await page.innerText('#set-advanced')), 'its hint');
  const capOf = () => page.evaluate(() => localStorage.getItem('coding-misk-shape-cap'));
  await page.fill('#set-shape-cap', '40'); await page.press('#set-shape-cap', 'Tab'); await sleep(150);
  check((await capOf()) === '32' && (await page.inputValue('#set-shape-cap')) === '32', 'a value over 32 is kept at 32', await capOf());
  await page.fill('#set-shape-cap', '2'); await page.press('#set-shape-cap', 'Tab'); await sleep(150);
  check((await capOf()) === '4', 'a value under 4 is kept at 4', await capOf());
  await page.fill('#set-shape-cap', '8'); await page.press('#set-shape-cap', 'Tab'); await sleep(150);
  check((await capOf()) === null, 'the default is not stored', String(await capOf()));
  await page.fill('#set-shape-cap', '12'); await page.press('#set-shape-cap', 'Tab'); await sleep(150);
  await page.click('#tab-impostazioni [data-set-lang="it"]'); await sleep(300);
  check(/forme di crescita provate/i.test(await page.innerText('#set-advanced')) && (await page.inputValue('#set-shape-cap')) === '12', 'in Italian, the value kept');
  await page.click('#tab-impostazioni [data-set-lang="en"]'); await sleep(300);
  // Try all, Keep, Random order, Long song from (shape-search D6, D7): defaults not stored, Keep and the cap follow Try all
  const ls = k => page.evaluate(x => localStorage.getItem(x), k);
  check(!(await page.isChecked('#set-shape-all')) && (await page.isDisabled('#set-shape-keep')) && (await page.inputValue('#set-shape-keep')) === 'first', 'Try all off by default, Keep first good one and disabled');
  check((await page.isChecked('#set-shape-random')) && (await page.inputValue('#set-long-song')) === '15', 'Random order on, Long song from 15 minutes by default');
  await page.check('#set-shape-all'); await sleep(200);
  check((await ls('coding-misk-shape-all')) === 'true' && !(await page.isDisabled('#set-shape-keep')) && (await page.isDisabled('#set-shape-cap')), 'Try all on: stored, Keep enabled, the cap disabled');
  await page.selectOption('#set-shape-keep', 'best'); await sleep(150);
  check((await ls('coding-misk-shape-keep')) === '"best"', 'Keep best one stored', String(await ls('coding-misk-shape-keep')));
  await page.selectOption('#set-shape-keep', 'first'); await sleep(150);
  await page.uncheck('#set-shape-all'); await sleep(200);
  check((await ls('coding-misk-shape-all')) === null && (await ls('coding-misk-shape-keep')) === null, 'the defaults of Try all and Keep are not stored');
  await page.uncheck('#set-shape-random'); await sleep(150);
  check((await ls('coding-misk-shape-random')) === 'false', 'Random order off stored', String(await ls('coding-misk-shape-random')));
  await page.check('#set-shape-random'); await sleep(150);
  check((await ls('coding-misk-shape-random')) === null, 'Random order on not stored');
  await page.fill('#set-long-song', '90'); await page.press('#set-long-song', 'Tab'); await sleep(150);
  check((await ls('coding-misk-long-song')) === '3600' && (await page.inputValue('#set-long-song')) === '60', 'Long song from kept at 60 minutes, stored in seconds', String(await ls('coding-misk-long-song')));
  await page.fill('#set-long-song', '15'); await page.press('#set-long-song', 'Tab'); await sleep(150);
  check((await ls('coding-misk-long-song')) === null, 'Long song from: the default is not stored');
  check(/shortest song/.test(await page.innerText('#set-advanced')), 'the hints of the new settings');
  await page.click('#open-settings'); await sleep(300);

  // Opus export of a short song
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(300);
  // the user's song is past page 1 (20 songs a page, #67): a search brings it to page 1
  await page.fill('#sv-q', 'short'); await sleep(400);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#songs [data-song-id="u-short"] [data-act="export"]')]);
  check(/\.(webm|ogg)$/.test(dl.suggestedFilename()), 'Opus export downloads a small file', dl.suggestedFilename());

  // backup: export, then import into a clean browser (the library is saved a moment after a change: wait for it)
  for (let i = 0; i < 40 && !(await page.evaluate(() => /u-short/.test(localStorage.getItem('coding-misk-library') || ''))); i++) await sleep(250);
  await page.click('#open-settings'); await sleep(300);
  const [bk] = await Promise.all([page.waitForEvent('download'), page.click('#set-export')]);
  const file = path.join(os.tmpdir(), `coding-misk-backup-${Date.now()}.json`);
  await bk.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(data.format === 'coding-misk/backup' && data.data['coding-misk-library'] && !data.data['coding-misk-draft'], 'backup holds the library, not the working state', `${data.format} keys: ${Object.keys(data.data || {}).join(', ')}`);
  const p2 = await (await browser.newContext({ viewport: { width: 1300, height: 1100 } })).newPage();
  p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(URL); await sleep(3000);
  await p2.click('#open-settings'); await sleep(300);
  const [chooser] = await Promise.all([p2.waitForEvent('filechooser'), p2.click('#set-import')]);
  await chooser.setFiles(file); await sleep(2500);
  const lib2 = await p2.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-library') || '{}'));
  check(lib2.tracks && lib2.tracks.some(x => x.id === 'u-short'), 'import brings the songs into another browser');
  await p2.context().close();

  // reset: two presses
  await page.click('#set-reset'); await sleep(200);
  check(await page.evaluate(() => !!localStorage.getItem('coding-misk-library')), 'first press does not reset');
  await Promise.all([page.waitForNavigation(), page.click('#set-reset')]); await sleep(2500);
  check(await page.evaluate(() => !localStorage.getItem('coding-misk-library') || !JSON.parse(localStorage.getItem('coding-misk-library')).tracks.some(x => x.id === 'u-short')), 'second press clears the data');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
