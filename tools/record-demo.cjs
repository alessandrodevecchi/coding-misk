// Requires playwright-core and Google Chrome. Set PLAYWRIGHT_CORE to the playwright-core path (see AGENTS.md).
// Registra una demo di coding-misk: video da Playwright, audio dall'uscita master di Strudel, cursore visibile.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const W = 1440, H = 900;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } } });
  // cursore finto: il video registrato non mostra il puntatore del sistema
  await ctx.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = `#demo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:transform .02s linear}
        .demo-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #ff2e88;pointer-events:none;z-index:2147483646;animation:demoR .5s ease-out forwards}
        @keyframes demoR{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}`;
      document.head.appendChild(st);
      const c = document.createElement('div'); c.id = 'demo-cursor';
      c.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2 L3 21 L8 16 L11.5 24 L15 22.5 L11.5 14.8 L18.5 14.8 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      document.body.appendChild(c);
      document.addEventListener('mousemove', e => { c.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`; }, true);
      document.addEventListener('mousedown', e => {
        const r = document.createElement('div'); r.className = 'demo-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
        document.body.appendChild(r); setTimeout(() => r.remove(), 600);
      }, true);
    });
  });
  const page = await ctx.newPage();
  const videoStart = Date.now();
  let mouse = { x: W / 2, y: H / 2 };
  const moveTo = async (sel, steps = 28) => {
    const box = await page.locator(sel).first().boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y, { steps }); mouse = { x, y };
  };
  const click = async (sel, pause = 350) => { await moveTo(sel); await sleep(pause); await page.mouse.down(); await page.mouse.up(); };
  // il menu nativo aperto da un clic vero si mangerebbe il clic successivo: mostro solo il cursore e l'onda
  const pick = async (value) => {
    await moveTo('#track-pick'); await sleep(350);
    await page.evaluate(({ x, y }) => { const r = document.createElement('div'); r.className = 'demo-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 600); }, mouse);
    await page.locator('#track-pick').selectOption(value);
  };
  const wheel = async (dy, n, wait) => { for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy); await sleep(wait); } };

  // ---------- riscaldamento (tagliato dal video): carica campioni, soundfont e worklet ----------
  await page.goto('http://localhost:5173/');
  await sleep(6000);
  await page.locator('#track-pick').selectOption('dci-carica');
  await page.click('#sc-play'); await sleep(8000);
  await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(3000);
  await page.click('[data-scene-i="3"]'); await sleep(3000);
  await page.click('#stop'); await sleep(500);
  await page.click('[data-look="palco"]');
  await page.locator('#track-pick').selectOption('segnale-nel-rumore');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(W * .55, H * .45); await sleep(1500);

  // ---------- registrazione ----------
  const t0 = Date.now();
  await page.evaluate(() => {
    const ctxA = getAudioContext(), dest = ctxA.createMediaStreamDestination();
    const rec = new MediaRecorder(dest.stream);
    const an = ctxA.createAnalyser(); window.__diag = [];
    setInterval(() => { const b = new Float32Array(1024); an.getFloatTimeDomainData(b); let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); window.__diag.push(m.toFixed(2)); }, 3000);
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    let node = null;
    const tap = () => { try { const n = getSuperdoughAudioController().output.destinationGain; if (n && n !== node) { n.connect(dest); n.connect(an); node = n; window.__diag.push('conn'); } } catch (e) {} };
    const iv = setInterval(tap, 100); tap(); rec.start(500);
    window.__demoStop = () => new Promise(res => {
      rec.onstop = async () => {
        clearInterval(iv);
        const u = new Uint8Array(await new Blob(chunks).arrayBuffer());
        let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        res(btoa(bin));
      };
      rec.stop();
    });
  });
  const mark = label => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5), label);

  await sleep(1200);
  mark('scelgo DCI Jingle carica'); await pick('dci-carica'); await sleep(900);
  mark('play'); await click('#play'); await sleep(2500);
  await sleep(6500);
  mark('scorro Componi'); await page.mouse.move(W * .3, H * .6, { steps: 20 });
  await wheel(260, 6, 650); await sleep(1500);
  await wheel(260, 6, 650); await sleep(1800);
  await wheel(260, 4, 600); await sleep(1200);
  mark('torno su'); await wheel(-700, 8, 250); await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(1200);
  mark('cambio su Luci Rosse'); await pick('luci-rosse'); await sleep(800);
  mark('play Luci Rosse'); await click('#play'); await sleep(3500);
  mark('salto allo Scontro'); await click('[data-scene-i="3"]'); await sleep(4500);
  for (const look of ['pixel', 'tramonto', 'montagne', 'spazio', 'sonar', 'palco']) {
    mark('visual ' + look); await click(`[data-look="${look}"]`, 250); await sleep(look === 'palco' ? 2500 : 4200);
  }
  mark('tab Brani'); await click('.tab[data-tab="brani"]'); await sleep(1500);
  await page.mouse.move(W * .3, H * .65, { steps: 18 });
  await wheel(300, 5, 700); await sleep(1500);
  await wheel(-400, 4, 300); await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(900);
  mark('tab Componi'); await click('.tab[data-tab="componi"]'); await sleep(1800);
  mark('stop'); await click('#stop'); await sleep(1800);
  mark('fine');

  console.log('diag', await page.evaluate(() => window.__diag.join(' ')));
  const audio = await page.evaluate(() => window.__demoStop());
  fs.writeFileSync(path.join(OUT, 'audio.webm'), Buffer.from(audio, 'base64'));
  const video = page.video();
  await ctx.close(); await browser.close();
  fs.renameSync(await video.path(), path.join(OUT, 'video.webm'));
  fs.writeFileSync(path.join(OUT, 'offset.txt'), String((t0 - videoStart) / 1000));
  console.log('offset video', (t0 - videoStart) / 1000);
})().catch(e => { console.error(e); process.exit(1); });
