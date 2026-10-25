## ADDED Requirements

### Requirement: Voices group
Compose and the radio Custom profile SHALL group Narrator voice, Narrator style and Narrated growth (the former Fully narrated) under "Voices". Narrator style SHALL offer automatic (the song's or its style's), explaining and poetic. Narrated growth SHALL say that it makes the steps denser, each one spoken, and SHALL be disabled while the narrator is off.

#### Scenario: Poetic on any song
- **WHEN** the owner picks Narrator style poetic on luci-rosse with the Live build on
- **THEN** the narrator speaks short images before tracks come in instead of explaining the steps

### Requirement: Voice instrument controls
Generated songs and the radio SHALL offer separate controls for the voice instrument: phrases per song (1, 2 to 3, 4 to 5, 6 to 8, many up to 12), different, repeated or mixed phrases, and the ways it may use. The radio SHALL also offer how often a song gets one (never, as the style says, often); a single generated song SHALL offer on or off.

#### Scenario: Several phrases
- **WHEN** the radio plays with 4 to 5 different phrases per song
- **THEN** a song with a voice instrument speaks 4 or 5 different lines, each in a quiet part, never two in the same part

#### Scenario: Repeated
- **WHEN** phrases are set to repeated
- **THEN** the same line comes back as a refrain

### Requirement: Presets
Presets SHALL set the voice instrument controls together: As the style (default), Discreet, Present and Obsessive. Changing a control SHALL make the choice Custom.

#### Scenario: Default unchanged
- **WHEN** nothing is changed
- **THEN** generated songs are the same as before this change
