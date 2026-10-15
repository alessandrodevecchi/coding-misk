## Context

The live picture is drawn by the app tab (`video.live`) into any canvas from the areas of the preset on air (`liveAreas(view, w, h)` in `src/live/presets.js`), with a 0.8 s transition (`lerpAreas`). Session videos use the same composer (`video.composeAt`). The song model gives clips per track, sections, and for live build songs `buildMap` (silent spans and step marks) and `stateAt`.

## Decisions

- **D1. One canvas renderer.** `drawTimeline(ctx, area, song, bar, opts)` draws from the song and the bar only, so live picture, live video and fast video share it; it is pure drawing, no DOM.
- **D2. Views as areas.** New views add a `timeline` area (and `column` for the track column) to `liveAreas`, so presets, transitions and the control room work unchanged. Proposed ids: `visual-tl`, `code-tl`, `visual-code-tl`, `soul-tl`, `visual-float`, `visual-column`.
- **D3. Visibility.** `future: 'auto' | 'show' | 'hide'` per preset; `auto` hides for songs with a live build (`hasBuild` or the live switch) and shows otherwise.
- **D4. Radio data.** The renderer gets the song on air from the radio window (`windowSong`) with absolute bars; a steering rewrite gives a new song object, so the next frame redraws.
- **D5. Look.** Colours per track type from the current look's tokens; sections and steps in the accent colours; readable at 1080p from a distance (row height and label size scale with the area).

## Risks / Trade-offs

- **[Long songs in a narrow area]** → the scrolling window, or bars compressed with a minimum clip width.
- **[Drawing cost at 30 fps]** → cache the static part (rows, clips) per song and redraw only the playhead, past shading and new steps.

## Resolved Questions

- All six combinations are wanted; whole and scrolling timelines are both wanted (owner, 2026-10-15).
- Future hidden for live build songs, in blocks and crescendo (owner, 2026-10-15).
