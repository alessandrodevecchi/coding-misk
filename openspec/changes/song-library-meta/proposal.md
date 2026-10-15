## Why

The song list keeps growing (built-in songs, songs saved from Compose and from the radio, test songs) and cards say little about a song's history. The owner wants to see when a song was made and with which version of the app, which songs were played lately, filter by build style, and browse the list in pages without losing search and filters (#67).

## What Changes

- **Creation date and app version** in the song file, written when a song is made or saved (Compose, radio, director). Existing songs get them once from the git history.
- **Last played**, kept in the browser and in the settings backup, not in the song file. A play counts after 10 seconds.
- **Sorting:** recently created and recently played, next to today's sorts.
- **Filters:** never played; build style (in blocks with its own steps, crescendo, none), separate from the kind (standard, generated, mine, code).
- **Pages:** search, filters and sorting apply to every song first, then the result is split into numbered pages of 20 with a counter ("21-40 of 61"). Changing search or filters goes back to page 1; the page is remembered with the view.
- **Cards** show the creation date and a small build style mark.
- **App version** in `package.json` aligned with the releases (0.6.0 at the next release), used for the songs' version.

## Capabilities

### New Capabilities

- `library/song-library`: song metadata (creation date, app version, last played), the sorts and filters that use them, and the paged list.

### Modified Capabilities

None in their requirements.

## Impact

- **Song format:** optional `created` (ISO date) and `appVersion`; validator and `docs/SONG-FORMAT.md`.
- **Code:** song filter (`src/library/song-filter.js`), Songs tab rendering, save paths in Compose, radio and director, play tracking, settings backup.
- **Tools:** a one-off script that fills `created` and `appVersion` of the songs in `songs/` from git.
- **Checks:** `check:song-filter` (sorts, filters, pages across the whole list), `check:songs`, the backup check, a browser check of the Songs tab.
