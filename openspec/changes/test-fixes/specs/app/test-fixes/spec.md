## ADDED Requirements

### Requirement: Export of the song on air
The export menu SHALL offer "This song", which exports the song on air from its first bar to its last, without the start of the next song.

#### Scenario: Radio song
- **WHEN** the owner exports "This song" while the second song of a radio session plays
- **THEN** the file holds the whole second song and nothing of the third

### Requirement: Composed melody shape shown
A pattern made by "Compose a part" SHALL show which shape it uses (changed tail, call and response, polymeter) in its hint, in English and Italian.

#### Scenario: Hint
- **WHEN** the owner composes a hook part and hovers it
- **THEN** the hint names its shape

### Requirement: Spoken passage at its bar
A spoken passage of the voice instrument SHALL speak at the bar it is written for.

#### Scenario: Late passage
- **WHEN** a song with a passage at bar 68 plays from the start
- **THEN** the passage is silent until bar 68

### Requirement: Patterns tab options act on the loop
Every control in a pattern's loop SHALL change what the loop plays from the next bar, or SHALL be shown as an option of "New" only.

#### Scenario: Tempo
- **WHEN** the owner changes the tempo of a looping pattern
- **THEN** the loop plays at the new tempo from the next bar

### Requirement: Clear labels
The radio "+ Playlist" dialog SHALL confirm with a playlist label, and the radio Harmony group SHALL be named "Song harmony" with a hint saying it changes chords and key for every part with notes.

#### Scenario: Playlist dialog
- **WHEN** the owner adds a radio song to a playlist
- **THEN** the confirm button speaks of the playlist
