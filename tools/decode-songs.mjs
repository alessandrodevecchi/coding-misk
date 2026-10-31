// Test songs for the Decode checks (track-to-code): v2 songs of the app with a known tempo, key, chords per bar and drum
// grids, exported to WAV by the app itself (tools/check-decode.cjs), so misk-analyzer's results on the app's own sound
// can be measured against the truth. No third-party audio. The songs and the WAV files live in the git-ignored
// .cache/decode/.
//   import { TEST_SONGS, truthOf } from './decode-songs.mjs'
import { PROGS } from '../src/music.js';

const E = '................';
const sec = (name, bars, bpm, key, chords) => ({ name, bars, bpm, key, chords });
const drums = (rows, clips, kit = 'RolandTR909') => ({ id: 'drums', name: 'Drums', type: 'drums', settings: { kit }, patterns: { A: { rows } }, clips: clips.map(s => ({ section: s, pattern: 'A' })) });
const bass = (preset, clips) => ({ id: 'bass', name: 'Bass', type: 'bass', settings: {}, patterns: { A: { preset } }, clips: clips.map(s => ({ section: s, pattern: 'A' })) });
const pad = (clips) => ({ id: 'pad', name: 'Pad', type: 'pad', settings: {}, patterns: { A: { preset: 'pad' } }, clips: clips.map(s => ({ section: s, pattern: 'A' })) });
const song = (id, title, sections, tracks) => ({ format: 'coding-misk/song', version: 2, id, title, sections, tracks });

export const TEST_SONGS = [
  // four on the floor at 124 BPM in A minor; the drums stop at bar 33 for 8 bars (the look-ahead scenario)
  song('decode-test-124', 'Decode test 124', [sec('Intro', 8, 124, 'A', 'epica'), sec('Main', 24, 124, 'A', 'epica'), sec('Break', 8, 124, 'A', 'epica'), sec('Back', 16, 124, 'A', 'epica')], [
    drums({ bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' }, ['Intro', 'Main', 'Back']),
    bass('offbeat', ['Intro', 'Main', 'Break', 'Back']),
    pad(['Main', 'Break', 'Back']),
  ]),
  // a half-time groove at 90 BPM in E minor
  song('decode-test-90', 'Decode test 90', [sec('Verse', 24, 90, 'E', 'notturna')], [
    drums({ bd: 'x.....x...x.....', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' }, ['Verse'], 'RolandTR808'),
    bass('rolling', ['Verse']),
    pad(['Verse']),
  ]),
  // a fast break at 174 BPM in D minor
  song('decode-test-174', 'Decode test 174', [sec('Run', 32, 174, 'D', 'malinconica')], [
    drums({ bd: 'x.........x.....', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' }, ['Run']),
    bass('sub', ['Run']),
    pad(['Run']),
  ]),
  // level B (track-to-code group 6): four minutes at 128 BPM with known sections: an intro of hats and chords, a verse,
  // a break of chords alone in another progression, a drop in a third one, an outro of drums alone
  song('decode-test-long', 'Decode test long', [sec('Intro', 16, 128, 'A', 'epica'), sec('Verse', 32, 128, 'A', 'epica'), sec('Break', 16, 128, 'A', 'notturna'), sec('Drop', 48, 128, 'A', 'malinconica'), sec('Outro', 16, 128, 'A', 'epica')], [
    { id: 'drums', name: 'Drums', type: 'drums', settings: { kit: 'RolandTR909' }, patterns: { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' } }, H: { rows: { hh: 'x.x.x.x.x.x.x.x.' } } },
      clips: [{ section: 'Intro', pattern: 'H' }, { section: 'Verse', pattern: 'A' }, { section: 'Drop', pattern: 'A' }, { section: 'Outro', pattern: 'A' }] },
    bass('offbeat', ['Verse', 'Drop']),
    pad(['Intro', 'Verse', 'Break', 'Drop']),
  ]),
];

const PC = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
// a chord of a progression (written in A minor) moved to the section's key
const moved = (chord, key) => { const m = /^([A-G][#b]?)(m?)/.exec(chord); return `${NAMES[(PC[m[1]] + PC[key] - 9 + 24) % 12]}${m[2]}`; };
// the truth of a test song: tempo, key and per bar the chord and the drum grid (null where the drums do not play)
export function truthOf(s) {
  const bars = [];
  for (const x of s.sections) for (let i = 0; i < x.bars; i++) {
    const prog = PROGS[x.chords][1], d = s.tracks.find(t => t.type === 'drums');
    const on = d && d.clips.find(c => c.section === x.name), padOn = s.tracks.some(t => t.type === 'pad' && t.clips.some(c => c.section === x.name));
    bars.push({ chord: padOn ? moved(prog[i % prog.length], x.key) : null, drums: on ? { bd: E, cp: E, hh: E, oh: E, ...d.patterns[on.pattern].rows } : null, section: x.name });
  }
  const k = s.sections[0].key;
  // the bars where the sections start (level B's section bounds)
  const starts = []; let a = 0; for (const x of s.sections) { starts.push(a); a += x.bars; }
  return { bpm: s.sections[0].bpm, key: { root: PC[k], mode: 'minor' }, bars, starts };
}
