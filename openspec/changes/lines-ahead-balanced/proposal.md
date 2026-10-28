## Why

Lines typed ahead, muted (`reused-lines` D8, `#85`) never happen with the limits approved to start with: over the 38 built-in songs they plan 0 lines. The analysis of 2026-10-26 tried 42 combinations of limits. Wider limits in the written part give at most 2 lines, because few written steps have time to spare before a new line (74 of 296 steps have more than 2 s to spare, 13 of them before a step with a new line). The "Balanced" level gives those 2 lines (switch-prima-luce 176 to 192, crescendo-filo-di-luce 182 to 190), each muted for at most 28 s, and the owner chose it as the default.

The growth part of a Live coder song is where most quiet steps are. A partial measure that let growth steps host lines of the written part gave 2 to 7 lines in 6 songs with the Balanced limits. The owner approved extending lines typed ahead to the growth part.

## What Changes

- **Balanced default limits.** `AHEAD` becomes `{ atOnce: 2, bars: 32, muted: 8, margin: 2, section: false }`: the look-ahead may cross the next section change (still at most 32 bars), and a line may be typed ahead while up to 7 muted lines are shown. At most 2 lines ahead at once, 1 per step, 1 per track, and the 2 s margin stay. The `globalThis.codingMiskAhead` override stays.
- **Lines typed ahead in the growth too.** A step of the growth with time to spare may type, muted, a new line of a coming step, whether that step is in the growth or in the written part, with the same limits. Its own step only unmutes it.
- **The growth shape is chosen as before.** The shape search scores each growth without lines ahead; lines ahead are planned on the kept shape only. The shape each song keeps does not change.
- **Checks read the limits.** The D8 case of `check:live-code` reads `AHEAD` instead of the limit 4 written in the check, and covers lines ahead in the growth.
- **Same sound.** A line typed ahead plays nothing until its step. Every hap of every step stays the same in Classic, Crescendo and Live coder.

## Non-goals

- Crescendo and Classic: no lines typed ahead there.
- Typing one line ahead in pieces over several quiet steps (lever 1 of the analysis).
- Preparing a big edit of a playing line on a muted copy and swapping at the step (lever 2).
- The case left out on prova-apre-arpeggio (252 to 332): a line whose text holds the gate of another section is not found in the code of the step that would type it ahead (lever 3). Fix: find the line by key and show it with the gate of its arrival section.
- A setting in the interface for the limits.

These levers are recorded in `design.md`, Future work.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-build/reused-lines` (from the open change `reused-lines`, merged in `develop`, not yet archived): "New lines typed ahead, muted" covers the growth; "Limits on lines typed ahead" takes the Balanced limits; "Lines ahead and muted lines measured" splits the growth and the written part; a new requirement keeps the growth shape out of it. Archive `reused-lines` before this change.

## Impact

- **Code:** `src/live/written-plan.js` (`AHEAD`, the plan over growth steps), `src/live/live-code.js` (line info for growth steps, lines ahead shown in growth code), `tools/growth-probe.mjs` (lines ahead split by part), `tools/check-live-code.mjs` (D8 case).
- **Versions and fixtures:** the Live coder code fixtures move, so `SHAPES_VERSION` goes up in the same commit (`SHAPES_SEED` stays 5); the Crescendo fixtures and `CRESCENDO_VERSION` do not move; `DIRECTOR_VERSION` does not change. `npm run durations` in the same commit.
- **Docs:** `docs/knowledge/live-build.md`, `decisions.md` (the D8 limits row and the rejected "also in the growth"), `status.md`, `checks.md`; DEVLOG.
- **Checks:** `check:live-code`, `check:typing`, `check:mixer -- --full`, `check-compact-code.cjs`, `check:crescendo -- --full`, `check:code`, `check:strudel`, `check:durations`, `check:knowledge`, `growth:probe -- all`.
- **Depends on:** `reused-lines` (merged in `develop`).
