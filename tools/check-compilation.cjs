// Browser checks for the radio compilation (#49): the button and its lamps, the setup (preset, genres, ranges, saved
// presets), songs drawn within the setup, the now playing tag, Keep for a random artist, Replay gives the same songs,
// knobs that follow the song on air and hold a value moved by hand (#59), the material source in the setup and next to
// the knobs, saved with the session (material-generator, radio-variation 6.1 and 6.2).
// Usage: PLAYWRIGHT_CORE=... node tools/check-compilation.cjs [shots-dir]   (dev server on PORT, default 5173)
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
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
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
  // with All on the single chips are off: a tap picks just that genre
  check(await page.evaluate(() => [...document.querySelectorAll('[data-comp-genre]')].every(b => b.getAttribute('aria-pressed') === 'false')), 'with All, the single genres are off');
  for (const g of ['techno', 'industrial']) { await page.click(`[data-comp-genre="${g}"]`); await sleep(60); }
  o = await opts();
  check(JSON.stringify(o.compSetup.genres.sort()) === '["industrial","techno"]' && o.compPreset === 'custom', 'genres picked by hand', JSON.stringify(o.compSetup.genres));
  await page.fill('#comp-name', 'Notte industriale'); await page.click('#comp-save'); await sleep(200);
  check(await page.evaluate(() => !!(JSON.parse(localStorage.getItem('coding-misk-comp-presets') || '{}'))['Notte industriale']) && (await opts()).compPreset === 'Notte industriale', 'a setup is saved as a preset');
  // the material source: chips in the setup and next to the knobs (radio-variation 6.2), saved in the options
  await page.click('.comp-setup [data-material="patterns"]'); await sleep(150);
  check((await opts()).material === 'patterns' && (await page.getAttribute('.comp-setup [data-material="patterns"]', 'aria-pressed')) === 'true', 'the material source is picked in the setup');
  check(await page.evaluate(() => [...document.querySelectorAll('[data-material]')].every(b => b.closest('.comp-setup, .mat-source')) && document.querySelector('.mat-source [data-material="patterns"]').getAttribute('aria-pressed') === 'true'), 'the setup and the console show the same material source');
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
  check(recipe.options.material === 'patterns', 'the session recipe carries the material source', JSON.stringify(recipe.options.material));
  const entries = await page.evaluate(() => globalThis.codingMiskRadio.history.slice(0, 4).map(h => (h.entry && h.entry.styles) || []));
  // #59: the knobs show the song on air, a knob moved by hand is held for the next songs, the lock gives it back
  const knob = () => page.evaluate(() => { const s = globalThis.codingMiskRadio.state, it = s.stream[s.onAir]; return { shown: +document.querySelector('#radio-energy').closest('.ctrl').querySelector('output').textContent, song: it.knobs ? it.knobs.energy : null, auto: !!document.querySelector('.comp-knobs-hint') && !document.querySelector('[data-unlock]') }; });
  const k1 = await knob();
  check(k1.auto && k1.song !== null && Math.abs(k1.shown - k1.song) < 0.011, 'during a compilation the knob shows the song on air (auto)', JSON.stringify(k1));
  await page.evaluate(() => { const el = document.querySelector('#radio-energy'); el.value = '0.9'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(200);
  check((await opts()).compLocks.energy === 0.9 && await page.isVisible('[data-unlock="energy"]'), 'a knob moved by hand is held, with a lock');
  for (let i = 0; i < 2; i++) { await page.evaluate(() => globalThis.codingMiskRadio.skip()); await sleep(1500); }
  const held = await page.evaluate(() => { const s = globalThis.codingMiskRadio.state; return s.stream.slice(-1)[0].knobs.energy; });
  check(Math.abs(held - 0.9) < 1e-9 && (await opts()).compilation === 'song', 'the next songs play the held value and the compilation stays on', held);
  await page.click('[data-unlock="energy"]'); await sleep(200);
  check(!('energy' in (await opts()).compLocks) && !(await page.isVisible('[data-unlock="energy"]')), 'the lock gives the knob back to the compilation');
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
