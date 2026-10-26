## Purpose

How a Live coder build writes and types a line that was already in its code: kept muted and unmuted, kept muted beside the pattern that replaced it, copied from earlier code, or edited while muted, and how a new line is typed ahead, muted, when there is time, so a line is not typed again from scratch at a speed no person types.

## ADDED Requirements

### Requirement: Mute or delete judged on the code shown
When a silent line that returns later may be kept muted or deleted (written-like-coder D5), each way SHALL be costed on the line as the code shows it (long linear lists written as ramps), and the two costs SHALL be compared on the line's own share of its track's typing, so a cost shared by both ways does not make them look equal. When the two costs are close, a seeded draw SHALL still choose, so close calls keep some variation.

#### Scenario: kellerlicht acid line
- **WHEN** kellerlicht grows as Live coder with the default controls and its acid line goes silent at bar 280 and returns at bar 320
- **THEN** the line stays in the code muted from bar 280, and the step at bar 320 edits it in place instead of typing it new

#### Scenario: A line that returns much changed
- **WHEN** a returning line costs clearly more to edit than to type new, measured on the code shown
- **THEN** it is deleted when it goes silent and typed new on its return, as today

### Requirement: A replaced line stays muted when it returns
When a track's line is replaced by an unlike line (one the typing would type new rather than edit) and the replaced line plays again later in the written part, the replaced line SHALL stay in the code muted beside the line that replaced it, when keeping it costs less than typing it again; on its return it SHALL be unmuted and edited where it changed, and the line that replaced it SHALL be muted or deleted by the same rule.

#### Scenario: kellerlicht rolling bass
- **WHEN** the rolling bass line of bars 320 to 343 is replaced by the held bass in Nebel and comes back at Druck (bar 360)
- **THEN** at bar 360 the rolling bass line is unmuted, not typed again

### Requirement: Copy from earlier code
A new line that has to be typed, and that is the same as or close to a line shown earlier in the song (at least as alike as a line copied from above today) and no longer in the code, SHALL be pasted as a copy of that earlier line and then edited where it differs, as a long line like a line above it is today. This SHALL apply to the growth and to the written part alike. Only lines of the same song's code are copied; comments and the voice's code are never copied.

#### Scenario: An identical line comes back
- **WHEN** a line identical to one deleted earlier must be typed again
- **THEN** the typing pastes it after a short pause and types nothing else for it

### Requirement: Returning lines edited while muted
A muted line that returns changed SHALL be edited into its return form while still muted, in the step of its silence whose typing leaves the most time, so the step on which it returns only unmutes it. The sound SHALL NOT change: a muted line plays nothing.

#### Scenario: Edited before the return
- **WHEN** a muted line returns with new values after a silence that holds a section change with time to spare
- **THEN** the code shows the muted line with its new values from that step, and the return step deletes only the `_` of `_$:`

### Requirement: New lines typed ahead, muted
In the written part, a new line of a coming step SHALL be typed earlier, muted and in its final form, at a step whose typing leaves time to spare, so its own step only unmutes it. A step SHALL take a line ahead only when its spare time covers the line's typing with a margin, and a crowded step SHALL be prepared first. The sound SHALL NOT change: a line typed ahead plays nothing until its step.

#### Scenario: Getting ahead before a section change
- **WHEN** a section change must type a new line and a step before it, within the look-ahead, has spare time for that line
- **THEN** the code shows the new line muted from that step, and the section change deletes only the `_` of `_$:` for it

#### Scenario: No time to spare
- **WHEN** no step within the look-ahead leaves enough spare time
- **THEN** the line is typed at its own step, as today

### Requirement: Limits on lines typed ahead
Lines typed ahead SHALL be limited so the code stays readable: a look-ahead up to the next section change and at most 32 bars, at most 2 lines ahead at once, at most one per step and one per track, and none while the code already shows 4 or more muted lines.

#### Scenario: Screen limit
- **WHEN** the code of a moment already shows 4 or more muted lines, or 2 lines typed ahead
- **THEN** no further line is typed ahead at that step

#### Scenario: Too far ahead
- **WHEN** the only crowded step is more than 32 bars away, or after the next section change
- **THEN** no line is typed ahead for it yet

### Requirement: Same sound and same growth shapes
Every hap of every step SHALL stay the same in Classic, Crescendo and Live coder, with every code preset. The shapes drawn SHALL stay the same (`SHAPES_SEED` unchanged); when the Live coder fixtures move, `SHAPES_VERSION` SHALL go up so saved growths, card lengths and saved sessions grow anew. The Crescendo fixtures SHALL NOT move.

#### Scenario: Hidden mixer
- **WHEN** `npm run check:mixer -- --full` runs after the change
- **THEN** every song passes, with the muted lines kept in place

### Requirement: Reused lines measured
`growth:probe` SHALL report, for the growth and the written part, the new lines typed although a line at least 80% alike was shown earlier, and how fast they are typed. Over the built-in songs with the default controls the count SHALL go down from 45 (39 in the written part) measured before the change, and the written part of kellerlicht SHALL type no line again that it shows muted or showed earlier unchanged.

#### Scenario: Before and after
- **WHEN** the probe runs on the built-in songs before and after the change
- **THEN** the DEVLOG records both counts and the typing time at each section change of luci-rosse, settimo-cielo and kellerlicht

### Requirement: Lines ahead and muted lines measured
`growth:probe` SHALL report per song the lines typed ahead, the rushed steps, and the most muted lines shown at once, so the effect of typing ahead and the screen limits can be compared before and after.

#### Scenario: Probe report
- **WHEN** the probe runs on the built-in songs after the change
- **THEN** it lists, per song, the lines typed ahead, the rushed steps and the most muted lines shown, and the DEVLOG records the totals
