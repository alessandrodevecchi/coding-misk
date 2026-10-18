## ADDED Requirements

### Requirement: Visible typos
In human style a wrong key SHALL stay on screen while 3 to 6 more keys are typed, unless the line or the edit ends first. The typing SHALL then pause for 0.5 to 1 second before the fix. The backspaces of the fix SHALL come one by one at a person's pace, no faster than the typing around them.

#### Scenario: A typo is seen
- **WHEN** a wrong key is typed inside a long edit
- **THEN** the wrong text shows for at least one second before the first backspace

#### Scenario: Short edit
- **WHEN** a wrong key comes two characters before the end of the edit
- **THEN** only those two characters follow before the pause and the fix

### Requirement: Whole wrong word
In human style the typing SHALL sometimes type a whole word wrong: another word of the same kind (a sound, a scale or a function name), then pause 0.5 to 1 second, delete it at a person's pace and type the right word. The wrong word SHALL be a word the song itself uses, or the right word with two letters swapped.

#### Scenario: Wrong sound name
- **WHEN** the edit types `s("supersaw")` and the song also uses `sawtooth`
- **THEN** the screen may show `s("sawtooth` for a moment, then it is deleted and `supersaw` is typed

### Requirement: Pasted long lines
In human style a long new line SHALL sometimes appear whole at once, as if pasted, instead of being typed key by key. The choice SHALL depend on the song and the step only.

#### Scenario: A long line arrives at once
- **WHEN** a step adds a new line of about 80 characters
- **THEN** in some songs the line appears whole in one frame, after a short pause

### Requirement: Mistakes fit the time and stay exact
The code SHALL be exact when the step plays. When the time before the step is too short, whole wrong words and pasted-line pauses SHALL be dropped first, then typos and pauses, before the typing speeds up. The same song and step SHALL always give the same typing, in the app and in the fast video.

#### Scenario: Same seed
- **WHEN** the same song is played twice and exported as a fast video
- **THEN** the typing, its mistakes and its pastes are the same each time

#### Scenario: Little time
- **WHEN** a long edit has only a few seconds before its step
- **THEN** it is typed without mistakes and is exact when the step plays

### Requirement: Exact style still unchanged
Exact style SHALL type exactly as before this change; Classic and Crescendo SHALL keep using it.

#### Scenario: Classic
- **WHEN** a song plays with the Classic profile
- **THEN** its typing frames are identical to those before this change
