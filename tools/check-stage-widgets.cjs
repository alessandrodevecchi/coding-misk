// Browser checks for the widget looks (widgets-on-stage, #79): Monitor and Rullo drawn from a made-up feed at 1, 3 and 6
// instruments in 16:9 and 9:16 (frames saved as PNG with a shots dir), the same frame alone and in a sequence, the
// frame time against the Palco look (budget: 4 ms), the looks live on two songs (panels, no page errors, frame time),
// and a fast video fragment on each look against the Palco look (time within 10%, the log line of the scopes).
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-stage-widgets.cjs [shots-dir] [--no-video]   (dev server on PORT)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), SHOTS = args.find(a => !a.startsWith('--')) || null, NO_VIDEO = args.includes('--no-video');
const URL = `http://localhost:${process.env.PORT || 5173}/`;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

async function open(browser, { lang = 'it', ui = 'neon', look = 'monitor', width = 1440, height = 900 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], logs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => logs.push(m.text()));
  await page.addInitScript(([l, u, k]) => {
    if (sessionStorage.getItem('sw-init')) return;
    sessionStorage.setItem('sw-init', '1');
    localStorage.setItem('coding-misk-lang', l); localStorage.setItem('coding-misk-ui', JSON.stringify(u)); localStorage.setItem('coding-misk-look', JSON.stringify(k));
  }, [lang, ui, look]);
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelector('strudel-editor') && document.querySelector('strudel-editor').editor && globalThis.codingMiskVisuals, null, { timeout: 30000 });
  await sleep(2500);
  return { page, errors, logs };
}

// draws frames of a look from a made-up feed: n instruments, at the frame size w×h; returns timings, hashes and PNGs
// gpu: the frame time as drawn on a fresh canvas (no read back), as the stage and the videos draw; else each frame waits
// for its drawing with one pixel read back (the canvas then draws on the CPU, slower for every look)
const synth = (page, o) => page.evaluate(async ({ look, n, w, h, times, png, seq, gpu }) => {
  const { noteStore } = await import('/src/visuals/stage-feed.js');
  const V = globalThis.codingMiskVisuals, store = noteStore();
  const INSTS = ['bass', 'hook', 'kick', 'arp', 'hats', 'pad', 'snare', 'guitar'].slice(0, n);
  const MEL = { bass: [36, 36, 43, 41], hook: [64, 67, 69, 72, 71, 67], arp: [60, 63, 67, 70, 72, 67, 63, 58], guitar: [52, 55, 57, 59], pad: [48, 51, 55] };
  for (let c = 0; c < 96; c++) for (const inst of INSTS) {
    const step = { bass: 0.25, hook: 0.375, arp: 0.125, kick: 0.25, hats: 0.125, snare: 0.5, guitar: 0.5, pad: 1 }[inst], len = { bass: 0.2, hook: 0.3, arp: 0.1, pad: 1, guitar: 0.4 }[inst] || 0.05;
    for (let b = c + (inst === 'snare' ? 0.25 : 0); b < c + 1 - 1e-9; b += step) {
      const k = Math.round(b / step), m = MEL[inst];
      if (inst === 'pad') { for (const p of m) store.add(inst, [b, b + len, p + (c % 2) * 2, 0.6]); continue; }
      store.add(inst, [+b.toFixed(4), +(b + len).toFixed(4), m ? m[k % m.length] : inst === 'kick' ? 'bd' : inst === 'hats' ? 'hh' : 'sd', 0.5 + (k % 3) * 0.2]);
    }
  }
  // a made-up song wave: a low tone and a brighter one, pulsing with the beat (the spectrum columns move with it)
  const pulse = t => Math.exp(-((t * 2) % 1) * 4), sig = (t, x) => (0.35 * Math.sin(x / 40) + 0.12 * Math.sin(x / 7.3) * pulse(t) + 0.05 * Math.sin(x / 2.1) * ((t * 4) % 1 < 0.2 ? 1 : 0));
  const waveAt = (t, m = 128) => { const out = new Float32Array(m); for (let i = 0; i < m; i++) out[i] = sig(t, t * 12000 - (m - i)); return out; };
  const feedAt = t => { const wave = new Float32Array(256), hook = new Float32Array(128); for (let i = 0; i < 256; i++) wave[i] = sig(t, t * 12000 + i * 2); return { raw: {}, wave, hook, store, waveAt }; };
  const bpm = 120, cycAt = t => t * bpm / 240;
  // the font of the panels is loaded before the frames compared
  if (document.fonts) { await document.fonts.load('600 14px "JetBrains Mono"'); await document.fonts.ready; }
  V.hold(true); V.setTarget({ w, h });
  const hash = () => { const c = V.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x = 0; for (let i = 0; i < d.length; i += 3) x = (Math.imul(x, 31) + d[i]) >>> 0; return x; };
  // (the time of a frame with its drawing finished: one pixel read back waits for it)
  const draw = t => { const t0 = performance.now(); V.drawAt({ now: t * 1000, cyc: cycAt(t), look, feed: feedAt(t), dt: 1 / 30 }); if (!gpu) V.canvas.getContext('2d').getImageData(0, 0, 1, 1); return performance.now() - t0; };
  const out = { times: [], hashes: {}, png: null, panels: null };
  try {
    // Chrome moves a canvas read back a few times from the GPU to the CPU, which smooths edges a little differently:
    // three reads first, so every compared frame is drawn the same way
    if (!gpu) for (let k = 0; k < 3; k++) { draw(0.5); hash(); }
    // alone, then in a sequence, then alone again
    for (const t of times) { draw(t); out.hashes[`alone:${t}`] = hash(); }
    if (seq) for (let f = 0; f < seq * 30; f++) { const t = 4 + f / 30; out.times.push(draw(t)); for (const x of times) if (Math.abs(x - t) < 1e-6) out.hashes[`seq:${x}`] = hash(); }
    for (const t of times) { draw(t); out.hashes[`again:${t}`] = hash(); }
    out.panels = globalThis.codingMiskStagePanels || null;
    if (png) { draw(png); out.png = V.canvas.toDataURL('image/png'); }
  } finally { V.setTarget(null); V.hold(false); }
  return out;
}, o);
const savePng = (file, url) => { if (SHOTS && url) fs.writeFileSync(`${SHOTS}/${file}`, Buffer.from(url.split(',')[1], 'base64')); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const budget = {};

  // 1. made-up feed: layouts, determinism, frame time, screenshots (Italian, neon and hardware)
  for (const ui of ['neon', 'hw']) {
    const { page, errors } = await open(browser, { ui });
    for (const look of ['monitor', 'rullo']) for (const [aspect, w, h] of [['16x9', 1920, 1080], ['9x16', 1080, 1920]]) for (const n of [1, 3, 6]) {
      const first = ui === 'neon' && aspect === '16x9' && n === 6;
      const r = await synth(page, { look, n, w, h, times: [5, 6.5], png: 7.3, seq: first ? 4 : 0 });
      savePng(`fatto-${look}-${aspect}-${ui}-${n}.png`, r.png);
      if (look === 'monitor') check(Array.isArray(r.panels) && r.panels.length === n, `${look} ${aspect} ${ui}: ${n} panels`, JSON.stringify(r.panels));
      const same = [5, 6.5].every(t => r.hashes[`alone:${t}`] === r.hashes[`again:${t}`] && (!first || r.hashes[`seq:${t}`] === r.hashes[`alone:${t}`]));
      check(same, `${look} ${aspect} ${ui} ${n}: the same frame alone${first ? ', in a sequence' : ''} and drawn again`, JSON.stringify(r.hashes));
      if (first) budget[`${look}Cpu`] = median(r.times);
    }
    if (ui === 'neon') {
      // D10: each widget look at most 4 ms a frame at 1080p with 6 instruments, and never slower than the Palco look
      // (the reference), both on a fresh canvas and with the drawing waited for on the CPU
      for (const look of ['palco', 'monitor', 'rullo']) budget[look] = median((await synth(page, { look, n: 6, w: 1920, h: 1080, times: [], seq: 6, gpu: true })).times);
      budget.palcoCpu = median((await synth(page, { look: 'palco', n: 6, w: 1920, h: 1080, times: [], seq: 4 })).times);
      for (const look of ['monitor', 'rullo']) {
        check(budget[look] <= 4 && budget[look] <= Math.max(budget.palco, 0.5) * 1.2, `${look}: median frame ${budget[look].toFixed(2)} ms at 1080p, 6 instruments (budget 4 ms; Palco ${budget.palco.toFixed(2)} ms)`);
        check(budget[`${look}Cpu`] <= budget.palcoCpu * 1.1, `${look}: drawing waited for, ${budget[`${look}Cpu`].toFixed(2)} ms, not slower than Palco (${budget.palcoCpu.toFixed(2)} ms)`);
      }
    }
    check(!errors.length, `no page errors (${ui}, made-up feed)`, errors.join('; '));
    await page.close();
  }

  // 2. live: two songs on each look, panels from the playing pattern, frame time
  for (const [song, look] of [['luci-rosse', 'monitor'], ['kellerlicht', 'rullo'], ['kellerlicht', 'monitor'], ['luci-rosse', 'rullo']]) {
    const { page, errors } = await open(browser, { look });
    // a song brings its own look: the look is chosen after it
    await page.locator('#track-pick').selectOption(song); await sleep(800);
    await page.locator('#looks').selectOption(look); await sleep(300);
    await page.evaluate(() => { globalThis.codingMiskStageTimes.length = 0; });
    await page.click('#play'); await sleep(9000);
    const s = await page.evaluate(() => ({ times: (globalThis.codingMiskStageTimes || []).slice(-200), panels: globalThis.codingMiskStagePanels || null, notes: globalThis.codingMiskStageNotes || 0, cyc: document.querySelector('strudel-editor').editor.repl.scheduler.now() }));
    const med = median(s.times);
    check(s.times.length > 50 && med <= 4, `live ${song} on ${look}: median frame ${med.toFixed(2)} ms (budget 4 ms)`, `${s.times.length} frames`);
    if (look === 'monitor') check(Array.isArray(s.panels) && s.panels.length >= 1 && s.panels.length <= 6, `live ${song} on monitor: panels of the playing instruments`, JSON.stringify(s.panels));
    else check(s.notes > 0, `live ${song} on rullo: notes from the playing pattern`, `${s.notes} notes`);
    if (SHOTS) await page.locator('#stage').screenshot({ path: `${SHOTS}/fatto-live-${look}-${song}.png` });
    check(!errors.length, `no page errors (live ${song} on ${look})`, errors.join('; '));
    await page.close();
  }

  // 3. fast video: a 10 s fragment on each widget look and on Palco (time within 10%), the scopes' log line
  if (!NO_VIDEO) {
    const { page, errors, logs } = await open(browser, { look: 'palco' });
    const run = look => page.evaluate(async look => { const t0 = performance.now(); const r = await globalThis.codingMiskClips.fragments({ source: 'luci-rosse', from: 8, to: 18, quiet: true, files: ['video'], look, show: 'visual' }); return { ms: performance.now() - t0, r: JSON.stringify(r).slice(0, 200) }; }, look);
    // the files: a frame of each widget look's fragment is saved as a picture with a shots dir (ffmpeg)
    const files = {};
    let current = null;
    page.on('download', async d => { if (!SHOTS || !current) { d.cancel().catch(() => {}); return; } const f = require('path').join(require('os').tmpdir(), `sw-${current}.mp4`); files[current] = d.saveAs(f).then(() => f, () => null); });
    const t = {};
    // a first run warms the render page up
    await run('palco');
    for (const look of ['palco', 'monitor', 'rullo']) {
      current = look;
      t[look] = await run(look); console.log(`      fast fragment on ${look}: ${(t[look].ms / 1000).toFixed(1)} s`);
      const drawn = await page.evaluate(() => ({ panels: globalThis.codingMiskStagePanels || [], notes: globalThis.codingMiskStageNotes || 0 }));
      if (look === 'monitor') check(drawn.panels.length >= 2, 'fast video on monitor: panels from the render page\'s notes', JSON.stringify(drawn.panels));
      if (look === 'rullo') check(drawn.notes > 0, 'fast video on rullo: notes from the render page', `${drawn.notes} notes`);
    }
    for (const look of ['monitor', 'rullo']) {
      const f = files[look] && await files[look];
      if (!f) continue;
      try { require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '6', '-i', f, '-frames:v', '1', `${SHOTS}/fatto-fast-${look}-9x16.png`]); } catch (e) { console.log(`      (no frame from the ${look} fragment: ${e.message.split('\n')[0]})`); }
    }
    // the notes of the fast video against the notes the live player queries from the same song (Classic, as written)
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
    await page.click('#play'); await sleep(4000);
    const cmp = await page.evaluate(async () => {
      const { noteStore, liveNotes } = await import('/src/visuals/stage-feed.js');
      const e = document.querySelector('strudel-editor').editor, st = noteStore(), L = liveNotes(st);
      L.pump(e.repl.scheduler.pattern, 4, 9, 10);
      const fast = globalThis.codingMiskFastStageNotes, out = { same: 0, live: 0, fast: 0, diff: [] };
      for (const inst of st.instruments) {
        const key = n => `${n[0]}|${n[2]}|${n[3]}`, a = new Set(st.around(inst, 5, 8).filter(n => n[0] >= 5).map(key)), b = new Set(fast.around(inst, 5, 8).filter(n => n[0] >= 5).map(key));
        out.live += a.size; out.fast += b.size;
        for (const k of a) if (b.has(k)) out.same++; else if (out.diff.length < 6) out.diff.push(`${inst} live ${k}`);
        for (const k of b) if (!a.has(k) && out.diff.length < 6) out.diff.push(`${inst} fast ${k}`);
      }
      return out;
    });
    await page.click('#play');
    check(cmp.live > 20 && cmp.same === cmp.live && cmp.same === cmp.fast, 'live notes and fast video notes are the same, note by note (luci-rosse, bars 5 to 8)', `${cmp.same} same of ${cmp.live} live, ${cmp.fast} fast ${cmp.diff.join('; ')}`);
    for (const look of ['monitor', 'rullo']) check(t[look].ms <= t.palco.ms * 1.1, `fast video on ${look}: within 10% of Palco`, `${(t[look].ms / 1000).toFixed(1)} s against ${(t.palco.ms / 1000).toFixed(1)} s`);
    check(logs.some(l => l.includes('[fast video] monitor') && l.includes("song's wave")), 'fast video: the log says what the stage scopes read');
    check(!errors.length, 'no page errors (fast video)', errors.join('; '));
    await page.close();
  }
  console.log(`budget: ${JSON.stringify(Object.fromEntries(Object.entries(budget).map(([k, v]) => [k, +v.toFixed(2)])))}`);
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
