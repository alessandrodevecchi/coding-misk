// Checks of the widget looks without a browser (widgets-on-stage, #79): the Monitor layouts for 1 to 6 panels in 16:9,
// 9:16 and 1:1, the panels of a section (code widgets' mapping, limit, playing first, dimmed or hidden, stable in the
// section), silences, colours of both themes, the same drawing for the same frame (alone and in a sequence, with a
// recording context), spectrum columns from the time, notes queried once per cycle, pitches as Strudel reads them.
// Usage: npm run check:stage-widgets
// (Strudel's own note names, from its util module: the package's entry needs a browser)
import { noteToMidi } from '../node_modules/@strudel/core/util.mjs';
import { monitorLayout, drawMonitor, drawRullo, drawPanel, appWidgetFit, APP_FS, APP_MIN_FS } from '../src/visuals/widget-looks.js';
import { drawMonitorAscii, drawMonitorTerm, drawLayerGlyph } from '../src/visuals/glyph-looks.js';
import { termPalette } from '../src/visuals/term-grid.js';
import { appWidgetSettings, notesOfStore, widgetFrame as appFrame } from '../src/widgets/app-widgets.js';
import { noteStore, liveNotes, rosterOf, levelAt, flashAt, silentAt, columnCache, pitchOf, cwInstrument, stageInstOf } from '../src/visuals/stage-feed.js';
import { THEME_PALETTES, themePalette, instColour, scenePalette } from '../src/visuals/widget-palettes.js';
import { widgetSettings, CW_DEFAULTS, CW_VERSION } from '../src/live/widgets.js';
import { stripLayout, screenLayout, palcoScreen, drawLayer, seeThrough } from '../src/visuals/widget-layer.js';
import { SW_DEFAULTS, SW_VERSION, SW_ON_LAYERS, toggleLayer, stageSettings, stageMapping, layerOn, limitOf, stageScopeInstruments } from '../src/visuals/stage-settings.js';
import { makeBackup } from '../src/settings/backup.js';
import { INSTRUMENTS, LOOKS, PICK_LOOKS } from '../src/music.js';

let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

// ---------- layouts ----------
const SIZES = { '16:9': [1280, 720], '9:16': [405, 720], '1:1': [720, 720] };
const overlap = (a, b) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;
for (const [name, [W, H]] of Object.entries(SIZES)) {
  const area = {};
  for (let n = 1; n <= 6; n++) {
    const L = monitorLayout(n, W, H);
    const inside = L.every(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= W + 1e-6 && b.y + b.h <= H + 1e-6 && b.w > 40 && b.h > 40);
    const apart = L.every((a, i) => L.every((b, j) => i === j || !overlap(a, b)));
    // the grid centred: the same room left and right of the widest row, above and below
    const minX = Math.min(...L.map(b => b.x)), maxX = Math.max(...L.map(b => b.x + b.w));
    const centred = Math.abs(minX - (W - maxX)) < 1;
    check(L.length === n && inside && apart && centred, `layout ${name}, ${n} panel${n > 1 ? 's' : ''}: inside the stage, apart, centred`, L.map(b => `${Math.round(b.w)}×${Math.round(b.h)}`).join(' '));
    area[n] = L[0].w * L[0].h;
  }
  check(area[1] > area[3] && area[3] > area[6] && area[2] > area[6], `layout ${name}: fewer panels are bigger (1 > 3 > 6)`, Object.entries(area).map(([k, v]) => `${k}:${Math.round(v)}`).join(' '));
}
{
  const cols = L => new Set(L.map(b => Math.round(b.x))).size, rows = L => new Set(L.map(b => Math.round(b.y))).size;
  const v6 = monitorLayout(6, 405, 720), h6 = monitorLayout(6, 1280, 720), h3 = monitorLayout(3, 1280, 720), v3 = monitorLayout(3, 405, 720);
  check(cols(v6) === 2 && rows(v6) === 3, '9:16 with six panels: two columns, three rows (spec scenario)');
  check(cols(h6) === 3 && rows(h6) === 2, '16:9 with six panels: three columns, two rows');
  const last = h3[2], mid = (last.x + last.w / 2) / 1280;
  check(h3.length === 3 && (rows(h3) === 1 || Math.abs(mid - 0.5) < 0.01), '16:9 with three panels: one row, or the last row centred', `${rows(h3)} rows, last at ${mid.toFixed(2)}`);
  check(rows(v3) === 3 && cols(v3) === 1, '9:16 with three panels: one column of three');
}

// ---------- notes, panels of a section ----------
// a made-up song: 32 bars, sections of 16; bass, hook, kick, arp, hats play everywhere; pad plays bars 0-3 and 12-15
// (silent for 8 bars in the first section); snare only in the second section; fx only in the first
const S0 = widgetSettings({ share: 0 });
function song() {
  const st = noteStore();
  for (let c = 0; c < 32; c++) {
    for (let k = 0; k < 4; k++) { st.add('bass', [c + k / 4, c + k / 4 + 0.2, 36 + (k % 2) * 7, 0.8]); st.add('kick', [c + k / 4, c + k / 4 + 0.05, 'bd', 1]); }
    for (let k = 0; k < 8; k++) { st.add('hats', [c + k / 8, c + k / 8 + 0.05, 'hh', 0.5]); st.add('arp', [c + k / 8, c + k / 8 + 0.1, 60 + (k % 4) * 3, 0.6]); }
    st.add('hook', [c + 0.5, c + 0.9, 67 + (c % 3), 0.7]);
    if (c < 4 || (c >= 12 && c < 16)) st.add('pad', [c, c + 1, 48, 0.6]);
    if (c >= 16) st.add('snare', [c + 0.25, c + 0.3, 'sd', 0.9]);
    if (c < 16) st.add('fx', [c, c + 0.5, 'noise', 0.4]);
  }
  return st;
}
{
  const st = song(), A = { start: 0, end: 16 }, B = { start: 16, end: 32 };
  const ra = rosterOf(st, A, { S: S0, max: 6 }), rb = rosterOf(st, B, { S: S0, max: 6 });
  // (stage-app-widgets D2: kick and hats share the hit grid's panel, in the kick's slot)
  check(ra.map(p => p.inst).join() === 'bass,hook,kick,arp,pad', 'section A: one panel per playing instrument, in the code widgets\' slot order (fx is off there, hats in the hit grid)', ra.map(p => `${p.inst}:${p.widget}`).join(' '));
  check(ra.find(p => p.inst === 'bass').widget === 'scope' && ra.find(p => p.inst === 'hook').widget === 'pianoroll', 'same mapping as the code widgets: bass scope, lead pianoroll');
  check(rb.map(p => p.inst).join() === 'bass,hook,kick,arp,pad' && rb.find(p => p.inst === 'pad').quiet, 'section B: the playing instruments first, then the pad (silent in it) dimmed', rb.map(p => `${p.inst}${p.quiet ? ':quiet' : ''}`).join(' '));
  const r4 = rosterOf(st, B, { S: S0, max: 4 });
  check(r4.map(p => p.inst).join() === 'bass,hook,kick,arp', 'section B with 4 panels: the pad (silent in it) left out at the limit', r4.map(p => p.inst).join(' '));
  const r5 = rosterOf(st, B, { S: S0, max: 8 });
  check(r5.some(p => p.inst === 'pad' && p.quiet), 'a silent instrument that played within the window keeps a dimmed panel');
  check(!rosterOf(st, B, { S: S0, max: 8, silent: 'hidden' }).some(p => p.inst === 'pad'), '"hidden": no panel for a silent instrument');
  const S1 = widgetSettings({ share: 0, instruments: { bass: { primary: 'spectrum' } } });
  check(rosterOf(st, A, { S: S1 }).find(p => p.inst === 'bass').widget === 'spectrum', 'the code widgets card decides the widget (bass as spectrum)');
  const five = noteStore(); for (const i of ['bass', 'hook', 'kick', 'arp', 'hats']) five.add(i, [1, 1.2, i === 'kick' || i === 'hats' ? 'x' : 50, 1]);
  check(rosterOf(five, A, { S: S0 }).length === 4, 'bass, lead, kick, arp and hats give four panels (kick and hats in one hit grid)');
  check(rosterOf(five, A, { S: stageMapping(stageSettings({ v: SW_VERSION, widgets: { hitgrid: false } }), S0) }).length === 5, 'widgets-on-stage scenario: with the hit grid off, bass, lead, kick, arp and hats give five panels');
  // the same panels whatever the time of the section: the roster depends only on the section and the notes known
  check(JSON.stringify(rosterOf(st, A, { S: S0 })) === JSON.stringify(rosterOf(song(), A, { S: S0 })), 'the panels of a section are the same every time they are asked');
  // code-over-visual cd5: one tone cloud at most among the panels, on the pad, else bass, lead, arp, the voice last
  const cloudy = widgetSettings({ share: 0, max: 8, instruments: Object.fromEntries(['pad', 'bass', 'lead', 'arp', 'voice'].map(k => [k, { on: true, primary: 'tonecloud', secondary: ['scope'] }])) });
  const clouds = (insts, S = cloudy) => { const x = noteStore(); for (const i of insts) x.add(i, [1, 1.2, 50, 1]); return rosterOf(x, A, { S, max: 8 }).filter(p => p.widget === 'tonecloud').map(p => p.inst); };
  check(clouds(['bass', 'hook', 'pad', 'arp']).join() === 'pad', 'cd5: one tone cloud among the panels, the pad\'s', clouds(['bass', 'hook', 'pad', 'arp']).join());
  check(clouds(['hook', 'arp', 'bass']).join() === 'bass' && clouds(['arp', 'hook']).join() === 'hook', 'cd5: without a pad the first of bass, lead, arp');
  check(clouds(['kick', 'hats']).length === 0, 'cd5: no cloud without a line that can hold it')
  check(rosterOf(song(), A, { S: widgetSettings({ share: 0 }), max: 8 }).filter(p => p.widget === 'tonecloud').length <= 1, 'cd5: the default settings give at most one');
  // silences and levels
  const pad = st.around('pad', 0, 16);
  check(silentAt(pad, 6.5) && silentAt(pad, 11.2) && !silentAt(pad, 13.5) && !silentAt(pad, 2.5), 'the pad is silent from bar 5 to 11 and plays again at bar 12 (spec scenario)');
  const kick = st.around('kick', 3, 5);
  check(levelAt(kick, 4.01, 'kick') > 0.7 && levelAt(kick, 4.2, 'kick') < 0.1 && flashAt(kick, 4.01) > 0.7 && flashAt(kick, 4.2) < 0.1, 'the kick\'s level and flash rise on the hit and fall before the next');
  check(levelAt(st.around('hook', 3, 5), 4.7, 'hook') > 0.8 && levelAt(st.around('hook', 3, 5), 4.95, 'hook') < 0.8, 'a held note keeps its level, then releases');
  check(cwInstrument('kick') === 'drums' && cwInstrument('guitar') === 'lead' && cwInstrument('riser') === 'fx', 'stage instruments map to the code widgets\' instruments');
}

// ---------- live notes: once per cycle ----------
{
  const calls = [];
  const fake = (tag) => ({ queryArc(a, b) { calls.push(`${tag}:${a}`); return [{ whole: { begin: a + 0.25, end: a + 0.5 }, hasOnset: () => true, value: { analyze: 'bass', note: 'c3', gain: 0.5 } }]; } });
  const st = noteStore(), L = liveNotes(st), P1 = fake('p1');
  for (let f = 0; f < 200; f++) { const cyc = 4 + f / 60; L.pump(P1, cyc, Math.floor(cyc) + 3, 3); }
  const seen = calls.filter(c => c.startsWith('p1')), dup = seen.length - new Set(seen).size;
  check(dup === 0 && seen.length >= 6, 'live notes: each cycle queried once, ahead of the playhead', seen.join(' '));
  check(st.around('bass', 4, 5)[0][2] === 48, 'live notes: pitch from the note name (c3 = 48)');
  calls.length = 0;
  const P2 = fake('p2');
  L.pump(P2, 7.5, 10, 3);
  check(calls[0] === 'p2:7' && st.around('bass', 9, 10).length === 1, 'a new pattern: the notes from the current cycle on are queried again', calls.join(' '));
  // #82 (gx1): the drops tell the stage's caches which sections to choose again (the first pump, from nothing, is one)
  check(L.drops.n === 2 && L.drops.from === 7, 'a new pattern counts a drop from its cycle', JSON.stringify(L.drops));
  L.pump(fake('p3'), 0.2, 3, 3);
  check(L.drops.n === 3 && L.drops.from === 0, 'the next song\'s pattern from cycle 0: a drop from 0 (every section)', JSON.stringify(L.drops));
  L.reset();
  check(L.drops.n === 4 && L.drops.from === -Infinity && !st.instruments.length, 'a reset forgets every note and counts a drop of all', JSON.stringify(L.drops));
}
// a jump into the middle of a section (#79): the notes are read again from the section's start (and the window before
// it), so its panels are those it has when played from its start (the hook plays only in its first bars)
{
  const pat = { queryArc(a) { const out = [{ whole: { begin: a, end: a + 0.5 }, hasOnset: () => true, value: { analyze: 'bass', note: 'c2' } }]; if (a >= 32 && a < 36) out.push({ whole: { begin: a + 0.5, end: a + 0.75 }, hasOnset: () => true, value: { analyze: 'hook', note: 'c4' } }); return out; } };
  const sec = { start: 32, end: 48 }, roster = (st, known) => rosterOf(st, sec, { S: S0, max: 6, known }).map(p => p.inst).sort().join(',');
  const full = noteStore(); for (let c = 16; c < 48; c++) for (const h of pat.queryArc(c, c + 1)) full.add(h.value.analyze, [h.whole.begin, h.whole.end, 48, 1]);
  const st = noteStore(), L = liveNotes(st);
  L.pump(pat, 2.5, 5, 3);
  let known = -Infinity;
  for (let f = 0; f < 120; f++) { const cyc = 40 + f / 60, c = Math.floor(cyc); known = L.pump(pat, cyc, c + 3, 3, sec.start - 16); if (known >= c + 3) known = L.pump(pat, cyc, Math.min(sec.end, c + 24), 1, sec.start - 16); }
  check(roster(st, Math.min(known, sec.end)) === roster(full, Infinity) && roster(full, Infinity) === 'bass,hook', 'a jump to bar 40 of a section: the same panels as from its start (the hook of its first bars too)', `${roster(st, Math.min(known, sec.end))} against ${roster(full, Infinity)}`);
}
// pitches as the render page reads them (Strudel's noteToMidi)
{
  const names = ['c3', 'eb4', 'f#2', 'a', 'Bb1', 'cs5', 'g-1', 'c#'];
  check(names.every(n => pitchOf({ note: n }) === noteToMidi(n)), 'note names read as Strudel does', names.map(n => `${n}=${pitchOf({ note: n })}`).join(' '));
  check(pitchOf({ s: 'bd' }) === 'bd' && pitchOf({ note: 61.5 }) === 61.5 && Math.abs(pitchOf({ freq: 440 }) - 69) < 1e-9, 'sample names, numbers and frequencies');
}

// ---------- colours ----------
{
  const N = THEME_PALETTES.neon, Hw = THEME_PALETTES.hw;
  check(themePalette('hw') === Hw && themePalette('neon') === N && themePalette('x') === N, 'the theme picks the palette');
  check(INSTRUMENTS.every(i => /^#[0-9a-f]{6}$/i.test(instColour(N, i)) && /^#[0-9a-f]{6}$/i.test(instColour(Hw, i))), 'a colour for every stage instrument in both themes');
  check(INSTRUMENTS.some(i => instColour(N, i) !== instColour(Hw, i)) && instColour(N, 'kick') !== instColour(N, 'arp'), 'the themes differ, the instruments differ');
  check(instColour(N, 'mystery') === instColour(N, 'mystery'), 'an unknown instrument gets a stable colour');
  const sc = scenePalette({ a: '#ff2e88', b: '#00e5ff', c: '#ffe14d', wave: '#00e5ff', echo: '#ff2e88' });
  check(sc.inst.kick === '#ff2e88' && sc.name === 'scene', 'a scene palette from a look\'s colours (for the layer)');
}

// ---------- the same drawing for the same frame ----------
function recorder() {
  const log = [];
  const grad = () => ({ addColorStop: (...a) => log.push(['stop', ...a]) });
  const target = {
    createLinearGradient: (...a) => { log.push(['lg', ...a]); return grad(); },
    createRadialGradient: (...a) => { log.push(['rg', ...a]); return grad(); },
    measureText: s => ({ width: String(s).length * 7 }),
  };
  const ctx = new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; if (k === 'log') return log; return (...a) => { log.push([k, ...a.map(x => (typeof x === 'number' ? +x.toFixed(3) : x))]); }; },
    set(t, k, v) { log.push(['=', k, typeof v === 'number' ? +v.toFixed(3) : typeof v === 'object' ? 'obj' : v]); return true; },
  });
  return ctx;
}
function frameOf(st, cyc, cache, look) {
  const pal = THEME_PALETTES.neon, sec = { start: Math.floor(cyc / 16) * 16, end: Math.floor(cyc / 16) * 16 + 16 };
  const roster = rosterOf(st, sec, { S: S0 });
  const waveAt = (inst, t) => { const out = new Float32Array(128); for (let i = 0; i < 128; i++) out[i] = Math.sin((t * 12000 - 128 + i) / (inst.length + 3)); return out; };
  return {
    cyc, pal, roster, fade: 1, dim: 'dimmed', full: false, lanes: ['kick', 'hats'], melodic: ['bass', 'hook', 'arp'],
    notes: (i, a, b) => st.around(i, a, b), level: i => levelAt(st.around(i, cyc - 2, cyc + 0.01), cyc, i), flash: i => flashAt(st.around(i, cyc - 2, cyc + 0.01), cyc),
    silent: i => silentAt(st.around(i, cyc - 2, cyc + 0.01), cyc), wave: i => waveAt(i, cyc / 2), columns: i => cache.columns(i, cyc / 2, waveAt),
    pitches: i => [...new Set(st.around(i, sec.start, sec.end).map(n => n[2]))], range: () => ({ lo: 35, hi: 72 }), label: i => i,
  };
}
for (const look of ['monitor', 'rullo']) {
  const draw = look === 'monitor' ? drawMonitor : drawRullo, st = song();
  const alone = (cyc) => { const g = recorder(); draw(g, 1280, 720, frameOf(st, cyc, columnCache(), look)); return JSON.stringify(g.log); };
  const seqCache = columnCache(), seq = {};
  for (let f = 0; f < 90; f++) { const cyc = 6 + f / 30; const g = recorder(); draw(g, 1280, 720, frameOf(st, cyc, seqCache, look)); if (f === 45) seq.mid = JSON.stringify(g.log); }
  const a = alone(6 + 45 / 30), b = alone(6 + 45 / 30);
  check(a === b && a === seq.mid && a.length > 1000, `${look}: the same frame twice, alone and in a sequence, gives the same drawing`, `${a.length} characters of calls`);
}

// ---------- the layer over the other looks (D4) ----------
{
  const inBox = (b, B) => b.x >= B.x - 1e-6 && b.y >= B.y - 1e-6 && b.x + b.w <= B.x + B.w + 1e-6 && b.y + b.h <= B.y + B.h + 1e-6;
  const apart = L => L.every((a, i) => L.every((b, j) => i === j || !overlap(a, b)));
  const fmt = L => L.map(b => `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}`).join(' ');
  for (const [name, [W, H]] of Object.entries({ '16:9': [1280, 720], '1:1': [720, 720], 'app 2.4:1': [1440, 600] })) {
    const stage = { x: 0, y: 0, w: W, h: H }, centre = { x: W * 0.3, y: H * 0.3, w: W * 0.4, h: H * 0.4 };
    for (let n = 1; n <= 4; n++) {
      const L = stripLayout(n, W, H), left = L.filter(b => b.x + b.w / 2 < W / 2), right = L.filter(b => b.x + b.w / 2 > W / 2);
      const sizes = L.every(b => b.w <= W * 0.2 + 1e-6 && b.h <= H * 0.2 + 1e-6 && b.w / b.h >= 1.1 && b.w / b.h <= 3.01);
      check(L.length === n && L.every(b => inBox(b, stage)) && apart(L) && L.every(b => !overlap(b, centre)) && sizes, `strip ${name}, ${n} panel${n > 1 ? 's' : ''}: inside, apart, the centre free, at most a fifth of the stage`, fmt(L));
      const want = { 1: [1, 0], 2: [1, 1], 3: [2, 1], 4: [2, 2] }[n];
      check(left.length === want[0] && right.length === want[1], `strip ${name}, ${n}: ${want[0]} on the left, ${want[1]} on the right`);
      if (n === 3) check(Math.abs(L[0].y - L[1].y) < 1e-6, `strip ${name}, 3: the right panel at the same top as the left one`);
      if (n === 4) { const mid = (Math.min(...L.map(b => b.y)) + Math.max(...L.map(b => b.y + b.h))) / 2; check(Math.abs(mid - H / 2) < 1, `strip ${name}, 4: two per side stacked around the middle`); }
    }
  }
  // a tall stage: a centred row at the bottom, up to 3, 4 as 2×2
  for (let n = 1; n <= 4; n++) {
    const W = 405, H = 720, L = stripLayout(n, W, H), minX = Math.min(...L.map(b => b.x)), maxX = Math.max(...L.map(b => b.x + b.w)), rows = new Set(L.map(b => Math.round(b.y))).size;
    check(L.every(b => b.y > H * 0.6 && b.y + b.h <= H) && Math.abs(minX - (W - maxX)) < 1 && apart(L) && rows === (n === 4 ? 2 : 1), `strip 9:16, ${n}: a centred row at the bottom${n === 4 ? ' (2×2)' : ''}`, fmt(L));
  }
  // the Palco screen: up to 4 panels inside the LED wall, fewer are bigger
  for (const [name, [W, H]] of Object.entries({ '16:9': [1280, 720], '9:16': [405, 720] })) {
    const S = palcoScreen(W, H), area = {};
    for (let n = 1; n <= 4; n++) { const L = screenLayout(n, W, H); area[n] = L[0].w * L[0].h; check(L.length === n && L.every(b => inBox(b, S)) && apart(L), `Palco screen ${name}, ${n}: inside the big screen, apart`, fmt(L)); }
    check(area[1] >= area[2] && area[2] >= area[4], `Palco screen ${name}: fewer panels are bigger`);
  }
  check(stripLayout(6, 1280, 720).length === 4 && screenLayout(9, 1280, 720).length === 4, 'the layer never shows more than 4 panels');
  // where the layer goes
  const on = stageSettings({ layer: 'strip' }), pal = stageSettings({ layer: 'palco' });
  check(layerOn(stageSettings(null), 'tramonto') === null, 'off by default: no layer on any look');
  check(layerOn(on, 'tramonto') === 'strip' && layerOn(on, 'palco') === 'strip' && layerOn(pal, 'palco') === 'screen' && layerOn(pal, 'sonar') === 'strip', 'strip over the looks; Palco: the big screen on Palco, the strip elsewhere');
  check(['monitor', 'rullo', 'soul'].every(l => layerOn(on, l) === null && layerOn(pal, l) === null), 'never on Monitor, Rullo and the soul');
  check(limitOf(on, 'strip') === 4 && limitOf(on, 'screen') === 4 && limitOf(stageSettings({ strip: 2 }), 'strip') === 2 && limitOf(on, 'monitor') === 6, 'limits: strip 4 by default, the screen 4, Monitor 6');
  // the same layer frame twice, alone and in a sequence
  const st = song(), draw = (cyc, cache) => { const g = recorder(), F = frameOf(st, cyc, cache); F.pal = seeThrough(F.pal); F.roster = F.roster.slice(0, 4); drawLayer(g, 1280, 720, F, 'strip'); return JSON.stringify(g.log); };
  const seqCache = columnCache(); let mid = null;
  for (let f = 0; f < 60; f++) { const x = draw(6 + f / 30, seqCache); if (f === 30) mid = x; }
  const a = draw(7, columnCache());
  check(a === mid && a === draw(7, columnCache()) && a.length > 500, 'layer: the same frame twice, alone and in a sequence, gives the same drawing', `${a.length} characters of calls`);
  check(/rgba\([^)]*,\.6\)/.test(seeThrough(THEME_PALETTES.hw).panel) && THEME_PALETTES.hw.panel !== seeThrough(THEME_PALETTES.hw).panel, 'the layer\'s panels are see-through (theme colours too)');
}

// ---------- the settings of the stage widgets (D9) ----------
{
  const D = stageSettings(null);
  check(D.layer === 'off' && D.monitor === 6 && D.strip === 4 && D.mapping === 'same' && D.colours === 'auto' && D.silent === 'dimmed' && !D.widgets.spiral && !D.widgets.pitchwheel && D.widgets.scope, 'defaults: off, Monitor 6, strip 4, same as code widgets, automatic colours, dimmed, spiral and pitchwheel off');
  const X = stageSettings({ layer: 'nope', monitor: 9, strip: 0, colours: 'x', silent: 'hidden', widgets: { spiral: true } });
  check(X.layer === 'off' && X.monitor === 6 && X.strip === 1 && X.colours === 'auto' && X.silent === 'hidden' && X.widgets.spiral, 'stored values kept within their limits');
  check(stageSettings({ monitor: 1 }).monitor === 2, 'Monitor at least 2 panels');
  const cw = widgetSettings({ share: 0, instruments: { bass: { primary: 'spectrum' } }, widgets: { scope: false } });
  const same = stageMapping(stageSettings(null), cw), own = stageMapping(stageSettings({ mapping: 'own', instruments: { bass: { primary: 'pianoroll' } } }), cw);
  check(same.instruments.bass.primary === 'spectrum' && same.widgets.scope === true && same.order === cw.order && same.share === cw.share, 'same as code widgets: the code widgets\' instruments, the stage\'s widget kinds');
  check(own.instruments.bass.primary === 'pianoroll' && own.order === cw.order, 'own: the stage\'s instruments, the slot order of the code widgets');
  const st = song();
  check(rosterOf(st, { start: 0, end: 16 }, { S: same, max: 6 }).find(p => p.inst === 'bass').widget === 'spectrum', 'spec scenario: the code widgets card maps the bass, the stage follows it');
  const segs = [{ code: '$: s("bd*4").analyze("kick")\n$: note("c2").s("saw").analyze("bass")\n$: n("0 2").s("piano").analyze("arp")' }, { code: '$: x', run: "[0,9,{gain:1,analyze:'pad'}]" }];
  const sc = stageScopeInstruments(segs, stageMapping(stageSettings(null), widgetSettings({ share: 0 })));
  check(sc.join() === 'bass', 'Always real: the stage instruments with a scope or spectrum (code and hidden mixer; the kick has the hit grid, the pad the tone cloud)', sc.join());
  const sc2 = stageScopeInstruments(segs, stageMapping(stageSettings({ v: SW_VERSION, widgets: { hitgrid: false, tonecloud: false } }), widgetSettings({ share: 0 })));
  check(sc2.join() === 'bass,kick,pad', 'Always real with the app widgets off: kick and pad have a scope again', sc2.join());
  const b = makeBackup([['coding-misk-stage-widgets', { strip: 2 }], ['coding-misk-sw-open', ['general']]]);
  check(b.data['coding-misk-stage-widgets'].strip === 2 && !('coding-misk-sw-open' in b.data), 'the stage widgets travel in the backup, the open sections of their card do not');
  check(JSON.stringify(SW_DEFAULTS.widgets) === JSON.stringify(D.widgets), 'the defaults read back as the defaults');
}

// ---------- the looks in the menus ----------
check(['monitor', 'rullo'].every(k => LOOKS.some(l => l[0] === k) && PICK_LOOKS.some(l => l[0] === k)), 'Monitor and Rullo are looks in every menu (LOOKS)');
check(LOOKS.find(l => l[0] === 'rullo')[1].en === 'Roll' && LOOKS.find(l => l[0] === 'rullo')[1].it === 'Rullo', 'Rullo is "Roll" in English');

// ---------- Widget notes default (settings-polish D2) ----------
check(CW_DEFAULTS.notes === 'full' && widgetSettings(null).notes === 'full', 'Widget notes: Always full by default (and after a reset)');
check(widgetSettings({ notes: 'volume' }).notes === 'full' && widgetSettings({ on: true, notes: 'volume', appKinds: 1 }).notes === 'full', 'Widget notes: a stored "volume" without a version moves to full');
const keep = widgetSettings({ notes: 'volume', v: CW_VERSION });
check(keep.notes === 'volume' && widgetSettings(keep).notes === 'volume', 'Widget notes: "volume" chosen after the move is kept');
check(widgetSettings(widgetSettings({ notes: 'volume' })).notes === 'full' && widgetSettings({ notes: 'full', v: CW_VERSION }).notes === 'full', 'Widget notes: the move is saved with the version and does not repeat');
check(widgetSettings(null).v === CW_VERSION, 'Widget notes: settings carry the version');

// ---------- app widgets as stage panels (stage-app-widgets) ----------
{
  const A = { start: 0, end: 16 }, SM = stageMapping(stageSettings(null), widgetSettings({ share: 0 }));
  const of = (insts, S = SM, max = 6) => { const x = noteStore(); for (const i of insts) x.add(i, [1, 1.2, ['kick', 'snare', 'hats'].includes(i) ? 'x' : 50, 1]); return rosterOf(x, A, { S, max }); };
  const fmt = r => r.map(p => `${p.inst}:${p.widget}`).join(' ');
  // D2: one hit grid for the drums
  const kd = of(['kick', 'snare', 'hats', 'bass', 'pad']), grid = kd.filter(p => p.widget === 'hitgrid');
  check(grid.length === 1 && grid[0].inst === 'kick' && grid[0].group === 'drums' && grid[0].members.join() === 'kick,snare,hats' && !kd.some(p => ['snare', 'hats'].includes(p.inst)), 'D2: kick, snare and hats share one hit grid panel, in the kick\'s slot', fmt(kd));
  const many = of(['kick', 'snare', 'hats', 'bass', 'hook', 'arp', 'pad', 'voice']);
  check(many.length === 6 && many.some(p => p.inst === 'pad') && many.some(p => p.inst === 'arp'), 'D2: the freed slots go to other instruments', fmt(many));
  check(of(['snare', 'hats', 'bass']).find(p => p.widget === 'hitgrid').inst === 'snare', 'D2: without a kick the first drum instrument playing holds the hit grid');
  const noGrid = stageMapping(stageSettings({ v: SW_VERSION, widgets: { hitgrid: false } }), widgetSettings({ share: 0 }));
  check(!of(['kick', 'snare', 'bass'], noGrid).some(p => p.widget === 'hitgrid') && of(['kick', 'snare', 'bass'], noGrid).length === 3, 'D2: the hit grid off: a panel per drum instrument, as before');
  // D3: one tone cloud
  const clouds = r => r.filter(p => p.widget === 'tonecloud').map(p => p.inst).join();
  const pv = of(['pad', 'voice', 'bass']);
  check(clouds(pv) === 'pad' && pv.find(p => p.inst === 'voice').widget === 'scope', 'D3 scenario: pad and voice: the pad has the tone cloud, the voice a scope', fmt(pv));
  const np = of(['bass', 'hook']);
  check(clouds(np) === 'bass' && np.find(p => p.inst === 'hook').widget === 'pianoroll', 'D3 scenario: no pad: the bass has the tone cloud, no other panel', fmt(np));
  check(clouds(of(['hook', 'arp'])) === 'hook' && clouds(of(['arp'])) === 'arp', 'D3: without pad and bass the lead, else the arp');
  check(clouds(of(['voice', 'kick'])) === '' && of(['voice', 'kick']).find(p => p.inst === 'voice').widget === 'scope', 'D3: the voice alone keeps its scope (no panel asked for a cloud)');
  const askVoice = stageMapping(stageSettings(null), widgetSettings({ share: 0, appKinds: 1, instruments: { voice: { primary: 'tonecloud', secondary: ['scope'] } } }));
  check(clouds(of(['voice', 'kick'], askVoice)) === 'voice' && clouds(of(['voice', 'bass'], askVoice)) === 'bass', 'D3: the voice holds the cloud only when no other can and one was asked for');
  {
    let bad = null;
    for (let k = 0; k < 40 && !bad; k++) {
      const S = stageMapping(stageSettings(null), widgetSettings({ share: 100 })), r = rosterOf((() => { const x = noteStore(); for (const i of ['pad', 'bass', 'hook', 'arp', 'voice', 'kick']) x.add(i, [1, 1.2, i === 'kick' ? 'x' : 50, 1]); return x; })(), A, { S, max: 6, seed: `s${k}` });
      if (r.filter(p => p.widget === 'tonecloud').length > 1 || r.filter(p => p.widget === 'hitgrid').length > 1) bad = fmt(r);
    }
    check(!bad, 'D3: never two tone clouds or two hit grids (share 100, 40 seeds)', bad || '');
  }
  const noCloud = stageMapping(stageSettings({ v: SW_VERSION, widgets: { tonecloud: false } }), widgetSettings({ share: 0 }));
  const nc = of(['pad', 'bass'], noCloud);
  check(clouds(nc) === '' && nc.find(p => p.inst === 'pad').widget === 'scope', 'spec scenario: the tone cloud turned off: the pad uses its next widget', fmt(nc));
  check(kd.filter(p => p.widget === 'hitgrid' || p.widget === 'tonecloud').every(p => p.alt && p.alt !== 'hitgrid' && p.alt !== 'tonecloud'), 'an app widget panel has a Strudel widget to fall back on');
  // the voice: spoken samples are the voice on the stage, the rest keeps its `analyze`
  check(stageInstOf({ s: 'say_en_x', analyze: 'fx' }) === 'voice' && stageInstOf({ s: 'bd', analyze: 'kick' }) === 'kick' && cwInstrument('voice') === 'voice', 'a spoken sample is the voice on the stage (its line says analyze("fx"))');
  // D4: settings
  const D = stageSettings(null);
  check(D.widgets.hitgrid && D.widgets.tonecloud && D.v === SW_VERSION && D.last === 'strip', 'D4: hit grid and tone cloud on by default, the version written, the quick switch\'s mode Side panels');
  const old = stageSettings({ layer: 'palco', widgets: { hitgrid: false, tonecloud: false, scope: false }, appKinds: 1 });
  check(old.widgets.hitgrid && old.widgets.tonecloud && !old.widgets.scope && old.layer === 'palco', 'D4: old stored settings read with both app widgets on, the other choices kept (an old Palco is Big screen)');
  const later = stageSettings({ ...old, widgets: { ...old.widgets, tonecloud: false } });
  check(!later.widgets.tonecloud && !stageSettings(later).widgets.tonecloud, 'D4: a later choice (tone cloud off) is kept');
  check(SM.instruments.voice.on && SM.instruments.drums.primary === 'hitgrid' && SM.instruments.pad.primary === 'tonecloud' && SM.widgets.hitgrid, 'stageMapping keeps the app widgets and the voice');
  // D5: the quick switch
  check(stageSettings(toggleLayer(stageSettings(null))).layer === 'strip', 'D5: the first press turns on Side panels');
  const big = stageSettings({ v: SW_VERSION, layer: 'palco' }), off = stageSettings(toggleLayer(big)), back = stageSettings(toggleLayer(off));
  check(off.layer === 'off' && off.last === 'palco' && back.layer === 'palco', 'D5 scenario: Big screen, two presses: off, then Big screen again');
  check(SW_ON_LAYERS.join() === 'strip,palco' && stageSettings({ v: SW_VERSION, layer: 'off', last: 'nope' }).last === 'strip', 'D5: an unknown last mode reads as Side panels');
  // D1: drawn in a Monitor panel, a side panel and the big screen, by the code's painter, from the same notes
  const st = song(); for (let c = 0; c < 32; c++) st.add('snare', [c + 0.5, c + 0.55, 'sd', 0.8]);
  const songNotes = [{ inst: 'kick', p: 'bd' }, { inst: 'snare', p: 'sd' }, { inst: 'hats', p: 'hh' }];
  const appCtx = { S: appWidgetSettings(null), ctx: { meter: '4/4', key: 'C minor', songNotes, lang: 'en', font: 'mono' }, notes: notesOfStore(st, () => st.instruments), memo: () => new Map() };
  const frame = (cyc, roster) => ({ ...frameOf(st, cyc, columnCache()), roster, app: appCtx, render: 'normal' });
  const texts = g => g.log.filter(x => x[0] === 'fillText').map(x => String(x[1]));
  const roster = rosterOf(st, { start: 0, end: 16 }, { S: SM });
  check(roster.some(p => p.widget === 'hitgrid') && roster.some(p => p.widget === 'tonecloud'), 'the made-up song: a hit grid panel and a tone cloud panel', fmt(roster));
  // (the tone cloud is wide: on a 9:16 picture it fits a side panel alone, in a row of 4 it gives way to its next widget)
  const places = { monitor: monitorLayout(roster.length, 1280, 720), 'side panel': stripLayout(4, 1280, 720), 'big screen of 2': screenLayout(2, 1280, 720), 'side panel 9:16, 4 in a row': stripLayout(4, 405, 720), 'side panel 9:16, alone': stripLayout(1, 405, 720) };
  for (const [name, boxes] of Object.entries(places)) {
    for (const kind of name.includes('4 in a row') ? ['hitgrid'] : ['hitgrid', 'tonecloud']) {
      const p = roster.find(x => x.widget === kind), g = recorder();
      drawPanel(g, boxes[0], p, frame(6.3, roster));
      const T = texts(g), ok = kind === 'hitgrid' ? T.includes('bd') && T.includes('sd') && T.includes('hh') && T.some(x => /^bar 7/.test(x)) : T.some(x => /^chord /.test(x));
      check(ok && T.some(x => x.includes(kind)), `D1: ${kind} drawn by the code's painter in a ${name}`, `${Math.round(boxes[0].w)}×${Math.round(boxes[0].h)}`);
    }
  }
  // the same rows as the code's widget at the same bar, from the first frame
  const cf = appFrame('hitgrid', {}, appCtx.S, appCtx.notes, 0.1, { ...appCtx.ctx, render: 'normal' });
  check(cf.D.rows.map(r => r.key).slice(0, 3).join() === 'bd,sd,hh', 'D1: the hit grid\'s rows are the song\'s drum sounds from the first frame', cf.D.rows.map(r => r.key).join());
  const pc = roster.find(x => x.widget === 'tonecloud'), tiny = appWidgetFit({ x: 0, y: 0, w: 60, h: 30 }, pc, frame(6.3, roster));
  const g0 = recorder(); drawPanel(g0, { x: 0, y: 0, w: 90, h: 60 }, pc, frame(6.3, roster));
  check(tiny === null && texts(g0).some(x => x.includes(pc.alt)) && !texts(g0).some(x => /^chord /.test(x)), `below the size floor (${APP_MIN_FS.tonecloud} px of ${APP_FS} for the tone cloud) the panel shows its next widget (${pc.alt})`);
  // the header names the widget the body draws (a tone cloud too small for its panel: the next widget, in every render)
  {
    const glyphs = { ascii: (g, W, H, F) => drawMonitorAscii(g, W, H, { ...F, render: 'ascii' }), terminal: (g, W, H, F) => drawMonitorTerm(g, W, H, { ...F, render: 'terminal' }, termPalette('neon')) };
    const joined = g => texts(g).join('');
    const pcf = frame(13.3, [pc]);
    for (const [look, draw] of Object.entries(glyphs)) {
      const small = recorder(); draw(small, 200, 120, pcf);
      const big = recorder(); draw(big, 1280, 720, pcf);
      check(!joined(small).includes('tonecloud') && joined(small).includes(pc.alt), `header: ${look}, a panel too small for the tone cloud is titled ${pc.alt}`);
      check(joined(big).includes('tonecloud'), `header: ${look}, a panel that fits keeps tonecloud`);
    }
    const nSmall = recorder(); drawPanel(nSmall, { x: 0, y: 0, w: 90, h: 60 }, pc, pcf);
    const nBig = recorder(); drawPanel(nBig, { x: 0, y: 0, w: 600, h: 400 }, pc, pcf);
    check(!texts(nSmall).some(x => x.includes('tonecloud')) && texts(nBig).some(x => x.includes('tonecloud')), 'header: normal, too small gives the next widget, a fit keeps tonecloud');
  }
  // the same drawing for the same frame, Normal and the glyph forms
  const looks = [
    ['Monitor', (g, F) => drawMonitor(g, 1280, 720, F)],
    ['Monitor ASCII', (g, F) => drawMonitorAscii(g, 1280, 720, { ...F, render: 'ascii' })],
    ['Monitor Terminal', (g, F) => drawMonitorTerm(g, 1280, 720, { ...F, render: 'terminal' }, termPalette('neon'))],
    ['side panels ASCII', (g, F) => drawLayerGlyph(g, 1280, 720, { ...F, roster: F.roster.slice(0, 4), render: 'ascii' }, 'strip', 'ascii', termPalette('neon'))],
    ['side panels', (g, F) => drawLayer(g, 1280, 720, { ...F, roster: F.roster.slice(0, 4) }, 'strip')],
    ['big screen of 2', (g, F) => drawLayer(g, 1280, 720, { ...F, roster: F.roster.slice(0, 2) }, 'screen')],
  ];
  for (const [name, draw] of looks) {
    // (bar 14: the pad plays, so the glyph forms draw its panel's widget; the layer gets the two app widgets first)
    const one = () => { const g = recorder(), F = frame(13.3, roster); if (/side|big/.test(name)) F.roster = [...roster.filter(p => p.widget === 'hitgrid' || p.widget === 'tonecloud'), ...roster.filter(p => p.widget !== 'hitgrid' && p.widget !== 'tonecloud')]; draw(g, F); return g; };
    const a = one(), b = one(), T = texts(a), glyph = /ASCII|Terminal/.test(name);
    check(JSON.stringify(a.log) === JSON.stringify(b.log) && T.includes('bd') && T.some(x => /^chord /.test(x)) && (!glyph || T.some(x => /[█·]/.test(x))), `${name}: the hit grid and the tone cloud drawn${glyph ? ' in characters' : ''}, the same twice`, `same ${JSON.stringify(a.log) === JSON.stringify(b.log)}, grid ${T.includes('bd')}, cloud ${T.some(x => /^chord /.test(x))}`);
  }
}

// pianoroll-one-row (task 3.1): a pianoroll panel with F.roll draws its one-row look on Monitor, a side panel (strip)
// and the big screen, the same twice; without F.roll every panel draws as before
{
  const st = song(), cyc = 6.5;
  const draws = [['Monitor', (g, F) => drawMonitor(g, 1280, 720, F)], ['a side panel', (g, F) => drawLayer(g, 1280, 720, { ...F, pal: seeThrough(F.pal), roster: F.roster.slice(0, 4) }, 'strip')], ['the big screen', (g, F) => drawLayer(g, 1280, 720, { ...F, roster: F.roster.slice(0, 2) }, 'screen')]];
  for (const [name, draw] of draws) {
    const base = frameOf(st, cyc, columnCache()), roster = base.roster.map((p, i) => (i < 2 ? { ...p, widget: 'pianoroll' } : p));
    const run = roll => { const g = recorder(); draw(g, { ...base, roster, ...(roll ? { roll } : {}) }); return JSON.stringify(g.log); };
    const plain = run(null), none = run(() => null), thin = run(() => ({ look: 'thin', top: 1 })), thin2 = run(() => ({ look: 'thin', top: 1 })), alpha = run(() => ({ look: 'alpha', top: 1 }));
    check(plain === none && thin !== plain && thin === thin2 && alpha !== thin, `${name}: a one-row look drawn (the same twice), none without it`);
  }
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
