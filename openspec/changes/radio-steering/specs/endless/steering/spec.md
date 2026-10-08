# Spec Delta

## Purpose

Steering lets the listener change the song on air while the radio plays: commands, an editable energy curve and a mixer strip, recorded so a session can be replayed.

## ADDED Requirements

### Requirement: Console of commands
The Radio tab SHALL show, while the radio plays, a console with commands in groups: energy (up, down), arrangement (add or remove drums, bass, lead, pad or texture; more or less complex), sound (darker, brighter, dirtier, cleaner, more space, change instrument), harmony (change progression, change key), voice (talk more, talk less) and song (go to the drop, stay here, end the song). Every command SHALL have a keyboard shortcut shown in its tooltip. A command that cannot apply (for example remove bass when no bass plays) SHALL be disabled.

#### Scenario: Remove the bass
- **WHEN** the bass plays and the user presses "remove bass"
- **THEN** at the next phrase boundary the bass stops and the rest of the song is rewritten without it until a later move brings it back

#### Scenario: Disabled command
- **WHEN** no bass plays
- **THEN** "remove bass" is disabled

### Requirement: Timing and queue
A command SHALL apply at the next phrase boundary of the song on air. Mute, volume and filter changes from the mixer SHALL apply on the next bar. Commands waiting to apply SHALL be listed with the bar where they apply, and each SHALL be cancellable until then. Commands queued for the same boundary SHALL apply in the order they were given; a later command on the same track and kind SHALL replace an earlier one.

#### Scenario: Cancel
- **WHEN** the user queues "darker" and cancels it before its bar
- **THEN** nothing changes at that bar

### Requirement: Rewrite of the rest of the song
When a command or a curve edit applies, the director SHALL keep everything before the boundary and rewrite the song from the boundary on: moves, energy targets, and when needed sections (key, chords, length). The rewrite SHALL follow the same rules as a new song (moves on boundaries, track limits, comments spacing), SHALL be deterministic for the same seed and the same steering, and SHALL keep the planned transition to the next song unless the song's end moves.

#### Scenario: Energy up
- **WHEN** the user presses "energy up" during a calm part
- **THEN** the target energy of the remaining phrases rises and the measured energy of the next phrases is higher than before the command

#### Scenario: Go to the drop
- **WHEN** the user presses "go to the drop" during the build
- **THEN** the next phrase is a drop at the song's highest energy and the rest of the song follows from there

#### Scenario: End the song
- **WHEN** the user presses "end the song"
- **THEN** the song moves to its outro at the next boundary, lasts one or two more phrases, and the next song follows with its transition

### Requirement: Scope
A switch SHALL choose whether commands apply to "this song" or "the whole session". In session scope, energy and complexity commands SHALL also move the energy and complexity sliders by the same step, and voice commands the voice slider, so the following songs are made with the new values.

#### Scenario: Session scope
- **WHEN** the scope is "the whole session" and the user presses "energy up" twice
- **THEN** the song on air rises in energy and the energy slider is 0.2 higher for the next songs (0.1 per command)

### Requirement: Editable energy curve
The now playing card SHALL show the song's energy curve with a handle per double phrase still to come. Dragging a handle SHALL set the target energy of that part (from 0 to 1); on release the change SHALL be queued like a command for the next boundary. Parts already played or at the current phrase SHALL NOT be editable.

#### Scenario: Drag the curve
- **WHEN** the user drags the handle of the last double phrase down to 0.2
- **THEN** the curve shows the new value and, when that part plays, it has fewer tracks than before the edit

### Requirement: Mixer strip
The Radio tab SHALL show one row per track playing in the song on air, with volume, mute, lock and change instrument. Volume and mute SHALL apply on the next bar. A locked track SHALL NOT be added, removed or changed by the director for the rest of the song. A value changed by hand SHALL stay fixed for the rest of the song.

#### Scenario: Lock a track
- **WHEN** the user locks the pad
- **THEN** no later move of the director touches the pad in this song

### Requirement: Steering in the code
The code of the song on air SHALL show steering changes like the director's own moves, with a comment that says they came from the listener.

#### Scenario: Listener's move in the code
- **WHEN** a "darker" command applies
- **THEN** the step in the code carries a comment marking it as the listener's
