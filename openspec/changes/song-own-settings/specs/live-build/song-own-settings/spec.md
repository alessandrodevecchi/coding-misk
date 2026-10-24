## ADDED Requirements

### Requirement: Own settings by default
A song SHALL open, play and export with its declared profile and options, or, when it declares none, as Classic with the Live build off. Settings changed in Compose on another song SHALL NOT apply to it.

#### Scenario: Kellerlicht after another song
- **WHEN** the owner sets Crescendo on another song and then opens kellerlicht
- **THEN** kellerlicht opens with the Live build off and plays its written 4:50, with no narrator

### Requirement: Changes are per song
A change of profile, option or Live build switch in Compose SHALL apply to the open song only and SHALL be remembered for it, in the browser and in the backup.

#### Scenario: Remembered
- **WHEN** the owner sets Live coder on kellerlicht, opens another song and comes back
- **THEN** kellerlicht is still Live coder and the other song kept its own settings

### Requirement: Use for all songs
The panel SHALL offer "Use for all songs", which applies the current settings to every song without its own choice, and "Back to the song's own settings", which clears the open song's changes.

#### Scenario: Back to own settings
- **WHEN** the owner presses Back to the song's own settings on kellerlicht
- **THEN** kellerlicht plays as written again

### Requirement: One length
The Songs card, Compose and the radio SHALL show the same length for the same song and settings.

#### Scenario: Card and Compose
- **WHEN** a song has no own changes
- **THEN** its card and Compose show the same length
