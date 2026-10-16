## ADDED Requirements

### Requirement: Listen, then type at a person's pace
In human style the time between two steps SHALL hold a listening pause without typing, then the typing; the typing SHALL last as long as its text needs at a person's pace (pauses and typos included), not the whole time left, and SHALL end when the step plays. When the time is short the listening pause SHALL shrink first and the typing SHALL speed up only after that.

#### Scenario: Long line after a quiet stretch
- **WHEN** a step adds a long line two minutes after the previous step
- **THEN** nothing is typed for a while after the previous step, then the line is typed over tens of seconds (not a few, not two minutes) and is complete when the step plays

#### Scenario: Short time
- **WHEN** a step comes four bars after the previous one
- **THEN** the listening pause is short and the edit is typed in the time left

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
