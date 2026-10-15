## 1. Renderer

- [x] 1.1 `drawTimeline(ctx, area, song, bar, opts)`: rows, clips, sections, playhead, past shading, step marks with comments, whole or window
- [x] 1.2 Future rules (`auto`, `show`, `hide`) using `hasBuild` and the live switch
- [x] 1.3 Track column renderer (lit tracks, next track and bars left; levels per track still to add)
- [ ] 1.4 Cache the static part per song; redraw the moving parts (the song shape is cached; the drawing itself is redone each frame)

## 2. Views and presets

- [x] 2.1 Areas for the six views in `liveAreas`, with transitions
- [x] 2.2 Presets in the control room; preset setting for future visibility
- [x] 2.3 Session video layouts (live recording and fast video) with the same views

## 3. Radio

- [x] 3.1 Song on air from the radio window, restart with each song, redraw after steering and curves

## 4. Checks and docs

- [x] 4.1 `check:live` and `check:video`: areas of the new views, future rules, a fast video frame with timeline
- [x] 4.2 Screenshots of the six views for the owner
- [x] 4.3 Guide card (English and Italian), `docs/ARCHITECTURE.md`, DEVLOG
