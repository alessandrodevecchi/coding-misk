## Context

The director plans a song (parts, targets, sections) and writes its steps phrase by phrase; steering rewrites the rest of a song from a boundary with `directSong`, keeping the steps before it. Phase 1 adds `crescendoPath(from, to, rng, opts)`, which turns any start state and destination into small steps.

## Decisions

- **D1. Plan first, path second.** The director keeps planning exactly as today. For a crescendo song, the planned song becomes the destination and `crescendoPath` writes the build from silence. No second director.
- **D2. Steering = new destination.** On a command, steering already writes a new plan for the rest of the song. For crescendo songs, the new planned state at the boundary becomes the destination, and `crescendoPath(stateAt(boundary), destination)` replaces the remaining steps. Curves work the same way.
- **D3. Artist fields.** `buildStyle` weights like `transitions.kinds`; a `crescendo` block with `spacing` `[low, high]` bars, `first` (`drums`, `bass`, `texture`, `any`), `breaks` (0 to 1), `endings` weights (`strip`, `blocks`, `short`), `narrated` (chance). Quirks: `slow-growth` (spacing at the top of the range), `starts-with-bass`, `always-strips`.
- **D4. Drawing.** The build style is drawn from the `artist` random stream right after the quirks, so songs of artists without the field draw exactly as before.
- **D5. Mixed windows.** A transition joins two songs in one code window. Both songs compile with the compiler of their build style; constant names and track ids carry the song number already (`s7-bass`), and the compact compiler (if present) must prefix its constants the same way.

## Risks / Trade-offs

- **[Recompute cost on every command]** → the path is computed for the rest of one song only, in Node-speed pure code; measure on a long song.
- **[A command during a break move]** → the break move is finished first, then the new path starts on the next phrase.

## Resolved Questions

- Existing artists stay blocks only; one new built-in artist is crescendo only; mixed artists use weights (owner, 2026-10-15).
