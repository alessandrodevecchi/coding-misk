# Spec Delta

## Purpose

A small second player in Compose that plays the pattern being made on a track. It lets the user hear a new pattern quickly, with or without the song playing, and never takes over the main player.

## ADDED Requirements

### Requirement: Preview button next to the listen button
Each track panel that has a listen button by its preset or groove menu SHALL show a preview button right next to it. The button SHALL show play when the preview is off and stop when it plays this track's pattern. It SHALL have a label and a tooltip in both languages.

#### Scenario: Button in place
- **WHEN** the user opens Compose on a bass track
- **THEN** a play button sits next to the listen button by the Preset menu, with the tooltip "Anteprima del pattern" in Italian and "Preview the pattern" in English

#### Scenario: Toggle
- **WHEN** the user presses the preview button and then presses it again
- **THEN** the first press starts the preview and the button shows stop, and the second press stops it and the button shows play

### Requirement: What the preview plays
The preview SHALL loop the pattern selected in the track panel. It SHALL use the track's sound and settings, and the key, progression, meter and tempo of the selected section. It SHALL play the pattern even when the track is muted, or when the pattern is used in no section.

#### Scenario: A new pattern used nowhere
- **WHEN** the user presses Compose a part, which makes pattern C, and then starts the preview
- **THEN** pattern C plays in a loop with the track's sound and the section's key and progression, although no section uses C

#### Scenario: Edits while it plays
- **WHEN** the preview plays and the user changes a step, a note, the preset or the selected pattern of that track
- **THEN** the preview plays the changed pattern from its next bar, without stopping

### Requirement: The main player is left alone
Starting, playing and stopping the preview SHALL NOT change what the player bar plays, shows or controls: its title, its position, its play, pause and stop, the code in the editor and the song's scheduler. Play, pause and stop in the player bar SHALL act only on the song.

#### Scenario: Preview while the song plays
- **WHEN** the song plays in Compose and the user starts the preview
- **THEN** the song keeps playing without a gap, and the player bar still shows the song's title and position

#### Scenario: Preview with nothing playing
- **WHEN** nothing plays and the user starts the preview
- **THEN** the player bar stays stopped, and its play button starts the song as before

### Requirement: In time with the song
While the song plays, the preview SHALL start at the song's next bar, play at the song's tempo, and keep its bars on the song's bars. Its progression SHALL be placed so that its chords match the song's when the selected section is the one that plays.

#### Scenario: Started in the middle of a bar
- **WHEN** the song plays at bar 12.4 and the user starts the preview
- **THEN** the preview's first note sounds at the start of bar 13, and its later bars start with the song's bars

#### Scenario: Tempo change in the song
- **WHEN** the preview plays with the song and the song changes tempo at a section
- **THEN** the preview changes tempo at the same bar

### Requirement: Alone when the song stops
While the song is stopped or paused, the preview SHALL play on its own at the selected section's tempo. When the song stops or pauses, the preview SHALL go on within one bar. When the song starts, the preview SHALL move onto the song's bars from the song's next bar.

#### Scenario: The song stops
- **WHEN** the preview plays with the song and the user presses stop in the player bar
- **THEN** the song stops, and the preview keeps looping at the section's tempo after a gap of at most one bar

#### Scenario: The song starts
- **WHEN** the preview plays alone and the user presses play in the player bar
- **THEN** the song starts as usual, and the preview lines up with the song's bars from the song's next bar

### Requirement: Level and output
The preview SHALL play at the level the track has in the song. It SHALL go through the same master output, limiter and global volume as the song. Its delay and reverb SHALL NOT change the delay and reverb of the song's instruments. It SHALL NOT light instruments in the visuals, and SHALL NOT go into WAV exports or recordings.

#### Scenario: Global volume
- **WHEN** the preview plays and the user lowers the volume in the player bar
- **THEN** the preview gets quieter with the song

#### Scenario: Echo kept apart
- **WHEN** the preview of a pattern with a long delay plays with the song
- **THEN** the song's instruments keep their own delay settings

#### Scenario: Export
- **WHEN** an export or a recording runs
- **THEN** the preview button is disabled, and a preview that plays stops before the export starts

### Requirement: One preview at a time
The app SHALL play at most one preview. Starting the preview on another track SHALL stop the first one. The preview SHALL stop when another song opens in Compose, when the user leaves Compose, or when the track or the pattern it plays is removed.

#### Scenario: Another track
- **WHEN** the bass preview plays and the user starts the preview of the arpeggio track
- **THEN** the bass preview stops and the arpeggio preview starts

#### Scenario: Leaving Compose
- **WHEN** the preview plays and the user opens the Radio tab
- **THEN** the preview stops

### Requirement: Two named pattern rows
The track panel SHALL show two pattern rows with their own labels. "Pattern del brano" / "Song patterns" SHALL hold the track's patterns and Delete. "Crea pattern" / "Make patterns" SHALL hold New, Save as pattern, Compose a part with its number, Energy, Keep rhythm and Keep notes.

#### Scenario: Italian labels
- **WHEN** the interface is in Italian and the user opens a track in Compose
- **THEN** the first row reads "Pattern del brano" with the pattern chips and Elimina, and the second reads "Crea pattern" with + Nuovo, Salva come pattern, Componi una parte and Energia

#### Scenario: English labels
- **WHEN** the interface is in English
- **THEN** the rows read "Song patterns" and "Make patterns"
