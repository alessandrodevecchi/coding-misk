// Autoplay in the Decode tab (decode-library D9, D10): the next track prepared about 30 s before the playing one ends,
// one at a time: the file read (permission granted this session only: no click, no prompt), probed, decoded when its
// sound fits the 120 MB budget, its fingerprint and stored analysis looked up, and a second level A worker loaded with
// the analysis copy (made in 2-second chunks with a pause between them) and asked for the first bars. A track over the
// budget is read only and decoded at the hand-over. The timing rules are pure and checked in Node
// (npm run check:decode-library); the tab does the hand-over.
import { probe, decode, fingerprint, sameFile, analysisCopy, MAX_SECONDS, ANALYSIS_RATE } from './input.js';
import { LOCK_SECONDS } from './misk-analyzer.js';
import { loudnessTrim } from './mix.js';

export const PREPARE_SECONDS = 30;
export const BUDGET_BYTES = 120 * 1024 * 1024;
// the wait at the end of a track before the next one's sound starts without its code (D10)
export const WAIT_SECONDS = 3;
// the file time at which the next track is prepared: 30 s before the end, at once for a shorter track
export const prepareAt = duration => Math.max(0, (duration || 0) - PREPARE_SECONDS);
// the decoded size of a track: 32-bit float samples at the audio context's rate, two channels
export const decodedBytes = (duration, rate = 48000, channels = 2) => Math.ceil((duration || 0) * rate * channels * 4);
export const fitsBudget = (duration, rate = 48000, channels = 2) => decodedBytes(duration, rate, channels) <= BUDGET_BYTES;
// what the tab does at the end of a track with a next one (D10): 'start' when it is ready; else 'wait' in silence until
// it is, and after 3 s 'audio' (its sound starts, its code joins when its tempo is found) once it is decoded
export function endStep({ ready = false, decoded = false, failed = false, waited = 0 } = {}) {
  if (failed) return 'skip';
  if (ready) return 'start';
  if (decoded && waited >= WAIT_SECONDS) return 'audio';
  return 'wait';
}

let seq = 0;
// prepares a row. deps: { ctx() (the audio context), store (the decode store), read(row) → { file, handle, where } |
// null (not allowed now) | throws (gone), worker() → a new level A worker, horizon (seconds asked first), now() }.
// → the prepared track: { row, state, ready (promise), file, handle, where, info, buffer, fp, rec, match, worker, model,
// askId, error, t0, times: { read, decode, analysis } }; drop() releases it
export function prepareTrack(row, deps) {
  const now = deps.now || (() => performance.now());
  const p = { row, state: 'reading', file: null, handle: null, where: null, info: null, buffer: null, fp: null, rec: null, match: false, worker: null, model: null, askId: 1e9 + ++seq, error: null, dropped: false, t0: now(), times: {} };
  const alive = () => !p.dropped;
  p.drop = () => { p.dropped = true; if (p.worker) { try { p.worker.terminate(); } catch (e) {} } p.worker = null; p.buffer = null; p.state = 'dropped'; };
  p.ready = (async () => {
    try {
      const got = await deps.read(row);
      if (!alive()) return p;
      if (!got) { p.state = 'failed'; p.error = 'waiting'; return p; }
      Object.assign(p, got);
      const info = await probe(p.file).catch(() => ({ duration: null, audio: true, video: false }));
      p.info = info; p.times.read = now() - p.t0;
      if (!alive()) return p;
      if (info.duration && info.duration > MAX_SECONDS + 1) { p.state = 'failed'; p.error = 'long'; return p; }
      if (info.video && !info.audio) { p.state = 'failed'; p.error = 'nosound'; return p; }
      const ctx = deps.ctx();
      // over the budget: read only, decoded at the hand-over (D9 step 3)
      if (info.duration && !fitsBudget(info.duration, ctx.sampleRate)) { p.state = 'deferred'; return p; }
      await decodeInto(p, ctx, deps, now);
      return p;
    } catch (e) { if (alive()) { p.state = 'failed'; p.error = (e && e.code) || (e && e.name) || 'format'; } return p; }
  })();
  // the rest of the preparation, also used at the hand-over for a deferred track
  p.finish = async () => { if (p.state !== 'deferred') return p; try { await decodeInto(p, deps.ctx(), deps, now); } catch (e) { if (alive()) { p.state = 'failed'; p.error = (e && e.code) || 'format'; } } return p; };
  return p;
}
async function decodeInto(p, ctx, deps, now) {
  const alive = () => !p.dropped;
  p.state = 'decoding';
  const t = now();
  p.buffer = await decode(p.file, ctx, p.info);
  p.times.decode = now() - t;
  p.decoded = true;
  if (!alive()) return;
  // the original's loudness trim, here rather than at the hand-over
  p.trim = loudnessTrim(p.buffer.getChannelData(0), p.buffer.sampleRate);
  p.fp = await fingerprint(p.file, p.buffer.duration * 1000).catch(() => null);
  p.rec = p.fp ? await deps.store.get(p.fp.key) : null;
  p.match = !!(p.rec && sameFile(p.fp, p.rec));
  if (!alive()) return;
  // (a check may slow this step down: the hand-over's wait and the 3-second rule)
  if (deps.slow) await new Promise(r => setTimeout(r, deps.slow));
  if (!alive()) return;
  p.state = 'analysing';
  const t2 = now(), pcm = await analysisCopy(p.buffer, { chunk: 2 });
  if (!alive()) return;
  const w = deps.worker();
  p.worker = w;
  const first = new Promise(res => {
    w.onmessage = e => { const m = e.data || {}; if (m.type === 'model' && m.id === p.askId) { p.model = m.model; res(); } };
    setTimeout(res, 8000);
  });
  w.postMessage({ type: 'load', pcm, rate: ANALYSIS_RATE }, [pcm.buffer]);
  const tempo = p.match && (p.rec.tempo || (p.rec.modelA && p.rec.modelA.bpm ? { bpm: p.rec.modelA.bpm, downbeat: p.rec.modelA.downbeat, tapped: false } : null));
  if (tempo) w.postMessage({ type: 'tempo', bpm: tempo.bpm, downbeat: tempo.downbeat, tapped: !!tempo.tapped });
  w.postMessage({ type: 'upTo', t: Math.min(p.buffer.duration, LOCK_SECONDS + (deps.horizon || 4)), id: p.askId });
  await first;
  p.times.analysis = now() - t2;
  if (!alive()) return;
  p.state = 'ready';
}
