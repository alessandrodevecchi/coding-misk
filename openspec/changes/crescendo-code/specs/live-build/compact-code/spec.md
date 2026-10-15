## ADDED Requirements

### Requirement: One line per track
For Crescendo songs the code SHALL write each track once. Differences between sections (pattern, gain, settings) SHALL be expressed inside that track's code, so a step that changes one thing edits one line.

#### Scenario: A step edits one line
- **WHEN** a Crescendo step adds a device to a track that plays in three sections
- **THEN** one line of the code changes

### Requirement: Muted tracks visible
A muted track of a Crescendo song SHALL stay in the code marked as muted (`_$:`), and bringing it back SHALL remove the mark.

#### Scenario: Kick out and back
- **WHEN** a Crescendo step mutes the drums and a later step brings them back
- **THEN** the drums line gains the mute mark, then loses it

### Requirement: Same sound as the standard code
For any song state, the compact code SHALL produce the same events (sounds, notes, timing, levels) as the standard code.

#### Scenario: Equivalence check
- **WHEN** the check compiles built-in songs and Crescendo states both ways and renders them
- **THEN** onsets and levels per instrument match within the check's tolerance

### Requirement: Scope and setting
Only Crescendo songs SHALL use the compact code by default; every other song SHALL keep the standard code. A setting SHALL let Crescendo use the code per section instead.

#### Scenario: Blocks songs unchanged
- **WHEN** a song plays with the blocks build style
- **THEN** its code is exactly the standard code
