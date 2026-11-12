## ADDED Requirements

### Requirement: Oscilloscope look
The stage SHALL offer a look named "Oscilloscope" ("Oscilloscopio") in every look menu. It SHALL draw the sound of the song as a beam on a phosphor screen: in Sweep mode the mix against time, held still by a trigger; in XY mode the low instruments (kick, bass) on X against the others on Y. The beam SHALL leave a trail that fades by Persistence, SHALL be brighter where it moves slowly, and SHALL glow by Glow. The render styles, the widget layer, the code over the stage and the captions SHALL work over it as over the other scene looks. When nothing plays, the beam SHALL rest as a flat line (Sweep) or a dot (XY).

#### Scenario: Picking the look
- **WHEN** the listener picks Oscilloscope in the look menu while a song plays
- **THEN** the stage shows a green beam that follows the sound on a real oscilloscope screen

#### Scenario: A render over it
- **WHEN** the look is Oscilloscope and the render is CRT
- **THEN** the CRT pass goes over the oscilloscope's frame

### Requirement: Loaded only when picked
The drawing code of the Oscilloscope look SHALL be loaded the first time the look is drawn, not at the page's start, and SHALL add no dependency. While another look shows, the page SHALL do no work for the Oscilloscope look. Each frame SHALL be one pass on the stage's canvas.

#### Scenario: Start of the page
- **WHEN** the page opens on the Palco look
- **THEN** the Oscilloscope module is not loaded

### Requirement: Screen overlays
The look SHALL offer six overlays: Empty, Graticule (10 × 8 divisions), Smudged, Smudged graticule, Real oscilloscope (bezel, graticule, smudges, reflection) and Vector display (a rounded blue-black tube, no graticule). The overlays SHALL be drawn by the app, with no image files. Ambient light SHALL light the glass and Screen saturation SHALL set how much of the trace's hue it takes. The smudges SHALL be the same on every frame and in every export.

#### Scenario: Smudged graticule
- **WHEN** the overlay is Smudged graticule
- **THEN** the graticule and the smudges show over the beam, and do not move from frame to frame

### Requirement: Parameters
The look SHALL have the parameters Intensity (0-10), Persistence (0-0.95), Hue (0-360), Line saturation, Screen saturation, Focus, Noise, Glow, Ambient light, Smoothing, Sweep (2-40 ms) and Trigger value (-1 to 1), and the switches Oversample audio and Sweep or XY. A value out of range or missing in the stored settings SHALL take the default. The defaults SHALL be Intensity 5, Persistence 0.5, Hue 125, Line and Screen saturation 1, Focus 1, Noise 0, Glow 0.3, Ambient light 0.7, Smoothing 0, Sweep 10 ms, Trigger 0, Oversample on, mode Sweep, overlay Real oscilloscope. Persistence SHALL mean the same at any frame rate.

#### Scenario: Old or broken settings
- **WHEN** the stored settings hold Intensity 40 and an unknown overlay
- **THEN** the look uses Intensity 10 and the Real oscilloscope overlay

### Requirement: Song links
Each parameter SHALL have a link: Static, Bar, Section, Kick, Bass, Pad, Lead or Mix. Static SHALL keep the value. Bar SHALL move it through each bar, Section SHALL step it from the first section to the last, an instrument or the mix SHALL move it with that level. A link SHALL move the value toward the top of its range by at most 60 %; for Hue it SHALL turn the colour by at most half the circle. By default Glow SHALL follow the kick and Hue the section. Noise and every link SHALL depend on the song's time and levels only, so an export draws the same as the stage.

#### Scenario: Glow on the kick
- **WHEN** the defaults are on and the kick hits
- **THEN** the glow rises on the hit and falls back after it

#### Scenario: Hue by section
- **WHEN** the song moves from its first section to its last
- **THEN** the hue moves from 125 to at most 305 in steps, one per section

### Requirement: Oscilloscope settings card
Settings SHALL have an "Oscilloscope" card with the overlay, the mode, Oversample audio and the parameters Intensity, Persistence, Hue, Glow, Focus, Noise, Ambient light and Sweep, each with its value and its link, and a button to restore the defaults. A change SHALL show on the stage at once. The settings SHALL be stored in `coding-misk-oscilloscope` and travel in the backup.

#### Scenario: Changing the overlay
- **WHEN** the listener picks Vector display in the card
- **THEN** the stage shows the vector display on the next frame, and a reload keeps it
