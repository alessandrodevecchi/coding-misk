// Browser checks for Crescendo (#64) in Compose: the build style control, a Crescendo build that starts from one sound
// and grows without evaluation errors, seeking into the growth, hand takeover and resume, a song that declares
// its build style. Usage: PLAYWRIGHT_CORE=... node tools/check-crescendo-play.cjs   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const SONGS = ['ferro', 'cavo-scoperto'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const st = () => page.evaluate(() => {
    const e = document.querySelector('strudel-editor').editor;
    return { code: e.code, err: String(e.repl.state.evalError || ''), started: e.repl.scheduler.started, cyc: e.repl.scheduler.now(), hand: !document.getElementById('hand-tag').hidden };
  });
  // track blocks that play (a "$:" line; "_$:" is a track still to come), without the voice that speaks the comments
  const tracks = code => code.split(/^\/\/ ========== /m).slice(1).filter(b => !/^[^\n]*voice ==========/.test(b) && /^\$:/m.test(b)).length;
  const seek = async k => { await page.evaluate(v => { const x = document.getElementById('pb-seek'); x.value = v; x.dispatchEvent(new Event('change')); }, k); await sleep(1500); };

  await page.goto('http://localhost:5173/'); await sleep(5000);
  await page.evaluate(() => { localStorage.removeItem('coding-misk-live-style'); });
  for (const id of SONGS) {
    await page.locator('#track-pick').selectOption(id); await sleep(800);
    if ((await page.getAttribute('#live-toggle', 'aria-pressed')) !== 'true') await page.click('#live-toggle');
    await page.locator('#live-style').selectOption('crescendo'); await sleep(800);
    check(!(await page.isHidden('#live-narrated')), `${id}: "fully narrated" shows with crescendo`);
    if (id === SONGS[0]) {
      const nowCode = (await st()).code;
      await page.locator('#live-code').selectOption('compact'); await sleep(600);
      const c = (await st()).code;
      check(nowCode.split('\n').length < c.split('\n').length && !/const section\d/.test(nowCode), `${id}: code of the moment is the shortest, without section lanes`);
      check(/^_\$:/m.test(c) && !(await page.isHidden('#live-code')), `${id}: compact code shows the tracks still to come with _$:`);
      await page.locator('#live-code').selectOption('sections'); await sleep(600);
      check(!/^_\$:/m.test((await st()).code), `${id}: code per section without _$:`);
      await page.locator('#live-code').selectOption('track'); await sleep(600);
      check(/\.pick\(\[/.test((await st()).code) || (await st()).code.length < c.length, `${id}: one line per track`);
      await page.locator('#live-code').selectOption('now'); await sleep(600);
    }
    const first = await st();
    check(tracks(first.code) === 1, `${id}: the build starts from one sound`, `${tracks(first.code)} tracks`);
    await page.click('#play'); await sleep(9000);
    let s = await st();
    check(s.started && !s.err, `${id}: plays without evaluation errors`, s.err);
    check(s.code !== first.code, `${id}: the code grows while it plays`);
    for (const k of [300, 600, 900]) {
      await seek(k); s = await st();
      check(!s.err && s.started, `${id}: seek to ${k / 10}% plays without errors`, s.err);
    }
    await seek(150); const mid = await st();
    check(tracks(mid.code) > 1 && tracks(mid.code) <= 9, `${id}: in the growth some tracks play`, `${tracks(mid.code)}`);
    await page.click('#play'); await sleep(500);
  }
  // hand takeover and resume during a Crescendo build
  await page.click('#play'); await sleep(4000);
  await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type(' x'); await sleep(300);
  let s = await st();
  check(s.hand, 'typing takes over a Crescendo build');
  if ((await page.getAttribute('#hand-from', 'aria-pressed')) === 'true') await page.click('#hand-from');
  await page.click('#hand-resume'); await sleep(5000);
  s = await st();
  check(!s.hand && !s.err && s.started && !s.code.includes('// ...') , 'resume goes on with the build', s.err);
  await page.click('#play'); await sleep(300);
  // back to blocks
  await page.locator('#live-style').selectOption('blocks'); await sleep(800);
  check(await page.isHidden('#live-narrated'), '"fully narrated" hides in blocks');
  // a song that declares crescendo opens in crescendo with the live build off
  const declared = await page.$$eval('#track-pick option', os => os.map(o => o.value).find(v => v.startsWith('crescendo-')));
  if (declared) {
    if ((await page.getAttribute('#live-toggle', 'aria-pressed')) === 'true') await page.click('#live-toggle');
    await page.locator('#track-pick').selectOption(declared); await sleep(800);
    check((await page.inputValue('#live-style')) === 'crescendo' && tracks((await st()).code) === 1, `${declared}: opens in crescendo`);
    await page.locator('#live-style').selectOption('blocks'); await sleep(500);
    await page.click('#live-toggle'); await sleep(500);
    check((await page.getAttribute('#live-toggle', 'aria-pressed')) === 'false' && tracks((await st()).code) > 1, `${declared}: plays as written with the live build off`);
  }
  // performance profiles: Switch, a control changed by hand makes it custom, picking it again drops the change
  await page.locator('#track-pick').selectOption('crescendo-filo-di-luce'); await sleep(600);
  await page.locator('#live-profile').selectOption('switch'); await sleep(800);
  let code = (await st()).code;
  check(/^\/\/ ========== /m.test(code) && !/^\/\/ > /m.test(code) && !/ · pattern /.test(code), 'Switch: essential comments', code.split('\n').slice(0, 6).join(' / '));
  await page.locator('#live-comments').selectOption('none'); await sleep(600);
  code = (await st()).code;
  check(!/^\s*\/\//m.test(code.split('\n').slice(1).join('\n')) && code.startsWith('// coding-misk') && /custom|personalizzato/.test(await page.$eval('#live-profile', s => s.selectedOptions[0].textContent)), 'no comments (the title stays), profile custom', `${(code.match(/^\s*\/\/.*$/m) || [''])[0]} | ${await page.$eval('#live-profile', s => s.selectedOptions[0].textContent)}`);
  await page.locator('#live-profile').selectOption('switch'); await sleep(600);
  check(!/custom|personalizzato/.test(await page.$eval('#live-profile', s => s.selectedOptions[0].textContent)) && (await page.inputValue('#live-comments')) === 'essential', 'picking the profile again drops the change');
  await page.locator('#live-profile').selectOption('crescendo'); await sleep(400);
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
