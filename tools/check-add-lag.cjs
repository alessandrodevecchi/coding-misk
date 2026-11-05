// "+" and "−" of the radio console prepared ahead (console-add-ahead, #82): a press records a pending change, the song
// is steered away from the page and the change enters on a phrase start, with no lag. On a radio song in Classic,
// Crescendo and Live coder, late in the song (bar 100 and later, with commands already standing):
// - a press shows its badge ("+1 · Enters in 6 s") within 100 ms, and the click's own task stays under 20 ms;
// - from the press until two bars after the entry: no main-thread task over the budget (100 ms) and no
//   "skip query: too late", at normal CPU speed; with the CPU slowed 4 times, no task over the budget from the press
//   until the batch is ready;
// - the change enters on the default boundary (the first phrase start that leaves 2 s plus the expected preparation),
//   or later only when pushed; the badge counts down;
// - net counting ("+ +" is two, "+ −" is nothing, "+ − +" is one), changes on different instruments in a burst enter
//   together with the same bar, a cancelled row changes nothing;
// - Classic: a long task injected a second before the boundary pushes the change to the next phrase start (shown at
//   once with a highlight); a page kept busy enters after the 30 s bound with "[radio] entered under load"; an
//   11-track song takes "+ arp" and "− bass" without a skipped window; the song steered away from the page is
//   JSON-equal to the page's steering, and a replay of the recipe gives the same song.
// - locks (D8): a lock and then an unlock of an instrument late in the song take the same path (the button's pending
//   ring within 100 ms, no task over the budget, recorded as lock-part and unlock-part on the entry bar); a lock pressed
//   with a "+" enters in the same batch, "+" first; a lock then an unlock before the entry cancel out and record nothing;
//   a mixer lock waits on its button and locks its track on the entry bar.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-add-lag.cjs [--budget 100] [--profiles classic,crescendo,switch] [--rate 4] [--style berlin-techno] [--standing n] [--quick]
// --standing n: the commands standing before the late cases (default 8 in Classic, 3 on a grown song)
// --quick: only the late "+", the burst, the net counts and the locks, at normal CPU speed
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const BUDGET = +arg('--budget', 100), RATE = +arg('--rate', 4), PROFILES = arg('--profiles', 'classic,crescendo,switch').split(','), STYLE = arg('--style', 'berlin-techno');
const QUICK = process.argv.includes('--quick'), STANDING = arg('--standing', null) === null ? null : +arg('--standing', 0);
const NAMES = { switch: 'Live coder', classic: 'Classic', crescendo: 'Crescendo' };
// (src/radio/radio.js: ADD_LEAD seconds at least before the boundary, the click's own budget)
const ADD_LEAD = 2, CLICK_BUDGET = 20;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const table = [];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  await ctx.addInitScript(() => {
    window.__lt = []; window.__late = [];
    // (the badge's time from the click, in the page: the first press's click and the first badge added after it)
    window.__badge = { click: null, shown: null };
    // (a lock's pending state is its ring: the data-pend-s attribute on the button)
    addEventListener('click', e => { if (e.target.closest && e.target.closest('.arr-pm, .arr-lock, [data-mix-lock]') && window.__badge.click === null) window.__badge.click = performance.now(); }, true);
    new MutationObserver(() => { const b = window.__badge; if (b.click !== null && b.shown === null && document.querySelector('#radio-steer .arr-pend, #radio-steer [data-pend-s]')) b.shown = performance.now(); }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-pend-s'] });
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  });
  const page = await ctx.newPage();
  const errors = [], logs = [];
  let late = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { const x = m.text(); if (x === 'skip query: too late') late.push(Date.now()); if (/^\[radio\] (entered under load|console change)/.test(x)) logs.push(x); });
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  const R = (fn, a) => page.evaluate(fn, a);
  const rel = () => R(() => { const sch = document.querySelector('strudel-editor').editor.repl.scheduler, s = globalThis.codingMiskRadio.state; return sch.now() - s.stream[s.onAir].start; });
  const steering = () => R(() => { const s = globalThis.codingMiskRadio.steering; return { commands: s.commands, phrase: s.plan.phrase, bars: s.plan.bars, added: s.plan.added }; });
  const pending = () => R(() => globalThis.codingMiskRadio.pendingAdds);
  const barSec = () => R(() => { const sg = globalThis.codingMiskRadio.steering.song; return 240 / (sg.sections[0].bpm || 120); });
  const badges = () => R(() => Object.fromEntries([...document.querySelectorAll('#radio-steer .arr-pend')].map(x => [x.closest('.arr-inst').dataset.arr, { text: x.querySelector('.arr-pend-t').textContent, tip: x.title, flash: x.classList.contains('flash') }])));
  const rows = () => R(() => [...document.querySelectorAll('#radio-steer [data-pend-row]')].map(x => ({ id: x.dataset.pendRow, text: x.textContent.trim() })));
  const playing = (part, bar) => R(async ([p, b]) => { const { stateAt } = await import('/src/song/build.js'), { instrumentOf } = await import('/src/endless/steering.js'), s = globalThis.codingMiskRadio.steering; return stateAt(s.song, b).song.tracks.filter(t => !t.mute && instrumentOf(t) === p && t.clips.some(c => c.start <= b && c.start + c.bars > b)).length; }, [part, bar]);
  // a press: "+" or "−" of an instrument, the Arrangement lock of an instrument ('lock'), a mixer lock ('mixlock')
  const pressSel = (kind, part) => kind === 'lock' ? `#radio-steer [data-lock-part="${part}"]` : kind === 'mixlock' ? `#radio-steer [data-mix-lock="${part}"]` : `#radio-steer [data-cmd="${kind}"][data-inst="${part}"]`;
  const lockRing = sel => R(q => { const b = document.querySelector(q); return b ? { s: b.dataset.pendS || null, tip: b.title } : null; }, sel);
  const lockedParts = () => R(() => (globalThis.codingMiskRadio.steering.plan.lockedParts || []).slice());
  const lockPart = on => (on.find(x => x.p === 'bass') || on.find(x => x.less) || on[0] || {}).p;
  const instOn = async () => R(() => [...document.querySelectorAll('#radio-steer .arr-inst[data-arr]')].map(x => ({ p: x.dataset.arr, more: !x.querySelector('[data-cmd="more"]').disabled, less: !x.querySelector('[data-cmd="less"]').disabled })));
  const waitReady = async () => { for (let k = 0; k < 300; k++) { if (await R(() => { const s = globalThis.codingMiskRadio.state, it = s && s.stream[s.onAir]; return !!it && !it.growing && (it.grown || it.profile === 'classic'); })) return true; await sleep(250); } return false; };
  // waits until no batch is pending (entered or dropped), at most ms
  const waitEntered = async (ms = 90000) => { const t = Date.now(); while (Date.now() - t < ms) { if (!(await pending()).length) return true; await sleep(200); } return false; };
  // a fresh phrase: seek to a bar a little after a phrase start, so the next boundary is a phrase away
  const freshPhrase = async from => { const s = await steering(); const b = Math.ceil(from / s.phrase) * s.phrase + 0.5; await R(x => globalThis.codingMiskRadio.seek(x), b); await sleep(2500); return b; };
  // the click and the window after it: the longest task, the click's own task, the skipped windows
  const measure = async (presses, { after = 2, cpu = 1, untilReady = false } = {}) => {
    if (cpu !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    const r0 = await rel();
    await R(() => globalThis.codingMiskRadio.resetAddCost());
    const t0 = await R(() => { window.__lt = []; return performance.now(); }); late = [];
    const c0 = Date.now();
    await R(() => { window.__badge = { click: null, shown: null }; });
    for (const [kind, part, gap] of presses) {
      await page.click(pressSel(kind, part));
      if (gap) await sleep(gap);
    }
    await sleep(50);
    const bt = await R(() => window.__badge), badgeMs = bt.click !== null && bt.shown !== null ? Math.round(bt.shown - bt.click) : null;
    const first = await pending(), b0 = await badges(), q0 = await rows();
    let readyT = null, at = first.length ? first[0].at : null, pushes = 0, steer;
    for (let k = 0; k < 400; k++) {
      const p = await pending();
      if (p.length) { at = p[0].at; pushes = p[0].pushes; if (p[0].times && p[0].times.steer) steer = p[0].times.steer; if (readyT === null && p.every(x => x.state === 'ready')) readyT = Date.now() - c0; }
      if (!p.length) break;
      if (untilReady && readyT !== null) break;
      await sleep(100);
    }
    const own = await R(() => globalThis.codingMiskRadio.addCost);
    const done = (await R(() => globalThis.codingMiskRadio.addsDone)).find(x => first[0] && x.id === first[0].id);
    if (done) { at = done.at; pushes = done.pushes; }
    if (cpu !== 1) { const ltR = await R(() => window.__lt); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); return { r0, t0, lt: ltR, badgeMs, first, b0, q0, readyT, at, pushes, steer, own, late: late.length }; }
    // two bars after the entry
    const bs = await barSec();
    if (at !== null) { for (let k = 0; k < 200 && (await rel()) < at + after; k++) await sleep(150); }
    else await sleep(after * bs * 1000);
    const lt = await R(() => window.__lt), own2 = await R(() => globalThis.codingMiskRadio.addCost);
    return { r0, t0, lt, badgeMs, first, b0, q0, readyT, at, pushes, steer, own: own2, late: late.length };
  };
  const ownMax = m => Math.max(0, ...Object.values(m.own || {}));
  const ownText = m => Object.entries(m.own || {}).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
  const longest = m => Math.round(m.lt.reduce((a, x) => Math.max(a, x.d), 0));
  const clickTask = m => Math.round(m.lt.filter(x => x.s - m.t0 < 400).reduce((a, x) => Math.max(a, x.d), 0));
  const tasks = m => m.lt.map(x => `${Math.round(x.s - m.t0)}:${Math.round(x.d)}`).join(' ') || 'none';
  const report = (name, m) => {
    table.push(`${name}: longest ${longest(m)} ms, own work ${ownMax(m)} ms, "too late" ${m.late}, steering ${m.steer === undefined ? '—' : `${(m.steer / 1000).toFixed(1)} s`}, ready after ${m.readyT === null ? '—' : `${(m.readyT / 1000).toFixed(1)} s`}, entry bar ${m.at === null ? '—' : m.at + 1}, pushes ${m.pushes}`);
    check(m.badgeMs !== null && m.badgeMs <= 100, `${name}: the badge shows within 100 ms`, `${m.badgeMs} ms`);
    check(longest(m) <= BUDGET, `${name}: no main-thread task over ${BUDGET} ms from the press until two bars after the entry`, `longest ${longest(m)} ms; tasks ${tasks(m)}`);
    check(m.late === 0, `${name}: no "skip query: too late"`, `${m.late}`);
    check(ownMax(m) <= BUDGET, `${name}: the batch's own work on the main thread stays under ${BUDGET} ms`, ownText(m));
  };
  for (const profile of PROFILES) {
    const name = NAMES[profile] || profile;
    await R(([p, st]) => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: [st], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: p, compilation: 'off' })); }, [profile, STYLE]);
    await page.reload(); await sleep(3500);
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    await page.fill('#radio-seed', `add-ahead-${profile}`); await page.click('#radio-start');
    check(await waitReady(), `${name}: the song is ready`);
    await sleep(2000);
    // commands standing in the first phrases (the steering grows with them: 8 in Classic, 3 on a grown song, whose
    // steering on air replays each of them, about 2 s per energy command in Node), then late in the song
    const s0 = await steering();
    const standing = STANDING !== null ? STANDING : profile === 'classic' ? 8 : 3;
    for (let k = 0; k < standing; k++) { await R(b => globalThis.codingMiskRadio.seek(b), k * s0.phrase + 1.5); await sleep(400); await R(c => globalThis.codingMiskRadio.command(c), { kind: k % 2 ? 'energy-up' : 'energy-down' }); await sleep(400); }
    await sleep(2500);
    const lateBar = Math.max(4 * s0.phrase, Math.min(100, s0.bars - 6 * s0.phrase));
    console.log(`info  ${name}: ${s0.bars} bars, phrase ${s0.phrase}, the late cases from bar ${lateBar}`);
    const idle = {};
    // the page with nothing pressed, for comparison (reported, not checked): 15 s at normal speed and at the slowed rate
    for (const cpu of QUICK ? [1] : [1, RATE]) {
      await freshPhrase(cpu === 1 ? 3 * s0.phrase : 5 * s0.phrase);
      if (cpu !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      const t0 = await R(() => { window.__lt = []; return performance.now(); }); late = [];
      await sleep(15000);
      const lt = await R(() => window.__lt);
      if (cpu !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const m = { lt, t0 };
      idle[cpu] = longest(m);
      table.push(`${name}, nothing pressed (CPU ${cpu}×, 15 s, for comparison): longest ${longest(m)} ms, "too late" ${late.length}`);
      console.log(`info  ${name}, nothing pressed, CPU ${cpu}×: longest ${longest(m)} ms, "too late" ${late.length}; tasks ${tasks(m)}`);
    }
    // 1. one "+" late in the song
    {
      await freshPhrase(lateBar);
      const on = await instOn(), part = (on.find(x => x.p === 'arp' && x.more) || on.find(x => x.more) || {}).p;
      const before = (await steering()).commands.length, bs = await barSec();
      const m = await measure([['more', part, 0]]);
      report(`${name}, "+ ${part}" late in the song`, m);
      check(clickTask(m) <= CLICK_BUDGET, `${name}: the click's own work stays under ${CLICK_BUDGET} ms`, `${clickTask(m)} ms`);
      const b = m.b0[part], secs = m.first.length ? (m.first[0].at0 - m.r0) * bs : 0;
      check(!!b && /^\+1 · Enters in \d+ s$/.test(b.text) && b.tip === `Enters on bar ${m.first[0].at0 + 1}`, `${name}: the badge reads "+1 · Enters in N s" with its bar`, b ? `${b.text} / ${b.tip}` : 'none');
      check(m.first.length && secs >= ADD_LEAD && m.first[0].at0 > m.r0, `${name}: the default boundary leaves at least ${ADD_LEAD} s`, `press on ${m.r0.toFixed(2)}, boundary ${m.first.length ? m.first[0].at0 : '—'} (${secs.toFixed(1)} s)`);
      const st = await steering(), got = st.commands.slice(before);
      check(got.length === 1 && got[0].kind === 'more' && got[0].part === part && got[0].at === m.at, `${name}: one "+ ${part}" recorded on its entry bar`, JSON.stringify(got.map(c => `${c.kind}:${c.part}@${c.at}`)));
      check(m.pushes > 0 || m.at === m.first[0].at0, `${name}: the entry is the default boundary unless pushed`, `planned ${m.first[0] && m.first[0].at0}, entered ${m.at}, pushes ${m.pushes}`);
    }
    // (the next cases on a fresh session, from its first phrases: the song above is near its end)
    const fresh = async seed => { await page.click('#radio-start'); await sleep(800); await page.fill('#radio-seed', seed); await page.click('#radio-start'); check(await waitReady(), `${name}: session ${seed} is ready`); await sleep(2000); await freshPhrase(2 * s0.phrase); };
    // 1b. a lock and then an unlock of an instrument late in the song (D8): the same path as "+"; on a session of its
    // own with the same standing commands (the song above has no room left for two more entries)
    await fresh(`add-ahead-${profile}-k`);
    for (let k = 0; k < standing; k++) { await R(b => globalThis.codingMiskRadio.seek(b), k * s0.phrase + 1.5); await sleep(400); await R(c => globalThis.codingMiskRadio.command(c), { kind: k % 2 ? 'energy-up' : 'energy-down' }); await sleep(400); }
    await sleep(2500);
    for (const kind of ['lock-part', 'unlock-part']) {
      await freshPhrase(kind === 'lock-part' ? lateBar : (await rel()) + 1);
      const on = await instOn(), part = lockPart(on);
      const was = (await lockedParts()).includes(part);
      if ((kind === 'lock-part') === was) { check(false, `${name}: the ${part} lock is ${was ? 'closed' : 'open'} before "${kind}"`); continue; }
      const before = (await steering()).commands.length;
      const m = await measure([['lock', part, 0]]);
      report(`${name}, "${kind} ${part}" late in the song`, m);
      check(clickTask(m) <= CLICK_BUDGET, `${name}: the lock click's own work stays under ${CLICK_BUDGET} ms`, `${clickTask(m)} ms`);
      check(m.first.length === 1 && m.first[0].locks && m.first[0].locks[`p.${part}`] === kind, `${name}: the lock is pending in a batch`, JSON.stringify(m.first.map(x => x.locks)));
      const got = (await steering()).commands.slice(before), now = (await lockedParts()).includes(part);
      check(got.length === 1 && got[0].kind === kind && got[0].part === part && got[0].at === m.at, `${name}: one "${kind} ${part}" recorded on its entry bar`, JSON.stringify(got.map(c => `${c.kind}:${c.part}@${c.at}`)));
      check(now === (kind === 'lock-part'), `${name}: the ${part} is ${kind === 'lock-part' ? 'locked' : 'open'} after the entry`);
    }
    await fresh(`add-ahead-${profile}-b`);
    // 4. the CPU slowed 4 times: no task over the budget from the press until the batch is ready
    if (!QUICK) {
      await freshPhrase((await rel()) + 1);
      const on = await instOn(), a = (on.find(x => x.more) || {}).p, r = (on.find(x => x.less && x.p !== a) || {}).p;
      if (!a) { check(false, `${name}: a "+" button left for the CPU ${RATE}× case`); continue; }
      const m = await measure([['more', a, 150], ...(r ? [['less', r, 0]] : [])], { cpu: RATE, untilReady: true });
      table.push(`${name}, CPU ${RATE}×, press until ready: longest ${longest(m)} ms, own work ${ownMax(m)} ms, ready after ${m.readyT === null ? '—' : `${(m.readyT / 1000).toFixed(1)} s`}`);
      // (the page alone can pass the budget at this rate, the song's own steps: the batch's own work is checked against
      // the budget, the longest task against the page with nothing pressed)
      check(ownMax(m) <= BUDGET, `${name}: CPU ${RATE}× slower, the batch's own work stays under ${BUDGET} ms until it is ready`, ownText(m));
      check(longest(m) <= Math.max(BUDGET, idle[RATE] + 20), `${name}: CPU ${RATE}× slower, no task over ${BUDGET} ms (or the page's own with nothing pressed) from the press until the batch is ready`, `longest ${longest(m)} ms (nothing pressed: ${idle[RATE]} ms); tasks ${tasks(m)}`);
      await waitEntered();
    }
    // 2. a burst on different instruments: one batch, every change on the same bar
    {
      await freshPhrase((await rel()) + 1);
      const on = await instOn(), plus = on.filter(x => x.more).map(x => x.p), minus = on.filter(x => x.less).map(x => x.p);
      const presses = [];
      const pk = (list, not) => list.find(p => !not.includes(p));
      const a = pk(plus, []), r = pk(minus, [a]), c = pk(plus, [a, r]), d = pk(plus, [a, r, c]);
      if (!a) { check(false, `${name}: "+" buttons left for the burst`, JSON.stringify(on)); continue; }
      if (a) presses.push(['more', a, 120]); if (r) presses.push(['less', r, 120]); if (c) presses.push(['more', c, 120]); if (d) presses.push(['more', d, 0]);
      const before = (await steering()).commands.length;
      const m = await measure(presses);
      report(`${name}, a burst (${presses.map(([k, p]) => `${k === 'more' ? '+' : '−'} ${p}`).join(', ')})`, m);
      const got = (await steering()).commands.slice(before);
      check(m.first.length === 1, `${name}: the burst is one batch`, `${m.first.length}`);
      check(got.length === presses.length && got.every(x => x.at === got[0].at), `${name}: the burst enters together, on one bar`, JSON.stringify(got.map(x => `${x.kind}:${x.part}@${x.at}`)));
      check(m.q0.length === presses.length, `${name}: one queue row per instrument`, JSON.stringify(m.q0.map(x => x.text)));
    }
    // 3. net counts: "+ −" leaves nothing, "+ − +" is one, "+ +" is two
    {
      await freshPhrase((await rel()) + 1);
      const on = await instOn(), plus = on.filter(x => x.more).map(x => x.p);
      if (plus.length < 2) { check(false, `${name}: "+" buttons left for the net counts`, JSON.stringify(on)); continue; }
      const [x1, x2, x3] = [plus[0], plus[1] || plus[0], plus[2] || plus[0]];
      const before = (await steering()).commands.length;
      await page.click(`#radio-steer [data-cmd="more"][data-inst="${x1}"]`); await sleep(100);
      await page.click(`#radio-steer [data-cmd="less"][data-inst="${x1}"]`).catch(() => {}); await sleep(100);
      const b1 = await badges(), r1 = await rows();
      check(!b1[x1] && !r1.some(r => r.id.endsWith(`:${x1}`)), `${name}: "+ ${x1}" then "− ${x1}" cancel out (no badge, no row)`, JSON.stringify({ b1, r1 }));
      for (const k of ['more', 'less', 'more']) { await page.click(`#radio-steer [data-cmd="${k}"][data-inst="${x2}"]`).catch(() => {}); await sleep(100); }
      for (let k = 0; k < 2; k++) { await page.click(`#radio-steer [data-cmd="more"][data-inst="${x3 === x2 ? plus[3] || x2 : x3}"]`); await sleep(100); }
      const p = await pending();
      check(p.length === 1 && p[0].parts[x2] >= 1 && !(x1 in p[0].parts && x1 !== x2 && x1 !== x3), `${name}: one batch with the net counts`, JSON.stringify(p.map(x => x.parts)));
      // the countdown
      // (a change the steering on air moved later meanwhile counts down from its new time)
      const bA = (await badges())[x2], pA = (await pending())[0]; await sleep(3000); const bB = (await badges())[x2], pB = (await pending())[0];
      const nA = bA && +(/in (\d+) s/.exec(bA.text) || [])[1], nB = bB && +(/in (\d+) s/.exec(bB.text) || [])[1], moved = pA && pB && pB.at !== pA.at;
      check(bA && bB && (moved ? bB.flash || nB > nA : nA - nB >= 2 && nA - nB <= 4), `${name}: the badge counts down${moved ? ' (moved later meanwhile, shown at once)' : ''}`, `${bA && bA.text} → ${bB && bB.text}`);
      const want = p[0] ? p[0].parts : {};
      check(await waitEntered(), `${name}: the batch enters`);
      const got = (await steering()).commands.slice(before), net = {};
      for (const c of got) net[c.part] = (net[c.part] || 0) + (c.kind === 'more' ? 1 : -1);
      check(JSON.stringify(Object.keys(net).sort().map(k => [k, net[k]])) === JSON.stringify(Object.keys(want).sort().map(k => [k, want[k]])), `${name}: the record holds the net counts only`, `${JSON.stringify(net)} for ${JSON.stringify(want)}`);
    }
    // 10. locks on a fresh session (D8): with a "+" in one batch, lock then unlock cancels, a mixer lock
    await fresh(`add-ahead-${profile}-l`);
    {
      await freshPhrase((await rel()) + 1);
      const on = await instOn(), part = lockPart(on), a = (on.find(x => x.more && x.p !== part) || {}).p;
      if (!a || !part) { check(false, `${name}: a "+" and a lock for the lock burst`, JSON.stringify(on)); }
      else {
        const before = (await steering()).commands.length;
        const m = await measure([['more', a, 300], ['lock', part, 0]]);
        report(`${name}, "+ ${a}" and the ${part} lock in a burst`, m);
        const got = (await steering()).commands.slice(before);
        check(m.first.length === 1 && m.first[0].parts[a] === 1 && m.first[0].locks[`p.${part}`] === 'lock-part', `${name}: "+ ${a}" and the ${part} lock are one batch`, JSON.stringify(m.first.map(x => ({ parts: x.parts, locks: x.locks }))));
        check(got.length === 2 && got[0].kind === 'more' && got[1].kind === 'lock-part' && got[1].part === part && got.every(x => x.at === got[0].at), `${name}: they enter together on one bar, "+" first`, JSON.stringify(got.map(x => `${x.kind}:${x.part}@${x.at}`)));
        check(m.q0.length === 2, `${name}: one queue row for the "+" and one for the lock`, JSON.stringify(m.q0.map(x => x.text)));
      }
    }
    {
      await freshPhrase((await rel()) + 1);
      const on = await instOn(), part = lockPart(on);
      const was = (await lockedParts()).includes(part), before = (await steering()).commands.length;
      await page.click(pressSel('lock', part)); await sleep(150);
      const r0 = await lockRing(pressSel('lock', part)), p0 = await pending();
      await page.click(pressSel('lock', part)); await sleep(150);
      const r1 = await lockRing(pressSel('lock', part)), p1 = await pending(), q1 = await rows();
      check(!!(r0 && r0.s) && p0.length === 1 && /^(Locks|Unlocks) on bar \d+ · in \d+ s$/.test(r0.tip), `${name}: the lock shows its ring, seconds and bar`, JSON.stringify(r0));
      check(!p1.length && r1 && !r1.s && !q1.length, `${name}: a lock then an unlock of the ${part} before the entry cancel out`, JSON.stringify({ p1, r1, q1 }));
      await sleep(9000);
      check((await steering()).commands.length === before && (await lockedParts()).includes(part) === was, `${name}: the cancelled lock records nothing`);
    }
    {
      await freshPhrase((await rel()) + 1);
      const id = await R(() => { const b = document.querySelector('#radio-steer [data-mix-lock][aria-pressed="false"]'); return b && b.dataset.mixLock; });
      if (!id) check(false, `${name}: an open mixer lock`);
      else {
        const before = (await steering()).commands.length;
        const m = await measure([['mixlock', id, 0]]);
        report(`${name}, the mixer lock of ${id}`, m);
        check(m.first.length === 1 && m.first[0].locks[`t.${id}`] === 'lock', `${name}: the mixer lock is pending`, JSON.stringify(m.first.map(x => x.locks)));
        const got = (await steering()).commands.slice(before);
        const locked = await R(async t => { const { lockedIds } = await import('/src/endless/steering.js'); return lockedIds(globalThis.codingMiskRadio.steering.plan).includes(t); }, id);
        check(got.length === 1 && got[0].kind === 'lock' && got[0].track === id && got[0].at === m.at && locked, `${name}: "lock ${id}" recorded on its entry bar and the track locked`, JSON.stringify(got.map(c => `${c.kind}:${c.track}@${c.at}`)));
      }
    }
    if (profile === 'classic' && !QUICK) {
      // 5. the steering away from the page is the page's own, and a replay gives the same song
      {
        const eq = await R(async () => {
          const { steerSong } = await import('/src/endless/steering.js'), R0 = globalThis.codingMiskRadio, st = R0.state, s = R0.steering;
          const rb = R0.rebuild(st.recipe, st.onAir + 1)[st.onAir];
          return { replay: JSON.stringify(rb.song) === JSON.stringify(s.song), n: s.commands.length };
        });
        check(eq.replay, `${name}: a replay of the recipe gives the song as steered (${eq.n} commands)`);
      }
      await fresh('add-ahead-classic-c');
      // 6. cancel a row: nothing changes at its bar
      {
        await freshPhrase((await rel()) + 1);
        const on = await instOn(), a = (on.find(x => x.more) || {}).p, before = (await steering()).commands.length;
        if (!a) { check(false, `${name}: a "+" button for the cancel case`); continue; }
        await page.click(`#radio-steer [data-cmd="more"][data-inst="${a}"]`); await sleep(1500);
        const r = await rows();
        await page.click(`#radio-steer [data-pend-cancel="${r[0] && r[0].id}"]`).catch(() => {}); await sleep(300);
        check(!(await pending()).length && !Object.keys(await badges()).length, `${name}: a cancelled row leaves no batch and no badge`);
        await sleep(9000);
        check((await steering()).commands.length === before, `${name}: a cancelled row records nothing`);
      }
      // 7. a long task a second before the boundary: the change moves to the next phrase start, shown at once
      {
        await freshPhrase((await rel()) + 1);
        const on = await instOn(), a = (on.find(x => x.more) || {}).p;
        await page.click(`#radio-steer [data-cmd="more"][data-inst="${a}"]`);
        await sleep(300);
        const p0 = (await pending())[0], bs = await barSec(), ph = (await steering()).phrase;
        for (let k = 0; k < 400 && (p0.at - (await rel())) * bs > 1.1; k++) await sleep(50);
        // (in a task of the page's own: a task run by the test driver is not a long task to the page)
        await R(() => { setTimeout(() => { const t = performance.now(); while (performance.now() - t < 120); }, 0); });
        let moved = null, flash = false;
        for (let k = 0; k < 60 && !moved; k++) { await sleep(50); const p = await pending(); if (p.length && p[0].at !== p0.at) { moved = p[0]; flash = !!((await badges())[a] || {}).flash; } }
        check(moved && moved.at === p0.at + ph, `${name}: a busy page moves the change to the next phrase start`, `${p0.at} → ${moved && moved.at}`);
        check(flash, `${name}: the badge flashes when the entry moves later`);
        check(await waitEntered(), `${name}: the moved change enters`);
      }
      // 8. a page kept busy: the change enters after the 30 s bound, logged
      {
        await freshPhrase((await rel()) + 1);
        const on = await instOn(), a = (on.find(x => x.more) || {}).p;
        logs.length = 0;
        const t0 = Date.now();
        await page.click(`#radio-steer [data-cmd="more"][data-inst="${a}"]`);
        await R(() => { window.__busy = setInterval(() => { const t = performance.now(); while (performance.now() - t < 60); }, 700); });
        const ok = await waitEntered(70000);
        await R(() => clearInterval(window.__busy));
        const secs = (Date.now() - t0) / 1000;
        check(ok && logs.some(x => /entered under load on bar \d+/.test(x)) && secs >= 30, `${name}: under load the change enters after the 30 s bound and the page logs it`, `${secs.toFixed(0)} s, ${logs.join(' | ')}`);
      }
      // 9. an 11-track song: "+ arp" and "− bass" within 300 ms, no skipped window
      {
        const s = await steering(), n = await R(async () => {
          const R0 = globalThis.codingMiskRadio, { stateAt } = await import('/src/song/build.js'), S0 = await import('/src/endless/steering.js');
          const count = (song, bar) => stateAt(song, bar).song.tracks.filter(t => !t.mute && !['voice', 'spoken', 'riser'].includes(t.type)).length;
          for (let j = 0; j < 40; j++) { const s = R0.steering, last = s.commands[s.commands.length - 1]; if (last && count(s.song, last.at) >= 11) break; R0.command({ kind: 'more', part: S0.INSTRUMENTS[j % S0.INSTRUMENTS.length] }); }
          const s = R0.steering, last = s.commands[s.commands.length - 1]; return count(s.song, last.at);
        });
        await sleep(1000);
        await freshPhrase((await rel()) + s.phrase);
        const on = await instOn(), r = (on.find(x => x.p === 'bass' && x.less) || on.find(x => x.less) || {}).p, a = (on.find(x => x.p === 'arp' && x.more) || on.find(x => x.more && x.p !== r) || {}).p;
        const m = await measure([['more', a, 150], ['less', r, 0]]);
        report(`${name}, ${n} tracks, "+ ${a}" and "− ${r}"`, m);
      }
    }
    await page.click('#radio-start').catch(() => {});
    await sleep(500);
  }
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  console.log(`\nper case:\n  ${table.join('\n  ')}`);
  await browser.close();
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})();
