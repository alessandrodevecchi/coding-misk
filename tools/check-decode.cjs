// Browser checks for the Decode tab (track-to-code, level A): tab order and names in both languages and the tab kept
// after a reload; the app's own test songs exported to WAV (tools/decode-export.cjs) and files made from them with
// ffmpeg (MP3 with tags, MP4 video with sound, a video without sound, a 12-minute file, an unreadable file); Play,
// the code typing in the code column with its source line, the drums muted on bar 33 with each look ahead; the sync of
// the original and the code (kick against kick, under 10 ms); mute, solo and the slider (gains, levels, the code text
// unchanged); Options, title, artist and Attribution in the code; ½× and tap tempo with five presses of T; reload and
// reopen with a matching file (no analysis, no audio in storage); remove from the list; 400 px without sideways
// scroll; pictures in neon, hardware and light. --long: two minutes with the code muted (long tasks, lit notes).
// Level B (groups 6 and 7): no Essentia.js request before Full; Full on a 4-minute file while it plays (the growing
// mark, progress and Cancel, faster than the file, no long task over 200 ms, the level B code taking over, the engines,
// the grid, the sections and their strip); Drums, Bass and Chords with mute and solo (levels, the code text unchanged,
// lit notes); a section change typed before its bar; Live and Full while playing; Cancel (nothing stored); Essentia.js
// blocked (misk-analyzer alone); reopen in Full; Open in Compose (the same code at every step, "Follow the song",
// validate, Classic and Crescendo); a built-in song with "Follow the song"; pictures fase2-*. --full runs only these.
// decode-refine part 1 (--refine runs only these): the Full proposal after 8 bars, T with a mute button focused, the
// Tap button's count and tooltip, Auto, Space only plays and pauses, Full before Play, the melody lines muted outside a
// generated hook and playing in it, never evaluated, kept by Copy with their helpers.
// Needs ffmpeg. Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-decode.cjs [shots-dir] [--long] [--full] [--refine]   (dev server)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const { exportTestSongs, DIR } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shots = process.argv.slice(2).find(a => !a.startsWith('--')), LONG = process.argv.includes('--long'), ONLY_B = process.argv.includes('--full'), ONLY_E = process.argv.includes('--export');
const PORT = process.env.PORT || 5173, URL0 = `http://localhost:${PORT}/`;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const FILES = path.join(DIR, '..', 'files');
const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], essentiaReqs = [];
  page.on('pageerror', e => errors.push(e.message));
  // Essentia.js (level B) must not be downloaded before Full is picked
  page.on('request', r => { if (/essentia/i.test(r.url())) essentiaReqs.push(r.url().replace(/^.*\//, '')); });
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
  // the editor's whole text (the DOM holds only the lines in view)
  const edCode = () => page.evaluate(() => globalThis.codingMiskPhrases.code());
  const evaluated = () => page.evaluate(() => (globalThis.codingMiskEvaluated ? globalThis.codingMiskEvaluated() : ''));
  const shown = () => page.evaluate(() => { const c = document.querySelector('#edhost .cm-content'); return c ? c.innerText : ''; });
  const open = async file => { await page.setInputFiles("#dc-file", file); for (let i = 0; i < 60; i++) { await sleep(250); const s = await stNow(); if ((s.title && !(s.status && s.status.kind === 'busy')) || (s.status && s.status.kind === 'error')) return s; } return st(); };
  const tabOrder = () => page.$$eval('.tabs .tab', xs => xs.filter(x => !x.hidden).map(x => x.textContent.trim()).join(','));

  // ---------- decode-refine part 1: T and Tap, Auto, Space, the Full proposal, Full before Play, the top line group ----------
  async function refine() {
    await page.click('[data-tab="decode"]'); await sleep(300);
    const { renderSong, writeWav } = await import('./decode-audio.mjs');
    const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' }, mel = [76, null, 74, null, 72, null, null, 79, null, 77, null, 76, 74, null, 72, null];
    if (!fs.existsSync(F('hook.wav'))) writeWav(F('hook.wav'), renderSong({ bpm: 124, lead: 0.3, bass: 'x..x..x...x.x...', sections: [{ name: 'Verse', bars: 8, chords: ['Am', 'F', 'C', 'G'], drums: D }, { name: 'Hook', bars: 8, chords: null, drums: D, melody: mel }, { name: 'Out', bars: 8, chords: ['Am', 'F', 'C', 'G'], drums: D }] }).pcm);
    if (!fs.existsSync(F('refine.wav'))) ff(['-i', W, '-ss', '3', '-t', '40', F('refine.wav')]);
    const beat = 60 / 124, bars = async () => (await stNow()).bar;
    // Live: the tab proposes Full after 8 bars, once
    let s = await open(F('refine.wav'));
    check(s.level === 'A', 'a new track opens in Live', s.level);
    await page.click('#dc-play');
    for (let i = 0; i < 100 && !((await bars()) >= 9); i++) await sleep(250);
    await sleep(600);
    const note = await page.innerText('#tab-decode .dc-status').catch(() => '');
    check(/Full writes sections/.test(note), 'after 8 bars in Live the tab proposes Full', note);
    // T with a mute button focused: the tempo is tapped, the button does not toggle
    await page.click('[data-dc-mute="orig"]'); await sleep(600); await page.focus('[data-dc-mute="orig"]');
    const before = await page.evaluate(() => { const b = document.querySelector('[data-dc-mute="orig"]'); return { pressed: b.getAttribute('aria-pressed'), focused: document.activeElement === b }; });
    for (let k = 0; k < 5; k++) { await page.keyboard.press('t'); await sleep(beat * 1000); }
    await sleep(2500);
    s = await stNow();
    const after = await page.evaluate(() => document.querySelector('[data-dc-mute="orig"]').getAttribute('aria-pressed'));
    check(s.tempo && s.tempo.tapped && Math.abs(s.tempo.bpm - 124) < 8 && s.playing && after === before.pressed, 'T five times with a mute button focused: a tapped tempo, the mute button unchanged, still playing', `${JSON.stringify(s.tempo)} · focused ${before.focused} · mute ${before.pressed} → ${after}`);
    await page.click('[data-dc-mute="orig"]'); await sleep(300);
    // the Tap button: its count on pointerdown
    const tapAt = async () => { const b = await page.$('#dc-tap'); const r = await b.boundingBox(); await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await page.mouse.up(); };
    await sleep(2500);
    for (let k = 0; k < 3; k++) { await tapAt(); await sleep(beat * 1000); }
    const label = await page.innerText('#dc-tap');
    check(/Tap\s*3\/4/.test(label), 'the Tap button counts the taps of the series', label.replace(/\s+/g, ' '));
    const tip = await page.getAttribute('#dc-tap', 'title');
    check(/\bT\b/.test(tip), 'the Tap button\'s tooltip names the T key', tip);
    // Auto: back to the analysed tempo
    await sleep(2500);
    check(!!(await page.$('#dc-auto')), 'Auto shows after a tapped tempo');
    await page.click('#dc-auto'); await sleep(3000);
    s = await stNow();
    check(!s.tempo && Math.abs(s.bpm - 124) < 0.5 && !(await page.$('#dc-auto')) && s.playing, 'Auto: the analysed tempo again, no stored tempo, Auto gone, still playing', `${s.bpm} BPM · ${JSON.stringify(s.tempo)}`);
    // Space plays and pauses only
    await page.click('#tab-decode .dc-h');
    await page.keyboard.press('Space'); await sleep(800);
    const paused = !(await stNow()).playing;
    await page.keyboard.press('Space'); await sleep(1500);
    s = await stNow();
    check(paused && s.playing && !s.tempo, 'Space pauses and plays again, and taps nothing', `paused ${paused} · playing ${s.playing}`);
    await page.click('#dc-stop'); await sleep(400);
    // Full before Play, then the top line group in the hook
    s = await open(F('hook.wav'));
    await page.click('[data-dc-level="B"]');
    for (let i = 0; i < 300; i++) { await sleep(100); s = await stNow(); if (s.modelB && !s.full) break; }
    check(s.modelB && s.level === 'B' && !s.playing, 'Full picked before Play: the analysis runs with the track stopped and the switch is on Full', `${s.level} · playing ${s.playing}`);
    await page.click('#dc-play'); await sleep(2500);
    s = await stNow();
    check(s.playing && s.playLevel === 'B' && /Full/.test(await page.innerText('#src')), 'Play after Full: the track plays in Full from the start', `${s.playLevel} · bar ${s.bar && s.bar.toFixed(1)}`);
    let code = await edCode();
    check(!/\/\/ vox: …/.test(code) && /^_\$: melody\("/m.test(code) && !/^\$: melody/m.test(code), 'outside the hook the melody lines are muted', code.split('\n').filter(l => /melody|vox/.test(l)).join(' / '));
    await page.evaluate(f => globalThis.codingMiskDecode.seek(f), s.modelB.downbeat + 9 * (240 / 124));
    await sleep(2500);
    code = await edCode();
    const ev = await evaluated();
    check(/^\$: melody\("[a-z ]+"\)/m.test(code) && !/melody|vox/.test(ev), 'in the hook the melody lines play (`$:`), and the evaluated code has none of them', code.split('\n').filter(l => /melody|vox/.test(l)).join(' / '));
    const copy = await page.evaluate(() => globalThis.codingMiskCopy());
    check(/^const vox = \(\) => silence, melody = \(\) => silence/.test(copy) && /\$: melody\(/.test(copy) && copy.indexOf('// ========== melody') > copy.indexOf('$:'), 'Copy keeps the group after the code the player plays, with vox and melody defined as silence', copy.split('\n')[0]);
    await page.click('#dc-stop'); await sleep(400);
  }

  // ---------- level B (groups 6 and 7): Full, the growing mark, cancel, several tracks, Open in Compose ----------
  async function levelB() {
    if (shots) fs.mkdirSync(shots, { recursive: true });
    const pic = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false }); };
    const theme = async t => { await page.click(`[data-uitheme="${t}"]`).catch(() => {}); await sleep(1200); };
    const { TEST_SONGS, truthOf } = await import('./decode-songs.mjs');
    const LONGW = wavs['decode-test-long'], truth = truthOf(TEST_SONGS.find(x => x.id === 'decode-test-long'));
    check(essentiaReqs.length === 0, 'level A never downloads Essentia.js (no request before Full)', essentiaReqs.join(' '));
    await page.click('[data-tab="decode"]'); await sleep(300);
    let s = await open(LONGW);
    for (let i = 0; i < 40 && !s.bpm; i++) { await sleep(250); s = await stNow(); }
    check(s.level === 'A' && s.duration > 239 && s.duration < 250, 'a new 4-minute file opens in Live', `${s.level} · ${Math.round(s.duration)} s`);
    await page.click('#dc-play'); await sleep(3000);
    await page.evaluate(() => { globalThis.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) globalThis.__lt.push(e.duration); }).observe({ type: 'longtask', buffered: false }); });
    const f0 = (await stNow()).file, t0 = Date.now();
    await page.click('[data-dc-level="B"]'); await sleep(700);
    const run = await page.evaluate(() => { const r = document.querySelector('#dc-full-run'), chip = document.querySelector('[data-dc-level="B"]'); return { shown: !!r, text: r ? r.innerText : '', mark: !!(chip && chip.querySelector('.growing-mark')), cancel: !!document.querySelector('#dc-full-cancel') }; });
    check(run.shown && run.mark && run.cancel && /Analysing \d+ %/.test(run.text), 'Full: the growing mark on the switch, the progress and Cancel', JSON.stringify(run));
    await page.evaluate(() => document.querySelector('#dc-level').scrollIntoView({ block: 'center' }));
    await pic('fase2-full-loading-neon');
    await theme('hw'); await pic('fase2-full-loading-hardware');
    await theme('light'); await pic('fase2-full-loading-light');
    await theme('neon');
    for (let i = 0; i < 1200; i++) { await sleep(100); s = await stNow(); if (!s.full) break; }
    const secs = (Date.now() - t0) / 1000;
    const lt = await page.evaluate(() => ({ n: globalThis.__lt.length, max: Math.round(Math.max(0, ...globalThis.__lt)) }));
    check(s.modelB && secs < 240, 'level B on a 4-minute file finishes in less than its length', `${secs.toFixed(1)} s`);
    check(lt.max <= 200, 'the page stays responsive while level B runs (no long task over 200 ms)', JSON.stringify(lt));
    check(s.playing && s.file > f0 + secs - 1, 'the original keeps playing while level B runs', `${f0.toFixed(1)} → ${s.file.toFixed(1)} s`);
    await sleep(2500); s = await stNow();
    const pid = await page.evaluate(() => { const b = globalThis.codingMiskBars(); return b.song ? b.song.id : null; });
    check(s.level === 'B' && s.playLevel === 'B' && /:B$/.test(pid || '') && /Full/.test(await page.innerText('#src')), 'the level B code takes over while the original plays; the source line reads "Full"', `${pid} · ${await page.innerText('#src')}`);
    check(s.modelB.engines.tempo === 'essentia.js' && s.modelB.engines.key === 'essentia.js' && s.modelB.engines.chords === 'essentia.js' && /Essentia\.js/.test(await page.innerText('#dc-engines')), 'tempo, key and chords from Essentia.js, shown under the controls', await page.innerText('#dc-engines'));
    check(s.modelB.bpm === 128 && Math.abs(s.modelB.downbeat) < 0.02, 'level B: the whole-file grid at 128 BPM from the first downbeat', `${s.modelB.bpm} BPM, ${s.modelB.downbeat} s`);
    const bounds = s.modelB.sections.map(x => x.start).filter(x => x > 0), err = Math.max(...truth.starts.filter(x => x > 0).map(w => Math.min(...bounds.map(b => Math.abs(b - w)))));
    check(err <= 1 && bounds.length === 4, 'sections: bounds within one bar of the song\'s sections', `${bounds.join(',')} (truth ${truth.starts.slice(1).join(',')})`);
    const strip = await page.$$eval('#dc-secs .dc-sec b', xs => xs.map(x => x.textContent));
    check(strip.join(',') === 'Intro,Verse,Break,Drop,Outro', 'the sections of the original in the panel, named by kind', strip.join(','));
    const rows = await page.$$eval('#dc-tracks .dc-trk', xs => xs.map(x => ({ name: x.querySelector('.dc-nm').childNodes[0].textContent.trim(), m: !!x.querySelector('[data-dc-mute]'), s: !!x.querySelector('[data-dc-solo]') })));
    check(rows.map(r => r.name).join(',') === 'Original,Drums,Bass,Chords' && rows.every(r => r.m && r.s), 'level B tracks: Original, Drums, Bass and Chords, each with mute and solo', rows.map(r => r.name).join(','));
    // in the verse, mute and solo per track (no step of the growth until bar 49)
    await page.evaluate(f => globalThis.codingMiskDecode.seek(f), s.modelB.downbeat + 20 * (240 / 128));
    await page.evaluate(() => { const el = document.querySelector('#dc-slider'); el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await sleep(3500);
    await page.evaluate(() => document.querySelector('#dc-level').scrollIntoView({ block: 'start' }));
    const lv = async () => { const L = {}; for (let i = 0; i < 6; i++) { const x = (await stNow()).levels; for (const k in x) L[k] = Math.max(L[k] || 0, x[k]); await sleep(120); } return L; };
    let L = await lv();
    check(L.drums > 0.01 && L.bass > 0.01 && L.chords > 0.01 && L.orig > 0.01, 'slider in the middle: the original and every code track heard', JSON.stringify(Object.fromEntries(Object.entries(L).map(([k, v]) => [k, +v.toFixed(3)]))));
    await pic('fase2-full-done-neon');
    const ev0 = await evaluated();
    await page.click('[data-dc-mute="bass"]'); await sleep(700);
    L = await lv();
    const ev1 = await evaluated();
    check(L.bass < 0.001 && L.drums > 0.01 && L.chords > 0.01, 'mute Bass: only the bass goes silent', `bass ${L.bass.toFixed(4)}, drums ${L.drums.toFixed(3)}, chords ${L.chords.toFixed(3)}`);
    check(ev0 === ev1, 'mute changes what is heard, never the code text');
    await page.click('[data-dc-solo="chords"]'); await sleep(700);
    L = await lv(); s = await stNow();
    check(L.chords > 0.01 && L.drums < 0.001 && L.bass < 0.001 && L.orig < 0.001 && s.settings.mix.slider === 1, 'solo Chords: only the code\'s chords are heard, the slider on Code', JSON.stringify(Object.fromEntries(Object.entries(L).map(([k, v]) => [k, +v.toFixed(3)]))));
    const lit = await page.evaluate(() => document.querySelectorAll('#edhost .cm-content [style*="outline"]').length);
    check(lit > 0, 'muted tracks still light their notes', `${lit} lit`);
    await page.click('[data-dc-solo="chords"]'); await sleep(200);
    await page.click('[data-dc-mute="bass"]'); await sleep(300);
    s = await stNow();
    check(s.settings.mix.tracks.every(t => !t.mute || t.kind === 'orig'), 'unsolo and unmute: the code tracks heard again', JSON.stringify(s.settings.mix.tracks.map(t => [t.id, t.mute])));
    // the code of a section change is typed before its bar: at bar 49 the break's chords play
    await page.evaluate(f => globalThis.codingMiskDecode.seek(f), s.modelB.downbeat + 44 * (240 / 128));
    let typed = false, landed = null;
    for (let i = 0; i < 120 && landed === null; i++) {
      await sleep(100);
      const [ed, ev, cur] = await Promise.all([shown(), evaluated(), stNow()]);
      if (cur.bar > 45 && cur.bar < 48 && /Dm/.test(ed) && !/Dm/.test(ev)) typed = true;
      if (/chord\("<Am Dm F E>"\)/.test(ev)) landed = cur.bar;
    }
    // (the new code is evaluated a little before its bar, so the scheduler's query from the bar on reads it)
    check(typed && landed !== null && Math.round(landed) === 48, 'level B: the break\'s chords are typed during the bars before 49 and play from bar 49', `typed ${typed}, evaluated at bar ${landed && (landed + 1).toFixed(2)}`);
    // Live and back, while playing: the other level takes over at the next bar
    await page.click('[data-dc-level="A"]'); await sleep(2600); s = await stNow();
    check(s.level === 'A' && s.playLevel === 'A' && s.playing && s.settings.mix.tracks.map(t => t.id).join() === 'orig,code', 'Live while playing: level A takes over, one code track', s.settings.mix.tracks.map(t => t.id).join());
    await page.click('[data-dc-level="B"]'); await sleep(2600); s = await stNow();
    check(s.level === 'B' && s.playLevel === 'B' && !s.full, 'Full again: the stored analysis, no new run');
    // pictures: hardware, light, 400 px
    await theme('hw'); await pic('fase2-full-done-hardware');
    await theme('light'); await pic('fase2-full-done-light');
    await theme('neon');
    await page.setViewportSize({ width: 400, height: 900 }); await sleep(1200);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    check(sw <= 402, '400 px with level B playing: no sideways scroll', `${sw}px`);
    await page.evaluate(() => document.querySelector('#dc-level').scrollIntoView({ block: 'start' })); await sleep(300);
    await pic('fase2-full-400px');
    await page.evaluate(() => document.querySelector('#dc-tracks').scrollIntoView({ block: 'start' })); await sleep(300);
    await pic('fase2-full-400px-tracks');
    await page.setViewportSize({ width: 1400, height: 1000 }); await sleep(500);
    await page.click('#dc-stop'); await sleep(300);

    // cancel: nothing stored for level B, Live stays
    s = await open(wavs['decode-test-90']);
    for (let i = 0; i < 40 && !s.bpm; i++) { await sleep(250); s = await stNow(); }
    await page.click('[data-dc-level="B"]'); await sleep(400);
    await page.click('#dc-full-cancel'); await sleep(600);
    s = await stNow();
    const stored = await page.evaluate(() => globalThis.codingMiskDecode.store.list().then(l => l.map(r => ({ title: r.title, b: !!r.modelB }))));
    check(!s.full && s.level === 'A' && !s.modelB && /cancelled/.test(s.status && s.status.text) && stored.some(r => r.title === 'decode-test-90' && !r.b), 'Cancel: the analysis stops, nothing is stored for level B, Live stays', s.status && s.status.text);
    await page.click('#dc-play'); await sleep(2500); s = await stNow();
    check(s.playing && s.playLevel === 'A', 'after Cancel, Live plays');
    await page.click('#dc-stop'); await sleep(300);

    // Essentia.js blocked: level B still finishes with misk-analyzer's own tempo, key and chords
    await page.route(/essentia__js|essentia\.js-core|essentia-wasm/, r => r.abort());
    s = await open(wavs['decode-test-174']);
    for (let i = 0; i < 40 && !s.bpm; i++) { await sleep(250); s = await stNow(); }
    await page.click('[data-dc-level="B"]');
    for (let i = 0; i < 600; i++) { await sleep(100); s = await stNow(); if (!s.full) break; }
    check(s.modelB && s.level === 'B' && Object.values(s.modelB.engines).every(x => x === 'misk-analyzer') && s.modelB.bpm === 174 && /misk-analyzer/.test(s.status && s.status.text), 'Essentia.js blocked: level B finishes with misk-analyzer alone, the tab works as usual', `${JSON.stringify(s.modelB && s.modelB.engines)} · ${s.status && s.status.text}`);
    await page.unroute(/essentia__js|essentia\.js-core|essentia-wasm/);

    // reload: a track with a stored level B analysis opens in Full
    await page.reload(); await sleep(3000);
    s = await open(LONGW);
    check(s.level === 'B' && s.modelB && !s.full, 'reopened: the stored level B analysis opens in Full, no analysis runs');
    const badge = await page.evaluate(() => globalThis.codingMiskDecode.store.list().then(l => l.filter(r => r.modelB).length));
    check(badge >= 2, 'the stored records keep level B (the recent list says "Full ready")', `${badge}`);

    // Open in Compose: the same code at every step, the Live coder with "Follow the song"
    const steps = [0, 8, 16, 30, 48, 64, 90, 111];
    const want = await page.evaluate(b => b.map(x => globalThis.codingMiskDecode.codeB(x)), steps);
    await page.click('#dc-compose');
    for (let i = 0; i < 100; i++) { await sleep(200); if (await page.evaluate(() => document.querySelector('.tab[aria-selected="true"]').dataset.tab === 'componi' && !globalThis.codingMiskCompose.pending())) break; }
    const song = await page.evaluate(() => globalThis.codingMiskCompose.song());
    const got = await page.evaluate(b => b.map(x => globalThis.codingMiskCompose.codeAt(x)), steps);
    const strip2 = c => (c || '').replace(/\n*\/\/ =+ (vox|melody) =+\n[\s\S]*$/, '').replace(/\n*\/\/ vox: …\s*$/, '').trim();
    const same = steps.filter((b, i) => strip2(got[i]) === strip2(want[i]));
    check(song.config && song.config.profile === 'switch' && song.config.options.growth === 'follow' && song.config.options.narrator === false && song.cover && song.cover.title === 'decode-test-long', 'Open in Compose: a song of yours with the Live coder, "Follow the song", narrator off and the cover', JSON.stringify(song.config));
    check(same.length === steps.length, 'Open in Compose: the code at every step matches the code in Decode (the top line group aside)', `${same.length}/${steps.length} bars`);
    check(!JSON.stringify(song).includes('pcm') && song.tracks.map(t => t.id).join() === 'drums,bass,chords' && song.sections.length === 5, 'no audio goes with the song; its decoded sections and tracks', `${song.sections.map(x => x.name).join(',')} · ${song.tracks.map(t => t.id).join(',')}`);
    const tmp = path.join(FILES, 'opened-song.json'); fs.writeFileSync(tmp, JSON.stringify(song));
    let valid = ''; try { valid = execFileSync('node', ['--no-warnings', 'tools/song.mjs', 'validate', tmp], { encoding: 'utf8' }); } catch (e) { valid = `FAIL ${e.stdout || e.message}`; }
    check(!/FAIL|error/i.test(valid), 'the saved song passes tools/song.mjs validate', valid.trim().split('\n').pop());
    check((await page.$eval('#live-growth', el => el.value)) === 'follow' && (await page.$eval('#live-growth option[value="follow"]', o => o.textContent)) === 'Follow the song', 'the Compose growth menu shows "Follow the song"');
    await page.evaluate(() => document.querySelector('#live-growth').scrollIntoView({ block: 'center' })); await sleep(300);
    await pic('fase2-compose-follow-neon');
    await page.click('#play'); await sleep(4000);
    const e0 = errors.length;
    for (const prof of ['classic', 'crescendo']) {
      await page.click(`[data-profile="${prof}"]`);
      for (let i = 0; i < 100; i++) { await sleep(200); if (!(await page.evaluate(() => globalThis.codingMiskCompose.pending()))) break; }
      await sleep(2500);
      const b = await page.evaluate(() => globalThis.codingMiskBars());
      check(b.song && b.song.id === song.id && errors.length === e0, `Open in Compose: the song plays with ${prof === 'classic' ? 'Classic' : 'Crescendo'} like any song`, `${b.song && b.song.id}`);
    }
    await page.click('#stop'); await sleep(300);
    // a built-in song with "Follow the song" in Compose
    await page.selectOption('#track-pick', 'switch-prima-luce'); await sleep(1500);
    await page.click('[data-profile="switch"]'); await sleep(300);
    await page.selectOption('#live-growth', 'follow');
    for (let i = 0; i < 100; i++) { await sleep(200); if (!(await page.evaluate(() => globalThis.codingMiskCompose.pending()))) break; }
    const e1 = errors.length;
    await page.click('#play'); await sleep(4000);
    const bb = await page.evaluate(() => globalThis.codingMiskBars());
    check((await page.$eval('#live-growth', el => el.value)) === 'follow' && bb.song && bb.song.id === 'switch-prima-luce' && errors.length === e1, 'a built-in song plays with "Follow the song" in Compose', bb.song && bb.song.id);
    await page.click('#stop'); await sleep(300);
    await page.click('[data-tab="decode"]'); await sleep(300);
  }

  // ---------- export with the original (group 8, D16) ----------
  // A 31.5 s file: 1.5 s of a tone, then the first 30 s of the 124 BPM test song (the first downbeat falls at 1.5 s, so the
  // export must begin with the lead-in, the original alone). The weight of the original in an export is measured by
  // regression: x = a·original + residual; a follows the slider (cos(x·π/2) × the loudness trim × the master level), the
  // residual is the code.
  async function exportsB() {
    if (shots) fs.mkdirSync(shots, { recursive: true });
    const pic = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false }); };
    const theme = async t => { await page.click(`[data-uitheme="${t}"]`).catch(() => {}); await sleep(1200); };
    const { filePeak } = require('./output-peak.cjs');
    const LEAD = F('export-lead.wav');
    if (!fs.existsSync(LEAD)) ff(['-f', 'lavfi', '-i', 'sine=f=440:d=1.5:r=48000,volume=4', '-t', '30', '-i', wavs['decode-test-124'], '-filter_complex', '[0:a]aformat=channel_layouts=stereo[a];[1:a]aformat=channel_layouts=stereo[b];[a][b]concat=n=2:v=0:a=1', LEAD]);
    const pcm = f => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
    const rms = (a, from = 0, to = a.length) => { let s = 0; for (let i = from; i < to; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, to - from)); };
    const db = x => 20 * Math.log10(Math.max(1e-9, x));
    const lowpass = (a, hz) => { const k = 1 - Math.exp(-2 * Math.PI * hz / 48000), o = new Float32Array(a.length); let y = 0; for (let i = 0; i < a.length; i++) { y += k * (a[i] - y); o[i] = y; } return o; };
    const highpass = (a, hz) => { const l = lowpass(a, hz); return a.map((v, i) => v - l[i]); };
    const env = (a, w = 12000) => { const out = []; for (let i = 0; i + w <= a.length; i += w) out.push(rms(a, i, i + w)); return out; };
    const corr = (x, y) => { const n = Math.min(x.length, y.length), mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n, my = y.slice(0, n).reduce((a, b) => a + b, 0) / n; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sx * sy); };
    const align = (A, B) => { const ea = env(A, 480), eb = env(B, 480); let best = 0, bc = -2; for (let o = 0; o <= 200; o++) { const c = corr(ea, eb.slice(o)); if (c > bc) { bc = c; best = o; } } return best * 480; };
    // x = a·o + residual over [from, to) seconds
    const weigh = (x, o, from, to) => { const i0 = Math.round(from * 48000), i1 = Math.min(Math.round(to * 48000), x.length, o.length); let xo = 0, oo = 0; for (let i = i0; i < i1; i++) { xo += x[i] * o[i]; oo += o[i] * o[i]; } const a = xo / oo; let r = 0; for (let i = i0; i < i1; i++) r += (x[i] - a * o[i]) ** 2; return { a, res: Math.sqrt(r / (i1 - i0)), res0: rms(x, i0, i1) }; };
    const ORIG = pcm(LEAD);
    const dls = [], onDl = d => dls.push(d);
    page.on('download', onDl);
    const settings = o => page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, JSON.stringify(v)); }, o);
    await settings({ 'coding-misk-export-format': 'wav', 'coding-misk-export-speed': 'fast' });
    const got = async (re, ms = 240000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const d = dls.find(x => re.test(x.suggestedFilename()) && !x.saved); if (d) { d.saved = path.join(FILES, `out-${dls.indexOf(d)}-${d.suggestedFilename()}`); await d.saveAs(d.saved); return d.saved; } await sleep(300); } return null; };
    const slider = v => page.evaluate(v => { const el = document.querySelector('#dc-slider'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    const lang = async l => { await page.click(`[data-lang="${l}"]`); await sleep(300); };
    const free = async () => { for (let i = 0; i < 100; i++) { const j = await page.evaluate(() => globalThis.codingMiskExport.job); if (!j) return; await sleep(300); } };

    await page.click('[data-tab="decode"]'); await sleep(300);
    let s = await open(LEAD);
    for (let i = 0; i < 40 && !s.bpm; i++) { await sleep(250); s = await stNow(); }
    check(s.bpm === 124 && !s.modelB, 'export file: 124 BPM found after 1.5 s of lead-in, no Full analysis yet', `${s.bpm} BPM, level A downbeat ${s.downbeat}`);
    await page.fill('#dc-title', 'Night Run'); await page.fill('#dc-artist', 'Some Band');
    if (!(await page.$eval('#dc-attr', b => b.getAttribute('aria-pressed') === 'true'))) await page.click('#dc-attr');
    await slider(50); await sleep(300);
    s = await stNow();
    const exp = x => Math.cos(x * Math.PI / 2) * s.trim * 0.6;

    // the export card
    const card = await page.evaluate(() => { const c = document.querySelector('#dc-export-card'); return c ? { lbl: c.querySelector('.lbl').textContent, ex: c.querySelector('#dc-export').textContent, fr: c.querySelector('#dc-frag').textContent, lcd: c.querySelector('[data-out-lcd]').textContent, note: c.querySelector('.note').textContent } : null; });
    check(card && card.lbl === 'Export' && card.ex === '⬇ Export' && card.fr === '✂ Fragments' && /AUDIO · WAV/.test(card.lcd), 'the Export card: "Export", "⬇ Export", "✂ Fragments" and the audio display', JSON.stringify(card && { lbl: card.lbl, ex: card.ex, fr: card.fr, lcd: card.lcd }));
    await page.evaluate(() => document.querySelector('#dc-export-card').scrollIntoView({ block: 'center' }));
    await pic('fase3-export-neon');
    await theme('hw'); await pic('fase3-export-hardware');
    await theme('light'); await pic('fase3-export-light');
    await theme('neon');
    await page.setViewportSize({ width: 400, height: 900 }); await sleep(1000);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.evaluate(() => document.querySelector('#dc-export-card').scrollIntoView({ block: 'center' })); await sleep(300);
    check(sw <= 402, '400 px with the Export card: no sideways scroll', `${sw}px`);
    await pic('fase3-export-400px');
    await page.setViewportSize({ width: 1400, height: 1000 }); await sleep(600);
    await lang('it'); await sleep(300);
    const it = await page.evaluate(() => ({ lbl: document.querySelector('#dc-export-card .lbl').textContent, ex: document.querySelector('#dc-export').textContent, fr: document.querySelector('#dc-frag').textContent }));
    check(it.lbl === 'Esporta' && it.ex === '⬇ Esporta' && it.fr === '✂ Frammenti', 'the Export card in Italian', JSON.stringify(it));
    await lang('en');

    // 1. Export with Full missing: the analysis runs first, then the file; the slider in the middle, Attribution on
    const t0 = Date.now();
    await page.click('#dc-export'); await sleep(600);
    const note = await page.evaluate(() => ({ status: (document.querySelector('.dc-status') || {}).textContent || '', run: !!document.querySelector('#dc-full-run') }));
    check(note.run || /Analysing|analysis/i.test(note.status), 'Export without the Full analysis runs it first, then goes on by itself', JSON.stringify(note));
    const w1 = await got(/\.wav$/), tl1 = await got(/\.timeline\.json$/), tx1 = await got(/\.txt$/);
    check(!!w1 && !!tl1 && !!tx1, 'the Export button: the WAV, the timeline and the texts are saved', `${Math.round((Date.now() - t0) / 1000)} s`);
    if (!w1) return;
    s = await stNow();
    const X1 = pcm(w1), dur = ORIG.length / 48000, len1 = X1.length / 48000, a1 = weigh(X1, ORIG, 4, 25);
    check(Math.abs(len1 - dur) < 0.05, 'the file is as long as the original, lead-in included', `${len1.toFixed(2)} s for ${dur.toFixed(2)} s`);
    check(Math.abs(a1.a - exp(0.5)) / exp(0.5) < 0.15 && a1.res > 0.01, 'slider in the middle: the file holds the original (at the slider\'s gain) and the code', `weight ${a1.a.toFixed(3)} (expected ${exp(0.5).toFixed(3)}), the code's RMS ${a1.res.toFixed(3)}`);
    const lead = weigh(X1, ORIG, 0.1, 1.4);
    check(Math.abs(lead.a - exp(0.5)) / exp(0.5) < 0.15 && lead.res < 0.01, 'the lead-in before the first bar is the original alone', `weight ${lead.a.toFixed(3)}, residual ${lead.res.toFixed(4)}`);
    const pk = filePeak(w1);
    check(!pk.clipped && pk.peak <= 0.995, 'the file never clips (the master limiter)', `peak ${pk.peak}`);
    const tl = JSON.parse(fs.readFileSync(tl1, 'utf8')), txt = fs.readFileSync(tx1, 'utf8');
    check(tl.cover && tl.cover.title === 'Night Run' && tl.cover.artist === 'Some Band' && Math.abs(tl.firstBar - s.modelB.downbeat) < 0.01 && Math.abs(tl.code[0].t - s.modelB.downbeat) < 0.01 && Math.abs(tl.seconds - dur) < 0.06, 'the timeline carries the title and artist, the first bar at the lead-in', JSON.stringify({ cover: tl.cover, firstBar: tl.firstBar, seconds: tl.seconds }));
    check(/Cover of "Night Run" by Some Band\. The original recording belongs to its rights holders\./.test(txt), 'Attribution on: the texts name the original as a cover', txt.split('\n').filter(l => /Cover of/.test(l)).join(''));
    const panel = await page.evaluate(() => { const t = document.querySelector('.texts-panel [data-tx-desc]'); return t ? t.value : ''; });
    check(/Cover of "Night Run" by Some Band/.test(panel), 'the texts panel shows the same line');
    await page.evaluate(() => { const p = document.querySelector('.texts-panel'); if (p) p.remove(); });
    await free();

    // 2. slider fully on Code, Attribution off: no original, the rights line without names, code only
    await slider(100); await page.click('#dc-attr'); await sleep(400);
    await page.click('#dc-export');
    const w2 = await got(/\.wav$/), tx2 = await got(/\.txt$/);
    if (w2) {
      // (the code imitates the original, so its own sound weighs a little on it: 0.045 after decode-refine made the
      // level B code steadier, the same as Open in Compose's export, which cannot hold the original at all; the lead-in,
      // the original's 440 Hz alone, tells a leak apart)
      const X2 = pcm(w2), a2 = weigh(X2, ORIG, 4, 25), l2 = weigh(X2, ORIG, 0.1, 1.4);
      check(Math.abs(a2.a) < 0.08 && Math.abs(l2.a) < 0.01 && a2.res0 > 0.02, 'slider fully on Code: the file holds only the code (no original in it, the lead-in silent)', `weight ${a2.a.toFixed(3)}, lead-in ${l2.a.toFixed(4)}, level ${a2.res0.toFixed(3)}`);
      const t2 = fs.readFileSync(tx2, 'utf8');
      check(/Code written over a recording that belongs to its rights holders\./.test(t2) && !/Night Run|Some Band/.test(t2), 'Attribution off, code only: the rights line, neither the title nor the artist', t2.split('\n').filter(l => /rights holders/.test(l)).join(''));
    } else check(false, 'slider fully on Code: the export');
    await page.evaluate(() => { const p = document.querySelector('.texts-panel'); if (p) p.remove(); });
    await free();

    // 3. slider fully on Original, Attribution off: the original alone, the line without names
    await slider(0); await sleep(300);
    await page.click('#dc-export');
    const w3 = await got(/\.wav$/), tx3 = await got(/\.txt$/);
    if (w3) {
      const X3 = pcm(w3), a3 = weigh(X3, ORIG, 4, 25);
      check(Math.abs(a3.a - exp(0)) / exp(0) < 0.12 && a3.res < 0.01, 'slider fully on Original: the file is the original alone', `weight ${a3.a.toFixed(3)} (expected ${exp(0).toFixed(3)}), residual ${a3.res.toFixed(4)}`);
      const t3 = fs.readFileSync(tx3, 'utf8'), pan = await page.evaluate(() => { const t = document.querySelector('.texts-panel [data-tx-desc]'), n = document.querySelector('.texts-panel [data-tx-title]'); return t ? `${n.value}\n${t.value}` : ''; });
      check(/Contains a recording that belongs to its rights holders\./.test(t3) && !/Night Run|Some Band/.test(t3 + pan), 'Attribution off with the original: the rights line, no title, no artist (file and panel)', t3.split('\n').filter(l => /rights holders/.test(l)).join(''));
    } else check(false, 'slider fully on Original: the export');
    await page.evaluate(() => { const p = document.querySelector('.texts-panel'); if (p) p.remove(); });
    await free();

    // 4. mute a part: Bass muted in Full, the slider in the middle: the file loses the bass
    await slider(50); await page.click('#dc-attr');
    await page.click('[data-dc-level="B"]'); await sleep(2800);
    const base = weigh(X1, ORIG, 4, 25);
    const lowRes = (x, a) => { const lo = lowpass(x, 150), lo0 = lowpass(ORIG, 150), i0 = 4 * 48000, i1 = 25 * 48000; let r = 0; for (let i = i0; i < i1; i++) r += (lo[i] - a * lo0[i]) ** 2; return Math.sqrt(r / (i1 - i0)); };
    await page.click('[data-dc-mute="bass"]'); await sleep(500);
    await page.click('#dc-export');
    const w4 = await got(/\.wav$/);
    if (w4) {
      const X4 = pcm(w4), a4 = weigh(X4, ORIG, 4, 25), lo1 = lowRes(X1, base.a), lo4 = lowRes(X4, a4.a);
      check(Math.abs(a4.a - exp(0.5)) / exp(0.5) < 0.15 && lo4 < lo1 * 0.8, 'Bass muted in Full: the original stays, the code\'s low end falls in the file', `low residual ${lo4.toFixed(4)} against ${lo1.toFixed(4)} with the bass`);
    } else check(false, 'Bass muted: the export');
    await page.evaluate(() => { const p = document.querySelector('.texts-panel'); if (p) p.remove(); });
    await free();
    await page.click('[data-dc-mute="bass"]'); await sleep(300);

    // 5. fast and real time sound the same (the tolerance of check-export)
    await settings({ 'coding-misk-export-speed': 'real' });
    await slider(50); await sleep(300);
    const t5 = Date.now();
    await page.click('#dc-export'); await sleep(2500);
    const lab = await page.textContent('#dc-export');
    check(/REC/.test(lab), 'real time export: the button shows the recording and a tap cancels', lab);
    const w5 = await got(/\.wav$/, 150000);
    if (w5) {
      const R = pcm(w5), off = align(X1, R), Rs = R.subarray(off), n = Math.min(X1.length, Rs.length, Math.floor((len1 - 3) * 48000));
      const c = corr(env(X1.subarray(0, n)), env(Rs.subarray(0, n))), d0 = db(rms(X1, 0, n)) - db(rms(Rs, 0, n));
      const lo = db(rms(lowpass(X1.subarray(0, n), 150))) - db(rms(lowpass(Rs.subarray(0, n), 150))), hi = db(rms(highpass(X1.subarray(0, n), 4000))) - db(rms(highpass(Rs.subarray(0, n), 4000)));
      // (the recording starts at an unknown sample: the lag is refined at sample level against the original over 3 s)
      let bl = 0, bx = -1; for (let l = -720; l <= 720; l++) { let xo = 0; for (let i = 4 * 48000; i < 7 * 48000; i += 3) xo += (Rs[i + l] || 0) * ORIG[i]; if (xo > bx) { bx = xo; bl = l; } }
      const a5 = weigh(Rs.subarray(bl > 0 ? bl : 0), ORIG.subarray(bl < 0 ? -bl : 0), 4, 25);
      check(Math.abs(d0) < 1.5 && Math.abs(lo) < 2 && Math.abs(hi) < 2.5 && c > 0.85, 'fast and real time exports of a decoded track sound the same', `loudness ${d0.toFixed(2)} dB, low ${lo.toFixed(2)} dB, high ${hi.toFixed(2)} dB, over time r=${c.toFixed(3)}, ${Math.round((Date.now() - t5) / 1000)} s`);
      check(Math.abs(a5.a - exp(0.5)) / exp(0.5) < 0.2, 'real time: the original at the slider\'s gain', `weight ${a5.a.toFixed(3)} (expected ${exp(0.5).toFixed(3)}, recording offset ${Math.round(off / 48)} ms)`);
    } else check(false, 'real time export of a decoded track');
    await free();
    await settings({ 'coding-misk-export-speed': 'fast' });

    // 6. a video: the file has the picture and the mix
    await page.click('#dc-export-card [data-out-kind]'); await sleep(300);
    check(/VIDEO/.test(await page.textContent('#dc-export-card [data-out-lcd]')), 'the display beside Export switches to video');
    const t6 = Date.now();
    await page.click('#dc-export');
    const v6 = await got(/\.(mp4|webm)$/, 300000);
    if (v6) {
      const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', v6]).toString()), vs = info.streams.find(x => x.codec_type === 'video'), as = info.streams.find(x => x.codec_type === 'audio');
      const V = pcm(v6), a6 = weigh(V, ORIG, 4, 25);
      check(!!vs && !!as && Math.abs(+info.format.duration - dur) < 0.2, 'video export: a picture and a sound, as long as the original', `${vs && vs.width}×${vs && vs.height} ${vs && vs.codec_name}, ${as && as.codec_name}, ${(+info.format.duration).toFixed(2)} s in ${Math.round((Date.now() - t6) / 1000)} s`);
      check(Math.abs(a6.a - exp(0.5)) / exp(0.5) < 0.2 && a6.res > 0.01, 'video export: the sound is the original and the code as heard', `weight ${a6.a.toFixed(3)} (expected ${exp(0.5).toFixed(3)})`);
      await page.evaluate(() => { const p = document.querySelector('.texts-panel'); if (p) p.remove(); });
    } else check(false, 'video export');
    await free();
    await page.click('#dc-export-card [data-out-kind]'); await sleep(300);

    // 7. fragments: the menu from the Decode card, then a 9:16 fragment with the original's span
    await page.click('#dc-frag'); await sleep(900);
    check(await page.isVisible('.frag-menu'), 'the Fragments button opens the fragments menu below the card');
    const where = await page.evaluate(() => { const m = document.querySelector('.frag-menu'), c = document.querySelector('#dc-export-card'); return !!m && !!c && (c.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0; });
    check(where, 'the menu sits right after the Export card');
    await page.evaluate(() => document.querySelector('.frag-menu').scrollIntoView({ block: 'start' }));
    await pic('fase3-fragments-neon');
    const txm = await page.evaluate(() => { const d = document.querySelector('.frag-menu [data-tx-desc]'); return d ? d.value : ''; });
    check(/Cover of "Night Run" by Some Band|Contains a recording/.test(txm), 'the menu\'s texts carry the rights line', txm.split('\n').filter(l => /rights holders/.test(l)).join(''));
    await page.click('.frag-menu [data-fm="close"]'); await sleep(300);
    const before = dls.length;
    const fr = await page.evaluate(() => globalThis.codingMiskClips.fragments({ source: 'decode', from: 8, to: 20, quiet: true, files: ['video', 'audio', 'texts'] }));
    await sleep(2500);
    check(fr && fr.items && fr.items.length === 1, 'a fragment of a decoded track (8 s to 20 s)', JSON.stringify(fr && (fr.items || fr.error)));
    const fv = await got(/fragment 001\.(mp4|webm)$/, 60000), fa = await got(/fragment 001\.wav$/, 60000), ft = await got(/fragment 001\.txt$/, 60000);
    check(!!fv && !!fa && !!ft, 'the fragment saves its video, its audio and its texts', dls.slice(before).map(d => d.suggestedFilename()).join(', '));
    if (fv && fa) {
      const FA = pcm(fa), FV = pcm(fv), dd = s.modelB.downbeat, o0 = Math.round((dd + 8) * 48000), O = ORIG.subarray(o0, o0 + 12 * 48000);
      // the sound of the fragment against the original's same 12 seconds: weight and lag (5 ms envelopes)
      const e = (x, from) => { const o = []; for (let i = from; i + 240 <= from + 11 * 48000; i += 240) o.push(rms(x, i, i + 240)); return o; };
      let best = [-1, 0];
      for (let lag = -0.1; lag <= 0.1; lag += 0.005) { const c = corr(e(ORIG, Math.round((dd + 8.5 + lag) * 48000)), e(FV, Math.round(0.5 * 48000))); if (c > best[0]) best = [c, lag]; }
      const wA = weigh(FA, O, 1, 10), wV = weigh(FV, O, 1, 10);
      check(Math.abs(wA.a - exp(0.5)) / exp(0.5) < 0.2 && wA.res > 0.005, 'the fragment\'s audio is the original\'s same 12 seconds mixed with the code', `weight ${wA.a.toFixed(3)} (expected ${exp(0.5).toFixed(3)}), code ${wA.res.toFixed(3)}`);
      check(best[0] > 0.9 && Math.abs(best[1]) <= 0.034, 'the fragment\'s video sound lines up with the original within one video frame', `r ${best[0].toFixed(3)} at ${(best[1] * 1000).toFixed(0)} ms; weight ${wV.a.toFixed(3)}`);
      const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', fv]).toString()), vs = info.streams.find(x => x.codec_type === 'video');
      check(vs && vs.width === 1080 && vs.height === 1920, 'the fragment is 1080×1920 (9:16)', vs && `${vs.width}×${vs.height}`);
    }
    if (ft) check(/Cover of "Night Run" by Some Band/.test(fs.readFileSync(ft, 'utf8')), 'the fragment\'s texts carry the cover line');
    await free();
    // a random 30 s fragment, picked by the sections (the file is short: one pick)
    const r2 = await page.evaluate(() => globalThis.codingMiskClips.fragments({ source: 'decode', n: 1, length: 15, seed: 'dc', quiet: true, files: ['video'] }));
    check(r2 && r2.items && r2.items.length === 1, 'a random fragment is picked from the decoded track', JSON.stringify(r2 && (r2.items || r2.error)));
    await sleep(1500);

    // the original only plays in the tab and in exports the user starts: opened in Compose, an export holds only the code
    await page.click('#dc-compose');
    for (let i = 0; i < 100; i++) { await sleep(200); if (await page.evaluate(() => document.querySelector('.tab[aria-selected="true"]').dataset.tab === 'componi' && !globalThis.codingMiskCompose.pending())) break; }
    const nC = dls.length;
    await page.click('#tr-export');
    const wC = await got(/\.wav$/, 120000);
    if (wC) {
      const XC = pcm(wC), dd = s.modelB.downbeat, aC = weigh(XC, ORIG.subarray(Math.round(dd * 48000)), 4, 24);
      check(Math.abs(aC.a) < 0.08 && aC.res0 > 0.02, 'Open in Compose: its export holds only the code\'s sound, no original (the code\'s own likeness to it under 0.08)', `weight ${aC.a.toFixed(3)}, level ${aC.res0.toFixed(3)}`);
    } else check(false, 'Open in Compose: the export', dls.slice(nC).map(d => d.suggestedFilename()).join(', '));
    await free();
    page.off('download', onDl);
    await page.click('[data-tab="decode"]'); await sleep(300);
  }

  if (ONLY_B) {
    await page.reload(); await sleep(3000);
    await page.click('[data-lang="en"]'); await sleep(300);
    await page.click('[data-mode="ascolta"]'); await sleep(300);
    await levelB();
    check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
    await browser.close();
    console.log(failed ? `${failed} failed` : 'all passed');
    process.exit(failed ? 1 : 0);
  }
  if (process.argv.includes('--refine')) {
    await refine();
    check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
    await browser.close();
    console.log(failed ? `${failed} failed` : 'all passed');
    process.exit(failed ? 1 : 0);
  }
  if (ONLY_E) {
    await page.reload(); await sleep(3000);
    await page.click('[data-lang="en"]'); await sleep(300);
    await page.click('[data-mode="ascolta"]'); await sleep(300);
    await exportsB();
    check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
    await browser.close();
    console.log(failed ? `${failed} failed` : 'all passed');
    process.exit(failed ? 1 : 0);
  }

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
  check(code.startsWith('// coding-misk · cover of "Night Run" by Some Band') && !/\/\/ vox: …/.test(code) && /\$: s\("[^"]*bd/.test(code) && !/vox|melody/.test(await evaluated()), 'the code column shows the cover line and the drums; no old vocals comment; the evaluated code has no top line line', code.split('\n').length + ' lines');
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

  // ---------- 5.3 tempo: ½×, 2×, tap with the T key ----------
  await page.click('[data-dc-tempo="0.5"]'); await sleep(2500);
  s = await st();
  check(s.bpm === 62 && s.tempo && s.tempo.bpm === 62, '½×: the code is written at 62 BPM', `${s.bpm}`);
  await page.click('[data-dc-tempo="2"]'); await sleep(2500);
  s = await st();
  check(s.bpm === 124, '2×: back to 124 BPM', `${s.bpm}`);
  await page.click('#tab-decode .dc-h'); // no focused field
  const f0 = (await st()).file, beat = 60 / 124;
  for (let k = 0; k < 5; k++) { await page.keyboard.press('t'); await sleep(beat * 1000 * 1.0); }
  await sleep(2500);
  s = await st();
  check(s.tempo && s.tempo.tapped && Math.abs(s.tempo.bpm - 124) < 8 && s.playing, 'tap tempo: five presses of T set a tapped tempo and keep playing', JSON.stringify(s.tempo));
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

  await levelB();
  await exportsB();
  await refine();

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
