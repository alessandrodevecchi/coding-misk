// THROWAWAY: test video of the two widgets over the "Code over" layout, recorded through the app with audio from the
// master and sync marks (flash + beep), after the #79 demo scripts. usage: node rec.cjs <wide|tall> <rawdir>
const L = require('./lib.cjs');
const fs = require('fs'), path = require('path');
const [FORMAT, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const wide = FORMAT === 'wide';
const W = wide ? 1920 : 1080, H = wide ? 1080 : 1920, AREA = wide ? 'left' : 'full';
const D = { grid: { on: true, steps: 16, bars: 1, style: 'blocks', names: 'short', extra: [], size: 1 }, chroma: { on: true, from: 'melodic', cols: 40, ramp: ' .:-=+*#%@', norm: 'column', decay: 0.25, labels: true, chord: true, order: 'high', bars: 2, size: 1 }, caption: '' };
const SCREENS = wide ? [
  { t: '1 · kellerlicht · Palco · NEON · griglia 16 passi, croma di tutti i melodici', song: 'kellerlicht', look: 'palco', render: 'normal', ui: 'neon', cov: { theme: 'neon', ...D } },
  { t: '2 · kellerlicht · griglia a caratteri, croma a blocchi ░▒▓█', cov: { grid: { style: 'text' }, chroma: { ramp: ' ░▒▓█' } } },
  { t: '3 · kellerlicht · griglia con il basso come riga, croma solo del basso', cov: { grid: { style: 'blocks', extra: ['bass'] }, chroma: { ramp: ' .:-=+*#%@', from: ['bass'] } } },
  { t: '4 · settimo-cielo · Tramonto · HW · croma di tutti i melodici', song: 'settimo-cielo', look: 'tramonto', render: 'normal', ui: 'hw', cov: { theme: 'hw', ...D } },
  { t: '5 · settimo-cielo · croma solo della chitarra, griglia 2 battute', cov: { grid: { bars: 2, size: 0.8 }, chroma: { from: ['guitar'] } } },
  { t: '6 · pioggia-sul-vetro · Montagne · CHIARO · croma dei pad (nome dell\'accordo)', song: 'pioggia-sul-vetro', look: 'montagne', render: 'normal', ui: 'light', cov: { theme: 'light', ...D, chroma: { ...D.chroma, from: ['pad'] } } },
  { t: '7 · pioggia-sul-vetro · croma del tema (hook), scala in finestra, scia lunga', cov: { chroma: { from: ['hook'], norm: 'window', decay: 0.6 } } },
  { t: '8 · insert-coin · Pixel · NEON · render Terminale, griglia a caratteri', song: 'insert-coin', look: 'pixel', render: 'terminal', ui: 'neon', cov: { theme: 'neon', ...D, grid: { ...D.grid, style: 'text' } } },
  { t: '9 · insert-coin · render LED, croma degli arpeggi', render: 'led', cov: { grid: { style: 'blocks' }, chroma: { from: ['arp'] } } },
  { t: '10 · ferro · Edgerunners · NEON · render 1-bit, croma della chitarra', song: 'ferro', look: 'edgerunners', render: 'bit', ui: 'neon', cov: { theme: 'neon', ...D, chroma: { ...D.chroma, from: ['guitar'] } } },
] : [
  { t: '1 · kellerlicht · Pixel · NEON', song: 'kellerlicht', look: 'pixel', render: 'normal', ui: 'neon', cov: { theme: 'neon', ...D } },
  { t: '2 · settimo-cielo · Spazio · HW · croma della chitarra', song: 'settimo-cielo', look: 'spazio', render: 'normal', ui: 'hw', cov: { theme: 'hw', ...D, chroma: { ...D.chroma, from: ['guitar'], cols: 36 } } },
  { t: '3 · pioggia-sul-vetro · Edgerunners · CHIARO · croma dei pad', song: 'pioggia-sul-vetro', look: 'edgerunners', render: 'normal', ui: 'light', cov: { theme: 'light', ...D, chroma: { ...D.chroma, from: ['pad'], cols: 36 } } },
  { t: '4 · insert-coin · Sonar · NEON · render ASCII, griglia a caratteri', song: 'insert-coin', look: 'sonar', render: 'ascii', ui: 'neon', cov: { theme: 'neon', ...D, grid: { ...D.grid, style: 'text' }, chroma: { ...D.chroma, cols: 36 } } },
];
const SECS = wide ? 15 : 16;

(async () => {
  const { browser, ctx, page, errors } = await L.open({ width: W, height: H, video: OUT });
  await L.overlay(page, { area: AREA });
  await page.addStyleTag({ content: '#cov-flash{position:fixed;inset:0;background:#fff;z-index:100000;display:none}' });
  await page.evaluate(() => { const f = document.createElement('div'); f.id = 'cov-flash'; document.body.appendChild(f); });
  // recorder on the master + marker (white flash and beep at the same audio time)
  await page.evaluate(() => {
    const ac = getAudioContext(), dest = ac.createMediaStreamDestination();
    const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    let node = null;
    const tap = () => { try { const n = getSuperdoughAudioController().output.destinationGain; if (n && n !== node) { n.connect(dest); node = n; } } catch (e) {} };
    window.__tapIv = setInterval(tap, 100); tap();
    window.__marker = () => new Promise(res => {
      const T = ac.currentTime + 0.4, o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 1000; g.gain.value = 0.5; o.connect(g); g.connect(dest); o.start(T); o.stop(T + 0.08);
      const f = document.getElementById('cov-flash');
      const check = () => { if (ac.currentTime >= T) { f.style.display = 'block'; setTimeout(() => { f.style.display = 'none'; res(); }, 80); } else requestAnimationFrame(check); };
      requestAnimationFrame(check);
    });
    rec.start(500);
    window.__recStop = () => new Promise(res => {
      rec.onstop = async () => {
        clearInterval(window.__tapIv);
        const u = new Uint8Array(await new Blob(chunks).arrayBuffer());
        let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        res(btoa(bin));
      };
      rec.stop();
    });
  });
  const t0 = Date.now(), marks = [];
  const T = () => (Date.now() - t0) / 1000;
  await L.sleep(600);
  await page.evaluate(() => window.__marker()); marks.push({ label: 'marker-start', t: T() });
  for (const s of SCREENS) {
    if (s.ui) await L.ui(page, s.ui);
    if (s.song) { await L.title(page, ''); await L.song(page, s.song); await L.play(page); await L.sleep(1500); await L.seek(page, 420); await L.sleep(9000); }
    if (s.look) await L.look(page, s.look);
    if (s.render) await L.render(page, s.render);
    await L.set(page, s.cov); await L.title(page, s.t); await L.sleep(1200);
    marks.push({ label: s.t, t: T(), secs: SECS }); console.log(T().toFixed(1), s.t);
    await L.sleep(SECS * 1000);
  }
  await L.title(page, '');
  await page.evaluate(() => window.__marker()); marks.push({ label: 'marker-end', t: T() });
  await L.sleep(1000);
  const audio = await page.evaluate(() => window.__recStop());
  fs.writeFileSync(path.join(OUT, 'audio.webm'), Buffer.from(audio, 'base64'));
  const v = page.video(); await ctx.close(); await browser.close();
  fs.renameSync(await v.path(), path.join(OUT, 'video.webm'));
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ marks, errors }, null, 1));
  console.log('errors', errors.slice(0, 8));
})().catch(e => { console.error(e); process.exit(1); });
