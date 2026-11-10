// How often the decoded code changes (decode-refine D7): the code the Decode tab shows at each bar, in Live (level A,
// the model analysed up to the look ahead's horizon as the track plays) and in Full (level B, the whole-file song with
// "Follow the song"), and the edits between consecutive bars: the share of bars with an edited line, the edits per
// minute, the average size in characters, the share of edits of 12 characters or less, the share of section changes
// (level B's sections) with an edit within one bar. An edit is a bar whose code differs from the bar before (the vocal
// lines left out: they change only at a section change).
//   node --no-warnings tools/decode-edits.mjs <audio file…> [--look 2bars] [--no-essentia] [--json] [--levels A,B]
//     [--rule '{"lineBars":6}']   other numbers for the edit rule (EDIT_RULE in src/decode/writer.js) in this run
// Any format ffmpeg reads. Generated test songs: tools/check-decode.mjs measures them with the same functions.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createAnalyzer, horizonOf, LOOK_AHEAD_DEFAULT, ANALYSIS_RATE } from '../src/decode/misk-analyzer.js';
import { analyseFull } from '../src/decode/full.js';
import { momentSong, writeFull, withoutVox, EDIT_RULE } from '../src/decode/writer.js';
import { liveCode } from '../src/live/live-code.js';
import { followSong } from '../src/song/crescendo.js';
import { decodeControls } from '../src/decode/tab.js';

// the PCM of a file: mono float at the analysis rate, by ffmpeg
export function readAudio(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(ANALYSIS_RATE), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4).slice();
}

// the lines of the code that carry music (the cover line, the tempo and comments left out)
const musicLines = code => withoutVox(code).split('\n').filter(l => /^\s*[_S]?\$:|^\s*\./.test(l));
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
// the characters changed from one code to the next: each line of the new code not in the old one, against the most
// alike old line not in the new one (a new line counts whole), plus the old lines left without a partner
export function editSize(before, after) {
  const A = musicLines(before), B = musicLines(after), left = A.slice();
  // a mute or unmute only (`$:` and `_$:`, a part that stops or enters): its own kind, not a small edit
  const bare = l => l.replace(/^\s*_?\$:\s*/, '');
  if (A.length === B.length && A.some((l, i) => l !== B[i]) && A.every((l, i) => bare(l) === bare(B[i]))) return -1;
  const added = [];
  for (const l of B) { const k = left.indexOf(l); if (k >= 0) left.splice(k, 1); else added.push(l); }
  let size = 0;
  for (const l of added) {
    let best = -1, d = l.length;
    left.forEach((o, k) => { const x = lev(o, l); if (x < d) { d = x; best = k; } });
    if (best >= 0) left.splice(best, 1);
    size += d;
  }
  for (const o of left) size += o.length;
  return size;
}
// codes: the code shown at each bar from the first one with music; bpm; sectionStarts: bars where a section starts
export function editStats(codes, bpm, sectionStarts = []) {
  const edits = [];
  for (let b = 1; b < codes.length; b++) { const s = editSize(codes[b - 1], codes[b]); if (s !== 0) edits.push({ bar: b, size: s }); }
  const bars = Math.max(1, codes.length - 1), minutes = (codes.length * 240) / bpm / 60;
  const starts = sectionStarts.filter(s => s > 0 && s < codes.length);
  const covered = starts.filter(s => edits.some(e => e.bar >= s && e.bar <= s + 1)).length;
  const r = x => Math.round(x * 1000) / 1000, text = edits.filter(e => e.size > 0);
  return {
    bars: codes.length, edits: edits.length, mutes: edits.length - text.length, share: r(edits.length / bars), perMinute: r(edits.length / minutes),
    avgSize: text.length ? Math.round(text.reduce((a, e) => a + e.size, 0) / text.length) : 0,
    small: text.length ? r(text.filter(e => e.size <= 12).length / text.length) : 0,
    sections: starts.length ? r(covered / starts.length) : null, at: edits.map(e => e.bar),
  };
}

const C = () => decodeControls();
// level A as the tab plays it: before each bar the model up to the horizon, the code of the moment of that bar (or of
// the last bar the model knows)
export function liveCodes(pcm, { look = LOOK_AHEAD_DEFAULT, sounds = 'ours', title = 'T' } = {}) {
  const A = createAnalyzer(pcm), dur = A.duration, ctl = C(), out = [];
  let m = A.model(Math.min(dur, 12));
  if (!m.barSeconds) return { codes: [], bpm: 0 };
  const memo = new Map();
  const codeOf = (model, bar) => liveCode({ ...momentSong(model, bar, { title, sounds }), build: [], crescendo: { growth: 0 } }, ctl, {}).codeAt(0);
  for (let b = 0; ; b++) {
    const t = m.downbeat + b * m.barSeconds - 0.05;
    if (t > dur - 0.5) break;
    const h = Math.min(dur, horizonOf(Math.max(0, t), look, m.barSeconds));
    if (h > (m.analysedTo || 0) + 0.01) m = A.model(h + 0.5);
    const known = Math.floor((h - m.downbeat) / m.barSeconds + 1e-6) - 1, at = Math.min(b, known, m.bars.length - 1);
    if (at < 0) continue;
    const key = `${m.bars.length}|${at}`;
    if (!memo.has(key)) memo.set(key, codeOf(m, at));
    out.push(memo.get(key));
  }
  // from the first bar with a part
  const first = out.findIndex(c => musicLines(c).some(l => /^\s*\$:/.test(l) && !/\$: silence/.test(l)));
  return { codes: first < 0 ? [] : out.slice(first), bpm: m.bpm, offset: Math.max(0, first) };
}
// level B: the code of every bar of the whole-file song with "Follow the song"
export function fullCodes(modelB, { sounds = 'ours', title = 'T' } = {}) {
  const song = writeFull(modelB, { id: 'x', title, sounds }), lc = liveCode(followSong(song), C(), {});
  const n = song.sections.reduce((a, s) => a + s.bars, 0), codes = [];
  for (let b = 0; b < n; b++) codes.push(lc.codeAt(b));
  return { codes, bpm: modelB.bpm, sections: (modelB.sections || []).map(s => s.start) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const files = args.filter((a, i) => !a.startsWith('--') && !['--look', '--levels', '--rule'].includes(args[i - 1]));
  if (opt('--rule')) Object.assign(EDIT_RULE, JSON.parse(opt('--rule')));
  const look = opt('--look') || LOOK_AHEAD_DEFAULT, levels = (opt('--levels') || 'A,B').split(','), json = args.includes('--json');
  const { nodeEssentia } = await import('./essentia-node.mjs');
  const rows = [];
  for (const f of files) {
    const pcm = readAudio(f), name = path.basename(f).slice(0, 24);
    const B = await analyseFull(pcm, { engine: args.includes('--no-essentia') ? null : nodeEssentia });
    const secs = (B.sections || []).map(s => s.start);
    if (levels.includes('A')) { const a = liveCodes(pcm, { look }); const shift = Math.round((a.offset || 0)); rows.push({ file: name, level: 'A', ...editStats(a.codes, a.bpm, secs.map(s => s - shift)) }); }
    if (levels.includes('B')) { const b = fullCodes(B); rows.push({ file: name, level: 'B', ...editStats(b.codes, b.bpm, b.sections) }); }
  }
  if (json) console.log(JSON.stringify(rows, null, 1));
  else {
    console.log('file                      level  bars  edits  mutes  bars edited  per min  avg size  small  sections');
    for (const r of rows) console.log(`${r.file.padEnd(25)} ${r.level.padEnd(6)} ${String(r.bars).padStart(4)}  ${String(r.edits).padStart(5)}  ${String(r.mutes).padStart(5)}  ${(Math.round(r.share * 100) + ' %').padStart(11)}  ${r.perMinute.toFixed(1).padStart(7)}  ${String(r.avgSize).padStart(8)}  ${(Math.round(r.small * 100) + ' %').padStart(5)}  ${r.sections === null ? '-' : Math.round(r.sections * 100) + ' %'}`);
  }
}
