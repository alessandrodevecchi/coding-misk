const { chromium } = require(process.env.PLAYWRIGHT_CORE);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Tab audio probe (decode-tab-audio): one tab plays (clicks for the delay, a plain or a Clear Key protected AAC stream),
// another captures it with getDisplayMedia and measures it. Serve this folder plus plain.mp4, plainf.mp4 (fragmented)
// and enc.mp4 (the same, cenc with key 00112233445566778899aabbccddeeff, kid 0102030405060708090a0b0c0d0e0f10; ffmpeg
// lines in ../design.md) on port 5401, then: PLAYWRIGHT_CORE=... node run.cjs clicks|plain|eme [headed]
// (headless Chrome gives an audio track that stays silent: run headed. The captured tab's own sound is suppressed.)
const MODE = process.argv[2] || 'clicks', HEADLESS = process.argv[3] !== 'headed';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: HEADLESS, args: ['--autoplay-policy=no-user-gesture-required', ...(process.env.CAPARGS || '--auto-select-tab-capture-source-by-title=SRC-TAB').split(' ')] });
  const ctx = await browser.newContext();
  const src = await ctx.newPage(); await src.goto(`http://localhost:5401/source.html${process.env.KEY_SYSTEM ? '#' + process.env.KEY_SYSTEM : ''}`);
  const cap = await ctx.newPage(); await cap.goto('http://localhost:5401/cap.html');
  await cap.click("#go"); await sleep(6000);
  const r0 = await cap.evaluate(() => window.res);
  console.log('capture', JSON.stringify({ err: r0.err, audioTracks: r0.audioTracks, videoTracks: r0.videoTracks, surface: r0.surface, label: r0.label, audio: r0.audioSettings }));
  await src.bringToFront();
  await src.click('#' + MODE);
  await sleep(MODE === 'clicks' ? 22000 : 8000);
  const s = await src.evaluate(async () => ({ log: window.log, clickWall: window.clickWall, outputLatency: window.outputLatency, baseLatency: window.baseLatency, keySystem: await window.keySystem }));
  const r = await cap.evaluate(() => window.res);
  console.log('source', JSON.stringify({ log: s.log, keySystem: s.keySystem, outputLatency: s.outputLatency, baseLatency: s.baseLatency }));
  console.log('rms', (r.rms || []).slice(-12).join(' '));
  console.log('peaks', (r.peaks || []).slice(-6).join(' '));
  if (MODE === 'clicks' && s.clickWall && r.onsets) {
    const d = s.clickWall.map(w => { const o = r.onsets.find(x => x > w - 200 && x < w + 400); return o === undefined ? null : o - w; }).filter(x => x !== null).sort((a, b) => a - b);
    console.log('clicks', s.clickWall.length, 'onsets', r.onsets.length, 'matched', d.length, 'delta ms (capture onset minus source output time) min', d[0] && d[0].toFixed(1), 'median', d.length && d[Math.floor(d.length / 2)].toFixed(1), 'max', d.length && d[d.length - 1].toFixed(1));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
