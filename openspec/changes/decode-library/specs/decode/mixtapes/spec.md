# Spec Delta

## Purpose

Mixtapes: ordered selections of the user's own files to decode one after another. A mixtape holds references to files, never audio, and is distinct from the app's playlists, which hold generated songs.

## ADDED Requirements

### Requirement: What a mixtape holds

A mixtape SHALL have a name and an ordered list of rows. Each row SHALL refer to a file by its folder and its path inside that folder, or to a single file chosen with "File…", and SHALL keep the name shown when it was added. A mixtape SHALL NOT store, copy or upload any file's bytes or decoded audio. The feature SHALL be called "Mixtape" in English and in Italian.

#### Scenario: No audio stored

- **WHEN** the user makes a mixtape of three files and reloads the page
- **THEN** the browser's storage holds the mixtape's name and the three references, and none of the files' audio

### Requirement: Mixtapes are not playlists

Mixtapes SHALL be separate from the app's playlists: they SHALL NOT appear in the Playlists tab, and a playlist SHALL NOT hold a decoded file. A decoded track SHALL reach a playlist only as a song, after Open in Compose and a save.

#### Scenario: Not in Playlists

- **WHEN** the user has a mixtape and opens the Playlists tab
- **THEN** the mixtape is not listed there

### Requirement: Make and edit mixtapes

The panel SHALL list the mixtapes and let the user create one, rename it and delete it after a confirmation. Inside a mixtape the user SHALL reorder rows by dragging and, where dragging is not available, with up and down buttons, and SHALL remove a row.

#### Scenario: Reorder

- **WHEN** the user drags the third row of a mixtape above the first
- **THEN** it becomes the first row and the order is kept after a reload

### Requirement: Add tracks to a mixtape

The user SHALL be able to select several rows of the track list and add them to a mixtape, new or existing, in one action; the rows SHALL be added at the end in the list's order. "File…" SHALL add one or more single files chosen with the browser's file picker. Rows from different folders and single files SHALL be allowed in one mixtape, and the same file MAY appear more than once.

#### Scenario: Add several

- **WHEN** the user selects four rows of the list and chooses "Add to mixtape" then "New mixtape"
- **THEN** a mixtape is made with those four rows in the list's order and the user can name it

#### Scenario: Mixed sources

- **WHEN** a mixtape holds a file of "Live sets", a file of "Demos" and a single file added with "File…"
- **THEN** it plays all three in order

### Requirement: Play a mixtape

The mixtape SHALL have Play, which opens its first playable row in Decode and plays the rows in order with Autoplay, and a repeat switch, off by default, kept with the mixtape. A click on a row SHALL open that row and continue from it. The row playing SHALL be highlighted.

#### Scenario: Repeat on

- **WHEN** repeat is on and the last row of the mixtape ends
- **THEN** the first playable row starts

#### Scenario: Repeat off

- **WHEN** repeat is off and the last row ends
- **THEN** the tab stops

### Requirement: Rows not found

A row whose file can no longer be read SHALL stay in the mixtape, marked "not found", and SHALL be skipped when the mixtape plays. A row whose folder is waiting for the browser's permission SHALL be marked as waiting, not "not found", and one click SHALL ask the permission. When a file reappears at its path, its row SHALL work again. A mixtape whose rows are all "not found" SHALL say so when played.

#### Scenario: A moved file

- **WHEN** a mixtape's file is moved to another folder on the disk
- **THEN** its row shows "not found" and the mixtape plays the other rows

#### Scenario: Back in place

- **WHEN** the file is moved back to its path and the folder is read again
- **THEN** its row works again

### Requirement: Mixtapes in the backup

The app's backup SHALL include the mixtapes: their names, the rows' names, their folder names and paths, and the repeat switch, and SHALL NOT include file handles or audio. Importing a backup SHALL merge mixtapes by identity, the one changed last winning.

#### Scenario: Another computer

- **WHEN** the user imports a backup with a mixtape on another computer
- **THEN** the mixtape is listed with its rows marked "not found"

### Requirement: Rows linked again

A row whose folder is not known in this browser SHALL show "not found" until the user adds a folder with the same name, which SHALL link the row to it again. A single file row from another browser SHALL show "not found" until the user picks the file again with "File…" on that row.

#### Scenario: Folder added again

- **WHEN** the user then adds a folder named like the mixtape's folder, holding the same paths
- **THEN** those rows work
