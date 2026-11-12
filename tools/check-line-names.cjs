// Line names in the browser (line-names, #82): the Instrument name option in Compose, a song played with `$:` and with
// names (Crescendo and Live coder), no evaluation error, the labels of the code shown, muted lines, a reload keeping
// the choice; pictures of the code panel in each form with a shots dir.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-line-names.cjs [shots-dir] [song]   (dev server on PORT)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shots = process.argv[2] || null, SONG = process.argv[3] || 'luci-rosse', PORT = process.env.PORT || 5173;
if (shots) fs.mkdirSync(shots, { recursive: true });
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const LABEL = /^\s*([_S]?)(\$|[a-z][A-Za-z0-9]*):(?=\s|$)/;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); });
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]');
  await page.click('[data-tab="componi"]'); await sleep(300);
  await page.selectOption('#track-pick', SONG); await sleep(1500);
  const st = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor; return { code: e.code, active: e.repl.state.activeCode || '', err: String(e.repl.state.evalError || ''), cyc: e.repl.scheduler.now(), started: e.repl.scheduler.started }; });
  const labels = code => code.split('\n').map(l => LABEL.exec(l)).filter(Boolean).map(m => `${m[1]}${m[2]}`);
  check(await page.evaluate(() => !!document.querySelector('#live-names') && document.querySelector('#live-names').options.length === 3), 'the Instrument name option has three choices');
  const runs = [['crescendo', 'names'], ['crescendo', 'dollar'], ['switch', 'names'], ['switch', 'dollar']];
  if (!(await page.evaluate(() => document.querySelector('#live-toggle').getAttribute('aria-pressed') === 'true'))) { await page.click('#live-toggle'); await sleep(500); }
  for (const [profile, form] of runs) {
    await page.click(`#live-profile [data-profile="${profile}"]`); await sleep(1200);
    await page.selectOption('#live-names', form); await sleep(800);
    // (the song grows away from the page: wait for it, then play)
    for (let i = 0; i < 60 && await page.evaluate(() => !document.getElementById('live-growing').hidden); i++) await sleep(500);
    await page.keyboard.press('Control+Enter');
    const seen = new Set(), muted = new Set(), errs = new Set();
    for (let k = 0; k < 130; k++) {
      await sleep(500);
      const s = await st();
      for (const l of labels(s.code)) { seen.add(l); if (l.startsWith('_')) muted.add(l); }
      if (s.err && !errs.size && process.env.LN_DEBUG) console.log(`--- ${s.err}\n${s.active.split('\n').slice(0, 14).join('\n')}`);
      if (s.err) errs.add(s.err.slice(0, 120));
      if (s.cyc > 24) break;
    }
    const s = await st();
    const names = [...seen].filter(l => !/\$$/.test(l)), dollars = [...seen].filter(l => /\$$/.test(l));
    check(s.started && s.cyc > 4, `${profile} ${form}: plays`, `bar ${s.cyc.toFixed(1)}`);
    check(!errs.size, `${profile} ${form}: no evaluation error`, [...errs].join(' | '));
    if (form === 'names') {
      check(names.length > 0 && dollars.every(d => d === '$'), `${profile} names: lines named`, `${names.slice(0, 12).join(' ')}${dollars.length ? ` · ${dollars.join(' ')}` : ''}`);
      const plain = labels(s.code).filter(l => l !== '$').map(l => l.replace(/^[_S]/, ''));
      check(new Set(plain).size === plain.length, `${profile} names: names unique in the code shown`, plain.join(' '));
      check(names.every(n => /^[_S]?[a-z][A-Za-z0-9]*$/.test(n)), `${profile} names: lower case`);
    } else check(names.length === 0, `${profile} dollar: only $: lines`, names.slice(0, 6).join(' '));
    console.log(`      muted seen: ${[...muted].slice(0, 10).join(' ') || '-'}`);
    if (shots) {
      await page.screenshot({ path: path.join(shots, `${SONG}-${profile}-${form}.png`) });
    }
    await page.keyboard.press('Control+.'); await sleep(800);
  }
  // the choice is part of the song's configuration: kept after a reload
  await page.selectOption('#live-names', 'names'); await sleep(500);
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]').catch(() => {});
  await page.click('[data-tab="componi"]'); await sleep(300);
  await page.selectOption('#track-pick', SONG); await sleep(1500);
  check(await page.evaluate(() => document.querySelector('#live-names').value) === 'names', 'the choice is kept after a reload');
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `FAIL  ${failed}` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
