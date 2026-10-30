# Spec Delta

## MODIFIED Requirements

### Requirement: Add a saved pattern
The console SHALL offer an "Add a saved pattern" panel listing the user's saved patterns that fit the song on air: a pattern fits when the song's style can play its instrument type (or the song holds a track of that type) and its meter has the song's number of steps per bar. The panel's title SHALL count the fitting patterns. When no saved pattern fits, the panel SHALL say why (no saved patterns, or none in this meter or type).

#### Scenario: Add as a new track
- **WHEN** the listener shows the panel as cards, listens to a saved bassline and presses "Add as new track"
- **THEN** from the next phrase a new bass track plays that bassline in the song's key and tempo

#### Scenario: Replace a part
- **WHEN** the listener picks a saved melody and "Replace Lead"
- **THEN** from the next phrase the lead track plays the saved melody with its own sound, and the rest of the song is unchanged

#### Scenario: Another meter
- **WHEN** the song on air is in 7/8 and every saved pattern is in 4/4
- **THEN** the panel lists none and says no saved pattern is in this meter

#### Scenario: Title count
- **WHEN** 97 saved patterns fit the song on air
- **THEN** the panel's title reads "Add a saved pattern (97)"

## ADDED Requirements

### Requirement: Listen and bring in a saved pattern
Each listed pattern SHALL have a preview listen, played alone in the song's key and tempo with the radio lowered, and stopped by a second press or by another preview. From the cards the listener SHALL bring the pattern in as a new track or replace one playing track of the same type, from the next phrase.

#### Scenario: Preview alone
- **WHEN** the listener presses the headphones of a saved pattern, then the headphones of another
- **THEN** the first preview stops, the second plays alone in the song's key and tempo, and the radio stays lowered until the preview stops

### Requirement: Saved patterns panel shown or hidden
The chevron of the panel's title row SHALL hide or show the whole panel body: list or cards, toolbar, instrument chips, groups, scroll area and the note on unfit patterns. Hidden, only the title row SHALL stay, with its count and the view button. The choice SHALL be remembered across songs, sessions and reloads; the default SHALL be shown. The P key on a hidden panel SHALL show it and put the focus in the search.

#### Scenario: Hide
- **WHEN** 97 patterns fit and the listener presses the chevron of the shown panel
- **THEN** only the title row "Add a saved pattern (97)" stays, and the console's next group moves up under it

#### Scenario: Remembered
- **WHEN** the listener hides the panel and reloads the page
- **THEN** the panel is still hidden on the next song

#### Scenario: P on a hidden panel
- **WHEN** the panel is hidden and the listener presses P
- **THEN** the panel is shown and the search has the focus

### Requirement: Saved patterns as rows or cards
An icon button in the panel's title row SHALL switch the body between rows (name, type, small preview drawing) and cards (preview drawing, type, key, tempo, styles, use count, actions), naming the next view in its tooltip and label. The choice SHALL be remembered; the default SHALL be rows, and a panel left open as cards before this change SHALL show as cards. Search, filters, groups, sorts and scroll areas SHALL work in both views.

#### Scenario: Switch to cards
- **WHEN** the panel is shown as rows and the listener presses the view button
- **THEN** the same patterns show as cards, with the same search, filters and group state

#### Scenario: View while hidden
- **WHEN** the panel is hidden and the listener presses the view button
- **THEN** the view changes for the next time the panel is shown, and the panel stays hidden

#### Scenario: Earlier choice kept
- **WHEN** a listener who had the panel open as cards loads the app after this change
- **THEN** the panel is shown as cards
