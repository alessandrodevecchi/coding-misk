// The phrase list of the voice instrument (voice-full-controls D5, D6, D16): every line a spoken track says, one row
// per clip, sorted by bar, with the bars where it is said in the build that plays (Crescendo and Live coder grow G bars
// before the written part), and the edits the list makes: text, bars, way, fill from a vocabulary, add, remove. Bars
// are stored once, as written. Every edit returns a new song (the caller records it as one edit, with Undo). Pure: the
// app and the Node checks edit the same way.
import { normalizeSong } from '../song/format.js';
import { placeSpoken, lineOf, lineTexts, MAX_WORDS, WAYS } from '../song/spoken.js';
import { VOCABULARY, VOCAB_GROUPS } from '../song/vocabulary.js';
import { wherePartsOf, pickParts, trackVoice } from './voice-track.js';
import { PHRASE_RANGES, VOICE_WAYS } from './voice-options.js';
import { CHOP_RHYTHMS } from './director.js';

const clone = o => JSON.parse(JSON.stringify(o));
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// the vocabulary groups the list can fill from (the poetic group is the narrator's)
export const FILL_GROUPS = VOCAB_GROUPS.filter(g => g !== 'poetic');

// the vocabulary group a pattern's text comes from: "vocab:<group>", or an entry of a group written out; else null
export function vocabOf(pat) {
  const x = pat && pat.text;
  if (typeof x === 'string') return x.startsWith('vocab:') && VOCAB_GROUPS.includes(x.slice(6)) ? x.slice(6) : null;
  if (!x || typeof x !== 'object') return null;
  // (entries written out, voice-track-tuning D4: the group of all of them)
  const list = Array.isArray(x) ? x : [x];
  return (list.length && FILL_GROUPS.find(g => list.every(y => y && VOCABULARY[g].some(e => e.en === y.en && (y.it === undefined || e.it === y.it))))) || null;
}
// where a row's text comes from: own (written here), vocab (a vocabulary entry or group), style (the style's lines or a draw)
export const sourceOf = pat => (vocabOf(pat) ? 'vocab' : pat && pat.text ? 'own' : 'style');

// the clips of a track as normalizeSong sorts them (by start, stable), each with its index in the raw list
function sortedIndex(song, ti) {
  const N = normalizeSong({ ...song, tracks: song.tracks.map((t, j) => (j === ti ? { ...t, clips: (t.clips || []).map((c, i) => ({ ...c, _raw: i })) } : t)) });
  return N.tracks[ti].clips.map(c => ({ raw: c._raw, start: c.start, bars: c.bars, pattern: c.pattern }));
}

// Rows of a spoken track: [{ raw, start, bars, key, way, pat, texts, source, group, shared, said: [bars], heard:
// { start, said } | null, toTranslate }], sorted by bar. heard: the build that plays ({ song, G }) when it moves the bars.
export function phraseRows(song, trackId, { heard = null, lang = 'en' } = {}) {
  const ti = (song.tracks || []).findIndex(t => t.id === trackId && t.type === 'spoken');
  if (ti < 0) return [];
  const tr = song.tracks[ti], clips = sortedIndex(song, ti), other = lang === 'it' ? 'en' : 'it';
  const placed = placeSpoken(song, lang).filter(p => p.track === trackId);
  const grown = heard && heard.song && heard.G > 0 ? placeSpoken(heard.song, lang).filter(p => p.track === trackId) : null;
  const uses = key => clips.filter(c => c.pattern === key).length;
  return clips.map((c, k) => {
    const pat = (tr.patterns || {})[c.pattern] || {}, line = lineOf(song, tr, c.pattern, pat);
    const p = placed.find(x => x.ci === k), g = grown ? grown.find(x => x.ci === k) : null;
    const own = pat.text && typeof pat.text === 'object' ? pat.text : null;
    return {
      raw: c.raw, start: c.start, bars: c.bars, key: c.pattern, way: WAYS.includes(pat.way) ? pat.way : 'passage', pat,
      texts: lineTexts(line, lang), source: sourceOf(pat), group: vocabOf(pat), shared: uses(c.pattern),
      said: p ? [...new Set(p.starts.map(s => s.bar))].sort((a, b) => a - b) : [],
      heard: grown ? { start: c.start + heard.G, said: g ? [...new Set(g.starts.map(s => s.bar))].sort((a, b) => a - b) : [] } : null,
      toTranslate: !!own && !vocabOf(pat) && !own[other],
    };
  });
}
// the value of the "Fill with" select: the group every row comes from, "mixed" when rows mix sources, "" when none
export function listVocab(rows) {
  if (!rows.length) return '';
  const g = rows.map(r => r.group);
  if (g.every(x => x && x === g[0])) return g[0];
  return g.some(Boolean) ? 'mixed' : '';
}

// a copy of the song with the track at ti replaced by fn(track copy)
function withTrack(song, trackId, fn) {
  const tracks = song.tracks.map(t => t), ti = tracks.findIndex(t => t.id === trackId && t.type === 'spoken');
  if (ti < 0) return null;
  const tr = clone(tracks[ti]);
  const out = fn(tr, ti);
  if (out === null) return null;
  tracks[ti] = tr;
  return { ...song, tracks };
}
// patterns no clip plays any more go
const prune = tr => { const used = new Set((tr.clips || []).map(c => c.pattern)); tr.patterns = Object.fromEntries(Object.entries(tr.patterns || {}).filter(([k]) => used.has(k))); };
const freeKey = tr => KEYS.split('').find(k => !(tr.patterns || {})[k]) || `P${Object.keys(tr.patterns || {}).length + 1}`;
// a clip at fixed bars (one that followed its section keeps its place)
function fix(song, ti, tr, raw) {
  const s = sortedIndex(song, ti).find(x => x.raw === raw), c = tr.clips[raw];
  delete c.section; c.start = s.start; c.bars = s.bars;
  return c;
}
const extrasOf = (way, n = 0) => ({ ...(way === 'refrain' ? { every: 4 } : {}), ...(way === 'chop' ? { slices: 8, rhythm: CHOP_RHYTHMS[n % CHOP_RHYTHMS.length] } : {}) });
// a pattern with another way: the values of the old way that do not belong to the new one go
export function withWay(pat, way) {
  const p = { ...pat, way };
  if (way !== 'refrain') delete p.every;
  if (way !== 'chop') { delete p.slices; delete p.rhythm; }
  if (way !== 'passage' && way !== 'opening') delete p.before;
  return { ...p, ...Object.fromEntries(Object.entries(extrasOf(way)).filter(([k]) => p[k] === undefined)) };
}

// The text of a row in a language: an own text, the other language kept (an own text, else the line it said before is
// not kept: it then speaks the edited text and shows "to translate"). Every clip that plays the pattern says it.
// → { song } or { error: 'empty' | 'words', n }
export function editText(song, trackId, raw, lang, text) {
  const v = String(text || '').trim().replace(/\s+/g, ' ');
  if (!v) return { error: 'empty' };
  if (words(v) > MAX_WORDS) return { error: 'words', n: words(v) };
  const other = lang === 'it' ? 'en' : 'it';
  const out = withTrack(song, trackId, tr => {
    const c = tr.clips[raw]; if (!c) return null;
    const pat = tr.patterns[c.pattern] || {}, own = pat.text && typeof pat.text === 'object' && !vocabOf(pat) ? pat.text : null;
    // a vocabulary entry written out keeps its other language, so its sample keeps working there
    const keep = pat.text && typeof pat.text === 'object' && pat.text[other] ? pat.text[other] : own && own[other];
    tr.patterns[c.pattern] = { ...pat, text: { [lang]: v, ...(keep ? { [other]: keep } : {}) } };
  });
  return out ? { song: out } : { error: 'none' };
}
// The bars of a row: start (as heard in the build that plays, offset G) and length. A start inside the growth is
// refused with the first bar that works; a clip may not overlap another clip of the track.
// → { song } or { error: 'growth' | 'overlap' | 'range', first, at }
export function editBars(song, trackId, raw, { start = null, bars = null, G = 0 } = {}) {
  const ti = (song.tracks || []).findIndex(t => t.id === trackId && t.type === 'spoken');
  if (ti < 0) return { error: 'none' };
  const total = normalizeSong(song).total, list = sortedIndex(song, ti), me = list.find(x => x.raw === raw);
  if (!me) return { error: 'none' };
  let s = me.start, b = me.bars;
  if (start !== null) { if (start < G) return { error: 'growth', first: G }; s = start - G; }
  if (bars !== null) b = bars;
  if (!(s >= 0 && s < total && b >= 1)) return { error: 'range', first: G };
  b = Math.min(b, total - s);
  const hit = list.find(x => x.raw !== raw && x.start < s + b && x.start + x.bars > s);
  if (hit) return { error: 'overlap', at: hit.start + G };
  const out = withTrack(song, trackId, tr => { const c = fix(song, ti, tr, raw); c.start = s; c.bars = b; });
  return { song: out };
}
// the way of a row's line (every clip that plays the pattern)
export function editWay(song, trackId, raw, way) {
  if (!WAYS.includes(way)) return null;
  return withTrack(song, trackId, tr => { const c = tr.clips[raw]; if (!c) return null; tr.patterns[c.pattern] = withWay(tr.patterns[c.pattern] || {}, way); });
}
// a row removed: its clip, and its line when no clip plays it any more; the track stays, also with no clip
export function removeRow(song, trackId, raw) {
  return withTrack(song, trackId, tr => { if (!tr.clips[raw]) return null; tr.clips.splice(raw, 1); prune(tr); });
}

// the free parts where the track may speak (its Where), from a bar on: parts no clip of the track overlaps
export function freeParts(song, trackId, from = 0) {
  const ti = song.tracks.findIndex(t => t.id === trackId), tr = song.tracks[ti], v = trackVoice(tr);
  const clips = sortedIndex(song, ti);
  return wherePartsOf(song, from, v.where).filter(p => !clips.some(c => c.start < p.start + p.bars && c.start + c.bars > p.start));
}
// the first way the track may use: its own ways, else the style's first, else a passage
const firstWay = (tr, styleWays) => { const v = trackVoice(tr); return (v.ways && v.ways[0]) || (styleWays && styleWays[0]) || 'passage'; };
// vocabulary entries of a group not used yet by the track (by their English text), in the vocabulary's order
function unused(tr, group, lang) {
  const used = new Set(Object.values(tr.patterns || {}).map(p => (p.text && typeof p.text === 'object' ? p.text.en : '')).filter(Boolean));
  return VOCABULARY[group].filter(e => !used.has(e.en));
}

// "+ Add phrase": a clip in the next free part allowed by Where after the last row (else the first free one), with the
// first allowed way; its text the next unused entry of `group`, or none (the caller focuses an empty cell).
// → { song, raw, start } or { error: 'no-part' }
export function addRow(song, trackId, { group = null, styleWays = null } = {}) {
  const ti = song.tracks.findIndex(t => t.id === trackId && t.type === 'spoken');
  if (ti < 0) return { error: 'none' };
  const tr0 = song.tracks[ti], list = sortedIndex(song, ti), last = list.length ? list[list.length - 1] : null;
  const after = freeParts(song, trackId, last ? last.start + last.bars : 0).sort((a, b) => a.start - b.start);
  const part = after[0] || freeParts(song, trackId, 0).sort((a, b) => a.start - b.start)[0];
  if (!part) return { error: 'no-part' };
  let raw = -1;
  const out = withTrack(song, trackId, tr => {
    const key = freeKey(tr), way = firstWay(tr0, styleWays), entry = FILL_GROUPS.includes(group) ? unused(tr, group)[0] : null;
    tr.patterns[key] = { way, ...extrasOf(way, list.length), ...(entry ? { text: { ...entry } } : {}) };
    tr.clips.push({ start: part.start, bars: part.bars, pattern: key });
    raw = tr.clips.length - 1;
  });
  return { song: out, raw, start: part.start };
}
// "Fill with": each row gets an entry of the group not used yet (both languages, its samples), keeping its bars and way;
// an empty list gets as many rows as Phrases per song asks, placed by Where. → { song, filled } or { error }
export function fillRows(song, trackId, group, { styleWays = null } = {}) {
  if (!FILL_GROUPS.includes(group)) return { error: 'group' };
  const ti = song.tracks.findIndex(t => t.id === trackId && t.type === 'spoken');
  if (ti < 0) return { error: 'none' };
  const tr0 = song.tracks[ti], list = sortedIndex(song, ti);
  let filled = 0;
  const out = withTrack(song, trackId, tr => {
    // (the entries already in use by other rows are not used again; the rows' own lines are replaced)
    tr.patterns = Object.fromEntries(Object.entries(tr.patterns || {}).map(([k, p]) => [k, { ...p, text: undefined }]));
    const pool = unused(tr, group);
    if (!list.length) {
      const v = trackVoice(tr0), [lo, hi] = PHRASE_RANGES[v.phrases] || [1, 1], n = Math.max(lo, Math.min(hi, pool.length));
      const parts = pickParts(wherePartsOf(song, 0, v.where), n), way = firstWay(tr0, styleWays);
      tr.patterns = {}; tr.clips = [];
      parts.forEach((p, j) => { if (!pool[j]) return; const key = KEYS[j]; tr.patterns[key] = { way, ...extrasOf(way, j), text: { ...pool[j] } }; tr.clips.push({ start: p.start, bars: p.bars, pattern: key }); filled++; });
      return;
    }
    // one pattern per row, so each row says its own entry
    const old = clone(tr0.patterns || {}), pats = {};
    list.forEach((c, j) => {
      const e = pool[j]; if (!e) return;
      const key = KEYS[j] || `P${j + 1}`, base = { ...(old[c.pattern] || { way: 'passage' }) };
      delete base.text;
      pats[key] = { ...base, text: { ...e } };
      const cl = tr.clips[c.raw]; cl.pattern = key; filled++;
    });
    // (rows the vocabulary ran out for keep their own line)
    list.forEach((c, j) => { if (!pool[j]) { const key = KEYS[j] || `P${j + 1}`; pats[key] = clone(old[c.pattern] || { way: 'passage' }); tr.clips[c.raw].pattern = key; } });
    tr.patterns = pats;
  });
  if (!out) return { error: 'none' };
  for (const t of out.tracks) if (t.patterns) for (const p of Object.values(t.patterns)) if (p && p.text === undefined) delete p.text;
  return { song: out, filled };
}
// "Fill with: Le mie frasi" (my-phrases D4): each row gets a voice phrase of mine not used yet (least used first), in
// the app's language with its translation, keeping its bars and way; an empty list gets as many rows as Phrases per
// song asks. phrases: the collection's items; styles: the song's. → { song, filled } or { error: 'none' | 'empty' }
export function fillMine(song, trackId, phrases, { lang = 'en', styles = [], styleWays = null } = {}) {
  const pool = (phrases || []).filter(p => p && p.on !== false && p.kind === 'voice' && (p.lang === lang || (p.alt && p.alt[lang])) && (!(p.styles || []).length || p.styles.some(x => styles.includes(x))))
    .slice().sort((a, b) => (a.uses || 0) - (b.uses || 0) || String(a.created || '').localeCompare(String(b.created || '')))
    .map(p => ({ ...(p.alt || {}), [p.lang]: p.text }));
  if (!pool.length) return { error: 'empty' };
  const ti = song.tracks.findIndex(t => t.id === trackId && t.type === 'spoken');
  if (ti < 0) return { error: 'none' };
  const tr0 = song.tracks[ti], list = sortedIndex(song, ti);
  let filled = 0;
  const out = withTrack(song, trackId, tr => {
    if (!list.length) {
      const v = trackVoice(tr0), [lo, hi] = PHRASE_RANGES[v.phrases] || [1, 1], n = Math.max(lo, Math.min(hi, pool.length));
      const parts = pickParts(wherePartsOf(song, 0, v.where), n), way = firstWay(tr0, styleWays);
      tr.patterns = {}; tr.clips = [];
      parts.forEach((p, j) => { if (!pool[j]) return; const key = KEYS[j]; tr.patterns[key] = { way, ...extrasOf(way, j), text: { ...pool[j] } }; tr.clips.push({ start: p.start, bars: p.bars, pattern: key }); filled++; });
      return;
    }
    const old = clone(tr0.patterns || {}), pats = {};
    list.forEach((c, j) => {
      const key = KEYS[j] || `P${j + 1}`, e = pool[j];
      if (!e) { pats[key] = clone(old[c.pattern] || { way: 'passage' }); tr.clips[c.raw].pattern = key; return; }
      const base = { ...(old[c.pattern] || { way: 'passage' }) };
      delete base.text;
      pats[key] = { ...base, text: { ...e } }; tr.clips[c.raw].pattern = key; filled++;
    });
    tr.patterns = pats;
  });
  return out ? { song: out, filled } : { error: 'none' };
}
export { VOICE_WAYS };
