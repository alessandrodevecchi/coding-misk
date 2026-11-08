// Diagnosis of console "+" waves (#82): badge at press, final entry, moves and their reasons.
// Needs the temporary instrumentation in src/radio/radio.js and src/endless/waypoints.js (b.moves, b.presses, _diag).
// Usage: PLAYWRIGHT_CORE=... PORT=5298 node measure.cjs <profile> <style> <standing> [patterns] [outfile]
const { chromium } = require(process.env.PLAYWRIGHT_CORE);
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [profile, style, standingS, patS, out] = process.argv.slice(2);
const standing = +standingS, PATTERNS = (patS || 'p1,p3,p6').split(',');
const OUT = out || `${__dirname}/res-${profile}-${style}-${standing}.jsonl`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', e => logs.push('ERR ' + e.message));
  page.on('console', m => { const x = m.text(); if (/^\[radio\]/.test(x)) logs.push(x); });
  await page.goto(`http://localhost:${process.env.PORT}/`); await sleep(2500);
  const R = (fn, a) => page.evaluate(fn, a);
  const rel = () => R(() => { const sch = document.querySelector('strudel-editor').editor.repl.scheduler, s = globalThis.codingMiskRadio.state; return sch.now() - s.stream[s.onAir].start; });
  const steering = () => R(() => { const s = globalThis.codingMiskRadio.steering; return { n: s.commands.length, phrase: s.plan.phrase, bars: s.plan.bars }; });
  const barSec = () => R(() => { const sg = globalThis.codingMiskRadio.steering.song; return 240 / (sg.sections[0].bpm || 120); });
  const pending = () => R(() => globalThis.codingMiskRadio.pendingAdds);
  const badge = part => R(p => { const x = document.querySelector(`#radio-steer .arr-inst[data-arr="${p}"] .arr-pend`); return x ? { text: x.querySelector('.arr-pend-t').textContent, tip: x.title } : null; }, part);
  const instOn = () => R(() => [...document.querySelectorAll('#radio-steer .arr-inst[data-arr]')].map(x => ({ p: x.dataset.arr, more: !x.querySelector('[data-cmd="more"]').disabled })));
  const waitReady = async () => { for (let k = 0; k < 400; k++) { if (await R(() => { const s = globalThis.codingMiskRadio.state, it = s && s.stream[s.onAir]; return !!it && !it.growing && (it.grown || it.profile === 'classic'); })) return true; await sleep(250); } return false; };
  const info = () => R(() => { const s = globalThis.codingMiskRadio.state, it = s && s.stream[s.onAir]; if (!it) return { noState: true }; return { growth: it.g0 && it.g0.crescendo ? it.g0.crescendo.growth : null, growMs: Math.round(it.growMs || 0), cmds: (it.commands || []).length }; });

  await R(([p, st]) => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: [st], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: p, compilation: 'off' })); }, [profile, style]);
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  let first = true;
  for (const pat of PATTERNS) {
    const seed = `waves-${profile}-${style}-${standing}-${pat}${process.env.SEEDSUFFIX || ''}`;
    if (!first) { await page.click('#radio-start'); await sleep(800); }
    first = false;
    await page.fill('#radio-seed', seed); await page.click('#radio-start');
    if (!(await waitReady())) { console.log(`FAIL not ready ${seed}`); continue; }
    await sleep(2000);
    const s0 = await steering(), bs = await barSec(), ph = s0.phrase;
    // PACKED=1: the standing commands in the first two phrases (short songs), half on each
    const packed = process.env.PACKED === '1';
    for (let k = 0; k < standing; k++) { await R(b => globalThis.codingMiskRadio.seek(b), packed ? (k < standing / 2 ? 1.5 : ph + 1.5) : k * ph + 1.5); await sleep(400); await R(c => globalThis.codingMiskRadio.command(c), { kind: k % 2 ? 'energy-up' : 'energy-down' }); await sleep(500); }
    await sleep(3000);
    const pressBar = Math.max(2 * ph, Math.min(10 * ph, Math.floor((s0.bars - 9 * ph) / ph) * ph)) + 0.5;
    await R(b => globalThis.codingMiskRadio.seek(b), pressBar); await sleep(2500);
    console.log(`info ${seed}: bars ${s0.bars} phrase ${ph} pressBar ${pressBar} state ${await R(() => !!globalThis.codingMiskRadio.state)}`);
    const on = (await instOn()).filter(x => x.more).map(x => x.p);
    const pref = ['arp', 'pad', 'lead', 'perc', 'bass', 'keys', 'chords', 'hats', 'drums'];
    const parts = [...pref.filter(p => on.includes(p)), ...on.filter(p => !pref.includes(p))].slice(0, 3);
    while (parts.length < 3 && parts.length) parts.push(parts[parts.length - 1]);
    const A = parts[0], B = parts[1], C = parts[2];
    const plan = pat === 'p1' ? [[A, 0]] : pat === 'p3' ? [[A, 300], [B, 300], [C, 0]] : [[A, 300], [B, 300], [C, 15000], [A, 300], [B, 5000], [C, 0]];
    const meta = { packed, seed, profile, style, standing, pat, phrase: ph, barSec: bs, phraseSec: Math.round(ph * bs * 10) / 10, bars: s0.bars, pressBar, cmdsBefore: s0.n, ...(await info()), parts };
    logs.length = 0;
    const presses = [], timeline = [], seen = new Set();
    const t0 = Date.now();
    let lastSnap = '';
    const snap = async () => { const p = await pending(); for (const b of p) seen.add(b.id); const key = JSON.stringify(p.map(b => [b.id, b.at, b.state])); if (key !== lastSnap) { lastSnap = key; timeline.push({ t: Date.now() - t0, rel: Math.round((await rel()) * 100) / 100, p: p.map(b => ({ id: b.id, at: b.at, state: b.state })) }); } return p; };
    for (const [part, gap] of plan) {
      const r0 = await rel();
      await page.click(`#radio-steer [data-cmd="more"][data-inst="${part}"]`);
      await sleep(150);
      const p = await snap();
      presses.push({ t: Date.now() - t0, rel: Math.round(r0 * 100) / 100, part, badge: await badge(part), batches: p.map(b => ({ id: b.id, at: b.at })) });
      // (wait the gap while sampling)
      const end = Date.now() + gap;
      while (Date.now() < end) { await snap(); await sleep(150); }
    }
    for (let k = 0; k < 1200; k++) { const p = await snap(); if (!p.length) break; await sleep(150); }
    const done = (await R(() => globalThis.codingMiskRadio.addsDone)).filter(x => seen.has(x.id));
    const res = { ...meta, presses, timeline, done, logs: logs.slice() };
    fs.appendFileSync(OUT, JSON.stringify(res) + '\n');
    // short line
    const fp = presses[0].rel;
    for (const d of done) {
      const pr = d.presses.map(x => x.rel), dist = ((d.at - pr[0]) / ph).toFixed(2), last = d.ats.length ? Math.max(...d.ats) : d.at;
      console.log(`${seed} b${d.id}: presses ${pr.join(',')} at0 ${d.at0} -> at ${d.at} (${dist} ph, ${((d.at - pr[0]) * bs).toFixed(1)} s), last ${last}, moves ${d.moves.map(m => `${m.from}->${m.to}:${m.why}`).join(' ') || 'none'}, steer ${d.steerMs ?? '-'} ms, exp1 ${d.diag0 && d.diag0.exp1 && d.diag0.exp1.toFixed(1)}, addPrep ${d.diag0 && d.diag0.addPrep && d.diag0.addPrep.toFixed(1)}`);
    }
    if (!done.length) console.log(`${seed}: nothing entered; logs ${logs.join(' | ')}`);
    void fp;
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
