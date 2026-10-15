## Why

Our compiler writes a track once per section it plays in, so a Crescendo step that changes a track touches several lines, and muted tracks disappear from the code. Live coding videos show one line per instrument and mute a track by marking it, which reads much better for viewers. The owner wants a compact code view for Crescendo (`#64`), without touching how existing songs or the blocks build style compile.

## What Changes

- **Compact compiler for Crescendo songs.** Each track is written once, with section changes (pattern, gain, settings) expressed as sequences over the song (`"<0.9!8 0.7!8>"`, section masks), so a step edits one line.
- **Muted tracks stay visible**, marked as muted (`_$:`), instead of leaving the code; bringing a track back removes the mark.
- **Same sound.** For the same song state, the compact code SHALL sound like the standard code.
- **Setting.** Crescendo songs use the compact code by default; a setting can switch Crescendo back to the code per section, if both prove useful.

## Capabilities

### New Capabilities

- `live-build/compact-code`: compact code for Crescendo songs, visible muted tracks, sound equivalence with the standard compiler, the setting.

### Modified Capabilities

- None: songs in blocks, Compose without live build and the radio's blocks songs keep the standard compiler.

## Impact

- New `src/song/compile-compact.js`; the code panel, typing, export and fast video pick the compiler from the song's build style; `check:code` snapshots for compact output; level and onset comparison between the two compilers; radio windows with mixed compilers (prefixed constants).
