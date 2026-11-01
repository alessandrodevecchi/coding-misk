// A typed line never freezes the page (#82): on a radio song in Live coder, Classic and Crescendo, a line typed in the
// console's Voice group and sent with At the right moment and with Say now. With the CPU slowed 4 times (as on a busy
// machine), the longest main-thread task from the click until two seconds after the line reached the song stays within
// the budget (long tasks from PerformanceObserver). The line still reaches the song; with Say now on a Crescendo song it
// goes on the first bar at least half a bar after the command, so between half a bar and a bar and a half later.
// Before the fix the click and the new window made their work in one block: 150 to 340 ms at this rate.
// Needs the dev server's voice helper (macOS say and ffmpeg) and the voice samples in public/samples/say_*.
// --cpu-profile <dir>: a CPU profile of each measure (<profile>-<button>.cpuprofile, for Chrome's Performance panel)
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-say-lag.cjs [--budget 150] [--rate 4] [--profiles switch,classic,crescendo] [--cpu-profile dir]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const BUDGET = +arg('--budget', 150), RATE = +arg('--rate', 4), PROFILES = arg('--profiles', 'switch,classic,crescendo').split(',');
const PROF = arg('--cpu-profile', null);
const NAMES = { switch: 'Live coder', classic: 'Classic', crescendo: 'Crescendo' };
// one fixed line per profile and button: its sample is made once by the voice helper, then found
const TEXTS = { now: 'the harbour lights hum a slow tune', moment: 'we drift along the silver wire' };
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  await ctx.addInitScript(() => {
    window.__lt = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  const helper = await page.evaluate(() => fetch('/voice/status').then(r => r.ok).catch(() => false));
  if (!helper) { check(false, 'the dev server voice helper answers'); await browser.close(); process.exit(1); }
  const rel = () => page.evaluate(() => { const sch = document.querySelector('strudel-editor').editor.repl.scheduler, s = globalThis.codingMiskRadio.state; return sch.now() - s.stream[s.onAir].start; });
  // the clip of a typed line on the song on air, or null
  const clipOf = text => page.evaluate(t => { const s = globalThis.codingMiskRadio.steering, sp = s && s.song.tracks.find(x => x.type === 'spoken'), k = sp && Object.keys(sp.patterns).find(q => sp.patterns[q].text && Object.values(sp.patterns[q].text).includes(t)); return k ? sp.clips.find(c => c.pattern === k) || null : null; }, text);
  for (const profile of PROFILES) {
    const name = NAMES[profile] || profile;
    await page.evaluate(p => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['pure-trance'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: p, compilation: 'off', voice: { presence: 'always' } })); }, profile);
    await page.reload(); await sleep(3500);
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    await page.fill('#radio-seed', 'typed-b'); await page.click('#radio-start');
    for (let k = 0; k < 240; k++) { if (await page.evaluate(() => { const s = globalThis.codingMiskRadio.state, it = s && s.stream[s.onAir]; return !!it && !it.growing && (it.grown || it.profile === 'classic'); })) break; await sleep(250); }
    await sleep(3000);
    // (At the right moment first: the song's first free part for the voice track is near its start)
    for (const mode of ['moment', 'now']) {
      const text = TEXTS[mode];
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
      if (PROF) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
      await page.fill('#radio-steer [data-sv-line]', text);
      const t0 = await page.evaluate(() => { window.__lt = []; return performance.now(); });
      await page.click(`#radio-steer [data-sv-say="${mode}"]`);
      let clip = null, seenAt = null;
      for (let k = 0; k < 300 && !clip; k++) { await sleep(30); clip = await clipOf(text); if (clip) seenAt = await rel(); }
      await sleep(2000);
      const lt = (await page.evaluate(() => window.__lt)).filter(x => x.s + x.d >= t0);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      if (PROF) { const { profile: cpu } = await cdp.send('Profiler.stop'); require('fs').mkdirSync(PROF, { recursive: true }); require('fs').writeFileSync(require('path').join(PROF, `${profile}-${mode}.cpuprofile`), JSON.stringify(cpu)); }
      const worst = lt.reduce((a, x) => Math.max(a, x.d), 0);
      check(!!clip, `${name}, ${mode === 'now' ? 'Say now' : 'At the right moment'}: the line reaches the song`, clip ? `bar ${clip.start + 1}, seen on ${seenAt.toFixed(2)}` : '');
      check(worst <= BUDGET, `${name}, ${mode === 'now' ? 'Say now' : 'At the right moment'}: no main-thread task over ${BUDGET} ms (CPU ${RATE}× slower)`, `longest ${Math.round(worst)} ms; tasks ${lt.map(x => `${Math.round(x.s - t0)}:${Math.round(x.d)}`).join(' ') || 'none'}`);
      // (the command keeps the bar it was given on, q, on a grown song)
      if (clip && mode === 'now' && profile === 'crescendo') {
        const c = await page.evaluate(t => globalThis.codingMiskRadio.steering.commands.find(x => x.kind === 'say-live' && x.text === t), text);
        const d = c && Number.isFinite(c.q) ? clip.start - c.q : NaN;
        check(d >= 0.5 && d <= 1.5, `${name}, Say now: the line goes between half a bar and a bar and a half after the command`, `command on ${c && c.q}, line on bar ${clip.start}: ${d.toFixed(2)} bar`);
      }
      await sleep(1500);
    }
    await page.click('#radio-start').catch(() => {});
    await sleep(500);
  }
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  await browser.close();
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})();
