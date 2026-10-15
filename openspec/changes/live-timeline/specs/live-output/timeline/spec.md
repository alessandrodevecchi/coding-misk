## ADDED Requirements

### Requirement: Timeline area
The live picture and session videos SHALL be able to show a timeline of the song playing: one row per track with its clips, the sections on top, a playhead on the current bar, and the live build steps as marks with their comment. Past bars SHALL be dimmed.

#### Scenario: Timeline follows the playhead
- **WHEN** a song plays with a timeline view
- **THEN** the playhead moves bar by bar and the rows show which tracks play

### Requirement: Timeline views
The live presets SHALL include these views: visual + timeline; visual + code + timeline; code + timeline; soul + timeline; full visual with a floating timeline; visual + track column. Each view SHALL keep the existing song card option and the existing transitions between presets.

#### Scenario: Switch to a timeline view
- **WHEN** the control room takes the code + timeline preset
- **THEN** the picture moves to the code above and the timeline below, with the usual transition

#### Scenario: Track column
- **WHEN** the visual + track column view is on air
- **THEN** the playing tracks are lit with a level, and the next track to come in is announced with the bars left, unless the future is hidden

### Requirement: Whole song or scrolling window
A timeline view SHALL show either the whole song or a window of bars around the playhead that scrolls as the song plays.

#### Scenario: Scrolling window
- **WHEN** the floating timeline shows a window of 24 bars
- **THEN** it keeps the playhead in view and scrolls with the song

### Requirement: Future visibility
For songs without a live build the timeline SHALL show future clips and steps (marked as future). For songs with a live build (in blocks or crescendo) it SHALL hide everything after the playhead by default. A preset setting SHALL override the default.

#### Scenario: Live build hides the future
- **WHEN** a crescendo song plays with a timeline view
- **THEN** no clip or step after the current bar is shown

#### Scenario: Regular song shows the future
- **WHEN** a song without a live build plays
- **THEN** the clips still to come are shown, marked as future

### Requirement: Radio
In the radio the timeline SHALL show the song on air, start again with each song, and redraw when steering or curves rewrite the song. It SHALL NOT require a timeline in the Radio tab.

#### Scenario: Steering redraws
- **WHEN** the listener changes a curve while the timeline shows a regular radio song
- **THEN** the future part of the timeline changes to match the rewritten song

### Requirement: Session videos
Session videos (live recording and fast video) SHALL offer the same timeline views and follow the same visibility rules.

#### Scenario: Fast video with timeline
- **WHEN** a song is exported as a fast video with the visual + timeline layout
- **THEN** every frame shows the timeline at that frame's bar
