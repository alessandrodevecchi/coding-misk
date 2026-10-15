## Context

`crescendoSong` builds a path from silence to the written song (Crescendo, gradual). `crescendoPath` was designed to also go from any state to another (radio). Build actions: add, remove, set, pattern (`to`, `level`), rack, unrack, hide, reveal.

## Decisions

### D1. Waypoints first

`waypoints(song, rng, rules)` returns 3 to 6 small states. The last is the song (or the song's first full section); the others are drawn from it with rules: fewer tracks, simpler notes (one note, short lines), fewer functions, and at least one detour (a function present earlier and missing later, or notes rewritten). Each waypoint compiles and is musical by construction (a subset of the song's own material).

### D2. Moves between waypoints

Between two waypoints the move engine lists the differences (track in or out, function in or out, number changed, notes changed, block cloned) and orders them with the chooser. Notes changes are split into small edits (add a note, change one token, add an alternation). New actions: `clone` (copy a track's block to a new track, then edits), `comment` (comment a function out with `//`, or back in), `notes` (rewrite a pattern's notes as a whole).

### D3. Chooser

`choose(candidates, state, rng)` returns the next move. Today: weights by kind and by distance to the next waypoint, seeded. The interface takes the state and the candidates, so the radio's director (with steering) or a decision model can replace it.

### D4. Duration

Free: the growth takes as long as its moves need (moves × spacing + pauses). Fitted: within the written length; details drop first, then pauses shorten.

### D5. Normal version

A song made this way can be written as sections, one per waypoint (option in the song file), so it plays without a live build too.

### D6. Names

The control's values keep fixed ids (`crescendo`, `gradual`, `natural`); the old saved value `natural` is read as `gradual`.

## Risks / Trade-offs

- **[Musicality of detours]** → detours only remove or rewrite with the song's own material, and the last waypoint is the song.
