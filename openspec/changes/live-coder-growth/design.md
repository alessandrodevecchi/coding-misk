## Context

`crescendoSong` builds a path from silence to the written song (Crescendo, gradual). `crescendoPath` was designed to also go from any state to another (radio). Build actions: add, remove, set, pattern (`to`, `level`), rack, unrack, hide, reveal.

## Decisions

### D1. Waypoints first

`waypoints(song, rng, rules)` returns 4 to 6 small states. The last is the song (or the song's first full section); the others are drawn from it with rules: fewer tracks, simpler notes (one note, short lines), fewer functions, and detours (a function present earlier and missing later, or notes rewritten) drawn for each passage between two waypoints: 0 with chance 0.44, 1 with 0.35, 2 with 0.15, 3 with 0.06, none in the first passage. A natural growth has 4 to 6 waypoints (2 to 4 passages that draw): a song has two or three detours on average and none about one time in ten (19% with 4 waypoints, 8.5% with 5, 3.7% with 6). The reference video has about three in six minutes (the gate commented out and back, the bass notes rewritten, a sound replaced). A style or artist may shift the chances. Each waypoint compiles and is musical by construction (a subset of the song's own material).

### D1b. Waypoints as prefixes (implementation)

Each destination track has its units from the gradual growth (pattern levels, then functions and knobs). A waypoint holds, for each track that has come in, a prefix of them: fullness first, colour a little later, everything at the last waypoint. The first waypoint has the anchor, sometimes a second track, at their simplest variant. Detours are drawn for each passage from the third waypoint on (the first passage between two waypoints draws none) and pick from the state at the moment they are played: a shown function commented out, the notes rewritten (another pattern of the track or the line rotated), or a track muted; each comes back on the way to a later waypoint. A track that came in on the way to the previous waypoint or this one is never a detour. After the last waypoint, a step per track sets back what a clone or a detour left different, so the growth ends on the song.

### D2. Moves between waypoints

Between two waypoints the move engine lists the differences (track in or out, function in or out, number changed, notes changed, block cloned) and orders them with the chooser. Notes changes are split into small edits (add a note, change one token, add an alternation). New actions: `clone` (copy a track's block to a new track, then edits), `comment` (comment a function out with `//`, or back in), `notes` (rewrite a pattern's notes as a whole).

### D3. Chooser

`choose(candidates, state, rng)` returns the next move. Today: weights by kind and by distance to the next waypoint, seeded. The interface takes the state and the candidates, so the radio's director (with steering) or a decision model can replace it.

### D4. Duration

Free: the growth takes as long as its moves need (moves × spacing + pauses). Fitted: within the written length; details drop first, then pauses shorten.

### D5. Normal version

A song with `"normal": "waypoints"` starts, when it plays without a live build, with one section of 8 bars per waypoint before the last (its patterns and settings at that moment; functions not shown yet play at their neutral value), then the song as written.

### D6. Names

The control's values keep fixed ids (`crescendo`, `gradual`, `natural`); the old saved value `natural` is read as `gradual`.

## Risks / Trade-offs

- **[Musicality of detours]** → detours only remove or rewrite with the song's own material, and the last waypoint is the song.
