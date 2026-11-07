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
import { buildSteps, stateAt, deriveBuild, voiceCode, SPEAKERS, saySlug, sayText, slugAt } from '../src/song/build.js';
import { growOnAir } from '../src/endless/growth.js';
import { placeSpoken, spokenBars, setSpokenContext, spokenContext, speakerOf, narratorSpeaker, lineOf, enteringTrack, WAYS } from '../src/song/spoken.js';
import { VOCABULARY, VOCAB_GROUPS, POETIC } from '../src/song/vocabulary.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { shapeFacts, canPlay, resolveShape } from '../src/song/shapes.js';
import { generateSession, createSession, CHOP_RHYTHMS, mixedSlots } from '../src/endless/director.js';
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
import { sectionFacts, whereOfTrack, checkSpokenPattern } from '../src/song/spoken.js';
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
import { captionSchedule, spokenNeeds, narratorLines, captionHold, lateLines, voicesAt, stepText, sayBank, SPEAKER_LANGS, REMOVED_SPEAKERS, speakerId, speaks, voiceSamples, lineSample } from '../src/song/build.js';
import { voiceFor, spokenFor } from '../src/endless/director.js';
import { stream } from '../src/endless/random.js';
import { captionFrame, captionSettings } from '../src/captions/captions.js';
import { SPEAKER_KINDS, kindOf, outranks, applyExclusive, captionRows } from '../src/song/speakers.js';
import { barSeconds } from '../src/song/spoken.js';
import { setCombos, COMBOS_FILE, effectiveCombos } from '../src/voices/combos.js';

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

// voice-style-combos (#82): draws with a narrowed combos file (setCombos), put back after; a character is read from the
// settings by its own values (applied after the drawn knobs, so all of them are there unless a chosen sound covers them)
const withCombos = (t, fn) => { const old = setCombos(t); try { return fn(); } finally { setCombos(old); } };
const hasChar = (st, c) => Object.entries(VOICE_CHARACTERS[c]).every(([k, v]) => st[k] === v);
const charsOf = st => Object.keys(VOICE_CHARACTERS).filter(c => hasChar(st, c));
const COMBO_STYLES = ['dark-cyberpunk', 'ambient', 'pure-trance', 'berlin-techno'];
// at least 300 radio songs (the session entries and the songs), from seeds of their own
function comboSongs(extra = {}, min = 300) {
  const out = { entries: [], songs: [] };
  for (let i = 0; out.songs.length < min; i++) {
    const g = generateSession(recipes, { styles: COMBO_STYLES, seed: `combos-${i}`, minutes: 120, chaos: 0.8, ...extra });
    out.entries.push(...g.session.songs); out.songs.push(...g.songs);
  }
  return out;
}
const voiceTracks = songs => songs.flatMap(s => s.tracks.filter(t => t.type === 'voice' || t.type === 'spoken'));

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
  'ways: a passage clip that covers no section of the window (a resume after a pause) starts on its clip, no throw'() {
    let checked = 0;
    for (const s of [...withSpoken, ...voiced({ phrases: '4-5', kind: 'different', presence: 'often' })]) {
      const n = normalizeSong(s), tr = n.tracks.find(t => t.type === 'spoken');
      for (const clip of tr.clips) {
        const pat = (tr.patterns || {})[clip.pattern];
        if (!pat || pat.way !== 'passage' || pat.before !== undefined) continue;
        // the window's sections end before the clip, as in the part of a window the radio compiles on a resume
        const cut = clone(s); cut.sections = n.sections.filter(x => x.start + x.bars <= clip.start).map(x => ({ ...x }));
        if (!cut.sections.length) continue;
        const p = placeSpoken(cut, 'en').find(x => x.track === tr.id && x.key === clip.pattern);
        assert(p && p.starts.some(st => st.bar === clip.start), `${s.id} ${tr.id}/${clip.pattern}: ${JSON.stringify(p && p.starts)}`);
        checked++;
      }
    }
    assert(checked >= 1, `${checked} passage clips`);
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
  'poetic narrator: explain is unchanged; poetic speaks on the bar before an entry (or its own first bar) and on the steps with a step line (poetic-narrator D1)'() {
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
    const steps = buildSteps(c), total = normalizeSong(c).total, entries = new Set(steps.filter(x => enteringTrack(c, x)).map(x => x.at)), says = new Set(steps.filter(x => x.say).map(x => x.at));
    let n = 0;
    for (let upTo = 1; upTo <= steps.length; upTo++) {
      const code = voiceCode(c, stateAt(c, steps[upTo - 1].at).song, upTo, total, 'en', ANY);
      for (const b of narrated(code)) { assert(entries.has(b) || entries.has(b + 1) || says.has(b), `poetic narration on bar ${b + 1}: no entry there or on the next bar, no step line there`); n++; }
      if (code) assert(!code.includes(`"${typeof steps[upTo - 1].say === 'object' ? steps[upTo - 1].say.en : '§'}"`), 'an explanation in poetic mode');
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
    assert(it.texts[0] === 'la città è ancora sveglia' && en.texts[0] === 'the city is still awake' && it.bank === 'say_it' && en.bank === 'say_en_fred', `${it.texts} ${it.bank} ${en.bank}`);
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
      const C = resolveProfile(id, { ...o, spoken: true }), c = crescendoSong({ ...song, kind: 'composed' }, { narrated: C.narrated, rules: growthRules(C, { styles }) });
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
    const auto = texts(luci, resolveProfile('crescendo', { voice: true })), ex = texts(luci, resolveProfile('crescendo', { narratorStyle: 'explain', voice: true })), po = texts(luci, resolveProfile('crescendo', { narratorStyle: 'poetic', voice: true }));
    assert(auto.length && JSON.stringify(auto) === JSON.stringify(ex) && !auto.some(x => poetic.includes(x)), `luci-rosse automatic: ${auto.slice(0, 3)}`);
    assert(po.length >= 2 && po.every(x => poetic.includes(x)), `luci-rosse poetic: ${po.slice(0, 3)}`);
    const own = notte.narrator && typeof notte.narrator === 'object' && notte.narrator.lines ? Object.values(notte.narrator.lines).flat().map(x => x.en) : [];
    const nAuto = texts(notte, resolveProfile('crescendo', { voice: true })), nEx = texts(notte, resolveProfile('crescendo', { narratorStyle: 'explain', voice: true }));
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
  'poetic narrator (poetic-narrator D1 to D4): with Narrated growth off and on, in English and Italian, the poetic narrator speaks where the explaining one does: every bar with a step line and no entry says a movement image or gives its bar to an image, every entry has its image, nothing on the entry bar itself, no step line; the movement images take turns; the explaining style unchanged'() {
    const enters = (B, st) => { const t = enteringTrack(B, st); return !!t && t.type !== 'spoken'; };
    const report = [];
    for (const id of ['luci-rosse', 'kellerlicht']) {
      const song = read(`songs/${id}.json`);
      for (const narrated of [false, true]) for (const lang of ['en', 'it']) {
        const images = new Set(Object.entries(POETIC).filter(([k]) => k !== 'move').flatMap(([, v]) => v.map(x => x[lang]))), move = POETIC.move.map(x => x[lang]);
        const C = resolveProfile('crescendo', { narratorStyle: 'poetic', narrated }), c = crescendoSong(song, { narrated, rules: growthRules(C) }), B = liveBuildOf(c, C), steps = buildSteps(B);
        const E = resolveProfile('crescendo', { narratorStyle: 'explain', narrated }), EB = liveBuildOf(crescendoSong(song, { narrated, rules: growthRules(E) }), E);
        const tag = `${id} ${narrated ? 'narrated' : 'plain'} ${lang}`;
        // the steps are the same for both styles: the style changes only what is said
        assert(JSON.stringify(buildSteps(EB).map(x => [x.at, !!x.say])) === JSON.stringify(steps.map(x => [x.at, !!x.say])), `${tag}: the steps differ between the styles`);
        const said = spokenSchedule(B, C, lang, ANY).filter(x => x.voice === 'N'), explained = spokenSchedule(EB, E, lang, ANY).filter(x => x.voice === 'N');
        const start = 0, entryBars = new Set(steps.filter(st => enters(B, st)).map(st => st.at)), imageBar = e => (e - 1 >= start ? e - 1 : e);
        const imageBars = new Set([...entryBars].map(imageBar));
        // the explaining style: the step line of the latest step with "say" on each bar
        const last = new Map();
        for (const st of steps) if (st.say) last.set(st.at, st);
        assert(JSON.stringify(explained.map(x => [x.at, x.text])) === JSON.stringify([...last.values()].map(st => [st.at, sayText(st.say, lang)])), `${tag}: the explaining style no longer says every step line (${explained.length} of ${last.size})`);
        // no step line, every line an image or a movement image, one per bar
        for (const x of said) assert(images.has(x.text) || move.includes(x.text), `${tag} bar ${x.at + 1}: "${x.text}" is not an image`);
        assert(new Set(said.map(x => x.at)).size === said.length, `${tag}: two narrator lines on one bar`);
        // every bar with a step line and no entry: a movement image, or an image of the next bar's entry
        for (const [bar] of last) {
          if (entryBars.has(bar)) continue;
          const x = said.find(y => y.at === bar);
          assert(x && (move.includes(x.text) || (imageBars.has(bar) && images.has(x.text))), `${tag} bar ${bar + 1}: the step line's bar says ${x ? `"${x.text}"` : 'nothing'}`);
        }
        // every entry its image, on the bar before (or its own first bar); nothing more on an entry's own bar
        for (const e of entryBars) {
          const x = said.find(y => y.at === imageBar(e));
          assert(x && images.has(x.text), `${tag}: the entry on bar ${e + 1} has no image`);
          if (imageBar(e) !== e && !imageBars.has(e)) assert(!said.some(y => y.at === e), `${tag}: a line on the entry's own bar ${e + 1}`);
        }
        // the movement images take turns: consecutive lines of the list (no voice track here, so no bar is skipped)
        const moves = said.filter(x => move.includes(x.text)).map(x => move.indexOf(x.text));
        for (let i = 1; i < moves.length; i++) assert(moves[i] === (moves[i - 1] + 1) % move.length, `${tag}: movement images out of turn (${moves.slice(0, i + 1)})`);
        assert(new Set(moves.slice(0, move.length)).size === Math.min(moves.length, move.length), `${tag}: a movement image said again before the list is over`);
        assert(moves.length >= 4, `${tag}: ${moves.length} movement images`);
        report.push(`${tag} ${said.length} (${said.length - moves.length} images, ${moves.length} moves; explain ${explained.length})`);
      }
    }
    console.log(`      ${report.join('; ')}`);
  },
  'poetic narrator: every built-in image and movement image has English and Italian text (poetic-narrator D5)'() {
    for (const [k, list] of Object.entries(POETIC)) list.forEach((x, i) => assert(x && typeof x.en === 'string' && x.en.trim() && typeof x.it === 'string' && x.it.trim(), `POETIC.${k}[${i}]: ${JSON.stringify(x)}`));
  },
  'poetic narrator fallback (poetic-narrator D5): no image list, or an image with no text in the language, says the step line instead'() {
    const song = read('songs/luci-rosse.json');
    const sched = (src, style, narrated, lang) => {
      const C = resolveProfile('crescendo', { narratorStyle: style, narrated }), c = crescendoSong(src, { narrated, rules: growthRules(C) }), B = liveBuildOf(style === 'poetic' && src.narrator ? { ...c, narrator: { ...src.narrator, style } } : c, C);
      return spokenSchedule(B, C, lang, ANY).filter(x => x.voice === 'N').map(x => [x.at, x.text]);
    };
    // every list empty (a test copy of the vocabulary, restored after): the poetic narrator says what the explaining one says
    const saved = Object.fromEntries(Object.entries(POETIC).map(([k, v]) => [k, [...v]]));
    try {
      for (const v of Object.values(POETIC)) v.length = 0;
      for (const narrated of [false, true]) for (const lang of ['en', 'it']) {
        const own = { ...song, narrator: { style: 'poetic', lines: { move: [] } } };
        const p = sched(own, 'poetic', narrated, lang), e = sched(song, 'explain', narrated, lang);
        assert(p.length && JSON.stringify(p) === JSON.stringify(e), `no image lists, ${narrated ? 'narrated' : 'plain'} ${lang}: ${p.length} poetic lines against ${e.length} step lines`);
      }
    } finally { for (const [k, v] of Object.entries(saved)) { POETIC[k].length = 0; POETIC[k].push(...v); } }
    // an empty movement list of the song's own: the vocabulary's movement images still speak
    const own = { ...song, narrator: { style: 'poetic', lines: { move: [] } } }, move = POETIC.move.map(x => x.en);
    assert(sched(own, 'poetic', true, 'en').some(([, t]) => move.includes(t)), 'an empty own movement list: no vocabulary movement image');
    // images with English text only: Italian says the step lines (no English image in an Italian song), English the images
    const types = [...new Set(song.tracks.map(t => t.type)), 'any', 'move'];
    const en = { ...song, narrator: { style: 'poetic', lines: Object.fromEntries(types.map(t => [t, [{ en: `only english ${t}` }]])) } };
    for (const narrated of [false, true]) {
      const it = sched(en, 'poetic', narrated, 'it'), e = sched(song, 'explain', narrated, 'it');
      assert(!it.some(([, t]) => t.startsWith('only english')) && JSON.stringify(it) === JSON.stringify(e), `English-only images in Italian, ${narrated ? 'narrated' : 'plain'}: ${JSON.stringify(it.slice(0, 3))}`);
      const enSaid = sched(en, 'poetic', narrated, 'en');
      assert(enSaid.length && enSaid.every(([, t]) => t.startsWith('only english')), `English-only images in English: ${JSON.stringify(enSaid.slice(0, 3))}`);
    }
  },
  'poetic steps: with the poetic style and Narrated growth a step without an entry says a movement image in English and Italian, not its step line; nothing on the bar of an entry step; samples for every movement image'() {
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
    const sp = generateSession(recipes, { styles: ['ambient'], seed: 'suono-t', minutes: 40, voice: { presence: 'always', sound: { style: 'robot', speaker: 'kathy' } } }).songs.map(s => s.tracks.find(t => t.type === 'spoken'));
    assert(sp.length && sp.every(t => t.settings.speaker === 'kathy' && t.settings.drive === 3.5 && t.settings.pitch === 0.7), 'voice track sound');
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
    assert(VS.sayBank('en', 'kathy') === 'say_en_kathy' && VS.sayBank('en', '') === 'say_en' && VS.MAX_WORDS === 12, 'banks');
  },
  'real voices (D1, D2): the speaker table, the language rule of sayBank, the same in tools/voice-sample.mjs'() {
    assert(SPEAKERS.join() === 'albert,fred,junior,kathy,siri4' && SPEAKERS.every(s => SPEAKER_LANGS[s].join() === (s === 'siri4' ? 'it' : 'en')), `speakers ${SPEAKERS}`);
    assert(sayBank('it', 'kathy') === 'say_it' && sayBank('en', 'kathy') === 'say_en_kathy' && sayBank('en', 'reed') === 'say_en' && sayBank('it', '') === 'say_it' && sayBank('it', 'siri4') === 'say_it_siri4' && sayBank('en', 'siri4') === 'say_en', 'sayBank');
    assert(JSON.stringify(VS.SPEAKER_LANGS) === JSON.stringify(SPEAKER_LANGS) && VS.SPEAKERS.join() === SPEAKERS.join(), 'the two speaker tables differ');
    for (const lang of ['en', 'it', 'es']) for (const s of ['', ...SPEAKERS, ...REMOVED_SPEAKERS, 'nobody']) {
      assert(VS.sayBank(lang, s) === sayBank(lang, s), `sayBank ${lang} ${s}: ${VS.sayBank(lang, s)} against ${sayBank(lang, s)}`);
      assert(VS.speaks(lang, s) === speaks(lang, s), `speaks ${lang} ${s}`);
    }
    assert(SPEAKERS.every(s => speakerId(s) === s) && REMOVED_SPEAKERS.every(s => speakerId(s) === '') && speakerId(undefined) === '', 'speakerId');
    // (in Italian only siri4 besides the default voice (#82): an English speaker's line is asked from say_it, never
    // say_it_<speaker>)
    assert(SPEAKERS.filter(s => speaks('it', s)).join() === 'siri4', 'Italian speakers');
  },
  'real voices (D3): a removed speaker reads as the default voice: an old song, a user style, validation'() {
    const keep = { ...spokenContext };
    try {
      // an old song: narrator reed, a voice track grandpa and a story flo
      const old = clone(EXAMPLE);
      old.tracks.find(t => t.type === 'voice').settings.speaker = 'reed';
      old.tracks.find(t => t.id === 'words').settings.speaker = 'grandpa';
      const story = old.tracks.find(t => t.id === 'story'); if (story) story.settings.speaker = 'flo';
      // (the removed speakers always spoke with the default voice: they still do, none is drawn in their place)
      for (const t of old.tracks.filter(x => x.type === 'spoken')) assert(speakerOf(old, t) === '', `${t.id}: ${speakerOf(old, t)} for a removed speaker`);
      assert(narratorSpeaker(old) === '', 'the narrator of a removed speaker');
      const v = validateSong(old);
      assert(!v.errors.length, `errors: ${JSON.stringify(v.errors)}`);
      assert(v.warnings.some(w => /removed speaker/.test(w.msg)), 'no removed-speaker warning');
      // every narrator line of the old song plays from say_<lang> in either language (frozen sessions sound as before)
      setSpokenContext({ files: null });
      const nar = old.tracks.find(t => t.type === 'voice');
      for (const lang of ['en', 'it']) {
        const files = { [`say_${lang}`]: ['/samples/x/the_city.wav'], [`say_${lang}_reed`]: ['/samples/x/the_city.wav'] };
        const got = lineSample(nar, lang, files, 'the city');
        assert(got.bank === `say_${lang}` && got.n === 0, `${lang}: ${JSON.stringify(got)}`);
        assert(voiceSamples(old, lang, files).every(x => x.s === `say_${lang}` || /^say_[a-z]{2}_(albert|fred|junior|kathy|siri4)$/.test(x.s)), `${lang}: a removed bank asked`);
      }
      // an old frozen radio song with flo and grandpa: every bank of its lines is a default or listed one
      const frozen = { ...clone(EXAMPLE), tracks: clone(EXAMPLE).tracks.map(t => (t.type === 'voice' ? { ...t, settings: { ...t.settings, speaker: 'flo' } } : t.type === 'spoken' ? { ...t, settings: { ...t.settings, speaker: 'grandpa' } } : t)) };
      for (const lang of ['en', 'it']) for (const p of placeSpoken(frozen, lang)) assert(p.bank === `say_${lang}`, `frozen ${lang}: ${p.bank}`);
    } finally { Object.assign(spokenContext, keep); setSpokenContext(keep); }
    // a user style with voice.speakers ["rocko", "kathy"]: valid with a warning, the director draws only "" or kathy
    const base = recipes.find(r => r.id === 'berlin-techno'), R = { ...clone(base), voice: { ...clone(base.voice), speakers: ['rocko', 'kathy'] }, spoken: { weight: 1, ways: { refrain: 1 }, speakers: ['shelley', 'kathy'] } };
    const vr = validateRecipe(R);
    assert(!vr.errors.length && vr.warnings.some(w => /removed speaker/.test(w.msg)), `recipe: ${JSON.stringify(vr)}`);
    assert(validateRecipe({ ...R, voice: { ...R.voice, speakers: ['nobody'] } }).errors.length, 'an unknown speaker is still an error');
    // (the style's list reads as ["", "kathy"]: every draw over 200 seeds is the one of that list; the director's
    // "another speaker now and then" still draws from every listed speaker, never a removed one)
    const S = { ...R, voice: { ...R.voice, speakers: ['', 'kathy'] }, spoken: { ...R.spoken, speakers: ['kathy'] } }, drawn = new Set(), inst = new Set();
    for (let k = 0; k < 200; k++) {
      const a = voiceFor(R, { chaos: 0 }, stream(`rv-${k}`, 'voice')), b = voiceFor(S, { chaos: 0 }, stream(`rv-${k}`, 'voice'));
      assert(JSON.stringify(a) === JSON.stringify(b), `seed rv-${k}: the voice differs from the style with ["", "kathy"]`);
      drawn.add(a.settings.speaker);
      const x = spokenFor(R, { complexity: 0.5 }, { settings: { speaker: '' } }, stream(`rv-${k}`, 'spoken')), y = spokenFor(S, { complexity: 0.5 }, { settings: { speaker: '' } }, stream(`rv-${k}`, 'spoken'));
      assert(JSON.stringify(x) === JSON.stringify(y), `seed rv-${k}: the voice instrument differs`);
      if (x) inst.add(x.track.settings.speaker);
    }
    assert([...drawn].every(s => s === '' || SPEAKERS.includes(s)) && drawn.has('kathy') && drawn.has(''), `voice draws: ${[...drawn]}`);
    assert(inst.size === 1 && inst.has('kathy'), `voice instrument draws: ${[...inst]}`);
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
    // (varied-openings: the full-kick opening luci-rosse drew before, so the counts stay)
    const C = resolveProfile('switch', { opening: 'full-kick' }), grown = crescendoSong({ ...read('songs/luci-rosse.json'), kind: 'composed' }, { narrated: C.narrated, rules: growthRules(C, { styles: recipes }) });
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
      // (a voice-track line of several entries: one caption per entry heard, at its step; voice-track-captions)
      const heardOf = x => (x.entries || [{ text: x.text, late: x.late || 0 }]).map(e => ({ at: x.at + e.late, voice: x.voice, text: e.text }));
      const key = l => JSON.stringify(l.map(x => [Math.round(x.at * 1e6), x.voice, x.text]).sort());
      assert(key(spoken.map(x => ({ at: x.at, voice: x.code, text: x.text }))) === key(sch.filter(x => x.way !== 'chop').flatMap(heardOf)), 'the captions are not the schedule');
      for (const x of sch.filter(y => y.way !== 'chop').flatMap(heardOf)) {
        const f = captionFrame(cs, x.at + 0.01, S);
        assert(f.rows.some(r => r.text === x.text && r.kind === kindOf(x.voice)), `bar ${Math.floor(x.at) + 1}: "${x.text}" heard, the stage shows ${JSON.stringify(f.rows.map(r => r.text))}`);
      }
      return { sch, cs };
    };
    // (varied-openings: the full-kick opening luci-rosse drew before, so the counts and bars stay)
    const explain = resolveProfile('switch', { opening: 'full-kick' }), A = liveBuildOf(grownOf('luci-rosse', explain), explain), a = same(A, explain, 'it', ANY);
    // explain: every step line heard is the caption and never a tag
    assert(a.cs.filter(x => x.kind === 'narrator').length === 19, `luci-rosse explain: ${a.cs.filter(x => x.kind === 'narrator').length} captions`);
    for (const x of a.cs.filter(y => y.kind === 'narrator')) assert(!captionFrame(a.cs, x.at + 0.01, S).tag, `explain, bar ${x.at + 1}: a tag under "${x.text}"`);
    // poetic: the images, the step lines as tags only
    const poetic = { ...explain, narratorStyle: 'poetic' }, P = liveBuildOf(grownOf('luci-rosse', poetic), poetic), p = same(P, poetic, 'it', ANY);
    assert(p.cs.filter(x => x.kind === 'step').every(x => !x.heard), 'poetic: a step line counted as heard');
    assert(p.cs.filter(x => x.kind === 'narrator').every(x => !p.cs.some(y => y.kind === 'step' && y.text === x.text)), 'poetic: a step line as a spoken caption');
    // poetic without Narrated growth speaks on as many bars as the explaining style (poetic-narrator D1)
    assert(p.cs.filter(x => x.kind === 'narrator').length === 19, `poetic without Narrated growth: ${p.cs.filter(x => x.kind === 'narrator').length} captions, 19 heard`);
    // poetic with Narrated growth: bar 8 says an image of the movement list (POETIC.move) with the tag "ritmo più fitto"
    const pn = { ...poetic, narrated: true }, PN = liveBuildOf(grownOf('luci-rosse', pn), pn), q = same(PN, pn, 'it', ANY), f8 = captionFrame(q.cs, 7.1, S);
    assert(q.cs.filter(x => x.kind === 'narrator').length === 33, `poetic with Narrated growth: ${q.cs.filter(x => x.kind === 'narrator').length} captions, 33 heard`);
    assert(f8.rows[0] && POETIC.move.some(m => m.it === f8.rows[0].text) && f8.tag === 'ritmo più fitto', `bar 8: ${JSON.stringify(f8)}`);
    const f17 = captionFrame(q.cs, 16.1, S);
    assert(f17.rows.some(r => POETIC.bass.some(b => b.it === r.text)), `bar 17: the entry image of the bass: ${JSON.stringify(f17.rows)}`);
    // the entry's own bar 18: no narrator caption of its own; its step line is the tag of bar 17's image, shown with it
    // (narrator-caption-sync D1, superseding poetic-narrator D6 on the tag)
    const e18 = buildSteps(PN).filter(x => x.at === 17 && x.say).pop();
    assert(e18 && !q.cs.some(x => x.kind === 'narrator' && x.at === 17) && f17.tag === sayText(e18.say, 'it') && !f17.rows.some(r => r.text === f17.tag), `bar 17: the tag under the image is not bar 18's step line: ${JSON.stringify(f17)}`);
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
    // timing (narrator-caption-sync D3): the sample's length plus 1.5 s, at least 3 s, at most 4 bars, 2 bars (at least
    // 3 s) without a length
    const bs = barSeconds(A, said.at), lens = { [`say_it/${saySlug(said.text)}.wav`]: 1.3 }, timed = captionSchedule(A, explain, 'it', ANY, lens).find(x => x.kind === 'narrator' && x.text === said.text);
    const nextN = a.cs.find(x => x.kind === 'narrator' && x.at > said.at), want = Math.min(4, 3 / bs, nextN ? nextN.at - said.at : 4);
    assert(Math.abs(timed.until - timed.at - want) < 1e-9, `a 1.3 s line holds ${((timed.until - timed.at) * bs).toFixed(2)} s`);
    assert(a.cs.filter(x => x.kind === 'narrator').every((x, i, l) => x.until - x.at <= 4 && (Math.abs(x.until - x.at - captionHold(null, barSeconds(A, x.at))) < 1e-9 || (l[i + 1] && x.until === l[i + 1].at))), 'without lengths a caption holds 2 bars, at least 3 s (or up to the next one)');
    // the spec's scenarios at 124 BPM (a bar 60 / 124 * 4 s): a 1.3 s line 3 s, a 2 s line 3.5 s, no length 2 bars
    const b124 = 240 / 124;
    assert(Math.abs(captionHold(1.3, b124) * b124 - 3) < 1e-9 && Math.abs(captionHold(2, b124) * b124 - 3.5) < 1e-9 && captionHold(null, b124) === 2 && captionHold(0.8, b124) * b124 === 3, `captionHold at 124 BPM: ${[1.3, 2, null, 0.8].map(l => captionHold(l, b124) * b124)}`);
    assert(captionHold(9, b124) === 4 && Math.abs(captionHold(null, 240 / 180) * (240 / 180) - 3) < 1e-9, 'captionHold: over 4 bars, or under 3 s at 180 BPM');
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
  'caption sync (narrator-caption-sync D1 to D3, D7): luci-rosse in Crescendo, poetic, Narrated growth off and on, English and Italian, the frame every 1/8 bar: the tag is the step line of the step the narrator line speaks for (the entering step for an entry image) and leaves with it, no tag without its narrator line, an entry with no step line has no tag, a step no line speaks for never shows, a caption lasts at least 3 s unless the next line of its speaker replaces it, never over 4 bars; the voice track on prova-voce-notte the same'() {
    // The state before this change (the investigation behind hand tests pn1 and pn2; luci-rosse, Crescendo, poetic,
    // English, the samples of the owner's machine):
    //   without Narrated growth the image "a low tide rising" on bar 12 showed under "more hats" (bar 9's step), and
    //   "need bass" showed only from bar 13, after the image had gone at 13.36;
    //   with Narrated growth "a low tide rising" on bar 6 showed under "more hats", and "bass in" appeared on bar 7;
    //   every poetic caption left 1.5 to 2.5 bars before its tag.
    const S = captionSettings({}), grownOf = (id, C) => crescendoSong({ ...read(`songs/${id}.json`), kind: 'composed' }, { narrated: C.narrated, rules: growthRules(C, { styles: recipes }) });
    // the lengths of this machine's samples, else 0.06 s a character (short lines hit the 3-second floor)
    let real = {};
    try { real = read('public/samples/say_lengths.json'); } catch (e) { real = {}; }
    const lengths = new Proxy(real, { get: (o, k) => (typeof k !== 'string' ? undefined : Number.isFinite(o[k]) ? o[k] : 0.06 * k.replace(/^.*\//, '').replace(/\.wav$/, '').length) });
    const held = (cs, kind, B, label) => {
      const list = cs.filter(x => x.kind === kind && !x.hold);
      list.forEach(x => {
        const sec = (x.until - x.at) * barSeconds(B, x.at), next = list.find(y => y.at > x.at);
        assert(x.until - x.at <= 4 + 1e-9, `${label}: "${x.text}" on bar ${x.at + 1} lasts ${(x.until - x.at).toFixed(2)} bars`);
        if (x.seconds) assert(sec >= 3 - 1e-9 || (next && Math.abs(x.until - next.at) < 1e-9), `${label}: "${x.text}" on bar ${x.at + 1} lasts ${sec.toFixed(2)} s, not cut by the next line`);
      });
      return list.length;
    };
    const st = { frames: 0, tagged: 0, entries: 0, unsaid: 0 };
    for (const narrated of [false, true]) for (const lang of ['en', 'it']) {
      const C = { ...resolveProfile('switch'), narratorStyle: 'poetic', narrated }, B = liveBuildOf(grownOf('luci-rosse', C), C), s = withNarratorStyle(B, 'poetic');
      const sch = spokenSchedule(B, C, lang, ANY), cs = captionSchedule(B, C, lang, ANY, lengths), label = `luci-rosse ${lang}${narrated ? ', Narrated growth' : ''}`;
      const N = cs.filter(x => x.kind === 'narrator');
      // the expected tag of a caption: the step line of its schedule line's step; an entry image is said on the bar
      // before its step, which brings a track in
      const want = x => {
        const l = sch.find(y => y.voice === 'N' && y.at === x.at && y.text === x.text);
        assert(l && l.step, `${label}: no schedule line for "${x.text}" on bar ${x.at + 1}`);
        const entry = l.step.at === l.at + 1;
        if (entry) assert(enteringTrack(s, l.step), `${label}: "${x.text}" on bar ${x.at + 1} speaks for bar ${l.step.at + 1}, which brings no track in`);
        const tag = stepText(s, l.step, lang);
        return { tag: tag && tag !== x.text ? tag : '', entry };
      };
      const tags = new Set(), last = Math.ceil(Math.max(...cs.map(x => x.until))) + 1;
      for (let k = 0; k <= last * 8; k++) {
        const b = k / 8, f = captionFrame(cs, b, S), nr = f.rows.find(r => r.kind === 'narrator');
        st.frames++;
        if (f.tag) { st.tagged++; tags.add(f.tag); assert(nr, `${label}, bar ${(b + 1).toFixed(3)}: the tag "${f.tag}" shows without its narrator line`); }
        if (!nr) continue;
        const c = N.filter(x => x.at <= b && b < x.until).pop(), w = want(c);
        assert(f.tag === w.tag, `${label}, bar ${(b + 1).toFixed(3)}: under "${c.text}" the tag is "${f.tag}", not "${w.tag}"${w.entry ? ' (the entering step\'s line)' : ''}`);
        if (w.entry) st.entries++;
      }
      // a step no narrator line speaks for never shows as a tag
      const paired = new Set(cs.filter(x => x.kind === 'step' && x.paired).map(x => x.text));
      for (const x of cs.filter(y => y.kind === 'step')) {
        assert(x.tagless, `${label}: the step line "${x.text}" of bar ${x.at + 1} is not tagless in the poetic style`);
        if (!x.paired && !paired.has(x.text)) { st.unsaid++; assert(!tags.has(x.text), `${label}: "${x.text}" (bar ${x.at + 1}) shows as a tag, but no narrator line speaks for it`); }
      }
      assert(N.some(x => want(x).entry && want(x).tag), `${label}: no entry image with its entering step's line`);
      held(cs, 'narrator', B, label);
    }
    // an entry whose step has no step line (none in luci-rosse: every entering step says something): its image alone
    {
      const C = { ...resolveProfile('switch'), narratorStyle: 'poetic' }, B = liveBuildOf(grownOf('luci-rosse', C), C);
      const sch = [{ at: 22, voice: 'N', text: 'the pad wakes', bank: 'say_en', step: { at: 23, add: 'pad' } }];
      const f = captionFrame(captionSchedule({ ...B, build: [] }, C, 'en', ANY, {}, { schedule: sch }), 22.5, S);
      assert(f.rows.some(r => r.kind === 'narrator' && r.text === 'the pad wakes') && !f.tag, `an entry with no step line: ${JSON.stringify(f)}`);
    }
    // the voice track: the same timing
    const CT = resolveProfile('switch'), NB = liveBuildOf(grownOf('prova-voce-notte', CT), CT), voiced = held(captionSchedule(NB, CT, 'it', ANY, lengths), 'voice', NB, 'prova-voce-notte');
    assert(voiced >= 4, `prova-voce-notte: ${voiced} voice-track captions`);
    console.log(`      ${st.frames} frames, ${st.tagged} with a tag, ${st.entries} entry-image frames, ${st.unsaid} step lines no line speaks for; prova-voce-notte ${voiced} voice-track captions`);
  },
  'no replay (narrator-caption-sync D4, D5): a line the voice helper made after the default voice spoke it is not played late; a line with no sample at all is; none of a batch the speaker spoke already; spokenNeeds carries the step line a narrator line speaks for (sub)'() {
    const wav = (bank, text) => `${bank}/${saySlug(text)}.wav`, heard = 'just google it', fresh = 'a line nobody recorded';
    const got = [heard, fresh].map(text => ({ text, bank: 'say_en_fred', lang: 'en', voice: 'N', at: 8 }));
    const kept = lateLines(got, { say_en: [wav('say_en', heard)], say_en_fred: [] }, 'en');
    assert(kept.length === 1 && kept[0].text === fresh, `the default voice's sample present: ${JSON.stringify(kept.map(x => x.text))} played late`);
    assert(lateLines(got, {}, 'en').length === 2, 'no sample at all: a line not played late');
    assert(!lateLines(got, { say_en_fred: got.map(x => wav('say_en_fred', x.text)) }, 'en').length, 'the speaker spoke them already: a line played late');
    // sub: the step line of the step the line speaks for, the same as its caption's tag (D5)
    const C = { ...resolveProfile('switch'), narratorStyle: 'poetic', narrated: true }, B = liveBuildOf(crescendoSong({ ...read('songs/luci-rosse.json'), kind: 'composed' }, { narrated: true, rules: growthRules(C, { styles: recipes }) }), C);
    const needs = spokenNeeds(B, C, 'it', {}).filter(x => x.voice === 'N'), cs = captionSchedule(B, C, 'it', ANY, {});
    assert(needs.length && needs.every(x => { const c = cs.find(y => y.kind === 'narrator' && y.at === x.at && y.text === x.text); return c && c.step === x.sub; }), 'spokenNeeds: a sub that is not its caption\'s step line');
    assert(needs.some(x => x.sub && x.sub !== x.text), 'spokenNeeds: no narrator line with a step line of its own');
    console.log(`      ${needs.length} narrator lines with their step line`);
  },
  'voice samples in bar order (narrator-caption-sync D6): voicesAt gives what the radio\'s voicesOf gave before, on two radio songs, with the speaker\'s own sample or the default voice\'s'() {
    // the radio's voicesOf before this change (src/radio/radio.js), without the item's start
    const before = (B, C, lang, files) => {
      const out = [], seen = new Set();
      for (const x of spokenNeeds(B, C, lang, files)) for (const s of [x.bank, `say_${lang}`]) {
        const n = slugAt(files[s] || [], saySlug(x.text));
        if (n < 0) continue;
        if (!seen.has(`${s}:${n}`)) { seen.add(`${s}:${n}`); out.push({ s, n, at: x.at }); }
        break;
      }
      return out;
    };
    let n = 0;
    for (const it of radioSongs('classic', 'synthwave', 'cap-voices', 2)) {
      const B = liveBuildOf(it.song, it.C), needs = spokenNeeds(B, it.C, 'en', {}), files = {};
      // every line in the default voice; every other line in its speaker's bank too
      const add = (bank, text) => { const l = (files[bank] = files[bank] || []), f = `${bank}/${saySlug(text)}.wav`; if (!l.includes(f)) l.push(f); };
      needs.forEach((x, i) => { add(sayBank('en'), x.text); if (i % 2) add(x.bank, x.text); });
      const a = voicesAt(B, it.C, 'en', files), b = before(B, it.C, 'en', files);
      assert(a.length && JSON.stringify(a) === JSON.stringify(b), `${it.song.title}: voicesAt ${a.length}, voicesOf ${b.length}`);
      assert(a.every((v, i) => !i || a[i - 1].at <= v.at), `${it.song.title}: not in bar order`);
      n += a.length;
    }
    console.log(`      ${n} samples, the same list`);
  },
  async 'voice-track captions (voice-track-tuning D7): a line of several entries plays every entry on its quarter of the bar, and the stage and Coming next show the entry heard, never the entries joined; an entry with no sample is a silent quarter with no caption; the sample the code plays at each voice hap is the caption on the stage (Strudel in Node), also with the first entry only in the default voice'() {
    // the owner's radio: synthwave, Voice track always, many phrases, mixed, every way, quiet, medium and busy parts
    const voice = { presence: 'always', phrases: 'many', kind: 'mixed', ways: ['opening', 'refrain', 'chop', 'passage'], where: ['quiet', 'medium', 'busy'] };
    const rec = { seed: 'own', options: { styles: ['synthwave'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, transition: 'artist', harmony: 'artist', profile: 'classic', voice }, changes: [], growth: GROWTH_ON_AIR };
    const song = sessionItems(RADIO_RECIPES, rec, 1)[0].song, C = { ...resolveProfile('classic'), narrator: false }, B = liveBuildOf(song, C), S = captionSettings({});
    const placed = placeSpoken(B, 'en'), multi = placed.find(p => p.line.parts && p.texts.length >= 3);
    assert(multi, 'the session has no line of three entries or more');
    // a manifest of every text the song speaks, per bank, sorted (the voice helper's files); the voice track reads its
    // samples in spokenContext, as the compiler
    const manifest = drop => { const m = {}; for (const p of placed) for (const x of p.texts) { const f = `${p.bank}/${saySlug(x)}.wav`; if (!drop || !drop(p.bank, x)) (m[p.bank] = m[p.bank] || []).includes(f) || m[p.bank].push(f); } for (const l of Object.values(m)) l.sort(); return m; };
    const saved = spokenContext.files, first = multi.texts[0], second = multi.texts[1];
    const def = 'say_en', other = manifest((b, t) => t === first);
    other[def] = [...(other[def] || []), `${def}/${saySlug(first)}.wav`, `${def}/aa_other.wav`].sort();
    const { hapsAt } = await import('./mixer-checks.mjs');
    const slots = Math.max(4, multi.texts.length);
    let checked = 0;
    try {
      // (with the first entry only in the default voice the line keeps the speaker's bank: its first quarter is silent)
      for (const [name, m, heard] of [['speaker bank', manifest(), multi.texts], ['first entry in the default voice', other, multi.texts.slice(1)], ['second entry missing', manifest((b, t) => t === second), multi.texts.filter(t => t !== second)]]) {
        setSpokenContext({ files: m });
        const sch = spokenSchedule(B, C, 'en', m), caps = captionSchedule(B, C, 'en', m, {});
        const joined = caps.find(y => y.kind === 'voice' && y.text.includes(' · '));
        assert(!joined, `${name}: a caption joins entries: ${joined && joined.text}`);
        const x = sch.find(y => y.voice === 'T' && y.track === multi.track && y.ci === multi.ci);
        assert(JSON.stringify(x.entries.map(e => e.text)) === JSON.stringify(heard) && x.entries.every(e => e.bank === multi.bank) && x.entries.every(e => Math.abs(e.late - x.late - multi.texts.indexOf(e.text) / slots) < 1e-6), `${name}: entries ${JSON.stringify(x.entries)}`);
        for (const [k, text] of multi.texts.entries()) {
          const rows = captionFrame(caps, x.at + x.late + k / slots + 0.01, S).rows.filter(r => r.kind === 'voice');
          if (heard.includes(text)) assert(rows.length === 1 && rows[0].text === text, `${name}, bar ${x.at + 1} quarter ${k + 1}: "${text}" heard, the stage shows ${JSON.stringify(rows.map(r => r.text))}`);
          else assert(!rows.some(r => r.text === text), `${name}: "${text}" has no sample and shows`);
        }
        const row = nextRows(B, sch, x.at - 1, 1)[0];
        assert(row.at === x.at && JSON.stringify(row.voices.filter(v => v.voice === 'T').map(v => v.text)) === JSON.stringify(heard), `${name}: Coming next, bar ${x.at + 1}: ${JSON.stringify(row.voices)}`);
        // by ear: the sample each voice hap plays (bank and number read in the manifest) is the voice caption then, and
        // every entry heard sounds on the line's bar
        const L = liveCode(song, C, { files: () => m, lang: () => 'en' });
        const bars = [...new Set(sch.filter(y => y.voice === 'T' && y.way !== 'chop').map(y => y.at))].slice(0, 12);
        assert(bars.includes(x.at), `${name}: bar ${x.at + 1} not checked`);
        for (const bar of bars) {
          const said = (await hapsAt(L, L.codeAt(bar), bar)).filter(h => /^say_/.test(h.s));
          assert(said.length, `${name}, bar ${bar + 1}: no voice hap`);
          for (const h of said) {
            const file = (m[h.s] || [])[h.note], rows = captionFrame(caps, h.at + 0.01, S).rows.filter(r => r.kind === 'voice');
            assert(file && rows.length === 1 && file.endsWith(`/${saySlug(rows[0].text)}.wav`), `${name}, bar ${bar + 1} at ${h.at.toFixed(2)}: plays ${file}, the stage shows ${JSON.stringify(rows.map(r => r.text))}`);
            checked++;
          }
          if (bar === x.at) { const files = said.filter(h => h.at < bar + 1).map(h => (m[h.s] || [])[h.note]); assert(heard.every(t => files.some(f => f.endsWith(`/${saySlug(t)}.wav`))), `${name}, bar ${bar + 1}: heard ${JSON.stringify(files)}, want every entry of ${JSON.stringify(heard)}`); }
        }
      }
      // no entry with a sample anywhere: nothing sounds on that bar, nothing shows
      const none = manifest((b, t) => multi.texts.includes(t));
      setSpokenContext({ files: none });
      const sch = spokenSchedule(B, C, 'en', none), caps = captionSchedule(B, C, 'en', none, {}), x = sch.find(y => y.voice === 'T' && y.track === multi.track && y.ci === multi.ci);
      assert(!x || (!x.entries.length && !caps.some(y => y.kind === 'voice' && y.at >= x.at && y.at < x.at + 1)), `"${multi.texts.join(' · ')}" has no sample and something shows on bar ${x && x.at + 1}`);
    } finally { setSpokenContext({ files: saved }); }
    console.log(`      ${song.id}: the line "${multi.texts.join(' · ')}" sounds and shows entry by entry; ${checked} voice haps heard as captioned`);
  },
  'format (voice-track-tuning D1, D2, D4): entries written out, chop every, refrain times; the validator; lineOf leaves out the entries another line writes out'() {
    const base = clone(EXAMPLE), sp = base.tracks.find(t => t.type === 'spoken'), ids = base.tracks.map(t => t.id);
    const errs = pat => { const e = [], w = []; checkSpokenPattern(pat, 'p', ids, (p, m) => e.push(`${p}: ${m}`), (p, m) => w.push(`${p}: ${m}`)); return { e, w }; };
    const night = VOCABULARY.night;
    // entries: 2 to 4 objects of one group
    assert(!errs({ way: 'refrain', text: [night[0], night[1]] }).e.length && !errs({ way: 'refrain', text: [night[0], night[1]] }).w.length, 'two entries of one group are valid');
    assert(errs({ way: 'refrain', text: [night[0]] }).e.length && errs({ way: 'refrain', text: night.slice(0, 5) }).e.length && errs({ way: 'refrain', text: [night[0], 'x'] }).e.length, 'one entry, five entries or a string in the list are not errors');
    assert(errs({ way: 'refrain', text: [night[0], VOCABULARY.dark[0]] }).w.length, 'entries of two groups are not warned');
    // every on a chop, times on a refrain
    assert(!errs({ way: 'chop', every: 2 }).w.length && !errs({ way: 'chop', every: 2 }).e.length, 'every on a chop warns');
    assert(errs({ way: 'passage', every: 2 }).w.length && errs({ way: 'chop', times: 2 }).w.length && errs({ way: 'refrain', times: 0 }).e.length && !errs({ way: 'refrain', times: 3 }).e.length, 'times and every checks');
    // a chop with every 2 on a 4-bar clip from bar 33 plays on 33 and 35 (1-based); without every on each bar
    const chopSong = every => { const s = clone(base), t = s.tracks.find(x => x.type === 'spoken'); t.patterns = { C: { way: 'chop', text: night[1], ...(every ? { every } : {}) } }; t.clips = [{ start: 32, bars: 4, pattern: 'C' }]; return s; };
    const bars = s => placeSpoken(s, 'en').filter(p => p.track === sp.id).flatMap(p => p.starts.map(x => x.bar + 1));
    assert(JSON.stringify(bars(chopSong(2))) === '[33,35]' && JSON.stringify(bars(chopSong(0))) === '[33,34,35,36]', `chop bars ${bars(chopSong(2))} / ${bars(chopSong(0))}`);
    // a refrain with times 3 over the whole song keeps 3 starts, the first and the last of those it had
    const refSong = times => { const s = clone(base), t = s.tracks.find(x => x.type === 'spoken'); t.patterns = { R: { way: 'refrain', text: night[2], every: 4, ...(times ? { times } : {}) } }; t.clips = [{ start: 0, bars: s.sections.reduce((a, x) => a + x.bars, 0), pattern: 'R' }]; return s; };
    const all = bars(refSong(0)), three = bars(refSong(3));
    assert(all.length > 3 && three.length === 3 && three[0] === all[0] && three[2] === all[all.length - 1] && three.every(b => all.includes(b)), `refrain times 3: ${three} of ${all}`);
    assert(JSON.stringify(bars(refSong(1))) === JSON.stringify([all[0]]), 'refrain times 1: the first start');
    // a list of entries is its parts, in order, the same in every language
    const listSong = clone(base), lt = listSong.tracks.find(x => x.type === 'spoken');
    lt.patterns = { A: { way: 'passage', text: [night[5], night[10], night[4]] } }; lt.clips = [{ start: 0, bars: 8, pattern: 'A' }];
    const line = lineOf(listSong, lt, 'A', lt.patterns.A);
    assert(JSON.stringify(lineTexts(line, 'en')) === '["after hours","wide awake","awake"]' && JSON.stringify(lineTexts(line, 'it')) === JSON.stringify([night[5].it, night[10].it, night[4].it]), `entries: ${JSON.stringify(lineTexts(line, 'it'))}`);
    // lineOf of a vocab: line leaves out what another line writes out (all but three entries taken: those three)
    const dd = clone(base), dt = dd.tracks.find(x => x.type === 'spoken');
    const keep = night.slice(9).map(e => e.en);
    dt.patterns = { A: { way: 'refrain', text: 'vocab:night' }, B: { way: 'passage', text: night.slice(0, 4) }, C: { way: 'chop', text: night[4] }, D: { way: 'refrain', text: night.slice(5, 9) } };
    for (let k = 0; k < 20; k++) {
      const s = { ...dd, id: `dedup-${k}` }, l = lineOf(s, dt, 'A', dt.patterns.A), t = lineTexts(l, 'en');
      assert(t.every(x => keep.includes(x)), `vocab:night drew ${t} with ${keep} free`);
    }
    // too few free: the whole group
    dt.patterns.D = { way: 'refrain', text: night.slice(5, 11) };
    const s = { ...dd, id: 'dedup-x' }, t = lineTexts(lineOf(s, dt, 'A', dt.patterns.A), 'en');
    assert(t.length >= 2 && t.every(x => night.some(e => e.en === x)), `fallback: ${t}`);
    // code: a line of entries is written n(…).s(bank), every entry on its quarter
    setSpokenContext({ files: null });
    const code = compileSong(listSong);
    assert(/\$: n\("\d+ \d+ \d+ ~"\)\.s\("say_[a-z_]+"\)/.test(code) && !/s\("say_[a-z_]+"\)\.n\("/.test(code), `code: ${code.split('\n').filter(l => /say_/.test(l)).join(' | ')}`);
    console.log(`      chop every 2: bars ${bars(chopSong(2))}; refrain times 3: ${three} of ${all.length} starts`);
  },
  'generation (voice-track-tuning D1 to D4): one chop at most 4 bars heard on at most 2; one refrain heard at most 3 times, 4 bars apart; refrains every 4 or 8; mixed A at most 3 times, spread; vocabulary lines written out, no entry in two lines'() {
    const ALL = ['quiet', 'medium', 'busy'], seen = { chop: 0, refrain: 0, mixed: 0, lists: 0 };
    const songsOf = (voice, seed, n = 8, st = VOICE_STYLES) => { const s = createSession(recipes, seed); return Array.from({ length: n }, () => s.next({ styles: st, voice }).song).filter(x => x.tracks.some(t => t.type === 'spoken')); };
    const keysOf = text => (Array.isArray(text) ? text.map(x => x.en) : text && typeof text === 'object' ? [text.en] : typeof text === 'string' && !text.startsWith('vocab:') ? [text] : []);
    for (const seed of ['gen-a', 'gen-b', 'gen-c']) {
      for (const song of songsOf({ phrases: '1', ways: ['chop'], presence: 'always' }, seed)) {
        const p = placeSpoken(song, 'en'), sp = spokenOf(song);
        assert(sp.clips.length === 1 && sp.clips[0].bars <= 4 && sp.patterns.A.every === 2, `${song.id}: chop clip ${JSON.stringify(sp.clips)} every ${sp.patterns.A.every}`);
        assert(p.every(x => x.starts.length <= 2), `${song.id}: chop heard on ${p.map(x => x.starts.length)} bars`);
        assert(CHOP_RHYTHMS.includes(sp.patterns.A.rhythm) && sp.patterns.A.rhythm.split(' ').filter(x => x !== '~').length === 3, `${song.id}: chop rhythm ${sp.patterns.A.rhythm}`);
        seen.chop++;
      }
      for (const song of songsOf({ phrases: '1', ways: ['refrain'], presence: 'always' }, seed)) {
        const p = placeSpoken(song, 'en'), sp = spokenOf(song), bars = p.flatMap(x => x.starts.map(s => s.bar)).sort((a, b) => a - b);
        assert(sp.patterns.A.times === 3 && [4, 8].includes(sp.patterns.A.every), `${song.id}: refrain ${JSON.stringify(sp.patterns.A)}`);
        assert(bars.length <= 3 && bars.every((b, i) => !i || b - bars[i - 1] >= 4), `${song.id}: refrain heard on bars ${bars}`);
        seen.refrain++;
      }
      for (const song of songsOf({ phrases: 'many', kind: 'mixed', presence: 'always', where: ALL }, seed)) {
        const sp = spokenOf(song), clips = [...sp.clips].sort((a, b) => a.start - b.start), keys = clips.map(c => c.pattern);
        const n = keys.length, a = keys.map((k, i) => (k === 'A' ? i : -1)).filter(i => i >= 0);
        assert(a[0] === 0 && a.length <= 3 && a.every((i, j) => !j || i - a[j - 1] >= 2), `${song.id}: A in phrases ${a.map(i => i + 1)} of ${n}`);
        assert(new Set(keys.filter(k => k !== 'A')).size === keys.filter(k => k !== 'A').length, `${song.id}: a new line repeats: ${keys}`);
        // no entry or line in two patterns
        const all = Object.values(sp.patterns).flatMap(p => keysOf(p.text));
        assert(new Set(all).size === all.length, `${song.id}: an entry in two lines: ${all}`);
        for (const p of Object.values(sp.patterns)) {
          if (p.way === 'refrain') assert([4, 8].includes(p.every), `${song.id}: refrain every ${p.every}`);
          if (Array.isArray(p.text)) { seen.lists++; assert(p.way !== 'chop' && p.text.length >= 2 && p.text.length <= 4, `${song.id}: list ${JSON.stringify(p)}`); }
          assert(!(typeof p.text === 'string' && p.text.startsWith('vocab:')), `${song.id}: a vocab: line left for the compiler`);
        }
        seen.mixed++;
      }
    }
    // the mixed slots: 12 phrases give A on 1, 5, 9; 3 phrases A, B, A
    assert(JSON.stringify([...mixedSlots(12)]) === '[0,4,8]' && JSON.stringify([...mixedSlots(3)]) === '[0,2]' && JSON.stringify([...mixedSlots(2)]) === '[0]' && JSON.stringify([...mixedSlots(6)]) === '[0,2,4]', 'mixed slots');
    // written out: the same entries in Italian
    const song = songsOf({ phrases: '1', ways: ['refrain'], presence: 'always', vocab: 'night' }, 'gen-it', 4)[0], sp = spokenOf(song);
    assert(Array.isArray(sp.patterns.A.text), `refrain with the night vocabulary: ${JSON.stringify(sp.patterns.A.text)}`);
    const it = placeSpoken(song, 'it').find(p => p.track === sp.id), en = placeSpoken(song, 'en').find(p => p.track === sp.id);
    assert(JSON.stringify(it.texts) === JSON.stringify(sp.patterns.A.text.map(x => x.it)) && JSON.stringify(en.texts) === JSON.stringify(sp.patterns.A.text.map(x => x.en)), `languages: ${it.texts} / ${en.texts}`);
    assert(seen.chop >= 10 && seen.refrain >= 10 && seen.mixed >= 10 && seen.lists > 0, `too few songs: ${JSON.stringify(seen)}`);
    console.log(`      ${seen.chop} chops, ${seen.refrain} refrains, ${seen.mixed} mixed songs (${seen.lists} lists of entries)`);
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
  'voice combos (D3): over 300 songs a limited speaker never gets another character; an all-allowed file gives the same songs'() {
    const T = { format: 1, en: { albert: ['clear', 'deep'] } };
    const lim = withCombos(T, () => comboSongs()), free = withCombos({}, () => comboSongs());
    const albert = lim.entries.filter(e => e.voice.speaker === 'albert');
    assert(albert.length >= 10, `few albert narrators: ${albert.length}`);
    assert(albert.every(e => e.voice.character === null || e.voice.character === 'deep'), `albert characters: ${[...new Set(albert.map(e => e.voice.character))]}`);
    assert(free.entries.some(e => e.voice.speaker === 'albert' && e.voice.character && e.voice.character !== 'deep'), 'the free draw never gives albert another character (the test proves nothing)');
    const narr = lim.songs.map(s => s.tracks.find(t => t.type === 'voice')).filter(t => t && t.settings.speaker === 'albert');
    assert(narr.every(t => charsOf(t.settings).every(c => c === 'deep')), 'an albert narrator track sounds like another character');
    // the shipped file (every style listed) draws the songs of no file, byte for byte; a narrowed file moves no music
    assert(JSON.stringify(comboSongs().songs) === JSON.stringify(free.songs), 'the all-allowed file changes the songs');
    const strip = s => JSON.stringify({ ...s, tracks: s.tracks.filter(t => t.type !== 'voice' && t.type !== 'spoken') });
    assert(lim.songs.length === free.songs.length && lim.songs.every((s, i) => strip(s) === strip(free.songs[i])), 'a narrowed file moved the music');
    console.log(`      ${lim.songs.length} songs, ${albert.length} with albert narrating`);
  },
  'voice combos (D3 point 2): the voice instrument draws only allowed characters, on a chop and on the other ways; none allowed: the plain voice'() {
    const all = list => ({ format: 1, en: Object.fromEntries(['default', ...SPEAKERS].map(s => [s, list])), it: { default: list } });
    const opts = { voice: { presence: 'always' } };
    const tracks = songs => songs.flatMap(s => s.tracks.filter(t => t.type === 'spoken'));
    const echo = tracks(withCombos(all(['clear', 'echo']), () => comboSongs(opts, 120)).songs), free = tracks(comboSongs(opts, 120).songs);
    const ways = new Set(echo.map(t => t.patterns.A.way));
    assert(ways.has('chop') && ways.size > 1, `ways: ${[...ways]}`);
    for (const way of ways) {
      const of = echo.filter(t => t.patterns.A.way === way);
      assert(of.every(t => charsOf(t.settings).every(c => c === 'echo')), `${way}: another character than echo`);
      assert(of.some(t => hasChar(t.settings, 'echo')), `${way}: never echo`);
    }
    assert(free.some(t => charsOf(t.settings).some(c => c !== 'echo')), 'the free draw has no other character (the test proves nothing)');
    const none = tracks(withCombos(all(['clear']), () => comboSongs(opts, 120)).songs);
    assert(none.length && none.every(t => !charsOf(t.settings).length && t.settings.pitch === 1 && t.settings.drive === 0 && t.settings.delay === 0), 'a character with nothing allowed');
  },
  'voice combos (D5): a chosen narrator style redraws a speaker that does not allow it, only then; the style stays'() {
    const only = { format: 1, en: { default: ['clear'], albert: ['clear'], fred: ['clear'], junior: ['clear'], kathy: ['clear', 'robot'] }, it: { default: ['clear', 'robot'] } };
    const narrators = songs => songs.map(s => s.tracks.find(t => t.type === 'voice').settings);
    const opts = { styles: ['dark-cyberpunk'], seed: 'combos-n', minutes: 60, narratorSound: { style: 'robot' } };
    const free = narrators(generateSession(recipes, opts).songs), lim = narrators(withCombos(only, () => generateSession(recipes, opts).songs));
    assert(lim.every(s => s.speaker === 'kathy' && hasChar(s, 'robot')), `speakers: ${[...new Set(lim.map(s => s.speaker))]}`);
    assert(free.some(s => s.speaker !== 'kathy'), 'every drawn speaker was kathy (the test proves nothing)');
    // no speaker allows it: as drawn; a fixed speaker or "auto": as drawn; every pair allowed: as drawn
    const nobody = narrators(withCombos({ format: 1, en: { default: ['clear'], albert: ['clear'], fred: ['clear'], junior: ['clear'], kathy: ['clear'] } }, () => generateSession(recipes, opts).songs));
    assert(JSON.stringify(nobody) === JSON.stringify(free), 'no speaker allows the style: the speaker moved');
    const fixed = { ...opts, narratorSound: { style: 'robot', speaker: 'fred' } };
    assert(withCombos(only, () => generateSession(recipes, fixed).songs).every(s => s.tracks.find(t => t.type === 'voice').settings.speaker === 'fred'), 'a fixed speaker moved');
    // (the voice instrument's speaker is never the narrator's, so it may follow the redrawn one: voice parts only)
    const music = s => JSON.stringify({ ...s, tracks: s.tracks.filter(t => t.type !== 'voice' && t.type !== 'spoken') });
    assert(withCombos(only, () => generateSession(recipes, opts).songs).map(music).join() === generateSession(recipes, opts).songs.map(music).join(), 'the redraw moved the music');
  },
  'voice combos (2.4): Crescendo and Live coder radio songs grown on air add no draw of their own'() {
    const T = { format: 1, en: Object.fromEntries(['default', ...SPEAKERS].map(s => [s, VOICE_STYLE_IDS.filter(x => x !== 'robot' && x !== 'dirty')])) };
    // (voice-combos-ui D5: a radio session draws with the table its recipe recorded, never the module's)
    const grown = (profile, combos = null) => COMBO_STYLES.flatMap(style => [0, 1].flatMap(i => {
      const rec = { seed: `combos-${profile}-${i}`, options: { styles: [style], chaos: 0.8, energy: 0.6, complexity: 0.5, talk: 0.5, transition: 'artist', harmony: 'artist', profile, voice: { presence: 'always' } }, changes: [], growth: GROWTH_ON_AIR, ...(combos ? { combos } : {}) };
      return sessionItems(RADIO_RECIPES, rec, 3).map(it => it.song);
    }));
    let n = 0, freeHit = 0;
    for (const profile of ['crescendo', 'switch']) {
      const lim = voiceTracks(grown(profile, T)), free = voiceTracks(grown(profile));
      n += lim.length; freeHit += free.filter(t => hasChar(t.settings, 'robot') || hasChar(t.settings, 'dirty')).length;
      assert(lim.length && lim.every(t => !hasChar(t.settings, 'robot') && !hasChar(t.settings, 'dirty')), `${profile}: a robot or dirty voice with them not allowed`);
    }
    assert(freeHit > 0, 'no robot or dirty voice without the file (the test proves nothing)');
    console.log(`      ${n} voice tracks in grown songs, ${freeHit} robot or dirty without the file`);
  },
  'voice combos UI (3.1): opts.combos bounds the narrator and the voice instrument over 300 songs; the committed table given draws the songs of none'() {
    const T = { format: 1, en: { fred: ['clear', 'deep'] } };
    const lim = comboSongs({ combos: T, voice: { presence: 'always' } }), free = comboSongs({ voice: { presence: 'always' } });
    const fred = lim.entries.filter(e => e.voice.speaker === 'fred');
    assert(fred.length >= 10 && fred.every(e => e.voice.character === null || e.voice.character === 'deep'), `fred narrators: ${fred.length}, ${[...new Set(fred.map(e => e.voice.character))]}`);
    const spoken = voiceTracks(lim.songs).filter(t => t.settings.speaker === 'fred');
    assert(spoken.length && spoken.every(t => charsOf(t.settings).every(c => c === 'deep')), 'a Fred voice track with another character');
    assert(voiceTracks(free.songs).some(t => t.settings.speaker === 'fred' && charsOf(t.settings).some(c => c !== 'deep')), 'the free draw never gives Fred another character (the test proves nothing)');
    // (the module table narrowed does not reach a draw given the committed table: the browser's overrides stay out)
    assert(JSON.stringify(withCombos({ format: 1, en: { fred: ['clear'] } }, () => comboSongs({ combos: COMBOS_FILE }, 60).songs)) === JSON.stringify(comboSongs({}, 60).songs), 'opts.combos with the committed table moved the songs');
    console.log(`      ${lim.songs.length} songs, ${fred.length} with Fred narrating, ${spoken.length} Fred voice tracks`);
  },
  'voice combos UI (3.2): a radio recipe draws with its recorded table; none recorded: the committed table, whatever the module table'() {
    const only = { format: 1, en: { fred: ['clear'] } }, base = { options: { styles: COMBO_STYLES, chaos: 0.8, energy: 0.6, complexity: 0.5, talk: 0.5, transition: 'artist', harmony: 'artist', profile: 'classic', voice: { presence: 'always' } }, changes: [], growth: GROWTH_ON_AIR };
    const songs = (rec, n = 6) => sessionItems(RADIO_RECIPES, rec, n).map(it => it.song);
    let fredFree = 0, fredLim = 0;
    for (let i = 0; i < 12; i++) {
      const rec = { ...base, seed: `combos-ui-${i}` }, recorded = { ...rec, combos: effectiveCombos(COMBOS_FILE, only) };
      const a = JSON.stringify(songs(recorded)), b = JSON.stringify(withCombos({}, () => songs(recorded))), c = JSON.stringify(withCombos(only, () => songs(rec)));
      // Replay after the user changes the overrides: the same songs
      assert(a === b, `${rec.seed}: a recorded session moved with the module table`);
      // a session recorded before (or without overrides): the committed table, not the module's
      assert(c === JSON.stringify(songs(rec)), `${rec.seed}: a session without a table followed the module table`);
      const fred = voiceTracks(songs(recorded)).filter(t => t.settings.speaker === 'fred');
      fredLim += fred.length;
      assert(fred.every(t => !charsOf(t.settings).length), `${rec.seed}: Fred with a character in a session limited to clear`);
      fredFree += voiceTracks(songs(rec)).filter(t => t.settings.speaker === 'fred' && charsOf(t.settings).length).length;
    }
    assert(fredLim > 0 && fredFree > 0, `the test proves nothing: ${fredLim} Fred tracks limited, ${fredFree} with a character free`);
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
      const base = [{ at: 4, voice: 'T', text: 'the towers', bank: 'say_en_fred' }, { at: 4, voice: 'N', text: 'more bass', bank: 'say_en' }];
      const sch = [...base, { at: 4, voice: 'X', text: 'la la', bank: 'say_en_kathy' }];
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
