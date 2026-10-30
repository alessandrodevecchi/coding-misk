// THROWAWAY PROTOTYPE for the OpenSpec change code-over-visual: mockups and the test video only.
// Not app code: it is injected into the running app page by shots.cjs and rec.cjs, reads the editor text and the
// scheduler's haps, and paints the "Code over" layout with the two widgets on a canvas over the stage.
// Options: window.__covOpts before injection, window.__cov.set({...}) after.
(() => {
  if (window.__cov) return;
  const ed = () => document.querySelector('strudel-editor').editor;
  const O = {
    theme: 'neon', // neon | hw | light
    area: 'left', // left (16:9: code on the left 58%) | full (9:16)
    font: 0, // px; 0 = from the frame height
    edit: true, outline: 'box', // box | fill | off
    caption: '', // a sample caption, drawn where the lane goes in this layout
    lang: 'it',
    grid: { on: true, steps: 16, beats: 4, rows: 'auto', names: 'short', trail: 2, size: 1, style: 'blocks', after: 'drums', bars: 1, extra: [] },
    chroma: { on: true, bars: 2, cols: 40, norm: 'column', ramp: ' .:-=+*#%@', order: 'high', decay: 0.25, labels: true, chord: true, size: 1, from: 'melodic', after: 'melodic' },
    ...(window.__covOpts || {}),
  };
  const PAL = {
    neon: { band: 'rgba(9,7,22,.82)', ink: '#ece9ff', comment: '#8e89b9', string: '#ff7ad9', number: '#7cf2ff', method: '#c3b4ff', label: '#ffd36e', punct: '#bdb8e0', edit: 'rgba(255,46,136,.86)', editInk: '#ffffff', caret: '#ffffff', outline: '#5ff6ff', hit: '#c3b4ff', hitNow: '#5ff6ff', cell: 'rgba(236,233,255,.14)', now: 'rgba(95,246,255,.30)', inv: '#5ff6ff', invInk: '#09071a' },
    hw: { band: 'rgba(27,19,6,.84)', ink: '#ffd38a', comment: '#a8834c', string: '#ffb347', number: '#fff0c9', method: '#ffc56b', label: '#ffe2a8', punct: '#d9b277', edit: 'rgba(255,179,71,.92)', editInk: '#1b1306', caret: '#1b1306', outline: '#fff0c9', hit: '#c98a2e', hitNow: '#fff0c9', cell: 'rgba(255,211,138,.14)', now: 'rgba(255,179,71,.32)', inv: '#ffb347', invInk: '#1b1306' },
    light: { band: 'rgba(238,243,247,.86)', ink: '#14161c', comment: '#6b7280', string: '#0b6e4f', number: '#9a3412', method: '#1d4ed8', label: '#7c2d92', punct: '#374151', edit: 'rgba(16,140,132,.92)', editInk: '#ffffff', caret: '#000000', outline: '#111111', hit: '#9aa3ad', hitNow: '#111111', cell: 'rgba(20,22,28,.10)', now: 'rgba(20,22,28,.85)', inv: '#111111', invInk: '#eef3f7' },
  };
  let gWidth = 0, cWidth = 0;
  const T = { it: { bar: 'battuta', step: 'passo', chord: 'accordo' }, en: { bar: 'bar', step: 'step', chord: 'chord' } };
  const DRUMS = new Set(['kick', 'snare', 'hats', 'clap', 'perc', 'toms', 'ride', 'crash', 'drums', 'break', 'rim']);
  const NOT_MELODIC = new Set([...DRUMS, 'fx', 'riser', 'voice', 'vox', 'narrator', 'noise']);
  const SHORT = { bd: 'bd', sd: 'sd', hh: 'hh', oh: 'oh', cp: 'cp', rim: 'rm', rm: 'rm', lt: 'lt', mt: 'mt', ht: 'ht', cr: 'cr', rd: 'rd', cb: 'cb', perc: 'pc', sh: 'sh' };
  const ORDER = ['bd', 'sd', 'cp', 'rm', 'hh', 'oh', 'lt', 'mt', 'ht', 'cr', 'rd', 'cb', 'sh', 'pc'];
  const PCS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const CHORDS = [['maj7', [0, 4, 7, 11]], ['m7', [0, 3, 7, 10]], ['7', [0, 4, 7, 10]], ['m7b5', [0, 3, 6, 10]], ['', [0, 4, 7]], ['m', [0, 3, 7]], ['dim', [0, 3, 6]], ['sus4', [0, 5, 7]], ['sus2', [0, 2, 7]], ['5', [0, 7]]];

  // ---------- page: the stage fills the window, the overlay canvas sits on it ----------
  const st = document.createElement('style');
  st.textContent = `#stagewrap.cov-full{position:fixed!important;inset:0!important;height:100vh!important;width:100vw!important;z-index:9000;border-radius:0!important;margin:0!important}
  #stagewrap.cov-full .hud{display:none!important} #stagewrap.cov-full #say{display:none!important}
  #cov{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6}
  #cov-title{position:fixed;z-index:9100;left:50%;transform:translateX(-50%);bottom:10px;font:600 20px/1.25 'JetBrains Mono',monospace;color:#fff;background:rgba(0,0,0,.72);padding:5px 14px;border-radius:6px;white-space:nowrap}
  #cov-title:empty{display:none}`;
  document.head.appendChild(st);
  const wrap = document.getElementById('stagewrap');
  wrap.classList.add('cov-full');
  const cv = document.createElement('canvas'); cv.id = 'cov'; wrap.appendChild(cv);
  const title = document.createElement('div'); title.id = 'cov-title'; document.body.appendChild(title);
  const g = cv.getContext('2d');

  // ---------- code tokens ----------
  const TOK = /(\/\/.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b|\.\d+)|(^\s*[_S]?[A-Za-z$][\w$]*:(?=\s))|([A-Za-z_$][\w$]*)(?=\()|([A-Za-z_$][\w$]*)|(\s+)|([^\s])/g;
  function tokens(line, P) {
    const out = []; let m; TOK.lastIndex = 0;
    while ((m = TOK.exec(line))) {
      const c = m[1] ? P.comment : m[2] ? P.string : m[3] ? P.number : m[4] ? P.label : m[5] ? P.method : m[6] ? P.ink : m[7] ? null : P.punct;
      out.push([m[0], c, m.index]);
    }
    return out;
  }
  const lineInst = l => { const m = l.match(/analyze\("([^"]+)"\)/); return m ? m[1] : null; };
  const isPat = l => /^\s*([_S]?\$|[_S]?[A-Za-z][\w$]*):\s/.test(l);

  // ---------- haps ----------
  const sched = () => { try { return ed().repl.scheduler; } catch (e) { return null; } };
  const valOf = h => (h.value && typeof h.value === 'object' ? h.value : { value: h.value });
  const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function midiOf(v) {
    let n = v.note ?? (typeof v.n === 'number' && v.s && /^(sine|sawtooth|square|triangle|supersaw|gm_|piano)/.test(v.s) ? v.n + 60 : undefined);
    if (n === undefined && v.freq) n = 69 + 12 * Math.log2(v.freq / 440);
    if (typeof n === 'string') { const m = n.toLowerCase().match(/^([a-g])([#sb]*)(-?\d+)?$/); if (!m) return null; n = NOTE[m[1]] + (m[2].split('').reduce((a, c) => a + (c === 'b' ? -1 : 1), 0)) + 12 * ((m[3] ? +m[3] : 3) + 1); }
    return typeof n === 'number' && isFinite(n) ? Math.round(n) : null;
  }
  const level = v => Math.max(0.05, Math.min(1, (v.gain ?? 1) * (v.velocity ?? 1) * (v.postgain ?? 1)));
  function query(a, b) { const s = sched(); if (!s || !s.pattern) return []; try { return s.pattern.queryArc(a, b); } catch (e) { return []; } }

  // ---------- typing: the edited line (from text changes, as the video's caret does today) ----------
  let prevCode = '', editAt = -1e9, editLine = -1, editCol = 0;
  function trackEdit(code) {
    if (code === prevCode) return;
    let i = 0; while (i < code.length && i < prevCode.length && code[i] === prevCode[i]) i++;
    let j = 0; while (j < code.length - i && j < prevCode.length - i && code[code.length - 1 - j] === prevCode[prevCode.length - 1 - j]) j++;
    const end = code.length - j; // caret after the inserted text
    const before = code.slice(0, end); editLine = (before.match(/\n/g) || []).length; editCol = end - before.lastIndexOf('\n') - 1;
    if (prevCode) editAt = performance.now();
    prevCode = code;
  }

  // ---------- widgets ----------
  const drumRows = new Map(); // short name -> first seen
  function gridData(now) {
    const G = O.grid, bar = Math.floor(now), steps = G.steps * (G.bars || 1);
    const haps = query(bar, bar + (G.bars || 1)).filter(h => h.hasOnset());
    const hits = new Map();
    for (const h of haps) {
      const v = valOf(h); const inst = v.analyze; const extra = (G.extra || []).includes(inst); if (!extra && !(DRUMS.has(inst) || (!inst && v.bank))) continue;
      const base = String(v.s || inst).replace(/^.*_/, '').replace(/\d+$/, '');
      const key = extra ? inst : G.names === 'short' ? (SHORT[base] || base.slice(0, 2)) : (inst || base);
      if (!drumRows.has(key)) drumRows.set(key, drumRows.size);
      const k = Math.floor((h.whole.begin.valueOf() - bar) * G.steps + 1e-6);
      if (!hits.has(key)) hits.set(key, new Map());
      hits.get(key).set(k, Math.max(hits.get(key).get(k) || 0, level(v)));
    }
    let rows = [...drumRows.keys()];
    rows.sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || drumRows.get(a) - drumRows.get(b));
    if (Array.isArray(G.rows)) rows = G.rows.filter(r => rows.includes(r) || true);
    const step = Math.min(steps - 1, Math.floor((now - bar) * G.steps));
    return { rows, hits, step, steps, bar: bar + 1 };
  }
  function chromaData(now) {
    const C = O.chroma, span = C.bars, dt = span / C.cols, t0 = now - span;
    const haps = query(t0 - C.decay * 4, now + 0.001).filter(h => h.whole);
    const E = Array.from({ length: 12 }, () => new Float32Array(C.cols));
    const nowPcs = new Map();
    for (const h of haps) {
      const v = valOf(h); if (NOT_MELODIC.has(v.analyze)) continue;
      if (C.from !== 'melodic' && Array.isArray(C.from) && !C.from.includes(v.analyze)) continue;
      const m = midiOf(v); if (m === null) continue;
      const pc = ((m % 12) + 12) % 12, L = level(v), b = h.whole.begin.valueOf(), e = h.whole.end.valueOf();
      for (let c = 0; c < C.cols; c++) {
        const a = t0 + c * dt, z = a + dt;
        const on = Math.max(0, Math.min(z, e) - Math.max(a, b)) / dt;
        const tail = a > e ? Math.exp(-(a - e) / Math.max(1e-3, C.decay)) * (a - e < C.decay * 4 ? 1 : 0) : 0;
        E[pc][c] = Math.max(E[pc][c], L * Math.max(on, tail * 0.8));
      }
      if (b <= now && e > now - 0.25) nowPcs.set(pc, Math.max(nowPcs.get(pc) || 0, L) + (m < 55 ? 0.001 * (60 - m) : 0));
    }
    let max = 0.05; for (const r of E) for (const x of r) max = Math.max(max, x);
    if (C.norm === 'column') for (let c = 0; c < C.cols; c++) { // per column, between the weakest and the strongest note, ^1.7
      let lo = 1e9, hi = 0; for (let p = 0; p < 12; p++) { lo = Math.min(lo, E[p][c]); hi = Math.max(hi, E[p][c]); }
      for (let p = 0; p < 12; p++) E[p][c] = hi < 0.02 ? 0 : max * Math.pow((E[p][c] - lo) / Math.max(1e-6, hi - lo), 1.7);
    }
    // the chord: the largest chord shape inside the notes sounding now; the root preferred low
    const pcs = [...nowPcs.keys()]; let chord = null;
    const low = pcs.length ? [...nowPcs.entries()].sort((a, b) => b[1] - a[1])[0][0] : -1;
    for (const [name, iv] of CHORDS) for (const r of pcs) {
      if (!iv.every(i => pcs.includes((r + i) % 12))) continue;
      const score = iv.length * 10 + (r === low ? 1 : 0);
      if (!chord || score > chord.score) chord = { name: PCS[r] + name, score, set: iv.map(i => (r + i) % 12) };
    }
    return { E, max, chord, pcs };
  }

  function drawGrid(x, y, P, fs) {
    const G = O.grid, D = gridData(sched().now()), cw = fs * 0.62 * G.size, rh = fs * 0.95 * G.size;
    const lab = fs * 0.62 * 3, w = lab + D.steps * cw + cw; gWidth = w + fs * 0.6; const rowsN = Math.max(1, D.rows.length), h = rh * (rowsN + 2.2);
    g.fillStyle = P.band; g.fillRect(x - fs * 0.3, y, w + fs * 0.6, h);
    g.font = `${Math.round(fs * 0.62 * G.size)}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
    // beats on top
    g.fillStyle = P.comment;
    for (let b = 0; b < G.beats * (G.bars || 1); b++) g.fillText(String((b % G.beats) + 1), x + lab + (b * D.steps / (G.beats * (G.bars || 1))) * cw, y + rh * 0.6);
    const top = y + rh * 1.2;
    D.rows.forEach((r, i) => {
      const yy = top + i * rh;
      g.fillStyle = P.ink; g.fillText(r, x, yy + rh / 2);
      const hs = D.hits.get(r) || new Map();
      for (let k = 0; k < D.steps; k++) {
        const xx = x + lab + k * cw, beat = k % (D.steps / (G.beats * (G.bars || 1))) === 0;
        const hit = hs.get(k), cur = k === D.step, past = k < D.step && D.step - k <= G.trail;
        if (G.style === 'text') {
          if (cur) { g.fillStyle = P.hitNow; g.fillRect(xx, yy, cw * 0.98, rh); }
          g.fillStyle = cur ? P.invInk : hit ? (k < D.step ? P.hitNow : P.hit) : P.comment;
          g.fillText(hit ? (k <= D.step ? '█' : '▒') : (beat ? '·' : '·'), xx + cw * 0.2, yy + rh / 2);
          continue;
        }
        if (cur) { g.fillStyle = P.now; g.fillRect(xx, yy, cw * 0.92, rh); }
        if (hit) {
          g.globalAlpha = cur ? 1 : k < D.step ? (past ? 1 : 0.75) : 0.3;
          g.fillStyle = cur || past ? P.hitNow : P.hit; g.fillRect(xx + cw * 0.08, yy + rh * 0.14, cw * 0.76, rh * 0.72); g.globalAlpha = 1;
        } else { g.fillStyle = P.cell; g.fillRect(xx + cw * 0.36, yy + rh * 0.44, cw * 0.18, rh * 0.12); }
        if (beat) { g.fillStyle = P.cell; g.fillRect(xx - 1, yy, 1, rh); }
      }
    });
    g.fillStyle = P.comment; g.font = `${Math.round(fs * 0.55 * G.size)}px "JetBrains Mono", monospace`;
    g.fillText(`${T[O.lang].bar} ${D.bar} · ${T[O.lang].step} ${D.step + 1}/${D.steps}`, x, top + rowsN * rh + rh * 0.5);
    return h;
  }
  function drawChroma(x, y, P, fs) {
    const C = O.chroma, D = chromaData(sched().now()), cw = fs * 0.6 * C.size, rh = fs * 0.82 * C.size;
    const lab = cw * 3.2, w = lab + C.cols * cw; cWidth = w + fs * 0.6; const h = rh * (12 + (C.chord ? 1.6 : 0.4));
    g.fillStyle = P.band; g.fillRect(x - fs * 0.3, y, w + fs * 0.6, h);
    g.font = `${Math.round(fs * 0.6 * C.size)}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
    const order = C.order === 'high' ? [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const ramp = C.ramp;
    order.forEach((pc, i) => {
      const yy = y + rh * 0.3 + i * rh, inChord = C.chord && D.chord && D.chord.set.includes(pc);
      if (C.labels) {
        if (inChord) { g.fillStyle = P.inv; g.fillRect(x - 2, yy, cw * 2.3, rh); g.fillStyle = P.invInk; } else g.fillStyle = P.comment;
        g.fillText(PCS[pc], x, yy + rh / 2);
      }
      let s = '';
      for (let c = 0; c < C.cols; c++) { const e = D.E[pc][c] / D.max; s += e < 0.04 ? ' ' : ramp[Math.min(ramp.length - 1, Math.max(1, Math.round(e * (ramp.length - 1))))]; }
      g.fillStyle = inChord ? P.hitNow : P.ink; g.fillText(s, x + lab, yy + rh / 2);
    });
    if (C.chord) { g.fillStyle = P.comment; g.font = `${Math.round(fs * 0.55 * C.size)}px "JetBrains Mono", monospace`; g.fillText(`${T[O.lang].chord} ${D.chord ? D.chord.name : '—'}`, x, y + rh * 12.9); }
    return h;
  }

  // ---------- frame ----------
  let scroll = 0, instAt = 0, lineInsts = new Map(), boxes = {};
  function frame() {
    requestAnimationFrame(frame);
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    g.clearRect(0, 0, W, H); boxes = {};
    let code = ''; try { code = ed().code || ''; } catch (e) { return; }
    trackEdit(code);
    const P = PAL[O.theme], s = sched(), now = s ? s.now() : 0;
    const full = O.area === 'full', fs = O.font || Math.round((full ? W / 34 : H / 40));
    const lh = Math.round(fs * 1.42), cwid = fs * 0.6;
    const x0 = full ? Math.round(W * 0.05) : Math.round(W * 0.035), areaW = full ? W * 0.9 : W * 0.58;
    const yTop = Math.round(H * (full ? 0.035 : 0.06)), yBot = H * (full ? 0.86 : 0.94);
    const cols = Math.floor(areaW / cwid);
    g.font = `${fs}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
    const lines = code.split('\n');
    // blocks: where the widgets go (after the last drum block, after the last melodic block)
    // instrument of each line: from the haps of this bar and their code locations (the shown code has no analyze())
    if (performance.now() - instAt > 300 && s && s.started) {
      instAt = performance.now(); const st0 = [0]; for (let k = 0; k < code.length; k++) if (code[k] === '\n') st0.push(k + 1);
      const m = new Map(), b0 = Math.floor(now);
      for (const h of query(b0 - 1, b0 + 1)) { const v = valOf(h); if (!v.analyze) continue; for (const loc of (h.context && h.context.locations) || []) { let li = 0; while (li + 1 < st0.length && st0[li + 1] <= loc.start) li++; m.set(li, v.analyze); } }
      lineInsts = m;
    }
    const mutedLine = []; { let m = false; lines.forEach((l, i) => { if (isPat(l)) m = /^\s*_/.test(l); else if (!/^\s+\./.test(l)) m = false; mutedLine[i] = m; }); }
    const insts = lines.map((l, i) => lineInst(l) || lineInsts.get(i) || null);
    // a pattern line's continuation lines carry its instrument
    for (let i = 0; i < lines.length; i++) if (!isPat(lines[i]) && /^\s+\./.test(lines[i])) { let j = i; while (j > 0 && !isPat(lines[j])) j--; if (!insts[j]) insts[j] = insts[i]; }
    const blockEnd = test => { let last = -1; lines.forEach((l, i) => { if (isPat(l) && test(insts[i])) { let j = i; while (j + 1 < lines.length && /^\s+\./.test(lines[j + 1])) j++; last = j; } }); return last; };
    const afterDrums = O.grid.on ? blockEnd(n => DRUMS.has(n)) : -1;
    const afterMel = O.chroma.on ? blockEnd(n => (Array.isArray(O.chroma.from) ? O.chroma.from.includes(n) : n && !NOT_MELODIC.has(n))) : -1;
    // rows: text lines and widget blocks
    const rows = [];
    lines.forEach((l, i) => { rows.push({ i, l }); if (i === afterDrums) rows.push({ w: 'grid' }); if (i === afterMel) rows.push({ w: 'chroma' }); });
    const hOf = r => (r.w === 'grid' ? lh * (Math.max(2, drumRows.size) + 2.6) * O.grid.size * 0.68 + lh * 0.3 : r.w === 'chroma' ? lh * 14.4 * O.chroma.size * 0.58 + lh * 0.3 : lh);
    // scroll so the edited line (or the last line) sits in the upper third
    const editing = O.edit && performance.now() - editAt < 1400;
    const focus = editing ? editLine : lines.length - 1;
    let yAcc = 0, focusY = 0, total = 0;
    for (const r of rows) { if (r.i === focus) focusY = yAcc; yAcc += hOf(r); } total = yAcc;
    const room = yBot - yTop;
    const want = total <= room ? 0 : Math.max(0, Math.min(total - room, focusY - room / 3));
    scroll += (want - scroll) * 0.12;
    // active notes: haps sounding now with their code locations
    const marks = new Map();
    if (O.outline !== 'off' && s && s.started) {
      const starts = [0]; for (let k = 0; k < code.length; k++) if (code[k] === '\n') starts.push(k + 1);
      for (const h of query(now, now + 1e-4)) {
        if (!h.whole || h.whole.begin > now || h.whole.end <= now) continue;
        for (const loc of (h.context && h.context.locations) || []) {
          let li = 0; while (li + 1 < starts.length && starts[li + 1] <= loc.start) li++;
          if (!marks.has(li)) marks.set(li, []);
          marks.get(li).push([loc.start - starts[li], loc.end - starts[li]]);
        }
      }
    }
    g.save(); g.beginPath(); g.rect(0, yTop - 4, W, room + 8); g.clip();
    let y = yTop - scroll;
    for (const r of rows) {
      const h = hOf(r);
      if (y + h < yTop - lh || y > yBot + lh) { y += h; continue; }
      if (r.w === 'grid') { const gh = drawGrid(x0, y + lh * 0.15, P, fs); boxes.grid = [x0 - fs * 0.3, y + lh * 0.15, gWidth, gh]; y += h; continue; }
      if (r.w === 'chroma') { const ch = drawChroma(x0, y + lh * 0.15, P, fs); boxes.chroma = [x0 - fs * 0.3, y + lh * 0.15, cWidth, ch]; y += h; continue; }
      g.font = `${fs}px "JetBrains Mono", monospace`; g.textBaseline = 'middle';
      let text = r.l.replace(/\t/g, '  ');
      if (!text.trim()) { y += h; continue; } // empty line: no band, the visual shows through
      if (text.length > cols) text = text.slice(0, cols - 1) + '…';
      const isEdit = editing && r.i === editLine; if (isEdit) boxes.edit = [0, y, W, lh];
      const comment = /^\s*\/\//.test(text) || mutedLine[r.i];
      const ind = text.match(/^\s*/)[0].length;
      g.fillStyle = isEdit ? P.edit : P.band;
      g.fillRect(x0 + ind * cwid - fs * 0.25, y + 1, (text.length - ind) * cwid + fs * 0.5 + (isEdit ? cwid : 0), lh - 2);
      for (const [t, c, at] of tokens(text, P)) {
        if (!c) continue;
        g.globalAlpha = comment ? 0.85 : 1;
        g.fillStyle = isEdit ? P.editInk : comment ? P.comment : c;
        g.fillText(t, x0 + at * cwid, y + lh / 2 + 1);
      }
      g.globalAlpha = 1;
      for (const [a, b] of marks.get(r.i) || []) {
        if (a >= text.length) continue;
        const bx = x0 + a * cwid - 2, bw = (Math.min(b, text.length) - a) * cwid + 4;
        if (O.outline === 'fill') { g.globalAlpha = 0.45; g.fillStyle = P.outline; g.fillRect(bx, y + 3, bw, lh - 6); g.globalAlpha = 1; }
        else { g.strokeStyle = isEdit ? P.editInk : P.outline; g.lineWidth = Math.max(2, fs / 12); g.strokeRect(bx, y + 3, bw, lh - 6); }
      }
      if (isEdit && Math.floor(performance.now() / 500) % 2 === 0) {
        const cx = x0 + Math.min(editCol, cols) * cwid;
        g.fillStyle = P.caret; g.fillRect(cx, y + 3, cwid, lh - 6);
        const ch = text[editCol]; if (ch) { g.fillStyle = P.edit; g.fillText(ch, cx, y + lh / 2 + 1); }
      }
      y += h;
    }
    g.restore();
    if (O.caption) {
      const cfs = Math.round(fs * 1.05); g.font = `700 ${cfs}px "JetBrains Mono", monospace`;
      const tw = g.measureText(O.caption).width + cfs;
      const cx = full ? W / 2 : W * 0.795, cy = full ? H * 0.925 : H * 0.86;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(cx - tw / 2, cy - cfs * 0.8, tw, cfs * 1.6);
      g.fillStyle = '#4fe3ff'; g.textAlign = 'center'; g.fillText(O.caption, cx, cy); g.textAlign = 'left';
    }
  }
  requestAnimationFrame(frame);
  window.__cov = { O, set: p => { if (p.grid && (p.grid.names || p.grid.extra)) drumRows.clear(); for (const [k, v] of Object.entries(p)) { if (v && typeof v === 'object' && !Array.isArray(v) && O[k] && typeof O[k] === 'object') Object.assign(O[k], v); else O[k] = v; } }, title: s => { title.textContent = s || ''; }, boxes: () => boxes, editing: () => performance.now() - editAt < 700, resetRows: () => drumRows.clear() };
})();
