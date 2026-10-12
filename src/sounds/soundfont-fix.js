// Broken parts of Strudel's soundfont library (#54, #61), found by tools/check-soundfonts.cjs: a note that falls in one
// plays the same instrument from another of its fonts, as missing drum hits use the nearest one a kit has (KIT_MISSING).
// Without this, the broken note is silent in the app and holds the fast export (the loader waits for a decode that fails).
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
// the value a fix plays instead (the same value when no fix applies); fonts: how many fonts the sound has
export function fixedValue(name, fonts, v) {
  const idx = ((Math.round(Number.isFinite(+v.n) ? +v.n : 0) % fonts) + fonts) % fonts;
  for (const f of SOUNDFONT_FIX) {
    if (f.name !== name || f.font !== idx) continue;
    if (f.low !== undefined) { const m = midiOf(v); if (m < f.low || m > f.high) continue; }
    return { ...v, n: f.use };
  }
  return v;
}
// wraps the fixed sounds in a sound registry (superdough's getSound and registerSound); safe to call more than once
export function applySoundfontFixes({ getSound, registerSound }) {
  let done = 0;
  for (const name of [...new Set(SOUNDFONT_FIX.map(f => f.name))]) {
    const s = getSound(name);
    if (!s || !s.data || s.data.cmFixed || !Array.isArray(s.data.fonts)) continue;
    const orig = s.onTrigger, fonts = s.data.fonts.length;
    registerSound(name, (t, v, onended) => orig(t, fixedValue(name, fonts, v), onended), { ...s.data, cmFixed: true });
    done++;
  }
  return done;
}
