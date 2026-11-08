// Radio voice samples load ahead of their lines (#82): a radio session (Live coder, synthwave, Voice: track always with
// many phrases) with the CPU slowed 4 times. It plays the session's start, moves past 40 % of the first song so the next
// one is made, plays across the change into it and then skips to the song after. Each voice sample is followed from its
// first fetch to its decode and its first line heard (a buffer started with gain above 0). It fails when a sample of the
// next song is first fetched on that song's first bars (it was not loaded ahead), or when a sample is decoded less than a
// bar before its first line. A line in the first 4 bars of a start, a seek or a skip only has to start on its bar: those
// bars wait for their samples at most about 100 ms, so with the CPU slowed one may still arrive just in time. The
// scheduler's "took too long" and "skip query: too late" are counted, for information.
// --speaker (radio-phrase-speaker): the same run with one phrase of All in My phrases (Sempre), new on each run, whose
// default-voice sample the voice helper makes first. The radio must ask the helper for the speaker's sample of the
// phrase although the default voice has it, the next song's speaker sample must be fetched before that song's first bar,
// and the phrase must play there from the speaker's bank, not from say_en. In Italian (the speakers speak English only)
// no speaker bank is asked, and the helper answers fred in Italian from say_it. Without the voice helper: a skip note.
// --speaker then runs a narrator step (radio-narrator-speakers D3) in a page of its own, without my phrases (a phrase
// of All with Sempre takes every narrator line): a first pass, the helper answered 503, finds the first built-in
// narrator line of the next song (in its first 40 bars) said by a speaker X (radio.needs({ every: true })); its say_en_X
// sample, if there is one, is moved aside (and put back at the end). With the page loaded again and the CPU slowed, the
// radio must ask the helper for it although say_en has it, fetch it before the next song's first bar and play it there
// from say_en_X.
// Needs the voice samples in public/samples/say_*.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-voice-preload.cjs [--seed vp82a] [--rate 4] [--list] [--speaker]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SEED = arg('--seed', 'vp82a'), RATE = +arg('--rate', 4), BASE = `http://localhost:${process.env.PORT || 5173}`;
let SPEAKER = process.argv.includes('--speaker');
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
// (the app's saySlug)
const os = require('node:os');
const slugOf = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
// a phrase no speaker bank has yet, so its speaker samples are made during the run
function freshPhrase() {
  const dir = path.join(__dirname, '..', 'public', 'samples');
  const banks = fs.existsSync(dir) ? fs.readdirSync(dir).filter(b => /^say_en_[a-z]+$/.test(b)) : [];
  const A = ['copper', 'amber', 'cobalt', 'violet', 'silver', 'crimson', 'jade', 'ivory'], B = ['harbour', 'tower', 'bridge', 'station', 'market', 'river', 'tunnel', 'square'];
  const k0 = Math.floor(Math.random() * 64);
  for (let i = 0; i < 64; i++) {
    const k = (k0 + i) % 64, text = `the ${A[k % 8]} rain falls on the ${B[Math.floor(k / 8)]}`;
    if (!banks.some(b => fs.existsSync(path.join(dir, b, `${slugOf(text)}.wav`)))) return { text, fresh: true };
  }
  return { text: `the ${A[k0 % 8]} rain falls on the ${B[Math.floor(k0 / 8)]}`, fresh: false };
}

// --speaker, the narrator step: a page of its own, without my phrases
let aside = null;
const putBack = () => { if (!aside) return; try { fs.copyFileSync(aside.to, aside.file); fs.unlinkSync(aside.to); fs.rmdirSync(path.dirname(aside.to)); } catch (e) { console.log(`warning: put ${aside.to} back to ${aside.file} by hand`); } aside = null; };
process.on('exit', putBack);
async function narratorStep(ctx) {
  const RADIO = { styles: ['synthwave'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: 'switch', compilation: 'off', voice: { presence: 'always', phrases: 'many', kind: 'mixed' } };
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const st = () => page.evaluate(() => { const r = globalThis.codingMiskRadio.state; return r ? { onAir: r.onAir, bar: window.__bar(), stream: r.stream.map(x => ({ start: x.start, bars: x.bars, growing: x.growing })) } : null; });
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
  const startToNext = async () => {
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    await page.fill('#radio-seed', SEED); await page.click('#radio-start');
    await until(async () => { const x = await st(); return x && x.bar >= 2; }, 60000);
    const x = await st(), at = Math.ceil(x.stream[0].bars * 0.4) + 1;
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), at);
    return until(async () => { const y = await st(); return y.stream.length > 1 && !y.stream[1].growing; }, 180000);
  };
  await page.goto(`${BASE}/`); await sleep(2500);
  await page.evaluate(o => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify(o)); }, RADIO);
  await page.reload(); await sleep(3500);
  // the first pass: the helper answers 503, the next song's lines read as they are
  await page.route('**/voice/say', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"first pass"}' }));
  await startToNext();
  const NAR = await page.evaluate(() => globalThis.codingMiskRadio.needs({ every: true }).filter(x => x.next && x.voice === 'N' && x.speaker && x.at < 40).sort((a, b) => a.at - b.at)[0]);
  await page.click('#radio-start').catch(() => {});
  await page.unroute('**/voice/say');
  if (!NAR) { console.log('skip  narrator step: the next song has no narrator line of a speaker in its first 40 bars (try another --seed)'); await page.close(); return; }
  const rel = `${NAR.bank}/${slugOf(NAR.text)}.wav`, file = path.join(__dirname, '..', 'public', 'samples', rel);
  if (fs.existsSync(file)) { aside = { file, to: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cvp-')), path.basename(file)) }; fs.copyFileSync(file, aside.to); fs.unlinkSync(file); }
  console.log(`      narrator step: "${NAR.text}" by ${NAR.speaker} on bar ${NAR.at + 1} of the next song${aside ? ', its sample moved aside' : ', no sample yet'}`);
  // the run: the page loaded again (the manifest without the sample), the CPU slowed
  await page.reload(); await sleep(3500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  const made = await startToNext();
  check(made, 'narrator step: the next song is made');
  const got = await until(() => page.evaluate(x => !globalThis.codingMiskRadio.needs().some(y => y.text === x.text && y.bank === x.bank), NAR), 240000);
  const s1 = (await st()).stream[1];
  check(got, 'narrator step: the speaker sample is made while the song on air plays', `${rel}, bar ${((await st()).bar + 1).toFixed(2)}`);
  await until(async () => (await st()).bar >= s1.start + NAR.at + 2, 600000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const r = await page.evaluate(() => ({ ev: window.__ev, asked: window.__asked }));
  const asked = r.asked.filter(x => x.text === NAR.text && x.speaker === NAR.speaker);
  check(asked.length > 0, `narrator step: the radio asks the voice helper for the line's ${NAR.speaker} sample, say_en having it`, asked.map(x => `bar ${(x.bar + 1).toFixed(2)}`).join(', '));
  const fetched = r.ev.find(e => e.k === 'fetch' && e.f === rel);
  check(!!fetched && fetched.bar < s1.start, `narrator step: the sample is fetched before the next song's first bar (bar ${s1.start + 1})`, fetched ? `on bar ${(fetched.bar + 1).toFixed(2)}` : 'never');
  const plays = r.ev.filter(e => e.k === 'play' && e.bar >= s1.start), mine = plays.filter(e => e.f === rel), def = plays.filter(e => e.f === `say_en/${slugOf(NAR.text)}.wav`);
  check(mine.length > 0, `narrator step: the line plays from ${NAR.bank} in the next song`, `${mine.length} times${def.length ? `, ${def.length} from say_en` : ''}`);
  check(!errors.length, 'narrator step: no page errors', errors.slice(0, 2).join(' | '));
  await page.click('#radio-start').catch(() => {});
  await page.close();
}

(async () => {
  // --speaker: the voice helper, the phrase and its default-voice sample (as the Voices tab or Say now make it)
  let PH = null;
  if (SPEAKER) {
    const ok = await fetch(`${BASE}/voice/status`).then(r => r.json()).then(j => !!(j && j.ok), () => false);
    if (!ok) { console.log('skip  --speaker: no voice helper on this dev server (macOS say and ffmpeg)'); SPEAKER = false; }
    else {
      PH = freshPhrase();
      const r = await fetch(`${BASE}/voice/say`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: PH.text, lang: 'en', speaker: '' }) });
      check(r.ok, 'the default voice\'s sample of the phrase made first', `"${PH.text}"${PH.fresh ? '' : ', its speaker samples exist already'}`);
    }
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 } });
  // every voice sample: fetched, decoded, started (bar in the window's bars and page time); silent warm-ups left out
  await ctx.addInitScript(() => {
    window.__ev = []; window.__warm = []; window.__reach = {}; window.__set = {}; window.__asked = [];
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
      // (the samples the page asks the voice helper for: --speaker)
      if (url.includes('/voice/say') && a[0] && typeof a[0].body === 'string') { try { window.__asked.push({ ...JSON.parse(a[0].body), bar: bar() }); } catch (e) { /* not JSON */ } }
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
  await page.goto(`${BASE}/`); await sleep(2500);
  await page.evaluate(ph => {
    localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['synthwave'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: 'switch', compilation: 'off', voice: { presence: 'always', phrases: 'many', kind: 'mixed' } }));
    // (--speaker: the phrase of All, said on every vocabulary line, Sempre)
    if (ph) {
      localStorage.setItem('coding-misk-phrases', JSON.stringify({ format: 1, items: [{ id: 'ph_rps82', text: ph.text, lang: 'en', alt: {}, kinds: ['voice', 'explain', 'poetic'], tag: null, styles: [], on: true, source: 'tab', from: {}, created: new Date().toISOString(), uses: 0, last: null }] }));
      localStorage.setItem('coding-misk-phrase-settings', JSON.stringify({ save: 'always', temp: '24h', share: 'always' }));
    }
  }, SPEAKER ? PH : null);
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
  if (SPEAKER) {
    // (the helper makes the phrase's speaker samples, the next song first; each one is queued for it when it arrives)
    const done = await until(() => page.evaluate(t => !globalThis.codingMiskRadio.needs().some(x => x.text === t), PH.text), 240000);
    check(done, 'the speaker samples of the phrase are made while the song on air plays', `bar ${((await state()).bar + 1).toFixed(2)}`);
    await until(() => page.evaluate(() => !globalThis.codingMiskVoiceQueue || globalThis.codingMiskVoiceQueue.pending === 0), 60000);
  }
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
  const r = await page.evaluate(() => ({ ev: window.__ev, reach: window.__reach, set: window.__set, asked: window.__asked }));
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
  if (SPEAKER) {
    const slug = slugOf(PH.text), asked = r.asked.filter(x => x.text === PH.text);
    check(!PH.fresh || asked.some(x => x.speaker), 'the radio asks the voice helper for the phrase\'s speaker sample, the default voice\'s existing', asked.map(x => `${x.speaker || 'default'} on bar ${(x.bar + 1).toFixed(2)}`).join(', '));
    const inNext = plays.filter(p => songOf(p.bar) === s1 && p.f.endsWith(`/${slug}.wav`)), banks = [...new Set(inNext.map(p => p.f.split('/')[0]))];
    check(inNext.length > 0, 'the phrase heard in the next song', `${inNext.length} times`);
    check(inNext.length > 0 && !banks.includes('say_en'), 'the phrase plays from its speaker\'s bank in the next song, not from say_en', banks.join(', '));
    const fetched = [...new Set(inNext.map(p => p.f))].map(f => ({ f, e: firstOf('fetch', f, Infinity) }));
    check(fetched.length > 0 && fetched.every(x => x.e && x.e.bar < s1.start), `the speaker sample is fetched before the next song's first bar (bar ${s1.start + 1})`, fetched.map(x => `${x.f} ${x.e ? `on bar ${(x.e.bar + 1).toFixed(2)}` : 'never'}`).join('; '));
  }
  if (SPEAKER) {
    // (real-voices D2: the speakers speak English only; in Italian the radio asks for no speaker bank, and the helper
    // answers a request for fred in Italian with the default voice's sample)
    const it = await page.evaluate(async () => { const m = await import('/src/i18n.js'); m.setLang('it'); const n = globalThis.codingMiskRadio.needs(); m.setLang('en'); return n.map(x => x.bank); });
    check(it.every(b => b === 'say_it'), 'in Italian the radio asks for no speaker bank', [...new Set(it)].join(', ') || 'nothing to ask');
    const dir = path.join(__dirname, '..', 'public', 'samples', 'say_it_fred'), had = fs.existsSync(dir);
    const j = await fetch(`${BASE}/voice/say`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'la pioggia cade sul ponte', lang: 'it', speaker: 'fred' }) }).then(x => x.json()).catch(() => ({}));
    check(j.bank === 'say_it' && (had || !fs.existsSync(dir)), 'the voice helper answers fred in Italian from say_it and writes no say_it_fred', JSON.stringify(j));
  }
  console.log(`      scheduler: ${logs.long} "took too long", ${logs.late} "skip query: too late" (CPU slowed ${RATE}x)`);
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  await page.click('#radio-start').catch(() => {});
  if (SPEAKER) await narratorStep(ctx);
  await browser.close();
  putBack();
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})();
