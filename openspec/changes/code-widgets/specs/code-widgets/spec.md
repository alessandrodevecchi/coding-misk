## ADDED Requirements

### Requirement: Code widgets option

The app SHALL offer "Code widgets" (it: "Widget nel codice"): an on/off option with a number of widgets on screen together, default off and default number 3, with no maximum other than the number of tracks. The option SHALL apply to every profile, to the radio, to code shown in Compose and to songs that do not grow. With the option off, the shown code, the evaluated code, the typing, the growth and every fixture SHALL be identical to the code without this change.

#### Scenario: Off by default

- **WHEN** a user opens the app for the first time and plays a Live coder song
- **THEN** no widget call appears in the code and the code text is the same as before this change

#### Scenario: Number of widgets

- **WHEN** the option is on with the number 2 and five tracks play
- **THEN** at most two widget calls are in the shown code at any time

#### Scenario: Every profile

- **WHEN** the option is on and the same song plays in Classic, Crescendo and Live coder
- **THEN** each profile shows widgets on its lines, following the rules of that profile

### Requirement: Code widgets settings card

The Settings page SHALL have one card "Code widgets" with collapsible sections for: the option and the number; each widget on or off; each widget on or off per instrument, with the primary and secondary widget of each instrument and the choice between pianoroll and punchcard; selected parameters on or off; and sizes. The settings SHALL be saved with the other settings and included in the backup, in English and Italian.

#### Scenario: Turning off a widget

- **WHEN** the user turns off `_scope` in the card
- **THEN** no new `_scope` call is written, and instruments whose primary widget is scope use their secondary widget

#### Scenario: Per-instrument switch

- **WHEN** the user turns off widgets for `hats`
- **THEN** no hats line gets a widget, and the slot goes to another track

#### Scenario: Backup

- **WHEN** the user exports a backup with changed widget settings and imports it in a fresh browser
- **THEN** the card shows the same settings

### Requirement: Available widgets

All of Strudel's inline widgets SHALL be available: `_scope`, `_pianoroll`, `_punchcard`, `_spectrum`, `_spiral` and `_pitchwheel`. `_pitchwheel` and `_spiral` SHALL be off by default, and so SHALL the parameters `labels` and `smear`.

#### Scenario: Spiral off by default

- **WHEN** the option is on with default settings
- **THEN** no `_spiral` or `_pitchwheel` call is written, and no pianoroll shows labels or smear

#### Scenario: Turning spiral on

- **WHEN** the user turns `_spiral` on and sets it as the arp's primary widget
- **THEN** an arp line that gets a widget ends with `._spiral()`

### Requirement: Default mapping

Each instrument SHALL have a primary widget and secondary widgets, by default: drums scope (pianoroll, spectrum); hats pianoroll (scope, spectrum); bass scope (pianoroll, spectrum); lead pianoroll (scope, spectrum); arp pianoroll (scope, spectrum); pad scope (pianoroll); fx off (scope, spectrum); voice off (scope, spectrum). Punchcard SHALL be the alternative to pianoroll in Settings.

#### Scenario: Default widget of a bass line

- **WHEN** the option is on with default settings and a bass line gets a widget
- **THEN** the line ends with `._scope()`

#### Scenario: fx and voice

- **WHEN** the option is on with default settings and an fx line and a voice line play
- **THEN** neither line gets a widget

#### Scenario: Secondary widget

- **WHEN** the user turns off `_pianoroll` and a lead line gets a widget
- **THEN** the line gets its first secondary widget that is on, `_scope`

### Requirement: Widget parameters

The shown code SHALL carry the short call (`._pianoroll()`). Parameters SHALL come from shared groups in the hidden code, merged in this order: sizes, colours, the widget's own group, then any option written in the line. Every parameter of a Strudel widget SHALL be accepted and passed on, even when the app does not use it.

#### Scenario: Unused parameter

- **WHEN** a line typed by hand contains `._pianoroll({ labels: 1, overscan: 1 })`
- **THEN** it evaluates without error and the widget shows labels

### Requirement: Widget sizes

Sizes SHALL be parameters. Default sizes SHALL be smaller than Strudel's and adjustable in Settings, with a bigger default for `_spiral`. A changed size SHALL never break the code, the typing or the layout of the panel.

#### Scenario: Size in Settings

- **WHEN** the user sets the row height to 60 and the song plays on
- **THEN** from the next evaluation the row widgets are 60 px high and the code text is unchanged

### Requirement: Colours follow the app theme

Widgets SHALL use Strudel's normal style, with colours taken from the app theme (neon, hardware) at each evaluation.

#### Scenario: Theme change

- **WHEN** the user switches the theme from neon to hardware while a song plays
- **THEN** the widgets use the hardware colours from the next evaluation

### Requirement: Typing keeps the widgets

Every update of the panel's code while a song plays SHALL replace only the changed text range, so widgets and lit notes on unchanged lines stay while another line is typed.

#### Scenario: Typing a new line

- **WHEN** the Live coder types a new line letter by letter while three widgets are shown
- **THEN** the three widgets stay at every typed frame, and the text equals the text the full replacement would give

### Requirement: Scope and spectrum keep the instrument

`_scope` and `_spectrum` SHALL keep the line's `analyze` value, and SHALL draw that instrument's analyser, in both Strudel copies of the app, without changes to superdough.

#### Scenario: Stage levels

- **WHEN** a bass line with `._scope()` plays through the hidden mixer
- **THEN** its haps keep `analyze` `bass`, the stage and level snapshots see the bass, and the scope draws the bass wave

#### Scenario: Hand-typed scope

- **WHEN** the user types `._scope()` on a line in hand live coding
- **THEN** the line keeps its instrument as well

### Requirement: Writing widgets in growing songs

In profiles that type the code, the coder SHALL add a widget when writing the line if the step has free time after the line or the track matters, and otherwise later in an idle step. A muted line MAY carry its widget already, or MAY get it in a pause before it returns. When no time is left, the widget code SHALL appear at once. The growth SHALL be measured without widgets: a widget SHALL never make a step rushed, and SHALL not change shapes, durations or the growth store key.

#### Scenario: Line with free time

- **WHEN** the option is on and a step writes the first bass line with four free bars after it
- **THEN** the coder types `._scope()` at the end of the line in the same step

#### Scenario: No free time

- **WHEN** a step has no free time after its line
- **THEN** the widget is typed in a later idle step, or appears at once when no idle step comes before the next section

#### Scenario: Same growth

- **WHEN** the same Live coder song grows with the option on and off
- **THEN** both growths have the same shape, steps and lengths, and only the typed widget text differs

#### Scenario: Line keys ignore widgets

- **WHEN** a reused line or a line copied from earlier code differs only by a widget call
- **THEN** it counts as the same line

### Requirement: Classic widgets follow the playing line

In Classic, where lines of past sections stay in the code, a widget SHALL sit only on the line of its track that plays now. At a section change it SHALL move to the track's new line, it SHALL be removed when the track is silent, and it SHALL stay on a muted line that returns within 8 bars.

#### Scenario: Section change

- **WHEN** the bass moves from its verse line to its chorus line at a section change
- **THEN** the `._scope()` call leaves the verse line and is on the chorus line

#### Scenario: Short silence

- **WHEN** a track with a widget is muted and returns 4 bars later
- **THEN** the widget stays on its line during the silence

#### Scenario: Long silence

- **WHEN** a track with a widget is silent for 16 bars
- **THEN** its widget is removed and its slot goes to another playing track

### Requirement: Songs that do not grow

In songs that do not grow, widgets SHALL change at once at each section change, with one evaluation at the section boundary. In the "one line per track" view the widgets SHALL never move. The evaluation SHALL cause no audio glitch.

#### Scenario: Section boundary

- **WHEN** a song that does not grow reaches a new section with the option on
- **THEN** the widgets are on the lines of the new section from its first bar, without typing

#### Scenario: One line per track

- **WHEN** the view is "one line per track"
- **THEN** the widgets stay on the same lines for the whole song

#### Scenario: No glitch

- **WHEN** the browser check plays a song that does not grow across every section boundary
- **THEN** it records no underrun and no level jump at the boundaries compared with the option off

### Requirement: Widgets in videos and the live output

The session video, the vertical fragments with code and the live output SHALL draw the widgets below their lines, in new "Code + widgets" scenes; existing scenes SHALL stay unchanged.

#### Scenario: Session video

- **WHEN** a session video is recorded with a "Code + widgets" scene and the option on
- **THEN** the frames show the widgets below their lines

#### Scenario: Old scenes

- **WHEN** a session video is recorded with an existing code scene and the option on
- **THEN** the frames are the same as without the option

### Requirement: Widgets in the fast video

The fast video SHALL redraw note widgets (`_pianoroll`, `_punchcard`, `_spiral`, `_pitchwheel`) from the haps of each line, and SHALL draw `_scope` and `_spectrum` from one extra offline render per track with a widget. When the extra renders are too slow, the fast video SHALL fall back to the master waveform and spectrum for those widgets.

#### Scenario: Fast video scope

- **WHEN** a fast video is exported with two tracks carrying `_scope`
- **THEN** each scope draws the wave of its own track, from two extra renders

#### Scenario: Fallback

- **WHEN** the extra renders would pass the time limit
- **THEN** the scopes draw the master waveform and the export finishes

### Requirement: Checks know the widgets

`check:strudel` SHALL accept the widget methods. Checks that evaluate code in Node SHALL install stub widget methods that return the pattern unchanged. `check:mixer` SHALL include a case with widgets on, with the same gain, orbit, analyze, postgain and velocity as without widgets.

#### Scenario: Node check with widgets

- **WHEN** `check:mixer` evaluates Live coder code with widget calls
- **THEN** evaluation does not fail and every hap has the values of the code without widgets
