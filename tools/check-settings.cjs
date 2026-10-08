// Browser checks for the settings page (#31): gear, theme and language, radio defaults, export format
// (Opus export of a short song), backup export and import, reset.
// Usage: PLAYWRIGHT_CORE=... node tools/check-settings.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
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
  const saved = await page.evaluate(() => ({ radio: JSON.parse(localStorage.getItem('coding-misk-radio') || '{}').transition, look: JSON.parse(localStorage.getItem('coding-misk-radio-look')), fmt: JSON.parse(localStorage.getItem('coding-misk-export-format')) }));
  check(saved.radio === 'morph' && saved.look === 'sonar' && saved.fmt === 'opus', 'radio defaults and export format saved', JSON.stringify(saved));
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  check((await page.inputValue('#radio-transition')) === 'morph', 'the radio shows the default from the settings');

  // Opus export of a short song
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(300);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#songs [data-song-id="u-short"] [data-act="export"]')]);
  check(/\.(webm|ogg)$/.test(dl.suggestedFilename()), 'Opus export downloads a small file', dl.suggestedFilename());

  // backup: export, then import into a clean browser
  await page.click('#open-settings'); await sleep(300);
  const [bk] = await Promise.all([page.waitForEvent('download'), page.click('#set-export')]);
  const file = path.join(os.tmpdir(), `coding-misk-backup-${Date.now()}.json`);
  await bk.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(data.format === 'coding-misk/backup' && data.data['coding-misk-library'] && !data.data['coding-misk-draft'], 'backup holds the library, not the working state');
  const p2 = await (await browser.newContext({ viewport: { width: 1300, height: 1100 } })).newPage();
  p2.on('pageerror', e => errors.push(e.message));
  await p2.goto('http://localhost:5173/'); await sleep(3000);
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
