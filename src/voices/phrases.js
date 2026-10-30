// My phrases (my-phrases D1): the user's personal collection of spoken lines, kept in the browser storage under
// `coding-misk-phrases` and in the app backup. One phrase per text, language and kind (its key: kind, language and the
// sample file name of the text), so writing a line again adds a use and never a copy. Pure: the app and the Node checks
// (tools/check-phrases.mjs) use the same functions; every change returns a new store.
//   { format: 1, items: [{ id, text, lang, alt: { en }, kind: 'voice' | 'explain' | 'poetic', tag, styles: [], on,
//     source: 'radio' | 'compose' | 'narrator' | 'tab' | 'copy', from: { song, style }, created, uses, last }] }
import { saySlug } from '../song/build.js';
import { VOCAB_GROUPS } from '../song/vocabulary.js';
import { MOMENTS, POETIC_TAGS } from './moments.js';

export const PHRASES_KEY = 'coding-misk-phrases';
export const SETTINGS_KEY = 'coding-misk-phrase-settings';
export const KINDS = ['voice', 'explain', 'poetic'];
export const SOURCES = ['radio', 'compose', 'narrator', 'tab', 'copy'];
export const LANGS = ['it', 'en'];
// the helper's limits (vite.config.js): at most 12 words, 160 characters
export const MAX_WORDS = 12;
export const MAX_CHARS = 160;
// past this many phrases the oldest unused are proposed for deletion in the tab, never removed silently
export const CAP = 1000;

// the tags a kind may carry (null: any)
export const TAGS = { voice: VOCAB_GROUPS, explain: MOMENTS, poetic: POETIC_TAGS };
export const validTag = (kind, tag) => tag === null || tag === undefined || (TAGS[kind] || []).includes(tag);

// ---------- settings (D3, D4, D6) ----------
// save: Salva sempre (always, default), Chiedi ogni volta (ask), Non salvare mai (never)
export const SAVE = ['always', 'ask', 'never'];
// temp: the lifetime of the samples of unsaved lines: A fine brano (song), Dopo 24 ore (24h, default), Dopo 7 giorni (7d)
export const TEMP = ['song', '24h', '7d'];
export const TEMP_MS = { song: 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 };
// share: how often a phrase of mine replaces a pool line (Mai, Ogni tanto, Spesso, Molto, Sempre; owner, round 5)
export const SHARE = { never: 0, sometimes: 0.25, often: 0.5, lots: 0.8, always: 1 };
export const SHARE_LEVELS = Object.keys(SHARE);
export const SETTINGS_DEFAULT = { save: 'always', temp: '24h', share: 'sometimes' };
export function readSettings(raw) {
  const v = raw && typeof raw === 'object' ? raw : {};
  return {
    save: SAVE.includes(v.save) ? v.save : SETTINGS_DEFAULT.save,
    temp: TEMP.includes(v.temp) ? v.temp : SETTINGS_DEFAULT.temp,
    share: SHARE_LEVELS.includes(v.share) ? v.share : SETTINGS_DEFAULT.share,
  };
}
export const shareOf = settings => SHARE[readSettings(settings).share];

// ---------- texts ----------
const clean = s => String(s || '').trim().replace(/\s+/g, ' ');
export const wordsOf = s => clean(s).split(' ').filter(Boolean).length;
// why a text cannot be a phrase: 'empty', 'words', 'long'; null when it can
export function textError(text) {
  const v = clean(text);
  if (!v) return 'empty';
  if (wordsOf(v) > MAX_WORDS) return 'words';
  if (v.length > MAX_CHARS) return 'long';
  return null;
}
export const keyOf = (kind, lang, text) => `${kind}|${lang}|${saySlug(clean(text))}`;
export const phraseKey = p => keyOf(p.kind, p.lang, p.text);
// the text of a phrase in a language: its own, else its translation, else null
export const textIn = (p, lang) => (!p ? null : p.lang === lang ? p.text : (p.alt && p.alt[lang]) || null);
// the phrase as a line of a song: { it: '…', en: '…' } with the languages it has
export const lineOfPhrase = p => ({ ...(p.alt || {}), [p.lang]: p.text });
// every (language, text) of a phrase: its own and its translations
export const textsOf = p => [[p.lang, p.text], ...Object.entries(p.alt || {}).filter(([l, x]) => l !== p.lang && x)];

// ---------- store ----------
export const emptyStore = () => ({ format: 1, items: [] });
// a stored value made safe to read: unknown fields dropped, bad phrases left out
export function readStore(raw) {
  const items = raw && Array.isArray(raw.items) ? raw.items : Array.isArray(raw) ? raw : [];
  const out = [], seen = new Set();
  for (const x of items) {
    const p = normalize(x);
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id); out.push(p);
  }
  return { format: 1, items: out };
}
function normalize(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || textError(x.text) || !LANGS.includes(x.lang) || !KINDS.includes(x.kind)) return null;
  const alt = {};
  for (const l of LANGS) if (l !== x.lang && x.alt && typeof x.alt[l] === 'string' && !textError(x.alt[l])) alt[l] = clean(x.alt[l]);
  return {
    id: x.id, text: clean(x.text), lang: x.lang, alt, kind: x.kind, tag: validTag(x.kind, x.tag) && x.tag ? x.tag : null,
    styles: Array.isArray(x.styles) ? [...new Set(x.styles.filter(s => typeof s === 'string' && s))] : [],
    on: x.on !== false, source: SOURCES.includes(x.source) ? x.source : 'tab',
    from: x.from && typeof x.from === 'object' ? { ...(x.from.song ? { song: String(x.from.song) } : {}), ...(x.from.style ? { style: String(x.from.style) } : {}) } : {},
    created: typeof x.created === 'string' ? x.created : null, uses: Number.isInteger(x.uses) && x.uses > 0 ? x.uses : 0, last: typeof x.last === 'string' ? x.last : null,
  };
}
export const newId = (rand = Math.random) => `ph_${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0')}${Math.floor(rand() * 36 ** 2).toString(36)}`;
export const find = (store, kind, lang, text) => store.items.find(p => phraseKey(p) === keyOf(kind, lang, text)) || null;
export const byId = (store, id) => store.items.find(p => p.id === id) || null;

// Adds a line the user wrote: a new phrase, or one more use of the phrase with the same key (D1, D3). input: { text,
// lang, alt, kind, tag, styles, on, source, from }; use: count the writing as a use (a line typed on air plays at once).
// → { store, phrase, added } or { error }
export function addPhrase(store, input, { now = new Date().toISOString(), rand = Math.random, use = false } = {}) {
  const err = textError(input && input.text);
  if (err) return { error: err };
  if (!LANGS.includes(input.lang) || !KINDS.includes(input.kind)) return { error: 'kind' };
  const old = find(store, input.kind, input.lang, input.text);
  if (old) {
    const p = { ...old, uses: old.uses + 1, last: now };
    return { store: { ...store, items: store.items.map(x => (x === old ? p : x)) }, phrase: p, added: false };
  }
  let id = newId(rand);
  while (byId(store, id)) id = newId(rand);
  const p = normalize({ ...input, id, created: now, uses: use ? 1 : 0, last: use ? now : null, on: input.on !== false });
  if (!p) return { error: 'kind' };
  return { store: { ...store, items: [...store.items, p] }, phrase: p, added: true };
}
// Changes a phrase: text, language, translation, kind, tag, styles, on. A text or kind that would make it the same as
// another phrase is refused. → { store, phrase, before } or { error }
export function editPhrase(store, id, patch) {
  const old = byId(store, id);
  if (!old) return { error: 'none' };
  const next = normalize({ ...old, ...patch, alt: patch.alt !== undefined ? patch.alt : old.alt, id });
  if (!next) return { error: textError(patch.text) || 'kind' };
  const twin = store.items.find(p => p.id !== id && phraseKey(p) === phraseKey(next));
  if (twin) return { error: 'exists', twin };
  return { store: { ...store, items: store.items.map(x => (x.id === id ? next : x)) }, phrase: next, before: old };
}
export function deletePhrase(store, id) {
  const old = byId(store, id);
  if (!old) return { store, removed: null };
  return { store: { ...store, items: store.items.filter(x => x.id !== id) }, removed: old };
}
// Undo of a delete: the phrase back where it was (or last), unless the same key came back meanwhile
export function restorePhrase(store, p, at = -1) {
  if (!p || byId(store, p.id) || find(store, p.kind, p.lang, p.text)) return store;
  const items = store.items.slice();
  items.splice(at >= 0 && at <= items.length ? at : items.length, 0, p);
  return { ...store, items };
}
// a use of each phrase of ids (a song that says them is played, D4)
export function countUses(store, ids, now = new Date().toISOString()) {
  const set = new Set(ids);
  if (!set.size) return store;
  return { ...store, items: store.items.map(p => (set.has(p.id) ? { ...p, uses: p.uses + 1, last: now } : p)) };
}
// the phrases proposed for deletion past the cap: the oldest with no use, as many as the cap is passed by
export function overCap(store, cap = CAP) {
  const n = store.items.length - cap;
  if (n <= 0) return [];
  return store.items.filter(p => !p.uses).sort((a, b) => String(a.created).localeCompare(String(b.created))).slice(0, n);
}

// Backup (D1): merged by id like patterns; the use count keeps the larger value, last the newer one. A phrase of the
// backup whose key is taken here by another id only adds its uses to that one (one phrase per key).
export function mergePhrases(cur, incoming) {
  const a = readStore(cur), b = readStore(incoming), items = a.items.slice();
  for (const p of b.items) {
    const i = items.findIndex(x => x.id === p.id), j = i >= 0 ? i : items.findIndex(x => phraseKey(x) === phraseKey(p));
    if (j < 0) { items.push(p); continue; }
    const c = items[j], newer = String(p.last || '') > String(c.last || '') ? p.last : c.last;
    items[j] = { ...(i >= 0 ? p : c), uses: Math.max(c.uses, p.uses), last: newer || null };
  }
  return { format: 1, items };
}

// ---------- groups (D9: by kind, then by tag) ----------
export function groupsOf(items) {
  const out = [];
  for (const kind of KINDS) {
    const list = items.filter(p => p.kind === kind);
    if (!list.length) continue;
    const tags = [...(TAGS[kind] || []), null];
    for (const tag of tags) {
      const l = list.filter(p => (p.tag || null) === tag);
      if (l.length) out.push({ kind, tag, items: l });
    }
  }
  return out;
}
// search: text, translation, tag, styles, source song (case and accents ignored)
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function matches(p, q) {
  const v = fold(q).trim();
  if (!v) return true;
  return [p.text, ...Object.values(p.alt || {}), p.tag, ...(p.styles || []), p.from && p.from.song].some(x => fold(x).includes(v));
}
