# Spec Delta

## Purpose

Lets a person read any part of the code panel while the app types the code, by turning off or pausing the panel's scroll to the line being edited.

## ADDED Requirements

### Requirement: Follow edits toggle
The code panel's header SHALL have a "Follow edits" toggle ("Segui le modifiche" in Italian), next to the full-screen and collapse buttons, with a tooltip that explains it. When it is on, the panel SHALL scroll to keep the line the app is editing in view, as before this change. When it is off, the panel SHALL NOT scroll by itself while the app types; the code SHALL still be typed and lit as usual. The toggle SHALL be on by default and its state SHALL be remembered across reloads. It SHALL apply in every tab that types into the code panel (Compose, Songs, Decode, Radio) and in the full-screen code view.

#### Scenario: Turned off
- **WHEN** the toggle is off and the Live coder edits a line below the visible part of the panel
- **THEN** the panel does not scroll, and the edit is typed where it is

#### Scenario: Remembered
- **WHEN** the person turns the toggle off and reloads the page
- **THEN** the toggle is still off

#### Scenario: Default
- **WHEN** the app opens for the first time
- **THEN** the toggle is on and the panel follows the edits as before

### Requirement: Pause on manual scrolling
When the toggle is on and the person scrolls the code panel by hand (wheel, touch, scrollbar or keyboard), the panel SHALL stop following the edits until 10 seconds have passed since the last manual scroll, then follow again from the next edit. While paused, the toggle SHALL show it (a paused look and a tooltip that says it follows again shortly). Pressing the toggle while paused SHALL end the pause and follow at once; it SHALL NOT turn following off. Scrolls made by the app itself SHALL NOT start a pause.

#### Scenario: Reading another part
- **WHEN** following is on and the person scrolls up to read the first lines while the coder edits a line at the bottom
- **THEN** the panel stays on the first lines while the person keeps scrolling, and 10 seconds after the last scroll it moves to the next edit

#### Scenario: Ending the pause
- **WHEN** the panel is paused after a manual scroll and the person presses the toggle
- **THEN** the panel scrolls to the line being edited and follows again, and the toggle stays on

#### Scenario: Toggle off
- **WHEN** the toggle is off and the person scrolls by hand
- **THEN** nothing changes: the panel stays where the person leaves it

### Requirement: Player bar visible with the full-screen code
When the code panel is full screen, the player bar SHALL stay visible and usable at the bottom of the window, below the code panel, and the panel SHALL end above it. Esc and the full-screen button SHALL still leave the full-screen view.

#### Scenario: Pausing from the full-screen code
- **WHEN** the code is full screen while a song plays
- **THEN** the player bar shows title, time and bar counter below the code, and its Pause button pauses the song
