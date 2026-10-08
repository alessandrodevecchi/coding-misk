# Spec Delta

## MODIFIED Requirements

### Requirement: Continuous stream
The radio SHALL play songs one after another with no silence and no restart, except the silence an interlude is made of. The next song SHALL start either on the bar right after the last bar of the song on air or, with a mix, morph or echo out, during the last bars of the song on air, as the transition planned by the director says. The radio SHALL keep playing until the user stops it.

#### Scenario: Seamless change
- **WHEN** the song on air reaches the end of its transition
- **THEN** the next song plays as written, with no gap longer than one beat

#### Scenario: Overlapping change
- **WHEN** the transition to the next song is a mix of 8 bars
- **THEN** the next song's drums are heard during the last 8 bars of the song on air, and the radio shows the next song as on air from the end of the mix

#### Scenario: Long session
- **WHEN** the radio plays for an hour
- **THEN** songs keep following each other and no evaluation error occurs
