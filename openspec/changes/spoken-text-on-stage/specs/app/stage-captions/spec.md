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

Each caption SHALL mark its speaker. By default the mark SHALL be a drawn line icon and a colour per voice (narrator, voice track, further voices), with the narrator's text in italics and the voice track's text upright in quotes. A setting per speaker kind SHALL choose the mark among: nothing, formatting only, label, icon, and icon and formatting (the default). The speaker's name SHALL be available in the tooltip with every choice, in Italian and English.

#### Scenario: Two speakers

- **WHEN** the narrator speaks and later the voice track speaks, with the default marks
- **THEN** the first caption carries the narrator's icon with italic text, the second the voice track's icon with its text in quotes

#### Scenario: Label for the voice track

- **WHEN** the user sets the voice track's mark to label and leaves the narrator's at the default
- **THEN** the voice track's caption starts with the label "Voce" in upright text, and the narrator's caption keeps its icon and italics

#### Scenario: Nothing

- **WHEN** the user sets the narrator's mark to nothing
- **THEN** the narrator's caption shows its text alone, upright, with no icon, and its name still shows on hover

### Requirement: Step line tag

When the step line of a bar differs from the line heard on that bar, the stage SHALL show the step line as a small secondary tag below the spoken line, in the same box, unless the setting hides it. When they are equal only the caption SHALL show. A step line that is not spoken SHALL show only as this tag.

#### Scenario: Explaining style

- **WHEN** luci-rosse plays with the explaining style
- **THEN** each step line shows once, as the caption, and no tag

### Requirement: The "Claude" look replies

In the "Claude" look the step line (or the section-change line) SHALL be typed in the prompt as the user's input, and the spoken line SHALL appear in a reply block by the prompt as Claude's reply, with a ● marker, typed over the length of its sample; the block SHALL keep the last two exchanges. A voice-track line SHALL appear as a separate line marked as the voice. The page caption SHALL NOT be drawn over this look.

#### Scenario: Reply to a step

- **WHEN** the "Claude" look shows luci-rosse in the poetic style on bar 8
- **THEN** the reply block shows "> ritmo più fitto" as the user's line and "● la città respira" as the reply, and the page caption is hidden

### Requirement: The "Claude" look's transcript pane

An option of the "Claude" look SHALL add a transcript pane on the right with the exchanges older than those of the reply block. The pane SHALL be off by default and SHALL NOT show in 9:16 frames.

#### Scenario: Transcript pane

- **WHEN** the transcript option is on, the look is shown at 16:9, and a third exchange arrives
- **THEN** the oldest exchange of the reply block moves to the pane on the right, and no exchange shows twice

#### Scenario: Transcript pane in 9:16

- **WHEN** the transcript option is on and a 9:16 fragment of the "Claude" look is exported
- **THEN** the fragment shows the reply block only, with no pane

### Requirement: Invented prompt lines are not spoken

The prompt lines the "Claude" look writes from a section change SHALL NOT be spoken or captioned.

#### Scenario: Invented prompt line

- **WHEN** a section change has no step line and the look writes "drop…" in the prompt
- **THEN** nothing says "drop…" and no caption shows it

### Requirement: Captions in videos and live output

The session video, the fast video, fragments, the timeline layout and the live output SHALL draw the same captions as the stage, from the same schedule, with the same speakers and timing; 9:16 frames SHALL place them in the lower third in at most two lines.

#### Scenario: Fast video of a poetic song

- **WHEN** the user exports a fast video of luci-rosse with the poetic style
- **THEN** each image heard in the file shows as its caption at its time, and no step line shows as a spoken caption

### Requirement: Caption settings

Settings SHALL offer a "Testi sul palco" card with one switch, on by default, that turns the texts on and off on the stage, in the looks and in every video. The choices under it SHALL be kept while the switch is off, stored, and included in the backup.

#### Scenario: Switch off

- **WHEN** the user turns the switch off
- **THEN** no text shows on the stage, in the looks or in a video exported after that, and turning it on again brings back the same choices

### Requirement: Choices under the switch

Under the switch the card SHALL offer: narrator, voice track, console lines, step lines and the "Claude" look's replies, each on or off; how each voice is marked; the step line's form (small tag or as the caption); the placement (as the look says, bottom, top); and in videos too.

#### Scenario: Narrator only

- **WHEN** the switch is on and the user turns off voice track, console lines, step lines and the "Claude" look's replies
- **THEN** only the narrator's lines show, on the stage and in videos

#### Scenario: Old behaviour

- **WHEN** the user picks "al posto del parlato" for the step line
- **THEN** the stage shows the step line for 4 bars as before this change

### Requirement: Samples prepared ahead

When a song is prepared (opened, generated or regrown in Compose, or prepared as the next song in the radio), the app SHALL list every line the song would speak if every sample existed, including lines typed in the radio console, and SHALL ask the voice helper for each missing sample before the line plays. After new samples arrive, the song SHALL be compiled again so the lines are in its code and its captions.

#### Scenario: Next radio song

- **WHEN** the radio prepares the next song and three of its poetic images have no sample
- **THEN** the helper makes the three samples before the song goes on air, and the three images are heard and captioned

#### Scenario: No helper

- **WHEN** the app runs without the voice helper
- **THEN** no sample is made, the fallback chain applies, and the Voices group lists the lines without a sample

### Requirement: Fallback chain for a missing sample

At play time a line SHALL use, in order: the speaker's own sample, the default voice's sample of the same line with the speaker's sound settings, a sample made on the fly by the voice helper and then spoken as soon as it is ready, and only when all fail no sound, its text shown as the step tag and never as a spoken caption.

#### Scenario: Sample made on the fly

- **WHEN** a narrator line has no sample in any bank and the voice helper runs
- **THEN** the helper makes the sample, the line is spoken when it is ready, and it is captioned when it is spoken

#### Scenario: Speaker variant missing

- **WHEN** a narrator line has a sample in the default voice but not in the song's speaker
- **THEN** the default voice's sample plays with the speaker's settings, and the line is captioned

### Requirement: Missing samples check

A command SHALL list the lines without a sample over the built-in songs, the example songs, the style recipes and the vocabularies, per language and speaker bank, and SHALL fail in strict mode when any is missing.

#### Scenario: Strict run

- **WHEN** `npm run check:samples -- --strict` finds a vocabulary line with no sample for the speaker `reed` in Italian
- **THEN** it prints the bank and the line and exits with a failure

### Requirement: Speaker registry

Speakers SHALL be kinds in one registry, each with a precedence rank, an icon, a text style, a colour, a default mark and two flags: `exclusive` (lower ranks go silent while it sounds, off by default) and `multiCaption` (one caption row per active speaker). A new kind of speaker SHALL need only a registry entry and its schedule lines to be captioned. No singing voice SHALL play in this change.

#### Scenario: Several captions at once

- **WHEN** `multiCaption` is on and two kinds sound at the same time
- **THEN** each shows its own caption row, ordered by rank

#### Scenario: A kind that silences the others

- **WHEN** a test kind ranked above the voice track has `exclusive` on and sounds on a bar
- **THEN** the voice track and the narrator are silent on that bar and only the test kind is captioned

### Requirement: Speaker precedence

The registry SHALL keep today's rules: the voice track wins over the narrator on its bars, the narrator says at most one line per bar, and the step's own line comes after both.

#### Scenario: Today's voices through the registry

- **WHEN** a song has a narrator and a voice track speaking on the same bar
- **THEN** the voice track speaks and is captioned, the narrator is silent on that bar, as before this change
