## ADDED Requirements

### Requirement: Generator setting
A setting SHALL choose the code generator: standard (today's code, default) or idiomatic. It SHALL be independent of the code view.

#### Scenario: Idiomatic with the view now
- **WHEN** the generator is idiomatic and the view is now
- **THEN** the code shows the current section with the idiomatic forms

### Requirement: Short drum forms
With the idiomatic generator, drum rows SHALL be written in the shortest mini-notation that plays the same hits (for example `bd*4`, `[~ hh]*4`, `!` repeats), and rows of the same kit MAY share one line.

#### Scenario: Four on the floor
- **WHEN** a kick row has a hit on every beat
- **THEN** its code is `s("bd*4")` or part of a shared line with `bd*4`

### Requirement: Degrees and progression
With the idiomatic generator, a melodic part SHALL be written as scale degrees with the progression added on top when every chord of the progression fits the key and scale; otherwise its notes SHALL stay written out.

#### Scenario: Diatonic progression
- **WHEN** a bass in A minor plays the progression Am F C G
- **THEN** its code uses degrees, `.add("<…>")` and `.scale("A:minor")`

#### Scenario: Chord outside the scale
- **WHEN** a progression has an E major chord in A minor
- **THEN** that part keeps its notes written out

### Requirement: Same events
The idiomatic code SHALL produce the same events as the standard code, with notes compared as pitches. A form that would not SHALL NOT be used.

#### Scenario: Check
- **WHEN** the check compares both generators on the built-in songs and Crescendo states
- **THEN** every bar has the same events

### Requirement: Small growth steps
With the idiomatic generator, a Crescendo step that grows a pattern SHALL change only a few characters of the line when the shorter form allows it.

#### Scenario: Hats fill up
- **WHEN** a step grows the hats from off-beats to eighths
- **THEN** the line changes from `[~ hh]*4` to `hh*8`
