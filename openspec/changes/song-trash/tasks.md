## 1. Trash logic

- [x] 1.1 Pure trash module in `src/library/`: move to trash, restore, delete for good, empty, purge after 30 days, days left; verify with a new `tools/check-trash.mjs` and `npm run check:trash` (fixed dates, both kinds `track` and `version`)
- [x] 1.2 Playlist store `removeSong(id)`: removes the id from every list, favourites included; verify with a new case in `npm run check:playlists`
- [x] 1.3 Backup merge of `trash` by id, songs alive on either side dropped from the trash, missing `trash` read as empty; verify with new cases in `node --no-warnings tools/check-backup.mjs`

## 2. Delete and trash in the app

- [x] 2.1 Songs card: Delete action on the user's songs and versions only, confirmation strip in the card (Delete, Cancel, Escape); `del-version` goes through the trash; verify in the browser that built-in cards have no Delete
- [x] 2.2 Compose "Delete song": the same confirmation strip, the song goes to the trash, built-in songs keep "Restore original"; verify by deleting the open song in the dev server
- [x] 2.3 Delete wiring: library saved, playlists cleaned, Compose moves off the song, toast "Moved to the trash" with Restore; verify the song is gone from favourites and a playlist
- [x] 2.4 Trash view in the Songs tab: "Trash (n)" button, rows with date and days left, Restore, Delete for good, Empty trash with confirmation, empty state; purge at start and on open; verify with a library holding an entry 31 days old
- [x] 2.5 Interface strings in `src/i18n.js`, English and Italian; verify with `npm run check:guide`

## 3. Test tag

- [x] 3.1 `test` in the song entry, `testOnly` in the view and `cleanView`, Test chip in the Kinds group, `#test` tag on a card turns the chip on; verify with new cases in `npm run check:song-filter`
- [x] 3.2 Built-in test songs tagged `"free": ["test"]` (list in design.md, after the owner's answer); verify `npm run check:songs` and `npm run check:code` report no change in code

## 4. Checks, Guide and log

- [x] 4.1 Browser check `tools/check-songs-tab.cjs` extended: delete with confirmation and cancel, trash view, restore, delete for good, playlists cleaned, test chip; screenshots of the confirmation strip and the trash view
- [x] 4.2 Guide card "Songs" in `src/guide.js` updated in English and Italian (Delete, Trash, 30 days, Test chip); verify `npm run check:guide`
- [x] 4.3 `docs/ARCHITECTURE.md` persistence section: the `trash` field of the library; AGENTS.md tooling list gets `npm run check:trash`
- [x] 4.4 Run `npm run check:trash`, `npm run check:song-filter`, `npm run check:playlists`, `node --no-warnings tools/check-backup.mjs`, `npm run check:guide`, `npm run build`
- [x] 4.5 DEVLOG entry in Italian: what changed, the test songs tagged, anything learned
