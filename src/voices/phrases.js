// My phrases (my-phrases D1): the user's personal collection of spoken lines, kept in the browser storage under
// `coding-misk-phrases` and in the app backup. One phrase per text, language and kind (its key: kind, language and the
// sample file name of the text), so writing a line again adds a use and never a copy. Pure: the app and the Node checks
// (tools/check-phrases.mjs) use the same functions; every change returns a new store.
// phrase-any-voice: a phrase stores the kinds that can say it as a list (`kinds`); a text and language belong to at most
// one phrase per kind. A phrase stored with a single `kind` (before) is read as a list of one.
//   { format: 1, items: [{ id, text, lang, alt: { en }, kinds: ['voice' | 'explain' | 'poetic', …], tag, styles: [], on,
//     source: 'radio' | 'compose' | 'narrator' | 'tab' | 'copy', from: { song, style }, created, uses, last }] }
import { saySlug } from '../song/build.js';
import { VOCAB_GROUPS } from '../song/vocabulary.js';
import { MOMENTS, POETIC_TAGS } from './moments.js';

export const PHRASES_KEY = 'coding-misk-phrases';
export const SETTINGS_KEY = 'coding-misk-phrase-settings';
export const KINDS = ['voice', 'explain', 'poetic'];
// the five lists "Who says it" offers (phrase-any-voice D1): Voice track, Narrator explaining, Narrator poetic, Both
// narrators, All; the data takes any non-empty list of KINDS (seven combinations)
export const KIND_SETS = [['voice'], ['explain'], ['poetic'], ['explain', 'poetic'], ['voice', 'explain', 'poetic']];
// the kinds of a phrase or an input: its list, else its single kind (a phrase saved before, an old snapshot); sorted in
// KINDS order, no repeats, unknown kinds dropped
export function kindsOf(p) {
  if (!p) return [];
  const raw = Array.isArray(p.kinds) ? p.kinds : p.kind !== undefined ? [p.kind] : [];
  return KINDS.filter(k => raw.includes(k));
}
export const kindsId = kinds => kinds.join('+');
export const SOURCES = ['radio', 'compose', 'narrator', 'tab', 'copy'];
export const LANGS = ['it', 'en'];
// the helper's limits (vite.config.js): at most 12 words, 160 characters
export const MAX_WORDS = 12;
export const MAX_CHARS = 160;
// past this many phrases the oldest unused are proposed for deletion in the tab, never removed silently
export const CAP = 1000;

// the tags a kind may carry (null: any)
export const TAGS = { voice: VOCAB_GROUPS, explain: MOMENTS, poetic: POETIC_TAGS };
// a tag only with exactly one kind (phrase-any-voice D4); kinds: a list or one kind
export function validTag(kinds, tag) {
  if (tag === null || tag === undefined) return true;
  const l = Array.isArray(kinds) ? kinds : [kinds];
  return l.length === 1 && (TAGS[l[0]] || []).includes(tag);
}

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
// a phrase with several kinds has several keys, one per kind
export const phraseKeys = p => kindsOf(p).map(k => keyOf(k, p.lang, p.text));
const sameText = (p, lang, text) => p.lang === lang && saySlug(clean(p.text)) === saySlug(clean(text));
// the phrases of the same text and language that share a kind with kinds (other than the one with id)
const twinsOf = (items, { id = null, lang, text, kinds }) => items.filter(p => p.id !== id && sameText(p, lang, text) && kindsOf(p).some(k => kinds.includes(k)));
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
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || textError(x.text) || !LANGS.includes(x.lang)) return null;
  // (a list with an unknown kind is not a phrase of this build; an old single kind is a list of one)
  const raw = Array.isArray(x.kinds) ? x.kinds : [x.kind], kinds = kindsOf({ kinds: raw });
  if (!kinds.length || raw.some(k => !KINDS.includes(k))) return null;
  const alt = {};
  for (const l of LANGS) if (l !== x.lang && x.alt && typeof x.alt[l] === 'string' && !textError(x.alt[l])) alt[l] = clean(x.alt[l]);
  return {
    id: x.id, text: clean(x.text), lang: x.lang, alt, kinds, tag: validTag(kinds, x.tag) && x.tag ? x.tag : null,
    styles: Array.isArray(x.styles) ? [...new Set(x.styles.filter(s => typeof s === 'string' && s))] : [],
    on: x.on !== false, source: SOURCES.includes(x.source) ? x.source : 'tab',
    from: x.from && typeof x.from === 'object' ? { ...(x.from.song ? { song: String(x.from.song) } : {}), ...(x.from.style ? { style: String(x.from.style) } : {}) } : {},
    created: typeof x.created === 'string' ? x.created : null, uses: Number.isInteger(x.uses) && x.uses > 0 ? x.uses : 0, last: typeof x.last === 'string' ? x.last : null,
  };
}
export const newId = (rand = Math.random) => `ph_${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0')}${Math.floor(rand() * 36 ** 2).toString(36)}`;
// the phrase of a text and language whose kinds include kind (phrase-any-voice D5)
export const find = (store, kind, lang, text) => store.items.find(p => sameText(p, lang, text) && kindsOf(p).includes(kind)) || null;
export const byId = (store, id) => store.items.find(p => p.id === id) || null;

// Adds a line the user wrote: a new phrase, or one more use of the phrase with the same text, language and kind (D1,
// D3). input: { text, lang, alt, kinds (or kind), tag, styles, on, source, from }; use: count the writing as a use (a
// line typed on air plays at once). A phrase that already includes every asked kind is reused; one that shares only
// some of them is widened and merged with the input (phrase-any-voice D5, `merged` as in editPhrase).
// → { store, phrase, added, merged? } or { error }
export function addPhrase(store, input, { now = new Date().toISOString(), rand = Math.random, use = false } = {}) {
  const err = textError(input && input.text);
  if (err) return { error: err };
  const kinds = kindsOf(input);
  if (!LANGS.includes(input.lang) || !kinds.length) return { error: 'kind' };
  const old = store.items.find(p => sameText(p, input.lang, input.text) && kinds.every(k => kindsOf(p).includes(k)));
  if (old) {
    const p = { ...old, uses: old.uses + 1, last: now };
    return { store: { ...store, items: store.items.map(x => (x === old ? p : x)) }, phrase: p, added: false };
  }
  const part = twinsOf(store.items, { lang: input.lang, text: input.text, kinds });
  if (part.length) {
    const [first] = part, r = editPhrase(store, first.id, { kinds: [...new Set([...kindsOf(first), ...kinds])] });
    if (r.error) return r;
    const p = { ...r.phrase, uses: r.phrase.uses + 1, last: now };
    return { ...r, store: { ...r.store, items: r.store.items.map(x => (x.id === p.id ? p : x)) }, phrase: p, added: false };
  }
  let id = newId(rand);
  while (byId(store, id)) id = newId(rand);
  const p = normalize({ ...input, kinds, id, created: now, uses: use ? 1 : 0, last: use ? now : null, on: input.on !== false });
  if (!p) return { error: 'kind' };
  return { store: { ...store, items: [...store.items, p] }, phrase: p, added: true };
}
// Changes a phrase: text, language, translation, kinds, tag, styles, on. Widening it (a kind it did not have) merges it
// with the phrases of the same text and language that share a kind with it (phrase-any-voice D5): the older id and
// creation kept, uses summed, the newer last use, styles and kinds united, on if any was on; the tag stays only when
// the kinds are still one. Any other change that would make it share a text, language and kind with another phrase is
// refused. → { store, phrase, before, merged: [the other phrases, as they were] } or { error }
export function editPhrase(store, id, patch) {
  const old = byId(store, id);
  if (!old) return { error: 'none' };
  const base = { ...old, ...patch, alt: patch.alt !== undefined ? patch.alt : old.alt, id };
  if (patch.kinds !== undefined || patch.kind !== undefined) { delete base.kind; base.kinds = kindsOf(patch); }
  const next = normalize(base);
  if (!next) return { error: textError(patch.text) || 'kind' };
  const twins = twinsOf(store.items, next);
  if (!twins.length) return { store: { ...store, items: store.items.map(x => (x.id === id ? next : x)) }, phrase: next, before: old, merged: [] };
  const widened = next.kinds.some(k => !kindsOf(old).includes(k));
  if (!widened) return { error: 'exists', twin: twins[0] };
  const all = [next, ...twins], oldest = all.slice().sort((a, b) => String(a.created || '9').localeCompare(String(b.created || '9')))[0];
  const kinds = kindsOf({ kinds: all.flatMap(kindsOf) }), last = all.map(p => p.last).filter(Boolean).sort().pop() || null;
  const p = normalize({ ...next, id: oldest.id, created: oldest.created, kinds, tag: validTag(kinds, next.tag) ? next.tag : null,
    uses: all.reduce((a, x) => a + (x.uses || 0), 0), last, styles: [...new Set(all.flatMap(x => x.styles || []))], on: all.some(x => x.on !== false) });
  const gone = new Set(all.map(x => x.id)), at = store.items.findIndex(x => gone.has(x.id)), items = [];
  store.items.forEach((x, i) => { if (i === at) items.push(p); else if (!gone.has(x.id)) items.push(x); });
  return { store: { ...store, items }, phrase: p, before: old, merged: twins };
}
// Undo of an edit that merged (editPhrase's result r): the merged phrase gives back the phrase as it was and the others
// it took, where it stood; uses counted since then are lost with it
export function unmergePhrases(store, r) {
  if (!r || !r.phrase || !r.before) return store;
  const i = store.items.findIndex(x => x.id === r.phrase.id);
  if (i < 0) return store;
  const items = store.items.slice();
  items.splice(i, 1, r.before, ...(r.merged || []).filter(x => x.id !== r.before.id));
  return { ...store, items };
}
export function deletePhrase(store, id) {
  const old = byId(store, id);
  if (!old) return { store, removed: null };
  return { store: { ...store, items: store.items.filter(x => x.id !== id) }, removed: old };
}
// Undo of a delete: the phrase back where it was (or last), unless the same key came back meanwhile
export function restorePhrase(store, p, at = -1) {
  if (!p || byId(store, p.id) || kindsOf(p).some(k => find(store, k, p.lang, p.text))) return store;
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
// backup whose text, language and one of its kinds are taken here by another id only adds its uses to that one (one
// phrase per text, language and kind; phrase-any-voice D5). An old backup with single kinds reads through readStore.
export function mergePhrases(cur, incoming) {
  const a = readStore(cur), b = readStore(incoming), items = a.items.slice();
  for (const p of b.items) {
    const i = items.findIndex(x => x.id === p.id), j = i >= 0 ? i : items.findIndex(x => sameText(x, p.lang, p.text) && kindsOf(x).some(k => p.kinds.includes(k)));
    if (j < 0) { items.push(p); continue; }
    const c = items[j], newer = String(p.last || '') > String(c.last || '') ? p.last : c.last;
    items[j] = { ...(i >= 0 ? p : c), uses: Math.max(c.uses, p.uses), last: newer || null };
  }
  return { format: 1, items };
}

// ---------- groups (D9: by kind, then by tag; phrase-any-voice D6: a phrase of several kinds in a group of its list,
// after the three single kinds, the five lists of the form first) ----------
export function groupsOf(items) {
  const out = [];
  for (const kind of KINDS) {
    const list = items.filter(p => kindsId(kindsOf(p)) === kind);
    if (!list.length) continue;
    const tags = [...(TAGS[kind] || []), null];
    for (const tag of tags) {
      const l = list.filter(p => (p.tag || null) === tag);
      if (l.length) out.push({ kind, kinds: [kind], tag, items: l });
    }
  }
  const lists = [...new Set([...KIND_SETS.filter(l => l.length > 1).map(kindsId), ...items.map(p => kindsId(kindsOf(p))).filter(x => x.includes('+'))])];
  for (const id of lists) {
    const l = items.filter(p => kindsId(kindsOf(p)) === id);
    if (l.length) out.push({ kind: null, kinds: id.split('+'), tag: null, items: l });
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
