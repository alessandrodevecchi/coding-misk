// Checks for the Decode tab (track-to-code), no browser: misk-analyzer on generated audio with a known truth (onsets of a
// click track, tempo at 90, 124 and 174 BPM, chords, key, grids, bass), the file name fallback, the fingerprint, the
// store's cap, version and backup records, the writer (header, Attribution, `// vox: …`, sound presets, parts from
// levels, the hysteresis of a fill, drums muted when they stop), the mix rules of the slider and the mutes, the look
// ahead horizons, tap tempo, and the code a decoded song shows at a bar with each look ahead.
//   npm run check:decode            (about 20 s)
//   npm run check:decode -- --app   also measures the app's own test songs exported to WAV (tools/decode-export.cjs),
//                                   level A and level B
// Level B (groups 6 and 7): a generated track with known sections, with Essentia.js, misk-analyzer alone and Essentia.js
// failing (bounds within one bar, kinds, ending, tempo, chords, key, engines), the same bar fields as level A, level A
// never importing Essentia.js, the level B writer (sections, loops, sounds by measure, Simple kit, parts where heard,
// variations and a one-off fill, chords out of the key), the tempo pick, Open in Compose's configuration and the same
// code at every step in Decode and in Compose with "Follow the song".
import { createAnalyzer, horizonOf, tapTempo, LOOK_AHEAD, LOOK_AHEAD_DEFAULT, quietBefore } from '../src/decode/misk-analyzer.js';
import { writeSong, momentSong, partsByBar, soundsOf, loopAt, stepsMini, withVox, withoutVox, voxGroup, voxOf, topPlan, planA, differsEnough, steady, EDIT_RULE, TOP_HELPERS, VOX_PRELUDE, formatKey } from '../src/decode/writer.js';
import { defaultMix, mixApply, gainsOf, heard, loudnessTrim } from '../src/decode/mix.js';
import { titleFromName, fingerprint, sameFile } from '../src/decode/input.js';
import { overCap, mergeDecodes, plainRecord, freshModel, DECODE_CAP } from '../src/decode/store.js';
import { ANALYSIS_VERSION, emptyModel, currentModel } from '../src/decode/model.js';
import { cycleOfFile, fileOfCycle, decodeMeta, audioTimeOfCycle } from '../src/decode/sync.js';
import { validateSong } from '../src/song/validate.js';
import { compileSong } from '../src/song/compile.js';
import { liveCode } from '../src/live/live-code.js';
import { resolveProfile } from '../src/live/profiles.js';
import { renderSong, clicks, RATE } from './decode-audio.mjs';
import { measureApp, measureSynth, measureFull, measureTimelines } from './decode-measure.mjs';
import { analyseFull, pickTempo, barChords, settleMode, steadyQualities, bassRange, quietMinors, snapToKey, takeChord } from '../src/decode/full.js';
import { writeFull, inKey, leadCode } from '../src/decode/writer.js';
import { composeConfig, decodeControls } from '../src/decode/tab.js';
import { followSong, crescendoSong } from '../src/song/crescendo.js';
import { growthRules } from '../src/live/profiles.js';
import { buildSteps } from '../src/song/build.js';
import { nodeEssentia } from './essentia-node.mjs';
import { exportMix, mixForParts, origSpan, wholeJob, fragmentJob } from '../src/decode/export.js';
import { timelineOf } from '../src/export/fast.js';
import { textsFor, rightsLine } from '../src/video/texts.js';
import { shapeOf, barScores, pickFragments } from '../src/video/fragments.js';
import { absoluteClips } from '../src/endless/transitions.js';
import { liveCodes, fullCodes, editStats } from './decode-edits.mjs';
import { strudelInNode } from './mixer-checks.mjs';
import { HELPERS as HELPERS_APP } from '../src/song/writer.js';
import fs from 'node:fs';

let failed = 0, passed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (ok) passed++; else failed++; };
const E = '................';
const SPEC = { bars: 40, lead: 0.3, chords: ['Am', 'F', 'C', 'G'], drums: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' }, bass: 'x..x..x...x.x...', drumsOff: [[32, 40]] };

// ---------- 2.2 onsets ----------
{
  const times = Array.from({ length: 40 }, (_, i) => 0.5 + i * 0.37 + (i % 3) * 0.013);
  const on = createAnalyzer(clicks(times, 16)).onsets().hat;
  const err = times.map(t => Math.min(...on.map(o => Math.abs(o.t - t))));
  check(on.length === times.length && Math.max(...err) < 0.01, 'click track: every click found, onset times within 10 ms', `${on.length}/${times.length}, max ${(Math.max(...err) * 1000).toFixed(1)} ms`);
}
// ---------- 2.3, 2.4 tempo, downbeat, chords, key, grids, bass on generated tracks ----------
const synth = measureSynth();
for (const [id, r] of Object.entries(synth)) {
  check(Math.abs(r.bpm - r.bpmTruth) <= 0.1, `${id}: tempo locks on the true tempo`, `${r.bpm}`);
  check(Math.abs(r.downbeat - 0.3) < 0.02, `${id}: the first downbeat within 20 ms`, `${r.downbeat} s`);
  check(r.keyOk, `${id}: key A minor`, r.key ? `${r.key.root} ${r.key.mode}` : 'none');
  check(r.chords >= 0.9, `${id}: chords per bar at least 90 %`, `${r.chords}`);
  check(r.f1.bd >= 0.8 && r.f1.cp >= 0.8 && r.f1.hh >= 0.9, `${id}: drum grids F1 (kick 0.8, clap 0.8, hat 0.9)`, JSON.stringify(r.f1));
  check(r.drumsPresence >= 0.9, `${id}: drums heard and not heard per bar at least 90 %`, `${r.drumsPresence}`);
  check(r.bass >= 0.4, `${id}: bass notes on their steps at least 40 % (kicks hide some)`, `${r.bass}`);
}
// tempo with no drums: still a tempo, marked uncertain or not, never none
{
  const { pcm } = renderSong({ ...SPEC, bpm: 100, drums: {}, bass: '', bars: 12 });
  const m = createAnalyzer(pcm).model(pcm.length / RATE);
  check(m.bpm > 0 && m.bars.length > 0, 'no drums: the tempo still locks', `${m.bpm} BPM, uncertain ${m.uncertain}`);
}
// level A reads only the audio up to t: the model up to a time never holds a bar past it
{
  const { pcm } = renderSong({ ...SPEC, bpm: 124 });
  const A = createAnalyzer(pcm), m = A.model(20);
  check(m.bars.length === Math.floor((20 - m.downbeat) / m.barSeconds) && m.analysedTo === 20, 'model up to t: only bars complete before t', `${m.bars.length} bars to 20 s`);
  const full = createAnalyzer(pcm).model(pcm.length / RATE);
  check(JSON.stringify(full.bars.slice(0, 8).map(b => b.drums)) === JSON.stringify(m.bars.slice(0, 8).map(b => b.drums)), 'level A and a whole-file run give the same grids for the same bars');
  check(m.version === ANALYSIS_VERSION && currentModel(m) && !currentModel({ ...m, version: ANALYSIS_VERSION - 1 }), 'the model carries ANALYSIS_VERSION; an older one is not current');
}

// ---------- 1.2, 1.3 input and store ----------
{
  const a = titleFromName('Some Band - Night Run.wav'), b = titleFromName('night_run.mp3'), c = titleFromName('A - B - C.flac');
  check(a.title === 'Night Run' && a.artist === 'Some Band', 'file name "Artist - Title": title and artist', JSON.stringify(a));
  check(b.title === 'night run' && b.artist === '', 'file name without " - ": the whole name is the title, no artist', JSON.stringify(b));
  check(c.artist === 'A' && c.title === 'B - C', 'split on the first " - "', JSON.stringify(c));
  const bytes = new Uint8Array(400000); for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7919) % 251;
  const f1 = new File([bytes], 'one.wav'), f2 = new File([bytes], 'renamed.wav'), other = bytes.slice(); other[200000] ^= 1;
  const fpA = await fingerprint(f1, 60000), fpB = await fingerprint(f2, 60000), fpC = await fingerprint(new File([other], 'one.wav'), 60000);
  check(fpA.key === fpB.key, 'fingerprint: a renamed file matches');
  check(fpA.key !== fpC.key && fpA.size === fpC.size, 'fingerprint: a file of the same size and different content does not');
  check(sameFile(fpA, { fp: fpA.key, durationMs: 60050 }) && !sameFile(fpA, { fp: fpA.key, durationMs: 61000 }), 'a match needs the length within 0.1 s');
  const list = Array.from({ length: 2003 }, (_, i) => ({ fp: `k${i}`, used: i }));
  check(overCap(list).join() === 'k0,k1,k2' && DECODE_CAP === 2000, 'store cap 2000: the least recently used go first');
  // decode-library D12: Live-only tracks go before full ones, on index entries
  const ents = Array.from({ length: 2003 }, (_, i) => ({ fp: `e${i}`, used: i, mark: i < 2 ? 'live' : i % 2 ? 'full' : 'live', version: ANALYSIS_VERSION }));
  ents[1].mark = 'full';
  const dropped = overCap(ents);
  check(dropped.join() === 'e0,e2,e4' && overCap(ents.map(e => ({ ...e, mark: 'full' }))).join() === 'e0,e1,e2', 'store cap: Live-only tracks are dropped first, least recently used first; with only full ones the least recently used', dropped.join());
  const rec = plainRecord({ fp: 'x', handle: {}, pcm: [1], buffer: {}, modelA: {} });
  check(!('handle' in rec) && !('pcm' in rec) && !('buffer' in rec) && 'modelA' in rec, 'a stored or backed up record holds no handle and no audio');
  check(mergeDecodes([{ fp: 'a', used: 2, title: 'x' }], [{ fp: 'a', used: 1, title: 'y' }])[0].title === 'x', 'backup merge: the record used last wins');
  check(freshModel({ version: ANALYSIS_VERSION }) && !freshModel({ version: ANALYSIS_VERSION + 1 }), 'a stored model of another analysis version is analysed again');
}

// ---------- 3.1 to 3.3 the writer ----------
const { pcm: P124 } = renderSong({ ...SPEC, bpm: 124 });
const M = createAnalyzer(P124).model(P124.length / RATE);
{
  const s = writeSong(M, { id: 'night-run', title: 'Night Run', artist: 'Some Band' });
  const v = validateSong(s);
  check(!v.errors.length, 'the written song is a valid v2 song', JSON.stringify(v.errors.slice(0, 2)));
  const code = compileSong(s);
  check(code.split('\n')[0] === '// coding-misk · cover of "Night Run" by Some Band', 'Attribution on: the title line names the cover', code.split('\n')[0]);
  check(compileSong({ ...s, cover: { ...s.cover, attribution: false } }).split('\n')[0] === '// coding-misk · Night Run', 'Attribution off: the title only');
  check(compileSong({ ...s, cover: { title: 'Night Run', attribution: true } }).split('\n')[0] === '// coding-misk · cover of "Night Run"', 'no artist: no "by"');
  const dr = s.tracks.find(t => t.id === 'drums');
  check(dr && !dr.clips.some(c => c.start < 40 && c.start + c.bars > 32), 'parts from levels: no drum clip while the drums stop (bars 33 to 40)', JSON.stringify(dr && dr.clips));
  check(s.tracks.some(t => t.id === 'bass') && s.tracks.some(t => t.id === 'chords'), 'bass and chords are code tracks');
  check(formatKey({ root: 9, mode: 'minor' }) === 'A' && formatKey({ root: 0, mode: 'major' }) === 'A' && formatKey({ root: 2, mode: 'minor' }) === 'D', 'section key: the nearest of the eight format keys (a major key by its relative minor)');
  check(validateSong({ ...s, cover: { title: '' } }).errors.some(e => e.path === 'cover.title') && validateSong({ ...s, cover: { title: 'x', attribution: 'yes' } }).errors.some(e => e.path === 'cover.attribution'), 'the validator checks the cover field');
  // a part never heard is not written
  const drumsOnly = writeSong({ ...M, bars: M.bars.map(b => ({ ...b, chord: null, bass: Array(16).fill(null) })) }, { title: 'x' });
  check(drumsOnly.tracks.map(t => t.id).join() === 'drums', 'a part never heard is not written', drumsOnly.tracks.map(t => t.id).join());
}
{
  // the hysteresis (D9): a one-bar fill never changes the drums; a new grid is written after it held a bar
  const g = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.', oh: E }, fill = { ...g, cp: '....x.......xxxx' }, other = { bd: 'x.x...x.x.x...x.', cp: E, hh: 'xxxxxxxxxxxxxxxx', oh: E };
  const bar = d => ({ drums: d, bass: Array(16).fill(null), chord: null, chordConf: 0, level: { drums: 1, bass: 0, chords: 0, other: 0 } });
  const P = partsByBar({ bars: [bar(g), bar(g), bar(g), bar(fill), bar(g), bar(other), bar(other), bar(other)] });
  check(P.drums.slice(0, 5).every(x => x.cp === g.cp), 'a one-bar fill: the drum lines do not change');
  check(P.drums[5].hh === g.hh && P.drums[6].hh === other.hh, 'a new groove is written once it held for a bar');
  const small = { ...g, hh: '..x...x...x...xx' }, Q = partsByBar({ bars: [bar(g), bar(small), bar(small), bar(small)] });
  check(Q.drums[2].hh === g.hh && Q.drums[3].hh === small.hh, 'a change of one or two steps must hold two bars');
  check(stepsMini([33, null, null, 33, null, null, 33, null, null, null, 33, null, 33, null, null, null]) === 'a1 ~!2 a1 ~!2 a1 ~!3 a1 ~ a1 ~!3' && stepsMini([33, null, null, null, 33, null, null, null, 33, null, null, null, 33, null, null, null]) === 'a1!4', 'bass steps in short mini-notation');
  const ch = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'];
  check(JSON.stringify(loopAt(ch, 7)) === '["Am","F","C","G"]' && JSON.stringify(loopAt(ch, 5, { grow: true })) === '["Am","F","C","G"]', 'a chord loop aligned to the bar number (element bar mod L)');
}
{
  // sound presets (D10): measures change "Our sounds", never "Simple kit"
  const dark = M.bars.map(b => ({ ...b, bright: 0.1, low: 0.7 })), bright = M.bars.map(b => ({ ...b, bright: 0.7, low: 0.2 }));
  const a = soundsOf(dark, 'ours'), b = soundsOf(bright, 'ours');
  check(a.kit !== b.kit && a.bass !== b.bass && a.chords !== b.chords, 'Our sounds: a dark heavy model and a bright one get different sounds', `${a.kit}/${b.kit}`);
  check(JSON.stringify(soundsOf(dark, 'simple')) === JSON.stringify(soundsOf(bright, 'simple')), 'Simple kit: the same sounds for both');
}
// ---------- 5.1, 5.2 level A: the code of the moment, drums muted when they stop ----------
{
  const C = resolveProfile('switch', { narrator: false });
  const codeAt = bar => withVox(liveCode({ ...momentSong(M, bar, { title: 'Night Run', artist: 'Some Band' }), build: [], crescendo: { growth: 0 } }, C, {}).codeAt(0), bar >= 0 ? voxGroup(M, bar, { seed: 'night', level: 'A' }) : '');
  const c8 = codeAt(8), c33 = codeAt(32), back = codeAt(39);
  check(/^\$: s\("bd\*4"\)/m.test(c8) && /note\(/.test(c8) && /chord\(/.test(c8), 'bar 9: drums, bass and chords lines', c8.split('\n').filter(l => /\$:/.test(l)).length + ' lines');
  check(c33.split('\n').filter(l => /bank\(/.test(l)).every(l => l.startsWith('_$:')) && /^\$: \(note/m.test(c33), 'bar 33: the drums stop, their lines muted with _$:, the bass plays on');
  check(!/vox|melody/.test(c8) && !/\/\/ vox: …/.test(c8), 'a track without a top line (drums, bass and a pad) has no top line group and no old vocals comment', c8.split('\n').slice(-2).join(' / '));
  check(c8.split('\n')[0] === '// coding-misk · cover of "Night Run" by Some Band', 'the decoded code starts with the cover line');
  const empty = codeAt(-1);
  check(/\$: silence/.test(empty), 'before the first bar: silence');
  // the bar the drums' mute lands on, with each look ahead: the code typed for bar b uses the bars the model knows
  const lands = look => {
    // the playhead enters each bar; the model knows the bars complete before the horizon; the next change goes to the
    // earliest bar after the playing one whose code differs (tab.js next)
    const barSec = M.barSeconds; let shown = codeAt(30);
    for (let now = 30; now < 40; now++) {
      const known = Math.floor((horizonOf(M.downbeat + now * barSec + 0.01, look, barSec) - M.downbeat) / barSec + 1e-6) - 1;
      for (let b = now + 1; b <= Math.max(now + 1, known); b++) {
        const c = codeAt(Math.min(b, known));
        if (c !== shown) { if (/^_\$: s\("bd/m.test(c)) return b; shown = c; break; }
      }
    }
    return null;
  };
  // bars counted from 1 as the spec counts them: the drums stop at bar 33 (index 32)
  check(lands('2bars') === 32, 'look ahead 2 bars: the drums mute on bar 33', `bar ${lands('2bars') + 1}`);
  check([33, 34].includes(lands('off')), 'look ahead off: the drums mute on bar 34 or 35', `bar ${lands('off') + 1}`);
  check(lands('4bars') === 32, 'look ahead 4 bars: the drums mute on bar 33', `bar ${lands('4bars') + 1}`);
}
// ---------- 4.2, 4.3 the mix rules (D11) ----------
{
  const s0 = defaultMix(['code']);
  check(s0.slider === 0 && heard(s0, 'orig') && !heard(s0, 'code') && s0.tracks[1].by === 'slider', 'default: slider on Original, the code muted by the slider');
  const s1 = mixApply(s0, { type: 'mute', id: 'code' });
  check(s1.slider === 0.5 && heard(s1, 'orig') && heard(s1, 'code'), 'unmute the code from the default: the slider moves to the middle, both heard');
  const B = defaultMix(['drums', 'bass', 'chords']);
  let s = mixApply(mixApply(B, { type: 'slider', value: 0.5 }), { type: 'mute', id: 'chords' });
  s = mixApply(mixApply(s, { type: 'slider', value: 0 }), { type: 'slider', value: 0.5 });
  check(heard(s, 'drums') && heard(s, 'bass') && !heard(s, 'chords'), 'user mute kept: Chords muted by the user stays muted after the slider goes to Original and back');
  const so = mixApply(mixApply(B, { type: 'slider', value: 0.5 }), { type: 'solo', id: 'orig' });
  check(so.slider === 0 && heard(so, 'orig') && !heard(so, 'bass'), 'solo the original: the slider moves to Original');
  const sc = mixApply(defaultMix(['drums', 'bass']), { type: 'solo', id: 'bass' });
  check(sc.slider === 1 && heard(sc, 'bass') && !heard(sc, 'orig') && !heard(sc, 'drums'), 'solo a code track: the slider moves to Code, only it is heard');
  const mo = mixApply(mixApply(B, { type: 'slider', value: 0.5 }), { type: 'mute', id: 'orig' });
  check(mo.slider === 1, 'mute the original: the slider moves to Code');
  let ma = mixApply(B, { type: 'slider', value: 0.5 }); for (const id of ['drums', 'bass', 'chords']) ma = mixApply(ma, { type: 'mute', id });
  check(ma.slider === 0, 'mute every code track: the slider moves to Original');
  const atCode = mixApply(B, { type: 'slider', value: 1 }), back = mixApply(atCode, { type: 'mute', id: 'orig' });
  check(atCode.tracks[0].by === 'slider' && back.slider === 0.5 && heard(back, 'orig'), 'unmute the original with the slider on Code: the slider moves to the middle');
  const g = gainsOf(mixApply(defaultMix(['code']), { type: 'slider', value: 0.5 }));
  check(Math.abs(g.orig - Math.SQRT1_2) < 1e-6 && Math.abs(g.code - Math.SQRT1_2) < 1e-6, 'equal power in the middle (both at -3 dB)');
  check(JSON.stringify(mixApply(s0, { type: 'mute', id: 'code' })) !== JSON.stringify(s0) && !('code' in s0), 'mute and solo change the mix state only (the code text is written from the model alone)');
  const loud = new Float32Array(RATE * 4).map((_, i) => 0.5 * Math.sin(i / 7)), trim = loudnessTrim(loud, RATE);
  check(trim > 0.1 && trim < 1, 'loudness trim: a loud original is turned down', `${trim}`);
}
// ---------- 4.1 the clock (D12), look ahead, tap ----------
{
  const m = { downbeat: 0.3, barSeconds: 240 / 124 };
  check(Math.abs(fileOfCycle(m, cycleOfFile(m, 61.2)) - 61.2) < 1e-9 && Math.abs(cycleOfFile(m, 0.3)) < 1e-12, 'file time and cycle: cycle 0 on the first downbeat');
  const s = { cps: 124 / 240, num_cycles_at_cps_change: 3, seconds_at_cps_change: 10, latency: 0.1 };
  check(Math.abs(audioTimeOfCycle(s, 5) - (10 + 0.1 + 2 / s.cps)) < 1e-9, 'the audio time of a cycle from the scheduler\'s anchor and latency');
  const meta = decodeMeta({ ...m, duration: 120, bpm: 124 });
  check(meta.bars === Math.ceil((120 - 0.3) / m.barSeconds) && meta.sectionAt(-0.5) === 0 && meta.bpm[0] === 124, 'the player meta of a decoded track');
  check(LOOK_AHEAD.join() === 'off,2s,4s,2bars,4bars' && LOOK_AHEAD_DEFAULT === '2bars', 'look ahead values and default');
  check(horizonOf(10, 'off', 2) === 10 && horizonOf(10, '2s', 2) === 12 && horizonOf(10, '4bars', 1.5) === 16 && horizonOf(10, 'nonsense', 2) === 14, 'the horizon: playhead plus the look ahead');
  const taps = [1.0, 1.5, 2.0, 2.5, 3.0], r = tapTempo(taps);
  check(r && r.bpm === 120 && Math.abs(r.downbeat - 1.0) < 1e-9, 'four taps or more: tempo from the median interval, the first tap a downbeat', JSON.stringify(r));
  check(tapTempo([1, 1.5, 2]) === null, 'three taps are not enough');
  check(emptyModel().bars.length === 0 && emptyModel().version === ANALYSIS_VERSION, 'an empty model');
}
// ---------- 6.1 to 6.4 level B: the whole file, Essentia.js and misk-analyzer alone ----------
{
  const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' };
  // intro, two verses (another progression in the second), a break, a final chorus with open hats; bars 1 to 64
  const SEC = { bpm: 124, lead: 0.3, bass: 'x..x..x...x.x...', sections: [
    { name: 'Intro', bars: 8, chords: ['Am', 'F', 'C', 'G'], drums: { hh: D.hh }, bass: null },
    { name: 'Verse', bars: 16, chords: ['Am', 'F', 'C', 'G'], drums: D },
    { name: 'Verse 2', bars: 16, chords: ['Dm', 'Am', 'E', 'Am'], drums: D },
    { name: 'Break', bars: 8, chords: ['F', 'G'], drums: null, bass: null },
    { name: 'Chorus', bars: 16, chords: ['F', 'G', 'Am', 'Am'], drums: { ...D, oh: '......x.......x.' } },
  ] };
  const { pcm, truth } = renderSong(SEC), starts = [8, 24, 40, 48];
  const runs = { 'Essentia.js': await analyseFull(pcm, { engine: nodeEssentia }), 'misk-analyzer alone': await analyseFull(pcm, { engine: null }) };
  // Essentia.js that cannot be loaded: level B still finishes, with misk-analyzer's own measures
  runs['Essentia.js failing'] = await analyseFull(pcm, { engine: async () => { throw new Error('blocked'); } });
  for (const [name, m] of Object.entries(runs)) {
    const b = m.sections.map(x => x.start).filter(x => x > 0), err = Math.max(...starts.map(w => Math.min(...b.map(x => Math.abs(x - w)))));
    check(err <= 1 && b.length === starts.length, `level B (${name}): section bounds within one bar on a track with known sections`, `${b.join(',')} (truth ${starts.join(',')})`);
    check(m.sections.map(x => x.kind).join() === 'intro,verse,verse,break,drop' && m.ending === 64, `level B (${name}): kinds and the ending`, `${m.sections.map(x => x.kind).join(',')} · ending ${m.ending}`);
    const ok = m.bars.filter((x, i) => truth.bars[i] && x.chord === truth.bars[i].chord).length / truth.bars.length;
    check(m.bpm === 124 && Math.abs(m.downbeat - 0.3) < 0.01 && ok >= 0.9 && m.key && m.key.root === 9 && m.key.mode === 'minor', `level B (${name}): tempo, downbeat within 10 ms, chords at least 90 %, key A minor`, `${m.bpm} BPM, ${m.downbeat} s, chords ${ok.toFixed(2)}`);
    check(m.level === 'B' && m.version === ANALYSIS_VERSION && m.variations && m.engines, `level B (${name}): the model shape, level B and its engines`, JSON.stringify(m.engines));
  }
  check(Object.values(runs['Essentia.js'].engines).every(x => x === 'essentia.js'), 'with Essentia.js: tempo, key and chords from it', `${JSON.stringify(runs['Essentia.js'].engines)} · Essentia.js tempo ${JSON.stringify(runs['Essentia.js'].essentiaTempo)}`);
  // the tempo's engine (D7): confident alone, or confirmed by misk-analyzer from 2.0; never a disagreeing weak tempo
  check(pickTempo({ bpm: 124 }, { bpm: 123.8, confidence: 2.49 }).from === 'essentia.js' && pickTempo({ bpm: 124 }, { bpm: 61.9, confidence: 2.2 }).bpm === 123.8 && pickTempo({ bpm: 124 }, { bpm: 97, confidence: 2.49 }).from === 'misk-analyzer' && pickTempo({ bpm: 124 }, { bpm: 123.8, confidence: 1.9 }).from === 'misk-analyzer' && pickTempo({ bpm: 124 }, { bpm: 97, confidence: 2.6 }).from === 'essentia.js', 'level B tempo: Essentia.js confident (2.5), or from 2.0 when misk-analyzer agrees (any octave); a weak disagreeing tempo stays misk-analyzer\'s');
  check(Object.values(runs['Essentia.js failing'].engines).every(x => x === 'misk-analyzer') && /did not load/.test((runs['Essentia.js failing'].notes || []).join()), 'Essentia.js failing: misk-analyzer computes the three measures, the model says why', (runs['Essentia.js failing'].notes || []).join());
  // the same model shape as level A for the same bars (analysis spec: One song model)
  const A = createAnalyzer(pcm).model(30), B = runs['Essentia.js'];
  check(JSON.stringify(Object.keys(A.bars[0]).filter(k => !['lead', 'leadVoiced', 'third'].includes(k)).sort()) === JSON.stringify(Object.keys(B.bars[0]).filter(k => !['lead', 'leadVoiced', 'third'].includes(k)).sort()) && A.bars.length > 10, 'level A and level B fill the same bar fields (level B adds the top line, decode-refine D2)');
  // level A never calls Essentia.js: the worker loads it only for "analyse all"
  const wsrc = fs.readFileSync('src/decode/worker.js', 'utf8'), msrc = fs.readFileSync('src/decode/misk-analyzer.js', 'utf8');
  check(!/essentia/i.test(msrc.replace(/\/\/.*$/gm, '')) && /async function all[\s\S]*import\('\.\/engine-essentia\.js'\)/.test(wsrc) && !/^import .*(engine-essentia|full)/m.test(wsrc), 'level A uses misk-analyzer only: Essentia.js is imported only by level B, inside the worker');
  // the writer of level B (D9, D10, D15): sections, a loop per part and section, sounds by measure, valid, the same code
  const s = writeFull(B, { id: 'night-run-full', title: 'Night Run', artist: 'Some Band', sounds: 'ours' });
  check(!validateSong(s).errors.length, 'the level B song is a valid v2 song', JSON.stringify(validateSong(s).errors.slice(0, 2)));
  check(s.sections.map(x => `${x.name}:${x.bars}`).join() === 'Intro:8,Verse:16,Verse 2:16,Break:8,Drop:16', 'the level B song: the model\'s sections named by kind', s.sections.map(x => `${x.name}:${x.bars}`).join());
  const ch = s.tracks.find(x => x.id === 'chords'), chordCodes = ch.clips.map(c => ch.patterns[c.pattern].code.match(/chord\("([^"]+)"\)/)[1]);
  check(chordCodes.join(' | ') === '<Am F C G> | <Am F C G> | <Dm Am E Am> | <F G> | <F G Am Am>', 'one chord loop per section, aligned to the bar number', chordCodes.join(' | '));
  const lpf = ch.clips.map(c => +ch.patterns[c.pattern].code.match(/lpf\((\d+)\)/)[1]);
  check(new Set(lpf).size >= 2 && new Set(ch.clips.map(c => ch.patterns[c.pattern].code)).size === ch.clips.length, 'Our sounds by measure: the sections get different filters', lpf.join(','));
  const simple = writeFull(B, { title: 'x', sounds: 'simple' }), sc = simple.tracks.find(x => x.id === 'chords');
  check(new Set(sc.clips.map(c => sc.patterns[c.pattern].code.replace(/chord\("[^"]+"\)/, ''))).size === 1, 'Simple kit: the same sounds in every section');
  const dr = s.tracks.find(x => x.id === 'drums');
  check(!dr.clips.some(c => c.start < 48 && c.start + c.bars > 40) && s.tracks.find(x => x.id === 'bass').clips.every(c => c.start >= 8), 'parts play where they are heard: no drums in the break, no bass in the intro', JSON.stringify(dr.clips));
  // variations (D9): a drum variant that comes back is a pattern of its own in the section; a one-off fill stays out
  const F = { bd: 'x...x...x...x...', cp: '....x.......xxxx', hh: '..x...x...x...x.' }, V = { bd: 'x.x...x.x.x...x.', cp: '....x.......x...', hh: 'xxxxxxxxxxxxxxxx' };
  const vm = await analyseFull(renderSong({ bpm: 124, lead: 0.3, chords: ['Am', 'F', 'C', 'G'], bass: 'x..x..x...x.x...', bars: 24, drums: D, fills: { 5: F, 7: V, 15: V, 23: V } }).pcm, { engine: null });
  const vbars = (vm.variations.find(x => x.part === 'drums') || { bars: [] }).bars;
  check(vbars.includes(7) && vbars.includes(15) && !vbars.includes(5), 'a drum variation that repeats becomes a variant pattern; a one-off fill does not', `variant bars ${vbars.map(x => x + 1).join(',')}`);
  const vs = writeFull(vm, { title: 'x' }), vd = vs.tracks.find(x => x.id === 'drums');
  check(Object.keys(vd.patterns).length === 2 && vd.clips.some(c => c.start === 7 && c.bars === 1), 'the variant plays on its bars as a clip of its own', JSON.stringify(vd.clips.slice(0, 4)));
  // chords that are noise of the drums (out of the key) are no chord part
  check(inKey({ root: 9, mode: 'minor' })(['Am', 'F', 'C', 'G', 'E']) && !inKey({ root: 9, mode: 'minor' })(['G', 'Bb', 'Cm', 'Bb', 'Gm', 'F#']), 'a section\'s chords mostly out of the key are not a chord part');
  check(pickTempo({ bpm: 174 }, { bpm: 87.2, confidence: 3.5 }).bpm === 174.4 && pickTempo({ bpm: 124 }, { bpm: 123.9, confidence: 1 }).from === 'misk-analyzer' && pickTempo({ bpm: 124 }, null, { bpm: 62, tapped: false }).from === 'picked', 'level B tempo: Essentia.js when confident (in misk-analyzer\'s octave), else misk-analyzer\'s, a picked or tapped tempo first');
  check(barChords([{ chord: 'A#m', strength: 0.9 }])[0].chord === 'Bbm' && settleMode({ root: 0, mode: 'major' }, [{ chord: 'Am' }, { chord: 'F' }, { chord: 'C' }, { chord: 'G' }, { chord: 'Am' }]).mode === 'minor', 'chord names in the app\'s spelling; the key\'s mode settled by the tonic chord on phrase starts');
  // "Follow the song" (D18) and Open in Compose (D15): the song as the tab plays it and as Compose grows it, the same code
  const cfg = composeConfig({ comments: 'none', functions: 'compact', view: 'now' });
  check(cfg.profile === 'switch' && cfg.options.growth === 'follow' && cfg.options.narrator === false, 'Open in Compose: the Live coder, "Follow the song", narrator off', JSON.stringify(cfg));
  const Cd = decodeControls({ comments: 'none', functions: 'compact', view: 'now' }), Cc = resolveProfile(cfg.profile, cfg.options);
  const grown = crescendoSong({ ...s, config: cfg }, { rules: growthRules(Cc) }), Ld = liveCode(followSong(s), Cd, {}), Lc = liveCode(grown, Cc, {});
  const bars = [0, ...new Set(buildSteps(Lc.build).map(x => x.at))];
  check(JSON.stringify(Cd) === JSON.stringify(Cc) && grown.crescendo.follow && bars.every(b => Ld.codeAt(b) === Lc.codeAt(b)), 'the code at every step is the same in Decode and in Compose', `${bars.length} steps`);
  check(bars.includes(8) && bars.includes(24) && bars.includes(40), 'Follow the song: a step at each section change', bars.join(','));
}
// ---------- export with the original (group 8, D16) ----------
{
  // the mix the render page gets: the original's cosine and trim, the code bus, the orbits of the parts not heard
  const orbits = { drums: 1, bass: 9, chords: 10 }, ids = ['drums', 'bass', 'chords'];
  const mid = mixApply(defaultMix(ids), { type: 'slider', value: 0.5 }), em = exportMix(mid, 1.5, orbits);
  check(Math.abs(em.orig - 1.5 * Math.cos(Math.PI / 4)) < 1e-9 && Math.abs(em.code - Math.sin(Math.PI / 4)) < 1e-9 && em.mutes.length === 0 && em.hasOriginal && em.hasCode, 'export mix, slider in the middle: the original (with its trim) and the code at equal power, no part muted', JSON.stringify(em));
  const code = exportMix(mixApply(defaultMix(ids), { type: 'slider', value: 1 }), 1.5, orbits);
  check(code.orig === 0 && !code.hasOriginal && code.code === 1 && code.mutes.length === 0, 'export mix, slider fully on Code: no original, the code at full gain', JSON.stringify(code));
  const orig = exportMix(defaultMix(ids), 1.5, orbits);
  check(orig.orig === 1.5 && orig.code === 0 && !orig.hasCode && orig.mutes.join() === '1,9,10', 'export mix, slider fully on Original: the original alone, every part muted (their orbits)', JSON.stringify(orig));
  const noBass = exportMix(mixApply(mid, { type: 'mute', id: 'bass' }), 1, orbits), solo = exportMix(mixApply(mid, { type: 'solo', id: 'chords' }), 1, orbits);
  check(noBass.mutes.join() === '9' && noBass.hasOriginal && solo.mutes.join() === '1,9' && !solo.hasOriginal && solo.code === 1, 'export mix: mute a part and its orbit goes silent; solo a part and the others and the original go silent', `${JSON.stringify(noBass.mutes)} ${JSON.stringify(solo.mutes)}`);
  // level A's one code track mapped to level B's parts: its mute and solo are every part's
  const a = mixApply(mixApply(defaultMix(['code']), { type: 'slider', value: 0.5 }), { type: 'mute', id: 'code' }), mapped = mixForParts(a, ids);
  check(mapped.tracks.length === 4 && mapped.tracks.filter(x => x.kind === 'code').every(x => x.mute) && exportMix(mapped, 1, orbits).mutes.join() === '1,9,10', 'level A\'s code track, muted: every Full part is muted in the export', mapped.tracks.map(x => `${x.id}:${x.mute}`).join(' '));
  check(mixForParts(mid, ids) === mid, 'a mix already of the parts stays as it is');
  // the original's samples for a window: copies, the file's own time, the lead-in before the first bar, past the ends
  const R = 1000, L = new Float32Array(10 * R).map((_, i) => i / (10 * R)), Rr = L.map(x => -x);
  const w = origSpan([L, Rr], R, 1.5, 2, 4);
  check(w && w.ch.length === 2 && w.ch[0].length === 2 * R && Math.abs(w.ch[0][0] - 3.5 / 10) < 1e-6 && Math.abs(w.at) < 1e-9 && w.ch[0] !== L && w.ch[1][0] < 0, 'the original\'s span of a window starts at the downbeat plus the window\'s start, as copies', `${w && w.ch[0][0]} · at ${w && w.at}`);
  const lead = origSpan([L], R, 1.5, -1.5, 1);
  check(lead && lead.ch[0].length === 2.5 * R && lead.ch[0][0] === 0 && Math.abs(lead.at) < 1e-9, 'a window from the file\'s start (song second -downbeat) holds the lead-in', `${lead && lead.ch[0].length} samples`);
  const early = origSpan([L], R, 1.5, -2, 1);
  check(early && Math.abs(early.at - 0.5) < 1e-9 && early.ch[0].length === 2.5 * R, 'a window that starts before the file waits: the samples play 0.5 s into it', `at ${early && early.at}`);
  check(origSpan([L], R, 1.5, 7, 12).ch[0].length === 1.5 * R && origSpan([L], R, 1.5, 20, 22) === null, 'a window past the end holds what is left, then nothing');
  const mixed = exportMix(mid, 1.2, orbits), whole = wholeJob({ channels: [L], rate: R, downbeat: 1.5, duration: 10, mix: mixed });
  check(whole.start === -1.5 && whole.cut === 8.5 && typeof whole.origAt === 'function' && whole.mix.orig === mixed.orig && whole.mix.code === mixed.code, 'the whole export starts the file at the file\'s start and ends where the original ends', `start ${whole.start}, cut ${whole.cut}`);
  check(wholeJob({ channels: [L], rate: R, downbeat: 0, duration: 10, mix: code }).origAt === null && fragmentJob({ channels: [L], rate: R, downbeat: 0, mix: code }).origAt === null && typeof fragmentJob({ channels: [L], rate: R, downbeat: 0, mix: mixed }).origAt === 'function', 'with the original silent in the mix nothing of it goes to the render page');
  // the timeline of a decoded export: bar times move by the lead-in, the cover rides along
  const meta = decodeMeta({ duration: 10, downbeat: 1.5, barSeconds: 2, bpm: 120 }), sgT = { title: 'T', meta: { ...meta, sections: [{ label: 'Track', start: 0, len: meta.bars }] }, build: null };
  const tl = timelineOf(sgT, [{ from: 0, to: meta.bars, code: 'x' }, { from: 2, to: meta.bars, code: 'y' }], {}, 10, 'en', { cover: { title: 'Night Run', artist: 'Some Band', attribution: true }, start: -1.5 });
  check(Math.abs(tl.code[0].t - 1.5) < 1e-6 && Math.abs(tl.code[1].t - 5.5) < 1e-6 && tl.cover.title === 'Night Run' && tl.firstBar === 1.5, 'the timeline of a decoded export: the first bar at the lead-in, the cover named', JSON.stringify(tl.code.map(x => x.t)));
  check(timelineOf(sgT, [{ from: 0, code: 'x' }], {}, 10, 'en').cover === undefined, 'a timeline of a song has no cover');
  // the rights line (D16): on, off, code only, in both languages; off names neither the title nor the artist
  const names = ['Night Run', 'Some Band'];
  for (const lang of ['en', 'it']) {
    const on = rightsLine({ title: 'Night Run', artist: 'Some Band', attribution: true, original: true, lang }), off = rightsLine({ title: 'Night Run', artist: 'Some Band', attribution: false, original: true, lang }), only = rightsLine({ title: 'Night Run', artist: 'Some Band', attribution: false, original: false, lang });
    check(names.every(n => on.includes(n)) && (lang === 'en' ? /Cover of "Night Run" by Some Band/.test(on) : /Cover di "Night Run" di Some Band/.test(on)), `rights line with Attribution on (${lang}): the title and the artist as a cover`, on);
    check(names.every(n => !off.includes(n) && !only.includes(n)) && off !== only && /rights holders|titolari dei diritti/.test(off) && /rights holders|titolari dei diritti/.test(only), `rights line with Attribution off (${lang}): the rights holders, neither the title nor the artist; code only says so`, `${off} | ${only}`);
  }
  check(rightsLine({ title: 'Night Run', artist: '', attribution: true, original: true, lang: 'en' }) === 'Cover of "Night Run". The original recording belongs to its rights holders.' && rightsLine(null) === '', 'the cover line without an artist; no line for a song');
  const tx = textsFor({ kind: 'video', title: 'Track to code', seconds: 120, seed: 'abc', cover: { title: 'Night Run', artist: 'Some Band', attribution: false, original: true, lang: 'en' } });
  check(!names.some(n => tx.description.includes(n) || tx.title.includes(n)) && /Contains a recording that belongs to its rights holders\./.test(tx.description), 'the texts of an export with Attribution off name nothing and carry the line', tx.title);
  check(/Cover of "Night Run" by Some Band\./.test(textsFor({ kind: 'fragment', title: 'Night Run', fragment: { label: 'L' }, seed: 'x', cover: { title: 'Night Run', artist: 'Some Band', attribution: true, original: true, lang: 'en' } }).description), 'a fragment\'s texts carry it too');
}
// fragments of a decoded track (8.3): the picker weighs the sections the analysis named by kind
{
  const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' };
  const SEC = { bpm: 124, lead: 0.3, bass: 'x..x..x...x.x...', sections: [
    { name: 'Intro', bars: 8, chords: ['Am', 'F', 'C', 'G'], drums: { hh: D.hh }, bass: null },
    { name: 'Verse', bars: 16, chords: ['Am', 'F', 'C', 'G'], drums: D },
    { name: 'Break', bars: 8, chords: ['F', 'G'], drums: null, bass: null },
    { name: 'Chorus', bars: 16, chords: ['F', 'G', 'Am', 'Am'], drums: { ...D, oh: '......x.......x.' } },
  ] };
  const m = await analyseFull(renderSong(SEC).pcm, { engine: null }), song = writeFull(m, { id: 'x', title: 'T' }), shape = shapeOf(song, absoluteClips);
  const scores = barScores(shape), mean = (a, b) => { let t = 0; for (let i = a; i < b; i++) t += scores[i]; return t / (b - a); };
  const at = name => { let from = 0; for (const x of shape.sections) { if (x.label === name) return [from, from + x.len]; from += x.len; } return [0, 1]; };
  const kinds = shape.sections.map(x => x.label).join();
  check(/Intro/.test(kinds) && /Drop/.test(kinds) && mean(...at('Drop')) > mean(...at('Intro')) * 2, 'fragments: the sections named by kind give the picker its weights (a drop weighs more than an intro)', `${kinds}; drop ${mean(...at('Drop')).toFixed(2)} vs intro ${mean(...at('Intro')).toFixed(2)}`);
  const bpm = decodeMeta(m).bpm, picks = pickFragments(shape, bpm, { n: 1, length: 12, seed: 'k' }), again = pickFragments(shape, bpm, { n: 1, length: 12, seed: 'k' });
  check(picks.length === 1 && picks[0].start > 0 && JSON.stringify(picks) === JSON.stringify(again), 'fragments: a pick on a bar line, the same for the same seed, not the first bar', JSON.stringify(picks));
}
// ---------- the app's own songs (optional) ----------
if (process.argv.includes('--app')) {
  const app = measureApp();
  if (!Object.keys(app).length) console.log('note  no WAV of the test songs in .cache/decode/wav: run tools/decode-export.cjs with the dev server');
  for (const [id, r] of Object.entries(app)) {
    // (the long test song opens on offbeat hats alone: level A locks its beat half a beat off there, a known limit of the
    // first seconds; level B's whole-file grid is measured below)
    // (the new bench songs of decode-refine 6.1 carry what groups 7 to 10 fix: measured, not held to the old targets)
    if (r.hard) { console.log(`info  ${id} (level A, new bench song): tempo ${r.bpm}, downbeat ${r.downbeat} s, F1 ${JSON.stringify(r.f1)}, chords ${r.chords}`); continue; }
    // (decode-refine 7.4: the long test song opens on offbeat hats alone; level A's relock puts its beat right once the
    // kicks come, so it is held to the targets now)
    check(Math.abs(r.bpm - r.bpmTruth) <= 0.1, `${id} (app export): tempo`, `${r.bpm}`);
    check(r.downbeat < 0.03, `${id} (app export): downbeat within 30 ms of the start`, `${r.downbeat} s`);
    check(r.f1.bd >= 0.7 && r.f1.cp >= 0.9 && r.f1.hh >= 0.8, `${id} (app export): drum grids`, JSON.stringify(r.f1));
    console.log(`info  ${id}: chords ${r.chords}, key ${r.key ? `${r.key.root} ${r.key.mode}` : '-'} (${r.keyOk ? 'right' : 'wrong'}), drums on/off ${r.drumsPresence}`);
  }
  // level B on the app's test songs, with Essentia.js: the whole-file grid, sections, faster than the file
  for (const [id, r] of Object.entries(await measureFull({ essentia: true }))) {
    if (r.hard) { console.log(`info  ${id} (level B, new bench song): tempo ${r.bpm}, key ${r.keyOk ? 'right' : 'wrong'}, F1 ${JSON.stringify(r.f1)}, bounds ${r.bounds.join(',')}`); continue; }
    check(Math.abs(r.bpm - r.bpmTruth) <= 0.01 && r.downbeat < 0.02 && r.keyOk, `${id} (app export, level B): tempo, downbeat within 20 ms, key`, `${r.bpm} BPM, ${r.downbeat} s, key ${r.keyOk ? 'right' : 'wrong'}`);
    check(r.boundsErr <= 1 && r.ms < r.seconds * 1000, `${id} (app export, level B): section bounds within one bar, faster than the file`, `bounds ${r.bounds.join(',') || '-'} (extra ${r.extra}), ${(r.ms / 1000).toFixed(1)} s for ${r.seconds} s`);
    console.log(`info  ${id} (level B): chords ${r.chords}, drums F1 ${JSON.stringify(r.f1)}, on/off ${r.drumsPresence}, engines ${JSON.stringify(r.engines)}`);
  }
}
// ---------- decode-refine group 7 on the bench (optional, with --app): drums on dense mixes, the relock ----------
if (process.argv.includes('--app')) {
  const app = measureApp(), full = await measureFull({ essentia: false, only: ['decode-test-acid'] }), tl = await measureTimelines({ full: true });
  const acidA = app['decode-test-acid'], acidB = full['decode-test-acid'], L = tl['luci-rosse'], R = tl['radio-bench-c'];
  if (acidA && acidB) check(acidA.f1.bd >= 0.8 && acidB.f1.bd >= 0.8, 'the acid test song: kick F1 at least 0.8 in both levels under its distorted bass (the every-beat rule)', `A ${acidA.f1.bd}, B ${acidB.f1.bd}`);
  if (L) {
    check(L.B.rows.bd.f1 >= 0.8 && L.A.rows.bd.f1 >= 0.8, 'luci-rosse: kick F1 at least 0.8 in both levels', `A ${L.A.rows.bd.f1}, B ${L.B.rows.bd.f1}`);
    check(L.B.rows.hh.f1 >= 0.8, 'luci-rosse: hat F1 at least 0.8 (the hats\' floor per bars)', `${L.B.rows.hh.f1}`);
    check(L.A.progress.at12 && L.A.progress.at12.err <= 30, 'luci-rosse in level A as played: the downbeat within 30 ms of a true one by bar 12 (the relock)', JSON.stringify(L.A.progress));
    console.log(`info  luci-rosse clap F1 ${L.B.rows.cp.f1} (false ${L.B.rows.cp.falseHits}), drum patterns per section ${L.B.perSection.join(',')}`);
  }
  if (R) {
    check(R.B.rows.cp.falseHits <= 40, 'the radio seed: at most 40 false claps (flatness and the hats of the last seconds)', `${R.B.rows.cp.falseHits}`);
    check(R.B.perSection.every(n => n <= 2), 'the radio seed in level B: at most 2 drum patterns per section (the per-step majority)', R.B.perSection.join(','));
    check(R.B.chordQuality >= 0.9, 'the radio seed in level B: at least 90 % of the chords with the right quality', `${R.B.chordQuality}`);
    check(R.B.bassBars >= 0.5 * R.B.drumBars && R.B.bassPitch >= 0.9 && R.B.bassOctaveErrors <= 0.05, 'the radio seed in level B: its supersaw bass decoded, in its own octave', `bass in ${R.B.bassBars} bars, pitch ${R.B.bassPitch}, octave errors ${R.B.bassOctaveErrors}`);
  }
}
// decode-refine group 8 (D5): steady qualities, the bass's octave range, quiet bass bars, quiet minor thirds
{
  const bar = (chord, conf, bass = null, lv = 1) => ({ chord, chordConf: conf, bass: bass || Array(16).fill(null), level: { bass: lv } });
  const q = ['Am', 'A', 'Am', 'Am', 'F', 'A', 'Am', 'F'].map(c => bar(c, 0.7));
  steadyQualities(q, [{ start: 0, bars: 8 }]);
  check(q.map(b => b.chord).join(' ') === 'Am Am Am Am F Am Am F', 'a chord\'s quality follows the section\'s majority for its root', q.map(b => b.chord).join(' '));
  const c = ['A', 'Am', 'A', 'Am', 'Am', 'Am'].map((x, i) => bar(x, i === 0 || i === 2 ? 0.9 : 0.7));
  steadyQualities(c, [{ start: 0, bars: 6 }]);
  check(c[0].chord === 'A' && c[2].chord === 'A', 'the other quality stays where it wins clearly in two bars', c.map(b => b.chord).join(' '));
  const t = ['A', 'A', 'Am', 'Am'].map(x => bar(x, 0.7));
  steadyQualities(t, [{ start: 0, bars: 4 }], undefined, { root: 9, mode: 'minor' });
  check(t.every(b => b.chord === 'Am'), 'a tie goes to the key\'s quality', t.map(b => b.chord).join(' '));
  const notes = n => Array.from({ length: 16 }, (_, j) => (j % 4 === 0 ? n : null));
  const bb = [bar('Am', 0.9, notes(33)), bar('Am', 0.9, notes(45)), bar('Am', 0.9, notes(64)), bar('Am', 0.9, notes(33), 0.1), bar('Am', 0.9, notes(21))];
  bassRange(bb, [{ start: 0, bars: 5 }]);
  check(bb[0].bass[0] === 33 && bb[1].bass[0] === 45 && bb[2].bass[0] === 40 && bb[3].bass.every(x => x === null) && bb[4].bass[0] === 33, 'the bass keeps one octave range per section (a riff\'s octave jump stays, a note far off moves by octaves) and a quiet bass bar has no notes', bb.map(b => b.bass[0]).join(','));
  const qm = [{ chord: 'A', third: true }, { chord: 'C', third: true }, { chord: 'A' }];
  quietMinors(qm, { root: 9, mode: 'minor' });
  check(qm.map(b => b.chord).join() === 'Am,C,A', 'a quiet minor third turns a chord minor only where the key holds that minor chord', qm.map(b => b.chord).join());
}
// decode-refine group 9 (D2): the top line and the Lead
{
  check(snapToKey(69.3, { root: 9, mode: 'minor' }) === 69 && snapToKey(70.45, { root: 9, mode: 'minor' }) === 70 && snapToKey(72.35, { root: 9, mode: 'minor' }) === 72 && snapToKey(null, null) === null, 'the top line snaps to the key\'s scale within 40 cents');
  const loop = [[69, null, 72, null, 76, null, null, null, 69, null, 72, null, 74, null, null, null]];
  check(leadCode(loop, { root: 9, mode: 'minor' }) === 'n("0 2 4 ~ 0 2 3 ~").scale("A4:minor")', 'the Lead is written as degrees of the key\'s scale', leadCode(loop, { root: 9, mode: 'minor' }));
  // a generated song: a hook section between two verses of chords; the Lead in the hook only, its notes right
  const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' }, mel = [76, null, 74, null, 72, null, null, 79, null, 77, null, 76, 74, null, 72, null];
  const { pcm } = renderSong({ bpm: 124, lead: 0.3, bass: 'x..x..x...x.x...', sections: [{ name: 'Verse', bars: 8, chords: ['Am', 'F', 'C', 'G'], drums: D }, { name: 'Hook', bars: 8, chords: null, drums: D, melody: mel }, { name: 'Out', bars: 8, chords: ['Am', 'F', 'C', 'G'], drums: D }] });
  for (const [name, engine] of [['Essentia.js', nodeEssentia], ['misk-analyzer', null]]) {
    const H = await analyseFull(pcm, { engine }), sg = writeFull(H), ld = sg.tracks.find(x => x.id === 'lead');
    const hook = H.sections.find(s => s.start <= 9 && s.start + s.bars >= 15), inHook = ld && ld.clips.every(c => hook && c.start >= hook.start && c.start + c.bars <= hook.start + hook.bars);
    let ok = 0, n = 0;
    for (let i = 9; i < 16; i++) { const b = H.bars[i]; mel.forEach((x, j) => { if (x === null) return; n++; if (b.lead && b.lead[j] !== null && ((((b.lead[j] - x) % 12) + 12) % 12) === 0) ok++; }); }
    check(ld && inHook && ok / n >= 0.7 && H.engines.lead === (engine ? 'essentia.js' : 'misk-analyzer'), `the Lead of a generated hook (${name}): written in the hook only, its notes right on at least 70 % of the steps`, `${ld ? JSON.stringify(ld.clips) : 'no lead'}, ${Math.round((100 * ok) / n)} %, engine ${H.engines.lead}`);
    check(compileSong(sg).includes('n("') && !validateSong(sg).errors.length, `the Lead compiles in a valid song (${name})`);
  }
  // an instrumental song with no top line: no Lead
  const P = renderSong({ bpm: 124, lead: 0.3, chords: ['Am', 'F'], bass: 'x..x..x...x.x...', bars: 16, drums: D });
  const I = await analyseFull(P.pcm, { engine: null });
  check(!writeFull(I).tracks.some(x => x.id === 'lead'), 'no Lead on a song without a top line', `voiced ${I.bars.map(b => b.leadVoiced).join(',')}`);
  // a sung melody: muted by default (hush), in the song Open in Compose saves too; the mix starts it muted by the user
  const V = { ...I, bars: I.bars.map(b => ({ ...b, top: { up: 0.5 }, lead: mel, leadVoiced: 0.6 })) };
  const vs = writeFull(V), vl = vs.tracks.find(x => x.id === 'lead');
  check(vl && vl.hush === true && /_\$:/.test(compileSong(vs)), 'a sung melody\'s Lead is muted by default, also in the song Open in Compose saves', vl ? JSON.stringify({ hush: vl.hush }) : 'no lead');
  const mx = mixApply(defaultMix(['drums']), { type: 'tracks', codeIds: ['drums', 'lead'], muted: ['lead'] }), lt = mx.tracks.find(t => t.id === 'lead');
  check(lt.mute && lt.by === 'user', 'the mix starts a muted Lead muted by the user, so the slider does not unmute it');
}
// a tapped or stored tempo is never moved by the relock (decode-refine D4)
{
  const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' };
  const { pcm } = renderSong({ bpm: 124, lead: 0.3, chords: ['Am', 'F'], bass: 'x..x..x...x.x...', bars: 20, drums: D });
  const A = createAnalyzer(pcm);
  A.model(9);
  A.setTempo({ bpm: 124, downbeat: 0.31, tapped: true });
  const m = A.model(pcm.length / RATE);
  check(!m.relocked && m.downbeat === 0.31 && m.bpm === 124, 'the relock never moves a tapped tempo', JSON.stringify({ bpm: m.bpm, downbeat: m.downbeat, relocked: m.relocked }));
}
// review of groups 7 to 9 (decode-refine): four fixes
{
  // a two-bar groove keeps both bars: the per-step majority of an alternating pair is a grid never heard
  const A = { bd: 'x.....x...x.....', cp: '....x.......x...', hh: '..x...x...x...x.', oh: E }, B = { ...A, bd: 'x...x.....x.x...' };
  const M = { bpm: 120, downbeat: 0, barSeconds: 2, key: { root: 9, mode: 'minor' }, bars: Array.from({ length: 16 }, (_, i) => ({ start: i * 2, drums: i % 2 ? B : A, bass: Array(16).fill(null), chord: null, level: { drums: 1, bass: 0, chords: 0, other: 0 } })), sections: [{ start: 0, bars: 16, kind: 'verse' }], ending: 16 };
  const d = writeFull(M, { title: 'pair' }).tracks.find(t => t.id === 'drums'), rows = Object.values(d.patterns).map(p => p.rows.bd).sort();
  const byBar = []; for (const c of d.clips) for (let k = 0; k < c.bars; k++) byBar[c.start + k] = d.patterns[c.pattern].rows.bd;
  check(rows.join() === [A.bd, B.bd].sort().join() && byBar.every((x, i) => x === (i % 2 ? B.bd : A.bd)), 'a two-bar groove is written as its two bars, in turn', rows.join(' / '));
  // Essentia.js's chord on another root drops misk-analyzer's quiet minor third mark
  const q = [takeChord({ chord: 'F', third: true }, { chord: 'E', conf: 0.9 }), takeChord({ chord: 'A', third: true }, { chord: 'A', conf: 0.9 })];
  quietMinors(q, { root: 9, mode: 'minor' });
  check(q.map(b => b.chord).join() === 'E,Am', 'a quiet minor third mark goes with its root when Essentia.js writes another chord', q.map(b => b.chord).join());
  // a bass note under a kick on step 0 or 1 counts the bar before's last steps
  check(!quietBefore([null], [null, 35], 1) && !quietBefore([], [35, null], 0) && quietBefore([null], [null, null], 1) && quietBefore([null, null], [35, 35], 2), 'a note on the bar before\'s last steps holds back a retrigger on steps 0 and 1');
}
// a stored level A tempo saved before the relock ran is still checked by it (decode-refine D4)
{
  const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' };
  const { pcm } = renderSong({ bpm: 124, lead: 0.3, chords: ['Am', 'F'], bass: 'x..x..x...x.x...', bars: 20, drums: D });
  const A = createAnalyzer(pcm), half = 60 / 124 / 2;
  A.setTempo({ bpm: 124, downbeat: half, tapped: false, fixed: false });
  const m = A.model(pcm.length / RATE);
  check(!!m.relocked && m.relockChecked, 'a stored tempo saved before the relock ran is checked by it', JSON.stringify({ downbeat: m.downbeat, relocked: m.relocked }));
  const B2 = createAnalyzer(pcm);
  B2.setTempo({ bpm: 124, downbeat: half, tapped: false, fixed: true });
  const m2 = B2.model(pcm.length / RATE);
  check(!m2.relocked && m2.downbeat === Math.round(half * 10000) / 10000, 'a stored tempo the relock already checked stays', JSON.stringify({ downbeat: m2.downbeat }));
}
// ---------- decode-refine part 1: balanced code changes, the top line group ----------
{
  // the edit rule (D7): how much a new value must differ
  const one = [33, null, null, 33, null, null, 33, null, null, null, 33, null, 33, null, null, null];
  const noisy = one.map((x, j) => (j === 1 ? 33 : j === 6 ? null : x));
  check(!differsEnough('bass', [one], [noisy]), 'a bass bar that differs from the loop on 2 of 16 steps does not edit its line');
  check(differsEnough('bass', [one], [one.map(x => (x === null ? null : 38))]), 'a bass loop with another root on its first bar edits');
  check(!differsEnough('chords', ['Am', 'F', 'C', 'G'], ['Am', 'F', 'C', 'Em']) && !differsEnough('chords', ['Am', 'F', 'C', 'G'], ['A', 'F', 'C', 'G']) && differsEnough('chords', ['Am', 'F', 'C', 'G'], ['Dm', 'Bb', 'C', 'G']), 'chords: a relative or the other quality does not edit, two other chords do');
  const g = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.', oh: E };
  check(!differsEnough('drums', g, { ...g, hh: '..x...x...x...xx' }) && differsEnough('drums', g, { ...g, oh: '......x.......x.' }) && differsEnough('drums', g, { ...g, hh: 'x.x.x.x.x.x.x.x.' }), 'drums: one step does not edit; a row that enters, or four steps, do');
  check(steady([1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0]).map(Number).join('') === '111111111000' && steady([0, 1, 0, 0, 1, 1, 0, 1]).map(Number).join('') === '00001111', 'level B: a part flickering every other bar reads as heard, a one-bar island goes, a stop of two bars stays');
  check(EDIT_RULE.lineBars === 4 && EDIT_RULE.anyBars === 2 && EDIT_RULE.runBars === 2, 'the edit rule\'s numbers in one place', JSON.stringify(EDIT_RULE));
  // level A loops settle: a four-bar chord loop heard twice stays until a chord changes
  const cb = (chord, k) => ({ drums: {}, bass: Array(16).fill(null), chord, chordConf: 0.9, level: { drums: 0, bass: 0, chords: 1, other: 0 }, bright: 0.3, low: 0.3 });
  const prog = ['Am', 'F', 'C', 'G'], LM = { bpm: 124, bars: Array.from({ length: 24 }, (_, i) => cb(prog[i % 4], i)) };
  const lines = planA(LM).map(p => JSON.stringify(p.value.chords));
  check(lines.slice(8).every(x => x === lines[8]) && JSON.parse(lines[8]).length === 4, 'level A: a four-bar chord loop heard twice keeps its line to the end', lines[8]);
  // the measures on a generated song with known sections, both levels (spec: Edit balance targets)
  const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' };
  const mel = [76, null, 74, null, 72, null, null, 79, null, 77, null, 76, 74, null, 72, null];
  const SONG = { bpm: 124, lead: 0.3, bass: 'x..x..x...x.x...', sections: [
    { name: 'Intro', bars: 8, chords: ['Am', 'F', 'C', 'G'], drums: { hh: D.hh }, bass: null, melody: null },
    { name: 'Verse', bars: 16, chords: ['Am', 'F', 'C', 'G'], drums: D, melody: null },
    { name: 'Hook', bars: 16, chords: null, drums: D, melody: mel },
    { name: 'Break', bars: 8, chords: ['F', 'G'], drums: null, bass: null, melody: null },
    { name: 'Out', bars: 16, chords: ['Am', 'F', 'C', 'G'], drums: { ...D, oh: '......x.......x.' }, melody: null },
  ] };
  const { pcm } = renderSong(SONG), B = await analyseFull(pcm, { engine: null });
  const a = liveCodes(pcm), sa = editStats(a.codes, a.bpm, [8, 24, 40, 48].map(x => x - (a.offset || 0))), fb = fullCodes(B), sb = editStats(fb.codes, fb.bpm, fb.sections);
  for (const [lv, st] of [['A', sa], ['B', sb]]) check(st.share <= 0.3 && st.perMinute <= 8 && st.avgSize >= 20, `level ${lv} on a generated song: at most 30 % of bars edited, 8 edits a minute, 20 characters an edit on average (small edits printed: the 15 % target is not met yet)`, `${Math.round(st.share * 100)} % of ${st.bars} bars, ${st.perMinute}/min, ${st.edits} edits (${st.mutes} mutes), average ${st.avgSize} characters, small ${Math.round(st.small * 100)} %, section changes ${st.sections === null ? '-' : Math.round(st.sections * 100) + ' %'}`);
  check(sb.sections >= 0.9, 'level B: every section change gets an edit within one bar', `${Math.round(sb.sections * 100)} %`);
  // the top line group (D6): `$:` in the hook, `_$:` elsewhere, none without a top line; the same lines for the same seed
  const up = k => B.bars.slice(k, k + 8).reduce((x, b) => x + b.top.up, 0) / 8;
  check(up(26) > 0.3 && up(10) < 0.22, 'the top line: the hook\'s bars have a high upper share, the pad\'s a low one', `hook ${up(26).toFixed(2)}, pad ${up(10).toFixed(2)}`);
  const hook = voxGroup(B, 30, { seed: 'fp1', level: 'B' }), verse = voxGroup(B, 12, { seed: 'fp1', level: 'B' });
  check(/^\/\/ =+ melody =+\n(\$: melody\("[a-z ]+"\)\.\w+\([\d.]+\)\n?){1,3}$/.test(hook) && /^_\$: melody\(/m.test(verse) && !/^\$:/m.test(verse), 'level B: `$: melody(…)` lines where the hook plays, `_$:` in the other sections', `${hook.split('\n').length - 1} lines: ${hook.split('\n')[1]}`);
  const keys = [0, 8, 24, 40, 48].map(b => voxGroup(B, b, { seed: 'fp1', level: 'B' }).replace(/_?\$:/g, ''));
  check(voxGroup(B, 30, { seed: 'fp1', level: 'B' }) === hook && keys.every(x => x === keys[0]) && voxGroup(B, 30, { seed: 'fp2', level: 'B' }) !== hook, 'the same file gives the same lines in every section (a section turns them on or off), another file other lines');
  const noTop = { ...B, bars: B.bars.map(b => ({ ...b, top: { up: 0.1 } })) };
  check(voxGroup(noTop, 30, { seed: 'fp1', level: 'B' }) === '' && voxGroup(noTop, 30, { seed: 'fp1', level: 'A' }) === '', 'no top line in the whole track: no group');
  const vocal = { ...B, bars: B.bars.map(b => ({ ...b, top: { up: 0.5 } })) };
  check(/^\/\/ =+ vox =+\n\$: vox\(/.test(voxGroup(vocal, 30, { seed: 'fp1', level: 'B' })), 'a top line over the whole track (a voice): `vox(…)` lines');
  const A2 = createAnalyzer(pcm).model(pcm.length / RATE), sA2 = topPlan(A2, 'A');
  check(sA2[34] && sA2[34].on && !(sA2[14] && sA2[14].on), 'level A: the group turns on in the hook and stays off in the verse', `bar 35 ${sA2[34] && sA2[34].on}, bar 15 ${sA2[14] && sA2[14].on}`);
  // the group is shown, never played: withoutVox gives the code the player evaluates; Copy keeps it with its helpers
  const code = `setcpm(31)\n\n$: s("bd*4")`, shown = withVox(code, hook);
  check(withoutVox(shown) === code && voxOf(shown) === hook && withVox(code, '') === code && withoutVox(`${code}\n\n// vox: …`) === code, 'the group follows the parts; the evaluated code leaves it out (also the old comment)');
  check(TOP_HELPERS.every(h => HELPERS_APP.includes(h)) && VOX_PRELUDE.includes('vox = () => silence') && VOX_PRELUDE.includes('melody = () => silence'), 'vox and melody are app helpers, defined as silence for code copied out of the app');
  // Strudel in Node: the code copied out (the helpers, the parts, the group) evaluates and plays only the parts
  const S = await strudelInNode(), evn = async c => (await S.evaluate(c)).queryArc(0, 4).filter(h => h.hasOnset()).length;
  const ev = [await evn(`${VOX_PRELUDE}$: s("bd*4")\n\n${hook}`), await evn('$: s("bd*4")'), await evn(`${VOX_PRELUDE}${hook.replace(/_\$:/g, '$:')}`)];
  check(ev[0] === ev[1] && ev[1] === 16 && ev[2] === 0, 'the copied code with the group evaluates in Strudel and plays only the parts; the group alone plays nothing', ev.join(','));
}
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
