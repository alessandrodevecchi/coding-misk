import { INSTRUMENTS } from './music.js';

// Visual su canvas sincronizzati con l'audio.
// Ogni strumento suona su un analizzatore separato (.analyze("kick"), .analyze("bass"), …):
// da lì ricaviamo un livello 0..1 per strumento e gli attacchi (onset) che accendono la scena.
// getInfo(cyc): what plays, for the studio scene: { onAir, title, artist, line, bar, bars, bpm, say, sayAt, n }
// soul: the soul scene (#46), drawn when the look is 'soul'
// afterFrame(cyc, playing): called after each frame (the video recorder draws its frame there, #27)
export function startVisuals({ getS, getSteps, getMode, isPlaying, sched, readout, getInfo = () => ({}), soul = null, afterFrame = null }) {
  const $ = (s, r = document) => r.querySelector(s);
  const cv = $('#stage'), vcx = cv.getContext('2d');
  // the canvas the scenes draw into: the stage, or an offscreen canvas at the video size while a video records (#27)
  let cc = cv, cx = vcx, target = null;
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    if (target) return;
    W = r.width; H = r.height; dpr = d;
    cx.setTransform(d, 0, 0, d, 0, 0);
  };
  // video target { w, h } in pixels: the scenes draw at a logical height of 720 scaled up to it; null: back to the stage
  function setTarget(t) {
    target = t && t.w > 0 && t.h > 0 ? t : null;
    if (!target) { cc = cv; cx = vcx; resize(); return; }
    if (cc === cv) { cc = document.createElement('canvas'); cx = cc.getContext('2d'); }
    cc.width = target.w; cc.height = target.h;
    const s = target.h / 720; W = target.w / s; H = 720; dpr = s;
    cx.setTransform(s, 0, 0, s, 0, 0);
  }
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
    edgerunners: { sky: ['#0d0018', '#3b0a52', '#ff2a6d'], y: '#fcee0a', c: '#00f0ff', m: '#ff2a6d', ink: '#06010a', echo: '#fcee0a', wave: '#fcee0a', grid: '#00f0ff' },
    studio:   { wall: ['#07050b', '#160d1c'], foam: '#120b18', foam2: '#1b1124', amber: '#ffb347', red: '#ff2a3d', screen: '#04070b', ink: '#7cf3ff', dim: '#3d5a66', desk: '#17131d', metal: '#3a3346', wave: '#7cf3ff', echo: '#ffb347', grid: '#ffb347' },
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
  let glitch = 0, shake = 0;
  let level = 0, kick = 0, flash = 0, lastStep = -1, lastT = performance.now();
  const echoes = [], blips = [], streaks = [];

  function onset(k) {
    if (k === 'kick') { kick = 1; echoes.push({ r: 0, a: 1 }); if (echoes.length > 12) echoes.shift(); }
    if (k === 'snare') { glitch = 1; }
    if (k === 'guitar') { shake = 1; glitch = Math.max(glitch, .5); }
    if (k === 'snare') { flash = 1; blips.push({ ang: Math.random() * 6.283, rad: .55 + Math.random() * .2, a: 1, big: true }); }
    if (k === 'hats') blips.push({ ang: Math.random() * 6.283, rad: .75 + Math.random() * .2, a: 1, big: false });
    if (k === 'guitar') { flash = Math.max(flash, .6); blips.push({ ang: Math.random() * 6.283, rad: .35 + Math.random() * .2, a: 1, big: true }); }
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
  let halftone = null;
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
          const y = hz - (noise(i * fr * .35 + cyc * sp + li * 9) * .5 + .55) * H * amp * (1 + (li === 2 ? lv.bass * .2 + lv.guitar * .15 : 0)) - Math.abs(wv);
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
    // spazio: nebulose, salto nell'iperspazio, aurora con la forma d'onda, gigante gassoso che sorge dal basso, navicella
    spazio(pal, cyc, dt) {
      const bg = cx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#02010a'); bg.addColorStop(1, '#0d0724');
      cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
      // nebulose che respirano col pad e con l'hook
      cx.save(); cx.globalCompositeOperation = 'lighter';
      [[.2, .3, .45, pal.sun[2], .1 + lv.pad * .18], [.55, .18, .35, pal.sun[1], .07 + lv.hook * .18], [.4, .62, .5, '#00b3ff', .06 + lv.guitar * .15]].forEach(([nx, ny, nr, col, al], i) => {
        const x = (nx + Math.sin(cyc * .05 + i) * .03) * W, y = (ny + Math.cos(cyc * .04 + i) * .03) * H, r = nr * Math.max(W, H);
        const g = cx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        cx.globalAlpha = al; cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      });
      cx.restore();
      // stelle in corsa verso chi guarda: più veloci con l'energia del brano
      const vx = W * .36, vy = H * .4, speed = (reduce ? .04 : .1) + level * .7 + kick * .8 + lv.guitar * .4;
      cx.strokeStyle = '#fff';
      for (const st of STARS) {
        const pz = st.z; st.z -= dt * speed;
        if (st.z <= .02) { st.z = 1; st.x = Math.random() * 2 - 1; st.y = Math.random() * 2 - 1; continue; }
        const k = .5 / st.z, kp = .5 / pz;
        cx.globalAlpha = Math.min(1, (1 - st.z) * 1.3); cx.lineWidth = (1 - st.z) * 2;
        cx.beginPath(); cx.moveTo(vx + st.x * W * kp, vy + st.y * H * kp); cx.lineTo(vx + st.x * W * k, vy + st.y * H * k); cx.stroke();
      }
      cx.globalAlpha = 1;
      // aurora: la forma d'onda di tutti gli strumenti come nastro luminoso
      cx.save(); cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = .75; waveLine(pal.grid, pal.grid, H * .3, H * .13);
      cx.globalAlpha = .4; waveLine(pal.sun[1], pal.sun[1], H * .3 + 6, H * .09);
      cx.restore();
      // comete sugli attacchi di hook e arpeggio
      for (const c of streaks) {
        c.a -= dt * .9; if (c.a <= 0) continue;
        const x = (c.x * .7 + (1 - c.a) * .4) * W, y = (c.y * .8 + (1 - c.a) * .25) * H;
        const g = cx.createLinearGradient(x, y, x - W * .12, y - H * .07);
        g.addColorStop(0, `rgba(255,255,255,${c.a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        cx.strokeStyle = g; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - W * .12, y - H * .07); cx.stroke();
      }
      while (streaks.length && streaks[0].a <= 0) streaks.shift();
      // luna con le eco della cassa
      const mx = W * .16, my = H * .2, mr = Math.min(W, H) * .045;
      drawEchoes(pal.echo, mx, my, Math.max(W, H) * .45, dt);
      cx.fillStyle = '#e8e2ff'; cx.beginPath(); cx.arc(mx, my, mr, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#0d0724'; cx.beginPath(); cx.arc(mx + mr * .45, my - mr * .2, mr * .95, 0, Math.PI * 2); cx.fill();
      // gigante gassoso che sorge dal basso a destra, con bande, anelli e atmosfera
      const R = Math.max(W, H) * .55, px = W * .86, py = H + R * .42;
      const ring = (front) => {
        cx.save(); cx.translate(px, py); cx.rotate(-.42);
        cx.strokeStyle = pal.grid; cx.globalAlpha = .55 + lv.bass * .4; cx.lineWidth = 2 + lv.bass * 3;
        // anelli visti dall'alto: passano davanti al disco del pianeta
        for (const k of [1.12, 1.2, 1.27]) { cx.beginPath(); cx.ellipse(0, 0, R * k, R * k * .3, 0, 0, Math.PI * 2); cx.stroke(); }
        cx.restore();
      };
      cx.save();
      cx.shadowColor = pal.sun[1]; cx.shadowBlur = 30 + kick * 50;
      const pg = cx.createRadialGradient(px - R * .35, py - R * .45, R * .1, px, py, R);
      pg.addColorStop(0, pal.sun[0]); pg.addColorStop(.45, pal.sun[1]); pg.addColorStop(1, pal.sun[2]);
      cx.fillStyle = pg; cx.beginPath(); cx.arc(px, py, R, 0, Math.PI * 2); cx.fill();
      cx.shadowBlur = 0;
      cx.beginPath(); cx.arc(px, py, R, 0, Math.PI * 2); cx.clip();
      for (let i = 0; i < 18; i++) {
        const y = py - R + i * R / 9 + Math.sin(cyc * .2 + i) * 4;
        cx.globalAlpha = .12 + (i % 3 === 0 ? .12 : 0) + lv.pad * .08; cx.fillStyle = i % 2 ? '#1a0b2e' : '#ffffff';
        cx.beginPath();
        for (let xx = px - R; xx <= px + R; xx += 24) { const yy = y + Math.sin(xx * .01 + cyc * .5 + i) * 6; xx === px - R ? cx.moveTo(xx, yy) : cx.lineTo(xx, yy); }
        cx.lineTo(px + R, y + R / 18); cx.lineTo(px - R, y + R / 18); cx.closePath(); cx.fill();
      }
      cx.restore();
      cx.save(); cx.strokeStyle = pal.sun[0]; cx.globalAlpha = .5 + kick * .5; cx.lineWidth = 2;
      cx.beginPath(); cx.arc(px, py, R + 3, Math.PI * 1.05, Math.PI * 1.95); cx.stroke(); cx.restore();
      ring(true);
      // navicella retrò che attraversa il cielo: il motore segue basso e cassa
      const t8 = (cyc / 8) % 1, sx = -W * .1 + t8 * W * 1.2, sy = H * .55 + Math.sin(cyc * 1.3) * H * .03, sz = Math.min(W, H) * .035;
      cx.save(); cx.translate(sx, sy); cx.rotate(-.08);
      const flame = sz * (1.2 + lv.bass * 2.5 + kick * 1.5);
      const fg = cx.createLinearGradient(-sz, 0, -sz - flame, 0);
      fg.addColorStop(0, '#fff'); fg.addColorStop(.3, pal.echo); fg.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = fg; cx.beginPath(); cx.moveTo(-sz, -sz * .25); cx.lineTo(-sz - flame, 0); cx.lineTo(-sz, sz * .25); cx.fill();
      cx.fillStyle = '#d9d4ff'; cx.strokeStyle = pal.grid; cx.lineWidth = 1.5;
      cx.beginPath(); cx.moveTo(sz * 1.6, 0); cx.lineTo(-sz, -sz * .55); cx.lineTo(-sz * .6, 0); cx.lineTo(-sz, sz * .55); cx.closePath(); cx.fill(); cx.stroke();
      cx.fillStyle = pal.sun[1]; cx.beginPath(); cx.ellipse(sz * .35, 0, sz * .35, sz * .16, 0, 0, Math.PI * 2); cx.fill();
      cx.restore();
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
          const lit = hash(bi * 31 + wx, wy + Math.floor(cyc * 2)) < .12 + lv.pad * .3 + lv.hats * .2 + lv.guitar * .25;
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


    // Edgerunners: luna a retino, città a strati con bordi ciano, insegne olografiche, treno sopraelevato,
    // linee di velocità sui colpi forti, glitch con fette spostate e separazione RGB sul rullante
    edgerunners(pal, cyc, dt, playing) {
      if (!halftone) {
        const t = document.createElement('canvas'); t.width = t.height = 6;
        const tc = t.getContext('2d'); tc.fillStyle = '#000'; tc.beginPath(); tc.arc(3, 3, 1.3, 0, Math.PI * 2); tc.fill();
        halftone = cx.createPattern(t, 'repeat');
      }
      cx.save();
      if (shake > .05 && !reduce) cx.translate((Math.random() - .5) * 10 * shake, (Math.random() - .5) * 6 * shake);
      const hz = H * .74;
      const sg = cx.createLinearGradient(0, 0, 0, hz);
      sg.addColorStop(0, pal.sky[0]); sg.addColorStop(.62, pal.sky[1]); sg.addColorStop(1, pal.sky[2]);
      cx.fillStyle = sg; cx.fillRect(-20, -20, W + 40, H + 40);
      // luna gialla con ombreggiatura a retino
      const mx = W * .74, my = H * .32, mr = Math.min(W, H) * (.24 + kick * .01);
      cx.save(); cx.shadowColor = pal.y; cx.shadowBlur = 40 + lv.pad * 60;
      cx.fillStyle = pal.y; cx.beginPath(); cx.arc(mx, my, mr, 0, Math.PI * 2); cx.fill(); cx.restore();
      cx.save(); cx.beginPath(); cx.arc(mx, my, mr, 0, Math.PI * 2); cx.clip();
      const shade = cx.createLinearGradient(mx - mr, my, mx + mr * .3, my);
      shade.addColorStop(0, 'rgba(255,42,109,.85)'); shade.addColorStop(1, 'rgba(255,42,109,0)');
      cx.fillStyle = shade; cx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
      cx.globalAlpha = .35; cx.fillStyle = halftone; cx.fillRect(mx - mr, my - mr, mr * 1.2, mr * 2);
      cx.restore();
      drawEchoes(pal.y, mx, my, Math.max(W, H) * .5, dt);
      // tre strati di città: lontano viola, medio con bordo ciano e insegne, vicino nero
      const layers = [[.55, '#2a0d3d', .022, 0], [.68, '#14061f', .035, 1], [.42, pal.ink, .05, 2]];
      layers.forEach(([hk, col, wk, li]) => {
        let x = -10, i = 0;
        while (x < W + 20) {
          const w = W * (wk + hash(i, li) * wk * 1.4), h = H * hk * (.18 + hash(i + 7, li) * .32);
          const top = hz - h + (li === 2 ? H * .12 : 0);
          cx.fillStyle = col; cx.fillRect(x, top, w, H - top);
          if (li === 1) {
            cx.fillStyle = pal.c; cx.globalAlpha = .5 + lv.bass * .5; cx.fillRect(x + w - 2, top, 2, h); cx.globalAlpha = 1;
            // insegne olografiche che tremolano con gli hi-hat
            if (hash(i, 3) > .55) {
              const on = hash(i, Math.floor(cyc * 8)) > .25 - lv.hats * .2;
              const sw = w * .6, sh = h * .12, sx = x + w * .2, sy = top + h * .2;
              cx.save(); cx.globalAlpha = on ? .9 : .25; cx.shadowColor = i % 2 ? pal.m : pal.c; cx.shadowBlur = 16;
              cx.strokeStyle = i % 2 ? pal.m : pal.c; cx.lineWidth = 2; cx.strokeRect(sx, sy, sw, sh);
              cx.fillStyle = cx.strokeStyle;
              for (let g = 0; g < 4; g++) cx.fillRect(sx + 4 + g * (sw - 8) / 4, sy + 3, (sw - 8) / 4 - 4, sh - 6);
              cx.restore();
            }
          }
          if (li < 2) {
            cx.fillStyle = li ? pal.y : pal.c;
            for (let wy = top + 6; wy < hz - 4; wy += 8) for (let wx = x + 3; wx < x + w - 3; wx += 6) {
              if (hash(wx + i, wy) < .06 + lv.pad * .1 + lv.guitar * .08) { cx.globalAlpha = .7; cx.fillRect(wx, wy, 2, 3); }
            }
            cx.globalAlpha = 1;
          }
          x += w + (li === 2 ? 0 : 3); i++;
        }
      });
      // binario sopraelevato e treno che passa ogni 4 battute
      const ty = H * .8;
      cx.fillStyle = pal.ink; cx.fillRect(0, ty, W, H * .03);
      cx.fillStyle = pal.m; cx.fillRect(0, ty, W, 2);
      for (let px = ((-cyc * 80) % 120); px < W; px += 120) cx.fillRect(px, ty, 6, H - ty);
      const tp = ((cyc / 4) % 1), tx = -W * .6 + tp * W * 2.2, tw = W * .55, th = H * .07;
      cx.save(); cx.fillStyle = pal.y; cx.fillRect(tx, ty - th, tw, th);
      cx.fillStyle = pal.ink; for (let k = 0; k < 8; k++) cx.fillRect(tx + 12 + k * tw / 8, ty - th * .8, tw / 8 - 18, th * .45);
      cx.fillStyle = pal.c; cx.fillRect(tx, ty - th * .2, tw, th * .08);
      const tg = cx.createLinearGradient(tx - W * .3, 0, tx, 0); tg.addColorStop(0, 'rgba(252,238,10,0)'); tg.addColorStop(1, 'rgba(252,238,10,.5)');
      cx.fillStyle = tg; cx.fillRect(tx - W * .3, ty - th * .7, W * .3, th * .4);
      cx.restore();
      // linee di velocità da anime sui colpi di cassa e chitarra
      const hit = Math.max(kick, lv.guitar * .8);
      if (hit > .25 && !reduce) {
        cx.save(); cx.strokeStyle = '#fff'; cx.globalAlpha = (hit - .25) * .7;
        for (let i = 0; i < 70; i++) {
          const a = hash(i, Math.floor(cyc * 16)) * Math.PI * 2, r0 = Math.min(W, H) * (.32 + hash(i + 3, 1) * .1), r1 = Math.max(W, H) * .9;
          cx.lineWidth = 1 + hash(i, 9) * 2.5;
          cx.beginPath(); cx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); cx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); cx.stroke();
        }
        cx.restore();
      }
      // HUD cyberware con la forma d'onda di tutti gli strumenti
      const hwid = Math.min(W * .3, 380), hht = H * .13, hx = W * .5 - hwid / 2, hy = H * .05;
      cx.save(); cx.fillStyle = 'rgba(6,1,10,.7)';
      cx.beginPath(); cx.moveTo(hx, hy); cx.lineTo(hx + hwid - 16, hy); cx.lineTo(hx + hwid, hy + 16); cx.lineTo(hx + hwid, hy + hht); cx.lineTo(hx + 16, hy + hht); cx.lineTo(hx, hy + hht - 16); cx.closePath(); cx.fill();
      cx.strokeStyle = pal.y; cx.lineWidth = 1.5; cx.stroke();
      cx.beginPath(); cx.rect(hx + 6, hy + 6, hwid - 12, hht - 12); cx.clip();
      waveLine(pal.y, pal.y, hy + hht / 2, hht * .9, hx + 8, hx + hwid - 8);
      cx.restore();
      // retino su tutta l'immagine, più presente quando il brano è pieno
      cx.globalAlpha = .06 + level * .1; cx.fillStyle = halftone; cx.fillRect(-20, -20, W + 40, H + 40); cx.globalAlpha = 1;
      cx.restore();
      // glitch: fette orizzontali spostate e separazione dei canali
      if (glitch > .15 && !reduce) {
        const d = dpr, cwp = cc.width, chp = cc.height;
        cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < 3 + glitch * 6; i++) {
          const y = Math.floor(Math.random() * chp), h = Math.floor((4 + Math.random() * 30) * d), off = Math.floor((Math.random() - .5) * 80 * glitch * d);
          cx.drawImage(cc, 0, y, cwp, h, off, y, cwp, h);
        }
        cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .25 * glitch;
        cx.drawImage(cc, 6 * glitch * d, 0); cx.drawImage(cc, -6 * glitch * d, 0);
        cx.restore();
      }
    },

    // studio di registrazione per la radio (#28): luce ON AIR, microfono che si accende quando la voce parla,
    // schermo con brano e commenti, manopola della radio con la lancetta, mixer e giradischi.
    studio(pal, cyc, dt, playing) {
      const info = getInfo(cyc) || {}, onAir = !!info.onAir && playing;
      const desk = H * .74, mono = px => `600 ${Math.max(9, Math.round(px))}px "JetBrains Mono", monospace`;
      // muro con pannelli fonoassorbenti a piramide, luce calda che pulsa con la cassa
      const wg = cx.createLinearGradient(0, 0, 0, desk);
      wg.addColorStop(0, pal.wall[0]); wg.addColorStop(1, pal.wall[1]);
      cx.fillStyle = wg; cx.fillRect(0, 0, W, H);
      const cell = Math.max(18, Math.min(W, H) / 11);
      for (let y = cell * .3; y < desk - cell * .6; y += cell) for (let x = (Math.floor(y / cell) % 2) * cell / 2 - cell / 2; x < W; x += cell) {
        tri(cx, [x, y], [x + cell * .92, y], [x + cell * .46, y + cell * .46], pal.foam2);
        tri(cx, [x, y + cell * .92], [x + cell * .92, y + cell * .92], [x + cell * .46, y + cell * .46], pal.foam);
      }
      const lamp = cx.createRadialGradient(W * .5, desk * .2, 0, W * .5, desk * .2, W * .6);
      lamp.addColorStop(0, `rgba(255,179,71,${.12 + kick * .1})`); lamp.addColorStop(1, 'rgba(255,179,71,0)');
      cx.fillStyle = lamp; cx.fillRect(0, 0, W, desk);

      // ON AIR
      const ow = Math.min(W * .16, 150), oh = ow * .3, ox = W / 2 - ow / 2, oy = H * .05;
      cx.fillStyle = '#0a0508'; cx.fillRect(ox - 4, oy - 4, ow + 8, oh + 8);
      cx.fillStyle = onAir ? pal.red : '#3a1016';
      if (onAir) { cx.shadowColor = pal.red; cx.shadowBlur = 26 + kick * 20; }
      cx.fillRect(ox, oy, ow, oh); cx.shadowBlur = 0;
      cx.fillStyle = onAir ? '#fff2f2' : '#6e2a33'; cx.font = `700 ${Math.round(oh * .55)}px "Russo One", sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText('ON AIR', W / 2, oy + oh / 2 + 1);

      // schermo: brano, artista, battuta e l'ultimo commento parlato, scritto lettera per lettera
      const sx = W * .3, sw = W * .4, sy = oy + oh + H * .05, sh = desk - sy - H * .06;
      cx.fillStyle = '#0b0b10'; cx.fillRect(sx - 6, sy - 6, sw + 12, sh + 12);
      cx.fillStyle = pal.screen; cx.fillRect(sx, sy, sw, sh);
      cx.save(); cx.beginPath(); cx.rect(sx, sy, sw, sh); cx.clip();
      const fs = Math.min(sh / 7, sw / 22);
      cx.textAlign = 'left'; cx.textBaseline = 'top'; cx.fillStyle = pal.dim; cx.font = mono(fs * .7);
      cx.fillText(info.onAir ? `NOW PLAYING${info.n ? ` · SONG ${info.n}` : ''}` : playing ? 'PLAYING' : 'STANDBY', sx + fs * .6, sy + fs * .5);
      cx.fillStyle = pal.ink; cx.font = `700 ${Math.round(fs * 1.25)}px "Russo One", sans-serif`;
      cx.shadowColor = pal.ink; cx.shadowBlur = 8;
      cx.fillText((info.title || '—').slice(0, 34), sx + fs * .6, sy + fs * 1.4); cx.shadowBlur = 0;
      cx.font = mono(fs * .75); cx.fillStyle = pal.amber;
      cx.fillText([info.artist, info.line].filter(Boolean).join(' · ').slice(0, 60), sx + fs * .6, sy + fs * 3);
      cx.fillStyle = pal.dim;
      if (info.bars) cx.fillText(`BAR ${Math.min(info.bars, Math.floor(info.bar || 0) + 1)} / ${info.bars}${info.bpm ? ` · ${info.bpm} BPM` : ''}`, sx + fs * .6, sy + fs * 4.1);
      if (info.say) {
        const typed = Math.max(0, Math.min(info.say.length, Math.floor(((info.bar || 0) - (info.sayAt || 0)) * 24)));
        cx.fillStyle = '#e8fbff'; cx.font = `italic ${mono(fs * .85).replace('600 ', '600 ')}`;
        cx.fillText(`“${info.say.slice(0, typed)}${typed < info.say.length && Math.floor(performance.now() / 300) % 2 ? '▌' : ''}${typed >= info.say.length ? '”' : ''}`.slice(0, 48), sx + fs * .6, sy + fs * 5.3);
      }
      waveLine(pal.wave, pal.wave, sy + sh - fs * 1.1, fs * .9, sx + 6, sx + sw - 6);
      cx.restore();

      // microfono con l'asta: l'anello si accende mentre la voce parla, le onde escono dalla griglia
      const speaking = playing && info.say && (info.bar - info.sayAt) >= 0 && (info.bar - info.sayAt) < 1.6;
      const mx = W * .15, my = desk * .52, mr = Math.min(W * .045, H * .11);
      cx.strokeStyle = pal.metal; cx.lineWidth = Math.max(3, mr * .12);
      cx.beginPath(); cx.moveTo(mx, my + mr * 1.6); cx.lineTo(mx - mr * .8, desk); cx.moveTo(mx, my + mr * 1.6); cx.lineTo(mx, my + mr * 1.1); cx.stroke();
      if (speaking) for (let i = 1; i <= 3; i++) { const ph = (performance.now() / 600 + i / 3) % 1; cx.strokeStyle = pal.amber; cx.globalAlpha = (1 - ph) * .7; cx.lineWidth = 2; cx.beginPath(); cx.arc(mx, my, mr * (1.2 + ph * 1.6), -1.1, 1.1); cx.stroke(); cx.beginPath(); cx.arc(mx, my, mr * (1.2 + ph * 1.6), Math.PI - 1.1, Math.PI + 1.1); cx.stroke(); }
      cx.globalAlpha = 1;
      cx.fillStyle = '#26212e'; cx.beginPath(); cx.ellipse(mx, my, mr * .7, mr * 1.15, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#3c3548';
      for (let gy = -mr; gy < mr; gy += mr * .22) for (let gx = -mr * .55; gx < mr * .6; gx += mr * .22) if ((gx * gx) / (mr * mr * .45) + (gy * gy) / (mr * mr * 1.25) < 1) cx.fillRect(mx + gx, my + gy, 2, 2);
      cx.strokeStyle = speaking ? pal.amber : '#3a2a1a'; cx.lineWidth = 3;
      if (speaking) { cx.shadowColor = pal.amber; cx.shadowBlur = 18; }
      cx.beginPath(); cx.ellipse(mx, my + mr * .2, mr * .74, mr * .2, 0, 0, Math.PI * 2); cx.stroke(); cx.shadowBlur = 0;
      // filtro antipop
      cx.strokeStyle = 'rgba(160,150,190,.35)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(mx + mr * 1.6, my, mr * .9, 0, Math.PI * 2); cx.stroke();
      cx.fillStyle = 'rgba(40,30,60,.35)'; cx.fill();

      // manopola della radio: scala delle frequenze, la lancetta cerca la stazione e vibra col suono
      const dx = W * .74, dw = W * .22, dy = sy, dh = Math.min(H * .18, sh * .42);
      cx.fillStyle = '#120c08'; cx.fillRect(dx, dy, dw, dh);
      cx.strokeStyle = '#4a3420'; cx.lineWidth = 2; cx.strokeRect(dx, dy, dw, dh);
      cx.fillStyle = pal.amber; cx.font = mono(dh * .16); cx.textAlign = 'center'; cx.textBaseline = 'top';
      for (let f = 88; f <= 108; f += 2) { const x = dx + 8 + (f - 88) / 20 * (dw - 16); cx.globalAlpha = .8; cx.fillRect(x, dy + dh * .55, 1.5, f % 4 === 0 ? dh * .25 : dh * .14); if (f % 4 === 0) cx.fillText(String(f), x, dy + dh * .14); }
      cx.globalAlpha = 1;
      const station = info.title ? 0.15 + hash(info.title.length, (info.n || 1) * 7.3) * .7 : .5;
      const need = Math.max(0, Math.min(1, station + (playing ? Math.sin(cyc * .7) * .01 + (level - .3) * .015 : Math.sin(performance.now() / 2000) * .25)));
      const nx = dx + 8 + need * (dw - 16);
      cx.strokeStyle = pal.red; cx.lineWidth = 2; cx.shadowColor = pal.red; cx.shadowBlur = 8;
      cx.beginPath(); cx.moveTo(nx, dy + 3); cx.lineTo(nx, dy + dh - 3); cx.stroke(); cx.shadowBlur = 0;
      // due VU meter
      const vy = dy + dh + H * .03, vh = Math.min(dh * 1.1, desk - vy - H * .04), vw = dw / 2 - 6;
      for (let k = 0; k < 2; k++) {
        const vx = dx + k * (vw + 12);
        cx.fillStyle = '#f2e6c8'; cx.fillRect(vx, vy, vw, vh);
        cx.strokeStyle = '#2a2018'; cx.lineWidth = 1;
        cx.beginPath(); cx.arc(vx + vw / 2, vy + vh * 1.05, vh * .8, Math.PI * 1.2, Math.PI * 1.8); cx.stroke();
        cx.fillStyle = '#c2272d'; cx.fillRect(vx + vw * .72, vy + vh * .18, vw * .2, 3);
        const v = playing ? Math.min(1, (k ? lv.bass + lv.pad * .5 : lv.kick * .6 + lv.hook * .4 + lv.hats * .3) * .9) : 0;
        const ang = Math.PI * (1.25 + v * .5);
        cx.strokeStyle = '#111'; cx.lineWidth = 1.5;
        cx.beginPath(); cx.moveTo(vx + vw / 2, vy + vh * .98); cx.lineTo(vx + vw / 2 + Math.cos(ang) * vh * .85, vy + vh * .98 + Math.sin(ang) * vh * .85); cx.stroke();
        cx.fillStyle = '#2a2018'; cx.font = mono(vh * .14); cx.textAlign = 'center'; cx.fillText('VU', vx + vw / 2, vy + vh * .55);
      }

      // banco: un fader per strumento (alto quanto suona) e il giradischi
      const dg = cx.createLinearGradient(0, desk, 0, H);
      dg.addColorStop(0, '#26202e'); dg.addColorStop(1, pal.desk);
      cx.fillStyle = dg; cx.fillRect(0, desk, W, H - desk);
      cx.fillStyle = pal.amber; cx.globalAlpha = .5; cx.fillRect(0, desk, W, 2); cx.globalAlpha = 1;
      const CH = ['kick', 'snare', 'hats', 'bass', 'guitar', 'arp', 'pad', 'hook', 'fx', 'riser'];
      const fx0 = W * .06, fw = W * .55, gapF = fw / CH.length, fy0 = desk + (H - desk) * .2, fh = (H - desk) * .6;
      CH.forEach((k, i) => {
        const x = fx0 + i * gapF + gapF / 2;
        cx.fillStyle = '#0b090f'; cx.fillRect(x - 2, fy0, 4, fh);
        const v = playing ? lv[k] : 0, cy2 = fy0 + fh - v * fh;
        cx.fillStyle = v > .05 ? pal.amber : pal.metal; cx.fillRect(x - gapF * .28, cy2 - 4, gapF * .56, 8);
        cx.fillStyle = v > .5 ? '#3dff6a' : '#1d3a24'; cx.beginPath(); cx.arc(x, fy0 - 6, 2.5, 0, Math.PI * 2); cx.fill();
      });
      // giradischi: il disco gira al tempo del brano
      const tx = W * .82, ty = desk + (H - desk) * .5, tr = Math.min((H - desk) * .42, W * .07);
      cx.fillStyle = '#100d14'; cx.fillRect(tx - tr * 1.5, ty - tr * 1.15, tr * 3.2, tr * 2.3);
      spin = (spin + (playing ? dt * (info.bpm || 120) / 120 * 3.5 : 0)) % (Math.PI * 2);
      cx.save(); cx.translate(tx, ty); cx.rotate(spin);
      cx.fillStyle = '#050407'; cx.beginPath(); cx.arc(0, 0, tr, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = 'rgba(255,255,255,.07)'; cx.lineWidth = 1;
      for (let r = tr * .45; r < tr; r += tr * .09) { cx.beginPath(); cx.arc(0, 0, r, 0, Math.PI * 2); cx.stroke(); }
      cx.fillStyle = pal.red; cx.beginPath(); cx.arc(0, 0, tr * .32, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = pal.amber; cx.fillRect(-tr * .05, -tr * .3, tr * .1, tr * .18);
      cx.fillStyle = '#000'; cx.beginPath(); cx.arc(0, 0, tr * .04, 0, Math.PI * 2); cx.fill();
      cx.restore();
      // braccio
      cx.strokeStyle = '#b9b2c6'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(tx + tr * 1.3, ty - tr * .9); cx.lineTo(tx + tr * (playing ? .55 : 1.1), ty + tr * (playing ? .1 : -.1)); cx.stroke();
      cx.fillStyle = '#b9b2c6'; cx.beginPath(); cx.arc(tx + tr * 1.3, ty - tr * .9, 4, 0, Math.PI * 2); cx.fill();
    },

    // palco cyberpunk: ogni strumento disegnato si accende quando suona.
    // Gli strumenti sono disposti in fila con larghezze in unità "u"; lo spazio libero si divide tra gli spazi.
    palco(pal, cyc, dt, playing) {
      const base = Math.min(H * .8, H - 62);
      const ITEMS = [['hats', .75], ['kick', 1.3], ['snare', .8], ['bass', 1.1], ['guitar', 1.5], ['keys', 2.1], ['hook', 1.2], ['fx', .95], ['riser', .6]];
      const totalU = ITEMS.reduce((a, [, w]) => a + w, 0);
      const u = Math.min(W / (totalU + 1.6), H / 3.9);
      const gap = (W - totalU * u) / (ITEMS.length + 1);
      const X = {}; let cur = gap;
      for (const [k, w] of ITEMS) { X[k] = cur + w * u / 2; cur += w * u + gap; }
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
      // muro LED con la forma d'onda di tutti gli strumenti
      const lx0 = W * .14, lx1 = W * .86, ly0 = H * .07, ly1 = H * .3;
      cx.fillStyle = 'rgba(5,3,12,.85)'; cx.fillRect(lx0, ly0, lx1 - lx0, ly1 - ly0);
      cx.strokeStyle = pal.metal; cx.lineWidth = 2; cx.strokeRect(lx0, ly0, lx1 - lx0, ly1 - ly0);
      cx.fillStyle = pal.metal;
      for (let y = ly0 + 4; y < ly1; y += 6) for (let x = lx0 + 4; x < lx1; x += 6) cx.fillRect(x, y, 1.5, 1.5);
      cx.save(); cx.beginPath(); cx.rect(lx0, ly0, lx1 - lx0, ly1 - ly0); cx.clip();
      waveLine(pal.b, pal.b, (ly0 + ly1) / 2, (ly1 - ly0) * .45, lx0 + 4, lx1 - 4);
      cx.restore();
      // luci dall'alto, una per gruppo di strumenti
      cx.save(); cx.globalCompositeOperation = 'lighter';
      [['kick', pal.a, X.kick], ['snare', pal.b, X.snare], ['bass', pal.b, X.bass], ['guitar', pal.c, X.guitar], ['arp', pal.a, X.keys], ['hook', pal.c, X.hook]].forEach(([k, col, x], i) => {
        const ang = Math.sin(cyc * Math.PI / 2 + i * 1.3) * .25, len = base * 1.05, wdt = u * .8;
        const g = cx.createLinearGradient(x, 0, x, len);
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        cx.globalAlpha = .04 + lv[k] * .26; cx.fillStyle = g;
        cx.beginPath(); cx.moveTo(x - 4, 0); cx.lineTo(x + 4, 0); cx.lineTo(x + Math.sin(ang) * len + wdt, len); cx.lineTo(x + Math.sin(ang) * len - wdt, len); cx.closePath(); cx.fill();
      });
      cx.restore();
      // pavimento
      cx.fillStyle = pal.dark; cx.beginPath(); cx.moveTo(W * .02, base); cx.lineTo(W * .98, base); cx.lineTo(W, H); cx.lineTo(0, H); cx.closePath(); cx.fill();
      cx.strokeStyle = pal.a; cx.lineWidth = 1;
      for (let k = 0; k < 6; k++) { const y = base + (H - base) * Math.pow(k / 6, 1.6); cx.globalAlpha = .15 + kick * .5 * (1 - k / 6); cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
      cx.globalAlpha = .4 + kick * .6; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(W * .02, base); cx.lineTo(W * .98, base); cx.stroke();
      cx.globalAlpha = 1;

      const glow = (col, k) => { cx.shadowColor = col; cx.shadowBlur = 4 + lv[k] * 26; };
      const lineCol = (col, k) => lv[k] > .12 ? col : pal.label;
      const stand = (x, y0, y1, w = .14) => { cx.shadowBlur = 0; cx.strokeStyle = pal.metal; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y0); cx.lineTo(x, y1); cx.moveTo(x - u * w, y1); cx.lineTo(x, y1 - u * .1); cx.lineTo(x + u * w, y1); cx.stroke(); };
      const box = (x, y, w, h, col, k) => { glow(col, k); cx.fillStyle = pal.dark; cx.fillRect(x, y, w, h); cx.strokeStyle = lineCol(col, k); cx.lineWidth = 2.5; cx.strokeRect(x, y, w, h); };
      cx.save();

      // --- batteria: hi-hat, cassa, rullante, crash (si accende con gli FX) ---
      const hy = base - u * 1.45, hgap = u * .1 * (1 - lv.hats);
      stand(X.hats, hy, base);
      glow(pal.c, 'hats'); cx.strokeStyle = lineCol(pal.c, 'hats'); cx.lineWidth = 2.5;
      cx.beginPath(); cx.ellipse(X.hats, hy, u * .32, u * .06, 0, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.ellipse(X.hats, hy - hgap - u * .04, u * .32, u * .06, 0, 0, Math.PI * 2); cx.stroke();
      const cry = Math.max(ly1 + u * .3, base - u * 1.75), crx = (X.kick + X.snare) / 2, tilt = -.3 + Math.sin(performance.now() / 40) * lv.fx * .25;
      stand(crx, cry, base - u * 1.25);
      glow(pal.c, 'fx'); cx.strokeStyle = lineCol(pal.c, 'fx'); cx.lineWidth = 2.5;
      cx.beginPath(); cx.ellipse(crx, cry, u * .4, u * .075, tilt, 0, Math.PI * 2); cx.stroke();
      const kr = u * .6 * (1 + lv.kick * .07), ky = base - u * .62;
      glow(pal.a, 'kick');
      const kg = cx.createRadialGradient(X.kick, ky, 0, X.kick, ky, kr);
      kg.addColorStop(0, `rgba(255,46,136,${.15 + lv.kick * .5})`); kg.addColorStop(1, 'rgba(20,10,35,.95)');
      cx.fillStyle = kg; cx.beginPath(); cx.arc(X.kick, ky, kr, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = lineCol(pal.a, 'kick'); cx.lineWidth = 3 + lv.kick * 3; cx.stroke();
      cx.lineWidth = 1.5; cx.beginPath(); cx.arc(X.kick, ky, kr * .62, 0, Math.PI * 2); cx.stroke();
      cx.font = `700 ${Math.round(kr * .38)}px "Russo One", sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = lineCol(pal.a, 'kick'); cx.fillText('CM', X.kick, ky + 1);
      const sy = base - u * 1.02;
      stand(X.snare, sy + u * .16, base);
      glow(pal.b, 'snare'); cx.strokeStyle = lineCol(pal.b, 'snare'); cx.lineWidth = 2.5;
      cx.fillStyle = pal.dark; cx.fillRect(X.snare - u * .32, sy, u * .64, u * .16); cx.strokeRect(X.snare - u * .32, sy, u * .64, u * .16);
      cx.beginPath(); cx.ellipse(X.snare, sy, u * .32, u * .08, 0, 0, Math.PI * 2); cx.fillStyle = `rgba(0,229,255,${lv.snare * .6})`; cx.fill(); cx.stroke();

      // --- cassa del basso ---
      const bw = u * 1.05, bh = u * 1.7, bt = base - bh;
      box(X.bass - bw / 2, bt, bw, bh, pal.b, 'bass');
      [bt + bh * .3, bt + bh * .72].forEach(cyy => {
        const r = u * .3; cx.lineWidth = 2; cx.beginPath(); cx.arc(X.bass, cyy, r, 0, Math.PI * 2); cx.stroke();
        cx.fillStyle = `rgba(0,229,255,${.1 + lv.bass * .55})`; cx.beginPath(); cx.arc(X.bass, cyy, r * (.35 + lv.bass * .35), 0, Math.PI * 2); cx.fill();
      });

      // --- chitarra: testata e cassa 4x12, chitarra sul suo supporto davanti ---
      const aw = u * 1.0, ax = X.guitar + u * .2 - aw / 2, headH = u * .32, cabH = u * 1.2, cabT = base - cabH, headT = cabT - headH - 3;
      box(ax, headT, aw, headH, pal.c, 'guitar');
      for (let i = 0; i < 5; i++) { const kx = ax + aw * (i + 1) / 6; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(kx, headT + headH * .55, u * .045, 0, Math.PI * 2); cx.stroke(); }
      cx.fillStyle = lv.guitar > .12 ? '#ff4040' : '#401010'; cx.fillRect(ax + 6, headT + 5, 5, 5);
      box(ax, cabT, aw, cabH, pal.c, 'guitar');
      for (const [ox, oy] of [[.27, .28], [.73, .28], [.27, .72], [.73, .72]]) {
        const r = u * .2; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(ax + aw * ox, cabT + cabH * oy, r, 0, Math.PI * 2); cx.stroke();
        cx.fillStyle = `rgba(255,225,77,${.08 + lv.guitar * .5})`; cx.beginPath(); cx.arc(ax + aw * ox, cabT + cabH * oy, r * (.35 + lv.guitar * .4), 0, Math.PI * 2); cx.fill();
      }
      // chitarra elettrica appoggiata, leggermente inclinata
      const gx = X.guitar - u * .45, gy = base - u * .5;
      cx.save(); cx.translate(gx, gy); cx.rotate(-.18 + Math.sin(performance.now() / 60) * lv.guitar * .04);
      glow(pal.a, 'guitar'); cx.strokeStyle = lineCol(pal.a, 'guitar'); cx.fillStyle = pal.dark; cx.lineWidth = 2.5;
      const gs = u * .5;
      cx.beginPath(); cx.moveTo(0, -gs * .55);
      cx.bezierCurveTo(gs * .55, -gs * .9, gs * .7, -gs * .2, gs * .45, 0);
      cx.bezierCurveTo(gs * .75, gs * .3, gs * .55, gs * .75, 0, gs * .6);
      cx.bezierCurveTo(-gs * .55, gs * .75, -gs * .75, gs * .3, -gs * .45, 0);
      cx.bezierCurveTo(-gs * .7, -gs * .2, -gs * .55, -gs * .9, 0, -gs * .55);
      cx.closePath(); cx.fill(); cx.stroke();
      cx.fillStyle = lineCol(pal.a, 'guitar');
      cx.fillRect(-gs * .25, gs * .12, gs * .5, gs * .06); cx.fillRect(-gs * .25, -gs * .12, gs * .5, gs * .06);
      cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, -gs * .5); cx.lineTo(0, -gs * 2.1); cx.stroke();
      cx.fillRect(-gs * .12, -gs * 2.45, gs * .24, gs * .38);
      cx.shadowBlur = 0; cx.strokeStyle = `rgba(255,255,255,${.15 + lv.guitar * .7})`; cx.lineWidth = .8;
      for (let i = -1; i <= 1; i++) { cx.beginPath(); cx.moveTo(i * gs * .06, gs * .3); cx.lineTo(i * gs * .03, -gs * 2.1); cx.stroke(); }
      cx.restore();
      stand(gx, base - u * .05, base, .2);

      // --- tastiera (pad) e sequencer (arpeggio) ---
      const kbw = u * 2.05, kbh = u * .4, kbt = base - u * 1.05;
      cx.shadowBlur = 0; cx.strokeStyle = pal.metal; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(X.keys - kbw * .35, kbt + kbh); cx.lineTo(X.keys + kbw * .3, base); cx.moveTo(X.keys + kbw * .35, kbt + kbh); cx.lineTo(X.keys - kbw * .3, base); cx.stroke();
      box(X.keys - kbw / 2, kbt, kbw, kbh, pal.a, 'pad');
      const keys = 13, kw = (kbw - 8) / keys, bar = Math.floor(cyc);
      for (let i = 0; i < keys; i++) {
        cx.fillStyle = hash(i, bar) < lv.pad * .7 ? pal.a : 'rgba(232,228,255,.18)';
        cx.fillRect(X.keys - kbw / 2 + 4 + i * kw + 1, kbt + kbh * .35, kw - 2, kbh * .55);
      }
      const sqt = kbt - u * .6, sqh = u * .34, sqw = kbw * .85;
      box(X.keys - sqw / 2, sqt, sqw, sqh, pal.b, 'arp');
      const active = playing ? Math.floor(cyc * 8) % 8 : -1;
      for (let i = 0; i < 8; i++) {
        const lx = X.keys - sqw / 2 + sqw * (i + .5) / 8, on = i === active;
        cx.fillStyle = on ? (lv.arp > .1 ? pal.b : pal.label) : 'rgba(0,229,255,.12)';
        cx.beginPath(); cx.arc(lx, sqt + sqh / 2, u * .055 * (on ? 1.3 : 1), 0, Math.PI * 2); cx.fill();
      }
      cx.shadowBlur = 0; cx.strokeStyle = pal.metal; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(X.keys, sqt + sqh); cx.lineTo(X.keys, kbt); cx.stroke();

      // --- synth lead (hook) con oscilloscopio ---
      const hw = u * 1.15, hh = u * 1.3, ht = base - hh - u * .25;
      stand(X.hook, ht + hh, base);
      box(X.hook - hw / 2, ht, hw, hh, pal.c, 'hook');
      const scx = X.hook - hw / 2 + u * .1, scw = hw - u * .2, scy = ht + u * .1, sch = hh * .45;
      cx.fillStyle = '#04120f'; cx.fillRect(scx, scy, scw, sch);
      cx.restore(); cx.save();
      cx.beginPath(); cx.rect(scx, scy, scw, sch); cx.clip();
      waveLine(lv.hook > .1 ? pal.c : pal.label, pal.c, scy + sch / 2, sch * 1.6, scx, scx + scw, hookWave);
      cx.restore(); cx.save();
      for (let i = 0; i < 3; i++) {
        const kx2 = X.hook - hw / 2 + hw * (i + .5) / 3, ky2 = ht + hh * .76, r = u * .12, ang = cyc * 2 * lv.hook + i * 2;
        cx.strokeStyle = lineCol(pal.c, 'hook'); cx.lineWidth = 2; cx.beginPath(); cx.arc(kx2, ky2, r, 0, Math.PI * 2); cx.stroke();
        cx.beginPath(); cx.moveTo(kx2, ky2); cx.lineTo(kx2 + Math.cos(ang) * r, ky2 + Math.sin(ang) * r); cx.stroke();
      }

      // --- campionatore FX: voci, rumori, metalli, crash ---
      const fw = u * .85, fh = u * .7, ft = base - u * 1.25;
      stand(X.fx, ft + fh, base);
      box(X.fx - fw / 2, ft, fw, fh, pal.a, 'fx');
      const beat = Math.floor(cyc * 4);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const lit = lv.fx > .1 && hash(r * 3 + c, beat) < lv.fx;
        cx.fillStyle = lit ? pal.a : 'rgba(255,46,136,.14)';
        cx.fillRect(X.fx - fw / 2 + fw * (.12 + c * .27), ft + fh * (.12 + r * .27), fw * .2, fh * .2);
      }

      // --- bobina di Tesla (riser) ---
      const tx = X.riser, ttop = base - u * 2.1;
      cx.shadowBlur = 0; cx.strokeStyle = pal.metal; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(tx - u * .17, base); cx.lineTo(tx - u * .06, ttop + u * .2); cx.lineTo(tx + u * .06, ttop + u * .2); cx.lineTo(tx + u * .17, base); cx.stroke();
      for (let y = ttop + u * .4; y < base; y += u * .16) { cx.beginPath(); cx.moveTo(tx - u * .1, y); cx.lineTo(tx + u * .1, y); cx.stroke(); }
      glow(pal.b, 'riser'); cx.strokeStyle = lineCol(pal.b, 'riser'); cx.lineWidth = 3;
      cx.beginPath(); cx.ellipse(tx, ttop + u * .12, u * .28, u * .09, 0, 0, Math.PI * 2); cx.stroke();
      if (lv.riser > .05) {
        cx.strokeStyle = '#d6f8ff'; cx.lineWidth = 1.5;
        for (let k = 0; k < 1 + lv.riser * 5; k++) {
          let x = tx, y = ttop + u * .1; const ang = Math.random() * Math.PI * 2, len = u * (.5 + lv.riser * 1.3);
          cx.beginPath(); cx.moveTo(x, y);
          for (let st = 1; st <= 6; st++) { x = tx + Math.cos(ang) * len * st / 6 + (Math.random() - .5) * u * .2; y = ttop + u * .1 + Math.sin(ang) * len * st / 6 * .7 + (Math.random() - .5) * u * .2; cx.lineTo(x, y); }
          cx.stroke();
        }
      }
      cx.restore();
      drawEchoes(pal.echo, X.kick, ky, Math.max(W, H) * .5, dt);
      // etichette, tutte sulla stessa riga sotto gli strumenti
      cx.font = `600 ${Math.max(9, Math.round(u * .15))}px "JetBrains Mono", monospace`; cx.textAlign = 'center'; cx.textBaseline = 'top';
      [['HATS', X.hats, ['hats']], ['KICK', X.kick, ['kick']], ['SNARE', X.snare, ['snare']], ['BASS', X.bass, ['bass']], ['GUITAR', X.guitar, ['guitar']],
       ['PAD · ARP', X.keys, ['pad', 'arp']], ['HOOK', X.hook, ['hook']], ['FX', X.fx, ['fx']], ['RISER', X.riser, ['riser']]]
        .forEach(([label, x, ks]) => { cx.fillStyle = ks.some(k => lv[k] > .12) ? '#ffffff' : pal.label; cx.fillText(label, x, base + 6); });
    },
  };

  // equalizzatore del logo: un'asta per strumento
  const eq = [...document.querySelectorAll('.logo-eq i')];
  const EQ = ['kick', 'snare', 'hats', 'bass', 'guitar', 'arp', 'pad', 'hook'];
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
    kick *= Math.exp(-dt * 7); flash *= Math.exp(-dt * 10); glitch *= Math.exp(-dt * 9); shake *= Math.exp(-dt * 12);
    const look = getS().look, pal = PAL[look] || PAL.palco;
    cx.clearRect(0, 0, W, H);
    if (look === 'soul' && soul) soul.draw(cx, W, H, dpr, cyc, playing);
    else { if (soul) soul.hide(); (SCENE_DRAW[look] || SCENE_DRAW.palco)(pal, cyc, dt, playing); }
    if (flash > .02 && !reduce && look !== 'soul') { cx.fillStyle = pal.echo; cx.globalAlpha = flash * .08; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }

    if (logo) logo.style.setProperty('--pulse', kick.toFixed(3));
    eq.forEach((el, i) => el.style.setProperty('--l', (playing ? lv[EQ[i]] : .15 + .1 * Math.sin(now / 400 + i)).toFixed(3)));

    // recording a video: the stage shows the video picture, fitted
    if (target) {
      const cw = cv.width, ch = cv.height, k = Math.min(cw / cc.width, ch / cc.height), w = cc.width * k, h = cc.height * k;
      vcx.setTransform(1, 0, 0, 1, 0, 0); vcx.fillStyle = '#000'; vcx.fillRect(0, 0, cw, ch);
      vcx.drawImage(cc, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    if (afterFrame) afterFrame(cyc, playing);

    $('#readout').textContent = readout(cyc, Math.max(0, step), playing);
    requestAnimationFrame(frame);
  }
  let idle = 0, spin = 0;
  requestAnimationFrame(frame);
  return { setTarget, get canvas() { return cc; } };
}
