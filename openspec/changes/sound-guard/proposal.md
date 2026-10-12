## Why

A sound that never loads can hold a fast export forever and leaves a silent note when playing live. Strudel's soundfont loader waits for a decode that never ends when a soundfont zone is broken, and two broken parts are already known (`#54`, `#61`). A fix per broken note does not scale: every broken part should be found, replaced and reported by the app itself.

## What Changes

- **Loader that fails instead of hanging.** A soundfont zone that cannot be decoded gives an error, not a wait without end.
- **Health register.** A sound, font or zone that fails is remembered in the browser, with the sound library version, and plays from a stand-in from then on: another font of the same instrument, or another sample of the same bank.
- **Pre-flight check in fast exports.** Before rendering, the render page loads every sound the export will play, with a time limit, and replaces the broken ones; the export then renders without stalls and lists the stand-ins.
- **Live stand-ins.** A note whose sound fails plays from the stand-in at once when there is still time, and every later note uses it.
- **Radio preload.** The radio loads the next song's sounds while the current one plays, so a broken sound is found before its first note.
- **Library check tool.** A command scans every soundfont zone and every sample the app can call and fails on a broken part the app does not cover.

## Capabilities

### New Capabilities

- `endless/sound-guard`: finding, replacing and reporting sounds that fail to load, live and in fast exports.

### Modified Capabilities

None.

## Impact

- Render page and live audio setup (sound registration), fast export blocks, radio queue.
- New check tool in `tools/`; the known broken parts list stays as the starting register.
- Out of scope here (later in `#54`): sibling drum machine fallbacks, and the drum panel showing "missing sound, using X".
