# Spec Delta

## Purpose

A guide to the app's own features inside the app, reachable from every tab, kept current by a check, next to the Strudel lessons.

## ADDED Requirements

### Requirement: Guide and Strudel lessons tabs
The Groove Lab SHALL have a "Guide" tab for the app and a separate "Strudel lessons" tab with the existing lessons, unchanged. A tab remembered from before (the old Guide with lessons) SHALL open the Strudel lessons.

#### Scenario: Two tabs
- **WHEN** the listener opens the Groove Lab
- **THEN** the tab bar shows Guide and Strudel lessons as two tabs

### Requirement: Feature cards
The Guide SHALL show a row of feature chips and one card per feature: modes, player bar, Compose, hand editing, Songs, Playlists, Radio, Artists, Styles, Genres, Sounds, Strudel lessons, References, Settings. Each card SHALL name the mode it lives in (cards for parts outside the tabs, such as the modes and the player bar, name none) and give "What it does", "How to use it" (with the real button names and keyboard shortcuts) and, when useful, "Good to know". A chip SHALL scroll to its card. Text SHALL follow the app language.

#### Scenario: Pick a feature
- **WHEN** the listener taps the Playlists chip
- **THEN** the Guide scrolls to the Playlists card

### Requirement: Radio card
The Radio card SHALL have sub-sections for the panel, console, curves, mixer, transitions, recording, extend, seed and replay, and a "What changes what" table that says, for each group of controls, whether it changes the song on air and whether it changes the next songs (and from when).

#### Scenario: Read the scope
- **WHEN** the listener reads the Radio card
- **THEN** the table says the panel applies from the next song prepared, the console changes the song on air (and the sliders with "the whole session"), and curves, mixer and extend change only the song on air

### Requirement: Show me
Each card SHALL have a "Show me" button that opens the feature's tab, switching mode when needed, scrolls to the control the card is about and makes it flash for about two seconds.

#### Scenario: Show the radio
- **WHEN** the listener presses "Show me" on the Radio card
- **THEN** the Listen mode and the Radio tab open and the On air button flashes

### Requirement: Help from every tab
Every tab except the Guide SHALL have a "?" button next to its intro that opens the Guide on that tab's card, from either mode.

#### Scenario: Help from the radio
- **WHEN** the listener presses "?" in the Radio tab
- **THEN** the Groove Lab opens on the Guide, scrolled to the Radio card

### Requirement: Guide check
A check (`npm run check:guide`) SHALL fail, naming what is missing, when a tab in the page has no guide card, when a console command has no line in the Radio card, when a guide text lacks English or Italian, or when an interface string exists in one language only. An entry MAY be marked exempt with a reason. The check SHALL NOT run in the app or in the build.

#### Scenario: A new tab without a card
- **WHEN** a developer adds a tab and no guide card
- **THEN** `npm run check:guide` fails and names the tab
