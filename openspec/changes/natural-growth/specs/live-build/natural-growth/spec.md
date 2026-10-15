## ADDED Requirements

### Requirement: Minimal entries
With natural growth, a track SHALL enter with its sound and its simplest notes only (one held note or a few hits), without filter, envelope, gain or effects in its code.

#### Scenario: Bass enters
- **WHEN** the bass enters in a natural growth
- **THEN** its code is one or two lines: its notes and its sound

### Requirement: Functions one at a time
A function SHALL appear in a track's code only when a step brings it in, one per step, and SHALL then move toward its written value in later steps. At the end of the growth every function of the written song SHALL be in the code.

#### Scenario: Filter arrives
- **WHEN** a step brings in the bass filter
- **THEN** the bass line gains `.lpf(…)` at a closed value, and later steps open it

### Requirement: Notes grow inside the quotes
A track's notes or hits SHALL grow from the simplest form to the written pattern in short steps that change a few characters each.

#### Scenario: From one note
- **WHEN** a lead grows
- **THEN** its notes go from one note to a short line to the written line

### Requirement: Clones
A new melodic track MAY be born as a copy of a playing track's block; when it is, the copy SHALL appear at once like a paste and SHALL then change in one or two places.

#### Scenario: Lead from the bass
- **WHEN** a lead enters as a clone of the bass
- **THEN** the bass block appears copied below and its sound and octave are then changed

### Requirement: Sparse steps and listening pauses
Steps SHALL be 4 to 8 bars apart at the start of the growth. After a track enters, the progression arrives or a break ends, there SHALL be a pause of 4 to 8 bars without changes. The growth SHALL stay within three times the written length.

#### Scenario: Pause after an entry
- **WHEN** a new track enters
- **THEN** no step changes the code for at least 4 bars

### Requirement: Trials
Some steps that move a number SHALL be typed as tries: a first value, played for a bar, then corrected to the next, before the final value.

#### Scenario: Filter by ear
- **WHEN** the filter of a track opens with trials
- **THEN** the code shows one or two values before the final one, and the sound follows each of them

### Requirement: Same destination
After a natural growth the song SHALL play as written: the code after the growth SHALL produce the same Strudel events as the written song.

#### Scenario: End of the growth
- **WHEN** the natural growth of a test song ends
- **THEN** the events of its code equal those of the written song
