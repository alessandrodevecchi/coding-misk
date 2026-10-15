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

### Requirement: Progression on top
With the idiomatic generator, a melodic part whose line is the same over every chord, moved to the chord's root, SHALL be written once as steps from its root with the roots added on top as an alternation (`"0 ~ 0 12".add("<55!2 57 53>")`). Other parts SHALL keep their notes, with repeated cells (`[a3 c4 e4 a4]*4`) and repeated groups (`!`) written short. Writing the line as scale degrees with `.scale()` is left for later.

#### Scenario: Bass on the roots
- **WHEN** a bass plays the same line on every chord of Am F C G
- **THEN** its code writes the line once and adds the roots with `.add("<…>")`

#### Scenario: Arpeggio that follows the chord quality
- **WHEN** an arpeggio's intervals change with the chords
- **THEN** its notes stay written, with repeated cells shortened

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

#### Scenario: Drum machines keep their samples
- **WHEN** a drum row becomes a coarser form (`bd*4` instead of sixteen steps)
- **THEN** the hits are the same and the samples play whole, as before
