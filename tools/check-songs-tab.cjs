// Browser checks for the Songs tab (#34): search, filters, favourites, sorting, tag editing, previous and next.
// Usage: PLAYWRIGHT_CORE=... node tools/check-songs-tab.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(3000);
  // one song of the user's, tagged with one of the user's styles
  await page.evaluate(async () => {
    const synth = await (await fetch('/styles/synthwave.json')).json().catch(() => null);
    const song = await (await fetch('/songs/luci-rosse.json')).json();
    localStorage.clear();
    localStorage.setItem('coding-misk-library', JSON.stringify({ tracks: [{ ...song, id: 'u-test', title: 'Prova utente', tags: { styles: ['night-drive'] } }], code: {} }));
    if (synth) localStorage.setItem('coding-misk-styles', JSON.stringify([{ ...synth, id: 'night-drive', name: { en: 'Night drive', it: 'Notte in auto' } }]));
  });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(500);

  const visible = () => page.$$eval('#songs [data-song-id]', xs => xs.filter(x => !x.hidden).map(x => x.dataset.songId));
  const total = (await page.$$('#songs [data-song-id]')).length;
  check(total >= 25, `one list with every song (${total})`);
  check((await page.$$('#songs .songs-sub')).length === 0, 'no separate block for code songs');
  check((await visible()).length === total, 'every song visible at first');
  const noGenre = await page.$$eval('#songs [data-song-id]', xs => xs.filter(x => !x.querySelector('.tag-chip.genre') && !/^endless-/.test(x.dataset.songId)).map(x => x.dataset.songId));
  check(!noGenre.length, 'every card shows at least one genre', noGenre.join(', '));
  if (shots) await page.screenshot({ path: path.join(shots, 'songs-all.png') });
  const kl = await page.$$eval('#songs [data-song-id="kellerlicht"] .tag-chip', xs => xs.map(x => x.textContent));
  check(kl.join('|') === 'Techno|Trance|Synthwave|Berlin techno', 'a style with the same name as its genre is not repeated', kl.join('|'));
  check(await page.isVisible('.sv-legend'), 'legend of the tag colours shown');
  await page.click('#songs [data-song-id="kellerlicht"] [data-tag-f="styles"][data-v="berlin-techno"]'); await sleep(300);
  let tv = await visible();
  check(tv.includes('kellerlicht') && !tv.includes('drift') && (await page.getAttribute('[data-f="styles"][data-v="berlin-techno"]', 'aria-pressed')) === 'true', 'a style tag on a card filters by that style', tv.join(', '));
  await page.click('#sv-clear'); await sleep(200);
  await page.click('#songs [data-song-id="neon-rush-reel"] [data-tag-f="q"]'); await sleep(300);
  check((await page.inputValue('#sv-q')) === 'reel' && (await visible()).includes('neon-rush-reel'), 'a free tag on a card goes in the search');
  await page.click('#sv-clear'); await sleep(200);

  // search
  await page.fill('#sv-q', 'FRÌGIO'); await sleep(400);
  let v = await visible();
  const texts = await page.$$eval('#songs [data-song-id]', xs => xs.filter(x => !x.hidden).map(x => x.innerText));
  check(v.length > 0 && v.length < total && texts.every(x => /frigio|phrygian/i.test(x)), `search ignores case and accents (${v.length})`);
  check(/\d+ (di|of) \d+/.test(await page.innerText('#sv-n')), 'match count shown');
  await page.fill('#sv-q', ''); await sleep(400);

  // genre chips
  await page.click('[data-f="genres"][data-v="metal"]'); await sleep(200);
  v = await visible();
  check(v.includes('ferro') && v.includes('ali-di-cenere') && !v.includes('drift'), 'genre filter metal', v.join(', '));
  await page.click('[data-f="genres"][data-v="hip-hop"]'); await sleep(200);
  v = await visible();
  check(v.includes('drift') && v.includes('pioggia-sul-vetro') && v.includes('ferro'), 'chips of one group combine with OR (phonk and lo-fi are hip hop)', v.join(', '));
  await page.click('#sv-clear'); await sleep(200);

  // kind chips
  await page.click('[data-f="kinds"][data-v="code"]'); await sleep(200);
  v = await visible();
  check(v.length === 2 && v.includes('ghost-protocol') && v.includes('neon-ascent'), 'kind filter code', v.join(', '));
  await page.click('[data-f="kinds"][data-v="code"]');
  await page.click('[data-f="genres"][data-v="trance"]'); await page.click('[data-f="kinds"][data-v="live"]'); await sleep(200);
  v = await visible();
  const kinds = await page.$$eval('#songs [data-song-id]', xs => xs.filter(x => !x.hidden).map(x => x.querySelector('.badge').className));
  check(v.includes('primo-segnale') && kinds.every(k => /kind-live/.test(k)), 'groups combine with AND (trance and live build)', v.join(', '));
  await page.click('#sv-clear'); await sleep(200);
  await page.click('[data-f="kinds"][data-v="mine"]'); await sleep(200);
  check((await visible()).join() === 'u-test', 'kind filter mine', (await visible()).join());
  await page.click('#sv-clear'); await sleep(200);

  // nothing matches, then clear
  await page.fill('#sv-q', 'zzzz nothing'); await sleep(400);
  check((await visible()).length === 0 && await page.isVisible('.sv-none'), 'nothing matches: message shown');
  await page.click('.sv-none [data-sv-clear]'); await sleep(300);
  check((await visible()).length === total && (await page.inputValue('#sv-q')) === '', 'clear filters brings every song back');

  // style tags use the current style names; style filter
  const userCard = await page.innerText('#songs [data-song-id="u-test"] .song-tags');
  check(/Notte in auto|Night drive/.test(userCard), 'a user style shows its name on the card', userCard);
  await page.$eval('.sv-styles', d => { d.open = true; }); await sleep(100);
  await page.click('[data-f="styles"][data-v="night-drive"]'); await sleep(200);
  check((await visible()).join() === 'u-test', 'style filter with a user style', (await visible()).join());
  await page.click('#sv-clear'); await sleep(200);

  // sorting by BPM
  await page.selectOption('#sv-sort', 'bpm'); await sleep(300);
  const bpms = await page.$$eval('#songs [data-song-id]', xs => xs.filter(x => !x.hidden).map(x => parseFloat(x.querySelector('.song-meta').textContent)));
  check(bpms.every((b, i) => !i || b >= bpms[i - 1]), 'sort by BPM', bpms.slice(0, 8).join(' '));
  await page.selectOption('#sv-sort', 'default'); await sleep(200);

  // favourites survive a reload
  await page.click('#songs [data-song-id="kellerlicht"] [data-star]'); await sleep(100);
  await page.click('[data-f="genres"][data-v="metal"]'); await sleep(100);
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(500);
  check((await page.getAttribute('#songs [data-song-id="kellerlicht"] [data-star]', 'aria-pressed')) === 'true', 'favourite kept after reload');
  v = await visible();
  check(v.includes('ferro') && !v.includes('kellerlicht'), 'view (genre filter) restored after reload', v.join(', '));
  await page.click('#sv-clear'); await sleep(200);
  await page.click('#sv-fav'); await sleep(200);
  check((await visible()).join() === 'kellerlicht', 'favourites only', (await visible()).join());
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(200); await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(300);
  check((await visible()).join() === 'kellerlicht', 'view kept when switching tabs');
  await page.click('#sv-fav'); await sleep(200);

  // tags of the user's song; built-in songs have no tag editor
  check(!(await page.$('#songs [data-song-id="kellerlicht"] [data-act="tags"]')), 'built-in songs have read-only tags');
  await page.click('#songs [data-song-id="u-test"] [data-act="tags"]'); await sleep(200);
  await page.click('#songs [data-song-id="u-test"] [data-tg="genres"][data-v="pop"]');
  await page.fill('#songs [data-song-id="u-test"] [data-tg-free]', 'Reel, notte');
  if (shots) await (await page.$('#songs [data-song-id="u-test"]')).screenshot({ path: path.join(shots, 'songs-tags.png') });
  await page.click('#songs [data-song-id="u-test"] [data-tags-done]'); await sleep(400);
  await page.fill('#sv-q', 'reel'); await sleep(400);
  v = await visible();
  check(v.includes('u-test'), 'a free tag added by the user is found', v.join(', '));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-library')).tracks[0].tags);
  check(stored && stored.genres.includes('pop') && stored.free.join() === 'reel,notte', 'tags saved with the song', JSON.stringify(stored));
  await page.fill('#sv-q', ''); await sleep(300);

  // previous and next follow the visible list
  await page.click('[data-f="genres"][data-v="metal"]'); await page.selectOption('#sv-sort', 'title'); await sleep(300);
  v = await visible();
  await page.click(`#songs [data-song-id="${v[0]}"] [data-act="open"]`); await sleep(600);
  await page.click('#pb-next'); await sleep(600);
  const title2 = await page.innerText('#pb-title');
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(300);
  const want = await page.innerText(`#songs [data-song-id="${v[1]}"] h3`);
  check(title2 === want, 'next follows the filtered and sorted list', `${title2} / ${want}`);
  await page.click('#sv-clear'); await page.selectOption('#sv-sort', 'default'); await sleep(200);

  // renaming a user style (name and id) renames its tag on the songs
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="stili"]'); await sleep(300);
  await page.click('#tab-stili [data-open="night-drive"]'); await page.click('#st-edit'); await sleep(200);
  for (const [f, val] of [['id', 'late-drive'], ['name.en', 'Late drive'], ['name.it', 'Tarda notte']]) { await page.fill(`#tab-stili [data-text="${f}"]`, val); await page.press(`#tab-stili [data-text="${f}"]`, 'Tab'); await sleep(150); }
  await page.click('#st-save'); await sleep(300);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(400);
  const renamed = await page.innerText('#songs [data-song-id="u-test"] .song-tags');
  const tagsNow = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-library')).tracks[0].tags.styles);
  check(/Late drive|Tarda notte/.test(renamed) && tagsNow.join() === 'late-drive', 'a renamed style renames its tag', `${renamed.replace(/\n/g, ' ')} · ${tagsNow}`);

  // phone width: no horizontal scroll
  await page.setViewportSize({ width: 390, height: 900 }); await sleep(400);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 392, 'no horizontal scroll at phone width', `${sw}px`);
  if (shots) await page.screenshot({ path: path.join(shots, 'songs-phone.png') });

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
