# Spec Delta

## Purpose

Several editable curves for the song on air in the radio (density, brightness, tension, voice), next to the energy curve, so the listener can shape a part of the song along one dimension without moving the others.

## ADDED Requirements

### Requirement: Curve lanes
The now playing card SHALL show, under the energy curve, four lanes in this order: density, brightness, tension, voice. Each lane SHALL have one point per double phrase, share the time axis and the position line of the energy curve, and show its name and the value of the part playing. The density lane SHALL show its value as a count of tracks ("3 of 6"); the others SHALL show it from 0 to 100. The lanes SHALL fit the card at phone width without horizontal scroll.

#### Scenario: Lanes on air
- **WHEN** a song plays in the radio
- **THEN** the card shows the energy curve and, under it, the four lanes with the position line at the same place in each

### Requirement: Measured curves
Each curve SHALL have a measure of what the song plays at each double phrase:
- **density:** the number of tracks playing, voice and riser excluded, out of the most the song can play (its candidate tracks, at most its track maximum);
- **brightness:** the mean filter cutoff of the melodic tracks playing, on a log scale from closed to open;
- **tension:** drive and distortion of the tracks playing, the riser playing, and the strong chord progression in use;
- **voice:** how often the voice may speak in that part (the talk option, or the set value).
The measure SHALL be deterministic for the same song.

#### Scenario: Density follows the tracks
- **WHEN** a double phrase has four tracks playing out of a maximum of six
- **THEN** the density lane shows "4 of 6" for that part

### Requirement: Auto and set values
A part of a curve the listener has not set SHALL be automatic: it shows the measured value with a dashed line, and the director does not aim at it. Dragging a handle of a part still to come SHALL set a target for that part, drawn as a solid point. Parts already played or at the current phrase SHALL NOT be editable. Each lane SHALL have a reset button that makes the parts still to come automatic again; the button SHALL be disabled when no part to come is set.

#### Scenario: Set one part
- **WHEN** the listener drags the brightness handle of a part to come down to 20
- **THEN** that point turns solid at 20, the other points of the lane stay dashed, and the edit is queued for the next boundary

#### Scenario: Reset a lane
- **WHEN** the listener presses the reset button of a lane with set parts to come
- **THEN** the reset is queued, and once it applies the lane is dashed again from the boundary on

### Requirement: The director follows set targets
When a curve edit or reset applies, the director SHALL rewrite the song from the boundary on, as for the energy curve: everything before the boundary stays, and the rewrite is deterministic for the same seed and steering. While writing a part with set targets, the director SHALL prefer moves that bring each set curve near its target, and MAY take one more move in a phrase when a set target is far. Energy SHALL stay the main target. The rewrite SHALL respect the track limits, the mixer locks and the volumes set by hand.

#### Scenario: Sparser at the same energy
- **WHEN** the listener sets density to 2 tracks for a part to come and leaves energy as it is
- **THEN** that part plays with fewer tracks than before the edit and the director reaches the energy with filter, drive or pattern moves

#### Scenario: Locks hold
- **WHEN** the density target asks for fewer tracks and a playing track is locked in the mixer
- **THEN** the director removes other tracks and leaves the locked one playing

### Requirement: Tension and the charge before a drop
A high tension in parts other than drops SHALL raise drive and distortion, and MAY use the strong chord progression for that part. When the part right before a drop has tension of 70 or more, the director SHALL build a charge in it: the riser for the whole part, the filters closing, more drive, and fewer drums near its end. The drop SHALL release the charge: drums back, filters open. A low tension SHALL clean the sound and keep the normal progression.

#### Scenario: Charged build-up
- **WHEN** the listener sets tension to 90 on the part before a drop
- **THEN** that part plays the riser from its first boundary and gets darker and dirtier, and the drop brings the drums back with the filters open

### Requirement: Voice frequency per part
The voice lane SHALL set how often the voice speaks in a part, from 0 (silent) to 100 (on almost every boundary with a move). A part at 0 SHALL have no comments, including the song's start and end when they fall in it. Comments SHALL keep their minimum spacing.

#### Scenario: Silent part
- **WHEN** the listener sets the voice to 0 for a part to come
- **THEN** the voice says nothing in that part

### Requirement: Song on air only
Curve edits and resets SHALL change only the song on air. They SHALL NOT change the session options or the songs after it, whatever the scope switch says.

#### Scenario: Next song untouched
- **WHEN** the scope switch is on "the whole session" and the listener sets the density of a part
- **THEN** the next song is planned with the session options as before the edit

### Requirement: Curve edits in the queue and in replay
Curve edits and resets SHALL appear in the queue of commands with the curve, the part and the value, and SHALL be cancellable like the other commands. A later edit of the same part of the same curve SHALL replace a pending one. The session recipe SHALL record them, and Replay SHALL reproduce them.

#### Scenario: Replay with curve edits
- **WHEN** a session with a tension edit is replayed
- **THEN** the same song is rewritten at the same boundary with the same moves
