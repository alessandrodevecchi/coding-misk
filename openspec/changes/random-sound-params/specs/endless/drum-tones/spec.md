# Spec Delta

## ADDED Requirements

### Requirement: Drum tone setting
A drum track MAY hold a `tone` setting with the groups `kick` (row `bd`), `snare` (rows `sd`, `cp`) and `hats` (rows `hh`, `oh`, `rd`). Each group MAY give `decay` (seconds), `tune` (semitones), `drive` and `cutoff` (Hz). A drum track without `tone` SHALL compile exactly as before.

#### Scenario: No tone
- **WHEN** a built-in song without `tone` is compiled
- **THEN** its code equals the code snapshot

### Requirement: Tone validation
The validator SHALL report, with its JSON path, an unknown group or value and a value outside the safe table of design D2 (kick: decay 0.15 to 0.8, tune -3 to 2, drive 0 to 0.6, cutoff 1500 to 20000; snare: decay 0.08 to 0.5, tune -2 to 3, drive 0 to 0.8, cutoff 2500 to 20000; hats: decay 0.03 to 0.3, tune -2 to 4, drive 0 to 0.3, cutoff 5000 to 20000).

#### Scenario: Out of range
- **WHEN** a song has `tone.kick.drive` 2
- **THEN** the validator reports `tracks[n].settings.tone.kick.drive` with the allowed range

#### Scenario: Unknown group
- **WHEN** a song has `tone.toms`
- **THEN** the validator reports `tracks[n].settings.tone.toms` and lists `kick`, `snare`, `hats`

### Requirement: Tone code
The writer SHALL append a group's tone to each of its rows' lines, after the kit and before swing, the rack and the analyser: `decay` as `.decay(d).sustain(0)`, `tune` as `.speed(s)` with `s = 2^(tune/12)`, `drive` as `.distort(x).distortvol(.5)` replacing the track's drive on that row, `cutoff` as `.lpf(c)` when lower than the track's cutoff. A line SHALL hold at most one call per control. The open hat SHALL use at least twice the hats decay.

#### Scenario: Kick tone
- **WHEN** a kick tone has decay 0.3 and tune -1 on a track with drive 0.2
- **THEN** the kick line holds `.decay(.3).sustain(0).speed(.944)` and one `.distort(.2)`

### Requirement: Generated tones
At session option `sound` 1 or more, the director SHALL give every drum track of a song a tone, drawn from its own stream of the session seed, inside the style's `drums.material.tones` ranges (else the middle half of the safe table). The kick and the beat tracks of a song SHALL share one tone. At `sound` 0 no tone SHALL be drawn. Drawing tones SHALL NOT change any drum pattern or any other draw of the session.

#### Scenario: Same seed, same tone
- **WHEN** the same session is generated twice at `sound` 1
- **THEN** every drum track has the same tone both times

#### Scenario: Patterns unchanged
- **WHEN** a session is generated at `sound` 0 and at `sound` 1 with the same seed
- **THEN** the songs are equal except for the `tone` and `vary` settings

### Requirement: Tones follow the energy
For the same seed, a higher energy SHALL NOT draw less drive or a darker cutoff than a lower energy.

#### Scenario: Two energies
- **WHEN** the tone of one seed is drawn at energy 0.2 and at energy 0.9
- **THEN** the second has at least the drive and the cutoff of the first in every group

### Requirement: Tone levels
A generated tone SHALL keep each drum row's peak at or below 0.9 and the median kick peak within 0.1 of the untoned kick, measured over radio songs of every style. Tones SHALL load no new sample and SHALL leave the sound guard and the kit row mapping as they are.

#### Scenario: Level run
- **WHEN** the level check plays radio songs of every style at `sound` 1
- **THEN** no drum row peaks above 0.9 and the level into the limiter stays at or below 1.2
