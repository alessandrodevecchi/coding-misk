// Browser checks for recording the radio (#30): record, pause without gaps, skip into the track list,
// stop and download audio, track list and recipe; record a session again from its start.
// Usage: PLAYWRIGHT_CORE=... node tools/check-recording.cjs   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('download', d => downloads.push(d));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-export-format', JSON.stringify('opus')); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['synthwave'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.click('#radio-start'); await sleep(2000);
  const rec = () => page.evaluate(() => globalThis.codingMiskRadio.recording);

  await page.click('#radio-rec'); await sleep(200);
  check((await page.getAttribute('#radio-rec', 'aria-pressed')) === 'true' && !!(await rec()), 'record starts');
  await sleep(2500);
  await page.click('#radio-pause'); await sleep(1500);
  const r1 = await rec();
  await page.click('#radio-pause'); await sleep(1500);
  const r2 = await rec();
  check(r2.seconds - r1.seconds < 1.8 && r1.seconds > 2 && r1.seconds < 3.4, 'pauses leave no gap in the recording', `${r1.seconds.toFixed(1)} s, then ${r2.seconds.toFixed(1)} s`);
  await page.click('#radio-skip'); await sleep(1500);
  const r3 = await rec();
  check(r3.list.length === 2 && r3.list[1].t > 3, 'a new song goes into the track list', JSON.stringify(r3.list));

  await page.click('#radio-rec'); await sleep(4000);
  const names = downloads.map(d => d.suggestedFilename());
  check(names.some(n => /\.(webm|ogg)$/.test(n)) && names.some(n => /tracklist\.txt$/.test(n)) && names.some(n => /recipe\.json$/.test(n)), 'stop downloads audio, track list and recipe', names.join(', '));
  const tl = downloads.find(d => /tracklist\.txt$/.test(d.suggestedFilename()));
  if (tl) { const f = path.join(os.tmpdir(), `tl-${Date.now()}.txt`); await tl.saveAs(f); const txt = fs.readFileSync(f, 'utf8'); check(/^00:00 /m.test(txt) && txt.trim().split('\n').length === 4, 'track list with times', txt.trim().split('\n').slice(2).join(' | ')); }
  const audio = downloads.find(d => /\.(webm|ogg)$/.test(d.suggestedFilename()));
  if (audio) { const f = path.join(os.tmpdir(), `rec-${Date.now()}.webm`); await audio.saveAs(f); check(fs.statSync(f).size > 20000, 'audio file has sound', `${fs.statSync(f).size} bytes`); }

  // record the session again from its start
  const first = await page.evaluate(() => globalThis.codingMiskRadio.history[globalThis.codingMiskRadio.history.length - 1].title);
  await page.click('#radio-rec-start'); await sleep(2500);
  const st = await page.evaluate(() => { const s = globalThis.codingMiskRadio.state; return { onAir: s.onAir, title: s.stream[0].title }; });
  check(st.onAir === 0 && st.title === first && !!(await rec()), 'record from the start replays song 1 and records', `${st.title} / ${first}`);
  downloads.length = 0;
  await page.click('#radio-start'); await sleep(3500);
  check(!(await rec()) && downloads.length >= 2, 'stopping the radio ends the recording and saves it', downloads.map(d => d.suggestedFilename()).join(', '));

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
