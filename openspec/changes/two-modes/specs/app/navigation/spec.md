# Spec Delta

## Purpose

The app is organised in two modes: Listen, to make and hear music, and Groove Lab, for the material music is made of and for learning.

## ADDED Requirements

### Requirement: Two modes
The top of the app SHALL offer two modes, Listen and Groove Lab. Listen SHALL hold the tabs Compose, Songs, Playlists and Radio; Groove Lab SHALL hold Artists, Styles, Sounds, Guide and References. Picking a mode SHALL show its tabs in a row under it and open the tab last used in that mode (the first tab the first time).

#### Scenario: Switch mode
- **WHEN** the user is on the Radio and picks Groove Lab
- **THEN** the Groove Lab tabs show and the tab last used there opens

#### Scenario: Back to Listen
- **WHEN** the user picks Listen again
- **THEN** the Radio opens again

### Requirement: Links across modes
Any action that opens a tab of the other mode SHALL switch the mode as well.

#### Scenario: New song from an artist
- **WHEN** the user starts "New song from artist" while in the Groove Lab
- **THEN** the app switches to Listen and opens Compose with the new song

### Requirement: Code and settings unchanged
The live code SHALL stay on the right in both modes and keep its collapse control. The settings page SHALL keep its place next to the code and open from the gear in either mode.

#### Scenario: Code in the Groove Lab
- **WHEN** the Sounds tab is open
- **THEN** the live code is shown on the right, as in Listen

### Requirement: Remembered place
The app SHALL remember the mode and the tab across reloads; a tab remembered before this change SHALL open in its mode.

#### Scenario: Old remembered tab
- **WHEN** the browser remembers the Styles tab from before the change
- **THEN** the app opens in Groove Lab on Styles

### Requirement: Phone
On a screen 390 px wide the mode bar and the tabs of either mode SHALL fit without scrolling the page sideways.

#### Scenario: Phone width
- **WHEN** the app is shown at 390 px
- **THEN** both modes and all tabs of the current mode are visible without horizontal scroll
