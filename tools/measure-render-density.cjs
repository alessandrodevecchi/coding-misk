// Measures how fine each render draws (denser-renders D7, #79): for each output (the stage in a window at ratio 2, the
// stage full screen at ratio 1 and 2, a 1080p fast video frame, a 1080 × 1920 fragment frame) and each render, the cell
// or dot in device and logical pixels, the rows and columns, the median pass time, the light form's state (and after
// how many seconds it switched on), and a 400 × 400 crop at 100% from the middle of the picture. The stage plays a song
// live on Tramonto and Palco; the video frames are drawn by the fast video's path from a made-up feed. Works on the code
// before and after the change: it reads the renderer's sizes when it reports them, else today's work sizes.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/measure-render-density.cjs [shots-dir] [--seconds 30] [--looks tramonto,palco]
//        [--renders bit,crt,led,ascii,terminal] [--outputs window,fs1,fs2,video,frag] [--density coarse,normal,fine] [--label before]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const SHOTS = args.find((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--'))) || null;
const SECONDS = +opt('seconds', 30), LABEL = opt('label', 'run');
const LOOKS = opt('looks', 'tramonto,palco').split(','), RENDERS = opt('renders', 'bit,crt,led,ascii,terminal').split(',');
const OUTPUTS = opt('outputs', 'window,fs1,fs2,video,frag').split(','), DENSITIES = opt('density', 'normal').split(',');
const URL = `http://localhost:${process.env.PORT || 5173}/`;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
// the outputs: a stage box (CSS size) at a device pixel ratio, or a video target in device pixels
const OUT = {
  window: { name: 'stage window 1100×460 @2', vw: 1440, vh: 900, dsf: 2, box: [1100, 460] },
  fs1: { name: 'stage full screen 1920×1080 @1', vw: 1920, vh: 1080, dsf: 1, box: [1920, 1080] },
  fs2: { name: 'stage full screen 1920×1080 @2', vw: 1920, vh: 1080, dsf: 2, box: [1920, 1080] },
  video: { name: 'video 1080p', vw: 1440, vh: 900, dsf: 1, target: [1920, 1080] },
  frag: { name: 'fragment 1080×1920', vw: 1440, vh: 900, dsf: 1, target: [1080, 1920] },
};

// the sizes of the last pass, in device pixels: the renderer's own report, else today's rules (passSizes(render, cw, ch, light))
const sizesIn = (page, render, light) => page.evaluate(async ([render, light]) => {
  const V = globalThis.codingMiskVisuals, c = V.canvas, L = V.lastPass;
  const rect = c === document.querySelector('#stage') ? c.getBoundingClientRect() : null;
  const dpr = rect ? c.width / rect.width : c.height / 720, cw = c.width, ch = c.height;
  if (L && L.render === render) return { dpr, cw, ch, ...L };
  const R = await import('/src/visuals/render-styles.js'), S = R.passSizes(render, cw, ch, light);
  if (render === 'bit') return { dpr, cw, ch, cellW: cw / S.w, cellH: ch / S.h, rows: S.h, cols: S.w };
  if (render === 'led') return { dpr, cw, ch, cellW: S.pitch, cellH: S.pitch, rows: S.h, cols: S.w };
  if (render === 'ascii') return { dpr, cw, ch, cellW: S.cellW, cellH: S.cellH, rows: S.h, cols: S.w };
  if (render === 'terminal') { const H = ch / dpr, W = cw / dpr, cellH = H / S.rows; return { dpr, cw, ch, cellW: cellH / 2 * dpr, cellH: cellH * dpr, rows: S.rows, cols: Math.max(8, Math.floor(W / (cellH / 2))) }; }
  if (render === 'crt') return { dpr, cw, ch, cellW: 1, cellH: 3, rows: Math.ceil(ch / 3), cols: Math.ceil(cw / 3), crt: true };
  return { dpr, cw, ch };
}, [render, light]);
// a 400 × 400 crop at 100% from the middle of the picture
const crop = page => page.evaluate(() => {
  const c = globalThis.codingMiskVisuals.canvas, k = document.createElement('canvas'); k.width = k.height = 400;
  k.getContext('2d').drawImage(c, Math.max(0, Math.round(c.width / 2 - 200)), Math.max(0, Math.round(c.height / 2 - 200)), 400, 400, 0, 0, 400, 400);
  return k.toDataURL('image/png');
});
const savePng = (file, url) => { if (SHOTS && url) fs.writeFileSync(`${SHOTS}/${file}`, Buffer.from(url.split(',')[1], 'base64')); };

async function stageCase(browser, o, look, render, density) {
  const ctx = await browser.newContext({ viewport: { width: o.vw, height: o.vh }, deviceScaleFactor: o.dsf });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(([look, render, density]) => {
    localStorage.setItem('coding-misk-lang', '"en"'); localStorage.setItem('coding-misk-look', JSON.stringify(look)); localStorage.setItem('coding-misk-render', JSON.stringify(render));
    if (density === 'normal') localStorage.removeItem('coding-misk-render-density'); else localStorage.setItem('coding-misk-render-density', JSON.stringify(density));
  }, [look, render, density]);
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelector('strudel-editor') && document.querySelector('strudel-editor').editor && globalThis.codingMiskVisuals, null, { timeout: 30000 });
  await sleep(2000);
  await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
  await page.locator('#looks').selectOption(look); await page.locator('#renders').selectOption(render); await sleep(200);
  // the stage at the output's size (full screen: the whole viewport)
  await page.addStyleTag({ content: `#stage{position:fixed!important;left:0!important;top:0!important;width:${o.box[0]}px!important;height:${o.box[1]}px!important;z-index:2147483000!important;max-width:none!important;max-height:none!important}` });
  await page.evaluate(() => document.querySelector('#play').click());
  await sleep(500);
  await page.evaluate(() => { globalThis.codingMiskPassTimes.length = 0; });
  const t0 = Date.now(); let lightAt = null;
  while (Date.now() - t0 < SECONDS * 1000) { await sleep(500); if (lightAt === null && (await page.evaluate(() => globalThis.codingMiskVisuals.lightForm))) lightAt = (Date.now() - t0) / 1000; }
  const r = await page.evaluate(() => ({ passes: globalThis.codingMiskPassTimes.slice(), light: globalThis.codingMiskVisuals.lightForm }));
  const S = await sizesIn(page, render, r.light);
  const png = await crop(page);
  await page.evaluate(() => document.querySelector('#play').click()).catch(() => {});
  await ctx.close();
  return { S, ms: median(r.passes), n: r.passes.length, light: r.light ? `on at ${lightAt ?? '?'} s` : 'off', png, errors };
}

async function videoCase(page, o, look, render, density) {
  const frames = Math.min(SECONDS * 30, 300);
  const r = await page.evaluate(async ({ look, render, w, h, frames, density }) => {
    const { noteStore } = await import('/src/visuals/stage-feed.js');
    const V = globalThis.codingMiskVisuals, store = noteStore();
    for (let c = 0; c < 64; c++) for (const [inst, step, p] of [['bass', 0.25, 36], ['kick', 0.25, 'bd'], ['hats', 0.125, 'hh'], ['hook', 0.375, 67]]) for (let b = c; b < c + 1 - 1e-9; b += step) store.add(inst, [+b.toFixed(4), +(b + 0.1).toFixed(4), p, 0.7]);
    const pulse = t => Math.exp(-((t * 2) % 1) * 4);
    const feedAt = t => { const wave = new Float32Array(256), hook = new Float32Array(128); for (let i = 0; i < 256; i++) wave[i] = 0.35 * Math.sin((t * 12000 + i * 2) / 40); for (let i = 0; i < 128; i++) hook[i] = 0.3 * Math.sin(i / 5 + t); const p = pulse(t); return { raw: { kick: 0.05 * p, bass: 0.03, hats: 0.02, pad: 0.02, hook: 0.02 * (1 - p), arp: 0.015 }, wave, hook, store }; };
    if (document.fonts) { await document.fonts.load('600 14px "JetBrains Mono"'); await document.fonts.ready; }
    const tiny = document.createElement('canvas'); tiny.width = tiny.height = 1; const tx = tiny.getContext('2d', { willReadFrequently: true });
    V.hold(true); V.setTarget({ w, h });
    const P = globalThis.codingMiskPassTimes; P.length = 0;
    try {
      for (let f = 0; f < frames; f++) { const t = 4 + f / 30; V.drawAt({ now: t * 1000, cyc: t / 2, look, feed: feedAt(t), dt: 1 / 30, render, light: 'off', density }); tx.drawImage(V.canvas, 0, 0, 1, 1); tx.getImageData(0, 0, 1, 1); }
      return { passes: P.slice() };
    } finally { /* the target stays for the sizes and the crop */ }
  }, { look, render, w: o.target[0], h: o.target[1], frames, density });
  const S = await sizesIn(page, render, false), png = await crop(page);
  await page.evaluate(() => { globalThis.codingMiskVisuals.setTarget(null); globalThis.codingMiskVisuals.hold(false); });
  return { S, ms: median(r.passes), n: r.passes.length, light: 'never (fast video)', png, errors: [] };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const rows = [];
  const line = (o, look, render, density, r) => {
    const S = r.S, d = S.dpr || 1, f = v => (Number.isFinite(v) ? +v.toFixed(2) : '-');
    const cell = S.crt ? `scanline ${f(S.cellH)} dev / ${f(S.cellH / d)} log` : `${f(S.cellW)}×${f(S.cellH)} dev / ${f(S.cellW / d)}×${f(S.cellH / d)} log`;
    const row = `| ${o.name} | ${look} | ${render} | ${density} | ${cell} | ${S.rows ?? '-'}×${S.cols ?? '-'} | ${f(r.ms)} ms (${r.n}) | ${r.light} |`;
    rows.push(row); console.log(row);
    if (r.errors.length) console.log(`      page errors: ${r.errors.join('; ')}`);
  };
  console.log('| output | look | render | density | cell (device / logical px) | rows×cols | median pass | light form |\n| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const key of OUTPUTS) {
    const o = OUT[key];
    if (o.target) {
      const ctx = await browser.newContext({ viewport: { width: o.vw, height: o.vh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.addInitScript(() => localStorage.setItem('coding-misk-lang', '"en"'));
      await page.goto(URL);
      await page.waitForFunction(() => globalThis.codingMiskVisuals, null, { timeout: 30000 }); await sleep(2000);
      for (const density of DENSITIES) for (const look of LOOKS) for (const render of RENDERS) {
        const r = await videoCase(page, o, look, render, density);
        line(o, look, render, density, r); savePng(`${LABEL}-${key}-${look}-${render}-${density}.png`, r.png);
      }
      await ctx.close();
    } else for (const density of DENSITIES) for (const look of LOOKS) for (const render of RENDERS) {
      const r = await stageCase(browser, o, look, render, density);
      line(o, look, render, density, r); savePng(`${LABEL}-${key}-${look}-${render}-${density}.png`, r.png);
    }
  }
  if (SHOTS) fs.writeFileSync(`${SHOTS}/${LABEL}-table.md`, rows.join('\n') + '\n');
  await browser.close();
})();
