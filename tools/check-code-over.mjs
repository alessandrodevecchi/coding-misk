// "Code over" and the app widgets (code-over-visual), no browser: the areas by format and setting (captions and the
// strip never under the code), the bands of the painter (as wide as the text, none on empty lines, the cut column, the
// scroll), the lit tokens (first string only, mapped from the evaluated code), the edited line, the hit grid and the
// tone cloud from haps of Strudel in Node, their options, the calls commented out for code leaving the app (and that
// code evaluating with the same haps), and the settings.
//   npm run check:code-over
import { codeOverAreas, codeOverSettings, CO_DEFAULTS, drawCodeOver, litSpans, firstStrings, lineKinds, codeOverWidgets } from '../src/video/code-over.js';
import { appWidgetCalls, callOptions, commentAppWidgets, stripAppWidgets, appWidgetSettings, noteOfHap, widgetFrame, APP_WIDGET_NAMES } from '../src/widgets/app-widgets.js';
import { hitgridOptions, hitgridData, cellForm } from '../src/widgets/hitgrid.js';
import { tonecloudOptions, tonecloudData, rampChar, rowText, useFlats } from '../src/widgets/tonecloud.js';
import { neonRoles, NEON_TOKENS, overRoles } from '../src/code-themes/themes.js';
import { stripLayout } from '../src/visuals/widget-layer.js';
import { strudelInNode } from './mixer-checks.mjs';

const problems = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) problems.push(msg); };
const inside = (a, b) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// ---------- settings ----------
{
  const S = codeOverSettings(null);
  check(JSON.stringify(S) === JSON.stringify(CO_DEFAULTS), 'settings: the defaults');
  check(S.stage === false, 'cv1: the stage mode is off by default');
  check(codeOverSettings({ width: 200, side: 'up', lit: 'x', opacity: 'max' }).width === 90 && codeOverSettings({ side: 'up' }).side === 'left', 'settings: limits and unknown values');
}

// ---------- areas (D1, D7) ----------
{
  const W = 1920, H = 1080, A = codeOverAreas(W, H, codeOverSettings({}));
  check(Math.abs(A.code.x - W * 0.035) <= 1 && Math.abs(A.code.x + A.code.w - W * 0.62) <= 1, `cv2: 16:9 code from 3.5% to 62% (got ${A.code.x}..${A.code.x + A.code.w})`);
  check(A.code.fs === 27, `16:9 font at a fortieth of the height (got ${A.code.fs})`);
  for (const side of ['left', 'right', 'whole']) {
    const B = codeOverAreas(W, H, codeOverSettings({ side }));
    check(!overlap(B.code, B.free), `16:9 ${side}: the free area does not overlap the code`);
    // the caption box as drawCaptions places it in the free area: bottom at .86 of it
    const cap = { x: B.free.x + B.free.w * 0.1, y: B.free.y + B.free.h * 0.86 - 60, w: B.free.w * 0.8, h: 60 };
    check(!overlap(cap, B.code), `16:9 ${side}: a caption in the free area misses the code`);
    if (side !== 'whole') for (const p of stripLayout(2, B.free.w, B.free.h).map(p => ({ ...p, x: p.x + B.free.x, y: p.y + B.free.y }))) check(!overlap(p, B.code), `16:9 ${side}: a strip panel in the free area misses the code`);
  }
  const R = codeOverAreas(W, H, codeOverSettings({ side: 'right' }));
  check(Math.abs(R.code.x + R.code.w - W * 0.965) <= 1 && R.free.x === 0, 'right: the code on the right, the scene free on the left');
  const T = codeOverAreas(1080, 1920);
  check(T.tall && T.code.w === Math.round(1080 * 0.92) && T.code.y + T.code.h <= 1920 * 0.84 + 1 && T.free.y >= T.code.y + T.code.h, '9:16: whole width, the caption lane below the code');
  check(codeOverAreas(W, H, codeOverSettings({ width: 75 })).code.w > A.code.w, 'the width setting widens the code');
}

// ---------- the painter (D3): a recording context ----------
function recorder() {
  const log = [];
  const ctx = new Proxy({ measureText: s => ({ width: String(s).length * 12 }), save() {}, restore() {} }, {
    get(t, k) { if (k in t) return t[k]; if (k === 'log') return log; return (...a) => { log.push([k, ...a]); }; },
    set(t, k, v) { log.push(['=', k, v]); return true; },
  });
  return ctx;
}
const R = neonRoles(NEON_TOKENS), O = overRoles(R);
const T = { R, O, lit: 'outline' };
{
  const g = recorder(), A = { x: 50, y: 40, w: 12 * 70, h: 600, fs: 20 };
  const code = ['// drums', '$: s("bd*4").bank("RolandTR909")', '', `$: note("${'c3 '.repeat(40).trim()}").s("sawtooth")`, '  .lpf(800)', '_$: s("hh*8")', '  .gain(.4)'].join('\n');
  const out = drawCodeOver(g, A, { code, cursor: null, lit: [], widgets: [] }, T, {});
  check(out.cols === 70, `columns from the area (got ${out.cols})`);
  const short = out.rows.find(r => r.line === 1), long = out.rows.find(r => r.line === 3);
  check(short && Math.abs(short.w - ((short.text.length) * 12 + 10)) < 1, 'a band as wide as its text');
  check(!out.rows.some(r => r.line === 2), 'no band on an empty line');
  check(long && long.text.length === 70 && long.text.endsWith('…') && long.text.slice(0, 69) === code.split('\n')[3].slice(0, 69), 'a long line cut at cols − 1 with …');
  check(out.rows.find(r => r.line === 0).dim && out.rows.find(r => r.line === 5).dim && out.rows.find(r => r.line === 6).dim && !short.dim, 'comments and muted lines dimmed');
  const fills = g.log.filter(x => x[0] === 'fillRect');
  check(fills.length >= 6, 'bands drawn');
  // the edited line: the accent band and a block cursor
  const g2 = recorder(), out2 = drawCodeOver(g2, A, { code, cursor: { line: 4, col: 6, editing: true }, lit: [], widgets: [] }, T, {});
  check(out2.rows.find(r => r.line === 4).edit && out2.rows.filter(r => r.edit).length === 1, 'the edited line is drawn in the edit colour');
  check(g2.log.some(x => x[0] === '=' && x[1] === 'fillStyle' && x[2] === O.edit), 'the edit band in the accent');
  const g3 = recorder(), out3 = drawCodeOver(g3, A, { code, cursor: { line: 4, col: 6, editing: false }, lit: [], widgets: [] }, T, {});
  check(!out3.rows.some(r => r.edit), 'no edit band once the edit has ended');
  // the scroll: a long code keeps the focus line in the upper third
  const big = Array.from({ length: 80 }, (_, i) => `$: s("bd") // line ${i}`).join('\n'), st = {};
  let o = null; for (let k = 0; k < 200; k++) o = drawCodeOver(recorder(), A, { code: big, cursor: { line: 60, col: 3, editing: true }, lit: [], widgets: [] }, T, st);
  const fy = o.rows.find(r => r.line === 60);
  check(fy && fy.y >= A.y && fy.y <= A.y + A.h / 3 + 2, `the focus line in the upper third (y ${fy && fy.y})`);
  // lit tokens: outline boxes
  const g4 = recorder(); drawCodeOver(g4, A, { code, cursor: null, lit: [[1, 6, 10]], widgets: [] }, T, {});
  check(g4.log.some(x => x[0] === 'strokeRect'), 'a lit token framed (Outline)');
  const g5 = recorder(); drawCodeOver(g5, A, { code, cursor: null, lit: [[1, 6, 10]], widgets: [] }, { ...T, lit: 'fill' }, {});
  check(!g5.log.some(x => x[0] === 'strokeRect') && g5.log.filter(x => x[0] === 'fillRect').length > fills.length, 'a lit token filled (Filled)');
}

// ---------- lit tokens (D6, cv4) ----------
{
  const code = '$: s("bd*4").bank("RolandTR909")\n$: note("c3 e3")\n  .s("sawtooth")';
  const fs0 = firstStrings(code);
  check(fs0.length === 2 && code.slice(...fs0[0]) === 'bd*4' && code.slice(...fs0[1]) === 'c3 e3', 'the first string of each chain');
  const at = s => { const i = code.indexOf(s); return [i, i + s.length]; };
  const spans = [at('bd'), at('RolandTR909'), at('c3'), at('sawtooth')];
  const first = litSpans(code, code, spans, 'first'), all = litSpans(code, code, spans, 'all');
  check(first.length === 2 && first[0][0] === 0 && first[1][0] === 1, 'cv4: only the first string lights (not the bank, not the sound)');
  check(all.length === 4, 'Every string: every playing string');
  // the shown code moved by a typed line above: the evaluated line goes to the same text
  const shown = '// new\n' + code, mapped = litSpans(shown, code, [at('bd')], 'first');
  check(mapped.length === 1 && mapped[0][0] === 1 && mapped[0][1] === 6, 'a lit token follows its line in the code shown');
  check(lineKinds(['_$: x', '  .y()', '$: z']).map(k => k.muted).join() === 'true,true,false', 'muted chains');
}

// ---------- app widget calls (D8, cv7) ----------
{
  const code = '$: s("bd*4")._hitgrid({ steps: 8, extra: ["bass"] })\n$: note("<[a2,c3,e3]>")\n  .s("sawtooth")\n  ._tonecloud()';
  const calls = appWidgetCalls(code);
  check(calls.length === 2 && calls[0].kind === 'hitgrid' && calls[0].options.steps === 8 && calls[0].options.extra[0] === 'bass' && calls[1].kind === 'tonecloud' && calls[1].line === 3 && calls[1].start === 1, 'calls, their options and their lines');
  check(JSON.stringify(callOptions("{ ramp: ' .:', cols: 24, }")) === JSON.stringify({ ramp: ' .:', cols: 24 }), 'options read without evaluating');
  const out = commentAppWidgets(code);
  check(out === '$: s("bd*4")/* ._hitgrid({ steps: 8, extra: ["bass"] }) */\n$: note("<[a2,c3,e3]>")\n  .s("sawtooth")\n  /* ._tonecloud() */', `cv7: calls commented out in place (got ${JSON.stringify(out)})`);
  check(commentAppWidgets('$: x._tonecloud({ ramp: " */" })').includes('" *\\/"'), 'a */ inside the options is escaped');
  check(appWidgetCalls(out).length === 0, 'a commented call is no call');
  check(stripAppWidgets(code) === '$: s("bd*4")\n$: note("<[a2,c3,e3]>")\n  .s("sawtooth")', 'calls stripped');
  const S = appWidgetSettings(null);
  check(APP_WIDGET_NAMES.every(k => S[k].on) && S.hitgrid.steps === 16 && S.tonecloud.cols === 48, 'settings: on with the defaults');
  check(appWidgetSettings({ hitgrid: { steps: 99, on: false } }).hitgrid.steps === 32 && appWidgetSettings({ hitgrid: { on: false } }).hitgrid.on === false, 'settings: limits and off');
  check(hitgridOptions({ steps: 8, nope: 1 }).steps === 8 && hitgridOptions({ nope: 1 }).nope === undefined, 'unknown parameters ignored');
  check(cellForm('auto', 'terminal') === 'text' && cellForm('auto', 'led') === 'round' && cellForm('auto', 'bit') === 'two' && cellForm('auto', 'normal') === 'blocks', 'the cell form by render');
}

// ---------- widgets from haps (Strudel in Node) ----------
const S = await strudelInNode();
const notesOf = async (code, c0, c1) => (await S.evaluate(code)).queryArc(c0, c1).filter(h => h.hasOnset()).map(noteOfHap);
{
  const notes = await notesOf('$: s("bd*4").analyze("kick")\n$: s("hh*8").n("<0 3>").analyze("hats")', 12, 14);
  const o = hitgridOptions({}), D = hitgridData(notes, 12 + 15.5 / 16, o);
  const bd = D.hits.get('bd');
  check(bd && [...bd.keys()].sort((a, b) => a - b).join() === '0,4,8,12', `s("bd*4") lights steps 1, 5, 9, 13 (got ${bd && [...bd.keys()]})`);
  check(D.steps === 16 && D.step === 15 && D.bar === 13 && D.stepInBar === 16, 'bar 13 at its last sixteenth: step 16/16');
  const memo = new Map(); hitgridData(notes, 12.5, o, { memo }); const D2 = hitgridData(notes, 13.5, o, { memo });
  check(D2.rows.map(r => r.key).join() === 'bd,hh,hh:3', `variants apart and rows kept (got ${D2.rows.map(r => r.key)})`);
  check(hitgridData(notes, 12.5, o, { meter: '3/4' }).steps === 12, '3/4 gives 12 steps');
  check(hitgridData(notes, 12.5, hitgridOptions({ steps: 8 })).steps === 8, 'steps from the call');
  const bass = await notesOf('$: note("a1*4").s("sawtooth").analyze("bass")', 0, 1);
  check(hitgridData(bass, 0.5, o).rows.some(r => r.label === 'bass'), 'the bass row by default (extra)');
}
{
  const notes = await notesOf('$: note("[a2,c3,e3]").s("sawtooth").analyze("pad")', 0, 4);
  const o = tonecloudOptions({}), D = tonecloudData(notes, 3.9, o);
  check(D.chord && D.chord.name === 'Am' && [9, 0, 4].every(p => D.chord.set.includes(p)), `[a2,c3,e3] gives Am (got ${D.chord && D.chord.name})`);
  const lone = tonecloudData(await notesOf('$: note("a3").s("sine").analyze("lead")', 0, 4), 3.9, o);
  const A = rowText(lone, 9, o.ramp), E = rowText(lone, 4, o.ramp), Bb = rowText(lone, 10, o.ramp), Eb = rowText(lone, 3, o.ramp);
  const dens = s => [...s].reduce((a, c) => a + o.ramp.indexOf(c), 0);
  check(A.endsWith('@') && dens(A) > dens(E) && dens(E) > 0 && dens(Bb) > 0, `a lone A: the densest row, its fifth and neighbours lighter (A ${dens(A)}, E ${dens(E)}, Bb ${dens(Bb)})`);
  check(dens(Eb) < dens(E), 'the tritone stays lighter than the fifth');
  const silent = tonecloudData([], 3.9, o);
  check(Array.from({ length: 12 }, (_, p) => rowText(silent, p, o.ramp)).every(r => !r.trim()), 'no note: every row is spaces');
  check(rampChar(o.ramp, 1) === '@' && rampChar(o.ramp, 0.01) === ' ', 'the ramp: full level is the last character, nothing is a space');
  const w = tonecloudOptions({ norm: 'window' }), low = tonecloudData(notes.map(x => ({ ...x, lv: 0.3 })), 3.9, w), hi = tonecloudData(notes, 3.9, w);
  check(hi.E[9][w.cols - 1] >= low.E[9][w.cols - 1] - 1e-9, 'window normalisation keeps the order of levels');
  check(useFlats('auto', 'Eb') && !useFlats('auto', 'A') && useFlats('auto', 'Dm'), 'names by key');
  // the same picture for the same cycle (deterministic)
  check(JSON.stringify(Array.from(tonecloudData(notes, 3.9, o).E, r => Array.from(r))) === JSON.stringify(Array.from(D.E, r => Array.from(r))), 'the same cycle gives the same cloud');
}
{
  // a code with calls: the painter places each widget below its chain
  const code = '$: s("bd*4").analyze("kick")._hitgrid()\n\n$: note("[a2,c3,e3]").s("sawtooth").analyze("pad")\n  ._tonecloud()';
  const pat = await S.evaluate(stripAppWidgets(code));
  const notes = (c0, c1) => pat.queryArc(Math.floor(c0), Math.ceil(c1)).filter(h => h.hasOnset()).map(noteOfHap);
  const W = codeOverWidgets(code, appWidgetSettings(null), notes, 2.5, { lang: 'en' });
  check(W.length === 2 && W[0].after === 0 && W[1].after === 3, 'widgets below their chains');
  const out = drawCodeOver(recorder(), { x: 40, y: 40, w: 1000, h: 900, fs: 20 }, { code, lit: [], widgets: W }, T, {});
  check(out.widgets.length === 2 && out.widgets[0].y > out.rows.find(r => r.line === 0).y && out.widgets[1].y > out.rows.find(r => r.line === 3).y, 'widgets drawn below their lines');
  check(widgetFrame('hitgrid', {}, null, notes, 2.5, { render: 'terminal' }).o.form === 'text', 'Terminal: the grid in characters');
}
// ---------- code leaving the app evaluates in a plain Strudel with the same haps (cv7) ----------
{
  const code = '$: s("bd*4 sd")._hitgrid({ steps: 8 })\n$: note("c3 e3")\n  .s("sawtooth")\n  ._tonecloud({ ramp: " */" })\n  .gain(.5)';
  const plain = commentAppWidgets(code), ref = stripAppWidgets(code);
  const key = p => p.queryArc(0, 2).map(h => `${h.whole.begin}|${JSON.stringify(h.value)}`).join('\n');
  let a = null, b = null;
  try { a = key(await S.evaluate(plain)); b = key(await S.evaluate(ref)); } catch (e) { problems.push(`commented code: ${e.message}`); }
  check(a !== null && a === b, 'the commented code evaluates with the same haps as the code without the calls');
}

if (problems.length) { console.log(problems.map(p => `✗ ${p}`).join('\n')); console.log(`code over: ${problems.length} problem(s) in ${n} checks`); process.exit(1); }
console.log(`code over: ok (${n} checks)`);
