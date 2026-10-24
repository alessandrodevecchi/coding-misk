## Why

A song that declares no profile (most older songs, such as kellerlicht) opens and plays with whatever profile, Live build switch and options were last set in Compose, even on another song. Kellerlicht, written to play as written, opened as Crescendo for 7:58 with the narrator, while its Songs card showed its real length, 4:50.

## What Changes

- **Every song plays with its own settings.** A song opens, plays and exports with its declared profile, or, when it declares none, as Classic with the Live build off, as it was written.
- **Changes in Compose are per song.** Changing the profile, an option or the Live build switch in Compose applies to that song only and is remembered for it, as the Live build switch already is.
- **An explicit "Use for all songs"** applies the current settings to every song that has no own choice; "Back to the song's own settings" clears the song's changes.
- **Same length everywhere.** The Songs card, Compose and the radio show the same length for the same song and settings.

## Capabilities

### New Capabilities

- `live-build/song-own-settings`: per-song settings and their defaults.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/main.js` (liveOf, ctlOf, the Compose profile panel, the per-song overrides store), the backup of the overrides, i18n, Guide.
- **Checks:** a browser case: change the profile on one song, open kellerlicht, it plays as written; Node and code checks unchanged.
- **Migration:** today's global Compose choice is not applied to songs any more; a one-time note in the panel says so.
