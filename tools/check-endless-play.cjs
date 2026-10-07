// Evaluates generated endless songs in the app: the code of every live build step, as the player builds it,
// and reports Strudel evaluation errors; it also opens each song from the song menu and reports page errors. For levels per section use tools/check-levels.cjs <song-id …>.
// Usage: PLAYWRIGHT_CORE=... node tools/check-endless-play.cjs [dir]   (dev server on :5173; default songs/endless)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const files = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.json') && e.name !== 'session.json' ? [path.join(d, e.name)] : []);
(async () => {
  const dir = process.argv[2] || 'songs/endless';
  const songs = files(dir).sort().map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).filter(s => !s.id.endsWith('-joined'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('http://localhost:5173/'); await sleep(6000);
  let errors = 0;
  for (const song of songs) {
    const r = await page.evaluate(async song => {
      const { compileSong } = await import('/src/song/compile.js');
      const { stateAt, annotate, voiceCode, buildSteps } = await import('/src/song/build.js');
      const { withVisuals } = await import('/src/music.js');
      const files = await (await fetch('/samples/strudel.json')).json();
      const ed = document.querySelector('strudel-editor').editor, s = ed.repl.scheduler;
      const total = song.sections.reduce((a, x) => a + x.bars, 0);
      const codeAt = bar => { const st = stateAt(song, bar); const c = annotate(compileSong(st.song), song, st.upTo, 'en') + voiceCode(song, st.song, st.upTo, total, 'en', files); return c.includes('$:') ? c : `${c}\n$: silence`; };
      const run = async bar => { ed.stop(); ed.setCode(withVisuals(codeAt(bar))); s.lastEnd = bar; await ed.evaluate(); return String(ed.repl.state.evalError || ''); };
      const errs = [];
      for (const at of [...new Set(buildSteps(song).map(x => x.at))]) { const e = await run(at); if (e) errs.push(`bar ${at}: ${e}`); }
      ed.stop();
      return { errs, steps: new Set(buildSteps(song).map(x => x.at)).size };
    }, song);
    // the song also opens in Compose from the song menu, with no page error
    const before = pageErrors.length;
    await page.locator('#track-pick').selectOption(song.id); await sleep(700);
    const shown = await page.locator('#sc-name').inputValue();
    if (pageErrors.length > before || !song.sections.some(x => x.name === shown)) r.errs.push(`does not open in Compose: ${pageErrors.slice(before).join('; ') || `editor shows "${shown}"`}`);
    errors += r.errs.length;
    console.log(`${song.id.padEnd(28)} ${song.title.padEnd(22)} ${r.errs.length ? 'ERRORS ' + r.errs.join(' | ') : `ok (${r.steps} steps evaluated)`}`);
  }
  console.log(`${songs.length} songs, ${errors} errors; console errors: ${logs.length}; page errors: ${pageErrors.length}`);
  for (const l of [...new Set(logs)].slice(0, 10)) console.log('  console:', l.slice(0, 200));
  await browser.close();
  process.exit(errors ? 1 : 0);
})();
