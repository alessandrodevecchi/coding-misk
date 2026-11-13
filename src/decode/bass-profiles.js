// The bass sounds the writer can write, measured once through the app by tools/decode-bass-profiles.cjs (decode-refine
// group 10, round 6): per candidate (wave and the app's drive amount, through the bass's default filter, cutoff 700 and
// resonance 8, inside a mix of a 909 and the app's pad, on the steps without a kick) the harmonic profile kit-measure.js bassDrive reads on an original: h1, the fundamental's share of the
// first 12 harmonics; slope, dB per octave over harmonics 1 to 8; evenOdd, dB. Made by the tool; do not edit.
export const BASS_PROFILES = {
  'sawtooth:0': { wave: 'sawtooth', drive: 0, h1: 0.367, slope: -4.5, evenOdd: 2.7 },
  'sawtooth:1': { wave: 'sawtooth', drive: 1, h1: 0.444, slope: -4.3, evenOdd: 2.7 },
  'sawtooth:2': { wave: 'sawtooth', drive: 2, h1: 0.641, slope: -5.8, evenOdd: 2.6 },
  'sawtooth:3': { wave: 'sawtooth', drive: 3, h1: 0.776, slope: -6.1, evenOdd: 1.7 },
  'sawtooth:4.5': { wave: 'sawtooth', drive: 4.5, h1: 0.862, slope: -6.7, evenOdd: -3 },
  'square:0': { wave: 'square', drive: 0, h1: 0.706, slope: -5.8, evenOdd: -4.7 },
  'square:1': { wave: 'square', drive: 1, h1: 0.69, slope: -6.2, evenOdd: -3.8 },
  'square:2': { wave: 'square', drive: 2, h1: 0.806, slope: -7.9, evenOdd: -9.1 },
  'square:3': { wave: 'square', drive: 3, h1: 0.826, slope: -8.8, evenOdd: -13.4 },
  'square:4.5': { wave: 'square', drive: 4.5, h1: 0.837, slope: -8.4, evenOdd: -14.9 },
  'triangle:0': { wave: 'triangle', drive: 0, h1: 0.705, slope: -7.2, evenOdd: 1.1 },
  'sine:0': { wave: 'sine', drive: 0, h1: 0.799, slope: -6.8, evenOdd: 1.3 },
  'supersaw:0': { wave: 'supersaw', drive: 0, h1: 0.167, slope: -3.7, evenOdd: 0.3 },
};
