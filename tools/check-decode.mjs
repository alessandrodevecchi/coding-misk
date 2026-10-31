// Checks for the Decode tab (track-to-code), no browser: misk-analyzer on generated audio with a known truth (onsets of a
// click track, tempo at 90, 124 and 174 BPM, chords, key, grids, bass), the file name fallback, the fingerprint, the
// store's cap, version and backup records, the writer (header, Attribution, `// vox: …`, sound presets, parts from
// levels, the hysteresis of a fill, drums muted when they stop), the mix rules of the slider and the mutes, the look
// ahead horizons, tap tempo, and the code a decoded song shows at a bar with each look ahead.
//   npm run check:decode            (about 20 s)
//   npm run check:decode -- --app   also measures the app's own test songs exported to WAV (tools/decode-export.cjs)
import { createAnalyzer, horizonOf, tapTempo, LOOK_AHEAD, LOOK_AHEAD_DEFAULT } from '../src/decode/misk-analyzer.js';
import { writeSong, momentSong, partsByBar, soundsOf, loopAt, stepsMini, withVox, withoutVox, VOX_LINE, formatKey } from '../src/decode/writer.js';
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
import { measureApp, measureSynth } from './decode-measure.mjs';

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
  const list = Array.from({ length: 53 }, (_, i) => ({ fp: `k${i}`, used: i }));
  check(overCap(list).join() === 'k0,k1,k2' && DECODE_CAP === 50, 'store cap 50: the least recently used go first');
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
  const codeAt = bar => withVox(liveCode({ ...momentSong(M, bar, { title: 'Night Run', artist: 'Some Band' }), build: [], crescendo: { growth: 0 } }, C, {}).codeAt(0));
  const c8 = codeAt(8), c33 = codeAt(32), back = codeAt(39);
  check(/^\$: s\("bd\*4"\)/m.test(c8) && /note\(/.test(c8) && /chord\(/.test(c8), 'bar 9: drums, bass and chords lines', c8.split('\n').filter(l => /\$:/.test(l)).length + ' lines');
  check(c33.split('\n').filter(l => /bank\(/.test(l)).every(l => l.startsWith('_$:')) && /^\$: \(note/m.test(c33), 'bar 33: the drums stop, their lines muted with _$:, the bass plays on');
  check(c8.trimEnd().endsWith(VOX_LINE) && withoutVox(c8) === c8.replace(/\n*\/\/ vox: …\s*$/, ''), 'the vocals placeholder closes the code, and the evaluated code leaves it out');
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
// ---------- the app's own songs (optional) ----------
if (process.argv.includes('--app')) {
  const app = measureApp();
  if (!Object.keys(app).length) console.log('note  no WAV of the test songs in .cache/decode/wav: run tools/decode-export.cjs with the dev server');
  for (const [id, r] of Object.entries(app)) {
    check(Math.abs(r.bpm - r.bpmTruth) <= 0.1, `${id} (app export): tempo`, `${r.bpm}`);
    check(r.downbeat < 0.03, `${id} (app export): downbeat within 30 ms of the start`, `${r.downbeat} s`);
    check(r.f1.bd >= 0.7 && r.f1.cp >= 0.9 && r.f1.hh >= 0.8, `${id} (app export): drum grids`, JSON.stringify(r.f1));
    console.log(`info  ${id}: chords ${r.chords}, key ${r.key ? `${r.key.root} ${r.key.mode}` : '-'} (${r.keyOk ? 'right' : 'wrong'}), drums on/off ${r.drumsPresence}`);
  }
}
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
