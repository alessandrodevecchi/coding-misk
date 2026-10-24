## Context

`compileNow` (`src/song/compile-compact.js`) writes the code of the moment of a bar. With `shownMuted`, tracks that a step muted are written with `_$:`; that list comes from `played(bar)` in `src/live/live-code.js`, which only knows tracks added by steps (`add`). In the written part tracks play by their clips, so a track with no clip in a section is simply not written. The typing plan (`src/song/typing.js`) already edits a line in place when only its values change.

## Decisions

### D1. Which tracks stay muted
At bar b in section k, a track is kept muted when it has sounded before b (a clip before b, or an `add` step) and has a clip in a later section. Its lines are those of the last section where it played, muted. Applies when the code is edited in place (`inPlace`: Live coder, Sections). Classic and Crescendo without Sections are unchanged.

### D2. Order of lines
A muted track keeps its place among the tracks (header order), so unmuting and editing touch the same lines: the typing plan sees an edit, not a new line.

### D3. Clutter
A track leaves the code at the first section change after its last clip. No other cap: the measure (D4) decides whether the code gets too long on long songs.

### D4. Measure before and after
`growth:probe` gains the written part: for each section change, typing needed, time available, lines pasted. Recorded for luci-rosse, settimo-cielo, kellerlicht in the DEVLOG; shown to the owner with a screenshot of luci-rosse at Taglio and Scontro 2.

## Risks / Trade-offs

- Longer code on screen in sections with many silent tracks. D3 and the screenshots let the owner judge.
- The hidden mixer finds lines by place and counts `_$:` lines: `check:mixer` proves the entries still match.
- Variables and functions for returning blocks wait for this measure.
