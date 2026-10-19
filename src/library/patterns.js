// Patterns (pattern-library, #72): the built-in catalogue by kind, read from the preset tables; the styles whose recipes
// name each preset; the user's saved patterns (browser key coding-misk-patterns); the song a pattern loops in; adding
// a pattern to a song; and the preview of what a pattern plays. Pure: the Patterns tab, Compose, the radio and
// `npm run check:patterns` (Node) use the same functions.
//
// A saved pattern: { id, name, kind, type, pattern (as the song format stores it), sound, settings, context { key,
// chords, meter, bpm, mode }, styles, source ('compose' | 'generated'), seed, why, created }. Favourites and votes come
// later (design D8): a star per pattern and a vote (no, maybe, yes) kept next to `why` and `seed`.
import { BASS, ARPS, HOOKS, PADS, GROOVES, GUITAR_PATTERNS, CHORDS, ROWS, DEFAULT, meterSteps } from '../music.js';
import { miniEvents, ideaRows, slotTokens, altItems, beatForm, midi } from '../song/ideas.js';
import { normalizeSong, SECTION_DEFAULTS } from '../song/format.js';
import { chordsOf, rootOf, modeSteps } from '../material/common.js';

export const STORE_KEY = 'coding-misk-patterns';
export const KINDS = ['melodies', 'basslines', 'arpeggios', 'chords', 'grooves', 'riffs'];
export const SOURCES = ['builtin', 'mine'];
// the track type a kind plays on (riffs: bass riffs on bass, guitar patterns on guitar)
export const KIND_TYPE = { melodies: 'hook', basslines: 'bass', arpeggios: 'arp', chords: 'pad', grooves: 'drums', riffs: 'guitar' };
// the material generator's kind for "Compose new" (riffs are basslines with octaves and fifths as rhythm)
export const MATERIAL_KIND = { melodies: 'melody', basslines: 'bass', arpeggios: 'arp', chords: 'chords', grooves: 'drums', riffs: 'bass' };
export const RIFF_STYLE = { rules: ['octaves', 'fifths', 'gallop', 'sixteenths'] };
// the setting that holds a track's sound
export const soundKey = type => ({ drums: 'kit', guitar: 'type' }[type] || 'wave');
// defaults of each kind (spec "Harmony for a pattern"): a minor progression, a sound of its kind, 120 to 140 BPM
export const KIND_DEFAULTS = {
  melodies: { key: 'A', chords: 'notturna', bpm: 124, meter: '4/4', mode: 'minor', sound: 'square', beat: false },
  basslines: { key: 'A', chords: 'notturna', bpm: 128, meter: '4/4', mode: 'minor', sound: 'sawtooth', beat: true },
  arpeggios: { key: 'A', chords: 'epica', bpm: 128, meter: '4/4', mode: 'minor', sound: 'supersaw', beat: false },
  chords: { key: 'A', chords: 'notturna', bpm: 120, meter: '4/4', mode: 'minor', sound: 'supersaw', beat: false },
  grooves: { key: 'A', chords: 'drone', bpm: 128, meter: '4/4', mode: 'minor', sound: 'RolandTR909', beat: false },
  // riffs play over one chord, the way their presets are written (a power chord on the key root)
  riffs: { key: 'A', chords: 'drone', bpm: 132, meter: '4/4', mode: 'minor', sound: 'sawtooth', beat: true },
};
// melodies written in semitones (the chromatic mode) or for the phrygian mode, as the built-in songs play them
const HOOK_MODES = { allarme: 'chromatic', colpi: 'chromatic', boss: 'chromatic', segnale: 'chromatic', arcade: 'chromatic', arcadeB: 'chromatic', cyber: 'phrygian', scintilla: 'phrygian' };
const HOOK_METERS = { prog: '7/8' };
const GRID_METER = { 12: '3/4', 14: '7/8', 20: '5/4' };
const isRiff = name => !!(BASS[name] && BASS[name][5]);
const clone = x => JSON.parse(JSON.stringify(x));

// ---------- the built-in catalogue (design D1) ----------
// every preset once: { key: "<kind>/<name>", id, kind, type, label ({ it, en } or text), pattern, builtin, defaults }
let catalogue = null;
export function builtinPatterns() {
  if (catalogue) return catalogue;
  const out = [];
  const push = (kind, type, table, id, pattern, extra = {}) => out.push({ key: `${kind}/${id}`, id, kind, type, label: table[id][0], pattern, builtin: true, defaults: { ...KIND_DEFAULTS[kind], ...extra } });
  for (const id of Object.keys(HOOKS)) push('melodies', 'hook', HOOKS, id, { preset: id }, { mode: HOOK_MODES[id] || 'minor', ...(HOOK_METERS[id] ? { meter: HOOK_METERS[id] } : {}) });
  for (const id of Object.keys(BASS).filter(x => !isRiff(x))) push('basslines', 'bass', BASS, id, { preset: id });
  for (const id of Object.keys(ARPS)) push('arpeggios', 'arp', ARPS, id, { preset: id, speed: '16' });
  for (const id of Object.keys(PADS)) push('chords', 'pad', PADS, id, { preset: id });
  for (const id of Object.keys(GROOVES)) { const grid = GROOVES[id].idea.beat.grid; push('grooves', 'drums', GROOVES, id, { idea: clone(GROOVES[id].idea) }, GRID_METER[grid] ? { meter: GRID_METER[grid] } : {}); }
  for (const id of Object.keys(BASS).filter(isRiff)) push('riffs', 'bass', BASS, id, { preset: id });
  for (const id of Object.keys(GUITAR_PATTERNS)) push('riffs', 'guitar', GUITAR_PATTERNS, id, { preset: id }, { sound: 'distorted' });
  catalogue = out;
  return out;
}
// the kind of a preset named in a recipe or set on a track
export function kindOfPreset(type, name) {
  if (type === 'bass') return isRiff(name) ? 'riffs' : 'basslines';
  return { hook: 'melodies', arp: 'arpeggios', pad: 'chords', drums: 'grooves', guitar: 'riffs' }[type] || null;
}
// the kind of a track's pattern (a bass pattern with semitones on top, `add`, is a bassline: the generator writes them)
export const kindOfPattern = (type, pattern = {}) => (pattern.preset ? kindOfPreset(type, pattern.preset) : kindOfPreset(type, ''));
export const PATTERN_TYPES = ['hook', 'bass', 'arp', 'pad', 'drums', 'guitar'];

// ---------- styles that use a pattern (design D4) ----------
// recipe instrument lists → catalogue keys: { "<kind>/<name>": [style ids] }
const RECIPE_LISTS = [['drums', 'grooves'], ['bass', 'presets'], ['arp', 'presets'], ['hook', 'presets'], ['pad', 'presets'], ['guitar', 'patterns']];
export function stylesUsing(recipes = []) {
  const out = {};
  for (const r of recipes) for (const [type, field] of RECIPE_LISTS) {
    for (const name of (r && r[type] && r[type][field]) || []) {
      const key = `${kindOfPreset(type, name)}/${name}`;
      (out[key] = out[key] || []).includes(r.id) || out[key].push(r.id);
    }
  }
  return out;
}

// ---------- the user's patterns (design D6) ----------
export const validPattern = p => !!(p && typeof p === 'object' && typeof p.id === 'string' && KINDS.includes(p.kind) && PATTERN_TYPES.includes(p.type) && p.pattern && typeof p.pattern === 'object');
export const listPatterns = (list, kind = null) => (Array.isArray(list) ? list : []).filter(validPattern).filter(p => !kind || p.kind === kind);
// a free id: "p-<time in base 36>", with a suffix when two are saved in the same millisecond
export function newId(list, now = Date.now()) {
  const base = `p-${now.toString(36)}`, ids = new Set(listPatterns(list).map(p => p.id));
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
  return id;
}
export function addPattern(list, p, now = new Date()) {
  const out = listPatterns(list).slice(), item = { ...clone(p), id: p.id && !out.some(x => x.id === p.id) ? p.id : newId(out, now.getTime()), created: p.created || now.toISOString().slice(0, 10) };
  out.push(item);
  return { list: out, item };
}
export function renamePattern(list, id, name) {
  const n = String(name || '').trim().slice(0, 60);
  return listPatterns(list).map(p => (p.id === id && n ? { ...p, name: n } : p));
}
export const removePattern = (list, id) => listPatterns(list).filter(p => p.id !== id);
// the store over the app's browser storage ({ get, set }); built-in patterns are not in it, so they cannot be renamed
// or deleted
export function patternStore(store) {
  const read = () => listPatterns(store.get(STORE_KEY, []));
  return {
    list: kind => listPatterns(read(), kind),
    get: id => read().find(p => p.id === id) || null,
    add(p) { const r = addPattern(read(), p); store.set(STORE_KEY, r.list); return r.item; },
    rename(id, name) { store.set(STORE_KEY, renamePattern(read(), id, name)); },
    remove(id) { store.set(STORE_KEY, removePattern(read(), id)); },
  };
}
// the user's patterns as the director reads them (material-generator D10, src/endless/material.js): type, pattern, the
// style tags it fits ("any" when it has none), the key context and the idea (a chromatic melody keeps its own mode)
export const forRadio = list => listPatterns(list).filter(p => p.kind !== 'grooves' || p.pattern.idea || p.pattern.rows)
  .map(p => ({ id: p.id, type: p.type, pattern: clone(p.pattern), styles: Array.isArray(p.styles) && p.styles.length ? p.styles.slice() : ['any'], context: { ...(p.context || {}) }, ...(p.pattern.idea ? { idea: clone(p.pattern.idea) } : {}) }));

// ---------- Save as pattern (design D7) ----------
// the section a pattern of a track plays in first (the first section when none of its clips plays it)
export function sectionOf(song, tr, key) {
  const s = normalizeSong(song), t = s.tracks.find(x => x.id === tr.id) || { clips: [] };
  const clip = t.clips.find(c => c.pattern === key);
  const sec = clip ? s.sections.find(x => clip.start >= x.start && clip.start < x.start + x.bars) : null;
  return { ...SECTION_DEFAULTS, ...(sec || s.sections[0] || {}) };
}
// song (v2), track, pattern letter → a pattern to save (no id yet)
export function savedFromTrack(song, tr, key, { name = null, now = new Date() } = {}) {
  const pattern = clone((tr.patterns || {})[key] || {}), sec = sectionOf(song, tr, key), settings = clone(tr.settings || {});
  const kind = kindOfPattern(tr.type, pattern), styles = ((song.tags || {}).styles || []).slice();
  const context = { key: sec.key, chords: sec.chords, meter: sec.meter, bpm: sec.bpm, mode: tr.type === 'hook' ? settings.mode || 'minor' : 'minor' };
  return { name: name || `${tr.name || tr.type} · ${song.title || ''}`.trim(), kind, type: tr.type, pattern, sound: settings[soundKey(tr.type)] ?? null, settings, context, styles, source: 'compose', seed: null, created: now.toISOString().slice(0, 10) };
}
// a generated part (material generator) → a pattern to save
export function savedFromGenerated(g, { name, kind, type, sound, context, styles = [], now = new Date() }) {
  return { name, kind, type, pattern: clone(g.pattern), sound, settings: g.settings ? clone(g.settings) : {}, context: { ...context }, styles: styles.slice(), source: 'generated', seed: g.seed, why: (g.why || []).slice(), created: now.toISOString().slice(0, 10) };
}

// ---------- the loop (design D2) ----------
// the beat under a pattern: a kick on every beat and an offbeat hat, quieter than the pattern
export function beatIdea(meter = '4/4') {
  const N = meterSteps(meter), beats = [], off = [];
  for (let k = 0; k < N; k += 4) { beats.push(k); if (k + 2 < N) off.push(k + 2); }
  return { beat: { grid: N, bd: beats.join(','), hh: off.join(',') } };
}
// the beat's gain: at most 0.22, and about a third of the pattern's own gain, so its kick peaks below the pattern
// (measured in the browser: a kick at gain g peaks near g, a melodic part near 0.45 of its gain)
export const BEAT_GAIN = 0.22;
export const beatGain = patternGain => Math.min(BEAT_GAIN, Math.round(0.35 * (Number(patternGain) || 0.5) * 100) / 100);
// the temporary song a pattern plays in: one section of 4 bars, the pattern's track and, with the beat, a drums track.
// o: { sound, key, chords, mode, bpm, meter, beat, settings (the track's own, when saved from Compose) }
export function loopSong(item, o = {}) {
  const d = { ...KIND_DEFAULTS[item.kind], ...(item.defaults || {}), ...(item.context || {}) }, meter = o.meter || d.meter || '4/4';
  const type = item.type, settings = { ...(o.settings || item.settings || {}) };
  const sound = o.sound ?? item.sound ?? (type === 'guitar' && d.sound === 'sawtooth' ? 'distorted' : d.sound);
  if (sound) settings[soundKey(type)] = sound;
  if (type === 'hook') settings.mode = o.mode || d.mode || 'minor';
  const sec = { name: 'Loop', bars: 4, bpm: Math.round(o.bpm || d.bpm || 128), key: o.key || d.key || 'A', chords: o.chords || d.chords || 'notturna', meter };
  const tracks = [{ id: type, name: type, type, settings, patterns: { A: clone(item.pattern) }, clips: [{ section: 'Loop', pattern: 'A' }] }];
  if (o.beat ?? d.beat) tracks.push({ id: 'beat', name: 'beat', type: 'drums', settings: { kit: type === 'drums' ? settings.kit || 'RolandTR909' : 'RolandTR909', gain: beatGain(settings.gain ?? (DEFAULT[type] || {}).gain) }, patterns: { A: { idea: beatIdea(meter) } }, clips: [{ section: 'Loop', pattern: 'A' }] });
  return { format: 'coding-misk/song', version: 2, id: 'pattern-loop', title: o.title || item.name || item.id || 'Pattern', sections: [sec], tracks };
}

// ---------- Add to song (design D7) ----------
const nextKey = tr => { for (let i = 0; i < 26; i++) { const k = String.fromCharCode(65 + i); if (!tr.patterns[k]) return k; } return `P${Object.keys(tr.patterns).length}`; };
// adds a pattern to a song, in place: the next free letter on the first track of its type, or a new track (base: the
// default settings of the type; section: where a new track plays). The song's other patterns do not change.
// → { track (index), key, created }
export function addToSong(song, item, { sound = null, base = {}, name = null, section = null } = {}) {
  let i = song.tracks.findIndex(t => t.type === item.type), created = false;
  if (i < 0) {
    const ids = new Set(song.tracks.map(t => t.id));
    let id = item.type;
    for (let n = 2; ids.has(id); n++) id = `${item.type}-${n}`;
    const settings = { ...clone(base), ...(sound ? { [soundKey(item.type)]: sound } : {}) };
    song.tracks.push({ id, name: name || item.type, type: item.type, settings, patterns: {}, clips: section ? [{ section, pattern: 'A' }] : [] });
    i = song.tracks.length - 1; created = true;
  }
  const tr = song.tracks[i], key = nextKey(tr);
  tr.patterns[key] = clone(item.pattern);
  return { track: i, key, created };
}

// ---------- preview (design D3) ----------
// the idea a pattern plays: its own, or its preset's
const TABLES = { bass: BASS, arp: ARPS, hook: HOOKS, pad: PADS, guitar: GUITAR_PATTERNS };
export function ideaOf(type, pattern = {}) {
  if (pattern.idea) return pattern.idea;
  const table = TABLES[type];
  return table && pattern.preset && table[pattern.preset] ? table[pattern.preset].idea : null;
}
const num = v => (Number.isFinite(+v) ? +v : 0);
// alternation items with their repeats written out ("<a!3 b>" → [a, a, a, b])
const altList = text => { const items = altItems(text); if (!items) return [text]; return items.flatMap(x => { const m = x.match(/^(.*)!(\d+)$/); return m ? Array(+m[2]).fill(m[1]) : [x]; }); };
const unwrap = s => s.replace(/^\[(.*)\]$/s, '$1');
// the value of a mini-notation at a time of a cycle (the event covering it), or 0
const valueAt = (text, c, at) => { if (text === undefined || text === null) return 0; try { const ev = miniEvents(String(text), c).find(x => at >= x.b - 1e-9 && at < x.e - 1e-9); return ev ? num(ev.v) : 0; } catch (e) { return 0; } };
// onsets of a rhythm idea in a bar: [{ b, e }] in parts of the bar
function rhythmEvents(idea, N, c) {
  if (idea.hold) return [{ b: 0, e: 1 }];
  const r = idea.rhythm;
  if (r === undefined) return null;
  const text = idea.per === 'beat' ? beatForm(r, idea.half ?? r, N) : idea.per === 'slot' ? slotTokens(r, N).join(' ') : r;
  return miniEvents(text, c).filter(x => x.v !== '~');
}
// MIDI notes of a chord (pad voicing, arpeggio notes, bass root), with fallbacks for names outside the table
const chordNotes = (ch, part) => { const c = CHORDS[ch]; if (c) return (part === 'arp' ? c.arp : c[part].split(',')).map(midi); const r = 57 + rootOf(ch); return part === 'bass' ? [r - 24] : part === 'arp' ? [r, r + 3, r + 7, r + 12] : [r - 12, r - 9, r - 5]; };
const degreeSemis = (d, mode) => { if (mode === 'chromatic') return d; const st = modeSteps(mode), o = Math.floor(d / 7); return st[((d % 7) + 7) % 7] + 12 * o; };
// a small seeded number for random indices (no Math.random: the preview is the same every time)
const hashInt = (s, max) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % Math.max(1, max)); };

// the notes of one bar: [{ b, e, p: [MIDI notes] }]
function barNotes(type, pattern, idea, ctx, c, N) {
  const ch = ctx.chords[c % ctx.chords.length], mode = ctx.mode || 'minor';
  if (pattern.steps && /x/.test(pattern.steps)) {
    const steps = pattern.steps.slice(0, N), evs = [...steps].map((x, k) => (x === 'x' ? { b: k / N, e: (k + 1) / N } : null)).filter(Boolean);
    const p = type === 'pad' ? chordNotes(ch, 'pad') : type === 'hook' ? [57] : chordNotes(ch, type === 'arp' ? 'arp' : 'bass').slice(0, 1);
    return evs.map(ev => ({ ...ev, p }));
  }
  if (!idea) return [];
  if (type === 'hook' && (idea.degrees !== undefined)) {
    const deg = String(idea.degrees);
    const text = idea.per === 'slot' ? (() => { const items = altList(deg); return slotTokens(unwrap(items[c % items.length]), Math.max(1, Math.round(N / 2))).join(' '); })() : deg;
    const cyc = idea.per === 'slot' ? 0 : c;
    return miniEvents(text, cyc).filter(x => x.v !== '~').map(ev => ({ b: ev.b, e: ev.e, p: [57 + degreeSemis(num(ev.v) + valueAt(idea.add, c, ev.b), mode)] }));
  }
  if (type === 'arp') {
    const notes = chordNotes(ch, 'arp'), at = i => notes[((i % notes.length) + notes.length) % notes.length] + 12 * Math.floor(i / notes.length);
    if (idea.random) {
      const seg = idea.random.seg || 8, max = idea.random.max || 4, cyc = idea.random.cycles ? c % idea.random.cycles : c;
      return Array.from({ length: seg }, (_, k) => ({ b: k / seg, e: (k + 1) / seg, p: [at(hashInt(`${idea.random.seed}:${cyc}:${k}`, max))] }));
    }
    if (idea.index === undefined) return [];
    const count = pattern.speed === '8' ? N / 2 : N, text = idea.per === 'slot' ? slotTokens(idea.index, count).join(' ') : idea.index;
    return miniEvents(text, c).filter(x => x.v !== '~').map(ev => ({ b: ev.b, e: ev.e, p: [at(num(ev.v))] }));
  }
  const evs = rhythmEvents(idea, N, c) || [{ b: 0, e: 1 }];
  if (type === 'pad') return evs.map(ev => ({ b: ev.b, e: ev.e, p: chordNotes(ch, 'pad') }));
  // bass and guitar: the chord root (a power chord on the root for the guitar) with the semitones on top
  const root = chordNotes(ch, 'bass')[0] + (type === 'guitar' ? 12 : 0);
  const adds = idea.add !== undefined && idea.per === 'slot' ? slotTokens(idea.add, N) : null;
  return evs.map(ev => ({ b: ev.b, e: ev.e, p: [root + (adds ? num(adds[Math.min(N - 1, Math.round(ev.b * N))]) : valueAt(idea.add, c, ev.b))] }));
}
// what a pattern plays over one to four bars. ctx: { chords (a progression name or chord names), meter, mode }
// → { grid: true, N, rows: [[row, "x..x"]] } for grooves, { N, bars, notes: [{ b, e, p }], lo, hi } for the rest
export function previewOf(type, pattern = {}, ctx = {}) {
  const N = meterSteps(ctx.meter || '4/4');
  if (type === 'drums') {
    const rows = pattern.rows ? Object.fromEntries(Object.entries(pattern.rows).map(([k, v]) => [k, String(v).slice(0, N).padEnd(N, '.')])) : ideaRows(ideaOf(type, pattern) || {}, N);
    return { grid: true, N, rows: ROWS.map(([id]) => id).filter(id => rows[id] && rows[id].includes('x')).map(id => [id, rows[id]]) };
  }
  const chords = chordsOf({ chords: ctx.chords || 'notturna' }), idea = ideaOf(type, pattern), bars = [];
  for (let c = 0; c < 4; c++) { let evs = []; try { evs = barNotes(type, pattern, idea, { ...ctx, chords }, c, N); } catch (e) { evs = []; } bars.push(evs); }
  const sig = bars.map(b => JSON.stringify(b));
  const shown = sig.every(s => s === sig[0]) ? 1 : sig[0] === sig[2] && sig[1] === sig[3] ? 2 : 4;
  const notes = bars.slice(0, shown).flatMap((evs, c) => evs.map(ev => ({ b: c + ev.b, e: c + ev.e, p: ev.p })));
  const ps = notes.flatMap(n => n.p);
  return { N, bars: shown, notes, lo: ps.length ? Math.min(...ps) : 57, hi: ps.length ? Math.max(...ps) : 57 };
}
// the words a search matches: name, id, kind, styles
export const haystack = (item, label, extra = '') => `${label} ${item.id || ''} ${item.kind} ${item.type} ${(item.styles || []).join(' ')} ${extra}`.toLowerCase();
