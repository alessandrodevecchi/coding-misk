# Spec Delta

## Purpose

Playlists let the user group songs, keep them in an order and listen to them one after another, with shuffle and repeat.

## ADDED Requirements

### Requirement: Playlists and favourites
The app SHALL keep playlists of songs in the browser. Each playlist SHALL have a name and an ordered list of song ids; a song MAY appear in several playlists, but only once in each. Favourites SHALL be a playlist that always exists, comes first, and cannot be renamed or deleted; the star on a song card SHALL add or remove the song from it. Favourites saved before playlists existed SHALL be kept.

#### Scenario: Star adds to Favourites
- **WHEN** the user stars Kellerlicht
- **THEN** Kellerlicht is the last song of the Favourites playlist

#### Scenario: Favourites cannot be deleted
- **WHEN** the user opens Favourites in the Playlists tab
- **THEN** there is no delete or rename action for it

#### Scenario: Old favourites migrated
- **WHEN** a browser has favourites from the Songs tab and the new version loads
- **THEN** the Favourites playlist holds the same songs

### Requirement: Manage playlists
The Playlists tab SHALL list every playlist with its number of songs and length, and SHALL let the user create a playlist, rename and delete their playlists, reorder songs by dragging or with up and down buttons, remove a song, and start playback from any song. Deleting a playlist SHALL ask for confirmation in the page.

#### Scenario: Reorder with buttons
- **WHEN** the user moves the third song of a playlist up
- **THEN** it becomes the second song and the order is kept after a reload

#### Scenario: Delete a playlist
- **WHEN** the user deletes a playlist and confirms
- **THEN** the playlist disappears and its songs stay in the library

### Requirement: Add from a song card
Every song card SHALL have a "+ Playlist" action that adds the song to a chosen playlist or to a new playlist named by the user. Adding a song already in the playlist SHALL leave the playlist unchanged and say so.

#### Scenario: Add to a new playlist
- **WHEN** the user picks "+ Playlist", then "New playlist" and types "Night run"
- **THEN** a playlist "Night run" exists with that song

### Requirement: Playlist row in the Songs tab
The Songs tab SHALL show a row with All songs, Favourites and the user's playlists. Picking a playlist SHALL show only its songs, in the playlist's order, with a "Play playlist" action; search and filters SHALL still apply on top. The choice SHALL be remembered with the rest of the view.

#### Scenario: Pick a playlist
- **WHEN** the user picks "Night run" in the Songs tab
- **THEN** only its songs are shown, in its order

### Requirement: Continuous playback
Playing a playlist SHALL play its songs one after another: at the end of a song the next one SHALL start by itself. Songs that no longer exist SHALL be skipped. Previous and next in the player bar SHALL follow the playlist while it plays, and the player bar SHALL show the playlist name and the position (for example 3 / 12). Playback SHALL stop after the last song unless repeat is on.

#### Scenario: Next song starts by itself
- **WHEN** the first song of a three-song playlist reaches its end
- **THEN** the second song starts from bar 1 and the player bar shows 2 / 3

#### Scenario: Missing song skipped
- **WHEN** a playlist lists a song the user has deleted
- **THEN** playback goes from the song before it to the song after it

### Requirement: Shuffle and repeat
The player bar SHALL have a shuffle switch and a repeat button that cycles off, repeat all, repeat one. Shuffle SHALL play every song of the playlist once in a random order before any song plays again; turning it off SHALL continue in the playlist order from the current song. Repeat all SHALL start the playlist again after the last song (a new order when shuffle is on). Repeat one SHALL replay the current song from bar 1, also for a song played on its own. Shuffle and repeat SHALL be remembered. Neither SHALL apply to the radio.

#### Scenario: Shuffle plays each song once
- **WHEN** shuffle is on and a five-song playlist plays to the end with repeat off
- **THEN** each of the five songs played exactly once

#### Scenario: Repeat one on a single song
- **WHEN** repeat is set to one and a song started from its card ends
- **THEN** the same song starts again from bar 1

### Requirement: Export and import playlists
A playlist SHALL be exportable as a JSON file with its name, the song ids in order, and a copy of every user song it lists. Importing SHALL add the playlist (with a free name if the name is taken) and the user songs that are not already in the library; built-in songs SHALL be referenced by id only.

#### Scenario: Move a playlist to another browser
- **WHEN** the user exports a playlist with one of their own songs and imports the file in another browser
- **THEN** the playlist and that song appear there and the playlist plays
