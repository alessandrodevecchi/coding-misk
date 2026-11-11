# Spec Delta

## Purpose

The session video with the Video look.

## ADDED Requirements

### Requirement: The Video look in a session video

A session video (real time) SHALL record the stage as it is, the Video look included: the video picture in its size mode and render, with the code, the widgets, the captions and the card over it as in the chosen layout. While it records, the stage SHALL count as visible, so a hidden stage or another tab SHALL NOT drop the video from the file. The file's audio SHALL be the master output only.

#### Scenario: Recording with a stage video

- **WHEN** the user records a session video of a song with the Video look and the LED render
- **THEN** the file shows the stage video in LED with the code beside it, in sync with the song

#### Scenario: Stage hidden while recording

- **WHEN** the user scrolls the stage out of view during the recording
- **THEN** the file keeps showing the video

#### Scenario: Decode real time export

- **WHEN** a video file in Decode is exported in real time with the Video look
- **THEN** the file shows the track's picture in sync with its sound
