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

### Requirement: Ready for a task
The knowledge base SHALL let an agent with no history carry out the usual tasks on the app. It SHALL have a recipe for each of them, with the files to change, the steps, the checks to run and the mistakes to avoid: define or generate an artist, define a style, add a sound or an instrument, write a song, add a preset or a pattern, add a generator rule, add a growth opening or move, add a radio command, add a profile control or option, add a technical or library function, add a check, update Strudel, add interface text in both languages, export audio, video or fragments, fix a level or clipping problem. The index SHALL list the tasks and link each recipe.

#### Scenario: Define an artist
- **WHEN** an agent is asked to create a new artist
- **THEN** the artist recipe says which file to write, which fields matter and how they steer the director, how to validate it and listen to it, and what not to write in it

### Requirement: Inventories
The knowledge base SHALL list, generated from the code and the shipped files: instruments and sounds (drum machines and banks, samples, synths, soundfonts, FM), sounds that styles or songs ask for and the app does not ship, presets by kind, keys, modes, scales, named progressions and meters.

#### Scenario: Missing sound
- **WHEN** a style asks for a sound that is not shipped
- **THEN** the sounds note lists it as missing, and the list changes when the sound is added

### Requirement: Areas for safe changes
The knowledge base SHALL have notes on sound and levels (rack, devices, sound guard, level snapshots, clipping), the music engine (keys, modes, progressions, meters, presets) and visuals (themes, procedural visuals, video layout).

#### Scenario: New sound
- **WHEN** an agent adds a lead sound
- **THEN** the sound note tells it how to measure its level and the limit it must stay under

### Requirement: Checks, pitfalls, glossary and status
The knowledge base SHALL have a map of the checks (what each covers, how long it takes, what it needs, which fixtures are never rewritten), a note of known pitfalls, an Italian and English glossary of interface terms generated from the help texts, and the current status (open changes and issues, without private details).

#### Scenario: Which check
- **WHEN** an agent changes the radio director
- **THEN** the checks note tells it which checks to run, which need the dev server, and that a fixture change needs a director version bump

### Requirement: From a reference to the app's material
The knowledge base SHALL explain how to turn a reference (a song, a video, an audio file, a MIDI file, a score, a written description) into a style, an artist, a song or patterns: which files to ask the user for and why, what to measure (tempo, key and mode, groove, instruments and sounds, structure, energy over time, mood), which tools exist in the repo or on the machine, and worked examples from styles and songs that were made this way. It SHALL also list approaches not built yet that an agent can propose to the user (score reading, MIDI import, stem separation, automatic key and tempo detection), marked as ideas. It SHALL say where references that name real works, people or brands are kept.

#### Scenario: A mood from a song
- **WHEN** a user gives an agent an audio file and asks for a style with that mood
- **THEN** the note tells the agent what to measure, how existing styles map to those measures, and what to ask the user if the file is not enough

### Requirement: Catalog freshness
The knowledge check SHALL fail when the Strudel coverage is older than the code the app writes, so that the list of functions not used yet is never stale.

#### Scenario: New function written
- **WHEN** a change makes the app write `rib` and the catalog is not rebuilt
- **THEN** the knowledge check fails and asks to run `npm run catalog:strudel`
