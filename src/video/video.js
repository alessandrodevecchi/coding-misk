// Video recorder (#27): a frame drawn by the app at a fixed size (the stage, the code typing itself, the soul panel,
// a title card) recorded together with the master audio; or the whole browser tab, captured as it is.
// The frame is drawn after each stage frame, so it follows the music exactly as the stage does.
import { lineKey as widgetLineKey } from './widget-frames.js';
import { withWidgets, QUALITIES, VIDEO_DEFAULTS, LAYOUTS, TIMELINE_LAYOUTS, CARDS, layoutAreas, pickMime, extOf, cardAlpha } from './layout.js';
import { liveAreas, lerpAreas, ease, presetOf, TRANSITION, timelineWindow } from '../live/presets.js';
import { drawTimeline, drawColumn, futureShown } from '../live/timeline.js';
import { fragmentAreas, soulFocus, coverOffset } from './layout.js';
import { glitchAt, GLITCH_SECONDS, taglineAt, taglineFor } from './fragments.js';
import { hashString } from '../endless/random.js';
import { appRoles, MUTED_TEXT, overRoles } from '../code-themes/themes.js';
import { drawCodeOver, codeOverWidgets, litSpans, codeOverSettings, codeOverAreas } from './code-over.js';
import { drawCaptions } from '../captions/captions.js';

const KEY = 'coding-misk-video';
const LIVE_KEY = 'coding-misk-live-preset';

// visuals: { setTarget, canvas } from startVisuals; getCode(): the code in the editor; getInfo(cyc): what plays;
// getCaptions(cyc): { frame, S, label, hw } of the stage's captions now (spoken-text-on-stage D6), or null; getSoul(): { canvas } of the soul screen when the soul is on, else null;
// soulFrame(cyc, playing, scale): the soul screen always (the live picture's soul views, #52)
// getTimeline(cyc): { shape, bar, live } of the song on air, for the timeline views (#65), or null
// getHighlights(): true when the playing notes light up in the code (performance-profiles)
// getCodeTheme(): the code's colours and font (code-themes D8): { roles (null: the app theme's colours), family, dim },
// read every frame; a fast video or a fragment passes the one read at its start (J.ct)
// getWidgets(): { canvas(type, index, key), dim } of the code widgets drawn now (the page's, or the fast video's drawn
// from its notes and waves), or null (code-widgets D11)
// getCodeOver(cyc): what the "Code over" layout needs besides the code (code-over-visual): { S (its settings), aw (the app
// widgets' settings), cursor ({ line, col, editing } of the line being typed, or null), evaluated (the code evaluated),
// spans ([from, to] offsets into it of the playing haps), notes(c0, c1) (for the app widgets), meter, key, lang, render,
// litForm ('outline' | 'fill'), song (a key: the widgets' rows start again with another song), fast (the fast video) }
export function createVideo({ getCodeOver = () => null, getCodeTheme = () => null, getWidgets = () => null, visuals, getCode, getInfo, getCaptions = () => null, getSoul, getTimeline = () => null, getHighlights = () => false, soulFrame = null, soulView = () => 'a', store, t, esc }) {
  const opts = () => { const o = { ...VIDEO_DEFAULTS, ...(store.get(KEY, {}) || {}) }; if (!LAYOUTS.includes(o.layout)) o.layout = VIDEO_DEFAULTS.layout; if (!QUALITIES[o.quality]) o.quality = VIDEO_DEFAULTS.quality; if (!CARDS.includes(o.card)) o.card = VIDEO_DEFAULTS.card; return o; };
  const setOpt = (k, v) => store.set(KEY, { ...opts(), [k]: v });
  const cv = document.createElement('canvas');
  // the context being drawn: the video's canvas, or the live picture's while it draws
  let g = cv.getContext('2d');
  let job = null;

  // ---------- the bar shown while a video records: preview, time, soul panel, stop and cancel ----------
  const bar = document.createElement('div');
  bar.className = 'video-bar'; bar.hidden = true; bar.setAttribute('role', 'status');
  document.body.appendChild(bar);
  const preview = document.createElement('canvas'); preview.className = 'video-prev'; preview.width = 192; preview.height = 108;
  function renderBar() {
    if (!job) { bar.hidden = true; return; }
    bar.hidden = job.layout === 'tab';
    const o = opts(), soulBtn = (job.layout === 'code' || job.layout === 'code-widgets') && getSoul() ? `<button class="chip" data-vid="soul" aria-pressed="${o.soulPanel}">${esc(t(o.soulPanel ? 'vidSoulFold' : 'vidSoulOpen'))}</button>` : '';
    bar.innerHTML = `<span class="vid-dot" aria-hidden="true"></span><span class="vid-time" data-vid-time></span>${soulBtn}<button class="chip" data-vid="stop">${esc(t('vidStop'))}</button><button class="chip" data-vid="cancel">${esc(t('vidCancel'))}</button>`;
    bar.prepend(preview);
    job.soulShown = !!soulBtn;
  }
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-vid]'); if (!b || !job) return;
    if (b.dataset.vid === 'soul') { setOpt('soulPanel', !opts().soulPanel); renderBar(); }
    if (b.dataset.vid === 'stop') job.onStop();
    if (b.dataset.vid === 'cancel') job.onCancel();
  });
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const elapsed = () => !job ? 0 : (performance.now() - job.t0 - job.paused - (job.pauseAt ? performance.now() - job.pauseAt : 0)) / 1000;

  // ---------- drawing ----------
  let colours = null, coloursAt = 0;
  function palette() {
    if (colours && performance.now() - coloursAt < 1000) return colours;
    // light-theme: videos do not follow the app theme; in LIGHT the neon tokens of the look are the --dk-* ones
    const cs = getComputedStyle(document.documentElement), v = k => cs.getPropertyValue(k.replace('--', '--dk-')).trim() || cs.getPropertyValue(k).trim();
    coloursAt = performance.now();
    return (colours = { bg: v('--bg') || '#0d0818', panel: v('--panel') || '#160f26', line: v('--line') || '#3a2a5c', ink: v('--ink') || '#f3ecff', muted: v('--muted') || '#a597c7', a1: v('--a1') || '#ff4fa3', a2: v('--a2') || '#ffb347' });
  }
  // the code: one colour per token kind, the last edit kept in view, a caret where it is typed
  // the scroll is kept per canvas: the live picture and the control room's small pictures scroll on their own
  let code = '', lastEdit = 0, editAt = -10;
  const scrolls = new WeakMap();
  // R: the code theme's roles (code-themes D8), or the app theme's (appRoles: today's colours)
  function tokens(line, R) {
    const out = []; let i = 0;
    while (i < line.length) {
      const rest = line.slice(i);
      let m;
      if (rest.startsWith('//')) { out.push([rest, R.comment]); break; }
      if ((m = /^(["'`])(?:\\.|(?!\1).)*\1?/.exec(rest))) { out.push([m[0], R.string]); i += m[0].length; continue; }
      if ((m = /^\d+(\.\d+)?/.exec(rest))) { out.push([m[0], R.number]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) {
        const w = m[0], fn = line[i + w.length] === '(', dot = line[i - 1] === '.';
        // a keyword, a label (`$:`, `_$:`) at the start of the line, a method (`.gain(`), a call (`note(`), a name
        const label = line[i + w.length] === ':' && !line.slice(0, i).trim();
        out.push([w, /^(const|let|var|return|function|await|true|false|null|new|if|else|for)$/.test(w) ? R.keyword : label ? R.label : fn ? (dot ? R.method : R.call || R.variable) : dot ? R.prop || R.method : R.name || R.variable]);
        i += w.length; continue;
      }
      out.push([line[i], R.punct]); i++;
    }
    return out;
  }
  // co: { mode: 'follow' | 'scroll' | 'focus', progress 0..1 (scroll), section: the section playing (focus), cyc }
  // widgets (code-widgets D11): the code widgets of the page copied below their lines, dimmed on muted lines
  // ct: the code theme read at the start of a fast video or a fragment (else the one in use now)
  function drawCode(A, P, now, frameH, co = null, widgets = false, ct = null) {
    const C = ct || getCodeTheme() || {}, R = C.roles || appRoles(P), W1 = R.widget || { a1: P.a1, a2: P.a2, muted: P.muted }, fam = C.family || '"JetBrains Mono", monospace';
    const src = getCode() || '';
    if (src !== code) {
      let i = 0; while (i < src.length && i < code.length && src[i] === code[i]) i++;
      lastEdit = i; code = src; editAt = now;
    }
    const fs = Math.round(frameH / 50), lh = Math.round(fs * 1.4), padX = Math.round(fs * 1.1), head = Math.round(fs * 2.4);
    g.save(); g.globalAlpha = A.a ?? 1;
    g.fillStyle = R.bg; g.strokeStyle = R.line; g.lineWidth = 2;
    g.beginPath(); g.roundRect(A.x, A.y, A.w, A.h, 10); g.fill(); g.stroke();
    g.fillStyle = R.head || R.comment; g.font = `600 ${Math.round(fs * .8)}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
    g.fillText('CODE · STRUDEL', A.x + padX, A.y + head / 2);
    g.beginPath(); g.rect(A.x + 2, A.y + head, A.w - 4, A.h - head - 2); g.clip();
    g.font = `500 ${fs}px "JetBrains Mono", monospace`; g.textBaseline = 'alphabetic';
    // another code font: sized so that its characters are as wide as JetBrains Mono's, so the lines break where the
    // code's line breaks expect (codeColsOf)
    if (C.family && !/^"JetBrains Mono"/.test(fam)) { const want = g.measureText('M').width; g.font = `500 ${fs}px ${fam}`; const k = Math.max(.7, Math.min(1.8, want / (g.measureText('M').width || want))); g.font = `500 ${Math.round(fs * k * 10) / 10}px ${fam}`; }
    // long lines wrap: rows of at most cols characters, continuation rows indented
    const cw = g.measureText('M').width, cols = Math.max(20, Math.floor((A.w - padX * 2) / cw)), ind = 2;
    const rows = [];
    let pos = 0, caret = null;
    const lines = code.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const ln = lines[li];
      let i = 0;
      do {
        const first = i === 0;
        let len = first ? cols : cols - ind;
        // break after a space or a comma when there is one in the second half of the row
        if (i + len < ln.length) { const cut = Math.max(ln.lastIndexOf(' ', i + len - 1), ln.lastIndexOf(',', i + len - 1)) + 1; if (cut > i + len * .5) len = cut - i; }
        const part = ln.slice(i, i + len);
        if (caret === null && lastEdit >= pos + i && (lastEdit <= pos + i + part.length)) caret = { row: rows.length, col: (first ? 0 : ind) + lastEdit - pos - i };
        rows.push({ line: ln, li, from: i, text: part, indent: first ? 0 : ind });
        i += len;
      } while (i < ln.length);
      pos += ln.length + 1;
    }
    if (!caret) caret = { row: rows.length - 1, col: 0 };
    // the code widgets below their lines: each row's place in rows, with the widgets' heights in between
    const W = widgets ? codeWidgets(lines, rows, A.w - padX * 2, fs) : null, at = k => (W ? W.pos[k] : k);
    const fit = Math.floor((A.h - head) / lh), maxScroll = Math.max(0, (W ? W.total : rows.length) - fit);
    // the row being edited sits in the upper third, when the code is longer than the panel
    let want = Math.max(0, Math.min(maxScroll, at(caret.row) - Math.floor(fit / 3)));
    // fragments (#57): scroll through all the code, or focus on the lines of the section playing
    let active = null;
    if (co && co.mode === 'scroll') want = maxScroll * Math.max(0, Math.min(1, co.progress || 0));
    if (co && co.mode === 'focus' && co.section >= 0) {
      const re = new RegExp(`\\bsection${co.section + 1}\\b`), on = new Set();
      lines.forEach((ln, i) => { if (re.test(ln) && !/^\s*const\s/.test(ln)) { on.add(i); if (i > 0 && /^\s*\/\//.test(lines[i - 1])) on.add(i - 1); } });
      if (on.size) {
        active = on;
        // the blocks of the section, one after another every two bars
        const blocks = [...on].filter(i => !on.has(i - 1)), li = blocks[Math.floor((co.cyc || 0) / 2) % blocks.length];
        const row = rows.findIndex(r => r.li === li);
        if (row >= 0) want = Math.max(0, Math.min(maxScroll, at(row) - Math.floor(fit / 3)));
      }
    }
    let scroll = scrolls.get(g.canvas) ?? want;
    scroll += (want - scroll) * .12; scrolls.set(g.canvas, scroll);
    const y0 = A.y + head + lh * .8 - scroll * lh;
    // the active lines glow, a little brighter on every beat
    if (active) {
      const beat = 1 - ((co.cyc || 0) * 4 % 1);
      rows.forEach((r, k) => { if (!active.has(r.li)) return; const y = y0 + at(k) * lh; if (y < A.y + head - lh || y > A.y + A.h + lh) return; g.fillStyle = W1.a1; g.globalAlpha = (A.a ?? 1) * (.12 + .14 * beat); g.fillRect(A.x + 4, y - fs * 1.02, A.w - 8, lh); g.globalAlpha = A.a ?? 1; g.fillStyle = W1.a1; g.fillRect(A.x + 4, y - fs * 1.02, Math.max(3, fs * .18), lh); });
    }
    // highlights: the layers of the instruments that sound glow with their level, and the step that plays in their
    // first pattern string gets a box, in time with the bar (as Strudel's editor marks the playing notes)
    if (getHighlights()) {
      const lv = (visuals && visuals.levels) || {}, cyc = lastCyc;
      let layer = null;
      const layerOf = [];
      lines.forEach((ln, i) => { if (/^[_S]?\$:/.test(ln)) layer = { start: i, muted: ln.startsWith('_') }; else if (!/^\s+\S/.test(ln)) layer = null; layerOf[i] = layer; });
      const idOf = new Map();
      lines.forEach((ln, i) => { const m = ln.match(/\.analyze\("([^"]+)"\)/), L = layerOf[i]; if (m && L) idOf.set(L.start, m[1]); });
      rows.forEach((r, k) => {
        const L = layerOf[r.li]; if (!L || L.muted) return;
        const level = Math.min(1, (lv[idOf.get(L.start)] || 0) * 2.5); if (level < .05) return;
        const y = y0 + at(k) * lh; if (y < A.y + head - lh || y > A.y + A.h + lh) return;
        g.fillStyle = W1.a2 || W1.a1; g.globalAlpha = (A.a ?? 1) * .3 * level; g.fillRect(A.x + 4, y - fs * .95, A.w - 8, lh);
        // the step box, in the first string of the layer's first row
        if (r.li !== L.start || r.from > 0) return;
        const m = r.line.match(/"([^"<>]*)"/); if (!m || m.index >= r.text.length) return;
        const toks = [...m[1].matchAll(/[^\s[\]]+/g)]; if (!toks.length) return;
        const tk = toks[Math.floor(((cyc % 1) + 1) % 1 * toks.length)], x = A.x + padX + (m.index + 1 + tk.index) * cw;
        g.globalAlpha = (A.a ?? 1) * (.5 + .5 * level); g.strokeStyle = W1.a2 || W1.a1; g.lineWidth = 1.5; g.strokeRect(x - 2, y - fs * .9, tk[0].length * cw + 4, fs * 1.15);
      });
      g.globalAlpha = A.a ?? 1;
    }
    // the text of muted lines (`_$:` and the indented lines below) dimmed, as in the panel (code-themes Q7)
    const dimmed = new Set();
    if (C.dim) { let on = false; lines.forEach((ln, i) => { const m = /^\s*(_?)\$:/.exec(ln); if (m) on = m[1] === '_'; else if (!/^\s+\S/.test(ln)) on = false; if (on) dimmed.add(i); }); }
    rows.forEach((r, k) => {
      const y = y0 + at(k) * lh; if (y < A.y + head - lh || y > A.y + A.h + lh) return;
      if (dimmed.has(r.li)) g.globalAlpha = (A.a ?? 1) * MUTED_TEXT;
      // colours come from the whole line, so a string or comment cut by the wrap keeps its colour
      let x = A.x + padX + r.indent * cw, c = 0;
      for (const [txt, col] of tokens(r.line, R)) {
        const a = Math.max(c, r.from), b = Math.min(c + txt.length, r.from + r.text.length);
        if (b > a) { g.fillStyle = col; g.fillText(txt.slice(a - c, b - c), x, y); x += cw * (b - a); }
        c += txt.length;
      }
      if (dimmed.has(r.li)) g.globalAlpha = A.a ?? 1;
    });
    // caret after the last edit, blinking once typing stops
    if (now - editAt < 1.2 || Math.floor(now * 2) % 2) {
      g.fillStyle = R.caret; g.fillRect(A.x + padX + caret.col * cw, y0 + at(caret.row) * lh - fs * .85, Math.max(2, fs * .12), fs * 1.05);
    }
    if (W) for (const w of W.items) {
      const y = y0 + (at(w.row) + 1) * lh - fs * .7 + w.dy;
      if (y > A.y + A.h || y + w.h < A.y + head) continue;
      g.save();
      if (w.muted) { g.globalAlpha = (A.a ?? 1) * .4; g.filter = 'grayscale(1)'; }
      try { g.drawImage(w.canvas, A.x + padX, y, w.w, w.h); } catch (e) {}
      if (w.muted) { g.filter = 'none'; g.globalAlpha = A.a ?? 1; g.setLineDash([4, 4]); g.strokeStyle = W1.muted || P.muted; g.lineWidth = 1; g.strokeRect(A.x + padX, y, w.w, w.h); }
      g.restore();
    }
    g.restore();
  }
  // the code widgets of the code shown: each call (type, its index among the calls of that type) found among the page's
  // widgets, drawn at the width of the panel; → { items: [{ row, dy, w, h, canvas, muted }], pos (row → place in rows),
  // total }
  function codeWidgets(lines, rows, width, fs) {
    const G = getWidgets(), lh = Math.round(fs * 1.4), count = {}, extra = new Map(), items = [];
    if (G) lines.forEach((ln, li) => {
      for (const m of ln.matchAll(/\._(scope|pianoroll|punchcard|spectrum|spiral|pitchwheel|hitgrid|tonecloud)\(/g)) {
        let start = li; while (start > 0 && /^\s+\./.test(lines[start])) start--;
        let end = li; while (end + 1 < lines.length && /^\s+\./.test(lines[end + 1])) end++;
        const type = m[1], index = count[type] = (count[type] ?? -1) + 1, canvas = G.canvas(type, index, widgetLineKey(lines.slice(start, end + 1).join('\n')));
        if (!canvas || !canvas.width) continue;
        // sizes as in the panel, at the video's font (the panel's is about 14 px)
        const cssW = parseFloat(canvas.style.width) || canvas.width, cssH = parseFloat(canvas.style.height) || canvas.height;
        const w = Math.min(width, cssW * fs / 14), h = w * cssH / cssW;
        const row = rows.reduce((a, r, k) => (r.li === li ? k : a), -1);
        if (row < 0) continue;
        const dy = extra.get(row) || 0;
        items.push({ row, dy, w, h, canvas, muted: !!G.dim && /^\s*_\$:/.test(lines[start]) });
        extra.set(row, dy + h + fs * .4);
      }
    });
    const pos = [];
    let acc = 0;
    rows.forEach((r, k) => { pos.push(k + acc); acc += (extra.get(k) || 0) / lh; });
    return { items, pos, total: rows.length + acc };
  }
  // "Code over" (code-over-visual D1): the code drawn over the stage in area A, with its own scroll per canvas; the app
  // widgets' rows are kept per song (D9)
  const overScroll = new WeakMap();
  let memos = new Map(), memoSong = null;
  function drawOver(A, P, now, cyc, ct = null) {
    if (!A || (A.a ?? 1) <= 0.01) return null;
    const C = ct || getCodeTheme() || {}, R = C.roles || appRoles(P), X = getCodeOver(cyc) || {}, S = codeOverSettings(X.S);
    const code = getCode() || '';
    if (X.song !== memoSong) { memoSong = X.song; memos = new Map(); }
    const lit = X.spans ? litSpans(code, X.evaluated ?? code, X.spans, S.lit) : [];
    const widgets = X.notes ? codeOverWidgets(code, X.aw, X.notes, cyc, { meter: X.meter, key: X.key, lang: X.lang, render: X.render, font: C.family, memos }) : [];
    let st = overScroll.get(g.canvas); if (!st) { st = {}; overScroll.set(g.canvas, st); }
    g.save(); g.globalAlpha = A.a ?? 1;
    try {
      const out = drawCodeOver(g, A, { code, cursor: X.cursor || null, lit, widgets, dim: C.dim !== false, blink: !X.fast, now }, { R, O: overRoles(R, S.opacity), lit: X.litForm || 'outline', font: C.family, long: S.long, edit: S.edit }, st);
      // (for the checks: the last code over drawn)
      globalThis.codingMiskCodeOver = { rows: out.rows.length, edit: (out.rows.find(r => r.edit) || {}).line ?? null, lit: lit.length, widgets: out.widgets.map(w => w.kind), cols: out.cols, cyc };
      return out;
    } finally { g.restore(); }
  }
  function drawSoul(A, P, open, soulCanvas) {
    // a fragment's main picture (#57): the soul screen cut to cover the box, kept on its view's focus (A.focus)
    if (A.mode && soulCanvas) {
      const sw = soulCanvas.width, sh = soulCanvas.height, k = Math.max(A.w / sw, A.h / sh), px = sw / 1200, fc = A.focus || { x: 600, y: 380 };
      const off = coverOffset(A.w, A.h, sw, sh, k, fc.x * px, fc.y * px);
      g.save(); g.beginPath(); g.rect(A.x, A.y, A.w, A.h); g.clip();
      g.drawImage(soulCanvas, A.x + off.x, A.y + off.y, sw * k, sh * k);
      g.restore(); return;
    }
    g.save(); g.globalAlpha = A.a ?? 1;
    g.fillStyle = P.panel; g.strokeStyle = P.line; g.lineWidth = 2;
    g.beginPath(); g.roundRect(A.x, A.y, A.w, A.h, 10); g.fill(); g.stroke();
    const fs = Math.round(A.head * .42);
    if (A.head) { g.fillStyle = P.muted; g.font = `600 ${fs}px "JetBrains Mono", monospace`; g.textBaseline = 'middle'; g.fillText(`SOUL ANALYZER ${open ? '▾' : '▸'}`, A.x + fs * 1.3, A.y + A.head / 2); }
    // the soul screen fitted into the panel's body
    if (open && soulCanvas) {
      const bw = A.w - 8, bh = A.h - A.head - 4, k = Math.min(bw / soulCanvas.width, bh / soulCanvas.height), sw = soulCanvas.width * k, sh = soulCanvas.height * k;
      g.drawImage(soulCanvas, A.x + 4 + (bw - sw) / 2, A.y + A.head + (bh - sh) / 2, sw, sh);
    }
    g.restore();
  }
  // the title card, bottom left of the stage: title, then artist and position
  let cardKey = '', cardT0 = 0;
  function drawCard(S, P, info, now, mode = opts().card, fade = 1) {
    const key = `${info.title || ''}|${info.artist || ''}|${info.n ?? ''}`;
    if (key !== cardKey) { cardKey = key; cardT0 = now; }
    const a = cardAlpha(mode, now, cardT0) * fade; if (a <= 0.01 || !info.title) return;
    const u = S.h / 1080, pad = 22 * u, tf = Math.round(40 * u), sf = Math.round(22 * u);
    g.save(); g.globalAlpha = a;
    g.font = `700 ${tf}px "Chakra Petch", system-ui, sans-serif`;
    const sub = [info.artist, info.line].filter(Boolean).join(' · ');
    const w = Math.max(g.measureText(info.title).width, (g.font = `500 ${sf}px "JetBrains Mono", monospace`, g.measureText(sub).width)) + pad * 2;
    const h = pad * 2 + tf + (sub ? sf * 1.5 : 0), x = S.x + 36 * u, y = S.y + S.h - h - 36 * u;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(x, y, Math.min(w, S.w - 72 * u), h, 8 * u); g.fill();
    g.fillStyle = P.a1; g.fillRect(x, y, 5 * u, h);
    g.textBaseline = 'top'; g.fillStyle = '#fff'; g.font = `700 ${tf}px "Chakra Petch", system-ui, sans-serif`; g.fillText(info.title, x + pad, y + pad, S.w - 72 * u - pad * 2);
    if (sub) { g.fillStyle = P.muted; g.font = `500 ${sf}px "JetBrains Mono", monospace`; g.fillText(sub, x + pad, y + pad + tf + sf * .4, S.w - 72 * u - pad * 2); }
    g.restore();
  }
  // the captions over the stage's area (D6): one renderer for every video, the fragments (tall: 9:16, the lower third,
  // two lines at most) and the live picture
  function drawSay(S, fade = 1, cyc = lastCyc, tall = false) {
    if (fade <= 0.01) return;
    const c = getCaptions(cyc); if (!c) return;
    g.save(); g.globalAlpha = fade;
    try {
      const drawn = drawCaptions(g, S, c.frame, c.S, { scale: (tall ? S.w : S.h) / 1080, tall, where: c.S.where, hw: c.hw, label: c.label });
      // (for the checks: the rows drawn in videos, when a check asks for them)
      if (Array.isArray(globalThis.codingMiskVideoCaptions)) for (const r of c.frame.rows) globalThis.codingMiskVideoCaptions.push({ cyc, kind: r.kind, text: r.text, tag: c.frame.tag, tall, rows: drawn.length });
    } finally { g.restore(); }
  }

  // the stage into an area: exact while recording (the stage draws at the area's size), cropped to fill for the preview
  function drawStage(A) {
    const src = visuals.canvas, k = Math.max(A.w / src.width, A.h / src.height), sw = A.w / k, sh = A.h / k;
    g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, A.x, A.y, A.w, A.h);
  }
  // the live preview in the settings (a canvas element, or null): the frame of the chosen layout, small, while it shows
  let previewEl = null, previewAt = 0;
  function drawPreview(cyc, playing) {
    if (!previewEl || !previewEl.isConnected || !previewEl.offsetParent) return;
    const now = performance.now() / 1000; if (now - previewAt < 1 / 15) return; previewAt = now;
    const o = opts(), pg = previewEl.getContext('2d'), W = previewEl.width, H = previewEl.height;
    if (o.layout === 'tab') {
      // the whole tab: what the window shows; a label says so
      const P = palette();
      pg.fillStyle = P.bg; pg.fillRect(0, 0, W, H);
      pg.fillStyle = P.muted; pg.font = `600 ${Math.round(H / 14)}px "JetBrains Mono", monospace`; pg.textAlign = 'center'; pg.textBaseline = 'middle';
      pg.fillText(t('vidPreviewTab'), W / 2, H / 2, W - 24); pg.textAlign = 'start';
      return;
    }
    if (cv.width !== 960 || cv.height !== 540) { cv.width = 960; cv.height = 540; }
    compose({ layout: o.layout, q: { w: 960, h: 540 } }, cyc, playing, now);
    pg.drawImage(cv, 0, 0, W, H);
  }
  // the "Code over" card's preview (code-over-visual D13): the layout at 960×540, small
  let coPrev = null, coPrevAt = 0;
  function drawCoPreview(cyc, playing) {
    if (!coPrev || !coPrev.isConnected || !coPrev.offsetParent) return;
    const now = performance.now() / 1000; if (now - coPrevAt < 1 / 15) return; coPrevAt = now;
    if (cv.width !== 960 || cv.height !== 540) { cv.width = 960; cv.height = 540; }
    compose({ layout: 'code-over', q: { w: 960, h: 540 } }, cyc, playing, now);
    coPrev.getContext('2d').drawImage(cv, 0, 0, coPrev.width, coPrev.height);
  }
  function compose(J, cyc, playing, now) {
    if (TIMELINE_LAYOUTS.includes(J.layout)) { paintLive(liveAreas(J.layout, J.q.w, J.q.h), J.q, cyc, playing, now, 1, { view: J.layout, card: true }); return false; }
    const P = palette(), Q = J.q;
    const soul = J.layout === 'code' || J.layout === 'code-widgets' ? getSoul() : null, soulMode = soul ? (opts().soulPanel ? 'open' : 'folded') : null;
    const X = J.layout === 'code-over' ? getCodeOver(cyc) || {} : null;
    const A = layoutAreas(J.layout, Q.w, Q.h, soulMode, X ? codeOverSettings(X.S) : undefined);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = P.bg; g.fillRect(0, 0, Q.w, Q.h);
    drawStage(A.stage);
    // code-over (D7): the captions and the card on the scene's side, the code drawn over the stage
    drawSay(A.free || A.stage, 1, cyc);
    drawCard(A.free || A.stage, P, getInfo(cyc) || {}, now);
    if (A.over) drawOver(A.over, P, now, cyc, J.ct);
    if (A.soul) drawSoul(A.soul, P, soulMode === 'open', soulMode === 'open' ? soul.canvas(cyc, playing, (A.soul.w - 8) / 1200) : null);
    if (A.code) drawCode(A.code, P, now, Q.h, null, withWidgets(J.layout), J.ct);
    return !!soul;
  }
  function frame(cyc, playing) {
    lastCyc = cyc; lastPlaying = playing;
    liveIdle();
    if (!job) { drawPreview(cyc, playing); drawVPreview(cyc); drawCoPreview(cyc, playing); return; }
    if (job.layout === 'tab') return;
    const now = performance.now() / 1000;
    if (compose(job, cyc, playing, now) !== job.soulShown) renderBar();
    // preview and time in the bar, a few times a second
    if (now - (job.barAt || 0) > .25) {
      job.barAt = now;
      preview.getContext('2d').drawImage(cv, 0, 0, preview.width, preview.height);
      const el = bar.querySelector('[data-vid-time]'); if (el) el.textContent = `REC ${clock(elapsed())}${job.total ? ` / ${clock(job.total)}` : ''}`;
    }
  }

  // ---------- recording ----------
  const supported = m => globalThis.MediaRecorder && MediaRecorder.isTypeSupported(m);
  // starts a video. audio: a MediaStream with the master audio. total: seconds, if known.
  // onStop / onCancel: the bar's buttons (and the browser's "stop sharing" for the tab).
  // Returns { recorder, ext, mime } or null (no video recording in this browser, or the tab capture was refused).
  // display: the stream of the whole tab, asked for beforehand with askTab() (it needs the click)
  function start({ audio, total = 0, onStop = () => {}, onCancel = () => {}, display = null }) {
    if (job) return null;
    const o = opts(), q = QUALITIES[o.quality], mime = pickMime(supported);
    if (!globalThis.MediaRecorder || !cv.captureStream) return null;
    let video;
    if (o.layout === 'tab') {
      if (!display) return null;
      video = display.getVideoTracks()[0];
      video.addEventListener('ended', () => job && job.onStop());
    } else {
      cv.width = q.w; cv.height = q.h;
      const A = layoutAreas(o.layout, q.w, q.h, null);
      visuals.setTarget({ w: A.stage.w, h: A.stage.h });
      video = cv.captureStream(q.fps).getVideoTracks()[0];
    }
    const stream = new MediaStream([video, ...audio.getAudioTracks()]);
    let recorder;
    try { recorder = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: q.bps, audioBitsPerSecond: 192000 }); }
    catch (e) { visuals.setTarget(null); return null; }
    cardKey = '';
    job = { layout: o.layout, q, total, display, video, recorder, t0: performance.now(), paused: 0, pauseAt: null, onStop, onCancel, soulShown: false };
    renderBar();
    return { recorder, mime: recorder.mimeType || mime, ext: extOf(recorder.mimeType || mime) };
  }
  // the whole tab: the browser asks which tab to share (this one is offered first)
  async function askTab() {
    if (opts().layout !== 'tab') return null;
    try {
      return await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: QUALITIES[opts().quality].fps }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
    } catch (e) { return false; }
  }
  // the recording ended (saved or cancelled): the stage goes back to its own size
  function end() {
    if (!job) return;
    if (job.display) job.display.getTracks().forEach(tr => tr.stop());
    job.video.stop();
    job = null; visuals.setTarget(live ? live.q : null); renderBar();
  }

  // ---------- fragments (#57): the vertical picture, its bands, the CRT label and the glitch frames ----------
  // the coding-misk logo: "coding" in neon script over the chrome "MISK", with a small equaliser on the music
  function drawLogo(A, levels) {
    const u = Math.min(A.h / 420, A.w / 1080, 1.15), cx = A.x + A.w / 2 - 60 * u, cy = A.y + A.h * .55;
    g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const chromeSize = Math.round(200 * u);
    g.font = `${chromeSize}px "Russo One", "Chakra Petch", sans-serif`;
    const cw = g.measureText('MISK').width;
    const grad = g.createLinearGradient(0, cy - chromeSize * .8, 0, cy + chromeSize * .1);
    [[0, '#ffffff'], [.28, '#d4ecff'], [.47, '#7d9fe0'], [.5, '#1a0f35'], [.53, '#ff4fa3'], [.76, '#ffc2e3'], [1, '#ffffff']].forEach(([o, c]) => grad.addColorStop(o, c));
    g.setTransform(1, 0, -0.18, 1, cy * 0.18, 0);
    g.shadowColor = '#ff4fa3'; g.shadowBlur = 24 * u; g.fillStyle = grad; g.fillText('MISK', cx, cy + chromeSize * .35);
    g.shadowBlur = 0; g.lineWidth = 2 * u; g.strokeStyle = 'rgba(255,255,255,.45)'; g.strokeText('MISK', cx, cy + chromeSize * .35);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.translate(cx - cw * .32, cy - chromeSize * .42); g.rotate(-0.16);
    g.font = `${Math.round(140 * u)}px "Mr Dafoe", "Brush Script MT", cursive`; g.fillStyle = '#fff';
    g.shadowColor = '#00e5ff'; g.shadowBlur = 30 * u; g.fillText('coding', 0, 0); g.shadowBlur = 10 * u; g.fillText('coding', 0, 0);
    g.restore();
    // the equaliser, right of the word
    const bars = 7, bw = 16 * u, gap = 9 * u, x0 = cx + cw * .55, base = cy + chromeSize * .38;
    g.save(); g.fillStyle = '#00e5ff'; g.shadowColor = '#00e5ff'; g.shadowBlur = 12 * u;
    for (let i = 0; i < bars; i++) { const lv = Math.max(.12, Math.min(1, (levels && levels[i]) || 0)), hgt = (16 + lv * 110) * u; g.fillRect(x0 + i * (bw + gap), base - hgt, bw, hgt); }
    g.restore();
  }
  // tag: the tagline typed so far ({ text, cursor, glitch }, see taglineAt), or none for the plain tagline
  function drawBottomBand(A, P, o, info, tag = null) {
    const u = Math.min(A.h / 420, A.w / 1080, 1.15), lines = [];
    if (o.vTitle && info.title) lines.push({ text: info.title, font: `700 ${Math.round(52 * u)}px "Chakra Petch", sans-serif`, color: '#fff' });
    if (tag && o.taglineFull) lines.push({ text: tag.text, tag, font: `600 ${Math.round(60 * u)}px "Chakra Petch", sans-serif`, color: P.ink });
    else if (o.tagline) lines.push({ text: o.tagline, font: `600 ${Math.round(60 * u)}px "Chakra Petch", sans-serif`, color: P.ink });
    if (o.fullLine) lines.push({ text: o.fullLine, font: `600 ${Math.round(42 * u)}px "JetBrains Mono", monospace`, color: P.a1 });
    if (!lines.length) return;
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    const step = 92 * u, y0 = A.y + A.h / 2 - (lines.length - 1) * step / 2;
    lines.forEach((l, i) => {
      g.font = l.font; g.fillStyle = l.color; g.shadowColor = l.color; g.shadowBlur = 10 * u;
      const y = y0 + i * step, cx = A.x + A.w / 2, max = A.w - 80 * u;
      if (!l.tag) { g.fillText(l.text, cx, y, max); return; }
      // typed: the text grows from the left edge of its final place, the block follows it; a glitch shifts and splits it
      const full = o.taglineFull || l.text, fw = Math.min(max, g.measureText(full + '█').width), sx = Math.min(1, max / g.measureText(full + '█').width);
      g.save(); g.textAlign = 'left'; g.translate(cx - fw / 2, y); g.scale(sx, 1);
      const k = l.tag.glitch, dx = k ? (Math.sin(y * 13 + k * 40) * 14 * u) : 0;
      if (k) { g.globalAlpha = .7; g.fillStyle = '#00e5ff'; g.fillText(l.text, dx - 4 * u, 0); g.fillStyle = '#ff4fa3'; g.fillText(l.text, -dx + 4 * u, 0); g.globalAlpha = 1; g.fillStyle = l.color; }
      g.fillText(l.text, dx, 0);
      if (l.tag.cursor) g.fillText('█', dx + g.measureText(l.text).width + 4 * u, 0);
      g.restore();
    });
    g.restore();
  }
  // the label: an amber CRT line typed in after the opening glitch, with scanlines and a slight flicker
  function drawLabel(Q, text, t, y) {
    const typed = Math.max(0, Math.min(text.length, Math.floor((t - GLITCH_SECONDS * .8) * 28)));
    if (!typed) return;
    const fs = Math.round(Math.min(Q.w, Q.h) / 19), pad = fs * .45, shown = text.slice(0, typed) + (typed < text.length || Math.floor(t * 2) % 2 ? '█' : ' ');
    g.save(); g.font = `${fs}px "VT323", "Share Tech Mono", monospace`; g.textBaseline = 'middle';
    const w = g.measureText(text + '█').width + pad * 2, h = fs * 1.25, x = (Q.w - w) / 2;
    g.fillStyle = 'rgba(8,6,2,.72)'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,179,71,.55)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.globalAlpha = .88 + .12 * Math.sin(t * 53) * Math.sin(t * 7);
    g.fillStyle = '#ffb347'; g.shadowColor = '#ffb347'; g.shadowBlur = fs * .35; g.fillText(shown, x + pad, y + h / 2);
    g.globalAlpha = .25; g.shadowBlur = 0; g.fillStyle = '#000';
    for (let yy = y; yy < y + h; yy += 4) g.fillRect(x, yy, w, 1.5);
    g.restore();
  }
  // the glitch frames: slices of the picture pushed sideways, colour split, noise, a dark veil and a CRT message
  function drawGlitch(Q, k, msg, t, seed) {
    const cvs = g.canvas, n = 18;
    let h = hashString(`${seed}/${Math.floor(t * 24)}`);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
    g.save();
    for (let i = 0; i < n * k; i++) {
      const y = rnd() * Q.h, hh = 8 + rnd() * Q.h / 14, dx = (rnd() - .5) * Q.w * .25 * k;
      g.drawImage(cvs, 0, y, Q.w, hh, dx, y, Q.w, hh);
    }
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = .18 * k;
    g.drawImage(cvs, 8 * k, 0); g.globalCompositeOperation = 'source-over';
    g.globalAlpha = .55 * k; g.fillStyle = '#05030a'; g.fillRect(0, 0, Q.w, Q.h);
    g.globalAlpha = .5 * k;
    for (let i = 0; i < 260 * k; i++) { g.fillStyle = rnd() > .5 ? '#3dffb0' : '#ff4fa3'; g.fillRect(rnd() * Q.w, rnd() * Q.h, 2 + rnd() * 40, 2); }
    g.globalAlpha = Math.min(1, k * 1.6);
    const fs = Math.round(Math.min(Q.w, Q.h) / 15);
    g.font = `${fs}px "VT323", "Share Tech Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#3dffb0'; g.shadowColor = '#3dffb0'; g.shadowBlur = fs * .4;
    g.fillText(`> ${msg}${Math.floor(t * 4) % 2 ? '_' : ' '}`, Q.w / 2, Q.h / 2);
    g.restore();
  }
  // the settings' preview of a fragment's vertical picture (#57): a canvas element and the settings, or null
  let vPrev = null, vPrevAt = 0;
  function drawVPreview(cyc) {
    if (!vPrev || !vPrev.el.isConnected || !vPrev.el.offsetParent) return;
    const now = performance.now() / 1000; if (now - vPrevAt < 1 / 12) return; vPrevAt = now;
    const o = vPrev.opts(), t = 3 + (now % 6), f = o.size;
    const el = vPrev.el, k = Math.min(el.width / f.file.w, el.height / f.file.h);
    composeVertical({ q: { w: Math.round(f.file.w / 2), h: Math.round(f.file.h / 2) }, comp: { w: Math.round(f.comp.w / 2), h: Math.round(f.comp.h / 2) }, o, label: o.label ? `FRAGMENT S0UL·7QX2K #${String(o.next || 1).padStart(3, '0')}` : '', code: 'PREVIEW', tagline: o.taglineMode === 'random' ? taglineFor('7QX2K') : o.tagline, msgs: { open: 'reading soul…', close: 'fragment recovered' }, length: 12 }, cyc, now, t, [.4, .7, .3, .9, .5, .6, .35], vPrev.section ? vPrev.section(cyc) : -1);
    const pg = el.getContext('2d'), w = f.file.w * k, h = f.file.h * k;
    pg.fillStyle = '#000'; pg.fillRect(0, 0, el.width, el.height); pg.drawImage(cv, (el.width - w) / 2, (el.height - h) / 2, w, h);
  }
  // a frame of a fragment into the video canvas. J: { o (settings), q: the file's size, comp: the size it is composed at
  // (turned by 90° when o.rotate), label, code, msgs, length }; section: the index of the section playing
  let turnCv = null;
  // the free space round a picture with its own proportions, filled with a blurred, darker copy of it (#57)
  let bleedCv = null;
  function bleedAround(A) {
    if (!A || !A.bleed || A.w < 2 || A.h < 2) return;
    const B = A.bleed; if (B.w <= A.w + 1 && B.h <= A.h + 1) return;
    bleedCv = bleedCv || document.createElement('canvas');
    if (bleedCv.width !== Math.round(A.w) || bleedCv.height !== Math.round(A.h)) { bleedCv.width = Math.round(A.w); bleedCv.height = Math.round(A.h); }
    const b = bleedCv.getContext('2d'); b.clearRect(0, 0, bleedCv.width, bleedCv.height); b.drawImage(g.canvas, A.x, A.y, A.w, A.h, 0, 0, bleedCv.width, bleedCv.height);
    const k = Math.max(B.w / A.w, B.h / A.h);
    g.save(); g.beginPath(); g.rect(B.x, B.y, B.w, B.h); g.clip(); g.filter = 'blur(16px) brightness(.7) saturate(1.2)';
    g.drawImage(bleedCv, B.x + (B.w - A.w * k) / 2, B.y + (B.h - A.h * k) / 2, A.w * k, A.h * k); g.filter = 'none';
    g.drawImage(bleedCv, A.x, A.y, A.w, A.h); g.restore();
  }
  function composeVertical(J, cyc, now, t, levels, section = -1) {
    const Q = J.q, C = J.comp || Q, P = palette(), o = J.o || {};
    if (cv.width !== Q.w || cv.height !== Q.h) { cv.width = Q.w; cv.height = Q.h; }
    const turned = C.w !== Q.w, keep = g;
    if (turned) { turnCv = turnCv || document.createElement('canvas'); if (turnCv.width !== C.w || turnCv.height !== C.h) { turnCv.width = C.w; turnCv.height = C.h; } g = turnCv.getContext('2d'); }
    try {
      const A = fragmentAreas(o, C.w, C.h);
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      g.fillStyle = P.bg; g.fillRect(0, 0, C.w, C.h);
      if (A.stage) { drawStage(A.stage); drawSay(A.free || A.stage, 1, cyc, C.h >= C.w || !A.free); bleedAround(A.stage); }
      if (A.over) drawOver(A.over, P, now, cyc, J.ct);
      if (A.soul && soulFrame) {
        // the soul cut to fill: centred on its view's focus; a view along the song keeps the fragment's stretch in sight,
        // its middle worked out once at the fragment's first frame
        if (A.soul.mode && J.soulU === undefined) { const inf = getInfo(cyc) || {}; J.soulU = inf.bars ? Math.min(1, ((inf.bar || 0) + (J.length - t) / 2 * (inf.bpm || 120) / 240) / inf.bars) : .5; }
        if (A.soul.mode) A.soul.focus = soulFocus(soulView(), J.soulU);
        drawSoul(A.soul, P, true, soulFrame(cyc, true, Math.max(.05, A.soul.mode ? Math.max(A.soul.w / 1200, A.soul.h / 760) : Math.min((A.soul.w - 8) / 1200, (A.soul.h - 4) / 760))));
        bleedAround(A.soul);
      }
      if (A.code) drawCode(A.code, P, now, Math.min(C.w, C.h) * 1.6, { mode: o.codeMode || 'focus', progress: t / (J.length || 1), section, cyc }, withWidgets(o.show), J.ct);
      if (A.top) drawLogo(A.top, levels);
      const tag = J.tagline !== undefined ? taglineAt(J.tagline, t, J.code) : null, oT = tag ? { ...o, taglineFull: J.tagline } : o;
      if (A.bottom) drawBottomBand(A.bottom, P, oT, getInfo(cyc) || {}, tag);
      if (A.strip) {
        drawLogo({ x: A.strip.x + A.strip.h * .2, y: A.strip.y, w: A.strip.h * 3.6, h: A.strip.h * 1.25 }, levels);
        drawBottomBand({ x: A.strip.x + A.strip.w * .38, y: A.strip.y, w: A.strip.w * .6, h: A.strip.h * 1.5 }, P, oT, getInfo(cyc) || {}, tag);
      }
      const labelY = A.top ? A.top.h + Math.min(C.w, C.h) * .03 : Math.min(C.w, C.h) * .04;
      if (o.label !== false && J.label) drawLabel(C, J.label, t, labelY);
      const gl = o.glitch !== false ? glitchAt(t, J.length) : null;
      if (gl && gl.k > 0) drawGlitch(C, gl.k, gl.phase === 'open' ? J.msgs.open : J.msgs.close, t, J.code);
    } finally { g = keep; }
    if (turned) { g.setTransform(0, 1, -1, 0, Q.w, 0); g.drawImage(turnCv, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0); }
  }

  // the timeline layout's line beside the playhead (D6): the line heard now with its speaker, '' when none (the step
  // line no longer shows there)
  const heardLine = cyc => { const c = getCaptions(cyc); const r = c && c.frame.rows[0]; return r ? { text: r.text, kind: r.kind } : null; };
  // ---------- the live picture (#52): drawn into the broadcast window's canvas, with presets and transitions ----------
  let lastCyc = 0, lastPlaying = false, live = null;
  const LIVE_Q = { w: 1920, h: 1080, fps: 30 };
  const nowS = () => performance.now() / 1000;
  // the areas and the card's opacity now: between the preset before and the preset on air during a transition
  const coOf = () => codeOverSettings((getCodeOver(lastCyc) || {}).S);
  const codeOverFree = (Q, S) => layoutAreas('code-over', Q.w, Q.h, null, S).free;
  function liveState(L, now, Q) {
    const k = ease((now - L.t0) / TRANSITION), to = liveAreas(L.preset.view, Q.w, Q.h, coOf());
    const from = L.from || to;
    return { A: k >= 1 ? to : lerpAreas(from, to, k), card: L.cardFrom + ((L.preset.card ? 1 : 0) - L.cardFrom) * k };
  }
  function paintLive(A, Q, cyc, playing, now, card, preset = null) {
    const P = palette();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    g.fillStyle = P.bg; g.fillRect(0, 0, Q.w, Q.h);
    if (A.stage.a > .01) { g.globalAlpha = A.stage.a; drawStage(A.stage); g.globalAlpha = 1; }
    // code-over (cv14): the captions on the scene's side while the code is over the stage
    const coS = A.over && A.over.a > .01 ? codeOverSettings((getCodeOver(cyc) || {}).S) : null, coFree = coS ? codeOverFree(Q, coS) : null;
    drawSay(coFree && A.over.a > .5 ? coFree : A.stage, A.stage.a, cyc);
    if (A.soul.a > .01 && A.soul.x < Q.w && soulFrame) {
      const bw = A.soul.w - 8, bh = A.soul.h - A.soul.head - 4;
      drawSoul(A.soul, P, true, soulFrame(cyc, playing, Math.max(.05, Math.min(bw / 1200, bh / 760))));
    }
    if (A.code.a > .01 && A.code.x < Q.w) drawCode(A.code, P, now, Q.h, null, !!(preset && withWidgets(preset.view)));
    if (coS) drawOver(A.over, P, now, cyc);
    // timeline and track column (#65): the song on air, what is coming hidden for live builds unless the preset shows it
    const tlOn = A.timeline && A.timeline.a > .01 && A.timeline.y < Q.h, colOn = A.column && A.column.a > .01 && A.column.x < Q.w;
    if (tlOn || colOn) {
      const T = getTimeline(cyc), p = presetOf(preset);
      if (T) {
        const future = futureShown(p.future, T.live);
        if (tlOn) drawTimeline(g, A.timeline, T.shape, T.bar, P, { window: timelineWindow(p.view), future, sayOf: T.sayOf, heard: heardLine(cyc) });
        if (colOn) drawColumn(g, A.column, T.shape, T.bar, P, { future });
      }
    }
    // the card: bottom left of the stage, or of the whole picture when the stage is hidden
    // (above the timeline when it runs along the bottom)
    const below = A.timeline && A.timeline.a > .5 && !A.timeline.float && A.timeline.y < Q.h ? A.timeline.y : Q.h;
    drawCard(coFree && A.over.a > .5 ? coFree : A.stage.a > .5 ? A.stage : { x: 0, y: 0, w: Q.w, h: below }, P, getInfo(cyc) || {}, now, 'always', card);
  }
  function drawLive(target) {
    if (!live) {
      live = { q: LIVE_Q, preset: presetOf(store.get(LIVE_KEY, null)), from: null, t0: -10, cardFrom: 1, drawnAt: 0, frames: 0 };
      live.cardFrom = live.preset.card ? 1 : 0;
      if (!job) visuals.setTarget(LIVE_Q);
    }
    if (target.width !== LIVE_Q.w || target.height !== LIVE_Q.h) { target.width = LIVE_Q.w; target.height = LIVE_Q.h; }
    const now = nowS(), S = liveState(live, now, LIVE_Q), keep = g;
    g = target.getContext('2d');
    try { paintLive(S.A, LIVE_Q, lastCyc, lastPlaying, now, S.card, live.preset); }
    finally { g = keep; }
    live.drawnAt = now; live.frames++;
  }
  // a preset, small, into a canvas (the control room's Preview), or the picture on air when preset is null
  function drawLivePreview(target, preset) {
    const Q = { w: target.width, h: target.height }, now = nowS(), keep = g;
    let A, card, shown = preset || (live && live.preset);
    if (preset) { const p = presetOf(preset); A = liveAreas(p.view, Q.w, Q.h, coOf()); card = p.card ? 1 : 0; }
    else if (live) ({ A, card } = liveState(live, now, Q));
    else { A = liveAreas('visual', Q.w, Q.h); card = 1; }
    g = target.getContext('2d');
    try { paintLive(A, Q, lastCyc, lastPlaying, now, card, shown); }
    finally { g = keep; }
  }
  // the preset on air changes: a transition from the picture of now
  function setLivePreset(p) {
    p = presetOf(p); store.set(LIVE_KEY, p);
    if (!live) return p;
    const now = nowS(), S = liveState(live, now, LIVE_Q);
    live.from = S.A; live.cardFrom = S.card; live.preset = p; live.t0 = now;
    return p;
  }
  // the broadcast window stopped drawing (closed, or the app reloaded under it): the stage goes back to its size
  function liveIdle() {
    if (live && nowS() - live.drawnAt > 2) { live = null; if (!job) visuals.setTarget(null); }
  }
  // the page's stage mode (code-over-visual D2): the code over the stage, drawn into the overlay canvas (device pixels,
  // dpr: the font is never smaller than 13 CSS pixels on the page's short stage)
  function stageOver(target, cyc, dpr = 1) {
    const W = target.width, H = target.height, keep = g, X = getCodeOver(cyc) || {}, S = codeOverSettings(X.S), C = codeOverAreas(W, H, S);
    C.code.fs = Math.max(C.code.fs, Math.round(13 * dpr));
    // below the stage's readout (three short lines at the top left)
    const top = Math.round(60 * dpr); if (C.code.y < top) { C.code.h -= top - C.code.y; C.code.y = top; }
    g = target.getContext('2d');
    try { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); return drawOver(C.code, palette(), performance.now() / 1000, cyc); }
    finally { g = keep; }
  }
  // the side of the stage away from the code while a video or the live picture draws the code over it (D7):
  // 'left' | 'right' (the free side), 'none' (code across the whole width), or null
  function overSide() {
    const S = () => codeOverSettings((getCodeOver(lastCyc) || {}).S), free = s => (s.side === 'whole' ? 'none' : s.side === 'right' ? 'left' : 'right');
    if (job && job.layout === 'code-over') return free(S());
    if (live && live.preset && live.preset.view === 'code-over') return free(S());
    return null;
  }
  return {
    start, end, askTab, frame, opts, setOpt, stageOver, overSide,
    // a frame of a fragment (#57), and the settings' preview of one
    composeVertical,
    previewVertical(el, opts, section = null) { vPrev = el ? { el, opts, section } : null; },
    // the live picture (#52)
    live: {
      draw: drawLive, preview: drawLivePreview, setPreset: setLivePreset,
      get preset() { return live ? live.preset : presetOf(store.get(LIVE_KEY, null)); },
      get on() { return !!live; }, get frames() { return live ? live.frames : 0; },
    },
    // the settings' live preview: a canvas element, or null
    preview(el) { previewEl = el; },
    previewOver(el) { coPrev = el; },
    // a frame of the fast video (#53): the layout's frame at cycle cyc and time now (seconds), into the canvas
    composeAt(J, cyc, now) { if (cv.width !== J.q.w || cv.height !== J.q.h) { cv.width = J.q.w; cv.height = J.q.h; } cardKey = cardKey || ''; lastCyc = cyc; return compose(J, cyc, true, now); },
    pause() { if (job && !job.pauseAt) job.pauseAt = performance.now(); },
    resume() { if (job && job.pauseAt) { job.paused += performance.now() - job.pauseAt; job.pauseAt = null; } },
    get on() { return !!job; },
    // for checks: the frame canvas and the layout
    get canvas() { return cv; }, get layout() { return job ? job.layout : null },
  };
}
