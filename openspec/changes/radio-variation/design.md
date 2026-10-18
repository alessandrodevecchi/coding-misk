## Context

Steering (`src/endless/steering.js`) turns each command into a rewrite of the song on air from a boundary. A song is rebuilt from its original plan plus every standing command, in order, with random streams named `steer:<song>:<index>`. `COMMANDS` lists the commands; `ARRANGE_TYPES` (`drums`, `bass`, `lead`, `pad`, `texture`, where lead is arp, hook or guitar) are the parts of Add and Remove; `whyNot` gives the reason a command is disabled (`late`, `no-type`, `all-playing`, `locked`, `last-track`, `no-target`, `no-drop`, `transition`). Add of a type the song lacks makes a track from the style's presets (#41). Curves (`radio-curves`) set soft targets per double phrase. `DIRECTOR_VERSION` is 2; playlist items warn when their version is lower. Shortcuts live in `KEYS_OF` and `TYPE_KEYS` in `src/radio/radio.js`; `v` and `V` are taken by talk more and less. The radio builds songs in blocks; `radio-profiles` (on hold) would bring growths to the radio.

`material-generator` (written in parallel) composes melodies, basslines, arpeggios and chords from a seed and a style, as ideas (`idea-model`).

## Goals / Non-Goals

**Goals:**
- Vary as one more command in the existing rewrite model: no new kind of state.
- Composed material wherever steering creates material today.
- The generator's inputs taken from the curves already on screen.

**Non-Goals:**
- Varying drums or textures (grooves and sounds come later, after the listening test).
- Recomposing parts when a curve is dragged (curves keep moving tracks and settings).
- Growths in the radio: that is `radio-profiles`.

## Decisions

### D1. Vary is a pattern step

`COMMANDS.vary = { group: 'arrangement' }`, with `VARY_TYPES = ['lead', 'bass', 'arp', 'pad']`; for vary, lead is the hook, else the guitar, and arp is separate (unlike `ARRANGE_TYPES`, where lead covers the arp). At its boundary the rewrite asks the generator for a new idea for each playing, unlocked track of the type, adds it to the track's patterns as `V<k>` and writes a `pattern` step with `by: "listener"`. Later director moves of that track pick among its variants, the new one included. The plan does not change, so energy and the rest of the song stay as planned.

Alternative rejected: mutating the current pattern with `mutate.js`. Mutation is light by design and the owner asked for new material.

### D2. What the generator receives

`{ role, style, key, progression, meter, seed, from, targets }`: `from` is the current idea, so the generator can keep the instrument's register and length, and must return something different (a check compares events). `seed` is `vary:<song>:<index>` from the command's stream, so it never shifts the other streams.

### D3. Curves and complexity as inputs

At the part (double phrase) where the material starts:

| Input | From | Effect |
| --- | --- | --- |
| density | density target (set or automatic) | notes or hits per bar |
| register | energy target | octave offset, higher with more energy, within the instrument's range |
| range and variety | session complexity, moved by More or Less complex | number of different degrees, size of leaps, syncopation |

Brightness and tension keep steering filters and drive, as today. The same mapping applies to Add and More complex.

### D4. Add and More complex

The new track #41 makes from the style gets its pattern from the generator, not from the style's presets; the track's sound still comes from the style. More complex raises the usual count; when the director then picks a candidate that the plan created, the candidate's material was already composed at plan time by `material-generator`; when it creates a new one, it composes it here with the seed of the command.

### D5. whyNot and the console

New reason `not-playing` ("no {type} is playing"), checked at the apply bar; `locked` reused. The console gains a "Vary" button with a part picker next to it (lead, bass, arp, pad), default lead, remembered for the session. Shortcut `n` (new notes) varies the picked part. The queue shows "Vary lead" with its bar. A second Vary on the same part for the same boundary replaces the first, as the queue already does for the same kind and track.

### D6. Determinism and versions

The command list already records kind, track or type and bar; vary adds its part. Replay rebuilds the song from the plan and commands, so the same command index gives the same seed. Add and More complex change the endless fixtures: write them with `npm run check:endless -- --write-fixtures` and raise `DIRECTOR_VERSION` by one in the same commit. The playlist warning changes from "older than" to "different from" the app's version, so a session saved by a newer app also warns.

### D7. Growth shapes on air

Until `radio-profiles` lands, the radio builds in blocks: a vary is one step. When it lands, the song's growth shape resolves as in Compose (`growth-shapes` D1), and a vary step is split into small `notes` edits by the live coder move engine, ending on the new idea at the boundary.

## Risks / Trade-offs

- **[A varied part clashes with the other parts]** → the generator works on the song's key and progression, and a check scales every note of 200 seeded varies against the section's scale.
- **[Vary too close to the end]** → `late` applies as for other commands.
- **[Generator speed on air]** → a vary composes one part; a check measures it under 20 ms in Node.
- **[Old sessions sound different]** → expected; the warning and Freeze cover it.

## Open Questions

- **Vary the drums too?** Recommended: not in this change; add it after the listening test, when `material-generator` grooves have been heard.
- **Does a varied part come back to its old notes later?** Recommended: no; the new part stays until another Vary or the song's end, like a live coder who rewrote a line.
