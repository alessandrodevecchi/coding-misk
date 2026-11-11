// Browser checks for the Decode library (decode-library): fake folders in the origin private file system (real handles
// IndexedDB can store) with generated WAV files (tools/decode-audio.mjs), nested folders, a dot folder, a text file, an
// unreadable file and an MP4; showDirectoryPicker, showOpenFilePicker and the permission methods patched to return them
// and to answer "prompt" after a reload (design, Risks: fake handles). Groups: the panel ("Another file" opens it, not
// the picker; Escape), folders (two added, a duplicate refused, subfolders, skipped names, the video icon), the list
// (search with accents, chips, order, marks ◆ and ◇ from the index, a ◆ row opening in Full with one record read), the
// permission after a reload (one click, then no more; denied), a deleted file "not found", Autoplay (prepared before
// the end, the hand-over gap on the audio clock, the code from the new track's first lines, an unreadable file skipped,
// the end of the list, a slow preparation: the pause, the sound after about 3 s and the code after), Previous and Next
// (the ends, a prepared track, a picked file), mixtapes (four rows, drag, rename, reload, repeat on and off, a moved
// file "not found" and back, not in Playlists, the backup exported and imported on a cleared database with "not found"
// rows linked again by adding the folder), the backup's 100 analyses and "Include all Decode analyses", long lists
// (two folders of 2000 files: no task over 100 ms while scanning, searching and scrolling, a search within 150 ms, the
// cap's chip), 2000 stored records (tab and panel open with no record read and no long task, the list within 300 ms; the
// index rebuilt in the background), the tags' timing on 200 tagged files (task 2.4), a browser without folders and one
// without IndexedDB, pictures in neon, hardware and light, English and Italian, 1300 and 400 px.
// Not testable here: the browser's real permission prompt and folder picker (patched), a folder on a real disk.
// Needs ffmpeg. Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-decode-library.cjs [shots-dir] [--only a,b] [--json out]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { execFileSync } = require('node:child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), shots = args.find((a, i) => !a.startsWith('--') && !['--only', '--json'].includes(args[i - 1]));
const ONLY = (args.includes('--only') ? args[args.indexOf('--only') + 1] : '').split(',').filter(Boolean), JSON_OUT = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const PORT = process.env.PORT || 5173, URL0 = `http://localhost:${PORT}/`;
let failed = 0, passed = 0;
const measures = {};
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (ok) passed++; else failed++; };
const want = g => !ONLY.length || ONLY.includes(g);
const CACHE = path.join(__dirname, '..', '.cache', 'decode', 'library');
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);

// the page's patches: the folder and file pickers return handles of the private file system; the permission answers
// "prompt" after a reload when the check asks for it, "granted" once requested, "denied" when the check says so
const INIT = () => {
  const S = k => sessionStorage.getItem(k);
  if (S('dclNoIDB') === '1') { try { Object.defineProperty(window, 'indexedDB', { get: () => undefined, configurable: true }); } catch (e) {} }
  if (!window.FileSystemHandle) return;
  const P = FileSystemHandle.prototype, granted = new Set();
  window.__dclAsked = 0;
  P.queryPermission = async function () { return S('dclPerm') === 'prompt' && !granted.has(this.name) ? 'prompt' : 'granted'; };
  P.requestPermission = async function () { window.__dclAsked++; if (S('dclDeny') === '1') return 'denied'; granted.add(this.name); return 'granted'; };
  const root = () => navigator.storage.getDirectory();
  window.showDirectoryPicker = async () => { const name = (window.__dclPick || []).shift(); if (!name) throw new DOMException('cancelled', 'AbortError'); return (await root()).getDirectoryHandle(name); };
  window.showOpenFilePicker = async () => { const names = window.__dclFiles || []; window.__dclFiles = []; if (!names.length) throw new DOMException('cancelled', 'AbortError'); const d = await (await root()).getDirectoryHandle('Singles'); return Promise.all(names.map(n => d.getFileHandle(n))); };
  if (S('dclNoFolders') === '1') { delete window.showDirectoryPicker; try { delete Window.prototype.showDirectoryPicker; } catch (e) {} window.showDirectoryPicker = undefined; }
  // long tasks for the checks
  window.__long = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push({ at: e.startTime, ms: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
};

(async () => {
  // ---------- the files ----------
  fs.mkdirSync(CACHE, { recursive: true });
  const { renderSong, writeWav } = await import('./decode-audio.mjs');
  const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' };
  const song = (name, bpm, bars, seed) => { const f = path.join(CACHE, name); if (!fs.existsSync(f)) writeWav(f, renderSong({ bpm, bars, lead: 0.3, seed, chords: ['Am', 'F', 'C', 'G'], drums: D, bass: 'x..x..x...x.x...' }).pcm); return f; };
  const A = song('a.wav', 124, 11, 1), B = song('b.wav', 128, 11, 2), C = song('c.wav', 120, 11, 3), N = song('night.wav', 126, 11, 4), M = song('mid.wav', 122, 10, 5), Z = song('zeta.wav', 124, 10, 6);
  const MP4 = path.join(CACHE, 'clip.mp4');
  if (!fs.existsSync(MP4)) ff(['-f', 'lavfi', '-i', 'color=c=black:s=160x120:r=10', '-i', C, '-t', '18', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', MP4]);
  const TAGGED = path.join(CACHE, 'tagged.mp3');
  if (!fs.existsSync(TAGGED)) ff(['-i', A, '-t', '4', '-metadata', 'title=Tagged Title', '-metadata', 'artist=Tag Artist', '-b:a', '128k', TAGGED]);
  const b64 = f => fs.readFileSync(f).toString('base64');
  const LAYOUT = {
    'Live sets/a.wav': A, 'Live sets/set 1/b.wav': B, 'Live sets/set 1/old/c.wav': C, 'Live sets/notes.txt': 'text', 'Live sets/.cache/d.wav': A,
    'Live sets/clip.mp4': MP4, 'Live sets/broken.wav': 'broken',
    'Demos/Some Band - Night Run.wav': N, 'Demos/Midnight.wav': M, 'Demos/zeta.wav': Z, 'Singles/single.wav': Z,
  };

  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 }, acceptDownloads: true });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const dec = () => page.evaluate(() => globalThis.codingMiskDecode.state());
  const pst = () => page.evaluate(() => globalThis.codingMiskDecode.panel.state());
  const waitFor = async (fn, ms = 20000, step = 200) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn().catch(() => null); if (v) return v; await sleep(step); } return null; };
  const longSince = t => page.evaluate(t0 => window.__long.filter(x => x.at >= t0), t);
  const now = () => page.evaluate(() => performance.now());
  // the private file system: write, remove, move
  const opfs = (op, a, b) => page.evaluate(async ([op, a, b]) => {
    const root = await navigator.storage.getDirectory();
    const dirOf = async (p, make = true) => { const parts = p.split('/'); let d = root; for (const x of parts.slice(0, -1)) d = await d.getDirectoryHandle(x, { create: make }); return [d, parts[parts.length - 1]]; };
    if (op === 'clear') { for await (const k of root.keys()) await root.removeEntry(k, { recursive: true }); return true; }
    if (op === 'write') { const [d, n] = await dirOf(a); const h = await d.getFileHandle(n, { create: true }), w = await h.createWritable(); const bin = b === 'text' ? new TextEncoder().encode('notes') : b === 'broken' ? new TextEncoder().encode('RIFF0000WAVEnot audio'.repeat(300)) : b === 'stub' ? new Uint8Array(64) : Uint8Array.from(atob(b), c => c.charCodeAt(0)); await w.write(bin); await w.close(); return true; }
    if (op === 'stubs') { const d = await root.getDirectoryHandle(a, { create: true }); for (let i = 0; i < b; i++) { const h = await d.getFileHandle(`stub ${String(i).padStart(4, '0')}.wav`, { create: true }), w = await h.createWritable(); await w.write(new Uint8Array(8)); await w.close(); } return true; }
    if (op === 'copy') { const [sd, sn] = await dirOf(a); const f = await (await sd.getFileHandle(sn)).getFile(), buf = await f.arrayBuffer(); const parts = b.split('/'); for (let i = 0; i < +parts[1]; i++) { const [d, n] = await dirOf(`${parts[0]}/t${String(i).padStart(3, '0')}.mp3`); const h = await d.getFileHandle(n, { create: true }), w = await h.createWritable(); await w.write(buf); await w.close(); } return true; }
    if (op === 'rm') { const [d, n] = await dirOf(a, false); await d.removeEntry(n); return true; }
    if (op === 'mv') { const [sd, sn] = await dirOf(a, false); const f = await (await sd.getFileHandle(sn)).getFile(), buf = await f.arrayBuffer(); const [d, n] = await dirOf(b); const h = await d.getFileHandle(n, { create: true }), w = await h.createWritable(); await w.write(buf); await w.close(); await sd.removeEntry(sn); return true; }
    return false;
  }, [op, a, b]);
  const reset = async () => {
    await page.goto(URL0); await sleep(1500);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); for (const n of ['coding-misk-decodes', 'coding-misk-decode-library']) indexedDB.deleteDatabase(n); });
    await opfs('clear');
    for (const [p, f] of Object.entries(LAYOUT)) await opfs('write', p, ['text', 'broken', 'stub'].includes(f) ? f : b64(f));
  };
  const openTab = async () => {
    await page.click('[data-lang="en"]').catch(() => {}); await page.click('[data-mode="ascolta"]').catch(() => {});
    await page.click('[data-tab="decode"]'); await sleep(500);
  };
  const reload = async () => { await page.reload(); await sleep(2200); await openTab(); await waitFor(async () => (await pst()).scanning === 0, 8000); };
  const addFolder = async name => { await page.evaluate(n => { window.__dclPick = [n]; }, name); await page.click('#dcl-add'); await waitFor(async () => { const s = await pst(); return s.folders.some(f => f.name === name) && !s.scanning; }, 15000); await sleep(300); };
  // the rows drawn now: name, folder, mark, states
  const rowsNow = () => page.$$eval('#dcl .dcl-row', xs => xs.map(x => ({ key: x.dataset.dclRow, name: x.querySelector('.dcl-name').firstChild.textContent.trim(), folder: x.querySelector('.dcl-folder').textContent, mark: x.querySelector('.dcl-mark').textContent, video: !!x.querySelector('.dcl-vid svg'), wait: x.classList.contains('wait'), miss: x.classList.contains('miss'), on: x.classList.contains('on') })));
  const rowKey = async (name, folder) => (await rowsNow()).find(r => r.name === name && (!folder || r.folder === folder))?.key;
  const clickRow = async (name, folder) => { const k = await rowKey(name, folder); if (!k) return false; await page.click(`#dcl [data-dcl-row="${k}"]`); return true; };
  const chip = async id => page.click(`#dcl [data-dcl-chip="${id}"]`);
  const folderId = async name => (await pst()).folders.find(f => f.name === name)?.id;
  const opened = async (name, ms = 15000) => waitFor(async () => { const s = await dec(); return s.track && s.track.name === name && !(s.status && s.status.kind === 'busy') ? s : null; }, ms);
  const playingName = () => page.evaluate(() => { const s = globalThis.codingMiskDecode.state(); return s.playing && s.track ? s.track.name : null; });
  const firstLine = () => page.evaluate(() => (globalThis.codingMiskPhrases ? globalThis.codingMiskPhrases.code() : '').split('\n')[0] || '');
  const shot = async name => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, `${name}.png`) }); } };

  await reset();
  await page.reload(); await sleep(2200); await openTab();

  // ---------- folders and the list ----------
  if (want('list')) {
    check(!!(await page.$('#tab-decode #dc-lib-slot #dcl')) && !!(await page.$('#dcl #dcl-choose')), 'the empty tab shows the drop area, then the panel\'s list with "Choose a file…"');
    await addFolder('Live sets');
    let rows = await rowsNow();
    check(rows.map(r => r.name).sort().join() === 'a,b,broken,c,clip', 'subfolders at any depth; notes.txt and the dot folder skipped', rows.map(r => r.name).join());
    check(rows.find(r => r.name === 'clip')?.video && !rows.find(r => r.name === 'a')?.video, 'the MP4 row has the video icon');
    check(rows.every(r => !/\d:\d\d/.test(r.name + r.folder)), 'no row shows a length');
    await addFolder('Demos');
    const chips = await page.$$eval('#dcl-chips [data-dcl-chip]', xs => xs.map(x => x.textContent.replace(/\s+\d+\+?$/, '').trim()));
    check(chips.join() === 'All,Live sets,Demos' && (await rowsNow()).length === 8, 'two folders: chips All, Live sets and Demos, the list holds both', chips.join());
    await page.evaluate(() => { window.__dclPick = ['Live sets']; }); await page.click('#dcl-add'); await sleep(800);
    const msg = await page.innerText('#dcl-msg').catch(() => '');
    check((await pst()).folders.length === 2 && /already/.test(msg), 'the same folder again: refused with a note', msg);
    check((await rowsNow()).some(r => r.name === 'Night Run'), 'a name from the file name ("Some Band - Night Run.wav" reads "Night Run")');
    await page.fill('#dcl-search', 'NÌGH'); await sleep(250);
    rows = await rowsNow();
    check(rows.map(r => r.name).sort().join() === 'Midnight,Night Run', 'search ignoring case and accents', rows.map(r => r.name).join());
    await page.fill('#dcl-search', ''); await sleep(250);
    await chip(await folderId('Demos')); await sleep(300);
    rows = await rowsNow();
    check(rows.length === 3 && rows.every(r => r.folder === 'Demos'), 'the Demos chip keeps only Demos', rows.map(r => r.name).join());
    await reload();
    check((await pst()).prefs.chip === await folderId('Demos'), 'the chip is remembered after a reload');
    await chip('all'); await sleep(200);
    await shot('lib-list');
  }

  // ---------- the panel, marks and opening ----------
  if (want('panel')) {
    await chip('all'); await sleep(200);
    await clickRow('a');
    let s = await opened('a.wav');
    check(!!s && !(await page.$('#dcl.over')), 'a row opens the track in Decode', s && s.track.name);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 1500 }).catch(() => null), (async () => { await page.click('#dc-play'); await sleep(1500); await page.click('#dc-another'); })()]);
    await sleep(500);
    s = await dec();
    check(!chooser && !!(await page.$('#dcl.over')) && !!(await page.$('#dcl.over #dcl-choose')) && s.playing, '"Another file" while playing: the panel opens, no file picker, the track keeps playing');
    await shot('lib-panel');
    await page.keyboard.press('Escape'); await sleep(300);
    check(!(await page.$('#dcl.over')), 'Escape closes the panel');
    await page.click('#dc-stop'); await sleep(300);
    await page.click('#dc-another'); await sleep(400);
    let r = (await rowsNow()).find(x => x.name === 'a');
    check(r && r.mark === '◇' && r.on, 'the open track is highlighted and marked ◇ Live after its analysis', JSON.stringify(r));
    // Full on b (misk-analyzer alone, fast), then its mark
    await clickRow('b'); await opened('b.wav');
    await page.evaluate(() => { globalThis.codingMiskNoEssentia = true; return globalThis.codingMiskDecode.runFull('switch'); });
    await waitFor(async () => (await dec()).level === 'B', 30000);
    await sleep(1800);
    await reload();
    const reads0 = (await dec()).reads;
    await page.waitForSelector('#dcl .dcl-row');
    r = await rowsNow();
    check(r.find(x => x.name === 'b')?.mark === '◆' && r.find(x => x.name === 'a')?.mark === '◇' && r.find(x => x.name === 'c')?.mark === '', 'after a reload: ◆ Full, ◇ Live and no mark, from the index', r.map(x => `${x.name}${x.mark}`).join(' '));
    check(reads0 === 0 && (await dec()).reads === 0, 'the tab and the list read no stored analysis', `${reads0}`);
    await clickRow('b');
    s = await opened('b.wav');
    check(s && s.level === 'B' && !s.full && s.reads === 1, 'a ◆ row opens in Full, no analysis runs, only its record is read', s && `${s.level} · reads ${s.reads}`);
  }

  // ---------- Autoplay, the hand-over, Previous and Next ----------
  if (want('autoplay')) {
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    else if (!(await page.$('#dcl.over')) && (await dec()).track) { await page.click('#dc-another'); await sleep(300); }
    await chip(await folderId('Live sets')); await page.click('#dcl [data-dcl-order="name"]'); await sleep(200);
    if ((await page.getAttribute('#dcl-autoplay', 'aria-pressed')) !== 'true') await page.click('#dcl-autoplay');
    await clickRow('a'); await opened('a.wav');
    let s = await dec();
    check(s.canNext && !s.canPrev && s.next === 'b', 'the first row: Previous disabled, Next to b', `${s.canPrev} ${s.canNext} ${s.next}`);
    check(await page.$eval('#pb-prev', b => b.disabled) && !(await page.$eval('#pb-next', b => b.disabled)), 'the player bar: Previous disabled, Next enabled');
    const t0 = await now();
    await page.click('#dc-play');
    const prepped = await waitFor(async () => { const x = await dec(); return x.prep && x.prep.state === 'ready' ? x : null; }, 15000);
    const lt = await longSince(t0);
    check(!!prepped && prepped.prep.name === 'b', 'Autoplay: a 20-second track prepares the next one at once (read, decoded, Live analysis started)', prepped && JSON.stringify(prepped.prep.times));
    measures.prepare = prepped && prepped.prep.times;
    check(lt.every(x => x.ms <= 100), 'no main-thread task over 100 ms while preparing', lt.map(x => Math.round(x.ms)).join(','));
    const handed = await waitFor(async () => (await playingName()) === 'b.wav', 40000, 50);
    s = await dec();
    measures.handGapMs = s.lastHand && s.lastHand.gapMs;
    check(!!handed && s.lastHand && s.lastHand.why === 'end' && s.lastHand.gapMs <= 20, 'the hand-over: b\'s sound starts within 20 ms of a\'s end on the audio clock', s.lastHand && `gap ${s.lastHand.gapMs.toFixed(2)} ms, ${Math.round(s.lastHand.offset * 1000)} ms of b skipped`);
    await sleep(2500);
    const line = await firstLine();
    check(/\bb\b/.test(line) && !/\ba\b/.test(line.replace(/coding-misk/, '')), 'the code column starts from b\'s first lines', line);
    // broken.wav is next: skipped with a note, c prepared instead
    const sk = await waitFor(async () => { const x = await dec(); return x.prep && x.prep.name === 'c' ? x : null; }, 15000);
    check(!!sk, 'an unreadable next file is skipped and the track after it is prepared', `${sk && sk.prep.name}`);
    // Next with the prepared track: at once, no file read again
    const reads = (await dec()).reads;
    await page.click('#pb-next');
    await waitFor(async () => (await playingName()) === 'c.wav', 8000, 50);
    s = await dec();
    console.log(`info  after Next: ${s.track.name} at ${s.file && s.file.toFixed(2)} s, hand ${JSON.stringify(s.lastHand)} · ${JSON.stringify(s.trail)}`);
    check(s.track.name === 'c.wav' && s.lastHand && s.lastHand.why === 'now' && s.reads === reads, 'Next with a prepared track: it starts at once, nothing read again', `${s.track.name} · ${s.lastHand && s.lastHand.why}`);
    // Previous: the row before, skipping the unreadable one
    await page.click('#pb-prev');
    await waitFor(async () => (await dec()).track.name === 'b.wav', 10000);
    check((await dec()).track.name === 'b.wav', 'Previous opens the row before, skipping a row that failed', (await dec()).track.name);
    // the end of the list: clip is last
    await page.click('#dc-stop').catch(() => {});
    if (!(await page.$('#dcl.over'))) await page.click('#dc-another');
    await sleep(300);
    await clickRow('clip'); await opened('clip.mp4');
    s = await dec();
    check(!s.canNext && s.canPrev, 'the last row: Next disabled, Previous enabled');
    await page.click('#dc-play'); await sleep(1500);
    await page.evaluate(() => globalThis.codingMiskDecode.seek(globalThis.codingMiskDecode.duration - 2)); await sleep(3500);
    s = await dec();
    check(!s.playing && !s.waitNext && s.track.name === 'clip.mp4', 'the end of the list with Autoplay on: the tab stops');
    // a slow preparation: the pause, the sound after about 3 s, then the code
    if (!(await page.$('#dcl.over'))) await page.click('#dc-another');
    await sleep(300);
    await clickRow('a'); await opened('a.wav');
    await page.evaluate(() => { globalThis.codingMiskSlowPrep = 7000; });
    await page.click('#dc-play'); await sleep(1500);
    await page.evaluate(() => globalThis.codingMiskDecode.seek(globalThis.codingMiskDecode.duration - 1.5));
    const w = await waitFor(async () => { const x = await dec(); return x.waitNext ? x : null; }, 6000, 50);
    const tw = Date.now();
    check(!!w && /Next: b/.test(w.status && w.status.text), 'not ready at the end: silence and "Next: b…"', w && w.status && w.status.text);
    const codeOn = await waitFor(async () => { const x = await dec(); return x.playing && x.track.name === 'b.wav' && x.startedCode ? x : null; }, 15000, 100);
    const tr = codeOn ? codeOn.trail : [], au = tr.find(x => x.kind === 'audio'), wt = tr.find(x => x.kind === 'wait'), cd = tr.filter(x => x.kind === 'code').pop();
    check(!!au && au.waited >= 2900 && au.waited < 4500, 'after about 3 s the next track\'s sound starts without its code', au && `${(au.waited / 1000).toFixed(1)} s`);
    check(!!cd && !!wt && cd.at > au.at, 'its code joins when its analysis has found the tempo', cd && wt && `${((cd.at - wt.at) / 1000).toFixed(1)} s after the end`);
    await page.evaluate(() => { globalThis.codingMiskSlowPrep = 0; });
    await page.click('#dc-stop'); await sleep(300);
    // a picked file: no Previous or Next
    await page.setInputFiles('#dc-file', Z); await opened('zeta.wav');
    s = await dec();
    check(!s.canNext && !s.canPrev && !s.nav && await page.$eval('#pb-next', b => b.disabled), 'a picked file: Previous and Next disabled, no next track');
    if ((await page.getAttribute('#dcl-autoplay', 'aria-pressed').catch(() => null)) === 'true') await page.click('#dcl-autoplay').catch(() => {});
  }

  // ---------- permission after a reload, denied, a file gone ----------
  if (want('permission')) {
    await page.evaluate(() => { sessionStorage.setItem('dclPerm', 'prompt'); localStorage.setItem('coding-misk-decode-autoplay', 'false'); });
    await page.reload(); await sleep(2200); await openTab();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    await chip('all'); await sleep(300);
    let rows = await rowsNow();
    check(rows.filter(r => r.folder !== 'Recent').every(r => r.wait) && (await page.$$('#dcl-chips [data-dcl-allow]')).length === 2, 'after a reload: the folders\' last rows at once, waiting, with "Allow access"');
    await clickRow('c');
    let s = await opened('c.wav');
    const asked = await page.evaluate(() => window.__dclAsked);
    if (!(await page.$('#dcl.over'))) await page.click('#dc-another');
    await sleep(500);
    await clickRow('a'); await opened('a.wav');
    const asked2 = await page.evaluate(() => window.__dclAsked);
    check(!!s && asked === 1 && asked2 === 1, 'one click on a waiting row asks once and opens it; another row of the folder opens without asking', `${asked} → ${asked2}`);
    await page.evaluate(() => { sessionStorage.setItem('dclDeny', '1'); });
    await page.reload(); await sleep(2200); await openTab();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    await page.click(`#dcl [data-dcl-allow="${await folderId('Demos')}"]`); await sleep(600);
    const note = await page.innerText('#dcl-msg').catch(() => '');
    check(/not allowed/.test(note) && !(await pst()).folders.find(f => f.name === 'Demos').granted && !(await dec()).track, 'a denied permission: the folder stays waiting with a note, nothing opens', note);
    await page.evaluate(() => { sessionStorage.removeItem('dclDeny'); sessionStorage.removeItem('dclPerm'); });
    await page.reload(); await sleep(2200); await openTab();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    await opfs('rm', 'Demos/zeta.wav');
    const before = (await rowsNow()).length;
    await clickRow('zeta', 'Demos'); await sleep(800);
    const m = await page.innerText('#dcl-msg').catch(() => '');
    await waitFor(async () => (await rowsNow()).length === before - 1, 8000);
    check(/not found/.test(m) && !(await dec()).track && (await rowsNow()).length === before - 1, 'a deleted file: the row says "not found", nothing opens, the folder is read again', m);
    await opfs('write', 'Demos/zeta.wav', b64(Z));
  }

  // ---------- mixtapes and the backup ----------
  if (want('mixtapes')) {
    await page.goto(URL0); await sleep(2000); await openTab();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    await chip('all'); await page.click('#dcl [data-dcl-order="name"]'); await sleep(200);
    await page.click('#dcl-select'); await sleep(200);
    for (const n of ['a', 'b', 'c', 'Night Run']) await clickRow(n);
    await page.click('#dcl-addto'); await sleep(200);
    await page.click('#dcl [data-dcl-addto=""]'); await sleep(600);
    let st = await pst();
    const mix = st.mixtapes[0];
    check(st.view === 'mixtapes' && mix && mix.rows.join() === 'a,b,c,Night Run', 'four rows selected and added to a new mixtape in the list\'s order', mix && mix.rows.join());
    await page.fill('#dcl-mix-name', 'Test tape'); await page.press('#dcl-mix-name', 'Enter'); await sleep(400);
    await page.dragAndDrop('#dcl-mrows li:nth-child(3)', '#dcl-mrows li:nth-child(1)'); await sleep(500);
    await reload();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    st = await pst();
    check(st.mixtapes[0].name === 'Test tape' && st.mixtapes[0].rows.join() === 'c,a,b,Night Run', 'renamed, the third row dragged above the first, kept after a reload', `${st.mixtapes[0].name}: ${st.mixtapes[0].rows.join()}`);
    const idb = await page.evaluate(() => new Promise(res => { const o = indexedDB.open('coding-misk-decode-library'); o.onsuccess = () => { const r = o.result.transaction('mixtapes').objectStore('mixtapes').getAll(); r.onsuccess = () => res(JSON.stringify(r.result)); }; }));
    check(!/RIFF|pcm|"buffer"/.test(idb) && idb.length < 4000, 'the mixtape stores names and references, no audio', `${idb.length} bytes`);
    // not in Playlists
    await page.click('[data-tab="playlist"]'); await sleep(400);
    check(!(await page.innerText('#tab-playlist')).includes('Test tape'), 'the mixtape is not in the Playlists tab');
    await page.click('[data-tab="decode"]'); await sleep(300);
    // a moved file: "not found", skipped; back in place: it works again
    await opfs('mv', 'Demos/Some Band - Night Run.wav', 'Demos/moved/Some Band - Night Run.wav');
    await page.click('#dcl [data-dcl-view="tracks"]'); await chip(await folderId('Demos')); await sleep(200);
    await page.evaluate(id => globalThis.codingMiskDecode.panel.rescan(id), await folderId('Demos')); await sleep(300);
    await page.click('#dcl [data-dcl-view="mixtapes"]'); await sleep(200);
    if (await page.$('#dcl [data-dcl-open]')) { await page.click('#dcl .dcl-mix-name'); await sleep(200); }
    let states = await page.$$eval('#dcl-mrows li', xs => xs.map(x => (x.classList.contains('miss') ? 'miss' : 'ok')));
    check(states.join() === 'ok,ok,ok,miss', 'a moved file: its row shows "not found"', states.join());
    // repeat off: the last playable row ends, the tab stops
    await page.click('#dcl-mrows li:nth-child(3) .dcl-name'); await opened('b.wav');
    await sleep(1000);
    let s = await dec();
    check(s.playing && s.nav && s.nav.kind === 'mixtape' && !s.canNext, 'a row click opens and plays it; the next row is not found and the end has no repeat: Next disabled', `${s.next}`);
    await page.evaluate(() => globalThis.codingMiskDecode.seek(globalThis.codingMiskDecode.duration - 1.5)); await sleep(3500);
    s = await dec();
    check(!s.playing && s.track.name === 'b.wav', 'repeat off: the last row ends and the tab stops');
    if (!(await page.$('#dcl.over'))) { await page.click('#dc-another'); await sleep(300); }
    await page.click('#dcl-repeat'); await sleep(300);
    await page.click('#dcl-mrows li:nth-child(3) .dcl-name'); await sleep(2500); await waitFor(async () => (await dec()).playing, 8000);
    s = await dec();
    check(s.canNext && s.next === 'c', 'repeat on: Next wraps to the first row, skipping the missing one', s.next);
    await page.evaluate(() => globalThis.codingMiskDecode.seek(globalThis.codingMiskDecode.duration - 1.5));
    await waitFor(async () => (await playingName()) === 'c.wav', 12000, 100);
    check((await playingName()) === 'c.wav', 'repeat on: after the last row the first playable row plays', JSON.stringify((await dec()).trail.slice(-5)));
    await page.click('#dc-stop'); await sleep(300);
    await opfs('mv', 'Demos/moved/Some Band - Night Run.wav', 'Demos/Some Band - Night Run.wav');
    await page.evaluate(id => globalThis.codingMiskDecode.panel.rescan(id), await folderId('Demos')); await sleep(300);
    if (!(await page.$('#dcl.over'))) { await page.click('#dc-another'); await sleep(300); }
    states = await page.$$eval('#dcl-mrows li', xs => xs.map(x => (x.classList.contains('miss') ? 'miss' : 'ok')));
    check(states.join() === 'ok,ok,ok,ok', 'the file back in place and the folder read again: its row works', states.join());
    // the backup: 150 more analyses stored, the default export holds the 100 used last, no handle; all with the box
    await page.evaluate(async () => { const v = (await import('/src/decode/model.js')).ANALYSIS_VERSION; const list = Array.from({ length: 150 }, (_, i) => ({ fp: `seed-${i}`, title: `Seed ${i}`, fileName: `seed ${i}.wav`, used: 1000 + i, modelA: { version: v, level: 'A', bars: [] } })); await globalThis.codingMiskDecode.store.importMany(list); });
    await page.click('#open-settings'); await sleep(700);
    const tip = await page.getAttribute('label.set-dc-all', 'title');
    check(!(await page.$eval('#set-decode-all', x => x.checked)) && /20 kB per minute/.test(tip), '"Include all Decode analyses": off, with its tooltip', tip);
    const dl = async () => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click('#set-export')]); const f = path.join(os.tmpdir(), `dcl-backup-${Date.now()}.json`); await d.saveAs(f); const j = JSON.parse(fs.readFileSync(f, 'utf8')); return { f, j }; };
    const one = await dl();
    const dcs = one.j.data['coding-misk-decodes'] || [], mx = one.j.data['coding-misk-decode-mixtapes'];
    const total = await page.evaluate(async () => (await globalThis.codingMiskDecode.store.entries()).length);
    check(dcs.length === 100 && total > 100 && !JSON.stringify(dcs).includes('"handle"'), 'the default backup: the 100 analyses used last, no file handle', `${dcs.length} of ${total}`);
    check(mx && mx.mixtapes.length === 1 && mx.folders.map(f => f.name).sort().join() === 'Demos,Live sets' && !JSON.stringify(mx).includes('handle'), 'the mixtapes in the backup with folder names and paths, no handle');
    await page.check('#set-decode-all');
    const all = await dl();
    check((all.j.data['coding-misk-decodes'] || []).length === total, 'with the box ticked: every stored analysis, the file parses', `${(all.j.data['coding-misk-decodes'] || []).length}`);
    await page.click('[data-tab="decode"]').catch(() => {}); await sleep(200);
    await page.evaluate(() => document.querySelector('#open-settings').click()); await sleep(400);
    check(!(await page.$eval('#set-decode-all', x => x.checked)), 'the box is off again when the settings page opens');
    // another computer: the library cleared, the backup imported, the rows "not found", linked again by adding the folder
    await page.evaluate(() => new Promise(r => { const q = indexedDB.deleteDatabase('coding-misk-decode-library'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
    await page.reload(); await sleep(2500);
    if (!(await page.isVisible('#set-import').catch(() => false))) await page.click('#open-settings');
    await page.waitForSelector('#set-import', { state: 'visible' });
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#set-import')]);
    await fc.setFiles(one.f); await sleep(3500);
    await openTab();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    await page.click('#dcl [data-dcl-view="mixtapes"]'); await sleep(200);
    st = await pst();
    if (await page.$('#dcl .dcl-mix-name')) { await page.click('#dcl .dcl-mix-name'); await sleep(200); }
    states = await page.$$eval('#dcl-mrows li', xs => xs.map(x => (x.classList.contains('miss') ? 'miss' : 'ok')));
    check(st.mixtapes.length === 1 && states.length === 4 && states.every(x => x === 'miss'), 'imported on a cleared library: the mixtape is listed, its rows "not found"', states.join());
    await page.click('#dcl [data-dcl-view="tracks"]');
    await addFolder('Demos'); await addFolder('Live sets');
    await page.click('#dcl [data-dcl-view="mixtapes"]'); await sleep(200);
    if (await page.$('#dcl .dcl-mix-name')) { await page.click('#dcl .dcl-mix-name'); await sleep(200); }
    states = await page.$$eval('#dcl-mrows li', xs => xs.map(x => (x.classList.contains('miss') ? 'miss' : 'ok')));
    check(states.join() === 'ok,ok,ok,ok', 'adding folders with the same names links the rows again', states.join());
    await shot('lib-mixtape');
  }

  // ---------- long lists, 2000 stored analyses, the index rebuilt ----------
  if (want('long')) {
    await page.evaluate(() => { localStorage.setItem('coding-misk-decode-autoplay', 'false'); });
    await opfs('stubs', 'Big A', 2005); await opfs('stubs', 'Big B', 2000);
    await reload();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    await page.click('#dcl [data-dcl-view="tracks"]').catch(() => {});
    let t0 = await now();
    await addFolder('Big A'); await addFolder('Big B');
    let lt = await longSince(t0);
    const st = await pst(), big = st.folders.find(f => f.name === 'Big A');
    const capChip = await page.innerText(`#dcl [data-dcl-chip="${big.id}"]`);
    check(big.capped && big.count === 2000 && /2000\+/.test(capChip), 'a folder of 2005 files: 2000 listed, the chip says there are more', capChip);
    check(st.rows >= 4000, 'two full folders: 4000 rows and more', `${st.rows}`);
    check(lt.every(x => x.ms <= 100), 'no task over 100 ms while scanning two folders of 2000 files', lt.map(x => Math.round(x.ms)).join(','));
    await chip('all'); await sleep(300);
    t0 = await now();
    const lat = await page.evaluate(async () => {
      const out = [], inp = document.querySelector('#dcl-search');
      for (const q of ['s', 'st', 'stub 1', 'stub 19', '']) {
        const t = performance.now();
        inp.value = q; inp.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => { const f = () => (document.querySelector('#dcl-list').dataset.q === q || performance.now() - t > 1000 ? r() : requestAnimationFrame(f)); f(); });
        out.push(Math.round(performance.now() - t));
      }
      const box = document.querySelector('#dcl-list');
      for (let i = 0; i < 30; i++) { box.scrollTop += 900; await new Promise(r => requestAnimationFrame(r)); }
      return { out, nodes: box.querySelectorAll('.dcl-row').length };
    });
    lt = await longSince(t0);
    measures.searchMs = lat.out;
    check(lat.out.every(x => x <= 150), 'a typed search updates the list within 150 ms (60 ms of them the typing pause)', lat.out.join(','));
    check(lt.every(x => x.ms <= 100) && lat.nodes < 80, 'searching and scrolling 4000 rows: no task over 100 ms, a few dozen row nodes', `${lt.map(x => Math.round(x.ms)).join(',')} · ${lat.nodes} nodes`);
    // 2000 stored analyses: the tab and the panel read none
    await page.evaluate(async () => { const v = (await import('/src/decode/model.js')).ANALYSIS_VERSION; const list = Array.from({ length: 2000 }, (_, i) => ({ fp: `many-${i}`, title: `Many ${i}`, fileName: `many ${i}.wav`, used: 5000 + i, modelA: { version: v, level: 'A', bars: Array.from({ length: 40 }, () => ({ chord: 'Am', drums: { bd: 'x...x...x...x...' } })) } })); for (let i = 0; i < list.length; i += 200) await globalThis.codingMiskDecode.store.importMany(list.slice(i, i + 200)); });
    const n = await page.evaluate(async () => (await globalThis.codingMiskDecode.store.entries()).length);
    await page.reload(); await sleep(2000);
    t0 = await now();
    await page.click('[data-mode="ascolta"]').catch(() => {});
    const shown = await page.evaluate(async () => { const t = performance.now(); document.querySelector('[data-tab="decode"]').click(); await new Promise(r => { const f = () => (document.querySelector('#dcl .dcl-row') || performance.now() - t > 3000 ? r() : requestAnimationFrame(f)); f(); }); return Math.round(performance.now() - t); });
    await sleep(1500);
    lt = await longSince(t0);
    const s = await dec();
    measures.listShownMs = shown; measures.stored = n;
    check(n === 2000 && s.reads === 0, '2000 stored analyses: opening the tab and its list reads none', `${n} stored, ${s.reads} read`);
    check(shown <= 300 && lt.every(x => x.ms <= 100), 'the list shows within 300 ms, no task over 100 ms', `${shown} ms · ${lt.map(x => Math.round(x.ms)).join(',')}`);
    const mem = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
    measures.heapMB = mem;
    // the index lost: rebuilt in the background
    await page.evaluate(() => new Promise(res => { const o = indexedDB.open('coding-misk-decodes'); o.onsuccess = () => { const tx = o.result.transaction('index', 'readwrite'); tx.objectStore('index').clear(); tx.oncomplete = () => { o.result.close(); res(); }; }; }));
    await page.reload(); await sleep(500);
    t0 = await now();
    await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="decode"]');
    const rebuilt = await waitFor(async () => (await page.evaluate(async () => (await globalThis.codingMiskDecode.store.entries()).length)) === 2000, 20000, 300);
    lt = await longSince(t0);
    check(!!rebuilt && lt.every(x => x.ms <= 100), 'the index cleared: rebuilt from the records in the background, no task over 100 ms', lt.map(x => Math.round(x.ms)).join(','));
  }

  // ---------- tags (task 2.4) ----------
  if (want('tags')) {
    await opfs('write', 'TagSrc/tagged.mp3', b64(TAGGED));
    await opfs('copy', 'TagSrc/tagged.mp3', 'Tagged/200');
    await reload();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    await page.click('#dcl [data-dcl-view="tracks"]').catch(() => {});
    await addFolder('Tagged');
    await chip(await folderId('Tagged'));
    const t0 = await now();
    const done = await waitFor(async () => { const s = await pst(); return (await rowsNow()).length && (await rowsNow()).every(r => r.name === 'Tagged Title') && s.tags.files >= 200 ? s : null; }, 120000, 1000);
    const lt = await longSince(t0);
    const tg = done ? done.tags : (await pst()).tags;
    measures.tags = { files: tg.files, medianMs: Math.round(tg.median * 10) / 10, longestMs: Math.round(tg.longest), longTasks: lt.map(x => Math.round(x.ms)) };
    const named = (await rowsNow()).filter(r => r.name === 'Tagged Title').length;
    check(tg.files >= 200 && named > 0, 'tags read in idle time for the active chip, names from the tags', `${tg.files} files, median ${tg.median.toFixed(1)} ms, longest ${Math.round(tg.longest)} ms`);
    check(tg.median <= 15 && lt.every(x => x.ms <= 50), 'tags within the budget of D4: median at most 15 ms per file, no task over 50 ms', `${tg.median.toFixed(1)} ms · ${lt.map(x => Math.round(x.ms)).join(',')}`);
  }

  // ---------- browsers without folders or storage, pictures ----------
  if (want('browsers')) {
    await page.evaluate(() => sessionStorage.setItem('dclNoFolders', '1'));
    await page.reload(); await sleep(2200); await openTab();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    check(!(await page.$('#dcl-add')) && !!(await page.$('#dcl-nofolders')) && !(await page.$('#dcl-autoplay')) && !(await page.$('[data-dcl-view="mixtapes"]')) && !!(await page.$('#dcl-choose')), 'no folder picker: "Choose a file…", the recent tracks and the note; no folders, Autoplay or mixtapes');
    await page.evaluate(() => { sessionStorage.removeItem('dclNoFolders'); sessionStorage.setItem('dclNoIDB', '1'); });
    await page.reload(); await sleep(2200); await openTab();
    const note = await page.innerText('#dcl-nostorage').catch(() => '');
    await page.setInputFiles('#dc-file', A);
    const s = await opened('a.wav');
    check(/keeps no recent tracks/.test(note) && !!s, 'no IndexedDB: the panel says so, "Choose a file…" still opens a track', note);
    await page.evaluate(() => sessionStorage.removeItem('dclNoIDB'));
    await page.reload(); await sleep(2200); await openTab();
    if (!(await page.$('#dcl'))) { await page.click('#dc-another'); await sleep(300); }
    for (const [ui, lang] of [['neon', 'en'], ['hw', 'it'], ['light', 'en']]) {
      await page.click(`[data-uitheme="${ui}"]`).catch(() => {});
      await page.click(`[data-lang="${lang}"]`).catch(() => {}); await sleep(400);
      await shot(`lib-${ui}-${lang}-1300`);
    }
    await page.click('[data-lang="it"]').catch(() => {}); await sleep(300);
    check(/Aggiungi cartella/.test(await page.innerText('#dcl')), 'the panel in Italian');
    await page.setViewportSize({ width: 400, height: 860 }); await sleep(500);
    if ((await dec()).track && !(await page.$('#dcl.over'))) { await page.click('#dc-another'); await sleep(300); }
    const wide = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: innerWidth, out: [...document.querySelectorAll('#dcl button, #dcl .dcl-row, #dcl .dcl-chip')].filter(x => { const r = x.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1) && !x.closest('.dcl-chips'); }).length }));
    check(wide.page <= wide.view && wide.out === 0, '400 px: rows and buttons inside the screen, no sideways scroll (the chips scroll inside their row)', JSON.stringify(wide));
    await shot('lib-light-it-400');
    await page.click('[data-lang="en"]').catch(() => {});
    await page.setViewportSize({ width: 1300, height: 950 });
  }

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  console.log(`info  measures ${JSON.stringify(measures)}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(measures, null, 2));
  console.log(`${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
