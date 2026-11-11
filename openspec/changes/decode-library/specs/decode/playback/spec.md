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

## ADDED Requirements

### Requirement: A video without sound

A video without an audio track SHALL open and play in Decode like any track, in silence: the transport SHALL run for the video's length, read from the file's header without decoding it, and Play, Pause, Stop, seeking, Previous, Next and Autoplay SHALL work as for any track. The picture SHALL NOT be shown in this change.

#### Scenario: A screen recording in a mixtape

- **WHEN** a mixtape holds a song, a video without sound and another song, and Autoplay plays it
- **THEN** the video's turn lasts its length in silence with the placeholder in the code column, and the next song follows at its end

### Requirement: The code column of a video without sound

While a video without sound plays, the code column SHALL show a short placeholder in comment form instead of decoded code, in the app's language, with a few variants that change while it plays; nothing SHALL be evaluated and nothing SHALL sound. No analysis SHALL be stored for it, so its row gets no ◆ or ◇ mark.

#### Scenario: Nothing stored

- **WHEN** a video without sound has played
- **THEN** no analysis of it is stored and its row shows only the video icon and the "no sound" mark

