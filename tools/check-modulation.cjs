// Movement devices in the browser (sound-modulation, #95, tasks 1.3-1.5 and 2.2), rendered by the fast export's render
// page (renderOffline), measured in the page:
// 1. the example songs (songs/examples/07-pump, 08-sweep, 09-sway) render with no superdough error and below 0.97;
// 2. Sweep: the glide inside a held bar (brightness at four points of bar 4 between the starts of bars 4 and 5, no
//    overshoot), against the same pad with steps only; the peak at most the open filter's peak plus 0.02;
// 3. LFO: the filter LFO's depth units (lpdepth against static cutoffs), the pan LFO's side to side swings, the level
//    rule against the most open filter;
// 4. Pump: the pad's level per beat phase with a kick (a dip after the kick, back before the next) and without a kick
//    (the beat dip), never above the pad without Pump plus 0.02; the mix never louder;
// 5. the same code renders the same twice;
// 6. movement parameters (D11 to D13): the Gate on a held pad (open and closed steps, smoothed edges, never louder), the
//    phase of a Pump's dip and of a tremolo moving their low point, the tremolo never louder, the vibrato's pitch swing;
// 7. playback against the fast export (needs ffmpeg; --no-export skips it): example-gate exported fast and in real time
//    from the Songs tab, aligned on the kick of its second section, the gated pad and the phased bass dip of its first
//    section folded per bar: the same place within a 32nd of a bar.
// Fast export against real time, loudness: tools/check-export.cjs example-pump example-sweep example-gate.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-modulation.cjs [--json out] [--no-export]   (dev server on PORT)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs');
const PORT = process.env.PORT || 5173;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
let failed = 0;
const out = {};
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const r3 = x => Math.round(x * 1000) / 1000;

(async () => {
  const { compileSong } = await import('../src/song/compile.js');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 }, acceptDownloads: true })).newPage();
  const errors = [];
  page.on('console', m => { const t = m.text(); if (/error/i.test(t) && /superdough|duck|modulat|connect/i.test(t)) errors.push(t); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/`); await new Promise(r => setTimeout(r, 4000));
  // render `code` for `bars` bars at `bpm`; the result stays in the page (window.__mod) for the measures below
  const render = (code, bars, bpm = 120) => page.evaluate(async ([code, bars, bpm]) => {
    const { renderOffline } = await import('/src/export/fast.js');
    const sec = 240 / bpm;
    const r = await renderOffline({ segments: [{ from: 0, to: bars + 1, code }], bpm: Array.from({ length: bars + 1 }, () => bpm), from: 0, to: bars * sec, tail: 1, sampleRate: 48000 }).promise;
    window.__mod = { L: r.channels[0], R: r.channels[1], sr: r.sampleRate, sec };
    let peak = 0; for (let i = 0; i < r.channels[0].length; i++) peak = Math.max(peak, Math.abs(r.channels[0][i]), Math.abs(r.channels[1][i]));
    return { peak, seconds: r.channels[0].length / r.sampleRate };
  }, [code, bars, bpm]);
  // measures of the last render over windows [bar start, bar end] (bars, fractional): rms, brightness (the spectral
  // centroid in Hz, 2048-point frames every 512 samples, Hann window, averaged weighted by energy), left minus right
  const measure = windows => page.evaluate(ws => {
    const { L, R, sr, sec } = window.__mod, N = 2048;
    const fft = (re, im) => {
      const n = re.length;
      for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
      for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
    };
    return ws.map(([a, b]) => {
      const i0 = Math.floor(a * sec * sr), i1 = Math.min(L.length, Math.floor(b * sec * sr));
      let s = 0, l = 0, r = 0;
      for (let i = i0; i < i1; i++) { const m = (L[i] + R[i]) / 2; s += m * m; l += L[i] * L[i]; r += R[i] * R[i]; }
      let cw = 0, ce = 0;
      for (let f0 = i0; f0 + N <= Math.max(i1, i0 + N) && f0 + N <= L.length; f0 += 512) {
        const re = new Float64Array(N), im = new Float64Array(N);
        for (let k = 0; k < N; k++) re[k] = (L[f0 + k] + R[f0 + k]) / 2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * k / N));
        fft(re, im);
        let e = 0, c = 0;
        for (let k = 1; k < N / 2; k++) { const p = re[k] * re[k] + im[k] * im[k]; e += p; c += p * k * sr / N; }
        cw += c; ce += e;
        if (f0 + N >= i1) break;
      }
      const n = Math.max(1, i1 - i0);
      return { rms: Math.sqrt(s / n), bright: ce ? cw / ce : 0, lr: 10 * Math.log10(Math.max(1e-12, l) / Math.max(1e-12, r)) };
    });
  }, windows);
  const same = () => page.evaluate(() => { const a = window.__prev, b = window.__mod; if (!a) return null; let m = 0; for (let i = 0; i < Math.min(a.L.length, b.L.length); i++) m = Math.max(m, Math.abs(a.L[i] - b.L[i])); return { max: m, len: a.L.length === b.L.length }; });
  const keep = () => page.evaluate(() => { window.__prev = window.__mod; });
  const head = (bpm = 120) => `setcpm(${bpm}/4)\n`;
  // a held chord struck on every bar, a plain saw (no random phases)
  const PAD = '$: note("a2").s("sawtooth").attack(.01).release(.05).room(0).gain(.3)';

  // ---------- 1. the example songs ----------
  for (const f of ['07-pump', '08-sweep', '09-sway', '10-gate']) {
    const s = JSON.parse(fs.readFileSync(`songs/examples/${f}.json`, 'utf8')), n = errors.length;
    const r = await render(compileSong(s), 16, 124);
    check(errors.length === n && r.peak > 0.05 && r.peak < 0.97, `${f}: renders with no superdough error, peak below 0.97`, `peak ${r3(r.peak)}${errors.length > n ? `; ${errors.slice(n).join(' | ')}` : ''}`);
    out[f] = { peak: r3(r.peak) };
  }

  // ---------- 2. Sweep ----------
  {
    // a held pad, one chord per bar, the Sweep's held form (8 bars from 400 to 4000), against steps only
    const glide = ".lpf(\"<400 533 711 949 1265 1687 2249 3000 4000!4>\").env({ c: 'lpf', a: 2, s: 1, da: \"<133 178 237 316 422 563 750 1000 0!4>\" })";
    const steps = '.lpf("<400 533 711 949 1265 1687 2249 3000 4000!4>")';
    await render(head() + PAD + glide, 12);
    const pts = [0.3, 0.5, 0.7, 0.9].map(x => [3 + x - 0.05, 3 + x + 0.05]);
    const g = await measure([[3.02, 3.1], ...pts, [4.02, 4.1], [7.85, 7.95], [10.4, 10.6]]);
    await render(head() + PAD + steps, 12);
    const st = await measure([[3.02, 3.1], ...pts, [4.02, 4.1]]);
    const gb = g.map(x => r3(x.bright)), sb = st.map(x => r3(x.bright));
    // the glide over the steps at each of the four points: it grows through the bar
    const ratio = [1, 2, 3, 4].map(i => r3(gb[i] / sb[i]));
    const up = gb.slice(0, 5).every((v, i, a) => i === 0 || v > a[i - 1]), flat = Math.abs(sb[4] - sb[1]) / sb[1] < 0.01;
    const rising = up && flat && gb[4] - gb[0] > 0.6 * (gb[5] - gb[0]);
    check(rising, 'Sweep glide: bar 4 gets brighter inside the held note, the steps-only pad does not', `glide ${gb.slice(0, 6).join(' ')}; steps ${sb.join(' ')}; glide/steps ${ratio.join(' ')}`);
    check(gb[4] <= gb[5] * 1.1 && gb[1] >= gb[0] * 0.95, 'Sweep glide: no overshoot past the next bar\'s start', `end of bar 4 ${gb[4]}, start of bar 5 ${gb[5]}`);
    check(Math.abs(gb[6] - gb[7]) / gb[7] < 0.15, 'Sweep reaches its end value within the last bar and holds it', `end of bar 8 ${gb[6]}, bar 11 ${gb[7]}`);
    out.glide = { glide: gb, steps: sb };
    // level: the sweep against the pad with the filter at 4000
    const a = await render(head() + PAD + glide, 12), b = await render(head() + PAD + '.lpf(4000)', 12);
    check(a.peak <= b.peak + 0.02, 'Sweep peak at most the open filter\'s peak plus 0.02', `${r3(a.peak)} against ${r3(b.peak)}`);
    // short notes: the ramp form on an arpeggio
    const ar = '$: note("a3 c4 e4 a4".fast(4)).s("square").decay(.15).sustain(.15).gain(.3)';
    const c = await render(head() + ar + '.lpf(saw.slow(4).rangex(300, 5083))', 4), m = await measure([[0, 0.5], [3.5, 4]]), d = await render(head() + ar + '.lpf(5000)', 4);
    check(c.peak <= d.peak + 0.02 && m[1].bright > m[0].bright * 1.3, 'Sweep on short notes: brighter at the end, peak within the open filter\'s', `brightness ${r3(m[0].bright)} → ${r3(m[1].bright)}, peak ${r3(c.peak)} against ${r3(d.peak)}`);
  }

  // ---------- 3. LFO ----------
  {
    // lpdepth units: a held pad at 1000 Hz, lpsync(1) (one sway per bar, sine), against static cutoffs
    const HELD = '$: note("[a3,c4,e4]").s("sawtooth").attack(.01).release(.1).room(0).gain(.3)';
    const stat = [];
    for (const hz of [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1150, 1300, 1450, 1600, 1750, 1900]) { await render(head() + HELD + `.lpf(${hz})`, 1); stat.push([hz, (await measure([[0.2, 0.8]]))[0].bright]); }
    // the cutoff whose static brightness matches a measured one (linear between the grid's points)
    const cutOf = v => { for (let i = 1; i < stat.length; i++) if (v <= stat[i][1]) { const [h0, b0] = stat[i - 1], [h1, b1] = stat[i]; return Math.round(h0 + (h1 - h0) * Math.max(0, (v - b0) / ((b1 - b0) || 1))); } return stat[stat.length - 1][0]; };
    const rows = [];
    for (const d of [0.36, 0.72, 1.44]) {
      await render(head() + HELD + `.lpf(1000).lpsync(1).lpdepth(${d}).lpshape("sine")`, 2);
      const w = await measure(Array.from({ length: 16 }, (_, i) => [1 + i / 16, 1 + (i + 1) / 16]));
      const b = w.map(x => x.bright);
      rows.push({ lpdepth: d, bottom: cutOf(Math.min(...b)), top: cutOf(Math.max(...b)), expect: [Math.round(1000 * (1 - d / 2)), Math.round(1000 * (1 + d / 2))] });
    }
    out.lpdepth = rows;
    // the 1/16-bar windows average the sway, so the measured span is a little narrower than the true one
    const okUnits = rows.every(r => Math.abs(r.top - r.expect[1]) / r.expect[1] < 0.2 && Math.abs(r.bottom - Math.max(200, r.expect[0])) / Math.max(200, r.expect[0]) < 0.35);
    check(okUnits, 'filter LFO: lpdepth d sways the cutoff from (1 - d/2) to (1 + d/2) times its value (linear, the mapping depth × 1.8)', rows.map(r => `${r.lpdepth}: ${r.bottom}-${r.top} Hz (expected ${r.expect.join('-')})`).join('; '));
    // level rule: depth 1 (lpdepth 1.8) against the most open value 1.9 × 1000
    const a = await render(head() + HELD + '.lpf(1000).lpsync(2).lpdepth(1.8).lpshape("sine")', 2), b = await render(head() + HELD + '.lpf(1900)', 2);
    check(a.peak <= b.peak + 0.02, 'filter LFO peak at most the most open filter\'s peak plus 0.02', `${r3(a.peak)} against ${r3(b.peak)}`);
    // pan: depth 1 at 1/2 bar, a held chord: left and right swap twice in the bar
    await render(head() + HELD + ".pan(0.5).lfo({ c: 'pan', s: 2, da: 2, sh: 'sine' })", 2);
    const w = await measure(Array.from({ length: 16 }, (_, i) => [1 + i / 16, 1 + (i + 1) / 16]));
    const lr = w.map(x => x.lr), flips = lr.slice(1).filter((v, i) => Math.sign(v) !== Math.sign(lr[i])).length;
    check(flips >= 3 && flips <= 5 && Math.max(...lr) > 10 && Math.min(...lr) < -10, 'pan LFO: from one side to the other and back twice within the bar', `${flips} crossings, L-R from ${r3(Math.min(...lr))} to ${r3(Math.max(...lr))} dB`);
    out.pan = lr.map(r3);
  }

  // ---------- 4. Pump ----------
  {
    // a held pad on orbit 6; the kick nearly silent (gain .001) so the pad alone is measured, then heard
    const P = '$: note("[a3,c4,e4]").s("sawtooth").attack(.01).release(.1).room(0).gain(.3).orbit(6)';
    const K = g => `$: s("bd*4").bank("RolandTR909").gain(${g}).duck(6).duckdepth(0.6).duckattack(0.15).orbit(1)`;
    const phase = async () => { const w = await measure(Array.from({ length: 32 }, (_, i) => [1 + i / 32, 1 + (i + 1) / 32])); const beat = Array(8).fill(0); w.forEach((x, i) => { beat[i % 8] += x.rms / 4; }); return beat; };
    const base = await render(head() + P, 3), bphase = await phase();
    const a = await render(head() + P + '\n' + K(0.001), 3), ph = await phase();
    const dip = 20 * Math.log10(ph[0] / bphase[0]), back = 20 * Math.log10(ph[7] / bphase[7]);
    check(dip < -6 && back > -2 && a.peak <= base.peak + 0.02, 'Pump with a kick: the pad dips after each kick and is back before the next, never louder', `first eighth of a beat ${dip.toFixed(1)} dB, last ${back.toFixed(1)} dB, peak ${r3(a.peak)} against ${r3(base.peak)}`);
    out.pumpKick = ph.map(x => r3(20 * Math.log10(x / bphase[0])));
    // without a kick: the beat dip
    await render(head() + P + ".lfo({ c: 'gain', s: 4, da: 0.18, dc: -1, sh: 'ramp' })", 3);
    const nk = await phase(), c = await page.evaluate(() => { const { L, R } = window.__mod; let p = 0; for (let i = 0; i < L.length; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i])); return p; });
    const ndip = 20 * Math.log10(nk[0] / bphase[0]), nback = 20 * Math.log10(nk[7] / bphase[7]);
    check(ndip < -6 && nback > -3 && c <= base.peak + 0.02, 'Pump without a kick: the pad dips on every beat and comes back, never louder', `first eighth ${ndip.toFixed(1)} dB, last ${nback.toFixed(1)} dB, peak ${r3(c)} against ${r3(base.peak)}`);
    out.pumpNoKick = nk.map(x => r3(20 * Math.log10(x / bphase[0])));
    // the mix with the kick heard: never louder with Pump
    const m1 = await render(head() + P + '\n' + K(0.8).replace(/\.duck.*\.orbit/, '.orbit'), 3), m2 = await render(head() + P + '\n' + K(0.8), 3);
    check(m2.peak <= m1.peak + 0.02, 'Pump: the mix with the kick is never louder', `${r3(m2.peak)} against ${r3(m1.peak)}`);
  }


  // ---------- 6. movement parameters ----------
  {
    const M = await import('../src/song/movement.js');
    const HELD = '$: note("[a3,c4,e4]").s("sawtooth").attack(.01).release(.1).room(0).gain(.3)';
    const db = x => 20 * Math.log10(Math.max(1e-9, x));
    // rms per n-th of a bar over bars [from, to), folded into one bar
    const fold = async (n, from, to) => { const w = await measure(Array.from({ length: n * (to - from) }, (_, i) => [from + i / n, from + (i + 1) / n])); const f = Array(n).fill(0); w.forEach((x, i) => { f[i % n] += x.rms / (to - from); }); return f; };
    const lowest = f => f.indexOf(Math.min(...f));
    // the Gate: Trance A, depth 1, hard and soft edges
    const base = await render(head() + HELD, 3), bf = await fold(64, 1, 3);
    const TA = 'xx.xx.x.xx.xx.x.';
    const g0 = await render(head() + HELD + M.gateCode({ pattern: TA, depth: 1, smooth: 0, phase: 0 }, 0.3), 3), f0 = await fold(64, 1, 3);
    // the middle half of each step: open steps keep the level, closed ones are at least 30 dB down
    const stepDb = f => Array.from({ length: 16 }, (_, i) => db((f[4 * i + 1] + f[4 * i + 2]) / 2) - db((bf[4 * i + 1] + bf[4 * i + 2]) / 2));
    const s0 = stepDb(f0);
    const openOk = s0.every((d, i) => TA[i] === '.' || Math.abs(d) < 1), closedOk = s0.every((d, i) => TA[i] === 'x' || d < -30);
    check(openOk && closedOk && g0.peak <= base.peak + 0.02, 'Gate, hard edges: open steps keep the pad\'s level, closed steps are silent, never louder', `${s0.map(d => d.toFixed(0)).join(' ')} dB; peak ${r3(g0.peak)} against ${r3(base.peak)}`);
    out.gateHard = s0.map(d => r3(d));
    // soft edges: just past the edge into a closed step (5 to 20 % of a step after it, past the LFO's start of up to one
    // audio block, about 3 ms) the sound fades out with smoothing and is gone without
    const W = [[1 + 2.05 / 16, 1 + 2.2 / 16], [2 + 2.05 / 16, 2 + 2.2 / 16]];
    const edgeOf = async () => { const w = await measure(W); return db((w[0].rms + w[1].rms) / 2); };
    await render(head() + HELD, 3); const eb = await edgeOf();
    await render(head() + HELD + M.gateCode({ pattern: TA, depth: 1, smooth: 0, phase: 0 }, 0.3), 3); const eh = await edgeOf() - eb;
    await render(head() + HELD + M.gateCode({ pattern: TA, depth: 1, smooth: 0.5, phase: 0 }, 0.3), 3);
    const es = await edgeOf() - eb, f5 = await fold(64, 1, 3), s5 = stepDb(f5);
    check(es > -20 && es < -3 && eh < -40 && s5.every((d, i) => TA[i] === '.' || Math.abs(d) < 1.5), 'Gate, soft edges: the sound fades over the edge instead of stopping, open steps keep their level', `just past an edge ${es.toFixed(1)} dB soft, ${eh.toFixed(1)} dB hard`);
    // the Gate's phase: half a step later moves the silence by two 64ths
    await render(head() + HELD + M.gateCode({ pattern: 'x...x...x...x...', depth: 1, smooth: 0, phase: 0.5 }, 0.3), 3);
    const fp = await fold(64, 1, 3), quiet = fp.map((v, i) => [v, i]).filter(([v]) => db(v) - db(bf[0]) < -30).map(([, i]) => i);
    // closed steps 2 to 4 of each beat, half a step later: 64ths 6 to 17 of each 16 are silent, 2 to 5 sound
    check(quiet.length >= 40 && quiet.every(i => ![2, 3, 4, 5].includes(i % 16)), 'Gate phase 0.5: the steps start half a step later', `${quiet.length} silent 64ths: ${quiet.slice(0, 14).join(' ')}`);
    // the Pump's dip without a kick, phase 0 and 0.5: the low point moves half a beat (16 of 64 bins a bar → 8)
    await render(head() + HELD + M.pumpDipCode({ rate: 0.25, depth: 0.8, phase: 0 }, 0.3), 3);
    const d0 = await fold(32, 1, 3);
    await render(head() + HELD + M.pumpDipCode({ rate: 0.25, depth: 0.8, phase: 0.5 }, 0.3), 3);
    const d5 = await fold(32, 1, 3);
    const l0 = lowest(d0) % 8, l5 = lowest(d5) % 8;
    check(l0 <= 1 && l5 >= 3 && l5 <= 5, 'Pump dip phase 0.5: the low point moves from the beat to half a beat later', `lowest 32nd in the beat: ${l0} at phase 0, ${l5} at phase 0.5`);
    // tremolo (LFO on volume) at 1/8 bar, phase 0 and 0.25: the low point moves a quarter of its period; never louder
    const t0 = await render(head() + HELD + M.lfoCode({ target: 'volume', rate: 0.125, depth: 1, shape: 'sine', phase: 0 }), 3), tf0 = await fold(64, 1, 3);
    await render(head() + HELD + M.lfoCode({ target: 'volume', rate: 0.125, depth: 1, shape: 'sine', phase: 0.25 }), 3);
    const tf5 = await fold(64, 1, 3), lt0 = lowest(tf0) % 8, lt5 = lowest(tf5) % 8, swing = db(Math.max(...tf0)) - db(Math.min(...tf0));
    check(((lt5 - lt0 + 8) % 8) === 2 && swing > 10 && t0.peak <= base.peak + 0.02, 'tremolo (LFO on volume): sways 8 times a bar, phase 0.25 moves its low point a quarter period later, never louder', `low 64th ${lt0} → ${lt5}, swing ${swing.toFixed(1)} dB, peak ${r3(t0.peak)} against ${r3(base.peak)}`);
    out.tremolo = { phase0: lt0, phase25: lt5, swing: r3(swing) };
    // vibrato (LFO on pitch) at 1/4 bar, depth 1: a pure sine's frequency from zero crossings per 1/32 bar
    await render(head() + '$: note("a4").s("sine").attack(.01).release(.1).room(0).gain(.3)' + M.lfoCode({ target: 'pitch', rate: 0.25, depth: 1, shape: 'sine' }, { barSec: 2 }), 2);
    const fq = await page.evaluate(() => { const { L, sr, sec } = window.__mod, out = []; for (let k = 0; k < 32; k++) { const i0 = Math.floor((1 + k / 32) * sec * sr), i1 = Math.floor((1 + (k + 1) / 32) * sec * sr); let z = 0, first = -1, last = -1; for (let i = i0 + 1; i < i1; i++) if (L[i - 1] < 0 && L[i] >= 0) { const x = i - L[i] / (L[i] - L[i - 1]); if (first < 0) first = x; last = x; z++; } out.push(z > 1 ? (z - 1) * sr / (last - first) : 0); } return out; });
    const hi = Math.max(...fq), lo = Math.min(...fq.filter(x => x > 0)), cents = 1200 * Math.log2(hi / lo);
    check(cents > 60 && cents < 120, 'vibrato (LFO on pitch): depth 1 swings the pitch about a semitone peak to peak (half a semitone each way)', `${Math.round(lo)} to ${Math.round(hi)} Hz, ${Math.round(cents)} cents`);
    out.vibrato = { lo: Math.round(lo), hi: Math.round(hi), cents: Math.round(cents) };
  }

  // ---------- 5. the same twice ----------
  {
    // the song with Pump, and the same song without its Pump (the render's own spread between two runs)
    const s = JSON.parse(fs.readFileSync('songs/examples/07-pump.json', 'utf8')), s0 = JSON.parse(JSON.stringify(s));
    s0.tracks.forEach(t => { delete t.rack; });
    const twice = async code => { await render(code, 4, 124); await keep(); await render(code, 4, 124); return same(); };
    const a = await twice(compileSong(s)), b = await twice(compileSong(s0));
    check(a && a.len && a.max <= Math.max(1e-3, 2 * b.max), 'the same song renders the same twice (Pump, no random value)', `largest difference ${a && r3(a.max * 1e4) / 1e4}, without Pump ${b && r3(b.max * 1e4) / 1e4}`);
  }

  // ---------- 7. playback against the fast export ----------
  if (!process.argv.includes('--no-export')) {
    const { execFileSync } = require('node:child_process'), os = require('node:os'), path = require('node:path');
    const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mod-export-'));
    const downloads = [];
    page.on('download', d => downloads.push(d));
    const settings = o => page.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, JSON.stringify(v)); }, o);
    const pcm = f => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
    const exportAs = async speed => {
      await settings({ 'coding-misk-export-format': 'wav', 'coding-misk-export-speed': speed });
      await page.reload(); await new Promise(r => setTimeout(r, 3500));
      await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await new Promise(r => setTimeout(r, 600));
      if (!(await page.isVisible('#songs [data-song-id="example-gate"] [data-act="export"]'))) { await page.fill('#sv-q', 'Example 10'); await new Promise(r => setTimeout(r, 800)); }
      const n = downloads.length, t0 = Date.now();
      await page.click('#songs [data-song-id="example-gate"] [data-act="export"]');
      await new Promise(r => setTimeout(r, 1500));
      while (Date.now() - t0 < 120000) {
        const busy = await page.evaluate(() => globalThis.codingMiskExport.job) || /REC|●/.test(await page.textContent('#songs [data-song-id="example-gate"] [data-act="export"]'));
        if (!busy) break;
        await new Promise(r => setTimeout(r, 500));
      }
      await new Promise(r => setTimeout(r, 1500));
      const d = downloads.slice(n).find(x => /\.wav$/.test(x.suggestedFilename()));
      if (!d) return null;
      const f = path.join(TMP, `${speed}.wav`); await d.saveAs(f); return pcm(f);
    };
    const F = await exportAs('fast'), R = await exportAs('real');
    if (!F || !R) check(false, 'example-gate: exported fast and in real time');
    else {
      const sr = 48000, bar = 240 / 132 * sr;
      const lowpass = (a, hz) => { const k = 1 - Math.exp(-2 * Math.PI * hz / sr), o = new Float32Array(a.length); let y = 0; for (let i = 0; i < a.length; i++) { y += k * (a[i] - y); o[i] = y; } return o; };
      const band = (a, lo, hi) => { const h = hi ? lowpass(a, hi) : a, l = lo ? lowpass(h, lo) : null; return l ? h.map((v, i) => v - l[i]) : h; };
      const env = (a, from, n, w) => Array.from({ length: n }, (_, k) => { let s = 0; const i0 = Math.round(from + k * w); for (let i = i0; i < i0 + w && i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / w); });
      const corr = (x, y) => { const n = Math.min(x.length, y.length); let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += x[i] / n; my += y[i] / n; } let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c || 1); };
      // the real-time file starts a little late: the offset that best matches the kick (low band) of bars 9 to 15, in 1 ms steps
      const FL = band(F, 0, 150), RL = band(R, 0, 150);
      const ef = env(FL, 9 * bar, Math.round(6 * bar / 48), 48);
      let off = 0, best = -2;
      for (let o = 0; o <= 2000; o++) { const c = corr(ef, env(RL, 9 * bar + o * 48, ef.length, 48)); if (c > best) { best = c; off = o * 48; } }
      // bars 2 to 7 (no kick), folded per bar at 64 bins: the gated pad (above 1.5 kHz) and the phased bass dip (below 150 Hz)
      const foldBar = (a, at) => { const w = bar / 64, f = Array(64).fill(0); for (let b = 1; b < 7; b++) env(a, at + b * bar, 64, w).forEach((v, i) => { f[i] += v; }); return f; };
      const lag = (x, y) => { let bl = 0, bc = -2; for (let l = -8; l <= 8; l++) { const c = corr(x, y.map((_, i) => y[(i + l + 64) % 64])); if (c > bc) { bc = c; bl = l; } } return [bl, bc]; };
      const FH = band(F, 1500, 0), RH = band(R, 1500, 0);
      const [lp, cp] = lag(foldBar(FH, 0), foldBar(RH, off)), [lb, cb] = lag(foldBar(FL, 0), foldBar(RL, off));
      check(Math.abs(lp) <= 2 && cp > 0.9 && Math.abs(lb) <= 2 && cb > 0.9, 'example-gate: the gated pad and the phased bass dip fall at the same place in playback and in the fast export (within a 32nd of a bar)', `real time ${Math.round(off / 48)} ms late; pad lag ${lp}/64 bar (r ${r3(cp)}), bass lag ${lb}/64 bar (r ${r3(cb)})`);
      out.exportPhase = { offMs: Math.round(off / 48), pad: [lp, r3(cp)], bass: [lb, r3(cb)] };
    }
    fs.rmSync(TMP, { recursive: true, force: true });
  }

  if (arg('--json', null)) fs.writeFileSync(arg('--json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall movement checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
