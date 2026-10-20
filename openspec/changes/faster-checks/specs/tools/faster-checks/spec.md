## ADDED Requirements

### Requirement: Shared code cache
The tools that read the generated code of every song and step SHALL share a cache keyed by a hash of each item's inputs: the song file, the profile and options, and the app code that writes it. An item whose hash is unchanged SHALL be read from the cache; a changed input SHALL make its item be generated again. Results SHALL be the same with and without the cache.

#### Scenario: Second run
- **WHEN** `check:strudel` runs twice with no code change
- **THEN** the second run reads every item from the cache and gives the same result in a fraction of the time

#### Scenario: Generator changed
- **WHEN** the way Live coder code folds functions changes
- **THEN** the items it writes get a new hash and are generated again

### Requirement: Crescendo check levels
`check:crescendo` SHALL run a quick level by default, with the protected Classic and Crescendo fixtures and a fixed sample of songs, and a full level with `--full` that checks every song. The full level SHALL run songs in parallel on the available cores.

#### Scenario: Quick level
- **WHEN** an agent runs `npm run check:crescendo` after a change that does not touch growth rules
- **THEN** it finishes in a few minutes and still fails if Classic or Crescendo code changed

### Requirement: Catalog cadence
A Strudel catalog older than the code SHALL give a warning in `check:knowledge`, not a failure. The checks map SHALL say to rebuild the catalog when Strudel, the generator or app functions change, and before a merge to main.

#### Scenario: Unrelated change
- **WHEN** a change edits a song and runs `check:knowledge`
- **THEN** the check passes with a warning that the catalog is older than the code

### Requirement: Full checks before a merge
The checks map and `AGENTS.md` SHALL list the full checks to run before a merge to main and after a change to growth rules, shapes or typing.

#### Scenario: Before merge
- **WHEN** an agent prepares a merge to main
- **THEN** the checks map tells it to run the full crescendo level and rebuild the catalog
