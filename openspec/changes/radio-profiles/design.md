## Context

The radio plays a stream of songs written by the director; a window of code joins the song on air and the next during transitions; steering rewrites the song on air at phrase boundaries; curves set targets over time; artists bias the director with weights and quirks; sessions are seeded and repeatable.

## Decisions

### D1. Artist profiles

`profiles: { classic, crescendo, switch }` weights and a `growth` block (spacing, pauses, detours, starts-with, endings, narration, duration). Missing field = Classic only (fixtures unchanged). Random artists draw it. Listener setting `radio-profile` overrides.

### D2. Steering as waypoints

The steering rewrite produces a new destination state; with a growth other than blocks it becomes the next waypoint, and the move engine plans from `stateAt(onAir, bar)`. Curves add waypoints at their points. "End" adds the ending waypoint.

### D3. Shown and evaluated code

The code panel shows the song on air; the evaluated code is `prelude + shown + hidden incoming`. The incoming song is compiled in full technical form on buses offset by 16 and joined at evaluation only. When it goes on air it becomes the shown code. Option `radio-incoming: visible | hidden`.

### D4. Duration

Fitted by default: the growth stays within the song's planned length (details drop, pauses shorten); an artist's `duration: free` lengthens the song and the director moves the next song accordingly.

### D5. Determinism

Seeds per song for waypoints, moves and the chooser; commands recorded with their bar; `DIRECTOR_VERSION` raised.

## Risks / Trade-offs

- **[The next song appears with a longer block]** → accepted: like a DJ with the next record ready; its growth goes on with small moves.
- **[Export speed with many steps]** → measured on a one-hour session; steps in the same render block are joined if needed.
