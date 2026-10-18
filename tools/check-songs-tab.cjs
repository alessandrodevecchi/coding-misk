// Browser checks for the Songs tab (#34): search, filters, favourites, sorting, tag editing, previous and next,
// delete, the trash and the Test chip (#68), the trash icon on every card and hidden built-in songs (D3b).
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
  check((await visible()).length === Math.min(20, total), 'every song visible at first (a page of 20, #67)');
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
  // neon-rush-reel is on page 2 (20 songs a page, #67): a search brings it to page 1
  await page.fill('#sv-q', 'neon rush'); await sleep(400);
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
  check((await visible()).length === Math.min(20, total) && (await page.inputValue('#sv-q')) === '', 'clear filters brings every song back');

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
  // the user's song may be on a later page: the "yours" kind brings it to page 1
  await page.click('[data-f="kinds"][data-v="mine"]'); await sleep(200);
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
  await page.fill('#sv-q', ''); await page.click('[data-f="kinds"][data-v="mine"]'); await sleep(300);

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

  // ---------- delete and trash (#68) ----------
  // two more songs of the user's (one in favourites and a playlist), a code version, and a trash with an entry
  // 31 days old and one 2 days old
  await page.evaluate(async () => {
    const song = await (await fetch('/songs/luci-rosse.json')).json();
    const lib = JSON.parse(localStorage.getItem('coding-misk-library'));
    const ago = d => new Date(Date.now() - d * 864e5).toISOString();
    lib.tracks.push({ ...song, id: 'u-del', title: 'Da eliminare', tags: { free: ['test'] } });
    lib.codeSongs = [{ id: 'v-del', title: 'Ghost · v2', code: "const SECTIONS = [['intro', 4], ['drop', 4]]\nconst TEMPO = {'intro': 128, 'drop': 128}\nnote('c a f e').s('sawtooth')", from: 'ghost-protocol', fromTitle: 'Ghost protocol', version: 2, created: ago(1) }];
    lib.trash = [{ id: 'u-old', kind: 'track', song: { ...song, id: 'u-old', title: 'Vecchio' }, deletedAt: ago(31) }, { id: 'u-recent', kind: 'track', song: { ...song, id: 'u-recent', title: 'Recente' }, deletedAt: ago(2) }];
    localStorage.setItem('coding-misk-library', JSON.stringify(lib));
    const pl = JSON.parse(localStorage.getItem('coding-misk-playlists'));
    pl.lists[0].songs.push('u-del');
    pl.lists.push({ id: 'p-check', name: 'Serata', songs: ['u-del', 'drift'] });
    // a built-in song in favourites and a playlist, hidden later
    pl.lists[0].songs.push('prova-solo-synth');
    pl.lists.push({ id: 'p-solo', name: 'Solo', songs: ['prova-solo-synth', 'drift'] });
    localStorage.setItem('coding-misk-playlists', JSON.stringify(pl));
  });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(500);
  const clearView = async () => { await page.evaluate(() => { const b = document.querySelector('#sv-clear'); if (b && !b.hidden) b.click(); }); await sleep(200); };
  const saved = () => page.evaluate(() => ({ lib: JSON.parse(localStorage.getItem('coding-misk-library')), pl: JSON.parse(localStorage.getItem('coding-misk-playlists')) }));
  let st = await saved();
  check(st.lib.trash.map(e => e.id).join() === 'u-recent', 'purge at start: the entry 31 days old is gone, the other stays', st.lib.trash.map(e => e.id).join());
  // every card, built-in ones too, has Delete as a drawn trash icon in its bottom right corner
  const bins = await page.$$eval('#songs [data-song-id]', xs => xs.map(x => {
    const b = x.querySelector(':scope > .song-del[data-act="delete"]'); if (!b) return `${x.dataset.songId}: none`;
    const r = b.getBoundingClientRect(), c = x.getBoundingClientRect();
    return x.lastElementChild === b && b.querySelector('svg') && !b.textContent.trim() && b.title && /^(Delete|Elimina) /.test(b.getAttribute('aria-label')) && !x.querySelector('.songbar [data-act="delete"]') && (x.hidden || (c.right - r.right < 24 && c.bottom - r.bottom < 24)) ? '' : `${x.dataset.songId}: misplaced`;
  }));
  check(bins.length > 25 && bins.every(x => !x), 'a trash icon in the bottom right corner of every card, with tooltip and label', bins.filter(Boolean).slice(0, 3).join(', '));
  await clearView();
  await page.click('[data-f="kinds"][data-v="mine"]'); await sleep(300);
  v = await visible();
  check(v.includes('u-del') && v.includes('v-del'), 'the user\'s songs and versions are listed', v.join(', '));
  const del = '#songs [data-song-id="u-del"] [data-act="delete"]', strip = '#songs [data-song-id="u-del"] .sv-confirm';
  await page.click(del); await sleep(200);
  check(await page.isVisible(strip) && await page.evaluate(() => document.activeElement.matches('[data-confirm-cancel]')), 'Delete opens a confirmation in the card, focus on Cancel');
  if (shots) await (await page.$('#songs [data-song-id="u-del"]')).screenshot({ path: path.join(shots, 'trash-confirm.png') });
  await page.click(`${strip} [data-confirm-cancel]`); await sleep(200);
  check(!(await page.$(strip)) && (await visible()).includes('u-del'), 'Cancel closes it and keeps the song');
  await page.click(del); await sleep(200); await page.keyboard.press('Escape'); await sleep(200);
  check(!(await page.$(strip)) && (await visible()).includes('u-del'), 'Escape cancels');
  await page.click(del); await sleep(200); await page.click(`${strip} [data-confirm-ok]`); await sleep(500);
  st = await saved();
  const lists = Object.fromEntries(st.pl.lists.map(l => [l.id, l.songs]));
  check(!(await page.$('#songs [data-song-id="u-del"]')) && st.lib.trash[0].id === 'u-del' && !st.lib.tracks.some(x => x.id === 'u-del'), 'confirmed: the song leaves the list for the trash');
  check(!lists.favourites.includes('u-del') && lists['p-check'].join() === 'drift', 'the song left favourites and the playlist', JSON.stringify(lists));
  check(/trash/i.test(await page.innerText('.toast')) && await page.isVisible('.toast .toast-act'), 'toast with Restore');
  await page.click('.toast .toast-act'); await sleep(500);
  check((await visible()).includes('u-del') && !(await saved()).lib.trash.some(e => e.id === 'u-del'), 'Restore in the toast brings it back');
  await page.click(del); await sleep(200); await page.click(`${strip} [data-confirm-ok]`); await sleep(400);
  await page.click('#songs [data-song-id="v-del"] [data-act="delete"]'); await sleep(200);
  await page.click('#songs [data-song-id="v-del"] .sv-confirm [data-confirm-ok]'); await sleep(400);
  check(!(await page.$('#songs [data-song-id="v-del"]')) && (await saved()).lib.codeSongs.length === 0, 'a code version goes to the trash too');
  check(/\(3\)/.test(await page.innerText('#sv-trash')), 'Trash (3) in the bar', await page.innerText('#sv-trash'));

  // the Trash view
  await page.click('#sv-trash'); await sleep(300);
  const rows = () => page.$$eval('.sv-trash-row', xs => xs.map(x => x.dataset.trashId));
  const rowText = await page.$$eval('.sv-trash-row', xs => xs.map(x => x.innerText.replace(/\s+/g, ' ')));
  check((await rows()).join() === 'v-del,u-del,u-recent' && !(await page.$('#sv-q')) && (await visible()).length === 0, 'Trash view: newest first, search and cards hidden', (await rows()).join());
  check(/30 days left/.test(rowText[1]) && /28 days left/.test(rowText[2]) && /code version/i.test(rowText[0]), 'kind, date and days left', rowText.join(' | '));
  if (shots) await page.screenshot({ path: path.join(shots, 'trash-view.png') });
  await page.click('.sv-trash-row[data-trash-id="u-del"] [data-trash-restore]'); await sleep(400);
  check((await rows()).join() === 'v-del,u-recent', 'Restore leaves the trash');
  await page.click('.sv-trash-row[data-trash-id="v-del"] [data-trash-forget]'); await sleep(200);
  check(await page.isVisible('.sv-trash-row[data-trash-id="v-del"] .sv-confirm'), 'Delete for good asks first');
  if (shots) await page.screenshot({ path: path.join(shots, 'trash-forget.png') });
  await page.click('.sv-trash-row[data-trash-id="v-del"] .sv-confirm [data-confirm-ok]'); await sleep(400);
  check((await rows()).join() === 'u-recent', 'deleted for good');
  await page.click('#sv-trash-empty'); await sleep(200);
  await page.click('.sv-trash-head + .sv-confirm [data-confirm-ok]'); await sleep(400);
  check(await page.isVisible('.sv-trash-none') && !(await saved()).lib.trash.length, 'Empty trash: the empty state shows');
  if (shots) await page.screenshot({ path: path.join(shots, 'trash-empty.png') });
  await page.click('#sv-trash-back'); await sleep(300);
  v = await visible();
  st = await saved();
  check(v.includes('u-del') && !st.pl.lists.some(l => l.songs.includes('u-del')), 'restored: back in the list, in no playlist', v.join(', '));

  // a delete survives a reload
  await page.click(del); await sleep(200); await page.click(`${strip} [data-confirm-ok]`); await sleep(400);
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(500);
  await page.click('#sv-trash'); await sleep(300);
  check((await rows()).join() === 'u-del', 'the trash is kept after a reload');
  await page.click('.sv-trash-row[data-trash-id="u-del"] [data-trash-restore]'); await sleep(300);
  await page.click('#sv-trash-back'); await sleep(300);

  // the Test chip
  await clearView();
  await page.fill('#sv-q', 'breakbeat'); await sleep(400);
  check((await page.getAttribute('#sv-test', 'aria-pressed')) === 'false' && (await visible()).includes('prova-breakbeat'), 'test songs listed by default');
  await page.fill('#sv-q', ''); await sleep(400);
  await page.click('#sv-test'); await sleep(300);
  v = await visible();
  const allTest = await page.$$eval('#songs [data-song-id]', xs => xs.filter(x => !x.hidden).every(x => x.querySelector('[data-tag-f="q"][data-v="test"]')));
  check(v.includes('prova-breakbeat') && v.includes('u-del') && !v.includes('kellerlicht') && !v.includes('switch-tappe') && allTest, 'Test chip: only test songs, built-in and the user\'s', v.join(', '));
  await page.click('#sv-test'); await sleep(200);
  await page.fill('#sv-q', 'breakbeat'); await sleep(400);
  await page.click('#songs [data-song-id="prova-breakbeat"] [data-tag-f="q"][data-v="test"]'); await sleep(300);
  check((await page.getAttribute('#sv-test', 'aria-pressed')) === 'true' && (await page.inputValue('#sv-q')) === 'breakbeat', 'a #test tag on a card turns the Test chip on');
  await page.click('#sv-clear'); await sleep(200);

  // a built-in song is hidden (D3b): it leaves the list, the playlists and the Compose song menu, the trash shows it
  await clearView();
  const solo = '#songs [data-song-id="prova-solo-synth"]', pick = () => page.$$eval('#track-pick option', xs => xs.map(x => x.value));
  check((await pick()).includes('prova-solo-synth'), 'Solo synth in the Compose song menu');
  await page.fill('#sv-q', 'solo synth'); await sleep(400);
  await page.click(`${solo} .song-del`); await sleep(200);
  check(await page.isVisible(`${solo} .song-del + .sv-confirm`), 'the trash icon of a built-in card opens the confirmation');
  if (shots) await (await page.$(solo)).screenshot({ path: path.join(shots, 'trash-builtin-confirm.png') });
  await page.click(`${solo} .sv-confirm [data-confirm-ok]`); await sleep(500);
  st = await saved();
  const sl = Object.fromEntries(st.pl.lists.map(l => [l.id, l.songs])), se = st.lib.trash.find(e => e.id === 'prova-solo-synth');
  check(!(await page.$(solo)) && (st.lib.hidden || []).join() === 'prova-solo-synth' && se && se.kind === 'builtin' && !se.song && se.title === 'Solo synth', 'a built-in song deleted: hidden, in the trash with no copy', JSON.stringify(se));
  check(!sl.favourites.includes('prova-solo-synth') && sl['p-solo'].join() === 'drift', 'the hidden song left favourites and the playlist', JSON.stringify(sl));
  check(!(await pick()).includes('prova-solo-synth'), 'the hidden song left the Compose song menu');
  await page.fill('#sv-q', ''); await sleep(400);
  await page.click('#sv-trash'); await sleep(300);
  const soloRow = await page.innerText('.sv-trash-row[data-trash-id="prova-solo-synth"]').catch(() => '');
  check(/Solo synth/.test(soloRow) && /built-in song/i.test(soloRow) && /30 days left/.test(soloRow), 'the trash lists it as a built-in song', soloRow.replace(/\s+/g, ' '));
  if (shots) await page.screenshot({ path: path.join(shots, 'trash-builtin.png') });
  await page.click('.sv-trash-row[data-trash-id="prova-solo-synth"] [data-trash-restore]'); await sleep(400);
  await page.click('#sv-trash-back'); await sleep(300);
  st = await saved();
  check(!!(await page.$(solo)) && !(st.lib.hidden || []).length && (await pick()).includes('prova-solo-synth'), 'Restore shows it again, in the list and in Compose');
  // hidden for good: gone from the list and the trash; Settings → Library shows it again after a confirmation
  await page.fill('#sv-q', 'solo synth'); await sleep(400);
  await page.click(`${solo} .song-del`); await sleep(200); await page.click(`${solo} .sv-confirm [data-confirm-ok]`); await sleep(500);
  await page.fill('#sv-q', ''); await sleep(400);
  await page.click('#sv-trash'); await sleep(300);
  await page.click('.sv-trash-row[data-trash-id="prova-solo-synth"] [data-trash-forget]'); await sleep(200);
  await page.click('.sv-trash-row[data-trash-id="prova-solo-synth"] .sv-confirm [data-confirm-ok]'); await sleep(400);
  await page.click('#sv-trash-back'); await sleep(300);
  st = await saved();
  check(!(await page.$(solo)) && !st.lib.trash.some(e => e.id === 'prova-solo-synth') && (st.lib.hidden || []).join() === 'prova-solo-synth', 'deleted for good: not in the list nor in the trash, still hidden');
  await page.click('#open-settings'); await sleep(400);
  check(/\(1\)/.test(await page.innerText('#set-show-hidden').catch(() => '')), 'Settings → Library: Show hidden built-in songs (1)');
  await page.click('#set-show-hidden'); await sleep(200);
  check(await page.isVisible('#set-library .sv-confirm') && (await saved()).lib.hidden.length === 1, 'it asks inside the page first');
  if (shots) await (await page.$('#set-library')).screenshot({ path: path.join(shots, 'settings-hidden.png') });
  await page.click('#set-library .sv-confirm [data-confirm-ok]'); await sleep(400);
  check(!(await saved()).lib.hidden.length && !(await page.$('#set-show-hidden')), 'confirmed: no song hidden any more');
  await page.click('#open-settings'); await sleep(300);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(300);
  await clearView();
  await page.fill('#sv-q', 'solo synth'); await sleep(400);
  check(!!(await page.$(solo)) && (await visible()).includes('prova-solo-synth'), 'the song is back in the list');
  await page.fill('#sv-q', ''); await sleep(400);

  // Compose: Delete song asks under its buttons, the song goes to the trash, Compose opens another song
  await page.click('[data-f="kinds"][data-v="mine"]'); await sleep(200);
  await page.click('#songs [data-song-id="u-del"] [data-act="open"]'); await sleep(800);
  await page.click('#tr-del'); await sleep(200);
  check(await page.isVisible('.actions:has(#tr-del) + .sv-confirm') && /trash/i.test(await page.innerText('.actions:has(#tr-del) + .sv-confirm')), 'Compose: the confirmation strip under the buttons');
  if (shots) await page.screenshot({ path: path.join(shots, 'trash-compose.png') });
  await page.click('.actions:has(#tr-del) + .sv-confirm [data-confirm-ok]'); await sleep(600);
  st = await saved();
  check((await page.inputValue('#track-title')) !== 'Da eliminare' && st.lib.trash.some(e => e.id === 'u-del'), 'Compose: the song is in the trash and Compose opened another', await page.inputValue('#track-title'));
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(300);
  await clearView();
  await page.click('#songs [data-song-id="kellerlicht"] [data-act="open"]'); await sleep(800);
  check((await page.innerText('#tr-del')) === 'Restore original', 'Compose: a built-in song keeps Restore original', await page.innerText('#tr-del'));
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(300);

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
