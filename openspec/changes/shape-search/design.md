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

## Follow-up decisions (owner, 2026-10-25)

### D6. Try all shapes, random order
Two advanced settings next to "Growth shapes tried", read only by Compose:

- **Try all growth shapes** (`coding-misk-shape-all`, off by default). On: the cap is lifted and every candidate of the list may be measured (the drawn shape, the other developments and paces, and their less detailed variants; 28 on luci-rosse today, more when shapes are added). "Growth shapes tried" is shown disabled while it is on.
- **Keep** (`coding-misk-shape-keep`, owner review 2026-10-25), what Try all keeps, enabled only while Try all is on: **first good one** (default: the first shape that meets the target in the chosen order, else the one rushed least; the search stops at it, as the shapes after it cannot change the result, so Try all with the fixed order reproduces the search before `SHAPES_VERSION` 4) or **best one** (every candidate measured; the one that gives the shortest whole song among those that meet the target, else the one rushed least).
- **Random order** (`coding-misk-shape-random`, on by default). On: the order of D2 (the drawn shape and its less detailed variants, then a weighted draw from the song's seed). Off: the fixed order used before `SHAPES_VERSION` 4, applied to the shape drawn today: the drawn development first, the other developments by weight (by type last), by type with the other paces, then the same list again with `maxDetail` 2, 1, 0. The cap applies to both orders.

The values are stored only when they differ from the default, enter the Compose growth key (with the cap, for the natural growth only, so a stored growth with other settings is not reused), and have a hint in English and Italian. The radio, the song cards and the Node checks use the defaults, so sessions and fixtures do not depend on a browser setting. `growth:probe` gets `--all`, `--keep first|best`, `--fixed` and `--long <minutes>`.

### D7. Long songs
After the search keeps a shape, the length of the whole grown song (every section: growth and written part, seconds from each section's tempo and meter) is measured. Over the threshold, every candidate not yet measured is measured too, and of all those that meet the target the one that gives the shortest whole song is kept; when none meets it, the one rushed least (as today). In Compose and in the radio (the radio's planned budget usually keeps songs shorter, so the rule rarely fires there). The counters say when the rule fired and the length before and after. The threshold is an advanced setting (owner review 2026-10-25: "Long song from", in minutes, 5 to 60, default 15 = 900 s, `coding-misk-long-song`, the default not stored, part of the Compose growth key); the radio and the checks use the default.

### D8. Long literal lists written as ramps
A written sweep (a clip's `cutoffEnd` or `gainEnd`) compiles to a list with one value per bar, rotated to the clip's start (`.lpf("<773.91 795.65 … 752.17>")`). In a Live coder growth such a list can span hundreds of bars (kellerlicht 398 and 117 values, ghost-protocol-scenes 458, circuito-ruggine 242, demo-synth-lab 175, cavo-scoperto 138, next-chapter 139), and its typing makes the free duration wait.

Rule, in the code of a Live coder growth only (`build.crescendo.coder`), before the functions are folded (so `res(a, b)` and the song functions take the ramp as their argument): a quoted mini-notation alternation `"<…>"` whose values, with `!n` repeats expanded, are 16 or more plain numbers, and that moves linearly per bar after a rotation (every value within 0.011 of the line through the ramp's first and last value: the compiler rounds to 0.01), is written

`saw.range(a, b).slow(n).segment(1)` and `.late(r)` when the ramp starts at bar `r` of the list,

with `n` the number of values, `a` the first value of the ramp and `b = a + n · step`, so bar `k` of the ramp gets `a + k · step`: `segment(1)` samples the signal once per bar at its start, so every bar keeps one value, as the list did (the values differ only by the list's rounding to 0.01). Lists of the levels the hidden mixer owns (`gain`, `postgain`, `velocity`, `mask`) and lists that are not linear (melodies, note groups) stay as they are, with the human-typing strategies. Classic and Crescendo code do not change. The typing measure reads the ramp, so growths change: `SHAPES_VERSION` 5.

Verified by: a pure check that the ramp gives the same value as the list at every bar (Strudel in Node, haps of both patterns over two full periods, within 0.01), `check:mixer`, `check:functions`, `check:strudel` (every function in the catalog), `check:compact-code` where it applies, and the level checks of kellerlicht; any audible difference is reported, not assumed away.

### D9. kellerlicht at v0.5.0
Generate kellerlicht's Live coder code with the v0.5.0 code in a separate temporary worktree (read only, removed afterwards) and say whether the long sweep line was already typed there, and how long.

### D10. Growth in the background check
`check-growth-background.cjs` fails on "kellerlicht: Play during the growth shows the mark on Play". Investigate with a real recompute (the `coding-misk-growths` store cleared, other songs, other shape settings). Expected behaviour, as the owner sees it: switching Classic to Live coder keeps playing the old version until the growth is ready, then switches. If the app does that, the check is wrong and is fixed to test that behaviour; else the app is fixed. The finding is written here.

### D11. Radio check 5.5
Check 5.5 ("the chooser on air reaches a curve point sooner than the default chooser") depends on one case. Rewritten over several songs and several curve points: for each pair, the bars each chooser needs to reach the point; the check passes when the on-air chooser needs fewer bars in total and is not later on most pairs. Same intent, a fair measure.

## Risks / Trade-offs

- Saved radio sessions and Live coder songs may sound different: `SHAPES_VERSION` warns, as designed.
- A cap of 8 may keep a shape with rushed growth steps that a later candidate would have avoided; the counters show how often across the built-in songs before the cap is fixed.
- D7 measures every shape for long songs: a growth over 15 minutes takes longer to compute (up to the time of "Try all"). It runs in the background worker in Compose; the radio grows ahead of time.
- D8 changes how a sweep reads in the Live coder: a ramp in signals instead of the values bar by bar. The sound should be the same up to the list's rounding; the checks measure it, and a difference is reported.
