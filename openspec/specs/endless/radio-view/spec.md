# endless/radio-view Specification

## Purpose
The radio view is the place in the app where endless music plays with one click, with the controls to choose its styles and the information on what is on air.

## Requirements

### Requirement: Radio tab
The app SHALL have a Radio tab next to Compose and Songs, in Italian and English. The stage SHALL stay on top in the Radio tab as in the other tabs, and every existing visual SHALL be usable. Below the stage the tab SHALL show the controls, a "now playing" card, the code of the song on air, and the history.

#### Scenario: Open the radio
- **WHEN** the user opens the Radio tab
- **THEN** the stage is on top, the controls and the "now playing" card are below it, and nothing plays until the user presses start

#### Scenario: Visuals
- **WHEN** the radio plays and the user picks another visual
- **THEN** the stage shows that visual and its instruments react to the radio

### Requirement: Radio controls
The radio SHALL offer: start and stop, pause and resume, skip song, a multi-select of the starting styles (at least one selected), chaos, energy, complexity and voice amount from 0 to 1, the seed with a "replay" action, "save" and "open in Compose". The defaults SHALL be those of the director (chaos 0.3, energy 0.6, complexity 0.5) with one style selected. Every control SHALL have a short tooltip that explains it. Changes to styles, chaos, energy, complexity and voice amount SHALL apply from the next song generated, never to the song on air. The controls SHALL be remembered in the browser between visits.

#### Scenario: Start
- **WHEN** the user selects synthwave and presses start
- **THEN** a synthwave song starts building itself within a few seconds, and the seed of the session is shown

#### Scenario: Change applies to the next song
- **WHEN** a song is on air and the user raises energy from 0.6 to 0.9
- **THEN** the song on air keeps its steps, and the next song is generated with energy 0.9

#### Scenario: No style selected
- **WHEN** the user unselects the last style
- **THEN** the radio keeps that style selected and says that at least one style is needed

#### Scenario: Skip
- **WHEN** the user presses skip
- **THEN** the next song starts on the next bar and the skipped song goes to the history

### Requirement: Now playing card
The radio SHALL show, for the song on air: title, styles per part, key, tempo, energy shape with the current position in the song, the section playing, and the next changes coming (the next build steps with their bar and comment). A new song SHALL be announced in the card when its first bar plays.

#### Scenario: Card follows the song
- **WHEN** the radio moves from one song to the next
- **THEN** on the first bar of the new song the card shows its title, styles, key, tempo and shape, and the position starts again from the beginning

#### Scenario: Next changes
- **WHEN** a build step is coming in the song on air
- **THEN** the card lists it with its bar before it happens

### Requirement: Code of the song on air
The radio SHALL show the code of the song on air as it types itself, as the live build does in Compose. The code panel SHALL be collapsible and start expanded.

#### Scenario: Collapse the code
- **WHEN** the user collapses the code panel
- **THEN** the music keeps playing and the panel stays collapsed on the next visit

### Requirement: Pause
Pause SHALL stop the sound and keep the position; resume SHALL go on from the same bar of the same song, with the same next song.

#### Scenario: Resume where it paused
- **WHEN** the user pauses at bar 37 of a song and resumes later
- **THEN** the song goes on from bar 37 and the song after it is the one prepared before the pause
