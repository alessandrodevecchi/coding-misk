## Context

`reused-lines` D8 types a new line of a coming step earlier, muted, at a step of the written part with time to spare (`planWritten` in `src/live/written-plan.js`). The limits approved to start with (`{ atOnce: 2, bars: 32, muted: 4, margin: 2, section: true }`) plan 0 lines over the 38 built-in songs. The analysis of 2026-10-26 (owner's local notes) measured 42 combinations:

| level | section | bars | muted | at once | margin | lines | where | longest muted wait |
|---|---|---|---|---|---|---|---|---|
| Today | yes | 32 | 4 | 2 | 2 s | 0 | - | - |
| Careful | no | 32 | 4 | 2 | 2 s | 1 | switch-prima-luce 176 to 192 | 28 s |
| Balanced | no | 32 | 8 | 2 | 2 s | 2 | + crescendo-filo-di-luce 182 to 190 | 28 s |
| Generous | no | 64 | 8 | 2 | 2 s | 2 | switch-prima-luce from 152 | 71 s |

Wider limits than Generous add nothing. Reused lines (15) and the section changes of luci-rosse, settimo-cielo and kellerlicht are the same at every level; each line ahead removes one rushed step.

Why so few: the written part has 296 steps, 74 with more than 2 s to spare, and 13 of those come before a step with a new line; the others come before edits of lines already shown, which are not typed ahead. A new line costs 6 to 33 s of typing (median 14 s).

The growth has more quiet steps. Letting growth steps host lines of the written part gave 2 to 7 lines in 6 songs with the Balanced limits (partial measure). Lines born in the growth could not be measured: the compiler keeps no line info (header, key, kind) for growth steps today.

## Goals / Non-Goals

**Goals:** the Balanced limits by default; lines typed ahead at growth steps, for lines of the growth and of the written part; the growth shape kept as today; checks that read the limits and cover the growth.

**Non-Goals:** Crescendo and Classic; the levers in Future work; a setting in the interface; the general speed of the section changes.

## Decisions

### D1. Balanced limits by default
`AHEAD = { atOnce: 2, bars: 32, muted: 8, margin: 2, section: false }`. With `section: false` the look-ahead may cross the next section change, still at most 32 bars. With `muted: 8` a line may be typed ahead while up to 7 muted lines are shown (crescendo-filo-di-luce: the break shows 6 muted lines, the crash is typed among them and everything is unmuted together at the drop). The override `globalThis.codingMiskAhead` stays, read when a plan is made. Alternative: Careful (1 line, check unchanged); rejected by the owner. Alternative: Generous (71 s muted wait); rejected, a minute of a muted line on screen is long.

### D2. Steps of the growth host lines ahead
`planWritten` (renamed or kept, the plan covers the whole song) plans lines ahead from the first step after bar 0 to the end of the song. A growth step is measured as a written step is today (usable time minus the typing need, lean human typing), on the code of the kept growth. A step hosts a line only when its spare time covers the line's typing plus the margin, and a rushed step never hosts one. Targets are new lines of coming steps within the look-ahead, in the growth or in the written part, so a line may be typed ahead across the start of the written part. Bar 0 never hosts a line: the song starts from empty code. The same limits apply in both parts (one typist for the whole song).

### D3. Line info for growth steps
`codeWith` returns, for growth steps too, the info the plan needs (header, key, kind `play`, the text) so a growth step's new lines can be targets and a line ahead can be placed muted in its final form in the place it takes at its step. A target is a pattern line typed new at its step (no like line above, no earlier line to copy, no returning line to unmute), as in `reused-lines` D8. A line ahead that its own step would still type (its place moved, another line took it) is left out by the final pass, as today.

### D4. The shape search ignores lines ahead
The shape search scores each tried shape on its growth without lines ahead, as today; lines ahead are planned once, on the kept shape. So the kept shape of every song stays the same, and `SHAPES_SEED` stays 5. The Live coder code fixtures move (lines ahead are shown), so `SHAPES_VERSION` goes up and `npm run durations` runs in the same commit. Alternative: score shapes with lines ahead; rejected, every growth would be planned twice per shape and the kept shapes could move for a small gain.

### D5. Checks
- The D8 case of `check:live-code` reads `AHEAD` for its limits instead of the 4 written in the check.
- With the default limits it finds at least one line ahead in the written part (switch-prima-luce or crescendo-filo-di-luce) and one hosted by a growth step, on a song `growth:probe` picks; for each, the line shows muted from its step to its target, and the target step does not type it again. The case fails on the code before this change.
- The limits hold at every step of every built-in song: at most `atOnce` lines ahead, one per track, at most one added per step, none added while `muted` or more muted lines are shown (lines ahead included), none hosted at bar 0 or at a rushed step, none further than `bars` ahead.
- The kept shape of every built-in song is the same as before the change (`growth:probe -- all`, the shape kept).
- Same sound: `check:mixer -- --full` and `check-compact-code.cjs` (own dev server port) find every hap with every preset; `check:code` shows Classic unchanged; `check:crescendo -- --full` passes with new Live coder fixtures and unchanged Crescendo fixtures.

## Risks / Trade-offs

- [More muted lines on screen in the growth, where the code is short] → the same limits; screenshots for the owner of a growth step with a line ahead and of its target step.
- [A line appears before the music explains it] → 32 bars of look-ahead at most; the probe reports the longest muted wait.
- [Growth code no longer equals the code the shape search measured] → the shape is chosen as today; the probe reports rushed steps of the growth before and after, and a line ahead may only lower them.
- [The radio grows Live coder songs on air, so their code moves too] → the radio fixtures hold seeds and choices, not code: they must not move and `DIRECTOR_VERSION` stays; if they move, stop and report.

## Migration Plan

Saved growths, card lengths and saved sessions with the previous `SHAPES_VERSION` grow again (existing mechanism).

## Future work

Measured in the analysis (estimates, upper bounds), not in this change:

- **Lever 1, a line typed in pieces over several quiet steps.** A muted line grows at each quiet step (cut only after a closed `)`, so the muted code stays valid) and plays at its step. Balanced: 2 to 3 lines, 3 rushed steps fewer. About 8 to 12 agent hours.
- **Lever 2, big edits on a muted copy.** An edit of a playing line that costs 5 s or more is prepared on a muted copy below it; the step deletes the old line and unmutes the copy. Balanced: 4 edits in 3 songs, 2 rushed steps fewer, one more muted line each. About 10 to 14 agent hours.
- **Lever 3, the arpeggio case.** On prova-apre-arpeggio (252 to 332) the Kick line holds the gate of its arrival section (`.mask(section5)`), so the line is not found in the code of the earlier section and the final pass leaves it out. Fix: find the line by key and show it with the gate of its arrival section. +1 line with the Generous limits only. About 2 to 3 agent hours.

Levers 1 and 2 together remove at most 4 of 179 rushed steps of the written part: the rushed steps are at the section changes, not here.
