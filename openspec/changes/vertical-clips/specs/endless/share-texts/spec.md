# Spec Delta

## Purpose

Propose a title and a description in the app's voice for every video or recording the app saves, ready to copy and edit.

## ADDED Requirements

### Requirement: Texts proposed

For every fragment, long video and audio recording it saves, the app SHALL propose a title and a description. The description SHALL hold, when they apply: a list of the songs with their start times, the genres, the length, the seed, and two or three lines drawn from a pool in the app's mood. Artist names SHALL not be listed. The texts SHALL be saved in a text file next to the video or recording.

#### Scenario: Radio export
- **WHEN** the listener exports 60 minutes of radio as video
- **THEN** a text file is saved next to the video with a title, the songs with their start times (`00:00 Song title`), the genres, the length, the seed and a few lines in the app's mood

#### Scenario: Fragment
- **WHEN** a fragment is saved
- **THEN** its texts carry its label, the line pointing to the full video when set, and a short line in the app's mood

### Requirement: Copy, edit and draw again

A small panel SHALL show the proposed texts after a save, and from the saved sessions and songs on demand, with buttons to copy the title, copy the description, and draw new lines from the pool. The same seed SHALL give the same texts.

#### Scenario: Draw again
- **WHEN** the listener presses "draw again" in the panel
- **THEN** the title and the mood lines change, and the song list, genres and seed stay the same

### Requirement: Agent access

The texts SHALL be available from the browser console for a song, a saved session or a recipe file.

#### Scenario: Agent asks for texts
- **WHEN** an agent asks for the texts of a saved session
- **THEN** it gets the title and the description as plain text
