# Spec Delta

## Purpose

Previous and Next on the player bar in Decode, for a track opened from the list or a mixtape.

## MODIFIED Requirements

### Requirement: The player bar

The player bar SHALL play the decoded track like a song: Play, Stop, the timeline, the time and the bar counter of the code. Previous and Next SHALL be enabled only when the open track came from the panel's list or from a mixtape, and SHALL follow the same order as Autoplay: the list with the folder chip, search and order it had when the track opened, or the mixtape's rows. Next SHALL open the next track at once, with Autoplay on or off, starting from the prepared track when it is ready; Previous SHALL open the track before. Rows marked "not found" or waiting for access SHALL be skipped. Next SHALL be disabled at the last track and Previous at the first, except in a mixtape with repeat on, which wraps around. For a track opened with "Choose a file…" or by dropping it, Previous and Next SHALL be disabled. The track opened by Previous or Next SHALL start fresh, as with Autoplay. Starting a song, a playlist or the radio SHALL stop the decoded track, and opening Decode SHALL not stop another player until the user presses Play there.

#### Scenario: Radio then Decode

- **WHEN** the radio plays and the user opens the Decode tab and presses Play
- **THEN** the radio stops and the decoded track plays

#### Scenario: Next from the list

- **WHEN** the user opened track "B" from the "Demos" chip ordered by name, and presses Next while it plays
- **THEN** the next track of Demos by name opens at once and its code starts from its first lines

#### Scenario: Next with a prepared track

- **WHEN** Autoplay is on, the next track is prepared and ready, and the user presses Next
- **THEN** the next track's sound starts at once, without reading or decoding the file again

#### Scenario: Previous

- **WHEN** the user opened the third row of a mixtape and presses Previous
- **THEN** the second row opens

#### Scenario: Ends of the list

- **WHEN** the open track is the first of its list
- **THEN** Previous is disabled, and Next is disabled when it is the last

#### Scenario: Mixtape with repeat

- **WHEN** the last row of a mixtape with repeat on is open and the user presses Next
- **THEN** the first row of the mixtape opens

#### Scenario: A picked file

- **WHEN** the open track was chosen with "Choose a file…" or dropped
- **THEN** Previous and Next are disabled

#### Scenario: A missing row skipped

- **WHEN** the row after the open one is marked "not found" and the user presses Next
- **THEN** the row after it opens
