# Spec Delta

## MODIFIED Requirements

### Requirement: Variety between songs
Consecutive songs SHALL NOT share the same key or the same energy shape, and a song SHALL NOT repeat the combination of styles per part of any of the three songs before it, unless the options leave no other choice. With compatible harmony the next key SHALL be a fifth up or down from the current one when the styles allow it.

#### Scenario: Different keys
- **WHEN** a session of several songs is generated with several keys allowed
- **THEN** no two consecutive songs have the same key

#### Scenario: Compatible keys
- **WHEN** a session is generated with compatible harmony and styles that allow every key
- **THEN** each song's key is a fifth up or down from the song before it
