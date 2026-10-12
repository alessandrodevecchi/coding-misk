// Browser checks for fragments (#57): random and timed fragments from a song and from a radio recipe, 1080×1920 files
// with sound, a timed fragment that sounds as the same stretch of the full song, label numbers that grow, texts and
// the list saved, the menu and the texts panel, every visual in each vertical layout (screenshots). Needs ffmpeg.
// Usage: PLAYWRIGHT_CORE=... node tools/check-clips.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { execFileSync } = require('node:child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'clips-'));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const probe = f => { try { return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f]).toString()); } catch (e) { return null; } };
// mono samples at 48 kHz from any audio or video file
const pcm = f => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const env = (x, from, to, win = 2400) => { const out = []; for (let i = Math.round(from * 48000); i + win <= Math.round(to * 48000); i += win) { let s = 0; for (let k = 0; k < win; k++) s += x[i + k] * x[i + k]; out.push(Math.sqrt(s / win)); } return out; };
const corr = (a, b) => { const n = Math.min(a.length, b.length), ma = a.slice(0, n).reduce((x, y) => x + y, 0) / n, mb = b.slice(0, n).reduce((x, y) => x + y, 0) / n; let s = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
const db = (a, b) => 20 * Math.log10((a.reduce((x, y) => x + y, 0) / a.length) / (b.reduce((x, y) => x + y, 0) / b.length));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('download', d => downloads.push(d));
  await page.goto('http://localhost:5173/'); await sleep(2000);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['synthwave'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); localStorage.setItem('coding-misk-export-format', JSON.stringify('wav')); localStorage.setItem('coding-misk-export-speed', JSON.stringify('fast')); });
  await page.reload(); await sleep(4000);
  const save = async (re, name) => { const d = downloads.find(x => re.test(x.suggestedFilename())); if (!d) return null; const f = path.join(TMP, name || d.suggestedFilename()); await d.saveAs(f); return f; };
  const call = o => page.evaluate(o => globalThis.codingMiskClips.fragments(o), o);

  // 1. two random fragments of a song, from the console
  let t0 = Date.now(), r = await call({ source: 'kellerlicht', n: 2, length: 15, seed: 'check', quiet: true });
  await sleep(2500);
  check(r.items && r.items.length === 2 && r.items[1].start >= r.items[0].end, 'two random fragments, not overlapping', JSON.stringify(r.items && r.items.map(x => `${x.from}-${x.to}`)));
  check(r.items && r.items[0].label.endsWith('#001') && r.items[1].label.endsWith('#002'), 'labels numbered #001 and #002', r.items && r.items.map(x => x.label).join(', '));
  const f1 = await save(/fragment 001\.mp4$/);
  const p1 = f1 && probe(f1), vs = p1 && p1.streams.find(s => s.codec_type === 'video'), as = p1 && p1.streams.find(s => s.codec_type === 'audio');
  check(!!vs && vs.width === 1080 && vs.height === 1920 && !!as, 'the file is 1080×1920 with sound', vs ? `${vs.width}×${vs.height} ${vs.codec_name}, ${as && as.codec_name}` : 'no file');
  check(p1 && Math.abs(+p1.format.duration - 15) < 0.2, 'it lasts the asked 15 s', p1 && p1.format.duration);
  check(!!(await save(/fragment 001\.txt$/)) && !!(await save(/fragments\.json$/)), 'texts and the list are saved');
  check((Date.now() - t0) / 1000 < 30, 'faster than real time', `${((Date.now() - t0) / 1000).toFixed(1)} s for 30 s of video`);

  // 2. the same stretch as the full song: export the song as WAV, cut 60 to 75 s
  downloads.length = 0;
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(500);
  await page.click('#songs [data-song-id="kellerlicht"] [data-act="export"]'); await sleep(1500);
  t0 = Date.now(); while (Date.now() - t0 < 200000 && await page.evaluate(() => globalThis.codingMiskExport.job)) await sleep(500);
  await sleep(1500);
  const full = await save(/\.wav$/, 'full.wav');
  r = await call({ source: 'kellerlicht', from: 60, to: 75, quiet: true }); await sleep(2500);
  const ft = await save(/fragment 003\.mp4$/, 'timed.mp4');
  if (full && ft) {
    // 5 ms envelopes; the video's AAC starts a few tens of ms late, so the best lag within ±150 ms counts
    const A = pcm(full), B = pcm(ft), eb = env(B, 1.5, 13.5, 240);
    let best = [-1, 0];
    for (let lag = -0.15; lag <= 0.15; lag += 0.005) { const c = corr(env(A, 61.5 + lag, 73.5 + lag, 240), eb); if (c > best[0]) best = [c, lag]; }
    const d = db(eb, env(A, 61.5 + best[1], 73.5 + best[1], 240));
    check(best[0] > 0.9 && Math.abs(d) < 1.5, 'a timed fragment sounds as the same stretch of the full song', `r ${best[0].toFixed(3)} at ${(best[1] * 1000).toFixed(0)} ms, ${d.toFixed(2)} dB`);
    check(Math.abs(B.length / 48000 - 15) < 0.2, 'from 1:00 to 1:15 lasts 15 s', (B.length / 48000).toFixed(2));
  } else check(false, 'timed fragment and full song saved', `${!!full} ${!!ft}`);
  // the picture follows the song's time too: the frames of a fragment from 1:40 draw bars 55 and on (section 3)
  const seen = await page.evaluate(async () => {
    const v = globalThis.codingMiskVideo, orig = v.composeVertical, out = [];
    v.composeVertical = (...a) => { out.push([a[1], a[5]]); return orig(...a); };
    try { await globalThis.codingMiskClips.fragments({ source: 'kellerlicht', from: 100, to: 103, quiet: true, show: 'code' }); } finally { v.composeVertical = orig; }
    return [out[0], out[out.length - 1]];
  });
  check(seen[0] && Math.abs(seen[0][0] - 55) < 0.1 && seen[0][1] === 2, 'the picture of a fragment follows the song\'s time and section', JSON.stringify(seen));
  const bad = await call({ source: 'kellerlicht', from: 60, to: 9999 });
  check(bad.error === 'range', 'past the end: nothing is cut', JSON.stringify(bad));

  // 3. from a radio recipe (the file a radio export saves)
  downloads.length = 0;
  r = await page.evaluate(async () => {
    const x = globalThis.codingMiskRadio.exportItems({ kind: 'songs', n: 2 });
    const recipe = { ...x.recipe, export: { from: x.from, count: x.items.length } };
    return { texts: globalThis.codingMiskClips.texts({ source: recipe }), frag: await globalThis.codingMiskClips.fragments({ source: recipe, n: 1, length: 15, quiet: true, layout: 'v-soul-bands' }) };
  });
  await sleep(2500);
  check(r.frag.items && r.frag.items.length === 1, 'a fragment from a radio recipe', r.frag.items && r.frag.items[0].label);
  check(/^00:00 /m.test(r.texts.description) && !/·\s*$/.test(r.texts.title), 'the recipe\'s texts list the songs with their times', r.texts.title);

  // 4. the menu and the texts panel
  downloads.length = 0;
  await page.click('#songs [data-song-id="kellerlicht"] [data-frag]'); await sleep(300);
  check(await page.locator('.frag-menu').isVisible(), 'the ✂ Fragments button opens the menu');
  await page.fill('#fm-n', '1'); await page.click('.frag-menu [data-fm-len="15"]'); await page.click('.frag-menu [data-fm="go"]');
  t0 = Date.now(); await sleep(1500); while (Date.now() - t0 < 120000 && await page.evaluate(() => globalThis.codingMiskClips.job)) await sleep(500); await sleep(2000);
  const tt = '.fm-texts [data-tx-title]', td = '.fm-texts [data-tx-desc]';
  check(/#00\d/.test(await page.inputValue(tt)), 'after the menu\'s fragment its texts show beside the form', await page.inputValue(tt).catch(() => ''));
  const before = await page.inputValue(td); await page.click('.fm-texts [data-tx="draw"]');
  check((await page.inputValue(td)) !== before, 'draw again changes the texts');
  check(await page.locator('#fm-look').count() === 1 && await page.locator('#fm-soulview').count() === 1, 'the menu lets you pick the visual and the soul view');
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, 'clips-menu-panel.png') }); }

  // 5. every visual in each vertical layout
  if (SHOTS) {
    await page.click('#songs [data-song-id="kellerlicht"] [data-act="play"]'); await sleep(3000);
    const looks = await page.$$eval('#looks option:not([disabled])', o => o.map(x => x.value));
    const CHOICES = { 'v-code': { show: 'visual-code', aspect: 'fill', bands: false }, 'v-soul': { show: 'visual-soul', aspect: 'fill', bands: false }, 'v-bands': { show: 'visual', aspect: '1:1', bands: true }, 'v-169-bands': { show: 'visual', aspect: '16:9', bands: true }, 'turned': { show: 'visual-code', aspect: 'fill', bands: true, rotate: true }, 'square': { format: '1:1', show: 'visual', aspect: 'fill', bands: true } };
    for (const layout of Object.keys(CHOICES)) {
      const urls = [];
      for (const look of looks) {
        await page.selectOption('#looks', look); await sleep(700);
        urls.push(await page.evaluate(c => { const v = globalThis.codingMiskVideo, f = c.format === '1:1' ? { w: 540, h: 540 } : { w: 540, h: 960 }, comp = c.rotate ? { w: f.h, h: f.w } : f; v.composeVertical({ q: f, comp, o: { tagline: 'music written as code', label: true, glitch: true, codeMode: 'focus', ...c }, label: 'FRAGMENT S0UL·7QX2K #014', code: 'X', msgs: { open: 'a', close: 'b' }, length: 30 }, 40, performance.now() / 1000, 5, [.5, .5, .5, .5, .5, .5, .5], 2); return v.canvas.toDataURL('image/jpeg', .8); }, CHOICES[layout]));
      }
      urls.forEach((u, i) => fs.writeFileSync(path.join(SHOTS, `clip-${layout}-${looks[i]}.jpg`), Buffer.from(u.split(',')[1], 'base64')));
    }
    check(true, `screenshots of ${looks.length} visuals in ${Object.keys(CHOICES).length} layouts`, SHOTS);
  }
  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
