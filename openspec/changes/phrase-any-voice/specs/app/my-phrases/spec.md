## ADDED Requirements

### Requirement: Phrases any voice can say

The kind of a phrase SHALL accept a fourth value, Any, shown as "Any" in the field "Who says it". A phrase of kind Any SHALL be a candidate for the voice track, for the narrator explaining and for the narrator poetic. Every other pick rule (on/off, language, styles, share, seeded draw) SHALL apply to it unchanged. Built-in vocabularies SHALL NOT change. The default kind of a line saved from the radio console or Compose SHALL stay voice.

#### Scenario: Any is picked by all three

- **WHEN** one phrase of kind Any is on and the director draws a voice track line, an explaining line and a poetic line
- **THEN** the phrase is a candidate for each of the three draws

#### Scenario: Other rules still apply

- **WHEN** an Any phrase is switched off, or has styles that the song does not have, or has no text in the song's language
- **THEN** it is not picked

#### Scenario: Copy of a built-in

- **WHEN** the user copies a built-in vocabulary line into My phrases and sets Who says it to Any
- **THEN** it is a user phrase of kind Any

#### Scenario: Existing phrases

- **WHEN** the app opens with phrases saved before this change
- **THEN** each keeps its kind and tag, and nothing is converted

### Requirement: An Any phrase has no tag

A phrase of kind Any SHALL have no tag and SHALL be shown with the tag "Any". The tag field SHALL be hidden or disabled while Who says it is Any. Switching a phrase to Any SHALL clear its tag. An Any phrase SHALL match every tag: every mood, every moment and every entering track.

#### Scenario: Switch to Any

- **WHEN** the user changes a voice phrase with the mood night to Any and saves
- **THEN** the phrase has no tag, and it is a candidate for any mood, moment or entering track

#### Scenario: Switch back

- **WHEN** the user changes an Any phrase to explain
- **THEN** the tag field is shown again, set to Any (no tag) until the user picks one

### Requirement: One phrase per text and language when Any

An Any phrase SHALL be unique by text and language across all kinds. Setting a phrase to Any when the same text and language exist under another kind SHALL merge them into one Any phrase: the uses are summed, the older id is kept, and the styles are united. Saving a new line whose text and language already exist as Any SHALL reuse that phrase and add one use.

#### Scenario: Merge on edit

- **WHEN** "ecco il basso" exists as explain with 2 uses and as poetic with 3 uses, and the user sets the explain phrase to Any
- **THEN** one Any phrase remains with 5 uses, the older id, and the styles of both

#### Scenario: Reuse on save

- **WHEN** the user types a line that already exists as Any
- **THEN** no new phrase is added and the Any phrase gets one use

### Requirement: Samples of an Any phrase follow the speakers

A sample file SHALL depend on the text and the speaker. When the voice track and the narrator have the same speaker, an Any phrase SHALL use one file for both. When they have different speakers, the app SHALL make the Any phrase once per speaker, automatically, as it does for other lines. Deleting an Any phrase SHALL count the files of every speaker and delete those that no other use needs. The usage and protect lists SHALL treat an Any phrase as used by the voice track, the narrator explaining and the narrator poetic.

#### Scenario: Two speakers

- **WHEN** the narrator speaks with one speaker and the voice track with another, and an Any phrase can be drawn by both
- **THEN** a sample is made for each speaker without the user asking

#### Scenario: Same speaker

- **WHEN** the narrator and the voice track share a speaker
- **THEN** one file serves both and none is made twice

#### Scenario: Delete

- **WHEN** the user deletes an Any phrase
- **THEN** the count lists the files of every speaker, and deleting removes them unless a built-in vocabulary, another phrase or a saved song needs the same file
