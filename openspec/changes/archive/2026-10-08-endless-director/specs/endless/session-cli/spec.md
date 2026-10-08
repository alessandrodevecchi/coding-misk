# Spec Delta

## Purpose

The command line lets people and agents generate, inspect and listen to endless sessions, and check style recipes, before the radio view exists.

## ADDED Requirements

### Requirement: Generate a session
`node tools/endless.mjs` SHALL generate a session from options: `--styles` (comma-separated recipe ids, required), `--chaos`, `--energy`, `--complexity` (0 to 1, defaults 0.3, 0.6, 0.5), `--minutes` (total length, default 15), `--seed` (optional) and `--out` (directory, default `songs/endless/`). It SHALL write one song file per song and a `session.json` with the session data. Unknown style ids or out-of-range values SHALL stop the command with an error that lists the valid choices, and nothing SHALL be written.

#### Scenario: Session written
- **WHEN** `node tools/endless.mjs --styles berlin-techno --minutes 12 --seed test` runs
- **THEN** the output directory contains `session.json` and song files totalling at least 12 minutes, and the command prints the seed

#### Scenario: Unknown style
- **WHEN** `--styles berlin,nonexistent` is given
- **THEN** the command fails, lists the available styles, and writes nothing

### Requirement: Join into one song
With `--join`, the command SHALL also write one song file containing the whole session in order (sections, tracks and build steps of each song, with track ids kept unique), so the session can be played in Compose as a single live build.

#### Scenario: Joined song plays
- **WHEN** a session is generated with `--join` and the joined file is opened in Compose
- **THEN** it passes the song validator and plays every song of the session one after another

### Requirement: Readable report
The command SHALL print a report: for each song its title, styles per part, length, tempo, key, energy shape and track count, and for each phrase its target and measured energy and its moves with comments.

#### Scenario: Report lines
- **WHEN** a session is generated
- **THEN** the output has one summary line per song and one line per phrase with target energy, measured energy and moves

### Requirement: Recipe check
`node tools/style.mjs validate [file|dir]` SHALL validate recipes (default `styles/`), print each error and warning with its JSON path, and exit with a non-zero code when any recipe has errors. An npm script SHALL run the recipe check together with the director checks (determinism, song validity, taste and variety rules on sessions of every starting style).

#### Scenario: Check passes
- **WHEN** the npm check runs on the starting styles
- **THEN** it reports every recipe as valid and every director check as passed, and exits with code 0

#### Scenario: Check fails
- **WHEN** a recipe has an error
- **THEN** the check prints the error with its path and exits with a non-zero code

### Requirement: Comments for spoken voice
`npm run voices` SHALL also generate the director's phrase pool in English and Italian, so generated songs speak their comments.

#### Scenario: Pool voiced
- **WHEN** `npm run voices` runs on macOS
- **THEN** every phrase of the director's pool has a sample in `public/samples/say_en/` and `public/samples/say_it/`
