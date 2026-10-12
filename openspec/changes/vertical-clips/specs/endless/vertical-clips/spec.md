# Spec Delta

## Purpose

Cut short vertical videos (9:16) from a song or a saved session, at random or between two times, rendered faster than real time, each pointing back to the full video.

## ADDED Requirements

### Requirement: Vertical layouts

The app SHALL render extracts at 1080×1920 in one of these layouts: stage above and code below; stage above and soul below; stage in the middle with a text band above and below; soul in the middle with the text bands. The visual and soul choices of the video direction SHALL apply to extracts too.

#### Scenario: Stage and code
- **WHEN** an extract renders in the layout "stage above, code below"
- **THEN** the upper half shows the stage of the song at that moment and the lower half the code typing itself, at 1080×1920

### Requirement: Text bands

The upper band SHALL show the coding-misk logo. The lower band SHALL show a tagline and a line pointing to the full video, each editable and each possible to leave empty. Artist names SHALL not appear in extracts; the song title SHALL appear only when the listener turns it on.

#### Scenario: Text bands
- **WHEN** the layout has bands, the tagline is "music written as code" and the full-video line is empty
- **THEN** the upper band shows the coding-misk logo, the lower band the tagline, and no artist name

### Requirement: Extracts between two times

The listener or an agent SHALL be able to cut an extract from a song or a saved session between a start and an end time. The extract SHALL sound and look as the same stretch of the full video of that song or session, starting with notes and effects already sounding, with a short fade in and out, and SHALL last exactly the asked time.

#### Scenario: Same as the long video
- **WHEN** an extract from 12:40 to 13:10 is cut from a saved session
- **THEN** it lasts 30 s and matches what the full video of that session plays between 12:40 and 13:10

#### Scenario: Out of range
- **WHEN** the end time is past the end of the song
- **THEN** the app says so and cuts nothing

### Requirement: Random extracts

The listener or an agent SHALL be able to ask for N extracts of a given length from a song or a saved session. The extracts SHALL not overlap, SHALL prefer lively stretches over intros, outros and quiet parts, and SHALL be the same for the same source, length, count and seed.

#### Scenario: Five extracts
- **WHEN** the listener asks for 5 extracts of 30 s from a 20 minute session
- **THEN** five 30 s videos are saved, none overlapping, with a list of their times

#### Scenario: Too many
- **WHEN** the source is too short for N extracts of that length
- **THEN** the app cuts as many as fit and says how many

### Requirement: Sources and output

Extracts SHALL come from built-in and saved songs, sessions saved in playlists, and the recipe file saved with a radio export. A live radio session SHALL be cut only after it is saved. Each extract SHALL be saved as one video file, and each batch with a list of its extracts (source, start, end, song titles), faster than real time.

#### Scenario: From a radio export
- **WHEN** the listener loads the recipe file saved with a 60 minute radio export and asks for extracts
- **THEN** the extracts come from the same session as the exported file, at the same times

### Requirement: Agent access

The functions to cut extracts SHALL be callable from the browser console of the app, with the same options as the screen (source, count or times, length, layout, bands), and SHALL report progress and the saved files.

#### Scenario: Agent asks
- **WHEN** an agent driving the app calls the extracts function for 3 extracts of 15 s from a song
- **THEN** three files are saved and the call returns their names and times
