// The Oscilloscope look's rules (oscilloscope-visual), no browser: settings, links, the sweep window, resampling and
// the brightness bins. npm run check:oscilloscope
import { OSC_DEFAULTS, OVERLAYS, PARAMS, LINKS, SHOWN, oscSettings, linkAmount, paramNow, sweepWindow, resample, binOf } from '../src/visuals/oscilloscope-rules.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const checks = {
  'defaults: the reference panel on our scale, glow on the kick and hue by section'() {
    const S = oscSettings(null);
    assert(S.overlay === 'real' && S.mode === 'sweep' && S.oversample === true, `overlay ${S.overlay}, mode ${S.mode}`);
    const want = { intensity: 5, persistence: 0.5, hue: 125, lineSat: 1, screenSat: 1, focus: 1, noise: 0, glow: 0.3, ambient: 0.7, smoothing: 0, sweepMs: 10, trigger: 0 };
    for (const [k, v] of Object.entries(want)) assert(S.values[k] === v, `${k} ${S.values[k]} not ${v}`);
    assert(S.links.glow === 'kick' && S.links.hue === 'section' && S.links.intensity === 'static', JSON.stringify(S.links));
    assert(OVERLAYS.length === 6 && SHOWN.every(k => PARAMS.some(p => p[0] === k)), 'overlays or shown parameters');
  },
  'stored settings: out of range clamped, unknown values take the default, partial kept'() {
    const S = oscSettings({ overlay: 'nope', mode: 'xy', oversample: 'yes', values: { intensity: 40, hue: -5, focus: 'x' }, links: { glow: 'moon', noise: 'bar' } });
    assert(S.overlay === 'real' && S.mode === 'xy' && S.oversample === true, 'overlay, mode or oversample');
    assert(S.values.intensity === 10 && S.values.hue === 0 && S.values.focus === 1, JSON.stringify(S.values));
    assert(S.links.glow === 'kick' && S.links.noise === 'bar', JSON.stringify(S.links));
    for (const [k, lo, hi, , d] of PARAMS) assert(d >= lo && d <= hi, `${k} default outside its range`);
    assert(OSC_DEFAULTS.links && LINKS.includes('static'), 'links');
  },
  'links: static keeps the value, levels move it at most 60 % toward the top, hue turns at most half the circle'() {
    const S = oscSettings({ links: { intensity: 'kick', persistence: 'bar', hue: 'section', glow: 'static', noise: 'lead', ambient: 'mix' } });
    const quiet = { bar: 0, section: { i: 0, n: 4 }, lv: {}, level: 0 }, loud = { bar: 0.999, section: { i: 3, n: 4 }, lv: { kick: 1, arp: 0.5 }, level: 1 };
    assert(paramNow(S, 'glow', loud) === 0.3, 'static moved');
    assert(paramNow(S, 'intensity', quiet) === 5 && near(paramNow(S, 'intensity', loud), 5 + 5 * 0.6), `intensity ${paramNow(S, 'intensity', loud)}`);
    assert(near(paramNow(S, 'noise', loud), 0.5 * 0.6), `lead: the loudest of hook, arp, guitar ${paramNow(S, 'noise', loud)}`);
    assert(paramNow(S, 'hue', quiet) === 125 && near(paramNow(S, 'hue', loud), 305), `hue ${paramNow(S, 'hue', loud)}`);
    assert(near(linkAmount('section', { section: { i: 1, n: 3 } }), 0.5) && linkAmount('section', { section: { i: 0, n: 1 } }) === 0, 'section steps');
    assert(near(linkAmount('bar', { bar: 7.25 }), 0.25), 'bar ramp');
    assert(paramNow(S, 'ambient', loud) <= 1 && paramNow(S, 'persistence', loud) <= 0.95, 'over the top');
  },
  'sweep: the window starts on the first rising crossing of the trigger, a steady tone stands still'() {
    const rate = 48000, tone = off => Float32Array.from({ length: 8192 }, (_, i) => Math.sin(2 * Math.PI * 220 * (i + off) / rate));
    const a = sweepWindow(tone(0), rate, 10, 0), b = sweepWindow(tone(37), rate, 10, 0);
    assert(a.n === 480, `10 ms at 48 kHz: ${a.n}`);
    const ph = (d, s) => Math.asin(Math.max(-1, Math.min(1, d[s])));
    assert(near(ph(tone(0), a.start), ph(tone(37), b.start), 0.03), `the phase moved: ${a.start} ${b.start}`);
    const flat = sweepWindow(new Float32Array(8192), rate, 10, 0.2);
    assert(flat.start === 0, 'no crossing: from the start');
    assert(sweepWindow(tone(0), rate, 1000, 0).n === 4096, 'at most half the buffer');
  },
  'resample: oversampled points pass through the samples, smoothing lowers the peaks'() {
    const d = Float32Array.from([0, 1, 0, -1, 0, 1, 0, -1]);
    const r = resample(d, 0, 8, 4, 0);
    assert(r.length === 29 && r[4] === 1 && r[8] === 0 && r[12] === -1, `points ${Array.from(r).slice(0, 13)}`);
    const s = resample(d, 0, 8, 1, 0.8);
    assert(Math.max(...s) < 0.5, `smoothed peak ${Math.max(...s)}`);
  },
  'brightness: a slow beam is brighter than a fast one'() {
    assert(binOf(0.1, 1, 6) === 5 && binOf(100, 1, 6) === 0 && binOf(2, 1, 6) === 3, 'bins');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(checks)) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(checks).length} checks passed`);
process.exit(failed ? 1 : 0);
