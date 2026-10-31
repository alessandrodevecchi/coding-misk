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
// level B: two bars of bass are the same line when three quarters of the steps where either plays a note agree
const sameBassB = (a, b) => { if (!a || !b) return false; let n = 0, ok = 0; for (let j = 0; j < a.length; j++) { if (a[j] === null && b[j] === null) continue; n++; if (a[j] === b[j]) ok++; } return n === 0 || ok / n >= 0.75; };

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

// ---------- level B (D9, D10): sections, a loop per part and section, variations ----------
const range = (a, z) => Array.from({ length: Math.max(0, z - a) }, (_, i) => a + i);
const SECTION_NAMES = { intro: 'Intro', verse: 'Verse', build: 'Build', drop: 'Drop', break: 'Break', outro: 'Outro' };
// a part heard per bar inside a section, with one-bar gaps filled and one-bar islands left out (a missed note, a fill)
function smooth(list) {
  const out = list.slice();
  for (let i = 0; i < list.length; i++) { const a = !!list[i - 1], z = !!list[i + 1]; if (!list[i] && a && z) out[i] = true; if (list[i] && !a && !z) out[i] = false; }
  return out;
}
const gridOf = b => Object.fromEntries(DRUM_ROWS.map(r => [r, (b.drums && b.drums[r]) || EMPTY]));
// the loop of a part over the bars of a section (values by absolute bar, null where not heard): the smallest period of
// 1, 2, 4 or 8 bars whose positions (bar mod L, as Strudel's `<…>` reads them) hold one value on 80 % of the bars;
// each position's value is its most common one (bass: the bar most like the others). → [values] of length L
export function sectionLoop(byBar, bars, { same = (a, b) => JSON.stringify(a) === JSON.stringify(b) } = {}) {
  const heard = bars.filter(b => byBar[b] !== null && byBar[b] !== undefined);
  if (!heard.length) return null;
  const pickOf = list => { let best = list[0], top = -1; for (const x of list) { const n = list.filter(y => same(x, y)).length; if (n > top) { top = n; best = x; } } return best; };
  let fallback = null;
  for (const L of [1, 2, 4, 8]) {
    const loop = range(0, L).map(k => { const list = heard.filter(b => ((b % L) + L) % L === k).map(b => byBar[b]); return list.length ? pickOf(list) : null; });
    if (loop.some(x => x === null)) continue;
    const ok = heard.filter(b => same(byBar[b], loop[((b % L) + L) % L])).length / heard.length;
    if (ok >= 0.8 && (L === 1 || heard.length >= 2 * L || L === 8)) return loop;
    if (!fallback || ok > fallback.ok) fallback = { loop, ok };
  }
  return fallback ? fallback.loop : [byBar[heard[0]]];
}
// per section, the drum patterns: the main grid (the most common; a grid within two steps of it counts as it) and the
// variants, grids that come back at least twice; a one-off fill plays the main grid. → [{ main, variants, perBar }]
function drumPlan(model) {
  const bars = model.bars, end = model.ending ?? bars.length;
  const grid = k => Object.fromEntries(DRUM_ROWS.map((r, j) => [r, k.split('|')[j]]));
  return (model.sections || []).map(sec => {
    const idx = range(sec.start, Math.min(sec.start + sec.bars, end)), on = smooth(idx.map(i => drumsHeard(bars[i])));
    const keys = idx.map((i, j) => (on[j] && drumsHeard(bars[i]) ? gridKey(gridOf(bars[i])) : on[j] ? 'gap' : null));
    const count = new Map(); for (const k of keys) if (k && k !== 'gap') count.set(k, (count.get(k) || 0) + 1);
    let main = null; for (const [k, n] of count) if (!main || n > count.get(main)) main = k;
    if (!main) return { main: null, variants: [], perBar: idx.map(() => null), grid };
    // (a grid within three steps of the main one, or one that only misses some of its hits, is the main one heard less
    // well: a kick under a loud bass, a hat under a crash)
    const near = k => { const g = grid(k), M0 = grid(main); return diffSteps(g, M0) <= 3 || DRUM_ROWS.every(r => [...g[r]].every((c, j) => c !== 'x' || M0[r][j] === 'x')); };
    const variants = [...count].filter(([k, n]) => k !== main && n >= 2 && !near(k)).map(([k]) => k);
    const perBar = keys.map(k => (k === null ? null : variants.includes(k) ? k : main));
    return { main, variants, perBar, grid };
  });
}
// the variations of a level B model (analysis spec: Level B adds structure): per section and part, the bars that play
// a variant of the section's main pattern
export function variationsOf(model) {
  const out = [];
  drumPlan(model).forEach((p, k) => {
    if (!p.variants.length) return;
    const sec = model.sections[k];
    out.push({ section: k, part: 'drums', bars: p.perBar.map((x, j) => (x && x !== p.main ? sec.start + j : null)).filter(x => x !== null) });
  });
  return out;
}

// the chords of a key: its diatonic triads (and the major dominant of a minor key); a section whose chords fall mostly
// outside the key is noise of the drums in the chord band (a drums-only outro reads as Bb, Gm, F#…), not a part
const KEY_CHORDS = { minor: [[0, 'min'], [3, 'maj'], [5, 'min'], [7, 'min'], [7, 'maj'], [8, 'maj'], [10, 'maj']], major: [[0, 'maj'], [2, 'min'], [4, 'min'], [5, 'maj'], [7, 'maj'], [9, 'min']] };
export const inKey = key => list => {
  if (!key || !list.length) return true;
  const set = new Set(KEY_CHORDS[key.mode === 'major' ? 'major' : 'minor'].map(([d, q]) => `${(key.root + d) % 12}${q}`));
  const ok = list.filter(c => { const p = parseChord(c); return p && set.has(`${p.root}${p.quality}`); }).length;
  return ok / list.length >= 0.6;
};
// the song of a level B model (D9): the model's sections with their kinds as names, a drums track with each section's
// main grid and its variants as clips, bass and chords code tracks with one loop per section; a part plays where it is
// heard (one-bar gaps filled, one-bar islands left out); sounds by measure per section (D10); the song ends at the
// model's ending
export function writeFull(model, opts = {}) {
  const bars = model.bars, end = Math.max(1, Math.min(model.ending ?? bars.length, bars.length));
  const secs = (model.sections && model.sections.length ? model.sections : [{ start: 0, bars: end, kind: 'verse' }]).filter(s => s.start < end).map(s => ({ ...s, bars: Math.min(s.bars, end - s.start) }));
  const M = { ...model, sections: secs, ending: end };
  const named = new Map(), names = secs.map(s => { const base = SECTION_NAMES[s.kind] || 'Part', n = (named.get(base) || 0) + 1; named.set(base, n); return n > 1 ? `${base} ${n}` : base; });
  const all = soundsOf(bars.slice(0, end), opts.sounds), tracks = [];
  const pid = n => String.fromCharCode(65 + (n % 26)) + (n >= 26 ? Math.floor(n / 26) : '');
  const runs = (list, k) => { const out = []; list.forEach((x, j) => { if (x === null) return; const last = out[out.length - 1]; if (last && last.pattern === x && last.start + last.bars === k + j) last.bars++; else out.push({ start: k + j, bars: 1, pattern: x }); }); return out; };
  // drums
  {
    const plan = drumPlan(M), patterns = {}, ids = new Map(), clips = [];
    const idOf = (key, grid) => { if (!ids.has(key)) { const id = pid(ids.size); ids.set(key, id); const g = grid(key); patterns[id] = { rows: Object.fromEntries(DRUM_ROWS.filter(r => hits(g[r])).map(r => [r, g[r]])) }; } return ids.get(key); };
    plan.forEach((p, k) => { if (!p.main) return; clips.push(...runs(p.perBar.map(x => (x ? idOf(x, p.grid) : null)), secs[k].start)); });
    if (clips.length) tracks.push({ id: 'drums', name: 'Drums', type: 'drums', settings: { kit: all.kit }, patterns, clips });
  }
  // bass and chords
  // keep(values): whether a section's values are a part at all (chords: most of them in the song's key)
  const part = (id, name, visual, heardOf, valueOf, code, same, keep = () => true) => {
    const patterns = {}, ids = new Map(), clips = [];
    secs.forEach(sec => {
      const idx = range(sec.start, sec.start + sec.bars), on = smooth(idx.map(i => heardOf(bars[i])));
      if (!keep(idx.filter((i, j) => on[j] && heardOf(bars[i])).map(i => valueOf(bars[i])))) return;
      const byBar = {}; idx.forEach((i, j) => { byBar[i] = on[j] && heardOf(bars[i]) ? valueOf(bars[i]) : null; });
      const loop = sectionLoop(byBar, idx, same ? { same } : {});
      if (!loop) return;
      const snd = soundsOf(idx.map(i => bars[i]), opts.sounds), c = code(loop, id === 'bass' ? snd.bass : snd.chords);
      if (!ids.has(c)) { const p = pid(ids.size); ids.set(c, p); patterns[p] = { code: c }; }
      clips.push(...runs(on.map(x => (x ? ids.get(c) : null)), sec.start));
    });
    if (clips.length) tracks.push({ id, name, type: 'code', settings: { visual }, patterns, clips });
  };
  part('bass', 'Bass', 'bass', bassHeard, b => b.bass.map(x => (x === null || x === undefined ? null : x)), bassCode, sameBassB);
  part('chords', 'Chords', 'pad', chordsHeard, b => b.chord, chordCode, undefined, inKey(model.key));
  const song = songShell(model, opts, end, tracks);
  const key = formatKey(model.key), bpm = song.sections[0].bpm;
  song.sections = secs.map((s, i) => ({ name: names[i], bars: s.bars, bpm, key }));
  return song;
}
