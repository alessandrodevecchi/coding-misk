// App code widgets (code-over-visual, custom-code-widgets D8): widgets of the app written in the code like Strudel's
// (`._hitgrid()`, `._tonecloud()`), drawn from notes (the haps of the code) by one painter everywhere: the editor, the
// "Code over" layout, every video and the live output. A new widget is one entry here: its defaults, the options of a
// call, the window of notes it needs, its data and its painter. Pure: checked in Node (tools/check-code-over.mjs).
import { HG_DEFAULTS, hitgridOptions, hitgridWindow, hitgridData, hitgridSize, paintHitgrid, cellForm } from './hitgrid.js';
import { TC_DEFAULTS, tonecloudOptions, tonecloudWindow, tonecloudData, tonecloudSize, paintTonecloud } from './tonecloud.js';

export const APP_WIDGETS = {
  hitgrid: { defaults: HG_DEFAULTS, options: hitgridOptions, window: hitgridWindow, data: (notes, cyc, o, ctx) => hitgridData(notes, cyc, o, ctx), size: hitgridSize, paint: paintHitgrid },
  tonecloud: { defaults: TC_DEFAULTS, options: tonecloudOptions, window: tonecloudWindow, data: (notes, cyc, o, ctx) => tonecloudData(notes, cyc, o, ctx), size: tonecloudSize, paint: paintTonecloud },
};
export const APP_WIDGET_NAMES = Object.keys(APP_WIDGETS);
// the settings key and the stored settings: each widget on or off and its defaults
export const AW_KEY = 'coding-misk-app-widgets';
export function appWidgetSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, out = {};
  for (const k of APP_WIDGET_NAMES) { const x = r[k] && typeof r[k] === 'object' ? r[k] : {}; out[k] = { on: x.on !== false, ...APP_WIDGETS[k].options(x, APP_WIDGETS[k].defaults) }; }
  return out;
}

// a call at the end of a line or on a continuation line of its own (one level of nested brackets for its options)
const NAMES = APP_WIDGET_NAMES.join('|');
export const APP_CALL = new RegExp(`\\._(${NAMES})\\(((?:[^()]|\\([^()]*\\))*)\\)`, 'g');
export const HAS_APP_CALL = new RegExp(`\\._(?:${NAMES})\\(`);
// the options object of a call's text (`{ steps: 8, extra: ["bass"] }`), read without evaluating it; {} when unreadable
export function callOptions(text) {
  const s = String(text || '').trim();
  if (!s) return {};
  try {
    const json = s.replace(/'/g, '"').replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":').replace(/,\s*([}\]])/g, '$1');
    const v = JSON.parse(json);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch (e) { return {}; }
}

// cv7: code leaving the app keeps the calls, made harmless: each call becomes a block comment in place, valid mid-chain
// and on a line of its own (`s("bd*4")/* ._hitgrid() */`); a `*/` inside the options is written `*\/`
export const commentAppWidgets = code => (typeof code === 'string' && HAS_APP_CALL.test(code) ? code.replace(APP_CALL, m => `/* ${m.replace(/\*\//g, '*\\/')} */`) : code);
// the calls removed (a line with and without the call is the same line: widget keys, typing)
const STRIP = new RegExp(`(?:[ \\t]*\\n[ \\t]*)?\\._(?:${NAMES})\\((?:[^()]|\\([^()]*\\))*\\)`, 'g');
export const stripAppWidgets = text => (typeof text === 'string' && HAS_APP_CALL.test(text) ? text.replace(STRIP, '') : text);

// the calls of a code: [{ kind, line (where the chain ends), start (the chain's first line), options, index (among the
// calls of that kind) }]
const PATTERN = /^\s*[_S]?\$:/;
export function appWidgetCalls(code) {
  const lines = String(code || '').split('\n'), out = [], count = {};
  lines.forEach((l, i) => {
    APP_CALL.lastIndex = 0;
    for (const m of l.matchAll(APP_CALL)) {
      if (/^\s*\/\//.test(l) || l.slice(0, m.index).includes('/*')) continue;
      let start = i; while (start > 0 && !PATTERN.test(lines[start]) && /^\s+(\.|\/\/ \.|\/\*)/.test(lines[start])) start--;
      let end = i; while (end + 1 < lines.length && /^\s+(\.|\/\/ \.|\/\*)/.test(lines[end + 1])) end++;
      const kind = m[1], index = count[kind] = (count[kind] ?? -1) + 1;
      out.push({ kind, line: end, start, options: callOptions(m[2]), index, muted: /^\s*_\$:/.test(lines[start]) });
    }
  });
  return out;
}

// the colours of the widgets from a code theme's roles (and the "Code over" roles: the band): never their own
export function widgetPalette(R, O = null) {
  const W = R.widget || { ink: R.text, a1: R.label, a2: R.string, muted: R.comment };
  return { band: O ? O.band : R.bg, ink: (O && O.roles ? O.roles.text : R.text), comment: (O && O.roles ? O.roles.comment : R.comment), hit: W.a1, now: W.a2 || W.a1, cur: W.muted, cell: W.muted, inv: W.a2 || W.a1, invInk: R.bg };
}

// one widget at (x, y): the options of the call over the settings, its notes, its data and its picture → { w, h }
// notes(c0, c1): the notes sounding in [c0, c1); ctx: { meter, key, memo, lang, render, font }
export function widgetFrame(kind, call, S, notes, cyc, ctx = {}) {
  const W = APP_WIDGETS[kind], o = W.options(call, S && S[kind]);
  o.form = cellForm(o.style, ctx.render || 'normal'); o.lang = ctx.lang || 'it'; o.font = ctx.font;
  const [c0, c1] = W.window(cyc, o), D = W.data(notes(c0, c1), cyc, o, ctx);
  return { kind, o, D };
}
export const widgetSize = (F, fs) => APP_WIDGETS[F.kind].size(F.D, F.o, fs);
export const paintWidget = (g, x, y, F, P, fs) => APP_WIDGETS[F.kind].paint(g, x, y, F.D, P, F.o, fs);

// notes from haps (real time), read as the render page reads them for the fast video (stage-feed.js noteOf, the same
// pitch and level), so both draw the same picture: the value's `analyze` as the instrument, its pitch (a MIDI number,
// else the sound's name), gain × velocity, and the sample's variant
const CHROMA = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }, ACC = { '#': 1, b: -1, s: 1, f: -1 };
export function pitchOfValue(v) {
  if (typeof v.note === 'number') return v.note;
  if (typeof v.note === 'string') { const m = v.note.match(/^([a-gA-G])([#bsf]*)(-?[0-9]*)$/); if (m) return (Number(m[3] || 3) + 1) * 12 + CHROMA[m[1].toLowerCase()] + [...m[2]].reduce((o, c) => o + ACC[c], 0); }
  if (typeof v.n === 'number' && !v.s) return v.n;
  if (v.freq) return 12 * Math.log2(v.freq / 440) + 69;
  return String(v.s ?? v.n ?? '?');
}
export const variantOf = v => (typeof v.n === 'number' && typeof pitchOfValue(v) === 'string' ? v.n : undefined);
export function noteOfHap(h) {
  const v = h.value && typeof h.value === 'object' ? h.value : { value: h.value };
  return { inst: v.analyze ?? null, b: h.whole.begin.valueOf(), e: h.whole.end.valueOf(), p: pitchOfValue(v), lv: (v.gain ?? 1) * (v.velocity ?? 1), n: variantOf(v) };
}
// notes from the render page's stage notes ([begin, end, pitch, level, variant] per instrument): the fast video
export const notesOfStore = (store, insts) => (c0, c1) => insts().flatMap(inst => store.around(inst, c0, c1).map(n => ({ inst, b: n[0], e: n[1], p: n[2], lv: n[3], n: n[4] ?? undefined })));

// ---------- the editor (D8): the calls registered with Strudel's registerWidget in the page ----------
// Each call's canvas is kept by its id with its kind and options (globalThis.miskAppWidgets), and also among the code
// widgets' canvases (globalThis.miskWidgetCanvases), so the video code layouts find it as they find Strudel's. The page
// redraws them every frame (drawAppWidgets). Where Strudel's editor is not loaded (Node, the render page) the methods
// are stubs that return the pattern unchanged, so the haps stay the same.
export function installAppWidgets(Pattern, { registerWidget = globalThis.registerWidget, setWidget = globalThis.setWidget } = {}) {
  if (!Pattern || !Pattern.prototype) return;
  const P = Pattern.prototype, page = typeof document !== 'undefined' && typeof registerWidget === 'function' && typeof setWidget === 'function';
  for (const kind of APP_WIDGET_NAMES) {
    const key = `_${kind}`;
    if (P[key] && P[key].miskApp) continue;
    if (!page) { const f = function () { return this; }; f.miskApp = true; P[key] = f; continue; }
    registerWidget(key, (id, options, pat) => {
      const reg = (globalThis.miskAppWidgets ||= new Map());
      let canvas = (reg.get(id) || {}).canvas || document.getElementById(id);
      if (!canvas || canvas.tagName !== 'CANVAS') { canvas = document.createElement('canvas'); canvas.className = 'app-widget'; }
      setWidget(id, canvas);
      reg.set(id, { kind, options: options && typeof options === 'object' && !Array.isArray(options) ? options : {}, canvas });
      (globalThis.miskWidgetCanvases ||= new Map()).set(id, canvas);
      return typeof pat.tag === 'function' ? pat.tag(id) : pat;
    });
    if (P[key]) P[key].miskApp = true;
  }
}
// every app widget in the editor at cycle cyc: S (appWidgetSettings), notes(c0, c1), P (widgetPalette), ctx (meter, key,
// lang, render, font); fs: the editor's font size (CSS px). Gone canvases are forgotten
export function drawAppWidgets(S, notes, cyc, P, ctx = {}, fs = 14) {
  const reg = globalThis.miskAppWidgets;
  if (!reg || !reg.size) return 0;
  const dpr = Math.min((typeof devicePixelRatio === 'number' && devicePixelRatio) || 1, 2);
  let n = 0;
  for (const [id, W] of reg) {
    if (!W.canvas.isConnected) { if (reg.size > 24) reg.delete(id); continue; }
    if (S && S[W.kind] && S[W.kind].on === false) { W.canvas.style.display = 'none'; continue; }
    W.canvas.style.display = '';
    const memo = (W.memo ||= new Map()), F = widgetFrame(W.kind, W.options, S, notes, cyc, { ...ctx, memo }), sz = widgetSize(F, fs);
    const w = Math.ceil(sz.w + fs * 0.4), h = Math.ceil(sz.h);
    if (W.canvas.width !== Math.round(w * dpr) || W.canvas.height !== Math.round(h * dpr)) { W.canvas.width = Math.round(w * dpr); W.canvas.height = Math.round(h * dpr); W.canvas.style.width = `${w}px`; W.canvas.style.height = `${h}px`; }
    const g = W.canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W.canvas.width, W.canvas.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintWidget(g, fs * 0.3, 0, F, P, fs);
    n++;
  }
  return n;
}
