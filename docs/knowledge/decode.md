---
id: decode
related: [library, settings, export, live-build]
code: [src/decode/tab.js, src/decode/store.js, src/decode/library.js, src/decode/library-panel.js, src/decode/library-store.js, src/decode/folders.js, src/decode/mixtapes.js, src/decode/autoplay.js]
checks: [npm run check:decode, npm run check:decode-library, node --no-warnings tools/check-backup.mjs]
---

# Decode

## What it is

The Decode tab plays a track of the user's and writes its code while it plays (Live, level A) or from a whole-file analysis (Full, level B). The file stays on the device: the app keeps its analysis, settings and, where the browser gives one, a handle to the file.

The library around it (decode-library) is the "Another file" panel: "Choose a file…", the recent tracks and the files of the user's folders in one compact list, Autoplay, Previous and Next on the player bar, and mixtapes. The same list shows under the drop area of the empty tab.

## How it connects

- **The decode store** (`src/decode/store.js`, IndexedDB `coding-misk-decodes`, version 2): one record per file fingerprint, and a light index entry next to it (`index` store: name, title, mark, analysis version, where the file came from, last use). The lists, the marks, the order by recent, the cap and the backup's default read only the index. A record is read when its track opens, when Autoplay prepares it, or for the backup. Record and entry are written and deleted in one transaction; the index is rebuilt in the background when the two stores differ.
- **The library database** (`src/decode/library-store.js`, `coding-misk-decode-library`): folders with their handles, the folders' file index (path, size, date, tags read), single files of mixtapes, mixtapes. No audio, no decode data.
- **Folders** (`src/decode/folders.js`): the File System Access API (Chrome, Edge). The browser's permission is asked only inside a click; after a reload a folder's last rows show at once, waiting. The scan is depth first, sorted by name, skips dot names, keeps the extensions Decode opens, stops at 2000 files per folder and pauses every 100 entries.
- **Marks** ◆ Full and ◇ Live come from the index: a record remembers `where` (folder, path, size, date) so a folder's file is marked without reading it. A stale analysis (older `ANALYSIS_VERSION`) has no mark.
- **Autoplay** (`src/decode/autoplay.js`): the next row of the list or mixtape the track came from is prepared 30 s before the end (read, decoded within a 120 MB budget, fingerprint, stored record, a second level A worker). The hand-over starts the next original where the playing one ends; not ready, the tab waits, and after 3 s the sound starts and the code joins when the tempo is found.
- **Settings backup** ([library.md](library.md), [settings.md](settings.md)): the 100 analyses used last by default, every analysis with "Include all Decode analyses" (written in parts); mixtapes with folder names and paths, never handles.
- **Playlists** hold generated songs; mixtapes hold references to the user's files. A decoded track reaches a playlist only through Open in Compose and a save.

## Options

| Option | Values | Where |
| --- | --- | --- |
| Autoplay | off (default), on; remembered in `coding-misk-decode-autoplay` | the panel, browsers with folders |
| Folder chip | All or one folder; remembered with the order in `coding-misk-decode-list` | the panel |
| Order | Name, Recent | the panel |
| Search | name, artist or file name, case and accents ignored; not remembered | the panel |
| Mixtape repeat | off (default), on; kept with the mixtape | an open mixtape |
| Include all Decode analyses | off by default and on every visit of the settings page | Settings, backup card |

Numbers: 2000 files listed per folder, 2000 stored analyses (Live-only ones dropped first), about 20 kB of analysis per minute of audio, 100 analyses in a default backup, 30 s of preparation, a 120 MB budget for the prepared track's sound, 3 s of silence before a late next track's sound starts.

## Example

A folder "Demos" ordered by name, Autoplay on: the user opens "B" from the Demos chip. About 30 s before B ends, the next Demos track by name is read and decoded and its Live analysis starts. At B's end its sound starts exactly where B's ends (the hand-over skips the few milliseconds of its start the code's clock has passed) and the code column starts from the new track's first lines. Next on the player bar does the same at once; Previous opens the track before.

## Where to read more

- [proposal and design](../../openspec/changes/decode-library/design.md), the specs `decode/library`, `decode/autoplay`, `decode/mixtapes`.
- [checks.md](checks.md): `npm run check:decode-library` and the browser check `tools/check-decode-library.cjs` (fake folders in the origin private file system).
- [decisions.md](decisions.md): marks by location, the cap per folder, the budget, the tags' timing.
