# Spec Delta

## Purpose

The picture of a video file on the stage while Decode plays it.

## ADDED Requirements

### Requirement: The track video on the stage

While Decode plays a video file (with or without sound) and the look is Video, the stage SHALL show the file's picture at the file time heard: Play, Pause, Stop, seeking, Previous, Next and Autoplay's hand-over SHALL move the picture with the sound. The picture SHALL be muted; the track's sound SHALL keep coming only from Decode's decoded original. Past the picture's end the last frame SHALL stay. With another look, Decode SHALL NOT open the file's picture.

#### Scenario: Seek in a video

- **WHEN** Decode plays a video file with the Video look and the user seeks to 2:00
- **THEN** the stage shows the frame at 2:00 within 0.25 s

#### Scenario: A video without sound in a mixtape

- **WHEN** Autoplay reaches a video without sound with the Video look
- **THEN** the stage shows its picture for its length while the transport runs in silence, and the next track's picture or stage video follows

#### Scenario: Another look

- **WHEN** Decode plays a video file with the Tramonto look
- **THEN** the stage shows Tramonto and no picture of the file is decoded
