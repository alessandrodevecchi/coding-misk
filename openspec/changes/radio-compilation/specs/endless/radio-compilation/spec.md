# Spec Delta

## Purpose

A compilation: the radio changes artist, genre, styles and knobs on its own, within limits the listener sets.

## ADDED Requirements

### Requirement: Compilation mode
The radio SHALL offer a compilation button with three states shown by a double lamp: off, change every song, change every 2 to 4 songs (the count drawn from the seed). While on, the chosen artist and styles SHALL be set aside and each change SHALL draw either an artist (from the setup's artists, or a random artist made on the fly when allowed) or a set of styles with knob values in the setup's ranges.

#### Scenario: Every song
- **WHEN** compilation is on "every song" and the next song is planned
- **THEN** it uses a newly drawn artist or styles, joined to the previous song by a transition

### Requirement: Compilation setup
The listener SHALL be able to set the movement (free, or journey: neighbouring genres with an occasional jump that grows with chaos), the genres, styles and artists the compilation may use, whether random artists are allowed, and a range for each knob. Setups SHALL be saved as named presets in the browser, with built-in presets Everything, Journey, Club and Chill.

#### Scenario: Limited genres
- **WHEN** the setup allows only techno and industrial
- **THEN** every drawn artist or style belongs to those genres

### Requirement: Same seed, same compilation
The compilation SHALL be part of the session recipe: the same seed and setup SHALL give the same songs, and a session saved in a playlist SHALL replay the same compilation.

#### Scenario: Replay
- **WHEN** the listener presses Replay on a compilation session
- **THEN** the same artists, styles and songs come back in the same order

### Requirement: Keep a random artist
A random artist made by the compilation SHALL not be saved unless the listener presses Keep on the now playing card.

#### Scenario: Keep
- **WHEN** a random artist is on air and the listener presses Keep
- **THEN** the artist joins the listener's artists in the Artists tab
