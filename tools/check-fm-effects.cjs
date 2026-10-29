// Browser check and cost measure of the FM-like rack effects (fm-like-effects, #90, design D4). Dev server on PORT.
// 1. Sound and level in the page: a drum sample, a voice sample and a synth pad played plain, with Fold (default and
//    amount 3, both curves) and with Ring (default and amount 1): no evaluation or page error; with Ring the line's
//    peak at most its plain peak + 0.02, with Fold at most the higher of its plain peak and its type's usual peak + 0.02.
// 2. A radio session per style stacked to 12 tracks with "+" (as check-arrangement-levels.cjs); the code the radio
//    evaluates on that bar is taken, and variants are made: plain; Ring on the lead (ring1) and on lead, bass and snare
//    (ring3), the usual use; Ring on every line and Fold on every line (`all(x => x<device code>)`, the rack device's own
//    code: the worst case, every note through the device).
// 3. Fast export: 16 bars of each variant rendered by the fast export's render page (renderOffline). Printed: render
//    seconds per second of audio, the slowdown against plain, the peak. The device variants must differ from plain
//    (the effect is in the file) and stay below 1.0.
// 4. Real time: each variant played SECONDS seconds in the page. Printed: long tasks and the longest, audio underruns
//    (Chrome's playback stats, else the audio clock against the page clock), notes per second, and the main-thread time
//    spent compiling the Ring's Kabelsalat source (compileKabel) per note and per second.
// Fails on errors, an output at or above 1.0, a device line louder than plain, or a device that leaves the file
// unchanged. The cost numbers are reported, not judged: the owner decides step 3 of #90 on them.
// Usage: PORT=5201 PLAYWRIGHT_CORE=... node tools/check-fm-effects.cjs [style,style…] [--seconds 30] [--no-cost]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { CLIP } = require('./output-peak.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const styles = (args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--seconds') || 'berlin-techno').split(',');
const SECONDS = Number(opt('--seconds') || 30), COST = !args.includes('--no-cost');
const PORT = process.env.PORT || 5173;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

// the peak of one line in the page, from its analyser, over ms; each run has an analyser of its own (a long voice
// sample of the run before still sounds after the stop)
let probes = 0;
async function linePeak(page, code, ms = 2400) {
  const id = `fx-probe-${++probes}`;
  code = code.replace('"fx-probe"', `"${id}"`);
  return page.evaluate(async ([code, ms, id]) => {
    const ed = document.querySelector('strudel-editor').editor;
    await ed.repl.evaluate(code, true);
    await new Promise(r => setTimeout(r, 900));
    let m = 0, sq = 0, n = 0;
    // (read every 20 ms: an analyser holds its last 2048 samples, about 43 ms, so no peak is missed)
    for (let k = 0; k < ms / 20; k++) { const d = getAnalyzerData('time', id); for (const v of d) { m = Math.max(m, Math.abs(v)); sq += v * v; n++; } await new Promise(r => setTimeout(r, 20)); }
    ed.repl.stop();
    return { peak: m, rms: Math.sqrt(sq / Math.max(n, 1)), err: String(ed.repl.state.evalError || '') };
  }, [code, ms, id]);
}

(async () => {
  const { rackCode, newDevice, FOLD_PEAK } = await import('../src/song/rack.js');
  const TYPE = { drums: 'drums', voice: 'voice', pad: 'pad' };
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/getTrigger\] error|worklet/i.test(m.text()) && /error/i.test(m.text())) errors.push(m.text().slice(0, 160)); });
  await page.goto(`http://localhost:${PORT}/`); await sleep(3500);
  // the audio and its worklets start with the first Play
  await page.click('#play'); await sleep(2500); await page.click('#stop'); await sleep(500);

  // 1. sound and level in the page
  const LINES = {
    drums: 's("bd*4, [~ hh]*4, ~ cp").bank("RolandTR909").gain(0.6)',
    voice: 's("say_it:3").gain(0.5)',
    // (one note at a time, with rests: the bounds hold per note; chords and overlapping tails add up)
    pad: 'note("a3 ~ g3 ~").s("sawtooth").lpf(1800).gain(0.25)',
  };
  const DEVS = [['fold', newDevice('fold')], ['fold 3 soft', { device: 'fold', amount: 3, curve: 'soft' }], ['fold 3 sharp', { device: 'fold', amount: 3, curve: 'sharp' }], ['ring', newDevice('ring')], ['ring 1500 x1', { device: 'ring', freq: 1500, amount: 1 }]];
  for (const [type, line] of Object.entries(LINES)) {
    // (once to load its samples: a sample heard while loading starts late and measures low)
    await linePeak(page, `$: ${line}.orbit(1).analyze("fx-probe")`, 500);
    const plain = await linePeak(page, `$: ${line}.orbit(1).analyze("fx-probe")`);
    const row = [`plain ${plain.peak.toFixed(2)}/${plain.rms.toFixed(3)}`];
    check(!plain.err && plain.peak > 0.02, `${type}: plays plain`, plain.err || plain.peak.toFixed(3));
    for (const [name, dev] of DEVS) {
      const r = await linePeak(page, `$: ${line}${rackCode([dev], TYPE[type])}.orbit(1).analyze("fx-probe")`);
      row.push(`${name} ${r.peak.toFixed(2)}/${r.rms.toFixed(3)}`);
      check(!r.err && r.peak > 0.005, `${type} with ${name}: plays`, r.err || r.peak.toFixed(3));
      // Ring: never above plain; Fold: never above plain or the usual peak of the track type (fm-like-effects D2)
      const cap = dev.device === 'fold' ? Math.max(plain.peak, FOLD_PEAK[TYPE[type]]) : plain.peak;
      check(r.peak <= cap + 0.02, `${type} with ${name}: at most ${dev.device === 'fold' ? 'plain or its type\'s usual peak' : 'plain'}`, `${r.peak.toFixed(3)} against ${cap.toFixed(3)}`);
    }
    console.log(`      ${type} (peak/rms): ${row.join(', ')}`);
  }

  // 2.-4. a 12-track radio song, its fast export and its load
  for (const style of COST ? styles : []) {
    await page.evaluate(st => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: [st], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); }, style);
    await page.reload(); await sleep(3500);
    // the code the radio evaluates, and the time spent compiling Kabelsalat sources (set again by every evaluation)
    await page.evaluate(() => {
      const ed = document.querySelector('strudel-editor').editor, ev = ed.repl.evaluate.bind(ed.repl);
      globalThis.miskCodes = []; ed.repl.evaluate = (c, ...a) => { globalThis.miskCodes.push(c); return ev(c, ...a); };
      const K = globalThis.miskKabel = { n: 0, ms: 0, fn: null };
      Object.defineProperty(globalThis, 'compileKabel', { configurable: true, get: () => (K.fn ? src => { const t = performance.now(); try { return K.fn(src); } finally { K.ms += performance.now() - t; K.n++; } } : undefined), set: f => { K.fn = f; } });
    });
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    await page.fill('#radio-seed', `fm-effects-${style}`); await page.click('#radio-start'); await sleep(2500);
    const stack = await page.evaluate(async () => {
      const R = globalThis.codingMiskRadio, { stateAt } = await import('/src/song/build.js'), S = await import('/src/endless/steering.js');
      const it = () => R.steering, count = (song, bar) => stateAt(song, bar).song.tracks.filter(t => !t.mute && !['voice', 'spoken', 'riser'].includes(t.type)).length;
      const at0 = () => { const s = it(); return s.commands.length ? s.commands[0].at : null; };
      for (let j = 0; j < 40; j++) { const s = it(), at = at0(); if (at !== null && count(s.song, at) >= S.TRACK_CAP) break; R.command({ kind: 'more', part: S.INSTRUMENTS[j % S.INSTRUMENTS.length] }); }
      const s = it(), at = at0();
      return { at, n: count(s.song, at), bpm: s.song.sections.map(x => x.bpm) };
    });
    check(stack.n === 12, `${style}: 12 tracks play from bar ${stack.at}`, String(stack.n));
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), stack.at + 0.5); await sleep(3000);
    const base = await page.evaluate(() => globalThis.miskCodes[globalThis.miskCodes.length - 1]);
    await page.click('#radio-stop').catch(() => {}); await sleep(800);
    const bpm = Number((base.match(/setcpm\(([\d.]+)\/4\)/) || [])[1] || stack.bpm[0] || 120);
    // Ring on some instruments only: the device before the orbit and analyser of their lines (the usual use: one or a
    // few tracks), on every line (ring, fold: the worst case)
    const ringOn = names => base.replace(/(\.orbit\(\d+\)\.analyze\("([a-z0-9-]+)"\))/g, (m, x, id) => (names.includes(id) ? `${rackCode([newDevice('ring')], 'pad')}${x}` : x));
    const variants = { plain: base, ring1: ringOn(['hook']), ring3: ringOn(['hook', 'bass', 'snare']), ring: `${base}\nall(x => x${rackCode([newDevice('ring')], 'pad')})`, fold: `${base}\nall(x => x${rackCode([newDevice('fold')], 'pad')})` };
    for (const k of ['ring1', 'ring3']) if (variants[k] === base) delete variants[k];

    // fast export: 16 bars from the stacked bar
    const BARS = 16, from = stack.at, to = stack.at + BARS;
    const render = {};
    for (const [name, code] of Object.entries(variants)) {
      render[name] = await page.evaluate(async ([code, bpm, from, to, name]) => {
        const { renderOffline } = await import('/src/export/fast.js');
        const bars = Array.from({ length: to + 1 }, () => bpm), spb = 240 / bpm;
        let t0 = null;
        const job = { segments: [{ from: 0, to: to + 1, code }], bpm: bars, from: from * spb, to: to * spb, tail: 1, sampleRate: 48000 };
        const r = await renderOffline(job, (p, phase) => { if (phase === 'render' && t0 === null) t0 = performance.now(); }).promise;
        const ms = performance.now() - (t0 ?? performance.now());
        const L = r.channels[0], R = r.channels[1];
        let peak = 0; for (const c of [L, R]) for (const v of c) peak = Math.max(peak, Math.abs(v));
        // a mono copy, every 8th sample, to compare variants
        const mono = []; for (let i = 0; i < L.length; i += 8) mono.push((L[i] + R[i]) / 2);
        globalThis.miskRender = globalThis.miskRender || {}; globalThis.miskRender[name] = mono;
        return { ms, seconds: (to - from) * spb + 1, peak, key: name };
      }, [code, bpm, from, to, name]);
    }
    const diff = await page.evaluate(keys => {
      const a = globalThis.miskRender[keys.plain], out = {};
      for (const [k, key] of Object.entries(keys)) { const b = globalThis.miskRender[key]; let d = 0, p = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) { d += (a[i] - b[i]) ** 2; p += a[i] ** 2; } out[k] = Math.sqrt(d / Math.max(p, 1e-9)); }
      return out;
    }, Object.fromEntries(Object.entries(render).map(([k, v]) => [k, v.key])));
    const speed = x => x.ms / 1000 / x.seconds;
    console.log(`      ${style} fast export, ${BARS} bars (${render.plain.seconds.toFixed(1)} s of audio):`);
    for (const [name, r] of Object.entries(render)) console.log(`        ${name.padEnd(6)} ${(r.ms / 1000).toFixed(2)} s render, ${speed(r).toFixed(3)} s per audio second (${(1 / speed(r)).toFixed(1)}× real time), ×${(speed(r) / speed(render.plain)).toFixed(2)} of plain, peak ${r.peak.toFixed(3)}, difference from plain ${(diff[name] * 100).toFixed(0)}%`);
    for (const name of ['ring', 'fold']) {
      check(diff[name] > 0.1, `${style}: ${name} is in the fast export (differs from plain)`, `${(diff[name] * 100).toFixed(0)}%`);
      check(render[name].peak < CLIP, `${style}: ${name} fast export below full scale`, render[name].peak.toFixed(3));
    }

    // real time: each variant SECONDS seconds
    console.log(`      ${style} real time, ${SECONDS} s each:`);
    for (const [name, code] of Object.entries(variants)) {
      const r = await page.evaluate(async ([code, at, seconds]) => {
        const ed = document.querySelector('strudel-editor').editor, sc = ed.repl.scheduler, K = globalThis.miskKabel;
        ed.repl.stop(); sc.lastEnd = at;
        let notes = 0;
        const sd = globalThis.superdough;
        await ed.repl.evaluate(code, true);
        // notes started: the haps the pattern gives over the bars played
        const L = { long: 0, longest: 0 };
        const obs = new PerformanceObserver(list => { for (const e of list.getEntries()) { L.long++; L.longest = Math.max(L.longest, e.duration); } });
        try { obs.observe({ type: 'longtask', buffered: false }); } catch (e) {}
        const ctx = globalThis.getAudioContext(), s = ctx.playbackStats;
        const k0 = { n: K.n, ms: K.ms }, a0 = ctx.currentTime, p0 = performance.now(), c0 = sc.lastEnd;
        const u0 = s ? { e: s.underrunEvents, d: s.underrunDuration } : null;
        await new Promise(res => setTimeout(res, seconds * 1000));
        const c1 = sc.lastEnd;
        try { notes = sc.pattern.queryArc(c0, c1).filter(h => h.hasOnset()).length; } catch (e) { notes = -1; }
        obs.disconnect();
        const out = { long: L.long, longest: Math.round(L.longest), audio: ctx.currentTime - a0, page: (performance.now() - p0) / 1000, under: s ? s.underrunEvents - u0.e : null, underDur: s ? s.underrunDuration - u0.d : null, kn: K.n - k0.n, kms: K.ms - k0.ms, notes, err: String(ed.repl.state.evalError || '') };
        ed.repl.stop();
        return out;
      }, [code, from, SECONDS]);
      await sleep(1500);
      const nps = r.notes / r.page;
      console.log(`        ${name.padEnd(6)} ${r.notes} notes (${nps.toFixed(0)}/s), long tasks ${r.long} (longest ${r.longest} ms), ${r.under !== null ? `underruns ${r.under} (${(r.underDur || 0).toFixed(3)} s)` : `clock drift ${(r.audio - r.page).toFixed(2)} s`}${r.kn ? `, compileKabel ${r.kn} calls, ${(r.kms / r.kn).toFixed(3)} ms each, ${(r.kms / r.page).toFixed(1)} ms per second (${(r.kms / r.page / 10).toFixed(2)}% of the main thread)` : ''}`);
      check(!r.err, `${style} ${name}: no evaluation error in real time`, r.err);
      if (name.startsWith('ring')) check(r.kn > 0, `${style} ring: the Kabelsalat source is compiled for the notes`, String(r.kn));
    }
  }
  check(!errors.length, 'no page or worklet errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} check(s) failed` : 'all FM-like effect browser checks passed');
  process.exit(failed ? 1 : 0);
})();
