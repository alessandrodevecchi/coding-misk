# Spec Delta

## Purpose

A settings page for options used less often and for the data kept in the browser.

## ADDED Requirements

### Requirement: Settings page
A gear in the top bar SHALL open the settings page; a second press SHALL go back to the tab open before. The page SHALL offer theme and language (which also stay in the top bar), the radio's visual, the volume, the export format, the radio's defaults (transitions, harmony, scope of console commands), and the data section.

#### Scenario: Open and close
- **WHEN** the user presses the gear on the Songs tab, then presses it again
- **THEN** the settings show, then the Songs tab comes back

### Requirement: Export format
The export format SHALL be WAV or Opus. WAV SHALL be decoded after the recording at full quality; Opus SHALL be the recording itself, in a much smaller file. The format SHALL apply to song exports and to radio recordings.

#### Scenario: Opus export
- **WHEN** the format is Opus and the user exports a song
- **THEN** a WebM or Ogg file with Opus audio is downloaded

### Requirement: Backup of everything
"Export everything" SHALL download one file with every song, version, playlist, style, artist, the radio history and the settings kept in the browser, without working state such as drafts. "Import" SHALL merge such a file: items are added or replaced by id, nothing is deleted, favourites are joined, settings take the file's value; the page then reloads. A file that is not a backup SHALL be refused. "Reset everything" SHALL delete the app's data only after a second press.

#### Scenario: Move to another browser
- **WHEN** the user exports everything and imports the file in another browser
- **THEN** the songs, playlists, styles and artists appear there

#### Scenario: Reset
- **WHEN** the user presses "Reset everything" once
- **THEN** nothing is deleted until a second press
