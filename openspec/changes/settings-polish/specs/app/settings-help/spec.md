## ADDED Requirements

### Requirement: Every Settings control has a help text

Every control on the Settings page SHALL have a help text in English and Italian that says what the control changes, where it applies and, when it is not obvious, what the default does. The text SHALL show as the hint line under the control and as a tooltip on the control's label. A control whose label alone is enough (Language, Volume) MAY have a tooltip only. Help texts SHALL be at most two short sentences; a longer explanation SHALL go to the Guide.

#### Scenario: Hit grid variants

- **WHEN** the user hovers the label "Variants apart" in Settings → Code widgets → App widgets
- **THEN** a tooltip says that each variant of a drum sound (for example two different hi-hats) gets a row of its own, and that with No they share one row

#### Scenario: Both languages

- **WHEN** the interface is Italian and the user opens Settings
- **THEN** every help text and tooltip is in Italian

#### Scenario: Checked

- **WHEN** the Settings check runs
- **THEN** it fails if a Settings control has no help text in one of the two languages

### Requirement: Names in the interface language

Settings SHALL name visuals and modes with their name in the interface language. In English the "Palco" visual SHALL be called "Stage" in every label and help text of the stage widgets card.

#### Scenario: English stage widgets card

- **WHEN** the interface is English and the user opens Settings → Stage widgets
- **THEN** the "Over the scene" choices read Off, Strip and Stage, and no label or hint contains the word "Palco"

### Requirement: Video export tooltip says how the video renders

The tooltip of the audio/video switch of the radio export SHALL say that a video renders faster than real time with the fast export speed, and plays in real time only with the real-time speed, the whole-tab layout or the live radio.

#### Scenario: Fast speed

- **WHEN** the export speed is Fast and the user hovers the audio/video switch
- **THEN** the tooltip does not say that video runs in real time
