// Checks for my phrases (my-phrases): the store, the backup merge, the moments map, and how the director uses the
// phrases (Mai and an empty collection leave every draw as it was; the share over 200 seeds; Sempre; a song's own lines
// never replaced; Replay identical after a delete). No browser.
//   npm run check:phrases
import { readStore, emptyStore, addPhrase, editPhrase, deletePhrase, restorePhrase, countUses, overCap, mergePhrases, unmergePhrases, keyOf, textIn, textError, readSettings, groupsOf, matches, kindsOf, validTag, KIND_SETS, SHARE, CAP } from '../src/voices/phrases.js';
import { MOMENTS, MOMENT_GROUPS, poolKeys, momentOfLine, PHRASES_MOMENT, POOL_MOMENT } from '../src/voices/moments.js';
import { PHRASES } from '../src/song/build.js';
import { POOL, allPhrases } from '../src/endless/phrases.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { songFiles } from './songs-dir.mjs';
import { builtinKeys, mineKeys, songKeys, classify, totals, phraseFiles, keyOfFile } from '../src/voices/samples.js';
import { sampleUsage, deleteSamples, keepTemp, sweepTemp, readTemp } from './voice-sample.mjs';
import { loadStyles } from './styles-dir.mjs';
import { createSession } from '../src/endless/director.js';
import { mineSnapshot, candidates, drawMine, narratorPick, vocabGroupOf } from '../src/voices/mine.js';
import { setNarratorMine, spokenSchedule, buildSteps, sayText, deriveBuild, spokenNeeds, missingNeeds, saySlug, slugAt } from '../src/song/build.js';
import { speakerOf } from '../src/song/spoken.js';
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
  'session counts (voice-track-tuning D6): songs in a row say other phrases of mine, the counts add the songs before, the narrator list carries them, Replay the same (spec: two songs in a row)'() {
    const items = ['le torri non dormono mai', 'chi guida stanotte', 'la città trattiene il fiato', 'il neon respira', 'una porta socchiusa', 'il treno non arriva'].map((x, i) => P(`ph_${i}`, x, 'voice', 'night'));
    const narr = [P('nx_1', 'una frase del narratore', 'poetic', null)];
    const mine = mineSnapshot([...items, ...narr], 1, 'it'), voice = { presence: 'always', vocab: 'night', phrases: '1', ways: ['refrain'] };
    const run = () => { const s = createSession(RECIPES, 'counts'); return Array.from({ length: 8 }, () => s.next({ styles: ['dark-cyberpunk'], voice, mine })); };
    const songs = run(), said = songs.map(x => x.song.mineUsed || []);
    assert(said.every(l => l.length === 1), `a song without a phrase of mine: ${JSON.stringify(said)}`);
    // 6 phrases, 5 songs remembered: the first 6 songs say 6 different phrases, the 7th the one said longest ago
    const ids = said.map(l => l[0]);
    assert(new Set(ids.slice(0, 6)).size === 6 && ids[6] === ids[0], `phrases by song: ${ids.join(', ')}`);
    // the narrator's list of song 3 counts the two songs before
    const list = songs[2].song.mine && songs[2].song.mine.list, used = new Set(ids.slice(0, 2));
    assert(list && list.filter(p => p.kind === 'voice').every(p => p.uses === (used.has(p.id) ? 1 : 0)), `counts of song 3: ${JSON.stringify(list && list.map(p => [p.id, p.uses]))}`);
    // Replay with the recorded snapshot: the same phrases, even if the collection's counts changed since
    assert(JSON.stringify(run().map(x => x.song.mineUsed)) === JSON.stringify(said), 'Replay says other phrases');
    // Mai: nothing of mine, the same voice lines as without a collection
    const plain = createSession(RECIPES, 'counts').next({ styles: ['dark-cyberpunk'], voice }).song, off = createSession(RECIPES, 'counts').next({ styles: ['dark-cyberpunk'], voice, mine: null }).song;
    assert(JSON.stringify(spokenTexts(plain)) === JSON.stringify(spokenTexts(off)) && !off.mineUsed, 'Mai changes the voice lines');
    console.log(`      phrases of mine by song: ${ids.join(', ')}`);
  },
  'Replay after a delete: the session recipe keeps the snapshot, the same songs come back (spec: replay)'() {
    const items = [P('ph_1', 'le torri non dormono mai', 'voice', 'night'), P('ph_2', 'fermi tutti', 'explain', 'breakdown')];
    const snap = mineSnapshot(items, 0.8, 'it'), recorded = JSON.parse(JSON.stringify(snap));
    const a = radioSong('replay', snap).song;
    items.splice(0, 1);
    const b = radioSong('replay', recorded).song;
    assert(JSON.stringify(a) === JSON.stringify(b), 'the replay differs');
    assert(b.mine && b.mine.list.length === 1 && kindsOf(b.mine.list[0]).join() === 'explain', 'the narrator phrases go with the song');
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
    // the movement images' keys (poetic-narrator D4): m:<ordinal among the steps that say one>, from m:0 in turn, with
    // Narrated growth on and off
    for (const narrated of [true, false]) {
      const Cn = resolveProfile('crescendo', { narrated, narratorStyle: 'poetic' }), Bn = liveBuildOf(crescendoSong(song, { narrated, rules: growthRules(Cn) }), Cn), keys = new Map();
      setNarratorMine((s, o) => { if (o.kind === 'poetic' && o.tag === 'move') keys.set(o.key, true); return null; });
      const n = spokenSchedule(Bn, Cn, 'it', ANY).filter(x => x.voice === 'N').length;
      setNarratorMine(null);
      const ks = [...keys.keys()].map(k => +k.slice(2)).sort((a, b) => a - b);
      assert(ks.length >= 4 && ks.every((k, i) => k === i), `${narrated ? 'narrated' : 'plain'}: movement keys ${ks.slice(0, 8)} of ${n} lines`);
    }
  },
  'samples: the built-in text set is the one of check:samples (every line tools/voice.mjs lists is built-in)'() {
    const songs = songFiles('songs').map(read), keys = builtinKeys({ songs, styles: RECIPES });
    const listed = execFileSync(process.execPath, ['--no-warnings', 'tools/voice.mjs', '--list'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').map(x => x.trim()).filter(x => x.endsWith('.wav'));
    const out = [...new Set(listed.map(f => keyOfFile(f.split('/')[0], f.split('/')[1])))].filter(k => !keys.has(k));
    assert(listed.length > 500 && !out.length, `${out.length} listed lines not built-in: ${out.slice(0, 5)}`);
    console.log(`      ${new Set(listed.map(f => keyOfFile(f.split('/')[0], f.split('/')[1]))).size} listed keys, ${keys.size} built-in keys`);
  },
  'samples: classes, a shared file stays built-in, the files of a phrase minus the protected ones (spec: shared file)'() {
    const usage = { say_it: [{ f: 'l_ultimo_treno.wav', b: 10 }, { f: 'le_torri.wav', b: 20 }, { f: 'nella_mia_canzone.wav', b: 30 }, { f: 'provvisoria.wav', b: 40 }, { f: 'vecchia.wav', b: 50 }], say_en_fred: [{ f: 'the_towers.wav', b: 25 }], say_en: [{ f: 'the_towers.wav', b: 5 }] };
    const builtin = builtinKeys({ songs: [], styles: [] });
    const items = [P('a', 'le torri', 'voice', 'night', { alt: { en: 'the towers' } }), P('b', "l'ultimo treno", 'voice', 'night')];
    const mine = mineKeys(items), songs = songKeys([{ id: 'u-1', tracks: [{ id: 'w', type: 'spoken', patterns: { A: { way: 'passage', text: { it: 'nella mia canzone' } } }, clips: [] }] }]);
    const rows = classify(usage, { builtin, mine, songs, temp: { 'say_it/provvisoria.wav': { expires: 'x' } } });
    const cls = Object.fromEntries(rows.map(r => [r.rel, r.cls]));
    assert(cls['say_it/l_ultimo_treno.wav'] === 'builtin' && cls['say_it/le_torri.wav'] === 'mine' && cls['say_en/the_towers.wav'] === 'mine' && cls['say_it/nella_mia_canzone.wav'] === 'song' && cls['say_it/provvisoria.wav'] === 'temp' && cls['say_it/vecchia.wav'] === 'orphan', JSON.stringify(cls));
    const T = totals(rows);
    assert(T.total.n === 7 && T.classes.mine.n === 3 && T.classes.mine.b === 50 && T.banks.say_it.orphan === 1, JSON.stringify(T.classes));
    // deleting "l'ultimo treno" (a copy of a vocabulary entry): its file is built-in and stays
    const others = mineKeys(items.filter(p => p.id !== 'b'));
    const f1 = phraseFiles(items[1], usage, { builtin, mine: others, songs });
    assert(!f1.files.length && f1.kept.length === 1 && f1.kept[0].why === 'builtin', JSON.stringify(f1));
    const f2 = phraseFiles(items[0], usage, { builtin, mine: mineKeys(items.filter(p => p.id !== 'a')), songs });
    assert(f2.files.map(x => x.rel).sort().join() === 'say_en/the_towers.wav,say_en_fred/the_towers.wav,say_it/le_torri.wav' && !f2.kept.length, JSON.stringify(f2));
  },
  'voice helper files: delete only named say_* files never protected, the ledger, the sweep never a playing song'() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-samples-'));
    try {
      for (const [b, f] of [['say_it', 'uno.wav'], ['say_it', 'due.wav'], ['say_it_reed', 'uno.wav'], ['say_en', 'tre.wav'], ['say_it', 'quattro.wav']]) { fs.mkdirSync(path.join(root, b), { recursive: true }); fs.writeFileSync(path.join(root, b, f), 'RIFF'); }
      fs.writeFileSync(path.join(root, 'other.wav'), 'x');
      fs.writeFileSync(path.join(root, 'say_lengths.json'), JSON.stringify({ 'say_it/uno.wav': 1, 'say_it/due.wav': 2 }));
      const u = sampleUsage(root);
      assert(Object.keys(u).join() === 'say_en,say_it,say_it_reed' && u.say_it.length === 3 && u.say_it[0].b === 4, JSON.stringify(u));
      const r = deleteSamples(root, ['say_it/uno.wav', 'say_it_reed/uno.wav', 'say_it/due.wav', '../other.wav', 'say_it/../../x.wav', 'say_it/missing.wav'], ['it|uno']);
      assert(r.deleted.join() === 'say_it/due.wav' && r.skipped.length === 5 && fs.existsSync(path.join(root, 'other.wav')) && fs.existsSync(path.join(root, 'say_it', 'uno.wav')), JSON.stringify(r));
      assert(!('say_it/due.wav' in JSON.parse(fs.readFileSync(path.join(root, 'say_lengths.json'), 'utf8'))), 'length dropped');
      const now = Date.parse('2026-10-30T10:00:00Z');
      keepTemp(root, { add: [{ file: 'say_en/tre.wav', ms: 1000, song: 'radio:a' }, { file: 'say_it/quattro.wav', ms: 1000, song: 'compose:b' }, { file: 'say_it/uno.wav', ms: 1000 }] }, now);
      let t = readTemp(root);
      assert(Object.keys(t).length === 3 && Date.parse(t['say_en/tre.wav'].expires) === now + 3600000, 'listed, at least an hour');
      keepTemp(root, { protect: ['it|uno'] }, now);
      assert(!readTemp(root)['say_it/uno.wav'], 'a protected slug leaves the ledger');
      const gone = sweepTemp(root, ['radio:a'], now + 2 * 3600000);
      t = readTemp(root);
      assert(gone.join() === 'say_it/quattro.wav' && t['say_en/tre.wav'] && fs.existsSync(path.join(root, 'say_en', 'tre.wav')) && !fs.existsSync(path.join(root, 'say_it', 'quattro.wav')), `swept ${gone}`);
      keepTemp(root, { files: ['say_en/tre.wav'] }, now);
      assert(!Object.keys(readTemp(root)).length && !sweepTemp(root, [], now + 1e9).length, 'saved later: never swept');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
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

// phrase-any-voice: who says a phrase as a list of kinds
const Q = (id, text, kinds, tag = null, extra = {}) => ({ id, text, lang: 'it', alt: {}, kinds, tag, styles: [], on: true, uses: 0, ...extra });
const ANY_VOICE = {
  'any voice: the five lists of Who says it, each voice takes a phrase whose kinds include its kind (spec: Both narrators, All)'() {
    assert(KIND_SETS.map(l => l.join('+')).join() === 'voice,explain,poetic,explain+poetic,voice+explain+poetic', 'five lists');
    for (const kinds of KIND_SETS) {
      const list = [Q('a', 'una riga mia', kinds)];
      for (const kind of ['voice', 'explain', 'poetic']) {
        const got = candidates(list, { kind, tag: kind === 'voice' ? 'night' : kind === 'explain' ? 'bass' : 'move', lang: 'it', styles: [] }).length;
        assert(got === (kinds.includes(kind) ? 1 : 0), `${kinds.join('+')} for ${kind}: ${got}`);
      }
    }
    // other rules still apply: off, styles, language
    const off = [Q('a', 'uno', ['voice', 'explain', 'poetic'], null, { on: false }), Q('b', 'due', ['voice', 'explain', 'poetic'], null, { styles: ['jazz'] })];
    assert(!candidates(off, { kind: 'explain', tag: 'bass', lang: 'it', styles: ['house'] }).length && !candidates([Q('c', 'tre', ['explain', 'poetic'])], { kind: 'poetic', tag: 'move', lang: 'en', styles: [] }).length, 'off, styles or language let a phrase through');
    // an old snapshot (a single kind) draws as before
    assert(candidates([P('o', 'vecchia', 'voice', 'night')], { kind: 'voice', tag: 'night', lang: 'it', styles: [] }).length === 1, 'old snapshot');
    const snap = mineSnapshot([Q('a', 'uno', ['explain', 'poetic']), P('o', 'vecchia', 'voice', 'night')], 1, 'it');
    assert(snap.list.map(p => p.kinds.join('+')).join() === 'explain+poetic,voice' && snap.list.every(p => p.kind === undefined), JSON.stringify(snap.list));
  },
  'any voice: a tag only with one kind; widening clears it, narrowing lets it be set again (spec: tag)'() {
    assert(validTag(['voice'], 'night') && !validTag(['voice', 'explain'], 'night') && validTag(['explain', 'poetic'], null) && validTag('explain', 'bass'), 'validTag');
    let s = add(emptyStore(), { text: 'le torri', lang: 'it', kind: 'voice', tag: 'night', source: 'tab' }).store;
    const id = s.items[0].id;
    let e = editPhrase(s, id, { kinds: ['voice', 'explain', 'poetic'], tag: 'night' });
    assert(!e.error && e.phrase.kinds.length === 3 && e.phrase.tag === null && e.phrase.kind === undefined, JSON.stringify(e.phrase));
    assert(['voice', 'explain', 'poetic'].every(kind => candidates(e.store.items, { kind, tag: kind === 'voice' ? 'dark' : 'drop', lang: 'it', styles: [] }).length === 1), 'a phrase of several kinds fits every tag');
    e = editPhrase(e.store, id, { kinds: ['explain'] });
    const tagged = editPhrase(e.store, id, { tag: 'bass' });
    assert(!e.error && e.phrase.tag === null && tagged.phrase.tag === 'bass', 'narrowed: tag Any, then set again');
    e = tagged;
    // defaults: a new phrase has no tag
    assert(add(emptyStore(), { text: 'nuova', lang: 'it', kinds: ['explain'], source: 'tab' }).phrase.tag === null, 'default tag');
    // a phrase of several kinds groups after the single kinds
    s = add(e.store, { text: 'due voci', lang: 'it', kinds: ['explain', 'poetic'], source: 'tab' }).store;
    s = add(s, { text: 'tutte', lang: 'it', kinds: ['voice', 'explain', 'poetic'], source: 'tab' }).store;
    const g = groupsOf(s.items).map(x => `${x.kinds.join('+')}:${x.tag}`).join();
    assert(g === 'explain:bass,explain+poetic:null,voice+explain+poetic:null', g);
  },
  'any voice: old phrases and old backups are read as lists of one kind with their tag (spec: old phrases)'() {
    const old = { format: 1, items: [{ id: 'ph_a', text: 'ecco il basso', lang: 'it', kind: 'explain', tag: 'bass', uses: 2 }, { id: 'ph_b', text: 'notte', lang: 'it', kind: 'voice', tag: 'night' }, { id: 'ph_c', text: 'mai', lang: 'it', kinds: ['voice', 'nope'] }, { id: 'ph_d', text: 'vuota', lang: 'it', kinds: [] }] };
    const s = readStore(old);
    assert(s.items.length === 2 && s.items[0].kinds.join() === 'explain' && s.items[0].tag === 'bass' && s.items.every(p => !('kind' in p)), JSON.stringify(s.items));
    const json = JSON.stringify(s);
    assert(!json.includes('"kind"') && json.includes('"kinds"'), 'written back with kinds');
    // an old backup merged into a store with a phrase of two kinds: one phrase per text, language and kind
    const cur = { format: 1, items: [Q('ph_x', 'ecco il basso', ['explain', 'poetic'], null, { uses: 1 })] };
    const m = mergePhrases(cur, old);
    assert(m.items.length === 2 && m.items[0].id === 'ph_x' && m.items[0].uses === 2 && m.items[0].kinds.join() === 'explain,poetic', JSON.stringify(m.items));
  },
  'any voice: widening merges the phrases of the same text, Undo gives them back; saving a line already included reuses it (spec: merge, reuse)'() {
    let s = add(emptyStore(), { text: 'ecco il basso', lang: 'it', kind: 'explain', tag: 'bass', source: 'tab', styles: ['techno'] }, { now: '2026-11-01T00:00:00Z' }).store;
    s = add(s, { text: 'Ecco il basso', lang: 'it', kind: 'poetic', source: 'tab', styles: ['jazz'] }, { now: '2026-11-02T00:00:00Z', rand: () => 0.9 }).store;
    s = add(s, { text: 'altro', lang: 'it', kind: 'voice', source: 'tab' }, { rand: () => 0.5 }).store;
    const [ex, po] = s.items;
    s = { ...s, items: s.items.map(p => (p.id === ex.id ? { ...p, uses: 2, last: '2026-11-01T10:00:00Z' } : p.id === po.id ? { ...p, uses: 3, last: '2026-11-02T10:00:00Z' } : p)) };
    const r = editPhrase(s, ex.id, { kinds: ['explain', 'poetic'] });
    assert(!r.error && r.store.items.length === 2 && r.phrase.id === ex.id && r.phrase.uses === 5 && r.phrase.kinds.join() === 'explain,poetic' && r.phrase.tag === null, JSON.stringify(r.phrase));
    assert(r.phrase.styles.sort().join() === 'jazz,techno' && r.phrase.last === '2026-11-02T10:00:00Z' && r.merged.length === 1 && r.merged[0].id === po.id, 'styles, last, merged');
    // the older id wins also when the newer phrase is the one widened
    const r2 = editPhrase(s, po.id, { kinds: ['explain', 'poetic'] });
    assert(!r2.error && r2.phrase.id === ex.id && r2.phrase.text === 'Ecco il basso', JSON.stringify(r2.phrase));
    // Undo
    const u = unmergePhrases(r.store, r);
    assert(JSON.stringify(u.items) === JSON.stringify(s.items), 'Undo differs');
    // reuse: a line typed as voice track that exists with All
    let a = add(emptyStore(), { text: 'tutte le voci', lang: 'it', kinds: ['voice', 'explain', 'poetic'], source: 'tab' }).store;
    const x = add(a, { text: 'Tutte le voci', lang: 'it', kind: 'voice', tag: null, source: 'radio' });
    assert(!x.added && x.store.items.length === 1 && x.phrase.uses === 1, 'reused');
    // a new phrase with All over an explaining one: one phrase, widened
    a = add(emptyStore(), { text: 'fermi tutti', lang: 'it', kind: 'explain', source: 'tab' }).store;
    const y = add(a, { text: 'fermi tutti', lang: 'it', kinds: ['voice', 'explain', 'poetic'], source: 'tab' });
    assert(!y.added && y.store.items.length === 1 && y.phrase.kinds.length === 3 && y.phrase.uses === 1 && unmergePhrases(y.store, y).items[0].kinds.join() === 'explain', JSON.stringify(y.store.items));
    // narrowing never merges, restoring a deleted phrase never makes a twin
    const d = deletePhrase(r.store, r.phrase.id), back = add(d.store, { text: 'ecco il basso', lang: 'it', kind: 'poetic', source: 'tab' }).store;
    assert(restorePhrase(back, d.removed).items.length === back.items.length, 'restore made a twin');
  },
  'any voice: the narrator says a phrase of Both narrators on the explaining steps and on the poetic ones; the voice track takes one of All (spec: Both narrators, All)'() {
    const song = read('songs/kellerlicht.json');
    for (const style of ['explain', 'poetic']) {
      const C = resolveProfile('crescendo', { narrated: true, narratorStyle: style }), B = liveBuildOf(crescendoSong(song, { narrated: true, rules: growthRules(C) }), C);
      const plain = spokenSchedule(B, C, 'it', ANY).filter(x => x.voice === 'N');
      const both = [Q('ph_b', 'due voci insieme', ['explain', 'poetic'])];
      setNarratorMine(narratorPick(() => ({ share: 1, lang: 'it', list: both, own: new Set() })));
      const got = spokenSchedule(B, C, 'it', ANY).filter(x => x.voice === 'N');
      setNarratorMine(null);
      const mine = got.filter(x => x.text === 'due voci insieme').length;
      assert(got.length === plain.length && got.every((x, i) => x.at === plain[i].at), `${style}: bars moved`);
      assert(mine >= 3, `${style}: ${mine} of ${got.length}`);
      // only the voice track: the narrator says none
      setNarratorMine(narratorPick(() => ({ share: 1, lang: 'it', list: [Q('ph_v', 'solo traccia', ['voice'])], own: new Set() })));
      const none = spokenSchedule(B, C, 'it', ANY).filter(x => x.voice === 'N' && x.text === 'solo traccia').length;
      setNarratorMine(null);
      assert(!none, `${style}: a voice-track phrase was narrated`);
      console.log(`      ${style}: ${mine} of ${got.length} narrator lines are the Both narrators phrase`);
    }
    // the radio: a phrase with All replaces night vocabulary lines and goes with the song for the narrator
    const all = [Q('ph_all', 'la notte ci guarda', ['voice', 'explain', 'poetic'])], mine = mineSnapshot(all, 1, 'it');
    let swapped = 0;
    for (let i = 0; i < 10; i++) { const sg = radioSong(`all-${i}`, mine).song; swapped += spokenTexts(sg).filter(x => x && x.it === 'la notte ci guarda').length; assert(sg.mine && sg.mine.list.some(p => p.id === 'ph_all'), 'the narrator list lost the phrase'); }
    assert(swapped >= 5, `voice track lines: ${swapped}`);
  },
  'any voice: the files of a phrase said by two speakers, delete counts both banks (spec: samples)'() {
    const usage = { say_en: [{ f: 'all_the_voices.wav', b: 10 }], say_en_fred: [{ f: 'all_the_voices.wav', b: 12 }], say_en_kathy: [{ f: 'other.wav', b: 5 }] };
    const p = Q('a', 'all the voices', ['voice', 'explain', 'poetic'], null, { lang: 'en' });
    const f = phraseFiles(p, usage, { builtin: new Set(), mine: new Set(), songs: new Set() });
    assert(f.files.map(x => x.rel).sort().join() === 'say_en/all_the_voices.wav,say_en_fred/all_the_voices.wav', JSON.stringify(f));
    const k = phraseFiles(p, usage, { builtin: new Set(), mine: new Set(), songs: songKeys([{ id: 'u', tracks: [{ id: 'w', type: 'spoken', patterns: { A: { way: 'passage', text: { en: 'all the voices' } } }, clips: [] }] }]) });
    assert(!k.files.length && k.kept.length === 2, 'a saved song keeps both files');
    assert(mineKeys([p]).has('en|all_the_voices'), 'protect key');
  },
  'radio: a phrase of mine asks for its speaker\'s sample also when the default voice has it, a built-in line does not (radio-phrase-speaker D1, D2)'() {
    // (in English: the speakers speak English only, an Italian line is always the default voice's, real-voices D2)
    const p = Q('ph_all', 'the night is watching us', ['voice', 'explain', 'poetic'], null, { lang: 'en' }), mine = mineSnapshot([p], 1, 'en');
    const song = radioSong('rps-1', mine).song, tr = song.tracks.find(t => t.type === 'spoken'), X = tr && speakerOf(song, tr);
    assert(X, 'a voice track with a speaker of its own');
    const ph = spokenNeeds(song, {}, 'en', {}).find(x => x.text === p.text);
    assert(ph && ph.voice === 'T' && ph.bank === `say_en_${X}`, `the phrase's bank: ${JSON.stringify(ph)}`);
    const built = spokenNeeds(song, {}, 'en', {}).find(x => x.text !== p.text && x.bank !== 'say_en');
    assert(built, 'a built-in line said by a speaker');
    // (only the default voice's samples: the phrase and the built-in line)
    const files = { say_en: [`/samples/say_en/${saySlug(p.text)}.wav`, `/samples/say_en/${saySlug(built.text)}.wav`] };
    const list = spokenNeeds(song, {}, 'en', files);
    const mineSlugs = new Set(mine.list.map(q => textIn(q, 'en')).filter(Boolean).map(saySlug));
    const got = missingNeeds(list, files, mineSlugs);
    assert(got.some(x => x.text === p.text && x.bank === `say_en_${X}`), 'the phrase of mine is asked in its speaker\'s bank');
    assert(!got.some(x => x.text === built.text), 'the built-in line the default voice has is not asked');
    // no phrases of mine (Never): the radio's filter before this change
    const any = (bank, slug) => [bank, bank.replace(/_[a-z]+$/, '')].some(b => slugAt(files[b], slug) >= 0);
    const old = list.filter(x => !x.has).filter(x => !any(x.bank, saySlug(x.text)) && x.text.split(/\s+/).length <= 12);
    for (const none of [new Set(), null]) assert(JSON.stringify(missingNeeds(list, files, none)) === JSON.stringify(old), 'without phrases of mine the list changed');
    assert(!old.some(x => x.text === p.text), 'the old filter dropped the phrase');
    // the speaker's own sample made: nothing more to ask for the phrase
    const made = { ...files, [`say_en_${X}`]: [`/samples/say_en_${X}/${saySlug(p.text)}.wav`] };
    assert(!missingNeeds(spokenNeeds(song, {}, 'en', made), made, mineSlugs).some(x => x.text === p.text), 'asked again once made');
    // in Italian no speaker bank is asked: a phrase of mine in Italian, the same speaker, every line from say_it
    const q = Q('ph_it', 'la notte ci guarda', ['voice', 'explain', 'poetic']), mi = mineSnapshot([q], 1, 'it'), si = radioSong('rps-1', mi).song;
    const needIt = spokenNeeds(si, {}, 'it', {}), askIt = missingNeeds(needIt, {}, new Set([saySlug(q.text)]));
    assert(needIt.length && needIt.every(x => x.bank === 'say_it') && askIt.every(x => x.bank === 'say_it'), `an Italian speaker bank: ${[...new Set(needIt.map(x => x.bank))]}`);
    console.log(`      speaker ${X}: ${got.length} lines asked, ${old.length} without my phrases`);
  },
  'radio: a built-in line of a speaker with no sample of its own is asked also when the default voice has it, narrator, voice track and vocabulary (radio-narrator-speakers D3)'() {
    // (seed nar-0: a voice track with its own speaker and a narrator drawn to another speaker; the explaining narrator
    // says the director's POOL phrases)
    const pool = new Set(allPhrases().map(p => p.en)), C = { narratorStyle: 'explain' };
    const song = radioSong('nar-0', null, undefined).song;
    const all = spokenNeeds(song, C, 'en', {});
    const nar = all.find(x => x.voice === 'N' && x.speaker && pool.has(x.text)), voc = all.find(x => x.voice === 'T' && x.speaker);
    assert(nar, `a POOL phrase said by a narrator speaker: ${JSON.stringify(all.slice(0, 3))}`);
    assert(voc, 'a voice-track line said by a speaker');
    // (only the default voice's samples, every text of the song)
    const files = { say_en: [...new Set(all.map(x => `/samples/say_en/${saySlug(x.text)}.wav`))] };
    const list = spokenNeeds(song, C, 'en', files);
    assert(list.every(x => !x.speaker || !x.has), 'a speaker sample came from nowhere');
    const got = missingNeeds(list, files, null, { speakers: true });
    assert(got.some(x => x.text === nar.text && x.bank === `say_en_${nar.speaker}`), `the narrator line is not asked in say_en_${nar.speaker}: ${JSON.stringify(nar)} ${JSON.stringify(list.filter(x => x.text === nar.text))}`);
    assert(got.some(x => x.text === voc.text && x.bank === `say_en_${voc.speaker}`), `the voice-track line is not asked in say_en_${voc.speaker}`);
    assert(got.every(x => x.speaker), 'a default-voice line with its sample was asked');
    // (a vocabulary entry: the radio's voice tracks say vocabulary lines; the same rule, by speaker, whatever the kind)
    const vocab = { at: 0, voice: 'T', text: 'neon rain', bank: `say_en_${voc.speaker}`, lang: 'en', speaker: voc.speaker, has: false, sub: '' };
    const vf = { say_en: [`/samples/say_en/${saySlug(vocab.text)}.wav`] };
    assert(missingNeeds([vocab], vf, null, { speakers: true }).length === 1 && !missingNeeds([vocab], vf, null).length, 'a vocabulary entry');
    // without the option: the old filter (Compose), none of them is asked
    const any = (bank, slug) => [bank, bank.replace(/_[a-z]+$/, '')].some(b => slugAt(files[b], slug) >= 0);
    const old = list.filter(x => !x.has).filter(x => !any(x.bank, saySlug(x.text)) && x.text.split(/\s+/).length <= 12);
    for (const o of [undefined, {}, { speakers: false }]) assert(JSON.stringify(missingNeeds(list, files, null, o)) === JSON.stringify(old), 'without the option the list changed');
    assert(!old.length, `the old filter asked ${old.length}`);
    // the speaker's sample made: not asked again
    const made = { ...files, [nar.bank]: [`/samples/${nar.bank}/${saySlug(nar.text)}.wav`] };
    assert(!missingNeeds(spokenNeeds(song, C, 'en', made), made, null, { speakers: true }).some(x => x.text === nar.text && x.bank === nar.bank), 'asked again once made');
    // in Italian no speaker bank is asked
    const it = spokenNeeds(song, C, 'it', {});
    assert(missingNeeds(it, {}, null, { speakers: true }).every(x => x.bank === 'say_it'), 'an Italian speaker bank');
    console.log(`      narrator ${nar.speaker}, voice track ${voc.speaker}: ${got.length} lines asked, ${old.length} before`);
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
    // (a text changed into another phrase's text and kind is refused; adding a kind merges, see phrase-any-voice)
    const c3 = add(e.store, { text: 'altra riga', lang: 'it', kind: 'explain', source: 'tab' });
    assert(editPhrase(c3.store, c3.phrase.id, { text: 'Fermi tutti' }).error === 'exists', 'twin refused');
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
  ...ANY_VOICE,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  let failed = 0;
  for (const [name, fn] of Object.entries(CHECKS)) { try { await fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
  console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
