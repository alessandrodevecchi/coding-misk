# Spec Delta

## Purpose

How level B of the Decode tab measures and writes how the chords and the bass are played and the parts of similar sections.

## ADDED Requirements

### Requirement: Chord rhythm measured

Level B SHALL measure, per bar with a chord, the energy of the chord's own tones in the 300-2500 Hz band step by step (16 steps, four frames a step), each bin counted by how far it stands over its neighbours so that drums and noise add almost nothing; and record per bar the steps where that energy attacks after a gap (`chordHits`, 16 characters), its mean over its top (`chordHeld`) and its share of the band's energy (`chordTonal`).

#### Scenario: Stabs on eighths

- **WHEN** an app song plays the chords `Am F C G` as stabs on every eighth
- **THEN** its bars read `x.x.x.x.x.x.x.x.` and a held measure under 0.3

#### Scenario: A held pad

- **WHEN** the same chords play as a held pad
- **THEN** its bars read at most one hit and a held measure over 0.5

### Requirement: Chords written with their rhythm

When a section's chord bars average a tonal share of at least `CHORD_RULE.tonal`, a held measure under `CHORD_RULE.held`, at least `CHORD_RULE.hits` hits a bar on steps where no bass note starts, and hits that come back on the same steps (their mean overlap with the steps hit in half the bars at least `CHORD_RULE.steady`), level B SHALL write the section's chords with those steps as a `.struct("…")` after the voicing, per block of `CHORD_RULE.block` bars; otherwise the chords stay held.

#### Scenario: Stabs written as stabs

- **WHEN** a section's chords are stabs on eighths
- **THEN** the chords' code of that section ends its voicing with `.struct("x x x x x x x x")` or the same steps on sixteen

#### Scenario: A pad stays held

- **WHEN** a section's chords are a held pad, or a detuned pad whose beating reads hits at random
- **THEN** the chords' code has no `struct`

### Requirement: Repeated bass notes

Level B SHALL record per bar with bass notes, step by step, the rise of the 300-1500 Hz band at the step's start over its least just before, its level, and its level in the step's second half (`bassAttack`). In a bar with at least `BASS_FILL.notes` notes whose note steps off the kick rise by `BASS_FILL.attack` or more, the writer SHALL write the nearest note again on an empty or held step off the kick that rises by `BASS_FILL.attack` to `BASS_FILL.level` of the notes' level, and on a kick's step between two notes whose second half holds `BASS_FILL.late` of the notes' (where that is at least `BASS_FILL.lateFloor`).

#### Scenario: A distorted bass on sixteenths

- **WHEN** a distorted bass plays one note on every sixteenth over a four-on-the-floor kick
- **THEN** the bass code plays all sixteen steps

#### Scenario: An offbeat bass

- **WHEN** a clean bass plays the offbeats under a four-on-the-floor kick
- **THEN** the bass keeps its four notes a bar

### Requirement: Twin sections, the same parts

Two sections of the same kind, each at least `TWIN_RULE.bars` long, whose mean levels per part lie within `TWIN_RULE.level` and whose brightness within `TWIN_RULE.bright` (relative), SHALL share their parts: the drums' main pattern with a kick replaces one without, and a bass or chords part written in one twin and not in the other is written in the other with its main pattern.

#### Scenario: Two equal drops

- **WHEN** a second drop, as loud and as bright as the first, was written with hats only
- **THEN** it plays the first drop's drums with their kick
