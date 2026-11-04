// The first narrator lines are heard on a cold start in Compose (narrator-caption-sync D6, #82): a fresh browser context
// with the HTTP cache off and the CPU slowed 4 times; luci-rosse grown in Crescendo with the poetic style. Play from bar
// 0: the bar-1 line starts on bar 1, every voice sample of the first 4 bars is decoded before its line, the audio engine
// reports no "took too long" for a say_ sample of those bars, and the delay from the click to the first bar is reported
// (at most COLD_WAIT, 400 ms, plus 150 ms). Then a seek while playing to a bar with a narrator line (bar 41, or the
// first line from there): the line starts on that bar. Each voice sample is followed from its fetch to its decode and
// its first buffer started with gain above 0 (the silent warm-ups left out), as in tools/check-voice-preload.cjs.
// --repeat (narrator-caption-sync D4): with the voice helper, a new phrase of mine (Sempre, said on every narrator line)
// in a song whose narrator has a speaker (switch-tappe, flo), with no sample yet. The page asks the helper for the
// speaker's sample; that request is held back while the default voice's sample is made, so only the default voice's
// sample exists when Play is pressed. The speaker's sample is let through once the phrase was heard from say_en: the
// phrase must start once on each bar the song says it (no late replay), and later it must play from the speaker's
// bank. Without the voice helper: a skip note.
// Needs the voice samples in public/samples/say_*.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-voice-coldstart.cjs [--rate 4] [--seek 40] [--list] [--repeat]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const RATE = +arg('--rate', 4), SEEK = +arg('--seek', 40), BASE = `http://localhost:${process.env.PORT || 5173}`, WAIT = 180000;
const COLD_WAIT = 400, REPEAT = process.argv.includes('--repeat');
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
// (the app's saySlug)
const slugOf = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
// a phrase neither the speaker's bank nor the default voice has yet, so its samples are made during the run
function freshPhrase(bank) {
  const dir = path.join(__dirname, '..', 'public', 'samples', bank), def = path.join(__dirname, '..', 'public', 'samples', 'say_en');
  const A = ['copper', 'amber', 'cobalt', 'violet', 'silver', 'crimson', 'jade', 'ivory'], B = ['lantern', 'harbour', 'window', 'garden', 'mirror', 'compass', 'ladder', 'meadow'];
  const k0 = Math.floor(Math.random() * 64);
  for (let i = 0; i < 64; i++) {
    const k = (k0 + i) % 64, text = `a ${A[k % 8]} ${B[Math.floor(k / 8)]} hums along`;
    if (![dir, def].some(d => fs.existsSync(path.join(d, `${slugOf(text)}.wav`)))) return text;
  }
  return null;
}

// the page's instruments: every voice sample fetched, decoded and started (bar from the scheduler, page time)
function instrument() {
  window.__ev = []; window.__warm = []; window.__reach = {}; window.__set = {};
  const sch = () => { try { return document.querySelector('strudel-editor').editor.repl.scheduler; } catch (e) { return null; } };
  const bar = () => { const s = sch(); return s ? s.now() : -1; };
  window.__bar = bar;
  // the page time the scheduler first plays bar B (a start, a seek)
  window.__watch = B => { window.__reach[B] = null; window.__set[B] = performance.now(); const iv = setInterval(() => { const s = sch(); if (s && s.started && s.now() >= B && s.now() < B + 1) { window.__reach[B] = performance.now(); clearInterval(iv); } }, 5); };
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
}
async function openSong(page, id, { profile, style }) {
  await page.click('[data-tab="componi"]'); await sleep(300);
  for (let k = 0; k < 3; k++) { await page.selectOption('#track-pick', id); await sleep(1200); if (await page.evaluate(x => globalThis.codingMiskPatterns.compose().T.id === x, id)) break; }
  if (await page.$eval('#live-toggle', el => el.getAttribute('aria-pressed')) !== 'true') { await page.click('#live-toggle'); await sleep(600); }
  await page.$eval(`#live-profile [data-profile="${profile}"]`, el => el.click());
  await sleep(400);
  await page.selectOption('#live-narrator-style', style).catch(() => {});
  await sleep(300);
  await page.waitForFunction(() => !globalThis.codingMiskBars().compose.pending, null, { timeout: WAIT });
  await sleep(800);
}
async function fresh(browser, init, before) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 } });
  await ctx.addInitScript(instrument);
  const page = await ctx.newPage();
  if (before) await before(page);
  const errors = [], long = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { const x = m.text(); const g = /loading sound "([^"]+)" took too long/.exec(x); if (g) long.push(g[1]); });
  // (the bar of each "took too long", read at once in the page)
  page.on('console', async m => { if (/took too long/.test(m.text())) { try { const b = await page.evaluate(() => window.__bar()); long.bars = (long.bars || []).concat(b); } catch (e) {} } });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto(`${BASE}/`); await sleep(2500);
  await page.evaluate(init || (() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); }));
  await page.reload(); await sleep(3500);
  return { ctx, page, cdp, errors, long };
}
const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(100); } return false; };
const barNow = page => page.evaluate(() => window.__bar());

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

  // ---- cold start: luci-rosse, Crescendo, poetic
  {
    const { page, cdp, errors, long } = await fresh(browser);
    await openSong(page, 'luci-rosse', { profile: 'crescendo', style: 'poetic' });
    const lines = (await page.evaluate(() => globalThis.codingMiskCaptions.lines())).filter(x => x.kind === 'narrator');
    check(lines.length > 4 && lines[0].at === 0, 'luci-rosse poetic: narrator lines, the first on bar 1', `${lines.length} lines, the first on bar ${lines[0] ? lines[0].at + 1 : '-'}`);
    const fetchedBefore = await page.evaluate(() => window.__ev.filter(e => e.k === 'fetch').length);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    await page.evaluate(() => window.__watch(0));
    await page.click('#play');
    await until(async () => (await barNow(page)) >= 6, 120000);
    // the seek: to the first narrator line from SEEK on
    const target = lines.find(x => x.at >= SEEK) || lines[lines.length - 1];
    await page.evaluate(B => window.__watch(B), target.at);
    await page.evaluate(B => globalThis.codingMiskCaptions.seek(B), target.at);
    await until(async () => (await barNow(page)) >= target.at + 3, 60000);
    const r = await page.evaluate(() => ({ ev: window.__ev, reach: window.__reach, set: window.__set }));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const plays = r.ev.filter(e => e.k === 'play');
    if (process.argv.includes('--list')) for (const p of plays) console.log(`      heard on bar ${(p.bar + 1).toFixed(2)} ${p.f}`);
    // the sample of a line: the play event of its text nearest its bar
    const heardAt = (x, from = -Infinity) => plays.filter(p => p.t >= from && p.f.endsWith(`/${slugOf(x.text)}.wav`)).sort((a, b) => Math.abs(a.bar - x.at) - Math.abs(b.bar - x.at))[0];
    check(fetchedBefore === 0, 'a cold start: no voice sample fetched before Play', `${fetchedBefore}`);
    const first = heardAt(lines[0]);
    check(first && Math.abs(first.bar - lines[0].at) < 0.1, `the bar-1 line "${lines[0].text}" starts on bar 1`, first ? `started on bar ${(first.bar + 1).toFixed(3)}` : 'never started');
    const early = lines.filter(x => x.at < 4), bad = [];
    for (const x of early) {
      const p = heardAt(x), d = p && r.ev.find(e => e.k === 'decoded' && e.f === p.f);
      if (!p) bad.push(`"${x.text}" never started`);
      else if (Math.abs(p.bar - x.at) >= 0.1) bad.push(`"${x.text}" started on bar ${(p.bar + 1).toFixed(2)}, not ${x.at + 1}`);
      else if (!d || d.t > p.t || (x.at === 0 && r.reach[0] != null && d.t > r.reach[0])) bad.push(`"${x.text}" decoded ${d ? `on bar ${(d.bar + 1).toFixed(2)}` : 'never'}`);
    }
    check(!bad.length, 'every voice sample of the first 4 bars decoded before its line, and its line on its bar', bad.join('; ') || `${early.length} lines`);
    // ("took too long" names "bank:n": the samples of the first 4 bars' lines by their index in the manifest)
    const man = await page.evaluate(() => globalThis.codingMiskPhrases.manifest());
    const keyOf = f => { const b = f.split('/')[0], n = (man[b] || []).findIndex(x => decodeURI(x).endsWith(f.slice(b.length))); return `${b}:${n}`; };
    const earlyKeys = new Set(early.map(x => heardAt(x)).filter(Boolean).map(p => keyOf(p.f)));
    const tooLong = long.filter(x => /^say_/.test(x)), tooLongEarly = tooLong.filter(x => earlyKeys.has(x));
    check(!tooLongEarly.length, 'no "took too long" for a voice sample of the first 4 bars', tooLongEarly.join(', ') || `${[...earlyKeys].join(', ')} in time; ${tooLong.length} later voice samples too late${tooLong.length ? `: ${tooLong.join(', ')}` : ''}`);
    const delay = r.reach[0] != null ? r.reach[0] - r.set[0] : null;
    check(delay !== null && delay <= COLD_WAIT + 150, 'the start delay from the click to bar 1', delay === null ? 'bar 1 never reached' : `${Math.round(delay)} ms (CPU slowed ${RATE}x; the voice wait is at most ${COLD_WAIT} ms)`);
    const seekHeard = heardAt(target, r.set[target.at]);
    check(seekHeard && Math.abs(seekHeard.bar - target.at) < 0.1, `the seek to bar ${target.at + 1}: "${target.text}" starts on that bar`, seekHeard ? `started on bar ${(seekHeard.bar + 1).toFixed(3)}, resumed ${r.reach[target.at] != null ? Math.round(r.reach[target.at] - r.set[target.at]) : '-'} ms after the seek` : 'never started');
    console.log(`      scheduler: ${long.length} "took too long" in all (CPU slowed ${RATE}x)${long.bars ? `, on bars ${long.bars.map(b => (b + 1).toFixed(2)).join(', ')}` : ''}`);
    check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
    await page.click('#stop').catch(() => {});
    await page.context().close();
  }

  // ---- --repeat: a line heard from the default voice is not played again when the speaker's sample arrives
  if (REPEAT) {
    const ok = await fetch(`${BASE}/voice/status`).then(r => r.json()).then(j => !!(j && j.ok), () => false);
    const SONG = 'switch-tappe', SPK = 'kathy', BANK = `say_en_${SPK}`;
    const text = ok ? freshPhrase(BANK) : null;
    if (!ok) console.log('skip  --repeat: no voice helper on this dev server (macOS say and ffmpeg)');
    else if (!text) console.log(`skip  --repeat: no fresh phrase left for ${BANK}`);
    else {
      const init = ph => {
        localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en');
        // (the phrase of All, said on every vocabulary line: Sempre)
        localStorage.setItem('coding-misk-phrases', JSON.stringify({ format: 1, items: [{ id: 'ph_cs82', text: ph, lang: 'en', alt: {}, kinds: ['voice', 'explain', 'poetic'], tag: null, styles: [], on: true, source: 'tab', from: {}, created: new Date().toISOString(), uses: 0, last: null }] }));
        localStorage.setItem('coding-misk-phrase-settings', JSON.stringify({ save: 'always', temp: '24h', share: 'always' }));
      };
      // The phrase has no sample at all, so the page asks the voice helper for the speaker's. That request is held
      // back; meanwhile the default voice's sample is made (by this script: the page's own request for it, from a song
      // with no speaker, is refused) and read, so the default voice speaks the phrase. The speaker's sample is let
      // through once the phrase was heard: it arrives after the default voice spoke the line.
      let release, asked = 0;
      const gate = new Promise(r => { release = r; });
      const route = page => page.route('**/voice/say', async rt => {
        const body = (() => { try { return JSON.parse(rt.request().postData() || '{}'); } catch (e) { return {}; } })();
        if (body.text === text && !body.speaker) return rt.abort();
        if (body.text === text && body.speaker === SPK) { asked++; await gate; }
        await rt.continue();
      });
      const { page, errors } = await fresh(browser, `(${init.toString()})(${JSON.stringify(text)})`, route);
      await openSong(page, SONG, { profile: 'crescendo', style: 'explain' });
      const lines = (await page.evaluate(() => globalThis.codingMiskCaptions.lines())).filter(x => x.kind === 'narrator');
      check(await until(async () => asked > 0, 60000), `the page asks the voice helper for the phrase in ${BANK}`, `"${text}"`);
      const r0 = await fetch(`${BASE}/voice/say`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang: 'en', speaker: '' }) });
      await page.evaluate(() => globalThis.codingMiskCaptions.reload());
      await sleep(1500);
      const said = (await page.evaluate(() => globalThis.codingMiskCaptions.lines())).filter(x => x.kind === 'narrator' && x.text === text);
      check(r0.ok && said.length >= 2, `${SONG}: the default voice's sample made, the phrase said on several narrator lines`, `${said.length} lines`);
      await page.evaluate(() => window.__watch(0));
      await page.click('#play');
      const slug = slugOf(text), playsOf = () => page.evaluate(s => window.__ev.filter(e => e.k === 'play' && e.f.endsWith(`/${s}.wav`)), slug);
      const heard = await until(async () => (await playsOf()).length > 0, 60000);
      const h0 = heard ? (await playsOf())[0] : null;
      check(heard && h0.f.startsWith('say_en/'), 'the phrase heard from the default voice first', h0 ? `${h0.f} on bar ${(h0.bar + 1).toFixed(2)}` : 'never');
      release();
      const made = await until(() => page.evaluate(([b, s]) => (globalThis.codingMiskPhrases.manifest()[b] || []).some(f => f.endsWith(`/${s}.wav`)), [BANK, slug]), 90000);
      const madeAt = await barNow(page);
      check(made, `the speaker's sample made while the song plays (${BANK})`, `read on bar ${(madeAt + 1).toFixed(2)}`);
      // played on to the next line that says it after the new code (the bar after the sample was read), two bars more
      const next = said.find(x => x.at > madeAt + 1);
      if (next) await until(async () => (await barNow(page)) >= next.at + 2, 240000);
      const plays = await playsOf(), list = plays.map(p => `${p.f.split('/')[0]} on bar ${(p.bar + 1).toFixed(2)}`).join(', ');
      const twice = said.filter(x => plays.filter(p => Math.abs(p.bar - x.at) < 0.1).length > 1), off = plays.filter(p => !said.some(x => Math.abs(p.bar - x.at) < 0.1));
      check(!twice.length && !off.length, 'the phrase starts once on each bar the song says it, never late again', list);
      const later = next ? plays.filter(p => Math.abs(p.bar - next.at) < 0.1) : [];
      check(next && later.length === 1 && later[0].f.startsWith(`${BANK}/`), `the next time (bar ${next ? next.at + 1 : '-'}) it plays from the speaker's bank`, later.map(p => p.f).join(', ') || 'not heard');
      check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
      await page.click('#stop').catch(() => {});
      await page.context().close();
    }
  }
  await browser.close();
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})();
