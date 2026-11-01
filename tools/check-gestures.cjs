// Browser check of the director's effect gestures (director-fold-ring, #90, tasks 4.1 and 4.2). Dev server on PORT.
// 1. Levels: for each style, radio songs whose first song draws gestures (seeds tried in turn); for each gesture, the
//    code the radio evaluates on a bar inside it, and the same code with the gesture's devices taken out (the song
//    without the gesture: gestures only add rack steps). Each played in real time from that bar: the output peak with
//    the gesture below 1.0, and the peak of the gesture track's lines with it at most the peak without + 0.02 (a Ring
//    against the same Ring at amount 0: the worklet reads the left channel only, a fact of the device, not of the level).
// 2. Cost (--seconds n, on the styles of --cost, default darksynth,industrial): the first such song's code with and
//    without its gestures played n seconds from a bar where a Ring or the most gestures sound: audio underruns (Chrome's
//    playback stats), long tasks, notes per second. Underruns with gestures should be no more than without.
// Usage: PORT=5270 PLAYWRIGHT_CORE=... node tools/check-gestures.cjs [style,style…] [--songs 5] [--seconds 30] [--cost darksynth,industrial]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { CLIP, tapOutput, outputPeak } = require('./output-peak.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const styles = (args.find((a, i) => !a.startsWith('--') && !['--songs', '--seconds', '--cost'].includes(args[i - 1])) || 'darksynth,industrial,berlin-techno,ambient').split(',');
const SONGS = Number(opt('--songs') || 5), SECONDS = Number(opt('--seconds') || 30), COST = (opt('--cost') || 'darksynth,industrial').split(',');
const PORT = process.env.PORT || 5173;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
// the analyser ids of a track's lines (src/music.js): drum rows by their instrument, a texture is "fx", else its type
const ROW_INST = { bd: 'kick', cp: 'snare', sd: 'snare', hh: 'hats', oh: 'hats', rd: 'hats' };
const idsOf = t => (t.type === 'drums' ? [...new Set(Object.entries((t.patterns.A || {}).rows || {}).filter(([, v]) => /x/.test(v)).map(([k]) => ROW_INST[k]).filter(Boolean))] : [t.type === 'texture' ? 'fx' : t.type]);

// the radio's start button stops it while it plays (the seed field is read-only meanwhile)
async function stopRadio(page) {
  if ((await page.getAttribute('#radio-start', 'aria-pressed')) === 'true') await page.click('#radio-start');
  await sleep(400);
}
// play code from a bar for ms in real time: the output peak, the peak of some analysers, underruns, long tasks, notes
async function play(page, code, at, ms, ids) {
  await outputPeak(page);
  return page.evaluate(async ([code, at, ms, ids]) => {
    const ed = document.querySelector('strudel-editor').editor, sc = ed.repl.scheduler;
    ed.repl.stop(); sc.lastEnd = at;
    await ed.repl.evaluate(code, true);
    const L = { long: 0 };
    const obs = new PerformanceObserver(list => { L.long += list.getEntries().length; });
    try { obs.observe({ type: 'longtask', buffered: false }); } catch (e) {}
    const ctx = globalThis.getAudioContext(), s = ctx.playbackStats, u0 = s ? { e: s.underrunEvents, d: s.underrunDuration } : null, c0 = sc.lastEnd, p0 = performance.now();
    await new Promise(r => setTimeout(r, 700));
    const peaks = Object.fromEntries(ids.map(id => [id, 0]));
    for (let k = 0; k < (ms - 700) / 20; k++) { for (const id of ids) { const d = getAnalyzerData('time', id); if (d) for (const v of d) peaks[id] = Math.max(peaks[id], Math.abs(v)); } await new Promise(r => setTimeout(r, 20)); }
    let notes = 0; try { notes = sc.pattern.queryArc(c0, sc.lastEnd).filter(h => h.hasOnset()).length; } catch (e) { notes = -1; }
    obs.disconnect();
    const out = { peaks, long: L.long, under: s ? s.underrunEvents - u0.e : null, underDur: s ? s.underrunDuration - u0.d : null, nps: notes / ((performance.now() - p0) / 1000), err: String(ed.repl.state.evalError || '') };
    ed.repl.stop();
    return out;
  }, [code, at, ms, ids]).then(async r => ({ ...r, out: await outputPeak(page) }));
}

(async () => {
  const { rackCode } = await import('../src/song/rack.js');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`); await sleep(3500);
  await page.click('#play'); await sleep(2500); await page.click('#stop'); await sleep(500);
  let songs = 0, gestures = 0;
  for (const style of styles) {
    await page.evaluate(st => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: [st], chaos: 0.5, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: 'classic' })); }, style);
    await page.reload(); await sleep(3500);
    await tapOutput(page);
    await page.evaluate(() => { const ed = document.querySelector('strudel-editor').editor, ev = ed.repl.evaluate.bind(ed.repl); globalThis.miskCodes = []; ed.repl.evaluate = (c, ...a) => { globalThis.miskCodes.push(c); return ev(c, ...a); }; });
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    let found = 0, costDone = !COST.includes(style);
    for (let i = 0; i < 60 && found < SONGS; i++) {
      await page.fill('#radio-seed', `gest-${style}-${i}`); await page.click('#radio-start'); await sleep(1800);
      const s = await page.evaluate(() => { const st = globalThis.codingMiskRadio.steering; return st && { gestures: st.plan.gestures || [], song: st.song, phrase: st.plan.phrase }; });
      if (!s || !s.gestures.length) { await stopRadio(page); continue; }
      found++; songs++;
      const trackOf = id => s.song.tracks.find(t => t.id === id);
      const lines = [];
      // the code of a bar with and without the gestures sounding there (their devices' code taken out or given back)
      const variantsAt = async b => {
        await page.evaluate(x => globalThis.codingMiskRadio.seek(x), b + 0.5); await sleep(2200);
        const code = await page.evaluate(() => globalThis.miskCodes[globalThis.miskCodes.length - 1]);
        let plain = code, inCode = 0;
        for (const g of s.gestures.filter(x => x.start <= b && b < x.end)) for (const st of g.steps.filter(x => x.rack && x.at <= b)) {
          const { track, ...dev } = st.rack, t = trackOf(track), with_ = rackCode([dev], t.type);
          if (!plain.includes(with_)) continue;
          inCode++;
          const back = g.kind === 'fmRise' && dev.device === 'fm' ? (g.steps.find(x => x.at === g.end && x.rack && x.rack.device === 'fm') || {}).rack : null;
          // (a Ring without it: the same device at amount 0, so the line passes the same worklet, which reads the left
          // channel only: the analysers mix to mono, and a stereo sample read on one side would differ by that alone)
          plain = plain.split(with_).join(dev.device === 'ring' ? rackCode([{ ...dev, amount: 0 }], t.type) : back ? rackCode([(({ track: _, ...d }) => d)(back)], t.type) : '');
        }
        // the FM rise's lower gain (FM_RISE_GAIN) given back in the code without it
        const num = n => String(Math.round(n * 100) / 100);
        for (const g of s.gestures.filter(x => x.start <= b && b < x.end)) for (const st of g.steps.filter(x => x.set && x.at <= b)) {
          const back = g.steps.find(x => x.set && x.at === g.end && x.set.track === st.set.track);
          if (back && plain.includes(`.gain(${num(st.set.gain)})`)) plain = plain.split(`.gain(${num(st.set.gain)})`).join(`.gain(${num(back.set.gain)})`);
          else console.log(`      (bar ${b}: the gain ${st.set.gain} of ${st.set.track} not found in the code)`);
        }
        return { code, plain, inCode };
      };
      for (const g of s.gestures) {
        gestures++;
        const b = g.start + Math.min(g.end - g.start - 1, Math.floor(s.phrase / 2));
        const v = await variantsAt(b);
        const ids = [...new Set(g.tracks.flatMap(id => idsOf(trackOf(id))))];
        check(v.inCode > 0, `${style} ${i}: ${g.kind} on ${g.tracks} is in the code of bar ${b}`);
        if (!v.inCode) continue;
        const w = await play(page, v.code, b, 4200, ids), o = await play(page, v.plain, b, 4200, ids);
        check(!w.err && !o.err, `${style} ${i}: ${g.kind} plays without errors`, w.err || o.err);
        check(w.out < CLIP, `${style} ${i}: ${g.kind}: output below full scale`, w.out.toFixed(3));
        for (const id of ids) check(w.peaks[id] <= o.peaks[id] + 0.02, `${style} ${i}: ${g.kind}: line ${id} with it at most without + 0.02`, `${w.peaks[id].toFixed(3)} against ${o.peaks[id].toFixed(3)}`);
        lines.push(`${g.kind} ${g.tracks.join('+')} bars ${g.start}-${g.end}: out ${o.out.toFixed(2)}→${w.out.toFixed(2)}, ${ids.map(id => `${id} ${o.peaks[id].toFixed(2)}→${w.peaks[id].toFixed(2)}`).join(', ')}`);
      }
      console.log(`      ${style} gest-${style}-${i}: ${lines.join(' | ')}`);
      if (!costDone && SECONDS > 0) {
        costDone = true;
        const g = s.gestures.find(x => x.kind === 'metalHits' || x.kind === 'ringHeld') || s.gestures[0];
        const b = g.start, v = await variantsAt(b);
        const w = await play(page, v.code, b, SECONDS * 1000, []), o = await play(page, v.plain, b, SECONDS * 1000, []);
        console.log(`      ${style} cost, ${SECONDS} s from bar ${b} (${g.kind}): with ${w.under ?? '?'} underruns (${(w.underDur || 0).toFixed(3)} s), ${w.long} long tasks, ${w.nps.toFixed(0)} notes/s; without ${o.under ?? '?'} underruns (${(o.underDur || 0).toFixed(3)} s), ${o.long} long tasks`);
        if (w.under !== null && o.under !== null) check(w.underDur <= o.underDur + 0.05, `${style}: underruns with gestures no more than without`, `${(w.underDur || 0).toFixed(3)} s against ${(o.underDur || 0).toFixed(3)} s`);
      }
      await stopRadio(page);
    }
    check(found > 0, `${style}: radio songs with gestures found`, String(found));
  }
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  console.log(`${songs} songs, ${gestures} gestures`);
  await browser.close();
  console.log(failed ? `${failed} check(s) failed` : 'all gesture browser checks passed');
  process.exit(failed ? 1 : 0);
})();
