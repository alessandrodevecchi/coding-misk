## MODIFIED Requirements

### Requirement: New lines typed ahead, muted
In a Live coder song, growth and written part alike, a new line of a coming step SHALL be typed earlier, muted and in its final form, at a step whose typing leaves time to spare, so its own step only unmutes it. A step SHALL take a line ahead only when its spare time covers the line's typing with a margin; a rushed step SHALL NOT take one, and the first step of the song (bar 0) SHALL NOT take one. A crowded target step SHALL be prepared first. A line ahead MAY be typed at a growth step for a step of the written part. Crescendo and Classic SHALL NOT type lines ahead. The sound SHALL NOT change: a line typed ahead plays nothing until its step.

#### Scenario: Getting ahead before a section change
- **WHEN** a section change must type a new line and a step before it, within the look-ahead, has spare time for that line
- **THEN** the code shows the new line muted from that step, and the section change deletes only the `_` of `_$:` for it

#### Scenario: Getting ahead in the growth
- **WHEN** a quiet step of the growth has spare time for a new line of a coming step, in the growth or in the written part, within the look-ahead
- **THEN** the code shows the new line muted from that growth step, and its own step deletes only the `_` of `_$:` for it

#### Scenario: No time to spare
- **WHEN** no step within the look-ahead leaves enough spare time
- **THEN** the line is typed at its own step, as before

#### Scenario: Crescendo unchanged
- **WHEN** a song grows as Crescendo or plays as Classic
- **THEN** no line is typed ahead and its code is the same as before this change

### Requirement: Limits on lines typed ahead
Lines typed ahead SHALL be limited so the code stays readable, with the same limits in the growth and in the written part. The default limits SHALL be a look-ahead of at most 32 bars, which MAY cross a section change, at most 2 lines ahead at once, at most one typed ahead per step and one per track, a margin of 2 s of spare time beyond the line's typing, and none while the code already shows 8 or more muted lines (lines ahead included). These limits give about 2 lines ahead in the written part over the built-in songs, where the earlier limits (4 muted lines, never past the next section change) gave none. A page MAY override them (`globalThis.codingMiskAhead`) for checks and screenshots.

#### Scenario: Screen limit
- **WHEN** the code of a moment already shows 8 or more muted lines, or 2 lines typed ahead
- **THEN** no further line is typed ahead at that step

#### Scenario: Across a section change
- **WHEN** a crowded step 16 bars ahead lies after the next section change, and a step before has spare time for its new line
- **THEN** the line may be typed ahead at that step

#### Scenario: Too far ahead
- **WHEN** the only crowded step is more than 32 bars away
- **THEN** no line is typed ahead for it yet

### Requirement: Lines ahead and muted lines measured
`growth:probe` SHALL report per song the lines typed ahead, split by the part of the step that types them (growth or written part), the longest time a line ahead stays muted, the rushed steps of the growth and of the written part, and the most muted lines shown at once, so the effect of typing ahead and the screen limits can be compared before and after.

#### Scenario: Probe report
- **WHEN** the probe runs on the built-in songs after the change
- **THEN** it lists, per song, the lines typed ahead in the growth and in the written part, the longest muted wait, the rushed steps and the most muted lines shown, and the DEVLOG records the totals before and after

## ADDED Requirements

### Requirement: Lines ahead leave the growth shape alone
The growth shape search SHALL score each tried shape without lines typed ahead, and lines ahead SHALL be planned on the kept shape only, so every song keeps the shape it kept before this change. When the Live coder fixtures move, `SHAPES_VERSION` SHALL go up in the same change, with `SHAPES_SEED` and the Crescendo fixtures unchanged.

#### Scenario: Same kept shape
- **WHEN** `growth:probe -- all` runs before and after the change
- **THEN** every built-in song keeps the same shape

### Requirement: Checks of lines typed ahead
`check:live-code` SHALL read its limits from the default limits in the code, not from numbers written in the check. With the default limits it SHALL find a line typed ahead in the written part and one typed at a growth step, show each muted from its step to its target, and fail when the target step types it again. It SHALL check the limits at every step of every built-in song.

#### Scenario: Default limits change
- **WHEN** a default limit changes in the code
- **THEN** `check:live-code` checks the new value without an edit to the check
