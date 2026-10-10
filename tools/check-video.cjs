// Browser checks for the session video (#27): a song records a file with a video and an audio track at the chosen
// size, the code layout draws the code beside the stage, cancel saves nothing, the radio records a video with its
// track list, the whole tab layout captures the tab. Needs ffprobe for the file checks.
// Usage: PLAYWRIGHT_CORE=... node tools/check-video.cjs [shots-dir]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { execFileSync } = require('node:child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || '';
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
// the streams of a video file: [{ codec_type, codec_name, width, height }]
const probe = f => { try { return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', f]).toString()).streams; } catch (e) { return null; } };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--auto-accept-this-tab-capture', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('download', d => downloads.push(d));
  await page.goto('http://localhost:5173/'); await sleep(2500);
  const setVideo = o => page.evaluate(o => localStorage.setItem('coding-misk-video', JSON.stringify(o)), o);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['synthwave'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); });
  await setVideo({ layout: 'visual', quality: '720p30', card: 'always', soulPanel: true });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(500);
  // one Export with an AUDIO / VIDEO display: a tap switches it
  const lcd = () => page.textContent('#songs [data-song-id="kellerlicht"] [data-out-lcd]');
  check(/AUDIO/.test(await lcd()), 'Export starts on audio', await lcd());
  await page.click('#songs [data-song-id="kellerlicht"] [data-out-kind]'); await sleep(200);
  check(/VIDEO · 720p30/i.test(await lcd()), 'a tap on the display switches to video, with the quality', await lcd());
  const V = () => page.evaluate(() => { const v = globalThis.codingMiskVideo; return { on: v.on, layout: v.layout, w: v.canvas.width, h: v.canvas.height, bar: !document.querySelector('.video-bar').hidden }; });
  const saved = async (re, ext) => { const d = downloads.find(x => re.test(x.suggestedFilename())); if (!d) return null; const f = path.join(os.tmpdir(), `vid-${Date.now()}.${ext}`); await d.saveAs(f); return f; };
  const card = '#songs [data-song-id="kellerlicht"]';

  // 1. a song, Visual layout, 720p: stop from the bar saves the video
  await page.click(`${card} [data-act="export"]`); await sleep(4500);
  let v = await V();
  check(v.on && v.layout === 'visual' && v.w === 1280 && v.h === 720 && v.bar, 'song video starts with the bar, frame at 1280×720', JSON.stringify(v));
  check(/REC/.test(await page.textContent(`${card} [data-act="export"]`)), 'the card button shows the recording');
  check(await page.evaluate(() => document.querySelector('#songs [data-song-id="kellerlicht"] [data-out-kind]').disabled), 'the display is locked while recording');
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, 'video-bar.png') }); }
  await page.click('.video-bar [data-vid="stop"]'); await sleep(4500);
  v = await V();
  const f1 = await saved(/^Kellerlicht.*\.(mp4|webm)$/i, 'mp4');
  check(!v.on && !!f1, 'stop saves a file named after the song', downloads.map(d => d.suggestedFilename()).join(', '));
  if (f1) {
    const st = probe(f1), vs = st && st.find(s => s.codec_type === 'video'), as = st && st.find(s => s.codec_type === 'audio');
    check(!!vs && vs.width === 1280 && vs.height === 720 && !!as, 'the file has a 1280×720 video track and an audio track', st ? st.map(s => `${s.codec_type}:${s.codec_name}${s.width ? ` ${s.width}x${s.height}` : ''}`).join(', ') : 'ffprobe failed');
  }
  check(await page.evaluate(() => document.querySelector('#stage').width > 0 && !globalThis.codingMiskVideo.on), 'the stage is back to its own size');

  // 2. Visual + code, 1080p: the code is drawn beside the stage; cancel saves nothing
  await setVideo({ layout: 'code', quality: '1080p30', card: 'start', soulPanel: true });
  const before = downloads.length;
  await page.click(`${card} [data-act="export"]`); await sleep(4000);
  v = await V();
  check(v.on && v.layout === 'code' && v.w === 1920 && v.h === 1080, 'code layout at 1920×1080', JSON.stringify(v));
  // the code column is not empty: bright pixels on its panel
  const lit = await page.evaluate(() => { const c = globalThis.codingMiskVideo.canvas, d = c.getContext('2d').getImageData(1300, 80, 580, 900).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 380) n++; return n; });
  check(lit > 2000, 'the code is drawn in its column', `${lit} bright pixels`);
  if (SHOTS) { const png = await page.evaluate(() => globalThis.codingMiskVideo.canvas.toDataURL('image/png')); fs.writeFileSync(path.join(SHOTS, 'video-code.png'), Buffer.from(png.split(',')[1], 'base64')); }
  await page.click('.video-bar [data-vid="cancel"]'); await sleep(2500);
  check(!(await V()).on && downloads.length === before, 'cancel stops and saves nothing');

  // 3. the radio: a video with its track list and recipe
  await setVideo({ layout: 'visual', quality: '720p30', card: 'always', soulPanel: true });
  await page.click('[data-tab="radio"]'); await sleep(300);
  await page.click('#radio-start'); await sleep(2500);
  await page.click('#radio-rec'); await sleep(3500);
  check((await V()).on && !!(await page.evaluate(() => globalThis.codingMiskRadio.recording)), 'radio video records');
  if (SHOTS) { const png = await page.evaluate(() => globalThis.codingMiskVideo.canvas.toDataURL('image/png')); fs.writeFileSync(path.join(SHOTS, 'video-radio.png'), Buffer.from(png.split(',')[1], 'base64')); }
  const n0 = downloads.length;
  await page.click('#radio-rec'); await sleep(4000);
  const names = downloads.slice(n0).map(d => d.suggestedFilename());
  check(names.some(n => /\.(mp4|webm)$/.test(n)) && names.some(n => /tracklist\.txt$/.test(n)), 'radio stop saves the video and the track list', names.join(', '));
  const f3 = await saved(/^coding-misk-radio.*\.(mp4|webm)$/, 'mp4');
  if (f3) { const st = probe(f3); check(!!st && st.some(s => s.codec_type === 'video') && st.some(s => s.codec_type === 'audio'), 'radio video has picture and sound'); }
  await page.click('#radio-stop').catch(() => {}); await sleep(500);

  // 4. the soul panel: Visual + code with the Soul display on; it folds and opens from the bar
  await setVideo({ layout: 'code', quality: '720p30', card: 'always', soulPanel: true });
  await page.click('#radio-start').catch(() => {}); await sleep(2000);
  for (let i = 0; i < 3; i++) { await page.click('.soul-screw'); await sleep(i < 2 ? 350 : 1500); }
  await page.click('.soul-tab .st-open'); await sleep(8500);
  await page.keyboard.press('Enter'); await sleep(500);
  await page.click('#radio-rec'); await sleep(3000);
  check(await page.isVisible('.video-bar [data-vid="soul"]'), 'with the soul on, the bar offers the soul panel');
  if (SHOTS) { const png = await page.evaluate(() => globalThis.codingMiskVideo.canvas.toDataURL('image/png')); fs.writeFileSync(path.join(SHOTS, 'video-soul.png'), Buffer.from(png.split(',')[1], 'base64')); }
  await page.click('.video-bar [data-vid="soul"]'); await sleep(600);
  check(await page.evaluate(() => globalThis.codingMiskVideo.opts().soulPanel === false), 'the bar folds the soul panel');
  if (SHOTS) { const png = await page.evaluate(() => globalThis.codingMiskVideo.canvas.toDataURL('image/png')); fs.writeFileSync(path.join(SHOTS, 'video-soul-folded.png'), Buffer.from(png.split(',')[1], 'base64')); }
  const n2 = downloads.length;
  await page.click('.video-bar [data-vid="cancel"]'); await sleep(2000);
  check(!(await V()).on && downloads.length === n2, 'radio video cancelled from the bar, nothing saved');
  await page.click('#radio-stop').catch(() => {}); await sleep(500);

  // 4. the whole tab (the browser's tab capture, accepted by a flag here)
  await setVideo({ layout: 'tab', quality: '720p30', card: 'always', soulPanel: true });
  await page.click('[data-tab="brani"]'); await sleep(400);
  const n1 = downloads.length;
  await page.click(`${card} [data-act="export"]`); await sleep(4000);
  v = await V();
  check(v.on && v.layout === 'tab' && !v.bar, 'whole tab layout records, without the bar in the picture', JSON.stringify(v));
  // no bar in the picture: the transport's stop ends it (or the song's end, or the browser's "stop sharing")
  await page.click('#stop'); await sleep(7000);
  const f4 = downloads.length > n1 ? await saved(/^Kellerlicht.*\.(mp4|webm)$/i, 'mp4') : null;
  if (f4) { const st = probe(f4); check(!!st && st.some(s => s.codec_type === 'video'), 'whole tab file has a video track', st ? st.map(s => s.codec_type).join(', ') : ''); }
  else check(false, 'whole tab file saved');

  // the live preview in the settings
  await setVideo({ layout: 'code', quality: '1080p30', card: 'always', soulPanel: true });
  await page.click('#open-settings'); await sleep(1200);
  const px = await page.evaluate(() => { const c = document.querySelector('#set-vid-preview'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n; });
  check(px > 2000, 'the settings show a live preview of the layout', `${px} lit samples`);
  if (SHOTS) await (await page.$('.set-card:has(#set-vid-preview)')).screenshot({ path: path.join(SHOTS, 'settings-preview.png') });

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
