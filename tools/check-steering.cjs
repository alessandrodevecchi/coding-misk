// Browser checks for radio steering (#24): console commands queue and apply at their bar, cancel, the energy
// curve drag, the mixer, the scope switch, shortcuts, length commands and replay with steering; Vary and Swap with the
// part picker, and the material source next to the knobs (radio-variation); commands as waypoints on a Live coder song
// (radio-profiles stage 5).
// Usage: PLAYWRIGHT_CORE=... node tools/check-steering.cjs [shots-dir]   (dev server on PORT, default 5173)
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
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'steer-check');
  await page.click('#radio-start'); await sleep(2500);
  const ST = () => page.evaluate(() => { const s = globalThis.codingMiskRadio.steering; return s && { n: s.n, commands: s.commands, plan: s.plan, recipe: s.recipe, build: s.song.build.filter(x => x.by).map(x => ({ at: x.at, add: x.add, remove: x.remove, set: x.set, pattern: x.pattern })), patterns: Object.fromEntries(s.song.tracks.map(t => [t.id, t.patterns])) }; });
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
  const typeBtn = await page.$('#radio-steer [data-cmd="less"]:not([disabled])') || await page.$('#radio-steer [data-cmd="more"]:not([disabled])');
  const kind = await typeBtn.getAttribute('data-cmd'), type = await typeBtn.getAttribute('data-inst');
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

  // extend (#45): the button says how long, a press makes the song longer and shows the total; cancelling it also
  // drops a curve edit made after it on the added part
  { const b0 = (await ST()).plan.bars, label = await page.innerText('#radio-steer [data-cmd="extend"]');
    check(/\+\d+ s/.test(label) && /\+\d+ s/.test(await page.getAttribute('#radio-steer [data-cmd="extend"]', 'title')), 'extend says how long one press adds', label);
    await page.click('#radio-steer [data-cmd="extend"]'); await sleep(300);
    let x = await ST();
    const ext = x.commands.find(c => c.kind === 'extend');
    check(ext && x.plan.bars === b0 + 2 * x.plan.phrase && /extended|esteso/.test(await page.innerText('#radio-now .curves-where')), 'extend makes the song longer and shows the total', `${b0} → ${x.plan.bars}`);
    await page.evaluate(d => globalThis.codingMiskRadio.command({ kind: 'curve', curve: 'tension', d, value: 0.8 }), ext.ins); await sleep(200);
    await page.evaluate(id => globalThis.codingMiskRadio.cancel(id), ext.id); await sleep(300);
    x = await ST();
    check(x.plan.bars === b0 && !x.commands.some(c => c.kind === 'extend' || (c.kind === 'curve' && c.curve === 'tension')), 'cancelling an extension drops the later curve edit');
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

  // Vary and Swap (radio-variation): the part picker (lead by default), the queue label, one per part and boundary,
  // cancel, the shortcut, the disabled state with its reason
  { const parts = await page.$$eval('#radio-steer [data-vary-part]', xs => xs.map(x => `${x.dataset.varyPart}:${x.getAttribute('aria-pressed')}`).join());
    check(parts === 'lead:true,bass:false,arp:false,pad:false,guitar:false', 'part picker with the lead picked', parts);
    check(await page.isVisible('#radio-steer [data-cmd="vary"] svg') && await page.isVisible('#radio-steer [data-cmd="swap"] svg'), 'Vary and Swap buttons with drawn icons');
    // a part that plays at the next phrase, and one that does not (its buttons say why); the middle of the song, where
    // more parts play
    { const x = await ST(); await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(x.plan.bars / 2) - 2); await sleep(600);
      // the mixer check locked a track: unlock it, so its part can be varied
      for (const id of x.plan.locked) await page.evaluate(track => globalThis.codingMiskRadio.command({ kind: 'unlock', track }), id);
      await sleep(300); }
    let on = null, off = null;
    for (const p of ['lead', 'bass', 'arp', 'pad', 'guitar']) {
      await page.click(`#radio-steer [data-vary-part="${p}"]`); await sleep(150);
      const d = await page.$eval('#radio-steer [data-cmd="vary"]', b => ({ dis: b.disabled, why: b.dataset.why || '', title: b.title, part: b.dataset.part }));
      if (!d.dis && !on) on = { p, ...d };
      if (d.dis && !off) off = { p, ...d };
    }
    if (off) check(off.why && off.title.includes(' · ') && /\(N\)/.test(off.title), `a disabled Vary says why (${off.p})`, off.title);
    else check(true, 'every part plays: no disabled Vary to show');
    check(!!on, 'some part can be varied', JSON.stringify(off));
    if (on) {
      await page.click(`#radio-steer [data-vary-part="${on.p}"]`); await sleep(150);
      const n0 = (await ST()).commands.length;
      await page.click('#radio-steer [data-cmd="vary"]'); await sleep(300);
      await page.click('#radio-steer [data-cmd="vary"]'); await sleep(300);
      let x = await ST();
      const vs = x.commands.filter(c => c.kind === 'vary');
      check(vs.length === 1 && vs[0].type === on.p && x.commands.length === n0 + 1, 'two Vary of the same part for the same boundary count as one', JSON.stringify(vs));
      const v = vs[0];
      check(x.build.some(s => s.at === v.at && s.pattern && /^V\d+$/.test(s.pattern.to)), 'Vary writes a listener\'s pattern step', JSON.stringify(x.build.filter(s => s.pattern)));
      const q = await page.innerText('#radio-steer .steer-queue');
      check(new RegExp(`(Vary|Varia) \\S+`).test(q), 'the queue says "Vary <part>"', q.replace(/\n/g, ' | '));
      await page.click(`#radio-steer [data-cancel="${v.id}"]`); await sleep(300);
      x = await ST();
      check(!x.commands.some(c => c.kind === 'vary') && !Object.values(x.patterns).some(ps => Object.keys(ps).some(k => /^V\d+$/.test(k))), 'cancel leaves the part as it was');
      await page.mouse.click(5, 5); await page.keyboard.press('n'); await sleep(300);
      x = await ST();
      check(x.commands.some(c => c.kind === 'vary' && c.type === on.p), 'shortcut N varies the picked part');
      const sw = await page.$eval('#radio-steer [data-cmd="swap"]', b => ({ dis: b.disabled, title: b.title }));
      check(/\(W\)/.test(sw.title), 'Swap shows its shortcut W', sw.title);
      if (!sw.dis) {
        await page.keyboard.press('w'); await sleep(300);
        x = await ST();
        const s1 = x.commands.find(c => c.kind === 'swap');
        const step = s1 && x.build.find(s => s.at === s1.at && s.pattern && /^S\d+$/.test(s.pattern.to));
        const pat = step && x.patterns[step.pattern.track][step.pattern.to];
        check(step && pat && !pat.idea, 'Swap puts another ready part, not a composed one', JSON.stringify(pat));
      } else check(/ · /.test(sw.title), 'a disabled Swap says why', sw.title);
      check(!(await err()), 'no evaluation error after Vary and Swap', (await err()).slice(0, 120));
    }
    await page.click('#radio-steer [data-vary-part="lead"]'); await sleep(150);
  }

  // end the song: it gets shorter, the stream follows
  const bars0 = st.plan.bars;
  await page.click('[data-cmd="end"]'); await sleep(400);
  st = await ST();
  const stream = await page.evaluate(() => globalThis.codingMiskRadio.state.stream.map(x => ({ start: x.start, bars: x.bars })));
  check(st.plan.bars < bars0 && (stream.length < 2 || stream[1].start === stream[0].start + stream[0].bars), 'end shortens the song and the next song follows it', `${bars0} → ${st.plan.bars}`);
  check(!(await err()), 'no evaluation error', (await err()).slice(0, 120));

  // replay: the same steering again
  const recorded = st.recipe.steering.filter(x => x.song === st.n).map(x => x.kind).join();
  const listenerParts = x => JSON.stringify(Object.entries(x.patterns).map(([id, ps]) => [id, Object.fromEntries(Object.entries(ps).filter(([k]) => /^[VS]\d+$/.test(k)))]));
  const heard = listenerParts(st);
  await page.click('#radio-replay'); await sleep(3000);
  st = await ST();
  check(st.commands.map(x => x.kind).join() === recorded, 'replay applies the same steering', `${st.commands.map(x => x.kind).join()} / ${recorded}`);
  check(st.plan.bars < bars0, 'replayed song has the same length change');
  check(listenerParts(st) === heard && /[VS]1/.test(heard), 'replay gives the varied and swapped parts the same notes');

  // the material source next to the knobs (radio-variation 6.2): the song on air stays, the next song takes it, the
  // recipe records it; Settings keeps the default
  // (a new session: a replay plays its recipe and records no changes)
  await page.click('#radio-start'); await sleep(300); await page.fill('#radio-seed', 'steer-material'); await page.click('#radio-start'); await sleep(2500);
  { const def0 = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio') || '{}').materialDefault);
    check(await page.isVisible('.radio-ctrls .mat-source [data-material="mix"]') && (await page.$$('.radio-ctrls .mat-source [data-material]')).length === 4, 'material source in the console, next to the knobs');
    const before = await page.evaluate(() => { const r = globalThis.codingMiskRadio.state; return { id: r.stream[r.onAir].id, n: r.onAir }; });
    await page.click('.radio-ctrls .mat-source [data-material="patterns"]'); await sleep(300);
    const after = await page.evaluate(() => { const r = globalThis.codingMiskRadio.state; return { id: r.stream[r.onAir].id, n: r.onAir }; });
    check(after.id === before.id && (await page.getAttribute('.radio-ctrls .mat-source [data-material="patterns"]', 'aria-pressed')) === 'true', 'the song on air plays on when the source changes');
    for (let k = 0; k < 2; k++) { await page.evaluate(() => globalThis.codingMiskRadio.skip()); await sleep(1500); }
    const rec = await page.evaluate(() => globalThis.codingMiskRadio.state.recipe);
    const ch = (rec.changes || []).find(c => c.options && c.options.material === 'patterns');
    check(!!ch && ch.song > before.n, 'the recipe records the source from a later song', JSON.stringify((rec.changes || []).map(c => [c.song, c.options.material])));
    check((await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio') || '{}').materialDefault)) === def0, 'the console leaves the default of the settings alone');
    await page.click('.radio-ctrls .mat-source [data-material="mix"]'); await sleep(200);
  }

  // the Profile control next to Transitions and Harmony (radio-profiles 4.5): the song on air plays on, the next
  // song takes it, the recipe records it for the replay, and a replay grows the same songs
  await page.click('#radio-start'); await sleep(300); await page.fill('#radio-seed', 'steer-profile'); await page.click('#radio-start'); await sleep(2500);
  {
    check(await page.isVisible('.radio-how #radio-profile') && (await page.$$('#radio-profile option')).length === 5, 'Profile control in the console, with Custom');
    const before = await page.evaluate(() => { const r = globalThis.codingMiskRadio.state; return { id: r.stream[r.onAir].id, n: r.onAir, profile: r.stream[r.onAir].profile }; });
    await page.selectOption('#radio-profile', 'switch'); await sleep(300);
    const after = await page.evaluate(() => { const r = globalThis.codingMiskRadio.state; return { id: r.stream[r.onAir].id, profile: r.stream[r.onAir].profile }; });
    check(after.id === before.id && after.profile === before.profile, 'the song on air plays on when the profile changes', JSON.stringify([before, after]));
    for (let k = 0; k < 2; k++) { await page.evaluate(() => globalThis.codingMiskRadio.skip()); await sleep(2500); }
    const r = await page.evaluate(() => globalThis.codingMiskRadio.state), cur = r.stream[r.onAir];
    const ch = (r.recipe.changes || []).find(c => c.options && c.options.profile === 'switch');
    check(cur.profile === 'switch' && cur.grown, 'the next song takes the profile and grows', JSON.stringify({ profile: cur.profile, grown: cur.grown }));
    check(!!ch && ch.song > before.n, 'the recipe records the profile from a later song', JSON.stringify((r.recipe.changes || []).map(c => [c.song, c.options.profile])));
    check(/Live coder/.test(await page.innerText('.radio-profile-now')), 'now playing shows the profile of the song on air');
    await page.click('#radio-replay'); await sleep(2500);
    for (let k = 0; k < r.onAir; k++) { await page.evaluate(() => globalThis.codingMiskRadio.skip()); await sleep(2500); }
    // (the songs skipped are cut where the skip came: their bars are left out, the song on air keeps its own)
    const re = await page.evaluate(() => { const s = globalThis.codingMiskRadio.state; return s.stream.slice(0, s.onAir + 1).map((x, i) => [x.id, x.profile, i === s.onAir ? x.bars : 0, x.shape && x.shape.opening]); });
    check(JSON.stringify(re) === JSON.stringify(r.stream.slice(0, r.onAir + 1).map((x, i) => [x.id, x.profile, i === r.onAir ? x.bars : 0, x.shape && x.shape.opening])), 'replay gives the same profiles and grown songs', JSON.stringify(re));
    check(!(await err()), 'no evaluation error with the grown songs');
    await page.selectOption('#radio-profile', 'artist'); await sleep(200);
  }

  // commands as waypoints on a Live coder song (radio-profiles stage 5): the boundary leaves time to type, the steps
  // before it stay, the moves are the listener's, mute is typed as "_$:", a volume as ".gain()" on the line, Vary as
  // notes edits, End takes the lines out one at a time, and a replay gives the same song
  await page.click('#radio-start'); await sleep(300);
  // (the Live coder shows only the title as comments, radio-profiles 9.2: Custom from the Live coder with the track
  // names, so the lines of a track can be found; the same growth, and the steering measures the typing the same way)
  await page.selectOption('#radio-profile', 'custom'); await sleep(200);
  if (await page.getAttribute('#custom-toggle', 'aria-expanded') !== 'true') await page.click('#custom-toggle');
  await page.click('[data-custom-base="switch"]'); await sleep(100);
  await page.selectOption('[data-custom="comments"]', 'essential'); await sleep(100);
  await page.fill('#radio-seed', 'steer-air'); await page.click('#radio-start'); await sleep(3000);
  {
    const AIR = () => page.evaluate(() => { const r = globalThis.codingMiskRadio, s = r.steering, st = r.state; if (!s || !st) return null; const it = st.stream[st.onAir]; return { n: s.n, commands: s.commands, song: s.song, grown: it.grown, growing: it.growing, start: it.start, bars: it.bars, stream: st.stream.map(x => ({ start: x.start, bars: x.bars })) }; });
    const settled = async () => { let x = null; for (let k = 0; k < 80; k++) { x = await AIR(); if (x && !x.growing && x.commands.every(c => !c.pend)) return x; await sleep(250); } return x; };
    const code = () => page.evaluate(() => document.querySelector('strudel-editor').editor.code);
    const mineOf = (song, from) => song.build.filter(x => x.by === 'listener' && x.at >= from);
    const pastOf = (song, B) => JSON.stringify(song.build.filter(x => x.at < B));
    const lastWp = song => ((song.onAir && song.onAir.waypoints) || []).slice(-1)[0];
    const seekTo = async b => { await page.evaluate(x => globalThis.codingMiskRadio.seek(x), b); await sleep(700); };
    const waitCode = async (bar, test) => { for (let k = 0; k < 60 && (await now()) < bar + 0.2; k++) await sleep(150); for (let k = 0; k < 20; k++) { if (test(await code())) return true; await sleep(150); } return false; };
    let a = await settled();
    check(a && a.grown && a.song.onAir && a.song.crescendo, 'a Live coder song grows on air', JSON.stringify(a && { grown: a.grown }));
    if (a && a.song.crescendo) {
      const G = a.song.crescendo.growth, total = a.song.sections.reduce((x, y) => x + y.bars, 0);
      await seekTo(G + Math.floor((total - G) * 0.12));
      // energy up: the boundary is a phrase of the plan, later than the bar it came; the steps before it stay
      const before = a.song;
      await page.click('[data-cmd="energy-up"]'); await sleep(300);
      a = await settled();
      const c = a.commands[a.commands.length - 1], wp = lastWp(a.song);
      check(c && c.kind === 'energy-up' && c.at > c.q && wp && wp.at === c.at && wp.to > c.at, 'energy up on a grown song: a waypoint from its boundary', JSON.stringify({ c, wp }));
      { const x = before.build.filter(k => k.at < c.at), y = a.song.build.filter(k => k.at < c.at), i = x.findIndex((k, j) => JSON.stringify(k) !== JSON.stringify(y[j]));
        check(pastOf(a.song, c.at) === pastOf(before, c.at), 'the steps before the boundary stay', i < 0 ? `${x.length} / ${y.length}` : `${JSON.stringify(x[i])} / ${JSON.stringify(y[i])}`); }
      check(mineOf(a.song, 0).every(x => x.at >= c.at && x.at < wp.to), 'the moves are the listener\'s, between the boundary and the arrival', JSON.stringify(mineOf(a.song, 0).map(x => x.at)));
      check((await page.innerText('#radio-steer .steer-queue')).includes(String(c.at + 1)), 'the queue shows the boundary the typing needs', await page.innerText('#radio-steer .steer-queue'));
      if (shots) await (await page.$('#radio-steer')).screenshot({ path: path.join(shots, 'air-queue.png') });
      // Vary: the new part reached by notes edits of the line
      await seekTo(wp.to + 1);
      let varied = null;
      for (const p of ['bass', 'lead', 'pad', 'arp']) { if (await page.evaluate(type => globalThis.codingMiskRadio.command({ kind: 'vary', type }), p)) { varied = p; break; } }
      a = await settled();
      const vc = a.commands.find(x => x.kind === 'vary'), vwp = lastWp(a.song);
      const edits = vc ? a.song.build.filter(x => x.by === 'listener' && x.notes && x.at >= vc.at && x.at < vwp.to) : [];
      check(!!varied && edits.length >= 1, 'Vary on a grown song: notes edits of the line', JSON.stringify({ varied, edits: edits.map(x => x.at), vc }));
      check(!(await err()), 'no evaluation error after Vary', (await err()).slice(0, 120));
      // End: the lines go one at a time, the song still ends with its outro, the next song follows it
      const b0 = a.bars, n0 = a.n;
      await page.click('[data-cmd="end"]'); await sleep(300);
      a = await settled();
      const ec = a.commands.find(x => x.kind === 'end'), ewp = lastWp(a.song), gone = ec ? a.song.build.filter(x => x.by === 'listener' && x.at >= ec.at && (x.remove !== undefined || x.mute !== undefined)) : [];
      check(a.n === n0 && ec && ewp && ewp.kind === 'end' && a.bars <= b0 && a.song.sections.reduce((x, y) => x + y.bars, 0) > ewp.to, 'End on a grown song: a last waypoint before the outro, no cut', JSON.stringify({ ec, ewp, b0, bars: a.bars }));
      check(new Set(gone.map(x => x.at)).size === gone.length, 'End takes the lines out one at a time', JSON.stringify(gone.map(x => x.at)));
      check(a.stream.length < 2 || a.stream[1].start === a.stream[0].start + a.stream[0].bars, 'the next song follows the steered song', JSON.stringify(a.stream));
      if (shots) await (await page.$('#radio-steer')).screenshot({ path: path.join(shots, 'air-end.png') });
      // mute and volume on the next bars: typed in the code
      const at = Math.floor(await now()) + 2;
      const on = a.song.tracks.filter(t => t.type !== 'voice' && t.type !== 'spoken' && !t.mute && t.clips.some(k => k.start <= at && at < k.start + k.bars));
      const t1 = (on.find(t => t.type !== 'drums') || on[0] || {}).id, t2 = (on.find(t => t.id !== t1) || {}).id;
      const nameOf = id => { const t = a.song.tracks.find(x => x.id === id); return (t && (t.name || t.id)) || id; };
      // the lines of a track's block in the code shown (its header holds its name)
      const block = (cd, id) => { const ls = cd.split('\n'), i = ls.findIndex(l => l.startsWith('// ==========') && l.includes(` ${nameOf(id)} `)); if (i < 0) return []; const j = ls.findIndex((l, k) => k > i && l.startsWith('// ==========')); return ls.slice(i + 1, j < 0 ? undefined : j); };
      if (t1) await page.evaluate(track => globalThis.codingMiskRadio.command({ kind: 'volume', track, value: 0.3 }), t1);
      if (t2) await page.evaluate(track => globalThis.codingMiskRadio.command({ kind: 'mute', track }), t2);
      await sleep(300);
      a = await settled();
      const m = t2 && a.song.build.find(x => x.by === 'listener' && x.mute === t2), v = t1 && a.song.build.find(x => x.by === 'listener' && x.set && x.set.track === t1 && x.set.gain === 0.3);
      check(!!m && !!v, 'mute and volume on a grown song: steps on the lines', JSON.stringify(mineOf(a.song, 0).slice(-5)));
      if (v) { await seekTo(v.at - 1); check(await waitCode(v.at, cd => block(cd, t1).some(l => l.includes('.gain(0.3)'))), 'the volume shows as .gain(0.3) on the line', block(await code(), t1).join(' | ').slice(0, 200)); }
      if (m) { await seekTo(m.at - 1); check(await waitCode(m.at, cd => block(cd, t2).some(l => /^_\$:/.test(l))), 'the muted line shows "_$:"', block(await code(), t2).join(' | ').slice(0, 200)); }
      check(!(await err()), 'no evaluation error after the mixer commands', (await err()).slice(0, 120));
      // replay: the same commands give the same song
      const heard = JSON.stringify(a.song.build), kinds = a.commands.map(x => x.kind).join();
      await page.click('#radio-replay'); await sleep(3000);
      const r = await settled();
      check(r && r.n === n0 && r.commands.map(x => x.kind).join() === kinds && JSON.stringify(r.song.build) === heard, 'replay gives the same waypoints', r && `${r.n} ${r.commands.map(x => x.kind).join()} / ${kinds}`);
      check(!(await err()), 'no evaluation error with commands as waypoints', (await err()).slice(0, 120));
    }
    await page.selectOption('#radio-profile', 'artist'); await sleep(200);
  }


  // ---------- arrangement by instrument (radio-arrangement phase 2) ----------
  // (a fresh session in berlin-techno; the plan and the song from the page's own modules)
  await page.click('#radio-start'); await sleep(300); await page.fill('#radio-seed', 'steer-arr'); await page.click('#radio-start'); await sleep(2500);
  {
    const A = () => page.evaluate(async () => {
      const R = globalThis.codingMiskRadio, s = R.steering, { stateAt } = await import('/src/song/build.js'), S = await import('/src/endless/steering.js');
      const st = R.state, it = st.stream[st.onAir], rel = document.querySelector('strudel-editor').editor.repl.scheduler.now() - it.start;
      const at = Math.min(s.plan.bars - 1, S.applyBar('more', rel, s.plan));
      const on = b => stateAt(s.song, b).song.tracks.filter(t => !t.mute && !['voice', 'spoken'].includes(t.type)).map(t => t.id);
      return { s, at, rel, on: on(at), commands: s.commands };
    });
    const onAt = (b) => page.evaluate(async b => { const { stateAt } = await import('/src/song/build.js'), s = globalThis.codingMiskRadio.steering; return stateAt(s.song, b).song.tracks.filter(t => !t.mute && !['voice', 'spoken'].includes(t.type)).map(t => t.id); }, b);
    const shownParts = await page.$$eval('#radio-steer .arr-inst', xs => xs.map(x => x.dataset.arr));
    check(shownParts.length >= 5 && shownParts.every(p => ['kick', 'beat', 'bass', 'texture', 'arp', 'hook', 'guitar', 'pad'].includes(p)) && !shownParts.includes('guitar'), 'one − and + per instrument of the style, no guitar in berlin-techno', shownParts.join());
    check((await page.$$('#radio-steer .arr-row')).length === 2 && await page.isVisible('#radio-steer .arr-riser [data-cmd="riser"]'), 'two rows of instruments and the riser row');
    check(!(await page.$('#radio-steer [data-cmd="add"]')) && !(await page.$('#radio-steer [data-cmd="remove"]')), 'the coarse drums and lead buttons are gone');
    check((await page.$$('#radio-steer .arr-lock svg')).length === shownParts.length + 1 && !(await page.innerText('#radio-steer')).match(/🔒|🔓/), 'drawn lock icons, no emoji');
    // + pad twice: two pads more, the queue names the tracks; − takes the last one added
    const p0 = (await A()).on.filter(id => /^pad/.test(id)).length;
    await page.click('#radio-steer [data-cmd="more"][data-inst="pad"]'); await sleep(250);
    await page.click('#radio-steer [data-cmd="more"][data-inst="pad"]'); await sleep(300);
    let a = await A();
    const at = a.commands[a.commands.length - 1].at, pads = (await onAt(at)).filter(id => /^pad/.test(id));
    check(pads.length === p0 + 2, '+ pad twice: two more pads from the next phrase', `${p0} → ${pads}`);
    const q = await page.innerText('#radio-steer .steer-queue');
    check(/\+ pad \(Pad( \d)?\)/.test(q), 'the queue names the track: "+ pad (Pad 2)"', q.replace(/\n/g, ' | '));
    await page.click('#radio-steer [data-cmd="less"][data-inst="pad"]'); await sleep(300);
    a = await A();
    const left = (await onAt(at)).filter(id => /^pad/.test(id));
    check(left.length === p0 + 1 && !left.includes(a.s.plan.added[a.s.plan.added.length - 1] && a.s.plan.added.slice(-1)[0].id === pads[pads.length - 1] ? 'x' : pads[pads.length - 1]), '− pad takes the last one added', `${pads} → ${left}`);
    // cancel the −: both pads again
    const lessId = a.commands.find(c => c.kind === 'less').id;
    await page.click(`#radio-steer [data-cancel="${lessId}"]`); await sleep(300);
    check((await onAt(at)).filter(id => /^pad/.test(id)).length === p0 + 2, 'cancel brings the pad back');
    // two kicks: the badge and the warning line
    await page.click('#radio-steer [data-cmd="more"][data-inst="kick"]'); await sleep(300);
    a = await A();
    const kicks = (await onAt(at)).filter(id => /^kick/.test(id)).length;
    const badge = await page.$eval('#radio-steer [data-arr="kick"]', x => ({ over: x.classList.contains('over'), n: (x.querySelector('.arr-count') || {}).textContent || '' })).catch(() => ({}));
    const warn = await page.isVisible('#radio-steer .arr-warn') ? await page.innerText('#radio-steer .arr-warn') : '';
    // (the badge counts the next phrase; the + applies there)
    check(kicks >= 2, 'a second kick plays', `${kicks}`);
    // the owner's test in the browser: seek two phrases past the + pad, the pads still play and have mixer rows
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), at + 2 * a.s.plan.phrase + 0.3); await sleep(1500);
    const later = (await onAt(at + 2 * a.s.plan.phrase)).filter(id => /^pad/.test(id));
    const rows = await page.$$eval('#radio-steer [data-mix-vol]', xs => xs.map(x => x.dataset.mixVol));
    check(later.length === p0 + 2 && later.every(id => rows.includes(id)), "owner's test: two phrases later the added pads still play, with their mixer rows", `${later} / ${rows}`);
    const b2 = await page.$eval('#radio-steer [data-arr="kick"]', x => ({ over: x.classList.contains('over'), n: (x.querySelector('.arr-count') || {}).textContent || '' })).catch(() => ({}));
    const w2 = await page.isVisible('#radio-steer .arr-warn') ? await page.innerText('#radio-steer .arr-warn') : '';
    check(b2.over && /×2/.test(b2.n) && /1/.test(w2) && /kick|cassa/i.test(w2), 'two kicks: the badge in the warning colour and a line with the recommended values', JSON.stringify({ badge, warn, b2, w2 }));
    const tipPlus = await page.getAttribute('#radio-steer [data-cmd="more"][data-inst="kick"]', 'title');
    check(/×3/.test(tipPlus), 'the + tooltip warns before the press', tipPlus);
    // lock the pad: the mixer rows of the pads lock too; unlocking one row gives the half state
    await page.click('#radio-steer [data-lock-part="pad"]'); await sleep(300);
    a = await A();
    const padRows = await page.$$eval('#radio-steer [data-mix-lock]', xs => xs.filter(x => /^pad/.test(x.dataset.mixLock)).map(x => [x.dataset.mixLock, x.getAttribute('aria-pressed')]));
    check(a.s.plan.lockedParts.includes('pad') && padRows.length >= 2 && padRows.every(([, p]) => p === 'true') && (await page.getAttribute('#radio-steer [data-lock-part="pad"]', 'data-state')) === 'closed', 'locking the pad locks its mixer rows', JSON.stringify(padRows));
    await page.click(`#radio-steer [data-mix-lock="${padRows[padRows.length - 1][0]}"]`); await sleep(300);
    check((await page.getAttribute('#radio-steer [data-lock-part="pad"]', 'data-state')) === 'half' && /1|2/.test(await page.getAttribute('#radio-steer [data-lock-part="pad"]', 'title')), 'unlocking one row in the mixer shows the half state', await page.getAttribute('#radio-steer [data-lock-part="pad"]', 'title'));
    await page.click('#radio-steer [data-lock-part="pad"]'); await sleep(300);
    check((await page.getAttribute('#radio-steer [data-lock-part="pad"]', 'data-state')) === 'closed', 'a click on the half lock locks them all');
    check(/pad: (locked|bloccato)/.test(await page.innerText('#radio-steer .steer-queue')), 'the queue says "pad: locked"');
    await page.click('#radio-steer [data-lock-part="pad"]'); await sleep(300);
    check((await page.getAttribute('#radio-steer [data-lock-part="pad"]', 'data-state')) === 'open', 'the lock opens again');
    // the riser row: 4 bars, up; placed on the next part change
    await page.selectOption('#radio-steer [data-riser="bars"]', '4'); await sleep(200);
    check((await page.$$eval('#radio-steer [data-riser="sound"] option', xs => xs.length)) === 1, 'the Sound dropdown shows its one option');
    await page.click('#radio-steer [data-cmd="riser"]'); await sleep(300);
    a = await A();
    const r = a.s.plan.risers[0];
    check(r && r.bars === 4 && r.dir === 'up' && r.end === r.change && r.start === r.change - 4, 'a riser of 4 bars ends on the next part change', JSON.stringify(r));
    check(/riser 4 (bars|battute), (up|sale)/.test(await page.innerText('#radio-steer .steer-queue')), 'the queue says "riser 4 bars, up"');
    // the target of Vary and Swap (radio-arrangement phase 3): Auto and the pads by name; a named pad varies alone, the
    // queue names it; the target goes back to Auto when its track stops
    await page.click('#radio-steer [data-vary-part="pad"]'); await sleep(250);
    const opts3 = await page.$$eval('#radio-steer [data-vary-target] option', xs => xs.map(x => [x.value, x.textContent]));
    check(opts3[0][0] === 'auto' && opts3.filter(([v]) => /^pad/.test(v)).length >= 2, 'the target lists Auto and the pads by name', JSON.stringify(opts3));
    const lastPad = opts3[opts3.length - 1][0];
    await page.selectOption('#radio-steer [data-vary-target]', lastPad); await sleep(250);
    await page.click('#radio-steer [data-cmd="vary"]'); await sleep(400);
    a = await A();
    const vc = a.commands.filter(c => c.kind === 'vary').pop();
    const vsteps = a.s.song.build.filter(x => x.at === vc.at && x.by === 'listener' && x.pattern && /^V\d+$/.test(x.pattern.to)).map(x => x.pattern.track);
    check(vc.target === lastPad && vsteps.length === 1 && vsteps[0] === lastPad, 'a named target varies that track only', JSON.stringify({ vc, vsteps }));
    check(new RegExp(`(Vary|Varia) pad \\(${opts3[opts3.length - 1][1]}\\)`).test(await page.innerText('#radio-steer .steer-queue')), 'the queue names the target', await page.innerText('#radio-steer .steer-queue'));
    await page.selectOption('#radio-steer [data-vary-target]', 'auto'); await sleep(200);
    await page.click('#radio-steer [data-cmd="swap"]').catch(() => {}); await sleep(400);
    a = await A();
    const sc = a.commands.filter(c => c.kind === 'swap').pop();
    if (sc) check(sc.target === 'auto' && /(Swap|Scambia) pad \(/.test(await page.innerText('#radio-steer .steer-queue')), 'Auto swaps one pad and the queue says which', JSON.stringify(sc));
    await page.selectOption('#radio-steer [data-vary-target]', lastPad); await sleep(200);
    await page.evaluate(p => globalThis.codingMiskRadio.command({ kind: 'less', part: 'pad' }), 'pad'); await sleep(400);
    const tg = await page.$eval('#radio-steer [data-vary-target]', x => x.value);
    check(tg === 'auto' || (await A()).on.includes(lastPad), 'the target goes back to Auto when its track stops', tg);
    await page.click('#radio-steer [data-vary-part="lead"]'); await sleep(200);
    // shortcuts: a digit adds, Shift and the digit removes
    const order = await page.$$eval('#radio-steer .arr-inst', xs => xs.map(x => x.dataset.arr));
    const n0 = (await A()).commands.length;
    await page.mouse.click(5, 5); await page.keyboard.press('Digit3'); await sleep(300);
    a = await A();
    const last = a.commands[a.commands.length - 1];
    check(a.commands.length === n0 + 1 && last.kind === 'more' && last.part === order[2], 'shortcut 3 adds the third instrument', JSON.stringify(last));
    await page.keyboard.press('Shift+Digit3'); await sleep(300);
    a = await A();
    check(a.commands[a.commands.length - 1].kind === 'less' && a.commands[a.commands.length - 1].part === order[2], 'Shift+3 removes one', JSON.stringify(a.commands.slice(-1)));
    // the cap: 12 tracks, then every + is off with its reason
    for (let k = 0; k < 16; k++) { const s2 = await A(); if (s2.on.filter(id => !/riser/.test(id)).length >= 12) break; await page.evaluate(p => globalThis.codingMiskRadio.command({ kind: 'more', part: p }), order[k % order.length]); await sleep(150); }
    await sleep(400);
    const plus = await page.$$eval('#radio-steer [data-cmd="more"]', xs => xs.map(x => [x.disabled, x.dataset.why]));
    const n12 = (await A()).on.filter(id => !/riser/.test(id)).length;
    check(n12 === 12 && plus.every(([d, w]) => d && w === 'cap'), 'at 12 tracks every + is off: cap', `${n12} ${JSON.stringify(plus)}`);
    check(/12/.test(await page.innerText('#radio-steer .arr-info')), 'the count line shows the cap');
    check(!(await err()), 'no evaluation error with 12 tracks', (await err()).slice(0, 120));
    if (shots) await (await page.$('#radio-steer')).screenshot({ path: path.join(shots, 'arrangement-en.png') });
    // labels in Italian
    await page.evaluate(() => localStorage.setItem('coding-misk-lang', 'it')); await page.reload(); await sleep(3500);
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    await page.fill('#radio-seed', 'steer-arr'); await page.click('#radio-start'); await sleep(2500);
    const labels = await page.$$eval('#radio-steer .arr-pm', xs => xs.map(x => x.getAttribute('aria-label')));
    check(['+ cassa', '− cassa', '+ ritmica', '+ basso'].every(x => labels.includes(x)) && /Riser al prossimo cambio/.test(await page.innerText('#radio-steer .arr-riser')), 'Italian labels: "+ cassa", "− cassa", "+ ritmica", "+ basso", riser row', labels.join(', '));
    if (shots) await (await page.$('#radio-steer')).screenshot({ path: path.join(shots, 'arrangement-it.png') });
    await page.evaluate(() => localStorage.setItem('coding-misk-lang', 'en'));
  }

  // ---------- Add a saved pattern (radio-arrangement phase 4) ----------
  {
    const mine = [
      { id: 'p-bass', name: 'Basso mio', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' }, sound: 'sawtooth', settings: { wave: 'sawtooth', gain: 0.7 }, context: { key: 'A', chords: 'notturna', meter: '4/4', bpm: 128, mode: 'minor' }, styles: ['jazz'], source: 'compose', created: '2026-10-26' },
      { id: 'p-hook', name: 'Melodia mia', kind: 'melodies', type: 'hook', pattern: { idea: { degrees: '<0 2 4 ~ 3 1>' } }, sound: 'square', settings: { wave: 'square', gain: 0.3 }, context: { key: 'A', chords: 'notturna', meter: '4/4', bpm: 60, mode: 'minor' }, styles: [], source: 'compose', created: '2026-10-26' },
      { id: 'p-odd', name: 'Dispari', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' }, sound: 'sawtooth', settings: {}, context: { key: 'A', chords: 'notturna', meter: '7/8', bpm: 120, mode: 'minor' }, styles: [], source: 'compose', created: '2026-10-26' },
    ];
    await page.evaluate(list => { localStorage.setItem('coding-misk-patterns', JSON.stringify(list)); localStorage.setItem('coding-misk-lang', 'en'); localStorage.removeItem('coding-misk-radio-saved-open'); }, mine);
    await page.reload(); await sleep(3500);
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    await page.fill('#radio-seed', 'steer-saved'); await page.click('#radio-start'); await sleep(2500);
    const head = await page.innerText('#sp-toggle');
    check(/\(2\)/.test(head) && (await page.$$('#radio-steer .sp-list .sp-row')).length === 2 && /1 in another meter/.test(await page.innerText('#radio-steer .sp')), 'the panel lists the 2 patterns that fit, folded, and counts the 7/8 one', `${head} | ${await page.innerText('#radio-steer .sp')}`);
    const painted = await page.$$eval('#radio-steer canvas[data-sp-pv]', cs => cs.map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; }));
    check(painted.length === 2 && painted.every(n => n > 20), 'each row has a preview drawing', JSON.stringify(painted));
    await page.click('#sp-toggle'); await sleep(300);
    check((await page.$$('#radio-steer .sp-card')).length === 2 && await page.isVisible('#radio-steer [data-sp-new="p-bass"]') && await page.isVisible('#radio-steer [data-sp-replace="p-bass"]'), 'open: cards with Add as new track and Replace');
    check(/feel different/.test(await page.innerText('#radio-steer .sp-cards')), 'a pattern saved at 60 BPM warns about the tempo');
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio-saved-open')) === true), 'the open panel is remembered');
    // the preview: rides the radio, which goes on (not paused, its bars run), with the radio lower; a second press stops
    const t0 = await now();
    await page.click('#radio-steer [data-sp-listen="p-bass"]'); await sleep(1500);
    const pv = await page.evaluate(() => globalThis.codingMiskRadioPreview.state);
    const t1 = await now();
    check(pv && pv.riding && /note|n\(/.test(pv.expr) && t1 > t0 + 0.5 && !(await page.evaluate(() => globalThis.codingMiskRadio.paused)), 'listen: the pattern rides the radio, which keeps playing', JSON.stringify({ pv: pv && { riding: pv.riding }, t0, t1 }));
    check((await page.getAttribute('#radio-steer [data-sp-listen="p-bass"]', 'aria-pressed')) === 'true', 'the listen button shows it plays');
    const ducked = await page.evaluate(() => { const s = document.querySelector('strudel-editor').editor.repl.scheduler, hs = s.pattern.queryArc(s.lastEnd, s.lastEnd + 1); return hs.some(h => h.value && h.value.velocity !== undefined && h.value.velocity <= 0.26 && h.value.orbit !== 40) && hs.some(h => h.value && h.value.orbit === 40); });
    check(ducked, 'the radio plays 12 dB lower under the preview (velocity a quarter), the preview on its own bus');
    await page.click('#radio-steer [data-sp-listen="p-hook"]'); await sleep(800);
    check((await page.evaluate(() => globalThis.codingMiskRadioPreview.state && globalThis.codingMiskRadioPreview.state.riding)) && (await page.getAttribute('#radio-steer [data-sp-listen="p-bass"]', 'aria-pressed')) === 'false', 'another preview takes over');
    await page.click('#radio-steer [data-sp-listen="p-hook"]'); await sleep(500);
    check(!(await page.evaluate(() => globalThis.codingMiskRadioPreview.state)), 'a second press stops the preview');
    // add as a new track: a bass track with the pattern; the queue names it
    await page.click('#radio-steer [data-sp-new="p-bass"]'); await sleep(400);
    let x = await ST();
    const pc = x.commands.find(c => c.kind === 'pattern');
    const added = await page.evaluate(() => globalThis.codingMiskRadio.steering.plan.added.slice(-1)[0]);
    check(pc && pc.mode === 'new' && pc.item.name === 'Basso mio' && added && JSON.stringify(x.patterns[added.id].A) === JSON.stringify({ preset: 'rolling' }), 'Add as new track: a new bass with the saved bassline', JSON.stringify({ pc: pc && pc.mode, added }));
    check(/\+ Basso mio \(/.test(await page.innerText('#radio-steer .steer-queue')), 'the queue says "+ Basso mio (…)"', await page.innerText('#radio-steer .steer-queue'));
    // replace: the saved melody in place of a playing track of its type, when one plays
    const rep = await page.$('#radio-steer [data-sp-replace="p-hook"]:not([disabled])');
    if (rep) {
      await rep.click(); await sleep(400);
      x = await ST();
      const rc = x.commands.find(c => c.kind === 'pattern' && c.mode === 'replace');
      check(rc && x.build.some(s => s.at === rc.at && s.pattern && s.pattern.track === rc.target && /^P\d+$/.test(s.pattern.to)), 'Replace: the saved melody as a P pattern on the chosen track', JSON.stringify(rc && { target: rc.target }));
    } else check(/ · /.test(await page.getAttribute('#radio-steer [data-sp-replace="p-hook"]', 'title')), 'Replace off with its reason when no melody plays');
    check(!(await err()), 'no evaluation error with saved patterns', (await err()).slice(0, 120));
    if (shots) await (await page.$('#radio-steer')).screenshot({ path: path.join(shots, 'saved-en.png') });
    await page.evaluate(() => localStorage.removeItem('coding-misk-patterns'));
  }

  await page.click('#radio-start'); await sleep(300);
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
