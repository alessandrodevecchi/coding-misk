// Checks of the render styles without a browser (widget-render-styles, #79): the Render list next to the looks, the
// "Claude" look, the pixel rules of the passes (1-bit Bayer, LED, ASCII, Terminal) as pure functions of the frame (the
// same frame alone and inside a sequence gives the same output, no state, theme colours), the work sizes and the light
// form, and the native glyph forms of Monitor and Rullo (ASCII, Terminal) and the "Claude" look drawn with a recording
// context: the same frame twice, alone and in a sequence, gives the same drawing.
// Usage: npm run check:render-styles
import { RENDERS, NATIVE_RENDERS, RENDER_GAIN, LOOKS, PICK_LOOKS } from '../src/music.js';
import { BAYER8, BIT_COLOURS, bitPixels, ledPixels, asciiCells, ASCII_RAMP, termPixels, passSizes, liftTable, gainOf, drawTermChrome } from '../src/visuals/render-styles.js';
import { TERM_PALETTES, termPalette, termColour, gridOf, brailleWave, brailleDots } from '../src/visuals/term-grid.js';
import { drawMonitorTerm, drawRulloTerm, drawMonitorAscii, drawRulloAscii, drawClaude, drawLayerGlyph, sectionChange, promptLine, rowsFor } from '../src/visuals/glyph-looks.js';
import { noteStore, rosterOf, levelAt, flashAt, silentAt, columnCache } from '../src/visuals/stage-feed.js';
import { THEME_PALETTES } from '../src/visuals/widget-palettes.js';
import { widgetSettings } from '../src/live/widgets.js';

let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ---------- the Render list and the "Claude" look ----------
{
  const keys = RENDERS.map(r => r[0]);
  check(same(keys, ['normal', 'bit', 'crt', 'led', 'ascii', 'terminal']), 'renders: Normal, 1-bit, CRT, LED, ASCII, Terminal, Normal first (the default)');
  const nm = (k, l) => { const v = RENDERS.find(r => r[0] === k)[1]; return typeof v === 'string' ? v : v[l]; };
  check(nm('normal', 'it') === 'Normale' && nm('normal', 'en') === 'Normal' && nm('terminal', 'it') === 'Terminale' && nm('bit', 'it') === '1-bit', 'render names in Italian and English');
  check(same(NATIVE_RENDERS, ['ascii', 'terminal']), 'ASCII and Terminal are drawn natively by the widget looks');
  check(Object.values(RENDER_GAIN).every(v => v > 0.5 && v < 4) && gainOf('spazio') > gainOf('tramonto') && gainOf('unknown') === RENDER_GAIN.default, 'a gain per look, more for the dark ones');
  const cl = LOOKS.find(l => l[0] === 'claude');
  check(!!cl && cl[1] === 'Claude' && PICK_LOOKS.some(l => l[0] === 'claude'), 'the "Claude" look: the same name in every language, in the menus');
}

// ---------- the pixel rules ----------
// a made-up frame: a gradient, a sun, a dark sky, moving with t
function frame(w, h, t) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, sun = Math.hypot(x - w / 2, y - h * 0.55) < h * 0.3, v = y / h;
    d[i] = sun ? 255 : 40 + 160 * v; d[i + 1] = sun ? 180 + 60 * Math.sin(t) : 10 + 30 * v; d[i + 2] = sun ? 60 : 60 + 80 * (1 - v) * (0.5 + 0.5 * Math.sin(x / 7 + t)); d[i + 3] = 255;
  }
  return d;
}
{
  check(BAYER8.length === 64 && new Set(BAYER8).size === 64 && Math.min(...BAYER8) > 0 && Math.max(...BAYER8) < 1, 'Bayer 8×8: 64 different thresholds inside (0, 1)');
  const w = 96, h = 54, run = (fn, t) => fn(frame(w, h, t).slice());
  const passes = {
    bit: d => bitPixels(d, w, h, { gain: 1.5, ...BIT_COLOURS.neon }),
    bitHw: d => bitPixels(d, w, h, { gain: 1.5, ...BIT_COLOURS.hw }),
    led: d => ledPixels(d, w, h),
    ascii: d => { const r = asciiCells(d, w, h); return Uint8ClampedArray.from([...r.glyphs, ...r.rgb]); },
    term: d => termPixels(d, w, h, null),
    termHw: d => termPixels(d, w, h, TERM_PALETTES.hw.ramp),
  };
  for (const [name, fn] of Object.entries(passes)) {
    const alone = run(fn, 2.5);
    for (let t = 0; t < 5; t += 0.5) run(fn, t);
    const again = run(fn, 2.5);
    check(same(alone, again), `${name}: the same frame alone and after a sequence gives the same output`);
  }
  // 1-bit: two colours, the theme's
  const colours = (d, step = 4) => { const s = new Set(); for (let i = 0; i < d.length; i += step) s.add(`${d[i]},${d[i + 1]},${d[i + 2]}`); return s; };
  const nb = colours(run(passes.bit, 1)), hb = colours(run(passes.bitHw, 1));
  check(nb.size === 2 && nb.has('240,236,222') && nb.has('12,10,16'), '1-bit neon: paper white on near black, two colours');
  check(hb.size === 2 && hb.has('255,179,71') && hb.has('27,19,6'), '1-bit hardware: amber on the dark LCD ground');
  // Bayer is stable in time: a part of the frame that does not move keeps its dots
  const a = run(passes.bit, 0), b = run(passes.bit, Math.PI * 2);
  check(same(a, b), '1-bit: the same light gives the same dots (no shimmer from frame to frame)');
  // black stays black, white at full light (black point, gain)
  const flat = v => { const d = new Uint8ClampedArray(64 * 4).fill(v); for (let i = 3; i < d.length; i += 4) d[i] = 255; return d; };
  check(colours(bitPixels(flat(10), 8, 8, { ...BIT_COLOURS.neon })).size === 1 && colours(bitPixels(flat(250), 8, 8, { ...BIT_COLOURS.neon })).has('240,236,222'), '1-bit: below the black point stays paper, full light is ink');
  check(liftTable(0.1, 1.5) === liftTable(0.1, 1.5) && liftTable(0.1, 1.5)[0] === 0 && liftTable(0.1, 1.5)[255] === 1, 'the light table is made once per black point and gain');
  // LED: unlit dots faint, five levels
  const led = ledPixels(flat(0), 8, 8);
  check(colours(led).size === 1 && led[0] === 22, 'LED: an unlit dot stays faint');
  // ASCII: dark cells empty, bright cells the densest glyph
  const ac = asciiCells(flat(0), 8, 8), aw = asciiCells(flat(255), 8, 8);
  check(ac.glyphs.every(g => g === 0) && aw.glyphs.every(g => g === ASCII_RAMP.length - 1), `ASCII: no glyph in the dark, "${ASCII_RAMP.at(-1)}" at full light`);
  // Terminal: 8 levels per channel in neon, the amber ramp in hardware
  const tn = termPixels(frame(w, h, 1), w, h, null), levels = new Set();
  for (let i = 0; i < tn.length; i += 4) levels.add(tn[i]);
  check([...levels].every(v => [0, 1, 2, 3, 4, 5, 6, 7].some(k => Math.abs(v - (k * 255) / 7) < 1)), 'Terminal neon: truecolour stepped to 8 levels per channel', `${levels.size} levels of red`);
  const ramp = new Set(TERM_PALETTES.hw.ramp.map(c => c.join(',')));
  check([...colours(termPixels(frame(w, h, 1), w, h, TERM_PALETTES.hw.ramp))].every(c => ramp.has(c)), 'Terminal hardware: the scene mapped to the amber ramp');
}

// ---------- work sizes and the light form ----------
{
  const bit = passSizes('bit', 1920, 1080), bitL = passSizes('bit', 1920, 1080, true), led = passSizes('led', 1920, 1080), ledL = passSizes('led', 1920, 1080, true);
  const asc = passSizes('ascii', 1920, 1080), ascL = passSizes('ascii', 1920, 1080, true);
  check(bit.w === 640 && bit.h === 360 && bitL.w === 320, '1-bit works at a third of the frame, a sixth in the light form');
  check(led.h === 80 && ledL.h === 40 && Math.abs(led.pitch - 13.5) < 1e-9, 'LED: a dot pitch of 1/80 of the height, 1/40 in the light form');
  check(asc.h === 40 && ascL.h === 20 && Math.abs(asc.cellW * 1.9 - asc.cellH) < 1e-9, 'ASCII: cells of 1/40 of the height (1:1.9), half as many in the light form');
  check(passSizes('terminal', 1920, 1080).rows === 45 && passSizes('terminal', 1920, 1080, true).rows === 30, 'Terminal: 45 rows of half-block cells, 30 in the light form');
  check(passSizes('normal', 1920, 1080) === null && passSizes('crt', 1920, 1080) === null, 'Normal and CRT have no work size (CRT draws at full size)');
}

// ---------- the text interface ----------
{
  const N = TERM_PALETTES.neon, Hw = TERM_PALETTES.hw;
  check(termPalette('hw') === Hw && termPalette('neon') === N && termPalette('x') === N, 'Terminal: the theme picks the palette');
  check(N.bg === '#0d0b14' && Hw.bg === '#120e08' && !N.ramp && Hw.ramp.length === 6, 'Terminal palettes of the design (D6)');
  check(['kick', 'snare', 'hats', 'bass', 'guitar', 'arp', 'pad', 'hook', 'fx', 'riser', 'mystery'].every(i => /^#[0-9a-f]{6}$/i.test(termColour(N, i))) && termColour(N, 'mystery') === termColour(N, 'mystery'), 'Terminal: a named colour per instrument, stable for an unknown one');
  const G = gridOf(1280, 720, 36);
  check(G.rows === 36 && G.cols === 128 && G.ch === 20 && G.cw === 10, 'a grid of 128 × 36 cells at 1280 × 720 (cells twice as tall as wide)');
  check(rowsFor(720) === 36 && rowsFor(300) === 18, 'the grid rows follow the frame height (36 at 720)');
  const B = brailleWave(10, 4, Float32Array.from({ length: 64 }, (_, i) => 0.4 * Math.sin(i / 5)));
  check(B.bits.some(b => b) && B.bits.every(b => b < 256), 'braille: a wave sets dots in its cells');
  const flat = brailleWave(10, 4, null);
  check(flat.bits.filter(Boolean).length >= 10, 'braille: no wave draws a flat line');
  const D = brailleDots(2, 1); D.set(0, 0); D.set(3, 3);
  check(D.bits[0] === 0x1 && D.bits[1] === 0x80, 'braille dots in Unicode order');
}

// ---------- native glyph forms and the "Claude" look ----------
function recorder() {
  const log = [];
  const grad = () => ({ addColorStop: (...a) => log.push(['stop', ...a]) });
  const target = { createLinearGradient: (...a) => { log.push(['lg', ...a]); return grad(); }, createRadialGradient: (...a) => { log.push(['rg', ...a]); return grad(); }, measureText: s => ({ width: String(s).length * 7 }) };
  return new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; if (k === 'log') return log; return (...a) => { log.push([k, ...a.map(x => (typeof x === 'number' ? +x.toFixed(3) : x))]); }; },
    set(t, k, v) { log.push(['=', k, typeof v === 'number' ? +v.toFixed(3) : typeof v === 'object' ? 'obj' : v]); return true; },
  });
}
const S0 = widgetSettings({ share: 0 });
function song() {
  const st = noteStore();
  for (let c = 0; c < 32; c++) {
    for (let k = 0; k < 4; k++) { st.add('bass', [c + k / 4, c + k / 4 + 0.2, 36 + (k % 2) * 7, 0.8]); st.add('kick', [c + k / 4, c + k / 4 + 0.05, 'bd', 1]); }
    for (let k = 0; k < 8; k++) { st.add('hats', [c + k / 8, c + k / 8 + 0.05, 'hh', 0.5]); if (c >= 16) st.add('arp', [c + k / 8, c + k / 8 + 0.1, 60 + (k % 4) * 3, 0.6]); }
    st.add('hook', [c + 0.5, c + 0.9, 67 + (c % 3), 0.7]);
    if (c < 4) st.add('pad', [c, c + 1, 48, 0.6]);
  }
  return st;
}
function frameOf(st, cyc, cache) {
  const at = c => ({ start: Math.floor(c / 16) * 16, end: Math.floor(c / 16) * 16 + 16 }), sec = at(cyc);
  const roster = rosterOf(st, sec, { S: S0 }), prev = sec.start ? rosterOf(st, at(sec.start - 1), { S: S0 }) : [];
  const waveAt = (inst, t) => { const out = new Float32Array(128); for (let i = 0; i < 128; i++) out[i] = 0.4 * Math.sin((t * 12000 - 128 + i) / (inst.length + 3)); return out; };
  return {
    cyc, pal: THEME_PALETTES.neon, roster, prev, fade: 1, dim: 'dimmed', full: false, lanes: ['kick', 'hats'], melodic: ['bass', 'hook', 'arp'],
    notes: (i, a, b) => st.around(i, a, b), level: i => levelAt(st.around(i, cyc - 2, cyc + 0.01), cyc, i), flash: i => flashAt(st.around(i, cyc - 2, cyc + 0.01), cyc),
    silent: i => silentAt(st.around(i, cyc - 2, cyc + 0.01), cyc), wave: i => waveAt(i, cyc / 2), columns: i => cache.columns(i, cyc / 2, waveAt),
    pitches: i => [...new Set(st.around(i, sec.start, sec.end).map(n => n[2]))], range: () => ({ lo: 35, hi: 72 }), label: i => i,
  };
}
const infoOf = cyc => ({ title: 'Luci Rosse', section: cyc < 16 ? 'Intro' : 'Drop', sectionNo: cyc < 16 ? 1 : 2, sections: 2, next: cyc < 16 ? 'Drop' : null, nextIn: 16 - (cyc % 16), bar: cyc, bars: 32, bpm: 124, playing: true, renderName: 'Terminal', secBar: cyc % 16, say: '', sayBar: NaN });
const FORMS = {
  'Monitor Terminal': (g, W, H, F, i) => drawMonitorTerm(g, W, H, F, TERM_PALETTES.neon, i), 'Monitor Terminal hardware': (g, W, H, F, i) => drawMonitorTerm(g, W, H, F, TERM_PALETTES.hw, i),
  'Rullo Terminal': (g, W, H, F, i) => drawRulloTerm(g, W, H, F, TERM_PALETTES.neon, i), 'Monitor ASCII': drawMonitorAscii, 'Rullo ASCII': drawRulloAscii,
  Claude: (g, W, H, F, i) => drawClaude(g, W, H, F, TERM_PALETTES.neon, i),
  'layer strip Terminal': (g, W, H, F, i) => drawLayerGlyph(g, W, H, F, 'strip', 'terminal', TERM_PALETTES.neon, i), 'layer strip ASCII': (g, W, H, F, i) => drawLayerGlyph(g, W, H, F, 'strip', 'ascii', TERM_PALETTES.neon, i),
  'layer screen Terminal': (g, W, H, F, i) => drawLayerGlyph(g, W, H, F, 'screen', 'terminal', TERM_PALETTES.hw, i), 'Claude hardware': (g, W, H, F, i) => drawClaude(g, W, H, F, TERM_PALETTES.hw, i),
};
const st = song();
for (const [name, draw] of Object.entries(FORMS)) for (const [W, H] of [[1280, 720], [405, 720]]) {
  const cyc0 = 17.5, alone = () => { const g = recorder(); draw(g, W, H, frameOf(st, cyc0, columnCache()), infoOf(cyc0)); return JSON.stringify(g.log); };
  const cache = columnCache();
  let mid = '';
  for (let f = 0; f < 60; f++) { const cyc = 16.5 + f / 30; const g = recorder(); draw(g, W, H, frameOf(st, cyc, cache), infoOf(cyc)); if (f === 30) mid = JSON.stringify(g.log); }
  const a = alone(), b = alone();
  check(a === b && a === mid && a.length > 2000, `${name} ${W}×${H}: the same frame twice, alone and in a sequence, gives the same drawing`, `${a.length} characters of calls`);
}
{
  // Terminal: the scope as braille dots (arcs), the panels with rounded corners, the title in the instrument's colour
  const g = recorder(); drawMonitorTerm(g, 1280, 720, frameOf(st, 17.5, columnCache()), TERM_PALETTES.neon, infoOf(17.5));
  const L = g.log, texts = L.filter(x => x[0] === 'fillText').map(x => x[1]);
  check(L.filter(x => x[0] === 'arc').length > 50, 'Monitor Terminal: scopes drawn as braille dots');
  check(texts.some(s => s.startsWith('╭') && s.endsWith('╮')) && texts.includes(' bass '), 'Monitor Terminal: rounded panels titled with the instrument');
  check(texts.some(s => /━/.test(s)) && texts.some(s => s.includes('%')), 'Monitor Terminal: a level line with a percentage');
  const ga = recorder(); drawMonitorAscii(ga, 1280, 720, frameOf(st, 17.5, columnCache()), infoOf(17.5));
  const ta = ga.log.filter(x => x[0] === 'fillText').map(x => x[1]);
  check(ta.some(s => /^\+-+\+$/.test(s)) && ta.some(s => /^\[#*\.*\]$/.test(s)) && ta.some(s => s === '/' || s === '\\' || s === '-'), 'Monitor ASCII: +-| frames, a [####....] level, slope glyphs for the scope');
}
{
  // the layer over a scene in glyph forms (task 4.3): the strip's panels, one per instrument, no more than the strip holds
  const F = frameOf(st, 17.5, columnCache()), g = recorder(), drawn = drawLayerGlyph(g, 1280, 720, F, 'strip', 'terminal', TERM_PALETTES.neon, infoOf(17.5));
  const texts = g.log.filter(x => x[0] === 'fillText').map(x => x[1]);
  check(drawn.length > 0 && drawn.length <= 4 && texts.filter(s => s.startsWith('╭')).length === drawn.length, 'layer in Terminal: rounded panels in the strip, up to 4', `${drawn.length} panels`);
  const ga = recorder(), da = drawLayerGlyph(ga, 1280, 720, F, 'screen', 'ascii', TERM_PALETTES.neon, infoOf(17.5));
  check(da.length > 0 && ga.log.some(x => x[0] === 'fillText' && /^\+-+\+$/.test(x[1])), 'layer in ASCII: +-| panels in the Palco screen', `${da.length} panels`);
}
{
  // "Claude": what enters, what comes next, the typed line
  const F = frameOf(st, 16.2, columnCache()), ch = sectionChange(F);
  check(ch.enter.includes('arp') && ch.left.includes('pad'), 'Claude: the arp enters in the second section, the pad left', `enter ${ch.enter.join(',')} left ${ch.left.join(',')}`);
  const p0 = promptLine(F, { ...infoOf(16.2), secBar: 0.2 }), p1 = promptLine(F, { ...infoOf(17.2), secBar: 1.2 });
  check(p0.text.includes('arp') && p0.shown > 0 && p0.shown < p0.text.length && p1.shown === p1.text.length, 'Claude: the line of the section change typed over its first bar', `"${p0.text}" ${p0.shown}/${p0.text.length}`);
  const ps = promptLine(F, { ...infoOf(16.2), say: 'the bass drops', sayBar: 0.5 });
  check(ps.text === 'the bass drops' && ps.shown === 7, 'Claude: a narrator line typed out first');
  const g = recorder(); drawClaude(g, 1280, 720, F, TERM_PALETTES.neon, { ...infoOf(16.2), next: 'Outro', nextIn: 5.8, word: (k, v) => (k === 'enter' ? 'entra' : null) });
  const texts = g.log.filter(x => x[0] === 'fillText').map(x => x[1]);
  check(texts.some(s => s.startsWith('entra: ') && s.includes('arp')) && texts.some(s => s === 'next: outro in 6 bars'), 'Claude: what enters (in the words given) and what comes next');
  check(texts.includes('✻') && texts.some(s => s.includes('render: terminal')), 'Claude: the mark and the status line');
}
{
  // the chrome of the Terminal pass over a scene
  const g = recorder(), G = gridOf(1280, 720, 45);
  drawTermChrome(g, G, TERM_PALETTES.neon, { lookName: 'Tramonto', title: 'Luci Rosse', section: 'Drop', bar: 12.3, bars: 58, bpm: 124, playing: true, renderName: 'Terminal', wave: Float32Array.from({ length: 256 }, (_, i) => 0.3 * Math.sin(i / 8)) });
  const texts = g.log.filter(x => x[0] === 'fillText').map(x => x[1]);
  check(texts.some(s => s.includes('tramonto')) && texts.includes(' NORMAL ') && texts.includes('124 bpm') && texts.includes(' Drop '), 'Terminal over a scene: tab bar, status bar with the mode, the song, the section and the tempo');
  check(g.log.filter(x => x[0] === 'arc').length > 40, 'Terminal over a scene: a braille scope of the song\'s wave');
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
