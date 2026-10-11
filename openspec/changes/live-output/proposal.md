# Proposal

## Why

The radio can be recorded or exported to a file. The owner wants to send it out live as it plays, sound and picture, through OBS, and to direct it while it runs: layouts, scenes, microphone, sound effects, overlays (#52). It must be solid: the output never stops, even if coding-misk stops or a scene changes.

## What Changes

- **Broadcast page:** a clean coding-misk page with only the picture (the video frame of #27 and #53: layout presets, direction, song card), loaded in OBS. Presets change inside the page with a transition, so OBS never cuts.
- **Live tab** (Listen mode): the control room. Connection to OBS, Go live and End, the source (the radio first), presets with a preview, scenes (Live, Standby), audio levels, microphone, a pad of sound effects, overlays (song title, text banner, an animated call to follow), status (time on air, dropped frames, recording).
- **OBS does the output:** scenes, microphone with noise suppression and ducking, sending, local recording. coding-misk drives it over OBS's local control channel (obs-websocket). A scene collection to import is provided.
- **Safety:** a small script inside OBS watches the broadcast page; if it stops, OBS switches to Standby and reloads the page, which picks the session up again.
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
