## ADDED Requirements

### Requirement: Three forms of lit notes

The code theme settings SHALL offer "Lit notes" (it: "Note accese") with three values: Outline (default), Filled and Underlined (it: "Sottolineate"). Underlined SHALL draw a line under each playing token in the code theme's accent colour, with no frame and no fill, and the text SHALL keep its own colour. The choice SHALL be saved, included in the backup and reset by "Reset to defaults".

#### Scenario: Underlined in the editor

- **WHEN** the user sets "Lit notes" to Underlined and a song plays
- **THEN** each playing token in the editor has a line under it in the code theme's accent colour, and no frame or fill

### Requirement: Same form everywhere

The chosen lit form SHALL apply to the editor, to every video code layout (session video, fast video, fragments, live output) and to "Code over" on the page and in videos.

#### Scenario: Underlined in Code over and videos

- **WHEN** "Lit notes" is Underlined and the user records a fast video with the "Code over" layout
- **THEN** the playing tokens in the video are underlined in the same colour as in the editor, at the same tokens

#### Scenario: Default unchanged

- **WHEN** a user who never changed "Lit notes" opens the app after this change
- **THEN** the playing tokens are framed (Outline), as before

#### Scenario: Backup

- **WHEN** the user picks Underlined, exports a backup, resets to defaults and imports the backup
- **THEN** "Lit notes" is Underlined again

### Requirement: Underline readable on every theme

The underline SHALL be visible on every code theme in both app themes: its colour SHALL keep a contrast of at least 3:1 against the code panel's background, and against the band colour in "Code over". When the theme's accent colour falls below that contrast, the app SHALL use the theme's text colour for the underline instead.

#### Scenario: Low-contrast accent

- **WHEN** a code theme's accent colour has less than 3:1 contrast against its background
- **THEN** the underline uses the theme's text colour, and the code themes check reports which themes use the fallback
