## 1. Director and steering

- [ ] 1.1 Director: draw the build style per song; for crescendo songs write the build with `crescendoPath` from silence to the planned song
- [ ] 1.2 Steering and curves: for crescendo songs, replace the remaining steps with `crescendoPath(stateAt(boundary), new destination)`
- [ ] 1.3 Endings on "end" commands follow the song's ending style

## 2. Artists

- [ ] 2.1 Artist format and validator: `buildStyle` weights, `crescendo` block, quirks `slow-growth`, `starts-with-bass`, `always-strips`
- [ ] 2.2 Random artists draw build style and crescendo parameters
- [ ] 2.3 New built-in artist, crescendo only
- [ ] 2.4 Artists tab: edit build style weights with tooltip; "new song from artist" proposes the most likely build style

## 3. Radio

- [ ] 3.1 Crescendo mark on the song card on air
- [ ] 3.2 Transitions between a blocks song and a crescendo song (and with the compact compiler, when present)
- [ ] 3.3 Sessions record the build style; playlist replays identical; recording and export of sessions with crescendo songs

## 4. Checks and docs

- [ ] 4.1 `check:endless`: artists without `buildStyle` draw as before (fixtures unchanged for them); determinism of crescendo songs; steering recompute; bump `DIRECTOR_VERSION` when fixtures change
- [ ] 4.2 Browser check: a radio session with the crescendo artist, steering during the growth, a transition to a blocks song
- [ ] 4.3 `docs/ENDLESS.md`, `docs/ARTISTS.md`, Guide card (English and Italian), DEVLOG
