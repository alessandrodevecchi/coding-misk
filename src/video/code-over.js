// "Code over" (code-over-visual D1-D7): the code drawn transparent over the scene, one band per line as wide as its text,
// the scene showing through the empty lines, the line being typed in the theme's accent with a block cursor, the playing
// tokens outlined or filled, and the app widgets (`._hitgrid()`, `._tonecloud()`) below their lines. One painter for the
// page's stage mode, the real-time video, the fast video, fragments and the live output. Pure: the areas, the rows and
// the drawing are checked in Node with a recording context (tools/check-code-over.mjs).
import { appWidgetCalls, widgetFrame, widgetSize, paintWidget, widgetPalette } from '../widgets/app-widgets.js';

export const CO_KEY = 'coding-misk-code-over';
// stage: the page's stage mode (cv1: optional, off by default); side and width of the code in 16:9 (cv2: the mockups'
// area, measured: text from 3.5% to about 61.5% of the frame, so 62%); opacity: Low, Medium, High (cv5); edit: the
// edited line in the accent; lit: which tokens light ('first': the first mini-notation string of each line, cv4;
// 'all': every playing string, as the editor); long: 'cut' with … or 'wrap'
export const CO_DEFAULTS = Object.freeze({ stage: false, side: 'left', width: 62, opacity: 'medium', edit: true, lit: 'first', long: 'cut' });
export const CO_SIDES = ['left', 'right', 'whole'];
export const CO_WIDTHS = [40, 90];
export const CO_LITS = ['first', 'all'];
export const CO_LONG = ['cut', 'wrap'];
export function codeOverSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, D = CO_DEFAULTS, w = Math.round(Number(r.width));
  return {
    stage: r.stage === true,
    side: CO_SIDES.includes(r.side) ? r.side : D.side,
    width: Number.isFinite(w) ? Math.max(CO_WIDTHS[0], Math.min(CO_WIDTHS[1], w)) : D.width,
    opacity: ['low', 'medium', 'high'].includes(r.opacity) ? r.opacity : D.opacity,
    edit: r.edit !== false,
    lit: CO_LITS.includes(r.lit) ? r.lit : D.lit,
    long: CO_LONG.includes(r.long) ? r.long : D.long,
  };
}

// ---------- areas (D1, D3, D7) ----------
// the code area and the free area of a w×h picture (the stage covers all of it): 16:9 on the side from 3.5% of the width
// to the code width, or the whole width above a band at the bottom; tall pictures: the whole width above the bottom
// 16% (4% gutters). fs: the code's font size. free: where the captions and the stage strip go
export function codeOverAreas(w, h, S = CO_DEFAULTS, tall = h > w * 1.05) {
  if (tall) {
    const fs = Math.max(10, Math.round(w / 34)), y = Math.round(h * 0.035), bottom = Math.round(h * 0.84);
    return { code: { x: Math.round(w * 0.04), y, w: Math.round(w * 0.92), h: bottom - y, fs }, free: { x: 0, y: bottom, w, h: h - bottom }, side: 'whole', tall: true };
  }
  const fs = Math.max(10, Math.round(h / 40)), edge = Math.round(w * (S.width || CO_DEFAULTS.width) / 100), gut = Math.round(w * 0.035), y = Math.round(h * 0.06);
  if (S.side === 'whole') { const bottom = Math.round(h * 0.84); return { code: { x: gut, y, w: w - 2 * gut, h: bottom - y, fs }, free: { x: 0, y: bottom, w, h: h - bottom }, side: 'whole', tall: false }; }
  const ch = Math.round(h * 0.94) - y;
  if (S.side === 'right') return { code: { x: w - edge, y, w: edge - gut, h: ch, fs }, free: { x: 0, y: 0, w: w - edge, h }, side: 'right', tall: false };
  return { code: { x: gut, y, w: edge - gut, h: ch, fs }, free: { x: edge, y: 0, w: w - edge, h }, side: 'left', tall: false };
}

// ---------- lines ----------
const PATTERN = /^\s*[_S]?\$:/;
const CONT = /^\s+(\.|\/\/ \.|\/\*)/;
// for each line: the line where its pattern chain starts (or -1), and whether it is muted (`_$:` and its continuation
// lines) or a comment
export function lineKinds(lines) {
  const out = []; let start = -1;
  lines.forEach((l, i) => {
    if (PATTERN.test(l)) start = i; else if (!CONT.test(l)) start = -1;
    out.push({ start, muted: start >= 0 && /^\s*_\$:/.test(lines[start]), comment: /^\s*\/\//.test(l) });
  });
  return out;
}
// the first string literal of each pattern chain: [from, to) offsets of its text inside the quotes, in the code
export function firstStrings(code) {
  const lines = String(code || '').split('\n'), kinds = lineKinds(lines), out = [];
  let pos = 0, want = -1;
  lines.forEach((l, i) => {
    if (kinds[i].start === i) want = i;
    if (want >= 0 && kinds[i].start === want && !kinds[i].comment) {
      const m = /"((?:[^"\\]|\\.)*)"/.exec(l.replace(/\/\/.*$/, ''));
      if (m) { out.push([pos + m.index + 1, pos + m.index + 1 + m[1].length]); want = -1; }
    }
    pos += l.length + 1;
  });
  return out;
}
// the lit spans of the haps (offsets into the code evaluated) as [line, from, to] of the code shown: a line of the
// evaluated code goes to the shown line with the same text nearest to it; mode 'first' keeps the tokens inside the
// first string of each chain only (cv4)
export function litSpans(shown, evaluated, spans, mode = 'first') {
  if (!spans || !spans.length) return [];
  const ev = String(evaluated || ''), sl = String(shown || '').split('\n'), el = ev.split('\n'), starts = [0];
  for (let i = 0; i < ev.length; i++) if (ev[i] === '\n') starts.push(i + 1);
  const firsts = mode === 'first' ? firstStrings(ev) : null;
  const byText = new Map(); sl.forEach((t, i) => { if (!byText.has(t)) byText.set(t, []); byText.get(t).push(i); });
  const lineOf = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1; } return lo; };
  const out = [], seen = new Set();
  for (const [a, b] of spans) {
    if (!(b > a) || a >= ev.length) continue;
    if (firsts && !firsts.some(([x, y]) => a >= x && b <= y)) continue;
    const li = lineOf(a), cands = byText.get(el[li]);
    if (!cands) continue;
    const to = cands.reduce((best, k) => (Math.abs(k - li) < Math.abs(best - li) ? k : best), cands[0]);
    const k = `${to}:${a - starts[li]}:${b - starts[li]}`;
    if (seen.has(k)) continue; seen.add(k);
    out.push([to, a - starts[li], Math.min(b, starts[li] + el[li].length) - starts[li]]);
  }
  return out;
}

// tokens of a line coloured by role (as drawCode does in the panel)
function tokens(line, R) {
  const out = []; let i = 0;
  while (i < line.length) {
    const rest = line.slice(i); let m;
    if (rest.startsWith('//')) { out.push([rest, R.comment, i]); break; }
    if ((m = /^\/\*[\s\S]*?(\*\/|$)/.exec(rest))) { out.push([m[0], R.comment, i]); i += m[0].length; continue; }
    if ((m = /^(["'`])(?:\\.|(?!\1).)*\1?/.exec(rest))) { out.push([m[0], R.string, i]); i += m[0].length; continue; }
    if ((m = /^\d+(\.\d+)?/.exec(rest))) { out.push([m[0], R.number, i]); i += m[0].length; continue; }
    if ((m = /^\s+/.exec(rest))) { i += m[0].length; continue; }
    if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) {
      const w = m[0], fn = line[i + w.length] === '(', dot = line[i - 1] === '.', label = line[i + w.length] === ':' && !line.slice(0, i).trim();
      out.push([w, /^(const|let|var|return|function|await|true|false|null|new|if|else|for)$/.test(w) ? R.keyword : label ? R.label : fn ? R.method : R.variable, i]);
      i += w.length; continue;
    }
    out.push([line[i], R.punct, i]); i++;
  }
  return out;
}

// ---------- the painter ----------
// g: a 2D context; A: the code area { x, y, w, h, fs }; F: the frame { code, cursor ({ line, col, editing } or null),
// lit ([line, from, to] of the shown code), widgets ([{ after, frame }] from codeOverWidgets), dim (muted lines dimmed),
// blink (the cursor blinks: real time), now (seconds) }; T: { R (code theme roles), O (overRoles), lit ('outline' |
// 'fill'), font, long ('cut' | 'wrap') }; st: the scroll state of this picture ({} kept by the caller).
// → what was drawn, for the checks: { cols, rows: [{ line, x, y, w, text, edit }], widgets: [{ kind, x, y, w, h }] }
export function drawCodeOver(g, A, F, T, st = {}) {
  const fs = A.fs || 24, lh = Math.round(fs * 1.42), font = T.font || '"JetBrains Mono", monospace';
  const R = { ...T.R, ...(T.O && T.O.roles) }, O = T.O || { band: T.R.bg, edit: T.R.caret, editInk: T.R.bg };
  g.save();
  g.font = `500 ${fs}px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  // another code font: sized so its characters are as wide as JetBrains Mono's (as drawCode does)
  if (T.font && !/^"JetBrains Mono"/.test(font)) { const want = fs * 0.6, got = g.measureText('M').width || want; g.font = `500 ${Math.round(fs * Math.max(0.7, Math.min(1.8, want / got)) * 10) / 10}px ${font}`; }
  const cw = g.measureText('M').width || fs * 0.6, cols = Math.max(12, Math.floor(A.w / cw));
  const lines = String(F.code || '').replace(/\t/g, '  ').split('\n'), kinds = lineKinds(lines);
  const cur = F.cursor && F.cursor.line >= 0 && F.cursor.line < lines.length ? F.cursor : null, editing = !!(cur && cur.editing && T.edit !== false);
  // rows: text rows (a wrapped line gives several) and widget blocks below their line
  const rows = [], below = new Map();
  for (const w of F.widgets || []) { if (!below.has(w.after)) below.set(w.after, []); below.get(w.after).push(w); }
  lines.forEach((l, i) => {
    if (T.long === 'wrap' && l.length > cols) { for (let k = 0; k < l.length; k += cols - 2) rows.push({ i, text: (k ? '  ' : '') + l.slice(k, k + cols - 2), from: k, wrap: true, h: lh }); }
    else rows.push({ i, text: l, from: 0, h: lh });
    for (const w of below.get(i) || []) { const s = widgetSize(w.frame, fs); rows.push({ w, i, h: s.h + lh * 0.3, size: s }); }
  });
  // the scroll keeps the edited line (else the last line typed, else the end) in the upper third, eased
  const focus = cur ? cur.line : lines.length - 1;
  let acc = 0, focusY = 0;
  for (const r of rows) { if (!r.w && r.i === focus && !focusY) focusY = acc; r.y = acc; acc += r.h; }
  const total = acc, room = A.h, want = total <= room ? 0 : Math.max(0, Math.min(total - room, focusY - room / 3));
  st.scroll = st.scroll === undefined ? want : st.scroll + (want - st.scroll) * (F.ease ?? 0.12);
  const lit = new Map(); for (const [li, a, b] of F.lit || []) { if (!lit.has(li)) lit.set(li, []); lit.get(li).push([a, b]); }
  const out = { cols, cw, lh, rows: [], widgets: [] };
  g.beginPath(); g.rect(A.x - fs, A.y - 4, A.w + 2 * fs, A.h + 8); g.clip();
  for (const r of rows) {
    const y = A.y + r.y - st.scroll;
    if (y + r.h < A.y - lh || y > A.y + A.h + lh) continue;
    if (r.w) {
      const P = widgetPalette(T.R, O), x = A.x;
      g.save(); if (r.w.muted && F.dim !== false) g.globalAlpha = 0.45;
      paintWidget(g, x, y + lh * 0.15, r.w.frame, P, fs); g.restore();
      out.widgets.push({ kind: r.w.frame.kind, x: x - fs * 0.3, y: y + lh * 0.15, w: r.size.w, h: r.size.h });
      continue;
    }
    let text = r.text;
    if (!text.trim()) continue; // an empty line: no band, the scene shows through
    const isEdit = editing && r.i === cur.line && (!r.wrap || (cur.col >= r.from && cur.col <= r.from + r.text.length));
    // a long line is cut with … in this layout; the edited line scrolls inside its band so the cursor stays in view
    let shift = 0;
    if (!r.wrap && text.length > cols) {
      if (isEdit && cur.col > cols - 2) { shift = cur.col - (cols - 3); text = '…' + text.slice(shift + 1, shift + cols - 1); }
      else text = text.slice(0, cols - 1) + '…';
      if (text.length > cols) text = text.slice(0, cols - 1) + '…';
    }
    const ind = text.match(/^\s*/)[0].length, k = kinds[r.i], dim = (k.comment || (k.muted && F.dim !== false)) && !isEdit;
    const bx = A.x + ind * cw - fs * 0.25, bw = (text.length - ind) * cw + fs * 0.5 + (isEdit ? cw : 0);
    g.fillStyle = isEdit ? O.edit : O.band; g.fillRect(bx, y + 1, bw, lh - 2);
    for (const [t, c, at] of tokens(text, R)) { g.fillStyle = isEdit ? O.editInk : dim ? R.comment : c; g.fillText(t, A.x + at * cw, y + lh / 2 + 1); }
    // the playing tokens: framed (Outline) or filled under the text (Filled)
    for (const [a0, b0] of lit.get(r.i) || []) {
      const a = a0 - r.from - shift + (r.wrap && r.from ? 2 : 0), b = b0 - r.from - shift + (r.wrap && r.from ? 2 : 0);
      if (b <= 0 || a >= text.length - (text.endsWith('…') ? 1 : 0)) continue;
      const x0 = A.x + Math.max(0, a) * cw - 2, w0 = (Math.min(b, text.length) - Math.max(0, a)) * cw + 4;
      if (T.lit === 'fill') { g.globalAlpha = 0.45; g.fillStyle = isEdit ? O.editInk : R.outline || R.text; g.fillRect(x0, y + 3, w0, lh - 6); g.globalAlpha = 1; }
      else { g.strokeStyle = isEdit ? O.editInk : T.R.outline || R.text; g.lineWidth = Math.max(2, fs / 12); g.strokeRect(x0, y + 3, w0, lh - 6); }
    }
    if (isEdit && (!F.blink || Math.floor((F.now || 0) * 2) % 2 === 0)) {
      const col = Math.max(0, Math.min(text.length, cur.col - r.from - shift + (r.wrap && r.from ? 2 : 0)));
      const cx = A.x + col * cw;
      g.fillStyle = O.editInk; g.fillRect(cx, y + 3, cw, lh - 6);
      const ch = text[col]; if (ch && ch.trim()) { g.fillStyle = O.edit; g.fillText(ch, cx, y + lh / 2 + 1); }
    }
    out.rows.push({ line: r.i, x: bx, y, w: bw, text, edit: isEdit, dim });
  }
  g.restore();
  return out;
}

// the app widgets of a code, each with its frame at cycle cyc: [{ after (the line it sits below), muted, frame }].
// S: the app widgets' settings (appWidgetSettings); notes(c0, c1); ctx: { meter, key, memo (Map per widget index), lang,
// render, font }
export function codeOverWidgets(code, S, notes, cyc, ctx = {}) {
  if (!notes) return [];
  return appWidgetCalls(code).filter(c => !S || !S[c.kind] || S[c.kind].on !== false).map(c => {
    const memo = ctx.memos ? (ctx.memos.get(`${c.kind}:${c.index}`) || ctx.memos.set(`${c.kind}:${c.index}`, new Map()).get(`${c.kind}:${c.index}`)) : null;
    return { after: c.line, muted: c.muted, frame: widgetFrame(c.kind, c.options, S, notes, cyc, { ...ctx, memo }) };
  });
}
