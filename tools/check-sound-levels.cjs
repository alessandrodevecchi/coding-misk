// Levels of composed drum tones (random-sound-params tasks 2.2 and 2.4, #94; endless/drum-tones "Tone levels"),
// rendered by the fast export's render page (renderOffline), no real time:
// 1. On three kits, .decay(d).sustain(0) shortens a drum sample and .speed(s) below 1 makes it longer (lower).
// 2. For every style, the drum tracks of radio songs at sound 1 (three seeds): each row of the groove rendered with its
//    tone and without it (the same kit, gain, filter and drive): no toned row above 0.9, the median kick peak within
//    0.1 of the untoned kick; and the whole drum part's peak with and without the tones.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-sound-levels.cjs [--styles a,b] [--seeds 3]   (dev server on PORT)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs');
const PORT = process.env.PORT || 5173;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
const ROWS = { bd: 'x...x...x...x...', sd: '....x.......x...', cp: '....x.......x...', hh: '..x...x...x...x.', oh: '......x.......x.' };

(async () => {
  const { generateSession } = await import('../src/endless/director.js');
  const { sceneLayers } = await import('../src/music.js');
  const recipes = fs.readdirSync('styles').filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(`styles/${f}`, 'utf8')));
  const only = arg('--styles', null), seeds = +arg('--seeds', 3);
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  await page.goto(`http://localhost:${PORT}/`); await new Promise(r => setTimeout(r, 4000));
  // render code for `bars` bars at 120 BPM → { peak, length (s, until the level falls under 1 % of the peak, per hit
  // averaged over the first hit only) }
  const render = (code, bars = 2) => page.evaluate(async ([code, bars]) => {
    const { renderOffline } = await import('/src/export/fast.js');
    const bpm = Array.from({ length: bars + 1 }, () => 120);
    const r = await renderOffline({ segments: [{ from: 0, to: bars + 1, code }], bpm, from: 0, to: bars * 2, tail: 1, sampleRate: 48000 }).promise;
    const L = r.channels[0], R = r.channels[1], sr = r.sampleRate;
    let peak = 0, first = -1;
    for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > peak) peak = v; if (first < 0 && v > 0.001) first = i; }
    // the first hit's length: the last sample over 1 % of the peak before the next hit (half a second at 120 BPM)
    let last = first;
    for (let i = first; i < Math.min(L.length, first + sr * 1.9); i++) if (Math.max(Math.abs(L[i]), Math.abs(R[i])) > peak * 0.01) last = i;
    return { peak, length: first < 0 ? 0 : (last - first) / sr };
  }, [code, bars]);
  const lineCode = l => `setcpm(120/4)\n${l.replace(/^_\$:/, '$:')}`;

  // ---------- 1. decay and speed on three kits ----------
  for (const kit of ['RolandTR909', 'LinnDrum', 'AkaiMPC60']) {
    const plain = await render(`setcpm(120/4)\n$: s("bd ~ ~ ~").bank("${kit}").gain(.8)`, 1);
    const short = await render(`setcpm(120/4)\n$: s("bd ~ ~ ~").bank("${kit}").decay(.08).sustain(0).gain(.8)`, 1);
    const low = await render(`setcpm(120/4)\n$: s("bd ~ ~ ~").bank("${kit}").speed(.6).gain(.8)`, 1);
    check(short.length < plain.length * 0.7 && plain.peak > 0.05, `${kit}: .decay(.08).sustain(0) shortens the kick`, `${plain.length.toFixed(3)} s → ${short.length.toFixed(3)} s`);
    check(low.length > plain.length * 1.2, `${kit}: .speed(.6) makes it longer (lower)`, `${plain.length.toFixed(3)} s → ${low.length.toFixed(3)} s`);
  }

  // ---------- 2. toned rows over every style ----------
  const kicks = [], kicks0 = [], rowsOver = [], parts = [];
  for (const R of recipes.filter(r => !only || only.split(',').includes(r.id))) {
    for (let k = 0; k < seeds; k++) {
      const s = generateSession(recipes, { styles: [R.id], seed: `lv-${R.id}-${k}`, minutes: 3, sound: 1 }).songs[0];
      const d = s.tracks.find(t => t.type === 'drums' && t.settings && t.settings.tone);
      if (!d) continue;
      const set = { ...d.settings }; delete set.vary;
      const state = tone => ({ bpm: 120, drums: { ...set, tone, rows: Object.fromEntries(Object.entries(ROWS).map(([id, steps]) => [id, { steps, mute: false }])) } });
      const L1 = sceneLayers(state(set.tone), { only: 'drums' }).filter(l => /^\$:/.test(l)), L0 = sceneLayers(state(null), { only: 'drums' }).filter(l => /^\$:/.test(l));
      const out = [];
      for (let i = 0; i < L1.length; i++) {
        const row = (L1[i].match(/\b(bd|sd|cp|hh|oh|rd)\b/) || [])[1] || '?';
        const a = await render(lineCode(L1[i])), b = await render(lineCode(L0[i]));
        out.push(`${row} ${b.peak.toFixed(2)}→${a.peak.toFixed(2)}`);
        if (a.peak > 0.9) rowsOver.push(`${R.id}/${k} ${row} ${a.peak.toFixed(2)}`);
        if (L1[i].includes('"bd')) { kicks.push(a.peak); kicks0.push(b.peak); }
      }
      const all1 = await render(`setcpm(120/4)\n${L1.join('\n')}`), all0 = await render(`setcpm(120/4)\n${L0.join('\n')}`);
      parts.push(all1.peak - all0.peak);
      console.log(`      ${R.id} ${k} ${set.kit}: ${out.join(', ')}; drums ${all0.peak.toFixed(2)}→${all1.peak.toFixed(2)}`);
    }
  }
  check(!rowsOver.length, 'no toned drum row above 0.9', rowsOver.join(', '));
  check(Math.abs(median(kicks) - median(kicks0)) <= 0.1, 'the median kick peak within 0.1 of the untoned kick', `${median(kicks0).toFixed(3)} → ${median(kicks).toFixed(3)} over ${kicks.length} kicks`);
  check(Math.max(...parts) <= 0.15, 'a whole drum part never rises more than 0.15 with its tones', `largest rise ${Math.max(...parts).toFixed(3)}`);
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall drum tone level checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
