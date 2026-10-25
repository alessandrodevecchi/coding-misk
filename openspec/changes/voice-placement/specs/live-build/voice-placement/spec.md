## ADDED Requirements

### Requirement: Compose Voices group
Compose SHALL show one Voices group, with the Live build on or off, holding the narrator controls (Narrator voice, Narrator style, Narrated growth), the voice instrument of the open song and, in a secondary row "In the next song", the voice instrument settings for a new song by an artist. The toolbar SHALL have no voice instrument button. A narrator control that cannot apply SHALL be disabled with a tooltip that says why.

#### Scenario: Live build off
- **WHEN** the owner opens a song with the Live build off
- **THEN** the Voices group is shown, the narrator controls are disabled with a tooltip saying the song does not build live, and the voice instrument controls work

#### Scenario: Not Crescendo
- **WHEN** the Live build is on with the In blocks build style
- **THEN** Narrated growth is disabled with a tooltip saying it needs Crescendo

#### Scenario: No voice instrument
- **WHEN** the open song has no voice instrument track
- **THEN** the group offers to add one, and once added shows its controls

### Requirement: Voice instrument of the song being edited
The Voices group and the panel of a voice instrument track SHALL offer the same voice instrument controls (preset, phrases per song, phrases, ways) and New phrases, showing the same values. A change in either SHALL rewrite that track's lines and clips: one phrase per quiet part at most, the count a ceiling, the track's sound settings kept, the options kept on the track. The same options SHALL give the same lines. The owner SHALL be able to undo a rewrite.

#### Scenario: More phrases
- **WHEN** the owner picks 4 to 5 different phrases
- **THEN** the track has up to 5 different lines, each on its own quiet part, and the track panel and the group both show 4 to 5

#### Scenario: Repeated
- **WHEN** the owner picks repeated phrases
- **THEN** the track has one line placed on several quiet parts

#### Scenario: Undo
- **WHEN** the owner presses Undo in the toast after a rewrite
- **THEN** the track is as it was before

### Requirement: Radio Voices group
The radio SHALL show the narrator controls and the voice instrument block together in one Voices group. The narrator controls SHALL be enabled with the Custom profile and otherwise disabled with a tooltip that says so. The group SHALL say that its settings apply from the next song, that the voice instrument also changes the song on air, and why the narrator of the song on air does not.

#### Scenario: Another profile
- **WHEN** the radio profile is Live coder
- **THEN** the narrator controls show the Live coder values, disabled, and the voice instrument controls work

### Requirement: Voice instrument of the song on air
A voice instrument change while the radio plays SHALL also be a steering command on the song on air, recorded in the session like the other console commands, applied from the first quiet part after the next phrase; the lines before it SHALL stay. Replay and saved sessions SHALL rebuild the same song. When no quiet part is left the change SHALL apply from the next song only, and the radio SHALL say why.

#### Scenario: On air
- **WHEN** the owner picks Present while a generated song plays
- **THEN** the song on air speaks the new phrases from its next quiet part, the session recipe records the command, and a Replay sounds the same

### Requirement: Narrator knob
The radio knob, compilation range, curve and console group that set how often the narrator comments SHALL be named Narrator and SHALL say that they do not change the voice instrument. Their behaviour and stored values SHALL not change.

#### Scenario: Knob name
- **WHEN** the owner opens the radio
- **THEN** the knob next to Chaos, Energy and Complexity reads Narrator, and its tooltip says it sets how often the narrator comments the changes

### Requirement: Stored values
Voice instrument options stored for a new song by an artist and for the radio before this change SHALL be read as before.

#### Scenario: Saved new-song options
- **WHEN** the browser holds new-song options from voice-controls
- **THEN** the "In the next song" row shows them
