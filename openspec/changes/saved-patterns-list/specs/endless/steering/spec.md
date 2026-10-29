# Spec Delta

## ADDED Requirements

### Requirement: Find a saved pattern among many
When more than 8 saved patterns fit the song on air, the "Add a saved pattern" panel SHALL offer a search field, instrument chips with counts, a "Fit this song" chip, a style menu and a sort menu (Recent, Most used, Name, Closest tempo). The search SHALL match every typed word, ignoring case and accents, in the pattern's name, instrument, kind or styles. "Fit this song" SHALL keep the patterns tagged with the song's style or with no style whose saved tempo is within 1.5 times the song's tempo; it SHALL be off by default. With no search, no filter and the default sort, the panel SHALL group the patterns by instrument, each group collapsible, with its count, its first 4 patterns and a "Show all (n)" button that picks that instrument's chip. Otherwise it SHALL show one list in the chosen order with a line saying how many of the fitting patterns are shown. The list and the cards SHALL sit in a scroll area of fixed height, so the console's other groups stay in place. With 8 fitting patterns or fewer the panel SHALL look as before. The panel's title SHALL keep counting every fitting pattern.

#### Scenario: Search while the song plays
- **WHEN** 97 saved patterns fit, the listener presses P, types "bas" and the song moves to its next phrase
- **THEN** the panel lists only the matching patterns, and the search keeps its text, its caret and the focus after the console updates

#### Scenario: Groups by instrument
- **WHEN** 97 saved patterns fit and no search or filter is set
- **THEN** the panel shows one group per instrument with its count and at most 4 patterns, and "Show all (31)" under the melodies shows the 31 melodies

#### Scenario: Bounded height
- **WHEN** 97 saved patterns fit and the panel is open as cards
- **THEN** the panel is no taller than its scroll area plus the toolbar, and scrolling inside it keeps its position across the console's updates

#### Scenario: No match
- **WHEN** the filters leave no pattern
- **THEN** the panel says no pattern matches and offers a button that clears the search and the filters

#### Scenario: Few patterns
- **WHEN** 6 saved patterns fit
- **THEN** the panel shows them as before, with no toolbar and no groups

### Requirement: Use counts of saved patterns
A saved pattern SHALL record how many times it was brought into a song and the date of the last time: adding it as a new track or replacing a track from the console, and adding it to a song in Compose, SHALL each count once; a preview listen and a session replay SHALL NOT count. The "Most used" sort SHALL order by that count and the "Recent" sort by the later of the last use and the save date. The open cards SHALL show the count and how long ago the last use was, or "never used". The counts SHALL be kept in the backup; patterns saved before this change SHALL read as never used.

#### Scenario: Most used first
- **WHEN** the listener has added "Basso rotto 5" four times and "Basso teso 23" once, and sorts by Most used
- **THEN** "Basso rotto 5" comes before "Basso teso 23"

#### Scenario: Listening does not count
- **WHEN** the listener previews a saved pattern with the headphones and does not add it
- **THEN** its use count does not change

### Requirement: Saved patterns panel on a phone, in the hardware theme and by keyboard
On a screen 400 px wide the toolbar SHALL wrap without horizontal scrolling and the scroll area SHALL take at most 60 % of the screen height. In the hardware theme the search SHALL look like the console's display fields and the scroll area like a recessed panel. The P key SHALL move the focus to the search when the console is shown and no field has the focus; Escape SHALL clear the search, and a second Escape SHALL leave it; the down arrow SHALL move from the search to the first pattern.

#### Scenario: Phone
- **WHEN** 97 saved patterns fit on a 400 px wide screen
- **THEN** the page has no horizontal scroll and the Sound group is reachable within one screen below the panel's scroll area

#### Scenario: Keyboard only
- **WHEN** the listener presses P, types "acido", presses the down arrow and Enter
- **THEN** the first matching pattern plays in preview
