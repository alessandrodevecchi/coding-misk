## ADDED Requirements

### Requirement: Code theme setting

The app SHALL offer a code theme setting in the Settings "Appearance" card, "Code theme" (it: "Tema del codice"), with the values Automatic (default), the app's own code themes (Neon, Amber, Terminal, High contrast dark, Light high contrast) and a curated group of Strudel's built-in themes shown under their Strudel names. The setting SHALL be saved, included in the backup and cleared by the settings reset.

#### Scenario: Default

- **WHEN** a user who never chose a code theme opens the app in the neon theme
- **THEN** the code panel shows the Neon code theme and the setting reads Automatic

#### Scenario: A chosen theme survives a reload

- **WHEN** the user picks Terminal and reloads the page
- **THEN** the code panel shows Terminal from the first paint of the code

#### Scenario: Backup

- **WHEN** a backup made with Light high contrast is imported on a fresh browser
- **THEN** the code panel shows Light high contrast

### Requirement: Automatic follows the app theme

With Automatic, the code theme SHALL follow the app theme: neon gives Neon, hardware gives Amber. The Settings card SHALL say which theme Automatic is using. A chosen theme SHALL NOT change when the app theme changes.

#### Scenario: Switch to hardware

- **WHEN** the code theme is Automatic and the user switches the app theme from NEON to HW
- **THEN** the code panel shows Amber, without reloading the page

#### Scenario: Chosen theme kept

- **WHEN** the code theme is High contrast dark and the user switches to HW
- **THEN** the code panel stays High contrast dark

### Requirement: Neon follows the look

The Neon code theme SHALL take its colours from the current look's tokens (ground, ink, accent, second accent, muted), and SHALL change when the look changes.

#### Scenario: Another look

- **WHEN** the Neon code theme is on and the look changes from Palco to Sonar
- **THEN** labels and strings in the code take Sonar's accent colours

### Requirement: Readable contrast

Every text role of the app's own code themes (text, comment, string, number, label, variable, method, punctuation) SHALL reach a contrast of at least 4.5:1 against the theme's ground, and at least 7:1 in High contrast dark and Light high contrast. For Neon this SHALL hold on every look. A Strudel theme SHALL be offered only if its text and comment reach 4.5:1, except Strudel's default theme (`strudelTheme`), kept as the panel's look of before.

#### Scenario: Theme data check

- **WHEN** the theme data check runs
- **THEN** it reports the contrast of every role of every theme (Neon on every look) and fails under the limits

### Requirement: Code font and size

The app SHALL offer "Code font" (JetBrains Mono by default, Share Tech Mono, VT323, system monospace) and "Code size" (Small, Medium by default, Large) and SHALL apply them to the editor, so that the browser's generic monospace at 18 px is no longer used. The full view of the code SHALL use one size step larger. A font or size change SHALL recompute the width of the panel in characters used for the line breaks of a live build.

#### Scenario: Default font

- **WHEN** a user who never chose a font opens Compose
- **THEN** the code is in JetBrains Mono at the Medium size

### Requirement: Everything in the panel follows the theme

The code widgets, the dimmed widget of a muted `_$:` line, the outline of the playing notes, the evaluation flash, the caret, the selection, the line numbers and the panel's ground SHALL take their colours from the code theme.

#### Scenario: Widgets on a light theme

- **WHEN** the code theme is Light high contrast and a muted line has a pianoroll widget
- **THEN** the widget is drawn in the theme's widget colours, dimmed, and readable on the white ground

#### Scenario: Flash on a light theme

- **WHEN** the user evaluates the code with Light high contrast
- **THEN** the evaluation flash is visible on the white ground

### Requirement: Muted lines dimmed

The app SHALL offer "Dim muted lines" (it: "Attenua le righe mute") in the Settings "Appearance" card, on by default. When it is on, the text of a muted `_$:` line and of its continuation lines SHALL be drawn at about 55 % opacity in the code panel and in the code drawn in videos. When it is off, the text SHALL keep the theme's colours. The option SHALL be saved, in the backup and cleared by the settings reset.

#### Scenario: Default

- **WHEN** a user who never changed the option sees a song with a `_$:` line
- **THEN** the text of that line is dimmed in the code panel

#### Scenario: Off

- **WHEN** the user turns "Dim muted lines" off
- **THEN** the text of the `_$:` line has the theme's colours, in the panel and in a video

### Requirement: Automatic leaves room for a light app theme

The Automatic mapping SHALL be keyed by the app theme's `data-ui` value and SHALL already map a light app theme (`light`) to Light high contrast, so that a light app theme needs no change to the code themes.

#### Scenario: Light app theme

- **WHEN** the code theme is Automatic and the app theme's `data-ui` becomes `light`
- **THEN** the code panel shows Light high contrast

### Requirement: Installing a theme never breaks the editor

If a code theme cannot be installed on the editor, the panel SHALL keep Strudel's default theme, the code SHALL keep playing, and the app SHALL log one warning naming the theme.

#### Scenario: Install fails

- **WHEN** the installer cannot find the editor's theme compartment
- **THEN** the code shows in Strudel's default theme, evaluation works, and the console has one warning

### Requirement: Code in videos

The code panel drawn in session videos, the fast video, fragments and the live output SHALL use the code theme's roles and font by default ("Code colours: same as the panel"), with "app theme" as the other choice in the video settings. A fast video or a fragment SHALL read the code theme once when it starts and use it until it ends.

#### Scenario: Video with the panel's theme

- **WHEN** a session video with the code layout is recorded with the Amber code theme
- **THEN** the code area of the video has Amber's ground, text and token colours

#### Scenario: Theme changed during a fast video

- **WHEN** the user changes the code theme while a fast video renders
- **THEN** the whole video keeps the theme it started with

### Requirement: Sound and code text unchanged

Choosing a code theme, font or size SHALL NOT change the sound, the growth, the fixtures or the code text, apart from the line breaks of a live build, which follow the panel width in characters.

#### Scenario: Same events

- **WHEN** the same song is played with two different code themes and the same font and size
- **THEN** the code text and the events are the same
