# Spec Delta

## ADDED Requirements

### Requirement: A committed list of allowed voice styles per speaker
The app SHALL read `src/voices/combos.json`, a committed file that lists, per language and per speaker, the voice styles that automatic draws may use. The key `default` SHALL stand for the default voice of the language. A speaker, language or file with no entry SHALL allow every voice style. The style `clear` SHALL always be allowed. A character of `VOICE_CHARACTERS` SHALL be allowed when the style of the same name is.

#### Scenario: No entry
- **WHEN** the file has no entry for `kathy`
- **THEN** every style is allowed for `kathy`

#### Scenario: A listed speaker
- **WHEN** `en.albert` lists `clear`, `radio` and `deep`
- **THEN** an automatic draw for `albert` can give only those, and `clear`

### Requirement: Automatic draws only use allowed pairs
The radio and Compose growth voice draw, the voice instrument draw, the characters of an artist and the narrator speaker draw next to a chosen narrator style SHALL never produce a speaker and style pair that is not allowed. A draw SHALL be language independent: a pair SHALL be allowed in every language where the speaker can be heard, a speaker that does not speak a language counting as the default voice of that language. When no style but `clear` is allowed, the draw SHALL use `clear`. Filtering SHALL NOT change how many random values a draw takes, so the music of a seed stays the same.

#### Scenario: Radio draw
- **WHEN** the radio draws voices for 300 seeds with `albert` limited to `clear` and `deep`
- **THEN** no song has `albert` with another character

#### Scenario: Nothing allowed
- **WHEN** a speaker lists only styles that are not characters
- **THEN** the draw gives it no character, the plain `clear` sound

#### Scenario: All allowed
- **WHEN** the file allows every pair
- **THEN** the draws are the same as without the file

#### Scenario: Chosen narrator style
- **WHEN** the radio has a narrator style that the drawn speaker does not allow and no fixed speaker
- **THEN** the speaker is drawn again among those that allow it; the style is not changed

### Requirement: Manual choices are never restricted
A voice style or custom knob values that a user chooses by hand SHALL be accepted whatever the file says. Saved songs and sessions SHALL play as saved. A style picker SHALL mark a style that is not in the allowed set of the current speaker with a short note, and SHALL keep it selectable.

#### Scenario: Hand choice
- **WHEN** a user picks a style that is not allowed for the current speaker in the track panel
- **THEN** the style is set, and its option shows the note "not in the allowed set"

### Requirement: The file is validated
`npm run check:voice-combos` SHALL fail on a file that is not valid JSON, a missing or wrong `format`, an unknown language, an unknown speaker, a speaker that does not speak that language, an unknown style id, a duplicate id or a value that is not a list. It SHALL warn on an empty list and on a list with only `clear`.

#### Scenario: Typo
- **WHEN** the file lists `"robott"` for `fred`
- **THEN** the check fails and names the speaker and the id

### Requirement: The Voices tab shows whether a pair is allowed
The test bench of the Voices tab SHOULD show, for the chosen speaker and style, whether the pair is allowed, and say that it can still be played.

#### Scenario: Bench status
- **WHEN** a user picks `albert` and `robot` and `robot` is not in the list
- **THEN** the bench says the pair is not in the allowed set and the Listen button still plays it
