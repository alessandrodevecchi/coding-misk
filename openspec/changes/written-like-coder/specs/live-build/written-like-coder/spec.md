## ADDED Requirements

### Requirement: A silent track that returns stays muted
In code edited in place, a track with no sound in a section SHALL stay in the code with its lines muted (`_$:`) when it plays again later in the song, and SHALL be removed when it never plays again.

#### Scenario: Drums in Taglio
- **WHEN** luci-rosse plays as Live coder and reaches Taglio
- **THEN** the drum lines stay in the code muted, and in Scontro they are unmuted

#### Scenario: A track that does not come back
- **WHEN** a track plays its last clip
- **THEN** its lines leave the code at the next section change

### Requirement: Returning lines are edited, not retyped
When a line kept muted plays again, it SHALL be unmuted and edited where its values changed, and SHALL NOT be deleted and typed again.

#### Scenario: Scontro 2
- **WHEN** luci-rosse goes from Ombra to Scontro 2
- **THEN** the drum lines are unmuted and only `crunch` and the mask values are edited

### Requirement: Mute or delete, whichever types faster
For each line that goes silent and plays again later, the code SHALL either keep it muted and edit it on its return, or delete it and type it again on its return, whichever the typing model estimates as cheaper. When the two costs are close, the choice SHALL be drawn with a seed from the song, the track, the line and the bar it returns at, so it is not always the same way and the same song always gives the same code.

#### Scenario: Acid line in Druck
- **WHEN** kellerlicht reaches Druck as Live coder and its acid line returns with 32 values instead of 24
- **THEN** the line is deleted when it goes silent and typed again in Druck, and the typing before Druck goes down from 120.9 s

#### Scenario: Close costs
- **WHEN** muting and deleting cost about the same for a line
- **THEN** the choice depends on the seed, and is the same every time the song is grown

### Requirement: Same sound
Muted lines SHALL play nothing, and the song SHALL sound and last the same as before this change, with every profile and technical functions preset.

#### Scenario: Mixer
- **WHEN** `check:mixer -- --full` runs
- **THEN** every hap keeps its gain, orbit and effects

### Requirement: Less pasting in the written part
The typing needed at the section changes of the written part SHALL go down, measured with the growth counters on luci-rosse, settimo-cielo and kellerlicht.

#### Scenario: Before Scontro 2
- **WHEN** the typing before Scontro 2 is measured after this change
- **THEN** it needs less time than the 58 s measured before
