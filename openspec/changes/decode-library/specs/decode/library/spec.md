# Spec Delta

## Purpose

The "Another file" panel of the Decode tab: the recent tracks and the files of the user's folders in one list, how folders are added and allowed, how the list is searched, filtered and ordered, and how a track opens from it.

## ADDED Requirements

### Requirement: The "Another file" panel

While a track is open, "Another file" SHALL open a panel and SHALL NOT open the system file picker. The panel SHALL hold "Choose a file…", the folder controls and the list of tracks. The open track SHALL keep playing until another track opens. The panel SHALL close with its close button, with Escape and when a track opens from it.

#### Scenario: Another file while a track plays

- **WHEN** a track is playing and the user presses "Another file"
- **THEN** the panel opens with "Choose a file…", the folders and the list, the system file picker does not open and the track keeps playing

### Requirement: Where the list shows

The empty tab SHALL show the same list and controls under its drop area. The panel SHALL NOT be a fixed column: it SHALL open over the tab's panel and fit the screen at phone width (400 px) with no horizontal scroll.

#### Scenario: Phone width

- **WHEN** the window is 400 px wide and the panel is open
- **THEN** every row, chip and button is inside the screen and the page does not scroll sideways

#### Scenario: Empty tab

- **WHEN** no track is open
- **THEN** the tab shows the drop area, "Choose a file…" and below it the same list as the panel

### Requirement: Add folders

In a browser with the File System Access API, the panel SHALL offer "Add folder", which opens the browser's folder picker for reading. The user SHALL be able to add several folders, one at a time. Each folder SHALL be remembered in this browser with its name, without copying any file. Adding a folder already in the list SHALL NOT add it twice.

#### Scenario: Two folders

- **WHEN** the user adds the folders "Live sets" and "Demos"
- **THEN** the folder chips read All, Live sets and Demos, and the list holds the tracks of both

#### Scenario: Same folder again

- **WHEN** the user adds a folder that is already in the list
- **THEN** the list keeps one chip for it and says the folder is already there

### Requirement: Permission once per session

After a reload, the app SHALL show the remembered folders and their last known tracks at once, marked as waiting for access. One click on a folder's "Allow access" button, or on one of its tracks, SHALL ask the browser's permission for that folder; once granted, the folder SHALL stay allowed for the rest of the session and the clicked track SHALL open. A denied permission SHALL leave the folder in the list, still waiting, with a note.

#### Scenario: One click after a reload

- **WHEN** the user reloads the page, opens the panel and clicks a track of a remembered folder
- **THEN** the browser asks for permission once, and after the user allows it the track opens and the folder's other tracks open without asking again

#### Scenario: Denied

- **WHEN** the user denies the permission
- **THEN** the folder stays in the list, its tracks stay marked as waiting, and no track opens

### Requirement: Subfolders and the file cap

Reading a folder SHALL include its subfolders at any depth and SHALL skip hidden files and folders (names starting with a dot). It SHALL list the audio and video files that Decode accepts, by extension, and nothing else. It SHALL stop after 2000 files per folder, in name order, and the folder chip SHALL say that the folder holds more files than the list shows. Reading SHALL NOT block the page: the list fills as files are found.

#### Scenario: Nested files

- **WHEN** a folder holds `a.mp3`, `set 1/b.wav`, `set 1/old/c.flac`, `notes.txt` and `.cache/d.mp3`
- **THEN** the list shows a, b and c, and not `notes.txt` or `d.mp3`

#### Scenario: A large folder

- **WHEN** a folder holds 2500 audio files
- **THEN** the list holds 2000 of them and the chip says the folder has more files than shown

### Requirement: Video files in the list

Video files that Decode accepts SHALL be listed with a small video icon next to their name. Opening one SHALL behave as opening a video file today: its sound is decoded and the picture is not used.

#### Scenario: An MP4

- **WHEN** a folder holds `clip.mp4`
- **THEN** its row shows the video icon, and a click opens its sound in Decode

### Requirement: Videos without sound

A video without an audio track is not a broken file: it SHALL be shown as a "video only" row in the normal style, with the video icon and a small "no sound" mark ("Video without sound: nothing for Decode to analyse"). It SHALL stay selectable and SHALL be allowed in mixtapes.

#### Scenario: In a mixtape

- **WHEN** the user selects a video without sound and adds it to a mixtape
- **THEN** it is added like any other row

### Requirement: Finding videos without sound

The app SHALL find a video without sound while it reads the tags in idle time, or when the file fails to open for that reason, and SHALL remember it in the folder's index with generic fields (`video: true`, `audio: false`), so a later feature can list such videos.

#### Scenario: Found while reading tags

- **WHEN** the tags of the folder's files have been read
- **THEN** the MP4 without sound shows the "no sound" mark before anyone clicks it

### Requirement: A row that fails to open

A click on a video without sound SHALL show a short neutral note in the panel naming it ("Video without sound: nothing for Decode to analyse"); a click on a file that fails to open SHALL show a short note naming the file and the reason. In both cases the panel SHALL stay open and the open track SHALL NOT stop or change.

#### Scenario: A screen recording without sound

- **WHEN** a folder holds an MP4 with only a video track and the user clicks its row while another track plays
- **THEN** the panel says that this video has no sound for Decode to analyse, the row shows the "no sound" mark in the normal style, the panel stays open and the other track keeps playing

### Requirement: A kind icon on every row

Every row of the track list and of a mixtape SHALL show a small drawn icon of its kind: a music note for an audio file, a video icon for a video file. A video without sound SHALL also show the "no sound" mark. The icons SHALL take their colour from the theme's tokens.

#### Scenario: Icons

- **WHEN** the list holds an MP3, an MP4 with sound and an MP4 without sound
- **THEN** their rows show a music note, a video icon, and a video icon with the "no sound" mark

### Requirement: The rows of the list

The list SHALL show one compact row per track: its name, its folder and, when an analysis of the track is stored, a mark: ◆ Full when a full analysis is stored, ◇ Live when only a Live analysis is stored. The row SHALL NOT show the track's length; the length SHALL show when the track is open. The track that is open SHALL be highlighted.

#### Scenario: Marks

- **WHEN** a folder holds three files: one decoded in Full, one decoded in Live only and one never opened
- **THEN** their rows show ◆ Full, ◇ Live and no mark

#### Scenario: No length in the list

- **WHEN** the panel is open
- **THEN** no row shows a length, and the open track's length shows in the tab's file row

### Requirement: Names in the list

A row's name SHALL be the stored title of a decoded track, else the title read from the file's tags when the app has read them, else the title taken from the file name.

#### Scenario: Name from the file

- **WHEN** a never-opened file named `Some Band - Night Run.mp3` has no tags read yet
- **THEN** its row reads "Night Run"

### Requirement: Recent tracks in the list

A recent track SHALL appear once, even when it is also in a folder. A recent track that is not in any folder SHALL show "Recent" in place of a folder. A recent track SHALL have a Remove action that deletes its stored analysis.

#### Scenario: Decoded file of a folder

- **WHEN** a file of a listed folder was decoded before
- **THEN** the list shows one row for it, with its folder and its mark

### Requirement: Search

The panel SHALL have a search field that keeps the rows whose name, artist or file name contains the typed text, ignoring case and accents.

#### Scenario: Search

- **WHEN** the user types "nigh" in the search field
- **THEN** the list keeps "Night Run" and "Midnight", and hides the other tracks

### Requirement: Folder chips

The panel SHALL have one chip per folder plus All; a chip SHALL keep only that folder's tracks, and All SHALL show every track, recent tracks included. Each folder chip SHALL have a × that removes the folder after a confirmation; removing a folder SHALL forget its handle and its tracks in the list and SHALL keep the stored analyses. The chosen chip SHALL be remembered.

#### Scenario: One folder

- **WHEN** the user presses the "Demos" chip
- **THEN** only the tracks of Demos are listed

#### Scenario: Remove a folder

- **WHEN** the user presses × on the "Demos" chip and confirms
- **THEN** the chip and its tracks leave the list, and a track of Demos decoded before still opens with its stored analysis when picked again

### Requirement: Order

The panel SHALL order the rows by name or by recent: by recent, the tracks opened last come first and the tracks never opened follow by name. The chosen order SHALL be remembered.

#### Scenario: By recent

- **WHEN** the order is "Recent" and the user opened B yesterday and A today
- **THEN** A comes first, then B, then the tracks never opened by name

### Requirement: Open a track from the list

A click on a row SHALL open the track in Decode, replacing the open one. A track with a stored full analysis SHALL open in Full without analysing again; a track with a stored Live analysis SHALL open with it. When a file of a folder can no longer be read (moved, deleted, changed), the row SHALL say so and the list SHALL refresh that folder. A recent track that is not in a folder and has no usable handle SHALL ask the user to pick the file again and name the file it expects.

#### Scenario: Reopen in Full

- **WHEN** the user clicks a row marked ◆ Full
- **THEN** the track opens in Full and no analysis runs

#### Scenario: A file gone

- **WHEN** the user clicks a row whose file was deleted from the disk
- **THEN** the row says the file is not found, nothing else opens and the folder is read again

### Requirement: Long lists stay fast

The panel SHALL open, filter and scroll a list of 4000 rows with no task over 100 ms on the main thread, and a typed search SHALL update the list within 150 ms.

#### Scenario: Two full folders

- **WHEN** two folders of 2000 files each are listed and the user types in the search field and scrolls
- **THEN** no main-thread task is longer than 100 ms

### Requirement: Browsers without folders

In a browser without the File System Access API, the panel SHALL offer "Choose a file…" and the recent tracks, and SHALL NOT show folders, Autoplay or mixtapes; a short note SHALL say that this browser cannot open folders. When the browser keeps no storage for the app, the panel SHALL say that this browser keeps no recent tracks or folders here.

#### Scenario: No folder picker

- **WHEN** the browser has no folder picker
- **THEN** the panel shows "Choose a file…", the recent tracks and the note, and no "Add folder" button

#### Scenario: No storage

- **WHEN** IndexedDB is not available
- **THEN** the panel says that this browser keeps no recent tracks or folders here, and "Choose a file…" still works
