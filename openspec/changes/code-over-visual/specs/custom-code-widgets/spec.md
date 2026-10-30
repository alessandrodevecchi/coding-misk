## ADDED Requirements

### Requirement: App widgets in the code

The app SHALL offer its own code widgets next to Strudel's inline widgets, written in the code as method calls at the end of a pattern line (`._hitgrid()`, `._tonecloud()`), with parameters as an options object in the call. The names SHALL be the app's own, different from the names the reference project uses. A new app widget SHALL be added by registering one painter and its parameters.

#### Scenario: Written like the other widgets

- **WHEN** the "Code widgets" option is on and a song with drums and a pad plays
- **THEN** the first drum line playing ends with `._hitgrid()` and the pad line ends with `._tonecloud()`, and the editor draws each widget below its line

### Requirement: Widgets drawn from haps everywhere

Each app widget SHALL be drawn from the haps of the evaluated code, never from audio, so the same song, settings and cycle always give the same picture. One painter SHALL draw it in the editor, in "Code over", in every video code layout, in fragments and in the live output.

#### Scenario: Same picture in the fast video

- **WHEN** a song is exported as a fast video and recorded in real time
- **THEN** the hit grid and the tone cloud at the same cycle draw the same cells and characters

### Requirement: Code leaving the app

When the code leaves the app (copy, Save as pattern, export for another Strudel), each app widget call SHALL stay in place commented out as a block comment (`/* ._hitgrid() */`), so the code evaluates in a Strudel that does not know the widgets and the widget can be turned back on by removing the comment marks.

#### Scenario: Code copied elsewhere

- **WHEN** the user copies the line `$: s("bd*4")._hitgrid({ steps: 8 })`
- **THEN** the copied text is `$: s("bd*4")/* ._hitgrid({ steps: 8 }) */`, and it evaluates in a plain Strudel with the same haps as `$: s("bd*4")`

#### Scenario: A call on a line of its own

- **WHEN** the call is on a continuation line of its own (`  ._tonecloud()`)
- **THEN** the copied line is `  /* ._tonecloud() */`, and the chain above and below it still evaluates

### Requirement: Hit grid

The hit grid (it: "Griglia colpi") SHALL show the beats numbered on top, the steps of the bar split in beats, the current step marked, played hits lit, coming hits dimmer, and below `battuta N · passo S/T` (`bar N · step S/T`).

#### Scenario: Steps and current step

- **WHEN** a song at 4/4 plays bar 13 at its last sixteenth
- **THEN** the grid has 16 steps in 4 beats, the 16th column is marked, and the text reads `battuta 13 · passo 16/16`

#### Scenario: Hits from the code

- **WHEN** the kick line is `s("bd*4")`
- **THEN** the `bd` row has hits on steps 1, 5, 9 and 13 and no other

### Requirement: Hit grid rows

The hit grid SHALL show one row per drum sound and variant of the song (`hh` and `hh:3` apart) and the bass's rhythm in a row of its own by default. Rows SHALL keep a stable order (kick, snare, clap, rim, hats, open hats, toms, cymbals, other, then the extra rows) and SHALL not vanish while a sound pauses.

#### Scenario: Variants apart

- **WHEN** the hats line is `s("hh*8").n("<0 3>")` and both variants have played
- **THEN** the grid has a row `hh` and a row `hh:3`

### Requirement: Tone cloud

The tone cloud (it: "Nuvola di note") SHALL show 12 rows, one per pitch class, over a time window with the present at the right edge. Each cell SHALL be a character of a ramp (default ` .:-=+*#%@`) chosen by that pitch class's energy in the slice, from the haps' level and length, with a decay after a note ends. Each note SHALL also spread a smaller energy to its neighbouring pitch classes and to its overtones, so the picture reads as a dense cloud rather than thin lines.

#### Scenario: Silent row

- **WHEN** no note sounds in the window
- **THEN** every row is all spaces

#### Scenario: Cloud around a note

- **WHEN** only the note A sounds for the whole window
- **THEN** the A row is the densest, and the rows of its neighbours and of its fifth (E) carry lighter characters

### Requirement: Chord in the tone cloud

The pitch classes of the current chord SHALL have their labels inverted, and the chord name SHALL be written below the cloud (`accordo Am` / `chord Am`), recognised from the notes sounding in the last beat; with no chord, a dash.

#### Scenario: Chord name

- **WHEN** the pad plays `[a2,c3,e3]` on the current beat
- **THEN** the labels A, C and E are inverted and the text below reads `accordo Am`

#### Scenario: Ramp

- **WHEN** a note sounds at full level for a whole slice
- **THEN** its cell is the last character of the ramp

### Requirement: Widget parameters

Each app widget SHALL accept parameters in its call, merged over defaults from Settings, as the `#79` widgets merge hidden groups. Colours SHALL always come from the code theme. Unknown parameters SHALL be ignored.

#### Scenario: Parameter in the line

- **WHEN** a line ends with `._hitgrid({ steps: 8 })`
- **THEN** that grid has 8 steps per bar and every other default stays

### Requirement: Hit grid parameters

The hit grid SHALL accept `steps` (per bar, default 16; 12 in ternary meters), `bars` (default 1), `rows` (list and order, default automatic), `names` (`short` or `long`, default short), `variants` (default on: sound variants in rows of their own), `extra` (melodic rows, default the bass), `style` (`blocks` or `text`, default automatic), `trail` (default 2) and `size` (default 1).

#### Scenario: Extra row

- **WHEN** a line ends with `._hitgrid({ extra: ["arp"] })`
- **THEN** the grid has an `arp` row under the drum rows with the arp line's onsets

### Requirement: Tone cloud parameters

The tone cloud SHALL accept `from` (sources, default every melodic instrument), `cols` (default 48), `bars` (default 3), `ramp` (default ` .:-=+*#%@`), `order` (`high` or `low`, default high), `norm` (`column` or `window`, default column), `decay` (cycles, default 0.6), `spread` (0 to 1, default 0.5), `labels` and `chord` (default on), `names` (`auto`, `sharp`, `flat`) and `size` (default 1.25).

#### Scenario: Default from Settings

- **WHEN** the user sets the ramp to ` ░▒▓█` in Settings and the line ends with `._tonecloud()`
- **THEN** the cloud draws with ` ░▒▓█`, and the shown code has no parameter

### Requirement: Settings for app widgets

The "Code widgets" settings card SHALL have a section "App widgets" (it: "Widget dell'app") with each widget on or off, its parameters with their defaults, a live preview of each widget in the current code theme, and "Default values". The settings SHALL be saved and included in the backup.

#### Scenario: Preview

- **WHEN** the user changes the grid's steps from 16 to 8 in Settings
- **THEN** the preview grid redraws with 8 steps at once, and the playing song's grids follow after the next code change

### Requirement: Default places of the app widgets

The hit grid SHALL be the drums' primary widget, the tone cloud the pad's and the voice's primary widget and a secondary of bass, lead, arp and guitar by default, and both SHALL count toward the maximum number of widgets.

#### Scenario: Pad and drums

- **WHEN** "Code widgets" is on with the default settings and a section has drums and a pad
- **THEN** the hit grid is on the first drum line playing and the tone cloud on the pad line

### Requirement: Widgets in every render style

The app widgets SHALL be drawn after the render pass and SHALL keep the code theme colours. With style automatic, they SHALL use blocks in Normal and CRT, round cells in LED, two tones of the code theme in 1-bit, and characters (`█ ▒ ·` for the grid, the ramp for the tone cloud) in ASCII and Terminal, on the same cell grid as the text.

#### Scenario: Terminal

- **WHEN** the render style is Terminal
- **THEN** the grid is drawn with characters, aligned with the code's character cells

#### Scenario: Render never touches the widgets

- **WHEN** the render style is 1-bit
- **THEN** the widget pixels are not dithered by the render pass
