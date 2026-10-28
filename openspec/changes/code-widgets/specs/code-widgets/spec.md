## ADDED Requirements

### Requirement: Code widgets option

The app SHALL offer "Code widgets" (it: "Widget nel codice"): an on/off option with a maximum number of widgets on screen together, default off and default maximum 3. The option SHALL apply to every profile, to the radio, to code shown in Compose and to songs that do not grow. With the option off, the shown code, the evaluated code, the typing, the growth and every fixture SHALL be identical to the code without this change.

#### Scenario: Off by default

- **WHEN** a user opens the app for the first time and plays a Live coder song
- **THEN** no widget call appears in the code and the code text is the same as before this change

#### Scenario: Maximum of widgets

- **WHEN** the option is on with the maximum 2 and five tracks play
- **THEN** at most two widget calls are in the shown code at any time

### Requirement: The number of widgets varies

The maximum SHALL be a ceiling, not a fixed count. The number of widgets on screen SHALL vary over the song, chosen per section (or growth part) by the song seed from 1 to the maximum. The same song with the same settings SHALL always give the same widgets.

#### Scenario: The number varies

- **WHEN** a song with at least four sections and at least three tracks per section plays with the default maximum 3
- **THEN** the number of widgets on screen is not the same in every section, and never above 3

#### Scenario: Every profile

- **WHEN** the option is on and the same song plays in Classic, Crescendo and Live coder
- **THEN** each profile shows widgets on its lines, following the rules of that profile

### Requirement: Code widgets settings card

The Settings page SHALL have one card "Code widgets" with collapsible sections: general (option, maximum, slot order, secondary share, "Widget notes", pianoroll or punchcard), muted lines, widgets on or off, instruments (on or off, primary and secondary widgets), parameters and sizes. The settings SHALL be saved with the other settings and included in the backup, in English and Italian.

#### Scenario: Turning off a widget

- **WHEN** the user turns off `_scope` in the card
- **THEN** no new `_scope` call is written, and instruments whose primary widget is scope use their secondary widget

#### Scenario: Per-instrument switch

- **WHEN** the user turns off widgets for `hats`
- **THEN** no hats line gets a widget, and the slot goes to another track

#### Scenario: Backup

- **WHEN** the user exports a backup with changed widget settings and imports it in a fresh browser
- **THEN** the card shows the same settings

#### Scenario: Slot order

- **WHEN** the user moves `drums` to the top of the slot order, the maximum is 1 and bass and drums play
- **THEN** the widget goes to the drums line

#### Scenario: Default slot order

- **WHEN** the option is on with default settings and more tracks play than the target allows
- **THEN** slots go in the order bass, lead, drums, arp, hats, pad, then fx and voice

### Requirement: Secondary widgets for variety

A line SHALL usually get its instrument's primary widget, and with a share set in the card (default 25%) a secondary widget that is on, chosen by the song seed.

#### Scenario: Default share

- **WHEN** the option is on with default settings and the built-in songs are grown
- **THEN** about one widget in four is a secondary widget, and the rest are primary

#### Scenario: Share zero

- **WHEN** the user sets the share to 0%
- **THEN** every widget is its instrument's primary, or the first secondary that is on when the primary is off

### Requirement: Widgets on muted lines

A widget on a muted line (`_$:`) SHALL count toward the maximum. A muted line SHALL keep or get a widget only if it returns within N bars, where N is a setting with the values 8, 16, 32 and always, default 16. Until the line returns, its widget SHALL be drawn dimmed (grey, semi-transparent, with a dashed frame like the muted code lines) by app styling on the widget element, for every widget. A setting SHALL turn the dimmed look on or off, default on.

#### Scenario: Muted widget counts

- **WHEN** the maximum is 2, a muted bass line carries `._scope()` and a lead and drums play
- **THEN** only one of lead and drums has a widget

#### Scenario: Return within the window

- **WHEN** a track with a widget is muted and returns 12 bars later with the default window of 16 bars
- **THEN** the widget stays on its line during the silence

#### Scenario: Return beyond the window

- **WHEN** a track with a widget is muted for 24 bars with the default window of 16 bars
- **THEN** its widget is removed and its slot goes to another track

#### Scenario: Always

- **WHEN** the window is "always" and a track with a widget is muted for 64 bars
- **THEN** the widget stays on its line during the silence

#### Scenario: Dimmed look

- **WHEN** a muted line carries `._pianoroll()` with default settings
- **THEN** the widget is grey, semi-transparent and has a dashed frame until the line returns, and looks normal from the evaluation that unmutes it

#### Scenario: Dimmed look off

- **WHEN** the user turns the dimmed look off
- **THEN** a widget on a muted line looks as Strudel draws it

### Requirement: Widget notes

The card SHALL have a setting "Widget notes" (it: "Note dei widget") with the values "follow the volume" (it: "come il volume"), where note opacity follows the note's gain, and "always full" (it: "sempre piene"), where notes are drawn at full opacity. The setting SHALL change only the drawing, never the sound. Its default SHALL be chosen after measuring the real track volumes of the built-in songs and looking at screenshots of both values.

#### Scenario: Always full

- **WHEN** "Widget notes" is "always full" and a quiet pad line with gain 0.1 carries `._pianoroll()`
- **THEN** its notes are drawn at full opacity

#### Scenario: Same sound

- **WHEN** the same song plays with "follow the volume" and with "always full"
- **THEN** every hap has the same gain, orbit, analyze, postgain and velocity

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

#### Scenario: Text change without evaluation

- **WHEN** the app changes the text of one line while a song plays and does not evaluate
- **THEN** the widgets on every other line stay, instead of all being removed until the next evaluation

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

In Classic, where lines of past sections stay in the code, a widget SHALL sit only on the line of its track that plays now. At a section change it SHALL move to the track's new line, it SHALL be removed when the track is silent, and it SHALL stay on a muted line that returns within the return window of muted lines (N bars, default 16).

#### Scenario: Section change

- **WHEN** the bass moves from its verse line to its chorus line at a section change
- **THEN** the `._scope()` call leaves the verse line and is on the chorus line

#### Scenario: Short silence

- **WHEN** a track with a widget is muted and returns 4 bars later
- **THEN** the widget stays on its line during the silence

#### Scenario: Long silence

- **WHEN** a track with a widget is silent for 24 bars with the default window of 16 bars
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

The session video, the vertical fragments with code and the live output SHALL draw the widgets below their lines, in new "Code + widgets" scenes; existing scenes SHALL stay unchanged. Widgets on muted lines SHALL keep the dimmed look in every video when it is on.

#### Scenario: Session video

- **WHEN** a session video is recorded with a "Code + widgets" scene and the option on
- **THEN** the frames show the widgets below their lines

#### Scenario: Old scenes

- **WHEN** a session video is recorded with an existing code scene and the option on
- **THEN** the frames are the same as without the option

#### Scenario: Dimmed in the video

- **WHEN** a session video with a "Code + widgets" scene shows a widget on a muted line, with the dimmed look on
- **THEN** the frames show that widget grey, semi-transparent and with a dashed frame

### Requirement: Widgets in the fast video

The fast video SHALL redraw note widgets (`_pianoroll`, `_punchcard`, `_spiral`, `_pitchwheel`) from the haps of each line, and SHALL draw `_scope` and `_spectrum` from one extra offline render per track with a widget.

#### Scenario: Fast video scope

- **WHEN** a fast video is exported with two tracks carrying `_scope`
- **THEN** each scope draws the wave of its own track, from two extra renders

### Requirement: Fast video scope and spectrum setting

A video setting "Real scope and spectrum in the fast video" (it: "Scope e spectrum veri nel video veloce") SHALL have two values: "Automatic" (default), which falls back to the master waveform and spectrum for those widgets when the export would take more than twice as long as without the extra renders; and "Always real", which always uses the per-track renders, even if slower.

#### Scenario: Fallback

- **WHEN** the setting is "Automatic" and the extra renders would make the export more than twice as long
- **THEN** the scopes draw the master waveform, the export log says so, and the export finishes

#### Scenario: Always real

- **WHEN** the setting is "Always real" and the extra renders would make the export more than twice as long
- **THEN** each scope still draws the wave of its own track

### Requirement: Checks know the widgets

`check:strudel` SHALL accept the widget methods. Checks that evaluate code in Node SHALL install stub widget methods that return the pattern unchanged. `check:mixer` SHALL include a case with widgets on, with the same gain, orbit, analyze, postgain and velocity as without widgets.

#### Scenario: Node check with widgets

- **WHEN** `check:mixer` evaluates Live coder code with widget calls
- **THEN** evaluation does not fail and every hap has the values of the code without widgets
