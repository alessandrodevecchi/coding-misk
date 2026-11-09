// Console "+" waves (console-add-waves, #82): the baseline scenarios of openspec/changes/console-add-waves/baseline,
// without instrumentation. Per run: a radio session on a fixed seed, earlier energy commands, then a press pattern late
// in the song; the tool records each press and the batch it went to (pendingAdds), waits until every batch entered and
// reads the entries from addsDone (moves with their reasons from addsDone when the radio records them, else from the
// console log). It prints per batch the head and the last line in phrases from the batch's first press, the moves, the
// steering time; per run the long tasks and "skip query: too late" from the first press until two bars after the last
// entry; a summary per profile and the moves by reason. It fails when fewer than 90 % of the heads enter within 2
// phrases of their first press or a head enters more than 4 phrases after it (--no-check: report only).
// Press patterns: p1 one "+"; p3 three "+" 300 ms apart; p6 three "+" 300 ms apart, two more 15 s later, one more 5 s
// after those. Runs: profile:style:standing[:packed][:suffix] (packed: the earlier commands in the first two phrases,
// for the short lo-fi songs); the default is the kit of baseline/run.sh.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-add-waves.cjs [--runs switch:berlin-techno:8,...] [--patterns p1,p3,p6] [--rate 4] [--json out.jsonl] [--no-check]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const KIT = [];
for (const p of ['classic', 'crescendo', 'switch']) KIT.push(`${p}:berlin-techno:0`, `${p}:berlin-techno:8`, `${p}:lo-fi:0`, `${p}:lo-fi:6:packed`);
KIT.push('switch:berlin-techno:8::-r2');
const RUNS = arg('--runs', KIT.join(',')).split(',').filter(Boolean);
const PATTERNS = arg('--patterns', 'p1,p3,p6').split(','), RATE = +arg('--rate', 1), OUT = arg('--json', null), CHECK = !process.argv.includes('--no-check');
const NAMES = { switch: 'Live coder', classic: 'Classic', crescendo: 'Crescendo' };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  await ctx.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const logs = [], errors = [];
  let late = 0;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { const x = m.text(); if (x === 'skip query: too late') late++; if (/^\[radio\]/.test(x)) logs.push(x); });
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  const R = (fn, a) => page.evaluate(fn, a);
  const rel = () => R(() => { const sch = document.querySelector('strudel-editor').editor.repl.scheduler, s = globalThis.codingMiskRadio.state; return sch.now() - s.stream[s.onAir].start; });
  const steering = () => R(() => { const s = globalThis.codingMiskRadio.steering; return { n: s.commands.length, phrase: s.plan.phrase, bars: s.plan.bars }; });
  const barSec = () => R(() => { const sg = globalThis.codingMiskRadio.steering.song; return 240 / (sg.sections[0].bpm || 120); });
  const pending = () => R(() => globalThis.codingMiskRadio.pendingAdds);
  const badge = part => R(p => { const x = document.querySelector(`#radio-steer .arr-inst[data-arr="${p}"] .arr-pend`); return x ? x.querySelector('.arr-pend-t').textContent : null; }, part);
  const instOn = () => R(() => [...document.querySelectorAll('#radio-steer .arr-inst[data-arr]')].map(x => ({ p: x.dataset.arr, more: !x.querySelector('[data-cmd="more"]').disabled })));
  const waitReady = async () => { for (let k = 0; k < 400; k++) { if (await R(() => { const s = globalThis.codingMiskRadio.state, it = s && s.stream[s.onAir]; return !!it && !it.growing && (it.grown || it.profile === 'classic'); })) return true; await sleep(250); } return false; };
  const rows = [], runs = [];
  let loaded = null;
  for (const spec of RUNS) {
    const [profile, style, standingS, packedS, suffix = ''] = spec.split(':'), standing = +standingS, packed = packedS === 'packed';
    if (loaded !== `${profile}:${style}`) {
      await R(([p, st]) => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: [st], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: p, compilation: 'off' })); }, [profile, style]);
      await page.reload(); await sleep(3500);
      await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
      loaded = `${profile}:${style}`;
    } else { await page.click('#radio-start'); await sleep(800); }
    for (const [pi, pat] of PATTERNS.entries()) {
      if (pi) { await page.click('#radio-start'); await sleep(800); }
      const seed = `waves-${profile}-${style}-${standing}-${pat}${suffix}`;
      await page.fill('#radio-seed', seed); await page.click('#radio-start');
      if (!(await waitReady())) { console.log(`FAIL  ${seed}: the song is not ready`); runs.push({ seed, failed: true }); continue; }
      await sleep(2000);
      const s0 = await steering(), bs = await barSec(), ph = s0.phrase;
      for (let k = 0; k < standing; k++) { await R(b => globalThis.codingMiskRadio.seek(b), packed ? (k < standing / 2 ? 1.5 : ph + 1.5) : k * ph + 1.5); await sleep(400); await R(c => globalThis.codingMiskRadio.command(c), { kind: k % 2 ? 'energy-up' : 'energy-down' }); await sleep(500); }
      await sleep(3000);
      const pressBar = Math.max(2 * ph, Math.min(10 * ph, Math.floor((s0.bars - 9 * ph) / ph) * ph)) + 0.5;
      await R(b => globalThis.codingMiskRadio.seek(b), pressBar); await sleep(2500);
      const on = (await instOn()).filter(x => x.more).map(x => x.p);
      const pref = ['arp', 'pad', 'lead', 'perc', 'bass', 'keys', 'chords', 'hats', 'drums'];
      const parts = [...pref.filter(p => on.includes(p)), ...on.filter(p => !pref.includes(p))].slice(0, 3);
      while (parts.length < 3 && parts.length) parts.push(parts[parts.length - 1]);
      if (!parts.length) { console.log(`FAIL  ${seed}: no "+" button`); runs.push({ seed, failed: true }); continue; }
      const [A, B, C] = parts;
      const plan = pat === 'p1' ? [[A, 0]] : pat === 'p3' ? [[A, 300], [B, 300], [C, 0]] : [[A, 300], [B, 300], [C, 15000], [A, 300], [B, 5000], [C, 0]];
      logs.length = 0; late = 0;
      if (RATE !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
      await R(() => globalThis.codingMiskRadio.resetAddCost && globalThis.codingMiskRadio.resetAddCost());
      const t0 = await R(() => { window.__lt = []; return performance.now(); }), c0 = Date.now();
      // (each press, the batch it went to: a batch first seen after it has its first press there)
      const first = new Map(), presses = [];
      const seen = async () => { for (const b of await pending()) if (!first.has(b.id)) first.set(b.id, presses.length - 1); };
      for (const [part, gap] of plan) {
        const r0 = await rel();
        await page.click(`#radio-steer [data-cmd="more"][data-inst="${part}"]`).catch(() => {});
        presses.push({ t: Date.now() - c0, rel: r0, part });
        await sleep(150);
        await seen();
        presses[presses.length - 1].badge = await badge(part);
        const end = Date.now() + gap;
        while (Date.now() < end) { await seen(); await sleep(150); }
      }
      for (let k = 0; k < 1600; k++) { await seen(); if (!(await pending()).length) break; await sleep(150); }
      const done = (await R(() => globalThis.codingMiskRadio.addsDone)).filter(x => first.has(x.id));
      const lastAt = Math.max(0, ...done.map(d => Math.max(d.at, ...(d.ats || []))));
      for (let k = 0; k < 200 && (await rel()) < lastAt + 2; k++) await sleep(150);
      const lt = (await R(() => window.__lt)).filter(x => x.s >= t0), own = await R(() => globalThis.codingMiskRadio.addCost || {});
      if (RATE !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const logMoves = logs.filter(x => /console change moved/.test(x)).map(x => { const m = /from bar (\d+) to bar (\d+) \(([^):]+)/.exec(x); return m ? { from: +m[1] - 1, to: +m[2] - 1, why: m[3].trim() } : { why: 'unknown' }; });
      const run = { seed, profile, style, standing, packed, pat, phrase: ph, phraseSec: Math.round(ph * bs * 10) / 10, pressBar, rate: RATE, longest: Math.round(Math.max(0, ...lt.map(x => x.d))), tasks: lt.filter(x => x.d > 100).map(x => `${Math.round(x.s - t0)}:${Math.round(x.d)}`), own, over100: lt.filter(x => x.d > 100).length, late, logMoves, errors: errors.splice(0) };
      runs.push(run);
      for (const d of done.sort((a, b) => a.id - b.id)) {
        const p = presses[first.get(d.id)], q = p.rel, head = (d.at - q) / ph, last = (Math.max(d.at, ...(d.ats || [])) - q) / ph;
        const moves = d.moves || null;
        const row = { seed, profile, style, standing, pat, id: d.id, q: Math.round(q * 100) / 100, badge: p.badge, at0: d.at0, at: d.at, head, last, secs: (d.at - q) * bs, pushes: d.pushes, moves, steer: d.times ? d.times.steer : undefined, rate: RATE };
        rows.push(row);
        console.log(`${seed} #${d.id}: first press ${q.toFixed(2)} (${p.badge || '—'}), ${d.at0 + 1} → ${d.at + 1}, head ${head.toFixed(2)} ph (${row.secs.toFixed(0)} s), last ${last.toFixed(2)} ph, moves ${moves ? moves.map(m => `${m.from + 1}→${m.to + 1} ${m.why}`).join('; ') || 'none' : d.pushes}`);
      }
      console.log(`${seed}: ${done.length} batches, longest task ${run.longest} ms, tasks over 100 ms ${run.over100}${run.tasks.length ? ` (${run.tasks.join(' ')})` : ''}, the batches' own work at most ${Math.max(0, ...Object.values(own))} ms, "too late" ${late}${logMoves.length ? `, moves logged: ${logMoves.map(m => m.why).join(', ')}` : ''}`);
      if (OUT) fs.appendFileSync(OUT, JSON.stringify({ run, rows: rows.filter(r => r.seed === seed) }) + '\n');
    }
  }
  // summary per profile and earlier commands
  console.log(`\n| Profile | Earlier commands | Batches | Head ≤ 1 ph | Head ≤ 2 ph | Head > 2 ph | Worst head | Batches moved | Longest task | Tasks > 100 ms | "too late" |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const p of ['classic', 'crescendo', 'switch']) for (const many of [false, true]) {
    const v = rows.filter(r => r.profile === p && !!r.standing === many), rs = runs.filter(r => r.profile === p && !!r.standing === many && !r.failed);
    if (!v.length) continue;
    console.log(`| ${NAMES[p]} | ${many ? 'many' : 'none'} | ${v.length} | ${v.filter(r => r.head <= 1).length} | ${v.filter(r => r.head <= 2).length} | ${v.filter(r => r.head > 2).length} | ${Math.max(...v.map(r => r.head)).toFixed(2)} ph | ${v.filter(r => r.pushes > 0).length} | ${Math.max(...rs.map(r => r.longest))} ms | ${rs.reduce((a, r) => a + r.over100, 0)} | ${rs.reduce((a, r) => a + r.late, 0)} |`);
  }
  const why = {};
  for (const r of runs) for (const m of r.logMoves || []) why[m.why] = (why[m.why] || 0) + 1;
  const within2 = rows.filter(r => r.head <= 2).length, past4 = rows.filter(r => r.head > 4);
  console.log(`\nCPU ${RATE}×: ${rows.length} batches, heads within 2 phrases ${within2} (${rows.length ? Math.round(100 * within2 / rows.length) : 0} %), past 4 phrases ${past4.length}; moves by reason ${JSON.stringify(why)}; "too late" ${runs.reduce((a, r) => a + (r.late || 0), 0)}; page errors ${runs.reduce((a, r) => a + ((r.errors || []).length), 0)}`);
  await browser.close();
  let failed = runs.filter(r => r.failed).length + runs.reduce((a, r) => a + ((r.errors || []).length), 0);
  if (CHECK) {
    if (rows.length && within2 < 0.9 * rows.length) { console.log(`FAIL  fewer than 90 % of the heads within 2 phrases`); failed++; }
    if (past4.length) { console.log(`FAIL  heads past 4 phrases: ${past4.map(r => `${r.seed} #${r.id} ${r.head.toFixed(2)}`).join(', ')}`); failed++; }
  }
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})().catch(e => { console.error(e); process.exit(1); });
