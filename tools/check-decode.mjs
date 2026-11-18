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
import { SOUND_RULE as SR8, DRUM_DRIVE } from '../src/decode/writer.js';
import { PART_LEVELS } from '../src/decode/part-levels.js';
import { BASS_RULE } from '../src/decode/misk-analyzer.js';
import { analyseFull, pickTempo, threeAgree, noSteadyBeat, noBassPart, PARTS_RULE, barChords, settleMode, steadyQualities, bassRange, quietMinors, snapToKey, takeChord, backbeatSnare, clapShift, thirdlessMode } from '../src/decode/full.js';
import { writeFull, inKey, leadCode, balanceLevels, stepShare, cutUnderLead, bassDriveOf, POWER_RULE, soundsByFit, chordRhythm, CHORD_RULE, bassFilled, twinParts, QUIET_RULE, LINE_RULE, lineChord, kickClicks, offSnare } from '../src/decode/writer.js';
import { chordHits } from '../src/decode/hit-measure.js';
import { nearestKit, rankKits, shapeOf as hatShapeOf, bassDrive, hatTop } from '../src/decode/kit-measure.js';
import { KIT_MEASURES } from '../src/decode/kits.js';
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
import path from 'node:path';

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
  check(Math.abs(stepShare('note("a1 _ _ ~")') - (1 + 2 * SR8.holdShare) / 4) < 1e-9 && SR8.holdShare === 0.8 && SR8.fallback === 0.03, 'round 8: a held step counts as 0.8 of a sounding step in the level prediction; the balance takes the nearest gains when they bring the share difference down by 0.03 or more');
  check(pickTempo({ bpm: 180 }, { bpm: 90, confidence: 4.05, percival: 89.9, degara: 89.1 }).bpm === 90 && Math.abs(pickTempo({ bpm: 120 }, { bpm: 184.57, confidence: 1.49, percival: 89.88, degara: 89.1 }).bpm - 179.76) < 0.01 && pickTempo({ bpm: 176 }, { bpm: 88, confidence: 2.7, percival: 88, degara: 87.6 }).bpm === 176 && pickTempo({ bpm: 140 }, { bpm: 105, confidence: 1.1, percival: 104.9, degara: 105.5 }).bpm === 105 && Math.abs(pickTempo({ bpm: 174 }, { bpm: 115.8, confidence: 2.4, percival: 86.9, degara: 114.8 }).bpm - 174) < 1 && threeAgree({ bpm: 120, from: 'x' }, { bpm: 90 }).bpm === 120, 'round 8 tempo vote: the three Essentia.js estimates agreeing win (round 9: their middle one when RhythmExtractor2013 is over 1.5 % from it), a double or half only above confidence 3.5; no vote when they disagree or one is missing');
  check(Math.abs(pickTempo({ bpm: 64 }, { bpm: 128.8, confidence: 2.25, percival: 128, degara: 129.2 }).bpm - 128.8) < 0.1 && Math.abs(pickTempo({ bpm: 106.6 }, { bpm: 161.5, confidence: 3.0, percival: 80.1, degara: 161.5 }).bpm - 161.5) < 0.1 && Math.abs(pickTempo({ bpm: 80 }, { bpm: 162.2, confidence: 3.25, percival: 80.1, degara: 161 }).bpm - 81.1) < 0.1 && pickTempo({ bpm: 176 }, { bpm: 88, confidence: 2.7, percival: 88, degara: 87.6 }).bpm === 176, 'round 8 tempo vote, third pass: a pick at half of three agreeing estimates moves up from confidence 2.0; an estimate an octave off still agrees for a 3:2 move, never for an octave move');
  check(noSteadyBeat({ bpm: 135.6, confidence: -0.11 }) === true && noSteadyBeat({ bpm: 135, confidence: 0.87 }) === false && noSteadyBeat(null) === null && PARTS_RULE.noBeat === 0.4, 'round 8: no steady beat under Essentia.js confidence 0.4 (a pad-only song -0.11, every bench file with drums 1.6 or more, real tracks 0.87 or more); unknown without Essentia.js');
  check(noBassPart([0.2, 0.55, 0.18, 0.06, 0.01], { h1: 0 }) && !noBassPart([0.48, 0.4, 0.1, 0.01, 0.01], { h1: 0 }) && !noBassPart([0.2, 0.55, 0.18, 0.06, 0.01], { h1: 0.6 }) && !noBassPart(null, { h1: 0 }) && !noBassPart([0.2], null), 'round 8: decoded bass notes are no bass only with a low 20-150 Hz share and no energy at their fundamental (a bass an octave off keeps a share of 0.48)');
  check(Object.values(runs['Essentia.js failing'].engines).every(x => x === 'misk-analyzer') && /did not load/.test((runs['Essentia.js failing'].notes || []).join()), 'Essentia.js failing: misk-analyzer computes the three measures, the model says why', (runs['Essentia.js failing'].notes || []).join());
  // the same model shape as level A for the same bars (analysis spec: One song model)
  const A = createAnalyzer(pcm).model(30), B = runs['Essentia.js'];
  { const extra = ['lead', 'leadVoiced', 'third', 'sustain', 'chordHits', 'chordHeld', 'chordTonal', 'bassAttack']; check(JSON.stringify(Object.keys(A.bars[0]).filter(k => !extra.includes(k)).sort()) === JSON.stringify(Object.keys(B.bars[0]).filter(k => !extra.includes(k)).sort()) && A.bars.length > 10, 'level A and level B fill the same bar fields (level B adds the top line, the chords\' sustain and, round 11, how the chords and the bass are played)'); }
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
  check(inKey({ root: 4, mode: 'minor' })(['E', 'E', 'F', 'E', 'G', 'F', 'E', 'Bb']) === 'power' && inKey({ root: 4, mode: 'minor' })(['Em', 'C', 'D', 'Em']) === true && !inKey({ root: 9, mode: 'minor' })(['G', 'Bb', 'C', 'Bb', 'G', 'D']), 'round 8: chords with roots in the key and its flat second but thirds out of it are power chords; roots away from the tonic stay out');
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
  const bb = [bar('Am', 0.9, notes(33)), bar('Am', 0.9, notes(45)), bar('Am', 0.9, notes(64)), bar('Am', 0.9, notes(36), 0.1), bar('Am', 0.9, notes(21)), bar('Am', 0.9, notes(33), 0.1)];
  bassRange(bb, [{ start: 0, bars: 6 }]);
  check(bb[0].bass[0] === 33 && bb[1].bass[0] === 45 && bb[2].bass[0] === 40 && bb[3].bass.every(x => x === null) && bb[4].bass[0] === 33, 'the bass keeps one octave range per section (a riff\'s octave jump stays, a note far off moves by octaves) and a quiet bass bar has no notes', bb.map(b => b.bass[0]).join(','));
  check(bb[5].bass[0] === 33, 'round 9: a quiet bass bar keeps notes on its chord\'s root (a bass of a few short notes)', String(bb[5].bass[0]));
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
// decode-refine group 10 (D3): the drum machine by measure, the acid bass's moving filter, Simple kit unchanged
{
  check(Object.keys(KIT_MEASURES).length >= 20 && KIT_MEASURES.RolandTR909 && KIT_MEASURES.RolandTR808.hatBright > KIT_MEASURES.RolandTR909.hatBright, 'the drum machines measured from their samples (src/decode/kits.js)', `${Object.keys(KIT_MEASURES).length} kits`);
  const K = KIT_MEASURES, noisy = v => v.map((x, i) => Math.round((x + (i % 3 - 1) * 0.05) * 100) / 100);
  check(nearestKit(noisy(K.RolandTR808.hatShape), K) === 'RolandTR808' && nearestKit(noisy(K.RolandTR707.hatShape), K) === 'RolandTR707' && nearestKit(null, K) === null, 'the drum machine whose hat shape is nearest wins');
  const near = rankKits(K.RolandTR909.hatShape, { A: { hatShape: K.RolandTR909.hatShape, hatBright: 9000 }, B: { hatShape: K.RolandTR909.hatShape.map((x, i) => (i === 3 ? x + 0.05 : x)), hatBright: 6500 } }, 6400);
  check(near[0].kit === 'B', 'two machines within the tie of the shape are told apart by the hats\' brightness', JSON.stringify(near));
  const flat = Array.from({ length: 2048 }, (_, k) => (k + 1) ** -2);
  check(hatShapeOf(flat, 44100).every(x => Math.abs(x) < 0.1), 'a hat shape leaves out the spectrum\'s tilt');
  const base = { bright: 0.2, low: 0.6, bassLo: 100, bassHi: 300 }, acid = { ...base, bassLo: 80, bassHi: 700 };
  check(/sawtooth.*sine\.range\(.*lpq\(8\)/.test(soundsOf([acid, acid], 'ours').bass) && !/lpq/.test(soundsOf([base, base], 'ours').bass), 'a bass whose brightness moves over the bar gets a sawtooth with a moving resonant filter', soundsOf([acid, acid], 'ours').bass);
  check(soundsOf([acid], 'simple').bass === soundsOf([base], 'simple').bass && soundsOf([acid], 'simple').kit === 'RolandTR909', 'Simple kit keeps one set of sounds');
  const Mk = { bpm: 124, barSeconds: 240 / 124, downbeat: 0, key: { root: 9, mode: 'minor' }, sections: [{ start: 0, bars: 4, kind: 'verse' }], ending: 4, drumSound: { kit: 'RolandTR808' }, bars: Array.from({ length: 4 }, () => ({ ...base, chord: 'Am', chordConf: 0.9, level: { drums: 1, bass: 1, chords: 1, other: 0 }, bass: Array(16).fill(null), drums: { bd: 'x...x...x...x...', cp: E, hh: '..x...x...x...x.', oh: E } })) };
  check(writeFull(Mk, { sounds: 'ours' }).tracks[0].settings.kit === 'RolandTR808' && writeFull(Mk, { sounds: 'simple' }).tracks[0].settings.kit === 'RolandTR909', 'level B writes the measured drum machine with Our sounds, the fixed one with Simple kit');
  // chords that ring on get a room; the Lead's sound follows the brightness
  { const rm = x => +((soundsOf([{ ...base, sustain: x }], 'ours').chords.match(/\.room\(([\d.]+)\)/) || [])[1] || 0); check(rm(1) === 0.9 && rm(0.8) > rm(0.4) && rm(0.4) > rm(0) && rm(0) === 0.3, 'chords get a room along their sustain: 0.3 for chords that stop, up to 0.9 for chords that ring to the end of the bar (round 8)', [rm(0), rm(0.4), rm(0.8), rm(1)].join(' ')); }
  check(soundsOf([{ ...base, bright: 0.6 }], 'ours').lead !== soundsOf([{ ...base, bright: 0.1 }], 'ours').lead, 'the Lead\'s sound follows the brightness');
  // the part levels: the balance moves the gains toward the original's band shares, and leaves them when it cannot
  const tr = () => [{ id: 'drums', type: 'drums', settings: { kit: 'RolandTR909' }, patterns: { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }, { id: 'bass', type: 'code', patterns: { A: { code: 'note("a1").s("sine").lpf(400).gain(.75)' } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }, { id: 'chords', type: 'code', patterns: { A: { code: 'chord("Am").voicing().s("triangle").lpf(1200).gain(.3)' } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }];
  const t1 = tr(), r1 = balanceLevels(t1, [0.5, 0.48, 0.02], 8), t2 = tr(), r2 = balanceLevels(t2, [0.05, 0.05, 0.9], 8);
  check(r1 && r1.after <= 0.1 && r1.after <= r1.before && JSON.stringify(t1) !== JSON.stringify(tr()) && r2 && r2.gains === null && JSON.stringify(t2) === JSON.stringify(tr()), 'the part levels come near the original\'s band shares, and stay as written when no gains can reach them', JSON.stringify({ r1, r2 }));
  // the prediction counts the steps a loop sounds and the hits a drum row plays (decode-refine D3, third round)
  check(stepShare('note("<[~!8 d1 d2 ~!6] [a1 ~ a1 ~]>").s("sine")') === 4 / 20 && stepShare('chord("<Am F>").voicing()') === 1, 'a loop\'s share of sounding steps', stepShare('note("<[~!8 d1 d2 ~!6] [a1 ~ a1 ~]>")'));
  { const dense = tr(), sparse = tr(); sparse[0].patterns.A.rows = { bd: 'x...............' }; const rd = balanceLevels(dense, [0.5, 0.48, 0.02], 8), rs = balanceLevels(sparse, [0.5, 0.48, 0.02], 8); check(rd && rs && rd.before !== rs.before, 'the drums\' predicted level follows the hits their rows play', JSON.stringify({ rd, rs })); }
  // the chords under a Lead lose their body (decode-refine D3, fourth round): over most of their bars only, never under a
  // muted Lead
  {
    const pad = (bars) => ({ id: 'chords', type: 'code', patterns: { A: { code: 'chord("<Am F>").voicing().s("triangle").lpf(1100).room(0.4).gain(.3)' } }, clips: [{ start: 0, bars, pattern: 'A' }] });
    const lead = (bars, hush) => ({ id: 'lead', type: 'code', patterns: { A: { code: 'n("0 2 4").scale("A3:minor").s("triangle").lpf(1600).gain(.25)' } }, clips: [{ start: 0, bars, pattern: 'A' }], ...(hush ? { hush: true } : {}) });
    // (round 6: only in a song with drums, and only when the balance kept the Lead within SOUND_RULE.leadKeep dB)
    const dr = () => ({ id: 'drums', type: 'drums', settings: {}, patterns: { A: { rows: { bd: 'x...x...x...x...' } } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] });
    const over = [pad(8), lead(6), dr()], under = [pad(8), lead(3), dr()], muted = [pad(8), lead(8, true), dr()], noDrums = [pad(8), lead(6)], quiet = [pad(8), lead(6), dr()];
    check(cutUnderLead(over, { lead: 1 }) && /\.hpf\(1200\)\.lpf\(4000\)\.room/.test(over[0].patterns.A.code) && !cutUnderLead(under) && !/hpf/.test(under[0].patterns.A.code) && !cutUnderLead(muted) && !cutUnderLead([pad(8), dr()]) && !cutUnderLead(noDrums) && !cutUnderLead(quiet, { lead: 0.16 }) && !/hpf/.test(quiet[0].patterns.A.code), 'chords under a Lead on most of their bars lose their body, not under a short, muted or turned-down Lead, nor without drums', over[0].patterns.A.code);
  }
  // the bass's drive (decode-refine 10.1, fifth round): a clipped sawtooth (odd harmonics) is driven, a plain one is not
  {
    const sr = 44100, notes = Array.from({ length: 32 }, (_, i) => ({ t: 0.05 + i * 0.12, midi: 33 })), f0 = 55;
    const saw = t => 2 * ((t * f0) % 1) - 1, clean = Float32Array.from({ length: 4.2 * sr }, (_, i) => 0.3 * saw(i / sr)), driven = clean.map(x => Math.tanh(20 * x) * 0.5);
    const a = bassDrive(clean, sr, notes), b = bassDrive(driven, sr, notes);
    // (round 6: the profile, the fundamental's share rising with the clip, and the drive of the nearest app bass)
    const da = bassDriveOf(a), db = bassDriveOf(b);
    check(a && b && b.h1 > a.h1 && db.drive > da.drive && bassDriveOf(null) === null && bassDriveOf({ h1: 0.97, evenOdd: -4, slope: -10 }).drive === 0 && bassDriveOf({ h1: 0, evenOdd: 3, slope: 8 }) === null && bassDrive(clean, sr, notes.slice(0, 4)) === null, 'a clipped bass gets a higher fundamental share and a larger drive than a plain sawtooth, a sine-like share none, too few notes no measure', JSON.stringify({ clean: a && [a.h1, a.evenOdd, da], driven: b && [b.h1, b.evenOdd, db] }));
    // (round 7: the drive rule on the bench's readings: a clean sawtooth at 0.58 (the drive-2 row is gone), a clean square
    // alone at -38 dB even/odd (square, no drive), a driven sawtooth at 4.5, a sine at 0.92; fixed scale. Round 8, the table
    // without the pad: a square by its even/odd from -15 dB down, the drive from the sawtooth rows at cutoff 700; a
    // driven bass read at 0.78 and -5.3 dB, which the pad's square row took, is a driven sawtooth)
    const R = (h1, evenOdd) => bassDriveOf({ h1, evenOdd, slope: -5 });
    check(R(0.582, 2.7).drive === 0 && R(0.706, -38).wave === 'square' && R(0.706, -38).drive === 0 && R(0.86, -5.6).drive === 4.5 && R(0.776, 1.7).drive === 3 && R(0.92, -3).wave === 'sine' && R(0.42, 2.8).drive === 0 && R(0.42, 2.8).wave === 'sawtooth' && R(0.78, -5.3).drive === 4.5 && R(0.78, -5.3).wave === 'sawtooth', 'the drive rule writes drive only from 3 up, never on a square, a square from -15 dB even/odd, a sine from 0.91', JSON.stringify([R(0.582, 2.7), R(0.706, -38), R(0.86, -5.6), R(0.776, 1.7), R(0.92, -3), R(0.78, -5.3)]));
  }
  // (round 8, fourth pass: a square under a pad for part of the song, its median even/odd near a sawtooth's but its lowest
  // tenth at -20 dB or under)
  check(bassDriveOf({ h1: 0.729, evenOdd: -1.9, eoLow: -23.5, slope: -6.6 }).wave === 'square' && bassDriveOf({ h1: 0.828, evenOdd: -0.6, eoLow: -2.8, slope: -6.6 }).drive === 3 && bassDriveOf({ h1: 0.729, evenOdd: -1.9, slope: -6.6 }).wave === 'sawtooth', 'round 8: a square from the lowest tenth of its even/odd readings (a pad over part of it), a driven sawtooth keeps its drive');
  // a driven bass (decode-refine 10.2, round 6): the app's drive after its filter with Our sounds, never with
  // Simple kit; the balance scales the clip's volume, not the gain before the clip
  {
    const dr = soundsOf([acid, acid], 'ours', [acid, acid], 4.5).bass, pl = soundsOf([base], 'ours', [base], 2).bass;
    check(/lpq\(4\)\.distort\(4\.5\)\.distortvol\(0\.5\)\.gain\(\.6\)$/.test(dr) && /\.distort\(2\)\.distortvol/.test(pl) && !/crush/.test(dr) && !/distort/.test(soundsOf([acid], 'ours').bass) && soundsOf([acid], 'simple', [acid], 4.5).bass === soundsOf([acid], 'simple').bass, 'a driven bass gets the app\'s drive at its measured amount after its filter, no crusher, a clean one none, Simple kit unchanged', dr);
    const t = [{ id: 'drums', type: 'drums', settings: { kit: 'RolandTR909' }, patterns: { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }, { id: 'bass', type: 'code', patterns: { A: { code: `note("a1 ~ a1 ~ a1 ~ a1 ~ a1 ~ a1 ~ a1 ~ a1 ~")${dr}` } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }];
    const r = balanceLevels(t, [0.6, 0.38, 0.02], 8), code = t[1].patterns.A.code;
    check(r && r.gains && /\.gain\(\.6\)$/.test(code) && (r.gains.bass === 1 || !/distortvol\(0\.5\)/.test(code)), 'the balance moves a driven bass by its clip\'s volume and keeps the gain before the clip', JSON.stringify({ r, code: code.slice(-70) }));
  }
  check(BASS_RULE.again === 1.15 && BASS_RULE.holdKeep === 0.6, 'round 8 (round 9: 1.15): a step that would hold the note before is the note struck again when its level rises 1.15 times over the step before');
  // the drums' drive (task 10.6, round 8): drives 1, 2 and 3 in the level table; a drive only when it brings the
  // high band's prediction nearer than the clean kit by DRUM_DRIVE.margin, so a file near the edge keeps its decision
  {
    const rows = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' }, kit = 'RolandTR909';
    const drumsOnly = () => [{ id: 'drums', type: 'drums', settings: { kit }, patterns: { A: { rows } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }];
    const pred = d => { const e = [0, 0, 0, 0, 0]; for (const [r, st] of Object.entries(rows)) PART_LEVELS[`drums:${kit}:${r}${d ? `:d${d}` : ''}`].forEach((x, j) => { e[j] += x * (st.match(/x/g) || []).length; }); const t = e.reduce((a, b) => a + b, 0); return e.map(x => x / t); };
    const at = sh => { const t = drumsOnly(); balanceLevels(t, sh, 8); return t[0].settings.drive || 0; };
    const near = pred(0).map((x, j) => (j === 4 ? x * 1.25 : x)), nt = near.reduce((a, b) => a + b, 0);
    check([1, 2, 3].every(d => PART_LEVELS[`drums:${kit}:bd:d${d}`]) && at(pred(1)) === 1 && at(pred(2)) === 2 && at(pred(0)) === 0 && at(near.map(x => x / nt)) === 0 && DRUM_DRIVE.margin === 0.5 && DRUM_DRIVE.full === 0.95, 'the drums get the drive whose rows match the high band (1, 2), none when the clean kit matches or comes within the margin', JSON.stringify([at(pred(1)), at(pred(2)), at(pred(0)), at(near.map(x => x / nt))]));
  }
  // (round 8, fourth pass: a drive that fills the high band only at the mid bands' cost is no drive: a clean kit whose
  // original has 4 times the predicted high band (hats the grid misses, a bright part) gets a drive from the high band
  // alone, and none once the whole fit must improve too)
  {
    const rows = { bd: 'x.....x...x.....', cp: '....x.......x...', hh: '..x...x.x.x...x.' }, kit = 'RolandTR909';
    const e = [0, 0, 0, 0, 0]; for (const [r, st] of Object.entries(rows)) PART_LEVELS[`drums:${kit}:${r}`].forEach((x, j) => { e[j] += x * (st.match(/x/g) || []).length; });
    e[4] *= 4; const tot = e.reduce((a, b) => a + b, 0);
    const at = () => { const t = [{ id: 'drums', type: 'drums', settings: { kit }, patterns: { A: { rows } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }]; balanceLevels(t, e.map(x => x / tot), 8); return t[0].settings.drive || 0; };
    const full = DRUM_DRIVE.full, now = at(); DRUM_DRIVE.full = 0; const off = at(); DRUM_DRIVE.full = full;
    check(now === 0 && off > 0, 'round 8: a drive that brings the high band nearer but not the whole spectrum is not written', JSON.stringify({ now, off }));
  }
  // (round 8, fourth pass: power chords only in a section with some top; voiced up from POWER_RULE.anchor, not into the
  // bass's band)
  {
    const pm = b => ({ ...Mk, key: { root: 4, mode: 'minor' }, bars: Mk.bars.map((x, i) => ({ ...x, chord: ['E', 'E', 'F', 'G'][i % 4], chordConf: 0.8, bright: b })) });
    const ch = b => (writeFull(pm(b)).tracks.find(t => t.id === 'chords') || { patterns: {} }).patterns;
    const lit = Object.values(ch(0.2)).map(p => p.code).join(' '), dark = Object.values(ch(0.03)).map(p => p.code).join(' ');
    check(/E5/.test(lit) && lit.includes(`.mode("above").anchor("${POWER_RULE.anchor}").voicing()`) && !/[A-G][#b]?5\b/.test(dark.replace(/\.anchor\("[a-g]\d"\)/g, '')), 'round 8: power chords voiced up from the anchor, none in a dark section (a driven bass alone)', JSON.stringify([lit.slice(0, 90), dark.slice(0, 60)]));
  }
  // (round 11, decode-hit-rhythm A: chords that hit with gaps are written with their rhythm, a held pad stays held)
  {
    const mk = (hitsS, held, tonal = 0.3) => ({ ...Mk, sections: [{ start: 0, bars: 8, kind: 'verse' }], ending: 8, bars: Array.from({ length: 8 }, (_, i) => ({ ...Mk.bars[0], chord: ['Am', 'F', 'C', 'G'][i % 4], chordHits: hitsS, chordHeld: held, chordTonal: tonal })) });
    const ch = m => Object.values((writeFull(m).tracks.find(t => t.id === 'chords') || { patterns: {} }).patterns).map(p => p.code).join(' ');
    const stab = ch(mk('x.x.x.x.x.x.x.x.', 0.16)), six = ch(mk('x.xx.x.xx.x.xx.x', 0.2)), pad = ch(mk('x...............', 0.66));
    check(stab.includes('.voicing().struct("x x x x x x x x")') && six.includes('.struct("x ~ x x ~ x ~ x x ~ x ~ x x ~ x")') && /voicing\(\)/.test(pad) && !/struct/.test(pad), 'round 11: stabs on eighths and a sixteenth rhythm are written with their struct, a held pad without', JSON.stringify([stab.slice(0, 80), six.slice(0, 80), pad.slice(0, 60)]));
    check(chordRhythm(['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x...x...x.x.x.x.']) === 'x x x x x x x x' && chordRhythm(['x...............']) === null, 'round 11: the chords\' rhythm is the steps hit in half the bars, on eight steps when every hit is on an even one');
    check(Math.abs(stepShare('chord("<Am F>").voicing().struct("x ~ x ~").s("sawtooth")') - 0.5) < 1e-9 && stepShare('chord("Am").voicing().s("sawtooth")') === 1, 'round 11: chords with a rhythm sound on their struct\'s hits in the balance');
    // (B) a section whose chord tones hold almost none of the band writes no chords
    check(!/struct/.test(ch(mk('x.x.x.x.x.x.x.x.', 0.16, 0.05))), 'round 11: no rhythm where the chord\'s own tones do not stand out of the band (a detuned pad under loud drums)');
  }
  // (round 11, decode-hit-rhythm C: a repeated bass under the kick)
  {
    const r = Array(16).fill(0).map((_, j) => (j % 4 === 0 ? 99 : 50)), lv = Array(16).fill(0).map((_, j) => (j % 4 === 0 ? 1 : 0.24)), lt = Array(16).fill(0.2);
    const bar = { drums: { bd: 'x...x...x...x...' }, bass: Array.from({ length: 16 }, (_, j) => (j % 4 >= 2 ? 33 : null)), bassAttack: { rise: r, level: lv, late: lt } };
    const clean = { drums: { bd: 'x...x...x...x...' }, bass: Array.from({ length: 16 }, (_, j) => (j % 4 === 2 ? 33 : null)), bassAttack: { rise: Array(16).fill(0).map((_, j) => (j % 4 === 2 ? 99 : 0.3)), level: lv, late: Array(16).fill(0.01) } };
    const f = bassFilled(bar), g = bassFilled(clean);
    check(f.every(x => x === 33) && g.filter(x => x !== null).length === 4, 'round 11: a distorted bass that attacks on every sixteenth is written on every step, the kick\'s too; an offbeat bass keeps its four notes', JSON.stringify([f, g]));
  }
  // (round 11, decode-hit-rhythm D: twin sections take the same parts)
  {
    const lv = { drums: 0.7, bass: 0.6, chords: 0.5, other: 0.6 }, secs = [{ start: 0, bars: 8, kind: 'drop' }, { start: 8, bars: 8, kind: 'drop' }], bars = Array.from({ length: 16 }, () => ({ level: lv, bright: 0.19 }));
    const tracks = [{ id: 'drums', type: 'drums', settings: {}, patterns: { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } }, B: { rows: { hh: '..x...x...x...x.' } } }, clips: [{ start: 0, bars: 8, pattern: 'A' }, { start: 8, bars: 8, pattern: 'B' }] },
      { id: 'bass', type: 'code', patterns: { A: { code: 'note("a1!16")' } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }];
    const pairs = twinParts(tracks, secs, bars);
    check(pairs.length === 1 && tracks[0].clips[1].pattern === 'A' && !tracks[0].patterns.B && tracks[1].clips.length === 2 && tracks[1].clips[1].start === 8, 'round 11: the second of two equal drops gets the kick and the bass of the first', JSON.stringify([pairs, tracks[0].clips, tracks[1].clips]));
  }
  // (round 12, decode-round12 1: quiet chords whose tones stand out are written, at a lower gain; a pad on the tonic with
  // the other third is kept as power chords)
  {
    const mk = (chord, level, tonal, key = { root: 9, mode: 'minor' }) => ({ ...Mk, key, sections: [{ start: 0, bars: 8, kind: 'verse' }, { start: 8, bars: 8, kind: 'verse' }], ending: 16, bars: Array.from({ length: 16 }, (_, i) => ({ ...Mk.bars[0], drums: { bd: E, cp: E, hh: E, oh: E }, chord: i < 8 ? chord : 'Am', chordConf: 0.8, chordTonal: i < 8 ? tonal : 0.3, chordHeld: 0.6, level: { drums: 0, bass: 0, chords: i < 8 ? level : 1, other: 0 } })) });
    const ch = m => writeFull(m).tracks.find(t => t.id === 'chords') || { clips: [], patterns: {} };
    const q = ch(mk('Am', 0.02, 0.3)), noise = ch(mk('Am', 0.02, 0.05)), gainOf = (t, start) => { const c = t.clips.find(x => x.start === start); return c ? +(/\.gain\(([\d.]+)\)(?!.*\.gain\()/.exec(t.patterns[c.pattern].code) || [])[1] : null; };
    check(q.clips.some(c => c.start === 0) && gainOf(q, 0) < gainOf(q, 8) && !noise.clips.some(c => c.start === 0), 'round 12: a quiet pad whose tones stand out is written at a lower gain; quiet chords from the drums\' noise are not', JSON.stringify([q.clips, gainOf(q, 0), gainOf(q, 8), noise.clips]));
    const e = ch(mk('E', 0.5, 0.35, { root: 4, mode: 'minor' })), e0 = ch(mk('E', 0.5, 0.05, { root: 4, mode: 'minor' }));
    const eCode = Object.values(e.patterns).map(p => p.code).join(' ');
    check(e.clips.some(c => c.start === 0) && /chord\("E5"\)/.test(eCode) && !e0.clips.some(c => c.start === 0), 'round 12: one chord on the tonic with the other third and its tones standing out is kept as a power chord; with no tonal share it stays out', JSON.stringify([e.clips, eCode.slice(0, 60), e0.clips]));
  }
  // (round 12, decode-round12 2: a major chord on a driven line's own note, sixteenths, is the line's harmonics)
  {
    const line = (chord, i) => ({ ...Mk.bars[0], chord, chordConf: 0.8, chordHeld: 0.15, chordTonal: 0.2, bass: Array(16).fill(33), bassAttack: { rise: Array(16).fill(3), level: Array(16).fill(1), late: Array(16).fill(0.5) } });
    const mk = (h1, minor = 0) => ({ ...Mk, key: { root: 9, mode: 'major' }, bassDrive: { h1, slope: -1, evenOdd: 0 }, sections: [{ start: 0, bars: 8, kind: 'verse' }], ending: 8, bars: Array.from({ length: 8 }, (_, i) => line(i < minor ? 'Am' : 'A', i)) });
    const has = m => !!writeFull(m).tracks.find(t => t.id === 'chords');
    check(lineChord(line('A'), 0.8) && !lineChord(line('Am'), 0.8) && !lineChord(line('A'), 0.4) && !has(mk(0.8)) && has(mk(0.4)) && has(mk(0.8, 3)), 'round 12: A major over a driven A line on sixteenths writes no chords; a plain bass, or minor stabs on a quarter of the bars, keep them', JSON.stringify([has(mk(0.8)), has(mk(0.4)), has(mk(0.8, 3))]));
  }
  // (round 12, decode-round12 3 and 4: the kick's click read as a clap on every beat a 16th late; a backbeat snare read as a
  // hat a 16th off the grid)
  {
    const bars = Array.from({ length: 4 }, () => ({ drums: { bd: 'x...x...x...x...', cp: '.x...x...x...x..', hh: E, oh: E } }));
    const p = kickClicks(bars, [0, 1, 2, 3]), plain = Array.from({ length: 4 }, () => ({ drums: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: E, oh: E } }));
    check(p === 1 && bars[0].drums.bd === '.x...x...x...x..' && bars[0].drums.cp === E && kickClicks(plain, [0, 1, 2, 3]) === 0, 'round 12: claps on every beat a 16th after the kicks become the kicks; backbeat claps stay', JSON.stringify(bars[0].drums));
    const hb = Array.from({ length: 6 }, (_, i) => ({ drums: { bd: E, cp: E, hh: i % 2 ? '.....x.......x..' : E, oh: i % 2 ? E : '.....x.......x..' } })), eighths = Array.from({ length: 6 }, () => ({ drums: { bd: E, cp: E, hh: 'x.x.x.x.x.x.x.x.', oh: E } }));
    check(offSnare(hb).length === 1 && hb[0].drums.cp === '.....x.......x..' && hb[0].drums.oh === E && !offSnare(eighths).length, 'round 12: closed or open hats on 5 and 13 alone, a backbeat snare a 16th off, become claps; eighth hats stay', JSON.stringify(hb[0].drums));
  }
  // (round 11, decode-hit-rhythm A: the measure on a synthetic bar: an A minor triad struck on eighths, then held)
  {
    const sr = 44100, bl = Math.round(sr * 240 / 124), x = new Float32Array(bl + sr), fs = [220, 261.63, 329.63, 440, 523.25, 659.25];
    const make = stab => { x.fill(0); for (let i = 0; i < bl; i++) { const t = i / sr, ph = (i % (bl / 8)) / sr, env = stab ? Math.exp(-ph / 0.04) : 1; let v = 0; for (const f of fs) v += Math.sin(2 * Math.PI * f * t); x[i + sr / 2] = 0.1 * env * v; } return chordHits(x, sr, sr / 2, bl, [9, 0, 4]); };
    const s1 = make(true), s2 = make(false);
    check(s1.hits === 'x.x.x.x.x.x.x.x.' && s1.held < CHORD_RULE.held && s2.n <= 1 && s2.held > 0.5, 'round 11: chordHits reads stabs on eighths and a held chord', JSON.stringify([s1, s2]));
  }
  // (round 8, fourth pass: a hat row on the backbeat where the clap row is silent is a snare read as a hat)
  {
    const mk = (hh, oh = '................') => Array.from({ length: 12 }, () => ({ drums: { bd: 'x...x...x...x...', cp: '................', hh, oh } }));
    const a = mk('....x.......x...'), b = mk('x.x.x.x.x.x.x.x.'), c = mk('x.x.x.x.x.x.x.x.', '........x.......');
    const ma = backbeatSnare(a), mb = backbeatSnare(b), mc = backbeatSnare(c);
    check(ma.length === 1 && a[0].drums.cp === '....x.......x...' && a[0].drums.hh === '................' && !mb.length && mc.length === 1 && c[0].drums.cp === '........x.......' && c[0].drums.oh === '................', 'round 8: a hat on the backbeat (4 and 12, or 8 of a half-time bar) with no clap there is a snare; eighth hats are not', JSON.stringify([ma, mb, mc]));
  }
  // (round 9: the beat phase from the claps, a tonic with no third, a hat with no top, a power chord with no riff, sounds by fit)
  {
    check(clapShift([0, 0, 64, 0]) === 2 && clapShift([0, 0, 0, 57]) === 3 && clapShift([60, 0, 28, 32]) === 0 && clapShift([0, 0, 10, 0]) === 0, 'round 9: claps on one other 16th of the beat move the phase there (60 % of at least 16), else nothing');
    const cx = (m3, M3) => { const v = Array(12).fill(0); v[4] = 1; v[7] = m3; v[8] = M3; return { chromaEx: v }; };
    const kb = Array.from({ length: 10 }, () => ({ chord: 'E', bass: [40, null, 38, null, 36, null, 40, null, null, null, null, null, null, null, null, null] }));
    const k1 = thirdlessMode({ root: 4, mode: 'major' }, kb, kb.map(() => cx(0.1, 0.1))), k2 = thirdlessMode({ root: 4, mode: 'major' }, kb, kb.map(() => cx(0.1, 0.6)));
    check(k1.mode === 'minor' && k2.mode === 'major', 'round 9: a tonic with neither third takes its mode from the bass and the roots (D and C over E: minor); a heard major third stays', `${k1.mode} ${k2.mode}`);
    const lit = Array.from({ length: 36 }, (_, i) => (i < 30 ? 0 : -0.5)), dead = Array.from({ length: 36 }, (_, i) => (i < 30 ? 0.2 : -5));
    const rk = rankKits(dead, { Lit: { hatShape: lit, hatBright: 8000 }, Dead: { hatShape: dead, hatBright: 8000 } }, null), rl = rankKits(lit, { Lit: { hatShape: lit, hatBright: 8000 }, Dead: { hatShape: dead, hatBright: 8000 } }, null);
    check(hatTop(dead) < -4 && rk[0].kit === 'Dead' && rl.length === 1 && rl[0].kit === 'Lit', 'round 9: a machine whose hat has no top over 11 kHz is left out when the track\'s hats have one', JSON.stringify([rk, rl]));
    const pm = (drums, bassOn) => ({ bpm: 120, downbeat: 0, barSeconds: 2, key: { root: 4, mode: 'minor' }, sections: [{ start: 0, bars: 8, kind: 'verse' }], ending: 8, shares: null, bars: Array.from({ length: 8 }, (_, i) => ({ chord: ['E', 'F', 'E', 'G'][i % 4], chordConf: 0.8, level: { drums: drums ? 1 : 0, bass: 1, chords: 0.8, other: 0.5 }, bright: 0.2, drums: drums ? { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.', oh: '................' } : { bd: '................', cp: '................', hh: '................', oh: '................' }, bass: bassOn ? [40, null, null, null, 40, null, null, null, 40, null, null, null, 40, null, null, null] : Array(16).fill(null) })) });
    const withRiff = writeFull(pm(true, true), { sounds: 'simple' }), alone = writeFull(pm(false, false), { sounds: 'simple' });
    check(/E5/.test(JSON.stringify(withRiff)) && !alone.tracks.some(t => t.id === 'chords'), 'round 9: power chords only where drums or bass play on half the section\'s bars', alone.tracks.map(t => t.id).join(','));
    const ft = [{ id: 'chords', type: 'code', patterns: { A: { code: 'chord("D").voicing().s("triangle").lpf(1600).gain(.3)' } }, clips: [{ start: 0, bars: 8, pattern: 'A' }] }];
    const fit = soundsByFit(ft, [0.05, 0.3, 0.3, 0.3, 0.05], 8);
    check(fit && fit.w !== 'triangle' && !/triangle/.test(ft[0].patterns.A.code), 'round 9: chords whose original fills 1-2 kHz leave the triangle for the wave the balance fits best', JSON.stringify(fit));
  }
  check(writeFull({ ...Mk, shares: [0.5, 0.48, 0.02] }, { sounds: 'simple' }).tracks.find(t => t.id === 'bass') === undefined || /gain\(\.75\)/.test(JSON.stringify(writeFull({ ...Mk, shares: [0.9, 0.05, 0.05] }, { sounds: 'simple' }))), 'Simple kit keeps its levels');
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

// the learned beat tracker (decode-beat-tracker, round 10; round 12: an option of Settings, off by default): the pure
// parts and the option always;
// the model itself when its files are in .cache/beat-this/ (git-ignored, downloaded by hand from the pinned URLs; skipped otherwise)
{
  const BT = await import('../src/decode/beat-this.js'), F = await import('../src/decode/full.js');
  check(Object.values(BT.BEAT_THIS_FILES).every(f => /^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/[0-9a-f]{40}\//.test(f.url) && /^[0-9a-f]{64}$/.test(f.sha256) && f.bytes > 0 && f.name.endsWith('.onnx')), 'beat tracker: every file has a URL at a fixed revision, a SHA-256 pin and a size, and is ONNX');
  check(JSON.stringify(BT.chunkStarts(5570)) === JSON.stringify([-6, 1482, 2970, 4076]) && JSON.stringify(BT.chunkStarts(1000)) === JSON.stringify([-6]), 'beat tracker: chunks as the reference code splits them (5570 frames: -6, 1482, 2970, 4076)', BT.chunkStarts(5570).join(','));
  const lg = new Float32Array(200).fill(-5); for (const i of [10, 11, 60, 110]) lg[i] = 2; lg[160] = 3; lg[162] = 1;
  check(JSON.stringify(BT.peaksOf(lg)) === JSON.stringify([0.21, 1.2, 2.2, 3.2]), 'beat tracker: peaks over 7 frames above 0, adjacent peaks merged, frames to seconds', BT.peaksOf(lg).join(','));
  // a steady 111 BPM over 6 minutes with frame-rounded beats, fake beats between some of them, downbeats on the second beat of four
  const P = 60 / 111, beats = [], downbeats = [];
  for (let k = 0; k < 660; k++) { const t = Math.round((0.31 + k * P) * 50) / 50; beats.push(t); if (k % 4 === 1) downbeats.push(t); if (k % 7 === 3) beats.push(Math.round((t + 0.75 * P) * 50) / 50); }
  beats.sort((a, b) => a - b);
  const g = BT.beatGrid({ beats, downbeats }, 360);
  check(g && Math.abs(g.bpm - 111) < 0.01 && Math.abs(g.beatPhase - 0.31) < 0.01 && Math.abs(g.downbeat - (0.31 + P)) < 0.01 && g.steady, 'beat tracker: a 6-minute grid at 111 BPM from frame-rounded beats with fake beats between them (tempo within 0.01, phase and downbeat within 10 ms)', g && `${g.bpm.toFixed(3)} BPM, phase ${g.beatPhase.toFixed(3)}, downbeat ${g.downbeat.toFixed(3)}`);
  const sparse = BT.beatGrid({ beats: [0.5, 1.3, 9, 30, 31, 58, 59.6, 80, 95, 112], downbeats: [] }, 112);
  check(!sparse || !sparse.steady, 'beat tracker: a pad with a beat now and then is not steady');
  const rel = (b, pick) => F.trackerGrid({ bpm: b, steady: true, lock: 0.9 }, pick);
  check(rel(124.02, 124).relation === 1 && rel(80, 160).bpm === 160 && rel(176, 88).bpm === 88 && rel(174, 116).tempo && rel(174, 116).bpm === 174 && rel(130, 100) === null && F.trackerGrid({ bpm: 124, steady: false, lock: 0.9 }, 124) === null, 'beat tracker: same, half, double and 3:2 relations to the picked tempo; the picked octave stays; no relation or unsteady beats: no grid');
  // (round 12) the option: off by default, on only with the user's choice or the local build flag, used only with the
  // files downloaded; the runtime imported by one module only, and that one only by the level B worker, dynamically
  {
    const ST = await import('../src/decode/beat-this-store.js');
    const mem = new Map(), fake = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
    const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true });
    const states = [];
    states.push([ST.BEAT_THIS_DEFAULT_ON, ST.beatThisChosen(), ST.beatThisOn()]);
    fake.setItem(ST.BEAT_THIS_KEY, JSON.stringify({ installed: true }));
    states.push([ST.beatThisChosen(), ST.beatThisOn()]);
    ST.setBeatThisChosen(true);
    states.push([ST.beatThisChosen(), ST.beatThisOn()]);
    fake.removeItem(ST.BEAT_THIS_KEY);
    states.push([ST.beatThisChosen(), ST.beatThisOn()]);
    ST.setBeatThisChosen(false);
    states.push([ST.beatThisChosen(), ST.beatThisOn(), fake.getItem(ST.BEAT_THIS_OPT)]);
    if (had) Object.defineProperty(globalThis, 'localStorage', had); else delete globalThis.localStorage;
    check(JSON.stringify(states) === JSON.stringify([[false, false, false], [false, false], [true, true], [true, false], [false, false, '"off"']]), 'beat tracker option: off by default (no build flag in Node) even with the files there; on with the files, used; on without them, not used; off again', JSON.stringify(states));
    const srcFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? srcFiles(path.join(dir, e.name)) : /\.m?js$/.test(e.name) ? [path.join(dir, e.name)] : []));
    const users = srcFiles('src').filter(f => /(from |import\()['"]onnxruntime-web/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative('src', f));
    const statics = srcFiles('src').filter(f => /^import [^(]*['"]\.\/engine-beat-this-browser\.js['"]/m.test(fs.readFileSync(f, 'utf8')));
    const wk = fs.readFileSync('src/decode/worker.js', 'utf8');
    check(JSON.stringify(users) === JSON.stringify(['decode/engine-beat-this-browser.js']) && !statics.length && /await import\('\.\/engine-beat-this-browser\.js'\)/.test(wk) && /beats \?/.test(wk), 'beat tracker: onnxruntime-web named only in engine-beat-this-browser.js, imported only dynamically by the level B worker when asked', users.join(','));
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    check(pkg.dependencies['onnxruntime-web'] === '1.31.1' && !(pkg.devDependencies || {})['onnxruntime-web'], 'beat tracker: onnxruntime-web pinned to 1.31.1 exactly, an app dependency');
  }
  const { BT_DIR, nodeBeatThis } = await import('./beat-this-node.mjs');
  if (Object.values(BT.BEAT_THIS_FILES).every(f => fs.existsSync(path.join(BT_DIR, f.name)))) {
    // a generated track at 124 BPM, analysed with and without the tracker
    const pcm = P124;
    if (pcm) {
      const on = await F.analyseFull(pcm, { beatTracker: nodeBeatThis }), off = await F.analyseFull(pcm, {});
      check(on.engines.grid === 'beat-this' && Math.abs(on.bpm - 124) < 0.01 && Math.abs(on.downbeat - off.downbeat) < 0.03 && on.beatTracker && on.beatTracker.used === 1, 'beat tracker: a generated track at 124 BPM gets the tracker\'s grid, the same tempo and downbeat as without it', `${on.bpm} BPM, downbeat ${on.downbeat} against ${off.downbeat}`);
      const fail = await F.analyseFull(pcm, { beatTracker: async () => { throw new Error('no files'); } });
      check(!fail.engines.grid && (fail.notes || []).some(x => /^Beat tracker failed/.test(x)) && Math.abs(fail.bpm - off.bpm) < 1e-9, 'beat tracker: a tracker that fails leaves a note and the grid of misk-analyzer');
    }
  } else console.log('skip  beat tracker: model files not in .cache/beat-this/');
}
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
