## ADDED Requirements

### Requirement: Compose Voices group
Compose SHALL show one Voices group with Narrator voice, Narrator style, Narrated growth and the voice instrument of a new song by an artist (preset, phrases per song, phrases, ways, in the new song), with the Live build on or off. The toolbar SHALL have no voice instrument button. A narrator control that cannot apply SHALL be disabled with a tooltip that says why.

#### Scenario: Live build off
- **WHEN** the owner opens a song with the Live build off
- **THEN** the Voices group is shown, the narrator controls are disabled with a tooltip saying the song does not build live, and the new-song voice instrument controls work

#### Scenario: Not Crescendo
- **WHEN** the Live build is on with the In blocks build style
- **THEN** Narrated growth is disabled with a tooltip saying it needs Crescendo

### Requirement: Voice instrument of the song being edited
The panel of a voice instrument track SHALL offer the voice instrument controls (preset, phrases per song, phrases, ways) and New phrases. A change SHALL rewrite that track's lines and clips: one phrase per quiet section at most, the count a ceiling, the track's sound settings kept, the options kept on the track. The same options SHALL give the same lines. The owner SHALL be able to undo a rewrite.

#### Scenario: More phrases
- **WHEN** the owner picks 4 to 5 different phrases in the panel of a song's voice instrument track
- **THEN** the track has up to 5 different lines, each on its own quiet section

#### Scenario: Repeated
- **WHEN** the owner picks repeated phrases
- **THEN** the track has one line placed on several quiet sections

#### Scenario: Undo
- **WHEN** the owner presses Undo in the toast after a rewrite
- **THEN** the track is as it was before

### Requirement: Radio Voices group
The radio SHALL show the narrator controls and the voice instrument block together in one Voices group. The narrator controls SHALL be enabled with the Custom profile and otherwise disabled with a tooltip that says so. The group SHALL say that its settings apply from the next song and why the song on air does not change.

#### Scenario: Another profile
- **WHEN** the radio profile is Live coder
- **THEN** the narrator controls show the Live coder values, disabled, and the voice instrument controls work

### Requirement: Stored values
Voice instrument options stored for a new song by an artist and for the radio before this change SHALL be read as before.

#### Scenario: Saved new-song options
- **WHEN** the browser holds new-song options from voice-controls
- **THEN** the Compose Voices group shows them
