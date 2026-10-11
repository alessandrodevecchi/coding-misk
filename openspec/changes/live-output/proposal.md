# Proposal

## Why

The radio can be recorded or exported to a file. The owner wants to send it out live as it plays, sound and picture, through OBS, and to direct it while it runs: layouts, scenes, microphone, sound effects, overlays (#52). It must be solid: the output never stops, even if coding-misk stops or a scene changes.

## What Changes

- **Broadcast window:** a second, clean window of the app with only the picture (the video frame of #27 and #53: layout presets, direction, song card), captured by OBS. The radio keeps running in the app as today, so every tab and control works while live. Presets change inside the picture with a transition, so OBS never cuts.
- **Control bar,** always visible like the player bar, in every tab: ON AIR and time, presets 1 to 5 with a preview and TAKE, Standby. It opens the full control room (a panel or its own window): connection to OBS, Go live and End, the source (the radio first), audio levels, microphone, a pad of sound effects, overlays (song title, text banner, an animated call to follow), status (dropped frames, recording).
- **In two steps:** first the broadcast window, the minimal bar, OBS scenes and the automatic Standby, to try a private live session; then the mixer, microphone, pad, overlays and the full control room.
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
