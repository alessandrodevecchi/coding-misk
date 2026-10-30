## ADDED Requirements

### Requirement: Code over layout

The app SHALL offer a layout "Code over" (it: "Codice sopra") that draws the code transparent over the scene, without a separate code panel. It SHALL exist for the session video (real time and fast), the live output (a "Code over" view), fragments in every format and an optional stage mode of the page. Every existing layout SHALL stay unchanged.

#### Scenario: Session video

- **WHEN** a user records a session video with the layout "Code over"
- **THEN** the scene fills the frame, the code is drawn over its left part, and no code panel or panel header is drawn

#### Scenario: Vertical fragment

- **WHEN** a user makes a 9:16 fragment with the show "Code over"
- **THEN** the code covers the width of the frame over the scene, and the caption lane sits below the code area

#### Scenario: Old layouts unchanged

- **WHEN** a user records with any layout that existed before this change
- **THEN** the frames are drawn as before

#### Scenario: Live output

- **WHEN** the live output takes the "Code over" view
- **THEN** the picture on air shows the scene over the whole frame with the code drawn over it

### Requirement: Code area by format

In 16:9 the code SHALL take the left part of the frame by default, from 3.5% of the width to the "Code width" setting (default 62% of the frame), and a setting SHALL put it on the right or across the whole width. In tall formats it SHALL take the whole width above the bottom band.

#### Scenario: Default width

- **WHEN** a 16:9 video is recorded with the default settings
- **THEN** the code area starts at 3.5% of the frame width and ends at 62% of it

#### Scenario: Code on the right

- **WHEN** the user sets the code side to Right and records a 16:9 video
- **THEN** the code is drawn over the right part of the frame and the left part shows only the scene

### Requirement: One band per line

In "Code over", each line SHALL have a background band as wide as its text, from its first non-blank character to its end. Empty lines SHALL have no band, so the scene shows between blocks. Comments and muted lines SHALL be drawn dimmed, as in the editor.

#### Scenario: Band follows the text

- **WHEN** a line of 20 characters and a line of 60 characters are drawn
- **THEN** the second band is about three times as wide as the first, and the space right of each band shows the scene

#### Scenario: Empty lines

- **WHEN** the code has an empty line between two blocks
- **THEN** no band is drawn on that line

### Requirement: Band colours from the code theme

Band colour and opacity SHALL come from the code theme: dark bands with light text in Neon, amber on dark brown in Hardware, light bands with dark text in Light, and a band role for every other theme. A setting SHALL choose the band opacity (Low, Medium, High), never below the theme's floor. Every text role SHALL meet 4.5:1 against its band whatever the look and render style behind, at every opacity setting.

#### Scenario: Readable over every look

- **WHEN** the layout is drawn over each look and each render style, in Neon, Hardware and Light
- **THEN** every text role on its band meets 4.5:1, measured on the drawn band colour

### Requirement: Long lines cut in this layout only

A line longer than the code area SHALL end with `…` at the area's edge in "Code over". The editor, the code panel layouts and the saved code SHALL keep the whole line.

#### Scenario: Cut line

- **WHEN** a line of 120 characters is drawn in a code area of 70 columns
- **THEN** the band shows the first 69 characters followed by `…`, and the editor still shows the whole line

### Requirement: Stage mode in the page

The stage SHALL have an optional "Code over" mode, off by default, switched by a button in the stage bar and kept in full screen. With the mode on, the code SHALL be drawn over the stage. The code editor SHALL stay open as without the mode and SHALL never be replaced by it. The mode SHALL be remembered.

#### Scenario: Switch on

- **WHEN** a user presses "Code over" while a song plays
- **THEN** the playing code is drawn over the scene with its bands, and the code editor stays where it was

#### Scenario: Off by default

- **WHEN** a user opens the app for the first time
- **THEN** the stage shows the scene without code over it

#### Scenario: Hand take-over

- **WHEN** the mode is on and the user takes over the code by hand
- **THEN** the user types in the editor, and the stage keeps drawing the code over the scene

### Requirement: Line being edited

While the coder types a line (automatic typing in any profile, or the radio), the line SHALL be drawn with the theme's accent colour as its band and a block cursor at the typing position. When the edit of that line ends, the band SHALL go back to the normal colour. The same edited line SHALL appear in real-time videos, the live output and the fast video, taken from the typing plan, not guessed from text changes.

#### Scenario: Typing a line

- **WHEN** the Live coder types a new `.s("sawtooth")` into a line
- **THEN** that line's band is in the edit colour with a block cursor after the last typed character, and the other bands are normal

#### Scenario: Edit ends

- **WHEN** the line's last key is typed and the edit ends
- **THEN** within half a second the band is back to the normal colour and no cursor is drawn

#### Scenario: Fast video

- **WHEN** the same song is exported as a fast video
- **THEN** the edited line and the cursor position at each frame equal those of the real-time video at the same cycle

### Requirement: Lit notes outlined or filled

The code theme settings SHALL have an option "Lit notes" (it: "Note accese") with the values Outline (default) and Filled. Outline SHALL draw a frame around each playing token in the theme's outline colour; Filled SHALL fill it with that colour, text kept readable. The option SHALL apply to the editor, to every video code layout and to "Code over". In videos and in "Code over" the lit tokens SHALL be the real locations of the playing haps.

#### Scenario: Outline by default

- **WHEN** a song plays with default settings in "Code over"
- **THEN** the playing mini-notation tokens are framed, not filled, and the frames move with the haps

#### Scenario: Filled

- **WHEN** a user sets "Lit notes" to Filled
- **THEN** the playing tokens are filled in the editor and in "Code over", and the text inside stays readable

### Requirement: Lit tokens in Code over

In "Code over" a setting SHALL choose which tokens light: only the first mini-notation string of each line (default) or every playing string.

#### Scenario: First string only

- **WHEN** the line `$: s("bd*4").bank("RolandTR909")` plays in "Code over" with the default settings
- **THEN** only tokens of `"bd*4"` are lit, never `"RolandTR909"`

### Requirement: Captions and stage widgets in this layout

In "Code over", the caption lane SHALL not overlap the code area: in 16:9 it SHALL sit at the bottom of the scene's side of the frame; in tall formats it SHALL sit below the code area. The stage widget strip SHALL draw only on the side away from the code in 16:9 and SHALL be off in tall formats. The full looks (Monitor, Rullo, Claude, Soul) SHALL stay available under the code.

#### Scenario: Caption with code on the left

- **WHEN** the narrator speaks while a 16:9 video with "Code over" records
- **THEN** the caption is drawn at the bottom of the right part of the frame and covers no code band

#### Scenario: Strip panels

- **WHEN** the stage widget layer is set to the strip and "Code over" is on in 16:9
- **THEN** the panels are drawn only on the right side, and no panel is under a code band
