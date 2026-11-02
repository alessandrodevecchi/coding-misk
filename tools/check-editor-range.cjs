// The code editor never breaks on places past its text (#82). The radio of the owner's test (seed cxizij, Custom profile
// grown like a live coder, code widgets on) skipped to its second song, Miraggio: a live build step and a section
// boundary of the code widgets fell in one tick, the boundary wrote an older, shorter code over the step's while the
// step's evaluation ran, and Strudel placed its widget past the end of the text. From then on every edit threw "Position
// N is out of range" and the song stopped growing. Checked: no page error and no RangeError for 40 s of that song, the
// code still changes, and Strudel's widgets and sliders placed past the text (by hand) leave the editor working.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-editor-range.cjs [--seconds 40]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SECONDS = +arg('--seconds', 40);
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/out of range/.test(m.text())) errors.push(m.text().split('\n')[0]); });
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  await page.evaluate(() => {
    localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en');
    localStorage.setItem('coding-misk-code-widgets', JSON.stringify({ on: true }));
    localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno', 'dreamy-cyberpunk'], chaos: 0.25, energy: 0.65, complexity: 0.55, artist: null, transition: 'artist', harmony: 'artist', profile: 'custom', incoming: 'profile', material: 'mix', length: 'style',
      custom: { base: 'switch', controls: { duration: 'fitted' } }, voices: { narrator: false, track: true },
      voice: { presence: 'always', phrases: 'many', kind: 'different', ways: ['refrain'], where: ['quiet'], vocab: 'style' } }));
  });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'cxizij'); await page.click('#radio-start');
  const on = () => page.evaluate(() => { const r = globalThis.codingMiskRadio; return !!(r.state && document.querySelector('strudel-editor').editor.repl.scheduler.started); });
  for (let k = 0; k < 240 && !(await on()); k++) await sleep(500);
  await sleep(3000);
  await page.click('#radio-skip'); await sleep(3000);
  const st = () => page.evaluate(() => { const r = globalThis.codingMiskRadio.state, e = document.querySelector('strudel-editor').editor; return { title: r.stream[r.onAir].title, code: e.code, cyc: e.repl.scheduler.now(), started: e.repl.scheduler.started }; });
  const first = await st(), codes = new Set([first.code]);
  check(first.title === 'Miraggio', 'the second song of seed cxizij is on air', first.title);
  for (let s = 0; s < SECONDS; s += 2) { await sleep(2000); codes.add((await st()).code); }
  const last = await st();
  check(!errors.length, `no "out of range" error and no page error in ${SECONDS} s of the song`, errors.slice(0, 2).join(' | '));
  check(last.started && codes.size > 3, 'the song goes on growing: its code keeps changing', `${codes.size} codes, bar ${last.cyc.toFixed(1)}`);
  // Strudel's widgets and a slider placed past the end of the text, as a late evaluation would: the editor still edits
  const r = await page.evaluate(async () => {
    const e = document.querySelector('strudel-editor').editor, v = e.editor, len = v.state.doc.length, out = {};
    e.stop(); await new Promise(res => setTimeout(res, 300));
    try { globalThis.updateWidgets(v, [{ to: len + 15, index: 0, type: '_scope', id: '' }]); globalThis.updateSliderWidgets(v, [{ from: len + 2, to: len + 5, value: '0.5', min: 0, max: 1, type: 'slider' }]); out.placed = true; } catch (x) { out.placed = x.message; }
    try { e.setCode('$: s("bd*4")'); globalThis.updateMiniLocations(v, []); out.edited = v.state.doc.toString() === '$: s("bd*4")'; } catch (x) { out.edited = x.message; }
    return out;
  });
  check(r.placed === true, 'widgets and a slider past the text do not throw', String(r.placed));
  check(r.edited === true, 'the editor still edits afterwards', String(r.edited));
  check(!errors.length, 'no error after the widgets past the text', errors.slice(0, 2).join(' | '));
  await browser.close();
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})();
