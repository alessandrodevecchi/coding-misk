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

// the lead of a test song (decode-refine 6.1): a loop of bars, 16 steps each, a note name, `_` holding the note before
// or `~`; written as a code track, so the truth is the notes as written
const MIDI = { c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5, 'f#': 6, gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11 };
export const midiOf = name => { const m = /^([a-g][#b]?)(-?\d)$/.exec(name); return m ? MIDI[m[1]] + 12 * (+m[2] + 1) : null; };
const LEADS = {};
const lead = (songId, loop, sound, clips) => {
  LEADS[songId] = loop.map(bar => { const out = []; for (const x of bar.split(/\s+/)) out.push(x === '_' ? out[out.length - 1] ?? null : x === '~' ? null : midiOf(x)); return out; });
  const code = `note("<${loop.map(b => `[${b}]`).join(' ')}>")${sound}`;
  return { id: 'lead', name: 'Lead', type: 'code', settings: { visual: 'hook' }, patterns: { A: { code } }, clips: clips.map(s => ({ section: s, pattern: 'A' })) };
};

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
  // decode-refine 6.1, the sound the old songs miss (design: Diagnosis): an acid track at 126 BPM in A minor, a 909 kick
  // with `crunch` on every beat under a distorted saw bass on A1 with a resonant sweep (the settings of luci-rosse's
  // bass), a square hook (the lead) and a crash at the start of each main section; no pad, so no chords
  song('decode-test-acid', 'Decode test acid', [sec('Intro', 8, 126, 'A', 'drone'), { ...sec('Main', 16, 126, 'A', 'drone'), crash: true }, sec('Break', 4, 126, 'A', 'drone'), { ...sec('Main 2', 16, 126, 'A', 'drone'), crash: true }], [
    { id: 'drums', name: 'Drums', type: 'drums', settings: { kit: 'RolandTR909', gain: 0.95, drive: 1.6 }, patterns: { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } }, B: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' } } },
      clips: [{ section: 'Intro', pattern: 'A' }, { section: 'Main', pattern: 'B' }, { section: 'Main 2', pattern: 'B' }] },
    { id: 'bass', name: 'Bass', type: 'bass', settings: { wave: 'sawtooth', gain: 0.6, cutoff: 300, cutoffEnd: 1000, move: 'fisso', reso: 8, drive: 4.5 }, patterns: { A: { preset: 'spirale' } }, clips: ['Intro', 'Main', 'Break', 'Main 2'].map(s => ({ section: s, pattern: 'A' })) },
    lead('decode-test-acid', ['a4 ~ ~ c5 ~ ~ e5 ~ a4 ~ ~ g4 ~ e4 ~ ~', 'a4 ~ ~ c5 ~ ~ d5 ~ c5 ~ b4 ~ g4 ~ ~ ~'], '.s("square").lpf(2600).decay(.2).sustain(.3).delay(.25).gain(.3)', ['Main', 'Break', 'Main 2']),
  ]),
  // decode-refine 6.1: an arp and a lead over syncopated drums (kick on steps 0, 4, 7, 8, 10, 12) at 150 BPM in D minor,
  // a pad under the verse and the lead section; the lead plays only in its section
  song('decode-test-arp', 'Decode test arp', [sec('Intro', 8, 150, 'D', 'malinconica'), sec('Verse', 16, 150, 'D', 'malinconica'), sec('Lead', 16, 150, 'D', 'malinconica'), sec('Outro', 8, 150, 'D', 'malinconica')], [
    { id: 'drums', name: 'Drums', type: 'drums', settings: { kit: 'RolandTR909' }, patterns: { H: { rows: { hh: 'x.x.x.x.x.x.x.x.' } }, S: { rows: { bd: 'x...x..xx.x.x...', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } },
      clips: [{ section: 'Intro', pattern: 'H' }, { section: 'Verse', pattern: 'S' }, { section: 'Lead', pattern: 'S' }, { section: 'Outro', pattern: 'S' }] },
    bass('rolling', ['Verse', 'Lead']),
    { id: 'arp', name: 'Arp', type: 'arp', settings: { gain: 0.32 }, patterns: { A: { preset: 'su' } }, clips: ['Intro', 'Verse', 'Lead', 'Outro'].map(s => ({ section: s, pattern: 'A' })) },
    pad(['Verse', 'Lead']),
    lead('decode-test-arp', ['d5 _ _ ~ f5 _ a5 _ _ ~ g5 _ f5 _ e5 _', 'd5 _ _ ~ c5 _ _ ~ a4 _ c5 _ d5 _ _ ~'], '.s("sawtooth").lpf(3200).gain(.28).room(.2)', ['Lead']),
  ]),
];
// the new test songs (decode-refine 6.1) carry the sound the analysis does not handle yet (groups 7 to 10): the checks
// report their measures without the targets of the older songs
export const HARD_SONGS = ['decode-test-acid', 'decode-test-arp'];

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
    const L = LEADS[s.id], leadOn = L && s.tracks.some(t => t.id === 'lead' && t.clips.some(c => c.section === x.name));
    // the lead: per step the note sounding (a held note on each of its steps), the loop counted from the song's bar 0
    bars.push({ chord: padOn ? moved(prog[i % prog.length], x.key) : null, drums: on ? { bd: E, cp: E, hh: E, oh: E, ...d.patterns[on.pattern].rows } : null, section: x.name, ...(L ? { lead: leadOn ? L[bars.length % L.length] : null } : {}) });
  }
  const k = s.sections[0].key;
  // the bars where the sections start (level B's section bounds)
  const starts = []; let a = 0; for (const x of s.sections) { starts.push(a); a += x.bars; }
  return { bpm: s.sections[0].bpm, key: { root: PC[k], mode: 'minor' }, bars, starts, ...(LEADS[s.id] ? { lead: LEADS[s.id] } : {}) };
}
