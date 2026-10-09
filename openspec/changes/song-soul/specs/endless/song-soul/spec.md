# Spec Delta

## Purpose

One screen that draws the whole soul of a radio song (seed, settings, curves, instruments) as a single picture, in an old CRT radar style.

## ADDED Requirements

### Requirement: Open and close the Soul screen
The now playing card and each song of the radio History SHALL have a "Soul" button that opens the Soul screen over the page. Escape, a close button or a click outside the display SHALL close it. Opening it SHALL NOT stop or change the music.

#### Scenario: Open while playing
- **WHEN** the listener presses "Soul" on the now playing card
- **THEN** the Soul screen opens over the page and the music goes on

### Requirement: What the screen draws
The Soul screen SHALL draw, for one song: the energy curve and the four detail curves of #40 in one picture, the parts of the song with their names, the instruments and where they come in, and readouts of title, seed, key, tempo, meter, shape, styles, voice and the radio's character (chaos, energy, complexity, voice). Energy SHALL stand out as the main curve.

#### Scenario: Every curve
- **WHEN** the Soul screen shows a song
- **THEN** energy, density, brightness, tension and voice are all drawn, and energy is the brightest

### Requirement: The seed's sigil
The screen SHALL draw a sigil from the song's seed and a short hash of it. The same seed SHALL always give the same sigil; different seeds SHALL give different sigils in practice.

#### Scenario: Same seed, same sigil
- **WHEN** two sessions with the same seed show their Soul screens
- **THEN** the sigils and hashes are identical

### Requirement: Live following
While the song shown is on air, the screen SHALL follow the current bar (sweep, scan line or rotation, by concept), light the instruments playing, and redraw when steering changes the song. A song from the History SHALL be shown still, at its end.

#### Scenario: Steering shows
- **WHEN** the listener sets a curve while the Soul screen is open
- **THEN** the screen redraws with the new curve after the change is queued

### Requirement: Themes and look
The screen SHALL use green phosphor in the normal theme and amber in the HW theme, with scanlines, glow and vignette, and labels in the app's own names. It SHALL fit the window, keep its proportions, and stay readable at phone width (a simplified layout is allowed).

#### Scenario: HW theme
- **WHEN** the HW theme is on
- **THEN** the Soul screen draws in amber
