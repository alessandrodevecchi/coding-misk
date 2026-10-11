# Spec Delta

## Purpose

Send the radio out live through OBS, with a picture composed by the app, and direct it from a Live tab: presets, scenes, microphone, sound effects and overlays, without the output ever stopping.

## ADDED Requirements

### Requirement: Broadcast page

The app SHALL provide a broadcast page that shows only the composed picture at the chosen quality (1920×1080 at 30 fps first) and plays the session's sound, for OBS to load. It SHALL show no controls.

#### Scenario: Loaded in OBS
- **WHEN** OBS loads the broadcast page
- **THEN** OBS receives the picture and the sound of the radio session, with no app controls in the picture

### Requirement: Presets and transitions

The broadcast picture SHALL follow a preset: visual only, visual and code, visual with code and soul, soul only, code only; each with or without the song card. Changing preset SHALL animate from one layout to the other without a cut.

#### Scenario: Change preset on air
- **WHEN** the listener picks "Code only" while "Visual only" is on air
- **THEN** the picture moves to the new layout in a short transition and the sound does not stop

### Requirement: Live tab

The Live tab SHALL connect to OBS on this computer, show the connection state, and let the listener go live and end, pick the source (the radio), pick presets with a preview, switch scenes (Live, Standby), set audio levels, mute and duck the microphone, play sound effects from a pad, and show or hide overlays. It SHALL show the time on air, dropped frames and whether OBS also records.

#### Scenario: Go live
- **WHEN** OBS is connected and the listener presses Go live and confirms
- **THEN** OBS starts sending, the tab shows ON AIR and the time on air

#### Scenario: OBS not running
- **WHEN** OBS is not running or its control channel is off
- **THEN** the tab says so and explains how to turn the control channel on; nothing else breaks

### Requirement: Continuous output

The output SHALL never stop because of coding-misk. If the broadcast page stops answering for a few seconds, OBS SHALL switch to the Standby scene and reload the page; when the page answers again it SHALL resume the session and OBS SHALL switch back to Live with a transition.

#### Scenario: The page stops
- **WHEN** the broadcast page freezes during a live session
- **THEN** within five seconds the output shows Standby, then returns to Live once the page is back, and the output never stops

### Requirement: Microphone, sound effects and overlays

The listener SHALL be able to speak over the music (the music lowers while speaking), play short sound effects from a pad of their own files, and show overlays on the picture: the song title (automatic when a song starts, or by hand), a text banner, and an animated call to follow.

#### Scenario: Speaking
- **WHEN** the microphone is on and the listener speaks
- **THEN** the music lowers and comes back when they stop

### Requirement: Long sessions

A live session SHALL run for hours without the app's memory growing without limit.

#### Scenario: Three hours
- **WHEN** a radio session runs on the broadcast page for three hours
- **THEN** the page's memory stays within a fixed bound
