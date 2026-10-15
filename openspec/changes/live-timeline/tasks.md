## 1. Renderer

- [ ] 1.1 `drawTimeline(ctx, area, song, bar, opts)`: rows, clips, sections, playhead, past shading, step marks with comments, whole or window
- [ ] 1.2 Future rules (`auto`, `show`, `hide`) using `hasBuild` and the live switch
- [ ] 1.3 Track column renderer (lit tracks with levels, next track and bars left)
- [ ] 1.4 Cache the static part per song; redraw the moving parts

## 2. Views and presets

- [ ] 2.1 Areas for the six views in `liveAreas`, with transitions
- [ ] 2.2 Presets in the control room; preset setting for future visibility
- [ ] 2.3 Session video layouts (live recording and fast video) with the same views

## 3. Radio

- [ ] 3.1 Song on air from the radio window, restart with each song, redraw after steering and curves

## 4. Checks and docs

- [ ] 4.1 `check:live` and `check:video`: areas of the new views, future rules, a fast video frame with timeline
- [ ] 4.2 Screenshots of the six views for the owner
- [ ] 4.3 Guide card (English and Italian), `docs/ARCHITECTURE.md`, DEVLOG
