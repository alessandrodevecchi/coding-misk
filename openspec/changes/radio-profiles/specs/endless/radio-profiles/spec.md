## ADDED Requirements

### Requirement: Artist profiles
An artist SHALL be able to give weights to the profiles (Classic, Crescendo, Switch) and the details of its growth. Artists without them SHALL stay Classic and sound as before. Random artists SHALL draw profiles. A built-in artist SHALL be made for Switch. A radio setting SHALL let the listener force a profile.

#### Scenario: Existing artist
- **WHEN** a session plays an artist made before this change
- **THEN** its songs build in blocks as before

#### Scenario: Switch artist
- **WHEN** the Switch artist is on air
- **THEN** its songs grow with the natural growth

### Requirement: Growths in the radio
The radio SHALL play songs with any growth (small steps, gradual, natural), with the growth duration fitted to the song's planned length by default.

#### Scenario: Fitted growth
- **WHEN** a Switch song is planned for four minutes
- **THEN** its growth and the song fit in about four minutes

### Requirement: Steering and curves as waypoints
For songs with a growth, a steering command or a curve point SHALL become the next waypoint, reached with small moves from the code on air. "End" SHALL lead to the song's ending as a last waypoint.

#### Scenario: More energy
- **WHEN** the listener asks for more energy during a Switch song
- **THEN** the next steps move toward a fuller waypoint, a few characters at a time

### Requirement: Chooser
The next move in the radio SHALL be picked by a chooser made of the director and the listener's commands; the interface SHALL allow a decision model to replace it.

#### Scenario: Same session
- **WHEN** a session is replayed with the same seed and commands
- **THEN** the moves are identical

### Requirement: Incoming song hidden like a DJ
During a transition the code SHALL show only the song on air; the incoming song SHALL play from code evaluated but not shown, and appear whole when it goes on air. An option SHALL show both as today; it SHALL be visible by default for Classic and hidden for the other profiles.

#### Scenario: Transition to a Switch song
- **WHEN** a Switch song fades in under the song on air
- **THEN** the code shows only the song on air until the new song goes on air

### Requirement: Mixer per song
With technical functions at the mixer, the song on air SHALL use the hidden mixer and the incoming song SHALL carry its levels in full on separate buses, so that both sound as written.

#### Scenario: Two songs on the same instrument
- **WHEN** both songs have a bass during a transition
- **THEN** each bass keeps its own level

### Requirement: Code on air
Code views, comments, technical functions, typing and lit notes SHALL work on the song on air; the voice code SHALL be hidden for Switch songs.

#### Scenario: Switch song on air
- **WHEN** a Switch song is on air
- **THEN** its code shows the mixer form, essential comments and no voice code

### Requirement: Sessions, compilations and export
Sessions SHALL record profiles, waypoints and commands and replay identically. Compilations SHALL play saved songs with their own profile. Recording, audio and video export of sessions SHALL work.

#### Scenario: One-hour export
- **WHEN** a one-hour session with Switch songs is exported fast
- **THEN** the export completes and sounds like the session
