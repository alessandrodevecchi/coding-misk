# Spec Delta

## Purpose

Export the radio faster than real time over a chosen range: up to now, the next N songs, or a target length.

## ADDED Requirements

### Requirement: Radio export range

The radio SHALL offer a fast export with three ranges: up to now (first song to the song on air), the next N songs (from the song on air), and a length in minutes (from the song on air until the song that crosses the target ends). With the radio off, the ranges SHALL start from the first song of a new session with the panel's seed and options.

#### Scenario: Next 3 songs
- **WHEN** song 4 is on air and the listener exports the next 3 songs
- **THEN** one file holds songs 4, 5 and 6 with their transitions, as the radio would play them

#### Scenario: Target length
- **WHEN** the listener exports 60 minutes
- **THEN** the file lasts at least 60 minutes and ends at the end of a song

### Requirement: Long exports

A fast export of any length SHALL render in blocks and encode them as they come, so memory does not grow with the length. The cut between blocks SHALL not be audible: each block starts a few seconds early so notes and tails cross the cut.

#### Scenario: Seam between blocks
- **WHEN** a song is exported in blocks and in one piece
- **THEN** both files have the same length and the same loudness over time, without a click at the cuts

### Requirement: Radio export files

The radio export SHALL save the audio, the timeline, the track list and the recipe.

#### Scenario: Files
- **WHEN** a radio export ends
- **THEN** the audio, `.timeline.json`, `-tracklist.txt` and `-recipe.json` are saved
