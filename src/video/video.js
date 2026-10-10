// Video recorder (#27): a frame drawn by the app at a fixed size (the stage, the code typing itself, the soul panel,
// a title card) recorded together with the master audio; or the whole browser tab, captured as it is.
// The frame is drawn after each stage frame, so it follows the music exactly as the stage does.
import { QUALITIES, VIDEO_DEFAULTS, LAYOUTS, CARDS, layoutAreas, pickMime, extOf, cardAlpha } from './layout.js';

const KEY = 'coding-misk-video';

// visuals: { setTarget, canvas } from startVisuals; getCode(): the code in the editor; getInfo(cyc): what plays;
// getSay(): the voice line on the stage; getSoul(): { canvas } of the soul screen when the soul is on, else null
export function createVideo({ visuals, getCode, getInfo, getSay, getSoul, store, t, esc }) {
  const opts = () => { const o = { ...VIDEO_DEFAULTS, ...(store.get(KEY, {}) || {}) }; if (!LAYOUTS.includes(o.layout)) o.layout = VIDEO_DEFAULTS.layout; if (!QUALITIES[o.quality]) o.quality = VIDEO_DEFAULTS.quality; if (!CARDS.includes(o.card)) o.card = VIDEO_DEFAULTS.card; return o; };
  const setOpt = (k, v) => store.set(KEY, { ...opts(), [k]: v });
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  let job = null;

  // ---------- the bar shown while a video records: preview, time, soul panel, stop and cancel ----------
  const bar = document.createElement('div');
  bar.className = 'video-bar'; bar.hidden = true; bar.setAttribute('role', 'status');
  document.body.appendChild(bar);
  const preview = document.createElement('canvas'); preview.className = 'video-prev'; preview.width = 192; preview.height = 108;
  function renderBar() {
    if (!job) { bar.hidden = true; return; }
    bar.hidden = job.layout === 'tab';
    const o = opts(), soulBtn = job.layout === 'code' && getSoul() ? `<button class="chip" data-vid="soul" aria-pressed="${o.soulPanel}">${esc(t(o.soulPanel ? 'vidSoulFold' : 'vidSoulOpen'))}</button>` : '';
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
    const cs = getComputedStyle(document.documentElement), v = k => cs.getPropertyValue(k).trim();
    coloursAt = performance.now();
    return (colours = { bg: v('--bg') || '#0d0818', panel: v('--panel') || '#160f26', line: v('--line') || '#3a2a5c', ink: v('--ink') || '#f3ecff', muted: v('--muted') || '#a597c7', a1: v('--a1') || '#ff4fa3', a2: v('--a2') || '#ffb347' });
  }
  // the code: one colour per token kind, the last edit kept in view, a caret where it is typed
  let code = '', lastEdit = 0, scroll = 0, editAt = -10;
  function tokens(line, P) {
    const out = []; let i = 0;
    while (i < line.length) {
      const rest = line.slice(i);
      let m;
      if (rest.startsWith('//')) { out.push([rest, P.muted]); break; }
      if ((m = /^(["'`])(?:\\.|(?!\1).)*\1?/.exec(rest))) { out.push([m[0], P.a2]); i += m[0].length; continue; }
      if ((m = /^\d+(\.\d+)?/.exec(rest))) { out.push([m[0], P.a1]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) { const fn = line[i + m[0].length] === '('; out.push([m[0], fn ? P.a1 : /^(const|let|var|return|function|await|true|false|null|new|if|else|for)$/.test(m[0]) ? P.a2 : P.ink]); i += m[0].length; continue; }
      out.push([line[i], P.muted]); i++;
    }
    return out;
  }
  function drawCode(A, P, now, frameH) {
    const src = getCode() || '';
    if (src !== code) {
      let i = 0; while (i < src.length && i < code.length && src[i] === code[i]) i++;
      lastEdit = i; code = src; editAt = now;
    }
    const fs = Math.round(frameH / 50), lh = Math.round(fs * 1.4), padX = Math.round(fs * 1.1), head = Math.round(fs * 2.4);
    g.save();
    g.fillStyle = P.panel; g.strokeStyle = P.line; g.lineWidth = 2;
    g.beginPath(); g.roundRect(A.x, A.y, A.w, A.h, 10); g.fill(); g.stroke();
    g.fillStyle = P.muted; g.font = `600 ${Math.round(fs * .8)}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
    g.fillText('CODE · STRUDEL', A.x + padX, A.y + head / 2);
    g.beginPath(); g.rect(A.x + 2, A.y + head, A.w - 4, A.h - head - 2); g.clip();
    g.font = `500 ${fs}px "JetBrains Mono", monospace`; g.textBaseline = 'alphabetic';
    // long lines wrap: rows of at most cols characters, continuation rows indented
    const cw = g.measureText('M').width, cols = Math.max(20, Math.floor((A.w - padX * 2) / cw)), ind = 2;
    const rows = [];
    let pos = 0, caret = null;
    for (const ln of code.split('\n')) {
      let i = 0;
      do {
        const first = i === 0;
        let len = first ? cols : cols - ind;
        // break after a space or a comma when there is one in the second half of the row
        if (i + len < ln.length) { const cut = Math.max(ln.lastIndexOf(' ', i + len - 1), ln.lastIndexOf(',', i + len - 1)) + 1; if (cut > i + len * .5) len = cut - i; }
        const part = ln.slice(i, i + len);
        if (caret === null && lastEdit >= pos + i && (lastEdit <= pos + i + part.length)) caret = { row: rows.length, col: (first ? 0 : ind) + lastEdit - pos - i };
        rows.push({ line: ln, from: i, text: part, indent: first ? 0 : ind });
        i += len;
      } while (i < ln.length);
      pos += ln.length + 1;
    }
    if (!caret) caret = { row: rows.length - 1, col: 0 };
    const fit = Math.floor((A.h - head) / lh);
    // the row being edited sits in the upper third, when the code is longer than the panel
    const want = Math.max(0, Math.min(rows.length - fit, caret.row - Math.floor(fit / 3)));
    scroll += (want - scroll) * .12;
    const y0 = A.y + head + lh * .8 - scroll * lh;
    rows.forEach((r, k) => {
      const y = y0 + k * lh; if (y < A.y + head - lh || y > A.y + A.h + lh) return;
      // colours come from the whole line, so a string or comment cut by the wrap keeps its colour
      let x = A.x + padX + r.indent * cw, c = 0;
      for (const [txt, col] of tokens(r.line, P)) {
        const a = Math.max(c, r.from), b = Math.min(c + txt.length, r.from + r.text.length);
        if (b > a) { g.fillStyle = col; g.fillText(txt.slice(a - c, b - c), x, y); x += cw * (b - a); }
        c += txt.length;
      }
    });
    // caret after the last edit, blinking once typing stops
    if (now - editAt < 1.2 || Math.floor(now * 2) % 2) {
      g.fillStyle = P.a1; g.fillRect(A.x + padX + caret.col * cw, y0 + caret.row * lh - fs * .85, Math.max(2, fs * .12), fs * 1.05);
    }
    g.restore();
  }
  function drawSoul(A, P, open, soulCanvas) {
    g.save();
    g.fillStyle = P.panel; g.strokeStyle = P.line; g.lineWidth = 2;
    g.beginPath(); g.roundRect(A.x, A.y, A.w, A.h, 10); g.fill(); g.stroke();
    const fs = Math.round(A.head * .42);
    g.fillStyle = P.muted; g.font = `600 ${fs}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
    g.fillText(`SOUL ANALYZER ${open ? '▾' : '▸'}`, A.x + fs * 1.3, A.y + A.head / 2);
    if (open && soulCanvas) g.drawImage(soulCanvas, A.x + 4, A.y + A.head, A.w - 8, A.h - A.head - 4);
    g.restore();
  }
  // the title card, bottom left of the stage: title, then artist and position
  let cardKey = '', cardT0 = 0;
  function drawCard(S, P, info, now) {
    const key = `${info.title || ''}|${info.artist || ''}|${info.n ?? ''}`;
    if (key !== cardKey) { cardKey = key; cardT0 = now; }
    const a = cardAlpha(opts().card, now, cardT0); if (a <= 0 || !info.title) return;
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
  function drawSay(S) {
    const say = getSay(); if (!say) return;
    const u = S.h / 1080, f = Math.round(44 * u);
    g.save(); g.font = `700 ${f}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = Math.min(S.w - 64 * u, g.measureText(say).width + 40 * u), cx = S.x + S.w / 2, cy = S.y + S.h * .86;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(cx - w / 2, cy - f * .8, w, f * 1.6, 8 * u); g.fill();
    g.fillStyle = palette().a1; g.fillText(say, cx, cy, w - 24 * u); g.restore();
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
  function compose(J, cyc, playing, now) {
    const P = palette(), Q = J.q;
    const soul = J.layout === 'code' ? getSoul() : null, soulMode = soul ? (opts().soulPanel ? 'open' : 'folded') : null;
    const A = layoutAreas(J.layout, Q.w, Q.h, soulMode);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = P.bg; g.fillRect(0, 0, Q.w, Q.h);
    drawStage(A.stage);
    drawSay(A.stage);
    drawCard(A.stage, P, getInfo(cyc) || {}, now);
    if (A.soul) drawSoul(A.soul, P, soulMode === 'open', soulMode === 'open' ? soul.canvas(cyc, playing, (A.soul.w - 8) / 1200) : null);
    if (A.code) drawCode(A.code, P, now, Q.h);
    return !!soul;
  }
  function frame(cyc, playing) {
    if (!job) { drawPreview(cyc, playing); return; }
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
    job = null; visuals.setTarget(null); renderBar();
  }
  return {
    start, end, askTab, frame, opts, setOpt,
    // the settings' live preview: a canvas element, or null
    preview(el) { previewEl = el; },
    pause() { if (job && !job.pauseAt) job.pauseAt = performance.now(); },
    resume() { if (job && job.pauseAt) { job.paused += performance.now() - job.pauseAt; job.pauseAt = null; } },
    get on() { return !!job; },
    // for checks: the frame canvas and the layout
    get canvas() { return cv; }, get layout() { return job ? job.layout : null },
  };
}
