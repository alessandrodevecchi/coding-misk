# Spec Delta

## Purpose

Reopening decoded tracks through the "Another file" panel, a store that keeps full analyses while Autoplay goes through a folder, a light index that keeps the browser light, and the analyses in the settings backup. The recent tracks part moves here from the change `decode-refine`.

## MODIFIED Requirements

### Requirement: Reopen a recent track

The recently decoded tracks SHALL be listed in the "Another file" panel and in the empty tab, as rows of the panel's list, with their name, their folder or "Recent", and ◆ Full or ◇ Live. While a track is open, "Another file" SHALL open the panel and SHALL NOT open the system file picker; the open track SHALL keep playing until another opens. A track with a stored full analysis SHALL reopen in Full without analysing again. Where the browser can keep a handle to the file or to its folder, the app SHALL keep it and reopen the track in one click after the browser's permission, asked first in the click. Otherwise, or when the handle no longer works, the app SHALL ask the user to pick the file again and name the file it expects. When the browser keeps no storage for the app, the panel SHALL say so.

#### Scenario: One click

- **WHEN** the user opened a file through the picker in a browser with the File System Access API, and later clicks its row in the panel and grants access
- **THEN** the track opens with its stored analysis and code, without analysing again

#### Scenario: Another file while a track plays

- **WHEN** a track is open and the user presses "Another file"
- **THEN** the panel shows "Choose a file…" and the recent tracks, and the system file picker does not open

#### Scenario: Reopen in Full

- **WHEN** the user opens a recent track marked ◆ Full
- **THEN** it opens in Full without analysing again

#### Scenario: Pick again

- **WHEN** the browser keeps no handle and the user clicks a recent track
- **THEN** the tab asks for the file and names the file it expects

#### Scenario: No storage

- **WHEN** IndexedDB is not available
- **THEN** the panel says that this browser keeps no recent tracks here

### Requirement: Stored tracks are bounded

The store SHALL keep at most 2000 tracks. Over the cap it SHALL drop the least recently opened track that has only a Live analysis, and only when none is left, the least recently opened track with a full analysis. When the browser refuses a write for lack of space, the store SHALL drop tracks in the same order until the write succeeds, without an error shown. The user SHALL be able to remove a track from the list. Stored tracks SHALL be part of the settings backup without their file handles, as the backup requirement says. A stored track SHALL remember where it was opened from (its folder and path, with the file's size and date) so the list can mark the folder's file without reading it.

#### Scenario: Remove

- **WHEN** the user removes a track from the list
- **THEN** its analysis, code and handle are deleted and its row no longer shows a mark

#### Scenario: Full analyses kept

- **WHEN** the store holds 2000 tracks, 300 of them with a full analysis, and Autoplay opens a new track
- **THEN** the least recently opened Live-only track is dropped and every full analysis stays

#### Scenario: Only full analyses left

- **WHEN** the store holds 2000 tracks, all with a full analysis, and a new track is decoded
- **THEN** the least recently opened track is dropped

## ADDED Requirements

### Requirement: A light index of the stored tracks

The browser SHALL stay light and load only what is needed. The store SHALL keep, next to each stored analysis, a small index entry with the track's fingerprint, name and title, its mark (Full or Live, with the analysis version), where it was opened from (folder, path, size, date) and when it was last used. The panel's list, the empty tab's list, the marks of folder files, the order by recent and the cap SHALL read only the index.

#### Scenario: Marks from the index

- **WHEN** the panel lists a folder file decoded in Full before
- **THEN** its row shows ◆ Full and its stored analysis is not read

### Requirement: The index stays in step with the analyses

An analysis and its index entry SHALL be written and deleted together. The index SHALL be built from the stored analyses when the store is first opened after this change. It SHALL be rebuilt in the background from the stored analyses when it is missing or does not match them.

#### Scenario: Upgrade with tracks stored

- **WHEN** the browser holds 40 decoded tracks from before this change and the user opens the Decode tab
- **THEN** the list shows the 40 tracks with their names and marks, and the stored analyses are unchanged

#### Scenario: Index lost

- **WHEN** the index is empty but 500 analyses are stored
- **THEN** the index is rebuilt in the background without a main-thread task over 100 ms, and the list fills as it is rebuilt

### Requirement: An analysis is loaded only when its track opens

Opening the Decode tab or the panel SHALL NOT read the stored analyses; it SHALL read the index only. A track's stored analysis SHALL be read when the track opens, or when Autoplay prepares it as the next track, and only that one.

#### Scenario: Tab open with many tracks

- **WHEN** 2000 analyses are stored and the user opens the Decode tab and the panel
- **THEN** no stored analysis is read, the list shows within 300 ms and no main-thread task is longer than 100 ms

#### Scenario: Opening one track

- **WHEN** the user clicks a row marked ◆ Full
- **THEN** only that track's analysis is read from storage

### Requirement: Decode analyses in the settings backup

The settings backup SHALL carry, by default, the 100 Decode analyses used last, without their file handles. With "Include all Decode analyses" on, it SHALL carry every stored analysis, and the export SHALL NOT hold every analysis in memory at once. Importing a backup SHALL merge the analyses as before: for the same track the one used last wins and a stored file handle stays; the cap applies after the import.

#### Scenario: Default backup

- **WHEN** 300 analyses are stored and the user exports the backup with the checkbox off
- **THEN** the file holds the 100 analyses used last and no file handle

#### Scenario: All analyses

- **WHEN** 300 analyses are stored and the user ticks "Include all Decode analyses" and exports
- **THEN** the file holds all 300 analyses

#### Scenario: Import merges

- **WHEN** the user imports a backup holding an analysis of a track already stored, used less recently than the stored one
- **THEN** the stored analysis and its file handle stay

### Requirement: The "Include all Decode analyses" checkbox

The backup card of the settings page SHALL have a checkbox "Include all Decode analyses", off by default and off again each time the settings page opens. Its tooltip SHALL say that it adds every stored analysis and that the file can get large: about 20 kB per minute of audio, for example about 100 MB for 1000 tracks.

#### Scenario: Tooltip

- **WHEN** the user hovers or focuses the checkbox
- **THEN** the tooltip says it adds every stored analysis and that the file can get large, about 20 kB per minute of audio

#### Scenario: Off again

- **WHEN** the user ticked the checkbox, exported, and opens the settings page again later
- **THEN** the checkbox is off
