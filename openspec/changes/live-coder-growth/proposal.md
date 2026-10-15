## Why

The Switch growth still decomposes a complex written song backwards, so every step carries complex code and the build goes straight to a fixed destination. A log of the reference video (local notes) shows a live coder working forward: one note, then a function, then a number; a block copied and changed; notes rewritten, not thinned; things removed and put back (a gate commented out and restored). The owner proposed intermediate waypoints defined at the start, which make steps small and allow detours, and a duration that follows the song's complexity (#64).

## What Changes

- **Growth names.** "small steps" stays; today's "natural" becomes **gradual** (same behaviour); a new value **natural (like a live coder)**.
- **Waypoints.** At the start the growth draws a few waypoints: small states of the song, each simple (kick and one bass note; the lead cloned from the bass; the bass rewritten and the gate removed; everything with the gate back). Between two waypoints the build moves with small moves.
- **Moves.** A vocabulary of small moves: add a sound, add a function, change a number, grow the notes inside the quotes, rewrite the notes, clone a block, mute or unmute, comment a function out or back in.
- **Detours.** A waypoint may remove or rewrite what an earlier one added, so the build does not go straight to the end. The number of detours is drawn for each passage between two waypoints (none in about 44% of them, one in 35%, two in 15%, three in 6%; never in the first passage, which has nothing to go back on). A song then has two or three detours on average and none about one time in ten; styles and artists may shift these chances.
- **Chooser.** The next move is picked by a chooser separate from the moves: rules and a seed now; the radio's director and steering, or a decision model, later.
- **Duration of the growth.** Free (complex songs grow longer) or fitted (within the written length, fewer details). Free by default for Switch, fitted for Crescendo.
- **Normal version from the waypoints.** Each waypoint can become a section of the song as written, so the normal version and the live one come from the same source.
- **Switch profile** uses the new natural growth; the other profiles do not change.

## Capabilities

### New Capabilities

- `live-build/live-coder-growth`: waypoints, the move vocabulary, detours, clones, the chooser, the growth duration and the growth names.

### Modified Capabilities

- `live-build/natural-growth` (change `natural-growth`): renamed "gradual" in the interface; behaviour unchanged.

## Impact

- **Code:** a waypoint planner and a move engine next to `crescendo.js`, reusing the path from one state to another; new build actions for clone, comment out and rewrite; the growth control gains a value.
- **Checks:** determinism, every state compiles, small moves (characters changed per step), detours present, the end equals the last waypoint, events of the normal version.
- **Out of scope:** the radio (`radio-profiles`), a decision model (later).
