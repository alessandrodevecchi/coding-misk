## ADDED Requirements

### Requirement: Technical functions control
A profile control SHALL choose how technical functions are written: full (as today), short (our own short functions such as `.o("bass")` and `.drive(0.6)`), or mixer (levels and visual links in a hidden mixer, `.gain()` only when a step changes the level). All three SHALL produce the same events.

#### Scenario: Mixer line
- **WHEN** the bass enters with the mixer value and its written level
- **THEN** its line has no `.gain()`, `.orbit()` or `.analyze()`, and it sounds as with full functions

#### Scenario: Level changes
- **WHEN** a step turns the bass up with the mixer value
- **THEN** `.gain(…)` appears on the bass line

### Requirement: Hidden prelude
The helpers and the mixer SHALL live in a prelude evaluated with the code and not shown in the code panel, which MAY show it on demand. Hand takeover SHALL keep the prelude.

#### Scenario: By hand
- **WHEN** the user edits the code and presses Ctrl+Enter
- **THEN** the prelude is evaluated with the user's code and the short functions still work

### Requirement: Comment options as a preset
Comments SHALL be a preset (all, essential, none) over separate options: title, track names, section and pattern notes, step phrases, voice code. Changing an option SHALL make the preset custom.

#### Scenario: Hide the voice code
- **WHEN** the voice code option is off
- **THEN** the spoken comments still play and the voice layer is not in the code shown

### Requirement: Profiles keep their look
Classic and Crescendo SHALL keep full functions and their comments as today. Switch SHALL use the mixer and hide the voice code.

#### Scenario: Crescendo unchanged
- **WHEN** a song plays with the Crescendo profile
- **THEN** its code is the same as before this change
