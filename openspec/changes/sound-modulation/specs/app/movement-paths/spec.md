# Spec Delta

## Purpose

The path engine: a movement device that makes a value (filter, high-pass, volume, sends, pan) follow a curve written point by point, also inside a held note, the same in the app, in both exports and in copied Strudel code. It works without any knob, so Decode can write measured paths; the knobs of `app/device-knobs` record into it.

## ADDED Requirements

### Requirement: Path device
The rack SHALL offer a movement device Path (Italian "Percorso") with a target (filter, hpf, volume, room, delay, pan), a list of `[bar, value]` points with bars from the song's start, and a smoothing (`linear` or `step`), as in design D14. Before its first point the value SHALL be the first point's, after its last the last point's.

#### Scenario: Path in a song file
- **WHEN** a pad's rack holds `{ "device": "path", "target": "filter", "points": [[0, 400], [4, 3000]] }`
- **THEN** `node tools/song.mjs validate` reports no error and the compiled code holds a path line and a `bmod` on the pad's line

### Requirement: Movement inside a held note
A Path SHALL move its target inside a note that is already sounding, following straight lines between points with `linear` and holding each value until the next point with `step`.

#### Scenario: Fade-in of a held chord
- **WHEN** a pad holds one chord for 8 bars with a volume path `[[0, 0], [8, 1]]`
- **THEN** its level in the middle of bar 4 lies between its levels at the starts of bars 4 and 5, and it grows through the chord without steps

### Requirement: Same path everywhere
A Path SHALL sound the same in playback, in the real-time export and in the fast export, and code copied out of the app SHALL hold the path as plain Strudel that evaluates and moves the target the same way.

#### Scenario: Fast export
- **WHEN** a song with a filter path is exported fast and in real time
- **THEN** both files move the brightness at the same bars, within the export checks' usual difference

#### Scenario: Copied code
- **WHEN** the user copies the code of that song and evaluates it in plain Strudel
- **THEN** it evaluates with no error, with the path line and its comment

### Requirement: Path limits
A Path SHALL hold at most 16 points a bar and at most 256 points; a song SHALL hold at most 8 paths; a Path SHALL count as one of a track's two movement devices, with at most one Path per target; a Path and a Sweep on the same target SHALL be an error; volume values SHALL be shares of the track's gain from 0 to 1. The validator SHALL report each violation with its JSON path.

#### Scenario: Too many points
- **WHEN** a path holds 20 points inside one bar
- **THEN** the validator reports an error at its `points`

#### Scenario: Path and Sweep on the filter
- **WHEN** a track has a Path and a Sweep, both on the filter
- **THEN** the validator reports an error at the second device

### Requirement: Writers call the engine without a knob
`pathDevice(target, points, options)` SHALL return a valid Path device from measured points (clamped, rounded to the options' points per bar, thinned, at most 256 points), or nothing when the path is flat, so Decode and other writers can add paths with no user interface.

#### Scenario: Flat path
- **WHEN** `pathDevice('volume', [[0, 1], [8, 1]])` is called
- **THEN** it returns nothing

#### Scenario: Measured fade-out
- **WHEN** `pathDevice('volume', [[120, 1], [124, 0.6], [128, 0]], { perBar: 1 })` is called
- **THEN** it returns a Path on volume whose three points validate

### Requirement: Path line in the track's block
The path line SHALL open its track's block, SHALL be muted, soloed out and hushed with its track, and SHALL be skipped by the code widgets, the level checks and the hidden mixer. A song without a Path SHALL compile byte for byte as before.

#### Scenario: Live build
- **WHEN** a song with a pad path plays with the live build on
- **THEN** the path line is typed before the pad's first line, and no widget shows the path line as an instrument
