// The Soul display (#46, phase 2): a hidden display in a bay beside the visual stage. A small screw in the stage's
// corner (three clicks) or typing "soul" opens it: the stage shrinks, the bay slides in, its doors open, the display
// comes out and switches on. The display carries its own controls (power, full screen, previous and next view, lock,
// override); a selector on the bay's bottom edge changes the shell; override runs a SCART cable to the stage and the
// stage shows the soul. Power off plays everything backwards and screws the screw back in.
import { SHELLS, SHELL_IDS, DEFAULT_SHELL, ensureDefs, shellSvg, DETAIL_ANIM } from './shells.js';
import { createCable } from './cable.js';
import { VIEWS, VIEW_NAMES } from './data.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const eio = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eout = k => 1 - Math.pow(1 - k, 3);
const back = k => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const lin = k => k;
const BYID = Object.fromEntries(SHELLS.map(s => [s.id, s]));
const BOOT = {
  A: ['MISK/OS 6000  ·  INTERFACE 2037', 'MEMORY CHECK ......... 640K OK', 'SOUL CORE ............ ONLINE', '> READING SOUL_'],
  B: ['MISK UNIFIED OS  MOD. 59', '> TUBE ............. WARM', '> SIGNAL ........... WEAK', '> TUNING IN_'],
  C: ['WRIST-LINK MODEL 59', 'LINK ......... OK', 'SOUL SCAN .... READY', '> _'],
};
// the question on the screen when the display switches on: a few variants of each line
const PROMPT = {
  head: ['MISK LABS · EXPERIMENTAL MK-01', 'MISK LABS · PROTOTYPE MK-01', 'MISK LABS · UNIT MK-01 · NOT FOR SALE'],
  name: ['SONG SOUL ANALYZER'],
  warn: ['WARNING: MAY REVEAL WHAT THE SONG REALLY IS', 'CAUTION: SOULS DO NOT ALWAYS WANT TO BE SEEN', 'UNSTABLE PROTOTYPE · DO NOT STARE TOO LONG', 'SIDE EFFECTS MAY INCLUDE GOOSEBUMPS', 'THE SONG WILL KNOW YOU LOOKED'],
  ask: ['ANALYZE NOW?', 'PROCEED?', 'OPEN THE SOUL?', 'LOOK INSIDE?', 'BEGIN THE READING?'],
  no: ['SOUL LEFT ALONE.', 'MAYBE ANOTHER TIME.', 'THE SONG KEEPS ITS SECRET.', 'STANDING DOWN.'],
};
const pickOf = list => list[Math.floor(Math.random() * list.length)];
const MONO = { neon: 'grayscale(1) sepia(1) hue-rotate(62deg) saturate(3.2) brightness(.95)', hw: 'grayscale(1) sepia(1) saturate(2.6) brightness(1.05)' };

// stagewrap: the stage element; row: its parent (the bay and the sockets go there); scene: the soul scene;
// getCyc(): cycle now; isPlaying(); onOverride(on): the stage must show the soul (or not)
export function createSoulDisplay({ stagewrap, row, scene, store, isHw, getCyc, isPlaying, onOverride, onOpen = () => {} }) {
  ensureDefs();
  // ---------- markup ----------
  const screw = document.createElement('button');
  screw.className = 'soul-screw'; screw.type = 'button'; screw.setAttribute('aria-label', 'screw');
  screw.innerHTML = '<svg viewBox="-6 -6 12 12" aria-hidden="true"><circle r="5.6" fill="rgba(0,0,0,.6)" transform="translate(.4,.8)"/><circle r="5.2" fill="url(#sd-chrome)"/><g class="slot"><line x1="-3.6" y1="0" x2="3.6" y2="0" stroke="rgba(0,0,0,.7)" stroke-width="1.2"/></g></svg>';
  stagewrap.appendChild(screw);
  // the tab that peeks out of the stage's edge once the screw is out
  const tab = document.createElement('div');
  tab.className = 'soul-tab'; tab.hidden = true;
  tab.innerHTML = '<i class="st-screw"></i><i class="st-screw r"></i><b>SONG SOUL ANALYZER</b><small>EXPERIMENTAL · MK-01</small><button type="button" class="st-open"><i></i>OPEN</button>';
  stagewrap.appendChild(tab);
  const bay = document.createElement('div');
  bay.className = 'soulbay'; bay.hidden = true;
  bay.innerHTML = `<div class="sb-rim"></div><div class="sb-well"><div class="sb-mount"></div><div class="sb-lamp"></div><div class="sb-dark"></div><div class="sb-door top"></div><div class="sb-door bot"></div></div><div class="sb-sel"></div>`;
  row.appendChild(bay);
  const sockIn = document.createElement('div'), sockOut = document.createElement('div');
  sockIn.className = 'soul-sock in'; sockOut.className = 'soul-sock out';
  sockIn.innerHTML = '<i></i><span>SOUL IN</span>'; sockOut.innerHTML = '<i></i><span>OUT</span>';
  row.append(sockIn, sockOut);
  const $ = s => bay.querySelector(s);
  const mount = $('.sb-mount'), sel = $('.sb-sel');

  // ---------- animated values ----------
  const A = {};
  const t = () => performance.now() / 1000;
  const val = n => { const a = A[n]; if (!a) return 0; const k = clamp((t() - a.at) / a.dur); return a.from + (a.to - a.from) * a.ease(k); };
  const go = (n, to, at, dur, ease = eio) => { A[n] = { from: val(n), to, at, dur, ease }; run(); };
  const later = (fn, s) => setTimeout(fn, s * 1000);
  const phase = n => { const a = A[n]; return a ? { to: a.to, k: clamp((t() - a.at) / a.dur), at: a.at, dur: a.dur } : { to: 0, k: 1 }; };

  // ---------- state ----------
  const ui = () => (isHw() ? 'hw' : 'neon');
  let open = false, busy = false, override = false, turns = 0, osd = null, tabOut = false, tabTimer = 0;
  // the screen's mode: 'prompt' (the question), 'bye' (the answer was no), 'soul'
  let mode = 'soul', ask = null, answer = 0, askAt = 0, optRects = [];
  let shell = store.get('coding-misk-soul-shell', '') || DEFAULT_SHELL[ui()];
  if (!BYID[shell]) shell = DEFAULT_SHELL[ui()];
  let shown = null, panel = null, screen = null, raf = 0, lastFrame = 0, lastScale = 0;
  const cable = createCable({ isHw, getEnds: () => { if (!open || sockIn.style.opacity === '0') return null; const a = sockOut.getBoundingClientRect(), b = sockIn.getBoundingClientRect(); return { out: { x: a.left + a.width / 2, y: a.bottom }, in: { x: b.left + b.width / 2, y: b.bottom } }; } });

  function mountShell(id) {
    shown = id;
    const sh = BYID[id], [x, y, w, h, r] = sh.screen;
    mount.innerHTML = `<div class="sb-display"><div class="sb-panel"><svg viewBox="0 0 500 420" preserveAspectRatio="xMidYMid meet">${shellSvg(id)}</svg>
      <div class="sb-scr ${sh.glass}" style="left:${x / 5}%;top:${y / 4.2}%;width:${w / 5}%;height:${h / 4.2}%"><canvas></canvas><div class="scan"></div><div class="glass"></div></div></div></div>`;
    lastScale = 0;
    panel = mount.querySelector('.sb-panel'); screen = mount.querySelector('canvas');
    screen.style.filter = sh.mono ? MONO[ui()] : 'none';
    panel.querySelectorAll('[data-act]').forEach(el => { el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', el.dataset.act); });
  }

  // ---------- layout: sizes from the stage, stage and bay moved by the animated values ----------
  const phone = () => matchMedia('(max-width: 760px)').matches;
  function layout() {
    const shrink = val('shrink'), doors = val('doors'), out = val('out');
    const rowW = row.clientWidth;
    if (!stagewrap.dataset.closedH) stagewrap.dataset.closedH = stagewrap.getBoundingClientRect().height;
    const h0 = +stagewrap.dataset.closedH, h1 = phone() ? h0 : Math.min(Math.max(h0, innerHeight * .56), 540);
    const bayH = phone() ? Math.round((rowW - 8) * 470 / 540) : h1, bayW = phone() ? rowW : Math.round((bayH - 62) * 500 / 420 + 28), gap = 18;
    if (shrink <= 0.0005 && !open) { stagewrap.style.width = ''; stagewrap.style.height = ''; bay.hidden = true; row.style.minHeight = ''; sockIn.style.opacity = '0'; sockOut.style.opacity = '0'; return; }
    bay.hidden = false;
    if (phone()) {
      stagewrap.style.width = ''; stagewrap.style.height = '';
      bay.style.cssText = `position:relative;width:${bayW}px;height:${bayH * shrink}px;margin-top:${12 * shrink}px;opacity:${clamp(shrink * 1.6)};overflow:hidden`;
    } else {
      stagewrap.style.width = `${rowW - (bayW + gap) * shrink}px`; stagewrap.style.height = `${h0 + (h1 - h0) * shrink}px`;
      bay.style.cssText = `position:absolute;right:0;top:${stagewrap.offsetTop}px;width:${bayW}px;height:${h0 + (h1 - h0) * shrink}px;opacity:${clamp(shrink * 1.6)};transform:translateX(${(1 - eout(shrink)) * 120}px)`;
    }
    $('.sb-door.top').style.transform = `translateY(${-doors * 101}%)`; $('.sb-door.bot').style.transform = `translateY(${doors * 101}%)`;
    $('.sb-lamp').style.opacity = val('lamp'); $('.sb-dark').style.opacity = val('dark');
    const disp = mount.querySelector('.sb-display');
    if (disp) {
      // the display takes the well's size (keeping its 500 × 420 shape); only the slide is a transform
      const well = $('.sb-well'), s = Math.min(well.clientWidth / 500, well.clientHeight / 420);
      if (Math.abs(s - lastScale) > .001) { lastScale = s; disp.style.width = `${500 * s}px`; disp.style.height = `${420 * s}px`; const scr = mount.querySelector('.sb-scr'); if (scr) scr.style.borderRadius = `${BYID[shown].screen[4] * s}px`; }
      disp.style.transform = `translate3d(0, ${24 * (1 - out)}px, ${-520 * (1 - out)}px) rotateX(${(1 - out) * 8}deg)`;
      disp.style.filter = `brightness(${.25 + .75 * clamp(out)})`; disp.style.visibility = doors > .05 || out > .01 ? 'visible' : 'hidden';
    }
    // the sockets come out of the bottom edges
    const so = phone() ? 0 : clamp(shrink * 2 - 1), sb = stagewrap.getBoundingClientRect(), rb = row.getBoundingClientRect(), bb = bay.getBoundingClientRect();
    sockIn.style.cssText = `left:${sb.right - rb.left - 150 - 24}px;top:${sb.bottom - rb.top - 2}px;opacity:${so ? 1 : 0};transform:translateY(${(so - 1) * 12}px)`;
    sockOut.style.cssText = `left:${bb.left - rb.left + 110 - 24}px;top:${bb.bottom - rb.top - 2}px;opacity:${so ? 1 : 0};transform:translateY(${(so - 1) * 12}px)`;
  }

  // ---------- the screw (the hidden way in) ----------
  function drawScrew() {
    const turn = val('screw'), so = val('screwOut');
    screw.querySelector('.slot').setAttribute('transform', `rotate(${turn})`);
    screw.style.transform = so > 0 ? `translate(${so * 10}px, ${so * so * 70}px) rotate(${so * 200}deg) scale(${1 + Math.sin(so * Math.PI) * .4})` : `scale(${1 + Math.min(1, turn / 390) * .25})`;
    screw.style.opacity = String(1 - clamp((so - .6) / .4));
    screw.style.pointerEvents = so > .5 ? 'none' : '';
  }
  screw.addEventListener('click', () => {
    if (open || busy) return;
    turns++;
    go('screw', turns * 130, t(), .3, back);
    if (turns >= 3) reveal();
  });
  function reveal() {
    if (open || busy) return;
    turns = 3; go('screw', 390, t(), .3, back); later(() => go('screwOut', 1, t(), .55, lin), .3);
    later(showTab, .7);
  }
  function showTab() {
    if (open || tabOut) return;
    tabOut = true; tab.hidden = false; go('tab', 1, t(), .55, back);
    // left alone, the tab slides back in and the screw goes back
    clearTimeout(tabTimer); tabTimer = setTimeout(() => hideTab(true), 20000);
  }
  function hideTab(screwBack) {
    if (!tabOut) return;
    tabOut = false; clearTimeout(tabTimer); go('tab', 0, t(), .4);
    later(() => { if (!tabOut) tab.hidden = true; }, .45);
    if (screwBack) { later(() => go('screwOut', 0, t(), .5, eout), .4); later(() => { go('screw', 0, t(), .6); turns = 0; }, .9); }
  }
  tab.querySelector('.st-open').addEventListener('click', () => { hideTab(false); later(powerOn, .3); });
  let typed = '';
  document.addEventListener('keydown', e => {
    const el = e.target;
    if (el.closest && (el.closest('input, textarea, select, [contenteditable="true"], .cm-editor'))) return;
    if (open && mode === 'prompt' && !busy) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); answer = 1 - answer; return; }
      if (e.key === 'Enter') { e.preventDefault(); answerAsk(answer === 0); return; }
      if (e.key === 'y' || e.key === 'Y') return answerAsk(true);
      if (e.key === 'n' || e.key === 'N') return answerAsk(false);
    }
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-4);
    if (typed === 'soul') { typed = ''; reveal(); }
  });

  // ---------- power, shells, override ----------
  function powerOn() {
    if (open) return;
    open = true; busy = true; store.set('coding-misk-soul-found', true);
    stagewrap.dataset.closedH = stagewrap.getBoundingClientRect().height;
    if (shown !== shell) mountShell(shell);
    go('shrink', 1, t(), .8);
    later(() => go('doors', 1, t(), .7, eout), .6); later(() => go('lamp', 1, t(), .25), .55); later(() => go('lamp', 0, t(), .4), 1.25);
    later(() => go('out', 1, t(), .85, back), 1.15);
    later(() => { go('screen', 1, t(), 1, lin); }, 2.0);
    mode = 'prompt'; newAsk(); later(() => { askAt = t(); busy = false; }, 3.0);
    onOpen(true);
  }
  function powerOff() {
    if (!open || busy) return;
    busy = true;
    const d = override ? (setOverride(false), .9) : 0;
    later(() => go('screen', 0, t(), .45, lin), d);
    later(() => go('out', 0, t(), .7), d + .45);
    later(() => go('lamp', 1, t(), .2), d + .9); later(() => go('lamp', 0, t(), .3), d + 1.5);
    later(() => go('doors', 0, t(), .6), d + 1.05);
    later(() => go('shrink', 0, t(), .8), d + 1.6);
    later(() => { open = false; mode = 'soul'; go('screwOut', 0, t(), .5, eout); }, d + 2.4);
    later(() => { go('screw', 0, t(), .6); turns = 0; busy = false; onOpen(false); }, d + 2.9);
  }
  function changeShell(dir) {
    if (!open || busy) return;
    busy = true;
    const i = (SHELL_IDS.indexOf(shell) + dir + SHELL_IDS.length) % SHELL_IDS.length, ov = override;
    shell = SHELL_IDS[i]; store.set('coding-misk-soul-shell', shell); pressed = { k: dir > 0 ? 'next' : 'prev', at: t() };
    if (ov) setOverride(false, true);
    go('screen', 0, t() + .15, .4, lin);
    later(() => go('out', 0, t(), .6), .55); later(() => go('dark', 1, t(), .3), .8);
    later(() => mountShell(shell), 1.15);
    later(() => { go('dark', 0, t(), .45); go('out', 1, t(), .75, back); }, 1.45);
    later(() => go('screen', 1, t(), 1, lin), 2.2);
    later(() => { if (mode === 'soul') scene.analyze(); else askAt = t(); busy = false; if (ov) setOverride(true); }, 3.2);
  }
  function setOverride(on, quiet = false) {
    if (on === override) return;
    override = on;
    osd = { txt: on ? 'INPUT  ▸  STAGE' : 'INPUT  ▸  DISPLAY', at: t() };
    if (on && !phone()) cable.plugIn(() => { onOverride(true); scene.recalibrate(); });
    else if (on) { onOverride(true); scene.recalibrate(); }
    else { onOverride(false); cable.unplug(); }
  }
  function newAsk() { ask = { head: pickOf(PROMPT.head), name: pickOf(PROMPT.name), warn: pickOf(PROMPT.warn), ask: pickOf(PROMPT.ask), no: pickOf(PROMPT.no) }; answer = 0; }
  // the answer to the question: yes reads the soul, no closes the display
  function answerAsk(yes) {
    if (mode !== 'prompt' || busy) return;
    if (!scene.data) { powerOff(); return; }
    if (yes) { mode = 'soul'; scene.analyze(); return; }
    mode = 'bye'; askAt = t(); busy = true; later(() => { busy = false; powerOff(); }, 1.6);
  }
  function act(a) {
    if (a === 'power') return open ? powerOff() : powerOn();
    if (!open || busy) return;
    if (mode === 'prompt') { if (a === 'prev' || a === 'next') answer = 1 - answer; return; }
    if (a === 'override') setOverride(!override);
    else if (a === 'next' || a === 'prev') { a === 'next' ? scene.next() : scene.prev(); viewTurn += a === 'next' ? 1 : -1; osd = { txt: `VIEW ${VIEWS.indexOf(scene.view) + 1}/10  ${VIEW_NAMES[scene.view].toUpperCase()}`, at: t() }; }
    else if (a === 'lock') { scene.locked = !scene.locked; osd = { txt: scene.locked ? 'HOLD  ON' : 'HOLD  OFF', at: t() }; }
    else if (a === 'fs') { const s = mount.querySelector('.sb-scr'); if (s && s.requestFullscreen) s.requestFullscreen().catch(() => {}); }
  }
  let viewTurn = 0, pressed = null;
  bay.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (a) return act(a.dataset.act);
    const scr = e.target.closest('.sb-scr');
    if (scr && mode === 'prompt' && screen) {
      // the click in the question's own coordinates (1200 × 760, fitted into the screen)
      const r = screen.getBoundingClientRect(), s = Math.min(r.width / 1200, r.height / 760), x = (e.clientX - r.left - (r.width - 1200 * s) / 2) / s, y = (e.clientY - r.top - (r.height - 760 * s) / 2) / s;
      const hit = optRects.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
      if (hit) { answer = hit.i; answerAsk(hit.yes); }
      return;
    }
    const s = e.target.closest('[data-sel]'); if (s) changeShell(s.dataset.sel === 'next' ? 1 : -1);
  });
  bay.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && (e.target.dataset.act || e.target.dataset.sel)) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });

  // ---------- the panel's lamps and switches ----------
  function syncPanel() {
    if (!panel) return;
    const on = val('screen') > .5, lock = scene.locked, ov = override;
    panel.querySelectorAll('[data-led]').forEach(g => {
      const k = g.dataset.led, col = g.dataset.col, lit = k === 'power' || k === 'fs' ? on : k === 'lock' ? lock && on : k === 'override' ? ov && on : false;
      if (g.dataset.mode === 'stroke') { g.setAttribute('stroke', lit ? col : 'transparent'); lit ? g.setAttribute('filter', 'url(#sd-glow)') : g.removeAttribute('filter'); return; }
      if (g.dataset.mode === 'tally') { g.querySelector('rect').setAttribute('fill', lit ? col : '#3a0a06'); lit ? g.setAttribute('filter', 'url(#sd-glow)') : g.removeAttribute('filter'); return; }
      const l = g.classList.contains('lit') ? g : g.querySelector('.lit');
      if (l) { l.setAttribute('fill', lit ? col : '#2a221c'); lit ? l.setAttribute('filter', 'url(#sd-glow)') : l.removeAttribute('filter'); }
    });
    panel.querySelectorAll('[data-bat]').forEach(b => { b.dataset.base = b.dataset.base || b.getAttribute('transform'); const up = b.dataset.bat === 'lock' ? lock : ov; b.setAttribute('transform', b.dataset.base + (up ? '' : ' scale(1,-1)')); });
    panel.querySelectorAll('[data-guard]').forEach(g => g.setAttribute('transform', ov ? 'translate(0,352) scale(1,-.28) translate(0,-352)' : ''));
    panel.querySelectorAll('[data-rot]').forEach(g => { g.dataset.base = g.dataset.base || g.getAttribute('transform'); g.setAttribute('transform', `${g.dataset.base} rotate(${g.dataset.rot === 'src' ? (ov ? 60 : -60) : viewTurn * 36})`); });
    const m = panel.querySelector('[data-meter]'); if (m) m.style.opacity = on ? 1 : .15;
    const sh = BYID[shown], tt = t(); if (sh.anim) sh.anim(tt, panel); if (DETAIL_ANIM[shown]) DETAIL_ANIM[shown](tt, panel);
  }

  // ---------- the selector on the bay's bottom edge: two arrow keys, then a small display ----------
  let selKey = '';
  function drawSel() {
    const hw = isHw(), i = SHELL_IDS.indexOf(shell), acc = hw ? '#ffb347' : '#00f0ff', down = k => pressed && pressed.k === k && t() - pressed.at < .15;
    const key = (x, k, glyph) => { const p = down(k) ? 1.6 : 0; return `<g data-sel="${k}" role="button" tabindex="0" aria-label="${k} shell"><rect x="${x}" y="7" width="38" height="24" rx="4" fill="rgba(0,0,0,.6)"/><rect x="${x}" y="${5 + p}" width="38" height="24" rx="4" fill="${hw ? '#3c3c42' : '#1d1028'}" stroke="${hw ? '#0d0d10' : '#3a1850'}"/><rect x="${x + 1}" y="${6 + p}" width="36" height="8" rx="3" fill="rgba(255,255,255,.08)"/><text x="${x + 19}" y="${22 + p}" text-anchor="middle" font-family="Share Tech Mono" font-size="13" fill="${down(k) ? acc : hw ? '#d8d4c8' : '#c9b8e8'}">${glyph}</text></g>`; };
    const k = `${hw}:${i}:${down('prev')}:${down('next')}`;
    if (k === selKey) return;
    selKey = k;
    let s = `<text x="6" y="22" font-family="Share Tech Mono" font-size="10" letter-spacing="3" fill="${hw ? '#a29f97' : '#8a76b0'}">SHELL</text>`;
    s += key(60, 'prev', '◀') + key(102, 'next', '▶');
    s += `<rect x="150" y="4" width="226" height="26" rx="3" fill="${hw ? '#1b1306' : '#020a0c'}" stroke="${hw ? '#000' : '#123'}"/><rect x="150" y="4" width="226" height="26" rx="3" fill="none" stroke="url(#sd-edgeIn)"/>`;
    s += `<text x="160" y="25" font-family="VT323" font-size="24" fill="${acc}" ${hw ? '' : 'filter="url(#sd-glow)"'}>${String(i + 1).padStart(2, '0')}</text><text x="188" y="23" font-family="VT323" font-size="17" fill="${acc}" opacity=".9">${BYID[shell].name.toUpperCase()}</text>`;
    SHELL_IDS.forEach((_, j) => { s += `<circle cx="${396 + j * 16}" cy="17" r="4" fill="${j === i ? acc : hw ? '#2a221c' : '#1d1028'}" stroke="rgba(0,0,0,.6)" ${j === i && !hw ? 'filter="url(#sd-glow)"' : ''}/>`; });
    sel.innerHTML = `<svg viewBox="0 0 512 34" preserveAspectRatio="xMinYMid meet">${s}</svg>`;
  }

  // ---------- the screen: the soul with power on and off effects ----------
  function drawScreen() {
    if (!screen) return;
    const P = phase('screen'), on = val('screen');
    const r = screen.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * d), h = Math.round(r.height * d); if (!w || !h) return;
    if (screen.width !== w || screen.height !== h) { screen.width = w; screen.height = h; }
    const c = screen.getContext('2d'), sh = BYID[shown];
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; c.fillStyle = '#020302'; c.fillRect(0, 0, w, h);
    if (P.to === 0 && P.k >= 1) return;
    const src = mode === 'soul' ? scene.frame(getCyc(), isPlaying(), Math.min(w / 1200, h / 760)) : promptFrame(Math.min(w / 1200, h / 760));
    const fit = (alpha = 1, sy = 1, bright = 1) => { const s = Math.min(w / src.width, h / src.height), dw = src.width * s, dh = src.height * s * sy; c.save(); c.globalAlpha = alpha; if (bright !== 1) c.filter = `brightness(${bright})`; c.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); c.restore(); };
    const phos = sh.mono ? (isHw() ? '#ffb347' : '#7dff8a') : isHw() ? '#ffb347' : '#b8ffcb';
    if (P.to === 1 && P.k < 1) {
      const k = P.k;
      if (sh.glass === 'flat') { fit(clamp(k / .6)); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(0, h * clamp(k / .7), w, 3 * d); }
      else if (k < .12) { c.fillStyle = '#fff'; c.shadowBlur = 16 * d; c.shadowColor = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, 2 * d + k / .12 * 4 * d, 0, 6.283); c.fill(); c.shadowBlur = 0; }
      else if (k < .28) { const lw = w * eout((k - .12) / .16); c.fillStyle = '#fff'; c.shadowBlur = 18 * d; c.shadowColor = '#fff'; c.fillRect((w - lw) / 2, h / 2 - 1.5 * d, lw, 3 * d); c.shadowBlur = 0; }
      else if (k < .42) { const sy = eout((k - .28) / .14); fit(1, Math.max(.01, sy), 2.4 - sy * 1.2); }
      else {
        fit(clamp((k - .42) / .2), 1, 1 + (1 - k) * .6);
        const L = BOOT[shown];
        if (L) { const n = Math.floor(clamp((k - .3) / .5) * (L.length + 1)), a = 1 - clamp((k - .82) / .18); c.fillStyle = `rgba(0,0,0,${.85 * a})`; c.fillRect(0, 0, w, h); c.font = `${Math.round(h / 12)}px VT323, monospace`; c.fillStyle = phos; c.globalAlpha = a; L.slice(0, n).forEach((l, j) => c.fillText(l, w * .07, h * .18 + j * h / 9)); c.globalAlpha = 1; }
      }
    } else if (P.to === 0 && P.k < 1) {
      const k = P.k;
      if (k < .55) { const sy = 1 - eio(k / .55); fit(1, Math.max(.008, sy), 1 + k * 2.6); }
      else { const kk = (k - .55) / .45, lw = w * (1 - eout(kk)); c.fillStyle = `rgba(255,255,255,${1 - kk * .6})`; c.fillRect((w - lw) / 2, h / 2 - 1.5 * d, Math.max(3 * d, lw), 3 * d); }
    } else fit();
    if (shown === 'E' && on > .9 && osd && t() - osd.at < 1.6) { c.font = `bold ${Math.round(h / 12)}px "Share Tech Mono", monospace`; c.textAlign = 'right'; c.fillStyle = '#5dff5d'; c.strokeStyle = '#000'; c.lineWidth = 3 * d; c.strokeText(osd.txt, w * .95, h * .14); c.fillText(osd.txt, w * .95, h * .14); c.textAlign = 'left'; }
  }

  // ---------- the question, drawn like the soul (1200 × 760) so the power effects work the same ----------
  const pc = document.createElement('canvas'), pg = pc.getContext('2d');
  function promptFrame(scale) {
    scene.frame(getCyc(), isPlaying(), .1); // keeps following the song, to know whether one plays
    const k = Math.max(.5, Math.min(1.25, scale));
    if (pc.width !== Math.round(1200 * k)) { pc.width = Math.round(1200 * k); pc.height = Math.round(760 * k); }
    pg.setTransform(k, 0, 0, k, 0, 0);
    const sh = BYID[shown], phos = sh && sh.mono ? (isHw() ? '#ffb347' : '#7dff8a') : isHw() ? '#ffb347' : '#b8ffcb', dim = isHw() ? '#b0702a' : '#3fae66';
    const g = pg, el = t() - askAt;
    g.fillStyle = '#020403'; g.fillRect(0, 0, 1200, 760);
    g.shadowColor = phos; g.textBaseline = 'alphabetic';
    const type = (txt, x, y, size, from, col = phos) => { const n = Math.max(0, Math.min(txt.length, Math.floor((el - from) * 38))); g.font = `${size}px VT323, monospace`; g.fillStyle = col; g.shadowBlur = 10; g.fillText(txt.slice(0, n), x, y); g.shadowBlur = 0; return from + txt.length / 38; };
    optRects = [];
    if (mode === 'bye') { type(ask.no, 120, 400, 58, 0); return pc; }
    const song = !!scene.data;
    let at = 0;
    at = type(ask.head, 120, 190, 34, at, dim) + .1;
    at = type(ask.name, 120, 270, 78, at) + .2;
    if (!song) { at = type('NO SIGNAL · PLAY A SONG FIRST', 120, 380, 40, at) + .2; }
    else { at = type(ask.warn, 120, 380, 34, at) + .3; at = type(ask.ask, 120, 480, 64, at) + .2; }
    if (el > at) {
      const opts = song ? [['YES', true], ['NO', false]] : [['OK', false]], blink = Math.floor(el * 2.4) % 2;
      opts.forEach(([label, yes], i) => {
        const x = 120 + i * 240, y = 560, w = 200, h = 84, sel = song ? answer === i : true;
        g.strokeStyle = phos; g.lineWidth = 3; g.shadowBlur = sel ? 14 : 0; g.strokeRect(x, y, w, h);
        if (sel) { g.fillStyle = phos; g.globalAlpha = blink ? 1 : .85; g.fillRect(x + 6, y + 6, w - 12, h - 12); g.globalAlpha = 1; }
        g.shadowBlur = 0; g.font = '60px VT323, monospace'; g.fillStyle = sel ? '#020403' : phos; g.textAlign = 'center'; g.fillText(label, x + w / 2, y + 62); g.textAlign = 'left';
        optRects.push({ x, y, w, h, yes, i });
      });
      g.font = '24px VT323, monospace'; g.fillStyle = dim; g.fillText(song ? '◀ ▶ TO CHOOSE · ENTER TO CONFIRM' : 'ENTER TO CLOSE', 120, 690);
    } else if (Math.floor(el * 3) % 2) { g.fillStyle = phos; g.fillRect(120, 520, 22, 6); }
    // CRT lines over the question
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < 760; y += 3) g.fillRect(0, y, 1200, 1);
    return pc;
  }

  // ---------- frame loop (only while the bay is open or moving) ----------
  function frame() {
    raf = 0;
    const tt = t();
    layout(); drawScrew();
    if (!tab.hidden) { const k = val('tab'); tab.style.transform = `translateX(${(1 - k) * 110}%)`; tab.style.opacity = String(clamp(k * 3)); }
    const moving = Object.values(A).some(a => tt < a.at + a.dur + .05);
    if (open || moving || tabOut) {
      if (!bay.hidden && tt - lastFrame > 1 / 30) { lastFrame = tt; syncPanel(); drawScreen(); drawSel(); }
      raf = requestAnimationFrame(frame);
    }
  }
  function run() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('resize', () => { if (open) { delete stagewrap.dataset.closedH; run(); } });
  // the theme changes the monochrome tint and the default shell (until the listener picks one)
  function themeChanged() {
    if (!store.get('coding-misk-soul-shell', '') && !open) shell = DEFAULT_SHELL[ui()];
    if (screen && BYID[shown]) screen.style.filter = BYID[shown].mono ? MONO[ui()] : 'none';
    selKey = ''; run();
  }
  drawScrew();
  return {
    get open() { return open; }, get override() { return override; }, get shell() { return shell; },
    reveal, powerOff, act, changeShell, themeChanged, cable, answer: yes => answerAsk(yes),
    get mode() { return mode; }, get tabOut() { return tabOut; },
  };
}
