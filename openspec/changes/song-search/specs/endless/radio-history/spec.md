# Spec Delta

## MODIFIED Requirements

### Requirement: Save a song
"Save" SHALL store the song on air, from its first bar and with all its steps, as a normal song of the user's library; it SHALL open and play in Compose like any other song. Every song in the history SHALL also be savable. A saved song SHALL keep its style tags and its generated label.

#### Scenario: Save the song on air
- **WHEN** the user presses save while a song is on air
- **THEN** the song appears in the user's library with its title and plays from the start as a live build

#### Scenario: Saved song keeps its tags
- **WHEN** the user saves a synthwave song from the radio
- **THEN** the Songs tab shows it with the generated label and the synthwave style tag
