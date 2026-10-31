// Browser checks for the Decode tab (track-to-code, level A): tab order and names in both languages and the tab kept
// after a reload; the app's own test songs exported to WAV (tools/decode-export.cjs) and files made from them with
// ffmpeg (MP3 with tags, MP4 video with sound, a video without sound, a 12-minute file, an unreadable file); Play,
// the code typing in the code column with its source line, the drums muted on bar 33 with each look ahead; the sync of
// the original and the code (kick against kick, under 10 ms); mute, solo and the slider (gains, levels, the code text
// unchanged); Options, title, artist and Attribution in the code; ½× and tap tempo with four key presses; reload and
// reopen with a matching file (no analysis, no audio in storage); remove from the list; 400 px without sideways
// scroll; pictures in neon, hardware and light. --long: two minutes with the code muted (long tasks, lit notes).
// Needs ffmpeg. Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-decode.cjs [shots-dir] [--long]   (dev server)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const { exportTestSongs, DIR } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shots = process.argv.slice(2).find(a => !a.startsWith('--')), LONG = process.argv.includes('--long');
const PORT = process.env.PORT || 5173, URL0 = `http://localhost:${PORT}/`;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const FILES = path.join(DIR, '..', 'files');
const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL0); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('coding-misk-decodes'); });
  // the test songs as WAV, and the other files made from the first one
  const wavs = await exportTestSongs(page, { log: m => console.log(`info  ${m}`) });
  fs.mkdirSync(FILES, { recursive: true });
  const W = wavs['decode-test-124'], F = name => path.join(FILES, name);
  if (!fs.existsSync(F('night-run.mp3'))) ff(['-i', W, '-t', '40', '-metadata', 'title=Night Run', '-metadata', 'artist=Some Band', '-b:a', '192k', F('night-run.mp3')]);
  if (!fs.existsSync(F('clip.mp4'))) ff(['-f', 'lavfi', '-i', 'color=c=black:s=320x240:r=10', '-i', W, '-t', '30', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', F('clip.mp4')]);
  if (!fs.existsSync(F('silent.mp4'))) ff(['-f', 'lavfi', '-i', 'color=c=black:s=320x240:r=10', '-t', '5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', F('silent.mp4')]);
  if (!fs.existsSync(F('long.wav'))) ff(['-f', 'lavfi', '-i', 'anullsrc=r=8000:cl=mono', '-t', '720', '-c:a', 'pcm_s16le', F('long.wav')]);
  if (!fs.existsSync(F('broken.wav'))) fs.writeFileSync(F('broken.wav'), Buffer.from('RIFF0000WAVEnot really audio at all'.repeat(200)));
  fs.copyFileSync(W, F('Some Band - Night Run.wav'));
  fs.copyFileSync(W, F('renamed copy.wav'));
  if (LONG && !fs.existsSync(F('twice.wav'))) ff(['-i', W, '-i', W, '-filter_complex', 'concat=n=2:v=0:a=1', F('twice.wav')]);

  // the state, with the peak levels taken as the loudest of six readings over 0.6 s (one reading can fall in a gap)
  const st = async () => { const s = await page.evaluate(() => globalThis.codingMiskDecode.state()); if (!s.levels) return s; for (let i = 0; i < 5; i++) { await sleep(100); const l = await page.evaluate(() => globalThis.codingMiskDecode.state().levels); s.levels = { orig: Math.max(s.levels.orig, l.orig), code: Math.max(s.levels.code, l.code) }; } return s; };
  const stNow = () => page.evaluate(() => globalThis.codingMiskDecode.state());
  const evaluated = () => page.evaluate(() => (globalThis.codingMiskEvaluated ? globalThis.codingMiskEvaluated() : ''));
  const shown = () => page.evaluate(() => { const c = document.querySelector('#edhost .cm-content'); return c ? c.innerText : ''; });
  const open = async file => { await page.setInputFiles("#dc-file", file); for (let i = 0; i < 60; i++) { await sleep(250); const s = await stNow(); if ((s.title && !(s.status && s.status.kind === 'busy')) || (s.status && s.status.kind === 'error')) return s; } return st(); };
  const tabOrder = () => page.$$eval('.tabs .tab', xs => xs.filter(x => !x.hidden).map(x => x.textContent.trim()).join(','));

  // ---------- 1.1 the tab ----------
  await page.reload(); await sleep(3000);
  await page.click('[data-lang="en"]'); await sleep(300);
  await page.click('[data-mode="ascolta"]'); await sleep(300);
  check((await tabOrder()) === 'Compose,Songs,Decode,Playlists,Radio', 'tab order in English', await tabOrder());
  await page.click('[data-tab="decode"]'); await sleep(400);
  check((await page.innerText('#tab-decode .dc-h')) === 'Track to code', 'page heading "Track to code"');
  check(/decode/.test(await page.innerText('.mode-btn[data-mode="ascolta"] small')), 'the mode subtitle lists the tab');
  await page.click('[data-lang="it"]'); await sleep(400);
  check((await page.innerText('[data-tab="decode"]')).toLowerCase() === 'decodifica' && (await page.innerText('#tab-decode .dc-h')) === 'Da brano a codice', 'Italian: "Decodifica", "Da brano a codice"');
  await page.click('[data-lang="en"]'); await sleep(300);
  await page.reload(); await sleep(3000);
  check(await page.isVisible('#tab-decode'), 'the tab is remembered after a reload');
  check(!!(await page.$('#tab-decode .g-help')), 'the tab has a "?" to its Guide card');

  // ---------- 1.2 files ----------
  let s = await open(F('long.wav'));
  check(s.status && s.status.kind === 'error' && /10 minutes/.test(s.status.text) && !s.title, 'a 12-minute file is refused before decoding, naming the limit', s.status && s.status.text);
  s = await open(F('broken.wav'));
  check(s.status && s.status.kind === 'error' && /cannot be read/.test(s.status.text), 'an unreadable file: the format cannot be read', s.status && s.status.text);
  s = await open(F('silent.mp4'));
  check(s.status && s.status.kind === 'error' && /no sound/.test(s.status.text), 'a video without sound says so', s.status && s.status.text);
  s = await open(F('clip.mp4'));
  check(s.title === 'clip' && s.status && /only its sound/.test(s.status.text) && s.duration > 25, 'an MP4 video: its sound is decoded, a note says the picture is not used', s.status && s.status.text);
  s = await open(F('night-run.mp3'));
  check(s.title === 'Night Run' && s.artist === 'Some Band' && Math.abs(s.duration - 40) < 0.2, 'an MP3 with tags: title and artist from the tags', `${s.title} / ${s.artist}`);
  s = await open(F('broken.wav'));
  check(s.title === 'Night Run', 'a failed open keeps the previous track');
  s = await open(F('Some Band - Night Run.wav'));
  for (let i = 0; i < 20 && !s.bpm; i++) { await sleep(250); s = await st(); }
  check(s.title === 'Night Run' && s.artist === 'Some Band' && s.bpm === 124, 'a WAV named "Artist - Title": title and artist from the name, the tempo locked at open', `${s.title} / ${s.artist} · ${s.bpm} BPM`);

  // ---------- 4.1 other players: opening Decode does not stop them, its Play does ----------
  await page.click('[data-tab="componi"]'); await sleep(300);
  await page.click('#play'); await sleep(2500);
  const other = () => page.evaluate(() => { const b = globalThis.codingMiskBars(); return b.song ? b.song.id : null; });
  const compId = await other();
  await page.click('[data-tab="decode"]'); await sleep(800);
  check(compId && !/^decode:/.test(compId) && (await other()) === compId && !(await stNow()).playing, 'opening Decode leaves the song in Compose playing', compId);

  // ---------- 5.1, 5.4 Play: the code types in the code column ----------
  await page.click('#dc-play');
  await sleep(1500);
  s = await st();
  check(s.playing && s.startedCode && s.sync, 'Play: the original and the code start together', JSON.stringify(s.sync));
  check(/^decode:/.test(await other()), 'Play in Decode stops the other player');
  const src = await page.innerText('#src');
  check(/Night Run/.test(src) && /Live/.test(src), 'the code column\'s source line names the track and "Live"', src);
  await sleep(4000);
  let code = await shown();
  check(code.startsWith('// coding-misk · cover of "Night Run" by Some Band') && /\/\/ vox: …/.test(code) && /\$: s\("bd/.test(code), 'the code column shows the cover line, the drums and the vocals placeholder', code.split('\n').length + ' lines');
  const pb = await page.innerText('#pb-title'), pbPos = await page.innerText('#pb-pos'), pbBar = await page.innerText('#pb-bar');
  check(/Night Run/.test(pb) && /\/ 1:5/.test(pbPos) && /bar \d+ \/ \d+/.test(pbBar) && await page.$eval('#pb-prev', b => b.disabled) && await page.$eval('#pb-next', b => b.disabled), 'the player bar: title, time, bar counter; previous and next disabled', `${pb} · ${pbPos} · ${pbBar}`);
  const lit = await page.evaluate(() => document.querySelectorAll('#edhost .cm-content [style*="outline"]').length);
  s = await st();
  check(s.levels.orig > 0.05 && s.levels.code < 0.001 && lit > 0, 'default: the original heard, the code muted by the slider, its notes still lit', `orig ${s.levels.orig.toFixed(2)}, code ${s.levels.code.toFixed(3)}, lit ${lit}`);

  // ---------- 4.1 sync: the original's kick and the code's kick ----------
  await page.evaluate(() => { const el = document.querySelector('#dc-slider'); el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await sleep(1200);
  const offsets = [];
  for (let k = 0; k < 6; k++) {
    const p = await page.evaluate(() => globalThis.codingMiskDecode.probe());
    if (p) {
      // kick onsets: the low band's envelope crossing half its peak, rising
      const onsets = x => { const out = [], a = 1 - Math.exp(-2 * Math.PI * 150 / p.rate); let y = 0, e = 0; const env = x.map(v => { y += a * (v - y); e = Math.max(Math.abs(y), e * 0.9995); return e; }); const top = Math.max(...env); for (let i = 1; i < env.length; i++) if (env[i] >= 0.5 * top && env[i - 1] < 0.5 * top) { out.push(i / p.rate); i += Math.round(0.15 * p.rate); } return out; };
      const o = onsets(p.orig), c = onsets(p.code);
      for (const t of c) { const n = o.reduce((b, x) => (Math.abs(x - t) < Math.abs(b - t) ? x : b), Infinity); if (Math.abs(n - t) < 0.06) offsets.push((t - n) * 1000); }
    }
    await sleep(700);
  }
  offsets.sort((a, b) => a - b);
  const med = offsets.length ? offsets[Math.floor(offsets.length / 2)] : NaN;
  check(offsets.length >= 4 && Math.abs(med) < 10, 'sync: the code\'s kick within 10 ms of the original\'s', `median ${med.toFixed(1)} ms over ${offsets.length} kicks`);

  // ---------- 4.2 mute, solo, slider ----------
  s = await st();
  check(Math.abs(s.gains.orig - 0.707) < 0.01 && Math.abs(s.gains.code - 0.707) < 0.01 && s.levels.code > 0.01 && s.levels.orig > 0.01, 'slider in the middle: both heard at equal power', `orig ${s.levels.orig.toFixed(2)}, code ${s.levels.code.toFixed(2)}`);
  const before = await evaluated();
  await page.click('[data-dc-mute="code"]'); await sleep(900);
  s = await st();
  check(s.settings.mix.slider === 0 && s.gains.code === 0 && s.levels.code < 0.001, 'mute every code track: the slider goes to Original, the code is silent', `slider ${s.settings.mix.slider}`);
  await page.click('[data-dc-solo="code"]'); await sleep(900);
  s = await st();
  check(s.settings.mix.slider === 1 && s.gains.orig === 0 && s.levels.code > 0.01, 'solo the code: only the code is heard, the slider on Code');
  await page.click('[data-dc-solo="code"]'); await sleep(300);
  await page.click('[data-dc-solo="orig"]'); await sleep(900);
  s = await st();
  check(s.settings.mix.slider === 0 && s.gains.code === 0 && s.levels.orig > 0.01, 'solo the original: the slider on Original');
  await page.click('[data-dc-solo="orig"]'); await sleep(300);
  const after = await evaluated();
  check(before.split('\n')[0] === after.split('\n')[0] && !/_\$: s\("bd\*4/.test(after.slice(0, 400)) === !/_\$: s\("bd\*4/.test(before.slice(0, 400)), 'mute and solo never change the code text');
  await page.click('[data-dc-mute="code"]'); await sleep(500);
  s = await st();
  check(s.settings.mix.slider === 0.5, 'unmute the code with the slider on Original: the slider moves to the middle');

  // ---------- 5.4 Options, title, artist, Attribution ----------
  await page.click('#dc-options summary'); await sleep(200);
  await page.selectOption('#dc-comments', 'all'); await sleep(200);
  await page.fill('#dc-artist', 'Another Band'); await sleep(100);
  for (let i = 0; i < 40; i++) { await sleep(250); code = await shown(); if (/by Another Band/.test(code) && /\/\/ =+ Drums/.test(code)) break; }
  check(/by Another Band/.test(code.split('\n')[0]) && /\/\/ =+ Drums/.test(code), 'an artist edit and the comments option change the code from the next edit', code.split('\n')[0]);
  await page.click('#dc-attr');
  for (let i = 0; i < 40; i++) { await sleep(250); code = await shown(); if (code.startsWith('// coding-misk · Night Run')) break; }
  check(code.startsWith('// coding-misk · Night Run\n'), 'Attribution off: the title only', code.split('\n')[0]);
  s = await st();
  check(Math.abs(s.gains.orig - 0.707) < 0.01, 'options change the code, not the sound');
  const g0 = JSON.stringify((await stNow()).gains);
  await page.selectOption('#dc-fns', 'full');
  for (let i = 0; i < 40; i++) { await sleep(250); code = await shown(); if (/\.orbit\(\d+\)/.test(code)) break; }
  check(/\.orbit\(\d+\)/.test(code) && JSON.stringify((await stNow()).gains) === g0, 'technical functions "full": the code shows its buses, the sound stays');
  await page.selectOption('#dc-view', 'sections');
  for (let i = 0; i < 40; i++) { await sleep(250); code = await shown(); if (/const SECTIONS/.test(code)) break; }
  check(/const SECTIONS/.test(code) && JSON.stringify((await stNow()).gains) === g0, 'code view "sections": the song as written with its section lanes, the sound stays');
  await page.selectOption('#dc-view', 'now'); await page.selectOption('#dc-fns', 'compact');
  await page.click('#code-over-btn'); await sleep(800);
  const ov0 = await page.evaluate(() => globalThis.codingMiskOverTimes.length); await sleep(700);
  const over = await page.evaluate(() => ({ hidden: document.querySelector('#stage-over').hidden, n: globalThis.codingMiskOverTimes.length }));
  check(!over.hidden && over.n > ov0, 'Code over on: the decoded code is drawn over the stage', JSON.stringify(over));
  await page.click('#code-over-btn'); await sleep(400);
  check(await page.$eval('#stage-over', c => c.hidden), 'Code over off: the stage shows no code');
  await page.click('#dc-attr'); await page.selectOption('#dc-comments', 'none');
  await page.fill('#dc-artist', 'Some Band');

  // ---------- 5.2 look ahead: the drums stop at bar 33 ----------
  const lands = {};
  for (const look of ['2bars', 'off', '4bars', '2s', '4s']) {
    await page.selectOption('#dc-look', look); await sleep(100);
    const m = await page.evaluate(() => globalThis.codingMiskDecode.model);
    // seek to bar 29 (index 28) and wait for the evaluated code to mute the drums
    await page.evaluate(f => globalThis.codingMiskDecode.seek(f), m.downbeat + 28 * m.barSeconds);
    let at = null;
    for (let i = 0; i < 160 && at === null; i++) {
      await sleep(100);
      const [ev, cur] = await Promise.all([evaluated(), stNow()]);
      if (/^_\$: s\("bd/m.test(ev) && cur.bar > 28) at = cur.bar;
    }
    lands[look] = at === null ? null : Math.round(at) + 1;
  }
  check(lands['2bars'] === 33, 'look ahead 2 bars: the drums mute on bar 33', `bar ${lands['2bars']}`);
  check([34, 35].includes(lands.off), 'look ahead off: the drums mute on bar 34 or 35', `bar ${lands.off}`);
  check(lands['4bars'] === 33 && lands['4s'] === 33 && [33, 34].includes(lands['2s']), 'look ahead 4 bars and 4 s on bar 33, 2 s by bar 34', JSON.stringify(lands));
  await page.selectOption('#dc-look', '2bars');

  // ---------- 5.3 tempo: ½×, 2×, tap with the space bar ----------
  await page.click('[data-dc-tempo="0.5"]'); await sleep(2500);
  s = await st();
  check(s.bpm === 62 && s.tempo && s.tempo.bpm === 62, '½×: the code is written at 62 BPM', `${s.bpm}`);
  await page.click('[data-dc-tempo="2"]'); await sleep(2500);
  s = await st();
  check(s.bpm === 124, '2×: back to 124 BPM', `${s.bpm}`);
  await page.click('#tab-decode .dc-h'); // no focused field
  const f0 = (await st()).file, beat = 60 / 124;
  for (let k = 0; k < 5; k++) { await page.keyboard.press('Space'); await sleep(beat * 1000 * 1.0); }
  await sleep(2500);
  s = await st();
  check(s.tempo && s.tempo.tapped && Math.abs(s.tempo.bpm - 124) < 8 && s.playing, 'tap tempo: five presses of the space bar set a tapped tempo and keep playing', JSON.stringify(s.tempo));
  void f0;

  // ---------- 1.3, 1.4 store, reload, reopen ----------
  await page.selectOption('#dc-comments', 'essential'); await sleep(200);
  await page.click('#dc-stop'); await sleep(500);
  const idb = await page.evaluate(() => new Promise(res => { const o = indexedDB.open('coding-misk-decodes'); o.onsuccess = () => { const r = o.result.transaction('decodes').objectStore('decodes').getAll(); r.onsuccess = () => { const list = r.result; res({ n: list.length, size: JSON.stringify(list).length, typed: list.some(x => Object.values(x).some(v => v instanceof Float32Array || v instanceof ArrayBuffer || v instanceof Blob)) }); }; }; o.onerror = () => res(null); }));
  check(idb && idb.n >= 1 && !idb.typed && idb.size < 400000, 'storage holds the analysis and settings, no audio', JSON.stringify(idb));
  await page.reload(); await sleep(3000);
  const rec = await page.$$eval('#tab-decode .dc-rrow', rows => rows.map(r => r.innerText.replace(/\s+/g, ' ')));
  check(rec.some(r => /Night Run/.test(r) && /1:5\d/.test(r)), 'after a reload the recent list shows the track with its length', rec.join(' | '));
  s = await open(F('renamed copy.wav'));
  check(s.title === 'Night Run' && s.status && /Stored analysis/.test(s.status.text) && s.tempo && s.tempo.tapped, 'a renamed matching file opens with the stored analysis, title and tapped tempo', JSON.stringify({ status: s.status, tempo: s.tempo, title: s.title }));
  check(s.settings.options.comments === 'essential', 'the Options are stored with the track', s.settings.options.comments);
  await page.reload(); await sleep(3000);
  // a recent track without a file handle: the tab names the file and asks for it again
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), page.click('#tab-decode [data-dc-reopen]')]);
  await sleep(300);
  const asked = await stNow();
  check(asked.status && /Pick the file "renamed copy.wav"/.test(asked.status.text), 'pick again: the tab names the expected file and asks for it', asked.status && asked.status.text);
  { if (chooser) await chooser.setFiles(F('Some Band - Night Run.wav')); else await page.setInputFiles('#dc-file', F('Some Band - Night Run.wav')); for (let i = 0; i < 40; i++) { await sleep(250); const x = await stNow(); if (x.title) break; } }
  s = await stNow();
  check(s.title === 'Night Run' && s.status && /Stored analysis/.test(s.status.text), 'the picked file opens with its stored analysis', s.status && s.status.text);
  await page.reload(); await sleep(3000);
  const n0 = await page.$$eval('#tab-decode .dc-rrow', r => r.length);
  await page.click('#tab-decode [data-dc-remove]'); await sleep(800);
  const n1 = await page.$$eval('#tab-decode .dc-rrow', r => r.length);
  check(n1 === n0 - 1, 'remove from the list', `${n0} → ${n1}`);

  // ---------- pictures and 400 px ----------
  s = await open(F('Some Band - Night Run.wav'));
  await page.click('#dc-play'); await sleep(7000);
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const pic = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false }); };
  await page.evaluate(() => window.scrollTo(0, 0));
  await pic('fase1-neon');
  await page.click('[data-uitheme="hw"]').catch(() => {}); await sleep(1500); await pic('fase1-hardware');
  await page.click('[data-uitheme="light"]').catch(() => {}); await sleep(1500); await pic('fase1-light');
  await page.click('[data-uitheme="neon"]').catch(() => {}); await sleep(500);
  await page.setViewportSize({ width: 400, height: 900 }); await sleep(1200);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 402, '400 px: the page does not scroll sideways', `${sw}px`);
  await page.evaluate(() => document.querySelector('#tab-decode').scrollIntoView());
  await pic('fase1-400px');
  await page.setViewportSize({ width: 1400, height: 1000 }); await sleep(500);

  // ---------- 4.1 a song started elsewhere stops the decoded track ----------
  await page.click('[data-tab="brani"]'); await sleep(800);
  await page.click('#songs [data-act="play"] >> visible=true'); await sleep(2500);
  s = await stNow();
  check(!s.playing && !/^decode:/.test(await other() || ''), 'starting a song in Songs stops the decoded track');
  await page.click('#stop'); await sleep(300);
  await page.click('[data-tab="decode"]'); await sleep(500);

  // ---------- 4.4 two minutes with the code muted ----------
  if (LONG) {
    await page.evaluate(() => { const el = document.querySelector('#dc-slider'); el.value = 0; el.dispatchEvent(new Event('input', { bubbles: true })); globalThis.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) globalThis.__lt.push(e.duration); }).observe({ type: 'longtask', buffered: false }); globalThis.__drift = []; const ctx = globalThis.getAudioContext(); let t0 = performance.now(), a0 = ctx.currentTime; globalThis.__iv = setInterval(() => { const dt = (performance.now() - t0) / 1000, da = ctx.currentTime - a0; globalThis.__drift.push(dt - da); }, 1000); });
    await open(F('twice.wav')); await page.click('#dc-play'); await sleep(1500);
    await sleep(118000);
    let litMax = 0; for (let i = 0; i < 20; i++) { litMax = Math.max(litMax, await page.evaluate(() => document.querySelectorAll("#edhost .cm-content [style*=\"outline\"]").length)); await sleep(100); }
    const r = await page.evaluate(() => ({ long: globalThis.__lt.filter(d => d > 50).length, max: Math.max(0, ...globalThis.__lt), drift: globalThis.__drift.length ? globalThis.__drift[globalThis.__drift.length - 1] : 0, lines: (document.querySelector('#edhost .cm-content').innerText.match(/^\s*_?\$:/gm) || []).length }));
    r.lit = litMax;
    check(r.max < 200 && Math.abs(r.drift) < 0.25 && r.lit > 0, 'two minutes with the code muted: no long task over 200 ms, the audio clock keeps time (no underrun drift), notes lit', JSON.stringify(r));
  }
  await page.click('#dc-stop').catch(() => {});
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
