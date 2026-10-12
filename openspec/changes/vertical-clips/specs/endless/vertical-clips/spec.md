# Spec Delta

## Purpose

Cut short vertical videos (9:16), called fragments, from a song or a saved session, at random or between two times, rendered faster than real time, each pointing back to the full video.

## ADDED Requirements

### Requirement: Vertical layouts

The app SHALL render fragments at 1080×1920 in one of these layouts: stage above and code below; stage above and soul below; stage in the middle with a text band above and below; soul in the middle with the text bands. The visual and soul choices of the video direction SHALL apply to fragments too.

#### Scenario: Stage and code
- **WHEN** a fragment renders in the layout "stage above, code below"
- **THEN** the upper half shows the stage of the song at that moment and the lower half the code typing itself, at 1080×1920

### Requirement: Text bands

The upper band SHALL show the coding-misk logo. The lower band SHALL show a tagline and a line pointing to the full video, each editable and each possible to leave empty. Artist names SHALL not appear in fragments; the song title SHALL appear only when the listener turns it on.

#### Scenario: Bands
- **WHEN** the layout has bands, the tagline is "music written as code" and the full-video line is empty
- **THEN** the upper band shows the coding-misk logo, the lower band the tagline, and no artist name

### Requirement: Fragment label

Each fragment SHALL show a line typed in the style of an old CRT terminal, made of the word FRAGMENT, a short code derived from the source and its seed, and a number that grows by one with every fragment made in this browser (for example `FRAGMENT S0UL·7QX2 #014`). The label SHALL be possible to turn off.

#### Scenario: Numbers grow
- **WHEN** the last fragment made was #013 and the listener makes three more
- **THEN** they are labelled #014, #015 and #016

### Requirement: Glitch frames

A fragment SHALL open and close with short glitch and "reading" frames in the style of the soul screen, with messages drawn from a pool in the same mood, the same for the same fragment. The frames SHALL be possible to turn off.

#### Scenario: Opening
- **WHEN** a fragment starts
- **THEN** the first second shows a glitch with a message such as "reading soul…", then the picture of the song

### Requirement: Fragments between two times

The listener or an agent SHALL be able to cut a fragment from a song or a saved session between a start and an end time. The fragment SHALL sound and look as the same stretch of the full video of that source, starting with notes and effects already sounding, with a short fade in and out, and SHALL last exactly the asked time.

#### Scenario: Same as the long video
- **WHEN** a fragment from 12:40 to 13:10 is cut from a saved session
- **THEN** it lasts 30 s and matches what the full video of that session plays between 12:40 and 13:10

#### Scenario: Out of range
- **WHEN** the end time is past the end of the source
- **THEN** the app says so and cuts nothing

### Requirement: Random fragments

The listener or an agent SHALL be able to ask for N fragments of a given length from a song or a saved session. The fragments SHALL not overlap, SHALL start on bar lines, SHALL prefer lively stretches over intros, outros and quiet parts, and SHALL be the same for the same source, length, count and seed.

#### Scenario: Five fragments
- **WHEN** the listener asks for 5 fragments of 30 s from a 20 minute session
- **THEN** five 30 s videos are saved, none overlapping, with a list of their times

#### Scenario: Too many
- **WHEN** the source is too short for N fragments of that length
- **THEN** the app cuts as many as fit and says how many

### Requirement: Sources and output

Fragments SHALL come from built-in and saved songs, sessions saved in playlists, and the recipe file saved with a radio export. A live radio session SHALL be cut only after it is saved. Each fragment SHALL be saved as one video file, and each batch with a list of its fragments (source, start, end, label), faster than real time.

#### Scenario: From a radio export
- **WHEN** the listener loads the recipe file saved with a 60 minute radio export and asks for fragments
- **THEN** the fragments come from the same session as the exported file, at the same times

### Requirement: Agent access

The functions to cut fragments SHALL be callable from the browser console of the app, with the same options as the screen (source, count or times, length, layout, bands, label, glitch frames), and SHALL report progress and the saved files.

#### Scenario: Agent asks
- **WHEN** an agent driving the app calls the fragments function for 3 fragments of 15 s from a song
- **THEN** three files are saved and the call returns their names, times and labels
