# Spec Delta

## Purpose

Record a song or a radio session as a video file, with the stage, the code and the audio, ready to upload to YouTube.

## ADDED Requirements

### Requirement: Record a video

The app SHALL record a video of a saved song, of a radio session saved in a playlist, and of the radio while it plays. The video SHALL contain the composed frame and the master audio.

#### Scenario: Video of a saved song
- **WHEN** the listener chooses "Video" for a song
- **THEN** the song plays from the start to the end and the app saves one video file named after the song

#### Scenario: Video of a saved session
- **WHEN** the listener chooses "Video" for a radio session in a playlist
- **THEN** the session replays with its stored songs or recipe, and the video ends after its last song

#### Scenario: Video of the live radio
- **WHEN** the listener starts a video recording while the radio plays
- **THEN** the recording follows the radio until the listener stops it, with pause and resume as for the audio recording

### Requirement: Composed frame

The video frame SHALL be drawn by the app at 1920×1080 and 30 frames per second, independent of the window size. It SHALL NOT show browser chrome, panels or the pointer.

#### Scenario: Small window
- **WHEN** the window is small or the panels cover part of the stage
- **THEN** the video still shows the full stage at 1920×1080

### Requirement: Layouts

The listener SHALL choose a layout before recording. The layouts SHALL be "Visual" (the stage fills the frame with a small title and artist card) and "Visual + code" (the stage beside the code as it types itself). The choice SHALL be remembered.

#### Scenario: Visual + code
- **WHEN** the layout is "Visual + code" and the code changes during the song
- **THEN** the code area of the video shows the same code and typing as the app

#### Scenario: Soul look
- **WHEN** the Soul look is active during the recording
- **THEN** the video shows the soul scene as the stage does

### Requirement: Audio in sync

The video SHALL carry the master audio recorded together with the frames. The volume control SHALL NOT change the recorded audio.

#### Scenario: Volume at zero
- **WHEN** the listener lowers the volume during the recording
- **THEN** the video audio keeps its level

### Requirement: File format

The app SHALL save MP4 (H.264 and AAC) when the browser can record it, otherwise WebM (VP9 or VP8 with Opus). The file name SHALL use the song or session title.

#### Scenario: Browser without MP4 recording
- **WHEN** the browser cannot record MP4
- **THEN** the app saves a WebM file and tells the listener the format

### Requirement: Progress and cancel

While a video records, the app SHALL show the elapsed and total time and a Cancel action. Cancel SHALL stop playback and discard the video. Only one recording (audio or video) SHALL run at a time.

#### Scenario: Cancel
- **WHEN** the listener cancels a video recording
- **THEN** playback stops, no file is saved, and the app says the recording was cancelled
