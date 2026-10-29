## ADDED Requirements

### Requirement: Light app theme

The app SHALL offer a third app theme, LIGHT (it: CHIARO), next to NEON and HW, in the top bar and in the Settings "Appearance" card. LIGHT SHALL be a light variant of neon: the same layout and fonts with a light ground, dark text and light-theme accents for each look. The choice SHALL be saved, included in the backup and cleared by the settings reset.

#### Scenario: Switch to light

- **WHEN** the user presses LIGHT in the top bar
- **THEN** the page turns light without a reload, and the choice is kept after a reload

#### Scenario: Native controls

- **WHEN** LIGHT is on and the user opens a select menu
- **THEN** the menu and the scrollbars are drawn in the light colour scheme

### Requirement: Contrast in light

In LIGHT, body text SHALL reach at least 7:1 against its background, and muted text and accent text at least 4.5:1, on every look.

#### Scenario: Contrast check

- **WHEN** the contrast check runs on the light tokens of every look
- **THEN** it reports each pair and fails under the limits

### Requirement: Stage stays dark

In LIGHT, the stage SHALL keep its dark ground and the looks SHALL draw exactly as in neon. The text and controls drawn over the stage SHALL keep dark-stage colours.

#### Scenario: Stage overlay readable

- **WHEN** LIGHT is on and a song plays
- **THEN** the tempo line and the look menu over the stage are light text on the dark stage

### Requirement: No dark-only colours in light

Shared components SHALL NOT keep fixed colours that assume a dark ground in LIGHT: chips, overlays, shadows, dimmed controls and canvases outside the stage SHALL take light-theme colours, except parts that imitate a device screen, which keep a dark inner screen.

#### Scenario: Profile chips

- **WHEN** LIGHT is on and the user looks at the profile chips in Compose
- **THEN** the chips have a light fill and dark readable text

### Requirement: Hardware stays dark

HW SHALL look the same as before this change. LIGHT and HW SHALL be separate choices.

#### Scenario: HW unchanged

- **WHEN** the user switches from LIGHT to HW
- **THEN** every screen of HW is identical to HW before this change

### Requirement: Code and videos in light

With the code theme on Automatic, LIGHT SHALL show the code in Light high contrast. Videos, fragments and the live output SHALL NOT change with the app theme.

#### Scenario: Video recorded in light

- **WHEN** a session video is recorded while LIGHT is on, with the code theme on Automatic and the video's code colours on "same as the panel"
- **THEN** the stage area is identical to neon and the code area uses Light high contrast
