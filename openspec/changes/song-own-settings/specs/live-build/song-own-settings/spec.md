## ADDED Requirements

### Requirement: Configuration saved with the song
A song's configuration (profile, Live build, comments, technical functions, narrator and the other profile options) SHALL be part of the song and SHALL be how it opens, plays and exports by default. A song without one SHALL play as Classic with the Live build off.

#### Scenario: Kellerlicht after another song
- **WHEN** the owner tries Crescendo on another song and then opens kellerlicht
- **THEN** kellerlicht opens with the Live build off and plays its written 4:50, with no narrator

### Requirement: Trial settings stay on one song
A change of configuration in Compose SHALL apply to the open song only, SHALL NOT change the saved song and SHALL NOT apply to any other song. The song SHALL show "configuration changed" with a ↺ "Back to the original configuration" button in Compose and on its Songs card.

#### Scenario: Back to the original
- **WHEN** the owner tries Live coder on kellerlicht and presses ↺
- **THEN** kellerlicht plays with its saved configuration again and the marker disappears

### Requirement: Trial survives a reload
A trial configuration SHALL be kept for its song across reloads until ↺ or a save, and SHALL stay marked.

#### Scenario: Reload
- **WHEN** the owner tries Live coder on kellerlicht and reloads the page
- **THEN** kellerlicht still plays as Live coder, marked as changed, with ↺ available

### Requirement: Saving is explicit
Save on the owner's song SHALL write the trial configuration as the song's own; Save as new SHALL create a copy with it; Save on a built-in song SHALL create the owner's version, and Restore original SHALL bring the built-in back.

#### Scenario: Save as new
- **WHEN** the owner saves kellerlicht with a Live coder trial as a new song
- **THEN** the new song plays as Live coder by default and kellerlicht is unchanged

### Requirement: One length
The Songs card, Compose and the radio SHALL show the same length for the same song and configuration.

#### Scenario: Card with a trial
- **WHEN** a song has a trial configuration
- **THEN** its card shows the length with the trial and the changed marker
