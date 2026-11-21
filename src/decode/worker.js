// The analysis worker of the Decode tab (track-to-code D4): it holds the mono PCM and answers "analyse up to t" (level
// A, as the playhead moves plus the look ahead) and "analyse all" (level B: the whole file, with Essentia.js loaded
// only then, full.js) away from the page's main thread. The tab runs level B in a worker of its own, so a cancel ends
// that worker and level A goes on. Messages in: { type: 'load', pcm, rate } | { type: 'upTo', t, id } | { type:
// 'tempo', bpm, downbeat, tapped, fixed } | { type: 'auto' } (back to the tempo found) | { type: 'all', id, tempo, essentia, beats } | { type: 'cancel' }. Out: { type: 'model', id, model }
// | { type: 'progress', id, f, stage } | { type: 'full', id, model } | { type: 'error', id, message }.
import { createAnalyzer } from './misk-analyzer.js';

let A = null, pcm = null, rate = 44100, busy = false, want = null, cancelled = false;
async function run() {
  if (busy || !want || !A) return;
  busy = true;
  const job = want; want = null;
  try {
    const model = A.model(job.t);
    if (!cancelled) postMessage({ type: 'model', id: job.id, model, locked: !!A.locked });
  } catch (e) { postMessage({ type: 'error', message: String(e && e.message || e) }); }
  busy = false;
  if (want) setTimeout(run, 0);
}
// level B: misk-analyzer over the whole file, Essentia.js for tempo, key and chords unless it is switched off (a check)
// (decode round 12: beats: the learned beat tracker, an option of Settings, off by default; sent only when it is on and
// its files are downloaded. The files are read from the cache and checked against their pins here, the runtime is
// imported only then)
async function all({ id, tempo = null, essentia = true, beats = false }) {
  let tracker = null;
  try {
    const { analyseFull } = await import('./full.js');
    const engine = essentia ? async () => (await import('./engine-essentia.js')).createEssentiaEngine() : null;
    const beatTracker = beats ? async () => (tracker = await (await import('./engine-beat-this-browser.js')).browserBeatThis()) : null;
    const model = await analyseFull(pcm, { sr: rate, tempo, engine, beatTracker, onProgress: (f, stage) => postMessage({ type: 'progress', id, f, stage }) });
    postMessage({ type: 'full', id, model });
  } catch (e) { postMessage({ type: 'error', id, message: String(e && e.message || e) }); }
  if (tracker) tracker.release().catch(() => {});
}
onmessage = e => {
  const m = e.data || {};
  if (m.type === 'load') { pcm = m.pcm; rate = m.rate; A = createAnalyzer(m.pcm, { sr: m.rate }); cancelled = false; postMessage({ type: 'loaded', duration: A.duration }); return; }
  if (m.type === 'upTo') { cancelled = false; want = { t: m.t, id: m.id }; run(); return; }
  if (m.type === 'tempo' && A) { A.setTempo({ bpm: m.bpm, downbeat: m.downbeat, tapped: m.tapped !== false, fixed: m.fixed !== false }); return; }
  if (m.type === 'auto' && A) { A.resetTempo(); return; }
  if (m.type === 'all' && pcm) { all(m); return; }
  if (m.type === 'cancel') { cancelled = true; want = null; }
};
