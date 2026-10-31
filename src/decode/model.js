// The song model of a decoded track (track-to-code D6): the one shape both levels fill, level A bar by bar while the
// track plays, level B for the whole file. Pure: the worker, the writer and the Node checks share it.
//
// { version, engine, duration, bpm, bpmCandidates: [half, x, double], confidence, uncertain,
//   downbeat: seconds, barSeconds, bars: [{ start, chord, chordConf, bass: [16 midi or null],
//   drums: { bd, cp, hh, oh: 16-step strings }, level: { drums, bass, chords, other }, bright, low }],
//   key: { root, mode, conf }, sections: [{ start, bars, kind }], ending: bar, tapped }

// raise when a change to misk-analyzer or the model changes results: stored analyses of an older version are
// analysed again on the next open (spec: Stored analysis)
export const ANALYSIS_VERSION = 1;

export const STEPS = 16;
export const DRUM_ROWS = ['bd', 'cp', 'hh', 'oh'];
export const PARTS = ['drums', 'bass', 'chords', 'other'];
export const SECTION_KINDS = ['intro', 'verse', 'build', 'drop', 'break', 'outro'];
export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// a model with no bars yet
export function emptyModel({ duration = 0, engine = 'misk-analyzer' } = {}) {
  return { version: ANALYSIS_VERSION, engine, duration, bpm: 0, bpmCandidates: [], confidence: 0, uncertain: true, downbeat: 0, barSeconds: 0, bars: [], key: null, sections: [], ending: null, tapped: false };
}

// the bar of the model at file time t (seconds), fractional; negative before the first downbeat
export const barAt = (model, t) => (model && model.barSeconds > 0 ? (t - model.downbeat) / model.barSeconds : 0);
// file time of a bar (fractional)
export const timeOfBar = (model, bar) => model.downbeat + bar * model.barSeconds;
// how many whole bars the file holds from the first downbeat
export const barsInFile = model => (model && model.barSeconds > 0 ? Math.max(0, Math.floor((model.duration - model.downbeat) / model.barSeconds + 1e-6)) : 0);

// a chord name: root pitch class and quality ('maj' | 'min') → "Am", "F#", "Bb"
export const chordName = (root, quality) => `${NOTE_NAMES[((root % 12) + 12) % 12]}${quality === 'min' ? 'm' : ''}`;
// "Am" → { root: 9, quality: 'min' }
export function parseChord(name) {
  const m = /^([A-G])(#|b)?(m)?$/.exec(String(name || ''));
  if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return { root: (base + 12) % 12, quality: m[3] ? 'min' : 'maj' };
}
// a MIDI note as Strudel names it: 33 → "a1"
export const noteName = midi => `${NOTE_NAMES[((midi % 12) + 12) % 12].toLowerCase()}${Math.floor(midi / 12) - 1}`;

// a model is current when its version matches; an older one is analysed again
export const currentModel = m => !!(m && m.version === ANALYSIS_VERSION && Array.isArray(m.bars));
