// Measures misk-analyzer (track-to-code) on audio with a known truth: the app's own test songs exported to WAV
// (tools/decode-export.cjs, in .cache/decode/wav/) and the synthetic tracks of tools/decode-audio.mjs. Prints tempo,
// downbeat, key, chord accuracy per bar, drum grid F1 per band and drum presence per bar; returns the numbers. With
// --full also level B on the test songs, with Essentia.js and with misk-analyzer alone: the same scores, the section
// bounds against the songs' sections (the largest distance in bars) and the time.
//   node --no-warnings tools/decode-measure.mjs [--json] [--full]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAnalyzer } from '../src/decode/misk-analyzer.js';
import { analyseFull } from '../src/decode/full.js';
import { nodeEssentia } from './essentia-node.mjs';
import { drumsHeard } from '../src/decode/writer.js';
import { readWav, resample, renderSong, RATE } from './decode-audio.mjs';
import { TEST_SONGS, truthOf } from './decode-songs.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), WAV = path.join(ROOT, '.cache', 'decode', 'wav');
const ROWS = ['bd', 'cp', 'hh'];
const E = '................';

// m: model; truth: { bpm, key, bars: [{ chord, drums, bass? }] }; offset: truth bars that the model's bar 0 stands for
export function score(m, truth) {
  const n = Math.min(m.bars.length, truth.bars.length);
  let chordOk = 0, chordN = 0, presOk = 0;
  const f1 = {}; for (const r of ROWS) f1[r] = { tp: 0, fp: 0, fn: 0 };
  let bassOk = 0, bassN = 0;
  for (let i = 0; i < n; i++) {
    const b = m.bars[i], tb = truth.bars[i];
    if (tb.chord) { chordN++; if (b.chord === tb.chord) chordOk++; }
    if (!!tb.drums === drumsHeard(b)) presOk++;
    for (const r of ROWS) {
      const want = tb.drums ? tb.drums[r] || E : E, got = b.drums[r] || E;
      for (let j = 0; j < 16; j++) { const p = got[j] === 'x', q = want[j] === 'x'; if (p && q) f1[r].tp++; else if (p) f1[r].fp++; else if (q) f1[r].fn++; }
    }
    if (tb.bass) for (let j = 0; j < 16; j++) if (tb.bass[j] !== null) { bassN++; if (b.bass[j] === tb.bass[j]) bassOk++; }
  }
  const F = x => (x.tp ? (2 * x.tp) / (2 * x.tp + x.fp + x.fn) : x.fp + x.fn ? 0 : 1);
  const keyOk = !!(m.key && truth.key && m.key.root === truth.key.root && m.key.mode === truth.key.mode);
  return { bpm: m.bpm, bpmTruth: truth.bpm, tempoErr: Math.round(Math.abs(m.bpm - truth.bpm) * 100) / 100, octave: m.bpm && Math.abs(m.bpm / truth.bpm - 1) > 0.03, downbeat: m.downbeat, key: m.key, keyOk, bars: n, chords: chordN ? Math.round((chordOk / chordN) * 1000) / 1000 : null, drumsPresence: n ? Math.round((presOk / n) * 1000) / 1000 : null, f1: Object.fromEntries(ROWS.map(r => [r, Math.round(F(f1[r]) * 1000) / 1000])), bass: bassN ? Math.round((bassOk / bassN) * 1000) / 1000 : null };
}

export function measureApp() {
  const out = {};
  for (const s of TEST_SONGS) {
    const f = path.join(WAV, `${s.id}.wav`);
    if (!fs.existsSync(f)) continue;
    const w = readWav(f), pcm = resample(w.pcm, w.rate, RATE), t0 = Date.now();
    const A = createAnalyzer(pcm), m = A.model(pcm.length / RATE);
    out[s.id] = { ...score(m, truthOf(s)), ms: Date.now() - t0, seconds: Math.round(pcm.length / RATE) };
  }
  return out;
}
// the section bounds of a level B model against the truth's section starts: the largest distance of a true bound to
// the nearest found one, and the found bounds no true one is near (within one bar)
export function boundsScore(sections, starts) {
  const found = (sections || []).map(x => x.start).filter(x => x > 0), want = starts.filter(x => x > 0);
  const err = want.length ? Math.max(...want.map(w => Math.min(...found.map(f => Math.abs(f - w)), 999))) : 0;
  return { bounds: found, boundsErr: err, extra: found.filter(f => !want.some(w => Math.abs(f - w) <= 1)).length };
}
// level B on the test songs: { id: { …score, bounds, boundsErr, extra, ending, engines, ms } }; essentia: true uses
// Essentia.js for tempo, key and chords, false misk-analyzer alone
export async function measureFull({ essentia = true, only = null } = {}) {
  const out = {};
  for (const s of TEST_SONGS) {
    if (only && !only.includes(s.id)) continue;
    const f = path.join(WAV, `${s.id}.wav`);
    if (!fs.existsSync(f)) continue;
    const w = readWav(f), pcm = resample(w.pcm, w.rate, RATE), t0 = Date.now(), truth = truthOf(s);
    const m = await analyseFull(pcm, { engine: essentia ? nodeEssentia : null });
    out[s.id] = { ...score(m, truth), ...boundsScore(m.sections, truth.starts), ending: m.ending, engines: m.engines, ms: Date.now() - t0, seconds: Math.round(pcm.length / RATE) };
  }
  return out;
}
export const SYNTH = [
  { id: 'synth-90', bpm: 90 }, { id: 'synth-124', bpm: 124 }, { id: 'synth-174', bpm: 174 },
].map(x => ({ ...x, spec: { bpm: x.bpm, bars: 40, lead: 0.3, chords: ['Am', 'F', 'C', 'G'], drums: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' }, bass: 'x..x..x...x.x...', drumsOff: [[32, 36]] } }));
export function measureSynth() {
  const out = {};
  for (const x of SYNTH) {
    const { pcm, truth } = renderSong(x.spec), t0 = Date.now();
    const m = createAnalyzer(pcm).model(pcm.length / RATE);
    const tr = { bpm: truth.bpm, key: { root: 9, mode: 'minor' }, bars: truth.bars.map(b => ({ chord: b.chord, drums: Object.keys(b.drums).length ? b.drums : null, bass: b.bass })) };
    out[x.id] = { ...score(m, tr), ms: Date.now() - t0 };
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('decode-measure.mjs')) {
  const res = { app: measureApp(), synth: measureSynth() };
  if (process.argv.includes('--full')) { res.fullEss = await measureFull({ essentia: true }); res.fullOwn = await measureFull({ essentia: false }); }
  if (process.argv.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else for (const [g, list] of Object.entries(res)) for (const [id, r] of Object.entries(list)) console.log(`${g.padEnd(7)} ${id.padEnd(16)} tempo ${r.bpm} (truth ${r.bpmTruth}) downbeat ${r.downbeat}s key ${r.key ? `${['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][r.key.root]} ${r.key.mode}` : '-'} ${r.keyOk ? 'ok' : 'WRONG'} chords ${r.chords} drums on/off ${r.drumsPresence} F1 bd ${r.f1.bd} cp ${r.f1.cp} hh ${r.f1.hh}${r.bass !== null ? ` bass ${r.bass}` : ''}${r.bounds ? ` bounds ${r.bounds.join(',')} (err ${r.boundsErr}, extra ${r.extra}) ending ${r.ending}` : ''} · ${r.ms} ms`);
}
