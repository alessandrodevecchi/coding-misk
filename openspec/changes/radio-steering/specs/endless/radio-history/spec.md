# Spec Delta

## MODIFIED Requirements

### Requirement: Session recipe
The radio SHALL keep the recipe of the current session (seed and options, including changes made during the session and the song they applied from, and every steering command, curve edit and mixer change with its song and bar). "Replay" SHALL start the session again from its first song with the same recipe and apply the same steering at the same bars.

#### Scenario: Replay
- **WHEN** the user replays a session in which energy was raised before the third song
- **THEN** the replayed session plays the same songs, and the third song is again made with the raised energy

#### Scenario: Replay with steering
- **WHEN** the user replays a session in which the bass was removed at bar 64 of the second song
- **THEN** the replayed second song loses its bass at bar 64 again
