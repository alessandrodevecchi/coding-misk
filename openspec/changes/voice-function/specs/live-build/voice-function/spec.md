## ADDED Requirements

### Requirement: Voice effects as one call
With technical functions short or mixer, the voice line SHALL call one function named after its voice track instead of writing its effects, and SHALL play the same events.

#### Scenario: Shown voice code
- **WHEN** the voice code is shown and the functions are short
- **THEN** the voice line ends with `.voice("flo")` and the comment sounds as with the chain written out

#### Scenario: Full functions
- **WHEN** the functions are full
- **THEN** the voice line keeps its chain of effects
