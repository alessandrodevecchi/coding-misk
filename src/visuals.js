import { KEYS, PROGS, chordName } from './music.js';

// Visual synthwave su canvas, sincronizzati con lo scheduler di Strudel e con l'analizzatore audio.
export function startVisuals({ getS, getMode, isPlaying, sched }) {
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
  };
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const STARS = Array.from({ length: 260 }, () => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, z: rnd() }));
  const SKYSTARS = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), r: rnd() }));
  const noise = x => (Math.sin(x) + .5 * Math.sin(2.3 * x + 1.7) + .25 * Math.sin(5.1 * x + .3)) / 1.75;

  let wave = new Float32Array(256), level = 0, low = 0, kick = 0, flash = 0, lastStep = -1, lastT = performance.now();
  const echoes = [], blips = [];
  let idleCycle = 0;

  function readAudio() {
    const fn = window.getAnalyzerData;
    if (!isPlaying() || typeof fn !== 'function') { for (let i = 0; i < wave.length; i++) wave[i] *= .9; level *= .9; low *= .9; return; }
    try {
      const t = fn('time', 1);
      if (t && t.length) {
        const step = Math.floor(t.length / wave.length); let sum = 0;
        for (let i = 0; i < wave.length; i++) { const v = t[i * step] || 0; wave[i] = v; sum += v * v; }
        level = level * .7 + Math.sqrt(sum / wave.length) * 3 * .3;
      }
      const fq = fn('frequency', 1);
      if (fq && fq.length) {
        let e = 0; for (let i = 1; i < 7; i++) e += Math.max(0, (fq[i] + 90) / 70);
        low = low * .6 + (e / 6) * .4;
      }
    } catch (e) {}
}

  function onStep(step) {
    document.querySelectorAll('.step.now').forEach(b => b.classList.remove('now'));
    if (step >= 0) document.querySelectorAll(`.step[data-i="${step}"]`).forEach(b => b.classList.add('now'));
    if (step < 0) return;
    const d = getS().drums;
    const hit = id => getMode() === 'comp' && d.on && !d.rows[id].mute && d.rows[id].steps[step] === 'x';
    const freeBeat = getMode() !== 'comp' && step % 4 === 0;
    if (hit('bd') || freeBeat) { kick = 1; echoes.push({ r: 0, a: 1 }); }
    if (hit('cp') || hit('sd')) { flash = 1; blips.push({ ang: Math.random() * 6.283, rad: .55 + Math.random() * .2, a: 1, big: true }); }
    if (hit('hh') || hit('oh')) blips.push({ ang: Math.random() * 6.283, rad: .75 + Math.random() * .2, a: 1, big: false });
    if (echoes.length > 12) echoes.shift();
    if (blips.length > 40) blips.shift();
}

  function grid(pal, horizon, scroll) {
    cx.fillStyle = pal.floor; cx.fillRect(0, horizon, W, H - horizon);
    cx.strokeStyle = pal.grid; cx.lineWidth = 1;
    const N = 14;
    for (let k = 0; k < N; k++) {
      const t = (k + scroll) / N, y = horizon + (H - horizon) * Math.pow(t, 2.4);
      cx.globalAlpha = Math.min(1, t * 1.6) * .9; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke();
    }
    cx.globalAlpha = .7;
    for (let i = -16; i <= 16; i++) {
      cx.beginPath(); cx.moveTo(W / 2 + i * W * .02, horizon); cx.lineTo(W / 2 + i * W * .16, H); cx.stroke();
    }
    cx.globalAlpha = 1;
}
  function sky(pal, horizon) {
    const g = cx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, pal.sky[0]); g.addColorStop(.6, pal.sky[1]); g.addColorStop(1, pal.sky[2]);
    cx.fillStyle = g; cx.fillRect(0, 0, W, horizon);
    cx.fillStyle = '#fff';
    for (const s of SKYSTARS) { if (s.y * horizon > horizon * .85) continue; cx.globalAlpha = .2 + s.r * .5; cx.fillRect(s.x * W, s.y * horizon * .85, s.r * 1.6 + .4, s.r * 1.6 + .4); }
    cx.globalAlpha = 1;
}
  function waveLine(pal, y0, amp) {
    cx.save(); cx.strokeStyle = pal.wave; cx.lineWidth = 2; cx.shadowColor = pal.grid; cx.shadowBlur = 14;
    cx.beginPath();
    for (let i = 0; i < wave.length; i++) { const x = i / (wave.length - 1) * W, y = y0 + wave[i] * amp; i ? cx.lineTo(x, y) : cx.moveTo(x, y); }
    cx.stroke(); cx.restore();
}
  function waveRing(pal, x0, y0, r, amp) {
    cx.save(); cx.strokeStyle = pal.wave; cx.lineWidth = 1.6; cx.shadowColor = pal.grid; cx.shadowBlur = 12;
    cx.beginPath();
    for (let i = 0; i <= wave.length; i++) { const a = i / wave.length * Math.PI * 2, rr = r + wave[i % wave.length] * amp; const x = x0 + Math.cos(a) * rr, y = y0 + Math.sin(a) * rr; i ? cx.lineTo(x, y) : cx.moveTo(x, y); }
    cx.closePath(); cx.stroke(); cx.restore();
}
  function drawEchoes(pal, x0, y0, maxR, dt) {
    cx.save(); cx.strokeStyle = pal.echo;
    for (const e of echoes) {
      e.r += dt * maxR * 1.4; e.a -= dt * 1.1;
      if (e.a <= 0) continue;
      cx.globalAlpha = e.a * .8; cx.lineWidth = 1 + e.a * 3;
      cx.beginPath(); cx.arc(x0, y0, e.r, 0, Math.PI * 2); cx.stroke();
    }
    cx.restore();
    while (echoes.length && echoes[0].a <= 0) echoes.shift();
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
      for (let i = 0; i < 7; i++) { const y = hz - sunR * .15 + i * sunR * .14 - (cyc * 8 % 1) * sunR * .14, h = 2 + i * 1.6; cx.fillRect(W / 2 - sunR, y, sunR * 2, h); }
      cx.restore();
      drawEchoes(pal, W / 2, hz - sunR * .15, Math.max(W, H) * .6, dt);
      grid(pal, hz, (cyc * 4) % 1);
      waveLine(pal, hz - 2, H * .3);
    },
    montagne(pal, cyc, dt) {
      const hz = H * .66;
      sky(pal, hz);
      const mx = W * .78, my = H * .2, mr = Math.min(W, H) * .07;
      cx.save(); cx.fillStyle = pal.sun[0]; cx.shadowColor = pal.sun[2]; cx.shadowBlur = 30 + kick * 30; cx.beginPath(); cx.arc(mx, my, mr, 0, Math.PI * 2); cx.fill(); cx.restore();
      drawEchoes(pal, mx, my, Math.max(W, H) * .5, dt);
      const layers = [[.22, .35, .05, .35], [.3, .55, .12, .6], [.4, .9, .25, 1]];
      layers.forEach(([amp, fr, sp, alpha], li) => {
        const pts = [], stepX = W / 48;
        for (let i = 0; i <= 48; i++) {
          const x = i * stepX, wv = li === 2 ? wave[Math.floor(i / 48 * (wave.length - 1))] * H * .5 : 0;
          const y = hz - (noise(i * fr * .35 + cyc * sp + li * 9) * .5 + .55) * H * amp * (1 + (li === 2 ? low * .25 : 0)) - Math.abs(wv);
          pts.push([x, y]);
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
      const cxm = W / 2, cym = H / 2;
      cx.strokeStyle = '#fff';
      for (const s of STARS) {
        const pz = s.z; s.z -= dt * speed; if (s.z <= .02) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; continue; }
        const k = .5 / s.z, kp = .5 / pz;
        const x = cxm + s.x * W * k, y = cym + s.y * H * k, xp = cxm + s.x * W * kp, yp = cym + s.y * H * kp;
        cx.globalAlpha = Math.min(1, (1 - s.z) * 1.4); cx.lineWidth = (1 - s.z) * 2.2;
        cx.beginPath(); cx.moveTo(xp, yp); cx.lineTo(x, y); cx.stroke();
      }
      cx.globalAlpha = 1;
      const px = W * .5, py = H * .52, pr = Math.min(W, H) * .17 * (1 + kick * .04);
      drawEchoes(pal, px, py, Math.max(W, H) * .6, dt);
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
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; cx.beginPath(); cx.moveTo(ox, oy); cx.lineTo(ox + Math.cos(a) * R, oy + Math.sin(a) * R); cx.globalAlpha = .12; cx.stroke(); }
      const sw = (cyc % 1) * Math.PI * 2 - Math.PI / 2;
      for (let j = 0; j < 40; j++) {
        const a = sw - j * .025; cx.globalAlpha = (1 - j / 40) * .5; cx.lineWidth = 3;
        cx.beginPath(); cx.moveTo(ox, oy); cx.lineTo(ox + Math.cos(a) * R, oy + Math.sin(a) * R); cx.stroke();
      }
      cx.globalAlpha = 1;
      drawEchoes(pal, ox, oy, R, dt);
      for (const b of blips) {
        b.a -= dt * .6; if (b.a <= 0) continue;
        const x = ox + Math.cos(b.ang) * R * b.rad, y = oy + Math.sin(b.ang) * R * b.rad;
        cx.globalAlpha = b.a; cx.fillStyle = b.big ? pal.echo : pal.wave;
        cx.beginPath(); cx.arc(x, y, b.big ? 5 : 3, 0, Math.PI * 2); cx.fill();
      }
      cx.globalAlpha = 1;
      while (blips.length && blips[0].a <= 0) blips.shift();
      waveRing(pal, ox, oy, R * .28, R * .5);
      cx.fillStyle = pal.wave; cx.beginPath(); cx.arc(ox, oy, 3 + kick * 4, 0, Math.PI * 2); cx.fill();
    },
  };

  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    readAudio();
    const sc = sched(), playing = isPlaying();
    let cyc;
    if (playing) cyc = sc.now();
    else { idleCycle += dt * (reduce ? .03 : .12); cyc = idleCycle; }
    const step = playing ? Math.floor(cyc * 16) % 16 : -1;
    if (step !== lastStep) { lastStep = step; onStep(step); }
    if (!playing) { echoes.length = 0; }
    kick *= Math.exp(-dt * 7); flash *= Math.exp(-dt * 10);
    const pal = PAL[getS().look] || PAL.tramonto;
    cx.clearRect(0, 0, W, H);
    SCENE_DRAW[getS().look] ? SCENE_DRAW[getS().look](pal, cyc, dt) : SCENE_DRAW.tramonto(pal, cyc, dt);
    if (flash > .02 && !reduce) { cx.fillStyle = pal.echo; cx.globalAlpha = flash * .08; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }

    const btn = $('#play');
    if (btn.getAttribute('aria-pressed') !== String(playing)) { btn.setAttribute('aria-pressed', playing); btn.textContent = playing ? '■ Stop' : '▶ Play'; }
    const t = (KEYS.find(k => k[0] === getS().key) || [0, 0])[1];
    const names = PROGS[getS().prog][1].map(c => chordName(c, t));
    const bar = Math.floor(cyc);
    $('#readout').textContent = playing
      ? `${getS().bpm} BPM  ·  battuta ${String(bar + 1).padStart(3, '0')}.${(step >> 2) + 1}\n${getMode() === 'comp' ? names.map((n, i) => i === bar % 4 ? `[${n}]` : ` ${n} `).join('') : $('#src').textContent}`
      : `${getS().bpm} BPM  ·  in pausa\npremi Play o Ctrl+Enter`;
    requestAnimationFrame(frame);
}

  requestAnimationFrame(frame);
}
