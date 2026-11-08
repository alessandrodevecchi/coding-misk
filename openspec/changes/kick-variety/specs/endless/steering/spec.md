## MODIFIED Requirements

### Requirement: A new track sounds different and fits
A track added beside tracks of the same instrument SHALL take a sound and a pattern from the song's style that differ from those of the tracks of that instrument already in the song, while the style offers another one. Its register SHALL be offset from theirs (another octave or range) where the instrument allows it, and its level SHALL be set below the existing tracks of that instrument. A track of an instrument with notes SHALL play in the song's key and chords.

A kick or beat added with "+" SHALL take its rows from the drum material generator, with the style's groove families and the energy of the phrase it enters, when the session composes on air and the style declares drum material; the style's built-in grooves SHALL follow as further candidates. Sessions with the source `patterns`, complexity 0, and styles without drum material SHALL use the built-in grooves alone. The new kick's `bd` row (or the new beat's rows) SHALL differ from the rows every track of the instrument holds while any candidate does; else from the rows playing on the boundary; else it SHALL repeat the rhythm the fewest tracks of the instrument play. The kit SHALL be one the instrument does not use, as before. There SHALL be no cap per instrument. The same command SHALL give the same track on replay.

#### Scenario: Two arps apart
- **WHEN** the listener adds a second arp
- **THEN** the second arp uses another wave or sound and another pattern than the first, an octave away from it, at a lower gain

#### Scenario: Three kicks on berlin-techno
- **WHEN** a berlin-techno song plays one kick and the listener presses "+ kick" three times
- **THEN** four kick tracks play from their entry phrases, each with a different `bd` row and a kit the others do not use while the style has one

#### Scenario: Presets-only session
- **WHEN** a session with the source `patterns` plays trance and the listener presses "+ kick" twice
- **THEN** the two new kicks take `bd` rows from trance's built-in grooves, each different from the kicks already in the song

#### Scenario: Style without drum material
- **WHEN** a phonk song plays one kick and the listener presses "+ kick"
- **THEN** the new kick takes the `bd` row of another phonk groove, different from the first kick

#### Scenario: Every rhythm already plays
- **WHEN** every candidate kick row is already held by a kick track of the song and the listener presses "+ kick"
- **THEN** a new kick still enters, repeating the rhythm the fewest kick tracks play, with another kit when the style has one

#### Scenario: Second beat
- **WHEN** a song plays one beat and the listener presses "+ beat"
- **THEN** the new beat plays rows that differ from the first beat's, and keeps only the drum rows the first beat does not play when it can

#### Scenario: Replay
- **WHEN** a session with three "+ kick" commands is replayed
- **THEN** the three kicks have the same rows and kits as the first time
