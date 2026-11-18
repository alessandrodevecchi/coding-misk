// Beat This! in Node, for the Decode bench and checks (decode-beat-tracker): the same engine as the level B worker
// (src/decode/engine-beat-this.js) on onnxruntime-web's WebAssembly backend, one thread, the model files read from the
// git-ignored .cache/beat-this/ (BEAT_THIS_DIR) and checked against their SHA-256 pins. Results are cached per audio and
// model in .cache/beat-this/results/ (the bench analyses the same files many times).
//   import { nodeBeatThis } from './beat-this-node.mjs'   → analyseFull(pcm, { beatTracker: nodeBeatThis })
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BEAT_THIS_FILES } from '../src/decode/beat-this.js';
import { createBeatThisEngine } from '../src/decode/engine-beat-this.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BT_DIR = process.env.BEAT_THIS_DIR || path.join(ROOT, '.cache', 'beat-this');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
// the small model (10 MB), for the bench's comparison only: the app offers the big one
export const SMALL = { name: 'beat_this_small0.onnx', url: BEAT_THIS_FILES.model.url.replace('beat_this_final0', 'beat_this_small0'), bytes: 10555642, sha256: '53fda6e96afae7f44d898fa5f020272eda967a92839306bf7a3d0898fb8a0d9a' };
const FILES = { ...BEAT_THIS_FILES, small: SMALL };
// a pinned file's bytes; throws when it is missing or does not match its SHA-256
export function readPinned(key, files = FILES) {
  const f = files[key], p = path.join(BT_DIR, f.name);
  if (!fs.existsSync(p)) throw new Error(`Beat This! ${f.name} is not in ${BT_DIR} (download it from ${f.url})`);
  const b = fs.readFileSync(p);
  if (sha(b) !== f.sha256) throw new Error(`Beat This! ${f.name} does not match its SHA-256 pin`);
  return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
}
const engines = {};
export async function nodeEngine({ model = 'model' } = {}) {
  const ort = await import('onnxruntime-web/wasm');
  ort.env.wasm.numThreads = 1;
  return createBeatThisEngine(ort, { mel: readPinned('mel'), model: readPinned(model) });
}
// the analysis's hook for one model ('model': the big one, 'small'): → { beats, downbeats } of a mono pcm at sr, cached
export const nodeBeatThisOf = (which = 'model') => async () => {
  const engine = (engines[which] = engines[which] || (await nodeEngine({ model: which })));
  return {
    id: engine.id, version: which === 'model' ? engine.version : which,
    async track(pcm, sr, o) {
      const key = `${sha(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength))}-${sr}-${which === 'model' ? engine.version : which}`;
      const dir = path.join(BT_DIR, 'results'), f = path.join(dir, `${key}.json`);
      if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
      const r = await engine.track(pcm, sr, o);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(f, JSON.stringify(r));
      return r;
    },
  };
};
export const nodeBeatThis = nodeBeatThisOf('model');
