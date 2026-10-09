# Spec Delta

## Purpose

What the user writes by hand over a live build can be kept as a new version of the song, without touching the original.

## ADDED Requirements

### Requirement: Save as a new version
While the user codes by hand, and under the last code written by hand, a "Save as a new version" action SHALL store the code as a new code song of the user's, titled after the original with a version number ("Song · v2", then v3), linked to the original song, with the original's style, tags and look. The original SHALL stay as it is.

#### Scenario: First version
- **WHEN** the user takes over Primo Segnale, edits the code and saves a new version
- **THEN** a code song "Primo Segnale · v2" appears among the user's songs and Primo Segnale is unchanged

### Requirement: Versions on the original
The card of a song that has versions SHALL list them ("Versions: v2 v3"); picking one SHALL bring its card into view. A version SHALL show which song it comes from and SHALL be deletable after a second press.

#### Scenario: Open a version
- **WHEN** the user picks v2 on the original's card
- **THEN** the card of v2 scrolls into view and is highlighted

### Requirement: Versions from the radio
In the radio, the saved code SHALL keep only the song on air: no silent bars before it and no bars of the next song.

#### Scenario: Radio version
- **WHEN** the user saves a version while coding by hand over the third song of a session
- **THEN** the version's sections are only those of the third song, starting at bar 1
