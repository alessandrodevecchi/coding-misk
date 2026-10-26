// Requires playwright-core and Google Chrome. Set PLAYWRIGHT_CORE to the playwright-core path (see AGENTS.md).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(5000);
  await page.click('[data-uitheme="hw"]'); await sleep(500);
  // the faders of the Sound parts (voice-full-controls D17): drag and keyboard move the narrator's value, the same value
  // the track panel's knob shows
  {
    const ok = (c, name, extra = '') => console.log(`${c ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`);
    await page.evaluate(() => localStorage.setItem('coding-misk-voice-folds', JSON.stringify({ 'compose-narrator-sound': true })));
    await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="componi"]'); await sleep(300);
    await page.selectOption('#track-pick', 'example-voices'); await sleep(1500);
    if ((await page.getAttribute('#live-toggle', 'aria-pressed')) !== 'true') { await page.click('#live-toggle'); await sleep(400); }
    await page.click('#live-profile [data-profile="classic"]'); await sleep(1200);
    const sel = '#live-narrator-parts [data-vs-ctl="pitch"]';
    ok(await page.isVisible(`${sel} .fader`) && !(await page.isVisible(`${sel} .knob`)), 'the Sound part shows faders, not knobs');
    const f = await page.$(`${sel} .fader`); await f.evaluate(el => el.scrollIntoView({ block: 'center' })); await sleep(200);
    const b = await f.boundingBox();
    await page.mouse.move(b.x + 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width * 0.2, b.y + b.height / 2, { steps: 4 }); await page.mouse.up(); await sleep(500);
    const pitch = () => page.evaluate(() => { const v = globalThis.codingMiskPatterns.compose().T.tracks.find(x => x.type === 'voice'); return v && v.settings.pitch; });
    const p1 = await pitch();
    ok(p1 > 0.5 && p1 < 1, 'dragging the fader sets the narrator pitch', String(p1));
    await page.focus(`${sel} input`); await page.keyboard.press('ArrowRight'); await sleep(400);
    const p2 = await pitch();
    ok(Math.abs(p2 - p1 - 0.05) < 1e-9, 'the keyboard moves the same value', `${p1} → ${p2}`);
    const ti = await page.evaluate(() => globalThis.codingMiskPatterns.compose().T.tracks.findIndex(x => x.type === 'voice'));
    await page.click(`#arr-grid [data-trk="${ti}"]`); await sleep(500);
    const panel = await page.evaluate(ti => { const i = document.querySelector(`#track-panel [data-ptrk="${ti}"] [data-set="pitch"]`); return i ? +i.value : null; }, ti);
    ok(panel === null || Math.abs(panel - p2) < 1e-9, 'the track panel knob shows the same value', `${panel} / ${p2}`);
    if (OUT) await (await page.$('#live-voices')).screenshot({ path: OUT + '-voices-faders.png' });
  }
  await page.locator('#track-pick').selectOption('luci-rosse'); await page.click('#play'); await sleep(2000);
  await page.click('[data-scene-i="3"]'); await sleep(3000);
  await page.screenshot({ path: OUT + '-top.png' });
  // gira la manopola del volume del basso trascinandola verso l'alto
  const knob = page.locator('#bass-gain + .knob'); await knob.scrollIntoViewIfNeeded();
  const before = await page.inputValue('#bass-gain');
  const b = await knob.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 40, { steps: 8 }); await page.mouse.up();
  const after = await page.inputValue('#bass-gain');
  const code = await page.evaluate(() => document.querySelector('strudel-editor').editor.code.includes('analyze("bass")'));
  const leds = await page.evaluate(() => [...document.querySelectorAll('.act')].map(l => l.style.getPropertyValue('--lv')).join(','));
  await page.evaluate(() => document.getElementById('drums').scrollIntoView({ block: 'start' })); await sleep(800);
  await page.screenshot({ path: OUT + '-panel.png' });
  console.log(JSON.stringify({ before, after, code, leds, errs, ui: await page.evaluate(() => document.documentElement.dataset.ui) }));
  await browser.close();
})();
