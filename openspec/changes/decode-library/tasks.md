# Tasks

Estimate: about 20 agent hours (17 to 25), in the order below: storage and folders (about 3.5 h), the panel and the list (about 4.5 h), Autoplay (about 4.5 h), mixtapes (about 4 h), strings, guide and docs (about 1.5 h), checks (about 2 h beyond the checks inside each group). Start after part 1 of `decode-refine`. Each group ends with a short run in the app (dev server in the worktree: `BROWSER=none npm run dev -- --port 5251 --strictPort`).

## 1. Storage and folders (about 3.5 h)

- [ ] 1.1 `src/decode/library-store.js`: IndexedDB `coding-misk-decode-library` with `folders`, `files`, `singles`, `mixtapes` (design D1), quiet failures; verify in the app that a reload keeps the folders and the index and that no audio is stored.
- [ ] 1.2 `src/decode/folders.js`: add a folder (`showDirectoryPicker`, read mode, no duplicate by `isSameEntry`), permission query and request inside a click (D2), the scan (D3: depth first, sorted, dot names skipped, extensions, 2000 per folder, yields every 100 entries, batches to the list); verify in Node with fake directory objects (order, cap, skipped names, video flag).
- [ ] 1.3 `src/decode/store.js`: `where` in records (D5), `DECODE_CAP` 100 with Live-only records dropped first (D12); `tab.js` `openFile(file, handle, where)`; update `npm run check:decode` cases for the cap.
- [ ] 1.4 Measure the size of the largest stored record of the test songs (Live and Full) and write it in the DEVLOG.

## 2. The panel and the list (about 4.5 h)

- [ ] 2.1 `src/decode/library.js`: rows from the index, records and single files; one row per track; names (D4 order); marks ◆ / ◇ from `where` and fresh models (D5); search (case and accents), chip, order by name or recent; the remembered chip and order (`coding-misk-decode-list`).
- [ ] 2.2 `src/decode/library-panel.js`: the panel over the tab (D6) from "Another file", close button and Escape, the same list in the empty tab, "Choose a file…", "Add folder", chips with lock, "Allow access" and × with confirmation, Tracks / Mixtapes switch, windowed rows, video icon, open track highlighted, Remove on recent rows; remove the old recent list from `render()`.
- [ ] 2.3 Opening from a row (D7): permission in the click, path to file, "not found" and rescan, pick again for a recent track without handle; a row marked ◆ opens in Full without analysis.
- [ ] 2.4 Tags in idle time for the active filter, cached; measure 200 files (median per file, longest task) and keep or drop tags as D4 says; record the result in the DEVLOG and `docs/knowledge/decisions.md`.
- [ ] 2.5 Browsers without folders: only "Choose a file…", recent tracks and the note; no storage: the note; verify with `showDirectoryPicker` removed in the page and with IndexedDB blocked.
- [ ] 2.6 Styles in `src/style.css` and `src/theme-light.css` with tokens; phone width 400 px; hardware theme look.

## 3. Autoplay (about 4.5 h)

- [ ] 3.1 The Autoplay switch (off by default, `coding-misk-decode-autoplay`), shown only with folders.
- [ ] 3.2 The context of the open track and `nextOf` in `library.js` (D8): list with chip, search and order; mixtape with repeat; skipped rows; end of list; no context for picked or dropped files.
- [ ] 3.3 `src/decode/autoplay.js` preparation (D9): start 30 s before the end, permission, probe, budget of 120 MB, decode, fingerprint, store lookup, second level A worker; `analysisCopy` in chunks; one prepared track, dropped on any change.
- [ ] 3.4 Hand-over (D10): the next original started at the playing one's end time, the code from the beginning through `play(0)`, `cur` and stage swapped; not ready: silence, status line, the 3-second rule, code joining on the tempo; failures skipped with a note; `frame()` end test only without a next track (`src/decode/tab.js`, `src/main.js` `ended`).

## 4. Mixtapes (about 4 h)

- [ ] 4.1 `src/decode/mixtapes.js` (D11): create, add several in list order, move, remove row, rename, delete, repeat; row status `ok` / `waiting` / `missing`; relink by folder name when a folder is added.
- [ ] 4.2 The Mixtapes view: list, open mixtape, Play, rows with drag and up and down buttons, remove, "File…" (single files with `showOpenFilePicker`, several), repeat, rename, delete with confirmation, playing row highlighted, all rows missing message.
- [ ] 4.3 Multi-select in the Tracks view: Select, checkboxes, "Add to mixtape ▾" with the mixtapes and "New mixtape".
- [ ] 4.4 Backup (`src/settings/backup.js`): `coding-misk-decode-mixtapes` exported from IndexedDB without handles, merged by `id` on import (newest `updated` wins), written back to IndexedDB; counts in the import summary.

## 5. Strings, guide and docs (about 1.5 h)

- [ ] 5.1 Strings in `src/i18n.js` in English and Italian (D13).
- [ ] 5.2 The Decode card in `src/guide.js` in English and Italian: "Another file", folders and permission, marks, Autoplay, mixtapes, browsers without folders; `npm run check:guide`.
- [ ] 5.3 `docs/knowledge/` (decode note: library, Autoplay, mixtapes; decisions: marks by location, cap per folder, budget, tags result; checks: the two new checks), `npm run knowledge`, `npm run check:knowledge`; `docs/ARCHITECTURE.md` persistence (the new database, the backup key); `AGENTS.md` tooling lines; DEVLOG.

## 6. Checks (about 2 h)

- [ ] 6.1 `tools/check-decode-library.mjs` (`npm run check:decode-library`, no browser): scan on fake directories (order, cap with chip flag, dot names, extensions, video), rows (one per track, names, marks fresh and stale), search with accents, chips, order by name and recent, `nextOf` for lists and mixtapes (filters, skipped rows, end, repeat), mixtape operations, row status and relink by folder name, backup export without handles and merge, the store cap (Live-only first), the preparation time and budget.
- [ ] 6.2 `tools/check-decode-library.cjs` (browser, dev server on `PORT`): a fake folder in the origin private file system with generated WAV files from `tools/decode-audio.mjs` (short tracks of 20 to 40 s), nested folders, a dot folder, a text file and an MP4 from the existing fixtures; patched `showDirectoryPicker`, `showOpenFilePicker`, `queryPermission` and `requestPermission` (design, Risks: fake handles). Covers: "Another file" opens the panel, not the picker; add two folders, duplicate refused; list, video icon, search, chips, ×, order; reload with permission `prompt`, one click opens and grants the folder; denied; a ◆ row opens in Full without analysis; a deleted file shows "not found"; Autoplay on: prepared before the end, hand-over gap under 20 ms (source start times against the previous end on the audio clock), code from the first lines, a forced slow preparation gives the pause then audio after about 3 s and code after; an unreadable next file skipped; mixtape: add four, drag, rename, play with repeat on and off, a moved file "not found", backup export and import on a cleared database with "not found" rows and relink by adding the folder again; no main-thread task over 100 ms while preparing and while filtering 4000 rows (a second fake folder of 2000 empty-named stubs); `showDirectoryPicker` removed: only "Choose a file…" and the note; pictures in neon, hardware and light, English and Italian, 1300 and 400 px.
- [ ] 6.3 Run `npm run check:decode`, `node --no-warnings tools/check-backup.mjs`, `npm run check:guide`, `npm run check:knowledge`, `npm run check:light-theme`, `PORT=… node tools/check-light-theme.cjs` on the Decode tab with the panel open (add the scene if missing), `PORT=… node tools/check-decode.cjs` (no regression in the tab), and the two new checks.
