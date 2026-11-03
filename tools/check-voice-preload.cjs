// Radio voice samples load ahead of their lines (#82): a radio session (Live coder, synthwave, Voice: track always with
// many phrases) with the CPU slowed 4 times. It plays the session's start, moves past 40 % of the first song so the next
// one is made, plays across the change into it and then skips to the song after. Each voice sample is followed from its
// first fetch to its decode and its first line heard (a buffer started with gain above 0). It fails when a sample of the
// next song is first fetched on that song's first bars (it was not loaded ahead), or when a sample is decoded less than a
// bar before its first line. A line in the first 4 bars of a start, a seek or a skip only has to start on its bar: those
// bars wait for their samples at most about 100 ms, so with the CPU slowed one may still arrive just in time. The
// scheduler's "took too long" and "skip query: too late" are counted, for information.
// Needs the voice samples in public/samples/say_*.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-voice-preload.cjs [--seed vp82a] [--rate 4] [--list]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SEED = arg('--seed', 'vp82a'), RATE = +arg('--rate', 4);
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 } });
  // every voice sample: fetched, decoded, started (bar in the window's bars and page time); silent warm-ups left out
  await ctx.addInitScript(() => {
    window.__ev = []; window.__warm = []; window.__reach = {}; window.__set = {};
    const sch = () => { try { return document.querySelector('strudel-editor').editor.repl.scheduler; } catch (e) { return null; } };
    const bar = () => { const s = sch(); return s ? s.now() : -1; };
    window.__bar = bar;
    // the page time the scheduler first plays bar B of a part (a start, a seek, a skip)
    window.__watch = B => { window.__reach[B] = null; window.__set[B] = performance.now(); const iv = setInterval(() => { const s = sch(); if (s && s.started && s.now() >= B && s.now() < B + 1) { window.__reach[B] = performance.now(); clearInterval(iv); } }, 15); };
    let sd;
    Object.defineProperty(window, 'superdough', { configurable: true, get: () => sd, set: v => { sd = (val, t, ...a) => { if (val && val.gain === 0) window.__warm.push(t); return v(val, t, ...a); }; } });
    const tagOf = new WeakMap(), of = window.fetch;
    window.fetch = async (u, ...a) => {
      const url = String((u && u.url) || u), say = url.includes('/samples/say_') && url.endsWith('.wav');
      if (say) window.__ev.push({ k: 'fetch', f: decodeURI(url.split('/samples/')[1]), bar: bar(), t: performance.now() });
      const r = await of(u, ...a);
      if (say) { const ab = r.arrayBuffer.bind(r); r.arrayBuffer = async () => { const b = await ab(); tagOf.set(b, url); return b; }; }
      return r;
    };
    const dec = BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData = function (b, ...a) { const url = tagOf.get(b); return dec.call(this, b, ...a).then(buf => { if (url) { buf.__url = url; window.__ev.push({ k: 'decoded', f: decodeURI(url.split('/samples/')[1]), bar: bar(), t: performance.now() }); } return buf; }); };
    const st = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when, ...a) {
      if (this.buffer && this.buffer.__url && !window.__warm.some(w => Math.abs(w - when) < 0.002)) { const s = sch(), now = this.context.currentTime; window.__ev.push({ k: 'play', f: decodeURI(this.buffer.__url.split('/samples/')[1]), bar: bar() + (s ? (when - now) * s.cps : 0), t: performance.now() }); }
      return st.call(this, when, ...a);
    };
  });
  const page = await ctx.newPage();
  const errors = [], logs = { long: 0, late: 0 };
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { const x = m.text(); if (/took too long/.test(x)) logs.long++; if (/skip query: too late/.test(x)) logs.late++; });
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['synthwave'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: 'switch', compilation: 'off', voice: { presence: 'always', phrases: 'many', kind: 'mixed' } })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  const state = () => page.evaluate(() => { const r = globalThis.codingMiskRadio.state; return { onAir: r.onAir, bar: window.__bar(), stream: r.stream.map(x => ({ n: x.n, start: x.start, bars: x.bars, title: x.title, growing: x.growing })) }; });
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
  const parts = [];
  // the session's start: its first 6 bars
  await page.evaluate(() => window.__watch(0));
  await page.fill('#radio-seed', SEED); await page.click('#radio-start');
  parts.push({ name: 'start', B: 0 });
  await until(async () => (await state()).bar >= 6, 120000);
  // past 40 % of the first song: the next one is made and its samples load
  let s = await state();
  const s0 = s.stream[0], at = Math.ceil(s0.bars * 0.4) + 1;
  await page.evaluate(B => window.__watch(B), at);
  await page.evaluate(b => globalThis.codingMiskRadio.seek(b), at);
  parts.push({ name: 'seek', B: at });
  const made = await until(async () => { const x = await state(); return x.stream.length > 1 && !x.stream[1].growing; }, 180000);
  check(made, 'the next song is made', made ? (await state()).stream[1].title : '');
  await until(() => page.evaluate(() => !globalThis.codingMiskVoiceQueue || globalThis.codingMiskVoiceQueue.pending === 0), 60000);
  await sleep(3000);
  // played on across the change into the next song (no seek: a start loads the window's samples itself)
  s = await state();
  const s1 = s.stream[1];
  await until(async () => (await state()).bar >= s1.start + 10, 420000);
  // skip to the song after: its first bars wait for their samples, the rest load one at a time
  const tSkip = await page.evaluate(() => performance.now());
  await page.click('#radio-skip');
  await until(async () => (await state()).onAir === 2, 30000);
  s = await state();
  const s2 = s.stream[2];
  await page.evaluate(B => window.__watch(B), s2.start);
  parts.push({ name: 'skip', B: s2.start });
  await until(async () => (await state()).bar >= s2.start + 8, 120000);
  const r = await page.evaluate(() => ({ ev: window.__ev, reach: window.__reach, set: window.__set }));
  r.set[s2.start] = tSkip;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  // each line heard: the part it plays in (the latest that started before it), its sample's fetch and decode
  const songOf = b => [s0, s1, s2].filter(x => x && b >= x.start).pop();
  const firstOf = (k, f, before) => r.ev.find(e => e.k === k && e.f === f && e.t <= before);
  const plays = r.ev.filter(e => e.k === 'play'), seen = new Set(), late = [], notAhead = [];
  let heard = 0;
  for (const p of plays) {
    if (seen.has(p.f)) continue;
    seen.add(p.f); heard++;
    // (its part: the latest one asked for before the line; a line is started a little before its bar)
    const part = parts.filter(x => r.set[x.B] != null && r.set[x.B] <= p.t).pop(), reach = part && r.reach[part.B] != null ? r.reach[part.B] : Infinity;
    const decoded = r.ev.filter(e => e.k === 'decoded' && e.f === p.f && e.t <= p.t).pop();
    if (!decoded) { late.push(`${p.f} on bar ${(p.bar + 1).toFixed(2)}: not decoded`); continue; }
    const first = part && p.bar < part.B + 4;
    if (decoded.t > reach && !first && p.bar - decoded.bar < 1) late.push(`${p.f} decoded on bar ${(decoded.bar + 1).toFixed(2)}, heard on ${(p.bar + 1).toFixed(2)}`);
  }
  check(heard > 0, 'voice lines heard', `${heard} samples, ${plays.length} lines`);
  if (process.argv.includes('--list')) for (const p of plays) console.log(`      heard on bar ${(p.bar + 1).toFixed(2)} ${p.f}`);
  const inS1 = plays.filter(p => songOf(p.bar) === s1).length;
  check(inS1 > 0, 'voice lines heard in the next song after the change', `${inS1}`);
  // a sample first fetched on the next song's first bars (heard there or later): it was not loaded ahead
  const skipT = r.reach[s2.start] || Infinity, s1Fetch = r.ev.filter(e => e.k === 'fetch' && e.bar >= s1.start - 0.5 && e.bar < s1.start + 10 && e.t < skipT);
  for (const e of s1Fetch) if (firstOf('fetch', e.f, Infinity) === e) notAhead.push(`${e.f} fetched on bar ${(e.bar + 1).toFixed(2)}`);
  check(!notAhead.length, `the next song's samples load before it starts (bar ${s1.start + 1})`, notAhead.join('; '));
  check(!late.length, 'every sample decoded at least a bar before its first line (the first 4 bars of a start or a skip: started on its bar)', late.join('; '));
  console.log(`      scheduler: ${logs.long} "took too long", ${logs.late} "skip query: too late" (CPU slowed ${RATE}x)`);
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  await page.click('#radio-start').catch(() => {});
  await browser.close();
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})();
