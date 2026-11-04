# Spec Delta

## MODIFIED Requirements

### Requirement: A speaker per style
A recipe SHALL be able to name a speaker for its voice part, among the app's speakers (see `app/speakers`) or the default voice. The voice track SHALL play the comments with that speaker's samples in the languages the speaker speaks, and with the default voice in the others. `npm run voices` SHALL make the samples of every speaker the recipes name, for the languages it speaks. A song whose voice part comes from a style with a speaker SHALL sound with that speaker.

#### Scenario: Different styles, different speakers
- **WHEN** one song takes its voice from industrial and the next from country, in English
- **THEN** their comments are spoken by two different speakers

#### Scenario: Italian session
- **WHEN** the same two songs play with the app in Italian
- **THEN** both are spoken by Alice, each with its own drawn sound settings
