## ADDED Requirements

### Requirement: Live coder profile name
The profile that grows a song like a live coder SHALL be shown as "Live coder" in English and in Italian in the Compose menu, its hints, the Guide and the docs. Its stored id SHALL stay `switch`, so a saved profile choice, saved overrides, songs and styles that name `switch` SHALL keep opening with it.

#### Scenario: Compose menu
- **WHEN** the user opens the profile menu in Compose
- **THEN** it lists Classic, Crescendo and Live coder, and no entry says Switch

#### Scenario: Saved choice
- **WHEN** the browser holds the profile choice `switch` from before this change
- **THEN** Compose opens with Live coder and its overrides

#### Scenario: Song that names the profile
- **WHEN** a song file declares `"profile": "switch"`
- **THEN** it opens with the Live coder profile

### Requirement: Classic and Crescendo untouched by the rename
The rename SHALL NOT change any control, behaviour or generated code of any profile.

#### Scenario: Same code
- **WHEN** the generated code snapshots are checked after the rename
- **THEN** they are identical to those before it
