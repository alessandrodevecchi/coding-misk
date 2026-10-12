// Known broken parts of Strudel's soundfont library (#54, #61), found by tools/check-sounds.cjs: the starting list of the
// sound guard's register (src/sounds/sound-guard.js), which plays a note that falls in one from another font of the same
// instrument, as missing drum hits use the nearest one a kit has (KIT_MISSING). use: the preferred stand-in font.
export const SOUNDFONT_FIX = [
  // the JCLive vibraphone's top zone holds no audio (an empty MP3): notes C6 and up use the Chaos vibraphone
  { name: 'gm_vibraphone', font: 0, low: 84, high: 127, use: 2 },
  // the library misspells this font's file name ("…sf2_fible"), so it never loads: the first electric bass instead
  { name: 'gm_electric_bass_finger', font: 1, use: 0 },
];

const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
// the MIDI note of a sound's value: note name, note number or frequency (c3 when none)
export function midiOf(v) {
  if (typeof v.freq === 'number') return Math.round(12 * Math.log2(v.freq / 440) + 69);
  if (typeof v.note === 'number') return Math.round(v.note);
  const m = /^([a-g])(#|s|b|f)?(-?\d+)?$/i.exec(String(v.note ?? 'c3'));
  if (!m) return 48;
  const acc = !m[2] ? 0 : /[#s]/i.test(m[2]) ? 1 : -1;
  return NOTE[m[1].toLowerCase()] + acc + 12 * (Number(m[3] ?? 3) + 1);
}
