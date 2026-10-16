## Context

The compiler writes `.orbit(n)`, `.analyze("id")`, `.velocity/mask` lanes (removed in the code of the moment), `.gain(x)`, `.distort(x).distortvol(.5)`, `.bank(...)` on every layer. The code shown is the code evaluated. `applyComments` filters comments by level.

## Decisions

### D1. Hidden part: helpers registered once, a tail after the code

The short functions are registered once in each page with Strudel (the app, the render page). The mixer and the hidden voice are a tail evaluated after the code shown: `shown code + tail`. A tail keeps the mini-notation offsets of the code shown, so the highlights in the panel stay right (CodeMirror drops the offsets past the end of the panel). Typing, hand takeover and export work on the shown code; the app's evaluation adds the tail (Ctrl+Enter by hand too), the fast export sends the code with its tail to the render page. Copy and Open in Strudel add the helpers as Strudel code before the code, so it plays anywhere.

### D2. Short functions

`o(name)` sets the bus and the visual of an instrument (`.orbit(n).analyze(name)`); `drive(x)` is `.distort(x).distortvol(.5)`. Names come from the app's instruments, so they never clash with Strudel's.

### D3. Mixer

The tail holds, for each pattern line of the code shown, its bus, its visual and its written level, found by the line's text (a line edited by hand takes the most alike line). `all(x => miskMix(x, ranges))` gives each event of a line what the line does not set itself, by the offset of its mini-notation. A line has no `.gain()` while its level is the track's written level (the level in the song as written); a step that changes the level writes `.gain()` on that line. A check proves the same events as the full code.

### D4. Comment options

Profile controls `tracks`, `notes`, `steps` (with `title` as before) and `voice`; the preset (all, essential, none, custom) is read from them, and picking a preset sets them. A preset saved before this change stands for its options. Voice off leaves the voice layer out of the shown code; it plays from the tail.

## Risks / Trade-offs

- **[Code shown is not all the code]** → the prelude only holds helpers and levels; the panel can open it on demand ("show prelude") for who wants to see everything.
