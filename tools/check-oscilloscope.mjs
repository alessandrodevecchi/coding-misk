// The Oscilloscope look's rules (oscilloscope-visual, oscilloscope-smudge), no browser: settings, links, the sweep
// window, resampling, the brightness bins, the smudged glass's plan per song, the glass masks' manifest, credits and
// size, the controls shared by the Settings card and the stage panel. npm run check:oscilloscope
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OSC_DEFAULTS, OVERLAYS, PARAMS, LINKS, SHOWN, oscSettings, linkAmount, paramNow, sweepWindow, resample, binOf, SMUDGED, GLASS, GLASS_MASKS, glassPlan, masksOf } from '../src/visuals/oscilloscope-rules.js';
import { oscRows } from '../src/visuals/osc-controls.js';

const GLASS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'visuals', 'glass');
const GLASS_BUDGET = 600 * 1024;
const SONGS = ['luci-rosse', 'kellerlicht', 'settimo-cielo'];

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const checks = {
  'defaults: the reference panel on our scale, glow on the kick and hue by section'() {
    const S = oscSettings(null);
    assert(S.overlay === 'real' && S.mode === 'sweep' && S.oversample === true, `overlay ${S.overlay}, mode ${S.mode}`);
    const want = { intensity: 5, persistence: 0.5, hue: 125, lineSat: 1, screenSat: 1, focus: 1, noise: 0, glow: 0.3, ambient: 0.7, smoothing: 0, sweepMs: 10, trigger: 0, smudge: 1, scatter: 1 };
    for (const [k, v] of Object.entries(want)) assert(S.values[k] === v, `${k} ${S.values[k]} not ${v}`);
    assert(S.links.glow === 'kick' && S.links.hue === 'section' && S.links.intensity === 'static', JSON.stringify(S.links));
    assert(OVERLAYS.length === 6 && SHOWN.every(k => PARAMS.some(p => p[0] === k)), 'overlays or shown parameters');
    assert(SHOWN.length === PARAMS.length && new Set(SHOWN).size === SHOWN.length, `every parameter shown once: ${PARAMS.filter(p => !SHOWN.includes(p[0])).map(p => p[0])}`);
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
  'glass: the same song gives the same plan, three songs three plans, clean overlays none'() {
    for (const ov of SMUDGED) for (const seed of SONGS) assert(JSON.stringify(glassPlan(seed, ov)) === JSON.stringify(glassPlan(seed, ov)), `${seed} ${ov} not repeatable`);
    const plans = SONGS.map(s => JSON.stringify(glassPlan(s, 'smudged-graticule')));
    assert(new Set(plans).size === 3, 'two songs share a glass');
    for (const ov of ['empty', 'graticule', 'vector']) assert(glassPlan('luci-rosse', ov).length === 0, `${ov} has smudges`);
    assert(glassPlan('', 'smudged').length > 0 && glassPlan(null, 'smudged').length > 0, 'no seed: still a glass');
  },
  'glass: elements inside the screen, prints near the edges, counts per role, Real oscilloscope lighter'() {
    const roleOf = e => e.kind === 'cover' ? 'base' : e.kind === 'ridge' || ['fp002', 'fp008', 'fpvec'].includes(e.mask) ? 'print' : ['smear001', 'smear005', 'smear007'].includes(e.mask) ? 'smear' : e.mask === 'si001' ? 'drops' : e.mask === 'si013' ? 'debris' : e.kind;
    const used = new Set();
    for (let i = 0; i < 300; i++) {
      const seed = `song-${i}`;
      for (const ov of SMUDGED) {
        const plan = glassPlan(seed, ov), n = {};
        for (const e of plan) {
          const r = roleOf(e); n[r] = (n[r] || 0) + 1; used.add(e.mask || e.kind);
          assert(e.alpha > 0 && e.alpha <= 1, `${seed} ${ov} alpha ${e.alpha}`);
          if (e.x !== undefined && e.kind !== 'wipe') assert(e.x >= 0 && e.x <= 1 && e.y >= 0 && e.y <= 1, `${seed} ${e.kind} at ${e.x},${e.y}`);
          if (r === 'print') assert(Math.min(e.x, e.y, 1 - e.x, 1 - e.y) <= 0.2 + 1e-9, `${seed} print not near an edge: ${e.x},${e.y}`);
          if (e.crop) assert(e.crop.x >= 0 && e.crop.y >= 0 && e.crop.x + e.crop.s <= 1 + 1e-9 && e.crop.y + e.crop.s <= 1 + 1e-9, `${seed} crop outside the mask`);
        }
        const light = ov === 'real';
        assert(n.base === 1 && n.dust === 1, `${seed} ${ov}: base ${n.base}, dust ${n.dust}`);
        assert(light ? n.print >= 1 && n.print <= 2 : n.print >= 2 && n.print <= 4, `${seed} ${ov}: ${n.print} prints`);
        assert(light ? n.smear === 1 : n.smear >= 1 && n.smear <= 2, `${seed} ${ov}: ${n.smear} smears`);
        assert(!light || !n.wipe, `${seed}: a wipe arc on Real oscilloscope`);
        assert(masksOf(plan).every(m => GLASS_MASKS.includes(m)), `${seed}: an unknown mask`);
      }
      const heavy = glassPlan(seed, 'smudged'), lite = glassPlan(seed, 'real');
      assert(lite.find(e => e.kind === 'cover').alpha < heavy.find(e => e.kind === 'cover').alpha, `${seed}: Real oscilloscope's haze not lighter`);
    }
    // the owner kept all 15 elements: 12 masks and 3 drawn ones, each used by some song
    const all = [...GLASS_MASKS, 'ridge', 'dust', 'wipe'];
    assert(all.length === 15 && all.every(k => used.has(k)), `never used: ${all.filter(k => !used.has(k))}`);
  },
  'glass masks: every file in the manifest with an allowed licence and a credit, the rules\' list, within 600 KB'() {
    const man = JSON.parse(readFileSync(join(GLASS_DIR, 'manifest.json'), 'utf8')), credits = readFileSync(join(GLASS_DIR, 'CREDITS.md'), 'utf8');
    const files = readdirSync(GLASS_DIR).filter(f => !['manifest.json', 'CREDITS.md'].includes(f));
    const listed = new Set(man.masks.map(m => m.file));
    for (const f of files) assert(listed.has(f), `${f} has no manifest entry`);
    for (const m of man.masks) {
      assert(existsSync(join(GLASS_DIR, m.file)), `${m.file} in the manifest, not on disk`);
      assert(man.licences.includes(m.licence) && ['CC0-1.0', 'own'].includes(m.licence), `${m.file}: licence ${m.licence} not allowed`);
      assert(/^https:\/\//.test(m.sourceUrl || '') && m.source && m.role, `${m.file}: source, URL or role missing`);
      assert(credits.includes(`\`${m.file}\``) && credits.includes(m.sourceUrl), `${m.file} not credited in CREDITS.md`);
      assert(GLASS[m.role] && GLASS[m.role].includes(m.file.replace(/\.webp$/, '')), `${m.file}: role ${m.role} differs from the rules`);
    }
    for (const d of man.drawn) assert(d.licence === 'own', `${d.id}: drawn but not own`);
    assert(GLASS_MASKS.every(k => listed.has(`${k}.webp`)) && listed.size === GLASS_MASKS.length, 'the rules\' masks and the manifest differ');
    const size = files.reduce((a, f) => a + statSync(join(GLASS_DIR, f)).size, 0);
    assert(size <= GLASS_BUDGET, `masks ${Math.round(size / 1024)} KB over 600 KB`);
  },
  'controls: the card and the panel rows hold every setting once'() {
    const html = oscRows(oscSettings(null), k => k);
    for (const [k] of PARAMS) {
      assert((html.match(new RegExp(`data-osc-val="${k}"`, 'g')) || []).length === 1, `${k} slider`);
      assert((html.match(new RegExp(`data-osc-link="${k}"`, 'g')) || []).length === 1, `${k} link`);
    }
    assert(html.includes('data-osc-opt="overlay"') && html.includes('data-osc-mode="xy"') && html.includes('data-osc-over="0"') && html.includes('data-osc-defaults'), 'screen, mode, oversample or defaults missing');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(checks)) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(checks).length} checks passed`);
process.exit(failed ? 1 : 0);
