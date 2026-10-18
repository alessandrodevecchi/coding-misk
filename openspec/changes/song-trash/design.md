## Context

See proposal.md for the motivation. Today:

- The library lives in `localStorage` under `coding-misk-library`: `{ tracks, code, codeSongs }`. `tracks` holds the user's composed songs and their edits of built-in songs; `codeSongs` holds hand-coded versions (#33); `code` holds edits of hand-written songs.
- Compose "Delete song" (`#tr-del` in `src/main.js`) uses `confirmTwice` (a toast and a second tap). For an edited built-in song it restores the original.
- The Songs tab card (`renderSongs`, `src/library/songs-view.js`) already deletes a hand-coded version (`del-version`, two taps) and restores an edited hand-written song.
- Playlists (`src/library/playlists.js`) keep song ids. A missing id is skipped by the queue and drawn as a missing row in the Playlists tab.
- The backup (`src/settings/backup.js`) copies every `coding-misk-*` key and merges the library by id on import. It never deletes.
- Free tags are typed by the user (`parseFree` in `src/library/song-filter.js`). A tap on a free tag puts it in the search.
- Built-in test songs: `prova-apre-arpeggio`, `prova-breakbeat`, `prova-drum-and-bass`, `prova-solo-synth`, `switch-test-breve`, `switch-test-onda`, `switch-test-stanza`, `switch-test-acido`, `switch-trance-prova`, `switch-acid-prova`, `switch-house-prova`.

## Goals / Non-Goals

**Goals:**

- One trash for every delete of a user song, from the Songs tab and from Compose.
- No toast confirmations for delete: the confirmation sits where the user pressed.
- Playlists never hold the id of a deleted song.
- The trash logic is pure and checked in Node.

**Non-Goals:**

- Deleting or hiding built-in songs.
- Deleting radio sessions saved in playlists (they already leave with "remove from playlist").
- Undo for "delete for good".
- Bulk select and delete of many songs at once.

## Decisions

### D1. The trash lives in the library

The library gets a `trash` list: `[{ id, kind, song, deletedAt }]`. `kind` is `track` (a composed song) or `version` (a hand-coded version). `song` is the stored object as it was. `deletedAt` is an ISO date. Keeping it inside `coding-misk-library` means the backup carries it with no new key, and a reload keeps it.

Alternative: a separate key `coding-misk-trash`. Rejected: two keys that must stay in step, and a backup could carry one without the other.

### D2. A pure trash module

A new module in `src/library/` with no DOM and no storage: `trashSong(lib, id, now)`, `restoreSong(lib, id)`, `deleteForGood(lib, id)`, `emptyTrash(lib)`, `purgeTrash(lib, now, days = 30)`, `daysLeft(entry, now)`. Each takes the library object and returns the new one. The app calls it and saves. A new Node check (`tools/check-trash.mjs`, `npm run check:trash`) covers it. Time comes from the caller, so checks pass a fixed date. Nothing in this change is random.

### D3. What can be deleted

A composed song whose id is not built-in, including songs saved from the radio and new songs from an artist. A hand-coded version (`codeSongs`). An edited built-in song keeps "Restore original", which drops only the edit, as today. The existing `del-version` action of the card goes through the trash too.

### D4. Confirmation in the page

Delete opens a small strip inside the card: "Move to the trash?" with [Delete] and [Cancel]. Focus moves to [Cancel]; Escape cancels. The same strip pattern serves "Delete for good" and "Empty trash" in the Trash view. Compose "Delete song" uses the same strip under its button. The toast after a delete says "Moved to the trash" with a [Restore] link while it shows.

Alternative: keep the two taps on the toast. Rejected by the owner's request (#68): the toast is easy to miss and gives no context.

### D5. Playlists cleaned on delete

The playlist store gets `removeSong(songId)`: it removes the id from every list, favourites included, and saves. The app calls it when a song goes to the trash. Restore does not add it back. If the song is playing, it keeps playing until it ends or is stopped; the queue then skips it, as it already does for a missing id. If Compose holds the song, Compose opens the first song, as today.

### D6. Trash view inside Songs

The Songs tab bar gets a "Trash (n)" button next to the playlist menu. It swaps the list for the trash list; the search and filters hide while it is open. Each row shows title, kind label, date deleted, days left, [Restore] and [Delete for good]. [Empty trash] sits at the top. The view state (open or not) is not remembered across reloads.

### D7. Purge after 30 days

`purgeTrash` runs at start, after the library is read, and when the Trash view opens. An entry goes when `now - deletedAt >= 30 days`. Days left round up, so a song deleted today shows 30.

### D8. Backup merge

`mergeBackup` merges `trash` by id like `tracks`. After the merge, any trash entry whose id is in `tracks` or `codeSongs` is dropped: a song alive on either side stays alive, so an import never deletes. Old trash entries in a backup are purged at the next start by D7. `tools/check-backup.mjs` gets a case for it.

### D9. The test tag and its filter

`test` is an ordinary free tag. The song entry gets `test: free.includes('test')`. The view gets a boolean `testOnly`, shown as a "Test" chip in the Kinds group; it combines with AND like "never played". `cleanView` keeps it. A tap on a `#test` tag of a card turns the chip on instead of filling the search. The eleven built-in test songs listed in Context get `"free": ["test"]` in their JSON tags. The song files change only in tags, so the generated code and levels stay the same.

## Risks / Trade-offs

- [The library object grows with the trash] → It holds at most 30 days of deletes; songs are a few kB each.
- [A song is deleted while the radio or a fast export uses it] → Both work on a copy already loaded; the delete only affects the library and playlists.
- [An old backup without `trash` is imported] → Merge treats a missing `trash` as empty.
- [A restored version whose original built-in song changed] → Versions keep their own code; the card still links them by the original id, as today.
- [Tagging built-in songs changes their JSON] → `npm run check:code` and `npm run check:songs` confirm no change in the code.

## Migration Plan

No migration: a library without `trash` reads as an empty trash. Rollback: an older app ignores the `trash` field and keeps working; songs in the trash stay out of its list.

## Open Questions

- **Which built-in songs are test songs?** Recommended: the eleven in Context (`prova-*`, `switch-test-*`, `switch-*-prova`). `switch-tappe` and `switch-prima-luce` stay untagged: they are reference songs for the profile, not tests.
- **Hide test songs by default?** Recommended: no. The default list stays as today and the Test chip shows only tests. A "hide tests" toggle can come later if the owner wants a cleaner default.
- **Toast with [Restore] after delete?** Recommended: yes, for the few seconds the toast shows; it saves a trip to the Trash view after a wrong tap.
