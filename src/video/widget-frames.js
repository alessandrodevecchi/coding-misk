// Code widgets in the fast video (code-widgets D11, tasks 5.3, 5.4): the fast video renders offline, so no widget of the
// page draws. Note widgets (pianoroll, punchcard, spiral, pitchwheel) are drawn from the notes of their line, which the
// render page sends back by line; scope and spectrum from the audio of their instrument alone (one extra render each), or
// from the whole song's wave when the export falls back (the "Real scope and spectrum" setting). A frame depends only on
// its time, as every fast video frame does; the spectrum scrolls frame after frame, as Strudel's does.

// the instrument of each line with a scope or spectrum, from the code shown and the code evaluated: the line's own visual,
// else the hidden mixer's entry for the line (`miskMix(x, [[from, to, { analyze: '…' }], …])`)
import * as paint from '../visuals/widget-painters.js';

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

// notes: key → [[begin, end, pitch, level]] (cycles); waves: instrument → { sr, data } (mono, the instrument alone);
// instOf: key → instrument; S: the code widgets' settings; P: colours { ink, muted, a1, a2 }
// → { canvas(type, index, key, cyc, t, master) }: a canvas with the widget at that moment (master: the song's wave, for
// the fallback). The pictures come from the shared painters (src/visuals/widget-painters.js, widgets-on-stage D1).
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
  const whole = c => ({ x: 0, y: 0, w: c.width, h: c.height });
  function roll(c, list, cyc, punch) {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const shown = paint.roll(g, whole(c), list, cyc, { span: 4, punch, full, on: P.a1, off: P.muted, head: P.ink, px: DPR });
    // (for the checks: the most notes a note widget has drawn at once)
    globalThis.codingMiskFastNotes = Math.max(globalThis.codingMiskFastNotes || 0, shown);
  }
  function wheel(c, list, cyc) {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    paint.wheel(g, whole(c), list, cyc, { full, ring: P.muted, dot: P.a2, px: DPR });
  }
  function spiral(c, list, cyc) {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    paint.spiral(g, whole(c), list, cyc, { full, on: P.a1, off: P.muted, px: DPR });
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
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    paint.scope(g, whole(c), d, { color: P.a1, px: DPR });
  }
  // the code widget's spectrum scrolls frame after frame, as Strudel's does (the stage rebuilds its columns instead)
  function spectrum(c, d) {
    const g = c.getContext('2d'), W = c.width, H = c.height, speed = DPR;
    if (!d) return;
    const img = g.getImageData(0, 0, W, H); g.clearRect(0, 0, W, H); g.putImageData(img, -speed, 0);
    paint.spectrumColumn(g, whole(c), W - speed, speed, paint.spectrumOf(d.length >= 256 ? d.slice(d.length - 256) : d), { color: P.a2, px: DPR });
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
