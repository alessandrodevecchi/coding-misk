import { INSTRUMENTS } from './music.js';

// Visual su canvas sincronizzati con l'audio.
// Ogni strumento suona su un analizzatore separato (.analyze("kick"), .analyze("bass"), …):
// da lì ricaviamo un livello 0..1 per strumento e gli attacchi (onset) che accendono la scena.
export function startVisuals({ getS, getSteps, getMode, isPlaying, sched, readout }) {
  const $ = (s, r = document) => r.querySelector(s);
  const cv = $('#stage'), cx = cv.getContext('2d');
  let W = 0, H = 0;
  const resize = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    cx.setTransform(d, 0, 0, d, 0, 0);
  };
  new ResizeObserver(resize).observe(cv); resize();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PAL = {
    tramonto: { sky: ['#12061f', '#3d0f4a', '#a8285f'], floor: '#0c0416', grid: '#ff3fa4', sun: ['#ffe36b', '#ff7a45', '#ff2f8e'], wave: '#fff0f8', echo: '#ffb347' },
    montagne: { sky: ['#030712', '#0c1a3d', '#2a2a6e'], floor: '#040a18', grid: '#4fe3ff', sun: ['#e8f4ff', '#a98bff', '#4fe3ff'], wave: '#e8fbff', echo: '#a98bff' },
    spazio:   { sky: ['#000000', '#07051a', '#140b2e'], floor: '#000', grid: '#a495ff', sun: ['#ffd9f4', '#ff7ad9', '#5b3dff'], wave: '#f2eeff', echo: '#ff7ad9' },
    sonar:    { sky: ['#010806', '#02140e', '#03241a'], floor: '#010806', grid: '#3dffb0', sun: ['#d4ff5a', '#3dffb0', '#0a6b4a'], wave: '#d8ffe9', echo: '#d4ff5a' },
    pixel:    { sky: ['#0d0b26', '#1f1147', '#3d1a6b', '#6e2483', '#b3367f', '#f2607a', '#ffa45c'], sun: ['#fff3a1', '#ffcf4d', '#ff8a3d', '#ff4f7b'],
                far: ['#2a1f5c', '#1d1645'], near: ['#43287a', '#2a1a57'], city: '#0b0918', win: ['#ffd166', '#7cf3ff', '#ff6ec7'],
                ground: '#120a24', grid: '#ff3f9e', road: '#1a1030', dash: '#ffd166', car: '#00e5ff', wave: '#ffffff', echo: '#ffcc33' },
    palco:    { wall: ['#05030b', '#140a26'], a: '#ff2e88', b: '#00e5ff', c: '#ffe14d', metal: '#2a2340', dark: '#0c0817', wave: '#00e5ff', echo: '#ff2e88', label: '#6f5f8f' },
  };
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const STARS = Array.from({ length: 260 }, () => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, z: rnd() }));
  const SKYSTARS = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), r: rnd() }));
  const TOWERS = Array.from({ length: 26 }, (_, i) => ({ x: i / 26 + rnd() * .02, w: .025 + rnd() * .03, h: .12 + rnd() * .3, win: rnd() }));
  const BLDG = Array.from({ length: 22 }, () => ({ w: 6 + Math.floor(rnd() * 12), h: 8 + Math.floor(rnd() * 22), s: rnd() }));
  const noise = x => (Math.sin(x) + .5 * Math.sin(2.3 * x + 1.7) + .25 * Math.sin(5.1 * x + .3)) / 1.75;
  const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- analisi audio ----------
  const N = 256;
  const wave = new Float32Array(N);
  const hookWave = new Float32Array(128);
  const lv = {}, prev = {}, norm = {}, lastOn = {};
  for (const k of INSTRUMENTS) { lv[k] = 0; prev[k] = 0; norm[k] = .05; lastOn[k] = 0; }
  let level = 0, kick = 0, flash = 0, lastStep = -1, lastT = performance.now();
  const echoes = [], blips = [], streaks = [];

  function onset(k) {
    if (k === 'kick') { kick = 1; echoes.push({ r: 0, a: 1 }); if (echoes.length > 12) echoes.shift(); }
    if (k === 'snare') { flash = 1; blips.push({ ang: Math.random() * 6.283, rad: .55 + Math.random() * .2, a: 1, big: true }); }
    if (k === 'hats') blips.push({ ang: Math.random() * 6.283, rad: .75 + Math.random() * .2, a: 1, big: false });
    if (k === 'hook' || k === 'arp') streaks.push({ x: Math.random(), y: Math.random() * .4, a: 1 });
    if (blips.length > 40) blips.shift();
    if (streaks.length > 16) streaks.shift();
  }

  function readAudio(dt, now) {
    const A = window.analysers, fn = window.getAnalyzerData;
    const raw = {};
    wave.fill(0);
    if (isPlaying() && A && typeof fn === 'function') {
      for (const id of Object.keys(A)) {
        let d; try { d = fn('time', id); } catch (e) { continue; }
        if (!d || !d.length) continue;
        const step = Math.floor(d.length / N); let sum = 0;
        for (let i = 0; i < N; i++) { const v = d[i * step] || 0; wave[i] += v; sum += v * v; }
        raw[id] = Math.sqrt(sum / N);
        if (id === 'hook') { const s2 = Math.floor(d.length / 128); for (let i = 0; i < 128; i++) hookWave[i] = d[i * s2] || 0; }
      }
      // codice senza tag per strumento: la cassa si ricava dalle basse frequenze del canale generico
      if (raw.kick === undefined && A[1]) {
        try { const fq = fn('frequency', 1); let e = 0; for (let i = 1; i < 7; i++) e += Math.max(0, (fq[i] + 90) / 70); raw.kick = e / 6 * .3; } catch (e) {}
      }
    }
    let sum = 0; for (let i = 0; i < N; i++) sum += wave[i] * wave[i];
    level = level * .7 + Math.sqrt(sum / N) * 3 * .3;
    for (const k of INSTRUMENTS) {
      const r = raw[k] || 0;
      norm[k] = Math.max(r, norm[k] * Math.pow(.5, dt / 3), .02);
      const v = r < .002 ? 0 : Math.min(1, r / norm[k]);
      if (v > .6 && prev[k] < .45 && now - lastOn[k] > 90) { lastOn[k] = now; onset(k); }
      prev[k] = v;
      lv[k] = Math.max(v, lv[k] * Math.exp(-dt * 6));
    }
  }

  function onStep(step) {
    document.querySelectorAll('.step.now').forEach(b => b.classList.remove('now'));
    if (step >= 0 && getMode() === 'comp') document.querySelectorAll(`.step[data-i="${step}"]`).forEach(b => b.classList.add('now'));
  }

  // ---------- elementi comuni ----------
  function grid(pal, horizon, scroll) {
    cx.fillStyle = pal.floor; cx.fillRect(0, horizon, W, H - horizon);
    cx.strokeStyle = pal.grid; cx.lineWidth = 1;
    for (let k = 0; k < 14; k++) {
      const tt = (k + scroll) / 14, y = horizon + (H - horizon) * Math.pow(tt, 2.4);
      cx.globalAlpha = Math.min(1, tt * 1.6) * .9; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke();
    }
    cx.globalAlpha = .7;
    for (let i = -16; i <= 16; i++) { cx.beginPath(); cx.moveTo(W / 2 + i * W * .02, horizon); cx.lineTo(W / 2 + i * W * .16, H); cx.stroke(); }
    cx.globalAlpha = 1;
  }
  function sky(pal, horizon) {
    const g = cx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, pal.sky[0]); g.addColorStop(.6, pal.sky[1]); g.addColorStop(1, pal.sky[2]);
    cx.fillStyle = g; cx.fillRect(0, 0, W, horizon);
    cx.fillStyle = '#fff';
    for (const s of SKYSTARS) { if (s.y > .85) continue; cx.globalAlpha = .2 + s.r * .5; cx.fillRect(s.x * W, s.y * horizon * .85, s.r * 1.6 + .4, s.r * 1.6 + .4); }
    cx.globalAlpha = 1;
  }
  function waveLine(color, glow, y0, amp, x0 = 0, x1 = W, data = wave) {
    cx.save(); cx.strokeStyle = color; cx.lineWidth = 2; cx.shadowColor = glow; cx.shadowBlur = 14;
    cx.beginPath();
    for (let i = 0; i < data.length; i++) { const x = x0 + i / (data.length - 1) * (x1 - x0), y = y0 + data[i] * amp; i ? cx.lineTo(x, y) : cx.moveTo(x, y); }
    cx.stroke(); cx.restore();
  }
  function waveRing(pal, x0, y0, r, amp) {
    cx.save(); cx.strokeStyle = pal.wave; cx.lineWidth = 1.6; cx.shadowColor = pal.grid; cx.shadowBlur = 12;
    cx.beginPath();
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, rr = r + wave[i % N] * amp; const x = x0 + Math.cos(a) * rr, y = y0 + Math.sin(a) * rr; i ? cx.lineTo(x, y) : cx.moveTo(x, y); }
    cx.closePath(); cx.stroke(); cx.restore();
  }
  function drawEchoes(color, x0, y0, maxR, dt) {
    cx.save(); cx.strokeStyle = color;
    for (const e of echoes) {
      e.r += dt * maxR * 1.4; e.a -= dt * 1.1;
      if (e.a <= 0) continue;
      cx.globalAlpha = e.a * .8; cx.lineWidth = 1 + e.a * 3;
      cx.beginPath(); cx.arc(x0, y0, e.r, 0, Math.PI * 2); cx.stroke();
    }
    cx.restore();
    while (echoes.length && echoes[0].a <= 0) echoes.shift();
  }

  // ---------- pixel art: buffer a bassa risoluzione ingrandito senza smussare ----------
  const pc = document.createElement('canvas'), p = pc.getContext('2d');
  let skyCache = null, skyKey = '';
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function pixelSky(pal, pw, hz) {
    const key = `${pw}x${hz}`;
    if (skyKey === key) return skyCache;
    skyCache = document.createElement('canvas'); skyCache.width = pw; skyCache.height = hz;
    const s = skyCache.getContext('2d'), n = pal.sky.length - 1;
    for (let y = 0; y < hz; y++) {
      const tt = Math.pow(y / hz, 1.3) * n, c0 = Math.floor(tt), fr = tt - c0;
      for (let x = 0; x < pw; x++) {
        s.fillStyle = pal.sky[Math.min(n, BAYER[y % 4][x % 4] / 16 < fr ? c0 + 1 : c0)];
        s.fillRect(x, y, 1, 1);
      }
    }
    skyKey = key;
    return skyCache;
  }
  function tri(ctx, a, b, c, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.fill(); }
  function lowPoly(pw, hz, sd, amp, step, cols, shift, bump) {
    const off = shift % step, base = Math.floor(shift / step);
    for (let i = -1; i <= pw / step + 1; i++) {
      const h0 = (noise((i + base) * .9 + sd) * .5 + .6) * amp * (1 + bump), h1 = (noise((i + base + 1) * .9 + sd) * .5 + .6) * amp * (1 + bump);
      const x0 = Math.round(i * step - off), x1 = Math.round((i + 1) * step - off);
      const a = [x0, hz - Math.round(h0)], b = [x1, hz - Math.round(h1)];
      tri(p, a, b, [x0, hz], cols[0]);
      tri(p, b, [x1, hz], [x0, hz], cols[1]);
    }
  }

  const SCENE_DRAW = {
    tramonto(pal, cyc, dt) {
      const hz = H * .6, sunR = Math.min(W, H) * .3 * (1 + kick * .05);
      sky(pal, hz);
      cx.save(); cx.beginPath(); cx.rect(0, 0, W, hz); cx.clip();
      const sg = cx.createLinearGradient(0, hz - sunR, 0, hz + sunR * .2);
      sg.addColorStop(0, pal.sun[0]); sg.addColorStop(.55, pal.sun[1]); sg.addColorStop(1, pal.sun[2]);
      cx.shadowColor = pal.sun[2]; cx.shadowBlur = 40 + kick * 40;
      cx.fillStyle = sg; cx.beginPath(); cx.arc(W / 2, hz - sunR * .15, sunR, 0, Math.PI * 2); cx.fill();
      cx.shadowBlur = 0; cx.fillStyle = pal.sky[2];
      for (let i = 0; i < 7; i++) { const y = hz - sunR * .15 + i * sunR * .14 - (cyc * 8 % 1) * sunR * .14; cx.fillRect(W / 2 - sunR, y, sunR * 2, 2 + i * 1.6); }
      cx.restore();
      drawEchoes(pal.echo, W / 2, hz - sunR * .15, Math.max(W, H) * .6, dt);
      grid(pal, hz, (cyc * 4) % 1);
      waveLine(pal.wave, pal.grid, hz - 2, H * .3);
    },
    montagne(pal, cyc, dt) {
      const hz = H * .66;
      sky(pal, hz);
      const mx = W * .78, my = H * .2, mr = Math.min(W, H) * .07;
      cx.save(); cx.fillStyle = pal.sun[0]; cx.shadowColor = pal.sun[2]; cx.shadowBlur = 30 + kick * 30; cx.beginPath(); cx.arc(mx, my, mr, 0, Math.PI * 2); cx.fill(); cx.restore();
      drawEchoes(pal.echo, mx, my, Math.max(W, H) * .5, dt);
      [[.22, .35, .05, .35], [.3, .55, .12, .6], [.4, .9, .25, 1]].forEach(([amp, fr, sp, alpha], li) => {
        const pts = [], stepX = W / 48;
        for (let i = 0; i <= 48; i++) {
          const wv = li === 2 ? wave[Math.floor(i / 48 * (N - 1))] * H * .5 : 0;
          const y = hz - (noise(i * fr * .35 + cyc * sp + li * 9) * .5 + .55) * H * amp * (1 + (li === 2 ? lv.bass * .2 : 0)) - Math.abs(wv);
          pts.push([i * stepX, y]);
        }
        cx.beginPath(); cx.moveTo(0, hz); pts.forEach(([x, y]) => cx.lineTo(x, y)); cx.lineTo(W, hz); cx.closePath();
        cx.fillStyle = pal.floor; cx.fill();
        cx.save(); cx.globalAlpha = alpha; cx.strokeStyle = li === 1 ? pal.echo : pal.grid; cx.lineWidth = li === 2 ? 2 : 1.2; cx.shadowColor = pal.grid; cx.shadowBlur = li === 2 ? 10 + kick * 12 : 0;
        cx.beginPath(); pts.forEach(([x, y], i) => i ? cx.lineTo(x, y) : cx.moveTo(x, y)); cx.stroke();
        if (li === 2) { cx.globalAlpha = .25; cx.shadowBlur = 0; pts.forEach(([x, y]) => { cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, hz); cx.stroke(); }); }
        cx.restore();
      });
      grid(pal, hz, (cyc * 4) % 1);
    },
    spazio(pal, cyc, dt) {
      cx.fillStyle = pal.sky[0]; cx.fillRect(0, 0, W, H);
      const ng = cx.createRadialGradient(W * .3, H * .7, 0, W * .3, H * .7, W * .7);
      ng.addColorStop(0, 'rgba(91,61,255,.22)'); ng.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = ng; cx.fillRect(0, 0, W, H);
      const speed = (reduce ? .05 : .12) + level * .8 + kick * .9;
      cx.strokeStyle = '#fff';
      for (const s of STARS) {
        const pz = s.z; s.z -= dt * speed;
        if (s.z <= .02) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; continue; }
        const k = .5 / s.z, kp = .5 / pz;
        cx.globalAlpha = Math.min(1, (1 - s.z) * 1.4); cx.lineWidth = (1 - s.z) * 2.2;
        cx.beginPath(); cx.moveTo(W / 2 + s.x * W * kp, H / 2 + s.y * H * kp); cx.lineTo(W / 2 + s.x * W * k, H / 2 + s.y * H * k); cx.stroke();
      }
      cx.globalAlpha = 1;
      const px = W * .5, py = H * .52, pr = Math.min(W, H) * .17 * (1 + kick * .04);
      drawEchoes(pal.echo, px, py, Math.max(W, H) * .6, dt);
      const pg = cx.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr);
      pg.addColorStop(0, pal.sun[0]); pg.addColorStop(.5, pal.sun[1]); pg.addColorStop(1, pal.sun[2]);
      cx.save(); cx.translate(px, py); cx.rotate(-.35);
      cx.strokeStyle = pal.grid; cx.lineWidth = 2; cx.globalAlpha = .9;
      cx.beginPath(); cx.ellipse(0, 0, pr * 1.9, pr * .45, 0, Math.PI, Math.PI * 2); cx.stroke();
      cx.globalAlpha = 1; cx.fillStyle = pg; cx.beginPath(); cx.arc(0, 0, pr, 0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.ellipse(0, 0, pr * 1.9, pr * .45, 0, 0, Math.PI); cx.stroke();
      cx.restore();
      waveRing(pal, px, py, pr * 2.3, pr * 1.2);
    },
    sonar(pal, cyc, dt) {
      cx.fillStyle = pal.sky[1]; cx.fillRect(0, 0, W, H);
      const ox = W / 2, oy = H / 2, R = Math.min(W, H) * .44;
      cx.strokeStyle = pal.grid; cx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) { cx.globalAlpha = .28; cx.beginPath(); cx.arc(ox, oy, R * i / 4, 0, Math.PI * 2); cx.stroke(); }
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; cx.globalAlpha = .12; cx.beginPath(); cx.moveTo(ox, oy); cx.lineTo(ox + Math.cos(a) * R, oy + Math.sin(a) * R); cx.stroke(); }
      const sw = (cyc % 1) * Math.PI * 2 - Math.PI / 2;
      for (let j = 0; j < 40; j++) {
        const a = sw - j * .025; cx.globalAlpha = (1 - j / 40) * .5; cx.lineWidth = 3;
        cx.beginPath(); cx.moveTo(ox, oy); cx.lineTo(ox + Math.cos(a) * R, oy + Math.sin(a) * R); cx.stroke();
      }
      cx.globalAlpha = 1;
      drawEchoes(pal.echo, ox, oy, R, dt);
      for (const b of blips) {
        b.a -= dt * .6; if (b.a <= 0) continue;
        cx.globalAlpha = b.a; cx.fillStyle = b.big ? pal.echo : pal.wave;
        cx.beginPath(); cx.arc(ox + Math.cos(b.ang) * R * b.rad, oy + Math.sin(b.ang) * R * b.rad, b.big ? 5 : 3, 0, Math.PI * 2); cx.fill();
      }
      cx.globalAlpha = 1;
      while (blips.length && blips[0].a <= 0) blips.shift();
      waveRing(pal, ox, oy, R * .28, R * .5);
      cx.fillStyle = pal.wave; cx.beginPath(); cx.arc(ox, oy, 3 + kick * 4, 0, Math.PI * 2); cx.fill();
    },

    // città pixel art al tramonto: montagne low poly, finestre che seguono hi-hat e pad, auto che sobbalza sulla cassa
    pixel(pal, cyc, dt) {
      const pw = 200, ph = Math.max(100, Math.round(pw * H / Math.max(W, 1)));
      if (pc.width !== pw || pc.height !== ph) { pc.width = pw; pc.height = ph; }
      const hz = Math.round(ph * .62);
      p.drawImage(pixelSky(pal, pw, hz), 0, 0);
      for (const s of SKYSTARS) {
        if (s.y > .55) continue;
        p.fillStyle = Math.sin(cyc * 5 + s.r * 40) > .5 ? '#ffffff' : '#7e74c4';
        p.fillRect(Math.floor(s.x * pw), Math.floor(s.y * hz), 1, 1);
      }
      for (const st of streaks) {
        st.a -= dt * 1.5; if (st.a <= 0) continue;
        const x = Math.floor(st.x * pw + (1 - st.a) * 40), y = Math.floor(st.y * hz + (1 - st.a) * 14);
        for (let i = 0; i < 6; i++) { p.fillStyle = i ? pal.sun[1] : '#fff'; p.fillRect(x - i * 2, y - i, 2, 1); }
      }
      while (streaks.length && streaks[0].a <= 0) streaks.shift();
      // sole a bande con le righe che scorrono
      const sr = 22 + Math.round(kick * 3), sx = Math.round(pw / 2), sy = hz - 4;
      for (let dy = -sr; dy <= sr; dy++) {
        const y = sy + dy; if (y >= hz) break;
        if (dy > -sr * .1 && (dy + Math.floor(cyc * 8)) % 5 === 0) continue;
        const hw = Math.floor(Math.sqrt(sr * sr - dy * dy));
        p.fillStyle = pal.sun[Math.min(3, Math.floor((dy + sr) / (2 * sr) * 4))];
        p.fillRect(sx - hw, y, hw * 2, 1);
      }
      lowPoly(pw, hz, 3, ph * .34, 30, pal.far, cyc * 3, lv.pad * .15);
      lowPoly(pw, hz, 11, ph * .2, 20, pal.near, cyc * 7, lv.bass * .2);
      // skyline con finestre
      let x = -4;
      BLDG.forEach((b, bi) => {
        if (x > pw * .3 && x < pw * .7) { x = Math.round(pw * .7); }
        const h = Math.round(b.h * .7 * (ph / 110));
        p.fillStyle = pal.city; p.fillRect(x, hz - h, b.w, h);
        for (let wy = hz - h + 2; wy < hz - 2; wy += 3) for (let wx = x + 1; wx < x + b.w - 1; wx += 2) {
          const lit = hash(bi * 31 + wx, wy + Math.floor(cyc * 2)) < .12 + lv.pad * .35 + lv.hats * .25;
          if (lit) { p.fillStyle = pal.win[(bi + wx) % 3]; p.fillRect(wx, wy, 1, 1); }
        }
        if (b.s > .7) { p.fillStyle = lv.snare > .3 ? '#ff3355' : '#551122'; p.fillRect(x + (b.w >> 1), hz - h - 2, 1, 2); }
        x += b.w + 1;
      });
      // terreno, griglia, strada
      p.fillStyle = pal.ground; p.fillRect(0, hz, pw, ph - hz);
      const scroll = (cyc * 4) % 1;
      p.fillStyle = pal.grid;
      for (let k = 0; k < 12; k++) { const tt = (k + scroll) / 12; p.globalAlpha = .3 + tt * .7; p.fillRect(0, Math.floor(hz + (ph - hz) * Math.pow(tt, 2.2)), pw, 1); }
      p.globalAlpha = .55; p.strokeStyle = pal.grid; p.lineWidth = 1;
      for (let i = -10; i <= 10; i++) { p.beginPath(); p.moveTo(pw / 2 + i * 3, hz); p.lineTo(pw / 2 + i * 26, ph); p.stroke(); }
      p.globalAlpha = 1;
      p.fillStyle = pal.road; p.beginPath(); p.moveTo(pw / 2 - 3, hz); p.lineTo(pw / 2 + 3, hz); p.lineTo(pw / 2 + 46, ph); p.lineTo(pw / 2 - 46, ph); p.closePath(); p.fill();
      p.fillStyle = pal.dash;
      for (let k = 0; k < 8; k++) { const tt = (k + scroll * 2 % 1) / 8, y = Math.floor(hz + (ph - hz) * tt * tt); p.fillRect(Math.round(pw / 2), y, 1, Math.max(1, Math.round(tt * 4))); }
      // forma d'onda pixel sull'orizzonte
      p.fillStyle = pal.wave;
      for (let i = 0; i < pw; i++) { const v = wave[Math.floor(i / pw * (N - 1))]; if (Math.abs(v) > .01) p.fillRect(i, Math.round(hz - 3 + v * ph * .18), 1, 1); }
      // auto
      const bounce = kick > .5 ? 1 : 0, cxp = Math.round(pw / 2 - 12), cyp = ph - 12 - bounce;
      p.fillStyle = '#000'; p.fillRect(cxp + 3, cyp + 6, 4, 3); p.fillRect(cxp + 17, cyp + 6, 4, 3);
      p.fillStyle = pal.car; p.fillRect(cxp, cyp + 2, 24, 5);
      p.fillStyle = '#0a6b80'; p.fillRect(cxp + 6, cyp - 2, 12, 4);
      p.fillStyle = '#7cf3ff'; p.fillRect(cxp + 7, cyp - 1, 4, 2); p.fillRect(cxp + 13, cyp - 1, 4, 2);
      p.fillStyle = lv.bass > .3 ? '#ff2244' : '#771122'; p.fillRect(cxp, cyp + 3, 2, 2); p.fillRect(cxp + 22, cyp + 3, 2, 2);
      if (lv.bass > .3) { p.fillStyle = '#ff2244'; p.globalAlpha = .4; p.fillRect(cxp - 3, cyp + 3, 3, 2); p.fillRect(cxp + 24, cyp + 3, 3, 2); p.globalAlpha = 1; }
      if (lv.riser > .05) { p.fillStyle = '#fff'; for (let i = 0; i < lv.riser * 14; i++) p.fillRect(Math.floor(hash(i, Math.floor(cyc * 16)) * pw), hz + 2 + Math.floor(hash(i + 9, Math.floor(cyc * 16)) * (ph - hz - 2)), 3, 1); }
      cx.imageSmoothingEnabled = false;
      cx.drawImage(pc, 0, 0, W, H);
      cx.imageSmoothingEnabled = true;
    },

    // palco cyberpunk: ogni strumento disegnato si accende quando suona
    palco(pal, cyc, dt, playing) {
      const u = Math.min(W / 9, H / 3.9), base = Math.min(H * .8, H - 62);
      const wg = cx.createLinearGradient(0, 0, 0, base);
      wg.addColorStop(0, pal.wall[0]); wg.addColorStop(1, pal.wall[1]);
      cx.fillStyle = wg; cx.fillRect(0, 0, W, H);
      // skyline sullo sfondo
      for (const tw of TOWERS) {
        const x = tw.x * W, w = tw.w * W, h = tw.h * H * 1.4, top = base - h - u * .4;
        cx.fillStyle = '#0d0820'; cx.fillRect(x, top, w, h);
        cx.fillStyle = tw.win > .5 ? pal.b : pal.a;
        for (let y = top + 6; y < base - u * .5; y += 9) for (let wx = x + 3; wx < x + w - 3; wx += 6) {
          if (hash(wx, y + Math.floor(cyc * 2)) < .1 + lv.hats * .2 + lv.pad * .15) { cx.globalAlpha = .55; cx.fillRect(wx, y, 2, 3); }
        }
        cx.globalAlpha = 1;
      }
      // muro LED con la forma d'onda
      const lx0 = W * .14, lx1 = W * .86, ly0 = H * .08, ly1 = H * .34;
      cx.fillStyle = 'rgba(5,3,12,.85)'; cx.fillRect(lx0, ly0, lx1 - lx0, ly1 - ly0);
      cx.strokeStyle = pal.metal; cx.lineWidth = 2; cx.strokeRect(lx0, ly0, lx1 - lx0, ly1 - ly0);
      cx.fillStyle = pal.metal;
      for (let y = ly0 + 4; y < ly1; y += 6) for (let x = lx0 + 4; x < lx1; x += 6) cx.fillRect(x, y, 1.5, 1.5);
      cx.save(); cx.beginPath(); cx.rect(lx0, ly0, lx1 - lx0, ly1 - ly0); cx.clip();
      waveLine(pal.b, pal.b, (ly0 + ly1) / 2, (ly1 - ly0) * .45, lx0 + 4, lx1 - 4);
      cx.restore();
      // luci dall'alto
      cx.save(); cx.globalCompositeOperation = 'lighter';
      const beams = [['kick', pal.a], ['snare', pal.b], ['hook', pal.c], ['kick', pal.a], ['snare', pal.b], ['arp', pal.c]];
      beams.forEach(([k, col], i) => {
        const x = W * (.1 + i * .16), ang = Math.sin(cyc * Math.PI / 2 + i * 1.3) * .35, len = base * 1.05, wdt = u * .9;
        const g = cx.createLinearGradient(x, 0, x, len);
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        cx.globalAlpha = .05 + lv[k] * .28;
        cx.fillStyle = g; cx.beginPath(); cx.moveTo(x - 4, 0); cx.lineTo(x + 4, 0);
        cx.lineTo(x + Math.sin(ang) * len + wdt, len); cx.lineTo(x + Math.sin(ang) * len - wdt, len); cx.closePath(); cx.fill();
      });
      cx.restore();
      // pavimento del palco
      cx.fillStyle = pal.dark; cx.beginPath(); cx.moveTo(W * .02, base); cx.lineTo(W * .98, base); cx.lineTo(W, H); cx.lineTo(0, H); cx.closePath(); cx.fill();
      cx.strokeStyle = pal.a; cx.lineWidth = 1;
      for (let k = 0; k < 6; k++) { const y = base + (H - base) * Math.pow(k / 6, 1.6); cx.globalAlpha = .15 + kick * .5 * (1 - k / 6); cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
      cx.globalAlpha = .4 + kick * .6; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(W * .02, base); cx.lineTo(W * .98, base); cx.stroke();
      cx.globalAlpha = 1;

      const glow = (col, k) => { cx.shadowColor = col; cx.shadowBlur = 4 + lv[k] * 26; };
      const lineCol = (col, k) => lv[k] > .12 ? col : pal.label;
      const stand = (x, y0, y1) => { cx.strokeStyle = pal.metal; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y0); cx.lineTo(x, y1); cx.moveTo(x - u * .14, y1); cx.lineTo(x, y1 - u * .1); cx.lineTo(x + u * .14, y1); cx.stroke(); };
      cx.save();

      // hi-hat
      const hx = W * .06, hy = base - u * 1.55, gap = u * .1 * (1 - lv.hats);
      stand(hx, hy, base);
      glow(pal.c, 'hats'); cx.strokeStyle = lineCol(pal.c, 'hats'); cx.lineWidth = 2.5;
      cx.beginPath(); cx.ellipse(hx, hy, u * .34, u * .06, 0, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.ellipse(hx, hy - gap - u * .04, u * .34, u * .06, 0, 0, Math.PI * 2); cx.stroke();
      // crash
      const crx = W * .3, cry = base - u * 2.05, tilt = -.3 + Math.sin(performance.now() / 40) * lv.fx * .25;
      stand(crx, cry, base - u * 1.3);
      glow(pal.c, 'fx'); cx.strokeStyle = lineCol(pal.c, 'fx');
      cx.beginPath(); cx.ellipse(crx, cry, u * .42, u * .08, tilt, 0, Math.PI * 2); cx.stroke();
      // cassa
      const kx = W * .165, kr = u * .62 * (1 + lv.kick * .07), ky = base - u * .64;
      glow(pal.a, 'kick');
      const kg = cx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      kg.addColorStop(0, `rgba(255,46,136,${.15 + lv.kick * .5})`); kg.addColorStop(1, 'rgba(20,10,35,.95)');
      cx.fillStyle = kg; cx.beginPath(); cx.arc(kx, ky, kr, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = lineCol(pal.a, 'kick'); cx.lineWidth = 3 + lv.kick * 3; cx.stroke();
      cx.lineWidth = 1.5; cx.beginPath(); cx.arc(kx, ky, kr * .62, 0, Math.PI * 2); cx.stroke();
      cx.font = `700 ${Math.round(kr * .38)}px "Russo One", sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = lineCol(pal.a, 'kick'); cx.fillText('CM', kx, ky + 1);
      // rullante
      const sx = W * .275, sy = base - u * 1.05;
      stand(sx, sy + u * .16, base);
      glow(pal.b, 'snare'); cx.strokeStyle = lineCol(pal.b, 'snare'); cx.lineWidth = 2.5;
      cx.fillStyle = pal.dark; cx.fillRect(sx - u * .34, sy, u * .68, u * .16); cx.strokeRect(sx - u * .34, sy, u * .68, u * .16);
      cx.beginPath(); cx.ellipse(sx, sy, u * .34, u * .08, 0, 0, Math.PI * 2); cx.fillStyle = `rgba(0,229,255,${lv.snare * .6})`; cx.fill(); cx.stroke();
      // cassa del basso
      const bx = W * .39, bw = u * 1.1, bh = u * 1.75, bt = base - bh;
      glow(pal.b, 'bass'); cx.fillStyle = pal.dark; cx.fillRect(bx - bw / 2, bt, bw, bh);
      cx.strokeStyle = lineCol(pal.b, 'bass'); cx.lineWidth = 2.5; cx.strokeRect(bx - bw / 2, bt, bw, bh);
      [bt + bh * .3, bt + bh * .72].forEach(cyy => {
        const r = u * .32; cx.lineWidth = 2; cx.beginPath(); cx.arc(bx, cyy, r, 0, Math.PI * 2); cx.stroke();
        cx.fillStyle = `rgba(0,229,255,${.1 + lv.bass * .55})`; cx.beginPath(); cx.arc(bx, cyy, r * (.35 + lv.bass * .35), 0, Math.PI * 2); cx.fill();
      });
      // tastiera (pad) e sequencer (arp)
      const kbx = W * .6, kbw = u * 2.5, kbh = u * .42, kbt = base - u * 1.1;
      cx.shadowBlur = 0; cx.strokeStyle = pal.metal; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(kbx - kbw * .35, kbt + kbh); cx.lineTo(kbx + kbw * .3, base); cx.moveTo(kbx + kbw * .35, kbt + kbh); cx.lineTo(kbx - kbw * .3, base); cx.stroke();
      glow(pal.a, 'pad'); cx.fillStyle = pal.dark; cx.fillRect(kbx - kbw / 2, kbt, kbw, kbh);
      cx.strokeStyle = lineCol(pal.a, 'pad'); cx.lineWidth = 2; cx.strokeRect(kbx - kbw / 2, kbt, kbw, kbh);
      const keys = 15, kw = (kbw - 8) / keys, bar = Math.floor(cyc);
      for (let i = 0; i < keys; i++) {
        const lit = hash(i, bar) < lv.pad * .7;
        cx.fillStyle = lit ? pal.a : 'rgba(232,228,255,.18)';
        cx.fillRect(kbx - kbw / 2 + 4 + i * kw + 1, kbt + kbh * .35, kw - 2, kbh * .55);
      }
      const sqt = kbt - u * .62, sqh = u * .36, sqw = kbw * .82;
      glow(pal.b, 'arp'); cx.fillStyle = pal.dark; cx.fillRect(kbx - sqw / 2, sqt, sqw, sqh);
      cx.strokeStyle = lineCol(pal.b, 'arp'); cx.strokeRect(kbx - sqw / 2, sqt, sqw, sqh);
      const active = playing ? Math.floor(cyc * 8) % 8 : -1;
      for (let i = 0; i < 8; i++) {
        const lx = kbx - sqw / 2 + sqw * (i + .5) / 8, on = i === active;
        cx.fillStyle = on ? (lv.arp > .1 ? pal.b : pal.label) : 'rgba(0,229,255,.12)';
        cx.beginPath(); cx.arc(lx, sqt + sqh / 2, u * .06 * (on ? 1.3 : 1), 0, Math.PI * 2); cx.fill();
      }
      cx.strokeStyle = pal.metal; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(kbx, sqt + sqh); cx.lineTo(kbx, kbt); cx.stroke();
      // synth lead (hook) con oscilloscopio
      const hx2 = W * .8, hw = u * 1.25, hh = u * 1.35, ht = base - hh - u * .25;
      stand(hx2, ht + hh, base);
      glow(pal.c, 'hook'); cx.fillStyle = pal.dark; cx.fillRect(hx2 - hw / 2, ht, hw, hh);
      cx.strokeStyle = lineCol(pal.c, 'hook'); cx.lineWidth = 2.5; cx.strokeRect(hx2 - hw / 2, ht, hw, hh);
      const scx = hx2 - hw / 2 + u * .1, scw = hw - u * .2, scy = ht + u * .1, sch = hh * .45;
      cx.fillStyle = '#04120f'; cx.fillRect(scx, scy, scw, sch);
      cx.restore(); cx.save();
      cx.beginPath(); cx.rect(scx, scy, scw, sch); cx.clip();
      waveLine(lv.hook > .1 ? pal.c : pal.label, pal.c, scy + sch / 2, sch * 1.6, scx, scx + scw, hookWave);
      cx.restore(); cx.save();
      for (let i = 0; i < 3; i++) {
        const kx2 = hx2 - hw / 2 + hw * (i + .5) / 3, ky2 = ht + hh * .76, r = u * .13, ang = cyc * 2 * lv.hook + i * 2;
        cx.strokeStyle = lineCol(pal.c, 'hook'); cx.lineWidth = 2; cx.beginPath(); cx.arc(kx2, ky2, r, 0, Math.PI * 2); cx.stroke();
        cx.beginPath(); cx.moveTo(kx2, ky2); cx.lineTo(kx2 + Math.cos(ang) * r, ky2 + Math.sin(ang) * r); cx.stroke();
      }
      // bobina di Tesla (riser)
      const tx = W * .94, ttop = base - u * 2.3;
      cx.strokeStyle = pal.metal; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(tx - u * .18, base); cx.lineTo(tx - u * .06, ttop + u * .2); cx.lineTo(tx + u * .06, ttop + u * .2); cx.lineTo(tx + u * .18, base); cx.stroke();
      for (let y = ttop + u * .4; y < base; y += u * .16) { cx.beginPath(); cx.moveTo(tx - u * .1, y); cx.lineTo(tx + u * .1, y); cx.stroke(); }
      glow(pal.b, 'riser'); cx.strokeStyle = lineCol(pal.b, 'riser'); cx.lineWidth = 3;
      cx.beginPath(); cx.ellipse(tx, ttop + u * .12, u * .3, u * .1, 0, 0, Math.PI * 2); cx.stroke();
      if (lv.riser > .05) {
        cx.strokeStyle = '#d6f8ff'; cx.lineWidth = 1.5;
        for (let a = 0; a < 1 + lv.riser * 5; a++) {
          let x = tx, y = ttop + u * .1; const ang = Math.random() * Math.PI * 2, len = u * (.5 + lv.riser * 1.4);
          cx.beginPath(); cx.moveTo(x, y);
          for (let s = 1; s <= 6; s++) { x = tx + Math.cos(ang) * len * s / 6 + (Math.random() - .5) * u * .2; y = ttop + u * .1 + Math.sin(ang) * len * s / 6 * .7 + (Math.random() - .5) * u * .2; cx.lineTo(x, y); }
          cx.stroke();
        }
      }
      cx.restore();
      drawEchoes(pal.echo, kx, ky, Math.max(W, H) * .5, dt);
      // etichette
      cx.font = `600 ${Math.max(9, Math.round(u * .16))}px "JetBrains Mono", monospace`; cx.textAlign = 'center'; cx.textBaseline = 'top';
      cx.textBaseline = 'bottom'; cx.fillStyle = lv.fx > .12 ? '#ffffff' : pal.label; cx.fillText('FX', crx, cry - u * .14); cx.textBaseline = 'top';
      [['HATS', hx, 'hats'], ['KICK', kx, 'kick'], ['SNARE', sx, 'snare'], ['BASS', bx, 'bass'], ['PAD · ARP', kbx, 'pad'], ['HOOK', hx2, 'hook'], ['RISER', tx, 'riser']]
        .forEach(([label, x, k]) => {
          const on = lv[k] > .12 || (k === 'pad' && lv.arp > .12);
          cx.fillStyle = on ? '#ffffff' : pal.label; cx.fillText(label, x, base + 6);
        });
    },
  };

  // equalizzatore del logo: un'asta per strumento
  const eq = [...document.querySelectorAll('.logo-eq i')];
  const EQ = ['kick', 'snare', 'hats', 'bass', 'arp', 'pad', 'hook'];
  const logo = document.querySelector('.logo');

  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    readAudio(dt, now);
    const playing = isPlaying();
    let cyc;
    if (playing) cyc = sched().now();
    else { idle += dt * (reduce ? .03 : .12); cyc = idle; }
    const nSteps = getSteps ? getSteps() : 16;
    const step = playing ? Math.floor(cyc * nSteps) % nSteps : -1;
    if (step !== lastStep) { lastStep = step; onStep(step); }
    if (!playing) echoes.length = 0;
    kick *= Math.exp(-dt * 7); flash *= Math.exp(-dt * 10);
    const look = getS().look, pal = PAL[look] || PAL.palco;
    cx.clearRect(0, 0, W, H);
    (SCENE_DRAW[look] || SCENE_DRAW.palco)(pal, cyc, dt, playing);
    if (flash > .02 && !reduce) { cx.fillStyle = pal.echo; cx.globalAlpha = flash * .08; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }

    if (logo) logo.style.setProperty('--pulse', kick.toFixed(3));
    eq.forEach((el, i) => el.style.setProperty('--l', (playing ? lv[EQ[i]] : .15 + .1 * Math.sin(now / 400 + i)).toFixed(3)));

    $('#readout').textContent = readout(cyc, Math.max(0, step), playing);
    requestAnimationFrame(frame);
  }
  let idle = 0;
  requestAnimationFrame(frame);
}
