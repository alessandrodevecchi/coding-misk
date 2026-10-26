// The voice instrument of a song (voice-placement, #77): the voice instrument options (phrases per song, different,
// repeated or mixed lines, ways) applied to one spoken track of a song. In Compose a rewrite changes the whole track;
// in the radio a steering command changes it from the next quiet part of the song on air (the clips before stay, so
// what was heard does not change). Lines are drawn like the director's (morePhrases), from the song's styles; one clip
// per phrase on a quiet part (a phrase of 8 bars in a quiet section), never two in one part, spread over the song; the count is a ceiling. The track's
// settings, speaker and rack stay. In Compose the options are kept on the track as voiceOptions ({ phrases, kind, ways,
// draw }); draw counts "New phrases", and the same options and draw give the same lines. Pure: the app, the radio
// steering and the Node checks rewrite the same way.
import { normalizeSong, VOICE_DEFAULT } from '../song/format.js';
import { sectionFacts, entryAfter, whereOfTrack } from '../song/spoken.js';
import { VOCABULARY, VOCAB_GROUPS } from '../song/vocabulary.js';
import { stream } from './random.js';
import { morePhrases, CHOP_RHYTHMS } from './director.js';
import { cleanVoice, presetOf, PHRASE_RANGES, VOICE_WAYS, VOICE_WHERE, whereOf, isQuietOnly } from './voice-options.js';

// the phrases-per-song choice a number of clips falls in
const bucketOf = n => (n <= 1 ? '1' : n <= 3 ? '2-3' : n <= 5 ? '4-5' : n <= 8 ? '6-8' : 'many');
// The options of a spoken track: its own (voiceOptions), else read from what it has (how many clips, how many
// different lines), so a generated song opens on what it speaks. { preset, phrases, kind, ways, draw }
export function trackVoice(tr) {
  const own = tr && tr.voiceOptions;
  // (a generated song may carry only where its track speaks, voice-full-controls D7: the rest is read from its clips)
  if (own && typeof own === 'object' && own.phrases !== undefined) {
    const v = cleanVoice({ ...own, presence: 'style' });
    return { ...v, preset: presetOf(v, { presence: false }), draw: Number.isInteger(own.draw) && own.draw > 0 ? own.draw : 0 };
  }
  const clips = (tr && tr.clips) || [], n = Math.max(1, clips.length), keys = new Set(clips.map(c => c.pattern));
  const kind = n > 1 && keys.size === 1 ? 'repeated' : keys.size >= n ? 'different' : 'mixed';
  const v = cleanVoice({ phrases: bucketOf(n), kind, ways: null, presence: 'style', where: whereOfTrack(tr) });
  return { ...v, preset: presetOf(v, { presence: false }), draw: 0 };
}

// the voice instrument of the song's styles, merged: ways summed, lines per way, the first vocabulary group. spoken:
// a recipe's own (the radio passes the song's plan recipe)
function styleSpoken(song, recipes, spoken) {
  const byId = Array.isArray(recipes) ? Object.fromEntries(recipes.map(r => [r.id, r])) : recipes || {};
  const own = spoken ? [{ spoken }] : ((song.tags && song.tags.styles) || []).map(id => byId[id]).filter(r => r && r.spoken);
  const ways = {}, lines = {};
  for (const r of own) {
    for (const [k, x] of Object.entries(r.spoken.ways || {})) if (VOICE_WAYS.includes(k) && x > 0) ways[k] = (ways[k] || 0) + x;
    for (const [k, l] of Object.entries(r.spoken.lines || {})) lines[k] = [...(lines[k] || []), ...l];
  }
  const vocab = own.map(r => r.spoken.vocab).find(g => VOCAB_GROUPS.includes(g));
  return { ways: Object.keys(ways).length ? ways : Object.fromEntries(VOICE_WAYS.map(k => [k, 1])), lines, ...(vocab ? { vocab } : {}) };
}
const extrasOf = (way, r) => ({ ...(way === 'refrain' ? { every: r.pick([2, 4]) } : {}), ...(way === 'chop' ? { slices: 8, rhythm: r.pick(CHOP_RHYTHMS) } : {}) });
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// a part: a phrase of 8 bars (the director's) inside a section, the section's end cutting the last one
export const PART_BARS = 8;
const partsOf = (s, i) => Array.from({ length: Math.ceil(s.bars / PART_BARS) }, (_, k) => ({ start: s.start + k * PART_BARS, bars: Math.min(PART_BARS, s.bars - k * PART_BARS), i }));
// the quiet parts of a song from a bar on (the phrases of its quiet sections): [{ start, bars, i }]
export function quietParts(song, from = 0) {
  const N = normalizeSong(song), facts = sectionFacts(N);
  return N.sections.flatMap((s, i) => (facts.quiet[i] ? partsOf(s, i) : [])).filter(p => p.start >= from);
}
// The parts of the kinds `where` allows (voice-full-controls D7), from a bar on, ordered by kind (quiet, medium, busy)
// then by bar: [{ start, bars, i, kind }]. Quiet only gives the quiet parts, as quietParts.
export function wherePartsOf(song, from = 0, where = ['quiet']) {
  const N = normalizeSong(song), facts = sectionFacts(N), w = whereOf(where);
  const all = N.sections.flatMap((s, i) => (w.includes(facts.kinds[i]) ? partsOf(s, i).map(p => ({ ...p, kind: facts.kinds[i] })) : [])).filter(p => p.start >= from);
  return VOICE_WHERE.flatMap(k => all.filter(p => p.kind === k));
}
// the bar where a change from `from` starts: the first quiet section at or after it (the first part of the kinds
// allowed, with where), or null
export function nextQuiet(song, from, where = null) {
  if (where && !isQuietOnly(where)) { const l = wherePartsOf(song, from, where).sort((a, b) => a.start - b.start); return l.length ? l[0].start : null; }
  const p = quietParts(song, from)[0]; return p ? p.start : null;
}
// k parts among the parts given (ordered by kind): the first kinds first, each kind spread over the song as before,
// never two in one part; sorted by bar
export function pickParts(parts, k) {
  const out = [];
  for (const kind of VOICE_WHERE) {
    const list = parts.filter(p => (p.kind || 'quiet') === kind), need = k - out.length;
    if (need <= 0) break;
    const idx = list.length <= need ? list.map((_, i) => i) : Array.from({ length: need }, (_, j) => Math.round(j * (list.length - 1) / Math.max(1, need - 1)));
    out.push(...idx.map(i => list[i]));
  }
  return out.sort((a, b) => a.start - b.start);
}

// a new voice instrument track for a song that has none: the default voice settings, the speaker drawn when it plays
export function newSpokenTrack(song) {
  const ids = new Set((song.tracks || []).map(x => x.id));
  let id = 'words', k = 2;
  while (ids.has(id)) id = `words-${k++}`;
  return { id, name: 'Words', type: 'spoken', settings: { ...VOICE_DEFAULT, gain: 0.5, room: 0.3 }, patterns: {}, clips: [] };
}

// Rewrites the spoken track `trackId` of `song` with the options `raw` ({ phrases, kind, ways, draw, presence }).
// Returns { song, track, asked, placed, from } or null when nothing can change (no such track, no quiet part left).
//   recipes: the style recipes (list or map); spoken: a recipe's spoken block instead of the song's styles;
//   from: a bar (radio steering): the clips before the first quiet section at or after it stay, the new phrases go
//   there and after; presence "never" leaves only those; seed: the random stream's name (default: song, track, options).
// With trackId null a new track is made (and added before the narrator), with an add step when the song builds live.
export function rewriteSpoken(song, trackId, raw, { recipes = [], spoken = null, from = 0, seed = null } = {}) {
  const tracks = (song.tracks || []).map(x => x);
  let ti = trackId ? tracks.findIndex(x => x.id === trackId && x.type === 'spoken') : -1;
  if (trackId && ti < 0) return null;
  const old = ti >= 0 ? tracks[ti] : newSpokenTrack(song), id = old.id;
  const v = cleanVoice({ ...(raw || {}), presence: 'style' }), never = raw && raw.presence === 'never';
  const draw = Number.isInteger(raw && raw.draw) && raw.draw > 0 ? raw.draw : 0;
  // where the change starts: the whole song, or the next quiet part (the next part of the kinds allowed) from a bar
  const where = whereOf(raw && raw.where);
  const start = from > 0 ? nextQuiet(song, from, where) : 0;
  if (start === null) return null;
  const N = normalizeSong(song), oldN = ti >= 0 ? N.tracks[ti] : { clips: [] };
  const kept = from > 0 ? oldN.clips.filter(c => c.start < start).map(c => ({ start: c.start, bars: Math.min(c.bars, start - c.start), pattern: c.pattern })) : [];
  const keptKeys = new Set(kept.map(c => c.pattern));
  let patterns = {}, clips = [], asked = 0;
  if (!never) {
    const r = stream(seed || `${song.id || 'song'}:${id}`, `voice-track/${v.phrases}/${v.kind}/${(v.ways || []).join('+')}/${draw}`);
    const sp = styleSpoken(song, recipes, spoken);
    const w = v.ways ? Object.fromEntries(v.ways.map(k => [k, 1])) : sp.ways, ways = Object.keys(w);
    // the first line: one of the style's lines for its way, else a vocabulary entry, written out
    const way = r.weighted(ways, ways.map(k => w[k]));
    const own = sp.lines[way] || [], group = sp.vocab || r.pick(VOCAB_GROUPS);
    const first = own.length ? r.pick(own) : r.pick(VOCABULARY[group]);
    patterns = { A: { way, text: typeof first === 'string' ? first : { ...first }, ...extrasOf(way, r) } };
    const [lo, hi] = PHRASE_RANGES[v.phrases] || [1, 1], n = r.int(lo, hi);
    const list = n > 1 ? morePhrases({ ...sp, vocab: group }, v, patterns, ways, w, n, r) : [{ key: 'A', way }];
    asked = list.length;
    // places: the parts of the kinds allowed, quiet first (in Compose, else the phrases of the section with the fewest
    // tracks), each kind spread, one phrase each
    let parts = wherePartsOf(song, start, where);
    if (!parts.length && !(from > 0) && N.sections.length) { const facts = sectionFacts(N), least = Math.min(...facts.counts), i = facts.counts.indexOf(least); parts = partsOf(N.sections[i], i); }
    if (list.length === 1 && way === 'refrain') clips = [{ start, bars: N.total - start, pattern: 'A' }];
    else {
      const chosen = pickParts(parts, Math.min(list.length, parts.length));
      clips = chosen.map((p, j) => ({ start: p.start, bars: p.bars, pattern: list[j].key }));
    }
    // an opening line ends before the first track that comes in within its clip
    for (const c of clips) {
      const pat = patterns[c.pattern];
      if (pat.way !== 'opening') continue;
      const next = N.tracks.filter(x => x.type !== 'voice' && x.type !== 'spoken').map(x => ({ id: x.id, at: entryAfter(N, x.id, c.start) })).filter(x => x.at !== null && x.at <= c.start + c.bars).sort((a, b) => a.at - b.at)[0];
      if (next) patterns[c.pattern] = { ...pat, before: next.id };
    }
    const used = new Set(clips.map(c => c.pattern));
    patterns = Object.fromEntries(Object.entries(patterns).filter(([key]) => used.has(key)));
    // (from a bar: the new lines take letters the kept clips do not use)
    if (keptKeys.size) {
      const free = [...KEYS].filter(x => !keptKeys.has(x) && !Object.keys(old.patterns || {}).includes(x)), map = {};
      Object.keys(patterns).forEach((key, i) => { map[key] = free[i] || `${key}${i + 2}`; });
      patterns = Object.fromEntries(Object.entries(patterns).map(([key, p]) => [map[key], p]));
      clips = clips.map(c => ({ ...c, pattern: map[c.pattern] }));
    }
  }
  const keepPats = Object.fromEntries(Object.entries(old.patterns || {}).filter(([key]) => keptKeys.has(key)));
  const track = { ...JSON.parse(JSON.stringify(old)), patterns: { ...JSON.parse(JSON.stringify(keepPats)), ...patterns }, clips: [...kept, ...clips] };
  if (!(from > 0)) { track.voiceOptions = { phrases: v.phrases, kind: v.kind, ...(v.ways ? { ways: v.ways } : {}), ...(isQuietOnly(where) ? {} : { where }), draw }; }
  // (from a bar, radio steering: the Where of the command reaches the refrains of the track)
  else if (!isQuietOnly(where)) track.voiceOptions = { ...(track.voiceOptions || {}), where };
  if (ti >= 0) tracks[ti] = track;
  else { const nar = tracks.findIndex(x => x.type === 'voice'); tracks.splice(nar >= 0 ? nar : tracks.length, 0, track); ti = tracks.indexOf(track); }
  // the live build: the track comes in on its first new clip (in Compose an add step that came later moves there)
  let build = song.build;
  if (Array.isArray(song.build) && song.build.length && clips.length) {
    const at = Math.min(...clips.map(c => c.start)), adds = s => (s.add === undefined ? [] : [].concat(s.add));
    const has = song.build.filter(s => adds(s).includes(id)), firstAdd = has.length ? Math.min(...has.map(s => s.at)) : Infinity;
    if (firstAdd > at) {
      build = (from > 0 ? song.build.map(s => ({ ...s })) : song.build.map(s => {
        if (!adds(s).includes(id)) return { ...s };
        const rest = adds(s).filter(x => x !== id), y = { ...s };
        if (rest.length) y.add = rest.length === 1 ? rest[0] : rest; else delete y.add;
        return y;
      }).filter(s => Object.keys(s).some(key => key !== 'at')));
      build.push({ at, add: id, ...(from > 0 ? { by: 'listener' } : {}) });
      build = build.map((s, i) => ({ s, i })).sort((a, b) => a.s.at - b.s.at || a.i - b.i).map(o => o.s);
    }
  }
  const out = { ...song, tracks, ...(build !== undefined ? { build } : {}) };
  return { song: out, track, asked, placed: clips.length, from: start };
}
