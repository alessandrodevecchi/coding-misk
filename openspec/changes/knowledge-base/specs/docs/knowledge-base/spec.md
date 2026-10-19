## ADDED Requirements

### Requirement: Knowledge base structure
The repo SHALL have a knowledge base in `docs/knowledge/` with an index and one note per concept of the app. Each note SHALL say what the concept is, link the concepts it affects or depends on, name the code files and the checks that cover it, and describe its options. The index SHALL list every note with one line each and a suggested reading order.

#### Scenario: New agent
- **WHEN** an agent with no history reads the index
- **THEN** it finds where to start, which note explains profiles, and from that note the links to growth shapes, comments and technical functions

### Requirement: Strudel basics
The knowledge base SHALL start with a note on Strudel: cycles, mini-notation, `$:` lines, `setcpm`, chained functions, sounds and banks, notes and scales, effects and orbits. It SHALL link the official Strudel documentation, the function catalog for the version we ship (`docs/STRUDEL-FUNCTIONS.md`) and the in-app Strudel lessons, and SHALL say what the app adds on top of Strudel. It SHALL be written in our own words, without copying the official documentation.

#### Scenario: Agent new to Strudel
- **WHEN** an agent reads the Strudel note
- **THEN** it can read `s("[~ hh]*4").bank("RolandTR909").gain(0.4)` and tell which parts are Strudel and which are app functions in compact code

### Requirement: Options described
Every option a user can set (profile controls, comment and technical function options, radio settings and console controls, compilation setup, song format fields that change the sound) SHALL be described in the note of its concept: its values, its default per profile where it has one, and what it changes. Descriptions SHALL come from the app's help texts where they exist.

#### Scenario: Technical functions
- **WHEN** an agent looks up Technical functions
- **THEN** it finds the presets, the options with their meaning and the default of each profile

### Requirement: Real code examples
Notes SHALL show code examples taken from the app: an idea and its code, a pattern, a song function, a Live coder growth step before and after, and a radio command with what it changes in the song. Examples SHALL be generated from the example songs and SHALL compile.

#### Scenario: Example out of date
- **WHEN** a change alters the code an example comes from
- **THEN** the knowledge check fails until the examples are generated again

### Requirement: Generated parts
Lists that exist in the code (styles and families, radio commands, profile presets and controls, technical function presets, growth openings, paces and developments, app helper and library functions) SHALL be generated from the code into marked blocks of the notes. Text outside the marked blocks SHALL be written by hand and kept by the generator.

#### Scenario: New style
- **WHEN** a style file is added
- **THEN** running the generator adds it to the styles note, and the check fails until it is run

### Requirement: Decisions and lessons
The knowledge base SHALL have a note with the important decisions and the rejected attempts, each with its reason and a link to the DEVLOG entry or change it comes from.

#### Scenario: Rejected approach
- **WHEN** an agent plans to register an app helper named after a Strudel function
- **THEN** the decisions note says this was rejected and why

### Requirement: Knowledge check
`npm run check:knowledge` SHALL fail when a concept, option, command or style has no note, when a link between notes or to a file is broken, when a generated block is out of date, or when an example does not compile. It SHALL run without a browser.

#### Scenario: Broken link
- **WHEN** a note links a file that was renamed
- **THEN** the check fails and names the note and the link

### Requirement: Kept up to date
`AGENTS.md` SHALL point to the knowledge base index. A change that adds a concept or an option SHALL update its note in the same change, enforced by the knowledge check.

#### Scenario: New option
- **WHEN** a change adds a profile control
- **THEN** the knowledge check fails until the control is described in its note
