# Spec Delta

## Purpose

Keeps the startup light: the app loads only what the first screen needs, and its layout does not jump after the first paint.

## ADDED Requirements

### Requirement: Sound photos on demand
The app SHALL NOT request any photo of the Sounds tab while the Sounds tab has not been shown. When the Sounds tab is shown, the photos of the rows on screen SHALL load; photos of rows far below the visible area SHALL load only when they come near the screen (lazy loading). A photo SHALL keep its place while it loads, so the rows do not move.

#### Scenario: Startup with the tab closed
- **WHEN** the app opens on a fresh browser with the Compose tab shown and waits until the sample lists are loaded
- **THEN** no request for a file under `sounds/photos/` is made

#### Scenario: Opening the Sounds tab
- **WHEN** the person opens the Sounds tab on the drum machines library
- **THEN** the photos of the rows on screen load, and scrolling down loads the others

### Requirement: Layout settles without jumping
The space of the header, the stage and the work area SHALL be reserved before the first paint, so that the cumulative layout shift of a fresh load stays under 0.1 at desktop width (1440 × 900) and at phone width (390 × 844), as a narrow window and as a touch phone. The work area MAY stay invisible until the app has built it once; it SHALL become visible after at most 4 seconds even if the app fails to start.

#### Scenario: Desktop
- **WHEN** the app opens at 1440 × 900 on a fresh browser
- **THEN** the stage does not move after the first paint and the layout shift is under 0.1

#### Scenario: Phone
- **WHEN** the app opens at 390 × 844
- **THEN** the layout shift is under 0.1

#### Scenario: App fails to start
- **WHEN** the app's script fails before its first render
- **THEN** the work area becomes visible after 4 seconds
