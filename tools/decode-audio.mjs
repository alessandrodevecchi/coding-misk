// Test audio for the Decode checks (track-to-code): a small deterministic synthesizer that renders a known song
// (tempo, chords per bar, drum grids, bass) to mono PCM, so misk-analyzer's results can be measured against the truth
// without a browser. Also a WAV reader and writer (PCM 16 and 24 bit, float 32). No third-party audio.
//   import { renderSong, readWav, writeWav } from './decode-audio.mjs'
import fs from 'node:fs';

export const RATE = 44100;
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export const chordTones = name => { const m = /^([A-G][#b]?)(m)?$/.exec(name); const r = NOTE[m[1]]; return { root: r, tones: [r, r + (m[2] ? 3 : 4), r + 7] }; };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);

// a seeded random (mulberry32)
const rng = seed => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// spec: { bpm, bars, lead: seconds of silence before bar 1, chords: ['Am', 'F', …] (one per bar, repeating),
//   drums: { bd, cp, hh, oh: 16-step strings }, drumsOff: [[from, to]] bars without drums, bass: 16-step string ('x'
//   plays the chord root in octave 1 or 2), bassOff, chordsOff, seed }
// → { pcm: Float32Array, truth: { bpm, downbeat, bars: [{ chord, drums, bass: [midi|null ×16] }] } }
export function renderSong(spec) {
  const { bpm, bars, lead = 0, chords = ['Am'], drums = {}, drumsOff = [], bass = '', bassOff = [], chordsOff = [], seed = 7, gain = 0.5 } = spec;
  const bar = 240 / bpm, step = bar / 16, n = Math.ceil((lead + bars * bar + 1) * RATE), out = new Float32Array(n), rnd = rng(seed);
  const off = (list, b) => list.some(([a, z]) => b >= a && b < z);
  const add = (t0, len, fn) => { const a = Math.round(t0 * RATE), z = Math.min(n, a + Math.round(len * RATE)); for (let i = a; i < z; i++) out[i] += fn((i - a) / RATE); };
  const kick = t => { const f = 50 + 100 * Math.exp(-t / 0.03), ph = 2 * Math.PI * (50 * t + 100 * 0.03 * (1 - Math.exp(-t / 0.03))); return 0.9 * Math.sin(ph) * Math.exp(-t / 0.13) * (f > 0 ? 1 : 0); };
  // noise through a simple high-pass (difference), for claps and hats
  const noise = (hp) => { let prev = 0; return () => { const v = rnd() * 2 - 1, o = hp ? v - prev : v; prev = v; return o; }; };
  const clapN = noise(false), hatN = noise(true);
  const clap = t => 0.35 * clapN() * Math.exp(-t / 0.07) * (t < 0.03 ? 1 : 0.7);
  const hat = d => t => 0.18 * hatN() * Math.exp(-t / d);
  const truth = { bpm, downbeat: lead, bars: [] };
  for (let b = 0; b < bars; b++) {
    const t0 = lead + b * bar, name = chords[b % chords.length], ch = chordTones(name);
    const tb = { chord: off(chordsOff, b) ? null : name, drums: {}, bass: Array(16).fill(null) };
    if (!off(drumsOff, b)) for (const [row, steps] of Object.entries(drums)) {
      tb.drums[row] = steps;
      for (let j = 0; j < 16; j++) if (steps[j] === 'x') add(t0 + j * step, row === 'bd' ? 0.35 : row === 'oh' ? 0.3 : 0.15, row === 'bd' ? kick : row === 'cp' ? clap : hat(row === 'oh' ? 0.12 : 0.025));
    }
    if (!off(chordsOff, b)) {
      // a sustained triad around C4, three detuned saws per note through a one-pole low-pass
      for (const tn of ch.tones) {
        const f = hz(57 + (((tn - 9) % 12) + 12) % 12), ph = rnd();
        let lp = 0;
        add(t0, bar * 0.98, t => { const s = 2 * ((f * t + ph) % 1) - 1; lp += 0.08 * (s - lp); return 0.09 * lp * Math.min(1, t / 0.01) * Math.min(1, (bar * 0.98 - t) / 0.02); });
      }
    }
    if (bass && !off(bassOff, b)) {
      const midi = 33 + (((ch.root - 9) % 12) + 12) % 12;
      for (let j = 0; j < 16; j++) {
        if (bass[j] !== 'x') continue;
        tb.bass[j] = midi;
        const f = hz(midi), len = step * 0.95;
        let lp = 0;
        add(t0 + j * step, len, t => { const s = 2 * ((f * t) % 1) - 1; lp += 0.05 * (s - lp); return 0.55 * lp * Math.min(1, t / 0.004) * Math.min(1, (len - t) / 0.01); });
      }
    }
    truth.bars.push(tb);
  }
  for (let i = 0; i < n; i++) out[i] *= gain;
  return { pcm: out, truth };
}

// a click track: one short click at each time (seconds)
export function clicks(times, seconds) {
  const out = new Float32Array(Math.ceil(seconds * RATE));
  for (const t of times) { const a = Math.round(t * RATE); for (let k = 0; k < 220 && a + k < out.length; k++) out[a + k] += 0.8 * Math.exp(-k / 40) * (k % 2 ? -1 : 1); }
  return out;
}

export function writeWav(file, pcm, rate = RATE) {
  const n = pcm.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, buf);
}
// → { rate, channels, pcm: mono Float32Array }
export function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not a WAV file`);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { format: b.readUInt16LE(p + 8), channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') data = { at: p + 8, len: Math.min(len, b.length - p - 8) };
    p += 8 + len + (len % 2);
  }
  if (!fmt || !data) throw new Error(`${file}: no fmt or data chunk`);
  const bytes = fmt.bits / 8, frames = Math.floor(data.len / (bytes * fmt.channels)), pcm = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const o = data.at + (i * fmt.channels + c) * bytes;
      s += fmt.format === 3 ? b.readFloatLE(o) : fmt.bits === 16 ? b.readInt16LE(o) / 32768 : fmt.bits === 24 ? b.readIntLE(o, 3) / 8388608 : b.readInt32LE(o) / 2147483648;
    }
    pcm[i] = s / fmt.channels;
  }
  return { rate: fmt.rate, channels: fmt.channels, pcm };
}
// a plain linear resampler to the analysis rate
export function resample(pcm, from, to = RATE) {
  if (from === to) return pcm;
  const n = Math.floor((pcm.length * to) / from), out = new Float32Array(n), r = from / to;
  for (let i = 0; i < n; i++) { const x = i * r, a = Math.floor(x), k = x - a; out[i] = (pcm[a] || 0) * (1 - k) + (pcm[a + 1] || 0) * k; }
  return out;
}
