// The analysis worker of the Decode tab (track-to-code D4): it holds the mono PCM and answers "analyse up to t" (level
// A, as the playhead moves plus the look ahead) away from the page's main thread. Level B ("analyse all") comes with
// its own change. Messages in: { type: 'load', pcm, rate } | { type: 'upTo', t, id } | { type: 'tempo', bpm, downbeat }
// | { type: 'cancel' }. Out: { type: 'model', id, model } | { type: 'error', message }.
import { createAnalyzer } from './misk-analyzer.js';

let A = null, busy = false, want = null, cancelled = false;
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
onmessage = e => {
  const m = e.data || {};
  if (m.type === 'load') { A = createAnalyzer(m.pcm, { sr: m.rate }); cancelled = false; postMessage({ type: 'loaded', duration: A.duration }); return; }
  if (m.type === 'upTo') { cancelled = false; want = { t: m.t, id: m.id }; run(); return; }
  if (m.type === 'tempo' && A) { A.setTempo({ bpm: m.bpm, downbeat: m.downbeat, tapped: m.tapped !== false }); return; }
  if (m.type === 'cancel') { cancelled = true; want = null; }
};
