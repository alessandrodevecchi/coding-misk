// Tab audio probe: the lifecycle (decode-tab-audio). Same setup as run.cjs, headed.
// tab capture lifecycle: video track stopped at once, audio goes on; pause in the source tab; source tab closed
const { chromium } = require(process.env.PLAYWRIGHT_CORE);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--autoplay-policy=no-user-gesture-required', '--auto-select-tab-capture-source-by-title=SRC-TAB'] });
  const ctx = await browser.newContext();
  const src = await ctx.newPage(); await src.goto('http://localhost:5401/source.html');
  const cap = await ctx.newPage(); await cap.goto('http://localhost:5401/cap.html#stopvideo');
  await cap.click('#go'); await sleep(3000);
  await src.bringToFront(); await src.click('#plain'); await sleep(4000);
  const rms = async () => (await cap.evaluate(() => window.res.rms)).slice(-4).join(' ');
  console.log('video stopped, playing: rms', await rms(), 'video state', await cap.evaluate(() => 'stopped'));
  await src.evaluate(() => document.getElementById('a').pause()); await sleep(2000);
  console.log('source paused: rms', await rms());
  await src.evaluate(() => document.getElementById('a').play()); await sleep(2000);
  console.log('source playing again: rms', await rms());
  const before = Date.now();
  await src.close(); await sleep(2000);
  const r = await cap.evaluate(() => window.res);
  console.log('source tab closed: ended event', r.ended ? `after ${Math.round(r.ended - before)} ms` : 'none', 'rms', r.rms.slice(-3).join(' '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
