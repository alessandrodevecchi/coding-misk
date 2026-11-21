// Browser checks for the learned beat tracker (decode-beat-tracker, decode round 12: an option of Settings, off by
// default). The "Deep beat analysis" card: off by default with its disclaimer, no request to the model host and no
// ONNX Runtime file before the user turns it on and presses Download (also through a Full analysis); on, a changed file
// refused with nothing kept, the download with its progress, the status; Full on a 4-minute file with the tracker (the
// grid's engine named, its time, the runtime served by the app, no request to another host during Full, no long task on
// the page); off again keeps the files unused; Remove with its confirmation. The model host is answered from the
// git-ignored .cache/beat-this/ (the pinned files), so the check needs no network.
// --flag: the dev server runs with the local build flag (vite.local.config.mjs defining
// import.meta.env.VITE_DECODE_BEAT_TRACKER as 'on'): on a clean browser the option starts on and, without the files,
// the card says they are missing and offers the download; nothing is requested before the click.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-beat-tracker.cjs [shots-dir] [--no-full] [--flag]   (dev server on PORT)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const args = process.argv.slice(2), shots = args.find(a => !a.startsWith('--')), PORT = process.env.PORT || 5173, URL = `http://localhost:${PORT}/`;
const ROOT = path.join(__dirname, '..'), DIR = process.env.BEAT_THIS_DIR || path.join(ROOT, '.cache', 'beat-this');
const LONG = path.join(ROOT, '.cache', 'decode', 'wav', 'decode-test-long.wav');
const ORT = /onnxruntime|ort-wasm|ort\.wasm/;
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const { BEAT_THIS_FILES } = await import(path.join(ROOT, 'src/decode/beat-this.js'));
  const files = Object.values(BEAT_THIS_FILES);
  const flag = args.includes('--flag');
  if (!flag && !files.every(f => fs.existsSync(path.join(DIR, f.name)))) { console.log(`skip: the model files are not in ${DIR}`); process.exit(0); }
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 } });
  const page = await ctx.newPage();
  const errors = [], foreign = [], runtime = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('crash', () => errors.push('page crashed'));
  page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
  // the model host, answered from the dev server's /@fs/ route (same origin): the page's fetch sends the pinned URLs
  // there, with the same integrity option (Playwright cannot fulfil an 83 MB body itself, the browser drops the
  // connection); `corrupt` sends the front end to a copy with one byte changed
  const local = {};
  for (const f of files) local[f.url] = `/@fs${path.join(DIR, f.name)}`;
  let bad = '';
  if (!flag) {
    fs.mkdirSync(path.join(DIR, 'tmp'), { recursive: true });
    bad = path.join(DIR, 'tmp', 'corrupt-logmel.onnx'); const lm = fs.readFileSync(path.join(DIR, 'logmel.onnx')); lm[1000] ^= 0xff; fs.writeFileSync(bad, lm);
  }
  await ctx.addInitScript(([map, badUrl]) => {
    const f = globalThis.fetch.bind(globalThis);
    globalThis.__hub = [];
    globalThis.fetch = (u, o) => { const k = typeof u === 'string' ? u : u && u.url; if (k && k.startsWith('https://huggingface.co/')) { globalThis.__hub.push(k); const to = globalThis.__corrupt && /logmel/.test(k) ? badUrl : map[k]; return f(to || k, o); } return f(u, o); };
  }, [local, `/@fs${bad}`]);
  const setCorrupt = v => page.evaluate(x => { globalThis.__corrupt = x; }, v);
  const hubCount = () => page.evaluate(() => (globalThis.__hub || []).length);
  page.on('request', r => { const u = r.url(); if (ORT.test(u)) runtime.push(u); if (!u.startsWith(URL) && !u.startsWith('data:') && !u.startsWith('blob:')) foreign.push(u); });
  const clean = () => page.evaluate(async () => {
    localStorage.clear(); await caches.delete('coding-misk-models-v1');
    const r = indexedDB.deleteDatabase('coding-misk-decodes'); await new Promise(x => { r.onsuccess = r.onerror = r.onblocked = x; });
  });
  await page.goto(URL); await sleep(2500);
  await clean();
  await page.reload(); await sleep(3000);
  const card = () => page.evaluate(() => { const c = document.querySelector('#set-beat-tracker'); return c ? { text: c.innerText, buttons: [...c.querySelectorAll('button')].map(b => b.id || `use:${b.dataset.btUse}:${b.getAttribute('aria-pressed')}`) } : null; });
  const openSettings = async () => { if (!(await page.evaluate(() => { const t = document.querySelector('#tab-impostazioni'); return t && !t.hidden; }))) await page.click('#open-settings'); await sleep(600); };
  const stored = () => page.evaluate(async () => { const k = await (await caches.open('coding-misk-models-v1')).keys(); return { n: k.length, flag: localStorage.getItem('coding-misk-beat-this'), opt: localStorage.getItem('coding-misk-beat-this-opt') }; });
  const disclaimer = c => c && /Beat This!/.test(c.text) && /MIT/.test(c.text) && /copyright/i.test(c.text) && /huggingface\.co/.test(c.text) && /88 MB/.test(c.text) && /this device only|solo su questo dispositivo/.test(c.text);

  if (flag) {
    await openSettings();
    const c = await card();
    check(disclaimer(c) && c.buttons.includes('use:on:true') && /not on this device|non è su questo dispositivo/.test(c.text) && c.buttons.includes('bt-download'), 'local flag: the option starts on; without the files the card says so and offers the download', c && c.buttons.join(','));
    check((await hubCount()) === 0 && runtime.length === 0, 'local flag: no request to the model host and no runtime file before a click', `${await hubCount()} hub, ${runtime.length} runtime`);
    if (shots) await page.locator('#set-beat-tracker').screenshot({ path: path.join(shots, 'bt-card-flag.png') });
    check(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | '));
    await browser.close();
    console.log(failed ? `${failed} failed` : 'all passed');
    process.exit(failed ? 1 : 0);
  }

  const runFull = async () => {
    await page.evaluate(async () => { const r = indexedDB.deleteDatabase('coding-misk-decodes'); await new Promise(x => { r.onsuccess = r.onerror = r.onblocked = x; }); });
    await page.reload(); await sleep(3000);
    await page.click('[data-tab="decode"]').catch(async () => { await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="decode"]'); }); await sleep(400);
    await page.setInputFiles('#dc-file', LONG);
    for (let i = 0; i < 80; i++) { await sleep(250); const st = await page.evaluate(() => globalThis.codingMiskDecode.state()); if (st.title && !(st.status && st.status.kind === 'busy')) break; }
    await page.evaluate(() => { globalThis.__long = []; new PerformanceObserver(l => { for (const e of l.getEntries()) globalThis.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask' }); });
    const n0 = foreign.length, r0 = runtime.length, t0 = Date.now();
    await page.click('[data-dc-level="B"]');
    let st = null;
    for (let i = 0; i < 600; i++) { await sleep(500); st = await page.evaluate(() => globalThis.codingMiskDecode.state()); if (st.modelB) break; }
    return { st, ms: Date.now() - t0, foreign: foreign.slice(n0), runtime: runtime.slice(r0), long: await page.evaluate(() => globalThis.__long), engines: await page.innerText('#dc-engines').catch(() => '') };
  };
  const full = !args.includes('--no-full') && fs.existsSync(LONG);
  if (!full) console.log(`skip  Full: --no-full or no ${LONG}`);

  // 1. the card, off by default
  await openSettings();
  let c = await card(), s = await stored();
  check(disclaimer(c) && c.buttons.includes('use:off:true') && /nothing is downloaded or loaded|niente si scarica né si carica/.test(c.text) && !c.buttons.includes('bt-download'), 'the card, off by default: what it is, third party, MIT, the training data, size, host, this device only; no Download button while off', c && c.buttons.join(','));
  check((await hubCount()) === 0 && runtime.length === 0 && s.n === 0 && !s.opt, 'off: no request to the model host, no runtime file, nothing stored', `${await hubCount()} hub, ${runtime.length} runtime, ${s.n} files`);
  if (shots) await page.locator('#set-beat-tracker').screenshot({ path: path.join(shots, 'bt-card-off.png') });
  // 2. Full with the option off: as without the tracker, nothing of it requested
  if (full) {
    const off = await runFull();
    check(off.st && off.st.modelB && !off.st.modelB.engines.grid && !off.st.modelB.beatTracker && Math.abs(off.st.modelB.bpm - 128) < 0.05 && off.runtime.length === 0 && (await hubCount()) === 0, 'Full with the option off: misk-analyzer\'s grid, 128 BPM, no runtime file and no model request', `${off.st && off.st.modelB && off.st.modelB.bpm} BPM, Full ${off.ms} ms, ${off.runtime.length} runtime`);
    await openSettings();
  }

  // 3. on: the files are missing, Download offered; still nothing requested
  await page.click('[data-bt-use="on"]'); await sleep(500);
  c = await card(); s = await stored();
  check(c.buttons.includes('use:on:true') && /not on this device|non è su questo dispositivo/.test(c.text) && c.buttons.includes('bt-download') && s.opt === '"on"' && (await hubCount()) === 0, 'on: the files are missing, a Download button, still no request', c.buttons.join(','));
  // 4. a changed file is refused, nothing kept
  await setCorrupt(true);
  await page.click('#bt-download');
  for (let i = 0; i < 120 && !/failed|non riuscito/i.test((await card()).text); i++) await sleep(250);
  c = await card(); s = await stored();
  check(/failed|non riuscito/i.test(c.text) && s.n === 0 && !s.flag && c.buttons.includes('bt-download'), 'a file that does not match its pin: the download fails, nothing kept', c.text.split('\n').slice(-2).join(' | '));
  // 5. the download
  await setCorrupt(false);
  let sawProgress = false;
  await page.click('#bt-download');
  for (let i = 0; i < 240; i++) { const x = await card(); if (/Downloading|Download \d/.test(x.text) && /\d+ %/.test(x.text)) sawProgress = true; if (x.buttons.includes('bt-remove')) break; await sleep(100); }
  c = await card(); s = await stored();
  check(sawProgress && c.buttons.includes('bt-remove') && /Downloaded: 88 MB|Scaricata: 88 MB/.test(c.text) && s.n === 2 && /installed/.test(s.flag || ''), 'the download: progress, then downloaded with its size, two files kept and the flag', `${s.n} files`);
  if (shots) await page.locator('#set-beat-tracker').screenshot({ path: path.join(shots, 'bt-card-installed.png') });

  // 6. Full with the tracker on a 4-minute file
  if (full) {
    const on = await runFull();
    const bt = on.st && on.st.modelB && on.st.modelB.beatTracker;
    check(on.st && on.st.modelB && on.st.modelB.engines.grid === 'beat-this' && bt && Math.abs(on.st.modelB.bpm - 128) < 0.05 && /Beat This!/.test(on.engines), 'Full on a 4-minute file with the tracker: the grid from Beat This!, 128 BPM, named under the controls', `${on.st && on.st.modelB && on.st.modelB.bpm} BPM, tracker ${bt && bt.ms} ms, Full ${on.ms} ms; ${on.engines}`);
    check(on.runtime.length > 0 && on.runtime.every(u => u.startsWith(URL)), 'the runtime served by the app itself', on.runtime.map(u => u.replace(URL, '/').split('?')[0]).slice(0, 3).join(' '));
    check(on.foreign.filter(u => !/^https:\/\/(raw\.githubusercontent|github)\.com\//.test(u)).length === 0, 'no request to another host during Full (the samples the app always loads aside)', on.foreign.slice(0, 3).join(' '));
    check(!on.long.some(x => x > 200), 'no task over 200 ms on the page during Full', on.long.slice(0, 8).join(','));
    if (shots) await page.screenshot({ path: path.join(shots, 'bt-full.png') });
    await openSettings();
  }
  // 7. off again: the files stay, unused; Remove (twice)
  await page.click('[data-bt-use="off"]'); await sleep(500);
  c = await card(); s = await stored();
  check(c.buttons.includes('use:off:true') && /stays on this device|resta su questo dispositivo/.test(c.text) && c.buttons.includes('bt-remove') && s.n === 2 && s.opt === '"off"', 'off again: the files stay, unused, Remove offered', c.text.split('\n').slice(-2).join(' | '));
  await page.click('#bt-remove'); await sleep(200);
  s = await stored();
  check(s.n === 2, 'Remove asks for a second click', s.n);
  await page.click('#bt-remove'); await sleep(800);
  s = await stored(); c = await card();
  check(s.n === 0 && !s.flag && !c.buttons.includes('bt-remove') && /nothing is downloaded or loaded|niente si scarica né si carica/.test(c.text), 'Remove: the files and the flag gone');
  check(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | '));
  await clean();
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
