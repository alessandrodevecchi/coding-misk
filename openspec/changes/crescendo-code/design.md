## Context

`compileSong` writes, per track, one `$:` line per clip section with `.mask(sectionN)` and per-section values. The section lanes are strings like `"<0!4 1!8 0!20>"`.

## Decisions

- **D0. Phase 1 of the compact code (done).** Start from the standard output and join identical lines of a track under one union lane when the lanes never overlap. Exact by construction, and it shortens Crescendo songs by about a third (150 to 94 lines, 175 to 121). D1 stays the goal for a later step.
- **D1. Per track, values over the song (later).** Per-section values become one sequence over the song's bars (`gain("<0.84!8 0.9!8>")`), patterns that change by section become a `"<A B>"`-style alternation with bar weights, and the clips become one mask from the union of the track's sections.
- **D2. Muted mark.** Strudel's `_$:` silences a pattern and keeps its code; muted tracks of a Crescendo state are written with it.
- **D3. Equivalence first.** A check compiles both ways and compares onsets and levels with the existing render tools before the compact code is used.
- **D4. Constants per song.** Section lanes and constants get the song prefix used in radio windows, so a compact song and a standard song can share one window.

## Risks / Trade-offs

- **[Automations inside sections (`gainEnd`, `cutoffEnd`)]** → expressed as ramps over the song with per-section segments; covered by the equivalence check.
- **[Long sequences for long songs]** → use `!n` repeats; readability checked on the longest built-in song.
