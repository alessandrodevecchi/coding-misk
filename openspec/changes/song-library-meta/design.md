## Context

The Songs tab builds one entry per song (`songEntry`) and filters, searches and sorts them in `song-filter.js` (pure, checked in Node). View state: query, genres, styles, kinds, favourites, sort. Favourites and settings live in the browser and in the settings backup (`src/settings/backup.js`).

## Decisions

### D1. Metadata in the file, listening in the browser

`created` and `appVersion` describe the song and go in its file. Last played changes at every listen, so it stays in the browser (`coding-misk-played`: id → time) and in the backup, merged by the latest time.

### D2. A play counts after 10 seconds

A song counts as played when it has played 10 seconds in a row (Compose, Songs, playlists, radio). Seeking does not reset the count within the same play.

### D3. Filters and sorts

- Sorts: default, title, BPM, length, recently created, recently played. Songs without a date go last.
- Filters: never played (a toggle, like favourites); build style: in blocks (own steps), crescendo (`buildStyle: crescendo`), none.

### D4. Pages after the filter

`viewOf(entries, state)` returns the filtered, sorted list; `pageOf(list, page, size)` returns a slice and the counter. The page number is part of the view state and resets to 1 when query, filters or sort change. Size 20.

### D5. Backfill

`tools/song-dates.mjs` reads the first commit of each file in `songs/` and writes `created` (its date) and `appVersion` (the release tag in force at that date, or 0.1.0 before the first one). Run once; later songs get them when saved.

## Risks / Trade-offs

- **[Songs saved before this change in the browser]** → no date; they sort last until saved again.
