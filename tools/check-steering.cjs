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
    check(parts === 'lead:true,bass:false,arp:false,pad:false', 'part picker with the lead picked', parts);
    check(await page.isVisible('#radio-steer [data-cmd="vary"] svg') && await page.isVisible('#radio-steer [data-cmd="swap"] svg'), 'Vary and Swap buttons with drawn icons');
    // a part that plays at the next phrase, and one that does not (its buttons say why); the middle of the song, where
    // more parts play
    { const x = await ST(); await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(x.plan.bars / 2) - 2); await sleep(600);
      // the mixer check locked a track: unlock it, so its part can be varied
      for (const id of x.plan.locked) await page.evaluate(track => globalThis.codingMiskRadio.command({ kind: 'unlock', track }), id);
      await sleep(300); }
    let on = null, off = null;
    for (const p of ['lead', 'bass', 'arp', 'pad']) {
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

  await page.click('#radio-start'); await sleep(300);
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
