# Spec Delta

## Purpose

The player bar is the app's one place to control playback and volume, whatever is playing: a song in Compose, a song from the library, a live build or the radio.

## ADDED Requirements

### Requirement: Bottom player bar
The app SHALL show a low bar fixed at the bottom of the window in every tab, with: play and pause, stop, previous, next, the title of what is playing with its position (time or bar) and a timeline that can be dragged to move inside the song (in the radio, inside the song on air), volume and mute, and an ON AIR light while the radio plays. The bar SHALL NOT cover page content (the page leaves room for it), SHALL fit narrow screens, and SHALL follow the theme: neon in the neon theme, mechanical in the hardware theme. Play and stop SHALL no longer be in the top bar, which keeps the logo, the theme and the language.

#### Scenario: Visible everywhere
- **WHEN** the user moves between Compose, Songs, Radio and the other tabs while music plays
- **THEN** the bar stays at the bottom with the same title and position, and the last content of the page is not hidden behind it

#### Scenario: Radio on air
- **WHEN** the radio plays
- **THEN** the bar shows ON AIR lit and the title of the song on air

### Requirement: Controls in each mode
Play and pause SHALL do what the top play button did (play the song open in Compose, pause, resume; in the radio, pause and resume the radio). Stop SHALL stop any playback. Next and previous SHALL work as follows: for a song from Compose or the library, the next or previous song of the library, which starts playing if music was playing; in the radio, next skips to the next song and previous starts the song on air again from its first bar.

#### Scenario: Next in the library
- **WHEN** a song of the library plays and the user presses next
- **THEN** the next song of the library starts from its beginning

#### Scenario: Previous in the radio
- **WHEN** the radio plays and the user presses previous
- **THEN** the song on air starts again from its first bar

### Requirement: Global volume
The app SHALL have one volume from 0 to 100 % with a mute toggle, remembered between visits, shown in the player bar and next to the radio controls (both always in sync). The volume SHALL change only what is heard: WAV exports and recordings SHALL keep the level they had before.

#### Scenario: Low volume all day
- **WHEN** the user sets the volume to 20 % and reloads the app
- **THEN** the volume is still 20 % and playback is quieter by that amount

#### Scenario: Export unchanged
- **WHEN** the user exports a song as WAV with the volume at 20 %
- **THEN** the file has the same level as with the volume at 100 %

#### Scenario: Mute
- **WHEN** the user presses mute and then unmutes
- **THEN** sound stops and comes back at the previous volume

### Requirement: Draggable timeline
The bar's timeline SHALL follow the position of what is playing, and dragging it SHALL move playback to that point: inside the song for Compose and library songs, inside the song on air for the radio. While the user drags, the timeline SHALL NOT jump back.

#### Scenario: Seek a song
- **WHEN** a song plays and the user drags the timeline to the middle
- **THEN** playback goes on from the middle of the song

#### Scenario: Seek in the radio
- **WHEN** the radio plays and the user drags the timeline to the middle
- **THEN** the song on air goes on from its middle and the radio keeps the same next song

