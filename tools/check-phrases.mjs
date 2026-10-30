// Checks for my phrases (my-phrases): the store, the backup merge, the moments map, and how the director uses the
// phrases (Mai and an empty collection leave every draw as it was; the share over 200 seeds; Sempre; a song's own lines
// never replaced; Replay identical after a delete). No browser.
//   npm run check:phrases
import { readStore, emptyStore, addPhrase, editPhrase, deletePhrase, restorePhrase, countUses, overCap, mergePhrases, keyOf, textIn, textError, readSettings, groupsOf, matches, SHARE, CAP } from '../src/voices/phrases.js';
import { MOMENTS, MOMENT_GROUPS, poolKeys, momentOfLine, PHRASES_MOMENT, POOL_MOMENT } from '../src/voices/moments.js';
import { PHRASES } from '../src/song/build.js';
import { POOL } from '../src/endless/phrases.js';
import fs from 'node:fs';
import { loadStyles } from './styles-dir.mjs';
import { createSession } from '../src/endless/director.js';
import { mineSnapshot, candidates, drawMine, narratorPick, vocabGroupOf } from '../src/voices/mine.js';
import { setNarratorMine, spokenSchedule, buildSteps, sayText, deriveBuild } from '../src/song/build.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveBuildOf, liveCode } from '../src/live/live-code.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const seq = () => { let i = 0; return () => ((i++ * 0.137) % 1); };
const add = (s, input, o = {}) => { const r = addPhrase(s, input, { rand: seq(), ...o }); if (r.error) throw new Error(r.error); return r; };

const RECIPES = loadStyles();
const ANY = new Proxy({}, { get: () => ({ findIndex: () => 0 }) });
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const P = (id, text, kind, tag, extra = {}) => ({ id, text, lang: 'it', alt: {}, kind, tag, styles: [], on: true, uses: 0, ...extra });
// a radio song with the voice instrument on the night vocabulary (several lines), with or without my phrases
const NIGHT = { presence: 'always', vocab: 'night', phrases: '4-5', kind: 'different' };
const radioSong = (seed, mine = undefined, voice = NIGHT) => createSession(RECIPES, seed).next({ styles: ['dark-cyberpunk'], voice, ...(mine !== undefined ? { mine } : {}) });
const spokenTexts = song => song.tracks.filter(t => t.type === 'spoken').flatMap(t => Object.keys(t.patterns).sort().map(k => t.patterns[k].text));
const isMine = (x, items) => !!x && typeof x === 'object' && items.some(p => p.text === x.it);
const DIRECTOR = {
  'Mai or an empty collection: no snapshot, and the songs are the same as without (spec: never, or no phrases)'() {
    const items = [P('ph_1', 'le torri non dormono mai', 'voice', 'night')];
    assert(mineSnapshot(items, 0, 'it') === null && mineSnapshot([], 0.5, 'it') === null && mineSnapshot([P('ph_2', 'solo', 'voice', null, { on: false })], 1, 'it') === null, 'no snapshot');
    for (let i = 0; i < 12; i++) {
      const a = radioSong(`mai-${i}`), b = radioSong(`mai-${i}`, null);
      assert(JSON.stringify(a.song) === JSON.stringify(b.song), `seed ${i}: a song changed`);
    }
    const song = read('songs/luci-rosse.json'), C = resolveProfile('crescendo', { narrated: true }), B = liveBuildOf(crescendoSong(song, { narrated: true, rules: growthRules(C) }), C);
    const before = JSON.stringify(spokenSchedule(B, C, 'it', ANY));
    setNarratorMine(narratorPick(() => ({ share: 0, lang: 'it', list: [P('ph_x', 'eccolo il basso', 'explain', 'bass')] })));
    const mai = JSON.stringify(spokenSchedule(B, C, 'it', ANY));
    setNarratorMine(null);
    assert(before === mai, 'Mai changed the narration');
  },
  'Spesso and Ogni tanto with three night phrases: about half and a quarter of the night vocabulary lines are mine, written out (spec: a radio song)'() {
    const items = ['le torri non dormono mai', 'chi guida stanotte', 'la città trattiene il fiato'].map((x, i) => P(`ph_${i}`, x, 'voice', 'night'));
    for (const [share, lo, hi] of [[0.5, 0.4, 0.6], [0.25, 0.17, 0.33]]) {
      const mine = mineSnapshot(items, share, 'it');
      let lines = 0, swapped = 0;
      for (let i = 0; i < 200; i++) {
        const plain = spokenTexts(radioSong(`share-${i}`).song), texts = spokenTexts(radioSong(`share-${i}`, mine).song);
        plain.forEach((x, k) => { if (vocabGroupOf(x) !== 'night') return; lines++; if (isMine(texts[k], items)) swapped++; });
      }
      console.log(`      share ${share}: ${swapped} of ${lines} night lines are mine (${Math.round(swapped / lines * 100)}%)`);
      assert(lines > 100 && swapped / lines > lo && swapped / lines < hi, `rate ${swapped / lines}`);
    }
  },
  "Sempre: every night vocabulary line is my phrase, the style's own lines are unchanged (spec: always)"() {
    const mine = mineSnapshot([P('ph_1', 'le torri non dormono mai', 'voice', 'night')], 1, 'it');
    let own = 0, vocab = 0;
    for (let i = 0; i < 40; i++) {
      for (const voice of [NIGHT, { presence: 'always', phrases: '4-5', kind: 'different' }]) {
        const plain = spokenTexts(radioSong(`always-${i}`, undefined, voice).song), texts = spokenTexts(radioSong(`always-${i}`, mine, voice).song);
        plain.forEach((x, k) => {
          if (vocabGroupOf(x) === 'night') { vocab++; assert(texts[k] && texts[k].it === 'le torri non dormono mai', `seed ${i}: a night line stayed: ${JSON.stringify(texts[k])}`); }
          else { if (!vocabGroupOf(x)) own++; assert(JSON.stringify(texts[k]) === JSON.stringify(x), `seed ${i}: a line that is no night vocabulary changed`); }
        });
      }
    }
    console.log(`      ${vocab} night lines replaced, ${own} style lines kept`);
    assert(vocab > 20 && own > 5, `vocab ${vocab}, own ${own}`);
  },
  'Replay after a delete: the session recipe keeps the snapshot, the same songs come back (spec: replay)'() {
    const items = [P('ph_1', 'le torri non dormono mai', 'voice', 'night'), P('ph_2', 'fermi tutti', 'explain', 'breakdown')];
    const snap = mineSnapshot(items, 0.8, 'it'), recorded = JSON.parse(JSON.stringify(snap));
    const a = radioSong('replay', snap).song;
    items.splice(0, 1);
    const b = radioSong('replay', recorded).song;
    assert(JSON.stringify(a) === JSON.stringify(b), 'the replay differs');
    assert(b.mine && b.mine.list.length === 1 && b.mine.list[0].kind === 'explain', 'the narrator phrases go with the song');
  },
  "Compose: a built-in song grown in Live coder says phrases of mine of the same moment, the growth is the same; a song's own lines never change (spec: Compose growth)"() {
    const song = read('songs/luci-rosse.json'), C = resolveProfile('switch', { narrated: true }), c = crescendoSong(song, { narrated: true, rules: growthRules(C) }), B = liveBuildOf(c, C);
    const plain = spokenSchedule(B, C, 'it', ANY).filter(x => x.voice === 'N');
    const items = ['ecco la batteria', 'ed ecco il basso', 'si cambia', 'più luce adesso', 'via tutto'].map((x, i) => P(`ph_${i}`, x, 'explain', ['drums', 'bass', 'variation', 'brighter', 'end'][i]));
    const L = () => liveCode(c, C, { files: () => ANY, lang: () => 'it' }), bars = [0, 8, 24, 40];
    const code0 = bars.map(b => L().codeAt(b));
    setNarratorMine(narratorPick(s => (s.id === song.id ? { share: 0.25, lang: 'it', list: items, own: new Set() } : null)));
    const got = spokenSchedule(B, C, 'it', ANY).filter(x => x.voice === 'N');
    const code1 = bars.map(b => L().codeAt(b));
    setNarratorMine(null);
    const mine = got.filter(x => items.some(p => p.text === x.text));
    assert(got.length === plain.length && got.every((x, i) => x.at === plain[i].at), 'the bars moved');
    assert(mine.length >= 1 && mine.length < got.length, `${mine.length} of ${got.length}`);
    for (const x of mine) { const p = items.find(y => y.text === x.text); assert(momentOfLine(x.step.say) === p.tag, `"${x.text}" said for "${sayText(x.step.say, 'it')}"`); }
    // the code differs only in the narrator's comment lines
    const strip = x => String(x).split('\n').filter(l => !l.startsWith('// >') && !l.startsWith('// "')).join('\n');
    assert(code0.every((x, i) => strip(x) === strip(code1[i])), 'the code changed beyond the narrator lines');
    console.log(`      ${mine.length} of ${got.length} narrator lines are mine: ${mine.slice(0, 2).map(x => `bar ${x.at + 1} "${x.text}"`).join(', ')}`);
    // Sempre on a song with its own written steps: none replaced
    const own = read('songs/luci-rosse.json'), withSteps = own.build && own.build.length ? own : { ...own, build: deriveBuild(own) };
    const texts = new Set(buildSteps(withSteps).map(x => sayText(x.say, 'en')));
    const P0 = spokenSchedule(withSteps, {}, 'it', ANY).filter(x => x.voice === 'N').map(x => x.text);
    setNarratorMine(narratorPick(() => ({ share: 1, lang: 'it', list: items, own: texts })));
    const P1 = spokenSchedule(withSteps, {}, 'it', ANY).filter(x => x.voice === 'N').map(x => x.text);
    setNarratorMine(null);
    assert(P0.length && JSON.stringify(P0) === JSON.stringify(P1), "a song's own lines were replaced");
  },
  'Sempre in the narration: every poetic image with a candidate is mine, the bars stay'() {
    const song = read('songs/kellerlicht.json'), C = resolveProfile('crescendo', { narrated: true, narratorStyle: 'poetic' }), c = crescendoSong(song, { narrated: true, rules: growthRules(C) }), B = liveBuildOf(c, C);
    const plain = spokenSchedule(B, C, 'it', ANY).filter(x => x.voice === 'N');
    const items = [P('ph_m', 'il mondo gira piano', 'poetic', 'move'), P('ph_any', 'una luce nuova', 'poetic', null, { alt: { en: 'a new light' } })];
    setNarratorMine(narratorPick(() => ({ share: 1, lang: 'it', list: items, own: new Set() })));
    const got = spokenSchedule(B, C, 'it', ANY).filter(x => x.voice === 'N');
    setNarratorMine(null);
    assert(got.length === plain.length && got.every((x, i) => x.at === plain[i].at), 'lines added, lost or moved');
    const changed = got.filter((x, i) => x.text !== plain[i].text);
    assert(changed.length && changed.every(x => items.some(p => p.text === x.text)), `${changed.length} changed`);
    console.log(`      ${changed.length} of ${got.length} poetic lines are mine with Sempre`);
  },
  'candidates: kind, tag or none, language or translation, styles, switch; least used first'() {
    const list = [P('a', 'uno', 'voice', 'night', { uses: 3 }), P('b', 'due', 'voice', null, { uses: 1 }), P('c', 'tre', 'voice', 'dark'), P('d', 'quattro', 'voice', 'night', { on: false }), P('e', 'cinque', 'voice', 'night', { styles: ['jazz'], uses: 1 }), P('f', 'sei', 'voice', 'night', { alt: { en: 'six' }, uses: 1 })];
    const it = candidates(list, { kind: 'voice', tag: 'night', lang: 'it', styles: ['house'] }).map(p => p.id).join();
    assert(it === 'a,b,f', it);
    assert(candidates(list, { kind: 'voice', tag: 'night', lang: 'en', styles: [] }).map(p => p.id).join() === 'f', 'English needs a text in English');
    const picks = new Set(Array.from({ length: 40 }, (_, i) => drawMine(candidates(list, { kind: 'voice', tag: 'night', lang: 'it', styles: [] }), 1, `s${i}`, 'voice', 'k').id));
    assert([...picks].sort().join() === 'b,f', `least used first: ${[...picks]}`);
  },
};

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
  ...DIRECTOR,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  let failed = 0;
  for (const [name, fn] of Object.entries(CHECKS)) { try { await fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
  console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
