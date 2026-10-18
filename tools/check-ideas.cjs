// Event-equivalence check of the idea model (idea-model, #70, design D8): for every song in songs/ and songs/examples/,
// the code saved before the change (tests/snapshots/code-before-ideas/<id>.strudel) and the code the compiler writes
// now make the same events over the whole song: same onset, same length, same values. Drum machine samples compare
// without their length (a sample plays to its end), note names and MIDI numbers of the same pitch are equal, a
// velocity of 1 equals no velocity. tests/snapshots/code-before-ideas/states/<id>.json holds, for the same songs, the
// code of a few states of their Crescendo build (rules of the Crescendo profile) written before the change: those
// states are compared too, so Classic and Crescendo keep their sound while they build.
// Usage: PLAYWRIGHT_CORE=... node tools/check-ideas.cjs [song-id,song-id…]   (dev server on :5173)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.join(__dirname, '..');
const BASE = path.join(ROOT, 'tests', 'snapshots', 'code-before-ideas');

// song files under songs/ (recursive), without the library order, endless sessions and their session files
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === 'endless' ? [] : files(p);
  return e.name.endsWith('.json') && e.name !== 'index.json' && e.name !== 'session.json' ? [p] : [];
});
const only = (process.argv[2] || '').split(',').filter(Boolean);
const songs = files(path.join(ROOT, 'songs')).map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).filter(s => !only.length || only.includes(s.id));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:5173/'); await sleep(5000);
  let failed = 0, compared = 0, events = 0, states = 0, added = 0;
  for (const song of songs) {
    const snap = path.join(BASE, `${song.id}.strudel`);
    // a song added after the change has no baseline: its code and every state of its live build must evaluate and play
    const before = fs.existsSync(snap) ? fs.readFileSync(snap, 'utf8') : null;
    const st = path.join(BASE, 'states', `${song.id}.json`), beforeStates = fs.existsSync(st) ? JSON.parse(fs.readFileSync(st, 'utf8')).states : {};
    const res = await page.evaluate(async ({ song, before, beforeStates }) => {
      const [{ compileSong }, { fromScenes }, { crescendoSong }, { stateAt }] = await Promise.all(['/src/song/compile.js', '/src/song/format.js', '/src/song/crescendo.js', '/src/song/build.js'].map(u => import(u)));
      const s = song.scenes ? fromScenes(song) : song;
      const e = document.querySelector('strudel-editor').editor;
      const midiOf = n => { const m = String(n).match(/^([a-g])(#|b)?(-?\d)$/i); return m ? { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 : null; };
      const haps = async (code, total) => {
        await e.repl.evaluate(code, false);
        if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError));
        return e.repl.scheduler.pattern.queryArc(0, total).filter(h => h.hasOnset())
          .map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), h.value.bank ? 0 : +h.duration.valueOf().toFixed(4), Object.fromEntries(Object.entries({ ...h.value, ...(typeof h.value.note === 'string' && midiOf(h.value.note) !== null ? { note: midiOf(h.value.note) } : {}) }).filter(([k, v]) => typeof v !== 'function' && !(k === 'velocity' && v === 1)).sort())])).sort();
      };
      const diff = (a, b) => { const sa = new Set(a), sb = new Set(b); return { missing: a.filter(x => !sb.has(x)).slice(0, 3), extra: b.filter(x => !sa.has(x)).slice(0, 3) }; };
      const out = [];
      const one = async (label, old, now, total) => {
        try {
          const a = await haps(old, total), b = await haps(now, total), same = a.length === b.length && a.every((x, i) => x === b[i]);
          out.push({ label, same, events: a.length, ...(same ? {} : { counts: [a.length, b.length], ...diff(a, b) }) });
        } catch (x) { out.push({ label, err: x.message }); }
      };
      const total = s.sections.reduce((a, x) => a + x.bars, 0);
      if (before === null) {
        const [{ stateAt: at, buildSteps }] = await Promise.all(['/src/song/build.js'].map(u => import(u)));
        for (const bar of [null, ...new Set(buildSteps(s).map(x => x.at))]) {
          try { const h = await haps(bar === null ? compileSong(s) : compileSong(at(s, bar).song), total); out.push({ label: bar === null ? 'song (new, no baseline)' : `build bar ${bar}`, same: h.length > 0, events: h.length }); }
          catch (x) { out.push({ label: bar === null ? 'song' : `build bar ${bar}`, err: x.message }); }
        }
        return out;
      }
      await one('song', before, compileSong(s), total);
      const c = Object.keys(beforeStates).length ? crescendoSong(s) : null, ctotal = c ? c.sections.reduce((a, x) => a + x.bars, 0) : 0;
      for (const [bar, code] of Object.entries(beforeStates)) await one(`crescendo bar ${bar}`, code, compileSong(stateAt(c, +bar).song), ctotal);
      return out;
    }, { song, before, beforeStates });
    for (const r of res) {
      const ok = r.same && !r.err;
      if (r.label === 'song') compared++; else if (/^crescendo/.test(r.label)) states++; else added++;
      events += r.events || 0;
      if (!ok) failed++;
      if (!ok || !/^crescendo/.test(r.label)) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${song.id} ${r.label}${r.events !== undefined ? ` (${r.events} events)` : ''}${r.err ? ` (${r.err})` : ''}`);
      if (!ok && !r.err && r.counts) { console.log(`      events before ${r.counts[0]}, now ${r.counts[1]}`); r.missing.forEach(x => console.log(`      - ${x}`)); r.extra.forEach(x => console.log(`      + ${x}`)); }
    }
  }
  await browser.close();
  console.log(`\n${compared} songs and ${states} Crescendo states compared, ${added} code(s) of songs without a baseline played, ${events} events`);
  console.log(failed ? `${failed} difference(s)` : 'no differences');
  process.exit(failed ? 1 : 0);
})();
