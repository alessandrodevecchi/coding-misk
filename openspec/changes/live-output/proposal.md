# Proposal

## Why

The radio can be recorded or exported to a file. The owner wants to send it out live as it plays, sound and picture, through OBS, and to direct it while it runs: layouts, scenes, microphone, sound effects, overlays (#52). It must be solid: the output never stops, even if coding-misk stops or a scene changes.

## What Changes

- **Broadcast window:** a second, clean window of the app with only the picture (the video frame of #27 and #53: layout presets, direction, song card), captured by OBS. The radio keeps running in the app as today, so every tab and control works while live. Presets change inside the picture with a transition, so OBS never cuts.
- **Control room in its own browser tab,** next to the full app in another tab: an "On air" monitor (a picture of OBS's output, a couple of times a second) and a "Preview" of the next preset, presets with TAKE, Go live and End, scenes (Live, Standby), then audio levels, microphone, a pad of sound effects, overlays (song title, text banner, an animated call to follow), status (dropped frames, recording). The two tabs talk to each other in the browser.
- **Control bar** in the app, like the player bar: a shortcut with ON AIR, presets 1 to 5 and Standby, and a click opens the control room.
- **In two steps:** first a minimal version to try a private live session (broadcast window, control room with monitors, presets and TAKE, Go live and End, Live and Standby scenes, automatic Standby, OBS set up by hand with a guide); then the full version after the test (control bar, mixer, microphone, pad, overlays, scene collection to import, long session bounds).
- **OBS does the output:** scenes, microphone with noise suppression and ducking, sending, local recording. coding-misk drives it over OBS's local control channel (obs-websocket). A scene collection to import is provided.
- **Safety:** a small script inside OBS watches the app's heartbeat; if it stops, OBS switches to Standby (a music bed of a few coding-misk songs exported to a file, playing in OBS) and back to Live when the app returns.
- **Presets:** visual only, visual and code, visual, code and soul, soul only, code only; each with or without the song card; transitions between them.
- **Later:** playlists and Compose as sources, 1080p60 and 4K, a looping video for Standby, the animated call to follow drawn in the app's style.

## Non-goals

- Writing our own video mixer or sender.
- Platform accounts, titles or chat.

## Capabilities

### New Capabilities

- `endless/live-output`: send the radio out live through OBS and direct it from a Live tab.

## Impact

- A broadcast page (a second entry of the app), the video frame composer (overlays, transitions between presets), a Live tab, an OBS control client, an OBS script and scene collection, settings, i18n, Guide.
