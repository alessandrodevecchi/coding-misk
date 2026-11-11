# Proposal

## Why

The Decode tab opens one file at a time. To decode another track the user goes back to the system file picker, and the tracks decoded before are reachable only from the empty tab. The owner keeps music in folders and wants to browse them inside the tab, play one track after another while the code is written, and keep small ordered selections of real files. The owner decided the lines of the feature on 10 November (private backlog notes, Decode section).

The "Recent tracks" part of the change `decode-refine` moves here, so one change owns the whole panel.

## What Changes

- **The "Another file" panel.** "Another file" opens a panel with "Choose a file…", the recent tracks and the files of the user's folders, in one compact list. The empty tab shows the same list under its drop area. The panel is not a fixed column and works at phone width.
- **Folders.** In browsers with the File System Access API the user adds one or more folders. The app remembers them in IndexedDB and asks the browser's permission again once per session, with one click. Subfolders are included, up to about 2000 files per folder. Video files that Decode accepts are listed with a small video icon.
- **The list.** One row per track: the name (from the tags when they are cheap to read, else from the file name), the folder, and a mark when an analysis is stored: ◆ Full or ◇ Live. Search by name, a chip per folder (All, or one folder; × removes a folder), order by name or by recent. The length is not in the list; it shows when the track opens. A click opens the track in Decode. A track with a stored full analysis opens in Full without analysing again. When the browser keeps no storage, the panel says so.
- **Autoplay.** Off by default, its switch remembered. At the end of a track, Decode opens the next one in the list as filtered and ordered when the track was opened, or the next track of the mixtape. The next track is prepared before the end (read, decoded, Live analysis started), one at a time. It starts in Live, or in Full when a full analysis is stored, and its code starts from the beginning. When it is ready there is no gap. When it is not, there is a pause; after about 3 seconds the audio starts and the code joins when the analysis is ready.
- **Mixtapes** (the name is "Mixtape" in English and Italian). An ordered selection of files to decode one after another. A mixtape stores references to files (a folder and a path inside it, or a single file), never audio. Create, add tracks from the list (several at once), reorder by dragging, rename, delete, play in order with autoplay, repeat on or off. Tracks may come from different folders, or be single files added with "File…". A file that moved or is gone stays as a row marked "not found". Mixtapes are part of the app's backup; the files are not, so on another computer the rows show "not found".
- **Mixtapes are not playlists.** The app's playlists hold generated songs (code). A user who wants a decoded track in a playlist opens it in Compose and saves it there, as today.
- **Other browsers.** Without the File System Access API the panel offers "Choose a file…" and the recent tracks only; folders and mixtapes are not shown, with a note that this browser cannot open folders.
- **Previous and Next in Decode.** The player bar's Previous and Next, disabled in Decode today, work when the open track came from the list or a mixtape: Next opens the next track at once (the prepared one when it is ready), Previous the one before.
- **Stored analyses.** A stored analysis is about 20 kB per minute of audio. The store keeps up to 2000 tracks instead of 50 (about 150 MB) and drops tracks with a Live analysis only before tracks with a full analysis, so autoplay through a folder does not push out the full analyses.
- **A light index.** The browser stays light and loads only what is needed. A small index of the stored tracks (name, mark, where the file was opened from, last use) feeds the list and the marks; a stored analysis is read only when its track opens. Opening the tab no longer reads every stored analysis.
- **Backup of the analyses.** The settings backup carries the 100 analyses used last by default. A checkbox "Include all Decode analyses", off by default, adds every stored analysis, with a tooltip that says the file can get large. Import merges as today.
- Guide card, knowledge notes, Italian and English strings, the hardware theme and the light theme, and checks: Node checks and a browser check with a fake folder.

Out of scope:

- shuffle in the list or in mixtapes;
- reading tags of every file at scan time when it is slow (the file name is used);
- the length of each file in the list;
- watching folders for changes while the panel is closed (the list refreshes when the panel opens);
- mixtapes in browsers without the File System Access API;
- moving a mixtape's files to another computer.

## Capabilities

### New Capabilities

- `decode/library`: the "Another file" panel, folders and their permission, the list of tracks, search, folder chips, order, marks, opening a track, other browsers.
- `decode/autoplay`: the Autoplay switch, the next track, its preparation and the hand-over between two tracks.
- `decode/mixtapes`: mixtapes as ordered references to files, editing, playing, "not found" rows and the backup.

### Modified Capabilities

- `decode/track-input`: "Reopen a recent track" (moved from `decode-refine`, now the panel's list), "Stored tracks are bounded" (2000 tracks, Live-only analyses dropped first), and new requirements for the light index, loading an analysis only when its track opens, and the analyses in the settings backup.
- `decode/playback`: "The player bar" (Previous and Next enabled with a list or mixtape context).

These capabilities are defined in the change `track-to-code`, which is not archived yet. This change is applied after `track-to-code` is archived and after part 1 of `decode-refine`, which no longer carries the recent tracks.

## Impact

- New modules in `src/decode/`: `library.js` (the list: index, names, marks, filter, order, next track; no DOM), `folders.js` (folder picker, permission, scan), `library-store.js` (IndexedDB `coding-misk-decode-library`: folders, file index, single files, mixtapes), `mixtapes.js` (mixtape operations and backup merge; no DOM), `autoplay.js` (preparation and hand-over), `library-panel.js` (the panel).
- `src/decode/tab.js` ("Another file", the empty tab's list from the index, opening from the list with the file's location, the end of a track, Previous and Next), `src/decode/store.js` (the file's location in a record, the cap of 2000, the `index` store and database version 2, the record read by key only), `src/decode/input.js` (open a file from a handle).
- `src/main.js` (the end of a track in Decode, Previous and Next on the player bar), `src/settings/backup.js` (mixtapes and folder names in the backup, the 100 analyses used last or all), `src/settings/settings.js` (the backup card's "Include all Decode analyses" checkbox and tooltip, export and import through the index), `src/i18n.js`, `src/guide.js`, `src/style.css`, `src/theme-light.css`.
- Tools: `tools/check-decode-library.mjs` (`npm run check:decode-library`), `tools/check-decode-library.cjs` (browser, fake folder), `tools/check-backup.mjs` (mixtapes, the 100 analyses used last, all analyses), `tools/check-player.cjs` (Previous and Next in Decode), `AGENTS.md` tooling lines.
- Docs: `docs/knowledge/` (decode note, decisions, checks), `docs/ARCHITECTURE.md` (persistence), `DEVLOG.md`.
- No new dependency. No change to the analysis, the writer or `ANALYSIS_VERSION`.
