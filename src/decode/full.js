// Level B, the whole file (track-to-code D5, D6, D7, D9): misk-analyzer reads every frame, the bars, grids, bass and
// levels as level A does, and adds the whole-file steps: one beat grid for the whole track, the key, the chords, the
// sections, the ending. Essentia.js gives the tempo, the key and the chords when it loads; when it cannot load or
// fails, misk-analyzer computes the three itself and level B still finishes. The model records which engine gave each
// measure. Pure (the engine is passed in): the level B worker runs it, and the Node checks.
import { createAnalyzer, ANALYSIS_RATE } from './misk-analyzer.js';
import { chordName, parseChord } from './model.js';
import { sectionsOf } from './sections.js';
import { variationsOf } from './writer.js';

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
  if (ess && ess.bpm > 0 && (ess.confidence >= ESSENTIA_CONFIDENT || (ess.confidence >= ESSENTIA_CONFIRMED && misk && agrees(ess.bpm, misk.bpm)))) {
    let bpm = ess.bpm;
    if (misk && misk.bpm > 0) for (const r of [2, 0.5, 1.5, 2 / 3]) if (Math.abs((bpm * r) / misk.bpm - 1) < 0.03) bpm *= r;
    return { bpm, from: 'essentia.js' };
  }
  return { bpm: misk ? misk.bpm : 120, from: MISK };
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

// harmony and bass per section (decode-refine D5); the numbers in one place
export const HARMONY_RULE = { clear: 0.8, clearBars: 2, range: 7, quietBass: 0.2 };
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
    for (const b of list) if (b.level && top > 0 && (b.level.bass || 0) < rule.quietBass * top && b.bass) b.bass = b.bass.map(() => null);
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

// pcm: mono at `sr`; engine: null, or async () → an engine (engine-essentia.js) that may throw; tempo: a tapped tempo
// { bpm, downbeat }; onProgress(fraction, stage). → the level B model
export async function analyseFull(pcm, { sr = ANALYSIS_RATE, engine = null, tempo = null, onProgress = () => {} } = {}) {
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
  // 4. one beat grid for the whole file: the tempo picked, fitted on the onsets of the whole file, and its downbeat
  const pick = pickTempo(misk, ess, tempo);
  if (pick.from !== MISK) engines.tempo = pick.from;
  let bpm = pick.bpm, downbeat = misk.downbeat;
  if (pick.from === 'tapped') downbeat = tempo.downbeat ?? misk.downbeat;
  else {
    // the tempo made exact on the whole file (a comb), the beat phase from every onset, a line through the onsets, then
    // the downbeat (Essentia.js's own estimate is 0.1 to 0.9 BPM off on the test songs and its beats 10 to 60 ms late:
    // it sets the tempo's octave and region, misk-analyzer the grid the code plays on)
    const b0 = A.wholeTempo(bpm), g = A.fitGrid(b0, A.wholePhase(b0));
    bpm = g.bpm;
    downbeat = A.gridDownbeat(bpm, g.beatPhase);
  }
  const uncertain = ['essentia.js', 'tapped', 'picked'].includes(engines.tempo) ? false : !!misk.uncertain;
  const confidence = engines.tempo === 'essentia.js' ? Math.round(Math.min(1, ess.confidence / 5.32) * 100) / 100 : misk.confidence;
  A.setTempo({ bpm, downbeat, tapped: pick.from === 'tapped', uncertain, confidence, round: 3 });
  onProgress(0.4, 'bars');
  // 5. the bars, a slice at a time
  const barSec = 240 / bpm;
  for (let t = downbeat + 8 * barSec; t < duration + barSec; t += 8 * barSec) { A.barsRaw(Math.min(duration, t)); onProgress(0.4 + 0.3 * Math.min(1, t / duration), 'bars'); await pause(); }
  const m = A.model(duration), raw = A.barsRaw(duration);
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
      m.bars.forEach((b, i) => { const c = byBar[i]; if (b.chord && c) { const x = parseChord(b.chord), y = parseChord(c.chord); b.chord = c.chord; b.chordConf = c.conf; n++; } });
      if (n) engines.chords = 'essentia.js';
    } catch (e) { notes.push(`Essentia.js chords failed: ${e && e.message || e}`); }
    await pause();
    try { const k = E.key(pcm); m.key = { ...settleMode(k, m.bars), conf: Math.round(k.strength * 100) / 100 }; engines.key = 'essentia.js'; }
    catch (e) { notes.push(`Essentia.js key failed: ${e && e.message || e}`); }
  }
  // misk-analyzer's own key, its mode settled the same way over the whole file
  if (engines.key === MISK && m.key) m.key = { ...settleMode(m.key, m.bars), conf: m.key.conf };
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
  // (Essentia.js's own tempo and confidence, to read why the engine was or was not taken)
  if (ess) m.essentiaTempo = { bpm: Math.round(ess.bpm * 1000) / 1000, confidence: Math.round(ess.confidence * 1000) / 1000 };
  Object.assign(m, { level: 'B', engines, ms: Date.now() - t0, ...(notes.length ? { notes } : {}), ...(E ? { essentia: E.version } : {}) });
  onProgress(1, 'done');
  return m;
}
