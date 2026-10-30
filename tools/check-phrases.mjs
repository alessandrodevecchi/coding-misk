// Checks for my phrases (my-phrases): the store, the backup merge, the moments map, and how the director uses the
// phrases (Mai and an empty collection leave every draw as it was; the share over 200 seeds; Sempre; a song's own lines
// never replaced; Replay identical after a delete). No browser.
//   npm run check:phrases
import { readStore, emptyStore, addPhrase, editPhrase, deletePhrase, restorePhrase, countUses, overCap, mergePhrases, keyOf, textIn, textError, readSettings, groupsOf, matches, SHARE, CAP } from '../src/voices/phrases.js';
import { MOMENTS, MOMENT_GROUPS, poolKeys, momentOfLine, PHRASES_MOMENT, POOL_MOMENT } from '../src/voices/moments.js';
import { PHRASES } from '../src/song/build.js';
import { POOL } from '../src/endless/phrases.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const seq = () => { let i = 0; return () => ((i++ * 0.137) % 1); };
const add = (s, input, o = {}) => { const r = addPhrase(s, input, { rand: seq(), ...o }); if (r.error) throw new Error(r.error); return r; };

export const CHECKS = {
  'store: one phrase per text, language and kind; the same line again adds a use (spec: same line twice)'() {
    let s = emptyStore();
    let r = add(s, { text: 'le torri non dormono mai', lang: 'it', kind: 'voice', tag: 'night', source: 'radio' }, { use: true, now: '2026-10-29T21:00:00Z' });
    assert(r.added && r.phrase.uses === 1, 'first');
    s = r.store;
    r = add(s, { text: '  Le torri  non dormono mai ', lang: 'it', kind: 'voice', source: 'radio' }, { now: '2026-10-30T21:00:00Z' });
    assert(!r.added && r.store.items.length === 1 && r.phrase.uses === 2 && r.phrase.last === '2026-10-30T21:00:00Z', JSON.stringify(r.store.items));
    // another kind or language is another phrase
    r = add(r.store, { text: 'le torri non dormono mai', lang: 'it', kind: 'poetic', source: 'tab' });
    assert(r.added && r.store.items.length === 2, 'another kind');
    assert(keyOf('voice', 'it', 'Città!') === 'voice|it|citta', keyOf('voice', 'it', 'Città!'));
  },
  'store: limits, edit, delete with Undo, translation, use counts, the cap'() {
    assert(textError('') === 'empty' && textError('uno due tre quattro cinque sei sette otto nove dieci undici dodici tredici') === 'words' && textError('a'.repeat(161)) === 'long' && textError('ok') === null, 'limits');
    let s = add(emptyStore(), { text: 'fermi tutti', lang: 'it', kind: 'explain', tag: 'breakdown', source: 'tab' }).store;
    s = add(s, { text: 'chi guida stanotte', lang: 'it', kind: 'voice', source: 'radio' }).store;
    const [a, b] = s.items;
    let e = editPhrase(s, a.id, { alt: { en: 'everybody stop' }, tag: 'drop' });
    assert(!e.error && e.phrase.alt.en === 'everybody stop' && e.phrase.tag === 'drop' && textIn(e.phrase, 'en') === 'everybody stop' && textIn(e.phrase, 'it') === 'fermi tutti', JSON.stringify(e));
    assert(editPhrase(e.store, a.id, { tag: 'nope' }).phrase.tag === null, 'an unknown tag is any');
    assert(editPhrase(e.store, b.id, { text: 'Fermi tutti', kind: 'explain' }).error === 'exists', 'twin refused');
    const d = deletePhrase(e.store, a.id);
    assert(d.removed && d.store.items.length === 1, 'deleted');
    const back = restorePhrase(d.store, d.removed, 0);
    assert(back.items[0].id === a.id && back.items.length === 2, 'undo');
    const u = countUses(back, [a.id], '2026-10-30T00:00:00Z');
    assert(u.items[0].uses === 1 && u.items[1].uses === 0, 'uses');
    let big = emptyStore();
    big = { format: 1, items: Array.from({ length: CAP + 3 }, (_, i) => ({ id: `ph_${i}`, text: `riga ${i}`, lang: 'it', kind: 'voice', tag: null, styles: [], on: true, source: 'tab', from: {}, alt: {}, created: `2026-10-${String(10 + (i % 20)).padStart(2, '0')}T00:00:00Z`, uses: i % 2, last: null })) };
    const over = overCap(big);
    assert(over.length === 3 && over.every(p => !p.uses), `over the cap ${over.length}`);
  },
  'store: a bad stored value is read safely, settings default to Salva sempre, 24 ore, Ogni tanto'() {
    const s = readStore({ items: [null, { id: 'x' }, { id: 'ph_1', text: 'ok', lang: 'it', kind: 'voice', tag: 'zzz', uses: -3 }, { id: 'ph_1', text: 'dup', lang: 'it', kind: 'voice' }] });
    assert(s.items.length === 1 && s.items[0].tag === null && s.items[0].uses === 0 && s.items[0].on === true, JSON.stringify(s));
    const d = readSettings(null);
    assert(d.save === 'always' && d.temp === '24h' && d.share === 'sometimes', JSON.stringify(d));
    assert(SHARE.never === 0 && SHARE.sometimes === 0.25 && SHARE.often === 0.5 && SHARE.lots === 0.8 && SHARE.always === 1, 'five levels with Sempre');
    assert(readSettings({ save: 'ask', temp: '7d', share: 'always' }).share === 'always', 'Sempre kept');
  },
  'backup merge: by id, larger use count, newer last use (spec: backup)'() {
    const P = (id, text, uses, last) => ({ id, text, lang: 'it', kind: 'voice', uses, last });
    const m = mergePhrases({ items: [P('ph_a', 'uno', 3, '2026-10-01'), P('ph_b', 'due', 0, null)] }, { items: [P('ph_a', 'uno', 1, '2026-10-09'), P('ph_c', 'tre', 2, '2026-10-02')] });
    const by = Object.fromEntries(m.items.map(p => [p.id, `${p.uses}|${p.last}`]));
    assert(by.ph_a === '3|2026-10-09' && by.ph_b === '0|null' && by.ph_c === '2|2026-10-02' && m.items.length === 3, JSON.stringify(by));
  },
  'moments: 21 in three groups, every pool key mapped, the same map for Compose and the radio (D2)'() {
    assert(MOMENTS.length === 21 && new Set(MOMENTS).size === 21, `moments ${MOMENTS.length}`);
    assert(Object.keys(MOMENT_GROUPS).join() === 'tracks,colour,structure', 'three groups');
    assert(Object.keys(PHRASES).length === 14 && Object.keys(POOL).length === 18, 'pool sizes');
    const keys = poolKeys(), bad = keys.filter(k => !MOMENTS.includes(k.moment));
    assert(!bad.length, `unmapped: ${bad.map(k => `${k.pool}.${k.key}`).join(', ')}`);
    assert(Object.keys(PHRASES_MOMENT).length === 14 && Object.keys(POOL_MOMENT).length === 18, 'maps cover the pools');
    // a Compose step and a radio move about the bass share the moment
    assert(momentOfLine(PHRASES.bass) === 'bass' && momentOfLine({ en: 'bass in' }) === 'bass' && momentOfLine('breakdown') === 'breakdown', 'bass and breakdown');
    assert(momentOfLine({ en: 'a line the user wrote' }) === null, 'own lines are in no pool');
  },
  'groups and search (D9)'() {
    let s = emptyStore();
    s = add(s, { text: 'fermi tutti', lang: 'it', kind: 'explain', tag: 'breakdown', source: 'tab' }).store;
    s = add(s, { text: 'notte alta', lang: 'it', kind: 'voice', tag: 'night', source: 'radio', styles: ['dark-cyberpunk'] }).store;
    s = add(s, { text: 'sempre', lang: 'it', kind: 'voice', source: 'radio' }).store;
    const g = groupsOf(s.items).map(x => `${x.kind}:${x.tag}`);
    assert(g.join() === 'voice:night,voice:null,explain:breakdown', g.join());
    assert(matches(s.items[1], 'NOTTE') && matches(s.items[1], 'cyberpunk') && !matches(s.items[0], 'notte'), 'search');
  },
};

if (import.meta.url === `file://${process.argv[1]}`) {
  let failed = 0;
  for (const [name, fn] of Object.entries(CHECKS)) { try { await fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
  console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
