# Spec Delta

## Purpose

Ground truth for modulation at the Decode bench: test songs with known movement, a reader of that truth, an envelope error and a parameter score, ready for the Decode round that measures modulation.

## ADDED Requirements

### Requirement: Modulated test songs
`tools/decode-songs.mjs` SHALL hold five held-out test songs whose pad moves with known parameters (Pump with a kick, Pump without a kick, filter LFO, Tremolo, filter Sweep, design D9), each in two takes: without drums and with drums. They SHALL belong to the VALIDATION set and be exported by `tools/decode-export.cjs` like the other test songs.

#### Scenario: Export
- **WHEN** `tools/decode-export.cjs` runs
- **THEN** ten new WAV files and their timelines appear in `.cache/decode/wav/`

### Requirement: Truth from the song
`modTruth(song)` SHALL return, per track, the movement devices and the Tremolo device with their arguments, read from the song itself.

#### Scenario: Pump song
- **WHEN** `modTruth` reads `mod-pump`
- **THEN** it returns the pad's `{ device: 'pump', depth: 0.6, recover: 0.15 }`

### Requirement: Envelope error
`envelopeError(fo, fc, grid)` SHALL return, for each of the three bands of `decode-hits`, the mean absolute difference in dB between original and code of the level per beat phase (32 bins per beat, folded over every bar, normalized by the band's mean). `tools/decode-bench.cjs` SHALL report it next to the band error for every bench file with a known grid, real tracks included.

#### Scenario: Identical files
- **WHEN** the envelope error compares a file with itself
- **THEN** it is 0 dB in every band

#### Scenario: Pump against a still pad
- **WHEN** it compares `mod-pump` without drums against the same song without Pump
- **THEN** the mid band's error is clearly above the error of the file against itself (at least 1 dB)

### Requirement: Parameter score
`modScore(truth, measured)` SHALL count a device as recovered when its kind and rate are right and its depth is within 0.15. In this change it SHALL be checked on the truth against itself (all recovered) and against an empty measure (none recovered).

#### Scenario: Self check
- **WHEN** `check:decode` runs
- **THEN** `modScore(modTruth(s), modTruth(s))` recovers every device of every modulated song

### Requirement: Baseline
One bench run SHALL record the envelope error of the current decoder per set in `DEVLOG.md`, as the baseline the next Decode round must not worsen.

#### Scenario: Baseline recorded
- **WHEN** this change is done
- **THEN** `DEVLOG.md` holds the envelope error per band and set from `decode-bench.cjs --set every`
