## ADDED Requirements

### Requirement: Live coder style family
The styles made for the Live coder profile SHALL have genre names and ids: `acid` (Acid), `house` (House), `gated-trance` (Gated trance, Trance gated), `pure-trance` (Pure trance, Trance pura). Their family SHALL be `live-coder`, shown as "Live coder". Their recipe content SHALL stay as it was, so their songs sound the same.

#### Scenario: Styles tab
- **WHEN** the user opens the Styles tab
- **THEN** the four styles show under the family Live coder with their genre names, and no style is called Switch

#### Scenario: No clash
- **WHEN** the styles are loaded
- **THEN** every style id is unique and the existing `trance` style is unchanged

### Requirement: Old style ids resolved by alias
Every place that reads a style id SHALL resolve the old ids `switch-acid`, `switch-house`, `switch-trance` and `switch-trance-pure` to the new ones, and the old family `switch` to `live-coder`. This SHALL cover song tags, the Songs tab filters, artists, radio settings, radio history and radio sessions saved in playlists. Old ids SHALL NOT be rejected as unknown.

#### Scenario: Saved song with an old tag
- **WHEN** a saved song has the style tag `switch-trance-pure`
- **THEN** its card shows the tag Pure trance and the Pure trance filter finds it

#### Scenario: Radio session saved before the rename
- **WHEN** a playlist holds a radio session whose recipe names `switch-acid`
- **THEN** it plays with the Acid style and its songs sound as before

#### Scenario: User artist
- **WHEN** a user artist's taste names `switch-house`
- **THEN** the artist is valid and its songs use the House style
