# Spec Delta

## Purpose

Playing decoded tracks one after another: the Autoplay switch, which track comes next, how it is prepared before the end of the playing one, and how the two hand over.

## ADDED Requirements

### Requirement: The Autoplay switch

The Decode tab SHALL have an Autoplay switch, off by default. Its state SHALL be remembered across reloads. With Autoplay off, a track that ends SHALL stop as today. The switch SHALL be shown only where folders are available.

#### Scenario: Default

- **WHEN** the app opens for the first time
- **THEN** Autoplay is off and a track that ends stops

#### Scenario: Remembered

- **WHEN** the user turns Autoplay on and reloads the page
- **THEN** Autoplay is still on

### Requirement: The next track

When a track opens from the list, the tab SHALL remember the list as it was then: the chosen folder chip, the search text and the order. When a track opens from a mixtape, the tab SHALL remember the mixtape and the row. With Autoplay on, the next track SHALL be the track after the playing one in that list or mixtape, read when the next track is prepared, so files added in the meantime count. A track opened with "Choose a file…" or by dropping it SHALL have no next track.

#### Scenario: Filtered list

- **WHEN** the "Demos" chip is active, the order is by name, Autoplay is on and the track "B" of Demos ends
- **THEN** the next track of Demos by name after "B" opens, even if a track of another folder would come first by name

#### Scenario: Order by recent

- **WHEN** the order is "Recent", the user opens the third track of the list and Autoplay is on
- **THEN** the next track is the fourth of the list as it was ordered when the third opened, even though the third has become the track opened last; the order by recent is taken again only when the user picks a chip or an order, or opens the panel again

#### Scenario: A dropped file

- **WHEN** Autoplay is on and a dropped file ends
- **THEN** the tab stops, as with Autoplay off

### Requirement: Skipped rows and the end

Rows marked "not found" or waiting for access SHALL be skipped. At the end of the list the tab SHALL stop. At the end of a mixtape the tab SHALL stop, or start again from its first row when the mixtape's repeat is on.

#### Scenario: End of the list

- **WHEN** the last track of the list ends with Autoplay on
- **THEN** the tab stops

#### Scenario: A missing row

- **WHEN** the next row of the mixtape is marked "not found"
- **THEN** it is skipped and the row after it plays

### Requirement: The next track is prepared ahead

With Autoplay on, the tab SHALL prepare the next track about 30 seconds before the playing track ends (at once when less than that remains): it SHALL read the file, decode its sound, look up its stored analysis and start its Live analysis of the first bars. Preparing SHALL NOT cause a main-thread task over 100 ms or an audible glitch in the playing track.

#### Scenario: Prepared before the end

- **WHEN** Autoplay is on and a 3-minute track reaches 2:30
- **THEN** the next track is read, decoded and its Live analysis has started before the first track ends

### Requirement: One prepared track within a memory budget

Only one track SHALL be prepared at a time. A prepared track SHALL be dropped when the playing track changes, the list or mixtape changes its next track, or Autoplay is turned off. The prepared track's decoded sound SHALL stay within a memory budget of 120 MB; a track whose sound would not fit SHALL be read but decoded only at the hand-over.

#### Scenario: A long next track

- **WHEN** the next track is 9 minutes long
- **THEN** it is read before the end and decoded when the playing track ends

#### Scenario: One at a time

- **WHEN** the user changes the folder chip while a next track is prepared
- **THEN** the prepared track is dropped and the new next track is prepared instead

### Requirement: The next track starts fresh

The next track SHALL start in Live, or in Full when a full analysis of it is stored and current. Its code SHALL start from the beginning, as when the track is opened by hand, with the track's own stored settings or the defaults. The tab's title, artist, file row and stage SHALL show the new track.

#### Scenario: Full stored

- **WHEN** the next track has a stored full analysis
- **THEN** it starts in Full without analysing again

#### Scenario: Code from the beginning

- **WHEN** the next track starts
- **THEN** the code column starts from the new track's first lines, not from the previous track's code

### Requirement: Hand-over between two tracks

When the next track is ready at the end of the playing one, its sound SHALL start where the playing track's sound ends, with no gap over 20 ms. When it is not ready, the tab SHALL wait in silence; when the wait passes about 3 seconds, the next track's sound SHALL start and its code SHALL join when its analysis has found the tempo.

#### Scenario: Ready

- **WHEN** the next track was prepared and the playing track ends
- **THEN** the next track's sound starts within 20 ms of the end

#### Scenario: Not ready

- **WHEN** the next track is still being decoded when the playing track ends
- **THEN** there is a pause, and if it lasts about 3 seconds the next track's sound starts and its code appears when the analysis is ready

### Requirement: A next track that fails

A next track that cannot be opened (unreadable, too long, without sound, gone) SHALL be skipped with a short note and the track after it SHALL be tried; when no playable track remains, the tab SHALL stop.

#### Scenario: An unreadable next file

- **WHEN** the next file of the list cannot be decoded
- **THEN** a note names it, it is skipped and the track after it plays
