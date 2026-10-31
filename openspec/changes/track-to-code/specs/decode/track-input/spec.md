# Spec Delta

## Purpose

How the user brings one audio file into the Decode tab, what the app reads from it, what it stores and how a decoded track is opened again without copying the file.

## ADDED Requirements

### Requirement: Open one audio file
The Decode tab SHALL open one file at a time, from a file picker or by dropping it on the tab's drop area. It SHALL accept every audio format the browser decodes (at least MP3, WAV, FLAC, M4A/AAC, OGG and Opus). A newly opened file SHALL replace the one in the tab and stop it if it was playing.

#### Scenario: Drop an MP3
- **WHEN** the user drops an MP3 file on the drop area
- **THEN** the tab shows its title, artist and length and the Play button

#### Scenario: Unsupported file
- **WHEN** the user drops a file the browser cannot decode
- **THEN** the tab says the format cannot be read and keeps the previous track, if any

### Requirement: Video files give their audio
A video file whose audio the browser decodes SHALL be accepted for its audio only. The picture SHALL be ignored in this change, and the tab SHALL say that only the sound is used.

#### Scenario: An MP4 video
- **WHEN** the user opens an MP4 video with an AAC sound track
- **THEN** the tab plays and decodes its sound, and a note says the picture is not used

#### Scenario: A video without sound
- **WHEN** the user opens a video with no audio track
- **THEN** the tab says the file has no sound to decode

### Requirement: Length limit
The tab SHALL accept files up to 10 minutes long. A longer file SHALL be refused with a message that names the limit, before it is decoded.

#### Scenario: A 12-minute file
- **WHEN** the user opens a 12-minute file
- **THEN** the tab says files up to 10 minutes are supported and does not decode it

### Requirement: Title and artist
The title and artist SHALL come from the file's tags when present, else from the file name ("Artist - Title" split on the first " - ", else the whole name as the title and no artist). Both SHALL be editable in the tab, and an edit SHALL be stored with the track.

#### Scenario: Tags present
- **WHEN** the file's tags give the title "Night Run" and the artist "Some Band"
- **THEN** the tab shows "Night Run" and "Some Band"

#### Scenario: Name only
- **WHEN** a WAV file named `Some Band - Night Run.wav` has no tags
- **THEN** the title is "Night Run" and the artist "Some Band"

### Requirement: The file is never copied
The app SHALL NOT store, copy or upload the file's bytes or its decoded audio outside the page's memory. Only the analysis, the code, the title and artist, the tab's settings and a fingerprint of the file SHALL be stored. Closing or reloading the page SHALL leave no copy of the audio.

#### Scenario: After a reload
- **WHEN** the user decodes a file and reloads the page
- **THEN** the browser's storage holds the analysis and settings of that track and none of its audio

### Requirement: Reopen a recent track
The empty tab SHALL list the recently decoded tracks with title, artist, length and whether a full analysis exists. Where the browser can keep a handle to the file, the app SHALL keep it and reopen the track in one click after the browser's permission. Otherwise, or when the handle no longer works, the app SHALL ask the user to pick the file again.

#### Scenario: One click
- **WHEN** the user opened a file through the picker in a browser with the File System Access API, and later clicks the track in the recent list and grants access
- **THEN** the track opens with its stored analysis and code, without analysing again

#### Scenario: Pick again
- **WHEN** the browser keeps no handle and the user clicks a recent track
- **THEN** the tab asks for the file and names the file it expects

### Requirement: A matching file skips the analysis
A file SHALL match a stored track when its size, its duration and a hash of fixed slices of its bytes are equal. A matching file SHALL open with the stored analysis and code, even under another name. A file that does not match SHALL be analysed as a new track.

#### Scenario: Renamed file
- **WHEN** the user picks the same file renamed
- **THEN** the stored track opens and no analysis runs

#### Scenario: Another file
- **WHEN** the user picks a file of the same size but different content
- **THEN** it is treated as a new track

### Requirement: Stored tracks are bounded
The store SHALL keep at most 50 tracks and drop the least recently opened first. The user SHALL be able to remove a track from the recent list. Stored tracks SHALL be part of the settings backup without their file handles.

#### Scenario: Remove
- **WHEN** the user removes a track from the recent list
- **THEN** its analysis, code and handle are deleted and it no longer appears
