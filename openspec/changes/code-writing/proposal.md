## Why

Our code lines carry technical functions on every line (`.orbit()`, `.analyze()`, `.gain()`, `.distortvol()`), so even a first line looks already built. Live coders write only what has a musical meaning, with short functions of their own for the rest (#64; local analysis of the reference videos). The owner wants this as new options, keeping today's full code. Comments, too, should be a preset of separate options, including the code of the spoken voice.

## What Changes

- **Technical functions, a new profile control with three values:**
  - full: today's code;
  - short: our own short functions defined in a hidden prelude, for example `.o("bass")` for the bus and the visual, `.drive(0.6)` for distortion with its volume;
  - mixer: track levels and visual links live in a hidden mixer keyed by the bus; a line shows only the music, and `.gain()` appears only when a step changes the level.
- **Same sound.** Every value sounds as the full code; a check compares the events.
- **Comments as a preset.** The comments control becomes a preset (all, essential, none) over separate options: title, track names, section and pattern notes, step phrases (`// > …`), and the code of the spoken voice. Changing one makes it custom.
- **Profiles.** Classic and Crescendo keep full functions and today's comments; Switch uses the mixer and hides the voice code.

## Capabilities

### New Capabilities

- `live-build/code-writing`: how technical functions are written (full, short, mixer) and the comment options with their presets.

### Modified Capabilities

- `live-build/profiles` (change `performance-profiles`): the comments control becomes a preset of options; a new control for technical functions.

## Impact

- **Code:** the compiler output passes through a writer that rewrites technical functions; a prelude evaluated with the song but not shown; the comment filter gains options; profile table and Compose panel.
- **Checks:** Strudel events equal for the three values on the test songs; comment options in Node; the profile control in the browser.
- **Out of scope:** how a song grows (`live-coder-growth`), how edits are typed (`typing-lines`).
