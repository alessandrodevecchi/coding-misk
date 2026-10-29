## ADDED Requirements

### Requirement: Stage widgets drawn by the app

The app SHALL draw widget pictures (scope, pianoroll, punchcard, spectrum, spiral, pitchwheel) of the playing instruments on the stage canvas with its own painters, not with Strudel's widget functions. The same painters SHALL draw the code widgets in the fast video, and those pictures SHALL stay identical to the ones before this change.

#### Scenario: Same painters

- **WHEN** a fast video with code widgets is exported before and after this change with the same song and settings
- **THEN** the code widget pictures of every frame are identical

#### Scenario: No change to the sound

- **WHEN** a song plays with a widget look or the layer on
- **THEN** the evaluated code, the haps, the levels and the growth are the same as with the Palco look

### Requirement: Full-screen widget looks

The app SHALL offer two new looks, "Monitor" and "Rullo" (en: "Roll"), in every look menu: stage, radio look, video direction, fragments and live output. Monitor SHALL show one panel per chosen instrument (up to the Monitor limit, default 6), each with the instrument's name, its widget and a level bar, in a grid that follows the proportions of its box. Rullo SHALL show the notes of the melodic instruments on one pitch axis, each in its colour with a legend, and the drums as punchcard lanes.

#### Scenario: Monitor shows the playing instruments

- **WHEN** a section with bass, lead, kick, arp and hats plays on the Monitor look
- **THEN** five panels show, one per instrument, each with the widget of its instrument

#### Scenario: Monitor in a vertical fragment

- **WHEN** a 9:16 fragment uses the Monitor look with six panels
- **THEN** the panels are laid in two columns and three rows inside the stage box

#### Scenario: Rullo

- **WHEN** a song with lead, arp, bass and drums plays on the Rullo look
- **THEN** the melodic notes are drawn in their instrument's colour around a playhead and the kick, snare and hats appear as dots in their lanes

### Requirement: Layer over the other looks

The app SHALL offer a layer of widget panels over the other looks, with the values off, strip and Palco, default off. Strip SHALL draw up to the strip limit (default 3) small panels in a corner of the stage over the playing look. Palco SHALL draw up to 4 panels inside the Palco look's big screen, and behave as strip on the other looks. The layer SHALL NOT be drawn on the full-screen widget looks or on the soul.

#### Scenario: Off by default

- **WHEN** a user opens the app for the first time
- **THEN** every existing look is drawn as before this change

#### Scenario: Strip over a look

- **WHEN** the layer is "strip" and the Tramonto look plays a song with bass, lead and hats
- **THEN** three panels are drawn over the Tramonto look, in the stage, the session video and the live output

### Requirement: Instruments and widgets of the panels

By default the panels SHALL follow the code widgets card: slot order, instruments on, primary and secondary widgets, secondary share and "Widget notes", whether or not the code widgets option is on. An "own" setting SHALL give the stage its own instruments section. The panels SHALL change only at section boundaries, and the choice SHALL depend only on the song, the seed and the settings.

#### Scenario: Same mapping as the code

- **WHEN** the code widgets card maps the bass to scope and the stage uses "same as code widgets"
- **THEN** the bass panel on the stage is a scope

#### Scenario: Stable in a section

- **WHEN** a section plays for 16 bars on the Monitor look
- **THEN** the set of panels and their places do not change before the next section

### Requirement: Per-track reaction

Each panel SHALL belong to one instrument. Its border SHALL glow with the instrument's level and flash on its onsets. A panel whose instrument is silent SHALL be dimmed (grey, see-through, dashed border) while the instrument returns within the code widgets' return window, and SHALL leave at the next section boundary after it. A setting SHALL hide silent panels instead.

#### Scenario: A silent instrument

- **WHEN** the pad stops for 8 bars and returns, with the return window at 16 bars
- **THEN** the pad panel is dimmed during the 8 bars and normal again when the pad returns

### Requirement: Colours

Full-screen widget looks SHALL take their colours from the app theme (neon, hardware), one colour per instrument. The layer SHALL take its colours from the playing look's palette. A setting SHALL choose automatic (default), app theme or scene colours.

#### Scenario: Theme change

- **WHEN** the theme changes from neon to hardware on the Monitor look
- **THEN** the panels use the hardware colours from the next frame

### Requirement: Same frame everywhere

A frame of a widget look or of the layer SHALL depend only on the song time, the levels, the notes and the waves of the feed, never on wall time or random numbers. The stage, the session video, the live output, the fragments and the fast video SHALL draw the same panels at the same time.

#### Scenario: Same frame twice

- **WHEN** the same frame time is drawn twice from the same feed, alone and inside a sequence
- **THEN** both pictures are identical

### Requirement: Stage widgets in the fast video

In the fast video, notes per instrument SHALL come from the render page. Scope and spectrum SHALL use the per-instrument renders under the video setting "Real scope and spectrum in the fast video", and fall back to the whole song's wave scaled by the instrument's level, saying so in the export log.

#### Scenario: Fast video fallback

- **WHEN** a fast video with the Monitor look falls back on scope and spectrum
- **THEN** the export log says that the stage scopes use the song's wave

### Requirement: Stage widgets settings card

The Settings page SHALL have a card "Stage widgets" (it: "Widget sul palco") with the layer, the panel limits, instruments and widgets (same as code widgets or own), colours, silent instruments, each widget kind on or off (spiral and pitchwheel off by default), saved, in the backup and reset to defaults, in English and Italian, with a Guide card.

#### Scenario: Backup

- **WHEN** the user changes the strip limit to 2 and exports then imports a backup
- **THEN** the strip limit is 2

### Requirement: Performance budget

The layer SHALL cost at most 1.5 ms per frame for 3 panels (2 ms for the Palco screen), and each full-screen widget look at most 4 ms per frame, measured by the browser check. Notes SHALL be queried at most once per cycle per instrument. The fast video with a widget look SHALL take at most 10% longer than with the Palco look, without renders beyond the code widgets' ones.

#### Scenario: Frame time

- **WHEN** the browser check plays a song for 30 seconds on the Monitor look
- **THEN** the median drawing time of a frame is at most 4 ms
