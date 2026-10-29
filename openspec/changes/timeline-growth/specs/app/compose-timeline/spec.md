## ADDED Requirements

### Requirement: One played map
Compose SHALL map the bars of the played song to the arranger with one mapping that covers a growth, waypoint sections played before the written ones and an added ending. The playing section, the section offsets, the ruler, the keys and the highlights SHALL use it.

#### Scenario: Waypoint song in Classic
- **WHEN** a song that starts with 4 waypoint sections of 8 bars plays in Classic with the live build off and the user clicks its last written section
- **THEN** the song plays that section and the strip highlights it

#### Scenario: Classic song without growth
- **WHEN** a Classic song without growth is in Compose
- **THEN** the ruler, the strip and the grid show the written sections only, as before

### Requirement: Growth column
A song with a growth SHALL show a read-only, hatched growth column before the written sections in the ruler, the section strip and the track grid, in the sections view and in the timeline view, aligned in all three. Each track row SHALL show the spans where the track plays in the growth and a tick for each of its steps. An added ending SHALL be a column of its own after the written sections.

#### Scenario: Live coder song
- **WHEN** a song with a growth of 132 bars is in Compose in Live coder
- **THEN** a growth column labelled with its bars and duration comes before the first written section, and the drums row shows where the drums play and a tick per drums step

#### Scenario: Crescendo ending
- **WHEN** a Crescendo song ends with an added "Stop" of 6 bars
- **THEN** a "Stop" column follows the last written section

### Requirement: Growth views
One icon toggle SHALL switch the growth column between hidden (a narrow tab), compact (a fixed width, about 160 px and 96 px on a phone, with a linear scale inside) and open (the growth at the same pixels per bar as the written song, the arranger scrolling horizontally). Compact SHALL be the default. The toggle SHALL have a tooltip in the interface language and SHALL be remembered per viewer.

#### Scenario: Open view
- **WHEN** the user switches the growth to open
- **THEN** the growth column is as wide per bar as the written sections and the arranger scrolls horizontally

#### Scenario: Remembered
- **WHEN** the user chooses hidden and reloads the page
- **THEN** the growth column is a narrow tab

### Requirement: One scale for seeking
The ruler knob, the time label, clicks, dragging and keys SHALL follow the played song. Arrow keys SHALL move one bar, Page Up and Page Down SHALL move to the previous or next growth step or section start, Home SHALL go to bar 0 and End to the last bar of the played song, ending included. Clicking the growth column in the strip SHALL go to bar 0; clicking the first written section SHALL go to the written section. Clicking a growth cell SHALL go to that track's step and select the track.

#### Scenario: Knob during the growth
- **WHEN** a grown song plays bar 49 of a growth of 132 bars
- **THEN** the knob is inside the growth column at that bar and the time label shows the time of bar 49

#### Scenario: Seek into the growth
- **WHEN** the user clicks the middle of the compact growth column in the ruler
- **THEN** the song seeks to about the middle of the growth

#### Scenario: End key
- **WHEN** the user presses End on the ruler of a Crescendo song with a "Stop" ending
- **THEN** the song seeks to the last bar of "Stop"

### Requirement: The arranger follows the knob
When the arranger is wider than the screen (the open growth view, a long timeline), it SHALL scroll horizontally while the song plays so the knob stays visible, a page at a time like a DAW, and only when "Follow playback" is on. Scrolling SHALL be smooth, and a jump when the viewer prefers reduced motion. Following SHALL pause while the user scrolls the arranger or drags the knob, and SHALL resume on the next play or seek, or after 3 seconds without user scrolling. An arranger that fits the screen SHALL never scroll.

#### Scenario: Page follow in the open view
- **WHEN** the growth is open, the arranger scrolls, and the playing knob reaches the right edge of the visible part
- **THEN** the arranger scrolls so the knob stands near the left of the visible part

#### Scenario: The user scrolls away
- **WHEN** the user scrolls the arranger away from the knob while the song plays
- **THEN** the arranger stays where the user left it, and follows the knob again after 3 seconds without scrolling or at the next seek

#### Scenario: Follow playback off
- **WHEN** "Follow playback" is off and the knob leaves the visible part
- **THEN** the arranger does not scroll

#### Scenario: Reduced motion
- **WHEN** the viewer prefers reduced motion and the arranger follows the knob
- **THEN** it jumps to the new position without a smooth scroll

#### Scenario: Compact view
- **WHEN** the growth is compact or hidden and the arranger fits the screen
- **THEN** the arranger never scrolls while the song plays
