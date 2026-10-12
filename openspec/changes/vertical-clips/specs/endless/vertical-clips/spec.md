# Spec Delta

## Purpose

Cut short vertical videos (9:16), called fragments, from a song or a saved session, at random or between two times, rendered faster than real time, each pointing back to the full video.

## ADDED Requirements

### Requirement: Formats and content

The app SHALL render fragments in a chosen format: 9:16 (1080×1920), 4:5 (1080×1350), 1:1 (1080×1080) or 16:9 (1920×1080). The listener SHALL choose what the picture shows: visual, visual and code, visual and soul, soul, or code; the proportions of the visual or soul inside the format (fill, 16:9, 4:3, 1:1, 4:5, 9:16), with the space left going to the bands; and whether the bands show. The visual and soul choices of the video direction SHALL apply to fragments too.

#### Scenario: A 16:9 visual in a vertical fragment
- **WHEN** a 9:16 fragment shows only the visual at 16:9 with bands
- **THEN** the visual fills the width at 16:9 and the bands take the space above and below

#### Scenario: Square
- **WHEN** the format is 1:1 and the visual fills the space with bands
- **THEN** the file is 1080×1080 with the visual between the bands

### Requirement: Turned picture

The listener SHALL be able to turn the picture by 90°: the composition is made in the other orientation and turned inside the file, so a viewer turning the phone sideways sees it full.

#### Scenario: Turned vertical fragment
- **WHEN** a 9:16 fragment is turned by 90°
- **THEN** the file is 1080×1920 and holds a 1920×1080 composition turned on its side

### Requirement: Code in fragments

When the code shows, the listener SHALL choose how it moves: focus on the part playing (the lines of the section on air, lit at every bar, one block after another), scroll through all the code over the fragment, or follow the edits as the videos do.

#### Scenario: Focus on the part playing
- **WHEN** a fragment with code in focus mode plays the third section
- **THEN** the code panel shows and lights the lines that play in the third section

### Requirement: Preview before making

The fragments menu and the settings SHALL show a live preview of the composition with the current choices, drawn from the song playing, before any fragment is made.

#### Scenario: Preview follows the choices
- **WHEN** the listener changes the format from 9:16 to 1:1 in the menu
- **THEN** the preview shows the square composition at once

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
