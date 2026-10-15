## ADDED Requirements

### Requirement: Switch style family
The styles SHALL include a family named Switch, with one style per genre: Switch · trance (genre trance) and Switch · acid (genre techno) first. More genres MAY join the family. The style list SHALL show the family together.

#### Scenario: Family in the list
- **WHEN** the user opens the style list
- **THEN** the Switch styles are shown together, each with its genre

### Requirement: Switch songs
A song made from a Switch style SHALL keep one key and scale, use a progression of one to four chords that all fit the scale, have four to six tracks, and use short repeated patterns.

#### Scenario: One key
- **WHEN** the director makes a song from Switch · acid
- **THEN** every section has the same key and a progression of at most four chords in its scale

### Requirement: Build style from the style
A style MAY declare a build style. Songs made from a Switch style SHALL declare `"buildStyle": "crescendo"` and open in crescendo in Compose.

#### Scenario: Open in Compose
- **WHEN** the user opens in Compose a song made from Switch · trance
- **THEN** it plays in crescendo
