## Why

Our compiled code writes the whole arrangement: a lane per section, the lines of every section, every chord spelled out. A Crescendo song shows 90 to 250 lines and a step touches long lines. Live coders show only what plays now, in a few lines, and change it as the song moves on (#64). A view of the code "of the moment" makes the code short and the steps small, without changing the sound.

## What Changes

- **New code view "now".** Next to code per section, compact code and one line per track, a fourth view shows only what plays in the current section: no section lanes, no other sections, no masks. Default view for Crescendo songs.
- **The code changes with the song.** At each section boundary the code is edited to the next section. The lines that change are prepared in the bars before, written muted with `_$:`, and switched on at the boundary (the muted line replaces the old one), as live coders do.
- **Same sound.** Every bar sounds as with the code per section. Fades between sections become gain moves on the bars of the fade.
- **Two settings.** The code view (per section, compact, one line per track, now) and, later, the generator (`idiomatic-code`).
- **Crescendo first.** The view applies to Crescendo songs; songs in blocks and the radio keep their code. Extending it is noted for later.

## Capabilities

### New Capabilities

- `live-build/code-now`: the code view that shows only the current section, its edits at section boundaries and their preparation.

### Modified Capabilities

- `live-build/compact-code`: the code views gain "now" (the setting lists four views).

## Impact

- **Code:** a compiler mode for one section (from the standard layers, without lanes), the live build steps at section boundaries, the code menu in Compose; export and video use the same code by bar.
- **Checks:** event equivalence in the browser (the code of the moment against the code per section, on every bar of a few songs), the Crescendo checks.
- **Out of scope:** idiomatic patterns (`idiomatic-code`); songs in blocks and the radio (later).
