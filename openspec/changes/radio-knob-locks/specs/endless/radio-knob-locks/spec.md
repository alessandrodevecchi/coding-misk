## Purpose

With the compilation on, the radio knobs show what plays and let the listener hold a value by hand, while the setup's ranges bind every song.

## ADDED Requirements

### Requirement: Knobs follow the song on air
With the compilation on, each knob SHALL show the value the song on air uses, SHALL change when the next song comes on air, and SHALL say that the value comes from the compilation.

#### Scenario: Next song
- **WHEN** the compilation is on and a new song comes on air
- **THEN** the knobs move to that song's values

### Requirement: Knobs held by hand
Moving a knob while the compilation is on SHALL hold its value for the next songs, which SHALL use it whatever the compilation draws, and SHALL show a lock on that knob. A click on the lock SHALL give the knob back to the compilation. The compilation SHALL stay on. Held values SHALL be part of the session recipe, so a replay plays the same songs.

#### Scenario: Hold energy
- **WHEN** the listener sets energy to 0.9 during a compilation
- **THEN** the next songs play with energy 0.9 and the energy knob shows a lock

#### Scenario: Give it back
- **WHEN** the listener clicks the lock
- **THEN** the next songs take energy from the compilation again

### Requirement: Ranges bind artists
When a compilation song is played by an artist, each of the artist's value ranges SHALL be brought inside the setup's range for that knob (a held knob uses its held value).

#### Scenario: Quiet setup
- **WHEN** the setup allows voice 0 to 0.3 and an artist's voice range is 0.6 to 0.9
- **THEN** that artist's song uses a voice value within 0 to 0.3
