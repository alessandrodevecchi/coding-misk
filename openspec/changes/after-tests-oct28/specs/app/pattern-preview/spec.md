## ADDED Requirements

### Requirement: One pattern row in the track panel
The Compose track panel SHALL show one pattern row titled "Pattern disponibili nel brano" ("Patterns in this song"), with the hint "Modifica e ascolta i pattern inclusi in questo brano" ("Edit and listen to the patterns in this song"). The row SHALL hold Niente first, every pattern of the track, + Nuovo and Elimina. Clicking a pattern chip SHALL choose it for editing and preview only. The row SHALL be the same in Sections and in Free timeline.

#### Scenario: Italian labels
- **WHEN** the interface is in Italian and the user opens the Bass track of Luci Rosse in Compose
- **THEN** one row reads "Pattern disponibili nel brano" with Niente, A, B, C, + Nuovo and Elimina, and its hint reads "Modifica e ascolta i pattern inclusi in questo brano"

#### Scenario: English labels
- **WHEN** the interface is in English
- **THEN** the row reads "Patterns in this song" with the hint "Edit and listen to the patterns in this song"

#### Scenario: Choosing a chip
- **WHEN** section Scontro plays B and the user clicks C in the row
- **THEN** C is chosen for editing and preview, and Scontro still plays B

### Requirement: Make row below the pattern row
Save as pattern, Compose a part with its number, Energy, Keep rhythm and Keep notes SHALL stay below the pattern row, in a row titled "Crea" ("Make").

#### Scenario: Make row
- **WHEN** the interface is in Italian and the user opens a track in Compose
- **THEN** the row under the pattern row reads "Crea" with Salva come pattern, Componi una parte and Energia

### Requirement: Marks on the pattern chips
Each pattern chip SHALL show where the pattern is used. A filled cyan badge "NEL BRANO" ("IN THE SONG") SHALL mark the pattern of the chosen section, or of the chosen clip in Free timeline. A hollow circle SHALL mark a pattern used in other sections or clips. A pattern used nowhere SHALL have no mark. Headphones SHALL mark the pattern in preview. A pink border SHALL mark the pattern being edited. A legend under the row SHALL explain the marks in both languages.

#### Scenario: Pattern in the chosen section
- **WHEN** section Scontro is chosen and plays B, and A and C play in other sections
- **THEN** B shows the "NEL BRANO" badge, and A and C show a hollow circle

#### Scenario: Preview of a new pattern
- **WHEN** the user presses + Nuovo, which makes D, and starts the preview
- **THEN** D has a pink border and the headphones, and no badge or circle

### Requirement: No section or clip chosen
When the whole track is selected, with no section and no clip chosen, the pattern row SHALL show no "NEL BRANO" badge and SHALL say how to choose a section or a clip.

#### Scenario: Free timeline with no clip
- **WHEN** the arrangement is in Free timeline and no clip is chosen
- **THEN** the row says to click a clip in the timeline or choose a section, and the hollow circles still show the patterns in use

### Requirement: Status line and Use in section
Under the pattern row, a status line SHALL say which pattern is edited and which pattern the song plays in the chosen section or clip. When the edited pattern is not the one in the chosen section or clip, the status line SHALL offer "Usa D in «sezione»" ("Use D in «section»"), with the name of the section or clip. A click SHALL put the pattern there, with Undo in the notice.

#### Scenario: Use D in Scontro
- **WHEN** the user edits D, used nowhere, while Scontro plays B, and presses "Usa D in «Scontro»"
- **THEN** Scontro plays D, the badge moves to D, and the notice offers Undo

### Requirement: Editing stays live
Edits to a pattern SHALL apply wherever the pattern is used, from the next bar, with no Save button.

#### Scenario: Editing a pattern in the song
- **WHEN** the song plays and the user changes a step of B, used in Scontro and Fine
- **THEN** both sections play the changed B from the next bar

### Requirement: Try on a copy
When the edited pattern is used in the song, the status line SHALL offer "Prova su una copia" ("Try on a copy"). It SHALL copy the pattern to the next free letter, used nowhere, and switch editing to the copy. With the copy edited, the status line SHALL offer "Usa D in «sezione»" and "Sostituisci B con D" ("Replace B with D"). Replace SHALL make every section and clip that uses B use D, keep B in the list used nowhere, and offer Undo.

#### Scenario: A copy of B
- **WHEN** B plays in Scontro and the user presses "Prova su una copia"
- **THEN** D appears as a copy of B with no mark, editing moves to D, and the song still plays B

#### Scenario: Replace B with D
- **WHEN** B plays in Scontro and Fine and the user presses "Sostituisci B con D"
- **THEN** Scontro and Fine play D, and B stays in the row with no mark

### Requirement: Restore a pattern
Once a pattern has changed since the user chose it for editing, the status line SHALL offer "Ripristina B" ("Restore B"). It SHALL bring the pattern back to how it was when editing started, an undo per pattern, and the song SHALL play the restored pattern from the next bar.

#### Scenario: Restore B
- **WHEN** the user chooses B, changes three steps and presses "Ripristina B"
- **THEN** B is as it was before the three changes, wherever it is used

### Requirement: Delete only unused patterns
Elimina SHALL be disabled on a pattern used in any section or clip, with a tooltip that says it is in use. It SHALL be enabled on a pattern used nowhere.

#### Scenario: Pattern in use
- **WHEN** the user edits B, which plays in Scontro
- **THEN** Elimina is disabled

#### Scenario: Unused copy
- **WHEN** the user edits D, used nowhere
- **THEN** Elimina is enabled and removes D

### Requirement: Preview under the song pattern
While the song plays, the track SHALL keep playing its song pattern under the preview, as before this change. The pattern row SHALL NOT mute the track.

#### Scenario: Preview of D while B plays
- **WHEN** the song plays B in Scontro and the user previews D
- **THEN** B and D are heard together, and pressing M leaves only D

## REMOVED Requirements

### Requirement: Two named pattern rows
**Reason**: The song's row and "Song patterns" looked like the same list, and the owner could not tell which one changes the song (#84).
**Migration**: Replaced by "One pattern row in the track panel" and the marks, status line, Try on a copy and Restore requirements.
