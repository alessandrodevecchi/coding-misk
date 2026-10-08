# endless/radio-history Specification

## Purpose
The radio history keeps what was heard, so a song worth keeping can be saved, opened in Compose, or a whole session replayed from its recipe.

## Requirements

### Requirement: History of songs heard
The radio SHALL keep in the browser the last 50 songs that started on air, newest first, each with title, styles, time it started and the seed of its session. Older entries SHALL be dropped. The history SHALL survive a page reload.

#### Scenario: Song added
- **WHEN** a song starts on air
- **THEN** it appears at the top of the history

#### Scenario: Limit
- **WHEN** a 51st song starts on air
- **THEN** the oldest entry leaves the history

### Requirement: Save a song
"Save" SHALL store the song on air, from its first bar and with all its steps, as a normal song of the user's library; it SHALL open and play in Compose like any other song. Every song in the history SHALL also be savable.

#### Scenario: Save the song on air
- **WHEN** the user presses save while a song is on air
- **THEN** the song appears in the user's library with its title and plays from the start as a live build

### Requirement: Open in Compose
"Open in Compose" SHALL stop the radio and open the chosen song (the one on air or one from the history) in Compose, from its start.

#### Scenario: Open the song on air
- **WHEN** the user presses "open in Compose" during a song
- **THEN** the radio stops and Compose shows that song, ready to play

### Requirement: Session recipe
The radio SHALL keep the recipe of the current session (seed and options, including changes made during the session and the song they applied from). "Replay" SHALL start the session again from its first song with the same recipe.

#### Scenario: Replay
- **WHEN** the user replays a session in which energy was raised before the third song
- **THEN** the replayed session plays the same songs, and the third song is again made with the raised energy
