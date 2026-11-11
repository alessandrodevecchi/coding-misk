// Separation probe (decode-tab-audio): htdemucs ONNX with fp16 weights (MIT), speed and memory in Node; mix.f32 is 32 s of stereo 44.1 kHz float PCM; model/ holds htdemucs_fp16weights.onnx. node bench.mjs node|web [segments]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const which = process.argv[2] || 'node', SEGS = +(process.argv[3] || 4);
const ort = which === 'web' ? require('onnxruntime-web') : require('onnxruntime-node');
if (which === 'web') { ort.env.wasm.numThreads = +(process.env.THREADS || 4); }
const L = 343980, raw = new Float32Array(readFileSync(new URL('./mix.f32', import.meta.url)).buffer.slice(0));
const frames = raw.length / 2;
const t0 = performance.now();
const opts = which === 'web' ? { executionProviders: ['wasm'] } : { executionProviders: ['cpu'], intraOpNumThreads: +(process.env.THREADS || 4) };
const model = which === 'web' ? readFileSync(new URL('./model/htdemucs_fp16weights.onnx', import.meta.url)) : new URL('./model/htdemucs_fp16weights.onnx', import.meta.url).pathname;
const s = await ort.InferenceSession.create(model, opts);
const load = performance.now() - t0;
const times = [], energy = [0, 0, 0, 0];
let peakRss = process.memoryUsage().rss;
for (let k = 0; k < SEGS && (k + 1) * L <= frames; k++) {
  const x = new Float32Array(2 * L);
  for (let i = 0; i < L; i++) { x[i] = raw[2 * (k * L + i)]; x[L + i] = raw[2 * (k * L + i) + 1]; }
  const a = performance.now();
  const out = await s.run({ mix: new ort.Tensor('float32', x, [1, 2, L]) });
  times.push(performance.now() - a);
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  const y = out.stems.data;
  for (let st = 0; st < 4; st++) { let e = 0; for (let i = 0; i < 2 * L; i++) e += y[st * 2 * L + i] ** 2; energy[st] += e; }
}
const tot = energy.reduce((a, b) => a + b, 0);
const seg = L / 44100;
console.log(JSON.stringify({ runtime: which, threads: process.env.THREADS || 4, loadMs: Math.round(load), segS: +seg.toFixed(2), msPerSeg: times.map(Math.round), rtf: +(times.reduce((a, b) => a + b, 0) / times.length / 1000 / seg).toFixed(3), peakRssMB: Math.round(peakRss / 1048576), energyShare: Object.fromEntries(['drums', 'bass', 'other', 'vocals'].map((n, i) => [n, +(energy[i] / tot).toFixed(3)])) }));
