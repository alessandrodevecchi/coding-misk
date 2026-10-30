## ADDED Requirements

### Requirement: App widgets in the code

The app SHALL offer its own code widgets next to Strudel's inline widgets, written in the code as method calls at the end of a pattern line (`._rhythm()`, `._chroma()`), with parameters as an options object in the call. A new app widget SHALL be added by registering one painter and its parameters.

#### Scenario: Written like the other widgets

- **WHEN** the "Code widgets" option is on and a song with drums and a pad plays
- **THEN** the last drum line ends with `._rhythm()` and the pad line ends with `._chroma()`, and the editor draws each widget below its line

### Requirement: Widgets drawn from haps everywhere

Each app widget SHALL be drawn from the haps of the evaluated code, never from audio, so the same song, settings and cycle always give the same picture. One painter SHALL draw it in the editor, in "Code over", in every video code layout, in fragments and in the live output.

#### Scenario: Same picture in the fast video

- **WHEN** a song is exported as a fast video and recorded in real time
- **THEN** the rhythm grid and the chroma at the same cycle draw the same cells and characters

#### Scenario: Code copied elsewhere

- **WHEN** the user copies the code, saves it as a pattern or exports it for another Strudel
- **THEN** the copied code has no app widget calls, so it evaluates in a Strudel that does not know them

### Requirement: Rhythm grid

The rhythm grid (it: "Griglia ritmo") SHALL show one row per drum sound of the song, the beats numbered on top, the steps of the bar split in beats, the current step marked, played hits lit, coming hits dimmer, and below `battuta N · passo S/T` (`bar N · step S/T`). Rows SHALL keep a stable order (kick, snare, clap, rim, hats, open hats, toms, cymbals, other) and SHALL not vanish while a sound pauses.

#### Scenario: Steps and current step

- **WHEN** a song at 4/4 plays bar 13 at its last sixteenth
- **THEN** the grid has 16 steps in 4 beats, the 16th column is marked, and the text reads `battuta 13 · passo 16/16`

#### Scenario: Hits from the code

- **WHEN** the kick line is `s("bd*4")`
- **THEN** the `bd` row has hits on steps 1, 5, 9 and 13 and no other

### Requirement: ASCII chroma

The ASCII chroma (it: "Croma ASCII") SHALL show 12 rows, one per pitch class, over a time window with the present at the right edge. Each cell SHALL be a character of a ramp (default ` .:-=+*#%@`) chosen by that pitch class's energy in the slice, from the haps' level and length, with a short decay after a note ends.

#### Scenario: Silent row

- **WHEN** no note of the pitch class C# sounds in the window
- **THEN** the C# row is all spaces

### Requirement: Chord in the chroma

The pitch classes of the current chord SHALL have their labels inverted, and the chord name SHALL be written below the chroma (`accordo Am` / `chord Am`), recognised from the notes sounding in the last beat; with no chord, a dash.

#### Scenario: Chord name

- **WHEN** the pad plays `[a2,c3,e3]` on the current beat
- **THEN** the labels A, C and E are inverted and the text below reads `accordo Am`

#### Scenario: Ramp

- **WHEN** a note sounds at full level for a whole slice
- **THEN** its cell is the last character of the ramp, and a slice with no note on that row is a space

### Requirement: Widget parameters

Each app widget SHALL accept parameters in its call, merged over defaults from Settings, as the `#79` widgets merge hidden groups. Colours SHALL always come from the code theme. Unknown parameters SHALL be ignored.

#### Scenario: Parameter in the line

- **WHEN** a line ends with `._rhythm({ steps: 8 })`
- **THEN** that grid has 8 steps per bar and every other default stays

### Requirement: Rhythm grid parameters

The rhythm grid SHALL accept `steps` (per bar, default 16; 12 in ternary meters), `bars` (default 1), `rows` (list and order, default automatic), `names` (`short` or `long`, default short), `extra` (melodic rows, default none), `style` (`blocks` or `text`, default automatic), `trail` (default 2) and `size` (default 1).

#### Scenario: Extra row

- **WHEN** a line ends with `._rhythm({ extra: ["bass"] })`
- **THEN** the grid has a `bass` row under the drum rows with the bass line's onsets

### Requirement: Chroma parameters

The chroma SHALL accept `from` (sources, default every melodic instrument), `cols` (default 40), `bars` (default 2), `ramp` (default ` .:-=+*#%@`), `order` (`high` or `low`, default high), `norm` (`column` or `window`, default column), `decay` (cycles, default 0.25), `labels` and `chord` (default on), `names` (`auto`, `sharp`, `flat`) and `size` (default 1).

#### Scenario: Default from Settings

- **WHEN** the user sets the chroma ramp to ` ░▒▓█` in Settings and the line ends with `._chroma()`
- **THEN** the chroma draws with ` ░▒▓█`, and the shown code has no parameter

### Requirement: Settings for app widgets

The "Code widgets" settings card SHALL have a section "App widgets" (it: "Widget dell'app") with each widget on or off, its parameters with their defaults, a live preview of each widget in the current code theme, and "Default values". The rhythm grid SHALL be the drums' primary widget and the chroma the pad's primary widget by default, and both SHALL count toward the maximum number of widgets. The settings SHALL be saved and included in the backup.

#### Scenario: Preview

- **WHEN** the user changes the grid's steps from 16 to 8 in Settings
- **THEN** the preview grid redraws with 8 steps at once, and the playing song's grids follow after the next code change

### Requirement: Widgets in every render style

The app widgets SHALL be drawn after the render pass and SHALL keep the code theme colours. With style automatic, they SHALL use blocks in Normal and CRT, round cells in LED, two tones of the code theme in 1-bit, and characters (`█ ▒ ·` for the grid, the ramp for the chroma) in ASCII and Terminal, on the same cell grid as the text.

#### Scenario: Terminal

- **WHEN** the render style is Terminal
- **THEN** the grid is drawn with characters, aligned with the code's character cells

#### Scenario: Render never touches the widgets

- **WHEN** the render style is 1-bit
- **THEN** the widget pixels are not dithered by the render pass
