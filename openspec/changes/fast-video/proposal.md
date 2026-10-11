# Proposal

## Why

A video records in real time (#27). With the fast audio export and its timeline (#8) the owner wants the video fast as well, in one click, for songs, saved sessions and the radio (#53). For the radio and long sessions the owner also wants to direct the video: which visuals, whether the soul shows and how.

## What Changes

- **Fast video in one click:** the audio renders offline, then the app draws every frame from the timeline (stage, code typing itself, voice lines, song card, soul) faster than real time, encodes them and joins them with the audio into one MP4 (WebM where MP4 cannot be made). Songs, saved sessions and the radio export (up to now, next N songs, length) all get it when the Export display says VIDEO.
- **Direction ("regia") in Settings → Video**, extending the settings that exist (no second place): layout as now; visual: each song's own, one fixed visual, or a new one at every song or section; soul: off, as a panel beside the code, or full frame (in place of the visual); song card and quality as now. Presets with a name, like the compilation's.
- **Shortcut:** a gear beside the radio's Export opens Settings → Video.
- **Real time video stays** for the live radio and the whole tab layout.
- **Noted for later:** the soul shown with its monitor shell or the bare screen; the Settings → Video preview playing the direction over time; presets shared with the YouTube live (#52).

## Capabilities

### New Capabilities

- `endless/fast-video`: render a video of a song, a session or a radio export faster than real time, following a direction set in the settings.

## Impact

- Visuals (a frame drawn at a given time from given levels, besides the live loop), the video frame composer, the fast export flow, settings (direction and presets), radio panel gear, i18n, Guide.
