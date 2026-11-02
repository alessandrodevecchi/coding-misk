## ADDED Requirements

### Requirement: Who says it has five options

A phrase SHALL store the kinds that can say it as a list drawn from `voice`, `explain` and `poetic`. The field "Who says it" SHALL offer five options: Voice track (`voice`), Narrator explaining (`explain`), Narrator poetic (`poetic`), Both narrators (`explain` and `poetic`) and All (`voice`, `explain` and `poetic`). A voice SHALL take a phrase when its kind is in the phrase's kinds. Every other pick rule (on/off, language, styles, share, seeded draw) SHALL apply unchanged. Built-in vocabularies SHALL NOT change. A line saved from the radio console or Compose SHALL be Voice track with no tag.

#### Scenario: Both narrators

- **WHEN** a phrase with Both narrators is on and the director draws a voice track line, an explaining line and a poetic line
- **THEN** the phrase is a candidate for the explaining and poetic draws and not for the voice track draw

#### Scenario: All

- **WHEN** a phrase with All is on and the director draws a voice track line, an explaining line and a poetic line
- **THEN** the phrase is a candidate for each of the three draws

#### Scenario: Other rules still apply

- **WHEN** a phrase with several kinds is switched off, or has styles the song does not have, or has no text in the song's language
- **THEN** it is not picked

#### Scenario: Copy of a built-in

- **WHEN** the user copies a built-in vocabulary line into My phrases and sets Who says it to All
- **THEN** it is a user phrase that all three can say

#### Scenario: Old phrases

- **WHEN** the app opens with phrases saved with a single kind
- **THEN** each is read as a list of that one kind, keeps its tag, and says the same as before

### Requirement: A tag only for one kind

A phrase SHALL have a tag (a mood, a moment or an entering track) only when it has exactly one kind. A phrase with Both narrators or All SHALL have no tag and SHALL be shown with the tag "Any". The tag field SHALL be hidden while one of those options is chosen. Choosing one of them SHALL clear the tag. Such a phrase SHALL match every tag.

#### Scenario: Widen a phrase

- **WHEN** the user changes a voice track phrase with the mood night to All and saves
- **THEN** the phrase has no tag and is a candidate for any mood, moment or entering track

#### Scenario: Defaults

- **WHEN** the user creates a phrase in My phrases, or saves one from the radio console or a Compose voice track
- **THEN** the tag is Any (no tag), and Who says it is as today: Narrator explaining for a new phrase in My phrases, Voice track for a phrase saved from the radio or Compose

#### Scenario: Narrow a phrase

- **WHEN** the user changes a phrase with All to Narrator explaining
- **THEN** the tag field is shown again, set to Any (no tag), and the user can pick a moment again (a tag lost in a merge can be set again this way)

### Requirement: One phrase per text, language and kind

A text and language SHALL belong to at most one phrase for each kind. Widening a phrase SHALL merge it with the phrases of the same text and language that have an included kind: the uses are summed, the older id is kept, the styles are united, and the kinds are the union. The app SHALL offer Undo after a merge. Saving a text that already exists in a phrase that includes the asked kind SHALL reuse that phrase and add one use.

#### Scenario: Merge on edit

- **WHEN** "ecco il basso" exists as explain with 2 uses and as poetic with 3 uses, and the user sets the explain phrase to Both narrators
- **THEN** one phrase remains with kinds explain and poetic, 5 uses, the older id and the styles of both, and an Undo is offered

#### Scenario: Reuse on save

- **WHEN** the user types a line that already exists in a phrase with All, saved as Voice track
- **THEN** no new phrase is added and that phrase gets one use

### Requirement: Samples follow the speakers

A sample file SHALL depend on the text and the speaker. A phrase SHALL have one file for each speaker that can say it, and speakers that are the same SHALL share one file. When the narrator and the voice track use different speakers, the app SHALL make the missing files automatically, as it does for other lines. Deleting a phrase SHALL count the files of all its speakers and delete those that no other use needs. The usage and protect lists SHALL count every speaker of the phrase.

#### Scenario: Two speakers

- **WHEN** the narrator and the voice track use different speakers and a phrase with All is on
- **THEN** a sample is made for each speaker without the user asking

#### Scenario: Same speaker

- **WHEN** the narrator and the voice track share a speaker
- **THEN** one file serves both and none is made twice

#### Scenario: Delete

- **WHEN** the user deletes a phrase with several kinds
- **THEN** the count lists the files of every speaker, and deleting removes them unless a built-in vocabulary, another phrase or a saved song needs the same file
