## Why

The live build adds and removes whole tracks every phrase or so. Live coders build a track differently: they start from one sound and change one or a few lines every few bars (a function added to a chain, a pattern that grows, a value that moves, a track muted and brought back), until a small number of tracks becomes a rich song. The owner wants this way of building as a build style of the live build, called Crescendo (`#64`). This change is phase 1: Crescendo in Compose. The radio comes in phase 2.

## What Changes

- **Crescendo build style of the live build.** Next to the current build style ("in blocks"), a song can build itself "in crescendo": the build starts from a single sound and reaches the song as written through many small steps.
- **Path to a destination.** A path generator turns the current state of a song and a destination state into a list of small steps. In Compose the start is silence and the destination is the song as written. The same generator will serve the radio in phase 2, where steering changes the destination and the path is recomputed from the current code.
- **Small steps from the existing step actions.** Every step uses the actions the live build already has (`add`, `remove`, `set`, `pattern`, `rack`, `unrack`). A step changes one track, and usually one thing on it: one setting, one rack device, or one pattern variant.
- **Patterns that grow.** Each pattern a track plays gets simpler variants, derived from it (fewer hits, fewer notes, a shorter phrase). A track can enter on its simplest variant and grow to the written pattern step by step.
- **Varied length and endings.** The number of steps, their spacing and the way the song ends (stripped back slowly, cut in blocks, or a short end) are drawn per song from a seeded random stream, so the same song and seed give the same build.
- **Narration.** Each step can carry a short spoken comment. The voice knob keeps its role. A "fully narrated" option makes the comments dense: almost every step speaks, in the style of narrated live coding videos.
- **Only what the app has.** The steps use our own compiled code, presets, devices and sounds. No new Strudel functions, samples or helpers are introduced by this change.
- **Module tracks as blocks.** When FastTracker 2 module tracks exist (`#16`), Crescendo only adds, removes or mutes them as a whole.

## Capabilities

### New Capabilities

- `live-build/crescendo`: the Crescendo build style of the live build in Compose: the path from a start state to a destination, the small step kinds, growing patterns, varied length and endings, narration density, seeding and determinism.

### Modified Capabilities

- `live-build/hand-takeover`: none in its requirements. Taking over by hand and resuming work the same for a Crescendo build (stated in the new capability).

## Impact

- **Song model:** Crescendo writes ordinary `build` steps and adds generated pattern variants to a track's `patterns`. The song format, the player, seeking, the typing animation, export (audio and fast video), spoken comments and hand takeover keep working unchanged.
- **Code:** a new module for the path generator and pattern thinning under `src/song/`; the "Live build" switch in Compose gains the build style choice; settings key for the build style and the narration option.
- **UI and docs:** Compose live build controls, Guide card (English and Italian), `docs/SONG-FORMAT.md` and `docs/COMPOSING.md`.
- **Checks:** a Node check for the path generator (determinism, every step valid, the last state equals the written song, step sizes) and a browser check that a Crescendo build plays without evaluation errors.
- **Out of scope (phase 2 and later):** Crescendo in the radio and its interaction with curves and steering; a decision model as director; custom functions from other live coders; building inside module tracks.
