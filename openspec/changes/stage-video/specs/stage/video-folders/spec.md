# Spec Delta

## Purpose

The "Stage videos" list in the settings: the folders whose videos the Video look shows, added and allowed with the same mechanism as the Decode folders.

## ADDED Requirements

### Requirement: The "Stage videos" list

Settings SHALL hold a "Stage videos" card with the list of the user's stage video folders (name, number of videos, state), "Add folder", a remove button per folder with confirmation, and the size mode (Fill, Fit or Stretch). The list SHALL be independent of the Decode folders. Adding a folder SHALL use the browser's folder picker in read mode; a folder already in the list SHALL NOT be added twice.

#### Scenario: Add two folders

- **WHEN** the user adds the folders "Loops" and "Clips" in the card
- **THEN** both show with their number of videos, and the Decode folders are unchanged

#### Scenario: Duplicate

- **WHEN** the user adds a folder that is already in the list
- **THEN** the list keeps one entry and a note says it is already there

### Requirement: Permission as in Decode

After a reload the card SHALL show the remembered folders at once, marked as waiting for access. One click on a folder's "Allow access", or on the stage's "Allow stage videos" chip, SHALL ask the browser's permission (only inside a click); once granted, the folder SHALL stay allowed for the rest of the session. A denied permission SHALL leave the folder in the list, still waiting, with a note.

#### Scenario: One click per session

- **WHEN** the user reloads, clicks "Allow access" on "Loops" and consents
- **THEN** "Loops" is allowed until the next reload and its videos can show on the stage

#### Scenario: Denied

- **WHEN** the user refuses the browser's permission
- **THEN** the folder stays in the list, waiting, with a note

### Requirement: The scan for videos

A folder SHALL be scanned when it is added, when the card opens and once per session when the Video look first needs it: subfolders included, names starting with a dot skipped, only the video files the app accepts (`.mp4`, `.m4v`, `.mov`, `.webm`, `.mkv`) kept, at most 2000 files per folder, reading names, sizes and dates and never a file's bytes.

#### Scenario: Mixed folder

- **WHEN** a folder holds 3 videos, 10 audio files and a hidden `.cache` subfolder with videos
- **THEN** the card shows 3 videos for it

### Requirement: Stored names only

The app SHALL store the folders' handles and the names of their files only, never a video's bytes, in a store apart from the Decode library.

#### Scenario: Nothing stored

- **WHEN** a folder with 50 videos has been scanned
- **THEN** the browser's storage holds the folder's handle and 50 names, and no video data

### Requirement: Other browsers

In a browser without folder access (the File System Access API), the card SHALL show a short note that stage video folders need Chrome or Edge, and no folder controls. The track video of a file opened in Decode SHALL still show.

#### Scenario: A browser without folders

- **WHEN** the user opens Settings in a browser without the folder picker
- **THEN** the "Stage videos" card shows the note and the size mode only

### Requirement: Backup

The size mode SHALL be in the settings backup. The folders SHALL NOT be in the backup, and a reset SHALL clear the folders and the size mode.

#### Scenario: Backup on another computer

- **WHEN** the user exports a backup with Fit and two folders and imports it on another computer
- **THEN** the size mode is Fit and the "Stage videos" list is empty
