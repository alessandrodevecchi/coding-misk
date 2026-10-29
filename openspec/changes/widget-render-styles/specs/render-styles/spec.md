## ADDED Requirements

### Requirement: Render choice next to the look

The app SHALL offer a render choice, "Render" (it: "Resa"), independent of the look, with the values Normal (default), 1-bit, CRT, LED, ASCII and Terminal. Every look, including the soul, Monitor, Rullo and the layer of stage widgets, SHALL be drawable in every render. Normal SHALL draw every look exactly as before this change.

#### Scenario: Normal changes nothing

- **WHEN** a user who never picked a render plays any look
- **THEN** every frame is identical to the frame before this change

#### Scenario: Any look in any render

- **WHEN** the user picks the Tramonto look and the 1-bit render
- **THEN** the stage shows Tramonto in two colours with an ordered dither

### Requirement: Frame pass for every look

A render other than Normal SHALL be applied as a pass over the finished frame of the look, after the flash, on the canvas the look was drawn on, unless the look draws the render natively. The 1-bit render SHALL use an ordered (Bayer) dither. A pass SHALL hold no state between frames and use no random numbers.

#### Scenario: Same input, same output

- **WHEN** the same frame of a look is passed through the same render twice, alone and inside a sequence
- **THEN** both outputs are identical

### Requirement: Native glyph painters for widgets

On Monitor, Rullo and the layer of stage widgets, the ASCII and Terminal renders SHALL be drawn by the widget painters in a grid of characters, not by a pass over the finished frame: every painter, the panel frame, the panel name and the level SHALL have a glyph form. The layer SHALL be drawn after the pass of the look under it when the render is native.

#### Scenario: Readable glyph scope

- **WHEN** Monitor shows a bass scope in the ASCII render
- **THEN** the scope is drawn as one glyph per column following the wave, and the panel name is readable

### Requirement: Code panel untouched

No render SHALL change the code panel, in the page, in videos or in fragments. The pass SHALL run on the stage canvas only.

#### Scenario: Terminal render in a video with code

- **WHEN** a video with the code layout is exported with the Terminal render
- **THEN** the stage area is drawn in Terminal and the code panel is identical to the one exported with Normal

### Requirement: Terminal as a modern text interface

The Terminal render SHALL draw a text interface on a dark ground with a truecolour palette of named colours per theme, a monospace font, rounded box-drawing panels with titles, a header line and a status bar. On the widget looks and the layer it SHALL be drawn natively: one panel per instrument titled in its colour, a level line, scopes as braille dots, spectra as eighth blocks, piano rolls as half blocks, punchcards as dots.

#### Scenario: Monitor in Terminal

- **WHEN** Monitor shows bass, lead and hats in the Terminal render
- **THEN** each instrument has a rounded panel titled with its name in its colour, the bass scope is drawn in braille dots and the hats as dots in their lanes

### Requirement: Terminal over the other looks

On looks without native widgets, the Terminal render SHALL draw the frame as half-block cells of two pixels each with stepped colours, under a tab bar and above a status bar with the song, the section, the bar and the tempo.

#### Scenario: A scene in Terminal

- **WHEN** Tramonto plays in the Terminal render
- **THEN** the scene keeps its colours and shapes as half-block cells, with a tab bar on top and a status bar at the bottom

### Requirement: Same frame in every output

The stage, the session video, the fast video, the fragments and the live output SHALL draw the same rendered frame for the same look, render, time and feed. Videos and fragments SHALL use the stage's render by default, with their own setting.

#### Scenario: Fast video

- **WHEN** a fast video is exported twice on the Monitor look with the LED render and the same song and settings
- **THEN** the frames of both files are identical

### Requirement: Theme colours

1-bit and Terminal SHALL take their colours from the app theme: 1-bit neon white paper, hardware amber on the LCD ground; Terminal a cool truecolour palette in neon and a warm one in hardware, with the scene of a non-widget look mapped to an amber ramp. The colours SHALL change from the next frame when the theme changes.

#### Scenario: Hardware theme

- **WHEN** the theme is hardware and the render is 1-bit
- **THEN** the stage is drawn in amber on a dark amber ground

### Requirement: Render settings

The render SHALL be chosen in a menu next to the look menu on the stage and in the video and fragments settings ("same as the stage" by default). A setting "On slow devices" (automatic by default, on, off) SHALL switch to a light form with fewer cells or dots. The choices SHALL be saved, in the backup and reset to defaults, in English and Italian, with a Guide line. A song SHALL NOT carry a render.

#### Scenario: Backup

- **WHEN** the user picks the CRT render and exports then imports a backup
- **THEN** the render is CRT

#### Scenario: Slow device

- **WHEN** the setting is automatic and the pass takes more than 8 ms for 30 frames in a row
- **THEN** the render switches to its light form

### Requirement: Render performance budget

Measured by the browser check: a pass at a 1080p video target SHALL take at most 4 ms median (CRT at most 2 ms); the look and the pass on the stage at most 10 ms median; native glyph Monitor at most 2 ms more than the plain Monitor; a fast video with a render at most 15% longer than with Normal.

#### Scenario: Frame time

- **WHEN** the browser check plays a song for 30 seconds on Tramonto with each render
- **THEN** the median pass time of each render is within the budget
