## Why

The owner makes many test songs and wants to clear them out (#68). Today a saved song can only be deleted from Compose ("Delete song", two taps on a toast). The Songs tab has no delete. A deleted song is gone for good, and its id stays in playlists, where it is hidden but still counted. There is no way to mark or find test songs.

## What Changes

- **Delete in the Songs tab.** The card of one of the user's songs gets a Delete action. It asks for confirmation inside the card, not with a toast.
- **Trash.** A deleted song goes to a Trash view inside the Songs tab. From there it can be restored or deleted for good. Songs in the trash are deleted for good 30 days after they were deleted.
- **Same trash from Compose.** "Delete song" in Compose also moves the song to the trash.
- **Playlists cleaned.** Deleting a song removes it from every playlist, favourites included. Restoring it does not put it back.
- **Persisted and backed up.** The trash lives with the song library in the browser and is part of the settings backup.
- **Test tag.** A song can carry the tag `test`. A filter shows only test songs. The built-in test songs carry it.
- **Built-in songs stay.** Only the user's own songs and hand-coded versions can be deleted. A built-in song keeps "Restore original" for its edits.

## Capabilities

### New Capabilities

- `app/song-trash`: delete a user song, the trash view, restore, delete for good, purge after 30 days, trash in the backup.

### Modified Capabilities

- `app/song-library` (change `song-search`): the Delete action on a card, the `test` tag and its filter (requirements added here).
- `app/playlists` (change `playlists`): a deleted song leaves every playlist (requirement added here).

## Impact

- **Code:** a pure trash module in `src/library/` (move, restore, purge, merge); `src/main.js` (Songs card action, Compose delete, trash view wiring); `src/library/songs-view.js` (confirm strip, trash view, test chip); `src/library/song-filter.js` (test filter); `src/library/playlists.js` (remove a song from every list); `src/settings/backup.js` (merge the trash); `src/i18n.js`; built-in test songs in `songs/` get the `test` tag.
- **Checks:** a new Node check for the trash; `tools/check-song-filter.mjs`, `tools/check-playlists.mjs`, `tools/check-backup.mjs` and the browser check `tools/check-songs-tab.cjs` extended.
- **Docs:** Guide card "Songs" in English and Italian, `docs/ARCHITECTURE.md` (persistence), DEVLOG.
