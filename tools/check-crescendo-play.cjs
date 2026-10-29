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

  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(5000);
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
  check(await page.isDisabled('#live-narrated'), '"Narrated growth" disabled in blocks (needs crescendo, voice-placement)');
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
  await page.click('#live-profile [data-profile="switch"]'); await sleep(800);
  let code = (await st()).code;
  // (Live coder: only the title as comments, radio-profiles 9.2)
  check(!/^\s*\/\//m.test(code.split('\n').slice(1).join('\n')) && code.startsWith('// coding-misk'), 'Switch: only the title as comments', code.split('\n').slice(0, 6).join(' / '));
  await page.locator('#live-comments').selectOption('essential'); await sleep(600);
  code = (await st()).code;
  check(/^\/\/ ========== /m.test(code) && !/^\/\/ > /m.test(code) && !/ · pattern /.test(code) && !(await page.isHidden('#live-custom')), 'essential comments (track names), profile custom', `${code.split('\n').slice(0, 6).join(' / ')} | ${await page.isHidden('#live-custom')}`);
  await page.click('#live-profile [data-profile="switch"]'); await sleep(600);
  check(!!(await page.isHidden('#live-custom')) && (await page.inputValue('#live-comments')) === 'none', 'picking the profile again drops the change');
  // growth shapes (growth-shapes): the typed opening is silent until its first line is typed, and the line is complete
  // when it sounds; the muted base (_$:), mid-set (S$:) and second section states evaluate without errors
  const ROOT = require('path').resolve(__dirname, '..'), fs = require('fs');
  const { crescendoSong } = await import(`${ROOT}/src/song/crescendo.js`), { resolveProfile, growthRules } = await import(`${ROOT}/src/live/profiles.js`);
  const styles = Object.fromEntries(fs.readdirSync(`${ROOT}/styles`).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`${ROOT}/styles/${f}`, 'utf8'))).map(r => [r.id, r]));
  const shapeOf = (id, over) => crescendoSong(JSON.parse(fs.readFileSync(`${ROOT}/songs/${id}.json`, 'utf8')), { rules: growthRules(resolveProfile('switch', over), { styles }) });
  const heard = code => code.split('\n').filter(l => /^S?\$:/.test(l) && !/^\$: silence/.test(l)).length;
  await page.locator('#track-pick').selectOption('switch-prima-luce'); await sleep(600);
  await page.click('#live-profile [data-profile="switch"]'); await sleep(800);
  await page.locator('#live-opening').selectOption('typed'); await sleep(1200);
  check(!(await page.isHidden('#live-shape')) && !(await page.isHidden('#live-custom')), 'growth shape: the controls show with Live coder, a value makes the profile custom');
  const L = shapeOf('switch-prima-luce', { opening: 'typed' }).crescendo.shape.leadIn;
  await page.click('#play');
  let silent = true, cur = await st();
  for (let k = 0; k < 40; k++) { cur = await st(); if (cur.cyc >= L - 0.1) break; if (cur.err) silent = false; await sleep(150); }
  // the evaluated code before the first step plays nothing: the scheduler's pattern has no events in the lead-in
  const evBefore = await page.evaluate(() => { const r = document.querySelector('strudel-editor').editor.repl; const p = r.state.pattern; try { return p ? p.queryArc(0, 0.9).filter(h => h.hasOnset()).length : 0; } catch (e) { return -1; } });
  check(silent && evBefore === 0, `typed opening: silent before the first step (lead-in ${L} bars)`, `events ${evBefore}`);
  while ((await st()).cyc < L + 0.6) await sleep(200);
  cur = await st();
  const after = await page.evaluate(L0 => { const r = document.querySelector('strudel-editor').editor.repl; return r.state.pattern ? r.state.pattern.queryArc(L0, L0 + 1).filter(h => h.hasOnset()).length : 0; }, L);
  check(!cur.err && heard(cur.code) >= 1 && after > 0, 'typed opening: the first line sounds whole on its bar', cur.err || `${after} events`);
  await page.click('#play'); await sleep(400);
  for (let [opening, development, re] of [['muted-base', 'by-type', /^_\$:/m], ['mid-set', 'by-type', /^S\$:/m], ['slow', 'second-section', /^S\$:/m], ['slow', 'metamorphosis', /setcpm\(134\/4\)/]]) {
    await page.locator('#live-opening').selectOption(opening); await page.locator('#live-development').selectOption(development); await sleep(1000);
    const c = shapeOf('switch-prima-luce', { opening, development }), steps = [...new Set(c.build.map(x => x.at))].sort((a, b) => a - b);
    // (the second skin's tempo is drawn with the shape: read it from the build)
    if (development === 'metamorphosis' && c.crescendo.shape.skin) re = new RegExp(`setcpm\\(${c.crescendo.shape.skin.bpm}/4\\)`);
    const total = c.sections.reduce((a, x) => a + x.bars, 0), marked = c.build.filter(x => x.solo !== undefined || x.mute !== undefined || x.unsolo !== undefined || x.unmute !== undefined || (x.pattern && x.pattern.to === 'skin')).map(x => x.at);
    await page.click('#play'); await sleep(3000);
    let ok = true, seen = false, msg = '';
    for (const bar of [...new Set([...marked, ...steps.filter((_, i) => i % 9 === 0)])].slice(0, 10)) {
      await seek(Math.min(999, Math.round(bar / total * 1000))); const s2 = await st();
      if (re.test(s2.code)) seen = true;
      if (s2.err || !s2.started) { ok = false; msg = `bar ${bar}: ${s2.err}`; break; }
    }
    check(ok && seen, `${opening}/${development}: every state with its marks evaluates`, msg || (seen ? '' : 'no mark seen'));
    await page.click('#play'); await sleep(400);
  }
  await page.locator('#live-opening').selectOption('auto'); await page.locator('#live-development').selectOption('auto'); await sleep(400);
  await page.click('#live-profile [data-profile="crescendo"]'); await sleep(400);
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
