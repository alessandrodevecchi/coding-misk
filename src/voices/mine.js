// The director uses my phrases (my-phrases D4): a phrase of mine may take the place of a line that comes from a
// built-in pool (a vocabulary entry of the voice track, an explaining line of PHRASES, POOL or the growths' comments, a
// poetic image), never of a song's or a style's own line. The pool draw happens first and unchanged; the substitution
// is a second draw on a stream of its own (`mine/<kind>/<key>`, seeded by the song), read only when the share is above
// Mai and the line has at least one candidate, so with Mai or an empty collection every draw and fixture stays as it
// was. Least used first: among the candidates with the fewest uses, one is drawn. Pure: the app and the Node checks
// draw the same way.
import { stream } from '../endless/random.js';
import { textIn, lineOfPhrase } from './phrases.js';
import { momentOfLine } from './moments.js';
import { VOCABULARY, VOCAB_GROUPS, POETIC } from '../song/vocabulary.js';

// The candidates for a pool line: switched on, the same kind, a text in the language, the tag equal or none, the styles
// none or one of the song's. list: phrases (the collection's items, or a snapshot)
export function candidates(list, { kind, tag = null, lang, styles = [] }) {
  return (list || []).filter(p => p && p.on !== false && p.kind === kind && !!textIn(p, lang)
    && (!p.tag || p.tag === tag) && (!(p.styles || []).length || p.styles.some(s => styles.includes(s))));
}
// The phrase that replaces a pool line, or null: share 0 or no candidate reads no stream
export function drawMine(cands, share, seed, kind, key) {
  if (!(share > 0) || !cands || !cands.length) return null;
  const r = stream(String(seed || 'song'), `mine/${kind}/${key}`);
  if (share < 1 && !r.chance(share)) return null;
  const least = Math.min(...cands.map(p => p.uses || 0));
  const pool = cands.filter(p => (p.uses || 0) === least).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return r.pick(pool);
}

// The part of the collection a song or a session takes with it: the switched-on phrases with the fields a draw reads,
// the share and the language; null with Mai or no phrase. The radio records it in the session recipe, so Replay draws
// the same lines after the collection changed.
export function mineSnapshot(items, share, lang) {
  if (!(share > 0)) return null;
  const list = (items || []).filter(p => p && p.on !== false && textIn(p, lang)).map(p => ({ id: p.id, text: p.text, lang: p.lang, alt: { ...(p.alt || {}) }, kind: p.kind, tag: p.tag || null, styles: [...(p.styles || [])], uses: p.uses || 0 }));
  return list.length ? { share, lang, list } : null;
}

// ---------- the voice track (the radio director, "New phrases" and "Fill with" of Compose) ----------
// the vocabulary group of a pattern's text: "vocab:<group>", or a vocabulary entry written out; else null (a style's
// line or a line the user wrote, never replaced)
export function vocabGroupOf(text) {
  if (typeof text === 'string') return text.startsWith('vocab:') && VOCAB_GROUPS.includes(text.slice(6)) ? text.slice(6) : null;
  if (!text || typeof text !== 'object') return null;
  // (entries written out, voice-track-tuning D4: the group of all of them)
  const list = Array.isArray(text) ? text : [text];
  return (list.length && VOCAB_GROUPS.find(g => list.every(x => x && VOCABULARY[g].some(e => e.en === x.en && (x.it === undefined || e.it === x.it))))) || null;
}
// A spoken track's patterns with my phrases in place of their vocabulary lines (written out). mine: a snapshot; seed:
// the song's id. Changes the track in place; → the ids of the phrases written
export function mineSpokenTrack(track, mine, seed, styles = []) {
  const used = [];
  if (!mine || !track || !track.patterns) return used;
  const taken = new Set();
  for (const key of Object.keys(track.patterns).sort()) {
    const pat = track.patterns[key], group = pat && vocabGroupOf(pat.text);
    if (!group) continue;
    // (a phrase already written in another line of the track is not used again while others are left)
    const all = candidates(mine.list, { kind: 'voice', tag: group, lang: mine.lang, styles });
    const fresh = all.filter(p => !taken.has(p.id));
    const p = drawMine(fresh.length ? fresh : all, mine.share, seed, 'voice', `${track.id}:${key}`);
    if (!p) continue;
    track.patterns[key] = { ...pat, text: lineOfPhrase(p) };
    taken.add(p.id); used.push(p.id);
  }
  return used;
}

// ---------- the narrator (the narration layer of src/song/build.js) ----------
// whether a poetic line comes from the built-in images (POETIC), not from the song or its style
const POETIC_ITEMS = new Set(Object.values(POETIC).flat());
export const fromPoeticPool = line => POETIC_ITEMS.has(line);

// A narrator pick for setNarratorMine (build.js): source(song) gives what a song may draw from: the song's own
// written snapshot (song.mine, a radio song) or, in Compose, the collection { share, lang, list, own } (own: the texts
// of the song's own written steps, never replaced). → (song, { kind, say, key, tag, lang }) → the text or null
export function narratorPick(source = () => null) {
  return (song, { kind, say, key, tag = null, lang }) => {
    const src = song && song.mine && Array.isArray(song.mine.list) ? song.mine : source(song);
    if (!src || !(src.share > 0)) return null;
    let t = tag;
    if (kind === 'explain') {
      t = momentOfLine(say);
      if (!t) return null;
      const en = typeof say === 'string' ? say : say && say.en;
      if (src.own && en && src.own.has(en)) return null;
    }
    const styles = (song.tags && song.tags.styles) || [];
    const p = drawMine(candidates(src.list, { kind, tag: t, lang, styles }), src.share, song.id || 'song', kind, key);
    return p ? textIn(p, lang) : null;
  };
}

// The phrases of mine a song says (for the use counts, D4: counted when the song plays): texts of the schedule
// matched to the collection in a language → ids
export function idsSaid(texts, items, lang) {
  const set = new Set(texts.map(x => String(x || '').trim().toLowerCase()));
  return (items || []).filter(p => { const x = textIn(p, lang); return x && set.has(x.trim().toLowerCase()); }).map(p => p.id);
}
