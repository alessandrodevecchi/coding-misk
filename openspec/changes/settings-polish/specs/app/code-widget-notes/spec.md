## ADDED Requirements

### Requirement: Widget notes full by default

The "Widget notes" option of the code widgets (it: "Note dei widget") SHALL default to "Always full" (it: "Sempre piene"). "Reset to defaults" in the code widgets card SHALL set it to "Always full". The stage panels that use the code widgets' mapping SHALL follow the same value. The sound SHALL NOT change.

#### Scenario: New install

- **WHEN** a user opens the app for the first time and a song plays with code widgets on
- **THEN** the pianoroll draws every note at full opacity, quiet notes included

#### Scenario: Reset

- **WHEN** the user presses "Reset to defaults" in the code widgets card
- **THEN** "Widget notes" is "Always full"

### Requirement: Old default moved once

Stored code widget settings written before this change hold "Follow the volume" even when the user never chose it. The app SHALL move a stored "Follow the volume" to "Always full" once, the first time it reads settings written before this change, and SHALL keep the user's choice from then on.

#### Scenario: Stored old default

- **WHEN** a browser holds code widget settings saved before this change with "Follow the volume"
- **THEN** after the update "Widget notes" shows "Always full"

#### Scenario: Choice after the update

- **WHEN** after the update the user sets "Widget notes" to "Follow the volume" and reloads the page
- **THEN** "Widget notes" stays "Follow the volume"
