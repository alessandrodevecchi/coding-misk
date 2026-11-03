## ADDED Requirements

### Requirement: My phrases spoken by their speaker in the radio

A phrase of mine that the radio says SHALL be spoken with the sample of the speaker of the voice that says it. When that sample is missing, the radio SHALL ask the voice helper for it, also when the default voice has the text. Until it exists, the default voice SHALL say the phrase, with the existing fallback note. The songs of a seed SHALL NOT change.

#### Scenario: Speaker's sample exists

- **WHEN** the radio plays a song where a voice whose speaker is X says a phrase of mine, and X's sample of that phrase exists
- **THEN** the phrase is heard with X's sample

#### Scenario: Speaker's sample missing

- **WHEN** the radio plays a song where speaker X says a phrase of mine, X's sample does not exist and the default voice's does
- **THEN** the default voice says the phrase, the console notes `[voice] "<text>": no sample in say_<lang>_X, the default voice speaks it`, and the radio asks the voice helper for X's sample when the helper runs

#### Scenario: Default speaker

- **WHEN** the voice that says a phrase of mine has no speaker of its own
- **THEN** the phrase is spoken with the default voice's sample, and the radio asks for and plays the same samples as before this change

#### Scenario: Built-in line

- **WHEN** a built-in line said by speaker X has no sample of X and the default voice has it
- **THEN** the default voice says it and the radio does not ask for X's sample, as before

#### Scenario: Same songs

- **WHEN** the same seed is generated before and after this change
- **THEN** the songs, their lines and their speakers are the same

### Requirement: Speaker samples loaded ahead

The radio SHALL load the speaker's sample of every phrase of mine in the next song before that song's first bar, including a sample made after the next song was first preloaded. A sample that the default voice speaks in its place SHALL be loaded ahead as before.

#### Scenario: Next song's speaker sample

- **WHEN** the next song has a phrase of mine said by speaker X and X's sample exists before the next song starts
- **THEN** X's sample is loaded before the next song's first bar, and not fetched for the first time on it

#### Scenario: Sample made while the song on air plays

- **WHEN** X's sample of a phrase in the next song is made by the voice helper after the next song was preloaded
- **THEN** it is queued for loading when it arrives and is loaded before the next song's first bar
