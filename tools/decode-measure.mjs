// Measures misk-analyzer (track-to-code) on audio with a known truth: the app's own test songs exported to WAV
// (tools/decode-export.cjs, in .cache/decode/wav/) and the synthetic tracks of tools/decode-audio.mjs. Prints tempo,
// downbeat, key, chord accuracy per bar, drum grid F1 per band and drum presence per bar; returns the numbers. With
// --full also level B on the test songs, with Essentia.js and with misk-analyzer alone: the same scores, the section
// bounds against the songs' sections (the largest distance in bars) and the time.
// decode-refine 6.2: the app's songs of the bench (luci-rosse and the frozen radio song, exported with their timeline
// JSON) measured against their timeline: kick, clap and hat F1 and recall from the hit times on the model's bar grid,
// false hits, distinct drum grids, chord root and quality per bar, bass pitch and octave errors (the chords and the bass
// notes from the song's own haps, Strudel in Node); level A, and with --full level B with and without Essentia.js
// (section bounds against the timeline's sections, the level B song's drum patterns).
// decode-refine 7.3 and 7.4: the level B song's drum patterns per section, and level A as the tab drives it (the
// tempo and the downbeat's distance to the true grid at bars 12 and 16, the relock); DECODE_OWNER_DIR=<folder>: the
// same level A measure on the owner's app exports there that have their timeline JSON (printed only)
//   node --no-warnings tools/decode-measure.mjs [--json] [--full]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAnalyzer, horizonOf, LOCK_SECONDS } from '../src/decode/misk-analyzer.js';
import { analyseFull } from '../src/decode/full.js';
import { nodeEssentia } from './essentia-node.mjs';
import { drumsHeard, writeFull } from '../src/decode/writer.js';
import { parseChord, DRUM_ROWS as DRUM_ROWS_ALL } from '../src/decode/model.js';
import { createRequire, register as registerHook } from 'node:module';
import { installHelpers } from '../src/song/writer.js';
import { readWav, resample, renderSong, RATE } from './decode-audio.mjs';
import { TEST_SONGS, truthOf, HARD_SONGS, midiOf } from './decode-songs.mjs';
import { compileSong } from '../src/song/compile.js';

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
    out[s.id] = { ...score(m, truthOf(s)), ms: Date.now() - t0, seconds: Math.round(pcm.length / RATE), ...(HARD_SONGS.includes(s.id) ? { hard: true } : {}) };
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
    out[s.id] = { ...score(m, truth), ...boundsScore(m.sections, truth.starts), ending: m.ending, engines: m.engines, ...(m.essentiaTempo ? { essentiaTempo: m.essentiaTempo } : {}), ms: Date.now() - t0, seconds: Math.round(pcm.length / RATE), ...(HARD_SONGS.includes(s.id) ? { hard: true } : {}) };
  }
  return out;
}
// ---------- decode-refine 6.2: truth from the app's timelines ----------
// the timeline's instruments that are the model's drum rows (the hats row holds the open hats too)
const TL_ROWS = { bd: 'kick', cp: 'snare', hh: 'hats' };
const TRIADS = [];
for (let r = 0; r < 12; r++) { TRIADS.push({ root: r, quality: 'maj', set: [r, (r + 4) % 12, (r + 7) % 12] }); TRIADS.push({ root: r, quality: 'min', set: [r, (r + 3) % 12, (r + 7) % 12] }); }
const midiOfValue = x => (typeof x === 'number' ? x : typeof x === 'string' ? midiOf(x.toLowerCase()) : null);
// Strudel in Node with the app's helpers and a transpose that moves the notes (tools/mixer-checks.mjs makes it a no-op:
// it compares the mix only; @strudel/tonal does not load in Node here). Only `note` values are read as pitches: scale
// and voicing stay no-ops, so the truth leaves out notes written as degrees
let strudel = null;
async function strudelTonal() {
  registerHook(`data:text/javascript,${encodeURIComponent("export async function resolve(s, c, next) { return s === '@kabelsalat/web' ? { url: 'data:text/javascript,export class SalatRepl {}', shortCircuit: true } : next(s, c); }")}`);
  const log = console.log;
  console.log = () => {};
  try {
    const core = await import('@strudel/core'), mini = await import('@strudel/mini'), { transpiler } = await import('@strudel/transpiler');
    await core.evalScope(core, mini);
    const up = (x, k) => { const m = midiOfValue(x); return m === null ? x : m + Number(k); };
    core.register('transpose', (k, pat) => pat.withValue(v => (v && typeof v === 'object' && 'note' in v ? { ...v, note: up(v.note, k) } : typeof v === 'object' ? v : up(v, k))));
    for (const name of ['scale', 'voicing', 'voicings', 'rootNotes']) if (!(name in core.Pattern.prototype)) core.register(name, (x, pat) => pat);
    installHelpers({ register: core.register, Pattern: core.Pattern });
    let error = null;
    const R = core.repl({ transpiler, defaultOutput: () => {}, getTime: () => 0, onEvalError: e => { error = e; } });
    return { evaluate: async code => { error = null; const p = await R.evaluate(code, false); if (!p || error) throw new Error((error && error.message) || 'evaluation failed'); return p; } };
  } finally { console.log = log; }
}
// the truth of an app song exported with its timeline: { bpm, barSec, hits: { bd|cp|hh: [seconds] }, starts, bars:
// [{ chord: { root, quality } | null, bass: [16 midi or null] }] } from the timeline (hit times, sections) and the song's
// own haps (the pad's notes of a bar make its chord when they hold exactly one triad; the bass notes on their nearest step)
export async function timelineTruth(tl, song) {
  const bpm = tl.bpm[0], barSec = 240 / bpm, hits = {};
  for (const [row, inst] of Object.entries(TL_ROWS)) hits[row] = (tl.instruments[inst] || []).map(x => x[0]);
  if (!strudel) strudel = await strudelTonal();
  const p = await strudel.evaluate(compileSong(song)), bars = [];
  for (let i = 0; i < tl.bars; i++) {
    const haps = p.queryArc(i, i + 1).filter(h => h.hasOnset()).map(h => ({ at: h.whole.begin.valueOf() - i, v: h.value || {} }));
    const pcs = new Set(haps.filter(h => h.v.analyze === 'pad').map(h => midiOfValue(h.v.note)).filter(x => x !== null).map(x => ((x % 12) + 12) % 12));
    const fit = pcs.size >= 3 ? TRIADS.filter(t => t.set.every(x => pcs.has(x))) : [];
    const bass = Array(16).fill(null);
    for (const h of haps.filter(h => h.v.analyze === 'bass')) { const j = Math.round(h.at * 16); if (j < 16 && bass[j] === null) bass[j] = midiOfValue(h.v.note); }
    bars.push({ chord: fit.length === 1 ? { root: fit[0].root, quality: fit[0].quality } : null, bass });
  }
  return { bpm, barSec, hits, starts: tl.sections.map(x => x.bar), bars, firstDownbeat: tl.sections.length ? tl.sections[0].t || 0 : 0 };
}
// the drum patterns of a level B song per section (decode-refine 7.3: at most 2 each)
export function patternsPerSection(song) {
  const d = song.tracks.find(t => t.type === 'drums'), ends = []; let a = 0;
  for (const x of song.sections) { a += x.bars; ends.push(a); }
  const per = song.sections.map(() => new Set());
  if (d) for (const c of d.clips) for (let b = c.start; b < c.start + c.bars; b++) { const k = ends.findIndex(e => b < e); if (k >= 0) per[k].add(c.pattern); }
  return per.map(x => x.size);
}
// level A as the tab drives it (decode-refine 7.4): the first lock on the first seconds, then the model up to two bars
// ahead of the playhead; per bar the tempo and the downbeat's distance to the true bar grid (ms). → { at12, at16,
// relocked } (the tempo and the distance at the end of bars 12 and 16)
export function levelAProgress(pcm, bpmTruth, dbTruth = 0) {
  const A = createAnalyzer(pcm), barT = 240 / bpmTruth, rows = [];
  let m = A.model(Math.max(horizonOf(0, '2bars', 2), LOCK_SECONDS + 0.5) + 0.1);
  const err = db => { const x = (((db - dbTruth) % barT) + barT) % barT; return Math.round(Math.min(x, barT - x) * 1000); };
  for (let f = 0; f < A.duration; f += 0.25) {
    const h = horizonOf(f, '2bars', m.barSeconds || 2);
    if (h > (m.analysedTo || 0) + 0.01) m = A.model(h + 0.5);
    if (!m.barSeconds) continue;
    const bar = Math.floor((f - m.downbeat) / m.barSeconds);
    if (bar >= 0) rows[bar] = { bpm: m.bpm, err: err(m.downbeat), relocked: !!m.relocked };
    if (bar > 16) break;
  }
  const at = k => rows[k] || rows.filter(Boolean).pop() || null;
  return { at12: at(12), at16: at(16), relocked: rows.some(r => r && r.relocked) };
}
// a model against a timeline truth: per drum row F1, recall and false hits on the model's grid (each true hit on its
// nearest step of the model's bars), distinct drum grids in the bars with drums, chords (root right, and the quality
// right where the root is), bass (pitch class right, and octave errors where it is)
export function timelineScore(m, truth) {
  const stepSec = m.barSeconds / 16, n = m.bars.length, r3 = x => Math.round(x * 1000) / 1000;
  const out = { bpm: m.bpm, bpmTruth: truth.bpm, downbeat: m.downbeat, bars: n, rows: {} };
  for (const row of Object.keys(TL_ROWS)) {
    const want = new Set();
    for (const t of truth.hits[row]) { const k = Math.round((t - m.downbeat) / stepSec); if (k >= 0 && k < n * 16) want.add(k); }
    let tp = 0, fp = 0;
    m.bars.forEach((b, i) => {
      const d = b.drums || {}, g = row === 'hh' ? [...(d.hh || E)].map((c, j) => (c === 'x' || (d.oh || E)[j] === 'x' ? 'x' : '.')) : [...(d[row] || E)];
      g.forEach((c, j) => { if (c !== 'x') return; if (want.has(i * 16 + j)) tp++; else fp++; });
    });
    const fn = want.size - tp;
    out.rows[row] = { f1: tp ? r3((2 * tp) / (2 * tp + fp + fn)) : 0, recall: want.size ? r3(tp / want.size) : null, falseHits: fp, hits: want.size };
  }
  const withDrums = m.bars.filter(b => drumsHeard(b));
  out.grids = new Set(withDrums.map(b => DRUM_ROWS_ALL.map(r => (b.drums && b.drums[r]) || E).join('|'))).size;
  out.drumBars = withDrums.length;
  let rootN = 0, rootOk = 0, qualOk = 0, bassN = 0, pcOk = 0, octErr = 0;
  m.bars.forEach((b, i) => {
    const tb = truth.bars[Math.round((m.downbeat + i * m.barSeconds) / truth.barSec)];
    if (!tb) return;
    const c = parseChord(b.chord);
    if (tb.chord && c) { rootN++; if (c.root === tb.chord.root) { rootOk++; if (c.quality === tb.chord.quality) qualOk++; } }
    (b.bass || []).forEach((x, j) => { const y = tb.bass[j]; if (x === null || x === undefined || y === null) return; bassN++; if ((((x - y) % 12) + 12) % 12 === 0) { pcOk++; if (x !== y) octErr++; } });
  });
  out.bassBars = m.bars.filter(b => (b.bass || []).some(x => x !== null && x !== undefined)).length;
  Object.assign(out, { chordBars: rootN, chordRoot: rootN ? r3(rootOk / rootN) : null, chordQuality: rootOk ? r3(qualOk / rootOk) : null, bassSteps: bassN, bassPitch: bassN ? r3(pcOk / bassN) : null, bassOctaveErrors: pcOk ? r3(octErr / pcOk) : null });
  return out;
}
// the app songs of the bench exported with their timelines: { id: { A, B?, Bown? } }; full adds level B with Essentia.js
// and with misk-analyzer alone (section bounds against the timeline's, the level B song's drum patterns)
export async function measureTimelines({ full = false, only = null } = {}) {
  const { APP_SONGS, appSong } = createRequire(import.meta.url)('./decode-export.cjs'), out = {};
  for (const x of APP_SONGS) {
    if (only && !only.includes(x.id)) continue;
    const f = path.join(WAV, `${x.id}.wav`), tf = path.join(WAV, `${x.id}.timeline.json`);
    if (!fs.existsSync(f) || !fs.existsSync(tf)) continue;
    const truth = await timelineTruth(JSON.parse(fs.readFileSync(tf, 'utf8')), appSong(x));
    const w = readWav(f), pcm = resample(w.pcm, w.rate, RATE);
    let t0 = Date.now();
    const A = createAnalyzer(pcm).model(pcm.length / RATE);
    out[x.id] = { A: { ...timelineScore(A, truth), ms: Date.now() - t0, progress: levelAProgress(pcm, truth.bpm, truth.firstDownbeat) } };
    if (full) for (const [k, engine] of [['B', nodeEssentia], ['Bown', null]]) {
      t0 = Date.now();
      const m = await analyseFull(pcm, { engine }), song = writeFull(m), drums = song.tracks.find(t => t.type === 'drums');
      out[x.id][k] = { ...timelineScore(m, truth), ...boundsScore(m.sections, truth.starts), patterns: drums ? Object.keys(drums.patterns).length : 0, perSection: patternsPerSection(song), sections: m.sections.length, key: m.key, engines: m.engines, ...(m.essentiaTempo ? { essentiaTempo: m.essentiaTempo } : {}), ms: Date.now() - t0 };
    }
  }
  return out;
}
const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export function timelineLine(id, level, r) {
  const row = k => `${k} F1 ${r.rows[k].f1} recall ${r.rows[k].recall} false ${r.rows[k].falseHits}`;
  return `${id.padEnd(14)} ${level.padEnd(4)} tempo ${r.bpm} (truth ${r.bpmTruth}) downbeat ${r.downbeat}s · ${row('bd')} · ${row('cp')} · ${row('hh')} · grids ${r.grids} in ${r.drumBars} bars${r.patterns !== undefined ? ` (song: ${r.patterns} drum patterns, ${r.sections} sections)` : ''} · chords root ${r.chordRoot} quality ${r.chordQuality} (${r.chordBars} bars) · bass pitch ${r.bassPitch} octave errors ${r.bassOctaveErrors} (${r.bassSteps} steps, bass decoded in ${r.bassBars} bars)${r.perSection ? ` · drum patterns per section ${r.perSection.join(',')}` : ''}${r.progress ? ` · level A as played: bar 12 ${r.progress.at12 ? `${r.progress.at12.bpm} BPM, downbeat ${r.progress.at12.err} ms off` : '-'}, bar 16 ${r.progress.at16 ? `${r.progress.at16.bpm} BPM` : '-'}${r.progress.relocked ? ', relocked' : ''}` : ''}${r.bounds ? ` · bounds ${r.bounds.join(',')} (err ${r.boundsErr}, extra ${r.extra})` : ''}${r.key ? ` · key ${KEYS[r.key.root]} ${r.key.mode}` : ''}${r.engines ? ` · tempo by ${r.engines.tempo}` : ''} · ${r.ms} ms`;
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
  const tls = await measureTimelines({ full: process.argv.includes('--full') });
  if (process.argv.includes('--json')) console.log(JSON.stringify({ ...res, timeline: tls }, null, 2));
  else {
    for (const [g, list] of Object.entries(res)) for (const [id, r] of Object.entries(list)) console.log(`${g.padEnd(7)} ${id.padEnd(16)} tempo ${r.bpm} (truth ${r.bpmTruth}) downbeat ${r.downbeat}s key ${r.key ? `${['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][r.key.root]} ${r.key.mode}` : '-'} ${r.keyOk ? 'ok' : 'WRONG'} chords ${r.chords} drums on/off ${r.drumsPresence} F1 bd ${r.f1.bd} cp ${r.f1.cp} hh ${r.f1.hh}${r.bass !== null ? ` bass ${r.bass}` : ''}${r.bounds ? ` bounds ${r.bounds.join(',')} (err ${r.boundsErr}, extra ${r.extra}) ending ${r.ending}` : ''}${r.essentiaTempo ? ` essentia tempo ${r.essentiaTempo.bpm} (confidence ${r.essentiaTempo.confidence}, tempo by ${r.engines.tempo})` : ''}${r.hard ? ' (new bench song)' : ''} · ${r.ms} ms`);
    if (!Object.keys(tls).length) console.log('timeline: no app song with its timeline in .cache/decode/wav: run tools/decode-export.cjs with the dev server');
    for (const [id, r] of Object.entries(tls)) for (const [lv, x] of Object.entries(r)) console.log(`timeline ${timelineLine(id, lv, x)}`);
    // the owner's files (DECODE_OWNER_DIR), printed only: level B's bass span per section (decode-refine 8.2, at most 15
    // semitones), with Essentia.js
    if (process.env.DECODE_OWNER_DIR) {
      const { readAudio } = await import('./decode-edits.mjs'), dir = process.env.DECODE_OWNER_DIR;
      for (const f of fs.readdirSync(dir).filter(x => /\.(mp3|wav|flac|ogg|m4a|webm|mp4)$/i.test(x)).sort()) {
        const m = await analyseFull(readAudio(path.join(dir, f)), { engine: nodeEssentia });
        const spans = m.sections.map(s => { const n = m.bars.slice(s.start, s.start + s.bars).flatMap(b => (b.bass || []).filter(x => x !== null && x !== undefined)); return n.length ? Math.max(...n) - Math.min(...n) : '-'; });
        console.log(`owner    ${f}: level B bass span per section (semitones) ${spans.join(',')}`);
      }
    }
    // the owner's files exported by the app with their timeline (DECODE_OWNER_DIR): level A as played, printed only
    if (process.env.DECODE_OWNER_DIR) {
      const { readAudio } = await import('./decode-edits.mjs'), dir = process.env.DECODE_OWNER_DIR;
      for (const f of fs.readdirSync(dir).filter(x => /\.timeline\.json$/.test(x))) {
        const audio = fs.readdirSync(dir).find(x => x !== f && x.startsWith(f.replace(/\.timeline\.json$/, '.')) && /\.(mp3|wav|flac|ogg|m4a|webm)$/i.test(x));
        if (!audio) continue;
        const tl = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), p = levelAProgress(readAudio(path.join(dir, audio)), tl.bpm[0], tl.sections.length ? tl.sections[0].t || 0 : 0);
        console.log(`owner    ${audio}: level A as played: bar 12 ${p.at12 ? `${p.at12.bpm} BPM, downbeat ${p.at12.err} ms off` : '-'}, bar 16 ${p.at16 ? `${p.at16.bpm} BPM (truth ${tl.bpm[0]})` : '-'}${p.relocked ? ', relocked' : ''}`);
      }
    }
  }
}
