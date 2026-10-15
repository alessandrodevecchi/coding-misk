// Browser check for the compact code of Crescendo songs (#64, crescendo-code): for states of a few songs, the events
// Strudel makes (onset time and every value) are the same with the standard code, the joined lines and one line per
// track. Usage: PLAYWRIGHT_CORE=... node tools/check-compact-code.cjs   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SONGS = ['crescendo-primo-passo', 'crescendo-filo-di-luce', 'crescendo-notte-lunga', 'ferro', 'cavo-scoperto'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:5173/'); await sleep(5000);
  let failed = 0;
  for (const id of SONGS) {
    const res = await page.evaluate(async id => {
      const [{ crescendoSong }, { compileCompact }, { compileSong }, { stateAt, buildSteps }] = await Promise.all(['/src/song/crescendo.js', '/src/song/compile-compact.js', '/src/song/compile.js', '/src/song/build.js'].map(u => import(u)));
      const song = await (await fetch(`/songs/${id}.json`)).json(), c = crescendoSong(song), total = c.sections.reduce((a, x) => a + x.bars, 0);
      const waiting = [...new Set(buildSteps(c).flatMap(s => (s.add !== undefined ? [].concat(s.add) : [])))];
      const e = document.querySelector('strudel-editor').editor;
      const haps = async code => {
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        return e.repl.scheduler.pattern.queryArc(0, total).filter(h => h.hasOnset())
          .map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), Object.fromEntries(Object.entries(h.value).filter(([, v]) => typeof v !== 'function').sort())])).sort().join('\n');
      };
      const out = [];
      for (const bar of [Math.round(c.crescendo.growth / 3), c.crescendo.grown]) {
        const st = stateAt(c, bar).song;
        try {
          const a = await haps(compileSong(st));
          for (const lines of ['joined', 'track']) out.push({ bar, lines, same: a === await haps(compileCompact(st, { muted: waiting, lines })) });
        } catch (x) { out.push({ bar, err: x.message }); }
      }
      return out;
    }, id);
    for (const r of res) { const ok = r.same && !r.err; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} bar ${r.bar} ${r.lines || ''}${r.err ? ` (${r.err})` : ''}`); }
  }
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
