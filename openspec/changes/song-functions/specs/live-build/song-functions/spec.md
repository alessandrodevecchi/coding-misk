## ADDED Requirements

### Requirement: Helper names never shadow Strudel
Every function the app registers for the code SHALL have a name that is not a Strudel function or synonym in the catalog of the Strudel version we ship. The bus and visual helper SHALL be `chan`, the distortion helper `grit`. The names `o`, `drive` and `voice` SHALL NOT be registered by the app.

#### Scenario: Strudel's drive
- **WHEN** code written by the user calls `.drive(2)` with a ladder filter
- **THEN** it plays Strudel's filter overdrive, not the app's distortion

#### Scenario: Check
- **WHEN** a helper or library function is named after a Strudel function
- **THEN** `npm run check:strudel` fails and names it

### Requirement: Song functions
With song functions on, a run of three or more consecutive effect calls that appears on two or more lines, or a run of four or more calls on one line, SHALL be written as one call to a function of the song, defined in the hidden code. The code shown SHALL play the same events as the code written in full.

#### Scenario: Repeated envelope and echo
- **WHEN** the bass and the arp both end with `.decay(…).sustain(…).delay(…)` with different values
- **THEN** both lines call the same song function with their own values, and the events are the same as in full code

### Requirement: What stays written out
Sound, note, scale, chord, rhythm, structure and mask calls SHALL never be folded into a function.

#### Scenario: Sound stays in view
- **WHEN** a line is folded
- **THEN** its `.s(…)`, its notes and its rhythm are still written out

### Requirement: Function parameters
Values that differ between the uses of a run SHALL become parameters of its function, at most three. A run that needs more SHALL stay written out.

#### Scenario: Too many values
- **WHEN** four values differ between the uses of a run
- **THEN** the run stays written out on every line

### Requirement: Function library
The app SHALL ship a library of named functions with parameters for frequent chains, starting with an envelope, a delay with reverb, a filter with resonance and a moving filter. A run that matches a library function SHALL use it before a song function. The library SHALL be a data file; adding a function SHALL need only a new entry, checked for its name, its parameters and the same events.

#### Scenario: Library first
- **WHEN** a line ends with `.delay(.3).room(.4)` plus a third call that the library space function covers
- **THEN** the line calls the library function, not a new song function

### Requirement: Themed names
Song function names SHALL be lowercase, at most 12 characters, unique in the song, and taken from word lists per style, genre and track, chosen by the song seed; the same song SHALL always get the same names. Abbreviations of two or three letters SHALL be used only for library functions of very frequent chains. A single letter SHALL be used only for a song function used on one line.

#### Scenario: Acid bass
- **WHEN** an acid song folds its bass chain
- **THEN** the function has a name from the acid list, such as `squelch`, and the same name every time the song plays

### Requirement: Growth changes parameters
A live build step SHALL be able to change a parameter of a function in view, as an edit of that value. When a step changes a call of a folded run that is not a parameter, the line SHALL be written out in full from that step on.

#### Scenario: Envelope opens
- **WHEN** a step lengthens the bass decay and decay is a parameter of its function
- **THEN** the code shows the value change inside the function call

#### Scenario: Filter added inside
- **WHEN** a step adds a call inside a folded run
- **THEN** the line shows the full chain with the new call

### Requirement: Technical functions preset
The Technical functions control SHALL be a preset over options, like Comments: bus and visual short, level in the mixer, distortion short, voice effects as a function, song functions, library functions. Presets: full (no option), short (bus, distortion, voice), mixer (short plus level), compact (mixer plus song and library functions). Changing an option SHALL make the preset custom. A saved profile with full, short or mixer SHALL keep its meaning.

#### Scenario: Live coder
- **WHEN** a song plays with the Live coder profile
- **THEN** Technical functions shows compact and the code uses song and library functions

#### Scenario: Classic unchanged
- **WHEN** a song plays with Classic or Crescendo
- **THEN** its code is identical to the code before this change

### Requirement: Hidden code and Strudel
The definitions of song and library functions SHALL be in the hidden code shown on demand, and SHALL be included when the code is copied or opened in Strudel, so it plays there the same.

#### Scenario: Open in Strudel
- **WHEN** the user opens compact code in Strudel
- **THEN** the definitions come before the code and it plays the same events

### Requirement: Saved code updated once
When the app starts, saved hand-coded versions SHALL have `.o("name")` rewritten to `.chan("name")`, `.drive(x)` to `.grit(x)` and `.voice("name")` to the matching song function with its definition. The rest of the code SHALL stay unchanged, and the update SHALL run only once per version.

#### Scenario: Old hand-coded version
- **WHEN** a hand-coded version saved before this change uses `.o("bass")` and `.drive(.6)`
- **THEN** after the app starts it uses `.chan("bass")` and `.grit(.6)` and plays the same
