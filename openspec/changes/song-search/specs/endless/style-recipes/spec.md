# Spec Delta

## ADDED Requirements

### Requirement: Recipe genre
Every recipe SHALL declare one `genre` from the fixed genre list of the song library. The validator SHALL reject a genre outside the list. A user style without a genre SHALL be loaded with genre `experimental` and a warning. Every built-in recipe SHALL declare its genre.

#### Scenario: Built-in genre
- **WHEN** the recipe `lo-fi` is loaded
- **THEN** its genre is hip hop

#### Scenario: Unknown genre
- **WHEN** a recipe sets genre `polka`
- **THEN** validation fails with an error at `genre` that names the allowed genres

### Requirement: Generated songs carry tags
Songs made by the director SHALL carry the ids of the styles they were made from as style tags and SHALL be marked as generated.

#### Scenario: Tags of a generated song
- **WHEN** the director makes a song from berlin-techno and jazz
- **THEN** the song's style tags are `berlin-techno` and `jazz` and the song is marked as generated
