## ADDED Requirements

### Requirement: Crescendo build style
The live build in Compose SHALL offer two build styles, "in blocks" (default) and "crescendo", remembered between sessions. With "crescendo" a song SHALL grow from a single sound to the song as written in small steps, ignoring the song's own `build` steps. The control SHALL carry a tooltip that explains the build style.

#### Scenario: Choose crescendo
- **WHEN** the user turns on the live build in Compose, chooses "crescendo" and plays a song
- **THEN** the song starts with one sound and grows in small steps until it sounds as written

#### Scenario: Default stays the same
- **WHEN** the user turns on the live build without choosing a build style
- **THEN** the build is the current one, in blocks

### Requirement: Path to a destination
Crescendo SHALL compute its steps as a path from a start state to a destination state of the song. In Compose the start SHALL be silence and the destination SHALL be the song as written. The path SHALL use only the existing live build actions (`add`, `remove`, `set`, `pattern`, `rack`, `unrack`). The state after the growth SHALL equal the song as written.

#### Scenario: Reaches the song as written
- **WHEN** a Crescendo build reaches the end of its growth
- **THEN** the compiled code equals the code of the song as written for that bar

#### Scenario: Seek lands on the right version
- **WHEN** the user seeks to a bar in the middle of a Crescendo build
- **THEN** the code shown and heard is the state of the build at that bar

### Requirement: Small steps
Each Crescendo step SHALL change one track, and SHALL usually change one thing on it: one setting, one rack device, or one pattern variant. A step MAY change a few things on the same track when they belong together (for example a track entering with its first setting). Steps SHALL be spaced by a whole number of bars, usually 1 to 4, never closer than one bar.

#### Scenario: One change at a time
- **WHEN** a step is typed into the code panel
- **THEN** it changes the lines of one track only

#### Scenario: Room between steps
- **WHEN** two steps follow each other
- **THEN** at least one bar separates them

### Requirement: Kinds of step
Crescendo SHALL use these kinds of step, all expressed with the existing actions:
- a track enters minimal (its simplest pattern variant, neutral settings);
- a pattern grows to its next, fuller variant;
- one setting moves toward its written value (filter, drive, room, delay, gain and the others of the track type), possibly in several moves;
- one rack device is added, changed or removed;
- a track is muted and later brought back (a break and a return);
- a track leaves.

#### Scenario: A track grows from minimal
- **WHEN** a drums track enters in a Crescendo build
- **THEN** it plays a sparser version of its rows first, and later steps fill it up to the written rows

#### Scenario: A break and a return
- **WHEN** a Crescendo build reaches a break
- **THEN** some tracks are muted for a few bars and brought back by later steps

### Requirement: Growing patterns
Crescendo SHALL thin patterns with rows, notes or steps into simpler variants, keeping strong positions last. It SHALL grow preset-only patterns with the `degrade` device. Variants SHALL be added under generated names, leaving the written patterns unchanged.

#### Scenario: Drum rows thin out
- **WHEN** a written drums pattern has a kick on every beat and hats on every 16th
- **THEN** its simplest variant keeps the kick on the first beat, and the variants in between add hits until the written rows

#### Scenario: Written notes thin out
- **WHEN** a bass track with written `notes` enters in a Crescendo build
- **THEN** it plays fewer of its notes first, and later steps add them back up to the written line

#### Scenario: Preset patterns grow with degrade
- **WHEN** a bass track with a preset pattern enters in a Crescendo build
- **THEN** it enters with a `degrade` device that later steps lower and remove

### Requirement: Varied length and endings
Crescendo SHALL draw, per song, the number of steps, their spacing and the ending, from the song's complexity and a seeded random stream. The ending SHALL be one of: stripped back slowly in small steps, cut in a few large steps, or a short end where the song simply finishes. The same song and seed SHALL give the same build. A Crescendo build MAY last longer than the song as written, by repeating sections while it grows, within a limit of three times the written length.

#### Scenario: Same seed, same build
- **WHEN** the same song is built twice in crescendo with the same seed
- **THEN** the steps, their bars and their comments are identical

#### Scenario: Different endings
- **WHEN** several songs are built in crescendo
- **THEN** their endings are not all of the same kind

### Requirement: Narration density
Crescendo steps SHALL carry short spoken comments that say what the step does ("more bass", "open the filter", "bring the kick back in"), in English and Italian, from a phrase list per kind of step. The voice knob SHALL keep deciding how many comments are spoken. A "fully narrated" option SHALL make almost every step speak.

#### Scenario: Normal narration
- **WHEN** the fully narrated option is off
- **THEN** comments are spoken as often as the voice knob allows

#### Scenario: Fully narrated
- **WHEN** the fully narrated option is on
- **THEN** almost every step speaks a short comment about its change

### Requirement: Only the app's own material
Crescendo SHALL use only the code the app compiles, its presets, devices and sounds. It SHALL NOT introduce new Strudel functions, samples or helpers.

#### Scenario: No unknown functions
- **WHEN** the code of every state of a Crescendo build is evaluated
- **THEN** it evaluates without errors and uses no function the compiler does not already emit

### Requirement: Module tracks as blocks
Tracks that play a module file (FastTracker 2, when they exist) SHALL take part in a Crescendo build only as a whole: they enter, leave or are muted, and SHALL NOT be built from inside.

#### Scenario: A module track enters whole
- **WHEN** a song with a module track is built in crescendo
- **THEN** the module track enters in one step, playing as written

### Requirement: Hand takeover in crescendo
Taking over by hand and resuming SHALL work for a Crescendo build as for any live build.

#### Scenario: Resume a Crescendo build
- **WHEN** the user takes over by hand during a Crescendo build and then resumes
- **THEN** the build types back to its own state at that bar and goes on with its steps

### Requirement: Harmony starts simple
During the growth, Crescendo SHALL hold one chord (the first chord of the song's progression) and SHALL bring in the written progression with one step. Tempo, meter and swing SHALL stay as written in phase 1.

#### Scenario: Progression comes in
- **WHEN** a Crescendo build starts
- **THEN** the first tracks play over one held chord, and a later step brings in the song's progression

### Requirement: Typing shows the section that plays
When a step changes a track whose code is written once per section, the typing animation SHALL show the edit on the line of the section that plays at the step's bar. The lines of other sections SHALL be updated without animation.

#### Scenario: One line typed
- **WHEN** a step adds a device to a track that has lines for three sections
- **THEN** the edit is typed on the line of the playing section only, and the other two lines change at once

### Requirement: Export and fragments
Audio export, session video and fast video SHALL work for a Crescendo build, with the typing rule of the playing section applied in videos too. A fragment of a Crescendo song SHALL start on a step, and a random fragment SHALL prefer stretches where steps happen over the sparse start.

#### Scenario: Fragment starts on a step
- **WHEN** a random fragment is cut from a Crescendo song
- **THEN** it starts on a step bar and does not fall in the first bars where only one sound plays

#### Scenario: Long build exports
- **WHEN** a Crescendo build three times the written length is exported fast
- **THEN** the export completes and sounds like playback

### Requirement: Song build style
A song file MAY declare `"buildStyle": "crescendo"` (or `"blocks"`). A song that declares it SHALL open and play with that build style, from Songs and from Compose. Songs without the field SHALL follow the Compose setting. The Compose control SHALL still let the user play any song in either style.

#### Scenario: A crescendo song opens in crescendo
- **WHEN** the user opens from Songs a song with `"buildStyle": "crescendo"`
- **THEN** it plays in crescendo without changing any setting

#### Scenario: Play it as written
- **WHEN** the user switches that song to "in blocks" or turns the live build off
- **THEN** the song plays as written, since Crescendo only adds a growth in front of it
