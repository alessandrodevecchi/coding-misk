## ADDED Requirements

### Requirement: Typing starts earlier
In human style a long edit SHALL be allowed to start from half a bar after the previous step and SHALL use part of that time, typing at a person's speed rather than at the fastest speed that fits.

#### Scenario: Long line after a quiet stretch
- **WHEN** a step adds a long line after two minutes without changes
- **THEN** its typing starts well before the step and lasts tens of seconds, not a few

### Requirement: Uneven speed and pauses
In human style key times SHALL vary, and the typing SHALL pause before numbers, inside mini-notation groups and before string arguments, for half a second to a few seconds.

#### Scenario: Thinking about the notes
- **WHEN** the lead line `n("<[0 ~ 0 2 ~ 4 ~ 7] …>")` is typed
- **THEN** the typing stops for a moment between some groups of notes

### Requirement: Typos and changes of mind
In human style the typing SHALL sometimes press a wrong key and correct it after a few keys, and sometimes type a different value first and change it; the code SHALL be exact when the step plays.

#### Scenario: Wrong key
- **WHEN** `.mask("<0!224 1 0!239>")` is typed
- **THEN** it may show `<0<` for a moment, then the wrong key is deleted and `!` typed

### Requirement: Exact style unchanged
Exact style SHALL type as before this change; Classic and Crescendo SHALL use it.

#### Scenario: Crescendo
- **WHEN** a song plays with the Crescendo profile
- **THEN** its typing is the same as before
