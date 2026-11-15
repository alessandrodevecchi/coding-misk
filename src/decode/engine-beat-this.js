// Beat This! for level B (decode-beat-tracker): ONNX Runtime (onnxruntime-web, MIT, pinned in package.json) runs the
// log-mel front end and the beat model on the whole file, a chunk of 30 s at a time, on the WebAssembly backend with one
// thread. Bench only for now (tools/beat-this-node.mjs); the browser build that the round 10 spike measured is in the
// notes. The model files come in as bytes the caller has checked against their SHA-256. Pure apart from the runtime
// passed in.
import { BT, toModelRate, chunkStarts, chunkOf, joinChunks, postprocess, BEAT_THIS_ID, BEAT_THIS_VERSION } from './beat-this.js';

// ort: the onnxruntime-web module (or its Node build); files: { mel: Uint8Array, model: Uint8Array }; ep: 'wasm' (default)
// or 'webgpu' → { id, version, track(pcm, sr, { onProgress }) → { beats, downbeats, ms }, release() }
export async function createBeatThisEngine(ort, files, { ep = 'wasm' } = {}) {
  const opts = { executionProviders: [ep], graphOptimizationLevel: 'all' };
  const mel = await ort.InferenceSession.create(files.mel, { executionProviders: ['wasm'] });
  const model = await ort.InferenceSession.create(files.model, opts);
  const melIn = mel.inputNames[0], modelIn = model.inputNames[0];
  const [outBeat, outDown] = model.outputNames;
  return {
    id: BEAT_THIS_ID, version: BEAT_THIS_VERSION, ep,
    async track(pcm, sr, { onProgress = () => {} } = {}) {
      const t0 = Date.now(), x = toModelRate(pcm, sr);
      // the front end a minute at a time (a whole file at once holds its STFT in memory twice); a frame every 441
      // samples, so a minute is exactly 3000 frames and the pieces join without a seam (each piece padded like the whole)
      const piece = 60 * BT.sr, frames = Math.floor(x.length / 441) + 1, spec = new Float32Array(frames * 128);
      let at = 0;
      for (let a = 0; a < x.length; a += piece) {
        // two frames of context on both sides (882 samples, more than half the 1024-sample window) so the windows at the
        // seams see the same samples as on the whole file; the pieces start on a frame (a multiple of 441)
        const pad = 882, lo = Math.max(0, a - pad), hi = Math.min(x.length, a + piece + pad), last = a + piece >= x.length;
        const r = await mel.run({ [melIn]: new ort.Tensor('float32', x.slice(lo, hi), [1, hi - lo]) });
        const out = r[mel.outputNames[0]], data = out.data, skip = (a - lo) / 441, want = last ? frames - at : piece / 441;
        spec.set(data.subarray(skip * 128, (skip + want) * 128), at * 128);
        at += want;
        out.dispose && out.dispose();
        onProgress(0.15 * Math.min(1, (a + piece) / x.length));
        await new Promise(res => setTimeout(res, 0));
      }
      const n = Math.min(at, frames), starts = chunkStarts(n), preds = [];
      for (let c = 0; c < starts.length; c++) {
        const ch = chunkOf(spec, n, starts[c]);
        const r = await model.run({ [modelIn]: new ort.Tensor('float32', ch.data, [1, ch.frames, 128]) });
        preds.push({ beat: Float32Array.from(r[outBeat].data).slice(0, ch.frames), downbeat: Float32Array.from(r[outDown].data).slice(0, ch.frames) });
        for (const k of Object.keys(r)) r[k].dispose && r[k].dispose();
        onProgress(0.15 + 0.85 * ((c + 1) / starts.length));
        await new Promise(res => setTimeout(res, 0));
      }
      const { beats, downbeats } = postprocess(joinChunks(preds, starts, n));
      return { beats, downbeats, frames: n, ms: Date.now() - t0 };
    },
    async release() { await mel.release(); await model.release(); },
  };
}
