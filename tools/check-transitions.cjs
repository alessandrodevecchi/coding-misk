// Browser checks for transitions in the radio (#23): for each kind, the radio plays through the end of a song
// into the next one without evaluation or page errors, with the master output below clipping (level-headroom: a track
// line above the style's headroom is a warning); a part varied before the end plays into the transition (radio-variation).
// Then the same with Profile set to Live coder (radio-profiles 4.2), cut included: each transition goes into and out of a
// Live coder song grown on air, the incoming song hidden on its own orbits; the orbits in use per window are reported.
// Usage: PLAYWRIGHT_CORE=... node tools/check-transitions.cjs [kind,kind…] [--classic | --coder]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { CLIP, tapOutput, outputPeak, songHeadroom } = require('./output-peak.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const argv = process.argv.slice(2), KINDS = (argv.find(a => !a.startsWith('--')) || 'mix,morph,echo,break,interlude').split(',');
const RUNS = [...(argv.includes('--coder') ? [] : [{ profile: 'artist', kinds: KINDS, name: '' }]), ...(argv.includes('--classic') ? [] : [{ profile: 'switch', kinds: [...new Set([...KINDS, 'cut'])], name: 'Live coder ' }])];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno'], chaos: 0.3, energy: 0.7, complexity: 0.5, talk: 0.5, artist: null, transition: 'mix', harmony: 'compatible' })); });
  await page.reload(); await sleep(3500);
  await tapOutput(page);
  // the radio plays berlin-techno songs: its headroom
  const room = await songHeadroom({ tags: { styles: ['berlin-techno'] } });
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(400);
  const R = () => page.evaluate(() => globalThis.codingMiskRadio.state);
  const ed = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor; return { err: String(e.repl.state.evalError || ''), cyc: e.repl.scheduler.now() }; });
  // the highest track line, for the warning
  const peak = ms => page.evaluate(async ms => { let m = 0; const end = performance.now() + ms; while (performance.now() < end) { for (const a of Object.keys(window.analysers || {})) { const d = getAnalyzerData('time', a); for (const v of d) m = Math.max(m, Math.abs(v)); } await new Promise(r => setTimeout(r, 50)); } return m; }, ms);
  const waitFor = async (fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(200); } return false; };

  // the orbits of the events of the next bars (the hidden song's from 20 up)
  const orbitsAhead = bars => page.evaluate(b => { const s = document.querySelector('strudel-editor').editor.repl.scheduler, c = s.now(); return [...new Set(s.pattern.queryArc(c, c + b).filter(h => h.hasOnset()).map(h => h.value.orbit))].sort((x, y) => x - y); }, bars);
  for (const run of RUNS) for (const k of run.kinds) {
    const kind = k, label = `${run.name}${k}`;
    await page.selectOption('#radio-profile', run.profile); await sleep(100);
    await page.selectOption('#radio-transition', kind); await sleep(100);
    await page.click('#radio-start'); await sleep(2500);
    let st = await R();
    // past 40 % of the first song the next one is generated, with the transition planned
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(st.stream[0].bars * 0.45)); await sleep(500);
    const ready = await waitFor(async () => { const x = await R(); return x.stream.length > 1 && !x.stream[1].growing; }, 60000);
    st = await R();
    const plan = await page.evaluate(() => { const s = globalThis.codingMiskRadio.state; return s && s.transition; });
    const s0 = st.stream[0], s1 = st.stream[1];
    check(ready && s1, `${label}: next song prepared`);
    if (!s1) { await page.click('#radio-start'); continue; }
    check(plan && plan.kind === kind, `${label}: planned`, JSON.stringify(plan));
    if (run.profile === 'switch') check(s0.grown && s1.grown && s1.show === 'hidden', `${label}: both songs grown, the incoming one hidden`, JSON.stringify([s0.profile, s0.grown, s1.profile, s1.grown, s1.show]));
    // a vary on the first song (radio-variation 3.3): the varied part plays into the transition (Classic songs: a grown
    // song is steered with waypoints in radio-profiles stage 5)
    if (run.profile !== 'switch') for (const type of ['lead', 'bass', 'arp', 'pad']) {
      if (await page.evaluate(() => globalThis.codingMiskRadio.steering.song.build.some(x => x.by && x.pattern))) break;
      await page.evaluate(t => globalThis.codingMiskRadio.command({ kind: 'vary', type: t }), type); await sleep(200);
    }
    if (run.profile !== 'switch') check(await page.evaluate(() => globalThis.codingMiskRadio.steering.song.build.some(x => x.by && x.pattern && /^V\d+$/.test(x.pattern.to))), `${label}: a part varied before the end`);
    st = await R();
    // play the last bars of the first song, through the transition, into the next one
    const from = Math.min(s1.start, s0.start + s0.bars) - s0.start - 3;
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.max(0, from)); await sleep(300);
    await outputPeak(page);
    const p = await peak(5000), out = await outputPeak(page), orbits = await orbitsAhead(4);
    const switched = await waitFor(async () => (await R()).onAir === 1, 40000);
    const e = await ed();
    check(switched, `${label}: the next song comes on air`);
    check(!e.err, `${label}: no evaluation error`, e.err.slice(0, 120));
    check(out > 0.02 && out <= CLIP, `${label}: output below clipping during the transition`, `output ${out.toFixed(2)}, loudest line ${p.toFixed(2)}`);
    if (p > room) console.log(`warn  ${label}: a track line above the headroom ${room} (${p.toFixed(2)}), output ${out.toFixed(2)}`);
    console.log(`      ${label}: orbits in use in the window ${orbits.length} (${orbits.join(',')})`);
    await page.click('#radio-start'); await sleep(500);
  }
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
