# endless/director Specification

## Purpose
The director writes endless music: a seeded session of songs in the existing song format, each carrying live build steps that make it evolve phrase by phrase.

## Requirements

### Requirement: Session of songs in the song format
The director SHALL produce a session: an ordered list of songs, each a valid v2 song with sections, tracks and `build` steps, plus session data (seed, selected styles, chaos, energy, complexity, and for each song its title, styles per part, length, tempo, key and energy shape). Every song SHALL pass the song validator without errors and play in Compose as a live build. In this phase songs follow each other with a plain end and start; crossfades and morphs come in a later phase.

#### Scenario: Songs are valid
- **WHEN** a ten-minute session is generated for any starting style
- **THEN** every song in it passes the song validator without errors

#### Scenario: Plays in Compose
- **WHEN** a generated song is opened in Compose and played
- **THEN** it builds itself with its steps, and no evaluation error occurs

### Requirement: Deterministic seed
The director SHALL be deterministic: the same seed, styles, chaos, energy, complexity and length SHALL produce an identical session. A session generated without a seed SHALL record the seed it used.

#### Scenario: Same seed, same music
- **WHEN** a session is generated twice with seed `aurora` and the same options
- **THEN** both sessions are identical

#### Scenario: Seed recorded
- **WHEN** a session is generated without a seed
- **THEN** the session data contains the seed that reproduces it

### Requirement: Song plan
For each song the director SHALL choose, within the recipes that provide each part: a length from 2 to 6 minutes, a tempo, a key, chord progressions per section, an energy shape among those the tempo style allows, and an initial set of tracks. Sections SHALL be whole multiples of the song's phrase length. Songs SHALL get a title of one or more words drawn from the styles' word lists, mixing English, Italian and Spanish.

#### Scenario: Length in range
- **WHEN** a session of several songs is generated
- **THEN** every song lasts between 2 and 6 minutes at its tempo, and lengths vary between songs

#### Scenario: Title present
- **WHEN** a song is generated
- **THEN** it has a non-empty title made of words from its styles' lists

### Requirement: Energy shapes and amounts
The director SHALL support seven energy shapes: build and drop, slow burn, waves, flat groove, verse and chorus, late peak, and descent. Each shape SHALL give a target energy from 0 to 1 for every phrase of the song. An energy amount from 0 to 1 SHALL raise or lower all targets, and a complexity amount from 0 to 1 SHALL raise or lower how many tracks play and how much the material is varied. Energy SHALL be measured from the song state: how many tracks play, how dense the drums are, how open the filters are, and how much drive is applied.

#### Scenario: Shape followed
- **WHEN** a song uses the build and drop shape
- **THEN** the measured energy of its phrases rises before the drop, is highest in the drop, and falls in the break

#### Scenario: Energy amount
- **WHEN** the same seed is generated with energy 0.2 and with energy 0.9
- **THEN** the average measured energy of the 0.9 session is higher

### Requirement: Moves on phrase boundaries
The director SHALL change songs only through live build steps placed on phrase boundaries; large events (drop, break, end of song) SHALL fall on boundaries of twice the phrase length. Moves SHALL include adding a track, removing a track, switching a track to another pattern, changing a setting such as filter or drive, adding or removing a rack device, and a break or drop that removes or brings back the drums. At most one move per track SHALL happen on the same boundary, and the same track SHALL NOT receive two moves on consecutive boundaries.

#### Scenario: Changes on the grid
- **WHEN** a song with an 8-bar phrase is generated
- **THEN** every build step falls on a bar that is a multiple of 8 from the song start, and drops and breaks on multiples of 16

#### Scenario: No back-to-back moves on one track
- **WHEN** any generated song is inspected
- **THEN** no track has build steps on two consecutive phrase boundaries

### Requirement: Hybrid material with controlled mutation
Tracks SHALL start from presets, grooves and chord progressions named by the recipes. The director SHALL derive variations from them by mutation (adding or removing drum hits, changing the order of chord tones for bass and arp, changing scale degrees of a hook) and the amount of mutation SHALL grow with complexity. Mutated material SHALL stay within the song's key and chords.

#### Scenario: Low complexity stays close
- **WHEN** a song is generated with complexity 0
- **THEN** its patterns are the recipe presets without mutation

#### Scenario: Mutations stay in key
- **WHEN** a song is generated with complexity 1
- **THEN** every bass and arp note is a chord tone and every hook note is a degree of the song's scale

### Requirement: Track count
The director SHALL normally keep 4 to 5 tracks playing (fewer, down to 2, when the recipe asks for sparse music such as ambient or lo-fi). It SHALL NOT exceed 8 tracks playing at once unless complexity is above 0.8.

#### Scenario: Soft limit
- **WHEN** a session is generated with complexity 0.5
- **THEN** no bar of any song has more than 8 tracks playing

### Requirement: Variety between songs
Consecutive songs SHALL NOT share the same key or the same energy shape, and a song SHALL NOT repeat the combination of styles per part of any of the three songs before it, unless the options leave no other choice.

#### Scenario: Different keys
- **WHEN** a session of several songs is generated with several keys allowed
- **THEN** no two consecutive songs have the same key

### Requirement: Spoken comments
Moves SHALL carry short comments chosen from a fixed pool per kind of move, in English and Italian, on about half of the moves and never on two boundaries less than 8 bars apart. Every song SHALL include a voice track with the voice settings of the style that provides the voice part.

#### Scenario: Comment spacing
- **WHEN** any generated song is inspected
- **THEN** no two of its comments are less than 8 bars apart

#### Scenario: Voice track present
- **WHEN** a song is generated
- **THEN** it has a track of type `voice`
