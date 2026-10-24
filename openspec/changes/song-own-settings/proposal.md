## Why

A song that declares no profile (most older songs, such as kellerlicht) opens and plays with whatever profile, Live build switch and options were last set in Compose, even on another song. Kellerlicht, written to play as written, opened as Crescendo for 7:58 with the narrator, while its Songs card showed its real length, 4:50. Settings changed while experimenting also leak to every other song.

## What Changes

- **Settings are part of the song.** A song's configuration (profile, Live build, comments, technical functions, narrator and the other options) is saved with the song and is how it plays by default. A song that has none plays as Classic with the Live build off, as it was written.
- **Trying settings never changes the song.** A change in Compose applies to that song only, never to other songs, and does not change the saved song. The song shows "configuration changed" with a ↺ "Back to the original configuration" button, in Compose and on its Songs card.
- **The trial survives a reload** and stays marked until ↺ or a save.
- **Saving is always explicit.** Save on one of the owner's songs makes the trial configuration the song's own; Save as new makes a copy with it; on a built-in song Save makes the owner's version, as today, and Restore original brings the built-in back.
- **Same length everywhere.** The Songs card, Compose and the radio show the same length for the same song and configuration.

## Capabilities

### New Capabilities

- `live-build/song-own-settings`: configuration saved with the song, trial settings per song with ↺.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Song format:** an optional `config` with the profile and options (validator, docs/SONG-FORMAT.md); `profile` and `buildStyle` already declared by songs keep their meaning.
- **Code:** `src/main.js` (liveOf, ctlOf, the Compose panel, trial store per song, Save paths), the Songs card (marker and ↺), backup, i18n, Guide, card lengths.
- **Checks:** browser cases (trial on one song leaves kellerlicht as written; ↺ restores; Save writes config); Node format check; code checks unchanged.
