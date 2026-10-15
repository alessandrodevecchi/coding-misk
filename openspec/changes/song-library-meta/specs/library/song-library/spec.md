## ADDED Requirements

### Requirement: Creation date and app version
A song SHALL carry its creation date and the app version that made it, written when it is made or saved in Compose, from the radio or by the director. The songs of the app SHALL have them filled from their history.

#### Scenario: Save a new song
- **WHEN** the user saves a new song in Compose
- **THEN** its file has today's date as creation date and the current app version

### Requirement: Last played
The app SHALL remember when each song was last played, in the browser and in the settings backup. A play SHALL count after 10 seconds of playback.

#### Scenario: A short listen
- **WHEN** a song plays for 5 seconds and stops
- **THEN** its last played time does not change

#### Scenario: Backup
- **WHEN** the user restores a backup on another computer
- **THEN** the last played times come with it, the latest time winning

### Requirement: Sorts and filters
The song list SHALL sort by recently created and recently played, besides today's sorts, and SHALL filter by never played and by build style (in blocks, crescendo, none), together with today's filters.

#### Scenario: Never played crescendo songs
- **WHEN** the user turns on "never played" and picks the build style crescendo
- **THEN** the list shows only crescendo songs that were never played

### Requirement: Pages
The song list SHALL be split into numbered pages of 20 songs after search, filters and sorting apply to the whole list, with a counter of the songs shown. Changing search, filters or sorting SHALL go back to page 1.

#### Scenario: Search finds a song on a later page
- **WHEN** a song is on page 3 of the full list and the user searches its title
- **THEN** it appears on page 1 of the result

#### Scenario: Counter
- **WHEN** the user opens page 2 of 61 songs
- **THEN** the counter shows 21-40 of 61

### Requirement: Card details
A song card SHALL show its creation date and a mark of its build style when it has one.

#### Scenario: Crescendo song card
- **WHEN** a song declares the crescendo build style
- **THEN** its card shows the crescendo mark
