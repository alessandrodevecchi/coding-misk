// Browser checks for hand live coding (#20) in Compose, on Primo Segnale (a song with its own steps).
// Usage: PLAYWRIGHT_CORE=... node tools/check-hand.cjs   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const st = () => page.evaluate(() => {
    const e = document.querySelector('strudel-editor').editor;
    return { code: e.code, active: e.repl.state.activeCode || '', err: String(e.repl.state.evalError || ''), started: e.repl.scheduler.started, cyc: e.repl.scheduler.now(),
      hand: !document.getElementById('hand-tag').hidden, resume: !document.getElementById('hand-resume').hidden, say: document.getElementById('say').classList.contains('on'),
      last: document.getElementById('hand-last').hidden ? null : document.getElementById('hand-last-code').textContent };
  });
  const untilBar = async b => { for (let k = 0; k < 120 && (await st()).cyc < b; k++) await sleep(250); };

  await page.goto('http://localhost:5173/'); await sleep(5000);
  await page.locator('#track-pick').selectOption('primo-segnale'); await sleep(800);
  await page.click('#play'); await sleep(3000);
  check((await st()).started && !(await st()).hand, 'live build plays, not by hand');

  // clicking, selecting and copying do not take over
  await page.click('#edhost .cm-content'); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('ArrowDown'); await sleep(300);
  const before = await st();
  check(!before.hand, 'click, select and copy do not take over');
  await untilBar(8.5);
  const afterStep = await st();
  check(afterStep.code !== before.code && !afterStep.hand, 'the next step still writes the code');

  // typing takes over
  await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type(' hand');
  await sleep(300);
  let s = await st();
  check(s.hand && s.resume && s.code.includes('hand'), 'typing a character takes over (label and resume shown)');
  const handCode = s.code;
  await untilBar(Math.floor(s.cyc / 8) * 8 + 8.6);
  s = await st();
  check(s.code === handCode, 'by hand, the next step does not change the code');
  check(!s.say, 'by hand, no comment shows');
  check(s.started, 'by hand, the music goes on');

  // Ctrl+Enter plays the user's code
  await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type('!');
  await page.keyboard.press('ControlOrMeta+Enter'); await sleep(800);
  s = await st();
  check(s.active.includes('hand!') && !s.err, 'Ctrl+Enter evaluates the user\'s code');

  // resume: back to the song's code at the next bar, the user's code kept
  const userCode = s.code;
  // first the option off: the song goes on from where it has got to
  if ((await page.getAttribute('#hand-from', 'aria-pressed')) === 'true') await page.click('#hand-from');
  await page.click('#hand-resume');
  const bar = Math.ceil(s.cyc + .05);
  await untilBar(bar + 0.6);
  s = await st();
  check(!s.hand && !s.code.includes('hand!') && s.last === userCode, 'resume brings back the song\'s code and keeps the user\'s', `at bar ${s.cyc.toFixed(1)}`);
  const resumed = s.code;
  await untilBar(Math.floor(s.cyc / 8) * 8 + 8.6);
  s = await st();
  check(s.code !== resumed && !s.hand && !s.err, 'after resume, the next step plays on its bar');

  // the option on (default): resume goes back to the bar where the user took over
  const tookOver = Math.floor((await st()).cyc);
  await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type(' z');
  if (!((await page.getAttribute('#hand-from', 'aria-pressed')) === 'true')) await page.click('#hand-from');
  await sleep(7000);
  const beforeResume = (await st()).cyc;
  await page.click('#hand-resume'); await sleep(3500);
  s = await st();
  check(!s.hand && s.cyc >= tookOver && s.cyc < tookOver + 3 && beforeResume > tookOver + 3 && !s.err, 'resume from where I was goes back to the bar of the takeover', `took over at ${tookOver}, resumed at ${s.cyc.toFixed(1)} instead of ${beforeResume.toFixed(1)}`);

  // back to this code
  const kept = (await st()).last;
  await page.click('#hand-last summary'); await page.click('#hand-back'); await sleep(800);
  s = await st();
  check(s.hand && kept && s.code === kept && s.active === kept, 'back to this code: by hand again with the user\'s code evaluated');

  // past the end of the song by hand: the music goes on
  // jump to the last bar with the ruler (End), take over again, let the song end
  await page.focus('#ruler-track'); await page.keyboard.press('End'); await sleep(1200);
  await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type(' end');
  await sleep(6000);
  s = await st();
  check(s.started && s.cyc > 96 && s.hand, 'by hand, the music goes on past the end', `bar ${s.cyc.toFixed(1)}`);
  // resume past the end: the song starts again from the top
  await page.click('#hand-resume'); await sleep(2500);
  s = await st();
  check(s.started && !s.hand && s.cyc >= 94 && s.cyc < 97, 'resume past the end goes back to the last bar played by the song', `bar ${s.cyc.toFixed(1)}`);

  // the arranger does not overwrite the code by hand
  await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type(' x'); await sleep(200);
  const mine = (await st()).code;
  await page.fill('#track-title', 'Primo Segnale test'); await sleep(500);
  check((await st()).code === mine, 'editing the song by hand keeps the user\'s code');
  // save the code written by hand as a new version (#33)
  check(await page.isVisible('#hand-save'), 'by hand, "save as a new version" is shown');
  await page.click('#hand-save'); await sleep(400);
  const lib = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-library')).codeSongs || []);
  const v = lib[lib.length - 1];
  check(v && v.version === 2 && / · v2$/.test(v.title) && v.from === 'primo-segnale' && v.code.includes(' x'), 'a new version keeps the code and links the original', v && v.title);
  await page.click('#stop'); await sleep(500);
  await page.click('[data-tab="brani"]'); await sleep(500);
  const card = `#songs [data-song-id="${v.id}"]`;
  check(await page.$(card) && (await page.innerText(`${card} .badge`)).toLowerCase().includes('cod'), 'the version is a code song in the Songs tab');
  check(!!(await page.$(`#songs [data-song-id="primo-segnale"] [data-version="${v.id}"]`)), 'the original lists its versions');
  await page.click(`${card} [data-act="play"]`); await sleep(1500);
  check(!(await st()).err && (await st()).started, 'the version plays', (await st()).err);
  await page.click('#stop'); await sleep(300);
  // in the radio the version is cropped to the song on air
  await page.click('[data-tab="radio"]'); await sleep(300);
  await page.click('#radio-start'); await sleep(2500);
  await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type(' '); await sleep(300);
  await page.click('#hand-save'); await sleep(400);
  const lib2 = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-library')).codeSongs);
  const rv = lib2[lib2.length - 1];
  check(rv && !/Before \d/.test(rv.code.match(/const SECTIONS = .*/)[0]) && /<1!/.test(rv.code), 'a radio version keeps only the song on air', rv && rv.code.match(/const SECTIONS = .*/)[0].slice(0, 80));
  await page.click('#radio-start'); await sleep(300);
  check(!(await st()).hand, 'stop ends the hand mode');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
