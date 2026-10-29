## ADDED Requirements

### Requirement: Captions show what is heard

The stage caption SHALL come from the schedule of spoken lines the code plays (`spokenSchedule`): the narrator's lines (explaining lines, poetic entry images, movement images) and every start of a voice-track line, including lines typed in the radio console. A line that is not heard (no sample, muted track, the narrator off or yielding to the voice track) SHALL NOT show as a spoken caption.

#### Scenario: Poetic narrator with Narrated growth

- **WHEN** luci-rosse plays in Live coder with the poetic style and Narrated growth, and the narrator says "la città respira" on bar 8
- **THEN** the stage caption on bar 8 is "la città respira", not the step line "ritmo più fitto"

#### Scenario: Entry image

- **WHEN** the poetic narrator says "qualcosa di profondo si sveglia" on bar 17, the bar before the bass enters
- **THEN** the caption shows that image on bar 17

#### Scenario: Voice track

- **WHEN** prova-voce-notte plays and the voice track says "le torri non dormono mai" on bar 8
- **THEN** the caption shows that line on bar 8, marked as the voice

#### Scenario: Line never heard

- **WHEN** a step line has no sample, or the narrator skips it because the voice track speaks on its bar
- **THEN** no spoken caption shows it

#### Scenario: Narrator off

- **WHEN** the narrator is switched off and the song has a voice track
- **THEN** no narrator caption shows and the voice track's lines still show

### Requirement: Caption timing

A caption SHALL appear on the bar its line is spoken and SHALL stay for the length of its sample plus 1.5 seconds, at least 2 seconds and at most 4 bars, or until the next line of the same speaker.

#### Scenario: Short line

- **WHEN** the narrator says a line whose sample lasts 1.3 seconds at 124 BPM
- **THEN** the caption shows for about 2.8 seconds, not for 4 bars

### Requirement: Speaker of a caption

Each caption SHALL name its speaker, Narrator or Voice, with a style per speaker that differs in colour and face, in Italian and English.

#### Scenario: Two speakers

- **WHEN** the narrator speaks and later the voice track speaks
- **THEN** the first caption carries the Narrator label and the second the Voice label, with different styles

### Requirement: Step line tag

When the step line of a bar differs from the line heard on that bar, the stage SHALL show the step line as a small secondary tag, unless the setting hides it. When they are equal only the caption SHALL show.

#### Scenario: Explaining style

- **WHEN** luci-rosse plays with the explaining style
- **THEN** each step line shows once, as the caption, and no tag

### Requirement: The "Claude" look replies

In the "Claude" look the step line (or the section-change line) SHALL be typed in the prompt as the user's input, and the spoken line SHALL appear above the prompt as Claude's reply, with a ● marker, typed over the length of its sample. A voice-track line SHALL appear as a separate line marked as the voice. The page caption SHALL NOT be drawn over this look.

#### Scenario: Reply to a step

- **WHEN** the "Claude" look shows luci-rosse in the poetic style on bar 8
- **THEN** the transcript shows "> ritmo più fitto" as the user's line and "● la città respira" as the reply, and the page caption is hidden

### Requirement: Captions in videos and live output

The session video, the fast video, fragments, the timeline layout and the live output SHALL draw the same captions as the stage, from the same schedule, with the same speakers and timing; 9:16 frames SHALL place them in the lower third in at most two lines.

#### Scenario: Fast video of a poetic song

- **WHEN** the user exports a fast video of luci-rosse with the poetic style
- **THEN** each image heard in the file shows as its caption at its time, and no step line shows as a spoken caption

### Requirement: Caption settings

Settings SHALL offer a "Testi sul palco" card: captions on or off (on by default), which speakers (Narrator, Voice: track, console lines), the step line (hidden, small tag, or as the caption), the placement (as the look says, bottom, top) and captions in videos. The choices SHALL be stored and included in the backup.

#### Scenario: Old behaviour

- **WHEN** the user picks "al posto del parlato" for the step line
- **THEN** the stage shows the step line for 4 bars as before this change
