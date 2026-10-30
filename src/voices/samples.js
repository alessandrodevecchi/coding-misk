// Voice samples: who owns a file (my-phrases D5) and what deleting would cost (D7, D8). A sample is classed at read
// time by its language and slug, never tagged on disk: built-in (a text of the vocabularies, the pools, the poetic
// images, the styles' lines, a built-in or example song: the same text set as tools/voice.mjs and check:samples), mine
// (a phrase of the collection, its text or translation), song (a line of the user's library: saved songs, code songs,
// playlist sessions, the trash), temporary (in say_temp.json and none of those) or orphan. Pure: the page and the Node
// checks class the same way.
import { PHRASES, buildSteps, saySlug } from '../song/build.js';
import { CRESCENDO_PHRASES } from '../song/crescendo.js';
import { allPhrases } from '../endless/phrases.js';
import { INTERLUDE_SAY } from '../endless/transitions.js';
import { vocabularyTexts, poeticTexts } from '../song/vocabulary.js';
import { textsOf } from './phrases.js';

export const CLASSES = ['builtin', 'mine', 'song', 'temp', 'orphan'];
const LANGS = ['en', 'it'];
// the language of a bank: "say_it_reed" → "it"
export const bankLang = bank => (/^say_([a-z]{2})/.exec(bank) || [])[1] || null;
export const keyOfFile = (bank, file) => `${bankLang(bank)}|${String(file).replace(/\.wav$/, '')}`;

// every text of a say value in each language: "x" (English), { en, it }
function addSay(set, say) {
  if (!say) return;
  if (typeof say === 'string') { set.add(`en|${saySlug(say)}`); return; }
  if (typeof say !== 'object') return;
  for (const l of LANGS) if (typeof say[l] === 'string' && say[l]) set.add(`${l}|${saySlug(say[l])}`);
}
// the texts a song may speak: its steps, its spoken tracks' written lines, its narrator lines
function addSong(set, song) {
  if (!song || typeof song !== 'object') return;
  try { for (const st of buildSteps(song)) addSay(set, st.say); } catch (e) { /* not a song */ }
  for (const t of song.tracks || []) for (const p of Object.values(t.patterns || {})) if (p && p.text && !(typeof p.text === 'string' && p.text.startsWith('vocab:'))) addSay(set, p.text);
  const n = song.narrator && typeof song.narrator === 'object' && song.narrator.lines ? song.narrator.lines : null;
  if (n) for (const l of Object.values(n)) for (const x of l || []) addSay(set, x);
}
// The built-in text set: { 'it|slug' } over the pools, vocabularies, poetic images, the styles' lines and the built-in
// and example songs (songs, styles: the page's lists)
export function builtinKeys({ songs = [], styles = [] } = {}) {
  const set = new Set();
  Object.values(PHRASES).forEach(x => addSay(set, x));
  CRESCENDO_PHRASES.forEach(x => addSay(set, x));
  allPhrases().forEach(x => addSay(set, x));
  INTERLUDE_SAY.forEach(([en, it]) => addSay(set, { en, it }));
  vocabularyTexts().forEach(x => addSay(set, x));
  poeticTexts().forEach(x => addSay(set, x));
  for (const r of styles) {
    if (r && r.spoken && r.spoken.lines) for (const l of Object.values(r.spoken.lines)) for (const x of l || []) addSay(set, x);
    if (r && r.narrator && typeof r.narrator === 'object' && r.narrator.lines) for (const l of Object.values(r.narrator.lines)) for (const x of l || []) addSay(set, x);
  }
  for (const s of songs) addSong(set, s);
  return set;
}
// the keys of my phrases (text and translations)
export const mineKeys = items => new Set((items || []).flatMap(p => textsOf(p).map(([l, x]) => `${l}|${saySlug(x)}`)));
// the keys of the user's library: songs, code songs (their build if any), playlist sessions' frozen songs, the trash
export function songKeys(songs = []) {
  const set = new Set();
  for (const s of songs) addSong(set, s);
  return set;
}

// Classes every file of a usage answer ({ bank: [{ f, b }] }); temp: the ledger { 'bank/file': {…} }.
// → [{ bank, f, b, key, cls, rel }]
export function classify(usage, { builtin, mine, songs, temp = {} }) {
  const out = [];
  for (const [bank, files] of Object.entries(usage || {})) for (const x of files || []) {
    const key = keyOfFile(bank, x.f), rel = `${bank}/${x.f}`;
    const cls = builtin.has(key) ? 'builtin' : mine.has(key) ? 'mine' : songs.has(key) ? 'song' : temp[rel] ? 'temp' : 'orphan';
    out.push({ bank, f: x.f, b: x.b || 0, key, cls, rel });
  }
  return out;
}
// totals by class and by bank: { classes: { builtin: { n, b } }, banks: { say_it: { n, b, builtin: n, … } }, total }
export function totals(rows) {
  const classes = Object.fromEntries(CLASSES.map(c => [c, { n: 0, b: 0 }])), banks = {};
  let n = 0, b = 0;
  for (const r of rows) {
    classes[r.cls].n++; classes[r.cls].b += r.b; n++; b += r.b;
    const k = banks[r.bank] || (banks[r.bank] = { n: 0, b: 0, ...Object.fromEntries(CLASSES.map(c => [c, 0])) });
    k.n++; k.b += r.b; k[r.cls]++;
  }
  return { classes, banks, total: { n, b } };
}
// the keys a delete must never touch: built-in, mine (minus the phrase being deleted), songs
export const protectList = (...sets) => [...new Set(sets.flatMap(s => [...s]))];
// The files of a phrase in every bank (D7): its texts' slugs in the banks of their language, with the protected ones
// apart. → { files: [{ rel, b }], kept: [{ rel, b, why }] }
export function phraseFiles(p, usage, { builtin, mine, songs }) {
  const want = new Set(textsOf(p).map(([l, x]) => `${l}|${saySlug(x)}`)), files = [], kept = [];
  for (const [bank, list] of Object.entries(usage || {})) for (const x of list || []) {
    const key = keyOfFile(bank, x.f);
    if (!want.has(key)) continue;
    const rel = `${bank}/${x.f}`, why = builtin.has(key) ? 'builtin' : mine.has(key) ? 'mine' : songs.has(key) ? 'song' : null;
    (why ? kept : files).push({ rel, b: x.b || 0, ...(why ? { why } : {}) });
  }
  return { files, kept };
}
// a size for people: 812 KB, 4.3 MB
export const sizeText = b => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${b > 0 ? Math.max(1, Math.round(b / 1e3)) : 0} KB`);
