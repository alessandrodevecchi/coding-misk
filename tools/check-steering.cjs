// Browser checks for radio steering (#24): console commands queue and apply at their bar, cancel, the energy
// curve drag, the mixer, the scope switch, shortcuts, length commands and replay with steering.
// Usage: PLAYWRIGHT_CORE=... node tools/check-steering.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1300 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'steer-check');
  await page.click('#radio-start'); await sleep(2500);
  const ST = () => page.evaluate(() => { const s = globalThis.codingMiskRadio.steering; return s && { n: s.n, commands: s.commands, plan: s.plan, recipe: s.recipe, build: s.song.build.filter(x => x.by).map(x => ({ at: x.at, add: x.add, remove: x.remove, set: x.set })) }; });
  const now = () => page.evaluate(() => { const r = globalThis.codingMiskRadio.state, it = r.stream[r.onAir]; return document.querySelector('strudel-editor').editor.repl.scheduler.now() - it.start; });
  const err = () => page.evaluate(() => String(document.querySelector('strudel-editor').editor.repl.state.evalError || ''));

  check(await page.isVisible('#radio-steer .steer-console'), 'console shown while the radio plays');
  const tips = await page.$$eval('#radio-steer .steer-btn[disabled]', xs => xs.map(x => x.title));
  check(tips.every(x => x.includes(' · ')), 'disabled buttons say why', tips.slice(0, 3).join(' | '));
  if (shots) await (await page.$('#radio-steer')).screenshot({ path: path.join(shots, 'console.png') });

  // energy up queues at the next phrase and raises the targets; cancel brings them back
  const t0 = (await ST()).plan.targets;
  await page.click('[data-cmd="energy-up"]'); await sleep(300);
  let st = await ST(), n0 = await now();
  check(st.commands.length === 1 && st.commands[0].at > n0 && st.commands[0].at % st.plan.phrase === 0, 'energy up queued at the next phrase', JSON.stringify(st.commands[0]));
  const cur = Math.floor(n0 / (2 * st.plan.phrase));
  check(st.plan.targets.slice(cur + 1).every((x, i) => x >= t0[cur + 1 + i]) && st.plan.targets.slice(cur + 1).some((x, i) => x > t0[cur + 1 + i]), 'targets of the rest of the song rise');
  check((await page.$$('#radio-steer .steer-queue [data-cancel]')).length === 1, 'queue lists the command');
  await page.click('#radio-steer [data-cancel]'); await sleep(300);
  st = await ST();
  check(st.commands.length === 0 && JSON.stringify(st.plan.targets) === JSON.stringify(t0), 'cancel restores the song');

  // an arrangement command applies at its bar, marked as the listener's, shown in the code
  const typeBtn = await page.$('#radio-steer [data-cmd="remove"]:not([disabled])') || await page.$('#radio-steer [data-cmd="add"]:not([disabled])');
  const kind = await typeBtn.getAttribute('data-cmd'), type = await typeBtn.getAttribute('data-type');
  await typeBtn.click(); await sleep(300);
  st = await ST();
  const cmd = st.commands[0];
  check(cmd && cmd.kind === kind && st.build.some(x => x.at === cmd.at && (x.add || x.remove)), `${kind} ${type} written as the listener's step`, JSON.stringify(st.build));
  await page.evaluate(b => globalThis.codingMiskRadio.seek(b), cmd.at - 1); await sleep(300);
  let sawYou = false;
  for (let k = 0; k < 40 && !sawYou; k++) { await sleep(150); sawYou = (await page.evaluate(() => document.querySelector('strudel-editor').editor.code)).includes('// you:'); }
  check(sawYou, 'the code marks the change with "you:"');
  for (let k = 0; k < 40 && (await now()) < cmd.at + 0.3; k++) await sleep(150);
  await sleep(400);
  check((await page.$$('#radio-steer .steer-queue [data-cancel]')).length === 0, 'applied commands leave the queue', `${await page.innerText('#radio-steer .steer-queue')} now ${(await now()).toFixed(1)}`);

  // the curve: drag the last handle down
  await page.$eval('#radio-now', el => el.scrollIntoView({ block: 'center' })); await sleep(300);
  // the card redraws four times a second: take the handle and its box in one go, retrying until both are there
  let handle = null, d = -1, box = null, svg = null;
  for (let k = 0; k < 10 && !box; k++) {
    handle = (await page.$$('#radio-now svg.steer rect.handle')).pop();
    if (handle) { d = +(await handle.getAttribute('data-d').catch(() => -1)); box = await handle.boundingBox().catch(() => null); const sv = await page.$('#radio-now svg.steer'); svg = sv && await sv.boundingBox(); }
    if (!box) await sleep(100);
  }
  if (box && svg) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, svg.y + svg.height - 6, { steps: 5 }); await page.mouse.up(); await sleep(300);
    st = await ST();
    const c = st.commands.find(x => x.kind === 'curve');
    check(c && c.d === d && c.value <= 0.15 && st.plan.targets[d] === c.value, 'dragging a curve handle queues a curve command', `${JSON.stringify(c)} d=${d} targets=${JSON.stringify(st.plan.targets)} cmds=${JSON.stringify(st.commands.map(x => x.kind))}`);
    if (shots) await (await page.$('#radio-now')).screenshot({ path: path.join(shots, 'curve.png') });
  } else check(false, 'curve handles shown');

  // the other curves (#40): folded by default under a summary (#47); the toggle opens four lanes and is remembered
  check(!(await page.isVisible('#radio-now .radio-lanes')) && /density/i.test(await page.innerText('#curves-toggle')), 'details folded by default with a summary');
  await page.click('#curves-toggle'); await sleep(300);
  check(await page.isVisible('#radio-now .radio-lanes') && await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio-details')) === true), 'the toggle opens the details and is remembered');
  // hover: a line in every curve and the values box
  { const sv = await page.$('#radio-now svg.steer'), bb = sv && await sv.boundingBox();
    if (bb) { await page.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height * 0.4); await sleep(400); }
    const tip = await page.evaluate(() => { const el = document.querySelector('.curve-tip'); return el && !el.hidden ? el.querySelectorAll('[data-lane]').length : 0; });
    check(tip === 5 && (await page.$$('#radio-now line.hover')).length === 5, 'hover shows a line in every curve and the values of the part', `${tip}`);
    await page.mouse.move(5, 5); await sleep(300); }
  check((await page.$$eval('#radio-now .radio-lanes .radio-lane', xs => xs.map(x => x.dataset.lane).join())) === 'density,brightness,tension,voice', 'four curve lanes under the energy curve');
  check(await page.$$eval('#radio-now .radio-lanes .radio-lane', xs => xs.every(x => x.title.length > 40)) && /main|principale/i.test(await page.$eval('#radio-now svg.steer > title', x => x.textContent)), 'tooltips explain the curves, energy first');
  let lh = null, lbox = null, lsvg = null, ld = -1;
  for (let k = 0; k < 10 && !lbox; k++) {
    lh = (await page.$$('#radio-now [data-lane="density"] rect.handle')).pop();
    if (lh) { ld = +(await lh.getAttribute('data-d').catch(() => -1)); lbox = await lh.boundingBox().catch(() => null); const sv = await page.$('#radio-now [data-lane="density"] svg'); lsvg = sv && await sv.boundingBox(); }
    if (!lbox) await sleep(100);
  }
  if (lbox && lsvg) {
    await page.mouse.move(lbox.x + lbox.width / 2, lbox.y + lbox.height / 2); await page.mouse.down();
    await page.mouse.move(lbox.x + lbox.width / 2, lsvg.y + lsvg.height - 2, { steps: 5 }); await page.mouse.up(); await sleep(300);
    st = await ST();
    const c = st.commands.find(x => x.kind === 'curve' && x.curve === 'density');
    check(c && c.d === ld && c.value === 1 && st.plan.curves[ld].density === 1, 'dragging a density handle sets a track count', JSON.stringify(c));
    check(await page.isVisible(`#radio-now [data-lane="density"] rect.handle.set[data-d="${ld}"]`), 'a set part is drawn solid');
    if (shots) await (await page.$('#radio-now')).screenshot({ path: path.join(shots, 'lanes.png') });
    await page.click('#radio-now [data-curve-reset="density"]'); await sleep(300);
    st = await ST();
    check(st.commands.some(x => x.kind === 'curve-reset' && x.curve === 'density') && st.plan.curves.every(x => x.density === undefined), 'reset makes the lane automatic again');
    check(/density|densità/i.test(await page.innerText('#radio-steer .steer-queue')), 'curve commands in the queue');
  } else check(false, 'density handles shown');
  // phone width: the lanes fit the card
  if (await page.evaluate(() => !!globalThis.codingMiskRadio.on)) {
    await page.setViewportSize({ width: 390, height: 900 }); await sleep(600);
    const fit = await page.evaluate(() => { const card = document.querySelector('#radio-now'), lanes = [...document.querySelectorAll('#radio-now .curves .radio-lane')]; return lanes.length === 5 && lanes.every(l => l.getBoundingClientRect().right <= card.getBoundingClientRect().right + 1) && document.documentElement.scrollWidth <= 392; });
    check(fit, 'phone: the lanes fit without horizontal scroll');
    if (shots) await (await page.$('#radio-now')).screenshot({ path: path.join(shots, 'lanes-phone.png') });
    await page.setViewportSize({ width: 1300, height: 1300 }); await sleep(400);
    // HW theme: the curves become oscilloscope screens
    await page.click('[data-uitheme="hw"]'); await sleep(500);
    const hw = await page.evaluate(() => { const sc = document.querySelector('#radio-now .curves .screen'); return sc && getComputedStyle(sc).backgroundColor; });
    check(hw === 'rgb(11, 10, 6)', 'HW theme draws the curves on dark screens', hw);
    if (shots) await (await page.$('#radio-now')).screenshot({ path: path.join(shots, 'lanes-hw.png') });
    await page.click('[data-uitheme="neon"]'); await sleep(300);
  }

  // mixer: volume and lock
  const vol = await page.$('#radio-steer [data-mix-vol]');
  const tr = await vol.getAttribute('data-mix-vol');
  await vol.evaluate(el => { el.value = 0.2; el.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
  st = await ST();
  check(st.commands.some(c => c.kind === 'volume' && c.track === tr && c.value === 0.2), 'mixer volume queued for the next bar');
  await page.click(`#radio-steer [data-mix-lock="${tr}"]`); await sleep(300);
  st = await ST();
  check(st.plan.locked.includes(tr), 'lock keeps the director off the track', tr);

  // scope: the whole session moves the slider
  const e0 = +(await page.inputValue('#radio-energy'));
  await page.click('#steer-scope'); await sleep(150);
  await page.click('[data-cmd="energy-up"]'); await sleep(300);
  const e1 = +(await page.inputValue('#radio-energy'));
  check(Math.abs(e1 - e0 - 0.1) < 0.001, 'session scope moves the energy slider', `${e0} → ${e1}`);
  await page.click('#steer-scope'); await sleep(150);

  // keyboard shortcut
  const before = (await ST()).commands.length;
  await page.mouse.click(5, 5); await page.keyboard.press('ArrowDown'); await sleep(300);
  st = await ST();
  check(st.commands.length === before + 1 && st.commands[st.commands.length - 1].kind === 'energy-down', 'shortcut ↓ queues energy down');

  // end the song: it gets shorter, the stream follows
  const bars0 = st.plan.bars;
  await page.click('[data-cmd="end"]'); await sleep(400);
  st = await ST();
  const stream = await page.evaluate(() => globalThis.codingMiskRadio.state.stream.map(x => ({ start: x.start, bars: x.bars })));
  check(st.plan.bars < bars0 && (stream.length < 2 || stream[1].start === stream[0].start + stream[0].bars), 'end shortens the song and the next song follows it', `${bars0} → ${st.plan.bars}`);
  check(!(await err()), 'no evaluation error', (await err()).slice(0, 120));

  // replay: the same steering again
  const recorded = st.recipe.steering.filter(x => x.song === st.n).map(x => x.kind).join();
  await page.click('#radio-replay'); await sleep(3000);
  st = await ST();
  check(st.commands.map(x => x.kind).join() === recorded, 'replay applies the same steering', `${st.commands.map(x => x.kind).join()} / ${recorded}`);
  check(st.plan.bars < bars0, 'replayed song has the same length change');

  await page.click('#radio-start'); await sleep(300);
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
