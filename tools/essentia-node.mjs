// Essentia.js in Node, for the Decode checks and measures (track-to-code D5): the package's UMD build (the ES build
// the browser loads expects a page), behind the same engine as the level B worker (src/decode/engine-essentia.js).
//   import { nodeEssentia } from './essentia-node.mjs'   → analyseFull(pcm, { engine: nodeEssentia })
import { createRequire } from 'node:module';
import { createEssentiaEngine } from '../src/decode/engine-essentia.js';

const require = createRequire(import.meta.url);
let engine = null;
export const nodeEssentia = () => (engine = engine || createEssentiaEngine(async () => { const { EssentiaWASM, Essentia } = require('essentia.js'); return { EssentiaWASM, Essentia }; }));
