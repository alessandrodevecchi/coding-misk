## Purpose

The growth shape settings of Settings, Advanced on air: the radio grows its Live coder songs with the shapes tried and the try-all choice the owner set, never later than the song is needed, and the same way again when a session is replayed or exported.

## ADDED Requirements

### Requirement: The radio follows the shape settings
A Live coder song grown on air SHALL use the settings "Growth shapes tried" (4 to 32, default 8) and "Try all growth shapes" with its "Keep" choice, as a Compose growth does. With the default values the radio SHALL grow every song exactly as before. The hints of these settings, in English and Italian, SHALL say that they apply to Compose and to the radio. Song cards and the Node checks SHALL keep using the defaults.

#### Scenario: Default unchanged
- **WHEN** a radio session plays with the default settings
- **THEN** every song grows as before and the radio fixtures do not move

#### Scenario: Try all on air
- **WHEN** "Try all growth shapes" is on with "Best one" and the growth is ready in time
- **THEN** the next Live coder song on air is the growth that measured every candidate shape

### Requirement: Settings recorded with the session
The radio SHALL read the shape settings when a session starts and store the values that differ from the defaults in the session's recipe. A session recorded without them SHALL grow with the defaults. Changing the settings SHALL apply to sessions started after the change.

#### Scenario: Replay
- **WHEN** a session started with "Try all growth shapes" is replayed after the setting is turned off
- **THEN** its songs grow with "Try all growth shapes", as they did on air

### Requirement: Ready in time
A song SHALL never wait on air for a wider search. The radio SHALL first grow each Live coder song with the default search, then grow it with the settings in the background; the wider growth SHALL replace the default one only when it is ready before the song's time limit (a margin before the song is needed) and the song has not been steered or started. Otherwise the song SHALL play its default growth. Where a song must grow on the page at once, it SHALL use the default search.

#### Scenario: Wider search too slow
- **WHEN** the wider growth of the next song is not ready at its time limit
- **THEN** the song plays its default growth, and the wider work is dropped

### Requirement: Same session, same songs
The session SHALL record, for each song grown on air with non-default settings, which growth it played (the wider one or the default one), so a replay, a saved session in a playlist and an export grow each song as it was heard.

#### Scenario: Fallback replayed
- **WHEN** a song played its default growth because the wider one was late, and the session is exported
- **THEN** the export grows that song with the default search
