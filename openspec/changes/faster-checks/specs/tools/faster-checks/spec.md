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

### Requirement: Checks leave the machine usable
Parallel checks SHALL run at low priority (macOS background policy where available) and SHALL use at most 4 worker processes between 08:00 and 20:00 local time on weekdays, 6 by day at the weekend, and all cores but one at night. The variable `CHECK_WORKERS` SHALL override the number.

#### Scenario: Day
- **WHEN** the full crescendo check runs at 15:00 with no variable set
- **THEN** it uses at most 4 workers at low priority

#### Scenario: Night or override
- **WHEN** it runs at 23:00, or with `CHECK_WORKERS=8`
- **THEN** it uses all cores but one, or 8 workers

### Requirement: Targeted reruns
`check:crescendo` SHALL accept a filter by check and by song, so that a failure can be fixed and rerun on the failing songs only. After a targeted fix the quick level SHALL be enough for a commit; the full level SHALL be needed after changes to growth rules, shapes or typing, and before a merge to main.

#### Scenario: One failing song
- **WHEN** a check fails on two songs and the fix is done
- **THEN** `check:crescendo --only <check> --songs <a,b>` reruns just that in a few minutes, then the quick level runs before the commit

### Requirement: Workers changed while a check runs
A running parallel check SHALL read the number of workers again from a git-ignored control file (`.check-workers` at the repo root) before it hands out each new song. Lowering it SHALL let busy workers finish their current song and then stop; raising it SHALL start new workers. The value in the file SHALL win over the time rules and over `CHECK_WORKERS` set at start.

#### Scenario: The owner needs the Mac
- **WHEN** a night check runs on 9 workers and `.check-workers` is set to 2
- **THEN** within one song per worker the check runs on 2 workers and goes on to the end with the same result
