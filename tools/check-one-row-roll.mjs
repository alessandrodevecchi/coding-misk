// Checks of the one-row pianoroll without a browser (pianoroll-one-row, #82): the shape of a line (rows, equal volume,
// the loudest hit) over its reference span, the scale, the settings read from old and unknown values, the looks of the
// sections for Random (repeatable, varied, never three in a row), the code start of a line, and paint.roll with a
// recording context: unchanged without a look, the sizes and opacities of each look.
// Usage: npm run check:one-row-roll
import { strudelInNode } from './mixer-checks.mjs';
import { widgetSettings, CW_DEFAULTS, rollShape, rollLook, rollLooks, rollNotesOf, rollSpan, rollCodeStart, rollKeys, rollKey, rollThinHeight, oneRowOf, lineAtOffset, ROLL_LOOKS } from '../src/live/widgets.js';
import * as paint from '../src/visuals/widget-painters.js';
import { drawWidget } from '../src/visuals/widget-looks.js';
import { hashString } from '../src/endless/random.js';

let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const S = await strudelInNode();
const pat = async code => S.evaluate(code);
const shapeOf = async (code, span = [0, 8]) => rollShape(rollNotesOf((await pat(code)).queryArc(span[0], span[1])), span);
const D = widgetSettings(null);

// ---------- 1.1 shapes ----------
const L1 = '$: s("[~ hh]*4").gain(0.1)', L2 = '$: s("hh*4").gain("0.5 0.15 0.3 0.15")', L3 = '$: s("hh*8, [~ oh]*2")';
{
  const a = await shapeOf(L1);
  check(a.rows === 1 && a.equal && Math.abs(a.top - 0.1) < 1e-9, 'L1 [~ hh]*4 at gain 0.1: one row, equal volume, top 0.1', JSON.stringify(a));
  const b = await shapeOf(L2);
  check(b.rows === 1 && !b.equal && b.top === 0.5, 'L2 gains 0.5 0.15 0.3 0.15: one row, varying', JSON.stringify(b));
  const lv = rollNotesOf((await pat(L2)).queryArc(0, 1)).map(n => +Math.min(1, n[3] / b.top).toFixed(3));
  check(lv.join() === '1,0.3,0.6,0.3', 'L2 levels 1, 0.3, 0.6, 0.3', lv.join());
  const c = await shapeOf(L3);
  check(c.rows === 2, 'L3 hh*8, [~ oh]*2: two rows, no one-row look', JSON.stringify(c));
  check(rollLook(D, 's', 0, c) === null, 'two rows: rollLook null (the roll as before)');
  const z = await shapeOf('$: s("hh*4").gain("0.4 0 0.4 0")');
  check(z.rows === 1 && z.equal, 'gains 0.4 0 0.4 0: equal, the zeros skipped', JSON.stringify(z));
  const one = (lvls) => rollShape(lvls.map((v, i) => [i, i + 0.5, '_hh', v]), [0, 8]);
  check(one([0.96, 1]).equal, '0.96 against 1: equal');
  check(!one([0.94, 1]).equal, '0.94 against 1: varying');
  // a louder hit after the span: capped at 1, the others keep their size
  const notes = [[0, 0.5, '_hh', 0.5], [1, 1.5, '_hh', 0.25], [9, 9.5, '_hh', 2]], sh = rollShape(notes, [0, 8]);
  check(sh.top === 0.5, 'a louder hit after the span does not change the scale', `top ${sh.top}`);
  const n1 = rollNotesOf((await pat('$: s("hh").n("<0 1>")')).queryArc(0, 2)), n2 = rollNotesOf((await pat('$: note("c3 e3")')).queryArc(0, 1));
  check(rollShape(n1, [0, 2]).rows === 2 && rollShape(n2, [0, 1]).rows === 2, 'rows as Strudel reads them: hh and hh:1 apart, two notes apart');
  check(rollShape(rollNotesOf((await pat('$: note("c3*4").s("sawtooth")')).queryArc(0, 1)), [0, 1]).rows === 1, 'one note repeated: one row');
  check(rollSpan({ start: 16, end: 20 }, 0).join() === '16,20' && rollSpan({ start: 16, end: 48 }, 20).join() === '20,28', 'span: from the later of section and code start, 8 cycles, cut at the section end');
}
// ---------- settings ----------
{
  check(D.rollEqual === 'thin' && D.rollVaried === 'random' && CW_DEFAULTS.rollEqual === 'thin', 'defaults: Thin and Random');
  const old = { on: true, max: 4, roll: 'punchcard', share: 50, notes: 'full', v: 2, appKinds: 1 }, W = widgetSettings(old);
  check(W.rollEqual === 'thin' && W.rollVaried === 'random' && W.max === 4 && W.roll === 'punchcard' && W.share === 50 && W.notes === 'full' && W.on, 'old settings: Thin and Random, the rest unchanged');
  const bad = widgetSettings({ rollEqual: 'tall', rollVaried: 'loud' });
  check(bad.rollEqual === 'thin' && bad.rollVaried === 'random', 'unknown values read as Thin and Random');
  const set = widgetSettings({ rollEqual: 'full', rollVaried: 'alpha' });
  check(set.rollEqual === 'full' && set.rollVaried === 'alpha' && widgetSettings(set).rollVaried === 'alpha', 'Full and Transparency kept, read again the same');
  const eq = { rows: 1, equal: true, top: 0.1 }, va = { rows: 1, equal: false, top: 0.5 };
  check(rollLook(D, 's', 0, eq) === 'thin' && rollLook(set, 's', 0, eq) === 'full', 'equal volume: Thin by default, Full when set');
  check(['height', 'alpha', 'both'].every(l => rollLook({ ...D, rollVaried: l }, 's', 3, va) === l), 'varying volume: the look set');
  check(rollThinHeight(36) === 18 && rollThinHeight(20) === 12, 'Thin height: half the row, at least 12 px');
}
// ---------- 1.2 Random per section ----------
{
  const seeds = Array.from({ length: 200 }, (_, i) => `seed-${i}-${hashString(String(i)).toString(36)}`), count = { height: 0, alpha: 0, both: 0 };
  let same = true, three = 0;
  for (const sd of seeds) {
    const a = rollLooks(D, 12, sd), b = rollLooks(D, 12, sd);
    if (a.join() !== b.join()) same = false;
    for (let k = 2; k < 12; k++) if (a[k] === a[k - 1] && a[k] === a[k - 2]) three++;
    for (const l of a) count[l]++;
    // the look of each section alone is the one of the list
    if (!a.every((l, k) => rollLook(D, sd, k, { rows: 1, equal: false, top: 1 }) === l)) same = false;
  }
  check(same, 'same seed, same looks (whole list and section by section)');
  check(three === 0, 'never three sections in a row with the same look', `${three}`);
  const tot = 200 * 12, share = Object.fromEntries(Object.entries(count).map(([k, v]) => [k, v / tot]));
  check(Object.values(share).every(x => x >= 0.25 && x <= 0.42), 'each look between 25% and 42% of the sections', Object.entries(share).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(', '));
  check(rollLooks(D, 6, 'a').join() !== rollLooks(D, 6, 'b').join() || rollLooks(D, 6, 'c').join() !== rollLooks(D, 6, 'a').join(), 'different seeds, different looks');
  check(ROLL_LOOKS.length === 3, 'Random draws among Height, Transparency, Both');
}
// ---------- code start (D2) ----------
{
  const hh = '$: s("hh*8").gain("0.5 0.2").analyze("hats")', bd = '$: s("bd*4").analyze("kick")', bd2 = '$: s("bd*4").gain(0.8).analyze("kick")';
  const codes = { 0: `${bd}\n${hh}`, 4: `${bd2}\n${hh}._pianoroll()`, 12: `${bd}\n${hh.replace('0.2', '0.3')}`, 20: `${bd}\n${hh}` };
  const steps = [0, 4, 12, 20], keysAt = at => rollKeys(codes[at]), key = rollKey(hh);
  check(rollKeys(codes[4]).has(key), 'a line with and without its widget call: the same key');
  check(rollCodeStart(steps, 6, key, 0, keysAt) === 0, 'another line changed: the code start stays at 0');
  check(rollCodeStart(steps, 14, key, 0, keysAt) === null, 'a line not in the code of its step: null (hand code)');
  check(rollCodeStart(steps, 14, rollKey(hh.replace('0.2', '0.3')), 0, keysAt) === 12, 'the line changed at bar 12: its code starts there');
  check(rollCodeStart(steps, 22, key, 16, keysAt) === 20 && rollCodeStart(steps, 7, key, 4, keysAt) === 4, 'cut at the section start');
  const code = `${bd}\n${hh}`;
  check(lineAtOffset(code, code.indexOf('hh*8')) === hh && lineAtOffset(code, 2) === bd, 'the line of a place in the code');
  // the editor's shape from a pattern and the app's context, the span from the line's code start
  const line = '$: s("hh*8").gain("0.5 0.2")';
  const o = oneRowOf(await pat(line), { roll: { code: line, bar: 10, section: 1, start: 8, end: 40, seed: 'x', codeStart: k => (k === rollKey(line) ? 12 : 8) } });
  check(o && o.span.join() === '12,20' && o.shape.rows === 1 && !o.shape.equal && o.section === 1 && o.seed === 'x', 'oneRowOf: span from the code start, one row, varying', o ? `${o.span} ${JSON.stringify(o.shape)}` : 'null');
  check(oneRowOf(await pat(L3), {}) === null, 'oneRowOf: two rows give null');
}
// ---------- 1.3 paint.roll ----------
function recorder() {
  const log = [];
  return new Proxy({}, {
    get(t, k) { if (k === 'log') return log; return (...a) => { log.push([k, ...a.map(x => (typeof x === 'number' ? +x.toFixed(3) : x))]); }; },
    set(t, k, v) { log.push(['=', k, typeof v === 'number' ? +v.toFixed(3) : v]); return true; },
  });
}
// the calls of today's roll (before this change), written out: the reference for the list of calls without a look
function rollBefore(g, box, list, cyc, o) {
  const span = o.span || 4, px = o.px || 1, pitches = o.pitches || paint.pitchesOf(list), rows = Math.max(1, pitches.length), rh = box.h / rows;
  const shown = paint.notesAround(list, cyc, span);
  for (const n of shown) {
    const r = pitches.indexOf(n[2]);
    if (r < 0) continue;
    const x = box.x + ((n[0] - (cyc - span / 2)) / span) * box.w, w = Math.max(o.minW ?? 2, ((n[1] - n[0]) / span) * box.w), y = box.y + box.h - (r + 1) * rh, on = n[0] <= cyc && cyc < n[1];
    g.globalAlpha = o.full ? 1 : Math.max(0, Math.min(1, n[3])); g.fillStyle = on ? o.on : o.off;
    if (o.punch) { g.beginPath(); g.arc(x + w / 2, y + rh / 2, Math.min(w, rh) * 0.4, 0, Math.PI * 2); g.fill(); } else g.fillRect(x, y + 1, w - 1, Math.max(1, rh - 2));
  }
  g.globalAlpha = 1;
  if (o.head) { g.fillStyle = o.head; g.fillRect(box.x + box.w / 2, box.y, 1.5 * px, box.h); }
  return shown.length;
}
const hashOf = log => hashString(JSON.stringify(log));
{
  const box = { x: 0, y: 0, w: 1000, h: 72 }, base = { span: 4, on: '#f0f', off: '#888', head: '#fff', px: 2 };
  let same = true;
  for (const code of [L1, L2, L3]) for (const o of [base, { ...base, full: true }, { ...base, punch: true }]) {
    const list = rollNotesOf((await pat(code)).queryArc(0, 8)), a = recorder(), b = recorder();
    paint.roll(a, box, list, 2, o); rollBefore(b, box, list, 2, o);
    if (hashOf(a.log) !== hashOf(b.log)) same = false;
  }
  check(same, 'paint.roll without a look: the same calls as before (L1 to L3, by volume, full, punchcard)');
  const list = rollNotesOf((await pat(L2)).queryArc(0, 8)), rects = (look, extra = {}) => {
    const g = recorder(); paint.roll(g, box, list, 2, { ...base, look, top: 0.5, ...extra });
    const out = []; let a = 1;
    for (const e of g.log) { if (e[0] === '=' && e[1] === 'globalAlpha') a = e[2]; if (e[0] === 'fillRect' && e[4] < box.w / 2) out.push({ x: e[1], y: e[2], w: e[3], h: e[4], a }); }
    return out.filter(r => r.h > 0 && r.x >= box.w / 4 && r.x < box.w / 4 + box.w / 4 - 1);
  };
  // the bar of cycle 1 (x from 250 to 500): four hits with levels 1, 0.3, 0.6, 0.3
  const H = rects('height'), full = box.h - 2;
  check(H.length === 4 && H.map(r => +(r.h / full).toFixed(2)).join() === '1,0.3,0.6,0.3' && H.every(r => r.a === 1 && Math.abs(r.y + r.h - (box.h - 1)) < 0.01), 'Height: 100%, 30%, 60%, 30% from the bottom, opaque', H.map(r => (r.h / full).toFixed(2)).join());
  const A = rects('alpha');
  check(A.length === 4 && A.every(r => Math.abs(r.h - full) < 0.01) && A.map(r => r.a).join() === '1,0.3,0.6,0.3', 'Transparency: full height, opacity 1, 0.3, 0.6, 0.3', A.map(r => r.a).join());
  const B = rects('both');
  check(B.length === 4 && B.map(r => +(r.h / full).toFixed(2)).join() === '1,0.3,0.6,0.3' && B.map(r => r.a).join() === '1,0.545,0.74,0.545', 'Both: the height and opacity 0.35 + 0.65 × level', B.map(r => r.a).join());
  const T = rects('thin');
  check(T.length === 4 && T.every(r => r.w === 6 && Math.abs(r.h - full) < 0.01 && r.a === 1), 'Thin: ticks 3 device pixels wide (px 2), the full canvas height, equal', T.map(r => `${r.w}×${r.h}`).join(' '));
  const TH = rects('thin', { half: true });
  check(TH.every(r => Math.abs(r.h - (box.h / 2 - 2)) < 0.01 && Math.abs(r.y - (box.h / 4 + 1)) < 0.01), 'Thin on the stage: a centred band of half the box');
  const F = rects('full');
  check(F.every(r => r.a === 1 && Math.abs(r.h - full) < 0.01), 'Full: full bars at full strength');
  // floors: a quiet hit stays visible
  const q = recorder(); paint.roll(q, box, [[1, 1.25, '_hh', 0.01], [1.5, 1.75, '_hh', 1]], 2, { ...base, look: 'height', top: 1 });
  const qh = q.log.filter(e => e[0] === 'fillRect' && e[4] < box.w / 2).map(e => e[4]);
  check(Math.abs(Math.min(...qh) - 0.2 * full) < 0.01, 'Height floor: at least 20% of the height');
  const qa = recorder(); paint.roll(qa, box, [[1, 1.25, '_hh', 0.01], [1.5, 1.75, '_hh', 1]], 2, { ...base, look: 'alpha', top: 1 });
  check(qa.log.some(e => e[0] === '=' && e[1] === 'globalAlpha' && e[2] === 0.2), 'Transparency floor: opacity at least 0.2');
  const z = recorder(); paint.roll(z, box, [[1, 1.25, '_hh', 0], [1.5, 1.75, '_hh', 0.5]], 2, { ...base, look: 'thin', top: 0.5 });
  check(z.log.filter(e => e[0] === 'fillRect').length === 2, 'silent hits are not drawn (one tick and the playhead)');
}
// ---------- stage: drawWidget with F.roll ----------
{
  const list = [[1, 1.25, 'hh', 0.5], [1.25, 1.5, 'hh', 0.15], [1.5, 1.75, 'hh', 0.3]];
  const F = { cyc: 2, pal: { ink: '#fff', grid: '#333', muted: '#888' }, notes: () => list, pitches: () => ['hh'], full: true };
  const a = recorder(); drawWidget(a, { x: 0, y: 0, w: 400, h: 100 }, { inst: 'hats', widget: 'pianoroll' }, { ...F, roll: () => ({ look: 'height', top: 0.5 }) }, '#00ffcc');
  const b = recorder(); drawWidget(b, { x: 0, y: 0, w: 400, h: 100 }, { inst: 'hats', widget: 'pianoroll' }, { ...F, roll: () => null }, '#00ffcc');
  const hs = a.log.filter(e => e[0] === 'fillRect' && e[3] > 2).map(e => +(e[4] / 98).toFixed(2));
  check(hs.join() === '1,0.3,0.6', 'stage panel: the section\'s look in the panel\'s colour', hs.join());
  const c = recorder(); drawWidget(c, { x: 0, y: 0, w: 400, h: 100 }, { inst: 'hats', widget: 'pianoroll' }, F, '#00ffcc');
  check(hashOf(b.log) === hashOf(c.log), 'stage panel without a one-row look: as before');
  const p = recorder(); drawWidget(p, { x: 0, y: 0, w: 400, h: 100 }, { inst: 'hats', widget: 'punchcard' }, { ...F, roll: () => ({ look: 'height', top: 0.5 }) }, '#00ffcc');
  check(p.log.some(e => e[0] === 'arc'), 'punchcard unchanged');
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall one-row pianoroll checks passed');
process.exit(failed ? 1 : 0);
