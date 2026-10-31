## ADDED Requirements

### Requirement: Effect gestures

The director SHALL be able to place effect gestures on the tracks of a generated song: a folded phrase, a Fold rise into a drop, a ringing held note, metal hits in a break, and an FM rise with fold before a drop. A gesture SHALL start and end on phrase boundaries, like the director's other moves, and SHALL be written in the song as rack steps, so the code shows it and steering can rewrite it.

#### Scenario: Fold rise into a drop

- **WHEN** a generated song has a drop and draws the Fold rise gesture on its bass
- **THEN** in the phrase before the drop the bass's Fold amount goes up bar by bar, and at the drop the Fold is gone

#### Scenario: Ringing held note

- **WHEN** a generated song draws the ringing held note gesture on its pad
- **THEN** the pad has Ring for that section at a frequency tied to the song's key, and the Ring is gone at the next section

### Requirement: Gesture ranges

Each gesture SHALL draw its values inside ranges set per track type, inside the devices' own limits: Fold amount and curve, Ring frequency and amount, the FM rise's top index. Fold SHALL keep the level rule of `fm-like-effects` at every step of a rise. Ring SHALL never make a track louder.

#### Scenario: Levels kept

- **WHEN** the arrangement level check plays 20 generated songs with gestures
- **THEN** no song's output reaches full scale and no track with a gesture is louder than without it by more than 0.02 of peak

### Requirement: Gesture rate per style

A style recipe MAY say how many songs get gestures and which gestures it prefers. A style without that field SHALL use the default of its genre family. A song SHALL have at most two gestures, and the gestures SHALL be drawn from a random stream of their own, so songs without gestures stay the same.

#### Scenario: Style preference

- **WHEN** 200 songs of a style whose recipe prefers metal hits are generated
- **THEN** metal hits is the most frequent gesture among them, and no song has more than two gestures

#### Scenario: Acoustic style

- **WHEN** 200 songs of a style of the acoustic family are generated with its default
- **THEN** at most one song in ten has a gesture

### Requirement: Gesture safety rules

The director SHALL NOT put Fold on a track that has Distortion, or Distortion on a track while it has Fold. It SHALL NOT put Ring on more than two tracks at once, nor on the busiest drum line of a song (the line with the most notes per bar). It SHALL NOT place a gesture on a locked track or on a track the listener added.

#### Scenario: Distortion already there

- **WHEN** a bass track has Distortion and the director draws a folded phrase
- **THEN** the gesture goes to another track, or is not placed

#### Scenario: Real time

- **WHEN** the real-time cost check plays 30 seconds of a dense style's generated song with its gestures
- **THEN** there are no more audio underruns than with the same song without gestures

### Requirement: Music unchanged without gestures

Turning gestures off (a director option used by the checks) SHALL give the same songs as `DIRECTOR_VERSION` 14 for every seed fixture. The version SHALL be 15 with gestures on, and the seed fixtures SHALL be rewritten in the same commit.

#### Scenario: Fixtures without gestures

- **WHEN** the endless check runs with gestures off
- **THEN** every seed fixture matches the fixtures of version 14
