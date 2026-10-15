## Context

The compiler writes `.orbit(n)`, `.analyze("id")`, `.velocity/mask` lanes (removed in the code of the moment), `.gain(x)`, `.distort(x).distortvol(.5)`, `.bank(...)` on every layer. The code shown is the code evaluated. `applyComments` filters comments by level.

## Decisions

### D1. Prelude: evaluated, not shown

The evaluated code becomes `prelude + shown code`. The prelude registers our short functions (Strudel `register`) and, in the mixer value, sets levels and visual links by bus. Typing, hand takeover and export work on the shown code; the prelude is added at evaluation (and in the fast export's render page). By hand, Ctrl+Enter evaluates prelude + the user's code.

### D2. Short functions

`o(name)` sets the bus and the visual of an instrument (`.orbit(n).analyze(name)`); `drive(x)` is `.distort(x).distortvol(.5)`. Names come from the app's instruments, so they never clash with Strudel's.

### D3. Mixer

The prelude holds a level per bus for the song on air (`all(p => p.withValue(v => …gain × level[v.orbit]…))`) and the visual link per bus. A line has no `.gain()` while its level is the track's written level; a step that changes the level writes `.gain()` on that line. A check proves the same events as the full code.

### D4. Comment options

`{ title, tracks, sections, steps, voice }`; presets: all (all on), essential (title and tracks), none (title only, blank lines between blocks). Voice off leaves the voice layer out of the shown code (it plays from the prelude side).

## Risks / Trade-offs

- **[Code shown is not all the code]** → the prelude only holds helpers and levels; the panel can open it on demand ("show prelude") for who wants to see everything.
