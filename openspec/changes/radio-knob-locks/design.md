## Decisions

- **Pure part.** `compilationOptions` reads `comp.locks` (knob → value) and the setup's ranges: a styles segment takes its drawn knobs with held ones replaced; an artist segment gets a copy of the artist whose ranges are intersected with the setup's (an empty intersection becomes the nearest bound) and whose held knobs become fixed ranges.
- **Radio.** Held knobs live in `opts.compLocks` and go into the compilation options, so the recipe's per-song option changes record them. The knob shows the song on air's value from the director's used options; a lock button on held knobs removes the hold.
