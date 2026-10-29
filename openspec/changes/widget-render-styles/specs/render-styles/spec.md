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

### Requirement: Code panel in videos

In video and fragment layouts with code, the code panel SHALL take the render's text look instead of a pass: Terminal draws the code in a phosphor mono font on a near black ground, 1-bit in two colours without shading, the other renders as Normal. The code editor in the page SHALL NOT change.

#### Scenario: Terminal code in a video

- **WHEN** a video with the code layout is exported with the Terminal render
- **THEN** the code is drawn in the phosphor colour and stays readable, and the stage area is drawn in Terminal

### Requirement: Same frame in every output

The stage, the session video, the fast video, the fragments and the live output SHALL draw the same rendered frame for the same look, render, time and feed. Videos and fragments SHALL use the stage's render by default, with their own setting.

#### Scenario: Fast video

- **WHEN** a fast video is exported twice on the Monitor look with the LED render and the same song and settings
- **THEN** the frames of both files are identical

### Requirement: Theme colours

1-bit and Terminal SHALL take their colours from the app theme: neon white paper and green phosphor, hardware amber on the LCD ground. The colours SHALL change from the next frame when the theme changes.

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
