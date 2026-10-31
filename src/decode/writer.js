// The writer of a decoded track (track-to-code D9, D10, D14): the song model becomes a v2 song, and the app's compiler,
// code of the moment and typing do the rest. One writer for both levels. Pure: checked in Node (npm run check:decode).
//
// Parts: a `drums` track from the 16-step grids, and `code` tracks with plain Strudel for the bass and the chords (the
// format's named progressions and eight keys cannot hold any chord). A part plays only where the model hears it.
// Level A follows the model bar by bar with the hysteresis of D9: a new drum grid is written once it held for a bar
// (two bars for a difference of one or two steps), so a one-bar fill never changes the code; a part that stops is
// muted at once.
import { STEPS, DRUM_ROWS, noteName, NOTE_NAMES, parseChord } from './model.js';
import { KITS } from '../music.js';

export const SOUND_PRESETS = ['ours', 'simple'];
export const VOX_LINE = '// vox: …';
// the format's eight section keys (used only by the app's own instruments): the nearest to the model's key
const FORMAT_KEYS = ['E', 'F', 'F#', 'G', 'A', 'B', 'C', 'D'];
const PC = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
export function formatKey(key) {
  if (!key) return 'A';
  // the format's progressions are written in A minor: a major key takes its relative minor
  const pc = key.mode === 'major' ? (key.root + 9) % 12 : key.root;
  let best = 'A', d = 99;
  for (const k of FORMAT_KEYS) { const x = Math.min((PC[k] - pc + 12) % 12, (pc - PC[k] + 12) % 12); if (x < d) { d = x; best = k; } }
  return best;
}
export const keyName = key => (key ? `${NOTE_NAMES[key.root]} ${key.mode}` : '');

const EMPTY = '.'.repeat(STEPS);
const hits = s => [...(s || '')].filter(c => c === 'x').length;
const diffSteps = (a, b) => DRUM_ROWS.reduce((n, r) => n + [...EMPTY].filter((_, j) => (a[r] || EMPTY)[j] !== (b[r] || EMPTY)[j]).length, 0);
const gridKey = g => DRUM_ROWS.map(r => g[r] || EMPTY).join('|');

// what each part plays at each bar, as level A writes it: { drums: [grid|null], bass: [steps|null], chords: [name|null] }
// A part is heard in a bar (D9 clips from levels): drums with two hits or more and a kick, hat or two claps; bass with
// two notes or more; chords with a confident chord over a fair chord level.
export const drumsHeard = b => { const d = b.drums || {}; const n = DRUM_ROWS.reduce((a, r) => a + hits(d[r]), 0); return n >= 2 && (hits(d.bd) > 0 || hits(d.hh) > 0 || hits(d.oh) > 0 || hits(d.cp) >= 2); };
export const bassHeard = b => (b.bass || []).filter(x => x !== null && x !== undefined).length >= 2;
export const chordsHeard = b => !!b.chord && (b.chordConf || 0) >= 0.5 && (!b.level || b.level.chords >= 0.15);

export function partsByBar(model) {
  const bars = model.bars || [], out = { drums: [], bass: [], chords: [] };
  // drums: hysteresis on the grid (D9)
  let cur = null;
  bars.forEach((b, i) => {
    if (!drumsHeard(b)) { out.drums.push(null); return; }
    const g = Object.fromEntries(DRUM_ROWS.map(r => [r, (b.drums && b.drums[r]) || EMPTY]));
    if (!cur) { cur = g; out.drums.push(cur); return; }
    if (gridKey(g) !== gridKey(cur)) {
      const d = diffSteps(g, cur), need = d <= 2 ? 3 : 2;
      // the same new grid in the last `need` bars (this one included)
      let same = true;
      for (let k = 1; k < need; k++) { const p = bars[i - k]; if (!p || !drumsHeard(p) || gridKey(Object.fromEntries(DRUM_ROWS.map(r => [r, (p.drums && p.drums[r]) || EMPTY]))) !== gridKey(g)) { same = false; break; } }
      if (same) cur = g;
    }
    out.drums.push(cur);
  });
  // bass: the notes of each bar where it is heard
  out.bass = bars.map(b => (bassHeard(b) ? b.bass.map(x => (x === null || x === undefined ? null : x)) : null));
  out.chords = bars.map(b => (chordsHeard(b) ? b.chord : null));
  return out;
}

// the loop a part repeats, aligned to the bar number (Strudel's `<…>` takes element `cycle mod L` at a cycle): the
// smallest L of 1, 2, 4 or 8 whose last 2L bars repeat, else L of 1 (this bar). → values of length L, index k = the
// value at the latest bar b' ≤ bar with b' mod L = k
// grow: before a loop has repeated, the last 2, 4 or 8 bars heard (chords); else this bar alone (bass)
export function loopAt(list, bar, { grow = false, same = (a, b) => JSON.stringify(a) === JSON.stringify(b) } = {}) {
  const loop = L => Array.from({ length: L }, (_, k) => list[bar - ((((bar - k) % L) + L) % L)]);
  const filled = L => { for (let i = bar - L + 1; i <= bar; i++) if (i < 0 || list[i] === null || list[i] === undefined) return false; return true; };
  for (const L of [1, 2, 4, 8]) {
    if (bar + 1 < 2 * L || !filled(2 * L)) continue;
    let ok = true;
    for (let i = bar - 2 * L + 1; i <= bar - L && ok; i++) if (!same(list[i], list[i + L])) ok = false;
    if (ok) return loop(L);
  }
  if (grow) for (const L of [8, 4, 2]) if (bar + 1 >= L && filled(L)) return loop(L);
  return [list[bar]];
}

// two bars of bass notes are the same line when at least 13 of their 16 steps agree (the analysis misses a note now
// and then); chords repeat exactly
const sameBass = (a, b) => !!(a && b) && a.filter((x, j) => x === b[j]).length >= 13;
const loopOpts = id => (id === 'chords' ? { grow: true } : { same: sameBass });

// a bar of bass notes in mini-notation: the coarsest grid (16, 8 or 4 steps) that holds every note, runs with "!"
export function stepsMini(notes) {
  let n = STEPS;
  for (const g of [4, 8]) if (notes.every((x, j) => j % (STEPS / g) === 0 || x === null)) { n = g; break; }
  const toks = Array.from({ length: n }, (_, k) => { const x = notes[k * (STEPS / n)]; return x === null ? '~' : noteName(x); });
  const out = [];
  for (const tk of toks) { const last = out[out.length - 1]; if (last && last.t === tk) last.n++; else out.push({ t: tk, n: 1 }); }
  return out.map(x => (x.n > 1 ? `${x.t}!${x.n}` : x.t)).join(' ');
}
const seqOf = list => (list.length === 1 ? list[0] : `<${list.join(' ')}>`);
const bassCode = (loop, snd) => `note("${seqOf(loop.map(b => (loop.length > 1 ? `[${stepsMini(b)}]` : stepsMini(b))))}")${snd}`;
const chordCode = (loop, snd) => `chord("${seqOf(loop)}").voicing()${snd}`;

// sounds by measure (D10): "Our sounds" picks from the generator's tables by the model's brightness and low-end
// weight; "Simple kit" is one fixed set. bars: the bars heard so far (level A) or the section's (level B)
export function soundsOf(bars, preset = 'ours') {
  if (preset === 'simple' || !bars.length) return { kit: 'RolandTR909', bass: '.s("sawtooth").lpf(700).gain(.75)', chords: '.s("supersaw").lpf(2000).gain(.3)', why: 'simple' };
  const avg = k => bars.reduce((a, b) => a + (b[k] || 0), 0) / bars.length;
  const bright = avg('bright'), low = avg('low');
  // heavy low end: the 808; bright and light: the 909; between them the other machines of the generator's list
  const kit = low > 0.55 ? 'RolandTR808' : bright > 0.45 ? 'RolandTR909' : bright > 0.3 ? KITS[2] : KITS[4];
  const bassWave = low > 0.5 ? 'sine' : bright > 0.4 ? 'sawtooth' : 'square';
  const bassCut = Math.round((300 + 900 * Math.min(1, bright * 1.6)) / 50) * 50;
  const chordWave = bright > 0.45 ? 'supersaw' : bright > 0.25 ? 'sawtooth' : 'triangle';
  const chordCut = Math.round((800 + 3200 * Math.min(1, bright * 1.5)) / 100) * 100;
  return { kit, bass: `.s("${bassWave}").lpf(${bassCut}).gain(.75)`, chords: `.s("${chordWave}").lpf(${chordCut}).gain(.3)`, why: `bright ${bright.toFixed(2)} low ${low.toFixed(2)}` };
}

// the song of a decoded track. opts: { id, title, artist, attribution, sounds, upTo (bars written, default all) }
// The whole song: one section in level A; drums patterns per stable grid, bass and chord loops per run of bars.
export function writeSong(model, opts = {}) {
  const P = partsByBar(model), n = Math.min(opts.upTo ?? model.bars.length, model.bars.length), snd = soundsOf(model.bars.slice(0, n), opts.sounds);
  const tracks = [];
  // drums: one pattern per grid, one clip per run of bars with the same grid
  {
    const patterns = {}, clips = [], ids = new Map();
    for (let b = 0; b < n; b++) {
      const g = P.drums[b];
      if (!g) continue;
      const k = gridKey(g);
      if (!ids.has(k)) { const id = String.fromCharCode(65 + ids.size % 26) + (ids.size >= 26 ? Math.floor(ids.size / 26) : ''); ids.set(k, id); patterns[id] = { rows: Object.fromEntries(DRUM_ROWS.filter(r => hits(g[r])).map(r => [r, g[r]])) }; }
      const id = ids.get(k), last = clips[clips.length - 1];
      if (last && last.pattern === id && last.start + last.bars === b) last.bars++; else clips.push({ start: b, bars: 1, pattern: id });
    }
    if (clips.length) tracks.push({ id: 'drums', name: 'Drums', type: 'drums', settings: { kit: snd.kit }, patterns, clips });
  }
  // bass and chords: code tracks, a loop per bar; runs of bars with the same loop share a clip
  const codeTrack = (id, name, visual, list, code) => {
    const patterns = {}, clips = [], ids = new Map();
    for (let b = 0; b < n; b++) {
      if (list[b] === null) continue;
      const c = code(loopAt(list, b, loopOpts(id)));
      if (!ids.has(c)) { const pid = String.fromCharCode(65 + ids.size % 26) + (ids.size >= 26 ? Math.floor(ids.size / 26) : ''); ids.set(c, pid); patterns[pid] = { code: c }; }
      const pid = ids.get(c), last = clips[clips.length - 1];
      if (last && last.pattern === pid && last.start + last.bars === b) last.bars++; else clips.push({ start: b, bars: 1, pattern: pid });
    }
    if (clips.length) tracks.push({ id, name, type: 'code', settings: { visual }, patterns, clips });
  };
  codeTrack('bass', 'Bass', 'bass', P.bass, loop => bassCode(loop, snd.bass));
  codeTrack('chords', 'Chords', 'pad', P.chords, loop => chordCode(loop, snd.chords));
  return songShell(model, opts, Math.max(1, n), tracks);
}

function songShell(model, opts, bars, tracks) {
  const title = String(opts.title || 'Decoded track').slice(0, 120);
  return {
    format: 'coding-misk/song', version: 2, id: opts.id || 'decoded', title,
    cover: { title, ...(opts.artist ? { artist: String(opts.artist).slice(0, 120) } : {}), attribution: opts.attribution !== false },
    config: { profile: 'switch', live: true, options: { narrator: false } },
    sections: [{ name: 'Track', bars, bpm: Math.round((model.bpm || 120) * 100) / 100, key: formatKey(model.key) }],
    tracks,
  };
}

// level A (D9, D13): the song of the moment at a bar, what the code shows and plays from that bar on. One section as
// long as the longest loop; each part with the loop it plays at the bar; a part heard before and silent now stays,
// muted (`_$:`); a part never heard is not written.
export function momentSong(model, bar, opts = {}) {
  const P = partsByBar(model), last = Math.min(bar, model.bars.length - 1), snd = soundsOf(model.bars.slice(0, last + 1), opts.sounds);
  const tracks = [];
  let L = 1;
  const heardBefore = list => list.slice(0, last + 1).some(x => x !== null);
  const lastOf = list => { for (let b = last; b >= 0; b--) if (list[b] !== null) return b; return -1; };
  if (last >= 0 && heardBefore(P.drums)) {
    const now = P.drums[last], g = now || P.drums[lastOf(P.drums)];
    tracks.push({ id: 'drums', name: 'Drums', type: 'drums', settings: { kit: snd.kit }, patterns: { A: { rows: Object.fromEntries(DRUM_ROWS.filter(r => hits(g[r])).map(r => [r, g[r]])) } }, clips: [{ section: 0, pattern: 'A' }], ...(now ? {} : { hush: true }) });
  }
  const code = (id, name, visual, list, make) => {
    if (last < 0 || !heardBefore(list)) return;
    const at = list[last] !== null ? last : lastOf(list), loop = loopAt(list, at, loopOpts(id));
    L = Math.max(L, loop.length);
    tracks.push({ id, name, type: 'code', settings: { visual }, patterns: { A: { code: make(loop) } }, clips: [{ section: 0, pattern: 'A' }], ...(list[last] !== null ? {} : { hush: true }) });
  };
  code('bass', 'Bass', 'bass', P.bass, loop => bassCode(loop, snd.bass));
  code('chords', 'Chords', 'pad', P.chords, loop => chordCode(loop, snd.chords));
  return songShell(model, opts, L, tracks);
}

// the vocals placeholder (D14): a comment after the parts, never played
export const withVox = code => `${code.replace(/\s+$/, '')}\n\n${VOX_LINE}`;
export const withoutVox = code => code.replace(/\n*\/\/ vox: …\s*$/, '');

// a chord name of the model in the app's spelling (for the tempo and key readout): "Am" stays "Am"
export const chordLabel = name => { const c = parseChord(name); return c ? `${NOTE_NAMES[c.root]}${c.quality === 'min' ? 'm' : ''}` : ''; };
