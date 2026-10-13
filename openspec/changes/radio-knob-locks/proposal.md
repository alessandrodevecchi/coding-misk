## Why

With the compilation on, the radio knobs look active but are ignored, and an artist's own values can go outside the setup's ranges (`#59`).

## What Changes

- **Knobs follow the song on air.** With the compilation on, the knobs show the values of the song on air, update at every song and say they come from the compilation.
- **A knob moved by hand holds its value.** Next songs use it and the compilation leaves it alone; a lock shows it, and a click on the lock gives the knob back. The compilation stays on.
- **Ranges bind artists too.** An artist's value ranges are brought inside the setup's ranges.

## Capabilities

### New Capabilities

- `endless/radio-knob-locks`: knobs and the compilation working together.

### Modified Capabilities

None.

## Impact

- Compilation options (pure), radio controls, the session recipe (held knobs are part of the options, so a replay plays the same songs).
