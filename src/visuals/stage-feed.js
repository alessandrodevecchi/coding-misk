// The stage feed of the widget looks (widgets-on-stage D2, D5, D6): notes per instrument, the panels of each section,
// levels, onsets and silences read from the notes, spectrum columns from the time. The same shape live (notes queried
// from the playing pattern, one cycle at a time, cached) and in the fast video (notes sent by the render page).
// Pure apart from the pattern it is given to query: checked in Node (tools/check-stage-widgets.mjs).
import { BY_VISUAL, widgetFor } from '../live/widgets.js';
import { spectrumOf } from './widget-painters.js';

// the pitch of a hap's value as the render page and the code widgets read it: a MIDI number, else the sound's name
// (the note names as Strudel's noteToMidi reads them, default octave 3)
const CHROMA = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }, ACC = { '#': 1, b: -1, s: 1, f: -1 };
export function noteNumber(s) {
  const m = typeof s === 'string' && s.match(/^([a-gA-G])([#bsf]*)(-?[0-9]*)$/);
  if (!m) return null;
  return (Number(m[3] || 3) + 1) * 12 + CHROMA[m[1].toLowerCase()] + [...m[2]].reduce((o, c) => o + ACC[c], 0);
}
export function pitchOf(v) {
  if (typeof v.note === 'number') return v.note;
  if (typeof v.note === 'string') { const n = noteNumber(v.note); if (n !== null) return n; }
  if (typeof v.n === 'number' && !v.s) return v.n;
  if (v.freq) return 12 * Math.log2(v.freq / 440) + 69;
  return String(v.s ?? v.n ?? '?');
}
// a hap's value → a note [begin, end, pitch, level] (level: gain × velocity)
export const noteOf = (b, e, v) => [+b.toFixed(4), +e.toFixed(4), pitchOf(v), +((v.gain ?? 1) * (v.velocity ?? 1)).toFixed(3)];

// the code widgets' instrument of a stage instrument (the `analyze` name): kick and snare are drums, hook a lead
export const cwInstrument = name => BY_VISUAL[name] || 'lead';
// stage instruments drawn as drum lanes in Rullo
export const DRUMS = ['kick', 'snare', 'hats', 'perc', 'beat', 'drums'];
// the order of the stage instruments inside one code widgets' instrument (kick before snare)
const STAGE_ORDER = ['kick', 'snare', 'perc', 'beat', 'drums', 'hats', 'bass', 'hook', 'lead', 'guitar', 'arp', 'pad', 'texture', 'fx', 'riser'];
const LONGEST = 16;

// Notes per instrument, kept sorted by start. add(inst, note) drops a note it already has (same start and pitch).
export function noteStore() {
  const by = new Map();
  const get = inst => { let x = by.get(inst); if (!x) { x = { list: [], ids: new Set(), sorted: true }; by.set(inst, x); } return x; };
  const sorted = x => { if (!x.sorted) { x.list.sort((a, b) => a[0] - b[0]); x.sorted = true; } return x.list; };
  // the first index whose start is at least c
  const from = (list, c) => { let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m][0] < c) lo = m + 1; else hi = m; } return lo; };
  return {
    add(inst, n) {
      const x = get(inst), id = `${n[0]}|${n[2]}`;
      if (x.ids.has(id)) return;
      x.ids.add(id);
      if (x.list.length && x.list[x.list.length - 1][0] > n[0]) x.sorted = false;
      x.list.push(n);
    },
    // the notes of inst that sound in [c0, c1)
    around(inst, c0, c1) {
      const x = by.get(inst);
      if (!x) return [];
      const list = sorted(x), out = [];
      for (let i = from(list, c0 - LONGEST); i < list.length && list[i][0] < c1; i++) if (list[i][1] > c0) out.push(list[i]);
      return out;
    },
    // the instruments with a note starting in [c0, c1)
    startingIn(c0, c1) {
      const out = new Set();
      for (const [inst, x] of by) { const list = sorted(x), i = from(list, c0); if (i < list.length && list[i][0] < c1) out.add(inst); }
      return out;
    },
    // forget the notes starting at c or later (the pattern changed), or ending before c (long past)
    dropFrom(c) { for (const x of by.values()) { const list = sorted(x), i = from(list, c); for (const n of list.splice(i)) x.ids.delete(`${n[0]}|${n[2]}`); } },
    dropBefore(c) { for (const x of by.values()) { const keep = x.list.filter(n => n[1] >= c); if (keep.length !== x.list.length) { for (const n of x.list) if (n[1] < c) x.ids.delete(`${n[0]}|${n[2]}`); x.list = keep; } } },
    clear() { by.clear(); },
    get instruments() { return [...by.keys()]; },
  };
}

// Live: the notes of the playing pattern, queried one cycle at a time (never twice for a cycle while the pattern stays),
// ahead of the playhead up to `need`. A new pattern (an evaluation) drops the notes from the current cycle on.
export function liveNotes(store) {
  let pat = null, next = null;
  return {
    // → the first cycle not yet queried
    pump(pattern, cyc, need, max = 1) {
      if (!pattern || typeof pattern.queryArc !== 'function') return next ?? -Infinity;
      const c = Math.floor(cyc);
      if (next === null || cyc < next - 80 || next < c - 4) { store.clear(); next = Math.max(0, c - 2); pat = pattern; }
      else if (pattern !== pat) { pat = pattern; store.dropFrom(c); next = Math.min(next, c); }
      for (let k = 0; k < max && next < need; k++, next++) {
        let haps = [];
        try { haps = pattern.queryArc(next, next + 1); } catch (e) { haps = []; }
        for (const h of haps) {
          if (!h.whole || (h.hasOnset && !h.hasOnset())) continue;
          const b = h.whole.begin.valueOf();
          if (b < next || b >= next + 1) continue;
          const v = h.value;
          if (!v || typeof v !== 'object' || v.analyze === undefined) continue;
          store.add(String(v.analyze), noteOf(b, h.whole.end.valueOf(), v));
        }
      }
      if (c % 16 === 0) store.dropBefore(c - 80);
      return next;
    },
    reset() { next = null; pat = null; store.clear(); },
  };
}

// how an instrument's level falls after a note starts, in cycles: drums decay, the others hold for the note
const DECAY = { kick: 0.06, snare: 0.07, hats: 0.03, perc: 0.05, beat: 0.06, drums: 0.06, fx: 0.15, riser: 0.2 }, RELEASE = 0.08;
// the level of an instrument at cyc from its notes (0..1): the loudest note's envelope; full: notes at full level
export function levelAt(list, cyc, inst, full = false) {
  let v = 0;
  for (const n of list) {
    if (n[0] > cyc) continue;
    const dt = cyc - n[0], len = n[1] - n[0], d = DECAY[inst];
    const env = d ? Math.exp(-dt / d) : dt < len ? 1 : Math.exp(-(dt - len) / RELEASE);
    v = Math.max(v, (full ? 1 : Math.min(1, n[3] * 1.25)) * env);
  }
  return v;
}
// the flash of the last onset (1 on the note, gone after a quarter of a cycle)
export function flashAt(list, cyc) {
  let b = -Infinity;
  for (const n of list) if (n[0] <= cyc && n[0] > b) b = n[0];
  return cyc - b < 0.25 ? Math.exp(-(cyc - b) / 0.05) : 0;
}
// silent now: no note sounding, none started in the last cycle
export const silentAt = (list, cyc) => !list.some(n => n[0] <= cyc + 0.01 && (n[1] > cyc || n[0] > cyc - 1));

// D5: the panels of a section. sec { start, end } in cycles; S: the code widgets' settings (slot order, instruments on,
// primary and secondary widget, share); max: the most panels; silent: 'dimmed' (an instrument that played within the
// window before the section and is silent in it keeps a dimmed panel) or 'hidden'; known: the cycle up to which the
// notes are known (live: the notes queried so far). → [{ inst, widget, quiet }] in slot order
export function rosterOf(store, sec, { S, max = 6, silent = 'dimmed', seed = '', known = Infinity } = {}) {
  const win = S.window === 'always' ? 64 : S.window || 16, end = Math.min(sec.end, known);
  const playing = store.startingIn(sec.start, Math.max(end, sec.start + 0.001)), before = silent === 'dimmed' ? store.startingIn(sec.start - win, sec.start) : new Set();
  const rank = inst => S.order.indexOf(cwInstrument(inst)) * 100 + (STAGE_ORDER.includes(inst) ? STAGE_ORDER.indexOf(inst) : 50);
  const cands = [];
  for (const inst of new Set([...playing, ...before])) {
    const widget = widgetFor(cwInstrument(inst), S, inst, seed);
    if (widget) cands.push({ inst, widget, quiet: !playing.has(inst) });
  }
  // every playing instrument first (up to the limit), then the quiet ones; then the places in slot order
  cands.sort((a, b) => a.quiet - b.quiet || rank(a.inst) - rank(b.inst) || a.inst.localeCompare(b.inst));
  return cands.slice(0, max).sort((a, b) => rank(a.inst) - rank(b.inst) || a.inst.localeCompare(b.inst));
}

// Spectrum columns from the time (D2): column k of a panel is the spectrum of the wave at its own time slot, kept by
// (instrument, slot), so a frame drawn alone has the same columns as one drawn in a sequence. One new column per panel
// per frame in a sequence; a DFT of 128 samples each (D10).
export const COLUMN_RATE = 20, COLUMNS = 32;
export function columnCache(limit = 4096) {
  const m = new Map();
  return {
    // the columns of inst at time t (seconds), oldest first; waveAt(inst, slotTime) → 128 samples or null
    columns(inst, t, waveAt) {
      const s1 = Math.floor(t * COLUMN_RATE), out = [];
      for (let s = s1 - COLUMNS + 1; s <= s1; s++) {
        if (s < 0) { out.push(null); continue; }
        const key = `${inst}|${s}`;
        if (!m.has(key)) {
          const d = waveAt(inst, s / COLUMN_RATE);
          m.set(key, d ? spectrumOf(d) : null);
          if (m.size > limit) m.delete(m.keys().next().value);
        }
        out.push(m.get(key));
      }
      return out;
    },
    clear() { m.clear(); },
  };
}
