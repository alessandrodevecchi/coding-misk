// Checks for the voice instrument (voice-instrument, #39): spoken tracks and their lines, the four ways to speak, the
// narrator that yields, the poetic narrator, texts and speakers, the growth and the director. No browser.
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
import { generateSession } from '../src/endless/director.js';
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
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
