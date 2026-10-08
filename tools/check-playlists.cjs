// Browser checks for playlists (#36): favourites migration, "+ Playlist", the Playlists tab, auto-advance,
// shuffle, repeat one, export and import, phone width.
// Usage: PLAYWRIGHT_CORE=... node tools/check-playlists.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

// three very short songs of the user's (2 bars at 180 BPM, under 3 seconds), plus old favourites
async function seed(page) {
  await page.evaluate(async () => {
    const base = await (await fetch('/songs/examples/01-first-beat.json')).json();
    const mk = n => ({ ...base, id: `u-s${n}`, title: `Short ${n}`, tags: { genres: ['techno'] }, sections: [{ ...base.sections[0], bars: 2, bpm: 180 }] });
    localStorage.clear();
    localStorage.setItem('coding-misk-library', JSON.stringify({ tracks: [mk(1), mk(2), mk(3)], code: {} }));
    localStorage.setItem('coding-misk-favourites', JSON.stringify(['kellerlicht']));
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  await seed(page);
  await page.reload(); await sleep(3500);
  const lists = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-playlists')).lists);
  const title = () => page.innerText('#pb-title');
  const pos = () => page.innerText('#pb-pos');
  const playing = () => page.evaluate(() => document.querySelector('#play').dataset.state === 'playing');

  // favourites from #34 move into the playlist store
  let ls = await lists();
  check(ls[0].id === 'favourites' && ls[0].songs.join() === 'kellerlicht', 'old favourites migrated', JSON.stringify(ls[0]));
  check(await page.evaluate(() => localStorage.getItem('coding-misk-favourites') === null), 'old favourites key removed');

  // "+ Playlist" on a card: new playlist, then add to it
  await page.click('[data-tab="brani"]'); await sleep(400);
  const card = id => `#songs [data-song-id="${id}"]`;
  await page.click(`${card('u-s1')} [data-act="playlist"]`); await sleep(150);
  await page.fill(`${card('u-s1')} [data-pl-name]`, 'Corsa'); await page.click(`${card('u-s1')} [data-pl-create]`); await sleep(200);
  ls = await lists();
  const corsa = ls.find(l => l.name === 'Corsa');
  check(corsa && corsa.songs.join() === 'u-s1', 'new playlist from a card', JSON.stringify(corsa));
  for (const id of ['u-s2', 'u-s3']) { await page.click(`${card(id)} [data-act="playlist"]`); await sleep(150); await page.click(`${card(id)} [data-pl-add="${corsa.id}"]`); await sleep(150); }
  await page.click(`${card('u-s3')} [data-act="playlist"]`); await sleep(150); await page.click(`${card('u-s3')} [data-pl-add="${corsa.id}"]`); await sleep(150);
  ls = await lists();
  check(ls.find(l => l.id === corsa.id).songs.join() === 'u-s1,u-s2,u-s3', 'add to an existing playlist, only once', ls.find(l => l.id === corsa.id).songs.join());
  await page.click(`${card('drift')} [data-star]`); await sleep(100);
  check((await lists())[0].songs.includes('drift'), 'the star adds to Favourites');

  // Songs tab playlist row
  await page.click(`[data-list="${corsa.id}"]`); await sleep(300);
  const vis = await page.$$eval('#songs [data-song-id]', xs => xs.filter(x => !x.hidden).map(x => x.dataset.songId));
  check(vis.join() === 'u-s1,u-s2,u-s3', 'picking a playlist shows its songs in order', vis.join());
  if (shots) await page.screenshot({ path: path.join(shots, 'songs-playlist.png') });

  // Playlists tab: reorder with the buttons, kept after reload
  await page.click('[data-tab="playlist"]'); await sleep(300);
  await page.click(`[data-pl-open="${corsa.id}"]`); await sleep(200);
  await page.click('#tab-playlist [data-pl-up="2"]'); await sleep(200);
  check((await lists()).find(l => l.id === corsa.id).songs.join() === 'u-s1,u-s3,u-s2', 'move up');
  if (shots) await (await page.$('#tab-playlist')).screenshot({ path: path.join(shots, 'playlists-tab.png') });
  await page.reload(); await sleep(3500);
  check((await lists()).find(l => l.id === corsa.id).songs.join() === 'u-s1,u-s3,u-s2', 'order kept after reload');

  // auto-advance: the next song starts by itself, the player bar shows the position, stop after the last
  await page.click('[data-tab="playlist"]'); await sleep(300);
  await page.click(`[data-pl-open="${corsa.id}"]`); await sleep(200);
  await page.click('#pl-play'); await sleep(800);
  const seen = [await title()], posSeen = [await pos()];
  for (let k = 0; k < 40 && seen.length < 3; k++) { await sleep(250); const tt = await title(); if (tt !== seen[seen.length - 1]) { seen.push(tt); posSeen.push(await pos()); } }
  check(seen.join() === 'Short 1,Short 3,Short 2', 'auto-advance in playlist order', seen.join());
  check(/Corsa · 1 \/ 3/.test(posSeen[0]) && /2 \/ 3/.test(posSeen[1]), 'player bar shows the playlist and the position', posSeen.join(' | '));
  await sleep(4500);
  check(!(await playing()), 'playback stops after the last song');

  // next and previous follow the playlist
  await page.click('#pl-play'); await sleep(600);
  await page.click('#pb-next'); await sleep(500);
  check((await title()) === 'Short 3', 'next follows the playlist', await title());
  await page.click('#stop'); await sleep(300);

  // repeat one on a single song
  await page.click('#pb-repeat'); await page.click('#pb-repeat'); await sleep(100);
  check((await page.getAttribute('#pb-repeat', 'data-mode')) === 'one', 'repeat cycles to one');
  await page.click('[data-tab="brani"]'); await sleep(300);
  await page.click('[data-list="all"]'); await sleep(200);
  await page.click(`${card('u-s2')} [data-act="play"]`); await sleep(4500);
  check((await playing()) && (await title()) === 'Short 2', 'repeat one replays a single song', await title());
  await page.click('#stop'); await sleep(200);
  await page.click('#pb-repeat'); await sleep(100);
  check((await page.getAttribute('#pb-repeat', 'data-mode')) === 'off', 'repeat back to off');

  // shuffle: every song once
  await page.click('#pb-shuffle'); await sleep(100);
  await page.click(`[data-list="${corsa.id}"]`); await sleep(200);
  await page.click('[data-play-list]'); await sleep(800);
  const sh = [await title()];
  for (let k = 0; k < 40 && sh.length < 3; k++) { await sleep(250); const tt = await title(); if (tt !== sh[sh.length - 1]) sh.push(tt); }
  check(sh.length === 3 && new Set(sh).size === 3, 'shuffle plays each song once', sh.join());
  await page.click('#stop'); await page.click('#pb-shuffle'); await sleep(200);
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-shuffle')) === false && JSON.parse(localStorage.getItem('coding-misk-repeat')) === 'off'), 'shuffle and repeat remembered');

  // export, then import in a fresh browser
  await page.click('[data-tab="playlist"]'); await sleep(300);
  await page.click(`[data-pl-open="${corsa.id}"]`); await sleep(200);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#pl-export')]);
  const file = path.join(os.tmpdir(), `coding-misk-playlist-${Date.now()}.json`);
  await dl.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(data.format === 'coding-misk/playlist' && data.userSongs.length === 3, 'export holds the user songs', `${data.userSongs.length}`);
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errors.push(e.message));
  await p2.goto('http://localhost:5173/'); await sleep(3000);
  await p2.click('[data-tab="playlist"]'); await sleep(300);
  const [chooser] = await Promise.all([p2.waitForEvent('filechooser'), p2.click('#pl-import')]);
  await chooser.setFiles(file); await sleep(800);
  const ls2 = await p2.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-playlists')).lists);
  const lib2 = await p2.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-library') || '{"tracks":[]}').tracks.map(x => x.id));
  check(ls2.some(l => l.name === 'Corsa' && l.songs.join() === 'u-s1,u-s3,u-s2') && ['u-s1', 'u-s2', 'u-s3'].every(id => lib2.includes(id)), 'import in another browser adds the playlist and its songs', lib2.join());
  await ctx2.close();

  // delete with an in-page confirmation
  await page.click('#pl-delete'); await sleep(200);
  check((await lists()).some(l => l.id === corsa.id), 'first press does not delete');
  await page.click('#pl-delete'); await sleep(300);
  check(!(await lists()).some(l => l.id === corsa.id), 'second press deletes');
  check(!(await page.$('#pl-delete')), 'Favourites cannot be deleted');

  // phone width
  await page.setViewportSize({ width: 390, height: 900 }); await sleep(400);
  for (const tab of ['playlist', 'brani']) {
    await page.click(`[data-tab="${tab}"]`); await sleep(300);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    check(sw <= 392, `no horizontal scroll at phone width (${tab})`, `${sw}px`);
  }
  const barOk = await page.evaluate(() => { const r = document.querySelector('#pb-repeat').getBoundingClientRect(); return r.right <= innerWidth && r.width > 0; });
  check(barOk, 'shuffle and repeat fit in the player bar on a phone');
  if (shots) await page.screenshot({ path: path.join(shots, 'playlists-phone.png') });

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
