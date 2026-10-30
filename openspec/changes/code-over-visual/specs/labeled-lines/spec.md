## ADDED Requirements

### Requirement: Labeled lines option

The app SHALL offer a code-look option "Labeled lines" (it: "Righe con nome"), off by default, in the profile controls that change only how the code looks. With the option on, each pattern line SHALL start with its instrument's name as a label (`kick: s("bd*4")`) instead of a comment line naming the instrument followed by `$:`. Track headers and section comments SHALL stay.

#### Scenario: Labeled Classic code

- **WHEN** the option is on and a song plays in Classic
- **THEN** its kick line reads `kick: s(...)`, no `// Drums · kit` line precedes it, and the track header and the section comment are still there

### Requirement: Labels never change the sound

With the option on or off, every hap SHALL keep the same sound, gain, orbit, analyze, postgain and velocity. With the option off, the generated code SHALL be identical to the code before this change.

#### Scenario: Same sound

- **WHEN** the same song plays with "Labeled lines" off and on, in Classic, Crescendo and Live coder
- **THEN** the haps of every bar are identical in both

#### Scenario: Off by default

- **WHEN** a user plays a song with default settings
- **THEN** the code has `$:` lines and the code snapshots do not change

### Requirement: Names the app writes

Names SHALL be lowercase JavaScript identifiers made from the instrument (`kick`, `snare`, `hats`, `bass`, `pad`, `lead`, `arp`, `voice`), never a reserved word, never starting with a capital letter and never ending with `_`. When the shown code has more than one line of the same instrument, the later lines SHALL get a number (`kick`, `kick2`, `kick3`) in the order of the code, so no two lines share a name. The same song with the same settings SHALL always give the same names.

#### Scenario: Two kick lines

- **WHEN** the Classic code of a song has a kick line in three sections
- **THEN** the lines are named `kick:`, `kick2:` and `kick3:` and all three play in their sections

### Requirement: Mute and solo with labels

A muted line SHALL be written `_kick:` (one character, as `_$:` today) and a soloed line `Skick:`. The hidden mixer, the typing, the timeline, the compact code, the widgets and the video dimming SHALL treat `_name:` and `Sname:` as they treat `_$:` and `S$:`. Muting or unmuting a labeled line SHALL be typed as a one-character edit.

#### Scenario: Mute while growing

- **WHEN** the Live coder mutes the bass line
- **THEN** the line becomes `_bass:`, typed as one added character, and it is dimmed in the editor and in videos

### Requirement: Guard on user code

When code typed or pasted by the user is evaluated, the app SHALL warn, without blocking, when two lines share a label (only the last one plays), when a label starts with a capital `S` followed by more letters and is not meant as a solo (it solos the line and silences the others), or when a label ends with `_` (it mutes the line). The warning SHALL name the line and the fix. The song validator SHALL reject labels inside pattern code of a song file.

#### Scenario: Duplicate label

- **WHEN** the user evaluates two lines both labeled `bass:`
- **THEN** a warning says that only the last `bass:` plays and suggests `bass2:`

#### Scenario: Accidental solo

- **WHEN** the user evaluates a line labeled `Synth:`
- **THEN** a warning says that `Synth:` solos this line and silences the others, and suggests `synth:`
