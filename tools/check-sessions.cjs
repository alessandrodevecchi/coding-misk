// Browser checks for radio sessions in playlists (#38): add the session on air, the warning for an older director,
// play a session in a playlist and move on, freeze, export with the session.
// Usage: PLAYWRIGHT_CORE=... node tools/check-sessions.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1200 }, acceptDownloads: true })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['synthwave'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); });
  await page.reload(); await sleep(3500);
  const lists = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-playlists') || '{}'));
  const R = () => page.evaluate(() => { const r = globalThis.codingMiskRadio, s = r.state; return { on: r.on, onAir: s && s.onAir, titles: s && s.stream.map(x => x.title) }; });

  // add the session on air to a new playlist
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'sessions-check'); await page.click('#radio-start'); await sleep(2000);
  await page.click('#radio-pl'); await sleep(200);
  await page.selectOption('.radio-pl-menu select', ''); await page.click('.radio-pl-menu [data-pl-ok]'); await sleep(300);
  let d = await lists();
  const added = d.lists.find(l => l.songs.some(id => id.startsWith('session:')));
  const sid = added && added.songs.find(id => id.startsWith('session:'));
  check(sid && d.sessions[sid] && d.sessions[sid].count === 1 && d.sessions[sid].version >= 1 && d.sessions[sid].recipe.seed === 'sessions-check', 'the session on air goes into a new playlist', JSON.stringify(sid && d.sessions[sid] && { count: d.sessions[sid].count }));
  const recipe = d.sessions[sid].recipe;
  await page.click('#radio-start'); await sleep(300);

  // a playlist: a session of 2 songs, then a song; an older session warns
  await page.evaluate(([recipe]) => {
    const d = JSON.parse(localStorage.getItem('coding-misk-playlists'));
    d.lists.push({ id: 'p-check', name: 'Check', songs: ['session:two', 'primo-segnale', 'session:old'] });
    d.sessions['session:two'] = { recipe, count: 2, title: 'Two · 2 songs', date: '2026-10-10', version: 999 };
    d.sessions['session:old'] = { recipe, count: 1, title: 'Old · 1 song', date: '2026-10-10', version: 0 };
    localStorage.setItem('coding-misk-playlists', JSON.stringify(d));
  }, [recipe]);
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="playlist"]'); await sleep(300);
  await page.click('[data-pl-open="p-check"]'); await sleep(300);
  const rows = await page.$$eval('#tab-playlist .pl-row', xs => xs.map(x => x.innerText.replace(/\s+/g, ' ')));
  check(/📻/.test(rows[0]) && /2 songs/.test(rows[0]) && /may sound different/.test(rows[2]) && !/may sound different/.test(rows[0]), 'session items in the list, the older one warns', rows.join(' | '));
  if (shots) await page.screenshot({ path: path.join(shots, 'playlist.png') });

  // play: the session's two songs, then the song after it
  await page.click('#pl-play'); await sleep(2500);
  let r = await R();
  check(r.on && r.onAir === 0, 'the session plays in the radio engine', JSON.stringify(r));
  for (const want of [1, 2]) {
    const bars = await page.evaluate(() => { const s = globalThis.codingMiskRadio.state; return s ? s.stream[s.onAir].bars : 0; });
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b - 1.2), bars); 
    for (let k = 0; k < 60; k++) { await sleep(250); r = await R(); if ((want === 1 && r.onAir === 1) || (want === 2 && !r.on)) break; }
  }
  const bar = await page.innerText('.pbar');
  check(!r.on && /Primo Segnale/.test(bar), 'after its last song the playlist moves to the next song', bar.slice(0, 80).replace(/\s+/g, ' '));
  await page.click('[data-tab="playlist"]').catch(() => {}); await sleep(300);

  // freeze
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="playlist"]'); await sleep(300);
  await page.click('[data-pl-open="p-check"]'); await sleep(200);
  await page.click('[data-pl-freeze="session:old"]'); await sleep(1500);
  d = await lists();
  check(Array.isArray(d.sessions['session:old'].frozen) && d.sessions['session:old'].frozen.length === 1 && !/may sound different/.test((await page.$$eval('#tab-playlist .pl-row', xs => xs.map(x => x.innerText)))[2]), 'freeze stores the songs and the warning goes');

  // Mix on: a session's songs join the stream like saved songs
  await page.evaluate(() => localStorage.setItem('coding-misk-playlist-mix', 'true'));
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="playlist"]'); await sleep(300);
  await page.click('[data-pl-open="p-check"]'); await sleep(200);
  await page.click('[data-pl-from="0"]'); await sleep(2500);
  const mixBar = await page.innerText('.pbar');
  check(!(await R()).on && /Midnight Chrome/.test(mixBar), 'with Mix on, a session plays as songs in the mix', mixBar.slice(0, 60).replace(/\s+/g, ' '));
  await page.click('[data-tab="playlist"]').catch(() => {});

  // export carries the sessions
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#pl-export')]);
  const f = path.join(os.tmpdir(), `pl-${Date.now()}.json`); await dl.saveAs(f);
  const ex = JSON.parse(fs.readFileSync(f, 'utf8'));
  check(ex.sessions && ex.sessions['session:two'] && ex.sessions['session:old'].frozen, 'export carries the sessions, frozen songs included');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
