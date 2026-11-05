// A typed line never freezes the page (#82): on a radio song in Live coder, Classic and Crescendo, a line typed in the
// console's Voice group and sent with At the right moment and with Say now, then the Undo of the "Saved in your
// phrases" toast. With the CPU slowed 4 times (as on a busy machine), the longest main-thread task from the click until
// three seconds after it, and until two seconds after the line reached the song, stays within the budget (long tasks
// from PerformanceObserver). Each run types new lines, so the voice helper makes their samples as for a user.
// The line still reaches the song. Say now means "in a few seconds": the line goes on the first bar that starts at least
// SAY_LEAD seconds after the click, or a few bars later when its sample or its window was not ready in time (a push);
// the console's queue and Coming next show the bar the line really goes on.
// Before the first fix (fix/82-say-lag) the click and the new window made their work in one block: 150 to 340 ms at
// this rate; before the second (fix/82-say-lag-2) 70 to 205 ms, the Undo included.
// Needs the dev server's voice helper (macOS say and ffmpeg) and the voice samples in public/samples/say_*.
// --cpu-profile <dir>: a CPU profile of each measure (<profile>-<button>.cpuprofile, for Chrome's Performance panel)
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-say-lag.cjs [--budget 100] [--rate 4] [--profiles switch,classic,crescendo] [--cpu-profile dir]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const BUDGET = +arg('--budget', 100), RATE = +arg('--rate', 4), PROFILES = arg('--profiles', 'switch,classic,crescendo').split(',');
const PROF = arg('--cpu-profile', null);
const NAMES = { switch: 'Live coder', classic: 'Classic', crescendo: 'Crescendo' };
// (src/radio/radio.js SAY_LEAD: the seconds Say now leaves at least before the line's bar)
const SAY_LEAD = 2;
// new lines on every run: three words drawn for each, so the voice helper makes the sample as it does for a user
const WORDS = ['amber', 'velvet', 'harbour', 'silver', 'quiet', 'neon', 'river', 'distant', 'paper', 'winter', 'hollow', 'golden', 'midnight', 'glass', 'ember', 'signal', 'echo', 'lantern', 'violet', 'copper', 'thunder', 'cedar', 'marble', 'orbit', 'canyon', 'feather', 'cobalt', 'meadow', 'static', 'falcon'];
const pick = () => { const w = [...WORDS]; return Array.from({ length: 3 }, () => w.splice(Math.floor(Math.random() * w.length), 1)[0]).join(' '); };
const TEXTS = { now: () => `the lights hum ${pick()}`, moment: () => `we drift along ${pick()}`, undo: () => `keep this one ${pick()}` };
const LABEL = { now: 'Say now', moment: 'At the right moment', undo: 'Undo of the saved toast' };
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const worst = [];

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
  // the seconds of a bar of the song on air
  const barSec = bar => page.evaluate(b => { const sg = globalThis.codingMiskRadio.steering.song; let a = 0; for (const x of sg.sections) { if (b < a + x.bars) return 240 / (x.bpm || 120); a += x.bars; } return 240 / (sg.sections[sg.sections.length - 1].bpm || 120); }, bar);
  // the bar the queue and Coming next show for a line (1-based, as written), or null
  const shown = text => page.evaluate(t => {
    const num = el => { const m = el && /(\d+)/.exec(el.textContent); return m ? +m[1] : null; };
    const q = [...document.querySelectorAll('#radio-steer .steer-queue li')].find(li => li.textContent.includes(t));
    const n = [...document.querySelectorAll('.radio-next li[data-at]')].find(li => li.textContent.includes(t));
    return { queue: q ? num(q.querySelector('.at')) : null, next: n ? +n.dataset.at + 1 : null };
  }, text);
  const measureStart = async () => {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    if (PROF) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); await sleep(100); anchor = await page.evaluate(`(function codingMiskAnchor${++anchors}() { const t = performance.now(); while (performance.now() - t < 4); return t; })()`); }
  };
  // (the profile's clock against the page's: a function of known name and time; the long tasks go next to the profile)
  let anchor = 0, anchors = 0;
  const measureEnd = async (t0, file) => {
    const lt = (await page.evaluate(() => window.__lt)).filter(x => x.s + x.d >= t0);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    if (PROF) { const { profile: cpu } = await cdp.send('Profiler.stop'); require('fs').mkdirSync(PROF, { recursive: true }); require('fs').writeFileSync(require('path').join(PROF, `${file}.cpuprofile`), JSON.stringify(cpu)); require('fs').writeFileSync(require('path').join(PROF, `${file}.tasks.json`), JSON.stringify({ anchor, t0, tasks: lt })); }
    return { lt, worst: lt.reduce((a, x) => Math.max(a, x.d), 0) };
  };
  const report = (name, what, m, t0) => {
    worst.push(`${name}, ${what}: ${Math.round(m.worst)} ms`);
    check(m.worst <= BUDGET, `${name}, ${what}: no main-thread task over ${BUDGET} ms (CPU ${RATE}× slower)`, `longest ${Math.round(m.worst)} ms; tasks ${m.lt.map(x => `${Math.round(x.s - t0)}:${Math.round(x.d)}`).join(' ') || 'none'}`);
  };
  for (const profile of PROFILES) {
    const name = NAMES[profile] || profile;
    await page.evaluate(p => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-phrase-settings', JSON.stringify({ save: 'always' })); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['pure-trance'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: p, compilation: 'off', voice: { presence: 'always' } })); }, profile);
    await page.reload(); await sleep(3500);
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    await page.fill('#radio-seed', 'typed-b'); await page.click('#radio-start');
    for (let k = 0; k < 240; k++) { if (await page.evaluate(() => { const s = globalThis.codingMiskRadio.state, it = s && s.stream[s.onAir]; return !!it && !it.growing && (it.grown || it.profile === 'classic'); })) break; await sleep(250); }
    await sleep(3000);
    // the page alone, nothing typed: the same three seconds, for comparison (reported, not checked)
    {
      await measureStart();
      const t0 = await page.evaluate(() => { window.__lt = []; return performance.now(); });
      await sleep(3000);
      const m = await measureEnd(t0, `${profile}-idle`);
      worst.push(`${name}, nothing typed (for comparison): ${Math.round(m.worst)} ms`);
      console.log(`info  ${name}, nothing typed: longest task ${Math.round(m.worst)} ms (CPU ${RATE}× slower; tasks ${m.lt.map(x => `${Math.round(x.s - t0)}:${Math.round(x.d)}`).join(' ') || 'none'})`);
    }
    // (At the right moment first: the song's first free part for the voice track is near its start)
    for (const mode of ['moment', 'now']) {
      const text = TEXTS[mode]();
      await measureStart();
      await page.fill('#radio-steer [data-sv-line]', text);
      // (the bar the click handler really sees: page.click first scrolls and checks the button, which at this CPU rate takes
      // a few hundred ms after the song was read, so a song position read before the click made the lead look longer than
      // the app's rule; the capturing listener reads it on the click itself)
      await page.evaluate(() => { const sch = () => document.querySelector('strudel-editor').editor.repl.scheduler; document.addEventListener('click', () => { const s = globalThis.codingMiskRadio.state; window.__clickRel = sch().now() - s.stream[s.onAir].start; }, { capture: true, once: true }); });
      const t0 = await page.evaluate(() => { window.__lt = []; return performance.now(); });
      await page.click(`#radio-steer [data-sv-say="${mode}"]`);
      const q = await page.evaluate(() => window.__clickRel);
      let clip = null, seenAt = null, at = null;
      // (the queue and Coming next are read while the line waits for its bar)
      for (let k = 0; k < 400 && !clip; k++) { await sleep(30); clip = await clipOf(text); if (clip) { seenAt = await rel(); at = await shown(text); } }
      if (clip && mode === 'now') { await sleep(300); at = await shown(text); clip = await clipOf(text); }
      const t1 = await page.evaluate(() => performance.now());
      await sleep(Math.max(2000, 3000 - (t1 - t0)));
      const m = await measureEnd(t0, `${profile}-${mode}`);
      check(!!clip, `${name}, ${LABEL[mode]}: the line reaches the song`, clip ? `bar ${clip.start + 1}, seen on ${seenAt.toFixed(2)}` : '');
      report(name, LABEL[mode], m, t0);
      if (clip && mode === 'now') {
        // Say now in a few seconds: the first bar at least SAY_LEAD s after the click, a bar later at most (or pushed)
        const bs = await barSec(clip.start), lead = (clip.start - q) * bs, pushed = await page.evaluate(t => (globalThis.codingMiskRadio.sayPushes || {})[t] || 0, text);
        check(lead >= SAY_LEAD - 0.05, `${name}, Say now: the line goes at least ${SAY_LEAD} s after the click`, `click on bar ${q.toFixed(2)}, line on bar ${clip.start}: ${lead.toFixed(2)} s, ${pushed} push(es)`);
        check(pushed > 0 || lead <= SAY_LEAD + bs + 0.05, `${name}, Say now: on the first bar after the lead when not pushed`, `${lead.toFixed(2)} s, a bar ${bs.toFixed(2)} s`);
        check(at && at.queue === clip.start + 1, `${name}, Say now: the queue shows the line's bar`, `queue ${at && at.queue}, line ${clip.start + 1}`);
        check(at && at.next === clip.start + 1, `${name}, Say now: Coming next shows the line on its bar`, `Coming next ${at && at.next}, line ${clip.start + 1}`);
      }
      if (clip && mode === 'moment') check(at && at.queue === clip.start + 1, `${name}, At the right moment: the queue shows the line's bar`, `queue ${at && at.queue}, line ${clip.start + 1}`);
      await sleep(1500);
    }
    // the Undo of "Saved in your phrases" (save policy Always): the toast comes on the click, Undo pressed once the line
    // and its sample are in, while the toast still shows
    {
      const text = TEXTS.undo();
      await page.fill('#radio-steer [data-sv-line]', text);
      const c0 = Date.now();
      await page.click('#radio-steer [data-sv-say="moment"]');
      for (let k = 0; k < 100; k++) { if (await clipOf(text) && await page.evaluate(t => !document.querySelector('#radio-steer .steer-queue') || ![...document.querySelectorAll('#radio-steer .steer-queue li')].some(li => li.textContent.includes(t) && li.textContent.includes('…')), text)) break; await sleep(30); }
      await sleep(Math.max(0, 2000 - (Date.now() - c0)));
      const saved = await page.evaluate(t => (JSON.parse(localStorage.getItem('coding-misk-phrases') || '{}').items || []).some(p => p.text === t), text);
      const undo = page.locator('.toast:not([hidden]) .toast-act', { hasText: 'Undo' });
      const has = await undo.count();
      check(saved && has, `${name}, Undo: the line is saved and its toast offers Undo`, `saved ${saved}, Undo buttons ${has}`);
      if (has) {
        await measureStart();
        const t0 = await page.evaluate(() => { window.__lt = []; return performance.now(); });
        await undo.first().click();
        await sleep(3000);
        const m = await measureEnd(t0, `${profile}-undo`);
        const gone = await page.evaluate(t => !(JSON.parse(localStorage.getItem('coding-misk-phrases') || '{}').items || []).some(p => p.text === t), text);
        check(gone, `${name}, Undo: the phrase leaves my phrases`);
        report(name, LABEL.undo, m, t0);
      }
    }
    await page.click('#radio-start').catch(() => {});
    await sleep(500);
  }
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  console.log(`\nlongest task per action (CPU ${RATE}×):\n  ${worst.join('\n  ')}`);
  await browser.close();
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})();
