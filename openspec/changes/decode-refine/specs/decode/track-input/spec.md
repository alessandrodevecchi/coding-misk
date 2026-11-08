# Spec Delta

## Purpose

Reopening decoded tracks, refined so the recent list is reachable while a track is open.

## MODIFIED Requirements

### Requirement: Reopen a recent track

The empty tab SHALL list the recently decoded tracks with title, artist, length and whether a full analysis exists. While a track is open, "Another file" SHALL open a panel with "Choose a file…" and the same list, with Open, Remove and Close; the open track SHALL keep playing until another opens. Where the browser can keep a handle to the file, the app SHALL keep it and reopen the track in one click after the browser's permission, asked first in the click. Otherwise, or when the handle no longer works, the app SHALL ask the user to pick the file again and name the file it expects. When the browser keeps no storage for the app, the list SHALL say so.

#### Scenario: One click

- **WHEN** the user opened a file through the picker in a browser with the File System Access API, and later clicks Open on the track in the recent list and grants access
- **THEN** the track opens with its stored analysis and code, without analysing again

#### Scenario: Another file while a track plays

- **WHEN** a track is open and the user presses "Another file"
- **THEN** the panel shows "Choose a file…" and the recent tracks, and the system file picker does not open

#### Scenario: Reopen in Full

- **WHEN** the user opens a recent track marked "Full ready"
- **THEN** it opens in Full without analysing again

#### Scenario: Pick again

- **WHEN** the browser keeps no handle and the user clicks a recent track
- **THEN** the tab asks for the file and names the file it expects

#### Scenario: No storage

- **WHEN** IndexedDB is not available
- **THEN** the list says that this browser keeps no recent tracks here
