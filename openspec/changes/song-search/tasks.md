# Tasks

## 1. Format and genres

- [x] 1.1 Add `GENRES` to the song format constants and genre names in English and Italian to `src/i18n.js`
- [x] 1.2 Validate optional `tags` (genres from the list, style ids with a warning when unknown, free tags lowercase and at most 24 characters) and `origin` in the song validator
- [x] 1.3 Add `genre` to the recipe format: validator error for unknown genres, `experimental` with a warning when missing, genre in every file of `styles/` per the design table
- [x] 1.4 Show and edit the genre in the Styles tab (sheet and form)

## 2. Tags on songs

- [x] 2.1 Add tags to every file in `songs/` and to every code track in `src/content.js`
- [x] 2.2 Write style tags and `origin: "endless"` in director songs; update seed fixtures and code snapshots with the reason
- [x] 2.3 Check that saving from the radio keeps tags and origin

## 3. Filter module

- [x] 3.1 Pure module: song entry from a card (title, style texts, tags, kind, mine, favourite, BPM, seconds, index), genres from styles plus own genres, accent-free search, chip groups, sorting
- [x] 3.2 Node check for search, OR and AND rules, sorting and genres from styles; add it to `check:endless` or a new npm script

## 4. Songs tab

- [x] 4.1 One list: merge composed and code cards, kind label and tags on each card, style names from the current style list
- [x] 4.2 Search bar, chips for genre, style and kind, favourites switch, sort menu, match count, clear action when nothing matches
- [x] 4.3 Star on each card; favourites and view state kept in browser storage and restored
- [x] 4.4 Hide and reorder cards instead of rebuilding them; search waits 120 ms after typing
- [x] 4.5 Tags panel for the user's songs; read-only tags on built-in songs
- [x] 4.6 Player bar previous and next follow the visible list, falling back to the full list
- [x] 4.7 Styles for the bar, chips, star and labels in every theme, and at phone width

## 5. Checks and docs

- [x] 5.1 Browser check for the Songs tab: search, filters, favourites after reload, sort, tag edit, previous and next
- [x] 5.2 Run `check:code`, `check:songs`, `check:styles`, `check:endless`, build, and the library, player, hand and radio checks
- [x] 5.3 Update `docs/SONG-FORMAT.md`, `docs/STYLES.md`, `docs/ARCHITECTURE.md`, README in English and Italian, `DEVLOG.md`
