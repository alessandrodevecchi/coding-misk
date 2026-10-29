// Code widgets in the fast video (code-widgets D11, tasks 5.3, 5.4): the fast video renders offline, so no widget of the
// page draws. Note widgets (pianoroll, punchcard, spiral, pitchwheel) are drawn from the notes of their line, which the
// render page sends back by line; scope and spectrum from the audio of their instrument alone (one extra render each), or
// from the whole song's wave when the export falls back (the "Real scope and spectrum" setting). A frame depends only on
// its time, as every fast video frame does; the spectrum scrolls frame after frame, as Strudel's does.

// the instrument of each line with a scope or spectrum, from the code shown and the code evaluated: the line's own visual,
// else the hidden mixer's entry for the line (`miskMix(x, [[from, to, { analyze: '…' }], …])`)
const CALL = /\._(scope|pianoroll|punchcard|spectrum|spiral|pitchwheel)\(/;
const NOTE = ['pianoroll', 'punchcard', 'spiral', 'pitchwheel'];
// a widget call at the end of a line (one level of nested brackets), with its line break before it
const STRIP = /(?:[ \t]*\n[ \t]*)?\._(?:scope|pianoroll|punchcard|spectrum|spiral|pitchwheel)\((?:[^()]|\([^()]*\))*\)/g;
export const lineKey = text => text.replace(STRIP, '').replace(/\s+/g, '');
function chains(code) {
  const out = []; let pos = 0;
  for (const l of code.split('\n')) {
    if (out.length && /^\s+(\.|\/\/ \.)/.test(l) && !/^\s*\/\//.test(out[out.length - 1].text.split('\n')[0])) { const c = out[out.length - 1]; c.text += `\n${l}`; c.b = pos + l.length; }
    else out.push({ text: l, a: pos, b: pos + l.length });
    pos += l.length + 1;
  }
  return out.filter(c => /^\s*[_S]?\$:/.test(c.text));
}
// the lines of a code with a widget call: [{ a, b, key, type }]
export function widgetLines(code) {
  return chains(code || '').flatMap(c => { const m = c.text.match(CALL); return m ? [{ a: c.a, b: c.b, key: lineKey(c.text), type: m[1] }] : []; });
}
// the places of the lines of a code whose key is in keys (a block's code made without the widget calls)
export function linesByKey(code, keys) {
  return chains(code || '').flatMap(c => { const key = lineKey(c.text); return keys.has(key) ? [{ a: c.a, b: c.b, key }] : []; });
}
// the instrument of a line: its visual written in it, or the hidden mixer's entry that covers it
export function instrumentOfLine(text, a, run) {
  const own = text.match(/\.(?:analyze|chan)\(\s*["']([\w-]+)["']\s*\)/);
  if (own) return own[1];
  if (!run) return null;
  for (const m of run.matchAll(/\[(\d+),(\d+),\{([^{}]*)\}\]/g)) if (a >= +m[1] && a < +m[2]) { const x = m[3].match(/analyze:'([\w-]+)'/); if (x) return x[1]; }
  return null;
}
// the note widgets and the scope and spectrum instruments of a fast video's segments
// → { noteKeys: Set, instOf: Map(key → instrument), instruments: [..] }
export function widgetPlan(segments) {
  const noteKeys = new Set(), instOf = new Map();
  for (const s of segments) for (const w of widgetLines(s.code)) {
    if (NOTE.includes(w.type)) noteKeys.add(w.key);
    else { const i = instrumentOfLine(s.code.slice(w.a, w.b), w.a, s.run || null); if (i) instOf.set(w.key, i); }
  }
  return { noteKeys, instOf, instruments: [...new Set(instOf.values())] };
}

// a small DFT of n samples → magnitudes in dB for the bins 1 … n/2
function spectrumOf(x) {
  const n = x.length, out = new Float32Array(n / 2);
  for (let k = 1; k <= n / 2; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)), a = (2 * Math.PI * k * i) / n; re += x[i] * w * Math.cos(a); im -= x[i] * w * Math.sin(a); }
    out[k - 1] = 20 * Math.log10(Math.sqrt(re * re + im * im) / n + 1e-9);
  }
  return out;
}

// notes: key → [[begin, end, pitch, level]] (cycles); waves: instrument → { sr, data } (mono, the instrument alone);
// instOf: key → instrument; S: the code widgets' settings; P: colours { ink, muted, a1, a2 }
// → { canvas(type, index, key, cyc, t, master) }: a canvas with the widget at that moment (master: the song's wave, for
// the fallback)
export function fastWidgets({ notes = {}, waves = {}, instOf = new Map(), S, P }) {
  const cache = new Map(), Z = S.sizes, full = S.notes === 'full', DPR = 2;
  const canvasFor = (id, w, h) => {
    let c = cache.get(id);
    if (!c || c.cssW !== w || c.cssH !== h) {
      c = document.createElement('canvas'); c.width = w * DPR; c.height = h * DPR; c.style.width = `${w}px`; c.style.height = `${h}px`; c.cssW = w; c.cssH = h;
      cache.set(id, c);
    }
    return c;
  };
  const window = (list, cyc, span) => list.filter(n => n[1] > cyc - span / 2 && n[0] < cyc + span / 2);
  function roll(c, list, cyc, punch) {
    const g = c.getContext('2d'), W = c.width, H = c.height, span = 4;
    g.clearRect(0, 0, W, H);
    // fold: only the pitches used by the line, low at the bottom
    const pitches = [...new Set(list.map(n => n[2]))].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
    const rows = Math.max(1, pitches.length), rh = H / rows;
    const shown = window(list, cyc, span);
    // (for the checks: the most notes a note widget has drawn at once)
    globalThis.codingMiskFastNotes = Math.max(globalThis.codingMiskFastNotes || 0, shown.length);
    for (const n of shown) {
      const x = ((n[0] - (cyc - span / 2)) / span) * W, w = Math.max(2, ((n[1] - n[0]) / span) * W), y = H - (pitches.indexOf(n[2]) + 1) * rh;
      const on = n[0] <= cyc && cyc < n[1];
      g.globalAlpha = full ? 1 : Math.max(0, Math.min(1, n[3]));
      g.fillStyle = on ? P.a1 : P.muted;
      if (punch) { g.beginPath(); g.arc(x + w / 2, y + rh / 2, Math.min(w, rh) * 0.4, 0, Math.PI * 2); g.fill(); } else g.fillRect(x, y + 1, w - 1, Math.max(1, rh - 2));
    }
    g.globalAlpha = 1; g.fillStyle = P.ink; g.fillRect(W / 2, 0, 1.5 * DPR, H);
  }
  function wheel(c, list, cyc) {
    const g = c.getContext('2d'), W = c.width, H = c.height, r = Math.min(W, H) * 0.42;
    g.clearRect(0, 0, W, H); g.strokeStyle = P.muted; g.lineWidth = DPR; g.beginPath(); g.arc(W / 2, H / 2, r, 0, Math.PI * 2); g.stroke();
    for (const n of list.filter(n => n[0] <= cyc && cyc < n[1] && typeof n[2] === 'number')) {
      const a = ((n[2] % 12) / 12) * Math.PI * 2 - Math.PI / 2;
      g.globalAlpha = full ? 1 : Math.max(0, Math.min(1, n[3])); g.fillStyle = P.a2;
      g.beginPath(); g.arc(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r, r * 0.12, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
  function spiral(c, list, cyc) {
    const g = c.getContext('2d'), W = c.width, H = c.height, R = Math.min(W, H) * 0.45;
    g.clearRect(0, 0, W, H); g.lineCap = 'round';
    for (const n of window(list, cyc, 4)) {
      const on = n[0] <= cyc && cyc < n[1], rad = b => R * (0.25 + 0.75 * Math.max(0, Math.min(1, (b - (cyc - 2)) / 4))), ang = b => b * Math.PI * 2 - Math.PI / 2;
      g.globalAlpha = full ? 1 : Math.max(0, Math.min(1, n[3])); g.strokeStyle = on ? P.a1 : P.muted; g.lineWidth = 4 * DPR;
      g.beginPath();
      for (let k = 0; k <= 8; k++) { const b = n[0] + ((n[1] - n[0]) * k) / 8, x = W / 2 + Math.cos(ang(b)) * rad(b), y = H / 2 + Math.sin(ang(b)) * rad(b); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  // the samples of the instrument alone at t (the last n), else the song's wave
  const samples = (inst, t, n, master) => {
    const wv = inst && waves[inst];
    if (!wv) return master || null;
    const end = Math.round(t * wv.sr), out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = wv.data[end - n + i] || 0;
    return out;
  };
  function scope(c, d) {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    g.clearRect(0, 0, W, H); g.strokeStyle = P.a1; g.lineWidth = 2 * DPR; g.beginPath();
    if (!d) { g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); return; }
    let t0 = Array.from(d).findIndex((v, i, a) => i && a[i - 1] > 0 && v <= 0); t0 = Math.max(0, Math.min(d.length / 2, t0));
    const n = d.length - t0;
    for (let i = 0; i < n; i++) { const x = (i / n) * W, y = (0.5 - d[t0 + i]) * H; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  function spectrum(c, d) {
    const g = c.getContext('2d'), W = c.width, H = c.height, speed = DPR;
    if (!d) return;
    const img = g.getImageData(0, 0, W, H); g.clearRect(0, 0, W, H); g.putImageData(img, -speed, 0);
    const mags = spectrumOf(d.length >= 256 ? d.slice(d.length - 256) : d), m = mags.length;
    g.fillStyle = P.a2;
    for (let i = 0; i < m; i++) { g.globalAlpha = Math.max(0, Math.min(1, (mags[i] + 80) / 80)); g.fillRect(W - speed, H - (Math.log(i + 1) / Math.log(m)) * H, speed, 2 * DPR); }
    g.globalAlpha = 1;
  }
  return {
    canvas(type, index, key, cyc, t, master = null) {
      const id = `${type}:${index}`;
      if (type === 'scope') {
        const c = canvasFor(id, 500, Z.row), d = samples(instOf.get(key), t, 512, master);
        // (for the checks: the instrument and the loudest sample of the last scope drawn)
        globalThis.codingMiskFastScope = { key, inst: instOf.get(key) || null, own: !!(instOf.get(key) && waves[instOf.get(key)]), peak: d ? d.reduce((m, v) => Math.max(m, Math.abs(v)), 0) : null, t };
        scope(c, d); return c;
      }
      if (type === 'spectrum') { const c = canvasFor(id, Z.spectrum, Z.spectrum); spectrum(c, samples(instOf.get(key), t, 256, master)); return c; }
      const list = notes[key] || [];
      if (type === 'pianoroll' || type === 'punchcard') { const c = canvasFor(id, 500, Z.row); roll(c, list, cyc, type === 'punchcard'); return c; }
      if (type === 'spiral') { const c = canvasFor(id, Z.spiral, Z.spiral); spiral(c, list, cyc); return c; }
      if (type === 'pitchwheel') { const c = canvasFor(id, Z.round, Z.round); wheel(c, list, cyc); return c; }
      return null;
    },
  };
}
