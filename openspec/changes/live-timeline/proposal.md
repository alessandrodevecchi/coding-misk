## Why

For live output and long videos the owner wants the audience to see how the song is made: when tracks come in, where the song is going. Six mockups (local notes) showed combinations of visual, code, soul and timeline; all are wanted (`#65`).

## What Changes

- **A timeline area** for the live picture and session videos: tracks in rows with their clips, sections on top, a playhead on the current bar, live build steps as marks with their comment.
- **New views** combining the timeline with the existing areas: visual + timeline, visual + code + timeline, code + timeline, soul + timeline, full visual with a floating scrolling timeline, and visual + a track column (tracks lighting up, the next one announced).
- **Whole song or a scrolling window** of bars around the playhead.
- **Future hidden for live build songs.** Regular songs show future clips (dashed). Songs with a live build (in blocks or crescendo) hide what has not happened yet, so they look built on the spot. A preset setting can override this.
- **Radio.** The timeline follows the song on air, starts again with each song, and redraws when steering or curves rewrite the song. No timeline is needed in the Radio tab itself.

## Capabilities

### New Capabilities

- `live-output/timeline`: the timeline area, its views and presets, future visibility rules, behaviour in Compose, radio and session videos.

### Modified Capabilities

- None in their requirements; the live presets list grows with the new views.

## Impact

- `src/live/presets.js` (views and areas), `src/video/video.js` and `layout.js` (drawing the timeline in the live picture and in videos), a timeline renderer for canvas, the data already in `buildMap` and `stateAt`, the control room preset list, settings, Guide card, `docs/ARCHITECTURE.md`, `check:live` and `check:video`.
