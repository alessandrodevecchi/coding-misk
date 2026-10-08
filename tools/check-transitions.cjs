// Browser checks for transitions in the radio (#23): for each kind, the radio plays through the end of a song
// into the next one without evaluation or page errors, with levels below clipping.
// Usage: PLAYWRIGHT_CORE=... node tools/check-transitions.cjs [kind,kind…]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const KINDS = (process.argv[2] || 'mix,morph,echo,break,interlude').split(',');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno'], chaos: 0.3, energy: 0.7, complexity: 0.5, talk: 0.5, artist: null, transition: 'mix', harmony: 'compatible' })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-tab="radio"]'); await sleep(400);
  const R = () => page.evaluate(() => globalThis.codingMiskRadio.state);
  const ed = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor; return { err: String(e.repl.state.evalError || ''), cyc: e.repl.scheduler.now() }; });
  const peak = ms => page.evaluate(async ms => { let m = 0; const end = performance.now() + ms; while (performance.now() < end) { for (const a of Object.keys(window.analysers || {})) { const d = getAnalyzerData('time', a); for (const v of d) m = Math.max(m, Math.abs(v)); } await new Promise(r => setTimeout(r, 50)); } return m; }, ms);
  const waitFor = async (fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(200); } return false; };

  for (const kind of KINDS) {
    await page.selectOption('#radio-transition', kind); await sleep(100);
    await page.click('#radio-start'); await sleep(2500);
    let st = await R();
    // past 40 % of the first song the next one is generated, with the transition planned
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(st.stream[0].bars * 0.45)); await sleep(500);
    const ready = await waitFor(async () => ((await R()).stream.length > 1));
    st = await R();
    const plan = await page.evaluate(() => { const s = globalThis.codingMiskRadio.state; return s && s.transition; });
    const s0 = st.stream[0], s1 = st.stream[1];
    check(ready && s1, `${kind}: next song prepared`);
    if (!s1) { await page.click('#radio-start'); continue; }
    check(plan && plan.kind === kind, `${kind}: planned`, JSON.stringify(plan));
    // play the last bars of the first song, through the transition, into the next one
    const from = Math.min(s1.start, s0.start + s0.bars) - s0.start - 3;
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.max(0, from)); await sleep(300);
    const p = await peak(5000);
    const switched = await waitFor(async () => (await R()).onAir === 1, 40000);
    const e = await ed();
    check(switched, `${kind}: the next song comes on air`);
    check(!e.err, `${kind}: no evaluation error`, e.err.slice(0, 120));
    check(p > 0.02 && p < 1, `${kind}: sound below clipping during the transition`, p.toFixed(2));
    await page.click('#radio-start'); await sleep(500);
  }
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
