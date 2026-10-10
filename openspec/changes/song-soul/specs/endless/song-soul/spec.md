# Spec Delta

## Purpose

Living pictures of a song's soul (seed, settings, curves, instruments) in retro science-fiction screens, as a visual scene and in a display of their own.

## ADDED Requirements

### Requirement: Soul data
The soul of a song SHALL be built from its seed, title, key, tempo, meter, shape, styles, voice, parts, instruments with where they come in, and the energy curve with the four detail curves of #40. For radio songs the curves come from the director; for other songs they SHALL be measured from the song's sections and tracks. The same song SHALL always give the same soul.

#### Scenario: Same song, same soul
- **WHEN** the same song is shown twice
- **THEN** the data, the sigil and the seeded shapes are identical

### Requirement: Ten views
The soul SHALL be drawable in ten views: A Tracker, B Terrain, C Sphere, D Lattice, E Strands, F Landscape, G Particles, H Halftone, I Aura, J Spectrum, as in the v3 mockups (`docs/soul/v3`). Every view SHALL be animated, follow the current bar while the song plays, and show small seeded events (glitches, flashes, pulses) so that each song looks different. Energy SHALL stand out as the main curve.

#### Scenario: Every view draws
- **WHEN** each view is shown for a radio song
- **THEN** it draws without errors, moves, and marks the current bar

### Requirement: Themes
In the neon theme the CRT views (A, B, C) SHALL draw in green phosphor and the colour views SHALL take their hue from the selected visual. In the HW theme the CRT views SHALL draw in amber and the colour views SHALL pass through a retro amber filter (few levels, ordered dither, big pixels, scanlines) with readable titles.

#### Scenario: HW theme
- **WHEN** the HW theme is on
- **THEN** every view draws in amber

### Requirement: Which view
Each song SHALL have a default view picked from its seed. When the song changes, the view SHALL change to the new song's default unless the view is locked. The listener SHALL be able to switch to the previous or next view at any time.

#### Scenario: Locked view
- **WHEN** the lock is on and the next song starts
- **THEN** the view stays the same

### Requirement: Messages and interference
When the soul appears or the song changes, an overlay SHALL type one line from a rotating list (for example "ANALYZING SONG SOUL", "TUNING IN", "DECIPHERING THE MONOLITH", "VOID... NOT EMPTY") with a progress bar, then reveal the view. When steering changes the song, the view SHALL show an interference effect with a "recalibrating" line (for example "RECALIBRATING", "SIGNAL DRIFT", "THE SOUL SHIFTED"). Lines SHALL be in English, the screens' language.

#### Scenario: Steering
- **WHEN** the listener queues a console command while the soul shows
- **THEN** the view glitches briefly with a recalibrating line and redraws with the changed song

### Requirement: Scene and full screen
The visual stage SHALL offer the soul as a scene (phase 1). The visual picker SHALL be a dropdown next to a full-screen button. The soul SHALL be viewable in full screen.

#### Scenario: Pick the soul
- **WHEN** the listener picks "Soul" in the visual dropdown while the radio plays
- **THEN** the stage shows the soul of the song on air

### Requirement: Soul display
A Soul display (phase 2) SHALL show the soul independently of the visual stage: the stage can show any visual while the display shows the soul. It SHALL have a power button with switch-on and switch-off animations, a full-screen button, previous and next view buttons, a lock switch and an "override visual" lever. With the lever on, the visual stage SHALL show the soul; turning the lever or the display off SHALL bring the chosen visual back. The display SHALL offer several shells (at least a sci-fi terminal, a wasteland terminal, a retro-futuristic screen and a 2000s CRT monitor), with a default per theme, and a control next to it that changes the shell without changing the theme.

#### Scenario: Change the shell
- **WHEN** the listener moves the shell lever
- **THEN** the display goes back into its hatch and the next shell comes out and switches on, showing the same soul

### Requirement: Display animations
Opening the display SHALL be animated: the stage shrinks, a hatch beside it slides in and opens, the display comes out and switches on. Turning it off SHALL play the reverse. With the override lever on, a cable SHALL be drawn from the display to the stage while the stage shows the soul.

#### Scenario: Open the display
- **WHEN** the listener presses the power button with the display closed
- **THEN** the stage shrinks, the hatch opens, the display comes out and switches on within about three seconds

#### Scenario: Override the visual
- **WHEN** the stage shows Edgerunners, the display is on and the listener turns the override lever on
- **THEN** the stage shows the soul; turning the display off brings Edgerunners back

### Requirement: Names
Screen labels SHALL use the app's own names (such as "MISK/OS"), never film trademarks.

#### Scenario: No trademarks
- **WHEN** any view is shown
- **THEN** no label uses a film's trademark
