## Purpose

The options of how a song is made: one shape and one code for the radio and the New song panel, two separate sets of values, the length of one song in the director, and a growth that keeps that length.

## ADDED Requirements

### Requirement: Same options, two sets of values
The app SHALL keep the options of how a song is made in two stores of the same shape, built by the same code: the radio's, under its existing key, and the New song panel's, under a key of its own. A change in one store SHALL NOT change the other. Values saved before this change SHALL read as they did.

#### Scenario: Old saved options
- **WHEN** the app opens with radio options saved before this change
- **THEN** the radio shows the same values and its next session's recipe is the same as before

#### Scenario: Panel does not touch the radio
- **WHEN** the owner sets energy to 0.9 in the panel
- **THEN** the radio still shows its own energy and its next songs do not change


### Requirement: One function for the director options
The director options of a song SHALL be built by one function from either store; the radio's options SHALL be the same as before this change.

#### Scenario: Same director options
- **WHEN** both stores hold the same values
- **THEN** the director options built from them are equal except that the panel's may hold `length`

### Requirement: Panel values start from the radio
The first time the panel opens with no values of its own, it SHALL start from a copy of the radio's values. "Prendi dalla radio" SHALL copy the radio's current values into the panel in one change; the radio's session-only fields SHALL NOT be copied.

#### Scenario: Take from the radio
- **WHEN** the radio has Live coder and synthwave and the owner presses "Prendi dalla radio" in the panel
- **THEN** the panel shows Live coder and synthwave, and the Preset select shows Personalizzato

### Requirement: Song length option
The director SHALL accept a `length` option for one song: `style` (or absent), `short` (2 to 2.5 minutes), `medium` (3 to 4), `long` (5 to 6), or a number of minutes from 1 to 12. The written song SHALL last within that range, or within half a double phrase of the exact length. `fit` SHALL win over `length`.

#### Scenario: Exact
- **WHEN** a song is drawn with `length: 3` at 120 bpm in 4/4 with phrases of 8 bars
- **THEN** it has 96 bars (3:12), the whole number of 16-bar double phrases nearest to 3 minutes

### Requirement: Length leaves the other draws alone
Without `length` a song SHALL be drawn exactly as before. With it, the styles, tempo, meter and key SHALL be the same as without it. A session recipe SHALL record `length` only when it is not `style`.

#### Scenario: Absent
- **WHEN** a radio session runs without `length`
- **THEN** the endless fixtures do not move

#### Scenario: Earlier draws unchanged
- **WHEN** the same seed and options are drawn with `length: 'long'` and without it
- **THEN** the styles, tempo, meter and key of the song are the same

### Requirement: Growth within the planned length
A Crescendo or Live coder song SHALL be able to carry the growth duration `planned`. With it, the growth SHALL be made as the radio makes a fitted growth on air: it SHALL take the written bars before a section boundary, so the song as heard lasts its written length plus at most one phrase. Compose, the song card and the exports SHALL grow such a song the same way. A song the growth cannot plan this way SHALL grow with the fitted duration.

#### Scenario: Live coder in the plan
- **WHEN** a Live coder song of 96 written bars carries the growth duration `planned`
- **THEN** it plays at most 104 bars in Compose, and its card shows the same length

#### Scenario: Other songs
- **WHEN** a song without `planned` grows in Compose
- **THEN** it grows as before this change and its card length does not move
