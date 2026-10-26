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

### D5. Mute or delete, per line
Muting and editing and deleting and typing again are both valid; neither is always right. For each line that goes silent and returns (one gap: its last bar before the code shown, its first bar again after it), the cost of each way is estimated with the typing model at a person's pace (`typingPlan`, human, lean, no lines pasted as from notes):
- **mute**: `$:` turned into `_$:` when it goes silent, then the muted line as it last played edited into the line that returns;
- **delete**: removing the line costs nothing (removed lines go at the start), then the line that returns is typed new, after the other lines of its track at that bar (so a long line can be copied from a like line above, as the typing does).

Each way is costed on the code of its track at the bar the line returns (the line among the other lines of its track, as the typing diff pairs it), not on the line alone: measured on kellerlicht Druck, the acid line alone costs 46 s to edit and 53 s to type new, but in the whole step its edit adds 80 s, because the pairing of the other changed lines around it moves.

The cheaper way is taken. When the two are within a factor of 1.35, the choice is drawn, seeded by the song, the track, the line and the bar it returns at, with the cheaper way more likely the further apart they are; so equal costs do not always go the same way, and the same song always writes the same code. The choice is made per gap, so every bar of the gap shows the same code. Known case: kellerlicht, Druck, where the acid line returns with 32 values instead of 24.

Measured (growth:probe, free duration, typing at the section changes): luci-rosse 229.9 to 230.8 s, settimo-cielo 345.7 to 346.4 s, kellerlicht 266.4 s unchanged; muting is mostly the cheaper way. Druck stays at 120.9 s because the typing diff anchors on the blank lines between tracks and shifts by one track, so it retypes lines it should edit; without blank lines as anchors Druck needs 73.7 s. That is a change to the typing diff, which the growth uses too, so it is left for a separate decision.

## Risks / Trade-offs

- Longer code on screen in sections with many silent tracks. D3 and the screenshots let the owner judge.
- The hidden mixer finds lines by place and counts `_$:` lines: `check:mixer` proves the entries still match.
- Variables and functions for returning blocks wait for this measure.
