## ADDED Requirements

### Requirement: Oscilloscope button on the stage
While the look is Oscilloscope, the stage toolbar SHALL show an "Oscilloscope" ("Oscilloscopio") button with an icon and a label, styled like Code over, Widgets and Fullscreen, in the accent colour while its panel is open. With any other look the button SHALL be hidden. At 640 px or less it SHALL show the icon only, with the label as its accessible name.

#### Scenario: Another look
- **WHEN** the listener switches from Oscilloscope to Palco
- **THEN** the button and its panel are hidden

### Requirement: Live settings panel
The button SHALL open a small panel on the stage with every Oscilloscope setting: Screen, Mode, Oversample audio, every parameter with its value and its link, and Defaults. A change SHALL show on the stage on the next frame, SHALL be stored like a change in the Settings card, and the card SHALL show the same values.

#### Scenario: Changing Persistence while a song plays
- **WHEN** the listener drags Persistence in the panel
- **THEN** the trail on the stage follows while dragging, and the Settings card shows the new value

### Requirement: Panel placement
The panel SHALL scroll when it is taller than the stage allows, SHALL close with the button, Escape or a click outside it, and SHALL work in full screen and in the neon, hardware and light themes. The panel SHALL never appear in recordings, videos or fragments.

#### Scenario: A fragment while the panel is open
- **WHEN** the listener exports a fragment with the panel open
- **THEN** the fragment's frames show no panel

#### Scenario: Full screen
- **WHEN** the stage is in full screen and the listener opens the panel
- **THEN** the panel shows inside the full-screen stage and scrolls within it

### Requirement: One set of controls
The Settings card and the stage panel SHALL be built from the same controls, so a setting added to one is in the other. The card SHALL show every setting the panel shows.

#### Scenario: A new parameter
- **WHEN** Smudge is added to the look's parameters
- **THEN** it shows in both the panel and the card, in English and Italian
