// The learned beat tracker in the browser (decode-beat-tracker): ONNX Runtime Web's WebAssembly build, one thread, no
// proxy worker, its .wasm file bundled and served by the app (Vite's ?url), and the model files from this browser's
// cache, checked against their pins (beat-this-store.js) before the runtime is even imported. Loaded only by the level
// B worker, only when the option is on in Settings and the files are downloaded.
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import { loadBeatThis } from './beat-this-store.js';
import { createBeatThisEngine } from './engine-beat-this.js';

export async function browserBeatThis() {
  const files = await loadBeatThis();
  const ort = await import('onnxruntime-web/wasm');
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = { wasm: wasmUrl };
  return createBeatThisEngine(ort, files);
}
