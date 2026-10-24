## ADDED Requirements

### Requirement: Narrator voice switch
The profile options SHALL include "Narrator voice", on by default in every profile. When it is off, the spoken step phrases SHALL not play, in Compose and in the radio, and the music SHALL be the same. The voice instrument SHALL not be affected.

#### Scenario: Narrator off
- **WHEN** the owner turns Narrator voice off and plays luci-rosse with the Live build on
- **THEN** no phrase is spoken, the music and length are the same, and the comments follow their own options

#### Scenario: Voice instrument stays
- **WHEN** a song with a voice instrument track plays with Narrator voice off
- **THEN** the voice instrument still speaks its lines

### Requirement: Fully narrated depends on the narrator
"Fully narrated" SHALL be available only when Narrator voice is on; with the narrator off it SHALL be shown disabled with a hint.

#### Scenario: Disabled
- **WHEN** Narrator voice is off
- **THEN** Fully narrated is disabled and its hint says to switch the narrator on

### Requirement: Options in groups
The profile options SHALL be shown in four groups with a drawn icon and a title: Growth, Code, Typing and Voice, in Compose and in the radio's Custom section. Each group SHALL say when it applies (at once, or from the next song in the radio), and SHALL fold and remember whether it is folded.

#### Scenario: Voice group
- **WHEN** the owner opens the profile panel
- **THEN** Narrator voice, Fully narrated and Voice code are together under Voice, with a microphone icon

### Requirement: Profiles keep their sound
Classic, Crescendo and Live coder SHALL keep their current sound and code with the narrator on; existing saved profiles without the new option SHALL load with the narrator on.

#### Scenario: Old saved profile
- **WHEN** a profile saved before this change loads
- **THEN** Narrator voice is on and everything plays as before
