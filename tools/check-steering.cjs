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
  await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'steer-check');
  await page.click('#radio-start'); await sleep(2500);
  const ST = () => page.evaluate(() => { const s = globalThis.codingMiskRadio.steering; return s && { n: s.n, commands: s.commands, plan: s.plan, recipe: s.recipe, build: s.song.build.filter(x => x.by).map(x => ({ at: x.at, add: x.add, remove: x.remove, set: x.set })) }; });
  const now = () => page.evaluate(() => { const r = globalThis.codingMiskRadio.state, it = r.stream[r.onAir]; return document.querySelector('strudel-editor').editor.repl.scheduler.now() - it.start; });
  const err = () => page.evaluate(() => String(document.querySelector('strudel-editor').editor.repl.state.evalError || ''));

  check(await page.isVisible('#radio-steer .steer-console'), 'console shown while the radio plays');
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
  const handle = (await page.$$('#radio-now circle.handle')).pop();
  if (handle) {
    const d = +(await handle.getAttribute('data-d')), box = await handle.boundingBox(), svg = await (await page.$('#radio-now svg.steer')).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, svg.y + svg.height - 6, { steps: 5 }); await page.mouse.up(); await sleep(300);
    st = await ST();
    const c = st.commands.find(x => x.kind === 'curve');
    check(c && c.d === d && c.value <= 0.15 && st.plan.targets[d] === c.value, 'dragging a curve handle queues a curve command', `${JSON.stringify(c)} d=${d} targets=${JSON.stringify(st.plan.targets)} cmds=${JSON.stringify(st.commands.map(x => x.kind))}`);
    if (shots) await (await page.$('#radio-now')).screenshot({ path: path.join(shots, 'curve.png') });
  } else check(false, 'curve handles shown');

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
