// Browser checks for hand live coding (#20) in Compose, on Primo Segnale (a song with its own steps).
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-hand.cjs [shots-dir]   (dev server on PORT, default 5173)
// With a shots dir: the code panel right after a mid-edit takeover (the completed lines flash) in neon, light and hw.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const path = require('path'), fs = require('fs');
const shots = process.argv[2] || null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const st = () => page.evaluate(() => {
    const e = document.querySelector('strudel-editor').editor;
    return { code: e.code, active: e.repl.state.activeCode || '', err: String(e.repl.state.evalError || ''), started: e.repl.scheduler.started, cyc: e.repl.scheduler.now(),
      hand: !document.getElementById('hand-tag').hidden, resume: !document.getElementById('hand-resume').hidden, say: document.getElementById('say').classList.contains('on'),
      last: document.getElementById('hand-last').hidden ? null : document.getElementById('hand-last-code').textContent };
  });
  const untilBar = async b => { for (let k = 0; k < 120 && (await st()).cyc < b; k++) await sleep(250); };
  // the next step of the live build: evaluated, and its bar begun. The code shown is then the code playing, and the
  // edit towards the step after is typed from half a bar later at the earliest. The takeovers below type there: a
  // takeover while an edit is being typed keeps the half-typed text (a lone "/" of a comment, a call cut in two), and
  // that code does not evaluate. Returns the step's bar, or null after 30 s without a step.
  const nextStep = () => page.evaluate(() => new Promise(res => {
    const e = document.querySelector('strudel-editor').editor, was = e.repl.state.activeCode, t0 = Date.now();
    let bar = null;
    const iv = setInterval(() => {
      const a = e.repl.state.activeCode || '', now = e.repl.scheduler.now();
      if (bar === null && a !== was && a.startsWith(e.code)) bar = Math.round(now);
      if ((bar !== null && now >= bar + .02) || Date.now() - t0 > 30000) { clearInterval(iv); res(bar); }
    }, 20);
  }));
  // an edit half typed on screen (takeover-pending-edit): the editor shows a typing frame that is neither the code it
  // showed when called nor the text the edit types towards (the app's codingMiskEdit). Returns { code, to }, or null
  // after 30 s without one
  const midEdit = () => page.evaluate(() => new Promise(res => {
    const e = document.querySelector('strudel-editor').editor, was = e.code, t0 = Date.now();
    const iv = setInterval(() => {
      const L = globalThis.codingMiskEdit && globalThis.codingMiskEdit();
      if (L && L.started && e.code !== was && e.code !== L.to) { clearInterval(iv); res({ code: e.code, to: L.to }); }
      else if (Date.now() - t0 > 30000) { clearInterval(iv); res(null); }
    }, 5);
  }));
  // the cursor at the end of the code (a click does not take over)
  const toEnd = async () => { await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('ControlOrMeta+End'); };
  // back to the live build: resume from where the song has got to, then wait until the resume is done
  const resumeOn = async () => {
    if ((await page.getAttribute('#hand-from', 'aria-pressed')) === 'true') await page.click('#hand-from');
    const c = (await st()).cyc;
    await page.click('#hand-resume');
    await untilBar(Math.ceil(c + .05) + .3);
  };
  // with a shots dir: a theme before a takeover, then the code panel right after it (the flash of the completed lines)
  const theme = async ui => { if (shots) { await page.click(`[data-uitheme="${ui}"]`); await sleep(300); } };
  const shot = async name => { if (shots) await page.locator('#edhost').screenshot({ path: path.join(shots, `takeover-${name}.png`) }); };

  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(5000);
  await page.locator('#track-pick').selectOption('primo-segnale'); await sleep(800);
  await page.click('#play'); await sleep(3000);
  check((await st()).started && !(await st()).hand, 'live build plays, not by hand');

  // clicking, selecting and copying do not take over
  await page.click('#edhost .cm-content'); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('ArrowDown'); await sleep(300);
  const before = await st();
  check(!before.hand, 'click, select and copy do not take over');
  const step1 = await nextStep();
  const afterStep = await st();
  check(step1 !== null && afterStep.code !== before.code && !afterStep.hand, 'the next step still writes the code', `step at bar ${step1}`);

  // takeover in the middle of a typed edit (takeover-pending-edit): the edit is completed, then the key applies
  await theme('neon');
  await toEnd();
  let m = await midEdit();
  check(!!m, 'an edit is caught half typed', m ? `${m.code.length} of ${m.to.length} characters` : 'none in 30 s');
  if (m) {
    await page.keyboard.press(' '); await shot('neon'); await sleep(300);
    let s = await st();
    check(s.hand && s.code === `${m.to} `, 'a key in the middle of an edit: the edit completed, then the key', `hand ${s.hand}, code ${s.code === `${m.to} ` ? 'as expected' : `${s.code.length} characters instead of ${m.to.length + 1}`}`);
    // (before Ctrl+Enter, which adds its own line break as an edit)
    // the coder's typing is not in the undo history: one undo takes the key away, a second keeps the completed code
    // (the editor's own "// LOADING" placeholder, cleared before the app starts, may come back as a comment at the end)
    await page.keyboard.press('ControlOrMeta+z'); await sleep(150);
    const u1 = (await st()).code;
    await page.keyboard.press('ControlOrMeta+z'); await sleep(150);
    const u2 = (await st()).code;
    check(u1 === m.to && (u2 === m.to || u2 === `${m.to}// LOADING`), 'undo after a mid-edit takeover never brings back half-typed code', `first undo ${u1 === m.to}, second ${JSON.stringify(u2.slice(m.to.length - 20))}`);
    await page.keyboard.press('ControlOrMeta+Enter'); await sleep(800);
    s = await st();
    check(!s.err && s.active.startsWith(s.code), 'Ctrl+Enter after a mid-edit takeover evaluates without error', s.err);
    await resumeOn();
  }
  // a paste in the middle of an edit
  await page.evaluate(() => navigator.clipboard.writeText('\n// pasted'));
  await theme('light');
  await toEnd();
  m = await midEdit();
  if (m) {
    await page.keyboard.press('ControlOrMeta+v'); await shot('light'); await sleep(300);
    const s = await st();
    check(s.hand && s.code === `${m.to}\n// pasted`, 'a paste in the middle of an edit goes into the completed code', `hand ${s.hand}, ${s.code.length} characters instead of ${m.to.length + 10}`);
    await resumeOn();
  } else check(false, 'an edit is caught half typed before a paste');
  // Backspace in the middle of an edit
  await theme('hw');
  await toEnd();
  m = await midEdit();
  if (m) {
    await page.keyboard.press('Backspace'); await shot('hw'); await sleep(300);
    const s = await st();
    check(s.hand && s.code === m.to.slice(0, -1), 'Backspace in the middle of an edit deletes from the completed code', `hand ${s.hand}, ${s.code.length} characters instead of ${m.to.length - 1}`);
  } else check(false, 'an edit is caught half typed before Backspace');
  // a takeover in the middle of the typing of "Resume live build": by hand, the first three lines removed; resume
  // types them back, a key on the way completes that typing
  if ((await st()).hand) {
    await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('Home');
    for (let k = 0; k < 3; k++) await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Backspace');
    await untilBar(Math.floor((await st()).cyc) + 1.05);
    if ((await page.getAttribute('#hand-from', 'aria-pressed')) === 'true') await page.click('#hand-from');
    // (the cursor back in the code after the click on the button, or the key would press the button)
    await page.click('#hand-resume');
    await toEnd();
    m = await midEdit();
    if (m) {
      await page.keyboard.press(' '); await sleep(300);
      let s = await st();
      check(s.hand && s.code === `${m.to} `, 'a key in the middle of the resume typing: the song\'s code, then the key', `hand ${s.hand}, ${s.code.length} characters instead of ${m.to.length + 1}`);
      await page.keyboard.press('ControlOrMeta+Enter'); await sleep(800);
      s = await st();
      check(!s.err, 'Ctrl+Enter after a takeover during resume evaluates without error', s.err);
    } else check(false, 'the resume typing is caught half typed');
  }
  await theme('neon');
  // back to the live build from the top, then the next step
  if ((await st()).hand) await resumeOn();
  await page.focus('#ruler-track'); await page.keyboard.press('Home'); await sleep(1200);
  await nextStep();

  // typing takes over (right after the step: nothing half typed)
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

  // the option on (default): resume goes back to the bar where the user took over (right after a step: nothing half
  // typed, so "back to this code" below evaluates)
  await nextStep();
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
  // (the code evaluated may carry a hidden tail after it: mixer and voice, code-writing)
  check(s.hand && kept && s.code === kept && s.active.startsWith(kept), 'back to this code: by hand again with the user\'s code evaluated', `hand ${s.hand} kept ${!!kept} code ${s.code === kept} active ${s.active.startsWith(kept)}`);

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
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(500);
  const card = `#songs [data-song-id="${v.id}"]`;
  check(await page.$(card) && (await page.innerText(`${card} .badge`)).toLowerCase().includes('cod'), 'the version is a code song in the Songs tab');
  check(!!(await page.$(`#songs [data-song-id="primo-segnale"] [data-version="${v.id}"]`)), 'the original lists its versions');
  // the song list is in pages (#67): search the version so its card is on the page shown
  await page.fill('#sv-q', v.title); await sleep(500);
  await page.click(`${card} [data-act="play"]`); await sleep(1500);
  check(!(await st()).err && (await st()).started, 'the version plays', (await st()).err);
  await page.click('#stop'); await sleep(300);
  // in the radio the version is cropped to the song on air
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.click('#radio-start'); await sleep(2500);
  // the radio: a takeover in the middle of an edit of the song on air completes the edit (takeover-pending-edit)
  await toEnd();
  m = await midEdit();
  if (m) {
    await page.keyboard.press(' '); await sleep(300);
    s = await st();
    check(s.hand && s.code === `${m.to} `, 'radio: a key in the middle of an edit completes the edit, by hand', `hand ${s.hand}, ${s.code.length} characters instead of ${m.to.length + 1}`);
    await page.keyboard.press('ControlOrMeta+Enter'); await sleep(800);
    s = await st();
    check(!s.err, 'radio: Ctrl+Enter after a mid-edit takeover evaluates without error', s.err);
  } else {
    check(false, 'radio: an edit is caught half typed');
    await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type(' '); await sleep(300);
  }
  await page.click('#hand-save'); await sleep(400);
  const lib2 = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-library')).codeSongs);
  const rv = lib2[lib2.length - 1];
  check(rv && !/Before \d/.test(rv.code.match(/const SECTIONS = .*/)[0]) && /<1!/.test(rv.code), 'a radio version keeps only the song on air', rv && rv.code.match(/const SECTIONS = .*/)[0].slice(0, 80));
  await page.click('#radio-start'); await sleep(300);
  check(!(await st()).hand, 'stop ends the hand mode');

  // a takeover during the listening pause of the Live coder typist (takeover-pending-edit D2): the typing of the next
  // step has not shown a frame, the code stays the code playing and gets the key
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(500);
  await page.locator('#track-pick').selectOption('primo-segnale'); await sleep(800);
  if ((await page.getAttribute('#live-human', 'aria-pressed')) !== 'true') await page.click('#live-human');
  await sleep(1500);
  await page.click('#play'); await sleep(3000);
  await nextStep();
  await toEnd();
  const pause = await page.evaluate(() => new Promise(res => {
    const e = document.querySelector('strudel-editor').editor, t0 = Date.now();
    const iv = setInterval(() => {
      const L = globalThis.codingMiskEdit && globalThis.codingMiskEdit();
      if ((L && !L.started) || Date.now() - t0 > 30000) { clearInterval(iv); res(L && !L.started ? { code: e.code, to: L.to } : null); }
    }, 5);
  }));
  if (pause) {
    await page.keyboard.press(' '); await sleep(300);
    s = await st();
    check(s.hand && s.code === `${pause.code} ` && s.code !== `${pause.to} `, 'a key before the typing starts: the code playing and the key, nothing of the next step', `hand ${s.hand}, ${s.code.length} characters, playing ${pause.code.length}`);
    await page.keyboard.press('ControlOrMeta+Enter'); await sleep(800);
    check(!(await st()).err, 'Ctrl+Enter after a takeover in the listening pause evaluates without error', (await st()).err);
  } else check(false, 'the listening pause of the Live coder typist is caught');
  await page.click('#stop'); await sleep(300);

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
