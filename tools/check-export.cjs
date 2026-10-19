// Browser checks for the fast export (#8): songs export faster than real time with the timeline next to them, the
// fast and the real time files of the same song agree (length, loudness, low and high bands, loudness over time),
// FLAC is lossless, MP3 and Opus open, cancel saves nothing, a saved radio session exports as one file. Each song's
// file stays below full scale (level-headroom): the render's float peak and the WAV's samples, with the time of the first
// clipped sample.
// Needs ffmpeg and ffprobe. Real time exports take as long as the songs.
// Usage: PLAYWRIGHT_CORE=... node tools/check-export.cjs [song-id,song-id…] [--quick]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { CLIP, tapRender, renderPeak, filePeak } = require('./output-peak.cjs');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { execFileSync } = require('node:child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ARG = process.argv.slice(2).find(a => !a.startsWith('--')), SONGS = (ARG || 'dci-carica,neon-rush-reel,primo-segnale').split(',');
const QUICK = process.argv.includes('--quick'); // skips the real time comparison
// song titles by id, to find a song past the first page of the Songs tab
const songFilesIn = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? songFilesIn(path.join(d, e.name)) : e.name.endsWith('.json') && e.name !== 'index.json' && e.name !== 'session.json' ? [path.join(d, e.name)] : []));
const TITLES = Object.fromEntries(songFilesIn(path.join(__dirname, '..', 'songs')).map(f => { try { const s = JSON.parse(fs.readFileSync(f, 'utf8')); return [s.id, s.title]; } catch (e) { return [null, null]; } }));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
// a file as mono float samples at 48 kHz
const pcm = f => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const db = x => 20 * Math.log10(Math.max(1e-9, x));
const rms = (a, from = 0, to = a.length) => { let s = 0; for (let i = from; i < to; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, to - from)); };
// one pole filters: the low band (below about 150 Hz) and the high band (above about 4 kHz)
const lowpass = (a, hz) => { const k = 1 - Math.exp(-2 * Math.PI * hz / 48000), o = new Float32Array(a.length); let y = 0; for (let i = 0; i < a.length; i++) { y += k * (a[i] - y); o[i] = y; } return o; };
const highpass = (a, hz) => { const l = lowpass(a, hz); return a.map((v, i) => v - l[i]); };
// loudness every w samples (0.25 s by default)
const env = (a, w = 12000) => { const out = []; for (let i = 0; i + w <= a.length; i += w) out.push(rms(a, i, i + w)); return out; };
const corr = (x, y) => { const n = Math.min(x.length, y.length), mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n, my = y.slice(0, n).reduce((a, b) => a + b, 0) / n; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sx * sy); };
// the real time recording starts a little late: the offset in samples that matches best (10 ms steps, up to 2 s)
const align = (F, R) => { const ef = env(F, 480), er = env(R, 480); let best = 0, bc = -2; for (let o = 0; o <= 200; o++) { const c = corr(ef, er.slice(o)); if (c > bc) { bc = c; best = o; } } return best * 480; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('download', d => downloads.push(d));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  const settings = o => page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, JSON.stringify(v)); }, o);
  await page.evaluate(() => localStorage.clear());
  await settings({ 'coding-misk-export-format': 'wav', 'coding-misk-export-speed': 'fast' });
  await page.reload(); await sleep(3500);
  await tapRender(page);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(500);
  const save = async (d, name) => { const f = path.join(TMP, name || d.suggestedFilename()); await d.saveAs(f); return f; };
  const job = () => page.evaluate(() => globalThis.codingMiskExport.job);
  const seconds = id => page.evaluate(id => { const c = document.querySelector(`#songs [data-song-id="${id}"] .time`); return c ? c.textContent : ''; }, id);
  // one export by the card button; waits for the files. Returns the new downloads.
  async function exportSong(id, { timeout = 400000 } = {}) {
    const n = downloads.length, t0 = Date.now();
    // a song past the first page of the Songs tab: searched by its title first
    if (!(await page.isVisible(`#songs [data-song-id="${id}"] [data-act="export"]`)) && TITLES[id]) { await page.fill('#sv-q', TITLES[id]); await sleep(800); }
    await page.click(`#songs [data-song-id="${id}"] [data-act="export"]`);
    await sleep(1500);
    while (Date.now() - t0 < timeout) {
      const busy = await job() || /REC|●/.test(await page.textContent(`#songs [data-song-id="${id}"] [data-act="export"]`));
      if (!busy) break;
      await sleep(500);
    }
    await sleep(1500);
    return { files: downloads.slice(n), secs: (Date.now() - t0) / 1000 };
  }

  for (const id of SONGS) {
    await settings({ 'coding-misk-export-speed': 'fast', 'coding-misk-export-format': 'wav' });
    await renderPeak(page);
    const fast = await exportSong(id);
    const rp = await renderPeak(page);
    const wavD = fast.files.find(d => /\.wav$/.test(d.suggestedFilename())), tlD = fast.files.find(d => /\.timeline\.json$/.test(d.suggestedFilename()));
    check(!!wavD && !!tlD, `${id}: fast export saves the WAV and the timeline`, fast.files.map(d => d.suggestedFilename()).join(', '));
    if (!wavD) continue;
    const fw = await save(wavD, `${id}-fast.wav`), tl = tlD ? JSON.parse(fs.readFileSync(await save(tlD))) : null;
    const F = pcm(fw), flen = F.length / 48000;
    // the output limit: a 16 bit file cannot hold a sample above full scale, so a sample at full scale is clipped
    const fp = filePeak(fw);
    check(!fp.clipped && rp <= CLIP, `${id}: the file stays below full scale`, fp.clipped ? `${fp.clipped} samples at full scale, the first at ${fp.at.toFixed(2)} s; render peak ${rp}` : `peak ${fp.peak}, render peak ${rp}`);
    check(tl && Math.abs(flen - tl.seconds) < 0.05 && fast.secs < tl.seconds, `${id}: faster than real time, the file is the song plus its tail`, `${tl ? tl.seconds.toFixed(1) : '?'} s of audio in ${fast.secs.toFixed(1)} s`);
    if (tl) {
      const kick = (tl.instruments.kick || [])[0];
      if (kick) { const i = Math.round(kick[0] * 48000), pre = rms(F, Math.max(0, i - 2400), i), post = rms(F, i, i + 2400); check(post > pre * 1.5 || kick[0] < 0.05, `${id}: the first kick of the timeline is in the audio`, `${kick[0]} s`); }
    }
    if (QUICK) continue;
    // the same song in real time
    await settings({ 'coding-misk-export-speed': 'real' });
    const real = await exportSong(id);
    const rd = real.files.find(d => /\.wav$/.test(d.suggestedFilename()));
    if (!rd) { check(false, `${id}: real time export`); continue; }
    const R = pcm(await save(rd, `${id}-real.wav`));
    const off = align(F, R), Rs = R.subarray(off), n = Math.min(F.length, Rs.length, Math.floor((flen - 3) * 48000));
    const a = { c: corr(env(F.subarray(0, n)), env(Rs.subarray(0, n))) };
    const d0 = db(rms(F, 0, n)) - db(rms(Rs, 0, n));
    const lo = db(rms(lowpass(F.subarray(0, n), 150))) - db(rms(lowpass(Rs.subarray(0, n), 150)));
    const hi = db(rms(highpass(F.subarray(0, n), 4000))) - db(rms(highpass(Rs.subarray(0, n), 4000)));
    check(Math.abs(d0) < 1.5 && Math.abs(lo) < 2 && Math.abs(hi) < 2.5 && a.c > 0.85, `${id}: fast and real time sound the same`, `loudness ${d0.toFixed(2)} dB, low ${lo.toFixed(2)} dB, high ${hi.toFixed(2)} dB, over time r=${a.c.toFixed(3)}`);
  }

  // blocks: the same song in 10 second blocks and in one piece agree, without clicks at the cuts
  {
    const id = SONGS[0];
    await settings({ 'coding-misk-export-speed': 'fast', 'coding-misk-export-format': 'wav', 'coding-misk-export-block': 0 });
    const one = pcm(await save((await exportSong(id)).files.find(d => /\.wav$/.test(d.suggestedFilename())), 'one.wav'));
    await settings({ 'coding-misk-export-block': 10 });
    const bl = pcm(await save((await exportSong(id)).files.find(d => /\.wav$/.test(d.suggestedFilename())), 'blocks.wav'));
    await settings({ 'coding-misk-export-block': 0 });
    const n = Math.min(one.length, bl.length), r = corr(env(one.subarray(0, n)), env(bl.subarray(0, n))), dd = db(rms(bl, 0, n)) - db(rms(one, 0, n));
    // a click: a jump between two samples at a cut much bigger than the jumps around it
    let worst = 0;
    for (let cut = 10 * 48000; cut < n - 4800; cut += 10 * 48000) {
      let jump = 0, around = 1e-4;
      for (let k = cut - 4; k < cut + 4; k++) jump = Math.max(jump, Math.abs(bl[k + 1] - bl[k]));
      for (let k = cut - 2400; k < cut + 2400; k++) if (Math.abs(k - cut) > 8) around = Math.max(around, Math.abs(bl[k + 1] - bl[k]));
      worst = Math.max(worst, jump / around);
    }
    check(Math.abs(one.length - bl.length) <= 48 && Math.abs(dd) < 0.3 && r > 0.99 && worst < 1.5, 'blocks and one piece agree, no clicks at the cuts', `length ${one.length - bl.length} samples, loudness ${dd.toFixed(2)} dB, over time r=${r.toFixed(4)}, worst cut ${worst.toFixed(2)}×`);
  }

  // FLAC is lossless: a known signal encodes and decodes to the same 16 bit samples
  const flac = await page.evaluate(async () => {
    const n = 48000, L = new Float32Array(n), R = new Float32Array(n);
    for (let i = 0; i < n; i++) { L[i] = Math.round(Math.sin(i / 20) * 0.5 * 32767) / 32767; R[i] = Math.round(Math.sin(i / 33) * 0.3 * 32767) / 32767; }
    const { blob, ext } = await globalThis.codingMiskExport.encode([L, R], 48000, 'flac');
    const ref = Array.from({ length: n * 2 }, (_, k) => { const v = (k % 2 ? R : L)[k >> 1]; return Math.round(v < 0 ? v * 0x8000 : v * 0x7fff); });
    return { ext, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), ref };
  });
  const ff = path.join(TMP, 'test.flac'); fs.writeFileSync(ff, Buffer.from(flac.bytes));
  const dec = execFileSync('ffmpeg', ['-v', 'error', '-i', ff, '-f', 's16le', '-']), s16 = new Int16Array(dec.buffer, dec.byteOffset, dec.length / 2);
  let diff = 0; for (let i = 0; i < flac.ref.length; i++) diff = Math.max(diff, Math.abs(s16[i] - flac.ref[i]));
  check(flac.ext === 'flac' && s16.length === flac.ref.length && diff === 0, 'FLAC decodes to the same samples', `max difference ${diff}`);

  // MP3 (both rates) and Opus from a fast export
  for (const [fmt, extra, re] of [['mp3', { 'coding-misk-export-mp3': 192 }, /\.mp3$/], ['opus', {}, /\.ogg$/], ['flac', {}, /\.flac$/]]) {
    await settings({ 'coding-misk-export-speed': 'fast', 'coding-misk-export-format': fmt, ...extra });
    const r = await exportSong(SONGS[0]);
    const d = r.files.find(x => re.test(x.suggestedFilename()));
    const info = d ? JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', await save(d)]).toString()) : null;
    const st = info && info.streams[0];
    check(!!st && (fmt !== 'mp3' || Math.abs(+info.format.bit_rate - 192000) < 8000), `${fmt}: the file opens`, st ? `${st.codec_name} ${st.sample_rate} Hz ${st.channels} ch${fmt === 'mp3' ? ` ${Math.round(info.format.bit_rate / 1000)} kbps` : ''}` : 'no file');
  }
  check(/AUDIO · FLAC/.test(await page.textContent(`#songs [data-song-id="${SONGS[0]}"] [data-out-lcd]`)), 'the Export display shows the format');

  // a radio session saved in a playlist (2 songs) exports as one file with its timeline
  await settings({ 'coding-misk-export-format': 'wav', 'coding-misk-export-speed': 'fast' });
  await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'export-check'); await page.click('#radio-start'); await sleep(2000);
  await page.click('#radio-pl'); await sleep(200);
  await page.selectOption('.radio-pl-menu select', ''); await page.click('.radio-pl-menu [data-pl-ok]'); await sleep(300);
  await page.click('#radio-start'); await sleep(300);
  const sid = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('coding-misk-playlists')), id = Object.keys(d.sessions)[0]; d.sessions[id].count = 2; localStorage.setItem('coding-misk-playlists', JSON.stringify(d)); return id; });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="playlist"]'); await sleep(400);
  const lid = await page.evaluate(id => JSON.parse(localStorage.getItem('coding-misk-playlists')).lists.find(l => l.songs.includes(id)).id, sid);
  await page.click(`[data-pl-open="${lid}"]`); await sleep(300);
  const ns = downloads.length, ts = Date.now();
  await page.click(`[data-export-mini="${sid}"]`); await sleep(1500);
  while (Date.now() - ts < 300000 && await job()) await sleep(500);
  await sleep(1500);
  const sw = downloads.slice(ns).find(d => /\.wav$/.test(d.suggestedFilename())), st = downloads.slice(ns).find(d => /\.timeline\.json$/.test(d.suggestedFilename()));
  if (sw && st) {
    const tl2 = JSON.parse(fs.readFileSync(await save(st))), len = pcm(await save(sw, 'session.wav')).length / 48000;
    check(Math.abs(len - tl2.seconds) < 0.05 && tl2.sections.length >= 2 && (Date.now() - ts) / 1000 < tl2.seconds, 'a saved session exports as one file, faster than real time', `${tl2.seconds.toFixed(1)} s in ${((Date.now() - ts) / 1000).toFixed(1)} s, ${tl2.sections.length} sections`);
  } else check(false, 'a saved session exports as one file', downloads.slice(ns).map(d => d.suggestedFilename()).join(', '));
  await page.click('[data-tab="brani"]'); await sleep(400);

  // the radio: next 2 songs, then 5 minutes, each with audio, timeline, track list and recipe
  await settings({ 'coding-misk-export-format': 'flac', 'coding-misk-export-speed': 'fast' });
  await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'radio-export-check').catch(() => {}); await page.click('#radio-start'); await sleep(2500);
  for (const [kind, fill] of [['songs', ['n', '2']], ['minutes', ['minutes', '5']]]) {
    await page.click('#radio-export'); await sleep(200);
    await page.check(`.radio-export-menu input[value="${kind}"]`); await page.fill(`.radio-export-menu [data-rx="${fill[0]}"]`, fill[1]);
    const nr = downloads.length, tr0 = Date.now();
    await page.click('.radio-export-menu [data-rx-go]'); await sleep(1500);
    while (Date.now() - tr0 < 400000 && await job()) await sleep(500);
    await sleep(2000);
    const got = downloads.slice(nr), names = got.map(d => d.suggestedFilename());
    const au = got.find(d => /\.flac$/.test(d.suggestedFilename())), tlx = got.find(d => /\.timeline\.json$/.test(d.suggestedFilename())), tlist = got.find(d => /tracklist\.txt$/.test(d.suggestedFilename()));
    const ok4 = au && tlx && tlist && names.some(n => /recipe\.json$/.test(n));
    let extra = names.join(', ');
    if (ok4) {
      const tlj = JSON.parse(fs.readFileSync(await save(tlx))), lines = fs.readFileSync(await save(tlist), 'utf8').trim().split('\n').slice(2);
      const dur = +JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-of', 'json', await save(au)]).toString()).format.duration;
      extra = `${lines.length} songs, ${(dur / 60).toFixed(1)} min in ${((Date.now() - tr0) / 1000).toFixed(0)} s`;
      check((kind === 'songs' ? lines.length === 2 : dur >= 300) && Math.abs(dur - tlj.seconds) < 0.1, `radio export (${kind === 'songs' ? 'next 2 songs' : '5 minutes'}): audio, timeline, track list and recipe`, extra);
    } else check(false, `radio export (${kind})`, extra);
  }
  // a 20 second clip and 4 exact minutes, in WAV: the files last exactly that
  await settings({ 'coding-misk-export-format': 'wav' });
  for (const [kind, fill, want] of [['clip', ['seconds', '20'], 20], ['minutes', ['minutes', '4'], 240]]) {
    await page.click('#radio-export'); await sleep(200);
    await page.check(`.radio-export-menu input[value="${kind}"]`); await page.fill(`.radio-export-menu [data-rx="${fill[0]}"]`, fill[1]);
    if (kind === 'minutes') await page.check('.radio-export-menu [data-rx="exact"]');
    const nx = downloads.length, tx0 = Date.now();
    await page.click('.radio-export-menu [data-rx-go]'); await sleep(1500);
    while (Date.now() - tx0 < 400000 && await job()) await sleep(500);
    await sleep(1500);
    const w = downloads.slice(nx).find(d => /\.wav$/.test(d.suggestedFilename()));
    const len = w ? pcm(await save(w, `exact-${kind}.wav`)).length / 48000 : -1;
    check(Math.abs(len - want) < 0.002, `${kind === 'clip' ? 'a 20 second clip' : '4 exact minutes'}: the file lasts exactly that`, `${len.toFixed(3)} s`);
  }
  // with the compilation on, the radio's export draws each song from the setup
  await page.click('#radio-comp'); await sleep(300);
  await page.click('#radio-export'); await sleep(200);
  await page.check('.radio-export-menu input[value="songs"]'); await page.fill('.radio-export-menu [data-rx="n"]', '2');
  { const nc = downloads.length, tc0 = Date.now(); await page.click('.radio-export-menu [data-rx-go]'); await sleep(1500);
    while (Date.now() - tc0 < 400000 && await job()) await sleep(500); await sleep(1500);
    check(downloads.slice(nc).some(d => /\.wav$/.test(d.suggestedFilename())), 'radio export with the compilation on'); }
  await page.click('#radio-comp'); await sleep(100); await page.click('#radio-comp'); await sleep(100);
  await page.click('#radio-start'); await sleep(300);
  await page.click('[data-tab="brani"]'); await sleep(400);

  // cancel: a tap on Export while it renders
  await settings({ 'coding-misk-export-format': 'wav' });
  const n0 = downloads.length;
  // the search may still hold the title of a song exported above: search for this one
  await page.fill('#sv-q', TITLES.kellerlicht || ''); await sleep(800);
  await page.click(`#songs [data-song-id="kellerlicht"] [data-act="export"]`); await sleep(2500);
  check(!!(await job()), 'a long song is rendering');
  await page.click(`#songs [data-song-id="kellerlicht"] [data-act="export"]`); await sleep(1500);
  check(!(await job()) && downloads.length === n0 && !(await page.$('iframe[src="/render.html"]')), 'cancel stops it, no file, the render page is gone');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
