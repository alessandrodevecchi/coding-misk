# Spec Delta

## Purpose

A radio session can be recorded as audio, with what is needed to describe and replay it.

## ADDED Requirements

### Requirement: Record from now
The radio SHALL have a Record button that records the master output from that moment until it is pressed again or the radio stops, across song changes, in the format chosen in the settings. The global volume SHALL NOT change the recording. While recording, the button SHALL show the time recorded.

#### Scenario: Record and stop
- **WHEN** the user records for two minutes and presses Stop
- **THEN** an audio file of about two minutes is downloaded

### Requirement: Pauses without gaps
Pausing the radio SHALL pause the recording, so the file has no silence for the pause.

#### Scenario: Pause
- **WHEN** the user pauses for one minute during a recording
- **THEN** the recorded time does not grow during the pause

### Requirement: Track list and recipe
When a recording stops, the radio SHALL also download a track list (each song that came on air with its time in the recording, "00:00 Title · artist") and the session recipe (seed, options and steering).

#### Scenario: Track list
- **WHEN** a recording covers two songs
- **THEN** the track list has two lines, the second with the time the second song came on air

### Requirement: Record from the start
"Record from the start" SHALL replay the session from its first song with its recipe (same seed and same steering) and record it.

#### Scenario: Same session again
- **WHEN** the user presses "Record from the start" during the third song
- **THEN** the session restarts from its first song and is recorded
