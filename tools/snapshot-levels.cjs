// Saves or checks peak levels per instrument for every scene of every built-in track (dev server on PORT, default 5173).
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/snapshot-levels.cjs write | check [track-id …]
// Snapshot: tests/snapshots/levels.json. A level differs when it moves by more than TOL (absolute).
// Two runs on unchanged code agree within TOL for every instrument except fx.
// The peak of the master output is measured too (level-headroom, not stored): above 1.0 it clips and the check fails.
// A line above the headroom of the song's styles (1.0 by default) is printed as a warning, never a failure.
//
// How a scene is measured, so that two runs agree (and the page's load does not change the numbers):
// - every scene starts from silence: playback stops and the check waits until every line and the output are quiet,
//   so nothing of the previous section (a guitar with no clip here, a hat tail) is measured;
// - the window is counted in the scheduler's cycles from the scene's start (WAIT bars, then WINDOW bars), not in
//   wall time: a filter that moves slowly (move: lento, a sine over 8 bars) is caught at the same phase every run;
// - every sample of the window is seen: each instrument's analyser feeds a tap of its own with a long buffer (TAP
//   samples), read often enough that no sample is missed even when the page stalls. Strudel's getAnalyzerData
//   returns only 512 samples per read (11 ms), so a read every 50 ms saw a fifth of the audio and missed hits;
// - a measure that fails (playback did not start, the window was not reached) or is silent is measured again,
//   not reported; in check mode a scene that differs is measured once more and reported only when it differs again.
// LEVELS_PRINT=1 prints every scene's levels, the lines with a moving filter and the tries.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { CLIP, tapOutput, outputPeak, songHeadroom } = require('./output-peak.cjs');
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'tests', 'snapshots', 'levels.json');
const TOL = 0.12, FLOOR = 0.03;
// distorted guitars peak differently from run to run (up to about 0.2 in the same section): wider tolerance
const TOL_OF = { guitar: 0.25 };
// a line whose filter moves (move: lento or veloce, lpf(sine.range(…).slow(8))) peaks differently from run to run
// even at the same phase: a resonant supersaw's peak depends on its oscillators' random phases (0.26 to 0.44 for the
// same bass in the same section): the same wider tolerance, for those lines only. Read from the song's tracks (the
// Live coder's code hides the filter in song functions); the line's analyser is named after the track's type
const TOL_MOVING = 0.25;
const movingOf = (song, DEFAULT) => [...new Set((song && song.tracks || []).filter(t => {
  const mv = (t.settings && t.settings.move) || (DEFAULT[t.type] && DEFAULT[t.type].move);
  return mv === 'lento' || mv === 'veloce';
}).map(t => t.type))];
// crash and riser (fx) depend on where the short measuring window falls in the scene: recorded, not compared
const SKIP = new Set(['fx']);
// bars after the scene's start before the window opens, and the window's length in bars
const WAIT = 0.5, WINDOW = 1;
// samples per tap: 16384 at 48 kHz is 340 ms, read every 40 ms
const TAP = 16384;
// quiet before a scene starts: every line and the output below QUIET, for at most QUIET_MS
const QUIET = 0.01, QUIET_MS = 10000;
const RETRIES = 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [mode, ...only] = process.argv.slice(2);
if (!['write', 'check'].includes(mode)) { console.error('usage: node tools/snapshot-levels.cjs write | check [track-id …]'); process.exit(2); }

const levelsOf = lv => Object.fromEntries(Object.entries(lv).filter(([, v]) => v >= FLOOR));
const sceneDiffs = (ref, now, moving = []) => {
  const out = [];
  for (const a of new Set([...Object.keys(ref), ...Object.keys(now)])) {
    if (SKIP.has(a)) continue;
    const x = ref[a] || 0, y = now[a] || 0;
    const tol = Math.max(TOL_OF[a] ?? TOL, moving.includes(a) ? TOL_MOVING : 0);
    if (Math.abs(x - y) > tol) out.push(`${a} ${x.toFixed(2)} -> ${y.toFixed(2)}${moving.includes(a) ? ' (moving filter)' : ''}`);
  }
  return out;
};

// one tap per instrument analyser (window.analysers), with its own long buffer; peaks kept until taken
async function tapLines(page) {
  await page.evaluate(TAP => {
    if (globalThis.miskLinePeaks) return;
    const st = { taps: {}, peak: {}, buf: new Float32Array(TAP) };
    const read = () => {
      const an = globalThis.analysers || {};
      for (const [id, node] of Object.entries(an)) {
        let t = st.taps[id];
        if (!t || t.src !== node) {
          try { const a = node.context.createAnalyser(); a.fftSize = TAP; node.connect(a); t = st.taps[id] = { src: node, a }; } catch (e) { continue; }
        }
        t.a.getFloatTimeDomainData(st.buf);
        let m = 0; for (const v of st.buf) { const x = v < 0 ? -v : v; if (x > m) m = x; }
        if (m > (st.peak[id] || 0)) st.peak[id] = m;
      }
    };
    setInterval(read, 40);
    globalThis.miskLinePeaks = { read, take: () => { read(); const p = st.peak; st.peak = {}; return p; } };
  }, TAP);
}

// stop, wait for silence, start scene i, measure the window in cycles; { name, err, lv, out, failed }
async function measureScene(page, i) {
  await page.click('#stop');
  const quiet = await page.evaluate(async ({ QUIET, QUIET_MS }) => {
    const t0 = performance.now(); let calm = 0;
    while (performance.now() - t0 < QUIET_MS) {
      await new Promise(r => setTimeout(r, 100));
      const lines = Object.values(globalThis.miskLinePeaks.take()), out = globalThis.miskOutPeak.take();
      calm = Math.max(0, ...lines) < QUIET && out < QUIET ? calm + 1 : 0;
      if (calm >= 3) return true;
    }
    return false;
  }, { QUIET, QUIET_MS });
  if (!quiet) return { failed: 'not quiet before the start', lv: {}, out: 0 };
  await page.click(`[data-scene-i="${i}"]`);
  await page.click('#play');
  return page.evaluate(async ({ WAIT, WINDOW, i }) => {
    const ed = document.querySelector('strudel-editor').editor, sc = () => ed.repl.scheduler;
    const name = () => document.getElementById('sc-name').value;
    // started: the scheduler runs and its cycle moves
    const t0 = performance.now(); let last = null;
    for (;;) {
      if (performance.now() - t0 > 15000) return { name: name(), failed: 'playback did not start', lv: {}, out: 0 };
      await new Promise(r => setTimeout(r, 10));
      if (!sc().started) continue;
      const c = sc().now();
      if (last !== null && c > last) break;
      last = c;
    }
    // loop the scene being measured: a short section (one bar at the end of a song) would otherwise end, and the
    // song stop, before the window is over (checked after the start: checking it while stopped starts playback)
    const loop = document.getElementById('sc-loop');
    if (!loop.checked) loop.click();
    // elapsed cycles, summed step by step: a section shorter than the window loops back to its start
    let done = 0, prev = sc().now(), open = false;
    const t1 = performance.now();
    while (done < WAIT + WINDOW) {
      await new Promise(r => setTimeout(r, 20));
      if (performance.now() - t1 > 30000) return { name: name(), failed: 'the window was not reached', lv: {}, out: 0 };
      const c = sc().now(), d = c - prev; prev = c;
      if (d > 0 && d < 0.5) done += d;
      if (!open && done >= WAIT) { open = true; globalThis.miskLinePeaks.take(); globalThis.miskOutPeak.take(); }
    }
    const peaks = globalThis.miskLinePeaks.take(), out = globalThis.miskOutPeak.take();
    const lv = {};
    for (const [a, v] of Object.entries(peaks)) lv[a] = Math.round(v * 100) / 100;
    return { name: name(), err: String(ed.repl.state.evalError || ''), lv, out, i };
  }, { WAIT, WINDOW, i });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`);
  await page.waitForFunction(() => document.querySelector('strudel-editor') && document.querySelector('strudel-editor').editor && document.querySelectorAll('#track-pick option').length > 1, null, { timeout: 60000 });
  await tapOutput(page);
  await tapLines(page);
  const { songFiles } = await import('./songs-dir.mjs');
  const { DEFAULT } = await import('../src/music.js');
  const songs = Object.fromEntries(songFiles('songs').map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).map(sg => [sg.id, sg]));
  let clipping = 0;
  // generated endless songs (songs/endless/, git-ignored) change with every run: no snapshots
  const ids = only.length ? only : (await page.$$eval('#track-pick option', os => os.map(o => o.value).filter(Boolean))).filter(id => !id.startsWith('endless-'));
  const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
  const out = mode === 'write' && only.length ? { ...old } : {};
  let failed = 0, warm = false;
  for (const id of ids) {
    if (!(await page.$(`#track-pick option[value="${id}"]`))) continue;
    const room = await songHeadroom(songs[id]), moving = movingOf(songs[id], DEFAULT);
    await page.click('#stop');
    await page.locator('#track-pick').selectOption(id);
    // the song in Compose is ready when it no longer grows: not growing for a whole second (the growth starts a moment
    // after the song is picked; a scene picked before it is ready starts at the growth, not at the written section)
    await page.evaluate(async () => {
      const t0 = performance.now(); let calm = 0;
      while (calm < 10 && performance.now() - t0 < 120000) { await new Promise(r => setTimeout(r, 100)); calm = globalThis.codingMiskBars().compose.pending ? 0 : calm + 1; }
    });
    const n = await page.locator('.arr-scene-btn').count();
    // the first play of the page loads the audio (worklets, samples): measured once and thrown away
    if (!warm) { await measureScene(page, 0); warm = true; }
    const ref = mode === 'check' && old[id] && old[id].length === n ? old[id] : null;
    const scenes = [];
    for (let i = 0; i < n; i++) {
      const want = ref ? ref[i].levels : null;
      let s = null, again = false, tries = 0;
      for (; tries < RETRIES; tries++) {
        s = await measureScene(page, i);
        if (s.failed) continue;
        // silent where the snapshot (or, writing, any built-in scene) has sound: a failed measure
        if (Math.max(0, ...Object.values(s.lv)) < FLOOR && s.out < FLOOR && (!want || Object.keys(want).length)) { s.failed = 'silent'; continue; }
        if (want && sceneDiffs(want, levelsOf(s.lv), moving).length && !again) { again = true; continue; }
        break;
      }
      if (s.failed) s.err = `measure ${s.failed} after ${tries} tries`;
      scenes.push(s);
      if (process.env.LEVELS_PRINT) console.log(`  ${s.name} ${JSON.stringify(levelsOf(s.lv))} moving ${moving.join(',')} tries ${tries + 1}`);
    }
    await page.click('#stop');
    const lv = scenes.map(s => levelsOf(s.lv));
    const errs = scenes.filter(s => s.err).map(s => `${s.name}: ${s.err}`);
    // the output is the hard limit; a loud line alone is a warning
    const clips = scenes.filter(s => s.out > CLIP).map(s => `${s.name} output ${s.out.toFixed(2)}`);
    const loud = scenes.flatMap(s => Object.entries(s.lv).filter(([a, v]) => !SKIP.has(a) && v > room).map(([a, v]) => `${s.name} ${a} ${v.toFixed(2)} (output ${s.out.toFixed(2)})`));
    const notes = [...clips.map(c => `CLIPS ${c}`), ...loud.map(w => `warning: above the headroom ${room}: ${w}`)];
    if (clips.length) clipping++;
    if (mode === 'write') { out[id] = scenes.map((s, i) => ({ name: s.name, levels: lv[i] })); console.log(`${id}: ${n} scenes${errs.length ? ' ERRORS ' + errs.join('; ') : ''}${notes.length ? `\n  ${notes.join('\n  ')}` : ''}`); continue; }
    const diffs = [...errs.map(e => `error ${e}`), ...clips.map(c => `clips: ${c}`)];
    if (!old[id]) diffs.push('no snapshot');
    else if (old[id].length !== n) diffs.push(`scenes ${old[id].length} -> ${n}`);
    else old[id].forEach((r, i) => { for (const d of sceneDiffs(r.levels, lv[i], moving)) diffs.push(`${r.name} ${d}`); });
    const warns = loud.map(w => `warning: above the headroom ${room}: ${w}`);
    console.log(diffs.length ? `DIFF  ${id}\n  ${[...diffs, ...warns].join('\n  ')}` : `ok    ${id}${warns.length ? `\n  ${warns.join('\n  ')}` : ''}`);
    if (diffs.length) failed++;
  }
  await browser.close();
  if (mode === 'write') { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(out, null, 1) + '\n'); console.log(`wrote ${FILE}`); }
  else console.log(failed ? `${failed} track(s) differ or clip` : 'all levels match, the output stays below clipping');
  if (mode === 'write' && clipping) console.log(`${clipping} track(s) clip the output`);
  process.exit(failed || (mode === 'write' && clipping) ? 1 : 0);
})();
