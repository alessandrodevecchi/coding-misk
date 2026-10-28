# Spec Delta

## ADDED Requirements

### Requirement: Bar counter
The player bar SHALL show the current bar and the total bars of what plays, on the right of its title line, as `bar <n> / <total>`, with the word "bar" in every language. The bar SHALL count from 1. The time in seconds SHALL stay. The counter SHALL follow the timeline while the user drags it.

#### Scenario: A song in Compose
- **WHEN** a Classic song of 64 bars plays its bar 10 in Compose
- **THEN** the player bar shows `bar 10 / 64` next to the time, in Italian and in English alike

#### Scenario: Dragging the timeline
- **WHEN** the user drags the timeline to the middle of a 64-bar song
- **THEN** the counter shows `bar 33 / 64` while dragging

### Requirement: Bars of the grown song
In the Live coder and Crescendo profiles, the counter SHALL count the song as it plays: the growth first, then the written part. The total SHALL be the grown length. While the growth is still being prepared, the counter SHALL show the written song and switch to the grown song when it is ready.

#### Scenario: Live coder
- **WHEN** a song with a growth of 64 bars and a written part of 116 bars plays in Live coder, 37 bars into the written part
- **THEN** the counter shows `bar 101 / 180`

#### Scenario: Growth not ready
- **WHEN** the song in Compose is still growing and nothing plays
- **THEN** the counter shows the cue bar and the written total, and shows the grown total once the growth mark goes away

### Requirement: Bar counter in the other players
The counter SHALL show the bars of the song on air in the radio, replacing the radio's "battuta n di total" / "bar n of total" text. In a mix it SHALL show the bars of the song heard. For the Patterns tab loop it SHALL show the bar inside the loop. When nothing is loaded, it SHALL be empty.

#### Scenario: Radio
- **WHEN** the radio plays the 20th bar of a 96-bar song on air
- **THEN** the counter shows `bar 20 / 96`

#### Scenario: Patterns loop
- **WHEN** the Patterns tab plays a pattern's 4-bar loop at its third bar
- **THEN** the counter shows `bar 3 / 4`

#### Scenario: Pattern preview
- **WHEN** only the pattern preview of Compose plays
- **THEN** the counter shows the cue bar of the song in Compose, not the preview's bars
