// Plays every scene of the given tracks and prints errors, per-instrument peak levels and the peak of the master output.
// The output peak (out=) is the hard limit: above 1.0 it clips and the run fails. A line above the headroom of the
// song's styles (1.0 by default, `headroom` in a style recipe) is printed as a warning (level-headroom).
// Usage: PLAYWRIGHT_CORE=... node tools/check-levels.cjs <track-id> [track-id …]   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { CLIP, tapOutput, outputPeak, songHeadroom } = require('./output-peak.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://localhost:5173/'); await sleep(5000);
  await tapOutput(page);
  let clipped = 0, warned = 0;
  // sections of each song from the song files: the section buttons on the page can still be the previous song's
  const { songFiles } = await import('./songs-dir.mjs');
  const fs = require('node:fs');
  const songs = songFiles('songs').map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const sections = Object.fromEntries(songs.map(sg => [sg.id, sg.sections.map(x => x.name)]));
  for (const id of process.argv.slice(2)) {
    const room = await songHeadroom(songs.find(sg => sg.id === id));
    // a fresh page can ignore the first selection: select again until the editor shows one of the song's sections
    const names = sections[id] || [];
    for (let k = 0; k < 20; k++) {
      await page.locator('#track-pick').selectOption(id); await sleep(500);
      if (!names.length || names.includes(await page.locator('#sc-name').inputValue())) break;
    }
    await page.click('#play'); await sleep(2000);
    // loop the section being measured: a short section (one bar at the end of a song) would otherwise end,
    // and the song stop, before the measuring window is over
    if (!(await page.isChecked('#sc-loop'))) await page.click('#sc-loop');
    const n = names.length || await page.locator('.arr-scene-btn').count();
    for (let i = 0; i < n; i++) {
      // click the section until the editor shows it (the strip is redrawn once the song plays)
      let ok = false;
      for (let k = 0; k < 6 && !ok; k++) {
        try { await page.click(`[data-scene-i="${i}"]`, { timeout: 2000 }); } catch { await sleep(500); continue; }
        await sleep(300);
        ok = !names.length || await page.locator('#sc-name').inputValue() === names[i];
      }
      if (!ok) { console.log(`${id} #${i} ${names[i] || ''} NOT REACHED (editor shows "${await page.locator('#sc-name').inputValue()}")`); continue; }
      await sleep(2400);
      await outputPeak(page);
      const r = await page.evaluate(async () => {
        const ed = document.querySelector('strudel-editor').editor, mx = {};
        for (let k = 0; k < 16; k++) { for (const a of Object.keys(window.analysers)) { const d = getAnalyzerData('time', a); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); mx[a] = Math.max(mx[a] || 0, m); } await new Promise(r => setTimeout(r, 50)); }
        return { err: String(ed.repl.state.evalError || ''), name: document.getElementById('sc-name').value, mx };
      });
      const out = await outputPeak(page);
      const lv = Object.entries(r.mx).filter(([, v]) => v > .02).map(([a, b]) => `${a}=${b.toFixed(2)}`).join(' ');
      const loud = Object.entries(r.mx).filter(([, v]) => v > room).map(([a, v]) => `${a} ${v.toFixed(2)}`);
      console.log(`${id} #${i} ${r.name}${r.err ? ' ERROR ' + r.err : ''}  ${lv}  out=${out.toFixed(2)}${out > CLIP ? ' CLIPS' : ''}`);
      if (loud.length) { warned++; console.log(`  warning: above the headroom ${room} (${loud.join(', ')}), output ${out.toFixed(2)}`); }
      if (out > CLIP) clipped++;
    }
    await page.click('#stop'); await sleep(300);
  }
  await browser.close();
  console.log(clipped ? `${clipped} section(s) clip the output` : `the output stays below clipping${warned ? `, ${warned} warning(s)` : ''}`);
  process.exit(clipped ? 1 : 0);
})();
