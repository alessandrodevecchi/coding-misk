// The drum machines of the app measured once from their samples (decode-refine D3, task 10.1): per kit the kick's
// decay (seconds to -20 dB in the kick band) and the closed hat's brightness (the centroid above 2 kHz), from the first
// sample of each, the one `.bank(…)` plays. Writes the table to
// src/decode/kits.js, which "Our sounds" reads to pick the machine nearest to a track's measures. Downloads the samples
// from the archive Strudel loads them from (the same files the app plays); needs ffmpeg and a network connection.
//   node --no-warnings tools/decode-kits.mjs [--print]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KITS } from '../src/music.js';
import { soundMeasures } from '../src/decode/kit-measure.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), CACHE = path.join(ROOT, '.cache', 'decode', 'kits');
const INDEX = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json', RATE = 44100;
fs.mkdirSync(CACHE, { recursive: true });
const get = async (url, file) => { if (!fs.existsSync(file)) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); } return file; };
const pcmOf = file => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-']); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice(); };
const index = JSON.parse(fs.readFileSync(await get(INDEX, path.join(CACHE, 'index.json')), 'utf8')), base = index._base;
const out = {};
for (const kit of KITS) {
  const bd = index[`${kit}_bd`], hh = index[`${kit}_hh`];
  if (!bd || !hh) continue;
  const pick = async list => pcmOf(await get(base + list[0], path.join(CACHE, list[0].replace(/[/ ]/g, '_'))));
  try {
    const k = soundMeasures(await pick(bd), RATE), h = soundMeasures(await pick(hh), RATE);
    out[kit] = { kickDecay: k.decay, hatBright: h.bright };
  } catch (e) { console.error(`${kit}: ${e.message}`); }
}
const r = x => Math.round(x * 1000) / 1000;
const rows = Object.entries(out).map(([k, v]) => `  ${k}: { kickDecay: ${r(v.kickDecay)}, hatBright: ${Math.round(v.hatBright)} },`).join('\n');
const src = `// The app's drum machines measured from their first kick and closed hat samples by tools/decode-kits.mjs (decode-refine
// D3): the kick's decay (seconds to -20 dB in the kick band) and the closed hat's brightness (centroid above 2 kHz, Hz).
// Made by the tool; do not edit.
export const KIT_MEASURES = {
${rows}
};
`;
if (process.argv.includes('--print')) console.log(src);
else { fs.writeFileSync(path.join(ROOT, 'src', 'decode', 'kits.js'), src); console.log(`wrote src/decode/kits.js (${Object.keys(out).length} kits)`); }
