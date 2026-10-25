## Context

`crescendoSong` (`src/song/crescendo.js`) builds `tries`: the candidates of `shapeCandidates` (drawn shape, other developments by weight, other paces), then the same with `maxDetail` 2, 1, 0: 28 on luci-rosse. For each it grows the song, measures the typing with `rushedSteps` up to `crescendo.grown`, and returns the first with none rushed, else the one with the lowest `rushLoad`. `grown` is the later of the last growth step and the last step of the build, so it covers the written part. Measured on luci-rosse: every rushed step is at bar 140 or later (the written part starts at 140; the last growth unit is at 136). The free-duration loop only adds bars before a rushed step that is a growth unit (`units.indexOf(x.at) >= 0`) and runs at most 6 rounds.

## Decisions

### D1. Growth steps
The measure stops at the start of the written part (`crescendo.growth`, the bars of the growth sections). Steps from there on are measured only for the counters.

### D2. Order
Candidate 1 is the drawn shape (unchanged). The others: the candidate list as today, without duplicates, ordered by a weighted draw without replacement from `rng(song.id + '/shapes')`, weights from the style's or artist's `growthShapes` (default weights otherwise), with the less detailed variants (`maxDetail` 2, 1, 0) of the drawn shape placed right after it. Values denied by the radio (`deny`) stay out.

### D3. Cap
8 shapes by default, counting each grown candidate, free-duration regrowths not counted. When none of the 8 meets the target, the search goes on up to twice the cap (16), then keeps the one rushed least. The cap is a setting (Settings, advanced: "Growth shapes tried", 4 to 32, default 8) with a hint: more shapes can find a growth with fewer rushed steps, and take longer to grow. The radio and the Node checks use the default, so sessions and fixtures do not depend on a browser setting.

### D4. Free duration
First find, with the counters, why a growth step inside the growth stays rushed on settimo-cielo (a rushed step that is not a unit, the 6 rounds, the 32-bar limit). Then fix: the bars go before the unit that owns the step. The fix is decided after that finding and written here before code.

### D5. Ideas
Probe Ideas as Live coder before and after; record the shape and length in the DEVLOG; if the 8:27 does not come from the fallback, report it before changing anything else.

## Risks / Trade-offs

- Saved radio sessions and Live coder songs may sound different: `SHAPES_VERSION` warns, as designed.
- A cap of 8 may keep a shape with rushed growth steps that a later candidate would have avoided; the counters show how often across the built-in songs before the cap is fixed.
