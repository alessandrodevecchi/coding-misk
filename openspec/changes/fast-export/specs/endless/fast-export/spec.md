# Spec Delta

## Purpose

Export songs and saved radio sessions as audio files faster than real time, with the same sound as playback, in WAV, FLAC, MP3 or Opus.

## ADDED Requirements

### Requirement: Fast export

Exporting a song or a saved radio session as audio SHALL render it faster than real time, without playing it aloud. The render SHALL use the same code, tempo map, section fades and live build steps as playback. Playback in the app SHALL keep working during the export.

#### Scenario: A three minute song
- **WHEN** the listener exports a three minute song as audio
- **THEN** the file is saved in a fraction of the song's length, with the song's full length plus its reverb tail

#### Scenario: Same sound
- **WHEN** the same song is exported fast and in real time
- **THEN** both files have the same length within a beat, and per instrument levels within a small tolerance

#### Scenario: Live build song
- **WHEN** a song with live build steps is exported
- **THEN** each part of the file has the code of its step, as heard in playback

### Requirement: Formats

The listener SHALL choose the audio format in the settings: WAV (16 bit), FLAC (lossless, 16 bit), MP3 (320 or 192 kbps) or Opus (192 kbps). The display next to Export SHALL show the format. The file extension SHALL match the format.

#### Scenario: FLAC
- **WHEN** the format is FLAC and the listener exports a song
- **THEN** the app saves a `.flac` file that decodes to the same samples as the WAV export

### Requirement: Progress and cancel

While a fast export runs, the Export button SHALL show its progress and a tap SHALL cancel it. Only one export SHALL run at a time.

#### Scenario: Cancel
- **WHEN** the listener taps Export during a fast export
- **THEN** the export stops and no file is saved

### Requirement: Real time fallback

When a fast export fails, the app SHALL say so and export the song in real time instead. A setting SHALL let the listener always export in real time. Video and the live radio recording SHALL stay real time.

#### Scenario: Render fails
- **WHEN** the fast render throws an error
- **THEN** the app shows a message and records the song in real time, in the chosen format

### Requirement: Saved sessions

A radio session saved in a playlist SHALL be exportable as one audio file: its songs joined with their transitions, as the session plays.

#### Scenario: Session export
- **WHEN** the listener exports a saved session as audio
- **THEN** one file holds every song of the session in order, with the transitions

### Requirement: Timeline

A fast export SHALL also save a timeline JSON file next to the audio, with the same name. It SHALL hold the song title, the length in seconds, the tempo map, the sections with their start times, the code of each live build step with its start time, the voice lines with their times, and for each instrument its onsets with time, length and level. Times SHALL be seconds from the start of the audio file.

#### Scenario: Timeline next to the audio
- **WHEN** the listener exports a song fast as FLAC
- **THEN** the app saves `Song.flac` and `Song.timeline.json`, and the timeline's first kick onset matches the first kick in the audio within 10 ms
