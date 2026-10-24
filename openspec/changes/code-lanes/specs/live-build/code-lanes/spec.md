## ADDED Requirements

### Requirement: Sections option
The technical functions SHALL include "Sections". With it on, section and clip lanes SHALL be applied by the hidden mixer and each part SHALL be one line, edited in place when its section or clip changes, with every profile and code view.

#### Scenario: Classic song, compact
- **WHEN** settimo-cielo plays as Classic with technical functions "compact"
- **THEN** the code has one line per part and no section constants, and it sounds the same as with "full"

### Requirement: Gated lines and clips
Lanes written as `.mask(x).postgain(x.mul(n))` and lanes of clips within a section SHALL be lifted like section lanes.

#### Scenario: Gated guitar
- **WHEN** a guitar line is gated with `.mask(section1).postgain(section1.mul(0.55))`
- **THEN** with Sections on the line shows no mask or postgain and plays at the same level

### Requirement: Presets keep their meaning
"Compact" SHALL include Sections and "full" SHALL NOT; Classic and Crescendo code with "full" SHALL stay identical.

#### Scenario: Full
- **WHEN** a song plays with technical functions "full"
- **THEN** its code is the same as before this change

### Requirement: Same sound
Every song, profile and step SHALL give the same events with Sections on as with full code.

#### Scenario: Check
- **WHEN** `npm run check:mixer -- --full` runs
- **THEN** it covers Sections and passes
