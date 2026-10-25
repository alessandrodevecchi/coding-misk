## Why

The owner's tests of v0.6.0-beta.2 found a few small problems and asked for two small additions (#76).

## What Changes

- **+ Playlist in the radio** confirms with its own label, not "Add to song".
- **Patterns tab options** checked one by one (sound, key, chords, mode, tempo, beat, style, energy); those that do nothing on the loop are fixed or labelled as options of "New".
- **Spoken passage timing**: a passage written for a bar speaks at that bar (a saved song speaks its bar-68 passage at the start).
- **"This song" export**: an explicit choice next to "Next songs" that exports the song on air, from its start to its end, without the start of the next one.
- **Composed melody shape shown**: the composed pattern says which shape came out (changed tail, call and response, polymeter).
- **"Song harmony"**: the radio Harmony group gets this name and a hint saying it changes chords and key for every part with notes.
- **Limiter ceiling** from 0.95 to 0.97.

## Capabilities

### New Capabilities

- `app/test-fixes`: the two additions and the fixed behaviours.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/i18n.js`, `src/library/patterns-tab.js`, the voice instrument placement (`src/song/spoken.js` or the compiler), the export menu, the Compose pattern panel, the radio console, `src/sounds/limiter.js`.
- **Checks:** `check:spoken` with a passage at a late bar; `check-patterns` for every loop option; `check-export` for "This song"; levels snapshot after the ceiling change.
