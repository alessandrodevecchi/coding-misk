## Purpose

The options of how a song is made, kept once for the radio and the New song panel, and the length of one song in the director.

## ADDED Requirements

### Requirement: One store of song options
The app SHALL keep the options of how a song is made in one store, saved under the radio's existing key, read by the radio and by the New song panel. Values saved before this change SHALL read as they did. The director options of a song SHALL be built by one function for both users; the radio's options SHALL be the same as before this change.

#### Scenario: Old saved options
- **WHEN** the app opens with radio options saved before this change
- **THEN** the radio shows the same values and its next session's recipe is the same as before

#### Scenario: Same director options
- **WHEN** the radio and the New song panel build the director options from the same values
- **THEN** they are equal except that the panel's may hold `length`

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
