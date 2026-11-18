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
// decode-refine 10.1, held out: songs on other drum machines and drive settings, never used to choose a sound rule. They
// verify the drum machine and the distortion "Our sounds" picks (tools/decode-kits.mjs --holdout); the similarity bench
// does not use them. 16 bars each, a bass and a pad; the truth is each song's drums settings.
const held = (id, bpm, key, chords, kit, drive, rows, bassSettings, preset) => song(id, id, [sec('Main', 16, bpm, key, chords)], [
  { id: 'drums', name: 'Drums', type: 'drums', settings: { kit, drive }, patterns: { A: { rows } }, clips: [{ section: 'Main', pattern: 'A' }] },
  { id: 'bass', name: 'Bass', type: 'bass', settings: bassSettings, patterns: { A: { preset } }, clips: [{ section: 'Main', pattern: 'A' }] },
  pad(['Main']),
]);
const FOUR = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' }, EIGHTS = { bd: 'x.....x...x.....', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' };
export const HOLDOUT_SONGS = [
  held('held-707-clean', 120, 'G', 'epica', 'RolandTR707', 0, FOUR, {}, 'offbeat'),
  held('held-505-drive', 132, 'C', 'notturna', 'RolandTR505', 1.6, EIGHTS, {}, 'rolling'),
  held('held-808-clean', 100, 'F', 'malinconica', 'RolandTR808', 0, EIGHTS, {}, 'sub'),
  held('held-909-drive', 138, 'E', 'drone', 'RolandTR909', 2, FOUR, { wave: 'sawtooth', cutoff: 300, cutoffEnd: 1000, move: 'fisso', reso: 8, drive: 4.5 }, 'spirale'),
  held('held-r8-clean', 115, 'D', 'epica', 'RolandR8', 0, EIGHTS, {}, 'offbeat'),
  held('held-909-clean-dist-bass', 126, 'B', 'drone', 'RolandTR909', 0, FOUR, { wave: 'sawtooth', cutoff: 300, cutoffEnd: 1000, move: 'fisso', reso: 8, drive: 4.5 }, 'spirale'),
  held('held-606-drive', 128, 'A', 'malinconica', 'RolandTR606', 1, FOUR, {}, 'rolling'),
  held('held-linn-clean', 110, 'E', 'notturna', 'LinnDrum', 0, EIGHTS, {}, 'sub'),
];
// decode-refine group 10, phase 1 (measurements): a wider bench by genre, built only with the app's track types, presets
// and settings, with sections of other lengths and shapes than the held-out songs' one 16-bar section. Exported by
// `tools/decode-export.cjs --genre` into .cache/decode/genre/; measured by tools/decode-bench.cjs. The truth of each
// song is its drums kit and drive and its bass drive (truthOf for tempo, key, chords and grids).
const tr = (id, type, settings, patterns, clips) => ({ id, name: id, type, settings, patterns, clips: clips.map(([section, pattern = 'A']) => ({ section, pattern })) });
const gsec = (name, bars, bpm, key, chords, more = {}) => ({ ...sec(name, bars, bpm, key, chords), ...more });
export const GENRE_SONGS = [
  // house at 124: four on the floor, offbeat bass, chord stabs, a break of chords alone
  song('genre-house-124', 'genre-house-124', [gsec('Intro', 8, 124, 'F', 'euforica'), gsec('Main', 16, 124, 'F', 'euforica', { crash: true }), gsec('Break', 8, 124, 'F', 'euforica'), gsec('Main 2', 16, 124, 'F', 'euforica')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } }, B: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.', oh: '..x.......x.....' } } }, [['Intro'], ['Main', 'B'], ['Main 2', 'B']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 900 }, { A: { preset: 'offbeat' } }, [['Intro'], ['Main'], ['Main 2']]),
    tr('pad', 'pad', { cutoff: 2200 }, { A: { preset: 'stab' } }, [['Main'], ['Break'], ['Main 2']]),
  ]),
  // techno at 130 with a driven bass and lightly driven drums; 24-bar main section
  song('genre-techno-130-drive', 'genre-techno-130-drive', [gsec('Intro', 8, 130, 'A', 'ipnotica'), gsec('Main', 24, 130, 'A', 'ipnotica'), gsec('Break', 8, 130, 'A', 'ipnotica'), gsec('Main 2', 16, 130, 'A', 'ipnotica')], [
    tr('drums', 'drums', { kit: 'RolandTR909', drive: 1 }, { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } }, B: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: 'x.xxx.xxx.xxx.xx' } } }, [['Intro'], ['Main', 'B'], ['Main 2', 'B']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 600, drive: 2.5, reso: 6 }, { A: { preset: 'rolling' } }, [['Main'], ['Break'], ['Main 2']]),
    tr('pad', 'pad', { cutoff: 1200 }, { A: { preset: 'pad' } }, [['Break'], ['Main 2']]),
  ]),
  // drum and bass at 174 with a reese-like bass (a supersaw, low-passed)
  song('genre-dnb-174-reese', 'genre-dnb-174-reese', [gsec('Intro', 8, 174, 'D', 'malinconica'), gsec('Drop', 32, 174, 'D', 'malinconica', { crash: true }), gsec('Outro', 8, 174, 'D', 'malinconica')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, { H: { rows: { hh: 'x.x.x.x.x.x.x.x.' } }, A: { rows: { bd: 'x.........x.....', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['Intro', 'H'], ['Drop'], ['Outro']]),
    tr('bass', 'bass', { wave: 'supersaw', cutoff: 450, reso: 2, gain: 0.85 }, { A: { preset: 'sub' } }, [['Drop'], ['Outro']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['Intro'], ['Drop']]),
  ]),
  // boom bap at 90 with swing, a two-feel bass, an electric piano comping
  song('genre-boombap-90', 'genre-boombap-90', [gsec('Verse', 16, 90, 'C', 'jazz', { swing: 0.2 }), gsec('Hook', 8, 90, 'C', 'jazz', { swing: 0.2 }), gsec('Verse 2', 16, 90, 'C', 'jazz', { swing: 0.2 })], [
    tr('drums', 'drums', { kit: 'AkaiMPC60' }, { A: { rows: { bd: 'x......x..x.....', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['Verse'], ['Hook'], ['Verse 2']]),
    tr('bass', 'bass', { wave: 'triangle', cutoff: 500 }, { A: { preset: 'twoFeel' } }, [['Verse'], ['Hook'], ['Verse 2']]),
    tr('pad', 'pad', { wave: 'gm_epiano1', cutoff: 3000 }, { A: { preset: 'comp' } }, [['Hook'], ['Verse 2']]),
  ]),
  // trap at 140: 808 kit, half-time clap, sixteenth hats, a loud sine sub
  song('genre-trap-140', 'genre-trap-140', [gsec('Intro', 4, 140, 'G', 'frigio'), gsec('Main', 16, 140, 'G', 'frigio'), gsec('Bridge', 8, 140, 'G', 'frigio'), gsec('Main 2', 8, 140, 'G', 'frigio')], [
    tr('drums', 'drums', { kit: 'RolandTR808' }, { H: { rows: { hh: 'xxxxxxxxxxxxxxxx' } }, A: { rows: { bd: 'x......x..x.....', cp: '........x.......', hh: 'xxxxxxxxxxxxxxxx' } } }, [['Intro', 'H'], ['Main'], ['Bridge', 'H'], ['Main 2']]),
    tr('bass', 'bass', { wave: 'sine', cutoff: 300, gain: 1 }, { A: { preset: 'sub' } }, [['Main'], ['Main 2']]),
    tr('pad', 'pad', { cutoff: 1000 }, { A: { preset: 'pad' } }, [['Intro'], ['Main'], ['Bridge'], ['Main 2']]),
  ]),
  // synthwave at 100: LinnDrum, octave bass, an arp, a lead (hook) in the chorus only
  song('genre-synthwave-100', 'genre-synthwave-100', [gsec('Intro', 8, 100, 'E', 'anthem'), gsec('Verse', 16, 100, 'E', 'anthem'), gsec('Chorus', 16, 100, 'E', 'anthem', { crash: true }), gsec('Outro', 8, 100, 'E', 'anthem')], [
    tr('drums', 'drums', { kit: 'LinnDrum' }, { A: { rows: { bd: 'x.......x.......', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['Verse'], ['Chorus'], ['Outro']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 800 }, { A: { preset: 'ottavi' } }, [['Verse'], ['Chorus'], ['Outro']]),
    tr('arp', 'arp', { wave: 'sawtooth', gain: 0.3 }, { A: { preset: 'su' } }, [['Intro'], ['Verse'], ['Chorus']]),
    tr('hook', 'hook', { wave: 'sawtooth', gain: 0.3 }, { A: { preset: 'neon' } }, [['Chorus']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['Intro'], ['Verse'], ['Chorus'], ['Outro']]),
  ]),
  // ambient: a pad alone, no drums and no bass, two progressions
  song('genre-ambient-70', 'genre-ambient-70', [gsec('A', 16, 70, 'D', 'drone'), gsec('B', 16, 70, 'D', 'notturna')], [
    tr('pad', 'pad', { room: 0.9, cutoff: 1800 }, { A: { preset: 'pad' } }, [['A'], ['B']]),
  ]),
  // dub at 75: one drop (kick and clap on the third beat), a two-feel sine bass, offbeat stabs
  song('genre-dub-75', 'genre-dub-75', [gsec('Riddim', 16, 75, 'G', 'dorico'), gsec('Dub', 8, 75, 'G', 'dorico'), gsec('Riddim 2', 16, 75, 'G', 'dorico')], [
    tr('drums', 'drums', { kit: 'OberheimDMX' }, { A: { rows: { bd: '........x.......', cp: '........x.......', hh: 'x.x.x.x.x.x.x.x.' } } }, [['Riddim'], ['Dub'], ['Riddim 2']]),
    tr('bass', 'bass', { wave: 'sine', cutoff: 400, gain: 0.9 }, { A: { preset: 'twoFeel' } }, [['Riddim'], ['Dub'], ['Riddim 2']]),
    tr('pad', 'pad', { cutoff: 2000 }, { A: { preset: 'synco' } }, [['Riddim'], ['Riddim 2']]),
  ]),
  // breakbeat at 135: a broken kick, a galloping square bass, a 12-bar last section
  song('genre-breakbeat-135', 'genre-breakbeat-135', [gsec('Intro', 4, 135, 'B', 'cyber'), gsec('Main', 16, 135, 'B', 'cyber'), gsec('Break', 8, 135, 'B', 'cyber'), gsec('Main 2', 12, 135, 'B', 'cyber')], [
    tr('drums', 'drums', { kit: 'EmuSP12' }, { A: { rows: { bd: 'x.....x...x..x..', cp: '....x.......x.x.', hh: 'x.x.x.x.x.x.x.x.', oh: '......x.........' } } }, [['Intro'], ['Main'], ['Main 2']]),
    tr('bass', 'bass', { wave: 'square', cutoff: 700 }, { A: { preset: 'galoppo' } }, [['Main'], ['Break'], ['Main 2']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['Break'], ['Main 2']]),
  ]),
  // lo-fi at 80: dirty drums (drive, grit, a low cutoff), swing, a soft bass and an electric piano
  song('genre-lofi-80', 'genre-lofi-80', [gsec('A', 12, 80, 'F', 'lofi', { swing: 0.25 }), gsec('B', 12, 80, 'F', 'lofi', { swing: 0.25 })], [
    tr('drums', 'drums', { kit: 'AkaiMPC60', drive: 1.5, grit: 0.5, cutoff: 5000 }, { A: { rows: { bd: 'x.......x.x.....', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['A'], ['B']]),
    tr('bass', 'bass', { wave: 'triangle', cutoff: 400 }, { A: { preset: 'twoFeel' } }, [['A'], ['B']]),
    tr('pad', 'pad', { wave: 'gm_epiano1', cutoff: 2500 }, { A: { preset: 'comp' } }, [['A'], ['B']]),
  ]),
  // acid, dark: low cutoff, high resonance, moderate drive, no pad
  song('genre-acid-dark-128', 'genre-acid-dark-128', [gsec('Intro', 8, 128, 'A', 'drone'), gsec('Main', 24, 128, 'A', 'drone', { crash: true })], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } }, B: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' } } }, [['Intro'], ['Main', 'B']]),
    tr('bass', 'bass', { wave: 'sawtooth', gain: 0.6, cutoff: 200, cutoffEnd: 600, move: 'veloce', reso: 14, drive: 2 }, { A: { preset: 'spirale' } }, [['Intro'], ['Main']]),
  ]),
  // acid, bright and clean: high cutoff sweep, low resonance, no drive, a 606
  song('genre-acid-bright-132', 'genre-acid-bright-132', [gsec('Main', 16, 132, 'E', 'drone'), gsec('Break', 8, 132, 'E', 'drone'), gsec('Main 2', 16, 132, 'E', 'drone')], [
    tr('drums', 'drums', { kit: 'RolandTR606' }, { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['Main'], ['Main 2']]),
    tr('bass', 'bass', { wave: 'sawtooth', gain: 0.6, cutoff: 800, cutoffEnd: 3000, move: 'lento', reso: 4, drive: 0 }, { A: { preset: 'spirale' } }, [['Main'], ['Break'], ['Main 2']]),
  ]),
];
// decode-refine group 10, round 6: a FRESH validation set, built before any rule of round 6 and never used to choose a
// value; each song carries a sound the earlier sets lack: a supersaw bass, a Lead over chords, a square bass, driven
// basses on presets other than spirale, a held sub, a two-feel bass, stab chords and driven drums.
export const FRESH_SONGS = [
  song('fresh-supersaw-128', 'fresh-supersaw-128', [gsec('Intro', 8, 128, 'C', 'notturna'), gsec('Main', 24, 128, 'C', 'notturna')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' } } }, [['Intro'], ['Main']]),
    tr('bass', 'bass', { wave: 'supersaw', cutoff: 900, reso: 4 }, { A: { preset: 'rolling' } }, [['Main']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['Intro'], ['Main']]),
  ]),
  song('fresh-lead-110', 'fresh-lead-110', [gsec('Verse', 16, 110, 'G', 'epica'), gsec('Chorus', 16, 110, 'G', 'epica', { crash: true })], [
    tr('drums', 'drums', { kit: 'RolandTR707' }, { A: { rows: { bd: 'x.......x.......', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['Verse'], ['Chorus']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 800 }, { A: { preset: 'offbeat' } }, [['Verse'], ['Chorus']]),
    tr('hook', 'hook', { wave: 'square', gain: 0.35 }, { A: { preset: 'discesa' } }, [['Verse'], ['Chorus']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['Verse'], ['Chorus']]),
  ]),
  song('fresh-square-120', 'fresh-square-120', [gsec('A', 16, 120, 'D', 'cyber'), gsec('B', 8, 120, 'D', 'cyber')], [
    tr('drums', 'drums', { kit: 'RolandR8' }, { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' } } }, [['A'], ['B']]),
    tr('bass', 'bass', { wave: 'square', cutoff: 1000 }, { A: { preset: 'ottavi' } }, [['A'], ['B']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['B']]),
  ]),
  song('fresh-drive-pumping-126', 'fresh-drive-pumping-126', [gsec('Main', 16, 126, 'E', 'ipnotica'), gsec('Break', 4, 126, 'E', 'ipnotica'), gsec('Main 2', 12, 126, 'E', 'ipnotica')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, { A: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } } }, [['Main'], ['Main 2']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 700, drive: 3 }, { A: { preset: 'pumping' } }, [['Main'], ['Break'], ['Main 2']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['Break'], ['Main 2']]),
  ]),
  song('fresh-drive-galoppo-140', 'fresh-drive-galoppo-140', [gsec('Main', 24, 140, 'B', 'frigio')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['Main']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 900, drive: 4.5 }, { A: { preset: 'galoppo' } }, [['Main']]),
  ]),
  song('fresh-held-sub-85', 'fresh-held-sub-85', [gsec('A', 16, 85, 'F', 'malinconica'), gsec('B', 16, 85, 'F', 'malinconica')], [
    tr('drums', 'drums', { kit: 'RolandTR808' }, { A: { rows: { bd: 'x.........x.....', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['A'], ['B']]),
    tr('bass', 'bass', { wave: 'sine', cutoff: 300, gain: 1 }, { A: { preset: 'sub' } }, [['A'], ['B']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['B']]),
  ]),
  song('fresh-twofeel-95', 'fresh-twofeel-95', [gsec('A', 12, 95, 'A', 'dorico'), gsec('B', 12, 95, 'A', 'dorico')], [
    tr('drums', 'drums', { kit: 'LinnDrum' }, { A: { rows: { bd: 'x.......x.......', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['A'], ['B']]),
    tr('bass', 'bass', { wave: 'triangle', cutoff: 600 }, { A: { preset: 'twoFeel' } }, [['A'], ['B']]),
    tr('pad', 'pad', { cutoff: 2000 }, { A: { preset: 'pad' } }, [['A'], ['B']]),
  ]),
  song('fresh-stab-122', 'fresh-stab-122', [gsec('Intro', 4, 122, 'C', 'euforica'), gsec('Main', 20, 122, 'C', 'euforica')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.', oh: '..x.......x.....' } } }, [['Main']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 700 }, { A: { preset: 'offbeat' } }, [['Main']]),
    tr('pad', 'pad', { cutoff: 2500 }, { A: { preset: 'stab' } }, [['Intro'], ['Main']]),
  ]),
  song('fresh-drumdrive-132', 'fresh-drumdrive-132', [gsec('Main', 16, 132, 'G', 'tensione'), gsec('Main 2', 16, 132, 'G', 'tensione')], [
    tr('drums', 'drums', { kit: 'RolandTR606', drive: 2.5 }, { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' } } }, [['Main'], ['Main 2']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 600 }, { A: { preset: 'rolling' } }, [['Main'], ['Main 2']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['Main 2']]),
  ]),
];

// decode round 11 (G): six songs built for the hit-density defect, where the original's mids hit fast and Decode wrote
// one held chord a bar. Code tracks, so each part's hits are known from the song's own haps (tools/decode-hits.mjs);
// exported by `tools/decode-export.cjs --hits` into .cache/decode/hits/. All in A minor on Am F C G.
const ct = (id, visual, code, clips) => ({ id, name: id, type: 'code', settings: { visual }, patterns: Object.fromEntries(Object.entries(code).map(([k, c]) => [k, { code: c }])), clips: clips.map(([section, pattern = 'A']) => ({ section, pattern })) });
const PROG = '<Am F C G>', STAB = '.s("sawtooth").lpf(2400).attack(.003).decay(.09).sustain(0).release(.05).gain(.42)';
const HELD = '.s("sawtooth").lpf(1800).attack(.04).release(.25).room(.3).gain(.3)';
// a distorted bass on one note, every 16th, its envelope falling between hits as a picked synth bass does
const DIST16 = 'note("a1*16").s("sawtooth").lpf(1100).lpq(4).decay(.09).sustain(.25).distort(3).distortvol(.5)';
const HDRUMS = { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' } }, H: { rows: { hh: 'x.x.x.x.x.x.x.x.' } } };
export const HIT_SONGS = [
  // chord stabs: 8ths in the first main section, a 16th rhythm in the second, over four-on-the-floor drums and a bass
  song('hit-stabs-124', 'hit-stabs-124', [gsec('Eights', 16, 124, 'A', 'epica'), gsec('Sixteens', 16, 124, 'A', 'epica')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, HDRUMS, [['Eights'], ['Sixteens']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 700 }, { A: { preset: 'offbeat' } }, [['Eights'], ['Sixteens']]),
    ct('chords', 'pad', { A: `chord("${PROG}").voicing().struct("x*8")${STAB}`, B: `chord("${PROG}").voicing().struct("x ~ x x ~ x ~ x x ~ x ~ x x ~ x")${STAB}` }, [['Eights'], ['Sixteens', 'B']]),
  ]),
  // the same progression held as a pad: the chords must stay held
  song('hit-pad-124', 'hit-pad-124', [gsec('Main', 32, 124, 'A', 'epica')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, HDRUMS, [['Main']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 700 }, { A: { preset: 'offbeat' } }, [['Main']]),
    ct('chords', 'pad', { A: `chord("${PROG}").voicing()${HELD}` }, [['Main']]),
  ]),
  // a distorted bass every 16th on one note, no chords
  song('hit-dist16-130', 'hit-dist16-130', [gsec('Intro', 4, 130, 'A', 'drone'), gsec('Main', 28, 130, 'A', 'drone')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, HDRUMS, [['Intro', 'H'], ['Main']]),
    ct('bass', 'bass', { A: `${DIST16}.gain(.8)` }, [['Main']]),
  ]),
  // a distorted bass under a sung-like lead (vibrato, a vowel), no chords: the chords must stay empty
  song('hit-voice-120', 'hit-voice-120', [gsec('Main', 32, 120, 'A', 'drone')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, HDRUMS, [['Main']]),
    ct('bass', 'bass', { A: 'note("<a1 a1 f1 g1>").struct("x*8").s("sawtooth").lpf(900).lpq(4).decay(.15).sustain(.4).distort(3).distortvol(.5).gain(.8)' }, [['Main']]),
    ct('lead', 'hook', { A: 'note("<[a4 ~ ~ c5 ~ ~ b4 ~ a4 ~ ~ ~ g4 ~ ~ ~] [e4 ~ ~ ~ g4 ~ a4 ~ c5 ~ ~ ~ b4 ~ ~ ~]>").s("triangle").vib(5.5).vibmod(.3).vowel("a").lpf(3200).attack(.04).release(.2).gain(.5)' }, [['Main']]),
  ]),
  // drums and bass all along, a held pad that enters at bar 16
  song('hit-padlate-128', 'hit-padlate-128', [gsec('Groove', 16, 128, 'A', 'epica'), gsec('Pad', 16, 128, 'A', 'epica')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, HDRUMS, [['Groove'], ['Pad']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 700 }, { A: { preset: 'rolling' } }, [['Groove'], ['Pad']]),
    ct('chords', 'pad', { A: `chord("${PROG}").voicing()${HELD}` }, [['Pad']]),
  ]),
  // two equal drops (drums, a 16th distorted bass, chord stabs) around a break of a held pad
  song('hit-drops-126', 'hit-drops-126', [gsec('Intro', 8, 126, 'A', 'epica'), gsec('Drop', 16, 126, 'A', 'epica'), gsec('Break', 8, 126, 'A', 'epica'), gsec('Drop 2', 16, 126, 'A', 'epica')], [
    tr('drums', 'drums', { kit: 'RolandTR909' }, HDRUMS, [['Intro', 'H'], ['Drop'], ['Drop 2']]),
    ct('bass', 'bass', { A: `${DIST16.replace('note("a1*16")', 'note("<a1 f1 c2 g1>").struct("x*16")')}.gain(.75)` }, [['Drop'], ['Drop 2']]),
    ct('chords', 'pad', { A: `chord("${PROG}").voicing().struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ x ~ ~ ~")${STAB}`, P: `chord("${PROG}").voicing()${HELD}` }, [['Intro', 'P'], ['Drop'], ['Break', 'P'], ['Drop 2']]),
  ]),
];
export const HITS = HIT_SONGS.map(s => s.id);

// The split of every bench song (decode-refine group 10, phase 1). TUNING songs may be used to choose a value of the
// decoder; VALIDATION songs are never used to choose a value: they only verify a value chosen on the tuning songs.
// The old bench (TEST_SONGS and the app songs) was already used to tune groups 7 to 10, so it is tuning; the held-out
// songs stay held out; the genre songs are split in two, one acid variant each side.
export const TUNING = ['decode-test-124', 'decode-test-90', 'decode-test-174', 'decode-test-long', 'decode-test-acid', 'decode-test-arp', 'luci-rosse', 'radio-bench-c',
  'genre-house-124', 'genre-techno-130-drive', 'genre-dnb-174-reese', 'genre-trap-140', 'genre-synthwave-100', 'genre-acid-dark-128'];
// (round 6: the held-out songs were looked at in rounds 2 to 5 and this VALIDATION set in phase 1 and its review, so it
// is a validation set already seen; FRESH, below, is the one never looked at before the end of round 6)
export const VALIDATION = [...HOLDOUT_SONGS.map(s => s.id),
  'genre-boombap-90', 'genre-ambient-70', 'genre-dub-75', 'genre-breakbeat-135', 'genre-lofi-80', 'genre-acid-bright-132'];
export const FRESH = FRESH_SONGS.map(s => s.id);
// the variation sweep (phase 1): one 8-bar techno song at 130 BPM, the bass's drive and gain and the drums' drive moved
// one at a time, to see where level B's drive detection switches on
export const VARIATION_SONGS = [
  ...[0, 1, 2, 4.5].flatMap(drive => [0.4, 0.6, 0.8, 1].map(gain => ({ drums: 0, drive, gain }))),
  { drums: 1, drive: 0, gain: 0.8 }, { drums: 2, drive: 0, gain: 0.8 },
].map(v => {
  const id = `var-bd${v.drive}-g${v.gain}-dd${v.drums}`.replace(/\./g, 'p');
  return song(id, id, [sec('Main', 8, 130, 'A', 'ipnotica')], [
    tr('drums', 'drums', { kit: 'RolandTR909', drive: v.drums }, { A: { rows: { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' } } }, [['Main']]),
    tr('bass', 'bass', { wave: 'sawtooth', cutoff: 600, gain: v.gain, drive: v.drive }, { A: { preset: 'rolling' } }, [['Main']]),
    tr('pad', 'pad', {}, { A: { preset: 'pad' } }, [['Main']]),
  ]);
});
// the truth the bench checks against: the drums' kit and drive, the bass's drive (null where the song has none)
// (round 6: also the bass's wave, the bars each part plays, whether a Lead plays and the tempo)
export function soundTruth(s) {
  const d = s.tracks.find(t => t.type === 'drums'), b = s.tracks.find(t => t.type === 'bass');
  const start = {}; let at = 0; for (const x of s.sections) { start[x.name] = at; at += x.bars; }
  const barsOf = t => { const out = []; if (t) for (const c of t.clips) { const sec = s.sections.find(x => x.name === c.section); if (sec) for (let i = 0; i < sec.bars; i++) out.push(start[c.section] + i); else if (Number.isFinite(c.start)) for (let i = 0; i < (c.bars || 1); i++) out.push(c.start + i); } return [...new Set(out)].sort((p, q) => p - q); };
  const lead = s.tracks.filter(t => t.type === 'hook' || t.id === 'lead');
  return { kit: d ? d.settings.kit || 'RolandTR909' : null, drumsDrive: d ? d.settings.drive || 0 : null, bassDrive: b ? b.settings.drive || 0 : null,
    bassWave: b ? b.settings.wave || 'sawtooth' : null, bassBars: barsOf(b), leadBars: [...new Set(lead.flatMap(barsOf))], drums: !!d, bars: at, bpm: s.sections[0].bpm };
}

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
