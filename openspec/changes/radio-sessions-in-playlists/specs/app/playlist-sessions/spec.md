# Spec Delta

## Purpose

Keep a radio session the listener liked in a playlist, played as heard, next to saved songs.

## ADDED Requirements

### Requirement: Session items
A playlist SHALL hold radio sessions next to songs. A session item SHALL store the session recipe (seed, options and their changes, steering, song 0 when there is one), the number of songs heard, a title (the first song's title and the count), the date and the director version. The Playlists tab SHALL show a session item with a radio mark, its title and its length in songs; it SHALL be reorderable and removable like a song.

#### Scenario: Session in a list
- **WHEN** a playlist holds a session of 3 songs
- **THEN** the Playlists tab shows it with the radio mark, "3 songs" and the first song's title

### Requirement: Adding a session
The Radio tab SHALL offer "+ Playlist" for the session on air (saving the songs heard so far, the one on air included) and for each session in the History. The menu SHALL list the playlists and "New playlist", like the song menu.

#### Scenario: Add the session on air
- **WHEN** the listener is on song 4 of a session and adds it to a playlist
- **THEN** the playlist gets a session item of 4 songs

### Requirement: Playing a session
When the queue reaches a session item, the radio engine SHALL replay that session for its number of songs, with its steering, in the background of the current tab, showing the songs in the player bar; then the queue SHALL move to the next item. Shuffle SHALL move session items as whole items; repeat one SHALL replay the whole session.

#### Scenario: Move on after the session
- **WHEN** a playlist plays a song, then a session of 2 songs, then a song
- **THEN** the session's two songs play in order and the last song follows

### Requirement: Director version and Freeze
Each session item SHALL record the director version it was made with. When the app's director version is newer, the item SHALL show "may sound different". A "Freeze" action SHALL store the session's songs, as played, in the item; a frozen item SHALL play those songs, never regenerate them, and SHALL show no warning.

#### Scenario: Frozen session
- **WHEN** a frozen session item plays after a director update
- **THEN** it plays the stored songs, the same as before the update

### Requirement: Mix with sessions
With Mix on, a session item SHALL join the item before and after it with a transition, as saved songs do.

#### Scenario: Mix into a session
- **WHEN** Mix is on and a saved song is followed by a session
- **THEN** the session's first song comes in with a transition

### Requirement: Export and import
Exporting a playlist SHALL include its session items (frozen songs included); importing SHALL bring them back.

#### Scenario: Round trip
- **WHEN** a playlist with a session is exported and imported in another browser
- **THEN** the session item is there and plays the same songs
