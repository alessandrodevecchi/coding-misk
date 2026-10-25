// Checks for the voice instrument (voice-instrument, #39): spoken tracks and their lines, the four ways to speak, the
// narrator that yields, the poetic narrator, texts and speakers, the growth and the director; the voice controls
// (voice-controls, #77): the default unchanged, phrases per song as a ceiling, different and repeated lines, one phrase
// per part, ways, presence, presets, the narrator style control. No browser.
//   npm run check:spoken      exit 1 when any check fails
import fs from 'node:fs';
import { songFiles } from './songs-dir.mjs';
import { loadStyles } from './styles-dir.mjs';
import { validateSong } from '../src/song/validate.js';
import { compileSong } from '../src/song/compile.js';
import { normalizeSong } from '../src/song/format.js';
import { buildSteps, stateAt, deriveBuild, voiceCode, SPEAKERS, saySlug } from '../src/song/build.js';
import { placeSpoken, spokenBars, setSpokenContext, spokenContext, speakerOf, narratorSpeaker, lineOf, enteringTrack, WAYS } from '../src/song/spoken.js';
import { VOCABULARY, VOCAB_GROUPS, POETIC } from '../src/song/vocabulary.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { shapeFacts, canPlay, resolveShape } from '../src/song/shapes.js';
import { generateSession, createSession } from '../src/endless/director.js';
import { VOICE_PRESETS, VOICE_PHRASES, PHRASE_RANGES, applyPreset, presetOf, cleanVoice, isDefaultVoice } from '../src/endless/voice-options.js';
import { voiceEvent } from '../src/endless/voice-panel.js';
import { withNarratorStyle, lineTexts } from '../src/song/spoken.js';
import { energyOf } from '../src/endless/energy.js';
import { meterSteps } from '../src/music.js';

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
  'director: styles without a weight never get a voice instrument; weighted ones sometimes, the same for the same seed; it adds no energy'() {
    const plain = generateSession(recipes, { styles: ['berlin-techno', 'synthwave'], seed: 'senza', minutes: 30 }).songs;
    assert(plain.every(s => !s.tracks.some(t => t.type === 'spoken') && !s.narrator), 'a voice instrument without a weight');
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
    const known = new Set(recipes.flatMap(r => (r.spoken && r.spoken.speakers) || []));
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
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
