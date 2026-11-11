# Design

## Context

See proposal.md. The Decode tab (`track-to-code`) opens one file at a time and lists the recent tracks only in the empty tab. Pointers checked on `develop` at b935bdb:

| What                                                                   | Where                                                                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Open a file, reopen with a stored handle, pick a file                  | `src/decode/tab.js` `openFile`, `reopen`, `pick`                                 |
| The empty tab's recent list, "Another file"                            | `src/decode/tab.js` `render` (`dc-recent`, `#dc-another`)                        |
| End of a track                                                         | `src/decode/tab.js` `frame` (`f >= cur.duration - 0.03` → `stop`, `app.ended()`) |
| The original's source on Strudel's clock                               | `src/decode/sync.js` `createOriginal`; `tab.js` `startCode`                      |
| Probe, decode, fingerprint, analysis copy                              | `src/decode/input.js`                                                            |
| Decode store (IndexedDB `coding-misk-decodes`, cap 50, quiet failures) | `src/decode/store.js`                                                            |
| Backup of the decodes without handles                                  | `src/settings/backup.js` (`DECODES_KEY`, `mergeDecodes`)                         |
| The backup card (Export everything, Import), export and import of decodes | `src/settings/settings.js` (`#set-export`, `#set-import`, `app.decodes.all()`)  |
| Every stored record read at tab open (recent list)                     | `src/decode/tab.js` (`store.list()` at start and after Remove)                   |
| Player bar Previous and Next (disabled in Decode)                      | `src/main.js` (player bar), `track-to-code` playback spec "The player bar"       |
| App playlists (code songs, drag reorder, repeat)                       | `src/library/playlists.js`, `src/library/playlists-tab.js`                       |
| Level A worker                                                         | `src/decode/worker.js` (`load`, `upTo`, `tempo`)                                 |

The app playlists hold song ids and radio sessions; their queue (`createPlaylistStore`, shuffle, repeat off/all/one) plays generated code. A decoded file is not a song until it is opened in Compose. Mixtapes therefore live in the Decode module with their own store, and reuse only the look of the playlist rows (drag, up and down buttons).

## Goals / Non-Goals

**Goals:**

- One list for recent tracks and folder files, fast at 4000 rows, usable at 400 px.
- Folder access that costs one click per session and stores no audio.
- Autoplay with no gap when the next track is ready, without hurting the playing track.
- Pure parts (list, order, next track, mixtape operations, backup merge, preparation timing) checked in Node.
- Up to 2000 stored analyses without making the tab heavier.

**Guiding rule: the browser stays light and loads only what is needed.** (Owner, 11 November.) The list, the marks, the cap and the backup's default read the light index (D13), never every stored analysis; a stored analysis is read by its key when its track opens or is prepared; nothing reads all records when the tab or the panel opens. Every decision below follows it.

**Non-Goals:**

- Shuffle, crossfades between tracks, watching folders in the background.
- Mixtapes without the File System Access API.
- Any change to the analysis, the writer or the mix of a track.

## Decisions

### D1. Modules and storage

- `src/decode/library.js` (no DOM): the rows of the list from the folder index, the decode records and the single files; names; marks; search; filter; order; the next row of a context.
- `src/decode/folders.js`: `showDirectoryPicker({ mode: 'read' })`, permission (`queryPermission`, `requestPermission`), the scan (D3).
- `src/decode/library-store.js`: IndexedDB database `coding-misk-decode-library`, version 1, with the stores `folders` (`{ id, name, handle, added, count, capped, scanned }`), `files` (the index: `{ folderId, path, name, size, modified, video, title?, artist? }`, key `[folderId, path]`), `singles` (`{ id, name, size, handle }`) and `mixtapes` (`{ id, name, rows, repeat, created, updated }`). It fails quietly like `store.js`. A separate database keeps the library's data apart from the decode store and its backup key; the decode store gains only its own light index (D13).
- `src/decode/mixtapes.js` (no DOM): create, add, move, remove, rename, delete, the export for the backup and the merge on import.
- `src/decode/autoplay.js`: the preparation and the hand-over (D8, D9), with its timing as a pure function.
- `src/decode/library-panel.js`: the panel and the empty tab's list; `tab.js` keeps the track and calls it.
- localStorage (carried by the backup like every `coding-misk-` key): `coding-misk-decode-autoplay` (boolean) and `coding-misk-decode-list` (`{ chip, order }`). The search text is not remembered.

### D2. Permission

A folder handle comes back from IndexedDB after a reload with permission `prompt`. On opening the panel, `queryPermission({ mode: 'read' })` runs for each folder (no prompt). A folder not `granted` shows its cached rows dimmed with a lock and an "Allow access" button on its chip. `requestPermission` is called only inside a click (the button, or a row of that folder, which then opens the row). Single-file handles (recent tracks, mixtape rows added with "File…") follow the same rule per file. A granted folder stays granted until the page closes, so the scan and Autoplay need no further click.

### D3. Scan

Depth first, entries of each directory sorted by name (so the cap is stable), names starting with `.` skipped, files kept by extension: the list `pick()` already accepts (`.mp3 .wav .flac .m4a .aac .ogg .opus .oga .weba`, video `.mp4 .m4v .mov .webm .mkv`). For each file, `getFile()` gives size and `lastModified`; no bytes are read. The scan stops at 2000 files per folder (`capped: true`). It yields to the page every 100 entries and updates the list in batches. The result replaces the folder's index in IndexedDB, so the next session shows the rows before permission. A scan runs when a folder is added, when it is granted, and when a row of it fails to open.

Cap per folder, not in total: a user with several folders keeps all of them listed; 4000 rows is the tested size (D6).

### D4. Names and tags

The row name comes, in order, from the decode record's title, the cached tags, then `titleFromName(file name)` (`input.js`). Tags are read after the scan, in idle time, only for rows of the active filter, with `mediabunny` on a `BlobSource` (it reads the header, not the file), and cached in the index entry with its size and date. Task 2.4 measures it on 200 files: if the median exceeds 15 ms per file or any task exceeds 50 ms, tags are not read in the list and names come from the file name only; the result goes into the DEVLOG and `docs/knowledge/decisions.md`.

Applied (owner test, 11 November): the idle read that gets the tags also asks mediabunny for the file's primary audio track (the header is read anyway); a file without one is stored with `audio: false` (and `video: true`) in its index entry and shows as a "video only" row: the normal style, the video icon and a small "no sound" mark (owner: such videos are not broken; a later change may show them on the stage). It stays selectable and can go into a mixtape. Owner, final for this fix: it plays like any track, in silence. Its length comes from the header (mediabunny's `computeDuration`, read by the probe, no decoding); the original is a silent clock with the same start, stop and position as a source (`createSilentClock` in `sync.js`), so seeking, Previous, Next and Autoplay's hand-over work unchanged; the code column shows a comment placeholder (a few variants in the app's language, changed every 8 s), nothing is evaluated; no record is stored. The picture is left to a later stage-video change. A file that fails to open with the reason "no sound" is stored the same way. Rows get a kind icon from the app's icon set (`src/icons.js`): a music note for audio, the video icon for video, plus a "no sound" mark. Opening a row from the panel reads and decodes the file before it stops the open track, so a file that cannot open leaves the open track playing and the panel shows a note instead.

### D5. Marks without reading the file

A decode record is keyed by the file's fingerprint, which needs three slices of the file. Reading 2000 files to mark them is too slow, so a record also stores where the file was opened from: `where: { folderId, path, size, modified }`. The list marks a folder file when an index entry (D13) has the same `folderId` and `path` and the same size and date, with ◆ Full when the record has a fresh `modelB` and ◇ Live when only a fresh `modelA` (the index stores the mark and the `ANALYSIS_VERSION` it was computed with, so no record is read). A stale analysis (older `ANALYSIS_VERSION`) gets no mark, since it would be analysed again. A file decoded through another way is marked after it is opened once from the folder (the fingerprint still matches and the record gains `where`). A recent track whose `where` points to a listed file is shown only as that file's row (one row per track); the others show "Recent".

### D6. The panel and the long list

The panel opens over the tab panel (a positioned card below the file row, `max-height: 70vh`), with a close button and Escape. At 400 px it takes the full width of the tab panel. Top: "Choose a file…", "Add folder", search, order (Name / Recent), Autoplay switch, the chips row (All, one chip per folder with lock or ×, scrolling sideways inside itself). Then a segmented switch Tracks / Mixtapes.

Applied (implementation note): Remove shows on every row with a stored analysis (a recent row, or a folder file decoded before); on a folder file it removes the analysis and the mark, the row stays.

Rows have a fixed height (32 px, 40 px at phone width) and the list renders only the visible rows plus a margin (simple windowing), so 4000 rows cost about 30 nodes. Search is normalised once (lower case, accents removed) and filtered on input with a 60 ms debounce. Row: video icon if any, name (ellipsis), folder (muted, ellipsis), mark. ◆ and ◇ are text glyphs, coloured with the accent token, with a tooltip "Full analysis stored" / "Live analysis stored".

Themes: tokens only; the hardware theme draws the panel like its other cards, the marks as small amber LEDs' colour; the light theme passes `check:light-theme` contrast rules.

### D7. Opening from the list

`openFile(file, handle, where)`: `where` goes into the record (D5). A row of a folder: permission (D2), `handle.getFileHandle` along the path, `getFile()`, then the existing `openFile`. `NotFoundError` or a changed size marks the row "not found", rescans the folder and opens nothing. The open track's context (D8) is set from the list or the mixtape the row came from.

### D8. The context and the next track

When a row opens, the tab stores `context = { kind: 'list', chip, search, order, key }` or `{ kind: 'mixtape', id, row }`, where `key` identifies the row (`folderId/path` or a record `fp`). `nextOf(context, rows)` in `library.js` rebuilds the list with that chip, search and order, finds `key` and returns the next row that is not "not found" or waiting; for a mixtape it returns the next row, wrapping when repeat is on. A row missing from the rebuilt list (renamed meanwhile) continues from the position it had. "Choose a file…" and a drop set `context = null` (no next track).

Applied (implementation note): a folder chip or an order chosen in the panel while a list track plays becomes the context's chip or order (the spec scenario "One at a time": a new chip drops the prepared track and prepares the new next one); the search typed meanwhile does not change it. A row that fails to open while Autoplay, Previous or Next go through a list is skipped until another list opens. With the order by recent (owner, 11 November), the context keeps the last uses of the rows as they were when the track opened (`used`, key to time), so the tracks that play meanwhile do not move to the top of its list; Autoplay, Previous and Next sort by those times. They are taken again when the user picks a chip or an order, or opens the panel (the moments the user looks at the list again).

Applied (owner test, 11 November): one function of the tab opens a row of a context with the skips (`openWithSkips`): it is used by Autoplay's end, Previous, Next and a mixtape's Play; rows "not found" or waiting are skipped by `nextOf` and `prevOf` without being opened (a video without sound plays), a row that fails when opened is added to the context's skipped rows and the next one is tried; the names of the skipped rows go into one note; with no playable row left the tab stops with a note (the skipped rows count as missing, so a mixtape with repeat ends instead of looping).

Applied (owner, 11 November): a kind filter (`kind`: all, audio, video; a recent track counts by the record's video flag) is part of the context like the chip: the list remembers it with the chip and the order in `coding-misk-decode-list`, a kind picked while a list track plays becomes the context's kind, and Autoplay, Previous and Next step through the rows of that kind. Its counts come from the rows already built (one pass over them per chip and search), never from the files.

### D9. Preparation

`prepareAt(duration, now)` returns the file time to start: `max(0, duration - 30)`. At that time, with Autoplay on and a next row, `autoplay.js`:

1. checks permission (granted this session, else skips to the row after; it cannot ask without a click);
2. `getFile()`, `probe()` (limit, sound);
3. checks the budget: decoded size ≈ `duration × sampleRate × channels × 4` bytes, budget 120 MB (about 5 minutes of stereo at 48 kHz; decided by the owner); over budget it stops here and decodes at the hand-over;
4. `decode()` on the app's audio context, `fingerprint()`, the decode store lookup;
5. a second level A worker (`worker.js`) loaded with the analysis copy, the stored tempo sent if any, `upTo(LOCK_SECONDS + horizon)`.

`analysisCopy` averages channels on the main thread; for long files it is split in chunks of 2 seconds with a yield between them, so no task exceeds 100 ms. Only one prepared track exists; a new context, a new open, Autoplay off or the end of the tab drop it (worker terminated, buffer released).

### D10. Hand-over

The playing original's end time on the audio clock is known (`createOriginal` start time plus remaining length). When ready, the next original's source is started at exactly that time, and the code of the next track starts through the existing `play(0)` path with the prepared worker as the tab's worker and its first model: the code column is cleared and starts from the new track's first lines, the original plays alone until the first downbeat as today. The tab's `cur`, title and stage swap at that moment. The current `frame()` end test (`stop`, `app.ended()`) runs only when there is no next track.

Applied (implementation note): the code's start time is set by Strudel's scheduler when it evaluates, not by the tab, so the hand-over starts the code a little before the end (the measured scheduler delay plus 40 ms) and starts the next original at the end time with the offset the code's clock has already passed. Measured on generated tracks: no gap (0 to 11 ms), 40 to 56 ms of the next track's start skipped, the original and the code in step. With Next (D15) the end time is "now".

When not ready at the end: silence, a status line "Next: <name>…" with the growing mark; when ready, it starts at once; after 3 seconds the original starts (if decoded) and the code joins when `takeModel` finds the tempo, which is the existing path for a track whose tempo is not locked yet. A next track that fails is skipped with a toast and the next one is tried at once (not prepared ahead); after the list ends the tab stops.

### D11. Mixtapes

A row is `{ id, ref, name, video }` with `ref = { folderId, folderName, path }` or `{ singleId, fileName, size }`. `folderName` lets a backup row relink: when a folder is added, rows whose `folderId` is unknown and whose `folderName` equals the new folder's name get the new id. Status per row, computed when the panel shows it: `ok`, `waiting` (folder or file not granted), `missing` (folder unknown, path not in the index, or `getFile` fails). The Mixtapes view lists mixtapes (name, rows, Play); an open mixtape shows its rows with drag handles (HTML drag and drop like `playlists-tab.js`) and up and down buttons, remove, "File…", repeat, rename, delete. Multi-select in the Tracks view: a "Select" button shows a checkbox per row; "Add to mixtape ▾" lists the mixtapes and "New mixtape". Mixtapes are written to IndexedDB; the backup key `coding-misk-decode-mixtapes` holds `{ format: 1, folders: [{ id, name }], mixtapes }` without handles, exported from IndexedDB like the decodes and merged by `id` (newest `updated` wins).

### D12. Stored tracks

Measured on 11 November: a stored record (level A and level B models) is about 20 kB per minute of audio (a 2-minute track about 38 kB, a 3-minute track about 64 kB, a 5-minute track about 110 kB). `DECODE_CAP` goes from 50 to 2000, about 150 MB at typical lengths. `overCap` drops Live-only records (no fresh `modelB`) by least recent use first, then Full records. It reads the index (D13), not the records: the entries carry `used` and the mark. Records and their index entries are deleted in one transaction. A write that fails with `QuotaExceededError` drops records in the same order, ten at a time, and retries until it succeeds or no other record is left; it stays quiet like every store failure.

### D13. The light index

A record holds the models and is read only when its track opens (D7), is prepared (D9) or is exported in the backup (D14). Everything else reads a light index: one entry per record, `{ fp, title, artist, name, mark: 'full' | 'live', version, where: { folderId, path, size, modified } | null, used, hasHandle }`, a few hundred bytes, so 2000 entries are well under 1 MB. `name` is the file name; `version` is the `ANALYSIS_VERSION` the mark was computed with (a different version shows no mark, D5).

Where: a new object store `index` (key `fp`, index `used`) in the decode database `coding-misk-decodes`, whose version goes from 1 to 2. Chosen over a store in the library database because a record and its entry must change together: `put`, `touch`, `remove` and `overCap` write both in one transaction, which IndexedDB allows only inside one database. The library database stays free of decode data.

Migration: the upgrade to version 2 creates `index` and fills it with a cursor over `decodes` inside the upgrade transaction (at most 50 records exist at that point). Rebuild: when the store opens, it compares `count()` of `decodes` and `index` (keys only, no record read); when they differ, or `index` is missing, it rebuilds the missing or extra entries with a cursor over the records, in batches of 50 with a yield between them, in the background; the list shows what the index holds meanwhile.

The store's API: `entries()` (the index, most recent first), `get(fp)` (one record), `put`, `touch`, `remove`, `recent(n)` (the `n` records used last, read by key from the index order), `each(fn, batch)` (every record in batches, for the backup), `importMany(list)`. `list()` and `all()`, which read every record, go. `tab.js` builds the recent rows from `entries()` at start and after a Remove.

### D14. The analyses in the settings backup

The backup card in the settings page (`src/settings/settings.js`, beside Export everything and Import) gains a checkbox "Include all Decode analyses" / "Includi tutte le analisi di Decode", off by default and not remembered, with a tooltip: "Adds every stored Decode analysis, not only the 100 used last. The file can get large: about 20 kB per minute of audio, about 100 MB for 1000 tracks." / "Aggiunge tutte le analisi di Decode salvate, non solo le 100 usate per ultime. Il file può diventare grande: circa 20 kB per minuto di audio, circa 100 MB per 1000 brani."

Off: Export reads `recent(100)` and `makeBackup` writes those records under `DECODES_KEY`, without handles as today. On: Export reads every record with `each` in batches of 50 and the file is built from parts (a `Blob` of string parts), so neither the records nor one huge string stay in memory at once. Import is unchanged in its rule (`mergeDecodes`: the record used last wins, a stored handle stays) but compares against the index, not every record: an incoming record is written when the index has no entry for its `fp` or an older `used`, and only then is the current record read, to keep its handle. The cap (D12) applies after the import.

### D15. Previous and Next on the player bar

With a list or mixtape context (D8), the player bar's Previous and Next are enabled in Decode. `nextOf(context, rows)` gives Next; `prevOf(context, rows)` gives the row before, with the same skipped rows and the mixtape's repeat wrapping backwards. Next opens the next track at once: when the prepared track (D9) is ready, it hands over now (D10, with the start time "now" instead of the end time); else it opens like a click on the row and drops the preparation. Previous opens the row before like a click on it. Either sets the context's `key` to the new row. Without a context (a picked or dropped file), at the first row (Previous) or the last row (Next) without repeat, the button stays disabled. Previous always goes to the row before; it does not restart the playing track.

### D16. Strings

New strings in English and Italian, for example: "Add folder" / "Aggiungi cartella", "Allow access" / "Consenti l'accesso", "All" / "Tutti", "Name" / "Nome", "Recent" / "Recenti", "Search" / "Cerca", "Autoplay" / "Riproduzione automatica", "Tracks" / "Brani", "Mixtapes" / "Mixtape", "New mixtape" / "Nuova mixtape", "Add to mixtape" / "Aggiungi alla mixtape", "File…" / "File…", "Repeat" / "Ripeti", "not found" / "non trovato", "Full analysis stored" / "Analisi completa salvata", "Live analysis stored" / "Analisi live salvata", "This browser cannot open folders. Choose a file instead." / "Questo browser non apre cartelle. Scegli un file.", "Next: {name}…" / "Prossimo: {name}…", and the backup checkbox and its tooltip (D14). `npm run check:guide` checks both languages.

## Risks / Trade-offs

- **Memory during preparation.** Two decoded tracks live at once. Mitigation: the 120 MB budget (D9) and dropping the prepared track on any change; a longer next track gets a short pause instead.
- **Main-thread work while playing.** Decoding, the analysis copy and the fingerprint run near the end of a track. Mitigation: chunks and yields (D9), and a browser check of long tasks during preparation.
- **Permission lost mid-session** (the user revokes it in the browser). The row becomes "waiting" and Autoplay skips it; the next click asks again.
- **Fake handles cannot be stored.** IndexedDB clones `FileSystemHandle` objects only when they are real. The browser check therefore builds its fake folder in the origin private file system (`navigator.storage.getDirectory()`), whose handles are real and storable, and patches `showDirectoryPicker`, `showOpenFilePicker` and the permission methods to return them and to simulate `prompt` after a reload.
- **Tags may be slow.** D4's measure decides; file names are the fallback.
- **Storage of about 150 MB.** 2000 analyses take about 150 MB of the browser's quota. Mitigation: the quota rule of D12, the cap, and Remove on recent rows. The backup's default stays small (100 analyses).
- **Index out of step with the records** (a crash between writes in an older version, a manual deletion). Mitigation: one transaction for both (D13) and the rebuild on open.
- **A large backup file.** With all analyses, 1000 tracks give about 100 MB. Mitigation: off by default, the tooltip, and the export built in parts (D14).

## Migration Plan

Records without `where` keep working as recent tracks. The decode store's database goes from version 1 to 2: the upgrade adds the `index` store and fills it from the existing records (D13); records are not rewritten. The new library database starts empty. Backups without `coding-misk-decode-mixtapes` import as before, and backups with any number of analyses import through the index.

## Open Questions

None left. The owner decided on 11 November:

1. **A next track longer than the memory budget.** Decided: (a), a budget of 120 MB for the prepared track. A next track longer than about 5 minutes is read ahead but decoded at the hand-over, so a short pause and the 3-second rule apply (D9, D10). Rejected: (b), always decoding ahead (up to about 230 MB more for a 10-minute track).
2. **Stored analyses cap.** Decided: 2000 analyses (about 150 MB at the measured 20 kB per minute of audio), Live-only analyses dropped before full ones (D12); a light index for the list and the marks, records read only when a track opens (D13); the backup carries the 100 analyses used last unless "Include all Decode analyses" is ticked (D14). Rejected: 100 analyses, and keeping 50 with the plain least-recently-used rule.
3. **Previous and Next on the player bar in Decode.** Decided: enabled with a list or mixtape context (D15), about 1 agent hour, with a playback spec delta. Rejected: keeping them disabled.
