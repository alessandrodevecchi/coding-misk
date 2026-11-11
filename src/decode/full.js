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
      m.bars.forEach((b, i) => { const c = byBar[i]; if (b.chord && c) { b.chord = c.chord; b.chordConf = c.conf; n++; } });
      if (n) engines.chords = 'essentia.js';
    } catch (e) { notes.push(`Essentia.js chords failed: ${e && e.message || e}`); }
    await pause();
    try { const k = E.key(pcm); m.key = { ...settleMode(k, m.bars), conf: Math.round(k.strength * 100) / 100 }; engines.key = 'essentia.js'; }
    catch (e) { notes.push(`Essentia.js key failed: ${e && e.message || e}`); }
  }
  // misk-analyzer's own key, its mode settled the same way over the whole file
  if (engines.key === MISK && m.key) m.key = { ...settleMode(m.key, m.bars), conf: m.key.conf };
  onProgress(0.95, 'sections');
  // 7. sections, kinds, the ending, the variations (on the bars with their chroma)
  const { sections, ending } = sectionsOf(m.bars.map((b, i) => ({ ...b, chroma: raw[i] ? raw[i].chroma : null })));
  m.sections = sections;
  m.ending = ending;
  m.variations = variationsOf(m);
  // (Essentia.js's own tempo and confidence, to read why the engine was or was not taken)
  if (ess) m.essentiaTempo = { bpm: Math.round(ess.bpm * 1000) / 1000, confidence: Math.round(ess.confidence * 1000) / 1000 };
  Object.assign(m, { level: 'B', engines, ms: Date.now() - t0, ...(notes.length ? { notes } : {}), ...(E ? { essentia: E.version } : {}) });
  onProgress(1, 'done');
  return m;
}
