// The drum machines of the app measured once from their samples (decode-refine D3, task 10.1): per kit the closed hat's
// spectral shape (src/decode/kit-measure.js), from the first sample, the one `.bank(…)` plays. Writes the table to
// src/decode/kits.js, which "Our sounds" reads to pick the machine nearest to a track's hats. Downloads the samples from
// the archive Strudel loads them from (the same files the app plays); needs ffmpeg and a network connection.
// --holdout: instead, the machine level B picks on the held-out songs (tools/decode-songs.mjs
// HOLDOUT_SONGS, exported by `tools/decode-export.cjs --holdout`) against their truth, and on the bench's files when
// exported. Nothing is tuned on the held-out songs; they only verify.
//   node --no-warnings tools/decode-kits.mjs [--print] [--holdout]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KITS } from '../src/music.js';
import { sampleShape, sampleBright } from '../src/decode/kit-measure.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), CACHE = path.join(ROOT, '.cache', 'decode', 'kits');
const INDEX = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json', RATE = 44100;

if (process.argv.includes('--holdout')) {
  const { analyseFull } = await import('../src/decode/full.js');
  const { readAudio } = await import('./decode-edits.mjs');
  const { nodeEssentia } = await import('./essentia-node.mjs');
  const { HOLDOUT_SONGS, TEST_SONGS } = await import('./decode-songs.mjs');
  const appTruth = { 'luci-rosse': { kit: 'RolandTR909', drive: 1.6 }, 'radio-bench-c': { kit: 'RolandTR909', drive: 0 } };
  const truthOf = s => { const d = s.tracks.find(t => t.type === 'drums'); return { kit: d.settings.kit, drive: d.settings.drive || 0 }; };
  const sets = [['held out', path.join(ROOT, '.cache', 'decode', 'holdout'), HOLDOUT_SONGS.map(s => [s.id, truthOf(s)])], ['bench', path.join(ROOT, '.cache', 'decode', 'wav'), [...TEST_SONGS.map(s => [s.id, truthOf(s)]), ...Object.entries(appTruth)]]];
  for (const [name, dir, list] of sets) {
    let kitOk = 0, n = 0;
    for (const [id, truth] of list) {
      const file = path.join(dir, `${id}.wav`);
      if (!fs.existsSync(file)) { console.log(`${name} ${id}: not exported`); continue; }
      const m = await analyseFull(readAudio(file), { engine: nodeEssentia }), d = m.drumSound || {};
      const ko = d.kit === truth.kit;
      n++; kitOk += ko;
      console.log(`${name.padEnd(8)} ${id.padEnd(26)} kit ${String(d.kit).padEnd(12)} r ${d.ranks && d.ranks[0] ? d.ranks[0].r : '-'} (truth ${truth.kit}${ko ? '' : ', WRONG'}; next ${(d.ranks || []).slice(1, 3).map(r => `${r.kit} ${r.r}`).join(', ')}) · truth drive ${truth.drive}`);
    }
    if (n) console.log(`${name}: machine right on ${kitOk} of ${n}\n`);
  }
  process.exit(0);
}

fs.mkdirSync(CACHE, { recursive: true });
const get = async (url, file) => { if (!fs.existsSync(file)) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); } return file; };
const pcmOf = file => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-']); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice(); };
const index = JSON.parse(fs.readFileSync(await get(INDEX, path.join(CACHE, 'index.json')), 'utf8')), base = index._base;
const out = {};
for (const kit of KITS) {
  const hh = index[`${kit}_hh`];
  if (!hh) continue;
  const pick = async list => pcmOf(await get(base + list[0], path.join(CACHE, list[0].replace(/[/ ]/g, '_'))));
  try { const h = await pick(hh); out[kit] = { hatBright: sampleBright(h, RATE), hatShape: sampleShape(h, RATE) }; }
  catch (e) { console.error(`${kit}: ${e.message}`); }
}
const rows = Object.entries(out).map(([k, v]) => `  ${k}: { hatBright: ${v.hatBright}, hatShape: [${v.hatShape.join(', ')}] },`).join('\n');
const src = `// The app's drum machines measured from their first closed hat sample by tools/decode-kits.mjs (decode-refine D3): the
// hat's brightness (the centroid above 2 kHz, Hz) and spectral shape (twelfth-octave bands from 2 to 16 kHz in log
// energy, tilt taken out); src/decode/kit-measure.js.
// Made by the tool; do not edit.
export const KIT_MEASURES = {
${rows}
};
`;
if (process.argv.includes('--print')) console.log(src);
else { fs.writeFileSync(path.join(ROOT, 'src', 'decode', 'kits.js'), src); console.log(`wrote src/decode/kits.js (${Object.keys(out).length} kits)`); }
