# Spec Delta

## Purpose

Let the listener keep the song on air going longer, a block at a time, while it keeps its planned ending and transition.

## ADDED Requirements

### Requirement: Extend command
The console SHALL have an Extend button in the Song group, right after "Stay here", with the shortcut `L`. Each press SHALL queue an `extend` command for the next double phrase. When it applies, the song SHALL get one more double phrase, inserted before its ending: before the closing run of outro parts, or before the last part when the song has no outro. When the ending has already started, the new double phrase SHALL go at the boundary where the command applies.

#### Scenario: One press
- **WHEN** the listener presses Extend during the second part of a song with an outro
- **THEN** the song is one double phrase longer, the new part plays right before the outro, and the outro and the transition follow it

### Requirement: A new stretch in the song's character
The added double phrase SHALL take the role of the last part before the ending, with an energy target near that part's (alternating a little lower and a little higher on repeated presses), and the director SHALL write it with its ordinary moves, so it is not a copy of an earlier part. The rest of the song after it SHALL be rewritten as for any other command, keeping everything before the boundary.

#### Scenario: Not a repeat
- **WHEN** a song is extended
- **THEN** the steps of the added part differ from the steps of the part before it, or the part has its own moves

### Requirement: Length on the button and total
The Extend button SHALL show how long one press adds at the song's tempo and meter, rounded to seconds ("+29 s"), and its tooltip SHALL say that each press adds a block of that length before the ending, that the ending and the transition still follow, and that it applies at the next double phrase. The bar line of the now playing card SHALL show the total time added to the song when it is more than zero ("+1:27").

#### Scenario: Label
- **WHEN** a song at 134 BPM in 4/4 with 8-bar phrases plays
- **THEN** the button reads "+29 s"

### Requirement: No limit, no auto-repeat
The listener SHALL be able to extend a song any number of times. Holding the `L` key SHALL queue one command, not one per key repeat.

#### Scenario: Several presses
- **WHEN** the listener presses Extend three times
- **THEN** the song is three double phrases longer

### Requirement: Song on air only, in the queue and in replay
Extensions SHALL change only the song on air; the following songs SHALL start later by the same amount. Each press SHALL appear in the queue and be cancellable. The session recipe SHALL record extensions, and Replay SHALL reproduce them.

#### Scenario: Replay
- **WHEN** a session where a song was extended twice is replayed
- **THEN** that song is extended twice at the same boundaries and has the same length
