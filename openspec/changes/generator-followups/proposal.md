## Why

The owner judged the chords composed for pads in Compose and approved them, but radio songs still take their pads only from the style presets. FM sounds (bell, reese, growl, dirty) reach only two styles, darksynth and drum and bass (#71).

## What Changes

- **Composed pads in the radio**: the styles' pads take part of their material from the generator, as leads, arps and basses already do, with a share per style.
- **FM sounds in more styles**: each style gets a list of sound kinds that fit it, chosen with the owner from the recorded FM examples.

## Capabilities

### New Capabilities

- `app/generator-followups`: composed pads in the radio and FM sounds per style.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Radio songs change**: `DIRECTOR_VERSION` goes up and the endless fixtures are rewritten; saved sessions warn as designed.
- **Code:** style recipes in `styles/` (pad `material`, `sounds` lists), the director where pads take material.
- **Checks:** `check:styles`, `check:endless`, `check:material`, levels of a few radio sessions per style.
