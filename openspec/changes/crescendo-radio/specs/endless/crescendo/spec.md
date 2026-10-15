## ADDED Requirements

### Requirement: Crescendo songs from the director
The director SHALL be able to make a song with the crescendo build style. It SHALL plan the song as today, then write its build as the Crescendo path from silence to the planned song.

#### Scenario: A crescendo song on air
- **WHEN** the radio plays a song the director made in crescendo
- **THEN** it starts from one sound and grows in small steps toward the planned song

### Requirement: Steering recomputes the path
A steering command or a curve change on a crescendo song SHALL change the destination, and the remaining path SHALL be recomputed from the state on air at the boundary where the command applies. Steps already played SHALL be kept.

#### Scenario: Energy up during the growth
- **WHEN** the listener raises the energy while a crescendo song is still growing
- **THEN** the following steps grow toward the new, fuller destination from the current code

#### Scenario: End command
- **WHEN** the listener asks to end a crescendo song
- **THEN** the remaining path leads to an ending, in small steps or blocks as the song's ending style allows

### Requirement: Artist build style
An artist SHALL have an optional `buildStyle` field with weights for `blocks` and `crescendo`; a song's build style SHALL be drawn from it. Without the field the artist SHALL build in blocks only. An artist MAY have a `crescendo` block (step spacing, first sound, break frequency, ending weights, dense narration) that shapes its crescendo songs.

#### Scenario: Mixed artist
- **WHEN** an artist with `{ "blocks": 3, "crescendo": 1 }` plays many songs
- **THEN** about one song in four is in crescendo

#### Scenario: Existing artists unchanged
- **WHEN** an artist without `buildStyle` plays
- **THEN** every song is built in blocks, exactly as before

### Requirement: Random artists and a crescendo artist
Random artists SHALL draw a build style and crescendo parameters. The built-in artists SHALL include one artist who builds in crescendo only.

#### Scenario: Built-in crescendo artist
- **WHEN** the radio plays the built-in crescendo artist
- **THEN** every song grows in crescendo

### Requirement: Radio display and Artists tab
The song card on air SHALL show a crescendo mark for crescendo songs. "New song from artist" SHALL propose the artist's most likely build style. The artist editor SHALL edit the build style weights, with a tooltip that explains them.

#### Scenario: Card mark
- **WHEN** a crescendo song is on air
- **THEN** its card shows the crescendo mark

### Requirement: Sessions stay repeatable
A session SHALL record each song's build style. Replaying a session SHALL give the same songs and the same paths. Recording and export of a session with crescendo songs SHALL work as for any session.

#### Scenario: Replay
- **WHEN** a session with crescendo songs is replayed from a playlist
- **THEN** every song builds with the same steps as when it was first played
