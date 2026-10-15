## ADDED Requirements

### Requirement: Only similar lines edited in place
A changed line SHALL be edited in place only when it is similar to the old line; otherwise the old line SHALL go and the new one SHALL be written on its own.

#### Scenario: Drum line after the voice comment
- **WHEN** a voice comment leaves and a new drum line comes in at the same place
- **THEN** the comment goes and the drum line is written whole, never mixed with the comment

### Requirement: Copy and change
A new line similar to an existing one SHALL appear as a pasted copy of it, at once, and then change in the values that differ.

#### Scenario: Second drum line
- **WHEN** a clap line comes in under the kick line of the same kit
- **THEN** the kick line is pasted below and its sound, pattern and level are edited

### Requirement: Line breaks
A line that grows past the panel width SHALL be broken before a function, with the continuation indented.

#### Scenario: Long chain
- **WHEN** a function is added to a line already at the panel's width
- **THEN** the new function starts on a new indented line

### Requirement: Edits anywhere in the chain
An insertion at the start or in the middle of a chain SHALL be typed at its place.

#### Scenario: Notes before the sound
- **WHEN** a step puts `n("0").scale("g:minor")` before `.s("supersaw")`
- **THEN** it is typed at the start of the line and the rest stays
