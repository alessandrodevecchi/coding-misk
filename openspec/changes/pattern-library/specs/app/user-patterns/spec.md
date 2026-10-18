## Purpose

The user keeps their own patterns: parts saved from a Compose track or from the generator, which they can play in the Patterns tab, rename, delete and add to a song.

## ADDED Requirements

### Requirement: Save as pattern from Compose
The pattern panel of a melodic or drums track in Compose SHALL offer [Save as pattern]. It SHALL save the selected pattern with its kind (from the track type), its idea or written material, the track's sound, the key, progression, meter and tempo of the section it plays in, a name (the track and song names by default) and the date.

#### Scenario: Saved bass
- **WHEN** the user saves pattern B of a bass track in a song in F at 132 BPM
- **THEN** the Patterns tab lists a new bassline under "mine", and playing it uses the track's sound, key F and 132 BPM by default

### Requirement: Rename and delete
The user SHALL be able to rename a saved pattern and delete it. Delete SHALL ask for a second press before it removes the pattern. Built-in patterns SHALL NOT be renamed or deleted.

#### Scenario: Delete
- **WHEN** the user presses delete on a saved pattern and presses it again to confirm
- **THEN** the pattern leaves the list and stays gone after a reload

### Requirement: Kept with the user's data
Saved patterns SHALL be kept in the browser with the user's other data, SHALL survive a reload, and SHALL be included in the backup export and merged on import like songs and playlists.

#### Scenario: Backup
- **WHEN** the user exports a backup with three saved patterns and imports it in a clean browser
- **THEN** the three patterns are listed with their names, kinds and sounds

### Requirement: Add a saved pattern to a song
A saved or built-in pattern SHALL be addable to the song open in Compose: it becomes a new pattern on the first track of its kind, or on a new track of that kind when the song has none. The song's existing patterns SHALL NOT change.

#### Scenario: New pattern on a track
- **WHEN** the user adds a saved melody to a song whose hook track has patterns A and B
- **THEN** the hook track gets pattern C with that melody, and Compose shows it selected
