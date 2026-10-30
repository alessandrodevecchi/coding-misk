// Checks for the voice instrument (voice-instrument, #39): spoken tracks and their lines, the four ways to speak, the
// narrator that yields, the poetic narrator, texts and speakers, the growth and the director; the voice controls
// (voice-controls, #77): the default unchanged, phrases per song as a ceiling, different and repeated lines, one phrase
// per part, ways, presence, presets, the narrator style control; every comment the radio lists spoken on its bar and the
// voice instrument kept in songs grown on air (#81). No browser.
//   npm run check:spoken      exit 1 when any check fails
import fs from 'node:fs';
import { songFiles } from './songs-dir.mjs';
import { loadStyles } from './styles-dir.mjs';
import { validateSong } from '../src/song/validate.js';
import { compileSong } from '../src/song/compile.js';
import { normalizeSong, VOICE_DEFAULT, VOICE_CHARACTERS, VOICE_LIMITS, VOICE_STYLES as SOUND_STYLES, VOICE_STYLE_IDS, VOICE_SOUND_KEYS, styleOf } from '../src/song/format.js';
import { buildSteps, stateAt, deriveBuild, voiceCode, SPEAKERS, saySlug, sayText } from '../src/song/build.js';
import { growOnAir } from '../src/endless/growth.js';
import { placeSpoken, spokenBars, setSpokenContext, spokenContext, speakerOf, narratorSpeaker, lineOf, enteringTrack, WAYS } from '../src/song/spoken.js';
import { VOCABULARY, VOCAB_GROUPS, POETIC } from '../src/song/vocabulary.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { shapeFacts, canPlay, resolveShape } from '../src/song/shapes.js';
import { generateSession, createSession } from '../src/endless/director.js';
import { VOICE_PRESETS, VOICE_PHRASES, PHRASE_RANGES, applyPreset, presetOf, cleanVoice, isDefaultVoice } from '../src/endless/voice-options.js';
import { voiceEvent } from '../src/endless/voice-panel.js';
import { withNarratorStyle, lineTexts, narratorStyle } from '../src/song/spoken.js';
import { energyOf } from '../src/endless/energy.js';
import { meterSteps } from '../src/music.js';
import { rewriteSpoken, trackVoice, quietParts, nextQuiet, wherePartsOf, grownParts, soundingAt, firstSound } from '../src/endless/voice-track.js';
import { writtenForm } from '../src/endless/growth.js';
import { windowSong } from '../src/endless/join.js';
import { layout } from '../src/endless/transitions.js';
import { windowPart } from '../src/live/air-code.js';
import { sectionFacts, whereOfTrack } from '../src/song/spoken.js';
import { soundPatch } from '../src/endless/voice-sound.js';
import * as VS from './voice-sample.mjs';
import { phraseRows, listVocab, editText, editBars, removeRow, addRow, fillRows, vocabOf } from '../src/endless/phrase-list.js';
import { steerSong, applyBar, whyNot } from '../src/endless/steering.js';
import { spokenSchedule, narratorMarks, BUILD_ACTIONS } from '../src/song/build.js';
import { liveBuildOf } from '../src/live/live-code.js';
import { stepLabel, nextRows } from '../src/radio/next-changes.js';
import { sessionItems, GROWTH_ON_AIR } from '../src/endless/items.js';
import { airControls } from '../src/endless/growth.js';
import { validateRecipe, recipeOrder } from '../src/endless/recipe.js';
import { setLang } from '../src/i18n.js';
import { captionSchedule, spokenNeeds, narratorLines } from '../src/song/build.js';
import { captionFrame, captionSettings } from '../src/captions/captions.js';
import { SPEAKER_KINDS, kindOf, outranks, applyExclusive, captionRows } from '../src/song/speakers.js';
import { barSeconds } from '../src/song/spoken.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const EXAMPLE = read('songs/examples/06-voices.json');
const recipes = loadStyles(), styles = Object.fromEntries(recipes.map(r => [r.id, r]));
const songs = songFiles('songs').filter(f => !f.includes('/endless/')).map(read).filter(s => Array.isArray(s.sections));
const withSpoken = songs.filter(s => (s.tracks || []).some(t => t.type === 'spoken'));
const clone = o => JSON.parse(JSON.stringify(o));
// every sample exists (a manifest that finds any phrase)
const ANY = new Proxy({}, { get: () => ({ findIndex: () => 0 }) });
const beatsPerBar = (n, bar) => meterSteps((n.sections.find(s => bar >= s.start && bar < s.start + s.bars) || n.sections[0]).meter) / 4;
// voice-controls: sessions with the voice instrument often, on the three styles that have one
const VOICE_STYLES = ['dark-cyberpunk', 'ambient', 'pure-trance'];
const voiced = (voice, seed = 'vc', minutes = 60) => generateSession(recipes, { styles: VOICE_STYLES, seed, minutes, voice }).songs.filter(s => s.tracks.some(t => t.type === 'spoken'));
const spokenOf = s => s.tracks.find(t => t.type === 'spoken');
const lineKey = (s, t, k) => lineTexts(lineOf(s, t, k, t.patterns[k]), 'en').join(' · ');
// the bars where a narration is spoken in a voice code: "spoken on bar N"
const narrated = code => [...code.matchAll(/spoken on bar (\d+)/g)].map(m => +m[1] - 1);

// radio songs as the radio plays them (after-tests-oct28): sessions grown on air in a profile, three songs each, with
// the controls the radio gives each song (Classic, or the profile's own on air)
const RADIO_RECIPES = recipes.filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
const radioMemo = new Map();
function radioSongs(profile, style, seed, n = 3) {
  const k = `${profile}|${style}|${seed}|${n}`;
  if (!radioMemo.has(k)) {
    const rec = { seed, options: { styles: [style], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, transition: 'artist', harmony: 'artist', profile, voice: { presence: 'always' } }, changes: [], growth: GROWTH_ON_AIR };
    radioMemo.set(k, sessionItems(RADIO_RECIPES, rec, n).map(it => ({ song: it.song, C: it.song.onAir ? airControls(it.song.onAir.profile, it.song.onAir.free) : resolveProfile('classic') })));
  }
  return radioMemo.get(k);
}
const withLang = (l, fn) => { const d = globalThis.document; globalThis.document = { documentElement: {} }; try { setLang(l); return fn(); } finally { setLang('en'); globalThis.document = d; } };

const CHECKS = {
  'format: a spoken track validates; a wrong way, an unknown bound track and a line over 12 words are errors with their paths'() {
    assert(!validateSong(EXAMPLE).errors.length, JSON.stringify(validateSong(EXAMPLE).errors[0]));
    const bad = clone(EXAMPLE), w = bad.tracks.find(t => t.id === 'words');
    w.patterns.open.way = 'sing';
    w.patterns.open.before = 'nobody';
    w.patterns.chop.text = { en: 'one two three four five six seven eight nine ten eleven twelve thirteen', it: 'uno' };
    const paths = validateSong(bad).errors.map(e => e.path);
    for (const p of ['tracks[4].patterns.open.way', 'tracks[4].patterns.open.before', 'tracks[4].patterns.chop.text.en']) assert(paths.includes(p), `no error at ${p}: ${paths.join(', ')}`);
    const r = clone(EXAMPLE); r.tracks.find(t => t.id === 'words').patterns.chop.rhythm = '0 9 x';
    assert(validateSong(r).errors.some(e => e.path === 'tracks[4].patterns.chop.rhythm'), 'a bad rhythm');
    const n = clone(EXAMPLE); n.narrator = 'loud';
    assert(validateSong(n).errors.some(e => e.path === 'narrator'), 'a bad narrator style');
  },
  'ways: an entry line ends one beat before its track comes in'() {
    let checked = 0;
    for (const s of withSpoken) {
      const n = normalizeSong(s);
      for (const p of placeSpoken(s, 'en').filter(x => x.pat.before)) {
        const tr = n.tracks.find(t => t.id === p.pat.before), clip = n.tracks.find(t => t.id === p.track).clips.find(c => c.pattern === p.key);
        const e = tr.clips.map(c => c.start).filter(b => b > clip.start).sort((a, b) => a - b)[0];
        if (e === undefined) continue;
        const bpb = beatsPerBar(n, e - 1), st = p.starts[0], end = (st.bar + st.late) * bpb + p.beats, want = e * bpb - 1;
        // the start is rounded down to a quarter of a beat
        assert(end <= want + 1e-6 && end > want - 0.25 - 1e-6, `${s.id} ${p.track}/${p.key}: ends on beat ${end.toFixed(2)}, the entry is on beat ${e * bpb}`);
        checked++;
      }
    }
    assert(checked >= 2, `${checked} entry lines`);
  },
  'ways: refrains speak only in quiet sections and end before the section does'() {
    let checked = 0;
    for (const s of withSpoken) {
      const n = normalizeSong(s), plays = n.tracks.filter(t => t.type !== 'voice' && t.type !== 'spoken' && t.clips.length);
      const count = sec => plays.filter(t => t.clips.some(c => c.start < sec.start + sec.bars && c.start + c.bars > sec.start)).length, most = Math.max(...n.sections.map(count));
      for (const p of placeSpoken(s, 'en').filter(x => x.way === 'refrain')) for (const st of p.starts) {
        const sec = n.sections.find(x => st.bar >= x.start && st.bar < x.start + x.bars);
        assert(count(sec) <= most / 2 || /intro|break|pausa|outro|coda|fine/i.test(sec.name), `${s.id}: refrain on bar ${st.bar + 1} in ${sec.name} (${count(sec)} of ${most} tracks)`);
        assert(st.bar + Math.ceil(p.beats / beatsPerBar(n, st.bar) - 1e-9) <= sec.start + sec.bars, `${s.id}: refrain on bar ${st.bar + 1} runs past ${sec.name}`);
        checked++;
      }
    }
    // a section full of tracks gets none
    const full = clone(EXAMPLE); full.tracks.find(t => t.id === 'words').clips.push({ section: 'Drop', pattern: 'refrain' });
    assert(!placeSpoken(full, 'en').some(p => p.way === 'refrain' && p.starts.some(x => x.bar >= 32 && x.bar < 48)), 'a refrain in the drop');
    assert(checked >= 4, `${checked} refrains`);
  },
  'ways: a chop plays its slices on the steps of its rhythm, every bar of its clip; a passage once in the quietest section'() {
    const p = placeSpoken(EXAMPLE, 'en'), chop = p.find(x => x.way === 'chop'), passage = p.find(x => x.way === 'passage');
    assert(JSON.stringify(chop.starts.map(x => x.bar)) === JSON.stringify([16, 17, 18, 19, 20, 21, 22, 23]), JSON.stringify(chop.starts));
    const code = compileSong(EXAMPLE), line = code.split('\n').find(l => l.includes('.slice('));
    assert(/\.slice\(8, "0 ~ 1 ~ 2 3 ~ 3"\)\.clip\(1\)\.mask\("<0!16 1!8 0!32>"\)/.test(line), line);
    // the rhythm's steps: one token per step of the bar, slices only where it names one
    const toks = chop.pat.rhythm.split(' ');
    assert(toks.length === 8 && toks.filter(x => x !== '~').every(x => +x < chop.pat.slices), chop.pat.rhythm);
    assert(passage.starts.length === 1 && passage.starts[0].bar === 24, JSON.stringify(passage.starts));
    // the passage ends before the drop (bar 32)
    const n = normalizeSong(EXAMPLE);
    assert(passage.starts[0].bar + passage.beats / beatsPerBar(n, 24) <= 32, `passage of ${passage.beats.toFixed(1)} beats`);
    // lighter: no drive, little room, no rack
    const d = clone(EXAMPLE); Object.assign(d.tracks.find(t => t.id === 'story').settings, { drive: 3, room: 0.9 }); d.tracks.find(t => t.id === 'story').rack = [{ device: 'crush', bits: 4 }];
    const pl = compileSong(d).split('\n').find(l => l.includes('orbit(14)'));
    assert(!/distort|crush/.test(pl) && /\.room\(0\.3\)/.test(pl), pl);
  },
  'code: spoken lines on orbits 13 and 14, apart from the narrator; songs without spoken tracks do not change'() {
    const code = compileSong(EXAMPLE);
    assert(code.split('\n').filter(l => l.includes('say_')).every(l => /\.orbit\(1[34]\)/.test(l)), 'orbits');
    assert(/orbit\(13\)/.test(code) && /orbit\(14\)/.test(code), 'two spoken tracks, two orbits');
    // a song without spoken tracks compiles as its snapshot (check:code checks every song)
    const plain = songs.find(s => s.id === 'luci-rosse');
    assert(compileSong(plain) + '\n' === fs.readFileSync('tests/snapshots/code/luci-rosse.strudel', 'utf8'), 'luci-rosse changed');
  },
  'narrator: it yields on the bars where a spoken line sounds, and speaks elsewhere (D5)'() {
    const s = { ...clone(EXAMPLE) }; s.build = deriveBuild(s);
    const total = normalizeSong(s).total, bars = spokenBars(s, 'en');
    let spoke = 0, kept = 0;
    for (let upTo = 1; upTo <= buildSteps(s).length; upTo++) {
      const st = stateAt(s, buildSteps(s)[upTo - 1].at), code = voiceCode(s, st.song, upTo, total, 'en', ANY);
      const live = spokenBars(st.song, 'en');
      for (const b of narrated(code)) { assert(!live.has(b), `narration on bar ${b + 1}, where a spoken line sounds`); spoke++; }
      const step = buildSteps(s)[upTo - 1];
      if (!code && live.has(step.at)) kept++;
    }
    assert(spoke > 0 && kept > 0, `${spoke} narrations, ${kept} skipped`);
    assert(bars.has(24) && bars.has(16), 'spoken bars');
  },
  'poetic narrator: explain is unchanged; poetic speaks only where a track comes in, in the bar before or on its bar'() {
    for (const s of songs.filter(x => Array.isArray(x.build) && x.build.length).slice(0, 8)) {
      const total = normalizeSong(s).total;
      for (let upTo = 1; upTo <= buildSteps(s).length; upTo++) {
        const st = stateAt(s, buildSteps(s)[upTo - 1].at).song;
        const a = voiceCode(s, st, upTo, total, 'en', ANY), b = voiceCode({ ...s, narrator: 'explain' }, st, upTo, total, 'en', ANY);
        assert(a === b, `${s.id} step ${upTo}: explain differs`);
        const step = buildSteps(s)[upTo - 1];
        if (step.say && !(s.tracks || []).some(t => t.type === 'spoken')) assert(narrated(a).length === 1 && narrated(a)[0] === step.at, `${s.id} step ${upTo}: explained on ${narrated(a)}`);
      }
    }
    const s = clone(read('songs/prova-voce-notte.json')), C = resolveProfile('crescendo'), c = crescendoSong(s, { rules: growthRules(C) });
    const steps = buildSteps(c), total = normalizeSong(c).total, entries = new Set(steps.filter(x => enteringTrack(c, x)).map(x => x.at));
    let n = 0;
    for (let upTo = 1; upTo <= steps.length; upTo++) {
      const code = voiceCode(c, stateAt(c, steps[upTo - 1].at).song, upTo, total, 'en', ANY);
      for (const b of narrated(code)) { assert(entries.has(b) || entries.has(b + 1), `poetic narration on bar ${b + 1}, no entry there or on the next bar`); n++; }
      if (code) assert(!code.includes(`"${typeof steps[upTo - 1].say === 'object' ? steps[upTo - 1].say.en : '§'}"`) || entries.has(steps[upTo - 1].at), 'an explanation in poetic mode');
    }
    assert(n >= 3, `${n} poetic lines`);
    const all = Object.values(POETIC).flat().map(x => x.en);
    for (let upTo = 1; upTo <= steps.length; upTo++) { const code = voiceCode(c, stateAt(c, steps[upTo - 1].at).song, upTo, total, 'en', ANY); for (const m of code.matchAll(/\/\/ "([^"]+)", spoken on bar/g)) assert(all.includes(m[1]), `not a poetic image: ${m[1]}`); }
  },
  'texts: same song, same lines; a generated refrain comes from the vocabulary, a style refrain from the style'() {
    for (const s of withSpoken) assert(JSON.stringify(placeSpoken(s, 'en')) === JSON.stringify(placeSpoken(clone(s), 'en')), `${s.id}: lines differ`);
    const notte = read('songs/prova-voce-notte.json'), words = notte.tracks.find(t => t.id === 'words');
    const gen = lineOf(notte, words, 'refrain', words.patterns.refrain), entries = VOCAB_GROUPS.flatMap(g => VOCABULARY[g]).map(x => x.en);
    assert(gen.parts && gen.parts.every(p => entries.includes(p.en)), JSON.stringify(gen));
    const keep = spokenContext.styles;
    setSpokenContext({ styles });
    const fromStyle = lineOf(notte, words, 'refrain', words.patterns.refrain);
    setSpokenContext({ styles: keep });
    assert(fromStyle.text && styles['dark-cyberpunk'].spoken.lines.refrain.some(x => x.en === fromStyle.text.en), JSON.stringify(fromStyle));
    // every text of the vocabulary: two languages, at most 12 words, no repeats
    const seen = new Set();
    for (const x of [...VOCAB_GROUPS.flatMap(g => VOCABULARY[g]), ...Object.values(POETIC).flat()]) {
      assert(x.en && x.it && x.en.split(' ').length <= 12 && x.it.split(' ').length <= 12, JSON.stringify(x));
      assert(!seen.has(saySlug(x.en)), `twice: ${x.en}`); seen.add(saySlug(x.en));
    }
  },
  'texts: the music of a seed does not change with the voice instrument (its own stream)'() {
    const opts = { styles: ['dark-cyberpunk', 'ambient'], seed: 'voci', minutes: 30, complexity: 0.5 };
    const a = generateSession(recipes, opts).songs;
    const b = generateSession(recipes.map(r => { const { spoken, narrator, ...rest } = r; return rest; }), opts).songs;
    assert(a.some(s => s.tracks.some(t => t.type === 'spoken')), 'no song with a voice instrument');
    const music = s => JSON.stringify({ sections: s.sections, tracks: s.tracks.filter(t => t.type !== 'spoken'), build: s.build.filter(x => x.add !== 'words').map(({ say, ...x }) => x) });
    a.forEach((s, i) => assert(music(s) === music(b[i]), `${s.id}: the music changed`));
  },
  'languages and speakers: the voice instrument does not take the narrator\'s speaker; lines follow the app language'() {
    for (const sp of SPEAKERS) for (let k = 0; k < 20; k++) {
      const s = { id: `x-${k}`, sections: [{ name: 'A', bars: 4 }], tracks: [{ id: 'n', type: 'voice', settings: { speaker: sp } }, { id: 'v', type: 'spoken', settings: {}, patterns: {}, clips: [] }] };
      assert(speakerOf(s, s.tracks[1]) !== narratorSpeaker(s), `${sp}: same speaker`);
    }
    const it = placeSpoken(EXAMPLE, 'it').find(p => p.key === 'open'), en = placeSpoken(EXAMPLE, 'en').find(p => p.key === 'open');
    assert(it.texts[0] === 'la città è ancora sveglia' && en.texts[0] === 'the city is still awake' && it.bank === 'say_it_reed', `${it.texts} ${it.bank}`);
    const one = clone(EXAMPLE); one.tracks.find(t => t.id === 'words').patterns.open.text = { en: 'only english' };
    assert(placeSpoken(one, 'it').find(p => p.key === 'open').texts[0] === 'only english', 'a line with one language');
  },
  'samples: without them the lines stay silent and the song still compiles; with them every line of the example has a file and a length'() {
    const keep = { ...spokenContext };
    setSpokenContext({ files: {} });
    const code = compileSong(EXAMPLE);
    setSpokenContext({ files: keep.files });
    assert(!code.split('\n').some(l => /^\S*\$:.*say_/.test(l)) && code.includes('no sample: npm run voices'), 'a spoken line without samples');
    const dir = 'public/samples';
    if (!fs.existsSync(`${dir}/say_lengths.json`)) { console.log('      (no samples on this machine: npm run voices)'); return; }
    const lengths = read(`${dir}/say_lengths.json`);
    for (const lang of ['en', 'it']) for (const p of placeSpoken(EXAMPLE, lang)) for (const x of p.texts) {
      const f = `${p.bank}/${saySlug(x)}.wav`;
      assert(fs.existsSync(`${dir}/${f}`) && lengths[f] > 0, `${f}: no file or length`);
    }
  },
  'growth: the voice opening starts with the spoken line; it is never drawn without a spoken opening; spoken tracks enter at their first line'() {
    for (const s of withSpoken) {
      const f = shapeFacts(s, styles);
      const opens = (s.tracks || []).some(t => t.type === 'spoken' && Object.values(t.patterns || {}).some(p => p.way === 'opening'));
      assert(canPlay('opening', 'voice', f) === opens, `${s.id}: voice opening ${canPlay('opening', 'voice', f)}`);
      if (!opens) continue;
      const c = crescendoSong(s, { rules: growthRules(resolveProfile('switch', { opening: 'voice', pace: 'medium', development: 'by-type' }), { styles }) });
      assert(c.crescendo.shape.opening === 'voice', `${s.id}: ${c.crescendo.shape.opening}`);
      const first = stateAt(c, 0).song, on = first.tracks.filter(t => !t.mute && t.type !== 'voice');
      assert(on.length === 1 && on[0].type === 'spoken', `${s.id}: bar 0 plays ${on.map(t => t.id)}`);
      const code = compileSong(first).split('\n').filter(l => /^\S*\$:/.test(l));
      assert(code.length && code.every(l => l.includes('say_')), `${s.id}: ${code.join(' | ')}`);
      // the line is said before the next track comes in, and ends a beat or more before it
      const next = buildSteps(c).find(x => x.at > 0 && x.add !== undefined), bpb = meterSteps(c.sections[0].meter) / 4;
      const p = placeSpoken(c, 'en').find(x => x.starts.some(y => y.bar < next.at)), st = p && p.starts.find(y => y.bar < next.at);
      assert(p && (st.bar + st.late) * bpb + p.beats <= next.at * bpb - 1 + 1e-6, `${s.id}: the next track enters on bar ${next.at}, the line ${p ? `starts on bar ${st.bar} and lasts ${p.beats.toFixed(1)} beats` : 'is missing'}`);
    }
    for (let k = 0; k < 100; k++) assert(resolveShape(songs.find(s => s.id === 'luci-rosse'), { seed: `v-${k}`, styles }).opening !== 'voice', 'voice drawn without a voice instrument');
    // Crescendo: a spoken track enters on the bar of its first line (or before it)
    for (const s of withSpoken) {
      const c = crescendoSong(s), G = c.crescendo.growth;
      for (const t of c.tracks.filter(x => x.type === 'spoken')) {
        const add = buildSteps(c).find(x => [].concat(x.add ?? []).includes(t.id)), first = Math.min(...placeSpoken(s, 'en').filter(p => p.track === t.id).flatMap(p => p.starts.map(x => x.bar)));
        assert(add && add.at <= first + G, `${s.id} ${t.id}: enters on bar ${add && add.at}, first line on ${first + G}`);
      }
    }
  },
  'passage at its bar: a passage in the first section waits for the written part of a grown song, never plays in the growth (#76)'() {
    const song = JSON.parse(JSON.stringify(EXAMPLE));
    song.tracks.find(t => t.id === 'story').clips = [{ start: 0, bars: 16, pattern: 'passage' }];
    for (const [id, o] of [['crescendo', { narrated: true }], ['switch', {}]]) {
      const C = resolveProfile(id, o), c = crescendoSong({ ...song, kind: 'composed' }, { narrated: C.narrated, rules: growthRules(C, { styles }) });
      const start = c.tracks.find(t => t.id === 'story').clips[0].start, L = liveCode(c, C, {});
      assert(start === c.crescendo.growth, `${id}: the passage clip starts at the written part (${start}, growth ${c.crescendo.growth})`);
      for (const bar of [0, Math.floor(start / 2), start - 1]) assert(!/say_\w+_\w+"\)\.n\([^)]*\)\.mask\("<0!/.test(L.codeAt(bar)) || !L.codeAt(bar).includes(`<0!${start} 1`), `${id}: no passage line at bar ${bar}`);
      const line = L.codeAt(start).split('\n').find(l => l.includes(`mask("<0!${start} 1 `));
      assert(line, `${id}: the passage line at bar ${start} speaks on that bar only`);
    }
  },
  'director: a style with weight 0 never gets a voice instrument; weighted ones sometimes, the same for the same seed; it adds no energy'() {
    const plain = generateSession(recipes, { styles: ['country'], seed: 'senza', minutes: 30 }).songs;
    assert(plain.every(s => !s.tracks.some(t => t.type === 'spoken') && !s.narrator), 'a voice instrument with weight 0');
    const opts = { styles: ['dark-cyberpunk', 'ambient', 'pure-trance'], seed: 'con', minutes: 60, chaos: 0 };
    const a = generateSession(recipes, opts), b = generateSession(recipes, opts);
    assert(JSON.stringify(a) === JSON.stringify(b), 'same seed, different songs');
    const sp = a.songs.filter(s => s.tracks.some(t => t.type === 'spoken'));
    assert(sp.length >= 1 && sp.length < a.songs.length, `${sp.length} of ${a.songs.length} songs`);
    for (const s of sp) {
      assert(!validateSong(s).errors.length, `${s.id}: ${JSON.stringify(validateSong(s).errors[0])}`);
      const t = s.tracks.find(x => x.type === 'spoken');
      assert(WAYS.includes(t.patterns.A.way) && s.build.some(x => x.add === t.id), `${s.id}: ${JSON.stringify(t.patterns.A)}`);
      const st = stateAt(s, s.sections.reduce((x, y) => x + y.bars, 0) - 1).song, without = { ...st, tracks: st.tracks.filter(x => x.type !== 'spoken') };
      assert(energyOf(st) === energyOf(without), `${s.id}: the voice instrument changes the energy`);
    }
    // complexity 0 keeps the plain songs
    const zero = generateSession(recipes, { ...opts, complexity: 0 }).songs;
    assert(zero.every(s => !s.tracks.some(t => t.type === 'spoken') && !s.narrator), 'a voice instrument at complexity 0');
  },

  'voice controls: As the style (or no options) writes the same songs as before; the extra draws never touch the default'() {
    const opts = { styles: VOICE_STYLES, seed: 'uguale', minutes: 40, chaos: 0.3 };
    const plain = JSON.stringify(generateSession(recipes, opts));
    for (const voice of [undefined, null, {}, applyPreset('style'), cleanVoice({ preset: 'style' })]) assert(JSON.stringify(generateSession(recipes, { ...opts, voice })) === plain, `different songs with ${JSON.stringify(voice)}`);
    assert(isDefaultVoice(applyPreset('style')) && !isDefaultVoice(applyPreset('discreet')), 'default detection');
    // the session records the options only when they are not the default
    assert(!('voice' in generateSession(recipes, opts).session.options) && generateSession(recipes, { ...opts, voice: applyPreset('present') }).session.options.voice.phrases === '2-3', 'session options');
  },
  'voice controls: phrases per song are a ceiling; each phrase speaks; several phrases reach their count when the song has room'() {
    const seen = {};
    for (const phrases of VOICE_PHRASES) {
      const [, hi] = PHRASE_RANGES[phrases], songs = voiced({ phrases, kind: 'different', presence: 'often' });
      assert(songs.length >= 3, `${phrases}: ${songs.length} songs with a voice instrument`);
      for (const s of songs) {
        assert(!validateSong(s).errors.length, `${s.id}: ${JSON.stringify(validateSong(s).errors[0])}`);
        const t = spokenOf(s), placed = placeSpoken(s, 'en');
        assert(t.clips.length >= 1 && t.clips.length <= hi, `${phrases} ${s.id}: ${t.clips.length} phrases`);
        // a phrase that finds no part is dropped, never written silent
        assert(placed.length === t.clips.length && placed.every(p => p.starts.length), `${phrases} ${s.id}: a phrase without a start`);
      }
      seen[phrases] = Math.max(...songs.map(s => spokenOf(s).clips.length));
    }
    assert(seen['2-3'] >= 2 && seen['4-5'] >= 4 && seen['6-8'] >= 5, `most phrases in a song: ${JSON.stringify(seen)}`);
    console.log(`      most phrases in a song: ${Object.entries(seen).map(([k, v]) => `${k} → ${v}`).join(', ')}`);
  },
  'voice controls: different lines are all different, repeated is one line, mixed is one line coming back with different ones'() {
    let n = 0;
    for (const s of voiced({ phrases: '4-5', kind: 'different', presence: 'often' })) {
      const t = spokenOf(s), keys = t.clips.map(c => c.pattern), lines = keys.map(k => lineKey(s, t, k));
      assert(new Set(keys).size === keys.length && new Set(lines).size === lines.length, `${s.id}: ${lines.join(' | ')}`);
      if (keys.length >= 4) n++;
    }
    assert(n >= 1, 'no song with 4 or 5 different lines');
    for (const s of voiced({ phrases: '6-8', kind: 'repeated', presence: 'often' })) {
      const t = spokenOf(s);
      assert(Object.keys(t.patterns).length === 1 && t.clips.every(c => c.pattern === 'A'), `${s.id}: ${Object.keys(t.patterns)}`);
    }
    let m = 0;
    for (const s of voiced({ phrases: '4-5', kind: 'mixed', presence: 'often' })) {
      const t = spokenOf(s), keys = t.clips.map(c => c.pattern), others = keys.filter(k => k !== 'A');
      assert(new Set(others).size === others.length && new Set(Object.keys(t.patterns).map(k => lineKey(s, t, k))).size === Object.keys(t.patterns).length, `${s.id}: ${keys}`);
      if (keys.filter(k => k === 'A').length >= 2 && others.length >= 1) m++;
    }
    assert(m >= 1, 'no mixed song with a line coming back');
  },
  'voice controls: never two phrases in the same part; each phrase in a quiet part (intro, break, outro or few tracks)'() {
    let n = 0;
    for (const kind of ['different', 'repeated', 'mixed']) {
      const g = generateSession(recipes, { styles: VOICE_STYLES, seed: `parti-${kind}`, minutes: 60, voice: { phrases: 'many', kind, presence: 'often' } });
      for (const s of g.songs.filter(x => x.tracks.some(t => t.type === 'spoken'))) {
        const t = spokenOf(s), e = g.session.songs.find(x => x.id === s.id), len = e.phrase, few = Math.max(2, Math.floor(e.usualHigh / 2));
        const parts = t.clips.map(c => Math.floor(c.start / len));
        assert(new Set(parts).size === parts.length, `${s.id}: two phrases in one part (${parts})`);
        const n0 = normalizeSong(s);
        for (const c of t.clips) {
          assert(c.start % len === 0 && c.bars <= len, `${s.id}: a clip across parts ${c.start}+${c.bars}`);
          const sec = n0.sections.find(x => c.start >= x.start && c.start < x.start + x.bars), on = stateAt(s, c.start).song.tracks.filter(x => !x.mute && x.type !== 'voice' && x.type !== 'spoken').length;
          assert(/intro|break|outro/i.test(sec.name) || on <= few, `${s.id}: a phrase in ${sec.name} with ${on} tracks`);
          for (const p of placeSpoken(s, 'en').filter(x => x.key === c.pattern)) for (const st of p.starts) assert(t.clips.some(x => st.bar >= x.start && st.bar < x.start + x.bars && x.pattern === p.key), `${s.id}: a line outside its part`);
        }
        n++;
      }
    }
    assert(n >= 6, `${n} songs`);
  },
  'voice controls: ways switched off are never used; How often: never, as the style says, often; a single song on or off'() {
    for (const ways of [['chop'], ['passage', 'opening'], ['refrain']]) for (const s of voiced({ phrases: '4-5', kind: 'different', ways, presence: 'often' }, `modi-${ways}`)) {
      const used = Object.values(spokenOf(s).patterns).map(p => p.way);
      assert(used.every(w => ways.includes(w)), `${ways}: ${s.id} uses ${used}`);
    }
    assert(!voiced({ presence: 'never' }).length, 'a voice instrument with never');
    const style = voiced({ phrases: '1', kind: 'different', ways: null, presence: 'style' }, 'quanto', 120).length, often = voiced({ presence: 'often' }, 'quanto', 120).length;
    assert(often > style, `often ${often}, as the style ${style}`);
    const one = (styles, presence, seed) => createSession(recipes, seed).next({ styles, voice: { presence } }).song;
    for (let k = 0; k < 6; k++) {
      assert(one(['berlin-techno'], 'always', `uno-${k}`).tracks.some(t => t.type === 'spoken'), 'on: a song without its voice instrument');
      assert(!one(VOICE_STYLES, 'never', `uno-${k}`).tracks.some(t => t.type === 'spoken'), 'off: a voice instrument');
    }
    assert(!validateSong(one(['berlin-techno'], 'always', 'uno-0')).errors.length, 'a style without a voice instrument, on: invalid song');
    // (its speaker is one of the styles that have a voice instrument: their vocabulary samples exist)
    // (npm run voices makes the vocabulary for every speaker when a style with a voice track names none, D14)
    const known = new Set([...recipes.flatMap(r => (r.spoken && r.spoken.speakers) || []), ...(recipes.some(r => r.spoken && !(r.spoken.speakers && r.spoken.speakers.length)) ? SPEAKERS : [])]);
    for (let k = 0; k < 6; k++) { const sp = one(['berlin-techno'], 'always', `uno-${k}`).tracks.find(t => t.type === 'spoken').settings.speaker; assert(known.has(sp), `on: speaker ${sp} has no vocabulary samples`); }
  },
  'voice controls: presets set the controls together; touching one makes it Custom'() {
    assert(VOICE_PRESETS.obsessive.kind === 'repeated' && VOICE_PRESETS.obsessive.ways.join() === 'refrain,chop' && VOICE_PRESETS.present.presence === 'often', 'presets');
    for (const id of Object.keys(VOICE_PRESETS)) assert(presetOf(applyPreset(id)) === id, `${id} is not its own preset`);
    const el = d => ({ dataset: d, value: d.value });
    const a = voiceEvent(applyPreset('present'), el({ vinst: 'phrases', value: '6-8' }));
    assert(a.preset === 'custom' && a.phrases === '6-8' && a.kind === 'mixed', JSON.stringify(a));
    const b = voiceEvent(applyPreset('discreet'), el({ vinstWay: 'chop' }));
    assert(b.preset === 'custom' && !b.ways.includes('chop'), JSON.stringify(b));
    assert(voiceEvent(b, el({ vinstPreset: 'obsessive' })).preset === 'obsessive', 'back to a preset');
    // a single song keeps its own on/off with a preset
    const c = voiceEvent({ presence: 'always' }, el({ vinstPreset: 'obsessive' }), { mode: 'song' });
    assert(c.presence === 'always' && c.phrases === '6-8' && presetOf(c, { presence: false }) === 'obsessive', JSON.stringify(c));
  },
  'voice controls: songs with several phrases grow in Crescendo and Live coder; every phrase still speaks'() {
    let n = 0;
    for (const s of voiced({ phrases: '4-5', kind: 'mixed', presence: 'often' }, 'cresce', 30).slice(0, 3)) {
      const want = placeSpoken(s, 'en').length;
      for (const id of ['crescendo', 'switch']) {
        const C = resolveProfile(id), c = crescendoSong({ ...s, kind: 'composed' }, { narrated: C.narrated, rules: growthRules(C, { styles }) }), L = liveCode(c, C, { files: () => ANY });
        for (const st of buildSteps(L.build)) L.codeAt(st.at);
        const got = placeSpoken(c, 'en');
        assert(got.length === want && got.every(p => p.starts.length), `${s.id} ${id}: ${got.length} of ${want} phrases speak`);
        n++;
      }
    }
    assert(n >= 4, `${n} grown songs`);
  },
  'narrator style control: automatic keeps the song own; poetic speaks images on any song, explaining explains a poetic song'() {
    const texts = (song, C) => {
      const c = crescendoSong(song, { rules: growthRules(C) }), L = liveCode(c, C, { files: () => ANY }), out = [];
      for (const st of buildSteps(L.build)) for (const m of L.codeAt(st.at).matchAll(/\/\/ "([^"]+)", spoken on bar/g)) out.push(m[1]);
      return out;
    };
    const poetic = Object.values(POETIC).flat().map(x => x.en), luci = read('songs/luci-rosse.json'), notte = read('songs/prova-voce-notte.json');
    const auto = texts(luci, resolveProfile('crescendo')), ex = texts(luci, resolveProfile('crescendo', { narratorStyle: 'explain' })), po = texts(luci, resolveProfile('crescendo', { narratorStyle: 'poetic' }));
    assert(auto.length && JSON.stringify(auto) === JSON.stringify(ex) && !auto.some(x => poetic.includes(x)), `luci-rosse automatic: ${auto.slice(0, 3)}`);
    assert(po.length >= 2 && po.every(x => poetic.includes(x)), `luci-rosse poetic: ${po.slice(0, 3)}`);
    const own = notte.narrator && typeof notte.narrator === 'object' && notte.narrator.lines ? Object.values(notte.narrator.lines).flat().map(x => x.en) : [];
    const nAuto = texts(notte, resolveProfile('crescendo')), nEx = texts(notte, resolveProfile('crescendo', { narratorStyle: 'explain' }));
    assert(nAuto.length && nAuto.every(x => poetic.includes(x) || own.includes(x)), `prova-voce-notte automatic: ${nAuto.slice(0, 3)}`);
    assert(nEx.length && !nEx.some(x => poetic.includes(x) || own.includes(x)), `prova-voce-notte explaining: ${nEx.slice(0, 3)}`);
    assert(withNarratorStyle(luci, 'auto') === luci && withNarratorStyle(notte, 'poetic') === notte, 'auto and the same style keep the song');
  },
  // voice-placement: the voice instrument of a song being edited, and of the song on air
  'voice track rewrite: one phrase per quiet part, the count a ceiling, kinds, ways, repeatable, valid, options read back'() {
    let tried = 0;
    for (const seed of ['vt-a', 'vt-b', 'vt-c']) {
      const g = createSession(recipes, seed).next({ styles: ['ambient', 'dark-cyberpunk'], chaos: 0.5 }), song = g.song;
      const sp = song.tracks.find(t => t.type === 'spoken'), quiet = quietParts(song).map(p => p.start);
      for (const v of [{ phrases: '4-5', kind: 'different' }, { phrases: '6-8', kind: 'repeated', ways: ['refrain', 'chop'] }, { phrases: '2-3', kind: 'mixed' }, { phrases: 'many', kind: 'different', ways: ['passage'] }]) {
        const r = rewriteSpoken(song, sp ? sp.id : null, v, { recipes });
        assert(r && r.placed >= 1 && r.placed <= r.asked, `${seed} ${v.phrases}: placed ${r && r.placed} of ${r && r.asked}`);
        const starts = r.track.clips.map(c => c.start);
        assert(new Set(starts).size === starts.length && starts.every(x => quiet.includes(x)) && r.track.clips.every(c => c.bars <= 8), `${seed} ${v.phrases}: one phrase per quiet part ${starts}`);
        const keys = r.track.clips.map(c => c.pattern), pats = Object.values(r.track.patterns);
        if (v.kind === 'repeated') assert(new Set(keys).size === 1, `${seed} repeated: ${keys}`);
        if (v.kind === 'different') assert(new Set(keys).size === keys.length, `${seed} different: ${keys}`);
        if (v.ways) assert(pats.every(p => v.ways.includes(p.way)), `${seed} ways ${v.ways}: ${pats.map(p => p.way)}`);
        assert(JSON.stringify(rewriteSpoken(song, sp ? sp.id : null, v, { recipes })) === JSON.stringify(r), `${seed} ${v.phrases}: the same options give the same track`);
        assert(JSON.stringify(rewriteSpoken(song, sp ? sp.id : null, { ...v, draw: 1 }, { recipes }).track.patterns) !== JSON.stringify(r.track.patterns), `${seed} ${v.phrases}: New phrases draws other lines`);
        const errs = validateSong(r.song).errors;
        assert(!errs.length, `${seed} ${v.phrases}: ${errs.map(e => `${e.path} ${e.message}`).join('; ')}`);
        const back = trackVoice(r.track);
        assert(back.phrases === v.phrases && back.kind === v.kind, `${seed}: options read back ${JSON.stringify(back)}`);
        // the live build: the track comes in on its first clip
        const add = r.song.build.filter(s => [].concat(s.add ?? []).includes(r.track.id)).map(s => s.at);
        assert(add.length && Math.min(...add) <= Math.min(...starts), `${seed}: add step ${add} before the first clip ${Math.min(...starts)}`);
        tried++;
      }
    }
    assert(tried === 12, `${tried} rewrites`);
  },
  'voice steering on air: clips before the next quiet part stay, recorded commands replay the same song, later commands keep it'() {
    let n = 0;
    for (const seed of ['vs-a', 'vs-b', 'vs-c', 'vs-d']) {
      const ses = createSession(recipes, seed);
      for (let i = 0; i < 2; i++) {
        const g = ses.next({ styles: ['ambient', 'pure-trance'], chaos: 0.5 });
        const at = applyBar('voice', 4, g.plan), cmd = { kind: 'voice', at, voice: { phrases: '4-5', kind: 'different' } };
        if (whyNot(cmd, g.song, g.plan, 4)) continue;
        const go = cmds => steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed, n: i }).song;
        const one = go([cmd]), from = nextQuiet(g.song, at);
        const sp0 = g.song.tracks.find(t => t.type === 'spoken'), sp1 = one.tracks.find(t => t.type === 'spoken');
        assert(sp1 && sp1.clips.some(c => c.start >= from), `${seed}/${i}: new phrases from bar ${from}`);
        const before = (sp0 ? sp0.clips : []).filter(c => c.start < from).map(c => `${c.pattern}@${c.start}`), kept = sp1.clips.filter(c => c.start < from).map(c => `${c.pattern}@${c.start}`);
        assert(JSON.stringify(before) === JSON.stringify(kept), `${seed}/${i}: clips before the quiet part stay ${before} / ${kept}`);
        assert(JSON.stringify(go([cmd])) === JSON.stringify(one), `${seed}/${i}: replayed the same`);
        const later = go([cmd, { kind: 'energy-up', at: applyBar('energy-up', at + 1, g.plan) }]), sp2 = later.tracks.find(t => t.type === 'spoken');
        assert(sp2 && JSON.stringify(sp2.clips.filter(c => c.start >= from)) === JSON.stringify(sp1.clips.filter(c => c.start >= from)), `${seed}/${i}: a later command keeps the listener's voice instrument`);
        assert(!validateSong(one).errors.length && !validateSong(later).errors.length, `${seed}/${i}: valid`);
        const off = go([{ ...cmd, voice: { presence: 'never' } }]), spOff = off.tracks.find(t => t.type === 'spoken');
        assert(!spOff || spOff.clips.every(c => c.start < from), `${seed}/${i}: never: no phrase from the quiet part on`);
        n++;
      }
    }
    assert(n >= 4, `${n} songs steered`);
  },
  // #81: the director puts a boundary's comment on its first move; the narrator spoke only the latest step of a bar
  'narrator: every comment the radio lists in Next changes is spoken on its bar, also with several moves on one boundary (#81)'() {
    // a hand-made build: the comment on the first of two steps of bar 4
    const song = clone(EXAMPLE);
    song.tracks = song.tracks.filter(t => t.type !== 'spoken');
    delete song.narrator;
    const ids = song.tracks.filter(t => t.type !== 'voice').map(t => t.id);
    song.build = [{ at: 0, add: ids[0], say: 'go' }, { at: 4, add: ids[1], say: 'more bass' }, { at: 4, set: { track: ids[0], gain: 0.5 } }];
    const C = resolveProfile('classic'), L = liveCode(song, C, { files: () => ANY, lang: () => 'en' });
    assert(/"more bass", spoken on bar 5/.test(L.codeAt(4)), 'the comment of the first step of bar 4 is not spoken');
    assert(L.codeAt(4).includes('// > more bass'), 'the comment of the first step of bar 4 is not written in the code');
    // radio songs over every style, in blocks and grown on air: the latest comment of each bar is spoken on it, unless
    // a line of the voice instrument sounds there (the narrator yields); poetic narrators speak images instead
    let says = 0, multi = 0;
    const styleIds = recipes.map(r => r.id);
    for (let i = 0; i < 24; i++) {
      const g = createSession(recipes, `say-${i}`).next({ styles: [styleIds[i % styleIds.length]] });
      const grown = g.entry.profile === 'crescendo' || g.entry.profile === 'switch';
      const s = grown ? growOnAir(g.song, { profile: g.entry.profile, styles, phrase: g.plan.phrase }) : g.song;
      if (narratorStyle(s) === 'poetic') continue;
      const P = s.onAir ? resolveProfile(s.onAir.profile, { duration: 'fitted' }) : C, LL = liveCode(s, P, { files: () => ANY, lang: () => 'en' });
      const heard = new Set();
      for (const b of new Set(buildSteps(LL.build).map(x => x.at))) {
        const shown = LL.codeAt(b), all = LL.run ? LL.run(shown) : shown;
        for (const m of all.matchAll(/\/\/ "([^"]+)", spoken on bar (\d+)/g)) heard.add(`${+m[2] - 1}|${m[1]}`);
      }
      const yields = s.tracks.some(t => t.type === 'spoken') ? spokenBars(s, 'en') : new Set(), steps = buildSteps(s);
      for (const b of new Set(steps.filter(x => x.say).map(x => x.at))) {
        const last = steps.filter(x => x.at === b && x.say).pop();
        if (steps.filter(x => x.at === b).length > 1) multi++;
        if (yields.has(b)) continue;
        says++;
        assert(heard.has(`${b}|${sayText(last.say, 'en')}`), `${s.id} (${s.onAir ? s.onAir.profile : 'classic'}): "${sayText(last.say, 'en')}" on bar ${b + 1} is not spoken`);
      }
    }
    console.log(`      ${says} comments spoken on their bar, ${multi} on bars with several moves`);
    assert(says > 100 && multi > 10, `${says} comments, ${multi} on bars with several moves`);
  },
  'voice instrument on air: a song that grows on the radio keeps its spoken track and its line (#81)'() {
    let n = 0;
    for (let i = 0; i < 30 && n < 4; i++) {
      const g = createSession(recipes, `grow-voice-${i}`).next({ styles: ['pure-trance'], voice: { presence: 'always' } });
      if (!g.song.tracks.some(t => t.type === 'spoken')) continue;
      for (const profile of ['switch', 'crescendo']) {
        const s = growOnAir(g.song, { profile, styles, phrase: g.plan.phrase });
        if (!s.onAir) continue;
        assert(s.tracks.some(t => t.type === 'spoken') && placeSpoken(s, 'en').some(p => p.starts.length), `${g.song.id} ${profile} (${g.entry.spoken}): the voice instrument left the grown song`);
        n++;
      }
    }
    assert(n >= 4, `${n} grown songs with a voice instrument`);
  },
  'voice styles (voice-full-controls D3): each character on the default voice is its style, every style inside the voice limits, a hand edit is Custom'() {
    for (const [id, ch] of Object.entries(VOICE_CHARACTERS)) {
      const v = { ...VOICE_DEFAULT, ...ch };
      assert(SOUND_STYLES[id], `no style for the character ${id}`);
      for (const k of VOICE_SOUND_KEYS) assert(v[k] === SOUND_STYLES[id][k], `${id}.${k}: character ${v[k]}, style ${SOUND_STYLES[id][k]}`);
      assert(styleOf(v) === id, `styleOf(${id}) is ${styleOf(v)}`);
    }
    for (const id of VOICE_STYLE_IDS) for (const [k, [lo, hi]] of Object.entries(VOICE_LIMITS)) assert(SOUND_STYLES[id][k] >= lo && SOUND_STYLES[id][k] <= hi, `${id}.${k} ${SOUND_STYLES[id][k]} outside ${lo}-${hi}`);
    assert(VOICE_STYLE_IDS.length === 10 && VOICE_STYLE_IDS.includes('distant') && VOICE_STYLE_IDS.includes('clear'), 'ten styles with clear and distant');
    assert(styleOf(VOICE_DEFAULT) === 'clear', 'the default voice is Clear');
    const radio = { ...VOICE_DEFAULT, ...SOUND_STYLES.radio, speaker: 'shelley', gain: 0.5 };
    assert(styleOf(radio) === 'radio', 'speaker and volume do not change the style');
    assert(styleOf({ ...radio, room: 0.5 }) === 'custom', 'a hand edit makes the style Custom');
  },
  'poetic narrator with Narrated growth (voice-full-controls D11, poetic-steps): entry steps keep their lines, the other steps say movement images, the images come in addition, an image wins a shared bar'() {
    const poetic = Object.values(POETIC).flat().map(x => x.en), move = POETIC.move.map(x => x.en), luci = read('songs/luci-rosse.json');
    const run = (C, narrated) => {
      const c = crescendoSong(luci, { narrated, rules: growthRules(C) }), L = liveCode(c, C, { files: () => ANY }), out = [];
      for (const st of buildSteps(L.build)) {
        const code = L.codeAt(st.at), bars = narrated ? [...code.matchAll(/spoken on bar (\d+)/g)].map(m => +m[1]) : [];
        assert(new Set(bars).size === bars.length, `two narrator lines on one bar: ${bars}`);
        for (const m of code.matchAll(/\/\/ "([^"]+)", spoken on bar (\d+)/g)) out.push({ text: m[1], bar: +m[2] - 1 });
      }
      return { out, c };
    };
    const both = run(resolveProfile('crescendo', { narratorStyle: 'poetic', narrated: true }), true);
    const images = both.out.filter(x => poetic.includes(x.text) && !move.includes(x.text)), moves = both.out.filter(x => move.includes(x.text)), lines = both.out.filter(x => !poetic.includes(x.text));
    assert(images.length >= 2 && moves.length >= 4 && lines.length >= 1, `poetic and narrated: ${images.length} images, ${moves.length} movement images, ${lines.length} step lines`);
    const plain = run(resolveProfile('crescendo', { narrated: true }), true).out;
    assert(plain.length && !plain.some(x => poetic.includes(x.text)), 'explaining with Narrated growth: no images');
    // every bar the explaining narration speaks on is spoken with the poetic style too: its step line, a movement
    // image in its place, or an image that takes its bar
    const imageBars = new Set(images.map(x => x.bar));
    const missing = plain.filter(x => !imageBars.has(x.bar) && !lines.some(y => y.bar === x.bar && y.text === x.text) && !moves.some(y => y.bar === x.bar));
    assert(!missing.length, `step lines lost: ${missing.slice(0, 3).map(x => `${x.bar + 1} ${x.text}`)}`);
    const only = run(resolveProfile('crescendo', { narratorStyle: 'poetic' }), false).out;
    assert(only.length && only.every(x => poetic.includes(x.text) && !move.includes(x.text)), 'poetic without Narrated growth: images only, as before');
    console.log(`      ${images.length} images, ${moves.length} movement images and ${lines.length} step lines; ${plain.length - lines.length - moves.length} step lines give their bar to an image`);
  },
  'poetic steps: with the poetic style and Narrated growth a step without an entry says a movement image in English and Italian, not its step line; entry steps keep theirs; samples for every movement image'() {
    const enters = (B, st) => { const t = enteringTrack(B, st); return !!t && t.type !== 'spoken'; };
    let checked = 0;
    for (const id of ['luci-rosse', 'kellerlicht']) {
      const song = read(`songs/${id}.json`);
      for (const lang of ['en', 'it']) {
        const move = POETIC.move.map(x => x[lang]);
        const C = resolveProfile('crescendo', { narratorStyle: 'poetic', narrated: true }), c = crescendoSong(song, { narrated: true, rules: growthRules(C) }), B = liveBuildOf(c, C), steps = buildSteps(B);
        const entryBars = new Set(steps.filter(st => enters(B, st)).map(st => st.at));
        const said = spokenSchedule(B, C, lang, ANY).filter(x => x.voice === 'N' && x.step && x.step.say && x.at === x.step.at);
        const free = said.filter(x => !entryBars.has(x.at)), atEntry = said.filter(x => entryBars.has(x.at));
        assert(free.length >= 4, `${id} ${lang}: ${free.length} steps without an entry`);
        for (const x of free) assert(move.includes(x.text) && x.text !== sayText(x.step.say, lang), `${id} ${lang} bar ${x.at + 1}: "${x.text}" for "${sayText(x.step.say, lang)}"`);
        for (const x of atEntry) assert(!move.includes(x.text), `${id} ${lang} bar ${x.at + 1}: a movement image on an entry's bar`);
        for (let i = 1; i < free.length; i++) assert(free[i].text !== free[i - 1].text, `${id} ${lang}: "${free[i].text}" twice in a row`);
        // the explaining style keeps every step line
        const E = resolveProfile('crescendo', { narratorStyle: 'explain', narrated: true }), e = crescendoSong(song, { narrated: true, rules: growthRules(E) }), EB = liveBuildOf(e, E);
        assert(!spokenSchedule(EB, E, lang, ANY).some(x => move.includes(x.text)), `${id} ${lang}: a movement image with the explaining style`);
        if (id === 'luci-rosse') console.log(`      ${lang}: ${free.slice(0, 3).map(x => `bar ${x.at + 1} "${x.text}" (was "${sayText(x.step.say, lang)}")`).join(', ')}`);
        checked += free.length;
      }
    }
    const dir = 'public/samples';
    if (!fs.existsSync(`${dir}/say_lengths.json`)) { console.log('      (no samples on this machine: npm run voices)'); return; }
    for (const lang of ['en', 'it']) for (const x of POETIC.move) assert(fs.existsSync(`${dir}/say_${lang}/${saySlug(x[lang])}.wav`), `say_${lang}/${saySlug(x[lang])}.wav: no sample (npm run voices)`);
    console.log(`      ${checked} steps without an entry say a movement image`);
  },
  'where it speaks (voice-full-controls D7): quiet first then medium, only busy, the default identical'() {
    const luci = read('songs/ferro.json'), N = normalizeSong(luci), facts = sectionFacts(N);
    const quiet = wherePartsOf(luci, 0, ['quiet']), medium = wherePartsOf(luci, 0, ['medium']), busy = wherePartsOf(luci, 0, ['busy']);
    assert(JSON.stringify(quiet.map(p => p.start)) === JSON.stringify(quietParts(luci).map(p => p.start)), 'quiet only is quietParts');
    const sp = rewriteSpoken(luci, null, { phrases: 'many', kind: 'different', where: ['quiet', 'medium'], draw: 0 }, { recipes }).song.tracks.find(t => t.type === 'spoken');
    const kindAt = b => facts.kinds[N.sections.findIndex(x => b >= x.start && b < x.start + x.bars)];
    const kinds = sp.clips.map(c => kindAt(c.start));
    assert(kinds.filter(k => k === 'quiet').length === Math.min(quiet.length, sp.clips.length), `quiet parts filled first: ${kinds}`);
    assert(medium.length && sp.clips.length === Math.min(12, quiet.length + medium.length) && kinds.filter(k => k === 'medium').length === sp.clips.length - quiet.length, `quiet and medium give more phrases: ${sp.clips.length} (quiet ${quiet.length}, medium ${medium.length})`);
    assert(new Set(sp.clips.map(c => c.start)).size === sp.clips.length, 'two phrases in one part');
    if (busy.length) {
      const b = rewriteSpoken(luci, null, { phrases: '4-5', kind: 'different', where: ['busy'], draw: 0 }, { recipes }).song.tracks.find(t => t.type === 'spoken');
      assert(b.clips.length && b.clips.every(c => kindAt(c.start) === 'busy'), `only busy: ${b.clips.map(c => kindAt(c.start))}`);
    }
    // the director: the default options keep their places (the fixtures check the rest), busy only goes to busy parts
    const a = voiced({ phrases: '4-5', kind: 'different', presence: 'often' }, 'dove', 30), d = voiced({ phrases: '4-5', kind: 'different', presence: 'often', where: ['quiet'] }, 'dove', 30);
    assert(JSON.stringify(a) === JSON.stringify(d), 'where quiet only changes the director songs');
    const nb = voiced({ phrases: '4-5', kind: 'different', presence: 'often', where: ['busy'] }, 'dove-piene', 30);
    let busyClips = 0;
    for (const s of nb) { const n = normalizeSong(s), f = sectionFacts(n), t = n.tracks.find(x => x.type === 'spoken'); for (const c of t.clips) { const k = f.kinds[n.sections.findIndex(x => c.start >= x.start && c.start < x.start + x.bars)]; if (k !== 'quiet') busyClips++; } }
    assert(nb.length && busyClips > 0, `radio busy only: ${busyClips} clips outside quiet parts in ${nb.length} songs`);
    console.log(`      ferro: ${quiet.length} quiet, ${medium.length} medium, ${busy.length} busy parts; quiet and medium: ${sp.clips.length} phrases`);
  },
  'voice track chance in every style (D14) and Sempre: weight 0 and complexity 0 and an artist with Sempre, Spesso on weight 0'() {
    const ids = recipes.map(r => r.id), zero = recipes.filter(r => r.spoken && r.spoken.weight === 0).map(r => r.id);
    assert(recipes.every(r => r.spoken && Number.isFinite(r.spoken.weight)), `a style without a spoken block: ${recipes.filter(r => !r.spoken).map(r => r.id)}`);
    assert(zero.join() === 'country', `weight 0: ${zero}`);
    const one = (styles, voice, seed, extra = {}) => createSession(recipes, seed).next({ styles, voice, ...extra }).song;
    let n = 0;
    for (let k = 0; k < 8; k++) {
      assert(one(['country'], { presence: 'always' }, `sempre-${k}`).tracks.some(t => t.type === 'spoken'), 'Sempre on a weight 0 style');
      assert(one(['berlin-techno'], { presence: 'always' }, `sempre-c0-${k}`, { complexity: 0 }).tracks.some(t => t.type === 'spoken'), 'Sempre at complexity 0');
      assert(!one(['country'], { presence: 'often' }, `spesso-${k}`).tracks.some(t => t.type === 'spoken'), 'Spesso on a weight 0 style');
      const art = JSON.parse(fs.readFileSync('artists/dreamer.json', 'utf8'));
      assert(createSession(recipes, `sempre-art-${k}`).next({ artist: art, voice: { presence: 'always' } }).song.tracks.some(t => t.type === 'spoken'), 'Sempre with an artist');
      n++;
    }
    // a style of weight 0.1: about one song in ten, the music the same without the voice track
    const songs = generateSession(recipes, { styles: ['berlin-techno'], seed: 'peso', minutes: 240 }).songs, got = songs.filter(s => s.tracks.some(t => t.type === 'spoken')).length;
    assert(got >= 1 && got / songs.length < 0.3, `berlin-techno (0.1): ${got} of ${songs.length}`);
    // the Voce: traccia switch off: no voice track, the same songs otherwise
    const on = generateSession(recipes, { styles: ['ambient'], seed: 'interr', minutes: 40, voice: { presence: 'always' } }).songs;
    const off = generateSession(recipes, { styles: ['ambient'], seed: 'interr', minutes: 40, voice: { presence: 'always' }, voices: { track: false } }).songs;
    const strip = s => JSON.stringify({ ...s, tracks: s.tracks.filter(t => t.type !== 'spoken'), build: s.build.filter(x => !(x.add === 'words')) });
    assert(off.every(s => !s.tracks.some(t => t.type === 'spoken')) && on.length === off.length && on.every((s, i) => strip(s) === strip(off[i])), 'the switch off changes more than the voice track');
    console.log(`      berlin-techno: ${got} of ${songs.length} songs with a voice track; ${n} Sempre cases; ${ids.length} styles`);
  },
  'radio sound for the next songs (D4): a style over the drawn voice, the speaker kept or set, auto unchanged'() {
    const base = generateSession(recipes, { styles: ['dark-cyberpunk'], seed: 'suono', minutes: 20 }).songs;
    const auto = generateSession(recipes, { styles: ['dark-cyberpunk'], seed: 'suono', minutes: 20, narratorSound: { style: 'auto' } }).songs;
    assert(JSON.stringify(base) === JSON.stringify(auto), 'auto changes the songs');
    const dist = generateSession(recipes, { styles: ['dark-cyberpunk'], seed: 'suono', minutes: 20, narratorSound: { style: 'distant' } }).songs;
    for (let i = 0; i < base.length; i++) {
      const a = base[i].tracks.find(t => t.type === 'voice'), b = dist[i].tracks.find(t => t.type === 'voice');
      for (const [k, v] of Object.entries(soundPatch({ style: 'distant' }))) assert(b.settings[k] === v, `${k}: ${b.settings[k]}`);
      assert(b.settings.speaker === a.settings.speaker && b.settings.gain === a.settings.gain && JSON.stringify(a.rack) === JSON.stringify(b.rack), 'speaker, volume or rack moved');
      const strip = s => JSON.stringify({ ...s, tracks: s.tracks.filter(t => t.type !== 'voice') });
      assert(strip(base[i]) === strip(dist[i]), 'the music moved');
    }
    const sp = generateSession(recipes, { styles: ['ambient'], seed: 'suono-t', minutes: 40, voice: { presence: 'always', sound: { style: 'robot', speaker: 'shelley' } } }).songs.map(s => s.tracks.find(t => t.type === 'spoken'));
    assert(sp.length && sp.every(t => t.settings.speaker === 'shelley' && t.settings.drive === 3.5 && t.settings.pitch === 0.7), 'voice track sound');
  },
  'phrase list (D5, D6, D16): sorted rows, heard bars, text and bars edits, fill, add, remove'() {
    const ex = EXAMPLE, id = ex.tracks.find(t => t.type === 'spoken').id;
    const rows = phraseRows(ex, id, { lang: 'en' });
    assert(rows.length === 3 && rows.every((r, i) => !i || rows[i - 1].start <= r.start), `rows sorted by bar: ${rows.map(r => r.start)}`);
    const ref = rows.find(r => r.way === 'refrain');
    assert(ref && ref.said.length > 1 && ref.said.every((b, i) => !i || b > ref.said[i - 1]), `refrain bars: ${ref && ref.said}`);
    const G = 24, heard = phraseRows(ex, id, { lang: 'en', heard: { song: { ...ex, sections: [{ name: 'Crescendo', bars: G, bpm: ex.sections[0].bpm, key: ex.sections[0].key, chords: ex.sections[0].chords, meter: ex.sections[0].meter }, ...ex.sections], tracks: ex.tracks.map(t => ({ ...t, clips: normalizeSong(ex).tracks.find(x => x.id === t.id).clips.map(c => ({ start: c.start + G, bars: c.bars, pattern: c.pattern })) })) }, G } });
    assert(heard.every((r, i) => r.heard && r.heard.start === rows[i].start + G), 'heard bars are written + G');
    const r2 = rows[1], moved = editBars(ex, id, r2.raw, { start: r2.start + G + 8, G });
    assert(moved.song && phraseRows(moved.song, id).find(r => r.raw === r2.raw).start === r2.start + 8, 'a typed heard bar is stored as written');
    assert(editBars(ex, id, r2.raw, { start: 3, G }).error === 'growth', 'a bar in the growth is refused');
    const t1 = editText(ex, id, rows[0].raw, 'en', 'the signal is late');
    assert(t1.song && phraseRows(t1.song, id).find(r => r.raw === rows[0].raw).texts[0] === 'the signal is late', 'text edit');
    assert(editText(ex, id, rows[0].raw, 'en', 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen').error === 'words', '15 words refused');
    const f = fillRows(ex, id, 'night');
    const fr = phraseRows(f.song, id, { lang: 'en' });
    assert(f.filled === 3 && listVocab(fr) === 'night' && new Set(fr.map(r => r.texts.join())).size === 3 && fr.map(r => r.start).join() === rows.map(r => r.start).join(), `fill: ${fr.map(r => r.texts)}`);
    const e = editText(f.song, id, fr[1].raw, 'en', 'my own line');
    assert(listVocab(phraseRows(e.song, id, { lang: 'en' })) === 'mixed', 'edit after fill: mixed');
    const rm = removeRow(ex, id, rows[1].raw);
    assert(phraseRows(rm, id).length === 2 && !Object.keys(rm.tracks.find(t => t.id === id).patterns).includes(rows[1].key), 'remove a row and its line');
    let last = ex; for (const r of rows) last = removeRow(last, id, phraseRows(last, id)[0].raw);
    assert(last.tracks.some(t => t.id === id) && !phraseRows(last, id).length, 'the last row: the track stays, empty');
    const add = addRow(last, id, { group: 'calm' });
    assert(add.song && phraseRows(add.song, id).length === 1 && vocabOf(add.song.tracks.find(t => t.id === id).patterns.A) === 'calm', `add: ${JSON.stringify(add.error || add.start)}`);
    assert(!validateSong(f.song).errors.length && !validateSong(add.song).errors.length, 'invalid song after an edit');
  },
  'voice helper (D8): the sample file names and banks of tools/voice-sample.mjs are the app\'s'() {
    for (const x of ['Serve più ritmo!', "l'ultimo treno", 'a brand new line, here']) assert(VS.saySlug(x) === saySlug(x), x);
    assert(VS.sayBank('it', 'eddy') === 'say_it_eddy' && VS.sayBank('en', '') === 'say_en' && VS.MAX_WORDS === 12, 'banks');
  },
  'next changes (after-tests-oct28 D1): every step of grown radio songs has a label naming its track, no "undefined", a section step has no row'() {
    const pat = { track: 'kick', level: 1 }, song0 = { tracks: [{ id: 'kick', name: 'kick' }] };
    assert(stepLabel({ at: 4, pattern: pat }, song0) === 'kick: variant 1', `en: ${stepLabel({ at: 4, pattern: pat }, song0)}`);
    assert(withLang('it', () => stepLabel({ at: 4, pattern: pat }, song0)) === 'kick: variante 1', 'it: variante 1');
    assert(stepLabel({ at: 4, pattern: { track: 'kick', level: 0 } }, song0) === 'kick: as written', 'level 0');
    assert(!nextRows({ ...song0, build: [{ at: 88 }] }, [], 0).length, 'a section step with no words has a row');
    let steps = 0, songs = 0;
    const seen = new Set();
    for (const profile of ['crescendo', 'switch']) for (const style of ['pure-trance', 'berlin-techno', 'synthwave']) for (const { song, C } of radioSongs(profile, style, `labels-${style}`, 2)) {
      if (!song.onAir) continue;
      songs++;
      const names = song.tracks.map(t => t.name || t.id), B = liveBuildOf(song, C);
      for (const st of buildSteps(B)) {
        const acts = BUILD_ACTIONS.filter(k => st[k] !== undefined);
        acts.forEach(k => seen.add(k));
        for (const l of ['en', 'it']) {
          const lab = withLang(l, () => stepLabel(st, song));
          if (!acts.length) { assert(lab === '', `${song.id}: a step with no action has the label "${lab}"`); continue; }
          steps++;
          assert(lab && !/undefined|null|NaN/.test(lab), `${song.id} (${l}): "${lab}" for ${JSON.stringify(st)}`);
          assert(names.some(n => lab.includes(n)), `${song.id} (${l}): "${lab}" names no track`);
        }
      }
      const rows = nextRows(B, [], -1, 1e9);
      assert(rows.every(r => r.labels.length && r.labels.every(Boolean)), `${song.id}: an empty row`);
    }
    console.log(`      ${songs} grown songs, ${steps} labels, actions seen: ${[...seen].sort().join(' ')}`);
    assert(songs >= 10, `${songs} grown songs`);
  },
  'next changes (after-tests-oct28 D2): V:N is the narrator line the code speaks on that bar, V:T a voice-track line that plays there; none on a voice bar, none with the narrator off'() {
    let songs = 0, ns = 0, ts = 0, off = 0, poetic = 0;
    const cases = [];
    for (const profile of ['classic', 'crescendo', 'switch']) for (const style of ['pure-trance', 'dark-cyberpunk', 'ambient']) for (const x of radioSongs(profile, style, `vtags-${profile}`, 3)) cases.push({ ...x, variant: cases.length % 4 });
    for (const { song, C: C0, variant } of cases) {
      // explaining, poetic, poetic with Narrated growth (the song grown that way stays as the director grew it), narrator off
      const C = variant === 1 ? { ...C0, narratorStyle: 'poetic' } : variant === 2 ? { ...C0, narratorStyle: 'poetic' } : variant === 3 ? { ...C0, narrator: false } : C0;
      const s = variant === 2 && song.crescendo ? { ...song, crescendo: { ...song.crescendo, narrated: true } } : song;
      songs++;
      const B = liveBuildOf(s, C), sch = spokenSchedule(B, C, 'en', ANY), L = liveCode(s, C, { files: () => ANY, lang: () => 'en' });
      if (variant === 3) { off++; assert(!sch.some(x => x.voice === 'N'), `${s.id}: V:N with the narrator off`); }
      if (C.narratorStyle === 'poetic') poetic++;
      // every narrator line the code speaks, in every state it is written in
      const heard = new Set();
      for (const b of new Set([0, ...buildSteps(L.build).map(x => x.at)])) {
        const shown = L.codeAt(b), all = L.run ? L.run(shown) : shown;
        for (const m of all.matchAll(/\/\/ "([^"]+)", spoken on bar (\d+)/g)) heard.add(`${+m[2] - 1}|${m[1]}`);
      }
      const listed = new Set(sch.filter(x => x.voice === 'N').map(x => `${x.at}|${x.text}`));
      for (const k of listed) assert(heard.has(k), `${s.id} (${variant}): V:N "${k}" is not spoken in the code`);
      for (const k of heard) assert(listed.has(k), `${s.id} (${variant}): "${k}" is spoken but not listed`);
      ns += listed.size;
      const voiceBars = s.tracks.some(t => t.type === 'spoken') ? spokenBars(s, 'en') : new Set();
      for (const x of sch.filter(y => y.voice === 'N')) assert(!voiceBars.has(x.at), `${s.id}: V:N on a voice-track bar ${x.at}`);
      // every voice-track line listed plays on its bar: its comment in the code of that bar, with a sample, its track on
      for (const x of sch.filter(y => y.voice === 'T')) {
        const st = stateAt(B, x.at).song, code = compileSong(st), quote = `// "${x.text.replace(/"/g, "'")}"`;
        const line = code.split('\n').find(l => l.startsWith(quote));
        assert(line && !line.includes('no sample'), `${s.id}: V:T "${x.text}" at ${x.at} is not in the code of its bar`);
        const tr = st.tracks.find(t => t.id === x.track);
        assert(tr && !tr.mute, `${s.id}: V:T "${x.text}" at ${x.at} on a silent track`);
        ts++;
      }
    }
    console.log(`      ${songs} radio songs (${poetic} poetic, ${off} narrator off): ${ns} V:N, ${ts} V:T lines`);
    assert(songs >= 20 && ns > 50 && ts > 5, `${songs} songs, ${ns} V:N, ${ts} V:T`);
  },
  'next changes (after-tests-oct28 D2): a voice-track line with no step on its bar has a row of its own; a step on a voice bar shows V:T and no V:N'() {
    const song = clone(EXAMPLE), C = resolveProfile('classic'), B = liveBuildOf(song, C), sch = spokenSchedule(B, C, 'en', ANY);
    const stepBars = new Set(buildSteps(B).map(x => x.at)), alone = sch.find(x => x.voice === 'T' && !stepBars.has(x.at));
    assert(alone, 'the example has no voice-track line away from the steps');
    const row = nextRows(B, sch, alone.at - 1, 1)[0];
    assert(row && row.at === alone.at && !row.labels.length && row.voices.some(v => v.voice === 'T' && v.text === alone.text), `no row of its own at ${alone.at}: ${JSON.stringify(row)}`);
    const yields = spokenBars(song, 'en'), shared = buildSteps(B).find(x => x.say && yields.has(x.at));
    if (shared) {
      const r = nextRows(B, sch, shared.at - 1, 1)[0];
      assert(r && r.voices.every(v => v.voice !== 'N'), `V:N on the voice bar ${shared.at}`);
    }
  },
  'voice track in songs grown on air (after-tests-oct28 D3): the director\'s lines and texts, the first in the first third when a part allows it, growth lines in quiet bars, entry lines before their track'() {
    const res = { switch: [], crescendo: [] };
    let early = 0, inGrowth = 0, entries = 0, fallback = 0;
    for (const profile of ['switch', 'crescendo']) for (const style of ['pure-trance', 'dark-cyberpunk', 'ambient']) for (let k = 0; k < 6 && res[profile].length < 20; k++) {
      const rec = { seed: `d3-${style}-${k}`, options: { styles: [style], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, transition: 'artist', harmony: 'artist', profile, voice: { presence: 'always' } }, changes: [], growth: GROWTH_ON_AIR };
      const items = sessionItems(RADIO_RECIPES, rec, 3);
      for (const it of items) {
        const s = it.song;
        if (!s.onAir || !s.tracks.some(t => t.type === 'spoken')) continue;
        // the director's song as written: the song before the growth (writtenForm of the plain song the radio keeps)
        const plain = it.plain || null;
        res[profile].push(s.id);
        const G = s.crescendo.growth, total = normalizeSong(s).total, most = Math.max(0, ...sectionFacts(normalizeSong(s)).counts);
        for (const tr of s.tracks.filter(t => t.type === 'spoken')) {
          const placed = placeSpoken(s, 'en').filter(p => p.track === tr.id);
          assert(placed.length === tr.clips.length && placed.length > 0, `${s.id}: ${tr.clips.length} clips, ${placed.length} lines placed`);
          const first = Math.min(...placed.flatMap(p => p.starts.map(x => x.bar)));
          const base = { ...s, tracks: s.tracks.filter(t => t.id !== tr.id) }, parts = grownParts(base, G, whereOfTrack(tr));
          const kind0 = parts.length ? parts[0].kind : null, allowedEarly = parts.some(p => p.kind === kind0 && p.start < total / 3);
          // (an entry line goes before its bound track, wherever that comes in: openings and lines with "before" are left out)
          if (allowedEarly && !tr.clips.some(c => (tr.patterns[c.pattern] || {}).before !== undefined || (tr.patterns[c.pattern] || {}).way === 'opening')) { assert(first < total / 3, `${s.id} (${profile}): first line at ${first} of ${total}, a part in the first third allowed it`); early++; }
          for (const p of placed) for (const st of p.starts.filter(x => x.bar < G)) {
            inGrowth++;
            const n = soundingAt(base, st.bar).length;
            if (n > most / 2) fallback++;
            assert(n >= 1, `${s.id}: a line at ${st.bar} over silence`);
          }
          // the add step brings the track in at its first clip
          const add = buildSteps(s).filter(x => [].concat(x.add ?? []).includes(tr.id)).map(x => x.at);
          assert(add.length === 1 && add[0] === Math.min(...tr.clips.map(c => c.start)), `${s.id}: add at ${add}, first clip ${Math.min(...tr.clips.map(c => c.start))}`);
        }
      }
    }
    // the same lines as the director's song, and entry lines before their bound track: growOnAir on director songs
    let same = 0;
    for (let i = 0; i < 24; i++) {
      const g = createSession(recipes, `grow-voice-${i}`).next({ styles: [['pure-trance', 'dark-cyberpunk', 'ambient'][i % 3]], voice: { presence: 'always' } });
      const wf = writtenForm(g.song), sp = wf.tracks.filter(t => t.type === 'spoken');
      if (!sp.length) continue;
      for (const profile of ['switch', 'crescendo']) {
        const s = growOnAir(g.song, { profile, styles, phrase: g.plan.phrase });
        if (!s.onAir) continue;
        for (const w of sp) {
          const tr = s.tracks.find(t => t.id === w.id);
          assert(tr && tr.clips.length === w.clips.length, `${g.song.id} ${profile}: ${w.clips.length} lines written, ${tr ? tr.clips.length : 0} grown`);
          const texts = x => placeSpoken(x, 'en').filter(p => p.track === w.id).map(p => p.texts.join(' · ')).sort().join(' | ');
          assert(texts(s) === texts(wf), `${g.song.id} ${profile}: texts ${texts(s)} vs ${texts(wf)}`);
          same++;
          for (const c of w.clips) {
            const bound = (w.patterns[c.pattern] || {}).before;
            if (bound === undefined) continue;
            const e = firstSound({ ...s, tracks: s.tracks.filter(t => t.id !== w.id) }, bound), n = normalizeSong(s);
            if (e === null) continue;
            const p = placeSpoken(s, 'en').find(x => x.track === w.id && x.key === c.pattern), st = p.starts[0];
            const bpb = beatsPerBar(n, st.bar), endBeat = st.bar * bpb + st.late * bpb + p.beats;
            assert(endBeat <= e * beatsPerBar(n, e) + 1e-6, `${g.song.id} ${profile}: entry line ends at beat ${endBeat}, ${bound} sounds at bar ${e}`);
            entries++;
          }
        }
      }
    }
    console.log(`      ${res.switch.length} Live coder and ${res.crescendo.length} Crescendo radio songs; ${early} first lines in the first third; ${inGrowth} line starts in the growth (${fallback} past the quiet limit, too few quiet parts); ${same} grown tracks with the director's lines; ${entries} entry lines`);
    assert(res.switch.length >= 20 && res.crescendo.length >= 20 && same >= 8, `${res.switch.length} Live coder, ${res.crescendo.length} Crescendo, ${same} tracks`);
  },
  'poetic images at every entry (after-tests-oct28 D5): one image per entry of three songs with and without Narrated growth, every song of a radio window opens with one, a mid-set opening at its last unsolo'() {
    const enters = (song, st) => { const t = enteringTrack(song, st); return t && t.type !== 'spoken' && t.type !== 'voice'; };
    // the images of a live build: narrator lines for an entering step, not its own step line
    const imagesOf = (B, C) => spokenSchedule(B, C, 'en', ANY).filter(x => x.voice === 'N' && x.step && enters(B, x.step) && x.text !== sayText(x.step.say, 'en'));
    const report = [];
    for (const id of ['luci-rosse', 'kellerlicht', 'settimo-cielo']) {
      const song = read(`songs/${id}.json`);
      for (const profile of ['crescendo', 'switch']) for (const narrated of [false, true]) {
        const C = resolveProfile(profile, { narratorStyle: 'poetic', narrated }), c = crescendoSong(song, { narrated, rules: growthRules(C) }), B = liveBuildOf(c, C);
        const yields = c.tracks.some(t => t.type === 'spoken') ? spokenBars(c, 'en') : new Set();
        const bars = [...new Set(buildSteps(B).filter(st => enters(B, st)).map(st => st.at))], imgs = imagesOf(B, C);
        for (const e of bars) {
          const got = imgs.filter(x => x.step.at === e);
          if (yields.has(e - 1 >= 0 ? e - 1 : e)) continue;
          assert(got.length === 1 && (got[0].at === e - 1 || got[0].at === e), `${id} ${profile}${narrated ? ' narrated' : ''}: entry at ${e} has ${got.length} images (${got.map(x => x.at)})`);
        }
        report.push(`${id} ${profile}${narrated ? '+narrated' : ''} ${imgs.length}/${bars.length}`);
      }
    }
    console.log(`      images/entries: ${report.join(', ')}`);
    // a radio window: every song opens with an image on its first bar (the song before plays the bar before it)
    let opened = 0;
    for (const profile of ['crescendo', 'switch']) {
      const rec = { seed: 'd5-window', options: { styles: ['berlin-techno'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, transition: 'cut', harmony: 'artist', profile }, changes: [], growth: GROWTH_ON_AIR };
      const items = sessionItems(RADIO_RECIPES, rec, 3), starts = layout(items.map(x => ({ bars: normalizeSong(x.song).total, transition: x.entry.transition })), 0);
      for (let k = 1; k < items.length; k++) {
        const ks = k + 1 < items.length ? [k, k + 1] : [k], W = windowSong(ks.map(i => ({ song: items[i].song, n: i + 1, start: starts[i], transition: items[i].entry.transition })));
        const songs = ks.map(i => ({ n: i + 1, prefix: `s${i + 1}-`, start: starts[i], song: items[i].song }));
        const part = windowPart(W, songs, 0, { grown: true }), C = resolveProfile(profile, { narratorStyle: 'poetic', duration: 'fitted' }), B = liveBuildOf(part, C);
        const first = buildSteps(B).filter(st => st.at >= starts[k] && enters(B, st))[0];
        if (!first || first.at !== starts[k]) continue;
        assert(imagesOf(B, C).some(x => x.step.at === first.at && x.at === starts[k]), `${profile} song ${k + 1}: no image on its first bar ${starts[k]}`);
        opened++;
      }
    }
    assert(opened >= 2, `${opened} radio songs checked for their opening image`);
    // a mid-set opening: the last unsolo brings the silent tracks in, with an image
    let midset = 0;
    for (const style of ['berlin-techno', 'pure-trance', 'synthwave', 'dark-cyberpunk']) for (const { song } of radioSongs('switch', style, `d5-mid-${style}`, 3)) {
      const C = resolveProfile('switch', { narratorStyle: 'poetic', duration: 'fitted' }), B = liveBuildOf(song, C), imgs = imagesOf(B, C);
      for (const st of buildSteps(B).filter(x => x.unsolo !== undefined && enters(B, x))) {
        assert(imgs.some(x => x.step.at === st.at && (x.at === st.at - 1 || x.at === st.at)), `${song.id}: the last unsolo at ${st.at} has no image`);
        midset++;
      }
    }
    console.log(`      ${opened} radio songs open with an image; ${midset} mid-set releases with an image`);
    assert(midset >= 1, 'no mid-set opening found');
  },
  'narrator marks (narrator-ghost-row D2): the narrator lines of spokenSchedule (explaining and poetic), the narrator off counted as on, none on a voice-track bar, none from a muted narrator track, the same marks once the Narrator track is added; luci-rosse in Live coder: 19 lines heard, 17 in the growth'() {
    const pairs = l => JSON.stringify(l.map(x => [x.at, x.text]));
    const C = resolveProfile('switch'), grown = crescendoSong({ ...read('songs/luci-rosse.json'), kind: 'composed' }, { narrated: C.narrated, rules: growthRules(C, { styles: recipes }) });
    const B = liveBuildOf(grown, C), G = grown.crescendo.growth, m = narratorMarks(B, C, 'it', ANY);
    assert(m.length === 19 && m.filter(x => x.at < G).length === 17, `luci-rosse: ${m.length} lines, ${m.filter(x => x.at < G).length} in the ${G} bars of the growth`);
    assert(m.every(x => x.track === null), 'a song without a narrator track: marks with no track');
    assert(pairs(m) === pairs(spokenSchedule(B, C, 'it', ANY).filter(x => x.voice === 'N')), 'the marks are not the narrator lines of the schedule');
    assert(pairs(narratorMarks(B, { ...C, narrator: false }, 'it', ANY)) === pairs(m) && !spokenSchedule(B, { ...C, narrator: false }, 'it', ANY).some(x => x.voice === 'N'), 'the narrator off: the schedule has no line, the marks stay');
    // poetic: the images the code says
    const Cp = { ...C, narratorStyle: 'poetic' }, Bp = liveBuildOf(grown, Cp), mp = narratorMarks(Bp, Cp, 'en', ANY);
    assert(mp.length && pairs(mp) === pairs(spokenSchedule(Bp, Cp, 'en', ANY).filter(x => x.voice === 'N')) && pairs(mp) !== pairs(narratorMarks(B, C, 'en', ANY)), 'poetic: the marks are the poetic lines of the schedule');
    // the first sound edit adds a Narrator track: the same marks, on it; muted, none
    const withN = { ...B, tracks: [...B.tracks, { id: 'narrator', name: 'Narrator', type: 'voice', settings: { ...VOICE_DEFAULT, pitch: 0.55 }, patterns: {}, clips: [] }] };
    const mn = narratorMarks(withN, C, 'it', ANY);
    assert(pairs(mn) === pairs(m) && mn.every(x => x.track === 'narrator'), 'the Narrator track added: other marks');
    assert(!narratorMarks({ ...withN, tracks: withN.tracks.map(t => (t.type === 'voice' ? { ...t, mute: true } : t)) }, C, 'it', ANY).length, 'a muted narrator track still has marks');
    // the voice instrument speaks: the narrator yields, no mark on its bars
    const E = clone(EXAMPLE), CE = resolveProfile('classic'), BE = liveBuildOf({ ...E, build: deriveBuild(E) }, CE), me = narratorMarks(BE, CE, 'en', ANY), yields = spokenBars(E, 'en');
    const said = buildSteps(BE).filter(x => x.say);
    assert(me.length && !me.some(x => yields.has(x.at)) && said.some(x => yields.has(x.at)), `marks ${me.map(x => x.at)} on the voice instrument's bars, or no step line left to it`);
    console.log(`      luci-rosse Live coder: ${m.length} lines (${m.filter(x => x.at < G).length} in the growth), poetic ${mp.length}; example: ${me.length} marks, ${said.filter(x => yields.has(x.at)).length} step lines left to the voice instrument`);
  },
  'narrator yields only to lines that sound (after-tests-oct28 D6): a voice-track line with no sample leaves its bar to the narrator; with every sample it yields as before'() {
    const song = clone(EXAMPLE);
    delete song.narrator;
    const placed = placeSpoken(song, 'en'), p = placed.find(x => x.way === 'passage' || x.way === 'opening') || placed[0], bar = p.starts[0].bar;
    const ids = song.tracks.filter(t => t.type !== 'voice' && t.type !== 'spoken').map(t => t.id);
    song.build = [{ at: 0, add: ids[0], say: 'go' }, { at: bar, set: { track: ids[0], gain: 0.5 }, say: 'here we are' }];
    // a manifest with every line's sample, then one without this line's
    const all = {};
    for (const q of placed) for (const x of q.texts) (all[q.bank] = all[q.bank] || []).includes(`${q.bank}/${saySlug(x)}.wav`) || all[q.bank].push(`${q.bank}/${saySlug(x)}.wav`);
    const without = Object.fromEntries(Object.entries(all).map(([b, l]) => [b, b === p.bank ? l.filter(f => !p.texts.some(x => f.endsWith(`/${saySlug(x)}.wav`))) : l]));
    const saved = spokenContext.files, said = files => { setSpokenContext({ files }); const st = stateAt(song, bar); return voiceCode(song, st.song, st.upTo, normalizeSong(song).total, 'en', ANY); };
    try {
      assert(!/"here we are", spoken on bar/.test(said(all)) && spokenBars(song, 'en').has(bar), 'with every sample the narrator yields to the voice track');
      assert(new RegExp(`"here we are", spoken on bar ${bar + 1}`).test(said(without)) && !spokenBars(song, 'en').has(bar), `without the line's sample the narrator is silent on bar ${bar + 1}`);
    } finally { setSpokenContext({ files: saved }); }
  },
  'stage captions (spoken-text-on-stage D1, D2): the captions are what is heard (explain, poetic, poetic with Narrated growth, a voice track, the narrator off, a line with no sample, a typed line), their timing, the step tag'() {
    const S = captionSettings({}), grownOf = (id, C) => crescendoSong({ ...read(`songs/${id}.json`), kind: 'composed' }, { narrated: C.narrated, rules: growthRules(C, { styles: recipes }) });
    // every spoken bar: the caption is the heard line; a bar of a step line not heard shows it only as the tag
    const same = (B, C, lang, files, lengths = {}) => {
      const sch = spokenSchedule(B, C, lang, files), cs = captionSchedule(B, C, lang, files, lengths), spoken = cs.filter(x => x.kind !== 'step');
      assert(JSON.stringify(spoken.map(x => [Math.floor(x.at), x.code, x.text])) === JSON.stringify(sch.filter(x => x.way !== 'chop').map(x => [x.at, x.voice, x.text])), 'the captions are not the schedule');
      for (const x of sch.filter(y => y.way !== 'chop')) {
        const f = captionFrame(cs, x.at + (x.late || 0) + 0.01, S);
        assert(f.rows.some(r => r.text === x.text && r.kind === kindOf(x.voice)), `bar ${x.at + 1}: "${x.text}" heard, the stage shows ${JSON.stringify(f.rows.map(r => r.text))}`);
      }
      return { sch, cs };
    };
    const explain = resolveProfile('switch'), A = liveBuildOf(grownOf('luci-rosse', explain), explain), a = same(A, explain, 'it', ANY);
    // explain: every step line heard is the caption and never a tag
    assert(a.cs.filter(x => x.kind === 'narrator').length === 19, `luci-rosse explain: ${a.cs.filter(x => x.kind === 'narrator').length} captions`);
    for (const x of a.cs.filter(y => y.kind === 'narrator')) assert(!captionFrame(a.cs, x.at + 0.01, S).tag, `explain, bar ${x.at + 1}: a tag under "${x.text}"`);
    // poetic: the images, the step lines as tags only
    const poetic = { ...explain, narratorStyle: 'poetic' }, P = liveBuildOf(grownOf('luci-rosse', poetic), poetic), p = same(P, poetic, 'it', ANY);
    assert(p.cs.filter(x => x.kind === 'step').every(x => !x.heard), 'poetic: a step line counted as heard');
    assert(p.cs.filter(x => x.kind === 'narrator').every(x => !p.cs.some(y => y.kind === 'step' && y.text === x.text)), 'poetic: a step line as a spoken caption');
    // poetic with Narrated growth: bar 8 says "la città respira" with the tag "ritmo più fitto"
    const pn = { ...poetic, narrated: true }, PN = liveBuildOf(grownOf('luci-rosse', pn), pn), q = same(PN, pn, 'it', ANY), f8 = captionFrame(q.cs, 7.1, S);
    assert(q.cs.filter(x => x.kind === 'narrator').length === 38, `poetic with Narrated growth: ${q.cs.filter(x => x.kind === 'narrator').length} captions, 38 heard`);
    assert(f8.rows[0] && f8.rows[0].text === 'la città respira' && f8.tag === 'ritmo più fitto', `bar 8: ${JSON.stringify(f8)}`);
    assert(captionFrame(q.cs, 16.1, S).rows.some(r => r.text === 'qualcosa di profondo si sveglia'), 'bar 17: the entry image');
    // a voice track: its lines captioned as the voice; the narrator off leaves them and no narrator caption or tag
    const notte = read('songs/prova-voce-notte.json'), CT = resolveProfile('switch'), NB = liveBuildOf(grownOf('prova-voce-notte', CT), CT), n = same(NB, CT, 'it', ANY);
    const voiced = n.cs.filter(x => x.kind === 'voice');
    assert(voiced.length >= 4 && voiced.every(x => captionFrame(n.cs, x.at + 0.01, S).rows.some(r => r.kind === 'voice' && r.text === x.text)), `prova-voce-notte: ${voiced.length} voice-track captions`);
    void notte;
    const off = { ...CT, narrator: false }, no = captionSchedule(NB, off, 'it', ANY, {});
    assert(!no.some(x => x.kind === 'narrator' || x.kind === 'step') && no.filter(x => x.kind === 'voice').length === voiced.length, 'the narrator off: narrator captions or tags left, or voice-track lines lost');
    // no sample: a line without its sample is not a caption; its step line stays as the tag
    const said = a.cs.find(x => x.kind === 'narrator' && x.at > 0), only = new Proxy({}, { get: () => ({ findIndex: f => (['/' + saySlug(said.text) + '.wav'].some(s => f(`x${s}`)) ? -1 : 0) }) });
    const ns = captionSchedule(A, explain, 'it', only, {});
    assert(!ns.some(x => x.kind === 'narrator' && x.text === said.text) && captionFrame(ns, said.at + 0.01, S).tag === said.text, `no sample: "${said.text}" captioned, or no tag`);
    // timing: the sample's length plus 1.5 s, at least 2 s, at most 4 bars, 2 bars without a length
    const bs = barSeconds(A, said.at), lens = { [`say_it/${saySlug(said.text)}.wav`]: 1.3 }, timed = captionSchedule(A, explain, 'it', ANY, lens).find(x => x.kind === 'narrator' && x.text === said.text);
    const nextN = a.cs.find(x => x.kind === 'narrator' && x.at > said.at), want = Math.min(4, 2.8 / bs, nextN ? nextN.at - said.at : 4);
    assert(Math.abs(timed.until - timed.at - want) < 1e-9, `a 1.3 s line holds ${((timed.until - timed.at) * bs).toFixed(2)} s`);
    assert(a.cs.filter(x => x.kind === 'narrator').every((x, i, l) => x.until - x.at <= 4 && (x.until - x.at === 2 || (l[i + 1] && x.until === l[i + 1].at))), 'without lengths a caption holds 2 bars (or up to the next one)');
    // a typed line: a voice-track caption marked typed, hidden with "Lines typed in the console" off
    let typedOk = 0;
    for (let i = 0; i < 30 && !typedOk; i++) {
      const g = createSession(loadStyles(), `cap-typed-${i}`).next({ styles: [['pure-trance', 'dark-cyberpunk', 'ambient'][i % 3]], voice: { presence: 'always' } });
      const sp = g.song.tracks.find(t => t.type === 'spoken');
      if (!sp) continue;
      const bar = Array.from({ length: g.plan.bars - 4 }, (_, b) => b + 2).find(b => { const t = stateAt(g.song, b).song.tracks.find(x => x.id === sp.id); return t && !t.mute && !buildSteps(g.song).some(x => x.at === b); });
      if (bar === undefined) continue;
      const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'say-live', text: 'stay with me', lang: 'en', speaker: '', mode: 'now', at: bar }], seed: `cap-typed-${i}`, n: 0 }).song;
      const C = resolveProfile('classic'), cs = captionSchedule(liveBuildOf(r, C), C, 'en', ANY, {}), x = cs.find(y => y.text === 'stay with me');
      if (!x) continue;
      assert(x.kind === 'voice' && x.typed && x.at === bar, `typed line: ${JSON.stringify(x)}`);
      assert(captionFrame(cs, bar + 0.01, S).rows.some(y => y.text === 'stay with me') && !captionFrame(cs, bar + 0.01, { ...S, typed: false }).rows.some(y => y.text === 'stay with me'), 'typed line: not shown, or shown with console lines off');
      typedOk++;
    }
    assert(typedOk, 'no typed line reached the captions');
    // the settings: off, narrator only, the old behaviour, typing by hand
    assert(!captionFrame(q.cs, 7.1, { ...S, on: false }).rows.length && !captionFrame(q.cs, 7.1, { ...S, videos: false }, { video: true }).rows.length, 'switch off, or a video with In videos too off, shows a caption');
    const old = captionFrame(q.cs, 7.1, { ...S, stepForm: 'instead' });
    assert(old.rows.length === 1 && old.rows[0].kind === 'step' && old.rows[0].text === 'ritmo più fitto' && !old.tag, `old behaviour: ${JSON.stringify(old.rows)}`);
    assert(!captionFrame(q.cs, 7.1, S, { hand: true }).rows.length && voiced.every(x => captionFrame(n.cs, x.at + 0.01, S, { hand: true }).rows.some(r => r.kind === 'voice')), 'typing by hand: the narrator shows, or the voice track does not');
    console.log(`      luci-rosse: explain ${a.cs.filter(x => x.kind === 'narrator').length}, poetic ${p.cs.filter(x => x.kind === 'narrator').length}, poetic Narrated growth ${q.cs.filter(x => x.kind === 'narrator').length} captions; prova-voce-notte ${voiced.length} voice-track captions; a typed line captioned`);
  },
  'spoken needs (spoken-text-on-stage D9): every line the code would say with every sample, with its bank; the schedule with every sample is the needs; a missing sample is listed with has false'() {
    const C = { ...resolveProfile('switch'), narratorStyle: 'poetic', narrated: true }, B = liveBuildOf(crescendoSong({ ...read('songs/prova-voce-notte.json'), kind: 'composed' }, { narrated: true, rules: growthRules(C, { styles: recipes }) }), C);
    const needs = spokenNeeds(B, C, 'it', {}), sch = spokenSchedule(B, C, 'it', ANY);
    const texts = new Set(sch.flatMap(x => x.text.split(' · ')));
    assert(needs.length && needs.every(x => !x.has && texts.has(x.text) && x.bank.startsWith('say_it')), 'needs without a manifest: not every line, or a line the schedule does not say');
    assert([...texts].every(x => needs.some(y => y.text === x)), 'a line of the schedule is not in the needs');
    assert(needs.some(x => x.voice === 'N') && needs.some(x => x.voice === 'T'), 'needs: narrator and voice-track lines');
    assert(spokenNeeds(B, C, 'it', ANY).every(x => x.has), 'needs with every sample: a line missing');
    console.log(`      prova-voce-notte poetic: ${needs.length} lines to make with no samples`);
  },
  'speaker registry (spoken-text-on-stage D11): N and T mapped to kinds, the voice track outranks the narrator, one narrator line per bar; a fake third kind is captioned with no other change, exclusive quiets the lower ranks, multiCaption adds a row'() {
    assert(kindOf('N') === 'narrator' && kindOf('T') === 'voice' && SPEAKER_KINDS.singing.future && outranks('voice', 'narrator') && !outranks('narrator', 'voice'), 'registry');
    assert(!SPEAKER_KINDS.singing.exclusive && Object.values(SPEAKER_KINDS).every(k => k.rank && k.icon && k.style && k.colour && k.mark), 'registry fields');
    const C = resolveProfile('switch'), B = liveBuildOf(crescendoSong({ ...read('songs/luci-rosse.json'), kind: 'composed' }, { narrated: true, rules: growthRules(C, { styles: recipes }) }), { ...C, narrated: true });
    const N = spokenSchedule(B, C, 'en', ANY).filter(x => x.voice === 'N'), bars = N.map(x => x.at);
    assert(new Set(bars).size === bars.length, 'two narrator lines on one bar');
    void narratorLines;
    // a fake kind: X, above the voice track
    SPEAKER_KINDS.test = { code: 'X', rank: 5, icon: 'note', style: 'sung', colour: 'amber', mark: 'icon+style', exclusive: false, multiCaption: true };
    try {
      const base = [{ at: 4, voice: 'T', text: 'the towers', bank: 'say_en_reed' }, { at: 4, voice: 'N', text: 'more bass', bank: 'say_en' }];
      const sch = [...base, { at: 4, voice: 'X', text: 'la la', bank: 'say_en_flo' }];
      const cs = captionSchedule({ ...B, build: [] }, C, 'en', ANY, {}, { schedule: sch }), S = captionSettings({});
      const rows = captionFrame(cs, 4.1, S).rows;
      assert(cs.some(x => x.kind === 'test' && x.text === 'la la') && rows.map(r => r.kind).join() === 'test,voice,narrator', `fake kind, multiCaption: rows ${rows.map(r => r.kind)}`);
      SPEAKER_KINDS.test.multiCaption = false;
      assert(captionFrame(cs, 4.1, S).rows.map(r => r.kind).join() === 'test', 'multiCaption off: more than the highest rank');
      SPEAKER_KINDS.test.exclusive = true; SPEAKER_KINDS.test.multiCaption = true;
      const ex = captionSchedule({ ...B, build: [] }, C, 'en', ANY, {}, { schedule: sch });
      assert(ex.filter(x => x.kind !== 'step').map(x => x.kind).join() === 'test' && captionFrame(ex, 4.1, S).rows.map(r => r.kind).join() === 'test', `exclusive: ${ex.map(x => x.kind)}`);
      assert(applyExclusive([{ at: 0, until: 1, kind: 'test' }, { at: 2, until: 3, kind: 'voice' }]).length === 2, 'exclusive quiets a line that does not overlap');
      assert(captionRows([{ at: 1, kind: 'narrator' }, { at: 1, kind: 'voice' }]).map(r => r.kind).join() === 'voice,narrator', 'rows by rank');
    } finally { delete SPEAKER_KINDS.test; }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS).filter(([n]) => !process.env.ONLY || n.includes(process.env.ONLY))) {
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
