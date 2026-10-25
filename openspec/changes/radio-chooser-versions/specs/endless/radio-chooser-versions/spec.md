## ADDED Requirements

### Requirement: Chooser versions on air
The radio SHALL know a list of chooser versions on air, each with a fixed id (`<family>-<n>`, for example `normal-1`, `radio-1`) and a name in English and Italian. A version that has played SHALL NOT change its rule; a changed rule SHALL be a new version. The default version SHALL be `normal-1`.

#### Scenario: Versions today
- **WHEN** the Settings page lists the chooser versions
- **THEN** it shows "Normal v1 (current)" ("Normale v1 (attuale)") and "Radio chooser v1 (previous on air)" ("Scelta radio v1 (la precedente in onda)"), with Normal v1 selected by default

### Requirement: The setting
Settings, Advanced card, SHALL hold "Chooser on air" ("Scelta delle mosse in onda"): a select with every version and a hint in English and Italian. The default SHALL NOT be stored; another choice SHALL be stored in this browser and included in the backup. The choice SHALL apply to radio sessions started after it; a session already on air SHALL keep its chooser.

#### Scenario: Choose a version
- **WHEN** the user picks Radio chooser v1 and starts the radio
- **THEN** commands on grown songs reach their waypoints with the moves in the order of `radio-1`

### Requirement: Replays use the recorded chooser
A new radio session SHALL record its chooser id in its recipe. A replay SHALL use the recorded chooser. A recipe of growth marker 3 without a chooser SHALL use `normal-1`; a recipe of growth marker 2 SHALL use `radio-1`.

#### Scenario: Replay after a change of setting
- **WHEN** a session played with Radio chooser v1 is replayed after the setting went back to Normal v1
- **THEN** the replay plays the same steered songs as the session

### Requirement: Removed versions fall back to the default
A saved setting or a recipe that names a version no longer in the code SHALL use the default version. The Settings page SHALL show the default selected; a saved session in a playlist SHALL warn that it may sound different.

#### Scenario: Unknown id
- **WHEN** the stored setting is `radio-9` and no such version exists
- **THEN** the radio uses `normal-1` and the select shows Normal v1

### Requirement: The default is not slower than any version
`check:radio-profiles` 5.5 SHALL measure, over the same curve points, the bars each version needs to reach the energy asked, print them per version (sooner and later cases against the default), and fail when another version needs fewer bars in all than the default.

#### Scenario: A new version
- **WHEN** a version `radio-2` is added
- **THEN** check 5.5 measures it with no change to the check, and fails if it is faster in all than the default until the default changes
