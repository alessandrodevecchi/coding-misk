# Spec Delta

## Purpose

What level B of the Decode tab writes for a track with no drums, and how the fast export starts a movement device's wave.

## ADDED Requirements

### Requirement: A song without drums

Level B SHALL write no drum part when the bars with a kick row cover at least `DRUMLESS.cover` of the song's bars, fewer than `DRUMLESS.others` of them have another drum row (hats, claps, open hats), and the median rise of the 4-12 kHz band (`kickShape.high`) on the kick steps is under `DRUMLESS.click` dB. The model records `drumless: true`.

#### Scenario: A pad and a bass with no drums

- **WHEN** a pad with a Pump and an offbeat bass, with no drums, reads a kick on every beat of every bar with no click (2.5 dB) and no other drum row
- **THEN** the decoded song has no drums track

#### Scenario: A track with drums

- **WHEN** a track's kick bars carry hats or claps on most of them, or its kicks click
- **THEN** its drums are written as before

### Requirement: Movement waves in the fast export

The fast export SHALL pass each note's cycle (the hap's start) to superdough, as the live player does, so an LFO's and a tremolo's wave start at the same phase of the song in playback and in the exported file.

#### Scenario: A Pump without a kick exported

- **WHEN** a held pad with a Pump plays in a section without a kick and the song is fast-exported
- **THEN** the pad's dip falls on the same place of every beat in every bar of the file
