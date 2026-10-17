## ADDED Requirements

### Requirement: Endless procedural scrolling
The engine SHALL draw parallax layers whose objects come from a seed and the position on the road, in an endless sequence of zones drawn at random from a concept's list, never the same zone twice in a row.

#### Scenario: Same moment, same picture
- **WHEN** the same bar of a song is drawn twice (live and in a fast video)
- **THEN** the two frames are the same

#### Scenario: Endless road
- **WHEN** a song or a radio session goes on for an hour
- **THEN** the zones keep changing and the road never ends

### Requirement: Day and night
The engine SHALL move through a day and night cycle: sky colours, sun and moon, stars at night, lit windows and lamps.

#### Scenario: Night falls
- **WHEN** the cycle reaches the night
- **THEN** the sky darkens, stars appear and the windows light up

### Requirement: Caravan on the beat
In the Caravan concept the speakers SHALL pump with the kick and the bass, the dancer SHALL move on the beat, and the stars and the sun SHALL pulse in time.

#### Scenario: Kick
- **WHEN** the kick plays
- **THEN** the speaker cones push out and a ring of sound leaves them

### Requirement: Joining and leaving
At every city stop one member SHALL join the caravan and, when it is long enough, one SHALL leave.

#### Scenario: New city
- **WHEN** the caravan reaches a new city
- **THEN** someone waiting by the road joins the line behind the cart
