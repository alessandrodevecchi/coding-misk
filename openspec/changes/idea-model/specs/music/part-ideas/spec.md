## Purpose

Parts of a song are stored as small musical ideas, the way a live coder writes them, so the code stays short and the material can grow and vary while existing songs keep their sound.

## ADDED Requirements

### Requirement: A pattern can hold an idea
A pattern of a bass, guitar, arp, hook, pad, texture or drums track SHALL be able to hold an idea instead of written-out steps or notes. A pattern that names a preset and holds no idea SHALL play the preset's idea. A pattern with written steps or notes and no idea SHALL play exactly as before this change.

#### Scenario: Old song loads unchanged
- **WHEN** a song saved before this change, with presets, `steps` and `notes`, is opened
- **THEN** it opens without changes to its file, passes the validator and plays the same events as before

#### Scenario: Idea pattern
- **WHEN** a bass pattern holds the cell idea `[~ x x x]*4`
- **THEN** the bass plays three 16th notes after each beat, on the chord roots of the section

### Requirement: Kinds of idea
The song format SHALL support these kinds of idea: a repeated cell, scale degrees with a scale, chord names with a voicing (anchor and mode optional), sequencer steps on a grid, a seeded random source, a reference to a shared progression with a transposition, and prepared variants. Each part of an idea SHALL be a short mini-notation string or a number.

#### Scenario: Degrees with a scale
- **WHEN** a hook pattern holds degrees `0 2 4` in the scale of its section key and mode
- **THEN** the hook plays those degrees, moved with the section key

#### Scenario: Sequencer steps
- **WHEN** a drums pattern holds steps `0,4,11` on a 16-step grid for the kick
- **THEN** the kick plays on the first, fifth and twelfth 16th of each bar

#### Scenario: Chord names
- **WHEN** an arp pattern holds chords `<Am7 F^7>` with indices `0 1 2 3`
- **THEN** each bar plays those positions of the voiced chord of that bar

### Requirement: Seeded randomness only
A random source in an idea SHALL carry a seed and a loop length, so the same song plays the same notes every time, in the app, in exports and in checks. Randomness SHALL only choose among values that fit: indices inside a chord, sample slices, glitch positions, filter or delay values. Free melody notes SHALL NOT come from a random source.

#### Scenario: Same events twice
- **WHEN** a song with the random source `irand(8).seg(16).rib(3,2)` on arp indices is played twice, and exported once
- **THEN** the arp plays the same notes in all three

#### Scenario: Random without a seed rejected
- **WHEN** a song holds a random source without a seed
- **THEN** the validator reports an error at the path of that idea

### Requirement: Shared progressions
A song SHALL be able to declare a named progression once and let several tracks read it, each with its own transposition. The compiled code SHALL write the progression once and every track that reads it SHALL refer to it by name.

#### Scenario: Bass and lead share a line
- **WHEN** bass and lead read the shared progression `bline`, the bass two octaves down and the lead one octave down
- **THEN** the code holds one line declaring `bline`, the bass and lead both use it, and they follow the same changes

#### Scenario: Unknown name
- **WHEN** a pattern reads a progression the song does not declare
- **THEN** the validator reports an error at the path of that reference

### Requirement: Prepared variants
An idea SHALL be able to carry prepared variants. A prepared variant SHALL appear in the compiled code as a commented line under its track and SHALL NOT change what plays until a build step switches it on.

#### Scenario: Commented until used
- **WHEN** a bass idea carries the variant `.add("0 0 4 0 5")` and no step uses it
- **THEN** the code shows `// .add("0 0 4 0 5")` under the bass and the bass plays as without it

### Requirement: Short code
The compiler SHALL write each idea in its shortest exact form: a repeated cell with its repetition, sequencer steps when they are shorter than the cell, degrees and chord names as written. Code for a pattern that holds no idea SHALL use the same short forms when they give the same events.

#### Scenario: Rolling bass
- **WHEN** a song with the `rolling` bass preset is compiled
- **THEN** its bass line uses `.struct("[~ x x x]*4")` and not the cell written four times

### Requirement: Same sound for existing songs
Every built-in song and every song in `songs/examples/` SHALL produce the same events after this change as before it, over the whole song: same onset times, same note lengths, same values. Sample events of drum machines SHALL compare without their length, since a sample plays to its end.

#### Scenario: Event check
- **WHEN** the event-equivalence check compares the code of every built-in song before and after this change
- **THEN** no song differs in any event

#### Scenario: Levels unchanged
- **WHEN** the level snapshot check runs after this change
- **THEN** every song and instrument stays within the snapshot tolerance

### Requirement: Ideas are validated
The validator SHALL check ideas and report each problem with its JSON path: unknown idea kind, a degree or index that is not a whole number, a step outside the grid, a grid that does not fit the meter, a chord name it cannot read, an unknown scale or mode.

#### Scenario: Step outside the grid
- **WHEN** a drums idea holds steps `0,4,17` on a 16-step grid
- **THEN** validation fails with an error at that idea that names the grid size
