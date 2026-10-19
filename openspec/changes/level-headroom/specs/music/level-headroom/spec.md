## ADDED Requirements

### Requirement: Output never clips
The checks that test levels SHALL measure the peak of the master output while songs play, and the peak of exported audio files. A peak above 1.0 at the output or in a file SHALL fail the check.

#### Scenario: Export
- **WHEN** a song is exported and a sample of the file is above full scale
- **THEN** the export check fails and names the song and the time

### Requirement: Track peaks are a warning
A track line whose peak is above the headroom of its style SHALL be reported as a warning with its song, section and instrument, and SHALL NOT fail the check by itself.

#### Scenario: Loud hats
- **WHEN** the hats of a song peak at 1.2 and the output stays below 1.0
- **THEN** the check passes and lists the hats as a warning

### Requirement: Style headroom
A style recipe MAY set `headroom`, a number from 1.0 to 1.5, default 1.0. The recipe validator SHALL reject values outside the range with the JSON path.

#### Scenario: Loud style
- **WHEN** a style sets `headroom: 1.3`
- **THEN** track peaks up to 1.3 in its songs give no warning

### Requirement: Saturation from the sound
The knowledge base SHALL say that a saturated sound is made with distortion devices and functions, and that raising gain to get it is a mistake, because the output must not clip.

#### Scenario: Dirty lead
- **WHEN** an agent reads the sound and levels note to make a lead dirtier
- **THEN** it learns to use distortion and keep the output below clipping
