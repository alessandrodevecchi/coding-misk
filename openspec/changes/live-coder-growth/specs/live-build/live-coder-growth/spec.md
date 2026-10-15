## ADDED Requirements

### Requirement: Growth names
The growth control SHALL offer small steps, gradual (today's natural growth, unchanged) and natural (like a live coder). A value saved as natural before this change SHALL be read as gradual.

#### Scenario: Old setting
- **WHEN** the user had picked natural before this change
- **THEN** the growth shows gradual and sounds the same

### Requirement: Waypoints
The natural growth SHALL draw a few waypoints at the start, small states of the song, each simple and playable, the last being the song. The build SHALL move from one waypoint to the next with small moves.

#### Scenario: First waypoint
- **WHEN** a natural growth starts
- **THEN** the first waypoint has one or two tracks with one note or a few hits each

### Requirement: Small moves
Each step SHALL be one small move: add a sound, add a function, change a number, grow or rewrite the notes, clone a block, mute or unmute, comment a function out or back in.

#### Scenario: Notes grow
- **WHEN** the notes of a track change between two waypoints
- **THEN** they change over several steps of a few characters each

### Requirement: Detours
The number of detours (a waypoint that removes or rewrites something an earlier one added) SHALL be drawn per song: none in about one song in five, one in about half, two in about one in four, three rarely. Styles and artists MAY shift these chances.

#### Scenario: A straight song
- **WHEN** a song draws no detour
- **THEN** its waypoints only add and grow, straight to the end

#### Scenario: Gate out and back
- **WHEN** a gate appears in an early waypoint
- **THEN** it may be commented out in a later one and come back before the end

### Requirement: Clones
A new track MAY be born as a copy of a playing track's block; when it is, the copy SHALL appear at once like a paste and then change in one or two places.

#### Scenario: Lead from the bass
- **WHEN** the lead is a clone of the bass
- **THEN** the bass block appears copied and its octave and bus change

### Requirement: Chooser
The order of the moves SHALL come from a chooser separate from the moves, seeded, so the same song builds the same way; the chooser SHALL be replaceable by the radio's director or a decision model.

#### Scenario: Same seed
- **WHEN** a song grows twice with the same seed
- **THEN** the steps are identical

### Requirement: Growth duration
The growth duration SHALL be free (as long as the moves need) or fitted (within the written length). Switch SHALL use free; Crescendo SHALL use fitted.

#### Scenario: Complex song
- **WHEN** a complex song grows with free duration
- **THEN** its growth is longer than a simple song's

### Requirement: Normal version from waypoints
A song made with the natural growth SHALL be playable without a live build, with one section per waypoint.

#### Scenario: Live build off
- **WHEN** the user turns the live build off for such a song
- **THEN** it plays its waypoints as sections
