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
When a muted track plays again, its lines SHALL be unmuted and edited where their values changed, and SHALL NOT be deleted and typed again.

#### Scenario: Scontro 2
- **WHEN** luci-rosse goes from Ombra to Scontro 2
- **THEN** the drum lines are unmuted and only `crunch` and the mask values are edited

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
