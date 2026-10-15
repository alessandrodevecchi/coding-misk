## ADDED Requirements

### Requirement: Code of the moment
A code view "now" SHALL show only what plays in the current section: no section lanes, no lines of other sections. It SHALL be the default view for Crescendo songs.

#### Scenario: Short code
- **WHEN** a Crescendo song plays with the view "now"
- **THEN** the code shows one group of lines per playing track, for the current section only

### Requirement: Same sound as the code per section
On every bar the view "now" SHALL produce the same events (onset and values) as the code per section, fades included.

#### Scenario: Equivalence check
- **WHEN** the check compares the events of both codes on every bar of a few songs
- **THEN** they are the same

### Requirement: Edits at section boundaries
At each section boundary the code SHALL change to the next section's code as a step of the build. Lines that change SHALL be prepared in the bars before, written muted with `_$:`, and switched on at the boundary while the old ones go.

#### Scenario: Next section
- **WHEN** a song reaches the bars before a new section
- **THEN** the new lines appear muted under the old ones, and on the boundary they play and the old ones are gone

#### Scenario: Seek
- **WHEN** the user seeks into another section
- **THEN** the code shown is that section's code

### Requirement: Scope
The view "now" SHALL apply to Crescendo songs. Songs in blocks and the radio SHALL keep their code. Extending the view to them is left to a later change.

#### Scenario: Song in blocks
- **WHEN** a song plays in blocks
- **THEN** its code is the code per section, as today
