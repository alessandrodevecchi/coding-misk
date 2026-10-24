## ADDED Requirements

### Requirement: Narrator voice switch
The profile options SHALL include "Narrator voice", on by default in every profile. When it is off, the spoken step phrases SHALL not play, in Compose and in the radio, and the music SHALL be the same. The voice instrument SHALL not be affected.

#### Scenario: Narrator off
- **WHEN** the owner turns Narrator voice off and plays luci-rosse with the Live build on
- **THEN** no phrase is spoken, the music and length are the same, and the comments follow their own options

#### Scenario: No phrase over the stage
- **WHEN** a song plays with Narrator voice off
- **THEN** the step phrase is not shown over the stage, in the studio scene or in a video either

#### Scenario: Voice instrument stays
- **WHEN** a song with a voice instrument track plays with Narrator voice off
- **THEN** the voice instrument still speaks its lines

### Requirement: Fully narrated depends on the narrator
"Fully narrated" SHALL be available only when Narrator voice is on; with the narrator off it SHALL be shown disabled with a hint.

#### Scenario: Disabled
- **WHEN** Narrator voice is off
- **THEN** Fully narrated is disabled and its hint says to switch the narrator on

### Requirement: Profiles keep their sound
Classic, Crescendo and Live coder SHALL keep their current sound and code with the narrator on; existing saved profiles without the new option SHALL load with the narrator on.

#### Scenario: Old saved profile
- **WHEN** a profile saved before this change loads
- **THEN** Narrator voice is on and everything plays as before

### Requirement: Code options without the Live build
With the Live build off, Compose SHALL still show the code options (comments, technical functions with Sections, and the display options: title, lit notes, line breaks), and they SHALL change the code of the song as written. The profile, build style and growth controls SHALL show only with the Live build on. With the default options the code SHALL be the same as today.

#### Scenario: Compact Classic song
- **WHEN** the owner keeps the Live build off on kellerlicht and picks the compact technical functions
- **THEN** the code uses the song's functions and the hidden mixer, and every hap keeps its gain, orbit and effects

#### Scenario: Defaults unchanged
- **WHEN** a Classic song with the Live build off has the default code options
- **THEN** its code is the same as before this change
