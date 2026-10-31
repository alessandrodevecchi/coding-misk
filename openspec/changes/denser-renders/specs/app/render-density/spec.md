## ADDED Requirements

### Requirement: Density from the picture's short side

Each render SHALL size its cells (LED dots, ASCII characters, 1-bit dots, Terminal cells) from the short side of the picture in logical pixels, between a smallest and a largest cell size. A bigger picture SHALL get more cells, never larger cells beyond the largest size. The same picture size SHALL give the same cells on the stage, in the session video, in the fast video, in fragments and in the live output.

#### Scenario: Full screen gets more cells

- **WHEN** the stage goes from a window to full screen with the LED render
- **THEN** the dots keep about the same size on screen and the number of rows grows

#### Scenario: Small stage keeps enough cells

- **WHEN** the stage is 360 logical pixels high with the ASCII render
- **THEN** the render keeps at least 40 rows of characters

#### Scenario: Same frame in a video

- **WHEN** a fast video at 1080p and the stage at 1280 × 720 logical pixels draw the same frame with the same render
- **THEN** both have the same number of rows and columns

### Requirement: Finer LED, ASCII and 1-bit

At a full-screen stage of 1080 logical pixels high, LED SHALL draw at least 150 rows of dots (80 today) and ASCII at least 75 rows of characters (40 today). 1-bit dots SHALL be 2 device pixels, larger only as much as needed to keep the work picture within 1.2 million pixels (3 device pixels today, 6 with the light form).

#### Scenario: LED at full screen

- **WHEN** the owner plays a song full screen on a 1920 × 1080 display with the LED render
- **THEN** the dot pitch is at most 7.2 logical pixels (13.5 today)

#### Scenario: 1-bit in a 1080p video

- **WHEN** a fast video at 1080p is made with the 1-bit render
- **THEN** the dither dots are 2 pixels of the video (3 today)

#### Scenario: Vertical fragment

- **WHEN** a 1080 × 1920 fragment is made with the LED render
- **THEN** the dots are as small as in a 1080p landscape video, not larger

### Requirement: Readable glyph renders

Terminal and the glyph forms of Monitor and Roll SHALL grow their rows with the picture, and their text SHALL stay at least 12 logical pixels high so panel names and the status bar stay readable.

#### Scenario: Terminal at full screen

- **WHEN** the Terminal render is shown full screen at 1080 logical pixels high
- **THEN** it has more rows than today's 45, and its text is at least 12 logical pixels high

### Requirement: CRT alike at every pixel ratio

The CRT pass SHALL size its scanlines and grille in logical pixels, so the stage at device pixel ratio 1, the stage at ratio 2 and a 1080p video show the same spacing relative to the picture.

#### Scenario: Two displays

- **WHEN** the same frame is drawn with CRT on a stage at ratio 1 and at ratio 2
- **THEN** the number of scanlines over the picture's height is the same within one line

### Requirement: Gentler light form, shown

The light form (Settings → "Render on slow devices") SHALL make cells at most 1.5 times larger than the normal form, and never larger than the largest cell of the render. While the automatic light form is on, the stage's Render menu SHALL show it with a mark and a tooltip, in English and Italian. The fast video SHALL never use the light form on its own, as today.

#### Scenario: Automatic light form at full screen

- **WHEN** the pass is slow for 30 frames in a row at full screen and the setting is Automatic
- **THEN** the cells grow by at most 1.5 times and the Render menu shows that the light form is on

### Requirement: Density within the budget

The performance budget of the renders SHALL hold with the new densities: a pass at a 1080p video target at most 4 ms median (CRT at most 2 ms), the look and the pass on the stage at most 10 ms median, a fast video with a render at most 15% longer than with Normal.

#### Scenario: Budget check

- **WHEN** the browser check plays a song for 30 seconds on Sunset with each render at 1080p
- **THEN** every median is within the budget

### Requirement: Measured before and after

A measuring script SHALL print, for each render and each output (stage in a window, stage full screen at ratio 1 and 2, 1080p video, 9:16 fragment): the cell or dot size in device and logical pixels, the rows and columns, the median pass time and whether the light form is on. Its output before and after the change SHALL be kept with the change.

#### Scenario: Table for the owner

- **WHEN** the script runs before and after the change
- **THEN** the two tables show, per render and output, the old and the new rows and pass times
