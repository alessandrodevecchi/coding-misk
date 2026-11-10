# Spec Delta

## Purpose

Reopening decoded tracks through the "Another file" panel, and a store that keeps full analyses while Autoplay goes through a folder. The recent tracks part moves here from the change `decode-refine`.

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

The store SHALL keep at most 100 tracks. Over the cap it SHALL drop the least recently opened track that has only a Live analysis, and only when none is left, the least recently opened track with a full analysis. The user SHALL be able to remove a track from the list. Stored tracks SHALL be part of the settings backup without their file handles. A stored track SHALL remember where it was opened from (its folder and path, with the file's size and date) so the list can mark the folder's file without reading it.

#### Scenario: Remove

- **WHEN** the user removes a track from the list
- **THEN** its analysis, code and handle are deleted and its row no longer shows a mark

#### Scenario: Full analyses kept

- **WHEN** the store holds 100 tracks, 30 of them with a full analysis, and Autoplay opens a new track
- **THEN** the least recently opened Live-only track is dropped and every full analysis stays
