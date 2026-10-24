// Browser check for the compact code of Crescendo songs (#64, crescendo-code): for states of a few songs, the events
// Strudel makes (onset time and every value) are the same with the standard code, the joined lines and one line per
// track, the short patterns and the lines broken before a function (a velocity of 1 counts as no velocity: the code of
// the moment drops lanes that are 1); the Sections option (code-lanes) in Classic, with the Live build off and on, and
// Crescendo. Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-compact-code.cjs   (dev server on
// PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.env.PORT || 5173;
const SONGS = ['crescendo-primo-passo', 'crescendo-filo-di-luce', 'crescendo-notte-lunga', 'ferro', 'cavo-scoperto', 'switch-prima-luce'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto(`http://localhost:${PORT}/`); await sleep(5000);
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
  // code-writing, song-functions: technical functions full, short, mixer and compact, with the voice code shown or
  // hidden, play the same events (compact: library and song functions registered from the song's templates)
  for (const id of ['switch-prima-luce', 'switch-acid-prova', 'crescendo-primo-passo', 'example-ideas']) {
    const res = await page.evaluate(async id => {
      const [{ crescendoSong }, { liveCode }, { resolveProfile }, { buildSteps }, { useFns }] = await Promise.all(['/src/song/crescendo.js', '/src/live/live-code.js', '/src/live/profiles.js', '/src/song/build.js', '/src/song/writer.js'].map(u => import(u)));
      const song = await (await fetch(id === 'example-ideas' ? '/songs/examples/04-ideas.json' : `/songs/${id}.json`)).json(), b = crescendoSong(song, { rules: { natural: true } }), total = b.sections.reduce((a, x) => a + x.bars, 0);
      const files = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };
      const e = document.querySelector('strudel-editor').editor;
      // (from the step to the next one of the code compared: with Sections, code-lanes, the code of the moment of
      // compact changes at each clip too, and a gated guitar shows only its section's line)
      const haps = async (code, a = 0, z = total) => {
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        return e.repl.scheduler.pattern.queryArc(a, z).filter(h => h.hasOnset()).map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), Object.fromEntries(Object.entries(h.value).filter(([k, v]) => typeof v !== 'function' && !(k === 'velocity' && v === 1)).sort())])).sort().join('\n');
      };
      const mk = o => liveCode(b, resolveProfile('switch', o), { lang: () => 'it', files: () => files, cols: () => 48 });
      const full = mk({ functions: 'full', voice: true, wrap: false }), out = [];
      const bars = [...new Set(buildSteps(full.build).map(x => x.at))].sort((x, y) => x - y), pick = [bars[1], bars[Math.floor(bars.length / 3)], bars[Math.floor(bars.length * 2 / 3)], bars[bars.length - 1]];
      for (const v of [{ functions: 'short' }, { functions: 'mixer' }, { functions: 'compact' }, { functions: 'short', voice: true }, { functions: 'compact', voice: true }, { functions: 'full', voice: false }]) {
        const L = mk(v), next = [...new Set([...buildSteps(L.build), ...buildSteps(full.build)].map(x => x.at))].sort((x, y) => x - y);
        for (const bar of pick) {
          try {
            const end = next.find(x => x > bar) ?? total;
            globalThis.miskBuses = full.buses; useFns(full.fns);
            const shown = L.codeAt(bar), a = await haps(full.run ? full.run(full.codeAt(bar)) : full.codeAt(bar), bar, end);
            globalThis.miskBuses = L.buses; useFns(L.fns);
            const z = await haps(L.run ? L.run(shown) : shown, bar, end);
            out.push({ bar, lines: `${v.functions}${v.voice === false ? ' voice hidden' : v.voice ? ' voice shown' : ''}`, same: a === z && (v.functions === 'full' || v.functions === 'short' || !/\.orbit\(|\.analyze\(/.test(shown)) && !/\.(o|drive|voice)\(/.test(shown) });
          } catch (x) { out.push({ bar, err: x.message }); }
        }
      }
      return out;
    }, id);
    for (const r of res) { const ok = r.same && !r.err; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} bar ${r.bar} ${r.lines || ''}${r.err ? ` (${r.err})` : ''}`); }
  }
  // the same in Classic (a live build) and Crescendo: each preset plays what the code in full plays, at a few steps and
  // at the bars where the hidden mixer once went wrong (luci-rosse bar 39: a hap whose first place is a section lane;
  // prova-voce-notte: two lines alike once bus and visual are out, on different orbits)
  for (const [id, profile, extra] of [['luci-rosse', 'classic', [39]], ['luci-rosse', 'crescendo', [39]], ['ferro', 'classic', []], ['ferro', 'crescendo', []], ['prova-voce-notte', 'classic', [32]], ['prova-voce-notte', 'crescendo', [96]]]) {
    const res = await page.evaluate(async ([id, profile, extra]) => {
      const [{ crescendoSong }, { liveCode }, { resolveProfile, growthRules }, { buildSteps, deriveBuild }, { useFns }] = await Promise.all(['/src/song/crescendo.js', '/src/live/live-code.js', '/src/live/profiles.js', '/src/song/build.js', '/src/song/writer.js'].map(u => import(u)));
      const song = await (await fetch(`/songs/${id}.json`)).json(), C = resolveProfile(profile);
      const b = C.build === 'crescendo' ? crescendoSong(song, { narrated: C.narrated, rules: growthRules(C) }) : { ...song, build: song.build || deriveBuild(song) };
      const files = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };
      const e = document.querySelector('strudel-editor').editor;
      const haps = async (code, a, z) => {
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        // (a velocity of 1 is no velocity: the code of the moment in full drops a lane of 1, the mixer plays it)
        return e.repl.scheduler.pattern.queryArc(a, z).filter(h => h.hasOnset()).map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), Object.fromEntries(Object.entries(h.value).filter(([k, v]) => typeof v !== 'function' && !(k === 'velocity' && v === 1)).sort())])).sort().join('\n');
      };
      const mk = functions => liveCode(b, resolveProfile(profile, { functions }), { lang: () => 'it', files: () => files, cols: () => 48 });
      const total = b.sections.reduce((a, x) => a + x.bars, 0);
      const full = mk('full'), out = [];
      const bars = [...new Set(buildSteps(full.build).map(x => x.at))].sort((x, y) => x - y);
      const pick = [...new Set([bars[1], bars[Math.floor(bars.length / 2)], bars[bars.length - 1], ...extra].filter(x => x !== undefined))].sort((x, y) => x - y);
      for (const functions of ['short', 'mixer', 'compact']) {
        const L = mk(functions);
        // (compact has Sections, code-lanes: its code is the code of the moment, up to its next step)
        const next = [...new Set([...buildSteps(L.build), ...buildSteps(full.build)].map(x => x.at))].sort((x, y) => x - y);
        for (const bar of pick) {
          try {
            // (the code in full loops the song after its end: its lanes start again)
            const end = Math.min(bar + 4, total, next.find(x => x > bar) ?? Infinity);
            globalThis.miskBuses = full.buses; useFns(full.fns);
            const a = await haps(full.run ? full.run(full.codeAt(bar)) : full.codeAt(bar), bar, end), shown = L.codeAt(bar);
            globalThis.miskBuses = L.buses; useFns(L.fns);
            const z = await haps(L.run ? L.run(shown) : shown, bar, end);
            // (the comments of Classic may name the functions: only the code counts)
            const shownMix = functions !== 'short' && (shown.replace(/\/\/.*$/gm, '').match(/^.*\.(orbit|analyze)\(.*$/m) || [])[0];
            const first = a === z ? '' : (() => { const x = a.split('\n'), y = z.split('\n'), i = x.findIndex((l, k) => l !== y[k]); return `${x.length} events against ${y.length}; first: ${x[i]} | ${y[i]}`; })();
            out.push({ bar, lines: `${profile} ${functions}`, same: a === z && !shownMix, err: first || (shownMix ? `mix shown: ${shownMix.trim().slice(0, 120)}` : undefined) });
          } catch (x) { out.push({ bar, lines: `${profile} ${functions}`, err: x.message }); }
        }
      }
      return out;
    }, [id, profile, extra]);
    for (const r of res) { const ok = r.same && !r.err; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} bar ${r.bar} ${r.lines || ''}${r.err ? ` (${r.err})` : ''}`); }
  }
  // live-coder in-place edits: the Live coder code of the moment shows one line per part with no section lanes; the
  // lanes play from the hidden mixer. At every step (and the section changes), the events from the step to the next
  // one are those of the standard code of that state, and no line shows a lane
  for (const id of ['example-ideas', 'switch-prima-luce', 'switch-acid-prova']) {
    const res = await page.evaluate(async id => {
      const [{ crescendoSong }, { liveCode }, { resolveProfile, growthRules }, { buildSteps, stateAt }, { useFns }, { compileSong }] = await Promise.all(['/src/song/crescendo.js', '/src/live/live-code.js', '/src/live/profiles.js', '/src/song/build.js', '/src/song/writer.js', '/src/song/compile.js'].map(u => import(u)));
      const song = await (await fetch(id === 'example-ideas' ? '/songs/examples/04-ideas.json' : `/songs/${id}.json`)).json();
      const C = resolveProfile('switch', { tracks: false, notes: false, steps: false }), c = crescendoSong(song, { rules: growthRules(C) }), L = liveCode(c, C, { cols: () => 80 });
      const e = document.querySelector('strudel-editor').editor;
      const midiOf = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); return m ? { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 : null; };
      const haps = async (code, a, z) => {
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        return e.repl.scheduler.pattern.queryArc(a, z).filter(h => h.hasOnset())
          .map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), h.value.bank ? 0 : +h.duration.valueOf().toFixed(4), Object.fromEntries(Object.entries({ ...h.value, ...(typeof h.value.note === 'string' && midiOf(h.value.note) !== null ? { note: midiOf(h.value.note) } : {}) }).filter(([k, v]) => typeof v !== 'function' && !(k === 'velocity' && v === 1)).sort())])).sort().join('\n');
      };
      const bars = [...new Set(buildSteps(L.build).map(x => x.at))].sort((x, y) => x - y), total = L.build.sections.reduce((a, x) => a + x.bars, 0), out = [];
      // the section changes, and every third step
      let at = 0; const bounds = L.build.sections.map(x => (at += x.bars) - x.bars).slice(1);
      const pick = bars.filter((b, i) => bounds.includes(b) || i % 3 === 0);
      for (const b of pick) {
        const n = bars.find(x => x > b) ?? total, z = Math.min(n, b + 12);
        try {
          const shown = L.codeAt(b);
          if (/\.mask\((section|clip)\d+\)|const (section|clip)\d+ =/.test(shown)) { out.push({ bar: b, err: 'a section lane is shown' }); continue; }
          globalThis.miskBuses = L.buses; useFns(L.fns);
          const a = await haps(compileSong(stateAt(L.build, b).song), b, z), w = await haps(L.run(shown), b, z);
          out.push({ bar: b, same: a === w, n: a.split('\n').length });
        } catch (x) { out.push({ bar: b, err: x.message }); }
      }
      return out;
    }, id);
    for (const r of res) { const ok = r.same && !r.err; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} Live coder in place, bar ${r.bar}${r.n ? ` (${r.n} events)` : ''}${r.err ? ` (${r.err})` : ''}`); }
  }
  // code-lanes: the Sections option (in the compact preset) in Classic with the Live build off (the song as written,
  // every track from the start) and on, and in Crescendo. The code shows no section or clip lane, and at every step
  // (each section and clip change included) the events up to the next step are those of the code in full of that
  // state: section lanes, clip lanes and guitars gated with postgain play from the hidden mixer
  for (const [id, profile, off] of [['settimo-cielo', 'classic', true], ['settimo-cielo', 'classic', false], ['luci-rosse', 'classic', true], ['cavo-scoperto', 'classic', true], ['cavo-scoperto', 'classic', false], ['settimo-cielo', 'crescendo', false], ['luci-rosse', 'crescendo', false], ['ferro', 'crescendo', false]]) {
    const res = await page.evaluate(async ([id, profile, off]) => {
      const [{ crescendoSong }, { liveCode }, { resolveProfile, growthRules }, { buildSteps, stateAt, deriveBuild }, { useFns }, { compileSong }] = await Promise.all(['/src/song/crescendo.js', '/src/live/live-code.js', '/src/live/profiles.js', '/src/song/build.js', '/src/song/writer.js', '/src/song/compile.js'].map(u => import(u)));
      const song = await (await fetch(`/songs/${id}.json`)).json(), C = resolveProfile(profile, { functions: 'compact' });
      const b = off ? { ...song, build: [] } : C.build === 'crescendo' ? crescendoSong(song, { narrated: C.narrated, rules: growthRules(C) }) : { ...song, build: song.build || deriveBuild(song) };
      const L = liveCode(b, C, { lang: () => 'it', cols: () => 80 });
      const e = document.querySelector('strudel-editor').editor;
      const midiOf = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); return m ? { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 : null; };
      const haps = async (code, a, z) => {
        if (!/^\s*[_S]?\$:/m.test(code)) return '';
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        return e.repl.scheduler.pattern.queryArc(a, z).filter(h => h.hasOnset())
          .map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), h.value.bank ? 0 : +h.duration.valueOf().toFixed(4), Object.fromEntries(Object.entries({ ...h.value, ...(typeof h.value.note === 'string' && midiOf(h.value.note) !== null ? { note: midiOf(h.value.note) } : {}) }).filter(([k, v]) => typeof v !== 'function' && !(k === 'velocity' && v === 1)).sort())])).sort().join('\n');
      };
      const bars = [...new Set([0, ...buildSteps(L.build).map(x => x.at)])].sort((x, y) => x - y), total = L.build.sections.reduce((a, x) => a + x.bars, 0);
      // Classic: every step; Crescendo: the section and clip changes of the written song and every fourth step
      let at = 0; const bounds = L.build.sections.map(x => (at += x.bars) - x.bars);
      const pick = C.build === 'crescendo' ? bars.filter((x, i) => (bounds.includes(x) && x >= (b.crescendo ? b.crescendo.growth : 0)) || i % 4 === 0) : bars;
      let same = 0, steps = 0, err = '', lines = 0, gated = 0;
      for (const x of pick) {
        const z = Math.min(total, bars.find(y => y > x) ?? total, x + 12);
        try {
          const shown = L.codeAt(x);
          if (/\.mask\((section|clip)\d+\)|const (section|clip)\d+ =|const SECTIONS =/.test(shown)) { err = `bar ${x}: a section or clip lane is shown`; break; }
          lines = Math.max(lines, (shown.match(/^\s*[_S]?\$:/gm) || []).length);
          globalThis.miskBuses = L.buses; useFns(L.fns);
          const w = L.run(shown);
          if (/ x [\d.]/.test(w.slice(shown.length))) gated++;
          const a = await haps(compileSong(stateAt(L.build, x).song), x, z), y = await haps(w, x, z);
          steps++; if (a === y) same++; else if (!err) { const p = a.split('\n'), q = y.split('\n'), i = p.findIndex((l, k) => l !== q[k]); err = `bar ${x}: ${p.length} events against ${q.length}; first: ${p[i]} | ${q[i]}`; }
        } catch (ex) { err = `bar ${x}: ${ex.message}`; break; }
      }
      return { steps, same, err, lines, gated };
    }, [id, profile, off]);
    const ok = !res.err && res.steps > 0 && res.same === res.steps; if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} ${profile}${off ? ' (Live build off)' : ''} Sections: ${res.same}/${res.steps} steps the same, at most ${res.lines} lines, ${res.gated} steps with gated lanes${res.err ? ` (${res.err})` : ''}`);
  }
  // radio-profiles 4.3: the radio's window song by song. At every step of one transition (and the bars around it), the
  // events of the code evaluated (the song on air shown in its own view, its hidden tail, the other song hidden or
  // visible in full form on its own orbits) are those of the full form of the window: every track of both songs in
  // blocks, each song's lines played alone only within its own song. Orbits are left out: the hidden song moves them on
  // purpose, and the orbits in use per step are reported. Cases: Live coder on air into a hidden Live coder song, the
  // same with the incoming song visible, a Classic song on air into a hidden Live coder song
  {
    const fs = require('node:fs');
    const styles = fs.readdirSync('styles').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`styles/${f}`, 'utf8')));
    const res = await page.evaluate(async styles => {
      const [{ sessionItems, GROWTH_ON_AIR }, { windowSong }, { overlapOf, extraOf }, { airCode, windowPart, localSolo }, { airControls }, { compileSong }, { stateAt, buildSteps }, { useFns }, { resolveProfile }, { validateRecipe }] = await Promise.all(['/src/endless/items.js', '/src/endless/join.js', '/src/endless/transitions.js', '/src/live/air-code.js', '/src/endless/growth.js', '/src/song/compile.js', '/src/song/build.js', '/src/song/writer.js', '/src/live/profiles.js', '/src/endless/recipe.js'].map(u => import(u)));
      const recipes = styles.filter(r => !validateRecipe(r).errors.length);
      const e = document.querySelector('strudel-editor').editor;
      const midiOf = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); return m ? { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 : null; };
      const orbits = new Set();
      const haps = async (code, a, z) => {
        // (a song with nothing playing yet compiles to no line at all)
        if (!/^\s*[_S]?\$:/m.test(code)) return [];
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        return e.repl.scheduler.pattern.queryArc(a, z).filter(h => h.hasOnset()).map(h => { orbits.add(h.value.orbit); return JSON.stringify([+h.whole.begin.valueOf().toFixed(4), h.value.bank ? 0 : +h.duration.valueOf().toFixed(4), Object.fromEntries(Object.entries({ ...h.value, ...(typeof h.value.note === 'string' && midiOf(h.value.note) !== null ? { note: midiOf(h.value.note) } : {}) }).filter(([k, v]) => typeof v !== 'function' && k !== 'orbit' && !(k === 'velocity' && v === 1)).sort())]); });
      };
      const barsOf = s => s.sections.reduce((a, x) => a + x.bars, 0);
      const opts = profile => ({ styles: ['berlin-techno'], chaos: 0.3, energy: 0.7, complexity: 0.5, talk: 0.5, transition: 'mix', harmony: 'compatible', profile });
      const live = sessionItems(recipes, { seed: 'air-check', options: opts('switch'), changes: [], growth: GROWTH_ON_AIR }, 2);
      const classic = sessionItems(recipes, { seed: 'air-check', options: opts('classic'), changes: [], growth: GROWTH_ON_AIR }, 1);
      const out = [];
      for (const [name, pair, show, ctlA] of [['Live coder into Live coder, hidden', live, 'hidden', airControls('switch')], ['Live coder into Live coder, visible', live, 'visible', airControls('switch')], ['Classic into Live coder, hidden', [classic[0], live[1]], 'hidden', resolveProfile('classic')]]) {
        let start = 16;
        const laid = pair.map((x, i) => { const it = { song: x.song, n: i + 1, start, transition: i ? undefined : (pair[0].entry.transition || { kind: 'mix', bars: 8 }) }; start += barsOf(x.song) + extraOf(it.transition) - overlapOf(it.transition); return it; });
        const W = windowSong(laid), total = barsOf(W);
        const songs = laid.map((x, i) => ({ n: x.n, prefix: `s${x.n}-`, start: x.start, song: x.song, title: x.song.title, ctl: i ? airControls('switch') : ctlA, show: i ? show : 'air' }));
        const L = airCode(W, songs, { lang: () => 'en', cols: () => 64 }), parts = songs.map((_, k) => windowPart(W, songs, k));
        const bars = [...new Set(buildSteps(L.build).map(s => s.at))].sort((a, b) => a - b);
        const end = laid[0].start + barsOf(laid[0].song), from = laid[1].start - 8;
        const pick = [...new Set([from, laid[1].start, ...bars.filter(b => b >= from && b < end + 4)])].filter(b => b < total).sort((a, b) => a - b);
        let same = 0, steps = 0, err = '', perStep = [];
        for (const b of pick) {
          const z = Math.min(total, bars.find(x => x > b) ?? total, b + 8);
          try {
            orbits.clear();
            const shown = L.codeAt(b);
            if (show === 'hidden' && shown.includes(`// ========== ${laid[1].n} `)) { err = `bar ${b}: the hidden song is shown`; break; }
            globalThis.miskBuses = L.buses; useFns(L.fns);
            const w = (await haps(L.run(shown, b), b, z)).sort().join('\n'), used = orbits.size;
            // the full form: each song's state at the bar in blocks (a song not on air plays alone only within itself)
            let ref = [];
            for (const [k, p] of parts.entries()) { const c = compileSong(stateAt(p, b).song); ref.push(...(await haps(k ? localSolo(c) : c, b, z))); }
            steps++; if (w === ref.sort().join('\n')) same++; else if (!err) err = `bar ${b}: the events differ (${w.split('\n').length} against ${ref.length})`;
            perStep.push(used);
          } catch (x) { err = `bar ${b}: ${x.message}`; break; }
        }
        out.push({ name, steps, same, err, orbits: perStep.length ? Math.max(...perStep) : 0 });
      }
      return out;
    }, styles);
    for (const r of res) { const ok = !r.err && r.steps > 0 && r.same === r.steps; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  radio window, ${r.name}: ${r.same}/${r.steps} steps the same, at most ${r.orbits} orbits in use${r.err ? ` (${r.err})` : ''}`); }
  }
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
