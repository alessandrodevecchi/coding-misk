// Browser checks for the radio compilation (#49): the button and its lamps, the setup (preset, genres, ranges, saved
// presets), songs drawn within the setup, the now playing tag, Keep for a random artist, Replay gives the same songs.
// Usage: PLAYWRIGHT_CORE=... node tools/check-compilation.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1200 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(3500);
  const opts = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio') || '{}'));
  await page.click('[data-tab="radio"]'); await sleep(300);
  const lamps = () => page.evaluate(() => [...document.querySelectorAll('.comp-lamps i')].map(i => i.classList.contains('on') ? 1 : 0).join(''));
  check(await lamps() === '00', 'compilation off: both lamps off');
  await page.click('#radio-comp'); await sleep(150);
  check((await opts()).compilation === 'song' && await lamps() === '10', 'first press: every song, first lamp');
  await page.click('#radio-comp'); await sleep(150);
  check((await opts()).compilation === 'some' && await lamps() === '01', 'second press: every 2 to 4 songs, second lamp');
  check(await page.isVisible('.set-aside'), 'artist and styles are set aside');

  await page.click('#radio-comp-setup'); await sleep(200);
  check(await page.isVisible('.comp-setup'), 'the setup opens');
  await page.selectOption('#comp-preset', 'club'); await sleep(200);
  let o = await opts();
  check(o.compPreset === 'club' && o.compSetup.genres.includes('techno') && !o.compSetup.genres.includes('jazz'), 'the Club preset limits the genres');
  // only techno and industrial
  await page.click('[data-comp-all="genres"]'); await sleep(100);
  for (const g of await page.evaluate(() => [...document.querySelectorAll('[data-comp-genre]')].map(b => b.dataset.compGenre))) if (!['techno', 'industrial'].includes(g)) { await page.click(`[data-comp-genre="${g}"]`); await sleep(40); }
  o = await opts();
  check(JSON.stringify(o.compSetup.genres.sort()) === '["industrial","techno"]' && o.compPreset === 'custom', 'genres picked by hand', JSON.stringify(o.compSetup.genres));
  await page.fill('#comp-name', 'Notte industriale'); await page.click('#comp-save'); await sleep(200);
  check(await page.evaluate(() => !!(JSON.parse(localStorage.getItem('coding-misk-comp-presets') || '{}'))['Notte industriale']) && (await opts()).compPreset === 'Notte industriale', 'a setup is saved as a preset');
  if (shots) await page.screenshot({ path: path.join(shots, 'setup.png') });

  await page.click('#radio-comp'); await sleep(100); await page.click('#radio-comp'); await sleep(100); // off, then every song
  await page.click('#radio-start'); await sleep(2500);
  const genreOf = await page.evaluate(() => Object.fromEntries((globalThis.codingMiskRadio.options, [])));
  const songs = [];
  for (let i = 0; i < 4; i++) {
    const st = await page.evaluate(() => { const r = globalThis.codingMiskRadio, s = r.state, it = s.stream[s.onAir]; return { title: it.title, n: s.onAir }; });
    songs.push(st.title);
    if (i === 0) {
      check(/Compilation/.test(await page.innerText('#radio-now')), 'now playing shows the compilation tag');
    }
    await page.evaluate(() => globalThis.codingMiskRadio.skip()); await sleep(1500);
  }
  const genres = await page.evaluate(() => { const r = globalThis.codingMiskRadio; return r.state.stream.slice(0, 4).map(x => x.id); });
  const recipe = await page.evaluate(() => globalThis.codingMiskRadio.state.recipe);
  check(!!recipe.options.compilation && recipe.options.compilation.every === 'song', 'the session recipe carries the compilation');
  const entries = await page.evaluate(() => globalThis.codingMiskRadio.history.slice(0, 4).map(h => (h.entry && h.entry.styles) || []));
  // replay: the same songs again
  await page.click('#radio-replay'); await sleep(2500);
  const first = await page.evaluate(() => globalThis.codingMiskRadio.state.stream[0].title);
  check(first === songs[0], 'Replay plays the same compilation', `${first} / ${songs[0]}`);
  await page.click('#radio-start'); await sleep(400);

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
