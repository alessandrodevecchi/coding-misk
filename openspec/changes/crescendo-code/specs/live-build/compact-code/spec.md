## ADDED Requirements

### Requirement: Joined lines per track
For Crescendo songs the code SHALL join, inside each track, the lines that are identical apart from the bars they play in, under one lane that is the union of theirs, as long as those lanes never sound on the same bar. A second view, one line per track, SHALL also join lines that differ only in values: a number that changes between sections SHALL become a sequence over the bars, and a string SHALL be picked by bar from the list of its values.

#### Scenario: Repeated sections share a line
- **WHEN** a track plays the same code in two sections
- **THEN** the compact code has one line for both, with a comment listing both runs of bars

### Requirement: Muted tracks visible
A muted track of a Crescendo song SHALL stay in the code marked as muted (`_$:`), and bringing it back SHALL remove the mark.

#### Scenario: Kick out and back
- **WHEN** a Crescendo step mutes the drums and a later step brings them back
- **THEN** the drums line gains the mute mark, then loses it

### Requirement: Same sound as the standard code
For any song state, the compact code SHALL produce the same events (sounds, notes, timing, levels) as the standard code.

#### Scenario: Equivalence check
- **WHEN** the check compiles Crescendo states of the built-in songs both ways
- **THEN** both have the same layers (code without its lane) and, per layer, the same lane values on every bar, and Strudel makes the same events (onset and values) from the standard code, the joined lines and one line per track

### Requirement: Code views
A setting SHALL choose how a Crescendo song's code looks: compact (joined lines), one line per track, or per section. The three views SHALL sound the same. They stay separate views until the owner has tested them.

#### Scenario: One line per track
- **WHEN** the view is one line per track and a track plays different chords in two sections
- **THEN** the track has one line whose notes are picked by bar, and its events are the same as with the code per section

### Requirement: Scope and setting
Only Crescendo songs SHALL use the compact code by default; every other song SHALL keep the standard code. A setting SHALL let Crescendo use the code per section instead.

#### Scenario: Blocks songs unchanged
- **WHEN** a song plays with the blocks build style
- **THEN** its code is exactly the standard code
