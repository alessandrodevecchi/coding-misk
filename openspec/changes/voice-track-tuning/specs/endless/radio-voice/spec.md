# Spec Delta

## ADDED Requirements

### Requirement: Voice-track lines vary across the session
In a radio session a song's voice track SHALL NOT use a line used by the voice track of any of the 5 songs before it: the style's own lines, the vocabulary entries and the owner's own phrases. When every candidate was used in those 5 songs, the line used longest ago SHALL be drawn (never used counts as the oldest). The same seed and options SHALL give the same lines. Steering commands that rewrite the voice track SHALL follow the same rule.

#### Scenario: One style for a long session
- **WHEN** a session of 20 songs in one style with a voice track is generated
- **THEN** no line of the style and no vocabulary entry is said by two voice tracks fewer than 6 songs apart, as long as unused candidates are left

#### Scenario: Pool runs out
- **WHEN** every candidate line was said in the 5 songs before
- **THEN** the song says the line said longest ago

#### Scenario: Replay
- **WHEN** a session is replayed with the same seed and options
- **THEN** every song says the same voice-track lines as before

### Requirement: Style lines weighted
A style's own line for the way SHALL be drawn with a chance of one half when one is free; otherwise the line SHALL come from the vocabulary. This holds in the radio and in Compose.

#### Scenario: Style lines not always first
- **WHEN** 120 songs of a style with its own lines are generated in one session
- **THEN** no single style line is said in more than one song out of five

### Requirement: My phrases counted within the session
When a radio song's voice track draws among the owner's phrases, the use counts SHALL be those recorded when the session started plus the times each phrase was written into the songs before it in the same session, so the least used phrase changes from song to song. The phrases written into the 5 songs before SHALL be left out while others are free. The narrator's phrases of mine a song carries SHALL get the same counts.

#### Scenario: Two songs in a row
- **WHEN** the collection has 6 phrases for the vocabulary group, all never used, and two songs in a row replace a vocabulary line with a phrase of mine
- **THEN** the second song does not say the phrase the first one said

#### Scenario: Replay after the collection changed
- **WHEN** a session is replayed after the owner's use counts changed in the collection
- **THEN** the songs say the same phrases as before (the session's recorded snapshot and its own counts)
