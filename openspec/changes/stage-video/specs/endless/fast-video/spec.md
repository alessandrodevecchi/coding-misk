# Spec Delta

## Purpose

The fast video and the fragments with the Video look.

## ADDED Requirements

### Requirement: The Video look in a fast video

When a frame of a fast video uses the Video look, the export SHALL draw the video frame at the song's time (the file time for a decoded video file; the time since the part's start modulo the video's length for a stage video), decoded offline from the file, in the size mode, then the render style, then the code, the widgets, the captions and the card as today. The audio SHALL be unchanged.

#### Scenario: Fixed Video

- **WHEN** the visual is fixed to Video and a song is exported as a fast video with the 1-bit render
- **THEN** every frame shows the stage video in 1-bit with the code over it, and the audio equals the same export on Palco

#### Scenario: A decoded video file

- **WHEN** a video file open in Decode is exported as a fast video with the Video look
- **THEN** each frame shows the file's picture at the time of the sound in that frame

### Requirement: Video in the direction

The direction SHALL offer Video as a fixed visual; the "new one every song" and "every section" cycles SHALL NOT pick Video. When a file cannot be decoded, its frames SHALL show the look the stage would show without Video (the song's own look, else Palco) and the export log SHALL say so.

#### Scenario: Cycle every song

- **WHEN** the visual is "new one every song" and a session of five songs is exported
- **THEN** no song shows the Video look

#### Scenario: An undecodable file

- **WHEN** the seeded stage video of a song cannot be decoded
- **THEN** that song's frames show its own look, or Palco when it has none, and the export log names the file

### Requirement: The same videos every export

A fast video SHALL pick the stage video of each song by a seed from the song and the folders' contents, so two exports with the same folders and settings give identical frames. An export of the song open on the stage, started while Video shows a stage video, SHALL use that video for that song.

#### Scenario: Two exports

- **WHEN** the same session of three songs is exported twice with the Video look and the same folders
- **THEN** the frames of both files are identical

### Requirement: Single pass

The fast video SHALL compose the video and the stage in the same frame loop. It SHALL NOT render separate transparent layers to be composited later.

#### Scenario: One file, one pass

- **WHEN** a fast video with the Video look is exported
- **THEN** one file is written by one frame loop, and no intermediate video file is made

### Requirement: Export time with Video

A fast video with the Video look SHOULD take at most twice the time of the same export on Palco (same song, quality, render and layout) and SHOULD stay faster than real time at 1080p30 on the reference machine. These are targets, not limits. The browser check SHALL report the ratio and SHALL warn, not fail, when it is over the target.

#### Scenario: Time ratio

- **WHEN** the browser check exports a 1-minute song at 1080p30 on Palco and with a 12-second stage video, in Normal and in LED
- **THEN** it reports each export's time and ratio, and warns for a ratio over 2

### Requirement: A slow export still completes

An export with Video that takes longer than its target (a very high resolution source, a loaded machine, any other reason) SHALL still complete, with no failure and no cut. The export panel SHALL show the progress and an estimated time left that follows the real speed.

#### Scenario: A slow export

- **WHEN** a stage video in 4K is exported at 1080p60 on a busy machine and the export takes four times the one on Palco
- **THEN** the file is complete, the progress moves to the end, and the time left is updated from the real speed

### Requirement: Video decoding in exports

The export SHALL decode the video's frames in order, at the size the frame needs (smaller for 1-bit, LED, ASCII and Terminal than for Normal and CRT), SHALL reuse a decoded frame when the export's frame rate is higher than the video's, and SHALL keep a short loop's decoded frames when they fit 256 MB.

#### Scenario: Short loop cached

- **WHEN** a song is exported with a 4-second stage video in LED
- **THEN** the export log says the loop was cached and later loops decode no frame

#### Scenario: Higher frame rate

- **WHEN** a 30 fps stage video is exported at 1080p60
- **THEN** each video frame is decoded once and drawn in two frames

### Requirement: Fragments with Video

Vertical fragments SHALL draw the Video look as the fast video does: a fragment's video time SHALL be its time in the song, so a fragment shows the same video frames as the same moment of the full export. A fragment's look "random" SHALL NOT pick Video; its look "Video" SHALL be offered.

#### Scenario: A fragment of a song

- **WHEN** a 9:16 fragment from 0:40 to 1:00 of a song is exported with the Video look in Fill
- **THEN** its frames show the stage video at the same times as the full export's frames from 0:40, cropped to 9:16
