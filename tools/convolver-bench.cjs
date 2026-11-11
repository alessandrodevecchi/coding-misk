// A playing convolver's buffer replaced against a fresh convolver given the same buffer, in Chrome, alternated, while
// a Classic radio song plays (the app's own load). Per trial: the set's own time and the longest task in the next 1.5 s.
// Usage: PORT=5173 PLAYWRIGHT_CORE=... node tools/convolver-bench.cjs [trials=10] [rate=1] [seconds=3] [more=0]
// (more: other convolvers playing beside it, as the orbits of a song; #82, the reverb limit of notes 8 November)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TRIALS = +(process.argv[2] || 10), RATE = +(process.argv[3] || 1), SECS = +(process.argv[4] || 3), MANY = +(process.argv[5] || 0);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  await ctx.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  const R = (fn, a) => page.evaluate(fn, a);
  await R(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: 'classic', compilation: 'off' })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'conv-bench'); await page.click('#radio-start'); await sleep(8000);
  // a noise source through a convolver into a quiet gain, as an orbit's reverb is fed by its notes
  await R(([secs, many]) => {
    const ac = globalThis.getAudioContext(), sr = ac.sampleRate;
    const ir = k => { const b = ac.createBuffer(2, Math.round(secs * sr), sr); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2 + k); } return b; };
    const noise = ac.createBuffer(1, sr, sr); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = ac.createBufferSource(); src.buffer = noise; src.loop = true; const quiet = ac.createGain(); quiet.gain.value = 0.0001; quiet.connect(ac.destination);
    const feed = ac.createGain(); src.connect(feed); src.start();
    const irs = [ir(0), ir(1), ir(2), ir(3)];
    let playing = ac.createConvolver(); playing.buffer = irs[0]; feed.connect(playing); playing.connect(quiet);
    for (let j = 0; j < many; j++) { const c = ac.createConvolver(); c.buffer = irs[j % 4]; feed.connect(c); c.connect(quiet); }
    let n = 0;
    window.__bench = {
      // the playing convolver gets another response
      replace() { const t = performance.now(); playing.buffer = irs[++n % 4]; return performance.now() - t; },
      // a fresh convolver gets a response and joins the feed
      fresh() { const t = performance.now(), c = ac.createConvolver(); c.buffer = irs[++n % 4]; feed.connect(c); c.connect(quiet); const ms = performance.now() - t; window.__old = (window.__old || []).concat(c); return ms; },
    };
  }, [SECS, MANY]);
  if (RATE !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  const out = { replace: [], fresh: [] };
  for (let k = 0; k < TRIALS * 2; k++) {
    const kind = k % 2 ? 'fresh' : 'replace';
    await sleep(1200);
    const t0 = await R(() => { window.__lt = []; return performance.now(); });
    const ms = await R(kd => window.__bench[kd](), kind);
    await sleep(1500);
    const lt = await R(() => window.__lt);
    const worst = Math.round(lt.reduce((a, x) => Math.max(a, x.d), 0));
    out[kind].push({ ms: +ms.toFixed(1), worst });
  }
  if (RATE !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const sum = a => { const s = a.map(x => x.ms).sort((p, q) => p - q), w = a.map(x => x.worst).sort((p, q) => p - q); return `set median ${s[Math.floor(s.length / 2)]} ms, max ${s[s.length - 1]} ms; longest task after it median ${w[Math.floor(w.length / 2)]} ms, max ${w[w.length - 1]} ms, over 100 ms ${w.filter(x => x > 100).length}/${w.length}`; };
  console.log(`CPU ${RATE}×, ${MANY} more convolvers playing, ${SECS} s responses, ${TRIALS} trials each, alternated`);
  console.log(`replace a playing convolver's buffer: ${sum(out.replace)}  [${out.replace.map(x => `${x.ms}/${x.worst}`).join(' ')}]`);
  console.log(`fresh convolver with the buffer:     ${sum(out.fresh)}  [${out.fresh.map(x => `${x.ms}/${x.worst}`).join(' ')}]`);
  await browser.close();
})();
