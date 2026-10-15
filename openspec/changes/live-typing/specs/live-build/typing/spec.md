## ADDED Requirements

### Requirement: Word-level edits
When the code types itself, a changed line SHALL be edited only where it changes: each changed word, number or string SHALL be deleted and typed in its place, one place after another, and the rest of the line SHALL stay untouched.

#### Scenario: One note changes
- **WHEN** a step changes one note in a long line
- **THEN** only that note is deleted and retyped

#### Scenario: Three places change
- **WHEN** a step changes three words in different places of a line
- **THEN** they are edited one after another, with a short pause between them

### Requirement: Human typing speed
Small edits SHALL be typed at about 8 characters a second; long edits SHALL speed up to about 30 characters a second and be typed in small pieces. Every edit SHALL be complete before the bar of its step; when it cannot be at those speeds, it SHALL speed up just enough.

#### Scenario: Small edit
- **WHEN** a step changes a value of 3 characters
- **THEN** it takes about half a second to type, near the end of the time before the step

#### Scenario: Long edit on a short gap
- **WHEN** a long edit must be typed in one bar
- **THEN** it is typed faster and finishes before the step's bar

### Requirement: Typing time
Typing SHALL be able to start right after the previous step and use the whole time before the next one, and the sound SHALL change only on the step's bar.

#### Scenario: Steps four bars apart
- **WHEN** the next step is four bars away and its edit is long
- **THEN** typing starts early enough to finish at human speed

### Requirement: Smooth scroll
The code panel SHALL glide to the edit being typed and keep it in view, without jumps while it stays visible.

#### Scenario: Edit below the window
- **WHEN** the next edit is below the visible part of the code
- **THEN** the panel scrolls smoothly until the edit is in view

### Requirement: Typing speed setting
A setting SHALL choose the typing speed (slow, normal, fast), normal by default. It SHALL apply wherever the code types itself: the live build in blocks and in crescendo, the radio, resuming after hand takeover and session videos.

#### Scenario: Fast typing
- **WHEN** the setting is fast
- **THEN** every edit is typed faster than with normal, still word by word

### Requirement: Same typing in videos
Session videos and fast videos SHALL show the same typing as the app for the same song.

#### Scenario: Video frame
- **WHEN** a video frame falls in the middle of an edit
- **THEN** it shows the code as the app shows it at that moment
