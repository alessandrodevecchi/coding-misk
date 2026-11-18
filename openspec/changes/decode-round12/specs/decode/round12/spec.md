# Spec Delta

## Purpose

What level B of the Decode tab writes where the original plays quietly, where a line's harmonics read as a chord, where the kick's click or a backbeat snare reads as another drum, and how the learned beat tracker is offered.

## ADDED Requirements

### Requirement: Silent bars measured

The Decode bench SHALL report, per file, the bars where the original plays (its bar level within `SILENT_RULE.music` dB of its 90th percentile bar) and the code is silent (more than `SILENT_RULE.code` dB under the code's 90th percentile bar, or past the code's end), with the silent bars of the first and the last run of music apart (`head`, `tail`).

#### Scenario: A quiet intro left out

- **WHEN** an original opens with a pad 25 dB under its drops and the code writes nothing there
- **THEN** the bench counts those bars as silent, in `head`

### Requirement: Quiet chords

Level B SHALL hear a bar's chord when its confidence is at least 0.5 and its tones' tonal share (`chordTonal`) is at least `QUIET_RULE.tonal`, at any chord level, unless a line plays sixteenths in the bar; a section heard mostly so SHALL be written at a gain scaled by the square root of its chord level over the song's loud chord bars' level, at least `QUIET_RULE.floor` of it. A section of chords that fails the key test but whose tones stand out (mean tonal share at least `QUIET_RULE.tonal`, no line of sixteenths on most bars) SHALL be written as power chords.

#### Scenario: A pad on the tonic with the other third

- **WHEN** a break holds an E chord read as E major in E minor, its tones standing out of the band
- **THEN** the break's chords are written as `chord("E5")`

#### Scenario: Drums' noise

- **WHEN** a quiet section's chord readings have a tonal share under `QUIET_RULE.tonal`
- **THEN** no chords are written there

### Requirement: No chords from a line's harmonics

Level B SHALL write no chords in a section where, on at least `LINE_RULE.share` of its chord bars, a driven or bright bass (the bass profile's fundamental share at least `LINE_RULE.h1`) plays sixteenths (`LINE_RULE.attack` attack steps or `LINE_RULE.notes` notes) and the chord read is the major chord on the line's main note with tones that never hold (`chordHeld` under `LINE_RULE.held`), unless at least `LINE_RULE.minor` of those bars read the line's main note as a minor chord.

#### Scenario: A distorted bass on sixteenths and no chords

- **WHEN** a distorted bass plays A on every sixteenth and the analysis reads A major over it
- **THEN** no chords are written

#### Scenario: Minor stabs over an acid riff

- **WHEN** an acid riff on A plays under Am stabs that read Am on a quarter of the bars or more
- **THEN** the chords stay

### Requirement: The kick's click

When a section's drum bars read, on at least `KICK_CLICK.share` of them, a clap on at least `KICK_CLICK.beats` beats a 16th after (or before) the beat and no more than one clap on the beats, level B SHALL write those claps as the kick and drop the kicks and claps on the beats in those bars.

#### Scenario: A sidechained bass before each kick

- **WHEN** the grid's beat sits a 16th before a four-on-the-floor kick and the kick's click reads as a clap on every beat
- **THEN** the code's kick sits on the click's steps and no clap is written there

### Requirement: A backbeat snare a 16th off

In a section with at least `OFF_SNARE.min` bars with drums whose closed or open hats play steps 3 and 11, or 5 and 13, on `OFF_SNARE.on` of the bars and little else, level B SHALL write those hits as claps.

#### Scenario: Cymbals that are a snare

- **WHEN** a section's only drum hits are open hats on 5 and 13
- **THEN** they are written as claps on 5 and 13
