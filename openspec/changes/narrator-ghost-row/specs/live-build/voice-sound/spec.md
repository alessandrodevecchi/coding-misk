## ADDED Requirements

### Requirement: Narrator block with the Live build off

When the Live build is off and the song has no steps of its own, the narrator cannot speak. The Voice: narrator block in the Voices group of Compose SHALL then show a short note that says so, with the same meaning as the tooltip of its On switch, and SHALL fold its Sound and Narrator lines parts. Turning the Live build on SHALL bring back the open or closed state the user left them in; opening or closing them while the Live build is off SHALL NOT change that state. The On switch and the Narrator style row SHALL stay as they are (disabled, with the tooltip).

#### Scenario: Note

- **WHEN** a song without its own steps is open in Compose with In divenire off
- **THEN** the narrator block says "Questo brano non ha il narratore: accendi In divenire per sentirlo." (English: "This song has no narrator: turn on the Live build to hear it.")

#### Scenario: Live build turned off

- **WHEN** the user has opened Sound and Narrator lines and turns the Live build off
- **THEN** both parts fold, and the note shows

#### Scenario: Live build turned on again

- **WHEN** the user turns the Live build on again
- **THEN** Sound and Narrator lines are open again, as the user left them, and the note is gone

#### Scenario: Song opened with the Live build off

- **WHEN** a song opens with the Live build off
- **THEN** Sound and Narrator lines are folded and the note shows
