// Browser check for the compact code of Crescendo songs (#64, crescendo-code): for states of a few songs, the events
// Strudel makes (onset time and every value) are the same with the standard code, the joined lines and one line per
// track, the short patterns and the lines broken before a function (a velocity of 1 counts as no velocity: the code of
// the moment drops lanes that are 1). Usage: PLAYWRIGHT_CORE=... node tools/check-compact-code.cjs   (dev server on :5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SONGS = ['crescendo-primo-passo', 'crescendo-filo-di-luce', 'crescendo-notte-lunga', 'ferro', 'cavo-scoperto', 'switch-prima-luce'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:5173/'); await sleep(5000);
  let failed = 0;
  for (const id of SONGS) {
    const res = await page.evaluate(async id => {
      const [{ crescendoSong }, { compileCompact, compileNow }, { compileSong }, { stateAt, buildSteps }, { idiomatic }, { breakLines }] = await Promise.all(['/src/song/crescendo.js', '/src/song/compile-compact.js', '/src/song/compile.js', '/src/song/build.js', '/src/song/idiom.js', '/src/song/typing.js'].map(u => import(u)));
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
          // lines broken before a function (typing-lines): same events
          out.push({ bar, lines: 'breaks', same: a === await haps(breakLines(idiomatic(compileSong(st)), 40)) });
        } catch (x) { out.push({ bar, err: x.message }); }
      }
      return out;
    }, id);
    for (const r of res) { const ok = r.same && !r.err; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} bar ${r.bar} ${r.lines || ''}${r.err ? ` (${r.err})` : ''}`); }
  }
  // arp-patterns: the arpeggio with .arp() in the short patterns plays the same notes, on every built-in song with an arpeggio
  const fs = require('node:fs');
  const arpSongs = fs.readdirSync('songs').filter(f => f.endsWith('.json') && f !== 'index.json').filter(f => { try { const s = JSON.parse(fs.readFileSync(`songs/${f}`, 'utf8')); return Array.isArray(s.tracks) && s.tracks.some(t => t.type === 'arp'); } catch (e) { return false; } }).map(f => f.slice(0, -5));
  const arpRes = await page.evaluate(async ids => {
    const [{ compileSong }, { idiomatic }, { fromScenes }] = await Promise.all(['/src/song/compile.js', '/src/song/idiom.js', '/src/song/format.js'].map(u => import(u)));
    const e = document.querySelector('strudel-editor').editor, out = [];
    const midiOf = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); return m ? { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 : n; };
    const haps = async (code, total) => { await e.repl.evaluate(code, false); if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError)); return e.repl.scheduler.pattern.queryArc(0, total).filter(h => h.hasOnset() && h.value.analyze === 'arp').map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), +h.duration.valueOf().toFixed(4), midiOf(h.value.note), h.value.gain])).sort().join('\n'); };
    for (const id of ids) {
      let s = await (await fetch(`/songs/${id}.json`)).json(); if (s.scenes) s = fromScenes(s);
      const total = s.sections.reduce((a, x) => a + x.bars, 0), code = compileSong(s), short = idiomatic(code);
      try { out.push({ id, arp: /\.arp\(/.test(short), same: (await haps(code, total)) === (await haps(short, total)) }); } catch (x) { out.push({ id, err: x.message }); }
    }
    return out;
  }, arpSongs);
  for (const r of arpRes) { const ok = r.same && !r.err; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${r.id} arpeggio${r.arp ? ' with .arp()' : ' as written'}${r.err ? ` (${r.err})` : ''}`); }
  // code-writing: technical functions full, short and mixer, with the voice code shown or hidden, play the same events
  for (const id of ['switch-prima-luce', 'switch-acid-prova', 'crescendo-primo-passo']) {
    const res = await page.evaluate(async id => {
      const [{ crescendoSong }, { liveCode }, { resolveProfile }, { buildSteps }] = await Promise.all(['/src/song/crescendo.js', '/src/live/live-code.js', '/src/live/profiles.js', '/src/song/build.js'].map(u => import(u)));
      const song = await (await fetch(`/songs/${id}.json`)).json(), b = crescendoSong(song, { rules: { natural: true } }), total = b.sections.reduce((a, x) => a + x.bars, 0);
      const files = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };
      const e = document.querySelector('strudel-editor').editor;
      const haps = async code => {
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        return e.repl.scheduler.pattern.queryArc(0, total).filter(h => h.hasOnset()).map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), Object.fromEntries(Object.entries(h.value).filter(([, v]) => typeof v !== 'function').sort())])).sort().join('\n');
      };
      const C = resolveProfile('switch'), mk = o => liveCode(b, { ...C, ...o }, { lang: () => 'it', files: () => files, cols: () => 48 });
      const full = mk({ functions: 'full', voice: true, wrap: false }), out = [];
      const bars = [...new Set(buildSteps(full.build).map(x => x.at))].sort((x, y) => x - y), pick = [bars[1], bars[Math.floor(bars.length / 3)], bars[Math.floor(bars.length * 2 / 3)], bars[bars.length - 1]];
      for (const v of [{ functions: 'short' }, { functions: 'mixer' }, { functions: 'mixer', voice: false }, { functions: 'full', voice: false }]) {
        const L = mk(v);
        for (const bar of pick) {
          try {
            const shown = L.codeAt(bar), a = await haps(full.codeAt(bar));
            globalThis.miskBuses = L.buses;
            const z = await haps(L.run ? L.run(shown) : shown);
            out.push({ bar, lines: `${v.functions}${v.voice === false ? ' voice hidden' : ''}`, same: a === z && (v.functions !== 'mixer' || !/\.orbit\(|\.analyze\(/.test(shown)) });
          } catch (x) { out.push({ bar, err: x.message }); }
        }
      }
      return out;
    }, id);
    for (const r of res) { const ok = r.same && !r.err; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} bar ${r.bar} ${r.lines || ''}${r.err ? ` (${r.err})` : ''}`); }
  }
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
