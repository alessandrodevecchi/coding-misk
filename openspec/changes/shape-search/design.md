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

**Finding (2026-10-25, counters with the growth and the written part apart, at 3ed2054).** With the free duration, settimo-cielo has no rushed growth step today, with any opening (all 10 tried): its 3 rushed steps are in the written part. The bars 28 and 49 do not come back; they are rushed only with the fitted duration, by design. Across the five songs and ten openings, every growth step that stays rushed with the free duration is a unit (none is a step that no unit owns), and they appear only on kellerlicht. There, a `reveal` of the acid's cutoff writes the song's cutoff sweep as a literal list of about 130 values (`.res("<1080.77 1084.62 …>", 12)`): about 133 s of typing, so 69 bars before that step. The loop gives at most 32 bars a round, so this one step uses three or four of the six rounds; a second step of the same kind then shows up after the earlier bars, and the rounds run out. What stays is a step that needs over a minute of waiting, more than 32 bars at a time.

**Decision.** No change to the bars the free duration adds. Waiting two minutes or more for one line is not sensible music, and pasting it is not allowed; the cause is how a written sweep is shown, outside this change (noted for the owner). The counters name each rushed growth step that stays and why: `not-unit` (no unit owns it), `rounds` (the six rounds are used up), `limit` (it needs more than 32 bars in one round) or `fitted` (the fitted duration adds no bars). With D1 a shape that keeps such a step is not kept while another meets the target.

**After (2026-10-25, `SHAPES_VERSION` 4).** On kellerlicht the first candidate (melodic, medium, by type) now gets all the bars it needs within the six rounds and meets the target, so it is kept: its growth is 515 bars and the song 675 bars (20:27, before 464 bars and 14:04). The waiting for the long sweep lines makes it long. Shortening it needs a decision of the owner (for example a step that would wait more than a set number of bars counted as rushed, or the sweep shown as a ramp), outside this change.

### D5. Ideas
Probe Ideas as Live coder before and after; record the shape and length in the DEVLOG; if the 8:27 does not come from the fallback, report it before changing anything else.

**Finding (2026-10-25).** Ideas (40 bars at 124 BPM) keeps its drawn shape (slow, medium, masks) with no rushed step and no fallback: the search stops at the first candidate. The 8:27 is 262 bars: a growth of 222 bars, of which 147 are bars the free duration waits for the typing past the budget (151 bars relaxed, two free-duration rounds). It does not come from the fallback, so this change does not touch it. After the change (`SHAPES_VERSION` 4 draws anew: melodic, fast, second section, again the first candidate, no rushed step) Ideas grows to 197 bars, 6:21 (82 bars waited past the budget, one free-duration round). The 5:54 expected is not a length any growth produced in these measures; it is left there.

## Risks / Trade-offs

- Saved radio sessions and Live coder songs may sound different: `SHAPES_VERSION` warns, as designed.
- A cap of 8 may keep a shape with rushed growth steps that a later candidate would have avoided; the counters show how often across the built-in songs before the cap is fixed.
