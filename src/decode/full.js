// Level B, the whole file (track-to-code D5, D6, D7, D9): misk-analyzer reads every frame, the bars, grids, bass and
// levels as level A does, and adds the whole-file steps: one beat grid for the whole track, the key, the chords, the
// sections, the ending. Essentia.js gives the tempo, the key and the chords when it loads; when it cannot load or
// fails, misk-analyzer computes the three itself and level B still finishes. The model records which engine gave each
// measure. Pure (the engine is passed in): the level B worker runs it, and the Node checks.
import { createAnalyzer, ANALYSIS_RATE } from './misk-analyzer.js';
import { chordName, parseChord } from './model.js';
import { sectionsOf } from './sections.js';
import { variationsOf } from './writer.js';
import { mixHatShape, mixHatBright, rankKits, bandEnergy, sustainOf, bassDrive, LEVEL_BANDS } from './kit-measure.js';
import { KIT_MEASURES } from './kits.js';
import { beatGrid, phaseOn } from './beat-this.js';
import { chordHits, bassAttack, bassPcs } from './hit-measure.js';

export const MISK = 'misk-analyzer';
// Essentia.js's tempo is taken when its confidence (RhythmExtractor2013 multifeature, 0 to about 5.3) is at least this
export const ESSENTIA_CONFIDENT = 2.5;
// … and from this confidence when misk-analyzer's tempo agrees with it (the two analyses confirm each other): on the test
// track the confidence is 2.503 to 2.509 and changes between identical calls, so the threshold alone flipped the engine
export const ESSENTIA_CONFIRMED = 2.0;
const RATIOS = [1, 2, 0.5, 1.5, 2 / 3];
const agrees = (a, b) => a > 0 && b > 0 && RATIOS.some(r => Math.abs((a * r) / b - 1) < 0.03);

// the tempo of level B (D7): a tempo the user tapped or picked (½×, 2×) wins; else Essentia.js's whole-track tempo
// when it is confident, in misk-analyzer's octave when the two are half or double of each other (the backbeat rule of
// D7 settles the octave); else misk-analyzer's own. → { bpm, from }
export function pickTempo(misk, ess, user = null) {
  if (user && user.bpm > 0) return { bpm: user.bpm, from: user.tapped ? 'tapped' : 'picked' };
  let pick = { bpm: misk ? misk.bpm : 120, from: MISK };
  if (ess && ess.bpm > 0 && (ess.confidence >= ESSENTIA_CONFIDENT || (ess.confidence >= ESSENTIA_CONFIRMED && misk && agrees(ess.bpm, misk.bpm)))) {
    let bpm = ess.bpm;
    if (misk && misk.bpm > 0) for (const r of [2, 0.5, 1.5, 2 / 3]) if (Math.abs((bpm * r) / misk.bpm - 1) < 0.03) bpm *= r;
    pick = { bpm, from: 'essentia.js' };
  }
  return threeAgree(pick, ess);
}
// the vote of three (decode round 8): when Essentia.js's three tempo estimates (RhythmExtractor2013, Percival and
// Degara's beat interval) agree within 4 % and the tempo picked is not theirs, theirs wins; a picked tempo exactly
// double or half of theirs stays unless RhythmExtractor2013 is very confident (a double-time hi-hat groove and a
// half-time one look alike to the three). Bench: a boom bap song read at 180 goes to 90 (confidence 4.0) and the app's
// own radio song at 176 stays (the three say 88 at 2.7); in a sample of 26 real tracks 5 move, all to the tempo a
// learned beat tracker finds too.
// (round 8, third pass: the three agree also when Percival or Degara reads an octave of RhythmExtractor2013's tempo, but
// only for a move that is no octave (a 3:2 reading: one real file at 107 where the three say 161); a pick at half of
// the three moves up from confidence `halfConfidence` when the three agree as read (one real file at 64, the three at
// 128 with confidence 2.2), a pick at double only above `octaveConfidence` as before (the app's radio song at 176)
export const TEMPO_VOTE = { near: 0.04, octaveConfidence: 3.5, halfConfidence: 2.0, fold: true, middle: 0.015 };
export function threeAgree(pick, ess, rule = TEMPO_VOTE) {
  if (!ess || !(ess.bpm > 0 && ess.percival > 0 && ess.degara > 0)) return pick;
  const fold = x => { if (!rule.fold) return x; for (const r of [2, 0.5]) if (Math.abs((x * r) / ess.bpm - 1) < rule.near) return x * r; return x; };
  const three = [ess.bpm, fold(ess.percival), fold(ess.degara)].sort((a, b) => a - b), mid = three[1], near = (a, b) => Math.abs(a / b - 1) < rule.near;
  if (!three.every(x => near(x, mid)) || near(pick.bpm, mid)) return pick;
  const k = pick.bpm / mid;
  if (Math.abs(k - 2) < 0.08 && !(ess.confidence >= rule.octaveConfidence)) return pick;
  const raw = [ess.bpm, ess.percival, ess.degara].every(x => near(x, mid));
  if (Math.abs(k - 0.5) < 0.02 && !(raw && ess.confidence >= (rule.halfConfidence ?? rule.octaveConfidence))) return pick;
  // (round 9: the middle of the three when RhythmExtractor2013's own lies further from it than `middle`, the reach of the
  // fine grid's search (1.5 %): one real file read 184.6 where the other two say 179.8 and 178.2 doubled, and the fine
  // grid kept the 3 % error; a learned beat tracker says 180. Within the reach its own stays: the middle moved a 6-minute
  // file from 111.0 to 111.2 and its grid drifted)
  return { bpm: rule.middle && Math.abs(ess.bpm / mid - 1) > rule.middle ? mid : ess.bpm, from: 'essentia.js', vote: true };
}

// the beat phase checked on the claps (decode round 9): a clap plays on a beat (two and four, or three in a half-time
// groove). When at least PHASE_RULE.share of the file's claps (and PHASE_RULE.min of them) sit on one other 16th of the
// beat, the grid is a 16th, an eighth or three 16ths off: a rolling bass on the offbeats read as kicks put the beat
// there. Bench: three songs off (a driven 606 and a driven 505 under rolling basses, an eighth; a driven techno kit, a
// 16th), their claps 73 to 100 % on one wrong position; every song and real track on the right beat at most 44 %.
// counts: claps per 16th position inside the beat (0 on the beat) → the 16ths to move the phase by, 0 for none
export const PHASE_RULE = { share: 0.6, min: 16 };
export function clapShift(counts, rule = PHASE_RULE) {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n < rule.min) return 0;
  for (let p = 1; p < 4; p++) if (counts[p] >= rule.share * n) return p;
  return 0;
}

// the mode of a key whose tonic has no third (decode round 9): over the bars whose chord root is the key's root, the
// chroma without the bass notes' upper harmonics (misk-analyzer's chromaEx) holds both thirds under MODE_RULE.third of
// the root (the riff below reads 0.12 and 0.21; the files that keep their mode read a third of 0.26 or more) (a power-chord riff, a drone: a distorted note's fifth harmonic reads as a major third, so the chord reads
// major), on at least MODE_RULE.bars bars. The mode is then the scale's: the bass notes and the chord roots (a root
// counting MODE_RULE.root notes) on the minor degrees (3, 8 and 10 semitones up) against the major ones (4, 9, 11); it
// changes when one side has at least MODE_RULE.ratio times the other and MODE_RULE.min in all. Bench: a driven techno
// song read G major goes to G minor (207 against 4; its truth, A minor, is still missed); real tracks: a midtempo riff read E major goes to E minor (the
// key a label gives and the one its separated harmonic parts give); no other file fires. → the key (the same object when
// nothing changes)
export const MODE_RULE = { third: 0.25, bars: 8, root: 4, ratio: 2, min: 20 };
export function thirdlessMode(key, bars, raw, rule = MODE_RULE) {
  if (!key || !raw) return key;
  const r = key.root;
  let n = 0, s0 = 0, s3 = 0, s4 = 0;
  bars.forEach((b, i) => { const c = parseChord(b.chord), v = raw[i] && raw[i].chromaEx; if (!c || c.root !== r || !v) return; n++; s0 += v[r]; s3 += v[(r + 3) % 12]; s4 += v[(r + 4) % 12]; });
  if (n < rule.bars || !(s0 > 0) || s3 >= rule.third * s0 || s4 >= rule.third * s0) return key;
  let mi = 0, ma = 0;
  const deg = (x, w) => { const d = (((x - r) % 12) + 12) % 12; if (d === 3 || d === 8 || d === 10) mi += w; if (d === 4 || d === 9 || d === 11) ma += w; };
  for (const b of bars) { for (const x of b.bass || []) if (x !== null && x !== undefined) deg(x, 1); const c = parseChord(b.chord); if (c) deg(c.root, rule.root); }
  const mode = mi >= rule.min && mi >= rule.ratio * ma ? 'minor' : ma >= rule.min && ma >= rule.ratio * mi ? 'major' : key.mode;
  return mode === key.mode ? key : { ...key, mode };
}

// a chord per bar from chords per interval (Essentia.js), `per` intervals a bar: the chord with the most strength
export function barChords(perBeat, beatsPerBar = 4) {
  const out = [];
  for (let i = 0; i * beatsPerBar < perBeat.length; i++) {
    const score = new Map();
    for (const x of perBeat.slice(i * beatsPerBar, (i + 1) * beatsPerBar)) { const c = parseChord(x.chord); if (!c) continue; const k = chordName(c.root, c.quality); score.set(k, (score.get(k) || 0) + (x.strength || 0)); }
    let best = null; for (const [k, v] of score) if (!best || v > best.v) best = { k, v };
    out.push(best ? { chord: best.k, conf: Math.round(Math.min(1, best.v / beatsPerBar) * 100) / 100 } : null);
  }
  return out;
}

// the mode of a key settled by chord evidence (D5): between the key and its relative, the tonic chord heard more often,
// a bar that opens a four-bar phrase counting twice (a loop of Am F C G opens on Am); the first chord heard counts three
// bars more, the last one and a half, as misk-analyzer's own key
export function settleMode(key, bars) {
  const rel = key.mode === 'major' ? { root: (key.root + 9) % 12, mode: 'minor' } : { root: (key.root + 3) % 12, mode: 'major' };
  const heard = bars.map((b, i) => ({ ...b, i })).filter(b => b.chord && (!b.level || b.level.chords >= 0.2)), name = k => chordName(k.root, k.mode === 'minor' ? 'min' : 'maj');
  const score = k => heard.reduce((a, b) => a + (b.chord === name(k) ? (b.i % 4 === 0 ? 2 : 1) : 0), 0) + (heard[0] && heard[0].chord === name(k) ? 3 : 0) + (heard.length && heard[heard.length - 1].chord === name(k) ? 1.5 : 0);
  return score(rel) > score(key) ? { ...key, root: rel.root, mode: rel.mode } : key;
}

// the top line's frames (Essentia.js, { hop, sr, pitch, conf }) as one note per 16th step: the frames in the middle 60 %
// of the step, a note where at least half of them are voiced (their median pitch, fractional MIDI) → per bar 16 values
// Essentia.js's melody reports a pitch about 60 ms after it sounds (MELODIA's frames and its contour smoothing; measured
// on a generated hook: 0.06 s puts every note on its step, none puts it a 16th late)
export const MELODY_LAG = 0.06;
export function melodySteps(mel, downbeat, barSec, n) {
  const step = barSec / 16, fps = mel.sr / mel.hop, out = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < 16; j++) {
      const t0 = downbeat + i * barSec + j * step + MELODY_LAG, a = Math.max(0, Math.round((t0 + 0.2 * step) * fps)), z = Math.min(mel.pitch.length, Math.round((t0 + 0.8 * step) * fps));
      const v = []; for (let k = a; k < z; k++) if (mel.pitch[k] > 0) v.push(69 + 12 * Math.log2(mel.pitch[k] / 440));
      v.sort((x, y) => x - y);
      row.push(z > a && v.length >= 0.5 * (z - a) ? v[Math.floor(v.length / 2)] : null);
    }
    out.push(row);
  }
  return out;
}
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
// a fractional MIDI note → a whole note: the key's scale note when within 40 cents of it, else the nearest semitone
export function snapToKey(x, key) {
  if (x === null || x === undefined || !Number.isFinite(x)) return null;
  if (key) { const sc = SCALES[key.mode === 'major' ? 'major' : 'minor']; for (const d of [Math.floor(x), Math.ceil(x)]) if (Math.abs(x - d) <= 0.4 && sc.includes((((d - key.root) % 12) + 12) % 12)) return d; }
  return Math.round(x);
}

// Essentia.js's chord for a bar replaces misk-analyzer's: the `third` mark (a quiet minor third over misk-analyzer's
// chord) belongs to that chord's root and goes when the root changes, or quietMinors would make the new chord minor
// (an F with a quiet minor third under Essentia.js's E turned Em). Changes the bar in place
export function takeChord(b, c) {
  const x = parseChord(b.chord), y = parseChord(c.chord);
  if (!x || !y || x.root !== y.root) delete b.third;
  b.chord = c.chord; b.chordConf = c.conf;
  return b;
}
// the phantom parts (decode round 8): parts the analysis finds in a track that has none. noBeat: Essentia.js's tempo
// confidence under this means no steady beat, and level B writes no drums (on the bench a pad-only song reads -0.11;
// every song with drums 1.6 or more, and in a sample of 33 real tracks 0.87 or more); lowShare and h1: the original's 20-150 Hz share of the energy
// under lowShare and the decoded bass notes with almost no energy at their own fundamental (the bass profile's h1 under
// h1) mean the notes are a pad's or a voice's low notes, and level B writes no bass (the pad-only song: 0.20 and 0.00;
// the lowest share of a song with a bass 0.39, and a bass decoded an octave off keeps a share of 0.48 or more)
export const PARTS_RULE = { noBeat: 0.4, lowShare: 0.3, h1: 0.1 };
// → whether a file has no steady beat (null when Essentia.js gave no tempo: unknown, so nothing changes)
export const noSteadyBeat = (ess, rule = PARTS_RULE) => (ess && Number.isFinite(ess.confidence) ? ess.confidence < rule.noBeat : null);
// → whether the decoded bass notes are no bass (the low band's share of the original, the bass profile)
export const noBassPart = (shares, drive, rule = PARTS_RULE) => !!(shares && drive && Number.isFinite(drive.h1) && shares[0] < rule.lowShare && drive.h1 < rule.h1);

// harmony and bass per section (decode-refine D5); the numbers in one place
// a snare read as a hat (round 8, fourth pass): a bright snare with a long reverb (a gated synthwave snare, an IDM
// snare) rises in the hat band as much as in the snare band, so it fails the clap test and is written as a closed or open
// hat on the backbeat. A hat row that plays the backbeat (steps 4 and 12, or step 8 of a half-time bar) on at least
// SNARE_RULE.on of the bars with drums, where the clap row plays on at most SNARE_RULE.cp of them, and its other steps on
// at most SNARE_RULE.rest of that (an accent, not a hat pattern) is a snare: those hits move to the clap row. On the
// bench no song fires (its hats play eighths or offbeats); on the real set two: a retrowave snare on step 8 at 160
// (read as an open hat) and an IDM snare on 4 and 12 (read as a closed hat). Changes the bars in place → the moves
export const SNARE_RULE = { on: 0.75, cp: 0.25, rest: 0.5, sets: [[4, 12], [8]] };
export function backbeatSnare(bars, rule = SNARE_RULE) {
  const B = bars.filter(b => b.drums && Object.values(b.drums).some(r => r && r.includes('x')));
  if (B.length < 8) return [];
  const share = (r, j) => B.filter(b => (b.drums[r] || '')[j] === 'x').length / B.length, moves = [];
  for (const r of ['hh', 'oh']) for (const set of rule.sets) {
    const on = Math.min(...set.map(j => share(r, j)));
    if (on < rule.on || set.some(j => share('cp', j) > rule.cp)) continue;
    const rest = Math.max(...Array.from({ length: 16 }, (_, j) => j).filter(j => !set.includes(j)).map(j => share(r, j)));
    if (rest > rule.rest * on) continue;
    for (const b of B) {
      const row = [...(b.drums[r] || '.'.repeat(16))], cp = [...(b.drums.cp || '.'.repeat(16))];
      for (const j of set) if (row[j] === 'x') { row[j] = '.'; cp[j] = 'x'; }
      b.drums[r] = row.join(''); b.drums.cp = cp.join('');
    }
    moves.push({ row: r, steps: set, on: Math.round(on * 100) / 100 });
  }
  return moves;
}
export const HARMONY_RULE = { clear: 0.8, clearBars: 2, range: 7, quietBass: 0.2, rootNotes: 2, rootShare: 0.6 };
// a bar misk-analyzer marked `third` (a quiet minor third over a major third the bass's harmonics explain) is minor when
// the key holds that minor chord and not the major one (decode-refine D5: luci-rosse's Am stab under its distorted acid
// bass read as A by both engines). Changes the bars in place
export function quietMinors(bars, key) {
  if (!key) return;
  const deg = key.mode === 'minor' ? { 0: 'min', 3: 'maj', 5: 'min', 7: 'min', 8: 'maj', 10: 'maj' } : { 0: 'maj', 2: 'min', 4: 'min', 5: 'maj', 7: 'maj', 9: 'min' };
  for (const b of bars) { const c = b.third && parseChord(b.chord); if (c && c.quality === 'maj' && deg[(c.root - key.root + 12) % 12] === 'min') b.chord = chordName(c.root, 'min'); }
}
// a chord's quality inside a section follows the section's majority for its root, unless the other quality wins clearly
// (confidence above `clear`) in at least `clearBars` bars of the section (the analysis flips the third of a chord
// under a bright bass). Changes the bars in place
// (a tie goes to the quality the key gives that root, when it gives one)
export function steadyQualities(bars, sections, rule = HARMONY_RULE, key = null) {
  const inKey = root => { if (!key) return null; const d = (root - key.root + 12) % 12, deg = key.mode === 'minor' ? { 0: 'min', 3: 'maj', 5: 'min', 7: 'min', 8: 'maj', 10: 'maj' } : { 0: 'maj', 2: 'min', 4: 'min', 5: 'maj', 7: 'maj', 9: 'min' }; return deg[d] || null; };
  for (const sec of sections) {
    const list = bars.slice(sec.start, sec.start + sec.bars);
    const by = new Map();
    for (const b of list) { const c = parseChord(b.chord); if (!c) continue; const x = by.get(c.root) || { maj: 0, min: 0, clear: { maj: 0, min: 0 } }; x[c.quality]++; if ((b.chordConf || 0) > rule.clear) x.clear[c.quality]++; by.set(c.root, x); }
    for (const b of list) {
      const c = parseChord(b.chord), x = c && by.get(c.root);
      if (!x) continue;
      const major = x.maj === x.min ? inKey(c.root) || c.quality : x.maj > x.min ? 'maj' : 'min';
      if (c.quality !== major && x.clear[c.quality] < rule.clearBars) b.chord = chordName(c.root, major);
    }
  }
}
// the bass of a section keeps one octave range of 2·`range` semitones (D5: the median note plus or minus `range`; here the
// window that holds the most notes), a note outside moved by octaves into it; a bar whose bass level is below `quietBass` of the section's loudest has no bass notes (YIN follows a
// voice or a lead there). Changes the bars in place
export function bassRange(bars, sections, rule = HARMONY_RULE) {
  for (const sec of sections) {
    const list = bars.slice(sec.start, sec.start + sec.bars), top = Math.max(0, ...list.map(b => (b.level ? b.level.bass || 0 : 0)));
    // (round 9: a quiet bar keeps notes that sit on its chord's root, at least `rootNotes` of them and most of its notes: a
    // bass of a few short notes reads a low mean level, and a test song's bar of three A1 notes under Am at 0.15 of the
    // section's loudest lost them all; a voice or a lead that YIN follows does not stay on the chord's root)
    const onRoot = b => { const c = parseChord(b.chord), xs = (b.bass || []).filter(x => x !== null && x !== undefined); if (!c || xs.length < rule.rootNotes) return false; return xs.filter(x => ((x % 12) + 12) % 12 === c.root).length >= Math.max(rule.rootNotes, rule.rootShare * xs.length); };
    for (const b of list) if (b.level && top > 0 && (b.level.bass || 0) < rule.quietBass * top && b.bass && !onRoot(b)) b.bass = b.bass.map(() => null);
    const notes = list.flatMap(b => (b.bass || []).filter(x => x !== null && x !== undefined)).sort((x, y) => x - y);
    if (!notes.length) continue;
    // (the range: the 2·range+2 notes, a 15-semitone span, that hold the most notes, the nearest to the median on a tie; a riff that jumps
    // an octave, as luci-rosse's acid line, keeps both octaves, which a range around the median itself would fold)
    const med = notes[Math.floor(notes.length / 2)], span = 2 * rule.range + 1;
    let lo = med - rule.range, most = -1;
    for (let a = notes[0] - span; a <= notes[notes.length - 1]; a++) { const n = notes.filter(x => x >= a && x <= a + span).length; if (n > most || (n === most && Math.abs(a + rule.range - med) < Math.abs(lo + rule.range - med))) { most = n; lo = a; } }
    for (const b of list) if (b.bass) b.bass = b.bass.map(x => { if (x === null || x === undefined) return x; let y = x; while (y > lo + span) y -= 12; while (y < lo) y += 12; return y; });
  }
}

// the learned beat tracker in level B (decode round 10, decode-beat-tracker; bench only: decode-bench.cjs --beat-this,
// the app passes no tracker): Beat This! tracks the beats of the whole file (beat-this.js beatGrid: one tempo for the whole file, the beat phase, the
// downbeats). It counts only when its beats are steady (`steady`) and lock to one grid (`lock`), and the tempo picked
// above (misk-analyzer, Essentia.js, the vote) keeps its octave: the tracker reads some half-time grooves at half (a real
// track at 160 read 80). Relations to the picked tempo: the same within `same`, half or double, or 3:2 (a drum and bass
// song picked at 116 where the tracker says 174: its tempo, when `threeTwo`); anything else: as without it.
// What it gives (see analyseFull): the tempo, misk-analyzer's line fit when that came out whole and within `keep` of
// the tracker's, else the tracker's (whole within `whole`); the phase, misk-analyzer's onsets' unless the tracker's
// beats lie at least `half` of a beat from it; the downbeat, the beat of four that holds at least `share` of the
// tracker's downbeats.
// (whole: the tracker's beats are rounded to 20 ms frames and read 124.02 for a song at 124; keep: it read a 30-second
// song at 138 as 137.83 where the onsets fit 138 exactly; half: on two of the owner's files its beats sit a sixteenth
// after the kicks, on a breakbeat song the onsets' phase sits half a beat off and the tracker's is right)
export const BEAT_RULE = { use: true, same: 0.02, lock: 0.5, threeTwo: true, downbeat: 'tracker', share: 0.4, whole: 0.06, keep: 0.3, half: 0.375, move: 0.2 };
// the whole tempo without the tracker (round 10): grid, how far the line fit may be from the whole tempo; ess, how far
// RhythmExtractor2013's tempo may be from it
export const WHOLE_RULE = { grid: 0.2, ess: 0.15 };
export function trackerGrid(bt, pick, rule = BEAT_RULE) {
  if (!rule.use || !bt || !bt.steady || !(bt.lock >= rule.lock)) return null;
  const k = bt.bpm / pick, is = (x, tol) => Math.abs(k / x - 1) < tol;
  if (is(1, rule.same)) return { bpm: bt.bpm, relation: 1 };
  if (is(0.5, rule.same)) return { bpm: bt.bpm * 2, relation: 0.5 };
  if (is(2, rule.same)) return { bpm: bt.bpm / 2, relation: 2 };
  if (rule.threeTwo && (is(1.5, rule.same) || is(2 / 3, rule.same))) return { bpm: bt.bpm, relation: k > 1 ? 1.5 : 2 / 3, tempo: true };
  return null;
}

// pcm: mono at `sr`; engine: null, or async () → an engine (engine-essentia.js) that may throw; tempo: a tapped tempo
// { bpm, downbeat }; beatTracker: null, or async () → a beat tracker (engine-beat-this.js) that may throw;
// onProgress(fraction, stage). → the level B model
export async function analyseFull(pcm, { sr = ANALYSIS_RATE, engine = null, tempo = null, beatTracker = null, onProgress = () => {} } = {}) {
  const t0 = Date.now(), A = createAnalyzer(pcm, { sr }), duration = A.duration, engines = { tempo: MISK, key: MISK, chords: MISK }, notes = [];
  const pause = () => new Promise(r => setTimeout(r, 0));
  // 1. frames, a slice at a time (the progress moves; a cancel is the worker's end)
  for (let t = 0; t < duration; t += 20) { A.advance(Math.min(duration, t + 20)); onProgress(0.3 * Math.min(1, (t + 20) / duration), 'frames'); await pause(); }
  // 2. misk-analyzer's tempo, as level A locks it (the first seconds of music)
  const misk = A.lock(duration) || { bpm: 120, downbeat: 0, confidence: 0, uncertain: true };
  // 3. Essentia.js, when it loads
  let E = null;
  if (engine) { try { E = await engine(); } catch (e) { notes.push(`Essentia.js did not load: ${e && e.message || e}`); } }
  onProgress(0.33, 'tempo');
  let ess = null;
  if (E) { try { ess = E.rhythm(pcm); } catch (e) { notes.push(`Essentia.js tempo failed: ${e && e.message || e}`); } }
  await pause();
  // 3b. the learned beat tracker, when it is downloaded (decode round 10)
  let bt = null;
  if (beatTracker && !(tempo && tempo.bpm > 0)) {
    try {
      const T = await beatTracker();
      onProgress(0.34, 'beats');
      const r = await T.track(pcm, sr, { onProgress: f => onProgress(0.34 + 0.05 * f, 'beats') });
      bt = beatGrid(r, duration);
      if (bt) bt.ms = r.ms;
    } catch (e) { notes.push(`Beat tracker failed: ${e && e.message || e}`); }
  }
  // 4. one beat grid for the whole file: the tempo picked, fitted on the onsets of the whole file, and its downbeat
  const pick = pickTempo(misk, ess, tempo);
  if (pick.from !== MISK) engines.tempo = pick.from;
  let bpm = pick.bpm, downbeat = misk.downbeat, phaseMoved = 0;
  const m0 = {};
  if (pick.from === 'tapped') downbeat = tempo.downbeat ?? misk.downbeat;
  else {
    // the tempo made exact on the whole file (a comb), the beat phase from every onset, a line through the onsets, then
    // the downbeat (Essentia.js's own estimate is 0.1 to 0.9 BPM off on the test songs and its beats 10 to 60 ms late:
    // it sets the tempo's octave and region, misk-analyzer the grid the code plays on)
    const tg = bt && trackerGrid(bt, bpm);
    const b0 = A.wholeTempo(bpm), g = A.fitGrid(b0, A.wholePhase(b0));
    if (tg) {
      // (round 10: the tracker's grid, see BEAT_RULE) the tempo: misk-analyzer's line fit when it came out whole and
      // within `keep` of the tracker's (its onsets place a steady track to the millisecond; the tracker read a 30-second
      // song at 138 as 137.83), else the tracker's, taken whole within `whole`
      const whole = x => Math.abs(x - Math.round(x)) < 1e-6;
      // (and misk-analyzer's tempo stays when the tracker's lies further than `move` from it at the same octave: a gate
      // measured on the real set, see the round 10 notes)
      const tt = BEAT_RULE.whole && Math.abs(tg.bpm - Math.round(tg.bpm)) < BEAT_RULE.whole ? Math.round(tg.bpm) : tg.bpm;
      bpm = (whole(g.bpm) && Math.abs(g.bpm - tg.bpm) < BEAT_RULE.keep) || (!tg.tempo && Math.abs(tt - g.bpm) > BEAT_RULE.move) ? g.bpm : tt;
      const btBpm = bt.bpm * (bpm / tg.bpm), btPhase = phaseOn(bt.times, 60 / btBpm);
      const P = 60 / bpm, btP = 60 / btBpm;
      // the phase: misk-analyzer's onset phase at this tempo (the onsets place the grid to the millisecond; on two of the
      // owner's files the tracker's beats sit a sixteenth after the kicks), unless the tracker's beats lie about half a
      // beat away from it (`half`, a breakbeat song whose syncopated kick pulls the onsets' phase to the offbeat); at
      // half or double tempo the tracker's phase only picks which of the onset grids' beats is the beat. Then the claps'
      // check of round 9 as without the tracker
      const own = g.bpm === bpm ? g.beatPhase : A.wholePhase(bpm), dist = (x, y, p) => { const r = ((((x - y) % p) + p) % p); return Math.min(r, p - r); };
      let phase = own;
      if (tg.relation === 1 || tg.tempo) { if (dist(btPhase, own, P) >= BEAT_RULE.half * P) phase = btPhase % P; }
      const sh = clapShift(A.clapPositions(bpm, phase));
      if (sh) { phase += (sh * 15) / bpm; phaseMoved = sh; }
      // the downbeat: the tracker's when it marks one beat of four clearly (its downbeats on a single beat in `share` of
      // the cases or more) and the tempo is its own, else misk-analyzer's on the new grid
      let db = null;
      if (BEAT_RULE.downbeat === 'tracker' && tg.relation === 1) {
        // (the tracker's downbeats counted on the final grid: the beat of four that holds most of them)
        const votes = [0, 0, 0, 0];
        for (const d of bt.downbeatTimes) { const k = Math.round((d - phase) / P); if (Math.abs(d - (phase + k * P)) < 0.25 * P) votes[((k % 4) + 4) % 4]++; }
        const n = votes.reduce((a, b) => a + b, 0), best = votes.indexOf(Math.max(...votes));
        if (n && votes[best] >= BEAT_RULE.share * n) db = phase + best * P;
      }
      if (db !== null) { db = ((db % (4 * P)) + 4 * P) % (4 * P); if (db > 4 * P - 0.02) db = Math.max(0, db - 4 * P); }
      downbeat = db !== null ? db : A.gridDownbeat(bpm, phase);
      engines.grid = 'beat-this';
      if (tg.tempo) engines.tempo = 'beat-this';
    } else {
      // (round 10: a line fit just off a whole tempo that RhythmExtractor2013 puts on that whole tempo is fitted again
      // with the whole tempo allowed (WHOLE_RULE): a 6-minute real track fitted 111.17 where it plays at 111, and its
      // grid drifted by half a second by the end)
      const w = Math.round(g.bpm);
      if (Math.abs(g.bpm - w) > 1e-6 && Math.abs(g.bpm - w) <= WHOLE_RULE.grid && ess && Math.abs(ess.bpm - w) <= WHOLE_RULE.ess) {
        // (the reach inside the new fit is wider than the gate: its free line starts again and can land a little further)
        const g2 = A.fitGrid(g.bpm, g.beatPhase, WHOLE_RULE.grid + 0.1);
        if (Math.abs(g2.bpm - w) < 1e-6) { g.bpm = g2.bpm; g.beatPhase = g2.beatPhase; m0.wholeTempo = true; }
      }
      bpm = g.bpm;
      // (round 9: the claps say where the beat is, clapShift)
      const sh = clapShift(A.clapPositions(bpm, g.beatPhase));
      if (sh) { g.beatPhase += (sh * 15) / bpm; phaseMoved = sh; }
      downbeat = A.gridDownbeat(bpm, g.beatPhase);
    }
    if (bt) m0.beatTracker = { bpm: Math.round(bt.bpm * 1000) / 1000, lock: bt.lock, rate: bt.rate, cv: bt.cv, steady: bt.steady, downbeatShare: bt.downbeatShare, ms: bt.ms, used: tg ? tg.relation : 0 };
  }
  const uncertain = ['essentia.js', 'tapped', 'picked', 'beat-this'].includes(engines.tempo) || engines.grid ? false : !!misk.uncertain;
  const confidence = engines.tempo === 'essentia.js' ? Math.round(Math.min(1, ess.confidence / 5.32) * 100) / 100 : misk.confidence;
  A.setTempo({ bpm, downbeat, tapped: pick.from === 'tapped', uncertain, confidence, round: 3 });
  onProgress(0.4, 'bars');
  // 5. the bars, a slice at a time
  const barSec = 240 / bpm;
  for (let t = downbeat + 8 * barSec; t < duration + barSec; t += 8 * barSec) { A.barsRaw(Math.min(duration, t)); onProgress(0.4 + 0.3 * Math.min(1, t / duration), 'bars'); await pause(); }
  const m = A.model(duration), raw = A.barsRaw(duration);
  Object.assign(m, m0);
  // (round 8: no steady beat, no drums: the hits misk-analyzer finds in a pad's swells or a voice are no drum part; the
  // flag is kept in the model)
  const noBeat = noSteadyBeat(ess);
  if (noBeat !== null) m.beat = { steady: !noBeat, confidence: Math.round(ess.confidence * 1000) / 1000 };
  if (noBeat) for (const b of m.bars) b.drums = Object.fromEntries(Object.keys(b.drums).map(r => [r, '.'.repeat(b.drums[r].length)]));
  onProgress(0.72, 'harmony');
  // 6. key and chords from Essentia.js (the chords on the beats of the bars), else misk-analyzer's own
  if (E && m.bars.length) {
    try {
      // the ticks: the bars' starts, one HPCP median and one chord per bar (on the beats, a chord per beat and a vote per
      // bar, the chords flip between relatives more often: measured on the test songs)
      const ticks = [];
      for (let i = 0; i <= m.bars.length; i++) ticks.push(downbeat + i * (240 / bpm));
      const per = E.chords(pcm, ticks.filter(x => x <= duration + 1e-6), { sr, onProgress: f => onProgress(0.72 + 0.2 * f, 'harmony') }), byBar = barChords(per, 1);
      let n = 0;
      m.bars.forEach((b, i) => { const c = byBar[i]; if (b.chord && c) { takeChord(b, c); n++; } });
      if (n) engines.chords = 'essentia.js';
    } catch (e) { notes.push(`Essentia.js chords failed: ${e && e.message || e}`); }
    await pause();
    try { const k = E.key(pcm); m.key = { ...settleMode(k, m.bars), conf: Math.round(k.strength * 100) / 100 }; engines.key = 'essentia.js'; }
    catch (e) { notes.push(`Essentia.js key failed: ${e && e.message || e}`); }
  }
  // misk-analyzer's own key, its mode settled the same way over the whole file
  if (engines.key === MISK && m.key) m.key = { ...settleMode(m.key, m.bars), conf: m.key.conf };
  // (round 9: a tonic with no third, the mode from the scale)
  if (m.key) { const k = thirdlessMode(m.key, m.bars, raw); if (k !== m.key) { m.key = k; m.keyMode = 'scale'; } }
  // 6b. the top line (decode-refine D2): Essentia.js's predominant melody, else misk-analyzer's YIN on the 200-2000 Hz
  // band; one note per 16th step, snapped to the key's scale within 40 cents
  onProgress(0.93, 'melody');
  let mel = null;
  if (E && E.melody) { try { mel = E.melody(pcm, { sr }); engines.lead = 'essentia.js'; } catch (e) { notes.push(`Essentia.js melody failed: ${e && e.message || e}`); } }
  await pause();
  const steps = mel ? melodySteps(mel, downbeat, 240 / bpm, m.bars.length) : A.topLineYin(downbeat, 240 / bpm, m.bars.length);
  if (!mel) engines.lead = MISK;
  m.bars.forEach((b, i) => { const x = steps[i].map(v => snapToKey(v, m.key)); b.lead = x; b.leadVoiced = Math.round((x.filter(v => v !== null).length / x.length) * 100) / 100; });
  onProgress(0.95, 'sections');
  // 7. sections, kinds, the ending, the variations (on the bars with their chroma)
  const { sections, ending } = sectionsOf(m.bars.map((b, i) => ({ ...b, chroma: raw[i] ? raw[i].chroma : null })));
  m.sections = sections;
  m.ending = ending;
  // 8. harmony and bass per section (decode-refine D5): steady chord qualities, one octave range for the bass, no bass
  // notes in bars where the bass is quiet
  quietMinors(m.bars, m.key);
  steadyQualities(m.bars, sections, HARMONY_RULE, m.key);
  bassRange(m.bars, sections);
  m.variations = variationsOf(m);
  { const moved = backbeatSnare(m.bars); if (moved.length) m.snareFromHats = moved; }
  // 9. the drum machine by measure (decode-refine D3), on the hats that play alone (a hat with a kick or a clap carries
  // their sound): the hats' spectral shape against the app's machines measured from
  // their samples; "Our sounds" writes the nearest. (Distortion is not measured: neither the
  // kicks' overtones nor the hats' decay told the driven drums of the bench from the clean ones, decode-refine 10.1)
  {
    const bs = m.barSeconds, st = bs / 16, kicks = [], hats = [];
    m.bars.forEach((b, i) => { for (let j = 0; j < 16; j++) { const t = m.downbeat + i * bs + j * st; if ((b.drums.bd || '')[j] === 'x') kicks.push(t); if ((b.drums.hh || '')[j] === 'x' && !['bd', 'cp', 'oh'].some(r => (b.drums[r] || '')[j] === 'x')) hats.push(t); } });
    const ranks = rankKits(mixHatShape(pcm, sr, hats), KIT_MEASURES, mixHatBright(pcm, sr, hats)), kit = ranks.length ? ranks[0].kit : null;
    m.drumSound = { kit, ranks: ranks.slice(0, 3) };
    // (decode-refine 10.1, fifth round: the bass's drive, its even harmonics against its odd ones on the steps with a
    // bass note and no kick or clap, and its low band against the kicks')
    const notes = [];
    m.bars.forEach((b, i) => { for (let j = 0; j < 16; j++) { const x = b.bass && b.bass[j], d = b.drums || {}; if (x !== null && x !== undefined && (d.bd || '')[j] !== 'x' && (d.cp || '')[j] !== 'x') notes.push({ t: m.downbeat + i * bs + j * st, midi: x }); } });
    const drive = bassDrive(pcm, sr, notes, kicks);
    if (drive) m.bassDrive = drive;
  }
  // 10. the levels and the chords' sustain (decode-refine D3): the band shares of the original over the bars (the
  // writer sets each part's gain to come near them), and per bar with a chord how much of it is left at its end
  {
    const e = bandEnergy(pcm, sr, m.downbeat * sr, (m.downbeat + m.bars.length * m.barSeconds) * sr, LEVEL_BANDS), tot = e.reduce((a, b) => a + b, 0);
    if (tot > 0) m.shares = e.map(v => Math.round((v / tot) * 1000) / 1000);
    m.bars.forEach((b, i) => { if (b.chord) { const a = (m.downbeat + i * m.barSeconds) * sr; b.sustain = sustainOf(pcm, sr, a, a + m.barSeconds * sr); } });
  }
  // 10b. how the chords are played (decode round 11, decode-hit-rhythm): per bar with a chord, its tones' hits, how held
  // they are and their share of the band (hit-measure.js chordHits), on the tones the bar's bass does not ring at
  onProgress(0.97, 'sections');
  await pause();
  m.bars.forEach((b, i) => {
    const c = b.chord && parseChord(b.chord);
    if (!c) return;
    const r = chordHits(pcm, sr, Math.round((m.downbeat + i * m.barSeconds) * sr), m.barSeconds * sr, [c.root, (c.root + (c.quality === 'min' ? 3 : 4)) % 12, (c.root + 7) % 12], bassPcs(b.bass || []));
    b.chordHits = r.hits; b.chordHeld = r.held; b.chordTonal = r.tonal;
  });
  // (and per bar with bass notes, the bass's attacks in the 300-1500 Hz band: hit-measure.js bassAttack, read by the
  // writer's bassFilled)
  m.bars.forEach((b, i) => { if ((b.bass || []).filter(x => x !== null && x !== undefined).length >= 2) b.bassAttack = bassAttack(pcm, sr, Math.round((m.downbeat + i * m.barSeconds) * sr), m.barSeconds * sr); });
  // (round 8: decoded bass notes that are no bass, a pad's low notes, are not a bass part)
  if (noBassPart(m.shares, m.bassDrive)) { for (const b of m.bars) if (b.bass) b.bass = b.bass.map(() => null); m.noBass = true; }
  // (Essentia.js's own tempo and confidence, to read why the engine was or was not taken)
  if (phaseMoved) m.phaseMoved = phaseMoved;
  if (ess) m.essentiaTempo = { bpm: Math.round(ess.bpm * 1000) / 1000, confidence: Math.round(ess.confidence * 1000) / 1000, ...(ess.percival ? { percival: Math.round(ess.percival * 100) / 100 } : {}), ...(ess.degara ? { degara: Math.round(ess.degara * 100) / 100 } : {}), ...(pick.vote ? { vote: true } : {}) };
  Object.assign(m, { level: 'B', engines, ms: Date.now() - t0, ...(notes.length ? { notes } : {}), ...(E ? { essentia: E.version } : {}) });
  onProgress(1, 'done');
  return m;
}
