# Spec Delta

## Purpose

Send the radio out live through OBS, with a picture composed by the app, and direct it from a Live tab: presets, scenes, microphone, sound effects and overlays, without the output ever stopping.

## ADDED Requirements

### Requirement: Broadcast window

The app SHALL open a broadcast window that shows only the composed picture of the session playing in the app, at the chosen quality (1920×1080 at 30 fps first), for OBS to capture. It SHALL show no controls, and every control of the app SHALL keep working while it is open.

#### Scenario: Captured by OBS
- **WHEN** the broadcast window is open and the listener changes a curve in the Radio tab
- **THEN** the picture in the window follows the session, with no app controls in it

### Requirement: Presets and transitions

The broadcast picture SHALL follow a preset: visual only, visual and code, visual with code and soul, soul only, code only; each with or without the song card. Changing preset SHALL animate from one layout to the other without a cut.

#### Scenario: Change preset on air
- **WHEN** the listener picks "Code only" while "Visual only" is on air
- **THEN** the picture moves to the new layout in a short transition and the sound does not stop

### Requirement: Control bar and control room

A control bar SHALL stay visible in every tab while live output is on: ON AIR and time on air, presets with a preview and TAKE, Standby. The control room, opened from the bar, SHALL connect to OBS on this computer, show the connection state, and let the listener go live and end, pick the source (the radio), pick presets with a preview, switch scenes (Live, Standby), set audio levels, mute and duck the microphone, play sound effects from a pad, and show or hide overlays. It SHALL show the time on air, dropped frames and whether OBS also records.

#### Scenario: Go live
- **WHEN** OBS is connected and the listener presses Go live and confirms
- **THEN** OBS starts sending, the tab shows ON AIR and the time on air

#### Scenario: OBS not running
- **WHEN** OBS is not running or its control channel is off
- **THEN** the tab says so and explains how to turn the control channel on; nothing else breaks

### Requirement: Continuous output

The output SHALL never stop because of coding-misk. If the app stops answering for a few seconds, OBS SHALL switch to the Standby scene (a music bed and an image); when the app answers again OBS SHALL switch back to Live with a transition.

#### Scenario: The app stops
- **WHEN** the app freezes during a live session
- **THEN** within five seconds the output shows Standby, then returns to Live once the app is back, and the output never stops

### Requirement: Microphone, sound effects and overlays

The listener SHALL be able to speak over the music (the music lowers while speaking), play short sound effects from a pad of their own files, and show overlays on the picture: the song title (automatic when a song starts, or by hand), a text banner, and an animated call to follow.

#### Scenario: Speaking
- **WHEN** the microphone is on and the listener speaks
- **THEN** the music lowers and comes back when they stop

### Requirement: Long sessions

A live session SHALL run for hours without the app's memory growing without limit.

#### Scenario: Three hours
- **WHEN** a radio session runs live for three hours
- **THEN** the app's memory stays within a fixed bound
