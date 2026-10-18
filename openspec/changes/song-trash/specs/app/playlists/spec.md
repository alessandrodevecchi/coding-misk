## ADDED Requirements

### Requirement: Deleted songs leave playlists
Moving a song to the trash SHALL remove it from every playlist, favourites included. Restoring the song SHALL NOT put it back in any playlist. A playlist that is playing SHALL skip the deleted song.

#### Scenario: Delete a song in two playlists
- **WHEN** a song in favourites and in one playlist is deleted
- **THEN** neither list holds it any more, and their song counts drop by one

#### Scenario: Restore
- **WHEN** that song is restored from the trash
- **THEN** it is in the song list and in no playlist
