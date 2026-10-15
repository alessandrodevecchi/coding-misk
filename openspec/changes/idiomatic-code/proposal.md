## Why

Even showing only the present (`code-now`), our patterns are long: drum rows written step by step (`"[bd ~ ~ ~] [bd ~ ~ ~] …"`), notes spelled for every chord, a thinned variant written as another long string. Live coders write the same music shorter: `s("bd*4")`, scale degrees with the progression added on top, `!` and `@` for repeats (#64). A second code generator, chosen by a setting, writes our music that way where it can, and keeps our harmonic richness where it cannot.

## What Changes

- **Generator setting.** Code generator: standard (today) or idiomatic. Independent of the code view (per section, compact, one line per track, now).
- **Drums.** Rows become the shortest mini-notation that plays the same hits: `bd*4`, `[~ hh]*4`, `~ cp`, `!` repeats; rows of the same kit share one line when they can (`s("bd*4, [~ hh]*4")`).
- **Notes.** Repeated groups become `!`, held notes `@`. In a key and scale, melodic tracks are written as scale degrees with `.scale()`, and the chord progression as `.add("<…>")` on top, when every chord of the progression fits the scale. Chords outside the scale (an E major in A minor, a b2) keep their notes written out.
- **Growth.** Crescendo's thinned variants are written as the shorter forms they become (fewer `*`, a `!` less), so a step changes a few characters.
- **Same sound.** Every pattern is checked by its events; where the short form would not give the same events, the standard form stays.

## Capabilities

### New Capabilities

- `live-build/idiomatic-code`: the idiomatic code generator, its forms for drums and notes, the fallback, and its setting.

### Modified Capabilities

None in their requirements.

## Impact

- **Code:** a generator next to the per-instrument code (`src/music.js` layers), used by the compiler when the setting says so; the setting in Compose next to the code view.
- **Checks:** events in the browser with notes compared as pitches (a scale degree and a note name of the same pitch are equal), on all built-in songs and Crescendo states.
- **Out of scope:** new sounds or functions (the forms use Strudel functions the app already emits, plus `!`, `@`, `*`, `scale`, `add`).
