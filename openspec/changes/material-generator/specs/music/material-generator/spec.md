## Purpose

The material generator composes new parts and sounds for a song from its seed, its style and an energy value, as ideas that read like a live coder's code and always fit the song's key and chords.

## ADDED Requirements

### Requirement: Parts composed from seed, style and energy
The generator SHALL compose a melody, a bassline, an arpeggio, a chord progression, a drum groove or a sound from a seed, a style recipe, the song's harmony (key, mode, progression, meter) and an energy value from 0 to 1. Every part SHALL be an idea in the song format and SHALL pass the song validator.

#### Scenario: A part for each kind
- **WHEN** the generator composes each kind of part for a style in 4/4 and in 7/8
- **THEN** each result is a valid idea that compiles and plays without an evaluation error

### Requirement: Deterministic
The same seed, style, harmony, energy and kind SHALL give the same part. Different seeds SHALL give different parts in most cases. The generator SHALL use only the seeded random streams of the app, and any randomness written into the code SHALL carry a seed.

#### Scenario: Same inputs twice
- **WHEN** a melody is composed twice from seed `aurora` with the same style and energy
- **THEN** both melodies are identical

#### Scenario: Variety across seeds
- **WHEN** 50 melodies are composed from 50 seeds with the same style and energy
- **THEN** at least 45 of them differ from each other

### Requirement: Melodies by rules
A generated melody SHALL be a short cell of scale degrees plus a summed progression, and SHALL use at least one of: a polymetric cell (5 or 7 values over 16 steps), a motif repeated with a changed tail (A A A A'), or call and response between two cells. Melody notes SHALL be scale degrees of the song's mode and SHALL NOT come from a random source.

#### Scenario: Changed tail
- **WHEN** a melody uses the repeated motif rule
- **THEN** its phrase repeats one cell three times and the fourth time changes only the last notes

#### Scenario: Notes in the scale
- **WHEN** any generated melody plays over its section
- **THEN** every note is a degree of the section key in the song's mode

### Requirement: Basslines follow the harmony
A generated bassline SHALL take its pitches from the song's chords (the chord roots, or the chord line moved down) or from a shared progression the song declares, and its rhythm from a cell or from sequencer steps chosen by the style. The line SHALL be allowed to use octave jumps as its rhythm.

#### Scenario: Cloned from the chords
- **WHEN** a bassline is generated for a song with a shared chord progression
- **THEN** the bass reads that progression moved down by at least an octave, and every bass note is the root or another tone of the chord of its bar

### Requirement: Arpeggios as indices
A generated arpeggio SHALL be a pattern of indices into the voiced chords of the song. Its indices SHALL be allowed to come from a seeded random source, since every index is a chord tone.

#### Scenario: Random indices stay in the chord
- **WHEN** an arpeggio is generated with a random index source
- **THEN** every note it plays is a tone of the chord of its bar, and the source carries a seed and a loop length

### Requirement: Progressions from the style
A generated chord progression SHALL use the style's progressions or chords built on the degrees of the song's mode, with qualities the style allows, and SHALL keep 1 to 4 different chords per phrase.

#### Scenario: Dark mode
- **WHEN** a progression is generated for a style in phrygian
- **THEN** its chords are built on degrees of A phrygian moved to the song key, and a phrase has at most four different chords

### Requirement: Drum grooves from style rules
A generated drum groove SHALL be sequencer steps per drum row, built from a groove family the style allows: four on the floor, breakbeat, two-step, half-time or euclid. The family SHALL keep its defining hits (the kick on every beat for four on the floor, the backbeat snare for breakbeat and half-time).

#### Scenario: Two-step
- **WHEN** a groove of the two-step family is generated
- **THEN** the kick does not play on every beat, and the snare or clap plays on beats 2 and 4

### Requirement: Energy steers density and range
A higher energy value SHALL give parts with more onsets per bar and a wider pitch range; a lower value SHALL give fewer onsets and a narrower range, within the limits of the style.

#### Scenario: Low and high energy
- **WHEN** the same melody kind is composed with energy 0.2 and 0.9 and the same seed
- **THEN** the 0.9 melody has more onsets per bar and a range at least as wide

### Requirement: Safe sounds
A generated sound SHALL keep every setting inside a range table of the generator: filter, drive, and for FM the index, harmonicity and modulator wave. In the first version FM patches SHALL use at most two operators and no feedback. A generated sound SHALL play below clipping at the track's default gain.

#### Scenario: FM patch in range
- **WHEN** 100 FM patches are generated from 100 seeds
- **THEN** every value is inside its range, none uses a third operator or a feedback control, and each plays below clipping on a test phrase

### Requirement: Presets, generated parts or a mix
The generator SHALL also vary a preset: keep its rhythm and compose new pitches, or keep its pitches and compose a new rhythm. A preset given unchanged SHALL stay available to every caller.

#### Scenario: Varied preset
- **WHEN** the generator varies the bass preset `rolling` keeping its rhythm
- **THEN** the result has the onsets of `rolling` and new pitches from the chords
