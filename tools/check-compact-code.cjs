// Browser check for the compact code of Crescendo songs (#64, crescendo-code): for states of a few songs, the events
// Strudel makes (onset time and every value) are the same with the standard code, the joined lines and one line per
// track (a velocity of 1 counts as no velocity: the code of the moment drops lanes that are 1). Usage: PLAYWRIGHT_CORE=... node tools/check-compact-code.cjs   (dev server on :5173)
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
      const [{ crescendoSong }, { compileCompact, compileNow }, { compileSong }, { stateAt, buildSteps }, { idiomatic }] = await Promise.all(['/src/song/crescendo.js', '/src/song/compile-compact.js', '/src/song/compile.js', '/src/song/build.js', '/src/song/idiom.js'].map(u => import(u)));
      const song = await (await fetch(`/songs/${id}.json`)).json(), c = crescendoSong(song), total = c.sections.reduce((a, x) => a + x.bars, 0);
      const waiting = [...new Set(buildSteps(c).flatMap(s => (s.add !== undefined ? [].concat(s.add) : [])))];
      const e = document.querySelector('strudel-editor').editor;
      // note names and MIDI numbers of the same pitch are the same note
      const midiOf = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); return m ? { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 : null; };
      const haps = async (code, a = 0, z = total) => {
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        return e.repl.scheduler.pattern.queryArc(a, z).filter(h => h.hasOnset())
          .map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), h.value.bank ? 0 : +h.duration.valueOf().toFixed(4), Object.fromEntries(Object.entries({ ...h.value, ...(typeof h.value.note === 'string' && midiOf(h.value.note) !== null ? { note: midiOf(h.value.note) } : {}) }).filter(([k, v]) => typeof v !== 'function' && !(k === 'velocity' && v === 1)).sort())])).sort().join('\n');
      };
      const out = [];
      for (const bar of [Math.round(c.crescendo.growth / 3), c.crescendo.grown]) {
        const st = stateAt(c, bar).song;
        try {
          const a = await haps(compileSong(st));
          for (const lines of ['joined', 'track']) out.push({ bar, lines, same: a === await haps(compileCompact(st, { muted: waiting, lines })) });
          // the code of the moment, section by section (prepared lines included: they are muted)
          let sameNow = true;
          for (const sec of st.sections.reduce((acc, x) => { acc.push({ start: acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].bars : 0, bars: x.bars }); return acc; }, [])) {
            const std = await haps(compileSong(st), sec.start, sec.start + sec.bars), now = await haps(compileNow(st, sec.start, { prepare: true }), sec.start, sec.start + sec.bars);
            if (std !== now) { sameNow = false; break; }
          }
          out.push({ bar, lines: 'now', same: sameNow });
          // the idiomatic generator: same events (drum machines may take longer steps: their samples play whole)
          out.push({ bar, lines: 'idiomatic', same: a === await haps(idiomatic(compileSong(st))) });
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
