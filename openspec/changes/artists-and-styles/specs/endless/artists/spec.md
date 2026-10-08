# Spec Delta

## Purpose

Artists give the endless director a personality: a profile people can recognise and a taste that shapes every song, with variety from song to song.

## ADDED Requirements

### Requirement: Artist profile
An artist SHALL have a unique id, a stage name, a pixel-art portrait (made from a seed and a palette, so it needs no image file), a short bio in English and Italian, and an optional "inspired by" line. The profile SHALL be shown as a character sheet.

#### Scenario: Profile shown
- **WHEN** the user opens an artist
- **THEN** the sheet shows the portrait, the stage name, the bio, "inspired by" and the artist's taste

### Requirement: Taste with variety
An artist SHALL describe a taste, not fixed settings: favourite styles with weights, plus a chance to use any other style; a range for chaos, energy, complexity and voice amount; weights for energy shapes; a pace of change; weights for kinds of move; voice characters it likes. For each song the director SHALL draw that song's styles and values from the artist's taste, so songs by the same artist differ while keeping a recognisable character.

#### Scenario: Same artist, different songs
- **WHEN** a session of ten songs is generated with one artist
- **THEN** the songs do not all share the same values of chaos, energy, complexity and voice amount, and most of them use the artist's favourite styles

#### Scenario: Other styles sometimes
- **WHEN** an artist gives other styles a small chance and a long session is generated
- **THEN** at least one song uses a style outside the favourites

### Requirement: Quirks
An artist SHALL be able to have quirks from a fixed list, each with a chance per song: `two-drops` (a second drop late in build and drop songs), `long-breaks` (breaks of two double phrases), `no-guitars`, `texture-first` (texture among the first tracks), `hard-endings` (everything stops at the last boundary), `talks-a-lot` (comments on most changes), `slow-builds` (one track at a time in the first half). The report SHALL say which quirks a song used.

#### Scenario: No guitars
- **WHEN** an artist has `no-guitars` with chance 1
- **THEN** none of its songs has a guitar track

### Requirement: Built-in artists
The repository SHALL ship six artists: a dark techno night owl, a hype drop maker, a dreamer (ambient and dreamy cyberpunk), a jukebox (every style, high chaos), a purist (one style, low chaos, flat groove) and one inspired by Avicii (melodic progressive house, uplifting). Each SHALL be valid and generate valid songs.

#### Scenario: All valid
- **WHEN** the artist check runs
- **THEN** the six artists are valid and a session of each passes the song validator

### Requirement: Deterministic with an artist
With the same seed, artist and options, the director SHALL produce the same session; the session data SHALL record the artist (its id and its full taste at that moment), so it can be replayed even if the artist is later edited.

#### Scenario: Replay after editing the artist
- **WHEN** a session is replayed from its recipe after the artist was edited
- **THEN** it plays the same songs as before

### Requirement: Format versions
Artist and style files SHALL carry a format version. Fields added by later versions SHALL take defaults when missing, and unknown fields SHALL be reported as warnings, so older files keep working.

#### Scenario: Older artist
- **WHEN** an artist written before a new taste field existed is loaded
- **THEN** it is valid and the new field takes its default
