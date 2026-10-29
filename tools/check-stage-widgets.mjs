// Checks of the widget looks without a browser (widgets-on-stage, #79): the Monitor layouts for 1 to 6 panels in 16:9,
// 9:16 and 1:1, the panels of a section (code widgets' mapping, limit, playing first, dimmed or hidden, stable in the
// section), silences, colours of both themes, the same drawing for the same frame (alone and in a sequence, with a
// recording context), spectrum columns from the time, notes queried once per cycle, pitches as Strudel reads them.
// Usage: npm run check:stage-widgets
// (Strudel's own note names, from its util module: the package's entry needs a browser)
import { noteToMidi } from '../node_modules/@strudel/core/util.mjs';
import { monitorLayout, drawMonitor, drawRullo } from '../src/visuals/widget-looks.js';
import { noteStore, liveNotes, rosterOf, levelAt, flashAt, silentAt, columnCache, pitchOf, cwInstrument } from '../src/visuals/stage-feed.js';
import { THEME_PALETTES, themePalette, instColour, scenePalette } from '../src/visuals/widget-palettes.js';
import { widgetSettings } from '../src/live/widgets.js';
import { stripLayout, screenLayout, palcoScreen, drawLayer, seeThrough } from '../src/visuals/widget-layer.js';
import { SW_DEFAULTS, stageSettings, stageMapping, layerOn, limitOf, stageScopeInstruments } from '../src/visuals/stage-settings.js';
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
  check(ra.map(p => p.inst).join() === 'bass,hook,kick,arp,hats,pad', 'section A: one panel per playing instrument, in the code widgets\' slot order (fx is off there)', ra.map(p => `${p.inst}:${p.widget}`).join(' '));
  check(ra.find(p => p.inst === 'bass').widget === 'scope' && ra.find(p => p.inst === 'hook').widget === 'pianoroll', 'same mapping as the code widgets: bass scope, lead pianoroll');
  check(rb.map(p => p.inst).join() === 'bass,hook,kick,snare,arp,hats', 'section B: six playing instruments first, the pad (silent in it) left out at the limit', rb.map(p => `${p.inst}${p.quiet ? ':quiet' : ''}`).join(' '));
  const r5 = rosterOf(st, B, { S: S0, max: 8 });
  check(r5.some(p => p.inst === 'pad' && p.quiet), 'a silent instrument that played within the window keeps a dimmed panel');
  check(!rosterOf(st, B, { S: S0, max: 8, silent: 'hidden' }).some(p => p.inst === 'pad'), '"hidden": no panel for a silent instrument');
  const S1 = widgetSettings({ share: 0, instruments: { bass: { primary: 'spectrum' } } });
  check(rosterOf(st, A, { S: S1 }).find(p => p.inst === 'bass').widget === 'spectrum', 'the code widgets card decides the widget (bass as spectrum)');
  const five = noteStore(); for (const i of ['bass', 'hook', 'kick', 'arp', 'hats']) five.add(i, [1, 1.2, i === 'kick' || i === 'hats' ? 'x' : 50, 1]);
  check(rosterOf(five, A, { S: S0 }).length === 5, 'spec scenario: bass, lead, kick, arp and hats give five panels');
  // the same panels whatever the time of the section: the roster depends only on the section and the notes known
  check(JSON.stringify(rosterOf(st, A, { S: S0 })) === JSON.stringify(rosterOf(song(), A, { S: S0 })), 'the panels of a section are the same every time they are asked');
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
  check(sc.join() === 'bass,kick,pad', 'Always real: the stage instruments with a scope or spectrum (code and hidden mixer)', sc.join());
  const b = makeBackup([['coding-misk-stage-widgets', { strip: 2 }], ['coding-misk-sw-open', ['general']]]);
  check(b.data['coding-misk-stage-widgets'].strip === 2 && !('coding-misk-sw-open' in b.data), 'the stage widgets travel in the backup, the open sections of their card do not');
  check(JSON.stringify(SW_DEFAULTS.widgets) === JSON.stringify(D.widgets), 'the defaults read back as the defaults');
}

// ---------- the looks in the menus ----------
check(['monitor', 'rullo'].every(k => LOOKS.some(l => l[0] === k) && PICK_LOOKS.some(l => l[0] === k)), 'Monitor and Rullo are looks in every menu (LOOKS)');
check(LOOKS.find(l => l[0] === 'rullo')[1].en === 'Roll' && LOOKS.find(l => l[0] === 'rullo')[1].it === 'Rullo', 'Rullo is "Roll" in English');

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
