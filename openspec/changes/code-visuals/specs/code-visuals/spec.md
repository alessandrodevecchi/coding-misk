## Purpose

Optional visuals drawn by the app beside the pattern lines of the code panel, and in the code of videos and of the live output, fed by the haps each line plays, without changing the code, its typing or its sound.

## ADDED Requirements

### Requirement: A display control for visuals in the code
The profile controls SHALL include `codeVisuals` ("Visuals in the code", it: "Visual nel codice") with the values `off`, `notes` and `level`, default `off` in every profile. It SHALL be a display control: shown in Compose's Code options and in the radio's Custom profile, applied on air from the next edit of the song on air, and kept out of the code controls that send a Classic song through the live code, the growth, the shape search and the growth store key.

#### Scenario: Turning it on in Classic
- **WHEN** a Classic song plays in Compose with every other control at Classic's values and the user sets "Visuals in the code" to `notes`
- **THEN** the code text in the panel is the same as before, and the song is not regrown or recompiled

#### Scenario: Live coder growth untouched
- **WHEN** a Live coder song grows with `codeVisuals` at `notes` and at `off`
- **THEN** both growths keep the same shape, the same steps and the same code at every step

### Requirement: Visuals are never part of the code
With any value of `codeVisuals`, the code shown in the panel, the code evaluated, the typing plan and its frames, the line breaks and every hap SHALL be identical to those with `off`.

#### Scenario: Same text and same typing
- **WHEN** the same Live coder song plays from bar 0 to bar 64 once with `off` and once with `notes`
- **THEN** the editor text is identical at every frame of the typing, and the haps queried at every step are identical

#### Scenario: Existing checks do not move
- **WHEN** `check:code`, `check:live-code`, `check:mixer`, `check:functions`, `check:typing`, `check:strudel`, `check-compact-code.cjs` and the Crescendo fixtures run after the change
- **THEN** they pass without new fixtures or snapshots

### Requirement: A strip of notes beside each pattern line
With `notes`, each pattern block on screen (a `$:` line and its continuation lines) SHALL show, in the free space right of its text, a strip of the notes its haps play from one cycle before to one cycle after the current cycle, with a playhead at the current cycle, in its instrument's colour. A hap SHALL belong to the block that holds its first mini-notation location. The strip SHALL be hidden for a block whose text would reach it, and SHALL never cover the code.

#### Scenario: A bass line
- **WHEN** a song plays with `notes` and its bass line `$: note("<a1 a1 c2 g1>*8")…` is on screen
- **THEN** the bass line shows a strip with eight notes per cycle, at the heights of a1, c2 and g1, moving past the playhead

#### Scenario: Hidden mixer
- **WHEN** the Live coder profile shows the code with the hidden mixer and no `.analyze("…")` in the text
- **THEN** every pattern line that plays still shows its strip in its instrument's colour

#### Scenario: A long line
- **WHEN** a pattern line is wider than the panel minus the strip
- **THEN** that block shows no strip and its text is unchanged

### Requirement: A level mark beside each pattern line
With `level`, each pattern block on screen SHALL show a small mark of four bars in the gutter of its first line, following the level of its instrument, as the stage's levels do.

#### Scenario: Kick and silence
- **WHEN** the kick line plays and the pad line's track is silent in this section
- **THEN** the kick's mark moves with each hit and the pad's mark stays at zero

### Requirement: Muted lines, typed lines and hand coding
A muted line (`_$:`) and a line typed ahead, muted, SHALL show no notes and no level. A block whose text is being typed or edited and not yet evaluated SHALL show no strip until its step or the next evaluation plays it. Code typed by hand SHALL get strips by the same rule as generated code.

#### Scenario: A line typed ahead
- **WHEN** the written part types a new line ahead, muted, and unmutes it at the section change
- **THEN** the line has no strip while muted and gets its strip from the bar it plays

#### Scenario: Hand live coding
- **WHEN** the user takes over and types a new pattern line, then evaluates
- **THEN** the new line gets its strip after the evaluation

### Requirement: Same visuals in videos and on the live output
When `codeVisuals` is not `off`, the session video and the fast video in layouts with code, the vertical fragments that show code, and the live output window SHALL draw the same strips or marks beside the code they draw, with the same drawing function as the panel. A frame of the visuals SHALL depend only on the cycle, the line's haps and the frame's levels, never on wall time.

#### Scenario: Fast video against the live player
- **WHEN** the same bar of a song is drawn by the fast video and by the live player with `notes`
- **THEN** the strips of each line show the same notes at the same places

#### Scenario: Two fast videos
- **WHEN** the same fragment is exported twice with `notes`
- **THEN** the frames of the code area are identical

### Requirement: Cost
The visuals SHALL cost nothing when `codeVisuals` is `off` or the code panel is collapsed. When on, the layer SHALL draw at most 30 frames a second, only for blocks on screen, under 1.5 ms per frame on average on luci-rosse with every line on screen.

#### Scenario: Off by default
- **WHEN** the app starts with default settings
- **THEN** no visuals layer exists and `check-startup.cjs` gives the same result as before the change
