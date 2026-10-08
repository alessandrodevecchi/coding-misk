# endless/radio-playback Specification

## Purpose
Radio playback turns a session of the endless director into one continuous stream in the browser, song after song, with the live build, the voice and the visuals of a normal song.

## Requirements

### Requirement: Continuous stream
The radio SHALL play songs one after another with no silence and no restart: the next song SHALL start on the bar right after the last bar of the song on air, at its own tempo. The radio SHALL keep playing until the user stops it. In this phase songs change with a plain end and start; crossfades and morphs come later (#23).

#### Scenario: Seamless change
- **WHEN** the song on air reaches its last bar
- **THEN** the first bar of the next song plays right after it, with no gap longer than one beat

#### Scenario: Long session
- **WHEN** the radio plays for an hour
- **THEN** songs keep following each other and no evaluation error occurs

### Requirement: Songs generated ahead
The radio SHALL generate the next song while the current one plays, with the director and the options selected at that moment, so the change of song never waits for generation. Generation SHALL NOT interrupt the sound.

#### Scenario: Next song ready
- **WHEN** a song starts on air
- **THEN** the next song is generated before the current one has played half of its length

### Requirement: Same behaviour as a song in Compose
Each song on air SHALL play as its live build plays in Compose: steps typed and evaluated on their bar, spoken comments on their step with the song's voice track, tempo per section, visuals per instrument. The radio and Compose SHALL NOT play at the same time: starting one stops the other.

#### Scenario: Comments speak
- **WHEN** a step with a comment plays in the radio
- **THEN** the comment is spoken on that bar and shown over the stage

#### Scenario: One player
- **WHEN** the radio is on and the user plays a song in Compose
- **THEN** the radio stops and Compose plays

### Requirement: Deterministic stream
Given the same seed and the same options, the radio SHALL play the same songs in the same order as the command line generates them. Skipping a song SHALL NOT change the songs that follow it.

#### Scenario: Same as the command line
- **WHEN** the radio starts with seed `aurora`, style berlin-techno and default options
- **THEN** its first songs have the same titles and steps as `npm run endless -- --styles berlin-techno --seed aurora`
