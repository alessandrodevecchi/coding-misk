# Spec Delta

## Purpose

Render a video of a song, a saved session or a radio export faster than real time, following a direction chosen in the settings.

## ADDED Requirements

### Requirement: Fast video

When the Export display says VIDEO and the speed is fast, exporting a song, a saved session or a radio range SHALL render the audio offline, draw every frame from the timeline at the chosen quality, and save one video file with picture and sound, faster than real time.

#### Scenario: Song video
- **WHEN** the listener exports a 3 minute song as video
- **THEN** one MP4 (or WebM) of 3 minutes plus its tail is saved, faster than real time, with picture and sound in sync

#### Scenario: Visuals follow the music
- **WHEN** a kick plays at 12.5 s in the audio
- **THEN** the stage reacts to it in the frames at 12.5 s, as it does live

### Requirement: Direction

Settings → Video SHALL hold the direction: layout, visual (each song's own, one fixed, or a new one every song or every section), soul (off, panel beside the code, or full frame), song card and quality. The direction SHALL be saved as named presets. No other screen SHALL hold its own copy of these settings.

#### Scenario: Fixed visual
- **WHEN** the visual is fixed to Pixel and a session of three songs is exported as video
- **THEN** every frame shows the Pixel visual

#### Scenario: Soul full frame
- **WHEN** the soul is set to full frame
- **THEN** the stage area shows the soul of the song playing in place of the visual

### Requirement: Radio shortcut

The radio panel SHALL show a gear beside its Export that opens Settings → Video.

#### Scenario: Gear
- **WHEN** the listener taps the gear beside the radio's Export
- **THEN** the settings open at the Video section
