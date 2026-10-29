## ADDED Requirements

### Requirement: Narrator ghost row

When the open song has no track of type voice and its narrator can speak (the Live build is on, or the song has its own steps), the Compose timeline SHALL show a read-only ghost narrator row after the real tracks, in the sections view and in the timeline view. The row SHALL be drawn apart from the tracks (dashed, no clips, no Mute or Solo) and SHALL have growth and ending cells aligned with the other rows.

#### Scenario: Both views

- **WHEN** a song without a narrator track builds live in Compose and the user switches between the sections view and the timeline view
- **THEN** the ghost row is the last row in both views, with no Mute or Solo, and its growth cell is aligned with the growth cells above

### Requirement: Where the narrator speaks

The ghost row SHALL show where the narrator's lines are heard: a count per written section in the sections view, a mark per line in the timeline view, and a tick per line in the growth and ending cells. Each cell's tooltip SHALL list the bars and texts of its lines.

#### Scenario: Grown song without a narrator track

- **WHEN** luci-rosse is open in Compose in Live coder and has no narrator track
- **THEN** a ghost Narrator row follows the Riser row, its growth cell has a tick for each of the 19 narrator lines of the growth, and the written sections where the narrator speaks show their count

#### Scenario: Tooltip of a section

- **WHEN** the user hovers the ghost cell of a section where the narrator says one line at bar 149
- **THEN** the tooltip names the section and lists "battuta 149" with the line's text

### Requirement: Ghost row is not a track

The ghost row SHALL NOT be part of the song: the song's tracks, its code, its sound, its growth and the radio SHALL NOT change. With the narrator switched off the row SHALL be dimmed and SHALL say why. With the Live build off and no own steps the row SHALL NOT show.

#### Scenario: Song unchanged

- **WHEN** the ghost row is shown
- **THEN** the song's tracks, the generated code and the radio track count are the same as without it

#### Scenario: Live build off

- **WHEN** a song without its own steps is open with the Live build off
- **THEN** no ghost row shows

#### Scenario: Narrator switched off

- **WHEN** the user switches Voice: narrator off
- **THEN** the ghost row stays, dimmed, and its tooltip says the narrator is off

### Requirement: Ghost row clicks

Clicking a ghost cell or mark SHALL seek to the narrator line nearest to the click, or to the section start when the cell has no line, and SHALL NOT select a track. Clicking the ghost row's name SHALL bring Voice: narrator into view in the Voices group with its Sound part unfolded. Clicking the empty timeline lane of the ghost row SHALL NOT add a clip. The cells SHALL work from the keyboard.

#### Scenario: Seek to a line in the growth

- **WHEN** the user clicks the ghost growth cell near the narrator line at bar 18
- **THEN** the song goes to bar 18 and the selected track does not change

#### Scenario: Open the narrator's sound

- **WHEN** the user clicks the ghost row's name
- **THEN** Voice: narrator is in view with its Sound part open

### Requirement: Ghost row becomes the narrator track

The first edit of the narrator's sound SHALL add the Narrator track as today, and the timeline SHALL show it in place of the ghost row, with the same marks, briefly highlighted. Undo SHALL remove the track and bring the ghost row back. A narrator track added in any other way SHALL hide the ghost row.

#### Scenario: First edit

- **WHEN** the user sets the narrator voice style to Deep on a song with a ghost row
- **THEN** the ghost row is gone, a Narrator track row with the same marks is in its place, and the toast offers Undo

#### Scenario: Undo

- **WHEN** the user presses Undo on that toast
- **THEN** the song has no narrator track and the ghost row is back

### Requirement: Ghost row on the hardware theme and on a phone

The ghost row SHALL use the theme's tokens in the neon and hardware themes. At phone width (400 px) the row's name SHALL fit its head, and a tap on a cell SHALL seek as a click does.

#### Scenario: Phone

- **WHEN** Compose is 400 px wide with a ghost row
- **THEN** the name "Narrator" is fully visible in the row head and the growth cell is aligned with the other rows
