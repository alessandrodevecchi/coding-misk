## ADDED Requirements

### Requirement: Devotion lines
The description mood lines SHALL include the approved long "devotion" lines, and the glitch messages SHALL include "devotion detected…" and "entering the ritual…".

#### Scenario: Mood pool
- **WHEN** descriptions are drawn for many seeds
- **THEN** some of them use a devotion line

### Requirement: Song inspiration
A song SHALL be able to carry an `inspiration` note in English and Italian. When a song or fragment of it has one, its description SHALL mention it in a sentence of its own wording, drawn from templates, not the note pasted as is. Songs without it SHALL get descriptions as before.

#### Scenario: Inspired song
- **WHEN** the texts of a fragment of a song inspired by a film club scene are made
- **THEN** the description has a sentence that names that inspiration

### Requirement: Upload fields
The texts SHALL include tags (genres, styles and fixed project words), up to five hashtags and a category ("Music"). The texts panel SHALL show them with copy buttons and the saved text file SHALL include them. No artist names SHALL appear.

#### Scenario: Panel fields
- **WHEN** the texts panel shows the texts of a fragment
- **THEN** it has title, description, tags, hashtags and category, each with a copy button
