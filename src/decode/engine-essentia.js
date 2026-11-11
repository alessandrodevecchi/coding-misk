// Essentia.js in level B (track-to-code D5): the browser build (WebAssembly) of the Essentia library, AGPL-3.0, pinned
// at 0.1.3. misk-analyzer calls it for three whole-track measures only: tempo and beats (RhythmExtractor2013,
// multifeature), key (KeyExtractor) and chords (HPCP frames, then ChordsDetectionBeats on the beats of the bars).
// Loaded only when level B runs, by a dynamic import inside the level B worker (worker.js), so no other tab downloads
// it; the Node checks load the package's UMD build instead (the loader is passed in). Every measure may throw: the
// caller (full.js) computes it with misk-analyzer's own code then.
//
// engine: { id, version, incremental: false, rhythm(pcm), key(pcm), chords(pcm, ticks) }

export const ESSENTIA_ID = 'essentia.js';
export const ESSENTIA_VERSION = '0.1.3';

// the browser loader: the ES module with the WebAssembly inlined, and the core API (two chunks of their own in the build)
export async function browserLoader() {
  const [wasm, core] = await Promise.all([import('essentia.js/dist/essentia-wasm.es.js'), import('essentia.js/dist/essentia.js-core.es.js')]);
  return { EssentiaWASM: wasm.EssentiaWASM, Essentia: core.default };
}

// the WebAssembly runtime is ready once its embind classes exist (the inlined module compiles asynchronously in a browser)
async function runtimeReady(W, ms = 15000) {
  const t0 = Date.now();
  while (!(W && W.EssentiaJS)) {
    if (Date.now() - t0 > ms) throw new Error('Essentia.js did not start');
    await new Promise(r => setTimeout(r, 20));
  }
}

// → the engine, or throws (the module cannot be loaded or does not start)
export async function createEssentiaEngine(load = browserLoader) {
  const { EssentiaWASM, Essentia } = await load();
  await runtimeReady(EssentiaWASM);
  const e = new Essentia(EssentiaWASM);
  const toArray = v => { const n = v.size(), out = new Array(n); for (let i = 0; i < n; i++) out[i] = v.get(i); return out; };
  const free = (...xs) => { for (const x of xs) try { if (x && x.delete) x.delete(); } catch (err) { /* already freed */ } };
  return {
    id: ESSENTIA_ID, version: ESSENTIA_VERSION, core: e.version, incremental: false,
    // whole-track tempo and beats: { bpm, confidence (0 to about 5.3), ticks: [seconds] }
    rhythm(pcm) {
      const v = e.arrayToVector(pcm);
      try {
        const r = e.RhythmExtractor2013(v, 208, 'multifeature', 40);
        const out = { bpm: r.bpm, confidence: r.confidence, ticks: Array.from(e.vectorToArray(r.ticks)) };
        free(r.ticks, r.estimates, r.bpmIntervals);
        return out;
      } finally { free(v); }
    },
    // key: { root (pitch class), mode ('major' | 'minor'), strength }
    key(pcm) {
      const v = e.arrayToVector(pcm);
      try {
        const k = e.KeyExtractor(v);
        const root = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }[k.key];
        if (root === undefined) throw new Error(`unknown key ${k.key}`);
        return { root, mode: k.scale === 'minor' ? 'minor' : 'major', strength: k.strength };
      } finally { free(v); }
    },
    // the top line (decode-refine D2): PredominantPitchMelodia (MELODIA), a pitch per frame of `hop` samples and its
    // confidence; 0 Hz where no melody is voiced → { hop, sr, pitch: Float32Array (Hz), conf: Float32Array }
    melody(pcm, { sr = 44100 } = {}) {
      const v = e.arrayToVector(pcm);
      try {
        const r = e.PredominantPitchMelodia(v, 10, 3, 2048, false, 0.8, 256, 1, 40, 2100, 100, 150, 20, 0.9, 0.9, 27.5625, 55, sr);
        const out = { hop: 256, sr, pitch: Float32Array.from(e.vectorToArray(r.pitch)), conf: Float32Array.from(e.vectorToArray(r.pitchConfidence)) };
        free(r.pitch, r.pitchConfidence);
        return out;
      } finally { free(v); }
    },
    // chords between consecutive ticks: HPCP frames (4096 points, hop 2048, up to 5 kHz, 8 harmonics), then
    // ChordsDetectionBeats → [{ chord: "A#m" | "C" …, strength }] one per interval (the last ones may be missing)
    chords(pcm, ticks, { sr = 44100, onProgress = null } = {}) {
      const frames = e.FrameGenerator(pcm, 4096, 2048), hp = new e.module.VectorVectorFloat(), n = frames.size();
      try {
        for (let i = 0; i < n; i++) {
          const f = frames.get(i), w = e.Windowing(f, true, 4096, 'blackmanharris62'), sp = e.Spectrum(w.frame), pk = e.SpectralPeaks(sp.spectrum, 0, 5000, 100, 40, 'magnitude', sr);
          const h = e.HPCP(pk.frequencies, pk.magnitudes, true, 500, 8, 5000, false, 40, false, 'unitMax', 440, sr, 12);
          hp.push_back(h.hpcp);
          free(f, w.frame, sp.spectrum, pk.frequencies, pk.magnitudes, h.hpcp);
          if (onProgress && i % 400 === 0) onProgress(i / n);
        }
        const tv = e.arrayToVector(Float32Array.from(ticks));
        const r = e.ChordsDetectionBeats(hp, tv, 'interbeat_median', 2048, sr);
        const names = toArray(r.chords), strength = Array.from(e.vectorToArray(r.strength));
        free(tv, r.chords, r.strength);
        return names.map((chord, i) => ({ chord, strength: strength[i] ?? 0 }));
      } finally { free(frames, hp); }
    },
  };
}
