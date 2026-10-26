## Purpose

The lines the voices say: the phrase list of the voice instrument and of the narrator, editing a line's text and bars in every build mode, where the voice instrument may speak, how a new line gets its sample, and what the poetic narrator says with Narrated growth.

## ADDED Requirements

### Requirement: Phrase list of the voice instrument
The Compose Voices group SHALL show, in the Voice: track block, a folded Phrases part (closed by default) listing every line the voice instrument says in the open song, one row per clip, sorted by bar. A row SHALL show the bar or bars where the line sounds (one bar, a range for a chop, the list of bars for a refrain), the way, the text and whether its sample exists. The same list SHALL show in the voice instrument track panel and SHALL follow the same single source: the track's patterns and clips.

#### Scenario: Sorted by bar
- **WHEN** the song has lines at bars 41, 9 and 25
- **THEN** the list shows them in the order 9, 25, 41

#### Scenario: Refrain bars
- **WHEN** a refrain clip spans bars 17 to 32 and repeats every 4 bars in a quiet section
- **THEN** its row shows the bars where it is actually said, for example 17, 21, 25, 29

### Requirement: Edit a line in place
The owner SHALL be able to edit a row's text in place, like the own text ("Written here") of the line editor: the line becomes an own text, at most 12 words, and the change applies to every clip that plays that pattern, which the row says. The text edited SHALL be the interface language's; the other language SHALL keep its own text, or, when it has none, speak the edited text and show a "to translate" mark. The owner SHALL be able to edit a row's start bar and length in place, without opening the timeline. Every edit SHALL be one song edit with Undo, and the timeline, the track panel and the code SHALL show it at once.

#### Scenario: Text edit
- **WHEN** the owner changes the text of the row at bar 25 to "the signal is late"
- **THEN** the line says it from bar 25, the line editor shows Written here with that text, and Undo restores the old line

#### Scenario: Shared pattern
- **WHEN** two clips play the same line A and the owner edits A's text in the row of the first
- **THEN** the row says the change applies to both clips, and both say the new text

#### Scenario: Bar edit
- **WHEN** the owner sets the start of a row from 25 to 33
- **THEN** the clip moves to bar 33, the list is sorted again, and the timeline shows the clip at 33

#### Scenario: Too many words
- **WHEN** the owner types a 15-word line
- **THEN** the row refuses it and says the limit is 12 words

### Requirement: Bars in every build mode
Bars SHALL be stored once, as bars of the song as written. In a build that moves the bars (Crescendo and Live coder grow before the written part, and a spoken track may enter on a free bar before its line), each row SHALL show the bar heard in the current build next to the written bar when they differ. A bar the owner types SHALL be read as the bar heard in the current build and stored as the written bar that is heard there; a bar inside the growth, before the written part starts, SHALL be refused with the reason and the first bar that works. Switching the build mode SHALL never change the stored bars.

#### Scenario: Crescendo
- **WHEN** the Crescendo build grows 24 bars before the written part and a line is written at bar 17
- **THEN** its row shows "bar 41 (written 17)"

#### Scenario: Edit heard bar
- **WHEN** in that Crescendo build the owner types 49 as the start of the row
- **THEN** the clip is stored at written bar 25 and is heard at bar 49; in Classic the row shows bar 25

#### Scenario: Bar in the growth
- **WHEN** in that build the owner types 10
- **THEN** the row refuses it, says the written song starts at bar 25 in this build, and keeps the old bar

### Requirement: Phrase list of the narrator
The Voice: narratore block SHALL show a folded list of the narrator's lines of the current build, sorted by bar, with their bar. For a song with its own written steps the text SHALL be editable in place like a voice instrument line (one song edit, Undo). For steps made by the build (derived Live build, Crescendo, Live coder) the list SHALL be read-only and say that those lines come from the build.

#### Scenario: Derived build
- **WHEN** the owner opens the narrator list in a Crescendo build of a song without its own steps
- **THEN** the lines show with their bars, not editable, with the reason

### Requirement: Where the voice instrument speaks
The voice instrument options SHALL have a Where option with three flags, quiet parts, medium parts and busy parts, in any combination with at least one on. A part is a phrase of the song (8 bars). Counting the tracks that play in a part (not the voices, code or riser tracks) against the most tracks that play in any part of the song: a quiet part has at most half of them, at least 2, or is named intro, break or outro; a busy part has at least three quarters of them, or is named drop or peak, and is not quiet; a medium part is neither. Phrases SHALL go to quiet parts first, then medium, then busy, among the flags that are on, never two in one part, spread over the song; the count SHALL stay a ceiling. The default SHALL be quiet only, so songs and the director draw as before. A refrain SHALL repeat only in sections of the kinds that are on.

#### Scenario: Many phrases
- **WHEN** a song has 4 quiet parts and 6 medium parts and the owner asks for many phrases with quiet and medium on
- **THEN** the track gets up to 10 phrases, the 4 quiet parts filled first, and the toast no longer says there are no more quiet parts

#### Scenario: Only busy
- **WHEN** only busy parts is on
- **THEN** every phrase sits in a busy part

#### Scenario: Default unchanged
- **WHEN** a song or a radio session uses the default options
- **THEN** its phrases sit where they sat before this change, and the director fixtures do not move

### Requirement: Sample of a new or edited line
A line SHALL be shown on stage and written in the code as soon as it exists. Its audio SHALL be a sample made by the local voice generator for its text, language and speaker. When a line has no sample and the dev server's voice helper is available, the app SHALL ask for the sample at once and SHALL play the line as soon as the sample exists, without a reload. Until then the line SHALL be silent and its row SHALL say "sample on its way"; without the helper (a built app, another system) the row SHALL say how to make it (`npm run voices`). The music SHALL never wait for a sample. The generator SHALL be replaceable without changing the song format.

#### Scenario: Edited line in dev
- **WHEN** the owner edits a line while the dev server runs on macOS
- **THEN** the row shows "sample on its way", then the mark goes and the line speaks from its next bar

#### Scenario: No helper
- **WHEN** the app runs from a build without the helper
- **THEN** the row says "no sample: npm run voices", the line stays silent, and nothing else changes

### Requirement: Poetic narrator with Narrated growth
With the poetic narrator style and Narrated growth on, the narrator SHALL say every step line that Narrated growth says, and in addition the poetic image in the bar before each track comes in. When a step line and a poetic image fall on the same bar, the image SHALL be said and the step line SHALL still show on stage. Without Narrated growth, the poetic style SHALL stay as today (images only).

#### Scenario: Both lines
- **WHEN** a Crescendo build with Narrated growth uses the poetic style
- **THEN** the narrator says the step lines, plus an image before each new track

#### Scenario: Same bar
- **WHEN** a step line and an image fall on bar 16
- **THEN** the image is said on bar 16 and the step line shows on stage, unspoken
