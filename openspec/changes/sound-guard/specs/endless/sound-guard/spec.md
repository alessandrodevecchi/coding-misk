## Purpose

The sound guard keeps playback and fast exports going when a sound in the library is broken: it finds the broken part, plays a stand-in, remembers it and says which sounds were replaced.

## ADDED Requirements

### Requirement: Broken sounds fail instead of hanging
Loading a soundfont zone whose audio cannot be decoded, or a font file that cannot be read, SHALL end with an error within the normal loading time. No note SHALL wait without end for a sound.

#### Scenario: Empty soundfont zone
- **WHEN** a note falls in a soundfont zone that holds no valid audio
- **THEN** loading that note ends with an error and the following notes keep playing

### Requirement: Stand-ins for broken sounds
When a sound fails to load, the system SHALL play the same note from a stand-in: another font of the same instrument for a soundfont (only for the broken zone's notes when one zone is broken), another sample of the same bank for a sample. A failed stand-in SHALL lead to the next one. Network errors SHALL NOT mark a sound as broken.

#### Scenario: Broken top zone
- **WHEN** a vibraphone note falls in a broken zone of its font
- **THEN** it plays from another vibraphone font, and notes outside that zone still use the first font

#### Scenario: Offline
- **WHEN** a sound cannot be fetched because the network is down
- **THEN** it is not remembered as broken

### Requirement: Health register
The system SHALL remember broken sounds, fonts and zones in the browser together with the sound library version, and use the stand-in at once for every later note, live and in fast exports. A new library version SHALL start from the known list again.

#### Scenario: Second note
- **WHEN** a broken zone was found once
- **THEN** later notes in that zone play the stand-in without trying the broken zone again, also after a reload

### Requirement: Pre-flight check in fast exports
Before rendering a block, the fast export SHALL load every distinct sound and soundfont note the block plays, with a time limit per sound, and apply stand-ins. A sound that still does not load SHALL be left out and listed; the export SHALL NOT stall.

#### Scenario: Export with a broken note
- **WHEN** an export plays a note from a broken soundfont zone
- **THEN** the export completes at its usual speed, the note plays from the stand-in and the app lists the replaced sound

### Requirement: Radio preload
While a radio song plays, the radio SHALL load the sounds of the next song, so a broken sound is replaced before the next song starts.

#### Scenario: Broken sound in the next song
- **WHEN** the next song uses a broken soundfont zone
- **THEN** the zone is in the register before the song starts and its first note plays the stand-in

### Requirement: Library check tool
A command SHALL scan every soundfont zone of the instruments the app can call, and every sample of the banks it can call, and report each broken part with the stand-in that covers it. It SHALL exit with an error when a broken part has no stand-in.

#### Scenario: Known broken parts
- **WHEN** the command runs on the current library
- **THEN** it reports the broken vibraphone zone and the misspelled bass font as covered
