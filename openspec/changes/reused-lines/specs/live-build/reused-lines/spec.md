## Purpose

How a Live coder build writes and types a line that was already in its code: kept muted and unmuted, kept muted beside the pattern that replaced it, copied from earlier code, or edited while muted, so a line is not typed again from scratch at a speed no person types.

## ADDED Requirements

### Requirement: Mute or delete judged on the code shown
When a silent line that returns later may be kept muted or deleted (written-like-coder D5), each way SHALL be costed on the line as the code shows it (long linear lists written as ramps), and the two costs SHALL be compared on the line's own share of its track's typing, so a cost shared by both ways does not make them look equal.

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
A new line that has to be typed, and that is the same as or close to a line shown earlier in the song (at least as alike as a line copied from above today) and no longer in the code, SHALL be pasted as a copy of that earlier line and then edited where it differs, as a long line like a line above it is today. Only lines of the same song's code are copied; comments and the voice's code are never copied.

#### Scenario: An identical line comes back
- **WHEN** a line identical to one deleted earlier must be typed again
- **THEN** the typing pastes it after a short pause and types nothing else for it

### Requirement: Returning lines edited while muted
A muted line that returns changed SHALL be edited into its return form while still muted, in the step of its silence whose typing leaves the most time, so the step on which it returns only unmutes it. The sound SHALL NOT change: a muted line plays nothing.

#### Scenario: Edited before the return
- **WHEN** a muted line returns with new values after a silence that holds a section change with time to spare
- **THEN** the code shows the muted line with its new values from that step, and the return step deletes only the `_` of `_$:`

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
