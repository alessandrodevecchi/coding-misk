// The Oscilloscope look in the browser (oscilloscope-visual, task 2.6): the menu, the module loaded only when picked, the
// overlays and modes from the Settings card, a reload, and a 9:16 fragment with no frame drawn black; --cost measures it.
// In detail:
//  - the look is in the visual menu and picked from it; its module is not loaded before (no request, not ready);
//  - every overlay and both modes switch from the Settings card without page errors, and the stage changes with them;
//  - a reload keeps the look and the settings;
//  - a 9:16 fragment with the look, exported from a page that never showed it, has a beam from its first frame (the
//    module loaded before the first fast-video frame: no frame drawn black) and frames that are not empty;
//  - with --cost: the look's frame time at 1080p and 4K (median and p95, with the load average), each overlay with the
//    defaults and with Glow 1 on Real oscilloscope.
// Usage: PORT=5420 PLAYWRIGHT_CORE=... node tools/check-oscilloscope.cjs [shots-dir] [--cost] [--no-video|--video-only]
//   (dev server on PORT, default 5173; ffmpeg for the fragment)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), SHOTS = args.find(a => !a.startsWith('--')) || '';
const COST = args.includes('--cost'), VIDEO = !args.includes('--no-video'), VIDEO_ONLY = args.includes('--video-only');
const PORT = process.env.PORT || 5173, URL0 = `http://localhost:${PORT}/`;
const KEY = 'coding-misk-oscilloscope', OVERLAYS = ['empty', 'graticule', 'smudged', 'smudged-graticule', 'real', 'vector'];
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const load = () => os.loadavg().map(x => x.toFixed(1)).join(' ');
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : NaN; };
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.locator('#stagewrap').screenshot({ path: path.join(SHOTS, name) }); };

async function open(browser, store = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage(), errors = [], requests = [], logs = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/visuals\/oscilloscope\.js/.test(r.url())) requests.push(r.url()); });
  page.on('console', m => { if (/oscilloscope/i.test(m.text())) logs.push(m.text()); });
  page.on('download', d => downloads.push(d));
  await page.goto(URL0); await sleep(1500);
  await page.evaluate(s => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, store);
  await page.reload(); await sleep(3000);
  return { ctx, page, errors, requests, logs, downloads };
}
const play = async page => { if (!(await page.evaluate(() => document.querySelector('strudel-editor').editor.repl.scheduler.started))) await page.click('#play'); await sleep(1500); };
// the stage's picture: mean brightness, the share of lit pixels and a signature for comparing two pictures
const picture = page => page.evaluate(() => {
  const c = globalThis.codingMiskVisuals.canvas, w = 96, h = Math.max(1, Math.round(96 * c.height / c.width));
  const o = document.createElement('canvas'); o.width = w; o.height = h;
  const x = o.getContext('2d'); x.drawImage(c, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  let sum = 0, lit = 0; const sig = [];
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += v; if (v > 40) lit++; sig.push(v); }
  return { mean: sum / (w * h), lit: lit / (w * h), sig };
});
const differ = (a, b) => { let n = 0; for (let i = 0; i < Math.min(a.sig.length, b.sig.length); i++) n += Math.abs(a.sig[i] - b.sig[i]); return n / Math.max(1, Math.min(a.sig.length, b.sig.length)); };
const ready = page => page.evaluate(() => !!(globalThis.codingMiskOscReady && globalThis.codingMiskOscReady()));
async function settings(page, open = true) {
  const on = (await page.getAttribute('#open-settings', 'aria-pressed')) === 'true';
  if (on !== open) { await page.click('#open-settings'); await sleep(500); }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1. the menu, the module loaded only when picked
  if (!VIDEO_ONLY) {
    const s = await open(browser, { 'coding-misk-look': 'palco' }), { page } = s;
    const listed = await page.evaluate(() => [...document.querySelectorAll('#looks option')].map(o => o.value));
    check(listed.includes('oscilloscope'), 'Oscilloscope is in the visual menu');
    await page.locator('#track-pick').selectOption('kellerlicht'); await sleep(300);
    await page.selectOption('#looks', 'palco');
    await play(page); await sleep(1500);
    check(!s.requests.length && !(await ready(page)), 'the module is not loaded while another look shows', s.requests.join(' '));
    await page.selectOption('#looks', 'oscilloscope');
    let t = 0; while (!(await ready(page)) && t < 50) { await sleep(100); t++; }
    check(await ready(page), 'picked from the menu, the module loads', `${t * 100} ms, ${s.requests.length} request`);
    await sleep(1500);
    const base = await picture(page);
    check(base.lit > 0.002, 'the beam is drawn on the stage', `mean ${base.mean.toFixed(1)}, lit ${(base.lit * 100).toFixed(2)} %`);
    await shot(page, 'osc-real-sweep.png');

    // 2. every overlay and both modes from the Settings card
    await settings(page, true);
    check(await page.isVisible('#set-oscilloscope'), 'the Settings card is shown');
    const pics = {};
    for (const ov of OVERLAYS) {
      await page.selectOption('#set-oscilloscope [data-osc-opt="overlay"]', ov); await sleep(700);
      const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').overlay, KEY);
      pics[ov] = await picture(page);
      check(stored === ov && pics[ov].mean > 0.5, `overlay ${ov}: stored and drawn`, `mean ${pics[ov].mean.toFixed(1)}`);
      await shot(page, `osc-${ov}.png`);
    }
    const pairs = [['empty', 'graticule'], ['graticule', 'real'], ['real', 'vector'], ['smudged', 'empty']].map(([a, b]) => [a, b, differ(pics[a], pics[b])]);
    check(pairs.every(p => p[2] > 0.3), 'the overlays draw different screens', pairs.map(p => `${p[0]}/${p[1]} ${p[2].toFixed(1)}`).join(', '));
    // (the modes on Real oscilloscope: the Vector display's tube is dark)
    await page.selectOption('#set-oscilloscope [data-osc-opt="overlay"]', 'real'); await sleep(500);
    const modes = {};
    for (const m of ['xy', 'sweep']) {
      await page.click(`#set-oscilloscope [data-osc-mode="${m}"]`); await sleep(1200);
      const st = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').mode, KEY), p = modes[m] = await picture(page);
      check(st === m && p.lit > 0.002, `mode ${m}: stored and the beam drawn`, `lit ${(p.lit * 100).toFixed(2)} %`);
      if (m === 'xy') await shot(page, 'osc-xy.png');
    }
    check(differ(modes.xy, modes.sweep) > 0.3, 'XY and Sweep draw different beams', differ(modes.xy, modes.sweep).toFixed(1));
    // a slider and a link: the stored value follows
    await page.evaluate(() => { const r = document.querySelector('#set-oscilloscope [data-osc-val="hue"]'); r.value = '30'; r.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.selectOption('#set-oscilloscope [data-osc-link="glow"]', 'bar'); await sleep(600);
    const S = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
    check(S.values && S.values.hue === 30 && S.links && S.links.glow === 'bar', 'a slider and a link are stored', JSON.stringify({ hue: S.values && S.values.hue, glow: S.links && S.links.glow }));
    await page.selectOption('#set-oscilloscope [data-osc-opt="overlay"]', 'vector'); await sleep(300);
    await settings(page, false);
    check(!s.errors.length, 'no page errors while switching overlays and modes', s.errors.join('; '));

    // 3. a reload keeps the look and the settings
    await page.reload(); await sleep(3500);
    const kept = await page.evaluate(k => ({ look: document.querySelector('#looks').value, S: JSON.parse(localStorage.getItem(k) || '{}') }), KEY);
    check(kept.look === 'oscilloscope' && kept.S.overlay === 'vector' && kept.S.mode === 'sweep' && kept.S.values.hue === 30 && kept.S.links.glow === 'bar', 'a reload keeps the look and the settings', JSON.stringify({ look: kept.look, overlay: kept.S.overlay, mode: kept.S.mode }));
    await settings(page, true);
    const card = await page.evaluate(() => ({ ov: document.querySelector('#set-oscilloscope [data-osc-opt="overlay"]').value, hue: document.querySelector('#set-oscilloscope [data-osc-val="hue"]').value }));
    check(card.ov === 'vector' && card.hue === '30', 'the card shows the kept settings after the reload', JSON.stringify(card));
    await settings(page, false);

    // 4. cost (--cost): frame time at 1080p and 4K
    if (COST) {
      await page.locator('#track-pick').selectOption('kellerlicht'); await sleep(300); await page.selectOption('#looks', 'oscilloscope');
      await play(page);
      const rows = [];
      const measure = async (label, store, size) => {
        await page.evaluate(([k, v, size]) => { localStorage.setItem(k, JSON.stringify(v)); globalThis.codingMiskOscFlush = true; globalThis.codingMiskVisuals.setTarget(size); }, [KEY, store, size]);
        await sleep(1000); await page.evaluate(() => { globalThis.codingMiskOscTimes.length = 0; });
        await sleep(4000);
        const tt = await page.evaluate(() => globalThis.codingMiskOscTimes.slice());
        rows.push({ label, size: `${size.w}×${size.h}`, frames: tt.length, median: +median(tt).toFixed(2), p95: +p95(tt).toFixed(2), load: load() });
        console.log(`      ${label} at ${size.w}×${size.h}: median ${median(tt).toFixed(2)} ms, p95 ${p95(tt).toFixed(2)} ms over ${tt.length} frames, load ${load()}`);
      };
      for (const size of [{ w: 1920, h: 1080 }, { w: 3840, h: 2160 }]) {
        for (const ov of OVERLAYS) await measure(`${ov}, defaults`, { overlay: ov }, size);
        await measure('real, Glow 1', { overlay: 'real', values: { glow: 1 }, links: { glow: 'static' } }, size);
        await measure('real, XY, Glow 1', { overlay: 'real', mode: 'xy', values: { glow: 1 }, links: { glow: 'static' } }, size);
      }
      const cdp = await s.ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await measure('real, Glow 1, CPU slowed 4×', { overlay: 'real', values: { glow: 1 }, links: { glow: 'static' } }, { w: 1920, h: 1080 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.evaluate(() => globalThis.codingMiskVisuals.setTarget(null));
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'osc-cost.json'), JSON.stringify(rows, null, 2));
    }
    await s.ctx.close();
  }

  // 5. a 9:16 fragment with the look, from a page that never showed it: a beam from the first frame
  if (VIDEO) {
    const s = await open(browser, { 'coding-misk-look': 'palco', 'coding-misk-export-speed': 'fast', 'coding-misk-export-format': 'wav' }), { page } = s;
    check(!(await ready(page)), 'the fragment\'s page has not loaded the module before the export');
    await page.evaluate(o => globalThis.codingMiskClips.fragments(o), { source: 'kellerlicht', quiet: true, render: 'normal', from: 30, to: 34, look: 'oscilloscope' });
    let d = null;
    for (let i = 0; i < 600 && !d; i++) { d = s.downloads.find(x => /fragment \d+\.mp4$/.test(x.suggestedFilename())); if (!d) await sleep(500); }
    check(!!d, 'the fragment with the Oscilloscope look is saved');
    if (d) {
      const f = path.join(os.tmpdir(), `osc-frag-${Date.now()}.mp4`); await d.saveAs(f);
      // (the picture's band of the 9:16 frame, as check-stage-video.cjs: the label and the code are elsewhere)
      const band = t => execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', f, '-frames:v', '1', '-vf', 'crop=iw:ih*0.34:0:ih*0.32,scale=48:32', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
      const lit = b => { let n = 0; for (let i = 0; i < b.length; i += 3) if ((b[i] + b[i + 1] + b[i + 2]) / 3 > 40) n++; return n / (b.length / 3); };
      // (the first second carries the fragment's intro text over the stage: the frames after it)
      const later = [1.5, 2.5, 3.5].map(t => lit(band(t))), black = await page.evaluate(() => globalThis.codingMiskOscBlack || 0);
      check(black === 0, 'no frame of the fragment drawn black while the module loads (loaded before the first frame)', `${black} black frames`);
      check(later.every(x => x > 0.004), 'the fragment\'s frames are not empty', later.map(x => `${(x * 100).toFixed(2)} %`).join(', '));
      check(s.logs.some(l => /loaded before the first frame/.test(l)), 'the export says the module was loaded first', s.logs.slice(-2).join(' | '));
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '2', '-i', f, '-frames:v', '1', path.join(SHOTS, 'osc-fragment.png')]); }
      fs.rmSync(f, { force: true });
    }
    // (--cost: the same fragment with Palco and with the look, the export time and the load average)
    if (COST) {
      const times = {};
      for (const look of ['palco', 'oscilloscope', 'palco', 'oscilloscope']) {
        const t0 = Date.now();
        await page.evaluate(o => globalThis.codingMiskClips.fragments(o), { source: 'kellerlicht', quiet: true, render: 'normal', from: 30, to: 38, look });
        let got = null;
        for (let i = 0; i < 600 && !got; i++) { got = s.downloads.find(x => /fragment \d+\.mp4$/.test(x.suggestedFilename())); if (!got) await sleep(250); }
        if (got) s.downloads.splice(s.downloads.indexOf(got), 1);
        (times[look] = times[look] || []).push((Date.now() - t0) / 1000);
      }
      const best = k => Math.min(...times[k]);
      console.log(`      fragment of 8 s at 1080×1920: Palco ${best('palco').toFixed(1)} s, Oscilloscope ${best('oscilloscope').toFixed(1)} s (${(best('oscilloscope') / best('palco')).toFixed(2)}×, best of two), load ${load()}`);
    }
    check(!s.errors.length, 'no page errors in the export', s.errors.join('; '));
    await s.ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
