# Spec Delta

## Purpose

Let a song from Compose or the Songs tab lead into the endless radio, so the two feel like one tool.

## ADDED Requirements

### Requirement: Continue in radio
Compose and every song card in the Songs tab SHALL have a "▶ Continue in radio" action. It SHALL stop what plays, open the Radio tab and start a new session whose song 0 is that song. From Compose, song 0 SHALL play from the bar Compose is at; from a card, from its start. Code-only songs (written by hand, no tracks) SHALL NOT offer the action.

#### Scenario: From Compose
- **WHEN** the listener presses "Continue in radio" in Compose at bar 33 of a song
- **THEN** the Radio tab opens, the song plays on from bar 33, and the now playing card shows it as "Your song"

### Requirement: Transition into the radio
The director SHALL plan song 1 after song 0 as after any song: with harmony "compatible", a key a fifth away and a tempo within reach of song 0's last section; the transition from song 0 to song 1 SHALL follow the transition setting. Song 0 SHALL play to its end before its transition.

#### Scenario: Compatible next song
- **WHEN** song 0 ends in A minor at 124 BPM with harmony "compatible"
- **THEN** song 1 is in a key a fifth away from A minor (or A minor when the style has no such key) and within 12 BPM of 124

### Requirement: Styles close to the song
The session SHALL take the styles named in song 0's tags when there are any known ones; else the styles of song 0's genres whose tempo range is closest to song 0's tempo; else the one to three styles whose tempo range and meters are closest. The radio panel SHALL show the chosen styles, and changes made there SHALL apply from the next song prepared, as usual.

#### Scenario: Tagged song
- **WHEN** the song has the style tag "phonk"
- **THEN** the session plays Phonk

### Requirement: Steering from song 1
While song 0 plays, the console SHALL show, in place of its buttons, that console, curves and Extend apply from the next song, and the now playing card SHALL show no curves. They SHALL work as usual from song 1.

#### Scenario: Console on song 0
- **WHEN** song 0 plays
- **THEN** the console says that it applies from the next song

### Requirement: Replay with song 0
The session recipe SHALL keep a copy of song 0 and the bar it started from. Replay and "Record from the start" SHALL play song 0 again and then the same songs.

#### Scenario: Replay
- **WHEN** a session started from a Compose song is replayed
- **THEN** that song plays first, then the same song 1
