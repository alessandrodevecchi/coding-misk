## ADDED Requirements

### Requirement: A personal phrase collection

The app SHALL keep the user's phrases in one collection in the browser storage (`coding-misk-phrases`). Each phrase SHALL have a text of at most 12 words, a language, an optional translation, a kind (`voice`, `explain`, `poetic`), a tag or none, optional styles, an on/off switch for the director, its source, its creation time and a use count. A text SHALL be stored once per kind and language (same slug).

#### Scenario: Same line twice

- **WHEN** the user types "le torri non dormono mai" in the radio console on two evenings
- **THEN** the collection holds one phrase with a use count of at least 2

#### Scenario: Backup

- **WHEN** the user exports a backup and imports it in another browser that has other phrases
- **THEN** both sets of phrases are there, merged by id, each keeping the larger use count and the newer last use

### Requirement: Lines the user writes are captured

A line the user writes in the radio console, in the voice track's phrase list in Compose, in the narrator lines of their own songs, or in the Voci tab SHALL be offered to the collection with a kind and a tag guessed from where it was written. Lines of built-in songs and lines the director wrote SHALL NOT be captured.

#### Scenario: Radio console

- **WHEN** the user says "chi guida stanotte" with Say now while a Dark cyberpunk song is on air
- **THEN** the phrase is offered as kind voice, with the style's vocabulary group as its tag and Dark cyberpunk as its style

#### Scenario: Narrator line of the user's own song

- **WHEN** the user edits the explaining narrator line of the step that adds the bass in a song of theirs to "ecco il basso, piano"
- **THEN** the phrase is offered as kind explain with the moment bass

### Requirement: Save policy

A global setting SHALL decide what happens to an offered line: Salva sempre (the default: saved, with a toast offering Annulla), Chiedi ogni volta (a toast with Salva, No and Sempre that never stops the music; no answer in 10 seconds counts as No), Non salvare mai. A line already in the collection SHALL only add a use, with no toast.

#### Scenario: Default

- **WHEN** a new user types a line in the radio console
- **THEN** the line plays, it is saved in the collection, and a toast offers Annulla

#### Scenario: Ask, no answer

- **WHEN** the policy is Chiedi ogni volta and the user ignores the toast
- **THEN** after 10 seconds the line is not saved, it still plays, and its sample is temporary

#### Scenario: Never

- **WHEN** the policy is Non salvare mai
- **THEN** no phrase is saved and no toast asks

### Requirement: The director reuses my phrases

Where a line comes from a built-in pool (the voice track vocabulary, the explaining narrator's pools, the poetic images), a switched-on phrase of the same kind, with a matching tag, a text in the app's language and matching styles or none, SHALL be able to replace it. A song's own written lines and a style's own lines SHALL never be replaced.

#### Scenario: A song's own lines

- **WHEN** a song has its own written step lines or phrase list
- **THEN** none of them is replaced

### Requirement: How often my phrases are used

A setting SHALL set how often a candidate replaces a pool line: Mai, Ogni tanto (default, 0.25), Spesso (0.5), Molto (0.8). The replacement SHALL be drawn on its own random stream after the pool's draw.

#### Scenario: Never, or no phrases

- **WHEN** the setting is Mai, or the collection has no candidate for a line
- **THEN** every line, every draw and the director and growth fixtures are the same as without this change

#### Scenario: A radio song with my phrases

- **WHEN** the setting is Spesso and the collection has three voice phrases tagged night
- **THEN** about half of the night vocabulary lines of the next songs are phrases of mine, written out in the songs

#### Scenario: Replay after the collection changed

- **WHEN** a radio session saved in a playlist said one of my phrases, and the phrase is later deleted
- **THEN** Replay plays the same line

#### Scenario: Compose growth

- **WHEN** a built-in song grows in Live coder with the explaining narrator and the setting is Ogni tanto
- **THEN** some generated narrator lines are phrases of mine of the same moment, and the growth (steps, code, length) is the same

### Requirement: Edit and delete

The user SHALL be able to change a phrase's text, translation, kind, tag, styles and switch, and to delete it with Undo. Songs that already contain a phrase SHALL keep their text.

#### Scenario: Delete a phrase used by a saved song

- **WHEN** the user deletes a phrase that a saved song also says
- **THEN** the phrase leaves the collection, the saved song keeps its line, and the confirmation says so
